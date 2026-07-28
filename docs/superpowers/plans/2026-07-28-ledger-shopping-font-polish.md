# 新增消費、採買預設單位與全站字體優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓單筆新增消費依金額、明細、代購／分攤、其他資訊的順序呈現，讓新採買項目固定以 `1 個` 開始，並以 `Noto Sans TC` 統一全站繁體中文字體。

**Architecture:** 沿用 `index.html` 的單檔 Vanilla JS 與字串 Renderer，重新組合既有 Ledger Renderer，不建立平行表單。採買單位由單一常數與既有泛用 option store 正規化；字體在 `<head>` 靜態載入並由 `--font-ui` 繼承。App Shell 內容完成後只將 Service Worker cache v65 順延至 v66。

**Tech Stack:** Vanilla HTML／CSS／ES5-style JavaScript、Node.js `assert` 測試、Service Worker、Google Fonts CSS、Codex in-app Browser QA。

## Global Constraints

- 以 `docs/superpowers/specs/2026-07-28-ledger-shopping-font-polish-design.md` 為本批權威規格。
- 不修改 Ledger Schema、Apps Script、Google Sheet、Queue／Bridge／Retry、結算、採買與 Ledger 類別映射或 Shopping ↔ Ledger append-only 關聯。
- 不修改 Personal State Schema 或 `PERSONAL_STATE_VERSION`，不批次遷移既有空白單位。
- 不修改 Service Worker 的 SHELL、install、activate、fetch 或離線 fallback；cache 只可由 `okayama-trip-v65` 改為 `okayama-trip-v66`。
- Google Fonts 只載入 `Noto Sans TC` 的 400、500、700，URL 必須包含 `display=swap`。
- 字體堆疊固定為 `"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif`。
- 單位「個」不可刪除，阻擋文案固定為「個」是新增採買項目的預設單位，無法刪除。
- 「改回未記帳」及其 append-only 行為不得改變。
- 表單控制項維持至少 16px，320／375／390／430px 不得水平溢出。
- 依 Bar 指示，所有工作保持未提交；不得 commit、push、開 PR、merge 或部署。

## File Map

- Modify `index.html`: Ledger Renderer／鍵盤導引、Shopping 預設單位與設定頁保護、Google Fonts 與全站字體 CSS。
- Modify `tests/ledger-entry-p0.test.js`: 單筆表單 DOM 順序、摘要日期與鍵盤導引。
- Modify `tests/shopping-list.test.js`: 新增／連續新增預設、舊單位相容、Select 與不可刪除基本單位。
- Create `tests/ui-font.test.js`: 字體載入、堆疊、禁用舊字型與 16px 表單契約。
- Modify `tests/pwa-shell.test.js`, `tests/ios-zoom-guard.test.js`, `tests/ledger-221-ui.test.js`, `tests/ledger-225.test.js`, `tests/ledger-member-visibility.test.js`, `tests/ledger-mobile-hotfix.test.js`, `tests/ledger-ui-polish.test.js`, `tests/shopping-ledger-links.test.js`: v66 精確 cache 契約。
- Modify `sw.js`: cache name v65 → v66，其他內容不變。
- Modify `07_CHANGELOG.md`, `tasks/current.md`, `tests/README.md`, `CONTEXT.md`: 實際交付、測試與 QA 證據。

---

### Task 1: 單筆新增消費資訊層級

**Files:**
- Modify: `tests/ledger-entry-p0.test.js`
- Modify: `index.html:523-524`
- Modify: `index.html:6995-7017`
- Modify: `index.html:7021-7033`
- Modify: `index.html:7061-7065`
- Modify: `index.html:7084-7092`
- Modify: `index.html:7218-7230`

