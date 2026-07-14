const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadValidator(){
  const sandbox = { console:{log:function(){},warn:function(){},error:function(){}}, AppLog:{data:function(){}} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('validator.js','utf8'), sandbox);
  return sandbox;
}

function schema(){
  return { sheets:{
    itin:{label:'Itinerary'},
    places:{label:'Places',columns:[{field:'type',values:{attraction:'attraction',ferry:'ferry'}}]},
    rest:{label:'Restaurants'}, shop:{label:'Shopping'}, hotels:{label:'Hotels'},
    exp:{label:'Expenses'}, cfg:{label:'TripConfig'}
  }};
}

function validRaw(){
  return {
    itin:'itin-data', places:'places-data', rest:'rest-data', shop:'shop-data',
    hotels:'hotels-data', exp:'expenses-data', cfg:'config-data'
  };
}

function validDb(){
  return {
    placeList:[{placeId:'P025',name:'Ferry Terminal',type:'ferry',tnorm:'ferry',web:'https://example.com'}],
    rest:[{restId:'R012',name:'Musashi',placeId:''}],
    shop:[], hotels:[], cfg:{tripname:'Trip',startdate:'2026-10-18',enddate:'2026-10-23',travelmode:'drive'},
    trip:{days:[{date:'10/18',items:[{act:'Dinner',place:'Musashi',ref:'R012'}]}]}
  };
}

const sb = loadValidator();
const standaloneSource = fs.readFileSync('validator.js','utf8').replace(/\r\n/g,'\n').trim();
const htmlSource = fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const validatorMarker = htmlSource.indexOf('/* ===== validator.js');
const embeddedStart = htmlSource.indexOf('/* ============================================================',validatorMarker+20);
const embeddedEnd = htmlSource.indexOf('\n\n</script>',embeddedStart);
assert.strictEqual(htmlSource.slice(embeddedStart,embeddedEnd).trim(),standaloneSource,'embedded validator stays in exact parity');

assert.deepStrictEqual(Array.from(sb.validateSnapshotData(validDb(),validRaw(),schema()).blockers), []);

const missing = validRaw(); delete missing.shop;
assert(sb.validateSnapshotData(validDb(),missing,schema()).blockers.some(function(f){return f.code==='SHEET_MISSING'&&f.sheet==='shop';}));

const duplicate = validDb(); duplicate.placeList.push({placeId:'P025',name:'Second place',type:'attraction',tnorm:'attraction'});
assert(sb.validateSnapshotData(duplicate,validRaw(),schema()).blockers.some(function(f){return f.code==='DUPLICATE_ID';}));

const mismatch = validDb(); mismatch.trip.days[0].items[0].ref='R013';
assert(sb.validateSnapshotData(mismatch,validRaw(),schema()).blockers.some(function(f){return f.code==='BROKEN_REF';}));

const unknown = validDb(); unknown.placeList[0].type='unknown';
assert(sb.validateSnapshotData(unknown,validRaw(),schema()).blockers.some(function(f){return f.code==='UNKNOWN_PLACE_TYPE';}));

const invalidCfg = validDb(); delete invalidCfg.cfg.startdate;
assert(sb.validateSnapshotData(invalidCfg,validRaw(),schema()).blockers.some(function(f){return f.code==='CFG_REQUIRED';}));

function hasFinding(result,code,sheet){
  return result.blockers.some(function(f){ return f.code===code&&f.sheet===sheet; });
}

const missingStructures = validDb();
delete missingStructures.placeList;
delete missingStructures.rest;
delete missingStructures.shop;
delete missingStructures.hotels;
delete missingStructures.trip;
delete missingStructures.cfg;
const missingStructureResult = sb.validateSnapshotData(missingStructures,validRaw(),schema());
['places','rest','shop','hotels','itin','cfg'].forEach(function(sheet){
  assert(hasFinding(missingStructureResult,'DB_STRUCTURE',sheet),'missing '+sheet+' structure is blocked');
});

const malformedStructures = validDb();
malformedStructures.placeList={};
malformedStructures.rest='restaurants';
malformedStructures.shop={length:1};
malformedStructures.hotels=true;
malformedStructures.trip={days:{}};
malformedStructures.cfg=[];
const malformedStructureResult = sb.validateSnapshotData(malformedStructures,validRaw(),schema());
['places','rest','shop','hotels','itin','cfg'].forEach(function(sheet){
  assert(hasFinding(malformedStructureResult,'DB_STRUCTURE',sheet),'non-array/non-object '+sheet+' structure is blocked');
});

const emptyDays = validDb(); emptyDays.trip.days=[];
assert(hasFinding(sb.validateSnapshotData(emptyDays,validRaw(),schema()),'DB_STRUCTURE','itin'),'empty trip days are blocked');

