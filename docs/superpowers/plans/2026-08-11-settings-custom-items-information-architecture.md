# Settings Custom Items Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-page, three-manager custom-items list with a three-row summary hub and one focused editor page per option kind, while preserving every existing option CRUD and storage rule.

**Architecture:** Keep `options` as the stable root/legacy target, add three fixed Settings page IDs, and route all editor rendering through a small page-definition seam. Reuse `renderLedgerOptionManager()` and the current stores; option actions rerender the editor page for their kind instead of returning to the hub.

**Tech Stack:** Single-file HTML/CSS/JavaScript, Node.js `assert` source/behavior characterization tests, Playwright browser tests, existing Settings router and theme tokens.

> **Execution refinement (2026-08-11):** Task 1 executes the real hub/editor renderers, router, and mutation navigation in a VM sandbox rather than treating source substrings as proof. This follows `writing-good-tests.md`; the production interfaces and acceptance requirements below are unchanged.

## Global Constraints

- `options` remains the Settings-root and `ledgerOptionSettingsSection` legacy destination.
- The hub order is exactly `記帳類別` → `支付方式` → `採買單位`, with live counts from the existing stores.
- Editor IDs are exactly `options-category`, `options-pay-method`, and `options-shopping-unit`.
- Add, remove, move, validation, persistence, defaults, backup, and existing-record semantics do not change.
- `個` remains protected by the existing guard/toast and gains only a visible `預設` label.
- An editor back action returns to `options`; the hub back action returns to `root`.
- No schema, localStorage key, default option array, API, Service Worker strategy, App version, SW version, or release state changes.
- The UI uses existing theme tokens and inline SVG; no dependency or external asset is added.
- Widths 320px, 375px, and 390px must have no horizontal overflow or control overlap.

---

### Task 1: Add the two-level Settings route and keep option actions in context

**Files:**
- Modify: `tests/ledger-entry-settings.test.js:120-210`
- Modify: `index.html:8637-8656`
- Modify: `index.html:8694-8718`
- Modify: `index.html:8792-8794`
- Modify: `index.html:8929-8937`

**Interfaces:**
- Consumes: `ledgerOptionStoreForKind(kind)`, `renderLedgerOptionManager(kind,title)`, `openSettings(targetId)`, `settingsNavRow(page,iconKey,title,summary)`.
- Produces: `settingsOptionPageForKind(kind): string`, `settingsOptionDefinitionForPage(page): {kind:string,title:string}|null`, `renderSettingsOptionEditorPage(page): string`, and three first-class Settings page IDs.

- [ ] **Step 1: Add failing route and render contracts**

In `tests/ledger-entry-settings.test.js`, extract the new functions and existing option-action functions:

```js
const settingsOptionEditorSource = extractFunction(html,'renderSettingsOptionEditorPage');
const settingsOptionPageForKindSource = extractFunction(html,'settingsOptionPageForKind');
const addOptionSource = extractFunction(html,'addLedgerOptionFromSettings');
const removeOptionSource = extractFunction(html,'removeLedgerOptionFromSettings');
const moveOptionSource = extractFunction(html,'moveLedgerOptionFromSettings');
```

Replace the retired assertion for `類別、支付方式與採買單位` with these exact contracts:

```js
assert(settingsOptionsPageSource.includes('依用途選擇要管理的項目。'),
  'custom-options hub explains that the user chooses one option kind');
assert(settingsOptionsPageSource.indexOf('記帳類別')<settingsOptionsPageSource.indexOf('支付方式')&&
  settingsOptionsPageSource.indexOf('支付方式')<settingsOptionsPageSource.indexOf('採買單位'),
  'custom-options hub keeps the confirmed option-kind order');
assert(!settingsOptionsPageSource.includes('renderLedgerOptionManager('),
  'custom-options hub no longer expands all managers');
['options-category','options-pay-method','options-shopping-unit'].forEach(function(pageId){
  assert.strictEqual(resolveSettingsTarget(pageId).page,pageId,pageId+' is a first-class Settings page');
  assert(settingsDispatchSource.includes("page==='"+pageId+"'"),pageId+' is dispatched');
});
assert(settingsOptionEditorSource.includes("renderSettingsHeader(definition.title,false,'options','自訂項目')"),
  'option editors return to the custom-options hub');
assert(settingsOptionEditorSource.includes("renderLedgerOptionManager(definition.kind,'')"),
  'each option editor reuses exactly one existing manager');
assert(settingsOptionPageForKindSource.includes("kind==='category'")&&
  settingsOptionPageForKindSource.includes("kind==='payMethod'")&&
  settingsOptionPageForKindSource.includes("kind==='shoppingUnit'"),
  'each store kind has a fixed editor route');
[addOptionSource,removeOptionSource,moveOptionSource].forEach(function(source){
  assert(source.includes('settingsOptionPageForKind(kind)'),
    'option mutations rerender the matching editor instead of the hub');
});
```

