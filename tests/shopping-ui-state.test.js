const assert=require('assert');
const TripShoppingUiState=require('../shopping-ui-state.js');

function plain(value){return JSON.parse(JSON.stringify(value));}
function apply(state,action){return TripShoppingUiState.transition(state,action);}

const initial=TripShoppingUiState.createState();
assert.deepStrictEqual(plain(initial),{
  tab:'pending',selectionMode:false,selected:{},form:null,formSession:null,photoError:''
});

const seed={tab:'other',selectionMode:true,selected:{a:true,b:false,'':true}};
const seedBefore=plain(seed);
assert.deepStrictEqual(plain(TripShoppingUiState.createState(seed)),{
  tab:'pending',selectionMode:true,selected:{a:true},form:null,formSession:null,photoError:''
});
assert.deepStrictEqual(plain(seed),seedBefore,'seed normalization does not mutate caller data');

const rich=TripShoppingUiState.createState({tab:'done',selectionMode:true,selected:{a:true}});
const richBefore=plain(rich);
let outcome=apply(rich,{type:'open-list'});
assert.deepStrictEqual(plain(rich),richBefore,'transitions do not mutate input state');
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'pending',selectionMode:false,selected:{},form:null,formSession:null,photoError:''},
  effects:[{type:'render-list'}],changed:true
});

outcome=apply(rich,{type:'set-tab',tab:'done'});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'done',selectionMode:false,selected:{},form:null,formSession:null,photoError:''},
  effects:[{type:'clear-split'},{type:'render-list'}],changed:true
});
outcome=apply(rich,{type:'set-tab',tab:'pending'});
assert.strictEqual(outcome.state.tab,'pending');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.state.selected),{});

outcome=apply(initial,{type:'toggle-selection-mode'});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'pending',selectionMode:true,selected:{},form:null,formSession:null,photoError:''},
  effects:[{type:'render-list'}],changed:true
});
outcome=apply(TripShoppingUiState.createState({selectionMode:true,selected:{a:true}}),{type:'toggle-selection-mode'});
assert.deepStrictEqual(plain(outcome.state),{tab:'pending',selectionMode:false,selected:{},form:null,formSession:null,photoError:''});

let selection=TripShoppingUiState.createState({selectionMode:true});
outcome=apply(selection,{type:'set-item-selection',id:'a',selected:true});
assert.deepStrictEqual(plain(outcome.state.selected),{a:true});
assert.deepStrictEqual(plain(outcome.effects),[{type:'render-list'}]);
selection=outcome.state;
outcome=apply(selection,{type:'set-item-selection',id:'a',selected:false});
assert.deepStrictEqual(plain(outcome.state.selected),{});

const ids=['a','b','a',''];
const idsBefore=plain(ids);
selection=TripShoppingUiState.createState({selectionMode:true,selected:{stale:true}});
outcome=apply(selection,{type:'toggle-visible-selection',ids});
assert.deepStrictEqual(plain(outcome.state.selected),{a:true,b:true},'visible selection replaces stale IDs');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'render-list'},{type:'focus-selection-control'}
]);
assert.deepStrictEqual(ids,idsBefore,'visible ID input is unchanged');
outcome=apply(outcome.state,{type:'toggle-visible-selection',ids:['a','b']});
assert.deepStrictEqual(plain(outcome.state.selected),{});
outcome=apply(TripShoppingUiState.createState({selectionMode:true,selected:{stale:true}}),{
  type:'toggle-visible-selection',ids:[]
});
assert.deepStrictEqual(plain(outcome.state.selected),{},'empty visible set clears stale selection');

outcome=apply(rich,{type:'reset-selection'});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'done',selectionMode:false,selected:{},form:null,formSession:null,photoError:''},effects:[],changed:true
});

outcome=apply(rich,{type:'prune-selection',ids:['a']});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'done',selectionMode:true,selected:{},form:null,formSession:null,photoError:''},effects:[],changed:true
});
outcome=apply(TripShoppingUiState.createState({selectionMode:true,selected:{a:true,b:true}}),{
  type:'prune-selection',ids:['a','a','']
});
assert.deepStrictEqual(plain(outcome.state.selected),{b:true});

