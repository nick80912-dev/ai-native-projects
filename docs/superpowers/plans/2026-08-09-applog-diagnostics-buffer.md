# AppLog Diagnostics Buffer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retain the latest 100 AppLog events for the current App session, expose a safe diagnostic report in the existing peach panel, and remove only the panel's group-ledger test-mode section.

**Architecture:** Deepen the existing `AppLog` object in `validator.js` with a closure-owned FIFO buffer, defensive snapshot, and clear operation while preserving its six console methods. Extract a silent current-health reader so opening diagnostics does not create log entries, then add pure report/render helpers to `index.html`; the settings test-mode page and TEST universe stay intact.

**Tech Stack:** Browser JavaScript (ES5-compatible syntax), HTML/CSS, Node `assert` + `vm`, Playwright, existing document/runtime governance scripts.

## Global Constraints

- Keep `app-version.js` and `sw.js` at v98; do not change Service Worker lifecycle or cache strategy.
- Keep all AppLog entries session-only: no `localStorage`, IndexedDB, remote persistence, or backup changes.
- Retain exactly the newest 100 entries and at most 1,000 stored characters per message.
- Continue writing the full original message to the same console level and prefix.
- Do not intercept general console output or collect raw CSV, form input, full URLs, or browsing history.
- Do not restore retired iOS gesture diagnostics; preserve the passive no-op `dblclick` compatibility listener.
- Remove only the diagnostic panel's group-ledger test-mode section; retain `openTestModeSettings()`, the settings control page, TEST prefix, universe isolation, and Ledger behavior.
- Keep `validator.js` and its embedded `index.html` copy in exact parity.
- Do not merge `main`, deploy Netlify, or create a production tag.

---

### Task 1: AppLog Session Buffer and Silent Health Snapshot

**Files:**
- Create: `tests/app-log-buffer.test.js`
- Modify: `validator.js:12-20,230-242`
- Modify: `index.html` embedded `validator.js` section
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: existing `console.warn`, `console.error`, `console.log`, `validateSnapshotData(DB,RAW,SCHEMA)`.
- Produces: `AppLog.snapshot(): Array<{at:string,category:string,level:string,message:string}>`, `AppLog.clear(): void`, `currentHealthFindings(): string[]`, and unchanged `healthCheck(): string[]` reporting behavior.

- [ ] **Step 1: Write the failing AppLog contract test**

Create `tests/app-log-buffer.test.js` using `vm.runInContext(fs.readFileSync('validator.js','utf8'), sandbox)`. The sandbox must use deterministic `Date`, collect console calls, and provide a minimal valid `DB`/`RAW`/`SCHEMA`. Assert all of the following:

```js
const methods={
  schema:['warn','[Schema Error] ','schema'],
  parser:['warn','[Parser Error] ','parser'],
  data:['warn','[Data Error] ','data'],
  repo:['warn','[Repository Error] ','repository'],
  render:['error','[Render Error] ','render'],
  sync:['warn','[Sync Error] ','sync']
};
Object.keys(methods).forEach(name=>sandbox.AppLog[name]('sample-'+name));
assert.deepStrictEqual(plain(sandbox.AppLog.snapshot()).map(entry=>entry.category),
  ['schema','parser','data','repository','render','sync']);

sandbox.AppLog.clear();
for(let index=0;index<101;index++)sandbox.AppLog.repo('entry-'+index);
const entries=plain(sandbox.AppLog.snapshot());
assert.strictEqual(entries.length,100);
assert.strictEqual(entries[0].message,'entry-1');
assert.strictEqual(entries[99].message,'entry-100');

const longMessage='x'.repeat(1001);
sandbox.AppLog.render(longMessage);
assert.strictEqual(plain(sandbox.AppLog.snapshot()).at(-1).message.length,1000);
assert(consoleErrors.at(-1).endsWith(longMessage));

const copy=plain(sandbox.AppLog.snapshot());
copy[0].message='mutated';
assert.notStrictEqual(plain(sandbox.AppLog.snapshot())[0].message,'mutated');

sandbox.AppLog.clear();
sandbox.currentHealthFindings();
assert.strictEqual(plain(sandbox.AppLog.snapshot()).length,0);
sandbox.healthCheck();
assert(plain(sandbox.AppLog.snapshot()).length>0);
```

