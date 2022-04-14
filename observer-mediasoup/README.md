ObserveRTC Example using mediasoup
---

Simple Proof of Concept for using observertc libraries and services to monitor WebRTC browser-side, and SFU side app using mediasoup.


## Run 

Set the announcedIp to your computer assigned IP. (mac: `ifconfig`, linux / windows: `ipconfig`)

Start the server in docker

    docker-compose up

Building the image takes time. When the image is built go to `http://localhost:5959/rooms/myRoom` in one or more tabs.
Local client 


## Directory structure
 * **observer-config**: contain config files for the observer
 * **sfu**: Mediasoup SFU related code to integrate it with ObserveRTC
 * **webpage** Webpage related code to integrate it with ObserveRTC

## Local Dev

The sfu includes the webpage as it is a webservice. It listens for websocket connections and serve http requests. Webpage is an http request, served as plain/text. If you wanna develop the webpage you can add your stuff in the webpage, and then browserify then copy it to the sfu directory. If you want to develop the SFU add your code in the proper place there.

## License

Apache-2.0
