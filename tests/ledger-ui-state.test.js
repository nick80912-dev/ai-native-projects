const assert = require('assert');
const TripLedgerUiState = require('../ledger-ui-state.js');

function plain(value){return JSON.parse(JSON.stringify(value));}
function apply(state,action){return TripLedgerUiState.transition(state,action);}

const initial = TripLedgerUiState.createState();
assert.deepStrictEqual(plain(initial),{
  track:'personal',displayCurrency:'',page:'dashboard',filter:'all',sheet:null,
  selectedRecordId:'',draft:null,editing:null,correction:null,retainedParticipants:null,
  historyQuery:'',historyCategories:[],historyPayMethods:[],historyProxy:'all',
  historyTaxExempt:'all',historyFiltersOpen:false,historyGrouping:'date',
  calendarOpen:false,calendarYear:0,calendarMonth:0,expandedBatches:{},
  selectionMode:false,selectedRecordIds:{},savePending:false
},'fresh sessions keep the v94 canonical Ledger UI defaults');

const seededInput={
  track:'shared',page:'all',displayCurrency:'TWD',historyQuery:'藥妝',
  historyCategories:['採買','採買',''],historyPayMethods:['現金',null],
  historyProxy:'proxy',historyTaxExempt:'tax-exempt',historyGrouping:'category',
  selectedRecordIds:{a:true,b:false,'':true},expandedBatches:{batch:true,closed:false},
  selectionMode:true,draft:{amount:'500'},savePending:true
};
const seededBefore=plain(seededInput);
const seeded=TripLedgerUiState.createState(seededInput);
assert.deepStrictEqual(seededBefore,plain(seededInput),'seed normalization never mutates caller data');
assert.deepStrictEqual(plain(seeded.historyCategories),['採買']);
assert.deepStrictEqual(plain(seeded.historyPayMethods),['現金']);
assert.deepStrictEqual(plain(seeded.selectedRecordIds),{a:true});
assert.deepStrictEqual(plain(seeded.expandedBatches),{batch:true});
assert.strictEqual(seeded.draft,seededInput.draft,'unowned entry draft data remains an opaque reference');

const invalidSeed=TripLedgerUiState.createState({track:'team',page:'history',historyProxy:'mine',historyTaxExempt:'yes',historyGrouping:'merchant'});
assert.strictEqual(invalidSeed.track,'personal');
assert.strictEqual(invalidSeed.page,'dashboard');
assert.strictEqual(invalidSeed.historyProxy,'all');
assert.strictEqual(invalidSeed.historyTaxExempt,'all');
assert.strictEqual(invalidSeed.historyGrouping,'date');

const rich=TripLedgerUiState.createState({
  track:'personal',page:'all',displayCurrency:'TWD',filter:'proxy',historyQuery:'松屋',
  historyCategories:['餐飲'],historyPayMethods:['現金'],historyProxy:'proxy',
  historyTaxExempt:'tax-exempt',historyFiltersOpen:true,historyGrouping:'category',
  selectionMode:true,selectedRecordIds:{a:true},expandedBatches:{batch:true},draft:{amount:'500'}
});
const richBefore=plain(rich);
let outcome=apply(rich,{type:'switch-track',track:'shared'});
assert.deepStrictEqual(plain(rich),richBefore,'transitions never mutate their input state');
assert.strictEqual(outcome.state.track,'shared');
assert.strictEqual(outcome.state.page,'dashboard');
assert.strictEqual(outcome.state.displayCurrency,'');
assert.strictEqual(outcome.state.filter,'all');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.state.selectedRecordIds),{});
assert.deepStrictEqual(plain(outcome.state.expandedBatches),{});
assert.strictEqual(outcome.state.historyProxy,'all','shared history never retains a personal proxy filter');
assert.strictEqual(outcome.state.historyQuery,'松屋','track switching preserves other history filters');
assert.strictEqual(outcome.state.draft,rich.draft,'history transitions do not absorb entry draft state');
assert.deepStrictEqual(plain(outcome.effects),[{type:'close-actions'},{type:'render-split'}]);

let currency=apply(initial,{type:'toggle-currency',defaultCurrency:'JPY'});
assert.strictEqual(currency.state.displayCurrency,'TWD');
currency=apply(currency.state,{type:'toggle-currency',defaultCurrency:'JPY'});
assert.strictEqual(currency.state.displayCurrency,'JPY');
assert.deepStrictEqual(plain(currency.effects),[{type:'render-split'}]);

