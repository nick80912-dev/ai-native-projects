# SW Prompt Removal and Cedar Theme Refresh v101 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a v101 `dev` candidate that removes the mistimed global Service Worker update prompt and changes only cedar's action token to forest green `#2F6B4F`.

**Architecture:** Treat the two product decisions as separate, independently reviewable slices in the existing single-file UI: the theme slice changes one first-layer token behind existing semantic aliases, while the PWA slice deletes the prompt interface and returns registration to a passive failure-logged adapter. The Service Worker lifecycle, cache strategy, data/domain modules, and renderer structure remain untouched; the final release slice synchronizes version and documentation only after focused behavior passes.

**Tech Stack:** Static HTML/CSS/JavaScript, Node `assert`/`vm` tests, Playwright Chromium, PowerShell release gates, Git `dev` branch.

## Global Constraints

- Target runtime is exactly v101; `app-version.js` and `sw.js` must agree.
- Push only `dev`; do not merge `main`, deploy Netlify production, or create a production tag.
- In `sw.js`, change only `SW_VERSION` from `v100` to `v101`; preserve `skipWaiting()`, `clients.claim()`, `SHELL`, handlers, cache modes, and offline fallback byte-for-byte.
- Remove the global update prompt without adding Toast, modal, badge, banner, settings notice, automatic reload, or generation-mismatch detection.
- Cedar changes only `--t-action` from `#7a4f24` to `#2f6b4f`; every other first-layer token, semantic role, component rule, fixed semantic color, and theme remains unchanged.
- Do not modify Ledger, Shopping, stores, repositories, Buy-to-Ledger, schema, data formats, localStorage, backup formats, `PERSONAL_STATE_VERSION`, or `netlify.toml`.
- Backlog #24 is archived as a cancelled experiment after v99/v100 device feedback, not represented as completed functionality.

---

### Task 1: Lock and implement the cedar action color

**Files:**
- Modify: `tests/theme-system.test.js`
- Modify: `tests/browser/ui-ux-hardening.spec.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing `[data-theme="cedar"]` first-layer tokens and the `--sea:var(--t-action)` semantic alias.
- Produces: cedar `--t-action:#2f6b4f` while tea remains `--t-action:#896748`; no new runtime functions or state.

- [ ] **Step 1: Write the failing Node and Browser expectations**

In `tests/theme-system.test.js`, add exact cedar and white-text checks beside the existing tea assertion:

```js
const cedarBlock=themeBlock(html,'cedar');
assert.strictEqual(cssValue(cedarBlock,'--t-action'),'#2f6b4f');
assert(contrastRatio('#ffffff',cssValue(cedarBlock,'--t-action'))>=4.5,'cedar action supports white text');
assert.strictEqual(cssValue(themeBlock(html,'tea'),'--t-action'),'#896748');
```

In the existing Playwright case `all six themes preserve sliders currentColor and compact header chrome`, return the computed `--t-action` value for each theme and add:

```js
expect(themes.find(theme=>theme.id==='cedar').action).toBe('#2f6b4f');
expect(themes.find(theme=>theme.id==='tea').action).toBe('#896748');
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node tests/theme-system.test.js
npx playwright test tests/browser/ui-ux-hardening.spec.js --grep "all six themes preserve"
```

Expected: both commands fail because computed cedar action is still `#7a4f24`; tea remains correct.

- [ ] **Step 3: Make the minimal production change**

In `[data-theme="cedar"]`, change only:

```css
--t-action:#2f6b4f;
```

Do not edit `THEME_REGISTRY.cedar.chrome`, semantic aliases, or component CSS.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node tests/theme-system.test.js
npx playwright test tests/browser/ui-ux-hardening.spec.js --grep "all six themes preserve"
git diff --check
```

Expected: Node and Browser checks pass; cedar reports `#2f6b4f`, tea reports `#896748`, and whitespace check exits 0.

- [ ] **Step 5: Commit the isolated theme slice**

