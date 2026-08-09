# BUILTIN Snapshot Refresh and SOP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale Tokyo BUILTIN seed with the current approved Okayama Sheet snapshot and make future refreshes repeatable, validated, ledger-safe, and documented.

**Architecture:** A build-time Node CLI reads the existing `schema.js` authority, fetches only the seven non-Ledger public CSV sheets, validates the complete candidate in memory, and then previews or atomically writes the two existing BUILTIN declarations in `index.html`. The runtime parser, online snapshot coordinator, Sheet schema, storage, and Service Worker remain unchanged.

**Tech Stack:** Node.js CommonJS, built-in `fs`/`path`/`vm`/`fetch`, existing plain-Node assertion tests, Playwright offline characterization, Markdown governance documents.

## Global Constraints

- Runtime version remains exactly `v98`; the refreshed seed ships with the later approved v99 release.
- Google Sheet and `schema.js` remain authoritative and must not be modified.
- Live Ledger CSV must never be requested or embedded; BUILTIN Ledger contains only Schema-derived headers plus one trailing newline.
- CLI without `--write` is read-only; candidate drift returns exit 2, source or validation failure returns exit 1, and no drift returns exit 0.
- Any failed fetch, validation, serialization, or replacement leaves `index.html` byte-for-byte unchanged.
- Do not change runtime synchronization, localStorage, IndexedDB, data formats, SW lifecycle, cache strategy, `main`, deployment, or production tags.
- Execute inline in the existing clean `dev` checkout; do not create a parallel subagent or worktree.

---

### Task 1: Build the validated preview/write CLI

**Files:**
- Create: `tools/refresh-builtin-snapshot.js`
- Create: `tests/builtin-snapshot-refresh.test.js`

**Interfaces:**
- Consumes: `schema.js` text and an injected `fetchCsv(key, url)` async function.
- Produces: `loadSchema(schemaPath)`, `parseCsv(text)`, `buildLedgerHeader(schema)`, `buildBuiltinCandidate({schema, fetchCsv})`, `validateBuiltinCandidate({schema, candidate})`, `readEmbeddedBuiltin(indexSource)`, `replaceEmbeddedBuiltin(indexSource, timestamp, candidate)`, and `runRefresh({rootDir, write, fetchCsv, now, stdout, stderr})`.
- CLI contract: `node tools/refresh-builtin-snapshot.js [--write]`; `runRefresh()` returns `{exitCode, changedKeys, candidate}` and the main block assigns `process.exitCode`.

- [ ] **Step 1: Write the failing tool contract test**

Create a controlled Schema fixture with all eight current keys and literal CSV fixtures. The fetch double must throw if called with `ledger`, so the test catches accidental live-account ingestion rather than asserting on the double itself.

```js
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const tool=require('../tools/refresh-builtin-snapshot.js');

const requested=[];
const candidate=await tool.buildBuiltinCandidate({
  schema:fixtureSchema(),
  fetchCsv:async function(key){
    if(key==='ledger')throw new Error('live ledger must not be requested');
    requested.push(key);
    return fixtureCsv()[key];
  }
});
assert.deepStrictEqual(Object.keys(candidate),['itin','places','rest','shop','hotels','exp','ledger','cfg']);
assert.strictEqual(candidate.ledger,'紀錄ID,時間,成員\n');
assert.strictEqual(candidate.itin.includes('東京'),false);
```

Add cases for preview drift/no write, no-drift exit 0, `--write`, invalid header, missing cfg key, stale Tokyo itinerary, unknown option, and failed source preserving the target bytes.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node tests/builtin-snapshot-refresh.test.js
```

Expected: FAIL with `Cannot find module '../tools/refresh-builtin-snapshot.js'`.

- [ ] **Step 3: Implement CSV parsing and candidate validation**

Implement an RFC-style CSV parser that handles quoted commas, escaped quotes, CRLF, and quoted newlines. Use the parsed rows only for validation; preserve each fetched CSV string exactly in the candidate.

```js
const SNAPSHOT_KEYS=['itin','places','rest','shop','hotels','exp','ledger','cfg'];
const REMOTE_KEYS=['itin','places','rest','shop','hotels','exp','cfg'];

