# Home Cluster Child Navigation Design

Date: 2026-07-13  
Status: Approved by Bar for planning

## Purpose

Allow a traveler to open the full itinerary detail for a child stop directly from an expanded parent/child cluster ticket on the Today screen.

## Scope

- Applies only to child rows shown after `展開該區串點` is selected on a Today-screen cluster ticket.
- The full child row is the tap target.
- Tapping a child row switches to the Trip view for the same day, scrolls to that exact child itinerary card, and opens its information panel when one exists.
- The parent cluster card remains non-navigable. Its expand/collapse control keeps its existing behavior.
- A non-cluster Today card keeps its current navigation behavior without visual or functional changes.

## Selected Approach

Reuse the existing `openTripItem(dayIndex, itemId)` route rather than adding a second navigation path. Pass the current day index into the child-row renderer and emit the child ID through the existing `jsString()` escaping helper.

This keeps navigation behavior consistent with the ordinary Today next-stop card:

1. Select the correct itinerary day.
2. Activate the Trip tab and render the day.
3. Locate the exact card with `getElementById('it_' + itemId)`.
4. Open `pn_nf_` information when available.
5. Smooth-scroll the card into view.

IDs containing `/` remain supported because the destination lookup already uses `getElementById()` instead of a CSS selector.

## Interaction and Presentation

- Only expanded child rows receive the click handler and clickable styling.
- The existing child time, name, category, transport metadata, and auto-skip status remain unchanged.
- Add a restrained tap affordance and pressed-state feedback without adding a separate button or changing the cluster layout.
- Tapping a child row must not mark it complete, skip it, clear it, or change the cluster expansion state.
- Parent expand/collapse remains the only action on the parent cluster content.

## Data and State

- No Google Sheet, Schema, parser, reference, renderer registration, or data-flow changes.
- No new localStorage key and no changes to completion, skip, or auto-skip state.
- The in-memory iOS gesture diagnostic remains enabled on Dev and is not modified by this feature.

## Error and Edge Behavior

- If the destination child card cannot be found after rendering, preserve the existing `openTripItem()` no-op behavior; the user remains safely on the Trip view.
- If the child has no information panel, scroll to the card without creating or opening an empty panel.
- Child IDs must be escaped for the inline JavaScript string with `jsString()`.
- A cleared or auto-skipped child remains navigable when it is visible in the expanded cluster.

## Verification

- Add a focused rendering test that expands a cluster and proves every child row targets `openTripItem()` with the same day index and the correct child ID.
- Include a child ID containing `/` to verify safe inline-handler generation and destination compatibility.
- Assert that the parent card and expand/collapse button do not gain an `openTripItem()` handler.
- Preserve the existing ordinary-card navigation assertion.
- Re-run cluster progress, Today simplification, itinerary rendering, iOS gesture, viewport, App Shell, and repository-wide checks.
- Mobile Dev acceptance covers parent expand/collapse, child navigation and scroll, information-panel opening, ordinary-card behavior, and unchanged progress state.

## Delivery and Rollback

- This is a B-level display/interaction change, but `index.html` and the Service Worker publication path are protected by the Tier 2 confirmation already approved by Bar.
- Publish a new App Shell cache version so the installed Dev PWA receives the changed `index.html` predictably.
- Roll back by reverting the feature/publication commits and restoring the preceding App Shell version. No data migration or local state cleanup is required.

## Non-goals

- Making the parent card navigate to the Trip view.
- Adding a separate `查看詳細行程` button.
- Changing the parent/child grouping rule or child auto-skip logic.
- Changing the full itinerary card layout.
- Removing or changing the Dev iOS gesture diagnostics.
