# Fuel Type and Day 6 Cluster Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent `fuel` Places type that lets the current P045 Sheet row pass the atomic data Gate, then record the completed Day 6 parent/child-card audit and confirmed Day 2 P013 reference.

**Architecture:** Extend the existing Schema-driven normalization path so `加油站` becomes `fuel`, then add the smallest UI branches needed for the existing type tag and information-button systems. Keep the parent/child runtime untouched; Day 6 findings and the Day 2 decision are governance updates only.

**Tech Stack:** Vanilla JavaScript, Node.js `assert`/`vm` tests, Markdown Schema mapping and task governance, public Google Sheets CSV validation.

## Global Constraints

- P045 is `岡山機場加油站` and must normalize from `加油站` to independent type `fuel`.
- P046 remains `ORIX租車 岡山機場`, normalizes from `租車點` to `parking`, and must not be changed.
- Fuel type tag is exactly `⛽ 加油站` with CSS class `move`.
- Fuel itinerary information button is exactly `⛽ 加油資訊`.
- Fuel reuses existing Place fields and `infoPanel()`; do not add Sheet columns, a Fuel-only panel, or new CSS.
- Bump both Schema copies and generated mapping documentation to `2.3 (2026-07-16)`.
- Do not modify `getChildStopCluster()`, cluster renderers, navigation, progress state, localStorage behavior, Sheet data, or BUILTIN CSV.
- Day 6 audit adds two regression groups: P041→P042 and P043→P044.
- Day 2 `回住宿休息` using P013 is correct; remove the P002 correction task.
- Do not push or deploy unless the user explicitly requests it after local verification.

---

### Task 1: Lock the Fuel Schema and presentation contract in failing tests

**Files:**
- Modify: `tests/schema-types.test.js`
- Modify: `tests/trip-presentation.test.js`
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: `SCHEMA.sheets.places.columns[].values`, `typeTag(res)`, the information-button label map inside `renderItem()`, and both production Schema copies.
- Produces: failing tests that require Schema 2.3, `加油站 → fuel`, the Fuel tag, and the Fuel information-button label.

- [ ] **Step 1: Add the Fuel Schema assertions**

In `tests/schema-types.test.js`, immediately after the existing airport and cable-car assertions, add:

```js
assert.strictEqual(typeColumn.values['加油站'], 'fuel');
assert.strictEqual(typeColumn.values.fuel, 'fuel');
```

Immediately after the existing inline airport and cable-car assertions, add:

```js
assert(html.includes("'加油站':'fuel'"), 'embedded schema includes 加油站');
assert(html.includes("'fuel':'fuel'"), 'embedded schema includes normalized fuel');
```

- [ ] **Step 2: Add the Fuel presentation assertions**

In `tests/trip-presentation.test.js`, immediately after the cable-car assertion, add:

```js
const fuelTag = sandbox.typeTag({
  kind: 'place',
  p: { tnorm: 'fuel', type: '加油站' }
});
assert.strictEqual(fuelTag.label, '⛽ 加油站', 'fuel places use the fuel label');
assert.strictEqual(fuelTag.cls, 'move', 'fuel places reuse the move visual class');

assert.match(
  html,
  /fuel:'⛽ 加油資訊'/,
  'fuel places use the dedicated itinerary information label'
);
```

- [ ] **Step 3: Update the expected Schema version**

In `tests/atomic-sheet-sync.test.js`, change both production Schema version assertions from:

```js
'2.2 (2026-07-16)'
```

to:

```js
'2.3 (2026-07-16)'
```

Keep all strict `行程` Header assertions unchanged.

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node tests/schema-types.test.js
node tests/trip-presentation.test.js
node tests/atomic-sheet-sync.test.js
```

Expected:

- `schema-types.test.js` fails because `加油站` is not mapped to `fuel`.
- `trip-presentation.test.js` fails because Fuel falls through to the generic attraction tag and has no dedicated information label.
- `atomic-sheet-sync.test.js` fails because production still reports Schema 2.2.

Do not edit production code until all three failures have been observed for those reasons.

- [ ] **Step 5: Commit the RED tests**

```powershell
git add -- tests/schema-types.test.js tests/trip-presentation.test.js tests/atomic-sheet-sync.test.js
git commit -m "test: define fuel place type contract"
```

---

### Task 2: Implement the Fuel Schema and renderer

**Files:**
- Modify: `schema.js`
- Modify: `index.html`
- Modify: `09_SCHEMA_MAPPING.md`
- Test: `tests/schema-types.test.js`
- Test: `tests/trip-presentation.test.js`
- Test: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: the failing contracts from Task 1.
- Produces: `schemaType('加油站') === 'fuel'`, `typeTag()` Fuel output, and the Fuel itinerary information label.

- [ ] **Step 1: Bump both Schema versions**

In `schema.js` and the inline fallback Schema in `index.html`, change:

```js
version: '2.2 (2026-07-16)'
```

to:

```js
version: '2.3 (2026-07-16)'
```

- [ ] **Step 2: Add Fuel to both Places Type definitions**

In both `schema.js` and the inline fallback Schema in `index.html`, change the Type description to:

```js
desc:'決定卡片型別,禁止程式猜測。值:購物/美食區/住宿/景點/機場/纜車/渡船口/渡輪/租車點/加油站'
```

Change the mapping to include Fuel without altering existing values:

```js
values:{ '購物':'shopping','美食區':'restarea','住宿':'hotel','景點':'attraction','機場':'attraction','纜車':'attraction','渡船口':'ferry','渡輪':'ferry','租車點':'parking','加油站':'fuel',
         'shopping':'shopping','restaurantarea':'restarea','hotel':'hotel','attraction':'attraction','ferryterminal':'ferry','parking':'parking','fuel':'fuel' }
