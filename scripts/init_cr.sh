#!/bin/sh
#
# Initialize CochroachDB. NOOP if already initialized.
# 
set -e
set -x

# Function to check if environment variables are set
check_env() {
    if [ -z "$1" ]; then
        echo "Error: Environment variable $2 is not set."
        exit 1
    fi
}

# Check if required environment variables are set
check_env "${COCKROACH_DATABASE}" "COCKROACH_DATABASE"
check_env "${COCKROACH_USER}" "COCKROACH_USER"
check_env "${COCKROACH_PASSWORD}" "COCKROACH_PASSWORD"

# nslookup cr_node_1

curl http://cr_node_1:8080/health

# Init CockroachDB, allow failure if already initialized.
# set +e
if ! cockroach init --certs-dir=/certs --host=cr_node_1; then
    echo "Initialization failed. The cluster might already be initialized."
fi
# set -e

# Create Database and User
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "CREATE DATABASE IF NOT EXISTS $COCKROACH_DATABASE" --vmodule=*=2 --logtostderr
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "CREATE USER IF NOT EXISTS $COCKROACH_USER" --vmodule=*=2 --logtostderr
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "ALTER USER root WITH PASSWORD '$COCKROACH_PASSWORD'" --vmodule=*=2 --logtostderr
cockroach sql --certs-dir=/certs --host=cr_node_1 -e "GRANT ALL ON DATABASE $COCKROACH_DATABASE TO $COCKROACH_USER" --vmodule=*=2 --logtostderr
