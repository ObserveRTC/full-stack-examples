import { EventEmitter } from "events";

const LOCAL_MEDIA_TRACK_IS_ADDED = "localMediaTrackAdded";
const LOCAL_MEDIA_TRACK_IS_REMOVED = "localMediaTrackRemoved";
const LOCAL_MEDIA_TRACK_IS_PAUSED = "localMediaTrackPaused"
const LOCAL_MEDIA_TRACK_IS_PLAY = "localMediaTrackPlay"
const REMOTE_MEDIA_TRACK_IS_ADDED = "remoteMediaTrackAdded";
const REMOTE_MEDIA_TRACK_IS_REMOVED = "remoteMediaTrackRemoved";

const emitter = new EventEmitter();

export type MediaTrackStreamListener = (stream: MediaStream) => void;
export type ClientMediaTrackMessage = { track: MediaStreamTrack, userId: string, clientId: string };
export type MediaTrackAddedListener = (message: ClientMediaTrackMessage) => void;
export type MediaTrackRemovedListener = (message: ClientMediaTrackMessage) => void;

// --------------- local media track added -----
export function onLocalMediaTrackAdded(listener: MediaTrackAddedListener): void {
    emitter.on(LOCAL_MEDIA_TRACK_IS_ADDED, listener);
}

export function offLocalMediaTrackAdded(listener: MediaTrackAddedListener): void {
    emitter.off(LOCAL_MEDIA_TRACK_IS_ADDED, listener);
}

export function emitLocalMediaTrackAdded(message: ClientMediaTrackMessage) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_ADDED, message);
}

// --------------- local media track removed -----
export function onLocalMediaTrackRemoved(listener: MediaTrackRemovedListener): void {
    emitter.on(LOCAL_MEDIA_TRACK_IS_REMOVED, listener);
}

export function offLocalMediaTrackRemoved(listener: MediaTrackRemovedListener): void {
    emitter.off(LOCAL_MEDIA_TRACK_IS_REMOVED, listener);
}

export function emitLocalMediaTrackRemoved(trackId: string) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_REMOVED, trackId);
}


// --------------- local media track paused -----
export function onLocalMediaTrackPaused(listener: MediaTrackAddedListener): void {
    emitter.on(LOCAL_MEDIA_TRACK_IS_PAUSED, listener);
}

export function offLocalMediaTrackPaused(listener: MediaTrackAddedListener): void {
    emitter.off(LOCAL_MEDIA_TRACK_IS_PAUSED, listener);
}

export function emitLocalMediaTrackPaused(message: ClientMediaTrackMessage) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_PAUSED, message);
}

// --------------- local media track play -----
export function onLocalMediaTrackPlay(listener: MediaTrackAddedListener): void {
    emitter.on(LOCAL_MEDIA_TRACK_IS_PLAY, listener);
}

export function offLocalMediaTrackPlay(listener: MediaTrackAddedListener): void {
    emitter.off(LOCAL_MEDIA_TRACK_IS_PLAY, listener);
}

export function emitLocalMediaTrackPlay(message: ClientMediaTrackMessage) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_PLAY, message);
}


// --------------- remote media track added -----
export function onRemoteMediaTrackAdded(listener: MediaTrackAddedListener): void {
    emitter.on(REMOTE_MEDIA_TRACK_IS_ADDED, listener);
}

export function offRemoteMediaTrackAdded(listener: MediaTrackAddedListener): void {
    emitter.off(REMOTE_MEDIA_TRACK_IS_ADDED, listener);
}

export function emitRemoteMediaTrackAdded(message: ClientMediaTrackMessage) {
    emitter.emit(REMOTE_MEDIA_TRACK_IS_ADDED, message);
}

// --------------- remote media track removed -----
export function onRemoteMediaTrackRemoved(listener: MediaTrackRemovedListener): void {
    emitter.on(REMOTE_MEDIA_TRACK_IS_REMOVED, listener);
}

export function offRemoteMediaTrackRemoved(listener: MediaTrackRemovedListener): void {
    emitter.off(REMOTE_MEDIA_TRACK_IS_REMOVED, listener);
}

export function emitRemoteMediaTrackRemoved(message: ClientMediaTrackMessage) {
    emitter.emit(REMOTE_MEDIA_TRACK_IS_REMOVED, message);
}

