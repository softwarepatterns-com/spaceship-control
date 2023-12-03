# Spaceship Control NodeJS

## Run

```zsh
node ./src/authzed-server.mjs --token="my_laptop_dev" --endpoint="localhost:50051" --cert="../data/certs/ca.crt"
```

Can test the openssl of the server with:

```zsh
openssl s_client -connect localhost:50051 -CAfile ../data/certs/ca.crt
```

## Zed

Backup example

```zsh
rm test.txt && zed backup test.txt --certificate-path ../data/certs/ca.crt --no-verify-ca
```

Restore example

```zsh
zed restore test.txt --certificate-path ../data/certs/ca.crt --no-verify-ca
```

Import example

```zsh
zed import ../spaceship2.zaml --certificate-path ../data/certs/ca.crt --no-verify-ca --log-level trace
```

Validate example

```zsh
zed validate ../spaceship2.zaml
```