**Interfaces:**
- Consumes: `ledgerUiState.draft`, `appNow()`, `parseLedgerDateInput(value)`, `renderLedgerSingleItemPrimary(draft)`, `renderLedgerTrackSpecificFields(draft)`, `renderLedgerStoreField(draft)`, `renderLedgerOccurrenceFields(draft,true)`, `renderLedgerSingleItemCategory(draft)`, `renderLedgerPaymentFields(draft,false)`.
- Produces: `ledgerOptionalDateLabel(value,now): string`, `ledgerSingleSummaryText(draft): string`, `handleLedgerDetailNext(event): void`, reordered single-entry markup from `renderLedgerEntrySheet()`.

- [ ] **Step 1: Replace the old hierarchy and Done-key assertions with failing tests**

In `tests/ledger-entry-p0.test.js`, replace assertions that require the optional disclosure inside `renderLedgerSingleBasicInfo()` and the detail key to save. Add exact coverage:

```js
const singleEntryRenderSource=extractFunction('renderLedgerEntrySheet');
const basicInfoSource=extractFunction('renderLedgerSingleBasicInfo');
const secondarySource=extractFunction('renderLedgerSingleSecondaryFields');
const trackSpecificSource=extractFunction('renderLedgerTrackSpecificFields');

assert.match(basicInfoSource,/renderLedgerSingleItemPrimary\(draft\)/);
assert.doesNotMatch(basicInfoSource,/renderLedgerSingleSecondaryFields/);
assert(
  singleEntryRenderSource.indexOf('renderLedgerSingleBasicInfo(draft)') <
  singleEntryRenderSource.indexOf('renderLedgerTrackSpecificFields(draft)')
);
assert(
  singleEntryRenderSource.indexOf('renderLedgerTrackSpecificFields(draft)') <
  singleEntryRenderSource.indexOf('renderLedgerSingleSecondaryFields(draft)')
);
assert.match(trackSpecificSource,/這筆是代購/,'代購 Toggle uses the existing approved label');
assert.match(trackSpecificSource,/renderLedgerParticipantGroup\('分攤成員'/);
assert.match(trackSpecificSource,/id="ledgerProxy"/);
assert.match(trackSpecificSource,/draft\.isProxy\?renderLedgerProxySection/);
assert.match(secondarySource,/其他資訊（選填）/);
['renderLedgerStoreField','renderLedgerOccurrenceFields',
 'renderLedgerSingleItemCategory','renderLedgerPaymentFields'].forEach(function(name){
  assert.match(secondarySource,new RegExp(name+'\\(draft'));
});
assert.match(html,/id="ledgerDetail"[^>]*enterkeyhint="next"[^>]*handleLedgerDetailNext/);
assert.doesNotMatch(extractFunction('handleLedgerDetailNext'),/saveLedgerEntry/);
assert.match(editSource,/draft\.isProxy=firstMeta\.isProxy/);
assert.match(editSource,/draft\.proxyTarget=firstMeta\.proxyTarget/);
```

Add helper behavior tests:

```js
const dateLabelSource=extractFunction('ledgerOptionalDateLabel');
const summaryTextSource=extractFunction('ledgerSingleSummaryText');
const summarySandbox={String,Number,Date,parseLedgerDateInput(value){
  if(!/^\d{4}\/\d{2}\/\d{2}$/.test(value))throw new Error('bad date');
  return value;
},appNow(){return new Date(2026,6,28);}};
vm.createContext(summarySandbox);
vm.runInContext(dateLabelSource+'\n'+summaryTextSource,summarySandbox);
assert.strictEqual(
  summarySandbox.ledgerOptionalDateLabel('2026/07/28',new Date(2026,6,28)),
  '今天'
);
assert.strictEqual(
  summarySandbox.ledgerOptionalDateLabel('2026/10/18',new Date(2026,6,28)),
  '10/18'
);
assert.strictEqual(
  summarySandbox.ledgerOptionalDateLabel('2027/01/03',new Date(2026,6,28)),
  '2027/1/3'
);
assert.strictEqual(
  summarySandbox.ledgerOptionalDateLabel('無效日期',new Date(2026,6,28)),
  '無效日期'
);
assert.strictEqual(
  summarySandbox.ledgerSingleSummaryText({
    category:'餐飲',payMethod:'現金',occurredDate:'2026/07/28'
  }),
  '餐飲｜現金｜今天'
);
```