const malformedItems = validDb(); malformedItems.trip.days[0].items={};
assert(hasFinding(sb.validateSnapshotData(malformedItems,validRaw(),schema()),'DB_STRUCTURE','itin'),'non-array day items are blocked');

function validateWithoutThrow(db,message){
  var result=null;
  assert.doesNotThrow(function(){ result=sb.validateSnapshotData(db,validRaw(),schema()); },message);
  return result;
}

const malformedRows = validDb();
malformedRows.placeList=[null,7];
malformedRows.rest=[null,'restaurant'];
malformedRows.shop=[null,false];
malformedRows.hotels=[null,'hotel'];
const malformedRowResult = validateWithoutThrow(malformedRows,'malformed table rows do not throw');
['places','rest','shop','hotels'].forEach(function(sheet){
  assert(hasFinding(malformedRowResult,'DB_STRUCTURE',sheet),'malformed '+sheet+' rows are blocked');
});

const malformedDayRows = validDb(); malformedDayRows.trip.days=[null,'day'];
const malformedDayResult = validateWithoutThrow(malformedDayRows,'malformed trip day entries do not throw');
assert(hasFinding(malformedDayResult,'DB_STRUCTURE','itin'),'malformed trip day entries are blocked');

const malformedItemRows = validDb(); malformedItemRows.trip.days[0].items=[null,11];
const malformedItemResult = validateWithoutThrow(malformedItemRows,'malformed itinerary items do not throw');
assert(hasFinding(malformedItemResult,'DB_STRUCTURE','itin'),'malformed itinerary items are blocked');

const invalidDate = validDb(); invalidDate.cfg.startdate='2026-02-30';
assert(hasFinding(sb.validateSnapshotData(invalidDate,validRaw(),schema()),'CFG_DATE','cfg'),'invalid calendar dates are blocked');

const invalidDateFormat = validDb(); invalidDateFormat.cfg.enddate='10/23/2026';
assert(hasFinding(sb.validateSnapshotData(invalidDateFormat,validRaw(),schema()),'CFG_DATE','cfg'),'non-ISO dates are blocked');

const reversedDates = validDb(); reversedDates.cfg.startdate='2026-10-24'; reversedDates.cfg.enddate='2026-10-23';
assert(hasFinding(sb.validateSnapshotData(reversedDates,validRaw(),schema()),'CFG_DATE','cfg'),'reversed date ranges are blocked');

const unsupportedMode = validDb(); unsupportedMode.cfg.travelmode='bike';
assert(hasFinding(sb.validateSnapshotData(unsupportedMode,validRaw(),schema()),'CFG_TRAVELMODE','cfg'),'unsupported travel modes are blocked');

const finding = sb.makeValidationFinding('warning','CODE','sheet','message');
assert.deepStrictEqual(Object.keys(finding).sort(), ['code','level','message','sheet']);

const headerDef = {
  label:'Places',
  columns:[
    {field:'id',header:'ID',required:true},
    {field:'name',header:'Name',required:true}
  ]
};
const headerResult = sb.buildHeaderMap([['ID','Unexpected']],headerDef);
assert.deepStrictEqual(Object.keys(headerResult).sort(), ['blockers','headerIdx','map','warnings']);
assert(headerResult.blockers.some(function(f){return f.code==='HEADER_REQUIRED'&&f.sheet==='Places';}));
assert(headerResult.warnings.some(function(f){return f.code==='HEADER_UNKNOWN'&&f.sheet==='Places';}));
assert(sb.buildHeaderMap([],headerDef).blockers.some(function(f){return f.code==='HEADER_MISSING';}));

