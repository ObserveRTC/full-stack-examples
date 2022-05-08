import * as mediasoup from "mediasoup";
import * as http from 'http';
import { WebSocketServer, WebSocket, EventEmitter } from 'ws';
import { ClientComlink } from "./ClientComlink";
import { Client, ConsumerInfo, ProducerInfo } from "./Client";
import { v4 as uuidv4 } from "uuid";
import { CapabilitiesRequest, CreateProducerRequest, PauseProducerRequest, ResumeProducerRequest, RtpCapabilitiesNotification, SfuStateRequest, TransportConnectedNotification, TransportInfo, TransportInfoRequest } from "./ClientMessageTypes";
import { TransportRole, mediaCodecs } from "./constants";
import * as Monitor from "./Monitor";
import { PipedConsumerInfo, SfuPeer } from "./SfuPeer";

const metrics: Monitor.MonitoredMetrics = {};
Monitor.onMetricsUpdated(updatedMetrics => {
    Object.assign(metrics, updatedMetrics);
});

const ON_SFU_RUN_EVENT_NAME = "sfuRun";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

const url = require('url');

type MediasoupWorker = mediasoup.types.Worker;
type MediasoupRouter = mediasoup.types.Router;

interface Builder {
    setServerIp(value: string): Builder;
    setHostname(value: string): Builder;
    setSfuPeers(...params: [string, string, number][]): Builder;
    setRtcMinPort(value: number): Builder;
    setRtcMaxPort(value: number): Builder;
    setSfuPeerMinPort(value: number): Builder;
    setSfuPeerMaxPort(value: number): Builder;
    setAnnouncedIp(value: string): Builder;
    setPort(value: number): Builder;
    setObserverInternalAddress(value: string): Builder;
    build(): Promise<Server>;
};