Replace the old save-on-Done sandbox assertions with:

```js
const detailNextSource=extractFunction('handleLedgerDetailNext');
let prevented=0,proxyFocuses=0,participantFocuses=0,saves=0;
const proxyInput={focus(){proxyFocuses++;}};
const participantButton={focus(){participantFocuses++;}};
const nextSandbox={
  ledgerUiState:{draft:{track:'personal'}},
  document:{
    getElementById(id){return id==='ledgerProxy'?proxyInput:null;},
    querySelector(selector){
      return selector==='#ledgerParticipants button'?participantButton:null;
    }
  },
  saveLedgerEntry(){saves++;},
  String
};
vm.createContext(nextSandbox);
vm.runInContext(detailNextSource,nextSandbox);
nextSandbox.handleLedgerDetailNext({
  key:'Enter',isComposing:false,preventDefault(){prevented++;}
});
nextSandbox.ledgerUiState.draft.track='shared';
nextSandbox.handleLedgerDetailNext({
  key:'Enter',isComposing:false,preventDefault(){prevented++;}
});
nextSandbox.handleLedgerDetailNext({
  key:'Tab',isComposing:false,preventDefault(){prevented++;}
});
assert.strictEqual(proxyFocuses,1);
assert.strictEqual(participantFocuses,1);
assert.strictEqual(prevented,2);
assert.strictEqual(saves,0);
```

- [ ] **Step 2: Run the focused Ledger test and verify red**

Run:

```powershell
node .\tests\ledger-entry-p0.test.js
```

Expected: FAIL because `ledgerOptionalDateLabel` and `handleLedgerDetailNext` do not exist, the detail input still uses `done`, and the optional disclosure still renders before the track-specific controls.

- [ ] **Step 3: Implement the minimal Renderer and keyboard changes**

In `index.html`, add:

```js
function ledgerOptionalDateLabel(value,now){
  var text=String(value||'').trim(),normalized,match;
  try{normalized=parseLedgerDateInput(text);}
  catch(ignore){return text;}
  match=/^(\d{4})\/(\d{2})\/(\d{2})$/.exec(normalized);
  if(!match)return text;
  now=now instanceof Date?now:appNow();
  var year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  if(year===now.getFullYear()&&month===now.getMonth()+1&&day===now.getDate())return '今天';
  return year===now.getFullYear()?month+'/'+day:year+'/'+month+'/'+day;
}
function ledgerSingleSummaryText(draft){
  return draft.category+'｜'+draft.payMethod+'｜'+ledgerOptionalDateLabel(draft.occurredDate,appNow());
}
function handleLedgerDetailNext(event){
  if(!event||event.key!=='Enter'||event.isComposing)return;
  if(event.preventDefault)event.preventDefault();
  var draft=ledgerUiState.draft,target=draft&&draft.track==='personal'
    ?document.getElementById('ledgerProxy')
    :document.querySelector('#ledgerParticipants button');
  if(!target)return;
  try{target.focus({preventScroll:true});}catch(ignore){target.focus();}
}
```

Change `renderLedgerSingleItemDetail()` to use `enterkeyhint="next"` and `handleLedgerDetailNext(event)`.

Make `renderLedgerSingleBasicInfo()` output only `renderLedgerSingleItemPrimary(draft)`. Make `renderLedgerTrackSpecificFields()` give the single personal checkbox `id="ledgerProxy"`. Compose the single-entry fields exactly as:

```js
renderLedgerSingleBasicInfo(draft)+
renderLedgerTrackSpecificFields(draft)+
renderLedgerSingleSecondaryFields(draft)
```

Keep the multi-item branch unchanged.

Render the disclosure with a visible title and summary:

```html
<span class="ledger-entry-summary-copy">
  <small>其他資訊（選填）</small>
  <span id="ledgerEntrySummaryText">餐飲｜現金｜今天</span>
</span>
```

Keep the existing expanded body calls in their current order so store, date/time, category, and payment data sources do not change.

