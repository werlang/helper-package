import { WebSocketServer } from 'ws';

export default class WSServer {

    constructor() {
        this.ws = new WebSocketServer({ port: 8080 });
        this.methodList = {};

        this.ws.on('connection', (ws) => {
            ws.on('message', (message) => {
                this.handleMessage(ws, message);
            });
        });
    }

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

    on(method, callback) {
        this.methodList[method] = callback;
    }
}