outcome=apply(rich,{type:'open-history'});
assert.strictEqual(outcome.state.page,'all');
assert.strictEqual(outcome.state.selectedRecordId,'');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.state.selectedRecordIds),{});
assert.strictEqual(outcome.state.historyQuery,'松屋','opening history preserves the current query and filters');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'close-actions'},{type:'render-split'},{type:'scroll-top',behavior:'auto'}
]);
outcome=apply(rich,{type:'set-dashboard-filter',value:'all'});
assert.strictEqual(outcome.state.filter,'all');
assert.deepStrictEqual(plain(outcome.effects),[{type:'render-split'}]);

outcome=apply(rich,{type:'close-history'});
assert.strictEqual(outcome.state.page,'dashboard');
assert.strictEqual(outcome.state.filter,'all');
assert.strictEqual(outcome.state.historyQuery,'');
assert.deepStrictEqual(plain(outcome.state.historyCategories),[]);
assert.deepStrictEqual(plain(outcome.state.historyPayMethods),[]);
assert.strictEqual(outcome.state.historyProxy,'all');
assert.strictEqual(outcome.state.historyTaxExempt,'all');
assert.strictEqual(outcome.state.historyFiltersOpen,false);
assert.strictEqual(outcome.state.historyGrouping,'date');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'close-actions'},{type:'render-split'},{type:'scroll-top',behavior:'auto'}
]);
outcome=apply(rich,{type:'return-dashboard'});
assert.deepStrictEqual(plain(outcome.effects[2]),{type:'scroll-top',behavior:'smooth'});

let history=initial;
history=apply(history,{type:'set-history-search',value:'  松屋  '}).state;
assert.strictEqual(history.historyQuery,'  松屋  ','search text is preserved exactly for the input');
history=apply(history,{type:'toggle-history-choice',field:'historyCategories',value:'餐飲'}).state;
history=apply(history,{type:'toggle-history-choice',field:'historyCategories',value:'採買'}).state;
history=apply(history,{type:'toggle-history-choice',field:'historyCategories',value:'餐飲'}).state;
assert.deepStrictEqual(plain(history.historyCategories),['採買']);
history=apply(history,{type:'toggle-history-choice',field:'historyPayMethods',value:'現金'}).state;
history=apply(history,{type:'set-history-proxy',value:'proxy'}).state;
history=apply(history,{type:'set-history-tax',value:'non-tax-exempt'}).state;
history=apply(history,{type:'set-history-grouping',value:'category'}).state;
assert.deepStrictEqual(plain(history.historyPayMethods),['現金']);
assert.strictEqual(history.historyProxy,'proxy');
assert.strictEqual(history.historyTaxExempt,'non-tax-exempt');
assert.strictEqual(history.historyGrouping,'category');
assert.strictEqual(TripLedgerUiState.activeHistoryFilterCount(history),4,'category, pay method, personal proxy and tax filters count by group');
assert.strictEqual(TripLedgerUiState.activeHistoryFilterCount(Object.assign({},history,{track:'shared'})),3,'shared excludes proxy while category, pay method and tax remain');

outcome=apply(history,{type:'toggle-history-panel'});
assert.strictEqual(outcome.state.historyFiltersOpen,true);
assert.deepStrictEqual(plain(outcome.effects),[{type:'sync-history-filter-panel'}]);

const clearing=TripLedgerUiState.createState(Object.assign({},history,{selectionMode:true,selectedRecordIds:{a:true},historyFiltersOpen:true}));
outcome=apply(clearing,{type:'clear-history-filters'});
assert.strictEqual(outcome.state.historyQuery,'  松屋  ','clear filters retains search');
assert.strictEqual(outcome.state.historyGrouping,'category','clear filters retains grouping');
assert.deepStrictEqual(plain(outcome.state.historyCategories),[]);
assert.deepStrictEqual(plain(outcome.state.historyPayMethods),[]);
assert.strictEqual(outcome.state.historyProxy,'all');
assert.strictEqual(outcome.state.historyTaxExempt,'all');
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.effects),[{type:'close-actions'},{type:'render-split'}]);

