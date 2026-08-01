# Shopping C＋E＋G Third Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Ledger draft identity across personal/shared track switches, prioritize required Shopping items within each pending stop group, and move Shopping add/edit into a context-preserving Sheet with continuous-add focus.

**Architecture:** Keep the approved single release batch, but implement it as three independently testable boundaries: a pure Ledger draft transformer for C, a pure stable Shopping group partition for E, and one ephemeral Shopping form controller for G. Existing Ledger persistence, Shopping stores, allocation links, partial purchase, card actions, schemas, and synchronization remain unchanged; the final task performs one integrated Browser QA pass and one Service Worker bump.

**Tech Stack:** Vanilla HTML/CSS, ES5-style JavaScript in `index.html`, Node.js built-in `assert`/`vm` tests, localStorage-backed Shopping/Ledger stores, Service Worker, Codex in-app Browser QA.

## Global Constraints

- Authoritative design: `docs/superpowers/specs/2026-07-29-shopping-c-e-g-third-batch-design.md`.
- Do not modify Ledger 21 columns, Apps Script, Google Sheet, Repository, Queue, Bridge, Retry, synchronization, or settlement.
- Do not modify Shopping Item `allocations[]`, `splitGroupId`, append-only `ledgerLinks[]`, localStorage keys, or Personal State backup v7.
- Shopping-to-Ledger still opens on personal track; users switch to shared inside the Ledger form.
- Do not map `proxyTarget` to `participants` or map participants back to proxy targets.
- Required priority is display-only: `date → stop → required first → original store order`.
- Apply required priority to all pending stop/special groups and Today; do not reorder the done page.
- Shopping add/edit share one Sheet controller; partial purchase and Ledger entry remain card-level primary actions and are not moved into `⋯`.
- “Save and add another” keeps category and stop, resets to `1 個`, clears the other per-item inputs, and synchronously returns focus to Shopping item name.
- Browser QA viewports are exactly 320×700, 375×812, and 390×844.
- Bump Service Worker exactly once, after functional implementation and Browser QA: `okayama-trip-v67` → `okayama-trip-v68`.
- Bar’s iPhone Safari/PWA keyboard check remains a real-device acceptance item; do not claim it passed from desktop Browser QA.
- Do not deploy, merge `main`, push `main`, or push `dev` unless the user separately authorizes it.

## File Map

- Modify `index.html`: C draft transformer and track-switch wiring; E stable group priority; G form session state, Sheet renderer, focus/return logic, card anchors, and Sheet CSS.
- Create `tests/ledger-draft-track-switch.test.js`: executable C contract for single/multi draft identity, hidden track state, source IDs, first-entry defaults, and input immutability.
- Modify `tests/shopping-ledger-links.test.js`: source-to-allocation mapping and current-track-only Ledger record assertions after track switching.
- Modify `tests/shopping-list.test.js`: E stable-priority behavior plus G Sheet/controller/source contracts.
- Modify `tests/README.md`: document the new C test and expanded Shopping coverage.
- Modify `sw.js`: one cache bump from v67 to v68.
- Modify the eight cache-version tests: `tests/ios-zoom-guard.test.js`, `tests/ledger-221-ui.test.js`, `tests/ledger-225.test.js`, `tests/ledger-member-visibility.test.js`, `tests/ledger-mobile-hotfix.test.js`, `tests/ledger-ui-polish.test.js`, `tests/pwa-shell.test.js`, `tests/shopping-ledger-links.test.js`.
- Modify `CONTEXT.md`: track-neutral draft source identity, required priority, and Shopping Sheet/focus contracts.
- Modify `07_CHANGELOG.md`: root causes, protection rules, implementation, tests, and QA evidence.
- Modify `tasks/backlog.md`: mark backlog #14 implemented without removing its decision history.
- Modify `tasks/current.md`: record the v68 runtime status and replace the stale “C／E／G 尚未實作” handoff.

---

### Task 1: Preserve Ledger Draft State and Shopping Source Identity Across Track Switches

**Files:**
- Create: `tests/ledger-draft-track-switch.test.js`
- Modify: `tests/shopping-ledger-links.test.js:458-553`
- Modify: `index.html:6836-6840`
- Modify: `index.html:7003-7008`
- Modify: `index.html:7065-7071`

**Interfaces:**
- Consumes: `createLedgerEntryDraft(track)`, `createLedgerDraftItem(draft,seed)`, `ledgerUiState.draft`, `renderLedgerEntrySheet()`, `withLedgerSheetPosition(fn)`.
- Produces: `ledgerDraftInitializedTracks(draft): {personal:boolean,shared:boolean}`, `cloneLedgerDraftItemForTrack(item): object`, `switchLedgerDraftTrackPlan(draft,nextTrack,targetDefaults): object`.
- Invariant: single-root and per-item `sourceShoppingItemId`/`sourceShoppingAllocationId` remain attached to their original draft identity; hidden-track fields are retained but never serialized by the other track.

- [ ] **Step 1: Write the failing pure-transformer test**

Create `tests/ledger-draft-track-switch.test.js` with an `extractFunction(name)` helper matching `tests/ledger-entry-p0.test.js`. Evaluate the three new functions in a `vm` sandbox and add these executable fixtures:

```js
const personal={
  track:'personal',
  initializedTracks:{personal:true,shared:false},
  sourceShoppingItemId:'single-item',
  sourceShoppingAllocationId:'single-allocation',
  isProxy:true,
  proxyTarget:'媽媽',
  participants:[],
  participantsRetained:false,
  formErrors:{amount:'bad'},
  items:[
    {
      key:'row-a',name:'白桃',amount:'500',category:'購物',
      isProxy:true,proxyTarget:'媽媽',
      participantMode:'inherit',participants:[],
      sourceShoppingItemId:'shopping-a',
      sourceShoppingAllocationId:'allocation-a'
    },
    {
      key:'row-b',name:'藥妝',amount:'900',category:'購物',
      isProxy:true,proxyTarget:'阿寶',
      participantMode:'inherit',participants:[],
      sourceShoppingItemId:'shopping-b',
      sourceShoppingAllocationId:'allocation-b'
    }
  ]
};
const sharedDefaults={
  track:'shared',participants:['Bar','Amy'],participantsRetained:false,
  isProxy:false,proxyTarget:''
};
const original=plain(personal);
const shared=plain(sandbox.switchLedgerDraftTrackPlan(
  personal,'shared',sharedDefaults
));

assert.deepStrictEqual(personal,original,'the transformer never mutates its input');
assert.strictEqual(shared.track,'shared');
assert.deepStrictEqual(shared.participants,['Bar','Amy']);
assert.strictEqual(shared.sourceShoppingItemId,'single-item');
assert.strictEqual(shared.sourceShoppingAllocationId,'single-allocation');
assert.deepStrictEqual(
  shared.items.map(item=>[
    item.key,item.isProxy,item.proxyTarget,
    item.sourceShoppingItemId,item.sourceShoppingAllocationId
  ]),
  [
    ['row-a',true,'媽媽','shopping-a','allocation-a'],
    ['row-b',true,'阿寶','shopping-b','allocation-b']
  ]
);
assert.deepStrictEqual(shared.formErrors,{});

shared.items[0].participantMode='custom';
shared.items[0].participants=['Amy'];
const personalAgain=plain(sandbox.switchLedgerDraftTrackPlan(
  shared,'personal',{track:'personal',isProxy:false,proxyTarget:'',participants:[]}
));
assert.strictEqual(personalAgain.items[0].proxyTarget,'媽媽');
assert.deepStrictEqual(personalAgain.items[0].participants,['Amy']);

const sharedAgain=plain(sandbox.switchLedgerDraftTrackPlan(
  personalAgain,'shared',sharedDefaults
));
assert.strictEqual(sharedAgain.items[0].participantMode,'custom');
assert.deepStrictEqual(sharedAgain.items[0].participants,['Amy']);
assert.deepStrictEqual(
  sharedAgain.items.map(item=>item.sourceShoppingAllocationId),
  ['allocation-a','allocation-b']
);
assert.throws(
  ()=>sandbox.switchLedgerDraftTrackPlan(personal,'other',sharedDefaults),
  /帳本/
);
assert.throws(
  ()=>sandbox.switchLedgerDraftTrackPlan({track:'personal',items:{}},'shared',sharedDefaults),
  /草稿/
);
```

Also assert from source that `setLedgerDraftTrack()` calls `switchLedgerDraftTrackPlan()` and no longer rebuilds items through a limited `createLedgerDraftItem(next,{name:...})` seed.

- [ ] **Step 2: Run the new test and verify red**

Run:

```powershell
node .\tests\ledger-draft-track-switch.test.js
```

Expected: FAIL because `ledgerDraftInitializedTracks`, `cloneLedgerDraftItemForTrack`, and `switchLedgerDraftTrackPlan` do not exist and `setLedgerDraftTrack()` still rebuilds incomplete items.

- [ ] **Step 3: Implement the pure draft transformer**

In `index.html`, make `createLedgerEntryDraft(track)` add transient initialization state:

```js
initializedTracks:{
  personal:track==='personal',
  shared:track==='shared'
}
```

Add the pure functions beside `createLedgerDraftItem()`:

```js
function ledgerDraftInitializedTracks(draft){
  var initialized=Object.assign(
    {personal:false,shared:false},
    draft&&draft.initializedTracks||{}
  );
  if(draft&&/^(personal|shared)$/.test(draft.track)){
    initialized[draft.track]=true;
  }
  return initialized;
}
function cloneLedgerDraftItemForTrack(item){
  if(!item||typeof item!=='object')throw new Error('Ledger 品項草稿格式錯誤');
  var next=Object.assign({},item);
  next.key=String(item.key||'');
  if(!next.key)throw new Error('Ledger 品項草稿缺少識別');
  next.participants=Array.isArray(item.participants)
    ?item.participants.slice():[];
  next.isProxy=!!item.isProxy;
  next.proxyTarget=String(item.proxyTarget||'');
  next.participantMode=item.participantMode==='custom'?'custom':'inherit';
  next.sourceShoppingItemId=String(item.sourceShoppingItemId||'');
  next.sourceShoppingAllocationId=String(
    item.sourceShoppingAllocationId||''
  );
  return next;
}
function switchLedgerDraftTrackPlan(draft,nextTrack,targetDefaults){
  if(!draft||typeof draft!=='object')throw new Error('Ledger 草稿格式錯誤');
  if(!/^(personal|shared)$/.test(nextTrack))throw new Error('帳本類型錯誤');
  if(!Array.isArray(draft.items))throw new Error('Ledger 草稿品項格式錯誤');
  targetDefaults=targetDefaults||{};
  var initialized=ledgerDraftInitializedTracks(draft);
  var firstEntry=!initialized[nextTrack];
  var next=Object.assign({},draft);
  next.track=nextTrack;
  next.items=draft.items.map(cloneLedgerDraftItemForTrack);
  next.participants=Array.isArray(draft.participants)
    ?draft.participants.slice():[];
  next.formErrors={};
  next.initializedTracks=initialized;
  if(firstEntry&&nextTrack==='shared'){
    next.participants=Array.isArray(targetDefaults.participants)
      ?targetDefaults.participants.slice():[];
    next.participantsRetained=!!targetDefaults.participantsRetained;
  }
  if(firstEntry&&nextTrack==='personal'){
    next.isProxy=!!targetDefaults.isProxy;
    next.proxyTarget=String(targetDefaults.proxyTarget||'');
  }
  next.initializedTracks[nextTrack]=true;
  return next;
}
```

