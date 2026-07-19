# Ledger 2.1 UX, Editing, and TEST Universe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Schema 2.7, structured store and edit linkage, a stable quick-entry sheet, TEST-only settlement, queue-first shared saves, richer tax/proxy entry, editing, and searchable history on top of Ledger 2.0.

**Architecture:** Preserve the single-file application and the existing personal/shared repository split. Extend the append-only shared contract at the end, add pure universe/tax/search selectors, and keep all UI consumers on those shared selectors; shared writes become atomic local queue acknowledgments followed by background `flushQueue()`. Shared edits append tombstones plus replacement records, while personal edits atomically replace local records.

**Tech Stack:** Vanilla HTML/CSS/ES5 JavaScript, Node.js assertion tests, Google Apps Script, Google Sheets CSV, localStorage, Service Worker.

## Global Constraints

- Start from clean `dev` equal to `origin/dev`; do not merge or push `main`.
- Before modifying Tier 2 files, present reason, impact, risk, and rollback in writing and receive Bar approval.
- Do not create `package.json` or add dependencies.
- Do not use AbortController or add touch/gesture `preventDefault()` paths.
- Keep personal ledger local-only and shared ledger repository-only.
- Keep JPY/TWD as the only input currencies and preserve the four-tab structure.
- Do not modify CMS pre-trip expense logic, BUILTIN, validator logging mechanisms, icons, `manifest.webmanifest`, `netlify.toml`, Scroll-only, or viewport recovery.
- Schema 2.7 has 16 positional Ledger columns; `time` means expense occurrence time.
- Deploy the backward-compatible Apps Script before publishing the frontend that sends columns 15-16.
- The final frontend cache is exactly `okayama-trip-v21`.

---

## File Map

- `schema.js`: authoritative Schema 2.7 Ledger column definitions.
- `09_SCHEMA_MAPPING.md`: generated Schema mapping table.
- `apps-script/ledger-sync.gs`: 16-column append adapter; no new endpoint or action.
- `apps-script/README.md`: deploy and payload maintenance contract.
- `index.html`: repositories, normalization, TEST universe, entry sheet, tax, proxy store, edit/history UI.
- `tests/ledger-schema-contract.test.js`: positional Schema and Apps payload compatibility.
- `tests/apps-script-settings.test.js`: Apps Script append order and settings regression.
- `tests/ledger-sync.test.js`: record normalization, universe selection, queue behavior.
- `tests/ledger-settlement.test.js`: formal/TEST settlement isolation.
- `tests/ledger-quick-entry.test.js`: entry draft, optimistic save, store/time and sheet lifecycle.
- `tests/ledger-multi-item.test.js`: tax, discount, exemption and allocation invariants.
- `tests/ledger-proxy.test.js`: proxy-target store behavior.
- `tests/settings-backup-ux.test.js`: export/restore version and proxy targets.
- `tests/ledger-editing.test.js`: personal replacement and shared tombstone/replacement batches.
- `tests/ledger-history-search.test.js`: search, filters and grouping selectors.
- `tests/ledger-entry-settings.test.js`: sheet markup, spinner and settings UI assertions.
- `tests/ledger-dashboard.test.js`: TEST banner and dashboard universe wiring.
- `adr/0006-ledger-sync-apps-script.md`, `03_DATABASE.md`, `08_AI_HANDOVER.md`, `.ai-manifest.json`: architecture/data invariants.
- `07_CHANGELOG.md`, `tasks/current.md`, `tasks/backlog.md`: delivery status.
- `sw.js`: cache name only.

---

### Task 1: Schema 2.7 and backward-compatible Apps Script

**Files:**
- Modify: `schema.js`
- Modify: `09_SCHEMA_MAPPING.md`
- Modify: `apps-script/ledger-sync.gs`
- Modify: `apps-script/README.md`
- Modify: `adr/0006-ledger-sync-apps-script.md`
- Modify: `03_DATABASE.md`
- Test: `tests/ledger-schema-contract.test.js`
- Test: `tests/apps-script-settings.test.js`

**Interfaces:**
- Consumes: existing 14-column positional Ledger contract.
- Produces: Schema 2.7 with `storeName` and `replacesRecordId`; Apps Script accepts old and new payloads.

- [ ] **Step 1: Add failing Schema assertions**

Add assertions that load `schema.js` and require the exact suffix and new `time` description:

```javascript
assert.strictEqual(schema.version,'2.7');
assert.deepStrictEqual(
  schema.sheets.ledger.columns.map(function(column){return column.field;}),
  ['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId','storeName','replacesRecordId']
);
assert(/消費發生時間/.test(schema.sheets.ledger.columns[1].desc));
assert.strictEqual(schema.sheets.ledger.columns[14].header,'店名');
assert.strictEqual(schema.sheets.ledger.columns[15].header,'取代紀錄ID');
```

- [ ] **Step 2: Add failing Apps Script append assertions**

Require the final append order in `tests/apps-script-settings.test.js`:

```javascript
assert(script.includes("d.batchId || '', d.storeName || '', d.replacesRecordId || ''"));
assert.strictEqual((appendExpression.match(/d\./g)||[]).length,16);
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```powershell
node tests/ledger-schema-contract.test.js
node tests/apps-script-settings.test.js
```

Expected: both fail because Schema is 2.6 and the adapter appends 14 fields.

- [ ] **Step 4: Extend the authoritative Schema**

Set `SCHEMA.version` to `2.7`, change the `time` description to `ISO 8601 消費發生時間`, and append:

```javascript
{ field:'storeName',        header:'店名',       desc:'選填;消費店家名稱,供搜尋與顯示' },
{ field:'replacesRecordId', header:'取代紀錄ID', desc:'選填;團體編輯新筆指向被取代紀錄或 batch 根紀錄' }
```

- [ ] **Step 5: Extend Apps Script without changing validation or actions**

Change only the append payload tail:

```javascript
sh.appendRow([
  d.id,d.time,d.member,d.category,d.detail,d.amountJpy,d.amountTwd,d.note,
  d.participants||'',d.payMethod||'',d.recordType||'',d.targetRecordId||'',
  d.deleteReason||'',d.batchId||'',d.storeName||'',d.replacesRecordId||''
]);
```

Old payloads naturally write empty columns 15-16.

- [ ] **Step 6: Regenerate the Schema mapping table**

Generate the authoritative output to stdout, then use `apply_patch` to replace only the generated table section in `09_SCHEMA_MAPPING.md`:

```powershell
node -e "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('schema.js','utf8'),c);process.stdout.write(c.schemaDoc())"
```

Confirm its Ledger table contains 16 rows and version 2.7.

- [ ] **Step 7: Update contract documentation**

Record all of the following verbatim in `apps-script/README.md`, `adr/0006-ledger-sync-apps-script.md`, and `03_DATABASE.md`:

- `time` is expense occurrence time and existing rows are not migrated.
- columns 15-16 are optional, positional and backward compatible;
- shared edits remain append-only;
- Apps Script must be deployed before the frontend;
- `updateSettings`, LockService and ID deduplication are unchanged.

- [ ] **Step 8: Run focused verification**

Run:

```powershell
node tests/ledger-schema-contract.test.js
node tests/apps-script-settings.test.js
node tests/schema-types.test.js
node tools/check-doc-titles.js
```

Expected: all exit 0.

- [ ] **Step 9: Commit the contract foundation**

```powershell
git add schema.js 09_SCHEMA_MAPPING.md apps-script/ledger-sync.gs apps-script/README.md adr/0006-ledger-sync-apps-script.md 03_DATABASE.md tests/ledger-schema-contract.test.js tests/apps-script-settings.test.js
git commit -m "feat: extend ledger schema for stores and edit linkage"
```

- [ ] **Step 10: Stop for Apps Script deployment**

Provide Bar the exact `apps-script/ledger-sync.gs` deployment source and wait until Bar confirms the new deployment is live. Do not begin frontend writes of columns 15-16 before that confirmation.

---

### Task 2: Record normalization and personal persistence

**Files:**
- Modify: `index.html:2901-2965`
- Modify: `tests/ledger-sync.test.js`

**Interfaces:**
- Consumes: Schema 2.7 properties.
- Produces: normalized `storeName`/`replacesRecordId` and atomic personal batch replacement.

- [ ] **Step 1: Write failing normalization tests**

```javascript
const normalized=mod.normalizeLedgerRecord({
  member:'黃柏',amountJpy:100,amountTwd:20,storeName:'  松屋  ',replacesRecordId:' old-1 '
},1000,()=>0,false);
assert.strictEqual(normalized.storeName,'松屋');
assert.strictEqual(normalized.replacesRecordId,'old-1');
const personal=mod.normalizePersonalLedgerRecord(normalized,1000,()=>0);
assert.strictEqual(personal.storeName,'松屋');
assert.strictEqual(personal.replacesRecordId,'old-1');
```

- [ ] **Step 2: Write failing personal atomic-replace tests**

Create a repository with two records in one batch and assert `replaceBatch('batch-1', replacements)` performs one storage write, removes every prior batch member and inserts the complete replacement list.

```javascript
repo.replaceBatch('batch-1',[replacementA,replacementB]);
assert.deepStrictEqual(repo.all().map(r=>r.id),['new-a','new-b']);
assert.strictEqual(storage.writeCount,2); // initial seed + one atomic replacement
```

- [ ] **Step 3: Run tests and confirm failure**

Run:

```powershell
node tests/ledger-sync.test.js
```

Expected: fail on missing properties and repository method.

- [ ] **Step 4: Extend normalizers and personal repository**

Add to both normalized shapes:

```javascript
storeName:String(source.storeName||'').trim(),
replacesRecordId:String(source.replacesRecordId||'').trim()
```

Add this repository method with a single final `write(next)`:

```javascript
function replaceBatch(batchId,replacements){
  var clean=String(batchId||'').trim();
  if(!clean)throw new Error('缺少批次 ID');
  var normalized=(replacements||[]).map(function(record){
    var item=normalizePersonalLedgerRecord(record,Date.parse(record.time),Math.random);
    validateLedgerRecord(item);return item;
  });
  if(!normalized.length)throw new Error('替換批次不可為空');
  var next=read().filter(function(record){return record.batchId!==clean;}).concat(normalized);
  write(next);return normalized;
}
```

- [ ] **Step 5: Run focused tests**

Run `node tests/ledger-sync.test.js`. Expected: exit 0.

- [ ] **Step 6: Commit**

```powershell
git add index.html tests/ledger-sync.test.js
git commit -m "feat: persist ledger store and replacement metadata"
```

---

### Task 3: Formal/TEST universe selectors and settlement

**Files:**
- Modify: `index.html:3076-3091`
- Modify: `index.html:3311-3372`
- Modify: `index.html:3815-3831`
- Modify: `index.html:4117-4134`
- Modify: `tests/ledger-dashboard.test.js`
- Modify: `tests/ledger-settlement.test.js`
- Modify: `tests/ledger-sync.test.js`

**Interfaces:**
- Produces: `ledgerUniverseMode() -> 'formal'|'test'`, `ledgerUniverseRecords(records, mode)`, and universe-aware `buildMemberBalances`.

- [ ] **Step 1: Add failing selector tests**

```javascript
const formal={id:'f',recordType:'expense',detail:'晚餐'};
const test={id:'t',recordType:'expense',detail:'[TEST] 晚餐'};
assert.deepStrictEqual(mod.ledgerUniverseRecords([formal,test],'formal').map(r=>r.id),['f']);
assert.deepStrictEqual(mod.ledgerUniverseRecords([formal,test],'test').map(r=>r.id),['t']);
```

Also cover queued records and a TEST target removed by a deletion tombstone before universe filtering.

- [ ] **Step 2: Add failing settlement tests**

Build one formal and one TEST expense with valid participants. Assert formal balances use only formal amounts and test balances use only TEST amounts:

```javascript
assert.strictEqual(mod.buildMemberBalances(records,members,null,'formal').members[0].paidJpy,100);
assert.strictEqual(mod.buildMemberBalances(records,members,null,'test').members[0].paidJpy,900);
```

- [ ] **Step 3: Run focused tests and confirm failure**

```powershell
node tests/ledger-sync.test.js
node tests/ledger-settlement.test.js
node tests/ledger-dashboard.test.js
```

- [ ] **Step 4: Add pure universe helpers**

```javascript
function ledgerUniverseMode(){return lsGet('trip_ledger_test_mode',false)?'test':'formal';}
function ledgerUniverseRecords(records,mode){
  mode=mode==='test'?'test':'formal';
  return effectiveLedgerRecords(records).filter(function(record){
    if(isIdentityRegistrationRecord(record))return false;
    return mode==='test'?isTestLedgerRecord(record):!isTestLedgerRecord(record);
  });
}
```

Apply the helper after merged effective-history/tombstone resolution and before dashboard, recent, history and detail selectors.

- [ ] **Step 5: Parameterize settlement**

Change `buildMemberBalances(records, memberOrder, warnFn, universe)` so it admits exactly the selected universe rather than hard-coding TEST exclusion. Keep all recordType, participant, safe-integer and currency checks unchanged.

- [ ] **Step 6: Update banner copy and settings help**

Use exactly:

```text
⚠ 目前顯示測試帳本
不影響正式分帳
```

Keep the settings shortcut and state that TEST applies only to shared ledger.

- [ ] **Step 7: Run focused tests**

Run the three tests from Step 3. Expected: exit 0.

- [ ] **Step 8: Commit**

```powershell
git add index.html tests/ledger-sync.test.js tests/ledger-settlement.test.js tests/ledger-dashboard.test.js
git commit -m "fix: isolate formal and test ledger universes"
```

---

### Task 4: Atomic queue-first shared saves

**Files:**
- Modify: `index.html:2967-3020`
- Modify: `index.html:3984-4006`
- Modify: `tests/ledger-sync.test.js`
- Modify: `tests/ledger-quick-entry.test.js`
- Modify: `adr/0006-ledger-sync-apps-script.md`

**Interfaces:**
- Produces: `ledgerRepository.enqueueBatch(records)` returning `{ok:true,queued:true,records,pending}` immediately after one queue write.
- Preserves: `add(record)` and `flushQueue()` delivery semantics.

- [ ] **Step 1: Write failing atomicity tests**

Use a post promise that never resolves. Assert the batch acknowledgment resolves, both records are queued in order, and post remains pending:

```javascript
const ack=repo.enqueueBatch([first,second]);
assert.strictEqual(ack.ok,true);
assert.strictEqual(ack.pending,2);
assert.deepStrictEqual(repo.queuedRecords().map(r=>r.id),['first','second']);
assert.strictEqual(storage.writeCount,1);
```

Add a validation-failure case where the second record lacks a member and assert the queue and write count remain unchanged.

- [ ] **Step 2: Write failing optimistic UI tests**

Assert `saveLedgerEntry(false)` closes the entry Sheet after `enqueueBatch` acknowledgment without awaiting `flushQueue`, and uses toast `已儲存，待同步`.

- [ ] **Step 3: Run focused tests and confirm failure**

```powershell
node tests/ledger-sync.test.js
node tests/ledger-quick-entry.test.js
```

- [ ] **Step 4: Implement `enqueueBatch`**

Normalize and validate every record into a temporary array, merge unseen IDs into a cloned queue, call `writeQueue(next)` once, then start background flush with a handled completion:

```javascript
function enqueueBatch(records){
  var testMode=typeof opts.isTestMode==='function'&&opts.isTestMode();
  var normalized=(records||[]).map(function(record){
    var item=normalizeLedgerRecord(record,now(),random,testMode);
    validateLedgerRecord(item);return item;
  });
  if(!normalized.length)throw new Error('記帳批次不可為空');
  var next=readQueue().slice(),seen={};
  next.forEach(function(item){seen[item.id]=true;});
  normalized.forEach(function(item){if(!seen[item.id]){seen[item.id]=true;next.push(item);}});
  writeQueue(next);
  Promise.resolve().then(flushQueue).then(function(){
    if(typeof opts.onBackgroundFlush==='function')opts.onBackgroundFlush();
  },function(error){AppLog.repo('背景同步失敗：'+(error.message||error));});
  return {ok:true,queued:true,records:normalized,pending:next.length};
}
```

Expose it on the returned repository object.

- [ ] **Step 5: Switch shared entry persistence**

Build and validate the complete record list first. Personal writes remain atomic local writes; shared writes call `enqueueBatch(records)`, immediately render/close/reset, and leave delivery to the pending badge and online/open flush hooks.

- [ ] **Step 6: Update ADR completion semantics**

Document `add()` as delivery-aware and `enqueueBatch()` as local durability acknowledgment; state that the UI must never bypass the repository or write Queue keys directly.

- [ ] **Step 7: Run focused tests**

Run both tests from Step 3. Expected: exit 0.

- [ ] **Step 8: Commit**

```powershell
git add index.html tests/ledger-sync.test.js tests/ledger-quick-entry.test.js adr/0006-ledger-sync-apps-script.md
git commit -m "feat: add atomic optimistic ledger saves"
```

---

### Task 5: Stable sheet state, compact amount, store and occurrence time

**Files:**
- Modify: `index.html` ledger sheet CSS and functions `openLedgerEntrySheet` through `renderLedgerEntrySheet`
- Modify: `tests/ledger-quick-entry.test.js`
- Modify: `tests/ledger-entry-settings.test.js`

**Interfaces:**
- Produces: `ledgerDateTimeLocalValue(date)`, `ledgerOccurrenceIso(value)`, `withLedgerSheetPosition(renderFn)`, draft fields `storeName` and `occurredAt`.

- [ ] **Step 1: Add failing date round-trip tests**

```javascript
const local=mod.ledgerDateTimeLocalValue(new Date(2026,9,18,12,34,0));
assert.strictEqual(local,'2026-10-18T12:34');
const iso=mod.ledgerOccurrenceIso(local);
assert.strictEqual(new Date(iso).getTime(),new Date(2026,9,18,12,34,0).getTime());
assert.throws(()=>mod.ledgerOccurrenceIso('not-a-date'),/日期時間/);
```

- [ ] **Step 2: Add failing draft/markup assertions**

Require draft defaults for `storeName:''`, an occurrence-time value, category `餐飲` when available, identity immediately below the heading, store/time fields, `金額 (¥)`/`金額 (NT$)`, and an input-wrapper `<output>`.

- [ ] **Step 3: Add failing scroll-state assertions**

Extract the sheet lifecycle and assert it captures background `scrollY`, initializes the sheet's scrollTop to zero, and restores background scroll in `requestAnimationFrame`. Add a pure helper test that a render callback receives and restores the prior sheet position.

- [ ] **Step 4: Run focused tests and confirm failure**

```powershell
node tests/ledger-quick-entry.test.js
node tests/ledger-entry-settings.test.js
```

- [ ] **Step 5: Extend the draft and record builder**

Use:

```javascript
storeName:'',
occurredAt:ledgerDateTimeLocalValue(timestampDate(Date.now()))
```

Set each built record to `time:ledgerOccurrenceIso(draft.occurredAt)` and `storeName:String(draft.storeName||'').trim()`.

- [ ] **Step 6: Reorder and compact the Sheet**

Move identity directly below the header. Implement an accessible amount wrapper with the input and right-aligned `<output aria-live="polite">`; keep input text at least 16px and touch targets at least 44px.

- [ ] **Step 7: Remove full rerenders from fixed-size choices**

For category, payment, currency, tax-rate and participant pills, update draft, `.on`, `aria-pressed`, dependent labels and preview locally. Wrap unavoidable structural rerenders with `withLedgerSheetPosition` to preserve scroll and focus.

- [ ] **Step 8: Preserve next-entry defaults**

After a successful save, retain currency, category, payment and shared participants. Initial category is `餐飲` if present, otherwise the first configured category.

- [ ] **Step 9: Run focused tests**

Run both tests from Step 4. Expected: exit 0.

- [ ] **Step 10: Commit**

```powershell
git add index.html tests/ledger-quick-entry.test.js tests/ledger-entry-settings.test.js
git commit -m "fix: stabilize and compact ledger entry sheet"
```

---

### Task 6: Tax pills, custom rates, discounts, and item exemptions

**Files:**
- Modify: `index.html:3248-3278`
- Modify: `index.html:3855-3970`
- Modify: `tests/ledger-multi-item.test.js`

**Interfaces:**
- Produces: integer `ledgerTaxRateBps`, `calculateLedgerTaxWeights`, item `taxExempt:boolean`.

- [ ] **Step 1: Add failing price-mode tests**

Cover these exact cases:

```javascript
assert.strictEqual(calc(single(1000,'included',10,false)).totalPrimary,1000);
assert.strictEqual(calc(single(1000,'excluded',10,false)).totalPrimary,1100);
assert.strictEqual(calc(single(1000,'excluded',8,false)).totalPrimary,1080);
assert.strictEqual(calc(single(1000,'excluded',7.5,false)).totalPrimary,1075);
assert.strictEqual(calc(single(1000,'excluded',10,true)).totalPrimary,1000);
```

Also assert a two-item 10% bill with one exempt item totals `1000 + 1100`, and discount is subtracted only after tax.

- [ ] **Step 2: Add failing safety and allocation tests**

Require rejection for custom rates `0`, `100.01`, and more than two decimals. Verify both currencies' allocated item sums equal the bill totals after mixed exemptions and discount.

- [ ] **Step 3: Run test and confirm failure**

```powershell
node tests/ledger-multi-item.test.js
```

- [ ] **Step 4: Replace tax mode with two dimensions**

Draft values are:

```javascript
priceMode:'included',
taxPreset:'10',
customTaxRate:'',
discount:''
```

`ledgerTaxRateBps` returns `0`, `800`, `1000`, or `Math.round(custom*100)` after validation.

- [ ] **Step 5: Calculate integer tax weights**

Use denominator 10,000:

```javascript
var base=amount*10000;
var weight=draft.priceMode==='excluded'&&!item.taxExempt
  ? amount*(10000+rateBps)
  : base;
