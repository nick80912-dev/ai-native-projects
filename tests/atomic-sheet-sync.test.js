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
    places:{label:'Places',kind:'table',idField:'placeId',columns:[
      {field:'placeId',header:'PID',required:true},
      {field:'name',header:'Place Name',required:true},
      {field:'type',header:'Type',required:true,values:{attraction:'attraction',ferry:'ferry'}}
    ]},
    rest:{label:'Restaurants',kind:'table',idField:'restId',columns:[
      {field:'restId',header:'RID',required:true},
      {field:'name',header:'Restaurant Name',required:true}
    ]},
    shop:{label:'Shopping',kind:'table',idField:'shopId',columns:[
      {field:'shopId',header:'SID',required:true},
      {field:'placeId',header:'PID',required:true},
      {field:'name',header:'Shop Name',required:true},
      {field:'floor',header:'Floor',required:true}
    ]},
    hotels:{label:'Hotels',kind:'table',idField:'hotelId',columns:[
      {field:'hotelId',header:'HID',required:true},
      {field:'name',header:'Hotel Name',required:true}
    ]},
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
    shop:[], hotels:[], cfg:{tripname:'Trip',startdate:'2026-10-18',enddate:'2026-10-23',travelmode:'drive',exchangeRate:'0.2',ledgerDefaultCurrency:'JPY'},
    trip:{days:[{date:'10/18',items:[{act:'Dinner',place:'Musashi',ref:'R012'}]}]}
  };
}

const sb = loadValidator();
const standaloneSource = fs.readFileSync('validator.js','utf8').replace(/\r\n/g,'\n').trim();
const htmlSource = fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const schemaSandbox = {};
vm.createContext(schemaSandbox);
vm.runInContext(fs.readFileSync('schema.js','utf8'),schemaSandbox);
assert.strictEqual(schemaSandbox.SCHEMA.version,'2.7 (2026-07-19)','production Schema version identifies the Ledger 2.1 contract');
assert.strictEqual(schemaSandbox.SCHEMA.sheets.ledger.columns.length,16,'Ledger 2.1 keeps the fixed 16-column append contract');
assert.strictEqual(schemaSandbox.SCHEMA.sheets.ledger.columns[14].field,'storeName');
assert.strictEqual(schemaSandbox.SCHEMA.sheets.ledger.columns[15].field,'replacesRecordId');
const cfgKeys=schemaSandbox.SCHEMA.sheets.cfg.keys;
assert(cfgKeys.some(function(key){return key.field==='exchangeRate'&&key.header==='Exchange Rate';}),'production Schema defines Exchange Rate');
assert(cfgKeys.some(function(key){return key.field==='ledgerDefaultCurrency'&&key.header==='Ledger Default Currency';}),'production Schema defines Ledger Default Currency');
const itineraryActColumn = schemaSandbox.SCHEMA.sheets.itin.columns.find(function(column){ return column.field==='act'; });
assert.strictEqual(itineraryActColumn.header,'行程','production Schema uses the confirmed itinerary Header');
assert.strictEqual((itineraryActColumn.aliases||[]).indexOf('詳細行程'),-1,'obsolete Header is not retained as an alias');
assert.match(htmlSource,/version:\s*'2\.7 \(2026-07-19\)'/,'inline fallback Schema version identifies the Ledger 2.1 contract');
assert(htmlSource.includes('Exchange Rate,0.2'),'BUILTIN TripConfig contains the initial exchange rate');
assert(htmlSource.includes('Ledger Default Currency,JPY'),'BUILTIN TripConfig contains the initial ledger currency');
assert.match(htmlSource,/field:'act',\s*header:'行程'/,'inline fallback Schema uses the confirmed itinerary Header');
assert(htmlSource.includes('日期,時間,行程,地點,ID,交通,備註'),'BUILTIN itinerary CSV uses the confirmed Header');
const validatorMarker = htmlSource.indexOf('/* ===== validator.js');
const embeddedStart = htmlSource.indexOf('/* ============================================================',validatorMarker+20);
const embeddedEnd = htmlSource.indexOf('\n\n</script>',embeddedStart);
assert.strictEqual(htmlSource.slice(embeddedStart,embeddedEnd).trim(),standaloneSource,'embedded validator stays in exact parity');

assert.deepStrictEqual(Array.from(sb.validateSnapshotData(validDb(),validRaw(),schema()).blockers), []);

