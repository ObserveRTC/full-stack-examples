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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as EventEmitter from "events";
import { MessageTypes } from "./MediasoupMessageTypes";
import { v4 as uuidv4 } from "uuid";
var ON_CONSUMER_CREATED_EVENT_NAME = "ConsumerCreated";
var ON_CONSUMER_REMOVED_EVENT_NAME = "ConsumerRemoved";
var sleep = function (sleepInMs) { return new Promise(function (resolve) {
    setTimeout(resolve, sleepInMs);
}); };
var MediasoupComlink = /** @class */ (function () {
    function MediasoupComlink() {
        this._requests = new Map();
        this._emitter = new EventEmitter();
        this._requests = new Map();
        this._ws = null;
    }
    MediasoupComlink.builder = function () {
        var _this = this;
        var connect = function (url, tried) {
            if (tried === void 0) { tried = 0; }
            var websocket = new WebSocket(url);
            if (websocket.readyState === WebSocket.OPEN)
                return Promise.resolve(websocket);
            return new Promise(function (resolve) {
                var timer;
                var closedListener = function () { return __awaiter(_this, void 0, void 0, function () {
                    var nextWs;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.warn("Websocket connection was not successful, tried: " + tried);
                                if (timer)
                                    clearTimeout(timer);
                                if (3 < tried)
                                    throw new Error("Cannot connect to " + url);
                                return [4 /*yield*/, sleep(2000)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, connect(url, tried + 1)];
                            case 2:
                                nextWs = _a.sent();
                                resolve(nextWs);
                                return [2 /*return*/];
                        }
                    });
                }); };
                websocket.addEventListener("close", closedListener);
                var check = function () {
                    timer = setTimeout(function () {
                        if (websocket.readyState !== WebSocket.OPEN) {
                            check();
                            return;
                        }
                        websocket.removeEventListener("close", closedListener);
                        resolve(websocket);
                    }, 1000);
                };
                check();
            });
        };
        var _url;
        var comlink = new MediasoupComlink();
        var result = {
            withUrl: function (url) {
                _url = url;
                return result;
            },
            onConsumerCreated: function (listener) {
                comlink._emitter.on(ON_CONSUMER_CREATED_EVENT_NAME, listener);
                return result;
            },
            onConsumerRemoved: function (listener) {
                comlink._emitter.on(ON_CONSUMER_REMOVED_EVENT_NAME, listener);
                return result;
            },
            build: function () { return __awaiter(_this, void 0, void 0, function () {
                var ws;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!_url)
                                throw new Error("websocket URL must be provided");
                            return [4 /*yield*/, connect(_url)];
                        case 1:
                            ws = _a.sent();
                            ws.onmessage = function (event) {
                                comlink._receive(event);
                            };
                            comlink._ws = ws;
                            return [2 /*return*/, comlink];
                    }
                });
            }); },
        };
        return result;
    };
    MediasoupComlink.prototype.requestCapabilities = function () {
        return this._sendRequestAndPromise({
            messageType: MessageTypes.CapabilitiesRequest,
            payload: {}
        });
    };
    MediasoupComlink.prototype.requestSfuState = function () {
        return this._sendRequestAndPromise({
            messageType: MessageTypes.SfuStateRequest,
            payload: {},
        });
    };
    MediasoupComlink.prototype.requestCreateProducer = function (_a) {
        var kind = _a.kind, rtpParameters = _a.rtpParameters, userId = _a.userId;
        return this._sendRequestAndPromise({
            messageType: MessageTypes.CreateProducerRequest,
            payload: {
                kind: kind,
                rtpParameters: rtpParameters,
                userId: userId,
            }
        });
    };
    MediasoupComlink.prototype.requestPauseProducer = function (_a) {
        var producerId = _a.producerId;
        return this._sendRequestAndPromise({
            messageType: MessageTypes.PauseProducerRequest,
            payload: {
                producerId: producerId,
            }
        });
    };
    MediasoupComlink.prototype.requestResumeProducer = function (_a) {
        var producerId = _a.producerId;
        return this._sendRequestAndPromise({
            messageType: MessageTypes.ResumeProducerRequest,
            payload: {
                producerId: producerId,
            }
        });
    };
    MediasoupComlink.prototype.sendTransportConnectedNotification = function (_a) {
        var role = _a.role, dtlsParameters = _a.dtlsParameters;
        this._ws.send(JSON.stringify({
            messageType: MessageTypes.TransportConnected,
            payload: {
                role: role,
                dtlsParameters: dtlsParameters,
            }
        }));
    };
    MediasoupComlink.prototype.sendRtpCapabilities = function (_a) {
        var rtpCapabilities = _a.rtpCapabilities;
        this._ws.send(JSON.stringify({
            messageType: MessageTypes.RtpCapabilities,
            payload: {
                rtpCapabilities: rtpCapabilities,
            }
        }));
    };
    MediasoupComlink.prototype.requestTransportInfo = function (_a) {
        var role = _a.role;
        return this._sendRequestAndPromise({
            messageType: MessageTypes.TransportInfoRequest,
            payload: {
                role: role,
            }
        });
    };
    MediasoupComlink.prototype._receive = function (event) {
        var message;
        try {
            message = JSON.parse(event.data);
        }
        catch (err) {
            console.warn("Cannot parse data " + event.data);
            return;
        }
        var messageType = message.messageType, payload = message.payload;
        if (!messageType) {
            console.warn("Undefined message type");
            return;
        }
        if (0 < this._emitter.listenerCount(messageType)) {
            this._emitter.emit(messageType, payload);
            return;
        }
        if (!payload) {
            console.warn("Cannot find listener for message type: " + messageType);
            return;
        }
        var requestId = payload.requestId, values = __rest(payload, ["requestId"]);
        var resolve = this._requests.get(requestId);
        if (resolve) {
            var response = __assign({}, values);
            // console.warn(`resolve request with response`, response);
            resolve(response);
            return;
        }
        console.warn("Cannot find listener for message type: " + messageType);
    };
    MediasoupComlink.prototype._sendRequestAndPromise = function (_a) {
        var _this = this;
        var messageType = _a.messageType, payload = _a.payload;
        var requestId = uuidv4();
        var message = JSON.stringify({
            messageType: messageType,
            payload: __assign({ requestId: requestId }, payload),
        });
        var promise = new Promise(function (resolve) {
            _this._requests.set(requestId, function (response) {
                resolve(response);
            });
        });
        this._ws.send(message);
        return promise;
    };
    return MediasoupComlink;
}());
export { MediasoupComlink };
