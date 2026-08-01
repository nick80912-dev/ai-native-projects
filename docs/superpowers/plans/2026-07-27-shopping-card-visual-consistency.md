# Shopping Card Visual Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shopping cards, partial-purchase actions, detail rows, and batch selection visually consistent and unambiguous on narrow mobile screens.

**Architecture:** Keep the existing single-file application and `allocations[]` domain model unchanged. Add small pure presentation/eligibility helpers beside the shopping model, let `renderShoppingItem()` and `renderShoppingSelectionToolbar()` consume those helpers, and cover behavior in the existing Node VM tests before changing UI code. Finish with in-app Browser QA, documentation, and one Service Worker bump from v64 to v65.

**Tech Stack:** Static HTML/CSS/ES5 JavaScript, Node.js `assert`/`vm` tests, in-app Browser automation, Git worktrees.

## Global Constraints

- Start from `dev` commit `90758d9` or later, with the approved spec at `docs/superpowers/specs/2026-07-27-shopping-card-visual-consistency-design.md`.
- Use `superpowers:using-git-worktrees` at execution time; create `codex/shopping-card-visual-consistency` under the ignored `.worktrees/` directory.
- Run all 45 `tests/*.test.js` files before implementation; stop and report if the baseline is not green.
- Follow strict TDD: add the assertion, run it and observe the expected failure, then write the minimum production change.
- Do not modify Shopping Item `allocations[]`, personal-state backup v7, Ledger 21 columns, Apps Script, Google Sheet, sync, settlement, or split persistence semantics.
- Visible proxy copy is `幫 [姓名] [姓名] +N 買`; only names use coral badges and visible `、` is omitted.
- Category badges use pale-gold background and dark-gold text; do not reuse the proxy or ledger-status colors.
- “部分買到” becomes “部分購買” everywhere visible.
- Show “部分購買” only for pending, fully `unlinked`, structured quantities whose allocation total is greater than 1.
- In multi-select mode, selection state is independent from `item.done`; row-level actions are hidden and batch actions live only in the bottom toolbar.
- Selected toolbar layout is one row: `已選 N` plus three equal buttons with no wrapping. Zero selections show only `請選擇項目`.
- Browser QA must cover 320×700, 375×812, and 390×844.
- Bump `okayama-trip-v64` to `okayama-trip-v65` exactly once, after UI Browser QA passes.
- Do not deploy a production or test site as part of this plan.

---

## Execution Prerequisite: Isolated Workspace and Baseline

**Files:**
- No product files modified.
- Verify: `tests/*.test.js`

**Interfaces:**
- Consumes: clean `dev` at the approved spec commit.
- Produces: isolated worktree on `codex/shopping-card-visual-consistency` with a green baseline.

- [ ] **Step 1: Verify worktree isolation prerequisites**

Run from the repository root:

```powershell
git status -sb
git check-ignore .worktrees
git worktree list --porcelain
```

Expected: `dev` is clean, `.worktrees` is ignored, and no worktree already uses `codex/shopping-card-visual-consistency`.

- [ ] **Step 2: Create the isolated worktree**

```powershell
git worktree add ".worktrees/shopping-card-visual-consistency" -b "codex/shopping-card-visual-consistency"
```

Expected: the worktree is created from current `dev`.

- [ ] **Step 3: Run the full baseline**

From `.worktrees/shopping-card-visual-consistency`:

```powershell
$testFiles = Get-ChildItem -Path tests -Filter *.test.js | Sort-Object Name
$testFailures = @()
foreach ($testFile in $testFiles) {
  $testOutput = & node $testFile.FullName 2>&1
  if ($LASTEXITCODE -ne 0) {
    $testFailures += $testFile.Name
    Write-Host ("FAIL " + $testFile.Name)
    $testOutput | Write-Host
  }
}
if ($testFailures.Count -gt 0) { throw ("Failed: " + ($testFailures -join ", ")) }
Write-Host ("PASS " + $testFiles.Count + "/" + $testFiles.Count)
node tools/check-doc-titles.js
git diff --check
```

