const Prometheus = require('prom-client')

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = "info";

/** Define exportable metrics **/
const startedCalls = new Prometheus.Counter({
    name: 'started_calls',
    help: 'The number of initiated calls by the clients',
    labelNames: ['serviceId', 'roomId'],
});

const endedCalls = new Prometheus.Counter({
    name: 'ended_calls',
    help: 'The number of finished calls by the clients',
    labelNames: ['serviceId', 'roomId'],
});

const callDurations = new Prometheus.Histogram({
    name: 'call_durations',
    help: 'The distribution of duration of calls',
    labelNames: ['serviceId'],
    buckets: [
        5 * 60 * 1000, // 5 min calls
        17 * 60 * 1000, // 17 min calls (for 15 mins meeting)
        32 * 60 * 1000, // 32 min calls (for the 30 mins meeting)
        62 * 60 * 1000, // 62 min calls (for the 1h meetings)
        5 * 60 * 60 * 1000, // 5h calls
    ]
});

function main() {
    const SERVER_PORT = 5080;
    const app = require('express')();
    const http = require('http').Server(app);
    const io = require('socket.io')(http);

    app.get('/metrics', function(request, response) {
        const register = Prometheus.register;
        response.setHeader('Content-Type', register.contentType)
        register.metrics().then(content => {
            response.end(content);
        });
    });
    
    //Whenever someone connects this gets executed
    io.on('connection', function(socket) {
        const calls = new Map();
        logger.info('Socket is connected');

        // Report Types: https://github.com/ObserveRTC/schemas-2.0/tree/main/generated-schemas/reports/v3
        socket.on("CALL_EVENT", data => {       
            const buffer = Buffer.from(data);
            const decodedString = String.fromCharCode.apply(null, buffer);
            const callEvent = JSON.parse(decodedString);
            const { name: eventType, serviceId, callId, timestamp } = callEvent;

            // Type of call events: https://github.com/ObserveRTC/schemas-2.0/blob/main/generated-schemas/reports/v3/call-event-report.md
            switch (eventType) {
                case "CALL_STARTED":
                    startedCalls.labels(serviceId).inc();
                    calls.set(callId, timestamp);
                    break;
                case "CALL_ENDED":
                    endedCalls.labels(serviceId).inc();
                    const durationInMs = calls.has(callId) ? (timestamp - calls.delete(callId)) : -1;
                    callDurations.observe(durationInMs);
                    break;
            }
        });
        socket.on('disconnect', function () {
            logger.info("Socket is disconnected");
        });
    });
    http.listen(SERVER_PORT, function() {
        logger.info("Server is listening on " + SERVER_PORT);
    });
}

main();
