const assert = require('assert');
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('.ai-manifest.json', 'utf8'));

assert.strictEqual(manifest.manifest_format, '2.29');
assert.deepStrictEqual(manifest.current_status, { authority: 'tasks/current.md' });
assert(fs.existsSync(manifest.current_status.authority));
assert.strictEqual(Object.prototype.hasOwnProperty.call(manifest, 'status'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(manifest, 'historical_status_snapshot_2026_08_01'), false);
const raw = JSON.stringify(manifest);
['dev_candidate', 'next_action', 'automated_validation'].forEach(function(key) {
  assert.strictEqual(raw.indexOf('"' + key + '"'), -1, key + ' must live in tasks/current.md, not the manifest');
});
console.log('manifest status authority tests passed');
