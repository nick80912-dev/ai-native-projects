/* tests/settings-grouped-root.test.js — 設定根頁三群組列表契約(SW v74)
   ============================================================
   對應設計規格 docs/superpowers/specs/2026-08-01-settings-grouped-list-design.md
   §2 資訊架構、§4 互動與狀態、§7.1 測試要求、§8 delta 驗收標準。

   這個檔直接「執行」renderSettingsRoot() 並斷言渲染出來的字串,不是比對原始碼片段:
   測試模式關閉時「完全不渲染」與「只是視覺隱藏」在原始碼層看起來一樣,
   只有渲染結果能分辨(§7.1 規則 6)。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const {readIndexHtml,extractFunction,extractDeclaration} = require('./support/source');
const {appVersion} = require('./support/version');

const html = readIndexHtml();
const version = appVersion();

function escapeHtml(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

/* 只注入 renderSettingsRoot 真正依賴的東西,其餘一律用 double —— 這樣斷言失敗時
   指向的是根頁渲染邏輯,不是 store 或主題系統。 */
function renderRoot(overrides,ledgerSettings){
  const sandbox = Object.assign({
    escapeHtml:escapeHtml,
    renderSettingsHeader:function(title,isRoot){ return '<HEAD title="'+title+'" root="'+!!isRoot+'">'; },
    getCurrentMember:function(){ return 'Bar'; },
    ledgerProxyTargetStore:{all:function(){ return ['媽媽','同事']; }},
    ledgerCategoryStore:{all:function(){ return ['餐飲','交通','購物']; }},
    ledgerPayMethodStore:{all:function(){ return ['現金','信用卡']; }},
    shoppingUnitStore:{all:function(){ return ['個','盒','袋','瓶','包','份']; }},
    THEME_REGISTRY:{ocean:{id:'ocean',name:'海洋／岡山'},tea:{id:'tea',name:'焙茶／倉敷'}},
    currentThemeId:function(){ return 'ocean'; },
    isSimpleSettlementMode:function(){ return false; },
    appVersionLabel:function(){ return version; },
    shoppingPhotoStorageSummary:function(){ return '0 張 · 0 B'; },
    lsGet:function(key,fallback){ return key==='trip_ledger_test_mode' ? false : fallback; }
  },overrides||{});
  vm.createContext(sandbox);
  vm.runInContext(
    extractDeclaration(html,'SETTINGS_ROW_ICONS')+'\n'+
    extractFunction(html,'settingsGroup')+'\n'+
    extractFunction(html,'settingsNavRow')+'\n'+
    extractFunction(html,'renderSettingsRoot'),
    sandbox
  );
  return sandbox.renderSettingsRoot(ledgerSettings||{exchangeRate:'0.22',defaultCurrency:'JPY'});
}

const out = renderRoot();
const at = function(needle){ return out.indexOf(needle); };

/* ---- §8 新 E1:三個常駐群組,順序固定 個人 → 記帳 → 資料 ---- */
assert(at('>個人<')>=0,'root renders the 個人 group');
assert(at('>記帳<')>at('>個人<'),'記帳 follows 個人');
assert(at('>資料<')>at('>記帳<'),'資料 follows 記帳');
assert.strictEqual((out.match(/class="settings-group"/g)||[]).length,3,'root renders exactly three groups');
assert(!out.includes('>進階<'),'root has no permanent 進階 group');

/* ---- §2 群組歸屬 ---- */
assert(at('目前身分')>at('>個人<')&&at('目前身分')<at('>記帳<'),'identity row sits in 個人');
assert(at('>主題<')>at('>個人<')&&at('>主題<')<at('>記帳<'),'theme row sits in 個人');
['>代購對象<','>帳務<','>簡易結算模式<','>自訂項目<'].forEach(function(label){
  assert(at(label)>at('>記帳<')&&at(label)<at('>資料<'),label+' sits in 記帳');
});
assert(at('>備份、還原與版本資訊<')>at('>資料<'),'data row sits in 資料');
assert(at('>照片健康狀態<')>at('>資料<'),'photo health row sits in 資料');
assert(at('>照片健康狀態<')<at('>備份、還原與版本資訊<'),'photo health precedes backup and version');

/* ---- §8 新 E2:摘要格式 ---- */
assert(out.includes('2 位常用對象'),'proxy summary counts the stored targets');
assert(out.includes('3 類別 · 2 支付方式'),'custom-option summary lists categories and payment methods');
assert(!/\d+\s*單位/.test(out),'shopping units are no longer summarized on the root page');
assert(out.includes('JPY · 0.22'),'ledger summary shows default currency and exchange rate');
assert(out.includes('SW '+version),'data summary shows the running Service Worker version');
assert(out.includes('0 張 · 0 B'),'storage summary shows the device-local attachment count and size');
assert(out.includes('海洋／岡山'),'theme summary shows the current theme name');

