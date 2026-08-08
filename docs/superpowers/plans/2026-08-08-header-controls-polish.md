# Header Controls Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header settings gear with a compact sliders icon and reduce the visible chrome of the settings and sync controls without shrinking their 44px touch targets.

**Architecture:** Keep the existing buttons, handlers, labels, and flex layout. Draw both controls' translucent chrome through one shared pseudo-element rule inset inside the unchanged buttons, and replace only the settings button's inline SVG geometry.

**Tech Stack:** Single-file HTML/CSS/JavaScript runtime, inline SVG, Playwright browser tests, Node source-contract tests.

## Global Constraints

- Work only on branch `dev` and preserve unrelated work.
- Do not modify sync logic, settings information architecture, Ledger or Shopping workflow, schema, localStorage, backup versions, Service Worker, `netlify.toml`, `main`, deployment, or tags.
- Keep both buttons' touch targets at least 44×44px.
- Use inline SVG with `currentColor`; add no icon dependency.
- Verify all six themes and 320px, 375px, and 390px widths.
- Push `dev` only after all required checks pass.

---

### Task 1: Lock the visual contract with failing browser tests

**Files:**
- Modify: `tests/browser/ui-ux-hardening.spec.js`

**Interfaces:**
- Consumes: real `.settings-btn`, `#syncBtn`, `.brand-actions`, and theme switching in `index.html`.
- Produces: browser-level contracts for `.settings-sliders` and the shared compact `::before` chrome.

- [ ] **Step 1: Replace the six-tooth gear test with a sliders behavior test**

Use the real rendered SVG and assert a 22×22 view, three horizontal rails, three staggered knobs, 1.75px round strokes, and `stroke === button currentColor`. Keep the existing assertion that the outer button remains 44×44px.

- [ ] **Step 2: Add the compact chrome and narrow-width behavior test**

For `.settings-btn` and `#syncBtn`, read `getComputedStyle(button,'::before')` and assert 4px top/bottom insets, 36px visual height, translucent non-zero background, `pointer-events:none`, transparent button background, and at least 44px outer height. At 320×844, 375×844, and 390×844, assert no document overflow, sync remains left of settings, and SVG/text centers remain aligned with their buttons.

- [ ] **Step 3: Add the six-theme currentColor check**

Use the existing theme selector API for `ocean`, `ivory`, `mist`, `cedar`, `wisteria`, and `tea`. For each theme, assert the sliders SVG computed stroke equals the settings button computed color and both pseudo-elements retain a visible translucent background.

- [ ] **Step 4: Run the focused browser spec and verify RED**

Run:

```powershell
npx playwright test tests/browser/ui-ux-hardening.spec.js --reporter=line
```

Expected: FAIL because `.settings-sliders` and the compact pseudo-element chrome do not exist in v98. Existing unrelated assertions must continue to pass.

---

### Task 2: Implement the minimal shared chrome and sliders SVG

**Files:**
- Modify: `index.html`
- Test: `tests/browser/ui-ux-hardening.spec.js`

**Interfaces:**
- Consumes: `.brand .sync`, `.settings-btn`, `.app-icon`, `openSyncStatus()`, and `openSettings()`.
- Produces: `.settings-sliders` inline SVG and shared `::before` chrome for the two existing buttons.

- [ ] **Step 1: Separate visible chrome from the buttons' hit areas**

Set `.brand .sync` and `.settings-btn` to `position:relative` and `background:transparent`. Add a combined `::before` rule with `content:""`, `position:absolute`, `inset:4px`, `border-radius:inherit`, `background:rgba(255,255,255,.1)`, and `pointer-events:none`. Do not change button width, height, minimum height, padding, gap, alignment, handlers, or labels.

- [ ] **Step 2: Replace only the settings SVG geometry**

Replace `.settings-gear-six` markup with `.settings-sliders`, keeping `viewBox="0 0 24 24"`, `aria-hidden="true"`, and `focusable="false"`. Draw three segmented horizontal rails at y=6, 12, and 18 with circular knobs staggered at x=8, 16, and 12. Set the icon to 22×22px and keep stroke width 1.75 through the existing `currentColor` icon system.

- [ ] **Step 3: Run the focused browser spec and verify GREEN**

Run:

```powershell
npx playwright test tests/browser/ui-ux-hardening.spec.js --reporter=line
```

Expected: all tests in the spec pass with no page errors.

- [ ] **Step 4: Run focused Node source-contract tests**

Run:

```powershell
node tests/ui-ux-hardening.test.js
node tests/theme-system.test.js
```

Expected: both files pass. If the historical gear-specific source assertion fails, update it to assert the same sliders and currentColor user-visible contract as the browser test; do not retain six-tooth expectations.

- [ ] **Step 5: Commit the implementation**

```powershell
git add -- index.html tests/browser/ui-ux-hardening.spec.js tests/theme-system.test.js tests/ui-ux-hardening.test.js
git commit -m "feat(ui): refine settings icon and sync badge chrome"
```

Stage only files that actually changed.

---

### Task 3: Run the release-quality verification and push dev

**Files:**
- Verify only; no runtime expansion.

**Interfaces:**
- Consumes: committed Task 2 UI and tests.
- Produces: clean, pushed `dev` at the verified commit.

- [ ] **Step 1: Run all Node tests**

Run every `tests/*.test.js` file and require 71／71 passing files.

- [ ] **Step 2: Run all Playwright tests**

```powershell
npx playwright test --reporter=line
```

Require the actual listed count to pass with zero failures.

- [ ] **Step 3: Run static and scope checks**

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check origin/dev
git status --short
```

Parse `manifest.webmanifest` and `.ai-manifest.json` as JSON. Confirm `sw.js`, `schema.js`, `netlify.toml`, version files, and personal backup version are unchanged by this batch.

- [ ] **Step 4: Inspect the final diff and commit history**

Confirm the runtime diff contains only the settings SVG and the two controls' shared chrome, plus directly related tests and the approved spec／plan documents. Confirm the working tree is clean.

- [ ] **Step 5: Push only dev and verify the remote**

```powershell
git push origin dev
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/dev
```

Require identical SHAs. Do not create a PR, deploy, tag, or modify `main`.
