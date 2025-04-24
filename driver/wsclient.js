/**
 * WebSocket Client for managing connections, sending and receiving messages, and handling reconnections.
 *
 * @class WSClient
 * @param {Object} options - Configuration options.
 * @param {string} options.url - The WebSocket server URL.
 * @param {boolean} [options.reconnect=true] - Whether to automatically reconnect on disconnect.
 */
export default class WSClient {

    /**
     * Creates an instance of WSClient and initiates connection.
     * @constructor
     * @param {Object} options - Configuration options.
     * @param {string} options.url - The WebSocket server URL.
     * @param {boolean} [options.reconnect=true] - Enable auto-reconnect.
     */
    constructor({url, reconnect=true}={}) {
        this.url = url;
        this.reconnect = reconnect;
        this.isOpen = false;
        this.onMessageListeners = [];
        
        this.connect();
    }

    /**
     * Establishes a WebSocket connection and sets up event handlers.
     * @async
     * @returns {Promise<void>}
     */
    async connect() {
        this.socket = new WebSocket(this.url);

        this.socket.onclose = () => {
            this.isOpen = false;
            console.log('WebSocket connection closed');

            if (this.reconnect) {
                setTimeout(() => this.connect(), 1000);
            }
        }
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);

            if (this.reconnect) {
                setTimeout(() => this.connect(), 1000);
            }
        }

        this.socket.onmessage = (event) => {
            this.onMessageListeners.forEach(listener => listener(event));
        }

        this.isOpen = false;
        await this.open();
    }

    /**
     * Waits for the WebSocket connection to open.
     * @async
     * @returns {Promise<void>} Resolves when the connection is open.
     */
    async open() {
        return this.isOpen ? Promise.resolve() : await new Promise((resolve, reject) => {
            this.socket.onopen = () => {
                console.log('WebSocket connection established');
                this.isOpen = true;

                if (this.onConnectCallback) {
                    this.onConnectCallback();
                }
                resolve();
            };
        });
    }

    /**
     * Sends a message through the WebSocket connection.
     * @private
     * @param {string} method - The method name or type of message.
     * @param {any} data - The payload to send.
     * @returns {string} The generated message ID.
     */
    _send(method, data) {
        const messageId = Math.random().toString(36).slice(2);
        this.socket.send(JSON.stringify({
            id: messageId,
            method,
            payload: data,
        }));
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        return messageId;
    }

    /**
     * Sends a message and waits for a response with the same message ID.
     * @async
     * @param {string} method - The method name or type of message.
     * @param {any} data - The payload to send.
     * @returns {Promise<any>} Resolves with the response data.
     */
    async send(method, data) {
        await this.open();
        return new Promise((resolve, reject) => {
            const messageId = this._send(method, data);
            const listener = this.addListener((event) => {
                const { data: responseData, id: responseId } = JSON.parse(event.data);
                if (responseId === messageId) {
                    resolve(responseData);
                    this.removeListener(listener);
                }
            });
            this.socket.onerror = (error) => {
                reject(error);
            };
        });
    }

    /**
     * Sends a message and listens for a stream of responses.
     * @async
     * @param {string} method - The method name or type of message.
     * @param {any} data - The payload to send.
     * @param {function} callback - Function to call with each response.
     * @returns {function} Function to stop listening to the stream.
     */
    async stream(method, data, callback) {
        await this.open();
        const messageId = this._send(method, data);
        const listener = this.addListener((event) => {
            const { data: responseData, id: responseId } = JSON.parse(event.data);
            if (responseId === messageId) {
                callback(responseData);
            }
        });

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Return a function to stop listening to the stream
        return () => this.removeListener(listener);
    }

    /**
     * Registers a callback to be called when the connection is established.
     * @param {function} callback - The function to call on connect.
     */
    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    /**
     * Adds a listener for incoming WebSocket messages.
     * @param {function} listener - The function to call on each message event.
     * @returns {function} The listener function (for removal).
     */
    addListener(listener) {
        this.onMessageListeners.push(listener);
        return listener;
    }

    /**
     * Removes a previously added message listener.
     * @param {function} listener - The listener function to remove.
     */
    removeListener(listener) {
        this.onMessageListeners = this.onMessageListeners.filter(l => l !== listener);
    }

}