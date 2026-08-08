# Ledger Calculator Decimal and Percent v94 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將共用 Ledger 金額計算器改為四欄即時計算介面，支援小數、購物式百分比、等號與正數小數套用時無條件捨去。

**Architecture:** 保留 `index.html` 內單一 `ledgerCalculatorState` 與資料 target seam，不建立各表單獨立計算器。純 tokenizer／evaluator 負責算式，套用 model 將正數小數安全向下取整，再透過既有 `ledgerCalculatorApplyValue()` 寫回 live Ledger draft；DOM sheet 只消費 calculator display model。

**Tech Stack:** Static HTML/CSS/ES5-compatible JavaScript、Node.js `assert`／`vm` source tests、Playwright Chromium、Service Worker 版本契約。

## Global Constraints

- Runtime 版本使用 v94；`app-version.js` 與 `sw.js` 同步升 v94。
- `sw.js` 只修改 `SW_VERSION` 字串，不改 install、activate、fetch、skipWaiting、clients.claim 或快取策略。
- `%` 採購物計算機語意：`1000-10%=900`、`1000+10%=1100`、`1000*10%=100`、`1000/10%=10000`。
- 正數小數結果只在套用時以 `Math.floor()` 語意無條件捨去；浮點誤差容限內的近整數先校正。
- 一般金額捨去後必須大於 0；固定折扣捨去後允許 0；負數、除零、非有限值與 unsafe result 一律阻止。
- 保留 `{type:'single'}`、`{type:'item',key}`、`{type:'discount'}` data target；stale target fail closed。
- 不改 Ledger／Shopping schema、Apps Script、同步、備份格式、帳務推導、`PERSONAL_STATE_VERSION=9`、`netlify.toml` 或 `main`。
- 原排定 v94／v95 的 SW 更新提示雙版本驗收順延為 v95／v96。
- 不部署、不建立 tag；完整驗證通過後只 push `dev`。

## File Map

- Modify `index.html`: calculator CSS、純運算、input reducer、state、sheet DOM、release notes。
- Modify `tests/ledger-calculator.test.js`: parser、percent、floor、state、DOM、CSS characterization。
- Modify `tests/browser/ledger-calculator.spec.js`: 真實按鍵、等號、套用、焦點、窄螢幕與 target workflows。
- Modify `app-version.js`: `APP_VERSION='v94'`。
- Modify `sw.js`: `SW_VERSION='v94'` only。
- Modify `07_CHANGELOG.md`: v94 交付紀錄與實際驗證數字。
- Modify `tasks/current.md`: dev 候選版、v94 狀態、SW v95／v96、累積候選版與實際驗證數字。
- Modify `tests/README.md`: calculator test coverage and v94 behavior。

---

### Task 1: Decimal tokenizer, contextual percent, and floor-at-apply model

**Files:**
- Modify: `tests/ledger-calculator.test.js`
- Modify: `index.html:7730-7777`

**Interfaces:**
- Consumes: `normalizeLedgerCalculatorExpression(expression)` and the existing safe-range/error contract.
- Produces: `evaluateLedgerCalculatorExpression(expression) -> {ok:boolean,value:number|null,error:string}`.
- Produces: `ledgerCalculatorFloorValue(value) -> number` with near-integer correction.
- Produces: `ledgerCalculatorAmountResult(expression,allowZero) -> {ok:boolean,value:number|null,rawValue:number|null,truncated:boolean,error:string}`.

- [ ] **Step 1: Add failing parser and application assertions**

Extend `tests/ledger-calculator.test.js` with exact cases:

```js
assert.deepStrictEqual(result('.5+1.25'),{ok:true,value:1.75,error:''});
assert.deepStrictEqual(result('0.1+0.2'),{ok:true,value:0.30000000000000004,error:''});
assert.deepStrictEqual(result('1.2.3'),{ok:false,value:null,error:'算式格式不正確'});
assert.deepStrictEqual(result('10%'),{ok:true,value:0.1,error:''});
assert.deepStrictEqual(result('1000*10%'),{ok:true,value:100,error:''});
assert.deepStrictEqual(result('1000/10%'),{ok:true,value:10000,error:''});
assert.deepStrictEqual(result('1000+10%'),{ok:true,value:1100,error:''});
assert.deepStrictEqual(result('1000-10%'),{ok:true,value:900,error:''});
assert.deepStrictEqual(result('1000+10%+10%'),{ok:true,value:1210,error:''});
assert.deepStrictEqual(result('10%%'),{ok:false,value:null,error:'百分比格式不正確'});
assert.deepStrictEqual(result('10+%'),{ok:false,value:null,error:'百分比格式不正確'});

assert.deepStrictEqual(amountResult('1512.9',false),{
  ok:true,value:1512,rawValue:1512.9,truncated:true,error:''
});
assert.deepStrictEqual(amountResult('0.9',false),{
  ok:false,value:null,rawValue:0.9,truncated:true,error:'捨去後金額必須大於 0'
});
assert.deepStrictEqual(amountResult('0.9',true),{
  ok:true,value:0,rawValue:0.9,truncated:true,error:''
});
assert.deepStrictEqual(amountResult('1-2.2',false),{
  ok:false,value:null,rawValue:-1.2,truncated:false,error:'記帳金額必須大於 0'
});
```

