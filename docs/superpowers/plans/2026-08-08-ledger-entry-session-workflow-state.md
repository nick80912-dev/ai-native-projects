# Ledger Entry Session Workflow State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the existing `ledger-ui-state.js` module so the same state machine owns Ledger create/edit entry-session lifecycle, save coordination, calendar state, and return context without absorbing accounting or DOM logic.

**Architecture:** Extend the existing pure `createState(seed)` / `transition(state, action)` / `createWorkflow(adapter)` seam with semantic entry actions and ordered UI effects. Drafts, edit descriptors, save outcomes, and return contexts remain opaque values; `index.html` supplies domain helpers and a DOM adapter, while session/request IDs reject stale asynchronous completions.

**Tech Stack:** ES5-compatible UMD JavaScript, Node `assert` tests, Playwright 1.62 Chromium tests, single-file browser runtime in `index.html`, existing PWA Service Worker.

## Global Constraints

- Work from `dev`; run the pre-work gate before edits and stop on unexpected changes.
- Preserve the existing exports `createState`, `transition`, `activeHistoryFilterCount`, and `createWorkflow`; do not add a second entry-state module or new exported setters.
- Do not move Ledger validation, record construction, repository access, sync, Buy-to-Ledger domain logic, or DOM rendering into `ledger-ui-state.js`.
- Scope is create/edit entry lifecycle, draft/editing lifecycle ownership, `savePending`, calendar, return context, and stale-result protection.
- Correction, settlement, and calculator internals remain outside the new actions; correction keeps an explicit compatibility branch and calculator keeps parent-unmount cleanup.
- Keep Ledger/Shopping schema, backup format, Apps Script, `PERSONAL_STATE_VERSION=9`, and `netlify.toml` unchanged.
- Release planning assumption: use v97 for this approved active architecture slice and move the reserved two-version SW update prompt check from v97/v98 to v98/v99. If this assumption is rejected during plan review, revise the plan before executing Task 8.
- In v97, `sw.js` may change only its version string; do not change install, activate, fetch, `skipWaiting`, `clients.claim`, or caching strategy. `ledger-ui-state.js` is already in the App Shell.
- Do not push, deploy, tag, merge, or modify `main` while executing this plan.

---

## File map

- `ledger-ui-state.js`: canonical Ledger UI state, pure transitions, ordered effects, and adapter dispatch.
- `index.html`: production draft/domain helpers, Ledger entry DOM adapter, public handlers, persistence coordination, release notes.
- `tests/ledger-ui-state.test.js`: existing history/dashboard contract; update canonical defaults and prove no history regression.
- `tests/ledger-entry-ui-state.test.js`: focused Node contract for entry lifecycle, calendar, save races, and effect ordering.
- `tests/ledger-ui-state-wiring.test.js`: static production-wiring contract; direct create/edit mutations must disappear from the migrated paths.
- `tests/ledger-draft-track-switch.test.js`: approved cross-track draft transformation behavior.
- `tests/ledger-entry-p0.test.js`: validation and duplicate-save guards.
- `tests/ledger-quick-entry.test.js`: save/add-another and persistence characterization.
- `tests/buy-to-ledger-characterization.test.js`: Shopping source commit, link writeback, add-another cleanup, and edit isolation.
- `tests/browser/ledger-entry-workflow.spec.js`: create/edit/save/calendar/return-context/stale-result browser behavior.
- `tests/browser/buy-to-ledger.spec.js`: mounted Shopping overlay return behavior.
- `tests/browser/ledger-calculator.spec.js`: calculator cleanup regression when its parent entry closes.
- `tests/README.md`: test inventory and exact commands.
- `adr/0011-ledger-entry-session-workflow-state.md`, `adr/README.md`, `03_ARCHITECTURE.md`: accepted runtime architecture record and indexes.
- `app-version.js`, `sw.js`, `07_CHANGELOG.md`, `tasks/current.md`: v97 candidate metadata and roadmap shift.

---

### Task 1: Characterize canonical entry session lifecycle

**Files:**
- Create: `tests/ledger-entry-ui-state.test.js`
- Modify: `tests/ledger-ui-state.test.js`
- Modify: `ledger-ui-state.js`

**Interfaces:**
- Consumes: existing `TripLedgerUiState.createState(seed)` and `transition(state, action)`.
- Produces: normalized `entryReturnContext`, `entrySessionId`, `entrySaveRequestId`; actions `open-entry-create`, `open-entry-edit`, `close-entry`, and `entry-track-switched`.

- [ ] **Step 1: Write failing canonical-state tests**

Update the default expected object in `tests/ledger-ui-state.test.js` with:

```js
entryReturnContext:null,
entrySessionId:'',
entrySaveRequestId:'',
```