- [ ] **Step 2: Run the focused Node test and verify RED**

Run:

```powershell
node tests/ledger-entry-settings.test.js
```

Expected: FAIL because `renderSettingsOptionEditorPage` and the three page IDs do not exist; the old hub still renders all three managers.

- [ ] **Step 3: Add fixed option-page definitions and routes**

In `index.html`, add these pure routing helpers next to `SETTINGS_PAGE_IDS`:

```js
function settingsOptionPageForKind(kind){
  if(kind==='category')return 'options-category';
  if(kind==='payMethod')return 'options-pay-method';
  if(kind==='shoppingUnit')return 'options-shopping-unit';
  return 'options';
}
function settingsOptionDefinitionForPage(page){
  if(page==='options-category')return {kind:'category',title:'記帳類別'};
  if(page==='options-pay-method')return {kind:'payMethod',title:'支付方式'};
  if(page==='options-shopping-unit')return {kind:'shoppingUnit',title:'採買單位'};
  return null;
}
```

Extend the allowlist without changing legacy targets:

```js
var SETTINGS_PAGE_IDS=['root','theme','proxy','ledger','options','options-category','options-pay-method','options-shopping-unit','storage','data','test-mode'];
```

- [ ] **Step 4: Give Settings headers an explicit nested-back target**

Replace `renderSettingsHeader()` with a backward-compatible optional target:

```js
function renderSettingsHeader(title,isRoot,backPage,backLabel){
  var target=backPage||'root';
  var label=backLabel||'設定';
  var back=isRoot?'':'<button class="settings-back" aria-label="返回'+escapeHtml(label)+'" onclick="openSettingsPage(\''+jsString(target)+'\')">‹ 返回</button>';
  return '<div class="settings-head"><div class="settings-title-wrap">'+back+'<h2 id="settingsTitle">'+escapeHtml(title)+'</h2></div><button class="settings-close" aria-label="關閉" onclick="closeSettings()">×</button></div>';
}
```

Existing two-argument calls continue to return to `root`; editor pages pass `options` and `自訂項目`.

- [ ] **Step 5: Replace the expanded options page with the hub and editor renderer**

Implement:

```js
function renderSettingsOptionsPage(){
  var rows=settingsNavRow('options-category','options','記帳類別',ledgerCategoryStore.all().length+' 項')+
    settingsNavRow('options-pay-method','options','支付方式',ledgerPayMethodStore.all().length+' 項')+
    settingsNavRow('options-shopping-unit','options','採買單位',shoppingUnitStore.all().length+' 項');
  return renderSettingsHeader('自訂項目',false)+
    '<div class="settings-options-hub" id="ledgerOptionSettingsSection"><div class="settings-help">依用途選擇要管理的項目。</div><div class="settings-group-card">'+rows+'</div></div>';
}
function renderSettingsOptionEditorPage(page){
  var definition=settingsOptionDefinitionForPage(page);
  if(!definition)return renderSettingsOptionsPage();
  return renderSettingsHeader(definition.title,false,'options','自訂項目')+
    '<div class="settings-section settings-option-editor" data-option-kind="'+definition.kind+'"><div class="settings-help">可新增、刪除或排序；刪除選項不影響既有紀錄。</div>'+renderLedgerOptionManager(definition.kind,'')+'</div>';
}
```

Add three explicit branches to `renderSettingsPage()` before the `storage` branch:

```js
if(page==='options-category'||page==='options-pay-method'||page==='options-shopping-unit')return renderSettingsOptionEditorPage(page);
```

- [ ] **Step 6: Keep mutation rerenders on the matching editor**

In `addLedgerOptionFromSettings()`, `removeLedgerOptionFromSettings()`, and `moveLedgerOptionFromSettings()`, replace only the successful rerender target:

```js
openSettings(settingsOptionPageForKind(kind));
```

