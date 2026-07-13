# iOS Double-Tap Diagnostic Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a behavior-neutral Dev diagnostic build that captures the event and viewport evidence produced by one reproducible iOS double-tap zoom.

**Architecture:** Add an in-memory 24-entry ring buffer and pure snapshot/format helpers beside the existing diagnostic functions in `index.html`. Register passive observers for touch, gesture, dblclick, and visual viewport resize events, then expose the captured evidence in the existing peach diagnostic panel without changing gesture ownership, viewport policy, renderers, storage, or data flow.

**Tech Stack:** Vanilla ES5 JavaScript, HTML/CSS, Node built-in `assert`, Service Worker.

## Global Constraints

- Work on `dev`; preserve local design commit `bd0aefd` and do not touch `main`.
- Keep `html,body{touch-action:pan-x pan-y}`.
- Do not add `maximum-scale`, `minimum-scale`, or `user-scalable=no`.
- Do not restore `setupPinchZoom()`, `setupDoubleTapGuard()`, `.wrap` zoom, or rebound behavior.
- Diagnostic observers must not call `preventDefault()`, `stopPropagation()`, change viewport metadata, set transforms, render App views, or write storage.
- Retain at most 24 records in memory; never record text content, form values, or URLs.
- Do not change Schema 2.1, Google Sheets, CSV parsing, sync ownership, BUILTIN data, or localStorage state.
- Create the functional commit before writing its seven-character hash to `APP_BUILD.code`.
- Diagnostic production code must use ES5 `function`/`var`; do not use arrow functions, template literals, `const`, or `let`.
- Keep every `tests/` file, including `tests/ios-gesture-diagnostics.test.js`, out of the `sw.js` `SHELL` list.
- Publish metadata through `okayama-trip-v8` and push `dev` after full verification; Bar explicitly authorized `push dev` in the supplemental instruction.

---

### Task 1: In-memory diagnostic model and viewport snapshots

**Files:**
- Create: `tests/ios-gesture-diagnostics.test.js`
- Modify: `index.html` diagnostic function section near `closeDiagnostics()`

**Interfaces:**
- Consumes: an event-like object, `window`, `document`, and a snapshot callback.
- Produces: `gestureTargetSummary(target)`, `gestureComputedTouchAction(win,element)`, `gestureViewportSnapshot(type,event,win,doc)`, and `createGestureDiagnostics(limit,snapshotter)`.

- [ ] **Step 1: Write failing core-model tests**

Create `tests/ios-gesture-diagnostics.test.js` with the existing `extractFunction()` pattern and these assertions:

```js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name){
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start), depth = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') depth++;
    if(html[i] === '}') depth--;
    if(depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction('gestureTargetSummary'),
  extractFunction('gestureComputedTouchAction'),
  extractFunction('gestureViewportSnapshot'),
  extractFunction('createGestureDiagnostics')
].join('\n'), sandbox);

const target = { tagName:'DIV', className:'item secret extra', diagnosticTouchAction:'manipulation', textContent:'private', value:'private', href:'https://private' };
assert.strictEqual(sandbox.gestureTargetSummary(target), 'div.item.secret');

const fakeWindow = {
  innerWidth:390, innerHeight:844, scrollX:0, scrollY:210,
  visualViewport:{ width:390, height:760, scale:1, offsetLeft:0, offsetTop:0 },
  getComputedStyle:function(el){ return {touchAction:el.diagnosticTouchAction}; }
};
const fakeDocument = {
  documentElement:{ clientWidth:390, scrollWidth:390, diagnosticTouchAction:'pan-x pan-y' },
  body:{ diagnosticTouchAction:'pan-x pan-y' }
};
const snap = sandbox.gestureViewportSnapshot('touchend', {
  timeStamp:123, touches:[], changedTouches:[{}], cancelable:true,
  defaultPrevented:false, target:target
}, fakeWindow, fakeDocument);
assert.strictEqual(snap.type, 'touchend');
assert.strictEqual(snap.target, 'div.item.secret');
assert.strictEqual(snap.vvScale, 1);
assert.strictEqual(snap.docScrollWidth, 390);
assert.strictEqual(snap.taHtml, 'pan-x pan-y');
assert.strictEqual(snap.taBody, 'pan-x pan-y');
assert.strictEqual(snap.taTarget, 'manipulation');
assert(!JSON.stringify(snap).includes('private'));

const oldWebView = sandbox.gestureViewportSnapshot('dblclick', {}, {
  innerWidth:320, innerHeight:568, scrollX:0, scrollY:0
}, fakeDocument);
assert.strictEqual(oldWebView.vvScale, null);

const throwingWindow = {getComputedStyle:function(){ throw new Error('unsupported'); }};
assert.strictEqual(sandbox.gestureComputedTouchAction(throwingWindow,target), 'n/a');

const ring = sandbox.createGestureDiagnostics(24, function(type){ return {type:type}; });
for(let i=0;i<30;i++) ring.record('event-' + i, {});
assert.strictEqual(ring.list().length, 24);
assert.strictEqual(ring.list()[0].type, 'event-6');
assert.strictEqual(ring.list()[23].type, 'event-29');
ring.clear();
assert.strictEqual(ring.list().length, 0);
console.log('iOS gesture diagnostic core tests passed');
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
& 'C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tests\ios-gesture-diagnostics.test.js
```

