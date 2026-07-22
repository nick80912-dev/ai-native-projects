const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values = Object.assign({}, initial || {});
  let writeCount = 0;
  return {
    getItem(key){ return Object.prototype.hasOwnProperty.call(values,key) ? values[key] : null; },
    setItem(key,value){ writeCount++; values[key]=String(value); },
    removeItem(key){ delete values[key]; },
    get writeCount(){ return writeCount; }
  };
}

function loadLedgerModule(){
  const source = fs.readFileSync('index.html','utf8');
  const start = source.indexOf('/* ================= ledgerRepository');
  const end = source.indexOf('/* ================= 分帳', start);
  assert(start >= 0 && end > start, 'ledgerRepository section is present in index.html');
  const storage = createStorage();
  const sandbox = {
    console:{log(){},warn(){},error(){}},
    localStorage:storage,
    fetch(){ return Promise.reject(new Error('network disabled in unit test')); },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    timestampDate(value){ return new Date(Number(value)); },
    AppLog:{repo(){},sync(){}},
    renderSplit(){},
    updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end), sandbox);
  return sandbox;
}

(async function(){
  const mod = loadLedgerModule();
  const html=fs.readFileSync('index.html','utf8');

  assert.strictEqual(typeof mod.formatLedgerSyncRecordTime,'function','sync panel time formatter is testable with the queue helpers');
  assert.notStrictEqual(mod.formatLedgerSyncRecordTime('2026-07-22T08:30:00.000Z'),'建立時間不明','ISO queue timestamps remain readable in the sync panel');
  assert(html.includes('待同步 '+"'+count+'"+' 筆紀錄'),'sync panel renders the live pending count');
  assert(html.includes('record.detail||\'未命名明細\'')&&html.includes('formatLedgerCurrencyAmount(currency'),'sync panel renders queued detail and amount');
  assert(html.includes('formatLedgerSyncRecordTime(record.time)'),'sync panel renders each queued creation time');
  assert(html.includes('onclick="retryLedgerQueueSync()"'),'sync panel exposes the manual retry action');
  assert(html.includes("autoRetryLedgerQueue('startup')")&&html.includes("autoRetryLedgerQueue('online')")&&html.includes("autoRetryLedgerQueue('foreground')"),'startup, network recovery, and foreground reuse the same sync coordinator');
  assert(html.includes("if(outcome.ok){if(document.getElementById('ledgerSyncPanelBody'))closeLedgerInfoSheet();toast('同步完成')"),'successful manual sync restores the normal header render and reports completion');

  const universeFormal={id:'universe-formal',time:'2026-07-19T00:00:00.000Z',member:'黃柏',recordType:'expense',detail:'晚餐',amountJpy:100,amountTwd:20};
  const universeTest={id:'universe-test',time:'2026-07-19T00:01:00.000Z',member:'黃柏',recordType:'expense',detail:'[TEST] 晚餐',amountJpy:900,amountTwd:180};
  assert.deepStrictEqual(Array.from(mod.ledgerUniverseRecords([universeFormal,universeTest],'formal'),function(record){return record.id;}),['universe-formal'],'formal universe contains only formal expenses');
  assert.deepStrictEqual(Array.from(mod.ledgerUniverseRecords([universeFormal,universeTest],'test'),function(record){return record.id;}),['universe-test'],'TEST universe contains only TEST expenses');

  const schema27 = mod.normalizeLedgerRecord({
    member:'黃柏',amountJpy:100,amountTwd:20,storeName:'  松屋  ',replacesRecordId:' old-1 '
  },1000,function(){return 0;},false);
  assert.strictEqual(schema27.storeName,'松屋','shared records trim and preserve storeName');
  assert.strictEqual(schema27.replacesRecordId,'old-1','shared records trim and preserve replacesRecordId');
  const personal27 = mod.normalizePersonalLedgerRecord(schema27,1000,function(){return 0;});
  assert.strictEqual(personal27.storeName,'松屋','personal records preserve storeName');
  assert.strictEqual(personal27.replacesRecordId,'old-1','personal records preserve replacesRecordId');

  const personalStorage=createStorage({
    trip_personal_ledger:JSON.stringify([
      {id:'old-a',time:'2026-07-19T01:00:00.000Z',member:'黃柏',category:'餐飲',detail:'A',amountJpy:100,amountTwd:20,note:'',payMethod:'現金',batchId:'batch-1'},
      {id:'old-b',time:'2026-07-19T01:00:00.000Z',member:'黃柏',category:'餐飲',detail:'B',amountJpy:200,amountTwd:40,note:'',payMethod:'現金',batchId:'batch-1'}
    ])
  });
  const personalRepo=mod.createPersonalLedgerRepository({storage:personalStorage,now:function(){return 2000;},random:function(){return 0;}});
  personalRepo.replaceBatch('batch-1',[
    {id:'new-a',time:'2026-07-19T02:00:00.000Z',member:'黃柏',category:'餐飲',detail:'A2',amountJpy:150,amountTwd:30,note:'',payMethod:'現金',batchId:'batch-1'},
    {id:'new-b',time:'2026-07-19T02:00:00.000Z',member:'黃柏',category:'餐飲',detail:'B2',amountJpy:250,amountTwd:50,note:'',payMethod:'現金',batchId:'batch-1'}
  ]);
  assert.deepStrictEqual(Array.from(personalRepo.all(),function(record){return record.id;}),['new-a','new-b'],'personal batch replacement removes every old batch record');
  assert.strictEqual(personalStorage.writeCount,1,'personal batch replacement uses one atomic localStorage write');

  const ids = new Set();
  for(let i=0;i<500;i++) ids.add(mod.createLedgerId(1784250000000));
  assert.strictEqual(ids.size,500,'timestamp-random ledger IDs stay unique');
  assert([...ids].every(id => /^1784250000000-[0-9a-z]{4}$/.test(id)),'ledger ID uses timestamp-4 random format');

  let backgroundPostStarted=0;
  const optimisticStorage=createStorage();
  const optimisticRepo=mod.createLedgerRepository({
    storage:optimisticStorage,
    post(){backgroundPostStarted++;return new Promise(function(){});},
    now(){return 1784250000000;},
    random(){return 0.1;}
  });
  const optimisticAck=optimisticRepo.enqueueBatch([
    {id:'first',member:'黃柏',category:'餐飲',detail:'早餐',amountJpy:100,amountTwd:20,note:''},
    {id:'second',member:'黃柏',category:'交通',detail:'車票',amountJpy:200,amountTwd:40,note:''}
  ]);
  assert.strictEqual(optimisticAck.ok,true,'batch acknowledges local durability immediately');
  assert.strictEqual(optimisticAck.queued,true,'batch acknowledgement identifies queue-first completion');
  assert.strictEqual(optimisticAck.pending,2,'batch acknowledgement reports the complete pending count');
  assert.deepStrictEqual(Array.from(optimisticRepo.queuedRecords(),function(record){return record.id;}),['first','second'],'all batch records enter the queue in order');
  assert.strictEqual(optimisticStorage.writeCount,1,'the complete batch uses one atomic queue write');
  await new Promise(function(resolve){setTimeout(resolve,0);});
  assert.strictEqual(backgroundPostStarted,1,'delivery starts in the background after local acknowledgement');

  const invalidBatchStorage=createStorage();
  const invalidBatchRepo=mod.createLedgerRepository({storage:invalidBatchStorage,post(){return Promise.resolve({ok:true});}});
  assert.throws(function(){
    invalidBatchRepo.enqueueBatch([
      {id:'valid',member:'黃柏',amountJpy:100,amountTwd:20},
      {id:'invalid',member:' ',amountJpy:200,amountTwd:40}
    ]);
  },/成員必填/,'one invalid record rejects the complete batch');
  assert.strictEqual(invalidBatchRepo.pendingCount(),0,'invalid batches leave no partial queue records');
  assert.strictEqual(invalidBatchStorage.writeCount,0,'invalid batches never write localStorage');

  let online = false;
  const queueStorage = createStorage();
  const repo = mod.createLedgerRepository({
    storage:queueStorage,
    post(record){
      return online ? Promise.resolve({ok:true}) : Promise.reject(new Error('offline'));
    },
    now(){ return 1784250000000; }
  });
  const queued = await repo.add({member:'黃柏',category:'餐飲',detail:'拉麵',amountJpy:1200,amountTwd:0,note:''});
  assert.strictEqual(queued.ok,false,'offline add reports that delivery is pending');
  assert.strictEqual(repo.pendingCount(),1,'offline add remains in the local queue');
  online = true;
  const flushed = await repo.flushQueue();
  assert.strictEqual(flushed.sent,1,'flush sends the queued record');
  assert.strictEqual(repo.pendingCount(),0,'delivered record leaves the local queue');

  let releaseConcurrentPost;
  let concurrentPosts=0;
  const concurrentRepo=mod.createLedgerRepository({
    storage:createStorage(),
    post(){concurrentPosts++;return new Promise(function(resolve){releaseConcurrentPost=resolve;});}
  });
  concurrentRepo.enqueueBatch([{id:'single-flight',member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:600,amountTwd:120,note:''}]);
  await new Promise(function(resolve){setTimeout(resolve,0);});
  const concurrentFirst=concurrentRepo.flushQueue();
  const concurrentSecond=concurrentRepo.flushQueue();
  assert.strictEqual(concurrentFirst,concurrentSecond,'repository returns the same in-flight flush promise');
  assert.strictEqual(concurrentPosts,1,'concurrent flush requests never start a second write');
  releaseConcurrentPost({ok:true});
  await concurrentFirst;

  assert.strictEqual(typeof mod.createLedgerQueueSyncCoordinator,'function','sync UI reuses a testable single-flight coordinator');
  let coordinatorFlushes=0;
  let releaseCoordinator;
  const coordinatorEvents=[];
  const coordinatorRepo={
    remaining:3,
    pendingCount(){return this.remaining;},
    flushQueue(){coordinatorFlushes++;return new Promise(function(resolve){releaseCoordinator=resolve;});},
    queuedRecords(){return [];}
  };
  const coordinator=mod.createLedgerQueueSyncCoordinator(coordinatorRepo,{
    onStart(count,trigger){coordinatorEvents.push(['start',count,trigger]);},
    onFinish(outcome){coordinatorEvents.push(['finish',outcome.sent,outcome.pending,outcome.trigger]);}
  });
  const manualFirst=coordinator.flush('manual');
  const manualSecond=coordinator.flush('manual');
  assert.strictEqual(manualFirst,manualSecond,'sync coordinator disables duplicate retries while syncing');
  assert.strictEqual(coordinatorFlushes,1,'manual retry calls the existing flushQueue exactly once');
  assert.strictEqual(coordinator.isSyncing(),true,'sync coordinator exposes the disabled/syncing state');
  coordinatorRepo.remaining=1;
  releaseCoordinator({ok:false,sent:2,pending:1,error:new Error('連線逾時')});
  const partialOutcome=await manualFirst;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(partialOutcome)),{ok:false,sent:2,pending:1,error:'連線逾時',trigger:'manual'},'partial sync reports sent and remaining records independently');
  assert.strictEqual(coordinator.lastError(),'連線逾時','latest understandable sync error remains available to the panel');
  assert.strictEqual(coordinator.isSyncing(),false,'retry is enabled again after the existing flush settles');
  assert.deepStrictEqual(coordinatorEvents,[['start',3,'manual'],['finish',2,1,'manual']],'coordinator emits one start and one finish update');

  const dupStorage = createStorage();
  const dupRepo = mod.createLedgerRepository({
    storage:dupStorage,
    post(){ return Promise.resolve({ok:true,dup:true}); },
    now(){ return 1784250000100; }
  });
  const duplicate = await dupRepo.add({member:'阿蓁',category:'交通',detail:'停車',amountJpy:500,amountTwd:0,note:''});
  assert.strictEqual(duplicate.ok,true,'duplicate acknowledgement counts as success');
  assert.strictEqual(duplicate.dup,true,'duplicate acknowledgement is surfaced');
  assert.strictEqual(dupRepo.pendingCount(),0,'duplicate acknowledgement removes the record from queue');

  const retryStorage = createStorage();
  const retryIds=[];
  let returnDuplicate=false;
  const retryRepo = mod.createLedgerRepository({
    storage:retryStorage,
    post(record){
      retryIds.push(record.id);
      return returnDuplicate ? Promise.resolve({ok:true,dup:true}) : Promise.reject(new Error('offline'));
    },
    now(){ return 1784250000150; }
  });
  const retryRecord={id:'1784250000150-retry',member:'Bar',category:'Food',detail:'Dinner',amountJpy:500,amountTwd:110,note:''};
  const pendingRetry=await retryRepo.add(retryRecord);
  assert.strictEqual(pendingRetry.ok,false,'the first failed delivery remains pending for retry');
  assert.strictEqual(retryRepo.pendingCount(),1,'the initial failed delivery creates exactly one local record');
  returnDuplicate=true;
  const retried=await retryRepo.flushQueue();
  assert.strictEqual(retried.sent,1,'the duplicate acknowledgement completes the retry');
  assert.deepStrictEqual(retryIds,['1784250000150-retry','1784250000150-retry'],'every delivery attempt uses the original client-generated ID');
  assert.strictEqual(retryRepo.pendingCount(),0,'dup:true drains the original pending record');
  assert.deepStrictEqual(Array.from(retryRepo.queuedRecords()),[],'dup:true does not create a second local record');

  const original = {id:'1784250000000-abcd',time:'2026-07-17T10:00:00.000Z',member:'阿祺',category:'門票',detail:'美術館',amountJpy:3000,amountTwd:600,note:'',recordType:'expense',batchId:'batch-1'};
  const deletion = mod.createLedgerDeletion(original,'Bar','重複記帳',1784250100000);
  assert.strictEqual(deletion.recordType,'deletion','deletion uses the authoritative record type');
  assert.strictEqual(deletion.targetRecordId,original.id,'deletion points to the original record');
  assert.strictEqual(deletion.deleteReason,'重複記帳','deletion preserves the trimmed reason');
  assert.strictEqual(deletion.member,'Bar','deletion records the current operator');
  assert.strictEqual(deletion.time,'2026-07-17T01:01:40.000Z','deletion records the supplied current time');
  assert.strictEqual(deletion.amountJpy,0,'deletion never creates a negative JPY amount');
  assert.strictEqual(deletion.amountTwd,0,'deletion never creates a negative TWD amount');
  assert.strictEqual(deletion.participants,'','deletion has no participant snapshot');
  assert.strictEqual(deletion.payMethod,'','deletion has no payment method');
  assert.strictEqual(deletion.batchId,'batch-1','deletion retains the original batch ID');
  assert.strictEqual(deletion.detail,'[刪除]','deletion detail remains human-readable only');
  assert.deepStrictEqual(mod.spendLedgerRecords([original,deletion]),[],'the tombstone and its target are hidden');
  const deletedSummary = mod.summarizeLedgerRecords([original,deletion]);
  assert.strictEqual(deletedSummary.records.length,0,'deleted records do not count as expenses');
  assert.strictEqual(deletedSummary.total.amountJpy,0,'deleted records do not affect JPY totals');
  assert.strictEqual(deletedSummary.total.amountTwd,0,'deleted records do not affect TWD totals');

  const legacyNegative = {id:'legacy-negative',time:'2026-07-17T10:02:00.000Z',member:'阿祺',category:'門票',detail:'沖銷：舊資料',amountJpy:-3000,amountTwd:-600,note:'歷史沖銷'};
  const legacySummary = mod.summarizeLedgerRecords([original,legacyNegative]);
  assert.strictEqual(legacySummary.total.amountJpy,0,'historical negative records remain readable');
  assert.strictEqual(legacySummary.total.amountTwd,0,'historical negative TWD remains compatible');

  const testSummary = mod.summarizeLedgerRecords([
    original,
    {id:'test-1',time:'2026-07-17T10:01:00.000Z',member:'阿祺',category:'門票',detail:'[TEST] 驗收',amountJpy:9999,amountTwd:999,note:''}
  ]);
  assert.strictEqual(testSummary.total.amountJpy,3000,'[TEST] records are excluded from JPY totals');
  assert.strictEqual(testSummary.total.amountTwd,600,'[TEST] records are excluded from TWD totals');

  const zeroStorage = createStorage();
  const zeroRepo = mod.createLedgerRepository({
    storage:zeroStorage,
    post(){ return Promise.reject(new Error('offline')); },
    now(){ return 1784250000300; }
  });
  const zeroResult = await zeroRepo.add({member:'新成員',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:''});
  assert.strictEqual(zeroResult.ok,false,'offline zero-amount registration remains pending');
  assert.strictEqual(zeroResult.pending,1,'zero-amount registration enters the existing queue');
  const queuedZero = zeroRepo.queuedRecords()[0];
  assert.strictEqual(queuedZero.amountJpy,0,'queue serialization preserves JPY zero');
  assert.strictEqual(queuedZero.amountTwd,0,'queue serialization preserves TWD zero');

  assert.strictEqual(mod.canonicalMemberName('  王　小  明  '),'王 小 明','member names normalize full-width and repeated spaces');
  assert.strictEqual(mod.canonicalMemberName('Amy'),'Amy','member names preserve English case');
  assert.strictEqual(mod.canonicalMemberName('amy'),'amy','English case remains distinct');

  const formalRegistration = {id:'member-1',time:'2026-07-17T08:00:00.000Z',member:'王　小明',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:''};
  const duplicateRegistration = {id:'member-2',time:'2026-07-17T09:00:00.000Z',member:'王 小明',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:''};
  const testRegistration = {id:'member-test',time:'2026-07-17T10:00:00.000Z',member:'測試成員',category:'其他',detail:'[TEST] [身分註冊]',amountJpy:0,amountTwd:0,note:''};
  const generalExpense = {id:'expense-1',time:'2026-07-17T11:00:00.000Z',member:'未註冊付款人',category:'餐飲',detail:'午餐',amountJpy:1000,amountTwd:200,note:''};
  const similarDetail = {id:'expense-2',time:'2026-07-17T12:00:00.000Z',member:'相似文字',category:'其他',detail:'補登 [身分註冊] 資料',amountJpy:10,amountTwd:2,note:''};
  const identityRecords = [generalExpense,duplicateRegistration,testRegistration,formalRegistration,similarDetail];

  assert.strictEqual(mod.isIdentityRegistrationRecord(formalRegistration),true,'formal registration is recognized');
  assert.strictEqual(mod.isIdentityRegistrationRecord(testRegistration),true,'TEST registration is recognized after removing the prefix');
  assert.strictEqual(mod.isIdentityRegistrationRecord(similarDetail),false,'similar expense text is not misclassified');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(mod.registeredMemberEntries(identityRecords,false))),
    [{name:'王　小明',key:'王 小明',test:false}],
    'normal mode uses formal registration only and preserves the earliest display name'
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(mod.registeredMemberEntries(identityRecords,true))),
    [{name:'王　小明',key:'王 小明',test:false},{name:'測試成員',key:'測試成員',test:true}],
    'TEST mode can use test registrations while retaining formal identities for switching'
  );
  assert.deepStrictEqual(
    mod.spendLedgerRecords(identityRecords).map(record => record.id),
    ['expense-1','expense-2'],
    'registration records are removed from visible spend records and reversal candidates'
  );
  const registrationSafeSummary = mod.summarizeLedgerRecords([formalRegistration,testRegistration,generalExpense]);
  assert.strictEqual(registrationSafeSummary.records.length,1,'registration records never count as expenses');
  assert.strictEqual(registrationSafeSummary.total.amountJpy,1000,'registration records never affect totals');

  const invalidStorage = createStorage();
  const invalidRepo = mod.createLedgerRepository({
    storage:invalidStorage,
    post(){ return Promise.resolve({ok:true}); },
    now(){ return 1784250000200; }
  });
  await assert.rejects(
    invalidRepo.add({member:' ',category:'餐飲',detail:'晚餐',amountJpy:1000,amountTwd:0,note:''}),
    /成員必填/,
    'member is required before a ledger write'
  );
  assert.strictEqual(invalidRepo.pendingCount(),0,'invalid record never enters the queue');

  console.log('ledger sync tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
