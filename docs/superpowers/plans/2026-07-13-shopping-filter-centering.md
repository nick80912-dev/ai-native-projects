# Shopping Filter Centering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Horizontally center the active Shopping filter chip after every Shopping render without disturbing vertical place-card navigation.

**Architecture:** Add one ES5 measurement helper that moves only the filter element's `scrollLeft`, then schedule it after `renderShopResults()` replaces the filter markup. Keep `openShopPlace()` responsible for the independent vertical card scroll and publish the change through App Shell v11.

**Tech Stack:** Vanilla HTML/ES5 JavaScript, Node.js `assert`/`vm` tests, Service Worker App Shell, Markdown changelog.

## Global Constraints

- Work on clean `dev`; preserve unrelated user changes and do not touch `main`.
- Use bundled Node at `C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`.
- Keep production JavaScript ES5-compatible: no arrow functions, template literals, `const`, or `let` in `index.html`.
- The centering helper may modify only the filter bar's horizontal position; it must not call `scrollIntoView()`, `window.scrollTo()`, or change page vertical position.
- Do not modify `shopPlaceFilter`, `_shopQ`, `shopOpenFloors`, `shopWantListOpen`, want data, localStorage, Schema, parser, validator, Sheet data, manifest, icons, or Netlify configuration.
- Missing elements or zero layout measurements must be no-ops without throwing.
- Publish with `okayama-trip-v11`; tests and diagnostic files must remain outside the SW `SHELL` list.
- Stop at the push Gate after implementation and local CI; do not push until the Bar explicitly requests it.

## File Map

- Modify `index.html`: stable filter-bar ID, `centerShopFilterChip()` helper, post-render scheduling, APP/SW diagnostic labels.
- Modify `tests/render-note.test.js`: centering math, clamp, fallback, missing-element, and render-scheduling tests.
- Modify `tests/ios-zoom-guard.test.js`: v11 App Shell/diagnostic expectations.
- Modify `sw.js`: App Shell cache v11.
- Modify `07_CHANGELOG.md`: record the filter-centering behavior and non-impact.

---

### Task 1: Center the active Shopping chip horizontally

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `index.html:2251-2315`

**Interfaces:**
- Consumes: `document.getElementById('shopFilterBar')`, `.shop-filter-btn.on`, `requestAnimationFrame()`.
- Produces: `centerShopFilterChip(): void`.

- [ ] **Step 1: Add the failing behavior tests**

Add `extractFunction('centerShopFilterChip')` to the `vm` evaluation list in `tests/render-note.test.js`. After the existing `openShopPlace()` assertions, add:

```js
let horizontalScroll = null;
let activeChip = { offsetLeft:500, offsetWidth:120 };
let filterBar = {
  clientWidth:300,
  scrollLeft:0,
  querySelector:function(selector){
    assert.strictEqual(selector, '.shop-filter-btn.on');
    return activeChip;
  },
  scrollTo:function(options){ horizontalScroll = options; }
};
sandbox.document = {
  getElementById:function(id){ return id==='shopFilterBar'?filterBar:null; }
};
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll.left, 410, 'active place chip is horizontally centered');
assert.strictEqual(horizontalScroll.behavior, 'smooth', 'chip centering uses smooth horizontal movement');

horizontalScroll = null;
activeChip = { offsetLeft:20, offsetWidth:80 };
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll.left, 0, 'centering is clamped at the start of the bar');

activeChip = { offsetLeft:420, offsetWidth:100 };
filterBar = {
  clientWidth:300,
  scrollLeft:0,
  querySelector:function(){ return activeChip; }
};
sandbox.centerShopFilterChip();
assert.strictEqual(filterBar.scrollLeft, 320, 'scrollLeft fallback centers the chip when scrollTo is unavailable');

sandbox.document = { getElementById:function(){ return null; } };
assert.doesNotThrow(function(){ sandbox.centerShopFilterChip(); }, 'missing filter bar is a no-op');

filterBar = { clientWidth:300, querySelector:function(){ return null; } };
sandbox.document = { getElementById:function(){ return filterBar; } };
assert.doesNotThrow(function(){ sandbox.centerShopFilterChip(); }, 'missing active chip is a no-op');

horizontalScroll = null;
activeChip = { offsetLeft:300, offsetWidth:0 };
filterBar = { clientWidth:300, querySelector:function(){ return activeChip; }, scrollTo:function(options){ horizontalScroll=options; } };
sandbox.document = { getElementById:function(){ return filterBar; } };
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll, null, 'zero layout measurements are a no-op');

assert(html.includes('<div class="shop-filter" id="shopFilterBar">'), 'Shopping filter has a stable horizontal-scroll anchor');
assert(html.includes('requestAnimationFrame(centerShopFilterChip);'), 'Shopping render schedules chip centering after markup replacement');
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
```

Expected: failure with `centerShopFilterChip exists` because the helper is absent.

- [ ] **Step 3: Implement the minimal horizontal-only helper**

Add near the Shopping functions in `index.html`:

```js
function centerShopFilterChip(){
  var bar=document.getElementById('shopFilterBar');
  if(!bar) return;
  var chip=bar.querySelector('.shop-filter-btn.on');
  if(!chip||!bar.clientWidth||!chip.offsetWidth) return;
  var left=Math.max(0,chip.offsetLeft-(bar.clientWidth-chip.offsetWidth)/2);
  if(typeof bar.scrollTo==='function') bar.scrollTo({left:left,behavior:'smooth'});
  else bar.scrollLeft=left;
}
```

