# Ledger List Cards Hide Payment and Multi-Item Design

## Goal

Remove payment-method text from personal and shared Ledger list cards so the two-line summary prioritizes item, proxy/allocation, location and status information. Payment method remains available in expense detail and existing history filters.

## Approved Single-Record Layout

Every single-record card keeps exactly two visible content rows and a fixed right-side amount column.

### First row

`品項名稱 → 個人代購／團體付款與分攤`

- Personal proxy context keeps the existing compact coral treatment.
- Shared payer/allocation context keeps the existing compact neutral treatment.
- Non-proxy personal records show only the item name.
- Payment method is not rendered on the card.

### Second row

`店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次`

- Existing status conditions, wording, order, mutual exclusivity and palettes remain unchanged.
- Store/category and status tags may truncate but may not wrap.

## Alignment and Amount Contract

- Both content rows are horizontally left-aligned.
- Inline text and tags within each row are vertically centered.
- The two-row content block is vertically centered in the card beside the amount column.
- Dual-currency amounts remain fixed on the right, right-aligned and vertically centered.
- Content must not overlap the amount or action columns at 320, 375 or 390px.
- Long item, context, store/category and status content uses ellipsis; no third content row is allowed.

## Approved Multi-Item Layout

Multi-item receipts use a batch parent for the receipt summary and expanded child cards for per-item detail.

### Collapsed personal batch parent

- First row: store/receipt title and expansion chevron.
- Second row: `N 個品項 → M 項免稅 → K 項代購`, omitting zero-count suffixes under the existing rules.
- Right side: receipt-level dual-currency total.
- No payment method appears.

### Collapsed shared batch parent

- First row: store/receipt title and a compact neutral summary: `[付款人]付款 · 分攤依品項`.
- If records contain multiple payers, join their existing member names with `、` before `付款`.
- If no payer name is available, show only `分攤依品項`; do not invent a member.
- Second row: `N 個品項 → M 項免稅`, omitting the tax-free suffix when zero.
- Right side: receipt-level dual-currency total.
- No payment method appears.

### Expanded batch children

- The batch parent remains visible and retains the same two-row summary.
- Child cards are indented through the existing batch-children structure.
- Every child uses the approved single-record two-row layout, including its own proxy or payer/allocation context, status tags and right-side item amount.
- Per-item allocation differences are intentionally disclosed only after expansion; the parent uses `分攤依品項` instead of concatenating every allocation.

## Surface Scope

The presentation rule applies to every list surface that uses `renderLedgerRecentRecord()` or `renderLedgerBatchCard()`:

- personal and shared dashboard recent cards;
- full-history result cards;
- expanded batch children;
- collapsed and expanded batch parents.

Expense detail continues to show payment method. Existing payment-method filters, entry/edit forms, records, exports and storage retain the field and behavior.

## Architecture and Data Boundaries

- Modify only the existing recent-record and batch-card presentation seams plus adjacent CSS.
- Remove card-level `paymentMarkup` and batch payment summaries rather than deleting or changing `record.payMethod`.
- Reuse existing batch member collection for payer names; do not add domain calculations or persisted summary fields.
- Do not change Ledger domain, repository, Queue, Apps Script, settlement, correction, schema, CSV, localStorage, backup formats or Shopping UI.
- Do not create a new generic renderer or state module for this presentation-only refinement.
- Keep `app-version.js` and `sw.js` at v98.

## Edge Cases

- A single record with no proxy/allocation context keeps the first row with only the item name.
- Missing store still preserves category; missing category still preserves store.
- A batch without store name retains the existing title fallback to first item detail or `多品項消費`.
- A shared batch with multiple payers displays unique payer names in their existing encounter order.
- A shared batch without a usable payer displays `分攤依品項` only.
- Batch children may have different allocations; the parent never claims they are identical.
- Hiding payment method must not remove it from accessible expense detail or history filter choices.

## Test Contract

- Node renderer tests execute the real single-record and batch renderers and verify:
  - no list card emits `.ledger-recent-payment` or payment-method text;
  - exact single-record first/second-row order remains intact;
  - personal/shared batch parents each expose exactly two content rows;
  - personal counts and shared `[付款人]付款 · 分攤依品項` summaries are correct;
  - multiple/missing payer fallbacks are deterministic;
  - expanded children retain per-item proxy/allocation and statuses.
- Browser tests render long personal/shared single and batch fixtures at 320, 375 and 390px and verify exactly two no-wrap rows, ellipsis, left alignment, vertical centering, right-side amount clearance, indentation and no page errors.
- Browser detail coverage verifies payment method remains visible after opening a record.
- Adjacent history filter, proxy, selection and batch expansion tests remain green.

## Delivery Boundary

After implementation and full verification, commit and push `dev` for device acceptance. Do not merge `main`, deploy Netlify or create a production tag.
