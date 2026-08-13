# Hotel Profile HID Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hotels name matching with an exact Places.HID → Hotels.HID relationship while preserving five route-specific lodging PIDs and their different travel times.

**Architecture:** Places rows remain itinerary/navigation stops identified by PID; hotel-type rows gain a conditional `hotelId` foreign key that resolves through one shared `hotelOf(place)` function to a Hotels profile. Google Sheet data is migrated before runtime code because old App versions safely ignore the unknown trailing HID column, then Schema 3.0, atomic validation, BUILTIN, v102 and documentation are advanced together.

**Tech Stack:** Vanilla ES5-compatible JavaScript, Google Sheets CMS, Node `assert`/`vm` tests, Playwright, Service Worker PWA cache, Markdown governance documents.

## Global Constraints

- Preserve P002／P013／P022／P031／P040 as separate lodging-stop PIDs; do not move their travel times into the itinerary sheet.
- All five lodging stops reference `H001`; Hotels names and Places names are display text, never join keys.
- `Type=住宿` requires an existing HID; non-hotel Places must not carry HID; several PIDs may share one HID.
- Remove all hotel name substring matching and the `DB.hotels[0]` fallback.
- Global CMS Schema becomes `3.0 (2026-08-11)`; Ledger remains the append-only 21-column 2.9 contract; personal backup remains v9.
- App and Service Worker become v102; SW lifecycle, SHELL, cache strategy, offline fallback and `netlify.toml` stay unchanged except version-dependent output.
- Google Sheet edits are limited to adding Places.HID and setting H001 on the five approved PIDs; use PID lookup, not assumed row numbers.
- `09_SCHEMA_MAPPING.md` and BUILTIN are generated artifacts: regenerate from their authorities instead of hand-editing their generated content.
- Only push `dev`; do not merge `main`, deploy Netlify production or create a production tag.
- Before Task 1, read and follow `google-drive:google-sheets`; before production changes, use `superpowers:test-driven-development`; before completion, use `superpowers:verification-before-completion`.

---

### Task 1: Migrate the connected Google Sheet safely

**Files:**
- External modify: Google Sheet `261018-261023岡山四國六天五夜`, Places tab only
- Reference: `03_DATABASE.md`
- Reference: `docs/superpowers/specs/2026-08-11-hotel-profile-hid-linkage-design.md`

**Interfaces:**
- Consumes: spreadsheet ID `1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`; Places gid `1089684162`; approved mapping `{P002,P013,P022,P031,P040} → H001`.
- Produces: a trailing Places column with header `HID` and exactly five `H001` values, visible through both authenticated Sheets reads and published CSV.

- [ ] **Step 1: Read the Google Sheets skill and inspect metadata**

Read `google-drive:google-sheets/SKILL.md` completely. Fetch spreadsheet metadata and select the Places tab by title/gid. Record its concrete `sheetId`, used range and current last column; do not infer `sheetId` from gid.

- [ ] **Step 2: Capture pre-write evidence**

Read the full Places used range and save in the execution log:

```text
header: PID,地點,Type,MAPCODE,交通時間,停車,營業時間,門票,官網,時刻表連結,備註
P002: Guest House Life Field / 開車30分鐘
P013: Guest House Life Field / 開車2小時
P022: Guest House Life Field / 開車3分鐘
P031: Guest House Life Field / 開車50分鐘
P040: Guest House Life Field / 步行3分鐘
```

Fail closed if `HID` already exists with unexpected non-empty values, any target PID is missing/duplicated, or H001 is not present in Hotels.

- [ ] **Step 3: Build one bounded batch update**

Use the selected Places `sheetId`. Append one column after the actual last used column, then write the header and target cells in one `batch_update_spreadsheet` request. Construct row indexes from the fresh PID read:

```js
const requests=[{
  updateCells:{
    start:{sheetId:placesSheetId,rowIndex:0,columnIndex:hidColumnIndex},
    rows:[{values:[{userEnteredValue:{stringValue:'HID'}}]}],
    fields:'userEnteredValue'
  }
}].concat(['P002','P013','P022','P031','P040'].map(function(pid){
  return {
    updateCells:{
      start:{sheetId:placesSheetId,rowIndex:rowIndexByPid[pid],columnIndex:hidColumnIndex},
      rows:[{values:[{userEnteredValue:{stringValue:'H001'}}]}],
      fields:'userEnteredValue'
    }
  };
}));
```

