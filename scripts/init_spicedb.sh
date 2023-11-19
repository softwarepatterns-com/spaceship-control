#!/bin/bash
#
# Spin up a spicedb instance.
# 
#
set -e
set -x

COCKROACH_DATABASE=spicedb
COCKROACH_USER=root
COCKROACH_PASSWORD=secret
COCKROACH_HOST=localhost
COCKROACH_PORT=26257

docker run --rm -p 50051:50051 quay.io/authzed/spicedb:latest serve \
  --grpc-preshared-key "my_laptop_dev" \
  --datastore-engine=cockroachdb \
  --datastore-conn-uri="postgres://$COCKROACH_USER:$COCKROACH_PASSWORD@$COCKROACH_HOST:$COCKROACH_PORT/$COCKROACH_DATABASE?sslmode=require&sslrootcert=data/certs/ca.crt&sslcert=data/certs/client.root.crt&sslkey=data/certs/client.root.key"
