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
    formatLedgerCurrencyAmount(currency,amount){return (currency==='TWD'?'NT$':'¥')+Math.round(Number(amount||0)).toLocaleString();},
    escapeHtml(value){return String(value);},
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

assert.strictEqual(typeof mod.renderLedgerRecentHeading,'function','dashboard exposes one recent heading renderer');
const recentHeading=mod.renderLedgerRecentHeading('<button>選取</button>');
assert(recentHeading.includes('最近消費'),'recent heading keeps the section title');
assert(recentHeading.includes('查看全部 〉'),'recent heading keeps the complete history entry');
assert(!recentHeading.includes('今日'),'recent heading never duplicates Today counts or amounts');
assert.strictEqual(typeof mod.renderLedgerTodayHint,'function','dashboard exposes one shared Today-hint rule');
assert.strictEqual(mod.renderLedgerTodayHint({today:{count:5}},5),'','Today spending needs no additional hint');
assert(mod.renderLedgerTodayHint({today:{count:0}},3).includes('今日尚無消費'),'history with zero Today spending gets the lightweight hint');
assert.strictEqual(mod.renderLedgerTodayHint({today:{count:0}},0),'','an empty ledger does not duplicate the existing empty state');
assert.strictEqual(typeof mod.ledgerRecentDateLabel,'function','dashboard exposes one recent-date label rule');
assert.strictEqual(mod.ledgerRecentDateLabel([{time:new Date(now).toISOString()}],now),'今天','the current local date is labelled Today');
assert.strictEqual(mod.ledgerRecentDateLabel(recent,now+86400000),'2026/07/18','historical recent spending keeps its formatted date');

assert.strictEqual(mod.ledgerLocalDateKey('not-a-date'),'','invalid dates do not create a misleading group key');
assert.deepStrictEqual(Array.from(mod.selectLatestLedgerDateExpenses([])),[],'an empty track has no recent date');
assert.strictEqual(mod.ledgerSharedRecordParticipantLabel({member:'Bar',participants:'["Bar","Amy"]'},'Bar',['Bar','Amy']),'我付款 · 全員分攤','the current payer and full registered group use the compact shared label');
assert.strictEqual(mod.ledgerSharedRecordParticipantLabel({member:'Amy',participants:'["Bar","Amy"]'},'Bar',['Bar','Amy','Cara','Dana']),'Amy付款 · 2 人分攤','another payer reports the physical participant count');
assert.strictEqual(mod.ledgerSharedRecordParticipantLabel({member:'Amy',participants:''},'Bar',['Bar','Amy']),'Amy付款 · 分攤資料異常','invalid participant snapshots are not guessed');
const personalHistory=[{id:'a',isProxy:false},{id:'b',isProxy:true},{id:'c',isProxy:true}];
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'personal','proxy'),item=>item.id),['b','c'],'personal proxy history contains proxy records only');
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'personal','all'),item=>item.id),['a','b','c'],'personal all history keeps every visible record');
assert.deepStrictEqual(Array.from(mod.filterLedgerHistoryRecords(personalHistory,'shared','proxy'),item=>item.id),['a','b','c'],'shared history never applies the personal proxy filter');

