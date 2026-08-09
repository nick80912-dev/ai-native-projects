const assert=require('assert');
const TripShoppingUiState=require('../shopping-ui-state.js');

function plain(value){return JSON.parse(JSON.stringify(value));}
function apply(state,action){return TripShoppingUiState.transition(state,action);}

const initial=TripShoppingUiState.createState();
assert.deepStrictEqual(plain(initial),{
  tab:'pending',selectionMode:false,selected:{}
});

const seed={tab:'other',selectionMode:true,selected:{a:true,b:false,'':true}};
const seedBefore=plain(seed);
assert.deepStrictEqual(plain(TripShoppingUiState.createState(seed)),{
  tab:'pending',selectionMode:true,selected:{a:true}
});
assert.deepStrictEqual(plain(seed),seedBefore,'seed normalization does not mutate caller data');

const rich=TripShoppingUiState.createState({tab:'done',selectionMode:true,selected:{a:true}});
const richBefore=plain(rich);
let outcome=apply(rich,{type:'open-list'});
assert.deepStrictEqual(plain(rich),richBefore,'transitions do not mutate input state');
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'pending',selectionMode:false,selected:{}},
  effects:[{type:'render-list'}],changed:true
});

outcome=apply(rich,{type:'set-tab',tab:'done'});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'done',selectionMode:false,selected:{}},
  effects:[{type:'clear-split'},{type:'render-list'}],changed:true
});
outcome=apply(rich,{type:'set-tab',tab:'pending'});
assert.strictEqual(outcome.state.tab,'pending');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.state.selected),{});

outcome=apply(initial,{type:'toggle-selection-mode'});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'pending',selectionMode:true,selected:{}},
  effects:[{type:'render-list'}],changed:true
});
outcome=apply(TripShoppingUiState.createState({selectionMode:true,selected:{a:true}}),{type:'toggle-selection-mode'});
assert.deepStrictEqual(plain(outcome.state),{tab:'pending',selectionMode:false,selected:{}});

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
  state:{tab:'done',selectionMode:false,selected:{}},effects:[],changed:true
});

outcome=apply(rich,{type:'prune-selection',ids:['a']});
assert.deepStrictEqual(plain(outcome),{
  state:{tab:'done',selectionMode:true,selected:{}},effects:[],changed:true
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

console.log('shopping UI state tests passed');
