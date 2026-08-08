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

  function createState(seed){
    var source=seed&&typeof seed==='object'?seed:{};
    return {
      track:oneOf(source.track,TRACKS,'personal'),
      displayCurrency:oneOf(source.displayCurrency,['','JPY','TWD'],''),
      page:oneOf(source.page,PAGES,'dashboard'),
      filter:oneOf(source.filter,['all','proxy'],'all'),
      sheet:source.sheet==null?null:source.sheet,
      selectedRecordId:text(source.selectedRecordId),
      draft:source.draft==null?null:source.draft,
      editing:source.editing==null?null:source.editing,
      correction:source.correction==null?null:source.correction,
      retainedParticipants:source.retainedParticipants==null?null:source.retainedParticipants,
      historyQuery:text(source.historyQuery),
      historyCategories:uniqueStrings(source.historyCategories),
      historyPayMethods:uniqueStrings(source.historyPayMethods),
      historyProxy:oneOf(source.historyProxy,PROXY_FILTERS,'all'),
      historyTaxExempt:oneOf(source.historyTaxExempt,TAX_FILTERS,'all'),
      historyFiltersOpen:source.historyFiltersOpen===true,
      historyGrouping:oneOf(source.historyGrouping,GROUPINGS,'date'),
      calendarOpen:source.calendarOpen===true,
      calendarYear:numberOrZero(source.calendarYear),
      calendarMonth:numberOrZero(source.calendarMonth),
      expandedBatches:truthMap(source.expandedBatches),
      selectionMode:source.selectionMode===true,
      selectedRecordIds:truthMap(source.selectedRecordIds),
      savePending:source.savePending===true
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
      ids=uniqueStrings(command.ids);if(!ids.length)return unchanged(state);
      next=createState(state);allSelected=ids.every(function(recordId){return !!next.selectedRecordIds[recordId];});map={};
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
