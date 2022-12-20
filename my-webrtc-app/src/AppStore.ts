import { getRandomUserId, userIds } from "./UserIds";
import { v4 as uuidv4 } from "uuid";

export type ClientType = "mediasoup";
let clientType: ClientType | undefined;
let roomId: string | undefined;
let observerHost: string | undefined;
let observerPort: number | undefined;
let sfuAddress: string | undefined;
let samplingPeriodInMs: number | undefined;

const clientId = uuidv4();
const userId = getRandomUserId();

export function getRoomId() {
    if (!roomId) {
        const candidate = document.querySelector("span#roomId");
        if (candidate) {
            roomId = candidate.textContent;
        }
    }
    return roomId;
}

export function getObserverHost() {
    if (!observerHost) {
        const candidate = document.querySelector("span#observerHost");
        if (candidate) {
            observerHost = candidate.textContent;
        }
    }
    return observerHost;
}

export function getObserverPort() {
    if (!observerPort) {
        const candidate = document.querySelector("span#observerPort");
        if (candidate) {
            observerPort = Number.parseInt(candidate.textContent);
        }
    }
    return observerPort;
}

export function getSamplingPeriodInMs() {
    if (!samplingPeriodInMs) {
        const candidate = document.querySelector("span#samplingPeriodInMs");
        if (candidate?.textContent) {
            samplingPeriodInMs = parseInt(candidate.textContent);
        } else {
            samplingPeriodInMs = 15000;
        }
    }
    return samplingPeriodInMs;
}

export function getUserId() {
    return userId;
}

export function getClientId() {
    return clientId;
}

export function getClientType() {
    if (!clientType) {
        const candidate = document.querySelector("span#clientType").textContent.toLocaleLowerCase();
        switch (candidate) {
            case "mediasoup":
                clientType = "mediasoup";
                break;
            default:
                throw new Error(`Cannot recognize sfuType: ${candidate}`);
        }
    }
    return clientType;
}

export function getSfuAddress() {
    if (!sfuAddress) {
        const candidate = document.querySelector("span#sfuAddress");
        if (candidate) {
            sfuAddress = candidate.textContent;
        }
    }
    return sfuAddress;
}