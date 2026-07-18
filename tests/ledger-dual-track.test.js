const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values=Object.assign({},initial||{});
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadModule(storage){
  const source=fs.readFileSync('index.html','utf8');
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:storage,Date,Math,Promise,JSON,String,Number,isFinite,
    setTimeout,clearTimeout,fetch(){throw new Error('personal ledger must not call fetch');},
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return sandbox;
}

const storage=createStorage();
const mod=loadModule(storage);

assert.strictEqual(mod.PERSONAL_LEDGER_KEY,'trip_personal_ledger');
assert.strictEqual(mod.LEDGER_CATEGORY_OPTIONS_KEY,'trip_ledger_categories');
assert.strictEqual(mod.LEDGER_PAY_METHOD_OPTIONS_KEY,'trip_ledger_pay_methods');
assert.deepStrictEqual(Array.from(mod.DEFAULT_LEDGER_CATEGORIES),['餐飲','交通','票券','購物','衣服','美妝','其他']);
assert.deepStrictEqual(Array.from(mod.DEFAULT_LEDGER_PAY_METHODS),['現金','信用卡','行動支付','Suica','其他']);

const personalRepo=mod.createPersonalLedgerRepository({storage,now(){return 1784428800000;},random(){return 0;}});
const personal=personalRepo.add({
  member:'Bar',category:'餐飲',detail:'拉麵',amountJpy:1200,amountTwd:252,note:'個人',
  payMethod:'現金',isProxy:false,proxyTarget:'',batchId:''
});
assert.strictEqual(personal.detail,'拉麵','personal records never receive a TEST prefix');
assert.strictEqual(personal.payMethod,'現金');
assert.strictEqual(personal.isProxy,false);
assert.strictEqual(personal.proxyTarget,'');
assert.strictEqual(personal.batchId,'');
assert.strictEqual(personalRepo.all().length,1,'personal record persists locally');
assert.strictEqual(storage.getItem(mod.LEDGER_QUEUE_KEY),null,'personal record never enters the shared queue');

const brokenStorage=createStorage({trip_personal_ledger:'{'});
const brokenRepo=mod.createPersonalLedgerRepository({storage:brokenStorage,now(){return 1784428800100;},random(){return 0.5;}});
assert.deepStrictEqual(Array.from(brokenRepo.all()),[],'invalid personal JSON safely falls back to an empty list');
brokenRepo.add({member:'Amy',category:'交通',detail:'車票',amountJpy:500,amountTwd:105,note:'',payMethod:'Suica'});
assert.strictEqual(brokenRepo.all().length,1,'a new personal record can replace invalid local JSON safely');

const shared=mod.normalizeLedgerRecord({
  member:'Bar',category:'交通',detail:'租車',amountJpy:500,amountTwd:105,note:'',
  participants:'["Bar","Amy"]',payMethod:'信用卡',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'batch-1'
},1784428800200,function(){return 0.25;},false);
assert.strictEqual(shared.participants,'["Bar","Amy"]');
assert.strictEqual(shared.payMethod,'信用卡');
assert.strictEqual(shared.recordType,'expense');
assert.strictEqual(shared.targetRecordId,'');
assert.strictEqual(shared.deleteReason,'');
assert.strictEqual(shared.batchId,'batch-1');
assert.strictEqual(
  mod.buildParticipantSnapshot([{name:'Bar'},{name:'Amy'},{name:'Bar'}],'Bar'),
  '["Bar","Amy"]',
  'shared participant snapshots preserve registration order and deduplicate names'
);
assert.strictEqual(
  mod.buildParticipantSnapshot([{name:'Amy'}],'Bar'),
  '["Amy","Bar"]',
  'the current payer is included when absent from registered entries'
);

const personalSummary=mod.summarizePersonalLedgerRecords([
  {id:'personal-test-text',time:'2026-07-18T08:00:00.000Z',member:'Bar',category:'其他',detail:'[TEST] 商品名稱',amountJpy:300,amountTwd:63,note:'',payMethod:'現金'}
]);
assert.strictEqual(personalSummary.total.amountJpy,300,'TEST-like text never excludes a personal record from totals');

const categoryStore=mod.createLedgerOptionStore({storage,key:mod.LEDGER_CATEGORY_OPTIONS_KEY,defaults:mod.DEFAULT_LEDGER_CATEGORIES});
assert.deepStrictEqual(Array.from(categoryStore.all()),['餐飲','交通','票券','購物','衣服','美妝','其他']);
categoryStore.remove('餐飲');
assert.strictEqual(categoryStore.all().includes('餐飲'),false,'default options can be deleted');
categoryStore.add('咖啡');
assert.strictEqual(categoryStore.all().includes('咖啡'),true,'trimmed custom options persist');
assert.throws(function(){categoryStore.add('咖啡');},/重複/);
assert.throws(function(){categoryStore.add('超過六個字選項');},/最多 6 個字/);
categoryStore.move('咖啡',-1);
assert(categoryStore.all().indexOf('咖啡')<categoryStore.all().length-1,'custom options can move upward');

console.log('ledger dual-track tests passed');
