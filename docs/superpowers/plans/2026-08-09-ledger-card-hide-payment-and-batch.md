# Ledger Payment-Free List Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide payment method from all personal/shared Ledger list cards while keeping single records and multi-item batch parents at exactly two left-aligned rows with fixed right-side amounts.

**Architecture:** Keep the change inside the existing `renderLedgerRecentRecord()` and `renderLedgerBatchCard()` presentation seams plus adjacent CSS. Remove only list-card use of `record.payMethod`; preserve the record field, expense detail, payment filters and every Ledger data/domain boundary.

**Tech Stack:** Vanilla JavaScript and CSS in `index.html`, Node `assert`/`vm` renderer tests, Playwright Chromium regression tests.

## Global Constraints

- Single first row: `品項名稱 → 個人代購／團體付款與分攤`.
- Single second row: `店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次`.
- Personal batch parent: receipt title/chevron, then item/tax-free/proxy counts.
- Shared batch parent: receipt title plus `[付款人]付款 · 分攤依品項`, then item/tax-free counts.
- Both content rows are left-aligned; inline content and the two-row block are vertically centered; dual-currency amounts remain fixed on the right.
- No list card renders payment method. Expense detail and history payment filters retain it.
- Do not change Ledger domain, repository, Queue, Apps Script, settlement, correction, schema, CSV, localStorage, backup formats or Shopping UI.
- Keep `app-version.js` and `sw.js` at v98.
- Deliver to `dev` only; do not merge `main`, deploy Netlify or create a production tag.

---

### Task 1: Lock single-record payment hiding and detail preservation

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/browser/data-observability.spec.js`

**Interfaces:**
- Executes the real `renderLedgerRecentRecord(record, shared, currency)` implementation.
- Opens the real `openLedgerRecordDetail(id)` flow through a rendered card.
- Observes card DOM only; the stored `payMethod` value remains unchanged.

- [ ] **Step 1: Add failing Node renderer assertions**

For personal and shared records whose literal `payMethod` is `現金`, assert:

```js
assert(!renderedRecord.includes('ledger-recent-payment'));
assert(!renderedRecord.includes('現金'));
assert(renderedRecord.indexOf('章魚燒')<renderedRecord.indexOf('ledger-proxy-target-summary'));
assert(renderedSharedRecord.indexOf('團體晚餐')<renderedSharedRecord.indexOf('ledger-shared-participant-summary'));
```

Keep the existing second-row status-order assertions. The mutations caught are reintroducing payment text, placing context before item, or dropping the existing status hierarchy.

- [ ] **Step 2: Run the Node test and verify RED**

Run: `node tests/ledger-225.test.js`

Expected: FAIL because current production emits `.ledger-recent-payment` and `現金` in each primary row.

- [ ] **Step 3: Add failing Browser card/detail assertions**

In `tests/browser/data-observability.spec.js`, keep `payMethod:'現金'` in fixtures and assert both personal/shared cards omit it:

```js
await expect(personal.locator('.ledger-recent-payment')).toHaveCount(0);
await expect(personal).not.toContainText('現金');
await expect(shared.locator('.ledger-recent-payment')).toHaveCount(0);
await expect(shared).not.toContainText('現金');
```

Click the personal card body and verify detail still exposes the stored value:

```js
await personal.locator('.ledger-recent-body').click();
const detail=page.getByRole('dialog',{name:'消費明細'});
await expect(detail.locator('.ledger-detail-row').filter({hasText:'支付方式'})).toContainText('現金');
await detail.getByRole('button',{name:'關閉'}).click();
```

- [ ] **Step 4: Run the Browser test and verify RED**

Run: `npx playwright test tests/browser/data-observability.spec.js`

Expected: FAIL because card output still contains `現金`; the detail assertion documents the preservation boundary.

### Task 2: Lock personal/shared batch parent summaries

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/browser/proxy-inline.spec.js`
- Modify: `tests/browser/data-observability.spec.js`
- Modify: `tests/ledger-mobile-hotfix.test.js`

**Interfaces:**
- Executes the real `renderLedgerBatchCard(records, shared, currency)` implementation.
- Reuses existing member encounter order and `ledgerRecordMetadata()` count calculation.
- Produces no new data/domain helper.

- [ ] **Step 1: Add failing Node batch assertions**

Use literal personal, single-payer shared, multi-payer shared and missing-payer fixtures. Assert:

```js
assert.strictEqual((renderedBatch.match(/ledger-recent-primary-line/g)||[]).length,1);
assert.strictEqual((renderedBatch.match(/ledger-recent-secondary-line/g)||[]).length,1);
assert(renderedBatch.includes('2 個品項'));
assert(!renderedBatch.includes('現金'));
assert(sharedBatch.includes('Amy付款 · 分攤依品項'));
assert(multiPayerBatch.includes('Amy、Bar付款 · 分攤依品項'));
assert(missingPayerBatch.includes('分攤依品項'));
assert(!missingPayerBatch.includes('未指定付款'));
```

For the missing-payer assertion, inspect only `.ledger-batch-body` output and keep child rendering collapsed so child labels cannot satisfy the parent expectation.

- [ ] **Step 2: Add failing source/mobile contract assertions**

Update `tests/ledger-mobile-hotfix.test.js` to require both recent and batch bodies to use the two-row main layout, vertical centering and amount clearance:

```js
assert(/\.ledger-recent-body \.ledger-recent-main,\.ledger-batch-body \.ledger-recent-main\{[^}]*display:grid[^}]*grid-template-rows:repeat\(2,minmax\(0,auto\)\)/.test(html));
assert(/\.ledger-recent-body,\.ledger-batch-body\{[^}]*align-items:center/.test(html));
```

- [ ] **Step 3: Add real Browser batch geometry assertions**

Extend the personal batch fixture in `tests/browser/proxy-inline.spec.js` and a shared batch fixture in `tests/browser/data-observability.spec.js`. At 320, 375 and 390px assert each parent:

- contains exactly two main-row children;
- has `white-space: nowrap` rows and ellipsis-capable flexible title/summary;
- contains no `.ledger-recent-payment`, `現金` or other payment-method text;
- keeps its total amount to the right without overlap;
- keeps expanded child cards indented and individually two-row;
- shared parent contains `Amy付款 · 分攤依品項`, while children retain their precise `Amy付款 · 2 人分攤`/`全員分攤` text.

- [ ] **Step 4: Run batch-focused tests and verify RED**

Run:

```powershell
node tests/ledger-225.test.js
node tests/ledger-mobile-hotfix.test.js
npx playwright test tests/browser/proxy-inline.spec.js tests/browser/data-observability.spec.js
```

Expected: FAIL because batch parents still emit three metadata elements, include payment summaries and have no shared `分攤依品項` context.

### Task 3: Implement minimal single and batch presentation changes

**Files:**
- Modify: `index.html`
- Modify: `tests/README.md`

**Interfaces:**
- `renderLedgerRecentRecord(record, shared, currency)` stops rendering `paymentMarkup` but retains all other markup/state conditions.
- `renderLedgerBatchCard(records, shared, currency)` renders the approved two-row parent and derives only a display string from existing `members`.
- CSS scopes the strict two-row contract to `.ledger-recent-body` and `.ledger-batch-body`.

- [ ] **Step 1: Remove single-card payment markup**

Delete the card-only `paymentMarkup` variable and its insertion between `.ledger-recent-detail` and proxy/shared context. Do not remove any read of `record.payMethod` outside the recent-record renderer.

- [ ] **Step 2: Build the shared batch context**

After the existing unique member collection, derive:

```js
var sharedContext=shared?(members.length?members.join('、')+'付款 · 分攤依品項':'分攤依品項'):'';
var sharedContextMarkup=shared?'<span class="ledger-shared-participant-summary ledger-recent-context"><span class="ledger-recent-badge">'+escapeHtml(sharedContext)+'</span></span>':'';
```

Do not read or concatenate `payments` for card output.

- [ ] **Step 3: Render the batch parent as two rows**

Produce:

```html
<span class="ledger-recent-main">
  <span class="ledger-recent-line ledger-recent-primary-line">
    <span class="ledger-recent-detail"><strong>title + chevron</strong></span>
    sharedContextMarkup
  </span>
  <span class="ledger-recent-line ledger-recent-secondary-line">
    <span class="ledger-recent-location">count summary</span>
  </span>
</span>
```

Keep receipt totals, selection control, expansion behavior, menu behavior and child indentation unchanged.

- [ ] **Step 4: Extend the strict CSS contract to batch bodies**

Scope the existing two-row grid to both body types, set body-level `align-items:center`, preserve `min-width:0`, and let `.ledger-recent-detail`/`.ledger-recent-location` provide left-aligned ellipsis. Do not change `.ledger-batch-children` indentation.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-225.test.js
node tests/ledger-dashboard.test.js
node tests/ledger-list-actions.test.js
node tests/ledger-mobile-hotfix.test.js
npx playwright test tests/browser/data-observability.spec.js tests/browser/proxy-inline.spec.js
```

Expected: all pass with payment hidden only on list cards, detail preserved, strict two-row batch parents and no page errors.

- [ ] **Step 6: Update test inventory and commit**

Document the card/detail and batch coverage in `tests/README.md`, run `git diff --check`, then commit:

```powershell
git add index.html tests/ledger-225.test.js tests/ledger-mobile-hotfix.test.js tests/browser/data-observability.spec.js tests/browser/proxy-inline.spec.js tests/README.md
git commit -m "fix(ledger): hide payment on list cards"
```

### Task 4: Governance, full verification and delivery

**Files:**
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`
- Modify: `tasks/done.md`

**Interfaces:**
- Records the approved presentation contract and unchanged v98/data boundaries.
- Keeps TEST localStorage prefix isolation as the next backlog item.

- [ ] **Step 1: Update governance documents**

Record payment-free list cards, the batch parent/child hierarchy, left/vertical alignment, detail/filter preservation, TDD evidence and unchanged runtime/data layers. Set `.ai-manifest.json` to the next documentation revision without changing App/SW v98.

- [ ] **Step 2: Run complete gates**

Run all 80 top-level `tests/*.test.js`, full Playwright, document-title, app-version, runtime-asset and JSON checks, then `git diff --check`.

- [ ] **Step 3: Commit documentation**

```powershell
git add 07_CHANGELOG.md 08_AI_HANDOVER.md .ai-manifest.json tasks/current.md tasks/done.md
git commit -m "docs(ledger): record payment-free list cards"
```

- [ ] **Step 4: Verify final HEAD and push**

Re-run full Node and Playwright gates on the committed HEAD. Fetch `origin`, confirm `origin/dev` remains an ancestor with no remote-only commits, push `dev` without force, and confirm local HEAD equals `origin/dev`.
