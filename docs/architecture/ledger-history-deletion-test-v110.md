# Ledger History View Deletion Test — v110

**Decision:** Rejected. Do not create `ledger-history-view.js` in v110.

## Scope

This deletion test evaluates only Ledger history presentation. Entry, settlement, calculator, correction, repositories, Queue behavior, record semantics, and `ledger-ui-state.js` are unchanged.

The candidate interface was constrained to:

```js
LedgerHistoryView.buildModel(records,state,options)
LedgerHistoryView.render(model,helpers)
LedgerHistoryView.actionFor(target)
```

The seam is acceptable only if deleting it would redistribute at least two independent presentation rules across at least two callers. A pass-through module or an interface that imports DOM, storage, repository, or global state does not qualify.

## Current Ownership Inventory

| Current unit | Knowledge it owns | DOM | Storage / repository | Existing module |
|---|---|---|---|---|
| `ledgerHistoryFilteredRecords(records)` | Maps the current query, category, payment, proxy, and tax state into the existing pure filter helper | None | Reads session-only `ledgerUiState`; no storage or repository access | Filter values are normalized by `TripLedgerUiState` |
| `renderLedgerHistoryGrouped(records, shared, currency)` | Empty state, date/category grouping, batch-vs-single row choice | None | None | Reads normalized `historyGrouping` |
| `renderLedgerFullHistory(records, shared, currency)` | Initial history shell, filter controls, summary, selection header, grouped result slot | Returns HTML only | Reads category/payment option stores and session state; no writes | Uses `activeHistoryFilterCount()` |
| `renderLedgerHistoryResults()` | Partial DOM refresh after a state effect; updates results, summary, filter badge, clear button, and selection toolbar | Direct `getElementById`, class and `innerHTML` effects | Reads `ledgerTrackRecords()` and settings; does not mutate records | Called only by the existing `render-history-results` workflow effect |
| `updateLedgerHistoryPillState()` / `setLedgerHistoryGrouping()` | Focus-preserving partial control synchronization | Direct `querySelectorAll` and class/ARIA effects | None | Dispatches semantic actions before DOM synchronization |
| `renderLedgerRecentRecord()` / `renderLedgerBatchCard()` | Record and batch presentation, selection state, amount layout, action launcher | Returns HTML only | No repository writes; depends on established Ledger domain/display helpers | Reads session selection and expanded-batch state |
| `openLedgerRecordActions()` / `ledgerRecordActionModel()` | Availability of edit, correction, delete, and read-only explanations | Creates/removes the action popover | Reads current records/member through existing domain boundaries | Action availability is already centralized in one model helper |

The production effect adapter remains explicit in `index.html`: `TripLedgerUiState.createWorkflow()` commits state first, then calls `renderLedgerHistoryResults()` or `syncLedgerHistoryFilterPanel()`.

## Deletion Result

The candidate fails the leverage test:

1. Filtering is already centralized in `ledgerHistoryFilteredRecords()` and the underlying pure `filterLedgerHistory()` helper. The two render paths call the same rule; they do not independently reimplement it.
2. Grouping and empty-state selection are already centralized in `renderLedgerHistoryGrouped()`. Moving that function behind `buildModel()` would rename the boundary without removing caller knowledge.
3. Selection invariants and effect ordering already belong to `ledger-ui-state.js`. Recreating them in a view model would duplicate the accepted ADR 0010 seam.
4. Row actions depend on existing Ledger domain policy, receipt/correction protection, current-member visibility, batch rules, and DOM popover placement. A new `actionFor()` would either duplicate `ledgerRecordActionModel()` or require a broad helper surface with no independent behavior.
5. `renderLedgerHistoryResults()` is intentionally a DOM adapter for focus-preserving partial updates. Moving its element lookup and patching into a pure renderer would violate the candidate constraints; leaving them in place means the proposed module does not remove that complexity.

Deleting a hypothetical `ledger-history-view.js` would therefore restore, at most, thin calls around helpers that already exist. It would not redistribute two independent rules across two callers. The module would be shallower than its dependency interface and would add a second presentation authority.

## Outcome

- Keep `ledger-ui-state.js` as the sole Ledger history/session state and ordered-effect authority.
- Keep the real DOM adapter and current presentation helpers in `index.html`.
- Do not add a Ledger store, controller, event bus, framework, or runtime asset.
- Re-evaluate only when a future feature creates demonstrable duplicated history presentation policy across multiple production callers. That work requires its own characterization evidence and approved plan.

Verification at decision time: `node tests/ledger-ui-state.test.js` passes.
