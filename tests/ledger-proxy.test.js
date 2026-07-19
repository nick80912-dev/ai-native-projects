const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function createStorage(){
  const values={};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadModule(){
  const source=fs.readFileSync('index.html','utf8');
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:createStorage(),
    fetch(){return Promise.reject(new Error('network disabled'));},setTimeout,clearTimeout,
    Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();
const proxyTargets=mod.createLedgerProxyTargetStore({storage:mod.localStorage,key:'trip_ledger_proxy_targets'});
proxyTargets.add('  阿芬 ');
proxyTargets.add('阿芬');
proxyTargets.add('阿蓁');
assert.deepStrictEqual(plain(proxyTargets.all()),['阿芬','阿蓁'],'proxy targets trim and de-duplicate while preserving insertion order');
proxyTargets.remove('阿芬');
assert.deepStrictEqual(plain(proxyTargets.all()),['阿蓁']);
assert.throws(()=>proxyTargets.add(''),/代購對象/);
assert.throws(()=>proxyTargets.add('這是一個超過十二個字的代購對象'),/12/);
const records=[
  {id:'1',member:'Bar',amountJpy:1000,amountTwd:200,isProxy:false,proxyTarget:''},
  {id:'2',member:'Bar',amountJpy:600,amountTwd:120,isProxy:true,proxyTarget:'小明'},
  {id:'3',member:'Amy',amountJpy:500,amountTwd:100,isProxy:false,proxyTarget:''},
  {id:'4',member:'Amy',amountJpy:300,amountTwd:60,isProxy:true,proxyTarget:'小明'},
  {id:'5',member:'Bar',amountJpy:200,amountTwd:40,isProxy:true,proxyTarget:'店家'},
  {id:'legacy',member:'Bar',amountJpy:50,amountTwd:10}
];

const proxy=plain(mod.buildProxySummary(records,' Bar '));
assert.strictEqual(proxy.proxyCount,3,'all historical proxy records remain visible regardless of current identity');
assert.deepStrictEqual(proxy.proxyTotal,{amountJpy:1100,amountTwd:220});
assert.deepStrictEqual(proxy.actualSpend,{amountJpy:1050,amountTwd:210},'current member actual spend excludes proxy records they paid');
assert.deepStrictEqual(proxy.targets,[
  {target:'小明',count:2,amountJpy:900,amountTwd:180},
  {target:'店家',count:1,amountJpy:200,amountTwd:40}
],'proxy targets retain first-seen order and exact subtotals');

const amy=plain(mod.buildProxySummary(records,'Amy'));
assert.deepStrictEqual(amy.actualSpend,{amountJpy:500,amountTwd:100},'historical ownership follows each saved member');
assert.deepStrictEqual(plain(mod.buildProxySummary([], 'Bar')).actualSpend,{amountJpy:0,amountTwd:0});

const uiSource=fs.readFileSync('index.html','utf8');
assert(uiSource.includes('未指定')&&uiSource.includes('新增對象'),'proxy targets render as reusable pill choices with inline creation');
assert(uiSource.includes('ledgerProxyTargetSettingsSection'),'Settings exposes reusable proxy target management');
assert(uiSource.includes('renderLedgerProxyTargetChoices'),'single and per-item proxy controls share the target chooser');

console.log('ledger proxy tests passed');
