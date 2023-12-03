import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toDot } from "./lib/dot.js";
import { ZedClient } from "./lib/authzed.js";
import fastify from "fastify";
import { getArgs } from "./lib/cli.js";

const getFileContents = (filePath) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedFilePath = path.resolve(__dirname, filePath);
  return fs.readFileSync(resolvedFilePath);
};

const argv = getArgs();
const token = argv.token; // "my_laptop_dev";
const endpoint = argv.endpoint; // "localhost:50051";
const cert = argv.cert; // getFileContents("../../data/certs/ca.crt");
const zed = new ZedClient(token, endpoint, cert);
const app = fastify({ logger: true });
const testHtml = getFileContents("./test.html");

/**
 * @example
 * curl "http://localhost:3000/"
 */
app.get("/", (_, reply) => {
  reply.type("text/html").send(testHtml);
});

/**
 * @example
 * curl "http://localhost:3000/relationships?resource=starship_system:enterprise_bridge"
 */
app.get("/relationships", async (req, res) => {
  const { resource } = req.query;
  if (resource) {
    return await zed.getResourceTypeRelationships(resource);
  }
  return await zed.getRelationships(100);
});

/**
 * @example
 * curl "http://localhost:3000/check?q=starship_system:enterprise_bridge%40operate@user:picard"
 */
app.get("/check", (req) => zed.checkPermission(req.query.q));

/**
 * @example
 * curl "http://localhost:3000/subjects?resource=starship_system:enterprise_bridge&permission=operate&subjectType=user"
 */
app.get("/subjects", async (req) => {
  const { resource, permission, subjectType } = req.query;
  return zed.getResourcePermissionSubjectTypeList(resource, permission, subjectType);
});

/**
 * @example
 * curl "http://localhost:3000/resources?subject=user:picard&permission=operate&resourceType=starship_system"
 */
app.get("/resources", (req) => {
  const { subject, permission, resourceType } = req.query;
  return zed.getSubjectPermissionResourceTypeList(subject, permission, resourceType);
});

/**
 * @example
 * curl "http://localhost:3000/resource-permission-tree?resource=starship_system:enterprise_bridge&permission=operate&format=dot"
 */
app.get("/resource-permission-tree", async (req, res) => {
  const { resource, permission, format } = req.query;
  const permissionTree = await zed.getResourcePermissionTree(resource, permission);

  if (format === "json") {
    return permissionTree;
  }

  const dotString = toDot([permissionTree], { pretty: true, indent: 1 });
  if (format === "dot") {
    return dotString;
  }

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
  const escapedDotString = dotString.replace(/"/g, '\\"');
  const cmd = `echo "${escapedDotString}" | dot -T${dotFormat}`;
  const buffer = execSync(cmd);
  res.header("Content-Type", contentType).send(buffer);
});

/**
 * @example
 * curl "http://localhost:3000/health"
 */
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

// console.log(`\n${(await client1.promises.readSchema({}))?.schemaText}\n`);