function extractFunction(name){
  const start=htmlSource.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=htmlSource.indexOf('{',start), depth=0;
  for(;index<htmlSource.length;index++){
    if(htmlSource[index]==='{') depth++;
    if(htmlSource[index]==='}') depth--;
    if(depth===0) return htmlSource.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}

assert.notStrictEqual(htmlSource.indexOf('function syncStatusModel('),-1,'syncStatusModel exists');
assert.notStrictEqual(htmlSource.indexOf('function openSyncStatus('),-1,'openSyncStatus exists');
assert.notStrictEqual(htmlSource.indexOf('function closeSyncStatus('),-1,'closeSyncStatus exists');
assert.notStrictEqual(htmlSource.indexOf('function renderSyncStatusBody('),-1,'renderSyncStatusBody exists');
assert.notStrictEqual(htmlSource.indexOf('function retrySyncFromPanel('),-1,'retrySyncFromPanel exists');
assert(/id="syncBtn" onclick="openSyncStatus\(\)"/.test(htmlSource),'header opens status panel');
assert(!/id="syncBtn" onclick="manualSyncNew\(\)"/.test(htmlSource),'header no longer syncs directly');
['同步中','已是最新','更新失敗','離線版','內建版'].forEach(function(label){
  assert(htmlSource.indexOf(label)>=0,'status UI contains '+label);
});
assert.strictEqual((htmlSource.match(/onclick="retrySyncFromPanel\(this\)"/g)||[]).length,1,'panel has exactly one retry button');
['APP build','資料來源','最後完整同步時間','最近失敗原因','驗證警告'].forEach(function(label){
  assert(htmlSource.indexOf(label)>=0,'panel contains '+label);
});

const app={SHEETS:[{key:'itin'},{key:'places'},{key:'rest'},{key:'shop'},{key:'hotels'},{key:'exp'},{key:'cfg'}]};
vm.createContext(app);
vm.runInContext([
  "var SNAPSHOT_STATE_KEY='trip_data_snapshot_state';var SNAPSHOT_FORMAT_VERSION=1;",
  extractFunction('createDataSnapshot'),
  extractFunction('validSnapshotShape'),
  extractFunction('readSnapshotState'),
  extractFunction('nextSnapshotState'),
  extractFunction('writeSnapshotState')
].join('\n'),app);

const rawA={itin:'itin-a',places:'places-a',rest:'rest-a',shop:'shop-a',hotels:'hotels-a',exp:'exp-a',cfg:'cfg-a'};
const rawB={itin:'itin-b',places:'places-b',rest:'rest-b',shop:'shop-b',hotels:'hotels-b',exp:'exp-b',cfg:'cfg-b'};
const active={formatVersion:1,generationId:'g1',createdAt:1,source:'online',sheets:rawA,sheetMeta:{},validation:{warnings:[]}};
const candidate={formatVersion:1,generationId:'g2',createdAt:2,source:'online',sheets:rawB,sheetMeta:{},validation:{warnings:[]}};

const created=app.createDataSnapshot(rawA,'online',1,'g1',{warnings:[{code:'WARN'}]});
assert.strictEqual(created.formatVersion,1);
assert.strictEqual(created.generationId,'g1');
assert.strictEqual(created.createdAt,1);
assert.strictEqual(created.source,'online');
assert.deepStrictEqual(Object.assign({},created.sheets),rawA);
assert.deepStrictEqual(Array.from(created.validation.warnings),[{code:'WARN'}]);

const next=app.nextSnapshotState({formatVersion:1,active:active,previous:null},candidate,active);
assert.strictEqual(next.active.generationId,'g2');
assert.strictEqual(next.previous.generationId,'g1');

const memory={};
const storage={
  getItem:function(key){return Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null;},
  setItem:function(key,value){memory[key]=String(value);}
};
assert.strictEqual(app.writeSnapshotState(storage,next),true);
assert.strictEqual(app.readSnapshotState(storage).active.generationId,'g2');

const old=JSON.stringify({formatVersion:1,active:active,previous:null});
memory.trip_data_snapshot_state=old;
const throwingStorage={getItem:storage.getItem,setItem:function(){throw new Error('quota');}};
assert.throws(function(){app.writeSnapshotState(throwingStorage,next);},/quota/);
assert.strictEqual(memory.trip_data_snapshot_state,old);

function readbackFailureStorage(prior,readback){
  const values={};
  if(prior!==null) values.trip_data_snapshot_state=prior;
  let reads=0;
  return {
    values:values,
    getItem:function(key){
      reads++;
      if(reads===1) return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;
      return readback;
    },
    setItem:function(key,value){values[key]=String(value);},
    removeItem:function(key){delete values[key];}
  };
}

const malformedReadback=readbackFailureStorage(old,'{malformed');
assert.throws(function(){app.writeSnapshotState(malformedReadback,next);},/Snapshot state verification failed/);
assert.strictEqual(malformedReadback.values.trip_data_snapshot_state,old,'malformed readback restores exact prior raw string');

const wrongGeneration=JSON.stringify({formatVersion:1,active:active,previous:null});
const wrongGenerationReadback=readbackFailureStorage(old,wrongGeneration);
assert.throws(function(){app.writeSnapshotState(wrongGenerationReadback,next);},/Snapshot state verification failed/);
assert.strictEqual(wrongGenerationReadback.values.trip_data_snapshot_state,old,'wrong generation restores exact prior raw string');

const missingSheetsReadback=JSON.stringify({
  formatVersion:1,
  active:{formatVersion:1,generationId:'g2',createdAt:2,source:'online',sheetMeta:{},validation:{warnings:[]}},
  previous:active
});
const sameGenerationMissingSheets=readbackFailureStorage(old,missingSheetsReadback);
assert.throws(function(){app.writeSnapshotState(sameGenerationMissingSheets,next);},/Snapshot state verification failed/);
assert.strictEqual(sameGenerationMissingSheets.values.trip_data_snapshot_state,old,'same-generation readback missing active sheets restores exact prior raw string');

const missingPreviousReadback=JSON.stringify({formatVersion:1,active:candidate,previous:null});
const sameGenerationMissingPrevious=readbackFailureStorage(null,missingPreviousReadback);
assert.throws(function(){app.writeSnapshotState(sameGenerationMissingPrevious,next);},/Snapshot state verification failed/);
assert.strictEqual(Object.prototype.hasOwnProperty.call(sameGenerationMissingPrevious.values,'trip_data_snapshot_state'),false,'same-generation readback missing previous removes failed candidate when no prior state existed');

const absentPrior=readbackFailureStorage(null,'{malformed');
assert.throws(function(){app.writeSnapshotState(absentPrior,next);},/Snapshot state verification failed/);
assert.strictEqual(Object.prototype.hasOwnProperty.call(absentPrior.values,'trip_data_snapshot_state'),false,'failed candidate is removed when no prior state existed');

let rollbackWrites=0;
const rollbackFailure={
  value:old,
  getItem:function(){return rollbackWrites===0?this.value:'{malformed';},
  setItem:function(key,value){rollbackWrites++; if(rollbackWrites===2) throw new Error('rollback quota'); this.value=String(value);},
  removeItem:function(){throw new Error('unexpected remove');}
};
let rollbackFailureError=null;
assert.throws(function(){
  try{ app.writeSnapshotState(rollbackFailure,next); }
  catch(e){ rollbackFailureError=e; throw e; }
},/Snapshot state verification failed; rollback failed/);
assert.strictEqual(rollbackFailureError.verificationError.message,'Snapshot state verification failed');
assert.strictEqual(rollbackFailureError.rollbackError.message,'rollback quota');

const existingDB={sentinel:'db'};
const existingRAW={sentinel:'raw'};
const dbApp={
  DB:existingDB,
  RAW:existingRAW,
  parseCSV:function(text){return [text];},
  buildItin:function(rows){return {rows:rows};},
  parseTable:function(text,key){return key==='places'?[{placeId:'p1',type:'museum'}]:[{text:text,key:key}];},
  normType:function(type){return 'normalized-'+type;},
  parseExpensesFree:function(rows){return {items:[rows[0]],members:['member']};},
  parseKeyValue:function(text,key){return {text:text,key:key};}
};
vm.createContext(dbApp);
vm.runInContext(extractFunction('createDB'),dbApp);
const pureDB=dbApp.createDB(rawA);
assert.notStrictEqual(pureDB,existingDB);
assert.strictEqual(dbApp.DB,existingDB);
assert.strictEqual(dbApp.RAW,existingRAW);
assert.strictEqual(rawA.itin,'itin-a');
assert.strictEqual(pureDB.trip.rows[0],'itin-a');
assert.strictEqual(pureDB.places.P1,pureDB.placeList[0]);
assert.strictEqual(pureDB.placeList[0].tnorm,'normalized-museum');
assert.deepStrictEqual(Array.from(pureDB.expCMS),['exp-a']);
assert.deepStrictEqual(Array.from(pureDB.expMembers),['member']);

function orchestrationSchema(){
  function table(label,idHeader,nameHeader){
    return {label:label,kind:'table',columns:[
      {field:'id',header:idHeader,required:true},
      {field:'name',header:nameHeader,required:true}
    ]};
  }
  return {sheets:{
    itin:{label:'Itinerary',kind:'itinerary',columns:[
      {field:'date',header:'Date'},{field:'time',header:'Time'},{field:'act',header:'Activity'},
      {field:'place',header:'Place'},{field:'ref',header:'ID'},{field:'move',header:'Move'},
      {field:'note',header:'Note'}
    ]},
    places:table('Places','PID','Place'), rest:table('Restaurants','RID','Restaurant'),
    shop:table('Shopping','SID','Brand'), hotels:table('Hotels','HID','Hotel'),
    exp:{label:'Expenses',kind:'freeform-expense'}, cfg:{label:'TripConfig',kind:'keyvalue'}
  }};
}

function orchestrationRaw(suffix){
  suffix=suffix||'old';
  return {
    itin:'Date,Time,Activity,Place,ID,Move,Note\n10/18,09:00,'+suffix+',Station,,,',
    places:'PID,Place\nP001,'+suffix+'-place',
    rest:'RID,Restaurant\nR001,'+suffix+'-rest',
    shop:'SID,Brand\nS001,'+suffix+'-shop',
    hotels:'HID,Hotel\nH001,'+suffix+'-hotel',
    exp:'Expense content '+suffix,
    cfg:'Key,Value\nTrip Name,'+(suffix==='blocked'?'BLOCK':suffix)+
      '\nStart Date,2026-10-18\nEnd Date,2026-10-23\nTravel Mode,Driving'
  };
}

function memoryStorage(initial){
  const memory=Object.assign({},initial||{});
  return {
    memory:memory,
    getItem:function(key){return Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null;},
    setItem:function(key,value){memory[key]=String(value);},
    removeItem:function(key){delete memory[key];}
  };
}

function snapshotFor(app,raw,generation,source){
  return app.createDataSnapshot(raw,source||'online',1,generation,{warnings:[]});
}

function loadCoordinator(){
  const storage=memoryStorage();
  const runtime={
    console:{log:function(){},warn:function(){},error:function(){}},
    Promise:Promise,
    Date:{now:function(){return 100;}},
    SHEETS:[{key:'itin'},{key:'places'},{key:'rest'},{key:'shop'},{key:'hotels'},{key:'exp'},{key:'cfg'}],
    SCHEMA:orchestrationSchema(),
    BUILTIN_TS:50,
    BUILTIN:orchestrationRaw('builtin'),
    localStorage:storage,
    RAW:{sentinel:'raw'}, DB:{sentinel:'db'}, SRC:{sentinel:'src'}, CURRENT_SNAPSHOT:null,
    renderCount:0, renderAll:function(){runtime.renderCount++;},
    renderSyncStatusBody:function(){},
    syncStates:[], setSyncState:function(state){runtime.syncStates.push(state);},
    toast:function(){},
    fetchSheet:function(){return Promise.reject(new Error('fetchSheet not configured'));},
    createDB:function(raw){return {raw:raw,identity:{}};},
    validateSnapshotData:function(db,raw){
      return String(raw.cfg).indexOf('BLOCK')>=0
        ? {blockers:[runtime.makeValidationFinding('blocker','CFG_REQUIRED','cfg','blocked config')],warnings:[]}
        : {blockers:[],warnings:[]};
    }
  };
  vm.createContext(runtime);
  runtime.parseCSV=vm.runInContext('('+extractFunction('parseCSV')+')',runtime);
  runtime.buildHeaderMap=sb.buildHeaderMap;
  runtime.makeValidationFinding=sb.makeValidationFinding;
  vm.runInContext([
    "var SNAPSHOT_STATE_KEY='trip_data_snapshot_state';var SNAPSHOT_FAILURE_KEY='trip_sync_last_failure';var SNAPSHOT_FORMAT_VERSION=1;",
    extractFunction('createDataSnapshot'), extractFunction('validSnapshotShape'),
    extractFunction('readSnapshotState'), extractFunction('nextSnapshotState'), extractFunction('writeSnapshotState'),
    extractFunction('validateCandidateStructure'), extractFunction('prepareSheetCandidate'),
    extractFunction('bootFailure'), extractFunction('selectBootData'), extractFunction('bootLocal'), extractFunction('saveSyncFailure'),
    extractFunction('downloadAllSheets'), 'var syncInFlight=null;', extractFunction('syncAll')
  ].join('\n'),runtime);
  return runtime;
}

function loadSyncStatus(){
  const storage=memoryStorage();
  const runtime={
    Promise:Promise,
    APP_BUILD:{channel:'DEV',code:'abc1234',date:'2026-07-13'},
    localStorage:storage,
    CURRENT_SNAPSHOT:null,
    syncInFlight:null,
    syncAll:function(){return Promise.resolve({ok:true});},
    escapeHtml:function(value){
      return (value==null?'':String(value)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },
    document:{getElementById:function(){return null;}}
  };
  vm.createContext(runtime);
  vm.runInContext([
    "var SNAPSHOT_FAILURE_KEY='trip_sync_last_failure';",
    extractFunction('timestampDate'), extractFunction('syncStatusModel'), extractFunction('renderSyncStatusBody'), extractFunction('retrySyncFromPanel')
  ].join('\n'),runtime);
  return runtime;
}

function attachSyncStatus(app){
  const body={innerHTML:''};
  const txt={textContent:''};
  const dot={className:'dot',classList:{add:function(){}}};
  const button={classList:{add:function(){},remove:function(){}}};
  app.Date=Date;
  app.APP_BUILD={channel:'DEV',code:'abc1234',date:'2026-07-13'};
  app.escapeHtml=function(value){
    return (value==null?'':String(value)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };
  app.document={getElementById:function(id){
    return {syncStatusBody:body,syncTxt:txt,syncDot:dot,syncBtn:button}[id]||null;
  }};
  vm.runInContext([
    extractFunction('timestampDate'), extractFunction('syncStatusModel'), extractFunction('renderSyncStatusBody'),
    extractFunction('setSyncState')
  ].join('\n'),app);
  return {body:body,txt:txt};
}

async function testSyncStatus(){
  const app=loadSyncStatus();
  const completedAt=new Date(2026,6,13,21,30,0,0).getTime();

  app.CURRENT_SNAPSHOT={source:'online',createdAt:completedAt,generationId:'sheet-online',validation:{warnings:[]}};
  let model=app.syncStatusModel();
  assert.strictEqual(model.state,'online');
  assert.strictEqual(model.label,'已是最新');
  assert.strictEqual(model.lastComplete,'2026/07/13 21:30');

  app.CURRENT_SNAPSHOT={source:'legacy-migrated',createdAt:completedAt,generationId:'legacy-one',validation:{warnings:[]}};
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'offline');
  assert.strictEqual(model.label,'離線版');

  app.CURRENT_SNAPSHOT={source:'builtin',createdAt:completedAt,generationId:'builtin-one',validation:{warnings:[]}};
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'builtin');
  assert.strictEqual(model.label,'內建版');
  assert.notStrictEqual(model.label,'已是最新');

  app.syncInFlight=Promise.resolve({ok:true});
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'syncing');
  assert.strictEqual(model.label,'同步中');

  app.syncInFlight=null;
  app.CURRENT_SNAPSHOT={source:'online',createdAt:completedAt,generationId:'sheet-prior',validation:{warnings:[{message:'欄位提示'}]}};
  const rejectedActiveAt=new Date(2026,6,13,22,45,0,0).getTime();
  app.localStorage.memory.trip_sync_last_failure=JSON.stringify({
    at:completedAt+1000,stage:'structure',sheet:'行程總表',code:'HEADER_REQUIRED',
    message:'PID,Place,Type\nP025,<script>raw CSV must stay private</script>',activeCreatedAt:rejectedActiveAt
  });
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'failed');
  assert.strictEqual(model.label,'更新失敗');
  assert.strictEqual(model.lastComplete,'2026/07/13 21:30','last complete uses the effective previous snapshot');
  assert(model.failure.indexOf('更新失敗，正在沿用 2026/07/13 21:30 的完整版本。')>=0);
  assert.strictEqual(model.failure.indexOf('2026/07/13 22:45'),-1,'failure copy never uses the rejected active timestamp');
  assert(model.failure.indexOf('Sheet: 行程總表')>=0,'failure identifies the failed Unicode sheet');
  assert(model.failure.indexOf('[HEADER_REQUIRED]')>=0,'failure identifies the structure finding');
  assert.strictEqual(model.failure.indexOf('P025'),-1,'failure excludes CSV content');
  assert.strictEqual(model.failure.indexOf('<script>'),-1,'failure excludes exception content');
  assert.deepStrictEqual(Array.from(model.warnings),['欄位提示']);

  app.localStorage.memory.trip_sync_last_failure=JSON.stringify({
    at:completedAt+1000,stage:'structure',sheet:'行程總表<img src=x onerror=alert(1)>',code:'HEADER_REQUIRED',
    message:'private structure details',activeCreatedAt:rejectedActiveAt
  });
  const renderedFailure=app.renderSyncStatusBody();
  assert(renderedFailure.indexOf('Sheet: 行程總表&lt;img src=x onerror=alert(1)&gt;')>=0,'rendered failure escapes unsafe Unicode sheet labels');
  assert.strictEqual(renderedFailure.indexOf('<img src=x onerror=alert(1)>'),-1,'rendered failure contains no executable sheet markup');

  let rendered=0, syncCalls=0;
  app.renderSyncStatusBody=function(){rendered++;};
  app.syncAll=function(){syncCalls++; return app.syncInFlight;};
  let resolveSync;
  app.syncInFlight=new Promise(function(resolve){resolveSync=resolve;});
  const button={disabled:false};
  const retry=app.retrySyncFromPanel(button);
  assert.strictEqual(button.disabled,true,'retry is disabled while sync is in flight');
  assert.strictEqual(syncCalls,1,'retry awaits the shared in-flight sync');
  resolveSync({ok:true});
  await retry;
  assert.strictEqual(rendered,1,'panel rerenders after retry finishes');
}

