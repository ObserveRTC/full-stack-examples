import mediasoup from "mediasoup";
import { EventEmitter } from "ws";
import { TransportInfo } from "./MessageTypes";
import { MediasoupCollector } from "@observertc/sfu-monitor-js";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

type WebRtcTransport = mediasoup.types.WebRtcTransport;
type Consumer = mediasoup.types.Consumer;
type Producer = mediasoup.types.Producer;
type Router = mediasoup.types.Router;

const ON_PRODUCER_ADDED_EVENT_NAME = "producerAdded";
const ON_PRODUCER_REMOVED_EVENT_NAME = "producerRemoved";
const ON_CONSUMER_ADDED_EVENT_NAME = "consumerAdded";
const ON_CONSUMER_REMOVED_EVENT_NAME = "consumerRemoved";
const ON_CLOSED_EVENT_NAME = "closed";

export type ProducerInfo = {
    producerId: string;
    kind: mediasoup.types.MediaKind;
    userId: string;
    clientId: string;
    rtpParameters: mediasoup.types.RtpParameters;
};

type ProducerAddedEventListener = (producerInfo: ProducerInfo) => void;
type ProducerRemovedEventListener = (producerId: number) => void;

export type ConsumerInfo = {
    id: string,
    remoteProducerId: string,
    rtpParameters: mediasoup.types.RtpParameters, 
    kind: mediasoup.types.MediaKind, 
    appData: any,
};

type ConsumerEventListener = (consumerInfo: ConsumerInfo) => void;
type ConsumerRemovedEventListener = (consumerId: string) => void;

export interface Builder {
    setUserId(value: string): Builder;
    setClientId(value: string): Builder;
    setRouter(value: Router): Builder;
    setStatsCollector(value: MediasoupCollector): Builder;
    onProducerAdded(listener: ProducerAddedEventListener): Builder;
    onProducerRemoved(listener: ProducerRemovedEventListener): Builder;
    onConsumerAdded(listener: ConsumerEventListener): Builder;
    onConsumerRemoved(listener: ConsumerRemovedEventListener): Builder;
    onClosed(listener: () => void): Builder;
    build(): Promise<Client>;
}

export class Client {
    public static builder(): Builder {
        const client = new Client();
        const result = {
            setUserId: (value: string) => {
                client._userId = value;
                return result;
            },
            setClientId: (value: string) => {
                client._clientId = value;
                return result;
            },
            setRouter: (router: Router) => {
                client._router = router;
                return result;
            },
            setStatsCollector: (value: MediasoupCollector) => {
                client._collector = value;
                return result;
            },
            onProducerAdded: (listener: ProducerAddedEventListener) => {
                client._emitter.on(ON_PRODUCER_ADDED_EVENT_NAME, listener);
                return result;
            },
            onProducerRemoved: (listener: ProducerRemovedEventListener) => {
                client._emitter.on(ON_PRODUCER_REMOVED_EVENT_NAME, listener);
                return result;
            },
            onConsumerAdded: (listener: ConsumerEventListener) => {
                client._emitter.on(ON_CONSUMER_ADDED_EVENT_NAME, listener);
                return result;
            },
            onConsumerRemoved: (listener: ConsumerRemovedEventListener) => {
                client._emitter.on(ON_CONSUMER_REMOVED_EVENT_NAME, listener);
                return result;
            },
            onClosed: (listener: () => void) => {
                client._emitter.once(ON_CLOSED_EVENT_NAME, listener);
                return result;
            },
            build: async () => {
                return client;
            }
        };
        return result;
    }
    
    private _collector?: MediasoupCollector;
    private _userId?: string;
    private _emitter: EventEmitter = new EventEmitter();
    private _router?: Router;
    private _rtpCapabilities?: mediasoup.types.RtpCapabilities;
    private _producerTransport?: WebRtcTransport;
    private _consumerTransport?: WebRtcTransport;
    private _consumers: Map<string, Consumer> = new Map();
    private _producers: Map<string, Producer> = new Map();
    private _closed: boolean = false;
    private _clientId?: string;
    private constructor() {

    }

    public get id(): string {
        return this._clientId!;
    }

    public get userId(): string {
        return this._userId!;
    }

    public get closed(): boolean {
        return this._closed;
    }

    public *producers(): Generator<Producer, any, undefined> {
        for (const producer of this._producers.values()) {
            yield producer;
        }
    }

    public set rtpCapabilities(value: mediasoup.types.RtpCapabilities) {
        this._rtpCapabilities = value;
    }

    public async close(): Promise<void> {
        if (this._closed) {
            logger.warn(`Attempted to close client ${this.id} twice`);
            return Promise.resolve();
        }
        this._closed = true;
        logger.info
        for (const producer of this._producers.values()) {
            if (!producer.closed) {
                producer.close();
            }
        }
        for (const consumer of this._consumers.values()) {
            if (!consumer.closed) {
                consumer.close();
            }
        }
        if (this._consumerTransport && !this._consumerTransport.closed) {
            this._consumerTransport.close();
        }
        if (this._producerTransport && !this._producerTransport.closed) {
            this._producerTransport.close();
        }
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }

    public async makeProducerTransport(options: mediasoup.types.WebRtcTransportOptions): Promise<TransportInfo> {
        const transport: WebRtcTransport = await this._makeTransport(options);
        this._producerTransport = transport;

        // -- ObserveRTC integration --
        // add transport to the monitor
        if (this._collector) {
            this._collector.watchWebRtcTransport(transport, {
                pollStats: true,
            });
        }
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }
    }

    public async connectProducerTransport(dtlsParameters: mediasoup.types.DtlsParameters) {
        const transport: WebRtcTransport | undefined = this._producerTransport;
        if (!transport) {
            throw new Error(`No producer transport has been found`);
        }
        await transport.connect({ dtlsParameters });
        logger.debug(`producer transport with id ${transport.id} for client ${this.id} is connected`);
    }

    public async makeConsumerTransport(options: mediasoup.types.WebRtcTransportOptions): Promise<TransportInfo> {
        const transport: WebRtcTransport = await this._makeTransport(options);
        
        // -- ObserveRTC integration --
        // add transport to the monitor
        if (this._collector) {
            this._collector.watchWebRtcTransport(transport, {
                pollStats: true,
            });
        }
        this._consumerTransport = transport;
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }
    }

    public async connectConsumerTransport(dtlsParameters: mediasoup.types.DtlsParameters) {
        const transport: WebRtcTransport | undefined = this._consumerTransport;
        if (!transport) {
            throw new Error(`No consumer transport has been found`);
        }
        await transport.connect({ dtlsParameters });
        logger.debug(`consumer transport with id ${transport.id} for client ${this.id} is connected`);
    }

    public async makeProducer(options: mediasoup.types.ProducerOptions): Promise<string> {
        const appData: any = {
            ...options.appData,
            clientId: this._clientId!,
        };
        const producer: Producer | undefined = await this._producerTransport!.produce({
            ...options,
            appData,
        });
        const producerId = producer.id;
        producer.observer.on("close", () => {
            this._producers.delete(producerId);
            this._emitter.emit(ON_PRODUCER_REMOVED_EVENT_NAME, producerId);
        });
        this._producers.set(producerId, producer);
        this._emitter.emit(ON_PRODUCER_ADDED_EVENT_NAME, {
            producerId,
            rtpParameters: options.rtpParameters,
            kind: options.kind,
            userId: this._userId!,
            clientId: this._clientId!,
        });
        return producerId;
    }

    public async removeProducer(producerId: string): Promise<void> {
        const producer = this._producers.get(producerId);
        if (!producer) {
            logger.warn(`No producer has been found to remove with id ${producerId} in client ${this.id}`);
            return;
        }
        if (producer.closed) {
            logger.warn(`Producer ${producerId} has been already closed.`);
            return;
        }
        producer.close();
    }

    public async resumeProducer(producerId: string): Promise<void> {
        const producer = this._producers.get(producerId);
        if (!producer) {
            logger.warn(`No producer has been found to resume with id ${producerId} in client ${this.id}`);
            return;
        }
        if (producer.closed) {
            logger.warn(`Producer ${producerId} has been already closed.`);
            return;
        }
        if (!producer.paused) {
            logger.warn(`Producer ${producerId} has not been paused, no point to resume.`);
            return;
        }
        producer.resume();
    }

    public async pauseProducer(producerId: string): Promise<void> {
        const producer = this._producers.get(producerId);
        if (!producer) {
            logger.warn(`No producer has been found to pause with id ${producerId} in client ${this.id}`);
            return;
        }
        if (producer.closed) {
            logger.warn(`Producer ${producerId} has been already closed.`);
            return;
        }
        if (producer.paused) {
            logger.warn(`Producer ${producerId} has already been paused.`);
            return;
        }
        producer.pause();
    }

    public async consume(producerInfo: ProducerInfo): Promise<string> {
        const { producerId: remoteProducerId, kind, clientId, userId } = producerInfo;
        if (this._producers.has(remoteProducerId)) {
            throw new Error(`Attempted to consume the client own produced stream`);
        }
        const rtpCapabilities = this._rtpCapabilities!;
        if (!this._router!.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
        })) {
            throw new Error(`Cannot consume producer ${remoteProducerId}. rtpCapabilities: ${rtpCapabilities}`);
        }
        for (const consumer of this._consumers.values()) {
            if (consumer.producerId === remoteProducerId) {
                throw new Error(`Producer ${remoteProducerId} is already been consumed`);
            }
        }
        const consumer = await this._consumerTransport!.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: false,
            appData: {
                clientId,
                userId,
            }
        });
        const consumerId = consumer.id;
        const consumerInfo: ConsumerInfo = {
            id: consumerId,
            remoteProducerId,
            kind,
            rtpParameters: consumer.rtpParameters,
            appData: {
                clientId,
                userId,
            }
        }
        consumer.observer.on("close", () => {
            this._consumers.delete(consumerId);
            this._emitter.emit(ON_CONSUMER_REMOVED_EVENT_NAME, consumerId);
        });
        this._consumers.set(consumerId, consumer);
        this._emitter.emit(ON_CONSUMER_ADDED_EVENT_NAME, consumerInfo);
        return consumerId;
    }

    private async _makeTransport(options: mediasoup.types.WebRtcTransportOptions): Promise<WebRtcTransport> {
        const appData: any = {
            ...options.appData,
            userId: this._userId!,
            clientId: this._clientId!,
        };
        const transport = await this._router!.createWebRtcTransport({
            ...options,
            appData,
        });
        return transport;
    }
}