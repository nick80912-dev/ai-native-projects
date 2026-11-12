const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const snapshotTool = require('../tools/refresh-builtin-snapshot');
const {appVersion:currentVersion,shellPath} = require('./support/version');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (file) => crypto.createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex');
/* 已發布 generation 不可就地改(ADR 0019)。2026-10-16 Bar 核准刪除 shell/v111–v153 後,
   repo 只保留較新的世代;這裡守住 root v110 bridge 與仍保留的已發布世代三件組。
   刪除某個保留世代時,同步移除它在這裡的 hash(依 ADR 0019「保留範圍」的規則)。 */
const immutable = {
  'index.html': '7e22172860865d343df8061317aa0d231f0323eb296564b10cf871d273e1682f',
  'app-version.js': '085e37a275b03dbc20630a5a500f5e5192db7c5a75f13e4725f788e0d49714cb',
  'shell/v186/index.html': 'd5e5030d1cd8a2da6e060af661e4a4d970f554852c3cbc4e15fa2d4ce29225f1',
  'shell/v186/app-version.js': 'ad44a6185454b50e24b02a8fa33f22f7dc6aa3efec9c5d2f438c5e9aadc034b3',
  'shell/v186/builtin-snapshot.js': 'f0c03cf15f45f3f249179f592885d8f64da2300a4182f6707bfd3e82b6995182',
  'shell/v187/index.html': '6de28931e28d43e8b57e9a65043e7c900db463100500d0c981c5cddc5c57018f',
  'shell/v187/app-version.js': '84808e238833657ea95f92ca7f1aa04a7b5ad2cc7c11c0e37562487ba81cdaec',
  'shell/v187/builtin-snapshot.js': '80cc7de03ad492e331f80817f2f56cdd47a000e087161e72792074e536f64eee',
};
Object.keys(immutable).forEach((file) => assert.strictEqual(hash(file), immutable[file], file + ' remains immutable'));

/* 已核准的 v136 BUILTIN 內容基準。原本直接讀 shell/v136/builtin-snapshot.js;該世代刪除後,
   以位元組相同的副本保存在 tests/fixtures/,並用原世代的 sha256 證明它就是當時核准、發布的那一份
   (原檔仍可由 `git show production-v136:shell/v136/builtin-snapshot.js` 取得)。 */
const APPROVED_SNAPSHOT_FIXTURE = 'tests/fixtures/builtin-snapshot-v136-approved.js';
assert.strictEqual(hash(APPROVED_SNAPSHOT_FIXTURE), 'b714ab267c737de51933c7aa01446a20b23c90719a59f5d009635c3ea5441025',
  'approved v136 BUILTIN fixture is byte-identical to the published shell/v136/builtin-snapshot.js');

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
const approvedSnapshot = snapshotTool.readBuiltinAsset(read(APPROVED_SNAPSHOT_FIXTURE)).snapshot;
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
