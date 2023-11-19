# Spaceship Control: Python

## How to Generate Protobufs from Buf Registry

Buf usage

[docs](https://buf.build/docs/ecosystem/cli-overview)

generate --

### Debugging protobufs

curl -- Use to make gRPC calls.
convert -- Convert from binary to text and back.

## Python usage

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
