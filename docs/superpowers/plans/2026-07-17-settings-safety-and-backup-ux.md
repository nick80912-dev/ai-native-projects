# Settings Safety and Backup UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ledger test mode unmistakable, streamline Settings and personal-state backup, and reduce repeated ledger category taps without changing any cloud or backup-data contract.

**Architecture:** Keep the existing single-file App architecture. Add small UI helpers beside the current Settings and ledger functions, retain the existing version-1 personal-state payload and validation, and store the sticky ledger category only in the existing in-memory draft variable. Cover behavior with focused Node VM/source-contract tests before changing production code.

**Tech Stack:** Static HTML/CSS/ES5-compatible JavaScript, localStorage, Clipboard API with an in-App manual fallback, Node.js `assert`/`vm` tests, Service Worker app-shell cache.

## Global Constraints

- Work on `dev`; run `git fetch origin`, require `HEAD == origin/dev`, and require a clean working tree before implementation. The approved design-only commit may first need to be pushed or otherwise reconciled with `origin/dev`; do not discard it.
- Do not use `AbortController`, `preventDefault`, viewport-meta changes, gesture guards, or touch-action changes.
- Keep the four-tab structure, diagnostic panel, theme placeholder, CMS pre-trip expense block, ledger calculations, schemas, Apps Script contract, and storage keys unchanged.
- Keep internal keys exactly `Exchange Rate` and `Ledger Default Currency`; localize only their visible Settings labels.
- Keep the personal-state payload at `format: 'trip-personal-state'`, `version: 1`, with the existing `checks`, `wants`, `member`, and `ledgerQueue` content.
- Do not persist the ledger category. Each fresh App start defaults to `餐飲`; the current App session retains the last selected category.
- Change `sw.js` only from `okayama-trip-v16` to `okayama-trip-v17`.
- Do not create `package.json` and do not modify `schema.js`, `validator.js`, `apps-script/`, ADRs, protected project documents, icons, `manifest.webmanifest`, `netlify.toml`, or `tools/`.
- Implementation file scope is `index.html`, `sw.js`, directly relevant tests, `07_CHANGELOG.md`, `tasks/current.md`, and `.ai-manifest.json`.
- Do not push or merge to `main`.

## File Map

- Modify `index.html`: Settings labels/layout, test-mode navigation and banner, category draft default/retention, clipboard export, restore/fallback overlays, and related CSS.
- Modify `tests/ledger-entry-settings.test.js`: source and state-contract tests for labels, test mode, member row, and category continuity.
- Create `tests/settings-backup-ux.test.js`: focused VM tests for clipboard success/failure and restore overlay behavior.
- Modify `sw.js`: cache name only.
- Modify `07_CHANGELOG.md`: record the five UX changes and unchanged contracts.
- Modify `tasks/current.md`: replace the pending design item with final browser acceptance criteria.
- Modify `.ai-manifest.json`: update the current status summary without changing invariants or CMS definitions.

---

### Task 1: Ledger and Settings Safety Controls

**Files:**
- Modify: `tests/ledger-entry-settings.test.js`
- Modify: `index.html:492-498`
- Modify: `index.html:3080-3085`
- Modify: `index.html:3119`
- Modify: `index.html:3141-3155`
- Modify: `index.html:3209-3225`
- Modify: `index.html:3235-3251`

**Interfaces:**
- Consumes: `openSettings()`, `setLedgerTestMode(input)`, `renderSplit()`, `selectLedgerCategory(value)`, and `addLedgerExpense()`.
- Produces: `openSettings(targetId)`, stable target `ledgerTestModeSection`, warning action `openSettings('ledgerTestModeSection')`, initial `ledgerDraftCategory === '餐飲'`, and session-retained category state.

- [ ] **Step 1: Extend the source-contract test first**

Add assertions to `tests/ledger-entry-settings.test.js` after the existing Settings and Split assertions:

```javascript
assert(settingsSource.includes('>匯率<'),'Settings shows the localized exchange-rate label');
assert(settingsSource.includes('1 日幣可換算多少台幣'),'Settings explains the exchange-rate direction');
assert(settingsSource.includes('>預設輸入幣別<'),'Settings shows the localized default-currency label');
assert(settingsSource.includes('新增記帳時預先選擇的幣別'),'Settings explains the default input currency');
assert(!settingsSource.includes('Exchange Rate（'),'Settings does not expose the internal Exchange Rate key as a label');
assert(!settingsSource.includes('Ledger Default Currency（'),'Settings does not expose the internal default-currency key as a label');
assert(settingsSource.includes('settings-member-row'),'member identity and switch use the compact row');
assert(settingsSource.includes('ledgerTestModeSection'),'test mode has a stable Settings target');
assert(settingsSource.includes('僅分帳用'),'Settings labels test mode as ledger-only');
assert(splitSource.includes('⚠ 測試模式中'),'Split renders the test-mode warning');
assert(splitSource.includes('此頁新增的記帳不會列入彙算'),'Split explains that test entries are excluded');
assert(splitSource.includes("openSettings('ledgerTestModeSection')"),'warning opens Settings at test mode');
assert(html.includes("var ledgerDraftCategory=LEDGER_CATEGORIES[0]"),'fresh App sessions default category to 餐飲');
assert(!entrySource.includes("ledgerDraftCategory=''"),'successful entry retains the current category');
```

Also add a function-source assertion showing that the toggle rerenders Split:

```javascript
const testModeSource = html.slice(html.indexOf('function setLedgerTestMode('),html.indexOf('function selectLedgerDefaultCurrency('));
assert(testModeSource.includes('renderSplit()'),'test-mode changes immediately rerender Split');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node tests/ledger-entry-settings.test.js
```

Expected: exit code `1`, first failing assertion reports a missing localized label or compact member row.

- [ ] **Step 3: Add focused CSS without changing theme variables**

Add beside the existing Settings/ledger CSS:

```css
.settings-member-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.settings-member-row .settings-current{margin-bottom:0;min-width:0}
.settings-member-switch{min-height:36px;padding:6px 11px;flex:0 0 auto}
.settings-warning-tag{display:inline-flex;margin-left:6px;border-radius:999px;padding:2px 7px;background:#fff0e8;color:var(--coral);font-size:11px;font-weight:900;vertical-align:middle}
.ledger-test-warning{background:#fff3e8;color:#793b20;border:1px solid #efb28e;border-radius:12px;padding:12px;margin-bottom:12px}
.ledger-test-warning strong{display:block;color:var(--coral);margin-bottom:3px}
.ledger-test-warning .btn{margin-top:9px}
```

Do not change existing `.ledger-choice.on`, touch-action, Scroll-only, viewport, or gesture rules.

- [ ] **Step 4: Localize Settings and compact the member row**

Change the generated member section to the following structure while retaining the existing selector call:

```javascript
'<div class="settings-section"><h3>成員身分</h3><div class="settings-member-row"><div class="settings-current">目前身分：<b id="settingsCurrentMember">'+escapeHtml(getCurrentMember()||'尚未選擇')+'</b></div><button class="btn ghost settings-member-switch" onclick="openMemberSelector(false)">切換</button></div></div>'+
```

Change only the visible cloud-setting labels:

```html
<label class="settings-help" for="ledgerExchangeRate"><b>匯率</b><br>1 日幣可換算多少台幣</label>
<div class="settings-help"><b>預設輸入幣別</b><br>新增記帳時預先選擇的幣別</div>
```

Leave `DB.cfg.exchangeRate`, `ledgerDefaultCurrency`, Apps Script payloads, and internal TripConfig keys unchanged.

- [ ] **Step 5: Add test-mode targeting and immediate rerender**

Change the signature from `function openSettings(){` to `function openSettings(targetId){`. Immediately after the existing `document.body.appendChild(overlay);` line, insert:

```javascript
if(targetId){
  setTimeout(function(){
    var target=document.getElementById(targetId);
    if(!target)return;
    target.scrollIntoView({block:'center'});
    var input=target.querySelector('input');
    if(input)input.focus();
  },0);
}
```

Give the existing test-mode section the stable ID and warning tag:

```javascript
'<div class="settings-section" id="ledgerTestModeSection"><div class="toggle-row"><div><h3>測試模式<span class="settings-warning-tag">僅分帳用</span></h3><div class="settings-help">寫入明細加上 [TEST],且不納入彙算。</div></div><input type="checkbox" '+(lsGet('trip_ledger_test_mode',false)?'checked':'')+' onchange="setLedgerTestMode(this)"></div></div>'+
```

Update the toggle without changing its storage key:

```javascript
function setLedgerTestMode(input){
  lsSet('trip_ledger_test_mode',!!input.checked);
  renderSplit();
  toast(input.checked?'測試模式已開啟':'測試模式已關閉');
}
```

- [ ] **Step 6: Render the test warning as the first Split content block**

Build the warning immediately before assigning `view.innerHTML`:

```javascript
var testWarning=lsGet('trip_ledger_test_mode',false)?'<div class="ledger-test-warning"><strong>⚠ 測試模式中</strong><div>此頁新增的記帳不會列入彙算</div><button class="btn coral" onclick="openSettings(\'ledgerTestModeSection\')">前往設定關閉</button></div>':'';
```

In the existing Split assignment, change the exact prefix `view.innerHTML=legacy+` to `view.innerHTML=testWarning+legacy+`. Do not alter the remainder of that assignment.

Do not change `[TEST]` prefixing, TEST record tags, or summary exclusion.

- [ ] **Step 7: Implement session-only category continuity**

Initialize from the fixed category array:

```javascript
var LEDGER_CATEGORIES=['餐飲','交通','票卷','購物','其他','代墊'];
var ledgerDraftCategory=LEDGER_CATEGORIES[0];
```

In the resolved branch of the Promise returned by `ledgerRepository.add`, remove only the category reset. Retain the currency reset and current render/toast behavior:

```javascript
return promise.then(function(result){ledgerDraftCurrency='';renderSplit();toast(result.ok?'已同步':'已記錄,待連網同步');return result;},function(error){renderSplit();toast(error.message||'記帳失敗');throw error;});
```

Do not add a localStorage key. Keep the defensive `請選擇類別` validation for invalid programmatic state.

- [ ] **Step 8: Run the focused test and verify GREEN**

Run:

```powershell
node tests/ledger-entry-settings.test.js
```

Expected: exit code `0` and `ledger entry settings tests passed`.

- [ ] **Step 9: Commit the independently working safety controls**

```powershell
git add -- index.html tests/ledger-entry-settings.test.js
git commit -m "feat: improve ledger safety and entry defaults"
```

Expected: commit succeeds with only the two listed files.

---

### Task 2: Clipboard Backup and Restore Overlay

**Files:**
- Create: `tests/settings-backup-ux.test.js`
- Modify: `index.html:490-496`
- Modify: `index.html:3105-3118`
- Modify: `index.html:3151`

**Interfaces:**
- Consumes: existing `lsGet`, `lsSet`, `ledgerRepository.queuedRecords()`, `validateLedgerRecord`, `normalizeLedgerRecord`, `memberIsAllowed`, `renderAll`, `updateLedgerPendingStatus`, `ledgerRepository.flushQueue()`, and `toast`.
- Produces: `personalStateJson() -> string`, `copyPersonalStateText(text) -> Promise`, `exportPersonalState() -> Promise`, `openPersonalStateRestore()`, `openPersonalStateCopyFallback(text)`, `retryPersonalStateCopy()`, `closePersonalStateDialog()`, and existing `restorePersonalState()` reading from the on-demand restore field.

- [ ] **Step 1: Create a focused failing VM test**

Create `tests/settings-backup-ux.test.js` with this complete focused harness:

