# Trip Day Switch Navigation Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Trip-view Day chips switch dates at the day top without destination feedback, preserve Today-to-Trip feedback, stabilize the two diagnosed Linux Chromium assertions, and finish the authorized v110 release.

**Architecture:** Keep `navigation-intent.js` unchanged. Add a small in-page `selectTripDay(dayIndex)` adapter in `index.html`; only Trip Day chips call it, while Today launchers continue through `gotoDay(dayIndex)` and the existing `trip-day` intent. The CI remediation changes browser-test measurement margins only.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js tests, Playwright Chromium/WebKit, GitHub Actions, Netlify.

## Global Constraints

- Do not change the six theme palettes or existing visual direction.
- Do not add a global store, controller, event bus, framework, or navigation-intent option.
- Top Day chips must switch date, render the selected day, and return to its top without target classes or new live-status output.
- Today launchers must preserve existing cross-view target feedback.
- Keep the production 1000ms target hold and production CSS unchanged.
- App, Service Worker, and cache remain v110.

---

### Task 1: Stabilize the diagnosed browser assertions

**Files:**
- Modify: `tests/browser/navigation-target-matrix.spec.js:148-149`
- Modify: `tests/browser/today-live-info.spec.js:428-434`

**Interfaces:**
- Consumes: computed `DOMRect` dimensions and the existing reduced-motion navigation completion state.
- Produces: test-only tolerances; no production interface.

- [ ] **Step 1: Apply the exact sub-pixel tolerance**

In `expectConfirmedTarget`, retain the hidden-box geometry assertions but accept browser rasterization noise:

```js
expect(geometry.statusWidth).toBeLessThanOrEqual(1.01);
expect(geometry.statusHeight).toBeLessThanOrEqual(1.01);
```

- [ ] **Step 2: Apply the exact scheduler tolerance**

Keep the 800ms early-state assertions and the final state value, but change only the condition-poll limit:

```js
await expect.poll(() => target.evaluate((element) => ({
  active: element.classList.contains('is-navigation-target'),
  fading: element.classList.contains('is-navigation-target-fading'),
  intentActive: navigationIntentState.active !== null
})), { timeout: 1000 }).toEqual({ active: false, fading: false, intentActive: false });
```

- [ ] **Step 3: Run the two historically failing cases repeatedly**

Run:

```powershell
npx playwright test tests/browser/navigation-target-matrix.spec.js -g "gotoDay (tap|enter) confirms" --repeat-each=10 --reporter=line
npx playwright test tests/browser/today-live-info.spec.js -g "navigation target disables transition" --repeat-each=10 --reporter=line
```

Expected: both commands pass every repetition; production files remain unchanged.

---

### Task 2: Add quiet in-page Trip Day switching with TDD

**Files:**
- Modify: `tests/browser/navigation-target-matrix.spec.js`
- Modify: `index.html:2582-2589`

**Interfaces:**
- Consumes: `curDay`, `curView`, `renderDaybar()`, `renderTrip()`, `viewUiState.trip`, `viewScrollElement()`, and the existing navigation target cleanup functions.
- Produces: `selectTripDay(dayIndex: number): void`; Trip Day-chip HTML calls it. `gotoDay(dayIndex: number): void` remains the Today cross-view entry.

- [ ] **Step 1: Write the failing browser test**

Add a test outside the existing target matrix that starts in Trip, scrolls down, activates a different top Day chip, and checks the quiet result:

```js
test('Trip Day chips switch dates at the top without navigation target feedback', async ({ page }) => {
  await openFixture(page, '2026-10-18T16:45:00+09:00', VIEWPORT_CASES[0]);
  await page.evaluate(async () => {
    switchView('trip');
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.scrollingElement.scrollTop = 600;
  });

  await page.locator('.day-chip').nth(1).click();

  await expect(page.locator('.day-chip').nth(1)).toHaveClass(/active/);
  await expect(page.locator('#tripday_1')).toBeVisible();
  await expect(page.locator('#tripday_1')).not.toHaveClass(/is-navigation-target/);
  await expect(page.locator('.navigation-target-status')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeLessThanOrEqual(4);
  expect(await page.evaluate(() => ({
    pending: navigationIntentState.pending,
    active: navigationIntentState.active
  }))).toEqual({ pending: null, active: null });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
npx playwright test tests/browser/navigation-target-matrix.spec.js -g "Trip Day chips switch dates" --reporter=line
```

