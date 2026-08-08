# Buy-to-Ledger Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Shopping → Ledger → durable commit → atomic Shopping link write-back → return loop into one characterized, dependency-injected runtime module without changing user-visible behavior or persisted data.

**Architecture:** P1 first records the production loop and inserts a Buy-to-Ledger-only internal adapter seam inside `index.html`. P2 moves pure source, draft, derived-state, and commit planning into an ES5 UMD/CommonJS module. P3 moves orchestration behind `start(intent)` and `commit(command)`, while a production adapter still owns DOM and repositories. P4 removes transitional wrappers and promotes only the proven inspection and workflow interface.

**Tech Stack:** Static HTML/CSS, ES5-compatible JavaScript, UMD/CommonJS, localStorage repositories, Node `assert`/`vm`, Playwright Chromium, existing PWA Service Worker.

## Global Constraints

- P0 is documentation-only and does not change runtime or version metadata.
- P1–P4 are one v93 runtime batch; v94/v95 remain the shifted two-version SW update-notice sequence.
- No framework, bundler, TypeScript, runtime npm dependency, schema migration, or new storage key.
- Ledger 21-column records must never contain Shopping item/allocation IDs.
- `allocations[].ledgerLinks[]` remains append-only; only the last unreleased link is active.
- Personal persistence success means local repository write completed. Shared success means one atomic durable queue acknowledgement completed.
- Shopping links are written only after Ledger persistence success, in one atomic Shopping store write.
- Ledger success followed by Shopping link failure is not rolled back or retried; use the approved warning and diagnostic log.
- `PERSONAL_STATE_VERSION` remains 9. `netlify.toml` and Apps Script remain unchanged.
- `sw.js` changes at P4 are limited to `SW_VERSION` and adding `buy-to-ledger.js` to `SHELL`; no install/activate/fetch strategy changes.

---

### Task 0: P0 baseline, ADR, and stale artifact cleanup

**Files:**
- Create: `docs/superpowers/specs/2026-08-08-buy-to-ledger-vertical-slice-design.md`
- Create: `adr/0009-buy-to-ledger-vertical-slice.md`
- Modify: `adr/README.md`
- Create: `docs/superpowers/plans/2026-08-08-buy-to-ledger-vertical-slice.md`
- Delete: untracked `docs/superpowers/plans/2026-08-02-ui-ux-hardening.md`

**Interfaces:**
- Produces: the accepted call graph, state table, seam decision, file map, and P1–P4 execution contract.

- [x] **Step 1: Re-run the Git gate and push the already-approved v92 commits**

Confirm `dev`, zero remote-ahead commits, the three expected local commits, and only the known untracked v78 plan; push `dev` to `af2c0ad`.

- [x] **Step 2: Trace the production call graph and state**

Inspect Shopping entry points, source/status derivation, draft population, validation, persistence, link planning, atomic store write, return behavior, and all associated tests.

- [x] **Step 3: Classify the untracked file**

Verify the v78 plan has no Git history, is superseded by the v78/v80 delivery record, contains damaged text, and is referenced only as a formerly preserved artifact. Delete it rather than committing obsolete requirements.

- [x] **Step 4: Record ADR and design**

Document the accepted vertical-slice decision, alternatives, trade-offs, state table, test gaps, adapter categories, and version implications.

- [x] **Step 5: Verify and commit P0**

Run:

```powershell
git diff --check
node tools/check-doc-titles.js
git status --short
git diff --stat
git diff
```

Expected: documentation-only changes, no `index.html`, `sw.js`, `app-version.js`, schema, Apps Script, or deployment changes.

Commit:

```powershell
git add adr/README.md adr/0009-buy-to-ledger-vertical-slice.md docs/superpowers/specs/2026-08-08-buy-to-ledger-vertical-slice-design.md docs/superpowers/plans/2026-08-08-buy-to-ledger-vertical-slice.md
git commit -m "docs(architecture): define Buy-to-Ledger seam"
```

---

### Task 1: P1 end-to-end characterization