async function testBackgroundSyncStatusSettles(){
  const completedAt=new Date(2026,6,13,21,30,0,0).getTime();
  let app=loadCoordinator(), panel=attachSyncStatus(app);
  const oldRaw=orchestrationRaw('old');
  const oldSnapshot=snapshotFor(app,oldRaw,'g-old');
  oldSnapshot.createdAt=completedAt;
  app.RAW=oldRaw; app.DB={sentinel:'old-db'}; app.CURRENT_SNAPSHOT=oldSnapshot;
  app.localStorage.memory.trip_data_snapshot_state=JSON.stringify({formatVersion:1,active:oldSnapshot,previous:null});
  app.localStorage.memory.trip_sync_last_failure=JSON.stringify({stage:'download',sheet:'shop',activeCreatedAt:completedAt});
  let successResolves={};
  app.fetchSheet=function(sheet){return new Promise(function(resolve){successResolves[sheet.key]=resolve;});};
  app.renderSyncStatusBody();
  const successPending=app.syncAll(false);
  assert(/sync-status-retry[^>]*\sdisabled/.test(panel.body.innerHTML),'open panel disables retry during background success sync');
  app.SHEETS.forEach(function(sheet){successResolves[sheet.key](orchestrationRaw('fresh')[sheet.key]);});
  const success=await successPending;
  assert.strictEqual(success.ok,true);
  assert.strictEqual(app.syncStatusModel().state,'online','successful background sync settles as online');
  assert.strictEqual(app.syncStatusModel().failure,'','successful background sync clears failure');
  assert.strictEqual(panel.txt.textContent,'已是最新');
  assert(!/sync-status-retry[^>]*\sdisabled/.test(panel.body.innerHTML),'background success reenables panel retry');
  assert(panel.body.innerHTML.indexOf('更新失敗，正在沿用')<0,'background success rerenders away the old failure');

  app=loadCoordinator(); panel=attachSyncStatus(app);
  const retainedRaw=orchestrationRaw('retained');
  const retainedSnapshot=snapshotFor(app,retainedRaw,'g-retained');
  retainedSnapshot.createdAt=completedAt;
  app.RAW=retainedRaw; app.DB={sentinel:'retained-db'}; app.CURRENT_SNAPSHOT=retainedSnapshot;
  app.localStorage.memory.trip_data_snapshot_state=JSON.stringify({formatVersion:1,active:retainedSnapshot,previous:null});
  let failureResolves={}, rejectShop;
  app.fetchSheet=function(sheet){
    return new Promise(function(resolve,reject){
      failureResolves[sheet.key]=resolve;
      if(sheet.key==='shop') rejectShop=reject;
    });
  };
  app.renderSyncStatusBody();
  const failurePending=app.syncAll(false);
  assert(/sync-status-retry[^>]*\sdisabled/.test(panel.body.innerHTML),'open panel disables retry during background failed sync');
  rejectShop(new Error('offline'));
  app.SHEETS.forEach(function(sheet){if(sheet.key!=='shop') failureResolves[sheet.key](orchestrationRaw('next')[sheet.key]);});
  const failed=await failurePending;
  assert.strictEqual(failed.ok,false);
  assert.strictEqual(app.syncStatusModel().state,'failed','failed background sync settles as failed');
  assert.strictEqual(panel.txt.textContent,'更新失敗');
  assert(!/sync-status-retry[^>]*\sdisabled/.test(panel.body.innerHTML),'background failure reenables panel retry');
  assert(panel.body.innerHTML.indexOf('更新失敗，正在沿用 2026/07/13 21:30 的完整版本。')>=0,'background failure rerenders retained snapshot details');
}

