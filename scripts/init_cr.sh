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

COCKROACH_DATABASE=spicedb
COCKROACH_USER=root
COCKROACH_PASSWORD=secret

# Init CockroachDB, allow failure if already initialized.
set +e
/cockroach/cockroach.sh init --certs-dir=/certs --host=cr_node_1
set -e

# Create Database and User
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "CREATE DATABASE IF NOT EXISTS $COCKROACH_DATABASE"
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "CREATE USER IF NOT EXISTS $COCKROACH_USER"
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "ALTER USER root WITH PASSWORD '$COCKROACH_PASSWORD'"
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "GRANT ALL ON DATABASE $COCKROACH_DATABASE TO $COCKROACH_USER"
