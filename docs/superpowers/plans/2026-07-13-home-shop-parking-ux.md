# Home, Shopping Navigation, and Parking Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Today-only `現在` badge, route shopping actions to the correct shopping-place card, and render multiline parking values as safe bullet lists across Today and Trip surfaces.

**Architecture:** Keep the existing single-file ES5 application and isolate each behavior behind a small renderer or navigation helper. Do not change `pickNextStop()`, the Sheet schema, parsing, progress state, or persisted shopping state; publish the final HTML through App Shell cache `okayama-trip-v10`.

**Tech Stack:** Vanilla HTML/CSS/ES5 JavaScript, Node.js `assert`/`vm` regression tests, Service Worker App Shell, Markdown governance documents.

## Global Constraints

- Work from clean `dev` synchronized with `origin/dev`; preserve unrelated user changes if the tree becomes dirty.
- `index.html` and `sw.js` are Tier 2 protected files; the Bar-approved design is the authorization for this plan, but execution still starts only after the Bar chooses an execution option.
- Keep production JavaScript ES5-compatible: use `function` and `var`; do not add arrow functions, template literals, `const`, or `let` to `index.html`.
- Do not modify `schema.js`, `validator.js`, `manifest.webmanifest`, icons, `netlify.toml`, Sheet data, localStorage keys, completion/skip/auto-skip rules, or time simulation.
- Do not automatically expand or collapse Shopping floors; `shopOpenFloors` must remain untouched by place navigation.
- Split parking values only on actual CR/LF line breaks; never split on punctuation.
- All Sheet-derived parking text must pass through the existing escaping/highlight path; never insert raw parking text as HTML.
- Use bundled Node at `C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` because `node` is not present on the shell PATH.
- Do not push `dev` until implementation, focused tests, full local CI, changelog, cache bump, and Bar push approval are complete.

## File Map

- Modify `index.html`: Today badge output, shopping-place navigation helper/anchors/actions, shared parking renderer/CSS, diagnostic App Shell label.
- Modify `tests/render-note.test.js`: Today output, shopping action, and parking renderer regression coverage.
- Modify `tests/trip-presentation.test.js`: guard that the Trip-view `現在` badge remains.
- Modify `tests/ios-zoom-guard.test.js`: expected App Shell/diagnostic cache version.
- Modify `sw.js`: publish App Shell cache `okayama-trip-v10`.
- Modify `07_CHANGELOG.md`: record the approved UX batch and non-goals.

---

### Task 1: Remove only the Today `現在` badge

**Files:**
- Modify: `tests/render-note.test.js:153-163`
- Modify: `tests/trip-presentation.test.js:28-34`
- Modify: `index.html:1938-1946`

**Interfaces:**
- Consumes: existing `renderNextStopCard(day, dayIndex, pick)` and Trip `itemCard(...)` rendering.
- Produces: Today ticket markup without `now-badge`; no function signature or state change.

- [ ] **Step 1: Change the focused assertions so the current implementation fails**

In `tests/render-note.test.js`, replace the current positive Today badge assertion with:

```js
assert(!currentNextStopOut.includes('<span class="now-badge">現在</span>'), 'home next-stop ticket omits the now badge');
assert(!currentNextStopOut.includes('依目前時間'), 'the old home-only time label remains absent');
```

In `tests/trip-presentation.test.js`, add before the final log:

```js
assert.match(
  html,
  /isNow\?'<span class="now-badge">現在<\/span>'/,
  'the Trip view keeps the now badge'
);
```

- [ ] **Step 2: Run the focused tests and verify the Today assertion fails**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
& $node tests/trip-presentation.test.js
```

Expected: `render-note.test.js` fails with `home next-stop ticket omits the now badge`; the Trip preservation assertion passes.

- [ ] **Step 3: Remove only the Today renderer branch**

In `renderNextStopCard()`, replace:

```js
'<div class="nx-ticket-tags">'+
  (meta.cat?'<span class="nx-ticket-tag">'+escapeHtml(meta.cat.label)+'</span>':'')+
  (pick.source==='time'?'<span class="now-badge">現在</span>':'')+
'</div>'+
```

with:

```js
'<div class="nx-ticket-tags">'+
  (meta.cat?'<span class="nx-ticket-tag">'+escapeHtml(meta.cat.label)+'</span>':'')+
'</div>'+
```

Do not edit `pickNextStop()`, `selectCurrentTripItem()`, `isNow`, or the Trip card markup.

- [ ] **Step 4: Re-run the focused and selection tests**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
& $node tests/trip-presentation.test.js
& $node tests/pick-next-stop.test.js
```