Do not change validation, store calls, draft fallback, toasts, or the failed-add focus behavior. `ledgerOptionSettingsSection` remains a legacy external entry to the hub, not an internal mutation target.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/settings-grouped-root.test.js
git diff --check
```

Expected: both Node files pass, legacy `ledgerOptionSettingsSection → options` remains green, and whitespace checks pass.

- [ ] **Step 8: Commit the routing slice**

Inspect:

```powershell
git diff -- index.html tests/ledger-entry-settings.test.js
```

Confirm no store, localStorage key, default list, backup, schema, version, or Service Worker change. Commit:

```powershell
git add index.html tests/ledger-entry-settings.test.js
git commit -m "feat(settings): split custom option editors"
```

---

### Task 2: Polish the focused editors and lock real-browser behavior

**Files:**
- Modify: `tests/browser/settings-grouped-root.spec.js:30-310`
- Modify: `index.html:600-627`
- Modify: `index.html:8637-8644`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `tests/README.md:39`

**Interfaces:**
- Consumes: Task 1 page IDs/renderers, `.settings-group-card`, `.settings-row`, `.ledger-option-row`, and `SHOPPING_DEFAULT_UNIT`.
- Produces: `.settings-options-hub`, `.settings-option-editor`, `.ledger-option-name`, and `.ledger-option-default` visual contracts; no new data or storage interface.

- [ ] **Step 1: Extend existing Browser cases with the failing hub/editor acceptance**

Keep the Playwright inventory at 149 by extending current cases instead of adding a new `test()` block.

In the 320／375／390px layout case, after the root assertions, open `options` and all three editor IDs and collect for each page:

```js
const customLayouts=[];
for(const pageId of ['options','options-category','options-pay-method','options-shopping-unit']){
  await page.evaluate(id=>openSettings(id),pageId);
  customLayouts.push(await page.evaluate(()=>{
    const panel=document.querySelector('#settingsOverlay .settings-panel');
    const controls=Array.from(panel.querySelectorAll('button,input'));
    return {
      page:settingsUiState.page,
      panelOverflow:panel.scrollWidth>panel.clientWidth,
      overlappingRows:Array.from(panel.querySelectorAll('.ledger-option-row')).filter(row=>{
        const name=row.querySelector('.ledger-option-name');
        const actions=row.querySelector(':scope>div');
        return name&&actions&&name.getBoundingClientRect().right>actions.getBoundingClientRect().left;
      }).length,
      tooShort:controls.filter(control=>control.getBoundingClientRect().height<36).length
    };
  }));
}
```

Assert no overflow/overlap and no option control shorter than the existing 36px contract at all three widths.

In the existing subpage scroll/state case, add one end-to-end flow:

```js
await page.evaluate(()=>openSettings('options'));
await expect(page.getByRole('button',{name:/記帳類別.*\d+ 項/})).toBeVisible();
await expect(page.getByRole('button',{name:/支付方式.*\d+ 項/})).toBeVisible();
await expect(page.getByRole('button',{name:/採買單位.*\d+ 項/})).toBeVisible();

await page.getByRole('button',{name:/記帳類別/}).focus();
await page.keyboard.press('Enter');
await expect(page.getByRole('heading',{name:'記帳類別'})).toBeVisible();
const before=await page.evaluate(()=>ledgerCategoryStore.all().length);
await page.locator('#ledgerOptionInput_category').fill('旅費');
await page.getByRole('button',{name:'新增'}).click();
await expect(page.locator('.ledger-option-row',{hasText:'旅費'})).toBeVisible();
expect(await page.evaluate(()=>settingsUiState.page)).toBe('options-category');
await page.getByRole('button',{name:'上移 旅費'}).click();
expect(await page.evaluate(()=>settingsUiState.page)).toBe('options-category');
await page.getByRole('button',{name:'刪除 旅費'}).click();
await expect(page.locator('.ledger-option-row',{hasText:'旅費'})).toHaveCount(0);

