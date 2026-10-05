/* Catches silent/partial writes, corrupt read overwrite and false success.
   Only Storage is doubled: all serialization/validation/rollback is production code. */
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
const names=['tripProgressObject','tripProgressShapeValid','readTripProgressChecked','writeTripProgressChecked',
  'dayProgressKey','normalizeDayProgress','applyItemCompletion','setItemCompletion'];
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
function uiContext(storage){
  const sb=context(storage),day={date:'10/18',items:[{id:'a',time:'09:00',act:'早餐'},{id:'b',time:'11:00',act:'午餐'},{id:'c',time:'17:00',act:'晚餐'}]};
  Object.assign(sb,{
    DB:{trip:{days:[day]}},curDay:0,curView:'trip',lastNextStopAction:null,
    tripProgressAutoFailures:{},tripProgressFailureSeen:{},tripProgressErrorMessage:'',tripProgressRenderReadOnly:false,
    TripProgression:require('../trip-progression'),findToday:()=>0,currentMinutes:()=>12*60,
    lsGet:(key,fallback)=>{try{const raw=storage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch(ignore){return fallback;}},
    document:{querySelectorAll:()=>[],getElementById:()=>null},
    AppLog:{repo:()=>{}},renderToday:()=>{},renderTrip:()=>{},restoreTripCheckFocus:()=>{},
    toast:(...args)=>sb.messages.push(args),messages:[]
  });
  const uiNames=['getChecks','getNextStopProgress','getDayProgress','toggleCheck','saveNextStopProgress','markNextStop',
    'autoSkipStaleItem','isAutoSkipped','isNextStopCleared','parseStartMinutes','pickNextStop','reconcileClusterController',
    'getChildStopCluster','clusterControllerId','clusterCompletionChange',
    'snapshotNextStopState','undoNextStopAction','onNextStopDone','onNextStopSkip','onCheck'];
  // New UI helpers, if present, are loaded rather than mocked.
  for(const name of ['reportTripProgressFailure','clearTripProgressFailure','renderTripProgressAfterFailure','tripProgressReadFailure']){
    if(html.includes('function '+name+'('))uiNames.push(name);
  }
  vm.runInContext(uiNames.map(name=>extractFunction(html,name)).join('\n'),sb);
  return sb;
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
for(const method of ['onNextStopDone','onNextStopSkip','onCheck'])test(method+' failure has no success notification or undo replacement',()=>{
  const storage=storageDouble(),sb=uiContext(storage),before=storage.snapshot(),prior={itemId:'prior'};
  sb.lastNextStopAction=prior;
  storage.configure(op=>{if(op==='set')throw Error('quota');});
  if(method==='onCheck')sb[method]('b',true);else sb[method](0,'b');
  assert.strictEqual(storage.snapshot(),before);assert.strictEqual(sb.lastNextStopAction,prior);
  assert.ok(sb.messages.some(args=>args[0].includes('未能儲存')));
  assert.ok(sb.messages.every(args=>!/^已完成|^已略過|^已打卡|^已修正/.test(args[0])));
});
test('failed undo retains snapshot and offers retry which restores autoSkip',()=>{
  const storage=storageDouble({trip_checks:'{}',trip_next_stop_progress:'{"day_1_10_18":{"done":{},"skip":{"b":true},"autoSkip":{"b":true}}}'}),sb=uiContext(storage);
  sb.onNextStopDone(0,'b');
  const action=sb.lastNextStopAction;assert.strictEqual(action.prevAutoSkip,true);
  storage.configure(op=>{if(op==='set')throw Error('quota');});sb.messages=[];
  sb.undoNextStopAction();
  assert.strictEqual(sb.lastNextStopAction,action);assert.strictEqual(JSON.parse(storage.raw.trip_checks).b,true);
  assert.ok(sb.messages.some(args=>args[1]==='重試復原'&&typeof args[2]==='function'));
  assert.ok(sb.messages.every(args=>!/^已復原/.test(args[0])));
  storage.configure(()=>{});sb.undoNextStopAction();
  assert.strictEqual(sb.lastNextStopAction,null);assert.deepStrictEqual(JSON.parse(storage.raw.trip_checks),{});
  assert.deepStrictEqual(JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18,{done:{},skip:{b:true},autoSkip:{b:true}});
});
test('automatic reconcile failure is read-only on repeated render and has no success toast',()=>{
  const storage=storageDouble(),sb=uiContext(storage),day=sb.DB.trip.days[0];
  storage.configure(op=>{if(op==='set')throw Error('quota');});
  const first=sb.pickNextStop(day.items,{},{},12*60,{day,dayIndex:0}),writes=storage.calls.set;
  assert.strictEqual(first.item.id,'b');assert.strictEqual(storage.snapshot(),'{}');
  const notifications=sb.messages.length;
  sb.pickNextStop(day.items,{},{},12*60,{day,dayIndex:0});
  assert.strictEqual(storage.calls.set,writes);assert.strictEqual(sb.messages.length,notifications);
  assert.ok(sb.messages.every(args=>!/^已自動略過/.test(args[0])));
});
test('automatic single-item skip does not report success after rejection',()=>{
  const storage=storageDouble(),sb=uiContext(storage);storage.configure(op=>{if(op==='set')throw Error('quota');});
  assert.strictEqual(sb.autoSkipStaleItem(sb.DB.trip.days[0],0,'a'),false);
  assert.strictEqual(storage.snapshot(),'{}');
});
test('cluster controller stays uncompleted if persistence fails',()=>{
  const storage=storageDouble({trip_checks:'{"a":true,"b":true}'}),sb=uiContext(storage),day=sb.DB.trip.days[0];
  storage.configure(op=>{if(op==='set')throw Error('quota');});
  assert.strictEqual(sb.reconcileClusterController(day,0,{controllerId:'a__cluster',items:day.items.slice(0,2)},{},{a:true,b:true}),false);
  assert.strictEqual(storage.raw.trip_next_stop_progress,undefined);
});
test('past completed check-in cancellation remains automatically skipped',()=>{
  const storage=storageDouble(),sb=uiContext(storage),day=sb.DB.trip.days[0];
  sb.setItemCompletion(day,0,'b','done');sb.onCheck('b',false);
  const progress=JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18;
  assert.strictEqual(progress.done.b,undefined);assert.strictEqual(progress.skip.b,true);assert.strictEqual(progress.autoSkip.b,true);
  assert.strictEqual(JSON.parse(storage.raw.trip_checks).b,undefined);
});
test('cluster undo restores child autoSkip and reopens its completed controller in one checked batch',()=>{
  const storage=storageDouble({trip_checks:'{"a":true,"b":true,"a__cluster":true}',
    trip_next_stop_progress:'{"day_1_10_18":{"done":{"a":true,"b":true,"a__cluster":true},"skip":{},"autoSkip":{}}}'}),sb=uiContext(storage);
  sb.DB.trip.days[0].items.forEach(item=>{item.place=item.act;});sb.DB.trip.days[0].items[1].act='';
  sb.lastNextStopAction={dayIndex:0,itemId:'a',status:'done',prevDone:false,prevSkip:true,prevAutoSkip:true,prevCheck:false};
  // A skipped child still clears its controller; the target's exact previous status wins.
  sb.undoNextStopAction();
  let progress=JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18;
  assert.strictEqual(progress.autoSkip.a,true);assert.strictEqual(progress.skip.a,true);assert.strictEqual(progress.done.a__cluster,true);
  sb.lastNextStopAction={dayIndex:0,itemId:'b',status:'done',prevDone:false,prevSkip:false,prevAutoSkip:false,prevCheck:false};
  const before=storage.calls.set;sb.undoNextStopAction();
  progress=JSON.parse(storage.raw.trip_next_stop_progress).day_1_10_18;
  assert.strictEqual(progress.done.b,undefined);assert.strictEqual(progress.done.a__cluster,undefined);
  assert.strictEqual(JSON.parse(storage.raw.trip_checks).a__cluster,undefined);assert.strictEqual(storage.calls.set-before,2);
  assert.strictEqual(progress.autoSkip.a,true);
});
test('failed cluster undo rolls back both child and controller and retains its snapshot',()=>{
  const storage=storageDouble({trip_checks:'{ "a":true,"b":true,"a__cluster":true }',
    trip_next_stop_progress:'{ "day_1_10_18":{"done":{"a":true,"b":true,"a__cluster":true},"skip":{}} }'}),sb=uiContext(storage);
  sb.DB.trip.days[0].items.forEach(item=>{item.place=item.act;});sb.DB.trip.days[0].items[1].act='';
  const action={dayIndex:0,itemId:'b',status:'done',prevDone:false,prevSkip:false,prevAutoSkip:false,prevCheck:false};sb.lastNextStopAction=action;
  const before=storage.snapshot();let failed=false;
  storage.configure((op,key)=>{if(op==='set'&&key==='trip_checks'&&!failed){failed=true;throw Error('quota');}});
  sb.undoNextStopAction();assert.strictEqual(storage.snapshot(),before);assert.strictEqual(sb.lastNextStopAction,action);
  assert.ok(sb.messages.every(args=>!/^已復原/.test(args[0])));
});
console.log('trip progress persistence: '+count+' tests passed');
