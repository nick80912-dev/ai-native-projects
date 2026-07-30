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
  const optionStoreSource=html.slice(html.indexOf('function createLedgerOptionStore('),html.indexOf('function normalizeLedgerProxyTarget('));
  assert(optionStoreSource.includes('normalize:normalize'),'the real option store exposes backup normalization');
  assert.match(html,/function normalizeShoppingUnitBackupOptions\(/,'shopping-unit backup validation is explicit');
  const storage=createStorage({
    trip_checks:JSON.stringify({P001:true}),
    trip_shop_wants:JSON.stringify({S001:true}),
    trip_member:'黃柏',
    trip_theme:'mist',
    trip_shopping_units:JSON.stringify(['個','盒','袋']),
    trip_travel_notes:JSON.stringify([{
      id:'note-1',kind:'suggestion',text:'卡片再縮短',status:'pending',
      createdAt:'2026-07-30T08:00:00.000Z',updatedAt:'2026-07-30T08:00:00.000Z',
      view:'shop',appVersion:'v72',online:false,syncState:'offline',healthSummary:[]
    }])
  });
  storage.setItem('trip_ledger_proxy_targets',JSON.stringify(['阿芬','阿蓁']));
  storage.setItem('trip_shopping_list',JSON.stringify([{
    id:'shopping-1',name:'白桃',category:'伴手禮',unit:'盒',legacyQtyText:'',
    allocations:[{allocationId:'shopping-1-allocation-1',target:'媽媽',quantity:2,ledgerLinks:[]}],
    stopRef:'10/18_3',done:false,createdAt:'2026-07-23T08:00:00.000Z',completedAt:'',splitGroupId:''
  }]));
  const box={value:'',focus(){},select(){}};
  const copied=[];
  let lastToast='';
  let fallbackText='';
  let dialogCloses=0;
  let settingsCloses=0;
  let renders=0;
  let pendingUpdates=0;
  let flushes=0;
  const appliedThemes=[];
  const queued=[{id:'1-abcd',time:'2026-07-17T10:00:00.000Z',member:'黃柏',category:'餐飲',detail:'午餐',amountJpy:1000,amountTwd:200,note:''}];
  const sandbox={
    console,
    localStorage:storage,
    navigator:{clipboard:{writeText(text){copied.push(text);return Promise.resolve();}}},
    document:{getElementById(id){return id==='personalStateBox'?box:null;}},
    ledgerRepository:{queuedRecords(){return queued;},flushQueue(){flushes++;return Promise.resolve();}},
    personalLedgerRepository:{all(){return [{id:'personal-1',time:'2026-07-18T08:00:00.000Z',member:'黃柏',category:'餐飲',detail:'早餐',amountJpy:500,amountTwd:105,note:'',payMethod:'現金',isProxy:false,proxyTarget:'',batchId:''}];}},
    /* v5 加了 completedAt／splitGroupId／ledgerLinks,v6 再加結構化 quantity／unit／legacyQtyText，
       v7 將對象、數量與 ledgerLinks 收進 allocations[]。
       備份必須連帶升版,否則舊版 App 會把新格式當成相容,還原時靜默丟掉這些欄位:
       已記帳項目會重新顯示成未記帳而重複入帳,數量也會整批消失。 */
    PERSONAL_STATE_VERSION:8,
    PERSONAL_STATE_SUPPORTED_VERSIONS:[1,2,3,4,5,6,7,8],
    isSupportedPersonalStateVersion(version){return typeof version==='number'&&[1,2,3,4,5,6,7,8].indexOf(version)>=0;},
    LEDGER_QUEUE_KEY:'trip_ledger_queue',
    PERSONAL_LEDGER_KEY:'trip_personal_ledger',
    LEDGER_CATEGORY_OPTIONS_KEY:'trip_ledger_categories',
    LEDGER_PAY_METHOD_OPTIONS_KEY:'trip_ledger_pay_methods',
    LEDGER_PROXY_TARGETS_KEY:'trip_ledger_proxy_targets',
    SHOPPING_LIST_KEY:'trip_shopping_list',
    THEME_STORAGE_KEY:'trip_theme',
    SHOPPING_UNIT_OPTIONS_KEY:'trip_shopping_units',
    TRAVEL_NOTES_KEY:'trip_travel_notes',
    THEME_IDS:['ocean','ivory','wisteria','cedar','mist','tea'],
    DEFAULT_LEDGER_CATEGORIES:['餐飲','交通','票券','購物','衣服','美妝','其他'],
    DEFAULT_LEDGER_PAY_METHODS:['現金','信用卡','行動支付','Suica','其他'],
    ledgerCategoryStore:{all(){return ['餐飲','咖啡'];}},
    ledgerPayMethodStore:{all(){return ['現金','Suica'];}},
    ledgerProxyTargetStore:{all(){return JSON.parse(storage.getItem('trip_ledger_proxy_targets')||'[]');},normalize(values){if(!Array.isArray(values))throw new Error('代購對象格式錯誤');return values.map(value=>String(value).trim()).filter(Boolean);}},
    shoppingListStore:{all(){return JSON.parse(storage.getItem('trip_shopping_list')||'[]');},normalize(values){if(!Array.isArray(values))throw new Error('採買清單格式錯誤');return values.map(value=>Object.assign({},value));}},
    shoppingUnitStore:{
      all(){return JSON.parse(storage.getItem('trip_shopping_units')||'[]');},
      normalize(values){
        if(!Array.isArray(values))throw new Error('採買單位格式錯誤');
        const normalized=values.map(value=>String(value).trim());
        if(normalized.some(value=>value.length<1||value.length>6))throw new Error('採買單位長度錯誤');
        if(new Set(normalized).size!==normalized.length)throw new Error('採買單位不可重複');
        return normalized;
      }
    },
    travelNoteStore:{
      all(){return JSON.parse(storage.getItem('trip_travel_notes')||'[]');},
      normalize(values){
        if(!Array.isArray(values)||values.length>200)throw new Error('旅途紀錄格式錯誤');
        return values.map(note=>{
          if(!note||!['issue','suggestion'].includes(note.kind)||!['pending','resolved'].includes(note.status))throw new Error('旅途紀錄內容錯誤');
          return JSON.parse(JSON.stringify(note));
        });
      }
    },
    currentThemeId(){return storage.getItem('trip_theme')||'ocean';},
    applyTheme(themeId,options){appliedThemes.push({themeId,options});return {id:themeId};},
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
  assert.strictEqual(exported.version,8,'新匯出一律使用 v8');
  assert.strictEqual(sandbox.PERSONAL_STATE_VERSION,Number(html.match(/var PERSONAL_STATE_VERSION=(\d+);/)[1]),'sandbox 版本常數與 index.html 一致,避免測試與實作漂移');
  assert.strictEqual(exported.themeId,'mist');
  assert.deepStrictEqual(exported.shoppingUnits,['個','盒','袋']);
  assert.strictEqual(exported.travelNotes[0].kind,'suggestion');
  assert.deepStrictEqual(Object.keys(exported).sort(),['checks','exportedAt','format','ledgerCategories','ledgerPayMethods','ledgerQueue','member','personalLedger','proxyTargets','shoppingItems','shoppingUnits','themeId','travelNotes','version','wants'].sort());
  assert.strictEqual(exported.personalLedger[0].id,'personal-1');
  assert.deepStrictEqual(exported.ledgerCategories,['餐飲','咖啡']);
  assert.deepStrictEqual(exported.ledgerPayMethods,['現金','Suica']);
  assert.deepStrictEqual(exported.proxyTargets,['阿芬','阿蓁']);
  assert.strictEqual(exported.shoppingItems[0].name,'白桃');
  assert.deepStrictEqual(exported.shoppingItems[0].allocations,[{
    allocationId:'shopping-1-allocation-1',target:'媽媽',quantity:2,ledgerLinks:[]
  }],'v7 匯出保留 allocation 資料');
  assert.throws(function(){sandbox.validatePersonalStatePayload(Object.assign({},exported,{proxyTargets:'阿芬'}));},/代購對象/);
  assert.throws(function(){sandbox.validatePersonalStatePayload(Object.assign({},exported,{themeId:'unknown'}));},/主題/);
  assert.throws(function(){sandbox.validatePersonalStatePayload(Object.assign({},exported,{shoppingUnits:'盒'}));},/採買單位/);
  assert.throws(function(){sandbox.validatePersonalStatePayload(Object.assign({},exported,{travelNotes:'note'}));},/旅途紀錄/);
  assert.throws(function(){sandbox.validatePersonalStatePayload(Object.assign({},exported,{travelNotes:Array.from({length:201},function(){return exported.travelNotes[0];})}));},/旅途紀錄/);
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
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_ledger_proxy_targets')),[],'version 2 backup restores a safe empty target list');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_shopping_list')),[],'older backups restore a safe empty shopping list');
  assert.strictEqual(storage.getItem('trip_theme'),'mist','v7 and older backups preserve the current theme');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_shopping_units')),['個','盒','袋'],'v7 and older backups preserve current shopping units');
  assert.strictEqual(JSON.parse(storage.getItem('trip_travel_notes'))[0].id,'note-1','v7 and older backups preserve current travel notes');
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

  box.value=JSON.stringify({format:'trip-personal-state',version:4,checks:{},wants:{},member:'黃柏',ledgerQueue:[],personalLedger:[],ledgerCategories:['購物'],ledgerPayMethods:['現金'],proxyTargets:['媽媽'],shoppingItems:[{id:'shopping-2',name:'藥妝',category:'代購',qty:'1',buyFor:'媽媽',stopRef:'10/18_3',done:true,createdAt:'2026-07-23T09:00:00.000Z'}]});
  sandbox.restorePersonalState();
  assert.strictEqual(JSON.parse(storage.getItem('trip_shopping_list'))[0].id,'shopping-2','version 4 restores shopping items');

  const v8Payload=Object.assign({},exported,{
    themeId:'tea',
    shoppingUnits:['個','包'],
    travelNotes:[Object.assign({},exported.travelNotes[0],{id:'note-2',kind:'issue',text:'離線同步異常'})]
  });
  ['trip_theme','trip_shopping_units','trip_travel_notes'].forEach(function(key){
    const before=storage.snapshot();
    storage.failOnceOn(key);
    assert.throws(function(){sandbox.applyPersonalStatePayload(sandbox.validatePersonalStatePayload(JSON.parse(JSON.stringify(v8Payload))));},/storage denied/);
    assert.strictEqual(storage.snapshot(),before,'v8 write failure on '+key+' rolls back every key');
  });
  box.value=JSON.stringify(v8Payload);
  sandbox.restorePersonalState();
  assert.strictEqual(storage.getItem('trip_theme'),'tea');
  assert.deepStrictEqual(JSON.parse(storage.getItem('trip_shopping_units')),['個','包']);
  assert.strictEqual(JSON.parse(storage.getItem('trip_travel_notes'))[0].id,'note-2');
  assert.strictEqual(appliedThemes[appliedThemes.length-1].themeId,'tea','theme reapplies only after the v8 storage commit succeeds');
  assert.strictEqual(appliedThemes[appliedThemes.length-1].options.persist,false);

  console.log('settings backup UX tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
