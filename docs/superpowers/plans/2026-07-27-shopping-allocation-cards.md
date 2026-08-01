# Shopping Allocation Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `buyFor` shopping model with per-target allocations, then add multi-target cards, safe partial purchasing, allocation-level ledger links, continuous entry, and a drill-down detail sheet.

**Architecture:** Keep the existing single-file application structure and introduce one normalized `allocations[]` collection on every Shopping Item. Put quantity and `ledgerLinks[]` on each allocation, derive all summaries and aggregate states through pure helpers, and keep Shopping-to-Ledger source IDs ephemeral so Ledger 21-column persistence remains unchanged.

**Tech Stack:** Vanilla HTML/CSS/JavaScript in `index.html`, Node 20 built-in `assert`/`vm` tests, localStorage repositories, existing Ledger sheet/popover components, Service Worker PWA shell.

## Global Constraints

- Baseline is `dev` at `okayama-trip-v63`; implementation delivery must increment the Service Worker cache exactly once.
- Do not modify Ledger 21-column Schema, Apps Script, Google Sheet, settlement calculations, shared-ledger permissions, itinerary ordering, or stop-reference authority rules.
- New Shopping categories are exactly `必買`, `伴手禮`, `生活用品`, `其他`; `代購` is not a selectable category.
- Proxy status is determined only by allocation `target`, never by Shopping category.
- Quantity is a positive safe integer; partial-purchase per-target input may be `0`, but at least one target must be greater than `0`.
- Allocation totals must remain safe integers.
- `ledgerLinks[]` remains append-only; only its last unreleased link is active.
- A missing Ledger record is not proof of deletion; unresolved links remain `unverified`.
- Deleting a Shopping Item never deletes or edits Ledger records.
- `儲存並新增` retains only category and stop, resets quantity to `1`, and clears name, unit, targets, and target-add input.
- Target chips and Shopping Ledger proxy targets use the existing shared `trip_ledger_proxy_targets` store.
- The proxy badge uses the itinerary `.time` tokens: `var(--coral)`, `var(--coral-bg)`, 6px radius, no border.
- Maintain Scroll-only behavior, 16px form controls, safe-area padding, minimum 40px targets, and 320/375/390px support.
- Follow TDD: every behavior task starts with a failing focused test and ends with a focused commit.

---

## File Map

- `index.html`: Shopping schema, stores, derived helpers, form state, card/detail/split rendering, Shopping-to-Ledger handoff, backup v7, and CSS.
- `tests/shopping-list.test.js`: allocation normalization, labels, form/card source contracts, Today compatibility, and non-ledger Shopping behavior.
- `tests/shopping-ledger-links.test.js`: allocation-level link resolution, partial splits, preflight, source-to-record handoff, release, delete warnings, and backup contracts.
- `tests/settings-backup-ux.test.js`: export/restore v7 behavior and older-version normalization.
- `tests/ledger-quick-entry.test.js`: regression that ordinary Ledger saves without Shopping sources never write allocation links.
- `tests/README.md`: test-asset descriptions updated from item-level to allocation-level contracts.
- `CONTEXT.md`: durable vocabulary and invariants for allocations, labels, state aggregation, editing, and nested detail navigation.
- `07_CHANGELOG.md`: implementation summary, exclusions, checks, QA evidence, and delivered SW version.
- `sw.js`: one cache version increment after all behavior and QA pass.

---

### Task 1: Normalize Shopping Items into Allocation Records

**Files:**
- Modify: `index.html:3410-3745`
- Test: `tests/shopping-list.test.js:35-190`
- Test: `tests/shopping-ledger-links.test.js:38-75`

**Interfaces:**
- Produces: `normalizeShoppingAllocation(source, options) -> {allocationId,target,quantity,ledgerLinks}`
- Produces: `normalizeShoppingAllocations(source, options) -> Allocation[]`
- Produces: `shoppingItemAllocations(item) -> Allocation[]`
- Produces: `createShoppingAllocationId(itemId, usedIds, randomFn) -> string`
- Changes: `normalizeShoppingItem(source, options)` returns `allocations[]` and no normalized top-level `buyFor`, `quantity`, or `ledgerLinks`.
- Consumes: existing `normalizeShoppingLedgerLink()`, `normalizeLedgerProxyTarget()`, `canonicalMemberName()`, `migrateShoppingQtyText()`, and `isSafeShoppingQuantity()`.

- [ ] **Step 1: Replace the old round-trip assertions with failing v7 allocation tests**

Add focused assertions to `tests/shopping-list.test.js`:

```js
let allocationSeq=0;
const store=mod.createShoppingListStore({
  storage:mod.localStorage,
  key:'trip_shopping_list',
  now(){return Date.parse('2026-07-23T08:00:00.000Z');},
  idFactory(){return 'shopping-1';},
  allocationIdFactory(itemId){
    allocationSeq++;
    return itemId+'-allocation-'+allocationSeq;
  }
});
const added=plain(store.add({
  name:'  岡山白桃  ',
  category:'伴手禮',
  quantity:2,
  unit:'盒',
  targets:['媽媽','阿寶'],
  stopRef:'10/18_3'
}));
assert.deepStrictEqual(added.allocations,[
  {allocationId:'shopping-1-allocation-1',target:'媽媽',quantity:2,ledgerLinks:[]},
  {allocationId:'shopping-1-allocation-2',target:'阿寶',quantity:2,ledgerLinks:[]}
]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'buyFor'),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'quantity'),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'ledgerLinks'),false);

const own=plain(mod.normalizeShoppingItem({
  id:'own-1',name:'牙刷',quantity:3,unit:'個',createdAt:QNOW
}));
assert.deepStrictEqual(own.allocations,[
  {allocationId:'own-1-allocation-1',target:'',quantity:3,ledgerLinks:[]}
]);
```

