# Service Worker Update Prompt v99 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v99 with a persistent, user-triggered Service Worker update prompt while preserving the current lifecycle and reserving v100 for a separate real-device update event.

**Architecture:** `index.html` owns a small DOM prompt and three registration-side functions. The watcher records whether the page already had a controller, observes both `updatefound` worker activation and `controllerchange`, and reveals the prompt once; only the prompt button reloads. `sw.js` remains the cache/lifecycle authority and changes only its version marker.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Service Worker APIs, Node `assert`/`vm`, Playwright, existing versioned static server.

## Global Constraints

- v99 and v100 are separate pushes. This plan ends immediately after v99 is pushed and verified.
- Do not create or push v100 until Bar confirms the target device is controlled by v99.
- Preserve `skipWaiting()`, `clients.claim()`, install/activate/fetch handlers, SHELL membership, HTTP cache bypass, and offline fallback behavior.
- Never reload automatically; only `reloadForServiceWorkerUpdate()` may call `window.location.reload()`.
- First install must not display an update prompt. Existing-controller updates display at most once after activation/controller change.
- Prompt copy is exactly `新版已就緒` with button `立即更新`; no dismiss button.
- Prompt z-index is `110`, below overlays (`130+`) and Toast (`200`), above tabbar (`70`) and FAB (`90`).
- Do not modify Ledger, Shopping, schema, CMS, storage, repositories, data formats, `main`, production deploys, or tags.
- Execute inline on the existing `dev` checkout because Bar explicitly requested a direct `dev` push; do not create a worktree or subagent.

---

### Task 1: Lock the update lifecycle and mobile UI with failing tests

**Files:**
- Create: `tests/sw-update-prompt.test.js`
- Modify: `tests/browser/sw-update-cache.spec.js`

**Interfaces:**
- Consumes: production functions extracted from `index.html`, real browser ServiceWorkerContainer events, and `createVersionedServer()`.
- Produces: executable contracts for first-install suppression, one-time reveal, explicit-only reload, two-generation update, and mobile layout.

- [ ] **Step 1: Write the Node behavior test before production functions exist**

Extract `showServiceWorkerUpdatePrompt`, `reloadForServiceWorkerUpdate`, and `setupServiceWorkerUpdatePrompt` by brace counting. Execute them in a VM sandbox with a real mutable prompt object and event-target fakes. Cover these literal outcomes:

```js
assert.strictEqual(firstInstall.prompt.hidden,true);
assert.strictEqual(existing.prompt.hidden,false);
assert.strictEqual(existing.promptShows,1);
assert.strictEqual(existing.reloads,0);
existing.sandbox.reloadForServiceWorkerUpdate();
assert.strictEqual(existing.reloads,1);
```

Fire both the installing worker's `statechange` with `state='activated'` and the container's `controllerchange`; the reveal counter must remain one. Remove `swUpdatePrompt` from the fake document and assert `showServiceWorkerUpdatePrompt()` returns `false` without throwing.

- [ ] **Step 2: Add real two-generation and mobile Browser cases**

In the existing versioned-server suite:

```js
test('existing controller shows one prompt and reloads only after the explicit action', async ({ page }) => {
  server.setGeneration(1);
  await page.goto(ORIGIN + '/index.html');
  await waitForActiveWorker(page);
  await expect(page.locator('#swUpdatePrompt')).toBeHidden();
  server.setGeneration(2);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect(page.locator('#swUpdatePrompt')).toBeVisible();
  await expect.poll(() => page.evaluate(() => QA_INDEX_GEN)).toBe('QAGEN1');
  await page.getByRole('button',{name:'立即更新'}).click();
  await expect.poll(() => page.evaluate(() => QA_INDEX_GEN)).toBe('QAGEN2');
});
```

Add one parameterized 320／375／390px test that invokes `showServiceWorkerUpdatePrompt()`, checks the prompt stays inside the viewport, has no document horizontal overflow, and the button height is at least 44px.

- [ ] **Step 3: Run both tests and verify RED**

Run:

```powershell
node tests/sw-update-prompt.test.js
npx playwright test tests/browser/sw-update-cache.spec.js
```

Expected: Node fails because the three production functions are missing; Browser fails because `#swUpdatePrompt` and its button do not exist. Existing cache-integrity cases may remain green.

---

### Task 2: Implement the persistent prompt and ship runtime v99

**Files:**
- Modify: `index.html` near `.toast`, `#toast`, and the final SW registration script
- Modify: `app-version.js`
- Modify: `sw.js`
- Test: `tests/sw-update-prompt.test.js`
- Test: `tests/browser/sw-update-cache.spec.js`

**Interfaces:**
- Consumes: `navigator.serviceWorker`, an initial `hadController` boolean, `registration.installing`, `updatefound`, `statechange`, and `controllerchange`.
- Produces: `showServiceWorkerUpdatePrompt(): boolean`, `reloadForServiceWorkerUpdate(): void`, and `setupServiceWorkerUpdatePrompt(serviceWorker, hadController): (registration) => void`.