let selection=apply(rich,{type:'enter-selection'});
assert.strictEqual(selection.state.selectionMode,true);
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{});
assert.deepStrictEqual(plain(selection.state.expandedBatches),{});
assert.deepStrictEqual(plain(selection.effects),[{type:'close-actions'},{type:'render-split'}]);
selection=apply(selection.state,{type:'toggle-record-selection',id:'a'});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{a:true});
selection=apply(selection.state,{type:'toggle-record-selection',id:'a'});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{});
selection=apply(selection.state,{type:'toggle-batch-selection',ids:['a','b',''],allSelected:false});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{a:true,b:true});
selection=apply(selection.state,{type:'toggle-batch-selection',ids:['a','b'],allSelected:true});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{});
selection=apply(selection.state,{type:'toggle-select-all',ids:['a','b']});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{a:true,b:true});
selection=apply(selection.state,{type:'toggle-select-all',ids:['a','b']});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{});
selection=apply(Object.assign({},selection.state,{selectedRecordIds:{stale:true}}),{type:'toggle-select-all',ids:[]});
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{},'an empty visible set clears stale selection instead of retaining hidden IDs');
selection=apply(selection.state,{type:'toggle-batch-expanded',batchId:'batch-a'});
assert.deepStrictEqual(plain(selection.state.expandedBatches),{'batch-a':true});
selection=apply(selection.state,{type:'cancel-selection'});
assert.strictEqual(selection.state.selectionMode,false);
assert.deepStrictEqual(plain(selection.state.selectedRecordIds),{});

outcome=apply(rich,{type:'reset-selection',clearExpanded:true});
assert.strictEqual(outcome.state.selectionMode,false);
assert.deepStrictEqual(plain(outcome.state.selectedRecordIds),{});
assert.deepStrictEqual(plain(outcome.state.expandedBatches),{});
assert.deepStrictEqual(plain(outcome.effects),[],'reset-selection composes with existing callers without forcing a render');

[
  {type:'switch-track',track:'team'},
  {type:'toggle-history-choice',field:'historyQuery',value:'x'},
  {type:'set-history-proxy',value:'mine'},
  {type:'set-history-tax',value:'yes'},
  {type:'set-history-grouping',value:'merchant'},
  {type:'set-dashboard-filter',value:'mine'},
  {type:'toggle-record-selection',id:''},
  {type:'unknown'}
].forEach(function(action){
  const invalid=apply(initial,action);
  assert.strictEqual(invalid.state,initial,'invalid '+action.type+' action returns the original state');
  assert.strictEqual(invalid.changed,false);
  assert.deepStrictEqual(plain(invalid.effects),[]);
});

const events=[];
let workflowState=TripLedgerUiState.createState({historyQuery:'松屋',historyCategories:['餐飲'],selectionMode:true,selectedRecordIds:{a:true}});
const workflow=TripLedgerUiState.createWorkflow({
  readState:function(){events.push(['read']);return workflowState;},
  writeState:function(next){events.push(['write',next.page,next.historyQuery]);workflowState=next;},
  closeActions:function(){events.push(['close-actions',workflowState.page]);},
  renderSplit:function(){events.push(['render-split',workflowState.page,workflowState.historyQuery]);},
  renderHistoryResults:function(){events.push(['render-history-results',workflowState.historyQuery]);},
  syncHistoryFilterPanel:function(state){events.push(['sync-history-filter-panel',state.historyFiltersOpen]);},
  scrollTop:function(behavior){events.push(['scroll-top',behavior,workflowState.page]);}
});
outcome=workflow.dispatch({type:'close-history'});
assert.strictEqual(outcome.changed,true);
assert.deepStrictEqual(events,[
  ['read'],['write','dashboard',''],['close-actions','dashboard'],
  ['render-split','dashboard',''],['scroll-top','auto','dashboard']
],'workflow commits state before executing ordered UI effects');
events.length=0;
outcome=workflow.dispatch({type:'set-history-search',value:'新搜尋'});
assert.deepStrictEqual(events,[['read'],['write','dashboard','新搜尋'],['render-history-results','新搜尋']]);
events.length=0;
outcome=workflow.dispatch({type:'set-history-proxy',value:'bad'});
assert.strictEqual(outcome.changed,false);
assert.deepStrictEqual(events,[['read']],'invalid actions do not write or render');

console.log('ledger UI state tests passed');
