const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function extractFunction(source,name){
  const start=source.indexOf(`function ${name}(`);
  assert(start>=0,`${name} exists`);
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){
    if(source[cursor]==='{')depth++;
    if(source[cursor]==='}')depth--;
    if(depth===0)return source.slice(start,cursor+1);
  }
  throw new Error(`could not extract ${name}`);
}

function createStorage(initial){
  const values=Object.assign({},initial||{});
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadHelpers(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ================= ledgerRepository');
  const end=html.indexOf('/* ================= 分帳',start);
  const warnings=[];
  const sandbox={
    console:{log(){},warn(message){warnings.push(String(message));},error(){}},
    localStorage:createStorage(),fetch(){return Promise.reject(new Error('offline'));},
    setTimeout,clearTimeout,Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(start,end),sandbox);
  sandbox.__warnings=warnings;
  sandbox.__html=html;
  return sandbox;
}

(async function(){
  const mod=loadHelpers();
  const expense={id:'expense-1',time:'2026-07-18T01:00:00.000Z',member:'Amy',category:'餐飲',detail:'早餐',amountJpy:800,amountTwd:168,note:'',recordType:'expense',batchId:''};
  const second={id:'expense-2',time:'2026-07-18T02:00:00.000Z',member:'Bar',category:'交通',detail:'車票',amountJpy:500,amountTwd:105,note:'',recordType:'expense',batchId:''};
  const deletion=mod.createLedgerDeletion(expense,'Bar',' 輸入錯誤 ',1784340000000,()=>0.5);
  const duplicate=mod.createLedgerDeletion(expense,'Amy','重複確認',1784340001000,()=>0.6);

  assert.strictEqual(mod.isDeletionRecord(deletion),true,'recordType alone identifies a tombstone');
  assert.strictEqual(mod.isDeletionRecord({detail:'[刪除]',recordType:'expense'}),false,'detail text never grants deletion authority');
  assert.strictEqual(mod.canDeleteLedgerRecord(expense),true,'ordinary expenses can be deleted');
  assert.strictEqual(mod.canDeleteLedgerRecord(deletion),false,'tombstones cannot be deleted');
  assert.strictEqual(mod.canDeleteLedgerRecord({recordType:'identity_registration',detail:'[身分註冊]'}),false,'identity registrations cannot be deleted');
  assert.throws(()=>mod.createLedgerDeletion(expense,'Bar','   ',1784340000000),/刪除原因必填/,'group deletion requires a reason');
  assert.throws(()=>mod.createLedgerDeletion(expense,'Bar','a'.repeat(51),1784340000000),/最多 50 個字/,'group deletion enforces the reason limit');
  assert.throws(()=>mod.createLedgerDeletion(deletion,'Bar','錯誤目標',1784340000000),/不可刪除/,'a tombstone cannot target another tombstone');

  const effective=mod.effectiveLedgerRecords([expense,second,deletion,duplicate]);
  assert.deepStrictEqual(effective.map(record=>record.id),['expense-2'],'duplicate tombstones delete their target only once');
  assert.strictEqual(mod.summarizeLedgerRecords([expense,second,deletion,duplicate]).total.amountJpy,500,'deleted targets and tombstones are excluded from totals');

  const deletionFields={detail:'[刪除]',member:'Bar',deleteReason:'測試刪除',time:'2026-07-18T03:00:00.000Z',amountJpy:0,amountTwd:0,participants:'',payMethod:''};
  const missing=Object.assign({id:'delete-missing',recordType:'deletion',targetRecordId:'does-not-exist'},deletionFields);
  const registration={id:'member-1',recordType:'identity_registration',detail:'[身分註冊]',member:'Bar',amountJpy:0,amountTwd:0};
  const deleteRegistration=Object.assign({id:'delete-member',recordType:'deletion',targetRecordId:'member-1'},deletionFields);
  const deleteTombstone=Object.assign({id:'delete-delete',recordType:'deletion',targetRecordId:'delete-missing'},deletionFields);
  assert.deepStrictEqual(mod.effectiveLedgerRecords([second,missing]).map(record=>record.id),['expense-2'],'a missing target is ignored safely');
  assert.deepStrictEqual(mod.effectiveLedgerRecords([registration,deleteRegistration]).map(record=>record.id),['member-1'],'identity registration targets are ignored safely');
  assert.deepStrictEqual(mod.effectiveLedgerRecords([missing,deleteTombstone]),[],'tombstones stay hidden even when another tombstone targets them');
  assert(mod.__warnings.length>=3,'invalid deletion targets emit console warnings');

  const typedRegistration={id:'member-typed',recordType:'identity_registration',detail:'',member:'Bar',amountJpy:0,amountTwd:0};
  const deleteTypedRegistration={id:'delete-member-typed',recordType:'deletion',targetRecordId:'member-typed',detail:'[刪除]',member:'Amy',deleteReason:'錯誤操作',time:'2026-07-18T03:00:00.000Z',amountJpy:0,amountTwd:0,participants:'',payMethod:''};
  assert.strictEqual(mod.isIdentityRegistrationRecord(typedRegistration),true,'recordType protects identity registrations even when detail is malformed');
  assert.deepStrictEqual(mod.effectiveLedgerRecords([typedRegistration,deleteTypedRegistration]).map(record=>record.id),['member-typed'],'typed identity registrations cannot be tombstoned');

  const malformedNoReason={id:'delete-no-reason',recordType:'deletion',targetRecordId:'expense-2',detail:'[刪除]',member:'Amy',deleteReason:'',time:'2026-07-18T03:00:00.000Z',amountJpy:0,amountTwd:0,participants:'',payMethod:''};
  const malformedAmount={id:'delete-with-amount',recordType:'deletion',targetRecordId:'expense-2',detail:'[刪除]',member:'Amy',deleteReason:'錯誤金額',time:'2026-07-18T03:00:00.000Z',amountJpy:-500,amountTwd:0,participants:'',payMethod:''};
  assert.deepStrictEqual(mod.effectiveLedgerRecords([second,malformedNoReason]).map(record=>record.id),['expense-2'],'a tombstone without a reason cannot hide a target');
  assert.deepStrictEqual(mod.effectiveLedgerRecords([second,malformedAmount]).map(record=>record.id),['expense-2'],'a non-zero tombstone cannot hide a target');

  const queueStorage=createStorage();
  let online=false;
  const repo=mod.createLedgerRepository({
    storage:queueStorage,now(){return 1784340000000;},
    post(){return online?Promise.resolve({ok:true}):Promise.reject(new Error('offline'));}
  });
  const queued=await repo.add(deletion);
  assert.strictEqual(queued.ok,false,'an offline tombstone enters the existing queue');
  assert.strictEqual(repo.queuedRecords()[0].recordType,'deletion','the queued record remains a tombstone');
  online=true;
  assert.strictEqual((await repo.flushQueue()).sent,1,'the existing flush path sends an offline tombstone');

  const bridgeStorage=createStorage();
  const bridgeMod=loadHelpers();
  bridgeMod.localStorage=bridgeStorage;
  bridgeMod.rememberLedgerDeletionBridge(deletion);
  assert.strictEqual(bridgeMod.ledgerDeletionBridgeRecords().length,1,'an acknowledged tombstone remains in the local bridge');
  const staleMerged=bridgeMod.mergeLedgerRecordSets([expense],[],bridgeMod.ledgerDeletionBridgeRecords());
  assert.strictEqual(bridgeMod.spendLedgerRecords(staleMerged).length,0,'the bridge prevents target revival while cloud CSV is stale');
  bridgeMod.reconcileLedgerDeletionBridge([expense,deletion]);
  assert.strictEqual(bridgeMod.ledgerDeletionBridgeRecords().length,0,'the bridge clears after the cloud snapshot includes the tombstone');

  let deliveredRecord=null, deliveredPendingCount=-1;
  const deliveredRepo=mod.createLedgerRepository({
    storage:createStorage(),now(){return 1784340000000;},post(){return Promise.resolve({ok:true});},
    onDelivered(record){deliveredRecord=record;deliveredPendingCount=deliveredRepo.pendingCount();}
  });
  await deliveredRepo.add(deletion);
  assert.strictEqual(deliveredRecord.recordType,'deletion','successful delivery runs the bridge hook before queue removal');
  assert.strictEqual(deliveredPendingCount,1,'the bridge hook runs before the delivered tombstone leaves the queue');

  assert(!mod.__html.includes('createLedgerReversal'),'new negative reversal creation is removed');
  assert(!mod.__html.includes('reverseLedgerRecord'),'the old reversal action is removed');
  assert(!mod.__html.includes('🗑 沖銷'),'the old reversal label is removed');
  assert(mod.__html.includes('確定刪除這筆團體紀錄？'),'shared deletion shows the confirmed title');
  assert(mod.__html.includes('此操作會同步對所有裝置生效，原始紀錄仍會保留。'),'shared deletion explains cross-device impact');
  assert(mod.__html.includes('刪除原因（必填）：'),'shared deletion labels the required reason');
  assert(mod.__html.includes('id="ledgerDeleteReason"')&&mod.__html.includes('maxlength="50"'),'shared deletion limits the reason to 50 characters');
  assert(extractFunction(mod.__html,'submitSharedLedgerDeletion').includes('if(!reason)'),'an empty reason cannot be submitted');

  const personalCalls={confirmText:'',removed:0,rendered:0};
  const personalSandbox={
    personalLedgerRepository:{all(){return [expense];},remove(id){personalCalls.removed++;return id===expense.id;}},
    confirm(message){personalCalls.confirmText=message;return false;},renderSplit(){personalCalls.rendered++;},toast(){}
  };
  vm.createContext(personalSandbox);
  vm.runInContext(extractFunction(mod.__html,'deletePersonalLedgerRecord'),personalSandbox);
  personalSandbox.deletePersonalLedgerRecord(expense.id);
  assert.strictEqual(personalCalls.confirmText,'確定刪除這筆個人紀錄？\n此操作無法復原。','personal deletion uses the exact warning');
  assert.strictEqual(personalCalls.removed,0,'cancelling personal deletion preserves the record');
  personalSandbox.confirm=()=>true;
  personalSandbox.deletePersonalLedgerRecord(expense.id);
  assert.strictEqual(personalCalls.removed,1,'confirming personal deletion truly removes the record');
  assert.strictEqual(personalCalls.rendered,1,'confirmed personal deletion refreshes the list');

  console.log('ledger tombstone deletion tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
