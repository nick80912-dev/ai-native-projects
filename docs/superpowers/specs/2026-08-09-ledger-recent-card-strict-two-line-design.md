# Ledger Recent Card Strict Two-Line Design

## Goal

Keep every personal and shared recent-expense card at exactly two content rows while preserving all existing information, status semantics and right-side amounts.

## Approved Order

### First row

`品項名稱 → 付款方式 → 個人代購／團體付款與分攤`

- Item name is the primary flexible field.
- Payment method follows as compact plain metadata.
- Personal proxy context keeps its existing coral-family meaning; shared payer/allocation context uses the original neutral locked-tag palette.

### Second row

`店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次`

- Store and category remain plain metadata in the approved order.
- Tax-free, TEST, pending-sync and lock/correction statuses remain compact tags.
- Pending sync keeps the original yellow pending palette.
- Shared payer/allocation, locked and corrected tags use the original neutral `line-soft`/`ink-soft` palette.
- Locked and corrected remain mutually exclusive under the existing rule; no wording or state calculation changes.

## Strict Height and Truncation Contract

- `.ledger-recent-main` contains exactly two visible content rows.
- Neither row wraps at 320, 375 or 390px.
- Item, store/category text and long personal/shared context may shrink and use an ellipsis.
- Status tags may shrink with ellipsis rather than create a third row or horizontal overflow.
- Amounts and the action menu remain outside the two-row content area in their existing right-side columns.
- Batch parent cards are unchanged; expanded child records use the same two-row recent-record renderer.

## Presentation Structure

`renderLedgerRecentRecord(record, shared, currency)` will build:

1. `.ledger-recent-primary-line` containing item, payment and proxy/shared context.
2. `.ledger-recent-secondary-line` containing store/category metadata and an ordered `.ledger-recent-statuses` strip.

The old lower `.ledger-recent-badges` row and `has-badges` layout branch are removed from recent-record output. Existing state values still come from `record.pending`, `isTestLedgerRecord(record)`, correction protection/count and `ledgerRecordMetadata(record).isTaxFree`.

## Edge Cases

- Missing payment omits only the payment field; context remains after the item.
- Missing store keeps category.
- Missing category keeps store.
- Missing store and category leaves the status strip as the second row; the row itself remains present to preserve the two-row card contract.
- Records without any status still retain the second metadata row without an empty third element.
- Long content is visually truncated only; accessible DOM text remains complete.

## Architecture and Data Boundaries

- Modify only the existing recent-card renderer and adjacent CSS.
- Do not change `ledgerSharedRecordParticipantLabel()`, proxy calculations, participant parsing or any status condition/wording.
- Do not change Ledger domain, repository, Queue, Apps Script, settlement, correction, schema, CSV, localStorage, backup formats or Shopping cards.
- Do not add a generic renderer/module for this local presentation transformation.
- Keep `app-version.js` and `sw.js` at v98.

## Test Contract

- Node tests execute the real renderer and verify exact first/second-row order, neutral/yellow class assignment, locked/corrected exclusivity, missing-field fallbacks and absence of the old third-row container.
- Browser tests render long personal/shared fixtures at 320, 375 and 390px and verify:
  - exactly two content rows;
  - both rows are single-line and clipped/ellipsized when needed;
  - card height stays compact and stable;
  - no document, row, body or text/amount overlap;
  - computed neutral and pending colors match the existing palettes;
  - no page errors.
- Adjacent proxy, list-action and mobile-hotfix tests must stay green after updating their expected layout contract.

## Delivery Boundary

Commit and push `dev` for device acceptance. Do not merge `main`, deploy Netlify or create a production tag.
