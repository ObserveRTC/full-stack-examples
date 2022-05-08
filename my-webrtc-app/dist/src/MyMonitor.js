var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
import { ClientMonitor } from "@observertc/client-monitor-js";
import { EventEmitter } from "events";
import * as appStore from "./AppStore";
var config = {
    collectingPeriodInMs: 2000,
    samplingPeriodInMs: 10000,
    sendingPeriodInMs: 15000,
    sampler: {
        roomId: appStore.getRoomId(),
        clientId: appStore.getClientId(),
    },
    sender: {
        format: "json",
        websocket: {
            urls: [
                "ws://localhost:7080/samples/myService/my-webrtc-app"
            ],
            maxRetries: 3,
        }
    }
};
export var monitor = ClientMonitor.create(config);
// define the metrics you want to expose
var METRICS_UPDATED = "metricsUpdated";
var emitter = new EventEmitter();
export function onMetricsUpdated(listener) {
    emitter.on(METRICS_UPDATED, listener);
}
export function offMetricsUpdated(listener) {
    emitter.off(METRICS_UPDATED, listener);
}
function emitMetricsUpdated(metrics) {
    emitter.emit(METRICS_UPDATED, metrics);
}
// lets have fun with metrics
var traces = new Map();
monitor.events.onStatsCollected(function () {
    var e_1, _a, e_2, _b;
    var metrics = {
        statsCollectedInMs: monitor.metrics.collectingTimeInMs,
        tracks: new Map(),
    };
    var _loop_1 = function (inboundRtp) {
        var _g = inboundRtp.stats, ssrc = _g.ssrc, bytesReceived = _g.bytesReceived, framesDecoded = _g.framesDecoded, framesReceived = _g.framesReceived, kind = _g.kind;
        var trackId = inboundRtp.getTrackId();
        var traceId = trackId + "-" + ssrc;
        var trace = traces.get(traceId);
        var updateTrace = function () { return traces.set(traceId, {
            bytesReceived: bytesReceived,
            framesDecoded: framesDecoded,
            framesReceived: framesReceived,
            timestamp: Date.now(),
        }); };
        if (!trace) {
            updateTrace();
            return "continue";
        }
        var trackMetrics = metrics.tracks.get(trackId);
        if (!trackMetrics) {
            trackMetrics = {
                layers: new Map(),
            };
            metrics.tracks.set(trackId, trackMetrics);
        }
        var layerMetric = trackMetrics.layers.get(ssrc);
        if (!layerMetric) {
            layerMetric = { ssrc: ssrc, kind: kind };
            trackMetrics.layers.set(ssrc, layerMetric);
        }
        var timeElapsedInMs = Date.now() - trace.timestamp;
        var timeElapsedInS = timeElapsedInMs / 1000.;
        if (kind === "video") {
            layerMetric.decodedFps = Math.ceil((framesDecoded - trace.framesDecoded) / timeElapsedInS);
            layerMetric.receivedFps = Math.ceil((framesReceived - trace.framesReceived) / timeElapsedInS);
        }
        layerMetric.rcvKbps = ((bytesReceived - trace.bytesReceived) * 8) / timeElapsedInMs;
        updateTrace();
    };
    try {
        for (var _c = __values(monitor.storage.inboundRtps()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var inboundRtp = _d.value;
            _loop_1(inboundRtp);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_2 = function (outboundRtp) {
        var _h = outboundRtp.stats, ssrc = _h.ssrc, bytesSent = _h.bytesSent, framesEncoded = _h.framesEncoded, framesSent = _h.framesSent, kind = _h.kind;
        var trackId = outboundRtp.getTrackId();
        var traceId = trackId + "-" + ssrc;
        var trace = traces.get(traceId);
        var updateTrace = function () { return traces.set(traceId, {
            bytesSent: bytesSent,
            framesEncoded: framesEncoded,
            framesSent: framesSent,
            timestamp: Date.now(),
        }); };
        if (!trace) {
            updateTrace();
            return "continue";
        }
        var trackMetrics = metrics.tracks.get(trackId);
        if (!trackMetrics) {
            trackMetrics = {
                layers: new Map(),
            };
            metrics.tracks.set(trackId, trackMetrics);
        }
        var layerMetric = trackMetrics.layers.get(ssrc);
        if (!layerMetric) {
            layerMetric = { ssrc: ssrc, kind: kind };
            trackMetrics.layers.set(ssrc, layerMetric);
        }
        var timeElapsedInMs = Date.now() - trace.timestamp;
        var timeElapsedInS = timeElapsedInMs / 1000.;
        if (kind === "video") {
            layerMetric.encodedFps = Math.ceil((framesEncoded - trace.framesEncoded) / timeElapsedInS);
            layerMetric.sentFps = Math.ceil((framesSent - trace.framesSent) / timeElapsedInS);
        }
        layerMetric.sndKbps = ((bytesSent - trace.bytesSent) * 8) / timeElapsedInMs;
        updateTrace();
    };
    try {
        for (var _e = __values(monitor.storage.outboundRtps()), _f = _e.next(); !_f.done; _f = _e.next()) {
            var outboundRtp = _f.value;
            _loop_2(outboundRtp);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
        }
        finally { if (e_2) throw e_2.error; }
    }
    emitMetricsUpdated(metrics);
});