Do not send `findReplace`, whole-sheet clears, row insertion or requests against other tabs.

- [ ] **Step 4: Verify authenticated values**

Read the header plus all five PID rows again. Verify:

```text
HID header count = 1
P002.HID = P013.HID = P022.HID = P031.HID = P040.HID = H001
all previously captured travel values unchanged
all non-target rows have blank HID
```

- [ ] **Step 5: Verify published CSV convergence**

Fetch the Places published CSV from the `schema.js` pubBase and gid. If Google publication has not converged, re-read with bounded retries but do not rewrite Sheet cells. Stop Task 1 only when the CSV contains one HID header and the five approved H001 values.

---

### Task 2: Add the Schema 3.0 HID contract

**Files:**
- Modify: `tests/schema-types.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`
- Modify: `tests/ledger-schema-contract.test.js`
- Modify: `schema.js`
- Modify: `index.html` (inline fallback Schema only in this task)

**Interfaces:**
- Consumes: Sheet header `HID` from Task 1.
- Produces: `SCHEMA.version === '3.0 (2026-08-11)'` and Places column `{field:'hotelId',header:'HID',aliases:['hotelid','住宿id']}` in external and inline schemas.

- [ ] **Step 1: Write failing Schema tests**

In `tests/schema-types.test.js`, replace the global version assertion and add exact field assertions:

```js
assert.strictEqual(schema.version, '3.0 (2026-08-11)');
const hotelIdColumn = schema.sheets.places.columns.find(function(column) {
  return column.field === 'hotelId';
});
assert(hotelIdColumn, 'Places.HID schema exists');
assert.strictEqual(hotelIdColumn.header, 'HID');
assert.deepStrictEqual(Array.from(hotelIdColumn.aliases), ['hotelid','住宿id']);
assert.notStrictEqual(hotelIdColumn.required, true, 'HID is conditionally required only for hotel rows');
const hotelNameColumn = schema.sheets.hotels.columns.find(function(column) {
  return column.field === 'name';
});
assert.doesNotMatch(hotelNameColumn.desc || '', /名稱比對|match/i);
```

Update only the global Schema assertions in `tests/atomic-sheet-sync.test.js` and `tests/ledger-schema-contract.test.js` to 3.0; retain explicit assertions that Ledger still has 21 columns and its existing record-type contract.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node tests/schema-types.test.js
node tests/atomic-sheet-sync.test.js
node tests/ledger-schema-contract.test.js
```

Expected: failures report Schema 2.9 and missing Places `hotelId`; no syntax/setup errors.

- [ ] **Step 3: Implement the minimal Schema change**

In both `schema.js` and the exact-parity inline Schema in `index.html`:

```js
version: '3.0 (2026-08-11)',
```

Add after Places `type` (physical Sheet column order remains dynamic):

```js
{ field:'hotelId', header:'HID', aliases:['hotelid','住宿id'],
  desc:'住宿停靠點引用 Hotels.HID；只供 Type=住宿 使用' },
```

Change Hotels `name` to:

```js
{ field:'name', header:'名稱', required:true, desc:'住宿主檔顯示名稱；關聯一律使用 HID' },
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the three commands from Step 2. Expected: all three exit 0 while Ledger remains 21 columns.

- [ ] **Step 5: Commit the Schema contract**

```powershell
git add -- tests/schema-types.test.js tests/atomic-sheet-sync.test.js tests/ledger-schema-contract.test.js schema.js index.html
git commit -m "feat(schema): link lodging stops by HID"
```

---

### Task 3: Regenerate BUILTIN and enforce atomic HID validation

**Files:**
- Modify: `tests/builtin-snapshot.test.js`
- Modify: `tests/builtin-snapshot-refresh.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`
- Modify: `validator.js`
- Generated modify: `index.html` BUILTIN block via `tools/refresh-builtin-snapshot.js --write`
- Modify: `index.html` embedded validator exact parity

