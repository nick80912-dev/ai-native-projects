const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const snapshotTool = require('../tools/refresh-builtin-snapshot');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (file) => crypto.createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex');
const immutable = {
  'index.html': '7e22172860865d343df8061317aa0d231f0323eb296564b10cf871d273e1682f',
  'app-version.js': '085e37a275b03dbc20630a5a500f5e5192db7c5a75f13e4725f788e0d49714cb',
  'shell/v136/index.html': 'e51ad7b72f64dd2cde062989ada0490bcf502c35a721de72b1cbc7c106e12170',
  'shell/v136/app-version.js': '8059935d5c49efa583f3ad74e56ee10d9d3c4b4419cc3102554e05882cd72919',
  'shell/v136/builtin-snapshot.js': 'b714ab267c737de51933c7aa01446a20b23c90719a59f5d009635c3ea5441025',
};
Object.keys(immutable).forEach((file) => assert.strictEqual(hash(file), immutable[file], file + ' remains immutable'));

const html = read('shell/v137/index.html');
const appVersion = read('shell/v137/app-version.js');
const sw = read('sw.js');
const assets = JSON.parse(read('runtime-assets.json')).assets;
assert.match(appVersion, /^var APP_VERSION='v137';\s*$/);
assert.match(sw, /^var SW_VERSION='v137';$/m);
assert.match(sw, /var CURRENT_DOCUMENT='\.\/shell\/v137\/index\.html';/);
assert.match(html, /<script src="shell\/v137\/app-version\.js"><\/script>/);
assert.match(html, /<script id="builtinSnapshotMarker">var BUILTIN_HTML_VERSION='v137';var BUILTIN_HTML_TS=\d+;<\/script>/);
assert.match(html, /<script src="shell\/v137\/builtin-snapshot\.js"><\/script>/);
assert.match(html, /\{version:'v137'/);
assert.ok(assets.includes('shell/v137/app-version.js'));
assert.ok(assets.includes('shell/v137/builtin-snapshot.js'));
const approvedSnapshot = snapshotTool.readBuiltinAsset(read('shell/v136/builtin-snapshot.js')).snapshot;
const candidateSnapshot = snapshotTool.readBuiltinAsset(read('shell/v137/builtin-snapshot.js')).snapshot;
assert.deepStrictEqual(candidateSnapshot, approvedSnapshot, 'v137 BUILTIN keeps the approved v136 CSV content');

const modules = ['trip-lifecycle.js', 'trip-archive.js', 'trip-drive.js', 'trip-lifecycle-flow.js'];
let previous = html.indexOf('<script src="trip-progression.js"></script>');
modules.forEach((file) => {
  const position = html.indexOf('<script src="' + file + '"></script>');
  assert.ok(position > previous, file + ' loads after its predecessors');
  previous = position;
  assert.ok(assets.includes(file), file + ' is in runtime assets');
  assert.ok(sw.includes("'./" + file + "'"), file + ' is in the atomic shell cache');
});
['shell/v137/index.html', 'shell/v137/app-version.js', 'shell/v137/builtin-snapshot.js'].forEach((file) => {
  assert.ok(sw.includes("'./" + file + "'"), file + ' is in the atomic shell cache');
});
console.log('trip lifecycle v137 wiring passed');
