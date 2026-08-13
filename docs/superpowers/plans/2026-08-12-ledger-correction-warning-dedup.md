# Ledger Correction Warning Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every distinct Ledger correction diagnostic while preventing repeated projections from filling the 100-entry AppLog buffer with identical messages.

**Architecture:** Keep correction validation and fail-closed projection unchanged. Add an in-memory exact-message warn-once guard only at `ledgerCorrectionDataWarning()`, the implicit AppLog boundary; explicit `warnFn` callbacks continue receiving every projection warning.

**Tech Stack:** Vanilla JavaScript in `index.html`, Node.js built-in `assert`/`vm` tests, Playwright browser QA, existing repository validation scripts.

## Global Constraints

- No Google Sheet Schema, Apps Script, Ledger record, queue, bridge, settlement, or correction projection semantic changes.
- Do not change the global AppLog contract; deduplication is Ledger-correction-specific.
- AppLog clear does not reset the warn-once set; a full page reload creates a new set.
- Keep the current `v103` App/SW version because this is an unshipped dev-candidate diagnostic delta; do not modify `app-version.js`, `sw.js`, or `netlify.toml`.
- Do not merge `main`, deploy production, create a production tag, or push without a separate Bar instruction.

## File Map

- `tests/ledger-settlement-correction.test.js`: regression for the four warning shapes from the 2026-08-11 report and explicit callback behavior.
- `index.html`: Ledger correction diagnostic warn-once state and output boundary.
- `tests/README.md`: test contract inventory.
- `07_CHANGELOG.md`, `.ai-manifest.json`, `tasks/current.md`: delivery scope and fresh verification evidence.

---

### Task 1: Ledger correction warning deduplication

**Files:**
- Modify: `tests/ledger-settlement-correction.test.js` near the malformed correction diagnostics assertions
- Modify: `index.html:6293-6296`

**Interfaces:**
- Consumes: `deriveLedgerCorrectionProjection(records, warnFn?)` and `AppLog.data(message)`.
- Produces: implicit exact-message warn-once behavior for `ledgerCorrectionDataWarning(message)`; no new public API.

- [ ] **Step 1: Add the failing production-behavior regression**

Add this after the existing malformed projection logger assertion. It catches removal or bypass of the session guard.

```js
const reportedInvalidCorrections=[
  correctionCommit('1785378016083-pklg','1785376977160-cmlj','1785376977160-cmlj',['missing-item-a']),
  correctionCommit('1785373447574-lxr9','1785246915539-nu0d','1785246915539-nu0d',['missing-item-b']),
  correctionItem('1785373399333-asor','1785373399334-l3ac','1785251556577-ha18','缺少完整 commit'),
  correctionCommit('1785373399334-l3ac','1785251556577-ha18','1785251556577-ha18',['1785373399333-asor'])
];
const expectedReportedWarnings=[
  '忽略更正版本 1785378016083-pklg:找不到 root 收據 1785376977160-cmlj',
  '忽略更正版本 1785373447574-lxr9:找不到 root 收據 1785246915539-nu0d',
  '忽略更正版本 1785373399334-l3ac:找不到 root 收據 1785251556577-ha18',
  '忽略更正品項 1785373399333-asor:找不到完整 commit'
];
const warningStart=mod.__dataWarnings.length;
mod.deriveLedgerCorrectionProjection(reportedInvalidCorrections);
mod.deriveLedgerCorrectionProjection(reportedInvalidCorrections);
assert.deepStrictEqual(
  plain(mod.__dataWarnings.slice(warningStart)),
  expectedReportedWarnings,
  'repeated default projections record each distinct correction warning only once per page session'
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/ledger-settlement-correction.test.js`

Expected: FAIL at the new assertion because the actual output contains the same four messages twice.

- [ ] **Step 3: Add the explicit callback preservation assertion**

```js
const explicitWarnings=[];
mod.deriveLedgerCorrectionProjection(reportedInvalidCorrections,message=>explicitWarnings.push(String(message)));
mod.deriveLedgerCorrectionProjection(reportedInvalidCorrections,message=>explicitWarnings.push(String(message)));
assert.deepStrictEqual(
  explicitWarnings,
  expectedReportedWarnings.concat(expectedReportedWarnings),
  'an explicit projection warning sink receives complete diagnostics on every invocation'
);
```

- [ ] **Step 4: Implement the minimal warn-once boundary**

Replace the current helper with:

```js
var _ledgerCorrectionDataWarned=Object.create(null);
function ledgerCorrectionDataWarning(message){
  message=String(message||'');
  if(_ledgerCorrectionDataWarned[message])return;
  _ledgerCorrectionDataWarned[message]=true;
  if(typeof AppLog!=='undefined'&&AppLog&&typeof AppLog.data==='function')AppLog.data(message);
  else if(typeof console!=='undefined'&&console.warn)console.warn(message);
}
```

Do not change `deriveLedgerCorrectionProjection()`; its `externalWarn` branch already bypasses the implicit helper.

- [ ] **Step 5: Run focused tests and verify GREEN**

```powershell
node tests/ledger-settlement-correction.test.js
node tests/app-log-buffer.test.js
node tests/diagnostics-app-log.test.js
```

Expected: all commands exit 0 with normal PASS output and no unexpected warnings.

- [ ] **Step 6: Review and commit the tested behavior**

Run `git diff --check` and `git diff -- index.html tests/ledger-settlement-correction.test.js`. Confirm the only production change is the Ledger-specific exact-message guard, then commit:

```powershell
git add -- index.html tests/ledger-settlement-correction.test.js
git commit -m "fix(ledger): deduplicate correction diagnostics"
```

### Task 2: Delivery records and full verification

**Files:**
- Modify: `tests/README.md`
- Modify: `07_CHANGELOG.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: Task 1's focused green tests and unchanged `v103` runtime version.
- Produces: accurate project status plus fresh Node, browser, consistency, and no-drift evidence.

- [ ] **Step 1: Update the test inventory**

Extend the `ledger-settlement-correction.test.js` entry in `tests/README.md` with:

```markdown
；v103 後續另鎖定相同無效更正事件在重複投影時只寫入一次 session AppLog，而顯式 warning sink 仍逐次收到完整診斷。
```

- [ ] **Step 2: Update delivery status documents without changing runtime version**

Add a 2026-08-12 changelog entry recording:

- Four unique invalid correction warnings were each emitted 25 times by repeated projections.
- Exact-message warn-once applies only at the implicit Ledger correction AppLog boundary.
- Invalid corrections remain fail-closed; explicit warning callbacks remain complete.
- Current published CSV and Apps Script GET each returned 17 rows and none of the seven reported IDs; no live Sheet mutation was made.
- v103 remains unchanged; no App/SW version, Netlify, schema, Apps Script, or Ledger data change.

Update `.ai-manifest.json` and `tasks/current.md` so v103 remains the dev candidate, this diagnostic delta is included, and stale validation counts are replaced by the final results.

- [ ] **Step 3: Run the complete Node and consistency gate**

```powershell
$failed=@(); Get-ChildItem -LiteralPath 'tests' -Filter '*.test.js' | Sort-Object Name | ForEach-Object { & node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; if($failed.Count){throw "Node failures: $($failed -join ', ')"}
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
Get-Content -Raw -Encoding utf8 -LiteralPath '.ai-manifest.json' | ConvertFrom-Json | Out-Null
git diff --check
```

Expected: all 83 Node test files pass; title, v103 App/SW consistency, runtime assets, BUILTIN no-drift, manifest JSON, and whitespace checks pass. Do not use `--write` with the snapshot tool.

- [ ] **Step 4: Run complete browser QA**

Run: `npm run test:browser`

Expected: all Playwright cases pass with zero failures, including offline builtin, online sync, travel-date mock, Service Worker update, and zero-pageerror coverage. Record the actual count in all three status documents.

- [ ] **Step 5: Verify forbidden scope is untouched**

Run `git diff -- app-version.js sw.js netlify.toml schema.js apps-script/ledger-sync.gs` and confirm it is empty. Run `git status --short`; only the four delivery documents should remain uncommitted.

- [ ] **Step 6: Commit delivery records**

```powershell
git add -- tests/README.md 07_CHANGELOG.md .ai-manifest.json tasks/current.md
git commit -m "docs: record ledger diagnostic deduplication"
```

- [ ] **Step 7: Final verification from committed HEAD**

```powershell
git status --short
git log -3 --oneline --decorate
node tests/ledger-settlement-correction.test.js
node tools/check-app-version.js
git diff --check HEAD~2..HEAD
```

Expected: clean tree; design, implementation, and delivery commits are visible; focused regression and version checks pass; committed diff has no whitespace errors.
