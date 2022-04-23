export const TransportRole = {
    producers: "producers",
    consumers: "consumers",
}

export const mediaCodecs: any = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
    },
];