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

console.log('atomic sheet sync tests passed');
