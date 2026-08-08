(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripLedgerUiState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var TRACKS=['personal','shared'];
  var PAGES=['dashboard','all'];
  var PROXY_FILTERS=['all','proxy','non-proxy'];
  var TAX_FILTERS=['all','tax-exempt','non-tax-exempt'];
  var GROUPINGS=['date','category'];
  var CHOICE_FIELDS=['historyCategories','historyPayMethods'];

  function text(value){return String(value==null?'':value);}
  function oneOf(value,values,fallback){return values.indexOf(value)>=0?value:fallback;}
  function uniqueStrings(value){
    var seen={},result=[];
    (Array.isArray(value)?value:[]).forEach(function(item){
      var normalized=text(item).trim();
      if(!normalized||seen[normalized])return;
      seen[normalized]=true;result.push(normalized);
    });
    return result;
  }
  function truthMap(value){
    var result={};
    if(!value||typeof value!=='object'||Array.isArray(value))return result;
    Object.keys(value).forEach(function(key){if(key&&value[key])result[key]=true;});
    return result;
  }
  function numberOrZero(value){var parsed=Number(value);return isFinite(parsed)?parsed:0;}
  function plainObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
  function cloneContext(value){
    var source=plainObject(value),next={};
    if(!source)return null;
    Object.keys(source).forEach(function(key){
      var item=source[key];
      if(typeof item!=='function'&&!(item&&item.nodeType))next[key]=item;
    });
    return next;
  }
  function clearEntrySession(state){
    state.sheet=null;state.draft=null;state.editing=null;state.savePending=false;
    state.calendarOpen=false;state.calendarYear=0;state.calendarMonth=0;
    state.entryReturnContext=null;state.entrySessionId='';state.entrySaveRequestId='';
    return state;
  }
  function matchesEntry(state,command){
    return state.sheet==='entry'&&!state.correction&&!!state.entrySessionId&&text(command.sessionId)===state.entrySessionId;
  }
  function matchesSave(state,command){
    return matchesEntry(state,command)&&state.savePending&&text(command.requestId)===state.entrySaveRequestId;
  }
  function shiftedMonth(year,month,delta){
    var total=Number(year)*12+Number(month)+Number(delta||0);
    var nextYear=Math.floor(total/12),nextMonth=total-nextYear*12;
    return {year:nextYear,month:nextMonth};
  }

  function createState(seed){
    var source=seed&&typeof seed==='object'?seed:{},sheet=source.sheet==='entry'?'entry':null;
    var correction=source.correction==null?null:source.correction;
    var sessionId=text(source.entrySessionId).trim();
    var entryActive=sheet==='entry'&&(!!sessionId||!!correction);
    return {
      track:oneOf(source.track,TRACKS,'personal'),
      displayCurrency:oneOf(source.displayCurrency,['','JPY','TWD'],''),
      page:oneOf(source.page,PAGES,'dashboard'),
      filter:oneOf(source.filter,['all','proxy'],'all'),
      sheet:entryActive?'entry':null,
      selectedRecordId:text(source.selectedRecordId),
      draft:entryActive&&source.draft!=null?source.draft:null,
      editing:entryActive&&sessionId&&source.editing!=null?source.editing:null,
      correction:entryActive?correction:null,
      retainedParticipants:source.retainedParticipants==null?null:source.retainedParticipants,
      historyQuery:text(source.historyQuery),
      historyCategories:uniqueStrings(source.historyCategories),
      historyPayMethods:uniqueStrings(source.historyPayMethods),
      historyProxy:oneOf(source.historyProxy,PROXY_FILTERS,'all'),
      historyTaxExempt:oneOf(source.historyTaxExempt,TAX_FILTERS,'all'),
      historyFiltersOpen:source.historyFiltersOpen===true,
      historyGrouping:oneOf(source.historyGrouping,GROUPINGS,'date'),
      calendarOpen:entryActive&&source.calendarOpen===true,
      calendarYear:entryActive?numberOrZero(source.calendarYear):0,
      calendarMonth:entryActive?numberOrZero(source.calendarMonth):0,
      expandedBatches:truthMap(source.expandedBatches),
      selectionMode:source.selectionMode===true,
      selectedRecordIds:truthMap(source.selectedRecordIds),
      savePending:entryActive&&source.savePending===true,
      entryReturnContext:entryActive&&sessionId?cloneContext(source.entryReturnContext):null,
      entrySessionId:entryActive?sessionId:'',
      entrySaveRequestId:entryActive&&sessionId?text(source.entrySaveRequestId).trim():''
    };
  }

  function result(state,effects){return {state:state,effects:effects||[],changed:true};}
  function unchanged(state){return {state:state,effects:[],changed:false};}
  function resetFilters(state,resetQueryAndGrouping){
    state.historyCategories=[];
    state.historyPayMethods=[];
    state.historyProxy='all';
    state.historyTaxExempt='all';
    state.historyFiltersOpen=false;
    if(resetQueryAndGrouping){state.historyQuery='';state.historyGrouping='date';}
    return state;
  }
  function resetSelection(state,clearExpanded){
    state.selectionMode=false;state.selectedRecordIds={};
    if(clearExpanded)state.expandedBatches={};
    return state;
  }
  function historyExit(state){
    state.page='dashboard';state.filter='all';
    resetFilters(state,true);resetSelection(state,false);
    return state;
  }
  function renderHistoryResult(state){return result(state,[{type:'render-history-results'}]);}

  function transition(current,action){
    var state=current&&typeof current==='object'?current:createState();
    var command=action&&typeof action==='object'?action:{};
    var next,id,ids,map,allSelected,index,field,value;
    switch(command.type){
    case 'open-entry-create':
    case 'open-entry-edit':
      if(!plainObject(command.draft)||!text(command.sessionId).trim())return unchanged(state);
      next=createState(state);next.sheet='entry';next.draft=command.draft;
      next.editing=command.type==='open-entry-edit'&&plainObject(command.editing)?command.editing:null;
      next.correction=null;next.track=oneOf(command.draft.track,TRACKS,next.track);
      next.savePending=false;next.calendarOpen=false;next.calendarYear=0;next.calendarMonth=0;next.entrySaveRequestId='';
      next.entrySessionId=text(command.sessionId).trim();next.entryReturnContext=cloneContext(command.returnContext);
      return result(next,[
        {type:'close-actions'},{type:'mount-entry'},
        {type:'render-entry',preservePosition:false},
        {type:'focus-entry',target:text(command.focusTarget)}
      ]);
    case 'entry-track-switched':
      if(state.sheet!=='entry'||state.correction||text(command.sessionId)!==state.entrySessionId||!plainObject(command.draft))return unchanged(state);
      next=createState(state);next.draft=command.draft;next.track=oneOf(command.draft.track,TRACKS,next.track);
      return result(next,[{type:'render-entry',preservePosition:true}]);
    case 'entry-validation-failed':
      if(!matchesEntry(state,command)||!plainObject(command.draft))return unchanged(state);
      next=createState(state);next.draft=command.draft;
      return result(next,[
        {type:'render-entry',preservePosition:true},
        {type:'focus-entry',target:text(command.errorTarget)}
      ]);
    case 'entry-save-requested':
      id=text(command.requestId).trim();
      if(!matchesEntry(state,command)||state.savePending||!id)return unchanged(state);
      next=createState(state);next.savePending=true;next.entrySaveRequestId=id;
      return result(next,[{type:'sync-entry-pending'}]);
    case 'entry-save-failed':
      if(!matchesSave(state,command))return unchanged(state);
      next=createState(state);next.savePending=false;next.entrySaveRequestId='';
      var failedEffects=[{type:'sync-entry-pending'}];
      if(command.notification)failedEffects.push({type:'notify-entry-result',notification:command.notification});
      return result(next,failedEffects);
    case 'entry-save-succeeded':
      if(!matchesSave(state,command))return unchanged(state);
      var savedEffects=[{type:'sync-entry-pending'}];
      if(command.addAnother===true){
        if(!plainObject(command.nextDraft))return unchanged(state);
        next=createState(state);next.draft=command.nextDraft;next.editing=null;
        next.track=oneOf(command.nextDraft.track,TRACKS,next.track);next.savePending=false;next.entrySaveRequestId='';
        next.calendarOpen=false;next.calendarYear=0;next.calendarMonth=0;
        savedEffects.push({type:'render-entry',preservePosition:false},{type:'focus-entry',target:'amount'});
      }else{
        var savedContext=cloneContext(state.entryReturnContext);
        next=clearEntrySession(createState(state));
        savedEffects.push(
          {type:'unmount-entry'},{type:'render-split'},
          {type:'restore-entry-context',context:savedContext,restoreBackground:true}
        );
      }
      if(command.notification)savedEffects.push({type:'notify-entry-result',notification:command.notification});
      return result(next,savedEffects);
    case 'toggle-entry-calendar':
      if(!matchesEntry(state,command))return unchanged(state);
      next=createState(state);
      if(next.calendarOpen)next.calendarOpen=false;
      else{
        var openYear=Number(command.year),openMonth=Number(command.month);
        if(!isFinite(openYear)||Math.floor(openYear)!==openYear||!isFinite(openMonth)||Math.floor(openMonth)!==openMonth||openMonth<0||openMonth>11)return unchanged(state);
        next.calendarOpen=true;next.calendarYear=openYear;next.calendarMonth=openMonth;
      }
      return result(next,[{type:'render-entry',preservePosition:true}]);
    case 'shift-entry-calendar':
      var delta=Number(command.delta);
      if(!matchesEntry(state,command)||!state.calendarOpen||!isFinite(delta)||Math.floor(delta)!==delta||delta===0)return unchanged(state);
      next=createState(state);var shifted=shiftedMonth(next.calendarYear,next.calendarMonth,delta);
      next.calendarYear=shifted.year;next.calendarMonth=shifted.month;
      return result(next,[{type:'render-entry',preservePosition:true}]);
    case 'select-entry-calendar-date':
      if(!matchesEntry(state,command)||!state.calendarOpen||!plainObject(command.draft))return unchanged(state);
      next=createState(state);next.draft=command.draft;next.calendarOpen=false;
      return result(next,[{type:'render-entry',preservePosition:true}]);
    case 'close-entry-calendar':
      if(!matchesEntry(state,command)||!state.calendarOpen)return unchanged(state);
      next=createState(state);next.calendarOpen=false;
      return result(next,[{type:'render-entry',preservePosition:true}]);
    case 'close-entry':
      if(state.sheet!=='entry'||state.correction)return unchanged(state);
      next=clearEntrySession(createState(state));
      return result(next,[
        {type:'unmount-entry'},
        {type:'restore-entry-context',context:cloneContext(state.entryReturnContext),restoreBackground:command.restoreBackground!==false}
      ]);
    case 'switch-track':
      if(TRACKS.indexOf(command.track)<0)return unchanged(state);
      next=createState(state);next.track=command.track;next.page='dashboard';next.filter='all';next.displayCurrency='';
      resetSelection(next,true);if(command.track==='shared')next.historyProxy='all';
      return result(next,[{type:'close-actions'},{type:'render-split'}]);
    case 'toggle-currency':
      next=createState(state);value=next.displayCurrency||oneOf(command.defaultCurrency,['JPY','TWD'],'JPY');
      next.displayCurrency=value==='JPY'?'TWD':'JPY';
      return result(next,[{type:'render-split'}]);
    case 'open-history':
      next=createState(state);next.page='all';next.selectedRecordId='';resetSelection(next,false);
      return result(next,[{type:'close-actions'},{type:'render-split'},{type:'scroll-top',behavior:'auto'}]);
    case 'set-dashboard-filter':
      if(command.value!=='all'&&command.value!=='proxy')return unchanged(state);
      next=createState(state);next.filter=command.value;return result(next,[{type:'render-split'}]);
    case 'close-history':
    case 'return-dashboard':
      next=historyExit(createState(state));
      return result(next,[{type:'close-actions'},{type:'render-split'},{type:'scroll-top',behavior:command.type==='return-dashboard'?'smooth':'auto'}]);
    case 'set-history-search':
      next=createState(state);next.historyQuery=text(command.value);return renderHistoryResult(next);
    case 'toggle-history-choice':
      field=command.field;value=text(command.value).trim();
      if(CHOICE_FIELDS.indexOf(field)<0||!value)return unchanged(state);
      next=createState(state);ids=next[field].slice();index=ids.indexOf(value);
      if(index>=0)ids.splice(index,1);else ids.push(value);next[field]=ids;
      return renderHistoryResult(next);
    case 'set-history-proxy':
      if(PROXY_FILTERS.indexOf(command.value)<0)return unchanged(state);
      next=createState(state);next.historyProxy=command.value;return renderHistoryResult(next);
    case 'set-history-tax':
      if(TAX_FILTERS.indexOf(command.value)<0)return unchanged(state);
      next=createState(state);next.historyTaxExempt=command.value;return renderHistoryResult(next);
    case 'set-history-grouping':
      if(GROUPINGS.indexOf(command.value)<0)return unchanged(state);
      next=createState(state);next.historyGrouping=command.value;return renderHistoryResult(next);
    case 'toggle-history-panel':
      next=createState(state);next.historyFiltersOpen=!next.historyFiltersOpen;
      return result(next,[{type:'sync-history-filter-panel'}]);
    case 'clear-history-filters':
      next=resetFilters(createState(state),false);resetSelection(next,false);
      return result(next,[{type:'close-actions'},{type:'render-split'}]);
    case 'enter-selection':
      next=createState(state);next.selectionMode=true;next.selectedRecordIds={};next.expandedBatches={};
      return result(next,[{type:'close-actions'},{type:'render-split'}]);
    case 'cancel-selection':
      next=resetSelection(createState(state),false);return result(next,[{type:'render-split'}]);
    case 'toggle-record-selection':
      id=text(command.id).trim();if(!id)return unchanged(state);
      next=createState(state);map=truthMap(next.selectedRecordIds);
      if(map[id])delete map[id];else map[id]=true;next.selectedRecordIds=map;
      return result(next,[{type:'render-split'}]);
    case 'toggle-batch-selection':
      ids=uniqueStrings(command.ids);if(!ids.length)return unchanged(state);
      next=createState(state);map=truthMap(next.selectedRecordIds);allSelected=command.allSelected===true;
      ids.forEach(function(recordId){if(allSelected)delete map[recordId];else map[recordId]=true;});next.selectedRecordIds=map;
      return result(next,[{type:'render-split'}]);
    case 'toggle-select-all':
      ids=uniqueStrings(command.ids);next=createState(state);map={};
      if(!ids.length){next.selectedRecordIds=map;return result(next,[{type:'render-split'}]);}
      allSelected=ids.every(function(recordId){return !!next.selectedRecordIds[recordId];});
      if(!allSelected)ids.forEach(function(recordId){map[recordId]=true;});next.selectedRecordIds=map;
      return result(next,[{type:'render-split'}]);
    case 'toggle-batch-expanded':
      id=text(command.batchId).trim();if(!id)return unchanged(state);
      next=createState(state);map=truthMap(next.expandedBatches);
      if(map[id])delete map[id];else map[id]=true;next.expandedBatches=map;
      return result(next,[{type:'render-split'}]);
    case 'reset-selection':
      next=resetSelection(createState(state),command.clearExpanded===true);return result(next,[]);
    default:return unchanged(state);
    }
  }

  function activeHistoryFilterCount(state){
    var current=createState(state),count=0;
    if(current.historyCategories.length)count++;
    if(current.historyPayMethods.length)count++;
    if(current.track==='personal'&&current.historyProxy!=='all')count++;
    if(current.historyTaxExempt!=='all')count++;
    return count;
  }

  function createWorkflow(adapter){
    var target=adapter||{};
    if(typeof target.readState!=='function'||typeof target.writeState!=='function')throw new Error('Ledger UI workflow requires state adapter');
    function invoke(effect,state){
      var handler={
        'close-actions':'closeActions','render-split':'renderSplit','render-history-results':'renderHistoryResults',
        'sync-history-filter-panel':'syncHistoryFilterPanel','scroll-top':'scrollTop'
      }[effect.type];
      if(!handler||typeof target[handler]!=='function')throw new Error('Ledger UI workflow missing effect adapter: '+effect.type);
      if(effect.type==='sync-history-filter-panel')target[handler](state);
      else if(effect.type==='scroll-top')target[handler](effect.behavior);
      else target[handler]();
    }
    function dispatch(action){
      var outcome=transition(target.readState(),action);
      if(!outcome.changed)return outcome;
      target.writeState(outcome.state);
      outcome.effects.forEach(function(effect){invoke(effect,outcome.state);});
      return outcome;
    }
    return {dispatch:dispatch};
  }

  return {
    createState:createState,
    transition:transition,
    activeHistoryFilterCount:activeHistoryFilterCount,
    createWorkflow:createWorkflow
  };
});