[
  {type:'set-tab',tab:'other'},
  {type:'set-item-selection',id:'a',selected:true},
  {type:'set-item-selection',id:'',selected:true},
  {type:'toggle-visible-selection',ids:'a'},
  {type:'prune-selection',ids:'a'},
  {type:'unknown'},
  null
].forEach(function(action){
  const invalid=apply(initial,action);
  assert.strictEqual(invalid.state,initial,'invalid action preserves the original state');
  assert.strictEqual(invalid.changed,false);
  assert.deepStrictEqual(plain(invalid.effects),[]);
});

const events=[];
let workflowState=TripShoppingUiState.createState({tab:'pending',selectionMode:true,selected:{a:true}});
const workflow=TripShoppingUiState.createWorkflow({
  readState:function(){events.push('read');return workflowState;},
  writeState:function(next){workflowState=next;events.push('write:'+next.tab);},
  clearSplit:function(){events.push('clear-split:'+workflowState.tab);},
  renderList:function(){events.push('render-list:'+workflowState.tab);},
  focusSelectionControl:function(){events.push('focus-selection-control:'+workflowState.tab);}
});
outcome=workflow.dispatch({type:'set-tab',tab:'done'});
assert.strictEqual(outcome.changed,true);
assert.deepStrictEqual(events,[
  'read','write:done','clear-split:done','render-list:done'
],'workflow commits state before ordered effects');
events.length=0;
workflow.dispatch({type:'toggle-selection-mode'});
workflow.dispatch({type:'toggle-visible-selection',ids:['a']});
assert.deepStrictEqual(events,[
  'read','write:done','render-list:done',
  'read','write:done','render-list:done','focus-selection-control:done'
]);
events.length=0;
outcome=workflow.dispatch({type:'unknown'});
assert.strictEqual(outcome.changed,false);
assert.deepStrictEqual(events,['read'],'invalid actions do not write or render');

assert.throws(()=>TripShoppingUiState.createWorkflow({}),/readState/);
assert.throws(()=>TripShoppingUiState.createWorkflow({readState:function(){},writeState:null}),/writeState/);
const incomplete=TripShoppingUiState.createWorkflow({
  readState:function(){return initial;},writeState:function(){}
});
assert.throws(()=>incomplete.dispatch({type:'open-list'}),/renderList/);

assert.strictEqual(initial.form,null,'Shopping workflow owns an empty form slot');
assert.strictEqual(initial.formSession,null,'Shopping workflow owns an empty form session slot');
assert.strictEqual(initial.photoError,'','Shopping workflow owns the inline photo error');

const addForm={id:'',name:'白桃',category:'必買',stopRef:'stop-a',photoId:''};
const addSession={
  sessionId:'shopping-form-1',mode:'add',itemId:'',returnContext:'list',returnScrollTop:640,
  originalCategory:'',originalStopRef:'',originalPhotoId:'',temporaryPhotoIds:[],
  savePending:false,saveRequestId:'',photoRequestId:''
};
outcome=apply(initial,{type:'open-form',form:addForm,session:addSession});
assert.deepStrictEqual(plain(outcome.state.form),addForm);
assert.deepStrictEqual(plain(outcome.state.formSession),addSession);
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'clear-split'},{type:'render-form'},{type:'focus-form',target:'name',immediate:true}
]);
assert.deepStrictEqual(addSession.temporaryPhotoIds,[],'opening a form does not mutate the session seed');

let formState=outcome.state;
outcome=apply(formState,{type:'form-save-requested',sessionId:'shopping-form-1',requestId:'shopping-save-1'});
assert.strictEqual(outcome.state.formSession.savePending,true);
assert.strictEqual(outcome.state.formSession.saveRequestId,'shopping-save-1');
assert.deepStrictEqual(plain(outcome.effects),[{type:'sync-form-pending'}]);
assert.strictEqual(apply(outcome.state,{type:'close-form',sessionId:'shopping-form-1'}).changed,false,'pending form cannot close');

