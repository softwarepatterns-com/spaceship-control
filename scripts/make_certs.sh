#!/bin/sh
#
# Make certs used by local app.
# 
# ca.crt # Root
# 
# node.key # Key for server cert.
#
set -e
set -x

# Reset all persisted state.
rm -rf data/
mkdir -pv data/cr_node_1/certs
mkdir -pv data/cr_node_2/certs
mkdir -pv data/cr_node_3/certs
mkdir -pv data/grpc/client/certs
mkdir -pv data/grpc/server/certs
mkdir -m 755 -pv data/cr_node_1/data
mkdir -m 755 -pv data/cr_node_2/data
mkdir -m 755 -pv data/cr_node_3/data

# The root and common key of both the cluster and clients.
#
# node.crt # ? 
cockroach cert create-ca \
  --certs-dir=data/certs \
  --ca-key=data/certs/ca.key

# Might be missing IP addresses?
cockroach cert create-node localhost cr_node_1 \
  --certs-dir=data/certs \
  --ca-key=data/certs/ca.key

cp data/certs/ca.crt \
  data/certs/node.crt \
  data/certs/node.key \
  data/cr_node_1/certs
rm data/certs/node.*

cockroach cert create-node localhost cr_node_2 \
  --certs-dir=data/certs \
  --ca-key=data/certs/ca.key

cp data/certs/ca.crt \
  data/certs/node.crt \
  data/certs/node.key \
  data/cr_node_2/certs
rm data/certs/node.*

cockroach cert create-node localhost cr_node_3 \
  --certs-dir=data/certs \
  --ca-key=data/certs/ca.key

cp data/certs/ca.crt \
  data/certs/node.crt \
  data/certs/node.key \
  data/cr_node_3/certs
rm data/certs/node.*

# Used by a specific client to coommunicate with the cluster.
# CN must include user, that is `client.<user>.cr` must have CN=<user>.
# In this case, "root" user will be client.root.cr and CN=root.
cockroach cert create-client root \
  --certs-dir=data/certs \
  --ca-key=data/certs/ca.key \
  --also-generate-pkcs8-key

cp data/certs/client.root.crt \
  data/certs/client.root.key \
  data/cr_node_1/certs
cp data/certs/client.root.crt \
  data/certs/client.root.key \
  data/cr_node_2/certs
cp data/certs/client.root.crt \
  data/certs/client.root.key \
  data/cr_node_3/certs

cockroach cert list --certs-dir=data/certs
cockroach cert list --certs-dir=data/cr_node_1/certs
cockroach cert list --certs-dir=data/cr_node_2/certs
cockroach cert list --certs-dir=data/cr_node_3/certs

# Make the gRPC certs used by gRPC clients. (This will never be true, but remembering for later.)
if [ ! -f data/certs/ca.key ] || [ ! -f data/certs/ca.crt ]; then
  openssl genrsa -out data/certs/ca.key 2048
  openssl req -x509 -new -nodes -key data/certs/ca.key -sha256 -days 1024 -out data/certs/ca.crt -subj "/C=US/ST=State/L=City/O=Organization/CN=RootCA"
fi

# Server Certificate and Key
openssl genrsa -out data/grpc/server/certs/server.key 2048
openssl req -new -key data/grpc/server/certs/server.key -out data/grpc/server/certs/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=gRPCServer"
openssl x509 -req -in data/grpc/server/certs/server.csr -CA data/certs/ca.crt -CAkey data/certs/ca.key -CAcreateserial -out data/grpc/server/certs/server.crt -days 365 -sha256
cp data/certs/ca.crt data/grpc/server/certs
rm data/grpc/server/certs/server.csr

echo "Server Certificates:"
ls -l data/gRPC/server/certs

# Client Certificate and Key
openssl genrsa -out data/grpc/client/certs/client.key 2048
openssl req -new -key data/grpc/client/certs/client.key -out data/grpc/client/certs/client.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=gRPCClient"
openssl x509 -req -in data/grpc/client/certs/client.csr -CA data/certs/ca.crt -CAkey data/certs/ca.key -CAcreateserial -out data/grpc/client/certs/client.crt -days 365 -sha256
cp data/certs/ca.crt data/grpc/client/certs
rm data/grpc/client/certs/client.csr

echo "Client Certificates:"
ls -l data/gRPC/client/certs
