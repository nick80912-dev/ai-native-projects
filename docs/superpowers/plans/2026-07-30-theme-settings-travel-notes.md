# Theme, Settings 2.0, and Travel Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver SW v72 with a compact Settings 2.0 information architecture, six local light themes, five consistent SVG function icons, personal backup v8, and local diagnostic travel notes.

**Architecture:** Keep the existing static App and `index.html` rendering model, but introduce bounded helpers for Settings navigation, travel-note storage, theme registry/application, and shared version metadata. All new persistent state stays in localStorage and joins the atomic personal backup; Ledger Schema 2.9, Apps Script, TripConfig, canonical member identity, and append-only settlement/correction logic remain unchanged.

**Tech Stack:** Static HTML/CSS/JavaScript, localStorage, Service Worker App Shell, Node.js `assert`/`vm` tests, existing Browser QA workflow.

## Global Constraints

- Do not execute this plan until Bar accepts SW v71 on a real device/PWA and backlog #1 Playwright QA is committed and wired into `.github/workflows/qa.yml`.
- Target exactly SW v72 and use one version source: `app-version.js` exports `APP_VERSION='v72'`.
- Theme IDs are exactly `ocean`, `ivory`, `wisteria`, `cedar`, `mist`, and `tea`; unknown IDs fall back to `ocean`.
- Settings section order is exactly 身分 → 主題 → 代購對象 → 帳務 → 自訂項目 → 資料與版本 → 測試模式.
- Member behavior remains list/switch/add only; never add rename, delete, deactivate, alias, or canonical mutation.
- Replace only `🏠🗺️🏬💴` in the four main tabs and `⚙` in the Settings button. Preserve the peach PNG and content Emoji.
- Personal backup v8 adds `themeId`, `shoppingUnits`, and `travelNotes`; versions 1–7 remain restorable.
- Travel notes are local-only, capped at 200, use 1–500 characters, and never invoke repair/mutation paths.
- Do not add cloud schema, Sheet, Apps Script action, TripConfig key, webfont, CDN, or dark mode.
- Preserve unrelated working-tree changes, especially pre-existing edits in `tasks/backlog.md`.

---

### Task 1: Settings 2.0 shell and diagnostic travel notes

