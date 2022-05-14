import * as mediasoup from "mediasoup";

export const MessageTypes = {
    CapabilitiesRequest: "CapabilitiesRequest",
    CapabilitiesResponse: "CapabilitiesResponse",
    CreateProducerRequest: "CreateProducerRequest",
    CreateProducerResponse: "CreateProducerResponse",
    PauseProducerRequest: "PauseProducerRequest",
    PauseProducerResponse: "PauseProducerResponse",
    ResumeProducerRequest: "ResumeProducerRequest",
    ResumeProducerResponse: "ResumeProducerResponse",
    TransportInfoRequest: "TransportInfoRequest",
    TransportInfoResponse: "TransportInfoResponse",
    TransportConnected: "TransportConnected",
    ConsumerCreated: "ConsumerCreated",
    ConsumerRemoved: "ConsumerRemoved",
    RtpCapabilities: "RtpCapabilities",
    
    SfuStateRequest: "SfuStateRequest",
    SfuStateResponse: "SfuStateResponse",
}

interface Notification {

}

export interface ConsumerCreatedNotification extends Notification {
    clientId: string,
    consumerId: string,
    remoteProducerId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
    appData: any,
}

export interface ConsumerClosedNotification extends Notification {
    consumerId: string,
}

interface Request {
    requestId: string;
}

interface Response {
    requestId: string;
}

export interface CapabilitiesRequest extends Request {

}

export interface SfuStateRequest extends Request {

}

export interface CreateProducerRequest extends Request {
    kind: mediasoup.types.MediaKind;
    rtpParameters: any;
    userId: string;
}

export interface ResumeProducerRequest extends Request {
    producerId: string;
}

export interface PauseProducerRequest extends Request {
    producerId: string;
}

export interface CapabilitiesResponse extends Response {
    rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface CreateProducerResponse extends Response {
    producerId: string;
}

export interface PauseProducerResponse extends Response {

}

export interface ResumeProducerResponse extends Response {

}

export interface SfuStateResponse extends Response {
    state: string;
}

export interface TransportInfoRequest extends Request {
    role: string;
}

export interface TransportConnectedNotification {
    role: string;
    dtlsParameters: mediasoup.types.DtlsParameters;
}

export interface TransportInfo {
    id: string;
    iceParameters: mediasoup.types.IceParameters;
    iceCandidates: mediasoup.types.IceCandidate[];
    dtlsParameters: mediasoup.types.DtlsParameters;
}

export interface RtpCapabilitiesNotification {
    rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface TransportInfoResponse extends Response, TransportInfo {
    
}
