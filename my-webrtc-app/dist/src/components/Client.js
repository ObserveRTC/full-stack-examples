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
import * as React from "react";
import * as appEvents from "../AppEvents";
import * as MyMonitor from "../MyMonitor";
import { v4 as uuidv4 } from "uuid";
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client(props) {
        var _this = _super.call(this, props) || this;
        _this.videoRef = React.createRef();
        _this.muteRef = React.createRef();
        _this.playRef = React.createRef();
        return _this;
    }
    Client.prototype.componentDidMount = function () {
        var _this = this;
        this.videoRef.current.srcObject = this.props.stream;
        this.videoRef.current.play().catch(function (err) {
            console.warn("video error", err);
            MyMonitor.monitor.addUserMediaError(err);
        });
        this.metricsUpdatedListener = function (metrics) {
            var stats = [];
            _this.props.stream.getTracks().forEach(function (track) {
                var trackStats = metrics.tracks.get(track.id);
                if (!trackStats)
                    return;
                Array.from(trackStats.layers.values()).forEach(function (layer) {
                    Object.entries(layer).map(function (kv) { return kv[0] + ": " + kv[1]; }).forEach(function (line) { return stats.push(line); });
                });
            });
            _this.setState(__assign(__assign({}, _this.state), { stats: stats }));
        };
        MyMonitor.onMetricsUpdated(this.metricsUpdatedListener);
    };
    Client.prototype.componentWillUnmount = function () {
        if (this.metricsUpdatedListener) {
            MyMonitor.offMetricsUpdated(this.metricsUpdatedListener);
        }
    };
    Client.prototype.mute = function () {
        this.muteRef.current.innerText = "Unmute";
        var track = this.props.stream.getAudioTracks()[0];
        appEvents.emitLocalMediaTrackPaused({
            clientId: this.props.id,
            userId: this.props.userId,
            track: track,
        });
    };
    Client.prototype.unmute = function () {
        this.muteRef.current.innerText = "Mute";
        var track = this.props.stream.getAudioTracks()[0];
        appEvents.emitLocalMediaTrackPlay({
            clientId: this.props.id,
            userId: this.props.userId,
            track: track,
        });
    };
    Client.prototype.play = function () {
        this.playRef.current.innerText = "Pause";
        var track = this.props.stream.getVideoTracks()[0];
        appEvents.emitLocalMediaTrackPlay({
            clientId: this.props.id,
            userId: this.props.userId,
            track: track,
        });
    };
    Client.prototype.pause = function () {
        this.playRef.current.innerText = "Play";
        var track = this.props.stream.getVideoTracks()[0];
        appEvents.emitLocalMediaTrackPaused({
            clientId: this.props.id,
            userId: this.props.userId,
            track: track,
        });
    };
    Client.prototype.render = function () {
        var _this = this;
        var _a;
        var muted = false;
        var muteBtnHandler = function () {
            if (muted) {
                muted = false;
                _this.unmute();
            }
            else {
                muted = true;
                _this.mute();
            }
        };
        var paused = false;
        var pauseBtnHandler = function () {
            if (paused) {
                paused = false;
                _this.play();
            }
            else {
                paused = true;
                _this.pause();
            }
        };
        return (React.createElement("div", null,
            React.createElement("h3", null,
                "Client (clientId: ",
                this.props.id,
                ")"),
            React.createElement("h4", null,
                "UserId: ",
                React.createElement("span", { id: "userId" }, this.props.userId)),
            React.createElement("div", { style: { width: "50%", display: "table-cell" } },
                React.createElement("video", { ref: this.videoRef, id: "localVideo", width: "160", height: "120", autoPlay: true, playsInline: true, controls: false }),
                React.createElement("br", null),
                (!!this.props.playBtn) ? React.createElement("button", { ref: this.playRef, id: "videoController", onClick: pauseBtnHandler }, "Pause") : React.createElement(React.Fragment, null),
                (!!this.props.muteBtn) ? React.createElement("button", { ref: this.muteRef, id: "audioController", onClick: muteBtnHandler }, "Mute") : React.createElement(React.Fragment, null)),
            React.createElement("div", { style: { width: "50%", display: "table-cell", padding: 10 } }, ((_a = this.state) === null || _a === void 0 ? void 0 : _a.stats)
                ? this.state.stats.map(function (statLine) {
                    return React.createElement("div", { key: uuidv4() }, statLine);
                }) : React.createElement(React.Fragment, null)),
            React.createElement("hr", null)));
    };
    return Client;
}(React.Component));
export { Client };
