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
  // user:picard
  console.log("createSubject", str);
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

  console.log("heyo", objectReferenceStr, relation, subjectReferenceStr);

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

const starshipEnterpiseCaptainIsPicard = createRelationship(
  "starship:enterprise#captain@user:picard"
);
// Example: Check if Picard can operate the Enterprise Bridge
const enterpriseBridge = createObject("starship_system:enterprise_bridge");
const picard = createSubject("user:picard");

const checkPermissionRequest = createCheckPermissionRequest(
  "starship_system:enterprise_bridge#operate@user:picard"
);

client1.checkPermission(checkPermissionRequest, (err, response) => {
  console.log("Can Picard operate the Enterprise Bridge?", response);
  console.log(err);
});
