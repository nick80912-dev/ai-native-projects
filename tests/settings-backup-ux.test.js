const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values=Object.assign({},initial);
  let failKey='';
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){if(key===failKey){failKey='';throw new Error('storage denied');}values[key]=String(value);},
    removeItem(key){delete values[key];},
    snapshot(){return JSON.stringify(values);},
    failOnceOn(key){failKey=key;}
  };
}

(async function(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('function closeSettings()');
  const end=html.indexOf('function setLedgerTestMode(',start);
  assert(start>=0&&end>start,'personal-state helper section is present');
  const helperSource=html.slice(start,end);
  const settingsSource=html.slice(html.indexOf('function openSettings('),html.indexOf('function mergedLedgerRecords()'));
  const storage=createStorage({
    trip_checks:JSON.stringify({P001:true}),
    trip_shop_wants:JSON.stringify({S001:true}),
    trip_member:'黃柏'
  });
  const box={value:'',focus(){},select(){}};
  const copied=[];
  let lastToast='';
  let fallbackText='';
  let dialogCloses=0;
  let settingsCloses=0;
  let renders=0;
  let pendingUpdates=0;
  let flushes=0;
  const queued=[{id:'1-abcd',time:'2026-07-17T10:00:00.000Z',member:'黃柏',category:'餐飲',detail:'午餐',amountJpy:1000,amountTwd:200,note:''}];
  const sandbox={
    console,
    localStorage:storage,
    navigator:{clipboard:{writeText(text){copied.push(text);return Promise.resolve();}}},
    document:{getElementById(id){return id==='personalStateBox'?box:null;}},
    ledgerRepository:{queuedRecords(){return queued;},flushQueue(){flushes++;return Promise.resolve();}},
    personalLedgerRepository:{all(){return [{id:'personal-1',time:'2026-07-18T08:00:00.000Z',member:'黃柏',category:'餐飲',detail:'早餐',amountJpy:500,amountTwd:105,note:'',payMethod:'現金',isProxy:false,proxyTarget:'',batchId:''}];}},
    LEDGER_QUEUE_KEY:'trip_ledger_queue',
    PERSONAL_LEDGER_KEY:'trip_personal_ledger',
    LEDGER_CATEGORY_OPTIONS_KEY:'trip_ledger_categories',
    LEDGER_PAY_METHOD_OPTIONS_KEY:'trip_ledger_pay_methods',
    DEFAULT_LEDGER_CATEGORIES:['餐飲','交通','票券','購物','衣服','美妝','其他'],
    DEFAULT_LEDGER_PAY_METHODS:['現金','信用卡','行動支付','Suica','其他'],
    ledgerCategoryStore:{all(){return ['餐飲','咖啡'];}},
    ledgerPayMethodStore:{all(){return ['現金','Suica'];}},
    timestampDate(value){return new Date(value);},
    getCurrentMember(){return storage.getItem('trip_member')||'';},
    lsGet(key,fallback){const value=storage.getItem(key);return value===null?fallback:JSON.parse(value);},
    lsSet(key,value){storage.setItem(key,JSON.stringify(value));},
    memberIsAllowed(value){return value==='黃柏';},
    normalizeLedgerRecord(record){return record;},
    normalizePersonalLedgerRecord(record){return Object.assign({payMethod:'',isProxy:false,proxyTarget:'',batchId:''},record);},
    normalizeLedgerOption(value){value=String(value||'').trim();if(!value||value.length>6)throw new Error('invalid option');return value;},
    validateLedgerRecord(){return true;},
    renderAll(){renders++;},
    updateLedgerPendingStatus(){pendingUpdates++;},
    toast(message){lastToast=message;},
    escapeHtml(value){return String(value);},
    Date,
    Math,
    Promise,
    JSON,
    String,
    Number,
    isFinite,
    setTimeout,
    clearTimeout
  };
  vm.createContext(sandbox);
  vm.runInContext(helperSource,sandbox);
  sandbox.openPersonalStateCopyFallback=function(text){fallbackText=text;};
  sandbox.closePersonalStateDialog=function(){dialogCloses++;};
  sandbox.closeSettings=function(){settingsCloses++;};

  await sandbox.exportPersonalState();
  const exported=JSON.parse(copied[0]);
  assert.strictEqual(exported.format,'trip-personal-state');
  assert.strictEqual(exported.version,2);
  assert.deepStrictEqual(Object.keys(exported).sort(),['checks','exportedAt','format','ledgerCategories','ledgerPayMethods','ledgerQueue','member','personalLedger','version','wants'].sort());
  assert.strictEqual(exported.personalLedger[0].id,'personal-1');
  assert.deepStrictEqual(exported.ledgerCategories,['餐飲','咖啡']);
  assert.deepStrictEqual(exported.ledgerPayMethods,['現金','Suica']);
  assert.strictEqual(lastToast,'備份 JSON 已複製，請保存到安全位置');

  sandbox.navigator.clipboard.writeText=function(){return Promise.reject(new Error('denied'));};
  await sandbox.exportPersonalState();
  assert.strictEqual(JSON.parse(fallbackText).format,'trip-personal-state','clipboard failure preserves the generated JSON');

  sandbox.navigator.clipboard.writeText=function(){return new Promise(function(){});};
  const hangingClipboardOutcome=await Promise.race([
    sandbox.copyPersonalStateText('backup',20).then(function(){return 'resolved';},function(error){return error.message;}),
    new Promise(function(resolve){setTimeout(function(){resolve('test-hung');},100);})
  ]);
  assert.strictEqual(hangingClipboardOutcome,'剪貼簿逾時','unsettled clipboard operations time out into the fallback path');

  assert(!settingsSource.includes('id="personalStateBox"'),'normal Settings has no persistent JSON textarea');
  assert(settingsSource.includes('openPersonalStateRestore()'),'restore button opens the on-demand dialog');
  assert(helperSource.includes('>取消</button>'),'restore dialog exposes a cancel action');

  box.value='{';
  const beforeInvalid=storage.snapshot();
  sandbox.restorePersonalState();
  assert.strictEqual(storage.snapshot(),beforeInvalid,'malformed JSON writes nothing');
  assert.strictEqual(box.value,'{','malformed input remains available for correction');
  assert.strictEqual(lastToast,'JSON 格式錯誤');

  box.value=JSON.stringify({format:'trip-personal-state',version:2,checks:{P002:true},wants:{S002:true},member:'黃柏',ledgerQueue:queued,personalLedger:[{id:'personal-2',time:'2026-07-18T09:00:00.000Z',member:'黃柏',category:'交通',detail:'車票',amountJpy:800,amountTwd:168,note:'',payMethod:'Suica',isProxy:false,proxyTarget:'',batchId:''}],ledgerCategories:['交通'],ledgerPayMethods:['Suica']});
  const beforeStorageFailure=storage.snapshot();
  storage.failOnceOn('trip_shop_wants');
  sandbox.restorePersonalState();
  assert.strictEqual(storage.snapshot(),beforeStorageFailure,'storage failure rolls back every personal-state key');
  assert.strictEqual(lastToast,'本機資料還原失敗');

  sandbox.restorePersonalState();
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_checks')),{P002:true});
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_shop_wants')),{S002:true});
  assert.strictEqual(storage.getItem('trip_member'),'黃柏');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_queue')),queued);
  assert.strictEqual(JSON.parse(storage.getItem('trip_personal_ledger'))[0].id,'personal-2');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_categories')),['交通']);
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_pay_methods')),['Suica']);
  assert.strictEqual(dialogCloses,1);
  assert.strictEqual(settingsCloses,1);
  assert.strictEqual(renders,1);
  assert.strictEqual(pendingUpdates,1);
  assert.strictEqual(flushes,1);

  box.value=JSON.stringify({format:'trip-personal-state',version:1,checks:{P003:true},wants:{},member:'黃柏',ledgerQueue:[]});
  sandbox.restorePersonalState();
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_personal_ledger')),[],'version 1 backup restores with a safe empty personal ledger');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_categories')),sandbox.DEFAULT_LEDGER_CATEGORIES,'version 1 backup restores default categories');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_pay_methods')),sandbox.DEFAULT_LEDGER_PAY_METHODS,'version 1 backup restores default payment methods');

  console.log('settings backup UX tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
