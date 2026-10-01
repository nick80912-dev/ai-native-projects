(function(root,factory){
  var api=factory(root.TripLifecycle||(typeof module==='object'&&module.exports?require('./trip-lifecycle.js'):null));
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripLifecycleFlow=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(TripLifecycle){
  'use strict';

  var LOCK_KEY='trip_lifecycle_lock';
  var RETRY_KEY='trip_archive_retry_id';
  function create(options){
    options=options||{};
    var storage=options.storage,photoStore=options.photoStore,preflight=options.preflight;
    var archive=options.archive,drive=options.drive,localPending=options.localPending;
    if(!storage||!photoStore||typeof photoStore.clearAll!=='function'||typeof preflight!=='function'||
      !archive||!drive||typeof localPending!=='function')throw new Error('Trip lifecycle dependencies are incomplete');
    var inFlight=false,heldLock=null;
    function acquire(){
      if(inFlight)throw new Error('Trip lifecycle operation already in progress');
      var previous=storage.getItem(LOCK_KEY),now=Date.now();
      if(previous){
        try{if(JSON.parse(previous).expiresAt>now)throw new Error('Trip lifecycle operation is locked by another tab');}
        catch(error){if(/locked/.test(String(error.message)))throw error;}
      }
      var value=JSON.stringify({id:String(now)+'-'+String(Math.random()),expiresAt:now+5*60*1000});
      storage.setItem(LOCK_KEY,value);
      if(storage.getItem(LOCK_KEY)!==value)throw new Error('Trip lifecycle lock did not persist');
      inFlight=true;heldLock=value;
      return function(){
        if(storage.getItem(LOCK_KEY)===value)storage.removeItem(LOCK_KEY);
        inFlight=false;heldLock=null;
      };
    }
    function assertOwned(){
      if(!heldLock||storage.getItem(LOCK_KEY)!==heldLock)throw new Error('Trip lifecycle lock was lost to another tab');
    }
    function exclusive(start){
      var release;
      try{release=acquire();}catch(error){return Promise.reject(error);}
      var result;
      try{result=start();}catch(error){release();return Promise.reject(error);}
      return Promise.resolve(result).then(function(value){release();return value;},function(error){release();throw error;});
    }
    function removeKeys(keys){
      keys.forEach(function(key){storage.removeItem(key);});
    }
    function allStorageKeys(){
      var keys=[],index;
      for(index=0;index<storage.length;index++)keys.push(storage.key(index));
      return keys;
    }
    function cleanup(){
      return Promise.resolve().then(function(){return photoStore.clearAll();}).then(function(){
        removeKeys(TripLifecycle.clearKeys(allStorageKeys()));
        var previous=TripLifecycle.readState(storage);
        TripLifecycle.writeState(storage,{mode:'complete',archiveId:previous.archiveId});
        return {archiveId:previous.archiveId};
      });
    }
    function reset(){
      return exclusive(function(){
        if(TripLifecycle.readState(storage).mode!=='active')throw new Error('No active trip to reset');
        return Promise.resolve().then(function(){return photoStore.clearAll();}).then(function(){
          removeKeys(TripLifecycle.resetKeys());
          return {reset:true};
        });
      });
    }
    function checkedPreflight(){
      return Promise.resolve().then(function(){return preflight();}).then(function(result){
        if(!result||typeof result.digest!=='string'||!result.digest||!result.archiveInput)throw new Error('Fresh trip preflight is incomplete');
        var decision=TripLifecycle.evaluateEndPreflight(result.policyInput);
        if(!decision.ok)throw new Error('Trip cannot be cleared: '+decision.reasons.join(','));
        return result;
      });
    }
    function checkLocalPending(policyInput){
      return Promise.resolve().then(function(){return localPending();}).then(function(pending){
        if(!pending)throw new Error('Local pending data could not be checked');
        var latest={};Object.keys(policyInput).forEach(function(key){latest[key]=policyInput[key];});
        latest.queueCount=pending.queueCount;latest.bridgeCounts=pending.bridgeCounts;
        var decision=TripLifecycle.evaluateEndPreflight(latest);
        if(!decision.ok)throw new Error('Local pending data changed: '+decision.reasons.join(','));
      });
    }
    function retryArchive(first){
      var previous=null;
      try{previous=JSON.parse(storage.getItem(RETRY_KEY)||'null');}catch(error){}
      if(previous&&previous.digest===first.digest&&previous.id&&previous.archivedAt&&previous.sourceTimes)return previous;
      var id=options.newArchiveId?options.newArchiveId():'archive-'+Date.now()+'-'+Math.floor(Math.random()*0x100000000).toString(36);
      if(!id||previous&&id===previous.id)throw new Error('A fresh archive ID is required for changed trip data');
      var sourceTimes={};Object.keys(first.archiveInput.sheets||{}).forEach(function(key){sourceTimes[key]=first.archiveInput.sheets[key].sourceTime;});
      var next={id:id,digest:first.digest,archivedAt:first.archiveInput.archivedAt,sourceTimes:sourceTimes};
      var serialized=JSON.stringify(next);storage.setItem(RETRY_KEY,serialized);
      if(storage.getItem(RETRY_KEY)!==serialized)throw new Error('Archive retry metadata did not persist');
      return next;
    }
    function stableArchiveInput(first,retry){
      var source=first.archiveInput,copy={},sheets={};
      Object.keys(source).forEach(function(key){copy[key]=source[key];});
      Object.keys(source.sheets||{}).forEach(function(key){
        var sheet=source.sheets[key];sheets[key]={csv:sheet.csv,sourceTime:retry.sourceTimes[key]};
      });
      copy.sheets=sheets;copy.archivedAt=retry.archivedAt;copy.archiveId=retry.id;
      return copy;
    }
    function assertFinalLocalState(second){
      var pending=localPending(),latest={};
      if(!pending)throw new Error('Local pending data could not be checked');
      Object.keys(second.policyInput).forEach(function(key){latest[key]=second.policyInput[key];});
      latest.queueCount=pending.queueCount;latest.bridgeCounts=pending.bridgeCounts;
      var decision=TripLifecycle.evaluateEndPreflight(latest);
      if(!decision.ok)throw new Error('Local pending data changed: '+decision.reasons.join(','));
      if(typeof options.localPersonalState==='function'&&second.personalJson!==JSON.stringify(options.localPersonalState())){
        throw new Error('Local personal data changed during archive');
      }
    }
    function sameAccount(expected){
      var current=drive.account();
      if(!expected||!expected.accountId||!current||current.accountId!==expected.accountId)throw new Error('Google account switched during archive');
    }
    function end(input){
      input=input||{};
      var saveArchive=input.saveArchive===true;
      return exclusive(function(){
        if(TripLifecycle.readState(storage).mode!=='active')throw new Error('Trip is already inactive');
        // Start GIS while still in the caller's click task; all network preflights follow.
        var connection=saveArchive?drive.connect():null;
        var expectedAccount=null,archiveId=null,firstResult=null,uploadedChecksum=null;
        return Promise.resolve(connection).then(function(account){
          expectedAccount=account;
          return checkedPreflight();
        }).then(function(first){
          firstResult=first;
          if(!saveArchive)return null;
          sameAccount(expectedAccount);
          var retry=retryArchive(first);archiveId=retry.id;
          var inputCopy=stableArchiveInput(first,retry);
          return archive.serialize(inputCopy).then(function(text){
            uploadedChecksum=JSON.parse(text).checksum;
            return drive.upsertPrepared(archiveId,text);
          }).then(function(fileId){
            return drive.readArchive(fileId).then(function(readback){return archive.parseVerified(readback);}).then(function(parsed){
              if(parsed.archiveId!==archiveId||parsed.checksum!==uploadedChecksum)throw new Error('Drive archive readback does not match this trip');
              sameAccount(expectedAccount);
              return fileId;
            });
          });
        }).then(function(fileId){
          return checkedPreflight().then(function(second){
            if(firstResult.digest!==second.digest)throw new Error('Trip data changed while preparing archive');
            if(saveArchive){
              sameAccount(expectedAccount);
              return checkLocalPending(second.policyInput).then(function(){
                return drive.markComplete(fileId);
              }).then(function(){sameAccount(expectedAccount);return second;});
            }
            return second;
          });
        }).then(function(second){
          if(saveArchive)sameAccount(expectedAccount);
          assertOwned();
          assertFinalLocalState(second);
          assertOwned();
          TripLifecycle.writeState(storage,{mode:'cleanup-pending',archiveId:archiveId});
          return cleanup();
        });
      });
    }
    function resumeCleanup(){
      return exclusive(function(){
        var state=TripLifecycle.readState(storage);
        if(state.mode==='complete')return Promise.resolve({archiveId:state.archiveId});
        if(state.mode!=='cleanup-pending')throw new Error('There is no pending trip cleanup');
        return cleanup();
      });
    }
    return {reset:reset,end:end,resumeCleanup:resumeCleanup};
  }
  return {create:create};
});
