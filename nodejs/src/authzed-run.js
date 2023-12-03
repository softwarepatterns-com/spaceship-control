import { v1 } from "@authzed/authzed-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toDot } from "./lib/dot.mjs";
import { displayDotFile } from "./lib/iterm2.mjs";
import {
  createObject,
  createSubject,
  createRelationship,
  createRelationshipStr,
  createCheckPermissionRequest,
  createPermissionRequestStr,
  simplifyPermissionRelationshipTree,
} from "./lib/authzed.mjs";

const getFileContents = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedFilePath = path.resolve(__dirname, filePath);
  return fs.readFileSync(resolvedFilePath);
};

const token = "my_laptop_dev";
const endpoint = "localhost:50051";
const cert = getFileContents("../../data/certs/ca.crt");
const client1 = v1.NewClientWithCustomCert(token, endpoint, cert);

const readResourceRelationships = async (resourceType) => {
  return (
    await client1.promises.readRelationships(
      v1.ReadRelationshipsRequest.create({
        relationshipFilter: { resourceType },
      })
    )
  )
    .map((relationshipResponse) => relationshipResponse.relationship)
    .map(createRelationshipStr);
};

const checkPermission = async (relationship) => {
  const checkPermissionResponse = await client1.promises.checkPermission(
    createCheckPermissionRequest(relationship)
  );
  return v1.CheckPermissionResponse_Permissionship[
    checkPermissionResponse.permissionship
  ];
};

const bulkCheckPermission = async (items) => {
  const bulkCheckPermissionResponse =
    await client1.promises.bulkCheckPermission(
      v1.BulkCheckPermissionRequest.create({
        items: items.map(createCheckPermissionRequest),
      })
    );

  return bulkCheckPermissionResponse.pairs.reduce((obj, pair) => {
    const { request, response } = pair;

    let responseStr;
    if (response.oneofKind === "item") {
      responseStr =
        v1.CheckPermissionResponse_Permissionship[response.item.permissionship];
    } else if (response.oneofKind === "error") {
      responseStr = v1.CheckPermissionResponse_ErrorCode[response.error.code];
    } else {
      responseStr = "unknown";
    }

    obj[createPermissionRequestStr(request)] = responseStr;
    return obj;
  }, {});
};

const bulkExportRelationships = async () => {
  const bulkExportRelationships = await client1
    .bulkExportRelationships({
      optionalLimit: 100,
    })
    .toArray();

  return bulkExportRelationships.reduce((list, result) => {
    list = list.concat(result.relationships.map(createRelationshipStr));
    return list;
  }, []);
};

const lookupSubjects = async (subjectObjectType, permission, resource) => {
  const lookupSubjectsResponse = await client1.promises.lookupSubjects(
    v1.LookupSubjectsRequest.create({
      subjectObjectType,
      permission,
      resource: createObject(resource),
    })
  );

  return lookupSubjectsResponse.reduce((list, lookupSubjectsResponseItem) => {
    const { subjectObjectId, permissionship } =
      lookupSubjectsResponseItem.subject;
    list[subjectObjectId] = v1.LookupPermissionship[permissionship];
    return list;
  }, {});
};

const lookupResources = async (resourceObjectType, permission, subject) => {
  const lookupResourcesResponse = await client1.promises.lookupResources(
    v1.LookupResourcesRequest.create({
      resourceObjectType,
      permission,
      subject: createSubject(subject),
    })
  );

  return lookupResourcesResponse.reduce((list, lookupResourcesResponseItem) => {
    const { resourceObjectId, permissionship } = lookupResourcesResponseItem;
    list[resourceObjectId] = v1.LookupPermissionship[permissionship];
    return list;
  }, {});
};

// Start

await client1.promises.writeSchema(
  v1.WriteSchemaRequest.create({
    schema: getFileContents("../../star-trek.zed"),
  })
);

const readSchemaResponse = await client1.promises.readSchema({});
console.log(`\n${readSchemaResponse?.schemaText}\n`);

const relationshipUpdates = [
  "starship_role:captain#user@user:picard",
  "starship_role:starfleet#user@user:picard",
  "starship_role:captain#user@user:kirk",
  "starship_role:starfleet#user@user:kirk",
  "starship_role:starfleet#user@user:wesley",
  "starship:enterprise#crew_member@user:picard",
  "starship:enterprise#crew_member@user:wesley",
  "starship_system:enterprise_bridge#starship@starship:enterprise",
  "starship_system:enterprise_bridge#role@starship_role:captain#user",
  "starship_system:sickbay#starship@starship:enterprise",
  "starship_system:sickbay#role@starship_role:starfleet#user",
]
  .map(createRelationship)
  .map((relationship) =>
    v1.RelationshipUpdate.create({
      operation: v1.RelationshipUpdate_Operation.TOUCH, // UPSERT
      relationship,
    })
  );

