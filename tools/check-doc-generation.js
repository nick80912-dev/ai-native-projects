/* ============================================================
   tools/check-doc-generation.js — 活文件的 shell generation 一致性檢查
   ============================================================
   目的:防止「文件停在舊 generation」的無聲漂移(2026-09-09 實測到 17 處)。
   為什麼需要機器檢查:舊 generation 的目錄(shell/v111 等)仍然存在於 repo,
   所以文件指到舊路徑不會 404、不會報錯,只會讓接手者安靜地改錯檔案。
   runtime 端的版本鏈由 tools/check-app-version.js 守;本檔只守文件端。

   規則:
     LIVING 清單內的檔案,出現的 `shell/vNNN` 必須等於 sw.js 的 SW_VERSION。
     current generation 由 sw.js 反推,不新增第二個真相來源
     (與 check-doc-titles.js 規則 6 同一個推導方式)。

   刻意不檢查的:
     - 歷史文件(adr/、07_CHANGELOG.md、tasks/done.md、docs/superpowers/、
       00_CONTEXT_HANDOVER.md、-old-*_DEPRECATED.md、
       docs/device-acceptance-log.md)
       → 這些記錄「當時」的事實,寫死舊版本才是對的。
     - tests/*.test.js
       → 測試檔指到舊 generation 會 ENOENT 大聲失敗,不是無聲錯誤;
         納入本 gate 只是把爆點提前,價值低。
         (把測試遷到 tests/support/version.js 是另一件事,見 backlog。)

   採白名單而非黑名單:新增檔案預設不檢查,不會突然擋住 CI;要納管必須明寫。

   逐行例外:同一行含 `generation-exempt` 即跳過,並且必須寫理由,例如
     <!-- generation-exempt: v111 是當時的發布事實,不隨升版變動 -->

   零相依,Node 內建模組;執行:node tools/check-doc-generation.js(於 repo 根目錄)
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

/* 活文件白名單 —— 描述「現行」契約的檔案。新增文件要納管請加在這裡。 */
const LIVING = [
  'README.md',
  'CONTEXT.md',
  '01_PROJECT.md',
  '02_ARCHITECTURE.md',
  '03_DATABASE.md',
  '04_UI_GUIDELINES.md',
  '05_CODING_RULES.md',
  '06_ROADMAP.md',
  '08_AI_HANDOVER.md',
  '09_SCHEMA_MAPPING.md',
  '10_FOLDER_STRUCTURE.md',
  '11_CODING_CONVENTION.md',
  '12_DEV_WORKFLOW.md',
  '13_PROJECT_STATUS.md',
  '14_FILE_TIERS_AND_GATE.md',
  '15_AI_EXECUTION_RULES.md',
  '16_OPS_PLAYBOOK.md',
  'PROJECT_CONSTITUTION.md',
  'tasks/current.md',
  'tasks/backlog.md',
  'tests/README.md',
  '.ai-manifest.json'
];

const GENERATION_REF = /shell\/v\d+/g;
const EXEMPT_MARK = 'generation-exempt';

/* 純函式:sources = { current:'v113', docs:{ '02_ARCHITECTURE.md': '檔案內容', ... } } */
function checkDocGeneration(sources) {
  const errors = [];
  const current = String((sources && sources.current) || '');
  const docs = (sources && sources.docs) || {};

  if (!/^v\d+$/.test(current)) {
    errors.push("無法由 sw.js 推導 current generation(預期 var SW_VERSION='vNN';)");
    return errors;
  }

  const expected = 'shell/' + current;
  Object.keys(docs).forEach(function (file) {
    String(docs[file]).split(/\r?\n/).forEach(function (line, index) {
      if (line.indexOf(EXEMPT_MARK) !== -1) return;
      (line.match(GENERATION_REF) || []).forEach(function (ref) {
        if (ref === expected) return;
        errors.push(
          file + ':' + (index + 1) + ' 指向 `' + ref + '`,current generation 是 `' + expected +
          '` — 活文件描述的是現行契約,請改為現行 generation;若這一行確實是歷史事實,' +
          '請在該行加上 generation-exempt 註解並寫明理由'
        );
      });
    });
  });
  return errors;
}

function readSources(rootDir) {
  rootDir = rootDir || '.';
  const read = function (file) {
    const full = path.join(rootDir, file);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  };
  const swMatch = /^var SW_VERSION='([^']+)';$/m.exec(read('sw.js'));
  const docs = {};
  LIVING.forEach(function (file) {
    const full = path.join(rootDir, file);
    if (fs.existsSync(full)) docs[file] = fs.readFileSync(full, 'utf8');
  });
  return { current: swMatch ? swMatch[1] : '', docs: docs };
}

/* 白名單裡的檔案若被改名或刪除,必須讓 CI 看得見 —— 否則「移除檔案」就等於「靜默解除納管」。 */
function checkCoverage(rootDir) {
  rootDir = rootDir || '.';
  return LIVING.filter(function (file) {
    return !fs.existsSync(path.join(rootDir, file));
  }).map(function (file) {
    return '活文件白名單指向不存在的檔案:' + file + '(改名或刪除時請同步更新 tools/check-doc-generation.js 的 LIVING)';
  });
}

function run(rootDir) {
  rootDir = rootDir || '.';
  const sources = readSources(rootDir);
  const errors = checkCoverage(rootDir).concat(checkDocGeneration(sources));
  if (errors.length) {
    console.error('❌ 活文件 generation 一致性檢查失敗(' + errors.length + ' 項):');
    errors.forEach(function (error) { console.error('  - ' + error); });
    return 1;
  }
  console.log('✅ 活文件 generation 一致性檢查通過(' + sources.current + ',' +
    Object.keys(sources.docs).length + ' 份活文件)');
  return 0;
}

if (require.main === module) process.exitCode = run(process.cwd());

module.exports = { LIVING, checkDocGeneration, readSources, checkCoverage, run };