Expected: `PASS 45/45`, document-title check passes, and `git diff --check` exits 0.

---

### Task 1: Traditional-Chinese Font Stack and Semantic Card Badges

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:42`
- Modify: `index.html:545`
- Modify: `index.html:2980-3001`
- Modify: `index.html:4042-4050`

**Interfaces:**
- Consumes: `shoppingTargetAllocations(item)`, `shoppingItemTargetSummary(item)`, `escapeHtml(value)`.
- Produces: `shoppingCardTargetModel(item) -> {prefix:string,names:string[],overflow:string,suffix:string,ariaLabel:string}` and card markup whose only `.shopping-target-badge` nodes are names.

- [ ] **Step 1: Add failing tests for the font stack and target model**

Add after the existing `shoppingItemTargetSummary()` assertions in `tests/shopping-list.test.js`:

```js
assert.deepStrictEqual(plain(mod.shoppingCardTargetModel({
  allocations:[
    allocation('阿寶',1),
    allocation('媽媽',1),
    allocation('爸爸',1)
  ]
})),{
  prefix:'幫',
  names:['阿寶','媽媽'],
  overflow:'+1',
  suffix:'買',
  ariaLabel:'幫阿寶、媽媽等共 3 位買'
},'卡片只把前兩位姓名交給 badge，句法與 +N 分開');
assert.deepStrictEqual(plain(mod.shoppingCardTargetModel({
  allocations:[allocation('阿寶',1)]
})),{
  prefix:'幫',
  names:['阿寶'],
  overflow:'',
  suffix:'買',
  ariaLabel:'幫阿寶買'
},'單一代購對象沒有多餘的分隔或 +N');
```

Add near the UI source assertions:

```js
assert(ui.includes('font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif'),
  '全站字型以繁中優先');
assert(!ui.includes('font-family:"Hiragino Sans","Noto Sans TC","PingFang TC"'),
  '日文字型不再排在繁中字型前');
assert(/\.shopping-category-badge\{[^}]*background:#fff7dc;[^}]*color:#8a6416/.test(ui),
  '類別使用淡金底與深金字');
```

- [ ] **Step 2: Run the focused test and observe RED**

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because `mod.shoppingCardTargetModel` is not a function.

- [ ] **Step 3: Implement the target presentation model**

Add beside `shoppingItemTargetSummary(item)` in `index.html`:

```js
function shoppingCardTargetModel(item){
  var targets=shoppingTargetAllocations(item).map(function(allocation){return allocation.target;});
  if(!targets.length)return {prefix:'',names:[],overflow:'',suffix:'',ariaLabel:''};
  var shown=targets.slice(0,2);
  return {
    prefix:'幫',
    names:shown,
    overflow:targets.length>2?'+'+(targets.length-2):'',
    suffix:'買',
    ariaLabel:targets.length>2
      ?'幫'+shown.join('、')+'等共 '+targets.length+' 位買'
      :'幫'+shown.join('、')+'買'
  };
}
```

Change the global font stack to:

```css
font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif;
```

Give `.shopping-category-badge` the approved pale-gold/dark-gold colors and align its radius, padding, font size, weight, and line height with `.shopping-target-badge`.

- [ ] **Step 4: Render only names as coral badges**

In `renderShoppingItem(item)`, replace the single whole-sentence target badge with markup derived from `shoppingCardTargetModel(item)`:

```js
var targetModel=shoppingCardTargetModel(item);
var targetMarkup=targetModel.names.length
  ?'<span class="shopping-target-summary" aria-label="'+escapeHtml(targetModel.ariaLabel)+'">'+
      '<span class="shopping-target-affix" aria-hidden="true">'+escapeHtml(targetModel.prefix)+'</span>'+
      targetModel.names.map(function(name){
        return '<span class="shopping-target-badge" aria-hidden="true">'+escapeHtml(name)+'</span>';
      }).join('')+
      (targetModel.overflow?'<span class="shopping-target-affix" aria-hidden="true">'+escapeHtml(targetModel.overflow)+'</span>':'')+
      '<span class="shopping-target-affix" aria-hidden="true">'+escapeHtml(targetModel.suffix)+'</span>'+
    '</span>'
  :'';
