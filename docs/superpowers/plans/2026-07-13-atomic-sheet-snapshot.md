# Atomic Sheet Snapshot Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all seven Google Sheets activate as one validated data version so a partial download can never mix old and new App data.

**Architecture:** Keep the current static ES5 PWA and single `index.html` application structure. Download into an isolated candidate RAW object, build an isolated candidate DB, validate it, then atomically persist `{active, previous}` through one `trip_data_snapshot_state` localStorage write before swapping runtime globals and rendering once.

**Tech Stack:** ES5 browser JavaScript, Promise/fetch, localStorage, static HTML/CSS, Node 20 built-in `assert`/`vm`, Service Worker.

## Global Constraints

- Follow `PROJECT_CONSTITUTION.md`, `15_AI_EXECUTION_RULES.md`, the approved design, and the existing dev push gate.
- Production JavaScript added by this plan uses ES5 syntax: `function` and `var`; no arrow functions, `const`, `let`, or template literals.
- Keep the existing seven Sheet names and Google Sheet schema; do not add or rename Sheet fields.
- Use one state key named exactly `trip_data_snapshot_state` with `formatVersion: 1`, `active`, and `previous`.
- Use one failure key named exactly `trip_sync_last_failure`; it must not contain full CSV data.
- Never mutate runtime `RAW`, `SRC`, `DB`, or the state key until all seven payloads pass blocking validation.
- Unknown Places Type, missing required structure, duplicate IDs, broken references, Ref/name mismatch, invalid TripConfig, and storage failure block activation.
- Optional missing content, unused rows, harmless extra columns, and safely parseable formatting deviations are warnings only.
- Keep at most one previous complete snapshot.
- Do not add IndexedDB, a backend, authentication, Playwright, accessibility changes, weather changes, split-page changes, or unrelated refactors.
- Do not add tests to the Service Worker `SHELL` list.
- A program delivery must bump the Service Worker cache from `okayama-trip-v11` to `okayama-trip-v12` and update the visible diagnostic version.
- Before publication, the public Places CSV row P025 must expose Type `渡輪`; `遊覽船` remains a blocking error.

---

## File Map

- Modify: `validator.js` — structured candidate validation shared by sync and `healthCheck()`.
- Modify: `index.html` — embedded validator parity, pure DB builder, snapshot envelope, legacy migration, atomic sync coordinator, and sync-status panel.
- Create: `tests/atomic-sheet-sync.test.js` — storage, migration, validation, concurrency, and no-partial-activation regression tests.
- Modify: `tests/data-reference-consistency.test.js` — preserve health-check compatibility and assert blocker codes.
- Modify: `tests/pwa-shell.test.js` — assert App Shell v12 after publication.
- Modify: `tests/ios-zoom-guard.test.js` — assert App/SW publication metadata after the functional commit exists.
- Modify: `tests/README.md` — register the new regression test and command.
- Modify: `sw.js` — App Shell cache bump only; no test assets.
- Modify: `07_CHANGELOG.md` — record atomic sync, migration, UI behavior, tests, APP code, and SW v12.

---

### Task 1: Structured Candidate Validation

**Files:**
- Modify: `validator.js:23-116`
- Modify: `index.html:700-828`
- Create: `tests/atomic-sheet-sync.test.js`
- Modify: `tests/data-reference-consistency.test.js`

**Interfaces:**
- Consumes: candidate `db`, candidate `raw`, and `SCHEMA` without reading runtime globals.
- Produces: `validateSnapshotData(db, raw, schema) -> { blockers: Finding[], warnings: Finding[] }`.
- Produces: `makeValidationFinding(level, code, sheet, message) -> Finding` where `Finding` has only `level`, `code`, `sheet`, and `message`.
- Preserves: `healthCheck() -> string[]` for the diagnostic panel and existing tests.

- [ ] **Step 1: Write failing validation tests**

Create `tests/atomic-sheet-sync.test.js` with Node `assert` and `vm`. Load `validator.js` and assert these exact cases:

```js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadValidator(){
  const sandbox = { console:{log:function(){},warn:function(){}}, AppLog:{data:function(){}} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('validator.js','utf8'), sandbox);
  return sandbox;
}

function schema(){
  return { sheets:{
    itin:{label:'行程總表'},
    places:{label:'Places',columns:[{field:'type',values:{'景點':'attraction','渡輪':'ferry'}}]},
    rest:{label:'Restaurants'}, shop:{label:'Shopping'}, hotels:{label:'Hotels'},
    exp:{label:'Expenses'}, cfg:{label:'TripConfig'}
  }};
}

function validRaw(){
  return {itin:'x',places:'x',rest:'x',shop:'x',hotels:'x',exp:'x',cfg:'x'};
}

function validDb(){
  return {
    placeList:[{placeId:'P025',name:'大步危峽谷觀光遊覽船',type:'渡輪',tnorm:'ferry'}],
    rest:[{restId:'R012',name:'手打烏龍麵 Musashi',placeId:''}],
    shop:[], hotels:[], cfg:{tripname:'旅程',startdate:'2026-10-18',enddate:'2026-10-23',travelmode:'drive'},
    trip:{days:[{date:'10/18',items:[{act:'午餐',place:'手打烏龍麵 Musashi',ref:'R012'}]}]}
  };
}

const sb = loadValidator();
assert.deepStrictEqual(Array.from(sb.validateSnapshotData(validDb(),validRaw(),schema()).blockers), []);

const missing = validRaw(); delete missing.shop;
assert(sb.validateSnapshotData(validDb(),missing,schema()).blockers.some(function(f){return f.code==='SHEET_MISSING'&&f.sheet==='shop';}));

const duplicate = validDb(); duplicate.placeList.push({placeId:'P025',name:'重複',type:'景點',tnorm:'attraction'});
assert(sb.validateSnapshotData(duplicate,validRaw(),schema()).blockers.some(function(f){return f.code==='DUPLICATE_ID';}));

const mismatch = validDb(); mismatch.trip.days[0].items[0].ref='R013';
assert(sb.validateSnapshotData(mismatch,validRaw(),schema()).blockers.some(function(f){return f.code==='BROKEN_REF';}));

const unknown = validDb(); unknown.placeList[0].type='遊覽船';
assert(sb.validateSnapshotData(unknown,validRaw(),schema()).blockers.some(function(f){return f.code==='UNKNOWN_PLACE_TYPE';}));

const invalidCfg = validDb(); delete invalidCfg.cfg.startdate;
assert(sb.validateSnapshotData(invalidCfg,validRaw(),schema()).blockers.some(function(f){return f.code==='CFG_REQUIRED';}));
```

Extend `tests/data-reference-consistency.test.js` so a name mismatch is both present in `healthCheck()` text and classified as `REF_NAME_MISMATCH` by `validateSnapshotData()`.

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
node tests/atomic-sheet-sync.test.js
node tests/data-reference-consistency.test.js
```

Expected: `atomic-sheet-sync.test.js` fails because `validateSnapshotData` is not defined; the existing reference test remains green.

- [ ] **Step 3: Implement the structured validator**

Add these functions to `validator.js`, then copy the exact validator source into the embedded validator block in `index.html`:

```js
function makeValidationFinding(level,code,sheet,message){
  return { level:level, code:code, sheet:sheet||'', message:String(message||'') };
}

function sameDisplayName(a,b){
  var left=String(a||'').toLowerCase().replace(/\s+/g,'');
  var right=String(b||'').toLowerCase().replace(/\s+/g,'');
  return !!(left&&right&&(left.indexOf(right)>=0||right.indexOf(left)>=0));
}

