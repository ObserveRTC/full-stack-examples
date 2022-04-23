import { getRandomUserId, userIds } from "./UserIds";
import { v4 as uuidv4 } from "uuid";

export type ClientType = "mediasoup";
let clientType: ClientType | undefined;
let roomId: string | undefined;
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