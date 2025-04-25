import WSClient from '../../driver/wsclient.js';
import WSServer from '../../driver/wsserver.js';
import { WebSocket } from 'ws';

global.WebSocket = WebSocket;

describe('WSClient', () => {
    let server;
    let client;
    const port = 8080;
    const url = `ws://localhost:${port}`;

    beforeAll((done) => {
        server = new WSServer();
        // Mock method handler
        server.on('echo', (payload, respond) => respond(payload));
        server.on('error', () => { throw new Error('handler error'); });
        done();
    });

    afterAll((done) => {
        server.ws.close(() => done());
    });

    beforeEach(() => {
        client = new WSClient({ url, reconnect: false });
    });

    afterEach(() => {
        client.close();
    });

    test('connects and calls onConnect callback', async () => {
        const onConnect = jest.fn();
        client.onConnect(onConnect);
        await client.open();
        expect(onConnect).toHaveBeenCalled();
        expect(client.isOpen).toBe(true);
    });

    test('sends and receives a message', async () => {
        const response = await client.send('echo', { foo: 'bar' });
        expect(response).toEqual({ foo: 'bar' });
    });

    test('handles server method not found error', async () => {
        await expect(client.send('notfound', {})).resolves.toBeUndefined();
    });

    // Utility to wait for server to be ready
    async function waitForOpen(client) {
        if (client.isOpen) return;
        await new Promise((resolve) => {
            client.onConnect(resolve);
        });
    }

    test('removes listener correctly', async () => {
        const fn = jest.fn();
        client.addListener(fn);
        client.removeListener(fn);
        // Simulate a message
        const response = await client.send('echo', { foo: 'bar' });
        expect(fn).not.toHaveBeenCalled();
        expect(response).toEqual({ foo: 'bar' });
    });

    test('stream receives data and can be stopped', async () => {
        await waitForOpen(client);
        // Patch server to send multiple responses
        const orig = server.methodList['echo'];
        server.on('echo', (payload, respond) => {
            setTimeout(() => respond('a'), 10);
            setTimeout(() => respond('b'), 20);
            setTimeout(() => respond('c'), 100);
        });
        const cb = jest.fn();
        const stop = await client.stream('echo', {}, cb);
        // Wait for both responses
        await new Promise((r) => setTimeout(r, 50));
        expect(cb).toHaveBeenCalledWith('a');
        expect(cb).toHaveBeenCalledWith('b');
        stop();
        expect(cb).not.toHaveBeenCalledWith('c');
    });

    test('handles server handler error', async () => {
        await waitForOpen(client);
        await expect(client.send('error', {})).resolves.toBeUndefined();
    }, 10000);
});