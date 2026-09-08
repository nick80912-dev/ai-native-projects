const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('shell/v113/index.html','utf8');
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

const openCreateSource=extractFunction(html,'openLedgerEntrySheet');
const openEditSource=extractFunction(html,'editLedgerRecord');
const closeEntrySource=extractFunction(html,'closeLedgerEntrySheet');
const trackEntrySource=extractFunction(html,'setLedgerDraftTrack');
const toggleCalendarSource=extractFunction(html,'toggleLedgerCalendar');
const shiftCalendarSource=extractFunction(html,'shiftLedgerCalendar');
const selectCalendarSource=extractFunction(html,'selectLedgerCalendarDate');
const closeCalendarSource=extractFunction(html,'closeLedgerCalendar');

assert.match(openCreateSource,/ledgerUiWorkflow\.dispatch\(\{type:'open-entry-create'/,'create entry opens through the workflow');
assert.match(openEditSource,/ledgerUiWorkflow\.dispatch\(\{type:'open-entry-edit'/,'edit entry opens through the workflow');
assert.match(closeEntrySource,/ledgerUiWorkflow\.dispatch\(\{type:'close-entry'/,'ordinary entry close goes through the workflow');
assert.match(closeEntrySource,/ledgerUiWorkflow\.dispatch\(\{type:'close-correction'/,'correction close goes through the same workflow');
assert.doesNotMatch(openCreateSource,/ledgerUiState\.(?:draft|editing|sheet|savePending)\s*=/,'create no longer mutates owned session boundaries');
assert.doesNotMatch(openEditSource,/ledgerUiState\.(?:draft|editing|sheet|savePending)\s*=/,'edit no longer mutates owned session boundaries');
assert.match(trackEntrySource,/type:'entry-track-switched'/,'entry track switching installs its planned draft through the workflow');
assert.match(toggleCalendarSource,/type:'toggle-entry-calendar'/);
assert.match(shiftCalendarSource,/type:'shift-entry-calendar'/);
assert.match(selectCalendarSource,/type:'select-entry-calendar-date'/);
assert.match(closeCalendarSource,/type:'close-entry-calendar'/);

const correctionSource=extractFunction(html,'openLedgerCorrectionSheet');
assert.match(correctionSource,/ledgerUiWorkflow\.dispatch\(\{\s*type:'open-correction'/,'correction opens through the existing Ledger workflow');
assert.doesNotMatch(correctionSource,/ledgerUiState\.(?:track|draft|editing|correction|sheet|savePending)\s*=/,'correction open no longer mutates workflow-owned state');
assert.match(extractFunction(html,'updateLedgerCorrectionReason'),/type:'update-correction-reason'/,'correction reason updates through the workflow');

const saveEntrySource=extractFunction(html,'saveLedgerEntry');
const commitEntrySource=extractFunction(html,'commitLedgerEntrySave');
const finishEntrySource=extractFunction(html,'finishLedgerEntrySaveUi');
const failEntrySource=extractFunction(html,'failLedgerEntrySaveUi');
const correctionSaveSource=extractFunction(html,'saveLedgerCorrection');
assert.match(saveEntrySource,/type:'entry-save-requested'/,'create/edit save starts through the workflow');
assert.match(finishEntrySource,/type:'entry-save-succeeded'/,'create/edit success finishes through the workflow');
assert.match(failEntrySource,/type:'entry-save-failed'/,'create/edit failure finishes through the workflow');
[saveEntrySource,commitEntrySource,finishEntrySource,failEntrySource].forEach(function(source){
  assert.doesNotMatch(source,/ledgerUiState\.(?:draft|editing|sheet|savePending)\s*=/,'migrated save paths do not directly mutate owned session boundaries');
});
assert.match(correctionSaveSource,/type:'correction-preview-installed'/,'correction preview installation uses a semantic workflow action');
assert.match(correctionSaveSource,/type:'correction-save-requested'/,'correction persistence is request guarded');
assert.match(correctionSaveSource,/type:'correction-save-succeeded'/,'correction success closes through the workflow');
assert.match(correctionSaveSource,/type:'correction-save-failed'/,'correction failure unlocks through the workflow');
assert.doesNotMatch(html,/function syncLegacyCorrectionSavePending\(/,'the compatibility pending helper is deleted');
assert.doesNotMatch(toggleCalendarSource,/if\(ledgerUiState\.correction\)/,'calendar toggle has no correction-only direct mutation branch');
assert.doesNotMatch(shiftCalendarSource,/if\(ledgerUiState\.correction\)/,'calendar shift has no correction-only direct mutation branch');
assert.doesNotMatch(selectCalendarSource,/if\(ledgerUiState\.correction\)/,'calendar selection has no correction-only direct mutation branch');
assert.doesNotMatch(closeCalendarSource,/if\(ledgerUiState\.correction\)/,'calendar close has no correction-only direct mutation branch');

assert.doesNotMatch(html,/localStorage\.(?:setItem|getItem)\([^)]*ledgerUiState/,'Ledger UI workflow state remains session-only');
assert.doesNotMatch(extractFunction(html,'exportPersonalState'),/ledgerUiState/,'personal backups do not include Ledger UI state');
assert.doesNotMatch(extractFunction(html,'applyPersonalStatePayload'),/ledgerUiState/,'personal restores do not write Ledger UI state');

console.log('ledger UI state wiring tests passed');
