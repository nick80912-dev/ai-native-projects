const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function plain(value){return JSON.parse(JSON.stringify(value));}
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

const helperStart=html.indexOf('/* ================= ledgerRepository');
const helperEnd=html.indexOf('/* ================= 分帳(雲端 Ledger)',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'ledger helper section exists');
const helperSandbox={
  console:{log(){},warn(){},error(){}},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){return Promise.reject(new Error('offline'));},setTimeout,clearTimeout,
  Date,Math,Promise,JSON,String,Number,isFinite,
  timestampDate(value){return new Date(Number(value));},
  AppLog:{repo(){},sync(){}},renderSplit(){},updateLedgerPendingStatus(){}
};
vm.createContext(helperSandbox);
vm.runInContext(html.slice(helperStart,helperEnd),helperSandbox);

const dated=[
  {id:'old',time:'2026-07-18T23:00:00+08:00',batchId:''},
  {id:'new-a',time:'2026-07-19T08:00:00+08:00',batchId:'batch-new'},
  {id:'new-b',time:'2026-07-19T09:00:00+08:00',batchId:'batch-new'},
  {id:'invalid',time:'not-a-date',batchId:''}
];
assert.deepStrictEqual(
  Array.from(helperSandbox.selectLatestLedgerDateExpenses(dated),record=>record.id),
  ['new-b','new-a'],
  'recent expenses contain every valid record from the newest device-local date only'
);
assert.strictEqual(helperSandbox.formatLedgerDateKey('2026-07-19'),'2026/07/19');

const deletion=helperSandbox.createLedgerDeletion(dated[2],'Bar','輸入錯誤',Date.parse('2026-07-20T08:00:00+08:00'),()=>0.5);
const effective=helperSandbox.effectiveLedgerRecords(dated.slice(0,3).concat(deletion));
assert.deepStrictEqual(
  Array.from(helperSandbox.selectLatestLedgerDateExpenses(effective),record=>record.id),
  ['new-a'],
  'deleting one newest-day item keeps the remaining newest-day item'
);
const allNewestDeleted=helperSandbox.effectiveLedgerRecords(dated.slice(0,3).concat([
  deletion,
  helperSandbox.createLedgerDeletion(dated[1],'Bar','輸入錯誤',Date.parse('2026-07-20T08:01:00+08:00'),()=>0.6)
]));
assert.deepStrictEqual(
  Array.from(helperSandbox.selectLatestLedgerDateExpenses(allNewestDeleted),record=>record.id),
  ['old'],
  'deleting the whole newest date falls back to the next effective date'
);

const selectionSandbox={
  ledgerUiState:{page:'dashboard',selectedRecordIds:{}},
  ledgerTrackRecords(){return dated.slice(0,3);},
  ledgerHistoryFilteredRecords(records){return records.filter(record=>record.id!=='old');},
  selectLatestLedgerDateExpenses:helperSandbox.selectLatestLedgerDateExpenses,
  canDeleteLedgerRecord(){return true;}
};
vm.createContext(selectionSandbox);
vm.runInContext(extractFunction(html,'ledgerSelectionVisibleRecords'),selectionSandbox);
assert.deepStrictEqual(Array.from(selectionSandbox.ledgerSelectionVisibleRecords(),record=>record.id),['new-b','new-a'],'dashboard selection uses the newest date');
selectionSandbox.ledgerUiState.page='all';
assert.deepStrictEqual(Array.from(selectionSandbox.ledgerSelectionVisibleRecords(),record=>record.id),['new-a','new-b'],'history selection uses current filtered results');

const universeRecords=[{id:'formal',detail:'正式'},{id:'test',detail:'[TEST] 測試'}];
assert.deepStrictEqual(Array.from(helperSandbox.ledgerUniverseRecords(universeRecords,'formal'),record=>record.id),['formal'],'formal history excludes TEST records');
assert.deepStrictEqual(Array.from(helperSandbox.ledgerUniverseRecords(universeRecords,'test'),record=>record.id),['test'],'TEST history excludes formal records');

