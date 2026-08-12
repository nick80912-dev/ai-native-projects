# Trip Pilot v109 UI Tokens and Today Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate presentation semantics in touched UI and move Today Hero behavior behind one production-used ES5 module without changing its accepted output.

**Architecture:** Add non-theme presentation tokens on top of the existing six-theme system. Create `today-view.js` as a pure model/renderer module; `index.html` supplies prepared data, escaping helpers, and DOM effects. Remove replaced inline implementations instead of keeping wrappers.

**Tech Stack:** Vanilla ES5 JavaScript, CSS custom properties, Node.js tests, Playwright Chromium/WebKit.

## Global Constraints

- Start only after Bar accepts v108 on the target device/PWA.
- Do not change six theme palettes, four tabs, Schema, storage, backup, synchronization, Ledger semantics, App update UX, or production release state.
- Exact v108 visible copy and behavior are the default; only token substitution and module ownership change.
- Module tests and production must use the same `TripTodayView` interface.
- Do not create a Ledger module unless its deletion test demonstrates real complexity reduction.

---

### Task 1: Add semantic presentation tokens to touched UI

**Files:**
- Modify: `index.html:20-120, 150-190, navigation/diagnostic CSS sections`
- Modify: `tests/theme-system.test.js`
- Modify: `tests/ui-ux-hardening.test.js`
- Modify: `tests/browser/ui-ux-hardening.spec.js`
- Modify: `tests/browser/today-live-info.spec.js`

**Interfaces:**
- Consumes: existing `--t-*` theme tokens and semantic color roles.
- Produces: stable `--font-*`, `--space-*`, `--radius-*`, and action-role custom properties used by Today/navigation/diagnostics.

- [ ] **Step 1: Write RED token and computed-style assertions**

Require these exact properties on `:root`:

```css
--font-caption:11px;
--font-meta:12px;
--font-body:14px;
--font-title:20px;
--font-display:24px;
--space-1:4px;
--space-2:8px;
--space-3:12px;
--space-4:16px;
--space-5:24px;
--radius-sm:6px;
--radius-control:10px;
--radius-card:14px;
--radius-pill:999px;
```

Add browser assertions across all six themes that Today Hero, navigation status, diagnostics impact rows, primary actions, and quiet actions preserve their pre-v109 computed color, font size, radius, minimum target size, and overflow behavior.

Run: `node tests/theme-system.test.js tests/ui-ux-hardening.test.js`

Expected: FAIL because the presentation tokens do not exist.

- [ ] **Step 2: Add tokens without palette changes**

Define tokens once outside theme selectors. Replace literal sizes/radii only in Today Hero, v108 navigation confirmation, diagnostics impact, `.btn`, and the matching shared action variants. Keep all six `--t-*` maps byte-for-byte unchanged.

- [ ] **Step 3: Run GREEN across themes and mobile widths**

```powershell
node tests/theme-system.test.js tests/ui-ux-hardening.test.js
npx playwright test tests/browser/ui-ux-hardening.spec.js tests/browser/today-live-info.spec.js
```

Expected: PASS at 320, 375, and 390px with no intentional visual delta beyond using shared variables.

- [ ] **Step 4: Commit**

```powershell
git add -- index.html tests/theme-system.test.js tests/ui-ux-hardening.test.js tests/browser/ui-ux-hardening.spec.js tests/browser/today-live-info.spec.js
git commit -m "refactor(ui): consolidate presentation semantics"
```

### Task 2: Characterize the Today module interface

**Files:**
- Create: `tests/today-view-module.test.js`
- Modify: `tests/render-note.test.js`
- Modify: `tests/home-simplification.test.js`

**Interfaces:**
- Consumes: prepared Today input and helper functions.
- Produces: executable characterization for `TripTodayView.buildModel(input)`, `.render(model,helpers)`, and `.actionFor(target)`.

- [ ] **Step 1: Define input/output fixtures before extraction**

Use fixtures for:

- Future Shopping group with category and `+N`.
- Blank category → `未分類` without input mutation.
- Exact next stop excluded from Hero.
- Generic Shopping fallback.
- Full accessible location with six-code-point visible cap.
- Product names absent from visible and accessible HTML.

Define the target model shape:

```js
{
  kind:'shopping-summary',
  label:'順路採買',
  stopRef:'future',
  stopName:'Nakayama Farm Heart Sakazu',
  visibleStopName:'Nakaya…',
  category:'未分類',
  count:2,
  remainingCount:1,
  accessible:'開啟Nakayama Farm Heart Sakazu採買：未分類，共 2 項待買'
}
```

Require `actionFor(model)` to return `{type:'open-shopping-list',stopRef:'future'}` and generic fallback to return `{type:'open-shopping-list',stopRef:''}`.

- [ ] **Step 2: Run RED**

Run: `node tests/today-view-module.test.js`

Expected: FAIL because `today-view.js` does not exist.

- [ ] **Step 3: Commit characterization only**

```powershell
git add -- tests/today-view-module.test.js tests/render-note.test.js tests/home-simplification.test.js
git commit -m "test(today): define view module contract"
```

### Task 3: Implement and wire `today-view.js`

