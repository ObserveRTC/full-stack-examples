import * as EventEmitter from "events";
import * as mediasoup from "mediasoup-client";
import { CapabilitiesResponse, ConsumerClosedNotification, ConsumerCreatedNotification, CreateProducerResponse, MessageTypes, PauseProducerResponse, ResumeProducerResponse, SfuStateResponse, TransportInfo, TransportInfoRequest } from "./MediasoupMessageTypes";
import { v4 as uuidv4 } from "uuid";

const ON_CONSUMER_CREATED_EVENT_NAME = "ConsumerCreated";
const ON_CONSUMER_REMOVED_EVENT_NAME = "ConsumerRemoved";

type ConsumerCreatedListener = (message: ConsumerCreatedNotification) => void;
type ConsumerRemovedListener = (message: ConsumerClosedNotification) => void;

interface Builder {
    withUrl(url: string): Builder;
    onConsumerCreated(listener: ConsumerCreatedListener): Builder;
    onConsumerRemoved(listener: ConsumerRemovedListener): Builder;
    build(): Promise<MediasoupComlink>;
}

const sleep = (sleepInMs: number) => new Promise(resolve => {
    setTimeout(resolve, sleepInMs);
})

export class MediasoupComlink {
    static builder(): Builder {
        const connect = (url: string, tried = 0): Promise<WebSocket> => {
            const websocket = new WebSocket(url);
            if (websocket.readyState === WebSocket.OPEN) return Promise.resolve(websocket);
            return new Promise<WebSocket>(resolve => {
                let timer: NodeJS.Timeout | undefined;
                const closedListener = async () => {
                    console.warn(`Websocket connection was not successful, tried: ${tried}`);
                    if (timer) clearTimeout(timer);
                    if (3 < tried) throw new Error(`Cannot connect to ${url}`);
                    await sleep(2000);
                    const nextWs = await connect(url, tried + 1);
                    resolve(nextWs);
                }
                websocket.addEventListener("close", closedListener);
                const check = () => {
                    timer = setTimeout(() => {
                        if (websocket.readyState !== WebSocket.OPEN) {
                            check();
                            return;
                        }
                        websocket.removeEventListener("close", closedListener);
                        resolve(websocket);
                    }, 1000);
                }
                check();
            });
        };
        let _url: string | undefined;
        const comlink = new MediasoupComlink();
        const result = {
            withUrl: (url: string) => {
                _url = url;
                return result;
            },
            onConsumerCreated: (listener: ConsumerCreatedListener) => {
                comlink._emitter.on(ON_CONSUMER_CREATED_EVENT_NAME, listener);
                return result;
            },
            onConsumerRemoved: (listener: ConsumerRemovedListener) => {
                comlink._emitter.on(ON_CONSUMER_REMOVED_EVENT_NAME, listener);
                return result;
            },
            build: async () => {
                if (!_url) throw new Error(`websocket URL must be provided`);
                const ws = await connect(_url);
                ws.onmessage = event => {
                    comlink._receive(event);
                }
                comlink._ws = ws;
                return comlink;
            },
        };
        return result;
    }
    private _requests = new Map<string, (response: any) => void>();
    private _emitter?: EventEmitter;
    private _ws?: WebSocket;
    constructor() {
        this._emitter = new EventEmitter();
        this._requests = new Map();
        this._ws = null;
    }

    requestCapabilities(): Promise<CapabilitiesResponse> {
        return this._sendRequestAndPromise<CapabilitiesResponse>({
            messageType: MessageTypes.CapabilitiesRequest,
            payload: {}
        });
    }

    requestSfuState(): Promise<SfuStateResponse> {
        return this._sendRequestAndPromise<SfuStateResponse>({
            messageType: MessageTypes.SfuStateRequest,
            payload: {},
        })
    }

    requestCreateProducer({ kind, rtpParameters, userId }: { kind: string, rtpParameters: any, userId?: string }): Promise<CreateProducerResponse> {
        return this._sendRequestAndPromise<CreateProducerResponse>({
            messageType: MessageTypes.CreateProducerRequest,
            payload: {
                kind,
                rtpParameters,
                userId,
            }
        });
    }

    requestPauseProducer({ producerId }: { producerId: string }): Promise<PauseProducerResponse> {
        return this._sendRequestAndPromise<PauseProducerResponse>({
            messageType: MessageTypes.PauseProducerRequest,
            payload: {
                producerId,
            }
        });
    }

    requestResumeProducer({ producerId }: { producerId: string }): Promise<ResumeProducerResponse> {
        return this._sendRequestAndPromise<ResumeProducerResponse>({
            messageType: MessageTypes.ResumeProducerRequest,
            payload: {
                producerId,
            }
        });
    }

    sendTransportConnectedNotification({ role, dtlsParameters }: { role: string, dtlsParameters: any }): void {
        this._ws.send(JSON.stringify({
            messageType: MessageTypes.TransportConnected,
            payload: {
                role,
                dtlsParameters,
            }
        }));
    }

    sendRtpCapabilities({ rtpCapabilities }: { rtpCapabilities: any }): void {
        this._ws.send(JSON.stringify({
            messageType: MessageTypes.RtpCapabilities,
            payload: {
                rtpCapabilities,
            }
        }));
    }

    requestTransportInfo({ role }: { role: string }): Promise<TransportInfo> {
        return this._sendRequestAndPromise<TransportInfo>({
            messageType: MessageTypes.TransportInfoRequest,
            payload: {
                role,
            }
        });
    }

    _receive(event: MessageEvent<any>) {
        let message;
        try {
            message = JSON.parse(event.data);
        } catch (err) {
            console.warn(`Cannot parse data ${event.data}`);
            return;
        }
        const { messageType, payload } = message;
        if (!messageType) {
            console.warn(`Undefined message type`);
            return;
        }
        if (0 < this._emitter.listenerCount(messageType)) {
            this._emitter.emit(messageType, payload);
            return;
        }
        if (!payload) {
            console.warn(`Cannot find listener for message type: ${messageType}`);
            return;
        }
        const { requestId, ...values } = payload;
        const resolve = this._requests.get(requestId);
        if (resolve) {
            const response = {...values};
            // console.warn(`resolve request with response`, response);
            resolve(response);
            return;
        }
        console.warn(`Cannot find listener for message type: ${messageType}`);
    }

    _sendRequestAndPromise<T>({ messageType, payload }: { messageType: string, payload: any }): Promise<T> {
        const requestId = uuidv4();
        const message = JSON.stringify({
            messageType,
            payload: {
                requestId,
                ...payload,
            },
        });
        const promise = new Promise<T>(resolve => {
            this._requests.set(requestId, (response) => {
                resolve(response);
            })
        });
        this._ws.send(message);
        return promise;
    }
}