Do not copy fields one-by-one. Generic shallow copying plus explicit cloning of nested arrays is what preserves source IDs and future non-schema draft properties.

- [ ] **Step 4: Wire the UI handler to the transformer**

Replace the body of `setLedgerDraftTrack(track)` with:

```js
function setLedgerDraftTrack(track){
  var current=ledgerUiState.draft;
  if(!current||track===current.track||!/^(personal|shared)$/.test(track))return;
  try{
    ledgerUiState.draft=switchLedgerDraftTrackPlan(
      current,track,createLedgerEntryDraft(track)
    );
  }catch(error){
    toast(error.message||'切換帳本失敗');
    return;
  }
  withLedgerSheetPosition(renderLedgerEntrySheet);
}
```

Do not write Ledger or Shopping from this handler.

- [ ] **Step 5: Add record-boundary and source-mapping assertions**

In `tests/shopping-ledger-links.test.js`, extend the source-contract section:

```js
const switchSource=html.slice(
  html.indexOf('function setLedgerDraftTrack('),
  html.indexOf('function toggleLedgerCategoryApply(')
);
assert(switchSource.includes('switchLedgerDraftTrackPlan('));
assert(!switchSource.includes('createLedgerDraftItem(next,{'));

const buildSource=html.slice(
  html.indexOf('function buildLedgerExpenseRecords('),
  html.indexOf('function ledgerClientCreatedAt(')
);
assert.match(buildSource,/draft\.track==='personal'/);
assert.match(buildSource,/record\.isProxy=itemProxy/);
assert.match(buildSource,/else\{[\s\S]*record\.participants=/);
assert(!/record\.sourceShopping(Item|Allocation)Id/.test(buildSource));
```

Add a submission fixture in the existing save/link sandbox where two valid rows retain distinct source allocation IDs after `personal → shared → personal`; assert the resulting link plan still targets `allocation-a` and `allocation-b` respectively and a removed row produces no link.

- [ ] **Step 6: Run focused C tests and verify green**

Run:

```powershell
node .\tests\ledger-draft-track-switch.test.js
node .\tests\ledger-entry-p0.test.js
node .\tests\shopping-ledger-links.test.js
```

Expected: all three commands exit 0; the new test prints one success line and the existing Ledger/Shopping link suites keep their current success messages.

- [ ] **Step 7: Commit the C boundary**

```powershell
git add -- index.html tests/ledger-draft-track-switch.test.js tests/shopping-ledger-links.test.js
git commit -m "保留帳本切軌草稿與採買來源"
```

---

### Task 2: Add Stable Required-First Ordering Within Pending Groups

**Files:**
- Modify: `tests/shopping-list.test.js:345-394`
- Modify: `tests/shopping-list.test.js:659-671`
- Modify: `index.html:3123-3155`
- Modify: `index.html:4686-4699`

**Interfaces:**
- Consumes: Shopping items with `category`, existing `buildShoppingStopOrder(days)` and `sortShoppingStopGroups(groups,order)`.
- Produces: `prioritizeShoppingGroupItems(items): ShoppingItem[]`.
- Invariant: the helper returns a new array, never mutates store data, and only partitions exact `category === '必買'`.

- [ ] **Step 1: Add failing stable-partition tests**

In `tests/shopping-list.test.js`, add:

```js
const priorityInput=[
  {id:'n1',name:'一般 1',category:'伴手禮'},
  {id:'r1',name:'必買 1',category:'必買'},
  {id:'n2',name:'一般 2',category:''},
  {id:'r2',name:'必買 2',category:'必買'},
  {id:'n3',name:'一般 3',category:'未知'}
];
const prioritySnapshot=plain(priorityInput);
const prioritized=plain(mod.prioritizeShoppingGroupItems(priorityInput));
assert.deepStrictEqual(
  prioritized.map(item=>item.id),
  ['r1','r2','n1','n2','n3']
);
assert.deepStrictEqual(priorityInput,prioritySnapshot,'display sorting is immutable');
assert.deepStrictEqual(mod.prioritizeShoppingGroupItems([]),[]);
```

Extend the Today fixture so one stop contains normal/required/normal/required items and assert:

```js
assert.deepStrictEqual(
  reminder.groups[0].items,
  ['必買 1','必買 2','一般 1','一般 2']
);
```

Add source assertions that all four pending group types call `prioritizeShoppingGroupItems()`, while the done branch does not.

- [ ] **Step 2: Run Shopping tests and verify red**

Run:

```powershell
node .\tests\shopping-list.test.js
```

Expected: FAIL with `mod.prioritizeShoppingGroupItems is not a function` or the old store-order expectation.

- [ ] **Step 3: Implement the stable partition**

Add beside the existing stop-order helpers:

```js
function prioritizeShoppingGroupItems(items){
  var required=[],others=[];
  (items||[]).forEach(function(item){
    (String(item&&item.category||'')==='必買'?required:others).push(item);
  });
  return required.concat(others);
}
```

Do not use in-place `sort()`.

- [ ] **Step 4: Wire all pending groups and Today**

In `renderShoppingGroups(items)`:

```js
prioritizeShoppingGroupItems(group.items).map(function(item){
  return renderShoppingItem(item,{page:'pending'});
})
```

Apply the same helper before rendering `pending`, `orphans`, and `unknown`. Leave the done branch unchanged.

In `buildShoppingTodayReminder(items,day)`, keep item objects until priority is applied:

```js
groupMap[ref].items.push(item);
```

Then convert to names only after the stable partition:

```js
groups.forEach(function(group){
  group.items=prioritizeShoppingGroupItems(group.items).map(function(item){
    return String(item.name||'').trim();
  });
});
```

Continue to call `sortShoppingStopGroups()` after this transformation.

- [ ] **Step 5: Run focused E tests and verify green**

Run:

```powershell
node .\tests\shopping-list.test.js
node .\tests\shopping-ledger-links.test.js
```

Expected: both commands exit 0; Today and pending source contracts pass, and the done-page contract remains unchanged.

- [ ] **Step 6: Commit the E boundary**

```powershell
git add -- index.html tests/shopping-list.test.js
git commit -m "讓採買必買項目在站點內置頂"
```

---

### Task 3: Move Shopping Add/Edit Into One Independent Sheet

**Files:**
- Modify: `tests/shopping-list.test.js:485-495`
- Modify: `tests/shopping-list.test.js:659-671`
- Modify: `index.html:547-552`
- Modify: `index.html:2777-2835`
- Modify: `index.html:2940-2979`
- Modify: `index.html:2984-3018`
- Modify: `index.html:3252-3261`

**Interfaces:**
- Consumes: `newShoppingForm(item)`, `renderShoppingForm()`, `shoppingListStore`, `shoppingAllocationEditPolicy()`, existing Shopping list overlay.
- Produces: `createShoppingFormSession(mode,item,returnContext,scrollTop): object`, `renderShoppingFormSheet(): void`, `openShoppingForm(mode,id,returnContext): void`, `closeShoppingFormSheet(): void`.
- Session shape: `{mode,itemId,returnContext,returnScrollTop,originalCategory,originalStopRef,savePending}`.
- Invariant: `renderShoppingListOverlay()` never emits the add/edit form inline; `renderShoppingSplitForm()` remains in the list because partial purchase is outside G.

- [ ] **Step 1: Add failing controller and DOM-contract tests**

In `tests/shopping-list.test.js`, add source assertions:

```js
const overlaySource=ui.slice(
  ui.indexOf('function renderShoppingListOverlay('),
  ui.indexOf('function toggleShoppingSelectionMode(')
);
assert(overlaySource.includes('renderShoppingSplitForm()'));
assert(!overlaySource.includes('renderShoppingForm()+'));
assert(overlaySource.includes('renderShoppingFormSheet()'));

const sheetSource=ui.slice(
  ui.indexOf('function renderShoppingFormSheet('),
  ui.indexOf('function shoppingCardLinkBadge(')
);
assert(sheetSource.includes('id="shoppingFormSheet"'));
assert(sheetSource.includes('role="dialog"'));
assert(sheetSource.includes('aria-modal="true"'));
assert(sheetSource.includes('shoppingFormTitle'));
assert(ui.includes('data-shopping-item-id='));
assert(ui.includes("startShoppingEdit('") && ui.includes("'detail'"));
```

Extract and test `createShoppingFormSession()`:

```js
const session=plain(mod.createShoppingFormSession(
  'edit',
  {id:'item-1',category:'伴手禮',stopRef:'stop-a'},
  'list',
  840
));
assert.deepStrictEqual(session,{
  mode:'edit',
  itemId:'item-1',
  returnContext:'list',
  returnScrollTop:840,
  originalCategory:'伴手禮',
  originalStopRef:'stop-a',
  savePending:false
});
assert.throws(
  ()=>mod.createShoppingFormSession('edit',null,'list',0),
  /採買項目/
);
```

Keep assertions proving `部分購買`, `記帳`, and `⋯` still render from `renderShoppingItem()`.

- [ ] **Step 2: Run Shopping tests and verify red**

Run:

```powershell
node .\tests\shopping-list.test.js
```

Expected: FAIL because the session/helper/Sheet do not exist and the form is still inline.

- [ ] **Step 3: Add the ephemeral form session**

Extend `shoppingUiState`:

```js
var shoppingUiState={
  tab:'pending',
  form:null,
  formSession:null,
  split:null,
  selectionMode:false,
  selected:{}
};
```

Add:

```js
function createShoppingFormSession(mode,item,returnContext,scrollTop){
  mode=mode==='edit'?'edit':'add';
  if(mode==='edit'&&(!item||!item.id))throw new Error('找不到採買項目');
  return {
    mode:mode,
    itemId:mode==='edit'?String(item.id):'',
    returnContext:returnContext==='detail'?'detail':'list',
    returnScrollTop:Math.max(0,Number(scrollTop)||0),
    originalCategory:String(item&&item.category||''),
    originalStopRef:String(item&&item.stopRef||''),
    savePending:false
  };
}
function shoppingListScrollTop(){
  var panel=document.querySelector('#shoppingListOverlay .shopping-list-panel');
  return panel?panel.scrollTop:0;
}
```

Reset `formSession` in `openShoppingList()` and `closeShoppingList()`.

- [ ] **Step 4: Implement the Sheet renderer**

Add:

```js
function closeShoppingFormSheet(){
  var overlay=document.getElementById('shoppingFormSheet');
  if(overlay)overlay.remove();
  var list=document.getElementById('shoppingListOverlay');
  if(list){list.removeAttribute('inert');list.removeAttribute('aria-hidden');}
}
function renderShoppingFormSheet(){
  if(!shoppingUiState.form){closeShoppingFormSheet();return;}
  var overlay=document.getElementById('shoppingFormSheet');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='shoppingFormSheet';
    overlay.className='ledger-sheet-overlay shopping-form-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML=
    '<section class="ledger-sheet shopping-form-sheet" role="dialog" '+
    'aria-modal="true" aria-labelledby="shoppingFormTitle">'+
    renderShoppingForm()+'</section>';
  var list=document.getElementById('shoppingListOverlay');
  if(list){list.setAttribute('inert','');list.setAttribute('aria-hidden','true');}
}
```

Change the form heading to:

```html
<h3 id="shoppingFormTitle">新增採買項目</h3>
```

or `編輯採買項目` in edit mode.

Add CSS:

```css
.shopping-form-overlay{z-index:150}
.shopping-form-sheet{
  width:min(100%,620px);
  max-height:100dvh;
  overflow-y:auto;
  touch-action:pan-y;
  overscroll-behavior:contain;
  padding-bottom:calc(18px + env(safe-area-inset-bottom))
}
.shopping-form-sheet .shopping-form{
  margin:0;
  border:0;
  box-shadow:none
}
```

- [ ] **Step 5: Route add/edit openings through the controller**

Implement:

```js
function openShoppingForm(mode,id,returnContext){
  var item=mode==='edit'
    ?shoppingListStore.all().filter(function(value){
      return value.id===String(id);
    })[0]
    :null;
  if(mode==='edit'&&!item){toast('找不到採買項目');return;}
  shoppingUiState.split=null;
  shoppingUiState.form=mode==='edit'?newShoppingForm(item):newShoppingForm();
  if(item){
    shoppingUiState.form.allocationEditPolicy=
      shoppingAllocationEditPolicy(item,shoppingLedgerContext());
  }
  shoppingUiState.formSession=createShoppingFormSession(
    mode,item,returnContext,shoppingListScrollTop()
  );
  renderShoppingFormSheet();
}
function startShoppingAdd(){openShoppingForm('add','', 'list');}
function startShoppingEdit(id,returnContext){
  openShoppingForm('edit',id,returnContext||'list');
}
```

Change the detail footer to:

```js
closeShoppingItemDetail();startShoppingEdit(item.id,'detail');
```

Add `data-shopping-item-id="'+escapeHtml(item.id)+'"` to each Shopping
`<article>` so return logic has one stable UI anchor.

- [ ] **Step 6: Remove the inline form and isolate form rerenders**

In `renderShoppingListOverlay()`:

```js
renderShoppingSplitForm()+
'<div class="shopping-list-tools">...'
```

After assigning `panel.innerHTML`, call:

```js
renderShoppingFormSheet();
```

Change form-only rerender paths such as category, stop, and target changes to call `renderShoppingFormSheet()` rather than rebuilding the entire list. Keep list rerenders for store writes, tab changes, selection changes, and split actions.

- [ ] **Step 7: Run focused Sheet tests and verify green**

Run:

```powershell
node .\tests\shopping-list.test.js
node .\tests\shopping-ledger-links.test.js
node .\tests\shopping-remerge.test.js
```

Expected: all three commands exit 0; source contracts confirm the item form is a Sheet, partial purchase remains wired, and existing allocation/remerge behavior is unchanged.

- [ ] **Step 8: Commit the Sheet shell**

```powershell
git add -- index.html tests/shopping-list.test.js
git commit -m "將採買新增編輯改為獨立 Sheet"
```

---

