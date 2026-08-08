# Ledger Amount Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one safe, reusable amount calculator to every editable Ledger amount field without changing accounting data or persistence.

**Architecture:** Keep one `ledgerCalculatorState` in the existing single-file runtime. A pure tokenizer/evaluator calculates expressions; a target descriptor routes the accepted integer through existing draft update functions. The calculator is a separate bottom sheet so the Ledger form remains mounted, inert, and scroll-stable.

**Tech Stack:** Vanilla ES5-compatible JavaScript in `index.html`, Node `assert`/`vm`, Playwright Chromium, existing CSS tokens and PWA versioning.

## Global Constraints

- Runtime version is v92 because v90/v91 were already reserved; after v92, the SW update-notice acceptance sequence moves forward to v93/v94.
- Do not use `eval()`, `Function()`, a parser dependency, or a build step.
- Do not change Ledger schema, backup payload, `PERSONAL_STATE_VERSION`, accounting calculations, or sync behavior.
- Do not change `netlify.toml`; in `sw.js`, change only `SW_VERSION`.
- Calculator targets are data descriptors, never retained DOM nodes or DOM IDs.
- The existing Ledger entry sheet must remain open and retain all draft content.

---

### Task 1: Pure expression evaluator

**Files:**
- Create: `tests/ledger-calculator.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `evaluateLedgerCalculatorExpression(expression)` returning `{ok,value,error}`.

- [x] **Step 1: Write failing Node tests**

Cover `1200+380+250`, operator precedence, division, divide-by-zero, incomplete syntax, illegal tokens, a fractional result, zero/negative final values, and values above `Number.MAX_SAFE_INTEGER`.

- [x] **Step 2: Run the focused Node test and verify RED**

Run: `node tests/ledger-calculator.test.js`

Expected: failure because the evaluator and state do not exist.

- [x] **Step 3: Implement the tokenizer and precedence evaluator**

Accept digits and the four operators, normalize display operators, evaluate without dynamic code execution, and return explicit errors.

- [x] **Step 4: Run the focused Node test and verify GREEN**

Run: `node tests/ledger-calculator.test.js`

Expected: all parser assertions pass.

### Task 2: Calculator target workflow

**Files:**
- Modify: `tests/ledger-calculator.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `evaluateLedgerCalculatorExpression(expression)`.
- Produces: one `ledgerCalculatorState`; target lookup, open, key input, clear, backspace, cancel, apply, focus restoration, and draft update behavior.

- [x] **Step 1: Add failing workflow tests**

Cover initial value, target descriptors for single/item/discount, single and item updates through existing update functions, discount zero policy, stale item target refusal, cancellation immutability, conversion/multi preview refresh, inert restoration, focus restoration, and sheet scroll preservation.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node tests/ledger-calculator.test.js`

Expected: workflow assertions fail because handlers do not exist.

- [x] **Step 3: Implement minimal calculator state and workflow**

Mount a separate modal bottom sheet, blur the active input, mark `#ledgerEntrySheet` inert, retain `scrollTop`, and apply only after re-resolving the target against the live Ledger draft.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node tests/ledger-calculator.test.js`

Expected: parser and workflow assertions pass.

### Task 3: Ledger field integration and responsive UI

**Files:**
- Modify: `tests/ledger-calculator.test.js`
- Create: `tests/browser/ledger-calculator.spec.js`
- Modify: `index.html`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: calculator workflow handlers.
- Produces: calculator buttons for single amount, each multi-item amount, and discount; calculator SVG and sheet markup.

- [x] **Step 1: Add failing DOM and browser tests**

Assert formal buttons, SVG, aria labels, 44×44px targets, sibling placement, no nested interactive elements, and absence from non-amount fields. In Chromium cover single, multi, discount, cancel, apply, Escape, focus, inert, draft retention, conversion refresh, and 320/375/390px overflow.

- [x] **Step 2: Run focused tests and verify RED**

Run: `node tests/ledger-calculator.test.js`

Run: `npx playwright test tests/browser/ledger-calculator.spec.js`

Expected: missing button/sheet assertions fail.

- [x] **Step 3: Add shared renderer markup and CSS**

Use existing color/radius tokens, a monochrome line SVG, 44px triggers and keys, a four-column keypad, safe-area padding, `aria-modal`, live result/error output, and no backdrop close handler.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the two focused commands above and confirm zero failures.

### Task 4: Version, docs, and full verification

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` (`APP_RELEASE_NOTES`)
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: v92 release metadata with `PERSONAL_STATE_VERSION` unchanged at 9.

- [x] **Step 1: Update v92 metadata and documentation**

Add the calculator release note, roll the existing five-note window, record actual verification counts, preserve the v90/v91 reservation history, move the future two-version sequence to v93/v94, and mark the next review target as v92.

- [x] **Step 2: Run formatting and static checks**

Run: `git diff --check`

Run: `node tools/check-doc-titles.js`

Run: `node tools/check-app-version.js`

- [x] **Step 3: Run all Node tests**

Run every `tests/*.test.js` file and record the actual file count.

- [x] **Step 4: Run all Playwright tests**

Run: `npm run test:browser`

Record the actual pass count and verify no console/page errors in the new coverage.

- [x] **Step 5: Audit scope and commit locally**

Inspect `git diff --stat`, full `git diff`, `git status --short`, `git diff app-version.js sw.js`, and confirm `netlify.toml` plus `PERSONAL_STATE_VERSION` are unchanged. Commit the v92 implementation locally; do not push, deploy, tag, or modify `main`.
