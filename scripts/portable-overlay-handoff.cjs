const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');

const API = 'http://127.0.0.1:52525';
const WS = 'ws://127.0.0.1:52525/api/v1/ws';

async function readState(fetchImpl = fetch) {
    const response = await fetchImpl(`${API}/api/v1/state`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Stable engine API returned HTTP ${response.status}`);
    return response.json();
}

function clientsFromState(state) {
    return (state.virtualDrivers || []).find(driver => driver.id === 'TimoxVasio')?.clients || [];
}

function sendCommand(command, WebSocketImpl = WebSocket) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocketImpl(WS, 'vasio.api.v1');
        const id = command.id || randomUUID();
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            socket.close();
            callback(value);
        };
        socket.once('open', () => socket.send(JSON.stringify({ ...command, id })));
        socket.once('error', error => finish(reject, error));
        socket.on('message', raw => {
            let message;
            try { message = JSON.parse(raw.toString()); }
            catch (error) { finish(reject, error); return; }
            if (message.id !== id) return;
            if (message.success) finish(resolve, message.result);
            else finish(reject, new Error(message.error?.message || 'Stable engine rejected the command'));
        });
    });
}

async function waitForStopped({ fetchImpl = fetch, pollMs = 250, timeoutMs = 5000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
        const state = await readState(fetchImpl);
        if (state.engine?.state === 'stopped' && clientsFromState(state).length === 0) return state;
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    throw new Error('Stable engine did not reach stopped state with zero TimoxVasio clients');
}

async function stopAudio({ fetchImpl = fetch, WebSocketImpl = WebSocket, pollMs = 250, timeoutMs = 5000 } = {}) {
    const result = await sendCommand({ command: 'engine.stop' }, WebSocketImpl);
    await waitForStopped({ fetchImpl, pollMs, timeoutMs });
    return result;
}

async function main() {
    const command = process.argv[2] || 'state';
    if (command === 'state') console.log(JSON.stringify(await readState(), null, 2));
    else if (command === 'stop') console.log(JSON.stringify(await stopAudio()));
    else throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { clientsFromState, readState, sendCommand, stopAudio, waitForStopped };