**Files:**
- Create: `tests/buy-to-ledger-characterization.test.js`
- Create: `tests/browser/buy-to-ledger.spec.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: the current production functions without a new seam.
- Produces: observable behavior coverage that must remain green through P1–P4.

- [ ] **Step 1: Add Node characterization for the commit matrix**

Load the real current workflow slice and use recording repositories/adapters. Cover:

```js
[
  'single personal save persists once then appends exactly one allocation link',
  'multi save maps filtered submission items to records in the same order',
  'shared queue acknowledgement is sufficient before link write-back',
  'validation/persistence failure produces zero link writes',
  'link plan mismatch preserves Ledger success and performs zero Shopping writes',
  'Shopping write failure does not persist Ledger twice',
  'save-and-add-another clears all source identities',
  'editing a Ledger record never writes Shopping links'
]
```

Tests must assert call order (`persist` before `applyLinks` before `finish`), counts, exact source/record identity, and approved failure copy. They must not assert function source strings.

- [ ] **Step 2: Run characterization against the unchanged runtime**

Run:

```powershell
node tests/buy-to-ledger-characterization.test.js
```

Expected: GREEN. Characterization describes existing behavior; a failure means the test assumption is wrong or an undocumented defect needs a separate decision.

- [ ] **Step 3: Add real Browser loops**

In `tests/browser/buy-to-ledger.spec.js`, use the real inline App and repositories to cover:

- single personal Shopping item → seeded Ledger form → save → personal record + allocation link;
- multiple selected items/allocation sources → multi Ledger save → one-to-one links;
- switch to shared → durable queue record → shared/test-mode link;
- invalid amount → form remains, no record/link;
- standard entry returns to the original App view;
- `keepShoppingList` entry returns to the still-mounted Shopping overlay;
- link write failure shows the approved degraded warning and creates no duplicate record.

- [ ] **Step 4: Run the focused Browser test**

Run:

```powershell
npx playwright test tests/browser/buy-to-ledger.spec.js
```

Expected: GREEN on the P0 runtime.

- [ ] **Step 5: Commit characterization**

```powershell
git add tests/buy-to-ledger-characterization.test.js tests/browser/buy-to-ledger.spec.js tests/README.md
git commit -m "test(ledger): characterize Buy-to-Ledger loop"
```

---

### Task 2: P1 minimal dependency seam in `index.html`

**Files:**
- Modify: `tests/buy-to-ledger-characterization.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `createBuyToLedgerRuntimeAdapter(overrides)` and production `buyToLedgerRuntimeAdapter`.
- Preserves: all existing public Shopping/Ledger handlers and UI behavior.

- [ ] **Step 1: Add a failing seam contract test**

Assert that production and recording adapters can satisfy this exact interface:

```js
{
  readItems: function(itemIds) {},
  readLinkContext: function() {},
  openLedgerDraft: function(sources, options) {},
  persistLedger: function(records, track) {},
  applyLinks: function(links) {},
  finishLedger: function(command, result) {},
  failLedger: function(command, error) {},
  notify: function(message) {},
  log: function(message) {},
  nowIso: function() {}
}
```

Verify overrides replace individual methods without mutating the production adapter.

- [ ] **Step 2: Run focused Node test and verify RED**

Expected: `createBuyToLedgerRuntimeAdapter is not defined`.

- [ ] **Step 3: Implement the factory and route existing calls through it**

Add an ES5 factory beside the current Buy-to-Ledger entry functions:

```js
function createBuyToLedgerRuntimeAdapter(overrides){
  var adapter={
    readItems:function(ids){
      var wanted={};(ids||[]).forEach(function(id){wanted[String(id)]=true;});
      return shoppingListStore.all().filter(function(item){return !!wanted[item.id];});
    },
    readLinkContext:shoppingLedgerContext,
    openLedgerDraft:openShoppingLedgerSourcesEntry,
    persistLedger:persistLedgerExpenseRecords,
    applyLinks:function(links){return shoppingListStore.applyLedgerLinks(links);},
    finishLedger:function(){},
    failLedger:function(){},
    notify:toast,
    log:AppLog.repo,
    nowIso:function(){return timestampDate(Date.now()).toISOString();}
  };
  Object.keys(overrides||{}).forEach(function(key){adapter[key]=overrides[key];});
  return adapter;
}
```

Wire reads, context, draft opening, persistence, link application, clock, feedback, and logging through the adapter while leaving sequencing in the current functions.

- [ ] **Step 4: Run focused and full characterization**

Run both new tests plus:

```powershell
node tests/shopping-ledger-links.test.js
node tests/shopping-list.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-draft-track-switch.test.js
```

- [ ] **Step 5: Commit the minimal seam**

```powershell
git add index.html tests/buy-to-ledger-characterization.test.js
git commit -m "refactor(ledger): add Buy-to-Ledger dependency seam"
```

---

### Task 3: P2 extract the pure domain module

**Files:**
- Create: `buy-to-ledger.js`
- Create: `tests/buy-to-ledger-module.test.js`
- Modify: `index.html`
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: `TripBuyToLedger.createDomain(dependencies)`.
- Domain interface:

```js
{
  inspectItem: function(item, context) {},
  prepare: function(items, context) {},
  createDraftPlan: function(sources) {},
  sourceRefs: function(submissionDraft) {},
  planCommit: function(input) {},
  normalizeLink: function(link) {},
  appendLink: function(links, link) {},
  releaseLink: function(links, at) {}
}
```

- [ ] **Step 1: Write failing direct module tests**

Require `../buy-to-ledger.js` and cover:

- linked/unverified/unlinked plus personal/shared replacement/tombstone behavior;
- rich `inspectItem()` projection for partial allocations, edit locks and split eligibility;
- `prepare()` exclusions and block reasons;
- single/multi draft plan with composite source identity;
- source refs after blank multi rows were removed;
- saved `result.records` precedence over prepared records;
- count/order/malformed-source mismatch returns degraded plan;
- append/release history invariants and input immutability.

- [ ] **Step 2: Run direct test and verify RED**

Expected: module cannot be required.

- [ ] **Step 3: Create the ES5 UMD module**

Use the existing `shopping-photo-store.js` export shape:

```js
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripBuyToLedger=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function createDomain(dependencies){ /* pure implementation */ }
  return {createDomain:createDomain};
});
```

The only injected domain dependency is `effectiveRecords(records)`. No DOM, storage, clock, repository, toast, or global UI state may be referenced.

- [ ] **Step 4: Load the module and replace pure implementations**

Load `buy-to-ledger.js` before the inline runtime. Instantiate:

```js
var buyToLedgerDomain=TripBuyToLedger.createDomain({
  effectiveRecords:function(records){return effectiveLedgerRecords(records,function(){});}
});
```

Keep temporary same-name delegates only where required to avoid a P2-wide caller rewrite. Direct tests move to the module interface; delete equivalent substring assertions rather than layering both.

- [ ] **Step 5: Run focused suites and commit**

```powershell
node tests/buy-to-ledger-module.test.js
node tests/buy-to-ledger-characterization.test.js
node tests/shopping-ledger-links.test.js
node tests/shopping-list.test.js
npx playwright test tests/browser/buy-to-ledger.spec.js
```

```powershell
git add buy-to-ledger.js index.html tests/buy-to-ledger-module.test.js tests/buy-to-ledger-characterization.test.js tests/shopping-ledger-links.test.js tests/shopping-list.test.js tests/README.md
git commit -m "refactor(ledger): extract Buy-to-Ledger domain"
```

---

### Task 4: P3 extract the workflow coordinator

**Files:**
- Modify: `buy-to-ledger.js`
- Modify: `tests/buy-to-ledger-module.test.js`
- Modify: `tests/buy-to-ledger-characterization.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `createDomain()` and the P1 runtime adapter.
- Produces: `TripBuyToLedger.createWorkflow({domain,adapter})` returning `start(intent)` and `commit(command)`.

- [ ] **Step 1: Write failing coordinator tests with a recording adapter**

Use an event array and assert exact observable order:

```js
['readItems','readLinkContext','openLedgerDraft']
['persistLedger','applyLinks','finishLedger']
['persistLedger','log','notify','finishLedger'] // link degradation
['persistLedger','failLedger']                 // persistence rejection
```

Also cover blocked unverified input, empty sources, standard versus keep-list start, no Shopping session, edits, add-another, and synchronous throws normalized to Promise outcomes.

- [ ] **Step 2: Run direct module test and verify RED**

Expected: `createWorkflow is not a function`.

- [ ] **Step 3: Implement `createWorkflow()`**

The coordinator must:

```js
function start(intent){
  // read current items -> domain.prepare -> notify block or adapter.openLedgerDraft
}

