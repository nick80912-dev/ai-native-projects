# Shopping UI List Tab＋Selection Workflow／State Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Shopping list tab and selection transitions behind one production-used workflow/state seam without changing user-visible behavior or Shopping data.

**Architecture:** Add an ES5-compatible UMD module exposing `createState(seed)`, `transition(state, action)`, and `createWorkflow(adapter)`. The production adapter projects only `tab`, `selectionMode`, and `selected` through the existing `shoppingUiState` compatibility object; current renderers, repositories, form/detail/photo state, and Buy-to-Ledger domain remain outside the module.

**Tech Stack:** Static HTML/CSS/ES5 JavaScript, Node built-in `assert`, Playwright Chromium, Service Worker App Shell.

## Global Constraints

- Work directly on clean `dev`; push only `origin/dev` after all gates pass.
- Do not modify `app-version.js`, `SW_VERSION`, `CACHE_NAME`, Netlify configuration, Service Worker lifecycle, or cache strategy.
- Do not modify Shopping store behavior, Shopping Item schema, storage keys, personal backup format, photo repository, Buy-to-Ledger domain, Ledger repository, or data formats.
- Do not change Shopping page search/filter/wants/floor state, form/detail/photo/split payloads, DOM renderer markup, visible copy, or layout.
- `shopping-ui-state.js` must not read DOM, storage, repositories, clocks, or globals from the App.
- Follow strict TDD: characterization tests first pass against legacy behavior; every new module/wiring requirement is observed failing before production code is added.
- No merge to `main`, Netlify deployment, production tag, or runtime version allocation.

---

## File Map

- Create `shopping-ui-state.js`: pure state normalization, transitions, ordered effects, and injected workflow adapter.
- Create `tests/shopping-ui-state-characterization.test.js`: stable behavior contract for current list/tab/selection helpers and public handlers.
- Create `tests/shopping-ui-state.test.js`: direct module transition and recording-adapter tests.
- Create `tests/shopping-ui-state-wiring.test.js`: production wiring ownership and direct-mutation guard.
- Modify `index.html`: load the module, build the projection adapter, and route existing handlers through dispatch without changing renderer output.
- Modify `sw.js`: add `./shopping-ui-state.js` to `SHELL` only.
- Modify `tests/browser/shopping-select-all.spec.js`: add real-browser row-body and failure/cancel preservation regressions.
- Modify `tests/pwa-shell.test.js`: require page loading and offline caching of the new module.
- Modify `tests/README.md`: index the new Node/browser coverage.
- Create `adr/0012-shopping-ui-list-selection-workflow-state.md` and modify `adr/README.md`: record the accepted seam.
- Modify `CONTEXT.md`, `07_CHANGELOG.md`, and `tasks/current.md`: record the runtime boundary and verified delivery without claiming a new version.

---

### Task 1: Characterize Existing List Tab and Selection Behavior

**Files:**
- Create: `tests/shopping-ui-state-characterization.test.js`
- Modify: `tests/browser/shopping-select-all.spec.js`

**Interfaces:**
- Consumes: current globals `shoppingUiState`, `shoppingCurrentTabItems()`, `setShoppingTab()`, `toggleShoppingSelectionMode()`, `toggleShoppingSelection()`, `toggleShoppingPageSelection()`, and `handleShoppingItemBodyClick()`.
- Produces: behavior tests that pass before migration and remain valid after workflow wiring.

- [ ] **Step 1: Add a Node characterization harness for the current handlers**

Use `fs`, `vm`, and a brace-aware `extractFunction()` copied from existing source-level tests. Execute the real helper/handler source in a sandbox containing the state below plus a recording `shoppingUiWorkflow.dispatch(action)` shim. The shim applies the same public outcomes as the actions listed in this plan, so the test passes both while the legacy handlers mutate directly and after those handlers delegate to the seam:

```js
const state={tab:'pending',selectionMode:false,selected:{},split:{id:'split-a'}};
const items=[
  {id:'pending-a',done:false},
  {id:'pending-b',done:false},
  {id:'done-a',done:true}
];
const events=[];
```

Assert literal outcomes for:

```js
// setShoppingTab('done')
{tab:'done',selectionMode:false,selected:{},split:null}

// enter selection, select one, exit selection
{tab:'pending',selectionMode:false,selected:{}}

// pending tab select-all, then cancel select-all
{selected:{'pending-a':true,'pending-b':true}}
{selected:{}}
```

The sandbox must count list renders, record dispatched action payloads, and execute `requestAnimationFrame` immediately so the test also proves select-all renders before focusing `shoppingSelectAllButton`. Assertions must be against observable state/render/focus outcomes; action-recording assertions are added only after production wiring in `shopping-ui-state-wiring.test.js`.