const html=mod.__htmlSource;
assert.match(html,/\.ledger-compact-card\{[^}]*display:flex[^}]*flex-direction:column[^}]*align-items:stretch[^}]*text-align:left/,'dashboard cards share one left-aligned flex contract');
assert.match(html,/\.ledger-compact-card h3,\.ledger-compact-card strong,\.ledger-compact-card p\{[^}]*width:100%[^}]*margin-left:0[^}]*margin-right:0/,'dashboard card copy shares the same content width and margins');
assert.match(html,/\.ledger-compact-action\{[^}]*appearance:none[^}]*-webkit-appearance:none[^}]*font:inherit[^}]*color:inherit/,'clickable compact cards reset native button typography and appearance');
const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
const ledgerUiSource=html.slice(html.indexOf('function ledgerTrackRecords()'),html.indexOf('/* ================= 導覽 / 啟動'));
const settlementCardSource=html.slice(html.indexOf('function renderLedgerSettlementCard('),html.indexOf('function ledgerSettlementLines('));
const settlementProgressSource=html.slice(html.indexOf('function ledgerSettlementCardProgress('),html.indexOf('function postLedgerRecord('));
assert(html.includes("var ledgerUiState={track:'personal'"),'one ledger UI state defaults to personal');
assert(!html.includes("var ledgerTrack='personal'"),'parallel ledgerTrack state is removed');
assert(splitSource.includes('ledger-status-pill'),'dashboard renders the sync/rate status pill');
assert(splitSource.includes('ledger-summary-card'),'dashboard renders the primary summary card');
assert(splitSource.includes("shared?'團體總支出 · '+period.count+' 筆紀錄'"),'shared primary card explicitly labels the total-spend section');
assert(splitSource.includes(":'累計支出 · '+period.count+' 筆紀錄'"),'personal primary card explicitly labels cumulative spending');
assert(!splitSource.includes('ledger-today-card'),'neither ledger track renders a standalone Today card');
assert.match(splitSource,/<button class="ledger-compact-card ledger-compact-action ledger-proxy-summary-card" onclick="openLedgerProxyPanel\(\)">/,'personal proxy remains a whole-card button');
assert(splitSource.includes('ledger-proxy-summary-head'),'personal proxy keeps its title and right chevron');
assert(splitSource.includes('ledgerProxyCardSummary(proxy)'),'personal proxy uses a presentation-only summary without changing proxy calculations');
assert(splitSource.includes('🛍 代購'),'personal proxy card renders the enriched title');
assert(splitSource.includes('var proxyAmounts=proxy&&proxy.proxyCount?'),'shared mode never reads proxy fields after intentionally selecting a null proxy summary');
assert(splitSource.includes("proxy.proxyTotal.amountJpy")&&splitSource.includes("proxy.proxyTotal.amountTwd"),'personal proxy renders its existing dual-currency total');
assert(settlementCardSource.includes('ledger-shared-settlement-card'),'shared dashboard renders the full-width settlement status card');
assert(settlementCardSource.includes('我的結算狀態'),'shared settlement card uses the approved title');
assert(!splitSource.includes('ledger-shared-summary-grid'),'shared dashboard no longer reserves a standalone Today-card grid');
assert.strictEqual((settlementCardSource.match(/onclick="openLedgerSettlementPanel\(\)"/g)||[]).length,1,'shared dashboard keeps exactly one settlement entry');
assert.match(settlementCardSource,/<button class="ledger-compact-card ledger-compact-action ledger-shared-settlement-card/,'shared settlement entry is the whole card');
assert(!settlementCardSource.includes('查看結算'),'shared settlement card has no independent action button');
assert(splitSource.indexOf('renderLedgerSettlementCard')<splitSource.indexOf('renderLedgerRecentHeading'),'shared settlement card appears before recent spending');
assert(splitSource.includes('ledger-recent-list'),'dashboard renders recent expenses');
assert(html.includes('查看全部 〉'),'dashboard links to the complete list');
assert(splitSource.includes('openLedgerQuickEntryFromFab'),'dashboard FAB opens quick entry through the dedicated focus path');
assert(!splitSource.includes('id="ledgerAmount"'),'amount input no longer lives in the dashboard renderer');
assert(splitSource.includes('selectLatestLedgerDateExpenses(records)'),'dashboard selects the newest effective local date through the tested selector');
assert(splitSource.includes("summarizeLedgerRecords(records,ledgerUniverseMode()==='test')"),'TEST dashboard includes only its already-selected universe in totals');
assert(splitSource.includes("pending=shared?ledgerRepository.pendingCount():0"),'sync pending count comes only from the repository queue');
assert(settlementProgressSource.includes('model.pendingCount'),'settlement people count remains a separate settlement-card value');
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
assert.match(html,/\.ledger-shared-dashboard \.ledger-recent-section\{[^}]*margin-top:-?\d+px/,'shared dashboard uses a scoped compact vertical rhythm');
assert.match(html,/\.ledger-section-head\{[^}]*min-width:0[^}]*flex-wrap:wrap/,'recent heading can wrap safely at 375px and 390px');
assert.match(html,/\.ledger-section-head-actions\{[^}]*flex:0 0 auto[^}]*white-space:nowrap/,'recent actions stay readable without horizontal overflow');
assert.match(html,/\.ledger-today-hint\{[^}]*color:var\(--ink-faint\)[^}]*font-size:11px/,'zero-Today hint is lightweight secondary text');
const proxyCardCss=(html.match(/\.ledger-proxy-summary-card\{([^}]*)\}/)||[])[1]||'';
assert(proxyCardCss.includes('min-height:0')&&proxyCardCss.includes('padding:10px 12px'),'personal proxy card uses compact natural height and padding');
assert(!/(^|;)height:\s*\d/.test(proxyCardCss),'personal proxy card has no clipping fixed height');
const settlementCardCss=(html.match(/\.ledger-shared-settlement-card\{([^}]*)\}/)||[])[1]||'';
assert(settlementCardCss.includes('min-height:0')&&settlementCardCss.includes('padding:10px 12px'),'settlement card uses compact natural height and padding');
assert(!/(^|;)height:\s*\d/.test(settlementCardCss),'settlement card has no clipping fixed height');
assert.match(html,/\.ledger-proxy-summary-head,\.ledger-shared-settlement-head\{[^}]*display:flex[^}]*min-width:0/,'375px and 390px keep compact card headings overflow-safe');
assert.match(html,/\.ledger-shared-settlement-progress\{[^}]*overflow-wrap:anywhere/,'long settlement summaries wrap without horizontal overflow');

console.log('ledger dashboard tests passed');
