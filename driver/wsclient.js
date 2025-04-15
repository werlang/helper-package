export default class WSClient {

    constructor({url, reconnect=true}={}) {
        this.url = url;
        this.reconnect = reconnect;
        this.isOpen = false;
        this.onMessageListeners = [];
        
        this.connect();
    }

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

    async send(method, data) {
        await this.open();
        return new Promise((resolve, reject) => {
            const messageId = this._send(method, data);
            this.addListener((event) => {
                const { data: responseData, id: responseId } = JSON.parse(event.data);
                if (responseId === messageId) {
                    resolve(responseData);
                }
            });
            this.socket.onerror = (error) => {
                reject(error);
            };
        });
    }

    async stream(method, data, callback) {
        await this.open();
        const messageId = this._send(method, data);
        this.addListener((event) => {
            const { data: responseData, id: responseId } = JSON.parse(event.data);
            if (responseId === messageId) {
                callback(responseData);
            }
        });

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    addListener(listener) {
        this.onMessageListeners.push(listener);
        return listener;
    }

}