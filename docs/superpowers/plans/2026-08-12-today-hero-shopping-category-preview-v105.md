# Today Hero Shopping Category Preview v105 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v104 product-name preview with the first prioritized Shopping category and release the correction as App Shell v105 on `dev`.

**Architecture:** Preserve `buildShoppingTodayReminder()` as the only stable-priority boundary. Add `firstCategory` beside each group's existing name array, project it through `todayShoppingHeroModel()`, and render category-only visible and accessible copy. Rename the v104 item-specific DOM/CSS seam to a category seam without changing selection, navigation, fallback, storage, or data contracts.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node assertion tests, Playwright, Service Worker App Shell versioning.

## Global Constraints

- Visual copy is `地點 · 第一優先分類 +N`; `N` counts remaining pending items, not categories.
- Product names must not appear in Hero visible markup or accessible names.
- Category comes from the first record after existing exact-`必買` stable priority; do not add ranking or mutate inputs.
- Blank category renders only the location and omits separator/count while accessibility retains total item count.
- Preserve `順路採買`／`今日採買`, exact-next-stop exclusion, generic fallback, focused Shopping navigation, Enter/Space, focus-visible, and 44px target.
- Keep location and category independently ellipsized on one row without horizontal overflow at 320, 375, and 390px.
- Forward bump `app-version.js` and `sw.js` from v104 to v105; do not change `netlify.toml`, Schema, Shopping storage, Ledger, Apps Script, Google Sheet data, `main`, deployment, or production tags.

---

### Task 1: Project the first prioritized category

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: raw Shopping item records grouped by `buildShoppingTodayReminder()` and ordered by `prioritizeShoppingGroupItems()`.
- Produces: reminder groups with existing `items: string[]` plus `firstCategory: string`; `todayShoppingHeroModel()` returns `{label, stopRef, stopName, count, firstCategory, remainingCount}`.

- [ ] **Step 1: Write failing projection tests**

Require a group ordered from `伴手禮, 必買, 生活用品` to retain `items: ['必買商品', ...]` and expose `firstCategory: '必買'`. Replace `firstItemName` expectations with `firstCategory`, add a blank-category case, and preserve reminder/model input immutability assertions.

- [ ] **Step 2: Run RED**

Run: `node tests/shopping-list.test.js`

Expected: FAIL because reminder groups and Hero models do not expose `firstCategory`.

- [ ] **Step 3: Implement minimal projection**

Inside each reminder group, store the result of `prioritizeShoppingGroupItems(group.items)` once, set `group.firstCategory = String(prioritized[0] && prioritized[0].category || '').trim()`, then retain the existing name array mapping. In `todayShoppingHeroModel()`, replace `firstItemName` with trimmed `group.firstCategory` and keep `remainingCount` unchanged.

- [ ] **Step 4: Run GREEN**

Run: `node tests/shopping-list.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/shopping-list.test.js && git commit -m "feat(today): project shopping category in Hero"`

### Task 2: Render category-only Hero copy

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1's `firstCategory` and `remainingCount` fields.
- Produces: `.today-hero-shopping-category` markup, category-only accessible copy, and no `.today-hero-shopping-item` output.

- [ ] **Step 1: Write failing renderer tests**

Change the fixture to include `firstCategory: '必買'`, require `Future stop · 必買 +2`, require `aria-label="開啟Future stop採買：必買，共 3 項待買"`, and assert the product fixture names `one/two/three` do not appear. Add quoted category escaping and blank-category fallback assertions.

- [ ] **Step 2: Run RED**

Run: `node tests/render-note.test.js && node tests/shopping-list.test.js`

Expected: FAIL because v104 reads and renders `firstItemName` and `.today-hero-shopping-item`.

- [ ] **Step 3: Implement minimal renderer and CSS rename**