const optionalWebsite = validDb();
optionalWebsite.placeList[0].web = '';
const optionalWebsiteResult = sb.validateSnapshotData(optionalWebsite,validRaw(),schema());
assert.strictEqual(
  optionalWebsiteResult.warnings.some(function(f){ return f.code==='OPTIONAL_EMPTY'; }),
  false,
  'blank optional website does not create a validation warning'
);

[
  {sheet:'places',list:'placeList',id:'placeId',field:'placeId',header:'PID',row:{placeId:'   ',name:'Place',type:'attraction'}},
  {sheet:'places',list:'placeList',id:'placeId',field:'name',header:'Place Name',row:{placeId:'P101',name:' ',type:'attraction'}},
  {sheet:'places',list:'placeList',id:'placeId',field:'type',header:'Type',row:{placeId:'P102',name:'Place',type:''}},
  {sheet:'rest',list:'rest',id:'restId',field:'restId',header:'RID',row:{restId:'',name:'Restaurant'}},
  {sheet:'rest',list:'rest',id:'restId',field:'name',header:'Restaurant Name',row:{restId:'R101',name:'\t'}},
  {sheet:'shop',list:'shop',id:'shopId',field:'shopId',header:'SID',row:{shopId:' ',placeId:'P025',name:'Shop',floor:'1F'}},
  {sheet:'shop',list:'shop',id:'shopId',field:'placeId',header:'PID',row:{shopId:'S101',placeId:'',name:'Shop',floor:'1F'}},
  {sheet:'shop',list:'shop',id:'shopId',field:'name',header:'Shop Name',row:{shopId:'S102',placeId:'P025',name:'',floor:'1F'}},
  {sheet:'shop',list:'shop',id:'shopId',field:'floor',header:'Floor',row:{shopId:'S103',placeId:'P025',name:'Shop',floor:'  '}},
  {sheet:'hotels',list:'hotels',id:'hotelId',field:'hotelId',header:'HID',row:{hotelId:'',name:'Hotel'}},
  {sheet:'hotels',list:'hotels',id:'hotelId',field:'name',header:'Hotel Name',row:{hotelId:'H101',name:''}}
].forEach(function(testCase){
  const candidate=validDb();
  candidate[testCase.list]=[testCase.row];
  const candidateResult=sb.validateSnapshotData(candidate,validRaw(),schema());
  const required=candidateResult.blockers.filter(function(f){
    return f.code==='REQUIRED_VALUE'&&f.sheet===testCase.sheet;
  });
  assert.strictEqual(required.length,1,testCase.sheet+' '+testCase.field+' has one required-value blocker');
  assert(required[0].message.indexOf(schema().sheets[testCase.sheet].label)>=0,'message includes the schema Sheet label');
  assert(required[0].message.indexOf(testCase.field)>=0,'message includes the schema field');
  assert(required[0].message.indexOf(testCase.header)>=0,'message includes the schema header');
  const identity=String(testCase.row[testCase.id]||'').trim()||'row 1';
  assert(required[0].message.indexOf(identity)>=0,'message includes the row identity or index');
  assert(required[0].message.length<=160,'required-value message stays bounded');
  if(testCase.sheet==='places'&&testCase.field==='type'){
    assert.strictEqual(hasFinding(candidateResult,'UNKNOWN_PLACE_TYPE','places'),false,'blank required type does not add unknown-type blocker noise');
  }
});

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

[0,-1,'not-a-number'].forEach(function(value){
  const invalidRate=validDb(); invalidRate.cfg.exchangeRate=value;
  assert(hasFinding(sb.validateSnapshotData(invalidRate,validRaw(),schema()),'CFG_EXCHANGE_RATE','cfg'),'invalid exchange rate is blocked: '+value);
});

const invalidLedgerCurrency=validDb(); invalidLedgerCurrency.cfg.ledgerDefaultCurrency='USD';
assert(hasFinding(sb.validateSnapshotData(invalidLedgerCurrency,validRaw(),schema()),'CFG_LEDGER_CURRENCY','cfg'),'unsupported ledger currency is blocked');

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