```javascript
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values=Object.assign({},initial);
  let failKey='';
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){if(key===failKey){failKey='';throw new Error('storage denied');}values[key]=String(value);},
    removeItem(key){delete values[key];},
    snapshot(){return JSON.stringify(values);},
    failOnceOn(key){failKey=key;}
  };
}

(async function(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('function closeSettings()');
  const end=html.indexOf('function setLedgerTestMode(',start);
  assert(start>=0&&end>start,'personal-state helper section is present');
  const helperSource=html.slice(start,end);
  const settingsSource=html.slice(html.indexOf('function openSettings('),html.indexOf('function mergedLedgerRecords()'));
  const storage=createStorage({
    trip_checks:JSON.stringify({P001:true}),
    trip_shop_wants:JSON.stringify({S001:true}),
    trip_member:'黃柏'
  });
  const box={value:'',focus(){},select(){}};
  const copied=[];
  let lastToast='';
  let fallbackText='';
  let dialogCloses=0;
  let settingsCloses=0;
  let renders=0;
  let pendingUpdates=0;
  let flushes=0;
  const queued=[{id:'1-abcd',time:'2026-07-17T10:00:00.000Z',member:'黃柏',category:'餐飲',detail:'午餐',amountJpy:1000,amountTwd:200,note:''}];
  const sandbox={
    console,
    localStorage:storage,
    navigator:{clipboard:{writeText(text){copied.push(text);return Promise.resolve();}}},
    document:{getElementById(id){return id==='personalStateBox'?box:null;}},
    ledgerRepository:{queuedRecords(){return queued;},flushQueue(){flushes++;return Promise.resolve();}},
    LEDGER_QUEUE_KEY:'trip_ledger_queue',
    timestampDate(value){return new Date(value);},
    getCurrentMember(){return storage.getItem('trip_member')||'';},
    lsGet(key,fallback){const value=storage.getItem(key);return value===null?fallback:JSON.parse(value);},
    lsSet(key,value){storage.setItem(key,JSON.stringify(value));},
    memberIsAllowed(value){return value==='黃柏';},
    normalizeLedgerRecord(record){return record;},
    validateLedgerRecord(){return true;},
    renderAll(){renders++;},
    updateLedgerPendingStatus(){pendingUpdates++;},
    toast(message){lastToast=message;},
    escapeHtml(value){return String(value);},
    Date,
    Math,
    Promise,
    JSON,
    String,
    Number,
    isFinite,
    setTimeout,
    clearTimeout
  };
  vm.createContext(sandbox);
  vm.runInContext(helperSource,sandbox);
  sandbox.openPersonalStateCopyFallback=function(text){fallbackText=text;};
  sandbox.closePersonalStateDialog=function(){dialogCloses++;};
  sandbox.closeSettings=function(){settingsCloses++;};

  await sandbox.exportPersonalState();
  const exported=JSON.parse(copied[0]);
  assert.strictEqual(exported.format,'trip-personal-state');
  assert.strictEqual(exported.version,1);
  assert.deepStrictEqual(Object.keys(exported).sort(),['checks','exportedAt','format','ledgerQueue','member','version','wants'].sort());
  assert.strictEqual(lastToast,'備份 JSON 已複製，請保存到安全位置');

  sandbox.navigator.clipboard.writeText=function(){return Promise.reject(new Error('denied'));};
  await sandbox.exportPersonalState();
  assert.strictEqual(JSON.parse(fallbackText).format,'trip-personal-state','clipboard failure preserves the generated JSON');

  assert(!settingsSource.includes('id="personalStateBox"'),'normal Settings has no persistent JSON textarea');
  assert(settingsSource.includes('openPersonalStateRestore()'),'restore button opens the on-demand dialog');
  assert(helperSource.includes('>取消</button>'),'restore dialog exposes a cancel action');

  box.value='{';
  const beforeInvalid=storage.snapshot();
  sandbox.restorePersonalState();
  assert.strictEqual(storage.snapshot(),beforeInvalid,'malformed JSON writes nothing');
  assert.strictEqual(box.value,'{','malformed input remains available for correction');
  assert.strictEqual(lastToast,'JSON 格式錯誤');

  box.value=JSON.stringify({format:'trip-personal-state',version:1,checks:{P002:true},wants:{S002:true},member:'黃柏',ledgerQueue:queued});
  const beforeStorageFailure=storage.snapshot();
  storage.failOnceOn('trip_shop_wants');
  sandbox.restorePersonalState();
  assert.strictEqual(storage.snapshot(),beforeStorageFailure,'storage failure rolls back every personal-state key');
  assert.strictEqual(lastToast,'本機資料還原失敗');

  sandbox.restorePersonalState();
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_checks')),{P002:true});
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_shop_wants')),{S002:true});
  assert.strictEqual(storage.getItem('trip_member'),'黃柏');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_queue')),queued);
  assert.strictEqual(dialogCloses,1);
  assert.strictEqual(settingsCloses,1);
  assert.strictEqual(renders,1);
  assert.strictEqual(pendingUpdates,1);
  assert.strictEqual(flushes,1);

  console.log('settings backup UX tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
node tests/settings-backup-ux.test.js
```

