Full stack Examples for using ObserveRTC
============

This repository contains full stack examples to use and integrate ObserveRTC.

## Quick Start

1. In terminal type:

    SFU_ANNOUNCED_IP={YOUR_LOCAL_IP_ADDRESS} docker-compose up


**YOUR_LOCAL_IP_ADDRESS** is the IP address of your local network interface connect to the internet. 
You can obtain it by typing `ifconfig` in macOs or Linux, and `ipconfig` in Windows.

2. In your browser go to `http://localhost:9000` (open it in two, or three tabs).

To see the collected reports, check the mongodb at: http://localhost:8081/ 

To see some SFU metrics calculated by the sfu-montior go to http://localhost:5959/metrics

## Dev mode

if you want to modify the [mediasoup-sfu](mediasoup-sfu/) or the [webrtc-app](my-webrtc-app/) locally, 
then don't start it as a service in the docker-compose. Running the mediasoup-app or my-webrtc-app locally 
requires npm and typescript.

## Integration Requests or Running Issues

Please open an issue.

## Contribution

Make your changes locally and open a PR here.

## License

Apache-2.0