outcome=apply(outcome.state,{type:'form-save-failed',sessionId:'shopping-form-1',requestId:'shopping-save-1'});
assert.strictEqual(outcome.state.formSession.savePending,false);
assert.strictEqual(outcome.state.formSession.saveRequestId,'');
assert.deepStrictEqual(plain(outcome.effects),[{type:'sync-form-pending'}]);

outcome=apply(formState,{type:'photo-save-requested',sessionId:'shopping-form-1',requestId:'shopping-photo-1'});
assert.strictEqual(outcome.state.formSession.savePending,true);
assert.strictEqual(outcome.state.formSession.photoRequestId,'shopping-photo-1');
outcome=apply(outcome.state,{type:'photo-save-succeeded',sessionId:'shopping-form-1',requestId:'shopping-photo-1',photoId:'photo-new'});
assert.strictEqual(outcome.state.form.photoId,'photo-new');
assert.deepStrictEqual(plain(outcome.state.formSession.temporaryPhotoIds),['photo-new']);
assert.strictEqual(outcome.state.formSession.savePending,false);
assert.strictEqual(outcome.state.photoError,'');
assert.strictEqual(apply(outcome.state,{type:'photo-save-failed',sessionId:'shopping-form-old',requestId:'shopping-photo-1',message:'stale'}).changed,false,'stale photo completion is ignored');

const pendingPhoto=apply(formState,{type:'photo-save-requested',sessionId:'shopping-form-1',requestId:'shopping-photo-2'}).state;
outcome=apply(pendingPhoto,{type:'photo-save-failed',sessionId:'shopping-form-1',requestId:'shopping-photo-2',message:'儲存空間不足'});
assert.strictEqual(outcome.state.formSession.savePending,false);
assert.strictEqual(outcome.state.photoError,'儲存空間不足');
assert.deepStrictEqual(plain(outcome.effects),[{type:'sync-form-pending'},{type:'render-form'}]);

const saving=apply(formState,{type:'form-save-requested',sessionId:'shopping-form-1',requestId:'shopping-save-2'}).state;
const nextForm={id:'',name:'',category:'必買',stopRef:'stop-a',photoId:''};
const nextSession=Object.assign({},addSession,{sessionId:'shopping-form-2',returnScrollTop:640});
outcome=apply(saving,{type:'form-save-succeeded',sessionId:'shopping-form-1',requestId:'shopping-save-2',saveAnother:true,nextForm,nextSession,notification:'採買項目已新增'});
assert.deepStrictEqual(plain(outcome.state.form),nextForm);
assert.strictEqual(outcome.state.formSession.sessionId,'shopping-form-2');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'sync-form-pending'},{type:'render-today'},{type:'render-list'},{type:'render-form'},
  {type:'focus-form',target:'name',immediate:true},{type:'notify-form-result',notification:'採買項目已新增'}
]);

outcome=apply(saving,{type:'form-save-succeeded',sessionId:'shopping-form-1',requestId:'shopping-save-2',item:{id:'saved-1'},notification:'採買項目已新增'});
assert.strictEqual(outcome.state.form,null);
assert.strictEqual(outcome.state.formSession,null);
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'sync-form-pending'},{type:'unmount-form'},{type:'render-today'},{type:'render-list'},
  {type:'notify-form-result',notification:'採買項目已新增'},
  {type:'restore-form-context',session:addSession,item:{id:'saved-1'},cancelled:false}
]);

const formEvents=[];
let ownedFormState=TripShoppingUiState.createState();
const formWorkflow=TripShoppingUiState.createWorkflow({
  readState(){formEvents.push('read');return ownedFormState;},
  writeState(next){ownedFormState=next;formEvents.push('write:'+String(next.form&&next.form.name||''));},
  clearSplit(){formEvents.push('clear:'+String(ownedFormState.form&&ownedFormState.form.name||''));},
  renderForm(){formEvents.push('render:'+String(ownedFormState.form&&ownedFormState.form.name||''));},
  focusForm(){formEvents.push('focus');}
});
formWorkflow.dispatch({type:'open-form',form:addForm,session:addSession});
assert.deepStrictEqual(formEvents,['read','write:白桃','clear:白桃','render:白桃','focus'],'form effects observe committed state in order');

console.log('shopping UI state tests passed');