Expected: exit code `1` because `personalStateJson`, the on-demand dialogs, or clipboard behavior do not exist.

- [ ] **Step 3: Add dialog CSS using the existing overlay conventions**

Add:

```css
.state-dialog-overlay{z-index:140;background:rgba(247,245,238,.98)}
.state-dialog-panel{padding-top:18px}
.state-dialog-copy{width:100%;min-height:180px;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;font-size:13px;resize:vertical;background:#fff}
```

The normal Settings panel must no longer contain `.state-box` or `personalStateBox`. The ID `personalStateBox` exists only inside the on-demand restore or fallback dialog.

- [ ] **Step 4: Separate JSON generation from clipboard delivery**

Replace the existing export function with:

```javascript
function personalStateJson(){
  var payload={format:'trip-personal-state',version:1,exportedAt:timestampDate(Date.now()).toISOString(),checks:lsGet('trip_checks',{}),wants:lsGet('trip_shop_wants',{}),member:getCurrentMember(),ledgerQueue:ledgerRepository.queuedRecords()};
  return JSON.stringify(payload,null,2);
}
function copyPersonalStateText(text){
  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function')return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('clipboard unavailable'));
}
function exportPersonalState(){
  var text=personalStateJson();
  return copyPersonalStateText(text).then(function(){toast('備份 JSON 已複製，請保存到安全位置');},function(){openPersonalStateCopyFallback(text);});
}
```

Do not add cloud settings, test mode, time simulation, or cloud ledger rows to the payload.

- [ ] **Step 5: Add on-demand dialog helpers**

Implement a shared close helper and two explicit dialog constructors:

```javascript
function closePersonalStateDialog(){var overlay=document.getElementById('personalStateDialog');if(overlay)overlay.remove();}
function openPersonalStateCopyFallback(text){
  closePersonalStateDialog();
  var overlay=document.createElement('div');
  overlay.id='personalStateDialog';overlay.className='settings-overlay state-dialog-overlay';overlay.setAttribute('data-dialog-kind','copy-fallback');
  overlay.innerHTML='<section class="settings-panel state-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="personalStateDialogTitle"><div class="settings-head"><h2 id="personalStateDialogTitle">手動複製備份</h2><button class="settings-close" aria-label="關閉" onclick="closePersonalStateDialog()">×</button></div><p class="settings-help">無法自動存取剪貼簿，請複製下方完整 JSON。</p><textarea class="state-dialog-copy" id="personalStateBox" readonly>'+escapeHtml(text)+'</textarea><div class="settings-actions"><button class="btn ghost" onclick="closePersonalStateDialog()">關閉</button><button class="btn" onclick="retryPersonalStateCopy()">再次複製</button></div></section>';
  document.body.appendChild(overlay);
  var box=document.getElementById('personalStateBox');if(box){box.focus();box.select();}
}
function openPersonalStateRestore(){
  closePersonalStateDialog();
  var overlay=document.createElement('div');
  overlay.id='personalStateDialog';overlay.className='settings-overlay state-dialog-overlay';overlay.setAttribute('data-dialog-kind','restore');
  overlay.innerHTML='<section class="settings-panel state-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="personalStateDialogTitle"><div class="settings-head"><h2 id="personalStateDialogTitle">從 JSON 還原</h2><button class="settings-close" aria-label="關閉" onclick="closePersonalStateDialog()">×</button></div><p class="settings-help">還原會覆蓋目前裝置上的打卡、想逛、身分及待同步記帳。</p><textarea class="state-dialog-copy" id="personalStateBox" placeholder="貼上備份 JSON"></textarea><div class="settings-actions"><button class="btn ghost" onclick="closePersonalStateDialog()">取消</button><button class="btn" onclick="restorePersonalState()">驗證並還原</button></div></section>';
  document.body.appendChild(overlay);
  var box=document.getElementById('personalStateBox');if(box)box.focus();
}
```

