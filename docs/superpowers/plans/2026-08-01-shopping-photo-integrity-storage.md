# Shopping Photo Integrity and Storage Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect missing device-local shopping photos, provide safe repair and reference-removal flows, report attachment capacity in Settings, and automatically clean orphan photos after 24 hours.

**Architecture:** Extend the existing `TripShoppingPhotos` UMD module with repository metadata listing and pure audit/capacity functions. Keep one asynchronous audit state in `index.html`; shopping cards, repair sheets, and the Settings storage page render from that state instead of treating every non-empty `photoId` as valid. Keep all photos device-local and preserve Service Worker structure by adding no new runtime asset.

**Tech Stack:** Vanilla JavaScript, IndexedDB, `navigator.storage.estimate()`, localStorage shopping records, Node `assert`, Playwright 1.62.0, existing six-theme CSS variables.

## Global Constraints

- Photos remain only on the device where they were selected or captured; do not sync them or include them in backup/restore JSON.
- Valid shopping cards show one paperclip icon only, with no visible text and no thumbnail.
- Invalid shopping cards show a paperclip plus exclamation mark with no visible text and accessible name `附件已遺失`.
- Never clear an invalid `photoId` automatically.
- Background cleanup may delete only orphan blobs with a valid `createdAt` that are at least 24 hours old.
- Referenced blobs are never cleanup candidates.
- Manual cleanup may delete younger orphan blobs only after showing count and size and receiving confirmation.
- Run one audit per App session and a fresh audit whenever the storage-management page opens.
- Treat remaining estimated quota as low when it is below 10 percent or below 50 MiB.
- Label browser quota data `App 儲存空間（估計）`; never describe it as total phone capacity.
- All new actionable rows and controls have at least 52 px touch height.
- Warning foreground and secondary text contrast is at least 4.5:1 in all six themes; keep `var(--coral)` to the non-text exclamation/accent when necessary and use `var(--ink)` for the paperclip.
- Preserve the existing 25 MiB input ceiling, 1600 px compression edge, JPEG quality 0.82, and device-local backup exclusion.
- Do not add dependencies, global theme tokens, cloud photo recovery, thumbnails, or deployment changes.

## File Structure

- `shopping-photo-store.js`: IndexedDB driver, store metadata listing, pure audit model, capacity classification, and quota-error classification.
- `tests/shopping-photo-store.test.js`: repository lifecycle, metadata, audit, 24-hour boundary, capacity, and failure classification.
- `index.html`: session audit state, maintenance lifecycle, shopping repair UI, storage Settings page, component-local CSS, and v77 release note.
- `tests/shopping-list.test.js`: source-level UI contracts for invalid indicators, repair routing, and v77 release note.
- `tests/settings-grouped-root.test.js`: Settings root storage row and storage-page routing contract.
- `tests/browser/shopping-photo.spec.js`: physical blob loss, repair/removal, quota failure, settings management, cleanup, themes, accessibility, viewport, and error telemetry.
- `tests/pwa-shell.test.js`: continue proving the existing photo store asset is cached and no additional runtime file is needed.
- `app-version.js`: advance the App shell marker from v76 to v77.
- `sw.js`: advance only `SW_VERSION` from v76 to v77.
- `tests/README.md`, `docs/batch2-device-acceptance.md`, `07_CHANGELOG.md`, `tasks/current.md`: verification and handoff documentation.

---

### Task 1: Model Attachment Integrity and Capacity

**Files:**
- Modify: `shopping-photo-store.js:7-155`
- Modify: `tests/shopping-photo-store.test.js:1-54`

**Interfaces:**
- Produces: `auditAttachments(items, records, nowMs) -> {validPhotoIds, invalidReferences, orphanPhotos, eligibleOrphanIds, storedPhotoCount, storedBytes}`
- Produces: `classifyCapacity(estimate) -> {available, usageBytes, quotaBytes, remainingBytes, remainingRatio, low}`
- Produces: `isQuotaExceededError(error) -> boolean`
- Consumes later: Task 3 session maintenance and Task 4 save-error handling.

- [ ] **Step 1: Add failing audit tests**

Import the three new functions in `tests/shopping-photo-store.test.js`:

```js
const {
  createStore,
  fitImageSize,
  validateImageFile,
  auditAttachments,
  classifyCapacity,
  isQuotaExceededError
}=require('../shopping-photo-store.js');
```

Add these assertions before the async repository tests:

```js
const DAY=24*60*60*1000;
const audit=auditAttachments([
  {id:'valid-item',photoId:'valid-photo'},
  {id:'missing-item',photoId:'missing-photo'},
  {id:'legacy-item',photoId:''}
],[
  {id:'valid-photo',size:5,createdAt:'2026-07-31T00:00:00.000Z'},
  {id:'old-orphan',size:7,createdAt:'2026-07-30T00:00:00.000Z'},
  {id:'exact-orphan',size:11,createdAt:'2026-07-31T00:00:00.000Z'},
  {id:'young-orphan',size:13,createdAt:'2026-07-31T12:00:00.001Z'},
  {id:'unknown-orphan',size:17,createdAt:'not-a-date'}
],Date.parse('2026-08-01T00:00:00.000Z'));

assert.deepStrictEqual(audit.validPhotoIds,['valid-photo']);
assert.deepStrictEqual(audit.invalidReferences,[{itemId:'missing-item',photoId:'missing-photo'}]);
assert.deepStrictEqual(audit.eligibleOrphanIds,['old-orphan','exact-orphan']);
assert.strictEqual(audit.storedPhotoCount,5);
assert.strictEqual(audit.storedBytes,53);
assert.strictEqual(audit.orphanPhotos.find(value=>value.id==='young-orphan').eligibleForCleanup,false);
assert.strictEqual(audit.orphanPhotos.find(value=>value.id==='unknown-orphan').eligibleForCleanup,false);

assert.deepStrictEqual(
  auditAttachments([{id:'shared-a',photoId:'shared'},{id:'shared-b',photoId:'shared'}],[{id:'shared',size:4,createdAt:'2026-07-01T00:00:00.000Z'}],Date.now()).validPhotoIds,
  ['shared'],
  'a shared referenced blob is never orphaned'
);
```