```

Use flex-wrap and a small gap on `.shopping-target-summary`; keep `.shopping-target-affix` at normal color and `font-weight:400`. Do not render a visible `、`.

- [ ] **Step 5: Add source-level markup assertions**

Add to `tests/shopping-list.test.js`:

```js
const shoppingItemRenderer=ui.slice(
  ui.indexOf('function renderShoppingItem(item)'),
  ui.indexOf('function handleShoppingItemBodyClick',ui.indexOf('function renderShoppingItem(item)'))
);
assert(shoppingItemRenderer.includes('shoppingCardTargetModel(item)'),'卡片使用結構化 target model');
assert(shoppingItemRenderer.includes('shopping-target-affix'),'幫／買／+N 使用普通文字片段');
assert(shoppingItemRenderer.includes('targetModel.names.map'),'姓名逐一輸出 badge');
assert(!shoppingItemRenderer.includes('escapeHtml(targetSummary)'),
  '不得再把整句摘要包成單一 badge');
```

- [ ] **Step 6: Run focused and adjacent tests**

```powershell
node tests/shopping-list.test.js
node tests/ledger-entry-settings.test.js
node tests/ledger-ui-polish.test.js
```

Expected: all three exit 0.

- [ ] **Step 7: Commit**

```powershell
git add -- index.html tests/shopping-list.test.js
git commit -m "feat: clarify shopping card badges"
```

---

### Task 2: Partial-Purchase Eligibility and Inline Card Action

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `index.html:2980-3025`
- Modify: `index.html:3139-3227`
- Modify: `index.html:4033-4064`

**Interfaces:**
- Consumes: `shoppingItemAllocations(item)`, `shoppingAllocationTotal(allocations)`, `isSafeShoppingQuantity(value)`, item-level link summary.
- Produces: `canOfferShoppingPartialPurchase(item,linkSummary) -> boolean`; pending-card inline action `部分購買`.

- [ ] **Step 1: Add failing eligibility tests**

Add after quantity-summary tests in `tests/shopping-list.test.js`:

```js
const unlinkedSummary={state:'unlinked'};
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',1)]
},unlinkedSummary),false,'自購 1 件沒有部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',2)]
},unlinkedSummary),true,'自購 2 件可部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('阿寶',1),allocation('媽媽',1),allocation('爸爸',1)]
},unlinkedSummary),true,'多人各 1 件但總需求大於 1 仍可部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',null)]
},unlinkedSummary),false,'legacy 數量不顯示入口');
['linked','partial','unverified'].forEach(function(state){
  assert.strictEqual(mod.canOfferShoppingPartialPurchase({
    done:false,allocations:[allocation('',2)]
  },{state}),false,state+' 不可部分購買');
});
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:true,allocations:[allocation('',2)]
},unlinkedSummary),false,'已買卡不顯示部分購買');
```

- [ ] **Step 2: Run the focused test and observe RED**

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because `mod.canOfferShoppingPartialPurchase` is not a function.

- [ ] **Step 3: Implement the pure eligibility helper**

Add beside `shoppingAllocationTotal(allocations)`:

```js
function canOfferShoppingPartialPurchase(item,linkSummary){
  if(!item||item.done||!linkSummary||linkSummary.state!=='unlinked')return false;
  var allocations=shoppingItemAllocations(item);
  if(!allocations.length||!allocations.every(function(allocation){
    return isSafeShoppingQuantity(allocation.quantity);
  }))return false;
  var total=shoppingAllocationTotal(allocations);
  return total!==null&&total>1;
}
```

- [ ] **Step 4: Move and rename the action**

In `renderShoppingItem(item)`:

- Render an outlined `.shopping-item-primary` button with text `部分購買` before `⋯` only when `canOfferShoppingPartialPurchase(item,linkSummary)` is true.
- Keep the existing done-card `記帳` button unchanged.
- Do not render either row-level button in selection mode; Task 4 will enforce the shared selection branch.

In `openShoppingItemActions()` remove the partial-purchase menu item.

Replace user-visible `部分買到` with `部分購買`, including:

```text
部分購買：{品名}
部分購買儲存失敗
```

Keep function names such as `startShoppingSplit()` and persistence method names unchanged.

- [ ] **Step 5: Add source contract assertions**

Replace the old partial-purchase source assertions in `tests/shopping-ledger-links.test.js` with:

```js
assert(shoppingSource.includes('function startShoppingSplit('),'保留部分購買流程');
assert(shoppingSource.includes('>部分購買</button>'),'卡片輸出核准文案');
assert(!shoppingSource.includes('>部分買到</button>'),'舊文案退場');
assert(!/openShoppingItemActions[\s\S]{0,1800}>部分購買<\/button>/.test(shoppingSource),
  '部分購買不在 ⋯ 選單');