const selectedClicks=[],openedDetails=[];
const cardClickSandbox={ledgerUiState:{selectionMode:true},toggleLedgerRecordSelection(id){selectedClicks.push(id);},openLedgerRecordDetail(id){openedDetails.push(id);}};
vm.createContext(cardClickSandbox);
vm.runInContext(extractFunction(html,'handleLedgerRecordCardClick'),cardClickSandbox);
cardClickSandbox.handleLedgerRecordCardClick('record-a');
assert.deepStrictEqual(plain(selectedClicks),['record-a'],'selection-mode card clicks toggle selection');
assert.deepStrictEqual(plain(openedDetails),[],'selection-mode card clicks do not open detail');
cardClickSandbox.ledgerUiState.selectionMode=false;
cardClickSandbox.handleLedgerRecordCardClick('record-b');
assert.deepStrictEqual(plain(openedDetails),['record-b'],'normal card clicks still open detail');

const rendererSandbox={
  ledgerUiState:{selectionMode:true,selectedRecordIds:{a:true},expandedBatches:{}},
  ledgerRecordMetadata(){return {isProxy:false,isTaxFree:false};},isTestLedgerRecord(){return false;},ledgerRecordParticipantLabel(){return '1 人分攤';},
  ledgerCategoryEmoji(){return '🍜';},escapeHtml(value){return String(value||'');},jsHtmlAttrString(value){return String(value||'');},
  formatLedgerDualAmounts(){return '<span>amount</span>';},renderLedgerSelectionControl(){return '<input type="checkbox">';},
  renderLedgerRecentRecord(record){return '<article data-child="'+record.id+'"></article>';}
};
vm.createContext(rendererSandbox);
vm.runInContext(extractFunction(html,'ledgerAmountTotals')+'\n'+extractFunction(html,'formatLedgerInlineTotals'),rendererSandbox);
const dailyTotals=plain(rendererSandbox.ledgerAmountTotals([
  {amountJpy:1200,amountTwd:264},
  {amountJpy:'2300',amountTwd:'506'}
]));
assert.deepStrictEqual(dailyTotals,{amountJpy:3500,amountTwd:770},'daily totals add each physical record exactly once');
assert.strictEqual(rendererSandbox.formatLedgerInlineTotals(dailyTotals),'¥3,500 ≈ NT$770','inline totals use the fixed JPY to TWD format');
vm.runInContext(extractFunction(html,'renderLedgerDateSummary'),rendererSandbox);
const dateSummary=rendererSandbox.renderLedgerDateSummary('2026/07/20',[
  {amountJpy:1200,amountTwd:264},{amountJpy:2300,amountTwd:506}
],true);
assert(dateSummary.includes('2026/07/20 · 2 筆紀錄'),'latest-day summary includes the physical record count');
assert(dateSummary.includes('¥3,500 ≈ NT$770'),'latest-day summary includes fixed dual-currency totals');
vm.runInContext(extractFunction(html,'ledgerBatchSelectionState')+'\n'+extractFunction(html,'renderLedgerRecentRecord')+'\n'+extractFunction(html,'renderLedgerBatchCard'),rendererSandbox);
const renderedRecord=rendererSandbox.renderLedgerRecentRecord({id:'a',detail:'A',category:'餐飲',payMethod:'現金'},false,'JPY');
assert(!renderedRecord.includes('ledger-record-menu-button'),'selection-mode record renderer omits the ellipsis DOM');
const renderedBatch=rendererSandbox.renderLedgerBatchCard([
  {id:'a',batchId:'batch-a',detail:'A',category:'餐飲',payMethod:'現金',amountJpy:1,amountTwd:1},
  {id:'b',batchId:'batch-a',detail:'B',category:'交通',payMethod:'現金',amountJpy:2,amountTwd:2}
],false,'JPY');
assert(renderedBatch.includes('partial'),'one selected child renders the batch partial state');
assert(renderedBatch.includes('ledger-batch-children" hidden'),'selection mode keeps batch children collapsed until requested');
assert(/class="ledger-batch-body" onclick="toggleLedgerBatchExpanded\('batch-a',event\)"/.test(renderedBatch),'selection-mode batch body expands instead of selecting the whole batch');
assert(!renderedBatch.includes('ledger-record-menu-button'),'selection-mode batch renderer omits the ellipsis DOM');
rendererSandbox.ledgerUiState.expandedBatches['batch-a']=true;
const expandedBatch=rendererSandbox.renderLedgerBatchCard([
  {id:'a',batchId:'batch-a',detail:'A',category:'food',payMethod:'cash',amountJpy:1,amountTwd:1},
  {id:'b',batchId:'batch-a',detail:'B',category:'travel',payMethod:'cash',amountJpy:2,amountTwd:2}
],false,'JPY');
assert(!expandedBatch.includes('ledger-batch-children" hidden'),'tapping a batch reveals children for per-record selection');

