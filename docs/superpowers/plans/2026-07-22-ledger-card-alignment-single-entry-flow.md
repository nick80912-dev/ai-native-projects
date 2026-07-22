# Ledger Card Alignment and Single Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Ledger dashboard compact cards and make a single-item entry proceed from amount to always-visible detail, then save from the detail keyboard without expanding secondary fields.

**Architecture:** Keep the existing single-file Ledger architecture in `index.html`. Reuse one `.ledger-compact-card` layout contract for both semantic card elements, move the existing detail renderer into the primary single-entry group, and split keyboard behavior into focused amount-next and detail-done handlers while retaining the existing save, validation, repository, queue, and idempotency paths.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js assertion tests, Service Worker app-shell caching.

## Global Constraints

- Work only on `dev`, based on the synchronized `origin/dev` baseline; never work on or merge to `main`.
- Allowed files are `index.html`, `sw.js`, necessary existing or new `tests/*.test.js`, `07_CHANGELOG.md`, and `tasks/current.md`; this plan document is the already-approved process artifact.
- Do not modify Schema, Apps Script, Repository, Queue/Retry/Flush, settlement, tombstone contracts, localStorage keys, existing data fields, governance files, icons, manifest, Netlify configuration, tools, or non-Ledger pages.
- Do not create `package.json`, deploy Netlify, force-push, or push/merge `main`.
- Preserve amount input `type="number"`, `inputmode="numeric"`, and existing numeric behavior.
- Preserve multi-item entry behavior.
- If app-shell content changes, change only `CACHE_NAME` from `okayama-trip-v34` to `okayama-trip-v35`; do not change `SHELL`, `install`, `activate`, or `fetch`.
- All code changes follow RED-GREEN-REFACTOR: tests must fail for the intended missing behavior before production code changes.

---

### Task 1: Dashboard compact-card alignment contract

**Files:**
- Modify: `tests/ledger-dashboard.test.js`
- Modify: `index.html:512`

**Interfaces:**
- Consumes: existing `.ledger-compact-grid`, `.ledger-compact-card`, `.ledger-compact-action`, and `renderLedgerDashboard()` output.
- Produces: a shared left-aligned flex layout for both `article.ledger-compact-card` and `button.ledger-compact-card` with identical child content geometry.

- [ ] **Step 1: Add failing structural and CSS assertions**

Add assertions equivalent to:

```js
assert.match(html,/\.ledger-compact-card\{[^}]*display:flex[^}]*flex-direction:column[^}]*align-items:stretch[^}]*text-align:left/);
assert.match(html,/\.ledger-compact-card h3,\.ledger-compact-card strong,\.ledger-compact-card p\{[^}]*width:100%[^}]*margin-left:0[^}]*margin-right:0/);
assert.match(html,/\.ledger-compact-action\{[^}]*appearance:none[^}]*-webkit-appearance:none[^}]*font:inherit[^}]*color:inherit/);
assert.match(html,/<article class="ledger-compact-card ledger-today-card">/);
assert.match(html,/<button class="ledger-compact-card ledger-compact-action" onclick="openLedgerProxyPanel\(\)">/);
```

Also assert the proxy card remains a button and the Today card remains a non-clickable article.

- [ ] **Step 2: Run the dashboard test and verify RED**

Run:

```powershell
node tests/ledger-dashboard.test.js
```

Expected: exit non-zero because the shared flex contract and native button reset are absent.

- [ ] **Step 3: Implement the shared card contract**

Update the existing compact-card CSS without per-card offsets:

```css
.ledger-compact-card{
  min-width:0;
  min-height:112px;
  border:1px solid var(--line);
  border-radius:8px;
  background:var(--card);
  padding:12px;
  box-shadow:var(--shadow);
  display:flex;
  flex-direction:column;
  align-items:stretch;
  justify-content:flex-start;
  text-align:left;
}
.ledger-compact-card h3,
.ledger-compact-card strong,
.ledger-compact-card p{
  width:100%;
  margin-left:0;
  margin-right:0;
}
.ledger-compact-action{
  width:100%;
  appearance:none;
  -webkit-appearance:none;
  text-align:left;
  font:inherit;
  color:inherit;
}
```

Retain the existing approved font sizes, colors, margins, line-heights, minimum height, card padding, proxy click handler, and Today semantics. Do not add negative margins or alignment transforms.

- [ ] **Step 4: Run the dashboard regression test and verify GREEN**

Run:

```powershell
node tests/ledger-dashboard.test.js
```

Expected: exit 0.

- [ ] **Step 5: Commit the independently testable card alignment**