Also assert `AppLog.clear()` is safe when already empty and each console prefix/level remains unchanged.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/app-log-buffer.test.js`

Expected: FAIL because `AppLog.snapshot`, `AppLog.clear`, and `currentHealthFindings` do not exist.

- [ ] **Step 3: Implement the minimal bounded AppLog**

Replace the plain AppLog object in `validator.js` with a closure. Use ES5-compatible syntax:

```js
var APP_LOG_LIMIT=100;
var APP_LOG_MESSAGE_LIMIT=1000;
var AppLog=(function(){
  var entries=[];
  function safeText(value){
    try{return String(value===undefined?'':value);}
    catch(error){return '[無法讀取診斷訊息]';}
  }
  function timestamp(){
    try{return new Date().toISOString();}
    catch(error){return '';}
  }
  function write(category,level,prefix,message){
    var text=safeText(message);
    console[level](prefix+text);
    entries.push({at:timestamp(),category:category,level:level,message:text.slice(0,APP_LOG_MESSAGE_LIMIT)});
    if(entries.length>APP_LOG_LIMIT)entries.splice(0,entries.length-APP_LOG_LIMIT);
  }
  function snapshot(){
    return entries.map(function(entry){
      return {at:entry.at,category:entry.category,level:entry.level,message:entry.message};
    });
  }
  return {
    schema:function(message){write('schema','warn','[Schema Error] ',message);},
    parser:function(message){write('parser','warn','[Parser Error] ',message);},
    data:function(message){write('data','warn','[Data Error] ',message);},
    repo:function(message){write('repository','warn','[Repository Error] ',message);},
    render:function(message){write('render','error','[Render Error] ',message);},
    sync:function(message){write('sync','warn','[Sync Error] ',message);},
    snapshot:snapshot,
    clear:function(){entries.length=0;}
  };
})();
```

Extract health lookup without changing the public report path:

```js
function currentHealthFindings(){
  var validation=validateSnapshotData(DB,RAW,SCHEMA);
  return validation.blockers.concat(validation.warnings).map(function(finding){return finding.message;});
}
function healthCheck(){
  var findings=currentHealthFindings();
  if(findings.length){
    console.warn('━━ Project Health Check:發現 '+findings.length+' 項 ━━');
    findings.forEach(function(message){AppLog.data(message);});
  }else console.log('━━ Project Health Check:PASS(資料一致性無異常)━━');
  return findings;
}
```

Apply the exact same validator source to the bounded embedded section in `index.html`.

- [ ] **Step 4: Run focused and parity tests and verify GREEN**

Run:

```powershell
node tests/app-log-buffer.test.js
node tests/atomic-sheet-sync.test.js
node tests/data-reference-consistency.test.js
node tools/check-doc-titles.js
```

Expected: all pass; the document check proves embedded `validator.js` parity.

- [ ] **Step 5: Index the new test and commit**

Add one exact entry to `tests/README.md` explaining that `app-log-buffer.test.js` covers the six categories, FIFO limit, message bound, defensive snapshot, clear, console compatibility, and silent health lookup.

Commit:

```powershell
git add validator.js index.html tests/app-log-buffer.test.js tests/README.md
git commit -m "feat(diagnostics): retain bounded AppLog session events"
```

---

### Task 2: Diagnostic Panel Report and Test-Mode Section Removal

**Files:**
- Create: `tests/diagnostics-app-log.test.js`
- Create: `tests/browser/diagnostics-app-log.spec.js`
- Modify: `index.html:564-571,10695-10738`
- Modify: `tests/browser/settings-grouped-root.spec.js:90-112`
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: Task 1 `AppLog.snapshot()`, `AppLog.clear()`, `currentHealthFindings()`, plus existing `escapeHtml()`, `copyText()`, `toast()`, `openSettings('test-mode')`.
- Produces: `formatDiagnosticsReport(findings,entries): string`, `renderDiagnosticAppLogSection(entries): string`, `copyDiagnosticsReport(): void`, `clearDiagnosticAppLog(): void`, and `refreshDiagnosticAppLog(): void`.

- [ ] **Step 1: Write failing helper and source-scope tests**

Create `tests/diagnostics-app-log.test.js`. Extract the new helper block using stable comments `/* ---- DIAGNOSTIC APPLOG START ---- */` and `/* ---- DIAGNOSTIC APPLOG END ---- */`, execute it in a VM with recording doubles, then assert:

```js
const entries=[{at:'2026-08-09T01:02:03.000Z',category:'repository',level:'warn',message:'<b>失敗</b>'}];
const html=sandbox.renderDiagnosticAppLogSection(entries);
assert(html.includes('AppLog'));
assert(html.includes('1 筆'));
assert(html.includes('&lt;b&gt;失敗&lt;/b&gt;'));
assert(!html.includes('<b>失敗</b>'));

