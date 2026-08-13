const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const indexSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
const builtinAssetSource=fs.readFileSync(path.join(root,'builtin-snapshot.js'),'utf8');
const schemaSource=fs.readFileSync(path.join(root,'schema.js'),'utf8');
const validatorSource=fs.readFileSync(path.join(root,'validator.js'),'utf8');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,'missing runtime function '+name);
  const brace=source.indexOf('{',start);
  let depth=0;
  let quote='';
  let escaped=false;
  for(let index=brace;index<source.length;index+=1){
    const char=source[index];
    if(quote){
      if(escaped)escaped=false;
      else if(char==='\\')escaped=true;
      else if(char===quote)quote='';
      continue;
    }
    if(char==='\''||char==='"'||char==='`'){
      quote=char;
      continue;
    }
    if(char==='{')depth+=1;
    if(char==='}'&&--depth===0)return source.slice(start,index+1);
  }
  throw new Error('unterminated runtime function '+name);
}

function readEffectiveBuiltin(){
  const match=builtinAssetSource.match(/var BUILTIN_TS=\d+;\s*var BUILTIN_ASSET_VERSION='v\d+';\s*var BUILTIN=\{[\s\S]*?\};/);
  assert(match,'missing generated BUILTIN asset block');
  const sandbox={};
  vm.runInNewContext(match[0],sandbox,{filename:'builtin-snapshot.js'});
  return JSON.parse(JSON.stringify(sandbox.BUILTIN));
}

function loadRuntimeDb(raw){
  const sandbox={
    console,
    AppLog:{schema:function(){},data:function(){}},
    parseLedgerSheetCsv:function(){return [];}
  };
  vm.runInNewContext(schemaSource,sandbox,{filename:'schema.js'});
  vm.runInNewContext(validatorSource,sandbox,{filename:'validator.js'});
  const names=['parseCSV','parseTable','parseKeyValue','schemaType','buildItin','parseExpensesFree','createDB'];
  const runtimeSource=names.map(name=>extractFunction(indexSource,name)).join('\n')+
    '\nfunction normType(value){return schemaType(value);}';
  vm.runInNewContext(runtimeSource,sandbox,{filename:'index.html#snapshot-runtime'});
  return {
    db:JSON.parse(JSON.stringify(sandbox.createDB(raw))),
    schema:JSON.parse(JSON.stringify(sandbox.SCHEMA))
  };
}

const builtin=readEffectiveBuiltin();
const combined=Object.values(builtin).join('\n');

assert(!combined.includes('東京'),'BUILTIN must not contain legacy Tokyo data');
assert(!combined.includes('新宿'),'BUILTIN must not contain legacy Shinjuku data');

[
  '第一天10/18','第二天10/19','第三天10/20',
  '第四天10/21','第五天10/22','第六天10/23'
].forEach(marker=>assert(builtin.itin.includes(marker),'missing itinerary marker '+marker));

const loaded=loadRuntimeDb(builtin);
assert.strictEqual(loaded.db.trip.days.length,6,'runtime parser must produce six trip days');
assert(loaded.db.placeList.length>0,'runtime places must not be empty');
assert(loaded.db.rest.length>0,'runtime restaurants must not be empty');
assert(loaded.db.shop.length>0,'runtime shopping data must not be empty');

const approved=['P002','P013','P022','P031','P040'];
const lodgingStops=loaded.db.placeList.filter(function(place){ return approved.indexOf(place.placeId)>=0; });
assert.strictEqual(lodgingStops.length,5);
assert.deepStrictEqual(lodgingStops.map(function(place){ return place.hotelId; }),['H001','H001','H001','H001','H001']);
assert.strictEqual(new Set(lodgingStops.map(function(place){ return place.travel; })).size,5,'route-specific travel remains distinct');

const cfgKeys=loaded.schema.sheets.cfg.keys.map(item=>item.header);
const cfgRows=builtin.cfg.trim().split(/\r?\n/).slice(1).map(line=>line.split(',')[0]);
cfgKeys.forEach(key=>{
  assert.strictEqual(cfgRows.filter(value=>value===key).length,1,'cfg key must appear exactly once: '+key);
});

const ledgerRows=builtin.ledger.trim().split(/\r?\n/);
const ledgerHeaders=loaded.schema.sheets.ledger.columns.map(column=>column.header);
assert.strictEqual(ledgerRows.length,1,'BUILTIN ledger must be header-only');
assert.deepStrictEqual(ledgerRows[0].split(','),ledgerHeaders,'BUILTIN ledger header must match schema');

console.log('BUILTIN snapshot characterization passed');