```powershell
git add index.html tests/ledger-dashboard.test.js
git commit -m "fix: align ledger dashboard cards"
```

### Task 2: Single-entry amount-next and visible detail markup

**Files:**
- Modify: `tests/ledger-entry-p0.test.js`
- Modify: `tests/ledger-three-second-entry.test.js`
- Modify: `index.html:4481-4492`

**Interfaces:**
- Consumes: `renderLedgerSingleItemPrimary(draft)`, `renderLedgerSingleItemDetail(draft)`, `renderLedgerSingleSecondaryFields(draft)`, `focusLedgerEntryField(id)`, `parseLedgerAmount(value)`, and `showLedgerInlineError`/existing form-error rendering behavior.
- Produces: `handleLedgerAmountNext(event)` and `handleLedgerDetailDone(event)`; primary markup ordered as amount then detail; secondary markup limited to store, occurrence, category, and payment.

- [ ] **Step 1: Replace old expectations with failing keyboard and layout tests**

Assert all of the following:

```js
assert.match(primaryHtml,/id="ledgerAmount"[^>]*type="number"[^>]*inputmode="numeric"[^>]*enterkeyhint="next"[^>]*onkeydown="handleLedgerAmountNext\(event\)"/);
assert.match(detailHtml,/id="ledgerDetail"[^>]*enterkeyhint="done"[^>]*onkeydown="handleLedgerDetailDone\(event\)"/);
assert.ok(basicInfoSource.indexOf('renderLedgerSingleItemPrimary(draft)') < basicInfoSource.indexOf('renderLedgerSingleItemDetail(draft)'));
assert.doesNotMatch(secondarySource,/renderLedgerSingleItemDetail/);
['renderLedgerStoreField','renderLedgerOccurrenceFields','renderLedgerSingleItemCategory','renderLedgerPaymentFields'].forEach(name=>assert.match(secondarySource,new RegExp(name)));
assert.doesNotMatch(amountNextSource,/saveLedgerEntry/);
assert.match(detailDoneSource,/saveLedgerEntry\(false\)/);
```

Execute the handlers in a VM sandbox and verify:

- composing Enter and non-Enter do nothing;
- valid amount Enter calls `preventDefault()` and focuses `ledgerDetail` once;
- valid amount Enter performs no render and no save;
- detail Enter calls `preventDefault()` and `saveLedgerEntry(false)` exactly once;
- detail composing Enter and non-Enter do not save.

- [ ] **Step 2: Run targeted tests and verify RED**

Run:

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-three-second-entry.test.js
```

Expected: both commands expose the old Done-to-save behavior or old hidden-detail structure; at least one exits non-zero for each new requirement group.

- [ ] **Step 3: Implement the amount-next handler without rerendering**

Add a focused inline-error helper and replace `handleLedgerAmountDone` with:

```js
function showLedgerInlineFieldError(input,message){
  if(!input)return;
  input.classList.add('ledger-field-invalid');
  input.setAttribute('aria-invalid','true');
  var field=input.parentNode;
  if(field&&field.classList&&field.classList.contains('ledger-amount-wrap'))field=field.parentNode;
  var inline=field&&field.querySelector('.ledger-inline-error');
  if(!inline&&field){inline=document.createElement('div');inline.className='ledger-inline-error';field.appendChild(inline);}
  if(inline)inline.textContent=message;
}
function handleLedgerAmountNext(event){
  if(!event||event.key!=='Enter'||event.isComposing)return;
  if(event.preventDefault)event.preventDefault();
  var input=event.currentTarget||document.getElementById('ledgerAmount');
  var draft=ledgerUiState.draft;
  var value=input?input.value:(draft&&draft.amount);
  if(!ledgerItemAmountIsValid({amount:value})){
    draft.formErrors=Object.assign({},draft.formErrors,{amount:'請輸入有效金額'});
    showLedgerInlineFieldError(input,'請輸入有效金額');
    if(input)try{input.focus({preventScroll:true});}catch(ignore){input.focus();}
    return;
  }
  var detail=document.getElementById('ledgerDetail');
  if(detail)try{detail.focus({preventScroll:true});}catch(ignoreFocus){detail.focus();}
}
```

The invalid path mutates only the draft error and current amount field error DOM needed to show the existing message; it must not call the full sheet renderer, close the sheet, save, or blur the amount input. `updateLedgerDraftField` remains responsible for removing this markup when the amount changes.

- [ ] **Step 4: Implement the detail-done handler and primary placement**

Use:

```js
function handleLedgerDetailDone(event){
  if(!event||event.key!=='Enter'||event.isComposing)return;
  if(event.preventDefault)event.preventDefault();
  return saveLedgerEntry(false);
}
```

Set the amount attributes to `enterkeyhint="next"` and `onkeydown="handleLedgerAmountNext(event)"`. Set detail attributes to `enterkeyhint="done"` and `onkeydown="handleLedgerDetailDone(event)"`. Render the single-entry body as:

```js
function renderLedgerSingleBasicInfo(draft){return '<div class="ledger-single-basic-info">'+renderLedgerSingleItemPrimary(draft)+renderLedgerSingleItemDetail(draft)+renderLedgerSingleSecondaryFields(draft)+'</div>';}
```

Remove detail from `renderLedgerSingleSecondaryFields`; retain its four existing secondary renderers and keep the summary string limited to category, payment, and date.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-three-second-entry.test.js
```

