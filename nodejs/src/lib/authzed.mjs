import { v1 } from "@authzed/authzed-node";

/**
 * @param {String} str
 * @returns {v1.ObjectReference}
 */
export const createObject = (str) => {
  // starship_system:enterprise_bridge
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
  const [objectType, objectId] = str.split("#");
  return v1.SubjectReference.create({
    object: createObject(objectType),
    optionalRelation: objectId,
  });
};

/**
 * @param {String} str
 * @returns {v1.Relationship}
 */
export const createRelationship = (str) => {
  // fleet:andorian_fleet#admiral@user:shran
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
  // starship_system:enterprise_bridge#operate@user:picard
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

/**
 * @param {PermissionRelationshipTree} permissionTree
 */
export const simplifyPermissionRelationshipTree = (
  permissionRelationshipTree
) => {
  if (!permissionRelationshipTree) {
    return null;
  }

  const obj = {
    relation: permissionRelationshipTree.expandedRelation,
    object: createObjectStr(permissionRelationshipTree.expandedObject),
  };

  const treeType = permissionRelationshipTree.treeType;
  if (treeType.oneofKind === "leaf") {
    const leaf = treeType.leaf;
    obj.subjects = leaf.subjects.map((subject) =>
      createObjectStr(subject.object)
    );
  } else if (treeType.oneofKind === "intermediate") {
    const intermediate = treeType.intermediate;
    const operation = v1.AlgebraicSubjectSet_Operation[intermediate.operation];
    const children = intermediate.children.map(
      simplifyPermissionRelationshipTree
    );

    // Skip UNIONs with only 1 child.
    if (operation === "UNION" && children.length === 1) {
      return children[0];
    }

    obj.operation = operation;
    obj.children = children;
  } else {
    console.log("unknown treeType", permissionRelationshipTree);
  }

  return obj;
};
