/* 讀現行 generation(tests/support/source.js),不是 root index.html。
   root index.html 是 byte-locked 的 v110 bridge,內容永遠不變 —— 斷言放在那裡
   永遠會綠,守不到使用者實際跑的 App。2026-09-24 實測:在現行 generation 把
   tripHideDone 預設值翻轉、拿掉「現在」徽章、改掉機場／加油標籤,本檔原本全部照樣通過。
   backlog #27 當時是掃 shell/vNNN 字面來遷移,本檔從未寫過 generation 路徑,
   所以沒被掃到;這裡補上。 */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html, 'typeTag'), sandbox);

assert.strictEqual(
  sandbox.typeTag({ kind: 'place', p: { tnorm: 'attraction', type: '機場' } }).label,
  '🛫 機場',
  'airport places use the airport label'
);

assert.strictEqual(
  sandbox.typeTag({ kind: 'place', p: { tnorm: 'attraction', type: '纜車' } }).label,
  '🚡 纜車',
  'cable-car places use the cable-car label'
);

const fuelTag = sandbox.typeTag({
  kind: 'place',
  p: { tnorm: 'fuel', type: '加油站' }
});
assert.strictEqual(fuelTag.label, '⛽ 加油站', 'fuel places use the fuel label');
assert.strictEqual(fuelTag.cls, 'move', 'fuel places reuse the move visual class');

assert.match(
  html,
  /fuel:'⛽ 加油資訊'/,
  'fuel places use the dedicated itinerary information label'
);

assert.match(
  html,
  /var tripHideDone=true;/,
  'the itinerary starts with completed items hidden'
);

assert.match(
  html,
  /isNow\?'<span class="now-badge">現在<\/span>'/,
  'the Trip view keeps the now badge'
);

console.log('trip presentation tests passed');
