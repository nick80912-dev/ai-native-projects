# Settings Grouped List v74 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Implement task-by-task, test-first: write the failing assertion, prove red, implement, prove green.

**Goal:** Deliver SW v74 — the Settings root page becomes three permanent groups (個人／記帳／資料), the group-ledger test mode moves out of the root page into a dedicated `test-mode` control page reachable from exactly three entry points, and the legacy deep link `ledgerTestModeSection` resolves to that page instead of a root anchor that no longer exists.

**Architecture:** Keep the existing static App and `index.html` rendering model. `renderSettingsRoot()` is rewritten to emit three group cards instead of seven `.settings-section` cards; `renderSettingsTestModePage()` is added as a sixth Settings subpage and joins `SETTINGS_PAGE_IDS`; `normalizeSettingsTarget()` remaps one legacy target. No new persistent state, no new storage key, no new dependency. The test-mode data semantics (`[TEST]` prefix, ledger track isolation, Apps Script writes) are untouched — only the entry point moves.

**Tech Stack:** Static HTML/CSS/JavaScript, localStorage, Service Worker App Shell, Node.js `assert`/`vm` tests, Playwright Browser QA.

**Approval basis:** `docs/superpowers/specs/2026-08-01-settings-grouped-list-design.md` (approved 2026-08-01) plus Bar's Tier 2 動工核准 of the same date. Branch `feat/settings-grouped-v74`, based on `a930858` (release back-merge of `main` into `dev`).

---

## Global Constraints

**Tier 2 runtime scope — exactly three files, nothing else:**

- `index.html`
- `app-version.js` (`APP_VERSION` `v73` → `v74`)
- `sw.js` (`SW_VERSION` `v73` → `v74` only)

**Protected items — touching any of these means STOP and report to Bar** (spec §6.1 causal condition; `15_AI_EXECUTION_RULES.md` §4 hard-stop rule):

- Service Worker **install** strategy (`cache:'reload'`)
- Service Worker **fetch** strategy (`cache:'no-cache'`)
- Service Worker **fallback** strategy (navigation-only `index.html` fallback)
- The **SHELL** list
- How `index.html` **loads `app-version.js`**
- `netlify.toml` — not modified at all

If any of the above changes, the 2026-07-31 B2–C3 device evidence stops being extrapolatable and the upgrade/mixed-version verification must be re-run. Do not decide this unilaterally.

**Behavioral invariants:**

- Root page group order is exactly 個人 → 記帳 → 資料. No permanent 進階 group.
- Test mode is **not rendered at all** on the root page when it is off — no placeholder, no hidden node.
- The root page carries **no** control that can toggle test mode directly. Only the `test-mode` page has the checkbox.
- All three legacy targets stay mapped: `ledgerTestModeSection` → `test-mode`, `ledgerOptionSettingsSection` → `options`, `ledgerProxyTargetSettingsSection` → `proxy`.
- Clickable rows keep min-height 52px; toggle/add buttons keep min touch height 38px.
- No data format, localStorage key, backup version (`PERSONAL_STATE_VERSION=8`), ledger flow, or test-mode semantic changes.
- `APP_VERSION` is read only through `appVersion()`／`appVersionLabel()`. No bare reads reintroduced.
- Only semantic theme tokens in new CSS — no hardcoded theme colors.
- Tests derive the current version from `tests/support/version.js`. Do not hardcode `v74` in test files.
- No new icon package, framework, or dependency. Icons are inline SVG using the existing `.app-icon` pattern (`stroke:currentColor`), no Emoji.
- Do not touch backlog #20, #26, or any non-Settings-root concern. Neighboring problems go to `tasks/backlog.md`, not into this branch.

**Delivery boundary:** commits and tests on this branch only. Do **not** merge `dev`, touch `main`, deploy, or create a `production-v74` tag without a further review round.

---

### Task 1: `test-mode` control page, routing, and the legacy deep link

