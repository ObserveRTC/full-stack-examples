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
import { MediasoupComlink } from "./MediasoupComlink";
import { v4 as uuidv4 } from "uuid";
import * as appEvents from "../AppEvents";
import * as mediasoup from "mediasoup-client";
import { monitor } from "../MyMonitor";
var comlink;
var rcvTransport;
var sndTransport;
var iceServers = [{
        urls: ['turn:turn.example.com:443?transport=tcp'],
        username: 'example',
        credential: 'example'
    }];
var consumers = new Map();
var producers = new Map();
export function create(config) {
    return __awaiter(this, void 0, void 0, function () {
        var device, routerRtpCapabilities, sndTransportInfo, rcvTransportInfo, localMediaTrackAddedListener;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, MediasoupComlink.builder()
                        .withUrl(config.url)
                        .onConsumerCreated(function (_a) {
                        var remoteClientId = _a.clientId, consumerId = _a.consumerId, remoteProducerId = _a.remoteProducerId, kind = _a.kind, rtpParameters = _a.rtpParameters, appData = _a.appData;
                        return __awaiter(_this, void 0, void 0, function () {
                            var userId, consumer, track;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        console.log("Consumer is received " + consumerId + " from client " + remoteClientId, { remoteClientId: remoteClientId, consumerId: consumerId, remoteProducerId: remoteProducerId, kind: kind, rtpParameters: rtpParameters, appData: appData });
                                        userId = appData.userId;
                                        return [4 /*yield*/, rcvTransport.consume({
                                                id: consumerId,
                                                producerId: remoteProducerId,
                                                kind: kind,
                                                rtpParameters: rtpParameters,
                                                appData: appData,
                                            })];
                                    case 1:
                                        consumer = _b.sent();
                                        track = consumer.track;
                                        // -- ObserveRTC integration --
                                        // bind the track to the corresponded Sfu stream and sink
                                        monitor.addTrackRelation({
                                            trackId: track.id,
                                            sfuStreamId: remoteProducerId,
                                            sfuSinkId: consumerId,
                                        });
                                        consumers.set(consumer.id, consumer);
                                        appEvents.emitRemoteMediaTrackAdded({
                                            track: track,
                                            userId: userId,
                                            clientId: remoteClientId,
                                        });
                                        consumer.observer.on("close", function () {
                                            monitor.removeTrackRelation(track.id);
                                            consumers.delete(consumer.id);
                                            // -- ObserveRTC integration --
                                            // unbind the track to the corresponded Sfu stream and sink
                                            monitor.removeTrackRelation(track.id);
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        });
                    })
                        .onConsumerRemoved(function (_a) {
                        var consumerId = _a.consumerId;
                        console.log("Consumer is closed " + consumerId);
                        var consumer = consumers.get(consumerId);
                        var _b = consumer.appData, clientId = _b.clientId, userId = _b.userId;
                        if (!consumer.closed) {
                            consumer.close();
                        }
                        var track = consumer.track;
                        appEvents.emitRemoteMediaTrackRemoved({
                            track: track,
                            userId: userId,
                            clientId: clientId,
                        });
                    })
                        .build()];
                case 1:
                    comlink = _a.sent();
                    appEvents.onLocalMediaTrackPaused(function (message) { return __awaiter(_this, void 0, void 0, function () {
                        var track, foundProducers, producer, producerId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    track = message.track;
                                    foundProducers = Array.from(producers.values()).filter(function (producer) { return producer.track.id === track.id; });
                                    if (foundProducers.length < 1)
                                        return [2 /*return*/];
                                    producer = foundProducers[0];
                                    producer.pause();
                                    producerId = producer.id;
                                    return [4 /*yield*/, comlink.requestPauseProducer({
                                            producerId: producerId,
                                        })];
                                case 1:
                                    _a.sent();
                                    console.log("Producer " + producerId + " is paused");
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    appEvents.onLocalMediaTrackPlay(function (message) { return __awaiter(_this, void 0, void 0, function () {
                        var track, foundProducers, producer, producerId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    track = message.track;
                                    foundProducers = Array.from(producers.values()).filter(function (producer) { return producer.track.id === track.id; });
                                    if (foundProducers.length < 1)
                                        return [2 /*return*/];
                                    producer = foundProducers[0];
                                    producer.resume();
                                    producerId = producer.id;
                                    return [4 /*yield*/, comlink.requestResumeProducer({
                                            producerId: producerId,
                                        })];
                                case 1:
                                    _a.sent();
                                    console.log("Producer " + producerId + " is resumed");
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                            var isSfuRun, wait;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        isSfuRun = function () { return __awaiter(_this, void 0, void 0, function () {
                                            var state;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, comlink.requestSfuState()];
                                                    case 1:
                                                        state = (_a.sent()).state;
                                                        console.log("SfuState is ", state);
                                                        return [2 /*return*/, state === "run"];
                                                }
                                            });
                                        }); };
                                        return [4 /*yield*/, isSfuRun()];
                                    case 1:
                                        if (_a.sent()) {
                                            resolve();
                                            return [2 /*return*/];
                                        }
                                        wait = function (tried) {
                                            if (tried === void 0) { tried = 0; }
                                            return setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            if (10 < tried) {
                                                                throw new Error("Sfu State is not run.");
                                                            }
                                                            return [4 /*yield*/, isSfuRun()];
                                                        case 1:
                                                            if (_a.sent()) {
                                                                resolve();
                                                                return [2 /*return*/];
                                                            }
                                                            wait(tried + 1);
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); }, 2000);
                                        };
                                        wait();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _a.sent();
                    device = new mediasoup.Device();
                    return [4 /*yield*/, comlink.requestCapabilities()];
                case 3:
                    routerRtpCapabilities = (_a.sent()).rtpCapabilities;
                    console.log("Got routerCapabilities:", routerRtpCapabilities);
                    return [4 /*yield*/, device.load({ routerRtpCapabilities: routerRtpCapabilities })];
                case 4:
                    _a.sent();
                    console.log("Device is loaded", device.loaded, device.rtpCapabilities);
                    comlink.sendRtpCapabilities({
                        rtpCapabilities: device.rtpCapabilities,
                    });
                    return [4 /*yield*/, comlink.requestTransportInfo({
                            role: "producers",
                        })];
                case 5:
                    sndTransportInfo = _a.sent();
                    console.log("sndTransportInfo", sndTransportInfo);
                    sndTransport = device.createSendTransport(__assign(__assign({}, sndTransportInfo), { iceServers: iceServers }));
                    console.log("sndTransport " + sndTransport.id + " is created", sndTransport);
                    sndTransport.on("connect", function (_a, callback, errback) {
                        var dtlsParameters = _a.dtlsParameters;
                        return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, comlink.sendTransportConnectedNotification({
                                            role: "producers",
                                            dtlsParameters: dtlsParameters
                                        })];
                                    case 1:
                                        _b.sent();
                                        callback();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    sndTransport.on("produce", function (_a, callback, errback) {
                        var kind = _a.kind, rtpParameters = _a.rtpParameters, appData = _a.appData;
                        return __awaiter(_this, void 0, void 0, function () {
                            var userId, producerId, err_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        userId = appData.userId;
                                        return [4 /*yield*/, comlink.requestCreateProducer({
                                                kind: kind,
                                                rtpParameters: rtpParameters,
                                                userId: userId,
                                            })];
                                    case 1:
                                        producerId = (_b.sent()).producerId;
                                        callback({ id: producerId });
                                        return [3 /*break*/, 3];
                                    case 2:
                                        err_1 = _b.sent();
                                        errback(err_1);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    // -- ObserveRTC integration --
                    // Add stats collector to the monitor
                    monitor.addStatsCollector({
                        id: uuidv4(),
                        label: "sndTransport",
                        getStats: sndTransport.getStats.bind(sndTransport),
                    });
                    return [4 /*yield*/, comlink.requestTransportInfo({
                            role: "consumers",
                        })];
                case 6:
                    rcvTransportInfo = _a.sent();
                    rcvTransport = device.createRecvTransport(__assign(__assign({}, rcvTransportInfo), { iceServers: iceServers }));
                    console.log("rcvTransport " + rcvTransport.id + " is created", rcvTransport);
                    rcvTransport.on("connect", function (_a, callback, errback) {
                        var dtlsParameters = _a.dtlsParameters;
                        return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, comlink.sendTransportConnectedNotification({
                                            role: "consumers",
                                            dtlsParameters: dtlsParameters
                                        })];
                                    case 1:
                                        _b.sent();
                                        callback();
                                        return [2 /*return*/];
                                }
                            });
                        });
                    });
                    // -- ObserveRTC integration --
                    // Add stats collector to the monitor
                    monitor.addStatsCollector({
                        id: uuidv4(),
                        label: "rcvTransport",
                        getStats: rcvTransport.getStats.bind(rcvTransport),
                    });
                    localMediaTrackAddedListener = function (message) { return __awaiter(_this, void 0, void 0, function () {
                        var track, userId, producer;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!sndTransport)
                                        throw new Error("SenderTransport is not available");
                                    track = message.track, userId = message.userId;
                                    return [4 /*yield*/, sndTransport.produce({
                                            track: track,
                                            appData: {
                                                userId: userId,
                                            },
                                        })];
                                case 1:
                                    producer = _a.sent();
                                    // -- ObserveRTC integration --
                                    // bind the track to the corresponded Sfu stream
                                    monitor.addTrackRelation({
                                        trackId: track.id,
                                        sfuStreamId: producer.id,
                                    });
                                    producer.observer.on("close", function () {
                                        producers.delete(producer.id);
                                        appEvents.emitLocalMediaTrackRemoved(track.id);
                                        // -- ObserveRTC integration --
                                        // remove binding between the track to the corresponded Sfu stream
                                        monitor.removeTrackRelation(track.id);
                                    });
                                    producers.set(producer.id, producer);
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    sndTransport.observer.on("close", function () {
                        appEvents.offLocalMediaTrackAdded(localMediaTrackAddedListener);
                    });
                    appEvents.onLocalMediaTrackAdded(localMediaTrackAddedListener);
                    return [2 /*return*/];
            }
        });
    });
}
