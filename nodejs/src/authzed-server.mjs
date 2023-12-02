import { execSync } from "child_process";
import { v1 } from "@authzed/authzed-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toDot } from "./lib/dot.mjs";
import {
  createObject,
  createSubject,
  createObjectStr,
  createSubjectStr,
  createRelationshipStr,
  createCheckPermissionRequest,
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

app.get("/relationships/:resource", async (request, reply) => {
  const { resource } = request.params;
  return await readResourceRelationships(resource);
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

app.get("/expand-permission-tree-image", async (request, reply) => {
  try {
    const { resource, permission, format } = request.query;
    const permissionTree = await expandPermissionTree(resource, permission);
    const dotString = toDot([permissionTree], { pretty: true, indent: 1 });

    console.log("dotString", dotString);

    // Escape double quotes in dotString
    const escapedDotString = dotString.replace(/"/g, '\\"');

    // Determine the format (SVG or PNG) and set the appropriate Content-Type
    let contentType, dotFormat;
    if (format === "png") {
      contentType = "image/png";
      dotFormat = "png";
    } else {
      // Default to SVG if format is not specified or is not 'png'
      contentType = "image/svg+xml";
      dotFormat = "svg";
    }

    // Create a child process to get the output.
    const cmd = `echo "${escapedDotString}" | dot -T${dotFormat}`;
    const buffer = execSync(cmd);
    reply.header("Content-Type", contentType).send(buffer);
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

/**
 *
 * @param {String} resourceStr
 * @param {String} permission
 * @returns
 */
const expandPermissionTree = async (resourceStr, permission) => {
  console.log("expandPermissionTree", resourceStr, permission);

  const expandPermissionTreeResponse =
    await client1.promises.expandPermissionTree(
      v1.ExpandPermissionTreeRequest.create({
        resource: createObject(resourceStr),
        permission,
      })
    );

  console.log(
    "expandPermissionTreeResponse",
    JSON.stringify(expandPermissionTreeResponse, null, 2)
  );

  return simplifyPermissionRelationshipTree(
    expandPermissionTreeResponse?.treeRoot
  );
};

/**
 * @param {PermissionRelationshipTree} permissionTree
 */
export const simplifyPermissionRelationshipTree = async (
  permissionRelationshipTree
) => {
  console.log(
    "simplifyPermissionRelationshipTree",
    JSON.stringify(permissionRelationshipTree, null, 2)
  );

  if (!permissionRelationshipTree) {
    return null;
  }

  if (!permissionRelationshipTree.expandedObject) {
    console.error(
      "simplifyPermissionRelationshipTree: permissionRelationshipTree",
      permissionRelationshipTree
    );
    throw new Error("expandedObject is not set");
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
          await expandPermissionTree(
            createObjectStr(subject.object),
            subject.optionalRelation
          )
        );
      } else {
        subjects.push(createSubjectStr(subject));
      }
    }
  } else if (treeType.oneofKind === "intermediate") {
    const intermediate = treeType.intermediate;
    const operation = v1.AlgebraicSubjectSet_Operation[intermediate.operation];

    for (const child of intermediate.children) {
      children.push(await simplifyPermissionRelationshipTree(child));
    }

    // Skip UNIONs with only 1 child.
    if (operation === "UNION" && children.length === 1) {
      return children[0];
    }

    obj.operation = operation;
  } else {
    console.log("unknown treeType", permissionRelationshipTree);
  }

  if (subjects.length) {
    obj.subjects = subjects;
  }
  if (children.length) {
    obj.children = children;
  }

  return obj;
};

console.log(`\n${(await client1.promises.readSchema({}))?.schemaText}\n`);
