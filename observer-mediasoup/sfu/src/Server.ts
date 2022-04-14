import * as mediasoup from "mediasoup";
import * as http from 'http';
import * as fs from "fs";
import * as path from "path";
import { Call } from "./Call";
import { WebSocketServer, WebSocket } from 'ws';
import { Comlink } from "./Comlink";
import { Client, ConsumerInfo, ProducerInfo } from "./Client";
import { v4 as uuidv4 } from "uuid";
import { CapabilitiesRequest, CreateProducerRequest, PauseProducerRequest, ResumeProducerRequest, RtpCapabilitiesNotification, TransportConnectedNotification, TransportInfo, TransportInfoRequest } from "./MessageTypes";
import { TransportRole, mediaCodecs } from "./constants";
import { makeRoomHtml } from "./RoomHtml";
import { SfuMonitor, MediasoupCollector } from "@observertc/sfu-monitor-js";

export const monitor = SfuMonitor.create({
    collectingPeriodInMs: 2000,
    samplingPeriodInMs: 10000,
    sendingPeriodInMs: 15000,
    sampler: {
        
    }
});
SfuMonitor.setLogLevel('warn');

const metrics: {
    audioConsumer?: number,
    audioProducers?: number,
    videoConsumers?: number,
    videoProducers?: number,
    incomingRtpSessions?: number,
    outgoungRtpSessions?: number,
    transports?: number,
} = {};

monitor.events.onStatsCollected(() => {
    const storage = monitor.storage;
    metrics.audioConsumer = storage.getNumberOfAudioSinks();
    metrics.audioProducers = storage.getNumberOfAudioStreams();
    metrics.videoConsumers = storage.getNumberOfVideoSinks();
    metrics.videoProducers = storage.getNumberOfVideoStreams();
    metrics.incomingRtpSessions = storage.getNumberOfInboundRtpPads();
    metrics.outgoungRtpSessions = storage.getNumberOfOutboundRtpPads();
    metrics.transports = storage.getNumberOfTransports();
});

const statsCollector = MediasoupCollector.create();
monitor.addStatsCollector(statsCollector);


const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

type MediaosupWorker = mediasoup.types.Worker;

interface Builder {
    setServerIp(value: string): Builder;
    setHostname(value: string): Builder;
    setRtcMinPort(value: number): Builder;
    setRtcMaxPort(value: number): Builder;
    setAnnouncedIp(value: string): Builder;
    setPort(value: number): Builder;
    setObserverInternalAddress(value: string): Builder;
    setObserverExternalAddress(value: string): Builder;
    build(): Promise<Server>;
};

enum State {
    IDLE = "IDLE",
    STARTED = "STARTED",
    RUN = "RUN",
    STOPPED = "STOPPED",
    CLOSED = "CLOSED",
}

export class Server {
    public static builder(): Builder {
        let rtcMinPort: number = 5000
        let rtcMaxPort: number = 5900;
        const server = new Server();
        const result = {
            setServerIp: (value: string) => {
                server._serverIp = value;
                return result;
            },
            setHostname: (value: string) => {
                server._hostname = value;
                return result;
            },
            setObserverInternalAddress: (value: string) => {
                server._observerInternalAddress = value;
                return result;
            },
            setObserverExternalAddress: (value: string) => {
                server._observerExternalAddress = value;
                return result;
            },
            setRtcMinPort: (value: number) => {
                rtcMinPort = value;
                return result;
            },
            setRtcMaxPort: (value: number) => {
                rtcMaxPort = value;
                return result;
            },
            setAnnouncedIp: (value: string) => {
                server._announcedIp = value;
                return result;
            },
            setPort: (value: number) => {
                server._port = value;
                return result;
            },
            build: async () => {
                server._worker = await mediasoup.createWorker({
                    rtcMinPort,
                    rtcMaxPort,
                    logLevel: "debug",
                });
                return server;
            },
        };
        return result;
    }
    private _observerInternalAddress?: string;
    private _observerExternalAddress?: string;
    private _serverIp?: string;
    private _announcedIp?: string;
    private _hostname?: string;
    private _worker?: MediaosupWorker;
    private _calls: Map<string, Call> = new Map();
    private _state: State = State.IDLE;
    private _closed: boolean = false;
    private _port: number = 5959;
    private _httpServer?: http.Server;
    private _wsServer?: WebSocketServer;
    private constructor() {
        
    }

