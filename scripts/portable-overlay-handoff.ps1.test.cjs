const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('handoff launcher is confirmation-gated and closes only selected client windows', () => {
    const script = fs.readFileSync(require.resolve('./portable-overlay-handoff.ps1'), 'utf8');
    assert.match(script, /ConfirmHandoff/);
    assert.match(script, /CloseMainWindow/);
    assert.match(script, /Get-CimInstance Win32_Process/);
    assert.match(script, /Stop-Process -Id \$enginePid/);
    assert.doesNotMatch(script, /taskkill/i);
});