- [ ] **Step 2: Add failing capacity and quota-error tests**

Append:

```js
const MIB=1024*1024;
assert.deepStrictEqual(classifyCapacity(),{
  available:false,usageBytes:0,quotaBytes:0,remainingBytes:0,remainingRatio:0,low:false
});
assert.strictEqual(classifyCapacity({usage:100*MIB,quota:1000*MIB}).low,false);
assert.strictEqual(classifyCapacity({usage:951*MIB,quota:1000*MIB}).low,true,'below 50 MiB is low');
assert.strictEqual(classifyCapacity({usage:91*MIB,quota:100*MIB}).low,true,'below 10 percent is low');
assert.strictEqual(classifyCapacity({usage:0,quota:0}).available,false,'zero quota is unavailable');
assert.strictEqual(isQuotaExceededError({name:'QuotaExceededError'}),true);
assert.strictEqual(isQuotaExceededError({code:22}),true);
assert.strictEqual(isQuotaExceededError({name:'AbortError'}),false);
assert.strictEqual(isQuotaExceededError(null),false);
```

- [ ] **Step 3: Run the focused test and confirm the red state**

Run:

```powershell
node tests/shopping-photo-store.test.js
```

Expected: FAIL because `auditAttachments`, `classifyCapacity`, and `isQuotaExceededError` are not exported.

- [ ] **Step 4: Implement the pure functions**

Add constants and functions before `createIndexedDbDriver()` in `shopping-photo-store.js`:

```js
var ORPHAN_GRACE_MS=24*60*60*1000;
var LOW_REMAINING_BYTES=50*1024*1024;

function cleanPhotoId(value){return String(value||'').trim();}
function recordMetadata(record){
  return {
    id:cleanPhotoId(record&&record.id),
    size:Math.max(0,Number(record&&record.size!=null?record.size:record&&record.blob&&record.blob.size)||0),
    createdAt:String(record&&record.createdAt||'')
  };
}
function auditAttachments(items,records,nowMs){
  var referenced={},references=[];
  (items||[]).forEach(function(item){
    var photoId=cleanPhotoId(item&&item.photoId);
    if(!photoId)return;
    referenced[photoId]=true;
    references.push({itemId:String(item&&item.id||''),photoId:photoId});
  });
  var stored={},metadata=(records||[]).map(recordMetadata).filter(function(record){return !!record.id;});
  metadata.forEach(function(record){stored[record.id]=record;});
  var validPhotoIds=Object.keys(referenced).filter(function(id){return !!stored[id];}).sort();
  var invalidReferences=references.filter(function(ref){return !stored[ref.photoId];});
  var now=Number(nowMs);if(!isFinite(now))now=Date.now();
  var orphanPhotos=metadata.filter(function(record){return !referenced[record.id];}).map(function(record){
    var created=Date.parse(record.createdAt),ageMs=isFinite(created)?Math.max(0,now-created):null;
    return Object.assign({},record,{ageMs:ageMs,eligibleForCleanup:ageMs!==null&&ageMs>=ORPHAN_GRACE_MS});
  });
  return {
    validPhotoIds:validPhotoIds,
    invalidReferences:invalidReferences,
    orphanPhotos:orphanPhotos,
    eligibleOrphanIds:orphanPhotos.filter(function(record){return record.eligibleForCleanup;}).map(function(record){return record.id;}).sort(),
    storedPhotoCount:metadata.length,
    storedBytes:metadata.reduce(function(total,record){return total+record.size;},0)
  };
}
function classifyCapacity(estimate){
  var usage=Number(estimate&&estimate.usage),quota=Number(estimate&&estimate.quota);
  if(!isFinite(usage)||usage<0||!isFinite(quota)||quota<=0)return {available:false,usageBytes:0,quotaBytes:0,remainingBytes:0,remainingRatio:0,low:false};
  var remaining=Math.max(0,quota-usage),ratio=remaining/quota;
  return {available:true,usageBytes:usage,quotaBytes:quota,remainingBytes:remaining,remainingRatio:ratio,low:remaining<LOW_REMAINING_BYTES||ratio<0.1};
}
function isQuotaExceededError(error){
  return !!(error&&(error.name==='QuotaExceededError'||Number(error.code)===22||error.name==='NS_ERROR_DOM_QUOTA_REACHED'));
}
```

Export `ORPHAN_GRACE_MS`, `auditAttachments`, `classifyCapacity`, and `isQuotaExceededError` from the module return object.

- [ ] **Step 5: Run the focused test and confirm it passes**

Run:

```powershell
node tests/shopping-photo-store.test.js
```

Expected: PASS and prints `shopping photo store tests passed`.

- [ ] **Step 6: Commit the pure integrity model**