assert(shoppingSource.includes('canOfferShoppingPartialPurchase(item,linkSummary)'),
  '顯示入口使用單一資格 helper');
```

- [ ] **Step 6: Run focused tests**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```powershell
git add -- index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: surface partial purchase on cards"
```

---

### Task 3: Compact Shopping Detail Rows and Footer

**Files:**
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html:546`
- Modify: `index.html:3041-3073`
- Modify: `index.html:4142-4177`

**Interfaces:**
- Consumes: detail-model allocation `{originalQuantity,currentQuantity}`, item `done`, shared `unit`.
- Produces: `shoppingDetailAllocationQuantityText(item,allocation,unit) -> string`; flex detail rows and responsive footer.

- [ ] **Step 1: Add failing copy tests**

Add beside `shoppingItemDetailModel()` tests in `tests/shopping-ledger-links.test.js`:

```js
assert.strictEqual(mod.shoppingDetailAllocationQuantityText(
  {done:true},
  {originalQuantity:3,currentQuantity:2},
  '包'
),'需求 3 包 · 已買 2 包','已買卡使用已買文案');
assert.strictEqual(mod.shoppingDetailAllocationQuantityText(
  {done:false},
  {originalQuantity:3,currentQuantity:1},
  '包'
),'需求 3 包 · 待買 1 包','待買卡使用待買文案');
```

- [ ] **Step 2: Run the focused test and observe RED**

```powershell
node tests/shopping-ledger-links.test.js
```

Expected: FAIL because `mod.shoppingDetailAllocationQuantityText` is not a function.

- [ ] **Step 3: Implement the copy helper**

Add beside `shoppingItemDetailModel()`:

```js
function shoppingDetailAllocationQuantityText(item,allocation,unit){
  var suffix=String(unit||'').trim();
  var amount=function(value){return String(value)+(suffix?' '+suffix:'');};
  return '需求 '+amount(allocation.originalQuantity)+' · '+(item&&item.done?'已買 ':'待買 ')+amount(allocation.currentQuantity);
}
```

- [ ] **Step 4: Update detail markup and layout**

In `renderShoppingItemDetail(item)`:

- Rename the heading to `代購對象與記帳紀錄`.
- Replace `原需求 … · 此卡 …` with `shoppingDetailAllocationQuantityText(item,allocation,model.unit)`.
- Keep `<strong>` name and the quantity `<span>` inside `.shopping-detail-allocation-main`, but change that container to `display:flex; align-items:baseline; flex-wrap:wrap`.
- Keep linked/unverified/unlinked status actions in the existing right column.
- Give the footer a shopping-specific class, for example `.shopping-detail-footer-actions`.
- When `hasUnlinked` is true, use two equal columns; otherwise one full-width column.
- Keep both buttons at least 44px high and prevent horizontal overflow.

- [ ] **Step 5: Add source and CSS assertions**

Add to `tests/shopping-list.test.js`:

```js
assert(ui.includes('代購對象與記帳紀錄'),'明細使用核准標題');
assert(!ui.includes('代購對象與帳本紀錄'),'舊標題退場');
assert(ui.includes('shoppingDetailAllocationQuantityText(item,allocation,model.unit)'),
  '明細逐人數量使用狀態感知 helper');
assert(/\.shopping-detail-allocation-main\{[^}]*display:flex;[^}]*flex-wrap:wrap/.test(ui),
  '姓名與需求優先同行並可在窄螢幕換行');
assert(/\.shopping-detail-footer-actions\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(ui),
  '兩顆明細動作等寬同行');
```