**Why first:** the root page's conditional warning row navigates into this page, and the highest-severity risk in the approved report is the TEST banner deep link landing on a page with no way to turn test mode off. Build and prove the destination before removing the origin.

**Files:**
- Modify: `index.html:7625-7630` `SETTINGS_PAGE_IDS` / `SETTINGS_LEGACY_TARGETS`
- Modify: `index.html:7693-7700` `renderSettingsPage()` dispatch
- Create in `index.html`: `renderSettingsTestModePage()`
- Modify: `index.html:9529-9546` `openDiagnostics()`
- Modify: `tests/ledger-entry-settings.test.js`

**Interfaces:**
- Consumes: `renderSettingsHeader(title,isRoot)`, `lsGet('trip_ledger_test_mode',false)`, `setLedgerTestMode(input)`, `backToSettingsRoot()`, `captureSettingsScroll()`, `settingsUiState`, `closeDiagnostics()`, `openSettings(targetId)`.
- Produces: `renderSettingsTestModePage()`, page id `'test-mode'`, `openTestModeSettings()` (diagnostics entry helper).

- [ ] **Step 1: Replace the position-dependent source slice with a semantic extractor**

`tests/ledger-entry-settings.test.js:99` currently does:

```js
const settingsSource = html.slice(html.indexOf('function openSettings('),html.indexOf('function mergedLedgerRecords()'));
```

Per spec §7.1 rules 3 and 4 this must go. Add an extractor that reads a named function's body by brace matching:

```js
function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'function not found: '+name);
  let i=source.indexOf('{',start), depth=0;
  for(let j=i;j<source.length;j++){
    if(source[j]==='{')depth++;
    else if(source[j]==='}'){depth--;if(depth===0)return source.slice(start,j+1);}
  }
  throw new Error('unbalanced function body: '+name);
}
```

Then define the sources the settings assertions use:

```js
const settingsRootSource   = extractFunction(html,'renderSettingsRoot');
const testModePageSource   = extractFunction(html,'renderSettingsTestModePage');
const settingsRoutingSource= extractFunction(html,'normalizeSettingsTarget');
const diagnosticsSource    = extractFunction(html,'openDiagnostics');
```

Assertions about routing tables (`SETTINGS_PAGE_IDS`, `SETTINGS_LEGACY_TARGETS`) keep using whole-file `html`, because those are top-level declarations, not function bodies.

**Do not** move any function in `index.html` to satisfy an old slice. If an assertion needs a different source, change the assertion.

- [ ] **Step 2: Write the failing routing and test-mode-page assertions**

Replace the current test-mode block (`tests/ledger-entry-settings.test.js:141-161`) with semantic contracts. Evaluate the real routing function in a `vm` sandbox rather than asserting on strings:

```js
const routingSandbox={};
vm.createContext(routingSandbox);
vm.runInContext(
  extractDeclaration(html,'SETTINGS_PAGE_IDS')+
  extractDeclaration(html,'SETTINGS_LEGACY_TARGETS')+
  extractFunction(html,'normalizeSettingsTarget'),
  routingSandbox
);
const resolve=routingSandbox.normalizeSettingsTarget;

// spec §7.1 rule 5 — the single most important contract in this release
assert.strictEqual(resolve('ledgerTestModeSection').page,'test-mode',
  'TEST banner deep link resolves to the test-mode control page');
assert.notStrictEqual(resolve('ledgerTestModeSection').page,'root',
  'TEST banner deep link never lands on the root page');
assert.strictEqual(resolve('ledgerOptionSettingsSection').page,'options','legacy options target preserved');
assert.strictEqual(resolve('ledgerProxyTargetSettingsSection').page,'proxy','legacy proxy target preserved');
assert.strictEqual(resolve('test-mode').page,'test-mode','test-mode is a first-class page id');
assert.strictEqual(resolve('nonsense').page,'root','unknown targets still fall back to root');

// spec §7.1 rule 2 — full copy lives on the control page, one character unchanged
assert(testModePageSource.includes('只顯示測試紀錄'),'test-mode page keeps the parallel-universe explanation');
assert(testModePageSource.includes('關閉即回正式帳本'),'test-mode page keeps the return-to-real-ledger explanation');
assert(testModePageSource.includes('個人帳不受影響'),'test-mode page keeps the personal-ledger note');
assert(testModePageSource.includes('僅團體帳'),'test-mode page keeps the shared-ledger-only tag');
assert(testModePageSource.includes('setLedgerTestMode(this)'),'test-mode page owns the toggle');
assert(testModePageSource.includes('backToSettingsRoot'),'test-mode page returns to the root context');

// spec §7.1 rule 8 — diagnostics is the only way in while test mode is off
assert(diagnosticsSource.includes('test-mode'),'diagnostics can reach the test-mode control page');

// the split-view banner keeps its existing call site untouched
assert(splitSource.includes("openSettings('ledgerTestModeSection')")||
       splitSource.includes('openSettings(\\\'ledgerTestModeSection\\\')'),
  'TEST banner still uses the stable legacy target');
```

