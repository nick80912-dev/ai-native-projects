# Shopping Ledger Status and Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Shopping ledger progress into the existing detail `狀態` row and make its footer action truthfully reflect linked, unverified and unlinked allocation states.

**Architecture:** Keep `buy-to-ledger.js` unchanged as the three-state authority. Add two presentation-only helpers beside `shoppingItemDetailModel()` in `index.html`; the model exposes one combined status string and a small action model, while the renderer only translates those values into existing detail markup.

**Tech Stack:** ES5-compatible browser JavaScript, Node `assert` + `vm`, Playwright, existing Shopping detail renderer and CSS.

## Global Constraints

- Shopping items remain personal, local records; progress counts allocations that would become Ledger item records.
- Progress copy uses `筆`, never `位` or `記帳未完成對象`.
- The existing `狀態` row orders `待買／已買` before the ledger summary and the standalone `記帳進度` row is removed.
- `buy-to-ledger.js`, Shopping store, photo repository, Ledger records, schema, localStorage and backup formats remain unchanged.
- A mixed unverified/unlinked item exposes a native disabled `等待狀態確認` button and explanatory text; it never exposes a callable ledger-entry action.
- Keep `app-version.js` and `sw.js` at v98.
- Do not merge `main`, deploy Netlify or create a production tag; push only `dev` after complete verification.

---

### Task 1: Lock the Detail Status and Action Contract

**Files:**
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `tests/browser/buy-to-ledger.spec.js`

**Interfaces:**
- Consumes: real `shoppingItemDetailModel(item, allItems, context)` and `renderShoppingItemDetail(item)` from `index.html`, plus `buyToLedgerDomain.inspectItem()` through the existing VM sandbox.
- Produces: literal regression coverage for the combined status row, action matrix, native disabled waiting state and absence of the old progress/action copy.

- [ ] **Step 1: Add Node model and renderer matrix fixtures**

In `tests/shopping-ledger-links.test.js`, build literal single and three-allocation fixtures from the existing `link()`, `expense()` and `ctx()` helpers. Add a renderer harness that replaces only browser/storage boundaries:

```js
function renderShoppingDetail(itemValue,context){
  mod.shoppingListStore={all(){return [itemValue];}};
  mod.shoppingLedgerContext=function(){return context;};
  mod.shoppingStopById=function(){return null;};
  mod.shoppingStopStateFor=function(){return {state:'none'};};
  mod.shoppingItemLocationLine=function(){return '';};
  mod.shoppingPhotoStatus=function(){return 'none';};
  return mod.renderShoppingItemDetail(itemValue);
}
```

Assert these hand-derived values:

```js
assert.strictEqual(singleUnlinked.statusText,'已買 · 未記帳');
assert.strictEqual(singleUnlinked.ledgerAction.label,'記帳');
assert.strictEqual(partial.statusText,'已買 · 已記帳 1／3 筆');
assert.strictEqual(partial.ledgerAction.label,'繼續記帳（剩 2 筆）');
assert.strictEqual(mixed.statusText,'已買 · 已記帳 1 · 待確認 1 · 未記帳 1');
assert.deepStrictEqual(plain(mixed.ledgerAction),{
  kind:'waiting',label:'等待狀態確認',disabled:true,
  note:'有 1 筆仍在確認同步狀態，完成後才能繼續，避免重複記帳。'
});
```

Render the mixed fixture and assert:

```js
assert(!mixedHtml.includes('<dt>記帳進度</dt>'));
assert(mixedHtml.includes('<dt>狀態</dt><dd>已買 · 已記帳 1 · 待確認 1 · 未記帳 1</dd>'));
assert(mixedHtml.includes('disabled>等待狀態確認</button>'));
assert(!mixedHtml.includes('onclick="openShoppingIncompleteLedgerEntry'));
assert(!mixedHtml.includes('記帳未完成對象'));
```

- [ ] **Step 2: Add browser characterization for the contradictory mixed state**

In `tests/browser/buy-to-ledger.spec.js`, seed one completed item with three allocations:

1. a personal active link whose expense exists in `trip_personal_ledger`;
2. a shared active link whose record is absent, producing `unverified`;
3. no active link, producing `unlinked`.

