import * as mediasoup from "mediasoup";

export const MessageTypes = {
    PipedTransportInfoRequest: "PipedTransportInfoRequest",
    PipedTransportInfoResponse: "PipedTransportInfoResponse",
    PipedTransportConnected: "PipedTransportConnected",
    CreatePipedProducerRequest: "CreatePipedProducerRequest",
    CreatePipedProducerResponse: "CreatePipedProducerResponse",
    PausePipedProducer: "PausePipedProducer",
    ResumePipedProducer: "ResumePipedProducer",
    ClosePipedProducer: "ClosePipedProducer",
}

// ---------- Notifications ----------

interface Notification {

}

export interface PipedTransportConnected extends Notification {

}

export interface PausePipedProducerNotification extends Notification {
    producerId: string;
}

export interface ResumePipedProducerNotification extends Notification {
    producerId: string;
}

export interface ClosePipedProducerNotification extends Notification {
    producerId: string,
}

// ---------- Responses ----------

interface Response {
    requestId: string;
}

export interface PipedTransportInfoResponse extends Response {
    ip: string,
    port: number,
}

export interface CreatePipedProducerResponse extends Response {

}

// ---------- Requests ----------

interface Request {
    requestId: string;
}

export interface PipedTransportInfoRequest extends Request {
    
}

export interface CreatePipedProducerRequest extends Request {
    rtpParameters: mediasoup.types.RtpParameters,
    producerId: string,
    appData: any,
    kind: "audio" | "video",
}
