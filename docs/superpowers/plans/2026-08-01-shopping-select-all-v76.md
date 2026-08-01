# Shopping Select-All v76 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add current-tab select-all／deselect-all controls to Shopping multi-select, preserve the existing batch and photo flows, and ship the cached App shell as v76.

**Architecture:** Keep `shoppingUiState.selected` as the only mutable selection source. Add two pure helpers beside the existing Shopping models to derive the control label and next selection map from the current tab's item IDs; the DOM layer passes only currently visible items into those helpers and reuses all existing batch handlers. Browser coverage exercises the real inline App and existing Service Worker rather than adding a second implementation path.

**Tech Stack:** Vanilla HTML／CSS／JavaScript in `index.html`, Node.js `assert` + `vm` source tests, Playwright 1.62, IndexedDB photo regression, CacheStorage／Service Worker update tests.

## Global Constraints

- 「全選」只 affects the currently visible `pending` or `done` Shopping tab; it never selects across tabs.
- After every item is selected, the control text is `取消全選`; clearing one item restores `全選`.
- `取消全選` clears selection but stays in multi-select; `取消多選` exits multi-select and clears selection.
- Switching tabs, exiting multi-select, or completing a batch action clears selection; blocked, failed, or cancelled actions retain it.
- The top item count and two selection controls stay on one line at 320×700, 375×812, and 390×844; each control hit area is at least 44×44px.
- Do not add photo UI or change `photoId`, IndexedDB, navigation, Shopping schema, backup schema, global theme tokens, or existing batch preflight rules.
- `app-version.js` and `sw.js` advance from v75 to v76; the only `sw.js` change is `SW_VERSION`, producing cache `okayama-trip-v76`.
- `netlify.toml` diff must remain zero.

---

## File Map

- `index.html`: owns the Shopping selection model, current-tab control rendering, focus restoration, mobile CSS, and v76 release note.
- `tests/shopping-list.test.js`: executes pure Shopping helpers from the inline script and locks the selection-state contract plus rendered-source contract.
- `tests/browser/shopping-select-all.spec.js`: drives the real Shopping overlay, current-tab selection, batch controls, focus, and three mobile viewports.
- `tests/browser/shopping-photo.spec.js`: remains unchanged and is rerun as the v75 attachment regression gate.
- `app-version.js`: changes the App version literal to v76.
- `sw.js`: changes only `SW_VERSION` to v76.
- `tests/README.md`: documents the new browser test.
- `docs/batch2-device-acceptance.md`: adds the v76 device-acceptance delta.
- `07_CHANGELOG.md`: records the completed v76 behavior and protected surfaces after verification.
- `tasks/current.md`: moves the new P1 into the verified-current status after the full gate passes.

---

### Task 1: Model Current-Tab Selection State

**Files:**
- Modify: `tests/shopping-list.test.js` near the existing `shoppingSelectionToolbarModel` assertions
- Modify: `index.html` beside `shoppingSelectionToolbarModel(tab,count)`

**Interfaces:**
- Consumes: `items: Array<{id: string}>`, `selected: Record<string, boolean>`
- Produces: `shoppingSelectionControlModel(items,selected) -> {ids:string[],allSelected:boolean,actionLabel:'全選'|'取消全選'}`
- Produces: `nextShoppingPageSelection(items,selected) -> Record<string,true>`

- [ ] **Step 1: Write failing pure-model tests**

Add these assertions immediately after the existing selection-toolbar model assertions in `tests/shopping-list.test.js`:

```js
const visibleSelectionItems=[{id:'pending-1'},{id:'pending-2'}];
assert.deepStrictEqual(plain(mod.shoppingSelectionControlModel(
  visibleSelectionItems,
  {'pending-1':true,'done-1':true,'deleted-id':true}
)),{
  ids:['pending-1','pending-2'],
  allSelected:false,
  actionLabel:'全選'
},'selection controls derive state only from current-tab item IDs');

assert.deepStrictEqual(plain(mod.nextShoppingPageSelection(
  visibleSelectionItems,
  {'pending-1':true,'done-1':true,'deleted-id':true}
)),{
  'pending-1':true,
  'pending-2':true
},'select all rebuilds the map from current-tab IDs and removes stale IDs');

assert.deepStrictEqual(plain(mod.shoppingSelectionControlModel(
  visibleSelectionItems,
  {'pending-1':true,'pending-2':true,'done-1':true}
)),{
  ids:['pending-1','pending-2'],
  allSelected:true,
  actionLabel:'取消全選'
},'all visible items switch the control to deselect all');

assert.deepStrictEqual(plain(mod.nextShoppingPageSelection(
  visibleSelectionItems,
  {'pending-1':true,'pending-2':true,'done-1':true}
)),{},'deselect all keeps multi-select active but clears the map');

assert.deepStrictEqual(plain(mod.nextShoppingPageSelection([],{'stale':true})),{},
  'an empty current tab cannot retain stale selection');
```

- [ ] **Step 2: Run the focused Node test and confirm the red state**

Run:

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because `shoppingSelectionControlModel` is not defined.

- [ ] **Step 3: Implement the two pure helpers**

Add this code beside `shoppingSelectionToolbarModel` in `index.html`:

```js
function shoppingSelectionControlModel(items,selected){
  var ids=[],seen={};
  (items||[]).forEach(function(item){
    var id=String(item&&item.id||'');
    if(!id||seen[id])return;
    seen[id]=true;ids.push(id);
  });
  var allSelected=ids.length>0&&ids.every(function(id){return !!(selected&&selected[id]);});
  return {ids:ids,allSelected:allSelected,actionLabel:allSelected?'取消全選':'全選'};
}
function nextShoppingPageSelection(items,selected){
  var model=shoppingSelectionControlModel(items,selected),next={};
  if(model.allSelected)return next;
  model.ids.forEach(function(id){next[id]=true;});
  return next;
}
```

- [ ] **Step 4: Run the focused Node test and confirm green**

Run:

```powershell
node tests/shopping-list.test.js
```

Expected: PASS with the existing `shopping list tests passed` terminal line.

- [ ] **Step 5: Commit the model**

```powershell
git add index.html tests/shopping-list.test.js
git diff --cached --check
git commit -m "feat(shopping): model current-tab select all"
```

---

### Task 2: Render Accessible Select-All Controls and Exercise the Real UI

**Files:**
- Create: `tests/browser/shopping-select-all.spec.js`
- Modify: `index.html:599` Shopping list tool CSS
- Modify: `index.html:3571-3583` Shopping overlay controls and handlers
- Modify: `tests/shopping-list.test.js` rendered-source assertions

**Interfaces:**
- Consumes: `shoppingSelectionControlModel(items,shoppingUiState.selected)` and `nextShoppingPageSelection(items,shoppingUiState.selected)` from Task 1
- Produces: `shoppingCurrentTabItems() -> ShoppingItem[]`
- Produces: `renderShoppingListSelectionControls(items) -> string`
- Produces: `toggleShoppingPageSelection() -> void`
- Produces DOM IDs: `shoppingSelectAllButton`, `shoppingCancelSelectionButton`

- [ ] **Step 1: Add rendered-source contract assertions**

Add these assertions near the existing multi-select UI assertions in `tests/shopping-list.test.js`:

```js
assert(ui.includes('function renderShoppingListSelectionControls(items)'),
  'the list header owns a dedicated selection control renderer');
assert(ui.includes('id="shoppingSelectAllButton"'),
  'multi-select exposes one stable focus target for select all and deselect all');
assert(ui.includes('id="shoppingCancelSelectionButton"'),
  'cancel multi-select remains a separate action');
assert(ui.includes('toggleShoppingPageSelection()'),
  'select all uses the current-tab selection handler');
assert(/\.shopping-list-tool-actions\{[^}]*display:flex[^}]*white-space:nowrap/.test(ui),
  'the two controls share a non-wrapping action group');
assert(/\.shopping-list-tools button\{[^}]*min-height:44px/.test(ui),
  'top Shopping controls expose a 44px touch target');
```

