Full stack examples for integrating ObserveRTC
============

This repository contains full stack examples to use and integrate ObserveRTC.

## Quick Start

In terminal, run:

```bash
    SFU_ANNOUNCED_IP={MY_LOCAL_IP_ADDRESS} docker-compose up
```

**MY_LOCAL_IP_ADDRESS** is the IP address of your local network interface connect to the internet. 
You can obtain it by typing `ifconfig` in MacOs or Linux, or `ipconfig` in Windows.


When containers are running, in your browser go to http://localhost:9000 (open it in two, or three tabs).

To see the collected [reports](https://observertc.org/docs/overview/schemas/#reports), check the mongodb at: http://localhost:8081/ (the user is `admin`, the password is `password`).

To see some SFU metrics calculated by the sfu-montior go to http://localhost:5959/metrics

## Using Multiple SFUs

Examples of monitoring cascaded SFU environment requires to run multiple, at least two SFUs.

```bash
    SFU_ANNOUNCED_IP={MY_LOCAL_IP_ADDRESS} docker-compose -f docker-compose-cascaded-sfus.yaml up
```

In your browser tabs you go to http://localhost:9000/?sfuPort=5959, and http://localhost:9000/?sfuPort=7171.



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
