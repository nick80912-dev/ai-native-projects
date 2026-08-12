# Today Hero Shopping Compact Alignment v106 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today Hero Shopping value a compact right-aligned group, cap visible stop names at six Unicode characters plus an ellipsis, and always preserve the full category and `+N`.

**Architecture:** Keep the reminder/model contracts unchanged. Add one renderer-local stop-label helper, use the full model value for accessibility, and replace proportional stop/category flex allocation with end-justified content sizing where only the stop may shrink.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js built-in test runner, Playwright, Git.

## Global Constraints

- The visible resolved summary remains `地點 · 第一優先分類 +N`; no product name may appear in visible or accessible copy.
- A stop name of seven or more Unicode code points renders as its first six code points plus `…`; one through six code points render in full.
- Category and `+N` never use ellipsis and never flex-shrink. At constrained widths the stop may shrink further to protect them.
- The value row is one compact group aligned to the right with a `4px` gap between adjacent parts.
- `aria-label` keeps the complete stop name, complete category, and total pending count.
- Preserve reminder selection, exact-next-stop exclusion, priority, generic fallback, navigation, Enter/Space, focus-visible, 44px target, Hero height, themes, storage, sync, and Ledger behavior.
- Release forward as v106 and push only `dev`; do not deploy production.

---

## File Structure

- `index.html`: owns the helper, renderer markup, Hero CSS, release notes, and embedded runtime.
- `tests/render-note.test.js`: locks deterministic visible truncation and full accessible naming.
- `tests/home-simplification.test.js`: locks the CSS contract without a browser.
- `tests/browser/today-live-info.spec.js`: locks actual 320／375／390px geometry, compact gaps, right alignment, and protected category/count.
- `app-version.js`, `sw.js`, `tests/theme-system.test.js`: keep the release and cache versions consistent.
- `04_UI_GUIDELINES.md`, `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, `tasks/current.md`, `tests/README.md`: document the v106 contract and verification surface.

### Task 1: Renderer truncation and compact CSS contract

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `tests/home-simplification.test.js`
- Modify: `index.html:178-188`
- Modify: `index.html:3337-3353`

**Interfaces:**
- Consumes: `todayShoppingHeroModel()` output `{stopName, firstCategory, remainingCount, count}`.
- Produces: `todayHeroShoppingStopText(stopName: unknown): string` and compact `.today-hero-shopping-summary .today-hero-summary-value` layout.

- [x] **Step 1: Write failing renderer tests**

Add `extractFunction('todayHeroShoppingStopText')` immediately before `extractFunction('renderTodayShoppingSummary')`. Add fixtures asserting exact boundary behavior and accessibility:

```js
assert.strictEqual(sandbox.todayHeroShoppingStopText('原爆圓頂館'),'原爆圓頂館');
assert.strictEqual(sandbox.todayHeroShoppingStopText('廣島和平紀念資料館'),'廣島和平紀念…');

