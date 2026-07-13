# Home Cluster Child Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every expanded Today-screen cluster child row open its exact full-itinerary card while leaving the parent card and ordinary Today cards unchanged.

**Architecture:** Reuse the existing `openTripItem(dayIndex, itemId)` route. Thread `dayIndex` into `renderClusterStop()`, escape the child ID with `jsString()`, and attach the route only to expanded child rows; publish the resulting `index.html` through a new App Shell cache version.

**Tech Stack:** Vanilla ES5-compatible JavaScript in `index.html`, CSS, Node.js `assert`/`vm` regression tests, Service Worker App Shell.

## Global Constraints

- Preserve approved design: `docs/superpowers/specs/2026-07-13-home-cluster-child-navigation-design.md`.
- This is a B-level display/interaction change with an approved Tier 2 gate for `index.html` and `sw.js`.
- The parent cluster card remains non-navigable; `展開該區串點` / `收合該區串點` remains its only interaction.
- Only expanded child rows call `openTripItem(dayIndex, itemId)`.
- Ordinary non-cluster Today cards keep the existing implementation and behavior.
- Do not change Google Sheets, `schema.js`, `validator.js`, parsers, grouping, completion, skip, auto-skip, or localStorage contracts.
- Preserve Dev iOS gesture diagnostics unchanged except for reporting the new App Shell version.
- Use `jsString()` for inline child IDs and preserve `/` IDs.
- Do not add dependencies, a new navigation helper, or a separate detail button.
- Before implementation, retain the approved local design commit `9e017ee` and confirm it is the only intentional commit ahead of `origin/dev`.
- Do not push until repository-wide verification passes and Bar explicitly authorizes the Dev push checkpoint.

## File Map

- `index.html`: cluster-child renderer, tap styling, APP identity, and displayed App Shell version.
- `tests/render-note.test.js`: focused child-row routing, slash-ID, parent isolation, and ordinary-card regression assertions.
- `tests/ios-zoom-guard.test.js`: publication identity and App Shell v9 assertions while preserving diagnostic ES5 checks.
- `sw.js`: App Shell cache bump from `okayama-trip-v8` to `okayama-trip-v9`; `SHELL` remains unchanged and excludes tests.
- `04_UI_GUIDELINES.md`: record the cluster-child navigation rule.
- `07_CHANGELOG.md`: record the Dev behavior and publication identity.
- `docs/superpowers/plans/2026-07-13-home-cluster-child-navigation.md`: execution checklist and evidence.

---

### Task 1: Expanded child-row navigation

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `index.html` near `.nx-cluster-stop`, `renderClusterStop()`, and `renderClusterNextStopCard()`

**Interfaces:**
- Consumes: `openTripItem(dayIndex, itemId)`, `jsString(value)`, `clusterItemName(item)`, and existing cluster render state.
- Produces: `renderClusterStop(item, checks, progress, dayIndex) -> string`, where the returned child row routes to the matching Trip card.

- [ ] **Step 1: Add the focused functions to the rendering-test sandbox**

Add these entries to the existing `vm.runInContext([...])` function list in `tests/render-note.test.js` after `renderNextStopCard`:

```js
  extractFunction('clusterItemName'),
  extractFunction('renderClusterStop'),
  extractFunction('renderClusterNextStopCard')
```

- [ ] **Step 2: Write failing child-route and parent-isolation assertions**

Add after the existing ordinary `renderNextStopCard()` navigation assertions:

```js
sandbox.isAutoSkipped = function(){ return false; };
const clusterChildOut = sandbox.renderClusterStop({
  id:'10/19_2',
  time:'10:10',
  act:'',
  place:'廣島和平紀念資料館',
  move:'步行3分鐘',
  note:''
}, {}, {done:{},skip:{},autoSkip:{}}, 1);
assert(clusterChildOut.includes('class="nx-cluster-stop'));
assert(clusterChildOut.includes('onclick="openTripItem(1,\'10/19_2\')"'), 'expanded child opens the exact Trip item');

const clusterCardSource = extractFunction('renderClusterNextStopCard');
const parentMainSource = clusterCardSource.slice(0, clusterCardSource.indexOf('nx-cluster-expand'));
assert(!parentMainSource.includes('openTripItem'), 'cluster parent remains non-navigable');
assert(clusterCardSource.includes('renderClusterStop(item,checks,progress,dayIndex)'), 'child renderer receives the selected day');
```

The existing assertion below must remain unchanged to protect ordinary cards:

```js
assert(nextStopOut.includes('onclick="openTripItem(0,\'10/18_4\')"'));
```

- [ ] **Step 3: Run the rendering test and verify RED**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\render-note.test.js
```

Expected: FAIL because `renderClusterStop()` does not yet accept `dayIndex` or emit `openTripItem()`.

- [ ] **Step 4: Add minimal clickable styling**

Change the existing cluster-child CSS in `index.html` to:

```css
.nx-cluster-stop{display:grid;grid-template-columns:52px 1fr;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer;transition:background .15s,transform .15s}
.nx-cluster-stop:active{background:#f7f3ea;transform:scale(.99)}
```

Do not alter `.nx-cluster-stop.auto` or the child content layout.

- [ ] **Step 5: Route each expanded child row through the existing Trip navigator**

Change `renderClusterStop()` to accept `dayIndex` and add only the child-row handler:

```js
function renderClusterStop(item,checks,progress,dayIndex){
  var res=resolveRef(item);
  var meta=nextStopMeta(item,res);
  var auto=isAutoSkipped(item.id,progress);
  return '<div class="nx-cluster-stop '+(auto?'auto':'')+'" onclick="openTripItem('+dayIndex+',\''+jsString(item.id)+'\')">'+
    '<div class="nx-cluster-time">'+escapeHtml(item.time||'·')+'</div>'+ 
    '<div><div class="nx-cluster-name">'+escapeHtml(clusterItemName(item))+'</div>'+ 
      '<div class="nx-cluster-meta">'+(meta.cat?escapeHtml(meta.cat.label):'')+(meta.drive?' · '+escapeHtml(meta.drive):'')+'</div>'+ 
      (auto?'<span class="nx-cluster-status">⏱ 自動略過</span>':'')+
    '</div></div>';
}
```

Thread `dayIndex` through the expanded list call in `renderClusterNextStopCard()`:

```js
(open?'<div class="nx-cluster-list">'+cluster.items.map(function(item){ return renderClusterStop(item,checks,progress,dayIndex); }).join('')+'</div>':'')+
```

Do not add `openTripItem()` to `.nx-ticket-main`, the parent title, or `.nx-cluster-expand`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\render-note.test.js
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& $node tests\pick-next-stop.test.js
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& $node tests\home-simplification.test.js
```

Expected:

```text
renderNote tests passed
pickNextStop / auto-skip tests passed
home simplification tests passed
```

- [ ] **Step 7: Commit the independently testable behavior**

Run:

```powershell
git diff --check
git add -- index.html tests/render-note.test.js
git commit -m "feat: open cluster child itinerary details"
git rev-parse --short HEAD
```

Record the returned seven-character functional commit as `<FUNCTIONAL_HASH>` for Task 2.

---

### Task 2: Publish Dev identity, App Shell v9, and documentation

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-07-13-home-cluster-child-navigation.md`

**Interfaces:**
- Consumes: `<FUNCTIONAL_HASH>` from Task 1 and the existing `APP_BUILD` / SW diagnostic display.
- Produces: a traceable Dev build that reports the exact functional commit and uses `okayama-trip-v9`.

- [ ] **Step 1: Make publication assertions fail first**

In `tests/ios-zoom-guard.test.js`, update the App Shell expectations from v8 to v9:

```js
assert.match(sw, /okayama-trip-v9/, 'service worker cache is bumped to v9');
assert.match(html, /SW okayama-trip-v9/, 'diagnostics display v9');
assert.match(html, /gestureEnvironmentSnapshot\(navigator,query,APP_BUILD,SCHEMA\.version,'okayama-trip-v9',document\)/, 'gesture report displays v9');
```

Keep these exclusions unchanged:

```js
assert.doesNotMatch(sw, /tests\//, 'test files are not part of the App Shell');
assert.doesNotMatch(sw, /ios-gesture-diagnostics\.test\.js/, 'the diagnostic test is never cached');
```

- [ ] **Step 2: Run the publication test and verify RED**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\ios-zoom-guard.test.js
```

Expected: FAIL because production still carries `okayama-trip-v8`.

- [ ] **Step 3: Publish the functional identity and App Shell v9**

Apply these exact version changes:

```js
var APP_BUILD={channel:'DEV',code:'<FUNCTIONAL_HASH>',date:'2026-07-13'};
```

```js
var env=gestureEnvironmentSnapshot(navigator,query,APP_BUILD,SCHEMA.version,'okayama-trip-v9',document);
```

```html
<div class="diag-row">SW okayama-trip-v9</div>
```

In `sw.js`:

```js
var CACHE_NAME = 'okayama-trip-v9';
```

Do not modify the `SHELL` array.

- [ ] **Step 4: Document the interaction rule and Dev publication**

Add this bullet immediately after the existing first sentence under `04_UI_GUIDELINES.md` `## 互動`:

```markdown
- 首頁父子串點卡展開後，子卡整列可導向同日行程頁的對應卡片並展開既有資訊；父卡只負責展開／收合，非父子卡維持既有導向。
```

Add the newest entry to `07_CHANGELOG.md`, replacing `<FUNCTIONAL_HASH>` with the Task 1 hash:

```markdown
## 2026-07-13 — 首頁串點子卡詳細行程導向（Dev）
- 首頁父子串點展開後，點擊任一子卡可切換至同日行程頁、捲到對應卡片，並在有資訊面板時自動展開。
- 父卡仍只負責展開／收合；一般非父子卡、完成／跳過／自動略過與 localStorage 狀態均未改變。
- APP 顯示功能提交 `<FUNCTIONAL_HASH>`；Service Worker App Shell cache 更新為 `okayama-trip-v9`，Schema 維持 2.1。
- Dev iOS 手勢診斷器繼續保留，本功能未增加手勢攔截或 viewport 修改。
```

- [ ] **Step 5: Run repository-wide verification**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$tests=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
foreach($t in $tests){
  & $node $t.FullName
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
& $node tools\check-doc-titles.js
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
@'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(function(m){return m[1];}).filter(function(s){return s.trim();});
scripts.forEach(function(s){new Function(s);});
console.log('inline JavaScript syntax passed ('+scripts.length+' scripts)');
'@ | & $node -
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
git diff --check
git status --short
```

Expected: every test passes, document-title validation passes, all inline scripts compile, `git diff --check` is clean, and status lists only the intended Task 2 files.

- [ ] **Step 6: Commit publication metadata and documents**

Run:

```powershell
git add -- index.html sw.js tests/ios-zoom-guard.test.js 04_UI_GUIDELINES.md 07_CHANGELOG.md docs/superpowers/plans/2026-07-13-home-cluster-child-navigation.md
git commit -m "chore: publish cluster child navigation build"
git status --short --branch
```

Expected: clean working tree; local `dev` contains the approved design commit, functional commit, and publication commit.

---

### Task 3: Final verification, Dev push checkpoint, and phone evidence

**Files:**
- Verify only: repository and Git history
- Update after phone evidence: `docs/superpowers/plans/2026-07-13-home-cluster-child-navigation.md`

**Interfaces:**
- Consumes: clean Task 2 commit stack and Bar's explicit `push dev` authorization.
- Produces: matching local/remote `dev` hashes and a mobile acceptance report.

- [ ] **Step 1: Re-run the full verification immediately before push**

Repeat Task 2 Step 5 from the clean committed tree. Expected: all checks pass and `git status --porcelain` returns nothing.

- [ ] **Step 2: Stop for the Dev push checkpoint if authorization is not already explicit**

Report the exact `APP DEV · CODE <FUNCTIONAL_HASH> · 2026-07-13`, `SW okayama-trip-v9`, test evidence, and commit list. Do not push until Bar replies with an explicit Dev push instruction.

- [ ] **Step 3: Push and verify the remote hash**

After authorization, run:

```powershell
git push origin dev
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
git fetch origin dev
$local=git rev-parse dev
$remote=git rev-parse origin/dev
if($local -ne $remote){throw "origin/dev hash mismatch"}
git status --short --branch
```

Expected: `dev...origin/dev` with identical local and remote hashes.

- [ ] **Step 4: Collect phone evidence**

On the Dev PWA, verify:

1. Diagnostic panel shows the expected APP code and `SW okayama-trip-v9`.
2. Parent card still expands and collapses without leaving Today.
3. Each expanded child row opens the same day's Trip view and centers the correct child card.
4. A child with an information panel opens it; a child without one still scrolls correctly.
5. Returning to Today shows unchanged complete, skip, and auto-skip state.
6. An ordinary non-cluster Today card retains its existing full-card navigation.
7. Double-tap zoom remains non-reproducible during this functional pass; if it recurs, copy the retained gesture diagnostic report without changing this feature.

Record observed results only. Do not claim behavior not covered by phone evidence.
