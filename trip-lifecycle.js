(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripLifecycle=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var STATE_KEY='trip_lifecycle_state';
  var RESET_KEYS=[
    'trip_checks','trip_next_stop_progress','trip_shop_wants','trip_shopping_list',
    'trip_personal_ledger','trip_ledger_proxy_targets','trip_travel_notes'
  ];
  var REQUIRED_BRIDGES=['delivery','deletion','settings'];

  function validCount(value){return typeof value==='number'&&isFinite(value)&&value>=0&&Math.floor(value)===value;}
  function evaluateEndPreflight(input){
    var reasons=[];
    if(!input||typeof input!=='object')return {ok:false,reasons:['invalid-input']};
    if(input.online!==true)reasons.push('offline');
    if(input.sheetsComplete!==true)reasons.push('incomplete-sheets');
    if(!validCount(input.queueCount))reasons.push('unknown-queue');
    else if(input.queueCount>0)reasons.push('pending-queue');
    var bridges=input.bridgeCounts;
    if(!bridges||typeof bridges!=='object'||Array.isArray(bridges)||REQUIRED_BRIDGES.some(function(key){return !validCount(bridges[key]);})){
      reasons.push('unknown-bridge');
    }else if(Object.keys(bridges).some(function(key){return !validCount(bridges[key])||bridges[key]>0;})){
      reasons.push('pending-bridge');
    }
    var balances=input.formalBalances;
    if(!balances||typeof balances!=='object'||Array.isArray(balances)||Object.keys(balances).some(function(key){return typeof balances[key]!=='number'||!isFinite(balances[key]);})){
      reasons.push('unknown-balance');
    }else if(Object.keys(balances).some(function(key){return balances[key]!==0;})){
      reasons.push('unsettled-balance');
    }
    if(!validCount(input.pendingClaims))reasons.push('unknown-claims');
    else if(input.pendingClaims>0)reasons.push('pending-claim');
    return {ok:reasons.length===0,reasons:reasons};
  }

  function resetKeys(){return RESET_KEYS.slice();}
  function clearKeys(storageKeys){
    if(!Array.isArray(storageKeys))return [];
    return storageKeys.filter(function(key){
      return typeof key==='string'&&key!==STATE_KEY&&(key.indexOf('trip_')===0||key.indexOf('v2_cache_')===0);
    });
  }
  function readState(storage){
    var text=storage.getItem(STATE_KEY);
    if(text===null)return {mode:'active',archiveId:null};
    try{
      var state=JSON.parse(text);
      if(state&&(state.mode==='cleanup-pending'||state.mode==='complete'||state.mode==='unconnected')){
        return {mode:state.mode,archiveId:typeof state.archiveId==='string'?state.archiveId:null};
      }
    }catch(error){}
    return {mode:'cleanup-pending',archiveId:null};
  }
  function writeState(storage,state){
    if(!state||['cleanup-pending','complete','unconnected'].indexOf(state.mode)<0)throw new Error('Invalid trip lifecycle state');
    var value=JSON.stringify({mode:state.mode,archiveId:state.archiveId||null});
    storage.setItem(STATE_KEY,value);
    if(storage.getItem(STATE_KEY)!==value)throw new Error('Trip lifecycle state did not persist on read-back');
  }
  /* v149: a device becomes active again only by connecting a trip (trip-source.js). Active is
     stored as the absence of the key, so older generations keep reading it the same way. */
  function activate(storage){
    storage.removeItem(STATE_KEY);
    if(storage.getItem(STATE_KEY)!==null)throw new Error('Trip lifecycle state did not clear on read-back');
  }

  return {
    evaluateEndPreflight:evaluateEndPreflight,resetKeys:resetKeys,clearKeys:clearKeys,
    readState:readState,writeState:writeState,activate:activate,STATE_KEY:STATE_KEY
  };
});
