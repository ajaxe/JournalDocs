# Hosting Private OpenFaas

## Introduction

Following up with my [previous post](self-hosting.md) to host private docker registry, I decided to host an instance of OpenFaas behind [Traefik](https://traefik.io/) and protect it with Basic Auth.

## Objective

Objective is to have the following setup and configuration for private OpenFaas.

* Traefik configuration:
    * OpenFaas available on domain `faas.apogee-dev.com`.
    * Most importantly OpenFaas is protected via basic auth.
* OpenFaas endpoints `/ui` and `/system` are proteced and accessible to [faas-cli](https://github.com/openfaas/faas-cli).
* OpenFaaS endpoint `/function` is unprotected for deployed functions to be invoked.

## Docker Setup

!!! warning "Docker Install"
    Before we proceed, do make sure that **Docker Engine** is installed as per the official [Installation Doc](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-using-the-repository). I made a mistake of installing via ubuntu `sudo snap install docker` and later, ran into permission errors during startup of _Traefik_ in swarm mode. After extensive search I came across [Docker Forum post](https://forums.docker.com/t/error-mkdir-var-lib-docker-permission-denied-when-creating-a-service/61615), which made my day :smile:.

First, we need to initialize docker swarm,

```bash
sudo docker swarm init
```

then, we'll setup overlay network `functions` which will be used with traefik and OpenFaaS.

```bash
sudo docker network create --attachable --driver overlay --label "openfaas=true" functions
```

## AWS Route53

I am using AWS Route53 as the DNS provider so I add A record for `faas.apogee-dev.com` pointing to the right ip address. `faas.apogee-dev.com`. Host header will be used to route requests to via Traefik to OpenFaaS gateway.

## Traefik Configuration

I'll use `docker stack deploy` with `docker-compose.yml`, as input, to setup _Traefik_ service in Docker Swarm.

```yaml
version: '3'

services:
  # The reverse proxy service (Traefik)
  reverse-proxy:
    image: traefik:latest  # The official Traefik docker image
    command: --api --docker  # Enables the web UI and tells Traefik to listen
    deploy:
      mode: replicated
      placement:
        constraints:
          - node.role==manager
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
        window: 120s
    restart: always # not supported in swarm mode to docker
    ports:
      - "80:80"      # The HTTP port
      - "443:443"
      - "8080:8080"  # The Web UI (enabled by --api)
    networks:
      - functions
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # So that Traefik can listen to the Docker events
      - /mnt/ssd/projects/traefik-local/traefik.toml:/traefik.toml
      - /mnt/ssd/projects/traefik-local/acme.json:/acme.json
    container_name: traefik # not supported in swarm mode

networks:
  functions:
    external: true
```

Corresponding `toml` configuration for _Traefik_ is a follows:

```toml
debug = true
# Log level
#
# Optional
# Default: "ERROR"
#
# Accepted values, in order of severity: "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "PANIC"
# Messages at and above the selected level will be logged.
#
logLevel = "DEBUG"
defaultEntryPoints = ["https","http"]

[entryPoints]
  [entryPoints.http]
  address = ":80"
    [entryPoints.http.redirect]
    entryPoint = "https"
  [entryPoints.https]
  address = ":443"
  [entryPoints.https.tls]

[retry]

[docker]
endpoint = "unix:///var/run/docker.sock"
domain = "<default-domain>"
watch = true
exposedByDefault = false
swarmMode = true

[acme]
email = "<your-email>"
storage = "acme.json"
entryPoint = "https"
onHostRule = true
[acme.httpChallenge]
entryPoint = "http"
[[acme.domains]]
  main = "offsite.apogee-dev.com"
[[acme.domains]]
  main = "docker-registry.apogee-dev.com"
[[acme.domains]]
  main = "faas.apogee-dev.com"
```

Traefik will create new SSL certificate for new domain `faas.apogee-dev.com` on start-up.

## OpenFaas Setup

I wont reiterate well documented steps to setup OpenFaas, those steps can be found here:

[Integrate Traefik with your OpenFaaS cluster](https://github.com/openfaas/faas/blob/master/guide/traefik_integration.md)

I added additional labels to the OpenFaaS gateway service, at container as well at service levels:

```yaml
labels:
  - "traefik.domain=faas.apogee-dev.com"
  - "traefik.docker.network=functions"
  - "traefik.port=8080"
  - "traefik.enable=true"
  - "traefik.open.frontend.rule=Host:faas.apogee-dev.com;PathPrefix:/function"
  - "traefik.secured.frontend.rule=Host:faas.apogee-dev.com;PathPrefix:/ui,/system"
  - traefik.secured.frontend.auth.basic.users=user:$$apr1$$.UkC.x9C$$eyPRxQ...b9y1
  - "traefik.frontend.ratelimit.extractorFunc=client.ip"
  - "traefik.frontend.rateLimit.rateSet.rateset1.period=3"
  - "traefik.frontend.rateLimit.rateSet.rateset1.average=5"
  - "traefik.frontend.rateLimit.rateSet.rateset1.burst=10"
```

The above labels setup two frontends one `open` which is not protected by basic auth, the other is `secured` which secures paths `/ui` and `/system`. I would certainly point out a minor change in the OpenFaaS deployment, I disabled HTTP Basic Auth on OpenFaas as I configured basic auth in Traefik for openFaas routing. So the deployment script call looks like this:

```bash
$ ./deploy_stack.sh --no-auth
```
Console output will like this:

```
Attempting to create credentials for gateway..
Error response from daemon: rpc error: code = AlreadyExists desc = secret basic-auth-user already exists
Error response from daemon: rpc error: code = AlreadyExists desc = secret basic-auth-password already exists
[Credentials]
 already exist, not creating

Disabling basic authentication for gateway..

Deploying OpenFaaS core services
Updating service func_prometheus (id: jewy6c3n300lq0a32grsoz00s)
Updating service func_alertmanager (id: dkyi63igdok7gl03zdrqfyg08)
Updating service func_gateway (id: wk6gwdxn5lrhmagl9tpxrdwer)
Updating service func_faas-swarm (id: xsgr948d8l2dips4icdudnmy9)
Updating service func_nats (id: zobmkxjtrqst7p2qwxih4884f)
Updating service func_queue-worker (id: rl84fv7fy9bfyqvcodznow98g)
```

## Testing

After the configuration is complete we shall be prompted for credentials at `faas.apogee-dev.com/ui/`.

With OpenFaaS cli setup on another remote desktop we should be able to deploy functions at this gateway.