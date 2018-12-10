# Host Web App Behind Traefik

I decided to host an Aspnet Core application behind _Traefik_. I used `PathPrefix` based routing to setup the hosted web-application. Any request on default host: `offsite.apogee-dev.com` and `PathPrefix` of `/hostmgmt` will be routed to the web-application.

## Docker Service Definition

Docker-compose file to deploy the application stack have the following labels:

```yaml
services:
  host-mgmt:
    image: docker-registry.apogee-dev.com/host-mgmt
    #...stripped
    environment:
      - AppPathPrefix=/hostmgmt
    deploy:
      labels:
        #...stripped
        - "traefik.frontend.rule=Host:offsite.apogee-dev.com;PathPrefix:/hostmgmt"
        #...stripped
```

[Complete docker-compose.yml](https://github.com/ajaxe/private-hosting/blob/master/host-mgmt/docker-compose.yml)

Use of `PathPrefix:/hostmgmt` tells _Traefik_ to route to the docker service `host-mgmt`. Also in the service definition we have defined an environment variable `AppPathPrefix` which is used by the aspnet core application to set the request `PathBase`.

## Considerations in Aspnet Core Application

Certain changes were made within the web application, for it to be hosted behind the proxy. Complete `Startup.cs`can be found [here](https://github.com/ajaxe/host-mgmt/blob/master/HostingUserMgmt/Startup.cs). The summary of the changes:

* `UseHttpsRedirection()` and `UseHsts()` middlewares were removed, since the SSL termination happens at _Traefik_
* `Forwared Headers` middleware was added for production configuration via `app.UseForwardedHeaders()`. This [SO question](https://stackoverflow.com/questions/43860128/asp-net-core-google-authentication) was very helpful in correctly configuring the middleware for redirecting oauth requests.
* Configure environment variable `AppPathPrefix` to allow us to specify virtual path when hosting within Kestrel. In our case we have `/hostmgmt` as the prefix.

!!! note "Use of path prefix"
    _Traefik_ does not support url-rewrite within responses and hence the web-application is hosted under a virtual path. The virtual path matches the `PathPrefix` routing value in docker labels.