- [ ] **Step 2: Create the failing Playwright behavior test**

Create `tests/browser/shopping-select-all.spec.js` with this setup and primary interaction test:

```js
const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const WIDTHS=[{width:320,height:700},{width:375,height:812},{width:390,height:844}];
const ITEMS=[
  {id:'pending-1',name:'白桃',category:'必買',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'p1-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T01:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''},
  {id:'pending-2',name:'藥妝',category:'必買',unit:'個',legacyQtyText:'',allocations:[{allocationId:'p2-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T02:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''},
  {id:'done-1',name:'點心',category:'伴手禮',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'d1-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:true,createdAt:'2026-08-01T03:00:00.000Z',completedAt:'2026-08-01T04:00:00.000Z',splitGroupId:'',photoId:''},
  {id:'done-2',name:'茶葉',category:'伴手禮',unit:'包',legacyQtyText:'',allocations:[{allocationId:'d2-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:true,createdAt:'2026-08-01T04:00:00.000Z',completedAt:'2026-08-01T05:00:00.000Z',splitGroupId:'',photoId:''}
];

async function openSeededShopping(page){
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(items=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_shopping_list',JSON.stringify(items));
    openShoppingList();
  },ITEMS);
}

test('全選只作用於目前分頁並可取消全選或退出多選',async({page})=>{
  const pageErrors=collectPageErrors(page),consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await openSeededShopping(page);

  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await expect(page.getByRole('button',{name:'取消全選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).sort())).toEqual(['pending-1','pending-2']);
  await expect(page.locator('.shopping-selection-toolbar')).toContainText('已選 2');

  await page.locator('[data-shopping-item-id="pending-1"] input[type=checkbox]').uncheck();
  await expect(page.getByRole('button',{name:'全選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).filter(id=>shoppingUiState.selected[id]))).toEqual(['pending-2']);

  await page.getByRole('button',{name:'全選',exact:true}).click();
  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    const layout=await page.evaluate(()=>{
      const root=document.documentElement;
      const panel=document.querySelector('#shoppingListOverlay .shopping-list-panel');
      panel.scrollTop=panel.scrollHeight;
      const select=document.getElementById('shoppingSelectAllButton').getBoundingClientRect();
      const cancel=document.getElementById('shoppingCancelSelectionButton').getBoundingClientRect();
      const tools=document.querySelector('.shopping-list-tools').getBoundingClientRect();
      const cards=panel.querySelectorAll('.shopping-item');
      const lastCard=cards[cards.length-1].getBoundingClientRect();
      const batch=document.querySelector('.shopping-selection-toolbar').getBoundingClientRect();
      return {
        scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,
        panelScrollWidth:panel.scrollWidth,panelClientWidth:panel.clientWidth,
        selectTop:select.top,cancelTop:cancel.top,selectHeight:select.height,cancelHeight:cancel.height,
        controlsInside:select.left>=tools.left&&cancel.right<=tools.right,
        cardInside:lastCard.left>=panel.getBoundingClientRect().left&&lastCard.right<=panel.getBoundingClientRect().right,
        lastCardClear:lastCard.bottom<=batch.top
      };
    });
    expect(layout.scrollWidth-layout.clientWidth,`overflow @${viewport.width}`).toBe(0);
    expect(layout.panelScrollWidth-layout.panelClientWidth,`panel overflow @${viewport.width}`).toBe(0);
    expect(Math.abs(layout.selectTop-layout.cancelTop),`control row @${viewport.width}`).toBeLessThan(1);
    expect(layout.selectHeight).toBeGreaterThanOrEqual(44);
    expect(layout.cancelHeight).toBeGreaterThanOrEqual(44);
    expect(layout.controlsInside).toBe(true);
    expect(layout.cardInside,`card bounds @${viewport.width}`).toBe(true);
    expect(layout.lastCardClear,`last card clear of batch toolbar @${viewport.width}`).toBe(true);
  }

  await page.getByRole('button',{name:'取消全選',exact:true}).click();
  await expect(page.locator('.shopping-selection-toolbar')).toContainText('請選擇項目');
  await expect(page.locator('#shoppingSelectAllButton')).toBeFocused();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:true,selected:{}});

  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.getByRole('button',{name:'取消多選',exact:true}).click();
  await expect(page.getByRole('button',{name:'多選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:false,selected:{}});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
```

