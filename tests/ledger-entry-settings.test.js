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

  console.log('ledger entry settings tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