```

- [ ] **Step 3: Add the Fuel type tag**

In `index.html` `typeTag(res)`, add this branch immediately after the `parking` branch:

```js
if(t==='fuel') return {cls:'move',label:'⛽ 加油站'};
```

The generic attraction fallback remains the final return.

- [ ] **Step 4: Add the Fuel information-button label**

In `index.html` `renderItem()`, change the Place label map from:

```js
({shopping:'🏬 資訊',restarea:'🍜 美食',hotel:'🏨 資訊',ferry:'⛴ 渡輪',parking:'🚗 租車'})
```

to:

```js
({shopping:'🏬 資訊',restarea:'🍜 美食',hotel:'🏨 資訊',ferry:'⛴ 渡輪',parking:'🚗 租車',fuel:'⛽ 加油資訊'})
```

Do not add a Fuel-specific `infoPanel()` branch.

- [ ] **Step 5: Regenerate the Schema mapping body**

In `09_SCHEMA_MAPPING.md`:

- Change the generated version line to `版本:2.3 (2026-07-16)`.
- Replace the Places Type description with the exact generated description ending in `/加油站`.
- Do not manually change unrelated generated rows or the hand-written document header.

The resulting Places Type row must be:

```markdown
| Type(別名:類型) | type | ✅ | 決定卡片型別,禁止程式猜測。值:購物/美食區/住宿/景點/機場/纜車/渡船口/渡輪/租車點/加油站 |
```

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run:

```powershell
node tests/schema-types.test.js
node tests/trip-presentation.test.js
node tests/atomic-sheet-sync.test.js
```

Expected:

```text
schema type tests passed
trip presentation tests passed
atomic sheet sync tests passed
```

- [ ] **Step 7: Commit the Fuel implementation**

```powershell
git add -- schema.js index.html 09_SCHEMA_MAPPING.md
git commit -m "feat: add fuel place rendering"
```

---

### Task 3: Record the Day 6 audit and Day 2 reference decision

**Files:**
- Modify: `tasks/backlog.md`
- Modify: `07_CHANGELOG.md`

**Interfaces:**
- Consumes: the approved Day 6 audit and P013 decision.
- Produces: an authoritative backlog with Day 6 included and no obsolete P002 correction task.

- [ ] **Step 1: Update the parent/child-card backlog scope**

In `tasks/backlog.md`, keep the first two approved parent/child rules unchanged. Replace the Day coverage bullets with:

```markdown
   - Day 1 稽核未發現同類漏項;Day 2–5 回歸測試須涵蓋既有已確認的 10 個地點。
   - Day 6 已完成稽核並納入回歸:「岡山城巡禮」須包含岡山城 P041 → 岡山後樂園 P042;「神社巡禮」須包含吉備津彥神社 P043 → 吉備津神社 P044。
