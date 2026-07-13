# iOS Double-Tap Guard Stage Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent iOS Dev PWA double-tap zoom on non-interactive itinerary text while preserving pinch/rebound, existing controls, and diagnostic access, and expose an understandable Dev app code version.

**Architecture:** Replace the late second-`touchend` guard with a small single-finger gesture state machine that detects the second nearby `touchstart` within 350ms and cancels only that default gesture. Keep the existing pinch and diagnostic handlers isolated. After the functional commit exists, publish its short hash through a static `APP_BUILD` record and bump the Service Worker cache to `v5`.

**Tech Stack:** Static HTML/CSS/ES5 JavaScript, Service Worker, Node.js `assert`/`vm` tests, Git.

## Global Constraints

- Work only on `dev`; do not modify or push `main`.
- Do not change Schema, Validator, Google Sheets, parsers, sync data flow, or personal state.
- Do not remove `setupPinchZoom()` or its 0.2-second rebound.
- Do not persist `maximum-scale` or `user-scalable=no` in the viewport meta tag.
- Do not implement option C in this stage.
- Preserve the peach badge double-tap diagnostic entry point.
- Preserve button, link, form-control, single-tap, and vertical-scroll behavior.
- Use ES5-compatible production syntax (`var` and `function`); do not add dependencies.
- Set the double-tap time threshold to exactly `350` milliseconds, same-area distance to exactly `24` CSS pixels, and movement cancellation distance to exactly `10` CSS pixels.
- Display `APP DEV`, `CODE`, the Task 1 functional commit's exact seven-character short hash, and `2026-07-13` on one diagnostic row.
- Keep `SCHEMA 2.1` unchanged and bump `okayama-trip-v4` to `okayama-trip-v5`.

---

## File Structure

- Modify `index.html`: own the gesture state machine, `APP_BUILD` metadata, and diagnostic rendering.
- Modify `tests/ios-zoom-guard.test.js`: provide deterministic unit coverage for gesture classification, regression constraints, APP metadata, and SW version.
- Modify `sw.js`: invalidate the old App Shell by changing only the cache name from `v4` to `v5`.
- Modify `04_UI_GUIDELINES.md`: record the accepted one-finger double-tap behavior and the option-C approval gate.
- Modify `07_CHANGELOG.md`: record the code and mobile-validation handoff for this batch.
- Modify this plan at completion: mark executed steps and record verification evidence without changing the approved design.