`extractDeclaration(html,name)` slices `var <name>=` up to the terminating `;` at depth 0 — implement it alongside `extractFunction`.

- [ ] **Step 3: Run the test and verify red**

```bash
node tests/ledger-entry-settings.test.js
```

Expected: FAIL — `renderSettingsTestModePage` not found, and `resolve('ledgerTestModeSection').page` is `'root'`.

- [ ] **Step 4: Add the page id and remap the legacy target**

At `index.html:7625-7630`:

```js
var SETTINGS_PAGE_IDS=['root','theme','proxy','ledger','options','data','test-mode'];
var SETTINGS_LEGACY_TARGETS={
  ledgerTestModeSection:{page:'test-mode',anchorId:'ledgerTestModeSection'},
  ledgerOptionSettingsSection:{page:'options',anchorId:''},
  ledgerProxyTargetSettingsSection:{page:'proxy',anchorId:''}
};
```

`anchorId` is kept so the checkbox is scrolled into view and focused by the existing anchor logic at `index.html:7613-7622` — the element with that id now lives on the `test-mode` page instead of the root page. `normalizeSettingsTarget()` itself needs no change: it already resolves legacy entries first and validates against `SETTINGS_PAGE_IDS`.

- [ ] **Step 5: Implement `renderSettingsTestModePage()`**

Add next to the other subpage renderers (after `renderSettingsOptionsPage()`). Move the block currently at `index.html:7657` verbatim — no copy edits:

```js
function renderSettingsTestModePage(){
  return renderSettingsHeader('測試模式',false)+
    '<div class="settings-section" id="ledgerTestModeSection"><h3>團體帳測試模式</h3><div class="toggle-row"><div><b>團體帳測試模式<span class="settings-warning-tag">僅團體帳</span></b><div class="settings-help">團體帳切換為獨立 [TEST] 帳本；儀表板、結算與明細只顯示測試紀錄，關閉即回正式帳本。個人帳不受影響。</div></div><input type="checkbox" '+(lsGet('trip_ledger_test_mode',false)?'checked':'')+' onchange="setLedgerTestMode(this)"></div></div>';
}
```

Extend the dispatch at `index.html:7693-7700`:

```js
if(page==='test-mode')return renderSettingsTestModePage();
```

Scroll preservation needs no new code: `settingsUiState.scrollTopByPage` is keyed by page id and `captureSettingsScroll()` already runs on every `openSettings()`.

- [ ] **Step 6: Add the diagnostics entry point**

`setLedgerTestMode()` (`index.html:7545`) calls `renderSplit()` and may open the member selector; it must not be invoked from inside the diagnostics overlay. Route through the Settings page instead:

```js
function openTestModeSettings(){ closeDiagnostics(); openSettings('test-mode'); }
```

