# Ledger 2.0 Dashboard, Quick Entry, Multi-item, and Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Ledger 2.0 mobile dashboard, quick-entry bottom sheet, proxy purchases, deterministic multi-item allocation, settlement panel, and complete history on top of the approved PR 1-4 data contracts.

**Architecture:** Keep `index.html` as the repository's single-file application and add one centralized ledger presentation state plus small pure selectors and allocation helpers. Personal and shared writes continue through their existing repositories; shared effective history, tombstones, and settlement continue through the existing PR 3-4 functions. UI rendering consumes those interfaces and does not introduce a second contract or calculation path.

**Tech Stack:** Vanilla HTML/CSS/ES5-compatible JavaScript, localStorage, existing Apps Script ledger endpoint, Service Worker, Node `assert`/`vm` tests, and browser QA at 390px. No package manager.

## Global Constraints

- Work only on `dev`; do not push or merge `main` and do not deploy Netlify.
- Before implementation, run `git fetch origin --prune`; allow local `dev` to be ahead only by the approved PR 5 design/plan commits and require no uncommitted changes.
- Do not modify `schema.js`, `validator.js`, Apps Script, BUILTIN data, Ledger field contracts, or PR 4 settlement math.
- Preserve `個人帳留在本機；團體帳跨裝置同步。` exactly.
- Personal records remain local-only; shared records use the existing queue and append-only Sheet contract.
- Shared expenses save a JSON participant snapshot; never derive historical participants from a future member list.
- Multi-item records have unique Record IDs and one shared `batchId`; deletion remains per record.
- `税込` adds no tax, `税抜` adds 8% or 10%, `免稅` adds no tax, and discount is one fixed bill-currency amount applied after tax.
- Allocation must preserve exact integer totals in both stored currencies using largest remainder with input-order tie-breaking.
- Bottom-sheet inputs use at least 16px text, actions remain reachable above the keyboard, and controls retain at least 44px touch targets.
- Bottom-sheet background scrolling is locked; its scroll surface uses `touch-action: pan-y`, controls use `touch-action: manipulation`, and pinch remains disabled under the 2026-07-13 Scroll-only policy.
- Do not add JavaScript `touchstart`, `touchmove`, `gesturestart`, or `preventDefault()` handling for the Bottom Sheet.
- Only `CACHE_NAME` changes in `sw.js`, from `okayama-trip-v19` to `okayama-trip-v20`.
- Final implementation commit message is `feat: deliver ledger 2.0 dashboard, quick entry, multi-item and proxy purchases`.

## File Map

- Modify `index.html`: ledger CSS, presentation state, pure selectors, proxy statistics, allocation/batch helpers, dashboard renderer, bottom sheet, persistence orchestration, history/details, and existing ledger test-facing source boundaries.
- Modify `sw.js`: cache-name-only bump to v20.
- Modify `tests/ledger-entry-settings.test.js`: replace legacy form-in-dashboard assertions with bottom-sheet assertions while retaining settings and repository invariants.
- Create `tests/ledger-dashboard.test.js`: dashboard selectors, track isolation, currency display, latest 15, date grouping, and Today behavior.
- Create `tests/ledger-proxy.test.js`: proxy validation, historical member ownership, actual-spend exclusion, and target subtotals.
- Create `tests/ledger-multi-item.test.js`: tax, discount, weighted largest remainder, record IDs, `batchId`, and per-item inheritance/override behavior.
- Create `tests/ledger-quick-entry.test.js`: draft reset policy, participant retention label, repository routing, and queue behavior.
- Modify `07_CHANGELOG.md`, `.ai-manifest.json`, and `tasks/current.md`: record PR 5 delivery and Bar verification state.
- Modify `docs/superpowers/specs/2026-07-13-ios-scroll-only-gesture-policy-design.md`: record the approved Modal/Bottom Sheet Scroll-only rule; no App gesture-policy expansion.

---

### Task 1: Dashboard selectors and proxy statistics

**Files:**
- Create: `tests/ledger-dashboard.test.js`
- Create: `tests/ledger-proxy.test.js`
- Modify: `index.html`, ledger helper section before `renderSplit()`

**Interfaces:**
- Produces: `ledgerLocalDateKey(value) -> "YYYY-MM-DD"|""`.
- Produces: `sortLedgerExpenses(records) -> Expense[]`, newest first without mutating input.
- Produces: `groupLedgerExpensesByDate(records) -> {date:string,records:Expense[]}[]`.
- Produces: `selectRecentLedgerExpenses(records, limit) -> Expense[]`.
- Produces: `buildLedgerPeriodSummary(records, now) -> {count,total:{amountJpy,amountTwd},today:{count,amountJpy,amountTwd}}`.
- Produces: `buildProxySummary(records, currentMember) -> {proxyCount,proxyTotal,actualSpend,targets}`.

- [ ] **Step 1: Write failing selector tests**

Create a VM test that loads the ledger helper section and asserts exact behavior:

```js
const records=Array.from({length:17},(_,index)=>({
  id:'r'+index,time:new Date(2026,6,index<2?17:18,12,index).toISOString(),
  member:index%2?'Bar':'Amy',amountJpy:100+index,amountTwd:20+index,
  isProxy:index===2||index===4,proxyTarget:index===2?'小明':index===4?'店家':''
}));
const recent=mod.selectRecentLedgerExpenses(records,15);
assert.strictEqual(recent.length,15);
assert.strictEqual(recent[0].id,'r16');
assert.strictEqual(records[0].id,'r0','selector does not mutate its input');
const groups=plain(mod.groupLedgerExpensesByDate(recent));
assert(groups.length>=1);
assert(groups.every(group=>group.records.length>0));

const proxy=plain(mod.buildProxySummary(records,'Bar'));
assert.strictEqual(proxy.proxyCount,2);
assert.strictEqual(proxy.actualSpend.amountJpy,
  records.filter(r=>r.member==='Bar'&&!r.isProxy).reduce((sum,r)=>sum+r.amountJpy,0));
assert.deepStrictEqual(proxy.targets.map(item=>item.target),['小明','店家']);
```

