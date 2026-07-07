# Trip Filter And Shop Wants Collapse Design

Date: 2026-07-07
Status: Design approved for planning
Scope: Low-risk UI/UX improvements for Trip and Shopping tabs

## Purpose

This design covers two small travel-time usability improvements:

1. Add a lightweight Trip tab filter so completed itinerary items can be hidden.
2. Make the Shopping tab want-list collapsible so it does not push floor controls too far down.

Both changes are UI-only. They do not alter Google Sheet schema, parser behavior, navigation, validator behavior, or CMS data.

## Proposal 1: Trip Completed Filter

Use a two-state filter on the Trip tab:

```text
顯示全部 / 隱藏已完成
```

The default state is `顯示全部`.

This is preferred over a three-state `全部 / 未完成 / 已完成` filter because the trip-time need is to quickly see what remains. It is smaller on mobile, simpler to operate, and avoids adding an extra completed-only empty state.

## Trip Filter Behavior

- The filter appears inside the Trip tab, below the day header or near the daily progress line.
- `顯示全部` shows all items for the current day.
- `隱藏已完成` hides items whose IDs exist in the existing `trip_checks` state.
- Checking or unchecking an item keeps the current filter mode active.
- If all actionable items are hidden, show a small empty state for that day.
- Day switching still works normally.
- The Today tab is not changed.

## Trip Filter State

Use memory-only UI state, such as:

```javascript
var tripHideDone = false;
```

Do not persist the filter in `localStorage` for the first version. It is a temporary viewing preference, not trip data.

## Proposal 2: Shopping Want List Collapse

Use Proposal A: collapsible want-list.

When a mall has wanted stores, show a compact summary row:

```text
⭐ 想逛清單：5 家　展開
```

Clicking the row toggles the full wanted-store list. This keeps the existing “want-list above floors” model while preventing a long list from dominating the first screen.

## Shopping Want List Behavior

- No wanted stores: keep existing behavior and do not show a want-list block.
- At least one wanted store: show the summary row.
- Default state: collapsed.
- Click summary row: expand full wanted-store list.
- Click again: collapse.
- Adding or removing wanted stores does not reset the current mall’s open / closed state.
- Floor expand / collapse state is independent and must continue to work.
- Search mode remains focused on search results and does not need the collapsible want-list.

## Shopping Want State

Use memory-only UI state, keyed by mall PID:

```javascript
var shopWantListOpen = {};
```

Use `p.placeId` when available. Fall back to the existing mall index only if a PID is missing. Do not write this open / closed state to `localStorage`.

## Data And Architecture Rules

- Do not change `schema.js`.
- Do not change `validator.js`.
- Do not add Google Sheet columns.
- Do not alter `toggleCheck()` storage behavior.
- Do not alter `toggleWant()` storage behavior.
- Do not change Shopping data structure.
- Do not change Today next-stop behavior.
- Do not introduce packages or a build step.
- Prefer existing UI classes and add only small CSS if needed.

## Acceptance Criteria

Trip tab:

- Default Trip tab shows all itinerary items.
- Enabling `隱藏已完成` hides checked items.
- Disabling it restores the full list.
- Checking or unchecking an item keeps the current filter mode.
- If all actionable items are complete, hidden mode shows a reasonable empty state.
- Day switching still works.
- Today, Shopping, Split, sync, schema, and validator behavior are unaffected.

Shopping tab:

- With no wanted stores, the want-list does not add extra UI.
- Adding the first wanted store shows a compact summary row.
- Summary row defaults to collapsed.
- Clicking summary expands the full wanted-store list.
- Clicking again collapses it.
- Count updates after adding or removing stores.
- Want-list open state survives `toggleWant()` re-render.
- Floor open state still works.
- Search mode still works.

## Implementation Order

1. Implement Trip completed filter.
2. Verify Trip tab behavior and Today tab non-regression.
3. Implement Shopping want-list collapse.
4. Verify Shopping floor and search behavior.
5. Update `07_CHANGELOG.md`.
