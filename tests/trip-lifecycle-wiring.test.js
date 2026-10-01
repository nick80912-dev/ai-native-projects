const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const snapshotTool = require('../tools/refresh-builtin-snapshot');
const {appVersion:currentVersion,shellPath} = require('./support/version');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (file) => crypto.createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex');
const immutable = {
  "shell/v140/index.html": "9fa16da11ee3192480ddf3e0eb17b787bafeda9ae5667495e000d5bd3ffe45e6",
  "shell/v140/app-version.js": "8c5090504bc17b1b8f79008e626cd796a744cd314ecc0aeaa353506c7014a3a3",
  "shell/v140/builtin-snapshot.js": "852d6efd06ee6850ce4e1a59a1373ed706960770f2b8592869643320a2af0eda",
  'shell/v139/index.html': 'be63905dae86d4ce4bb9781deb9f38e7d4397db7f71cf41fda2fa8d3b72dd528',
  'shell/v139/app-version.js': '0f97742212689d88c6e3cbfd5056ab0acfd133aa666a3f8489a43253b3ac9776',
  'shell/v139/builtin-snapshot.js': '5351bff8d19ba5e70084ea29d10a70b8c324d6f342d8a5c82ba2431a653f355f',
  'index.html': '7e22172860865d343df8061317aa0d231f0323eb296564b10cf871d273e1682f',
  'app-version.js': '085e37a275b03dbc20630a5a500f5e5192db7c5a75f13e4725f788e0d49714cb',
  'shell/v136/index.html': 'e51ad7b72f64dd2cde062989ada0490bcf502c35a721de72b1cbc7c106e12170',
  'shell/v136/app-version.js': '8059935d5c49efa583f3ad74e56ee10d9d3c4b4419cc3102554e05882cd72919',
  'shell/v136/builtin-snapshot.js': 'b714ab267c737de51933c7aa01446a20b23c90719a59f5d009635c3ea5441025',
  'shell/v137/index.html': '8d8d98bc06f5c1d4a86585650a3933867c9b08dbcc96b37fa91d2c7b2a3695b1',
  'shell/v137/app-version.js': '9af19d6e63aaa46575bd52251f688126198e3f68753bfc5418b3377f438cd371',
  'shell/v137/builtin-snapshot.js': '0731d5ab566a20f1df1b6eef1ff29ad3b780f0bf665d74892396dba2bc55a09e',
  'shell/v138/index.html': 'a9fc0130df0f236cb2a5d3648444d62823ec0bcfc6f041fb7f29c040dfa372f0',
  'shell/v138/app-version.js': '0d72e6e8ff705cc3f6fd9972e300ac052eeef02e3d5005a3ef556224c4866224',
  'shell/v138/builtin-snapshot.js': '07ab78fb0ce184a860a58a78bffb9fa15139c7bb54b35d6eee1a75395845133c',
};
Object.keys(immutable).forEach((file) => assert.strictEqual(hash(file), immutable[file], file + ' remains immutable'));

const version = currentVersion();
const html = read(shellPath('index.html'));
const appVersion = read(shellPath('app-version.js'));
const sw = read('sw.js');
const assets = JSON.parse(read('runtime-assets.json')).assets;
assert.strictEqual(appVersion.trim(),"var APP_VERSION='"+version+"';");
assert.ok(sw.includes("var CURRENT_DOCUMENT='./"+shellPath('index.html')+"';"));
assert.ok(html.includes('<script src="'+shellPath('app-version.js')+'"></script>'));
assert.strictEqual(snapshotTool.readBuiltinMarker(html).appVersion,version);
assert.ok(html.includes('<script src="'+shellPath('builtin-snapshot.js')+'"></script>'));
assert.ok(html.includes("{version:'"+version+"'"));
assert.ok(assets.includes(shellPath('app-version.js')));
assert.ok(assets.includes(shellPath('builtin-snapshot.js')));
const approvedSnapshot = snapshotTool.readBuiltinAsset(read('shell/v136/builtin-snapshot.js')).snapshot;
const candidateSnapshot = snapshotTool.readBuiltinAsset(read(shellPath('builtin-snapshot.js'))).snapshot;
assert.deepStrictEqual(candidateSnapshot, approvedSnapshot, 'current BUILTIN keeps the approved v136 CSV content');

const modules = ['trip-lifecycle.js', 'trip-archive.js', 'trip-drive.js', 'trip-lifecycle-flow.js'];
let previous = html.indexOf('<script src="trip-progression.js"></script>');
modules.forEach((file) => {
  const position = html.indexOf('<script src="' + file + '"></script>');
  assert.ok(position > previous, file + ' loads after its predecessors');
  previous = position;
  assert.ok(assets.includes(file), file + ' is in runtime assets');
  assert.ok(sw.includes("'./" + file + "'"), file + ' is in the atomic shell cache');
});
['index.html', 'app-version.js', 'builtin-snapshot.js'].map(shellPath).forEach((file) => {
  assert.ok(sw.includes("'./" + file + "'"), file + ' is in the atomic shell cache');
});
console.log('trip lifecycle '+version+' wiring passed');
