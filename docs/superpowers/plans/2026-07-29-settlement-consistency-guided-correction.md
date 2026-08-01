# Settlement Consistency Guided Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect group receipts after a repayment confirmation and let the original payer append complete, auditable correction or void versions without rewriting confirmed repayment history.

**Architecture:** Keep the existing single-file ES5 application and 21-column Ledger contract. Add a pure correction projection between tombstone filtering and every expense consumer; explicit item/commit events remain in the raw event stream, while the projection exposes only the latest canonical expense-like receipt snapshot plus receipt metadata for guards and UI. Use the existing durable queue for commit-last persistence and the existing settlement derivation for protection cutoffs.

**Tech Stack:** Static `index.html` ES5 JavaScript/CSS, Node.js built-in `assert`/`vm` tests, existing Google Sheet 21-column schema, Service Worker.

## Global Constraints

- Work on `dev`; do not merge `main`, push, or deploy.
- Tier 2 approval covers `index.html` and `sw.js`; the schema approval covers only adding three `recordType` values, not adding fields.
- Do not add dependencies, Google Sheet columns, Apps Script APIs, settings keys, or server authorization.
- Preserve personal-ledger editing and deletion behavior.
- Historical canonical repayment confirmations are immutable; corrections create new balances.
- Formal and TEST universes never affect each other.
- Correction events are group-only, append-only, commit-last, owner-only, payer-immutable, and fail-closed when malformed.
- Use `record.id` client-created timestamps for protection cutoffs; expense `record.time` remains occurrence time.
- Use stable `record.time ASC → record.id ASC` only for competing correction commits.
- Run every new behavior through RED → GREEN before moving to the next task.

---

### Task 1: Pure correction event contract and receipt projection

**Files:**
- Create: `tests/ledger-settlement-correction.test.js`
- Modify: `index.html` near `normalizeLedgerRecord()`, record-type predicates, `effectiveLedgerRecords()`, and `ledgerClientCreatedAt()`

**Interfaces:**
- Produces: `isLedgerCorrectionItemRecord(record)`, `isLedgerCorrectionCommitRecord(record)`, `isLedgerVoidCommitRecord(record)`, `isLedgerCorrectionRecord(record)`.
- Produces: `ledgerCreationPosition(record)` returning `{createdAt:Number,id:String}` or `null`.
- Produces: `deriveLedgerCorrectionProjection(records,warnFn)` returning `{records,receipts,receiptByRecordId,receiptByAnchorId,conflicts}`.
- Produces: receipt objects shaped as `{rootId,anchorId,records,owner,universe,protected,voided,versionCount,history,conflicts}`.
- Changes: `effectiveLedgerRecords(records,warnFn)` returns tombstone-filtered non-correction events plus only the latest canonical expense-like receipt snapshots.

- [ ] **Step 1: Add RED tests for event predicates and client-created positions**

Create a VM harness matching `ledger-editing.test.js`, then assert:

```js
assert.strictEqual(mod.isLedgerCorrectionItemRecord({recordType:'expense_correction_item'}),true);
assert.strictEqual(mod.isLedgerCorrectionCommitRecord({recordType:'expense_correction_commit'}),true);
assert.strictEqual(mod.isLedgerVoidCommitRecord({recordType:'expense_void_commit'}),true);
assert.deepStrictEqual(plain(mod.ledgerCreationPosition({id:'1784428800000-0001'})),{
  createdAt:1784428800000,id:'1784428800000-0001'
});
assert.strictEqual(mod.ledgerCreationPosition({id:'legacy-id'}),null);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/ledger-settlement-correction.test.js`

Expected: FAIL because the correction predicates and `ledgerCreationPosition()` do not exist.

- [ ] **Step 3: Implement predicates and position parsing**

Add explicit record-type predicates and make `ledgerClientCreatedAt()` delegate to `ledgerCreationPosition()` so duplicate detection and correction protection share one parser:

```js
function ledgerCreationPosition(record){
  var id=String(record&&record.id||''),match=id.match(/^(\d{10,})-[0-9a-z]{4}$/i);
  var createdAt=match?Number(match[1]):NaN;
  return isFinite(createdAt)&&createdAt>0?{createdAt:createdAt,id:id}:null;
}
function ledgerClientCreatedAt(record){
  var position=ledgerCreationPosition(record);
  return position?position.createdAt:null;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node tests/ledger-settlement-correction.test.js`

Expected: PASS for predicate and position assertions.

- [ ] **Step 5: Add RED tests for complete, void, conflicting, malformed, and repeated versions**

Use literal raw Ledger fixtures with parseable IDs. Assert:

```js
var projection=mod.deriveLedgerCorrectionProjection(rawRecords,warnings.push.bind(warnings));
assert.deepStrictEqual(projection.records.filter(r=>r.recordType==='expense').map(r=>r.detail),['晚餐（更正二）']);
assert.strictEqual(projection.receipts[0].versionCount,2);
assert.strictEqual(projection.receipts[0].protected,true);
assert.strictEqual(projection.receipts[0].voided,false);
assert.strictEqual(projection.conflicts.length,1);
```

Add independent cases proving:

- item without commit is inert;
- commit with a missing, duplicate, or unlisted item is inert;
- void produces no current expense but leaves receipt history;
- two children of one previous anchor choose the earliest commit by `time,id`;
- a losing child and descendants never promote;
- input permutation yields identical current IDs and balances;
- formal and TEST roots never cross-link;
- correction item `time` remains the corrected occurrence time.

- [ ] **Step 6: Run the focused test and verify RED**

Run: `node tests/ledger-settlement-correction.test.js`

Expected: FAIL because `deriveLedgerCorrectionProjection()` does not exist.

- [ ] **Step 7: Implement tombstone filtering and canonical correction projection**

Extract the current body of `effectiveLedgerRecords()` to `tombstoneEffectiveLedgerRecords()`. In the correction projection:

1. Index raw records by ID.
2. Keep tombstone-valid current base expenses and group them into receipts by non-empty `batchId`, otherwise by record ID.
3. Pick a receipt root anchor by client-created timestamp then ID.
4. Parse a normal commit manifest from its `participants` JSON without member canonicalization.
5. Require every listed item to exist exactly once and reject any extra item targeting the commit.
6. Require commit/items/root/previous anchor/owner/universe/version ID to agree.
7. Build child lists by `targetRecordId`; choose canonical child with `compareSettlementEvents(commit.time,commit.id,...)`.
8. Walk only from each current root; mark sibling and unreachable descendants as conflicts.
9. Clone canonical correction items as transient `recordType:'expense'` snapshots while retaining `_correctionRootId`, `_correctionAnchorId`, `_correctionVersionCount`, and `_correctionProtected`.
10. Exclude raw correction events from `records`.

- [ ] **Step 8: Run correction, editing, tombstone, and settlement tests**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-editing.test.js
node tests/ledger-tombstone-deletion.test.js
node tests/ledger-settlement.test.js
node tests/ledger-settlement-handshake.test.js
```

Expected: all pass.

- [ ] **Step 9: Commit the pure projection**

```powershell
git add index.html tests/ledger-settlement-correction.test.js
git commit -m "feat: derive canonical ledger correction versions"
```

---

### Task 2: Protection cutoff, guards, validation, and commit-last builders

**Files:**
- Modify: `tests/ledger-settlement-correction.test.js`
- Modify: `tests/ledger-editing.test.js`
- Modify: `tests/ledger-tombstone-deletion.test.js`
- Modify: `index.html` near ownership guards, correction projection, builders, and repository queue

**Interfaces:**
- Produces: `ledgerReceiptForRecord(records,recordId,warnFn)`.
- Produces: `ledgerReceiptIsProtected(receipt,records,warnFn)`.
- Produces: `buildLedgerCorrectionBatch(receipt,replacements,context)`.
- Produces: `buildLedgerVoidCorrection(receipt,context)`.
- Produces: `ledgerCorrectionRecordIssue(record,records)`.
- Changes: shared edit/delete assertions accept the full merged event stream and reject protected receipts.

- [ ] **Step 1: Add RED protection tests**

Add literal claim/confirm fixtures and assert:

```js
assert.strictEqual(mod.ledgerReceiptForRecord(records,'expense-before').protected,true);
assert.strictEqual(mod.ledgerReceiptForRecord(records,'expense-after').protected,false);
assert.strictEqual(mod.ledgerReceiptForRecord(testRecords,'test-expense').protected,true);
assert.strictEqual(mod.ledgerReceiptForRecord(formalRecords,'formal-expense').protected,false);
```

Cover:

- backdated expense created after claim remains directly editable;
- future-dated expense created before claim becomes protected;
- one protected item protects its entire batch;
- revoked confirm removes cutoff protection unless a correction chain already exists;
- malformed claim or expense creation ID fail-closes in a universe with a confirmed repayment;
- group zero never unlocks an old receipt.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node tests/ledger-settlement-correction.test.js`

Expected: FAIL on missing protection metadata/lookup.

- [ ] **Step 3: Implement protection derivation**

For each universe, call `deriveSettlements(rawRecords,warnFn,universe).confirmed`. Compare every base receipt item creation position with each confirmed entry’s `claim` creation position. If a relevant position is invalid, protect conservatively. Set `protected:true` permanently when the canonical version chain is non-empty.

- [ ] **Step 4: Add RED guard and builder tests**

