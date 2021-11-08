# I am utterly pissed, because of the hysteria going around the `extends` keyword. this: https://github.com/moby/moby/issues/31101
# so here this script intend to solve the problem why I added `extends` to the docker-compose files in the first place. (to not to change version numbers in 5+ subfolders, whenever we release a new version of the observer)
# until the `extennd` will not be supported without the "working in my computer, but not working in the server", here we should run this instead

import hiyapyco
import os

COMMON_SERVICES_FILE_PATH="common-services.yaml"
directory = r'./'
for entry in os.scandir(directory):
    if entry.path.startswith("./observer-") is False:
        continue
    base_docker_compose_path = "/".join([entry.path, "base-docker-compose.yaml"])
    print(base_docker_compose_path)
    docker_compose_conf = hiyapyco.load(COMMON_SERVICES_FILE_PATH, base_docker_compose_path, method=hiyapyco.METHOD_MERGE)
    base_docker_compose_conf = hiyapyco.load(base_docker_compose_path)
    base_services = base_docker_compose_conf["services"]
    to_remove = []
    for key, value in docker_compose_conf["services"].items():
        if key not in base_services.keys():
            to_remove.append(key)
        if "extends" in value.keys():
            del value["extends"]
    for not_included_service in to_remove:
        del docker_compose_conf["services"][not_included_service]

    target_docker_compose_path = "/".join([entry.path, "docker-compose.yaml"])
    with open(target_docker_compose_path, 'w') as yaml_file:
        yaml_file.write(hiyapyco.dump(docker_compose_conf, default_flow_style=False))


# print(hiyapyco.dump(conf, default_flow_style=False))
