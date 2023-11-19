import yaml
import json

def main():
    yaml_file_path = './spaceship2.zaml'

    with open(yaml_file_path, 'r') as file:
        spaceships = yaml.safe_load(file)

    pretty_output = json.dumps(spaceships, indent=4, sort_keys=True)
    print(pretty_output)

if __name__ == '__main__':
    main()
