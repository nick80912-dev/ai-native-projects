# Ledger Recent Card Metadata Layout Design

## Goal

Refine the recent-expense cards without changing Ledger data or behavior:

1. Shared records show the existing payer and allocation summary beside the item name, matching the placement and compact visual weight of the personal proxy summary.
2. Personal and shared records show category immediately after the store name instead of in the payment metadata row.

## Current Behavior

`renderLedgerRecentRecord(record, shared, currency)` currently:

- renders personal proxy context inside `.ledger-item-title-row`;
- renders shared payer/allocation context as a lower `.ledger-recent-badge`;
- renders store name on `.ledger-recent-store`;
- renders category and payment method together on `.ledger-recent-meta`.

This makes equivalent item context occupy different vertical locations and separates category from the store it describes.

## Approved Presentation Contract

### Item title row

- Personal proxy records keep the existing `幫 [對象] 買` markup and behavior unchanged.
- Shared records render the existing `ledgerSharedRecordParticipantLabel(...)` result beside the item name in `.ledger-item-title-row`.
- The shared inline summary uses its own semantic class and the same compact badge tokens as the proxy target name.
- The old lower shared payer/allocation badge is removed so the information appears exactly once.
- Pending, TEST, correction, locked-account and tax-free badges remain in the lower badge row unchanged.

### Store and category row

- With both values: `店家 · [emoji] 類別`.
- With only a store: `店家`.
- With only a category: `[emoji] 類別`.
- With neither: omit the row.
- This rule applies equally to personal and shared single-record cards, including child records expanded from a batch.

### Remaining metadata

- `.ledger-recent-meta` retains payment method only.
- If payment method is absent, omit the metadata row instead of rendering an empty element.
- Amounts, selection, card/detail actions, batching, history grouping and record ordering are unchanged.

## Implementation Choice

Modify the existing `renderLedgerRecentRecord()` markup and its adjacent card CSS. Do not create a new renderer or generic metadata module: the change is local to one presentation function, and extraction would expose an interface as large as the implementation. Do not use CSS visual reordering because DOM and assistive-technology reading order must match the visible hierarchy.

## Data and Architecture Boundaries

- No changes to Ledger domain calculations, participant parsing or `ledgerSharedRecordParticipantLabel()` wording.
- No changes to repositories, Queue, Apps Script, settlement, correction, schema, CSV, localStorage or backup formats.
- No changes to personal proxy semantics or Shopping cards.
- No DOM renderer module extraction and no runtime version allocation; `app-version.js` and `sw.js` remain v98.

## Characterization and Acceptance Tests

- Node renderer tests execute the real `renderLedgerRecentRecord()` and prove:
  - shared context is inside `.ledger-item-title-row` and absent from lower badges;
  - personal and shared store/category rows use the approved order;
  - payment metadata no longer contains category;
  - missing store still preserves category.
- Browser regression uses real recent-card rendering for personal and shared tracks and proves:
  - the visible text hierarchy and no duplicated shared context;
  - category follows store;
  - 320, 375 and 390px widths have no document, row, title or amount overlap;
  - no page errors.
- Run adjacent Ledger dashboard, proxy-inline and list-action tests, then the complete Node and Playwright gates before delivery.

## Delivery Boundary

Commit and push `dev` only. Do not merge `main`, deploy Netlify or create a production tag.
