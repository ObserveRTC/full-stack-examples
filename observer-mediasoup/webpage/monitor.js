const { EventEmitter } = require("events");
/** ObserveRTC integration */
const { ClientMonitor } = require("@observertc/client-monitor-js");

export const monitor = ClientMonitor.create({

});


const emitter = new EventEmitter();
monitor.events.onStatsCollected(() => {
    const storage = monitor.storage;
    for (const inboundRtp of storage.inboundRtps()) {
        // emitter.emit()
    }

    for (const outboundRtp of storage.outboundRtps()) {

    }
});