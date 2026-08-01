const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function plain(value){return JSON.parse(JSON.stringify(value));}

function createStorage(){
  const values={};
  let failKey='';
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){
      if(key===failKey){failKey='';throw new Error('storage denied');}
      values[key]=String(value);
    },
    removeItem(key){delete values[key];},
    failOnceOn(key){failKey=key;},
    snapshot(){return JSON.stringify(values);}
  };
}

function createSandbox(options){
  options=options||{};
  const storage=options.storage||createStorage();
  let now=Date.parse('2026-07-30T08:00:00.000Z');
  class TestDate extends Date{
    constructor(value){super(value===undefined?now++:value);}
    static now(){return now++;}
  }
  let uuid=0;
  const copied=[];
  const sandbox={
    console,
    localStorage:storage,
    navigator:{onLine:false,clipboard:{writeText(text){copied.push(text);return Promise.resolve();}}},
    document:{getElementById(){return null;}},
    /* fixture,不是「目前版本」—— 這裡在測「旅途紀錄會忠實記下當下的 APP_VERSION」,
       用哪個版本字串不影響契約,故依裁定保留原字面不隨升版變動。
       options.withoutAppVersion 時刻意不提供,用來覆蓋 app-version.js 載入失敗的情境。 */
    ...(options.withoutAppVersion ? {} : { APP_VERSION: 'v72' }),
    curView:'shop',
    syncState:'offline',
    healthCheck(){return ['同步資料過舊'];},
    AppLog:{repo(){},data(){}},
    Date:TestDate,
    appNow(){return new TestDate();},
    timestampDate(value){return new TestDate(Number(value));},
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Promise,
    setTimeout,
    clearTimeout,
    crypto:options.withoutUuid?{}:{randomUUID(){uuid++;return 'uuid-'+uuid;}},
    confirm(){return true;},
    toast(){},
    escapeHtml(value){return String(value);},
    jsString(value){return String(value);},
    openDiagnostics(){},
    openPersonalStateCopyFallback(){},
    __copied:copied,
    __storage:storage
  };
  vm.createContext(sandbox);
  /* 把 index.html 裡**真實**的 appVersion()／appVersionLabel() 注入 sandbox,
     不自己假造一份 —— 否則測到的是測試的實作,不是 App 的實作。 */
  vm.runInContext(readAppVersionHelpers(), sandbox);
  return sandbox;
}

/* 由 index.html 的具名標記取出版本安全 helper。標記變動時這裡會直接失敗,
   而不是靜默改用假實作。 */
function readAppVersionHelpers(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ---- APP_VERSION SAFE ACCESS (C2) ----');
  const end=html.indexOf('/* ---- /APP_VERSION SAFE ACCESS ---- */',start);
  assert(start>=0&&end>start,'index.html 的 APP_VERSION 安全取值區塊有穩定標記');
  return html.slice(start,end);
}

