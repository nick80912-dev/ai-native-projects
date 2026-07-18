# Ledger 2.0 Dashboard, Quick Entry, Multi-item, and Proxy Design

## Goal

Replace the current ledger form-first page with a mobile-first dashboard and quick-entry workflow while preserving the PR 1-4 schema, repositories, tombstone deletion, participant snapshots, and settlement functions.

## Scope

This batch changes the ledger UI and adds UI-level pure helpers for dashboard selection, proxy statistics, date grouping, and multi-item allocation. It may update `index.html`, the next service-worker cache name, focused tests, `07_CHANGELOG.md`, `.ai-manifest.json`, and `tasks/current.md`.

The batch does not change `schema.js`, `validator.js`, Apps Script, BUILTIN data, Ledger field contracts, personal/shared storage ownership, or the PR 4 settlement algorithm. It does not deploy Netlify or push/merge `main`.

## Implementation Approach

Use one centralized ledger UI state with pure selectors and draft-allocation helpers inside the existing single-file application. The current repositories remain the only write paths:

- Personal records use `personalLedgerRepository` and remain local-only.
- Shared records use `ledgerRepository` and retain queue, retry, and cross-device behavior.
- Shared history uses `effectiveLedgerRecords()` so tombstones remain hidden.
- Settlement uses `buildMemberBalances()` and `buildTransferSuggestions()` without duplicating their math in the UI.

The rejected alternatives are keeping the legacy form beside the new dashboard, which would create two entry flows, and performing a broad component or repository rewrite, which would exceed the approved PR 5 scope.

## Ledger UI State

A single `ledgerUiState` owns ephemeral presentation state:

- active track: `personal` or `shared`, defaulting to `personal`;
- displayed primary currency for the dashboard total;
- active page: dashboard or full list;
- personal list filter: all or proxy;
- open sheet and selected record;
- quick-entry draft, including single-item and multi-item data;
- retained participant selection after `save and add another`.

None of these display choices rewrites stored records. Switching the dashboard primary currency only changes which existing total is rendered as the large amount.

## Dashboard

The ledger page renders in this order:

1. Existing TEST warning at the top when shared test mode is active.
2. Fixed copy: `個人帳留在本機；團體帳跨裝置同步。`
3. Status pill showing either `● JPY 1 ≈ TWD X` or, in shared mode with queued records, `● N 筆待同步`.
4. Main summary card containing the personal/shared segmented control, current record count, large primary-currency total, and smaller converted total.
5. Two compact cards: Today plus Proxy in personal mode, or Today plus Settlement in shared mode.
6. The latest 15 effective records, grouped by device-local calendar date.
7. A `查看全部` entry.
8. A `+` FAB above the fixed bottom navigation with safe-area spacing.

Recent rows show category, detail, payment method, amount, and time. Personal rows show a proxy badge when applicable. Shared rows show a participant summary and pending status when the record is still queued. Deleted shared records and tombstones do not appear.

The Today card uses the device-local date and reports that track's count and totals for the day. Historical grouping also uses the record timestamp converted to the device-local date, not a trip-day date.

## Proxy Statistics

Proxy behavior exists only in personal records through `isProxy` and `proxyTarget`.

- Enabling proxy requires a non-empty target of at most 12 characters.
- The target may be outside the registered trip members.
- Historical totals use each record's saved `member`; switching the current identity does not rewrite history.
- Current identity actual spending excludes proxy records paid by that identity.
- The Proxy card shows total proxy spending and can expand to subtotals grouped by target.
- Missing proxy fields in legacy personal records normalize to `false` and an empty target.
- Personal JSON export and restore continue to preserve the full personal ledger records, including these fields.

## Quick-entry Bottom Sheet

The FAB opens a bottom sheet in this order:

1. `新增消費` title.
2. Multi-item toggle.
3. Current identity.
4. Personal/shared track.
5. Currency.
6. Amount and live conversion for single-item mode.
7. Detail.
8. Category chips.
9. Payment chips.
10. Personal proxy controls or shared participant chips.
11. Note.
12. Save and `儲存並再記一筆` actions.

The sheet locks background scrolling while allowing internal scrolling and pinch gestures. Its scrollable content includes bottom safe-area padding so the software keyboard cannot permanently cover the save actions.

When shared entry opens without a retained draft, its participant chips default to all currently formal registered members. TEST-only identities are included only when the existing shared TEST mode allows them.

After `儲存並再記一筆`, the track, category, and payment method remain selected. Amount, detail, note, and personal proxy target are cleared. Shared participants may be retained, but the sheet must visibly state `沿用上一筆：N 人` until the user changes them.

Time simulation continues to block new ledger writes.

## Multi-item Draft

The bill-level draft contains:

- one currency;
- one payment method;
- tax mode: tax included, tax excluded, or tax-free;
- tax rate: 10% or 8% when applicable;
- one fixed discount in the bill currency;
- one note;
- default proxy settings for personal mode or default participants for shared mode.

