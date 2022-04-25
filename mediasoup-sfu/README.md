Sfu service using mediasoup
---

An SFU controller using mediasoup written in typescript.

## ObserveRTC integration

The [@observertc/client-monitor-js](https://github.com/ObserveRTC/client-monitor-js) is integrated to monitor the WebRTC components.

You can find the integration code snippets in the following components:

 * [Monitor](src/Monitor.ts): config a monitor and analyse the stats.
 * [Server](src/Server.ts): check how monitor is connected to the observer
 * [Client](src/Client.ts): add transport to the monitor

You can also just search for `-- ObserveRTC integration --` comment in the whole project.

## Local Run

1. Install dependencies

```bash
    npm i
```

2. Compile the react app with webpack: 

```bash    
    npm run compile
```

3. Run the web server

```bash
    node server.js
```

4. Go to http://localhost:9000 in your browser.