Use local noon timestamps so tests do not depend on the machine timezone at a midnight boundary.

- [ ] **Step 2: Run RED**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-proxy.test.js
```

Expected: both fail because the selector functions do not exist.

- [ ] **Step 3: Implement the pure selectors**

Add helpers with safe numeric accumulation and stable ordering:

```js
function ledgerLocalDateKey(value){
  var date=new Date(value);
  if(!isFinite(date.getTime()))return '';
  return [date.getFullYear(),('0'+(date.getMonth()+1)).slice(-2),('0'+date.getDate()).slice(-2)].join('-');
}
function sortLedgerExpenses(records){
  return (records||[]).slice().sort(function(a,b){
    var byTime=String(b&&b.time||'').localeCompare(String(a&&a.time||''));
    return byTime||String(a&&a.id||'').localeCompare(String(b&&b.id||''));
  });
}
function selectRecentLedgerExpenses(records,limit){
  return sortLedgerExpenses(records).slice(0,Math.max(0,Number(limit)||0));
}
function groupLedgerExpensesByDate(records){
  var groups=[],byDate={};
  sortLedgerExpenses(records).forEach(function(record){
    var key=ledgerLocalDateKey(record.time)||'日期不明';
    if(!byDate[key]){byDate[key]={date:key,records:[]};groups.push(byDate[key]);}
    byDate[key].records.push(record);
  });
  return groups;
}
function addLedgerAmounts(target,record){
  target.amountJpy+=Number(record&&record.amountJpy||0);
  target.amountTwd+=Number(record&&record.amountTwd||0);
  return target;
}
function buildLedgerPeriodSummary(records,now){
  var total={amountJpy:0,amountTwd:0},today={count:0,amountJpy:0,amountTwd:0};
  var todayKey=ledgerLocalDateKey(new Date(now==null?Date.now():now));
  (records||[]).forEach(function(record){
    addLedgerAmounts(total,record);
    if(ledgerLocalDateKey(record.time)===todayKey){today.count++;addLedgerAmounts(today,record);}
  });
  return {count:(records||[]).length,total:total,today:today};
}
function buildProxySummary(records,currentMember){
  var member=canonicalMemberName(currentMember),proxyTotal={amountJpy:0,amountTwd:0};
  var actualSpend={amountJpy:0,amountTwd:0},targets=[],byTarget={};
  (records||[]).forEach(function(record){
    if(canonicalMemberName(record.member)===member&&!record.isProxy)addLedgerAmounts(actualSpend,record);
    if(!record.isProxy)return;
    addLedgerAmounts(proxyTotal,record);
    var target=String(record.proxyTarget||'').trim()||'未指定',key=canonicalMemberName(target);
    if(!byTarget[key]){byTarget[key]={target:target,count:0,amountJpy:0,amountTwd:0};targets.push(byTarget[key]);}
    byTarget[key].count++;addLedgerAmounts(byTarget[key],record);
  });
  return {proxyCount:targets.reduce(function(sum,item){return sum+item.count;},0),proxyTotal:proxyTotal,actualSpend:actualSpend,targets:targets};
}
```

- [ ] **Step 4: Run GREEN and regression tests**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-proxy.test.js
node tests/ledger-dual-track.test.js
node tests/ledger-settlement.test.js
```

Expected: all exit 0.

- [ ] **Step 5: Commit the selector boundary**

```powershell
git add index.html tests/ledger-dashboard.test.js tests/ledger-proxy.test.js
git commit -m "feat: add ledger dashboard and proxy selectors"
```

---

### Task 2: Deterministic multi-item allocation and batch construction

**Files:**
- Create: `tests/ledger-multi-item.test.js`
- Modify: `index.html`, ledger helper section

**Interfaces:**
- Consumes: `convertLedgerAmounts(currency, amount, rate)` and `buildParticipantSnapshot(entries,currentMember)`.
- Produces: `allocateWeightedLargestRemainder(total, weights) -> number[]`.
- Produces: `calculateMultiItemAmounts(draft, settings) -> {currency,totalPrimary,totalSecondary,items}`.
- Produces: `buildLedgerExpenseRecords(draft, context) -> Expense[]`.
- Produces: `validateProxyDraft(isProxy,target) -> string` normalized target or throws.

- [ ] **Step 1: Write failing allocation and record tests**

Cover tax included, excluded 8%/10%, tax-free, fixed discount, remainder ties, both currency totals, and overrides:

```js
assert.deepStrictEqual(
  plain(mod.allocateWeightedLargestRemainder(10,[1,1,1])),[4,3,3]
);
assert.deepStrictEqual(
  plain(mod.allocateWeightedLargestRemainder(7,[1,2,1])),[2,3,2]
);
const excluded=plain(mod.calculateMultiItemAmounts({
  currency:'JPY',taxMode:'excluded',taxRate:10,discount:1,
  items:[{amount:101},{amount:100}]
},{exchangeRate:0.2,defaultCurrency:'JPY'}));
assert.strictEqual(excluded.totalPrimary,220);
assert.strictEqual(excluded.items.reduce((sum,item)=>sum+item.amountJpy,0),220);
assert.strictEqual(excluded.items.reduce((sum,item)=>sum+item.amountTwd,0),44);

const draft={track:'shared',currency:'JPY',payMethod:'現金',note:'整單',multi:true,
  taxMode:'free',taxRate:10,discount:0,participants:['Bar','Amy'],items:[
    {key:'i1',name:'票 A',amount:100,category:'票券',participantMode:'inherit',participants:[]},
    {key:'i2',name:'票 B',amount:200,category:'票券',participantMode:'custom',participants:['Amy']}
  ]};
const records=plain(mod.buildLedgerExpenseRecords(draft,{
  member:'Bar',settings:{exchangeRate:0.2,defaultCurrency:'JPY'},now:1000,
  random:()=>0.25,memberEntries:[{name:'Bar'},{name:'Amy'}]
}));
assert.strictEqual(records.length,2);
assert.notStrictEqual(records[0].id,records[1].id);
assert(records[0].batchId&&records[0].batchId===records[1].batchId);
assert.strictEqual(records[0].participants,'["Bar","Amy"]');
assert.strictEqual(records[1].participants,'["Amy"]');
```

