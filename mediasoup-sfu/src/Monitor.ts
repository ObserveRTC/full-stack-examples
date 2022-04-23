import { SfuMonitor, SenderConfig } from "@observertc/sfu-monitor-js";
import { EventEmitter } from "ws";
import { MediasoupCollector } from "@observertc/sfu-monitor-js";

SfuMonitor.setLogLevel('info');

const METRICS_UPDATED_EVENT_NAME = "metricsUpdated";
const emitter = new EventEmitter();

export const monitor = SfuMonitor.create({
    collectingPeriodInMs: 2000,
    samplingPeriodInMs: 10000,
    sendingPeriodInMs: 15000,
    sampler: {
        
    }
});

export type MonitoredMetrics = {
    audioConsumer?: number,
    audioProducers?: number,
    videoConsumers?: number,
    videoProducers?: number,
    incomingRtpSessions?: number,
    outgoungRtpSessions?: number,
    transports?: number,
    receivingBitrate?: number,
    sendingBitrate?: number,
}

export function onMetricsUpdated(listener: (metrics: MonitoredMetrics) => void) {
    emitter.on(METRICS_UPDATED_EVENT_NAME, listener)
}

export function offMetricsUpdated(listener: (metrics: MonitoredMetrics) => void) {
    emitter.off(METRICS_UPDATED_EVENT_NAME, listener);
}

export const statsCollector = MediasoupCollector.create();
monitor.addStatsCollector(statsCollector);

export function connect(config: SenderConfig) {
    monitor.connect(config);
}

const traces = new Map();
let lastCheck = Date.now();
monitor.events.onStatsCollected(() => {
    const storage = monitor.storage;
    const metrics: MonitoredMetrics = {};
    metrics.audioConsumer = storage.getNumberOfAudioSinks();
    metrics.audioProducers = storage.getNumberOfAudioStreams();
    metrics.videoConsumers = storage.getNumberOfVideoSinks();
    metrics.videoProducers = storage.getNumberOfVideoStreams();
    metrics.incomingRtpSessions = storage.getNumberOfInboundRtpPads();
    metrics.outgoungRtpSessions = storage.getNumberOfOutboundRtpPads();
    metrics.transports = storage.getNumberOfTransports();

    // calculate total amount of bytes recieved
    let totalReceivedBytes = 0;
    for (const sfuInboundRtpPadEntry of storage.inboundRtpPads()) {
        const { bytesReceived } = sfuInboundRtpPadEntry.stats;
        if (!bytesReceived) continue;
        const prevBytesReceived = traces.get(sfuInboundRtpPadEntry.id) || 0;
        totalReceivedBytes += bytesReceived - prevBytesReceived;
        traces.set(sfuInboundRtpPadEntry.id, bytesReceived);
    }

    // calculate total amount of bytes sent
    let totalSentBytes = 0;
    for (const sfuOutboundRtpPadEntry of storage.outboundRtpPads()) {
        const { bytesSent } = sfuOutboundRtpPadEntry.stats;
        if (!bytesSent) continue;
        const prevBytesSent = traces.get(sfuOutboundRtpPadEntry.id) || 0;
        totalSentBytes += bytesSent - prevBytesSent;
        traces.set(sfuOutboundRtpPadEntry.id, bytesSent);
    }

    const now = Date.now();
    const elapsedTimeInS = (now - lastCheck) / 1000;
    
    // calculate receiving bitrate
    metrics.receivingBitrate = (totalReceivedBytes * 8) / elapsedTimeInS;

    // calculate sending bitrate
    metrics.sendingBitrate = (totalSentBytes * 8) / elapsedTimeInS;
    lastCheck = now;

    emitter.emit(METRICS_UPDATED_EVENT_NAME, metrics);
});