Use `category = String(model.firstCategory || '')`, build accessible copy only from stop/category/count, render `.today-hero-shopping-category`, and rename the CSS selector from item to category while preserving the same flex/ellipsis treatment.

- [ ] **Step 4: Run GREEN and focused regressions**

Run: `node tests/render-note.test.js && node tests/shopping-list.test.js && node tests/home-simplification.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add index.html tests/render-note.test.js tests/shopping-list.test.js && git commit -m "feat(today): render shopping category in Hero"`

### Task 3: Lock responsive browser behavior

**Files:**
- Modify: `tests/browser/today-live-info.spec.js`

**Interfaces:**
- Consumes: category-only Hero markup from Task 2.
- Produces: real-browser evidence for category copy, absence of product names, keyboard navigation, and narrow-screen geometry.

- [ ] **Step 1: Write failing browser assertions**

Seed distinguishable product names, set the selected future group's prioritized category to `必買`, require `.today-hero-shopping-category` and category-only aria/text, and assert the product names are absent from the summary. Replace the long item fixture and computed-style checks with a long category fixture and `.today-hero-shopping-category` checks at 320/375/390px.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/browser/today-live-info.spec.js`

Expected: FAIL until the test fixture supplies the category contract and no longer expects v104 item markup.

- [ ] **Step 3: Complete the minimal test fixture wiring**

Use `shoppingListStore.update(item.id,{category:'必買'})` for the chosen future group's first prioritized record, call `renderToday()`, and retain all existing navigation/focus assertions.

- [ ] **Step 4: Run GREEN**

Run: `npx playwright test tests/browser/today-live-info.spec.js && node tests/home-simplification.test.js`

Expected: all focused cases pass.

- [ ] **Step 5: Commit**

Run: `git add tests/browser/today-live-info.spec.js && git commit -m "test(today): lock Hero category preview layout"`

### Task 4: Release and verify v105

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html`
- Modify: `tests/theme-system.test.js`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `docs/superpowers/plans/2026-08-12-today-hero-shopping-category-preview-v105.md`

**Interfaces:**
- Consumes: verified category behavior from Tasks 1–3.
- Produces: synchronized App/SW v105, five visible user release notes, delivery documentation, and a pushed `origin/dev`.

- [ ] **Step 1: Forward bump and update release notes**

Set `APP_VERSION` and `SW_VERSION` to `v105`. Add a v105 category-preview release note, drop v100 from the five-entry visible window, and update the historical-version assertion to `['v104','v103','v102','v101']`.

- [ ] **Step 2: Update delivery documentation**

Record category-only copy, unchanged data boundaries, v105 rollback, and fresh evidence in the changelog, current status, UI guidelines, handover, test README, and this plan.

- [ ] **Step 3: Run full Node Gate**

Run every top-level `tests/*.test.js` with Node and require 83/83 files to pass.

- [ ] **Step 4: Run full Playwright Gate**

Run: `npx playwright test`

Expected: 149/149 cases pass.

- [ ] **Step 5: Run health and static Gates**

Run production-data `healthCheck()` in headless Chromium and require `[]` with zero page errors. Run document-title, App/SW version, runtime asset, BUILTIN no-drift, manifest JSON, and `git diff --check` checks.

- [ ] **Step 6: Commit release evidence**

Run: `git add app-version.js sw.js index.html tests/theme-system.test.js 04_UI_GUIDELINES.md 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tests/README.md docs/superpowers/plans/2026-08-12-today-hero-shopping-category-preview-v105.md && git commit -m "docs: release Today Hero category preview v105"`

- [ ] **Step 7: Re-run the full committed-tree Gate**

Repeat all 83 Node files, all 149 Playwright cases, and static checks on the release commit.

- [ ] **Step 8: Push dev**

Fetch `origin`, require `origin/dev...dev` to show no remote-only commits, then run `git push origin dev`. Confirm local `HEAD` equals `origin/dev`. Do not merge `main`, deploy production, or create a production tag.