await page.getByRole('button',{name:'返回自訂項目'}).click();
await expect(page.getByRole('heading',{name:'自訂項目'})).toBeVisible();
expect(await page.evaluate(()=>ledgerCategoryStore.all().length)).toBe(before);
await page.getByRole('button',{name:/支付方式/}).focus();
await page.keyboard.press(' ');
await expect(page.getByRole('heading',{name:'支付方式'})).toBeVisible();
```

Then open `options-shopping-unit`, assert the `個` row contains `預設`, click its existing delete button, and assert `shoppingUnitStore.all()` still contains `個` and `settingsUiState.page` remains `options-shopping-unit`.

In the six-theme case, render `options`, confirm the hub title/summary contrast against the card is at least 4.5, then render `options-shopping-unit` and confirm the `預設` label is visible for every `THEME_IDS` entry.

- [ ] **Step 2: Run the focused Browser file and verify RED**

Run:

```powershell
npx playwright test tests/browser/settings-grouped-root.spec.js
```

Expected: FAIL because the hub/editor routes, nested back accessible name, `預設` label, and scoped layout classes are not yet fully styled/rendered.

- [ ] **Step 3: Add the visible default-unit label without changing the guard**

In `renderLedgerOptionManager()`, render the option name as:

```js
var defaultLabel=kind==='shoppingUnit'&&value===SHOPPING_DEFAULT_UNIT?'<small class="ledger-option-default">預設</small>':'';
var name='<span class="ledger-option-name">'+escapeHtml(value)+defaultLabel+'</span>';
```

Use `name` as the first child of `.ledger-option-row`. Keep the existing delete button and `removeLedgerOptionFromSettings()` guard unchanged so the existing explanatory toast remains authoritative.

- [ ] **Step 4: Add token-based hub/editor CSS**

Near the existing Settings rules in `index.html`, add:

```css
.settings-options-hub>.settings-help{margin:0 3px 9px}.settings-option-editor .ledger-option-group{border-top:0;margin-top:10px;padding-top:0}.settings-option-editor .ledger-option-group h4:empty{display:none}.ledger-option-name{display:flex;min-width:0;align-items:center;gap:7px}.ledger-option-default{flex:0 0 auto;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--ink-soft);font-size:10px;font-weight:800}.ledger-option-row>div{flex:0 0 auto}
```

All color roles use existing theme tokens. Do not change the current 36×36 option buttons or 44px input/add controls.

- [ ] **Step 5: Document the active UI and test contracts**

Add a top-level active contract to `04_UI_GUIDELINES.md`:

```markdown
## v103 設定「自訂項目」資訊架構

- `自訂項目` 先顯示記帳類別、支付方式、採買單位三個摘要入口與即時數量；一次只進入並管理一種清單。
- 單類管理頁保留新增、刪除、排序與既有資料規則，返回鍵先回 `自訂項目`，再回設定根頁。
- `個` 顯示為預設採買單位並沿用不可刪除防護；320／375／390px 不得讓名稱、標籤與三個排序／刪除控制重疊。
```

Extend the `settings-grouped-root.test.js`／Browser entry in `tests/README.md` to mention the two-level custom-options hub, per-kind editors, live counts, nested back, mutation persistence, default-unit guard, six themes, and three phone widths.

- [ ] **Step 6: Run focused verification and verify GREEN**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/settings-grouped-root.test.js
npx playwright test tests/browser/settings-grouped-root.spec.js
node tools/check-doc-titles.js
git diff --check
```

Expected: Node contracts pass, the existing Settings Browser case count is unchanged and all pass, doc titles pass, and no whitespace errors appear.

- [ ] **Step 7: Run the complete dev gate**

Run:

```powershell
$failed=@(); $count=0; Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { $count++; node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; Write-Host "NODE_TOTAL=$count"; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Expected: 83/83 Node files, 149/149 Playwright cases, document titles and App/SW v103 alignment pass, runtime assets and BUILTIN show no drift, manifest JSON parses, and whitespace checks pass.

- [ ] **Step 8: Review scope and commit**

Run:

```powershell
git diff -- index.html tests/ledger-entry-settings.test.js tests/browser/settings-grouped-root.spec.js 04_UI_GUIDELINES.md tests/README.md
git status --short
```

Confirm only the approved UI/routing/tests/docs changed and the worktree contains no unrelated edits. Commit:

```powershell
git add index.html tests/ledger-entry-settings.test.js tests/browser/settings-grouped-root.spec.js 04_UI_GUIDELINES.md tests/README.md
git commit -m "feat(settings): focus custom item management"
```

---

### Task 3: Verify branch integrity and push `dev`

**Files:**
- Verify only; no planned runtime edits.

**Interfaces:**
- Consumes: the two implementation commits and the confirmed v103 gate.
- Produces: a non-force update of `origin/dev`.

- [ ] **Step 1: Confirm the local branch and remote base**

Run:

```powershell
git status --short --branch
git fetch origin dev
git rev-list --left-right --count origin/dev...dev
git log --oneline origin/dev..dev
```

Expected: clean `dev`, zero commits on the remote-only side, and exactly the confirmed spec/plan/implementation commits on the local-only side.

- [ ] **Step 2: Push without force**

Run:

```powershell
git push origin dev
```

Expected: `origin/dev` advances by fast-forward. Do not force-push, tag, merge to `main`, or deploy.

- [ ] **Step 3: Verify the remote SHA**

Run:

```powershell
git rev-parse dev
git rev-parse origin/dev
git status --short --branch
```

Expected: local and remote SHAs match and the worktree is clean.