    public async start(): Promise<void> {
        if (this._state !== State.IDLE) {
            logger.warn(`Attempted to start a server in ${this._state} state. It must be in ${State.IDLE} state to perform start.`);
            return;
        }
        this._setState(State.STARTED);
        logger.info(`The server is being started, state is: ${this._state}`);
        try {
            this._httpServer = await this._makeHttpServer();
            this._wsServer = await this._makeWsServer(this._httpServer!);
            await new Promise<void>(resolve => {
                this._httpServer!.listen(this._port, () => {
                    logger.info(`Listening on ${this._port}`);
                    resolve();
                });
            });
        } catch(err) {
            logger.error(`Error occurred while starting`, err);
            if (!this._closed) {
                await this.close();
            }
            this._setState(State.IDLE);
            return;
        }
        monitor.connect({
            rest: {
                closeIfFailed: true,
                maxRetries: 3,
                url: `http://${this._observerInternalAddress}/rest/samples/myService/mediasoup-sfu`,
            }
        })
        this._setState(State.RUN);
    }

    public async stop(): Promise<void> {
        if (this._state !== State.RUN) {
            logger.warn(`Attempted to stop a server in ${this._state} state. It must be in ${State.RUN} state to perform stop.`);
            return;
        }
        this._setState(State.STOPPED);
        if (this._wsServer) {
            await new Promise<void>(resolve => {
                this._wsServer!.close(err => {
                    if (err) {
                        logger.warn(`Error while stopping websocket server`, err);
                    }
                    resolve();
                });
            });
        }
        if (this._httpServer) {
            await new Promise<void>(resolve => {
                this._httpServer!.close(err => {
                    if (err) {
                        logger.warn(`Error while stopping http server server`, err);
                    }
                    resolve();
                });
            });
        }
        this._setState(State.IDLE);
    }

    private _setState(value: State): void {
        const oldState: State = this._state;
        this._state = value;
        logger.info(`State changed from ${oldState} to ${this._state}`);
    }

    public get state() {
        return this._state;
    }
    
    public get closed() {
        return this._state === State.CLOSED;
    }

    public async close(): Promise<void> {
        if (this._closed) {
            logger.warn(`Attempted to close twice`);
            return;
        }
        this._closed = true;
        Array.from(this._calls.values())
            .filter(call => !call.closed)
            .forEach(call => call.close());

        if (this._state === State.STARTED) {
            await new Promise<void>(resolve => {
                let restarted = 0;
                const wait = () => setTimeout(() => {
                    if (this._state !== State.STARTED || 10 < ++restarted) {
                        resolve();
                    } else {
                        wait();
                    }
                }, 200);
            });
        }
        switch (this._state) {
            case State.STARTED:
                // should not be?!
            case State.RUN:
                await this.stop();
            case State.IDLE:
            case State.STOPPED:
            case State.CLOSED:
            default:
                break;
        }
        this._setState(State.CLOSED);
    }