async function testBootSelection(){
  const app=loadCoordinator();
  const active=snapshotFor(app,orchestrationRaw('active'),'g-active');
  const previous=snapshotFor(app,orchestrationRaw('previous'),'g-previous');
  let storage=memoryStorage({trip_data_snapshot_state:JSON.stringify({formatVersion:1,active:active,previous:previous})});
  let selected=app.selectBootData(storage,orchestrationRaw('builtin'));
  assert.strictEqual(selected.snapshot.generationId,'g-active','valid active wins');
  assert.strictEqual(selected.raw.itin,active.sheets.itin);

  const invalid=snapshotFor(app,orchestrationRaw('blocked'),'g-invalid');
  const priorState=JSON.stringify({formatVersion:1,active:invalid,previous:previous});
  storage=memoryStorage({trip_data_snapshot_state:priorState});
  selected=app.selectBootData(storage,orchestrationRaw('builtin'));
  assert.strictEqual(selected.snapshot.generationId,'g-previous','invalid active falls back to previous');
  assert.strictEqual(storage.memory.trip_data_snapshot_state,priorState,'fallback leaves corrupt state intact for diagnosis');

  app.localStorage=storage;
  app.BUILTIN=orchestrationRaw('builtin');
  assert.strictEqual(app.bootLocal(),true);
  assert.strictEqual(app.CURRENT_SNAPSHOT.generationId,'g-previous');
  app.fetchSheet=function(sheet){return Promise.resolve(orchestrationRaw('fresh')[sheet.key]);};
  const committed=await app.syncAll(false);
  assert.strictEqual(committed.ok,true);
  assert.strictEqual(JSON.parse(storage.memory.trip_data_snapshot_state).previous.generationId,'g-previous','effective fallback is retained as previous');

  storage=memoryStorage();
  const legacy=orchestrationRaw('legacy');
  app.SHEETS.forEach(function(sheet){storage.memory['v2_cache_'+sheet.key]=JSON.stringify({text:legacy[sheet.key],ts:80});});
  selected=app.selectBootData(storage,orchestrationRaw('builtin'));
  assert.strictEqual(selected.source,'legacy-migrated');
  assert.strictEqual(selected.snapshot.source,'legacy-migrated');
  assert.strictEqual(JSON.parse(storage.memory.trip_data_snapshot_state).active.source,'legacy-migrated');

  storage=memoryStorage();
  app.SHEETS.forEach(function(sheet){storage.memory['v2_cache_'+sheet.key]=JSON.stringify({text:legacy[sheet.key],ts:80});});
  storage.memory.v2_cache_cfg=JSON.stringify({text:orchestrationRaw('blocked').cfg,ts:80});
  selected=app.selectBootData(storage,orchestrationRaw('builtin'));
  assert.strictEqual(selected.source,'builtin','invalid legacy cache falls back to BUILTIN');
}

