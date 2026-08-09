# Trip Progression Reconciliation Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task.

**Goal:** Make next-stop selection and today auto-skip reconciliation one pure decision followed by at most one progress save and one Toast.

**Architecture:** Add `trip-progression.js` as an ES5 UMD pure module. `index.html` remains the adapter for progress/check storage, clocks, renderer and notification.

**Tech Stack:** ES5 UMD JavaScript, Node `assert`, Playwright Chromium, Service Worker App Shell.

## Constraints and seams

- Approved seam: `TripProgression.reconcile(input)` plus the existing `pickNextStop()` production wrapper and browser consumers.
- Preserve progress/check data format, keys, cluster semantics, undo, markup, copy and v98.

### Task 1: Freeze legacy selection outcomes

**Files:** modify `tests/pick-next-stop.test.js`.

- [ ] Add characterization for literal pick/source, multiple stale item ordering, cluster controller cutoff, today/non-today behavior, checked exclusion and existing notification text.
- [ ] Instrument the current sandbox to prove the legacy path can write more than once without encoding that defect as the target contract.
- [ ] Run `node tests/pick-next-stop.test.js` and record the green baseline.

### Task 2: TDD the pure reconciliation interface

**Files:** create `tests/trip-progression.test.js`; create `trip-progression.js`.

- [ ] Add a RED require/default-input test; create minimal UMD export with stable empty result.
- [ ] Add one RED→GREEN tracer for order/time selection without reconciliation.
- [ ] Add RED→GREEN tests for multiple stale items producing one immutable next progress, `changed:true`, ordered `skipped`, one literal notification and `time-stale` pick.
- [ ] Add RED→GREEN cases for cluster blocking, checked/skipped/autoSkip exclusion, non-today no-write signal, invalid time, input immutability and deterministic labels.
- [ ] Run `node tests/trip-progression.test.js` after each slice.

### Task 3: Wire one-commit production adapter

**Files:** modify `tests/pick-next-stop.test.js`; modify `index.html`; modify `sw.js`; modify `tests/pwa-shell.test.js`.

- [ ] Add RED wiring tests requiring `TripProgression.reconcile`, one `saveNextStopProgress` call when changed and one Toast, with no `autoSkipStaleItem` call from the wrapper.
- [ ] Load `trip-progression.js` before inline App code and add it to SW `SHELL` without changing version/lifecycle/cache strategy.
- [ ] Rewrite `pickNextStop()` as the compatibility adapter: build input, reconcile, persist once, toast once, return `outcome.pick`.
- [ ] Remove `autoSkipStaleItem` only after all callers/tests use the new path.
- [ ] Run module, next-stop, PWA shell, `home-simplification.test.js`, `render-note.test.js` and `tests/browser/today-live-info.spec.js`.

### Task 4: Test replacement and commit

**Files:** modify `tests/pick-next-stop.test.js`; modify `tests/README.md`.

- [ ] Remove the 20-function VM dependency web after public module coverage replaces it; retain wrapper/storage characterization only.
- [ ] Run `git diff --check` and version audit; commit `refactor(trip): reconcile next-stop progress once`.
