import { EventEmitter, WebSocket } from "ws";
import { CapabilitiesRequest, CapabilitiesResponse, ConsumerCreatedNotification, MessageTypes, CreateProducerRequest as CreateProducerRequest, CreateProducerResponse as CreateProducerResponse, RtpCapabilitiesNotification, TransportConnectedNotification, TransportInfoRequest, TransportInfoResponse, PauseProducerRequest, ResumeProducerRequest, PauseProducerResponse, ConsumerClosedNotification } from "./MessageTypes";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

const ON_CLOSED_EVENT_NAME = "onClosed";

type CapabilitiesRequestListener = (request: CapabilitiesRequest) => void;
type CreateProducerRequestListener = (request: CreateProducerRequest) => void;
type TransportRequestListener = (request: TransportInfoRequest) => void;
type TransportConnectedListener = (notification: TransportConnectedNotification) => void;
type RtpCapabilitiesListener = (notification: RtpCapabilitiesNotification) => void;
type PauseProducerRequestListener = (request: PauseProducerRequest) => void;
type ResumeProducerRequestListener = (request: ResumeProducerRequest) => void;
interface Builder {
    withWebsocket(ws: WebSocket): Builder;
    onCapabilitiesRequested(listener: CapabilitiesRequestListener): Builder;
    onCreateProducerRequested(listener: CreateProducerRequestListener): Builder;
    onPauseProducerRequested(listener: PauseProducerRequestListener): Builder;
    onResumeProducerRequested(listener: ResumeProducerRequestListener): Builder;
    onTransportInfoRequested(listener: TransportRequestListener): Builder;
    onTransportConnected(listener: TransportConnectedListener): Builder;
    onRtpCapabilities(listener: RtpCapabilitiesListener): Builder;
    onClosed(listener: () => void): Builder;
    build(): Promise<Comlink>;
}

export class Comlink {
    public static builder(): Builder {
        const comlink = new Comlink();
        const result = {
            withWebsocket: (ws: WebSocket) => {
                ws.onmessage = event => {
                    comlink._receive(event.data as string);
                };
                ws.onclose = comlink.close.bind(comlink);
                comlink._ws = ws;
                return result;
            },
            onCapabilitiesRequested: (listener: CapabilitiesRequestListener) => {
                comlink._emitter.on(MessageTypes.CapabilitiesRequest, listener);
                return result;
            },
            onCreateProducerRequested: (listener: CreateProducerRequestListener) => {
                comlink._emitter.on(MessageTypes.CreateProducerRequest, listener);
                return result;
            },
            onPauseProducerRequested: (listener: PauseProducerRequestListener) => {
                comlink._emitter.on(MessageTypes.PauseProducerRequest, listener);
                return result;
            },
            onResumeProducerRequested: (listener: ResumeProducerRequestListener) => {
                comlink._emitter.on(MessageTypes.ResumeProducerRequest, listener);
                return result;
            },
            onTransportInfoRequested: (listener: TransportRequestListener) => {
                comlink._emitter.on(MessageTypes.TransportInfoRequest, listener);
                return result;
            },
            onTransportConnected: (listener: TransportConnectedListener) => {
                comlink._emitter.on(MessageTypes.TransportConnected, listener);
                return result;
            },
            onRtpCapabilities: (listener: RtpCapabilitiesListener) => {
                comlink._emitter.on(MessageTypes.RtpCapabilities, listener);
                return result;
            },
            onClosed: (listener: () => void) => {
                comlink._emitter.once(ON_CLOSED_EVENT_NAME, listener);
                return result;
            },
            build: async () => {
                return comlink;
            }
        };
        return result;
    }

    private _ws?: WebSocket;
    private _closed: boolean = false;
    private _emitter: EventEmitter = new EventEmitter();
    private constructor() {

    }

    private _receive(data: string): void {
        let message: any | undefined = undefined;
        try {
            message = JSON.parse(data);
        } catch (err) {
            logger.warn(`Cannot parse data ${data}`);
            return;
        }
        logger.debug(`Received message`, message);
        const { messageType, payload }: { messageType?: string, payload: any } = message;
        if (!messageType) {
            logger.warn(`Undefined message type`);
            return;
        }
        if (0 < this._emitter.listenerCount(messageType)) {
            this._emitter.emit(messageType, payload);
            return;
        }
        logger.warn(`Cannot find listener for message type: ${messageType}`);
    }

    public respondCapabilitiesRequest(payload: CapabilitiesResponse): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.CreateProducerResponse,
            payload,
        });
        this._ws!.send(message);
    }

    public respondCreateProducerRequest(payload: CreateProducerResponse): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.CreateProducerResponse,
            payload,
        });
        this._ws!.send(message);
    }

    public respondPauseProducerRequest(payload: PauseProducerResponse): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.CreateProducerResponse,
            payload,
        });
        this._ws!.send(message);
    }

    public respondResumeProducerRequest(payload: PauseProducerResponse): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.CreateProducerResponse,
            payload,
        });
        this._ws!.send(message);
    }

    public respondTransportRequest(payload: TransportInfoResponse): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.TransportInfoResponse,
            payload,
        });
        this._ws!.send(message);
    }

    get closed() {
        return this._closed;
    }

    public sendConsumerCreatedNotification(payload: ConsumerCreatedNotification): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.ConsumerCreated,
            payload,
        });
        this._ws!.send(message);
    }

    public sendConsumerClosedNotification(payload: ConsumerClosedNotification): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.ConsumerRemoved,
            payload,
        });
        this._ws!.send(message);
    }

    async close(): Promise<void> {
        if (this._closed) {
            logger.warn(`Attempted to close comlink twice`);
            return;
        }
        this._closed = true;
        logger.info(`Closing comlink`);
        for (const messageType of Object.values(MessageTypes)) {
            this._emitter.removeAllListeners(messageType);
        }
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }
}