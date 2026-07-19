const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function createStorage(initial){
  const values=Object.assign({},initial);let writes=0;
  return {getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},setItem(key,value){values[key]=String(value);writes++;},removeItem(key){delete values[key];},writes(){return writes;}};
}
function loadModule(storage){
  const source=fs.readFileSync('index.html','utf8');
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳(雲端 Ledger)',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={console,localStorage:storage,fetch(){return Promise.reject(new Error('offline'));},setTimeout,clearTimeout,Date,Math,Promise,JSON,String,Number,isFinite,timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},renderSplit(){},updateLedgerPendingStatus(){}};
  vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);return sandbox;
}
function plain(value){return JSON.parse(JSON.stringify(value));}

const storage=createStorage();
const mod=loadModule(storage);
const old={id:'old-1',time:'2026-07-18T10:00:00.000Z',member:'Bar',category:'餐飲',detail:'拉麵',amountJpy:1000,amountTwd:200,note:'',participants:'["Bar","Amy"]',payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',storeName:'松屋',replacesRecordId:''};
const replacement=Object.assign({},old,{id:'draft-id',detail:'烏龍麵',amountJpy:1200,amountTwd:240});
const single=plain(mod.buildSharedLedgerEditBatch([old],[replacement],{member:'Bar',now:1784428800000,random(){return 0.25;}}));
assert.strictEqual(single.length,2);
assert.strictEqual(single[0].recordType,'deletion');
assert.strictEqual(single[0].targetRecordId,old.id);
assert.strictEqual(single[0].deleteReason,'編輯修改');
assert.strictEqual(single[1].recordType,'expense');
assert.strictEqual(single[1].replacesRecordId,old.id);
assert.notStrictEqual(single[1].id,old.id);

const oldBatch=[old,Object.assign({},old,{id:'old-2',detail:'煎餃',batchId:'batch-old'})].map((record,index)=>Object.assign({},record,{batchId:'batch-old',time:`2026-07-18T10:0${index}:00.000Z`}));
const newItems=[replacement,Object.assign({},replacement,{detail:'煎餃'}),Object.assign({},replacement,{detail:'飲料'})];
const batch=plain(mod.buildSharedLedgerEditBatch(oldBatch,newItems,{member:'Bar',now:1784428801000,random(){return 0.5;}}));
assert.deepStrictEqual(batch.slice(0,2).map(record=>record.recordType),['deletion','deletion']);
assert.deepStrictEqual(batch.slice(0,2).map(record=>record.targetRecordId),['old-1','old-2']);
assert.strictEqual(new Set(batch.slice(2).map(record=>record.batchId)).size,1,'replacement expenses share one new batch ID');
assert(batch.slice(2).every(record=>record.replacesRecordId==='old-1'),'all replacement items link to the canonical first old ID');

const testOld=oldBatch.map(record=>Object.assign({},record,{detail:'[TEST] '+record.detail}));
const testBatch=plain(mod.buildSharedLedgerEditBatch(testOld,newItems,{member:'Bar',now:1784428802000,random(){return 0.75;}}));
assert(testBatch.slice(2).every(record=>/^\[TEST\]/.test(record.detail)),'editing a TEST batch keeps every replacement in the test universe');

assert.deepStrictEqual(plain(mod.ledgerEditSelection([old].concat(oldBatch.slice(1)),'old-2').map(record=>record.id)),['old-2'],'single selection finds the requested record');
assert.deepStrictEqual(plain(mod.ledgerEditSelection(oldBatch,'old-1').map(record=>record.id)),['old-1','old-2'],'batch selection includes all effective sibling items');

const personalStore=createStorage({trip_personal_ledger:JSON.stringify([{id:'p1',batchId:'pb',time:old.time,member:'Bar',category:'餐飲',detail:'A',amountJpy:100,amountTwd:20},{id:'p2',batchId:'pb',time:old.time,member:'Bar',category:'餐飲',detail:'B',amountJpy:200,amountTwd:40}])});
const personal=loadModule(personalStore).createPersonalLedgerRepository({storage:personalStore,now(){return 1;},random(){return 0.1;}});
const beforeWrites=personalStore.writes();
personal.replaceBatch('pb',[{id:'p1',batchId:'pb',time:old.time,member:'Bar',category:'餐飲',detail:'A+',amountJpy:150,amountTwd:30}]);
assert.strictEqual(personalStore.writes()-beforeWrites,1,'personal batch editing uses one atomic localStorage write');
assert.strictEqual(personal.all()[0].id,'p1','personal editing preserves the original ID');
assert(!personal.all().some(record=>record.recordType==='deletion'),'personal edits never create tombstones');

const html=fs.readFileSync('index.html','utf8');
assert(html.includes('編輯')&&html.includes('⋯'),'effective record detail exposes an edit action menu');
assert(html.includes("'編輯修改'"),'shared edit tombstones use the fixed automatic reason');

console.log('ledger editing tests passed');
