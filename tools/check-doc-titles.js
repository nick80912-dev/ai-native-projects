/* ============================================================
   tools/check-doc-titles.js — 文件標題與檔名一致性檢查
   ============================================================
   目的:防止「檔名對、內容錯」的上傳錯位事故(2026-07-09 曾發生)。
   規則:
   1. NN_*.md(00-16 等編號文件)第一個標題必須以「# NN」開頭。
   2. 具名文件依 MAP 檢查第一行標題前綴。
   3. .ai-manifest.json 必須是有效 JSON 且 project 欄位存在。
   略過:-old-*_DEPRECATED.md、docs/superpowers/、adr/(自由標題)、FUTURE_PLAN。
   零相依,Node 內建模組;執行:node tools/check-doc-titles.js(於 repo 根目錄)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const MAP = {
  'README.md': '# 日本旅遊 App',
  'PROJECT_CONSTITUTION.md': '# PROJECT CONSTITUTION',
  'tasks/current.md': '# CURRENT',
  'tasks/backlog.md': '# BACKLOG',
  'tasks/done.md': '# DONE',
  'tests/README.md': '# tests'
};

let errors = [];

function firstHeading(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const l of lines) { if (l.startsWith('#')) return l.trim(); }
  return '';
}

/* 規則 1:編號文件 */
for (const f of fs.readdirSync('.')) {
  const m = f.match(/^(\d{2})_.*\.md$/);
  if (!m) continue;
  const h = firstHeading(f);
  if (!h.startsWith('# ' + m[1])) {
    errors.push(f + ' 的第一個標題應以「# ' + m[1] + '」開頭,實際:「' + h + '」→ 內容可能與檔名錯位');
  }
}

/* 規則 2:具名文件 */
for (const f of Object.keys(MAP)) {
  if (!fs.existsSync(f)) { errors.push(f + ' 不存在'); continue; }
  const h = firstHeading(f);
  if (!h.startsWith(MAP[f])) {
    errors.push(f + ' 的第一個標題應以「' + MAP[f] + '」開頭,實際:「' + h + '」→ 內容可能與檔名錯位');
  }
}

/* 規則 3:manifest JSON */
try {
  const m = JSON.parse(fs.readFileSync('.ai-manifest.json', 'utf8'));
  if (!m.project) errors.push('.ai-manifest.json 缺少 project 欄位');
} catch (e) {
  errors.push('.ai-manifest.json 不是有效 JSON:' + e.message);
}

/* 規則 4:核心檔案必須存在(2026-07-10 新增:主程式曾被誤刪,CI 要能立即察覺) */
['index.html','schema.js','validator.js','PROJECT_CONSTITUTION.md','.ai-manifest.json'].forEach(function(f){
  if(!fs.existsSync(f)) errors.push('核心檔案缺失:' + f + '(可能被誤刪,請立即依 16_OPS_PLAYBOOK §C 處理)');
});

/* 規則 5:測試模擬檔禁止進入 repo(2026-07-10 新增:僅供本機/手機驗收,含時間 mock 會污染正式行為) */
for (const f of fs.readdirSync('.')) {
  if (!fs.statSync(f).isFile()) continue; /* 只檢查檔案(tests/ 目錄是正規測試資產) */
  if (/TEST/.test(f) || /測試/.test(f)) errors.push('測試模擬檔不得進入 repo:' + f + '(請於 GitHub 刪除;此類檔案僅供驗收,不入版控)');
}

/* 規則 6:HTML 內嵌的 schema.js / validator.js 必須與獨立檔一致(防雙份人工維護漂移) */
(function(){
  const app = 'index.html';
  if (!fs.existsSync(app)) return; // 規則 4 已報缺失
  const norm = t => t.replace(/\s+/g, '');
  const page = norm(fs.readFileSync(app, 'utf8'));
  [['schema.js','內嵌 schema'], ['validator.js','內嵌 validator']].forEach(function(pair){
    if (!fs.existsSync(pair[0])) return;
    const src = norm(fs.readFileSync(pair[0], 'utf8'));
    if (page.indexOf(src) === -1) {
      errors.push(pair[1] + ' 與獨立檔 ' + pair[0] + ' 不一致 — 兩份拷貝已漂移,請以其中正確的一份同步另一份(規則見 14 Tier 3)');
    }
  });
})();

/* 規則 7:不該存在的根目錄雜檔(上傳事故常見產物) */
for (const f of fs.readdirSync('.')) {
  if (/^README \(\d+\)\.md$/.test(f)) errors.push('根目錄有多餘檔案:' + f);
  if ((f === 'current.md' || f === 'done.md' || f === 'backlog.md')) errors.push('根目錄有多餘檔案:' + f + '(應在 tasks/ 內)');
}

if (errors.length) {
  console.error('❌ 文件一致性檢查失敗(' + errors.length + ' 項):');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✅ 文件標題/檔名一致性檢查通過');
