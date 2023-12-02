import { v1 } from "@authzed/authzed-node";

/**
 * @param {String} str - i.e., starship_system:enterprise_bridge
 * @returns {v1.ObjectReference}
 */
export const createObject = (str) => {
  console.log("createObject", str);
  const [objectType, objectId] = str.split(":");
  return v1.ObjectReference.create({ objectType, objectId });
};

export const createObjectStr = (object) => {
  const { objectType, objectId } = object;
  return `${objectType}:${objectId}`;
};

/**
 * @param {String} str
 * @returns {v1.SubjectReference}
 */
export const createSubject = (str) => {
  console.log("createSubject", str);
  const [objectType, objectId] = str.split("#");
  return v1.SubjectReference.create({
    object: createObject(objectType),
    optionalRelation: objectId,
  });
};

export const createSubjectStr = (subject) => {
  const { object, optionalRelation } = subject;
  const objectStr = createObjectStr(object);
  if (optionalRelation) {
    return `${objectStr}#${optionalRelation}`;
  }

  return objectStr;
};

/**
 * @param {String} str - i.e., fleet:andorian_fleet#admiral@user:shran
 * @returns {v1.Relationship}
 */
export const createRelationship = (str) => {
  const regex = /(.+)#(.+)@(.+)/;
  const matches = str.match(regex);
  const [_, objectReferenceStr, relation, subjectReferenceStr] = matches;
  if (matches.length !== 4) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  return v1.Relationship.create({
    resource: createObject(objectReferenceStr),
    relation,
    subject: createSubject(subjectReferenceStr),
  });
};

export const createRelationshipStr = (relationship) => {
  const { resource, relation, subject } = relationship;
  const resourceStr = createObjectStr(resource);
  let subjectStr = createObjectStr(subject.object);
  if (subject.optionalRelation) {
    subjectStr += `#${subject.optionalRelation}`;
  }

  return `${resourceStr}#${relation}@${subjectStr}`;
};

export const createPermissionRequestStr = (permissionCheckRequest) => {
  const { resource, permission, subject } = permissionCheckRequest;
  const resourceStr = createObjectStr(resource);
  let subjectStr = createObjectStr(subject.object);
  if (subject.optionalRelation) {
    subjectStr += `#${subject.optionalRelation}`;
  }

  return `${resourceStr}#${permission}@${subjectStr}`;
};

/**
 *
 * @param {String} str - i.e., starship_system:enterprise_bridge#operate@user:picard
 * @returns {v1.CheckPermissionRequest}
 */
export const createCheckPermissionRequest = (str) => {
  const regex = /(.+)#(.+)@(.+)/;
  const matches = str.match(regex);

  if (!matches) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  const [_, objectReferenceStr, permission, subjectReferenceStr] = matches;
  if (matches.length !== 4) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  return v1.CheckPermissionRequest.create({
    resource: createObject(objectReferenceStr),
    permission,
    subject: createSubject(subjectReferenceStr),
  });
};