(async function(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('var TRAVEL_NOTES_KEY=');
  const end=html.indexOf('/* ================= SETTINGS 2.0 ================= */',start);
  assert(start>=0&&end>start,'travel-note module has a stable bounded section');
  const source=html.slice(start,end);
  const sandbox=createSandbox();
  vm.runInContext(source,sandbox);

  assert.strictEqual(sandbox.TRAVEL_NOTES_KEY,'trip_travel_notes');
  assert.strictEqual(sandbox.TRAVEL_NOTES_LIMIT,200);
  assert.strictEqual(sandbox.TRAVEL_NOTE_TEXT_LIMIT,500);

  const added=sandbox.travelNoteStore.add({kind:'suggestion',text:'  主題卡可以再縮短  '});
  assert.strictEqual(added.id,'uuid-1');
  assert.strictEqual(added.kind,'suggestion');
  assert.strictEqual(added.status,'pending');
  assert.strictEqual(added.text,'主題卡可以再縮短');
  assert.strictEqual(added.view,'shop');
  assert.strictEqual(added.appVersion,'v72');
  assert.strictEqual(added.online,false);
  assert.strictEqual(added.syncState,'offline');
  assert.deepStrictEqual(plain(added.healthSummary),['同步資料過舊']);

  assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:''}),/1–500/);
  assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:'x'.repeat(501)}),/1–500/);
  assert.throws(()=>sandbox.travelNoteStore.add({kind:'other',text:'x'}),/類型/);
  assert.throws(()=>sandbox.travelNoteStore.update(added.id,{status:'other'}),/狀態/);

  const resolved=sandbox.travelNoteStore.update(added.id,{status:'resolved',text:'回程後已確認'});
  assert.strictEqual(resolved.createdAt,added.createdAt);
  assert.notStrictEqual(resolved.updatedAt,added.updatedAt);
  assert.strictEqual(resolved.status,'resolved');
  assert.strictEqual(resolved.text,'回程後已確認');
  assert.strictEqual(resolved.view,added.view,'updates preserve captured context');

  const beforeCancel=sandbox.__storage.snapshot();
  sandbox.confirm=()=>false;
  assert.strictEqual(sandbox.confirmRemoveTravelNote(added.id),false);
  assert.strictEqual(sandbox.__storage.snapshot(),beforeCancel,'cancelled deletion leaves storage unchanged');
  sandbox.confirm=()=>true;
  assert.strictEqual(sandbox.confirmRemoveTravelNote(added.id),true);
  assert.deepStrictEqual(plain(sandbox.travelNoteStore.all()),[]);

  const first=sandbox.travelNoteStore.add({kind:'issue',text:'離線時摘要空白'});
  await sandbox.copyTravelNotes('text');
  assert(sandbox.__copied[0].includes('旅途紀錄'),'text export has a readable heading');
  assert(sandbox.__copied[0].includes('離線時摘要空白'),'text export includes note text');
  await sandbox.copyTravelNotes('json');
  assert.strictEqual(JSON.parse(sandbox.__copied[1])[0].id,first.id,'JSON export contains normalized notes');

  const storageBeforeFailure=sandbox.__storage.snapshot();
  sandbox.__storage.failOnceOn('trip_travel_notes');
  assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:'寫入失敗'}),/storage denied/);
  assert.strictEqual(sandbox.__storage.snapshot(),storageBeforeFailure,'failed writes keep the previous JSON unchanged');

  const full=sandbox.travelNoteStore.all();
  while(full.length<200){
    const index=full.length;
    full.push({
      id:'full-'+index,
      kind:'issue',
      text:'紀錄 '+index,
      status:'pending',
      createdAt:new Date(1785398400000-index).toISOString(),
      updatedAt:new Date(1785398400000-index).toISOString(),
      view:'today',
      appVersion:'v72',
      online:false,
      syncState:'offline',
      healthSummary:[]
    });
  }
  sandbox.__storage.setItem('trip_travel_notes',JSON.stringify(full));
  const oldestId=sandbox.travelNoteStore.all()[199].id;
  assert.throws(()=>sandbox.travelNoteStore.add({kind:'issue',text:'第 201 筆'}),/200/);
  assert.strictEqual(sandbox.travelNoteStore.all()[199].id,oldestId,'the 201st add never deletes the oldest note');

  /* app-version.js 沒載到時(離線且 CacheStorage 未命中),記錄旅途紀錄不得拋錯,
     appVersion 欄位降級為空字串。2026-07-30 C2 新增。 */
  const noVersion=createSandbox({withoutAppVersion:true});
  vm.runInContext(source,noVersion);
  let noVersionNote;
  assert.doesNotThrow(()=>{noVersionNote=noVersion.travelNoteStore.add({kind:'issue',text:'版本檔沒載到時仍要記得起來'});},
    'travel notes still record when app-version.js never loaded');
  assert.strictEqual(noVersionNote.appVersion,'','a missing version degrades to an empty field');
  assert.strictEqual(noVersionNote.text,'版本檔沒載到時仍要記得起來');

  const fallback=createSandbox({withoutUuid:true});
  vm.runInContext(source,fallback);
  const fallbackIdA=fallback.createTravelNoteId();
  const fallbackIdB=fallback.createTravelNoteId();
  assert(fallbackIdA&&fallbackIdB&&fallbackIdA!==fallbackIdB,'older WebKit fallback IDs are non-empty and unique');

  sandbox.__storage.setItem('trip_travel_notes',JSON.stringify([first]));
  const diagnosticsHtml=sandbox.renderTravelNotesSection();
  assert(diagnosticsHtml.includes('旅途紀錄'),'diagnostics contains the travel-note section');
  assert(diagnosticsHtml.includes('異常')&&diagnosticsHtml.includes('優化建議'),'note form exposes both approved kinds');
  assert(diagnosticsHtml.includes('待評估')&&diagnosticsHtml.includes('標記已處理'),'note list exposes both statuses');
  assert(diagnosticsHtml.includes('maxlength="500"'),'note editor enforces the visible length cap');
  assert(html.slice(html.indexOf('function openDiagnostics('),html.indexOf('function setupDiagnostics(')).includes('renderTravelNotesSection()'),'the diagnostics panel mounts the real travel-note component');

  console.log('travel notes tests passed');
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
