import WSServer from '../../driver/wsserver.js';
import { WebSocketServer } from 'ws';

// Mock ws module
jest.mock('ws', () => {
    const mWebSocketServer = jest.fn().mockImplementation(() => {
        return {
            on: jest.fn(),
        };
    });
    return { WebSocketServer: mWebSocketServer };
});

describe('WSServer', () => {
    let server;
    let wsInstance;
    let onConnectionCallback;

    beforeEach(() => {
        WebSocketServer.mockClear();
        server = new WSServer();
        wsInstance = { on: jest.fn() };
        // Simulate connection event registration
        onConnectionCallback = WebSocketServer.mock.calls[0]?.[0]?.connection;
    });

    test('registers connection handler on construction', () => {
        expect(WebSocketServer).toHaveBeenCalledWith({ port: 8080 });
        expect(server.ws.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('registers method handler and calls it on message', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.on('echo', (payload, respond) => {
            respond({ echoed: payload });
        });
        // Simulate connection
        server.ws.on.mock.calls[0][1](ws);
        // Simulate message event registration
        expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function));
        // Simulate message event
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        const msg = JSON.stringify({ method: 'echo', payload: 'hi', id: 1 });
        messageHandler(msg);
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 1, data: { echoed: 'hi' } }));
    });

    test('responds with error for malformed JSON', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler('not json');
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Malformed JSON', id: undefined })
        );
    });

    test('responds with error for missing method', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ payload: 'hi', id: 2 }));
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Missing or invalid method', id: 2 })
        );
    });

    test('responds with error for unknown method', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ method: 'notfound', payload: 'hi', id: 3 }));
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Method not found', id: 3 })
        );
    });

    test('responds with error if handler throws', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.on('fail', () => { throw new Error('fail'); });
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ method: 'fail', payload: 'hi', id: 4 }));
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Method handler error', id: 4 })
        );
    });

    test('overwrites method handler if registered twice', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        const firstHandler = jest.fn((payload, respond) => respond('first'));
        const secondHandler = jest.fn((payload, respond) => respond('second'));
        server.on('dup', firstHandler);
        server.on('dup', secondHandler); // Overwrite
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ method: 'dup', payload: 'x', id: 10 }));
        expect(firstHandler).not.toHaveBeenCalled();
        expect(secondHandler).toHaveBeenCalled();
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 10, data: 'second' }));
    });

    test('responds with error for non-string method', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ method: 123, payload: 'hi', id: 11 }));
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Missing or invalid method', id: 11 })
        );
    });

    test('handles undefined, null, and object payloads', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.on('payload', (payload, respond) => {
            respond({ type: typeof payload, value: payload });
        });
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        // undefined
        messageHandler(JSON.stringify({ method: 'payload', id: 12 }));
        // null
        messageHandler(JSON.stringify({ method: 'payload', payload: null, id: 13 }));
        // object
        messageHandler(JSON.stringify({ method: 'payload', payload: { foo: 'bar' }, id: 14 }));
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 12, data: { type: 'undefined', value: undefined } }));
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 13, data: { type: 'object', value: null } }));
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 14, data: { type: 'object', value: { foo: 'bar' } } }));
    });

    test('responds with error if response callback throws', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.on('cbthrow', (payload, respond) => {
            throw new Error('handler should not throw here');
        });
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        messageHandler(JSON.stringify({ method: 'cbthrow', payload: 'x', id: 15 }));
        expect(ws.send).toHaveBeenCalledWith(
            JSON.stringify({ error: true, message: 'Method handler error', id: 15 })
        );
    });

    test('handles multiple clients independently', () => {
        const ws1 = { on: jest.fn(), send: jest.fn() };
        const ws2 = { on: jest.fn(), send: jest.fn() };
        server.on('multi', (payload, respond) => respond(payload));
        server.ws.on.mock.calls[0][1](ws1);
        server.ws.on.mock.calls[0][1](ws2);
        const handler1 = ws1.on.mock.calls.find(([event]) => event === 'message')[1];
        const handler2 = ws2.on.mock.calls.find(([event]) => event === 'message')[1];
        handler1(JSON.stringify({ method: 'multi', payload: 'a', id: 16 }));
        handler2(JSON.stringify({ method: 'multi', payload: 'b', id: 17 }));
        expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ id: 16, data: 'a' }));
        expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ id: 17, data: 'b' }));
    });

    test('ignores non-string/binary messages gracefully', () => {
        const ws = { on: jest.fn(), send: jest.fn() };
        server.on('echo', (payload, respond) => respond(payload));
        server.ws.on.mock.calls[0][1](ws);
        const messageHandler = ws.on.mock.calls.find(([event]) => event === 'message')[1];
        // Simulate a Buffer (binary data)
        const buffer = Buffer.from(JSON.stringify({ method: 'echo', payload: 'bin', id: 18 }));
        messageHandler(buffer);
        // Should still parse and respond
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ id: 18, data: 'bin' }));
    });
});
