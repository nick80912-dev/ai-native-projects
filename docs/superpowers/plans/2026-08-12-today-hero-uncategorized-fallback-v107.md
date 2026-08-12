# Today Hero Uncategorized Fallback v107 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `未分類` in the Today Hero whenever the selected Shopping item's category is blank, without changing stored Shopping data.

**Architecture:** Preserve `buildShoppingTodayReminder()` and `todayShoppingHeroModel()` as raw-data projections. Apply `未分類` only inside `renderTodayShoppingSummary()`, then reuse the existing category markup, compact layout, aria construction, count calculation, and Shopping-location navigation.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, Playwright Chromium/WebKit, Git.

## Global Constraints

- A blank `firstCategory` renders as `未分類` in visible and accessible Hero copy.
- `category: ''` remains unchanged in reminder/model/store/form/backup/restore/sync data.
- `SHOPPING_CATEGORIES` remains exactly `必買`, `伴手禮`, `生活用品`, `其他`.
- Preserve v106 stop truncation, complete category/count, 4px compact right alignment, 44px target, keyboard/touch behavior, and location targeting.
- Product names must remain absent from Hero visible and accessible copy.
- Release forward as v107 and push only `dev`; do not merge `main`, deploy production, or create a production tag.

---

### Task 1: Renderer-only uncategorized fallback

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:3340-3360`

**Interfaces:**
- Consumes: `todayShoppingHeroModel()` output with raw `firstCategory: string`.
- Produces: visible/accessibility category string `String(model.firstCategory || '').trim() || '未分類'`; no model mutation.

- [x] **Step 1: Write the failing tests**

Replace the existing blank-category fallback assertions with a two-item fixture and require:

```js
const blankCategoryReminder={
  items:[{id:'future',place:'Nakayama Farm Heart Sakazu'}],
  groups:[{stopRef:'future',stopName:'Nakayama Farm Heart Sakazu',items:['SECRET_ONE','SECRET_TWO'],firstCategory:''}]
};
const snapshot=JSON.parse(JSON.stringify(blankCategoryReminder));
const output=sandbox.renderTodayShoppingSummary(blankCategoryReminder,'');
assert(output.includes('<span class="today-hero-shopping-category">未分類</span>'));
assert(output.includes('<small class="today-hero-shopping-count">+1</small>'));
assert(output.includes('aria-label="開啟Nakayama Farm Heart Sakazu採買：未分類，共 2 項待買"'));
assert(!output.includes('SECRET_ONE'));
assert.deepStrictEqual(blankCategoryReminder,snapshot);
```

In `tests/shopping-list.test.js`, retain the existing `firstCategory: ''` projection assertion and add a source assertion that `SHOPPING_CATEGORIES` does not contain `未分類`.

- [x] **Step 2: Run RED**

Run: `node --test tests/render-note.test.js tests/shopping-list.test.js`

Expected: FAIL because the current renderer omits separator/category/count for a blank category.

- [x] **Step 3: Implement the minimal renderer fallback**

In `renderTodayShoppingSummary()` change only the display category derivation:

```js
var category=String(model.firstCategory||'').trim()||'未分類';
```

Keep the model, reminder, store, category choices, payload, and renderer markup structure unchanged.

- [x] **Step 4: Run GREEN**

Run: `node --test tests/render-note.test.js tests/shopping-list.test.js tests/home-simplification.test.js`

Expected: all tests PASS.

- [x] **Step 5: Commit**

```powershell
git add -- index.html tests/render-note.test.js tests/shopping-list.test.js
git commit -m "fix(today): label blank Shopping categories"
```

### Task 2: Mobile rendering and location targeting

**Files:**
- Modify: `tests/browser/today-live-info.spec.js`

**Interfaces:**
- Consumes: Task 1 renderer fallback and existing `openShoppingList(stopRef)` behavior.
- Produces: 320／375／390px and WebKit-touch evidence that blank-category Hero summaries show `未分類` and still target the same group.

- [x] **Step 1: Add a real blank-category browser fixture**

Add one pending item with `category: ''` at a deterministic future stop. Assert visible `未分類`, full aria, absent product name, non-shrinking category, compact right alignment, and no horizontal overflow at 320／375／390px. Activate the Hero button and assert the corresponding `shopgroup_<stopRef>` exists and is visible.

- [x] **Step 2: Run Chromium and WebKit focused tests**

```powershell
npx playwright test tests/browser/today-live-info.spec.js
npx playwright test tests/browser/today-live-info.spec.js --browser=webkit --grep "blank category"
```

Expected: Chromium Today suite and the WebKit touch-focused case PASS.

- [x] **Step 3: Commit**

```powershell
git add -- tests/browser/today-live-info.spec.js
git commit -m "test(today): cover uncategorized Hero targeting"
```

### Task 3: v107 release and delivery

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` release notes
- Modify: `tests/theme-system.test.js`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `docs/superpowers/plans/2026-08-12-today-hero-uncategorized-fallback-v107.md`

**Interfaces:**
- Consumes: verified v107 renderer/browser contract.
- Produces: consistent v107 app/cache identity, five-entry release window, documentation, full regression evidence, and aligned `origin/dev`.

- [x] **Step 1: Forward bump and document v107**

Set `APP_VERSION` and `SW_VERSION` to `v107`. Add a v107 release note, retain `v106` through `v103`, and change the historical release assertion to `['v106','v105','v104','v103']`. Document that `未分類` is display-only and data/storage remain unchanged.

- [x] **Step 2: Run static checks**

```powershell
node tools/check-app-version.js
node tools/check-doc-titles.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
Get-Content manifest.webmanifest -Raw | ConvertFrom-Json | Out-Null
git diff --check
```

Expected: v107 consistency, document titles, eight runtime assets, BUILTIN no-drift, manifest parsing, and diff checks pass.

- [x] **Step 3: Run full regression and health gate**

Run every `tests/*.test.js`, then `npx playwright test`, then the repository offline Chromium health probe. Expected: all 83 Node files, all 150 Playwright cases after the new browser test, `healthCheck: []`, and `pageErrors: []`.

- [x] **Step 4: Commit release metadata**

```powershell
git add -- app-version.js sw.js index.html tests/theme-system.test.js 04_UI_GUIDELINES.md 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tests/README.md docs/superpowers/plans/2026-08-12-today-hero-uncategorized-fallback-v107.md
git commit -m "docs: release Hero uncategorized fallback v107"
```

- [ ] **Step 5: Verify committed tree and push dev**

Re-run the full Node/Playwright/static/health gate on the release commit. Fetch `origin`, require zero remote-only commits, push `dev`, then verify `origin/dev...dev` is `0 0` and the local/remote SHA matches.
