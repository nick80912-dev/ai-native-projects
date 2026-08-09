# Network Retry and Toast Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one 800ms pause between the existing two `fetchSheet` attempts and make `toast()` safely no-op when its DOM node is absent.

**Architecture:** Keep both changes inside their existing `index.html` functions. Test the real named functions in a Node VM with deterministic network and timer boundaries; do not introduce a retry abstraction, new renderer, or persistent state.

**Tech Stack:** Browser JavaScript (ES5-compatible syntax), Node `assert` + `vm`, Playwright, existing source extraction and governance scripts.

## Global Constraints

- `fetchSheet()` still makes at most two attempts and only delays after the first failure.
- The retry delay is exactly 800ms; `FETCH_TIMEOUT`, CSV validation, logs, and rejection semantics remain unchanged.
- `toast()` only returns early when `#toast` is absent; existing content, action, timer, escaping, and class behavior remain unchanged when present.
- Do not create a generic retry module or dynamically create Toast DOM.
- Do not modify schema, data format, parser, snapshot activation, renderer, Service Worker lifecycle/cache strategy, `app-version.js`, or `SW_VERSION`; remain on v98.
- Do not merge `main`, deploy Netlify, or create a production tag; push only `dev` after complete verification.

---

### Task 1: Characterize and Implement Both Failure Guards

**Files:**
- Create: `tests/network-retry-toast-guard.test.js`
- Modify: `index.html` functions `fetchSheet()` and `toast()`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: existing `fetchWithTimeout(url,ms)`, `AppLog.sync(message)`, `setTimeout`, `document.getElementById('toast')`, Toast globals and helpers.
- Produces: unchanged `fetchSheet(sheet): Promise<string>` with an observed 800ms boundary, and unchanged `toast(message,actionText,actionFn,durationMs): void` that is safe when no Toast node exists.

- [ ] **Step 1: Write the failing retry behavior test**

Create `tests/network-retry-toast-guard.test.js`. Use `readIndexHtml()` and `extractFunction()` from `tests/support/source.js` so the test executes the production functions.

Provide `loadFetchSheet(outcomes)` with a `fetchWithTimeout()` recording double and a fake `setTimeout()` that records the requested delay then invokes its callback immediately. Assert literal behavior:

```js
const recovered=loadFetchSheet([
  Promise.reject(new Error('offline')),
  Promise.resolve({ok:true,text(){return Promise.resolve('a,b\n1,2');}})
]);
assert.strictEqual(await recovered.fetchSheet({key:'shop',gid:'123'}),'a,b\n1,2');
assert.deepStrictEqual(recovered.events,[
  'fetch:1','log:shop 第1次抓取失敗:offline — 自動重試','delay:800','fetch:2'
]);
```

Add independent cases proving:

```js
// first success
assert.deepStrictEqual(events,['fetch:1']);

// both fail
assert.strictEqual(attempts,2);
assert.deepStrictEqual(delays,[800]);
assert.strictEqual(finalError.message,'still offline');
```

- [ ] **Step 2: Write the failing Toast null-node test**

Extract `toast()` and execute it with `document.getElementById()` returning `null`. Make `setTimeout`, `clearTimeout`, and `escapeHtml` throw if invoked, initialize `toastAction` to a sentinel, then assert:

```js
assert.doesNotThrow(()=>sandbox.toast('同步完成'));
assert.strictEqual(sandbox.toastAction,'sentinel');
assert.deepStrictEqual(events,[]);
```

Run the same real function with a minimal Toast element and assert text/class/timer behavior still occurs, complementing the existing action-duration coverage in `ledger-three-second-entry.test.js`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node tests/network-retry-toast-guard.test.js`

Expected failure: retry events lack `delay:800`, and the missing Toast node produces a `TypeError` from `el.textContent` or `el.innerHTML`.

- [ ] **Step 4: Implement the minimal production changes**

In `fetchSheet()` replace the immediate retry with:

```js
return tryOnce().catch(function(e){
  AppLog.sync(s.key+' 第1次抓取失敗:'+(e.message||e)+' — 自動重試');
  return new Promise(function(resolve){setTimeout(resolve,800);}).then(tryOnce);
});
```

In `toast()` add only this guard immediately after lookup:

```js
var el=document.getElementById('toast');
if(!el)return;
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node tests/network-retry-toast-guard.test.js
node tests/ledger-three-second-entry.test.js
node tests/atomic-sheet-sync.test.js
npx playwright test tests/browser/trip-three-scenarios.spec.js tests/browser/ui-ux-hardening.spec.js
```

Expected: all pass; the browser scenarios prove boot/offline/online flows and visible Toast behavior still work.

- [ ] **Step 6: Index the test and commit**

Add a `tests/README.md` entry describing exact retry ordering, two-attempt cap, final rejection, missing Toast no-op, and preserved normal Toast path.

Commit:

```powershell
git add index.html tests/network-retry-toast-guard.test.js tests/README.md
git commit -m "fix(quality): harden network retry and toast fallback"
```

---

### Task 2: Governance, Full Verification, and Safe Push

**Files:**
- Modify: `tasks/backlog.md`
- Modify: `tasks/done.md`
- Modify: `tasks/current.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: Task 1 behavior and actual final test counts.
- Produces: archived backlog evidence, current handoff, validation baseline, and a clean fast-forward `dev` push.

- [ ] **Step 1: Move only the completed backlog clause**

Remove `fetchSheet 重試加 800ms 退避;toast() null guard` from backlog #2. Leave the TEST localStorage prefix-isolation child as the only remaining quality-batch item.

Add a `tasks/done.md` record with the exact one-delay/two-attempt boundary and fail-soft Toast behavior.

- [ ] **Step 2: Update current delivery records**

Update `tasks/current.md`, `07_CHANGELOG.md`, and `08_AI_HANDOVER.md` to state:

- Retry order is first failure log → 800ms wait → one existing retry.
- Toast absence suppresses only presentation, not business errors.
- No data, schema, renderer, SW, version, merge, deploy, or tag changes occurred.
- The next highest remaining backlog item is TEST-build localStorage prefix isolation.

- [ ] **Step 3: Run the complete final gate and record actual counts**

Run every top-level `tests/*.test.js` file in a fail-fast PowerShell loop, then run:

```powershell
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
git diff --check
```

Parse `.ai-manifest.json`, `manifest.webmanifest`, and `runtime-assets.json` with `ConvertFrom-Json`. Expected: all pass and version remains v98.

- [ ] **Step 4: Update manifest and commit documentation**

Update `.ai-manifest.json` with the actual Node/Playwright counts and the next pending quality item. Commit:

```powershell
git add tasks/backlog.md tasks/done.md tasks/current.md 07_CHANGELOG.md 08_AI_HANDOVER.md .ai-manifest.json
git commit -m "docs(quality): record retry and toast hardening"
```

- [ ] **Step 5: Re-run final verification on exact HEAD**

Re-run the complete Node and Playwright suites after the documentation commit, followed by all governance checks. Do not rely on the pre-commit run.

- [ ] **Step 6: Fetch and push dev safely**

Run `git fetch origin --prune`. Require a clean worktree and `git merge-base HEAD origin/dev` equal to `git rev-parse origin/dev`; then run `git push origin dev` without force. Confirm local HEAD equals `origin/dev` afterward.