```

Remove the old Day 6 exclusion bullet completely.

- [ ] **Step 2: Remove the obsolete Day 2 task and renumber**

Delete:

```markdown
5. **確認 Day2「回住宿 P012 → P002」試算表修正是否已完成**(舊 06_ROADMAP 遺留項,狀態不明,需對 Sheet 查核一次)。
```

Renumber the following medium- and low-priority items consecutively so the backlog has no gap. Do not add a replacement task; P013 is confirmed correct.

- [ ] **Step 3: Add the Changelog entry**

At the top of `07_CHANGELOG.md`, after the format note and before the existing 2026-07-16 entry, add:

```markdown
## 2026-07-16 — Fuel 地點類型與 Day 6 稽核（Dev）
- Places Type 新增獨立 `fuel` 映射,`加油站`於行程頁與首頁顯示「⛽ 加油站」,行程資訊按鈕顯示「⛽ 加油資訊」。
- Schema 更新至 `2.3 (2026-07-16)`;P045 岡山機場加油站可通過未知 Type Gate,P046 ORIX租車仍維持 `租車點 → parking`。
- Day 6 父子卡稽核新增「岡山城 P041 → 岡山後樂園 P042」與「吉備津彥神社 P043 → 吉備津神社 P044」兩組回歸案例;本批未修改父子卡 runtime。
- Day 2「回住宿休息」確認 P013 為正確引用,取消原 P002 修正待辦。
```

- [ ] **Step 4: Verify the governance diff**

Run:

```powershell
rg -n "Day 6|P041|P042|P043|P044|P013|P002|Fuel|加油站" tasks/backlog.md 07_CHANGELOG.md
```

Expected:

- Day 6 lists both approved groups.
- `tasks/backlog.md` has no P002 correction task.
- The Changelog explicitly records P013 as correct.

- [ ] **Step 5: Commit the audit documentation**

```powershell
git add -- tasks/backlog.md 07_CHANGELOG.md
git commit -m "docs: record day6 cluster audit"
```

---

### Task 4: Verify the live Sheet Gate and full repository

**Files:**
- Verify: `schema.js`
- Verify: `index.html`
- Verify: `09_SCHEMA_MAPPING.md`
- Verify: `tasks/backlog.md`
- Verify: `07_CHANGELOG.md`
- Test: all `tests/*.test.js`

**Interfaces:**
- Consumes: Tasks 1–3 and the seven current public Sheet CSVs.
- Produces: evidence that the current Sheet candidate has zero blockers and the repository remains internally consistent.

- [ ] **Step 1: Run the full Node test suite**

Run:

```powershell
$tests=Get-ChildItem -LiteralPath tests -Filter '*.test.js' | Sort-Object Name
foreach($test in $tests){
  Write-Output ('[RUN] '+$test.Name)
  node $test.FullName
  if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }
}
Write-Output ('ALL_TEST_FILES_PASSED='+$tests.Count)
```

Expected: every test exits 0 and the final line reports all discovered test files passed.

- [ ] **Step 2: Run governance and syntax verification**

Run:

```powershell
node tools/check-doc-titles.js
@'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(function(match){return match[1];})
  .filter(function(script){return script.trim();});
scripts.forEach(function(script){new Function(script);});
console.log('inline JavaScript syntax passed ('+scripts.length+' scripts)');
'@ | node -
git diff --check
```

Expected: document-title validation passes, every inline script compiles, and `git diff --check` has no output.

- [ ] **Step 3: Run the live seven-Sheet Gate**

Run:

```powershell
@'
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');

function extract(name){
  const start=html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=html.indexOf('{',start),depth=0;
  for(;index<html.length;index++){
    if(html[index]==='{') depth++;
    if(html[index]==='}') depth--;
    if(depth===0) return html.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}

const ctx={console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('schema.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('validator.js','utf8'),ctx);
vm.runInContext([
  'parseCSV','parseTable','parseKeyValue','schemaType','buildItin',
  'parseExpensesFree','createDB','validateCandidateStructure'
].map(extract).join('\n'),ctx);
ctx.normType=ctx.schemaType;
ctx.SHEETS=Object.keys(ctx.SCHEMA.sheets).map(function(key){return {key:key};});

const gids={
  itin:'1169222358',
  places:'1089684162',
  rest:'1421821084',
  shop:'1182059264',
  hotels:'792115203',
  exp:'1354339857',
  cfg:'1070234314'
};

(async function(){
  const raw={};
  for(const entry of Object.entries(gids)){
    const key=entry[0],gid=entry[1];
    const response=await fetch(ctx.SCHEMA.pubBase+gid+'&_ts='+Date.now());
    assert(response.ok,key+' HTTP '+response.status);
    raw[key]=await response.text();
  }

  const structure=ctx.validateCandidateStructure(raw);
  const db=ctx.createDB(raw);
  const validation=ctx.validateSnapshotData(db,raw,ctx.SCHEMA);
  const p045=db.placeList.find(function(place){return place.placeId==='P045';});
  const p046=db.placeList.find(function(place){return place.placeId==='P046';});

  assert.deepStrictEqual(Array.from(structure.blockers),[]);
  assert.deepStrictEqual(Array.from(validation.blockers),[]);
  assert(p045,'P045 exists');
  assert(p046,'P046 exists');
  assert.strictEqual(p045.type,'加油站');
  assert.strictEqual(p045.tnorm,'fuel');
  assert.strictEqual(p046.type,'租車點');
  assert.strictEqual(p046.tnorm,'parking');

  console.log(JSON.stringify({
    schema:ctx.SCHEMA.version,
    structureBlockers:structure.blockers.length,
    validationBlockers:validation.blockers.length,
    p045:{type:p045.type,tnorm:p045.tnorm},
    p046:{type:p046.type,tnorm:p046.tnorm}
  },null,2));
})().catch(function(error){
  console.error(error);
  process.exit(1);
});
'@ | node -
```

Expected: exit 0 and a JSON payload showing Schema `2.3 (2026-07-16)`, zero structure/validation blockers, P045 as Fuel, and P046 as Parking.

- [ ] **Step 4: Verify exact scope and repository state**

Run:

```powershell
git status --short --branch
git log -5 --oneline --decorate
git diff origin/dev...HEAD --stat
```

Expected:

- Working tree is clean.
- Branch is ahead of `origin/dev` only by the approved design, tests, Fuel implementation, and audit documentation commits.
- No Service Worker, manifest, icon, Sheet, parent/child runtime, or unrelated file changed.
