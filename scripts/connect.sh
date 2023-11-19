#!/bin/sh
#
# Connect to the spicedb database on cockroachdb
#
set -e
set -x

COCKROACH_DATABASE=spicedb
COCKROACH_USER=root
COCKROACH_PASSWORD=secret

cockroach sql --url "postgresql://$COCKROACH_USER:$COCKROACH_PASSWORD@localhost:26257/$COCKROACH_DATABASE?sslmode=require&sslrootcert=data/certs/ca.crt&sslcert=data/certs/client.root.crt&sslkey=data/certs/client.root.key"