Assert:

```js
assert.throws(
  ()=>mod.buildSharedLedgerEditBatch([protectedExpense],[replacement],contextWithRecords),
  /已還款確認.*更正收據/
);
assert.throws(
  ()=>mod.createLedgerDeletion(protectedExpense,'Bar','刪除',now,random,allRecords),
  /已還款確認.*更正收據/
);
var batch=plain(mod.buildLedgerCorrectionBatch(receipt,replacements,{
  member:'Bar',reason:'金額輸入錯誤',now:1784428805000,random:fixedRandom
}));
assert.deepStrictEqual(batch.map(r=>r.recordType),[
  'expense_correction_item','expense_correction_item','expense_correction_commit'
]);
assert.deepStrictEqual(JSON.parse(batch[2].participants),batch.slice(0,2).map(r=>r.id));
assert.strictEqual(batch[2].targetRecordId,receipt.anchorId);
assert.strictEqual(batch[2].replacesRecordId,receipt.rootId);
```

Also assert owner mismatch, payer mutation, empty/long reason, empty replacement, item/commit order, void `participants:'[]'`, TEST prefix preservation, and correction-of-latest-only stale rejection.

- [ ] **Step 5: Run focused tests and verify RED**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-editing.test.js
node tests/ledger-tombstone-deletion.test.js
```

Expected: FAIL because protected guards and correction builders do not exist.

- [ ] **Step 6: Implement validation, builders, and hard guards**

Use the existing 21 fields only. Normal commits store the ordered item-ID manifest in `participants`; void commits store `[]`. Use commit `note` for the trimmed 1–50 character reason. Force the original payer string into every event. Generate all item IDs first and the commit ID last, pass the resulting ordered array to the existing atomic `enqueueBatch()`, and reject direct edit/delete at both UI predicate and assertion layers.

- [ ] **Step 7: Run focused repository and guard tests**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-editing.test.js
node tests/ledger-tombstone-deletion.test.js
node tests/ledger-sync.test.js
node tests/ledger-settlement-reliability.test.js
```

Expected: all pass, including 123 reliability checks.

- [ ] **Step 8: Commit protection and builders**

```powershell
git add index.html tests/ledger-settlement-correction.test.js tests/ledger-editing.test.js tests/ledger-tombstone-deletion.test.js
git commit -m "feat: protect settled receipts and append corrections"
```

---

### Task 3: Guided correction UI, preview, history, and conflict diagnostics

**Files:**
- Modify: `tests/ledger-settlement-correction.test.js`
- Modify: `tests/ledger-list-actions.test.js`
- Modify: `tests/ledger-multi-layout.test.js`
- Modify: `index.html` CSS and Ledger action/detail/form handlers

**Interfaces:**
- Produces: `openLedgerCorrectionSheet(recordId)`, `renderLedgerCorrectionSheet()`, `saveLedgerCorrection(voidReceipt)`, and `closeLedgerCorrectionSheet()`.
- Produces: `ledgerCorrectionPreview(receipt,replacements,currency,rate)` returning old/new totals, changed-item labels, affected members, and balance deltas.
- Produces: `renderLedgerCorrectionHistory(receipt)`.
- Changes: protected receipt menus show `更正收據`; unprotected menus retain `編輯` and `刪除`.

- [ ] **Step 1: Add RED action-menu and handler tests**

Exercise real action rendering and assert:

```js
assert.match(protectedMenu,/更正收據/);
assert.doesNotMatch(protectedMenu,/>編輯 /);
assert.doesNotMatch(protectedMenu,/>刪除 /);
assert.match(unprotectedMenu,/>編輯 /);
assert.match(unprotectedMenu,/>刪除 /);
```

Assert a stale record ID or non-owner cannot open/save a correction and a stale draft is rejected after another canonical child appears.

- [ ] **Step 2: Run UI-focused tests and verify RED**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-list-actions.test.js
```

Expected: FAIL because protected menus still expose edit/delete.

- [ ] **Step 3: Implement protected menu routing and correction session**

Reuse `ledgerDraftFromRecords()` and the current single/multi item editors. Add correction session fields to `ledgerUiState`:

```js
correction:null,
// {rootId,anchorId,reason,voidReceipt,originalRecords}
```

Keep track fixed to shared, payer read-only, and load only the latest canonical snapshot.

- [ ] **Step 4: Add RED preview and submit tests**

Use the ¥900 → ¥600 three-person example with two confirmed ¥300 repayments. Hand-check and assert the preview shows old/new totals and a new reverse balance of ¥100 from the original payer to each other member. Assert zero-money metadata corrections remain allowed. Assert queue failure leaves the sheet open and queue success closes it with `等待同步`.

- [ ] **Step 5: Run focused tests and verify RED**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-settlement.test.js
```

