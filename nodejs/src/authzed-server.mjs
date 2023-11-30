import { v1 } from "@authzed/authzed-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const token = "my_laptop_dev";
const endpoint = "localhost:50051";

const getFileContents = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedFilePath = path.resolve(__dirname, filePath);
  return fs.readFileSync(resolvedFilePath);
};

const client1 = v1.NewClientWithCustomCert(
  token,
  endpoint,
  getFileContents("../../data/certs/ca.crt")
);

/**
 *
 * @param {String} str
 * @returns {v1.ObjectReference}
 */
const createObject = (str) => {
  // starship_system:enterprise_bridge
  const [objectType, objectId] = str.split(":");
  return v1.ObjectReference.create({ objectType, objectId });
};

/**
 *
 * @param {String} str
 * @returns {v1.SubjectReference}
 */
const createSubject = (str) => {
  const [objectType, objectId] = str.split("#");
  return v1.SubjectReference.create({
    object: createObject(objectType),
    optionalRelation: objectId,
  });
};

/**
 *
 * @param {String} str
 * @returns {v1.Relationship}
 */
const createRelationship = (str) => {
  // fleet:andorian_fleet#admiral@user:shran
  const regex = /(.+)#(.+)@(.+)/;
  const matches = str.match(regex);
  const [_, objectReferenceStr, relation, subjectReferenceStr] = matches;
  if (matches.length !== 4) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  const resource = createObject(objectReferenceStr);

  const subject = createSubject(subjectReferenceStr);

  return v1.Relationship.create({
    resource,
    relation,
    subject,
  });
};

/**
 *
 * @param {String} str - i.e., starship_system:enterprise_bridge#operate@user:picard
 * @returns {v1.CheckPermissionRequest}
 */
const createCheckPermissionRequest = (str) => {
  // starship_system:enterprise_bridge#operate@user:picard
  const regex = /(.+)#(.+)@(.+)/;
  const matches = str.match(regex);
  const [_, objectReferenceStr, permission, subjectReferenceStr] = matches;
  if (matches.length !== 4) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  const resource = createObject(objectReferenceStr);

  const subject = createSubject(subjectReferenceStr);

  return v1.CheckPermissionRequest.create({
    resource,
    permission,
    subject,
  });
};

const readResourceRelationships = async (resourceType) => {
  const readRelationshipsResponse = await client1.promises.readRelationships(
    v1.ReadRelationshipsRequest.create({
      relationshipFilter: { resourceType },
    })
  );
  return readRelationshipsResponse
    .map((relationshipResponse) => relationshipResponse.relationship)
    .map((relationship) => {
      const { resource, relation, subject } = relationship;
      const resourceStr = `${resource.objectType}:${resource.objectId}`;
      let subjectStr = `${subject.object.objectType}:${subject.object.objectId}`;
      if (subject.optionalRelation) {
        subjectStr += `#${subject.optionalRelation}`;
      }

      return `${resourceStr}#${relation}@${subjectStr}`;
    });
};

const checkPermission = async (questionDescription, relationship) => {
  const checkPermissionResponse = await client1.promises.checkPermission(
    createCheckPermissionRequest(relationship)
  );
  console.log(
    questionDescription,
    v1.CheckPermissionResponse_Permissionship[
      checkPermissionResponse.permissionship
    ]
  );
};

const bulkCheckPermission = async (items) => {
  const bulkCheckPermissionResponse =
    await client1.promises.bulkCheckPermission(
      v1.BulkCheckPermissionRequest.create({
        items: items.map(createCheckPermissionRequest),
      })
    );

  console.log(
    "bulkCheckPermission:",
    bulkCheckPermissionResponse.pairs.reduce((obj, pair) => {
      const { request, response } = pair;
      const { resource, subject, permission } = request;
      const resourceStr = `${resource.objectType}:${resource.objectId}`;
      let subjectStr = `${subject.object.objectType}:${subject.object.objectId}`;
      if (subject.optionalRelation) {
        subjectStr += `#${subject.optionalRelation}`;
      }

      let responseStr;
      if (response.oneofKind === "item") {
        responseStr =
          v1.CheckPermissionResponse_Permissionship[
            response.item.permissionship
          ];
      } else if (response.oneofKind === "error") {
        responseStr = v1.CheckPermissionResponse_ErrorCode[response.error.code];
      } else {
        responseStr = "unknown";
      }

      obj[`${resourceStr}#${permission}@${subjectStr}`] = responseStr;
      return obj;
    }, {})
  );
};

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

await checkPermission(
  "Is Picard a captain?",
  "starship_role:captain#user@user:picard"
);

await checkPermission(
  "Can Picard operate the Enterprise Bridge?",
  "starship_system:enterprise_bridge#operate@user:picard"
);

await checkPermission(
  "Can Picard operate the Enterprise Sickbay?",
  "starship_system:sickbay#operate@user:picard"
);

await checkPermission(
  "Is Wesley a member of the crew?",
  "starship:enterprise#crew_member@user:wesley"
);

await checkPermission(
  "Can Wesley operate the Enterprise Sickbay?",
  "starship_system:sickbay#operate@user:wesley"
);

await checkPermission(
  "Can Wesley operate the Enterprise Sickbay?",
  "starship_system:sickbay#operate@user:wesley"
);

// All false

await checkPermission(
  "Can Kirk operate the Enterprise Bridge?",
  "starship_system:enterprise_bridge#operate@user:kirk"
);

await checkPermission(
  "Can Kirk operate the Enterprise Sickbay?",
  "starship_system:sickbay#operate@user:kirk"
);

await checkPermission(
  "Can Wesley operate the Enterprise Bridge?",
  "starship_system:enterprise_bridge#operate@user:wesley"
);

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
]);
