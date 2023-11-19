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

COCKROACH_DATABASE=spicedb
COCKROACH_USER=root
COCKROACH_PASSWORD=secret

# Create Database and User
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "CREATE DATABASE IF NOT EXISTS $COCKROACH_DATABASE"

docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "CREATE USER IF NOT EXISTS $COCKROACH_USER"

docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "ALTER USER root WITH PASSWORD '$COCKROACH_PASSWORD'"

docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "GRANT ALL ON DATABASE $COCKROACH_DATABASE TO $COCKROACH_USER"

