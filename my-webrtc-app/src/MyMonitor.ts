import { ClientMonitor, PcStatsCollector } from "@observertc/client-monitor-js";
import { TrackRelation } from "@observertc/client-monitor-js/lib/Sampler";
import { EventEmitter } from "events";
import * as appStore from "./AppStore";

const config: ClientMonitor.ClientMonitorConfig = {
    collectingPeriodInMs: 2000,
    samplingPeriodInMs: 10000,
    sendingPeriodInMs: 15000,
    sampler: {
        roomId: appStore.getRoomId(),
        clientId: appStore.getClientId(),
    }
}

const monitor = ClientMonitor.create(config);

export function addTrackRelation(trackRelation: TrackRelation) {
    monitor.addTrackRelation(trackRelation);
}

export function removeTrackRelation(trackId: string) {
    monitor.removeTrackRelation(trackId);
}

export function addStatsCollector(collector: PcStatsCollector) {
    monitor.addStatsCollector(collector);
}

export function addUserMediaError(err: any) {
    const message = typeof err === 'string' ? err : JSON.stringify(err);
    monitor.addUserMediaError(message);
}


// define the metrics you want to expose

const METRICS_UPDATED = "metricsUpdated";
const emitter = new EventEmitter();
type TrackLayerMetrics = {
    kind: string,
    ssrc: number,
    encodedFps?: number,
    decodedFps?: number,
    receivedFps?: number,
    sentFps?: number,
    sndKbps?: number,
    rcvKbps?: number,
}
type TrackMetrics = {
    layers: Map<number, TrackLayerMetrics>;
}
export type Metrics = {
    statsCollectedInMs: number,
    tracks: Map<string, TrackMetrics>;
}
export type MetricsListener = (metrics: Metrics) => void;

export function onMetricsUpdated(listener: MetricsListener) {
    emitter.on(METRICS_UPDATED, listener);
}

export function offMetricsUpdated(listener: MetricsListener) {
    emitter.off(METRICS_UPDATED, listener);
}

function emitMetricsUpdated(metrics: Metrics) {
    emitter.emit(METRICS_UPDATED, metrics);
}

// lets have fun with metrics
const traces = new Map<string, any>();
monitor.events.onStatsCollected(() => {
    const metrics: Metrics = {
        statsCollectedInMs: monitor.metrics.collectingTimeInMs,
        tracks: new Map(),
    }
    for (const inboundRtp of monitor.storage.inboundRtps()) {
        const { ssrc, bytesReceived, framesDecoded, framesReceived, kind } = inboundRtp.stats;
        const trackId = inboundRtp.getTrackId();
        const traceId = `${trackId}-${ssrc}`;
        const trace = traces.get(traceId);
        const updateTrace = () => traces.set(traceId, {
            bytesReceived,
            framesDecoded,
            framesReceived,
            timestamp: Date.now(),
        });
        if (!trace) {
            updateTrace();
            continue;
        }
        let trackMetrics = metrics.tracks.get(trackId);
        if (!trackMetrics) {
            trackMetrics = {
                layers: new Map(),
            }
            metrics.tracks.set(trackId, trackMetrics);
        }
        let layerMetric = trackMetrics.layers.get(ssrc);
        if (!layerMetric) {
            layerMetric = { ssrc, kind };
            trackMetrics.layers.set(ssrc, layerMetric);
        }
        const timeElapsedInMs = Date.now() - trace.timestamp;
        const timeElapsedInS = timeElapsedInMs / 1000.;
        if (kind === "video") {
            layerMetric.decodedFps = Math.ceil((framesDecoded - trace.framesDecoded) / timeElapsedInS);
            layerMetric.receivedFps = Math.ceil((framesReceived - trace.framesReceived) / timeElapsedInS);
        }
        layerMetric.rcvKbps = ((bytesReceived - trace.bytesReceived) * 8) / timeElapsedInMs;
        updateTrace();
    }

    for (const outboundRtp of monitor.storage.outboundRtps()) {
        const { ssrc, bytesSent, framesEncoded, framesSent, kind } = outboundRtp.stats;
        const trackId = outboundRtp.getTrackId();
        const traceId = `${trackId}-${ssrc}`;
        const trace = traces.get(traceId);
        const updateTrace = () => traces.set(traceId, {
            bytesSent,
            framesEncoded,
            framesSent,
            timestamp: Date.now(),
        });
        if (!trace) {
            updateTrace();
            continue;
        }
        let trackMetrics = metrics.tracks.get(trackId);
        if (!trackMetrics) {
            trackMetrics = {
                layers: new Map(),
            }
            metrics.tracks.set(trackId, trackMetrics);
        }
        let layerMetric = trackMetrics.layers.get(ssrc);
        if (!layerMetric) {
            layerMetric = { ssrc, kind };
            trackMetrics.layers.set(ssrc, layerMetric);
        }
        const timeElapsedInMs = Date.now() - trace.timestamp;
        const timeElapsedInS = timeElapsedInMs / 1000.;
        if (kind === "video") {
            layerMetric.encodedFps = Math.ceil((framesEncoded - trace.framesEncoded) / timeElapsedInS);
            layerMetric.sentFps = Math.ceil((framesSent - trace.framesSent) / timeElapsedInS);
        }
        layerMetric.sndKbps = ((bytesSent - trace.bytesSent) * 8) / timeElapsedInMs;
        updateTrace();
    }
    emitMetricsUpdated(metrics);
});