Add rejection and migration cases:

```js
assert.throws(()=>mod.normalizeShoppingItem({
  id:'dup',name:'重複',createdAt:QNOW,
  allocations:[
    {allocationId:'a',target:'媽媽',quantity:1,ledgerLinks:[]},
    {allocationId:'b',target:' 媽媽 ',quantity:1,ledgerLinks:[]}
  ]
}),/重複/);
assert.throws(()=>mod.normalizeShoppingItem({
  id:'mixed-own',name:'錯誤',createdAt:QNOW,
  allocations:[
    {allocationId:'a',target:'',quantity:1,ledgerLinks:[]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[]}
  ]
}),/自己的分配/);
```

- [ ] **Step 2: Run the focused tests and verify the expected red state**

Run:

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL because normalized items still expose top-level `quantity`, `buyFor`, and `ledgerLinks`.

- [ ] **Step 3: Implement allocation normalization and stable IDs**

In `index.html`, add the new pure helpers beside the existing Shopping quantity and link normalizers:

```js
function normalizeShoppingAllocation(source,options){
  source=source&&typeof source==='object'?source:{};
  options=options||{};
  var target=String(source.target==null?'':source.target).replace(/\u3000/g,' ').replace(/\s+/g,' ').trim();
  if(target)target=normalizeLedgerProxyTarget(target);
  var quantity=source.quantity;
  if(quantity!==null&&!isSafeShoppingQuantity(quantity))
    throw new Error('採買分配數量必須是 1 以上的安全整數');
  if(source.ledgerLinks!==undefined&&source.ledgerLinks!==null&&!Array.isArray(source.ledgerLinks))
    throw new Error('記帳關聯必須是陣列');
  return {
    allocationId:String(source.allocationId||options.allocationId||'').trim(),
    target:target,
    quantity:quantity,
    ledgerLinks:(source.ledgerLinks||[]).map(normalizeShoppingLedgerLink)
  };
}

function shoppingItemAllocations(item){
  return item&&Array.isArray(item.allocations)?item.allocations:[];
}
```

Implement `normalizeShoppingAllocations()` so that:

1. New `source.allocations` are normalized directly.
2. Form payload `{targets, quantity}` expands to one allocation per target.
3. v1–v6 fields create one allocation from `buyFor`, `quantity`, `qty`, and item-level `ledgerLinks`.
4. Missing IDs call the store-injected `allocationIdFactory`; the production default combines item ID, time, and a random suffix and retries against `usedIds`.
5. Canonical targets are unique.
6. `target === ''` is allowed only as the sole allocation.
7. `quantity:null` is allowed only for one legacy allocation with non-empty `legacyQtyText`.
8. The allocation total is checked with `Number.isSafeInteger`.

Update `normalizeShoppingItem()` to return:

```js
return {
  id:itemId,
  name:name,
  category:category==='代購'?'':category,
  unit:amount.unit,
  legacyQtyText:amount.legacyQtyText,
  allocations:normalizeShoppingAllocations(source,{
    itemId:itemId,
    quantity:amount.quantity
  }),
  stopRef:String(source.stopRef==null?'':source.stopRef).trim(),
  done:done,
  createdAt:createdAt,
  completedAt:completedAt,
  splitGroupId:String(source.splitGroupId==null?'':source.splitGroupId).trim()
};
```

Update `createShoppingListStore.add()` so it allocates the Shopping Item ID before normalization. Preserve explicit `allocationId` values during updates, and never reuse an ID that already appears in the item being edited.

- [ ] **Step 4: Run focused tests and repair all old item-level fixtures**

Run:

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS. Update all fixtures to read `item.allocations[n].ledgerLinks` and `item.allocations[n].quantity`; do not add compatibility accessors to production code merely to satisfy old tests.

- [ ] **Step 5: Commit the normalized allocation foundation**

```powershell
git add index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "refactor: normalize shopping allocations"
```

---

### Task 2: Upgrade Personal Backup to v7

**Files:**
- Modify: `index.html:3416-3420`
- Modify: `index.html:5570-5668`
- Test: `tests/settings-backup-ux.test.js:20-165`
- Test: `tests/shopping-ledger-links.test.js:235-270`

**Interfaces:**
- Consumes: `shoppingListStore.normalize(values)`.
- Produces: `PERSONAL_STATE_VERSION === 7`.
- Produces: `PERSONAL_STATE_SUPPORTED_VERSIONS === [1,2,3,4,5,6,7]`.
- Preserves: explicit rejection of string versions and unknown future versions.

- [ ] **Step 1: Write failing v7 export and v6 migration tests**

Update the sandbox constants in `tests/settings-backup-ux.test.js` to 7 and add:

```js
assert.strictEqual(exported.version,7);
assert.deepStrictEqual(exported.shoppingItems[0].allocations,[
  {
    allocationId:'shopping-1-allocation-1',
    target:'媽媽',
    quantity:2,
    ledgerLinks:[]
  }
]);

let shoppingNormalizeCalls=0;
sandbox.shoppingListStore.normalize=function(values){
  shoppingNormalizeCalls++;
  assert.strictEqual(values[0].buyFor,'媽媽');
  return [{
    id:'shopping-2',name:'藥妝',category:'',unit:'盒',legacyQtyText:'',
    allocations:[{
      allocationId:'shopping-2-allocation-1',
      target:'媽媽',quantity:1,ledgerLinks:[]
    }],
    stopRef:'10/18_3',done:false,
    createdAt:'2026-07-23T09:00:00.000Z',
    completedAt:'',splitGroupId:''
  }];
};
await sandbox.restorePersonalState();
assert.strictEqual(shoppingNormalizeCalls,1);
const restored=JSON.parse(storage.getItem('trip_shopping_list'))[0];
assert.strictEqual(restored.category,'');
assert.strictEqual(restored.allocations[0].target,'媽媽');
```

