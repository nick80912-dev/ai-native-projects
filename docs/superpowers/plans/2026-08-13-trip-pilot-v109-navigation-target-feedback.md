# Trip Pilot v109 Navigation Target Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the visible successful navigation-status row, retain an accessible announcement, and show the exact destination for 1000ms before a 200ms fade, while keeping missing-target feedback visible.

**Architecture:** Keep `navigation-intent.js` unchanged as the transient state owner. Refine only the `index.html` DOM adapter so one live-region element has explicit visual modes and the target has active/fading phases; then forward-bump the App Shell to v109 and move the previously reserved v109/v110 work to v110/v111.

**Tech Stack:** Vanilla ES5 JavaScript, CSS custom properties and media queries, Node.js built-in test runner, Playwright Chromium/WebKit, Service Worker CacheStorage.

## Global Constraints

- A successful destination announcement remains `role="status" aria-live="polite"` but is visually hidden and occupies no layout space.
- A missing target continues to show the visible non-blocking `找不到對應地點` message and write the existing Render diagnostic.
- The destination is fully highlighted for exactly 1000ms, fades for 200ms, and is fully cleared at 1200ms.
- Under `prefers-reduced-motion: reduce`, retain the highlight for 1000ms and then clear it without a fade transition.
- Preserve exact-target lookup, sticky-safe geometry, overlay source scroll/focus return, stale-token protection, session-only intent state, and the raw diagnostic boundary.
- Do not change Schema, Apps Script, Ledger/Shopping data semantics, backup format, synchronization, SW lifecycle, cache strategy, `main`, production deployment, or production tags.
- Forward-bump `app-version.js` and `sw.js` together from v108 to v109; `APP_RELEASE_NOTES` remains exactly five entries: v109–v105.
- The previously reserved UI semantic-token/Today-module batch moves from v109 to v110; the BUILTIN/test-throughput spike moves from v110 to v111. Neither deferred batch is implemented here.

---

### Task 1: Separate successful and failed target feedback

**Files:**
- Modify: `tests/browser/today-live-info.spec.js`
- Modify: `tests/browser/navigation-target-matrix.spec.js`
- Modify: `tests/browser/view-context.spec.js`
- Modify: `tests/render-note.test.js`
- Modify: `index.html:670,2389-2497`

**Interfaces:**
- Consumes: existing `applyNavigationTarget(element,intent)`, `clearNavigationTarget(token)`, `writeNavigationTargetStatus(container,message)`, and `intent.announce`.
- Produces: `writeNavigationTargetStatus(container,message,visible)` where `visible` is true only for an actionable failure; CSS states `.navigation-target-status`, `.navigation-target-status-visible`, `.is-navigation-target`, and `.is-navigation-target-fading`.

- [ ] **Step 1: Write RED browser assertions for visually hidden success**

Update the shared successful-target assertions so they require the live region to retain its text and semantics without layout or hit-testing:

```js
await expect(status).toHaveCount(1);
await expect(status).toHaveAttribute('role','status');
await expect(status).toHaveAttribute('aria-live','polite');
await expect(status).toHaveText(expected.status);
await expect(status).not.toHaveClass(/navigation-target-status-visible/);

const feedback=await status.evaluate((element)=>{
  const box=element.getBoundingClientRect(),style=getComputedStyle(element);
  return {
    width:box.width,height:box.height,
    position:style.position,
    clip:style.clip,
    hit:box.width>0&&box.height>0
      ? document.elementFromPoint(box.left+1,box.top+1)===element
      : false
  };
});
expect(feedback.width).toBeLessThanOrEqual(1);
expect(feedback.height).toBeLessThanOrEqual(1);
expect(feedback.position).toBe('absolute');
expect(feedback.hit).toBe(false);
```

In `tests/browser/today-live-info.spec.js`, remove successful-status geometry assertions and instead assert the destination group immediately follows the prior rendered group without a visible status row. In `tests/browser/view-context.spec.js`, retain announcement text assertions but require the successful status to be visually hidden.

- [ ] **Step 2: Write RED timing assertions for active, fading, and cleared phases**

Use the real launchers and poll real DOM classes:

```js
await expect.poll(()=>page.evaluate((id)=>{
  const target=document.getElementById(id);
  return target&&target.classList.contains('is-navigation-target');
},expected.targetId)).toBe(true);

await page.waitForTimeout(900);
await expect.poll(()=>page.evaluate((id)=>{
  const target=document.getElementById(id);
  return target&&target.classList.contains('is-navigation-target')&&
    !target.classList.contains('is-navigation-target-fading');
},expected.targetId)).toBe(true);

await expect.poll(()=>page.evaluate((id)=>{
  const target=document.getElementById(id);
  return target&&!target.classList.contains('is-navigation-target')&&
    target.classList.contains('is-navigation-target-fading');
},expected.targetId),{timeout:250}).toBe(true);

await expect.poll(()=>page.evaluate((id)=>{
  const target=document.getElementById(id);
  return target&&!target.classList.contains('is-navigation-target')&&
    !target.classList.contains('is-navigation-target-fading');
},expected.targetId),{timeout:350}).toBe(true);
```

