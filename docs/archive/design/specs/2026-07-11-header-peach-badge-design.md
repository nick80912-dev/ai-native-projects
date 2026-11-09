# Header Peach Badge Design

## Goal

Replace the text-only square icon before the in-app itinerary name with an original, compact Okayama peach badge.

## Visual Design

- Asset: one original 256 by 256 PNG illustration.
- Subject: a simplified coral-orange Okayama peach with a deep green leaf, drawn with bold, flat shapes.
- Background: soft pink, with no text, brand marks, or copied characters from the supplied reference.
- Display: a fixed 26 by 26 pixel rounded icon in the header, preserving the existing title and sync-button layout.

## Integration

- Store the image at the repository root so both standalone HTML entrypoints can load it.
- Replace the existing `.brand .logo` text span with an image element in `index.html` and `日本行程V2預覽.html`.
- Keep the existing `brandTitle` data binding unchanged; the itinerary name remains dynamic.
- Give the image descriptive alternative text and constrain its dimensions through the current `.brand .logo` styles.

## Verification

- Add a static regression test that both HTML entrypoints reference the shared peach badge.
- Verify the image is a valid PNG and the header markup retains `brandTitle`.
- Run the complete repository test suite and `git diff --check`.
