import * as appStore from "./AppStore";
import * as MediasoupClient from "./mediasoup/MediasoupClient";
const clientType = appStore.getClientType();
const roomId = appStore.getRoomId();
const clientId = appStore.getClientId();
const userId = appStore.getUserId();
let initialized = false;
async function initMediasoup(): Promise<void> {
    await MediasoupClient.create({
        url: `ws://localhost:5959?roomId=${roomId}&userId=${userId}&clientId=${clientId}`
    });
}

export async function init() {
    if (initialized) throw new Error(`Cannot reinitialize`);
    initialized = true;
    switch (clientType) {
        case "mediasoup":
            return await initMediasoup();
        default:
            throw new Error(`Cannot initialize clientType: ${clientType}`);
    }
}