```powershell
git add shopping-photo-store.js tests/shopping-photo-store.test.js
git diff --cached --check
git commit -m "feat(shopping): model photo attachment integrity"
```

---

### Task 2: List Stored Photo Metadata Safely

**Files:**
- Modify: `shopping-photo-store.js:28-102`
- Modify: `tests/shopping-photo-store.test.js:8-70`

**Interfaces:**
- Consumes: Task 1 `recordMetadata()` normalization.
- Produces: driver `list() -> Promise<Array<Record>>`.
- Produces: store `listMetadata() -> Promise<Array<{id:string,size:number,createdAt:string}>>`.
- Consumes later: Task 3 `refreshShoppingPhotoAudit()`.

- [ ] **Step 1: Extend the memory driver and write the failing metadata test**

Add this operation to `memoryDriver()`:

```js
list(){return Promise.resolve(Array.from(records.values()));},
```

After storing both test blobs, add:

```js
assert.deepStrictEqual(await store.listMetadata(),[
  {id:firstId,size:firstBlob.size,createdAt:'2024-08-01T00:00:00.000Z'},
  {id:secondId,size:secondBlob.size,createdAt:'2024-08-01T00:00:00.000Z'}
]);
```

Add a driver-failure case:

```js
await assert.rejects(
  createStore({driver:{put(){},get(){},remove(){},list(){return Promise.reject(new Error('LIST_FAILED'));}}}).listMetadata(),
  /LIST_FAILED/
);
```

- [ ] **Step 2: Run the test and confirm the red state**

Run:

```powershell
node tests/shopping-photo-store.test.js
```

Expected: FAIL because `store.listMetadata` does not exist.

- [ ] **Step 3: Add IndexedDB `getAll()` support and the store facade**

Add to the IndexedDB driver return object:

```js
list:function(){return transact('readonly',function(store){return store.getAll();});},
```

Add to the object returned by `createStore()`:

```js
  listMetadata:function(){
  return Promise.resolve(driver.list()).then(function(records){
    return (records||[]).map(recordMetadata).filter(function(record){return !!record.id;}).sort(function(a,b){return a.id.localeCompare(b.id);});
  });
},
```

Do not expose blobs through `listMetadata()`.

- [ ] **Step 4: Run repository and shell tests**

Run:

```powershell
node tests/shopping-photo-store.test.js
node tests/pwa-shell.test.js
```

Expected: both PASS; `shopping-photo-store.js` remains the only photo runtime asset.

- [ ] **Step 5: Commit metadata listing**

```powershell
git add shopping-photo-store.js tests/shopping-photo-store.test.js
git diff --cached --check
git commit -m "feat(shopping): inspect local photo storage"
```

---

### Task 3: Run One Session Audit and Safe Orphan Maintenance