Add a section to `openDiagnostics()` (`index.html:9538-9543`), placed after 健康檢查 and before 旅途紀錄:

```js
'<div class="diag-section"><h3>團體帳測試模式</h3><div class="diag-row">'+(lsGet('trip_ledger_test_mode',false)?'已開啟':'已關閉')+'</div><button onclick="openTestModeSettings()">開啟測試模式控制頁</button><div class="diag-help">測試模式只影響團體帳,個人帳不受影響。</div></div>'+
```

- [ ] **Step 7: Run the test and verify green**

```bash
node tests/ledger-entry-settings.test.js
node tests/settings-backup-ux.test.js
node tests/ios-gesture-diagnostics.test.js
node tests/travel-notes.test.js
```

Expected: all exit 0. `ios-gesture-diagnostics` and `travel-notes` prove the diagnostics panel's double-tap and travel-note sections still work after the new section is inserted.

- [ ] **Step 8: Commit Task 1**

```bash
git add -- index.html tests/ledger-entry-settings.test.js
git commit -m "feat(settings): move group-ledger test mode to a dedicated control page"
```

---

### Task 2: Three-group Settings root

**Files:**
- Modify: `index.html:540-547` Settings CSS
- Modify: `index.html:7646-7658` `renderSettingsRoot()`
- Modify: `tests/ledger-entry-settings.test.js`
- Create: `tests/settings-grouped-root.test.js`
- Modify: `tests/theme-system.test.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `ledgerProxyTargetStore`, `ledgerCategoryStore`, `ledgerPayMethodStore`, `THEME_REGISTRY`, `currentThemeId()`, `getCurrentMember()`, `openMemberSelector(forced,startNew)`, `isSimpleSettlementMode()`, `setSimpleSettlementMode(this)`, `appVersionLabel()`, `currentLedgerSettings()`.
- Produces: `renderSettingsRoot()` emitting three `.settings-group` blocks; CSS classes `.settings-group`, `.settings-group-title`, `.settings-group-card`, `.settings-row`, `.settings-row-icon`, `.settings-row-main`, `.settings-row-summary`, `.settings-testmode-row`.

- [ ] **Step 1: Delete the seven-section order contract, write the three-group contract**

Remove `tests/ledger-entry-settings.test.js:130-136` (the `orderedSettingsLabels` seven-label loop). Create `tests/settings-grouped-root.test.js` — a dedicated file, **not** appended to `settings-backup-ux.test.js`, whose job is backup UX.

The root renderer depends on live stores, so drive it in a `vm` sandbox with doubles rather than asserting on raw source where behavior matters:

```js
function renderRoot(overrides){
  const sandbox=Object.assign({
    escapeHtml:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    renderSettingsHeader:()=>'<HEAD>',
    getCurrentMember:()=>'Bar',
    ledgerProxyTargetStore:{all:()=>['媽媽','同事']},
    ledgerCategoryStore:{all:()=>['餐飲','交通','購物']},
    ledgerPayMethodStore:{all:()=>['現金','信用卡']},
    THEME_REGISTRY:{ocean:{id:'ocean',name:'海洋／岡山'}},
    currentThemeId:()=>'ocean',
    isSimpleSettlementMode:()=>false,
    appVersionLabel:()=>version,          // from tests/support/version.js
    lsGet:(k,d)=>k==='trip_ledger_test_mode'?false:d
  },overrides||{});
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(html,'renderSettingsRoot'),sandbox);
  return sandbox.renderSettingsRoot({exchangeRate:'0.22',defaultCurrency:'JPY'});
}
```

Assert group order and membership (spec §8 new E1):

```js
const out=renderRoot();
const at=label=>out.indexOf(label);
assert(at('>個人<')>=0&&at('>記帳<')>at('>個人<')&&at('>資料<')>at('>記帳<'),
  'root renders exactly the approved group order 個人 → 記帳 → 資料');