- [ ] **Step 2: Run the Node characterization test against legacy production code**

Run:

```powershell
node tests/shopping-ui-state-characterization.test.js
```

Expected: PASS. This is a characterization step, not RED; it proves the behavior existed before extraction.

- [ ] **Step 3: Add browser characterization for row-body semantics and failure/cancel preservation**

Extend `tests/browser/shopping-select-all.spec.js` with these cases using the existing seeded fixture:

```js
test('多選時點卡片只切換 selection，不改完成狀態或開啟明細',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.locator('[data-shopping-item-id="pending-1"] .shopping-item-body').click();
  expect(await page.evaluate(()=>(
    {selected:!!shoppingUiState.selected['pending-1'],done:shoppingListStore.all().find(item=>item.id==='pending-1').done,detail:!!document.getElementById('shoppingItemDetail')}
  ))).toEqual({selected:true,done:false,detail:false});
});
```

Add one test that selects all, forces `shoppingListStore.patchMany()` to throw, activates `已買`, and asserts mode/selection remain unchanged. Add one test that selects all, cancels the native delete confirmation, and asserts mode/selection remain unchanged.

- [ ] **Step 4: Run the focused browser characterization**

Run:

```powershell
npx playwright test tests/browser/shopping-select-all.spec.js
```

Expected: all cases PASS against the legacy implementation.

- [ ] **Step 5: Commit the characterization baseline**

```powershell
git add tests/shopping-ui-state-characterization.test.js tests/browser/shopping-select-all.spec.js
git diff --cached --check
git commit -m "test(shopping): characterize list selection workflow"
```

---

### Task 2: Build the Pure Shopping UI State Module

**Files:**
- Create: `tests/shopping-ui-state.test.js`
- Create: `shopping-ui-state.js`

**Interfaces:**
- Consumes: action objects containing only serializable values.
- Produces: `TripShoppingUiState.createState`, `.transition`, and `.createWorkflow`.

- [ ] **Step 1: Write the failing module tests**

Create `tests/shopping-ui-state.test.js` with literal expectations covering:

```js
const initial=TripShoppingUiState.createState();
assert.deepStrictEqual(plain(initial),{
  tab:'pending',selectionMode:false,selected:{}
});
```

Test seed normalization:

```js
assert.deepStrictEqual(plain(TripShoppingUiState.createState({
  tab:'other',selectionMode:true,selected:{a:true,b:false,'':true}
})),{tab:'pending',selectionMode:true,selected:{a:true}});
```

Test each action and exact effects:

```js
{type:'open-list'}
// => pending, no selection, [{type:'render-list'}]

{type:'set-tab',tab:'done'}
// => done, no selection, [{type:'clear-split'},{type:'render-list'}]

{type:'toggle-selection-mode'}
// => mode toggled, empty selected, [{type:'render-list'}]

{type:'set-item-selection',id:'a',selected:true}
// => only valid while selectionMode is true

{type:'toggle-visible-selection',ids:['a','b','a','']}
// => {a:true,b:true}; a second dispatch clears selected

{type:'reset-selection'}
// => mode false, empty selected, no effects

{type:'prune-selection',ids:['a']}
// => remove a without changing mode, no effects
```

Also assert input state/maps/ID arrays are unchanged, invalid actions return the original state with `changed:false`, and a recording adapter observes:

```js
['read','write:done','clear-split:done','render-list:done']
```

- [ ] **Step 2: Run the module test and verify RED**

Run:

```powershell
node tests/shopping-ui-state.test.js
```

Expected: FAIL with `MODULE_NOT_FOUND` for `../shopping-ui-state.js`.

- [ ] **Step 3: Implement the minimal UMD module**

Create `shopping-ui-state.js` using the established UMD shape:

```js
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripShoppingUiState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // text, uniqueStrings, truthMap, createState, transition, createWorkflow
  return {createState:createState,transition:transition,createWorkflow:createWorkflow};
});
```

`transition()` must create new state/maps, accept only `pending | done`, deduplicate visible IDs, fail closed on invalid inputs, and emit only `clear-split`, `render-list`, and `focus-selection-control` for this slice. `createWorkflow(adapter)` requires `readState()` and `writeState()` and throws for a missing effect adapter.

- [ ] **Step 4: Run module tests and verify GREEN**

Run:

```powershell
node tests/shopping-ui-state.test.js
```

Expected: PASS and print `shopping UI state tests passed`.

- [ ] **Step 5: Run characterization tests to prove behavior remains independently specified**

Run:

```powershell
node tests/shopping-ui-state-characterization.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the pure module**

```powershell
git add shopping-ui-state.js tests/shopping-ui-state.test.js
git diff --cached --check
git commit -m "feat(shopping): add list selection state module"
```

---

### Task 3: Wire Production Through the Workflow Seam

**Files:**
- Create: `tests/shopping-ui-state-wiring.test.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `index.html`
- Modify: `sw.js`