let selectionRenders=0;
const batchInteractionSandbox={
  ledgerUiState:{selectionMode:false,selectedRecordIds:{stale:true},expandedBatches:{'batch-a':true}},
  closeLedgerRecordActions(){},renderSplit(){selectionRenders++;}
};
vm.createContext(batchInteractionSandbox);
vm.runInContext(extractFunction(html,'enterLedgerSelectionMode')+'\n'+extractFunction(html,'toggleLedgerBatchExpanded'),batchInteractionSandbox);
batchInteractionSandbox.enterLedgerSelectionMode();
assert.deepStrictEqual(plain(batchInteractionSandbox.ledgerUiState.expandedBatches),{},'entering selection mode collapses previously expanded batches');
batchInteractionSandbox.toggleLedgerBatchExpanded('batch-a');
assert.strictEqual(batchInteractionSandbox.ledgerUiState.expandedBatches['batch-a'],true,'batch cards can expand while selection mode is active');
assert.strictEqual(selectionRenders,2,'selection entry and batch expansion each refresh the ledger');

assert(html.includes('新品項自動帶入，可逐筆調整'),'default category helper copy is present');
assert(html.includes('>預設類別<'),'multi-item category label is renamed');
assert(!html.includes('>套用類別<'),'retired category label is absent');

assert(html.includes('function clearLedgerHistoryFilters('),'history exposes one clear-filter action');
assert(html.includes('id="ledgerHistoryClearFilters"'),'filter panel renders the clear action');
assert(html.includes('historyQuery'),'history search remains separate from filter state');
assert(html.includes('ledger-history-compact-options'),'category and payment filters use scoped compact controls');
assert(/\.ledger-history-compact-options \.ledger-sheet-choice\{[^}]*min-height:3[2-6]px[^}]*border-radius:8px/.test(html),'history open-set controls are compact rounded rectangles');
assert(!/\.ledger-history-compact-options \.ledger-sheet-choice\{[^}]*border-radius:999px/.test(html),'history compact controls are not pills');
assert(html.includes('ledger-history-filter-group ledger-entry-divider'),'category and payment groups reuse the existing divider class');