Also assert proxy target required/max 12, discount cannot exceed total, zero items fail, unsafe products fail, and tie-breaking follows item order.

- [ ] **Step 2: Run RED**

Run: `node tests/ledger-multi-item.test.js`

Expected: failure because allocation and record-construction functions do not exist.

- [ ] **Step 3: Implement weighted largest remainder**

Use integer-safe products and deterministic remainder ordering:

```js
function allocateWeightedLargestRemainder(total,weights){
  total=Number(total);weights=(weights||[]).map(Number);
  if(!isSafeLedgerInteger(total)||total<0)throw new Error('分配總額必須是非負安全整數');
  if(!weights.length||weights.some(function(value){return !isSafeLedgerInteger(value)||value<0;}))throw new Error('分配權重格式錯誤');
  var weightTotal=weights.reduce(function(sum,value){var next=sum+value;if(!isSafeLedgerInteger(next))throw new Error('分配權重超出安全整數');return next;},0);
  if(weightTotal<=0)throw new Error('分配權重總和必須大於零');
  var used=0,rows=weights.map(function(weight,index){
    var product=total*weight;
    if(!isSafeLedgerInteger(product))throw new Error('分配乘積超出安全整數');
    var amount=Math.floor(product/weightTotal),remainder=product%weightTotal;
    used+=amount;return {index:index,amount:amount,remainder:remainder};
  });
  rows.slice().sort(function(a,b){return b.remainder-a.remainder||a.index-b.index;}).slice(0,total-used).forEach(function(row){rows[row.index].amount++;});
  return rows.map(function(row){return row.amount;});
}
```

- [ ] **Step 4: Implement bill calculation and record building**

Use integer tax bases (`amount * 100` for included/free and `amount * (100+rate)` for excluded), then allocate primary and converted secondary totals with the helper. Record construction resolves each item's inherit/custom semantics and creates IDs before persistence:

```js
function validateProxyDraft(isProxy,target){
  target=String(target||'').trim();
  if(!isProxy)return '';
  if(!target)throw new Error('請輸入代購對象');
  if(target.length>12)throw new Error('代購對象最多 12 個字');
  return target;
}
function multiItemTaxMultiplier(draft){
  if(draft.taxMode==='included'||draft.taxMode==='free')return 100;
  if(draft.taxMode!=='excluded'||(Number(draft.taxRate)!==8&&Number(draft.taxRate)!==10))throw new Error('稅制設定錯誤');
  return 100+Number(draft.taxRate);
}
```

Complete the calculation and participant normalization with these exact shapes:

```js
function normalizeLedgerParticipantSelection(names,entries){
  var allowed={},seen={},result=[];
  (entries||[]).forEach(function(entry){allowed[canonicalMemberName(entry&&entry.name)]=String(entry&&entry.name||'').trim();});
  (names||[]).forEach(function(name){
    var key=canonicalMemberName(name);
    if(!key||!allowed[key])throw new Error('分攤成員不是目前正式成員');
    if(!seen[key]){seen[key]=true;result.push(allowed[key]);}
  });
  if(!result.length)throw new Error('請選擇至少一位分攤成員');
  return result;
}
function calculateMultiItemAmounts(draft,settings){
  var items=(draft.items||[]).slice();
  if(!items.length)throw new Error('請新增至少一個品項');
  var multiplier=multiItemTaxMultiplier(draft),weights=items.map(function(item){
    var amount=Number(item.amount);
    if(!isSafeLedgerInteger(amount)||amount<=0)throw new Error('品項金額必須是正安全整數');
    var weight=amount*multiplier;
    if(!isSafeLedgerInteger(weight))throw new Error('含稅品項金額超出安全整數');
    return weight;
  });
  var weightTotal=weights.reduce(function(sum,value){var next=sum+value;if(!isSafeLedgerInteger(next))throw new Error('含稅總額超出安全整數');return next;},0);
  var postTaxTotal=Math.round(weightTotal/100),discount=Number(draft.discount||0);
  if(!isSafeLedgerInteger(discount)||discount<0)throw new Error('折扣必須是非負整數');
  if(discount>postTaxTotal)throw new Error('折扣不可大於含稅總額');
  var totalPrimary=postTaxTotal-discount;
  if(totalPrimary<=0)throw new Error('實付總額必須大於零');
  var converted=convertLedgerAmounts(draft.currency,totalPrimary,settings.exchangeRate);
  var totalSecondary=draft.currency==='JPY'?converted.amountTwd:converted.amountJpy;
  var primary=allocateWeightedLargestRemainder(totalPrimary,weights);
  var secondary=allocateWeightedLargestRemainder(totalSecondary,weights);
  return {currency:draft.currency,totalPrimary:totalPrimary,totalSecondary:totalSecondary,items:items.map(function(item,index){
    return {source:item,amountJpy:draft.currency==='JPY'?primary[index]:secondary[index],amountTwd:draft.currency==='TWD'?primary[index]:secondary[index]};
  })};
}
function buildLedgerExpenseRecords(draft,context){
  var now=Number(context.now),random=context.random||Math.random,member=String(context.member||'').trim();
  if(!member)throw new Error('請先選擇記帳身分');
  var sourceItems=draft.multi?(draft.items||[]):[{key:'single',name:draft.detail,amount:draft.amount,category:draft.category,proxyMode:'inherit',participantMode:'inherit'}];
  var working={};Object.keys(draft).forEach(function(key){working[key]=draft[key];});working.items=sourceItems;
  var calculated=calculateMultiItemAmounts(working,context.settings),batchId=draft.multi?'batch-'+createLedgerId(now,random):'';
  return calculated.items.map(function(calculatedItem,index){
    var item=calculatedItem.source,name=String(item.name||'').trim(),category=String(item.category||'').trim();
    if(!name)throw new Error('請輸入品項名稱');
    if(ledgerCategoryStore.all().indexOf(category)<0)throw new Error('請選擇有效類別');
    var record={id:createLedgerId(now+index+1,random),time:timestampDate(now).toISOString(),member:member,category:category,detail:name,amountJpy:calculatedItem.amountJpy,amountTwd:calculatedItem.amountTwd,note:String(draft.note||'').trim(),payMethod:String(draft.payMethod||'').trim(),batchId:batchId};
    if(draft.track==='personal'){
      record.isProxy=item.proxyMode==='custom'?!!item.isProxy:!!draft.isProxy;
      record.proxyTarget=validateProxyDraft(record.isProxy,item.proxyMode==='custom'?item.proxyTarget:draft.proxyTarget);
    }else{
      var selected=item.participantMode==='custom'?item.participants:draft.participants;
      record.participants=JSON.stringify(normalizeLedgerParticipantSelection(selected,context.memberEntries));
      record.recordType='expense';record.targetRecordId='';record.deleteReason='';
    }
    return record;
  });
}
```