assert(!out.includes('>進階<'),'no permanent 進階 group');
assert.strictEqual((out.match(/class="settings-group"/g)||[]).length,3,'exactly three groups');

// group membership by position
assert(at('目前身分')>at('>個人<')&&at('目前身分')<at('>記帳<'),'identity sits in 個人');
assert(at('>主題<')>at('>個人<')&&at('>主題<')<at('>記帳<'),'theme sits in 個人');
['代購對象','帳務','簡易結算模式','自訂項目'].forEach(function(label){
  assert(at(label)>at('>記帳<')&&at(label)<at('>資料<'),label+' sits in 記帳');
});
assert(at('備份、還原與版本資訊')>at('>資料<'),'data row sits in 資料');
```

Summaries (spec §8 new E2):

```js
assert(out.includes('2 位常用對象'),'proxy summary counts targets');
assert(out.includes('3 類別 · 2 支付方式'),'custom-option summary drops the shopping-unit count');
assert(!/\d+ 單位/.test(out),'shopping units are no longer summarized on the root page');
assert(out.includes('JPY · 0.22'),'ledger summary shows default currency and rate');
assert(renderRoot({}).includes('SW '+version),'data summary shows the running SW version');
assert(out.includes('海洋／岡山'),'theme summary shows the current theme name');
```

Unset-rate and missing-version fallbacks:

```js
const noRate=renderRootWith({exchangeRate:'',defaultCurrency:'JPY'});
assert(noRate.includes('JPY · 未設定'),'ledger summary degrades to 未設定');
assert(renderRoot({appVersionLabel:()=>'未知'}).includes('SW 未知'),'version summary degrades to SW 未知');
```

Conditional test-mode row — spec §7.1 rules 6 and 7, asserted on the rendered output, not on CSS visibility:

```js
const off=renderRoot({lsGet:(k,d)=>k==='trip_ledger_test_mode'?false:d});
assert(!off.includes('測試模式'),'root renders nothing about test mode while it is off');
assert(!off.includes('settings-testmode-row'),'no placeholder node is emitted while test mode is off');
assert(!/type="checkbox"[^>]*setLedgerTestMode/.test(off),'root never carries a test-mode toggle');

