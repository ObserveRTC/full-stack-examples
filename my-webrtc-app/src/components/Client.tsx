import * as React from "react";
import * as appEvents from "../AppEvents";
import * as MyMonitor from "../MyMonitor";
import { v4 as uuidv4 } from "uuid";

export type ClientConfig = {
    id: string,
    userId: string;
    stream: MediaStream;
    muteBtn?: boolean,
    playBtn?: boolean
}

type ClientState = {
    stats: string[],
}

export class Client extends React.Component<ClientConfig, ClientState> {
    private videoRef: React.RefObject<HTMLVideoElement>;
    private muteRef: React.RefObject<HTMLButtonElement>;
    private playRef: React.RefObject<HTMLButtonElement>;
    private metricsUpdatedListener?: MyMonitor.MetricsListener;
    constructor (props: ClientConfig){
        super(props);
        this.videoRef = React.createRef<HTMLVideoElement>();
        this.muteRef = React.createRef<HTMLButtonElement>();
        this.playRef = React.createRef<HTMLButtonElement>();
    }

    componentDidMount() {
        this.videoRef.current.srcObject = this.props.stream;
        this.videoRef.current.play().catch(err => {
            MyMonitor.addUserMediaError(err);
        });
        this.metricsUpdatedListener = metrics => {
            const stats: string[] = [];
            this.props.stream.getTracks().forEach(track => {
                const trackStats = metrics.tracks.get(track.id);
                if (!trackStats) return;
                Array.from(trackStats.layers.values()).forEach(layer => {
                    Object.entries(layer).map(kv => `${kv[0]}: ${kv[1]}`).forEach(line => stats.push(line));
                });
            })
            this.setState({
                ...this.state,
                stats,
            })
        };
        MyMonitor.onMetricsUpdated(this.metricsUpdatedListener);
    }

    componentWillUnmount() {
        if (this.metricsUpdatedListener) {
            MyMonitor.offMetricsUpdated(this.metricsUpdatedListener);
        }
    }

    mute() {
        this.muteRef.current.innerText = "Unmute";
        const track = this.props.stream.getAudioTracks()[0];
        appEvents.emitLocalMediaTrackPaused({
            clientId: this.props.id,
            userId: this.props.userId,
            track,
        });
    }

    unmute() {
        this.muteRef.current.innerText = "Mute";
        const track = this.props.stream.getAudioTracks()[0];
        appEvents.emitLocalMediaTrackPlay({
            clientId: this.props.id,
            userId: this.props.userId,
            track,
        });
    }

    play() {
        this.playRef.current.innerText = "Pause";
        const track = this.props.stream.getVideoTracks()[0];
        appEvents.emitLocalMediaTrackPlay({
            clientId: this.props.id,
            userId: this.props.userId,
            track,
        });
    }

    pause() {
        this.playRef.current.innerText = "Play";
        const track = this.props.stream.getVideoTracks()[0];
        appEvents.emitLocalMediaTrackPaused({
            clientId: this.props.id,
            userId: this.props.userId,
            track,
        });
    }

    render() {
        let muted = false;
        const muteBtnHandler = () => {
            if (muted) {
                muted = false;
                this.unmute();
            }
            else {
                muted = true;
                this.mute();
            }
        }
        let paused = false;
        const pauseBtnHandler = () => {
            if (paused) { 
                paused = false;
                this.play();
            } else {
                paused = true;
                this.pause();
            }
        }
        return (
            <div>
                <h3>Client (clientId: {this.props.id})</h3>
                <h4>UserId: <span id="userId">{this.props.userId}</span></h4>
                <div style={{width: "50%", display: "table-cell" }}>
                    <video ref={this.videoRef} id="localVideo" width="160" height="120" autoPlay playsInline controls={false}></video>
                    <br />
                    {
                        (!!this.props.playBtn) ? <button ref={this.playRef} id="videoController" onClick={pauseBtnHandler}>Pause</button> : <></>
                    }
                    {
                        (!!this.props.muteBtn) ? <button ref={this.muteRef} id="audioController" onClick={muteBtnHandler}>Mute</button> : <></>
                    }    
                </div>
                <div style={{width: "50%", display: "table-cell", padding: 10 }}>
                    {
                        (this.state?.stats) 
                            ? this.state.stats.map(statLine => {
                                return <div key={uuidv4()}>{statLine}</div>
                            }) : <></>
                    }    
                </div>
                <hr />
            </div>
        );
    }
}