Add a direct near-integer assertion after extracting `ledgerCalculatorFloorValue` into the VM sandbox:

```js
assert.strictEqual(workflowSandbox.ledgerCalculatorFloorValue(2.9999999999999996),3);
assert.strictEqual(workflowSandbox.ledgerCalculatorFloorValue(2.9),2);
```

- [ ] **Step 2: Run the focused Node test and capture RED**

Run:

```powershell
node tests/ledger-calculator.test.js
```

Expected: FAIL on `.5+1.25` because the v93 parser rejects `.`; later percent and floor assertions are not yet reachable.

- [ ] **Step 3: Replace digit-only scanning with explicit number/postfix parsing**

Keep the parser local to `index.html`. Tokenize only digits, one decimal point, postfix `%`, whitespace, and `+ - * /`; reject every other character. Represent each operand as `{value:number,percent:boolean}` and retain normal `*`／`/` precedence.

For `+`／`-`, when the immediate right operand is a percentage literal, calculate against the current left total:

```js
function additiveValue(left,operator,right){
  var amount=right.percent?left*right.value/100:right.value;
  return operator==='+'?left+amount:left-amount;
}
```

For `*`／`/`, normalize a percent operand to `value/100`. Preserve the existing explicit errors: `不能除以 0`, `算式尚未完成`, `算式包含不支援的內容`, `結果超出可用範圍`.

- [ ] **Step 4: Add safe floor-at-apply without changing raw display math**

Implement the apply boundary separately from evaluation:

```js
function ledgerCalculatorFloorValue(value){
  var epsilon=Number.EPSILON||2.220446049250313e-16;
  var nearest=Math.round(value),tolerance=epsilon*Math.max(1,Math.abs(value))*8;
  return Math.abs(value-nearest)<=tolerance?nearest:Math.floor(value);
}
```

Update `ledgerCalculatorAmountResult()` so `rawValue` is retained, positive decimals become a floored `value`, general amount zero after floor fails with `捨去後金額必須大於 0`, discount zero remains valid, and negative input fails before floor. Never mutate the expression or Ledger draft here.

- [ ] **Step 5: Run focused tests GREEN**

Run:

```powershell
node tests/ledger-calculator.test.js
```

Expected: PASS and print `ledger calculator tests passed`.

- [ ] **Step 6: Commit pure calculation behavior**

```powershell
git add -- index.html tests/ledger-calculator.test.js
git commit -m "feat(ledger): calculate decimal and percent amounts"
```

---

### Task 2: Calculator input reducer, equals state, and four-column sheet

**Files:**
- Modify: `tests/ledger-calculator.test.js`
- Modify: `index.html:617-618`
- Modify: `index.html:7770-7861`
- Modify: `index.html:9093-9101`

**Interfaces:**
- Consumes: Task 1 evaluator and `ledgerCalculatorAmountResult()`.
- Produces: state including `evaluated:boolean`.
- Produces: `inputLedgerCalculatorKey(key)`, `evaluateLedgerCalculator()`, `clearLedgerCalculator()`, `backspaceLedgerCalculator()`.
- Produces: accessible `renderLedgerCalculatorSheet()` with `% AC ⌫ ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 + / . 0 00 =`.

- [ ] **Step 1: Add failing source/state/DOM assertions**

Extract `evaluateLedgerCalculator` and add assertions that the runtime contains:

```js
assert.match(html,/ledgerCalculatorState=\{[^}]*evaluated:false/);
assert.match(sheetSource,/data-calculator-key="%"/);
assert.match(sheetSource,/data-calculator-key="\."/);
assert.match(sheetSource,/data-calculator-key="00"/);
assert.match(sheetSource,/data-calculator-key="="/);
assert.match(sheetSource,/>AC<\/button>/);
assert.match(sheetSource,/aria-label="關閉金額計算機"/);
assert.match(sheetSource,/id="ledgerCalculatorApply"[^>]*>套用金額<\/button>/);
assert.match(inputSource,/evaluated/);
assert.match(equalsSource,/evaluateLedgerCalculatorExpression/);
assert.match(html,/\.ledger-calculator-keys\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
```

Add a small VM input harness with stubbed `updateLedgerCalculatorDisplay()` and assert:

```js
input('.');              // expression becomes "0."
input('5');              // "0.5"
input('.');              // remains "0.5"
clear(); input('00');    // remains "0"
clear(); input('1'); input('+'); input('.'); input('5'); // "1+0.5"
equals();                // evaluated === true, expression remains "1+0.5", result === 1.5
input('2');              // starts a new expression "2"
equals(); input('+');    // continues from evaluated result, e.g. "2+"
```

- [ ] **Step 2: Run focused test and capture RED**

Run `node tests/ledger-calculator.test.js`.

Expected: FAIL because v93 state has no `evaluated`, keys, equals handler, or four-column source contract.

- [ ] **Step 3: Implement the input reducer and equals transition**

Allow only `0-9`, `00`, `.`, `%`, `+`, `-`, `*`, `/`. Enforce one decimal point per current operand, normalize empty decimal to `0.`, reject incomplete percent input, and preserve the 120-character limit. After `=`:

```js
if(ledgerCalculatorState.evaluated){
  if(operator) expression=String(ledgerCalculatorState.result);
  else expression='';
  ledgerCalculatorState.evaluated=false;
}
```

`evaluateLedgerCalculator()` evaluates without closing or writing. On success it sets `result` and `evaluated=true`; on failure it preserves the expression and writes the exact parser error.

- [ ] **Step 4: Render the reference-layout sheet and display model**

Render the five rows in source order, with all buttons formal `type="button"` controls and accessible labels: `百分比`, `全部清除`, `退格`, `除`, `乘`, `減`, `加`, `小數點`, `雙零`, `等於`.

The header is:

```html
<div class="ledger-calculator-head">
  <h2 id="ledgerCalculatorTitle">計算金額</h2>
  <button type="button" class="ledger-calculator-close"
    aria-label="關閉金額計算機" onclick="closeLedgerCalculator(true)">…</button>
</div>
```

Display the symbolic expression in a small line, the raw result in a large line, and `將套用 ¥1512` only when the valid raw result floors to a different value. Keep the apply button text `套用金額`; its `aria-label` may include the actual currency and floored value.

- [ ] **Step 5: Implement responsive CSS and keyboard handling**

Use `grid-template-columns:repeat(4,minmax(0,1fr))`, a minimum 48px key height, existing theme variables, and distinct utility/operator/equal styles. Maintain max sheet height with vertical scrolling and safe-area padding. Extend the document key handler so physical `0-9 . % + - * / Enter = Backspace Delete Escape` mirror visible controls while preserving the existing Tab focus trap.

- [ ] **Step 6: Run focused Node test GREEN and diff check**

Run:

```powershell
node tests/ledger-calculator.test.js
git diff --check
```

Expected: both exit 0.

- [ ] **Step 7: Commit state and UI**

```powershell
git add -- index.html tests/ledger-calculator.test.js
git commit -m "feat(ledger): present an instant amount calculator"
```

---

### Task 3: Browser workflow, target coverage, and narrow viewport safety

**Files:**
- Modify: `tests/browser/ledger-calculator.spec.js`
- Modify: `index.html` only if the new browser test exposes a behavior defect

**Interfaces:**
- Consumes: Tasks 1–2 calculator UI and target workflow.
- Produces: reproducible Chromium coverage for single, item, discount, edit/correction-compatible shared renderer, and Shopping-prefilled entry behavior.

- [ ] **Step 1: Rewrite browser helpers for the new accessible names**

Map keys to `百分比`, `小數點`, `雙零`, `等於`, `加`, `減`, `乘`, `除`, and use `全部清除` instead of the removed `清除算式`. Keep all locators scoped to `#ledgerCalculatorSheet` where duplicate names are possible.

- [ ] **Step 2: Add failing end-to-end scenarios**

Cover these exact flows:

```js
// decimal and floor
await enter(['1','5','1','2','.','9','=']);
await expect(result).toHaveText('1,512.9');
await expect(applyHint).toHaveText('將套用 ¥1,512');
await apply.click();
await expect(page.locator('#ledgerAmount')).toHaveValue('1512');

// contextual percent
await enter(['1','0','0','0','-','1','0','%','=']);
await expect(result).toHaveText('900');

// zero after floor differs by target
await enter(['0','.','9']);
await apply.click();
await expect(error).toHaveText('捨去後金額必須大於 0');
// discount target applies the same raw result as 0

// equals stays open; next digit resets; next operator continues
// top-right close and Cancel preserve original value
// background click does not close
```

Retain single target conversion refresh, multi-item total refresh, stale-safe target behavior covered by Node, focus restoration, scroll restoration, background inert, Escape, Tab loop, and no page errors.

- [ ] **Step 3: Run the focused Playwright file and capture RED**

Run:

```powershell
npx playwright test tests/browser/ledger-calculator.spec.js
```