```powershell
git add index.html tests/theme-system.test.js tests/browser/ui-ux-hardening.spec.js
git commit -m "style(theme): distinguish cedar action color"
```

---

### Task 2: Delete the SW prompt interface and retain passive registration

**Files:**
- Delete: `tests/sw-update-prompt.test.js`
- Modify: `tests/browser/sw-update-cache.spec.js`
- Modify: `index.html`
- Test: `tests/pwa-shell.test.js`

**Interfaces:**
- Consumes: browser `navigator.serviceWorker.register('sw.js')` and existing `AppLog.sync(message)` failure logging.
- Produces: a passive load-time registration with no prompt DOM, prompt state, observer, or reload action; existing Service Worker cache tests remain the behavioral contract.

- [ ] **Step 1: Retire the deleted product contract from tests**

Delete `tests/sw-update-prompt.test.js`. In `tests/browser/sw-update-cache.spec.js`, remove only:

- `serviceWorkerUpdateReport(page)`.
- `existing controller shows one prompt and reloads only after the explicit action`.
- `update prompt fits phone widths above the tabbar with a 44px action`.

Keep `activeCacheReport`, `waitForActiveWorker`, `waitForShellCached`, update-generation integrity, offline navigation, and uncached-subresource cases unchanged. This approved feature deletion intentionally has no RED phase: its complete production interface and its positive prompt tests are retired together, while surviving PWA behavior is guarded below.

- [ ] **Step 2: Remove the prompt presentation and state**

From `index.html`, delete:

- `.sw-update-prompt` base, hidden, span, button, and focus-visible CSS rules.
- `<div class="sw-update-prompt" id="swUpdatePrompt" ...>`.
- `swUpdatePromptShown`.
- `showServiceWorkerUpdatePrompt()`, `reloadForServiceWorkerUpdate()`, and `setupServiceWorkerUpdatePrompt()`.

Replace the load handler body with exactly the existing registration plus failure logging:

```js
navigator.serviceWorker.register('sw.js').catch(function(e){
  if (window.AppLog) AppLog.sync('SW 註冊失敗:' + (e && e.message ? e.message : e));
});
```

- [ ] **Step 3: Run surviving PWA contracts**

Run:

```powershell
node tests/pwa-shell.test.js
npx playwright test tests/browser/sw-update-cache.spec.js
git diff --check
```

Expected: PWA shell passes and confirms registration remains; all remaining Browser cache/offline cases pass. No test asserts source substrings solely to prove the prompt is absent.

- [ ] **Step 4: Inspect the scoped diff and commit**

Run:

```powershell
git diff -- index.html tests/sw-update-prompt.test.js tests/browser/sw-update-cache.spec.js
git diff -- sw.js
```

Expected: the first diff contains only prompt deletion and Task 1's already committed theme line is absent; `sw.js` has no diff.

Then commit:

```powershell
git add index.html tests/sw-update-prompt.test.js tests/browser/sw-update-cache.spec.js
git commit -m "refactor(pwa): remove update prompt"
```

---

### Task 3: Stage v101, update canonical records, verify, and push dev

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `tests/README.md`
- Modify: `tasks/current.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: verified cedar token and passive SW registration from Tasks 1–2.
- Produces: synchronized v101 App/SW markers, a five-entry `APP_RELEASE_NOTES` window, canonical cancelled-backlog status, exact fresh test totals, and a non-force `origin/dev` push.

- [ ] **Step 1: Update the version-dependent test fixture first**

In `tests/theme-system.test.js`, change the four historical release versions after current to:

```js
['v100','v99','v98','v97']
```

Run `node tests/theme-system.test.js` and expect failure because current runtime and newest release note are still v100.

- [ ] **Step 2: Synchronize the v101 runtime markers and release note**

Set:

```js
// app-version.js
var APP_VERSION='v101';

