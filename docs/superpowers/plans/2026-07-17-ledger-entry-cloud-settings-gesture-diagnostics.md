# Ledger Entry, Cloud Settings, and Gesture Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared TripConfig exchange settings, one-currency ledger entry with deterministic conversion, fixed category buttons, simplified member identity（成員身分）/sync UI, version-controlled Apps Script, and evidence-only iOS gesture diagnostics.

**Architecture:** TripConfig remains the cross-device settings SSoT and the existing Apps Script endpoint dispatches ledger appends versus settings updates. `index.html` keeps the current single-file module boundaries: pure conversion/settings helpers feed the ledger form, while a confirmed local bridge covers CSV publication delay. Gesture diagnostics restores the prior passive 24-event collector without altering viewport policy.

**Tech Stack:** Vanilla HTML/CSS/ES5-compatible JavaScript, Google Apps Script, Google Sheets published CSV, localStorage, Service Worker, Node `assert`/`vm` tests. No package manager.

## Global Constraints

- Work only on `dev`; do not merge or push `main`.
- Run the sync gate before edits: `git fetch origin dev`, require local `HEAD == origin/dev`, and require a clean working tree except the already-approved design/plan commits.
- Do not create `package.json` and do not use `AbortController`.
- Preserve four tabs, append-only ledger/reversal semantics, TEST exclusion, offline ledger queue, CMS pre-trip expense rendering, and the existing validator logging mechanism.
- Schema becomes `2.5 (2026-07-17)`; existing sheet GIDs and the eight-column ledger contract do not change.
- `Exchange Rate` means TWD per one JPY and must be finite and greater than zero.
- `Ledger Default Currency` is exactly `JPY` or `TWD`.
- Apps Script repository source is authoritative; deployed code must match `apps-script/ledger-sync.gs`.
- App writes are whitelisted to append-only `分帳紀錄` rows plus only the TripConfig keys `Exchange Rate` and `Ledger Default Currency`; all other CMS data remains Bar-managed and App-read-only.
- Gesture diagnostics is passive evidence collection only; do not restore the retired double-tap blocker or permanent viewport restrictions.
- Only `CACHE_NAME` changes in `sw.js`, to `okayama-trip-v15`.

---

### Task 1: Schema 2.5 and TripConfig validation

**Files:**
- Modify: `schema.js:15-154`
- Modify: `index.html:555-701`, embedded validator block, and built-in `cfg` CSV
- Modify: `validator.js:199-221`
- Modify: `tests/atomic-sheet-sync.test.js`
- Modify: `tests/schema-types.test.js`
- Modify: `09_SCHEMA_MAPPING.md`

**Interfaces:**
- Produces: `DB.cfg.exchangeRate: string`, `DB.cfg.ledgerDefaultCurrency: "JPY"|"TWD"`.
- Consumes: existing `parseKeyValue(csvText, "cfg")` and `schemaDoc()`.

- [ ] **Step 1: Write failing production-schema tests**

Add assertions that require version 2.5 and both keys:

```js
assert.strictEqual(schemaSandbox.SCHEMA.version,'2.5 (2026-07-17)');
const cfgKeys=schemaSandbox.SCHEMA.sheets.cfg.keys;
assert(cfgKeys.some(k=>k.field==='exchangeRate'&&k.header==='Exchange Rate'));
assert(cfgKeys.some(k=>k.field==='ledgerDefaultCurrency'&&k.header==='Ledger Default Currency'));
assert.match(htmlSource,/Exchange Rate,0\.2/);
assert.match(htmlSource,/Ledger Default Currency,JPY/);
```

Add validator cases to `tests/atomic-sheet-sync.test.js` expecting `CFG_EXCHANGE_RATE` for `0`, `-1`, and non-numeric input, plus `CFG_LEDGER_CURRENCY` for values other than JPY/TWD.

- [ ] **Step 2: Run RED**