- [ ] **Step 6: Run focused tests**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```powershell
git add -- index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "feat: compact shopping allocation details"
```

---

### Task 4: Separate Batch Selection from Completion State

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `index.html:545`
- Modify: `index.html:2980-3012`
- Modify: `index.html:3131-3139`
- Modify: `index.html:4033-4064`

**Interfaces:**
- Consumes: `shoppingUiState.selectionMode`, `shoppingUiState.selected`, `shoppingUiState.tab`.
- Produces: `shoppingSelectionToolbarModel(tab,count) -> {label:string,actions:string[]}`; selection-only checkboxes for both tabs; prompt-only or selected single-row toolbar.

- [ ] **Step 1: Add failing toolbar-model tests**

Add to `tests/shopping-list.test.js`:

```js
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('pending',0)),{
  label:'請選擇項目',
  actions:[]
},'0 筆選取不輸出 disabled 動作');
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('pending',2)),{
  label:'已選 2',
  actions:['已買','記帳','刪除']
},'待買批次動作使用單行短文案');
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('done',2)),{
  label:'已選 2',
  actions:['移回待買','記帳','刪除']
},'已買批次動作與完成 checkbox 分離');
```

- [ ] **Step 2: Run the focused test and observe RED**

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because `mod.shoppingSelectionToolbarModel` is not a function.

- [ ] **Step 3: Implement the pure toolbar model**

Add in the shopping model/helper section beside `shoppingAllocationTotal()` so the existing Node VM test module can load it; `renderShoppingSelectionToolbar()` will consume the helper from the UI layer:

```js
function shoppingSelectionToolbarModel(tab,count){
  var selectedCount=Math.max(0,Math.floor(Number(count)||0));
  if(!selectedCount)return {label:'請選擇項目',actions:[]};
  return {
    label:'已選 '+selectedCount,
    actions:tab==='done'?['移回待買','記帳','刪除']:['已買','記帳','刪除']
  };
}
```

- [ ] **Step 4: Make selection mode the highest-priority checkbox state**

In `renderShoppingItem(item)`:

```js
var selection=shoppingUiState.selectionMode;
```

When `selection` is true:

- Render `aria-label="選取 {品名}"`.
- Bind `checked` only to `shoppingUiState.selected[item.id]`.
- Call only `toggleShoppingSelection(id,this.checked)`.
- Hide row-level `部分購買`, `記帳`, and `⋯`.

When `selection` is false, keep the existing pending/done completion checkbox behavior.

The existing `handleShoppingItemBodyClick()` selection branch remains the single card-body behavior in selection mode.

- [ ] **Step 5: Render the single-row toolbar**

Use `shoppingSelectionToolbarModel(shoppingUiState.tab,count)`.

For zero selections:

```html
<div class="shopping-selection-toolbar shopping-selection-toolbar-empty">
  <span>請選擇項目</span>
</div>
<div class="shopping-selection-spacer" aria-hidden="true"></div>
```

For selected items, render label plus `.shopping-selection-actions` in the same toolbar row. Map the three approved action labels to the existing handlers:

- pending `已買` → `completeSelectedShopping(false)`
- pending/done `記帳` → `completeSelectedShopping(true)`
- done `移回待買` → `moveSelectedShoppingBackToPending()`
- both `刪除` → `deleteSelectedShoppingItems()`

Remove the obsolete stacked class and disabled-button branch.

CSS requirements:

```css
.shopping-selection-toolbar{grid-template-columns:auto minmax(0,1fr)}
.shopping-selection-actions{grid-template-columns:repeat(3,minmax(0,1fr))}
.shopping-selection-toolbar button{white-space:nowrap;padding-left:5px;padding-right:5px}
.shopping-selection-spacer{height:calc(66px + env(safe-area-inset-bottom))}
```

