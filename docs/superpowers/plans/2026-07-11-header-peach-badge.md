# Header Peach Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-only in-app header icon with an original Okayama peach badge in both HTML entrypoints.

**Architecture:** Add one 256 by 256 PNG asset at the repository root. Both HTML documents reference the same image with the existing fixed `.brand .logo` dimensions, while `brandTitle` remains dynamically populated from the itinerary data. The existing Node static test validates the asset and markup contracts.

**Tech Stack:** Static HTML/CSS, PNG asset, Node built-in `assert`, `fs`, and `path`.

## Global Constraints

- The icon must be an original coral-orange peach with a deep green leaf on a soft pink background.
- The icon contains no text, logos, watermarks, or copied reference artwork.
- Produce exactly one 256 by 256 PNG and display it at the existing 26 by 26 CSS size.
- Keep `brandTitle` dynamic and preserve the header sync-button layout.
- Update both `index.html` and `日本行程V2預覽.html`.

---

### Task 1: Replace the rejected traveler asset with a peach badge

**Files:**
- Create: `okayama-peach-badge.png`
- Delete: `okayama-traveler-icon.png`
- Modify: `tests/pwa-shell.test.js`

**Interfaces:**
- Consumes: the approved visual specification in `docs/superpowers/specs/2026-07-11-header-peach-badge-design.md`.
- Produces: `okayama-peach-badge.png`, a valid 256 by 256 PNG used by both headers.

- [ ] **Step 1: Update the test to require the peach badge**

```js
const peachBadgePath = path.join(root, 'okayama-peach-badge.png');
assert.ok(fs.existsSync(peachBadgePath), 'header peach badge exists');
const peachBadge = fs.readFileSync(peachBadgePath);
assert.strictEqual(peachBadge.readUInt32BE(16), 256, 'peach badge is 256px wide');
assert.strictEqual(peachBadge.readUInt32BE(20), 256, 'peach badge is 256px high');
assert.ok(!fs.existsSync(path.join(root, 'okayama-traveler-icon.png')), 'rejected traveler asset is absent');
```

- [ ] **Step 2: Run the PWA shell test to verify it fails**

Run from the repository root:

```powershell
node tests/pwa-shell.test.js
```

Expected: FAIL with `header peach badge exists`.

- [ ] **Step 3: Generate and install the original peach badge**

Generate a square original PNG using this specification:

```text
Use case: logo-brand
Asset type: compact mobile web-app header icon
Primary request: a simplified Okayama peach badge
Style/medium: crisp flat graphic with bold, simple shapes
Subject: one coral-orange peach with one deep green leaf
Scene/backdrop: flat soft pink background
Composition/framing: centered symbol, generous padding, unmistakable at 26px
Constraints: no text, no logos, no watermark, no people, no birds, no landmarks, no copied artwork
```

Resize the selected output to exactly 256 by 256 pixels and save it as `okayama-peach-badge.png` at the repository root. Delete `okayama-traveler-icon.png`.

- [ ] **Step 4: Run the PWA shell test to verify the asset assertions pass**

Run from the repository root:

```powershell
node tests/pwa-shell.test.js
```

Expected: `PWA shell tests passed`.

### Task 2: Wire the peach badge into both headers

**Files:**
- Modify: `index.html:54-57,471`
- Modify: `日本行程V2預覽.html:53-56,470`
- Modify: `tests/pwa-shell.test.js`

**Interfaces:**
- Consumes: `okayama-peach-badge.png` from Task 1.
- Produces: stable shared image markup and preserved dynamic `brandTitle` in both entrypoints.

- [ ] **Step 1: Update the header-markup assertion**

```js
for (const html of [index, preview]) {
  assert.match(
    html,
    /<img class="logo" src="okayama-peach-badge\.png" alt="岡山桃子">/,
    'header uses the shared peach badge'
  );
  assert.match(html, /id="brandTitle"/, 'header keeps the dynamic itinerary title');
}
```

- [ ] **Step 2: Run the PWA shell test to verify it fails**

Run from the repository root:

```powershell
node tests/pwa-shell.test.js
```

Expected: FAIL with `header uses the shared peach badge`.

- [ ] **Step 3: Update both header image elements**

Replace this markup in `index.html` and `日本行程V2預覽.html`:

```html
<img class="logo" src="okayama-traveler-icon.png" alt="岡山旅人">
```

with:

```html
<img class="logo" src="okayama-peach-badge.png" alt="岡山桃子">
```

Leave the fixed `.brand .logo` rule unchanged:

```css
.brand .logo{
  width:26px;height:26px;border-radius:7px;object-fit:cover;display:block;flex:0 0 26px;
}
```

- [ ] **Step 4: Run the PWA shell test to verify the header assertions pass**

Run from the repository root:

```powershell
node tests/pwa-shell.test.js
```

Expected: `PWA shell tests passed`.

### Task 3: Verify and commit the peach badge implementation

**Files:**
- Create: `okayama-peach-badge.png`
- Delete: `okayama-traveler-icon.png`
- Modify: `index.html`
- Modify: `日本行程V2預覽.html`
- Modify: `tests/pwa-shell.test.js`
- Create: `docs/superpowers/plans/2026-07-11-header-peach-badge.md`

**Interfaces:**
- Consumes: the shared peach asset and header markup from Tasks 1 and 2.
- Produces: a tested implementation commit ready for deployment.

- [ ] **Step 1: Run all tests**

Run from the repository root:

```powershell
Get-ChildItem tests -Filter '*.test.js' | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: every test reports PASS, including `pwa-shell.test.js`.

- [ ] **Step 2: Check file integrity and whitespace**

Run:

```powershell
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit the implementation**

```powershell
git add -- 'okayama-peach-badge.png' 'index.html' '日本行程V2預覽.html' 'tests/pwa-shell.test.js' 'docs/superpowers/plans/2026-07-11-header-peach-badge.md'
git commit -m 'feat: add Okayama peach header badge'
```
