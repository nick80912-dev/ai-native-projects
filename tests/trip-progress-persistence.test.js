/* Catches silent/partial writes, corrupt read overwrite and false success.
   Only Storage is doubled: all serialization/validation/rollback is production code. */
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
const names=['tripProgressObject','tripProgressShapeValid','readTripProgressChecked','writeTripProgressChecked',
  'dayProgressKey','normalizeDayProgress','setItemCompletion'];
const source=names.map(name=>extractFunction(html,name)).join('\n');
const plain=value=>JSON.parse(JSON.stringify(value));

function storageDouble(seed={}){
  const raw={...seed},calls={get:0,set:0,remove:0};
  let fault=()=>{};
  return {
    getItem(key){calls.get++;fault('get',key,calls.get,raw);return Object.hasOwn(raw,key)?raw[key]:null;},
    setItem(key,value){calls.set++;fault('set',key,calls.set,raw);raw[key]=String(value);},
    removeItem(key){calls.remove++;fault('remove',key,calls.remove,raw);delete raw[key];},
    configure(fn){fault=fn;},
    snapshot(){return JSON.stringify(raw);},
    calls,raw
  };
}
function context(storage){
  const sb={localStorage:storage,TripLifecycle:require('../trip-lifecycle')};
  vm.createContext(sb);vm.runInContext(source,sb);return sb;
}
const initial={trip_checks:'{ "old": true }',trip_next_stop_progress:'{ "day_1_10_18": {"done":{"old":true},"skip":{}} }'};
const next=[{key:'trip_next_stop_progress',value:{day_1_10_18:{done:{next:true},skip:{},autoSkip:{}}}},
  {key:'trip_checks',value:{next:true}}];
let count=0;
function test(name,run){run();count++;console.log('PASS '+name);}
test('successful writes are read back and both states persist',()=>{
  const storage=storageDouble(initial),sb=context(storage),result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,true);
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_checks),{next:true});
  assert.deepStrictEqual(plain(sb.readTripProgressChecked(storage).progress),next[0].value);
});
for(const failingKey of ['trip_next_stop_progress','trip_checks'])test('rejected '+failingKey+' restores exact original bytes',()=>{
  const storage=storageDouble(initial),sb=context(storage),before=storage.snapshot();let fired=false;
  storage.configure((op,key)=>{if(op==='set'&&key===failingKey&&!fired){fired=true;throw Error('quota');}});
  const result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,false);assert.strictEqual(result.restored,true);assert.strictEqual(storage.snapshot(),before);
});
test('silent write mismatch fails and restores',()=>{
  const storage=storageDouble(initial),sb=context(storage),before=storage.snapshot();let reads=0;
  storage.configure((op,key,n,raw)=>{if(op==='get'&&key==='trip_next_stop_progress'&&++reads===3)raw[key]='{}';});
  const result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,false);assert.strictEqual(result.restored,true);assert.strictEqual(storage.snapshot(),before);
});
test('rollback failure never claims restoration',()=>{
  const storage=storageDouble(initial),sb=context(storage);
  storage.configure((op,key,n)=>{if(op==='set'&&(n===2||n===3))throw Error('quota');});
  const result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,false);assert.strictEqual(result.restored,false);
  assert.notStrictEqual(storage.raw.trip_next_stop_progress,initial.trip_next_stop_progress);
});
test('absent keys are removed on rollback rather than replaced by empty JSON',()=>{
  const storage=storageDouble(),sb=context(storage);let fired=false;
  storage.configure((op,key)=>{if(op==='set'&&key==='trip_checks'&&!fired){fired=true;throw Error('quota');}});
  const result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,false);assert.strictEqual(result.restored,true);assert.strictEqual(storage.snapshot(),'{}');
});
test('failed removal reports an unverified rollback',()=>{
  const storage=storageDouble(),sb=context(storage);
  storage.configure((op,key)=>{if((op==='set'&&key==='trip_checks')||op==='remove')throw Error('denied');});
  const result=sb.writeTripProgressChecked(storage,next);
  assert.strictEqual(result.ok,false);assert.strictEqual(result.restored,false);
});
test('serialization failure never writes a partial payload',()=>{
  const storage=storageDouble(initial),sb=context(storage),before=storage.snapshot(),cyclic={};cyclic.self=cyclic;
  const result=sb.writeTripProgressChecked(storage,[next[0],{key:'trip_checks',value:cyclic}]);
  assert.strictEqual(result.ok,false);assert.strictEqual(storage.calls.set,0);assert.strictEqual(storage.snapshot(),before);
});
test('read denial prevents mutation',()=>{
  const storage=storageDouble(initial),sb=context(storage),before=storage.snapshot();
  storage.configure(op=>{if(op==='get')throw Error('security');});
  assert.strictEqual(sb.readTripProgressChecked(storage).ok,false);
  assert.strictEqual(sb.setItemCompletion({date:'10/18'},0,'next','done').ok,false);
  assert.strictEqual(storage.calls.set,0);assert.strictEqual(storage.snapshot(),before);
});
for(const [key,value] of [['trip_checks','{broken'],['trip_checks','[]'],['trip_checks','null'],
  ['trip_next_stop_progress','{"day_1_10_18":{"done":[]}}'],['trip_next_stop_progress','{"day_1_10_18":false}']]){
  test('invalid stored '+key+' remains recoverable ('+value+')',()=>{
    const storage=storageDouble({...initial,[key]:value}),sb=context(storage),before=storage.snapshot();
    assert.strictEqual(sb.readTripProgressChecked(storage).ok,false);
    assert.strictEqual(sb.setItemCompletion({date:'10/18'},0,'next','done').ok,false);
    assert.strictEqual(storage.calls.set,0);assert.strictEqual(storage.snapshot(),before);
  });
}
test('set completion updates both keys and preserves unrelated state',()=>{
  const storage=storageDouble(initial),sb=context(storage);
  assert.strictEqual(sb.setItemCompletion({date:'10/18'},0,'next','done').ok,true);
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_checks),{old:true,next:true});
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18,{done:{old:true,next:true},skip:{},autoSkip:{}});
  assert.strictEqual(sb.setItemCompletion({date:'10/18'},0,'next','skip').ok,true);
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_checks),{old:true});
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18,{done:{old:true},skip:{next:true},autoSkip:{}});
});
test('inactive trip cannot recreate progress',()=>{
  const storage=storageDouble({trip_lifecycle_state:'{"mode":"complete"}'}),sb=context(storage),before=storage.snapshot();
  assert.strictEqual(sb.setItemCompletion({date:'10/18'},0,'next','done').ok,false);
  assert.strictEqual(storage.snapshot(),before);
});
console.log('trip progress persistence: '+count+' tests passed');
