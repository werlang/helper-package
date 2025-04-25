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
        this._isConnecting = false; // Prevent multiple simultaneous connections
        this._shouldReconnect = true; // Track if reconnect is desired
        this.connect();
    }

    /**
     * Establishes a WebSocket connection and sets up event handlers.
     * @async
     * @returns {Promise<void>}
     */
    async connect() {
        if (this._isConnecting) return;
        this._isConnecting = true;
        this._shouldReconnect = this.reconnect;
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.onopen = null;
        }
        this.socket = new WebSocket(this.url);

        // Single error handler
        const handleError = (error) => {
            console.error('WebSocket error:', error);
            this.isOpen = false;
            if (this._shouldReconnect) {
                setTimeout(() => this.connect(), 1000);
            }
        };

        this.socket.onclose = () => {
            this.isOpen = false;
            // console.log('WebSocket connection closed');
            if (this._shouldReconnect) {
                setTimeout(() => this.connect(), 1000);
            }
        };
        this.socket.onerror = handleError;

        this.socket.onmessage = (event) => {
            this.onMessageListeners.forEach(listener => {
                try {
                    listener(event);
                } catch (e) {
                    console.error('Listener error:', e);
                }
            });
        };

        this.isOpen = false;
        try {
            await this.open();
        } finally {
            this._isConnecting = false;
        }
    }

    /**
     * Waits for the WebSocket connection to open.
     * @async
     * @returns {Promise<void>} Resolves when the connection is open.
     */
    async open() {
        if (this.isOpen) return;
        return await new Promise((resolve, reject) => {
            const onOpen = () => {
                // console.log('WebSocket connection established');
                this.isOpen = true;
                if (this.onConnectCallback) {
                    this.onConnectCallback();
                }
                this.socket.removeEventListener('open', onOpen);
                this.socket.removeEventListener('error', onError);
                resolve();
            };
            const onError = (err) => {
                this.socket.removeEventListener('open', onOpen);
                this.socket.removeEventListener('error', onError);
                reject(err);
            };
            this.socket.addEventListener('open', onOpen);
            this.socket.addEventListener('error', onError);
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
                let parsed;
                try {
                    parsed = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                const { data: responseData, id: responseId } = parsed;
                if (responseId === messageId) {
                    resolve(responseData);
                    this.removeListener(listener);
                }
            });
            const errorHandler = (error) => {
                reject(error);
                this.removeListener(listener);
            };
            this.socket.addEventListener('error', errorHandler);
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
            let parsed;
            try {
                parsed = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            const { data: responseData, id: responseId } = parsed;
            if (responseId === messageId) {
                callback(responseData);
            }
        });
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

    /**
     * Closes the WebSocket connection and prevents further reconnects.
     */
    close() {
        this._shouldReconnect = false;
        if (this.socket) {
            this.socket.close();
        }
    }

}