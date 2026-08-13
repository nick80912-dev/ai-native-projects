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
  function plainObject(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
  function cloneOpaque(value){
    var source=plainObject(value),next={};
    if(!source)return null;
    Object.keys(source).forEach(function(key){
      var item=source[key];
      next[key]=Array.isArray(item)?item.slice():item;
    });
    return next;
  }
  function formSession(value){
    var source=plainObject(value),sessionId=text(source&&source.sessionId).trim();
    if(!source||!sessionId)return null;
    return {
      sessionId:sessionId,
      mode:source.mode==='edit'?'edit':'add',
      itemId:text(source.itemId),
      returnContext:source.returnContext==='detail'?'detail':'list',
      returnScrollTop:Math.max(0,Number(source.returnScrollTop)||0),
      originalCategory:text(source.originalCategory),
      originalStopRef:text(source.originalStopRef),
      originalPhotoId:text(source.originalPhotoId),
      temporaryPhotoIds:uniqueStrings(source.temporaryPhotoIds),
      savePending:source.savePending===true,
      saveRequestId:text(source.saveRequestId).trim(),
      photoRequestId:text(source.photoRequestId).trim()
    };
  }
  function createState(seed){
    var source=seed&&typeof seed==='object'?seed:{};
    var session=formSession(source.formSession);
    return {
      tab:source.tab==='done'?'done':'pending',
      selectionMode:source.selectionMode===true,
      selected:truthMap(source.selected),
      form:session?cloneOpaque(source.form):null,
      formSession:session,
      photoError:session?text(source.photoError):''
    };
  }
  function result(state,effects){return {state:state,effects:effects||[],changed:true};}
  function unchanged(state){return {state:state,effects:[],changed:false};}
  function clearForm(state){state.form=null;state.formSession=null;state.photoError='';return state;}
  function matchesForm(state,command){
    return !!state.form&&!!state.formSession&&text(command.sessionId).trim()===state.formSession.sessionId;
  }
  function matchesFormSave(state,command){
    return matchesForm(state,command)&&state.formSession.savePending&&
      text(command.requestId).trim()===state.formSession.saveRequestId;
  }
  function matchesPhotoSave(state,command){
    return matchesForm(state,command)&&state.formSession.savePending&&
      text(command.requestId).trim()===state.formSession.photoRequestId;
  }

  function transition(current,action){
    var state=current&&typeof current==='object'?current:createState();
    var command=action&&typeof action==='object'?action:{};
    var next,id,ids,selected,allSelected,session,effects,previous;
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
    case 'open-form':
      session=formSession(command.session);
      if(!plainObject(command.form)||!session)return unchanged(state);
      next=createState(state);next.form=cloneOpaque(command.form);next.formSession=session;next.photoError='';
      return result(next,[{type:'clear-split'},{type:'render-form'},{type:'focus-form',target:'name',immediate:true}]);
    case 'replace-form':
      if(!matchesForm(state,command)||!plainObject(command.form))return unchanged(state);
      next=createState(state);next.form=cloneOpaque(command.form);
      if(command.clearPhotoError===true)next.photoError='';
      return result(next,command.render===false?[]:[{type:'render-form'}]);
    case 'clear-form':
      if(!state.formSession&&!state.form)return unchanged(state);
      session=state.formSession;next=clearForm(createState(state));effects=[];
      if(command.cleanup===true&&session&&session.temporaryPhotoIds.length)effects.push({type:'cleanup-photo-ids',ids:session.temporaryPhotoIds.slice()});
      if(command.unmount!==false)effects.push({type:'unmount-form'});
      return result(next,effects);
    case 'close-form':
      if(!matchesForm(state,command)||state.formSession.savePending)return unchanged(state);
      session=state.formSession;next=clearForm(createState(state));effects=[];
      if(session.temporaryPhotoIds.length)effects.push({type:'cleanup-photo-ids',ids:session.temporaryPhotoIds.slice()});
      effects.push({type:'unmount-form'});
      effects.push({type:'restore-form-context',session:session,item:command.item||null,cancelled:command.cancelled===true});
      return result(next,effects);
    case 'form-save-requested':
      id=text(command.requestId).trim();
      if(!matchesForm(state,command)||state.formSession.savePending||!id)return unchanged(state);
      next=createState(state);next.formSession.savePending=true;next.formSession.saveRequestId=id;next.formSession.photoRequestId='';
      return result(next,[{type:'sync-form-pending'}]);
    case 'form-save-failed':
      if(!matchesFormSave(state,command))return unchanged(state);
      next=createState(state);next.formSession.savePending=false;next.formSession.saveRequestId='';
      effects=[{type:'sync-form-pending'}];
      if(command.focusError)effects.push({type:'focus-form-error',error:command.focusError});
      if(command.notification)effects.push({type:'notify-form-result',notification:command.notification});
      return result(next,effects);
    case 'form-save-succeeded':
      if(!matchesFormSave(state,command))return unchanged(state);
      session=formSession(state.formSession);session.savePending=false;session.saveRequestId='';
      effects=[{type:'sync-form-pending'}];
      if(command.saveAnother===true){
        var nextSession=formSession(command.nextSession);
        if(!plainObject(command.nextForm)||!nextSession)return unchanged(state);
        next=createState(state);next.form=cloneOpaque(command.nextForm);next.formSession=nextSession;next.photoError='';
        effects.push({type:'render-today'},{type:'render-list'},{type:'render-form'},{type:'focus-form',target:'name',immediate:true});
        if(command.notification)effects.push({type:'notify-form-result',notification:command.notification});
        return result(next,effects);
      }
      next=clearForm(createState(state));
      effects.push({type:'unmount-form'},{type:'render-today'},{type:'render-list'});
      if(command.notification)effects.push({type:'notify-form-result',notification:command.notification});
      effects.push({type:'restore-form-context',session:session,item:command.item||null,cancelled:false});
      return result(next,effects);
    case 'photo-save-requested':
      id=text(command.requestId).trim();
      if(!matchesForm(state,command)||state.formSession.savePending||!id)return unchanged(state);
      next=createState(state);next.formSession.savePending=true;next.formSession.photoRequestId=id;next.formSession.saveRequestId='';next.photoError='';
      return result(next,[{type:'sync-form-pending'}]);
    case 'photo-save-succeeded':
      id=text(command.photoId).trim();
      if(!matchesPhotoSave(state,command)||!id)return unchanged(state);
      next=createState(state);previous=text(next.form.photoId).trim();next.form.photoId=id;
      next.formSession.temporaryPhotoIds=uniqueStrings(next.formSession.temporaryPhotoIds.concat([id]));
      next.formSession.savePending=false;next.formSession.photoRequestId='';next.photoError='';
      effects=[{type:'sync-form-pending'}];
      if(previous&&next.formSession.temporaryPhotoIds.indexOf(previous)>=0){
        next.formSession.temporaryPhotoIds=next.formSession.temporaryPhotoIds.filter(function(value){return value!==previous;});
        effects.push({type:'cleanup-photo-ids',ids:[previous]});
      }
      effects.push({type:'render-form'});
      if(command.notification)effects.push({type:'notify-form-result',notification:command.notification});
      return result(next,effects);
    case 'photo-save-failed':
      if(!matchesPhotoSave(state,command))return unchanged(state);
      next=createState(state);next.formSession.savePending=false;next.formSession.photoRequestId='';next.photoError=text(command.message);
      return result(next,[{type:'sync-form-pending'}]);
    case 'remove-form-photo':
      if(!matchesForm(state,command)||state.formSession.savePending)return unchanged(state);
      next=createState(state);next.form.photoId='';next.photoError='';
      return result(next,[{type:'render-form'}]);
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
        'focus-selection-control':'focusSelectionControl',
        'render-form':'renderForm',
        'focus-form':'focusForm',
        'focus-form-error':'focusFormError',
        'sync-form-pending':'syncFormPending',
        'unmount-form':'unmountForm',
        'restore-form-context':'restoreFormContext',
        'render-today':'renderToday',
        'cleanup-photo-ids':'cleanupPhotoIds',
        'notify-form-result':'notifyFormResult'
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
