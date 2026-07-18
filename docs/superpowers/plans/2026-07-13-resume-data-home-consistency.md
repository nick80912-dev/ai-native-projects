# Resume, Data, and Home Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one Dev batch that preserves the approved iOS Scroll-only policy, repairs foreground-resume layout state, detects itinerary/reference name mismatches, and makes the home next-stop marker and notes match the itinerary renderer.

**Architecture:** Keep `index.html` as the App source and add only focused helpers: a lifecycle reset beside the existing viewport recovery, a semantic health-check beside existing reference checks, and shared home rendering through the existing `now-badge` and `renderNote()` components. Do not change Schema, CSV parsing, sync ownership, personal state, or permanent viewport accessibility settings. Bump the App Shell cache once after all behavior is green.

**Tech Stack:** Vanilla ES5 JavaScript, HTML/CSS, Node built-in `assert`, Google Sheets published CSV, Service Worker.

## Global Constraints

- Work on `dev`; preserve the five approved unpushed Scroll-only commits and push the combined history only after full verification.
- Keep `html,body{touch-action:pan-x pan-y}` and do not restore `setupPinchZoom()` or `setupDoubleTapGuard()`.
- Do not persist `maximum-scale` or `user-scalable=no` in viewport metadata.
- Do not change Google Sheet Schema, `schema.js`, CSV parsing, or localStorage state.
- Preserve current scroll position during foreground recovery; do not reload the App.
- Sheet source must show Musashi referencing `R012` before delivery.

---

### Task 1: Semantic itinerary/reference health check

**Files:**
- Modify: `validator.js` health-check source
- Modify: `index.html` embedded validator copy
- Test: `tests/data-reference-consistency.test.js`

**Interfaces:**
- Consumes: `DB.trip.days[].items`, `DB.rest`, normalized display names.
- Produces: a `healthCheck()` Data Error when an `R###` reference resolves to a restaurant whose normalized name conflicts with the itinerary place text.

- [x] **Step 1: Write the failing test**

Create a Node assertion that exercises a Musashi itinerary item referencing `R013`, expects a name-mismatch finding, then changes it to `R012` and expects no mismatch.

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/data-reference-consistency.test.js`

Expected: FAIL because semantic RID/name validation is absent.

- [x] **Step 3: Write minimal implementation**

Add one reusable normalized-name comparison and one health-check branch. Continue rendering by explicit RID; do not silently replace source IDs.

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/data-reference-consistency.test.js`

Expected: `data reference consistency tests passed`.

### Task 2: iOS foreground viewport recovery

**Files:**
- Modify: `index.html` viewport recovery section
- Test: `tests/ios-viewport-resume.test.js`
- Test: `tests/ios-zoom-guard.test.js`

**Interfaces:**
- Consumes: `VIEWPORT_META`, `VIEWPORT_ORIGINAL`, `.wrap`, `window.scrollX/Y`, `requestAnimationFrame`.
- Produces: `recoverViewportAfterResume(...)` and lifecycle wiring for `visibilitychange` plus `pageshow`.

- [x] **Step 1: Write the failing tests**

Assert that recovery restores the exact original viewport string, clears legacy inline transform/transition plus `pinch-zooming`, preserves both scroll coordinates, schedules a two-frame reflow, and is wired only for foreground/pageshow events.

- [x] **Step 2: Run tests to verify they fail**

Run: `node tests/ios-viewport-resume.test.js`

Expected: FAIL because resume recovery is absent.

- [x] **Step 3: Write minimal implementation**

Extend `setupViewportReflow()` with one idempotent recovery helper. Do not reload, rerender, hard-lock viewport, or restore custom zoom handlers.

- [x] **Step 4: Run focused tests to verify they pass**

Run: `node tests/ios-viewport-resume.test.js; node tests/ios-zoom-guard.test.js`

Expected: both scripts pass.

### Task 3: Shared home marker and note renderer

**Files:**
- Modify: `index.html` next-stop CSS/renderer
- Test: `tests/render-note.test.js`

**Interfaces:**
- Consumes: existing `.now-badge`, `renderNote(text)`, `pick.source`, `meta.note`.
- Produces: a home `現在` badge matching itinerary cards and a list-style reminder block preserving bullets, links, phone and order highlights.

- [x] **Step 1: Write the failing assertions**

Require the time-selected home card to contain `now-badge` with `現在`, exclude `依目前時間`, and render the P012 multiline note as `note-list`/`note-li` entries.

- [x] **Step 2: Run test to verify it fails**

Run: `node tests/render-note.test.js`

Expected: FAIL on the old home tag and inline reminder rendering.

- [x] **Step 3: Write minimal implementation**

Reuse `.now-badge` and `renderNote()` in `renderNextStopCard`; add only scoped `nx-` CSS needed for alignment.

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/render-note.test.js`

Expected: `renderNote tests passed`.

### Task 4: Publish metadata, documentation, and verification

**Files:**
- Modify: `index.html` APP/SW diagnostic strings
- Modify: `sw.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: this plan

**Interfaces:**
- Consumes: the functional commit short hash and completed behavior.
- Produces: explicit Dev APP CODE, `okayama-trip-v7`, updated operating rules, and reproducible delivery evidence.

- [x] **Step 1: Commit functional changes**

Stage the three focused tests, `validator.js`, and `index.html`, then commit with a message describing the consistency and resume fixes.

- [x] **Step 2: Publish the functional code identity**

Set `APP_BUILD.code` to the functional commit short hash, bump `sw.js` and diagnostics/tests to `okayama-trip-v7`, and update the dated changelog plus UI guideline.

- [x] **Step 3: Run repository-wide verification**

Run every `tests/*.test.js`, `node tools/check-doc-titles.js`, syntax extraction/checks, embedded-vs-external schema/validator consistency checks, and a live published-CSV assertion for Musashi=`R012`.

- [x] **Step 4: Commit publication metadata and docs**

Commit only after Step 3 exits cleanly.

- [x] **Step 5: Push and verify remote**

Push `dev` to `origin/dev`, confirm local and remote hashes match, then inspect GitHub Actions. Do not touch `main` or create a release PR.

Result: local and `origin/dev` matched after push. No Actions run was created because the current workflow listens to `main` pushes and pull requests, not `dev` pushes; workflow scope was not expanded in this task.