- [ ] **Step 3: Add the tab-reset and batch-action browser tests**

Append these tests to the same file:

```js
test('切換分頁清空選取且已買分頁只全選已買項目',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-list-segment').getByRole('button',{name:'已買',exact:true}).click();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:false,selected:{}});
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).sort())).toEqual(['done-1','done-2']);
});

test('全選沿用既有完成、移回待買與刪除批次處理',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'已買',exact:true}).click();
  expect(await page.evaluate(()=>({
    mode:shoppingUiState.selectionMode,
    selected:shoppingUiState.selected,
    pending:shoppingListStore.all().filter(item=>!item.done).length
  }))).toEqual({mode:false,selected:{},pending:0});

  await page.locator('.shopping-list-segment').getByRole('button',{name:'已買',exact:true}).click();
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'移回待買',exact:true}).click();
  expect(await page.evaluate(()=>shoppingListStore.all().every(item=>!item.done))).toBe(true);

  await page.locator('.shopping-list-segment').getByRole('button',{name:'待買',exact:true}).click();
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'刪除',exact:true}).click();
  expect(await page.evaluate(()=>shoppingListStore.all().length)).toBe(0);
});

test('全選後建立消費沿用既有多品項記帳入口',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'記帳',exact:true}).click();
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  expect(await page.evaluate(()=>shoppingUiState.selectionMode)).toBe(false);
});
```

- [ ] **Step 4: Run both focused suites and confirm the red state**

Run:

```powershell
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-select-all.spec.js
```

Expected: Node fails its rendered-source assertions and Playwright cannot find `全選`.

- [ ] **Step 5: Implement the control group and 44px mobile CSS**

Replace the Shopping list tool CSS with the following declarations while leaving neighboring rules unchanged:

```css
.shopping-list-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;min-width:0}
.shopping-list-tools strong{font-size:13px;color:var(--ink-soft);white-space:nowrap}
.shopping-list-tool-actions{display:flex;align-items:center;justify-content:flex-end;gap:0;min-width:0;white-space:nowrap}
.shopping-list-tools button{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--sea);padding:4px 0 4px 10px;font:inherit;font-size:12px;font-weight:900;white-space:nowrap}
```

Add these UI helpers before `renderShoppingListOverlay()` and have the overlay call them:

```js
function shoppingCurrentTabItems(){
  return shoppingListStore.all().filter(function(item){
    return shoppingUiState.tab==='done'?item.done:!item.done;
  });
}
function renderShoppingListSelectionControls(items){
  if(!items.length)return '';
  if(!shoppingUiState.selectionMode){
    return '<div class="shopping-list-tool-actions"><button type="button" onclick="toggleShoppingSelectionMode()">多選</button></div>';
  }
  var model=shoppingSelectionControlModel(items,shoppingUiState.selected);
  return '<div class="shopping-list-tool-actions" role="group" aria-label="多選控制">'+
    '<button type="button" id="shoppingSelectAllButton" onclick="toggleShoppingPageSelection()">'+model.actionLabel+'</button>'+
    '<button type="button" id="shoppingCancelSelectionButton" onclick="toggleShoppingSelectionMode()">取消多選</button></div>';
}
```

Change the overlay's item source and tool row to:

```js
var items=shoppingCurrentTabItems();
```

```js
'<div class="shopping-list-tools"><strong>'+items.length+' 項</strong>'+renderShoppingListSelectionControls(items)+'</div>'+
```

Add the handler and normalize manual unchecking:

```js
function toggleShoppingPageSelection(){
  shoppingUiState.selected=nextShoppingPageSelection(shoppingCurrentTabItems(),shoppingUiState.selected);
  renderShoppingListOverlay();
  requestAnimationFrame(function(){
    var button=document.getElementById('shoppingSelectAllButton');
    if(button)button.focus();
  });
}
function toggleShoppingSelectionMode(){shoppingUiState.selectionMode=!shoppingUiState.selectionMode;shoppingUiState.selected={};renderShoppingListOverlay();}
function toggleShoppingSelection(id,selected){
  if(selected)shoppingUiState.selected[id]=true;
  else delete shoppingUiState.selected[id];
  renderShoppingListOverlay();
}
```

- [ ] **Step 6: Run focused Node and Playwright tests**

Run:

```powershell
node tests/shopping-list.test.js
npx playwright test tests/browser/shopping-select-all.spec.js
npx playwright test tests/browser/shopping-photo.spec.js
```

Expected: all three commands PASS; the photo suite proves the new header controls did not regress attachments or the viewer.

- [ ] **Step 7: Commit the visible P1 behavior**

```powershell
git add index.html tests/shopping-list.test.js tests/browser/shopping-select-all.spec.js
git diff --cached --check
git commit -m "feat(shopping): add current-tab select all"
```

---

### Task 3: Advance the Cached App Shell to v76

**Files:**
- Modify: `tests/shopping-list.test.js` release-note contract
- Modify: `index.html:7865` `APP_RELEASE_NOTES`
- Modify: `app-version.js:1`
- Modify: `sw.js:27`

**Interfaces:**
- Consumes: `tools/check-app-version.js` dual-version and latest-release-note contract
- Produces: `APP_VERSION='v76'`, `SW_VERSION='v76'`, cache name `okayama-trip-v76`
- Produces: latest release-note title `採買多選更快速`

- [ ] **Step 1: Write the failing v76 release-note assertion**

Add this assertion beside other release-note source assertions in `tests/shopping-list.test.js`:

```js
assert(ui.includes("{version:'v76',date:'2026-08-01',title:'採買多選更快速'"),
  'v76 release notes lead with the approved Shopping select-all improvement');
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because the latest release note is still v75.

- [ ] **Step 3: Add the v76 release note and update both version literals**

Prepend this exact item to `APP_RELEASE_NOTES`:

```js
{version:'v76',date:'2026-08-01',title:'採買多選更快速',items:['多選模式可一次選取或取消目前分頁的全部採買項目','切換分頁與完成批次操作後會清除選取，避免誤用舊選取']},
```

Change `app-version.js` to:

```js
var APP_VERSION='v76';
```

Change only the following line in `sw.js`:

```js
var SW_VERSION='v76';
```

- [ ] **Step 4: Verify version invariants and the exact Service Worker diff**

Run:

```powershell
node tests/shopping-list.test.js
node tools/check-app-version.js
git diff fa5eace -- sw.js
git diff fa5eace -- netlify.toml
npx playwright test tests/browser/sw-update-cache.spec.js
```

Expected:

- Shopping Node test passes.
- Version checker reports `v76`.
- `sw.js` diff contains only `var SW_VERSION='v75';` → `var SW_VERSION='v76';`.
- `netlify.toml` produces no output.
- SW browser test upgrades v75→v76, leaves only `okayama-trip-v76`, and reloads offline.

- [ ] **Step 5: Commit the version change**

```powershell
git add index.html tests/shopping-list.test.js app-version.js sw.js
git diff --cached --check
git commit -m "chore: bump app shell to v76"
```

---

### Task 4: Document and Run the Complete P1 Gate

**Files:**
- Modify: `tests/README.md`
- Modify: `docs/batch2-device-acceptance.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: all completed code and tests from Tasks 1–3
- Produces: a v76 acceptance checklist, user-facing change record, and current-task handoff that does not authorize `main`, deployment, or a production tag

- [ ] **Step 1: Document the new browser suite**

Add this bullet to the Playwright section of `tests/README.md`:

```markdown
- `browser/shopping-select-all.spec.js`：驗證採買多選只全選目前待買／已買分頁、全選／取消全選文字與焦點、切頁清理、既有批次操作，以及 320／375／390px 單列觸控控制。執行：`npx playwright test tests/browser/shopping-select-all.spec.js`。
```

- [ ] **Step 2: Add the v76 device-acceptance delta**

Append this section to `docs/batch2-device-acceptance.md`:

```markdown
# v76 delta 驗收清單（採買多選全選）

> 適用 runtime：SW／App **v76**。本節只新增 v76 差異；照片、導航與正式發布仍沿用各自既有 gate。

| ID | 驗收項目 | 自動驗證 | Bar 真機 |
|---|---|---|---|
| X1-a | 待買與已買的「全選」只選目前分頁 | Playwright／Node | ☐ |
| X1-b | 全選後顯示「取消全選」；取消其中一項恢復「全選」 | Playwright／Node | ☐ |
| X1-c | 「取消全選」保留多選模式；「取消多選」退出並清空 | Playwright | ☐ |
| X1-d | 切換分頁、批次成功後清空；阻擋、失敗或取消確認時保留 | Playwright／既有 Node preflight | ☐ |
| X2-a | 320×700、375×812、390×844 overflow 0，兩顆控制同列且各至少 44×44px | Playwright | ☐ |
| X2-b | 身分列、採買卡、底部批次工具列不換行、不溢位、不遮擋 | Playwright | ☐ |
| X3-a | v75 照片附件與檢視器完整回歸 | Playwright | ☐ |
| X3-b | v75→v76 後只剩 `okayama-trip-v76`，離線重開正常 | Playwright | ☐ |
| X3-c | console error 0、pageerror 0 | Playwright | ☐ |
```

- [ ] **Step 3: Run the complete local validation gate**

Run from the repository root in PowerShell:

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

Expected: every command exits 0; Playwright includes the new select-all spec, the existing photo spec, and the v75→v76 Service Worker update／offline restart spec.

- [ ] **Step 4: Record the verified release and handoff**

Prepend a v76 entry to `07_CHANGELOG.md` with these exact facts after Step 3 succeeds:

```markdown
## 2026-08-01｜採買多選全選（SW v76）

- **目前分頁全選**：待買／已買進入多選後，可全選或取消目前分頁全部項目；不跨分頁保留選取。
- **狀態與行動版**：手動取消一項會恢復「全選」，取消全選保留多選模式；頂部控制在 320／375／390px 同列且點擊區至少 44×44px。
- **回歸保護**：既有已買、記帳、移回待買、刪除與 v75 照片附件流程通過完整 Node／Playwright 驗證。
- **PWA**：`app-version.js` 與 `sw.js` 同步升至 v76；`sw.js` 除版本字串外未動，`netlify.toml` diff 0。
```

Add this current-state line near the top of `tasks/current.md`:

```markdown
- **新 P1「採買流程完整化」已完成 v76 本機實作與完整驗證**（2026-08-01）：多選可全選／取消全選目前待買或已買分頁，既有批次操作與 v75 照片附件回歸通過；下一步只等待 Bar 真機驗收，不得自行動 `main`、部署或建立 production tag。
```

- [ ] **Step 5: Recheck documentation, version protection, and protected diffs**

Run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
git diff fa5eace -- sw.js
git diff fa5eace -- netlify.toml
git status --short
```

Expected:

- Both checkers pass.
- `git diff --check` is empty.
- `sw.js` still has the single v75→v76 version-line change.
- `netlify.toml` output is empty.
- `git status --short` lists only the four documentation files from this task.

- [ ] **Step 6: Commit the verified documentation**

```powershell
git add tests/README.md docs/batch2-device-acceptance.md 07_CHANGELOG.md tasks/current.md
git diff --cached --check
git commit -m "docs: record v76 select-all validation"
git status --short
```

Expected: the commit succeeds and final `git status --short` is empty. Do not push, merge, deploy, or create a tag without a separate user instruction.