Run: `node tests/atomic-sheet-sync.test.js && node tests/schema-types.test.js`

Expected: failure because Schema is 2.4 and the keys/validation do not exist.

- [ ] **Step 3: Add the two Schema keys and validation**

Add the same definitions to standalone and embedded Schema:

```js
{ field:'exchangeRate', header:'Exchange Rate', desc:'1 JPY 對應的 TWD 金額;必須大於 0' },
{ field:'ledgerDefaultCurrency', header:'Ledger Default Currency',
  values:{'JPY':'JPY','jpy':'JPY','TWD':'TWD','twd':'TWD'},
  desc:'分帳預設輸入幣別;只允許 JPY/TWD' }
```

Add to `validateSnapshotData` in `validator.js`, then copy the complete standalone validator into the embedded block to preserve exact parity:

```js
var exchangeRate=Number(cfg.exchangeRate);
if(!String(cfg.exchangeRate||'').trim()||!isFinite(exchangeRate)||exchangeRate<=0){
  block('CFG_EXCHANGE_RATE','cfg','TripConfig exchangeRate 必須是大於 0 的數字');
}
var ledgerCurrency=String(cfg.ledgerDefaultCurrency||'').trim().toUpperCase();
if(ledgerCurrency!=='JPY'&&ledgerCurrency!=='TWD'){
  block('CFG_LEDGER_CURRENCY','cfg','TripConfig ledgerDefaultCurrency 必須是 JPY 或 TWD');
}
```

Set both Schema versions to `2.5 (2026-07-17)` and append to built-in cfg:

```csv
Exchange Rate,0.2
Ledger Default Currency,JPY
```

- [ ] **Step 4: Regenerate mapping and run GREEN**

Regenerate only the generated table area of `09_SCHEMA_MAPPING.md` with `schemaDoc()`. Run:

```powershell
node tests/atomic-sheet-sync.test.js
node tests/schema-types.test.js
node tools/check-doc-titles.js
```

Expected: all exit 0 and embedded/standalone parity passes.

- [ ] **Step 5: Commit**

```powershell
git add schema.js validator.js index.html 09_SCHEMA_MAPPING.md tests/atomic-sheet-sync.test.js tests/schema-types.test.js
git commit -m "feat: add shared ledger currency settings schema"
```

---

### Task 2: Version-controlled Apps Script and settings contract

**Files:**
- Create: `apps-script/ledger-sync.gs`
- Create: `apps-script/README.md`
- Create: `tests/apps-script-settings.test.js`

**Interfaces:**
- Consumes: Sheet names `分帳紀錄` and `TripConfig`.
- Produces: legacy ledger responses plus `updateSettings` response `{ok:true,settings:{exchangeRate,defaultCurrency}}`.

- [ ] **Step 1: Write the failing Apps Script behavior test**

Use `vm` with fake `LockService`, `ContentService`, `SpreadsheetApp`, ledger sheet, and key/value sheet. Assert:

```js
const updated=JSON.parse(call({action:'updateSettings',exchangeRate:0.21,defaultCurrency:'TWD'}));
assert.deepStrictEqual(updated,{ok:true,settings:{exchangeRate:0.21,defaultCurrency:'TWD'}});
assert.strictEqual(cfg.valueFor('Exchange Rate'),0.21);
assert.strictEqual(cfg.valueFor('Ledger Default Currency'),'TWD');
assert.strictEqual(lock.released,true);

const first=JSON.parse(call(ledgerPayload));
const dup=JSON.parse(call(ledgerPayload));
assert.deepStrictEqual(first,{ok:true});
assert.deepStrictEqual(dup,{ok:true,dup:true});
assert.strictEqual(ledger.rowsForId(ledgerPayload.id),1);
```

Also assert invalid rate/currency and missing ledger amounts return `{ok:false}` without sheet mutation.
Send an extra payload containing arbitrary properties such as `key:'Trip Name'` and assert it cannot update any TripConfig row; `updateSettings` must always write only the two fixed keys.

