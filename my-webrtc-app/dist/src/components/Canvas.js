var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import * as React from "react";
import * as appEvents from "../AppEvents";
import * as appStore from "../AppStore";
import * as MyMonitor from "../MyMonitor";
import { Client } from "./Client";
import { v4 as uuidv4 } from "uuid";
var Canvas = /** @class */ (function (_super) {
    __extends(Canvas, _super);
    function Canvas(props) {
        return _super.call(this, props) || this;
    }
    Canvas.prototype.componentDidMount = function () {
        var _this = this;
        this.setState({
            peerConnections: [],
            localClient: {
                id: appStore.getClientId(),
                userId: appStore.getUserId(),
                stream: new MediaStream(),
            },
            remoteClients: new Map(),
        });
        this.localClientMediaTrackAddedListener = function (message) {
            var track = message.track;
            var localClient = _this.state.localClient;
            localClient.stream.addTrack(track);
            _this.setState(__assign(__assign({}, _this.state), { localClient: localClient }));
        };
        appEvents.onLocalMediaTrackAdded(this.localClientMediaTrackAddedListener);
        this.localClientMediaTrackRemovedListener = function (message) {
            var track = message.track;
            var localClient = _this.state.localClient;
            localClient.stream.removeTrack(track);
            _this.setState(__assign(__assign({}, _this.state), { localClient: localClient }));
        };
        appEvents.onLocalMediaTrackRemoved(this.localClientMediaTrackRemovedListener);
        this.remoteClientTrackAddedListener = function (message) { return __awaiter(_this, void 0, void 0, function () {
            var remoteClients, track, userId, remoteClientId, remoteClient, stream;
            return __generator(this, function (_a) {
                remoteClients = this.state.remoteClients;
                track = message.track, userId = message.userId, remoteClientId = message.clientId;
                remoteClient = remoteClients.get(remoteClientId);
                if (remoteClient) {
                    remoteClient.stream.addTrack(track);
                    return [2 /*return*/];
                }
                stream = new MediaStream();
                remoteClient = {
                    id: remoteClientId,
                    userId: userId,
                    stream: stream,
                };
                stream.addTrack(track);
                remoteClients.set(remoteClientId, remoteClient);
                this.setState(__assign(__assign({}, this.state), { remoteClients: remoteClients }));
                return [2 /*return*/];
            });
        }); };
        appEvents.onRemoteMediaTrackAdded(this.remoteClientTrackAddedListener);
        this.remoteClientTrackRemovedListener = function (message) {
            var remoteClientId = message.clientId, track = message.track;
            var remoteClients = _this.state.remoteClients;
            var remoteClient = remoteClients.get(remoteClientId);
            if (!remoteClient)
                return;
            remoteClient.stream.removeTrack(track);
            if (0 < remoteClient.stream.getTracks().length)
                return;
            remoteClients.delete(remoteClientId);
            _this.setState(__assign(__assign({}, _this.state), { remoteClients: remoteClients }));
        };
        appEvents.onRemoteMediaTrackRemoved(this.remoteClientTrackRemovedListener);
        this.metricsUpdatedListener = function (metrics) {
            var _a, _b;
            var stats = [];
            (_b = (_a = _this.state) === null || _a === void 0 ? void 0 : _a.localClient) === null || _b === void 0 ? void 0 : _b.stream.getTracks().forEach(function (track) {
                var trackStats = metrics.tracks.get(track.id);
                if (!trackStats)
                    return;
                Array.from(trackStats.layers.values()).forEach(function (layer) {
                    Object.entries(layer).map(function (kv) { return kv[0] + ": " + kv[1]; }).forEach(function (line) { return stats.push(line); });
                });
                stats.push("");
            });
            var peerConnections = [];
            Array.from(metrics.peerConnections.values()).forEach(function (pcMetrics) {
                Object.entries(pcMetrics).filter(function (kv) { return kv[0] !== "label"; }).map(function (kv) { return pcMetrics.label + "." + kv[0] + ": " + kv[1]; }).forEach(function (line) { return peerConnections.push(line); });
            });
            _this.setState(__assign(__assign({}, _this.state), { statsCollectingTimeInMs: metrics.statsCollectedInMs, peerConnections: peerConnections }));
        };
        MyMonitor.onMetricsUpdated(this.metricsUpdatedListener);
    };
    Canvas.prototype.componentWillUnmount = function () {
        if (this.localClientMediaTrackAddedListener) {
            appEvents.offLocalMediaTrackAdded(this.localClientMediaTrackAddedListener);
        }
        if (this.localClientMediaTrackRemovedListener) {
            appEvents.offLocalMediaTrackAdded(this.localClientMediaTrackRemovedListener);
        }
        if (this.remoteClientTrackAddedListener) {
            appEvents.offRemoteMediaTrackAdded(this.remoteClientTrackAddedListener);
        }
        if (this.remoteClientTrackRemovedListener) {
            appEvents.offRemoteMediaTrackRemoved(this.remoteClientTrackRemovedListener);
        }
        if (this.metricsUpdatedListener) {
            MyMonitor.offMetricsUpdated(this.metricsUpdatedListener);
        }
    };
    Canvas.prototype.render = function () {
        var _a, _b, _c, _d;
        return (React.createElement("div", null,
            ((_a = this.state) === null || _a === void 0 ? void 0 : _a.peerConnections)
                ? this.state.peerConnections.map(function (statLine) {
                    return React.createElement("div", { key: uuidv4() }, statLine);
                }) : React.createElement(React.Fragment, null),
            React.createElement("div", null, ((_b = this.state) === null || _b === void 0 ? void 0 : _b.localClient) ? (React.createElement(Client, { id: this.state.localClient.id, stream: this.state.localClient.stream, playBtn: true, userId: this.state.localClient.userId, muteBtn: true })) : React.createElement(React.Fragment, null)),
            React.createElement("section", { id: "remoteClients" }, ((_c = this.state) === null || _c === void 0 ? void 0 : _c.remoteClients)
                ? Array.from(this.state.remoteClients.values()).map(function (remoteClient) {
                    return React.createElement("div", { key: remoteClient.id },
                        React.createElement(Client, { stream: remoteClient.stream, id: remoteClient.id, userId: remoteClient.userId }));
                })
                : React.createElement(React.Fragment, null)),
            ((_d = this.state) === null || _d === void 0 ? void 0 : _d.statsCollectingTimeInMs) ? React.createElement("h3", null,
                "Last Stats collecting time in ms: ",
                React.createElement("span", null, this.state.statsCollectingTimeInMs)) : React.createElement(React.Fragment, null)));
    };
    return Canvas;
}(React.Component));
export { Canvas };
