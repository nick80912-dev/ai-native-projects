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
    ledgerOccurrenceIso(dateValue,timeValue){return dateValue?new Date(String(dateValue).replace(/\//g,'-')+'T'+(timeValue||'00:00')+':00').toISOString():new Date(1784428800000).toISOString();},
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();
const uiSource=fs.readFileSync('index.html','utf8');
const participantHelperStart=uiSource.indexOf('function canonicalMemberName(');
const participantHelperEnd=uiSource.indexOf('function buildParticipantSnapshot(',participantHelperStart);
const itemModeStart=uiSource.indexOf('function ledgerDraftItem(');
const itemModeEnd=uiSource.indexOf('function toggleLedgerItemParticipant(',itemModeStart);
assert(participantHelperStart>=0&&participantHelperEnd>participantHelperStart,'participant canonicalizer source exists');
assert(itemModeStart>=0&&itemModeEnd>itemModeStart,'item participant mode source exists');
const modeSandbox={
  ledgerUiState:{draft:null},
  document:{getElementById(){return null;},querySelector(){return null;},activeElement:null},
  updateLedgerMultiPreview(){},updateLedgerSaveCount(){},withLedgerSheetPosition(){},renderLedgerEntrySheet(){},
  JSON,String,Object,Array
};
vm.createContext(modeSandbox);
vm.runInContext(uiSource.slice(participantHelperStart,participantHelperEnd)+uiSource.slice(itemModeStart,itemModeEnd),modeSandbox);
assert.strictEqual(modeSandbox.sameLedgerParticipantSelection(['Amy','Bar'],['bar',' Amy ']),false,'participant identity remains case-sensitive');
assert.strictEqual(modeSandbox.sameLedgerParticipantSelection(['Amy'],['Amy','Bar']),false);

const modeDraft={track:'shared',participants:['Bar','Amy'],items:[{
  key:'i1',participantMode:'inherit',participants:[]
}]};
modeSandbox.ledgerUiState={draft:modeDraft};
modeSandbox.setLedgerItemParticipantMode('i1',true);
assert.strictEqual(modeDraft.items[0].participantMode,'custom');
assert.deepStrictEqual(plain(modeDraft.items[0].participants),['Bar','Amy']);
modeSandbox.setLedgerItemParticipantMode('i1',false);
assert.strictEqual(modeDraft.items[0].participantMode,'inherit');
assert.deepStrictEqual(plain(modeDraft.items[0].participants),[]);
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

function modernAmounts(priceMode,taxPreset,customTaxRate,discount,items){
  return plain(mod.calculateMultiItemAmounts({
    currency:'JPY',priceMode,taxPreset,customTaxRate,discount:discount||0,
    items:items||[{key:'a',amount:1000,taxExempt:false}]
  },settings));
}
assert.strictEqual(modernAmounts('included','10','',0).totalPrimary,1000,'tax-included prices remain final');
assert.strictEqual(modernAmounts('excluded','10','',0).totalPrimary,1100,'10% excluded tax is added');
assert.strictEqual(modernAmounts('excluded','8','',0).totalPrimary,1080,'8% excluded tax is added');
assert.strictEqual(modernAmounts('excluded','custom','7.5',0).totalPrimary,1075,'custom decimal rates use integer basis points');
assert.strictEqual(modernAmounts('excluded','10','',0,[{amount:1000,taxExempt:true}]).totalPrimary,1000,'tax-exempt items ignore the bill tax rate');
const mixedTax=modernAmounts('excluded','10','',100,[{amount:1000,taxExempt:false},{amount:500,taxExempt:true}]);
assert.strictEqual(mixedTax.totalPrimary,1500,'mixed tax exemption and a fixed discount share one deterministic total');
assert.strictEqual(mixedTax.items.reduce((sum,item)=>sum+item.amountJpy,0),1500,'item allocation preserves the mixed-tax discounted total');
assert.throws(()=>modernAmounts('excluded','custom','0',0),/自訂稅率/);
assert.throws(()=>modernAmounts('excluded','custom','100.1',0),/自訂稅率/);
assert.throws(()=>modernAmounts('excluded','custom','7.55',0),/自訂稅率/);

const twd=amounts('included',10,1,'TWD');
assert.strictEqual(twd.totalPrimary,200);
assert.strictEqual(twd.items.reduce((sum,item)=>sum+item.amountTwd,0),200);
assert.strictEqual(twd.items.reduce((sum,item)=>sum+item.amountJpy,0),1000);

assert.throws(()=>amounts('included',10,202),/折扣不可大於/);
assert.throws(()=>amounts('included',10,201),/實付總額/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[]},settings),/至少一個品項/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'excluded',taxRate:5,discount:0,items:[{amount:100}]},settings),/稅制設定/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[{amount:1.5}]},settings),/請輸入有效金額/);
assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[{amount:12345678}]},settings),/請輸入有效金額/,'allocation overflow uses the short user-facing amount error');
['not-a-number',0,-1].forEach(value=>assert.throws(()=>mod.calculateMultiItemAmounts({currency:'JPY',taxMode:'included',taxRate:10,discount:0,items:[{amount:value}]},settings),/請輸入有效金額/));

assert.strictEqual(mod.validateProxyDraft(false,'任意'),'');
assert.strictEqual(mod.validateProxyDraft(true,' 小明 '),'小明');
assert.strictEqual(mod.validateProxyDraft(true,''),'','未指定 is a valid non-persisted proxy target');
assert.throws(()=>mod.validateProxyDraft(true,'超過十二個字的代購對象名稱'),/最多 12 個字/);

