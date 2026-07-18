# Shopping Filter Centering Design

Date: 2026-07-13
Status: Approved by Bar for planning

## Purpose

When a shopping place is selected, automatically move the horizontal filter bar so the active place chip is fully visible and centered. This completes the existing itinerary-to-shopping route, which already selects the correct PID and vertically reveals the matching place card.

## Scope

- Center the active chip after entering Shopping from a Today or Trip shopping-floor action.
- Apply the same centering when the user directly selects `全部`, `想逛`, or any shopping-place chip.
- Re-center the active chip after Shopping results are re-rendered, including search-result rendering, because replacing the result markup recreates the filter bar and resets its horizontal position.
- Keep the selected filter, search behavior, place-card vertical position, floor/area open state, want list, and stored data unchanged.

## Selected Architecture

Add one ES5 helper dedicated to horizontal movement, for example `centerShopFilterChip()`. The rendered filter bar receives a stable DOM ID, and the active chip remains identifiable through its existing `on` class.

After `renderShopResults()` writes the new markup, schedule the helper with `requestAnimationFrame()`. The helper will:

1. Find the filter bar and its active chip.
2. Calculate the horizontal destination from the chip's `offsetLeft`, the chip width, and the visible bar width.
3. Clamp the destination to zero or greater.
4. Move only the bar's horizontal position with `scrollTo({ left: destination, behavior: 'smooth' })`.
5. Fall back to assigning `scrollLeft` if element-level `scrollTo` is unavailable.

The existing `openShopPlace()` remains responsible for the page-level vertical scroll to the place card. The new helper never calls `scrollIntoView()` and never writes `window.scrollY`, so horizontal chip centering and vertical card navigation remain independent.

## Alternatives Considered

- **Selected: calculate and set the filter bar's horizontal offset.** Deterministic centering with no vertical side effects.
- **Use `scrollIntoView({ inline:'center', block:'nearest' })`.** Shorter, but standalone iOS may also adjust the page vertically and compete with place-card navigation.
- **Use CSS scroll snap.** Useful for manual swiping but does not guarantee that a programmatically selected chip is centered after a re-render.

## Interaction Details

- The active chip should be centered when content width allows it.
- At the beginning or end of the bar, browser clamping may prevent perfect geometric centering; the chip must still be fully visible.
- No chip receives focus automatically, so VoiceOver focus and the software keyboard are unaffected.
- User-driven horizontal scrolling remains available after automatic centering.
- The active chip's color, size, label, count, and click behavior do not change.

## Error and Edge Behavior

- If the filter bar or active chip is absent, return without throwing.
- If layout measurements are unavailable or zero during an intermediate render, leave the current position unchanged.
- An unknown shopping PID continues to fall back to `全部`; the `全部` chip becomes the centering target.
- Repeated rendering may request centering more than once, but each request is idempotent for the same active chip and does not change application state.

## Verification

### Automated checks

- Prove the helper calculates the selected chip's centered horizontal offset.
- Prove the destination is clamped at zero near the start of the bar.
- Prove the fallback `scrollLeft` path works when `scrollTo` is unavailable.
- Prove a missing bar or active chip is a no-op and does not throw.
- Assert `renderShopResults()` schedules centering after replacing its markup.
- Preserve existing tests for PID selection, search/filter clearing, floor state, and vertical place-card scrolling.
- Re-run the full local CI and document-title check.

### Mobile Dev acceptance

- Enter Shopping from a Today shopping ticket whose place chip initially sits off-screen to the right.
- Confirm the place chip becomes centered and the matching place card remains vertically visible.
- Repeat from the Trip shopping action.
- Tap `全部`, `想逛`, and several place chips; confirm each selected chip moves to the center without vertical page jumping.
- Confirm floor/area expansion and want-list state remain unchanged.

## Delivery and Rollback

- This remains a B-level UX change to protected `index.html` and requires the existing Tier 2 execution Gate.
- Publish the change with the next App Shell cache version and a refreshed `APP DEV · CODE` label.
- Update focused tests and `07_CHANGELOG.md`.
- No schema, parser, validator, Sheet, manifest, icon, Netlify configuration, or localStorage migration is required.
- Roll back by reverting the implementation/publication commits and restoring the previous App Shell version.

## Non-goals

- Changing which shopping place is selected.
- Changing horizontal chip order or labels.
- Making the filter bar sticky.
- Automatically expanding floors or selecting an individual store.
- Replacing the existing vertical place-card navigation.
