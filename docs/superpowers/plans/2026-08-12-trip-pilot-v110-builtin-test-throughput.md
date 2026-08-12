# Trip Pilot v110 BUILTIN Asset Spike and Test Throughput Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Determine whether generated BUILTIN data can move out of `index.html` without weakening no-blank offline boot, and safely accelerate the browser gate only when repeated evidence proves determinism.

**Architecture:** Extend the existing preview-first snapshot generator to own a generated `builtin-snapshot.js` artifact. Treat shipping as conditional: mixed-version, offline, failure, and performance gates must all pass or the runtime externalization is reverted. Evaluate two Playwright workers independently from App behavior.

**Tech Stack:** Node.js file tooling, vanilla JavaScript, Service Worker CacheStorage, Playwright Chromium, GitHub Actions.

## Global Constraints

- Start only after Bar accepts v109 on the target device/PWA.
- BUILTIN content is Tier 3 and must never be hand-edited.
- Never fetch live Ledger data into BUILTIN; Ledger remains the schema-derived empty 21-column header.
- Preserve preview-first, atomic write, no-drift, three-layer boot, Pages subpath, and no-blank-page contracts.
- If any externalization kill criterion fails, revert runtime externalization and keep inline BUILTIN.
- Do not implement the excluded App-update prompt or alter production release state.

---

### Task 1: Characterize generated snapshot asset format

**Files:**
- Modify: `tests/builtin-snapshot-refresh.test.js`
- Modify: `tests/builtin-snapshot.test.js`
- Create: `tests/builtin-snapshot-asset.test.js`

**Interfaces:**
- Consumes: `{timestamp:number,snapshot:object}` from the existing generator.
- Produces: exact generated JavaScript format containing `BUILTIN_TS`, `BUILTIN_ASSET_VERSION`, and `BUILTIN`.

- [ ] **Step 1: Write RED format tests**

Require a deterministic serializer result:

```js
const text=tool.serializeBuiltinAsset({timestamp:1234,snapshot:{itin:'A\n',ledger:'header\n'}},'v110');
assert.strictEqual(text,
  "var BUILTIN_TS=1234;\n"+
  "var BUILTIN_ASSET_VERSION='v110';\n"+
  "var BUILTIN={\"itin\":\"A\\n\",\"ledger\":\"header\\n\"};\n"
);
```

Require parsing, round-trip equality, deterministic key order, rejection of missing seven non-Ledger sheets, rejection of non-empty Ledger rows, and no mutation of the candidate.

- [ ] **Step 2: Run RED**

Run: `node tests/builtin-snapshot-asset.test.js tests/builtin-snapshot-refresh.test.js`

Expected: FAIL because asset serializer/parser functions do not exist.

- [ ] **Step 3: Implement serializer/parser helpers in the generator**

Export:

```js
serializeBuiltinAsset(candidate,appVersion)
readBuiltinAsset(source)
```

Keep the existing schema/header candidate builder and safety checks as the only content authority.

- [ ] **Step 4: Run GREEN and commit tooling**

```powershell
node tests/builtin-snapshot-asset.test.js
node tests/builtin-snapshot-refresh.test.js
node tests/builtin-snapshot.test.js
git add -- tools/refresh-builtin-snapshot.js tests/builtin-snapshot-asset.test.js tests/builtin-snapshot-refresh.test.js tests/builtin-snapshot.test.js
git commit -m "test(builtin): define generated asset contract"
```

### Task 2: Make preview/write atomic across HTML and asset

**Files:**
- Modify: `tools/refresh-builtin-snapshot.js`
- Modify: `tests/builtin-snapshot-refresh.test.js`
- Generate through tool only: `builtin-snapshot.js`

**Interfaces:**
- Consumes: current Sheet candidate and `app-version.js`.
- Produces: atomic pair update for HTML bootstrap marker and generated asset, with rollback on either verification failure.

- [ ] **Step 1: Add RED atomicity cases**

Cover:

- preview reports drift when generated asset is missing, stale, or version-mismatched;
- write stages both targets in the same directory;
- failure before the second rename restores both original files byte-for-byte;
- read-back verifies timestamp, snapshot, and App version;
- the final preview reports no drift;
- no request is ever made for public Ledger CSV.

- [ ] **Step 2: Run RED**

Run: `node tests/builtin-snapshot-refresh.test.js`

Expected: FAIL on missing two-file staging behavior.

- [ ] **Step 3: Implement two-file staging and rollback**

Use explicit absolute paths resolved under the supplied root. Write temporary siblings, fsync/close, read back both, then rename. If either rename/read-back fails, restore the original bytes through the same safe sibling strategy. Do not use broad deletion or unresolved paths.

- [ ] **Step 4: Generate through the approved tool and verify**

```powershell
node tools/refresh-builtin-snapshot.js
node tools/refresh-builtin-snapshot.js --write
node tests/builtin-snapshot-refresh.test.js
node tests/builtin-snapshot-asset.test.js
node tools/refresh-builtin-snapshot.js
```

The first preview may report expected structural drift; after write, the final preview must report no drift.

- [ ] **Step 5: Commit generator and generated asset**

```powershell
git add -- tools/refresh-builtin-snapshot.js tests/builtin-snapshot-refresh.test.js builtin-snapshot.js
git commit -m "feat(builtin): generate snapshot asset atomically"
```

### Task 3: Wire the generated asset behind failure-safe boot

**Files:**
- Modify: `index.html` BUILTIN bootstrap and script order
- Modify: `runtime-assets.json`
- Modify: `sw.js`
- Modify: `.ai-manifest.json`
- Modify: `README.md`
- Modify: `tests/runtime-assets.test.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`
- Modify: `tests/browser/trip-three-scenarios.spec.js`
- Modify: `tests/browser/sw-update-cache.spec.js`
- Modify: `tests/browser/support/versioned-server.js`