Open `openShoppingItemDetail(id)` and assert:

```js
await expect(page.locator('#shoppingItemDetail .ledger-detail-row').filter({hasText:'狀態'}).locator('dd'))
  .toHaveText('已買 · 已記帳 1 · 待確認 1 · 未記帳 1');
await expect(page.getByRole('button',{name:'等待狀態確認'})).toBeDisabled();
await expect(page.getByText('有 1 筆仍在確認同步狀態，完成後才能繼續，避免重複記帳。')).toBeVisible();
await expect(page.getByText('記帳進度',{exact:true})).toHaveCount(0);
await expect(page.getByRole('button',{name:'記帳未完成對象'})).toHaveCount(0);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
node tests/shopping-ledger-links.test.js
npx playwright test tests/browser/buy-to-ledger.spec.js -g "mixed unverified"
```

Expected: Node fails because `statusText` still contains only the purchase state or `ledgerAction` is absent; Playwright fails because the old standalone `記帳進度` row and callable `記帳未完成對象` button remain.

---

### Task 2: Implement the Presentation-Only Status and Action Model

**Files:**
- Modify: `index.html` Shopping detail CSS, `renderShoppingItemDetail()` and detail-model helpers near `shoppingItemDetailModel()`

**Interfaces:**
- Consumes: `summary = buyToLedgerDomain.inspectItem(item, context)` with `{linked,total,unverified}`; derives `unlinked = total - linked - unverified` without changing the domain result.
- Produces: `shoppingDetailLedgerSummary(summary): string`, `shoppingDetailLedgerAction(summary): {kind,label,disabled,note}`, and model fields `statusText` plus `ledgerAction`.

- [ ] **Step 1: Add the minimal summary helper**

Add beside `shoppingItemDetailModel()`:

```js
function shoppingDetailLedgerSummary(summary){
  var source=summary||{},total=Math.max(0,Number(source.total)||0);
  var linked=Math.max(0,Number(source.linked)||0);
  var unverified=Math.max(0,Number(source.unverified)||0);
  var unlinked=Math.max(0,total-linked-unverified);
  if(total<=1)return unverified?'待確認':linked?'已記帳':'未記帳';
  if(unverified){
    var parts=[];
    if(linked)parts.push('已記帳 '+linked);
    parts.push('待確認 '+unverified);
    if(unlinked)parts.push('未記帳 '+unlinked);
    return parts.join(' · ');
  }
  return '已記帳 '+linked+'／'+total+' 筆';
}
```

- [ ] **Step 2: Add the minimal action helper**

```js
function shoppingDetailLedgerAction(summary){
  var source=summary||{},total=Math.max(0,Number(source.total)||0);
  var linked=Math.max(0,Number(source.linked)||0);
  var unverified=Math.max(0,Number(source.unverified)||0);
  var unlinked=Math.max(0,total-linked-unverified);
  if(unverified)return {
    kind:'waiting',label:'等待狀態確認',disabled:true,
    note:'有 '+unverified+' 筆仍在確認同步狀態，完成後才能繼續，避免重複記帳。'
  };
  if(!unlinked)return {kind:'none',label:'',disabled:false,note:''};
  return {
    kind:'entry',label:linked?'繼續記帳（剩 '+unlinked+' 筆）':'記帳',
    disabled:false,note:''
  };
}
```

Set the model fields to:

```js
statusText:(item.done?'已買':'待買')+' · '+shoppingDetailLedgerSummary(summary),
ledgerAction:shoppingDetailLedgerAction(summary),
```

Remove the obsolete `linkText` field.

- [ ] **Step 3: Render one status row and truthful action markup**

Change the detail rows to use:

```js
['狀態',model.statusText],
```

and remove `['記帳進度',model.linkText]`.

Build the secondary action only from `model.ledgerAction`:

```js
var ledgerAction=model.ledgerAction||{kind:'none',label:'',disabled:false,note:''};
var ledgerActionMarkup=ledgerAction.kind==='entry'
  ?'<button type="button" class="btn" onclick="openShoppingIncompleteLedgerEntry(\''+jsHtmlAttrString(item.id)+'\')">'+escapeHtml(ledgerAction.label)+'</button>'
  :ledgerAction.kind==='waiting'
    ?'<button type="button" class="btn" disabled>'+escapeHtml(ledgerAction.label)+'</button>'
    :'';
var ledgerWaitNote=ledgerAction.note
  ?'<p class="shopping-detail-ledger-wait-note" role="status">'+escapeHtml(ledgerAction.note)+'</p>'
  :'';
```