- [ ] **Step 2: Run RED**

Run: `node tests/apps-script-settings.test.js`

Expected: failure because `apps-script/ledger-sync.gs` does not exist.

- [ ] **Step 3: Create the complete Apps Script**

Implement the deployable source with these exact boundaries:

```js
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'updateSettings') return updateSettings(d);
    return appendLedger(d);
  } catch (err) {
    return out({ok:false,error:String(err)});
  } finally {
    lock.releaseLock();
  }
}

function appendLedger(d) {
  var jpy=Number(d.amountJpy), twd=Number(d.amountTwd);
  if(!d.id||!d.member||d.amountJpy===undefined||d.amountTwd===undefined||!isFinite(jpy)||!isFinite(twd)){
    return out({ok:false,error:'missing or invalid ledger fields'});
  }
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('分帳紀錄');
  if(!sh) return out({ok:false,error:'missing sheet: 分帳紀錄'});
  var count=Math.max(sh.getLastRow()-1,0);
  var ids=count?sh.getRange(2,1,count,1).getValues():[];
  for(var i=0;i<ids.length;i++) if(String(ids[i][0])===String(d.id)) return out({ok:true,dup:true});
  sh.appendRow([d.id,d.time,d.member,d.category,d.detail,jpy,twd,d.note||'']);
  return out({ok:true});
}

function updateSettings(d) {
  var rate=Number(d.exchangeRate), currency=String(d.defaultCurrency||'').toUpperCase();
  if(!isFinite(rate)||rate<=0) return out({ok:false,error:'invalid exchangeRate'});
  if(currency!=='JPY'&&currency!=='TWD') return out({ok:false,error:'invalid defaultCurrency'});
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TripConfig');
  if(!sh) return out({ok:false,error:'missing sheet: TripConfig'});
  upsertSetting(sh,'Exchange Rate',rate);
  upsertSetting(sh,'Ledger Default Currency',currency);
  return out({ok:true,settings:{exchangeRate:rate,defaultCurrency:currency}});
}

function upsertSetting(sh,key,value) {
  var last=sh.getLastRow();
  var rows=last?sh.getRange(1,1,last,2).getValues():[];
  for(var i=0;i<rows.length;i++){
    if(String(rows[i][0]).trim()===key){ sh.getRange(i+1,2).setValue(value); return; }
  }
  sh.appendRow([key,value]);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 4: Document deployment and run GREEN**

`apps-script/README.md` must name the source-of-truth rule, deployment URL ownership, execute-as/access settings, version deployment steps, payload examples, rollback, and live checks for settings plus ledger dup. Run `node tests/apps-script-settings.test.js`; expect exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps-script/ledger-sync.gs apps-script/README.md tests/apps-script-settings.test.js
git commit -m "feat: version ledger Apps Script settings endpoint"
```

---

### Task 3: Pure currency/settings helpers and confirmed bridge

**Files:**
- Modify: `index.html:2835-3040`
- Create: `tests/ledger-entry-settings.test.js`

**Interfaces:**
- Produces: `normalizeLedgerSettings`, `currentLedgerSettings`, `convertLedgerAmounts`, `postLedgerSettings`, `saveLedgerSettings`.
- Consumes: `DB.cfg`, `LEDGER_POST_URL`, `fetch`, `lsGet`, `lsSet`.

- [ ] **Step 1: Write failing helper tests**

Extract the ledger module into a VM and assert:

```js
assert.deepStrictEqual(plain(mod.convertLedgerAmounts('JPY',1000,0.2)),{amountJpy:1000,amountTwd:200});
assert.deepStrictEqual(plain(mod.convertLedgerAmounts('TWD',201,0.2)),{amountJpy:1005,amountTwd:201});
assert.throws(()=>mod.convertLedgerAmounts('JPY',100,0),/匯率/);
assert.deepStrictEqual(plain(mod.normalizeLedgerSettings({exchangeRate:'0.21',ledgerDefaultCurrency:'twd'})),{exchangeRate:0.21,defaultCurrency:'TWD'});
```

