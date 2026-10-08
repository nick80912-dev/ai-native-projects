/* tests/trip-source.test.js — 第二階段「連接新旅程」的來源紀錄與連接交易（v149）
   規格：docs/superpowers/specs/2026-10-08-connect-new-trip-design.md §3、§5、§6、§7。 */
const assert=require('assert');
const TripLifecycle=require('../trip-lifecycle.js');
const TripSource=require('../trip-source.js');

const PUB='2PACX-1vT'+'a'.repeat(70);
const ENDPOINT='https://script.google.com/macros/s/AKfycbz'+'b'.repeat(60)+'/exec';

function memoryStorage(seed){
  const values=Object.assign({},seed||{});
  return {
    values,
    get length(){return Object.keys(values).length;},
    key(index){return Object.keys(values)[index]||null;},
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

/* ---- 連結解析：只接受「發布到網路」，編輯連結要明確指出 ---- */
assert.deepStrictEqual(TripSource.parsePublishedLink('https://docs.google.com/spreadsheets/d/e/'+PUB+'/pubhtml'),{ok:true,pubId:PUB});
assert.deepStrictEqual(TripSource.parsePublishedLink(' https://docs.google.com/spreadsheets/d/e/'+PUB+'/pub?output=csv&gid=0 '),{ok:true,pubId:PUB});
assert.deepStrictEqual(TripSource.parsePublishedLink('https://docs.google.com/spreadsheets/d/e/'+PUB+'/pubhtml#gid=1'),{ok:true,pubId:PUB});
assert.deepStrictEqual(TripSource.parsePublishedLink(PUB),{ok:true,pubId:PUB},'a bare publish ID is accepted');
assert.strictEqual(TripSource.parsePublishedLink('https://docs.google.com/spreadsheets/d/1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw/edit#gid=0').reason,'edit-link');
assert.strictEqual(TripSource.parsePublishedLink('').reason,'empty');
['http://docs.google.com/spreadsheets/d/e/'+PUB+'/pubhtml','https://evil.example/spreadsheets/d/e/'+PUB+'/pubhtml',
 'https://docs.google.com/spreadsheets/d/e/2PACX-short/pubhtml','https://docs.google.com/spreadsheets/d/e/'+PUB+'/edit'].forEach(function(link){
  assert.strictEqual(TripSource.parsePublishedLink(link).ok,false,link+' is rejected');
});
assert.strictEqual(TripSource.pubBaseFor(PUB),'https://docs.google.com/spreadsheets/d/e/'+PUB+'/pub?single=true&output=csv&gid=');
assert.throws(function(){TripSource.pubBaseFor('nope');},/publish/i);

/* ---- Endpoint 與 Trip ID 格式 ---- */
assert.strictEqual(TripSource.validEndpoint(ENDPOINT),true);
['http://script.google.com/macros/s/AKfycbzxxxxxxxxxxxx/exec','https://script.google.com/macros/s/AKfycbzxxxxxxxxxxxx/dev',
 'https://script.google.com.evil.example/macros/s/AKfycbzxxxxxxxxxxxx/exec',''].forEach(function(url){
  assert.strictEqual(TripSource.validEndpoint(url),false,url+' is not a deployed Apps Script endpoint');
});
assert.strictEqual(TripSource.validTripId('kyushu-2027_spring'),true);
['ab','has space','中文','x'.repeat(41)].forEach(function(id){assert.strictEqual(TripSource.validTripId(id),false,id);});

/* ---- 來源紀錄讀寫與 key ---- */
let storage=memoryStorage();
assert.deepStrictEqual(TripSource.readSource(storage),{status:'missing',record:null});
const sheetRecord={kind:'sheet',pubId:PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州五日',startDate:'2027-03-01',endDate:'2027-03-05',connectedAt:1};
TripSource.writeSource(storage,sheetRecord);
assert.strictEqual(TripSource.readSource(storage).status,'ok');
assert.strictEqual(TripSource.sourceKey(TripSource.readSource(storage).record),'sheet:kyushu-2027');
assert.strictEqual(TripSource.sourceKey({kind:'legacy'}),'legacy');
assert.strictEqual(TripSource.sourceKey(null),'legacy','no record means the built-in Okayama source');
storage.setItem(TripSource.SOURCE_KEY,'{broken');
assert.strictEqual(TripSource.readSource(storage).status,'corrupt','a damaged record never silently becomes the legacy source');
storage.setItem(TripSource.SOURCE_KEY,JSON.stringify(Object.assign({},sheetRecord,{ledgerEndpoint:'https://example.com/exec'})));
assert.strictEqual(TripSource.readSource(storage).status,'corrupt','an invalid endpoint is treated as damage');
assert.throws(function(){TripSource.writeSource(memoryStorage(),Object.assign({},sheetRecord,{tripId:'x'}));},/Trip ID/);
const noPersist=memoryStorage();noPersist.setItem=function(){};
assert.throws(function(){TripSource.writeSource(noPersist,sheetRecord);},/persist/i);

/* ---- 開機分類：用過這趟的手機沿用岡山；新手機為「尚未連接」 ---- */
function classify(seed,mode){
  const s=memoryStorage(seed);
  if(mode)TripLifecycle.writeState(s,{mode:mode,archiveId:null});
  return TripSource.classifyBoot(s,TripLifecycle);
}
assert.strictEqual(classify({}),'mark-unconnected','a fresh device starts unconnected');
assert.strictEqual(classify({trip_data_snapshot_state:'{"formatVersion":1}',trip_member:'Amy',trip_theme:'ocean',trip_checks:'{}',
  trip_next_stop_progress:'{"10/18":{"done":{},"skip":{},"autoSkip":{}}}',trip_ledger_queue:'[]'}),'mark-unconnected',
  'caches, a picked name and empty maps (e.g. after passing through the v110 bridge) do not make a device legacy');
assert.strictEqual(classify({trip_checks:'{"10/18_2":true}'}),'migrate-legacy');
assert.strictEqual(classify({trip_next_stop_progress:'{"10/19":{"done":{},"skip":{"10/19_1":true},"autoSkip":{"10/19_1":true}}}'}),'migrate-legacy');
assert.strictEqual(classify({trip_ledger_queue:'[{"id":"1"}]'}),'migrate-legacy','an unsent group record keeps the device on its trip');
assert.strictEqual(classify({trip_personal_ledger:'[{"id":"p"}]'}),'migrate-legacy');
assert.strictEqual(classify({trip_shopping_list:'[{"id":"s"}]'}),'migrate-legacy');
assert.strictEqual(classify({trip_ledger_delivery_bridge:'{"r1":{"id":"r1"}}'}),'migrate-legacy');
assert.strictEqual(classify({trip_travel_notes:'[{"id":"n"}]'}),'migrate-legacy');
assert.strictEqual(classify({trip_checks:'not json'}),'migrate-legacy','unreadable personal data is kept, not discarded');
assert.strictEqual(classify({trip_checks:'{"10/18_2":true}'},'complete'),'inactive','an inactive device is left alone');
assert.strictEqual(classify({},'unconnected'),'inactive');
assert.strictEqual(classify({trip_source:JSON.stringify(sheetRecord)}),'use');
assert.strictEqual(classify({trip_source:'{broken'}),'corrupt');

/* ---- lifecycle：unconnected 與 activate ---- */
storage=memoryStorage();
TripLifecycle.writeState(storage,{mode:'unconnected'});
assert.strictEqual(TripLifecycle.readState(storage).mode,'unconnected');
TripLifecycle.activate(storage);
assert.strictEqual(TripLifecycle.readState(storage).mode,'active');
assert.strictEqual(storage.getItem(TripLifecycle.STATE_KEY),null);

/* ---- 連接交易 ---- */
function goodCfg(){return {tripname:'九州五日',startdate:'2027-03-01',enddate:'2027-03-05',tripid:'kyushu-2027',ledgerendpoint:ENDPOINT,exchangerate:'0.21',ledgerdefaultcurrency:'JPY'};}
function harness(options){
  options=options||{};
  const s=memoryStorage(options.seed||{trip_snap_old:'x',trip_checks:'{"10/18_2":true}',v2_cache_itin:'{}',unrelated:'keep'});
  if(options.mode!==null)TripLifecycle.writeState(s,{mode:options.mode||'complete',archiveId:null});
  const calls={download:[],info:[],photos:0,snapshots:[]};
  const flow=TripSource.createConnectFlow({
    storage:s,lifecycle:TripLifecycle,
    download:function(pubBase){calls.download.push(pubBase);return options.download?options.download(pubBase):Promise.resolve({raw:{cfg:'x'}});},
    prepare:function(raw,sourceKey){
      if(options.prepare)return options.prepare(raw,sourceKey);
      return {db:{cfg:options.cfg||goodCfg(),trip:{days:[{date:'03/01',items:[{act:'a'},{act:'b'}]},{date:'03/02',items:[{act:'c'}]}]},ledger:[{recordType:'identity_registration',member:'Bar'}]},
        snapshot:{formatVersion:1,generationId:'g',sourceKey:sourceKey,sheets:{}}};
    },
    fetchInfo:function(endpoint){calls.info.push(endpoint);return options.info?options.info(endpoint):Promise.resolve({ok:true,tripId:'kyushu-2027',ledgerHeaderOk:true});},
    clearPhotos:function(){calls.photos++;return options.photos?options.photos():Promise.resolve();},
    writeSnapshot:function(snapshot){
      if(options.writeSnapshot)return options.writeSnapshot(snapshot);
      calls.snapshots.push(snapshot);s.setItem('trip_data_snapshot_state',JSON.stringify({formatVersion:1,active:snapshot,previous:null}));
    },
    members:function(db){return ['Bar'];},
    now:function(){return 42;}
  });
  return {storage:s,flow,calls};
}
function expectCode(promise,code,label){
  return promise.then(function(){assert.fail(label+' should fail with '+code);},function(error){assert.strictEqual(error.code,code,label+': '+error.message);});
}

(async function(){
  /* 成功：預覽 → 確認後清掉舊旅程資料、寫入快照與來源、狀態轉為進行中 */
  let h=harness();
  const candidate=await h.flow.inspect('https://docs.google.com/spreadsheets/d/e/'+PUB+'/pubhtml');
  assert.deepStrictEqual(h.calls.download,[TripSource.pubBaseFor(PUB)]);
  assert.deepStrictEqual(h.calls.info,[ENDPOINT]);
  assert.deepStrictEqual(candidate.preview,{tripName:'九州五日',startDate:'2027-03-01',endDate:'2027-03-05',dayCount:2,stopCount:3,days:[{date:'03/01',count:2},{date:'03/02',count:1}],members:['Bar']});
  assert.strictEqual(h.storage.getItem(TripSource.SOURCE_KEY),null,'inspect never writes');
  assert.strictEqual(TripLifecycle.readState(h.storage).mode,'complete');
  const result=await h.flow.commit(candidate);
  assert.strictEqual(result.sourceKey,'sheet:kyushu-2027');
  assert.strictEqual(TripLifecycle.readState(h.storage).mode,'active');
  assert.strictEqual(TripSource.readSource(h.storage).record.tripId,'kyushu-2027');
  assert.strictEqual(TripSource.readSource(h.storage).record.connectedAt,42);
  assert.strictEqual(h.storage.getItem('trip_checks'),null,'old trip progress is cleared before the new trip starts');
  assert.strictEqual(h.storage.getItem('v2_cache_itin'),null);
  assert.strictEqual(h.storage.getItem('unrelated'),'keep');
  assert.strictEqual(h.storage.getItem(TripSource.PENDING_KEY),null);
  assert.strictEqual(h.calls.photos,1,'old shopping photos are cleared too');
  assert.strictEqual(JSON.parse(h.storage.getItem('trip_data_snapshot_state')).active.sourceKey,'sheet:kyushu-2027');

  /* 只能在「已清除」或「尚未連接」時連接 */
  await expectCode(harness({mode:null}).flow.inspect(PUB),'NOT_INACTIVE','an active trip cannot connect');
  h=harness({mode:'unconnected'});
  await h.flow.commit(await h.flow.inspect(PUB));
  assert.strictEqual(TripLifecycle.readState(h.storage).mode,'active','an unconnected device can connect');

  /* 各種失敗都不改變手機 */
  await expectCode(harness().flow.inspect('https://docs.google.com/spreadsheets/d/abc123/edit'),'LINK_EDIT','edit link');
  await expectCode(harness().flow.inspect('hello'),'LINK_INVALID','garbage link');
  await expectCode(harness({download:function(){return Promise.reject(new Error('offline'));}}).flow.inspect(PUB),'DOWNLOAD','offline');
  await expectCode(harness({prepare:function(){const e=new Error('缺少欄位');e.stage='structure';throw e;}}).flow.inspect(PUB),'STRUCTURE','missing columns');
  await expectCode(harness({cfg:Object.assign(goodCfg(),{tripid:''})}).flow.inspect(PUB),'CFG_TRIP_ID','no Trip ID');
  await expectCode(harness({cfg:Object.assign(goodCfg(),{ledgerendpoint:'https://example.com/x'})}).flow.inspect(PUB),'CFG_ENDPOINT','bad endpoint');
  await expectCode(harness({cfg:Object.assign(goodCfg(),{startdate:'2027-03-05',enddate:'2027-03-01'})}).flow.inspect(PUB),'CFG_DATES','reversed dates');
  await expectCode(harness({cfg:Object.assign(goodCfg(),{ledgerdefaultcurrency:'USD'})}).flow.inspect(PUB),'CFG_CURRENCY','unsupported currency');
  await expectCode(harness({info:function(){return Promise.reject(new Error('blocked'));}}).flow.inspect(PUB),'INFO_FAILED','endpoint unreachable');
  await expectCode(harness({info:function(){return Promise.resolve({ok:true,tripId:'other-trip',ledgerHeaderOk:true});}}).flow.inspect(PUB),'INFO_MISMATCH','endpoint belongs to another Sheet');
  await expectCode(harness({info:function(){return Promise.resolve({ok:true,tripId:'kyushu-2027',ledgerHeaderOk:false});}}).flow.inspect(PUB),'LEDGER_HEADER','ledger header wrong');

  /* commit 中途失敗：回到原本狀態，不會半連接 */
  h=harness({writeSnapshot:function(){throw new Error('quota');}});
  const c2=await h.flow.inspect(PUB);
  await h.flow.commit(c2).then(function(){assert.fail('commit should fail');},function(error){assert.match(String(error.message),/quota/);});
  assert.strictEqual(TripLifecycle.readState(h.storage).mode,'complete','still inactive after a failed commit');
  assert.strictEqual(h.storage.getItem(TripSource.SOURCE_KEY),null);
  assert.strictEqual(h.storage.getItem(TripSource.PENDING_KEY),null);

  /* 開機復原：pending 標記 + 半成品 → 清掉半成品；已完成 → 只移除標記 */
  let s=memoryStorage();
  TripLifecycle.writeState(s,{mode:'complete',archiveId:null});
  s.setItem(TripSource.PENDING_KEY,JSON.stringify({tripId:'kyushu-2027',pubId:PUB,startedAt:1}));
  s.setItem(TripSource.SOURCE_KEY,JSON.stringify(sheetRecord));
  s.setItem('trip_data_snapshot_state',JSON.stringify({formatVersion:1,active:{sourceKey:'sheet:kyushu-2027'},previous:null}));
  assert.strictEqual(TripSource.recoverPendingConnect(s,TripLifecycle),'rolled-back');
  assert.strictEqual(s.getItem(TripSource.SOURCE_KEY),null);
  assert.strictEqual(s.getItem('trip_data_snapshot_state'),null);
  assert.strictEqual(s.getItem(TripSource.PENDING_KEY),null);
  assert.strictEqual(TripLifecycle.readState(s).mode,'complete');
  s=memoryStorage();
  s.setItem(TripSource.PENDING_KEY,JSON.stringify({tripId:'kyushu-2027',pubId:PUB,startedAt:1}));
  s.setItem(TripSource.SOURCE_KEY,JSON.stringify(sheetRecord));
  assert.strictEqual(TripSource.recoverPendingConnect(s,TripLifecycle),'completed','active with the matching source means the connect finished');
  assert.strictEqual(s.getItem(TripSource.PENDING_KEY),null);
  assert.strictEqual(TripSource.readSource(s).status,'ok');
  assert.strictEqual(TripSource.recoverPendingConnect(memoryStorage(),TripLifecycle),'none');

  /* 同時兩個操作：第二個被擋 */
  h=harness();
  const c3=await h.flow.inspect(PUB);
  h.storage.setItem('trip_lifecycle_lock',JSON.stringify({id:'other',expiresAt:Date.now()+60000}));
  await h.flow.commit(c3).then(function(){assert.fail('locked commit should fail');},function(error){assert.match(String(error.message),/locked/i);});
  assert.strictEqual(TripLifecycle.readState(h.storage).mode,'complete');

  console.log('trip source tests passed');
})().catch(function(error){console.error(error);process.exit(1);});
