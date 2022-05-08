import * as appStore from "./AppStore";
import * as MediasoupClient from "./mediasoup/MediasoupClient";
const clientType = appStore.getClientType();
const roomId = appStore.getRoomId();
const clientId = appStore.getClientId();
const userId = appStore.getUserId();
let initialized = false;
async function initMediasoup(): Promise<void> {
    const sfuAddress = appStore.getSfuAddress();
    const url = `ws://${sfuAddress}?roomId=${roomId}&userId=${userId}&clientId=${clientId}`;
    console.log(`SfuAddress: ${sfuAddress}, websocket url: ${url}`);
    await MediasoupClient.create({
        url,
    });
}

export async function init() {
    if (initialized) throw new Error(`Cannot reinitialize`);
    console.log("Initializing", clientType);
    initialized = true;
    switch (clientType) {
        case "mediasoup":
            return await initMediasoup();
        default:
            throw new Error(`Cannot initialize clientType: ${clientType}`);
    }
}