**Interfaces:**
- Consumes: `BUILTIN`, `BUILTIN_TS`, `BUILTIN_ASSET_VERSION` from the generated asset.
- Produces: matching-version boot or explicit safe recovery; never an empty DB.

- [ ] **Step 1: Write RED mixed-version and asset-failure tests**

Require:

- `index.html` loads `builtin-snapshot.js` before boot code.
- App/SW/snapshot versions match in the active CacheStorage generation.
- missing generated asset + valid local snapshot boots from local snapshot and logs degraded data status;
- missing generated asset + no valid local snapshot renders a non-blank recovery panel and does not call `buildDB({})`;
- offline installed PWA reloads with BUILTIN available;
- cached old asset cannot silently combine with new HTML/SW.

Extend `activeCacheReport()` and `waitForShellCached()` to include `builtin-snapshot.js` and its QAGEN marker.

- [ ] **Step 2: Run RED**

```powershell
node tests/pwa-shell.test.js tests/atomic-sheet-sync.test.js tests/runtime-assets.test.js
npx playwright test tests/browser/trip-three-scenarios.spec.js tests/browser/sw-update-cache.spec.js
```

Expected: FAIL because the generated asset is not yet loaded/cached/version-checked.

- [ ] **Step 3: Implement safe boot wiring**

- Load the generated asset before the App boot script.
- Replace inline generated payload with a small hand-maintained bootstrap guard only; do not retain a duplicate snapshot.
- Before selecting BUILTIN, verify `BUILTIN_ASSET_VERSION===appVersion()`.
- Prefer a valid local active snapshot when the asset is missing or mismatched.
- When neither exists, render a recovery panel with `重新載入` and diagnostic-copy actions; do not render an empty trip.
- Register and cache the asset in every runtime location.

- [ ] **Step 4: Run GREEN and performance comparison**

Run the focused Node/browser commands from Step 2 until green. Measure ten local Chromium cold navigations before and after using the same static server and record median DOMContentLoaded and first Today render. The external asset passes only when the median Today render regression is no greater than 10% and no individual run produces a blank or mixed-version state.

- [ ] **Step 5: Apply the kill criterion**

If any safety or performance condition fails, revert Task 3 runtime wiring and generated runtime registration, restore inline BUILTIN through the generator, and retain only independently useful generator tests. Record the failed condition in the v110 decision note.

If all conditions pass, commit:

```powershell
git add -- builtin-snapshot.js index.html runtime-assets.json sw.js .ai-manifest.json README.md tests/runtime-assets.test.js tests/pwa-shell.test.js tests/atomic-sheet-sync.test.js tests/browser/trip-three-scenarios.spec.js tests/browser/sw-update-cache.spec.js tests/browser/support/versioned-server.js
git commit -m "refactor(builtin): externalize verified snapshot asset"
```

### Task 4: Evaluate two Playwright workers

**Files:**
- Modify only on success: `playwright.config.js`
- Modify only on success: `.github/workflows/qa.yml`
- Create: `docs/qa/playwright-worker-experiment-v110.md`

**Interfaces:**
- Consumes: clean committed v110 candidate and existing Playwright suite.
- Produces: evidence-based worker decision; `workers: process.env.CI ? 2 : 1` only after three clean runs.

- [ ] **Step 1: Record one-worker baseline**

Run `npx playwright test --workers=1` once and record SHA, pass count, failure count, and wall time.

- [ ] **Step 2: Run three clean two-worker suites**

Run `npx playwright test --workers=2` three consecutive times without changing files between runs. Record every result and duration.

- [ ] **Step 3: Decide mechanically**

Adopt two CI workers only if all three runs pass with zero retries, zero pageerrors, no port conflicts, and identical test count. Otherwise leave config/workflow unchanged and record `one worker retained` with the exact failing evidence.

- [ ] **Step 4: Implement the accepted configuration**

On success set:

```js
workers:process.env.CI?2:1,
```

Keep `.github/workflows/qa.yml` command `npm run test:browser`; add a troubleshooting comment documenting `npx playwright test --workers=1`. On rejection, commit only the experiment report.

- [ ] **Step 5: Commit**

Success commit: `perf(test): use two Playwright CI workers`.

Rejected experiment commit: `docs(qa): retain deterministic Playwright worker`.

### Task 5: Release or close the v110 spike

**Files:**
- Modify: actual release/status/architecture/test documents and, only if runtime externalization ships, App/SW version and release notes.
- Modify: `docs/superpowers/plans/2026-08-12-trip-pilot-v110-builtin-test-throughput.md`

**Interfaces:**
- Consumes: Tasks 1–4 evidence.
- Produces: either a verified v110 runtime candidate or a documented no-ship spike with the last accepted App version unchanged.

- [ ] **Step 1: Record the exact outcome**

If externalization passes, forward-bump to v110 and document the new generated asset, recovery behavior, performance numbers, and worker decision. If it fails, do not claim or version a runtime release solely for the rejected spike; document which generator/test improvements remain.

- [ ] **Step 2: Run full committed-tree gate**

Run full Node, Playwright with the accepted worker policy, SW mixed-version, offline boot, Pages-subpath-equivalent, runtime asset, BUILTIN no-drift, manifest, version, document, diff, Health Check, and pageerror gates.

- [ ] **Step 3: Commit final records**

Use a commit message that describes the actual outcome, not the planned outcome.

- [ ] **Step 4: Fetch and push `dev` only when releasable**

Require zero remote-only commits, clean tree, and identical post-push SHAs. Do not merge, deploy, or tag production.