For the 390px reduced-motion case, require no fading class and no CSS transition after the 1000ms hold, then require the target and active intent cleared.

- [ ] **Step 3: Keep missing-target behavior visibly RED-safe**

Strengthen the existing missing-target case in `tests/browser/view-context.spec.js`:

```js
const status=page.locator('.navigation-target-status');
await expect(status).toHaveText('找不到對應地點');
await expect(status).toHaveClass(/navigation-target-status-visible/);
await expect(status).toBeVisible();
await expect.poll(()=>page.evaluate(()=>
  AppLog.snapshot().some((entry)=>entry.category==='render'&&
    /導覽目標不存在/.test(entry.message))
)).toBe(true);
```

Update `tests/render-note.test.js` to assert that successful calls use the hidden status mode and missing targets use the visible mode. The exact production change that makes these tests pass is the new third `visible` argument plus separate CSS classes.

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/render-note.test.js
npx playwright test tests/browser/today-live-info.spec.js tests/browser/navigation-target-matrix.spec.js tests/browser/view-context.spec.js --grep "target|定位|explicit|missing"
```

Expected: Node/browser failures show successful `.navigation-target-status` still occupies layout, no fading phase exists, and missing-target status lacks the explicit visible class. Fix test setup errors until failures are only these missing behaviors.

- [ ] **Step 5: Implement explicit live-region visual modes**

Replace the current single visual style with a visually-hidden default and visible failure modifier:

```css
.navigation-target-status{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.navigation-target-status-visible{position:static!important;width:auto!important;height:auto!important;padding:6px 10px!important;margin:0 0 8px!important;overflow:visible!important;clip:auto!important;white-space:normal!important;border-radius:8px;background:var(--line-soft);color:var(--sea-deep);font-size:12px;font-weight:800}
```

Change the adapter signature and class toggle:

```js
function writeNavigationTargetStatus(container,message,visible){
  if(!container)return null;
  if(!navigationTargetStatusElement){
    navigationTargetStatusElement=document.createElement('div');
    navigationTargetStatusElement.setAttribute('role','status');
    navigationTargetStatusElement.setAttribute('aria-live','polite');
  }
  navigationTargetStatusElement.className='navigation-target-status'+
    (visible?' navigation-target-status-visible':'');
  navigationTargetStatusElement.textContent=String(message||'');
  if(navigationTargetStatusElement.parentNode!==container){
    if(navigationTargetStatusElement.parentNode){
      navigationTargetStatusElement.parentNode.removeChild(navigationTargetStatusElement);
    }
    container.insertBefore(navigationTargetStatusElement,container.firstChild||null);
  }
  return navigationTargetStatusElement;
}
```

Call with `true` only in the missing-target branch. Success and top-navigation announcements call with `false`.

- [ ] **Step 6: Implement the 1000ms hold and 200ms fade**

Use two separately owned timers so a new intent can cancel both:

```js
var navigationTargetHoldTimer=null;
var navigationTargetClearTimer=null;

function resetNavigationTargetVisual(){
  if(navigationTargetHoldTimer){clearTimeout(navigationTargetHoldTimer);navigationTargetHoldTimer=null;}
  if(navigationTargetClearTimer){clearTimeout(navigationTargetClearTimer);navigationTargetClearTimer=null;}
  if(navigationTargetElement){
    navigationTargetElement.classList.remove('is-navigation-target');
    navigationTargetElement.classList.remove('is-navigation-target-fading');
  }
  navigationTargetElement=null;
}

function beginNavigationTargetFade(token){
  var active=navigationIntentState.active;
  if(!active||active.token!==token||!navigationTargetElement)return false;
  navigationTargetHoldTimer=null;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    return clearNavigationTarget(token);
  }
  navigationTargetElement.classList.remove('is-navigation-target');
  navigationTargetElement.classList.add('is-navigation-target-fading');
  navigationTargetClearTimer=setTimeout(function(){clearNavigationTarget(token);},200);
  return true;
}
```

CSS uses no transition during the 1000ms hold, then transitions only in the fading phase:

```css
.is-navigation-target{outline:3px solid var(--coral);outline-offset:3px;background:var(--coral-bg)}
.is-navigation-target-fading{transition:outline-color .2s ease,background-color .2s ease}
@media(prefers-reduced-motion:reduce){.is-navigation-target-fading{transition:none!important}}
```

After applying the target, schedule `beginNavigationTargetFade(intent.token)` at 1000ms. Do not change sticky scrolling or intent normalization.

- [ ] **Step 7: Run focused GREEN tests**

Run the same Node and Chromium commands from Step 4. Expected: every selected test passes; success status is hidden, failure status visible, normal motion has active/fading/cleared phases, reduced motion clears without transition, and stale token coverage remains green.

- [ ] **Step 8: Run focused WebKit acceptance**

Run:

```powershell
npx playwright test tests/browser/today-live-info.spec.js tests/browser/navigation-target-matrix.spec.js tests/browser/view-context.spec.js --browser=webkit --grep "target|定位|explicit|missing"
```

Expected: all selected cases pass with the same timing and visibility contract in WebKit.

- [ ] **Step 9: Commit the independently testable behavior**

```powershell
git add -- index.html tests/render-note.test.js tests/browser/today-live-info.spec.js tests/browser/navigation-target-matrix.spec.js tests/browser/view-context.spec.js
git diff --cached --check
git commit -m "fix(navigation): simplify target feedback"
```

---

### Task 2: Forward-bump v109 and reassign deferred roadmap versions

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js:version marker only`
- Modify: `index.html:APP_RELEASE_NOTES`
- Modify: `tests/theme-system.test.js`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`
- Modify: `docs/superpowers/specs/2026-08-12-trip-pilot-architecture-ui-optimization-v108-v110-design.md`
- Modify: `docs/superpowers/plans/2026-08-12-trip-pilot-v109-ui-tokens-today-module.md`
- Modify: `docs/superpowers/plans/2026-08-12-trip-pilot-v110-builtin-test-throughput.md`
- Modify: `docs/superpowers/plans/2026-08-13-trip-pilot-v109-navigation-target-feedback.md`

**Interfaces:**
- Consumes: v108 App/SW identity and the rolling five-release window.
- Produces: synchronized v109 App/SW identity, release notes `[v109,v108,v107,v106,v105]`, current-status authority describing v109 device/PWA acceptance, and unambiguous deferred batches v110/v111.

- [ ] **Step 1: Write RED release-window and version assertions**

Change the hard-coded historical release window in `tests/theme-system.test.js`:

```js
assert.deepStrictEqual(
  Array.from(notes.slice(1),function(note){return note.version;}),
  ['v108','v107','v106','v105']
);
```

Add static assertions that the newest note says the visible success row was removed without removing accessible or failed-target feedback. Run:

```powershell
node --test tests/theme-system.test.js tests/pwa-shell.test.js
node tools/check-app-version.js
```

Expected RED: release-window/current-version assertions fail because production still reports v108.

- [ ] **Step 2: Forward-bump App/SW and roll release notes**

Set exactly:

```js
// app-version.js
var APP_VERSION='v109';

