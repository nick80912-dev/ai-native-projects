# Trip Pilot v108 Navigation, Diagnostics, and Status Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver exact destination confirmation, impact-aware diagnostics, and non-stale project status authority without changing persistent user data or synchronization behavior.

**Architecture:** Add two ES5 deep modules: `navigation-intent.js` owns transient intent state, while `diagnostic-impact.js` owns display-only AppLog projection. `index.html` remains the DOM adapter. Remove volatile status snapshots from `.ai-manifest.json`, then forward-bump the App shell to v108.

**Tech Stack:** Vanilla ES5 JavaScript, HTML/CSS, Node.js built-in test runner, Playwright Chromium/WebKit, Service Worker App Shell.

## Global Constraints

- The Service Worker “new version available” prompt is excluded.
- Do not change Schema, Google Sheet data, Apps Script, Ledger record semantics, backup format, Shopping storage, `main`, production deployment, or production tags.
- `shopping-list` navigation opens the existing overlay and never changes `curView`.
- Navigation state and diagnostic projections are session-only and never enter storage, backup, Queue, CMS, or Ledger.
- Preserve ES5 syntax, zero runtime dependencies, WebView fetch compatibility, passive iOS double-click listener, six themes, four tabs, and the three-layer offline boot contract.
- Runtime module additions must be present in `index.html`, `runtime-assets.json`, `sw.js` SHELL, README, `.ai-manifest.json`, and runtime-asset tests.
- Any PWA rollback uses a forward version bump; never delete `sw.js`.

---

### Task 1: Remove stale manifest product status

**Files:**
- Modify: `.ai-manifest.json`
- Modify: `tools/check-doc-titles.js`
- Create: `tests/manifest-status-authority.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `.ai-manifest.json` JSON and `tasks/current.md`.
- Produces: `manifest_format: "2.29"` and `current_status: { "authority": "tasks/current.md" }`; the manifest contains no volatile `dev_candidate`, `next_action`, or `automated_validation` snapshot.

- [ ] **Step 1: Write the failing manifest authority test**

Create `tests/manifest-status-authority.test.js` with assertions equivalent to:

```js
const assert=require('assert');
const fs=require('fs');
const manifest=JSON.parse(fs.readFileSync('.ai-manifest.json','utf8'));

assert.strictEqual(manifest.manifest_format,'2.29');
assert.deepStrictEqual(manifest.current_status,{authority:'tasks/current.md'});
assert(fs.existsSync(manifest.current_status.authority));
assert.strictEqual(Object.prototype.hasOwnProperty.call(manifest,'status'),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(manifest,'historical_status_snapshot_2026_08_01'),false);
const raw=JSON.stringify(manifest);
['dev_candidate','next_action','automated_validation'].forEach(function(key){
  assert.strictEqual(raw.indexOf('"'+key+'"'),-1,key+' must live in tasks/current.md, not the manifest');
});
console.log('manifest status authority tests passed');
```

- [ ] **Step 2: Run RED**

Run: `node tests/manifest-status-authority.test.js`

Expected: FAIL because the current manifest has the old `version`, `status`, and historical status snapshot fields.

- [ ] **Step 3: Replace volatile manifest fields**

In `.ai-manifest.json`:

- Replace `"version": "2.28-ledger-warning-dedup-v103"` with `"manifest_format": "2.29"`.
- Add `"current_status": { "authority": "tasks/current.md" }` beside `updated`.
- Remove the `historical_status_snapshot_2026_08_01` and `status` objects only; preserve architecture, governance, data-flow, known-trap, invariant, file, and deployment guidance.
- Do not edit `app-version.js`; App version remains independent from manifest format.

Extend `tools/check-doc-titles.js` rule 3:

```js
if(m.manifest_format!=='2.29')errors.push('.ai-manifest.json manifest_format 應為 2.29');
if(!m.current_status||m.current_status.authority!=='tasks/current.md'){
  errors.push('.ai-manifest.json current_status.authority 應指向 tasks/current.md');
}else if(!fs.existsSync(m.current_status.authority)){
  errors.push('.ai-manifest.json current_status.authority 指向不存在的檔案');
}
['status','historical_status_snapshot_2026_08_01'].forEach(function(key){
  if(Object.prototype.hasOwnProperty.call(m,key))errors.push('.ai-manifest.json 不得保存易過期狀態:'+key);
});
```

- [ ] **Step 4: Run GREEN and document the test**

Run:

```powershell
node tests/manifest-status-authority.test.js
node tools/check-doc-titles.js
```

Expected: both commands PASS. Add the new test and command to `tests/README.md`.

- [ ] **Step 5: Commit**

```powershell
git add -- .ai-manifest.json tools/check-doc-titles.js tests/manifest-status-authority.test.js tests/README.md
git commit -m "docs: make task board the status authority"
```

### Task 2: Add the Navigation Intent state module

**Files:**
- Create: `navigation-intent.js`
- Create: `tests/navigation-intent-module.test.js`

**Interfaces:**
- Consumes: plain state and intent objects.
- Produces: global `TripNavigationIntent` with `create(initialState?)`, `request(state,intent)`, `consume(state,view)`, and `complete(state,token)`.

- [ ] **Step 1: Write the failing module contract test**

Cover:

```js
const empty=nav.create();
assert.deepStrictEqual(empty,{nextToken:1,pending:null,active:null});