function buildLedgerHeader(schema){
  return schema.sheets.ledger.columns.map(column=>column.header).join(',')+'\n';
}

async function buildBuiltinCandidate(options){
  const candidate={};
  for(const key of SNAPSHOT_KEYS){
    candidate[key]=key==='ledger'
      ? buildLedgerHeader(options.schema)
      : await options.fetchCsv(key,options.schema.pubBase+options.schema.sheets[key].gid);
  }
  validateBuiltinCandidate({schema:options.schema,candidate});
  return candidate;
}
```

Validation must enforce exact table headers, one exact seven-column itinerary header row after allowed prelude rows, Expenses member marker, all eight required cfg keys, Day 1–6 markers, no `東京`/`新宿`, and a header-only Ledger.

- [ ] **Step 4: Implement deterministic extraction, preview, and atomic write**

Load `schema.js` in a locked-down `vm` sandbox and reject a missing/invalid `SCHEMA`. Extract only these exact declarations:

```js
var BUILTIN_TS = 1783297150977;
var BUILTIN = { ... };
```

Serialize candidate keys in `SNAPSHOT_KEYS` order. For `--write`, write a same-directory temporary file, rename it over `index.html`, re-read and compare the embedded timestamp/snapshot, and remove only that known temporary path on failure. Do not use recursive deletion or workspace globs.

The native fetch adapter must use `AbortController` with the existing Schema timeout, require HTTP 2xx, and normalize only a possible UTF-8 BOM; it must not trim CSV bodies.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node tests/builtin-snapshot-refresh.test.js
node tools/check-app-version.js
git diff --check
```

Expected: tool contract tests pass, version remains v98, and whitespace check exits 0.

- [ ] **Step 6: Commit the tool slice**

```powershell
git add tools/refresh-builtin-snapshot.js tests/builtin-snapshot-refresh.test.js
git commit -m "feat(tools): add safe builtin snapshot refresh"
```

---

### Task 2: Refresh the real BUILTIN and protect offline behavior

**Files:**
- Modify: `index.html` at the `BUILTIN_TS` and `BUILTIN` declarations
- Create: `tests/builtin-snapshot.test.js`
- Modify: `tests/browser/trip-three-scenarios.spec.js` only if the existing offline assertion does not expose the current trip names needed by the characterization

**Interfaces:**
- Consumes: Task 1 CLI and the live public CSV configured by `schema.js`.
- Produces: a current eight-key embedded seed with no Tokyo Day 3–6 data and an empty Ledger body.

- [ ] **Step 1: Write the failing repository characterization**

Read the real `index.html`, execute only the two BUILTIN declarations in `vm`, and assert literal current-trip properties independently of the refresh tool.

```js
assert.strictEqual(snapshot.itin.includes('東京'),false,'the offline seed must not retain Tokyo');
assert.strictEqual(snapshot.itin.includes('新宿'),false,'the offline seed must not retain Shinjuku');
for(const marker of ['第一天10/18','第二天10/19','第三天10/20','第四天10/21','第五天10/22','第六天10/23']){
  assert(snapshot.itin.includes(marker),'the seed contains '+marker);
}
assert.strictEqual(snapshot.ledger.split(/\r?\n/).filter(Boolean).length,1,'Ledger seed is header-only');
```

Also pass `snapshot` through the real parser/buildDB extraction used by existing data tests and assert six days plus non-empty current Places/Restaurants/Shopping collections.

- [ ] **Step 2: Run the characterization and verify RED**

Run:

```powershell
node tests/builtin-snapshot.test.js
```

Expected: FAIL because the current embedded itinerary still contains `東京` and `新宿`.

- [ ] **Step 3: Preview the live refresh**

Run:

```powershell
node tools/refresh-builtin-snapshot.js
```

