# Runtime JavaScript Asset Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task.

**Goal:** Make external JavaScript runtime inventory mechanically consistent across page loading, offline shell and repository navigation docs.

**Architecture:** A static `runtime-assets.json` is read only by a pure Node validator/CLI. It is not a browser manifest, generator, bundler or Service Worker dependency.

**Tech Stack:** JSON, Node built-ins, static HTML/Service Worker source checks.

## Constraints and seam

- Approved seam: `validateRuntimeAssets({rootDir, inventory})` and CLI exit/output.
- Exact inventory: `app-version.js`, `shopping-photo-store.js`, `buy-to-ledger.js`, `ledger-ui-state.js`, `shopping-ui-state.js`, `trip-progression.js`, `schema.js`, `validator.js`.
- No runtime loading/order/lifecycle/cache/version behavior change.

### Task 1: TDD validator behavior

**Files:** create `tests/runtime-assets.test.js`; create `tools/check-runtime-assets.js`.

- [ ] Add RED test requiring the module and validating an in-memory/temp fixture happy path.
- [ ] Implement the minimal pure result `{ok,errors,assets}` and CLI wrapper.
- [ ] Add RED→GREEN cases for malformed/duplicate/non-JS inventory, missing physical file, index script, SW SHELL, README, manifest `files` and `deploy_files` coverage.
- [ ] Make errors deterministic and CLI exit 1 on failure; keep validator read-only.

### Task 2: Add the canonical repository inventory

**Files:** create `runtime-assets.json`; modify `index.html`, `sw.js`, `README.md`, `.ai-manifest.json` only if an approved module is not already represented.

- [ ] Add the exact eight-module array in execution/documentation order.
- [ ] Add `trip-progression.js` entries established by candidate 2; do not reorder unrelated scripts or SHELL assets.
- [ ] Ensure manifest `files` and `deploy_files` describe each runtime module without changing status/version snapshots.
- [ ] Run `node tests/runtime-assets.test.js` and `node tools/check-runtime-assets.js`.

### Task 3: Reconcile overlapping PWA assertions

**Files:** modify `tests/pwa-shell.test.js`; modify `tests/README.md`.

- [ ] Remove only exact per-JS inventory assertions now owned by the validator; retain root, manifest, icons, images, version equality, install/fetch/lifecycle tests.
- [ ] Document both direct commands and scope boundary.
- [ ] Run runtime-assets and PWA shell tests together.

### Task 4: Commit and final integration gate

- [ ] Run every `tests/*.test.js` Node file, then full Playwright suite.
- [ ] Run `node tools/check-app-version.js`, `node tools/check-runtime-assets.js`, `git diff --check`, `git status` and inspect version files for unchanged v98.
- [ ] Commit `build(governance): validate runtime asset inventory`.
