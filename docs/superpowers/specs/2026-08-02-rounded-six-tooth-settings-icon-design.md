# Rounded Six-Tooth Settings Icon Design

## Goal

Replace the top-right settings button's current gear artwork with a softer six-tooth gear while preserving its behavior, accessibility, offline reliability, and theme integration.

## Approved design

- Keep the existing 44 × 44 px `.settings-btn`, click handler, and `aria-label="設定"`.
- Keep the icon inline in `index.html`; do not add an icon library, font, remote asset, or network dependency.
- Use a 24 × 24 SVG viewBox with `fill="none"` and `stroke="currentColor"` through the existing `.app-icon` contract.
- Draw exactly six evenly spaced radial teeth. Each tooth uses a round line cap so the silhouette feels softer than the current gear.
- Retain an outer hub circle and a smaller center circle so the symbol remains recognizable as settings rather than a sun.
- Size the rendered artwork at 20 × 20 px with a 2 px stroke inside the existing button.

## Alternatives considered

1. **Six-tooth inline stroke SVG — selected.** Consistent on every device, inherits all six themes, remains available offline, and requires no dependency.
2. **Unicode gear character.** Smaller implementation, but platform-specific glyph and emoji rendering make its weight and color inconsistent.
3. **External icon package or SVG file.** Reusable, but adds an unnecessary dependency or another offline shell asset for one icon.

## Validation

- A static contract test verifies the settings button still has its accessible name and contains the dedicated six-tooth SVG structure.
- Browser regression continues to verify the header action keeps its 44 px touch target.
- Existing version, offline shell, Node, and Playwright suites must remain green.
- MAPCODE behavior and unrelated application files remain unchanged.

## Release

Ship as v79 so the service-worker cache name changes and returning installed clients receive the updated `index.html` artwork.
