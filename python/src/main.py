import yaml
import json
from authzed.api.v1 import Client
from grpcutil import bearer_token_credentials
from authzed.api.v1 import (
    CheckPermissionRequest,
    CheckPermissionResponse,
    ObjectReference,
    SubjectReference,
)

def main():
    yaml_file_path = '../spaceship2.zaml'

    with open(yaml_file_path, 'r') as file:
        spaceships = yaml.safe_load(file)

    pretty_output = json.dumps(spaceships, indent=4, sort_keys=True)
    print(pretty_output)

    post_one = ObjectReference(object_type="blog/post", object_id="1")
    emilia = SubjectReference(object=ObjectReference(
        object_type="blog/user",
        object_id="emilia",
    ))

    client = Client(
        "grpc.authzed.com:443",
        bearer_token_credentials("t_your_token_here_1234567deadbeef"),
    )

    # Is Emilia in the set of users that can read post #1?
    resp = client.CheckPermission(CheckPermissionRequest(
        resource=post_one,
        permission="reader",
        subject=emilia,
    ))
    assert resp.permissionship == CheckPermissionResponse.PERMISSIONSHIP_HAS_PERMISSION

if __name__ == '__main__':
    main()