Each item contains a stable draft key, name, original amount, independent category, and an optional item-level override:

- Personal: proxy on/off and proxy target.
- Shared: a custom participant snapshot.

An item without an override explicitly displays that it inherits the bill default. The override controls are collapsed by default to keep the 390px layout scannable. At least one item is required; every item requires a name, positive original amount, and valid category.

## Tax and Discount Definition

The approved definitions are:

- Tax included: item input amounts already contain tax; no tax is added.
- Tax excluded: add either 8% or 10% tax.
- Tax-free: no tax is added.
- Discount: one fixed whole-currency amount subtracted after tax, in the bill currency.
- Discount cannot exceed the post-tax bill total.

The paid total is a non-negative safe integer in the selected currency and must be greater than zero before saving.

## Largest-remainder Allocation

A new pure weighted largest-remainder helper allocates the paid total to items. It is separate from PR 4's equal participant allocation helper because the inputs and responsibility differ.

1. Build each item's exact post-tax basis without rounding.
2. Compute the exact bill basis and the rounded post-tax bill total.
3. Subtract the fixed discount to obtain the paid primary-currency total.
4. Allocate that paid total proportionally to the exact item bases.
5. Floor each unrounded allocation.
6. Distribute remaining smallest-currency units by descending fractional remainder; ties use item input order.
7. Convert the paid bill total once to the secondary currency.
8. Allocate the converted secondary total across items by the same weighted largest-remainder rule.

The saved item amounts therefore sum exactly to the bill total in both JPY and TWD. No reconciliation unit is dumped onto the largest item.

## Record Construction and Persistence

Before writing, the app builds and validates the complete list of expense records. Each record gets its own Record ID and all records share one generated `batchId`.

Personal multi-item saves are validated in full before any synchronous local writes. Shared multi-item records are all added synchronously to the existing repository queue before its asynchronous flush proceeds. The current repository already deduplicates by Record ID and flushes the queue in order. A network interruption may leave some or all records pending, but no unsent item is lost and retry remains idempotent.

Each saved item remains a normal expense. The first release deletes individual records only. Shared deletion creates the existing per-record tombstone and never creates a fuzzy batch tombstone.

## Settlement Panel

In shared mode, the compact Settlement card finds the current identity in the result of `buildMemberBalances()` and shows receivable, payable, or settled state. Expanding it renders:

- every member's paid, owed, and net amount;
- JPY transfer suggestions;
- TWD transfer suggestions;
- warnings for invalid expenses, including missing or malformed participants.

The UI formats the PR 4 result and does not recalculate balances or transfer ordering.

## Full List and Details

The full list remains inside the ledger tab and groups records by device-local date. Personal mode supports All and Proxy filters. Shared mode lists effective expenses only. Opening a record shows all persisted fields relevant to its track, including member, amounts, payment method, participants or proxy target, batch ID, note, time, and pending status.

Personal deletion remains a confirmed hard delete. Shared deletion uses the existing tombstone dialog with required reason and cross-device warning.

## Error Handling

- Validate identity, track, currency, item inputs, categories, payment method, participants, proxy targets, tax, discount, and safe integer totals before writes.
- Keep the bottom sheet open and focus or identify the invalid section after validation failure.
- Disable save actions while a save operation is being finalized.
- Personal save errors leave the draft intact.
- Shared records that cannot be delivered remain visible with pending state; the result message reports whether records synced or remain queued.
- Invalid settlement records remain excluded and their warnings remain visible in the expanded panel.

## Verification

Focused tests cover:

- dashboard track isolation, currency-display toggle, latest-15 selection, and local-date grouping;
- proxy validation, target subtotals, historical-member behavior, and actual-spending exclusion;
- tax-included, tax-excluded 8% and 10%, tax-free, fixed discount, largest-remainder ties, and exact two-currency sums;
- per-item proxy and participant overrides, unique Record IDs, shared `batchId`, and no partial personal writes after validation failure;
- shared queue behavior, tombstone visibility, and PR 4 settlement integration;
- full-list filters and details.

Run `node tools/check-doc-titles.js` and every `tests/*.test.js`. Browser QA uses a 390px viewport and verifies all four tabs with `pageerror=0`, keyboard-safe save actions, bottom safe area, internal sheet scrolling and pinch behavior, FAB placement, personal/shared isolation, offline personal save, and offline shared queueing.

## Service Worker and Rollback

Only the service-worker cache name advances from `v19` to `v20`; service-worker behavior and shell membership remain unchanged.

PR 5 is isolated from PR 1-4 contracts. If acceptance fails, revert the PR 5 implementation and cache bump. Existing personal data, shared Sheet rows, queue records, tombstones, and settlement behavior remain compatible with the prior UI.
