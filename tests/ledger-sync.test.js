const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values = Object.assign({}, initial || {});
  return {
    getItem(key){ return Object.prototype.hasOwnProperty.call(values,key) ? values[key] : null; },
    setItem(key,value){ values[key]=String(value); },
    removeItem(key){ delete values[key]; }
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

  const ids = new Set();
  for(let i=0;i<500;i++) ids.add(mod.createLedgerId(1784250000000));
  assert.strictEqual(ids.size,500,'timestamp-random ledger IDs stay unique');
  assert([...ids].every(id => /^1784250000000-[0-9a-z]{4}$/.test(id)),'ledger ID uses timestamp-4 random format');

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

  const original = {id:'1784250000000-abcd',time:'2026-07-17T10:00:00.000Z',member:'阿祺',category:'門票',detail:'美術館',amountJpy:3000,amountTwd:600,note:''};
  const reversal = mod.createLedgerReversal(original,1784250100000);
  assert.strictEqual(reversal.amountJpy,-3000,'reversal negates JPY');
  assert.strictEqual(reversal.amountTwd,-600,'reversal negates TWD');
  assert(reversal.note.includes(original.id),'reversal note identifies the original record');
  const reversedSummary = mod.summarizeLedgerRecords([original,reversal]);
  assert.strictEqual(reversedSummary.total.amountJpy,0,'reversal cancels group JPY total');
  assert.strictEqual(reversedSummary.total.amountTwd,0,'reversal cancels group TWD total');
  assert.strictEqual(reversedSummary.members[0].amountJpy,0,'reversal cancels member subtotal');

  const testSummary = mod.summarizeLedgerRecords([
    original,
    {id:'test-1',time:'2026-07-17T10:01:00.000Z',member:'阿祺',category:'門票',detail:'[TEST] 驗收',amountJpy:9999,amountTwd:999,note:''}
  ]);
  assert.strictEqual(testSummary.total.amountJpy,3000,'[TEST] records are excluded from JPY totals');
  assert.strictEqual(testSummary.total.amountTwd,600,'[TEST] records are excluded from TWD totals');

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