**Interfaces:**
- Consumes: published Places CSV from Task 1 plus parsed `place.hotelId`, normalized Place type and `hotel.hotelId` from Task 2.
- Produces: a BUILTIN snapshot with the five H001 links and blockers `HOTEL_REF_REQUIRED`, `BROKEN_REF`, `HOTEL_REF_SCOPE` with PID/HID evidence.

- [ ] **Step 1: Write failing BUILTIN assertions**

In `tests/builtin-snapshot.test.js`, after constructing the real DB:

```js
const approved=['P002','P013','P022','P031','P040'];
const lodgingStops=loaded.db.placeList.filter(function(place){ return approved.indexOf(place.placeId)>=0; });
assert.strictEqual(lodgingStops.length,5);
assert.deepStrictEqual(lodgingStops.map(function(place){ return place.hotelId; }),['H001','H001','H001','H001','H001']);
assert.strictEqual(new Set(lodgingStops.map(function(place){ return place.travel; })).size,5,'route-specific travel remains distinct');
```

Update the refresh fixture Places schema/CSV to include `HID` and assert candidate preservation:

```js
places:{gid:'2',kind:'table',columns:['PID','地點','HID'].map(header=>({header}))},
// in csvFixture()
places:'PID,地點,HID\nP001,岡山機場,\nP002,岡山住宿,H001\n',
// after building candidate
assert(candidate.places.includes('P002,岡山住宿,H001'));
```

- [ ] **Step 2: Run BUILTIN tests and verify RED**

```powershell
node tests/builtin-snapshot.test.js
node tests/builtin-snapshot-refresh.test.js
```

Expected: the real BUILTIN test fails because HID has not yet been injected; the synthetic refresh fixture passes.

- [ ] **Step 3: Regenerate BUILTIN through its authority**

Run preview first:

```powershell
node tools/refresh-builtin-snapshot.js
```

Expected: exit 2 with `places` drift. Confirm the output and code path do not request live Ledger. Then run:

```powershell
node tools/refresh-builtin-snapshot.js --write
node tests/builtin-snapshot.test.js
node tests/builtin-snapshot-refresh.test.js
node tools/refresh-builtin-snapshot.js
```

Expected: write exits 0, both tests pass, preview exits 0 with no drift and embedded Ledger remains a header-only 21-column CSV.

- [ ] **Step 4: Extend the validation fixture**

Add `hotel` to the fixture type values and `hotelId` to Places columns:

```js
{field:'type',header:'Type',required:true,values:{attraction:'attraction',ferry:'ferry',hotel:'hotel'}},
{field:'hotelId',header:'HID'}
```

Use this valid shared-profile candidate:

```js
function sharedHotelDb(){
  const db=validDb();
  db.hotels=[{hotelId:'H001',name:'Hotel Profile'}];
  db.placeList.push(
    {placeId:'P002',name:'Arrival A',type:'hotel',tnorm:'hotel',hotelId:'H001'},
    {placeId:'P013',name:'Arrival B',type:'hotel',tnorm:'hotel',hotelId:' h001 '}
  );
  return db;
}
```

- [ ] **Step 5: Write the four failing validation cases**

```js
assert.deepStrictEqual(Array.from(sb.validateSnapshotData(sharedHotelDb(),validRaw(),schema()).blockers), []);

const missingHotelRef=sharedHotelDb();
missingHotelRef.placeList[1].hotelId='';
assert(hasFinding(sb.validateSnapshotData(missingHotelRef,validRaw(),schema()),'HOTEL_REF_REQUIRED','places'));

const brokenHotelRef=sharedHotelDb();
brokenHotelRef.placeList[1].hotelId='H999';
const brokenResult=sb.validateSnapshotData(brokenHotelRef,validRaw(),schema());
assert(hasFinding(brokenResult,'BROKEN_REF','places'));
assert(brokenResult.blockers.some(function(f){ return /P002/.test(f.message)&&/H999/.test(f.message); }));

const wrongScope=validDb();
wrongScope.placeList[0].hotelId='H001';
wrongScope.hotels=[{hotelId:'H001',name:'Hotel Profile'}];
assert(hasFinding(sb.validateSnapshotData(wrongScope,validRaw(),schema()),'HOTEL_REF_SCOPE','places'));
```