**Files:**
- Modify: `index.html:602` photo styles
- Modify: `index.html:2953-2956` photo store fallback
- Modify: `index.html:3066-3176` shopping mutation cleanup calls
- Modify: `index.html:4900-4920` photo reference helpers
- Modify: `index.html:9693-9714` startup lifecycle
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/browser/shopping-photo.spec.js`

**Interfaces:**
- Consumes: `shoppingPhotoStore.listMetadata()`, `TripShoppingPhotos.auditAttachments()`, and `navigator.storage.estimate()`.
- Produces: `shoppingPhotoAuditState` and `refreshShoppingPhotoAudit(options) -> Promise<AuditState>`.
- Produces: `shoppingPhotoStatus(item) -> 'none'|'checking'|'valid'|'invalid'`.
- Produces: `cleanupShoppingPhotoOrphans(ids) -> Promise<Array>`.
- Consumes later: Tasks 4 and 5 UI renderers.

- [ ] **Step 1: Add a failing rendered-state contract**

In `tests/shopping-list.test.js`, add source assertions for these exact contracts:

```js
assert(ui.includes('var shoppingPhotoAuditState='),'the App owns one attachment audit state');
assert(ui.includes('function refreshShoppingPhotoAudit('),'the App exposes one audit refresh entry');
assert(ui.includes('TripShoppingPhotos.auditAttachments('),'the UI delegates integrity rules to the photo module');
assert(ui.includes("refreshShoppingPhotoAudit({cleanupExpired:true,reason:'startup'})"),'startup schedules one maintenance audit');
assert(!/cleanupShoppingPhotoIds\(shoppingPhotoIdsReleased\(before,shoppingListStore\.all\(\)\)\)/.test(ui),'saved reference changes wait for orphan maintenance');
assert(!/cleanupShoppingPhotoIds\(shoppingPhotoIdsReleased\(before,after\)\)/.test(ui),'deleted item photos wait for orphan maintenance');
```

- [ ] **Step 2: Add a failing browser test for startup cleanup boundaries**

Add helpers to `tests/browser/shopping-photo.spec.js` that put raw records into `trip-local-media/shopping-photos` and return record metadata. Add a test that seeds:

```js
[
  {id:'referenced-old',blob:PNG,createdAt:'2026-07-01T00:00:00.000Z'},
  {id:'orphan-old',blob:PNG,createdAt:'2026-07-30T00:00:00.000Z'},
  {id:'orphan-exact',blob:PNG,createdAt:'2026-07-31T00:00:00.000Z'},
  {id:'orphan-young',blob:PNG,createdAt:'2026-07-31T00:00:00.001Z'},
  {id:'orphan-unknown',blob:PNG,createdAt:'invalid'}
]
```

Use `page.addInitScript(() => { Date.now=()=>Date.parse('2026-08-01T00:00:00.000Z'); })`, give the shopping item `photoId:'referenced-old'`, reload, and assert that only `referenced-old`, `orphan-young`, and `orphan-unknown` remain after `shoppingPhotoAuditState.maintenanceComplete===true`.

- [ ] **Step 3: Run the focused tests and confirm the red state**

Run:

```powershell
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-photo.spec.js
```

Expected: Node fails because the audit state is absent; Playwright times out waiting for maintenance.

- [ ] **Step 4: Add the session audit state and capacity estimate**

Near `shoppingPhotoStore`, add this stable state shape:

```js
var shoppingPhotoAuditState={
  ready:false,unavailable:false,error:'',checkedAt:0,maintenanceComplete:false,
  validPhotoIds:[],invalidReferences:[],orphanPhotos:[],eligibleOrphanIds:[],
  storedPhotoCount:0,storedBytes:0,
  capacity:{available:false,usageBytes:0,quotaBytes:0,remainingBytes:0,remainingRatio:0,low:false}
};
var shoppingPhotoAuditPromise=null;
```

Extend the no-module fallback store with `listMetadata:function(){return Promise.reject(new Error('此裝置目前無法使用照片附件'));}` so audit unavailability produces the approved user-facing state instead of a missing-method `TypeError`.

Implement these helpers near the current photo reference helpers:

```js
function shoppingPhotoStatus(item){
  var id=String(item&&item.photoId||'').trim();
  if(!id)return 'none';
  if(!shoppingPhotoAuditState.ready)return 'checking';
  return shoppingPhotoAuditState.invalidReferences.some(function(ref){return ref.itemId===item.id&&ref.photoId===id;})?'invalid':'valid';
}
function estimateShoppingPhotoCapacity(){
  var storage=navigator&&navigator.storage;
  if(!storage||typeof storage.estimate!=='function')return Promise.resolve(TripShoppingPhotos.classifyCapacity());
  return storage.estimate().then(TripShoppingPhotos.classifyCapacity,function(){return TripShoppingPhotos.classifyCapacity();});
}
function cleanupShoppingPhotoOrphans(ids){
  return (ids||[]).reduce(function(chain,id){
    return chain.then(function(results){
      return shoppingPhotoStore.remove(id).then(function(){results.push({id:id,removed:true});return results;},function(error){
        AppLog.repo('採買照片清理失敗：'+(error&&error.message||error));results.push({id:id,removed:false});return results;
      });
    });
  },Promise.resolve([]));
}
```

Implement `refreshShoppingPhotoAudit(options)` with this ordering:

```js
function refreshShoppingPhotoAudit(options){
  options=options||{};
  if(shoppingPhotoAuditPromise&&!options.force)return shoppingPhotoAuditPromise;
  shoppingPhotoAuditPromise=Promise.all([shoppingPhotoStore.listMetadata(),estimateShoppingPhotoCapacity()]).then(function(values){
    var audit=TripShoppingPhotos.auditAttachments(shoppingListStore.all(),values[0],Date.now());
    shoppingPhotoAuditState=Object.assign({ready:true,unavailable:false,error:'',checkedAt:Date.now(),maintenanceComplete:false},audit,{capacity:values[1]});
    if(!options.cleanupExpired||!audit.eligibleOrphanIds.length){shoppingPhotoAuditState.maintenanceComplete=true;return shoppingPhotoAuditState;}
    return cleanupShoppingPhotoOrphans(audit.eligibleOrphanIds).then(function(){
      return shoppingPhotoStore.listMetadata().then(function(records){
        var refreshed=TripShoppingPhotos.auditAttachments(shoppingListStore.all(),records,Date.now());
        shoppingPhotoAuditState=Object.assign({},shoppingPhotoAuditState,refreshed,{maintenanceComplete:true,checkedAt:Date.now()});
        return shoppingPhotoAuditState;
      });
    });
  }).catch(function(error){
    shoppingPhotoAuditState=Object.assign({},shoppingPhotoAuditState,{ready:true,unavailable:true,error:String(error&&error.message||error),checkedAt:Date.now(),maintenanceComplete:true});
    return shoppingPhotoAuditState;
  }).then(function(state){shoppingPhotoAuditPromise=null;renderShoppingPhotoAuditConsumers();return state;});
  return shoppingPhotoAuditPromise;
}
```

`renderShoppingPhotoAuditConsumers()` re-renders only existing Shopping list/detail and Settings overlays; it must not open an overlay or change the current page.

- [ ] **Step 5: Replace eager committed-photo deletion with audits**

Keep `cleanupShoppingPhotoIds()` only for unsaved temporary blobs discarded by the current form session. Replace post-save, item-delete, and batch-delete calls that pass `shoppingPhotoIdsReleased(...)` with:

```js
refreshShoppingPhotoAudit({force:true,reason:'shopping-mutation'});
```

Do not change the immediate cleanup of `formSession.temporaryPhotoIds` when an unsaved form is cancelled.

- [ ] **Step 6: Schedule startup maintenance once**

After the successful `renderAll()` call in `init()`, add:

```js
refreshShoppingPhotoAudit({cleanupExpired:true,reason:'startup'});
```

Do not add timers or visibility-triggered repeated audits.

- [ ] **Step 7: Run focused tests and commit**

Run:

```powershell
node tests/shopping-photo-store.test.js
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-photo.spec.js
```

Expected: all PASS, referenced old photos survive, only eligible old orphans are deleted, and invalid/missing timestamps remain.

Commit:

```powershell
git add index.html tests/shopping-list.test.js tests/browser/shopping-photo.spec.js
git diff --cached --check
git commit -m "feat(shopping): audit local photo attachments"
```

---

### Task 4: Repair Missing Attachments in Context

**Files:**
- Modify: `index.html:602` photo and repair-sheet CSS
- Modify: `index.html:3241-3421` photo field, card, detail, viewer, and repair handlers
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/browser/shopping-photo.spec.js`