Expected: all three commands exit `0` and print their pass messages.

- [ ] **Step 5: Commit the isolated badge change**

```powershell
git add -- index.html tests/render-note.test.js tests/trip-presentation.test.js
git diff --cached --check
git commit -m "fix: keep now badge on itinerary only"
```

Expected: one commit touching only the three listed files.

---

### Task 2: Route shopping actions to the exact place card

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `index.html:422`
- Modify: `index.html:1563-1565`
- Modify: `index.html:1858-1872`
- Modify: `index.html:1947-1960`
- Modify: `index.html:2138-2271`

**Interfaces:**
- Consumes: `p.placeId`, `DB.shop`, `_shopQ`, `shopPlaceFilter`, `shopMalls()`, `cssId()`, and `switchView(v)`.
- Produces: `openShopPlace(placeId): void`; stable anchor `shopmall_<cssId(PID)>`; `nextStopMeta(...).shopPlaceId: string`.

- [ ] **Step 1: Extend the test sandbox with the planned helper and assertions**

Add `extractFunction('cssId')` and `extractFunction('openShopPlace')` to the evaluated function list in `tests/render-note.test.js`, with `cssId` first. After sandbox creation/evaluation, add:

```js
let switchedView = '';
let scrolled = false;
sandbox._shopQ = 'uniqlo';
sandbox.shopPlaceFilter = 'wants';
sandbox.shopOpenFloors = { 'P001::1F':true };
sandbox.shopMalls = function(){ return [{ place:{ placeId:'P001' }, stores:[] }]; };
sandbox.switchView = function(view){ switchedView = view; };
sandbox.requestAnimationFrame = function(fn){ fn(); };
sandbox.document = {
  getElementById:function(id){
    if(id !== 'shopmall_P001') return null;
    return { scrollIntoView:function(){ scrolled = true; } };
  }
};
sandbox.openShopPlace('p001');
assert.strictEqual(sandbox._shopQ, '', 'shopping deep link clears stale search');
assert.strictEqual(sandbox.shopPlaceFilter, 'P001', 'shopping deep link selects the resolved place');
assert.strictEqual(switchedView, 'shop', 'shopping deep link opens the Shopping view');
assert.strictEqual(scrolled, true, 'shopping deep link scrolls to the place card after render');
assert.strictEqual(sandbox.shopOpenFloors['P001::1F'], true, 'shopping deep link preserves floor state');

sandbox._shopQ = 'daiso';
sandbox.shopPlaceFilter = 'P001';
scrolled = false;
sandbox.openShopPlace('P999');
assert.strictEqual(sandbox._shopQ, '', 'unknown place still clears stale search');
assert.strictEqual(sandbox.shopPlaceFilter, 'all', 'unknown place safely falls back to all');
assert.strictEqual(scrolled, false, 'unknown place does not attempt a target scroll');
```

After the existing `renderNextStopCard()` assertions, add a shopping-place fixture:

```js
sandbox.DB = { shop:[{ placeId:'P001' }] };
sandbox.resolveRef = function(){
  return {
    kind:'place',
    p:{ placeId:'P001', name:'永旺夢樂城岡山', tnorm:'shopping', type:'購物' }
  };
};
const shoppingNextStopOut = sandbox.renderNextStopCard({}, 0, {
  source:'order',
  item:{ id:'10/18_5', time:'', act:'血拚時間', place:'永旺夢樂城岡山', move:'', note:'' }
});
assert(shoppingNextStopOut.includes('onclick="openShopPlace(\'P001\')"'), 'Today shopping ticket targets its PID');
assert.match(html, /onclick="openShopPlace\(\''\+jsString\(p\.placeId\)\+'\'\)"/, 'Trip shopping action targets its PID');
assert.match(html, /id="shopmall_'\+cssId\(pkey\)\+'"/, 'shopping cards expose stable PID anchors');
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
```

Expected: failure because `openShopPlace` does not exist and the Today action/Shopping anchor are absent.

- [ ] **Step 3: Add the stable scroll behavior and navigation helper**

Extend the `.shop-mall` rule so a fixed header does not cover the destination:

```css
.shop-mall{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px;box-shadow:var(--shadow);margin-bottom:14px;scroll-margin-top:150px}
```

After `shopQ(v)`, add ES5 code:

```js
function openShopPlace(placeId){
  var key=String(placeId||'').trim().toUpperCase();
  var exists=shopMalls().some(function(m){
    return String(m.place&&m.place.placeId||'').toUpperCase()===key;
  });
  _shopQ='';
  shopPlaceFilter=exists?key:'all';
  switchView('shop');
  if(!exists) return;
  requestAnimationFrame(function(){
    var target=document.getElementById('shopmall_'+cssId(key));
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  });
}
```

This helper must not assign to `shopOpenFloors`, `shopWantListOpen`, or localStorage.

- [ ] **Step 4: Give every rendered shopping-place card a stable PID anchor**

In both `renderShopResults()` branches that start a mall card, replace the opening markup with:

```js
h+='<div class="shop-mall" id="shopmall_'+cssId(pkey)+'"><div class="sm-name">🏬 '+escapeHtml(p.name)+'</div>'+
```

Apply this to the `_shopQ` branch and the normal branch so the anchor does not depend on presentation mode.

- [ ] **Step 5: Route the Trip shopping action through the helper**

In `itemCard()`, replace:

```js
qa+='<button class="qa-btn sp" onclick="switchView(\'shop\')">🏬 樓層</button>';
```

with:

```js
qa+='<button class="qa-btn sp" onclick="openShopPlace(\''+jsString(p.placeId)+'\')">🏬 樓層</button>';
```

- [ ] **Step 6: Expose the same action from an ordinary Today shopping ticket**

Add this property to the object returned by `nextStopMeta()`:

```js
shopPlaceId:(p&&p.tnorm==='shopping'&&DB.shop.some(function(s){
  return String(s.placeId||'').toUpperCase()===String(p.placeId||'').toUpperCase();
}))?p.placeId:'',
```

Then add the shopping action inside the Today `nx-secondary-actions` block:

```js
(meta.shopPlaceId?'<button class="qa-btn sp" onclick="openShopPlace(\''+jsString(meta.shopPlaceId)+'\')">🏬 樓層</button>':'')+
```

Keep the ticket's existing click-to-Trip behavior, navigation button, website link, and schedule links unchanged.

- [ ] **Step 7: Run focused Shopping and Today tests**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
& $node tests/home-simplification.test.js
& $node tests/trip-presentation.test.js
```

Expected: all commands exit `0`; the new test proves search/filter reset, target scrolling, unknown-PID fallback, unchanged floor state, and both entry points.

- [ ] **Step 8: Commit the isolated Shopping navigation change**

```powershell
git add -- index.html tests/render-note.test.js
git diff --cached --check
git commit -m "feat: focus shopping place from itinerary"
```

Expected: one commit containing the helper, actions, anchors, CSS offset, and focused tests.

---

### Task 3: Render multiline parking values as bullet lists

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `index.html:398-444`
- Modify: `index.html:1330-1425`
- Modify: `index.html:1858-1882`
- Modify: `index.html:1947-1955`

**Interfaces:**
- Consumes: parking strings from `p.pnote`, `r.pnote`, `r.parking`, `h.pnote`, and `resolveParking(p).pnote`.
- Produces: `parkingLines(value): string[]`, `renderParkingValue(value): string`, `parkingKvRow(label, value): string`, and `renderParkingTicketLine(label, value): string`.

- [ ] **Step 1: Add failing unit and integration assertions**

Add the four new functions to the `vm` evaluation list in `tests/render-note.test.js`, then add:

```js
assert.strictEqual(
  sandbox.renderParkingValue('附近有停車場'),
  '附近有停車場',
  'single-line parking stays inline'
);

