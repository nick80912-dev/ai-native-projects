# Diagnostics and Sync Status Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove noisy optional website warnings and retired iOS gesture logging while replacing the sync status panel with a centered, state-driven summary.

**Architecture:** Remove the optional warning at the validator source, then keep sync safety logic intact while replacing only its UI model and markup. Retire the gesture-only diagnostic subsystem completely, preserving the peach entry point, health check, time simulation, trip reset, Scroll-only policy, and viewport recovery.

**Tech Stack:** Vanilla JavaScript, CSS, Node.js `assert`/`vm` tests, Markdown governance.

## Global Constraints

- Places website is optional and must not create `OPTIONAL_EMPTY`.
- Healthy sync UI shows `✓`, `同步正常`, last complete time, Schema version, generation ID, and one retry button.
- Failed sync UI shows the failed Sheet, safe bounded reason, retained snapshot time, Schema version, generation ID, and one retry button.
- Sync status overlay is horizontally and vertically centered at every viewport width.
- Do not display APP build, data source, empty failure rows, or validation-warning lists.
- Header healthy copy is exactly `✓ 已同步`.
- Remove all iOS gesture diagnostic listeners, buffers, report functions, UI, and CSS.
- Preserve `setupDiagnostics()`, `setupViewportReflow()`, `restoreFocusZoom()`, time simulation, and trip reset behavior.
- Trip reset button is full-width, rounded, red background, white text, and keeps two confirmations.
- Do not change atomic snapshot activation, failure retention, retry orchestration, Sheet data, Schema fields, or Service Worker cache.

---

### Task 1: Define the simplified warning and sync contracts in RED tests

**Files:**
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: `validateSnapshotData()`, `syncStatusModel()`, `renderSyncStatusBody()`, `setSyncState()`.
- Produces: failing contracts for no website warning and state-driven sync markup.

- [ ] **Step 1: Add the no-website-warning assertion**

After the first valid snapshot assertion, add:

```js
const optionalWebsite = validDb();
optionalWebsite.placeList[0].web = '';
const optionalWebsiteResult = sb.validateSnapshotData(optionalWebsite,validRaw(),schema());
assert.strictEqual(
  optionalWebsiteResult.warnings.some(function(f){ return f.code==='OPTIONAL_EMPTY'; }),
  false,
  'blank optional website does not create a validation warning'
);
```

- [ ] **Step 2: Replace the old sync-panel source assertions**

Replace the assertion requiring these labels:

```js
['APP build','資料來源','最後完整同步時間','最近失敗原因','驗證警告']
```

with:

```js
['同步正常','最後完整同步','Schema','資料版本'].forEach(function(label){
  assert(htmlSource.indexOf(label)>=0,'simple status UI contains '+label);
});
['APP build','資料來源','最近失敗原因','驗證警告'].forEach(function(label){
  assert.strictEqual(htmlSource.indexOf(label),-1,'simple status UI omits '+label);
});
assert.match(
  htmlSource,
  /\.sync-status-overlay\{[^}]*align-items:center[^}]*justify-content:center/,
  'sync status overlay is centered at every viewport width'
);
```

- [ ] **Step 3: Update the sync status VM fixtures**

In `loadSyncStatus()` and `attachSyncStatus(app)`, replace `APP_BUILD` setup with:

```js
SCHEMA:{version:'2.3 (2026-07-16)'}
```

For `attachSyncStatus(app)`, assign:

```js
app.SCHEMA={version:'2.3 (2026-07-16)'};
```

- [ ] **Step 4: Update healthy-state expectations**

For the online fixture, require:

```js
assert.strictEqual(model.state,'online');
assert.strictEqual(model.label,'同步正常');
assert.strictEqual(model.lastComplete,'2026/07/13 21:30');
assert.strictEqual(model.schemaVersion,'2.3 (2026-07-16)');
assert.strictEqual(model.generationId,'sheet-online');
assert.strictEqual(Object.prototype.hasOwnProperty.call(model,'warnings'),false);

const healthyHtml=app.renderSyncStatusBody();
assert(healthyHtml.includes('sync-status-icon'));
assert(healthyHtml.includes('✓'));
assert(healthyHtml.includes('同步正常'));
assert(healthyHtml.includes('最後完整同步'));
assert(healthyHtml.includes('Schema 2.3 (2026-07-16)'));
assert(healthyHtml.includes('資料版本 sheet-online'));
assert.strictEqual(healthyHtml.indexOf('APP build'),-1);
assert.strictEqual(healthyHtml.indexOf('驗證警告'),-1);
```