// sw.js
var SW_VERSION='v109';
```

Prepend this user-facing note and remove v104 so the list remains exactly five entries:

```js
{version:'v109',date:'2026-08-13',title:'定位提示更精簡',items:[
  '前往指定行程或採買地點時，只短暫醒目目標，不再多顯示一列「已定位」文字',
  '醒目效果會在一秒後自然淡去；使用減少動態效果時則直接恢復原樣',
  '輔助科技通知、找不到目標的提示、返回原畫面與離線資料行為保持不變'
]}
```

Do not change any other Service Worker code.

- [ ] **Step 3: Correct current status and deferred version ownership**

Update `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, `tasks/current.md`, and `tests/README.md` to record:

- v108 automated/final review passed but Bar found the visible-row UX issue during device acceptance;
- the approved fix is shipped as the v109 candidate and still awaits Bar device/PWA acceptance;
- no `main`, production deployment, or production tag claim;
- v110 owns UI tokens/Today module, and v111 owns the BUILTIN/test-throughput spike.

In the 2026-08-12 architecture spec and both deferred implementation plans, mechanically shift the former v109 batch to v110 and former v110 batch to v111. Rename their document titles and internal version references, but leave physical filenames unchanged to preserve existing links. Add a top note in each deferred plan stating that the filename reflects the original reservation and the authoritative execution version is the new number.

- [ ] **Step 4: Run focused version/document GREEN checks**

Run:

```powershell
node tools/check-app-version.js
node tools/check-doc-titles.js
node tools/check-runtime-assets.js
node --test tests/theme-system.test.js tests/pwa-shell.test.js tests/manifest-status-authority.test.js
node -e "for(const f of ['.ai-manifest.json','.ai-project.json','.ai-deploy.json'])JSON.parse(require('fs').readFileSync(f,'utf8'));console.log('JSON manifests valid')"
git diff --check
```