    private async _makeHttpServer(): Promise<http.Server> {
        const result = http.createServer({
                maxHeaderSize: 8192,
                insecureHTTPParser: false,
            }
        );
        const bundledIndexContent = fs.readFileSync(path.resolve(__dirname, `./bundled-index.js`) );;
        result.on('request', (request, response) => {
            const parts = request!.url!.split("/");
            const resource = parts.length < 2 ? undefined : parts[1];
            if (resource === "metrics") {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.end(JSON.stringify(metrics));
                
            } else if (resource === "rooms") {
                const roomId = parts[2];
                const html = makeRoomHtml({
                    roomId,
                    observerAddress: this._observerExternalAddress ?? "notExistingUrl",
                    server: this._hostname!,
                    port: this._port,
                });
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.end(html);
            } else if (resource === "bundledIndexJs") {
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end(bundledIndexContent);
            } else {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({
                    notImplemented: true,
                }));
            }
        });
        return result;
    }

    private async _makeWsServer(httpServer?: http.Server): Promise<WebSocketServer> {
        const wsServer = new WebSocketServer({
            server: httpServer,
        });
        
        wsServer.on('connection', async (ws, req) => {
            logger.debug(`Websocket connection is requested from ${req.socket.remoteAddress}`);
            const parameters = new URL(req.url ?? "ws://localhost", 'ws://localhost').searchParams;
            let roomId: string | null = null;
            let clientId: string | undefined = undefined;
            let userId: string = "undefined";
            try {
                roomId = parameters.get('roomId');
                clientId = parameters.has('clientId') ? parameters.get('clientId')! : undefined;
                userId = parameters.has('userId') ? parameters.get('userId')! : userId;
            } catch(ignored) {
                ws.close(1008, `missing roomId parameter`);
                return;
            }
            this._getCall(roomId!).then<void>(call => {
                this._initClient(ws, call, userId, clientId);
            });
            ws.on("disconnect", () => {
                
            });
        });
        wsServer.on('error', error => {
            logger.warn("Error occurred on websocket server", error);
        });
        wsServer.on('headers', obj => {
            logger.info("Headers on websocket server", obj);
        });
        wsServer.on('close', () => {
            logger.info("Websocket connection is closed");
        });
        return wsServer;
    }

    private async _getCall(roomId: string): Promise<Call> {
        let call: Call | undefined = this._calls.get(roomId);
        if (call) {
            return call;
        }
        const router = await this._worker!.createRouter({
            mediaCodecs,
            appData: {},
        });
        call = await Call.builder()
            .setRouter(router)
            .onClosed(() => {
                this._calls.delete(roomId);
            })
            .onClientClosed(() => {
                if (call && call.activeClientsNum < 1) {
                    if (!call.closed) {
                        call.close();
                    }
                }
            })
            .build();
        this._calls.set(roomId, call);
        logger.info(`Call (${call.id}) is created in room ${roomId}`);
        return call;
    }

    private async _initClient(ws: WebSocket, call: Call, userId: string, clientId?: string): Promise<void> {
        clientId = clientId ?? uuidv4();
        let comlink: Comlink | undefined = undefined;
        let client: Client | undefined = undefined;
        comlink = await Comlink.builder()
            .withWebsocket(ws)
            .onCapabilitiesRequested(async (request: CapabilitiesRequest) => {
                try {
                    const { requestId } = request;
                    const rtpCapabilities = call.capabilities;
                    comlink!.respondCapabilitiesRequest({
                        requestId,
                        rtpCapabilities,
                    })
                } catch (err) {
                    logger.warn(`Error occurred while processing request`, request, err);
                }
            })
            .onTransportInfoRequested(async (request: TransportInfoRequest) => {
                try {
                    const { requestId, role } = request;
                    let transportInfo: TransportInfo | undefined = undefined;
                    const ip: string = this._serverIp!;
                    const announcedIp: string | undefined = this._announcedIp;
                    const transportOptions: mediasoup.types.WebRtcTransportOptions = {
                        listenIps: [{
                            ip,
                            announcedIp,
                        }],
                    };
                    switch (role) {
                        case TransportRole.producers:
                            transportInfo = await client!.makeProducerTransport(transportOptions);
                            logger.info(`Transport info for role ${role}: (transportOptions, transportInfo)`, transportOptions, transportInfo);
                            break;
                        case TransportRole.consumers:
                            transportInfo = await client!.makeConsumerTransport(transportOptions);
                            logger.info(`Transport info for role ${role}: (transportOptions, transportInfo)`, transportOptions, transportInfo);
                            break;
                        default:
                            logger.warn(`Not recognized role for transport ${role}`);
                            return;
                    };
                    comlink!.respondTransportRequest({
                        requestId,
                        ...transportInfo,
                    });
                } catch (err) {
                    logger.warn(`Error occurred while processing request: ${request}`);
                }
            })
            .onTransportConnected( async (notification: TransportConnectedNotification) => {
                const { role, dtlsParameters } = notification;
                if (role === TransportRole.producers) {
                    await client!.connectProducerTransport(dtlsParameters);
                    for (const otherClient of call.activeClients()) {
                        if (otherClient.id === client!.id) continue;
                        for (const producer of otherClient.producers()) {
                            const producerInfo: ProducerInfo = {
                                producerId: producer.id,
                                kind: producer.kind,
                                rtpParameters: producer.rtpParameters,
                                userId: otherClient.userId,
                                clientId: otherClient.id,
                            }
                            client!.consume(producerInfo);
                        }
                        // emit already added producers
                    }
                } else if (role === TransportRole.consumers) {
                    await client!.connectConsumerTransport(dtlsParameters);
                } else {
                    logger.warn(`Not recognized role for transport ${role}`);
                }
            })
            .onCreateProducerRequested(async (request: CreateProducerRequest) => {
                // console.warn(request);
                const { requestId, kind, rtpParameters, userId } = request;
                try {
                    const producerId = await client!.makeProducer({
                        kind,
                        rtpParameters,
                        appData: {
                            userId,
                        }
                    });
                    comlink!.respondCreateProducerRequest({
                        requestId,
                        producerId,
                    });
                } catch (err) {
                    logger.warn(`Error occurred while processing request: ${request}`, err);
                }
            })
            .onPauseProducerRequested(async (request: PauseProducerRequest) => {
                const { requestId, producerId } = request;
                try {
                    await client!.pauseProducer(producerId);
                    comlink!.respondPauseProducerRequest({
                        requestId,
                    });
                } catch (err) {
                    logger.warn(`Error occurred while pausing producer ${producerId}`);
                }
            })
            .onResumeProducerRequested(async (request: ResumeProducerRequest) => {
                const { requestId, producerId } = request;
                try {
                    await client!.resumeProducer(producerId);
                    comlink!.respondResumeProducerRequest({
                        requestId,
                    });
                } catch (err) {
                    logger.warn(`Error occurred while resuming producer ${producerId}`);
                }
            })
            .onRtpCapabilities( async (notification: RtpCapabilitiesNotification) => {
                const { rtpCapabilities } = notification;
                try {
                    client!.rtpCapabilities = rtpCapabilities;
                } catch (err) {
                    logger.warn(`Error occurred while processing rtpcapabilities notification.`, err);
                }
            })
            .onClosed(() => {
                if (client && !client.closed) {
                    client!.close();
                }
            })
            .build();
        client = await call.makeClient(clientId)
            .setUserId(userId)
            .setStatsCollector(statsCollector)
            .onConsumerAdded((consumerInfo: ConsumerInfo ) => {
                const { id: consumerId, remoteProducerId, kind, rtpParameters, appData } = consumerInfo;
                logger.info(`Consumer at ${client!.userId} for remote client ${appData?.userId} (${appData?.userId}) is added`, consumerId);
                comlink!.sendConsumerCreatedNotification({
                    clientId: appData.clientId,
                    consumerId,
                    remoteProducerId, 
                    kind, 
                    rtpParameters, 
                    appData,
                });
            })
            .onConsumerRemoved((consumerId: string) => {
                logger.info(`Consumer ${consumerId} is removed from client ${clientId}`);
                comlink!.sendConsumerClosedNotification({
                    consumerId,
                });
            })
            .build();
        ws.on("disconnect", () => {
            if (client && !client.closed) {
                client!.close();
            }
        })
        logger.info(`Client ${client.id} is added to call ${call.id}`);
    }
}