**Files:**
- Create: `today-view.js`
- Modify: `index.html` Today Hero helpers and script tags
- Modify: `runtime-assets.json`
- Modify: `sw.js`
- Modify: `.ai-manifest.json`
- Modify: `README.md`
- Modify: `tests/runtime-assets.test.js`
- Modify: `tests/today-view-module.test.js`

**Interfaces:**
- Consumes: Task 2 fixtures plus helpers `{escapeHtml,escapeHtmlAttr,jsHtmlAttrString}`.
- Produces: global `TripTodayView` with the exact three-method interface from Task 2.

- [ ] **Step 1: Implement minimal pure model and renderer**

`buildModel(input)` receives an already selected reminder/model projection and returns either a normalized `shopping-summary`, a `shopping-generic`, or `null`. It performs the blank-category display fallback and six-code-point visible name cap but never mutates input.

`render(model,helpers)` produces the existing Today Shopping button markup. `actionFor(target)` returns the declarative open-list action and never touches the DOM.

Use a CommonJS/global wrapper matching other runtime modules and ES5 syntax except `Array.from`, which is already a supported current runtime dependency for Unicode code-point truncation.

- [ ] **Step 2: Run module GREEN**

Run: `node tests/today-view-module.test.js`

Expected: PASS for all characterized cases.

- [ ] **Step 3: Register and replace inline implementation**

- Register `today-view.js` in all runtime-asset locations and SW SHELL.
- Keep DB lookup, `shoppingListStore`, reminder selection, and current-stop resolution in `index.html`.
- Replace `todayHeroShoppingStopText()` and the markup branch inside `renderTodayShoppingSummary()` with `TripTodayView.buildModel()`, `.render()`, and `.actionFor()`.
- Delete the replaced inline helper/markup implementation in the same commit; do not retain a second production renderer.
- Convert the declarative action to the existing `openShoppingList(stopRef)` inline handler through the adapter helper.

- [ ] **Step 4: Run focused production wiring gates**

```powershell
node tests/today-view-module.test.js
node tests/render-note.test.js
node tests/home-simplification.test.js
node tests/runtime-assets.test.js
npx playwright test tests/browser/today-live-info.spec.js tests/browser/view-context.spec.js
npx playwright test tests/browser/today-live-info.spec.js --browser=webkit --grep "Shopping|target|blank category"
```

Expected: exact v108 output and targeting remain intact.

- [ ] **Step 5: Commit**

```powershell
git add -- today-view.js index.html runtime-assets.json sw.js .ai-manifest.json README.md tests/runtime-assets.test.js tests/today-view-module.test.js tests/render-note.test.js tests/home-simplification.test.js
git commit -m "refactor(today): extract Hero view module"
```

### Task 4: Apply the Ledger deletion test

**Files:**
- Create: `docs/architecture/ledger-history-deletion-test-v109.md`
- Test: `tests/ledger-ui-state.test.js`
- Inspect: `index.html` Ledger history adapter functions

**Interfaces:**
- Consumes: existing `LedgerUiState` public interface and current history DOM adapter.
- Produces: a written accept/reject decision for one `ledger-history-view.js` seam; no runtime file is created when leverage is insufficient.

- [ ] **Step 1: Inventory caller knowledge**

Record the functions that independently know history filter, selection, empty-state, row-action, and render ordering. For each, list its direct DOM, storage, repository, and module dependencies.

- [ ] **Step 2: Design one candidate interface**

The only accepted candidate shape is:

```js
LedgerHistoryView.buildModel(records,state,options)
LedgerHistoryView.render(model,helpers)
LedgerHistoryView.actionFor(target)
```

Reject the seam if callers would still need to know filtering, selection, ordering, and action availability individually, or if the module would directly read DOM/storage/repository globals.

- [ ] **Step 3: Run the deletion test and record the decision**

If deleting the candidate would redistribute at least two independent rules across at least two callers, add a separately approved follow-on plan. Otherwise record `rejected` with evidence and leave runtime code unchanged. Entry, settlement, calculator, and correction are not extracted.

- [ ] **Step 4: Commit the decision**

```powershell
git add -- docs/architecture/ledger-history-deletion-test-v109.md
git commit -m "docs(architecture): evaluate Ledger history seam"
```

### Task 5: Release and deliver v109

**Files:**
- Modify: version, release-note, architecture, UI, changelog, handover, task, test, and plan documents required by the repository release contract.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: verified v109 `dev` candidate.

- [ ] **Step 1: Forward-bump to v109 and document actual decisions**

Record token adoption, Today module ownership, and the Ledger seam accept/reject result. Do not claim a Ledger extraction if only the decision document exists.

- [ ] **Step 2: Run static, focused, full, WebKit, and offline Health gates**

Use the same static/full gate set as v108 plus `today-view-module.test.js`, six-theme browser coverage, and exact output tests.

- [ ] **Step 3: Commit release metadata**

Commit with: `docs: release Today view module v109`.

- [ ] **Step 4: Verify committed tree and push `dev`**

Require zero remote-only commits and identical local/remote SHAs. Stop for Bar's v109 device/PWA verification before starting v110.

