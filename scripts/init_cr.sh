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

# Create Database and User
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "CREATE DATABASE IF NOT EXISTS spaceship_control"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "CREATE USER IF NOT EXISTS app_user"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "GRANT ALL ON DATABASE spaceship_control TO app_user"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -d spaceship_control -e "CREATE TABLE IF NOT EXISTS spaceship (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name STRING NOT NULL,
    description STRING
);"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -d spaceship_control -e "CREATE TABLE IF NOT EXISTS spaceship_system (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spaceship_id UUID REFERENCES spaceship (id),
    name STRING NOT NULL,
    description STRING
);"


docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "SHOW DATABASES"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -e "USE spaceship_control; SHOW TABLES"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -d spaceship_control -e "SELECT * FROM spaceship LIMIT 5"
docker exec -it cr_node_1 cockroach sql --certs-dir=/certs -d spaceship_control -e "SELECT * FROM spaceship_system LIMIT 5"