Change the old opaque-draft seed assertion so a closed create/edit seed cannot retain an orphan draft:

```js
const closedSeed=TripLedgerUiState.createState({sheet:null,draft:{amount:'500'},editing:{track:'personal'}});
assert.strictEqual(closedSeed.draft,null);
assert.strictEqual(closedSeed.editing,null);
assert.strictEqual(closedSeed.savePending,false);
```

Create `tests/ledger-entry-ui-state.test.js` with helpers and create/edit/close assertions:

```js
const assert=require('assert');
const TripLedgerUiState=require('../ledger-ui-state.js');
const plain=value=>JSON.parse(JSON.stringify(value));
const draft={track:'personal',amount:'500',formErrors:{}};
const context={kind:'ledger',scrollY:420,focusId:'ledgerFab'};

let state=TripLedgerUiState.createState();
let opened=TripLedgerUiState.transition(state,{
  type:'open-entry-create',draft,sessionId:'session-1',returnContext:context,focusTarget:'amount'
});
assert.strictEqual(opened.state.sheet,'entry');
assert.strictEqual(opened.state.draft,draft);
assert.strictEqual(opened.state.editing,null);
assert.strictEqual(opened.state.entrySessionId,'session-1');
assert.deepStrictEqual(plain(opened.effects),[
  {type:'close-actions'},
  {type:'mount-entry'},
  {type:'render-entry',preservePosition:false},
  {type:'focus-entry',target:'amount'}
]);

const editing={track:'shared',originals:[{id:'record-1'}]};
opened=TripLedgerUiState.transition(state,{
  type:'open-entry-edit',draft:{track:'shared'},editing,sessionId:'session-2',
  returnContext:{kind:'ledger',scrollY:210},focusTarget:''
});
assert.strictEqual(opened.state.track,'shared');
assert.strictEqual(opened.state.editing,editing);

const closed=TripLedgerUiState.transition(opened.state,{type:'close-entry',restoreBackground:true});
assert.strictEqual(closed.state.sheet,null);
assert.strictEqual(closed.state.draft,null);
assert.strictEqual(closed.state.entrySessionId,'');
assert.deepStrictEqual(plain(closed.effects),[
  {type:'unmount-entry'},
  {type:'restore-entry-context',context:{kind:'ledger',scrollY:210},restoreBackground:true}
]);
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
node tests/ledger-ui-state.test.js
node tests/ledger-entry-ui-state.test.js
```

Expected: failures because the three entry identity/context fields and `open-entry-*` actions do not exist.

- [ ] **Step 3: Add normalized entry state and lifecycle helpers**

In `ledger-ui-state.js`, add pure-data normalization and clearing helpers:

```js
function plainObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
function cloneContext(value){var source=plainObject(value),next={};if(!source)return null;Object.keys(source).forEach(function(key){var item=source[key];if(typeof item!=='function'&&!(item&&item.nodeType))next[key]=item;});return next;}
function clearEntrySession(state){
  state.sheet=null;state.draft=null;state.editing=null;state.savePending=false;
  state.calendarOpen=false;state.calendarYear=0;state.calendarMonth=0;
  state.entryReturnContext=null;state.entrySessionId='';state.entrySaveRequestId='';
  return state;
}
```

Normalize the new fields in `createState(seed)`. For create/edit state, retain a draft only when `sheet==='entry'`; preserve correction seeds through the documented compatibility exception.

- [ ] **Step 4: Implement lifecycle transitions**

Add cases with exact payload names:

```js
case 'open-entry-create':
case 'open-entry-edit':
  if(!plainObject(command.draft)||!text(command.sessionId).trim())return unchanged(state);
  next=createState(state);
  next.sheet='entry';next.draft=command.draft;
  next.editing=command.type==='open-entry-edit'&&plainObject(command.editing)?command.editing:null;
  next.track=oneOf(command.draft.track,TRACKS,next.track);
  next.savePending=false;next.calendarOpen=false;next.entrySaveRequestId='';
  next.entrySessionId=text(command.sessionId);next.entryReturnContext=cloneContext(command.returnContext);
  return result(next,[
    {type:'close-actions'},{type:'mount-entry'},
    {type:'render-entry',preservePosition:false},
    {type:'focus-entry',target:text(command.focusTarget)}
  ]);
case 'entry-track-switched':
  if(text(command.sessionId)!==state.entrySessionId||!plainObject(command.draft))return unchanged(state);
  next=createState(state);next.draft=command.draft;next.track=oneOf(command.draft.track,TRACKS,next.track);
  return result(next,[{type:'render-entry',preservePosition:true}]);
case 'close-entry':
  if(state.sheet!=='entry'||state.correction)return unchanged(state);
  next=clearEntrySession(createState(state));
  return result(next,[
    {type:'unmount-entry'},
    {type:'restore-entry-context',context:cloneContext(state.entryReturnContext),restoreBackground:command.restoreBackground!==false}
  ]);
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-ui-state.test.js
node tests/ledger-entry-ui-state.test.js
```

