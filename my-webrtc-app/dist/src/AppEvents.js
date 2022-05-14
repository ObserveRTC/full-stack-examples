import { EventEmitter } from "events";
var LOCAL_MEDIA_TRACK_IS_ADDED = "localMediaTrackAdded";
var LOCAL_MEDIA_TRACK_IS_REMOVED = "localMediaTrackRemoved";
var LOCAL_MEDIA_TRACK_IS_PAUSED = "localMediaTrackPaused";
var LOCAL_MEDIA_TRACK_IS_PLAY = "localMediaTrackPlay";
var REMOTE_MEDIA_TRACK_IS_ADDED = "remoteMediaTrackAdded";
var REMOTE_MEDIA_TRACK_IS_REMOVED = "remoteMediaTrackRemoved";
var emitter = new EventEmitter();
// --------------- local media track added -----
export function onLocalMediaTrackAdded(listener) {
    emitter.on(LOCAL_MEDIA_TRACK_IS_ADDED, listener);
}
export function offLocalMediaTrackAdded(listener) {
    emitter.off(LOCAL_MEDIA_TRACK_IS_ADDED, listener);
}
export function emitLocalMediaTrackAdded(message) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_ADDED, message);
}
// --------------- local media track removed -----
export function onLocalMediaTrackRemoved(listener) {
    emitter.on(LOCAL_MEDIA_TRACK_IS_REMOVED, listener);
}
export function offLocalMediaTrackRemoved(listener) {
    emitter.off(LOCAL_MEDIA_TRACK_IS_REMOVED, listener);
}
export function emitLocalMediaTrackRemoved(trackId) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_REMOVED, trackId);
}
// --------------- local media track paused -----
export function onLocalMediaTrackPaused(listener) {
    emitter.on(LOCAL_MEDIA_TRACK_IS_PAUSED, listener);
}
export function offLocalMediaTrackPaused(listener) {
    emitter.off(LOCAL_MEDIA_TRACK_IS_PAUSED, listener);
}
export function emitLocalMediaTrackPaused(message) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_PAUSED, message);
}
// --------------- local media track play -----
export function onLocalMediaTrackPlay(listener) {
    emitter.on(LOCAL_MEDIA_TRACK_IS_PLAY, listener);
}
export function offLocalMediaTrackPlay(listener) {
    emitter.off(LOCAL_MEDIA_TRACK_IS_PLAY, listener);
}
export function emitLocalMediaTrackPlay(message) {
    emitter.emit(LOCAL_MEDIA_TRACK_IS_PLAY, message);
}
// --------------- remote media track added -----
export function onRemoteMediaTrackAdded(listener) {
    emitter.on(REMOTE_MEDIA_TRACK_IS_ADDED, listener);
}
export function offRemoteMediaTrackAdded(listener) {
    emitter.off(REMOTE_MEDIA_TRACK_IS_ADDED, listener);
}
export function emitRemoteMediaTrackAdded(message) {
    emitter.emit(REMOTE_MEDIA_TRACK_IS_ADDED, message);
}
// --------------- remote media track removed -----
export function onRemoteMediaTrackRemoved(listener) {
    emitter.on(REMOTE_MEDIA_TRACK_IS_REMOVED, listener);
}
export function offRemoteMediaTrackRemoved(listener) {
    emitter.off(REMOTE_MEDIA_TRACK_IS_REMOVED, listener);
}
export function emitRemoteMediaTrackRemoved(message) {
    emitter.emit(REMOTE_MEDIA_TRACK_IS_REMOVED, message);
}