Use a one-column grid for `.shopping-selection-toolbar-empty`. Preserve 44px tap targets.

- [ ] **Step 6: Replace obsolete selection assertions**

Replace the old `shopping-selection-toolbar-stacked` expectation in `tests/shopping-list.test.js` with:

```js
assert(!ui.includes('shopping-selection-toolbar-stacked'),'被覆蓋的兩列變體退場');
assert(ui.includes('shopping-selection-toolbar-empty'),'0 筆選取使用精簡提示');
assert(ui.includes('shopping-selection-spacer'),'固定工具列保留清單底部空間');
assert(/\.shopping-selection-toolbar button\{[^}]*white-space:nowrap/.test(ui),
  '批次按鈕禁止逐字換行');
```

Add renderer assertions:

```js
assert(itemRenderer.includes('var selection=shoppingUiState.selectionMode'),
  '已買與待買都使用 selection checkbox');
assert(itemRenderer.includes("selection?'':'"),'多選時隱藏列上動作');
assert(!itemRenderer.includes('shoppingUiState.selectionMode&&!item.done'),
  '已買項目不再被排除於 selection checkbox');
```

Update `tests/shopping-ledger-links.test.js` if it still expects row-level `記帳` during selection mode; the batch entry handler itself remains unchanged.

- [ ] **Step 7: Run focused tests**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
node tests/ledger-quick-entry.test.js
```

Expected: all three exit 0.

- [ ] **Step 8: Commit**

```powershell
git add -- index.html tests/shopping-list.test.js tests/shopping-ledger-links.test.js
git commit -m "fix: separate shopping batch selection"
```

---

### Task 5: Browser QA, Documentation, Service Worker v65, and Full Verification

**Files:**
- Modify: `CONTEXT.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tests/README.md`
- Modify: `sw.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `tests/ledger-221-ui.test.js`
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/ledger-member-visibility.test.js`
- Modify: `tests/ledger-mobile-hotfix.test.js`
- Modify: `tests/ledger-ui-polish.test.js`
- Modify: `tests/shopping-ledger-links.test.js`

**Interfaces:**
- Consumes: Tasks 1–4 UI behavior and test contracts.
- Produces: Browser evidence at three mobile widths, durable documentation, cache `okayama-trip-v65`, and a fully green branch.

- [ ] **Step 1: Run all focused shopping and ledger UI tests before Browser QA**

```powershell
node tests/shopping-list.test.js
node tests/shopping-ledger-links.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-entry-settings.test.js
node tests/ledger-ui-polish.test.js
```

Expected: all exit 0 while SW remains v64.

- [ ] **Step 2: Start a no-store local server in the worktree**

Use an available local static server on an unused localhost port and confirm `index.html`, `sw.js`, icons, and manifest return HTTP 200. Do not use a deployed site for this QA.

- [ ] **Step 3: Use the in-app Browser skill for functional QA**

Read `browser:control-in-app-browser` and use the persistent Node REPL browser session. At 390×844:

1. Open the shopping list and create:
   - own item quantity 1,
   - own item quantity 2,
   - three-target item quantity 1 per person,
   - long-name item with category and at least three targets.
2. Verify own quantity 1 has no `部分購買`.
3. Verify own quantity 2 and three-target item show `部分購買` before `⋯`.
4. Verify only names have coral backgrounds; `幫`, `買`, and `+1` are normal text with no visible `、`.
5. Verify category uses pale-gold/dark-gold badge.
6. Verify clicking `部分購買` opens the existing split form and visible copy says `部分購買`.
7. Open pending and done details and verify `需求 … · 待買 …` / `需求 … · 已買 …`, `代購對象與記帳紀錄`, and the two footer buttons on one row.
8. Enter multi-select on pending and done tabs:
   - selection checkboxes start empty,
   - card click toggles selection only,
   - done item does not move to pending from the selection checkbox,
   - row-level actions and `⋯` are hidden,
   - zero selections show only `請選擇項目`,
   - selected toolbar is one row with `已選 N` and three equal buttons.
9. Cancel multi-select and verify pending/done completion checkboxes return to their normal states.

- [ ] **Step 4: Verify narrow layouts and font consistency**

Repeat layout measurements at 375×812 and 320×700:

- `document.documentElement.scrollWidth === document.documentElement.clientWidth`
- shopping panel, cards, detail sheet, and batch toolbar have no horizontal overflow
- bottom spacer allows the final card to scroll fully above the fixed toolbar
- action controls are at least 40px high; detail/footer/batch primary controls are at least 44px
- computed `font-family` for shopping target choices, `稅與優惠券`, and `信用卡` begins with `PingFang TC` and is identical across those controls
- console error/warning log is empty

Reset the viewport and finalize the QA-only tab as the final browser actions, then stop the local server.

- [ ] **Step 5: Update durable documentation**

In `CONTEXT.md`, replace the old whole-sentence proxy badge and multi-select rules with:

- name-only coral badges without visible punctuation,
- pale-gold category badge,
- partial-purchase total-greater-than-one eligibility,
- independent completion and selection checkbox semantics,
- prompt-only/selected single-row batch toolbar,
- state-sensitive detail copy.

In `07_CHANGELOG.md`, add a top entry covering:

- Hiragino-first fallback root cause and the Traditional-Chinese stack,
- category/name badge changes,
- inline partial purchase and quantity-1 exclusion,
- detail copy/layout,
- screenshot-derived toolbar specificity bug,
- done-checkbox selection conflict,
- Browser measurements and test evidence.

Update `tests/README.md` to reflect the new shopping-list and shopping-ledger-links coverage.

- [ ] **Step 6: Add failing v65 expectations**

Change all exact v64 assertions in the listed test files to v65, including:

```js
assert.match(serviceWorker, /var CACHE_NAME = 'okayama-trip-v65';/,
  'service worker cache is exactly v65');
