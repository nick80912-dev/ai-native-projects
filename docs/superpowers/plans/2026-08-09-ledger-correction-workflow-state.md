# Ledger Correction Workflow／State Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development task-by-task.

**Goal:** Route correction Sheet lifecycle through the existing Ledger UI workflow with session/request guards while preserving append-only correction domain behavior.

**Architecture:** Deepen `ledger-ui-state.js`; correction/draft/preview stay opaque and domain/repository work remains in `index.html`. No second correction module.

**Tech Stack:** ES5 UMD JavaScript, Node `assert`, Playwright Chromium.

## Constraints and seams

- Approved seams: `TripLedgerUiState.transition/createWorkflow`, public correction handlers, real correction Sheet browser lifecycle.
- Do not change correction eligibility, preview/domain builders, batch format, repository, settlement, Apps Script, schema, copy, markup or v98.

### Task 1: Characterize compatibility lifecycle

**Files:** create `tests/ledger-correction-ui-characterization.test.js`; modify `tests/browser/ledger-ui-state.spec.js`.

- [ ] Lock open→preview→confirm success, reason validation, entry validation, stale receipt, preview build error, enqueue failure, calendar and pending close behavior.
- [ ] Add deferred/stale completion characterization proving an older correction save cannot close a newer session.
- [ ] Run the new Node/browser tests against legacy behavior before production changes.

### Task 2: TDD correction transitions in the existing module

**Files:** modify `tests/ledger-ui-state.test.js`; modify `ledger-ui-state.js`.

- [ ] Add RED→GREEN `open-correction` and `close-correction` tests with session state and ordered effects.
- [ ] Generalize calendar guards via RED tests so normal entry and correction both require the matching session.
- [ ] Add RED→GREEN reason update, validation failed, preview install and preview invalidate actions using opaque payloads.
- [ ] Add RED→GREEN correction save requested/failed/succeeded tests with request matching, duplicate pending guard and stale completion unchanged.
- [ ] Extend workflow effect mapping only as tests require; prove commit-before-effects with recording adapter.

### Task 3: Migrate correction production wiring

**Files:** modify `tests/ledger-ui-state-wiring.test.js`; modify `index.html`.

- [ ] Add RED wiring assertions for correction actions, session IDs and absence of direct owned-state assignments in migrated handlers.
- [ ] Route open/close/calendar/reason/preview install/invalidate/pending/success/failure through `ledgerUiWorkflow`.
- [ ] Use `createLedgerEntrySessionId()` and `createLedgerEntryRequestId()` for correction; pass domain results as opaque action payloads.
- [ ] Delete `syncLegacyCorrectionSavePending` and direct correction branches after all callers migrate.
- [ ] Keep repository enqueue and all builders in `saveLedgerCorrection`; only ordering/state ownership moves.

### Task 4: Replace legacy locks and verify

**Files:** modify `tests/ledger-ui-state-wiring.test.js`, `tests/ledger-entry-p0.test.js`, `tests/ledger-list-actions.test.js`, `tests/README.md` where fully replaced.

- [ ] Replace correction-only substring expectations with public interface/wiring assertions; retain domain and DOM behavior tests.
- [ ] Run `ledger-ui-state`, correction characterization, settlement correction, list actions, entry P0, quick-entry and focused Playwright tests.
- [ ] Run `git diff --check` and version audit; commit `refactor(ledger): own correction workflow state`.
