# Light-Only Themes v80 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Provenance:** Reconstructed on 2026-08-02 from the v80 Tier 2 handoff prompt, which fixed the three changes, the commit order, the out-of-scope list, and the per-task diff budgets. The plan file itself was not delivered with that prompt.

**Goal:** Make the six shipped themes light-only so a theme looks the same under iPhone Light and Dark Appearance, enlarge the settings gear glyph, and stop a long place name from starving the 完成 button.

**Architecture:** Presentation-only changes inside `index.html`. The v78 automatic dark override is deleted rather than tuned — the six palettes are authored as light palettes and roughly a hundred component rules still carry hard-coded light backgrounds, so a token-level dark mode can never be consistent without a conversion this release explicitly does not attempt. The document instead opts out of system dark rendering with `color-scheme:light`.

**Tech Stack:** Static HTML/CSS/ES5 JavaScript, Node assert tests, Playwright Chromium, Service Worker cache versioning.

## Global Constraints

- Base all work on `origin/dev` at `8094fca` (v79); implement on branch `dev`.
- Keep `PERSONAL_STATE_VERSION` at 8.
- No schema, localStorage-key, backup-format, SW install/fetch/`SHELL`, `netlify.toml`, or dependency changes.
- Write the failing test first for every task and confirm it fails for the right reason.
- Three commits, in the Commit section order. Do not squash.
- Release as v80 in `app-version.js`, `sw.js`, `APP_RELEASE_NOTES`, and `07_CHANGELOG.md`.
- Diff budgets: Task 1 ≈ 43 lines removed and 1 changed; Task 2 is 1 changed line; Task 3 is one CSS rule. If a task comes out materially larger, stop and report.
- If deleting the dark block reveals a component that is unreadable in light appearance, stop and report rather than patching component CSS.

> **Numbering note:** the handoff prompt's rules attached the "≈43 removed and 1 changed" budget to "Task 2", but that budget can only describe the dark-block deletion, which the same prompt lists first. Tasks below are numbered to match the prompt's numbered list of changes; the budgets are attached to the task each one actually describes.

## Out of scope

- A `night` theme, or any seventh theme.
- Converting the ~108 hard-coded light component backgrounds to semantic tokens.
- `.day-chip.active` in any form.
- Any change to `@media(prefers-reduced-motion:reduce)`, MAPCODE behavior, or photo storage.

---

### Task 1: Remove the automatic dark override

**Files:**
- Modify: `tests/theme-system.test.js:77-85`
- Modify: `tests/browser/ui-ux-hardening.spec.js:80-101`
- Modify: `index.html:70-112,115`

**Interfaces:**
- Consumes: the six `--t-*` theme token blocks and the existing `@media(prefers-reduced-motion:reduce)` rule.
- Produces: an `index.html` with no `prefers-color-scheme` rule and an explicit `color-scheme:light` on `html`.

- [ ] **Step 1: Write the failing contract and browser tests**

In `tests/theme-system.test.js`, replace the dark-variant assertions with the inverse:

```js
assert(html.indexOf('@media(prefers-color-scheme:dark)')<0,'no automatic dark override remains');
assert.match(html,/html\{[^}]*color-scheme:light/,'the document opts out of system dark rendering');
```

Keep the `prefers-reduced-motion` assertions, but stop anchoring them to the deleted dark block.

In `tests/browser/ui-ux-hardening.spec.js`, replace `all six themes adapt to a readable dark palette` with a test that reads each theme's paper/card/ink under `colorScheme: 'light'` and again under `colorScheme: 'dark'`, and asserts the two readings are identical, that paper stays light, and that ink keeps a 4.5 contrast ratio.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node tests/theme-system.test.js`

Run: `npx playwright test tests/browser/ui-ux-hardening.spec.js -g "themes"`

Expected: the Node test fails because `@media(prefers-color-scheme:dark)` is still present and `color-scheme:light` is absent; the browser test fails because the dark reading differs from the light reading.

- [ ] **Step 3: Implement the minimal production change**

Delete `index.html:70-112` — the entire `@media(prefers-color-scheme:dark)` block, including its six token overrides, `body{color-scheme:dark}`, and the four component background overrides.

Change one line so native controls and scrollbars stay light under Dark Appearance:

```css
html{scroll-behavior:smooth;color-scheme:light}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Re-run the Step 2 commands; both must pass.

- [ ] **Step 5: Confirm the diff budget**

Run: `git diff --numstat -- index.html`

Expected: about 43 deletions and 1 changed line. Stop and report if materially larger.

### Task 2: Enlarge the settings gear glyph

**Files:**
- Modify: `tests/browser/ui-ux-hardening.spec.js:30-48`
- Modify: `index.html:360`

**Interfaces:**
- Consumes: the existing `.settings-btn` (44 × 44, `border-radius:50%`) and the six-tooth inline SVG.
- Produces: a 24 × 24 glyph at `stroke-width:1.75` inside an unchanged button.

- [ ] **Step 1: Write the failing browser test**

Extend `settings button renders a themed rounded six-tooth gear` to expect the new glyph size and stroke, and to pin the button box so the glyph cannot grow by growing its container:

```js
expect(gear.size).toEqual([24,24]);
expect(parseFloat(gear.strokeWidth)).toBe(1.75);
expect(gear.button).toEqual([44,44]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx playwright test tests/browser/ui-ux-hardening.spec.js -g "six-tooth"`

Expected: FAIL reporting `[20,20]` received where `[24,24]` was expected.

- [ ] **Step 3: Implement the minimal production change**

```css
.settings-btn .settings-gear-six{width:24px;height:24px;stroke-width:1.75}
```

Do not touch `.settings-btn:146`, `.settings-btn .app-icon:359`, the SVG `viewBox`, or either `<circle>` radius.

- [ ] **Step 4: Run the focused test and verify GREEN**

Re-run the Step 2 command; expected: pass.

### Task 3: Stop a long place name from starving the 完成 button

**Files:**
- Modify: `tests/browser/ui-ux-hardening.spec.js`
- Modify: `index.html:466`
- Modify: `app-version.js`, `sw.js`, `index.html` (`APP_RELEASE_NOTES`), `07_CHANGELOG.md`, `tests/theme-system.test.js:191`

**Interfaces:**
- Consumes: `.nx-ticket-low{grid-template-columns:minmax(0,1fr) auto}` and the cluster ticket markup that renders `完成：<place>` and `跳過：<place>`.
- Produces: a 跳過 column that cannot outgrow its cap, leaving the 完成 column its flexible share.

**Root cause:** `.nx-ticket-low` is a two-column grid whose second track is `auto`. The 跳過 button's max-content contribution is the full `跳過：<place>` string, so a long place name sizes that track to nearly the whole row. The `minmax(0,1fr)` 完成 track is left with almost no width, and because `.nx-decision-btn` sets `overflow:hidden;text-overflow:ellipsis` without `white-space:nowrap`, the 完成 label wraps one CJK character per line and the ticket grows vertically.

- [ ] **Step 1: Write the failing browser test**

Render a cluster ticket whose place name is long, then assert that the 完成 button keeps the majority of the row width and stays a single line:

```js
expect(done.width).toBeGreaterThan(skip.width);
expect(done.height).toBeLessThan(72);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx playwright test tests/browser/ui-ux-hardening.spec.js -g "starve"`

Expected: FAIL because the 完成 button is narrower than 跳過 and tall enough to hold one character per line.

- [ ] **Step 3: Implement the one-rule fix**

Cap the 跳過 button's max-content contribution and let its existing ellipsis apply. This is the only production rule that changes:

```css
.nx-decision-btn.skip{min-width:88px;max-width:120px;white-space:nowrap;padding:0 14px;background:#f7f3ea;color:var(--ink-faint);border:1px solid var(--line)}
```

Leave `.nx-ticket-low:463`, `.nx-decision-btn:464`, and `.nx-decision-btn.done:465` untouched so the existing `home-simplification` assertions keep holding.

- [ ] **Step 4: Run the focused test and verify GREEN**

Re-run the Step 2 command; expected: pass.

- [ ] **Step 5: Ship v80**

Set `app-version.js` and `sw.js` to `v80`. Prepend one `APP_RELEASE_NOTES` entry and drop v75 so the array stays at exactly five, then update `tests/theme-system.test.js:191` to `['v79','v78','v77','v76']` and add the v80 changelog section.

```js
{version:'v80',date:'2026-08-02',title:'主題固定淺色、操作更好按',items:['六個主題在手機深色外觀下不再自動轉深，畫面與淺色外觀一致','設定圖示放大更好按，下一站的「完成」不再被長地點名稱擠成直排']}
```

- [ ] **Step 6: Run repository gates**

Run: `node tools/check-doc-titles.js`

Run: `node tools/check-app-version.js`

Run every `tests/*.test.js` exactly as CI does; expected: all 57 files pass.

Run: `npm run test:browser`; expected: all 30 Playwright tests pass.

## Commit

Three commits on `dev`, in this order, not squashed:

1. `fix(theme): keep the six themes light under system dark appearance`
2. `fix(settings): enlarge the gear glyph to 24px`
3. `fix(today): stop long place names from starving the done button` — carries the v80 release metadata

Then: `git push origin HEAD:dev`. Never force-push.
