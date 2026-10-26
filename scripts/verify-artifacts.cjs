const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const required = ['artifacts/backend/TimoxVirtualAsioEngine.exe', 'artifacts/backend/PwarAsioClient.exe'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function verify(root, packaged = false) {
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'artifacts.lock.json'), 'utf8'));
    for (const name of required) {
        const item = lock.artifacts.find(entry => entry.path === name);
        if (!item?.revision || !/^[a-f0-9]{64}$/.test(item.sha256 || '')) throw new Error(`Unpinned artifact: ${name}`);
        const file = path.join(root, name);
        if (hash(file) !== item.sha256) throw new Error(`Artifact hash mismatch: ${name}`);
        if (packaged && hash(path.join(root, 'dist/win-unpacked/resources/backend', path.basename(name))) !== item.sha256)
            throw new Error(`Packaged artifact hash mismatch: ${name}`);
    }
    for (const name of ['api/openapi-v1.json', 'api/schemas/api-v1.json']) {
        const item = lock.schemas?.find(entry => entry.path === name);
        if (!/^[a-f0-9]{64}$/.test(item?.sha256 || '')) throw new Error(`Unpinned schema: ${name}`);
        if (hash(path.join(root, item.path)) !== item.sha256) throw new Error(`Schema hash mismatch: ${item.path}`);
        if (packaged && hash(path.join(root, 'dist/win-unpacked/resources/backend', item.path.slice(4))) !== item.sha256)
            throw new Error(`Packaged schema hash mismatch: ${item.path}`);
    }
}
module.exports = { verify };
if (require.main === module) {
    verify(path.resolve(__dirname, '..'), process.argv.includes('--packaged'));
    console.log('Pinned engine, PWAR and API artifacts verified.');
}
