# TripPilot UI/UX v112 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved TripPilot UI/UX improvements as an immutable v112 PWA generation with Android Chromium evidence.

**Architecture:** Keep `shell/v112/index.html` as the existing DOM adapter and add only narrow pure helpers for navigation mode, destination presentation, and identity gating. Reuse all existing runtime modules, data contracts, visual tokens, and Service Worker lifecycle; the generation path and version-bearing assets advance together.

**Tech Stack:** Vanilla ES5 JavaScript, HTML/CSS, Node assertion tests, Playwright Chromium/WebKit, Service Worker Cache Storage.

**Spec:** `docs/superpowers/specs/2026-09-07-trip-pilot-ui-ux-v112-design.md`

## Global Constraints

- Current generation is `v112`; root `index.html` and root `app-version.js` remain byte-identical v110 bridge assets.
- No Schema, Google Sheet, Ledger repository, sync, settlement, theme architecture, or framework change.
- `shell/v112/builtin-snapshot.js` is generated only through `tools/refresh-builtin-snapshot.js --write`.
- All navigation, identity, UI, PWA, offline and Android acceptance checks must report zero page errors.

---

### Task 1: Characterize the approved UI behavior

**Files:**
- Create: `tests/ui-ux-v112.test.js`
- Modify: `tests/navigation-location.test.js`
- Modify: `tests/registered-member-identity.test.js`
- Test: the same three files

**Interfaces:**
- Consumes: current `navigationDirectionsUrl`, `renderTripNavigationLink`, Trip card renderer, `renderPreTripBrief`, `switchView`, and empty-state renderers.
- Produces: executable contracts for `navigationTravelMode(item)`, `navigationCountrySuffix(intent,item)`, `tripItemPresentation(item,resolution)`, deferred identity gating, compact pre-trip previews, and empty-state CTAs.

- [x] Write assertions that fail against v111 for walking navigation, Taiwan destinations, destination-first cards, deferred startup identity, Ledger-entry gating, 13px critical metadata, empty-state CTAs, and compact pre-trip output.
- [x] Run `node tests/ui-ux-v112.test.js`, `node tests/navigation-location.test.js`, and `node tests/registered-member-identity.test.js`; confirm the new assertions fail for the intended missing behavior.

### Task 2: Create immutable v112 and implement navigation/presentation helpers

**Files:**
- Create from current generation: `shell/v112/index.html`
- Create: `shell/v112/app-version.js`
- Generated create: `shell/v112/builtin-snapshot.js`
- Modify: `shell/v112/index.html`

**Interfaces:**
- Produces: `navigationTravelMode(item)` returning `walking|driving|transit`; `navigationDirectionsUrl(intent,origin,item)`; `tripItemPresentation(item,resolution)` returning `{title,meta}`.
- Preserves: `navigationIntent`, geolocation fallback, exact Place/Restaurant authority, and existing card actions.

- [x] Copy v111 to v112, update immutable script paths and release identity, and run the snapshot generator to create the version-bound BUILTIN asset.
- [x] Implement item-local travel mode with global fallback and Taiwan/Japan country qualification without changing source data.
- [x] Render resolved destination as the card title and time/activity as metadata with fallback for unresolved items.
- [x] Run the focused Node tests and confirm they pass.

### Task 3: Implement deferred identity, empty states, typography, and pre-trip simplification

**Files:**
- Modify: `shell/v112/index.html`
- Test: `tests/ui-ux-v112.test.js`
- Test: `tests/registered-member-identity.test.js`

**Interfaces:**
- Produces: `ensureLedgerMember()` for entering the Ledger view and identity-dependent actions; destination-first `preTripDestinationHighlights(day,limit)`.
- Preserves: existing member confirmation, registration records, Settings switching, Shopping and Ledger storage semantics.

- [x] Remove only the forced selector from startup and guard Ledger entry/actions through the existing selector.
- [x] Add central primary actions to empty Shopping and Ledger states, suppressing empty-only management noise.
- [x] Raise critical shopping metadata to at least 13px while retaining semantic color tokens.
- [x] Replace four-line Day 1 preview with two destination-first rows plus remaining-stop count, and make day summaries destination-first.
- [x] Run focused Node tests and inspect the CSS/markup contracts.

### Task 4: Advance PWA generation registration and verify Android Chromium behavior

**Files:**
- Modify: `sw.js`
- Modify: `runtime-assets.json`
- Modify: `netlify.toml`
- Modify: `.ai-manifest.json`
- Modify: version-aware tests under `tests/`
- Create: `tests/browser/android-pwa-ui.spec.js`

**Interfaces:**
- Consumes: v112 immutable document/app/snapshot trio.
- Produces: coherent `okayama-trip-v112` cache generation and Android-equivalent browser evidence.

- [x] Update current-generation registrations from v111 to v112 while retaining root v110 bridge hashes.
- [x] Update version-aware tests and add a Chromium touch/mobile viewport spec covering installability inputs, four-tab navigation, deferred identity, empty states, and no overflow/pageerror.
- [x] Run version, PWA, runtime-asset, BUILTIN, navigation, UI and Android focused tests.
- [x] Run offline builtin, online sync-shell, and travel-date Playwright scenarios with zero page errors.

### Task 5: Documentation and final health gate

**Files:**
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `README.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Produces: v112 handover, release notes, rollback instructions, and verified/remaining evidence split.

- [x] Document the UI scope, v112 generation, Android evidence, unchanged contracts, and forward-bump rollback.
- [x] Run validator/version/runtime/JSON/diff checks, full Node suite, full Playwright suite, and `window.healthCheck()` in the required scenarios.
- [x] Review visual hierarchy at 390×844 in two passes: hierarchy/readability first, then spacing/overflow/touch targets.
- [x] Report verified results separately from the remaining Android real-device install check.
