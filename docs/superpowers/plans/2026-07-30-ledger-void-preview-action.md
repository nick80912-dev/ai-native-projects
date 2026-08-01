# Ledger Void Preview Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicate “重新預覽作廢” action after a whole-receipt void preview while retaining the single final confirmation.

**Architecture:** Keep all correction and append-only event logic unchanged. Adjust only the entry-sheet render condition so the secondary void button exists before preview and is omitted after a void preview; advance the App Shell cache to v71 and document the batch.

**Tech Stack:** Static HTML/JavaScript, Node.js `assert` tests, Service Worker App Shell cache.

## Global Constraints

- Before preview, retain “整張收據作廢”.
- After a void preview, retain only the primary “確認整張作廢”.
- Do not modify correction submission, signatures, canonical conflict checks, permissions, or stored events.
- Preserve unrelated working-tree changes.

---

### Task 1: Lock the two-stage void action

**Files:**
- Modify: `tests/ledger-list-actions.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `ledgerUiState.correction.previewKind`
- Produces: one final void action after preview

- [x] **Step 1: Write the failing test**

Assert that `renderLedgerEntrySheet` omits the secondary button when `correctionKind === 'void' && correction.preview`, contains no “重新預覽作廢”, and retains both valid stage labels.

- [x] **Step 2: Run the target test and verify the expected failure**

Run: `node tests/ledger-list-actions.test.js`

- [x] **Step 3: Write the minimal implementation**

Render `voidButton` only while a correction is active and a void preview is not already present.

- [x] **Step 4: Run the target test and verify it passes**

Run: `node tests/ledger-list-actions.test.js`

### Task 2: Advance the PWA shell and record SW v71

**Files:**
- Modify: `sw.js`
- Modify: cache-version assertions under `tests/`
- Modify: `.ai-manifest.json`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: active cache `okayama-trip-v70`
- Produces: active cache `okayama-trip-v71` and matching status documentation

- [x] **Step 1: Update cache version contracts and implementation**

Replace active cache assertions and `CACHE_NAME` from v70 to v71.

- [x] **Step 2: Record exact scope**

Document that SW v71 removes only the duplicate post-preview button and does not alter append-only correction semantics.

- [x] **Step 3: Run focused version tests**

Run the cache-version test files that assert the active App Shell.

### Task 3: Verify the complete batch

**Files:**
- Verify: all modified files

**Interfaces:**
- Consumes: Tasks 1–2
- Produces: fresh verification evidence

- [x] **Step 1: Run all Node tests**

Run the same `tests/*.test.js` loop as `.github/workflows/qa.yml`.

- [x] **Step 2: Run document and structural checks**

Run `node tools/check-doc-titles.js`, parse `.ai-manifest.json`, and run `git diff --check`.

- [x] **Step 3: Review scope**

Confirm the diff does not modify `saveLedgerCorrection`, correction event persistence, schema, permissions, or user-owned backlog/theme files.