const fullHistorySource=extractFunction(html,'renderLedgerFullHistory');
assert(fullHistorySource.includes('enterLedgerSelectionMode()'),'full history can enter the shared selection mode');
assert(fullHistorySource.includes('toggleLedgerSelectAll()'),'full history selection header can select the filtered result set');
assert(fullHistorySource.includes('cancelLedgerSelectionMode()'),'full history selection header can cancel and clear selection');
assert(fullHistorySource.includes('renderLedgerSelectionToolbar()')||extractFunction(html,'renderSplit').includes('renderLedgerSelectionToolbar()'),'full history renders the shared deletion toolbar');
assert(extractFunction(html,'setLedgerTestMode').includes('selectedRecordIds={}'),'TEST/formal switching clears selection');
const renderSplitSource=extractFunction(html,'renderSplit'),recentGroupsSource=extractFunction(html,'renderLedgerRecentGroups'),historyGroupedSource=extractFunction(html,'renderLedgerHistoryGrouped');
assert(renderSplitSource.includes("formatLedgerDateKey(ledgerLocalDateKey(recent[0].time))"),'recent heading shows the absolute newest date');
assert(renderSplitSource.includes('renderLedgerDateSummary(recentDate,recent,true)'),'dashboard uses the shared latest-day summary');
assert(recentGroupsSource.includes('renderLedgerDateSummary(label,group.records,false)'),'date grouping uses the shared daily total summary');
assert(historyGroupedSource.includes("historyGrouping==='date'")&&historyGroupedSource.includes('ledger-date-label'),'category grouping retains plain labels');
assert(!historyGroupedSource.includes('renderLedgerDateSummary(key'),'category grouping does not mislabel category totals as daily totals');

const clearSandbox={
  ledgerUiState:{
    historyQuery:'松屋',historyCategories:['餐飲'],historyPayMethods:['現金'],historyProxy:'proxy',historyTaxExempt:'tax-exempt',
    historyFiltersOpen:true,selectionMode:true,selectedRecordIds:{a:true}
  },
  closeLedgerRecordActions(){},renderSplit(){}
};
vm.createContext(clearSandbox);
vm.runInContext(extractFunction(html,'resetLedgerHistoryFilters')+'\n'+extractFunction(html,'clearLedgerHistoryFilters'),clearSandbox);
clearSandbox.clearLedgerHistoryFilters();
assert.strictEqual(clearSandbox.ledgerUiState.historyQuery,'松屋','clear filters retains search');
assert.deepStrictEqual(plain(clearSandbox.ledgerUiState.historyCategories),[]);
assert.deepStrictEqual(plain(clearSandbox.ledgerUiState.historyPayMethods),[]);
assert.strictEqual(clearSandbox.ledgerUiState.historyProxy,'all');
assert.strictEqual(clearSandbox.ledgerUiState.historyTaxExempt,'all');
assert.strictEqual(clearSandbox.ledgerUiState.historyFiltersOpen,false);
assert.strictEqual(clearSandbox.ledgerUiState.selectionMode,false);
assert.deepStrictEqual(plain(clearSandbox.ledgerUiState.selectedRecordIds),{});

let deletedPersonalIds=null,openedSharedIds=null,cancelledSelections=0;
const deleteDispatchSandbox={
  ledgerUiState:{track:'personal'},ledgerSelectedRecords(){return [{id:'p1'},{id:'p2'}];},confirm(){return true;},
  deletePersonalLedgerRecords(ids){deletedPersonalIds=ids.slice();return ids.length;},cancelLedgerSelectionMode(){cancelledSelections++;},toast(){},openSharedLedgerDeleteBatch(ids){openedSharedIds=ids.slice();}
};
vm.createContext(deleteDispatchSandbox);
vm.runInContext(extractFunction(html,'deleteSelectedLedgerRecords'),deleteDispatchSandbox);
deleteDispatchSandbox.deleteSelectedLedgerRecords();
assert.deepStrictEqual(plain(deletedPersonalIds),['p1','p2'],'history personal deletion reuses the true-delete batch helper');
assert.strictEqual(openedSharedIds,null,'personal deletion creates no shared tombstones');
deleteDispatchSandbox.ledgerUiState.track='shared';
deleteDispatchSandbox.deleteSelectedLedgerRecords();
assert.deepStrictEqual(plain(openedSharedIds),['p1','p2'],'history shared deletion routes every selected ID to the tombstone dialog');

