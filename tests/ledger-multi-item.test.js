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
    ledgerOccurrenceIso(value){return new Date(value||1784428800000).toISOString();},
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();
assert.deepStrictEqual(Array.from(mod.allocateWeightedLargestRemainder(10,[1,1,1])),[4,3,3],'equal remainders use item input order');
assert.deepStrictEqual(Array.from(mod.allocateWeightedLargestRemainder(7,[1,2,1])),[2,3,2],'weighted remainder allocation preserves the total');
assert.deepStrictEqual(Array.from(mod.allocateWeightedLargestRemainder(0,[1,2])),[0,0],'zero secondary totals allocate safely');
assert.throws(()=>mod.allocateWeightedLargestRemainder(-1,[1]),/非負安全整數/);
assert.throws(()=>mod.allocateWeightedLargestRemainder(1,[]),/權重格式/);
assert.throws(()=>mod.allocateWeightedLargestRemainder(1,[0,0]),/大於零/);
assert.throws(()=>mod.allocateWeightedLargestRemainder(Number.MAX_SAFE_INTEGER,[Number.MAX_SAFE_INTEGER,1]),/安全整數/);

const settings={exchangeRate:0.2,defaultCurrency:'JPY'};
function amounts(taxMode,taxRate,discount,currency){
  return plain(mod.calculateMultiItemAmounts({
    currency:currency||'JPY',taxMode,taxRate,discount,
    items:[{key:'a',amount:101},{key:'b',amount:100}]
  },settings));
}
const included=amounts('included',10,0);
assert.strictEqual(included.totalPrimary,201,'tax-included inputs are already final');
assert.strictEqual(included.items.reduce((sum,item)=>sum+item.amountJpy,0),201);
assert.strictEqual(included.items.reduce((sum,item)=>sum+item.amountTwd,0),40,'secondary total is converted once then allocated');

const excluded10=amounts('excluded',10,1);
assert.strictEqual(excluded10.totalPrimary,220,'10% tax is added before fixed discount');
assert.strictEqual(excluded10.items.reduce((sum,item)=>sum+item.amountJpy,0),220);
assert.strictEqual(excluded10.items.reduce((sum,item)=>sum+item.amountTwd,0),44);

const excluded8=amounts('excluded',8,0);
assert.strictEqual(excluded8.totalPrimary,217,'8% bill tax rounds once at total level');
const taxFree=amounts('free',10,1);
assert.strictEqual(taxFree.totalPrimary,200,'tax-free adds no tax and still applies discount');

const twd=amounts('included',10,1,'TWD');
assert.strictEqual(twd.totalPrimary,200);
assert.strictEqual(twd.items.reduce((sum,item)=>sum+item.amountTwd,0),200);
assert.strictEqual(twd.items.reduce((sum,item)=>sum+item.amountJpy,0),1000);

assert.throws(()=>amounts('included',10,202),/折扣不可大於/);
assert.throws(()=>amounts('included',10,201),/實付總額/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[]},settings),/至少一個品項/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'excluded',taxRate:5,discount:0,items:[{amount:100}]},settings),/稅制設定/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[{amount:1.5}]},settings),/正安全整數/);

assert.strictEqual(mod.validateProxyDraft(false,'任意'),'');
assert.strictEqual(mod.validateProxyDraft(true,' 小明 '),'小明');
assert.throws(()=>mod.validateProxyDraft(true,''),/請輸入代購對象/);
assert.throws(()=>mod.validateProxyDraft(true,'超過十二個字的代購對象名稱'),/最多 12 個字/);

const members=[{name:'Bar'},{name:'Amy'},{name:'Cara'}];
assert.deepStrictEqual(Array.from(mod.normalizeLedgerParticipantSelection(['Amy','Bar',' Amy '],members)),['Amy','Bar']);
assert.throws(()=>mod.normalizeLedgerParticipantSelection([],members),/至少一位/);
assert.throws(()=>mod.normalizeLedgerParticipantSelection(['Outsider'],members),/正式成員/);