Change the filter markup opening to:

```js
h+='<div class="shop-filter" id="shopFilterBar">'+
```

Immediately after `box.innerHTML=h;` at the end of `renderShopResults()`, add:

```js
requestAnimationFrame(centerShopFilterChip);
```

Do not alter the existing animation-frame callback in `openShopPlace()`; it continues to perform only vertical place-card navigation.

- [ ] **Step 4: Run focused navigation and rendering tests**

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
& $node tests/home-simplification.test.js
& $node tests/trip-presentation.test.js
```

Expected: all three exit `0`; centering math and existing shopping route tests pass.

- [ ] **Step 5: Verify the helper contains no vertical-scroll API**

```powershell
$source=(Get-Content -Raw -Encoding UTF8 index.html)
$start=$source.IndexOf('function centerShopFilterChip(')
$end=$source.IndexOf('function ', $start+10)
$helper=$source.Substring($start,$end-$start)
if($helper -match 'scrollIntoView|window\.scroll|scrollY'){ throw 'Centering helper contains a vertical-scroll API' }
```

Expected: command exits `0` without output.

- [ ] **Step 6: Commit the functional change**

```powershell
git add -- index.html tests/render-note.test.js
git diff --cached --check
git commit -m "feat: center active shopping filter"
git rev-parse --short=7 HEAD
```

Expected: commit succeeds. Preserve the printed seven-character functional commit for Task 2's `APP_BUILD.code`.

---

### Task 2: Publish App Shell v11 and record the change

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html:855,2596,2615`
- Modify: `sw.js:9`
- Modify: `07_CHANGELOG.md:5`

**Interfaces:**
- Consumes: Task 1's exact seven-character functional commit.
- Produces: an `APP DEV · CODE` value equal to Task 1's exact seven-character commit output, plus App Shell `okayama-trip-v11`.

- [ ] **Step 1: Update the v11 test expectations first**

Replace the three v10 assertions in `tests/ios-zoom-guard.test.js` with:

```js
assert.match(sw, /okayama-trip-v11/, 'service worker cache is bumped to v11');
assert.match(html, /SW okayama-trip-v11/, 'diagnostics display v11');
assert.match(html, /gestureEnvironmentSnapshot\(navigator,query,APP_BUILD,SCHEMA\.version,'okayama-trip-v11',document\)/, 'gesture report displays v11');
```

- [ ] **Step 2: Run the version test and verify RED**

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
```

Expected: failure because production still reports `okayama-trip-v10`.

- [ ] **Step 3: Apply the publication metadata**

Use `git rev-parse --short=7 HEAD` to read Task 1's exact functional commit. With `apply_patch`:

- Set `APP_BUILD.code` in `index.html` to that exact seven-character value.
- Change both `index.html` diagnostic strings from `okayama-trip-v10` to `okayama-trip-v11`.
- Change `sw.js` `CACHE_NAME` to:

```js
var CACHE_NAME = 'okayama-trip-v11';
```

Do not modify the `SHELL` array.

- [ ] **Step 4: Add the changelog entry**

Add at the top of `07_CHANGELOG.md` using the exact Task 1 commit in the APP line:

```markdown
## 2026-07-13 — 購物地點標籤自動置中（Dev）
- 購物頁每次重繪後，會將目前選中的「全部／想逛／購物地點」標籤水平置中。
- 水平標籤移動與既有地點卡片垂直定位分離，不使用 `scrollIntoView()`，不改變樓層展開、搜尋、篩選或想逛資料。
- 診斷面板 APP DEV CODE 更新為本批功能 commit；Service Worker App Shell cache 更新為 `okayama-trip-v11`。
- 未修改 Schema、Validator、Sheet、manifest 或 localStorage 結構。
```

- [ ] **Step 5: Run focused publication tests**

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
& $node tests/ios-gesture-diagnostics.test.js
& $node tests/pwa-shell.test.js
```

Expected: all three exit `0`; v11 is consistent and no test file enters SW `SHELL`.

- [ ] **Step 6: Run complete local CI**

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$failed=$false
Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object {
  & $node $_.FullName
  if($LASTEXITCODE -ne 0){ $failed=$true }
}
if($failed){ throw 'One or more Node regression tests failed' }
& $node tools/check-doc-titles.js
if($LASTEXITCODE -ne 0){ throw 'Document title check failed' }
git diff --check
if(Select-String -Path sw.js -Pattern 'tests/' -Quiet){ throw 'Tests must not be in SW SHELL' }
```

Expected: all regression tests and document checks pass; diff check is silent.

- [ ] **Step 7: Commit and stop at push Gate**

```powershell
git add -- index.html sw.js tests/ios-zoom-guard.test.js 07_CHANGELOG.md
git diff --cached --check
git commit -m "chore: publish shopping filter centering build"
git status --short
git rev-list --left-right --count origin/dev...HEAD
```

Expected: clean working tree and local `dev` ahead of `origin/dev`. Report the exact APP code, v11 label, tests, and mobile checklist; do not push.

## Mobile Dev Acceptance Checklist

1. Confirm the diagnostic panel shows `SW okayama-trip-v11` and the new APP functional code.
2. From Today, open a shopping place whose chip begins off-screen; confirm the selected chip moves to the center.
3. Confirm the matching place card is still vertically visible.
4. Repeat from the Trip shopping action.
5. Tap `全部`, `想逛`, and several place chips; confirm each selected chip centers without vertical page jumping.
6. Confirm search, floor expansion, and want-list state behave as before.