**Files:**
- Modify: `index.html:491-497` diagnostic and Settings CSS
- Modify: `index.html:6940-7208` identity, Settings, and subpage rendering
- Modify: `index.html:9024-9061` diagnostics panel and peach entry
- Modify: `tests/ledger-entry-settings.test.js`
- Modify: `tests/ios-gesture-diagnostics.test.js`
- Create: `tests/travel-notes.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `openMemberSelector(forced,startNew)`, `currentLedgerSettings()`, `ledgerCategoryStore`, `ledgerPayMethodStore`, `shoppingUnitStore`, `ledgerProxyTargetStore`, `healthCheck()`, `curView`, `syncState`, `APP_VERSION` when available.
- Produces: `settingsUiState`, `SETTINGS_LEGACY_TARGETS`, `normalizeSettingsTarget(targetId)`, `openSettings(targetId)`, `openSettingsPage(pageId)`, `backToSettingsRoot()`, `captureSettingsScroll()`, `TRAVEL_NOTES_KEY`, `createTravelNoteId()`, `normalizeTravelNote(input,existing)`, `travelNoteStore`, `travelNoteContext()`, `saveTravelNote()`, `updateTravelNoteStatus(id,status)`, `confirmRemoveTravelNote(id)`, `copyTravelNotes(format)`.

- [ ] **Step 1: Add failing Settings information-architecture assertions**

In `tests/ledger-entry-settings.test.js`, replace the current flat-section copy assertions with:

```js
const orderedSettingsLabels=[
  '>身分<','>主題<','>代購對象<','>帳務<','>自訂項目<','>資料與版本<','>測試模式<'
];
let previousSettingsLabel=-1;
orderedSettingsLabels.forEach(function(label){
  const at=settingsSource.indexOf(label);
  assert(at>previousSettingsLabel,'Settings keeps approved section order at '+label);
  previousSettingsLabel=at;
});
assert(settingsSource.includes('目前身分'),'compact identity card labels the canonical current identity');
assert(settingsSource.includes('>切換<')&&settingsSource.includes('>新增<'),'compact identity card keeps both same-row actions');
assert(settingsSource.includes('openMemberSelector(false,false)'),'switch still uses the existing selector');
assert(settingsSource.includes('openMemberSelector(false,true)'),'add still uses identity registration');
assert(!settingsSource.includes('修改身分')&&!settingsSource.includes('刪除身分'),'Settings exposes no canonical identity mutation');
assert(settingsSource.includes('簡易結算模式'),'simple settlement stays in 帳務');
assert(settingsSource.includes('類別、支付方式與採買單位'),'custom options stay in 自訂項目');
assert(settingsSource.includes('captureSettingsScroll'),'Settings preserves scroll before rerender or subpage navigation');
assert(settingsSource.includes('backToSettingsRoot'),'Settings subpages return to the root context');
assert(settingsSource.includes('SETTINGS_LEGACY_TARGETS'),'legacy Settings deep links have an explicit compatibility map');
['ledgerTestModeSection','ledgerOptionSettingsSection','ledgerProxyTargetSettingsSection'].forEach(function(id){
  assert(settingsSource.includes(id),'legacy Settings target remains mapped: '+id);
});
assert(settingsSource.includes('scrollTopByPage'),'root and every subpage preserve independent scroll positions');
```

- [ ] **Step 2: Run the Settings test and verify the expected red state**

Run:

```powershell
node tests/ledger-entry-settings.test.js
```

Expected: FAIL on the first missing ordered section label or `captureSettingsScroll`.

- [ ] **Step 3: Implement the Settings navigation state and compact root**

Add beside `closeSettings()`:

```js
var settingsUiState={page:'root',scrollTopByPage:Object.create(null),anchorId:''};
var SETTINGS_PAGE_IDS=['root','theme','proxy','ledger','options','data'];
var SETTINGS_LEGACY_TARGETS={
  ledgerTestModeSection:{page:'root',anchorId:'ledgerTestModeSection'},
  ledgerOptionSettingsSection:{page:'options',anchorId:''},
  ledgerProxyTargetSettingsSection:{page:'proxy',anchorId:''}
};
function normalizeSettingsTarget(targetId){
  var value=String(targetId||'root');
  var legacy=SETTINGS_LEGACY_TARGETS[value];
  if(legacy)return {page:legacy.page,anchorId:legacy.anchorId};
  return {
    page:SETTINGS_PAGE_IDS.indexOf(value)>=0?value:'root',
    anchorId:''
  };
}
function captureSettingsScroll(){
  var panel=document.querySelector('#settingsOverlay .settings-panel');
  if(panel)settingsUiState.scrollTopByPage[settingsUiState.page]=panel.scrollTop;
}
function openSettingsPage(pageId){
  openSettings(pageId);
}
function backToSettingsRoot(){
  openSettings('root');
}
```

Refactor `openSettings(targetId)` so it first calls `captureSettingsScroll()`, resolves `normalizeSettingsTarget(targetId)`, then updates `settingsUiState.page` and `settingsUiState.anchorId` before rendering. This preserves existing callers while adding page navigation:

- `root` renders the exact approved seven labels in order.
- The 身分 card is a single `.settings-identity-row`: left `.settings-identity-current` contains `<small>目前身分</small><b>${esc(member.name)}</b>`; right `.settings-identity-actions` contains buttons `切換` and `新增`.
- 主題, 代購對象, 匯率／幣別, 自訂項目, and 資料／版本 rows call `openSettingsPage(pageId)` with their exact target page ID.
- 簡易結算 and 測試模式 remain inline toggles.
- subpages use the existing `.settings-panel` shell with a `‹ 返回` button calling `backToSettingsRoot()`.
- after appending the overlay, restore `panel.scrollTop=settingsUiState.scrollTopByPage[settingsUiState.page]||0`;
- when `settingsUiState.anchorId` is present, scroll that element into view after the overlay is mounted, then clear only `anchorId`;
- preserve `openSettings('ledgerTestModeSection')`, `openSettings('ledgerOptionSettingsSection')`, and `openSettings('ledgerProxyTargetSettingsSection')` as compatibility entry points;
- option/proxy mutations rerender through their existing legacy target IDs, which now resolve to `options` and `proxy` while retaining each subpage scroll position.

Add CSS with these exact narrow-screen guarantees:

```css
.settings-identity-row{display:flex;align-items:center;gap:8px;padding:9px 9px 9px 11px;min-height:52px}
.settings-identity-current{min-width:0;flex:1}
.settings-identity-current b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.settings-identity-actions{display:flex;gap:5px;flex:0 0 auto}
.settings-identity-actions .btn{min-height:38px;padding:0 9px}
```

- [ ] **Step 4: Run the Settings test and verify green**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/settings-backup-ux.test.js
```

Expected: both exit 0; the existing member, ledger-setting, and backup entry points remain reachable.

- [ ] **Step 5: Write the failing travel-note store and diagnostic tests**

Create `tests/travel-notes.test.js` with an `extractFunction()` helper and a VM sandbox. Include these assertions:

```js
assert.match(html,/var TRAVEL_NOTES_KEY='trip_travel_notes'/);
assert.match(html,/var TRAVEL_NOTES_LIMIT=200/);
assert.match(html,/var TRAVEL_NOTE_TEXT_LIMIT=500/);
assert.match(html,/function normalizeTravelNote\(/);
assert.match(html,/function travelNoteContext\(/);
assert.match(html,/function copyTravelNotes\(/);
assert.match(html,/function confirmRemoveTravelNote\(/);

const diagnosticsSource=extractFunction(html,'openDiagnostics');
assert(diagnosticsSource.includes('旅途紀錄'),'diagnostics contains the travel-note section');
assert(diagnosticsSource.includes('異常')&&diagnosticsSource.includes('優化建議'),'note form exposes both approved kinds');
assert(diagnosticsSource.includes('待評估')&&diagnosticsSource.includes('已處理'),'note list exposes both statuses');

const added=sandbox.travelNoteStore.add({kind:'suggestion',text:'主題卡可以再縮短'});
assert.strictEqual(added.kind,'suggestion');
assert.strictEqual(added.status,'pending');
assert.strictEqual(added.text,'主題卡可以再縮短');
assert.strictEqual(added.view,'shop');
assert.strictEqual(added.appVersion,'v72');
assert.strictEqual(added.online,false);
assert.strictEqual(added.syncState,'offline');
assert.deepStrictEqual(added.healthSummary,['同步資料過舊']);

assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:''}),/1–500/);
assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:'x'.repeat(501)}),/1–500/);
assert.throws(()=>sandbox.travelNoteStore.add({kind:'other',text:'x'}),/類型/);
assert.throws(()=>sandbox.travelNoteStore.update(added.id,{status:'other'}),/狀態/);

const resolved=sandbox.travelNoteStore.update(added.id,{status:'resolved',text:'回程後已確認'});
assert.strictEqual(resolved.createdAt,added.createdAt);
assert.notStrictEqual(resolved.updatedAt,'');
assert.strictEqual(resolved.status,'resolved');

assert.strictEqual(sandbox.travelNoteStore.remove(added.id),true);
assert.deepStrictEqual(sandbox.travelNoteStore.all(),[]);
```