const sharedDraft={
  track:'shared',currency:'JPY',payMethod:'現金',note:'整單',multi:true,
  taxMode:'free',taxRate:10,discount:0,participants:['Bar','Amy'],
  items:[
    {key:'i1',name:'票 A',amount:100,category:'票券',participantMode:'inherit',participants:[]},
    {key:'i2',name:'票 B',amount:200,category:'票券',participantMode:'custom',participants:['Amy']}
  ]
};
const sharedRecords=plain(mod.buildLedgerExpenseRecords(sharedDraft,{
  member:'Bar',settings,now:1784428800000,random(){return 0.25;},memberEntries:members
}));
assert.strictEqual(sharedRecords.length,2);
assert.notStrictEqual(sharedRecords[0].id,sharedRecords[1].id,'each item has an independent Record ID');
assert(sharedRecords[0].batchId&&sharedRecords[0].batchId===sharedRecords[1].batchId,'all items share one batchId');
assert.strictEqual(sharedRecords[0].participants,'["Bar","Amy"]');
assert.strictEqual(sharedRecords[1].participants,'["Amy"]','custom participants override the bill snapshot');
assert(sharedRecords.every(record=>record.recordType==='expense'));
assert.strictEqual(sharedRecords.reduce((sum,record)=>sum+record.amountJpy,0),300);

const personalDraft={
  track:'personal',currency:'JPY',payMethod:'信用卡',note:'',multi:true,
  taxMode:'included',taxRate:10,discount:0,isProxy:false,proxyTarget:'',
  items:[
    {key:'p1',name:'商品 A',amount:500,category:'購物',proxyMode:'custom',isProxy:true,proxyTarget:'朋友'},
    {key:'p2',name:'商品 B',amount:300,category:'購物',proxyMode:'inherit',isProxy:false,proxyTarget:''}
  ]
};
const personalRecords=plain(mod.buildLedgerExpenseRecords(personalDraft,{
  member:'Bar',settings,now:1784428801000,random(){return 0.5;},memberEntries:members
}));
assert.strictEqual(personalRecords[0].isProxy,true);
assert.strictEqual(personalRecords[0].proxyTarget,'朋友');
assert.strictEqual(personalRecords[1].isProxy,false);
assert.strictEqual(personalRecords[1].proxyTarget,'');
assert.strictEqual(personalRecords[0].recordType,undefined,'personal records do not gain shared contract fields');

const single=plain(mod.buildLedgerExpenseRecords({
  track:'personal',currency:'JPY',payMethod:'Suica',note:'',multi:false,
  amount:700,detail:'車票',category:'交通',isProxy:false,proxyTarget:'',taxMode:'included',taxRate:10,discount:0
},{member:'Amy',settings,now:1784428802000,random(){return 0.75;},memberEntries:members}));
assert.strictEqual(single.length,1);
assert.strictEqual(single[0].batchId,'','single-item records do not create a batch');
assert.strictEqual(single[0].detail,'車票');

const uiSource=fs.readFileSync('index.html','utf8');
assert(uiSource.includes("proxyMode:'inherit'"),'new multi-item rows explicitly inherit the bill proxy default');
assert(uiSource.includes("participantMode:'inherit'"),'new multi-item rows explicitly inherit the bill participant default');
assert(uiSource.includes("item.proxyMode!=='custom'?'沿用整單'"),'personal item summary exposes inherited semantics');
assert(uiSource.includes("item.participantMode!=='custom'?'沿用整單'"),'shared item summary exposes inherited semantics');
assert(!/ledger-item-editor[\s\S]{0,1200}ledger-currency-option/.test(uiSource),'item cards do not render per-item currency controls');
assert(!/ledger-item-editor[\s\S]{0,1200}ledger-pay-option/.test(uiSource),'item cards do not render per-item payment controls');

console.log('ledger multi-item tests passed');