Expected: both exit 0.

- [ ] **Step 6: Commit the visible-detail keyboard flow**

```powershell
git add index.html tests/ledger-entry-p0.test.js tests/ledger-three-second-entry.test.js
git commit -m "feat: streamline single entry keyboard flow"
```

### Task 3: Validation focus and draft-preservation regression

**Files:**
- Modify: `tests/ledger-entry-p0.test.js`
- Modify: `tests/ledger-quick-entry.test.js`
- Modify: `tests/ledger-form-223.test.js`
- Modify: `index.html:4653-4725`

**Interfaces:**
- Consumes: `validateLedgerEntryDraft(draft)`, `saveLedgerEntry(addAnother)`, `focusLedgerValidationError(validation)`, `updateLedgerDraftField`, and current draft-preserving segment/category/payment render paths.
- Produces: validation routing that focuses amount or detail directly without setting `entryDetailsOpen=true`, while preserving the existing single-save pending/idempotency guard.

- [ ] **Step 1: Add failing validation and preservation assertions**

Add tests that prove:

```js
assert.doesNotMatch(saveSource,/firstField\s*===\s*['"]detail['"][\s\S]{0,120}entryDetailsOpen\s*=\s*true/);
```

Run `saveLedgerEntry(false)` in the existing VM sandbox with invalid drafts and assert:

- invalid amount focuses `ledgerAmount` and does not expand secondary;
- missing detail focuses `ledgerDetail` and does not expand secondary;
- editing an existing record renders its detail in the always-visible field;
- changing track, currency, category, or payment keeps the current `draft.detail`;
- rapid detail Enter/save attempts still commit only once through `savePending`/existing guard;
- multi-item amount keyboard behavior and multi-item detail structure remain unchanged.

- [ ] **Step 2: Run the focused regression tests and verify RED**

Run:

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-form-223.test.js
```

Expected: the detail-validation assertion fails because the old code sets `entryDetailsOpen=true`; preservation and pending tests must otherwise identify no unrelated regression.

- [ ] **Step 3: Remove forced secondary expansion from validation**

Change only the validation-failure routing in `saveLedgerEntry`:

```js
if(!validation.valid){
  draft.formErrors=validation.errors;
  withLedgerSheetPosition(renderLedgerEntrySheet);
  focusLedgerValidationError(validation);
  return Promise.resolve({ok:false,validation:true});
}
```

This is the existing failure branch with only `if(validation.firstField==='detail')draft.entryDetailsOpen=true;` removed. Do not alter validation rules, record construction, repository operations, Queue behavior, IDs, idempotency, or the multi-item path.

- [ ] **Step 4: Run the focused regression tests and verify GREEN**

Run:

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-form-223.test.js
```

Expected: all exit 0.

- [ ] **Step 5: Commit validation routing**

```powershell
git add index.html tests/ledger-entry-p0.test.js tests/ledger-quick-entry.test.js tests/ledger-form-223.test.js
git commit -m "fix: keep single entry validation in primary fields"
```

### Task 4: Service Worker and documentation consistency

**Files:**
- Modify: `tests/pwa-shell.test.js`
- Modify: `sw.js:9`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: current `CACHE_NAME = 'okayama-trip-v34'`, existing app-shell contract, and current batch status documentation.
- Produces: `CACHE_NAME = 'okayama-trip-v35'` with no other Service Worker behavior changes; documentation of this batch and corrected current 104px Popover wording.

- [ ] **Step 1: Make the cache-version test fail for v35**

Update only the expected cache name:

```js
assert.match(serviceWorker,/var CACHE_NAME = 'okayama-trip-v35';/,'service worker cache is exactly v35');
```

- [ ] **Step 2: Run the PWA test and verify RED**

Run:

```powershell
node tests/pwa-shell.test.js
```

Expected: exit non-zero because `sw.js` remains v34.

- [ ] **Step 3: Bump only CACHE_NAME and verify GREEN**

