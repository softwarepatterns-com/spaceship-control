# Spaceship Control

A demo app using SpiceDB.

## Why?

Zanzibar’s core promise is global horizontal scalability with strong consistency. It's basically dynamic programming where each problem is broken up into smaller problems and cached at each step along the way. Over time, each subset of problems is spread evenly across a distributed cache.

## To Run Demo

```bash
colima start
./scripts/make_certs.sh
docker-compose up
```

To run in-memory

```zsh
docker run --rm -p 50051:50051 quay.io/authzed/spicedb:latest serve --grpc-preshared-key "my_laptop_dev"
```

To run against cockroach

```zsh
docker run --rm -p 50051:50051 quay.io/authzed/spicedb:latest serve --grpc-preshared-key "my_laptop_dev" --datastore-engine=cockroachdb --datastore-conn-uri="postgres://root:secret@localhost:8080/spicedb?sslmode=disable"
```

```zsh
zed context set dev localhost:50051 my_laptop_dev
zed schema write star-trek.zed --insecure
```

## To develop

## SpiceDB usage

Here are basic commands to use SpiceDB with this project.

To install locally and get the cli.

```zsh
brew install authzed/tap/spicedb
```

To run in a docker container

```zsh
docker run --rm -p 50051:50051 quay.io/authzed/spicedb:latest serve --grpc-preshared-key "my_laptop_dev"
```

If using kubernetes, use the [SpiceDB Operator](https://github.com/authzed/spicedb-operator).

### SpiceDB cli usage

Use [zed](https://github.com/authzed/zed). It makes RPC calls, stores credentials securely in the OS keychain, and provides quality-of-life features.

```zsh
brew install authzed/tap/zed
```

Save credentials to the local OS keychain. Example:

```zsh
zed context set prod grpc.authzed.com:443 my_laptop_prod
zed context set dev localhost:80 my_laptop_dev
zed context list
```

They can also be provide per command, or from env vars. Example:

```zsh
zed schema read --endpoint grpc.authzed.com:443 --token my_laptop_dev
ZED_ENDPOINT=grpc.authzed.com:443 ZED_TOKEN=my_laptop_dev zed schema read
```

```zsh
zed --insecure --endpoint=localhost:50051 --token=averysecretpresharedkey schema read
zed permission check user:sam pilot ship:ornithopter # false
zed relationship create user:sam pilot ship:ornithopter
zed permission check user:sam pilot ship:ornithopter # true
```

To test the schema:

```zsh
zed validate
```

Use `--explain` to get a trace:

```zsh
zed permission check document:firstdoc writer user:emilia --explain
```

## SpiceDB Transactions/Commits

Cool and normal.

```
try:
  tx = db.transaction()

  # Write relationships during a transaction so that it can be aborted on exception
  resp = spicedb_client.WriteRelationships(...)

  tx.add(db_models.Document(
    id=request.document_id,
    owner=user_id,
    zedtoken=resp.written_at
  ))
  tx.commit()
except:
  # Delete relationships written to SpiceDB and re-raise the exception
  tx.abort()
  spicedb_client.DeleteRelationships(...)
  raise
```

## SpiceDB Streaming (CQRS)

(TODO: Where are the examples?)

## SpiceDB Testing

- All data written is ephemeral: it will be lost when the process is shut down.
- The API a read-only port: The normal API is served on port 50051 while a new read-only version of the same API is served on port 50052.
- A unique ephemeral datastore per auth token. If no token, use "default" datastore.
- There is a [GitHub Action](https://github.com/authzed/action-spicedb) for more convenient integration tests.

```zsh
spicedb serve-testing
# or
spicedb serve-testing --load-configs myschema.zaml
```

## SpiceDB Import

Import or seed existing data with (Zed Import)[https://authzed.com/blog/zed-import]. Supports gists, playgrounds, pastebins and even experimental imports from postgres/cockroachdb.

```zsh
 zed import https://gist.github.com/ecordell/8e3b613a677e3c844742cf24421c08b6
```

It can even make a best-effort guess on what the schema should be based on a relationships already in your db.

## CockroachDB usage

SpiceDB has logic to manage a pool of connections to CockroachDB to [redistribute unbalanced connections](https://authzed.com/blog/maximizing-cockroachdb-performance). They track how many connections exist to each internal node in CockroachDB, and if the numbers are too uneven then they safely and slowly kill some of those connections, hoping that new connections will pick a different internal node -- over time, this works.

They also have expanded logic for error handling. They handle a greater number of use-cases, and they will distribute retries across CockroachDB internal nodes. They also track the general health of each connection, relying on that mechanism to feel confident about extending the lifetime of a connection beyond the standard 5 minutes. (TODO: [investigate](https://github.com/authzed/crdbpool))

For the cli tools:

```zsh
brew install cockroachdb/tap/cockroach
```

## Docker usage

Here are basic commands to use docker with this project.

If you don't want to use Docker Desktop and you're on OSX, use colima.

```zsh
# Install community-edition of docker cli tools.
brew install --cask docker
brew install docker-compose
mkdir -p ~/.docker/cli-plugins
ln -sfn /opt/homebrew/opt/docker-compose/bin/docker-compose ~/.docker/cli-plugins/docker-compose

# Install the docker daemon.
brew install colima

# To start the docker daemon.
colima start

# To stop the docker daemon.
colima stop

# If something goes horribly wrong (due to M1-M3 macs)
colima delete
rm -rf ~/.lima
colima start
```
