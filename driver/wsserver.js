import { WebSocketServer } from 'ws';

/**
 * WebSocket Server for handling client connections, message routing, and method registration.
 *
 * @class WSServer
 */
export default class WSServer {

    /**
     * Initializes the WebSocket server and sets up connection handling.
     * @constructor
     */
    constructor() {
        this.ws = new WebSocketServer({ port: 8080 });
        this.methodList = {};

        this.ws.on('connection', (ws) => {
            ws.on('message', (message) => {
                this.handleMessage(ws, message);
            });
        });
    }

    /**
     * Handles incoming messages from clients, routes to registered methods, and sends responses.
     * @param {WebSocket} ws - The client WebSocket connection.
     * @param {string} message - The received message as a string.
     */
    handleMessage(ws, message) {

        const { method, payload, id } = JSON.parse(message);
        
        if (this.methodList[method]) {
            this.methodList[method](payload, (data) => {
                ws.send(JSON.stringify({ id, data }));
            });
        } else {
            ws.send(JSON.stringify({ error: true, message: 'Method not found' }));
        }
    }

    /**
     * Registers a callback function for a specific method name.
     * @param {string} method - The method name to handle.
     * @param {function} callback - The function to call with the payload and a response callback.
     */
    on(method, callback) {
        this.methodList[method] = callback;
    }
}