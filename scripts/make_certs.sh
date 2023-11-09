#!/bin/bash
#
# Make certs used by local app.
# 
# ca.crt # Root
# 
# node.key # Key for server cert.
#
set -e
set -x

rm -rf data/
mkdir -pv data/cr_node_1/certs
mkdir -pv data/cr_node_2/certs
mkdir -pv data/cr_node_3/certs

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