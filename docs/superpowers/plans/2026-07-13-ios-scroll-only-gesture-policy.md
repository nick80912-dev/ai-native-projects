# iOS Scroll-only Gesture Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all App zoom and rebound behavior, preserve native horizontal and vertical scrolling, and eliminate the conflicting WebKit viewport plus `.wrap` transform zoom paths.

**Architecture:** Declare one root gesture policy with `touch-action: pan-x pan-y`, remove both custom zoom handlers and their state, and leave WebKit responsible only for panning. Keep form-focus recovery and the peach diagnostic gesture isolated. Publish the functional commit through `APP_BUILD` and invalidate the old App Shell with Service Worker `v6`.

**Tech Stack:** Static HTML/CSS/ES5 JavaScript, Service Worker, Node.js `assert`/`vm` tests, Git.

## Global Constraints

- Work only on `dev`; do not modify or push `main`.
- Remove all pinch zoom, double-tap zoom, and custom rebound behavior.
- Preserve native vertical page scrolling and horizontal list scrolling.
- Preserve the peach badge double-tap diagnostic entry point.
- Preserve 16px form controls and `restoreFocusZoom()` / `setupViewportReflow()` focus recovery.
- Do not add permanent `maximum-scale` or `user-scalable=no` to the viewport meta tag.
- Do not create another JavaScript pan/zoom engine or diagnostic instrumentation in this batch.
- Do not change Schema, Validator, Google Sheets, renderers, sync data flow, or personal state.
- Use ES5-compatible production syntax and add no dependencies.
- Replace root `touch-action: manipulation` with exactly `touch-action:pan-x pan-y` on `html,body`.
- Remove `setupPinchZoom`, `pinch-zooming`, `setupDoubleTapGuard`, `isDoubleTapInteractive`, and `touchDistance` from production source.
- Update APP CODE to the exact seven-character Task 1 functional commit and keep date `2026-07-13`.
- Keep `SCHEMA 2.1` unchanged and bump `okayama-trip-v5` to `okayama-trip-v6`.

---

## File Structure

- Modify `index.html`: own the Scroll-only CSS policy, remove obsolete zoom JavaScript, preserve diagnostics and focus recovery, and expose APP metadata.
- Modify `tests/ios-zoom-guard.test.js`: convert the previous zoom behavior tests into negative regression assertions for removed code plus positive Scroll-only assertions.
- Modify `sw.js`: invalidate `v5` App Shell with `v6`.
- Modify `04_UI_GUIDELINES.md`: replace the previous pinch/rebound policy with the approved Scroll-only invariant.
- Modify `07_CHANGELOG.md`: record the failed stage-two phone result and adopted stage-three policy.
- Modify this plan during execution: mark completed steps and append exact verification evidence.

