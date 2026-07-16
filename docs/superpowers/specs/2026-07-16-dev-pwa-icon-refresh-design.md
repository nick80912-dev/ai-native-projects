# Dev PWA Icon Refresh Design

## Goal

Replace the Dev branch PWA and browser icon set with the user-provided travel icon while preserving the existing Okayama peach badge exactly.

## Scope

- Source image: `C:\Users\AARONH~1\AppData\Local\Temp\codex-clipboard-040ca792-da7f-4cfd-ab2b-68dd59305ffc.png`.
- Regenerate `icon-16.png`, `icon-32.png`, `icon-120.png`, `icon-152.png`, `icon-167.png`, `icon-180.png`, `icon-192.png`, and `icon-512.png`.
- Regenerate `icon-maskable-192.png` and `icon-maskable-512.png`.
- Update the Service Worker cache version and its diagnostic labels so installed Dev PWAs can retrieve the refreshed icon assets and report the active cache accurately.
- Do not edit `okayama-peach-badge.png` or its `index.html` reference.
- Do not change application behavior, content, theme colors, manifest icon paths, or production branch state.

## Image Treatment

The supplied image contains a white outer margin around a rounded-square illustration. The standard icons will crop only that outer margin, retain the complete rounded-square composition, convert to sRGB RGBA, and downsample with a high-quality filter to every existing size.

The maskable icons will use the same artwork with additional safe-area padding. The complete suitcase, airplane, map, pin, and checklist must remain inside the central mask-safe region so common Android circle, squircle, and rounded-square masks do not remove meaningful content.

Tiny 16 px and 32 px icons will use the same source and composition rather than a separately redrawn mark, keeping the icon family visually consistent.

## Asset and Cache Flow

1. Read the supplied PNG as the single source.
2. Detect or explicitly set the rounded-square artwork bounds, excluding only the exterior white margin.
3. Produce the standard and maskable PNG variants at their current filenames and exact pixel dimensions.
4. Bump the cache identifier in `sw.js`; the cached icon path list remains unchanged.
5. Leave `manifest.webmanifest` and `index.html` paths unchanged because they already reference the full icon set.

## Verification

- Assert every generated PNG has the filename-specific square dimensions.
- Confirm the standard and maskable icons decode successfully as PNG files.
- Render or inspect representative 16, 192, standard 512, and maskable 512 variants.
- Record the SHA-256 of `okayama-peach-badge.png` before work and assert it remains `0B048181F89CA9D602CC6DCDE07C9242AA0D7CDB87BE47FB82DD72EB2B449D2C` afterward.
- Assert the `index.html` peach reference remains `okayama-peach-badge.png`.
- Run the repository's relevant test and sanity checks after the asset and cache update.

## Failure Handling

If cropping removes any meaningful object, or mask previews show clipping, increase the safe-area padding and regenerate before accepting the assets. If the peach hash or reference changes, stop and restore that file/reference before continuing.