Replace the sandbox's initial `trip_shopping_list` fixture with an already-normalized v7 item before the export assertion:

```js
storage.setItem('trip_shopping_list',JSON.stringify([{
  id:'shopping-1',name:'白桃',category:'伴手禮',unit:'盒',legacyQtyText:'',
  allocations:[{
    allocationId:'shopping-1-allocation-1',
    target:'媽媽',quantity:2,ledgerLinks:[]
  }],
  stopRef:'10/18_3',done:false,
  createdAt:'2026-07-23T08:00:00.000Z',
  completedAt:'',splitGroupId:''
}]));
```

Put the real v6-to-v7 Shopping migration assertion in `tests/shopping-ledger-links.test.js`, which evaluates the actual Shopping normalizer:

```js
const migrated=plain(mod.normalizeShoppingItem({
  id:'shopping-2',name:'藥妝',category:'代購',
  quantity:1,unit:'盒',legacyQtyText:'',buyFor:'媽媽',
  ledgerLinks:[link({recordId:'r-a'})],stopRef:'10/18_3',
  done:false,createdAt:NOW
}));
assert.strictEqual(migrated.category,'');
assert.deepStrictEqual(migrated.allocations,[{
  allocationId:'shopping-2-allocation-1',
  target:'媽媽',quantity:1,
  ledgerLinks:[link({recordId:'r-a'})]
}]);
```

Add explicit rejection:

```js
assert.throws(function(){
  sandbox.validatePersonalStatePayload({format:'trip-personal-state',version:8});
},/不支援/);
assert.throws(function(){
  sandbox.validatePersonalStatePayload({format:'trip-personal-state',version:'7'});
},/不支援/);
```

- [ ] **Step 2: Run backup tests and verify they fail on version 6**

Run:

```powershell
node tests/settings-backup-ux.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL on `PERSONAL_STATE_VERSION` and allocation migration assertions.

- [ ] **Step 3: Implement v7 export/restore**

Change:

```js
var PERSONAL_STATE_VERSION=7;
var PERSONAL_STATE_SUPPORTED_VERSIONS=[1,2,3,4,5,6,7];
```

Keep export using `shoppingListStore.all()`. During restore, call `shoppingListStore.normalize(payload.shoppingItems)` before any localStorage writes. The normalizer from Task 1 owns v1–v6 Shopping migration; do not create a parallel migration in settings code.

- [ ] **Step 4: Run both backup suites**

Run:

```powershell
node tests/settings-backup-ux.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS, including v1–v7 acceptance and v8/string rejection.

- [ ] **Step 5: Commit backup v7**

```powershell
git add index.html tests/settings-backup-ux.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: upgrade shopping backup to v7"
```

---

### Task 3: Add Allocation Summaries and Aggregate Link State

**Files:**
- Modify: `index.html:3500-3655`
- Test: `tests/shopping-list.test.js:140-190`
- Test: `tests/shopping-ledger-links.test.js:70-130`

**Interfaces:**
- Produces: `shoppingAllocationTotal(allocations) -> number|null`
- Produces: `shoppingTargetAllocations(item) -> Allocation[]`
- Produces: `shoppingItemQuantitySummary(item) -> string`
- Produces: `shoppingItemTargetSummary(item) -> string`
- Produces: `shoppingItemLinkSummary(item, context) -> {state,label,linked,total,allocationStates}`
- Produces: `shoppingSplitGroupAllocationTotals(items, item) -> {targets, total}`
- Produces: `shoppingAllocationEditPolicy(item, context) -> {allocations:[{allocationId,canEdit,reason}]}`
- Consumes: `resolveShoppingLedgerLinkState(allocation, context)`.

- [ ] **Step 1: Add failing label and aggregate-state tests**

Add to `tests/shopping-list.test.js`:

```js
const allocation=(target,quantity,ledgerLinks=[])=>({
  allocationId:'a-'+target,target,quantity,ledgerLinks
});
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2)]
}),'幫阿寶買');
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2),allocation('媽媽',2)]
}),'幫阿寶、媽媽買');
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2),allocation('媽媽',2),allocation('小明',2),allocation('爸爸',2)]
}),'幫阿寶、媽媽 +2 買');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'盒',
  allocations:[allocation('阿寶',2),allocation('媽媽',2),allocation('小明',2)]
}),'2 盒／人 · 共 6 盒');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'盒',
  allocations:[allocation('阿寶',2),allocation('媽媽',1),allocation('小明',1)]
}),'共 4 盒 · 3 位');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'個',
  allocations:[allocation('',3)]
}),'3 個');
```

Add to `tests/shopping-ledger-links.test.js`:

```js
const summary=mod.shoppingItemLinkSummary({
  allocations:[
    {allocationId:'a',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[link({recordId:'r-c'})]}
  ]
},ctx({personal:{ready:true,records:[expense({id:'r-a'}),expense({id:'r-c'})]}}));
assert.deepStrictEqual(plain({
  state:summary.state,label:summary.label,linked:summary.linked,total:summary.total
}),{state:'partial',label:'記帳 2／3',linked:2,total:3});
```

Add one mixed case where any allocation is `unverified` and expect `{state:'unverified',label:'狀態待確認'}`.

