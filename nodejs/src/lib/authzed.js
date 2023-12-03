import { v1 } from "@authzed/authzed-node";

/**
 * @param {String} str - i.e., starship_system:enterprise_bridge
 * @returns {v1.ObjectReference} - i.e., { objectType: "starship_system", objectId: "enterprise_bridge" }
 */
export const createObject = (str) => {
  const [objectType, objectId] = str.split(":");
  return v1.ObjectReference.create({ objectType, objectId });
};

/**
 * @param {v1.ObjectReference} object - i.e., { objectType: "starship_system", objectId: "enterprise_bridge" }
 * @returns {String} - i.e., "starship_system:enterprise_bridge"
 */
export const createObjectStr = (object) => {
  const { objectType, objectId } = object;
  return `${objectType}:${objectId}`;
};

/**
 * @param {String} str - i.e., user:picard
 * @returns {v1.SubjectReference} - i.e., { object: { objectType: "user", objectId: "picard" }, optionalRelation: "" }
 */
export const createSubject = (str) => {
  const [objectType, objectId] = str.split("#");
  return v1.SubjectReference.create({
    object: createObject(objectType),
    optionalRelation: objectId,
  });
};

/**
 *
 * @param {v1.SubjectReference} subject - i.e., { object: { objectType: "user", objectId: "picard" }, optionalRelation: "" }
 * @returns {String} - i.e., "user:picard"
 */
export const createSubjectStr = (subject) => {
  const { object, optionalRelation } = subject;
  const objectStr = createObjectStr(object);
  if (optionalRelation) {
    return `${objectStr}#${optionalRelation}`;
  }

  return objectStr;
};

/**
 * @param {v1.ZedClient} client
 * @param {v1.PermissionRelationshipTree} permissionRelationshipTree
 * @returns {Object} - i.e., { relation: "operate", object: "starship_system:enterprise_bridge", children: [ ... ] }
 */
export const simplifyPermissionRelationshipTree = async (client, permissionRelationshipTree) => {
  if (!permissionRelationshipTree) {
    return null;
  }

  const obj = {
    relation: permissionRelationshipTree.expandedRelation,
    object: createObjectStr(permissionRelationshipTree.expandedObject),
  };

  const subjects = [];
  const children = [];

  const treeType = permissionRelationshipTree.treeType;
  if (treeType.oneofKind === "leaf") {
    const leaf = treeType.leaf;

    for (const subject of leaf.subjects) {
      if (subject.optionalRelation) {
        children.push(
          await getResourcePermissionTree(client, createObjectStr(subject.object), subject.optionalRelation)
        );
      } else {
        subjects.push(createSubjectStr(subject));
      }
    }
  } else if (treeType.oneofKind === "intermediate") {
    const intermediate = treeType.intermediate;
    const operation = v1.AlgebraicSubjectSet_Operation[intermediate.operation];

    for (const child of intermediate.children) {
      children.push(await simplifyPermissionRelationshipTree(client, child));
    }

    // Skip UNIONs with only 1 child.
    if (operation === "UNION" && children.length === 1) {
      return children[0];
    }

    obj.operation = operation;
  }

  if (subjects.length) {
    obj.subjects = subjects;
  }
  if (children.length) {
    obj.children = children;
  }

  return obj;
};

/**
 * @param {v1.ZedClientInterface} client
 * @param {String} str - i.e., starship_system:enterprise_bridge#operate@user:picard
 * @returns {v1.CheckPermissionResponse_Permissionship} - i.e., "HAS_PERMISSION"
 * @throws {Error}
 */