- [ ] **Step 4: Add the approved low-contrast container styles**

Use existing tokens and add:

```css
.ledger-entry-summary{
  margin-top:12px;
  border:1px solid #cfe0dd;
  border-radius:10px;
  background:#f3f8f6;
  padding:10px 11px;
}
.ledger-entry-summary-copy{display:grid;min-width:0;gap:2px}
.ledger-entry-summary-copy small{
  color:var(--ink-faint);
  font-size:11px;
  font-weight:700;
}
.ledger-entry-summary-copy span{
  min-width:0;
  overflow-wrap:anywhere;
  color:var(--ink);
}
.ledger-entry-secondary{
  margin-top:0;
  padding:0 11px 11px;
  border:1px solid #cfe0dd;
  border-top:0;
  border-radius:0 0 10px 10px;
  background:#f3f8f6;
  min-width:0;
}
```

The collapsed summary keeps all four borders and 10px radius; when expanded, add an `open` class so the summary uses `border-radius:10px 10px 0 0`.

- [ ] **Step 5: Preserve optional-field error visibility**

Before rerendering a failed single-entry validation, set:

```js
if(!draft.multi&&validation.firstField&&
   ['storeName','occurredDate','category','payMethod'].indexOf(validation.firstField)>=0){
  draft.entryDetailsOpen=true;
}
```

Do not add new validation rules; this only ensures an existing optional-field error cannot remain hidden.

- [ ] **Step 6: Run focused Ledger tests**

Run:

```powershell
node .\tests\ledger-entry-p0.test.js
node .\tests\ledger-three-second-entry.test.js
node .\tests\ledger-multi-item.test.js
node .\tests\ledger-editing.test.js
```

Expected: all four files exit 0; single-entry DOM order changes, while multi-item and editing persistence remain green.

- [ ] **Step 7: Inspect the task checkpoint without committing**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Expected: only the approved spec/plan plus `index.html` and `tests/ledger-entry-p0.test.js` are changed at this checkpoint. Do not commit.

---

### Task 2: 採買預設 `1 個` 與基本單位保護

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:2914-2935`
- Modify: `index.html:3884-3891`
- Modify: `index.html:3974-4045`
- Modify: `index.html:4706-4735`
- Modify: `index.html:6145-6149`
- Modify: `index.html:6422-6441`

**Interfaces:**
- Consumes: `createLedgerOptionStore(options)`, `newShoppingForm(seed)`, `shoppingSaveAnotherForm(form)`, `renderShoppingQuantityFields(form)`, `removeLedgerOptionFromSettings(kind,value)`.
- Produces: `SHOPPING_DEFAULT_UNIT: string`, `normalizeShoppingUnitOptions(values): string[]`, Shopping Unit Store whose `all()` always includes `個`.

- [ ] **Step 1: Write failing Shopping default and compatibility tests**

In `tests/shopping-list.test.js`, add:

```js
assert.strictEqual(mod.SHOPPING_DEFAULT_UNIT,'個');
assert(mod.SHOPPING_COMMON_UNITS.includes('個'));
assert.strictEqual(mod.newShoppingForm({}).quantity,1);
assert.strictEqual(mod.newShoppingForm({}).unit,'個');

const another=plain(mod.shoppingSaveAnotherForm({
  name:'白桃',category:'伴手禮',quantity:4,unit:'盒',stopRef:'d2_shop'
}));
assert.strictEqual(another.name,'');
assert.strictEqual(another.quantity,1);
assert.strictEqual(another.unit,'個');
assert.strictEqual(another.category,'伴手禮');
assert.strictEqual(another.stopRef,'d2_shop');

['盒','包','瓶'].forEach(function(unit){
  assert.strictEqual(mod.newShoppingForm({id:'old-'+unit,quantity:2,unit}).unit,unit);
});
const legacyBlank={id:'legacy-blank',quantity:2,unit:''};
const legacyDraft=plain(mod.newShoppingForm(legacyBlank));
assert.strictEqual(legacyDraft.unit,'個');
assert.strictEqual(legacyBlank.unit,'');