await client1.promises.writeRelationships(
  v1.WriteRelationshipsRequest.create({
    updates: relationshipUpdates,
  })
);

console.log(
  "starship relationships:",
  await readResourceRelationships("starship")
);

console.log(
  "starship_role relationships:",
  await readResourceRelationships("starship_role")
);

console.log(
  "starship_system relationships:",
  await readResourceRelationships("starship_system")
);

console.log("user relationships:", await readResourceRelationships("user"));
console.log("");

// All true

console.log(
  "Is Picard a captain?",
  await checkPermission("starship_role:captain#user@user:picard")
);

console.log(
  "Can Picard operate the Enterprise Bridge?",
  await checkPermission("starship_system:enterprise_bridge#operate@user:picard")
);

console.log(
  "Can Picard operate the Enterprise Sickbay?",
  await checkPermission("starship_system:sickbay#operate@user:picard")
);

console.log(
  "Is Wesley a member of the crew?",
  await checkPermission("starship:enterprise#crew_member@user:wesley")
);

console.log(
  "Can Wesley operate the Enterprise Sickbay?",
  await checkPermission("starship_system:sickbay#operate@user:wesley")
);

console.log(
  "Can Wesley operate the Enterprise Sickbay?",
  await checkPermission("starship_system:sickbay#operate@user:wesley")
);

// All false

console.log(
  "Can Kirk operate the Enterprise Bridge?",
  await checkPermission("starship_system:enterprise_bridge#operate@user:kirk")
);

console.log(
  "Can Kirk operate the Enterprise Sickbay?",
  await checkPermission("starship_system:sickbay#operate@user:kirk")
);

console.log(
  "Can Wesley operate the Enterprise Bridge?",
  await checkPermission("starship_system:enterprise_bridge#operate@user:wesley")
);

// Bulk check

console.log(
  "Check all these permissions:",
  await bulkCheckPermission([
    "starship_role:captain#user@user:picard",
    "starship_system:enterprise_bridge#operate@user:picard",
    "starship_system:sickbay#operate@user:picard",
    "starship:enterprise#crew_member@user:wesley",
    "starship_system:sickbay#operate@user:wesley",
    "starship_system:sickbay#operate@user:wesley",
    "starship_system:enterprise_bridge#operate@user:kirk",
    "starship_system:sickbay#operate@user:kirk",
    "starship_system:enterprise_bridge#operate@user:wesley",
  ])
);

console.log("Export all relationships:", await bulkExportRelationships());

console.log(
  "Which users can operate the Enterprise Bridge?",
  await lookupSubjects("user", "operate", "starship_system:enterprise_bridge")
);

console.log(
  "Which users can operate the Sickbay?",
  await lookupSubjects("user", "operate", "starship_system:sickbay")
);

console.log(
  "Which starship systems can Picard operate?",
  await lookupResources("starship_system", "operate", "user:picard")
);

console.log(
  "Which starship systems can Wesley operate?",
  await lookupResources("starship_system", "operate", "user:wesley")
);

console.log(
  "Which starship systems can Kirk operate?",
  await lookupResources("starship_system", "operate", "user:kirk")
);

const expandPermissionTree = async (resource, permission) => {
  const expandPermissionTreeResponse =
    await client1.promises.expandPermissionTree(
      v1.ExpandPermissionTreeRequest.create({
        resource: createObject(resource),
        permission,
      })
    );

  return simplifyPermissionRelationshipTree(
    expandPermissionTreeResponse?.treeRoot
  );
};

console.log(
  "Permission tree of starship_system:enterprise_bridge#operate",
  JSON.stringify(
    await expandPermissionTree("starship_system:enterprise_bridge", "operate"),
    undefined,
    " "
  )
);

console.log(
  "Permission tree of starship_system:sickbay#operate",
  JSON.stringify(
    await expandPermissionTree("starship_system:sickbay", "operate"),
    undefined,
    " "
  )
);

console.log(
  toDot(
    [
      await expandPermissionTree(
        "starship_system:enterprise_bridge",
        "operate"
      ),
      await expandPermissionTree("starship_system:sickbay", "operate"),
    ],
    { pretty: true, indent: 1 }
  ),
  "\n"
);

displayDotFile(
  toDot(
    [
      await expandPermissionTree(
        "starship_system:enterprise_bridge",
        "operate"
      ),
    ],
    { pretty: false }
  )
);

displayDotFile(
  toDot(
    [
      await expandPermissionTree(
        "starship_system:enterprise_bridge",
        "operate"
      ),
      await expandPermissionTree("starship_system:sickbay", "operate"),
    ],
    { pretty: false }
  )
);