Add the foundational edit policy:

```js
const editPolicy=plain(mod.shoppingAllocationEditPolicy({
  allocations:[
    {allocationId:'linked',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'open',target:'媽媽',quantity:1,ledgerLinks:[]}
  ]
},ctx({personal:{ready:true,records:[expense({id:'r-a'})]}}));
assert.deepStrictEqual(editPolicy.allocations.map(value=>[
  value.allocationId,value.canEdit,value.reason
]),[
  ['linked',false,'已記帳'],
  ['open',true,'']
]);
```

- [ ] **Step 2: Run focused tests and verify missing helpers**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL with helper-not-defined assertions.

- [ ] **Step 3: Implement the pure summary helpers**

Use safe addition:

```js
function shoppingAllocationTotal(allocations){
  var total=0,valid=true;
  (allocations||[]).forEach(function(allocation){
    if(!isSafeShoppingQuantity(allocation&&allocation.quantity)){valid=false;return;}
    total+=allocation.quantity;
    if(!Number.isSafeInteger(total))valid=false;
  });
  return valid?total:null;
}
```

`shoppingItemQuantitySummary()` must:

1. Return `legacyQtyText` for one legacy null allocation.
2. Return ordinary quantity for one own allocation.
3. Return per-person form only when all target quantities are equal.
4. Return total-and-people form after unequal split.

`shoppingItemLinkSummary()` calls the existing resolver once per allocation. Any `unverified` wins; otherwise all linked/all unlinked/partial determine the result.

`shoppingSplitGroupAllocationTotals()` must group by `splitGroupId || item.id` and canonical target without persisting an original total.

`shoppingAllocationEditPolicy()` uses the same per-allocation states: linked and unverified allocations are locked; unlinked allocations are editable.

- [ ] **Step 4: Run focused tests**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit derived helpers**

```powershell
git add index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: derive shopping allocation summaries"
```

---

### Task 4: Build Multi-Target Entry and Save-Another Flow

**Files:**
- Modify: `index.html:540-548`
- Modify: `index.html:2800-2910`
- Test: `tests/shopping-list.test.js:295-335`

**Interfaces:**
- Produces: `newShoppingForm(seed) -> ShoppingFormState`
- Produces: `shoppingFormTargets(form) -> string[]`
- Produces: `toggleShoppingFormTarget(value)`.
- Produces: `shoppingFormAllocations(form) -> Allocation[]`.
- Produces: `shoppingFormPayload(form) -> normalized store payload`.
- Changes: `saveShoppingForm(saveAnother)`; `false` closes, `true` resets according to the approved contract.
- Consumes: allocation normalizer from Task 1 plus quantity summary and edit policy from Task 3.

- [ ] **Step 1: Add failing source and state-transition tests**

Extend the UI/source assertions in `tests/shopping-list.test.js`:

```js
assert(ui.includes('幫誰買（可多選）'));
assert(ui.includes('toggleShoppingFormTarget('));
assert(ui.includes('id="shoppingBuyForNew"'));
assert(ui.includes('>儲存並新增</button>'));
assert(!ui.includes("SHOPPING_CATEGORIES=['必買','伴手禮','代購'"));
```

Extract and execute the reset helper:

```js
const reset=plain(mod.shoppingSaveAnotherForm({
  name:'白桃',category:'伴手禮',quantity:'4',unit:'盒',
  targets:['阿寶','媽媽'],stopRef:'d2_shop'
}));
assert.deepStrictEqual(reset,{
  id:'',name:'',category:'伴手禮',quantity:1,unit:'',
  legacyQtyText:'',targets:[],allocations:[],
  stopRef:'d2_shop',done:false,createdAt:''
});
```

Add a payload assertion:

```js
const payload=plain(mod.shoppingFormPayload({
  id:'',name:'白桃',category:'伴手禮',quantity:'2',unit:'盒',
  targets:['阿寶','媽媽'],stopRef:'d2_shop'
}));
assert.deepStrictEqual(payload.allocations.map(value=>[
  value.target,value.quantity,value.allocationId
]),[
  ['阿寶',2,''],
  ['媽媽',2,'']
]);
```

- [ ] **Step 2: Run the Shopping list suite**

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because the form has one `buyFor` string and no save-another helper.

- [ ] **Step 3: Implement form state and multi-select**

Use:

```js
function newShoppingForm(seed){
  seed=seed||{};
  return {
    id:String(seed.id||''),
    name:String(seed.name||''),
    category:String(seed.category||''),
    quantity:seed.quantity==null?1:seed.quantity,
    unit:String(seed.unit||''),
    legacyQtyText:String(seed.legacyQtyText||''),
    targets:(seed.targets||[]).slice(),
    allocations:(seed.allocations||[]).map(function(value){return Object.assign({},value);}),
    stopRef:String(seed.stopRef||''),
    done:seed.done===true,
    createdAt:String(seed.createdAt||'')
  };
}
```

When editing, derive `targets` from non-empty allocation targets. Equal allocation quantities populate the common quantity input. Unequal allocations render a read-only allocation summary and an explicit `調整分配` section; saving common fields must preserve those allocations.

`shoppingFormAllocations(form)` reconciles by canonical target:

- Existing targets keep their original `allocationId`, quantity, and `ledgerLinks`.
- A common quantity edit changes only allocations allowed by the Task 9 edit policy.
- Newly selected targets receive `allocationId:''`; the store assigns a fresh non-reused ID.
- Deselected unlinked targets are omitted.
- Reordering chips never changes allocation IDs or Ledger links.