const parkingListOut = sandbox.renderParkingValue('第一停車場，步行2分鐘\r\n\r\n第二停車場，步行3分鐘');
assert(parkingListOut.includes('class="parking-list"'), 'multiline parking uses list markup');
assert.strictEqual((parkingListOut.match(/<li>/g)||[]).length, 2, 'blank lines do not create bullets');
assert(parkingListOut.indexOf('第一停車場') < parkingListOut.indexOf('第二停車場'), 'parking line order is preserved');
assert(!sandbox.renderParkingValue('<script>alert(1)</script>\n安全停車').includes('<script>'), 'parking text is escaped');
assert.strictEqual((sandbox.renderParkingValue('逗號前,逗號後').match(/<li>/g)||[]).length, 0, 'punctuation does not split parking text');
```

Update the existing parking panel stub and assertion to use multiline text:

```js
sandbox.resolveParking = function(){
  return { mapcode:'22 220 851*75', pnote:'第一停車場\n第二停車場' };
};
const parkingOut = sandbox.parkingPanel({});
assert.strictEqual((parkingOut.match(/<li>/g)||[]).length, 2, 'inherited parking panel uses the shared list renderer');
```

Add a restaurant metadata assertion:

```js
sandbox.resolveRef = function(){
  return {
    kind:'rest',
    r:{ name:'一鶴', cat:'骨付鳥', hours:'', pay:'', travel:'', pnote:'第一停車場\n第二停車場', note:'' }
  };
};
const restaurantParkingOut = sandbox.renderNextStopCard({}, 0, {
  source:'order',
  item:{ id:'10/19_9', time:'18:00', act:'晚餐時間', place:'一鶴', move:'', note:'' }
});
assert.strictEqual((restaurantParkingOut.match(/class="parking-list"/g)||[]).length, 1, 'Today reads restaurant pnote and renders parking bullets');
```

Add static integration assertions for all three data sources:

```js
assert.match(html, /parkingKvRow\('🅿 停車',r\.pnote\)/, 'restaurant info uses parking renderer');
assert.match(html, /parkingKvRow\('🅿 停車',h\.pnote\)/, 'hotel info uses parking renderer');
assert.match(html, /parkingKvRow\('🅿 停車',p\.pnote\)/, 'place info uses parking renderer');
```

- [ ] **Step 2: Run the focused test and verify the renderer is missing**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
```

Expected: failure because `renderParkingValue`, `parkingKvRow`, and `renderParkingTicketLine` do not exist.

- [ ] **Step 3: Add list styling and the shared ES5 renderer**

Add near the existing rich-note/list styles:

```css
.parking-list{margin:0;padding-left:18px}
.parking-list li+li{margin-top:4px}
```

Add after `kvRow(k,v)`:

```js
function parkingLines(value){
  return String(value||'').split(/\r?\n/).map(function(line){
    return line.trim();
  }).filter(Boolean);
}
function renderParkingValue(value){
  var lines=parkingLines(value);
  if(!lines.length) return '';
  if(lines.length===1) return highlightNote(lines[0]);
  return '<ul class="parking-list">'+lines.map(function(line){
    return '<li>'+highlightNote(line)+'</li>';
  }).join('')+'</ul>';
}
function parkingKvRow(k,v){
  var value=renderParkingValue(v);
  return value?'<div class="pc-row"><span class="pc-k">'+k+'</span><div class="pc-v">'+value+'</div></div>':'';
}
function renderParkingTicketLine(label,value){
  var rendered=renderParkingValue(value);
  return rendered?'<div class="nx-ticket-line"><b>'+escapeHtml(label)+'</b> '+rendered+'</div>':'';
}
```

`highlightNote()` already calls `escapeHtml()` before adding safe highlights/links, so each source line remains escaped.

- [ ] **Step 4: Replace only parking-value call sites**

Make these substitutions without changing non-parking `kvRow()` calls:

```js
out += parkingKvRow('停車場', park.pnote);
```

```js
parkingKvRow('🅿 停車',r.pnote)
parkingKvRow('🅿 停車',h.pnote)
parkingKvRow('🅿 停車',p.pnote)
```

In `nextStopMeta()`, replace the restaurant fallback so the normalized schema field is preferred while retaining compatibility:

```js
parking:(p&&p.pnote)||(r&&(r.pnote||r.parking))||'',
```

In `renderNextStopCard()`, replace:

```js
renderTicketLine('停車',meta.parking)+
```

with:

```js
renderParkingTicketLine('停車',meta.parking)+
```

- [ ] **Step 5: Run focused rendering, schema, and safety tests**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/render-note.test.js
& $node tests/schema-types.test.js
& $node tests/home-safety.test.js
& $node tests/data-reference-consistency.test.js
```

Expected: all four commands exit `0`; multiline values produce bullets, single lines remain inline, and schema/reference behavior remains unchanged.

- [ ] **Step 6: Commit the isolated parking presentation change**

```powershell
git add -- index.html tests/render-note.test.js
git diff --cached --check
git commit -m "feat: list multiline parking details"
```

Expected: one commit containing only parking presentation/CSS and its tests.

---

### Task 4: Publish App Shell v10 and record the batch

**Files:**
- Modify: `sw.js:9`
- Modify: `index.html:2556,2575`
- Modify: `tests/ios-zoom-guard.test.js:40-42`
- Modify: `07_CHANGELOG.md:5`

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: App Shell cache/diagnostic label `okayama-trip-v10` and a governance-complete changelog entry.

- [ ] **Step 1: Update the version regression first**

In `tests/ios-zoom-guard.test.js`, change the three v9 expectations to:

```js
assert.match(sw, /okayama-trip-v10/, 'service worker cache is bumped to v10');
assert.match(html, /SW okayama-trip-v10/, 'diagnostics display v10');
assert.match(html, /gestureEnvironmentSnapshot\(navigator,query,APP_BUILD,SCHEMA\.version,'okayama-trip-v10',document\)/, 'gesture report displays v10');
```

- [ ] **Step 2: Run the version test and verify it fails**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
```