const members=[{name:'Bar'},{name:'Amy'},{name:'Cara'}];
assert.deepStrictEqual(Array.from(mod.normalizeLedgerParticipantSelection(['Amy','Bar',' Amy '],members)),['Amy','Bar']);
assert.throws(()=>mod.normalizeLedgerParticipantSelection([],members),/至少一位/);
assert.throws(()=>mod.normalizeLedgerParticipantSelection(['Outsider'],members),/正式成員/);

const sharedDraft={
  track:'shared',currency:'JPY',payMethod:'現金',note:'整單',multi:true,storeName:'測試食堂',
  occurredDate:'2026/07/19',occurredTime:'12:00',priceMode:'excluded',taxPreset:'10',customTaxRate:'',discount:30,participants:['Bar','Amy'],
  items:[
    {key:'i1',name:'票 A',amount:100,category:'票券',taxExempt:true,participantMode:'inherit',participants:[]},
    {key:'i2',name:'票 B',amount:200,category:'票券',taxExempt:false,participantMode:'custom',participants:['Amy']}
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
assert.strictEqual(sharedRecords.reduce((sum,record)=>sum+record.amountJpy,0),290);
assert.strictEqual(sharedRecords.reduce((sum,record)=>sum+record.couponAmount,0),30,'per-item coupon allocation preserves the bill coupon total');
assert.strictEqual(sharedRecords[0].isTaxFree,true);
assert.strictEqual(sharedRecords[1].isTaxFree,false);
assert(sharedRecords.every(record=>record.inputCurrency==='JPY'&&record.priceMode==='excluded'&&record.taxRate===10));
assert(sharedRecords.every(record=>!Object.prototype.hasOwnProperty.call(record,'categoryApplyOpen')),'category picker state remains transient and never reaches stored records');
assert(sharedRecords.every(record=>!Object.prototype.hasOwnProperty.call(record,'isProxy')),'shared records never gain proxy semantics');

const personalDraft={
  track:'personal',currency:'JPY',payMethod:'信用卡',note:'',multi:true,storeName:'測試商店',
  occurredDate:'2026/07/19',occurredTime:'12:00',priceMode:'included',taxPreset:'10',customTaxRate:'',discount:0,isProxy:false,proxyTarget:'',
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
assert.strictEqual(personalRecords[0].isTaxFree,false);
assert.strictEqual(personalRecords[1].isProxy,false);
assert.strictEqual(personalRecords[1].proxyTarget,'');
assert.strictEqual(personalRecords[0].recordType,undefined,'personal records do not gain shared contract fields');

assert.throws(()=>mod.buildLedgerExpenseRecords(Object.assign({},sharedDraft,{storeName:'  '}),{
  member:'Bar',settings,now:1784428800000,random(){return 0.25;},memberEntries:members
}),/請輸入店家名稱/,'multi-item entries require a store name');

const single=plain(mod.buildLedgerExpenseRecords({
  track:'personal',currency:'JPY',payMethod:'Suica',note:'',multi:false,
  occurredDate:'2026/07/19',occurredTime:'',amount:700,detail:'車票',category:'交通',isProxy:false,proxyTarget:'',priceMode:'excluded',taxPreset:'10',customTaxRate:'',discount:100
},{member:'Amy',settings,now:1784428802000,random(){return 0.75;},memberEntries:members}));
assert.strictEqual(single.length,1);
assert.strictEqual(single[0].batchId,'','single-item records do not create a batch');
assert.strictEqual(single[0].detail,'車票');
assert.strictEqual(single[0].amountJpy,700,'single-entry tax metadata never recalculates the paid amount');
assert.strictEqual(single[0].couponAmount,100,'single-entry coupon is recorded without subtraction');
assert.strictEqual(single[0].taxRate,10);

assert(uiSource.includes("proxyMode:'custom'"),'personal multi-item proxy state is always item-local');
assert(uiSource.includes("participantMode:'inherit'"),'new multi-item rows explicitly inherit the bill participant default');
assert(!uiSource.includes('單項設定 ·')&&!uiSource.includes('沿用整單'),'retired item override presentation is absent');
assert(uiSource.includes("item.participantMode==='custom'?renderLedgerItemParticipants(item):''"),'shared item rows render participants only for custom allocations');
assert(uiSource.includes('<span>單項分攤</span>'),'shared item rows expose the item allocation toggle');
assert(uiSource.includes("renderLedgerMultiBillInfo(draft)+renderLedgerTrackSpecificFields(draft)+renderLedgerMultiItemFields(draft)"),'multi-item forms show bill participant selection before item editors');
assert(!/ledger-item-editor[\s\S]{0,1200}ledger-currency-option/.test(uiSource),'item cards do not render per-item currency controls');
assert(!/ledger-item-editor[\s\S]{0,1200}ledger-pay-option/.test(uiSource),'item cards do not render per-item payment controls');
assert(uiSource.includes('税込（含稅）')&&uiSource.includes('税抜（未稅）'),'price mode uses the confirmed bilingual pill labels');
assert(uiSource.includes("['none','無稅']")&&uiSource.includes("['custom','自訂']"),'tax rate uses fixed pill choices including custom');
assert(uiSource.includes('全部免稅品'),'multi-item tax controls expose the bulk tax-exempt action');
assert(uiSource.includes('taxExempt'),'each item preserves an independent tax-exempt flag');
assert(uiSource.includes("renderLedgerParticipantGroup('單項分攤成員',item.participants,item.key,''"),'item participant controls use the shared group renderer');
assert(uiSource.includes("renderLedgerParticipantGroup('分攤成員',draft.participants,null"),'bill participant controls use the shared group renderer');

console.log('ledger multi-item tests passed');
