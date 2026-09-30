const assert=require('assert');
const crypto=require('crypto');
const TripLifecycle=require('../trip-lifecycle.js');
const TripArchive=require('../trip-archive.js');
const TripLifecycleFlow=require('../trip-lifecycle-flow.js');

const sha256=function(text){return Promise.resolve(crypto.createHash('sha256').update(text,'utf8').digest('hex'));};
const archive={serialize:function(input){return TripArchive.serialize(input,sha256);},parseVerified:function(text){return TripArchive.parseVerified(text,sha256);}};
function storage(initial){
  const values=Object.assign({},initial);
  return {values:values,get length(){return Object.keys(values).length;},key:function(index){return Object.keys(values)[index]||null;},
    getItem:function(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem:function(key,value){values[key]=String(value);},removeItem:function(key){delete values[key];}};
}
function originalStorage(){return storage({
  trip_checks:'{"P1":true}',trip_next_stop_progress:'{"done":{"P1":true}}',trip_shop_wants:'{"S1":true}',
  trip_shopping_list:'[{"id":"buy-1"}]',trip_personal_ledger:'[{"id":"own-1"}]',
  trip_ledger_proxy_targets:'["Jane"]',trip_travel_notes:'[{"body":"sunny"}]',
  trip_member:'Bar',trip_theme_id:'peach',trip_ledger_queue:'[]',trip_ledger_snapshot:'locked-ledger',
  v2_cache_itin:'old-csv',unrelated:'keep'
});}
function safePolicy(){return {online:true,sheetsComplete:true,queueCount:0,bridgeCounts:{delivery:0,deletion:0,settings:0},formalBalances:{Bar:0,Jane:0},pendingClaims:0};}
function archiveInput(){
  const sheets={};
  ['itin','places','rest','shop','hotels','exp','cfg','ledger'].forEach(function(key){sheets[key]={csv:'header\n'+key,sourceTime:'2026-09-30T00:00:00Z'};});
  return {sourceSheetId:'sheet-1',trip:{name:'四國',startDate:'2026-10-18',endDate:'2026-10-23'},
    archivedAt:'2026-10-24T00:00:00Z',sheets:sheets,personal:{checks:{P1:true},nextStopProgress:{done:{P1:true}},
      wants:{S1:true},shoppingItems:[{id:'buy-1',photoId:'secret'}],personalLedger:[{id:'own-1'}],proxyTargets:['Jane'],
      ledgerCategories:[],ledgerPayMethods:[],shoppingUnits:[],travelNotes:[],member:'Bar',themeId:'peach'}};
}
function harness(overrides){
  overrides=overrides||{};
  const saved=originalStorage(),events=[];
  let clearFailure=false,uploaded='',complete=false,currentAccount={accountId:'person-1',email:'bar@example.com'};
  const photoStore={clearAll:function(){events.push('photos-clear');return clearFailure?Promise.reject(new Error('IDB_BLOCKED')):Promise.resolve();}};
  const drive={
    connect:function(){events.push('connect');return overrides.connectError?Promise.reject(new Error('OAUTH_CANCELLED')):Promise.resolve(currentAccount);},
    account:function(){return currentAccount;},
    upsertPrepared:function(id,text){events.push('upload');uploaded=text;return Promise.resolve('file-1');},
    readArchive:function(){events.push('readback');if(overrides.accountSwitch)currentAccount={accountId:'person-2',email:'other@example.com'};return Promise.resolve(overrides.readbackText||uploaded);},
    markComplete:function(){events.push('mark-complete');complete=true;return Promise.resolve('file-1');}
  };
  let preflightCalls=0,localCalls=0;
  const preflight=function(){
    events.push('preflight');preflightCalls++;
    const input={policyInput:safePolicy(),archiveInput:archiveInput(),digest:'same-digest'};
    if(overrides.firstPolicy&&preflightCalls===1)input.policyInput=overrides.firstPolicy;
    if(overrides.secondDigest&&preflightCalls===2)input.digest=overrides.secondDigest;
    if(overrides.secondQueue&&preflightCalls===2)input.policyInput.queueCount=1;
    return Promise.resolve(input);
  };
  const localPending=function(){
    localCalls++;events.push('local-pending');
    if(overrides.stealLock)saved.setItem('trip_lifecycle_lock','foreign');
    return overrides.localQueue?{queueCount:1,bridgeCounts:{delivery:0,deletion:0,settings:0}}:{queueCount:0,bridgeCounts:{delivery:0,deletion:0,settings:0}};
  };
  const flow=TripLifecycleFlow.create({storage:saved,photoStore:photoStore,preflight:preflight,archive:archive,drive:drive,
    localPending:localPending,newArchiveId:function(){return 'archive-1';}});
  return {flow:flow,storage:saved,events:events,drive:drive,setClearFailure:function(value){clearFailure=value;},
    setAccount:function(value){currentAccount=value;},getComplete:function(){return complete;},getUploaded:function(){return uploaded;},
    preflightCalls:function(){return preflightCalls;},localCalls:function(){return localCalls;}};
}

(async function(){
  const reset=harness();
  await reset.flow.reset();
  ['trip_checks','trip_next_stop_progress','trip_shop_wants','trip_shopping_list','trip_personal_ledger','trip_ledger_proxy_targets','trip_travel_notes'].forEach(function(key){
    assert.strictEqual(reset.storage.getItem(key),null,'reset removes '+key);
  });
  assert.strictEqual(reset.storage.getItem('trip_ledger_queue'),'[]','reset keeps pending shared queue');
  assert.strictEqual(reset.storage.getItem('trip_ledger_snapshot'),'locked-ledger','reset keeps locked/shared accounting');
  assert.strictEqual(reset.storage.getItem('trip_member'),'Bar','reset keeps member');
  assert.strictEqual(reset.storage.getItem('trip_theme_id'),'peach','reset keeps theme');
  assert.strictEqual(reset.storage.getItem('trip_lifecycle_state'),null,'reset does not end the trip');

  const resetFailed=harness();resetFailed.setClearFailure(true);
  await assert.rejects(resetFailed.flow.reset(),/IDB_BLOCKED/);
  assert.strictEqual(resetFailed.storage.getItem('trip_checks'),'{"P1":true}','photo failure does not claim or perform complete reset');

  const saved=harness();
  const savedResult=await saved.flow.end({saveArchive:true});
  assert.strictEqual(savedResult.archiveId,'archive-1');
  assert.deepStrictEqual(saved.events.slice(0,7),['connect','preflight','upload','readback','preflight','local-pending','mark-complete']);
  assert.strictEqual(saved.preflightCalls(),2,'fresh full preflight runs twice');
  assert.strictEqual(saved.localCalls(),2,'local pending data is rechecked before publishing and before clear');
  assert.strictEqual(saved.getComplete(),true);
  assert.strictEqual((await archive.parseVerified(saved.getUploaded())).archiveId,'archive-1');
  assert.deepStrictEqual(TripLifecycle.readState(saved.storage),{mode:'complete',archiveId:'archive-1'});
  assert.strictEqual(saved.storage.getItem('trip_member'),null,'end trip removes member identity');
  assert.strictEqual(saved.storage.getItem('trip_ledger_snapshot'),null,'end trip removes downloaded accounting');
  assert.strictEqual(saved.storage.getItem('v2_cache_itin'),null,'end trip removes legacy CSV cache');
  assert.strictEqual(saved.storage.getItem('unrelated'),'keep','end trip does not remove unrelated app data');

  const direct=harness();
  await direct.flow.end({saveArchive:false});
  assert.ok(!direct.events.includes('connect')&&!direct.events.includes('upload'),'explicit no-archive route never touches Drive');
  assert.strictEqual(direct.preflightCalls(),2);
  assert.deepStrictEqual(TripLifecycle.readState(direct.storage),{mode:'complete',archiveId:null});

  const stolen=harness({stealLock:true});
  await assert.rejects(stolen.flow.end({saveArchive:false}),/lock|concurrent|other tab/i);
  assert.deepStrictEqual(TripLifecycle.readState(stolen.storage),{mode:'active',archiveId:null},'a lost cross-tab lock cannot clear the trip');

  const wrongInput=archiveInput();wrongInput.archiveId='other-archive';
  const wrongValidArchive=await archive.serialize(wrongInput);

  for(const testCase of [
    ['unsafe preflight',{firstPolicy:Object.assign(safePolicy(),{queueCount:1})}],
    ['OAuth cancellation',{connectError:true}],
    ['changed digest',{secondDigest:'changed'}],
    ['new pending queue at second preflight',{secondQueue:true}],
    ['new pending queue just before clear',{localQueue:true}],
    ['wrong Drive readback',{readbackText:wrongValidArchive}],
    ['account switched after upload',{accountSwitch:true}]
  ]){
    const blocked=harness(testCase[1]);
    await assert.rejects(blocked.flow.end({saveArchive:true}),undefined,testCase[0]+' blocks ending');
    assert.deepStrictEqual(TripLifecycle.readState(blocked.storage),{mode:'active',archiveId:null},testCase[0]+' keeps trip active');
    assert.strictEqual(blocked.storage.getItem('trip_member'),'Bar',testCase[0]+' keeps identity');
    assert.ok(!blocked.events.includes('photos-clear'),testCase[0]+' never starts deletion');
    if(testCase[0]==='new pending queue just before clear')assert.strictEqual(blocked.getComplete(),false,'late queue blocks before publishing archive as complete');
  }

  const cleaning=harness();cleaning.setClearFailure(true);
  await assert.rejects(cleaning.flow.end({saveArchive:true}),/IDB_BLOCKED/);
  assert.deepStrictEqual(TripLifecycle.readState(cleaning.storage),{mode:'cleanup-pending',archiveId:'archive-1'});
  cleaning.setClearFailure(false);
  await cleaning.flow.resumeCleanup();
  assert.deepStrictEqual(TripLifecycle.readState(cleaning.storage),{mode:'complete',archiveId:'archive-1'});
  assert.strictEqual(cleaning.preflightCalls(),2,'cleanup retry does not re-fetch or re-upload');
  assert.strictEqual(cleaning.events.filter(function(item){return item==='upload';}).length,1);

  const concurrent=harness();
  let release;
  const pending=new Promise(function(resolve){release=resolve;});
  const waiting=TripLifecycleFlow.create({storage:concurrent.storage,photoStore:{clearAll:function(){return Promise.resolve();}},
    preflight:function(){return pending;},archive:archive,drive:concurrent.drive,localPending:function(){return {queueCount:0,bridgeCounts:{delivery:0,deletion:0,settings:0}};}});
  const first=waiting.end({saveArchive:false});
  await assert.rejects(waiting.end({saveArchive:false}),/progress|lock|busy/i,'repeated click cannot start a second clear');
  const otherTab=TripLifecycleFlow.create({storage:concurrent.storage,photoStore:{clearAll:function(){return Promise.resolve();}},
    preflight:function(){return pending;},archive:archive,drive:concurrent.drive,localPending:function(){return {queueCount:0,bridgeCounts:{delivery:0,deletion:0,settings:0}};}});
  await assert.rejects(otherTab.end({saveArchive:false}),/progress|lock|busy/i,'another tab sharing storage sees the lock');
  release({policyInput:Object.assign(safePolicy(),{queueCount:1}),archiveInput:archiveInput(),digest:'same-digest'});
  await assert.rejects(first);
  assert.deepStrictEqual(TripLifecycle.readState(concurrent.storage),{mode:'active',archiveId:null});

  console.log('trip lifecycle flow tests passed');
})().catch(function(error){console.error(error);process.exitCode=1;});
