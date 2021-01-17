docker-webrtc-observer
============

Dockerfile for WebRTC-Observer project. 
The image is available directly from [Docker Hub](hhttps://hub.docker.com/repository/docker/observertc)


## Pre-Requisites

- install docker-compose [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)
- if you want to customize any Kafka parameters, simply add them as environment variables in ```docker-compose.yml```.
- Kafka's log4j usage can be customized by adding environment variables prefixed with ```LOG4J_```.


## Quick Start

1. Clone the project


    git clone https://github.com/ObserveRTC/docker-webrtc-observer


2. Compose up


    docker-compose up


This composes up the observer with the default configuration. 
You need to have an [observer-js](https://github.com/ObserveRTC/observer-js) 
integration to collect [peer connection samples](https://observertc.org/docs/references/peer-connection-sample/) 
from. If you don't have it, please use the one for [demo](https://github.com/ObserveRTC/observer-js#run-demo-using-docker) purpose.

Once you start the client to collect the WebRTCStats to `localhost:7080`, 
from the observer logs you will see a summary of the reports it generates.
You can see the metric the observer exposes at `localhost:7081/prometheus` as 
prometheus is the default target for the integrated micrometer.

If you want to see the each of the report it generates in detail, remove out-commented lines in the 
`docker-compose.yaml` file (before the line of ` MICRONAUT_CONFIG_FILES=/observer-config.yaml`, and 
`./quick-observer-config.yaml:/observer-config.yaml`) then compose up the observer again.

## Use fullstack version

FullStack includes:
  
 * [Observer](http://github.com/ObserveRTC/observer)
 * [Connector](http://github.com/ObserveRTC/connector)


### Obtain credentials for BigQuery

The `example-pipeline.yaml` is set up to connect to a [BigQuery](https://cloud.google.com/bigquery/docs/introduction)
service.
* Obtain a [credential file](https://cloud.google.com/bigquery/docs/authentication/service-account-file)
  and save it in the directory you cloned this repository as `myCredentials.json`.
* Set the `projectId`, `datasetId` to your project id and the dataset id you want
  to save the reports to.

### Run

```shell
     docker-compose -f fullstack-docker-compose.yaml up
```

You need to have an [observer-js](https://github.com/ObserveRTC/observer-js)
integration to collect [peer connection samples](https://observertc.org/docs/references/peer-connection-sample/)
from. If you don't have it, please use the one for [demo](https://github.com/ObserveRTC/observer-js#run-demo-using-docker) purpose.

Once you run the integration and start the collection, you should see your reports in 
bigquery, and the exposed metrics at `localhost:7081/prometheus` endpoint.

#### observer-config.yaml

The observer-config yaml is the configuration file for the observer setting up its 
connectors and evaluators. 

#### connect-config.yaml

The connector-config yaml is the configuration file for the connector service 
setting up its pipelines determines from which source (i.e.: kafka), to which sink (i.e.: bigquery) 
with what filter (transformations) the connector should forward the fetched reports to.

#### example-pipeline.yaml

This is a basic example pipeline configuration for the `connector` service 
to setup a pipeline fetches reports from kafka and forward it to `bigquery`

#### hazelcast-config.yaml

The Observer uses [hazelcast](https://hazelcast.org) as an IMDG, and all the configuration related to hazelcast
is in `hazelcast-config.yml`, which is automatically mounted in the docker when you run it.


Tags and releases
-----------------

Images are build from the same set of configuration for the Observer.
The version format of the tag mirrors the version of the Observer.

When an image is updated, all tags will be pushed with the latest updates.

---

## Tutorials

TBD

