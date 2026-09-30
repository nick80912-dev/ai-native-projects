const assert=require('assert');
const TripLifecycle=require('../trip-lifecycle.js');

function safeInput(){
  return {
    online:true,sheetsComplete:true,queueCount:0,bridgeCounts:{delivery:0,deletion:0,settings:0},
    formalBalances:{Bar:0,Jane:0},pendingClaims:0
  };
}

assert.strictEqual(TripLifecycle.evaluateEndPreflight(safeInput()).ok,true,'fully settled fresh data permits an end-trip choice');

[
  ['offline',{online:false}],
  ['incomplete sheets',{sheetsComplete:false}],
  ['pending formal or TEST queue',{queueCount:1}],
  ['delivery bridge',{bridgeCounts:{delivery:1,deletion:0,settings:0}}],
  ['deletion bridge',{bridgeCounts:{delivery:0,deletion:1,settings:0}}],
  ['settings bridge',{bridgeCounts:{delivery:0,deletion:0,settings:1}}],
  ['unsettled balance',{formalBalances:{Bar:1,Jane:-1}}],
  ['pending claim',{pendingClaims:1}]
].forEach(function(testCase){
  const result=TripLifecycle.evaluateEndPreflight(Object.assign(safeInput(),testCase[1]));
  assert.strictEqual(result.ok,false,testCase[0]+' must block clearing');
  assert.ok(result.reasons.length>0,testCase[0]+' must explain the block');
});

const missing=safeInput();
delete missing.queueCount;
assert.strictEqual(TripLifecycle.evaluateEndPreflight(missing).ok,false,'unknown queue state fails closed');
assert.strictEqual(TripLifecycle.evaluateEndPreflight(Object.assign(safeInput(),{queueCount:-1})).ok,false,'invalid queue count fails closed');

assert.deepStrictEqual(TripLifecycle.resetKeys(),[
  'trip_checks','trip_next_stop_progress','trip_shop_wants','trip_shopping_list',
  'trip_personal_ledger','trip_ledger_proxy_targets','trip_travel_notes'
]);
assert.deepStrictEqual(
  TripLifecycle.clearKeys(['trip_member','trip_ledger_queue','trip_lifecycle_state','v2_cache_itin','unrelated']),
  ['trip_member','trip_ledger_queue','v2_cache_itin'],
  'clearing includes trip-scoped data but protects its inactive marker and unrelated keys'
);

const values={};
const storage={
  getItem:function(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
  setItem:function(key,value){values[key]=String(value);}
};
assert.deepStrictEqual(TripLifecycle.readState(storage),{mode:'active',archiveId:null});
TripLifecycle.writeState(storage,{mode:'cleanup-pending',archiveId:'archive-1'});
assert.deepStrictEqual(TripLifecycle.readState(storage),{mode:'cleanup-pending',archiveId:'archive-1'});
storage.setItem=function(){};
assert.throws(function(){TripLifecycle.writeState(storage,{mode:'complete',archiveId:'archive-1'});},/persist|read.?back|state/i);

console.log('trip lifecycle policy tests passed');
