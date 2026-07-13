# iOS Zoom Guard Stage One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a `dev` build that prevents iOS form-focus auto zoom, conditionally restores focus-caused residual zoom, and enables CSS-native double-tap suppression while retaining the existing JavaScript guard for phone validation.

**Architecture:** Keep `index.html` as the single App source. Add a CSS 16px floor, extend the existing viewport reflow setup with isolated focus/gesture state, and bump only the Service Worker cache identifier. Use Node regression tests to exercise extracted production functions and static invariants before phone validation.

**Tech Stack:** Vanilla ES5 JavaScript, CSS, Node built-in `assert`/`vm`, Service Worker, Markdown governance files.

## Global Constraints

- Work only on `dev`; never push or merge `main`.
- Do not change Schema, Google Sheets, Validator, render architecture, or ADRs.
- Do not add dependencies, build tooling, AbortController, persistent `maximum-scale`, or `user-scalable=no`.
- Keep `setupDoubleTapGuard()` in stage one.
- Follow test-first red/green cycles and update `07_CHANGELOG.md`.

---

### Task 1: Form font floor

**Files:**
- Modify: `index.html`
- Create: `tests/ios-zoom-guard.test.js`

**Interfaces:**
- Consumes: existing CSS selectors in `index.html`
- Produces: effective form-control declarations of at least 16px

- [ ] Write a Node test that extracts the style block and asserts the global `input,select,textarea` rule exists and known form selectors contain no font size below 16px.
- [ ] Run `node tests/ios-zoom-guard.test.js`; expect failure because existing rules are 14px/15px and the global floor is absent.
- [ ] Add `input,select,textarea{font-size:16px}` and raise `.inline-add input`, `.field input,.field select`, `.shop-search input`, and diagnostic form input rules to 16px.
- [ ] Rerun the test; expect PASS.

### Task 2: Conditional viewport restoration

**Files:**
- Modify: `index.html`
- Modify: `tests/ios-zoom-guard.test.js`

**Interfaces:**
- Consumes: viewport meta, existing `setupViewportReflow()`, `window.visualViewport`
- Produces: `VIEWPORT_ORIGINAL`, `isFormControl(el)`, `restoreFocusZoom(meta, original, viewport, gesture, timers)` and event wiring inside `setupViewportReflow()`

- [ ] Extend the test to extract the new helpers and assert: form focus with scale > 1 temporarily adds `maximum-scale=1`; the timer restores the exact original string; gesture-origin zoom does nothing; missing `visualViewport` does nothing.
- [ ] Run the focused test; expect failure because helpers do not exist.
- [ ] Add `VIEWPORT_ORIGINAL` from the existing meta content and minimal ES5 helpers. Extend the existing setup handler with `focusin`, multi-touch/gesture tracking, and `focusout`; do not create a second focusout handler.
- [ ] Rerun the focused test; expect PASS.

### Task 3: Stage-one gesture and cache rules

**Files:**
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `tests/ios-zoom-guard.test.js`

**Interfaces:**
- Produces: `html{touch-action:manipulation}`, retained `setupDoubleTapGuard()`, cache `okayama-trip-v4`

- [ ] Extend the test to require the CSS rule, retained JS guard, absence of persistent viewport restrictions, and SW v4.
- [ ] Run the test; expect failure on missing CSS/cache changes.
- [ ] Add the CSS rule and change only `CACHE_NAME` from v3 to v4.
- [ ] Rerun the focused test; expect PASS.

### Task 4: Governance and full verification

**Files:**
- Modify: `04_UI_GUIDELINES.md`
- Modify: `.ai-manifest.json`
- Modify: `07_CHANGELOG.md`

- [ ] Document the 16px form minimum, gesture policy, transient viewport lock, and stage-one validation status.
- [ ] Add the viewport accessibility invariant to the manifest and a stage-one changelog entry.
- [ ] Run `node tools/check-doc-titles.js`; expect PASS.
- [ ] Run every `tests/*.test.js`; expect all PASS.
- [ ] Run `git diff --check`; expect no errors.
- [ ] Inspect the complete diff, confirm only approved files changed, commit intentionally, and push `dev` to `origin/dev`.
- [ ] Report automated evidence separately from iPhone-only checks; do not claim the phone checklist passed.