function validateSnapshotData(db,raw,schema){
  var result={blockers:[],warnings:[]}, sheets=(schema&&schema.sheets)||{};
  function block(code,sheet,message){ result.blockers.push(makeValidationFinding('blocker',code,sheet,message)); }
  function warn(code,sheet,message){ result.warnings.push(makeValidationFinding('warning',code,sheet,message)); }
  function ids(list,field,sheet){
    var seen={};
    (list||[]).forEach(function(row){
      var id=String(row&&row[field]||'').toUpperCase().trim();
      if(!id) return;
      if(seen[id]) block('DUPLICATE_ID',sheet,'重複 ID：'+id);
      seen[id]=true;
    });
    return seen;
  }
  Object.keys(sheets).forEach(function(key){
    if(!raw||!raw[key]||String(raw[key]).trim().length<5) block('SHEET_MISSING',key,sheets[key].label+' 無有效資料');
  });
  db=db||{};
  var pids=ids(db.placeList,'placeId','places');
  var rids=ids(db.rest,'restId','rest');
  ids(db.shop,'shopId','shop');
  ids(db.hotels,'hotelId','hotels');
  var typeColumn=null;
  ((sheets.places&&sheets.places.columns)||[]).forEach(function(column){ if(column.field==='type') typeColumn=column; });
  var typeValues=typeColumn&&typeColumn.values||{};
  (db.placeList||[]).forEach(function(place){
    var rawType=String(place.type||'').trim();
    if(!typeValues[rawType]&&!typeValues[rawType.toLowerCase()]) block('UNKNOWN_PLACE_TYPE','places',place.placeId+' 未定義 Type「'+rawType+'」');
  });
  (db.rest||[]).forEach(function(rest){
    var pid=String(rest.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','rest',rest.restId+' 指向不存在的 '+pid);
  });
  (db.shop||[]).forEach(function(shop){
    var pid=String(shop.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','shop',shop.shopId+' 指向不存在的 '+pid);
  });
  (db.trip&&db.trip.days||[]).forEach(function(day){
    (day.items||[]).forEach(function(item){
      var ref=String(item.ref||'').toUpperCase().trim(), linked=null;
      if(/^P\d+/.test(ref)&&!pids[ref]) block('BROKEN_REF','itin',day.date+' '+ref+' 不存在於 Places');
      if(/^R\d+/.test(ref)){
        if(!rids[ref]) block('BROKEN_REF','itin',day.date+' '+ref+' 不存在於 Restaurants');
        linked=(db.rest||[]).filter(function(rest){return String(rest.restId||'').toUpperCase()===ref;})[0]||null;
        if(linked&&item.place&&linked.name&&!sameDisplayName(item.place,linked.name)) block('REF_NAME_MISMATCH','itin','引用名稱不一致:行程 '+day.date+'「'+item.place+'」與 '+ref+'「'+linked.name+'」不一致');
      }
    });
  });
  ['tripname','startdate','enddate','travelmode'].forEach(function(field){
    if(!db.cfg||!String(db.cfg[field]||'').trim()) block('CFG_REQUIRED','cfg','TripConfig 缺少 '+field);
  });
  (db.placeList||[]).forEach(function(place){
    if(!place.web) warn('OPTIONAL_EMPTY','places',place.placeId+' 未填官網');
  });
  return result;
}
```

Extend `buildHeaderMap()` so its returned object is `{map,headerIdx,blockers,warnings}`. Missing header rows and missing `required:true` columns append structured blockers; unknown extra columns append structured warnings while preserving the current console messages.

Refactor `healthCheck()` to call `validateSnapshotData(DB,RAW,SCHEMA)`, log blockers and warnings, and return `blockers.concat(warnings).map(function(f){return f.message;})`. Preserve the existing user-facing Chinese substrings such as `引用名稱不一致` so existing diagnostics/tests do not regress.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run the two commands from Step 2.

Expected: both print their existing pass messages; the new test exits 0.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- validator.js index.html tests/atomic-sheet-sync.test.js tests/data-reference-consistency.test.js
git diff --cached --check
git commit -m "test: classify sheet snapshot validation"
```

---

### Task 2: Pure Candidate DB and Atomic State Envelope

**Files:**
- Modify: `index.html:1070-1190`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: seven-key RAW objects and `validateSnapshotData` from Task 1.
- Produces: `createDB(raw) -> db` without mutating global `DB` or `RAW`.
- Produces: `createDataSnapshot(raw,source,createdAt,generationId,validation) -> snapshot`.
- Produces: `readSnapshotState(storage) -> {formatVersion,active,previous}|null`.
- Produces: `writeSnapshotState(storage,nextState) -> true`, throwing before runtime activation on failure.
- Produces: `nextSnapshotState(current,candidate,effectiveSnapshot) -> {formatVersion:1,active:candidate,previous:effectiveSnapshot}`.

- [ ] **Step 1: Add failing storage and purity tests**

Append tests that assert:

```js
const rawA={itin:'itin-a',places:'places-a',rest:'rest-a',shop:'shop-a',hotels:'hotels-a',exp:'exp-a',cfg:'cfg-a'};
const rawB={itin:'itin-b',places:'places-b',rest:'rest-b',shop:'shop-b',hotels:'hotels-b',exp:'exp-b',cfg:'cfg-b'};
const active={formatVersion:1,generationId:'g1',createdAt:1,source:'online',sheets:rawA,sheetMeta:{},validation:{warnings:[]}};
const candidate={formatVersion:1,generationId:'g2',createdAt:2,source:'online',sheets:rawB,sheetMeta:{},validation:{warnings:[]}};
const next=app.nextSnapshotState({formatVersion:1,active:active,previous:null},candidate,active);
assert.strictEqual(next.active.generationId,'g2');
assert.strictEqual(next.previous.generationId,'g1');

const memory={};
const storage={
  getItem:function(key){return Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null;},
  setItem:function(key,value){memory[key]=String(value);}
};
assert.strictEqual(app.writeSnapshotState(storage,next),true);
assert.strictEqual(app.readSnapshotState(storage).active.generationId,'g2');

const old=JSON.stringify({formatVersion:1,active:active,previous:null});
memory.trip_data_snapshot_state=old;
const throwingStorage={getItem:storage.getItem,setItem:function(){throw new Error('quota');}};
assert.throws(function(){app.writeSnapshotState(throwingStorage,next);},/quota/);
assert.strictEqual(memory.trip_data_snapshot_state,old);
```

Extract and execute the new helper functions from `index.html` with this helper, then build `app` as the VM sandbox. Also assert `createDB(raw)` returns a new DB object while pre-existing global `DB` and `RAW` references remain unchanged.

```js
const html = fs.readFileSync('index.html','utf8');
function extractFunction(name){
  const start=html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=html.indexOf('{',start), depth=0;
  for(;index<html.length;index++){
    if(html[index]==='{') depth++;
    if(html[index]==='}') depth--;
    if(depth===0) return html.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}
const app={SHEETS:[{key:'itin'},{key:'places'},{key:'rest'},{key:'shop'},{key:'hotels'},{key:'exp'},{key:'cfg'}]};
vm.createContext(app);
vm.runInContext([
  "var SNAPSHOT_STATE_KEY='trip_data_snapshot_state';var SNAPSHOT_FORMAT_VERSION=1;",
  extractFunction('validSnapshotShape'),
  extractFunction('readSnapshotState'),
  extractFunction('nextSnapshotState'),
  extractFunction('writeSnapshotState')
].join('\n'),app);
```

- [ ] **Step 2: Run the test to verify RED**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: FAIL because `nextSnapshotState` and `writeSnapshotState` do not exist.

- [ ] **Step 3: Refactor DB building and add state helpers**

Refactor the existing `buildDB()` body into:

```js
function createDB(raw){
  var db={trip:null,placeList:[],places:{},rest:[],shop:[],hotels:[],expCMS:[],expMembers:[],cfg:{}};
  db.trip=buildItin(parseCSV(raw.itin||''));
  db.placeList=parseTable(raw.places,'places');
  db.placeList.forEach(function(place){ place.tnorm=normType(place.type); if(place.placeId) db.places[place.placeId.toUpperCase()]=place; });
  db.rest=parseTable(raw.rest,'rest');
  db.shop=parseTable(raw.shop,'shop');
  db.hotels=parseTable(raw.hotels,'hotels');
  var expense=parseExpensesFree(parseCSV(raw.exp||''));
  db.expCMS=expense.items;
  db.expMembers=expense.members;
  db.cfg=parseKeyValue(raw.cfg,'cfg');
  return db;
}
function buildDB(){ DB=createDB(RAW); return DB; }
```

Add the envelope helpers:

```js
var SNAPSHOT_STATE_KEY='trip_data_snapshot_state';
var SNAPSHOT_FAILURE_KEY='trip_sync_last_failure';
var SNAPSHOT_FORMAT_VERSION=1;

function createDataSnapshot(raw,source,createdAt,generationId,validation){
  var sheets={};
  SHEETS.forEach(function(sheet){ sheets[sheet.key]=String(raw[sheet.key]||''); });
  return {formatVersion:1,generationId:generationId,createdAt:createdAt,source:source,sheets:sheets,sheetMeta:{},validation:{warnings:(validation&&validation.warnings)||[]}};
}
function validSnapshotShape(snapshot){
  if(!snapshot||snapshot.formatVersion!==1||!snapshot.generationId||!snapshot.sheets) return false;
  return SHEETS.every(function(sheet){return typeof snapshot.sheets[sheet.key]==='string'&&snapshot.sheets[sheet.key].trim().length>=5;});
}
function readSnapshotState(storage){
  try{
    var raw=storage.getItem(SNAPSHOT_STATE_KEY), state=raw?JSON.parse(raw):null;
    return state&&state.formatVersion===1?state:null;
  }catch(e){ return null; }
}
function nextSnapshotState(current,candidate,effectiveSnapshot){
  var previous=validSnapshotShape(effectiveSnapshot)?effectiveSnapshot:null;
  if(!previous&&current&&validSnapshotShape(current.active)) previous=current.active;
  return {formatVersion:1,active:candidate,previous:previous};
}
function writeSnapshotState(storage,nextState){
  var serialized=JSON.stringify(nextState);
  var parsed=JSON.parse(serialized);
  if(!parsed||parsed.formatVersion!==1||!validSnapshotShape(parsed.active)) throw new Error('快照序列化驗證失敗');
  storage.setItem(SNAPSHOT_STATE_KEY,serialized);
  var saved=readSnapshotState(storage);
  if(!saved||!saved.active||saved.active.generationId!==nextState.active.generationId) throw new Error('快照寫入讀回驗證失敗');
  return true;
}
```

Do not write `v2_cache_*` anywhere in these helpers.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: `atomic sheet sync tests passed`.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- index.html tests/atomic-sheet-sync.test.js
git diff --cached --check
git commit -m "feat: add atomic sheet snapshot envelope"
```

---

### Task 3: Candidate Preparation, Legacy Migration, and Atomic Sync

**Files:**
- Modify: `index.html:1030-1110`
- Modify: `index.html:2450-2478`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: Task 1 validator and Task 2 storage/DB helpers.
- Produces: `prepareSheetCandidate(raw,source,now) -> {snapshot,db,validation}` or throws a blocker summary.
- Produces: `selectBootData(storage,builtin) -> {raw,db,source,snapshot}`.
- Produces: `downloadAllSheets() -> Promise<{raw,sheetMeta}>` with no storage/runtime writes.
- Produces: `syncAll(showToast) -> Promise<result>` and reuses one in-flight Promise.

- [ ] **Step 1: Add failing orchestration tests**

Append scenarios using fake fetch jobs, fake storage, and counters:

```js
assert.strictEqual(renderCount,0);
return coordinator.syncAll(false).then(function(result){
  assert.strictEqual(result.ok,true);
  assert.strictEqual(result.generationId,'g-online');
  assert.strictEqual(renderCount,1);
  assert.strictEqual(runtime.RAW.itin,'new-itin');
  assert.strictEqual(JSON.parse(memory.trip_data_snapshot_state).active.sheets.itin,'new-itin');
});
```

Add a one-failure case and assert byte-for-byte equality of the prior state string, prior runtime RAW/DB identity, and `renderCount === 0`. Add a blocking-validation case with the same invariants. Call `syncAll(false)` twice before resolution and assert all seven fetch functions run only once.

Add boot selection cases:

- valid active wins;
- invalid active falls back to valid previous;
- after a previous fallback, the next successful online commit retains that effective previous rather than the invalid stored active;
- no state plus seven valid legacy `v2_cache_*` values produces `legacy-migrated`;
- invalid legacy uses BUILTIN.

- [ ] **Step 2: Run the test to verify RED**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: FAIL because candidate preparation and atomic coordinator functions do not exist.

- [ ] **Step 3: Implement isolated candidate preparation**

Add:

```js
function prepareSheetCandidate(raw,source,now,generationId){
  var structure=validateCandidateStructure(raw), db, validation;
  if(structure.blockers.length){
    var structureError=new Error(structure.blockers.map(function(f){return f.message;}).join('；'));
    structureError.stage='structure'; structureError.findings=structure.blockers; throw structureError;
  }
  db=createDB(raw);
  validation=validateSnapshotData(db,raw,SCHEMA);
  validation.warnings=structure.warnings.concat(validation.warnings);
  if(validation.blockers.length){
    var error=new Error(validation.blockers.map(function(f){return f.message;}).join('；'));
    error.stage='validation'; error.findings=validation.blockers; throw error;
  }
  return {db:db,validation:validation,snapshot:createDataSnapshot(raw,source,now,generationId,validation)};
}
```

Implement the structure helper exactly as follows. Table Sheets use Task 1's structured `buildHeaderMap`; itinerary temporarily treats all seven existing schema columns as required without modifying `SCHEMA`; Expenses only requires non-empty content; TripConfig required values are checked after parsing by `validateSnapshotData`.

```js
function validateCandidateStructure(raw){
  var result={blockers:[],warnings:[]};
  SHEETS.forEach(function(sheet){
    var text=raw&&raw[sheet.key], def=SCHEMA.sheets[sheet.key], rows, mapped, strictDef;
    if(!text||String(text).trim().length<5){
      result.blockers.push(makeValidationFinding('blocker','SHEET_EMPTY',sheet.key,def.label+' 內容為空'));
      return;
    }
    rows=parseCSV(text);
    if(!rows.length){
      result.blockers.push(makeValidationFinding('blocker','CSV_PARSE',sheet.key,def.label+' 無法解析 CSV'));
      return;
    }
    if(def.kind==='table'){
      mapped=buildHeaderMap(rows,def);
      result.blockers=result.blockers.concat(mapped.blockers||[]);
      result.warnings=result.warnings.concat(mapped.warnings||[]);
    }
    if(def.kind==='itinerary'){
      strictDef={label:def.label,columns:def.columns.map(function(column){
        return {field:column.field,header:column.header,aliases:column.aliases||[],required:true};
      })};
      mapped=buildHeaderMap(rows,strictDef);
      result.blockers=result.blockers.concat(mapped.blockers||[]);
      result.warnings=result.warnings.concat(mapped.warnings||[]);
    }
  });
  return result;
}
```

- [ ] **Step 4: Implement boot migration**

Replace `bootLocal()` with `selectBootData()` plus a thin activating wrapper. Validate active and previous through `prepareSheetCandidate`; legacy cache migration may only proceed when all seven `v2_cache_*` entries exist and their combined candidate has no blockers. BUILTIN goes through the same validator. Do not update legacy keys after this change.

Set a runtime `CURRENT_SNAPSHOT` reference to whichever snapshot boot actually activates. When previous is selected because active is invalid, keep the stored state unchanged for diagnosis and record a failure summary with stage `boot`; the next successful online sync passes `CURRENT_SNAPSHOT` to `nextSnapshotState()` so the valid effective previous is retained instead of the corrupt stored active. When legacy data validates, create a `legacy-migrated` snapshot and write `{formatVersion:1,active:legacySnapshot,previous:null}` through `writeSnapshotState()` before activation. If that write fails, do not activate the legacy candidate; validate and use BUILTIN instead, with Header state `內建版`.

- [ ] **Step 5: Implement all-or-nothing network synchronization**

Replace per-Sheet writes in `syncAll()` with:

```js
var syncInFlight=null;
function downloadAllSheets(){
  var raw={}, meta={};
  return Promise.all(SHEETS.map(function(sheet){
    return fetchSheet(sheet).then(function(text){
      raw[sheet.key]=text; meta[sheet.key]={fetchedAt:Date.now()};
    },function(error){
      error.stage='download'; error.sheet=sheet.key; throw error;
    });
  })).then(function(){return {raw:raw,sheetMeta:meta};});
}
function syncAll(showToast){
  if(syncInFlight) return syncInFlight;
  setSyncState('syncing');
  syncInFlight=downloadAllSheets().then(function(download){
    var now=Date.now(), generation='sheet-'+now;
    var candidate=prepareSheetCandidate(download.raw,'online',now,generation);
    candidate.snapshot.sheetMeta=download.sheetMeta;
    var current=readSnapshotState(localStorage);
    writeSnapshotState(localStorage,nextSnapshotState(current,candidate.snapshot,CURRENT_SNAPSHOT));
    RAW=candidate.snapshot.sheets; SRC={}; SHEETS.forEach(function(sheet){SRC[sheet.key]='online';}); DB=candidate.db; CURRENT_SNAPSHOT=candidate.snapshot;
    renderAll(); setSyncState('online'); localStorage.removeItem(SNAPSHOT_FAILURE_KEY);
    if(showToast) toast('已更新到最新版 ✓');
    return {ok:true,generationId:generation,warnings:candidate.validation.warnings};
  });
  syncInFlight=syncInFlight.then(function(result){
    syncInFlight=null; return result;
  },function(error){
    saveSyncFailure(error); setSyncState('failed');
    if(showToast) toast('更新失敗，已保留上一個完整版本');
    syncInFlight=null;
    return {ok:false,error:error};
  });
  return syncInFlight;
}
```

`saveSyncFailure(error)` writes only `{at,stage,sheet,code,message,activeCreatedAt}` to `trip_sync_last_failure` inside `try/catch`; failure to save diagnostics must never replace the original sync result or mutate the active snapshot. Ensure fetch errors attach `stage:'download'` and the Sheet key. Remove the old `partial` activation path and all online writes to `v2_cache_*`.

- [ ] **Step 6: Run focused tests to verify GREEN**

Run:

```powershell
node tests/atomic-sheet-sync.test.js
node tests/data-reference-consistency.test.js
node tests/home-safety.test.js
```

Expected: all pass; the atomic test confirms one render and no mutation on failure.

- [ ] **Step 7: Commit Task 3**

```powershell
git add -- index.html tests/atomic-sheet-sync.test.js
git diff --cached --check
git commit -m "feat: activate sheets as one validated snapshot"
```

---

### Task 4: Sync Status Panel and User-Facing States

**Files:**
- Modify: `index.html:45-75`
- Modify: `index.html:490-505`
- Modify: `index.html:1090-1120`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: state envelope, failure summary, `APP_BUILD`, and current sync state.
- Produces: `syncStatusModel() -> {state,label,source,lastComplete,failure,warnings}`.
- Produces: `openSyncStatus()`, `closeSyncStatus()`, `renderSyncStatusBody()`, and `retrySyncFromPanel(button)`.

- [ ] **Step 1: Write failing status UI tests**

Assert source contains the five labels `同步中`, `已是最新`, `更新失敗`, `離線版`, and `內建版`; the Header button calls `openSyncStatus()` rather than `manualSyncNew()`; the panel contains APP build, source, last complete time, failure reason, and one retry button.

Execute `syncStatusModel()` with active online, active legacy, BUILTIN, and failed states. Assert failure copy includes the active snapshot time and does not include CSV text. Assert retry is disabled while `syncInFlight` is truthy.

- [ ] **Step 2: Run the test to verify RED**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: FAIL because `openSyncStatus` and the new model do not exist.

- [ ] **Step 3: Implement the compact Header and status panel**

Change the Header button to:

```html
<button class="sync" id="syncBtn" onclick="openSyncStatus()">
  <span class="dot" id="syncDot"></span><span id="syncTxt">同步中</span>
</button>
```

Use a removable overlay with a bottom-sheet/card panel. Render text only through `escapeHtml`. The retry button calls `retrySyncFromPanel(this)`, disables itself during sync, awaits `syncAll(true)`, then rerenders the panel body. Provide a close button and allow background click to close only when the click target is the overlay.

Keep the Header short. The panel renders the full failure sentence:

```text
更新失敗，正在沿用 YYYY/MM/DD HH:mm 的完整版本。
```

For BUILTIN, use `內建版` and never `已是最新`. For a valid snapshot while the network fails, use `更新失敗`; for a prior snapshot loaded without a current failure, use `離線版` until a successful online sync.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```powershell
node tests/atomic-sheet-sync.test.js
node tests/home-simplification.test.js
node tests/render-note.test.js
```

Expected: all pass.

- [ ] **Step 5: Commit the functional implementation**

```powershell
git add -- index.html tests/atomic-sheet-sync.test.js
git diff --cached --check
git commit -m "feat: explain atomic sheet sync status"
```

After the commit, run `$functionalCode=(git rev-parse --short=7 HEAD)` and retain that exact output for Task 5. Task 5 publishes it in `APP_BUILD`.

---

### Task 5: Public CSV Gate, Documentation, and App Shell v12

**Files:**
- Modify: `tests/README.md`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `index.html:850-860`
- Modify: `index.html:2620-2630`
- Modify: `sw.js:14`
- Modify: `07_CHANGELOG.md`

**Interfaces:**
- Consumes: `$functionalCode` captured from Task 4.
- Produces: published Dev build metadata, SW v12, test documentation, and changelog evidence.

- [ ] **Step 1: Verify the public P025 value before publication**

Run:

```powershell
$url='https://docs.google.com/spreadsheets/d/e/2PACX-1vRenmV8UxEzWbzSjKJKi4rSpYt63geBqhEkKsl1GemWVPmFKTcvv3Uk71Hjla3TGBpGIjC7bQDDdI00/pub?single=true&output=csv&gid=1089684162&_ts=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$csv=(Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30 -Headers @{'Cache-Control'='no-cache'}).Content
$row=($csv -split "`n" | Select-String -Pattern '^P025,' | Select-Object -First 1).Line
if($row -notmatch '^P025,[^,]+,渡輪,'){ throw "P025 public Type is not 渡輪: $row" }
Write-Output $row
```

Expected: the printed P025 row has `渡輪` as its third CSV field. If not, stop publication; do not weaken validation.

- [ ] **Step 2: Update test expectations first and verify RED**

Run `$functionalCode=(git rev-parse --short=7 HEAD)` and change PWA/zoom guard expectations to `okayama-trip-v12` and the exact string `APP DEV · CODE $functionalCode · 2026-07-13`, substituting the command output as a seven-character literal in the test.

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
```

Expected: FAIL while production files still show v11/old APP code.

- [ ] **Step 3: Publish metadata and document the test**

- Set `APP_BUILD.code` in `index.html` to the exact seven-character `$functionalCode` captured from Task 4 and keep date `2026-07-13`.
- Replace all visible/diagnostic `okayama-trip-v11` strings with `okayama-trip-v12`.
- Change `sw.js` cache name to `okayama-trip-v12`; leave `SHELL` contents unchanged.
- Add `atomic-sheet-sync.test.js` and its command to `tests/README.md`.
- Add a changelog section covering one-version activation, legacy migration, failure retention, status panel, P025 Gate, tests, APP code, and SW v12.

- [ ] **Step 4: Run publication tests to verify GREEN**

Run the two commands from Step 2 plus `node tests/atomic-sheet-sync.test.js`.

Expected: all pass.

- [ ] **Step 5: Commit publication metadata**

```powershell
git add -- index.html sw.js tests/README.md tests/pwa-shell.test.js tests/ios-zoom-guard.test.js 07_CHANGELOG.md
git diff --cached --check
git commit -m "chore: publish atomic sheet snapshot build"
```

---

### Task 6: Full Verification and Push Gate

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: all previous task commits.
- Produces: evidence that the branch is clean, tests pass, public data passes, and no push occurred without Bar instruction.

- [ ] **Step 1: Run every Node regression test**

```powershell
$node='node'
$tests=Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name
foreach($test in $tests){
  Write-Output ('RUN '+$test.Name)
  & $node $test.FullName
  if($LASTEXITCODE -ne 0){throw ('Test failed: '+$test.Name)}
}
Write-Output ('TEST_COUNT='+$tests.Count)
```

Expected: all existing tests plus `atomic-sheet-sync.test.js` pass.

- [ ] **Step 2: Run governance and scope checks**

```powershell
node tools/check-doc-titles.js
git diff --check
if((Get-Content -Raw sw.js) -match 'tests/'){throw 'tests path found in SW SHELL'}
git status -sb
```

Expected: document check passes, no whitespace errors, SW contains no test path, and the working tree is clean.

- [ ] **Step 3: Repeat the public P025 Gate**

Run Task 5 Step 1 again.

Expected: P025 remains `渡輪` in the public CSV.

- [ ] **Step 4: Perform proportional browser smoke verification**

On the Dev-target build before push, verify:

1. Online boot reaches `已是最新` only after all seven finish.
2. Forced one-Sheet failure leaves the current generation and visible cards unchanged.
3. Status panel identifies the failed Sheet and previous complete time.
4. Retry success changes the generation once and renders once.
5. Trip, Shopping, check/skip, and wishlist flows still work.

Do not label this as the separate Playwright multi-viewport batch.

- [ ] **Step 5: Stop at the established push gate**

Report commits, functional APP code, SW v12, test count, P025 evidence, browser smoke result, and clean status. Do not push until Bar replies `push` or `push dev`.