Test that a successful settings POST writes the confirmed bridge and updates `DB.cfg`, while `{ok:false}` leaves both unchanged.

- [ ] **Step 2: Run RED**

Run: `node tests/ledger-entry-settings.test.js`

Expected: failure because the helper functions do not exist.

- [ ] **Step 3: Implement pure helpers and POST boundary**

Add:

```js
var LEDGER_SETTINGS_BRIDGE_KEY='trip_ledger_settings_bridge';
function normalizeLedgerSettings(source){
  var rate=Number(source&&source.exchangeRate);
  var currency=String(source&&source.ledgerDefaultCurrency||source&&source.defaultCurrency||'').toUpperCase();
  if(!isFinite(rate)||rate<=0) throw new Error('匯率未設定');
  if(currency!=='JPY'&&currency!=='TWD') throw new Error('預設幣別未設定');
  return {exchangeRate:rate,defaultCurrency:currency};
}
function currentLedgerSettings(){
  var bridge=lsGet(LEDGER_SETTINGS_BRIDGE_KEY,null);
  try{ if(bridge) return normalizeLedgerSettings(bridge); }catch(ignore){}
  return normalizeLedgerSettings(DB.cfg||{});
}
function convertLedgerAmounts(currency,amount,rate){
  currency=String(currency||'').toUpperCase(); amount=Number(amount); rate=Number(rate);
  if(!isFinite(rate)||rate<=0) throw new Error('匯率未設定');
  if(!isFinite(amount)||amount<0) throw new Error('金額格式錯誤');
  if(currency==='JPY') return {amountJpy:Math.round(amount),amountTwd:Math.round(amount*rate)};
  if(currency==='TWD') return {amountJpy:Math.round(amount/rate),amountTwd:Math.round(amount)};
  throw new Error('幣別格式錯誤');
}
```

Implement `postLedgerSettings` with the existing Promise timeout/fetch compatibility pattern and no AbortController. `saveLedgerSettings` validates first, POSTs `{action:'updateSettings',exchangeRate,defaultCurrency}`, then on `ok:true` updates `DB.cfg`, saves the bridge, rerenders Settings/Split, and returns the response. On failure it does not mutate confirmed state.

Reconcile the bridge after online cfg sync: remove it only when normalized published cfg equals the confirmed bridge.

- [ ] **Step 4: Run GREEN and regression**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/ledger-sync.test.js
node tests/atomic-sheet-sync.test.js
```

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/ledger-entry-settings.test.js
git commit -m "feat: add ledger currency settings helpers"
```

---

### Task 4: Ledger and Settings UI behavior

