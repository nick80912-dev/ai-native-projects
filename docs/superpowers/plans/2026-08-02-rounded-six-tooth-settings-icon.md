# Rounded Six-Tooth Settings Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top-right settings artwork with the approved rounded six-tooth inline SVG and publish it as v79.

**Architecture:** Keep the existing settings button and its behavior intact. Change only its inline SVG geometry and narrowly scoped icon CSS, then use the existing release-version mechanism to invalidate the service-worker cache.

**Tech Stack:** Static HTML/CSS/SVG, Node.js assertion tests, Playwright, Service Worker cache versioning.

## Global Constraints

- Preserve the existing 44 × 44 px `.settings-btn`, `onclick="openSettings()"`, and `aria-label="設定"`.
- Use a local inline 24 × 24 SVG with `currentColor`; add no dependency or external asset.
- Render exactly six evenly spaced round-ended teeth, an outer hub circle, and a center circle.
- Render the icon at 20 × 20 px with a 2 px stroke.
- Do not change MAPCODE behavior, schema, validators, photo storage, or deployment configuration.
- Release as v79 in `app-version.js`, `sw.js`, `APP_RELEASE_NOTES`, and `07_CHANGELOG.md`.

---

### Task 1: Lock and implement the six-tooth icon

**Files:**
- Modify: `tests/browser/ui-ux-hardening.spec.js`
- Modify: `index.html:146-359,756`

**Interfaces:**
- Consumes: the existing `.settings-btn`, `.app-icon`, and `openSettings()` contracts.
- Produces: `.settings-gear-six`, `.settings-gear-six-teeth`, and six `.settings-gear-tooth` elements used only by the top-right settings button.

- [ ] **Step 1: Write the failing rendered UI contract test**

```js
test('settings button renders a themed rounded six-tooth gear', async ({ page }) => {
  const button=page.getByRole('button',{name:'設定'});
  const icon=button.locator('.settings-gear-six');
  await expect(icon).toBeVisible();
  await expect(icon.locator('.settings-gear-tooth')).toHaveCount(6);
  const gear=await icon.evaluate(svg=>({
    size:[svg.getBoundingClientRect().width,svg.getBoundingClientRect().height],
    stroke:getComputedStyle(svg).stroke,
    color:getComputedStyle(svg.closest('button')).color,
    teeth:Array.from(svg.querySelectorAll('.settings-gear-tooth')).map(line=>({
      transform:line.getAttribute('transform')||'rotate(0 12 12)',
      cap:getComputedStyle(line).strokeLinecap,
    })),
  }));
  expect(gear.size).toEqual([20,20]);
  expect(gear.stroke).toBe(gear.color);
  expect(gear.teeth.map(tooth=>tooth.transform)).toEqual([0,60,120,180,240,300].map(degree=>`rotate(${degree} 12 12)`));
  expect(gear.teeth.every(tooth=>tooth.cap==='round')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/browser/ui-ux-hardening.spec.js -g "settings button renders"`

Expected: FAIL because `settings-gear-six` is absent from the current eight-tooth artwork.

- [ ] **Step 3: Implement the minimal inline SVG and CSS**

```html
<svg class="app-icon settings-gear-six" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="6.25"></circle>
  <g class="settings-gear-six-teeth">
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(0 12 12)"></line>
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(60 12 12)"></line>
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(120 12 12)"></line>
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(180 12 12)"></line>
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(240 12 12)"></line>
    <line class="settings-gear-tooth" x1="12" y1="2.5" x2="12" y2="5.75" transform="rotate(300 12 12)"></line>
  </g>
  <circle cx="12" cy="12" r="2.35"></circle>
</svg>
```

```css
.settings-btn .settings-gear-six{width:20px;height:20px;stroke-width:2}
```

- [ ] **Step 4: Run focused tests**

Run: `npx playwright test tests/browser/ui-ux-hardening.spec.js`

Expected: 5 tests passed, including the six-tooth geometry and 44 px settings-button target.

### Task 2: Release, verify, and publish v79

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html:8202-8208`
- Modify: `07_CHANGELOG.md`
- Modify: `tests/theme-system.test.js`
- Include: `docs/superpowers/plans/2026-08-02-rounded-six-tooth-settings-icon.md`

**Interfaces:**
- Consumes: `tools/check-app-version.js` and the five-entry `APP_RELEASE_NOTES` contract.
- Produces: v79 cache and release metadata with v78 through v75 retained behind it.

- [ ] **Step 1: Update the release contract**

Set both version files to `v79`. Add this first release-note entry and remove v74 so the array remains exactly five entries:

```js
{version:'v79',date:'2026-08-02',title:'設定圖示更清楚',items:['右上角設定按鈕改為圓角六齒圖示，各主題與不同裝置保持一致']}
```

Update `tests/theme-system.test.js` to expect `['v79','v78','v77','v76','v75']` and add the corresponding v79 changelog section.

- [ ] **Step 2: Run release checks and the full test suite**

Run: `node tools/check-doc-titles.js`

Run: `node tools/check-app-version.js`

Run every top-level `tests/*.test.js`; expected: all 57 files pass.

Run: `npm run test:browser`; expected: all 30 Playwright tests pass.

Run: `git diff --check`; expected: exit 0.

- [ ] **Step 3: Verify protected scope**

Run: `git diff --exit-code origin/dev -- schema.js validator.js shopping-photo-store.js netlify.toml`

Expected: exit 0.

Run: `git diff -G "showMapcode|MAPCODE|mapcode" origin/dev -- index.html`

Expected: no output.

- [ ] **Step 4: Commit and push**

```powershell
git add -- 07_CHANGELOG.md app-version.js index.html sw.js tests/theme-system.test.js tests/browser/ui-ux-hardening.spec.js docs/superpowers/plans/2026-08-02-rounded-six-tooth-settings-icon.md docs/superpowers/specs/2026-08-02-rounded-six-tooth-settings-icon-design.md
git commit -m "chore: release v79"
git fetch origin dev
git push origin HEAD:dev
```

Expected: a normal fast-forward update of remote `dev`; never force-push.