Expected: v109 consistency, document-title integrity, 10 runtime assets, three focused Node files passing, valid UTF-8 JSON, and clean diff.

- [ ] **Step 5: Commit release and scheduling records**

```powershell
git add -- app-version.js sw.js index.html tests/theme-system.test.js 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md tests/README.md docs/superpowers/specs/2026-08-12-trip-pilot-architecture-ui-optimization-v108-v110-design.md docs/superpowers/plans/2026-08-12-trip-pilot-v109-ui-tokens-today-module.md docs/superpowers/plans/2026-08-12-trip-pilot-v110-builtin-test-throughput.md docs/superpowers/plans/2026-08-13-trip-pilot-v109-navigation-target-feedback.md
git diff --cached --check
git commit -m "docs: release navigation feedback v109"
```

---

### Task 3: Verify the committed candidate and deliver dev

**Files:**
- Modify only if evidence totals or final SHA must be recorded: `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, `tasks/current.md`, `docs/superpowers/plans/2026-08-13-trip-pilot-v109-navigation-target-feedback.md`

**Interfaces:**
- Consumes: committed Task 1 behavior and Task 2 v109 metadata.
- Produces: a fully verified v109 `dev` candidate, exact evidence records, remote equality proof, and a Bar device/PWA handoff.

- [ ] **Step 1: Run the full Node and browser gates**

Run:

```powershell
node --test tests/*.test.js
npx playwright test
npx playwright test tests/browser/today-live-info.spec.js tests/browser/navigation-target-matrix.spec.js tests/browser/view-context.spec.js --browser=webkit --grep "target|定位|explicit|missing"
```

Expected: zero failures. Record exact Node file/test count, full Playwright count, and focused WebKit count from the fresh output; do not copy old v108 totals into final evidence.

- [ ] **Step 2: Run all static and generated-data gates**

Run:

```powershell
node tools/check-app-version.js
node tools/check-doc-titles.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js --check
node -e "for(const f of ['.ai-manifest.json','.ai-project.json','.ai-deploy.json'])JSON.parse(require('fs').readFileSync(f,'utf8'));console.log('JSON manifests valid')"
git diff --check
git status --short
```

Expected: App/SW v109, document titles pass, runtime inventory remains 10 assets, BUILTIN has no drift, JSON parses, diff is clean, and only intentional evidence updates are present.

- [ ] **Step 3: Run the established offline Chromium Health probe**

Use the same local static-server + Chromium offline probe documented by the v108 implementer: open once online, wait until `syncInFlight === null`, switch the page offline, reload through the installed Service Worker, and print:

```text
HEALTH_CHECK_RESULT={"source":"builtin","healthCheck":[],"appLogCount":<number>,"pageErrors":[]}
```

Require `source:"builtin"`, `healthCheck:[]`, and `pageErrors:[]`. A different `appLogCount` is acceptable only if the log remains expected fallback information rather than a page/runtime error.

- [ ] **Step 4: Update exact evidence and verify the evidence-only diff**

Replace provisional counts with fresh Task 3 totals and explicitly state that Bar device/PWA acceptance is still pending. Run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```

Expected: all pass.

- [ ] **Step 5: Commit evidence records**

```powershell
git add -- 07_CHANGELOG.md 08_AI_HANDOVER.md tasks/current.md docs/superpowers/plans/2026-08-13-trip-pilot-v109-navigation-target-feedback.md
git diff --cached --check
git commit -m "docs: record v109 release evidence"
```

If Step 4 did not require any evidence edit, skip this commit rather than creating an empty commit.

- [ ] **Step 6: Re-run committed-tree release gates**

After the final commit, re-run Steps 1–3 without editing files. Require the same zero-failure/static/offline results and `git status --short` with no tracked changes.

- [ ] **Step 7: Fetch, require no remote-only commits, and push dev**

Run:

```powershell
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
git push origin dev
git fetch origin --prune
git rev-list --left-right --count origin/dev...dev
git rev-parse dev
git rev-parse origin/dev
```

Before push, the left count must be `0`; stop if origin has remote-only commits. After push, require `0 0` and identical SHAs. Do not force-push.

- [ ] **Step 8: Hand off Bar device/PWA acceptance**

Ask Bar to verify on the target phone/PWA:

1. Hero/badge/trip launchers reach the exact destination.
2. No visible successful `已定位` row or layout gap appears.
3. The destination remains highlighted for about one second and fades away.
4. A deliberately missing target still shows the visible fallback message.
5. Closing Shopping restores source scroll/focus.
6. Offline restart reports normal Health Check.

Do not begin v110 until this acceptance is recorded.