**Files:**
- Modify: `index.html` CSS, `setSyncState`, `openSettings`, `addLedgerExpense`, and `renderSplit`
- Modify: `tests/ledger-entry-settings.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: Task 3 helpers.
- Produces: `selectLedgerCategory`, `selectLedgerCurrency`, `updateLedgerConversionPreview`, category and currency button markup.

- [ ] **Step 1: Add failing UI contract tests**

Assert the rendered Split source has no `openMemberSelector(false)` switch button, has six category values, has one editable amount input, a read-only preview, and calls `convertLedgerAmounts`. Assert Settings includes rate/default currency controls and `saveLedgerSettings`. Change the healthy sync expectation to `已同步` and reject `✓ 已同步`.

- [ ] **Step 2: Run RED**

Run: `node tests/ledger-entry-settings.test.js && node tests/atomic-sheet-sync.test.js`

Expected: failures on the current free-text category, dual inputs, switch button, and check mark.

- [ ] **Step 3: Implement the UI**

Use module state reset on each successful add:

```js
var LEDGER_CATEGORIES=['餐飲','交通','票卷','購物','其他','代墊'];
var ledgerDraftCategory='';
var ledgerDraftCurrency='';
function selectLedgerCategory(value){ ledgerDraftCategory=value; renderSplit(); }
function selectLedgerCurrency(value){
  var input=document.getElementById('ledgerAmount');
  if(input&&input.value){
    var settings=currentLedgerSettings();
    var converted=convertLedgerAmounts(ledgerDraftCurrency||settings.defaultCurrency,input.value,settings.exchangeRate);
    input.value=value==='JPY'?converted.amountJpy:converted.amountTwd;
  }
  ledgerDraftCurrency=value; renderSplit();
}
```

Render selected pills with `aria-pressed`, a single `ledgerAmount` input, current rate, and a read-only preview. `addLedgerExpense` requires `ledgerDraftCategory`, converts the selected amount, and sends both fields to `ledgerRepository.add`. Settings renders numeric rate, JPY/TWD default buttons, current-value text, save state, and errors.

Set the healthy branch to:

```js
else if(state==='online'){ txt.textContent='已同步'; }
```

Keep the status dot and all non-online states unchanged.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/atomic-sheet-sync.test.js
node tests/ledger-sync.test.js
node tests/home-safety.test.js
```

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/ledger-entry-settings.test.js tests/atomic-sheet-sync.test.js
git commit -m "feat: refine ledger entry and shared settings UI"
```

---

### Task 5: Restore passive iOS gesture diagnostics

**Files:**
- Modify: `index.html` diagnostic CSS/JS and boot setup
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: the prior diagnostic function family and `IOS_GESTURE_DIAGNOSTICS` 24-record store.
- Consumes: current hidden peach diagnostic overlay and viewport state.

- [ ] **Step 1: Invert retirement tests to failing active tests**

Require `gestureTargetSummary`, `gestureComputedTouchAction`, `gestureViewportSnapshot`, `createGestureDiagnostics`, `setupGestureDiagnostics`, environment/report/render/copy/clear functions, the exact event set `touchstart`, `touchend`, `gesturestart`, `gestureend`, `dblclick`, `visualViewport.resize`, the 24-record cap, and the `iOS 手勢診斷` panel. Continue rejecting `setupDoubleTapGuard`, `touch-action:manipulation`, persistent `maximum-scale`, and any diagnostic `preventDefault`.

- [ ] **Step 2: Run RED**

Run: `node tests/ios-gesture-diagnostics.test.js && node tests/ios-zoom-guard.test.js`

Expected: failure because collection/reporting is retired.

- [ ] **Step 3: Restore the evidence collector from the last known implementation**

Use `git show 954c271^:index.html` as the reference. Restore the function family, but set environment metadata to current Schema and `okayama-trip-v15`, omit retired sync/version diagnostic sections, and add only the gesture section to the current panel. Register:

```js
var IOS_GESTURE_DIAGNOSTICS=createGestureDiagnostics(24,function(type,event){
  return gestureViewportSnapshot(type,event,window,document);
});
setupGestureDiagnostics(document,window,IOS_GESTURE_DIAGNOSTICS);
```

All collection listeners use `{passive:true}` and only call `store.record`.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
node tests/ios-gesture-diagnostics.test.js
node tests/ios-zoom-guard.test.js
node tests/ios-viewport-resume.test.js
node tests/home-safety.test.js
```

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/ios-gesture-diagnostics.test.js tests/ios-zoom-guard.test.js tests/README.md
git commit -m "feat: restore passive iOS gesture diagnostics"
```

---

### Task 6: Cache and decision-document synchronization

**Files:**
- Modify: `sw.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `.ai-manifest.json`
- Modify: `02_ARCHITECTURE.md`
- Modify: `03_DATABASE.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `adr/0006-ledger-sync-apps-script.md`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md` only if an existing item is resolved or superseded

**Interfaces:**
- Consumes: completed runtime contracts.
- Produces: current maintenance and deployment documentation.

- [ ] **Step 1: Write the failing SW expectation**

