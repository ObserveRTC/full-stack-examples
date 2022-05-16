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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ClientMonitor } from "@observertc/client-monitor-js";
import { EventEmitter } from "events";
import * as appStore from "./AppStore";
var config = {
    collectingPeriodInMs: 2000,
    samplingPeriodInMs: 10000,
    sendingPeriodInMs: appStore.getSamplingPeriodInMs(),
    sampler: {
        roomId: appStore.getRoomId(),
        clientId: appStore.getClientId(),
        userId: appStore.getUserId(),
    },
    sender: {
        // format: "json",
        format: "protobuf",
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
monitor.events.onStatsCollected(function () {
    var e_1, _a;
    var storage = monitor.storage;
    try {
        for (var _b = __values(storage.peerConnections()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var peerConnection = _c.value;
            var stats = peerConnection.stats;
            console.log(peerConnection.id, "stats:", stats);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
monitor.events.onSampleCreated(function (sample) {
    console.log("Sample is creacted", sample);
});
monitor.events.onSampleSent(function () {
    console.log("Samplea are sent to the observer");
});
// lets have fun with metrics
var traces = new Map();
monitor.events.onStatsCollected(function () {
    var e_2, _a, e_3, _b, e_4, _c;
    var peerConnectionRtts = new Map();
    var metrics = {
        peerConnections: new Map(),
        statsCollectedInMs: monitor.metrics.collectingTimeInMs,
        tracks: new Map(),
    };
    var _loop_1 = function (inboundRtp) {
        var _k = inboundRtp.stats, ssrc = _k.ssrc, bytesReceived = _k.bytesReceived, framesDecoded = _k.framesDecoded, framesReceived = _k.framesReceived, kind = _k.kind;
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
        for (var _d = __values(monitor.storage.inboundRtps()), _e = _d.next(); !_e.done; _e = _d.next()) {
            var inboundRtp = _e.value;
            _loop_1(inboundRtp);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var _loop_2 = function (outboundRtp) {
        var _l = outboundRtp.stats, ssrc = _l.ssrc, bytesSent = _l.bytesSent, framesEncoded = _l.framesEncoded, framesSent = _l.framesSent, kind = _l.kind;
        var trackId = outboundRtp.getTrackId();
        var traceId = trackId + "-" + ssrc;
        var trace = traces.get(traceId);
        var remoteInboundRtp = outboundRtp.getRemoteInboundRtp();
        var peerConnection = outboundRtp.getPeerConnection();
        if (remoteInboundRtp && peerConnection) {
            var roundTripTime = (remoteInboundRtp.stats || {}).roundTripTime;
            if (roundTripTime) {
                var rtts = peerConnectionRtts.get(peerConnection.collectorId) || [];
                rtts.push(roundTripTime);
                peerConnectionRtts.set(peerConnection.collectorId, rtts);
            }
        }
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
        for (var _f = __values(monitor.storage.outboundRtps()), _g = _f.next(); !_g.done; _g = _f.next()) {
            var outboundRtp = _g.value;
            _loop_2(outboundRtp);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_3) throw e_3.error; }
    }
    var median = function (arr) {
        var middle = Math.floor(arr.length / 2);
        arr = __spreadArray([], __read(arr), false).sort(function (a, b) { return a - b; });
        return arr.length % 2 !== 0 ? arr[middle] : (arr[middle - 1] + arr[middle]) / 2;
    };
    try {
        for (var _h = __values(monitor.storage.peerConnections()), _j = _h.next(); !_j.done; _j = _h.next()) {
            var peerConnection = _j.value;
            var rtts = peerConnectionRtts.get(peerConnection.collectorId);
            var rtt = rtts ? median(rtts) : undefined;
            var peerConnectionId = peerConnection.collectorId;
            var pcMetrics = {
                label: peerConnection.collectorLabel,
                rtt: rtt,
            };
            metrics.peerConnections.set(peerConnectionId, pcMetrics);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
        }
        finally { if (e_4) throw e_4.error; }
    }
    emitMetricsUpdated(metrics);
});
