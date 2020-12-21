# WebRTC-Observer on Docker

WebRTC-Observer and WebRTC-Exporter are applications developed to monitor your WebRTC platforms. 

This repository contains the necessary to run WebRTC-Observer stack on Docker using Docker Compose.

## Quick Start

In order to quickly run WebRTC-Observer on a host running Docker and Docker Compose, 
follow these steps:

1. Clone this repository 

    
    git clone https://github.com/ObserveRTC/docker-webrtc-observer-exporter
    
    
2. Setup BigQuery and obtain credentials.

Setup your Google Cloud Console and enable API for BigQuery 
(https://cloud.google.com/bigquery/docs/quickstarts/quickstart-web-ui)

Obtain a credential file have a permission to write to the BigQuery dataset 
your project host of. 
(https://cloud.google.com/docs/authentication/getting-started)

Copy the obtained credential json file to the directory you cloned this repository

    cp YOUR_CREDENTIAL_FILE docker-webrtc-observer-exporter/google_api_credentials.json
    
NOTE: It is important to name the credential file as google_api_credentials.json, because 
the docker-compose file mount the cred file under this name.

3. Run


    docker-compose up
    


This command will run a kafka, and mysql instances, connect your webrtc- applications to them, 
sets up a topic name `reports`, mount config files and the obtained credentials, 
and finally open a port on 7080, so your client integration can send 
webrtc samples to `localhost:7080`. 

Your observer is up and waiting for client samples to provide WebRTC Reports.


## Advanced Configuration

TBD 





kafka-docker
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

Start a cluster:

- ```docker-compose up -d ```

### Hazelcast configuration

The Observer uses [hazelcast](https://hazelcast.org) as an IMDG, and all the configuration related to hazelcast 
is in `hazelcast-config.yml`, which is automatically mounted in the docker when you run it.

## Tutorials

[https://observertc.org/docs/tutorials/](https://observertc.org/docs/tutorials/)

