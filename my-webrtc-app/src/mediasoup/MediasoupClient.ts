import { MediasoupComlink } from "./MediasoupComlink";
import { v4 as uuidv4 } from "uuid";
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

            // -- ObserveRTC integration --
            // bind the track to the corresponded Sfu stream and sink
            monitor.addTrackRelation({
                trackId: track.id,
                sfuStreamId: remoteProducerId,
                sfuSinkId: consumerId,
            });

            consumers.set(consumer.id, consumer);
            appEvents.emitRemoteMediaTrackAdded({
                track,
                userId,
                clientId: remoteClientId,
            });

            consumer.observer.on("close", () => {
                monitor.removeTrackRelation(track.id);
                consumers.delete(consumer.id);

                // -- ObserveRTC integration --
                // unbind the track to the corresponded Sfu stream and sink
                monitor.removeTrackRelation(track.id);
            });
        })
        .onConsumerRemoved(({ consumerId }) => {
            console.log(`Consumer is closed ${consumerId}`);
            const consumer = consumers.get(consumerId);
            const { clientId, userId } = consumer.appData;
            if (!consumer.closed) {
                consumer.close();
            }
            const track = consumer.track;
            appEvents.emitRemoteMediaTrackRemoved({
                track,
                userId,
                clientId,
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
                userId,
            });
            callback({ id: producerId });
        } catch (err) {
            errback(err);
        }
    });

    // -- ObserveRTC integration --
    // Add stats collector to the monitor
    monitor.addStatsCollector({
        id: uuidv4(),
        label: "sndTransport",
        getStats: sndTransport.getStats.bind(sndTransport),
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

    // -- ObserveRTC integration --
    // Add stats collector to the monitor
    monitor.addStatsCollector({
        id: uuidv4(),
        label: "rcvTransport",
        getStats: rcvTransport.getStats.bind(rcvTransport),
    });
    const localMediaTrackAddedListener = async (message: appEvents.ClientMediaTrackMessage ) => {
        if (!sndTransport) throw new Error(`SenderTransport is not available`);
        const { track, userId } = message;
        const producer = await sndTransport.produce({
            track,
            appData: {
                userId,
            },
        });

        // -- ObserveRTC integration --
        // bind the track to the corresponded Sfu stream
        monitor.addTrackRelation({
            trackId: track.id,
            sfuStreamId: producer.id,
        });

        producer.observer.on("close", () => {
            producers.delete(producer.id);
            appEvents.emitLocalMediaTrackRemoved(track.id);

            // -- ObserveRTC integration --
            // remove binding between the track to the corresponded Sfu stream
            monitor.removeTrackRelation(track.id);
        });
        producers.set(producer.id, producer);
    };
    sndTransport.observer.on("close", () => {
        appEvents.offLocalMediaTrackAdded(localMediaTrackAddedListener);
    });
    appEvents.onLocalMediaTrackAdded(localMediaTrackAddedListener);
}

