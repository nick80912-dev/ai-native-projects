/* 活文件 generation 一致性 gate 的契約測試。
   守的是 tools/check-doc-generation.js:活文件不得指向舊 shell generation。
   每個正向斷言都配一個負向控制 —— 否則無法證明這個 gate 不是恆真。 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const checker = require('../tools/check-doc-generation.js');

assert.strictEqual(typeof checker.checkDocGeneration, 'function', 'gate 對外提供可重用的純函式驗證器');

function docs(map) { return { current: 'v113', docs: map }; }

/* ---- 正向:活文件全部指向 current generation ---- */
assert.deepStrictEqual(
  checker.checkDocGeneration(docs({ 'a.md': 'current App 在 `shell/v113/index.html`。\n' })),
  [],
  '指向 current generation 的活文件通過'
);

/* ---- 負向控制:指向舊 generation 必須失敗,且要指得出檔案與行號 ---- */
const stale = checker.checkDocGeneration(docs({
  'a.md': '第一行沒有版本。\ncurrent App 在 `shell/v111/index.html`。\n'
}));
assert.strictEqual(stale.length, 1, '舊 generation 必須被攔下,實際:' + JSON.stringify(stale));
assert(stale[0].indexOf('a.md:2') === 0, '錯誤訊息要帶檔名與行號,實際:' + stale[0]);
assert(stale[0].indexOf('shell/v111') !== -1 && stale[0].indexOf('shell/v113') !== -1,
  '錯誤訊息要同時說出「寫了什麼」與「該寫什麼」');

/* ---- 同一行出現多個舊引用要逐一報,不是只報第一個 ---- */
assert.strictEqual(
  checker.checkDocGeneration(docs({ 'a.md': '`shell/v111/index.html` 與 `shell/v112/app-version.js`\n' })).length,
  2,
  '同一行的多個舊引用各自回報'
);

/* ---- 逐行豁免:歷史敘述可以留在活文件裡 ---- */
assert.deepStrictEqual(
  checker.checkDocGeneration(docs({
    'a.md': '`shell/v111/builtin-snapshot.js` 是當時的發布事實。<!-- generation-exempt: 歷史 -->\n'
  })),
  [],
  '同一行標註 generation-exempt 即豁免'
);
/* 負向控制:豁免必須在同一行,不能寫在別行就把整份檔案放行 */
assert.strictEqual(
  checker.checkDocGeneration(docs({
    'a.md': '<!-- generation-exempt: 歷史 -->\n`shell/v111/index.html`\n'
  })).length,
  1,
  '寫在別行的 generation-exempt 不得放行整份檔案'
);

/* ---- current generation 推導失敗要明講,不得靜默通過 ---- */
assert.strictEqual(
  checker.checkDocGeneration({ current: '', docs: { 'a.md': '`shell/v111/index.html`\n' } }).length,
  1,
  '推導不出 SW_VERSION 時必須報錯而不是放行'
);

/* ---- 白名單覆蓋:LIVING 指到的檔案都必須真的存在 ---- */
assert.deepStrictEqual(checker.checkCoverage('.'), [], 'LIVING 白名單沒有指向不存在的檔案');
assert(checker.LIVING.indexOf('02_ARCHITECTURE.md') !== -1 &&
  checker.LIVING.indexOf('10_FOLDER_STRUCTURE.md') !== -1 &&
  checker.LIVING.indexOf('08_AI_HANDOVER.md') !== -1,
  '2026-09-09 實際漂移過的三份文件必須在白名單內');

/* ---- 歷史文件不得被納管:寫死舊版本才是對的 ---- */
['07_CHANGELOG.md', 'tasks/done.md', '00_CONTEXT_HANDOVER.md', 'docs/batch2-device-acceptance.md']
  .forEach(function (file) {
    assert(checker.LIVING.indexOf(file) === -1, file + ' 是歷史記錄,不得納入活文件白名單');
  });

/* ---- 真實 repo:current generation 由 sw.js 推導,且活文件全部與之相符 ---- */
const real = checker.readSources('.');
const swVersion = (/^var SW_VERSION='([^']+)';$/m.exec(fs.readFileSync('sw.js', 'utf8')) || [])[1];
assert.strictEqual(real.current, swVersion, 'current generation 來自 sw.js,不是第二份硬編碼');
assert(fs.existsSync(path.join('shell', real.current, 'index.html')), 'sw.js 指的 generation 目錄確實存在');
assert.deepStrictEqual(checker.checkDocGeneration(real), [], '本 repo 的活文件全部指向 current generation');

/* 負向控制:把真實文件在記憶體裡改回舊 generation,gate 必須紅 —— 證明上一條不是恆真 */
const mutated = { current: real.current, docs: Object.assign({}, real.docs) };
mutated.docs['02_ARCHITECTURE.md'] = String(real.docs['02_ARCHITECTURE.md'])
  .split('shell/' + real.current).join('shell/v111');
assert(checker.checkDocGeneration(mutated).length > 0,
  '把真實文件改回舊 generation 後 gate 必須失敗(否則前一條斷言是恆真)');

console.log('doc generation tests passed');
