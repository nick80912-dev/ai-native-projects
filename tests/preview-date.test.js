/* 讀現行 generation(tests/support/source.js),不是 root index.html。
   root index.html 是 byte-locked 的 v110 bridge,內容永遠不變 —— 斷言放在那裡
   永遠會綠,守不到使用者實際跑的 App。2026-09-24 實測:在現行 generation 把
   previewDate 參數改名,本檔原本照樣通過。
   backlog #27 當時是掃 shell/vNNN 字面來遷移,本檔從未寫過 generation 路徑,
   所以沒被掃到;這裡補上。 */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();

function runWithSearch(search) {
  const sandbox = {
    window: { location: { search } },
    Date,
    URLSearchParams,
    localStorage: { getItem() { return null; } },
    AppLog: { repo() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(html, 'lsGet'),
    extractFunction(html, 'appNow'),
    extractFunction(html, 'todayMD'),
  ].join('\n'), sandbox);
  return sandbox.todayMD();
}

assert.strictEqual(
  runWithSearch('?previewDate=2026-10-18'),
  '10/18',
  'previewDate query parameter controls the Today date'
);

assert.strictEqual(
  runWithSearch('?fresh=7beb2d4&previewDate=2026-10-23'),
  '10/23',
  'previewDate works alongside other query parameters'
);

console.log('preview date tests passed');
