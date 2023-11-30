const grpc = require("@grpc/grpc-js");
const fs = require("fs");

// Paths to the specific service's certificates
const serverCertPath = "./data/cr_node_1/certs/server.cert"; // Adjust as per actual filename
const serverKeyPath = "./data/cr_node_1/certs/server.key"; // Adjust as per actual filename
const caCertPath = "./data/certs/ca.cert"; // Path to the CA certificate

// Read server certificate, key, and CA certificate
const serverCert = fs.readFileSync(serverCertPath);
const serverKey = fs.readFileSync(serverKeyPath);
const caCert = fs.readFileSync(caCertPath);

// Create gRPC server with TLS credentials
const server = new grpc.Server();
server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createSsl(
    caCert,
    [
      {
        cert_chain: serverCert,
        private_key: serverKey,
      },
    ],
    true
  ),
  () => {
    // 'true' to require client certificates
    server.start();
  }
);
