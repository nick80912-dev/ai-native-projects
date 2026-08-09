(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripShoppingUiState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function text(value){return String(value==null?'':value);}
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
  function createState(seed){
    var source=seed&&typeof seed==='object'?seed:{};
    return {
      tab:source.tab==='done'?'done':'pending',
      selectionMode:source.selectionMode===true,
      selected:truthMap(source.selected)
    };
  }
  function result(state,effects){return {state:state,effects:effects||[],changed:true};}
  function unchanged(state){return {state:state,effects:[],changed:false};}

  function transition(current,action){
    var state=current&&typeof current==='object'?current:createState();
    var command=action&&typeof action==='object'?action:{};
    var next,id,ids,selected,allSelected;
    switch(command.type){
    case 'open-list':
      next=createState(state);next.tab='pending';next.selectionMode=false;next.selected={};
      return result(next,[{type:'render-list'}]);
    case 'set-tab':
      if(command.tab!=='pending'&&command.tab!=='done')return unchanged(state);
      next=createState(state);next.tab=command.tab;next.selectionMode=false;next.selected={};
      return result(next,[{type:'clear-split'},{type:'render-list'}]);
    case 'toggle-selection-mode':
      next=createState(state);next.selectionMode=!next.selectionMode;next.selected={};
      return result(next,[{type:'render-list'}]);
    case 'set-item-selection':
      id=text(command.id).trim();
      if(!state.selectionMode||!id||typeof command.selected!=='boolean')return unchanged(state);
      next=createState(state);selected=truthMap(next.selected);
      if(command.selected)selected[id]=true;else delete selected[id];
      next.selected=selected;
      return result(next,[{type:'render-list'}]);
    case 'toggle-visible-selection':
      if(!state.selectionMode||!Array.isArray(command.ids))return unchanged(state);
      ids=uniqueStrings(command.ids);selected=truthMap(state.selected);
      allSelected=ids.length>0&&ids.every(function(value){return !!selected[value];});
      next=createState(state);next.selected={};
      if(!allSelected)ids.forEach(function(value){next.selected[value]=true;});
      return result(next,[{type:'render-list'},{type:'focus-selection-control'}]);
    case 'reset-selection':
      next=createState(state);next.selectionMode=false;next.selected={};
      return result(next,[]);
    case 'prune-selection':
      if(!Array.isArray(command.ids))return unchanged(state);
      ids=uniqueStrings(command.ids);
      if(!ids.length)return unchanged(state);
      next=createState(state);selected=truthMap(next.selected);
      ids.forEach(function(value){delete selected[value];});next.selected=selected;
      return result(next,[]);
    default:
      return unchanged(state);
    }
  }

  function createWorkflow(adapter){
    var target=adapter&&typeof adapter==='object'?adapter:{};
    if(typeof target.readState!=='function')throw new Error('Shopping UI workflow requires readState');
    if(typeof target.writeState!=='function')throw new Error('Shopping UI workflow requires writeState');
    function runEffect(effect,state){
      var method={
        'clear-split':'clearSplit',
        'render-list':'renderList',
        'focus-selection-control':'focusSelectionControl'
      }[effect.type];
      if(!method||typeof target[method]!=='function')throw new Error('Shopping UI workflow requires '+(method||effect.type));
      target[method](state,effect);
    }
    return {
      dispatch:function(action){
        var outcome=transition(target.readState(),action);
        if(!outcome.changed)return outcome;
        target.writeState(outcome.state);
        outcome.effects.forEach(function(effect){runEffect(effect,outcome.state);});
        return outcome;
      }
    };
  }

  return {createState:createState,transition:transition,createWorkflow:createWorkflow};
});
