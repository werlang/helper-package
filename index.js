/**
 * Exports WebSocket client and server classes for use in other modules.
 *
 * @module index
 * @exports WSClient
 * @exports WSServer
 */
import WSClient from "./driver/wsclient.js";
import WSServer from "./driver/wsserver.js";

export {
    WSClient,
    WSServer,
};