- [ ] **Step 1: Add the dedicated prompt markup and CSS**

Add the static hidden DOM next to the existing Toast and these layout properties:

```css
.sw-update-prompt{position:fixed;z-index:110;left:12px;right:12px;bottom:calc(var(--tabbar-height) + env(safe-area-inset-bottom) + 10px);max-width:596px;margin:0 auto;display:flex;align-items:center;gap:12px;box-sizing:border-box}
.sw-update-prompt[hidden]{display:none}
.sw-update-prompt span{flex:1;min-width:0}
.sw-update-prompt button{flex:0 0 auto;min-height:44px}
```

Use existing theme roles (`var(--sea-deep)`, `#fff`, `var(--shadow-lg)`) and do not add a new design token.

- [ ] **Step 2: Implement the one-time observer**

Implement the minimal behavior:

```js
var swUpdatePromptShown=false;
function showServiceWorkerUpdatePrompt(){
  if(swUpdatePromptShown)return false;
  var prompt=document.getElementById('swUpdatePrompt');
  if(!prompt)return false;
  swUpdatePromptShown=true;
  prompt.hidden=false;
  return true;
}
function reloadForServiceWorkerUpdate(){window.location.reload();}
function setupServiceWorkerUpdatePrompt(serviceWorker,hadController){
  function ready(){if(hadController)showServiceWorkerUpdatePrompt();}
  serviceWorker.addEventListener('controllerchange',ready);
  return function(registration){
    registration.addEventListener('updatefound',function(){
      var worker=registration.installing;
      if(!worker)return;
      worker.addEventListener('statechange',function(){if(worker.state==='activated')ready();});
    });
  };
}
```

In the load handler, call `setupServiceWorkerUpdatePrompt()` before `register()`, then pass the returned observer to the registration promise. Preserve the existing AppLog catch text.

- [ ] **Step 3: Increment both version authorities to v99**

Change exactly:

```js
// sw.js
var SW_VERSION='v99';

// app-version.js
var APP_VERSION='v99';
```

Do not change SHELL or any Service Worker handler.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node tests/sw-update-prompt.test.js
node tests/pwa-shell.test.js
node tools/check-app-version.js
npx playwright test tests/browser/sw-update-cache.spec.js
git diff --check
```

Expected: Node prompt behavior and PWA shell pass, version check reports v99, every SW Browser case passes, and whitespace check exits 0.

- [ ] **Step 5: Commit the v99 runtime slice**

```powershell
git add index.html app-version.js sw.js tests/sw-update-prompt.test.js tests/browser/sw-update-cache.spec.js
git commit -m "feat(pwa): prompt for activated updates"
```

---

### Task 3: Document v99, run the complete gate, and push only v99

**Files:**
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `.ai-manifest.json`
- Keep unchanged: `tasks/backlog.md` item #24

**Interfaces:**
- Consumes: verified v99 runtime and exact test totals.
- Produces: canonical status stating v99 is deployed to `dev`, v100 is blocked on Bar loading v99, and backlog #24 is not complete.

- [ ] **Step 1: Update canonical documents**

Record:

- v99 contains the persistent update prompt and no cache/lifecycle changes.
- First install is suppressed, reload is explicit, and overlays remain above the prompt.
- `tasks/current.md` next action is Bar loading／confirming v99 on the target device; only then may v100 be created.
- backlog #24 remains open until the real v99→v100 device acceptance passes.
- `tests/README.md` lists the new Node test and expanded Browser coverage.
- `.ai-manifest.json` version/status/test counts match the verified results.

- [ ] **Step 2: Run the full verification gate**

Run:

```powershell
$failed=@(); $count=0; Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { $count++; node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
git status --short --branch
```

Expected: every Node and Playwright test passes, version reports v99, runtime inventory remains eight assets, manifest parses, diff check exits 0, and only intended documentation files remain uncommitted.

- [ ] **Step 3: Commit documentation**

```powershell
git add .ai-manifest.json 07_CHANGELOG.md tasks/current.md tests/README.md
git commit -m "docs(release): stage service worker prompt v99"
```

- [ ] **Step 4: Recheck ancestry and push dev non-force**

```powershell
git fetch origin --prune
$remote=(git rev-parse origin/dev).Trim()
$base=(git merge-base HEAD origin/dev).Trim()
if($base -ne $remote){throw 'origin/dev is not an ancestor of HEAD'}
git push origin dev
if((git rev-parse HEAD).Trim() -ne (git rev-parse origin/dev).Trim()){throw 'push verification failed'}
```

Expected: `dev` push succeeds, HEAD equals `origin/dev`, and no v100 commit, `main` merge, deployment command, or tag exists.

- [ ] **Step 5: Stop at the v99 device gate**

Report the v99 commit and exact device steps: open the dev PWA, accept any v98→v99 prompt, confirm displayed SW version/cache is v99, and then respond `confirm`. Do not modify either version file again in this plan.