/* ---- 降級路徑 ---- */
assert(renderRoot(null,{exchangeRate:'',defaultCurrency:'JPY'}).includes('JPY · 未設定'),
  'ledger summary degrades to 未設定 when no rate is stored');
assert(renderRoot(null,{exchangeRate:'',defaultCurrency:'TWD'}).includes('TWD · 未設定'),
  'ledger summary follows the stored default currency');
assert(renderRoot({appVersionLabel:function(){ return '未知'; }}).includes('SW 未知'),
  'data summary degrades to SW 未知 when APP_VERSION is missing');
assert(renderRoot({currentThemeId:function(){ return 'nonexistent'; }}).includes('海洋／岡山'),
  'an unknown theme id still renders the ocean fallback name');
assert(renderRoot({getCurrentMember:function(){ return ''; }}).includes('尚未選擇'),
  'an unset identity renders the placeholder');

/* ---- §4 §2.2.5 §3.4:測試模式的條件式警告列 ---- */
const off = renderRoot({lsGet:function(key,fallback){ return key==='trip_ledger_test_mode' ? false : fallback; }});
assert(!off.includes('測試模式'),'root renders nothing about test mode while it is off');
assert(!off.includes('settings-testmode-row'),'no placeholder node is emitted while test mode is off');
assert(!/setLedgerTestMode/.test(off),'root carries no test-mode toggle while it is off');

const on = renderRoot({lsGet:function(key,fallback){ return key==='trip_ledger_test_mode' ? true : fallback; }});
assert(on.includes('團體帳測試模式已開啟'),'root surfaces the warning row once test mode is on');
assert(on.includes('前往關閉'),'warning row tells the user where it leads');
assert(on.includes("openSettingsPage('test-mode')"),'warning row opens the test-mode control page');
assert(on.includes('settings-testmode-row'),'warning row uses the dedicated warning class');
assert(!/setLedgerTestMode/.test(on),'warning row still carries no direct toggle');
assert(!/<input[^>]*type="checkbox"[^>]*>\s*<\/button>/.test(on),'warning row is a plain navigation row');
assert(on.indexOf('團體帳測試模式已開啟')>on.indexOf('>自訂項目<'),'warning row is the last entry of 記帳');
assert(on.indexOf('團體帳測試模式已開啟')<on.indexOf('>資料<'),'warning row stays inside 記帳');

/* ---- 既有入口一個都不能少(§1 成功標準) ---- */
assert(out.includes('openMemberSelector(false,false)'),'identity switch entry preserved');
assert(out.includes('openMemberSelector(false,true)'),'identity add entry preserved');
assert(out.includes('aria-label="新增身分"'),'the add-identity button keeps an accessible name');
["openSettingsPage('theme')","openSettingsPage('proxy')","openSettingsPage('ledger')",
 "openSettingsPage('options')","openSettingsPage('storage')","openSettingsPage('data')"].forEach(function(call){
  assert(out.includes(call),'root preserves the subpage entry '+call);
});

/* ---- 簡易結算模式:狀態文字與 checkbox 必須一致(§4) ---- */
assert(out.includes('setSimpleSettlementMode(this)'),'simple settlement keeps its existing handler');
assert(out.includes('已關閉')&&!out.includes('已啟用'),'simple settlement reads 已關閉 while off');
assert(!/簡易結算模式<\/b><\/span><span class="settings-row-summary">已關閉<\/span><input type="checkbox" checked/.test(out),
  'the off state does not render a checked box');
const simpleOn = renderRoot({isSimpleSettlementMode:function(){ return true; }});
assert(simpleOn.includes('已啟用'),'simple settlement reads 已啟用 while on');
assert(/checked/.test(simpleOn),'the on state renders a checked box');
assert(simpleOn.includes('保留已確認結清'),'the 保留已確認結清 explanation survives as an accessible description');

/* ---- 版本安全取值(§4):根頁不得裸讀 APP_VERSION ---- */
const rootSource = extractFunction(html,'renderSettingsRoot');
assert(!/APP_VERSION/.test(rootSource),'root reads the version only through appVersionLabel()');
assert(rootSource.includes('appVersionLabel()'),'root uses the safe version helper');
assert(html.includes("'storage'"),'the Settings router declares the storage page');
assert(extractFunction(html,'renderSettingsPage').includes("if(page==='storage')return renderSettingsStoragePage();"),
  'the Settings router renders the attachment storage page');

/* ---- 觸控面積與圖示來源(§1 §3.2) ---- */
const icons = extractDeclaration(html,'SETTINGS_ROW_ICONS');
assert(icons.includes('class="app-icon"'),'row icons reuse the existing inline SVG class');
assert(icons.includes('aria-hidden="true"'),'row icons are hidden from assistive technology');
assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(icons),'row icons contain no Emoji');
assert(!/<img|https?:\/\//.test(icons),'row icons load nothing external');

console.log('settings grouped root tests passed');
