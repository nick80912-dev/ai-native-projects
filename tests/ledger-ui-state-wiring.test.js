const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,name+' exists');
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){
    if(source[cursor]==='{')depth++;
    if(source[cursor]==='}')depth--;
    if(depth===0)return source.slice(start,cursor+1);
  }
  throw new Error('could not extract '+name);
}

assert.match(html,/<script src="ledger-ui-state\.js"><\/script>/,'Ledger UI state module is loaded by the runtime');
assert(sw.includes("'./ledger-ui-state.js'"),'Ledger UI state module belongs to the offline App Shell');
assert.match(html,/var ledgerUiState=TripLedgerUiState\.createState\(\);/,'the compatibility state starts from the canonical module defaults');
assert.match(html,/var ledgerUiWorkflow=TripLedgerUiState\.createWorkflow\(\{/,'production uses the same workflow seam as recording tests');
assert.match(html,/readState:function\(\)\{return ledgerUiState;\}/,'production adapter reads the compatibility state');
assert.match(html,/writeState:function\(next\)\{ledgerUiState=next;\}/,'workflow state commits replace the compatibility object before rendering');

const expectedActions={
  setLedgerTrack:'switch-track',
  toggleLedgerDisplayCurrency:'toggle-currency',
  showLedgerFullList:'open-history',
  clearLedgerHistoryFilters:'clear-history-filters',
  closeLedgerFullList:'close-history',
  returnLedgerDashboard:'return-dashboard',
  setLedgerHistoryFilter:'set-dashboard-filter',
  setLedgerHistorySearch:'set-history-search',
  toggleLedgerHistorySelection:'toggle-history-choice',
  setLedgerHistoryProxy:'set-history-proxy',
  setLedgerHistoryTaxExempt:'set-history-tax',
  setLedgerHistoryGrouping:'set-history-grouping',
  toggleLedgerHistoryFilters:'toggle-history-panel',
  enterLedgerSelectionMode:'enter-selection',
  cancelLedgerSelectionMode:'cancel-selection',
  toggleLedgerRecordSelection:'toggle-record-selection',
  toggleLedgerBatchSelection:'toggle-batch-selection',
  toggleLedgerSelectAll:'toggle-select-all',
  toggleLedgerBatchExpanded:'toggle-batch-expanded'
};
Object.keys(expectedActions).forEach(function(name){
  const source=extractFunction(html,name),action=expectedActions[name];
  assert(source.includes("ledgerUiWorkflow.dispatch({type:'"+action+"'"),name+' dispatches '+action+' through the workflow seam');
  assert.doesNotMatch(source,/ledgerUiState\.[A-Za-z0-9_]+\s*=/,name+' no longer directly mutates migrated state');
});

const countSource=extractFunction(html,'ledgerHistoryActiveFilterCount');
assert.match(countSource,/TripLedgerUiState\.activeHistoryFilterCount\(ledgerUiState\)/,'history filter count shares the module projection');

const productionSection=html.slice(html.indexOf('var ledgerUiState='),html.indexOf('function ledgerTrackRecords'));
assert(productionSection.includes('syncHistoryFilterPanel:function(state){syncLedgerHistoryFilterPanel(state);}'),'production adapter supports the partial filter-panel effect without rebuilding search DOM');

assert.doesNotMatch(html,/localStorage\.(?:setItem|getItem)\([^)]*ledgerUiState/,'Ledger UI workflow state remains session-only');
assert.doesNotMatch(extractFunction(html,'exportPersonalState'),/ledgerUiState/,'personal backups do not include Ledger UI state');
assert.doesNotMatch(extractFunction(html,'applyPersonalStatePayload'),/ledgerUiState/,'personal restores do not write Ledger UI state');

console.log('ledger UI state wiring tests passed');