const longStopHeroOut=sandbox.renderTodayShoppingSummary({
  items:[{id:'future',place:'廣島和平紀念資料館'}],
  groups:[{
    stopRef:'future',stopName:'廣島和平紀念資料館',
    items:['SECRET_ONE','SECRET_TWO','SECRET_THREE'],firstCategory:'生活用品'
  }]
},'');
assert(longStopHeroOut.includes('<span class="today-hero-shopping-stop">廣島和平紀念…</span>'));
assert(longStopHeroOut.includes('aria-label="開啟廣島和平紀念資料館採買：生活用品，共 3 項待買"'));
assert(longStopHeroOut.includes('<span class="today-hero-shopping-category">生活用品</span>'));
assert(longStopHeroOut.includes('<small class="today-hero-shopping-count">+2</small>'));
```

In `tests/home-simplification.test.js`, require end justification, removable proportional flex values, a shrinkable stop, and non-shrinking category/count:

```js
assert.match(html,/\.today-hero-shopping-summary \.today-hero-summary-value\{[^}]*justify-content:flex-end/);
assert.match(html,/\.today-hero-shopping-stop\{[^}]*flex:0 1 auto[^}]*max-width:7em/);
assert.match(html,/\.today-hero-shopping-category\{[^}]*flex:0 0 auto/);
assert.match(html,/\.today-hero-shopping-separator,\.today-hero-shopping-count\{[^}]*flex:0 0 auto/);
assert.doesNotMatch(html,/today-hero-shopping-stop\{[^}]*1\.15/);
assert.doesNotMatch(html,/today-hero-shopping-category\{[^}]*\.85/);
```

- [x] **Step 2: Run focused Node tests and verify RED**

Run: `node --test tests/render-note.test.js tests/home-simplification.test.js`

Expected: FAIL because `todayHeroShoppingStopText()` and the compact CSS contract do not exist.

- [x] **Step 3: Implement the minimal helper and renderer change**

Add before `renderTodayShoppingSummary()`:

```js
function todayHeroShoppingStopText(stopName){
  var chars=Array.from(String(stopName||'').trim());
  return chars.length>6?chars.slice(0,6).join('')+'…':chars.join('');
}
```

Keep `model.stopName` for `aria-label`, but render the helper result:

```js
var visibleStopName=todayHeroShoppingStopText(model.stopName);
// ...
'<span class="today-hero-shopping-stop">'+escapeHtml(visibleStopName)+'</span>'+
```

Replace the proportional CSS with:

```css
.today-hero-shopping-summary .today-hero-summary-value{justify-content:flex-end}
.today-hero-shopping-stop{flex:0 1 auto;max-width:7em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.today-hero-shopping-separator,.today-hero-shopping-count{flex:0 0 auto}
.today-hero-shopping-category{flex:0 0 auto;min-width:0;white-space:nowrap;font-weight:700;opacity:.8}
```

Retain `.today-hero-summary-value{gap:4px}` as the sole spacing rule.

- [x] **Step 4: Run focused Node tests and verify GREEN**

Run: `node --test tests/render-note.test.js tests/home-simplification.test.js tests/shopping-list.test.js`

Expected: all tests PASS; renderer visible copy is shortened while its aria copy remains complete.

- [x] **Step 5: Commit the renderer unit**

```powershell
git add -- index.html tests/render-note.test.js tests/home-simplification.test.js
git commit -m "fix(today): compact Hero shopping summary"
```

### Task 2: Real mobile-width layout protection

**Files:**
- Modify: `tests/browser/today-live-info.spec.js:280-343`

**Interfaces:**
- Consumes: Task 1's helper output and compact flex contract.
- Produces: browser guarantees for right alignment, `4px` gaps, stop-only truncation, and complete category/count at 320／375／390px.

- [x] **Step 1: Replace the obsolete dual-ellipsis browser assertions**

Seed the resolved future group with category `生活用品`, set its stop to `廣島和平紀念資料館`, and remove the artificial long-category override. For every viewport, collect:

```js
const parts=[stop,separator,category,count].filter(Boolean);
const gaps=parts.slice(1).map((part,index)=>
  part.getBoundingClientRect().left-parts[index].getBoundingClientRect().right
);
const last=parts[parts.length-1].getBoundingClientRect();
return {
  stopText:stop.textContent,
  rightDelta:Math.abs(last.right-value.getBoundingClientRect().right),
  gaps,
  stopCanEllipsize:getComputedStyle(stop).textOverflow==='ellipsis',
  categoryText:category.textContent,
  categoryOverflow:category.scrollWidth>category.clientWidth,
  categoryShrink:getComputedStyle(category).flexShrink,
  countText:count.textContent,
  countOverflow:count.scrollWidth>count.clientWidth,
  countShrink:getComputedStyle(count).flexShrink
};
```

Assert:

```js
expect(layout.stopText).toBe('廣島和平紀念…');
expect(layout.rightDelta).toBeLessThanOrEqual(1);
layout.gaps.forEach(gap=>expect(gap).toBeGreaterThanOrEqual(3));
layout.gaps.forEach(gap=>expect(gap).toBeLessThanOrEqual(5));
expect(layout.stopCanEllipsize).toBe(true);
expect(layout.categoryText).toBe('生活用品');
expect(layout.categoryOverflow).toBe(false);
expect(layout.categoryShrink).toBe('0');
expect(layout.countText).toBe('+2');
expect(layout.countOverflow).toBe(false);
expect(layout.countShrink).toBe('0');
```

Retain the existing one-row, no-horizontal-overflow, minimum target, Hero height, ticket position, badge size, and overlap assertions.

- [x] **Step 2: Run the focused browser spec**

Run: `npx playwright test tests/browser/today-live-info.spec.js`

Expected: all Today live-info tests PASS at 320／375／390px.

- [x] **Step 3: Commit the mobile layout regression coverage**

```powershell
git add -- tests/browser/today-live-info.spec.js
git commit -m "test(today): protect compact shopping alignment"
```

### Task 3: Release v106 documentation and cache alignment

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
- Modify: `docs/superpowers/plans/2026-08-12-today-hero-shopping-compact-alignment-v106.md`

**Interfaces:**
- Consumes: completed v106 renderer and browser contract.
- Produces: consistent `v106` application/cache identity and user/developer documentation.

- [x] **Step 1: Update forward-only version expectations**

Change runtime versions from `v105` to `v106`. Add v106 as the newest release note and retain exactly the preceding four releases `v105`, `v104`, `v103`, `v102`; update `tests/theme-system.test.js` expected historical list to:

```js
['v105','v104','v103','v102']
```

- [x] **Step 2: Document the exact v106 behavior**

Record that the resolved Hero Shopping value is a compact right-aligned group, stop names are capped at six Unicode code points plus `…`, categories/counts remain complete, and the full stop name remains accessible. State that navigation, storage, sync, offline data, and Ledger are unchanged.

- [x] **Step 3: Run version and static checks**

Run:

```powershell
node tools/check-app-version.js
node tools/check-doc-titles.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
Get-Content manifest.webmanifest -Raw | ConvertFrom-Json | Out-Null
git diff --check
```

Expected: v106 consistency passes, document titles pass, eight runtime assets validate, BUILTIN reports no drift, manifest parses, and diff check emits nothing.

- [x] **Step 4: Commit the v106 release metadata**

```powershell
git add -- app-version.js sw.js index.html tests/theme-system.test.js 04_UI_GUIDELINES.md 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tests/README.md docs/superpowers/plans/2026-08-12-today-hero-shopping-compact-alignment-v106.md
git commit -m "docs: release compact Hero shopping alignment v106"
```

### Task 4: Full committed-tree verification and dev delivery

**Files:**
- Verify only; no expected source modifications.

**Interfaces:**
- Consumes: committed v106 tree.
- Produces: fresh complete regression evidence and `origin/dev` aligned to local `dev`.

- [ ] **Step 1: Run every Node test**

```powershell
$testFiles = Get-ChildItem -Path tests -File -Filter '*.test.js' | Sort-Object Name | ForEach-Object { $_.FullName }
$env:NODE_TEST_FILES = ($testFiles -join ';')
node --test $testFiles
```

Expected: all 83 Node test files PASS.

- [ ] **Step 2: Run every Playwright test**

Run: `npx playwright test`

Expected: all 149 browser tests PASS with no retries.

- [ ] **Step 3: Run offline runtime health verification**

Launch the repository static server and headless Chromium with offline app networking, wait for `syncInFlight === null`, then evaluate both `healthCheck()` and collected `pageerror` events.

Expected:

```json
{"healthCheck":[],"pageErrors":[]}
```

- [ ] **Step 4: Verify clean tree and remote race state**

Run:

```powershell
git status --short
git diff --check
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
git log --oneline origin/dev..dev
```

Expected: clean tree, no diff errors, `origin/dev` has zero unique commits, and only the reviewed v106 commits are pending locally.

- [ ] **Step 5: Push and verify alignment**

```powershell
git push origin dev
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
git rev-parse --short HEAD
git rev-parse --short origin/dev
```

Expected: push succeeds, divergence is `0 0`, and local/remote short SHAs match. Do not deploy production.