`addShoppingBuyFor()` keeps the existing shared target store and calls `toggleShoppingFormTarget(value, true)` after insertion.

Render:

- Dynamic label `數量（必填）` or `每人數量（必填）`.
- Selected target chips using the itinerary-time coral tokens.
- Live `已選 N 位` and `shoppingItemQuantitySummary()` preview.
- Existing add-target input row.
- Action grid with the full-width third button only in add mode.

Implement:

```js
function shoppingSaveAnotherForm(form){
  return newShoppingForm({
    category:form.category,
    quantity:1,
    stopRef:form.stopRef
  });
}
```

`saveShoppingForm(true)` resets only after `shoppingListStore.add(payload)` returns successfully, rerenders, and focuses `shoppingName`.

- [ ] **Step 4: Run the focused suite**

```powershell
node tests/shopping-list.test.js
```

Expected: PASS for target multi-select, category removal, live summary source contracts, and exact reset behavior.

- [ ] **Step 5: Commit entry flow**

```powershell
git add index.html tests/shopping-list.test.js
git commit -m "feat: add multi-target shopping entry"
```

---

### Task 5: Split Partial Purchases by Allocation

**Files:**
- Modify: `index.html:2990-3068`
- Modify: `index.html:3638-3775`
- Test: `tests/shopping-list.test.js:175-190`
- Test: `tests/shopping-ledger-links.test.js:160-230`

**Interfaces:**
- Produces: `shoppingAllocationSplitPlan(item, purchasedByAllocationId)`.
- Changes: `shoppingListStore.split(id, plan)` accepts purchased/remainder allocation arrays.
- Produces: `shoppingSplitPreview(form) -> {purchasedLabel,remainderLabel}`.
- Preserves: original item ID for purchased part, adjacent new ID for remainder, shared `splitGroupId`, and atomic write.

- [ ] **Step 1: Add failing multi-allocation split tests**

Add:

```js
const splitSource=splitCase.store.add({
  name:'白桃果凍',category:'伴手禮',unit:'盒',
  targets:['阿寶','媽媽','小明'],quantity:2,stopRef:'d2_shop'
});
const allocationIds=splitSource.allocations.map(value=>value.allocationId);
const plan=plain(mod.shoppingAllocationSplitPlan(splitSource,{
  [allocationIds[0]]:2,
  [allocationIds[1]]:1,
  [allocationIds[2]]:1
}));
assert.strictEqual(plan.ok,true);
assert.strictEqual(plan.mode,'split');
assert.deepStrictEqual(plan.purchasedAllocations.map(value=>[value.target,value.quantity]),[
  ['阿寶',2],['媽媽',1],['小明',1]
]);
assert.deepStrictEqual(plan.remainderAllocations.map(value=>[value.target,value.quantity]),[
  ['媽媽',1],['小明',1]
]);
```

Add invalid cases for all zero, unknown allocation ID, overbuy, fractional value, and a linked/unverified allocation. After a simulated storage failure, assert the serialized store snapshot is unchanged.

- [ ] **Step 2: Run focused split tests**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL because split planning is item-level.

- [ ] **Step 3: Implement per-allocation planning and rendering**

The plan must return:

```js
{
  ok:true,
  mode:'split', // or 'complete'
  purchasedAllocations:[/* quantity > 0 */],
  remainderAllocations:[/* remainder > 0 */],
  purchasedTotal:4,
  remainderTotal:2,
  error:''
}
```

Each output allocation preserves `allocationId`, `target`, and existing empty `ledgerLinks`. Do not allow split when any allocation is linked or unverified.

Render one numeric input per original allocation, defaulting to `0`, with `min="0"` and `max` equal to that allocation quantity. Preview both derived labels. If remainder is empty, call the complete path and do not create a second item.

Update `shoppingListStore.split()` to construct both normalized items in memory, splice them into a copied array, and call storage once.

- [ ] **Step 4: Run focused suites**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit allocation splits**

```powershell
git add index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: split purchases by target"
```

---

### Task 6: Move Shopping-to-Ledger Links onto Allocations

**Files:**
- Modify: `index.html:3078-3225`
- Modify: `index.html:3500-3575`
- Modify: `index.html:3830-3850`
- Modify: `index.html:6400-6440`
- Test: `tests/shopping-ledger-links.test.js:120-165`
- Test: `tests/shopping-ledger-links.test.js:220-335`
- Test: `tests/ledger-quick-entry.test.js:210-245`

**Interfaces:**
- Produces: `shoppingLedgerSources(items, context) -> ShoppingLedgerSource[]`.
- Produces: `shoppingLedgerPrefillForAllocation(item, allocation)`.
- Changes: `shoppingLedgerSinglePrefill()` and `shoppingLedgerMultiPrefill()` consume allocation sources.
- Changes: draft source identity becomes `{shoppingItemId, allocationId}`.
- Changes: `planShoppingLedgerLinks(sourceRefs, savedRecords, submissionDraft, now)`.
- Changes: `shoppingListStore.applyLedgerLinks([{shoppingItemId,allocationId,link}])`.
- Produces: allocation-specific `releaseShoppingLedgerLink(itemId, allocationId)`.

- [ ] **Step 1: Write failing one-allocation-one-record tests**

Replace item-level handoff fixtures with:

```js
const sources=[
  {shoppingItemId:'s-a',allocationId:'a-1'},
  {shoppingItemId:'s-a',allocationId:'a-2'},
  {shoppingItemId:'s-b',allocationId:'b-1'}
];
const planOk=plain(mod.planShoppingLedgerLinks(
  sources,
  [expense({id:'rec-a'}),expense({id:'rec-b'}),expense({id:'rec-c'})],
  {track:'personal',testMode:false,batchId:'batch-1'},
  NOW
));
assert.deepStrictEqual(planOk.links.map(entry=>[
  entry.shoppingItemId,entry.allocationId,entry.link.recordId
]),[
  ['s-a','a-1','rec-a'],
  ['s-a','a-2','rec-b'],
  ['s-b','b-1','rec-c']
]);
```

Add proxy prefill:

```js
const proxy=plain(mod.shoppingLedgerPrefillForAllocation(
  {id:'s',name:'白桃',category:'伴手禮',unit:'盒'},
  {allocationId:'a',target:'阿寶',quantity:2,ledgerLinks:[]}
));
assert.strictEqual(proxy.category,'購物');
assert.strictEqual(proxy.isProxy,true);
assert.strictEqual(proxy.proxyTarget,'阿寶');
assert.match(proxy.note,/數量：2 盒/);
```

Add failures for duplicate composite sources, missing allocation, source/record count mismatch, and extra user-created Ledger items. Assert `sourceShoppingItemId` and `sourceShoppingAllocationId` are absent from normalized Ledger records.

- [ ] **Step 2: Run focused handoff tests**

```powershell
node tests/shopping-ledger-links.test.js
node tests/ledger-quick-entry.test.js
```

Expected: FAIL because source identity and links are item-level.

- [ ] **Step 3: Implement allocation preflight, prefill, and atomic handoff**

`shoppingLedgerSources()` must flatten only allocations whose resolver state is definitely `unlinked`. Linked and unverified allocations are omitted from the detail-sheet `記帳未完成對象` path and never receive draft source IDs. Return skipped counts for UI diagnostics; do not silently reinterpret an unverified allocation as unlinked.

Build each draft row with:

```js
{
  name:item.name,
  amount:'',
  category:'購物',
  isProxy:!!allocation.target,
  proxyTarget:allocation.target,
  sourceShoppingItemId:item.id,
  sourceShoppingAllocationId:allocation.allocationId
}
```

During Ledger normalization, source IDs remain draft-only and are not copied to records.

Update `applyLedgerLinks()` to:

1. Normalize all requested links.
2. Resolve every item and allocation before mutation.
3. Reject duplicate composite targets.
4. Clone all affected items and allocation arrays.
5. Append each link to only its target allocation.
6. Write the Shopping store once.

For release:

- Exactly one linked allocation may use the card-menu shortcut.
- Multiple linked allocations route to detail management.
- The confirmation identifies the target.
- Only the target allocation receives `releasedAt`.

- [ ] **Step 4: Run all three focused suites**

```powershell
node tests/shopping-ledger-links.test.js
node tests/ledger-quick-entry.test.js
node tests/shopping-list.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit allocation-level Ledger links**

```powershell
git add index.html tests/shopping-ledger-links.test.js tests/ledger-quick-entry.test.js tests/shopping-list.test.js
git commit -m "feat: link ledger records per allocation"
```

---

### Task 7: Render the Approved Cards and Interaction Boundaries

**Files:**
- Modify: `index.html:541-545`
- Modify: `index.html:2911-2985`
- Test: `tests/shopping-list.test.js:295-360`
- Test: `tests/shopping-ledger-links.test.js:270-320`

**Interfaces:**
- Consumes: `shoppingItemTargetSummary()`, `shoppingItemQuantitySummary()`, and `shoppingItemLinkSummary()`.
- Produces: `shoppingCardLinkBadge(item, summary)`.
- Preserves: pending grouping, done flat order, selection mode, Today ordering, checkbox behavior, and `⋯` positioning.

- [ ] **Step 1: Add failing DOM/source assertions**

Add:

```js
assert.match(ui,/\.shopping-target-badge\{[^}]*background:var\(--coral-bg\)[^}]*color:var\(--coral\)[^}]*border-radius:6px/);
assert.match(ui,/class="shopping-item-title-row"/);
assert(ui.includes('shoppingItemTargetSummary(item)'));
assert(ui.includes('shoppingItemQuantitySummary(item)'));
assert(ui.includes('shoppingItemLinkSummary(item,shoppingLedgerContext())'));
```

Add visibility rules:

```js
assert(ui.includes("item.done||linkSummary.state!=='unlinked'"));
assert(ui.includes("linkSummary.state==='partial'"));
```

- [ ] **Step 2: Run the Shopping UI suite**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL because card metadata is a single escaped string and body clicks do not open details.

- [ ] **Step 3: Implement card markup and CSS**

Render title markup in this order:

```html
<div class="shopping-item-title-row">
  <strong>品名</strong>
  <span class="shopping-target-badge">幫阿寶、媽媽 +1 買</span>
  <span class="shopping-link-badge ...">記帳 2／3</span>
