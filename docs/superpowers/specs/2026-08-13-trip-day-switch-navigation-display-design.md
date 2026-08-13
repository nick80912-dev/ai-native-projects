# Trip Day Switch Navigation Display Design

**Date:** 2026-08-13
**Status:** Approved for implementation
**Release:** v110 PR #14 follow-up

## Context

The Trip view's top Day chips and Today-to-Trip launchers currently share `gotoDay()`. Since `gotoDay()` creates a `trip-day` navigation intent, tapping a Day chip while already in the Trip view adds the same temporary target outline and live-status announcement used for a cross-view navigation. That feedback is unnecessary for an in-place date choice: the active Day chip and newly rendered day heading already communicate the result.

PR #14 also exposed two Linux Chromium-only browser-test tolerance failures. The hidden one-pixel live-status box can measure `1.000007629px`, and a reduced-motion assertion leaves only 150ms of scheduler margin after the product's approved 1000ms hold. Both failures are in test measurement boundaries; the product behavior and timing remain accepted.

## Decision

Introduce a Trip-only Day-chip action, `selectTripDay(dayIndex)`, and wire only the top Day chips to it.

`selectTripDay()` will:

1. set `curDay` to the selected day;
2. render the Trip view and Day bar through the existing view flow;
3. place the Trip view at the selected day's top;
4. avoid requesting or consuming a navigation intent;
5. therefore avoid `.is-navigation-target`, fade classes, and navigation live-status output.

Today launchers continue using `gotoDay(dayIndex)`. They remain cross-view navigation and retain the existing target positioning, temporary outline, and polite live-status announcement. Exact-item navigation, Shopping-place navigation, and Back to Now remain unchanged.

No `silent` option is added to `navigation-intent.js`, because the in-place Day-chip action does not represent a navigation intent at all.

## Interaction Contract

- A top Day chip switches to the requested itinerary date.
- The selected Day chip becomes active and the matching day content renders.
- The view returns to the selected day's top.
- No special destination outline, fade phase, or navigation status is created for this in-place action.
- A Today pre-trip/day launcher still opens the Trip view with its existing destination feedback.
- Six themes, responsive geometry, accessibility labels, and existing visual direction remain unchanged.

## Testing

Use TDD to add a browser regression that activates a Trip Day chip and proves the date/content switch, top position, absence of target classes, and absence of a new navigation status. Keep the existing Today launcher acceptance coverage to prove the cross-view behavior is preserved.

For the two diagnosed CI flakes only:

- permit a sub-pixel rendering tolerance up to `1.01px` for the nominal one-pixel hidden status box;
- extend the reduced-motion condition-poll window to `1000ms`, while retaining the product's 1000ms hold and the assertion that no fade transition occurs.

The CI remediation changes test tolerances only. It does not change production CSS, timers, or navigation behavior.

## Non-goals

- No global store, event bus, controller, or framework change.
- No new navigation-intent state or option.
- No change to cross-view or exact-target feedback.
- No change to Trip data, check-in, filtering, or scroll-memory semantics outside an explicit Day-chip selection.