The sandbox must inject `APP_VERSION:'v72'`, `curView:'shop'`, `navigator:{onLine:false}`, `syncState:'offline'`, `healthCheck(){return ['同步資料過舊'];}`, deterministic `Date`, deterministic `crypto.randomUUID`, and a localStorage double that can fail a chosen key. Run a second sandbox without `crypto.randomUUID` and assert `createTravelNoteId()` still returns two distinct non-empty IDs.

Fill the store with 200 valid records and assert the 201st `add()` throws `/200/` without deleting the oldest. Force storage failure and assert the previous JSON is unchanged.

- [ ] **Step 6: Run the travel-note test and verify red**

Run:

```powershell
node tests/travel-notes.test.js
```

Expected: FAIL because `TRAVEL_NOTES_KEY` and `travelNoteStore` do not exist.

- [ ] **Step 7: Implement the bounded local travel-note module**

Add near the personal local-state constants:

```js
var TRAVEL_NOTES_KEY='trip_travel_notes';
var TRAVEL_NOTES_LIMIT=200;
var TRAVEL_NOTE_TEXT_LIMIT=500;
var TRAVEL_NOTE_KINDS=['issue','suggestion'];
var TRAVEL_NOTE_STATUSES=['pending','resolved'];
```

Implement `createTravelNoteId()` with `crypto.randomUUID()` when available and a collision-resistant timestamp/random fallback for older WebKit, then implement:

```js
function travelNoteContext(){
  var findings=[];
  try{findings=healthCheck()||[];}catch(error){findings=['健康檢查失敗'];}
  return {
    view:String(curView||''),
    appVersion:typeof APP_VERSION==='string'?APP_VERSION:'',
    online:typeof navigator==='undefined'||navigator.onLine!==false,
    syncState:String(syncState||''),
    healthSummary:findings.slice(0,20).map(function(item){return String(item).slice(0,160);})
  };
}
```

`normalizeTravelNote(input,existing)` must:

- accept only `issue|suggestion` and `pending|resolved`;
- trim text and require 1–500 characters;
- preserve `createdAt` on updates and set `updatedAt`;
- normalize context fields to bounded strings/booleans/string arrays;
- reject malformed restored notes instead of guessing.

`travelNoteStore` must expose these concrete behaviors:

- `all()` returns a newest-first, normalized clone.
- `normalize(values)` requires an array of at most 200 entries and strictly normalizes every entry.
- `add(input)` attaches `travelNoteContext()`, rejects the 201st entry, and persists atomically.
- `update(id,patch)` preserves `id`, `createdAt`, and captured context unless the caller explicitly requests a new context capture.
- `remove(id)` persists the filtered array and returns whether an entry was removed.

Use a clone-first/write-once pattern. Never mutate the in-memory array before `localStorage.setItem()` succeeds.

- [ ] **Step 8: Add the travel-note diagnostics UI**

Extend `openDiagnostics()` with:

- kind buttons `異常` / `優化建議`;
- `<textarea id="travelNoteText" maxlength="500">`;
- save button calling `saveTravelNote()`;
- filters `全部` / `異常` / `優化建議`;
- newest-first rows showing type, status, text, time, view, version, online/sync, health summary;
- `標記已處理` / `移回待評估`, `修改`, and a delete button that calls `confirmRemoveTravelNote(id)`;
- `複製摘要` and `匯出 JSON`.

`confirmRemoveTravelNote(id)` must call `confirm('確定刪除此筆旅途紀錄？')` and invoke `travelNoteStore.remove(id)` only after a positive response. Add a test with a confirm double that proves cancel leaves storage unchanged and confirm removes exactly the selected record.

Keep `setupDiagnostics()` touch double-tap timing unchanged:

```js
if(now-last<300){ e.preventDefault(); openDiagnostics(); }
```

On a failed save/update/remove, retain the textarea/list and show a toast. `copyTravelNotes('text')` must generate readable headings; `copyTravelNotes('json')` must serialize the normalized array. Clipboard failure must open the existing manual-copy fallback pattern instead of discarding output.

- [ ] **Step 9: Run focused Task 1 tests**

Run:

```powershell
node tests/ledger-entry-settings.test.js
node tests/settings-backup-ux.test.js
node tests/travel-notes.test.js
node tests/ios-gesture-diagnostics.test.js
node tests/ios-zoom-guard.test.js
```

Expected: all exit 0; the peach double-tap, no-op document `dblclick`, and viewport recovery tests remain green.

- [ ] **Step 10: Document the new test and commit Task 1**

Add to `tests/README.md`:

```markdown
- `travel-notes.test.js`：驗證診斷面板旅途紀錄的異常／建議類型、上下文快照、待評估／已處理、修改刪除、200 筆上限、複製匯出與 localStorage 失敗不丟資料。執行：`node tests/travel-notes.test.js`。
```

Commit only Task 1 files:

```powershell
git add -- index.html tests/ledger-entry-settings.test.js tests/ios-gesture-diagnostics.test.js tests/travel-notes.test.js tests/README.md
git commit -m "feat: restructure settings and add travel notes"
```