Expected: FAIL with `gestureTargetSummary exists` because no diagnostic model exists.

- [ ] **Step 3: Implement the minimal pure helpers**

Add these ES5 helpers before `openDiagnostics()`:

```js
function gestureTargetSummary(target){
  if(!target) return 'unknown';
  var tag=String(target.tagName||'unknown').toLowerCase();
  var cls=String(target.className||'').trim().split(/\s+/).filter(Boolean).slice(0,2);
  return tag+(cls.length?'.'+cls.join('.'):'');
}
function gestureComputedTouchAction(win,element){
  try{
    if(!win||!win.getComputedStyle||!element) return 'n/a';
    var value=win.getComputedStyle(element).touchAction;
    return value?String(value):'n/a';
  }catch(e){ return 'n/a'; }
}
function gestureViewportSnapshot(type,event,win,doc){
  event=event||{}; win=win||{}; doc=doc||{};
  var root=doc.documentElement||{}, vv=win.visualViewport||null;
  return {
    time:Math.round(Number(event.timeStamp)||0), type:type,
    touches:event.touches?event.touches.length:null,
    changedTouches:event.changedTouches?event.changedTouches.length:null,
    cancelable:!!event.cancelable, defaultPrevented:!!event.defaultPrevented,
    target:gestureTargetSummary(event.target),
    innerWidth:Number(win.innerWidth)||0, innerHeight:Number(win.innerHeight)||0,
    scrollX:Number(win.scrollX)||0, scrollY:Number(win.scrollY)||0,
    docClientWidth:Number(root.clientWidth)||0, docScrollWidth:Number(root.scrollWidth)||0,
    vvWidth:vv?Number(vv.width)||0:null, vvHeight:vv?Number(vv.height)||0:null,
    vvScale:vv?Number(vv.scale)||0:null,
    vvOffsetLeft:vv?Number(vv.offsetLeft)||0:null,
    vvOffsetTop:vv?Number(vv.offsetTop)||0:null,
    taHtml:gestureComputedTouchAction(win,root),
    taBody:gestureComputedTouchAction(win,doc.body),
    taTarget:gestureComputedTouchAction(win,event.target)
  };
}
function createGestureDiagnostics(limit,snapshotter){
  var records=[], cap=Math.max(1,Number(limit)||24);
  return {
    record:function(type,event){
      records.push(snapshotter(type,event));
      if(records.length>cap) records.splice(0,records.length-cap);
    },
    list:function(){ return records.slice(); },
    clear:function(){ records=[]; }
  };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: `iOS gesture diagnostic core tests passed`.

### Task 2: Passive observer wiring and environment export

**Files:**
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Modify: `index.html` startup diagnostic section

**Interfaces:**
- Consumes: Task 1 helpers, `APP_BUILD`, `SCHEMA.version`, `navigator`, `matchMedia`, and `window.visualViewport`.
- Produces: `IOS_GESTURE_DIAGNOSTICS`, `setupGestureDiagnostics(doc,win,store)`, `runtimeViewportMeta(doc)`, `gestureEnvironmentSnapshot(...)`, and `formatGestureDiagnostics(...)`.

- [ ] **Step 1: Add failing observer and export tests**

Append assertions that require:

```js
const setupSource = extractFunction('setupGestureDiagnostics');
assert(!/preventDefault|stopPropagation|setAttribute|\.style\.|localStorage|lsSet/.test(setupSource));
assert.match(setupSource, /\{passive:true\}/);
['touchstart','touchend','gesturestart','gestureend','dblclick'].forEach(function(type){
  assert(setupSource.includes("'" + type + "'"), type + ' is observed');
});
assert(setupSource.includes("'resize'"), 'visual viewport resize is observed');

