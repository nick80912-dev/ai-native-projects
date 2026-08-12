# Today Hero Shopping Item Preview v104 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the first prioritized Shopping item after the stop name in the active-trip Today Hero, with a compact remaining-item count, and release the change as App Shell v104.

**Architecture:** Keep `buildShoppingTodayReminder()` as the single source of stable item priority and extend only `todayShoppingHeroModel()` with `firstItemName` and `remainingCount`. Render the compact one-line summary from that model, preserve the existing stop selection/click/fallback contracts, and constrain the location and item text with flexbox ellipsis. No schema, store, Ledger, Apps Script, or deployment configuration changes are permitted.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node assertion tests, Playwright, Service Worker App Shell versioning.

## Global Constraints

- Single item visual copy: `地點 · 品名`.
- Multiple item visual copy: `地點 · 第一個品名 +N`, where `N = group.items.length - 1`.
- The first item must come from the existing `prioritizeShoppingGroupItems()` order; do not add another ranking rule or mutate inputs.
- Empty item names degrade to the stop name without a dangling separator or count.
- Preserve `順路採買` / `今日採買`, exact-next-stop exclusion, focused Shopping overlay navigation, generic fallback, 44px target, and keyboard focus.
- Keep the value on one line with ellipsis at 320, 375, and 390 CSS pixels; location remains visually primary and item text secondary.
- Accessible names must include the stop, first item when present, and total pending count.
- Update `app-version.js` and `sw.js` together from `v103` to `v104`; do not change `netlify.toml`.

---

### Task 1: Extend the Hero projection and renderer

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/render-note.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `buildShoppingTodayReminder(items, day, excludedStopRef)` groups whose `items` are already prioritized trimmed item names.
- Produces: `todayShoppingHeroModel(...) -> {label, stopRef, stopName, count, firstItemName, remainingCount}` and the matching escaped Hero button markup.

- [ ] **Step 1: Write failing model tests**

Update the existing `todayShoppingHeroModel()` assertions to require `firstItemName` and `remainingCount`, add an empty-name fallback case, and preserve the immutability assertion.

- [ ] **Step 2: Run the model test and verify RED**

Run: `node tests/shopping-list.test.js`

Expected: FAIL because the current model does not expose `firstItemName` or `remainingCount`.

- [ ] **Step 3: Implement the minimal projection**

Return the first trimmed group item and `Math.max(group.items.length - 1, 0)`, setting the remaining count to zero when the first name is empty.

- [ ] **Step 4: Run the model test and verify GREEN**

Run: `node tests/shopping-list.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing renderer tests**

Require `Future stop · one +2`, remove the old `3 項 →` visual assertion, require an accessible name containing the stop, item, and total count, and cover HTML/attribute escaping for both stop and item names.

- [ ] **Step 6: Run renderer tests and verify RED**

Run: `node tests/render-note.test.js && node tests/shopping-list.test.js`

Expected: FAIL because the renderer still emits only the stop and `N 項 →`.

- [ ] **Step 7: Implement the minimal renderer**

Render separate stop, separator, item, and optional `+N` spans; omit item/separator/count when `firstItemName` is empty. Build the accessible label from the escaped model values while preserving the existing click target and generic fallback.

- [ ] **Step 8: Run focused Node tests and verify GREEN**

Run: `node tests/shopping-list.test.js && node tests/render-note.test.js && node tests/home-simplification.test.js`

Expected: PASS.

- [ ] **Step 9: Commit the behavior slice**

Run: `git add index.html tests/shopping-list.test.js tests/render-note.test.js && git commit -m "feat(today): show shopping item in Hero"`

### Task 2: Lock responsive and accessible browser behavior

**Files:**
- Modify: `tests/browser/today-live-info.spec.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: the spans emitted by Task 1.
- Produces: a single-line, overflow-safe Hero Shopping value at 320/375/390px with preserved focus and activation.

- [ ] **Step 1: Write failing Playwright assertions**

Extend the existing Hero Shopping test to assert the displayed first item and `+2`, then seed a deliberately long stop and item in the 320/375/390 test and assert: no horizontal document overflow, one-line value, and ellipsis-capable stop/item boxes.

- [ ] **Step 2: Run the focused browser spec and verify RED**

Run: `npx playwright test tests/browser/today-live-info.spec.js`

Expected: FAIL because the item span and responsive allocation do not exist.

- [ ] **Step 3: Implement minimal CSS**

Keep `.today-hero-summary-value` nowrap, make stop and item spans shrinkable with ellipsis, keep the separator/count non-shrinking, and give the item secondary opacity/color without changing the 44px button or focus rule.

- [ ] **Step 4: Run focused browser and Node regression tests**

Run: `npx playwright test tests/browser/today-live-info.spec.js && node tests/home-simplification.test.js && node tests/render-note.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the responsive slice**

Run: `git add index.html tests/browser/today-live-info.spec.js && git commit -m "test(today): lock Hero shopping preview layout"`

### Task 3: Release v104 and run the full gate

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: completed Hero behavior and responsive verification.
- Produces: synchronized App/SW version `v104` and current delivery documentation.

- [ ] **Step 1: Update version and release documentation**

Set `APP_VERSION` and `SW_VERSION` to `v104`. Add a v104 changelog entry describing the new copy, unchanged data contracts, and verification evidence; update `tasks/current.md` from v103 to v104 without changing production/main status.

- [ ] **Step 2: Run version and document checks**

Run: `node tools/check-app-version.js && node tests/pwa-shell.test.js && node tools/check-doc-titles.js && node tools/check-runtime-assets.js && node tests/builtin-snapshot-refresh.test.js`

Expected: PASS with App/SW both v104 and no runtime/built-in drift.

- [ ] **Step 3: Run every Node test file**

Run each top-level `tests/*.test.js` with Node and require zero failures.

- [ ] **Step 4: Run the complete Playwright suite**

Run: `npx playwright test`

Expected: all cases pass with zero failures.

- [ ] **Step 5: Run final static checks**

Run: `node -e "JSON.parse(require('fs').readFileSync('manifest.webmanifest','utf8')); console.log('manifest JSON valid')"` and `git diff --check`.

Expected: valid manifest and no whitespace errors.

- [ ] **Step 6: Commit the release evidence**

Run: `git add app-version.js sw.js 07_CHANGELOG.md tasks/current.md docs/superpowers/plans/2026-08-12-today-hero-shopping-item-preview-v104.md && git commit -m "docs: release Today Hero shopping preview v104"`

- [ ] **Step 7: Push the approved dev branch**

Run: `git push origin dev`

Expected: `origin/dev` advances to the verified v104 release commit. Do not merge `main`, deploy production, or create a production tag.