Update offline and builtin labels to:

```js
'離線資料'
'內建資料'
```

- [ ] **Step 5: Update failed-state expectations**

Replace the warning-array assertion with:

```js
assert.strictEqual(model.failedSheet,'行程總表');
assert.strictEqual(Object.prototype.hasOwnProperty.call(model,'warnings'),false);
```

Require rendered failure markup to contain the escaped Sheet label and safe reason, but not an empty generic row:

```js
assert(renderedFailure.includes('未同步 Sheet'));
assert(renderedFailure.includes('行程總表&lt;img src=x onerror=alert(1)&gt;'));
assert(renderedFailure.includes('HEADER_REQUIRED'));
assert.strictEqual(renderedFailure.indexOf('<img src=x onerror=alert(1)>'),-1);
```

- [ ] **Step 6: Update Header status expectations**

In the background success test, replace:

```js
assert.strictEqual(panel.txt.textContent,'已是最新');
```

with:

```js
assert.strictEqual(panel.txt.textContent,'✓ 已同步');
```

- [ ] **Step 7: Run the focused test and verify RED**

Run:

```powershell
node tests/atomic-sheet-sync.test.js
```

Expected: FAIL because website warnings, old labels, old rows, APP build rendering, and bottom-aligned CSS still exist.

- [ ] **Step 8: Commit the RED sync tests**

```powershell
git add -- tests/atomic-sheet-sync.test.js
git commit -m "test: define simplified sync status"
```

---

### Task 2: Remove the optional website warning and implement the sync summary

**Files:**
- Modify: `validator.js`
- Modify: `index.html`
- Test: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: Task 1 tests and existing safe failure storage.
- Produces: no optional website warning and `syncStatusModel() -> {state,label,lastComplete,schemaVersion,generationId,failure,failedSheet}`.

- [ ] **Step 1: Remove website warning generation from both validator copies**

Delete this block from `validator.js` and the embedded validator in `index.html`:

```js
placeList.forEach(function(place){
  if(!place.web) warn('OPTIONAL_EMPTY','places',place.placeId + ' 未填寫網站');
});
```

Do not change blocker generation or `healthCheck()`.

- [ ] **Step 2: Simplify `syncStatusModel()`**

Keep `pad()`, `formatTime()`, `bounded()`, snapshot loading, failure-record parsing, and safe allowlisted reason handling. Change labels to:

```js
if(syncInFlight){ state='syncing'; label='同步中'; }
else if(source==='builtin'){ state='builtin'; label='內建資料'; }
else if(failureRecord){ state='failed'; label='更新失敗'; }
else if(source==='online'){ state='online'; label='同步正常'; }
else{ state='offline'; label='離線資料'; }
```

Build separate failure fields:

```js
var failedSheet='', failure='';
if(failureRecord){
  var stageLabels={download:'下載失敗',structure:'資料結構檢查失敗',validation:'資料驗證失敗',storage:'本機儲存失敗',boot:'啟動資料驗證失敗'};
  var detail=stageLabels[failureRecord.stage]||'同步作業失敗';
  failedSheet=bounded(failureRecord.sheet,40);
  var code=bounded(failureRecord.code,40).replace(/[^0-9A-Za-z_-]/g,'');
  var reason=bounded(failureRecord.reason,160);
  failure=detail+(code?' ['+code+']':'')+(reason?'：'+reason:'');
}
return {
  state:state,
  label:label,
  lastComplete:formatTime(snapshot&&snapshot.createdAt),
  schemaVersion:SCHEMA.version,
  generationId:snapshot&&snapshot.generationId||'內建資料',
  failure:failure,
  failedSheet:failedSheet
};
```

Do not return `source` or `warnings`.

- [ ] **Step 3: Replace `renderSyncStatusBody()`**

Use this state-driven markup:

```js
function renderSyncStatusBody(){
  var model=syncStatusModel(), body=document.getElementById('syncStatusBody');
  var icon=model.state==='online'?'✓':model.state==='syncing'?'↻':'!';
  var html='<div class="sync-status-summary state-'+escapeHtml(model.state)+'">'+
    '<div class="sync-status-icon" aria-hidden="true">'+escapeHtml(icon)+'</div>'+
    '<div class="sync-status-title">'+escapeHtml(model.label)+'</div>'+
    '<div class="sync-status-time">最後完整同步 '+escapeHtml(model.lastComplete)+'</div>'+
    '<div class="sync-status-version">Schema '+escapeHtml(model.schemaVersion)+'／資料版本 '+escapeHtml(model.generationId)+'</div>'+
    '</div>';
  if(model.failedSheet){
    html+='<div class="sync-status-alert"><b>未同步 Sheet</b><span>'+escapeHtml(model.failedSheet)+'</span></div>';
  }
  if(model.failure){
    html+='<div class="sync-status-alert"><b>原因</b><span>'+escapeHtml(model.failure)+'</span></div>';
  }
  html+='<button class="sync-status-retry" onclick="retrySyncFromPanel(this)"'+(syncInFlight?' disabled':'')+'>立即重新同步</button>';
  if(body) body.innerHTML=html;
  return html;
}
```

- [ ] **Step 4: Center and restyle the sync panel**

Replace sync status CSS with:

```css
.sync-status-overlay{position:fixed;inset:0;z-index:120;background:rgba(6,32,38,.62);padding:12px;display:flex;align-items:center;justify-content:center}
.sync-status-panel{width:100%;max-width:480px;max-height:86vh;overflow:auto;background:var(--card);border-radius:16px;padding:16px;box-shadow:var(--shadow-lg)}
.sync-status-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.sync-status-head h2{font-size:18px}.sync-status-close{border:0;background:transparent;color:var(--ink-soft);font-size:26px;line-height:1;padding:5px}
.sync-status-summary{text-align:center;padding:10px 4px 14px}.sync-status-icon{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;background:var(--coral-bg);color:var(--coral);font-size:34px;font-weight:900}.sync-status-summary.state-online .sync-status-icon{background:#e8f4ed;color:var(--green)}.sync-status-summary.state-syncing .sync-status-icon{animation:spin 1s linear infinite}
.sync-status-title{font-size:20px;font-weight:900;color:var(--ink)}.sync-status-time{font-size:13px;color:var(--ink-soft);margin-top:6px}.sync-status-version{font-size:11px;color:var(--ink-faint);margin-top:4px;overflow-wrap:anywhere}
.sync-status-alert{display:grid;gap:3px;border-top:1px solid var(--line);padding:10px 0;font-size:13px}.sync-status-alert b{color:var(--coral)}.sync-status-alert span{color:var(--ink);overflow-wrap:anywhere}
.sync-status-retry{width:100%;min-height:44px;border:0;border-radius:10px;background:var(--sea);color:#fff;font:inherit;font-weight:800;margin-top:12px}.sync-status-retry:disabled{opacity:.5}
```

Delete the old mobile-bottom alignment and the `@media (min-width:620px)` override.

- [ ] **Step 5: Update Header healthy copy**

In `setSyncState()` change:

```js
else if(state==='online'){ txt.textContent='✓ 已同步'; }
```

Keep syncing, offline, builtin, and failed visual classes.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```powershell
node tests/atomic-sheet-sync.test.js
```

Expected: `atomic sheet sync tests passed`.

- [ ] **Step 7: Commit validator and sync UI**

```powershell
git add -- validator.js index.html
git commit -m "feat: simplify sync status"
```

---

### Task 3: Retire iOS gesture logging and restyle trip reset

**Files:**
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: the approved diagnostic retirement design.
- Produces: no gesture diagnostic listeners/UI while preserving the peach panel, Scroll-only, and viewport recovery.

- [ ] **Step 1: Replace the gesture diagnostic test with retirement assertions**

Replace `tests/ios-gesture-diagnostics.test.js` with:

```js
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

[
  'gestureTargetSummary','gestureComputedTouchAction','gestureViewportSnapshot',
  'createGestureDiagnostics','setupGestureDiagnostics','runtimeViewportMeta',
  'gestureEnvironmentSnapshot','formatGestureDiagnostics','gestureDiagnosticReport',
  'renderGestureDiagnosticsBody','refreshGestureDiagnostics',
  'clearGestureDiagnostics','copyGestureDiagnostics'
].forEach(function(name){
  assert.doesNotMatch(html,new RegExp('function '+name+'\\\\('),name+' is retired');
});

assert.doesNotMatch(html,/IOS_GESTURE_DIAGNOSTICS/);
assert.doesNotMatch(html,/diagGestureBody|diag-gesture-log|iOS 手勢診斷/);
assert.doesNotMatch(html,/複製手勢診斷報告|清除手勢事件/);
assert.match(html,/function setupDiagnostics\\(/,'peach diagnostic panel remains');
assert.match(html,/function setupViewportReflow\\(/,'viewport recovery remains');
assert.match(html,/function resetTripProgress\\(/,'trip reset remains');
assert.match(
  html,
  /button\\[onclick="resetTripProgress\\(\\)"\\]\\{[^}]*border-radius:[^;}]+;[^}]*background:var\\(--coral\\)[^}]*color:#fff/,
  'trip reset is rounded red with white text'
);

const openStart=html.indexOf('function openDiagnostics(');
const openEnd=html.indexOf('function setupDiagnostics(',openStart);
const openSource=html.slice(openStart,openEnd);
assert.match(openSource,/>健康檢查</);
assert.match(openSource,/>時間模擬</);
assert.match(openSource,/>行程進度</);
assert.doesNotMatch(openSource,/>同步狀態|>版本|iOS 手勢診斷/);

console.log('iOS gesture diagnostics retirement tests passed');
```

- [ ] **Step 2: Update the zoom guard publication assertions**

In `tests/ios-zoom-guard.test.js`:

- Keep form-size, Scroll-only, removed pinch/double-tap helpers, peach diagnostics, viewport recovery, nonpersistent viewport, SW v13, and focus recovery assertions.
- Delete assertions requiring `SW okayama-trip-v13` in diagnostics, `gestureEnvironmentSnapshot()`, `APP_BUILD`, and diagnostic ES5 functions.
- Add:

```js
assert.doesNotMatch(html,/var APP_BUILD=/,'unused diagnostic build metadata is retired');
assert.doesNotMatch(html,/setupGestureDiagnostics|IOS_GESTURE_DIAGNOSTICS/,'gesture event collection is retired');
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```powershell
node tests/ios-gesture-diagnostics.test.js
node tests/ios-zoom-guard.test.js
```

Expected: FAIL because gesture functions, listeners, APP metadata, UI, and the old reset style still exist.

- [ ] **Step 4: Remove retired production code**

From `index.html` delete:

- `.diag-gesture-log` CSS.
- `var APP_BUILD=...`.
- Every function from `gestureTargetSummary()` through `copyGestureDiagnostics()`.
- `setupGestureDiagnostics(document,window,IOS_GESTURE_DIAGNOSTICS);`.

Do not remove `setupDiagnostics()` or viewport recovery functions/listeners.

- [ ] **Step 5: Simplify `openDiagnostics()`**

Remove the per-Sheet sync string and render only:

```js
function openDiagnostics(){
  closeDiagnostics();
  var sim=lsGet('trip_time_simulation',null), findings=healthCheck()||[], el=document.createElement('div');
  el.id='diagnosticOverlay';
  el.className='diag-overlay';
  var simValue=sim&&sim.mode==='custom'?sim.value:'';
  var days=(DB.trip&&DB.trip.days||[]).map(function(_,i){
    return '<button onclick="setTimeSimulationDay('+i+')">Day '+(i+1)+'</button>';
  }).join('');
  el.innerHTML='<div class="diag-panel"><div class="diag-head"><h2>診斷面板</h2><button class="diag-close" onclick="closeDiagnostics()">×</button></div>'+
    '<div class="diag-section"><h3>健康檢查</h3><div class="diag-row">'+(findings.length?escapeHtml(findings.join('；')):'正常')+'</div></div>'+
    '<div class="diag-section"><h3>時間模擬</h3><div class="diag-row">'+(isTimeSimulationActive()?'模擬中：目前模擬時間 '+appNow().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'（行走中）':'依手機時間')+'</div><input id="diagTime" type="datetime-local" value="'+escapeHtml(simValue||'')+'"><div class="diag-shortcuts">'+days+'</div><div class="diag-actions"><button class="primary" onclick="setTimeSimulation()">套用並開始模擬</button></div><button onclick="endTimeSimulation(true)">結束模擬——還原測試前狀態</button><div class="diag-help">還原進入模擬前的打卡與略過狀態。</div><button onclick="endTimeSimulation(false)">結束模擬——保留測試變更</button><div class="diag-help">保留模擬期間的打卡與略過狀態。</div></div>'+
    '<div class="diag-section"><h3>行程進度</h3><button onclick="resetTripProgress()">重置行程進度</button><div class="diag-help">僅清除打卡與略過，需雙重確認。</div></div></div>';
  document.body.appendChild(el);
}
```

- [ ] **Step 6: Restyle the reset button**

Replace its CSS rule with:

```css
.diag-panel button[onclick="resetTripProgress()"]{min-height:44px;font-size:15px;width:100%;margin-top:6px;border:1px solid var(--coral);border-radius:10px;background:var(--coral);color:#fff;font-weight:800}
```

- [ ] **Step 7: Run both tests and verify GREEN**

Run:

```powershell
node tests/ios-gesture-diagnostics.test.js
node tests/ios-zoom-guard.test.js
```

Expected:

```text
iOS gesture diagnostics retirement tests passed
iOS zoom guard tests passed
```

- [ ] **Step 8: Commit diagnostic retirement**

```powershell
git add -- index.html tests/ios-gesture-diagnostics.test.js tests/ios-zoom-guard.test.js
git commit -m "refactor: retire gesture diagnostics"
```

---

### Task 4: Update governance and run full verification

**Files:**
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/backlog.md`
- Modify: `tests/README.md`
- Test: all `tests/*.test.js`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: current documentation and repository-wide verification evidence.

- [ ] **Step 1: Update the UI gesture guidance**

Replace the permanent diagnostic-collection bullet with:

```markdown
- 常態版本不收集 touch、gesture、dblclick 或 visualViewport 診斷事件；若手勢問題再次發生，須另行發布只使用 passive listener、最多保存 24 筆且不記錄輸入值或完整 URL 的獨立 Dev 診斷版。
```

- [ ] **Step 2: Update the quality backlog**

Change the hidden debug-panel bullet to:

```markdown
- 隱藏除錯面板(AppLog 環形緩衝 + healthCheck + 複製全部);常態診斷面板已移除同步、版本與 iOS 事件區,本待辦只處理尚未完成的 AppLog 除錯能力
```

- [ ] **Step 3: Add the Changelog entry**

Add:

```markdown
## 2026-07-16 — 診斷面板與同步狀態簡化（Dev）
- Places 官網空白不再產生 `OPTIONAL_EMPTY` 警告;健康檢查與同步狀態只保留具處理價值的資料問題。
- 同步狀態視窗改為置中簡版:正常顯示勾勾、最後同步時間、Schema／資料版本與重試;異常時才顯示失敗 Sheet 與安全摘要。
- 常態版本完整移除 iOS 手勢事件 listener、24 筆 buffer、報告框與複製／清除操作;Scroll-only、viewport 回復與桃子診斷入口維持。
- 診斷面板只保留健康檢查、時間模擬與行程進度;重置行程進度改為圓弧紅底白字並保留雙重確認。
```

- [ ] **Step 4: Update the test index**

Change `tests/README.md` so `ios-gesture-diagnostics.test.js` describes retirement coverage rather than event capture.

- [ ] **Step 5: Run full verification**

Run every `tests/*.test.js`, then:

```powershell
node tools/check-doc-titles.js
@'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(function(match){return match[1];})
  .filter(function(script){return script.trim();});
scripts.forEach(function(script){new Function(script);});
console.log('inline JavaScript syntax passed ('+scripts.length+' scripts)');
'@ | node -
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit governance updates**

```powershell
git add -- 04_UI_GUIDELINES.md 07_CHANGELOG.md tasks/backlog.md tests/README.md
git commit -m "docs: record diagnostics simplification"
```