Expected: FAIL until Task 2 runtime and updated accessible names fully match the browser workflow; if Task 2 already satisfies some cases, record the first genuinely behavior-related failure before any browser-driven runtime fix.

- [ ] **Step 4: Fix only observed calculator workflow defects**

Patch `index.html` only where the failing browser assertion demonstrates a mismatch. Do not alter Ledger draft creation, save, schema, Shopping link, repository, queue, tax, split or settlement code.

- [ ] **Step 5: Measure 320／375×844／390 geometry**

For each existing `WIDTHS` viewport, assert:

```js
{
  documentOverflow:false,
  entryOverflow:false,
  calculatorOverflow:false,
  panelInside:true,
  columns:4,
  minKeyWidthAtLeast44:true,
  minKeyHeightAtLeast48:true,
  closeTarget:[44,44]
}
```

At 320×700 also assert the sheet is vertically scrollable when required and both bottom actions remain reachable by `scrollIntoViewIfNeeded()`.

- [ ] **Step 6: Run focused Node and browser tests GREEN**

Run:

```powershell
node tests/ledger-calculator.test.js
npx playwright test tests/browser/ledger-calculator.spec.js
```

Expected: Node calculator PASS and all tests in the browser file PASS.

- [ ] **Step 7: Commit browser workflow coverage**

```powershell
git add -- index.html tests/browser/ledger-calculator.spec.js
git commit -m "test(ledger): cover decimal calculator workflows"
```

---

### Task 4: v94 release metadata, complete verification, and dev push

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js:27`
- Modify: `index.html:8683-8689`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: fully tested calculator runtime from Tasks 1–3.
- Produces: internally consistent v94 candidate and published `origin/dev` head.

- [ ] **Step 1: Update version strings and release notes**

Set:

```js
// app-version.js
var APP_VERSION='v94';

// sw.js
var SW_VERSION='v94';
```

Prepend an `APP_RELEASE_NOTES` entry dated `2026-08-08`, title `計算金額更直覺`, with four user-facing points: reference-layout keypad, decimal/percent, equals preview, and floor-at-apply notice. Keep the current five-entry rolling window by removing the oldest entry after prepend.

- [ ] **Step 2: Update delivery documents**

Prepend v94 to `07_CHANGELOG.md`. Update `tasks/current.md` dev candidate to v94, add v94 as delivered, move the SW update-notice pair to v95／v96, update the cumulative candidate range, and later replace verification counts with the exact final command totals. Update `tests/README.md` calculator coverage. Do not modify `netlify.toml`.

- [ ] **Step 3: Run static gates**

Run:

```powershell
git diff --check
node tools/check-doc-titles.js
node tools/check-app-version.js
```

Expected: all exit 0 and version check reports v94.

- [ ] **Step 4: Run every Node test file**

Run:

```powershell
$files=Get-ChildItem tests -Filter *.test.js | Sort-Object Name
$passed=0
foreach($file in $files){
  node $file.FullName
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $passed++
}
Write-Output "NODE_TEST_FILES=$passed"
```

Expected: every file exits 0; record the printed exact file count in `07_CHANGELOG.md` and `tasks/current.md`.

- [ ] **Step 5: Run the complete Playwright suite**

Run:

```powershell
npm run test:browser
```

Expected: all tests pass; record Playwright's exact passed count in `07_CHANGELOG.md` and `tasks/current.md`.

- [ ] **Step 6: Re-run final gates after recording counts**

Run:

```powershell
git diff --check
node tools/check-doc-titles.js
node tools/check-app-version.js
git status --short
git diff --stat
git diff
```

Confirm only the files in the File Map changed, except `index.html` runtime locations naturally share the single file. Confirm `sw.js` diff changes only `SW_VERSION`, `PERSONAL_STATE_VERSION` remains 9, and `netlify.toml` is untouched.

- [ ] **Step 7: Commit v94 delivery**

```powershell
git add -- app-version.js sw.js index.html tests/ledger-calculator.test.js tests/browser/ledger-calculator.spec.js tests/README.md 07_CHANGELOG.md tasks/current.md
git commit -m "feat(ledger): enhance amount calculator for v94"
```

- [ ] **Step 8: Verify commit state and push dev**

Run:

```powershell
git status --short
git log -6 --oneline
git push origin dev
git rev-parse HEAD
git rev-parse origin/dev
```

Expected: working tree is clean, push succeeds, and local HEAD equals `origin/dev`. Do not deploy, tag, merge, or modify `main`.

- [ ] **Step 9: Hand off to the next architecture slice**

After v94 is pushed, begin a new read-only Pre-Work Gate for `Ledger UI workflow/state`. Treat it as an independent design/characterization slice; do not append architecture refactors to the already-pushed calculator commit.