export const checkPermission = async (client, query) => {
  const regex = /(.+)#(.+)@(.+)/;
  const matches = query.match(regex);

  if (!matches) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  const [_, objectReferenceStr, permission, subjectReferenceStr] = matches;
  if (matches.length !== 4) {
    throw new Error(`Invalid relationship string ${str}`);
  }

  const checkPermissionResponse = await client.promises.checkPermission(
    v1.CheckPermissionRequest.create({
      resource: createObject(objectReferenceStr),
      permission,
      subject: createSubject(subjectReferenceStr),
    })
  );
  return v1.CheckPermissionResponse_Permissionship[checkPermissionResponse.permissionship];
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

/**
 *
 * @param {v1.Relationship} relationship
 * @returns {String} - i.e., "starship_system:enterprise_bridge#operate@user:picard"
 */
export const createRelationshipStr = (relationship) => {
  const { resource, relation, subject } = relationship;
  const resourceStr = createObjectStr(resource);
  let subjectStr = createObjectStr(subject.object);
  if (subject.optionalRelation) {
    subjectStr += `#${subject.optionalRelation}`;
  }

  return `${resourceStr}#${relation}@${subjectStr}`;
};

/**
 * @param {v1.CheckPermissionRequest} permissionCheckRequest
 * @returns {String} - i.e., "starship_system:enterprise_bridge#operate@user:picard"
 */
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
 * @param {v1.ZedClientInterface} client
 * @param {Number} limit - i.e., 1000
 * @returns {String[]} - i.e., ["starship_system:enterprise_bridge#operate@user:picard"]
 */
export const getRelationships = async (client, limit) => {
  const bulkExportRelationships = await client
    .bulkExportRelationships({
      optionalLimit: limit,
    })
    .toArray();

  return bulkExportRelationships.reduce((list, result) => {
    list = list.concat(result.relationships.map(createRelationshipStr));
    return list;
  }, []);
};

/**
 * @param {v1.ZedClient} client
 * @param {String} resourceType - i.e., user, group
 * @returns {String[]} - i.e., ["starship_system:enterprise_bridge#operate@user:picard"]
 */
export const getResourceTypeRelationships = async (client, resourceType) => {
  return (
    await client.promises.readRelationships(
      v1.ReadRelationshipsRequest.create({
        relationshipFilter: { resourceType },
      })
    )
  )
    .map((relationshipResponse) => relationshipResponse.relationship)
    .map(createRelationshipStr);
};

/**
 * @param {v1.ZedClient} client
 * @param {String} resource - i.e., starship_system:enterprise_bridge
 * @param {String} permission - i.e., operate
 * @param {String} subjectObjectType - i.e., user
 * @returns {Object} - i.e., { picard: "HAS_PERMISSION" }
 */
export const getResourcePermissionSubjectTypeList = async (client, resource, permission, subjectObjectType) => {
  const lookupSubjectsResponse = await client.promises.lookupSubjects(
    v1.LookupSubjectsRequest.create({
      subjectObjectType,
      permission,
      resource: createObject(resource),
    })
  );

  return lookupSubjectsResponse.reduce((list, lookupSubjectsResponseItem) => {
    const { subjectObjectId, permissionship } = lookupSubjectsResponseItem.subject;
    list[subjectObjectId] = v1.LookupPermissionship[permissionship];
    return list;
  }, {});
};

/**
 * @param {v1.ZedClient} client
 * @param {String} subject - i.e., user:picard
 * @param {String} permission - i.e., operate
 * @param {String} resourceObjectType - i.e., starship_system
 * @returns {Object} - i.e., { enterprise_bridge: "HAS_PERMISSION" }
 */
export const getSubjectPermissionResourceTypeList = async (client, subject, permission, resourceObjectType) => {
  const lookupResourcesResponse = await client.promises.lookupResources(
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

/**
 * @param {v1.ZedClient} client
 * @param {String} resourceStr - i.e., starship_system:enterprise_bridge
 * @param {String} permission - i.e., operate
 * @returns {Object} - i.e., { relation: "operate", object: "starship_system:enterprise_bridge", children: [ ... ] }
 */
export const getResourcePermissionTree = async (client, resourceStr, permission) => {
  const expandPermissionTreeResponse = await client.promises.expandPermissionTree(
    v1.ExpandPermissionTreeRequest.create({
      resource: createObject(resourceStr),
      permission,
    })
  );

  return simplifyPermissionRelationshipTree(client, expandPermissionTreeResponse?.treeRoot);
};

/**
 * A wrapper around the Authzed API client that binds the client to a
 * set of convenience methods.
 */
export class ZedClient {
  /**
   * @param {String} token - i.e., "t_your_token"
   * @param {String} endpoint - i.e., "grpc.authzed.com:443"
   * @param {Buffer} cert - i.e., fs.readFileSync("authzed.crt")
   * @returns {ZedClient}
   */
  constructor(token, endpoint, cert) {
    this.client = v1.NewClientWithCustomCert(token, endpoint, cert);
    this.checkPermission = checkPermission.bind(this, this.client);
    this.getRelationships = getRelationships.bind(this, this.client);
    this.getResourceTypeRelationships = getResourceTypeRelationships.bind(this, this.client);
    this.getResourcePermissionSubjectTypeList = getResourcePermissionSubjectTypeList.bind(this, this.client);
    this.getSubjectPermissionResourceTypeList = getSubjectPermissionResourceTypeList.bind(this, this.client);
    this.getResourcePermissionTree = getResourcePermissionTree.bind(this, this.client);
  }
}
