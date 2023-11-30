/**
 * This example demonstrates how to connect to a CockroachDB cluster.
 *
 * Run the example: `node pg-server.js`
 *
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const readFile = (file) =>
  fs.readFileSync(path.resolve(__dirname, file)).toString();

const config = {
  user: "root",
  password: "secret",
  host: "localhost",
  database: "spicedb",
  port: 26257,
  ssl: {
    ca: readFile("../../data/certs/ca.crt"),
    key: readFile("../../data/certs/client.root.key"),
    cert: readFile("../../data/certs/client.root.crt"),
  },
};

const pool = new Pool(config);

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error executing query", err.stack);
  } else {
    console.log("Connection successful. Current Time:", res.rows[0]);
  }
  pool.end();
});
