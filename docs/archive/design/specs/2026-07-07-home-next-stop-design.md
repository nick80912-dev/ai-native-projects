# Home Next Stop Mode Design

Date: 2026-07-07
Status: Design approved for planning
Scope: UI/UX design spec only

## Purpose

The home screen should help the traveler answer one question within 3 seconds:

> What is my next action?

This design changes the home screen direction from a broad overview into a focused travel-time assistant. The first screen highlights only the next stop, using a ticket-like visual style. It does not introduce a new tab, new schema fields, Google Sheet changes, GPS, AI recommendations, or CMS writeback.

## Product Decisions

- Placement: home screen.
- First impression: only highlight the next stop.
- Next-stop logic: combine local progress state and current time.
- Progress memory: store per itinerary day and persist after app reload.
- Action style: keep completion controls as small text actions.
- Visual style: itinerary ticket card.

## Home Screen Behavior

The top of the home screen shows a single next-stop card. The card should be the dominant first-screen element.

The home screen should not show the full daily itinerary above the fold. If today's remaining itinerary is exposed, it should be secondary and collapsed behind a compact line such as `今日還有 N 個行程`.

## Next Stop Card

The next-stop card should show only the most useful travel-time information:

- Itinerary day and date.
- Next stop time.
- Place name.
- Place type label.
- Traffic or travel-time information when available.
- Parking information when available.
- Business hours or timetable hint when available.
- Short note or important reminder when available.

The card should avoid dense table-like presentation. It should feel like a travel ticket: time and place are visually dominant; operational details are shorter supporting lines.

## Quick Actions

Primary action:

- Navigation.

Secondary actions, shown only when source data exists:

- Official website.
- Timetable.

Low-emphasis text actions:

- Complete.
- Skip.

Selecting Complete or Skip moves the home screen to the next stop without requiring a confirmation dialog. A short inline status message may appear after Skip, but it should not interrupt the flow.

## Next Stop Selection Logic

The app should determine the next stop in this order:

1. Load today's itinerary items.
2. Load local progress for the current itinerary day.
3. Exclude items marked Complete or Skip.
4. If local progress exists, show the first remaining item in itinerary order.
5. If no local progress exists, use the current time to estimate the next reasonable item.
6. If all items are completed or skipped, show a `今日行程完成` state.
7. If the current date is outside the trip date range, do not force travel-time mode.

This approach respects the user's actual progress when they interact with the app, while still working when they never press Complete or Skip.

## Local State

Progress state is local to the device and must not be written back to CMS.

The state should be grouped by itinerary day so that actions on one day do not affect other days. The state should persist across refreshes and app reopen.

The implementation should use existing localStorage patterns where possible and keep the state shape simple enough to inspect and reset.

## Data Sources

This design uses existing data only.

- Itinerary data comes from the existing CMS-driven itinerary source.
- Place details come from existing resolved CMS references.
- Field authority remains `schema.js`.
- Field mapping details remain `09_SCHEMA_MAPPING.md`.
- No new Google Sheet columns are required.
- No `schema.js` changes are required.

## Empty And Edge States

The home screen should handle these states without looking broken:

- Data is still loading.
- Data sync failed but cached data exists.
- Today has no itinerary items.
- Current date is outside the travel range.
- The next stop has no parking information.
- The next stop has no official website or timetable.
- All stops for today are complete or skipped.

Missing optional data should be hidden or shown as a soft unavailable state. It should not produce empty labels or broken buttons.

## Non-Goals

This design explicitly does not include:

- A new `旅途中` tab.
- Schema changes.
- Google Sheet column changes.
- CMS writeback.
- GPS or real-time location detection.
- AI recommendation logic.
- Full home page redesign.
- Framework migration or large refactor.

## Implementation Guardrails

- Follow existing project patterns.
- Keep changes minimal and isolated to the home screen behavior.
- Preserve Schema First and Data Driven rules.
- Keep personal progress state in localStorage only.
- Do not change parser behavior unless a verified home-screen bug requires it.
- Update `07_CHANGELOG.md` when implementation is delivered.

## Acceptance Criteria For Future Implementation

- Opening the home screen shows one visually dominant next-stop card.
- The user can identify the next action within 3 seconds.
- Complete and Skip persist per itinerary day after refresh.
- Complete and Skip do not write to CMS.
- If no progress exists, current time is used as fallback.
- Optional buttons only appear when data exists.
- No schema, Google Sheet, or CMS structure changes are made.
- Existing Shopping, Split, and other tabs continue to work unchanged.
