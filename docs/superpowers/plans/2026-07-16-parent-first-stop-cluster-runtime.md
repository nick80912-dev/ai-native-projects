# Parent First-Stop Cluster Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat a parent row with place/ID as the first cluster stop, preserve its time and Trip navigation, and keep the group active until every stop clears.

**Architecture:** Build a synthetic group controller for the Today main queue while keeping every cluster stop on its original itinerary ID. This separates group completion from the parent row’s first-stop completion, allowing Day 1 P001→P048 and all Day 2–6 groups to share one rule.

**Tech Stack:** Vanilla JavaScript, Node.js `assert`/`vm` tests, Markdown governance.

## Global Constraints

- Do not hardcode Day numbers, PIDs, RIDs, place names, or group names.
- Parent with place/ref becomes `cluster.items[0]`.
- Parent first stop plus one later blank-act stop is enough to form a cluster.
- Parent without place/ref still requires at least two later stops.
- Controller ID is exactly `${parent.id}__cluster`.
- First stop retains original time, item ID, place, ref, move, and note.
- Parent card stays non-navigable; every expanded stop opens its original Trip item.
- Completing first stop does not complete the group.
- Group controller completes only after all cluster items clear.
- Undoing a stop reopens a completed group controller.
- Preserve ordinary next-stop, auto-skip, undo, Trip checkbox, navigation, and localStorage container keys.
- Day 1 range is exactly `17:30 - 19:30`.

---

### Task 1: Define cluster extraction, controller, and timing in RED tests

**Files:**
- Modify: `tests/pick-next-stop.test.js`
- Modify: `tests/render-note.test.js`
- Create: `tests/parent-first-stop-cluster.test.js`

**Interfaces:**
- Consumes: `getChildStopCluster()`, `pickNextStop()`, `pickClusterChild()`, completion helpers, cluster renderers.
- Produces: failing contracts for first-stop inclusion, controller separation, timing, navigation, and the 12 audited groups.

- [ ] **Step 1: Load the new helper interfaces**

In `makeSandbox()` add extraction of:

```js
extractFunction('clusterControllerId'),
extractFunction('clusterController'),
extractFunction('clusterParentForPick'),
extractFunction('homeNextStopItems'),
extractFunction('reconcileClusterController')
```

- [ ] **Step 2: Replace the cluster progress fixture**

Replace existing scenario 7 with:

```js
{
  const sb = makeSandbox();
  const items = [
    { id:'parent', time:'17:30', act:'血拚時間', place:'永旺夢樂城岡山', ref:'P001' },
    { id:'child', time:'19:30', act:'', place:'唐吉訶德岡山駅前店', ref:'P048' },
    { id:'next', time:'22:00', act:'住宿check in', place:'Guest House', ref:'P002' }
  ];
  const cluster = sb.getChildStopCluster(items,items[0]);
  assert(cluster,'parent first stop plus one child forms a cluster');
  assert.deepStrictEqual(
    Array.from(cluster.items).map(function(item){return item.id;}),
    ['parent','child']
  );
  assert.strictEqual(cluster.items[0].time,'17:30');
  assert.strictEqual(cluster.controllerId,'parent__cluster');

  const homeItems=sb.homeNextStopItems(items);
  assert.deepStrictEqual(
    Array.from(homeItems).map(function(item){return item.id;}),
    ['parent__cluster','next']
  );
  assert.strictEqual(homeItems[0].sourceId,'parent');
  assert.strictEqual(sb.clusterParentForPick(items,homeItems[0]).id,'parent');

  sb.markNextStop(day,dayIndex,'parent','done');
  let progress=sb.getDayProgress(day,dayIndex);
  assert.strictEqual(
    sb.isNextStopCleared({id:'parent__cluster'},progress,sb.getChecks()),
    false,
    'first stop completion does not clear controller'
  );
  let childPick=sb.pickClusterChild(cluster,progress,sb.getChecks(),19*60,{day:day,dayIndex:dayIndex});
  assert.strictEqual(childPick.item.id,'child');

  sb.markNextStop(day,dayIndex,'child','done');
  progress=sb.getDayProgress(day,dayIndex);
  assert.strictEqual(sb.reconcileClusterController(day,dayIndex,cluster,progress,sb.getChecks()),true);
  progress=sb.getDayProgress(day,dayIndex);
  assert.strictEqual(!!progress.done['parent__cluster'],true);

  sb.setItemCompletion(day,dayIndex,'child','clear');
  progress=sb.getDayProgress(day,dayIndex);
  assert.strictEqual(sb.reconcileClusterController(day,dayIndex,cluster,progress,sb.getChecks()),true);
  progress=sb.getDayProgress(day,dayIndex);
  assert.strictEqual(!!progress.done['parent__cluster'],false,'undo reopens controller');
}
```

- [ ] **Step 3: Add extraction edge cases**

Add:

```js
{
  const sb=makeSandbox();
  const noPlace=[
    {id:'parent',time:'10:00',act:'巡禮',place:'',ref:''},
    {id:'a',time:'10:10',act:'',place:'A',ref:'P001'}
  ];
  assert.strictEqual(sb.getChildStopCluster(noPlace,noPlace[0]),null);
  noPlace.splice(2,0,{id:'b',time:'10:20',act:'',place:'B',ref:'P002'});
  assert.strictEqual(sb.getChildStopCluster(noPlace,noPlace[0]).items.length,2);
}
```

- [ ] **Step 4: Add timing and navigation assertions**

In `tests/render-note.test.js`, load `clusterTimeRange()` and assert:

```js
assert.strictEqual(
  sandbox.clusterTimeRange(
    {time:'17:30'},
    [{time:'17:30'},{time:'19:30'}]
  ),
  '17:30 - 19:30'
);
assert.strictEqual(
  sandbox.clusterTimeRange(
    {time:'17:30'},
    [{time:'17:30'},{time:''}]
  ),
  '17:30'
);
```

Render a first stop with ID `10/18_4` and require:

```js
assert(firstStopOut.includes('17:30'));
assert(firstStopOut.includes('openTripItem(0,\\'10/18_4\\')'));
```

Keep the existing assertion proving the parent card source before `nx-cluster-expand` has no `openTripItem`.

- [ ] **Step 5: Create the 12-group audit test**

Create `tests/parent-first-stop-cluster.test.js` that loads `getChildStopCluster()` and defines these compact day fixtures:

```js
const groups=[
  ['P001','P048'],
  ['P003','P004','P005','P006'],
  ['P008','P009','P010','P011'],
  ['R008','P014'],
  ['P015','P016','P017','P018'],
  ['P019','P020'],
  ['P023','P024','P025','P026'],
  ['P027','P028','P029','P030'],
  ['P032','P033','P034','P035','P036','P037'],
  ['P038','P039'],
  ['P041','P042'],
  ['P043','P044']
];
```

For each group, create a parent with `act`, `place`, first ref, and time, followed by blank-act items for remaining refs. Assert extracted refs equal the input group. Also assert Day 1 first time is `17:30`.

- [ ] **Step 6: Run focused tests and verify RED**

Run:

```powershell
node tests/pick-next-stop.test.js
node tests/render-note.test.js
node tests/parent-first-stop-cluster.test.js
```

Expected: FAIL because controller helpers do not exist and the parent is not currently included in cluster items.

- [ ] **Step 7: Commit the RED tests**

```powershell
git add -- tests/pick-next-stop.test.js tests/render-note.test.js tests/parent-first-stop-cluster.test.js
git commit -m "test: define parent first-stop clusters"
```

---

### Task 2: Implement cluster controllers and first-stop extraction

**Files:**
- Modify: `index.html`
- Test: `tests/pick-next-stop.test.js`
- Test: `tests/parent-first-stop-cluster.test.js`

**Interfaces:**
- Consumes: Task 1 contracts.
- Produces: controller helpers, generalized cluster extraction, and reversible group completion.

- [ ] **Step 1: Add controller helpers before `getChildStopCluster()`**

```js
function clusterControllerId(parent){
  return parent&&parent.id?parent.id+'__cluster':'';
}
function clusterController(parent){
  if(!parent||!parent.id) return null;
  return {
    id:clusterControllerId(parent),
    sourceId:parent.id,
    clusterController:true,
    time:parent.time,
    act:parent.act,
    place:'',
    ref:'',
    move:'',
    note:''
  };
}
function clusterParentForPick(items,picked){
  if(!picked||!picked.sourceId) return picked||null;
  return (items||[]).find(function(item){return item&&item.id===picked.sourceId;})||null;
}
```

- [ ] **Step 2: Generalize `getChildStopCluster()`**

Replace it with:

```js
function getChildStopCluster(items,parent){
  var start=(items||[]).indexOf(parent);
  if(start<0||!parent||!parent.act) return null;
  var stops=[];
  if(parent.id&&(parent.place||parent.ref)) stops.push(parent);
  for(var i=start+1;i<items.length;i++){
    var item=items[i];
    if(item&&item.act) break;
    if(item&&item.id&&(item.place||item.ref)) stops.push(item);
  }
  return stops.length>=2?{
    parent:parent,
    controllerId:clusterControllerId(parent),
    items:stops
  }:null;
}
```

- [ ] **Step 3: Add `homeNextStopItems()`**

```js
function homeNextStopItems(items){
  return (items||[]).filter(function(item){return item&&item.act;}).map(function(parent){
    return getChildStopCluster(items,parent)?clusterController(parent):parent;
  });
}
```

- [ ] **Step 4: Replace completion-only reconciliation**

Add:

```js
function reconcileClusterController(day,dayIndex,cluster,progress,checks){
  if(!cluster||!cluster.controllerId) return false;
  progress=normalizeDayProgress(progress);
  checks=checks||{};
  var cleared=cluster.items.every(function(item){
    return isNextStopCleared(item,progress,checks);
  });
  var controller={id:cluster.controllerId};
  var controllerCleared=isNextStopCleared(controller,progress,checks);
  if(cleared&&!controllerCleared){
    markNextStop(day,dayIndex,cluster.controllerId,'done');
    return true;
  }
  if(!cleared&&controllerCleared){
    setItemCompletion(day,dayIndex,cluster.controllerId,'clear');
    return true;
  }
  return false;
}
```

Keep `completeClusterParent()` as a compatibility wrapper:

```js
function completeClusterParent(day,dayIndex,cluster,progress,checks){
  return reconcileClusterController(day,dayIndex,cluster,progress,checks);
}
```

Update `syncCompletedClusterParents()` to call `reconcileClusterController()`.

- [ ] **Step 5: Run progress tests and verify GREEN**

Run:

```powershell
node tests/pick-next-stop.test.js
node tests/parent-first-stop-cluster.test.js
```

Expected: both pass.

---

### Task 3: Route Today rendering through controllers and preserve first-stop time

**Files:**
- Modify: `index.html`
- Test: `tests/render-note.test.js`
- Test: `tests/home-simplification.test.js`

**Interfaces:**
- Consumes: Task 2 helpers.
- Produces: controller-aware Today selection and exact first-stop navigation/time.

- [ ] **Step 1: Use controller items in `renderToday()`**

Change:

```js
var items=day.items.filter(function(it){return it.act;});
```

to:

```js
var items=homeNextStopItems(day.items);
```

After picking, resolve the original parent:

```js
var clusterParent=clusterParentForPick(day.items,pick.item);
var cluster=getChildStopCluster(day.items,clusterParent);
```

Remove the old direct call:

```js
getChildStopCluster(day.items,pick.item)
```

- [ ] **Step 2: Preserve the parent first-stop time range**

Replace `clusterTimeRange()` with:

```js
function clusterTimeRange(parent,items){
  var timed=(items||[]).filter(function(item){return item&&item.time;});
  var first=timed.length?timed[0].time:(parent&&parent.time||'');
  var last=timed.length?timed[timed.length-1].time:'';
  return first&&last&&first!==last?first+' - '+last:(first||last);
}
```

- [ ] **Step 3: Ensure parent card stays non-navigable**

Do not add `openTripItem()` to `renderClusterNextStopCard()` before the `nx-cluster-expand` button. `renderClusterStop()` continues using each original `item.id`, including the parent first stop.

- [ ] **Step 4: Run rendering tests and verify GREEN**

Run:

```powershell
node tests/render-note.test.js
node tests/home-simplification.test.js
```

Expected: both pass and Day 1 range is `17:30 - 19:30`.

- [ ] **Step 5: Commit runtime implementation**

```powershell
git add -- index.html
git commit -m "feat: include parent as first cluster stop"
```

---

### Task 4: Update governance and complete repository verification

**Files:**
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tests/README.md`
- Test: all `tests/*.test.js`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: completed task tracking and full regression evidence.

- [ ] **Step 1: Move the cluster runtime item out of backlog**

Remove the high-priority parent/child-card runtime item from `tasks/backlog.md`, then renumber remaining items consecutively.

- [ ] **Step 2: Record completion**

Add to `tasks/done.md`:

```markdown
- 2026-07-16:父列具有地點/ID 時成為父子卡第一站;父列第一站加一個後續空白行程列即可成卡,Day 1–6 共 12 組完成回歸。
```

- [ ] **Step 3: Update UI guidance**

Add:

```markdown
- 父子串點若父列本身具有地點或 ID,父列完整資料與時間即為第一站;父卡只展開/收合,各站使用原始行程 ID 導向,全部站清除後群組才完成。
```

- [ ] **Step 4: Add Changelog entry**

```markdown
## 2026-07-16 — 父列第一站父子行程卡（Dev）
- 父列具有地點或 ID 時納入第一站,父列加一個後續子站即可成立父子卡;不使用 Day、PID 或名稱特例。
- Day 1「血拚時間」正確顯示 P001 → P048,時間範圍為 `17:30 - 19:30`,兩站皆可導向原始行程卡。
- 首頁以內部 controller 分離群組完成與第一站進度;完成第一站不會讓群組提前消失,全部子站清除後才推進。
- Day 1–6 共 12 組完成抽取、時間、導航、完成/略過與復原回歸。
```

- [ ] **Step 5: Update test index**

Add `parent-first-stop-cluster.test.js` to `tests/README.md` with its 12-group scope.

- [ ] **Step 6: Run full verification**

Run all `tests/*.test.js`, `node tools/check-doc-titles.js`, inline JavaScript syntax validation, and `git diff --check`.

Expected: every command exits 0.

- [ ] **Step 7: Commit governance updates**

```powershell
git add -- tasks/backlog.md tasks/done.md 04_UI_GUIDELINES.md 07_CHANGELOG.md tests/README.md
git commit -m "docs: record parent first-stop clusters"
```