const requested=nav.request(empty,{
  view:'shopping-list',targetId:'shopgroup_stop-1',sourceView:'today',sourceId:'hero',align:'start',announce:'已定位：永旺夢樂城岡山'
});
assert.strictEqual(requested.pending.token,1);
assert.strictEqual(requested.nextToken,2);
assert.deepStrictEqual(empty,{nextToken:1,pending:null,active:null},'request is immutable');

const wrong=nav.consume(requested,'shop');
assert.strictEqual(wrong.intent,null);
assert.deepStrictEqual(wrong.state,requested);

const consumed=nav.consume(requested,'shopping-list');
assert.strictEqual(consumed.intent.targetId,'shopgroup_stop-1');
assert.strictEqual(consumed.state.pending,null);
assert.strictEqual(consumed.state.active.token,1);

assert.deepStrictEqual(nav.complete(consumed.state,999),consumed.state,'stale completion is inert');
assert.deepStrictEqual(nav.complete(consumed.state,1),{nextToken:2,pending:null,active:null});
assert.throws(function(){nav.request(empty,{view:'unknown'});},/view/);
```

Also assert allowed views are exactly `shopping-list`, `shop`, `today`, `trip`, and `split`; `targetId`, `sourceView`, `sourceId`, `align`, and `announce` normalize to strings; `align` defaults to `start`.

- [ ] **Step 2: Run RED**

Run: `node tests/navigation-intent-module.test.js`

Expected: FAIL because `navigation-intent.js` does not exist.

- [ ] **Step 3: Implement the pure ES5 module**

Use the existing UMD-style global/CommonJS pattern:

```js
(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripNavigationIntent=moduleValue;
})(this,function(){
  var VIEWS={"shopping-list":1,shop:1,today:1,trip:1,split:1};
  function cloneIntent(intent,token){
    var view=String(intent&&intent.view||'');
    if(!VIEWS[view])throw new Error('navigation intent view is invalid:'+view);
    return {token:token,view:view,targetId:String(intent.targetId||''),sourceView:String(intent.sourceView||''),sourceId:String(intent.sourceId||''),align:intent.align==='center'?'center':'start',announce:String(intent.announce||'')};
  }
  function create(initial){
    initial=initial||{};
    return {nextToken:Math.max(1,Number(initial.nextToken)||1),pending:initial.pending||null,active:initial.active||null};
  }
  function request(state,intent){
    state=create(state);var token=state.nextToken;
    return {nextToken:token+1,pending:cloneIntent(intent,token),active:state.active};
  }
  function consume(state,view){
    state=create(state);
    if(!state.pending||state.pending.view!==String(view||''))return {state:state,intent:null};
    return {state:{nextToken:state.nextToken,pending:null,active:state.pending},intent:state.pending};
  }
  function complete(state,token){
    state=create(state);
    if(!state.active||state.active.token!==token)return state;
    return {nextToken:state.nextToken,pending:state.pending,active:null};
  }
  return {create:create,request:request,consume:consume,complete:complete};
});
```

- [ ] **Step 4: Run GREEN**

Run: `node tests/navigation-intent-module.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- navigation-intent.js tests/navigation-intent-module.test.js
git commit -m "feat(navigation): add transient intent module"
```

### Task 3: Register the runtime module and wire page targeting

**Files:**
- Modify: `index.html:692-698, 175-185, 2370-2420, 2451-2465, 3374-3385, 4437-4445`
- Modify: `runtime-assets.json`
- Modify: `sw.js`
- Modify: `.ai-manifest.json`
- Modify: `README.md`
- Modify: `tests/runtime-assets.test.js`
- Modify: `tests/view-ui-state.test.js`
- Modify: `tests/render-note.test.js`
- Modify: `tests/browser/view-context.spec.js`
- Modify: `tests/browser/today-live-info.spec.js`

**Interfaces:**
- Consumes: `TripNavigationIntent` from Task 2.
- Produces: `requestNavigationIntent(intent)`, `consumeNavigationIntent(view)`, `applyNavigationTarget(element,intent)`, and `clearNavigationTarget(token)` DOM-adapter helpers.

- [ ] **Step 1: Extend runtime and wiring tests to RED**

Add `navigation-intent.js` to the real runtime inventory expectation and assert:

```js
assert(indexHtml.includes('<script src="navigation-intent.js"></script>'));
assert(swSource.includes("'./navigation-intent.js'"));
```

Characterize current deep links, then require:

- Hero and next-stop Shopping badge request `view:'shopping-list'` and exact `shopgroup_<cssId(stopRef)>`.
- `openShopPlace()` requests `view:'shop'` and `shopmall_<PID>`.
- `gotoDay()` and `backToNow()` use the module through `switchView()`.
- A missing target reports failure but does not restore an unrelated prior position.
- Closing Shopping overlay leaves `curView` unchanged.

Run:

```powershell
node tests/runtime-assets.test.js
node tests/view-ui-state.test.js
node tests/render-note.test.js
```

Expected: FAIL on missing registration and module wiring.

- [ ] **Step 2: Register `navigation-intent.js` everywhere**

- Add `<script src="navigation-intent.js"></script>` after `app-version.js` and before modules that may dispatch navigation.
- Add it to `runtime-assets.json`, `sw.js` SHELL, `.ai-manifest.json` `files` and `deploy_files`, README runtime module documentation, and runtime-asset fixtures.
- Keep schema/validator embedding unchanged.

- [ ] **Step 3: Implement the DOM adapter**

Initialize:

```js
var navigationIntentState=TripNavigationIntent.create();
var navigationTargetTimer=null;
```

Implement adapter behavior:

```js
function requestNavigationIntent(intent){
  navigationIntentState=TripNavigationIntent.request(navigationIntentState,intent);
  return navigationIntentState.pending;
}
function consumeNavigationIntent(view){
  var result=TripNavigationIntent.consume(navigationIntentState,view);
  navigationIntentState=result.state;
  return result.intent;
}
```

Update `switchView(view,intent)` so the existing legacy intent is normalized once into the module, then `applyViewPosition()` consumes the target for the rendered view. Update `openShoppingList(focusStopRef)` to request and consume `shopping-list` after the overlay mounts; do not call `switchView()`.

Target IDs:

- Shopping list: `shopgroup_` + `cssId(stopRef)`.
- Shopping page: `shopmall_` + upper-case `cssId(placeId)`.
- Trip item: `it_` + item ID.
- Trip day/top: empty `targetId` and explicit top behavior retained in the adapter.

- [ ] **Step 4: Add visible and accessible destination confirmation**

Add CSS using existing theme roles:

```css
.is-navigation-target{outline:3px solid var(--coral);outline-offset:3px;background:var(--coral-bg);transition:outline-color .2s ease,background-color .2s ease}
.navigation-target-status{font-size:12px;font-weight:800;color:var(--sea-deep);padding:6px 10px;background:var(--line-soft);border-radius:8px;margin:0 0 8px}
@media(prefers-reduced-motion:reduce){.is-navigation-target{transition:none}}
```

`applyNavigationTarget()` must:

- remove the previous class and timer;
- scroll with `block:intent.align` and `behavior:'instant'`;
- add the class;
- write `intent.announce` into one `role="status" aria-live="polite"` node in the destination container;
- remove the class and complete the matching token after 1,200ms;
- on a missing target, announce `找不到對應地點`, call `AppLog.render(...)`, complete the token, and never throw.

- [ ] **Step 5: Run focused Node and browser GREEN**

Run:

```powershell
node tests/navigation-intent-module.test.js
node tests/runtime-assets.test.js
node tests/view-ui-state.test.js
node tests/render-note.test.js
npx playwright test tests/browser/view-context.spec.js tests/browser/today-live-info.spec.js
npx playwright test tests/browser/today-live-info.spec.js --browser=webkit --grep "target|定位|blank category"
```

Expected: all PASS; the overlay target is visible, receives `is-navigation-target`, announces the full destination, clears after 1.2 seconds, preserves `curView`, and restores origin context on close.

- [ ] **Step 6: Commit**

```powershell
git add -- navigation-intent.js index.html runtime-assets.json sw.js .ai-manifest.json README.md tests/runtime-assets.test.js tests/view-ui-state.test.js tests/render-note.test.js tests/browser/view-context.spec.js tests/browser/today-live-info.spec.js
git commit -m "feat(navigation): confirm explicit destinations"
```

### Task 4: Add display-only diagnostic impact projection

**Files:**
- Create: `diagnostic-impact.js`
- Create: `tests/diagnostic-impact-module.test.js`
- Modify: `index.html:692-699, 10936-10955`
- Modify: `runtime-assets.json`
- Modify: `sw.js`
- Modify: `.ai-manifest.json`
- Modify: `README.md`
- Modify: `tests/runtime-assets.test.js`
- Modify: `tests/diagnostics-app-log.test.js`
- Modify: `tests/browser/diagnostics-app-log.spec.js`

**Interfaces:**
- Consumes: raw AppLog entry `{at,category,level,message}`.
- Produces: global `TripDiagnosticImpact.project(entry)` returning `{severity,title,impact,fallback,raw}` without mutating the entry.

- [ ] **Step 1: Write RED module and renderer tests**

Require exact known-timeout output:

```js
const raw={category:'sync',level:'warn',message:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'};
const snapshot=JSON.parse(JSON.stringify(raw));
assert.deepStrictEqual(impact.project(raw),{
  severity:'degraded',
  title:'分帳快速同步暫時逾時',
  impact:'目前仍可使用',
  fallback:'已改用一般 CSV 同步',
  raw:raw.message
});
assert.deepStrictEqual(raw,snapshot);
```

Also cover:

- `level:'info'` → `info`, raw title, `目前使用不受影響`.
- message containing `可能未保存` → `action-required`, `請確認資料是否已保存`.
- unknown warning → `degraded`, raw title, `請查看原始紀錄`, empty fallback.
- copied report remains byte-for-byte raw and does not include projected copy.
- visible diagnostics escapes both raw and projected text.

Run: `node tests/diagnostic-impact-module.test.js tests/diagnostics-app-log.test.js`

Expected: FAIL because the module and projected markup are absent.

- [ ] **Step 2: Implement and register `diagnostic-impact.js`**

Use pure ordered rules:

```js
function project(entry){
  var message=String(entry&&entry.message||'');
  if(/ledger 增量讀取失敗.*維持 CSV 路徑|ledger 增量讀取逾時/.test(message))return {severity:'degraded',title:'分帳快速同步暫時逾時',impact:'目前仍可使用',fallback:'已改用一般 CSV 同步',raw:message};
  if(/可能未保存/.test(message))return {severity:'action-required',title:message,impact:'請確認資料是否已保存',fallback:'',raw:message};
  if(String(entry&&entry.level||'')==='info')return {severity:'info',title:message,impact:'目前使用不受影響',fallback:'',raw:message};
  return {severity:'degraded',title:message,impact:'請查看原始紀錄',fallback:'',raw:message};
}
```

Register the asset in the same six runtime locations as Task 3.

- [ ] **Step 3: Render projected impact without changing copied reports**

Keep `formatDiagnosticsReport()` unchanged. In `renderDiagnosticAppLogSection()` map each entry through `TripDiagnosticImpact.project(entry)` and render semantic rows:

```html
<div class="diag-log-entry diag-impact-degraded">
  <b>分帳快速同步暫時逾時</b>
  <span>目前仍可使用</span>
  <small>已改用一般 CSV 同步</small>
  <code>原始：ledger 增量讀取失敗…</code>
</div>
```

Use CSS variables for severity colors; retain raw text in the DOM and copied report. Do not deduplicate, suppress, retry, or reclassify the stored AppLog entry.

- [ ] **Step 4: Run focused GREEN**

Run:

```powershell
node tests/diagnostic-impact-module.test.js
node tests/diagnostics-app-log.test.js
node tests/runtime-assets.test.js
npx playwright test tests/browser/diagnostics-app-log.spec.js
```

Expected: all PASS with raw AppLog unchanged and projected impact visible.

- [ ] **Step 5: Commit**

```powershell
git add -- diagnostic-impact.js index.html runtime-assets.json sw.js .ai-manifest.json README.md tests/diagnostic-impact-module.test.js tests/runtime-assets.test.js tests/diagnostics-app-log.test.js tests/browser/diagnostics-app-log.spec.js
git commit -m "feat(diagnostics): explain fallback impact"
```

### Task 5: Release, verify, and deliver v108

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` release notes
- Modify: `tests/theme-system.test.js`
- Modify: `02_ARCHITECTURE.md`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `docs/superpowers/plans/2026-08-12-trip-pilot-v108-navigation-diagnostics-status.md`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: v108 App/SW identity, five-note release window, current architecture/status documentation, verified `origin/dev` delivery.

- [ ] **Step 1: Forward-bump and document**

- Set `APP_VERSION` and `SW_VERSION` to `v108`.
- Add v108 release notes; retain the prior four versions in the five-entry window.
- Document transient navigation state, target confirmation, raw-versus-projected diagnostics, and `tasks/current.md` status authority.
- Mark completed plan steps only after their evidence exists.

- [ ] **Step 2: Run static and focused gates**

```powershell
node tools/check-app-version.js
node tools/check-doc-titles.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
Get-Content manifest.webmanifest -Raw | ConvertFrom-Json | Out-Null
git diff --check
node --test tests/navigation-intent-module.test.js tests/diagnostic-impact-module.test.js tests/manifest-status-authority.test.js tests/view-ui-state.test.js tests/diagnostics-app-log.test.js tests/runtime-assets.test.js tests/render-note.test.js tests/theme-system.test.js
```

Expected: all PASS and BUILTIN no-drift.

- [ ] **Step 3: Run full regression and health gate**

```powershell
node --test tests/*.test.js
npx playwright test
npx playwright test tests/browser/today-live-info.spec.js --browser=webkit --grep "target|定位|blank category"
```

Then run the repository offline Chromium Health probe and require `healthCheck: []` and `pageErrors: []`.

- [ ] **Step 4: Commit release metadata**

```powershell
git add -- app-version.js sw.js index.html tests/theme-system.test.js 02_ARCHITECTURE.md 04_UI_GUIDELINES.md 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tests/README.md docs/superpowers/plans/2026-08-12-trip-pilot-v108-navigation-diagnostics-status.md
git commit -m "docs: release navigation feedback v108"
```

- [ ] **Step 5: Verify committed tree and push `dev`**

Re-run full Node, Playwright, focused WebKit, static, BUILTIN, and offline Health gates. Fetch `origin`; require zero remote-only commits; push `dev`; require `origin/dev...dev` = `0 0` and identical SHAs. Stop for Bar's v108 device/PWA verification before starting v109.