- [ ] **Step 6: Run validation test and verify RED**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: missing/broken/scope assertions fail because the new validation codes do not exist.

- [ ] **Step 7: Implement minimal validation**

Capture the Hotels ID set:

```js
var hids=ids(hotelList,'hotelId','hotels');
```

Inside the existing `placeList.forEach`, after normalizing `rawType` and `tnorm`, add:

```js
var hotelId=String(place.hotelId||'').toUpperCase().trim();
var normalizedType=typeValues[rawType]||typeValues[rawType.toLowerCase()]||String(place.tnorm||'').toLowerCase();
if(normalizedType==='hotel'&&!hotelId){
  block('HOTEL_REF_REQUIRED','places','住宿停靠點 ' + place.placeId + ' 缺少 HID');
}else if(normalizedType!=='hotel'&&hotelId){
  block('HOTEL_REF_SCOPE','places','非住宿地點 ' + place.placeId + ' 不得引用 Hotels ' + hotelId);
}
if(hotelId&&!hids[hotelId]){
  block('BROKEN_REF','places','懸空引用:Places ' + place.placeId + ' → ' + hotelId + ' 不存在於 Hotels');
}
```

Apply the same validator source to the embedded `index.html` section so the existing exact-parity assertion stays byte-identical.

- [ ] **Step 8: Run focused and adjacent tests**

```powershell
node tests/atomic-sheet-sync.test.js
node tests/data-reference-consistency.test.js
node tests/builtin-snapshot.test.js
```

Expected: all exit 0.

- [ ] **Step 9: Commit BUILTIN and validation together**

```powershell
git add -- tests/builtin-snapshot.test.js tests/builtin-snapshot-refresh.test.js tests/atomic-sheet-sync.test.js validator.js index.html
git commit -m "feat(data): validate lodging HID references"
```

---

### Task 4: Replace both name resolvers with exact HID resolution

**Files:**
- Create: `tests/hotel-hid-linkage.test.js`
- Create: `tests/browser/hotel-hid-linkage.spec.js`
- Modify: `index.html`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `place.hotelId` and `DB.hotels` validated by Task 3.
- Produces: `hotelOf(place) -> Hotel|null`; `weatherHotelForItem(item,res)` delegates to `hotelOf(res.p)`.

- [ ] **Step 1: Write the Node resolver test**

Use `tests/support/source.js` to execute the real production functions:

```js
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
const sandbox={DB:{hotels:[
  {hotelId:'H001',name:'Renamed Profile',addr:'Address A'},
  {hotelId:'H002',name:'Same Display Name',addr:'Address B'}
]}};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html,'hotelOf')+'\n'+extractFunction(html,'weatherHotelForItem'),sandbox);

assert.strictEqual(sandbox.hotelOf({hotelId:'h001',name:'Completely Different'}).addr,'Address A');
assert.strictEqual(sandbox.hotelOf({hotelId:'H002',name:'Renamed Profile'}).addr,'Address B');
assert.strictEqual(sandbox.hotelOf({name:'Renamed Profile'}),null);
assert.strictEqual(sandbox.hotelOf({hotelId:'H999',name:'Renamed Profile'}),null);
assert.strictEqual(sandbox.weatherHotelForItem({}, {kind:'place',p:{hotelId:'H001',name:'Other'}}).hotelId,'H001');
assert.strictEqual(sandbox.weatherHotelForItem({place:'Renamed Profile'},null),null);
```

- [ ] **Step 2: Write the Browser integration test**

Open the offline BUILTIN App, replace only the test page's in-memory Hotel profiles and two lodging stops, then assert exact resolution and shared profile without DOM overflow:

```js
const result=await page.evaluate(function(){
  DB.hotels=[{hotelId:'H001',name:'住宿主檔新名稱',checkin:'16:00後',addr:'共同地址'}];
  var a={placeId:'P002',name:'每日停靠 A',type:'hotel',tnorm:'hotel',hotelId:'H001',travel:'開車30分鐘'};
  var b={placeId:'P013',name:'每日停靠 B',type:'hotel',tnorm:'hotel',hotelId:'H001',travel:'開車2小時'};
  return {
    hotelA:hotelOf(a).hotelId,
    hotelB:hotelOf(b).hotelId,
    travelA:a.travel,
    travelB:b.travel,
    panelA:infoPanel({kind:'place',p:a}),
    panelB:infoPanel({kind:'place',p:b})
  };
});
expect(result.hotelA).toBe('H001');
expect(result.hotelB).toBe('H001');
expect(result.travelA).not.toBe(result.travelB);
expect(result.panelA).toContain('共同地址');
expect(result.panelB).toContain('共同地址');
```

Repeat the page at 320／375／390px and assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` after rendering the hotel info panel.

- [ ] **Step 3: Run tests and verify RED**

```powershell
node tests/hotel-hid-linkage.test.js
npx playwright test tests/browser/hotel-hid-linkage.spec.js
```

Expected: Node fails because current `hotelOf` still matches names/falls back; Browser fails the renamed-profile exact-link assertions.

- [ ] **Step 4: Implement the shared resolver**

Replace `hotelOf` with:

```js
function hotelOf(place){
  var hotelId=String(place&&place.hotelId||'').toUpperCase().trim();
  if(!hotelId) return null;
  return DB.hotels.find(function(h){
    return String(h&&h.hotelId||'').toUpperCase().trim()===hotelId;
  })||null;
}
```

Replace the independent weather name search with:

```js
function weatherHotelForItem(item,res){
  var p=res&&res.kind==='place'?res.p:null;
  return p&&String(p.tnorm||'').toLowerCase()==='hotel'?hotelOf(p):null;
}
```

Do not add a compatibility fallback.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run both commands from Step 3. Expected: Node and Browser tests exit 0 with no page errors.

- [ ] **Step 6: Document and commit resolver behavior**

Add the new Node and Browser commands to `tests/README.md`, then:

```powershell
git add -- tests/hotel-hid-linkage.test.js tests/browser/hotel-hid-linkage.spec.js index.html tests/README.md
git commit -m "refactor(hotels): resolve profiles by HID"
```

---

### Task 5: Stage v102 and close acceptance/task documentation

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js` (version line only)
- Modify: `index.html` release notes/version-dependent content
- Modify: `02_ARCHITECTURE.md`
- Modify: `03_DATABASE.md`
- Generated modify: `09_SCHEMA_MAPPING.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `tests/README.md` if final test counts/commands changed

**Interfaces:**
- Consumes: completed Sheet migration, Schema/runtime tests and BUILTIN parity from Tasks 1–4.
- Produces: v102 dev candidate; v101 device acceptance recorded; backlog #22 archived.

- [ ] **Step 1: Generate Schema mapping output**

Run `schemaDoc()` from `schema.js` in a Node VM and capture its Markdown. Use that generated body to replace the generated table section of `09_SCHEMA_MAPPING.md`; preserve the hand-maintained file header. Verify it contains:

```text
版本:3.0 (2026-08-11)
| HID(別名:hotelid/住宿id) | hotelId |  | 住宿停靠點引用 Hotels.HID；只供 Type=住宿 使用 |
```

- [ ] **Step 2: Update architecture/data documentation**

Document the N→1 relationship and conditional validation in `02_ARCHITECTURE.md` and `03_DATABASE.md`. Replace all statements that Hotels attach by name. Explicitly state that five PIDs remain separate because their travel contexts differ.

- [ ] **Step 3: Record v101 acceptance and v102 candidate**

In `tasks/current.md`:

- mark v101 Bar device/PWA appearance acceptance complete on 2026-08-11;
- make v102 the dev candidate;
- retain the existing production v73/main v96 deployment gap;
- set the next action to Bar v102 device acceptance after dev push.

Move backlog #22 verbatim from `tasks/backlog.md` to `tasks/done.md` with its executed decision and migration evidence. Do not renumber any backlog item.

- [ ] **Step 4: Update release/handover authorities**

Add a top `07_CHANGELOG.md` entry covering Sheet cells, Schema 3.0, exact resolver, validation, BUILTIN, v102 and non-goals. Update `08_AI_HANDOVER.md` and `.ai-manifest.json` status/field descriptions/test counts without rewriting historical snapshots.

- [ ] **Step 5: Bump the PWA generation atomically**

Set:

```js
// app-version.js
var APP_VERSION='v102';