---

### Task 2: Six themes, SVG function icons, and personal backup v8

**Files:**
- Modify: `index.html:20-52` theme variables
- Modify: `index.html:87-108`, `index.html:578-619`, and `.tabbar` CSS/markup
- Modify: Settings theme subpage from Task 1
- Modify: `index.html:3702-3714` personal-state constants
- Modify: `index.html:7045-7146` personal backup/restore
- Create: `tests/theme-system.test.js`
- Modify: `tests/settings-backup-ux.test.js`
- Modify: `tests/ledger-entry-settings.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `settingsUiState`, `openSettingsPage('theme')`, `travelNoteStore`, `shoppingUnitStore`, `copyPersonalStateText()`.
- Produces: `THEME_STORAGE_KEY`, `THEME_IDS`, `THEME_REGISTRY`, `normalizeThemeId(value)`, `currentThemeId()`, `applyTheme(themeId,options)`, `selectTheme(themeId)`, `renderThemeSettingsSheet()`, personal-state v8 fields `themeId`, `shoppingUnits`, `travelNotes`.

- [ ] **Step 1: Write the failing six-theme token and contrast tests**

Create `tests/theme-system.test.js`. Parse the theme CSS blocks and assert:

```js
const themeIds=['ocean','ivory','wisteria','cedar','mist','tea'];
const tokenNames=[
  '--t-paper','--t-card','--t-chrome','--t-action','--t-accent','--t-accent-bg',
  '--t-ink','--t-ink-soft','--t-ink-faint','--t-line','--t-line-soft','--t-tabbar','--t-secondary'
];
themeIds.forEach(function(id){
  const block=themeBlock(html,id);
  tokenNames.forEach(name=>assert(block.includes(name+':'),id+' defines '+name));
});
assert.match(html,/--green:#367055/);
assert.match(html,/--gold-ink:#85661c/);
assert.match(html,/\.hotel \.h-lbl\{[^}]*color:var\(--gold-ink\)/);
assert.match(html,/\.pretrip-count\{[^}]*color:var\(--gold-ink\)/);
assert.match(html,/\.pc-rest-r\{[^}]*color:var\(--gold-ink\)/);
```

Implement `relativeLuminance()` and `contrastRatio()` inside the test. Assert every `--t-action` against `--t-paper` is at least 4.5; every `--t-accent` is at least 3.0; `--t-ink` and `--t-ink-soft` are at least 4.5; white against `--t-chrome` is at least 4.5. Assert `tea --t-action` is exactly `#896748`.

Assert every second-layer legacy variable maps to a first-layer token and contains no literal color:

```js
[
  ['--paper','--t-paper'],['--card','--t-card'],['--sea-deep','--t-chrome'],
  ['--sea','--t-action'],['--coral','--t-accent'],['--coral-bg','--t-accent-bg'],
  ['--ink','--t-ink'],['--ink-soft','--t-ink-soft'],['--ink-faint','--t-ink-faint'],
  ['--line','--t-line'],['--line-soft','--t-line-soft'],['--violet','--t-secondary']
].forEach(([legacy,token])=>assert.match(baseBlock,new RegExp(escapeRegExp(legacy)+':var\\('+escapeRegExp(token)+'\\)')));
```

- [ ] **Step 2: Write failing theme behavior and picker assertions**

In the same test:

```js
assert.deepStrictEqual(extractThemeIds(html),['ocean','ivory','wisteria','cedar','mist','tea']);
assert.match(html,/var THEME_STORAGE_KEY='trip_theme'/);
assert.match(html,/function normalizeThemeId\(/);
assert.match(html,/function applyTheme\(/);
assert.match(html,/function selectTheme\(/);
assert.match(html,/function renderThemeSettingsSheet\(/);
assert.match(html,/class="settings-theme-grid"/);
assert.doesNotMatch(themeSheetSource,/只影響這台裝置|成熟俐落|柔和安靜|自然沉穩/);
```

Use a VM sandbox with a fake `document.documentElement.dataset`, theme-color meta node, localStorage, and `AppLog.repo()` collector. Assert:

```js
assert.strictEqual(mod.applyTheme('mist').id,'mist');
assert.strictEqual(root.dataset.theme,'mist');
assert.strictEqual(meta.content,'#3f4c5e');
assert.strictEqual(storage.getItem('trip_theme'),'mist');
assert.strictEqual(mod.applyTheme('unknown').id,'ocean');
assert.strictEqual(root.dataset.theme,'ocean');
assert.strictEqual(logMessages.length,1,'unknown stored theme is recorded once for diagnostics');
```

Force `localStorage.setItem('trip_theme','tea')` to throw during interactive `selectTheme('tea')`; assert the previous theme/dataset/meta are restored and the result is `{ok:false}`.

- [ ] **Step 3: Run theme tests and verify red**

Run:

```powershell
node tests/theme-system.test.js
```

Expected: FAIL because `THEME_REGISTRY` and six theme blocks do not exist.

- [ ] **Step 4: Implement the two-layer six-theme CSS**

Replace the current literal theme variables with these exact first-layer values:

```css
:root,[data-theme="ocean"]{
  --t-paper:#f5f1e8;--t-card:#fffdf8;--t-chrome:#0e3a44;--t-action:#12707f;
  --t-accent:#df5f3a;--t-accent-bg:#fbeee7;--t-ink:#22303a;--t-ink-soft:#5c6b73;
  --t-ink-faint:#7c8a90;--t-line:#e5ddcd;--t-line-soft:#eee8db;
  --t-tabbar:rgba(255,253,248,.96);--t-secondary:#7659a0;
}
[data-theme="ivory"]{
  --t-paper:#faf9f5;--t-card:#ffffff;--t-chrome:#16243d;--t-action:#800000;
  --t-accent:#e25a0f;--t-accent-bg:#fdece2;--t-ink:#16243d;--t-ink-soft:#4a5361;
  --t-ink-faint:#727c8c;--t-line:#dcd8cc;--t-line-soft:#e8e5dc;
  --t-tabbar:rgba(255,255,255,.96);--t-secondary:#7659a0;
}
[data-theme="wisteria"]{
  --t-paper:#f6f3f7;--t-card:#ffffff;--t-chrome:#3b2d4d;--t-action:#6a3d7d;
  --t-accent:#c0416e;--t-accent-bg:#fae9ef;--t-ink:#2a2331;--t-ink-soft:#575061;
  --t-ink-faint:#7e7689;--t-line:#e6dee9;--t-line-soft:#efe9f2;
  --t-tabbar:rgba(255,255,255,.96);--t-secondary:#2f6f6a;
}
[data-theme="cedar"]{
  --t-paper:#f3f5f0;--t-card:#ffffff;--t-chrome:#23402f;--t-action:#7a4f24;
  --t-accent:#d2622c;--t-accent-bg:#fbeadf;--t-ink:#1f2b23;--t-ink-soft:#4d5a50;
  --t-ink-faint:#79857c;--t-line:#dfe5da;--t-line-soft:#eaefe6;
  --t-tabbar:rgba(255,255,255,.96);--t-secondary:#7659a0;
}
[data-theme="mist"]{
  --t-paper:#f4f5f7;--t-card:#ffffff;--t-chrome:#3f4c5e;--t-action:#416b8a;
  --t-accent:#c86d4e;--t-accent-bg:#f8eae4;--t-ink:#25303d;--t-ink-soft:#56616f;
  --t-ink-faint:#747f8c;--t-line:#dce0e5;--t-line-soft:#e9ecef;
  --t-tabbar:rgba(255,255,255,.96);--t-secondary:#7659a0;
}
[data-theme="tea"]{
  --t-paper:#f7f2ed;--t-card:#fffdfb;--t-chrome:#4e3d32;--t-action:#896748;
  --t-accent:#b64f5c;--t-accent-bg:#f8e7e9;--t-ink:#332820;--t-ink-soft:#62564e;
  --t-ink-faint:#81756d;--t-line:#e5d9ce;--t-line-soft:#efe7df;
  --t-tabbar:rgba(255,253,251,.96);--t-secondary:#7659a0;
}
```

Then add:

- one legacy mapping block;
- fixed `--gold`, `--gold-ink`, `--green`, warning colors, correction border, and shadows.

Change only the three approved textual gold uses to `--gold-ink`. Change `.tabbar` to `background:var(--t-tabbar)`. Do not globally rewrite white cards or all rgba values.

- [ ] **Step 5: Implement the theme registry and atomic application**

Add:

```js
var THEME_STORAGE_KEY='trip_theme';
var THEME_IDS=['ocean','ivory','wisteria','cedar','mist','tea'];
var THEME_REGISTRY={
  ocean:{id:'ocean',name:'海洋／岡山',chrome:'#0e3a44'},
  ivory:{id:'ivory',name:'象牙／靛藍',chrome:'#16243d'},
  wisteria:{id:'wisteria',name:'藤紫／夜櫻',chrome:'#3b2d4d'},
  cedar:{id:'cedar',name:'杉綠／宮島',chrome:'#23402f'},
  mist:{id:'mist',name:'霧藍／瀨戶',chrome:'#3f4c5e'},
  tea:{id:'tea',name:'焙茶／倉敷',chrome:'#4e3d32'}
};
```

`normalizeThemeId(value)` returns a valid ID or `ocean`. `applyTheme(themeId,options)` treats persistence as enabled unless `options.persist===false`, then updates `document.documentElement.dataset.theme` and the theme-color meta; persistence is write-first so a storage failure cannot leave a falsely selected UI. `selectTheme(themeId)` catches the failure, restores the previous ID/meta, keeps the Sheet open, and toasts an error.

Place the registry, normalization, and startup application in a head script after the `theme-color` meta element and theme CSS but before `<body>`. Apply the stored theme there with `{persist:false}` so a non-ocean preference is active before the first main render. If storage is denied, render `ocean`; if the stored ID is unknown, render `ocean` and queue one message that is passed to `AppLog.repo()` after `AppLog` initializes.

Render the approved two-column `.settings-theme-grid`. Each card must contain:

- a mini surface using paper/chrome/action/accent;
- the exact display name;
- a visible `✓` plus `aria-pressed`;
- no device-scope or subjective descriptive copy.

- [ ] **Step 6: Write failing SVG icon boundary tests**

Extend `tests/theme-system.test.js`:

```js
const navMarkup=html.slice(html.indexOf('<div class="tabbar">'),html.indexOf('</div>',html.indexOf('<div class="tabbar">'))+6);
['🏠','🗺️','🏬','💴'].forEach(icon=>assert(!navMarkup.includes(icon),'main tab removes '+icon));
assert(!settingsButtonMarkup.includes('⚙'),'Settings removes the gear Emoji');
assert.strictEqual((navMarkup.match(/<svg /g)||[]).length,4,'four tabs use inline SVG');
assert.match(settingsButtonMarkup,/<svg /);
assert.match(html,/\.app-icon\{[^}]*stroke:currentColor[^}]*stroke-width:1\.75/);
assert.match(html,/\.tabbar-btn\.active\{[^}]*color:var\(--sea-deep\)/);
assert.match(html,/\.tabbar-btn\.active::before/);
assert.doesNotMatch(activeTabCss,/var\(--coral\)/);
assert.match(navMarkup,/id="splitTabBadge"/);
assert.match(navMarkup,/aria-hidden="true"/);
assert.match(settingsButtonMarkup,/aria-label="設定"/);
assert.match(html,/<img class="logo" id="diagnosticBadge" src="okayama-peach-badge\.png"/);
assert(html.includes(\"var driveIcon = /開車/.test(drive) ? '🚗'\"),'content transport Emoji remains');
```

- [ ] **Step 7: Replace only the five approved function Emoji**

Use one MIT outline icon family. Inline four tab SVGs and one Settings SVG with `viewBox="0 0 24 24"`, `aria-hidden="true"`, `focusable="false"`, and shared `.app-icon`.

Keep visible text labels 今天／行程／購物／分帳 and the Settings button `aria-label`. Wrap the split SVG and badge in a positioned `.tabbar-icon-wrap`. Active state uses `--sea-deep`, a top indicator, and font weight. Do not alter content Emoji or the peach image.

- [ ] **Step 8: Write the failing personal backup v8 tests**

Update `tests/settings-backup-ux.test.js` sandbox constants to version 8 and add:

```js
assert.strictEqual(exported.version,8,'new exports use v8');
assert.strictEqual(exported.themeId,'mist');
assert.deepStrictEqual(exported.shoppingUnits,['個','盒','袋']);
assert.strictEqual(exported.travelNotes[0].kind,'suggestion');
assert.deepStrictEqual(
  Object.keys(exported).sort(),
  [
    'checks','exportedAt','format','ledgerCategories','ledgerPayMethods','ledgerQueue',
    'member','personalLedger','proxyTargets','shoppingItems','shoppingUnits',
    'themeId','travelNotes','version','wants'
  ].sort()
);
```

Add sandbox keys/stores:

```js
THEME_STORAGE_KEY:'trip_theme',
SHOPPING_UNIT_OPTIONS_KEY:'trip_shopping_units',
TRAVEL_NOTES_KEY:'trip_travel_notes',
THEME_IDS:['ocean','ivory','wisteria','cedar','mist','tea'],
shoppingUnitStore:{
  all(){return ['個','盒','袋'];},
  normalize(values){
    if(!Array.isArray(values))throw new Error('採買單位格式錯誤');
    const normalized=values.map(value=>String(value).trim());
    if(normalized.some(value=>value.length<1||value.length>6))throw new Error('採買單位長度錯誤');
    if(new Set(normalized).size!==normalized.length)throw new Error('採買單位不可重複');
    return normalized;
  }
},
travelNoteStore:{
  all(){return [validSuggestion];},
  normalize(values){
    if(!Array.isArray(values)||values.length>200)throw new Error('旅途紀錄格式錯誤');
    return values.map(note=>{
      if(!note||!['issue','suggestion'].includes(note.kind)||!['pending','resolved'].includes(note.status)){
        throw new Error('旅途紀錄內容錯誤');
      }
      return JSON.parse(JSON.stringify(note));
    });
  }
}
```

Assert:

- v8 rejects unknown `themeId`, malformed `shoppingUnits`, malformed `travelNotes`, and >200 notes before any write;
- v8 storage failure on each new key rolls every old/new key back;
- v8 success restores all three new keys and reapplies the theme;
- a v7 restore preserves the device’s current theme, shopping units, and travel notes;
- v1–v6 compatibility assertions remain green.

- [ ] **Step 9: Run backup test and verify red**

Run:

```powershell
node tests/settings-backup-ux.test.js
```

Expected: FAIL because exported version is still 7 and the three v8 fields are absent.

- [ ] **Step 10: Implement personal backup v8 atomically**

Change:

```js
var PERSONAL_STATE_VERSION=8;
var PERSONAL_STATE_SUPPORTED_VERSIONS=[1,2,3,4,5,6,7,8];
```

Add to `personalStateJson()`:

```js
themeId:currentThemeId(),
shoppingUnits:shoppingUnitStore.all(),
travelNotes:travelNoteStore.all()
```

In validation:

- for `version<8`, assign `themeId=currentThemeId()`, `shoppingUnits=shoppingUnitStore.all()`, and `travelNotes=travelNoteStore.all()` so old backups preserve current new state;
- for v8, require an exact valid theme ID, normalize units with `shoppingUnitStore.normalize`, and notes with `travelNoteStore.normalize`.

Add the three storage keys to `applyPersonalStatePayload()`’s rollback list and write them inside the same try block. After commit succeeds, call `applyTheme(payload.themeId,{persist:false})`. Do not apply the theme before all storage writes succeed.

Update backup/restore visible copy to mention 主題、採買單位與旅途紀錄.

- [ ] **Step 11: Run focused Task 2 tests**

Run:

```powershell
node tests/theme-system.test.js
node tests/settings-backup-ux.test.js
node tests/ledger-entry-settings.test.js
node tests/pwa-shell.test.js
node tests/ios-gesture-diagnostics.test.js
```

Expected: all exit 0; `pwa-shell` still passes before the version-source refactor because v71 remains active until Task 3.

- [ ] **Step 12: Document tests and commit Task 2**

Add to `tests/README.md`:

```markdown
- `theme-system.test.js`：驗證六組主題的 13-token、對比率、舊變數角色對映、未知 ID 回退、原子切換、迷你介面卡，以及五個功能 Emoji 精準替換為 SVG。執行：`node tests/theme-system.test.js`。
```

Commit only Task 2 files:

```powershell
git add -- index.html tests/theme-system.test.js tests/settings-backup-ux.test.js tests/ledger-entry-settings.test.js tests/README.md
git commit -m "feat: add six themes and personal backup v8"
```

---

### Task 3: Shared SW v72 metadata, user release notes, governance, and complete QA

**Files:**
- Create: `app-version.js`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `tests/pwa-shell.test.js`
- Modify: `tests/ios-zoom-guard.test.js`
- Modify: `tests/ledger-221-ui.test.js`
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/ledger-mobile-hotfix.test.js`
- Modify: `tests/ledger-member-visibility.test.js`
- Modify: `tests/ledger-ui-polish.test.js`
- Modify: `tests/shopping-ledger-links.test.js`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/backlog.md`
- Modify: `tasks/current.md`

**Interfaces:**
- Consumes: theme registry/picker, Settings data subpage, backup v8, travel notes, existing App Shell.
- Produces: global `APP_VERSION`, `APP_RELEASE_NOTES`, `renderAppReleaseNotes()`, cache `okayama-trip-v72`, final governance/status records.

- [ ] **Step 1: Write failing single-source version tests**

Update `tests/pwa-shell.test.js`:

```js
const versionPath=path.join(root,'app-version.js');
assert.ok(fs.existsSync(versionPath),'shared app-version.js exists');
const versionSource=fs.readFileSync(versionPath,'utf8');
assert.match(versionSource,/^var APP_VERSION='v72';\s*$/,'shared version is exactly v72');
assert.match(index,/<script src="app-version\.js"><\/script>/,'index loads the shared version before the inline app');
assert.match(serviceWorker,/importScripts\('\.\/app-version\.js'\);/,'service worker imports the same version');
assert.match(serviceWorker,/var CACHE_NAME='okayama-trip-'\+APP_VERSION;/,'cache name derives from APP_VERSION');
assert.match(serviceWorker,/'\.\/app-version\.js'/,'App Shell caches the version file');
assert.doesNotMatch(serviceWorker,/okayama-trip-v72/,'service worker does not duplicate the version literal');
```

Change the eight other active-version tests to read `app-version.js` and assert `APP_VERSION='v72'`, plus assert their loaded `sw.js` imports that file. Do not replace the old direct v71 assertion with a direct v72 assertion in `sw.js`.

- [ ] **Step 2: Run PWA/version tests and verify red**

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
```

Expected: FAIL because `app-version.js` does not exist and `sw.js` still hard-codes v71.

- [ ] **Step 3: Create the shared version and advance the App Shell**

Create `app-version.js` with exactly:

```js
var APP_VERSION='v72';
```

Load it in `index.html` before the main inline script. At the first line of `sw.js` executable code:

```js
importScripts('./app-version.js');
var CACHE_NAME='okayama-trip-'+APP_VERSION;
```

Add `'./app-version.js'` to `SHELL`. Keep the network-first fetch strategy and all activation cleanup behavior unchanged.

- [ ] **Step 4: Write failing user release-note tests**

Add to `tests/theme-system.test.js` or `tests/ledger-entry-settings.test.js`:

```js
assert.match(html,/var APP_RELEASE_NOTES=\[/);
assert.match(html,/function renderAppReleaseNotes\(/);
const notes=evaluateReleaseNotes(html);
assert.strictEqual(notes.length,5,'Settings exposes exactly five user-facing releases');
assert.deepStrictEqual(notes.map(note=>note.version),['v72','v71','v70','v69','v68']);
notes.forEach(note=>{
  assert(note.title&&note.title.length<=24,'release title is short and present');
  assert(Array.isArray(note.items)&&note.items.length>=1,'release has user-readable items');
});
assert(!JSON.stringify(notes).includes('canonical'),'user notes avoid internal implementation jargon');
```

- [ ] **Step 5: Implement the exact five user-facing releases**

Add:

```js
var APP_RELEASE_NOTES=[
  {version:'v72',date:'2026-07-30',title:'主題、設定與旅途紀錄',items:['新增六組淺色主題與一致的導覽圖示','設定頁重新分區，並可記錄旅途異常與優化建議']},
  {version:'v71',date:'2026-07-30',title:'作廢確認更清楚',items:['整張收據作廢預覽後只保留一個確認動作']},
  {version:'v70',date:'2026-07-30',title:'分攤選取更清楚',items:['分攤成員選取改為較明顯的青綠底色']},
  {version:'v69',date:'2026-07-29',title:'結算後安全鎖帳',items:['還款確認後的收據改以更正或作廢保留完整歷史']},
  {version:'v68',date:'2026-07-29',title:'採買操作改善',items:['改善採買排序、編輯返回與連續新增操作']}
];
```

`renderAppReleaseNotes()` renders these five only inside 資料與版本. Show `SW ` + `APP_VERSION` exactly once in the version row. Do not parse or fetch `07_CHANGELOG.md`.

- [ ] **Step 6: Update governance and status documents precisely**

Update:

- `04_UI_GUIDELINES.md`: semantic token layer + six-theme value table; main nav/Settings use inline SVG while content Emoji remain; no icon font.
- `08_AI_HANDOVER.md`: variable names/semantic roles and four-page structure remain protected; approved theme values may vary by `data-theme`; personal `themeId` and `travelNotes` remain local-only and are backup v8 fields.
- `.ai-manifest.json`: add SW v72 theme/Settings/backup/travel-notes delivery and keep Bar real-device acceptance pending.
- `07_CHANGELOG.md`: record exact scope, tests, Browser QA evidence, commit/push status without claiming results before they exist.
- `tasks/backlog.md`: inspect and preserve the user’s pre-existing diff, then remove completed #3b/#6/#7/#8/#9 only after implementation and verification; do not reorder unrelated items. If the full file diff cannot be proven to contain only approved backlog edits, leave it unstaged and report the deferred cleanup instead of folding unrelated content into the release commit.
- `tasks/current.md`: keep SW v71 as the latest pushed baseline until v72 is actually committed/pushed; record local v72 accurately during implementation.

- [ ] **Step 7: Run every focused version/release-note test**

Run:

```powershell
node tests/pwa-shell.test.js
node tests/ios-zoom-guard.test.js
node tests/ledger-221-ui.test.js
node tests/ledger-225.test.js
node tests/ledger-mobile-hotfix.test.js
node tests/ledger-member-visibility.test.js
node tests/ledger-ui-polish.test.js
node tests/shopping-ledger-links.test.js
node tests/theme-system.test.js
node tests/ledger-entry-settings.test.js
```

Expected: all exit 0 and no test expects a literal v72 inside `sw.js`.

- [ ] **Step 8: Run the complete Node suite**

Run:

```powershell
$testFiles = Get-ChildItem -LiteralPath 'tests' -Filter '*.test.js' | Sort-Object Name
$passed = 0
foreach ($testFile in $testFiles) {
  node $testFile.FullName
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $($testFile.Name)" }
  $passed++
}
Write-Output "ALL_TEST_FILES_PASSED=$passed"
```

Expected: every test file passes; the count is the current repository total plus `travel-notes.test.js` and `theme-system.test.js`.

- [ ] **Step 9: Run structural and document verification**

Run:

```powershell
node tools/check-doc-titles.js
Get-Content -Raw -LiteralPath '.ai-manifest.json' -Encoding utf8 | ConvertFrom-Json | Out-Null
git diff --check
rg -n \"🏠|🗺️|🏬|💴|>⚙<\" index.html
rg -n \"okayama-trip-v72\" sw.js index.html
```

Expected:

- document title check passes;
- manifest parses;
- diff check passes;
- the five target Emoji search returns no runtime markup hits;
- the v72 cache literal search returns no hits because only `app-version.js` owns `v72`.

- [ ] **Step 10: Perform Browser QA at 320, 375, and 390px**

At each width:

1. Open Settings and verify section order, compact 身分 row, 38px+ buttons, no horizontal overflow.
2. Enter/return from 主題, 代購對象, 帳務, 自訂項目, and 資料與版本; verify root/subpage scroll positions restore.
3. Select every theme and verify html `data-theme`, meta theme-color, active card, top bar, cards, tabbar, settlement, and diagnostics update.
4. Verify 杉綠 success indicators remain distinct, 象牙 link/accent remain distinguishable, 藤紫 secondary is teal, and 焙茶 links are readable.
5. Verify four tab SVGs, Settings SVG, active indicator, and split badge; peach badge still opens diagnostics on a double tap.
6. Offline, add one 異常 and one 優化建議; edit, resolve, filter, copy text/JSON, and confirm persistence after reload.
7. Export v8, change theme/units/notes, restore v8, and verify all three return atomically.
8. Confirm console errors/warnings are 0 and horizontal overflow is 0.

Record measured viewport, selected theme IDs, scroll deltas, computed colors, overflow widths, console counts, and backup round-trip results in `07_CHANGELOG.md`.

- [ ] **Step 11: Review the final diff against hard boundaries**

Run:

```powershell
git diff --name-status
git diff --unified=0 -- apps-script.js schema.js validator.js
git diff --unified=0 -- index.html | Select-String -Pattern 'saveLedgerCorrection|deriveSettlements|assertCanEditLedgerRecord|assertCanDeleteLedgerRecord'
git status -sb
```

Expected:

- Apps Script/schema/validator have no diff.
- correction/settlement/permission functions have no changed lines.
- only intentional v72 files are staged later.
- unrelated working-tree changes remain unstaged and intact.

- [ ] **Step 12: Commit Task 3**

Stage the exact final-delivery files, excluding the pre-existing `tasks/backlog.md` diff at first:

```powershell
git add -- app-version.js index.html sw.js tests/pwa-shell.test.js tests/ios-zoom-guard.test.js tests/ledger-221-ui.test.js tests/ledger-225.test.js tests/ledger-mobile-hotfix.test.js tests/ledger-member-visibility.test.js tests/ledger-ui-polish.test.js tests/shopping-ledger-links.test.js tests/theme-system.test.js tests/ledger-entry-settings.test.js 04_UI_GUIDELINES.md 08_AI_HANDOVER.md .ai-manifest.json 07_CHANGELOG.md tasks/current.md
git diff -- tasks/backlog.md
```

Stage `tasks/backlog.md` only after that full diff is verified to contain the user’s approved existing edits plus the planned completion cleanup, with no unrelated content:

```powershell
git add -- tasks/backlog.md
git diff --cached --check
git commit -m "chore: finalize sw v72 theme and settings release"
```

Do not push `dev`, merge `main`, or deploy until Bar explicitly requests that action.
