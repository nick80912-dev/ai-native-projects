# Itinerary Header Contract and Cluster Backlog Design

## Goal

Adopt `行程` as the only supported itinerary activity header throughout the Dev data contract, and record the approved parent/child itinerary-card corrections as high-priority follow-up work without implementing those grouping changes in this batch.

## Immediate Scope: Header Contract

- Change the itinerary `act` field header from `詳細行程` to `行程`.
- Bump the Schema version to `2.2 (2026-07-16)` in both Schema copies and the generated mapping document.
- Do not retain `詳細行程` as an alias; the Sheet contract has formally replaced it.
- Update both Schema copies used by the app: `schema.js` and the inline fallback Schema in `index.html`.
- Update the BUILTIN itinerary CSV header in `index.html` so offline fallback data satisfies the same contract.
- Update current Schema mapping and handover documentation that defines the seven itinerary columns.
- Preserve the field name `act`, positional seven-column parser behavior, rendered labels, itinerary data, and all unrelated Sheet contracts.

## Gate Behavior

The atomic snapshot structure gate continues to require all seven itinerary columns. A candidate with the exact `行程` header maps to `act` and may proceed to later validation. A candidate that still uses `詳細行程` does not satisfy the new contract and is blocked for missing required header `行程`; the obsolete header may also be reported as unknown.

## Tests

- Add a focused assertion that `buildHeaderMap()` maps `行程` to `act` with no blocker.
- Add a focused assertion that `詳細行程` does not map to `act` and produces a required-header blocker for `行程`.
- Assert the production Schema and BUILTIN CSV use `行程`.
- Run the atomic snapshot, PWA, parser/rendering, and full repository checks.

## High-Priority Follow-Up: Parent/Child Itinerary Cards

Record the following as one backlog item, separate from the Header implementation:

- When a parent row has a place or ID, represent that parent-row destination as the first child stop.
- Subsequent contiguous rows whose `行程` cell is blank become the second, third, and later child stops in order.
- A parent-row destination plus one later child stop is already two stops and must create a parent/child card.
- The parent card remains non-navigable and only controls expand/collapse.
- The first child derived from the parent row and every later child row are navigable to their exact full-itinerary cards.
- Day 1 is recorded as having no matching omission in the completed audit.
- Day 2 through Day 5 regression coverage must include the ten locations already confirmed by the audit before implementation is accepted.
- Day 6 is excluded from omission and grouping-rule verification because its itinerary is still being drafted; blank `行程` cells may legitimately contain provisional places, restaurants, or other entries. Re-audit Day 6 after its itinerary content is complete.

## Non-Goals

- Do not change `getChildStopCluster()`, cluster rendering, navigation, or progress state in this batch.
- Do not infer final Day 6 grouping from incomplete data.
- Do not edit the connected Google Sheet; the user has already changed its header.
- Do not change any other Schema field names or aliases.

## Verification and Rollback

Verification must prove the new header is accepted, the obsolete header is rejected, BUILTIN remains structurally valid, and unrelated tests remain green. Roll back by reverting this batch; no user state or data migration is involved.