Expected: failure because production still reports `okayama-trip-v9`.

- [ ] **Step 3: Bump all three runtime version surfaces to v10**

Change `sw.js` to:

```js
var CACHE_NAME = 'okayama-trip-v10';
```

Change both `index.html` diagnostic occurrences from `okayama-trip-v9` to `okayama-trip-v10`:

```js
var env=gestureEnvironmentSnapshot(navigator,query,APP_BUILD,SCHEMA.version,'okayama-trip-v10',document);
```

```html
<div class="diag-row">SW okayama-trip-v10</div>
```

Do not add tests or diagnostic files to `SHELL`.

- [ ] **Step 4: Add the exact changelog entry at the top of 2026-07-13 changes**

Insert after the changelog format line:

```markdown
## 2026-07-13 — 首頁／購物定位／停車資訊 UX 修正（Dev）
- 首頁 NEXT STOP 移除「現在」標籤；行程頁「現在」及既有時間、完成、略過、自動略過判定不變。
- 首頁與行程頁的購物樓層入口會清除舊搜尋／篩選、選中對應 PID 並捲到購物地點卡片，不自動改變樓層展開狀態。
- 地點、餐廳與住宿的停車欄位如含多個非空白換行，於首頁與行程資訊中逐行列點；單行、MAP CODE 與停車繼承維持原樣。
- Service Worker App Shell cache 更新為 `okayama-trip-v10`；未修改 Schema、Validator、Sheet、manifest 或 localStorage 結構。
```

- [ ] **Step 5: Run the focused publication tests**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
& $node tests/ios-gesture-diagnostics.test.js
& $node tests/pwa-shell.test.js
```

Expected: all three commands exit `0`; App Shell is v10 and the diagnostic observer remains passive/read-only.

- [ ] **Step 6: Run full local CI and repository checks**

Run:

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
git status --short
```

Expected: every test prints its pass message, document-title check prints `✅ 文件標題/檔名一致性檢查通過`, `git diff --check` is silent, and status lists only the intended implementation files.

- [ ] **Step 7: Review the protected-file diff and forbidden scope**

Run:

```powershell
git diff -- index.html sw.js tests/render-note.test.js tests/trip-presentation.test.js tests/ios-zoom-guard.test.js 07_CHANGELOG.md
git diff --name-only origin/dev...HEAD
```

Expected: no changes to `schema.js`, `validator.js`, `manifest.webmanifest`, icons, `netlify.toml`, or Sheet data; no tests appear in `sw.js` `SHELL`.

- [ ] **Step 8: Commit publication metadata**

```powershell
git add -- sw.js index.html tests/ios-zoom-guard.test.js 07_CHANGELOG.md
git diff --cached --check
git commit -m "chore: publish home shop parking ux build"
```

Expected: final implementation commit records App Shell v10 and changelog without including unrelated files.

- [ ] **Step 9: Report results and stop at the push Gate**

Run:

```powershell
git status --short
git log --oneline -6
git rev-list --left-right --count origin/dev...HEAD
```

Expected: clean working tree and local `dev` ahead of `origin/dev` by the design/plan plus implementation commits. Report automated evidence and the exact mobile acceptance checklist; do not push until the Bar explicitly says `push dev`.

## Mobile Dev Acceptance Checklist

After a separately approved push to `dev` and Netlify deployment:

1. Confirm the diagnostic panel shows `SW okayama-trip-v10`.
2. On Today, confirm the NEXT STOP card has no orange `現在` badge.
3. On Trip, confirm the time-selected card still shows `現在`.
4. From a Today shopping ticket, tap `🏬 樓層`; confirm the Shopping filter selects the matching place and the place card is visible.
5. Repeat from the Trip shopping card.
6. Before each navigation, set a different place/filter and type a search term; confirm navigation clears them.
7. Open one Shopping floor before navigating away; confirm the route does not unexpectedly toggle floor state.
8. Open parking details sourced from a Place, Restaurant, and Hotel; confirm each actual Sheet line is one bullet and blank lines are absent.
9. Confirm one-line parking remains one line and MAP CODE still opens normally.