Expected: both scripts print their pass messages and exit 0.

- [ ] **Step 6: Commit the lifecycle slice**

```powershell
git add ledger-ui-state.js tests/ledger-ui-state.test.js tests/ledger-entry-ui-state.test.js
git commit -m "feat(ledger): model entry session lifecycle"
```

---

### Task 2: Add validation, save-pending, and stale-result transitions

**Files:**
- Modify: `tests/ledger-entry-ui-state.test.js`
- Modify: `ledger-ui-state.js`

**Interfaces:**
- Consumes: `entrySessionId`, `entrySaveRequestId`, and lifecycle actions from Task 1.
- Produces: `entry-validation-failed`, `entry-save-requested`, `entry-save-succeeded`, and `entry-save-failed` with session/request matching.

- [ ] **Step 1: Add failing save state-table tests**

Append tests covering validation, pending, failure, close success, add-another, and stale completion:

```js
let active=TripLedgerUiState.transition(TripLedgerUiState.createState(),{
  type:'open-entry-create',draft:{track:'personal',amount:'500'},sessionId:'session-save',
  returnContext:{kind:'ledger',scrollY:88},focusTarget:'amount'
}).state;
const invalidDraft={track:'personal',amount:'',formErrors:{amount:'請輸入有效金額'}};
let outcome=TripLedgerUiState.transition(active,{
  type:'entry-validation-failed',sessionId:'session-save',draft:invalidDraft,errorTarget:'amount'
});
assert.strictEqual(outcome.state.draft,invalidDraft);
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'render-entry',preservePosition:true},
  {type:'focus-entry',target:'amount'}
]);

outcome=TripLedgerUiState.transition(outcome.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-1'
});
assert.strictEqual(outcome.state.savePending,true);
assert.strictEqual(outcome.state.entrySaveRequestId,'request-1');
const duplicate=TripLedgerUiState.transition(outcome.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-2'
});
assert.strictEqual(duplicate.changed,false);

const failed=TripLedgerUiState.transition(outcome.state,{
  type:'entry-save-failed',sessionId:'session-save',requestId:'request-1',
  notification:{message:'記帳失敗'}
});
assert.strictEqual(failed.state.savePending,false);
assert.strictEqual(failed.state.draft,invalidDraft);
assert.deepStrictEqual(plain(failed.effects),[
  {type:'sync-entry-pending'},
  {type:'notify-entry-result',notification:{message:'記帳失敗'}}
]);
```

Add separate assertions that:

- close success clears the session and emits pending sync, unmount, split render, restore context, then notification;
- add-another success installs `nextDraft`, clears editing/source state through the supplied draft, keeps the session/context, and focuses `amount`;
- a success/failure with an old session ID or old request ID returns the original state with no effects.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/ledger-entry-ui-state.test.js`

Expected: `entry-save-requested` returns `changed:false` because the action is not implemented.

- [ ] **Step 3: Implement validation and save transitions**

Add a guard:

```js
function matchesEntry(state,command){return state.sheet==='entry'&&!!state.entrySessionId&&text(command.sessionId)===state.entrySessionId;}
function matchesSave(state,command){return matchesEntry(state,command)&&state.savePending&&text(command.requestId)===state.entrySaveRequestId;}
```

Implement the four approved actions. `entry-save-succeeded` must branch only on `command.addAnother===true`; it must not infer success copy or repository semantics. Carry the caller-provided `notification` unchanged into `notify-entry-result`.

Use this exact close-success effect order:

```js
[
  {type:'sync-entry-pending'},
  {type:'unmount-entry'},
  {type:'render-split'},
  {type:'restore-entry-context',context:previousContext,restoreBackground:true},
  {type:'notify-entry-result',notification:command.notification||null}
]
```

For a silent duplicate-confirm cancellation, dispatch `entry-save-failed` with `notification:null`; `notify-entry-result` must not be emitted when no notification exists.

- [ ] **Step 4: Run focused state tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-ui-state.test.js
node tests/ledger-ui-state.test.js
```

Expected: both pass; history transitions remain immutable and unchanged.

- [ ] **Step 5: Commit the save-state slice**

```powershell
git add ledger-ui-state.js tests/ledger-entry-ui-state.test.js
git commit -m "feat(ledger): guard entry save workflow"
```

---

### Task 3: Add pure calendar transitions

**Files:**
- Modify: `tests/ledger-entry-ui-state.test.js`
- Modify: `ledger-ui-state.js`

