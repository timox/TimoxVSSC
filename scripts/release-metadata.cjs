const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function checkSource(root, lock) {
    const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
    const release = lock.release;
    if (!release || release.channel !== 'alpha' || release.guiVersion !== version)
        throw new Error('Release metadata must match the GUI candidate version/channel');
    if (lock.requiredApiVersion !== '1.1' || release.engine.apiVersion !== lock.requiredApiVersion)
        throw new Error('Release API version mismatch');
    if (release.driver.version !== '1.2.7' || release.driver.bundled !== false)
        throw new Error('The portable candidate requires the external 1.2.7 driver');
    for (const component of [release.driver, release.engine, release.pwar])
        if (!/^[a-f0-9]{40}$/.test(component.revision || '')) throw new Error('Missing exact component revision');
    if (release.engine.windowsMidiServices !== true)
        throw new Error('The MIDI candidate requires Windows MIDI Services enabled');
    for (const item of lock.schemas || [])
        if (hash(path.join(root, item.path)) !== item.sha256) throw new Error(`Schema hash mismatch: ${item.path}`);
    return release;
}
function checkEngine(root, lock) {
    const release = checkSource(root, lock);
    const item = lock.artifacts.find(entry => entry.repository === 'TimoxVAudioEngine');
    const receipt = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/backend/engine-build.json')));
    if (receipt.formatVersion !== 1 || receipt.repository !== 'timox/TimoxVAudioEngine' ||
        receipt.version !== release.engine.version || receipt.apiVersion !== release.engine.apiVersion ||
        receipt.revision !== release.engine.revision || receipt.dirty !== false ||
        receipt.windowsMidiServices !== true || item.revision !== receipt.revision ||
        item.sha256 !== receipt.binarySha256 || hash(path.join(root, item.path)) !== receipt.binarySha256)
        throw new Error('Engine build does not match the clean, MIDI-enabled release candidate');
    return receipt;
}
function writeManifest(root, lock) {
    checkEngine(root, lock);
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
    if (git('status', '--porcelain', '--untracked-files=normal')) throw new Error('Commit GUI changes before packaging');
    const manifest = { formatVersion: 1, ...lock.release,
        gui: { repository: 'timox/TimoxVSSC', version: lock.release.guiVersion, revision: git('rev-parse', 'HEAD') },
        artifacts: lock.artifacts, schemas: lock.schemas,
        engineBuild: JSON.parse(fs.readFileSync(path.join(root, 'artifacts/backend/engine-build.json'))) };
    fs.mkdirSync(path.join(root, 'build'), { recursive: true });
    fs.writeFileSync(path.join(root, 'build/release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
}
module.exports = { checkSource, checkEngine, writeManifest };
if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    checkSource(root, JSON.parse(fs.readFileSync(path.join(root, 'artifacts.lock.json'))));
    console.log('Candidate versions, component revisions and API schema pins match. Binary/hardware readiness not implied.');
}
