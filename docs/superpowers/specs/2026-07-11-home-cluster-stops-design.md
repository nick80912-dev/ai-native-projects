# Home Cluster Stops Design

Date: 2026-07-11
Status: Approved for implementation

## Scope

The Today screen may replace one next-stop ticket with a compact cluster ticket when the selected itinerary row is a parent row followed by two or more child stop rows. The full itinerary screen remains a per-stop view.

## Behavior

- A cluster is derived only from existing parent/child itinerary structure. It does not infer clusters from distance or walking time.
- The collapsed ticket shows the parent activity name, its child-stop names, the scheduled range, child count, and the active child stop.
- Its disclosure control reads `展開該區串點`; when open it reads `收合該區串點`.
- Expanded child rows expose their existing navigation, parking, and information actions when source data exists.
- The collapsed Complete and Skip controls operate on the active child stop and include that stop name in their labels.
- A child stop becomes automatically skipped when the following child stop's scheduled start time has arrived and that child has not been completed or manually skipped. The skipped row remains visible in the expanded cluster as `⏱ 自動略過`.
- If every child is cleared, the parent is marked complete locally so the existing next-stop flow advances.

## Constraints

- Do not modify the Google Sheet schema, `schema.js`, `validator.js`, parser field contracts, or the full itinerary card layout.
- Persist progress only in the existing localStorage-backed next-stop state.
- Preserve existing auto-skip behavior for non-cluster next-stop items.
- Do not commit temporary visual mockups.

## Verification

- Regression tests cover cluster extraction, child auto-skip at the next child time, and parent completion after all child stops clear.
- The mobile preview shows the collapsed and expanded cluster states without overlapping controls.