Expected: FAIL on missing preview and save handlers.

- [ ] **Step 6: Implement preview, normal save, and void save**

Before save:

1. Re-read merged events and latest receipt.
2. Reject if owner/root/anchor changed.
3. Validate the normal entry draft.
4. Build corrected expense snapshots without changing payer.
5. Derive balances from a synthetic complete correction batch to produce literal member deltas.
6. Require a reason and explicit final confirmation.
7. Call `ledgerRepository.enqueueBatch(batch)` once.

The void action opens a dedicated confirmation with a required reason and calls `buildLedgerVoidCorrection()`.

- [ ] **Step 7: Implement version history and conflict display**

In receipt detail, render:

- `已更正 N 次` for canonical versions;
- original and canonical versions with timestamp, actor, reason, and item differences;
- `已作廢` for the latest void version;
- `更正衝突・未套用` for losing/stale versions;
- `更正已產生新的待結算餘額` when correction changes a previously zero group.

- [ ] **Step 8: Add responsive CSS and run focused UI tests**

Run:

```powershell
node tests/ledger-settlement-correction.test.js
node tests/ledger-list-actions.test.js
node tests/ledger-multi-layout.test.js
node tests/ledger-221-ui.test.js
node tests/ledger-225.test.js
```

Expected: all pass.

- [ ] **Step 9: Commit guided UI**

```powershell
git add index.html tests/ledger-settlement-correction.test.js tests/ledger-list-actions.test.js tests/ledger-multi-layout.test.js
git commit -m "feat: add guided receipt correction workflow"
```

---

### Task 4: Schema, cache, documentation, and complete verification

**Files:**
- Modify: `schema.js`
- Modify: embedded schema in `index.html`
- Regenerate: `09_SCHEMA_MAPPING.md`
- Modify: `03_DATABASE.md`
- Modify: `tests/README.md`
- Modify: `tests/schema-types.test.js`
- Modify: `tests/ledger-schema-contract.test.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `sw.js`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`

**Interfaces:**
- Schema version becomes `2.9 (2026-07-29)`.
- Allowed `recordType` values add `expense_correction_item`, `expense_correction_commit`, and `expense_void_commit`.
- Service Worker cache becomes `okayama-trip-v69`.

- [ ] **Step 1: Add RED schema and cache assertions**

Assert external and embedded schemas expose the same three values, remain exactly 21 fields, and the Service Worker cache is exactly v69.

- [ ] **Step 2: Run schema/PWA tests and verify RED**

Run:

```powershell
node tests/schema-types.test.js
node tests/ledger-schema-contract.test.js
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
```

Expected: FAIL on schema 2.8, missing record types, and cache v68.

- [ ] **Step 3: Update schema source, embedded copy, and cache**

Change only the allowed values and version string; keep the same 21 fields. Bump `sw.js` to v69 and update the exact cache tests.

- [ ] **Step 4: Regenerate the schema mapping**

Run the repository’s `schemaDoc()` from `schema.js` in a Node VM and replace the generated body in `09_SCHEMA_MAPPING.md`; do not hand-edit the generated table.

- [ ] **Step 5: Update operating documents**

Document the three event types, commit manifest, protection cutoff, group-only rule, and fail-closed behavior in `03_DATABASE.md` and `tests/README.md`. Add a dated changelog entry. Move backlog #13 to done only after all automated and browser verification passes; current must state the exact runtime commit/cache and any remaining true-device acceptance.

- [ ] **Step 6: Run the complete automated suite**

Run all `tests/*.test.js`, then:

```powershell
node tools/check-doc-titles.js
git diff --check
```

Expected: 49 test files, zero failures; document check passes; diff check emits no errors.

- [ ] **Step 7: Run Browser QA**

At 320×700, 375×812, and 390×844 verify:

- protected/unprotected action menus;
- single and multi-item correction;
- payer read-only, reason validation, preview, normal save, and whole-receipt void;
- canonical history and losing conflict;
- offline durable queue, reload, and later synchronization;
- stale DOM handlers cannot bypass protection;
- horizontal overflow 0, `pageerror` 0, console error 0.

- [ ] **Step 8: Review the final diff and commit delivery**

```powershell
git add index.html schema.js sw.js 03_DATABASE.md 09_SCHEMA_MAPPING.md 07_CHANGELOG.md CONTEXT.md adr tasks tests docs/superpowers
git diff --cached --check
git commit -m "feat: complete settlement consistency corrections"
```

- [ ] **Step 9: Run post-commit verification**

Re-run all 49 test files and `node tools/check-doc-titles.js`, then verify `git status --short --branch` is clean and `dev` is only ahead of `origin/dev`; do not push.