### Task 1: Replace dual zoom ownership with Scroll-only CSS

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html:38-40,476,2471-2504`

**Interfaces:**
- Consumes: WebKit CSS `touch-action` gesture arbitration.
- Produces: root policy `html,body{touch-action:pan-x pan-y}` with no production JavaScript zoom state.

- [ ] **Step 1: Replace old gesture tests with failing Scroll-only assertions**

In `tests/ios-zoom-guard.test.js`, replace the old manipulation assertion and named double-tap assertion near the top with:

```js
assert.match(html, /html\s*,\s*body\s*\{[^}]*touch-action\s*:\s*pan-x\s+pan-y/i, 'root policy allows panning without zoom');
assert.doesNotMatch(html, /touch-action\s*:\s*manipulation/i, 'manipulation no longer permits continuous zoom');
assert.doesNotMatch(html, /function setupPinchZoom\(/, 'custom pinch transform is removed');
assert.doesNotMatch(html, /pinch-zooming/, 'custom pinch CSS state is removed');
assert.doesNotMatch(html, /function setupDoubleTapGuard\(/, 'failed double-tap JavaScript guard is removed');
assert.doesNotMatch(html, /function isDoubleTapInteractive\(/, 'double-tap classifier is removed');
assert.doesNotMatch(html, /function touchDistance\(/, 'double-tap distance helper is removed');
assert.match(html, /function setupDiagnostics\(/, 'peach diagnostic gesture remains available');
assert.match(html, /function setupViewportReflow\(/, 'form focus recovery remains available');
```

Delete the test block beginning with:

```js
assert.match(html, /function isDoubleTapInteractive\(/, 'interactive double-tap targets have a named classifier');
```

and ending with:

```js
assert.match(extractFunction('isDoubleTapInteractive'), /#diagnosticBadge/, 'peach badge remains excluded');
```

Keep all form-size, viewport-meta, APP/SW, and `restoreFocusZoom()` tests unchanged.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests/ios-zoom-guard.test.js
```

Expected: FAIL at `root policy allows panning without zoom` because production still uses `touch-action:manipulation`.

- [ ] **Step 3: Apply the minimal Scroll-only production change**

In `index.html`, replace:

```css
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
html{scroll-behavior:smooth;touch-action:manipulation}
html,body{touch-action:manipulation}
```

with:

```css
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
html,body{touch-action:pan-x pan-y}
```

Delete this CSS rule completely:

```css
.wrap.pinch-zooming{will-change:transform}
```

Delete the complete production functions:

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
function setupPinchZoom(){ var wrap=document.querySelector('.wrap'),start=0,active=false; if(!wrap) return; function reset(){ if(!active) return; active=false; wrap.style.transition='transform .2s'; wrap.style.transform='scale(1)'; setTimeout(function(){wrap.style.transition='';wrap.classList.remove('pinch-zooming');},200); } document.addEventListener('touchstart',function(e){ if(e.touches.length===2){ start=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); active=true; wrap.classList.add('pinch-zooming'); } else if(e.touches.length>2) reset(); },{passive:false}); document.addEventListener('touchmove',function(e){ if(!active||e.touches.length!==2) return; e.preventDefault(); var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); wrap.style.transform='scale('+Math.min(2.5,Math.max(1,d/start))+')'; },{passive:false}); document.addEventListener('touchend',reset,{passive:false}); if(window.GestureEvent) document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false}); }
```

Delete only these two startup calls, leaving diagnostics and viewport setup in their existing order:

```js
setupPinchZoom();
setupDoubleTapGuard();
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
```

Expected: `iOS zoom guard tests passed`.

- [ ] **Step 5: Review and commit the functional change**

Run:

```powershell
git diff --check
git diff -- index.html tests/ios-zoom-guard.test.js
git add -- index.html tests/ios-zoom-guard.test.js
git commit -m "fix: adopt iOS scroll-only gestures"
git rev-parse --short=7 HEAD
```

Expected: commit succeeds and the final command prints the exact seven-character functional commit. Preserve it as `$functionalCommit` for Task 2.

### Task 2: Publish the new functional CODE and App Shell v6

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html:842,2444-2446`
- Modify: `sw.js:9`

**Interfaces:**
- Consumes: Task 1 `$functionalCommit`.
- Produces: `APP_BUILD.code` equal to Task 1 and Service Worker cache `okayama-trip-v6`.

- [ ] **Step 1: Read and validate Task 1 CODE**

Run:

```powershell
$functionalCommit=(git rev-parse --short=7 HEAD).Trim()
if($functionalCommit -notmatch '^[0-9a-f]{7}$'){ throw "Invalid functional commit: $functionalCommit" }
$functionalCommit
```

Expected: exactly seven hexadecimal characters.

- [ ] **Step 2: Write failing v6 tests**

In `tests/ios-zoom-guard.test.js`, replace both `okayama-trip-v5` expectations with `okayama-trip-v6`. Keep the existing APP metadata and diagnostic rendering assertions.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
```

Expected: FAIL at `service worker cache is bumped to v5` or its updated v6 message because source still contains v5.

- [ ] **Step 4: Update APP metadata, diagnostics, and SW cache**

Generate the exact APP line:

```powershell
$appBuildLine="var APP_BUILD={channel:'DEV',code:'$functionalCommit',date:'2026-07-13'};"
$appBuildLine
```

Using `apply_patch`, replace the existing `var APP_BUILD=...;` line with the exact printed line. Replace `SW okayama-trip-v5` with `SW okayama-trip-v6` in diagnostics. In `sw.js`, replace:

```js
var CACHE_NAME = 'okayama-trip-v5';
```

with:

```js
var CACHE_NAME = 'okayama-trip-v6';
```

- [ ] **Step 5: Verify APP CODE and run GREEN**

Run:

```powershell
$sourceCode=(Select-String -Path index.html -Pattern "var APP_BUILD=\{channel:'DEV',code:'([0-9a-f]{7})'" ).Matches[0].Groups[1].Value
if($sourceCode -ne $functionalCommit){ throw "APP CODE $sourceCode does not match functional commit $functionalCommit" }
& $node tests/ios-zoom-guard.test.js
```

Expected: CODE check exits 0 and test prints `iOS zoom guard tests passed`.

- [ ] **Step 6: Commit metadata and shell invalidation**

Run:

```powershell
git diff --check
git add -- index.html sw.js tests/ios-zoom-guard.test.js
git commit -m "chore: publish scroll-only app build"
git rev-parse --short=7 HEAD
```

Expected: metadata commit succeeds; diagnostics CODE remains Task 1 by design.

### Task 3: Update governance and execution evidence

**Files:**
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-07-13-ios-scroll-only-gesture-policy.md`

**Interfaces:**
- Consumes: Task 1 CODE and Task 2 metadata commit.
- Produces: durable Scroll-only policy and auditable verification record.

- [ ] **Step 1: Replace the old UI gesture policy**

In `04_UI_GUIDELINES.md`, replace the complete `## 行動手勢` bullet list with:

```markdown
## 行動手勢
- App 採單一 Scroll-only 政策：`html,body { touch-action:pan-x pan-y; }`，只允許水平與垂直捲動，不提供雙擊或捏合縮放。
- 禁止恢復 `.wrap` transform 縮放、回彈、`setupPinchZoom()` 或 JavaScript 雙擊攔截器，避免與 WebKit visual viewport 形成雙重縮放狀態。
- 輸入框 focus 造成縮放殘留時，仍只允許 viewport「瞬鎖約 100ms → 原始字串還原」；`maximum-scale` 與 `user-scalable=no` 不得常駐。
- 桃子診斷徽章、按鈕、連結、表單控制項、垂直頁面捲動及水平清單捲動必須保持正常。
- 若 Dev 手機仍出現縮放或跑版，下一步只能發布事件／`visualViewport` 診斷 Build；不得自動疊加 viewport 硬鎖或恢復自製縮放。
```

- [ ] **Step 2: Add the stage-three changelog entry**

At the top of `07_CHANGELOG.md` entries, insert:

```markdown
## 2026-07-13 — iOS Scroll-only 手勢政策（Dev）
- 實機確認第二階段雙擊攔截仍無效，且原生 viewport 與 `.wrap` transform 同時縮放造成偶發偏移及右側留白。
- 移除自製捏合回彈與 JavaScript 雙擊攔截，根層改為 `touch-action:pan-x pan-y`，只保留水平／垂直捲動。
- 保留桃子診斷徽章、表單 16px 下限及 focus／blur viewport 還原。
- Service Worker App Shell cache 升至 `okayama-trip-v6`；Schema 維持 2.1。
- 自動測試通過；最終手勢結果待 Bar 於 iPhone Dev PWA 驗證。
```

Generate the exact APP bullet and insert it before the Service Worker bullet:

```powershell
$changelogBuildLine="- 診斷面板更新為 ``APP DEV · CODE $functionalCommit · 2026-07-13``。"
$changelogBuildLine
```

- [ ] **Step 3: Run all repository checks**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
& $node tools/check-doc-titles.js
git diff --check
git status --short
```

Expected: both test messages pass, diff check is silent, and status lists only the two governance files plus this plan.

- [ ] **Step 4: Append the execution record**

Append `## Execution Record` to this plan with the exact Task 1 functional commit, Task 2 metadata commit, both passing test messages, `git diff --check: passed`, and `iPhone Dev PWA final verification: pending Bar`.

- [ ] **Step 5: Commit governance documentation**

Run:

```powershell
git add -- 04_UI_GUIDELINES.md 07_CHANGELOG.md docs/superpowers/plans/2026-07-13-ios-scroll-only-gesture-policy.md
git commit -m "docs: record iOS scroll-only gesture policy"
git status --short
```

Expected: commit succeeds and working tree is clean.

### Task 4: Final release gate and Dev handoff

**Files:**
- Verify only; no source edit expected.

**Interfaces:**
- Consumes: all Task 1–3 commits.
- Produces: verified push-ready `dev`; push requires explicit user approval.

- [ ] **Step 1: Run fresh final verification**

Run:

```powershell
& $node tests/ios-zoom-guard.test.js
& $node tools/check-doc-titles.js
git diff --check
git status --short
```

Expected: both checks pass, diff check is silent, and working tree is clean.

- [ ] **Step 2: Verify remote relationship**

Run:

```powershell
git fetch origin --prune
git branch --show-current
git rev-list --left-right --count origin/dev...HEAD
git log --oneline origin/dev..HEAD
```

Expected: branch is `dev`, zero remote-only commits, and only approved design/plan/implementation commits are local-only.

- [ ] **Step 3: Stop at the push gate**

Report that automated tests cannot prove native iOS gesture behavior, option C-R is implemented without permanent viewport hard lock, APP CODE identifies Task 1, and no push has occurred.

- [ ] **Step 4: Push only after explicit approval**

Run only after approval:

```powershell
git push origin dev
```

Expected: only `dev` updates; do not push or merge `main`.

Phone checklist:

1. Double-tap itinerary text, blank card space, and the gray no-time marker: no zoom.
2. Pinch inward and outward: no zoom, rebound, offset, or right-side blank area.
3. Vertical page scrolling: normal.
4. Horizontal date/filter scrolling: normal.
5. Peach badge double-tap: diagnostics open.
6. Buttons, links, and check-in controls: normal.
7. Input focus/blur: normal.
8. Diagnostics show the new APP CODE, `SCHEMA 2.1`, `SW okayama-trip-v6`, and normal `healthCheck()`.
