import { MediasoupComlink } from "./MediasoupComlink";
import * as appEvents from "../AppEvents";
import * as mediasoup from "mediasoup-client";
import { monitor } from "../MyMonitor";

let comlink: MediasoupComlink | undefined;
export type MediasoupConfig = {
    url: string,
};

let rcvTransport: mediasoup.types.Transport | undefined;
let sndTransport: mediasoup.types.Transport | undefined;
const iceServers = [{
    urls : ['turn:turn.example.com:443?transport=tcp'],
    // urls: ['stun:stun.l.google.com:19302'],
    username   : 'example',
    credential : 'example'
}];

const consumers = new Map<string, mediasoup.types.Consumer>();
const producers = new Map<string, mediasoup.types.Producer>();

export async function create(config: MediasoupConfig) {
    comlink = await MediasoupComlink.builder()
        .withUrl(config.url)
        .onConsumerCreated(async ({
            clientId: remoteClientId,
            consumerId,
            remoteProducerId,
            kind,
            rtpParameters,
            appData,
        }) => {
            console.log(`Consumer is received ${consumerId} from client ${remoteClientId}`, { remoteClientId,
                consumerId,
                remoteProducerId,
                kind,
                rtpParameters,
                appData});
            const { userId } = appData;
            const consumer = await rcvTransport.consume({
                id: consumerId,
                producerId: remoteProducerId,
                kind,
                rtpParameters,
                appData,
            });
            const track = consumer.track;

            consumers.set(consumer.id, consumer);
            appEvents.emitRemoteMediaTrackAdded({
                track,
                userId,
                clientId: remoteClientId,
            });

            consumer.observer.on("close", () => {
                monitor.removeTrackRelation(track.id);
                consumers.delete(consumer.id);
            });
        })
        .onConsumerRemoved(({ consumerId }) => {
            console.log(`Consumer is closed ${consumerId}`);
            const consumer = consumers.get(consumerId);
            const { clientId, userId }: { clientId?: string, userId?: string} = consumer.appData;
            if (!consumer.closed) {
                consumer.close();
            }
            const track = consumer.track;
            appEvents.emitRemoteMediaTrackRemoved({
                track,
                userId: userId ?? "userId",
                clientId: clientId ?? "clientId",
            });
        })
        .build();
    appEvents.onLocalMediaTrackPaused(async message => {
        const { track } = message;
        const foundProducers = Array.from(producers.values()).filter(producer => producer.track.id === track.id);
        if (foundProducers.length < 1) return;
        const producer = foundProducers[0];
        producer.pause();
        const producerId = producer.id;
        await comlink.requestPauseProducer({
            producerId,
        });
        console.log(`Producer ${producerId} is paused`);
    });
    appEvents.onLocalMediaTrackPlay(async message => {
        const { track } = message;
        const foundProducers = Array.from(producers.values()).filter(producer => producer.track.id === track.id);
        if (foundProducers.length < 1) return;
        const producer = foundProducers[0];
        producer.resume();
        const producerId = producer.id;
        await comlink.requestResumeProducer({
            producerId,
        });
        console.log(`Producer ${producerId} is resumed`);
    });

    await new Promise<void>(async resolve => {
        const isSfuRun = async () => {
            const { state } = await comlink.requestSfuState();
            console.log("SfuState is ", state);
            return state === "run";
        }
        if (await isSfuRun()) {
            resolve();
            return;
        }
        const wait = (tried = 0) => setTimeout(async () => {
            if (10 < tried) {
                throw new Error(`Sfu State is not run.`);
            }
            if (await isSfuRun()) {
                resolve();
                return;
            }
            wait(tried + 1);
        }, 2000);
        wait();
    })

    const device = new mediasoup.Device();
    
    // -- ObserveRTC integration --
    monitor.collectors.addMediasoupDevice(device);
    
    const { rtpCapabilities: routerRtpCapabilities } = await comlink.requestCapabilities();
    console.log(`Got routerCapabilities:`, routerRtpCapabilities);
    await device.load({ routerRtpCapabilities });
    console.log("Device is loaded", device.loaded, device.rtpCapabilities);
    comlink.sendRtpCapabilities({
        rtpCapabilities: device.rtpCapabilities,
    });
    const sndTransportInfo = await comlink.requestTransportInfo({
        role: "producers",
    });
    console.log(`sndTransportInfo`, sndTransportInfo);
    sndTransport = device.createSendTransport({
        ...sndTransportInfo,
        iceServers,
    });
    console.log(`sndTransport ${sndTransport.id} is created`, sndTransport);
    sndTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        await comlink.sendTransportConnectedNotification({
            role: "producers",
            dtlsParameters
        });
        callback();
    });
    sndTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
            const { userId } = appData;
            const { producerId } = await comlink.requestCreateProducer({
                kind,
                rtpParameters,
                userId: typeof userId === "string" ? userId : "userId",
            });
            callback({ id: producerId });
        } catch (err) {
            errback(err);
        }
    });

    const rcvTransportInfo = await comlink.requestTransportInfo({
        role: "consumers",
    })
    rcvTransport = device.createRecvTransport({
        ...rcvTransportInfo,
        iceServers,
    });
    console.log(`rcvTransport ${rcvTransport.id} is created`, rcvTransport);
    rcvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        await comlink.sendTransportConnectedNotification({
            role: "consumers",
            dtlsParameters
        });
        callback();
    });

    // -- ObserveRTC integration IF transports are created BEFORE device is added--
    // const statsCollector = monitor.collectors.addMediasoupDevice(device);
    // statsCollector.addTransport(rcvTransport);
    // statsCollector.addTransport(sndTransport);

    const localMediaTrackAddedListener = async (message: appEvents.ClientMediaTrackMessage ) => {
        if (!sndTransport) throw new Error(`SenderTransport is not available`);
        const { track, userId } = message;
        const producer = await sndTransport.produce({
            track,
            appData: {
                userId,
            },
        });

        producer.observer.on("close", () => {
            producers.delete(producer.id);
            appEvents.emitLocalMediaTrackRemoved(track.id);
        });
        // setInterval(async () => {
        //     const stats = await producer.getStats();
        //     stats.forEach((value, key, parent) => {
        //         console.warn("producer.getStats", value, key, parent);
        //     })
            
        // }, 2000);
        producers.set(producer.id, producer);
    };
    sndTransport.observer.on("close", () => {
        appEvents.offLocalMediaTrackAdded(localMediaTrackAddedListener);
    });
    appEvents.onLocalMediaTrackAdded(localMediaTrackAddedListener);
}