vm.runInContext([
  extractFunction('runtimeViewportMeta'),
  extractFunction('gestureEnvironmentSnapshot'),
  extractFunction('formatGestureDiagnostics')
].join('\n'), sandbox);
const env = sandbox.gestureEnvironmentSnapshot(
  {userAgent:'Test iPhone',standalone:true},
  {matches:true},
  {channel:'DEV',code:'abcdef0',date:'2026-07-13'},
  '2.1 (2026-07-10)',
  'okayama-trip-v8',
  {querySelector:function(){ return {getAttribute:function(){ return 'width=device-width, initial-scale=1.0, viewport-fit=cover'; }}; }}
);
const report = sandbox.formatGestureDiagnostics(env, snap, [snap]);
assert(report.includes('APP DEV · CODE abcdef0 · 2026-07-13'));
assert(report.includes('standalone=true'));
assert(report.includes('viewport meta=width=device-width, initial-scale=1.0, viewport-fit=cover'));
assert(report.includes('touchend'));
assert(report.includes('scale=1'));
assert(report.includes('doc=390/390'));
assert(report.includes('ta.html=pan-x pan-y'));
assert(report.includes('ta.body=pan-x pan-y'));
assert(report.includes('ta.target=manipulation'));
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ return null; }}), 'n/a');
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ throw new Error('blocked'); }}), 'n/a');
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ return {getAttribute:function(){ throw new Error('blocked'); }}; }}), 'n/a');
console.log('iOS gesture diagnostic observer tests passed');
```

Move the Task 1 `console.log` to the end of these new assertions so the script prints only after every Task 1–2 assertion passes.

- [ ] **Step 2: Run the test and verify RED**

Run the Task 1 test command.

Expected: FAIL because `setupGestureDiagnostics`, environment snapshot, and formatter do not exist.

- [ ] **Step 3: Implement passive setup and plain-text formatting**

Add:

```js
var IOS_GESTURE_DIAGNOSTICS=createGestureDiagnostics(24,function(type,event){
  return gestureViewportSnapshot(type,event,window,document);
});
function setupGestureDiagnostics(doc,win,store){
  ['touchstart','touchend','gesturestart','gestureend','dblclick'].forEach(function(type){
    doc.addEventListener(type,function(e){ store.record(type,e); },{passive:true});
  });
  if(win.visualViewport) win.visualViewport.addEventListener('resize',function(e){ store.record('visualViewport.resize',e); },{passive:true});
}
function runtimeViewportMeta(doc){
  try{
    var meta=doc&&doc.querySelector?doc.querySelector('meta[name="viewport"]'):null;
    var content=meta&&meta.getAttribute?meta.getAttribute('content'):'';
    return content?String(content):'n/a';
  }catch(e){ return 'n/a'; }
}
function gestureEnvironmentSnapshot(nav,standaloneQuery,build,schemaVersion,swVersion,doc){
  return {
    app:'APP '+build.channel+' · CODE '+build.code+' · '+build.date,
    schema:schemaVersion, sw:swVersion, userAgent:String(nav.userAgent||''),
    standalone:!!(standaloneQuery&&standaloneQuery.matches),
    navigatorStandalone:typeof nav.standalone==='boolean'?nav.standalone:null,
    viewportMeta:runtimeViewportMeta(doc)
  };
}
function formatGestureDiagnostics(env,current,records){
  var lines=[env.app,'SCHEMA '+env.schema,'SW '+env.sw,'viewport meta='+env.viewportMeta,'standalone='+env.standalone+' navigator.standalone='+(env.navigatorStandalone===null?'n/a':env.navigatorStandalone),'UA '+env.userAgent];
  function metric(s){ return s.type+' t='+s.time+' target='+s.target+' touches='+(s.touches===null?'n/a':s.touches)+' changed='+(s.changedTouches===null?'n/a':s.changedTouches)+' cancelable='+s.cancelable+' prevented='+s.defaultPrevented+' scale='+(s.vvScale===null?'n/a':s.vvScale)+' vv='+(s.vvWidth===null?'n/a':s.vvWidth+'x'+s.vvHeight)+' offset='+(s.vvOffsetLeft===null?'n/a':s.vvOffsetLeft+','+s.vvOffsetTop)+' inner='+s.innerWidth+'x'+s.innerHeight+' doc='+s.docClientWidth+'/'+s.docScrollWidth+' scroll='+s.scrollX+','+s.scrollY+' ta.html='+s.taHtml+' ta.body='+s.taBody+' ta.target='+s.taTarget; }
  lines.push('CURRENT '+metric(current));
  (records||[]).slice().reverse().forEach(function(s){ lines.push(metric(s)); });
  return lines.join('\n');
}
```

Call `setupGestureDiagnostics(document,window,IOS_GESTURE_DIAGNOSTICS);` once in startup, before `setupDiagnostics()`.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Task 1 command.

Expected: observer, environment, formatter, ring buffer, privacy, and no-side-effect assertions pass.

### Task 3: Peach-panel diagnostic UI

**Files:**
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Modify: `index.html` diagnostic CSS and `openDiagnostics()` section

**Interfaces:**
- Consumes: Task 2 store/formatter, existing `escapeHtml()`, `copyText()`, and `.diag-*` styles.
- Produces: `gestureDiagnosticReport()`, `renderGestureDiagnosticsBody()`, `refreshGestureDiagnostics()`, `clearGestureDiagnostics()`, and `copyGestureDiagnostics()`.

- [ ] **Step 1: Add failing UI tests**

Extract the five UI helpers and assert:

```js
assert.match(html, /id="diagGestureBody"/);
assert.match(html, />iOS 手勢診斷</);
assert.match(html, /onclick="copyGestureDiagnostics\(\)"/);
assert.match(html, /onclick="clearGestureDiagnostics\(\)"/);
assert.match(html, /\.diag-gesture-log\{[^}]*max-height:[^;}]+;[^}]*overflow:auto/);
assert.match(html, /尚無手勢紀錄/);
```

Use these concrete stubs and assertions:

```js
const body = { innerHTML:'' };
const copied = [];
sandbox.window = {
  innerWidth:390, innerHeight:844, scrollX:0, scrollY:0,
  visualViewport:{width:390,height:760,scale:1,offsetLeft:0,offsetTop:0},
  matchMedia:function(){ return {matches:true}; },
  getComputedStyle:function(){ return {touchAction:'pan-x pan-y'}; }
};
sandbox.document = {
  documentElement:{clientWidth:390,scrollWidth:390}, body:{},
  getElementById:function(id){ return id==='diagGestureBody'?body:null; },
  querySelector:function(){ return {getAttribute:function(){ return 'width=device-width, initial-scale=1.0, viewport-fit=cover'; }}; }
};
sandbox.navigator = {userAgent:'Test iPhone',standalone:true};
sandbox.APP_BUILD = {channel:'DEV',code:'abcdef0',date:'2026-07-13'};
sandbox.SCHEMA = {version:'2.1 (2026-07-10)'};
sandbox.IOS_GESTURE_DIAGNOSTICS = sandbox.createGestureDiagnostics(24,function(type,event){
  return sandbox.gestureViewportSnapshot(type,event,sandbox.window,sandbox.document);
});
sandbox.escapeHtml = function(value){ return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
sandbox.copyText = function(text,label){ copied.push({text:text,label:label}); };
vm.runInContext([
  extractFunction('gestureDiagnosticReport'),
  extractFunction('renderGestureDiagnosticsBody'),
  extractFunction('refreshGestureDiagnostics'),
  extractFunction('clearGestureDiagnostics'),
  extractFunction('copyGestureDiagnostics')
].join('\n'), sandbox);

sandbox.IOS_GESTURE_DIAGNOSTICS.record('touchend',{timeStamp:1,target:{tagName:'DIV'}});
assert(sandbox.renderGestureDiagnosticsBody().includes('最近 1 筆事件'));
sandbox.copyGestureDiagnostics();
assert.strictEqual(copied[0].label,'診斷內容');
assert(copied[0].text.includes('touchend'));
sandbox.clearGestureDiagnostics();
assert.strictEqual(sandbox.IOS_GESTURE_DIAGNOSTICS.list().length,0);
assert(body.innerHTML.includes('尚無手勢紀錄'));
console.log('iOS gesture diagnostic tests passed');
```

Move the Task 2 `console.log` to the end of these UI assertions.

- [ ] **Step 2: Run the test and verify RED**

Run the Task 1 test command.

Expected: FAIL because the panel section and UI helpers do not exist.

- [ ] **Step 3: Implement the scoped diagnostic UI**

Add scoped CSS:

```css
.diag-gesture-log{max-height:240px;overflow:auto;background:#f7f3ea;border-radius:8px;padding:8px;font-size:10px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
```

Add helpers:

```js
function gestureDiagnosticReport(){
  var current=gestureViewportSnapshot('current',{},window,document);
  var query=window.matchMedia?window.matchMedia('(display-mode: standalone)'):null;
  var env=gestureEnvironmentSnapshot(navigator,query,APP_BUILD,SCHEMA.version,'okayama-trip-v8',document);
  return formatGestureDiagnostics(env,current,IOS_GESTURE_DIAGNOSTICS.list());
}
function renderGestureDiagnosticsBody(){
  var records=IOS_GESTURE_DIAGNOSTICS.list();
  return '<div class="diag-row">'+(records.length?'最近 '+records.length+' 筆事件':'尚無手勢紀錄')+'</div><pre class="diag-gesture-log">'+escapeHtml(gestureDiagnosticReport())+'</pre><div class="diag-actions"><button class="primary" onclick="copyGestureDiagnostics()">複製診斷內容</button><button onclick="clearGestureDiagnostics()">清除診斷紀錄</button></div>';
}
function refreshGestureDiagnostics(){ var el=document.getElementById('diagGestureBody'); if(el) el.innerHTML=renderGestureDiagnosticsBody(); }
function clearGestureDiagnostics(){ IOS_GESTURE_DIAGNOSTICS.clear(); refreshGestureDiagnostics(); }
function copyGestureDiagnostics(){ copyText(gestureDiagnosticReport(),'診斷內容'); }
```

Insert before the time-simulation section in `openDiagnostics()`:

```js
'<div class="diag-section"><h3>iOS 手勢診斷</h3><div id="diagGestureBody">'+renderGestureDiagnosticsBody()+'</div></div>'+
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\ios-gesture-diagnostics.test.js
& $node tests\ios-viewport-resume.test.js
& $node tests\ios-zoom-guard.test.js
```

Expected: all three scripts pass.

- [ ] **Step 5: Commit the functional diagnostic build**

Run:

```powershell
git add -- index.html tests/ios-gesture-diagnostics.test.js
git commit -m "feat: add iOS gesture diagnostics"
git rev-parse --short HEAD
```

Record the returned seven-character hash for Task 4.

### Task 4: Publish Dev identity, documentation, and App Shell v8

**Files:**
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `tests/README.md`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-07-13-ios-double-tap-diagnostic-build.md`

**Interfaces:**
- Consumes: Task 3 functional commit hash.
- Produces: explicit APP CODE, `okayama-trip-v8`, documented operating/validation rules, and reproducible full-suite evidence.

- [ ] **Step 1: Make version assertions fail first**

Change `tests/ios-zoom-guard.test.js` to require:

```js
const execFileSync = require('child_process').execFileSync;
assert.match(sw, /okayama-trip-v8/, 'service worker cache is bumped to v8');
assert.match(html, /SW okayama-trip-v8/, 'diagnostics display v8');
assert.doesNotMatch(sw, /tests\//, 'test files are not part of the App Shell');
assert.doesNotMatch(sw, /ios-gesture-diagnostics\.test\.js/, 'the diagnostic test is never cached');
const buildMatch = html.match(/var APP_BUILD=\{channel:'DEV',code:'([0-9a-f]{7})',date:'2026-07-13'\}/);
assert(buildMatch, 'APP identifies a seven-character functional commit');
execFileSync('git', ['cat-file','-e',buildMatch[1]+'^{commit}']);

const diagnosticFunctions = [
  'gestureTargetSummary','gestureComputedTouchAction','gestureViewportSnapshot',
  'createGestureDiagnostics','setupGestureDiagnostics','runtimeViewportMeta',
  'gestureEnvironmentSnapshot','formatGestureDiagnostics','gestureDiagnosticReport',
  'renderGestureDiagnosticsBody','refreshGestureDiagnostics',
  'clearGestureDiagnostics','copyGestureDiagnostics'
].map(extractFunction).join('\n');
assert.doesNotMatch(diagnosticFunctions, /=>|\bconst\b|\blet\b/, 'diagnostic production functions remain ES5');
assert.strictEqual(diagnosticFunctions.indexOf('`'), -1, 'diagnostic production functions use no template literals');
```

- [ ] **Step 2: Run the version test and verify RED**

Run `node tests/ios-zoom-guard.test.js` with the bundled Node path.

Expected: FAIL because production still reports the prior APP CODE and v7.

- [ ] **Step 3: Publish the functional identity and v8**

- Set `APP_BUILD.code` to the exact Task 3 hash.
- Change the diagnostic SW row to `SW okayama-trip-v8`.
- Change `sw.js` `CACHE_NAME` to `okayama-trip-v8`.
- Add this exact test description to `tests/README.md`:

```markdown
- `ios-gesture-diagnostics.test.js`:驗證 iOS 手勢診斷的 24 筆記憶體紀錄、viewport snapshot、隱私欄位、被動 observer 與診斷面板操作。執行:`node tests/ios-gesture-diagnostics.test.js`。
```

- Add this exact rule under `04_UI_GUIDELINES.md` 行動手勢:

```markdown
- 雙擊縮放仍可重現時，診斷 Build 只允許以 passive listener 將最近 24 筆事件與 visual viewport 指標保留於記憶體；禁止阻止事件、寫入 storage、記錄文字／表單值／URL，取得實機證據前不得加入 viewport 硬鎖。
```

- Add this exact top entry to `07_CHANGELOG.md`; the App itself carries the exact Task 3 hash:

```markdown
## 2026-07-13 — iOS 雙擊縮放診斷 Build（Dev）
- v7 實機確認 Scroll-only 生效但同點快速雙擊仍觸發 WebKit 原生放大；本版只蒐集證據，不宣稱修復。
- 桃子診斷面板新增最近 24 筆 touch／gesture／dblclick／visual viewport resize 記憶體紀錄、清除與複製操作；不記錄文字、表單值或 URL。
- 所有診斷 observer 均為 passive 且不阻止事件；未加入 viewport 硬鎖、storage 或自製縮放。
- 診斷面板的 APP CODE 更新為本功能 commit 七碼短 hash；Service Worker App Shell cache 升至 `okayama-trip-v8`，Schema 維持 2.1。
- 自動測試通過；最終事件與 scale 證據待 Bar 於 iPhone Dev PWA 回傳。
```

- [ ] **Step 4: Run repository-wide verification**

Run:

```powershell
$node='C:\Users\Aaron Huang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$tests=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
foreach($t in $tests){ & $node $t.FullName; if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE } }
& $node tools\check-doc-titles.js
if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }
@'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
scripts.forEach(s=>new Function(s));
console.log('inline JavaScript syntax passed ('+scripts.length+' scripts)');
'@ | & $node -
git diff --check
git status --short
```

Expected: all test files pass, document check passes, all inline scripts compile, `git diff --check` is clean, and status lists only intended publication/docs files.

- [ ] **Step 5: Commit publication metadata and docs**

Run:

```powershell
git add -- index.html sw.js tests/ios-zoom-guard.test.js tests/README.md 04_UI_GUIDELINES.md 07_CHANGELOG.md docs/superpowers/plans/2026-07-13-ios-double-tap-diagnostic-build.md
git commit -m "chore: publish iOS gesture diagnostic build"
git status --short --branch
```

Expected: clean `dev` working tree ahead of `origin/dev`; do not push yet.

### Task 5: Authorized Dev push and phone evidence collection

**Files:**
- No source changes.

**Interfaces:**
- Consumes: the supplemental instruction's explicit `push dev` authorization and the clean verified commit stack.
- Produces: matching local/remote `dev` hashes and one iPhone diagnostic report.

- [ ] **Step 1: Re-run the full verification immediately before push**

Repeat Task 4 Step 4. Stop if any command fails or the tree is dirty.

- [ ] **Step 2: Push the verified Dev stack**

Run:

```powershell
git push origin dev
git fetch origin --prune
$local=git rev-parse HEAD
$remote=git rev-parse origin/dev
if($local -ne $remote){ throw "origin/dev mismatch: $local != $remote" }
git status --short --branch
```

Expected: local and remote hashes match and `dev...origin/dev` has no ahead/behind count.

- [ ] **Step 3: Collect phone evidence**

Ask Bar to:

1. Restart the Dev PWA until diagnostics show the new APP CODE and `SW okayama-trip-v8`.
2. Clear the iOS gesture log and close diagnostics.
3. Double-tap the reproducible location once.
4. Reopen diagnostics and copy or screenshot the complete iOS gesture section.

Report explicitly that this build diagnoses the gesture and does not claim to fix double-tap zoom.