**Interfaces:**
- Consumes: Task 3 `shoppingPhotoStatus()` and `refreshShoppingPhotoAudit()`.
- Produces: `openShoppingPhotoRepair(itemId, trigger)`, `repairShoppingPhoto(input)`, `removeInvalidShoppingPhotoReference(itemId)`, and `closeShoppingPhotoRepair()`.
- Produces: `showShoppingPhotoSaveFailure(error)` with a storage-management action for quota failures.
- Consumes later: Task 5 Settings invalid-reference links.

- [ ] **Step 1: Add failing card and repair source contracts**

Add these assertions to `tests/shopping-list.test.js`:

```js
const photoRenderer=extractUiFunction('renderShoppingItem');
assert(photoRenderer.includes("shoppingPhotoStatus(item)"),'card rendering consumes the audited status');
assert(photoRenderer.includes('aria-label="附件已遺失"'),'invalid attachment has an accessible name');
assert(photoRenderer.includes('shopping-photo-indicator-invalid'),'invalid attachment has a dedicated component class');
assert(!photoRenderer.includes('>附件已遺失<'),'invalid card status has no visible text');
assert(ui.includes('function openShoppingPhotoRepair('));
assert(ui.includes('function repairShoppingPhoto('));
assert(ui.includes('function removeInvalidShoppingPhotoReference('));
assert(ui.includes("isQuotaExceededError(error)"),'save failures distinguish quota exhaustion');
```

- [ ] **Step 2: Add failing physical-loss and repair browser tests**

In `tests/browser/shopping-photo.spec.js`, add a test that:

1. Stores a valid attachment through the existing form.
2. Deletes its IndexedDB blob directly while leaving the shopping `photoId` intact.
3. Calls `refreshShoppingPhotoAudit({force:true})`.
4. Asserts one `.shopping-photo-indicator-invalid[aria-label="附件已遺失"]`, one paperclip SVG, one `.shopping-photo-warning-mark`, no visible `附件已遺失` text, and a bounding box of at least 52×52 px.
5. Opens the repair sheet from the indicator.
6. Uploads a new image and verifies the shopping item receives a different `photoId`, the new blob exists, and the indicator returns to `aria-label="有照片附件"`.

Add a second test that deletes the blob, opens the repair sheet, accepts the explicit remove confirmation, and verifies `photoId===''`, the indicator disappears, and no other item changes.

- [ ] **Step 3: Add failing quota and IndexedDB-unavailable browser tests**

For quota failure, monkey-patch only the store write:

```js
await page.evaluate(()=>{
  const original=shoppingPhotoStore.put;
  shoppingPhotoStore.put=()=>Promise.reject(new DOMException('full','QuotaExceededError'));
  window.__restorePhotoPut=()=>{shoppingPhotoStore.put=original;};
});
```

Attempt a replacement and assert the old `photoId` remains unchanged, the message is `儲存空間不足，照片尚未加入`, and a `管理儲存空間` button is visible.

For repository unavailability, replace `listMetadata()` with a rejected promise, force an audit, and assert `此裝置目前無法使用照片附件` while ordinary item editing remains usable.

- [ ] **Step 4: Run the focused tests and confirm the red state**

Run:

```powershell
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-photo.spec.js
```

Expected: FAIL because cards still trust `photoId` and no repair sheet exists.

- [ ] **Step 5: Render the audited indicator without visible text**

Replace the `photoIndicator` branch with status-aware markup equivalent to:

```js
var photoStatus=shoppingPhotoStatus(item),photoIndicator='';
if(photoStatus==='invalid'){
  photoIndicator='<button type="button" class="shopping-photo-indicator shopping-photo-indicator-invalid" aria-label="附件已遺失" onclick="event.stopPropagation();openShoppingPhotoRepair(\''+jsString(item.id)+'\',this)">'+
    '<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9.5 12.5 5.7-5.7a3 3 0 0 1 4.2 4.2l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5"></path></svg><span class="shopping-photo-warning-mark" aria-hidden="true">!</span></button>';
}else if(photoStatus!=='none'){
  photoIndicator='<span class="shopping-photo-indicator" role="img" aria-label="有照片附件"><svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9.5 12.5 5.7-5.7a3 3 0 0 1 4.2 4.2l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5"></path></svg></span>';
}
```

Use component CSS with `color:var(--ink)` on the paperclip and `var(--coral)` only on the exclamation/accent. Give the invalid button a 52×52 px hit target without adding text or a thumbnail.

- [ ] **Step 6: Implement the repair sheet and focus restoration**

Create a bottom-sheet overlay with:

```html
<section class="ledger-sheet shopping-photo-repair-sheet" role="dialog" aria-modal="true" aria-labelledby="shoppingPhotoRepairTitle">
  <h2 id="shoppingPhotoRepairTitle">修復照片附件</h2>
  <p>照片可能已被瀏覽器清除，或 App 儲存空間不足。</p>
  <input id="shoppingPhotoRepairInput" type="file" accept="image/*" hidden>
  <button type="button">重新選擇照片</button>
  <button type="button">移除附件引用</button>
</section>
```