Implement retry with the visible fallback textarea as its source:

```javascript
function retryPersonalStateCopy(){
  var box=document.getElementById('personalStateBox');
  var text=box?box.value:'';
  return copyPersonalStateText(text).then(function(){
    closePersonalStateDialog();
    toast('備份 JSON 已複製，請保存到安全位置');
  },function(){
    if(box){box.focus();box.select();}
    toast('仍無法存取剪貼簿，請手動複製');
  });
}
```

- [ ] **Step 6: Preserve validation and make restore all-or-nothing**

Keep every existing validation before the first storage write. On invalid input, return without closing the dialog or clearing the textarea. Add a transactional local-state helper before `restorePersonalState()`:

```javascript
function applyPersonalStatePayload(payload){
  var keys=['trip_checks','trip_shop_wants','trip_member',LEDGER_QUEUE_KEY];
  var before=keys.map(function(key){return {key:key,value:localStorage.getItem(key)};});
  try{
    lsSet('trip_checks',payload.checks);
    lsSet('trip_shop_wants',payload.wants);
    localStorage.setItem('trip_member',String(payload.member));
    localStorage.setItem(LEDGER_QUEUE_KEY,JSON.stringify(payload.ledgerQueue));
  }catch(error){
    before.forEach(function(item){
      if(item.value===null)localStorage.removeItem(item.key);
      else localStorage.setItem(item.key,item.value);
    });
    throw error;
  }
}
```

After all format and record validation succeeds, replace the four direct writes with:

```javascript
try{applyPersonalStatePayload(payload);}catch(error){toast('本機資料還原失敗');return;}
```

On success, close the nested dialog before Settings:

```javascript
closePersonalStateDialog();
closeSettings();
renderAll();
updateLedgerPendingStatus();
ledgerRepository.flushQueue();
toast('個人狀態已還原');
```

Do not weaken the format/version/member/queue/record checks.

- [ ] **Step 7: Replace the normal Settings backup section**

Use exactly:

```html
<div class="settings-section"><h3>本機資料備份／還原</h3><div class="settings-help">換手機、重裝 App 或清除瀏覽器資料前使用。還原會覆蓋目前裝置上的打卡、想逛、身分及待同步記帳。</div><div class="settings-actions"><button class="btn ghost" onclick="exportPersonalState()">複製備份 JSON</button><button class="btn" onclick="openPersonalStateRestore()">從 JSON 還原</button></div></div>
```

- [ ] **Step 8: Run both focused tests and verify GREEN**

Run:

```powershell
node tests/settings-backup-ux.test.js
node tests/ledger-entry-settings.test.js
```

Expected: both exit `0`; the new test prints `settings backup UX tests passed`, and the existing test prints `ledger entry settings tests passed`.

- [ ] **Step 9: Commit the independently working backup flow**

```powershell
git add -- index.html tests/settings-backup-ux.test.js
git commit -m "feat: streamline personal state backup and restore"
```

Expected: commit succeeds with only the two listed files.

---

### Task 3: Cache, Delivery Documents, and Full Verification

**Files:**
- Modify: `sw.js:1`
- Modify: `07_CHANGELOG.md:1`
- Modify: `tasks/current.md:1-20`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: the completed behavior and focused tests from Tasks 1 and 2.
- Produces: SW cache `okayama-trip-v17`, an auditable changelog/current-state record, and final verification evidence.

- [ ] **Step 1: Bump only the Service Worker cache name**

Change:

```javascript
const CACHE_NAME = 'okayama-trip-v16';
```

to:

```javascript
const CACHE_NAME = 'okayama-trip-v17';
```

Run:

```powershell
git diff -- sw.js
```

Expected: exactly one changed line containing v16 → v17.

- [ ] **Step 2: Record the completed decision delivery**

Add a top `2026-07-17` changelog entry, without an architecture-star marker, covering these exact facts:

```markdown
## 2026-07-17 — 分帳安全提示與設定備份 UX
- 設定頁改用「匯率」「預設輸入幣別」中文標籤；內部 TripConfig 契約鍵不變。
- 測試模式在設定頁標示「僅分帳用」，開啟時分帳頁頂部顯示橘紅警示，可直達設定關閉並立即更新畫面。
- 成員身分切換改為行內小按鈕；首筆分帳類別預設餐飲，同次開啟期間沿用上一筆類別且不寫入 localStorage。
- 本機資料備份改為自動複製完整 JSON；剪貼簿失敗提供手動複製 overlay，還原欄位僅在需要時開啟。
- Service Worker cache 更新為 `okayama-trip-v17`；本批未修改 Schema、validator、Apps Script、CMS 或個人狀態 JSON 契約。
```

Update `tasks/current.md` so the acceptance list contains 390px layout, test warning navigation/removal, category continuity/reset-on-reload, clipboard success/fallback, restore validation, and real-device clipboard QA. Remove any sentence saying this batch is awaiting design or Tier 2 approval.

Update `.ai-manifest.json` while keeping valid JSON:

- keep `updated` at exact date `2026-07-17`;
- append the completed Settings/test-mode/backup/category behavior as one new string in `status.done`;
- do not alter `cms.sheets`, `invariants_never_break`, or `known_traps`.

- [ ] **Step 3: Run every Node test individually**

Run:

```powershell
$failed=@(); Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object { node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; if($failed.Count){Write-Error ('Failed: '+($failed -join ', ')); exit 1}
```

Expected: every test exits `0`; final command exits `0`.

- [ ] **Step 4: Run static and document validation**

Run:

```powershell
node tools/check-doc-titles.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON valid')"
git diff --check
if(Test-Path package.json){throw 'package.json must not exist'}
```

Expected: document-title check exits `0`, `manifest JSON valid`, no whitespace errors, and no package file.

- [ ] **Step 5: Perform 390px browser QA**

Serve the workspace using the repository's existing local static-server method and verify at 390px:

1. Settings shows Chinese labels and compact member switch without overflow.
2. Test mode on shows the warning as the first Split content block; `前往設定關閉` opens and centers/focuses the toggle; turning it off removes the warning immediately.
3. First category is `餐飲`; selecting `交通` and adding an online record keeps `交通`; adding offline keeps it; reload restores `餐飲`.
4. `複製備份 JSON` copies the complete parseable version-1 payload; simulated clipboard rejection opens the same JSON in the manual fallback.
5. Restore cancel changes nothing; malformed JSON remains visible and writes nothing; valid JSON restores and triggers queue flush.
6. Settings, Split, the other three tabs, and travel-date mock produce `pageerror = 0`.
7. Diagnostic panel has no retired gesture-report UI, and the passive no-op `dblclick` listener remains present.

Expected: all seven checks pass. Record any real-device-only clipboard limitation under `未驗證假設`; do not claim it was tested if only desktop emulation was used.

- [ ] **Step 6: Run healthCheck and inspect the final scope**

Run the App's existing `healthCheck()` in the browser against the normal production-data load.

Expected: empty issue list, Schema remains `2.5`, and all eight Sheets remain loaded according to the existing partial/atomic policy.

Then run:

```powershell
git status --short
git diff --name-only HEAD~2
git diff --check
```

Expected implementation paths only: `index.html`, `sw.js`, `tests/ledger-entry-settings.test.js`, `tests/settings-backup-ux.test.js`, `07_CHANGELOG.md`, `tasks/current.md`, and `.ai-manifest.json`. The already approved design/plan documents may appear in earlier planning commits, not as uncommitted implementation changes.

- [ ] **Step 7: Commit cache and delivery documentation**

```powershell
git add -- sw.js 07_CHANGELOG.md tasks/current.md .ai-manifest.json
git commit -m "docs: record settings safety UX rollout"
```

Expected: commit succeeds with exactly the four listed files.

- [ ] **Step 8: Produce the delivery report without pushing**

Report two sections:

- `已驗證`: focused tests, all tests, document titles, JSON parse, diff check, 390px desktop QA, page errors, offline/online category behavior, clipboard simulation, and healthCheck results actually observed.
- `未驗證假設`: physical iPhone clipboard permission/fallback and touch layout unless tested on a real device.

Include the implementation commit hashes, `git status --short --branch`, and rollback instruction: revert the implementation commits and bump SW beyond v17. Do not push until Bar explicitly requests it.
