# Dev PWA Icon Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Dev PWA/browser icon with deterministic derivatives of the supplied travel artwork without changing the Okayama peach badge.

**Architecture:** Add one focused Pillow-based asset generator that crops the supplied rounded-square artwork once, produces the existing standard sizes, and creates padded maskable variants. Extend the existing PWA shell test so it fails on the old icon generation and cache version, then bump the Service Worker cache after generation.

**Tech Stack:** Python 3 with Pillow 12.2.0 for PNG processing; Node.js `assert`, `fs`, and `crypto` for repository tests; existing static PWA files.

## Global Constraints

- Work only on the `dev` branch and do not push or merge to `main`.
- Preserve `okayama-peach-badge.png` at SHA-256 `0B048181F89CA9D602CC6DCDE07C9242AA0D7CDB87BE47FB82DD72EB2B449D2C`.
- Preserve the `index.html` reference `src="okayama-peach-badge.png"`.
- Keep all current icon filenames and manifest paths.
- Generate standard icons at 16, 32, 120, 152, 167, 180, 192, and 512 px.
- Generate maskable icons at 192 and 512 px with 15% padding on each side, making the supplied composition occupy 70% of the canvas.
- Change the Service Worker cache identifier and its two `index.html` diagnostic labels from `okayama-trip-v12` to `okayama-trip-v13`.

---

### Task 1: Lock the expected asset generation in the PWA shell test

**Files:**
- Modify: `tests/pwa-shell.test.js`

**Interfaces:**
- Consumes: the existing icon files, `sw.js`, `index.html`, and `okayama-peach-badge.png`.
- Produces: assertions for exact icon dimensions, replacement of the legacy 512 px icon, the immutable peach SHA-256, and cache version 13.

- [ ] **Step 1: Add failing assertions**

Import `crypto`, add `sha256(filePath)`, assert the peach hash exactly, assert each standard and maskable PNG width/height from IHDR bytes, assert `icon-512.png` is no longer the legacy hash `2879A46287F38D9B9AF7DC2E296B54530A41ACA0861B4D2F639C86BDDB061BB6`, and change the exact cache assertion to `okayama-trip-v13`.

```js
const crypto = require('crypto');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

assert.strictEqual(
  sha256(peachBadgePath),
  '0B048181F89CA9D602CC6DCDE07C9242AA0D7CDB87BE47FB82DD72EB2B449D2C',
  'header peach badge remains byte-for-byte unchanged',
);
assert.notStrictEqual(
  sha256(path.join(root, 'icon-512.png')),
  '2879A46287F38D9B9AF7DC2E296B54530A41ACA0861B4D2F639C86BDDB061BB6',
  'the legacy 512px PWA icon has been replaced',
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/pwa-shell.test.js`

Expected: FAIL because `icon-512.png` still has the legacy hash and `sw.js` still names cache v12.

### Task 2: Generate the standard and maskable icon set

**Files:**
- Create: `tools/refresh-pwa-icons.py`
- Modify: `icon-16.png`, `icon-32.png`, `icon-120.png`, `icon-152.png`, `icon-167.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`

**Interfaces:**
- Consumes: `--source PATH` pointing to the supplied square PNG and optional `--output-dir PATH` defaulting to the repository root.
- Produces: ten RGB PNG files at the existing filenames.

- [ ] **Step 1: Add the deterministic generator**

Implement a CLI using `argparse`, `PIL.Image`, and `PIL.ImageChops`. Compare against white with threshold 20, square the detected bounding box around its center, crop the standard artwork, and resize with `Image.Resampling.LANCZOS`. For maskable files, place a 70%-width resized copy on a white RGB canvas.

```python
STANDARD_SIZES = (16, 32, 120, 152, 167, 180, 192, 512)
MASKABLE_SIZES = (192, 512)
WHITE_THRESHOLD = 20
MASKABLE_SCALE = 0.70
```

The generator must raise `ValueError` if the source is not square or if no non-white artwork bounds are detected.

- [ ] **Step 2: Generate all icon files**

Run:

```powershell
python tools/refresh-pwa-icons.py --source 'C:\Users\AARONH~1\AppData\Local\Temp\codex-clipboard-040ca792-da7f-4cfd-ab2b-68dd59305ffc.png'
```

Expected: one success line listing eight standard and two maskable outputs.

- [ ] **Step 3: Inspect representative outputs**

Visually inspect `icon-16.png`, `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png`. Regenerate only if meaningful travel objects are cropped or illegible.

### Task 3: Invalidate the installed PWA shell cache and verify

**Files:**
- Modify: `sw.js`

**Interfaces:**
- Consumes: the newly generated assets at unchanged paths.
- Produces: cache identifier `okayama-trip-v13`, forcing installed clients to replace cache v12.

- [ ] **Step 1: Apply the minimal cache bump**

Change only:

```js
var CACHE_NAME = 'okayama-trip-v13';
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `node tests/pwa-shell.test.js`

Expected: `PWA shell tests passed`.

- [ ] **Step 3: Run repository sanity checks**

Run all `tests/*.test.js` with Node.js and then run `node tools/check-doc-titles.js`.

Expected: every test exits 0 and the document-title check exits 0.

- [ ] **Step 4: Verify immutable peach and the final diff**

Run SHA-256, `git diff --check`, and `git status --short`. Confirm the peach hash is exact, no manifest or peach asset changes appear, and the diff is limited to the plan, test, generator, ten icon assets, and `sw.js`.

- [ ] **Step 5: Commit the implementation**

```powershell
git add tests/pwa-shell.test.js tools/refresh-pwa-icons.py icon-*.png sw.js docs/superpowers/plans/2026-07-16-dev-pwa-icon-refresh.md
git commit -m "feat: refresh Dev PWA icon set"
```