Use the single-column footer class only when `ledgerActionMarkup` is empty. Place `ledgerWaitNote` immediately before the footer actions.

- [ ] **Step 4: Add adjacent waiting-note and disabled-button styles**

Extend the existing Shopping detail CSS with:

```css
.shopping-detail-ledger-wait-note{margin:12px 0 0;padding:9px 10px;border-radius:8px;background:#fdf0e2;color:#8b531a;font-size:11px;line-height:1.5}
.shopping-detail-footer-actions .btn:disabled{opacity:.55}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node tests/shopping-ledger-links.test.js
node tests/shopping-list.test.js
node tests/buy-to-ledger-characterization.test.js
node tests/buy-to-ledger-module.test.js
npx playwright test tests/browser/buy-to-ledger.spec.js
```

Expected: all commands exit 0; the browser suite still proves save/link/return behavior in addition to the new mixed-state detail contract.

---

### Task 3: Synchronize Contracts, Verify, Commit, and Push

**Files:**
- Modify: `CONTEXT.md`
- Modify: `tests/README.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `tasks/done.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: the implemented detail status/action behavior and final test counts.
- Produces: current terminology, delivery history, handoff guidance, validation baseline and a fast-forward `origin/dev` push.

- [ ] **Step 1: Update the Shopping contract documents**

Replace the old `CONTEXT.md` Shopping-detail footer wording with:

- ledger progress counts use `筆`, not people;
- the existing `狀態` row combines purchase state and ledger summary;
- mixed unverified/unlinked state shows a disabled waiting action and the reason;
- the allocation section still exposes per-allocation inspection and linked-record recovery.

Update the `tests/README.md` Shopping ledger entry to name the new Node status/action matrix and browser mixed-state regression.

- [ ] **Step 2: Update current and historical delivery records**

Add a top `07_CHANGELOG.md` entry and one `tasks/done.md` record for this ad-hoc backlog #3 UI refinement. Update `tasks/current.md`, `08_AI_HANDOVER.md` and `.ai-manifest.json` to describe the new Shopping detail contract and actual automated-validation counts. State explicitly that v98, schemas, stores, domain behavior, merge/deploy/tag status remain unchanged.

- [ ] **Step 3: Run the complete verification gate**

Run every top-level Node test file fail-fast:

```powershell
$testFiles = Get-ChildItem -LiteralPath tests -Filter '*.test.js' -File | Sort-Object Name
foreach($testFile in $testFiles){ node $testFile.FullName; if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE } }
Write-Output ("NODE_TEST_FILES="+$testFiles.Count)
```

Then run:

```powershell
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
git diff --check
```

Parse `.ai-manifest.json`, `manifest.webmanifest` and `runtime-assets.json` with `ConvertFrom-Json`. Expected: every command exits 0 and App/SW remain v98.

- [ ] **Step 4: Review the exact diff and commit implementation**

Check `git diff --stat`, `git diff --check`, old-copy searches and the Tier 2 boundary. Commit only the approved files:

```powershell
git add index.html tests/shopping-ledger-links.test.js tests/browser/buy-to-ledger.spec.js CONTEXT.md tests/README.md 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tasks/done.md .ai-manifest.json
git commit -m "fix(shopping): align ledger status and actions"
```

- [ ] **Step 5: Re-run verification on committed HEAD**

Re-run the complete Node and Playwright suites plus all governance checks after the commit. Do not rely on pre-commit evidence.

- [ ] **Step 6: Fetch and push `dev` safely**

Run `git fetch origin --prune`. Require a clean worktree and `git merge-base HEAD origin/dev` equal to `git rev-parse origin/dev`; then push without force:

```powershell
git push origin dev
git rev-parse HEAD
git rev-parse origin/dev
```

The two SHAs must match. Do not merge `main`, deploy Netlify or create a tag.