Expected: exit 2, changed keys listed, old Tokyo flag true, candidate Tokyo flag false, and no working-tree modification.

- [ ] **Step 4: Apply the live refresh**

Run:

```powershell
node tools/refresh-builtin-snapshot.js --write
```

Expected: exit 0 and only the two BUILTIN declarations in `index.html` change. Inspect `git diff -- index.html`; confirm `app-version.js` and `sw.js` remain v98 and no live Ledger record appears.

- [ ] **Step 5: Verify GREEN and offline startup**

Run:

```powershell
node tests/builtin-snapshot-refresh.test.js
node tests/builtin-snapshot.test.js
npx playwright test tests/browser/trip-three-scenarios.spec.js
node tools/check-app-version.js
git diff --check
```

Expected: Node focused tests pass, the three browser scenarios pass with zero page errors, version remains v98, and diff check exits 0.

- [ ] **Step 6: Commit the refreshed seed**

```powershell
git add index.html tests/builtin-snapshot.test.js tests/browser/trip-three-scenarios.spec.js
git commit -m "fix(data): refresh builtin trip snapshot"
```

Stage `tests/browser/trip-three-scenarios.spec.js` only if Step 1 required a behavioral assertion there.

---

### Task 3: Publish the SOP and close backlog items 4 and 11

**Files:**
- Modify: `16_OPS_PLAYBOOK.md`
- Modify: `CONTEXT.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/current.md`
- Modify: `tasks/done.md`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: exact CLI commands and exit codes from Task 1, verified runtime result from Task 2.
- Produces: operator instructions and canonical task status; no runtime behavior.

- [ ] **Step 1: Add the BUILTIN refresh SOP**

Add a dedicated `16_OPS_PLAYBOOK.md` section containing:

```text
Trigger: approved source Sheet change or pre-trip offline audit
Approver: Bar
Preview: node tools/refresh-builtin-snapshot.js
Apply: node tools/refresh-builtin-snapshot.js --write
Required review: index diff is limited to BUILTIN_TS/BUILTIN; Ledger is header-only
Required gates: focused Node, offline Playwright, full Node, full Playwright, governance checks
Failure rule: do not commit or push runtime changes
Release rule: refreshed BUILTIN ships with the next normal SW version
```

- [ ] **Step 2: Update canonical context and task records**

Record Sheet authority, Ledger exclusion, preview/write behavior, atomic failure, and the current refreshed state in `CONTEXT.md` and `08_AI_HANDOVER.md`. Move backlog #4 and #11 to `tasks/done.md` without renumbering other items; update `tasks/current.md` next-action wording and `07_CHANGELOG.md` without claiming a Schema or Sheet modification.

- [ ] **Step 3: Document the tests**

Add both new Node test files and their exact commands to `tests/README.md`. State that tests use controlled fixtures and CI never contacts Google Sheet.

- [ ] **Step 4: Run full verification**

Run every top-level Node test file, then the complete Playwright suite and governance gates:

```powershell
$failed=@(); Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
git status --short --branch
```

Expected: all Node files and all Playwright cases pass, version reports v98, runtime inventory reports eight assets, JSON parses, diff check exits 0, and only intended files are modified.

- [ ] **Step 5: Commit documentation and task closure**

```powershell
git add 16_OPS_PLAYBOOK.md CONTEXT.md 08_AI_HANDOVER.md 07_CHANGELOG.md tasks/backlog.md tasks/current.md tasks/done.md tests/README.md
git commit -m "docs(ops): define builtin refresh procedure"
```

- [ ] **Step 6: Safely push dev**

```powershell
git fetch origin --prune
git status --short --branch
$remote=git rev-parse origin/dev; $base=git merge-base HEAD origin/dev; if($base -ne $remote){throw 'origin/dev is not an ancestor of HEAD'}
git push origin dev
if((git rev-parse HEAD) -ne (git rev-parse origin/dev)){throw 'push verification failed'}
```

Expected: non-force push succeeds, local HEAD equals `origin/dev`, and no merge/deploy/tag occurs.