Store the triggering element, focus the first repair action after opening, and restore focus on close when the trigger remains connected. Close on the explicit close button, backdrop activation, Escape, or a downward swipe of at least 72 px whose vertical distance is greater than 1.25 times the horizontal distance.

Implement replacement ordering as:

```js
TripShoppingPhotos.compressImage(file)
  .then(function(blob){return shoppingPhotoStore.put(blob);})
  .then(function(photoId){
    shoppingListStore.update(itemId,{photoId:photoId});
    return refreshShoppingPhotoAudit({force:true,reason:'repair'});
  })
```

If `shoppingListStore.update()` fails after the blob write, leave the new blob unreferenced for orphan maintenance and preserve the old invalid reference.

For reference removal, require `confirm('移除這筆採買項目的無效附件引用？')`, then call `shoppingListStore.update(itemId,{photoId:''})` and force an audit.

- [ ] **Step 7: Classify save failures without mutating the old reference**

Change the existing `selectShoppingPhoto()` catch branch and repair catch branch to call:

```js
function showShoppingPhotoSaveFailure(error){
  if(TripShoppingPhotos.isQuotaExceededError(error)){
    openShoppingPhotoStorageFailure();
    return '儲存空間不足，照片尚未加入';
  }
  toast(error&&error.message||'照片附件處理失敗');
  return error&&error.message||'照片附件處理失敗';
}
```

`openShoppingPhotoStorageFailure()` renders the exact message and a `管理儲存空間` action that closes the failure dialog and opens Settings page `storage`.

- [ ] **Step 8: Run focused tests and commit**

Run:

```powershell
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-photo.spec.js
```

Expected: all PASS, with no visible invalid-status text and no old-reference mutation on failure.

Commit:

```powershell
git add index.html tests/shopping-list.test.js tests/browser/shopping-photo.spec.js
git diff --cached --check
git commit -m "feat(shopping): repair missing photo attachments"
```

---

### Task 5: Add Attachment Storage Management to Settings

**Files:**
- Modify: `index.html:547-555` Settings and storage CSS
- Modify: `index.html:7814-7938` Settings router, icons, root, and page renderer
- Modify: `tests/settings-grouped-root.test.js`
- Modify: `tests/browser/shopping-photo.spec.js`
- Modify: `tests/browser/settings-grouped-root.spec.js`

**Interfaces:**
- Consumes: Task 3 `shoppingPhotoAuditState`, `refreshShoppingPhotoAudit()`, and `cleanupShoppingPhotoOrphans()`.
- Consumes: Task 4 `openShoppingPhotoRepair()`.
- Produces: Settings route `storage`.
- Produces: `renderSettingsStoragePage()`, `checkShoppingPhotoStorage()`, `confirmShoppingPhotoCleanup()`, and `openInvalidShoppingPhotoItem(itemId)`.

- [ ] **Step 1: Add failing Settings root tests**

Extend the Settings root sandbox with this default and add `extractFunction(html,'shoppingPhotoStorageSummary')` before `renderSettingsRoot` in the `vm.runInContext()` source:

```js
shoppingPhotoAuditState:{ready:true,unavailable:false,storedPhotoCount:0,storedBytes:0,invalidReferences:[],capacity:{available:false,low:false}}
```

Render these two cases through the existing `renderRoot(overrides, ledgerSettings)` helper:

```js
const healthy=renderRoot({shoppingPhotoAuditState:{ready:true,unavailable:false,storedPhotoCount:3,storedBytes:19300000,invalidReferences:[],capacity:{available:true,low:false}}});
assert(healthy.includes('附件與儲存空間'));
assert(healthy.includes("openSettingsPage('storage')"));
assert(healthy.includes('3 張'));

const warning=renderRoot({shoppingPhotoAuditState:{ready:true,unavailable:false,storedPhotoCount:3,storedBytes:19300000,invalidReferences:[{itemId:'missing',photoId:'lost'}],capacity:{available:true,low:true}}});
assert(warning.includes('1 個附件待修復'));
assert.strictEqual((warning.match(/class="settings-group"/g)||[]).length,3,'storage remains inside the Data group');
```

Also assert `SETTINGS_PAGE_IDS` contains `'storage'` and the source of `renderSettingsPage` includes `if(page==='storage')return renderSettingsStoragePage();`. The browser test in Step 2 executes the router rather than duplicating all page dependencies in the Node sandbox.

- [ ] **Step 2: Add failing Settings browser tests**

Extend `tests/browser/settings-grouped-root.spec.js` to assert:

- the Data group contains `附件與儲存空間` before `備份、還原與版本資訊`;
- the row and all storage-page action rows are at least 52 px high;
- the root remains exactly three groups;
- 320×700, 375×812, and 390×844 have `scrollWidth-clientWidth===0`; and
- entering and returning from `storage` preserves the Settings router behavior.

Extend `tests/browser/shopping-photo.spec.js` to seed one valid blob, one missing reference, one old orphan, and one young orphan. Open Settings storage and assert exact blob count/size, invalid-reference count, estimated-capacity labeling, audit time, and item navigation.

- [ ] **Step 3: Run the focused tests and confirm the red state**

Run:

```powershell
node tests/settings-grouped-root.test.js
npx playwright test tests/browser/settings-grouped-root.spec.js tests/browser/shopping-photo.spec.js
```

Expected: FAIL because route `storage` and its root row do not exist.