**Interfaces:**
- Consumes: active entry session and opaque full-draft replacement from Tasks 1–2.
- Produces: `toggle-entry-calendar`, `shift-entry-calendar`, `select-entry-calendar-date`, and `close-entry-calendar`.

- [ ] **Step 1: Write failing calendar tests**

Add assertions for open, close, selection, and both year boundaries:

```js
let calendarState=TripLedgerUiState.transition(TripLedgerUiState.createState(),{
  type:'open-entry-create',draft:{track:'personal',occurredDate:'2026/12/15'},
  sessionId:'calendar-session',returnContext:null,focusTarget:''
}).state;
let calendar=TripLedgerUiState.transition(calendarState,{
  type:'toggle-entry-calendar',sessionId:'calendar-session',year:2026,month:11
});
assert.strictEqual(calendar.state.calendarOpen,true);
calendar=TripLedgerUiState.transition(calendar.state,{
  type:'shift-entry-calendar',sessionId:'calendar-session',delta:1
});
assert.strictEqual(calendar.state.calendarYear,2027);
assert.strictEqual(calendar.state.calendarMonth,0);
calendar=TripLedgerUiState.transition(calendar.state,{
  type:'shift-entry-calendar',sessionId:'calendar-session',delta:-1
});
assert.strictEqual(calendar.state.calendarYear,2026);
assert.strictEqual(calendar.state.calendarMonth,11);

const datedDraft={track:'personal',occurredDate:'2026/12/20',occurredDateError:''};
calendar=TripLedgerUiState.transition(calendar.state,{
  type:'select-entry-calendar-date',sessionId:'calendar-session',draft:datedDraft
});
assert.strictEqual(calendar.state.draft,datedDraft);
assert.strictEqual(calendar.state.calendarOpen,false);
assert.deepStrictEqual(plain(calendar.effects),[{type:'render-entry',preservePosition:true}]);
```

Also assert every calendar action fails closed when no entry is open or the session ID is stale.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/ledger-entry-ui-state.test.js`

Expected: the calendar actions are unchanged and the first `calendarOpen` assertion fails.

- [ ] **Step 3: Implement month normalization and calendar cases**

Add a pure helper without parsing Ledger date strings:

```js
function shiftedMonth(year,month,delta){
  var total=Number(year)*12+Number(month)+Number(delta||0);
  var nextYear=Math.floor(total/12),nextMonth=total-nextYear*12;
  return {year:nextYear,month:nextMonth};
}
```

The toggle action accepts caller-parsed `year` and zero-based `month`; selection accepts a complete next draft. All calendar cases emit `{type:'render-entry',preservePosition:true}` and never access `occurredDate` directly.

- [ ] **Step 4: Run state tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-ui-state.test.js
node tests/ledger-ui-state.test.js
```

Expected: all lifecycle, save, stale-result, and calendar cases pass.

- [ ] **Step 5: Commit the calendar slice**

```powershell
git add ledger-ui-state.js tests/ledger-entry-ui-state.test.js
git commit -m "feat(ledger): model entry calendar state"
```

---

### Task 4: Extend the workflow adapter and wire create/edit lifecycle