Change:

```js
var CACHE_NAME = 'okayama-trip-v35';
```

Then run:

```powershell
node tests/pwa-shell.test.js
git diff -- sw.js
```

Expected: test exits 0; diff contains exactly the v34-to-v35 `CACHE_NAME` line and no `SHELL`, `install`, `activate`, or `fetch` changes.

- [ ] **Step 4: Update changelog and current task status**

Add only this batch's increments to `07_CHANGELOG.md`: compact-card alignment, always-visible single detail, amount Next/detail Done flow, direct validation focus, unchanged multi-item and data contracts, and SW v35.

In `tasks/current.md`, record automated and browser QA status separately, retain “等待 Bar 手機驗收／未經 Bar 驗收不得標示完成”, and replace obsolete current-state claims of `118px` Popover width with the actual `104px` value. Historical implementation-plan examples may remain only where explicitly labeled historical; no current status may claim 118px.

- [ ] **Step 5: Commit cache and documentation**

```powershell
git add sw.js tests/pwa-shell.test.js 07_CHANGELOG.md tasks/current.md
git commit -m "docs: record ledger entry flow update"
```

### Task 5: Automated regression, browser QA, and delivery gate

**Files:**
- Verify: all `tests/*.test.js`
- Verify: `index.html`, `sw.js`, `07_CHANGELOG.md`, `tasks/current.md`

**Interfaces:**
- Consumes: Tasks 1-4 deliverables.
- Produces: evidence that the approved scope passes automated and responsive-browser gates and contains no forbidden changes.

- [ ] **Step 1: Run priority regressions first**

```powershell
node tests/ledger-entry-p0.test.js
node tests/ledger-three-second-entry.test.js
node tests/ledger-quick-entry.test.js
node tests/ledger-dashboard.test.js
node tests/ledger-form-223.test.js
```

Expected: every command exits 0.

- [ ] **Step 2: Run every Node test individually**

```powershell
$failed=@(); Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object { node $_.FullName; if($LASTEXITCODE -ne 0){$failed += $_.Name} }; if($failed.Count){$failed; exit 1}
```

Expected: exit 0 and an empty `$failed` list. Record the number of test files executed.

- [ ] **Step 3: Run documentation title validation**

```powershell
node tools/check-doc-titles.js
```

Expected: exit 0.

- [ ] **Step 4: Run 375px and 390px browser QA**

At each viewport, verify:

- Today and proxy/settlement card `h3`, `strong`, and `p` left edges differ by no more than 1px.
- Compact cards retain equal height/grid rhythm; proxy card remains whole-card clickable; Today remains inert.
- Single-item amount and detail are visible without opening secondary fields.
- Valid amount Enter moves focus to detail with the numeric input unchanged and no save.
- Blank, zero, and malformed amount Enter retain amount focus, preserve keyboard continuity, and show the existing inline error.
- Detail Enter saves once; sticky save buttons still work; summary shows category, payment, and date only.
- Existing edits retain detail; track/currency/category/payment changes retain detail; multi-item flow is unchanged.
- `scrollWidth <= clientWidth` and `pageerror=0`.

Do not mark iPhone Safari/PWA acceptance complete; that remains Bar's manual gate.

- [ ] **Step 5: Verify scope, forbidden files, and Service Worker diff**

```powershell
git status --short
git diff origin/dev...HEAD --name-only
git diff origin/dev...HEAD -- .ai-manifest.json schema.js validator.js apps-script manifest.webmanifest netlify.toml tools
git diff origin/dev...HEAD -- sw.js
git diff --check
```

Expected: only the approved implementation, test, document, and process-plan files appear; forbidden diff is empty; Service Worker changes only v34 to v35; `git diff --check` exits 0.

- [ ] **Step 6: Create the requested final implementation commit if needed**

If Tasks 1-4 were executed as separate commits, do not squash away their review history. If implementation is still uncommitted, use:

```powershell
git add index.html sw.js tests/ledger-entry-p0.test.js tests/ledger-three-second-entry.test.js tests/ledger-quick-entry.test.js tests/ledger-dashboard.test.js tests/ledger-form-223.test.js tests/pwa-shell.test.js 07_CHANGELOG.md tasks/current.md
git commit -m "fix: align ledger cards and streamline single entry"
```

- [ ] **Step 7: Push only dev after all gates pass**

```powershell
git push origin dev
```

Expected: push succeeds without force and updates only `origin/dev`. Report baseline commit, all implementation commit hashes, test count, Browser QA result, SW v34 to v35, unchanged contracts, and “Waiting for Bar iPhone Safari/PWA acceptance.”