- [ ] **Step 4: Add the Settings route and summary row**

Add `storage` to `SETTINGS_PAGE_IDS` and add an inline SVG `storage` icon to `SETTINGS_ROW_ICONS` using `stroke:currentColor` through the existing `.app-icon` class.

Add one deterministic formatter:

```js
function formatShoppingPhotoBytes(value){
  var bytes=Math.max(0,Number(value)||0);
  if(bytes<1024)return Math.round(bytes)+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(bytes<10*1024?1:0)+' KB';
  return (bytes/(1024*1024)).toFixed(bytes<10*1024*1024?1:0)+' MB';
}
```

In the Data group, render:

```js
settingsNavRow('storage','storage','附件與儲存空間',shoppingPhotoStorageSummary())+
settingsNavRow('data','data','備份、還原與版本資訊','SW '+appVersionLabel())
```

Implement the summary with these priorities:

```js
function shoppingPhotoStorageSummary(){
  var state=shoppingPhotoAuditState;
  if(!state.ready)return '檢查中';
  if(state.unavailable)return '無法使用';
  if(state.invalidReferences.length)return state.invalidReferences.length+' 個附件待修復';
  if(state.capacity&&state.capacity.low)return '儲存空間偏低';
  return state.storedPhotoCount+' 張 · '+formatShoppingPhotoBytes(state.storedBytes);
}
```

- [ ] **Step 5: Implement the storage detail page**

Render `renderSettingsHeader('附件與儲存空間',false)` and sections containing:

- `App 附件`: exact stored photo count and total blob bytes;
- `App 儲存空間（估計）`: usage/quota and remaining values only when `capacity.available===true`;
- `儲存空間偏低` when `capacity.low===true`;
- most recent audit time;
- a 52 px `立即檢查` action;
- a 52 px `清理未使用照片` action, disabled when no orphans exist; and
- invalid-reference count plus one 52 px affected-item row per invalid reference.

When quota estimation is unavailable, omit the usage/quota row and render `瀏覽器未提供容量估算`; do not show an error state.

- [ ] **Step 6: Implement manual audit, cleanup, and invalid-item routing**

Use these behaviors:

```js
function checkShoppingPhotoStorage(){
  return refreshShoppingPhotoAudit({force:true,reason:'settings'}).then(function(){openSettings('storage');});
}
function confirmShoppingPhotoCleanup(){
  var orphans=shoppingPhotoAuditState.orphanPhotos||[];
  if(!orphans.length){toast('目前沒有未使用照片');return Promise.resolve(false);}
  var bytes=orphans.reduce(function(total,photo){return total+photo.size;},0);
  if(!confirm('清理 '+orphans.length+' 張未使用照片（'+formatShoppingPhotoBytes(bytes)+'）？'))return Promise.resolve(false);
  return cleanupShoppingPhotoOrphans(orphans.map(function(photo){return photo.id;})).then(function(results){
    var failures=results.filter(function(result){return !result.removed;}).length;
    return refreshShoppingPhotoAudit({force:true,reason:'manual-cleanup'}).then(function(){return failures;});
  }).then(function(failures){
    openSettings('storage');toast(failures?'部分照片無法清理，稍後將再試一次':'未使用照片已清理');return failures===0;
  });
}
```

`openInvalidShoppingPhotoItem(itemId)` closes Settings, opens the shopping overlay, scrolls the matching `[data-shopping-item-id]` into view, and opens the Task 4 repair sheet. If the item no longer exists, force a new audit and toast `採買項目已不存在`.

Guard the first storage-page refresh with one explicit entry flag and re-render the existing panel without routing through `openSettings()` again:

```js
var shoppingPhotoSettingsEntered=false;
function rerenderOpenSettingsPage(){
  var panel=document.querySelector('#settingsOverlay .settings-panel');
  if(!panel)return;
  var ledgerSettings,settingsError='';
  try{ledgerSettings=currentLedgerSettings();}
  catch(error){ledgerSettings={exchangeRate:'',defaultCurrency:'JPY'};settingsError=error.message||'分帳設定無效';}
  panel.innerHTML=renderSettingsPage(settingsUiState.page,ledgerSettings,settingsError);
}
function enterShoppingPhotoSettings(){
  if(shoppingPhotoSettingsEntered)return;
  shoppingPhotoSettingsEntered=true;
  refreshShoppingPhotoAudit({force:true,reason:'settings'}).then(function(){
    if(settingsUiState.page==='storage')rerenderOpenSettingsPage();
  });
}
```

After the first `storage` render, schedule `enterShoppingPhotoSettings()` with `setTimeout(...,0)`. Reset `shoppingPhotoSettingsEntered=false` when Settings closes or routes to any non-storage page. Because `rerenderOpenSettingsPage()` does not call `openSettings()`, the completed audit cannot start a recursive refresh.

- [ ] **Step 7: Verify six-theme contrast and manual cleanup**

In the photo browser suite, iterate `THEME_IDS` and calculate WCAG contrast from computed foreground/background colors. Assert at least 4.5 for:

- storage-page primary text;
- storage-page secondary text;
- invalid attachment paperclip; and
- repair-sheet primary and secondary text.

Assert the exclamation/accent uses `var(--coral)` only as a non-text cue. Confirm manual cleanup deletes both old and young orphans only after accepting the dialog, while the valid blob and invalid reference remain unchanged.

- [ ] **Step 8: Run focused suites and commit**

Run:

```powershell
node tests/settings-grouped-root.test.js
node tests/shopping-list.test.js
npx playwright test tests/browser/settings-grouped-root.spec.js tests/browser/shopping-photo.spec.js
```

Expected: all PASS across the Settings and shopping flows.

Commit:

```powershell
git add index.html tests/settings-grouped-root.test.js tests/shopping-list.test.js tests/browser/settings-grouped-root.spec.js tests/browser/shopping-photo.spec.js
git diff --cached --check
git commit -m "feat(settings): manage local photo attachments"
```

---

### Task 6: Advance to v77 and Run the Complete Gate

**Files:**
- Modify: `index.html:7912` `APP_RELEASE_NOTES`
- Modify: `tests/shopping-list.test.js` release-note contract
- Modify: `app-version.js:1`
- Modify: `sw.js:27`
- Modify: `tests/README.md`
- Modify: `docs/batch2-device-acceptance.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: all completed behavior from Tasks 1-5.
- Produces: `APP_VERSION='v77'`, `SW_VERSION='v77'`, cache `okayama-trip-v77`, and the verified release handoff.

- [ ] **Step 1: Add the failing v77 release-note assertion**

Add to `tests/shopping-list.test.js`:

```js
assert(ui.includes("{version:'v77',date:'2026-08-01',title:'照片附件更可靠'"),
  'v77 release notes lead with local attachment repair and storage management');
```

Run:

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because the newest release note is v76.

- [ ] **Step 2: Add the v77 note and update both version literals**

Prepend this release note and keep only the latest five entries by removing v72:

```js
{version:'v77',date:'2026-08-01',title:'照片附件更可靠',items:['偵測本機照片遺失，可重新選擇照片或移除無效引用','設定新增附件容量與清理管理，未使用照片保留 24 小時後自動清理']},
```

Change `app-version.js` to:

```js
var APP_VERSION='v77';
```

Change only the version marker in `sw.js`:

```js
var SW_VERSION='v77';
```

- [ ] **Step 3: Verify version and Service Worker invariants**

Run:

```powershell
node tests/shopping-list.test.js
node tools/check-app-version.js
git diff 212dcf4 -- sw.js
git diff 212dcf4 -- netlify.toml
npx playwright test tests/browser/sw-update-cache.spec.js
```

Expected:

- the release-note test passes;
- the version checker reports v77;
- `sw.js` contains only `SW_VERSION='v76'` to `SW_VERSION='v77'`;
- `netlify.toml` has no diff; and
- CacheStorage upgrades v76 to v77, leaves only `okayama-trip-v77`, and restarts offline.

- [ ] **Step 4: Commit the shell version**

```powershell
git add index.html tests/shopping-list.test.js app-version.js sw.js
git diff --cached --check
git commit -m "chore: bump app shell to v77"
```

- [ ] **Step 5: Update verification documentation**

Add the new unit/browser suite coverage to `tests/README.md`. Add a v77 delta to `docs/batch2-device-acceptance.md` containing these explicit checks:

```markdown
- [ ] 實體 Blob 遺失後只顯示警示迴紋針與驚嘆號，沒有狀態文字
- [ ] 重新選擇照片與移除無效引用皆成功；失敗時保留原引用
- [ ] 背景只清理滿 24 小時的孤立照片，不刪有效附件
- [ ] 手動清理顯示張數與容量，確認後才刪除
- [ ] 設定頁顯示附件張數、容量、估算配額及檢查時間
- [ ] 六主題主要／次要文字與警示迴紋針對比皆 ≥ 4.5:1
- [ ] 320×700、375×812、390×844 水平 overflow = 0，點擊高度 ≥ 52px
- [ ] v76→v77 後只剩 okayama-trip-v77，離線重新啟動正常
- [ ] console error = 0，pageerror = 0
```

Prepend a v77 entry to `07_CHANGELOG.md` and update `tasks/current.md` to state that attachment integrity/storage implementation is locally complete pending device acceptance. Do not state that the itinerary or ledger designs are implemented.

- [ ] **Step 6: Run the complete local validation gate**

Run from the repository root:

```powershell
$ErrorActionPreference='Stop'
Get-ChildItem tests/*.test.js | ForEach-Object {
  node $_.FullName
  if($LASTEXITCODE -ne 0){throw "Node test failed: $($_.Name)"}
}
npm run test:browser
if($LASTEXITCODE -ne 0){throw 'Playwright failed'}
node tools/check-doc-titles.js
if($LASTEXITCODE -ne 0){throw 'Document title check failed'}
node tools/check-app-version.js
if($LASTEXITCODE -ne 0){throw 'App version check failed'}
git diff --check
if($LASTEXITCODE -ne 0){throw 'git diff --check failed'}
```

Expected: every command exits 0, all six themes meet the specified contrast, all three viewports have zero horizontal overflow, touch targets are at least 52 px, and browser telemetry has zero console/page errors.

- [ ] **Step 7: Recheck protected diffs and commit documentation**

Run:

```powershell
git diff 212dcf4 -- sw.js
git diff 212dcf4 -- netlify.toml
git diff --check
git status --short
```

Expected: `sw.js` has only the v76→v77 version line, `netlify.toml` has no output, and only the four documentation files from Step 5 remain uncommitted.

Commit:

```powershell
git add tests/README.md docs/batch2-device-acceptance.md 07_CHANGELOG.md tasks/current.md
git diff --cached --check
git commit -m "docs: record v77 photo integrity validation"
git status --short
```

Expected: the final status is clean. Do not push, merge, deploy, or create a tag without a separate user instruction.