const itineraryHeaderDef = {
  label:'行程總表',
  columns:[{field:'act',header:'行程',required:true}]
};
const acceptedItineraryHeader = sb.buildHeaderMap([['行程']],itineraryHeaderDef);
assert.strictEqual(acceptedItineraryHeader.map.act,0,'行程 maps to act');
assert.strictEqual(acceptedItineraryHeader.blockers.length,0,'行程 satisfies the required Header');
const obsoleteItineraryHeader = sb.buildHeaderMap([['詳細行程']],itineraryHeaderDef);
assert.strictEqual(Object.prototype.hasOwnProperty.call(obsoleteItineraryHeader.map,'act'),false,'詳細行程 no longer maps to act');
assert(obsoleteItineraryHeader.blockers.some(function(f){
  return f.code==='HEADER_MISSING'||f.code==='HEADER_REQUIRED';
}),'詳細行程 is blocked by the new contract');

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
const syncStatusBodySource=extractFunction('renderSyncStatusBody');
['同步中','同步正常','更新失敗','離線資料','內建資料'].forEach(function(label){
  assert(htmlSource.indexOf(label)>=0,'status UI contains '+label);
});
assert.strictEqual((htmlSource.match(/onclick="retrySyncFromPanel\(this\)"/g)||[]).length,1,'panel has exactly one retry button');
['同步正常','最後完整同步','Schema','資料版本'].forEach(function(label){
  assert(syncStatusBodySource.indexOf(label)>=0,'simple status UI contains '+label);
});
['APP build','資料來源','最近失敗原因','驗證警告'].forEach(function(label){
  assert.strictEqual(syncStatusBodySource.indexOf(label),-1,'simple status UI omits '+label);
});
const syncStatusOverlayRules=Array.from(htmlSource.matchAll(/\.sync-status-overlay\s*\{([^}]*)\}/g),function(match){
  return match[1];
});
assert(syncStatusOverlayRules.length>=1,'sync status overlay has a CSS rule');
assert.match(
  syncStatusOverlayRules[0],
  /align-items\s*:\s*center[^;]*;[^}]*justify-content\s*:\s*center/,
  'main sync status overlay rule is horizontally and vertically centered'
);
syncStatusOverlayRules.forEach(function(rule,index){
  Array.from(rule.matchAll(/align-items\s*:\s*([^;}]+)/g)).forEach(function(declaration){
    assert.strictEqual(declaration[1].trim(),'center','sync status overlay rule '+(index+1)+' does not override vertical centering');
  });
  Array.from(rule.matchAll(/justify-content\s*:\s*([^;}]+)/g)).forEach(function(declaration){
    assert.strictEqual(declaration[1].trim(),'center','sync status overlay rule '+(index+1)+' does not override horizontal centering');
  });
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
    SCHEMA:{version:'2.3 (2026-07-16)'},
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
    extractFunction('timestampDate'), extractFunction('syncStatusModel'), extractFunction('renderSyncStatusBody'), extractFunction('setButtonBusy'), extractFunction('retrySyncFromPanel')
  ].join('\n'),runtime);
  return runtime;
}