const testSwitchSandbox={
  ledgerUiState:{selectionMode:true,selectedRecordIds:{a:true}},stored:null,
  lsSet(key,value){this.stored=[key,value];},closeLedgerRecordActions(){},renderSplit(){},memberIsAllowed(){return true;},getCurrentMember(){return 'Bar';},refreshMemberSelector(){},openMemberSelector(){},toast(){}
};
vm.createContext(testSwitchSandbox);
vm.runInContext(extractFunction(html,'setLedgerTestMode'),testSwitchSandbox);
testSwitchSandbox.setLedgerTestMode({checked:true});
assert.strictEqual(testSwitchSandbox.ledgerUiState.selectionMode,false,'TEST switching exits history selection');
assert.deepStrictEqual(plain(testSwitchSandbox.ledgerUiState.selectedRecordIds),{},'TEST switching clears selected IDs');

assert(html.includes('function returnLedgerDashboard('),'ledger owns a dashboard-return helper');
const switchSource=extractFunction(html,'switchView');
assert(switchSource.includes("v==='split'&&curView==='split'"),'re-tapping the visible Split tab is detected');
assert(switchSource.includes('returnLedgerDashboard()'),'Split child views return through the shared helper');
assert(switchSource.includes("behavior:'smooth'"),'re-tapping the dashboard scrolls to the top');
assert(extractFunction(html,'returnLedgerDashboard').includes("classList.contains('ledger-sheet-open')"),'hidden-nav sheets protect unsaved form state');
assert(html.includes('aria-label="返回分帳首頁"'),'the history back button remains available');

assert.match(sw,/okayama-trip-v32/,'service worker cache advances exactly one version');

(async function(){
  const originals=[{id:'s1'},{id:'s2'}],overlay={getAttribute(){return JSON.stringify(['s1','s2']);}},input={value:'共同原因'},button={disabled:false};
  const sharedDeleteSandbox={
    document:{getElementById(id){return {ledgerDeleteDialog:overlay,ledgerDeleteReason:input,ledgerDeleteError:null,ledgerDeleteConfirm:button}[id]||null;}},
    effectiveLedgerRecords(){return originals;},mergedLedgerRecords(){return originals;},canDeleteLedgerRecord(){return true;},
    createLedgerDeletion(original,member,reason){return {id:'delete-'+original.id,recordType:'deletion',targetRecordId:original.id,member,deleteReason:reason};},
    getCurrentMember(){return 'Bar';},Date,JSON,Promise,
    enqueues:[],ledgerRepository:{enqueueBatch(records){sharedDeleteSandbox.enqueues.push(records);return {ok:true};},add(){throw new Error('batch deletion must not use add');}},
    closeSharedLedgerDelete(){},ledgerUiState:{selectionMode:true,selectedRecordIds:{s1:true,s2:true}},renderSplit(){},toast(){}
  };
  vm.createContext(sharedDeleteSandbox);
  vm.runInContext(extractFunction(html,'submitSharedLedgerDeletion'),sharedDeleteSandbox);
  await sharedDeleteSandbox.submitSharedLedgerDeletion();
  assert.strictEqual(sharedDeleteSandbox.enqueues.length,1,'shared history deletion calls enqueueBatch exactly once');
  assert.deepStrictEqual(plain(sharedDeleteSandbox.enqueues[0].map(record=>record.targetRecordId)),['s1','s2'],'shared history deletion creates one tombstone per selected record');
  assert.deepStrictEqual(plain([...new Set(sharedDeleteSandbox.enqueues[0].map(record=>record.deleteReason))]),['共同原因'],'shared history tombstones reuse one deletion reason');
  assert.strictEqual(sharedDeleteSandbox.ledgerUiState.selectionMode,false,'shared deletion exits selection mode after enqueue');
  assert.deepStrictEqual(plain(sharedDeleteSandbox.ledgerUiState.selectedRecordIds),{},'shared deletion clears selected IDs after enqueue');
  console.log('ledger 2.2.5 tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