const sfuPeerPorts = {
    min: -1,
    max: -1,
    actual: -1,
    getNext: () => {
        if (sfuPeerPorts.min < 0) throw new Error(`SfuPeerPorts min must exists`);
        if (sfuPeerPorts.actual < 0) {
            sfuPeerPorts.actual = sfuPeerPorts.min;
        }
        const result = sfuPeerPorts.actual;
        if (0 < sfuPeerPorts.max && sfuPeerPorts.max < result) {
            throw new Error(`SfuPeer port ${result} is out of given range ${sfuPeerPorts.min} and ${sfuPeerPorts.max}`);
        }
        ++sfuPeerPorts.actual;
        return result;
    },
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
        const sfuPeerAddresses = new Map<string, [string, number]>();
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
            setSfuPeers: (...params: [string, string, number][]) => {
                for (const [peerId, host, port] of params) {
                    sfuPeerAddresses.set(peerId, [host, port]);
                }
                return result;
            },
            setObserverInternalAddress: (value: string) => {
                server._observerInternalAddress = value;
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
            setSfuPeerMinPort: (value: number) => {
                sfuPeerPorts.min = value;
                return result;
            },
            setSfuPeerMaxPort: (value: number) => {
                sfuPeerPorts.max = value;
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
                logger.info("Building Server");
                const worker: MediasoupWorker = await mediasoup.createWorker({
                    rtcMinPort,
                    rtcMaxPort,
                    logLevel: "warn",
                });
                // const worker: MediasoupWorker = await mediasoup.createWorker();
                logger.info("Mediasoup worker is ready");
                const router = await worker.createRouter({
                    mediaCodecs,
                    appData: {},
                });
                logger.info("Mediasoup router is ready");
                logger.info(sfuPeerAddresses);
                for (const [peerId, peerAddress] of sfuPeerAddresses.entries()) {
                    if (server._announcedIp === undefined) {
                        throw new Error(`When SfuPeer is setup announcedIp cannot be null`);
                    }
                    const port = sfuPeerPorts.getNext();
                    const sfuPeer = await SfuPeer.builder()
                        .withPeerAddress(peerAddress)
                        .withRouter(router)
                        .withListeningIp(server._announcedIp, port)
                        .withPeerId(peerId)
                        .withStatsCollector(Monitor.statsCollector)
                        .build();
                    server._sfuPeers.set(sfuPeer.id, sfuPeer);
                }
                logger.info("Mediasoup peers are ready");
                server._router = router;
                server._worker = worker;
                return server;
            },
        };
        return result;
    }
    private _observerInternalAddress?: string;
    private _emitter = new EventEmitter();
    private _serverIp?: string;
    private _announcedIp?: string;
    private _clients = new Map<string, Client>();
    private _hostname?: string;
    private _worker?: MediasoupWorker;
    private _sfuPeers = new Map<string, SfuPeer>();
    private _router?: MediasoupRouter;
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
        this._httpServer = await this._makeHttpServer();
        this._wsServer = await this._makeWsServer(this._httpServer!);
        await new Promise<void>(resolve => {
            this._httpServer!.listen(this._port, () => {
                logger.info(`Listening on ${this._port}`);
                resolve();
            });
        });

        await this._initSfuPeers();

        // -- ObserveRTC integration --
        // connect to observer
        Monitor.connect({
            format: "json",
            rest: {
                closeIfFailed: true,
                maxRetries: 15, // we need to give some try if the docker container spins up later
                urls: [`http://${this._observerInternalAddress}/rest/samples/myService/mediasoup-sfu`],
            }
        });

        this._emitter.emit(ON_SFU_RUN_EVENT_NAME);
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
        if (this._worker) {
            this._worker.close();
            this._worker = undefined;
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
        result.on('request', (request, response) => {
            const parts = request!.url!.split("/");
            const resource = parts.length < 2 ? undefined : parts[1];
            if (resource === "metrics") {
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.end(JSON.stringify(metrics));
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

        const acceptClient = (ws: WebSocket, parameters: any) => {
            let clientId: string | undefined = undefined;
            let userId: string = "unknown";
            try {
                clientId = parameters.clientId;
                userId = parameters.userId;
            } catch(ignored) {
                const message = `something is wrong ${JSON.stringify(ignored, null, 2)}`;
                logger.warn(message);
                ws.close(1008, message);
                return;
            }
            this._initClient(ws, userId, clientId);
        }

        const acceptSfuPeer = (ws: WebSocket, parameters: any) => {
            try {
                const peerId = parameters.peerId;
                if (!peerId) {
                    logger.warn(`No peerId is given`);
                    return;
                }
                const sfuPeer = this._sfuPeers.get(peerId);
                if (!sfuPeer) {
                    logger.warn(`Tried to add a ws connection to a not existing sfuPeer`);
                    return;
                }
                sfuPeer.comlink!.setWebsocket(ws);
            } catch(ignored) {
                const message = `Error while accepting websocket for SfuPeer ${JSON.stringify(ignored, null, 2)}`;
                logger.warn(message);
                ws.close(1008, message);
                return;
            }
        }
        
        wsServer.on('connection', async (ws, req) => {
            // console.warn("\n\n", url.parse(req.url, true).query, "\n\n");
            const query = url.parse(req.url, true).query;
            logger.info(`Websocket connection is requested from ${req.socket.remoteAddress}, query:`, query);
            const sfuPeer = query.sfuPeer !== undefined;
            ws.on("disconnect", () => {
                
            });
            if (sfuPeer) {
                logger.info(`Websocket connection ${ws.url} is requested a peer sfu connection`);
                acceptSfuPeer(ws, query)
            } else {
                logger.info(`Websocket connection ${ws.url} is requested a client connection`);
                acceptClient(ws, query);
            }
            
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

    private async _initClient(ws: WebSocket, userId: string, clientId?: string): Promise<void> {
        clientId = clientId ?? uuidv4();
        let client: Client | undefined = undefined;
        const comlink = await ClientComlink.builder()
            .withWebsocket(ws)
            .onSfuStateRequested((request: SfuStateRequest) => {
                const { requestId } = request;
                comlink.respondSfuState({
                    requestId,
                    state: this._state.toLocaleLowerCase(),
                })
            })
            .onCapabilitiesRequested(async (request: CapabilitiesRequest) => {
                try {
                    const { requestId } = request;
                    const rtpCapabilities = this._router!.rtpCapabilities;
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
                    logger.warn(`Error occurred while processing request:`, request, err);
                }
            })
            .onTransportConnected( async (notification: TransportConnectedNotification) => {
                const { role, dtlsParameters } = notification;
                logger.info(`Transport ${TransportRole.producers} of client ${client?.userId} is connected`);
                if (role === TransportRole.producers) {
                    await client!.connectProducerTransport(dtlsParameters);
                    for (const otherClient of this._clients.values()) {
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
                    logger.warn(`Error occurred while processing request:`, request, err);
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
        client = await Client.builder()
        // client = await call.makeClient(clientId)
            .setClientId(clientId)
            .setUserId(userId)
            .setRouter(this._router!)
            .setStatsCollector(Monitor.statsCollector)
            .onProducerAdded(producerInfo => {
                const { producerId, kind, userId } = producerInfo;
                logger.info(`Producer ${producerId} kind ${kind} for user ${userId} is added, consume message is broadcasted`);
                for (const otherClient of this._clients.values()) {
                    if (otherClient.id === clientId) continue;
                    otherClient.consume(producerInfo).catch(err => {
                        logger.warn(`Error occurred while consuming ${producerId}`, err);
                    });
                }
                const pipedProducerInfo: PipedConsumerInfo = {
                    producerId,
                    kind,
                    appData: {
                        userId,
                        clientId: client!.id,
                    },
                };
                for (const sfuPeer of this._sfuPeers.values()) {
                    logger.info(`Consume producer on SfuPeer ${sfuPeer.peerHost}:${sfuPeer.peerPort}`);
                    sfuPeer.consume(pipedProducerInfo);
                }
            })
            .onProducerRemoved(producerId => {
                for (const sfuPeer of this._sfuPeers.values()) {
                    sfuPeer.closeConsumer(producerId);
                }
            })
            .onConsumerAdded((consumerInfo: ConsumerInfo) => {
                const { id: consumerId, remoteProducerId, kind, rtpParameters, appData } = consumerInfo;
                logger.info(`Consumer at ${client!.userId} for remote client ${appData?.userId} (${appData?.userId}) is added`, consumerId);
                comlink.sendConsumerCreatedNotification({
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
                comlink.sendConsumerClosedNotification({
                    consumerId,
                });
            }).onReceiverTransportReady(() => {
                logger.info(`Receiver Transport for ${client?.userId} is ready`);
                for (const sfuPeer of this._sfuPeers.values()) {
                    for (const producer of sfuPeer.producers()) {
                        const { userId, clientId } = producer.appData;
                        const producerInfo: ProducerInfo = {
                            producerId: producer.id,
                            kind: producer.kind,
                            rtpParameters: producer.rtpParameters,
                            userId,
                            clientId,
                        }
                        logger.info(`Consumer ${producer.kind} for ${producerInfo.userId} from peer ${sfuPeer.peerHost}:${sfuPeer.peerPort} is ready to consume`);
                        client!.consume(producerInfo);
                    }
                }
            })
            .onClosed(() => {
                this._clients.delete(clientId!);
                logger.info(`Client ${clientId!} closed`);
            })
            .build();
        ws.on("disconnect", () => {
            if (client && !client.closed) {
                client!.close();
            }
        });
        
        this._clients.set(clientId!, client);
        logger.info(`Client ${client.id} is added`);
    }

    private async _initSfuPeers(): Promise<void> {
        if (this._sfuPeers.size < 1) {
            return;
        }
        const ongoingConnections: Promise<void>[] = [];
        const pendingConnections = new Map<string, () => void>();
        for (const sfuPeer of this._sfuPeers.values()) {
            sfuPeer.onProducerAdded((pipedProducerInfo) => {
                const { producerId, rtpParameters, kind, appData } = pipedProducerInfo;
                const { userId, clientId } = appData || {};
                logger.info(`Piped Producer is added from peer ${sfuPeer.peerHost}:${sfuPeer.peerPort}. remoteUser: ${userId}, kind: ${kind}`);
                for (const client of this._clients.values()) {
                    const producerInfo: ProducerInfo = {
                        producerId,
                        kind,
                        rtpParameters,
                        userId,
                        clientId,
                    }
                    client.consume(producerInfo);
                }
            }).onProducerRemoved((producerId) => {
                
            }).onConnected(async () => {
                logger.info(`Connection to ${sfuPeer.peerHost}:${sfuPeer.peerPort} has been established`);
                const pendingConnection = pendingConnections.get(sfuPeer.id);
                pendingConnection!();

                // consume all producers from all clients
                const ongoingConsumes: Promise<string>[] = [];
                for (const client of this._clients.values()) {
                    for (const producer of client.producers()) {
                        const consumerInfo: PipedConsumerInfo = {
                            producerId: producer.id,
                            kind: producer.kind,
                            appData: {
                                userId: client.userId,
                                clientId: client.id,
                            }
                        }
                        const ongoingConsume = sfuPeer.consume(consumerInfo);
                        ongoingConsumes.push(ongoingConsume);
                    }
                }
                if (0 < ongoingConsumes.length) {
                    await Promise.all(ongoingConsumes);
                }
            }).onClosed(() => {
                this._sfuPeers.delete(sfuPeer.id);
                const pendingConnection = pendingConnections.get(sfuPeer.id);
                if (pendingConnection) pendingConnection();
            });
            const ongoingConnection = new Promise<void>(resolve => {
                pendingConnections.set(sfuPeer.id, resolve);
            });
            ongoingConnection.then(() => {
                pendingConnections.delete(sfuPeer.id);
            });
            ongoingConnections.push(ongoingConnection);

            // the stagering simplicity of who initiate and owns the connestion between two peers
            if (this._port < sfuPeer.peerPort) {
                const connection = sfuPeer.connect();
                ongoingConnections.push(connection);
            }

        }
        if (0 < ongoingConnections.length) {
            await Promise.all(ongoingConnections);
        }
    }
}