function attachSyncStatus(app){
  const body={innerHTML:''};
  const txt={textContent:''};
  const dot={className:'dot',classList:{add:function(){}}};
  const button={classList:{add:function(){},remove:function(){}}};
  app.Date=Date;
  app.SCHEMA.version='2.3 (2026-07-16)';
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

  const savingApp=loadCoordinator();
  const structuredError=new Error('PID,Place,Type\nP025,<script>raw CSV must stay private</script>');
  structuredError.stage='structure';
  structuredError.findings=[{
    code:'HEADER_REQUIRED',sheet:'行程總表',
    message:'行程總表 缺少必要欄位「交通」\n<img src=x onerror=alert(1)> '+new Array(220).join('私')
  }];
  savingApp.saveSyncFailure(structuredError,savingApp.localStorage,{createdAt:completedAt});
  const structuredSerialized=savingApp.localStorage.memory.trip_sync_last_failure;
  const structuredRecord=JSON.parse(structuredSerialized);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(structuredRecord,'message'),false,'failure storage excludes arbitrary error.message');
  assert.strictEqual(structuredSerialized.indexOf('P025'),-1,'serialized failure excludes raw CSV rows');
  assert.strictEqual(structuredSerialized.indexOf('raw CSV must stay private'),-1,'serialized failure excludes private exception markup');
  assert.strictEqual(structuredRecord.stage,'structure');
  assert.strictEqual(structuredRecord.sheet,'行程總表');
  assert.strictEqual(structuredRecord.code,'HEADER_REQUIRED');
  assert(structuredRecord.reason.indexOf('交通')>=0,'structured reason identifies the missing field');
  assert.strictEqual(/[\r\n\t]/.test(structuredRecord.reason),false,'structured reason is single-line');
  assert(structuredRecord.reason.length<=160,'structured reason is bounded');

  app.CURRENT_SNAPSHOT={source:'online',createdAt:completedAt,generationId:'sheet-prior',validation:{warnings:[]}};
  app.localStorage.memory.trip_sync_last_failure=structuredSerialized;
  let structuredModel=app.syncStatusModel();
  assert(structuredModel.failure.indexOf('交通')>=0,'safe structured reason is visible in panel copy');
  const structuredHtml=app.renderSyncStatusBody();
  assert(structuredHtml.indexOf('&lt;img src=x onerror=alert(1)&gt;')>=0,'unsafe finding text is escaped in rendered HTML');
  assert.strictEqual(structuredHtml.indexOf('<img src=x onerror=alert(1)>'),-1,'unsafe finding markup is never rendered raw');

  const downloadError=new Error('private download exception\nSID,PID,Secret\nS001,P025,token');
  downloadError.stage='download'; downloadError.sheet='shop';
  savingApp.saveSyncFailure(downloadError,savingApp.localStorage,{createdAt:completedAt});
  const downloadSerialized=savingApp.localStorage.memory.trip_sync_last_failure;
  const downloadRecord=JSON.parse(downloadSerialized);
  assert.strictEqual(downloadSerialized.indexOf('private download exception'),-1,'download exception text is not persisted');
  assert.strictEqual(downloadSerialized.indexOf('S001'),-1,'download CSV is not persisted');
  assert.strictEqual(downloadRecord.reason,'無法下載工作表資料','download failure uses an allowlisted reason');
  app.localStorage.memory.trip_sync_last_failure=downloadSerialized;
  structuredModel=app.syncStatusModel();
  assert(structuredModel.failure.indexOf('無法下載工作表資料')>=0,'allowlisted download reason is visible');
  assert.strictEqual(structuredModel.failure.indexOf('private download exception'),-1,'download exception text is not displayed');

  app.localStorage.memory.trip_sync_last_failure=JSON.stringify({
    at:completedAt+1000,stage:'download',sheet:'shop',message:'legacy private\nCSV,P025,<script>legacy</script>',activeCreatedAt:completedAt
  });
  structuredModel=app.syncStatusModel();
  assert.strictEqual(structuredModel.failure.indexOf('legacy private'),-1,'legacy failure message is ignored');
  assert.strictEqual(structuredModel.failure.indexOf('P025'),-1,'legacy CSV message is ignored');
  delete app.localStorage.memory.trip_sync_last_failure;

  app.CURRENT_SNAPSHOT={source:'online',createdAt:completedAt,generationId:'sheet-online',validation:{warnings:[]}};
  let model=app.syncStatusModel();
  assert.strictEqual(model.state,'online');
  assert.strictEqual(model.label,'同步正常');
  assert.strictEqual(model.lastComplete,'2026/07/13 21:30');
  assert.strictEqual(model.schemaVersion,'2.3 (2026-07-16)');
  assert.strictEqual(model.generationId,'sheet-online');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(model,'source'),false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(model,'warnings'),false);

  const healthyHtml=app.renderSyncStatusBody();
  assert(healthyHtml.includes('sync-status-icon'));
  assert(healthyHtml.includes('✓'));
  assert(healthyHtml.includes('同步正常'));
  assert(healthyHtml.includes('最後完整同步'));
  assert(healthyHtml.includes('Schema 2.3 (2026-07-16)'));
  assert(healthyHtml.includes('資料版本 sheet-online'));
  assert.strictEqual(healthyHtml.indexOf('APP build'),-1);
  assert.strictEqual(healthyHtml.indexOf('驗證警告'),-1);
  assert.strictEqual(healthyHtml.indexOf('未同步 Sheet'),-1);
  assert.strictEqual(healthyHtml.indexOf('最近失敗原因'),-1);
  assert.strictEqual(/sync-status-(?:alert|failure)/.test(healthyHtml),false,'healthy markup has no failure alert or empty failure row');

  app.CURRENT_SNAPSHOT={source:'legacy-migrated',createdAt:completedAt,generationId:'legacy-one',validation:{warnings:[]}};
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'offline');
  assert.strictEqual(model.label,'離線資料');

  app.CURRENT_SNAPSHOT={source:'builtin',createdAt:completedAt,generationId:'builtin-one',validation:{warnings:[]}};
  model=app.syncStatusModel();
  assert.strictEqual(model.state,'builtin');
  assert.strictEqual(model.label,'內建資料');
  assert.notStrictEqual(model.label,'同步正常');

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
  assert.strictEqual(model.failure.indexOf('2026/07/13 22:45'),-1,'failure copy never uses the rejected active timestamp');
  assert(model.failure.indexOf('[HEADER_REQUIRED]')>=0,'failure identifies the structure finding');
  assert.strictEqual(model.failure.indexOf('P025'),-1,'failure excludes CSV content');
  assert.strictEqual(model.failure.indexOf('<script>'),-1,'failure excludes exception content');
  assert.strictEqual(model.failedSheet,'行程總表');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(model,'warnings'),false);

  const persistedUnsafeReason='<svg onload=alert(2)>\n'+new Array(220).join('危')+'SHOULD_NOT_SURVIVE';
  const normalizedUnsafeReason=persistedUnsafeReason.replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
  const boundedUnsafeReason=normalizedUnsafeReason.slice(0,159)+'…';
  app.localStorage.memory.trip_sync_last_failure=JSON.stringify({
    at:completedAt+1000,stage:'structure',sheet:'行程總表<img src=x onerror=alert(1)>',code:'HEADER_REQUIRED',
    reason:persistedUnsafeReason,activeCreatedAt:rejectedActiveAt
  });
  model=app.syncStatusModel();
  const modelReason=model.failure.slice(model.failure.lastIndexOf('：')+1);
  assert.strictEqual(modelReason,boundedUnsafeReason,'persisted failure reason is bounded to 160 characters by syncStatusModel');
  assert.strictEqual(modelReason.length,160,'bounded failure reason has the expected maximum length');
  assert.strictEqual(/[\r\n\t]/.test(model.failure),false,'persisted failure reason is normalized to one line by syncStatusModel');
  assert.strictEqual(model.failure.indexOf('SHOULD_NOT_SURVIVE'),-1,'persisted failure reason drops content beyond the safe bound');
  const renderedFailure=app.renderSyncStatusBody();
  assert(renderedFailure.includes('未同步 Sheet'));
  assert(renderedFailure.includes('行程總表&lt;img src=x onerror=alert(1)&gt;'));
  assert(renderedFailure.includes('HEADER_REQUIRED'));
  assert(renderedFailure.includes('&lt;svg onload=alert(2)&gt;'));
  assert.strictEqual(renderedFailure.indexOf('<img src=x onerror=alert(1)>'),-1,'rendered failure contains no executable sheet markup');
  assert.strictEqual(renderedFailure.indexOf('<svg onload=alert(2)>'),-1,'rendered failure contains no executable reason markup');

  let rendered=0, syncCalls=0;
  app.renderSyncStatusBody=function(){rendered++;};
  app.syncAll=function(){syncCalls++; return app.syncInFlight;};
  let resolveSync;
  app.syncInFlight=new Promise(function(resolve){resolveSync=resolve;});
  const attrs={};
  const button={disabled:false,textContent:'立即重新同步',innerHTML:'',setAttribute(name,value){attrs[name]=String(value);},getAttribute(name){return Object.prototype.hasOwnProperty.call(attrs,name)?attrs[name]:null;},removeAttribute(name){delete attrs[name];}};
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
  assert.strictEqual(panel.txt.textContent,'已同步');
  assert(!/sync-status-retry[^>]*\sdisabled/.test(panel.body.innerHTML),'background success reenables panel retry');
  assert(panel.body.innerHTML.indexOf('未同步 Sheet')<0,'background success rerenders away the old failure');

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
  assert(panel.body.innerHTML.indexOf('最後完整同步 2026/07/13 21:30')>=0,'background failure renders retained snapshot time');
  assert(panel.body.innerHTML.indexOf('未同步 Sheet')>=0,'background failure renders the failed Sheet');
  assert(panel.body.innerHTML.indexOf('shop')>=0,'background failure identifies the failed Sheet');
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
