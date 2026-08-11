# Today Shopping Copy Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the generic Today Hero Shopping action `開啟查看 →` to the right while preserving the confirmed `順路採買`／`今日採買` decision logic and every v103 interaction boundary.

**Architecture:** Keep the existing renderer and projection untouched. Add one state-scoped CSS rule for `.today-hero-shopping-generic`, lock it with source and computed-layout tests, and record the visual contract in the canonical UI guidelines.

**Tech Stack:** Single-file HTML/CSS/JavaScript, Node.js `assert` characterization tests, Playwright browser tests.

## Global Constraints

- Only the generic `採買清單｜開啟查看 →` value changes alignment; resolved station summaries keep their current flex/ellipsis layout.
- `順路採買` remains the first valid Shopping group after the exact current stop.
- `今日採買` remains the neutral label for past-only groups or an unresolved current stop.
- Shopping owned entirely by the exact current next stop remains represented only by the existing next-stop badge.
- The 44px target, Hero columns, divider, long-name ellipsis, weather summary, pre-trip launcher, API, schema, storage, App version, and SW version do not change.
- Phone widths 320px, 375px, and 390px must retain no horizontal overflow.

---

### Task 1: Right-align the generic Shopping action and lock the contract

**Files:**
- Modify: `tests/home-simplification.test.js`
- Modify: `tests/browser/today-live-info.spec.js`
- Modify: `index.html` near `.today-hero-shopping-summary`
- Modify: `04_UI_GUIDELINES.md` in the active-trip Today Hero contract

**Interfaces:**
- Consumes: existing `.today-hero-shopping-generic` state class and `.today-hero-summary-value` flex container.
- Produces: a state-scoped CSS contract in which the generic value uses `justify-content:flex-end`; no JavaScript interface changes.

- [ ] **Step 1: Add the failing source contract**

In `tests/home-simplification.test.js`, immediately after the existing `.today-hero-shopping-summary` tap-target assertion, add:

```js
assert.match(
  html,
  /\.today-hero-shopping-generic \.today-hero-summary-value\{[^}]*justify-content:flex-end/,
  `${file} right-aligns the generic Shopping action without changing resolved stop layout`
);
```

- [ ] **Step 2: Add the failing computed-layout Browser assertion**

In the existing `weather failure keeps generic Shopping entry usable` case in `tests/browser/today-live-info.spec.js`, after asserting `開啟查看 →`, add:

```js
const genericValue=summary.locator('.today-hero-summary-value');
const genericLayout=await genericValue.evaluate((element)=>{
  const box=element.getBoundingClientRect();
  const range=document.createRange();
  range.selectNodeContents(element);
  const text=range.getBoundingClientRect();
  return {
    justifyContent:getComputedStyle(element).justifyContent,
    rightGap:Math.round(box.right-text.right)
  };
});
expect(genericLayout.justifyContent).toBe('flex-end');
expect(Math.abs(genericLayout.rightGap)).toBeLessThanOrEqual(1);
```

This checks the real text geometry rather than only matching a class name.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
node tests/home-simplification.test.js
npx playwright test tests/browser/today-live-info.spec.js --grep "weather failure keeps generic Shopping entry usable"
```

Expected: the Node test fails because the new selector does not exist, and the Browser case reports `justifyContent` as `normal` instead of `flex-end`.

- [ ] **Step 4: Implement the minimal state-scoped CSS**

In `index.html`, immediately after `.today-hero-shopping-summary`, add:

```css
.today-hero-shopping-generic .today-hero-summary-value{justify-content:flex-end}
```

Do not add `justify-content:flex-end` to the shared `.today-hero-summary-value`; resolved summaries need their stop name to keep the flexible left portion while `N 項 →` stays visible at the right edge.

- [ ] **Step 5: Record the UI contract**

In `04_UI_GUIDELINES.md`, add one sentence to the v103 active-trip Today Hero section:

```markdown
- 通用採買狀態的 `開啟查看 →` 與右側欄位右緣對齊；具體站點摘要仍保留「站點名稱可省略、`N 項 →` 固定可見」的配置。
```

- [ ] **Step 6: Run focused verification and verify GREEN**

Run:

```powershell
node tests/home-simplification.test.js
npx playwright test tests/browser/today-live-info.spec.js
node tools/check-doc-titles.js
git diff --check
```

Expected: Home characterization passes, all 17 Today Browser cases pass, document titles remain valid, and no whitespace errors appear.

- [ ] **Step 7: Run the release-candidate regression gate**

Run:

```powershell
$failed=@(); $count=0; Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { $count++; node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; Write-Host "NODE_TOTAL=$count"; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-app-version.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Expected: 83/83 Node files, 149/149 Playwright cases, App/SW remain v103, runtime assets and BUILTIN remain unchanged, and manifest/diff checks pass.

- [ ] **Step 8: Inspect scope and commit**

Run:

```powershell
git diff -- index.html tests/home-simplification.test.js tests/browser/today-live-info.spec.js 04_UI_GUIDELINES.md
```

Confirm that `todayShoppingHeroModel()`, `renderTodayShoppingSummary()`, version markers, release notes, state, storage, schema, and next-stop badge behavior are unchanged. Then commit:

```powershell
git add index.html tests/home-simplification.test.js tests/browser/today-live-info.spec.js 04_UI_GUIDELINES.md
git commit -m "fix(today): align generic shopping action"
```

---