### Task 4: Complete Save Guards, Return Anchors, and Continuous-Add Focus

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:2821-2889`
- Modify: `index.html:2940-2979`
- Modify: `index.html:2984-3018`

**Interfaces:**
- Consumes: Task 3’s `shoppingUiState.formSession`, `renderShoppingFormSheet()`, card `data-shopping-item-id`, and existing store add/update calls.
- Produces: `focusShoppingNameInput(): void`, `shoppingFormReturnPlan(session,item,cancelled): object`, `restoreShoppingFormReturn(session,item,cancelled): void`, `setShoppingFormSavePending(pending): void`, `focusShoppingFormError(error): void`.
- Return-plan shape: `{target:'detail'|'card'|'list',restoreExactScroll:boolean}`.
- Invariant: only a successful store write may close/reset the Sheet; “save and add another” focuses the new name field synchronously in the same user action.

- [ ] **Step 1: Add failing return/focus/save-guard tests**

Add pure return-plan tests:

```js
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {
      returnContext:'list',
      originalCategory:'伴手禮',
      originalStopRef:'stop-a'
    },
    {id:'item-1',category:'伴手禮',stopRef:'stop-a'},
    false
  )),
  {target:'card',restoreExactScroll:true}
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {
      returnContext:'list',
      originalCategory:'伴手禮',
      originalStopRef:'stop-a'
    },
    {id:'item-1',category:'必買',stopRef:'stop-a'},
    false
  )),
  {target:'card',restoreExactScroll:false}
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {returnContext:'detail',originalCategory:'',originalStopRef:''},
    {id:'item-1',category:'必買',stopRef:'stop-b'},
    false
  )),
  {target:'detail',restoreExactScroll:false}
);
```

Add source assertions:

```js
const commitSource=extractUiFunction('commitShoppingFormPayload');
assert(commitSource.includes('focusShoppingNameInput()'));
assert(!/requestAnimationFrame[\s\S]*shoppingName/.test(commitSource));
assert(commitSource.includes('shoppingSaveAnotherForm(form)'));
assert(commitSource.includes('restoreShoppingFormReturn('));

const saveSource=extractUiFunction('saveShoppingForm');
assert(saveSource.includes('formSession.savePending'));
assert(saveSource.includes('setShoppingFormSavePending(true)'));
assert(saveSource.includes('setShoppingFormSavePending(false)'));

