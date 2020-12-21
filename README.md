docker-webrtc-observer
============

Dockerfile for [WebRTC-Observer](http://github.com/ObserveRTC/webrtc-observer)

The image is available directly from [Docker Hub](hhttps://hub.docker.com/repository/docker/observertc/webrtc-observer)

Tags and releases
-----------------

Images are build from the same set of configuration for the Observer.
The version format of the tag mirrors the version of the Observer.

When an image is updated, all tags will be pushed with the latest updates.

---

## Pre-Requisites

- install docker-compose [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)
- if you want to customize any Kafka parameters, simply add them as environment variables in ```docker-compose.yml```.
- Kafka's log4j usage can be customized by adding environment variables prefixed with ```LOG4J_```. 

## Usage


In order to quickly run WebRTC-Observer on a host running Docker and Docker Compose,
follow these steps:

1. Clone this repository


    git clone https://github.com/ObserveRTC/docker-webrtc-observer-exporter

2. Run

```shell
    docker-compose up
```


### Hazelcast configuration

The Observer uses [hazelcast](https://hazelcast.org) as an IMDG, and all the configuration related to hazelcast 
is in `hazelcast-config.yml`, which is automatically mounted in the docker when you run it.

## Tutorials

[https://observertc.org/docs/tutorials/](https://observertc.org/docs/tutorials/)