const report=sandbox.formatDiagnosticsReport(['懸空引用'],entries);
assert(report.includes('Health Check'));
assert(report.includes('懸空引用'));
assert(report.includes('[repository] <b>失敗</b>'));

sandbox.copyDiagnosticsReport();
assert.strictEqual(copied.length,1);
assert(copied[0].text.includes('Health Check'));
sandbox.clearDiagnosticAppLog();
assert.strictEqual(clearCalls,1);
assert.strictEqual(refreshCalls,1);
```

Inspect the exact `openDiagnostics()` source bounds and assert the source contains `renderDiagnosticAppLogSection(AppLog.snapshot())` and does not contain `團體帳測試模式` or `openTestModeSettings()`.

- [ ] **Step 2: Update the existing browser contract to RED**

In `tests/browser/settings-grouped-root.spec.js`, replace the obsolete assertion that diagnostics is the unique off-state entry. Assert instead:

```js
await page.evaluate(()=>openDiagnostics());
await expect(page.locator('#diagnosticOverlay')).not.toContainText('團體帳測試模式');
await expect(page.locator('#diagnosticOverlay button[onclick="openTestModeSettings()"]')).toHaveCount(0);
await page.evaluate(()=>openSettings('test-mode'));
await expect(page.locator('#settingsOverlay #ledgerTestModeSection input[type=checkbox]')).toHaveCount(1);
```

Keep the existing off → on → off TEST universe assertions unchanged after entering the control page directly.

Add `tests/browser/diagnostics-app-log.spec.js` that boots through `qa-fixture`, clears AppLog, records `AppLog.repo('<b>離線失敗</b>')`, opens diagnostics, and verifies:

- `#diagAppLogSection` reports one entry.
- The text is visible but no injected `<b>` exists under `#diagAppLogList`.
- Health Check and App version sections remain.
- The test-mode section is absent.
- Clicking clear produces the empty state without closing diagnostics.
- No `pageerror` occurs.

Run: `node tests/diagnostics-app-log.test.js`

Expected: FAIL because the helper block and AppLog panel do not exist.

- [ ] **Step 3: Implement report helpers and panel UI**

Add a bounded scroll style next to existing diagnostic CSS:

```css
.diag-log{max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
```

Add the stable helper block before `openDiagnostics()`:

```js
/* ---- DIAGNOSTIC APPLOG START ---- */
function formatDiagnosticsReport(findings,entries){
  var lines=['Trip Pilot 除錯報告','建立時間：'+new Date().toISOString(),'','Health Check'];
  lines=lines.concat(findings.length?findings.map(function(item){return '- '+item;}):['- 正常']);
  lines.push('','AppLog（'+entries.length+' 筆）');
  lines=lines.concat(entries.length?entries.map(function(entry){
    return (entry.at||'')+' ['+(entry.category||'unknown')+'] '+String(entry.message||'');
  }):['- 尚無紀錄']);
  return lines.join('\n');
}
function renderDiagnosticAppLogSection(entries){
  var rows=entries.map(function(entry){
    return escapeHtml((entry.at||'')+' ['+(entry.category||'unknown')+'] '+String(entry.message||''));
  }).join('\n');
  return '<div class="diag-section" id="diagAppLogSection"><h3>AppLog</h3><div class="diag-row">'+entries.length+' 筆（本次開啟 App 期間）</div><div class="diag-row diag-log" id="diagAppLogList">'+(rows||'尚無紀錄')+'</div><div class="diag-actions"><button onclick="copyDiagnosticsReport()">複製除錯報告</button><button onclick="clearDiagnosticAppLog()">清除紀錄</button></div></div>';
}
function refreshDiagnosticAppLog(){
  var section=document.getElementById('diagAppLogSection');
  if(section)section.outerHTML=renderDiagnosticAppLogSection(AppLog.snapshot());
}
function copyDiagnosticsReport(){
  copyText(formatDiagnosticsReport(currentHealthFindings(),AppLog.snapshot()),'除錯報告');
}
function clearDiagnosticAppLog(){
  AppLog.clear();
  refreshDiagnosticAppLog();
  toast('AppLog 已清除');
}
/* ---- DIAGNOSTIC APPLOG END ---- */
```