async function testAtomicSync(){
  const app=loadCoordinator();
  const oldRaw=orchestrationRaw('old');
  const oldSnapshot=snapshotFor(app,oldRaw,'g-old');
  const oldState=JSON.stringify({formatVersion:1,active:oldSnapshot,previous:null});
  app.localStorage.memory.trip_data_snapshot_state=oldState;
  app.RAW=oldRaw; app.DB={sentinel:'old-db'}; app.CURRENT_SNAPSHOT=oldSnapshot;

  let calls=0, resolves={};
  app.fetchSheet=function(sheet){
    calls++;
    return new Promise(function(resolve){resolves[sheet.key]=resolve;});
  };
  const p1=app.syncAll(false), p2=app.syncAll(false);
  assert.strictEqual(p1,p2,'concurrent sync calls share one in-flight Promise');
  assert.strictEqual(calls,7,'all seven fetches start once');
  const fresh=orchestrationRaw('fresh');
  app.SHEETS.forEach(function(sheet){resolves[sheet.key](fresh[sheet.key]);});
  const result=await p1;
  assert.strictEqual(result.ok,true);
  assert.strictEqual(result.generationId,'sheet-100');
  assert.strictEqual(app.renderCount,1);
  assert.strictEqual(app.RAW.itin,fresh.itin);
  assert.strictEqual(JSON.parse(app.localStorage.memory.trip_data_snapshot_state).active.sheets.itin,fresh.itin);
  app.SHEETS.forEach(function(sheet){assert.strictEqual(app.localStorage.memory['v2_cache_'+sheet.key],undefined,'online sync never writes legacy cache');});

  const priorRaw=app.RAW, priorDB=app.DB;
  const priorState=app.localStorage.memory.trip_data_snapshot_state;
  app.renderCount=0;
  app.fetchSheet=function(sheet){return sheet.key==='shop'?Promise.reject(new Error('offline')):Promise.resolve(orchestrationRaw('next')[sheet.key]);};
  const failedDownload=await app.syncAll(false);
  assert.strictEqual(failedDownload.ok,false);
  assert.strictEqual(failedDownload.error.stage,'download');
  assert.strictEqual(failedDownload.error.sheet,'shop');
  assert.strictEqual(app.RAW,priorRaw); assert.strictEqual(app.DB,priorDB);
  assert.strictEqual(app.localStorage.memory.trip_data_snapshot_state,priorState);
  assert.strictEqual(app.renderCount,0);

  app.fetchSheet=function(sheet){return Promise.resolve(orchestrationRaw('blocked')[sheet.key]);};
  const failedValidation=await app.syncAll(false);
  assert.strictEqual(failedValidation.ok,false);
  assert.strictEqual(failedValidation.error.stage,'validation');
  assert.strictEqual(app.RAW,priorRaw); assert.strictEqual(app.DB,priorDB);
  assert.strictEqual(app.localStorage.memory.trip_data_snapshot_state,priorState);
  assert.strictEqual(app.renderCount,0);

  app.fetchSheet=function(sheet){return Promise.resolve(orchestrationRaw('next')[sheet.key]);};
  app.localStorage.setItem=function(key,value){
    if(key==='trip_data_snapshot_state') throw new Error('quota');
    this.memory[key]=String(value);
  };
  const failedStorage=await app.syncAll(false);
  assert.strictEqual(failedStorage.ok,false);
  assert.strictEqual(app.RAW,priorRaw); assert.strictEqual(app.DB,priorDB);
  assert.strictEqual(app.localStorage.memory.trip_data_snapshot_state,priorState);
  assert.strictEqual(app.renderCount,0);
}

Promise.resolve().then(testBootSelection).then(testAtomicSync).then(testSyncStatus).then(testBackgroundSyncStatusSettles).then(function(){
  console.log('atomic sheet sync tests passed');
}).catch(function(error){
  console.error(error&&error.stack||error);
  process.exitCode=1;
});
