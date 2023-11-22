const grpc = require("@grpc/grpc-js");
const fs = require("fs");

// Paths to the client and CA certificates
const clientCertPath = "../../data/certs/client.root.cert"; // Change to a non-root named user that represents this server.
const clientKeyPath = "../../data/certs/client.root.key"; // Change to a non-root named user that represents this server.
const caCertPath = "../../data/certs/ca.cert"; // Path to the CA certificate

// Read client certificate, key, and CA certificate
const clientCert = fs.readFileSync(clientCertPath);
const clientKey = fs.readFileSync(clientKeyPath);
const caCert = fs.readFileSync(caCertPath);

// Create gRPC client with mutual TLS credentials
const client = new grpc.Client(
  "my.server.com:50051",
  grpc.credentials.createSsl(caCert, clientKey, clientCert)
);
