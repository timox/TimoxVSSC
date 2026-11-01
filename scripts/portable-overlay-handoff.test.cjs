const test = require('node:test');
const assert = require('node:assert/strict');
const { readState, stopAudio } = require('./portable-overlay-handoff.cjs');

test('readState reads the stable loopback state without normalizing clients', async () => {
    const state = { apiVersion: '1.0', engine: { state: 'running' }, virtualDrivers: [{ id: 'TimoxVasio', clients: [{ pid: 42 }] }] };
    const result = await readState(async () => ({ ok: true, json: async () => state }));
    assert.deepEqual(result, state);
});

test('stopAudio sends engine.stop and waits for stopped state with no clients', async () => {
    const sent = [];
    const states = [
        { apiVersion: '1.0', engine: { state: 'running' }, virtualDrivers: [{ id: 'TimoxVasio', clients: [] }] },
        { apiVersion: '1.0', engine: { state: 'stopped' }, virtualDrivers: [{ id: 'TimoxVasio', clients: [] }] }
    ];
    class FakeWebSocket {
        static OPEN = 1;
        constructor() { this.readyState = FakeWebSocket.OPEN; setImmediate(() => this.emit('open')); }
        once(event, callback) { this[event] = callback; }
        on(event, callback) { this[`on${event}`] = callback; }
        send(raw) { sent.push(JSON.parse(raw)); setImmediate(() => this.onmessage(JSON.stringify({ id: sent[0].id, success: true, result: { accepted: true } }))); }
        close() {}
        emit(event, ...args) { this[event]?.(...args); }
    }
    const result = await stopAudio({
        fetchImpl: async () => ({ ok: true, json: async () => states.shift() }),
        WebSocketImpl: FakeWebSocket,
        pollMs: 0
    });
    assert.deepEqual(result, { accepted: true });
    assert.equal(sent[0].command, 'engine.stop');
});
