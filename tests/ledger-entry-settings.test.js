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
  const entrySource = html.slice(html.indexOf('function selectLedgerCategory('),html.indexOf('function reverseLedgerRecord('));
  const splitSource = html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
  assert(settingsSource.includes('openMemberSelector(false,false)'),'Settings exposes the existing-identity switch entry');
  assert(settingsSource.includes('openMemberSelector(false,true)'),'Settings exposes the new-identity registration entry');
  assert(!splitSource.includes('openMemberSelector(false'),'Split page does not offer identity switching or registration');
  assert(html.includes("var LEDGER_CATEGORIES=['餐飲','交通','票卷','購物','其他','代墊']"),'Split page defines the six fixed categories');
  assert(splitSource.includes('id="ledgerAmount"'),'Split page has one editable amount input');
  assert(splitSource.includes('id="ledgerConvertedPreview"'),'Split page has a converted amount preview');
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
  assert(settingsSource.includes('僅分帳用'),'Settings labels test mode as ledger-only');
  assert(splitSource.includes('⚠ 測試模式中'),'Split renders the test-mode warning');
  assert(splitSource.includes('此頁新增的記帳不會列入彙算'),'Split explains that test entries are excluded');
  assert(splitSource.includes('openSettings')&&splitSource.includes('ledgerTestModeSection'),'warning opens Settings at test mode');
  assert(html.includes("var ledgerDraftCategory=LEDGER_CATEGORIES[0]"),'fresh App sessions default category to 餐飲');
  assert(!entrySource.includes("ledgerDraftCategory=''"),'successful entry retains the current category');

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
