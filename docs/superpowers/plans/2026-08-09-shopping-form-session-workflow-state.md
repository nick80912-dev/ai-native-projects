# Shopping Form Session Workflow／State Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task.

**Goal:** Deepen `shopping-ui-state.js` so production form/session/photo lifecycle uses one session-guarded state/effect seam without changing Shopping persistence, domain, renderer or UI.

**Architecture:** Extend the current immutable UMD state and recording-adapter workflow. Opaque forms and session metadata live in the module; all DOM/store/photo work remains injected effects in `index.html`.

**Tech Stack:** ES5 UMD JavaScript, Node `assert`, VM characterization harness, Playwright Chromium.

## Constraints and seams

- Test seams approved by Bar: `TripShoppingUiState.transition/createWorkflow`, existing public form handlers, real browser Shopping Sheet/photo flow.
- Work directly on `dev`; no version bump, schema/storage/renderer/domain change, merge or deploy.
- Red before green; one public behavior per cycle. Remove source extraction only after equivalent public seam coverage exists.

### Task 1: Characterize current form lifecycle

**Files:** modify `tests/shopping-list.test.js`; create `tests/shopping-form-session-characterization.test.js`; modify `tests/browser/shopping-photo.spec.js`.

- [ ] Add legacy-passing characterization for add/edit open, cancel, list/card/detail return, validation/store failure, save-another reset/focus and pending close guard.
- [ ] Add a controlled deferred photo put case proving a completion from a closed/replaced form cannot change the active form.
- [ ] Run `node tests/shopping-list.test.js`, `node tests/shopping-form-session-characterization.test.js`, and the focused Playwright file; record the green baseline.

### Task 2: TDD owned state and lifecycle transitions

**Files:** modify `tests/shopping-ui-state.test.js`; modify `shopping-ui-state.js`.

- [ ] Add RED tests for `createState()` normalization of `form`, `formSession`, `photoError`, session/request IDs and immutable temporary photo IDs; implement minimum normalization.
- [ ] Add RED→GREEN cycles for `open-form`, `replace-form`, `close-form`, pending request/failure/success and save-another literal next state/effects.
- [ ] Add RED→GREEN cycles for photo requested/succeeded/failed and remove-photo, including stale session/request unchanged outcomes.
- [ ] Add recording-adapter tests proving state commit precedes each ordered effect; add only the effect mapping required by passing actions.
- [ ] Run `node tests/shopping-ui-state.test.js` after every slice.

### Task 3: Migrate production wiring

**Files:** modify `tests/shopping-ui-state-wiring.test.js`; modify `index.html`.

- [ ] Add RED wiring assertions that adapter projects all six owned fields and provides form effects, while repository/store/domain/renderer stay outside the module.
- [ ] Add runtime session/request ID helpers and extend the production adapter read/write projection.
- [ ] Route `openShoppingForm`, `cancelShoppingForm`, form replacement/removal, save requested/failed/succeeded/save-another and photo completion through workflow actions.
- [ ] Preserve the existing synchronous focus call as an ordered effect and use session/request guard instead of object identity for async photo completion.
- [ ] Delete migrated direct assignments and the obsolete compatibility pending helper only when no caller remains.
- [ ] Run the three Shopping Node tests and `node tests/shopping-ui-state-wiring.test.js`.

### Task 4: Replace obsolete tests and verify the slice

**Files:** modify `tests/shopping-list.test.js`, `tests/README.md` and focused browser specs as needed.

- [ ] Remove only VM/substr assertions whose behavior is now covered through the formal interface; keep store/domain/DOM boundary tests.
- [ ] Run `node tests/shopping-list.test.js`, `node tests/shopping-ui-state.test.js`, `node tests/shopping-ui-state-characterization.test.js`, `node tests/shopping-ui-state-wiring.test.js` and focused Shopping Playwright specs.
- [ ] Run `git diff --check`, confirm `app-version.js`/`sw.js` version strings unchanged, and commit `refactor(shopping): own form session workflow state`.
