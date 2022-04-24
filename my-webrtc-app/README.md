My-WebRTC-App
---

A simple react app written in typescript for WebRTC.

## ObserveRTC integration

The [@observertc/client-monitor-js](https://github.com/ObserveRTC/client-monitor-js) is integrated to monitor the WebRTC components.

You can find the integration code snippets in the following components:

 * [MyMonitor](src/MyMonitor.ts): config a monitor and analyse the stats.
 * [index](src/index.tsx): add media inputs, and media constraints to the monitor.
 * [MediasoupClient](src/mediasoup/MediasoupClient.ts): mediasoup sfu integration.

You can also just search for `-- ObserveRTC integration --` comment in the whole project.

## Local Run

1. Install dependencies

    npm i

2. Compile the react app with webpack: 
    
    npm run compile

3. Run the web server

    node server.js

4. Go to http://localhost:9000 in your browser.