Expected: FAIL because the existing Day chip uses `gotoDay()` and creates a navigation target/status.

- [ ] **Step 3: Implement the minimal in-page adapter**

Change only the Trip Day-chip handler to `selectTripDay(i)` and add:

```js
function selectTripDay(i) {
  if (navigationIntentState.active) clearNavigationTarget(navigationIntentState.active.token);
  curDay = i;
  renderDaybar();
  renderTrip();
  if (viewUiState.trip) viewUiState.trip.scrollY = 0;
  requestAnimationFrame(function () {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}
```

The animation-frame boundary runs after the Day bar and Trip content layout, so browser scroll anchoring cannot move the page away from zero after the explicit Day-chip selection. Do not change `gotoDay()`; Today launchers must continue to call it.

- [ ] **Step 4: Verify GREEN and preserved cross-view behavior**

Run:

```powershell
npx playwright test tests/browser/navigation-target-matrix.spec.js --reporter=line
npx playwright test tests/browser/view-context.spec.js -g "gotoDay and openShopPlace" --reporter=line
```

Expected: the quiet Day-chip test passes and all existing exact-target/Today-to-Trip cases remain green.

- [ ] **Step 5: Commit Tasks 1-2 together**

```powershell
git add -- index.html tests/browser/navigation-target-matrix.spec.js tests/browser/today-live-info.spec.js
git diff --cached --check
git commit -m "fix(trip): quiet in-page day switching"
```

---

### Task 3: Verify and update PR #14

**Files:**
- Verify: committed repository tree
- Remote: `dev`, PR #14, `main`, Netlify production, annotated tag `production-v110`

**Interfaces:**
- Consumes: the commits from Tasks 1-2 and existing release workflow.
- Produces: green PR checks, a verified `main` merge, live Netlify v110, and rollback tag `production-v110`.

- [ ] **Step 1: Run local committed-tree gates**

Run:

```powershell
node --test tests/*.test.js
npx playwright test --reporter=line
npx playwright test tests/browser/today-live-info.spec.js tests/browser/ui-ux-hardening.spec.js tests/browser/navigation-target-matrix.spec.js --browser=webkit --reporter=line
git diff --check
git status --short
```

Expected: Node 87/87, full Chromium suite green, focused WebKit green, no whitespace errors, and a clean worktree.

- [ ] **Step 2: Push `dev` without rewriting history**

```powershell
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
git push origin dev
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
```

Expected: no remote-only commits before push and `0 0` after push.

- [ ] **Step 3: Wait for every PR check**

```powershell
gh pr checks 14 --watch --interval 10
gh pr view 14 --json state,mergeable,mergeStateStatus,statusCheckRollup,headRefOid,url
```

Expected: all required GitHub and Netlify preview checks pass and the PR is mergeable.

- [ ] **Step 4: Merge and verify Git ancestry**

```powershell
gh pr merge 14 --merge
git fetch origin --prune
git merge-base --is-ancestor origin/dev origin/main
git rev-parse origin/main
```

Expected: PR #14 is merged and `origin/main` contains the verified `dev` head.

- [ ] **Step 5: Verify Netlify production before tagging**

Poll the production deployment status for the merge SHA, then verify:

```text
https://trippilot-jp.netlify.app/app-version.js -> v110
https://trippilot-jp.netlify.app/sw.js -> okayama-trip-v110
sw.js Cache-Control -> no-cache, no-store, must-revalidate
```

Run a production Chromium health probe and require no page errors or failed health checks.

- [ ] **Step 6: Create the rollback tag only after production verification**

```powershell
git tag -a production-v110 <verified-main-merge-sha> -m "Production v110 verified 2026-08-13; SW cache okayama-trip-v110. Roll back by publishing the previous Netlify deploy first, then revert through a PR."
git push origin production-v110
git ls-remote --tags origin production-v110
```

Expected: the annotated tag resolves remotely to the verified production merge.
