import { v1 } from "@authzed/authzed-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  return v1.Relationship.create({
    resource: createObject(objectReferenceStr),
    relation,
    subject: createSubject(subjectReferenceStr),
  });
};

const createObjectStr = (object) => {
  const { objectType, objectId } = object;
  return `${objectType}:${objectId}`;
};

const createRelationshipStr = (relationship) => {
  const { resource, relation, subject } = relationship;
  const resourceStr = createObjectStr(resource);
  let subjectStr = createObjectStr(subject.object);
  if (subject.optionalRelation) {
    subjectStr += `#${subject.optionalRelation}`;
  }

  return `${resourceStr}#${relation}@${subjectStr}`;
};

const createPermissionRequestStr = (permissionCheckRequest) => {
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
const createCheckPermissionRequest = (str) => {
  // starship_system:enterprise_bridge#operate@user:picard
  const regex = /(.+)#(.+)@(.+)/;
  const matches = str.match(regex);
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

const readResourceRelationships = async (resourceType) => {
  const readRelationshipsResponse = await client1.promises.readRelationships(
    v1.ReadRelationshipsRequest.create({
      relationshipFilter: { resourceType },
    })
  );
  return readRelationshipsResponse
    .map((relationshipResponse) => relationshipResponse.relationship)
    .map(createRelationshipStr);
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

      obj[createPermissionRequestStr(request)] = responseStr;
      return obj;
    }, {})
  );
};

const bulkExportRelationships = async () => {
  const bulkExportRelationships = await client1
    .bulkExportRelationships({
      optionalLimit: 100,
    })
    .toArray();
  console.log(
    "bulkExportRelationships:",
    bulkExportRelationships.reduce((list, result) => {
      list = list.concat(result.relationships.map(createRelationshipStr));
      return list;
    }, [])
  );
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
 * @param {PermissionRelationshipTree} permissionTree
 */
const simplifyPermissionTree = (permissionRelationshipTree) => {
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
    const children = intermediate.children.map(simplifyPermissionTree);

    // Skip UNION with 1 child.
    if (operation === "UNION" && children.length === 1) {
      console.log("UNION with 1 child", permissionRelationshipTree);
      return children[0];
    }

    obj.operation = operation;
    obj.children = children;
  } else {
    console.log("unknown treeType", permissionRelationshipTree);
  }

  return obj;
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

// Bulk check

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

await bulkExportRelationships();

console.log(
  "Who can operate the Enterprise Bridge?",
  await lookupSubjects("user", "operate", "starship_system:enterprise_bridge")
);

console.log(
  "Who can operate the Sickbay?",
  await lookupSubjects("user", "operate", "starship_system:sickbay")
);

console.log(
  "What starship systems can Picard operate?",
  await lookupResources("starship_system", "operate", "user:picard")
);

console.log(
  "What starship systems can Wesley operate?",
  await lookupResources("starship_system", "operate", "user:wesley")
);

console.log(
  "What starship systems can Kirk operate?",
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

  return simplifyPermissionTree(expandPermissionTreeResponse?.treeRoot);
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

/**
 *
 * `dot -Tpng -o output.png input.dot`
 * `imgcat output.png`
 *
 * @param {*} data
 * @returns
 */
function toDot(data) {
  const operationFillColor = "#d3d3e3";

  class Dot {
    constructor() {
      this.i = 1;
      this.lines = ["digraph G {"];
      this.level = 1;
    }

    addCluster(label, node) {
      const id = this.i++;
      this.push(`subgraph cluster_${id} {`);
      this.level++;
      this.push(`style="dashed";`);
      this.push(`label="${label}";`);
      this.addNode(node);
      this.level--;
      this.push(`}`);
      return id;
    }

    addLabelNode(label, options) {
      const id = this.i++;
      this.push(`${id} [label="${label}"${createNodeProperties(options)}];`);
      return id;
    }

    addHtmlNode(html, options) {
      const properties = createNodeProperties({
        shape: "plain",
        ...(options || {}),
      });
      const id = this.i++;
      this.push(`${id} [label=<${html}>${properties}];`);
      return id;
    }

    addEdge(from, to, label) {
      if (label) {
        this.push(`${from} -> ${to} [label="${label}"];`);
      } else {
        this.push(`${from} -> ${to};`);
      }
    }

    addNode(node, parentId) {
      if (node.children) {
        const objectRelationId = this.addHtmlNode(
          createOutlinedListHtml([node.relation, node.object]),
          { color: "black" }
        );

        const operationId = this.addLabelNode(node.operation.toLowerCase(), {
          shape: node.operation === "UNION" ? "trapezium" : "invtrapezium",
          fillcolor: operationFillColor,
          color: operationFillColor,
          style: "filled",
        });

        this.addEdge(objectRelationId, operationId);

        node.children.forEach((child) => this.addNode(child, operationId));

        if (parentId) {
          this.addEdge(parentId, objectRelationId);
        }
      }

      if (node.subjects) {
        const objectRelationId = this.addHtmlNode(
          createOutlinedListHtml([node.relation, node.object]),
          { color: "black" }
        );

        const subjectListId = this.addHtmlNode(
          createOutlinedListHtml(node.subjects, { align: "left" }),
          { color: "none" }
        );

        this.addEdge(objectRelationId, subjectListId);

        if (parentId) {
          this.addEdge(parentId, objectRelationId);
        }
      }
    }

    push(line) {
      this.lines.push(" ".repeat(this.level) + line);
    }
  }

  const createNodeProperties = (options) =>
    Object.entries(options)
      .map(([key, value]) => {
        return `, ${key}="${value}"`;
      }, [])
      .join("");

  const createRowsHtml = (rows, options) => {
    const { align = "center", ...tableAttributes } = options || {};
    let tableAttributesStr = Object.entries(
      Object.assign(
        {
          border: 0,
          cellspacing: 0,
          cellpadding: 1,
          cellborder: 1,
        },
        tableAttributes || {}
      )
    )
      .map(([key, value]) => ` ${key}="${value}"`)
      .join("");
    let html = `<table${tableAttributesStr}>`;
    rows.forEach((row) => {
      html += `<tr><td align="${align}">${row}</td></tr>`;
    });
    html += `</table>`;
    return html;
  };

  const createOutlinedListHtml = (list, tableAttributes) => {
    return createRowsHtml(
      [
        createRowsHtml(list, {
          align: "center",
          cellborder: 0,
          ...(tableAttributes || {}),
        }),
      ],
      {
        align: "center",
        cellborder: 1,
        cellpadding: 4,
      }
    );
  };

  const dot = new Dot();

  data.forEach((item, i) => dot.addCluster(i, item));
  dot.level--;
  dot.push(`}`);
  return dot.lines.join("\n");
}

console.log(
  toDot([
    await expandPermissionTree("starship_system:enterprise_bridge", "operate"),
    await expandPermissionTree("starship_system:sickbay", "operate"),
  ]),
  "| dot -Tpng | imgcat"
);