const on=renderRoot({lsGet:(k,d)=>k==='trip_ledger_test_mode'?true:d});
assert(on.includes('團體帳測試模式已開啟'),'root surfaces a warning row once test mode is on');
assert(on.includes('前往關閉'),'warning row leads to the control page');
assert(on.includes("openSettingsPage('test-mode')")||on.includes('test-mode'),'warning row targets the control page');
assert(!/type="checkbox"[^>]*setLedgerTestMode/.test(on),'warning row still carries no direct toggle');
assert(on.indexOf('團體帳測試模式已開啟')>on.indexOf('自訂項目'),'warning row sits at the bottom of 記帳');
assert(on.indexOf('團體帳測試模式已開啟')<on.indexOf('>資料<'),'warning row stays inside 記帳');
```

Entry points and accessibility:

```js
assert(out.includes('openMemberSelector(false,false)'),'switch identity entry preserved');
assert(out.includes('openMemberSelector(false,true)'),'add identity entry preserved');
assert(out.includes('新增身分'),'add-identity button has an accessible name');
["openSettingsPage('theme')","openSettingsPage('proxy')","openSettingsPage('ledger')",
 "openSettingsPage('options')","openSettingsPage('data')"].forEach(function(call){
  assert(out.includes(call),'root preserves subpage entry: '+call);
});
assert(out.includes('setSimpleSettlementMode(this)'),'simple settlement toggle preserved');
assert(out.includes(isSimpleSettlementOn?'已啟用':'已關閉'),'simple settlement state text matches the checkbox');
assert(!/APP_VERSION/.test(extractFunction(html,'renderSettingsRoot')),'root never reads APP_VERSION directly');
```

- [ ] **Step 2: Run the new test and verify red**

```bash
node tests/settings-grouped-root.test.js
```

Expected: FAIL — the root still emits seven `.settings-section` cards and a permanent test-mode section.

- [ ] **Step 3: Implement the three-group root renderer**

Rewrite `renderSettingsRoot()` (`index.html:7646-7658`). Structure per group: a `<div class="settings-group">` containing an out-of-card `<h3 class="settings-group-title">` and a `<div class="settings-group-card">` of rows.

- **個人**
  - 目前身分 — person icon, title 目前身分, right side: current member name (ellipsized), outlined `切換` → `openMemberSelector(false,false)`, square `＋` with `aria-label="新增身分"` → `openMemberSelector(false,true)`. Reuse `.settings-identity-current` / `.settings-identity-actions` behavior.
  - 主題 — theme icon, summary `THEME_REGISTRY[currentThemeId()].name`, chevron, `openSettingsPage('theme')`.
- **記帳**
  - 代購對象 — summary `<n> 位常用對象`, `openSettingsPage('proxy')`.
  - 帳務 — summary `<defaultCurrency> · <exchangeRate || '未設定'>`, `openSettingsPage('ledger')`.
  - 簡易結算模式 — standalone toggle row, right side `已啟用`／`已關閉` plus the existing checkbox calling `setSimpleSettlementMode(this)`. Keep the 保留已確認結清 explanation off the permanent row; carry it as the input's `aria-label`/`title` (spec §2.2.3).
  - 自訂項目 — summary `<n> 類別 · <n> 支付方式` (no unit count), `openSettingsPage('options')`.
  - Conditional warning row — emitted **only** when `lsGet('trip_ledger_test_mode',false)` is true, as the last child of this group, built by string concatenation so the node genuinely does not exist when off:

    ```js
    var testModeRow=lsGet('trip_ledger_test_mode',false)
      ? '<button class="settings-row settings-testmode-row" onclick="openSettingsPage(\'test-mode\')"><span class="settings-row-main"><b>⚠ 團體帳測試模式已開啟</b></span><span class="settings-row-summary">前往關閉</span><span class="settings-menu-chevron">›</span></button>'
      : '';
    ```

- **資料**
  - 資料與版本 — title 備份、還原與版本資訊, summary `'SW '+appVersionLabel()`, `openSettingsPage('data')`.

Icons are inline SVG following the existing `.app-icon` pattern at `index.html:316` (`viewBox="0 0 24 24"`, `aria-hidden="true"`, `focusable="false"`, `stroke:currentColor`). No Emoji, no new file, no new package.

- [ ] **Step 4: Implement the group CSS**

Add beside the existing Settings rules at `index.html:540-547`. Keep `.settings-section` — the five existing subpages plus the new `test-mode` page still use it.

```css
.settings-group{margin-bottom:14px}
.settings-group-title{font-size:12px;font-weight:900;color:var(--sea-deep);margin:0 0 6px 3px}
.settings-group-card{background:var(--card);border:1px solid var(--line);border-radius:13px;box-shadow:var(--shadow);overflow:hidden}
.settings-group-card>*+*{border-top:1px solid var(--line-soft)}
.settings-row{width:100%;min-height:52px;border:0;background:transparent;color:var(--ink);padding:8px 13px;text-align:left;font:inherit;display:flex;align-items:center;gap:10px}
.settings-row-icon{flex:0 0 auto;color:var(--sea-deep);display:flex}
.settings-row-icon .app-icon{width:19px;height:19px}
.settings-row-main{min-width:0;flex:1}
.settings-row-main b{display:block;font-size:14px;font-weight:900;color:var(--ink)}
.settings-row-summary{flex:0 1 auto;min-width:0;font-size:12px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.settings-testmode-row .settings-row-main b{color:var(--coral)}
```

Constraints this CSS must satisfy and the test must check: every color is a semantic token (`--card`, `--line`, `--line-soft`, `--shadow`, `--sea-deep`, `--ink`, `--ink-soft`, `--coral`); no literal hex; the warning row is not taller than a normal row (`min-height:52px`, same padding); identity actions keep `min-height:38px`.

In `tests/theme-system.test.js`, add:

```js
const groupCss=cssBlockFor(html,['.settings-group-card','.settings-row','.settings-row-summary','.settings-group-title','.settings-testmode-row']);
assert.doesNotMatch(groupCss,/#[0-9a-fA-F]{3,8}\b/,'grouped Settings CSS uses semantic tokens only');
assert.doesNotMatch(groupCss,/rgb\(|rgba\(/,'grouped Settings CSS declares no literal colors');
```

- [ ] **Step 5: Run the tests and verify green**

```bash
node tests/settings-grouped-root.test.js
node tests/ledger-entry-settings.test.js
node tests/theme-system.test.js
node tests/settings-backup-ux.test.js
node tests/app-version-fallback.test.js
```

Expected: all exit 0. `app-version-fallback` proves the data summary still routes through the safe helper.

- [ ] **Step 6: Document the new test and commit Task 2**

Add to `tests/README.md`:

```markdown
- `settings-grouped-root.test.js`：驗證設定根頁三個常駐群組(個人／記帳／資料)的順序與歸屬、各列摘要格式與降級文字、既有子頁入口、身分列可存取名稱,以及測試模式關閉時完全不渲染／開啟時才出現條件式警告列且根頁永不帶切換控制項。執行:`node tests/settings-grouped-root.test.js`。
```

```bash
git add -- index.html tests/settings-grouped-root.test.js tests/ledger-entry-settings.test.js tests/theme-system.test.js tests/README.md
git commit -m "feat(settings): rebuild the settings root as three grouped lists"
```

---

### Task 3: v74 version bump, Playwright, docs, and full QA

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js` (`SW_VERSION` line only)
- Modify: `index.html` (`APP_RELEASE_NOTES` only)
- Modify: `tests/browser/trip-three-scenarios.spec.js` or create `tests/browser/settings-grouped-root.spec.js`
- Modify: `07_CHANGELOG.md`, `tasks/current.md`, `13_PROJECT_STATUS.md`, `.ai-manifest.json`, `docs/batch2-device-acceptance.md`

- [ ] **Step 1: Bump both version sources together**

```js
// app-version.js
var APP_VERSION='v74';
```

```js
// sw.js:27 — this line and nothing else in the file
var SW_VERSION='v74';
```

`CACHE_NAME` derives automatically (`sw.js:28`). Confirm by diff that `sw.js` has exactly one changed line:

```bash
git diff --numstat -- sw.js
```

Expected: `1  1  sw.js`. Anything else means install/fetch/fallback/SHELL was touched → **STOP and report** (spec §6.1).

- [ ] **Step 2: Add the v74 user release note**

Prepend to `APP_RELEASE_NOTES` (`index.html:7678`), keeping the list at five entries by dropping the oldest (v69):

```js
{version:'v74',date:'2026-08-01',title:'設定頁更好找',items:['設定頁改為個人、記帳、資料三個群組,一頁看完','團體帳測試模式移到獨立控制頁,不再占用設定首頁']},
```

Written for users — no internal jargon, no page ids.

- [ ] **Step 3: Run the version checkers**

```bash
node tools/check-app-version.js
node tools/check-doc-titles.js
```

Expected: version consistency passes reporting `v74`; doc titles pass.

- [ ] **Step 4: Add the Playwright delta coverage**

Cover what unit tests cannot (spec §7.2, §6.2):

1. No horizontal overflow at 320×700, 375×812, 390×844 with Settings open on the root page.
2. Root → each of the five subpages → back; scroll position restored per page, including `test-mode`.
3. Six themes switched in sequence with the root page open; group card, divider, title, summary, and chevron all remain rendered and readable.
4. Full test-mode cycle: off (no row) → enable via diagnostics → root shows the warning row → warning row opens the control page → disable → row disappears → split view returns to the real ledger.
5. TEST banner deep link: with test mode on, the split-view `前往設定關閉` button lands on a page that has the checkbox.

- [ ] **Step 5: Run the complete suite**

```bash
git diff --check
for f in tests/*.test.js; do node "$f" || echo "FAILED: $f"; done
node tools/check-doc-titles.js
node tools/check-app-version.js
npx playwright test
```

Expected: every Node test file exits 0 (current total 53 plus `settings-grouped-root.test.js` = 54), both checkers pass, `git diff --check` clean, Playwright green.

- [ ] **Step 6: Verify the v73 → v74 changeover on a local server**

Serve the branch, load it as v73 first, then swap in v74 and confirm:

- CacheStorage ends with exactly `okayama-trip-v74`, `okayama-trip-v73` deleted.
- The cached `index.html` and `schema.js` are the v74 bytes — no mixed version.
- Settings 資料與版本 shows `SW v74`.
- Offline reload after the changeover still boots.

This is the §6.2 requirement. Record measured evidence, not assumptions.

- [ ] **Step 7: Browser QA at 320 / 375 / 390px**

At each width, with Settings open: three groups in order; identity row stays on one line and does not overflow, both 切換 and ＋ tappable; every row ≥52px; all five subpage entries work; simple-settlement text matches its checkbox after toggling; six themes readable; console errors and warnings 0; horizontal overflow 0.

Record measured viewport, overflow widths, scroll deltas, and console counts.

- [ ] **Step 8: Review the diff against the Tier 2 boundary**

```bash
git diff --name-status a930858..HEAD
git diff a930858..HEAD -- sw.js
git diff --numstat a930858..HEAD -- netlify.toml app-version.js
```

Expected:
- `netlify.toml` has no diff at all.
- `sw.js` diff is the single `SW_VERSION` line.
- `app-version.js` diff is `1 1`.
- No file outside the approved scope appears.
- `index.html`'s `<script src="app-version.js">` load line is unchanged.

- [ ] **Step 9: Update the governance documents**

- `07_CHANGELOG.md` — v74 scope, tests run, measured Browser QA / CacheStorage evidence, commit status. Record only what was actually observed.
- `tasks/current.md` — v74 implemented on `feat/settings-grouped-v74`, pending review; do not claim merge, deploy, or device acceptance.
- `13_PROJECT_STATUS.md`, `.ai-manifest.json` — sync the v74 state.
- `docs/batch2-device-acceptance.md` — append a **new v74 delta section** from spec §8 (new E1 three-group order, new E2 summaries, the test-mode acceptance list, and the seven Bar iPhone checks). **Do not overwrite, edit, or delete any existing v73 evidence** (spec §0 and §8 warning).

- [ ] **Step 10: Commit Task 3**

```bash
git add -- app-version.js sw.js index.html tests/browser 07_CHANGELOG.md tasks/current.md 13_PROJECT_STATUS.md .ai-manifest.json docs/batch2-device-acceptance.md
git diff --cached --check
git commit -m "chore: bump to sw v74 and record the grouped-settings release"
```

Then stop. Do not push `dev`, merge, deploy, or tag without a further review round.

---

## Stop-and-report triggers

Halt immediately and report to Bar — do not implement first — if any of these appear:

1. The grouped root cannot be built without changing an SW install/fetch/fallback strategy or the SHELL list.
2. `netlify.toml` appears to need a change.
3. `index.html`'s `app-version.js` load method appears to need a change.
4. A required change falls outside `index.html` / `app-version.js` / `sw.js` in Tier 2, or touches `schema.js` / `validator.js` / Apps Script / the backup format.
5. Keeping the legacy deep link working requires changing test-mode semantics rather than only its entry point.
6. A functional requirement appears that is not in the approved spec.
7. `git diff --numstat -- sw.js` reports anything other than `1 1`.
