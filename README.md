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
 



