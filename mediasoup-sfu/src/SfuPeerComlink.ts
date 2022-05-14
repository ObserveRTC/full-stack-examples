import { EventEmitter, WebSocket } from "ws";
import { ClosePipedProducerNotification, CreatePipedProducerRequest, CreatePipedProducerResponse, MessageTypes, PausePipedProducerNotification, PipedTransportConnected, PipedTransportInfoRequest, PipedTransportInfoResponse, ResumePipedProducerNotification } from "./SfuPeerMessageTypes";
import * as net from "net";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

const ON_CLOSED_EVENT_NAME = "onClosed";
const ON_CONNECTED_EVENT_NAME = "onConnected";

type PipedTransportInfoRequestListener = (request: PipedTransportInfoRequest) => void;
type PipedTransportConnectedListener = (notification: PipedTransportConnected) => void;
type CreatePipedProducerRequestListener = (request: CreatePipedProducerRequest) => void;
type PausePipedProducerListener = (notification: PausePipedProducerNotification) => void;
type ResumePipedProducerListener = (notification: ResumePipedProducerNotification) => void;
type ClosePipedProducerListener = (notification: ClosePipedProducerNotification) => void;

interface Builder {
    onPipedTransportInfoRequested(listener: PipedTransportInfoRequestListener): Builder;
    onPipedTransportConnected(listener: PipedTransportConnectedListener): Builder;
    onCreatePipedProducerRequested(listener: CreatePipedProducerRequestListener): Builder;
    onPipedProducerPaused(listener: PausePipedProducerListener): Builder;
    onPipedProducerResumed(listener: ResumePipedProducerListener): Builder;
    onPipedProducerClosed(listener: ClosePipedProducerListener): Builder;
    onConnected(listener: () => void): Builder;
    onClosed(listener: () => void): Builder;
    build(): SfuPeerComlink;
}

export class SfuPeerComlink {
    public static builder(): Builder {
        const comlink = new SfuPeerComlink();
        const result = {
            onPipedTransportInfoRequested: (listener: PipedTransportInfoRequestListener) => {
                comlink._emitter.on(MessageTypes.PipedTransportInfoRequest, listener);
                return result;
            },
            onPipedTransportConnected: (listener: PipedTransportConnectedListener) => {
                comlink._emitter.on(MessageTypes.PipedTransportConnected, listener);
                return result;
            },
            onCreatePipedProducerRequested: (listener: CreatePipedProducerRequestListener) => {
                comlink._emitter.on(MessageTypes.CreatePipedProducerRequest, listener);
                return result;
            },
            onPipedProducerPaused: (listener: PausePipedProducerListener) => {
                comlink._emitter.on(MessageTypes.PausePipedProducer, listener);
                return result;
            },
            onPipedProducerResumed: (listener: ResumePipedProducerListener) => {
                comlink._emitter.on(MessageTypes.ResumePipedProducer, listener);
                return result;
            },
            onPipedProducerClosed: (listener: ClosePipedProducerListener) => {
                comlink._emitter.on(MessageTypes.ClosePipedProducer, listener);
                return result;
            },
            onConnected: (listener: () => void) => {
                comlink._emitter.once(ON_CONNECTED_EVENT_NAME, listener);
                return result;
            },
            onClosed: (listener: () => void) => {
                comlink._emitter.once(ON_CLOSED_EVENT_NAME, listener);
                return result;
            },
            build: () => {
                return comlink;
            }
        };
        return result;
    }

    private _requests = new Map<string, (data: any) => void>();
    private _ws?: WebSocket;
    private _socket?: net.Socket;
    private _buffer: string[] = [];
    private _closed: boolean = false;
    private _emitter: EventEmitter = new EventEmitter();
    private constructor() {

    }

    public get connected() {
        return this._ws !== undefined;
    }

