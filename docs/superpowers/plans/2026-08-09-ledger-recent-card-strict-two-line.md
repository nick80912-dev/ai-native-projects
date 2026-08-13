# Ledger Recent Card Strict Two-Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep personal and shared recent-expense cards at exactly two single-line content rows, in the approved field order, with ellipsis truncation on narrow screens.

**Architecture:** Restructure only the output of the existing `renderLedgerRecentRecord()` presentation seam and its adjacent CSS. Preserve all existing Ledger calculations and labels; expose two explicit row containers so renderer and browser tests can verify the visual contract through production markup.

**Tech Stack:** Vanilla JavaScript and CSS in `index.html`, Node `assert`/`vm` renderer tests, Playwright Chromium regression tests.

## Global Constraints

- First row: item name, payment method, then personal proxy or shared payer/allocation context.
- Second row: store, category, tax-free, TEST, pending-sync, then locked/corrected status.
- Keep personal proxy coral-family styling, pending-sync yellow styling, and shared/locked/corrected neutral styling.
- Preserve every existing condition and label calculation, including locked/corrected mutual exclusivity.
- Do not change Ledger domain, repository, Queue, Apps Script, settlement, correction, schema, CSV, localStorage, backup formats or Shopping UI.
- Keep `app-version.js` and `sw.js` at v98.
- Deliver to `dev` only; do not merge `main`, deploy Netlify or create a production tag.

---

### Task 1: Lock the renderer contract with a failing test

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/ledger-mobile-hotfix.test.js`

**Interfaces:**
- Executes the real `renderLedgerRecentRecord(record, shared, currency)` implementation in the existing VM harness.
- Observes production HTML, field order, status class assignment and missing-field fallbacks.

- [ ] **Step 1: Name the mutations the tests must catch**

The tests must fail if the renderer swaps any approved field, creates a third badge row, wraps locked and corrected together, applies pending styling to neutral tags, or drops category/context when an adjacent optional field is absent.

- [ ] **Step 2: Add exact row/order assertions**

Create literal personal and shared fixtures. Assert the output contains exactly one `.ledger-recent-primary-line` and `.ledger-recent-secondary-line`, with substring indexes in this order:

```js
item < payment < proxyOrSharedContext
store < category < taxFree < test < pending < lockedOrCorrected
```

Assert shared context and locked/corrected use `.ledger-recent-badge`, pending uses `.ledger-recent-badge pending`, corrected output excludes locked output, and recent records no longer emit `has-badges` or `.ledger-recent-badges`.

- [ ] **Step 3: Add fallback assertions**

Verify a missing payment omits only `.ledger-recent-payment`, a missing store still renders category, a missing category still renders store, and both row containers remain present when metadata/status values are empty.

- [ ] **Step 4: Update the mobile source contract**

Replace the obsolete `has-badges` assertion in `tests/ledger-mobile-hotfix.test.js` with assertions for two explicit no-wrap/overflow-hidden rows and ellipsis-capable flexible fields.

- [ ] **Step 5: Run Node tests and verify RED**

Run:

```powershell
node tests/ledger-225.test.js
node tests/ledger-mobile-hotfix.test.js
```

Expected: at least the renderer test fails because production still emits the old main/store/meta/badges hierarchy.

### Task 2: Lock narrow-screen geometry with a failing browser test

**Files:**
- Modify: `tests/browser/data-observability.spec.js`

**Interfaces:**
- Renders real recent-expense cards with long personal/shared fixtures.
- Measures production DOM and computed styles at 320, 375 and 390px.

- [ ] **Step 1: Extend fixtures and hierarchy assertions**

Use long item/store/context values and status-bearing shared data. Assert the primary and secondary rows contain the approved fields in DOM order, and the old third-row container is absent.

- [ ] **Step 2: Add two-line and truncation geometry assertions**

For each viewport, assert:

- `.ledger-recent-main` has exactly two element children;
- both rows compute `white-space: nowrap`, fit their client height and do not create a third visual line;
- flexible item and location fields use `overflow: hidden` and `text-overflow: ellipsis`;
- card/body/document do not horizontally overflow and text does not overlap the right-side amounts;
- shared context and locked status resolve to the same neutral colors;
- pending status retains its existing yellow colors.

- [ ] **Step 3: Run the browser test and verify RED**

Run: `npx playwright test tests/browser/data-observability.spec.js`

Expected: FAIL because the explicit two-row DOM and no-wrap CSS contract do not yet exist.

### Task 3: Implement the minimal two-row renderer and CSS

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces `.ledger-recent-primary-line`, `.ledger-recent-secondary-line`, `.ledger-recent-detail`, `.ledger-recent-payment`, `.ledger-recent-context`, `.ledger-recent-location` and `.ledger-recent-statuses`.
- Reuses existing proxy markup, participant label, metadata and status calculations.

- [ ] **Step 1: Build ordered status markup**

Push status tags only in the approved order: tax-free, TEST, pending, then corrected or locked. Preserve their existing conditions and wording.

- [ ] **Step 2: Build the two explicit rows**

Move payment into the primary row after the item. Render personal proxy/shared participant context after payment. Move store/category and the ordered status strip into the secondary row. Keep both row containers even when optional content is absent.

- [ ] **Step 3: Apply strict single-line CSS**

Make `.ledger-recent-main` a two-row grid. Give both lines `white-space: nowrap`, `overflow: hidden` and bounded flex children. Apply ellipsis to the item/location/context/status elements, keep amounts/menu outside the two rows, scope compact typography to recent-card context/status tags, and retain the original coral, neutral and pending palettes.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-225.test.js
node tests/ledger-dashboard.test.js
node tests/ledger-list-actions.test.js
node tests/ledger-mobile-hotfix.test.js
npx playwright test tests/browser/data-observability.spec.js tests/browser/proxy-inline.spec.js
```

Expected: all pass with no browser page errors, wrapping or overlap.

- [ ] **Step 5: Record test coverage and commit implementation**

Update `tests/README.md`, run `git diff --check`, then commit:

```powershell
git add index.html tests/ledger-225.test.js tests/ledger-mobile-hotfix.test.js tests/browser/data-observability.spec.js tests/README.md
git commit -m "fix(ledger): compact recent cards to two lines"
```

### Task 4: Governance, full verification and delivery

**Files:**
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`
- Modify: `tasks/done.md`

**Interfaces:**
- Records verified UI behavior and the unchanged runtime/data boundaries.
- Leaves the next backlog priority unchanged.

- [ ] **Step 1: Update governance documents**

Record the exact two-line order, responsive truncation, preserved palettes, TDD evidence, unchanged v98 runtime and unchanged data/domain layers. Keep TEST localStorage prefix isolation as the next backlog item.

- [ ] **Step 2: Run complete gates**

Run every top-level `tests/*.test.js`, the complete Playwright suite, document-title, app-version, runtime-asset and JSON checks, then `git diff --check`.

- [ ] **Step 3: Commit documentation**

```powershell
git add 07_CHANGELOG.md 08_AI_HANDOVER.md .ai-manifest.json tasks/current.md tasks/done.md
git commit -m "docs(ledger): record strict two-line card layout"
```

- [ ] **Step 4: Verify final HEAD and push**

Re-run full Node and Playwright gates on the committed HEAD. Fetch `origin`, confirm `origin/dev` remains an ancestor with no remote-only commits, push `dev` without force, and confirm local HEAD equals `origin/dev`.
