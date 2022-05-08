import * as mediasoup from "mediasoup";
import { EventEmitter } from "ws";
import { SfuPeerComlink } from "./SfuPeerComlink";
import { v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";
import { MediasoupCollector } from "@observertc/sfu-monitor-js";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

type MediasoupPipeTransport = mediasoup.types.PipeTransport;
type MediasoupRouter = mediasoup.types.Router;
type Consumer = mediasoup.types.Consumer;
type Producer = mediasoup.types.Producer;
type ProducerOptions = mediasoup.types.ProducerOptions;
type ConsumerOptions = mediasoup.types.ConsumerOptions;

export type PipedConsumerInfo = {
    producerId: string,
    kind: mediasoup.types.MediaKind, 
    appData: any,
};

export type PipedProducerInfo = {
    producerId: string,
    rtpParameters: mediasoup.types.RtpParameters,
    kind: mediasoup.types.MediaKind, 
    appData: any,
};

const ON_CONNECTED_EVENT_NAME = "ON_CONNECTED_EVENT_NAME";
const ON_CLOSED_EVENT_NAME = "ON_CLOSED_EVENT_NAME";
const ON_PRODUCER_ADDED_EVENT_NAME = "ON_PRODUCER_ADDED_EVENT_NAME";
const ON_PRODUCER_REMOVED_EVENT_NAME = "ON_PRODUCER_REMOVED_EVENT_NAME";

interface Builder {
    withPeerId(sfuId: string): Builder;
    withRouter(router: MediasoupRouter): Builder;
    withPeerAddress([host, port]: [string, number]): Builder;
    withListeningIp(listenIp: string, port: number): Builder;
    withStatsCollector(value: MediasoupCollector): Builder;
    build(): Promise<SfuPeer>;
}

export class SfuPeer {
    public static builder(): Builder {
        let statsCollector: MediasoupCollector | undefined;
        const sfuPeer = new SfuPeer();
        const result = {
            withPeerId: (value: string) => {
                sfuPeer._peerId = value;
                return result;
            },
            withRouter: (router: MediasoupRouter) => {
                sfuPeer._router = router;
                return result;
            },
            withPeerAddress: (peerAddress: [string, number]) => {
                sfuPeer._peerAddress = peerAddress;
                return result;
            },
            withListeningIp: (listenIp: string, port?: number) => {
                sfuPeer._listenIp = listenIp;
                sfuPeer._port = port;
                return result;
            },
            withStatsCollector: (collector: MediasoupCollector) => {
                statsCollector = collector;
                return result;
            },
            build: async () => {
                if (!sfuPeer._peerAddress) throw new Error(`Cannot create an SfuPeer without a peer address`);
                if (!sfuPeer._peerId) throw new Error(`Cannot create an SfuPeer without an id`);
                if (!sfuPeer._router) throw new Error(`Cannot create an SfuPeer without a router`);
                if (!statsCollector) throw new Error(`StatsCollector is required`);
                sfuPeer._transport = await sfuPeer._router.createPipeTransport({
                    listenIp: sfuPeer._listenIp!,
                    port: sfuPeer._port!,
                });

                // --- ObserveRTC integration ---
                statsCollector.watchPipeTransport(sfuPeer._transport, {
                    pollStats: true,
                });
                logger.info(`SfuPeer has been built for ${sfuPeer.peerHost}:${sfuPeer.peerPort} is built`);
                return sfuPeer;
            },
        };
        return result;
    }

    private _closed = false;
    private _listenIp?: string;
    private _port?: number;
    private _consumers: Map<string, Consumer> = new Map();
    private _producers: Map<string, Producer> = new Map();
    private _router?: MediasoupRouter;
    private _peerAddress?: [string, number];
    private _peerId?: string;
    private _transport?: MediasoupPipeTransport;
    public readonly comlink: SfuPeerComlink;
    private _emitter = new EventEmitter();
    private constructor() {
        this.comlink = SfuPeerComlink.builder()
            .onPipedTransportInfoRequested((request) => {
                const { requestId } = request;
                this.comlink.respondPipedTransportInfoRequest({
                    requestId,
                    ip: this._listenIp!,
                    port: this._port!,
                });
            })
            .onPipedTransportConnected(() => {
                // triggered when a remote peer created a piped consumer for the transport this comlink controls
                this._emitter.emit(ON_CONNECTED_EVENT_NAME);
            })
            .onCreatePipedProducerRequested(async (request) => {
                const { requestId, rtpParameters, producerId, appData, kind } = request;
                logger.info(`Request to create piped producer`);
                // trigger other endpoint to connect to this pipe
                await this.produce({
                    id: producerId,
                    rtpParameters,
                    kind,
                    appData
                });
                this.comlink.respondCreatePipedProducerRequest({
                    requestId,
                });
            })
            .onPipedProducerPaused((notification) => {
                const { producerId } = notification;
                const producer = this._producers.get(producerId);
                if (!producer) {
                    logger.warn(`Piped Producer ${producerId} has not found`);
                    return;
                }
                producer.pause();
            })
            .onPipedProducerResumed((notification) => {
                const { producerId } = notification;
                const producer = this._producers.get(producerId);
                if (!producer) {
                    logger.warn(`Piped Producer ${producerId} has not found`);
                    return;
                }
                producer.resume();
            })
            .onPipedProducerClosed((notification) => {
                const { producerId } = notification;
                const producer = this._producers.get(producerId);
                if (!producer) {
                    logger.warn(`Piped Producer ${producerId} has not found`);
                    return;
                }
                if (!producer.closed) {
                    producer.close();
                }
            })
            .onConnected(async () => {
                const transportInfo = await this.comlink.requestPipedTransportInfo({
                    requestId: uuidv4(),
                });
                await this._transport!.connect(transportInfo);
                this.comlink.sendPipedTransportConnected();
            })
            .onClosed(() => {
                if (!this._closed) {
                    this.close();
                }
            })
            .build();
    }

    public async connect(tried = 0): Promise<void> {
        const peerHost = this._peerAddress![0];
        const peerPort = this._peerAddress![1];
        const address = `ws://${peerHost}:${peerPort}?sfuPeer&peerId=${this._peerId}`;
        if (this.comlink.connected) {
            // logger.info(`Connection to ${address}  has been established`);
            return;
        }
        logger.info(`Connecting to ${address}. Tried: ${tried}`);
        const ws = new WebSocket(address);
        if (ws.readyState === WebSocket.OPEN) {
            this.comlink.setWebsocket(ws);
            return;
        }
        ws.onopen = () => {
            if (!this.comlink.connected) {
                this.comlink.setWebsocket(ws);
            }
        };
        ws.onerror = () => {
            if (5 < tried) {
                logger.error(`Cannot connect to sfupeer ${address}`);
                this.close();
                return;
            }
            const timeoutInMs = Math.random() * 10000 + 2000;
            logger.warn(`Unsuccessful connection establishment: ${address}. Tried: ${tried}. Next try in ${timeoutInMs}ms`);
            setTimeout(() => {
                this.connect(tried + 1);
            }, timeoutInMs);
        };
        return new Promise(resolve => {
            this._emitter.once(ON_CONNECTED_EVENT_NAME, resolve);
        })
    }

    public *producers(): Generator<Producer, any, undefined> {
        const producers = Array.from(this._producers.values());
        for (const producer of producers) {
            yield producer;
        }
    }

    public onConnected(listener: () => void): SfuPeer {
        this._emitter.once(ON_CONNECTED_EVENT_NAME, listener);
        return this;
    }

    public onProducerAdded(listener: (producerInfo: PipedProducerInfo) => void): SfuPeer {
        this._emitter.on(ON_PRODUCER_ADDED_EVENT_NAME, listener);
        return this;
    }

    public onProducerRemoved(listener: (producerId: string) => void): SfuPeer {
        this._emitter.on(ON_PRODUCER_REMOVED_EVENT_NAME, listener);
        return this;
    }

    public onClosed(listener: () => void): SfuPeer {
        this._emitter.on(ON_CLOSED_EVENT_NAME, listener);
        return this;
    }

    private async produce(options: ProducerOptions) {
        const { id, appData } = options;
        const producer = await this._transport!.produce(options)
        const producerId = producer.id;
        producer.observer.on("close", () => {
            this._producers.delete(producerId!);
        });
        this._producers.set(producerId, producer);
        const producerInfo: PipedProducerInfo = {
            producerId,
            rtpParameters: producer.rtpParameters,
            kind: producer.kind,
            appData,
        };
        const { userId } = appData || {};
        logger.info(`Piped Producer is created for ${userId}. Kind: ${producer.kind}. paused: ${producer.paused}`);
        this._emitter.emit(ON_PRODUCER_ADDED_EVENT_NAME, producerInfo);
    }

    public hasProducer(producerId: string) {
        return this._producers.has(producerId);
    }

    public isConsumed(producerId: string) {
        for (const consumer of this._consumers.values()) {
            if (consumer.producerId === producerId) return true;
        }
        return false;
    }

    public async consume(consumerInfo: PipedConsumerInfo): Promise<string> {
        const { producerId, kind, appData } = consumerInfo;
        if (this._producers.has(producerId)) {
            throw new Error(`Attempted to consume the client own produced stream`);
        }
        for (const consumer of this._consumers.values()) {
            if (consumer.producerId === producerId) {
                throw new Error(`Producer ${producerId} is already been consumed`);
            }
        }
        const consumer = await this._transport!.consume({
            producerId,
            appData,
        });
        const { userId } = appData || {};
        logger.info(`Consumer for remote user ${userId}, kind: ${consumerInfo.kind} is created. paused: ${consumer.paused}`);
        await this.comlink.requestCreatePipedProducer({
            requestId: uuidv4(),
            producerId,
            kind,
            rtpParameters: consumer.rtpParameters,
            appData,
        })
        const consumerId = consumer.id;
        consumer.observer.on("close", () => {
            this._consumers.delete(consumerId);
            this.comlink.sendClosePipedProducer({
                producerId,
            })
        });
        this._consumers.set(consumerId, consumer);
        return consumerId;
    }

    closeConsumer(producerId: string) {
        for (const consumer of this._consumers.values()) {
            if (consumer.producerId !== producerId) continue;
            if (consumer.closed) continue;
            consumer.close();
        }
    }

    public async close() {
        if (this._closed) {
            logger.warn(`Attempted to close twice`);
            return;
        }
        this._closed = true;
        if (!this.comlink.closed) {
            await this.comlink.close();
        }
        if (this._transport && !this._transport.closed) {
            this._transport.close();
        }
        for (const producer of this._producers.values()) {
            if (producer.closed) continue;
            producer.close();
        }
        for (const consumer of this._consumers.values()) {
            if (consumer.closed) continue;
            consumer.close();
        }
        logger.info(`${this._peerAddress} Closed`);
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }

    public get closed() {
        return this._closed;
    }

    public get id(): string {
        return this._peerId!;
    }

    public get peerPort(): number {
        return this._peerAddress![1];
    }

    public get peerHost(): string {
        return this._peerAddress![0];
    }
}