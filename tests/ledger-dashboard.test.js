const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function createStorage(){
  const values={};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadModule(){
  const source=fs.readFileSync('index.html','utf8');
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:createStorage(),
    fetch(){return Promise.reject(new Error('network disabled'));},setTimeout,clearTimeout,
    Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  sandbox.__htmlSource=source;
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();
const records=Array.from({length:17},(_,index)=>({
  id:'r'+index,
  time:new Date(2026,6,index<2?17:18,12,index).toISOString(),
  member:index%2?'Bar':'Amy',
  amountJpy:100+index,
  amountTwd:20+index
}));

const originalIds=records.map(record=>record.id);
const recent=Array.from(mod.selectLatestLedgerDateExpenses(records));
assert.strictEqual(recent.length,15,'dashboard keeps every expense from the newest effective date');
assert.strictEqual(recent[0].id,'r16','recent expenses are newest first');
assert.deepStrictEqual(records.map(record=>record.id),originalIds,'recent selector does not mutate its input');

const grouped=plain(mod.groupLedgerExpensesByDate(recent));
assert.deepStrictEqual(grouped.map(group=>group.date),['2026-07-18'],'recent records are grouped by device-local date');
assert.strictEqual(grouped[0].records.length,15,'all recent records stay in their date group');

const allGrouped=plain(mod.groupLedgerExpensesByDate(records));
assert.deepStrictEqual(allGrouped.map(group=>group.date),['2026-07-18','2026-07-17'],'date groups are newest first');
assert.strictEqual(allGrouped[1].records.length,2,'older local-date records use their own group');

const now=new Date(2026,6,18,20,0,0).getTime();
const summary=plain(mod.buildLedgerPeriodSummary(records,now));
assert.strictEqual(summary.count,17,'period summary counts the selected track only');
assert.strictEqual(summary.today.count,15,'Today card uses the device-local date');
assert.strictEqual(summary.total.amountJpy,records.reduce((sum,record)=>sum+record.amountJpy,0));
assert.strictEqual(summary.today.amountTwd,records.slice(2).reduce((sum,record)=>sum+record.amountTwd,0));

assert.strictEqual(mod.ledgerLocalDateKey('not-a-date'),'','invalid dates do not create a misleading group key');
assert.deepStrictEqual(Array.from(mod.selectLatestLedgerDateExpenses([])),[],'an empty track has no recent date');
const personalHistory=[{id:'a',isProxy:false},{id:'b',isProxy:true},{id:'c',isProxy:true}];
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'personal','proxy'),item=>item.id),['b','c'],'personal proxy history contains proxy records only');
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'personal','all'),item=>item.id),['a','b','c'],'personal all history keeps every visible record');
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'shared','proxy'),item=>item.id),['a','b','c'],'shared history never applies the personal proxy filter');

const html=mod.__htmlSource;
const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
const ledgerUiSource=html.slice(html.indexOf('function ledgerTrackRecords()'),html.indexOf('/* ================= 導覽 / 啟動'));
assert(html.includes("var ledgerUiState={track:'personal'"),'one ledger UI state defaults to personal');
assert(!html.includes("var ledgerTrack='personal'"),'parallel ledgerTrack state is removed');
assert(splitSource.includes('ledger-status-pill'),'dashboard renders the sync/rate status pill');
assert(splitSource.includes('ledger-summary-card'),'dashboard renders the primary summary card');
assert(splitSource.includes('ledger-today-card'),'dashboard renders the Today card');
assert(splitSource.includes('ledger-recent-list'),'dashboard renders recent expenses');
assert(splitSource.includes('查看全部'),'dashboard links to the complete list');
assert(splitSource.includes('openLedgerQuickEntryFromFab'),'dashboard FAB opens quick entry through the dedicated focus path');
assert(!splitSource.includes('id="ledgerAmount"'),'amount input no longer lives in the dashboard renderer');
assert(splitSource.includes('selectLatestLedgerDateExpenses(records)'),'dashboard selects the newest effective local date through the tested selector');
assert(splitSource.includes("summarizeLedgerRecords(records,ledgerUniverseMode()==='test')"),'TEST dashboard includes only its already-selected universe in totals');
assert(ledgerUiSource.includes('groupLedgerExpensesByDate'),'dashboard uses the tested date grouping');
assert(ledgerUiSource.includes("spendLedgerRecords(mergedLedgerRecords())"),'shared history consumes effective visible expenses');
assert(ledgerUiSource.includes('ledgerUniverseRecords'),'shared dashboard selects one formal/TEST universe');
assert(ledgerUiSource.includes("ledgerUiState.page='all'"),'View all switches the single ledger state into history mode');
assert(ledgerUiSource.includes("['proxy','代購']")&&ledgerUiSource.includes("['non-proxy','非代購']")&&ledgerUiSource.includes("'setLedgerHistoryProxy'"),'personal history exposes proxy and non-proxy filters');
const detailSource=html.slice(html.indexOf('function ledgerRecordDetailRows('),html.indexOf('function renderSplit()'));
assert(detailSource.includes('ledgerTrackRecords().filter'),'detail lookup searches the currently visible track only');
assert(ledgerUiSource.includes('deletePersonalLedgerRecord('),'record action menu reuses the confirmed local deletion path');
assert(ledgerUiSource.includes('openSharedLedgerDelete('),'record action menu reuses the tombstone deletion path');
assert(!detailSource.includes("['批次 ID',record.batchId]"),'consumer detail hides batch ID');
assert(!detailSource.includes("['同步狀態',record.pending?'待同步':'已同步']"),'consumer detail hides queue internals');
assert(splitSource.includes('目前顯示測試帳本'),'TEST banner explains which universe is visible');
assert(splitSource.includes('不影響正式分帳'),'TEST banner confirms formal data is isolated');

console.log('ledger dashboard tests passed');