// sw.js
var SW_VERSION='v101';
```

Prepend one `APP_RELEASE_NOTES` entry dated `2026-08-10` that tells users the update prompt was removed because its timing did not match visible content, cedar now uses a clearer green action color, and data/offline behavior is unchanged. Retain v100, v99, v98, and v97; drop v96 so the list remains exactly five entries.

- [ ] **Step 3: Prove the Service Worker diff is version-only**

Run:

```powershell
git diff -U0 -- sw.js
node tools/check-app-version.js
node tests/pwa-shell.test.js
node tests/theme-system.test.js
```

Expected: `sw.js` shows one changed version line only; version check reports v101; PWA shell and theme tests pass.

- [ ] **Step 4: Update product, test, task, and manifest records**

Make these exact record changes:

- `04_UI_GUIDELINES.md`: cedar action becomes `#2F6B4F`; every other table cell remains unchanged.
- `07_CHANGELOG.md`: prepend a 2026-08-10 v101 entry recording prompt cancellation after v99/v100 acceptance feedback, the one-token cedar change, unchanged SW lifecycle/cache/data boundaries, and final gate evidence.
- `tests/README.md`: delete the `sw-update-prompt.test.js` line; describe `theme-system.test.js` exact cedar/tea and contrast coverage; describe `browser/ui-ux-hardening.spec.js` computed action coverage; keep cache/offline Browser coverage.
- `tasks/backlog.md`: update the date and remove item #24 without renumbering anything.
- `tasks/done.md`: update the date and add a top entry stating #24 was cancelled after the v99/v100 experiment because timing mismatched visible content; explicitly say this is not completed functionality.
- `tasks/current.md`: make v101 the dev candidate, record removal and cedar refresh, replace the v100 prompt acceptance action with v101 mobile appearance/no-prompt acceptance, and preserve main/production/Netlify warnings.
- `.ai-manifest.json`: set version to `2.25-sw-prompt-removal-cedar-v101`, update date/status text, replace prompt acceptance with v101 device acceptance, and later fill exact successful test totals.

- [ ] **Step 5: Run the complete verification gate and capture totals**

Run:

```powershell
$failed=@(); $count=0; Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { $count++; node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; Write-Host "NODE_TOTAL=$count"; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Expected: 82 Node test files pass, 145 Playwright tests pass, document/version/runtime/manifest checks pass, and diff check exits 0. If actual totals differ only because of deliberate test retirement described above, record the observed totals instead of inventing them; any failed case blocks the push.

- [ ] **Step 6: Insert exact totals, rerun document gates, and commit v101**

Replace provisional totals in `07_CHANGELOG.md`, `tasks/current.md`, and `.ai-manifest.json` with the successful output. Then run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Commit:

```powershell
git add app-version.js sw.js index.html 04_UI_GUIDELINES.md 07_CHANGELOG.md tests/README.md tests/theme-system.test.js tasks/current.md tasks/backlog.md tasks/done.md .ai-manifest.json
git commit -m "chore(release): stage v101 dev candidate"
```

- [ ] **Step 7: Recheck ancestry and push `dev` non-force**

Run:

```powershell
git fetch origin --prune
$remote=(git rev-parse origin/dev).Trim()
$base=(git merge-base HEAD origin/dev).Trim()
if($base -ne $remote){throw 'origin/dev is not an ancestor of HEAD'}
git push origin dev
if((git rev-parse HEAD).Trim() -ne (git rev-parse origin/dev).Trim()){throw 'push verification failed'}
git status --short --branch
```

Expected: push succeeds without force, `HEAD` equals `origin/dev`, the worktree is clean, and `main`, production deployment, and tags remain untouched.

- [ ] **Step 8: Hand off mobile acceptance**

Report commit IDs and exact automated totals. Ask Bar to verify on the dev PWA that no update prompt or automatic reload appears, cedar uses the approved A green for links/buttons/hero action side, tea stays brown, and existing data remains present. Stop before merge, deploy, or tag.