- [ ] **Step 5: Run GREEN and contract regressions**

Run:

```powershell
node tests/ledger-multi-item.test.js
node tests/ledger-schema-contract.test.js
node tests/ledger-sync.test.js
node tests/ledger-settlement.test.js
```

Expected: all exit 0; PR 4 tests remain unchanged and passing.

- [ ] **Step 6: Commit the pure multi-item engine**

```powershell
git add index.html tests/ledger-multi-item.test.js
git commit -m "feat: add deterministic multi-item ledger allocation"
```

---

### Task 3: Central UI state and mobile dashboard

**Files:**
- Modify: `index.html`, ledger CSS and split renderer
- Modify: `tests/ledger-dashboard.test.js`
- Modify: `tests/ledger-entry-settings.test.js`

**Interfaces:**
- Consumes: Task 1 selectors and existing `mergedLedgerRecords()`, `spendLedgerRecords()`, `currentLedgerSettings()`.
- Produces: `ledgerUiState`, `ledgerTrackRecords()`, `setLedgerTrack(value)`, `toggleLedgerDisplayCurrency()`, and `renderSplit()` dashboard.

- [ ] **Step 1: Extend tests for one presentation state and dashboard structure**

Add assertions requiring the fixed hierarchy and forbidding the legacy inline add form:

```js
assert(html.includes("var ledgerUiState={track:'personal'"));
assert(splitSource.includes('個人帳留在本機；團體帳跨裝置同步。'));
assert(splitSource.includes('ledger-status-pill'));
assert(splitSource.includes('ledger-summary-card'));
assert(splitSource.includes('ledger-today-card'));
assert(splitSource.includes('ledger-recent-list'));
assert(splitSource.includes('查看全部'));
assert(splitSource.includes('openLedgerEntrySheet'));
assert(!splitSource.includes('id="ledgerAmount"'),'amount input lives only in the sheet renderer');
```

Test `toggleLedgerDisplayCurrency()` by stubbing `renderSplit` and asserting no personal/shared record object changes.

