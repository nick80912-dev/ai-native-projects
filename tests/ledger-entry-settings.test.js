const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const TripBuyToLedger = require('../buy-to-ledger.js');
const TripLedgerUiState = require('../ledger-ui-state.js');

const {extractFunction,extractDeclaration} = require('./support/source');

function plain(value){ return JSON.parse(JSON.stringify(value)); }

/* 實際執行 normalizeSettingsTarget(),斷言它的回傳值 —— 不是斷言原始碼裡有某個字串。
   TEST banner 的 deep link 是本次改版最不該失效的路徑,必須用行為證明。 */
function loadSettingsRouting(source){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    extractDeclaration(source,'SETTINGS_PAGE_IDS')+'\n'+
    extractDeclaration(source,'SETTINGS_LEGACY_TARGETS')+'\n'+
    extractFunction(source,'normalizeSettingsTarget'),
    sandbox
  );
  return sandbox.normalizeSettingsTarget;
}

function createStorage(){
  const values = {};
  return {
    getItem(key){ return Object.prototype.hasOwnProperty.call(values,key) ? values[key] : null; },
    setItem(key,value){ values[key] = String(value); },
    removeItem(key){ delete values[key]; }
  };
}

function loadModule(fetchImpl){
  const source = fs.readFileSync('index.html','utf8');
  const start = source.indexOf('/* ================= ledgerRepository');
  const end = source.indexOf('var ledgerRepository=createLedgerRepository', start);
  assert(start >= 0 && end > start,'ledger helper section is present');
  const storage = createStorage();
  const sandbox = {
    console:{log(){},warn(){},error(){}},
    localStorage:storage,
    DB:{cfg:{exchangeRate:'0.2',ledgerDefaultCurrency:'JPY'}},
    fetch:fetchImpl,
    FETCH_TIMEOUT:500,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    JSON,
    String,
    Number,
    isFinite,
    TripBuyToLedger,
    TripLedgerUiState,
    buyToLedgerRuntimeAdapter:{},
    AppLog:{repo(){},sync(){}},
    timestampDate(value){ return new Date(Number(value)); },
    lsGet(key,fallback){
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    },
    lsSet(key,value){ storage.setItem(key,JSON.stringify(value)); },
    openSettings(){ sandbox.settingsRenders++; },
    renderSplit(){ sandbox.splitRenders++; },
    settingsRenders:0,
    splitRenders:0
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  sandbox.__htmlSource = source;
  return sandbox;
}

function response(payload){
  return Promise.resolve({ok:true,status:200,json(){return Promise.resolve(payload);}});
}

(async function(){
  const mod = loadModule(function(){ return response({ok:true}); });
  assert.deepStrictEqual(plain(mod.convertLedgerAmounts('JPY',1000,0.2)),{amountJpy:1000,amountTwd:200});
  assert.deepStrictEqual(plain(mod.convertLedgerAmounts('TWD',201,0.2)),{amountJpy:1005,amountTwd:201});
  assert.throws(function(){mod.convertLedgerAmounts('JPY',100,0);},/匯率/);
  assert.throws(function(){mod.convertLedgerAmounts('USD',100,0.2);},/幣別/);
  assert.throws(function(){mod.convertLedgerAmounts('JPY',-1,0.2);},/金額/);
  assert.deepStrictEqual(
    plain(mod.normalizeLedgerSettings({exchangeRate:'0.21',ledgerDefaultCurrency:'twd'})),
    {exchangeRate:0.21,defaultCurrency:'TWD'}
  );

  let sent;
  mod.fetch = function(url,options){
    sent = {url,options};
    return response({ok:true,settings:{exchangeRate:0.21,defaultCurrency:'TWD'}});
  };
  const saved = await mod.saveLedgerSettings({exchangeRate:'0.21',defaultCurrency:'twd'});
  assert.strictEqual(saved.ok,true,'confirmed settings save resolves successfully');
  assert.strictEqual(sent.url,mod.LEDGER_POST_URL,'settings use the ledger Apps Script endpoint');
  assert.deepStrictEqual(JSON.parse(sent.options.body),{action:'updateSettings',exchangeRate:0.21,defaultCurrency:'TWD'});
  assert.strictEqual(mod.DB.cfg.exchangeRate,0.21,'confirmed rate updates the in-memory cfg');
  assert.strictEqual(mod.DB.cfg.ledgerDefaultCurrency,'TWD','confirmed currency updates the in-memory cfg');
  assert.deepStrictEqual(plain(mod.lsGet(mod.LEDGER_SETTINGS_BRIDGE_KEY,null)),{exchangeRate:0.21,defaultCurrency:'TWD'});
  assert.strictEqual(mod.settingsRenders,1,'confirmed save rerenders Settings');
  assert.strictEqual(mod.splitRenders,1,'confirmed save rerenders Split');

  mod.DB.cfg = {exchangeRate:'0.21',ledgerDefaultCurrency:'TWD'};
  assert.strictEqual(mod.reconcileLedgerSettingsBridge(),true,'published cfg matching the bridge clears it');
  assert.strictEqual(mod.lsGet(mod.LEDGER_SETTINGS_BRIDGE_KEY,null),null,'caught-up bridge is removed');

  const failed = loadModule(function(){ return response({ok:false,error:'denied'}); });
  const beforeCfg = JSON.stringify(failed.DB.cfg);
  await assert.rejects(failed.saveLedgerSettings({exchangeRate:0.25,defaultCurrency:'TWD'}),/denied/);
  assert.strictEqual(JSON.stringify(failed.DB.cfg),beforeCfg,'failed save leaves DB.cfg unchanged');
  assert.strictEqual(failed.lsGet('trip_ledger_settings_bridge',null),null,'failed save does not create a bridge');
  assert.strictEqual(failed.settingsRenders,0,'failed save does not rerender Settings');
  assert.strictEqual(failed.splitRenders,0,'failed save does not rerender Split');

  const html = mod.__htmlSource;
  const settingsNavSource = extractFunction(html,'openSettings');
  const settingsRootSource = extractFunction(html,'renderSettingsRoot');
  const settingsLedgerPageSource = extractFunction(html,'renderSettingsLedgerPage');
  const settingsOptionsPageSource = extractFunction(html,'renderSettingsOptionsPage');
  const settingsTestModePageSource = extractFunction(html,'renderSettingsTestModePage');
  const settingsDispatchSource = extractFunction(html,'renderSettingsPage');
  const diagnosticsSource = extractFunction(html,'openDiagnostics');
  const resolveSettingsTarget = loadSettingsRouting(html);
  const entrySource = html.slice(html.indexOf('function selectLedgerCategory('),html.indexOf('function deletePersonalLedgerRecord('));
  const splitSource = html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
  const ledgerUiSource = html.slice(html.indexOf('function ledgerTrackRecords()'),html.indexOf('/* ================= 導覽 / 啟動'));
  assert(settingsRootSource.includes('openMemberSelector(false,false)'),'Settings exposes the existing-identity switch entry');
  assert(settingsRootSource.includes('openMemberSelector(false,true)'),'Settings exposes the new-identity registration entry');
  assert(!splitSource.includes('openMemberSelector(false'),'Split page does not offer identity switching or registration');
  assert(html.includes('var ledgerUiState=TripLedgerUiState.createState();'),'fresh App sessions use the canonical Ledger UI state module');
  assert.strictEqual(TripLedgerUiState.createState().track,'personal','fresh App sessions default to the personal track');
  assert(splitSource.includes('個人帳留在本機；團體帳跨裝置同步。'),'Split uses the fixed dual-track explanation');
  assert(splitSource.includes("setLedgerTrack(\\'personal\\')")&&splitSource.includes("setLedgerTrack(\\'shared\\')"),'Split exposes personal/shared segmented controls');
  assert(entrySource.includes("if(track==='personal')")&&entrySource.includes('personalLedgerRepository.add'),'personal entries use only the personal repository');
  assert(entrySource.includes('ledgerRepository.enqueueBatch'),'shared entries retain the atomic shared repository queue');
  assert(html.includes("record.recordType='expense'")&&html.includes('normalizeLedgerParticipantSelection'),'shared expenses save the Ledger 2.0 contract fields');
  assert(ledgerUiSource.includes('record.payMethod'),'historical payment methods remain visible even when custom options change');
  assert(ledgerUiSource.includes('shared&&isTestLedgerRecord(record)'),'TEST badges are restricted to the shared track');
  assert(html.includes("var DEFAULT_LEDGER_CATEGORIES=['餐飲','交通','票券','購物','衣物','美妝','其他']"),'Split page defines the confirmed default categories');
  assert(html.includes("var DEFAULT_LEDGER_PAY_METHODS=['現金','信用卡','行動支付','Suica','其他']"),'Split page defines the confirmed default payment methods');
  assert(!splitSource.includes('id="ledgerAmount"'),'Split dashboard does not embed the editable amount input');
  assert(splitSource.includes('openLedgerQuickEntryFromFab'),'Split dashboard exposes the dedicated quick-entry FAB path');
  assert(!splitSource.includes('id="ledgerJpy"')&&!splitSource.includes('id="ledgerTwd"'),'legacy dual amount inputs are removed');
  assert(entrySource.includes('convertLedgerAmounts'),'Split entry converts the selected currency into both stored amounts');
  assert(settingsLedgerPageSource.includes('id="ledgerExchangeRate"'),'Settings exposes the current exchange rate');
  assert(settingsLedgerPageSource.includes('預設輸入幣別'),'Settings exposes the localized default ledger currency');
  assert(html.includes("header:'Ledger Default Currency'"),'internal Ledger Default Currency contract remains unchanged');
  assert(settingsLedgerPageSource.includes('saveLedgerSettings'),'Settings saves through the confirmed cloud settings helper');
  assert(settingsLedgerPageSource.includes('>匯率<'),'Settings shows the localized exchange-rate label');
  assert(settingsLedgerPageSource.includes('1 日幣可換算多少台幣'),'Settings explains the exchange-rate direction');
  assert(settingsLedgerPageSource.includes('>預設輸入幣別<'),'Settings shows the localized default-currency label');
  assert(settingsLedgerPageSource.includes('新增記帳時預先選擇的幣別'),'Settings explains the default input currency');
  assert(!settingsLedgerPageSource.includes('Exchange Rate（'),'Settings does not expose the internal Exchange Rate key as a label');
  assert(!settingsLedgerPageSource.includes('Ledger Default Currency（'),'Settings does not expose the internal default-currency key as a label');
  assert(settingsRootSource.includes('目前身分'),'Settings displays the current member identity');
  assert(settingsRootSource.includes('>切換<'),'Settings keeps the identity switch action');
  assert(!settingsRootSource.includes('>成員身分<'),'Settings uses the approved 身分 label');
  assert(html.includes('SETTINGS_LEGACY_TARGETS'),'legacy Settings deep links have an explicit compatibility map');
  assert(settingsNavSource.includes('normalizeSettingsTarget'),'every Settings entry resolves through the routing table');
  assert(html.includes('scrollTopByPage'),'root and every subpage preserve independent scroll positions');
  assert(settingsNavSource.includes('captureSettingsScroll'),'Settings captures scroll before rerender or navigation');
  assert(html.includes('function backToSettingsRoot('),'Settings subpages return to the root context');
  assert(settingsOptionsPageSource.includes('類別、支付方式與採買單位'),'Settings exposes custom ledger option management');

  /* ---- v74 測試模式控制頁與 legacy deep link(設計規格 §2.4／§2.5／§7.1) ---- */
  /* 規則 5:斷言 normalizeSettingsTarget() 的實際回傳值,不是原始碼字串。
     使用者在 TEST 模式中按「前往設定關閉」時必須直接抵達可關閉的控制頁,
     落到已無該 anchor 的根頁 = 關不掉測試模式,是本次最不該失效的路徑。 */
  assert.strictEqual(resolveSettingsTarget('ledgerTestModeSection').page,'test-mode',
    'TEST banner deep link resolves to the test-mode control page');
  assert.notStrictEqual(resolveSettingsTarget('ledgerTestModeSection').page,'root',
    'TEST banner deep link never lands on the root page');
  assert.strictEqual(resolveSettingsTarget('ledgerOptionSettingsSection').page,'options',
    'legacy custom-option target remains mapped');
  assert.strictEqual(resolveSettingsTarget('ledgerProxyTargetSettingsSection').page,'proxy',
    'legacy proxy-target target remains mapped');
  assert.strictEqual(resolveSettingsTarget('test-mode').page,'test-mode','test-mode is a first-class page id');
  assert.strictEqual(resolveSettingsTarget('nonsense').page,'root','unknown targets still fall back to root');
  assert.strictEqual(resolveSettingsTarget('root').page,'root','the root page id still resolves to itself');

  /* 規則 2:完整說明文字必須存在於 renderSettingsTestModePage(),一字不刪 */
  assert(settingsTestModePageSource.includes('只顯示測試紀錄'),'test-mode page keeps the parallel TEST universe explanation');
  assert(settingsTestModePageSource.includes('關閉即回正式帳本'),'test-mode page keeps the return-to-real-ledger explanation');
  assert(settingsTestModePageSource.includes('個人帳不受影響'),'test-mode page keeps the personal-ledger note');
  assert(settingsTestModePageSource.includes('僅團體帳'),'test-mode page labels test mode as shared-ledger-only');
  assert(settingsTestModePageSource.includes('setLedgerTestMode(this)'),'test-mode page owns the toggle');
  assert(settingsTestModePageSource.includes('id="ledgerTestModeSection"'),'test-mode page carries the legacy anchor id');
  assert(settingsDispatchSource.includes("page==='test-mode'")&&settingsDispatchSource.includes('renderSettingsTestModePage()'),
    'the Settings dispatcher routes test-mode to its control page');

  /* 規則 8:測試模式關閉時,診斷面板是唯一的啟用入口 */
  assert(diagnosticsSource.includes('openTestModeSettings()'),'diagnostics can reach the test-mode control page');
  assert(html.includes("function openTestModeSettings(){")&&html.includes("openSettings('test-mode')"),
    'the diagnostics entry navigates through the Settings router');

  /* 根頁不再常駐測試模式,也不得帶任何可直接切換的控制項(§2.2.5／§3.4) */
  assert(!settingsRootSource.includes('setLedgerTestMode'),'the Settings root never carries a test-mode toggle');
  /* 根頁的群組資訊架構契約在 tests/settings-grouped-root.test.js —— 那裡直接執行
     renderSettingsRoot() 並斷言渲染結果,而不是在這裡比對原始碼字串順序。 */
  assert(html.includes('addLedgerOptionFromSettings'),'Settings can add custom options');
  assert(html.includes('moveLedgerOptionFromSettings'),'Settings can reorder custom options');
  assert(html.includes('removeLedgerOptionFromSettings'),'Settings can remove default or custom options');
  assert(splitSource.includes('⚠ 目前顯示測試帳本'),'Split renders the test-universe warning');
  assert(splitSource.includes('不影響正式分帳'),'Split explains that the active test universe is isolated');
  /* Retired pre-universe warning copy assertions:
  assert(splitSource.includes('⚠ 測試模式中'),'Split renders the test-mode warning');
  assert(splitSource.includes('團體帳新增的記帳不會列入彙算'),'Split explains that only shared test entries are excluded');
  */
  assert(splitSource.includes('openSettings')&&splitSource.includes('ledgerTestModeSection'),'warning opens Settings at test mode');
  assert(html.includes('var category=ledgerDefaultCategory()')&&html.includes('category:category,categoryApply:category'),'fresh entry drafts remember the last category with a Dining fallback and initialize the multi-item apply value');
  assert(html.includes('next.category=draft.category'),'save-and-add-another retains the current category');

  const testModeSource = html.slice(html.indexOf('function setLedgerTestMode('),html.indexOf('function selectLedgerDefaultCurrency('));
  assert(testModeSource.includes('renderSplit()'),'test-mode changes immediately rerender Split');

  const syncSource = html.slice(html.indexOf('function setSyncState('),html.indexOf('/* ================= DB 組裝'));
  assert(syncSource.includes('syncHeaderModel(state,CURRENT_SNAPSHOT,Date.now())'),'sync header delegates healthy and stale copy to the relative-time model');
  assert(syncSource.includes('txt.textContent=header.text'),'healthy sync label renders the relative-time model text');
  assert(!syncSource.includes("txt.textContent='✓ 已同步'"),'healthy sync label has no leading check');

  console.log('ledger entry settings tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