function commit(command){
  // adapter.persistLedger -> domain.planCommit -> adapter.applyLinks
  // -> adapter.finishLedger; persistence failure -> adapter.failLedger
  // link failure never calls persistLedger again and still finishes the Ledger success
}
```

Return structured outcomes (`opened`, `blocked`, `saved-linked`, `saved-degraded`, `failed`) so tests and future callers do not parse Toast text.

- [ ] **Step 4: Route only Buy-to-Ledger sessions through the coordinator**

Entry handlers call `buyToLedgerWorkflow.start()`. In `commitLedgerEntrySave()`, detect complete source refs on the validated `submissionDraft`; route those new saves through `buyToLedgerWorkflow.commit()`. Generic Ledger adds and all edits retain the existing commit path.

- [ ] **Step 5: Delete superseded orchestration and run focused suites**

Remove `writeShoppingLedgerLinks()` after no caller remains. Keep generic Ledger finishing behavior in production adapter methods; do not duplicate it inside the module.

Run all focused Node and Browser tests from Tasks 1–3, then commit:

```powershell
git add buy-to-ledger.js index.html tests/buy-to-ledger-module.test.js tests/buy-to-ledger-characterization.test.js
git commit -m "refactor(ledger): coordinate Buy-to-Ledger workflow"
```

---

### Task 5: P4 formalize the runtime module interface

**Files:**
- Modify: `buy-to-ledger.js`
- Modify: `index.html`
- Modify: `tests/buy-to-ledger-module.test.js`
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `tests/shopping-list.test.js`

**Interfaces:**
- Final external module interface:

```js
TripBuyToLedger.createDomain({effectiveRecords})
TripBuyToLedger.createWorkflow({domain,adapter})
```

- Final workflow caller interface: `start(intent)` and `commit(command)`.
- Final domain caller interface: `inspectItem()`, `prepare()`, `createDraftPlan()`, `sourceRefs()`, `planCommit()`, and link-history operations proven by the Shopping store.

- [ ] **Step 1: Add an exported-interface contract test**

Assert exact top-level exports, structured outcomes, input immutability, and absence of DOM/storage globals in `buy-to-ledger.js`.

- [ ] **Step 2: Replace transitional wrappers at proven call sites**

Move Shopping card/detail/edit/delete/split consumers to one `inspectItem()` projection rather than separately recomputing state. Move store link history operations to the module interface. Remove delegates whose deletion does not reintroduce complexity.

- [ ] **Step 3: Replace structural tests instead of layering**

Delete source-order/substring assertions made obsolete by direct module and Browser behavior tests. Retain static tests only for true DOM wiring and the invariant that source IDs never enter `buildLedgerExpenseRecords()`.

- [ ] **Step 4: Run the focused test surface**

Require direct module, characterization, Shopping store/list, Ledger quick entry, track switching, and Buy-to-Ledger Browser tests to pass before versioning.

- [ ] **Step 5: Commit the formal interface**

```powershell
git add buy-to-ledger.js index.html tests/buy-to-ledger-module.test.js tests/shopping-ledger-links.test.js tests/shopping-list.test.js
git commit -m "refactor(ledger): formalize Buy-to-Ledger module"
```

---

### Task 6: v93 integration, documentation, and full verification

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` (`APP_RELEASE_NOTES`)
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `tests/theme-system.test.js` if the five-note window changes

**Interfaces:**
- Produces: one cache-coherent v93 architecture batch with unchanged persistence/schema semantics.

- [ ] **Step 1: Update runtime asset/version metadata**

Set `APP_VERSION` and `SW_VERSION` to `v93`, add `./buy-to-ledger.js` to `SHELL`, and make no other SW logic change. Add a user-facing release note that describes reliability/internal maintainability without claiming new functionality.

- [ ] **Step 2: Update architecture and delivery documentation**

Record v93 in `07_CHANGELOG.md`; update `tasks/current.md` counts and candidate range; move the SW update-notice sequence to v94/v95; document the new tests and module in `tests/README.md` and architecture/file-structure docs only where their current statements become false.

- [ ] **Step 3: Run static gates**

```powershell
git diff --check
node tools/check-doc-titles.js
node tools/check-app-version.js
```

Verify `PERSONAL_STATE_VERSION=9`, no `netlify.toml` diff, and `sw.js` contains only the version and one SHELL asset addition.

- [ ] **Step 4: Run all Node tests**

Run every `tests/*.test.js` file in name order and record the actual file count.

- [ ] **Step 5: Run all Playwright tests**

```powershell
npm run test:browser
```

Record the actual pass count. Require no page errors and no horizontal overflow in the new Browser scenarios.

- [ ] **Step 6: Final architecture audit**

Confirm:

- generic Ledger add/edit paths remain behaviorally unchanged;
- all Buy-to-Ledger entry paths cross the same workflow seam;
- module direct tests replace obsolete implementation-string tests;
- no duplicate domain implementation remains in `index.html`;
- source IDs remain ephemeral;
- Ledger-success/link-failure remains fail-safe and never retries Ledger;
- changed files match this plan.

- [ ] **Step 7: Commit locally and stop**

```powershell
git add buy-to-ledger.js index.html app-version.js sw.js 07_CHANGELOG.md tasks/current.md tests docs adr
git commit -m "refactor(ledger): complete Buy-to-Ledger slice for v93"
```

Do not push, deploy, tag, or modify `main` without a new explicit Bar instruction.