assert(mod.shoppingUnitStore.all().includes('個'));
```

Replace the old expected `unit:''` in the save-another assertion with `unit:'個'`.

After the existing `const ui=fs.readFileSync('index.html','utf8');`, add an exact UI function extractor:

```js
function extractUiFunction(name){
  const start=ui.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=ui.indexOf('{',start),depth=0;
  for(;index<ui.length;index++){
    if(ui[index]==='{')depth++;
    else if(ui[index]==='}')depth--;
    if(depth===0)return ui.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}
```

Replace the existing `quantityFields` slice declaration with the following declaration and assertions:

```js
const quantityFields=extractUiFunction('renderShoppingQuantityFields');
assert(!quantityFields.includes('<option value="">'));
assert(!quantityFields.includes('不指定'));
const removeOptionSource=extractUiFunction('removeLedgerOptionFromSettings');
assert(removeOptionSource.includes('「個」是新增採買項目的預設單位，無法刪除。'));
assert(
  removeOptionSource.indexOf("kind==='shoppingUnit'") <
  removeOptionSource.indexOf('ledgerOptionStoreForKind(kind).remove(value)')
);
```

Add the handler test:

```js
let unitRemoves=0,unitToast='';
const removeSandbox={
  SHOPPING_DEFAULT_UNIT:'個',
  ledgerUiState:{draft:null},
  ledgerOptionStoreForKind(){return {remove(){unitRemoves++;},all(){return ['個'];}};},
  openSettings(){},
  toast(message){unitToast=message;}
};
vm.createContext(removeSandbox);
vm.runInContext(removeOptionSource,removeSandbox);
removeSandbox.removeLedgerOptionFromSettings('shoppingUnit','個');
assert.strictEqual(unitRemoves,0);
assert.strictEqual(unitToast,'「個」是新增採買項目的預設單位，無法刪除。');
```

- [ ] **Step 2: Run the Shopping test and verify red**

Run:

```powershell
node .\tests\shopping-list.test.js
```

Expected: FAIL because the new form unit is blank, save-another resets to blank, the Select contains 「不指定」, and the remove handler has no protected-unit guard.

- [ ] **Step 3: Add the single default and store normalization**

In `index.html`, add:

```js
var SHOPPING_DEFAULT_UNIT='個';
var SHOPPING_COMMON_UNITS=['個','件','盒','包','袋','瓶','罐','組','條','雙','本','張'];
function normalizeShoppingUnitOptions(values){
  var result=[],seen={};
  (values||[]).forEach(function(value){
    value=normalizeShoppingUnit(value);
    if(!value||seen[value])return;
    seen[value]=true;result.push(value);
  });
  if(!seen[SHOPPING_DEFAULT_UNIT])result.unshift(SHOPPING_DEFAULT_UNIT);
  return result;
}
```

Create `shoppingUnitStore` with:

```js
createLedgerOptionStore({
  storage:localStorage,
  key:SHOPPING_UNIT_OPTIONS_KEY,
  defaults:SHOPPING_COMMON_UNITS,
  normalizeList:normalizeShoppingUnitOptions
})
```

This repairs only the in-memory option list returned by the Store. It must not call `shoppingListStore.update()`, scan items, or bump `PERSONAL_STATE_VERSION`.

- [ ] **Step 4: Apply defaults only to form drafts**

In `newShoppingForm(seed)`, preserve every non-empty unit and use the default only for a blank draft value:

```js
var unit=String(seed.unit||'').trim();
if(!unit)unit=SHOPPING_DEFAULT_UNIT;
```

Return `unit:unit`. In `shoppingSaveAnotherForm(form)`, pass `unit:SHOPPING_DEFAULT_UNIT` explicitly with `quantity:1`.

Do not change `normalizeShoppingItem()`, `shoppingQuantityLabel()`, or cold-start Store loading. Old blank cards therefore remain blank until a user opens and saves that item.

- [ ] **Step 5: Remove unspecified options and protect 「個」**

Build the Select only from `shoppingUnitStore.all()` plus the existing selected custom-unit compatibility option. Remove:

```html
<option value="">不指定</option>
```

Change the label from `單位（選填）` to `單位`.

At the top of `removeLedgerOptionFromSettings(kind,value)`, add:

```js
if(kind==='shoppingUnit'&&value===SHOPPING_DEFAULT_UNIT){
  toast('「個」是新增採買項目的預設單位，無法刪除。');
  return;
}
```

Do not disable deletion of other units and do not use native `alert()`.

- [ ] **Step 6: Run Shopping and Ledger-link regressions**

Run:

```powershell
node .\tests\shopping-list.test.js
node .\tests\shopping-ledger-links.test.js
node .\tests\ledger-quick-entry.test.js
node .\tests\settings-backup-ux.test.js
```

Expected: all four files exit 0; Shopping→Ledger still produces category `購物`, blank amount, existing proxy target, and unchanged append-only links.

- [ ] **Step 7: Inspect the task checkpoint without committing**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Expected: Shopping changes are limited to the form/default/option-manager paths and tests. Do not commit.

---

### Task 3: `Noto Sans TC` 全站字體與失敗退化契約

**Files:**
- Create: `tests/ui-font.test.js`
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:3-43`

**Interfaces:**
- Consumes: static document `<head>`, existing `:root`, `body`, and component `font:inherit` rules.
- Produces: one Google Fonts stylesheet request and CSS custom property `--font-ui`.

- [ ] **Step 1: Write the failing font contract test**

Create `tests/ui-font.test.js`:

```js
const assert=require('assert');
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');

const fontUrl='https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap';
assert.strictEqual((html.match(new RegExp(fontUrl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1);
assert.match(html,/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
assert.match(html,/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
assert.match(
  html,
  /--font-ui:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif/
);
assert.match(html,/body\{[\s\S]*?font-family:var\(--font-ui\)/);
assert.doesNotMatch(html,/font-family:[^;}]*"Hiragino Sans"/);
assert.doesNotMatch(html,/font-family:[^;}]*"Noto Sans JP"/);
assert.doesNotMatch(html,/font-family:[^;}]*"Yu Gothic"/);
assert.doesNotMatch(fontUrl,/100|200|300|600|800|900/);
assert.match(html,/input,select,textarea\{font-size:16px\}/);

console.log('UI font tests passed');
```

Update the old Shopping assertion from PingFang-first to Noto-first:

```js
assert(ui.includes('font-family:var(--font-ui)'));
assert(ui.includes('--font-ui:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif'));
```

- [ ] **Step 2: Run the focused font tests and verify red**

Run:

```powershell
node .\tests\ui-font.test.js
node .\tests\shopping-list.test.js
```

Expected: `ui-font.test.js` fails because the Google Fonts links and `--font-ui` do not exist; Shopping fails because the current body is PingFang-first.

- [ ] **Step 3: Add one static Google Fonts declaration**

In `<head>`, before `<style>`, add exactly:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

Do not add JavaScript font injection, `@import`, local font files, Base64 data, or Service Worker precache entries.

- [ ] **Step 4: Centralize the font stack**

Add to `:root`:

```css
--font-ui:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif;
```

Replace the body declaration with:

```css
font-family:var(--font-ui);
```

Keep component `font:inherit` and `font-family:inherit` declarations. Do not change existing font sizes, line heights, spacing, weights, or `-webkit-font-smoothing` unless Browser QA shows a specific clipping defect.

- [ ] **Step 5: Run font, iOS input, and PWA-shell focused tests**

Run:

```powershell
node .\tests\ui-font.test.js
node .\tests\shopping-list.test.js
node .\tests\ios-zoom-guard.test.js
node .\tests\pwa-shell.test.js
```

Expected: font and Shopping tests pass. Existing v65 PWA tests still pass at this task because the SW bump has not started.

- [ ] **Step 6: Inspect the task checkpoint without committing**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Expected: no font asset files appear and `sw.js` is still unchanged. Do not commit.

---

### Task 4: Service Worker v66 and full automated regression

**Files:**
- Modify: `sw.js:9`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `tests/ledger-221-ui.test.js`
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/ledger-member-visibility.test.js`
- Modify: `tests/ledger-mobile-hotfix.test.js`
- Modify: `tests/ledger-ui-polish.test.js`
- Modify: `tests/shopping-ledger-links.test.js`

**Interfaces:**
- Consumes: exact cache assertion `okayama-trip-v65`.
- Produces: exact cache assertion and implementation `okayama-trip-v66`.

- [ ] **Step 1: Change every exact cache expectation to v66**

Replace only `okayama-trip-v65` with `okayama-trip-v66` in the eight listed test files. Keep assertions that protect SHELL and install／activate／fetch behavior unchanged.

- [ ] **Step 2: Run cache-sensitive tests and verify red**

Run:

```powershell
node .\tests\pwa-shell.test.js
node .\tests\ios-zoom-guard.test.js
node .\tests\ledger-225.test.js
```

Expected: all fail only because `sw.js` still declares `okayama-trip-v65`.

- [ ] **Step 3: Bump the cache once**

In `sw.js`, change exactly:

```js
var CACHE_NAME = 'okayama-trip-v66';
```

Do not edit any other `sw.js` line.

- [ ] **Step 4: Run all Node tests and count actual files**

Run:

```powershell
$testFiles = Get-ChildItem -Path .\tests -Filter *.test.js | Sort-Object Name
$testFailures = @()
foreach ($testFile in $testFiles) {
  Write-Host "== $($testFile.Name) =="
  & node $testFile.FullName
  if ($LASTEXITCODE -ne 0) {
    $testFailures += $testFile.Name
  }
}
if ($testFailures.Count -gt 0) {
  throw "Failed tests: $($testFailures -join ', ')"
}
Write-Host "PASS $($testFiles.Count)/$($testFiles.Count)"
```

Expected: every discovered test exits 0. Record the count printed by this run; do not reuse the prior 45／45 count.

- [ ] **Step 5: Run repository checks**

Run:

```powershell
node .\tools\check-doc-titles.js
if ($LASTEXITCODE -ne 0) { throw "doc-title check failed ($LASTEXITCODE)" }

git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed ($LASTEXITCODE)" }
```

Expected: both commands exit 0.

- [ ] **Step 6: Verify SW scope is only the version line**

Run:

```powershell
git diff -- sw.js
```

Expected: one changed line, v65 → v66. Do not commit.

---

### Task 5: Browser QA, offline degradation, and durable documentation

**Files:**
- Modify: `CONTEXT.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: completed UI, unit, font and SW implementation; actual Node test count; Browser measurements.
- Produces: durable contract and evidence without changing runtime behavior.

- [ ] **Step 1: Read the browser-control skill and start the existing app locally**

Read `browser:control-in-app-browser` before browser actions. Start a static server:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` in the in-app browser. Keep the server process available until all browser checks finish.

- [ ] **Step 2: Verify Ledger form behavior at four widths**

At 320×700, 375×812, 390×844, and 430×932:

- open a new personal expense;
- verify amount → detail → proxy Toggle → optional information → save;
- toggle proxy on and verify the target area appears immediately below it;
- enter amount, detail, date, category, and payment, toggle proxy, and confirm values survive rerender;
- open a new shared expense and verify detail → participants → optional information;
- expand 「其他資訊（選填）」 and test long date／category／payment labels;
- measure `document.documentElement.scrollWidth === document.documentElement.clientWidth`;
- verify all inputs/selects/textareas have computed font size at least 16px;
- verify console error and warning counts remain 0.

- [ ] **Step 3: Verify Shopping form defaults and old-data behavior**

At each width:

- open a new Shopping form and confirm quantity `1`, unit `個`;
- inspect the Select and confirm no blank／「不指定」 option;
- use 「儲存並新增」 and confirm the next draft is `1 個`;
- edit fixtures or locally created items using 盒／包／瓶 and confirm each remains selected after save/reopen;
- inspect quantity and unit controls for overlap and horizontal overflow;
- attempt to delete 「個」 in Settings and verify the exact App Toast.

Do not modify production data or shared Ledger records during QA.

- [ ] **Step 4: Verify font success, failure, and offline App Shell**

With normal network:

- confirm the Google Fonts stylesheet is requested once;
- confirm representative controls report computed `Noto Sans TC` first;
- inspect buttons, chips, badges, dates, amounts, modal/sheet, toast, settings, Today, itinerary, Shopping and Ledger for clipping or illegible wrapping.

Block `fonts.googleapis.com` and `fonts.gstatic.com`, then reload:

- confirm the page renders immediately;
- confirm representative controls fall back to PingFang TC／Microsoft JhengHei／system-ui according to the platform;
- confirm all app interactions above still work and console errors remain 0.

Then use the registered v66 Service Worker, switch offline, and reload:

- confirm the App Shell opens;
- confirm external font failure does not block interaction;
- confirm no Google Fonts URL was added to Cache Storage SHELL entries.

- [ ] **Step 5: Update durable documentation with observed facts**

In `CONTEXT.md`, record:

- the single-entry order for personal and shared tracks;
- 「其他資訊（選填）」 summary and container contract;
- Shopping new/edit/legacy unit behavior;
- the Noto-first stack and system fallback.

At the top of `07_CHANGELOG.md`, add a 2026-07-28 entry that records:

- proxy Toggle movement and shared participant placement;
- optional-information title, summary, style and keyboard Next behavior;
- new and save-another `1 個`;
- no blank／「不指定」 unit option;
- protected 「個」 Toast;
- no item migration or Personal State version bump;
- Noto Sans TC 400／500／700 and fallback order;
- Google Fonts blocked/offline results;
- actual Node test count and four-width Browser measurements;
- v65 → v66 only, with SW strategy unchanged;
- unchanged Shopping→Ledger category mapping, Ledger Schema, Apps Script, sync and settlement.

Update `tasks/current.md` runtime baseline to SW v66 and record remaining iPhone Safari／installed-PWA checks as pending when they were not performed on real hardware.

Update `tests/README.md` with the new Ledger hierarchy, Shopping default-unit, and `ui-font.test.js` coverage.

- [ ] **Step 6: Run final verification from the completed working tree**

Use `superpowers:verification-before-completion`, then run:

```powershell
node .\tests\shopping-list.test.js
if ($LASTEXITCODE -ne 0) { throw "shopping-list tests failed ($LASTEXITCODE)" }

$testFiles = Get-ChildItem -Path .\tests -Filter *.test.js | Sort-Object Name
$testFailures = @()
foreach ($testFile in $testFiles) {
  Write-Host "== $($testFile.Name) =="
  & node $testFile.FullName
  if ($LASTEXITCODE -ne 0) { $testFailures += $testFile.Name }
}
if ($testFailures.Count -gt 0) {
  throw "Failed tests: $($testFailures -join ', ')"
}
Write-Host "PASS $($testFiles.Count)/$($testFiles.Count)"

node .\tools\check-doc-titles.js
if ($LASTEXITCODE -ne 0) { throw "doc-title check failed ($LASTEXITCODE)" }

git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed ($LASTEXITCODE)" }

git diff --stat
git status --short
```

Expected: all tests and checks pass, the count matches the Changelog, and all changes remain unstaged and uncommitted.

- [ ] **Step 7: Stop the local server and deliver the uncommitted diff**

Stop only the static server started for this task. Report:

- modified-file list;
- actual Ledger DOM order and optional-container CSS;
- Shopping defaults, protected-unit behavior, and legacy blank-unit semantics;
- font URL, weights and fallback stack;
- normal／blocked／offline browser evidence;
- 320／375／390／430px measurements;
- full test count and check results;
- exact SW diff;
- `git diff --stat` and `git status --short`;
- iPhone Safari／installed PWA items that still require Bar hardware verification.

Do not stage or commit.
