# Spaceship Control

A demo app using SpiceDB.

# To run



# To develop

# SpiceDB usage

Here are basic commands to use SpiceDB with this project. 

To install locally and get the cli.
```zsh
brew install authzed/tap/spicedb
```

To run in a docker container
```zsh
docker run -p 50051:50051 quay.io/authzed/spicedb:latest serve
```

If using kubernetes, use the [SpiceDB Operator](https://github.com/authzed/spicedb-operator).


## SpiceDB cli usage

Use [zed](https://github.com/authzed/zed). It makes RPC calls, stores credentials securely in the OS keychain, and provides quality-of-life features.

```zsh
brew install authzed/tap/zed
```

Save credentials to the local OS keychain. Example:

```zsh
zed context set prod grpc.authzed.com:443 tc_zed_my_laptop_deadbeefdeadbeefdeadbeefdeadbeef
zed context set dev localhost:80 testpresharedkey
zed context list
```

They can also be provide per command, or from env vars. Example:

```zsh
zed schema read --endpoint grpc.authzed.com:443 --token tc_zed_my_laptop_deadbeefdeadbeef
ZED_ENDPOINT=grpc.authzed.com:443 ZED_TOKEN=tc_zed_my_laptop_deadbeefdeadbeef zed schema read
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

# Postgres usage



# CockroachDB usage



# Docker usage

Here are basic commands to use docker with this project. 

If you don't want to use Docker Desktop and you're on OSX, use colima.

```zsh
# Install community-edition of docker cli tools.
brew install --cask docker
# Install the docker daemon.
brew install colima
# To start the docker daemon.
colima start
# To stop the docker daemon.
colima stop
```

# Python usage

Here are basic commands to use python with this project.

To create a python env

```zsh
python3 -m venv env
```

To start a python env

```zsh
source env/bin/activate
pip install -r requirements.txt 
```

To save the current dependencies using [pip freeze](https://pip.pypa.io/en/stable/cli/pip_freeze/)
```zsh
pip freeze > requirements.txt
```

To stop the env
```zsh
deactivate
```
