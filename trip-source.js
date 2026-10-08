/* trip-source.js — 目前連接的旅程來源（v149，第二階段「連接新旅程」）
   規格：docs/superpowers/specs/2026-10-08-connect-new-trip-design.md；決策：ADR 0021。
   - 一台手機同時只連接一份 Sheet。來源紀錄 trip_source 是唯一依據；沒有紀錄時視為內建的岡山舊旅程。
   - 連接只能從「已清除」或「尚未連接」開始；任何一步失敗都不改變手機。
   - 本模組不碰網路與 DOM，下載、驗證、Endpoint 檢查與快照寫入都由呼叫端注入。 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripSource=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var SOURCE_KEY='trip_source';
  var PENDING_KEY='trip_connect_pending';
  var LOCK_KEY='trip_lifecycle_lock';
  var SNAPSHOT_KEY='trip_data_snapshot_state';
  var LEGACY_KEY='legacy';
  var PUB_ID_RE=/^2PACX-[A-Za-z0-9_-]{20,200}$/;
  var ENDPOINT_RE=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;
  var TRIP_ID_RE=/^[A-Za-z0-9_-]{3,40}$/;
  var DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
  /* 只有使用者自己產生的資料算「用過這趟」。快照、成員名稱與空的 map 不算，
     因為新手機第一次經過 root v110 過渡頁時也會寫出這些。 */
  var LEGACY_DATA_KEYS=[
    'trip_checks','trip_next_stop_progress','trip_shop_wants','trip_shopping_list','trip_personal_ledger',
    'trip_travel_notes','trip_ledger_queue','trip_ledger_delivery_bridge','trip_ledger_deletion_bridge',
    'trip_ledger_settings_bridge'
  ];

  function text(value){return String(value==null?'':value).trim();}
  function failure(code,message,cause){
    var error=new Error(message);
    error.code=code;
    if(cause)error.cause=cause;
    return error;
  }

  function parsePublishedLink(input){
    var value=text(input);
    if(!value)return {ok:false,reason:'empty'};
    if(PUB_ID_RE.test(value))return {ok:true,pubId:value};
    var match=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([^/?#\s]+)\/(?:pubhtml|pub)(?:[?#][^\s]*)?$/.exec(value);
    if(match&&PUB_ID_RE.test(match[1]))return {ok:true,pubId:match[1]};
    if(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/(?!e\/)[A-Za-z0-9_-]+/.test(value))return {ok:false,reason:'edit-link'};
    return {ok:false,reason:'invalid'};
  }
  function pubBaseFor(pubId){
    if(!PUB_ID_RE.test(text(pubId)))throw new Error('Invalid Google Sheets publish ID');
    return 'https://docs.google.com/spreadsheets/d/e/'+text(pubId)+'/pub?single=true&output=csv&gid=';
  }
  function validEndpoint(url){return ENDPOINT_RE.test(text(url));}
  function validTripId(id){return TRIP_ID_RE.test(text(id));}
  function sourceKey(record){return record&&record.kind==='sheet'?'sheet:'+record.tripId:LEGACY_KEY;}

  function invalidSheetField(value){
    if(!PUB_ID_RE.test(text(value.pubId)))return 'publish ID';
    if(!validEndpoint(value.ledgerEndpoint))return 'Ledger Endpoint';
    if(!validTripId(value.tripId))return 'Trip ID';
    if(!DATE_RE.test(text(value.startDate))||!DATE_RE.test(text(value.endDate)))return 'dates';
    return '';
  }
  function normalizeRecord(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    if(value.kind==='legacy')return {version:1,kind:'legacy',migratedAt:Number(value.migratedAt)||0};
    if(value.kind!=='sheet'||invalidSheetField(value))return null;
    return {
      version:1,kind:'sheet',pubId:text(value.pubId),ledgerEndpoint:text(value.ledgerEndpoint),tripId:text(value.tripId),
      tripName:text(value.tripName).slice(0,80),startDate:text(value.startDate),endDate:text(value.endDate),
      connectedAt:Number(value.connectedAt)||0
    };
  }
  function legacyRecord(now){return {version:1,kind:'legacy',migratedAt:Number(now)||0};}
  function readSource(storage){
    var raw=storage.getItem(SOURCE_KEY);
    if(raw===null)return {status:'missing',record:null};
    var record=null;
    try{record=normalizeRecord(JSON.parse(raw));}catch(error){record=null;}
    return record?{status:'ok',record:record}:{status:'corrupt',record:null};
  }
  function writeSource(storage,record){
    var normalized=normalizeRecord(record);
    if(!normalized){
      var field=record&&record.kind==='sheet'?invalidSheetField(record):'kind';
      throw new Error('Invalid trip source: '+(field||'record'));
    }
    var serialized=JSON.stringify(normalized);
    storage.setItem(SOURCE_KEY,serialized);
    if(storage.getItem(SOURCE_KEY)!==serialized)throw new Error('Trip source did not persist on read-back');
    return normalized;
  }

  function meaningful(value){
    if(value===true)return true;
    if(typeof value==='string')return value.trim().length>0;
    if(typeof value==='number')return value!==0&&isFinite(value);
    if(Array.isArray(value))return value.length>0;
    if(value&&typeof value==='object')return Object.keys(value).some(function(key){return meaningful(value[key]);});
    return false;
  }
  function hasLegacyTripData(storage){
    return LEGACY_DATA_KEYS.some(function(key){
      var raw=storage.getItem(key);
      if(raw===null||raw==='')return false;
      try{return meaningful(JSON.parse(raw));}catch(error){return true;}
    });
  }
  function classifyBoot(storage,lifecycle){
    if(lifecycle.readState(storage).mode!=='active')return 'inactive';
    var source=readSource(storage);
    if(source.status==='ok')return 'use';
    if(source.status==='corrupt')return 'corrupt';
    return hasLegacyTripData(storage)?'migrate-legacy':'mark-unconnected';
  }

  function readPending(storage){
    var raw=storage.getItem(PENDING_KEY);
    if(raw===null)return null;
    try{
      var pending=JSON.parse(raw);
      return pending&&typeof pending==='object'?pending:{};
    }catch(error){return {};}
  }
  function removeSnapshotFor(storage,key){
    var raw=storage.getItem(SNAPSHOT_KEY),state=null;
    try{state=raw?JSON.parse(raw):null;}catch(error){state=null;}
    if(state&&state.active&&state.active.sourceKey===key)storage.removeItem(SNAPSHOT_KEY);
  }
  function rollbackTo(storage,pending){
    var source=readSource(storage),tripId=text(pending&&pending.tripId);
    if(tripId&&source.status==='ok'&&source.record.kind==='sheet'&&source.record.tripId===tripId)storage.removeItem(SOURCE_KEY);
    if(tripId)removeSnapshotFor(storage,'sheet:'+tripId);
    storage.removeItem(PENDING_KEY);
  }
  /* 開機時呼叫：連接中途被打斷時，清掉半成品回到原狀；已經切換成功的只移除標記。 */
  function recoverPendingConnect(storage,lifecycle){
    var pending=readPending(storage);
    if(!pending)return 'none';
    var source=readSource(storage);
    if(lifecycle.readState(storage).mode==='active'&&source.status==='ok'&&source.record.kind==='sheet'&&
      text(pending.tripId)&&source.record.tripId===text(pending.tripId)){
      storage.removeItem(PENDING_KEY);
      return 'completed';
    }
    rollbackTo(storage,pending);
    return 'rolled-back';
  }

  function acquireLock(storage){
    var previous=storage.getItem(LOCK_KEY),now=Date.now();
    if(previous){
      var held=null;
      try{held=JSON.parse(previous);}catch(error){held=null;}
      if(held&&held.expiresAt>now)throw new Error('Trip lifecycle operation is locked by another tab');
    }
    var value=JSON.stringify({id:String(now)+'-'+String(Math.random()),expiresAt:now+5*60*1000});
    storage.setItem(LOCK_KEY,value);
    if(storage.getItem(LOCK_KEY)!==value)throw new Error('Trip lifecycle lock did not persist');
    return function(){if(storage.getItem(LOCK_KEY)===value)storage.removeItem(LOCK_KEY);};
  }

  function createConnectFlow(options){
    options=options||{};
    var storage=options.storage,lifecycle=options.lifecycle;
    ['download','prepare','fetchInfo','clearPhotos','writeSnapshot','members'].forEach(function(name){
      if(typeof options[name]!=='function')throw new Error('Trip connect dependency missing: '+name);
    });
    if(!storage||!lifecycle)throw new Error('Trip connect dependency missing: storage');
    var now=typeof options.now==='function'?options.now:function(){return Date.now();};
    var inFlight=false;

    function assertInactive(){
      var mode=lifecycle.readState(storage).mode;
      if(mode!=='complete'&&mode!=='unconnected')throw failure('NOT_INACTIVE','目前仍有進行中的旅程，請先清除並打包旅程');
    }
    function previewOf(db,cfg){
      var days=(db&&db.trip&&db.trip.days||[]).map(function(day){
        return {date:day.date,count:(day.items||[]).filter(function(item){return item&&(item.act||item.place);}).length};
      });
      return {
        tripName:text(cfg.tripname),startDate:text(cfg.startdate),endDate:text(cfg.enddate),dayCount:days.length,
        stopCount:days.reduce(function(sum,day){return sum+day.count;},0),days:days,members:options.members(db)||[]
      };
    }
    function inspect(link){
      return Promise.resolve().then(function(){
        assertInactive();
        var parsed=parsePublishedLink(link);
        if(!parsed.ok){
          if(parsed.reason==='edit-link')throw failure('LINK_EDIT','這是編輯連結，請改貼「檔案 → 共用 → 發布到網路」產生的連結');
          throw failure(parsed.reason==='empty'?'LINK_EMPTY':'LINK_INVALID','看不懂這個連結，請貼上 Google 試算表「發布到網路」的連結');
        }
        return Promise.resolve().then(function(){return options.download(pubBaseFor(parsed.pubId));}).catch(function(error){
          throw failure('DOWNLOAD','無法下載這份試算表，請確認已連上網路，且試算表已「發布到網路」',error);
        }).then(function(download){
          var prepared;
          try{prepared=options.prepare(download.raw);}
          catch(error){throw failure(error&&error.stage==='structure'?'STRUCTURE':'VALIDATION','試算表內容不符合範本：'+String(error&&error.message||error),error);}
          var cfg=prepared.db&&prepared.db.cfg||{};
          var tripId=text(cfg.tripId),endpoint=text(cfg.ledgerEndpoint);
          if(!validTripId(tripId))throw failure('CFG_TRIP_ID','TripConfig 的 Trip ID 需要 3–40 個英數字（可含 - 與 _）');
          if(!validEndpoint(endpoint))throw failure('CFG_ENDPOINT','TripConfig 的 Ledger Endpoint 不是已部署的 Apps Script 網址');
          var start=text(cfg.startdate),end=text(cfg.enddate);
          if(!DATE_RE.test(start)||!DATE_RE.test(end)||start>end)throw failure('CFG_DATES','TripConfig 的 Start Date／End Date 需為 YYYY-MM-DD，且開始不晚於結束');
          var rate=Number(cfg.exchangeRate),currency=text(cfg.ledgerDefaultCurrency).toUpperCase();
          if(!(rate>0)||(currency!=='JPY'&&currency!=='TWD'))throw failure('CFG_CURRENCY','TripConfig 的匯率需大於 0，結算幣別只支援 JPY 或 TWD');
          return Promise.resolve().then(function(){return options.fetchInfo(endpoint);}).catch(function(error){
            throw failure('INFO_FAILED','無法連到這份試算表的 Apps Script，請確認已部署為網頁應用程式',error);
          }).then(function(info){
            if(!info||info.ok!==true)throw failure('INFO_FAILED','Apps Script 沒有回報這份試算表的資訊');
            if(text(info.tripId)!==tripId)throw failure('INFO_MISMATCH','Ledger Endpoint 屬於另一份試算表（Trip ID 不同），帳會記錯地方');
            if(info.ledgerHeaderOk!==true)throw failure('LEDGER_HEADER','「分帳紀錄」分頁的標題列和範本不一致');
            prepared.snapshot.sourceKey='sheet:'+tripId;
            return {
              pubId:parsed.pubId,tripId:tripId,ledgerEndpoint:endpoint,tripName:text(cfg.tripname),startDate:start,endDate:end,
              snapshot:prepared.snapshot,preview:previewOf(prepared.db,cfg)
            };
          });
        });
      });
    }
    function commit(candidate){
      if(inFlight)return Promise.reject(new Error('Trip connect is already in progress'));
      var release;
      try{release=acquireLock(storage);}catch(error){return Promise.reject(error);}
      inFlight=true;
      var record={kind:'sheet',pubId:candidate.pubId,ledgerEndpoint:candidate.ledgerEndpoint,tripId:candidate.tripId,
        tripName:candidate.tripName,startDate:candidate.startDate,endDate:candidate.endDate,connectedAt:now()};
      function finish(){inFlight=false;release();}
      return Promise.resolve().then(function(){
        assertInactive();
        if(!normalizeRecord(record))throw new Error('Invalid trip source: '+invalidSheetField(record));
        var pending=JSON.stringify({tripId:record.tripId,pubId:record.pubId,startedAt:record.connectedAt});
        storage.setItem(PENDING_KEY,pending);
        if(storage.getItem(PENDING_KEY)!==pending)throw new Error('Trip connect marker did not persist');
        return Promise.resolve().then(function(){return options.clearPhotos();}).then(function(){
          var keys=[],index;
          for(index=0;index<storage.length;index++)keys.push(storage.key(index));
          lifecycle.clearKeys(keys).filter(function(key){return key!==PENDING_KEY&&key!==LOCK_KEY;}).forEach(function(key){storage.removeItem(key);});
          options.writeSnapshot(candidate.snapshot);
          writeSource(storage,record);
          lifecycle.activate(storage);
          storage.removeItem(PENDING_KEY);
          return {sourceKey:sourceKey(record)};
        }).catch(function(error){
          rollbackTo(storage,{tripId:record.tripId});
          throw error;
        });
      }).then(function(result){finish();return result;},function(error){finish();throw error;});
    }
    return {inspect:inspect,commit:commit};
  }

  return {
    SOURCE_KEY:SOURCE_KEY,PENDING_KEY:PENDING_KEY,LEGACY_KEY:LEGACY_KEY,
    parsePublishedLink:parsePublishedLink,pubBaseFor:pubBaseFor,validEndpoint:validEndpoint,validTripId:validTripId,
    sourceKey:sourceKey,normalizeRecord:normalizeRecord,legacyRecord:legacyRecord,readSource:readSource,writeSource:writeSource,
    hasLegacyTripData:hasLegacyTripData,classifyBoot:classifyBoot,recoverPendingConnect:recoverPendingConnect,
    createConnectFlow:createConnectFlow
  };
});
