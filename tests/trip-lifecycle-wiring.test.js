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
  'shell/v154/index.html': 'e7120b50bcc513f8e8ec7f7d000603d476e41d6a8d6b6239e6ab296d7e0620a2',
  'shell/v154/app-version.js': 'fb501de78a1ff1420a240d9fd2f447303e33b50b83e6e1e2f34a8eb141c95d92',
  'shell/v154/builtin-snapshot.js': '10c28610ecceb269cf9e37e23a1359d0d5d29e8a0b30d3cf9e67bfa14199f156',
  'shell/v155/index.html': '009d5bbcb03a28c13ae3b19271765c59ceca29423ae8f79da810c577b56957bc',
  'shell/v155/app-version.js': 'e5e542fb9510a1b1d30d6dab837db60a01d22161081b66f9865527841e87d7c5',
  'shell/v155/builtin-snapshot.js': '369aaee9ef9c4556290ee5aefe5ca062d1399e35368f390e2b10051c8d1afd84',
  'shell/v156/index.html': '38321a197345735067d927108dcd300f0a5e028ebae2d461ccda5e426a589a41',
  'shell/v156/app-version.js': 'd594bf3af63cd685bff33b03e0bb43ed40ad79570c6fe47eb700fa2c33e56978',
  'shell/v156/builtin-snapshot.js': 'c161c295c2e48f21cf32fc64ee5d1a1b9b78b76a7210356e7647407c7c906415',
  'shell/v157/index.html': 'afe938ab31134d66a61ab0f93f3e390b66ee6cb021b9957767c2789780202eac',
  'shell/v157/app-version.js': 'e6eb5875d7385a057eb1f399289a8ba095467efe47ec06ad6a41f106642a4d73',
  'shell/v157/builtin-snapshot.js': 'd74f995c51875606a8e9fc8affb3894a2dce3fc85828587651c69fd374df272b',
  'shell/v158/index.html': 'e89d88a82f5a4622280db1442f4beefcdcca4e1104054c30c78fbcfa3f38365d',
  'shell/v158/app-version.js': 'eb40b31a506444936c93f9e53c2a1ee1a4ed54a4d92d8f4cdc10489addd65037',
  'shell/v158/builtin-snapshot.js': 'c641cdf24993ea7837b67db63212866aac1533962c41374e040c4c76fd5fc349',
  'shell/v159/index.html': '0c5830de02423221305548ff2961bbb13bd8443240a7580c61ec22d79d8d6775',
  'shell/v159/app-version.js': 'b836b073ad58db8eda499813a3803c632bbf99c069c3a1cc13c13366d34cea4c',
  'shell/v159/builtin-snapshot.js': '7cc71ab8c3392d4e7d2abea7cd28507338b9e36900987a0d72bdb930b6d8203f',
  'shell/v160/index.html': '92831cbf2406feb85be61994fabf384ca3576dbada4ab0039b95460b8929d451',
  'shell/v160/app-version.js': '883884516f05c6d51af3f9532d89f2df44e9320c0c89684651100362e7a74a19',
  'shell/v160/builtin-snapshot.js': '4b6e50656778a30c98899af26b132192b4bb63b58a0ef468d60ce797c8d9ec5a',
  'shell/v161/index.html': '63e7edeedd848c7b5590c61d1c17dd099bfd4d0996ac4423be8a126666e1a316',
  'shell/v161/app-version.js': '5ebc10584d319a98ec05059014d6c8b7c12ff39fe722c9f6a1862099d66427bc',
  'shell/v161/builtin-snapshot.js': 'feab041c30274352d1866f0d56ccec8695dd5bbb1c0c2ca5696d284aca3a18ce',
  'shell/v162/index.html': '30f2fec079f062911c055f14137e71b5040d4020855fb36ab89c7b7a3d766fd3',
  'shell/v162/app-version.js': '0262a3b8fb936047fd47c12e7467a17ee40cc4da99bccee339057f57759a3a63',
  'shell/v162/builtin-snapshot.js': '553f16e7811880a2322bf1b6e1ca0206985dfaee6d1323a822dfdbf09a970cae',
  'shell/v163/index.html': '164864e25996ecba5752958222da11517d73efce39fa71e8291d378b09fb8cb1',
  'shell/v163/app-version.js': '16cbdb07a57e87389315171f21b431cf8de24cd39860f8ddd863af66114ac946',
  'shell/v163/builtin-snapshot.js': '0a4119b147e2006473a37e5156c3d096a7ee0ee37249c6cbae600c6126ddea22',
  'shell/v164/index.html': 'b8ad38cb6ded845d71349ae61948fa58c4acc2543902816b57739d76eaa725be',
  'shell/v164/app-version.js': 'f0f09a32d315c1ca9b22bb76d1b4c9f572ad4ce4b86f7698b56af601038c107f',
  'shell/v164/builtin-snapshot.js': '238844b39d2ef5c13fb6716cf8588e7fba48dcf312db7ea8172b9d698420489f',
  'shell/v165/index.html': '8c2c4f6ec251a881d0fbda0708313cab5e82ad34f3a6b19283ac90c436d1e862',
  'shell/v165/app-version.js': '7bb3afb90b89fb3e23c4b5b05ce315da8c8b1a39848b3a051f1149ffffba7812',
  'shell/v165/builtin-snapshot.js': 'b048bf432a5749dacd1dd542f1e164626ae0e964408d6821b238e44bc4933831',
  'shell/v166/index.html': 'b10a2eeea844151a0146e9e5e6bb2bf1ccbf80107ca6f931e500910668c75fe9',
  'shell/v166/app-version.js': '28631886e39f1bb65d3faea3b9e908aeb09e7cc4c148ac17aad67d252fb59722',
  'shell/v166/builtin-snapshot.js': 'ba1e0227c1330a136c68708bc32ed3586ef98eb56e53668d0aeb69a4f1e23f18',
  'shell/v167/index.html': '9bdb64cd7eb79dbd6583db43696922d21607ab4acb4d0b15c7e3effa033f7975',
  'shell/v167/app-version.js': 'b08ebaa62a0babb6d851df536027c7c6f07eea8ff8c2b177ea5c6cbf79715d62',
  'shell/v167/builtin-snapshot.js': 'c69650c8c5b77ab454c2468a1e077f7af624d154cea2373abeecc8f7e952bc2f',
  'shell/v168/index.html': 'bdaa7e156413c73e7b774e0aecdc94731bd98113fcdcd1328dbe68298d763d84',
  'shell/v168/app-version.js': '7ac83e7f12120105f02986ef5154a2ec608b3ff950e01d5e168673c13fd65c2b',
  'shell/v168/builtin-snapshot.js': 'c9e6bdfa4d8828c0c6ca83d6642c7a7a3035421fbd3ce3ad204a536be0f2f4f3',
  'shell/v169/index.html': '4a3724e9f7f9372405f758338b0258f715b02e9f0be587d5314dd8ed12fb5780',
  'shell/v169/app-version.js': 'c3dc40eeeae6e65fb4bd75324f27c5c060bfc753508291a1f3f04a716eb449c7',
  'shell/v169/builtin-snapshot.js': 'c78905f88bb10390c3b1b2eccd9c439652cadc52937d6dcd98d08b95dd054181',
  'shell/v170/index.html': '0d5e8fd0e574e9ff4e663845cfdcbc093af1aacd4327647fc09615ef3683aad9',
  'shell/v170/app-version.js': '0aa307d35d534d2fd2597f39d1c763321d45eb037b8159ea4fc099f24cd686a8',
  'shell/v170/builtin-snapshot.js': 'cf496d223e489abf26ec21495690eceb87451d5241bf1fed54332dd55d1ec1fa',
  'shell/v171/index.html': '13a450e9757b69dbbd4b9c1b557e1c3efb1a8e16018c4ac0f7db017667b7b1f6',
  'shell/v171/app-version.js': '7159d6409f8023c394a00a90401f543ffda5c6f1b7efa1e65e0bb8b08457d8f5',
  'shell/v171/builtin-snapshot.js': '3a2b9a2aed12cc96b89b8c427a56554b984577693350f7df62c7b51f7c2ab3d0',
  'shell/v172/index.html': '07d9617d12ebe42020f6e0e61611779739423af54185e8babe742c8e3081bf74',
  'shell/v172/app-version.js': '30c2bbda0f338200aede056787e767da22b7417c7775b053710641f84877d76e',
  'shell/v172/builtin-snapshot.js': 'af11b8fbd6e09e5437009a3b25159dbf601b56bb73a950dc816bc109f30294a2',
  'shell/v173/index.html': '43efc191e7f351cc41fc887aac5d6634afc60ba356eee29c402f016b747fe83a',
  'shell/v173/app-version.js': 'b6f2953aa0e319623dde99f1ca1a01795c2e85d3d9ca43f3be46deb6d6d775e1',
  'shell/v173/builtin-snapshot.js': '1a9f79fd1d7023a71d85cb771af7558a729cec25eaf14fc0280e3d9b1ee71cac',
  'shell/v174/index.html': 'bb248c04bb4de74019d31a14943e7c32a2134ce553f568843be1228ef91237d5',
  'shell/v174/app-version.js': '22a6933424598359c948a2ea32a78220bf15c6fd40571e9c8d7ca2e53ff978b9',
  'shell/v174/builtin-snapshot.js': 'f952ad1dfc904ed1da7cf6899781d7a39e18a2f3870071e01e7c02237248865f',
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
