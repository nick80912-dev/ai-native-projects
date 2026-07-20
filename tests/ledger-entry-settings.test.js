const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function plain(value){ return JSON.parse(JSON.stringify(value)); }

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
  const settingsSource = html.slice(html.indexOf('function openSettings('),html.indexOf('function mergedLedgerRecords()'));
  const entrySource = html.slice(html.indexOf('function selectLedgerCategory('),html.indexOf('function deletePersonalLedgerRecord('));
  const splitSource = html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
  const ledgerUiSource = html.slice(html.indexOf('function ledgerTrackRecords()'),html.indexOf('/* ================= 導覽 / 啟動'));
  assert(settingsSource.includes('openMemberSelector(false,false)'),'Settings exposes the existing-identity switch entry');
  assert(settingsSource.includes('openMemberSelector(false,true)'),'Settings exposes the new-identity registration entry');
  assert(!splitSource.includes('openMemberSelector(false'),'Split page does not offer identity switching or registration');
  assert(html.includes("var ledgerUiState={track:'personal'"),'fresh App sessions default to the personal track');
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
  assert(settingsSource.includes('id="ledgerExchangeRate"'),'Settings exposes the current exchange rate');
  assert(settingsSource.includes('預設輸入幣別'),'Settings exposes the localized default ledger currency');
  assert(html.includes("header:'Ledger Default Currency'"),'internal Ledger Default Currency contract remains unchanged');
  assert(settingsSource.includes('saveLedgerSettings'),'Settings saves through the confirmed cloud settings helper');
  assert(settingsSource.includes('>匯率<'),'Settings shows the localized exchange-rate label');
  assert(settingsSource.includes('1 日幣可換算多少台幣'),'Settings explains the exchange-rate direction');
  assert(settingsSource.includes('>預設輸入幣別<'),'Settings shows the localized default-currency label');
  assert(settingsSource.includes('新增記帳時預先選擇的幣別'),'Settings explains the default input currency');
  assert(!settingsSource.includes('Exchange Rate（'),'Settings does not expose the internal Exchange Rate key as a label');
  assert(!settingsSource.includes('Ledger Default Currency（'),'Settings does not expose the internal default-currency key as a label');
  assert(settingsSource.includes('目前身分'),'Settings displays the current member identity');
  assert(settingsSource.includes('切換身分')&&settingsSource.includes('新增身分'),'Settings keeps both identity management actions');
  assert(settingsSource.includes('ledgerTestModeSection'),'test mode has a stable Settings target');
  assert(settingsSource.includes('僅團體帳'),'Settings labels test mode as shared-ledger-only');
  assert(settingsSource.includes('只顯示測試紀錄')&&settingsSource.includes('關閉即回正式帳本'),'Settings explains the parallel TEST universe');
  assert(settingsSource.includes('自訂類別與支付方式'),'Settings exposes custom ledger option management');
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
  assert(syncSource.includes("txt.textContent='已同步'"),'healthy sync label is 已同步');
  assert(!syncSource.includes("txt.textContent='✓ 已同步'"),'healthy sync label has no leading check');

  console.log('ledger entry settings tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