// sw.js
var SW_VERSION='v102';
```

Add v102 to the five-entry in-App release notes and remove only the oldest displayed entry. Do not change any other `sw.js` line or `netlify.toml`.

- [ ] **Step 6: Run documentation/version gates**

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8'))"
git diff --check
git diff -- sw.js
```

Expected: all commands exit 0; `git diff -- sw.js` shows only v101→v102.

- [ ] **Step 7: Commit v102 documentation and version**

```powershell
git add -- app-version.js sw.js index.html 02_ARCHITECTURE.md 03_DATABASE.md 09_SCHEMA_MAPPING.md 07_CHANGELOG.md 08_AI_HANDOVER.md .ai-manifest.json tasks/current.md tasks/backlog.md tasks/done.md tests/README.md
git commit -m "chore(release): stage HID linkage v102"
```

---

### Task 6: Run the complete release gate and push dev

**Files:**
- Verify: all changed files
- No new production modifications unless a failing test proves a defect and a new RED→GREEN cycle is recorded

**Interfaces:**
- Consumes: all prior task commits.
- Produces: clean v102 dev branch pushed to `origin/dev`, with exact test counts captured in task/changelog authorities.

- [ ] **Step 1: Run all Node test files**

```powershell
$ErrorActionPreference='Stop'
$testFiles=Get-ChildItem -Path tests -Filter '*.test.js' -File | Sort-Object Name
foreach($testFile in $testFiles){
  & node $testFile.FullName
  if($LASTEXITCODE -ne 0){ throw "FAILED: $($testFile.Name)" }
}
Write-Output "NODE_TEST_FILES_PASSED=$($testFiles.Count)"
```

Expected: every file exits 0; record the fresh count.

- [ ] **Step 2: Run complete Playwright**

Run: `npm run test:browser`

Allow at least 10 minutes. Expected: all tests pass, including `hotel-hid-linkage.spec.js`; record passed/skipped/failed counts from the reporter.

- [ ] **Step 3: Run all static/data gates again**

```powershell
node tools/check-runtime-assets.js
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/refresh-builtin-snapshot.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8'))"
git diff --check
```

Expected: all exit 0 and BUILTIN preview reports no drift.

- [ ] **Step 4: Verify requirements line by line**

Confirm from fresh reads/tests:

```text
[ ] authenticated Sheet + published CSV have five H001 links
[ ] P002/P013/P022/P031/P040 and their travel values are unchanged
[ ] no runtime hotel name matching or DB.hotels[0] fallback remains
[ ] missing/broken/wrong-scope HID fails atomic snapshot
[ ] Schema 3.0, Ledger 21-column 2.9 and backup v9 are documented/tested
[ ] sw.js diff is version-only and App/SW are v102
[ ] v101 acceptance and backlog #22 completion are recorded
[ ] no main merge, production deploy or tag occurred
```

- [ ] **Step 5: Correct final counts if needed and reverify**

If fresh totals differ from documents, update only the count/status lines, commit with `docs: record v102 verification`, and rerun the affected static/document gate. Do not claim full green from partial runs.

- [ ] **Step 6: Push dev**

```powershell
git fetch origin --prune
git status --short --branch
git merge-base --is-ancestor origin/dev HEAD
git push origin dev
```

Expected: worktree clean, local history descends from current `origin/dev`, push succeeds. Do not push or modify `main`.

- [ ] **Step 7: Hand off Bar acceptance**

Report the Sheet ranges changed, commit hashes, fresh Node/Playwright/static results and rollback instructions. Ask Bar to verify on dev PWA that the five lodging stops retain distinct travel values and open the same H001 details. Stop before merge/deploy/tag.
