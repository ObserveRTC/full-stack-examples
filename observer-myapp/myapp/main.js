const { KafkaStreams } = require("kafka-streams");
const kafkajsConfig = require("./kafkajs-config.js");
const factory = new KafkaStreams(kafkajsConfig);
const Prometheus = require('prom-client')

/** Define exportable metrics **/
const startedCalls = new Prometheus.Counter({
    name: 'started_calls',
    help: 'The number of initiated calls by the clients',
    labelNames: ['serviceId', 'mediaUnitId', 'roomId'],
});

const endedCalls = new Prometheus.Counter({
    name: 'ended_calls',
    help: 'The number of finished calls by the clients',
    labelNames: ['serviceId', 'mediaUnitId', 'roomId'],
});

factory.getKStream()
    .from("observertc-call-event")
    .mapJSONConvenience()
    .mapWrapKafkaValue()
    .forEach(callEvent => {
        if (!callEvent) {
            return;
        }
        switch (callEvent.name) {
            case "CALL_STARTED":
                startedCalls
                    .labels(callEvent.serviceId, callEvent.mediaUnitId, callEvent.roomId)
                    .inc();
            case "CALL_ENDED":
                endedCalls
                    .labels(callEvent.serviceId, callEvent.mediaUnitId, callEvent.roomId)
                    .inc();
        }
    });

// conferences with 2 participants over time

// Average conference size

// Number of unique users (unique cookie ids for a given time period)

// Turn usage - % of joined sessions that used TURN

// % of user joins with media issues over time

// % of user joins (or join attempts) with connectivity issues over time

// List of users with issues by issue with links to more detailed logs