```

Sum weights, `Math.round(totalWeight/10000)`, subtract discount, then use the existing largest-remainder allocator for both currencies.

- [ ] **Step 6: Render the approved pills**

Use exact labels:

```text
税込（含稅）  税抜（未稅）
無稅  8%  10%  自訂
```

Show the custom field only for `自訂`. Add per-item `免稅品` pills/toggles and a confirmation-backed `全部免稅品` action.

- [ ] **Step 7: Run focused tests**

Expected: `node tests/ledger-multi-item.test.js` exits 0.

- [ ] **Step 8: Commit**

```powershell
git add index.html tests/ledger-multi-item.test.js
git commit -m "feat: add explicit tax modes and item exemptions"
```

---

### Task 7: Proxy target store and settings management

**Files:**
- Modify: `index.html` local keys, proxy draft rendering and settings overlay
- Modify: `tests/ledger-proxy.test.js`
- Modify: `tests/settings-backup-ux.test.js`

**Interfaces:**
- Produces: `ledgerProxyTargetStore.all/add/remove/normalize`, local key `trip_ledger_proxy_targets`.

- [ ] **Step 1: Write failing store tests**

```javascript
store.add('  阿芬 ');store.add('阿芬');store.add('阿蓁');
assert.deepStrictEqual(store.all(),['阿芬','阿蓁']);
store.remove('阿芬');
assert.deepStrictEqual(store.all(),['阿蓁']);
assert.throws(()=>store.add(''),/代購對象/);
```

- [ ] **Step 2: Add failing UI/backup assertions**

Require `未指定`, saved target chips, `＋新增對象`, a settings management section, backup format version 3, `proxyTargets` in the JSON payload, and `trip_ledger_proxy_targets` in restore. Require version 2 imports to default the list to `[]`, and reject a non-array version 3 list:

```javascript
assert.strictEqual(payload.version,3);
assert.deepStrictEqual(payload.proxyTargets,['阿芬','阿蓁']);
assert.throws(function(){
  validatePersonalStatePayload(Object.assign({},payload,{proxyTargets:'阿芬'}));
},/代購對象/);
```

- [ ] **Step 3: Run focused tests and confirm failure**

```powershell
node tests/ledger-proxy.test.js
node tests/settings-backup-ux.test.js
```

- [ ] **Step 4: Implement the store**

Use localStorage JSON array, trim values, reject empty or over 12 characters, and preserve insertion order while de-duplicating by canonical name.

- [ ] **Step 5: Replace free-text target selection**

Render `未指定`, saved values and `＋新增對象` as pills. The add action prompts for one value, stores it, selects it and locally refreshes only the target-pill container. Apply the same control to per-item overrides.

- [ ] **Step 6: Add settings management**

Provide an add button and a delete action per saved target. Deleting a saved target does not alter existing ledger records.

- [ ] **Step 7: Upgrade backup and restore**

Set `personalStateJson()` to format version 3, include `proxyTargets`, add `trip_ledger_proxy_targets` to the restore whitelist, normalize imported targets through `ledgerProxyTargetStore.normalize`, and preserve version 2 compatibility by defaulting a missing list to `[]`.

- [ ] **Step 8: Run focused tests**

Run both tests from Step 3. Expected: exit 0.

- [ ] **Step 9: Commit**

```powershell
git add index.html tests/ledger-proxy.test.js tests/settings-backup-ux.test.js
git commit -m "feat: manage reusable proxy purchase targets"
```

---

### Task 8: Personal and append-only shared editing

**Files:**
- Modify: `index.html` record actions, entry draft loading and persistence orchestration
- Create: `tests/ledger-editing.test.js`
- Modify: `tests/ledger-tombstone-deletion.test.js`
- Modify: `adr/0006-ledger-sync-apps-script.md`

**Interfaces:**
- Produces: `ledgerEditSelection(records,id)`, `buildSharedLedgerEditBatch(originals,replacements,context)`, personal `replaceBatch` UI flow.

- [ ] **Step 1: Write failing single shared-edit test**

Assert the builder returns one deletion followed by one expense:

```javascript
assert.strictEqual(batch[0].recordType,'deletion');
assert.strictEqual(batch[0].targetRecordId,old.id);
assert.strictEqual(batch[0].deleteReason,'編輯修改');
assert.strictEqual(batch[1].recordType,'expense');
assert.strictEqual(batch[1].replacesRecordId,old.id);
assert.notStrictEqual(batch[1].id,old.id);
```

- [ ] **Step 2: Write failing batch and universe tests**

For a two-item old batch changed to three items, require two tombstones followed by three new expenses, one new batchId, and every new `replacesRecordId` equal to the canonical first old ID. Repeat with `[TEST]` originals and require every new detail to retain `[TEST]`.

- [ ] **Step 3: Write failing personal edit tests**

Require a personal single edit to preserve its ID and a personal batch edit to perform one localStorage write without producing deletion records.

- [ ] **Step 4: Run focused tests and confirm failure**

```powershell
node tests/ledger-editing.test.js
node tests/ledger-tombstone-deletion.test.js
```

- [ ] **Step 5: Add the `⋯` action menu and edit draft loader**

Only effective expense records receive `編輯／刪除`. Loading a batch must retrieve every visible record with the same non-empty batchId; loading a single retrieves only its ID. Populate store, occurrence time, payment, proxy/participants, item values and note.

- [ ] **Step 6: Implement personal editing**

Single edits replace the same ID. Batch edits rebuild the batch, preserve IDs by original sorted position where possible, generate IDs for extra items, remove surplus items, and call one `replaceBatch` write.

- [ ] **Step 7: Implement shared editing**

Build every tombstone and replacement before enqueueing. Use `ledgerRepository.enqueueBatch(completeBatch)` once. Determine TEST inheritance from the originals; reject mixed formal/TEST selections.

- [ ] **Step 8: Preserve delete behavior**

Personal delete keeps the existing irreversible confirmation. Shared delete keeps the required-reason dialog. System records, tombstones and deleted targets remain non-actionable.

- [ ] **Step 9: Update ADR and run tests**

Document the edit transaction and replacement-root rule, then run the two tests from Step 4. Expected: exit 0.

- [ ] **Step 10: Commit**

```powershell
git add index.html tests/ledger-editing.test.js tests/ledger-tombstone-deletion.test.js adr/0006-ledger-sync-apps-script.md
git commit -m "feat: add auditable ledger editing"
```

---

### Task 9: Search, filters, grouping, and async feedback

**Files:**
- Modify: `index.html` ledger UI state, full-history selectors/rendering and async buttons
- Create: `tests/ledger-history-search.test.js`
- Modify: `tests/ledger-entry-settings.test.js`

**Interfaces:**
- Produces: `filterLedgerHistory(records,query,filters)`, `groupLedgerHistory(records,mode)`, button busy helper.

- [ ] **Step 1: Write failing history selector tests**

Cover normalized case-insensitive matching across detail, store and note; category/payment/proxy filters; and grouping keys:

```javascript
assert.deepStrictEqual(filter(records,'松屋',{}).map(r=>r.id),['store-hit']);
assert.deepStrictEqual(filter(records,'伴手禮',{}).map(r=>r.id),['note-hit']);
assert.deepStrictEqual(filter(records,'',{category:'餐飲',payMethod:'現金'}).map(r=>r.id),['meal-cash']);
assert.deepStrictEqual(Object.keys(group(records,'category')),['交通','餐飲']);
```

- [ ] **Step 2: Add failing markup and spinner assertions**

Require a search input, category/payment/proxy pills, date/category grouping pills, and exact spinner/disabled behavior for settings save and manual sync. Assert the optimistic save path does not wait on a spinner.

- [ ] **Step 3: Run tests and confirm failure**

```powershell
node tests/ledger-history-search.test.js
node tests/ledger-entry-settings.test.js
```

- [ ] **Step 4: Add presentation state and pure selectors**

Extend `ledgerUiState` with:

```javascript
historyQuery:'',
historyCategory:'all',
historyPayMethod:'all',
historyProxy:'all',
historyGrouping:'date'
```

Filter only the already-selected personal/shared universe records. Never add a TEST filter.

- [ ] **Step 5: Render controls and result groups**

Use pills for filters and grouping. Update only the result list when search/filter state changes. Search detail, `storeName`, and note after trim/lowercase normalization.

- [ ] **Step 6: Add scoped busy state**

Create `setButtonBusy(button,busy,label)` that saves/restores button text, adds/removes a small spinner, sets disabled and `aria-busy`. Apply it to settings save and manual sync only; optimistic entry buttons are disabled only during local validation/enqueue.

- [ ] **Step 7: Run focused tests**

Run both tests from Step 3. Expected: exit 0.

- [ ] **Step 8: Commit**

```powershell
git add index.html tests/ledger-history-search.test.js tests/ledger-entry-settings.test.js
git commit -m "feat: add searchable ledger history and async feedback"
```

---

### Task 10: Documentation, SW v21, full regression, and mobile QA

**Files:**
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md`
- Modify: `sw.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: completed Tasks 1-9.
- Produces: deployable dev candidate and Development Summary evidence.

- [ ] **Step 1: Update governance and status documents**

Record:

- Schema 2.7 and 16-column Ledger;
- `time` as expense occurrence time;
- local-only personal store/proxy-target data;
- TEST parallel universe;
- `enqueueBatch` optimistic durability semantics;
- shared edit as tombstones plus replacement records;
- CSV cross-device delay remains 1–5 minutes.

Mark this as a ⭐ architecture change in `07_CHANGELOG.md` because it changes Schema and repository/data-flow semantics.

- [ ] **Step 2: Bump only the Service Worker cache name**

Change:

```javascript
var CACHE_NAME = 'okayama-trip-v21';
```

Do not change any other `sw.js` line.

- [ ] **Step 3: Run every test separately**

```powershell
$failed=@()
Get-ChildItem -LiteralPath tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  node $_.FullName
  if($LASTEXITCODE -ne 0){$failed += $_.Name}
}
if($failed.Count){throw "Failed tests: $($failed -join ', ')"}
node tools/check-doc-titles.js
if($LASTEXITCODE -ne 0){throw 'Document title check failed'}
```

Expected: every test and doc-title check exits 0.

- [ ] **Step 4: Run healthCheck**

Load the app with the current data snapshot and capture `healthCheck()` output. Expected: no new ledger/schema/repository findings; any pre-existing unrelated warning must be listed rather than hidden.

- [ ] **Step 5: Run 390px browser QA**

Verify all four tabs and these ledger cases with `pageerror=0`:

1. open Sheet at top, scroll to middle, choose every pill type without jumping;
2. close Sheet and confirm background scroll restoration;
3. single and multi entry, store, occurrence time, tax/custom rate, discount and exemptions;
4. personal and shared edits, including batch replacement;
5. formal/TEST dashboard, history and settlement isolation;
6. history search/filter/group controls;
7. offline enqueue, close immediately, pending badge, then online flush;
8. settings save/manual sync spinner and disabled states.

- [ ] **Step 6: Verify the deployed Apps Script endpoint**

In TEST mode, send one 16-field record containing `storeName` and `replacesRecordId`, confirm `{ok:true}`, resend the same ID and confirm `{ok:true,dup:true}`. Record the ID in the Development Summary and leave it for Bar's Sheet inspection.

- [ ] **Step 7: Review the final diff scope**

```powershell
git status --short
git diff --check
git diff --stat origin/dev...HEAD
```

Confirm there are no changes to validator mechanisms, BUILTIN, icons, manifest, Netlify, tools, Scroll-only, viewport recovery or unrelated content.

- [ ] **Step 8: Commit final docs and publication version**

```powershell
git add 08_AI_HANDOVER.md .ai-manifest.json 07_CHANGELOG.md tasks/current.md tasks/backlog.md sw.js tests
git commit -m "fix: deliver ledger 2.1 ux editing and test universe"
```

- [ ] **Step 9: Present Development Summary before push**

Report two columns:

- 已驗證：tests, doc titles, healthCheck, 390px QA, offline/online queue, endpoint ok/dup.
- 未驗證假設：real-device iOS keyboard/scroll behavior and 1–5 minute cross-device CSV publication timing until Bar completes phone QA.

Include rollback instructions: Netlify rollback to the prior dev deploy plus a new SW cache bump; Sheet columns 15-16 and append-only rows may remain because the prior parser ignores unknown suffix columns.

- [ ] **Step 10: Push only after Bar approval**

```powershell
git push origin dev
```

Expected: remote `dev` advances; `main` is unchanged.
