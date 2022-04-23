import {v4 as uuidv4 } from "uuid";
import mediasoup from "mediasoup";
import EventEmitter from "events";
import { Client, Builder as ClientBuilder, ProducerInfo } from "./Client";

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

const ON_CLOSED_EVENT_NAME = "onClosed";
const ON_CLIENT_CLOSED_EVENT_NAME = "onClientClosed";

type Router = mediasoup.types.Router;

interface Builder {
    setRouter(router: Router): Builder;
    onClosed(listener: () => void): Builder;
    onClientClosed(listener: () => void): Builder;
    build(): Promise<Call>;
}

export class Call {
    public static builder(): Builder {
        const call = new Call();
        const result = {
            setRouter: (router: Router) => {
                call._router = router;
                return result;
            },
            onClosed: (listener: () => void) => {
                call._emitter.once(ON_CLOSED_EVENT_NAME, listener);
                return result;
            },
            onClientClosed: (listener: () => void) => {
                call._emitter.on(ON_CLIENT_CLOSED_EVENT_NAME, listener);
                return result;
            },
            build: async () => {
                return call;
            }
        };
        return result;
    }

    public readonly id: string = uuidv4();
    private _emitter: EventEmitter = new EventEmitter();
    private _created: number = Date.now();
    private _closed: boolean = false;
    private _router?: Router;
    private _clients: Map<string, Client> = new Map();
    private constructor() {

    }

    public makeClient(clientId: string): ClientBuilder {
        const result = Client.builder()
            .setClientId(clientId)
            .setRouter(this._router!)
            .onProducerAdded(async (producerInfo: ProducerInfo) => {
                const { producerId, kind, userId } = producerInfo;
                logger.info(`Producer ${producerId} kind ${kind} for user ${userId} is added, consume message is broadcasted`);
                for (const client of this._clients.values()) {
                    if (client.id === clientId) continue;
                    client.consume(producerInfo).catch(err => {
                        logger.warn(`Error occurred while consuming ${producerId}`, err);
                    });
                }
            })
            .onClosed(() => {
                this._clients.delete(clientId);
                this._emitter.emit(ON_CLIENT_CLOSED_EVENT_NAME);
            });
        const _build = result.build;
        result.build = async () => {
            const client = await _build();
            this._clients.set(client.id, client);
            return client;
        }
        return result;
    }

    public get activeClientsNum(): number {
        return this._clients.size;
    }

    public *activeClients(): Generator<Client, any, undefined> {
        for (const client of this._clients.values()) {
            yield client;
        }
    }

    public get capabilities(): mediasoup.types.RtpCapabilities {
        return this._router!.rtpCapabilities;
    }

    public get created(): number {
        return this._created;
    }

    public get closed(): boolean {
        return this._closed;
    }

    public async close(): Promise<void> {
        if (this._closed) {
            logger.warn(`Attempted to close the call twice`);
            return Promise.resolve();
        }
        this._closed = true;
        logger.info(`Closing call`);
        for (const client of this._clients.values()) {
            if (client.closed) continue;
            try {
                await client.close();
            } catch (err) {
                logger.warn(`Error occurred while closing client ${client.id}`, err);
            }
        }
    }
}