**Files:**
- Modify: `tests/ledger-entry-ui-state.test.js`
- Modify: `tests/ledger-ui-state-wiring.test.js`
- Modify: `tests/ledger-draft-track-switch.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: entry effects and actions from Tasks 1–3.
- Produces: production adapter capabilities `mountEntry`, `unmountEntry`, `renderEntry`, `syncEntryPending`, `focusEntry`, `restoreEntryContext`, and `notifyEntryResult`; dispatch-based create/edit/close/track/calendar handlers.

- [ ] **Step 1: Add failing ordered-effect adapter tests**

In `tests/ledger-entry-ui-state.test.js`, create a recording adapter implementing both existing history effects and all entry effects. Dispatch `open-entry-create`, `entry-validation-failed`, and `close-entry`; assert each `writeState` event appears before the first UI effect and that effect order exactly matches the design table.

Use event rows shaped like:

```js
mountEntry:function(effect,state){events.push(['mount-entry',state.entrySessionId]);},
renderEntry:function(effect,state){events.push(['render-entry',effect.preservePosition,state.draft.amount]);},
focusEntry:function(target){events.push(['focus-entry',target]);},
restoreEntryContext:function(context,restore){events.push(['restore-entry-context',context&&context.kind,restore]);}
```

- [ ] **Step 2: Add failing production-wiring assertions**

In `tests/ledger-ui-state-wiring.test.js`, extract the create/edit/close/track/calendar function ranges and assert:

```js
assert.match(openCreateSource,/ledgerUiWorkflow\.dispatch\(\{type:'open-entry-create'/);
assert.match(openEditSource,/ledgerUiWorkflow\.dispatch\(\{type:'open-entry-edit'/);
assert.match(closeSource,/ledgerUiWorkflow\.dispatch\(\{type:'close-entry'/);
assert.doesNotMatch(openCreateSource,/ledgerUiState\.(draft|editing|sheet|savePending)\s*=/);
assert.doesNotMatch(openEditSource,/ledgerUiState\.(draft|editing|sheet|savePending)\s*=/);
assert.match(trackSource,/type:'entry-track-switched'/);
assert.match(calendarSource,/type:'toggle-entry-calendar'/);
```

Keep a separate assertion proving `openLedgerCorrectionSheet()` and correction close/save still use the explicitly documented compatibility branch.

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
node tests/ledger-entry-ui-state.test.js
node tests/ledger-ui-state-wiring.test.js
node tests/ledger-draft-track-switch.test.js
```

Expected: missing effect adapter errors and direct-mutation wiring assertions fail.

- [ ] **Step 4: Extend `createWorkflow(adapter)` effect mapping**

Map exact effect types to adapter methods without adding new module exports:

```js
'mount-entry':'mountEntry',
'unmount-entry':'unmountEntry',
'render-entry':'renderEntry',
'sync-entry-pending':'syncEntryPending',
'focus-entry':'focusEntry',
'restore-entry-context':'restoreEntryContext',
'notify-entry-result':'notifyEntryResult'
```

Pass effect payloads explicitly: render receives `(effect,state)`, focus receives `effect.target`, restore receives `(effect.context,effect.restoreBackground)`, and notification receives `effect.notification`.

- [ ] **Step 5: Implement the production entry adapter**

Extend the existing `ledgerUiWorkflow` adapter in `index.html`:

```js
mountEntry:function(){
  var overlay=document.createElement('div');
  overlay.id='ledgerEntrySheet';overlay.className='ledger-sheet-overlay';
  document.body.appendChild(overlay);document.body.classList.add('ledger-sheet-open');
},
unmountEntry:function(){
  if(ledgerCalculatorState.open)closeLedgerCalculator(false);
  var overlay=document.getElementById('ledgerEntrySheet');if(overlay)overlay.remove();
  document.body.classList.remove('ledger-sheet-open');
},
renderEntry:function(effect){
  if(effect.preservePosition)withLedgerSheetPosition(renderLedgerEntrySheet);
  else renderLedgerEntrySheet();
},
syncEntryPending:function(){syncLedgerSavePendingButtons();},
focusEntry:function(target){focusLedgerEntryTarget(target);},
restoreEntryContext:function(context,restoreBackground){restoreLedgerEntryContext(context,restoreBackground);},
notifyEntryResult:function(notification){applyLedgerEntryNotification(notification);}
```

Keep these helpers in `index.html`; they may read DOM and call existing toast/render utilities.

- [ ] **Step 6: Route create/edit/close/track/calendar handlers through dispatch**

- Generate session/request IDs with an existing collision-safe runtime pattern such as timestamp plus random; do not persist them.
- Capture `ledgerBackgroundScrollY` and the source focus ID in a pure return-context object before dispatch.
- `openLedgerEntrySheet()` dispatches `open-entry-create` with `createLedgerEntryDraft(ledgerUiState.track)`.
- `editLedgerRecord()` performs existing permissions and record lookup first, then dispatches `open-entry-edit` with `ledgerDraftFromRecords()` and the existing edit descriptor.
- `closeLedgerEntrySheet()` branches: correction uses the current compatibility cleanup; create/edit dispatches `close-entry`.
- `setLedgerDraftTrack()` keeps `switchLedgerDraftTrackPlan()` outside the module and dispatches `entry-track-switched` with the planned draft.
- Calendar handlers parse/format dates outside the module and dispatch the four calendar actions.

- [ ] **Step 7: Run focused Node tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-ui-state.test.js
node tests/ledger-ui-state-wiring.test.js
node tests/ledger-draft-track-switch.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-calculator.test.js
node tests/ledger-settlement-correction.test.js
```

Expected: workflow ordering and production dispatch assertions pass; existing draft, calculator, and correction behavior remains green.

- [ ] **Step 8: Commit the production lifecycle wiring**

```powershell
git add ledger-ui-state.js index.html tests/ledger-entry-ui-state.test.js tests/ledger-ui-state-wiring.test.js tests/ledger-draft-track-switch.test.js
git commit -m "refactor(ledger): route entry UI through workflow"
```

---

### Task 5: Route validation and persistence outcomes through the workflow

**Files:**
- Modify: `tests/ledger-entry-p0.test.js`
- Modify: `tests/ledger-quick-entry.test.js`
- Modify: `tests/buy-to-ledger-characterization.test.js`
- Modify: `tests/ledger-ui-state-wiring.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: save actions from Task 2 and DOM adapter from Task 4.
- Produces: one guarded save request per commit, workflow-based success/failure finish, unchanged Buy-to-Ledger atomic-link semantics.

- [ ] **Step 1: Add failing save-wiring characterization**

Add assertions that `saveLedgerEntry()`:

- dispatches `entry-validation-failed` with a complete draft and first error target;
- dispatches `entry-save-requested` before duplicate confirmation/persistence;
- returns `{ok:false,pending:true}` without persistence when the transition is unchanged;
- dispatches `entry-save-failed` with `notification:null` when duplicate confirmation is cancelled;
- passes the same session/request IDs through `commitLedgerEntrySave()` to finish/fail.

In `tests/buy-to-ledger-characterization.test.js`, extend the harness event expectations:

```js
assert.deepStrictEqual(events.slice(0,3),[
  'workflow:save-requested',
  'persist:personal',
  'applyLinks'
]);
assert.strictEqual(harness.sandbox.ledgerUiState.draft.sourceShoppingItemId,'');
assert.strictEqual(harness.sandbox.ledgerUiState.draft.sourceShoppingAllocationId,'');
```

Keep the existing assertions that a link-write failure does not resend or roll back the Ledger record.

- [ ] **Step 2: Run save tests and verify RED**

Run:

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-quick-entry.test.js
node tests/buy-to-ledger-characterization.test.js
node tests/ledger-ui-state-wiring.test.js
```

Expected: dispatch assertions fail because save helpers still call `setLedgerSavePending()` and mutate draft/session state directly.

- [ ] **Step 3: Split notification construction from UI state mutation**

Refactor existing finish/fail helpers so they build notification descriptors without changing session state:

```js
{
  message:'已儲存',
  actionLabel:'復原',
  action:function(){/* existing guarded personal undo */},
  duration:5000
}
```

The action callback remains in the runtime notification descriptor and is consumed immediately by the DOM adapter; it is not stored in `ledgerUiState` or return context.

- [ ] **Step 4: Dispatch guarded save actions around existing persistence**

At the start of an accepted submit:

```js
var sessionId=ledgerUiState.entrySessionId;
var requestId=createLedgerEntryRequestId();
var requested=ledgerUiWorkflow.dispatch({
  type:'entry-save-requested',sessionId:sessionId,requestId:requestId
});
if(!requested.changed)return Promise.resolve({ok:false,pending:true});
```

Pass `{sessionId,requestId}` in the existing command. After persistence or Buy-to-Ledger completes, dispatch exactly one success/failure action. For add-another, compute `resetLedgerDraftAfterSave(draft)` outside the module and pass it as `nextDraft`.

- [ ] **Step 5: Preserve Buy-to-Ledger adapter boundaries**

Keep `buyToLedgerWorkflow.commit(command)` responsible for persistence then link application. Its runtime `finishLedger`/`failLedger` callbacks call the refactored finish/fail functions, which dispatch entry result actions. Do not move `applyLinks`, source inspection, repository writes, or compensation behavior into `ledger-ui-state.js`.

- [ ] **Step 6: Keep correction on its compatibility branch**

Rename the old direct DOM helper to make its limited purpose explicit, for example `syncLegacyCorrectionSavePending(pending)`, and call it only from correction save. Static wiring tests must prove create/edit no longer calls it.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-ui-state.test.js
node tests/ledger-entry-p0.test.js
node tests/ledger-quick-entry.test.js
node tests/buy-to-ledger-characterization.test.js
node tests/buy-to-ledger-module.test.js
node tests/ledger-editing.test.js
node tests/ledger-settlement-correction.test.js
```

Expected: save is single-flight, failure retains the live draft, add-another clears Shopping source refs, editing never writes Shopping links, and correction remains unchanged.

- [ ] **Step 8: Commit the save coordinator wiring**

```powershell
git add index.html tests/ledger-entry-p0.test.js tests/ledger-quick-entry.test.js tests/buy-to-ledger-characterization.test.js tests/ledger-ui-state-wiring.test.js
git commit -m "refactor(ledger): coordinate entry save results"
```

---

### Task 6: Add browser workflow and race regressions

**Files:**
- Create: `tests/browser/ledger-entry-workflow.spec.js`
- Modify: `tests/browser/buy-to-ledger.spec.js`
- Modify: `tests/browser/ledger-calculator.spec.js`

**Interfaces:**
- Consumes: complete production workflow from Tasks 4–5.
- Produces: browser evidence for create/edit/save/calendar/return/focus/race behavior.

- [ ] **Step 1: Create the browser fixture and first failing lifecycle test**

Use existing support helpers:

```js
const {test,expect}=require('@playwright/test');
const {collectPageErrors,installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
const NOW='2026-08-08T10:00:00+08:00';

async function openLedger(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await page.addInitScript(()=>localStorage.setItem('trip_member','Bar'));
  await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('split');openLedgerEntrySheet(false);});
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
}
```

Assert create open/close state, amount focus when requested, background scroll restoration, and no page errors.

- [ ] **Step 2: Add validation, save-and-add-another, and failure cases**

- Empty amount keeps the sheet open, sets `aria-invalid`, focuses the first invalid control, and leaves `savePending=false`.
- A valid personal save closes entry and creates one record.
- Save-and-add-another keeps the same `entrySessionId` and return context, installs a clean draft, clears source IDs, and focuses amount.
- Temporarily replace `personalLedgerRepository.add` with a throwing function; verify the sheet and all entered values remain and buttons re-enable, then restore the method in `finally`.

- [ ] **Step 3: Add calendar and edit cases**

- Calendar opens on the draft month, shifts December to January, selects a date, updates `ledgerOccurredDate`, closes, and retains sheet scroll.
- Editing a seeded personal record opens with `editing.originals`, saves through the same workflow, and never offers save-and-add-another.

- [ ] **Step 4: Add stale asynchronous completion case**

Drive the real workflow seam in page context:

```js
const stale=await page.evaluate(async()=>{
  const firstSession=ledgerUiState.entrySessionId;
  const requestId='browser-stale-request';
  ledgerUiWorkflow.dispatch({type:'entry-save-requested',sessionId:firstSession,requestId});
  closeLedgerEntrySheet(false);
  openLedgerEntrySheet(false);
  const secondSession=ledgerUiState.entrySessionId;
  await Promise.resolve();
  const outcome=ledgerUiWorkflow.dispatch({
    type:'entry-save-succeeded',sessionId:firstSession,requestId,addAnother:false,
    notification:{message:'stale'}
  });
  return {changed:outcome.changed,firstSession,secondSession,current:ledgerUiState.entrySessionId,sheet:ledgerUiState.sheet};
});
expect(stale.changed).toBe(false);
expect(stale.current).toBe(stale.secondSession);
expect(stale.sheet).toBe('entry');
```

- [ ] **Step 5: Extend cross-workflow regressions**

In `buy-to-ledger.spec.js`, retain the mounted Shopping overlay assertion and also verify closing/saving entry restores the correct Shopping context. In `ledger-calculator.spec.js`, open calculator, close the parent entry through the new workflow, and assert both calculator and entry overlays are removed.

- [ ] **Step 6: Run targeted Playwright and verify RED, then GREEN after integration fixes**

Run:

```powershell
npx playwright test tests/browser/ledger-entry-workflow.spec.js tests/browser/buy-to-ledger.spec.js tests/browser/ledger-calculator.spec.js
```

Expected final result: all targeted tests pass with no console/page errors.

- [ ] **Step 7: Commit browser coverage**

```powershell
git add tests/browser/ledger-entry-workflow.spec.js tests/browser/buy-to-ledger.spec.js tests/browser/ledger-calculator.spec.js index.html ledger-ui-state.js
git commit -m "test(ledger): cover entry workflow in browser"
```

---

### Task 7: Record the accepted architecture and test inventory

**Files:**
- Create: `adr/0011-ledger-entry-session-workflow-state.md`
- Modify: `adr/README.md`
- Modify: `adr/0010-ledger-ui-history-workflow-state.md`
- Modify: `03_ARCHITECTURE.md`
- Modify: `tests/README.md`
- Modify: `docs/superpowers/specs/2026-08-08-ledger-entry-session-workflow-state-design.md`

**Interfaces:**
- Consumes: verified runtime interface and actual adapter surface from Tasks 1–6.
- Produces: durable architectural record and reproducible test commands.

- [ ] **Step 1: Write ADR 0011 using the repository seven-section format**

Include these exact headings:

```markdown
# ADR 0011: Ledger Entry Session Workflow State

## Decision
## Context
## Alternatives Considered
## Why This Decision
## Expected Benefits
## Trade-offs
## Future Impact
```

Record that the same module owns history and create/edit session state; drafts remain opaque; session/request IDs reject stale results; correction and Shopping workflow remain separate future vertical slices.

- [ ] **Step 2: Update architecture indexes**

- Add ADR 0011 as Accepted in `adr/README.md`.
- Update ADR 0010 Future Impact so entry session is no longer described as entirely unmigrated.
- Update `03_ARCHITECTURE.md` with entry actions/effects and the adapter boundary; do not claim correction, settlement, calculator, or Shopping state is modularized.

- [ ] **Step 3: Update test documentation and spec status**

Add `ledger-entry-ui-state.test.js` and `browser/ledger-entry-workflow.spec.js` commands to `tests/README.md`. Mark the design spec status as implemented only after Tasks 1–6 pass.

- [ ] **Step 4: Run document checks**

Run:

```powershell
node tools/check-doc-titles.js
git diff --check
```

Expected: both exit 0.

- [ ] **Step 5: Commit architecture documentation**

```powershell
git add adr/0011-ledger-entry-session-workflow-state.md adr/README.md adr/0010-ledger-ui-history-workflow-state.md 03_ARCHITECTURE.md tests/README.md docs/superpowers/specs/2026-08-08-ledger-entry-session-workflow-state-design.md
git commit -m "docs(ledger): record entry workflow architecture"
```

---

### Task 8: Package v97 and run the complete release gate

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` (`APP_RELEASE_NOTES` only in this task)
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: all verified feature and documentation commits.
- Produces: local v97 candidate with actual verification counts and a clean working tree.

- [ ] **Step 1: Re-run the pre-release scope gate**

Run:

```powershell
git branch --show-current
git status --short
git diff --stat 695da944f0d3fee913f7f56e6d6c64f1410ceb61..HEAD
git diff 695da944f0d3fee913f7f56e6d6c64f1410ceb61..HEAD
```

Confirm the branch is `dev`, the tree is clean, and no schema, Apps Script, backup, sync, `netlify.toml`, settlement, correction semantics, or Shopping runtime was added to scope.

- [ ] **Step 2: Update v97 metadata**

- Set `app-version.js` to v97.
- Change only the version string in `sw.js` to v97.
- Add the v97 Ledger entry workflow note to `APP_RELEASE_NOTES` using the existing rolling-count rule.
- Add a v97 architecture delivery entry to `07_CHANGELOG.md`.
- Set the dev candidate to v97 in `tasks/current.md`.
- Move the SW update prompt two-version reservation to v98/v99.
- Keep `PERSONAL_STATE_VERSION=9`; do not modify `netlify.toml`.

- [ ] **Step 3: Run all Node test files**

Run:

```powershell
Get-ChildItem -LiteralPath tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object { node $_.FullName; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE} }
```

Expected: every `tests/*.test.js` file exits 0. Record the actual file count in `tasks/current.md` and `07_CHANGELOG.md`.

- [ ] **Step 4: Run the complete Playwright suite**

Run: `npm run test:browser`

Expected: all browser tests pass. Record the actual passed-test count in the release documents.

- [ ] **Step 5: Run formal document/version/diff gates**

Run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node -e "JSON.parse(require('fs').readFileSync('manifest.webmanifest','utf8'));JSON.parse(require('fs').readFileSync('ai-native-projects.manifest.json','utf8'));console.log('manifest JSON ok')"
git diff --check
```

Expected: every command exits 0; `check-app-version` confirms v97 across App/SW/runtime references.

- [ ] **Step 6: Review the complete change set**

Run:

```powershell
git status --short
git diff --stat cb373814dd2fd6520e72810cbc3beea02c82816d
git diff cb373814dd2fd6520e72810cbc3beea02c82816d
```

Verify that the pre-existing design commit `695da94` plus the implementation commits contain only the approved entry workflow slice, tests, ADR/docs, and v97 metadata.

- [ ] **Step 7: Commit the local v97 candidate**

```powershell
git add app-version.js sw.js index.html 07_CHANGELOG.md tasks/current.md
git commit -m "chore: release v97"
```

- [ ] **Step 8: Verify final local state**

Run:

```powershell
git status --short
git log -8 --oneline
git rev-parse HEAD
```

Expected: working tree is clean. Report the commit list, verification counts, v97 SHA, and explicitly state: not pushed, not deployed, no tag, no `main` modification.

---

## Self-review checklist

- Spec sections 1–15 map to Tasks 1–8.
- One canonical `ledgerUiState` remains; no second module or exported setter is introduced.
- Existing `activeHistoryFilterCount` remains exported for compatibility even though no new public API is added.
- Draft construction, validation, records, repository, sync, Buy-to-Ledger domain, DOM, calculator, correction, and settlement stay outside the module.
- Save request, duplicate-confirm cancellation, success, failure, add-another, and stale completion all have named tests.
- Return context never stores DOM/functions and is carried in the close effect before state clearing.
- Calendar module logic is limited to open state and month arithmetic; Ledger date parsing/formatting remains outside.
- Correction compatibility and calculator parent cleanup have regression coverage.
- v97/v98/v99 scheduling assumption is explicit and reviewable before implementation.
- Full Node, full Playwright, document, version, manifest, and diff gates are included.
- Execution stops at local commits; no push, deploy, tag, merge, or `main` mutation is authorized.
