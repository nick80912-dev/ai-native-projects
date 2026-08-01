# Ledger Participant Selection Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make selected ledger participant buttons visibly different from their container with `#d6e8e4` and deep text.

**Architecture:** Keep the change local to `.ledger-participant-choice.on`; do not repair the undefined global `--mint` token because that would alter unrelated surfaces. Advance the App Shell cache to v70 so installed PWAs can identify and receive the validation fix.

**Tech Stack:** Static HTML/CSS, Node.js `assert` tests, Service Worker App Shell cache.

## Global Constraints

- Selected background is exactly `#d6e8e4`.
- Selected text remains `var(--sea-deep)`.
- Only participant selection presentation changes; participant data and correction/void behavior stay unchanged.
- Preserve unrelated working-tree changes.

---

### Task 1: Lock and implement participant selection contrast

**Files:**
- Modify: `tests/ledger-entry-p0.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `.ledger-participant-choice.on`
- Produces: selected participant background `#d6e8e4` with `var(--sea-deep)` text

- [x] **Step 1: Write the failing test**

Add:

```js
assert.match(
  html,
  /\.ledger-participant-choice\.on\{[^}]*background:#d6e8e4[^}]*color:var\(--sea-deep\)/,
  'selected participant choices use a distinct medium teal background with deep text'
);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/ledger-entry-p0.test.js`

Expected: FAIL because the selector still uses the undefined `var(--mint)`.

- [x] **Step 3: Write minimal implementation**

Change only:

```css
.ledger-participant-choice.on{border-color:var(--sea-deep);background:#d6e8e4;color:var(--sea-deep)}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/ledger-entry-p0.test.js`

Expected: PASS.

### Task 2: Advance the PWA shell and record the validation fix

**Files:**
- Modify: `sw.js`
- Modify: `tests/*.test.js` files that assert the active cache version
- Modify: `.ai-manifest.json`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: current cache `okayama-trip-v69`
- Produces: cache `okayama-trip-v70` and matching status documentation

- [x] **Step 1: Update cache version contracts and implementation**

Replace active-version assertions and `CACHE_NAME` from `okayama-trip-v69` to `okayama-trip-v70`.

- [x] **Step 2: Record exact scope**

Add a v70 changelog/current entry stating that only participant selection presentation and its test changed; correction/void behavior is unchanged.

- [x] **Step 3: Run focused version tests**

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
node tests/ledger-221-ui.test.js
node tests/ledger-225.test.js
node tests/ledger-mobile-hotfix.test.js
node tests/ledger-member-visibility.test.js
node tests/ledger-ui-polish.test.js
node tests/shopping-ledger-links.test.js
```

Expected: all commands exit 0.

### Task 3: Verify the complete batch

**Files:**
- Verify: all modified files

**Interfaces:**
- Consumes: Tasks 1–2
- Produces: fresh verification evidence

- [x] **Step 1: Run all Node tests**

Run the same `tests/*.test.js` loop as `.github/workflows/qa.yml`.

Expected: every test file exits 0.

- [x] **Step 2: Run document and diff checks**

Run:

```powershell
node tools/check-doc-titles.js
git diff --check
```

Expected: both commands exit 0.

- [x] **Step 3: Review scope**

Confirm the diff does not alter `saveLedgerCorrection`, participant handlers, ledger schema, Apps Script, or user-owned `tasks/backlog.md` content.