</div>
```

The second row contains a dedicated category badge and quantity summary. The third row remains the existing location helper.

Rules:

- Done cards always show aggregate link status.
- Pending cards show status only for linked, partial, or unverified states.
- Target badge uses itinerary-time tokens and no border.
- Category badge uses lower-emphasis sea/mint styling.
- Long title rows use `flex-wrap:wrap` and `overflow-wrap:anywhere`.
- Selection mode continues to select instead of opening detail.

- [ ] **Step 4: Run focused suites**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit card rendering**

```powershell
git add index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: surface shopping allocation status"
```

---

### Task 8: Add Shopping Detail and Nested Ledger Navigation

**Files:**
- Modify: `index.html:541-545`
- Modify: `index.html:2911-3225`
- Modify: `index.html:6690-6705`
- Modify: `index.html:7141-7158`
- Test: `tests/shopping-list.test.js:295-382`
- Test: `tests/shopping-ledger-links.test.js:270-335`

**Interfaces:**
- Produces: `openShoppingItemDetail(id)`.
- Produces: `renderShoppingItemDetail(item)`.
- Produces: `closeShoppingItemDetail()`.
- Produces: `handleShoppingItemBodyClick(id, event)`.
- Produces: `openShoppingLinkedLedgerRecord(itemId, allocationId)`.
- Changes: `closeLedgerRecordDetail()` returns to Shopping detail when opened from it.
- Consumes: split-group totals, allocation link states, and existing `openLedgerRecordDetail(id)`.

- [ ] **Step 1: Add failing detail-sheet source tests**

Add:

```js
assert(ui.includes('function openShoppingItemDetail('));
assert(ui.includes('function renderShoppingItemDetail('));
assert(ui.includes('代購對象與帳本紀錄'));
assert(ui.includes('記帳未完成對象'));
assert(ui.includes('openShoppingLinkedLedgerRecord('));
assert(ui.includes('shoppingDetailReturnItemId'));
assert(ui.includes('handleShoppingItemBodyClick('));
assert.match(ui,/event\.stopPropagation\(\)/);
```

Add a pure detail-model test:

```js
const splitDone={
  id:'shopping-a',name:'白桃',unit:'盒',done:true,splitGroupId:'shopping-a',
  allocations:[
    {allocationId:'a',target:'阿寶',quantity:2,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[link({recordId:'r-b'})]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const splitPending={
  id:'shopping-b',name:'白桃',unit:'盒',done:false,splitGroupId:'shopping-a',
  allocations:[
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const model=plain(mod.shoppingItemDetailModel(
  splitDone,[splitDone,splitPending],
  ctx({personal:{ready:true,records:[expense({id:'r-a'}),expense({id:'r-b'})]}})
));
assert.strictEqual(model.originalTotal,6);
assert.strictEqual(model.currentTotal,4);
assert.deepStrictEqual(model.allocations.map(value=>[
  value.target,value.originalQuantity,value.currentQuantity,value.linkState
]),[
  ['阿寶',2,2,'linked'],
  ['媽媽',2,1,'linked'],
  ['小明',2,1,'unlinked']
]);
```

- [ ] **Step 2: Run focused suites**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: FAIL because no Shopping detail model or sheet exists.

- [ ] **Step 3: Implement detail model, sheet, and return stack**

`shoppingItemDetailModel(item, allItems, context)` returns only render-ready values:

```js
{
  title:item.name,
  targetSummary:'幫阿寶、媽媽 +1 買',
  quantitySummary:'共 4 盒 · 3 位',
  originalTotal:6,
  currentTotal:4,
  statusText:'已買 · 2026/07/27 14:20',
  locationText:'DAY 2 · 岡山站伴手禮街',
  linkText:'2／3 位已記帳',
  allocations:[/* target, original/current quantity, link state, active record */]
}
```

Use the existing Ledger overlay/detail row classes. Each linked row opens its active record. Store a single `shoppingDetailReturnItemId`; when Ledger detail closes, reopen that Shopping item if it still exists. If the record is unavailable, toast and reopen Shopping detail without clearing its link.

Per linked allocation, include a low-frequency `改回未記帳` action. The bottom `記帳未完成對象` button calls Task 6 sources and includes only definite unlinked allocations.

Wire `.shopping-item-body` only after the detail functions exist. Give it keyboard-capable button semantics; Enter/Space opens detail. Checkbox, inline Ledger action, and menu call `stopPropagation()`. Selection mode continues to select instead of opening detail.

Ensure overlay close paths remove their own nodes, restore body scroll exactly once, and do not close the parent Shopping list.

- [ ] **Step 4: Run focused suites**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the detail loop**

```powershell
git add index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: add shopping item details"
```

---

### Task 9: Enforce Edit and Delete Safety per Allocation

**Files:**
- Modify: `index.html:2820-2856`
- Modify: `index.html:3078-3225`
- Modify: `index.html:3690-3775`
- Test: `tests/shopping-ledger-links.test.js:145-235`
- Test: `tests/shopping-ledger-links.test.js:275-320`

**Interfaces:**
- Consumes: `shoppingAllocationEditPolicy(item, context)` from Task 3.
- Changes: form target/quantity controls respect per-allocation linked/unverified locks.
- Changes: single and batch delete warnings count allocations, not items.
- Preserves: common field edits never mutate Ledger records.

- [ ] **Step 1: Add policy regression and failing warning tests**

Add:

```js
const guardedItem={
  id:'shopping-guard',name:'白桃',unit:'盒',done:true,
  allocations:[
    {allocationId:'a-linked',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'a-unverified',target:'媽媽',quantity:1,ledgerLinks:[link({recordId:'r-missing',track:'shared'})]},
    {allocationId:'a-open',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const policy=plain(mod.shoppingAllocationEditPolicy(
  guardedItem,
  ctx({
    personal:{ready:true,records:[expense({id:'r-a'})]},
    shared:{ready:false,records:[]}
  })
));
assert.deepStrictEqual(policy.allocations.map(value=>[
  value.allocationId,value.canEdit,value.reason
]),[
  ['a-linked',false,'已記帳'],
  ['a-unverified',false,'狀態待確認'],
  ['a-open',true,'']
]);
```

Add source assertions requiring:

```js
assert(ui.includes('已有 2 位建立消費紀錄'));
assert(ui.includes('有 1 位記帳狀態待確認'));
assert(ui.includes('刪除採買項目不會刪除原本的消費紀錄'));
```

Simulate attempted removal of a linked target and assert the store snapshot is unchanged.

- [ ] **Step 2: Run the ledger-link suite**

```powershell
node tests/shopping-ledger-links.test.js
```

Expected: FAIL on done-item confirmation and allocation-count warning assertions; the Task 3 policy regression remains green.

- [ ] **Step 3: Implement per-allocation locks and warnings**

Consume the Task 3 edit policy in form and store mutation paths:

- `linked`: locked until its active link is released.
- `unverified`: locked until resolver state changes.
- `unlinked`: editable.

For a done item with editable allocations, changing target or quantity opens a custom confirmation explaining that the user is correcting a completed purchase. Cancel preserves the draft and persisted item.

Delete and batch-delete preflight count allocation states and compose one warning. The delete operation still removes only Shopping Items through the existing atomic `removeMany()` path.

- [ ] **Step 4: Run focused tests**

```powershell
node tests/shopping-ledger-links.test.js
node tests/shopping-list.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit safety policies**

```powershell
git add index.html tests/shopping-ledger-links.test.js tests/shopping-list.test.js
git commit -m "fix: guard shopping allocation edits"
```

---

### Task 10: Update Durable Documentation and Run Full Verification

**Files:**
- Modify: `CONTEXT.md:27-48`
- Modify: `07_CHANGELOG.md:1`
- Modify: `tests/README.md:23-24`
- Modify: `sw.js:9`
- Verify: all `tests/*.test.js`

**Interfaces:**
- Documents the exact delivered helper names and behavioral contracts.
- Produces one new SW cache version after implementation is otherwise complete.
- Does not change product behavior beyond cache invalidation.

- [ ] **Step 1: Update test asset documentation**

In `tests/README.md`, replace item-level wording with:

```markdown
- `shopping-ledger-links.test.js`:採買分配 ↔ Ledger 持久關聯。涵蓋 allocation normalizer、append-only allocation links、卡片彙總三態、多對象 source→record 一一對應、逐對象部分購買拆分、原子回寫與個人狀態備份 v7。
- `shopping-list.test.js`:採買清單 allocation store、多對象與數量摘要、卡片／表單／詳情 UI 契約、Today 提醒、站點排序與孤兒 `stopRef` 三態。
```

- [ ] **Step 2: Update `CONTEXT.md` with delivered invariants**

Record:

- Allocation schema and stable IDs.
- Category/proxy separation.
- Equal-per-person first-version UI and future unequal quantities.
- Equal/unequal labels and first-two-plus-N target label.
- Allocation link aggregate state and unverified precedence.
- Save-another reset contract.
- Partial split filtering and split-group derived originals.
- Detail-to-Ledger return behavior.
- v7 backup migration.

- [ ] **Step 3: Add the top `07_CHANGELOG.md` delivery entry**

Include:

- Baseline and delivered SW version.
- User-facing card, form, split, and detail changes.
- Allocation data and Ledger handoff changes.
- Explicit exclusions from Global Constraints.
- Focused and full test counts.
- Browser QA widths, long-content cases, overflow, tap targets, input font size, console errors, scroll/safe-area behavior.

- [ ] **Step 4: Run the complete Node and document suite before touching SW**

Run:

```powershell
node tools/check-doc-titles.js
Get-ChildItem tests -Filter *.test.js |
  Sort-Object Name |
  ForEach-Object {
    Write-Host "== $($_.Name) =="
    node $_.FullName
    if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  }
```

Expected: every test exits 0. If any test fails, fix the responsible behavior in the task that owns it and rerun the focused suite before repeating this command.

- [ ] **Step 5: Perform Browser QA before cache invalidation**

Use the connected browser control skill and verify at 320, 375, and 390px:

1. Add an ordinary item and a three-target item.
2. Add a new proxy target from the Shopping form and confirm auto-selection.
3. Use `儲存並新增`; verify only category and stop remain and quantity is `1`.
4. Confirm long names wrap without horizontal overflow.
5. Complete and partially split `2 盒／人 · 共 6 盒` into 4 purchased and 2 remaining.
6. Open card detail; verify per-person quantities and `記帳 0／3`, `2／3`, and all-linked states.
7. Open a linked Ledger detail and return to the same Shopping detail.
8. Verify checkbox, inline action, and `⋯` never trigger card detail.
9. Verify all form controls are at least 16px, actions at least 40px, `scrollWidth === clientWidth`, and console/page errors are zero.
10. Verify Shopping overlay, nested sheets, popovers, safe-area padding, and vertical scrolling close cleanly.

- [ ] **Step 6: Increment the Service Worker cache once**

After all tests and Browser QA pass, change only the numeric suffix:

```js
var CACHE_NAME = 'okayama-trip-v64';
```

If `origin/dev` has advanced to another Shopping build before execution, increment from the actual current cache rather than forcing v64.

- [ ] **Step 7: Rerun PWA and full verification**

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
node tools/check-doc-titles.js
Get-ChildItem tests -Filter *.test.js |
  Sort-Object Name |
  ForEach-Object {
    node $_.FullName
    if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  }
git diff --check
```

Expected: all commands pass and `git diff --check` prints nothing.

- [ ] **Step 8: Commit the final documentation and cache version**

```powershell
git add CONTEXT.md 07_CHANGELOG.md tests/README.md sw.js
git commit -m "docs: record shopping allocation delivery"
```

- [ ] **Step 9: Inspect the complete branch before publish**

```powershell
git status --short --branch
git log --oneline --decorate -12
git diff origin/dev...HEAD --stat
```

Expected: clean worktree and only the planned Shopping allocation commits ahead of `origin/dev`.