```

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
```

Expected: FAIL because `sw.js` still contains `okayama-trip-v64`.

- [ ] **Step 7: Bump the Service Worker exactly once**

In `sw.js`:

```js
var CACHE_NAME = 'okayama-trip-v65';
```

Do not change the caching strategy or shell file list.

- [ ] **Step 8: Run v65 tests and the full suite**

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js

$testFiles = Get-ChildItem -Path tests -Filter *.test.js | Sort-Object Name
$testFailures = @()
foreach ($testFile in $testFiles) {
  $testOutput = & node $testFile.FullName 2>&1
  if ($LASTEXITCODE -ne 0) {
    $testFailures += $testFile.Name
    Write-Host ("FAIL " + $testFile.Name)
    $testOutput | Write-Host
  }
}
if ($testFailures.Count -gt 0) { throw ("Failed: " + ($testFailures -join ", ")) }
Write-Host ("PASS " + $testFiles.Count + "/" + $testFiles.Count)
node tools/check-doc-titles.js
git diff --check
```

Expected: v65 tests pass, `PASS 45/45`, document-title check passes, and `git diff --check` exits 0.

- [ ] **Step 9: Inspect and commit the delivery**

```powershell
git status --short
git diff --stat
git diff --check
git add -- CONTEXT.md 07_CHANGELOG.md tests/README.md sw.js `
  tests/pwa-shell.test.js tests/ios-zoom-guard.test.js `
  tests/ledger-221-ui.test.js tests/ledger-225.test.js `
  tests/ledger-member-visibility.test.js tests/ledger-mobile-hotfix.test.js `
  tests/ledger-ui-polish.test.js tests/shopping-ledger-links.test.js
git commit -m "docs: record shopping card consistency delivery"
```

- [ ] **Step 10: Apply completion verification**

Read `superpowers:verification-before-completion`, rerun the full 45-test loop, `node tools/check-doc-titles.js`, and `git diff --check` from the committed branch. Confirm:

```powershell
git status -sb
git log --oneline -6
Select-String -Path sw.js -Pattern "okayama-trip-v65" -SimpleMatch
```

Expected: worktree clean, branch commits present, and SW v65 found. Stop before merge, push, PR, or deployment unless the user explicitly authorizes the next action.