**Interfaces:**
- Consumes: `TripShoppingUiState.createWorkflow(adapter)` and the existing `shoppingUiState` compatibility object.
- Produces: `shoppingUiWorkflow.dispatch(action)` used by every migrated handler.

- [ ] **Step 1: Write failing wiring and App Shell tests**

In `tests/shopping-ui-state-wiring.test.js`, assert behaviorally relevant wiring:

- `index.html` loads `shopping-ui-state.js` before the inline App.
- Production constructs `shoppingUiWorkflow=TripShoppingUiState.createWorkflow({...})`.
- The adapter reads/writes only `tab`, `selectionMode`, and `selected` on `shoppingUiState`.
- `setShoppingTab`, `toggleShoppingSelectionMode`, `toggleShoppingSelection`, and `toggleShoppingPageSelection` dispatch their corresponding actions.
- `openShoppingList` dispatches `open-list` after mounting the overlay.
- Successful bulk paths and `openBuyToLedgerDraft` dispatch `reset-selection`; the migrated functions contain no direct assignment to owned fields.
- Single delete dispatches `prune-selection` after successful removal.
- Form/detail/photo handlers keep their existing direct fields and do not dispatch Shopping list actions.
- Export/restore paths still exclude UI state.

Extend `tests/pwa-shell.test.js` with page-load and `SHELL` expectations for `shopping-ui-state.js`.

- [ ] **Step 2: Run wiring tests and verify RED**

Run:

```powershell
node tests/shopping-ui-state-wiring.test.js
node tests/pwa-shell.test.js
```

Expected: FAIL because the runtime script, workflow, and App Shell asset do not exist.

- [ ] **Step 3: Load and cache the module without changing versions**

Add:

```html
<script src="shopping-ui-state.js"></script>
```

beside the existing runtime module scripts. Add only `'./shopping-ui-state.js'` to `sw.js` `SHELL`; leave `SW_VERSION='v98'`, `CACHE_NAME`, install, activate, fetch, `skipWaiting`, and `clients.claim` unchanged.

- [ ] **Step 4: Add the production projection adapter**

Immediately after the existing `shoppingUiState` declaration, create:

```js
var shoppingUiWorkflow=TripShoppingUiState.createWorkflow({
  readState:function(){return {
    tab:shoppingUiState.tab,
    selectionMode:shoppingUiState.selectionMode,
    selected:shoppingUiState.selected
  };},
  writeState:function(next){
    shoppingUiState.tab=next.tab;
    shoppingUiState.selectionMode=next.selectionMode;
    shoppingUiState.selected=next.selected;
  },
  clearSplit:function(){shoppingUiState.split=null;},
  renderList:function(){renderShoppingListOverlay();},
  focusSelectionControl:function(){
    requestAnimationFrame(function(){
      var button=document.getElementById('shoppingSelectAllButton');
      if(button)button.focus();
    });
  }
});
```

This adapter is the only permitted direct writer for the three owned compatibility fields after initialization.

- [ ] **Step 5: Migrate public handlers without changing renderer markup**

Replace direct mutations with dispatch:

```js
shoppingUiWorkflow.dispatch({type:'open-list'});
shoppingUiWorkflow.dispatch({type:'set-tab',tab:tab});
shoppingUiWorkflow.dispatch({type:'toggle-selection-mode'});
shoppingUiWorkflow.dispatch({type:'set-item-selection',id:id,selected:selected});
shoppingUiWorkflow.dispatch({
  type:'toggle-visible-selection',
  ids:shoppingCurrentTabItems().map(function(item){return item.id;})
});
```

After successful store/domain operations, dispatch `reset-selection` before the existing `renderToday()`／`renderShoppingListOverlay()` calls. After successful single delete, dispatch `prune-selection` with that ID. Do not dispatch on caught errors, rejected preflight, or cancelled confirmation.

- [ ] **Step 6: Run focused Node and browser tests and verify GREEN**

Run:

```powershell
node tests/shopping-ui-state.test.js
node tests/shopping-ui-state-characterization.test.js
node tests/shopping-ui-state-wiring.test.js
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
node tests/shopping-remerge.test.js
node tests/pwa-shell.test.js
npx playwright test tests/browser/shopping-select-all.spec.js tests/browser/shop-list-entry.spec.js tests/browser/buy-to-ledger.spec.js tests/browser/shopping-photo.spec.js
```

Expected: every command exits `0`; browser output has zero failed tests.

- [ ] **Step 7: Commit production wiring**

