# Home, Shopping Navigation, and Parking Presentation Design

Date: 2026-07-13
Status: Approved by Bar for planning

## Purpose

Resolve three independent mobile UX ambiguities without changing the Sheet schema or itinerary progress model:

1. Keep the Today screen focused on the next actionable stop by removing its orange `現在` badge.
2. Make the shopping-floor action open the Shopping view at the itinerary card's exact shopping place.
3. Render multiline parking information as a readable list everywhere it appears.

## Scope

### Today `現在` badge

- Remove the orange `現在` badge only from the ordinary Today `NEXT STOP` ticket.
- Keep the Trip-view `現在` badge and its existing time/progress selection behavior.
- Keep Today next-stop selection, completion, manual skip, automatic skip, tomorrow preview, and time simulation unchanged.
- Do not rename or reinterpret the Today ticket. It remains a `NEXT STOP` ticket.

### Shopping-place navigation

- Apply to the existing shopping-floor action rendered from both Today and Trip itinerary cards.
- The action carries the resolved shopping place PID into a dedicated navigation helper.
- On activation, clear the Shopping search query and replace the current `all`, `wants`, or other-place filter with the matching place filter.
- Render the Shopping view and scroll to the matching shopping-place card after the view has been rendered and the generic view-switch scroll reset has completed.
- Preserve every floor/area accordion's current open or closed state. Do not automatically expand or collapse a floor.
- Add a stable DOM anchor derived from the place PID to each shopping-place card.

### Parking presentation

- Apply to parking values sourced from Places, Restaurants, and Hotels.
- Apply consistently in the Today next-stop ticket, Trip information panels, and the dedicated parking panel.
- A single non-empty line remains a normal single-line value.
- Two or more non-empty lines render as one bullet item per original line.
- Ignore blank lines while preserving the source order and text of all non-empty lines.
- Split only on actual CR/LF line breaks. Do not split on commas, Japanese punctuation, slashes, or sentence boundaries.
- Keep parking inheritance such as `停車同 Pxxx`, MAP CODE behavior, parsing, and stored data unchanged.

## Selected Architecture

### 1. Separate presentation from itinerary selection

Remove the Today renderer's `now-badge` output rather than changing `pickNextStop()`. The shared selection function has progress and auto-skip responsibilities; changing it merely to hide a badge would risk altering itinerary state. The Trip renderer continues to consume the existing selection result exactly as before.

### 2. Use an explicit shopping-place route

Introduce one small `openShopPlace(placeId)` entry point instead of embedding multiple global assignments in inline handlers. The helper will:

1. Normalize and validate the PID.
2. Clear `_shopQ`.
3. Set `shopPlaceFilter` to the matching PID, or safely fall back to `all` when the PID is unavailable.
4. Call the existing Shopping view switch/render path.
5. On the next animation frame, locate the stable shopping-place anchor and scroll it into view.

Waiting until the next animation frame prevents the existing `switchView()` top reset from winning the scroll race. The navigation helper does not write localStorage and does not modify `shopOpenFloors` or the want list.

### 3. Use one parking-value renderer

Introduce a shared, escaping-safe parking-value renderer and use it from the existing row/ticket renderers. It will normalize CR/LF input, remove empty lines, and choose single-line or list markup based on the remaining line count. Each line must pass through the same safe text/highlight path used by the surrounding UI; raw Sheet text must never be inserted as HTML.

This specialized renderer is preferred over the general note renderer because parking lines do not require authors to supply list markers and must not inherit reminder-specific alert/number parsing.

## Alternatives Considered

### Shopping navigation

- **Selected: dedicated helper plus stable anchor.** Small, explicit, testable, and does not persist transient navigation state.
- **Pending global navigation target consumed by `renderShop()`.** Supports delayed rendering but can leave stale state after unrelated navigation.
- **URL hash/deep link.** Supports reloadable links but adds browser-history and standalone-PWA startup behavior outside this request.

### Parking formatting

- **Selected: shared parking renderer.** Gives identical behavior across all parking sources and surfaces.
- **Reuse `renderNote()`.** Rejected because unmarked parking lines would remain separate paragraphs instead of an automatic bullet list, while marker parsing would add unrelated semantics.
- **CSS `white-space: pre-line`.** Rejected because it preserves line breaks but does not create the requested bullets or accessible list structure.

## Error and Edge Behavior

- A missing, empty, or unknown shopping PID opens the general Shopping view at the top without throwing.
- A valid shopping place with no store rows still receives a stable anchor and remains a valid navigation destination.
- If the target anchor cannot be found after render, remain safely in the Shopping view without a second redirect.
- Existing Shopping floor and want-list state remains in memory; only search text and the active place filter are intentionally changed.
- Empty parking values render no row, matching current behavior.
- Leading/trailing blank parking lines do not create empty bullets.
- Windows and Unix line endings produce the same output.
- A one-line inherited parking value remains one line; a multiline inherited value receives the same list presentation as a direct value.

## Verification

### Automated checks

- Assert the ordinary Today ticket no longer emits `now-badge` while the Trip card still does.
- Assert next-stop selection and progress/auto-skip tests remain unchanged and pass.
- Assert Today and Trip shopping-floor actions call the same PID-aware navigation helper.
- Assert the helper clears search, selects the target place, preserves floor state, and safely handles an unknown PID.
- Assert shopping-place cards expose deterministic PID-based anchors.
- Assert one-line parking output remains one line.
- Assert multiline Places, Restaurants, Hotels, and inherited parking values produce one bullet per non-empty source line in original order.
- Assert parking text remains HTML-escaped.
- Run the full repository test suite, document-title check, and health/static checks required by the Harness.

### Mobile Dev acceptance

- From an ordinary Today shopping card, tap the shopping-floor action and verify the correct shopping place is selected and visible.
- Repeat from the corresponding Trip card.
- Confirm prior Shopping search/wants/other-place filters do not hide the destination.
- Confirm no floor is unexpectedly opened or closed.
- Confirm multiline parking values are readable bullets on Today and Trip surfaces.
- Confirm the Today `現在` badge is absent and the Trip `現在` badge remains present.

## Delivery and Rollback

- This is a B-level UX batch, but it touches the protected `index.html` App source and therefore remains behind the Tier 2 confirmation Gate.
- Publish a new App Shell cache version so the installed Dev PWA receives the changed HTML predictably.
- Update the diagnostic build label, focused regression tests, and `07_CHANGELOG.md` in the implementation batch.
- No schema, parser, validator, Sheet, icon, manifest, or localStorage migration is required.
- Roll back by reverting the implementation/publication commits and restoring the preceding App Shell version. Existing progress, wants, simulation, and floor state require no cleanup.

## Non-goals

- Reworking the meaning or algorithm of the Trip-view `現在` badge.
- Changing Today next-stop or auto-skip behavior.
- Automatically opening every floor, a first floor, or a guessed floor after shopping navigation.
- Deep-linking to an individual shop brand.
- Changing shopping data or adding a floor field to itinerary rows.
- Splitting parking prose on punctuation or rewriting Sheet content.
- Changing MAP CODE, navigation, parking inheritance, or information-panel disclosure behavior.