### Task 1: Block the second nearby single-finger touch before WebKit zoom recognition

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html` near `setupDoubleTapGuard()`

**Interfaces:**
- Consumes: DOM `touchstart`, `touchmove`, and `touchcancel` events; existing interactive selector contract.
- Produces: `isDoubleTapInteractive(target) -> boolean`, `touchDistance(a, b) -> number`, and `setupDoubleTapGuard() -> void`.

- [ ] **Step 1: Extend the test harness and add failing gesture tests**

Add the following test block before the final `console.log` in `tests/ios-zoom-guard.test.js`:

```js
assert.match(html, /function isDoubleTapInteractive\(/, 'interactive double-tap targets have a named classifier');
assert.match(html, /function touchDistance\(/, 'double-tap distance has a named helper');

const touchListeners = {};
const clock = { now:1000 };
const touchSandbox = {
  Date: { now:function(){ return clock.now; } },
  Math: Math,
  document: {
    addEventListener:function(type,fn,options){ touchListeners[type]={fn:fn,options:options}; }
  }
};
vm.createContext(touchSandbox);
vm.runInContext(extractFunction('isDoubleTapInteractive'), touchSandbox);
vm.runInContext(extractFunction('touchDistance'), touchSandbox);
vm.runInContext(extractFunction('setupDoubleTapGuard'), touchSandbox);
touchSandbox.setupDoubleTapGuard();

function target(interactive){
  return { closest:function(){ return interactive?{}:null; } };
}
function start(x,y,count,interactive){
  let prevented=false;
  const touches=[];
  for(let i=0;i<count;i++) touches.push({clientX:x+i*20,clientY:y});
  touchListeners.touchstart.fn({
    touches:touches,
    target:target(interactive),
    preventDefault:function(){ prevented=true; }
  });
  return prevented;
}
function move(x,y,count){
  const touches=[];
  for(let i=0;i<count;i++) touches.push({clientX:x+i*20,clientY:y});
  touchListeners.touchmove.fn({touches:touches});
}

assert.strictEqual(touchListeners.touchstart.options.passive,false, 'touchstart can cancel WebKit zoom');
assert.strictEqual(start(100,100,1,false),false, 'first non-interactive tap is allowed');
clock.now=1200;
assert.strictEqual(start(110,108,1,false),true, 'nearby second tap within 350ms is blocked');

clock.now=2000;
assert.strictEqual(start(100,100,1,false),false);
clock.now=2400;
assert.strictEqual(start(100,100,1,false),false, 'tap after 350ms is allowed');

clock.now=3000;
assert.strictEqual(start(100,100,1,false),false);
clock.now=3200;
assert.strictEqual(start(140,100,1,false),false, 'second tap beyond 24px is allowed');

clock.now=4000;
assert.strictEqual(start(100,100,1,false),false);
move(120,100,1);
clock.now=4200;
assert.strictEqual(start(100,100,1,false),false, 'movement beyond 10px cancels the candidate');

clock.now=5000;
assert.strictEqual(start(100,100,2,false),false, 'two-finger pinch start is never blocked');
clock.now=5100;
assert.strictEqual(start(100,100,1,true),false, 'interactive targets are never blocked by the general guard');
assert.match(extractFunction('isDoubleTapInteractive'), /#diagnosticBadge/, 'peach badge remains excluded');
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing helpers**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
```

Expected: FAIL at `interactive double-tap targets have a named classifier` because the old implementation has no named classifier or distance helper.

- [ ] **Step 3: Replace the old double-tap guard with the minimal state machine**

Replace the existing one-line `setupDoubleTapGuard()` in `index.html` with:

```js
function isDoubleTapInteractive(target){
  return !!(target&&target.closest&&target.closest('button,a,input,select,textarea,[onclick],#diagnosticBadge'));
}
function touchDistance(a,b){
  var dx=a.x-b.x,dy=a.y-b.y;
  return Math.hypot(dx,dy);
}
function setupDoubleTapGuard(){
  var lastTap=null;
  function clearCandidate(){ lastTap=null; }
  document.addEventListener('touchstart',function(e){
    if(!e.touches||e.touches.length!==1||isDoubleTapInteractive(e.target)){ clearCandidate(); return; }
    var touch=e.touches[0];
    var point={x:touch.clientX,y:touch.clientY,time:Date.now()};
    if(lastTap&&point.time-lastTap.time<=350&&touchDistance(lastTap,point)<=24){
      e.preventDefault();
      clearCandidate();
      return;
    }
    lastTap=point;
  },{passive:false});
  document.addEventListener('touchmove',function(e){
    if(!lastTap) return;
    if(!e.touches||e.touches.length!==1){ clearCandidate(); return; }
    if(touchDistance(lastTap,{x:e.touches[0].clientX,y:e.touches[0].clientY})>10) clearCandidate();
  },{passive:true});
  document.addEventListener('touchcancel',clearCandidate,{passive:true});
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
```

Expected: `iOS zoom guard tests passed`.

- [ ] **Step 5: Review the Task 1 diff and commit the functional change**

Run:

```powershell
git diff --check
git diff -- index.html tests/ios-zoom-guard.test.js
git add -- index.html tests/ios-zoom-guard.test.js
git commit -m "fix: block iOS double-tap before zoom"
git rev-parse --short=7 HEAD
```

Expected: commit succeeds and the final command prints exactly seven hexadecimal characters. Save that exact output as `$functionalCommit` for Task 2; it is the CODE value, not a placeholder or the later metadata commit.

### Task 2: Expose the functional App code version and invalidate the old shell

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html` near the main app constants and `openDiagnostics()`
- Modify: `sw.js:9`

**Interfaces:**
- Consumes: Task 1's exact seven-character `$functionalCommit` value.
- Produces: global `APP_BUILD = {channel:string, code:string, date:string}` and a diagnostic row containing the exact Task 1 short hash.

- [ ] **Step 1: Read and validate the functional commit value**

Run immediately after Task 1:

```powershell
$functionalCommit=(git rev-parse --short=7 HEAD).Trim()
if($functionalCommit -notmatch '^[0-9a-f]{7}$'){ throw "Invalid functional commit: $functionalCommit" }
$functionalCommit
```

Expected: the same seven-character value printed at the end of Task 1.

- [ ] **Step 2: Add failing APP metadata and v5 assertions**

In `tests/ios-zoom-guard.test.js`, replace both `v4` assertions with `v5` and add these assertions directly after them:

```js
assert.match(html, /var APP_BUILD=\{channel:'DEV',code:'[0-9a-f]{7}',date:'2026-07-13'\}/, 'APP build metadata is explicit');
assert.match(html, /APP ['"]?\+?escapeHtml\(APP_BUILD\.channel\)/, 'diagnostics render the APP channel from metadata');
assert.match(html, /CODE ['"]?\+?escapeHtml\(APP_BUILD\.code\)/, 'diagnostics render the functional code commit');
assert.match(html, /escapeHtml\(APP_BUILD\.date\)/, 'diagnostics render the build date');
```

- [ ] **Step 3: Run the focused test and verify the version assertions fail**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
```

Expected: FAIL at `service worker cache is bumped to v5` because source still contains `okayama-trip-v4`.

- [ ] **Step 4: Insert exact APP metadata and update diagnostics**

Generate the exact production line from the validated Task 1 value:

```powershell
$appBuildLine="var APP_BUILD={channel:'DEV',code:'$functionalCommit',date:'2026-07-13'};"
$appBuildLine
```

Expected: one complete JavaScript line containing the exact seven-character functional commit. Using `apply_patch`, insert that exact printed line beside the existing main app constants in `index.html`, then verify the resulting source with:

```powershell
rg -n "var APP_BUILD" index.html
```

Then change the diagnostic version section to render three separate rows:

```js
'<div class="diag-section"><h3>版本</h3>'+
'<div class="diag-row">APP '+escapeHtml(APP_BUILD.channel)+' · CODE '+escapeHtml(APP_BUILD.code)+' · '+escapeHtml(APP_BUILD.date)+'</div>'+
'<div class="diag-row">SCHEMA '+escapeHtml(SCHEMA.version)+'</div>'+
'<div class="diag-row">SW okayama-trip-v5</div></div>'+
```

- [ ] **Step 5: Bump only the Service Worker cache name**

In `sw.js`, change:

```js
var CACHE_NAME = 'okayama-trip-v4';
```

to:

```js
var CACHE_NAME = 'okayama-trip-v5';
```

- [ ] **Step 6: Run the focused test and verify it passes**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
```

Expected: `iOS zoom guard tests passed`.

- [ ] **Step 7: Verify CODE points to Task 1, not the pending Task 2 commit**

Run:

```powershell
$sourceCode=(Select-String -Path index.html -Pattern "var APP_BUILD=\{channel:'DEV',code:'([0-9a-f]{7})'" ).Matches[0].Groups[1].Value
if($sourceCode -ne $functionalCommit){ throw "APP CODE $sourceCode does not match functional commit $functionalCommit" }
```

Expected: no output and exit code 0.

- [ ] **Step 8: Review and commit the version metadata and shell invalidation**

Run:

```powershell
git diff --check
git diff -- index.html sw.js tests/ios-zoom-guard.test.js
git add -- index.html sw.js tests/ios-zoom-guard.test.js
git commit -m "chore: expose dev app build"
```

Expected: commit succeeds. The diagnostic CODE remains the Task 1 functional commit by design.

### Task 3: Record the accepted behavior and complete repository verification

**Files:**
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-07-13-ios-double-tap-guard-stage-two.md`

**Interfaces:**
- Consumes: Task 1 gesture behavior and Task 2 APP/SW version values.
- Produces: durable governance notes and an auditable verification record.

- [ ] **Step 1: Update the UI guideline with exact gesture policy**

Append these requirements to the existing iOS touch/zoom section in `04_UI_GUIDELINES.md`:

```markdown
- 非互動文字或空白區的單指雙擊防護，必須在第二次 `touchstart` 以 350ms／24px 門檻判斷；移動超過 10px 即取消候選。
- 兩指以上手勢、桃子診斷徽章、按鈕、連結及表單控制項不得由一般雙擊防護攔截。
- 若 Dev 手機仍可重現雙擊放大，先重新蒐集 iOS／PWA 事件證據；不得自動改採永久 `maximum-scale` 或 `user-scalable=no`。方案 C 必須由 Bar 另案明確核准。
```

- [ ] **Step 2: Add the changelog entry**

At the top of `07_CHANGELOG.md`'s change entries, add:

```markdown
## 2026-07-13 — iOS 雙擊防放大第二階段（Dev）

- 將非互動區雙擊防護提前至第二次單指 `touchstart`，加入 350ms、24px 及 10px 移動取消門檻。
- 保留捏合回彈、桃子徽章、互動元件及輸入框 focus／blur 行為。
- Service Worker App Shell cache 升至 `okayama-trip-v5`。
- 自動測試通過；最終雙擊行為待 Bar 於 iPhone Dev PWA 驗證。
```

Generate the remaining changelog bullet with the already validated value:

```powershell
$changelogBuildLine="- 診斷面板新增 ``APP DEV · CODE $functionalCommit · 2026-07-13``，Schema 獨立顯示。"
$changelogBuildLine
```

Expected: a complete markdown bullet containing the exact Task 1 functional commit. Insert that exact line with `apply_patch` between the second and Service Worker bullets.

- [ ] **Step 3: Run all repository checks available in this project**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
& $node tools/check-doc-titles.js
git diff --check
git status --short
```

Expected:

- `iOS zoom guard tests passed`
- `✅ 文件標題/檔名一致性檢查通過`
- `git diff --check` prints nothing.
- `git status --short` lists only `04_UI_GUIDELINES.md`, `07_CHANGELOG.md`, and this plan file.

- [ ] **Step 4: Record completion evidence in this plan**

After this task's verification commands pass, add a final `## Execution Record` section containing the exact Task 1 functional commit, Task 2 metadata commit, test outputs, and the statement `iPhone Dev PWA final verification: pending Bar`.

- [ ] **Step 5: Commit the documentation and execution record**

Run:

```powershell
git add -- 04_UI_GUIDELINES.md 07_CHANGELOG.md docs/superpowers/plans/2026-07-13-ios-double-tap-guard-stage-two.md
git commit -m "docs: record iOS double-tap guard stage two"
git status --short
```

Expected: commit succeeds and the final status is clean.

### Task 4: Pre-push release gate and Dev handoff

**Files:**
- Verify only; no source edits expected.

**Interfaces:**
- Consumes: all commits and verification evidence from Tasks 1–3.
- Produces: a push-ready `dev` branch and a phone-validation checklist; pushing still requires the user's explicit instruction.

- [ ] **Step 1: Re-run the final tests from a clean tree**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
& $node tools/check-doc-titles.js
git diff --check
git status --short
```

Expected: both test messages pass, diff check is silent, and working tree is clean.

- [ ] **Step 2: Verify branch and remote relationship**

Run:

```powershell
git fetch origin --prune
git branch --show-current
git rev-list --left-right --count origin/dev...HEAD
git log --oneline origin/dev..HEAD
```

Expected: branch is `dev`; left/right count has zero remote-only commits and the expected local design/implementation commits are listed as local-only.

- [ ] **Step 3: Report risks and request the push gate**

Report:

- Scheme A was implemented; option C was not implemented.
- Pinch/rebound, peach badge, interactive controls, and focus/blur remain in scope for phone regression testing.
- Automated tests cannot prove native iOS WebKit gesture behavior.
- APP CODE identifies the functional commit while the branch HEAD may be a later metadata/docs commit.
- No push occurs until the user explicitly instructs Codex to push `dev`.

- [ ] **Step 4: After explicit push approval, push only dev and hand off the phone checklist**

Run only after approval:

```powershell
git push origin dev
```

Expected: push succeeds for `dev`; do not push or merge `main`.

Phone checklist:

1. Double-tap `9:00`, `check in`, and `第一航廈1樓`: no zoom.
2. Double-tap an empty itinerary-card area: no zoom.
3. Single tap and vertical scrolling: normal.
4. Pinch and rebound: normal.
5. Peach badge double-tap: diagnostics open.
6. Input focus/blur: normal.
7. Diagnostics show `APP DEV`, `CODE`, the exact Task 1 seven-character hash, `2026-07-13`, `SCHEMA 2.1`, and `SW okayama-trip-v5`.
8. `healthCheck()`: normal.
