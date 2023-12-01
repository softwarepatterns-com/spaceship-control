import { v1 } from "@authzed/authzed-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toDot } from "./lib/dot.mjs";
import {
  createObject,
  createSubject,
  createRelationship,
  createRelationshipStr,
  createCheckPermissionRequest,
  createPermissionRequestStr,
  simplifyPermissionRelationshipTree,
} from "./lib/authzed.mjs";
import fastify from "fastify";

const getFileContents = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedFilePath = path.resolve(__dirname, filePath);
  return fs.readFileSync(resolvedFilePath);
};

const token = "my_laptop_dev";
const endpoint = "localhost:50051";
const cert = getFileContents("../../data/certs/ca.crt");
const testHtml = getFileContents("./test.html");
const client1 = v1.NewClientWithCustomCert(token, endpoint, cert);
const app = fastify({ logger: true });

app.get("/", async (request, reply) => {
  reply.type("text/html").send(testHtml);
});

app.get("/relationships", async (request, reply) => {
  const bulkExportRelationships = await client1
    .bulkExportRelationships({
      optionalLimit: 100,
    })
    .toArray();

  return bulkExportRelationships.reduce((list, result) => {
    list = list.concat(result.relationships.map(createRelationshipStr));
    return list;
  }, []);
});

app.get("/check", async (request, reply) => {
  const { q } = request.query;

  const checkPermissionResponse = await client1.promises.checkPermission(
    createCheckPermissionRequest(q)
  );
  return v1.CheckPermissionResponse_Permissionship[
    checkPermissionResponse.permissionship
  ];
});

/**
 * @example
 * curl "http://localhost:3000/lookup-subjects?subjectObjectType=user&permission=operate&resource=starship_system:enterprise_bridge"
 */
app.get("/lookup-subjects", async (request, reply) => {
  const { subjectObjectType, permission, resource } = request.query;
  try {
    const subjects = await lookupSubjects(
      subjectObjectType,
      permission,
      resource
    );
    return subjects;
  } catch (err) {
    reply.status(500).send(err.message);
  }
});

/**
 * @example
 * curl "http://localhost:3000/lookup-resources?resourceObjectType=starship_system&permission=operate&subject=user:picard"
 */
app.get("/lookup-resources", async (request, reply) => {
  const { resourceObjectType, permission, subject } = request.query;
  try {
    const resources = await lookupResources(
      resourceObjectType,
      permission,
      subject
    );
    return resources;
  } catch (err) {
    reply.status(500).send(err.message);
  }
});

/**
 * @example
 * curl "http://localhost:3000/expand-permission-tree?resource=starship_system:enterprise_bridge&permission=operate"
 */
app.get("/expand-permission-tree", async (request, reply) => {
  const { resource, permission } = request.query;
  try {
    const permissionTree = await expandPermissionTree(resource, permission);
    return permissionTree;
  } catch (err) {
    reply.status(500).send(err.message);
  }
});

app.get("/health", async (request, reply) => {
  return "OK";
});

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    app.log.info(`server listening on ${app.server.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();

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

console.log("Export all relationships:", await bulkExportRelationships());

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