    public setWebsocket(ws: WebSocket): SfuPeerComlink {
        if (this._ws) {
            throw new Error(`Websocket has already been set`);
        }
        if (this._socket) {
            throw new Error(`Socket has already been set`);
        }
        ws.onmessage = event => {
            this._receive(event.data as string);
        };
        ws.onclose = this.close.bind(this);
        logger.info(`Websocket connection is added to comlink, connection with ${ws.url} is established`);
        this._ws = ws;
        if (0 < this._buffer.length) {
            for (const message of this._buffer) {
                this._ws.send(message);
            }
            this._buffer = [];
        }
        this._emitter.emit(ON_CONNECTED_EVENT_NAME);
        return this;
    }

    public setSocket(socket: net.Socket) {
        if (this._ws) {
            throw new Error(`Websocket has already been set`);
        }
        if (this._socket) {
            throw new Error(`Socket has already been set`);
        }
        socket.on("data", msg => {
            if (typeof msg !== "string") return;
            this._receive(msg);
        });
        socket.once("close", this.close.bind(this));
        logger.info(`Socket connection is added to comlink, connection with ${socket.remoteAddress}:${socket.remotePort} is established`);

        this._socket = socket;
        if (0 < this._buffer.length) {
            for (const message of this._buffer) {
                this._socket.write(message);
            }
            this._buffer = [];
        }
        this._emitter.emit(ON_CONNECTED_EVENT_NAME);
        return this;
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
        const { requestId, messageType, payload }: { requestId?: string, messageType?: string, payload: any } = message;
        if (requestId) {
            const request = this._requests.get(requestId);
            if (request) {
                delete payload.requestId;
                request(payload);
            } else {
                logger.warn(`Did not find request with id: ${requestId}`);
            }
            return;
        }
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

    public async requestPipedTransportInfo(payload: PipedTransportInfoRequest): Promise<PipedTransportInfoResponse> {
        const message: string = JSON.stringify({
            messageType: MessageTypes.PipedTransportInfoRequest,
            payload,
        });
        const response = await this._request<PipedTransportInfoResponse>(payload.requestId, message);
        return response;
    }

    public async requestCreatePipedProducer(payload: CreatePipedProducerRequest): Promise<CreatePipedProducerResponse> {
        const message: string = JSON.stringify({
            messageType: MessageTypes.CreatePipedProducerRequest,
            payload,
        });
        const response = await this._request<CreatePipedProducerResponse>(payload.requestId, message);
        return response;
    }

    public sendResumePipedProducer(payload: ResumePipedProducerNotification): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.ResumePipedProducer,
            payload,
        });
        this._send(message);
    }

    public sendPausePipedProducer(payload: PausePipedProducerNotification): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.PausePipedProducer,
            payload,
        });
        this._send(message);
    }

    public sendClosePipedProducer(payload: ClosePipedProducerNotification): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.ClosePipedProducer,
            payload,
        });
        this._send(message);
    }

    public sendPipedTransportConnected(): void {
        const message: string = JSON.stringify({
            messageType: MessageTypes.PipedTransportConnected,
        });
        this._send(message);
    }

    public respondCreatePipedProducerRequest(payload: CreatePipedProducerResponse) {
        const message: string = JSON.stringify({
            requestId: payload.requestId,
            messageType: MessageTypes.CreatePipedProducerResponse,
            payload,
        });
        this._send(message);
    }

    public respondPipedTransportInfoRequest(payload: PipedTransportInfoResponse): void {
        const message: string = JSON.stringify({
            requestId: payload.requestId,
            messageType: MessageTypes.PipedTransportInfoResponse,
            payload,
        });
        this._send(message);
    }

    get closed() {
        return this._closed;
    }

    public async close(): Promise<void> {
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

    private async _request<T>(requestId: string, message: string): Promise<T> {
        const request = new Promise<T>(forward => {
            const resolve = (response: T) => {
                this._requests.delete(requestId);
                forward(response)
            };
            this._requests.set(requestId, resolve);
            this._send(message);
        });
        return request;
    }

    private _send(message: string) {
        if (!this._ws && !this._socket) {
            this._buffer.push(message);
            return;
        }
        if (this._ws) {
            this._ws.send(message);
        }
        if (this._socket) {
            this._socket.write(message);
        }
    }
}