```powershell
git add index.html sw.js shopping-ui-state.js tests/shopping-ui-state-wiring.test.js tests/pwa-shell.test.js tests/browser/shopping-select-all.spec.js
git diff --cached --check
git commit -m "refactor(shopping): route list selection through workflow"
```

---

### Task 4: Record the Accepted Architecture and Test Index

**Files:**
- Create: `adr/0012-shopping-ui-list-selection-workflow-state.md`
- Modify: `adr/README.md`
- Modify: `CONTEXT.md`
- Modify: `tests/README.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: verified module interface and final test evidence.
- Produces: durable architecture rationale and current dev status without allocating a new runtime version.

- [ ] **Step 1: Write ADR 0012 using the required seven sections**

Record:

- Decision: pure transition + injected workflow owns only list tab and selection.
- Context: direct mutation was distributed across open/tab/select/bulk handlers.
- Alternatives: reducer-only, setter helpers, full Shopping extraction.
- Why: production/tests share one seam while renderer and repositories remain stable.
- Benefits: one reset authority, testable failures, future deepening path.
- Trade-offs: form/detail/photo/split stay on compatibility paths; adapter still projects fields.
- Future Impact: form/detail may deepen only after independent characterization; no mega-store.

- [ ] **Step 2: Update indexes and current contracts**

Add ADR 0012 to `adr/README.md`. Add a concise `CONTEXT.md` entry defining the Shopping UI state seam and explicit non-owned areas. Add the three Node test files and expanded browser coverage to `tests/README.md`.

- [ ] **Step 3: Record the unversioned dev delivery**

Prepend a `2026-08-09` changelog entry titled `Shopping list tab／selection workflow／state seam（dev，SW v98 未升版）`. At this stage record the focused commands as evidence and explicitly mark the full-suite totals as pending; do not invent totals. Update `tasks/current.md` next-step/status text so Shopping UI state is no longer listed as unplanned, while preserving the existing v99／v100 SW update-prompt reservation and Netlify quota warning. Task 5 replaces the pending evidence with fresh exact totals before push.

- [ ] **Step 4: Verify documentation and commit**

Run:

```powershell
node tools/check-doc-titles.js
git diff --check
```

Expected: both exit `0`.

Commit:

```powershell
git add adr/0012-shopping-ui-list-selection-workflow-state.md adr/README.md CONTEXT.md tests/README.md 07_CHANGELOG.md tasks/current.md docs/superpowers/plans/2026-08-09-shopping-ui-list-selection-workflow-state.md
git diff --cached --check
git commit -m "docs(shopping): record list selection state seam"
```

---

### Task 5: Full Verification and Push `dev`

**Files:**
- Verify all changed files; modify only documentation test counts if the fresh totals differ.

**Interfaces:**
- Consumes: complete repository test and governance gates.
- Produces: pushed `origin/dev` containing only the approved scope.

- [ ] **Step 1: Run every Node test file**

```powershell
$nodeTests = Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name
foreach($test in $nodeTests){ node $test.FullName; if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE } }
Write-Output ("NODE_TEST_FILES=" + $nodeTests.Count)
```

Expected: every file exits `0`; record the printed file count.

- [ ] **Step 2: Run the full browser suite**

```powershell
npm run test:browser
```

Expected: exit `0`; record the Playwright passed count from fresh output.

- [ ] **Step 3: Run governance and version gates**

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
Get-Content -Raw .ai-manifest.json | ConvertFrom-Json | Out-Null
git diff --check
git status --short --branch
```

Expected: commands exit `0`; App/SW remain v98; only intended files differ from `origin/dev`.

- [ ] **Step 4: Update only evidence counts if needed, then re-run affected gates**

If the fresh Node/Playwright totals differ from documentation, replace only the count literals in the new `07_CHANGELOG.md` and `tasks/current.md` entries using `apply_patch`, then rerun `tools/check-doc-titles.js`, `git diff --check`, and the focused Shopping UI state tests. Commit the evidence-only correction:

```powershell
git add 07_CHANGELOG.md tasks/current.md
git diff --cached --check
git commit -m "docs(shopping): record final workflow verification"
```

- [ ] **Step 5: Review the final diff and commit history**

```powershell
git diff --stat origin/dev...HEAD
git diff --name-status origin/dev...HEAD
git log --oneline --decorate origin/dev..HEAD
git status --short --branch
```

Confirm no changes to `app-version.js`, `buy-to-ledger.js`, `shopping-photo-store.js`, `schema.js`, `validator.js`, `netlify.toml`, Apps Script, or generated BUILTIN data.

- [ ] **Step 6: Push directly to `origin/dev`**

```powershell
git push origin dev
```

Expected: push succeeds and `git rev-parse HEAD` equals `git rev-parse origin/dev`.

Do not merge `main`, deploy Netlify, create a PR, or create a production tag.