const formSource=extractUiFunction('renderShoppingForm');
assert.match(formSource,/shopping-save-another[^>]*disabled/);
assert.match(formSource,/關閉表單[^>]*disabled/);
```

Keep the existing `shoppingSaveAnotherForm()` assertions for category, stop, quantity `1`, unit `個`, and cleared targets.

- [ ] **Step 2: Run Shopping tests and verify red**

Run:

```powershell
node .\tests\shopping-list.test.js
```

Expected: FAIL because the return plan, synchronous focus helper, and save-pending wiring are absent.

- [ ] **Step 3: Implement focus and return planning**

Add:

```js
function focusShoppingNameInput(){
  var input=document.getElementById('shoppingName');
  if(!input)return;
  try{input.focus({preventScroll:true});}catch(ignore){input.focus();}
}
function shoppingFormReturnPlan(session,item,cancelled){
  session=session||{};
  if(session.returnContext==='detail'){
    return {target:'detail',restoreExactScroll:false};
  }
  if(!item)return {target:'list',restoreExactScroll:!!cancelled};
  var moved=String(item.category||'')!==String(session.originalCategory||'')||
    String(item.stopRef||'')!==String(session.originalStopRef||'');
  return {target:'card',restoreExactScroll:!moved};
}
function shoppingItemCardElement(id){
  var cards=document.querySelectorAll('[data-shopping-item-id]');
  for(var index=0;index<cards.length;index++){
    if(cards[index].getAttribute('data-shopping-item-id')===String(id)){
      return cards[index];
    }
  }
  return null;
}
```

`shoppingItemCardElement()` is only a focus/scroll anchor lookup by stable item ID; it must not infer siblings or domain state from DOM.

After defining `focusShoppingNameInput()`, call it synchronously at the end of
`openShoppingForm()` so the existing first-open name focus is preserved for
both add and edit modes. Do not wrap this call in `requestAnimationFrame()`.

- [ ] **Step 4: Restore card/detail context**

Implement:

```js
function restoreShoppingFormReturn(session,item,cancelled){
  var plan=shoppingFormReturnPlan(session,item,cancelled);
  if(plan.target==='detail'&&item){
    openShoppingItemDetail(item.id);
    return;
  }
  var panel=document.querySelector('#shoppingListOverlay .shopping-list-panel');
  if(plan.restoreExactScroll&&panel){
    panel.scrollTop=Math.max(0,Number(session&&session.returnScrollTop)||0);
  }
  var card=item&&shoppingItemCardElement(item.id);
  if(card){
    if(!plan.restoreExactScroll&&card.scrollIntoView){
      card.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    var body=card.querySelector('.shopping-item-body');
    if(body)body.focus();
    return;
  }
  var fallback=document.getElementById('shoppingListTitle');
  if(fallback){fallback.setAttribute('tabindex','-1');fallback.focus();}
}
```

On cancel, capture the session and original item before clearing `form`/`formSession`, close the Sheet, then call `restoreShoppingFormReturn(session,item,true)`.

- [ ] **Step 5: Add save-pending and first-error handling**

Add:

```js
function setShoppingFormSavePending(pending){
  if(!shoppingUiState.formSession)return;
  shoppingUiState.formSession.savePending=!!pending;
  renderShoppingFormSheet();
}
function focusShoppingFormError(error){
  var quantityError=/數量|單位/.test(String(error&&error.message||''));
  var input=document.getElementById(
    quantityError?'shoppingQuantity':'shoppingName'
  );
  if(input)input.focus();
}
```

At the start of `saveShoppingForm(saveAnother)`:

```js
var session=shoppingUiState.formSession;
if(!session||session.savePending)return;
```

Set pending only after validation and any completed-item confirmation preflight. Clear pending on every failure path. In `renderShoppingForm()`, disable close, cancel, save, and save-and-add when `formSession.savePending` is true.

- [ ] **Step 6: Make commit behavior mode-aware**

Refactor `commitShoppingFormPayload(form,payload,saveAnother)`:

```js
var session=shoppingUiState.formSession;
setShoppingFormSavePending(true);
try{
  var saved=form.id
    ?shoppingListStore.update(form.id,payload)
    :shoppingListStore.add(payload);
  if(!form.id&&saveAnother===true){
    shoppingUiState.form=shoppingSaveAnotherForm(form);
    shoppingUiState.formSession=createShoppingFormSession(
      'add',null,'list',session.returnScrollTop
    );
    renderToday();
    renderShoppingListOverlay();
    renderShoppingFormSheet();
    focusShoppingNameInput();
    toast('採買項目已新增');
    return saved;
  }
  shoppingUiState.form=null;
  shoppingUiState.formSession=null;
  closeShoppingFormSheet();
  renderToday();
  renderShoppingListOverlay();
  toast(form.id?'採買項目已更新':'採買項目已新增');
  restoreShoppingFormReturn(session,saved,false);
  return saved;
}catch(error){
  setShoppingFormSavePending(false);
  focusShoppingFormError(error);
  throw error;
}
```

Keep store add/update synchronous and existing completed-item confirmation semantics. If update throws because the ID vanished, keep the Sheet open and do not call add.

- [ ] **Step 7: Run focused G tests and verify green**

Run:

```powershell
node .\tests\shopping-list.test.js
node .\tests\shopping-ledger-links.test.js
node .\tests\shopping-remerge.test.js
node .\tests\ledger-entry-p0.test.js
```

Expected: all commands exit 0; the add/edit Sheet contract passes, source links/remerge remain intact, and Ledger entry behavior is unchanged.

- [ ] **Step 8: Commit the completed G interaction**

```powershell
git add -- index.html tests/shopping-list.test.js
git commit -m "完成採買 Sheet 返回與連續新增焦點"
```

---

### Task 5: Integrated Browser QA, One Cache Bump, and Documentation

**Files:**
- Modify: `sw.js:9`
- Modify: `tests/ios-zoom-guard.test.js:41`
- Modify: `tests/ledger-221-ui.test.js:108`
- Modify: `tests/ledger-225.test.js:225`
- Modify: `tests/ledger-member-visibility.test.js:316`
- Modify: `tests/ledger-mobile-hotfix.test.js:45`
- Modify: `tests/ledger-ui-polish.test.js:80`
- Modify: `tests/pwa-shell.test.js:57`
- Modify: `tests/shopping-ledger-links.test.js:553`
- Modify: `tests/README.md:23-26`
- Modify: `CONTEXT.md:28-52`
- Modify: `07_CHANGELOG.md:1`
- Modify: `tasks/backlog.md:39-42`
- Modify: `tasks/current.md:3-38`

**Interfaces:**
- Consumes: completed Tasks 1–4 and all current Node suites.
- Produces: `okayama-trip-v68`, documented C/E/G contracts, Browser QA evidence, and an accurate task board.
- Invariant: Service Worker changes only after functional QA, exactly once.

- [ ] **Step 1: Run all focused automated suites before Browser QA**

Run:

```powershell
node .\tests\ledger-draft-track-switch.test.js
node .\tests\ledger-entry-p0.test.js
node .\tests\ledger-quick-entry.test.js
node .\tests\shopping-list.test.js
node .\tests\shopping-ledger-links.test.js
node .\tests\shopping-remerge.test.js
```

Expected: all six commands exit 0.

- [ ] **Step 2: Start a hidden local static server**

Run:

```powershell
$qaServer = Start-Process python `
  -ArgumentList '-m','http.server','8765','--bind','127.0.0.1' `
  -WorkingDirectory 'C:\Users\Aaron Huang\Documents\AARON\ai-native-projects' `
  -WindowStyle Hidden -PassThru
$qaServer.Id
```

Record the exact PID for cleanup. Open `http://127.0.0.1:8765/` with the in-app Browser skill.

- [ ] **Step 3: Browser QA C without external shared-ledger writes**

At each required viewport, use a controlled local browser profile:

1. Create two Shopping items in the same stop with distinct proxy targets.
2. Mark both bought and open the combined Ledger draft from Shopping.
3. Confirm each draft row displays its own proxy target and retains distinct Shopping source identity through UI state.
4. Switch personal → shared, choose a custom participant set for one row, switch shared → personal, and verify both proxy targets return.
5. Switch back to shared and verify the custom participant set returns.
6. Remove one row and verify the other row retains its own source identity.
7. Cancel rather than submitting shared Ledger data, avoiding any external queue/write.

Expected: no lost proxy/participant values, no row identity swapping, and no console errors/warnings.

- [ ] **Step 4: Browser QA E**

At 320×700, 375×812, and 390×844:

1. Create normal, required, normal, required items in one resolved stop.
2. Create required/normal pairs in “隨時可買”; use controlled pending/orphan fixtures if already available in the QA profile.
3. Verify every group renders required items first while preserving relative order inside required and non-required partitions.
4. Verify the stop-group order still follows day/stop itinerary order.
5. Verify Today shows the same within-stop order.
6. Switch to done and verify it remains flat store order.

Expected: no cross-stop/day movement, no data rewrite, and zero horizontal overflow.

- [ ] **Step 5: Browser QA G**

At all three viewports:

1. Create enough items to scroll well below the first viewport.
2. From a deep card, open `⋯ → 編輯`; verify the independent Sheet is immediately visible and the list does not jump to its top.
3. Cancel and verify exact scroll/card focus restoration.
4. Edit the item to category “必買”; save and verify focus returns to the same item at its new required-first position.
5. Edit its stop; save and verify the same ID is scrolled into view in the new group.
6. Enter from Shopping detail, edit, and verify the updated detail reopens.
7. Open add mode and press “儲存並新增”; verify category/stop are retained, the next draft is `1 個`, other fields clear, and `shoppingName === document.activeElement`.
8. Trigger a quantity/name validation error and verify the Sheet remains open with the first erroneous field focused.
9. Rapidly activate save and confirm only one item is created.
10. Verify partial purchase, Ledger entry, card body, checkbox, multi-select, and `⋯` still use their prior event boundaries.

Expected: document, list panel, Sheet, cards, and Toast have zero horizontal overflow; console error/warning count is 0.

- [ ] **Step 6: Stop the exact QA server**

Verify the recorded PID still belongs to the Python `http.server 8765` process, then:

```powershell
Stop-Process -Id $qaServer.Id
```

Do not stop unrelated Python processes.

- [ ] **Step 7: Bump Service Worker exactly once**

Change:

```js
var CACHE_NAME = 'okayama-trip-v67';
```

to:

```js
var CACHE_NAME = 'okayama-trip-v68';
```

Update the eight exact cache assertions from v67 to v68. Do not modify `SHELL`, install, activate, or fetch behavior.

- [ ] **Step 8: Update project documentation**

Make these exact documentation changes:

- `CONTEXT.md`
  - Extend “閉環” to state source IDs are track-neutral draft identity and survive personal/shared switching.
  - Change Shopping stop rank to `dayIndex → day.items index → required-first stable partition`; Today and pending share it, done remains unchanged.
  - Add the independent Shopping add/edit Sheet, item-ID return anchor, and synchronous save-and-add name focus.
- `07_CHANGELOG.md`
  - Add a 2026-07-29 v68 entry with C/E/G root causes, safe degradation, Node evidence, Browser viewports, overflow/console results, and the real-device keyboard check still pending.
- `tasks/backlog.md`
  - Mark #14 implemented at v68 while retaining the three decision bullets.
- `tasks/current.md`
  - Set the latest runtime/commit status accurately after the implementation commit.
  - Add the v68 batch and replace “C／E／G 尚未實作”.
  - Keep iPhone Safari/PWA keyboard verification under “等 Bar 動作”.
- `tests/README.md`
  - Add `ledger-draft-track-switch.test.js`.
  - Extend Shopping tests with required-first ordering, independent Sheet, return anchors, save guard, and continuous-add focus.

- [ ] **Step 9: Run full verification**

Run all 48 test files:

```powershell
$testFiles = Get-ChildItem -LiteralPath '.\tests' -Filter '*.test.js' -File |
  Sort-Object Name
if($testFiles.Count -ne 48){
  throw "Expected 48 test files, found $($testFiles.Count)"
}
foreach($testFile in $testFiles){
  Write-Host "== $($testFile.Name) =="
  node $testFile.FullName
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
node .\tools\check-doc-titles.js
git diff --check
```

Expected: 48/48 test files exit 0, document-title check prints its success line, and `git diff --check` prints nothing.

- [ ] **Step 10: Verify v68 cache replacement and offline reload**

Restart the exact local server, load v68 once, and verify Cache Storage contains `okayama-trip-v68`. Stop that exact server and reload from the Service Worker cache.

Expected:

- App shell reloads offline.
- Cache Storage no longer retains v67.
- Shopping list opens.
- Independent Shopping form Sheet opens.
- No console errors/warnings.

Restart the server only if more QA is needed, and always stop the exact PID afterward.

- [ ] **Step 11: Commit the integrated release**

```powershell
git add -- sw.js index.html `
  tests/ios-zoom-guard.test.js `
  tests/ledger-221-ui.test.js `
  tests/ledger-225.test.js `
  tests/ledger-member-visibility.test.js `
  tests/ledger-mobile-hotfix.test.js `
  tests/ledger-ui-polish.test.js `
  tests/pwa-shell.test.js `
  tests/shopping-ledger-links.test.js `
  tests/README.md CONTEXT.md 07_CHANGELOG.md `
  tasks/backlog.md tasks/current.md
git commit -m "完成採買 C＋E＋G 第三批"
```

- [ ] **Step 12: Verify the final branch state**

Run:

```powershell
git status --short
git log -5 --oneline
git show --check --stat --oneline HEAD
```

Expected: clean worktree; the task commits appear in order; the final commit has no whitespace errors. Do not push until the user authorizes `push dev`.