Update the PWA tests to require exactly `okayama-trip-v15` and reject v14.

- [ ] **Step 2: Run RED**

Run: `node tests/pwa-shell.test.js && node tests/ios-zoom-guard.test.js`

Expected: failure while `sw.js` remains v14.

- [ ] **Step 3: Bump cache and synchronize documents**

Change only `CACHE_NAME` in `sw.js`. Update documents with Schema 2.5, TripConfig cloud settings, repository Apps Script source, conversion semantics, restored evidence-only diagnostics, known 1–5 minute settings propagation delay, and deployment order. ADR 0006, `08_AI_HANDOVER.md`, and `.ai-manifest.json` must state the exact write whitelist: the App may append `分帳紀錄` and update only `Exchange Rate` / `Ledger Default Currency`; every other CMS field remains Bar-managed and App-read-only. Do not claim live settings validation before Task 7.

- [ ] **Step 4: Run GREEN and document checks**

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
node tools/check-doc-titles.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8'))"
git diff --check
```

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add sw.js tests/pwa-shell.test.js tests/ios-zoom-guard.test.js .ai-manifest.json 02_ARCHITECTURE.md 03_DATABASE.md 07_CHANGELOG.md 08_AI_HANDOVER.md adr/0006-ledger-sync-apps-script.md tasks/current.md tasks/backlog.md
git commit -m "docs: record ledger settings and diagnostics rollout"
```

---

### Task 7: Deployment Gate, complete verification, and handoff

**Files:**
- Modify after evidence only: `07_CHANGELOG.md`, `tasks/current.md`, `.ai-manifest.json`

**Interfaces:**
- Consumes: all earlier tasks and deployed Apps Script.
- Produces: evidence-backed readiness for Bar mobile acceptance.

- [ ] **Step 1: Run every automated test individually**

```powershell
$tests=Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name
foreach($test in $tests){ node $test.FullName; if($LASTEXITCODE -ne 0){ throw $test.Name } }
node tools/check-doc-titles.js
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Run production-data healthCheck**

Load `schema.js`, `validator.js`, embedded built-in CSV, parser functions, `RAW=BUILTIN`, and `DB=createDB(RAW)` in Node VM. Call `healthCheck()` and require `HEALTH_RESULT=[]`.

- [ ] **Step 3: Deploy Apps Script before frontend publication**

Copy the exact committed `apps-script/ledger-sync.gs` into Apps Script, save, edit the existing Web App deployment to a new version, execute as owner, retain approved access, and keep the current `/exec` URL when possible.

- [ ] **Step 4: Perform live settings and ledger acceptance**

POST settings `{action:'updateSettings',exchangeRate:0.2,defaultCurrency:'JPY'}` and require the documented success JSON. This real POST is the normal seed/upsert path; manual Sheet row creation is recovery-only. Wait for TripConfig CSV to expose the exact `Exchange Rate,0.2` and `Ledger Default Currency,JPY` rows before any Schema 2.5 frontend publication. Then post one unique `[TEST]` ledger record twice and require first `{ok:true}`, second `{ok:true,dup:true}`, and exactly one CSV row.

- [ ] **Step 5: Run browser QA**

At 390px verify no header overlap; only Settings can switch identity; category selection is single-choice; JPY 1000 previews TWD 200; TWD 201 previews JPY 1005; both amounts reach the queued record; settings save applies immediately; healthy sync says `已同步`; diagnostic report captures double-tap evidence; offline ledger entry queues and reconnect flushes; travel-date mock works; page errors equal zero.

- [ ] **Step 6: Record evidence and final commit**

Only after Steps 1–5 pass, update status documents from “pending deployment” to the exact verified results, then:

```powershell
git add 07_CHANGELOG.md tasks/current.md .ai-manifest.json
git commit -m "chore: record ledger settings acceptance"
git status --short --branch
```

Do not push until Bar explicitly requests `push dev`.
