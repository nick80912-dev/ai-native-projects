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

console.log('atomic sheet sync tests passed');
