# Nearby Navigation v75 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the current device position when navigating an unresolved generic place name, while direct-resolved places keep their exact route and every location failure retains the Japan fallback.

**Architecture:** Pure helpers derive navigation intent and Maps URLs. Existing navigation anchors retain a fallback `href`; only generic intents intercept a click, synchronously open a target window, request one-shot geolocation, then replace the target with a coordinate-origin directions URL or the fallback.

**Tech Stack:** Plain browser JavaScript, Geolocation API, Google Maps URLs, Node `assert`/`vm`, Playwright context permissions.

## Global Constraints

- Keep one existing navigation button and label; do not render exact/nearby classifications.
- Do not add departure-time prompts, background tracking, Places API, API keys, schema fields or packages.
- Location denial, timeout, unavailable API or popup failure must degrade to the current `名稱＋日本` route.

---

### Task 1: Pure navigation intent and URL contract

**Files:**
- Create: `tests/navigation-location.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `navigationIntent(it,res)`, `navigationDirectionsUrl(intent,origin)`, `tripItemForNavigation(dayIndex,itemId)`.

- [ ] **Step 1: Write the failing Node test**

Evaluate the real helpers in a `vm` sandbox. Assert hand-written URL expectations for: a resolved Place (direct destination, no origin), resolved Restaurant, unresolved name with `{latitude:34.6651,longitude:133.918}`, and fallback `名稱 日本` with driving/transit modes. Assert query encoding and reject missing items without throwing.

- [ ] **Step 2: Verify red**

Run `node tests/navigation-location.test.js`; expect failure because the helpers do not exist.

- [ ] **Step 3: Implement helpers**

`navigationIntent()` returns `{kind:'exact'|'nearby',query,fallbackQuery}`. Resolved Places/Restaurants use their normalized names and `kind:'exact'`; unresolved itinerary text uses its first line and `kind:'nearby'`. `navigationDirectionsUrl()` adds `origin=lat,lng` only for a valid finite coordinate object; fallback appends `日本`.

- [ ] **Step 4: Verify green**

Run `node tests/navigation-location.test.js` and expect `navigation location tests passed`.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/navigation-location.test.js
git commit -m "feat(trip): derive location-aware navigation routes"
```

---

### Task 2: Click behavior and browser verification

**Files:**
- Modify: `index.html`
- Create: `tests/browser/navigation-location.spec.js`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: `openTripNavigation(event,dayIndex,itemId)` and a shared navigation-anchor renderer used by Trip, Today next-stop and cluster next-stop cards.

- [ ] **Step 1: Write the failing Playwright test**

Inject a controlled itinerary item and stub `window.open` to record target URLs. For a generic item, grant geolocation and set coordinates, click the existing navigation button, and assert the recorded URL contains the literal encoded origin. Deny permission and assert the URL contains encoded `日本`. For a resolved PID/RID, assert geolocation is not called and the direct URL opens.

- [ ] **Step 2: Verify red**

Run `npx playwright test tests/browser/navigation-location.spec.js`; expect failure because clicks still use static URLs.

- [ ] **Step 3: Implement click routing**

Centralize the three anchors through `renderTripNavigationLink(it,res,dayIndex,className)`. Exact intents use the direct href without interception. Nearby intents add `onclick="return openTripNavigation(...)"`; the handler prevents default, synchronously opens a blank target, requests one-shot location with `{enableHighAccuracy:false,timeout:6000,maximumAge:300000}`, and navigates the target to nearby or fallback URL. Set `opener=null` when possible. If no target window can be opened, navigate the current window to the fallback rather than dropping the action.

- [ ] **Step 4: Verify green**

Run both navigation Node and browser tests. Confirm the visible button text remains exactly the current driving/transit label and no `精確地點`／`附近搜尋` text appears.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/navigation-location.test.js tests/browser/navigation-location.spec.js tests/README.md
git commit -m "feat(trip): route generic places from current location"
```

---

### Task 3: v75 shell, documentation and full verification

**Files:**
- Modify: `sw.js`
- Modify: `app-version.js`
- Modify: `index.html` release notes and data-page attachment disclosure
- Modify: `07_CHANGELOG.md`, `tasks/current.md`, `13_PROJECT_STATUS.md`, `.ai-manifest.json`, `docs/batch2-device-acceptance.md`

- [ ] **Step 1: Bump the PWA group**

Set `SW_VERSION='v75'` and `APP_VERSION='v75'`. Add only `./shopping-photo-store.js` to `SHELL`; do not alter install, activate, fetch or cache headers. Confirm `netlify.toml` diff is zero.

- [ ] **Step 2: Add user-facing release notes and governance evidence**

Add v75 release notes for local photo attachments and safer nearby navigation. Update changelog/status/manifest and append v75 device acceptance without overwriting v73/v74 evidence. Document both new Node tests and browser specs.

- [ ] **Step 3: Run complete verification**

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```

On PowerShell, preserve the same fail-fast semantics by checking `$LASTEXITCODE` after each command.

- [ ] **Step 4: Verify PWA changeover and mobile dimensions**

Verify v74→v75 leaves only `okayama-trip-v75`, then stop the server and reload offline. At 320×700, 375×812 and 390×844 record `scrollWidth`, `clientWidth`, overflow, console errors and pageerrors for the affected shopping and navigation views.

- [ ] **Step 5: Review and push**

Confirm exact diff scope, no `netlify.toml` change, no schema/Sheet/Apps Script change, and no tag/main mutation. Commit documentation, fetch `origin/dev`, require it still equals the branch base, then run:

```bash
git push origin HEAD:dev
```

No force push. Verify `git ls-remote origin refs/heads/dev` equals local HEAD.