Change `openDiagnostics()` to use `currentHealthFindings()` instead of `healthCheck()`, insert `renderDiagnosticAppLogSection(AppLog.snapshot())` after Health Check, and remove the complete group-ledger test-mode HTML section. Preserve `openTestModeSettings()` and all settings code.

- [ ] **Step 4: Run focused Node and browser tests and verify GREEN**

Run:

```powershell
node tests/diagnostics-app-log.test.js
node tests/ios-gesture-diagnostics.test.js
node tests/settings-grouped-root.test.js
npx playwright test tests/browser/diagnostics-app-log.spec.js tests/browser/settings-grouped-root.spec.js
```

Expected: all pass; the settings test proves the control page and TEST universe remain operational despite the removed diagnostic entry.

- [ ] **Step 5: Update test index and commit**

Add exact `tests/README.md` entries for the Node helper/source contract and browser interaction coverage.

Commit:

```powershell
git add index.html tests/diagnostics-app-log.test.js tests/browser/diagnostics-app-log.spec.js tests/browser/settings-grouped-root.spec.js tests/ios-gesture-diagnostics.test.js tests/README.md
git commit -m "feat(diagnostics): expose session AppLog report"
```

---

### Task 3: Governance, Documentation, and Full Verification

**Files:**
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `tasks/current.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `10_FOLDER_STRUCTURE.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: Tasks 1–2 completed behavior and final test counts.
- Produces: current project handoff, archived backlog evidence, manifest validation baseline, and a clean pushable `dev` history.

- [ ] **Step 1: Move only the completed backlog #2 subitem**

Remove the AppLog／healthCheck clause from backlog #2 while leaving these siblings untouched and in order:

- fetchSheet retry with 800ms backoff
- `toast()` null guard
- test-build localStorage prefix isolation

Add a `tasks/done.md` entry recording the session-only 100-entry/1,000-character limits, silent health snapshot, copy/clear UI, removed diagnostic test-mode section, and explicitly preserved settings TEST behavior.

- [ ] **Step 2: Update current architecture and delivery records**

Update `tasks/current.md`, `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, and `10_FOLDER_STRUCTURE.md` with:

- AppLog now has six console-compatible categories plus a bounded session buffer.
- Opening diagnostics is observation-only and does not add health entries.
- The diagnostic test-mode entry is removed; settings control and TEST universe remain.
- v98 remains unchanged and there is no merge/deploy/tag.

- [ ] **Step 3: Update manifest only after final counts are known**

Update `.ai-manifest.json` description/validation fields without changing schema or runtime version. Record the actual final Node test-file and Playwright counts, not projected values.

- [ ] **Step 4: Run the complete final gate**

Run every top-level Node test file in a fail-fast PowerShell loop, followed by:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
npx playwright test
git diff --check
```

Also parse `.ai-manifest.json`, `manifest.webmanifest`, and `runtime-assets.json` with `JSON.parse`. Expected: every command succeeds; app and SW remain v98.

- [ ] **Step 5: Commit documentation and verify branch scope**

Commit:

```powershell
git add tasks/backlog.md tasks/done.md tasks/current.md 07_CHANGELOG.md 08_AI_HANDOVER.md 10_FOLDER_STRUCTURE.md .ai-manifest.json
git commit -m "docs(diagnostics): record bounded AppLog delivery"
```

Then run `git status --short --branch`, `git log --oneline origin/dev..HEAD`, and `git diff --stat origin/dev...HEAD`. Confirm only this approved diagnostics slice plus its spec/plan is present.

- [ ] **Step 6: Fetch and push dev safely**

Run `git fetch origin --prune`. Require `git merge-base HEAD origin/dev` to equal `git rev-parse origin/dev` and the worktree to be clean. If true, run `git push origin dev`; never force-push. Confirm local HEAD equals `origin/dev` afterward.
