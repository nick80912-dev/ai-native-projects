# Shopping Ledger Status and Action Design

## Goal

Make the Shopping item detail describe ledger progress without implying that the personal Shopping list is a group-member list. Merge the ledger summary into the existing Shopping `狀態` row, use `筆` as the only progress unit, and make the footer action state match the existing Buy-to-Ledger safety rules.

## Confirmed Meaning

- Shopping items remain personal, local records.
- A Shopping item can contain one or more allocations: the user's own item or buy-for allocations.
- The progress count represents allocations that would become Ledger item records. It does not represent payers, shared Ledger participants or group members.
- Payer and allocation choices remain inside the Ledger entry form. Shopping does not infer or display them as ledger-progress identities.
- User-facing progress copy must not use `位` or `對象`.

## Approved Detail Layout

Remove the standalone `記帳進度` detail row. The existing `狀態` row becomes the single summary location and keeps this order:

`採買狀態 → 記帳摘要`

The two parts are separated by ` · `.

Examples:

- single unlinked allocation: `已買 · 未記帳`;
- single linked allocation: `已買 · 已記帳`;
- single unverified allocation: `已買 · 待確認`;
- multiple allocations without unverified links: `已買 · 已記帳 1／3 筆`;
- multiple allocations with mixed verification: `已買 · 已記帳 1 · 待確認 1 · 未記帳 1`.

`待買` replaces `已買` in the same first position when the Shopping item is not completed. The ledger summary remains derived from the existing three-state inspection; no status string is persisted.

## Allocation Detail Contract

The `代購對象與記帳紀錄` section remains below the summary row because it is the inspection and recovery surface for each allocation.

- Each allocation keeps its existing target/name and quantity description.
- Each allocation continues to show `已記帳`, `狀態待確認` or `未記帳`.
- Linked allocations remain navigable to their Ledger detail and retain `改回未記帳`.
- This section may use `對象` in its existing buy-for meaning; only ledger-progress counts and actions must stop describing counts as people or unfinished objects.

## Approved Footer Action Matrix

The footer action must reflect what the existing Buy-to-Ledger workflow can safely do before the user presses it.

| Derived state | Secondary action | Behavior |
| --- | --- | --- |
| One unlinked allocation, no unverified allocation | `記帳` | Opens the existing Ledger draft workflow. |
| Multiple allocations, all unlinked, no unverified allocation | `記帳` | Opens the existing Ledger draft workflow with all unlinked allocations. |
| Some linked and one or more unlinked, no unverified allocation | `繼續記帳（剩 N 筆）` | Opens the existing workflow with the remaining unlinked allocations. |
| Any unverified allocation and one or more unlinked allocations | `等待狀態確認` | Disabled; the detail explains that synchronization must finish before continuing. |
| Any unverified allocation and no unlinked allocation | `等待狀態確認` | Disabled; no duplicate-entry path is exposed. |
| All allocations linked | none | `編輯` uses the existing single-action footer layout. |

When the waiting action is shown, add adjacent explanatory copy:

`有 N 筆仍在確認同步狀態，完成後才能繼續，避免重複記帳。`

The number `N` is the existing derived `unverified` count. No timeout, retry or automatic release is introduced.

## Contradiction Removed

Today the footer action appears whenever any allocation is unlinked, even when another allocation is unverified. Pressing it then reaches the existing workflow guard and is rejected. The approved design moves that guard result into the visible action state so the sheet no longer advertises an action that it cannot perform.

## Architecture and Data Boundaries

- Keep `buy-to-ledger.js` as the authority for `linked`, `unverified`, `unlinked`, totals and the existing workflow preflight.
- Derive summary copy and the footer action from the existing `inspectItem()` result at the Shopping detail presentation seam.
- Do not persist UI labels or introduce a second ledger-link state calculation.
- Do not change Shopping store, photo repository, Buy-to-Ledger domain behavior, Ledger records, schema, localStorage, backup format, Apps Script or DOM renderer architecture.
- Do not change list-card behavior or the Shopping tab/selection/form/photo/detail return lifecycle.
- Keep `app-version.js` and `sw.js` at v98; this UX refinement does not claim v99.

## Accessibility and Interaction

- The merged `狀態` value must remain text in the existing detail definition list and be announced as one coherent value.
- A waiting button uses the native `disabled` attribute, not only disabled styling.
- The explanatory message remains visible text and is not conveyed by color alone.
- Existing linked-record navigation, edit, close and return behavior must remain unchanged.

## Test Contract

Characterization and renderer tests execute the real Shopping detail model/renderer and verify:

- the standalone `記帳進度` row is absent;
- the `狀態` row contains purchase state followed by the correct ledger summary;
- all progress counts use `筆`, never `位` or `記帳未完成對象`;
- single linked, unlinked and unverified states use the approved short copy;
- multiple all-unlinked, partial, all-linked and mixed-unverified summaries are deterministic;
- the footer action follows every row of the approved matrix;
- mixed unverified/unlinked state produces a natively disabled waiting action and does not expose a callable ledger-entry button;
- the waiting explanation uses the derived unverified count;
- allocation-level linked navigation and release actions remain available;
- detail return, edit, Ledger draft opening and adjacent Shopping tests remain green.

A browser characterization covers the mixed unverified/unlinked detail state so the previously contradictory clickable action cannot regress.

## Delivery Boundary

After implementation and full verification, commit and push `dev` for device acceptance. Do not merge `main`, deploy Netlify or create a production tag.