- [ ] **Step 2: Run RED**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-entry-settings.test.js
```

Expected: failure because dashboard state and markup do not exist.

- [ ] **Step 3: Add state and data-source boundary**

Replace the separate `ledgerTrack` draft globals with one state:

```js
var ledgerUiState={track:'personal',displayCurrency:'',page:'dashboard',filter:'all',sheet:null,selectedRecordId:'',draft:null,retainedParticipants:null};
function ledgerTrackRecords(){
  return ledgerUiState.track==='shared'
    ?spendLedgerRecords(mergedLedgerRecords())
    :sortLedgerExpenses(personalLedgerRepository.all());
}
function setLedgerTrack(value){
  if(value!=='personal'&&value!=='shared')return;
  ledgerUiState.track=value;ledgerUiState.page='dashboard';ledgerUiState.filter='all';
  ledgerUiState.displayCurrency='';renderSplit();
}
function toggleLedgerDisplayCurrency(){
  var settings=currentLedgerSettings(),current=ledgerUiState.displayCurrency||settings.defaultCurrency;
  ledgerUiState.displayCurrency=current==='JPY'?'TWD':'JPY';renderSplit();
}
```

Update pending-status and TEST-mode checks to read `ledgerUiState.track`; do not keep a parallel `ledgerTrack` variable.

- [ ] **Step 4: Replace `renderSplit()` with dashboard markup and CSS**

Add restrained dashboard selectors and stable dimensions:

```css
.ledger-dashboard{display:grid;gap:12px}.ledger-status-pill{display:inline-flex;min-height:30px;align-items:center;border-radius:999px;padding:5px 10px;background:var(--line-soft);font-size:12px;font-weight:900}
.ledger-summary-card{background:var(--sea-deep);color:#fff;border-radius:8px;padding:14px}.ledger-summary-amount{width:100%;min-height:68px;border:0;background:transparent;color:inherit;text-align:left;font:inherit}
.ledger-summary-amount strong{display:block;font-size:30px;line-height:1.15}.ledger-compact-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ledger-compact-card{min-width:0;min-height:112px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px;text-align:left}
.ledger-fab{position:fixed;right:16px;bottom:calc(var(--tabbar-height) + env(safe-area-inset-bottom) + 14px);z-index:90;width:52px;height:52px;border-radius:50%;border:0;background:var(--coral);color:#fff;font-size:28px;box-shadow:var(--shadow)}
```

Render latest 15 through `selectRecentLedgerExpenses()` and `groupLedgerExpensesByDate()`. The amount button calls only `toggleLedgerDisplayCurrency()`.

- [ ] **Step 5: Run GREEN and source-boundary regressions**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-entry-settings.test.js
node tests/ledger-dual-track.test.js
```

Expected: all exit 0 and no test requires the removed inline form.

- [ ] **Step 6: Commit the dashboard**

```powershell
git add index.html tests/ledger-dashboard.test.js tests/ledger-entry-settings.test.js
git commit -m "feat: render ledger 2.0 mobile dashboard"
```

---

### Task 4: Quick-entry bottom sheet and single-item persistence

**Files:**
- Create: `tests/ledger-quick-entry.test.js`
- Modify: `index.html`, ledger state/actions/renderers

**Interfaces:**
- Consumes: existing settings, member, option stores, repositories, and Task 3 state.
- Produces: `createLedgerEntryDraft(track)`, `openLedgerEntrySheet()`, `closeLedgerEntrySheet()`, `renderLedgerEntrySheet()`, `saveLedgerEntry(addAnother)`.
- Produces HTML-only helpers: `renderLedgerDraftTrack(draft)`, `renderLedgerDraftCurrency(draft)`, `renderLedgerSingleItemFields(draft)`, `renderLedgerPaymentFields(draft)`, `renderLedgerTrackSpecificFields(draft)`, and `renderLedgerNoteField(draft)`; each returns one escaped markup string and performs no writes.

- [ ] **Step 1: Write failing quick-entry tests**

Test default shared participants, single-item routing, and reset policy:

```js
const shared=plain(mod.createLedgerEntryDraft('shared'));
assert.strictEqual(shared.track,'shared');
assert.deepStrictEqual(shared.participants,['Bar','Amy']);
assert.strictEqual(shared.multi,false);

const retained=plain(mod.resetLedgerDraftAfterSave({
  track:'shared',currency:'JPY',category:'餐飲',payMethod:'現金',amount:'900',detail:'晚餐',note:'二樓',participants:['Bar','Amy']
}));
assert.strictEqual(retained.category,'餐飲');
assert.strictEqual(retained.payMethod,'現金');
assert.deepStrictEqual(retained.participants,['Bar','Amy']);
assert.strictEqual(retained.participantsRetained,true);
assert.strictEqual(retained.amount,'');
assert.strictEqual(retained.detail,'');
assert.strictEqual(retained.note,'');
```

Stub `personalLedgerRepository.add` and `ledgerRepository.add` to prove the opposite track is never called.

- [ ] **Step 2: Run RED**

Run: `node tests/ledger-quick-entry.test.js`

Expected: failure because draft and sheet actions do not exist.

- [ ] **Step 3: Implement draft creation, reset, and sheet lifecycle**

Use the current formal member entries for shared defaults:

```js
function createLedgerEntryDraft(track){
  var settings=currentLedgerSettings(),participants=track==='shared'?registeredMembersForCurrentMode().map(function(entry){return entry.name;}):[];
  return {track:track,currency:settings.defaultCurrency,multi:false,amount:'',detail:'',category:ledgerCategoryStore.all()[0]||'',payMethod:ledgerPayMethodStore.all()[0]||'',note:'',isProxy:false,proxyTarget:'',participants:participants,participantsRetained:false,taxMode:'included',taxRate:10,discount:'',items:[]};
}
function resetLedgerDraftAfterSave(draft){
  var next=createLedgerEntryDraft(draft.track);
  next.currency=draft.currency;next.category=draft.category;next.payMethod=draft.payMethod;
  if(draft.track==='shared'){next.participants=(draft.participants||[]).slice();next.participantsRetained=true;}
  return next;
}
```

`openLedgerEntrySheet()` creates the draft from the dashboard's active track, adds `ledger-sheet-open` to the body, and renders one overlay. `closeLedgerEntrySheet()` removes the overlay, body class, and draft.

- [ ] **Step 4: Render the ordered sheet and mobile-safe CSS**

Use a fixed overlay with an internal scrolling panel and sticky actions:

```css
body.ledger-sheet-open{overflow:hidden}.ledger-sheet-overlay{position:fixed;inset:0;z-index:135;background:rgba(10,45,50,.36);display:flex;align-items:flex-end}
.ledger-sheet{width:100%;max-width:620px;max-height:calc(100dvh - env(safe-area-inset-top) - 12px);margin:0 auto;background:var(--paper);border-radius:8px 8px 0 0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:14px 12px calc(16px + env(safe-area-inset-bottom))}
.ledger-sheet button,.ledger-sheet input,.ledger-sheet select,.ledger-sheet textarea{touch-action:manipulation}.ledger-sheet input,.ledger-sheet textarea{font-size:16px}.ledger-sheet-actions{position:sticky;bottom:calc(-16px - env(safe-area-inset-bottom));background:var(--paper);padding:10px 0 calc(12px + env(safe-area-inset-bottom));display:grid;gap:8px}.ledger-sheet-actions .btn{min-height:44px}
```

Add source assertions to `tests/ledger-entry-settings.test.js` requiring `touch-action:pan-y` on `.ledger-sheet`, scoped `touch-action:manipulation` on its controls, and no Bottom Sheet-specific `touchstart`, `touchmove`, `gesturestart`, or `preventDefault()` listener.

Build the sheet in the exact approved order. Keep the field IDs stable for tests and focus recovery:

```js
function renderLedgerEntrySheet(){
  var overlay=document.getElementById('ledgerEntrySheet'),draft=ledgerUiState.draft;if(!overlay||!draft)return;
  overlay.innerHTML='<section class="ledger-sheet" role="dialog" aria-modal="true" aria-labelledby="ledgerEntryTitle">'+
    '<div class="ledger-sheet-head"><h2 id="ledgerEntryTitle">新增消費</h2><button class="settings-close" aria-label="關閉" onclick="closeLedgerEntrySheet()">×</button></div>'+
    '<label class="toggle-row" for="ledgerMulti"><span>多品項</span><input id="ledgerMulti" type="checkbox" '+(draft.multi?'checked':'')+' onchange="setLedgerDraftMulti(this.checked)"></label>'+
    '<div class="settings-current">目前記帳身分：<b>'+escapeHtml(getCurrentMember())+'</b></div>'+
    renderLedgerDraftTrack(draft)+renderLedgerDraftCurrency(draft)+
    (draft.multi?renderLedgerMultiItemFields(draft):renderLedgerSingleItemFields(draft))+
    renderLedgerPaymentFields(draft)+renderLedgerTrackSpecificFields(draft)+renderLedgerNoteField(draft)+
    '<div class="ledger-sheet-actions"><button id="ledgerSave" class="btn coral" onclick="saveLedgerEntry(false)">儲存</button><button id="ledgerSaveAnother" class="btn" onclick="saveLedgerEntry(true)">儲存並再記一筆</button></div></section>';
}
```

`renderLedgerSingleItemFields()` outputs `ledgerAmount`, `ledgerConvertedPreview`, `ledgerDetail`, and category chips in the approved amount/detail/category order. `renderLedgerTrackSpecificFields()` outputs `ledgerProxy` plus `ledgerProxyTarget` for personal, or `ledgerParticipants` plus the visible retained-selection text for shared. All chip buttons use `aria-pressed`; checkbox inputs have explicit labels.

- [ ] **Step 5: Implement single-item save**

`saveLedgerEntry(addAnother)` builds one record through `buildLedgerExpenseRecords`, validates the complete list, then routes only to the active repository. On success, close the sheet or apply `resetLedgerDraftAfterSave`; on failure retain the draft and re-enable buttons.

For shared records, call `ledgerRepository.add(record)`. For personal records, call `personalLedgerRepository.add(record)`. Do not call both paths from one save.

- [ ] **Step 6: Run GREEN and interaction-source regressions**

Run:

```powershell
node tests/ledger-quick-entry.test.js
node tests/ledger-entry-settings.test.js
node tests/registered-member-identity.test.js
node tests/ios-zoom-guard.test.js
```

Expected: all exit 0.

- [ ] **Step 7: Commit the quick-entry sheet**

```powershell
git add index.html tests/ledger-quick-entry.test.js tests/ledger-entry-settings.test.js
git commit -m "feat: add ledger quick entry bottom sheet"
```

---

### Task 5: Proxy and multi-item sheet behavior

**Files:**
- Modify: `index.html`
- Modify: `tests/ledger-proxy.test.js`
- Modify: `tests/ledger-multi-item.test.js`
- Modify: `tests/ledger-quick-entry.test.js`

**Interfaces:**
- Consumes: Task 2 allocation/batch builder and Task 4 sheet state.
- Produces: `setLedgerDraftMulti(enabled)`, `addLedgerDraftItem()`, `removeLedgerDraftItem(key)`, `setLedgerItemOverride(key,kind,value)`, and multi-item save orchestration.
- Produces HTML-only helpers: `renderLedgerMultiItemFields(draft)`, `renderLedgerItemCategory(item)`, and `renderLedgerItemOverride(item,draft)`; each returns one escaped markup string and performs no repository writes.

- [ ] **Step 1: Add failing sheet-state and persistence tests**

Assert switching and override state with concrete draft mutations:

```js
mod.ledgerUiState.draft=mod.createLedgerEntryDraft('personal');
mod.setLedgerDraftMulti(true);
assert.strictEqual(mod.ledgerUiState.draft.items.length,1);
const firstKey=mod.ledgerUiState.draft.items[0].key;
mod.addLedgerDraftItem();
assert.strictEqual(mod.ledgerUiState.draft.items.length,2);
mod.updateLedgerDraftItem(firstKey,{category:'交通',proxyMode:'custom',isProxy:true,proxyTarget:'小明'});
assert.strictEqual(mod.ledgerUiState.draft.items[0].category,'交通');
assert.strictEqual(mod.ledgerUiState.draft.items[0].proxyTarget,'小明');
assert.notStrictEqual(mod.ledgerUiState.draft.items[0],mod.ledgerUiState.draft.items[1]);
```

Generate personal and shared batches and assert personal `isProxy`/`proxyTarget` and shared `participants` differ between inherited and overridden items exactly as the draft specifies.

For shared queue behavior, call save with three generated records and assert all three IDs exist in the queue before the mocked first POST resolves:

```js
const promise=mod.persistLedgerExpenseRecords(records,'shared');
assert.deepStrictEqual(mod.ledgerRepository.queuedRecords().map(r=>r.id),records.map(r=>r.id));
releasePost({ok:true});
const result=await promise;
assert.strictEqual(result.records.length,3);
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node tests/ledger-multi-item.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-proxy.test.js
```

Expected: new UI-state and persistence assertions fail.

- [ ] **Step 3: Implement item state actions**

Use immutable item replacement so rerenders cannot mutate historical records:

```js
function updateLedgerDraftItem(key,patch){
  if(!ledgerUiState.draft)return;
  ledgerUiState.draft.items=ledgerUiState.draft.items.map(function(item){
    if(item.key!==key)return item;
    var next={};Object.keys(item).forEach(function(name){next[name]=item[name];});
    Object.keys(patch||{}).forEach(function(name){next[name]=patch[name];});return next;
  });
  renderLedgerEntrySheet();
}
function addLedgerDraftItem(){
  var draft=ledgerUiState.draft;if(!draft)return;
  draft.items.push({key:createLedgerId(Date.now(),Math.random),name:'',amount:'',category:draft.category,proxyMode:'inherit',isProxy:draft.isProxy,proxyTarget:draft.proxyTarget,participantMode:'inherit',participants:[]});
  renderLedgerEntrySheet();
}
```

Do not use a shared item object reference for multiple rows.

- [ ] **Step 4: Render compact item cards and bill controls**

Render each item with one named helper and no per-item payment/currency controls:

```js
function ledgerItemOverrideSummary(item,track){
  if(track==='personal')return item.proxyMode!=='custom'?'沿用整單':item.isProxy?'代購：'+String(item.proxyTarget||'未指定'):'非代購';
  return item.participantMode!=='custom'?'沿用整單':'分攤 '+(item.participants||[]).length+' 人';
}
function renderLedgerDraftItem(item,index,draft){
  return '<article class="ledger-item-editor" data-item-key="'+escapeHtml(item.key)+'"><div class="ledger-item-number">品項 '+(index+1)+'</div>'+
    '<input class="ledger-item-name" value="'+escapeHtml(item.name)+'" aria-label="品項名稱" oninput="updateLedgerDraftItem(\''+jsString(item.key)+'\',{name:this.value})">'+
    '<input class="ledger-item-amount" type="number" inputmode="numeric" min="1" value="'+escapeHtml(item.amount)+'" aria-label="品項金額" oninput="updateLedgerDraftItem(\''+jsString(item.key)+'\',{amount:this.value})">'+
    renderLedgerItemCategory(item)+
    '<button class="ledger-item-override" aria-expanded="'+(item.overrideOpen?'true':'false')+'" onclick="updateLedgerDraftItem(\''+jsString(item.key)+'\',{overrideOpen:'+(!item.overrideOpen)+'})"><span>單項設定</span><span>'+escapeHtml(ledgerItemOverrideSummary(item,draft.track))+'</span></button>'+
    (item.overrideOpen?renderLedgerItemOverride(item,draft):'')+
    (draft.items.length>1?'<button class="ledger-item-remove" onclick="removeLedgerDraftItem(\''+jsString(item.key)+'\')">移除品項</button>':'')+'</article>';
}
```

`renderLedgerMultiItemFields()` places the bill-level controls in this order: currency, payment, item cards, add-item button, `税込／税抜／免稅`, conditional 8%/10%, fixed discount, live paid total, and note. Tests assert the rendered multi-item source contains no per-item currency or payment selector.

- [ ] **Step 5: Persist a validated batch without losing queued items**

Implement the repository orchestration so all `ledgerRepository.add()` calls are made synchronously before awaiting:

```js
function persistLedgerExpenseRecords(records,track){
  if(track==='personal'){
    var normalized=records.map(function(record){var item=normalizePersonalLedgerRecord(record,Date.parse(record.time),Math.random);validateLedgerRecord(item);validateProxyDraft(item.isProxy,item.proxyTarget);return item;});
    return Promise.resolve({ok:true,personal:true,records:normalized.map(function(record){return personalLedgerRepository.add(record);})});
  }
  var promises=records.map(function(record){return ledgerRepository.add(record);});
  return Promise.all(promises).then(function(results){return {ok:results.every(function(result){return result.ok;}),records:results.map(function(result){return result.record;}),pending:ledgerRepository.pendingCount()};});
}
```

The shared repository's existing synchronous queue append happens before its Promise yields, so all records are queued before network completion.

- [ ] **Step 6: Run GREEN and offline regressions**

Run:

```powershell
node tests/ledger-multi-item.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-proxy.test.js
node tests/ledger-sync.test.js
node tests/ledger-dual-track.test.js
```

Expected: all exit 0.

- [ ] **Step 7: Commit proxy and multi-item UI**

```powershell
git add index.html tests/ledger-proxy.test.js tests/ledger-multi-item.test.js tests/ledger-quick-entry.test.js
git commit -m "feat: add proxy and multi-item ledger workflows"
```

---

### Task 6: Settlement, full history, details, and deletion integration

**Files:**
- Modify: `index.html`
- Modify: `tests/ledger-dashboard.test.js`
- Modify: `tests/ledger-settlement.test.js`
- Modify: `tests/ledger-tombstone-deletion.test.js`

**Interfaces:**
- Consumes: Task 1 selectors, existing PR 3 deletion functions, and PR 4 settlement functions.
- Produces: `renderLedgerSettlementCard(records,member)`, `openLedgerSettlementPanel()`, `showLedgerFullList()`, `openLedgerRecordDetail(id)`, and `renderLedgerRecordDetail(record)`.

- [ ] **Step 1: Write failing integration tests**

Add exact settlement assertions:

```js
const positive=plain(mod.ledgerSettlementStatus({netJpy:100,netTwd:0}));
assert.deepStrictEqual(positive,{kind:'receivable',label:'應收',amountJpy:100,amountTwd:0});
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:-50,netTwd:-10}).label,'應付');
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:0,netTwd:0}).label,'已結清');
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:50,netTwd:-10}).label,'雙幣待結算');
const settlementSource=html.slice(html.indexOf('function ledgerCurrentMemberSettlement('),html.indexOf('function showLedgerFullList('));
assert(settlementSource.includes('buildMemberBalances(records)'));
assert(settlementSource.includes("buildTransferSuggestions(balances,'JPY')"));
assert(settlementSource.includes("buildTransferSuggestions(balances,'TWD')"));
assert(!settlementSource.includes('owedJpy+='));
assert(!settlementSource.includes('paidJpy+='));
```

Add history tests that personal proxy filtering returns only `isProxy===true`, shared history consumes `spendLedgerRecords(mergedLedgerRecords())`, and tombstoned targets have no detail or delete action.

- [ ] **Step 2: Run RED**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-settlement.test.js
node tests/ledger-tombstone-deletion.test.js
```

Expected: new panel/history assertions fail.

- [ ] **Step 3: Add settlement formatting only**

Use the PR 4 result as the sole input:

```js
function ledgerCurrentMemberSettlement(records,member){
  var balances=buildMemberBalances(records),key=canonicalMemberName(member),current=null;
  balances.members.forEach(function(item){if(canonicalMemberName(item.member)===key)current=item;});
  return {balances:balances,current:current||{member:member,paidJpy:0,owedJpy:0,netJpy:0,paidTwd:0,owedTwd:0,netTwd:0},jpy:buildTransferSuggestions(balances,'JPY'),twd:buildTransferSuggestions(balances,'TWD')};
}
function ledgerSettlementStatus(current){
  var jpy=Number(current&&current.netJpy||0),twd=Number(current&&current.netTwd||0),kind,label;
  if(jpy===0&&twd===0){kind='settled';label='已結清';}
  else if(jpy>=0&&twd>=0){kind='receivable';label='應收';}
  else if(jpy<=0&&twd<=0){kind='payable';label='應付';}
  else{kind='mixed';label='雙幣待結算';}
  return {kind:kind,label:label,amountJpy:Math.abs(jpy),amountTwd:Math.abs(twd)};
}
```

`renderLedgerSettlementCard` and the expanded panel only format `current`, `balances.members`, `jpy`, `twd`, and `balances.invalidRecords`.

- [ ] **Step 4: Add full-list and detail views**

`showLedgerFullList()` sets `ledgerUiState.page='all'` and rerenders. Personal filter buttons set `ledgerUiState.filter` to `all` or `proxy`. Record detail lookup uses the currently selected track's visible records, never raw tombstones.

Render details from the selected visible record with a fixed field list:

```js
function ledgerRecordDetailRows(record,track){
  var rows=[['紀錄 ID',record.id],['時間',record.time],['成員',record.member],['類別',record.category],['明細',record.detail],['JPY','¥'+Number(record.amountJpy||0).toLocaleString()],['TWD','NT$'+Number(record.amountTwd||0).toLocaleString()],['支付方式',record.payMethod],['備註',record.note],['批次 ID',record.batchId],['同步狀態',record.pending?'待同步':'已同步']];
  if(track==='personal'&&record.isProxy)rows.push(['代購對象',record.proxyTarget]);
  if(track==='shared'){var participants=parseParticipants(record)||[];rows.push(['分攤成員',participants.join('、')]);}
  return rows.filter(function(row){return String(row[1]==null?'':row[1]).trim()!=='';});
}
```

`openLedgerRecordDetail(id)` searches only `ledgerTrackRecords()`, renders these rows, and appends exactly one delete action: `deletePersonalLedgerRecord(id)` for personal or `openSharedLedgerDelete(id)` for shared.

- [ ] **Step 5: Run GREEN and deletion regressions**

Run:

```powershell
node tests/ledger-dashboard.test.js
node tests/ledger-settlement.test.js
node tests/ledger-tombstone-deletion.test.js
node tests/ledger-sync.test.js
```

Expected: all exit 0.

- [ ] **Step 6: Commit settlement and history UI**

```powershell
git add index.html tests/ledger-dashboard.test.js tests/ledger-settlement.test.js tests/ledger-tombstone-deletion.test.js
git commit -m "feat: add ledger settlement and complete history views"
```

---

### Task 7: Documentation, service worker, complete verification, and dev delivery

**Files:**
- Modify: `sw.js`
- Modify: `07_CHANGELOG.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`
- Verify: every `tests/*.test.js`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a reviewable PR 5 delivery on `origin/dev` with no production deployment.

- [ ] **Step 1: Update the cache-version test, then run RED**

Update the relevant `tests/pwa-shell.test.js` assertion to require:

```js
assert(swSource.includes("var CACHE_NAME = 'okayama-trip-v20';"));
```

Run: `node tests/pwa-shell.test.js`

Expected: failure while `sw.js` remains v19.

- [ ] **Step 2: Bump only the cache name**

Change exactly:

```js
var CACHE_NAME = 'okayama-trip-v20';
```

Run `git diff -- sw.js` and require a one-line cache-name change.

- [ ] **Step 3: Update delivery documents**

Add a dated Traditional Chinese CHANGELOG entry covering dashboard, quick entry, proxy, multi-item allocation, settlement/history, focused tests, and SW v20. Update only the existing status arrays/sections in `.ai-manifest.json` and `tasks/current.md` to mark PR 5 ready for Bar mobile acceptance; do not rewrite unrelated governance content.

- [ ] **Step 4: Run every static and Node test**

Run:

```powershell
node tools/check-doc-titles.js
$failed=@(); Get-ChildItem tests -Filter *.test.js | Sort-Object Name | ForEach-Object { node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; if($failed.Count){Write-Error ('Failed: '+($failed -join ', ')); exit 1}
git diff --check
```

Expected: document check passes, every test exits 0, and diff check is clean.

- [ ] **Step 5: Run 390px browser QA**

Start a local server on an unused port and inspect `index.html` at 390x844. Verify:

- Today, Trip, Shopping, and Ledger tabs each render with `pageerror=0`.
- Ledger defaults to Personal and the fixed copy is visible.
- Total currency toggles without changing stored record JSON.
- FAB clears the bottom navigation and iOS safe area.
- Single-item personal save is immediate.
- Shared offline save produces pending status.
- Proxy target validation and actual-spend exclusion are visible.
- Multi-item tax-included, tax-excluded, tax-free, discount, item override, and sum proof work.
- Opening the keyboard leaves both save actions reachable by internal scrolling.
- Background stays locked while the sheet is open; internal vertical scrolling works and pinch remains disabled by CSS-only Scroll-only declarations.
- Opening and using the sheet adds no JavaScript touch/gesture interceptor or `preventDefault()` path.
- Settlement expand, full list, detail, personal delete, and shared tombstone delete paths work.

Capture desktop and mobile screenshots only as temporary QA artifacts; do not add them to Git.

- [ ] **Step 6: Inspect scope and commit the final integration metadata**

Run:

```powershell
git status --short
git diff --stat origin/dev...HEAD
git diff --name-only origin/dev...HEAD
```

Require no changes to `schema.js`, `validator.js`, Apps Script, manifest, icons, Netlify configuration, or BUILTIN data. Commit remaining cache/test/document changes:

```powershell
git add sw.js tests/pwa-shell.test.js 07_CHANGELOG.md .ai-manifest.json tasks/current.md
git commit -m "feat: deliver ledger 2.0 dashboard, quick entry, multi-item and proxy purchases"
```

- [ ] **Step 7: Final verification and push dev**

Run the complete command from Step 4 again, then:

```powershell
git status --short
git push origin dev
git rev-parse HEAD
git rev-parse origin/dev
```

Expected: tests pass, working tree is clean, hashes match, and no Netlify deployment or `main` operation occurs.
