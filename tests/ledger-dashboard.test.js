const {installTripTime}=require('./support/trip-time');
const assert=require('assert');
const vm=require('vm');
const TripBuyToLedger=require('../buy-to-ledger.js');
const TripLedgerUiState=require('../ledger-ui-state.js');
const {appHtml}=require('./support/version');

function createStorage(){
  const values={};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadModule(){
  const source=appHtml();
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:createStorage(),
    fetch(){return Promise.reject(new Error('network disabled'));},setTimeout,clearTimeout,
    Date,Math,Promise,JSON,String,Number,isFinite,
    TripBuyToLedger,TripLedgerUiState,buyToLedgerRuntimeAdapter:{},
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    formatLedgerCurrencyAmount(currency,amount){return (currency==='TWD'?'NT$':'¥')+Math.round(Number(amount||0)).toLocaleString();},
    escapeHtml(value){return String(value);},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);installTripTime(sandbox,source);
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

/* v88: catches the dashboard regressing to a cumulative-only total or calling
   a shared related amount "my spending". Expectations are hand-derived. */
assert.strictEqual(typeof mod.ledgerSummaryPresentation,'function','the shared card keeps the v88 presentation model');
const sharedPresentation=plain(mod.ledgerSummaryPresentation({
  count:4,total:{amountJpy:2400,amountTwd:480},today:{count:1,amountJpy:900,amountTwd:180}
},'TWD'));
assert.deepStrictEqual(sharedPresentation,{
  todayLabel:'與我相關 · 今日消費 · 1 筆',todayPrimary:'NT$180',todaySecondary:'¥900',
  totalLabel:'與我相關旅程累計 · 4 筆',totalAmount:'NT$480'
});
assert.deepStrictEqual(plain(mod.ledgerSummaryPresentation({
  count:3,total:{amountJpy:600,amountTwd:120},today:{count:0,amountJpy:0,amountTwd:0}
},'JPY')),{
  todayLabel:'與我相關 · 今日消費 · 0 筆',todayPrimary:'¥0',todaySecondary:'NT$0',
  totalLabel:'與我相關旅程累計 · 3 筆',totalAmount:'¥600'
},'zero Today spending stays explicit instead of falling back to the cumulative amount');

/* v155（Bar 2026-10-14）：個人大卡＝今天花費（個人不含代購＋團體份額）、代購列、整趟旅程（不含代購）。 */
assert.strictEqual(typeof mod.personalSummaryPresentation,'function','the personal card has its own presentation model');
const spend={today:{amountJpy:4200,amountTwd:882,personalJpy:900,personalTwd:189,groupJpy:3300,groupTwd:693},total:{amountJpy:40180,amountTwd:8438}};
const proxy={proxyCount:2,proxyTotal:{amountJpy:3600,amountTwd:756}};
assert.deepStrictEqual(plain(mod.personalSummaryPresentation(spend,proxy,'JPY')),{
  todayLabel:'今天花費',todayNote:'個人 ¥900 ＋ 團體份額 ¥3,300',todayPrimary:'¥4,200',todaySecondary:'NT$882',
  proxyAmount:'¥3,600',tripLabel:'整趟旅程',tripNote:'不含代購',tripAmount:'¥40,180'
},'approved wording; the proxy row shows the amount only');
assert.deepStrictEqual(plain(mod.personalSummaryPresentation(spend,proxy,'TWD')),{
  todayLabel:'今天花費',todayNote:'個人 NT$189 ＋ 團體份額 NT$693',todayPrimary:'NT$882',todaySecondary:'¥4,200',
  proxyAmount:'NT$756',tripLabel:'整趟旅程',tripNote:'不含代購',tripAmount:'NT$8,438'
},'every amount follows the display currency');
const quiet=plain(mod.personalSummaryPresentation({today:{amountJpy:0,amountTwd:0},total:{amountJpy:600,amountTwd:120}},{proxyCount:0,proxyTotal:{amountJpy:0,amountTwd:0}},'JPY'));
assert.strictEqual(quiet.todayPrimary,'¥0','zero Today spending stays explicit');
assert.strictEqual(quiet.todayNote,'','no breakdown note on a day without spending');
assert.strictEqual(quiet.proxyAmount,'','no proxy row without proxy records');
assert.strictEqual(quiet.tripAmount,'¥600');

assert.strictEqual(typeof mod.renderLedgerRecentHeading,'function','dashboard exposes one recent heading renderer');
const recentHeading=mod.renderLedgerRecentHeading('<button>選取</button>');
assert(recentHeading.includes('最近消費'),'recent heading keeps the section title');
assert(recentHeading.includes('查看全部 〉'),'recent heading keeps the complete history entry');
assert(!recentHeading.includes('今日'),'recent heading never duplicates Today counts or amounts');
assert(!mod.renderLedgerRecentHeading('',false).includes('查看全部 〉'),'empty tracks hide the complete-history management entry');
assert.strictEqual(typeof mod.renderLedgerTodayHint,'undefined','the old zero-Today hint is removed because the summary always shows Today');
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
assert(html.includes('var ledgerUiState=TripLedgerUiState.createState();'),'one Ledger UI state uses the canonical module defaults');
assert.strictEqual(TripLedgerUiState.createState().track,'personal','fresh Ledger UI sessions default to personal');
assert(!html.includes("var ledgerTrack='personal'"),'parallel ledgerTrack state is removed');
assert(splitSource.includes('ledger-status-pill'),'dashboard renders the sync/rate status pill');
assert(splitSource.includes('ledger-summary-card'),'dashboard renders the primary summary card');
assert(splitSource.includes("presentation=shared?ledgerSummaryPresentation(period,currency):personalSummaryPresentation(myTripSpendSnapshot(),proxy,currency)"),'each track renders through its tested presentation model');
assert(!splitSource.includes('團體總支出'),'shared primary card no longer implies a whole-group total');
assert(splitSource.includes('ledger-summary-trip'),'the shared summary card keeps the trip cumulative footer');
assert(splitSource.includes('<button class="ledger-summary-row ledger-summary-proxy" onclick="openLedgerProxyPanel()">'),'v155: the personal proxy row opens the proxy panel');
assert(splitSource.includes('<button class="ledger-summary-row ledger-summary-total" onclick="openMyTripSpendPanel()">'),'v155: the personal trip row opens the trip spend panel');
assert(splitSource.includes('presentation.proxyAmount?'),'v155: the proxy row is hidden without proxy records');
assert(!splitSource.includes('ledger-today-card'),'neither ledger track renders a standalone Today card');
assert(!splitSource.includes('ledger-proxy-summary-card')&&!splitSource.includes('ledger-total-spend-card'),'v155: the standalone proxy and trip-total cards are folded into the summary card');
assert(splitSource.includes('var proxy=shared?null:buildProxySummary(records,member);'),'shared mode never builds a proxy summary');
assert(!splitSource.includes('🛍'),'the proxy row has no emoji');
assert(settlementCardSource.includes('ledger-shared-settlement-card'),'shared dashboard renders the full-width settlement status card');
assert(settlementCardSource.includes('我的結算狀態'),'shared settlement card uses the approved title');
assert(!splitSource.includes('ledger-shared-summary-grid'),'shared dashboard no longer reserves a standalone Today-card grid');
assert.strictEqual((settlementCardSource.match(/onclick="openLedgerSettlementPanel\(\)"/g)||[]).length,1,'shared dashboard keeps exactly one settlement entry');
assert.match(settlementCardSource,/<button class="ledger-compact-card ledger-compact-action ledger-home-summary-card ledger-shared-settlement-card/,'shared settlement entry uses the same whole-card size contract');
assert(!settlementCardSource.includes('查看結算'),'shared settlement card has no independent action button');
const sharedChevron='<span class="ledger-card-chevron" aria-hidden="true">〉</span>';
assert(splitSource.includes(sharedChevron)&&settlementCardSource.includes(sharedChevron),'both cards use the identical chevron element, class, and character');
assert(!splitSource.includes('ledger-proxy-summary-chevron')&&!settlementCardSource.includes('ledger-shared-settlement-chevron'),'card-specific chevron implementations are removed');
assert(splitSource.indexOf('renderLedgerSettlementCard')<splitSource.indexOf('renderLedgerRecentHeading'),'shared settlement card appears before recent spending');
assert(splitSource.includes('ledger-recent-list'),'dashboard renders recent expenses');
assert(html.includes('查看全部 〉'),'dashboard links to the complete list');
assert(splitSource.includes('openLedgerQuickEntryFromFab'),'dashboard FAB opens quick entry through the dedicated focus path');
assert(!splitSource.includes('id="ledgerAmount"'),'amount input no longer lives in the dashboard renderer');
assert(splitSource.includes('selectLatestLedgerDateExpenses(records)'),'dashboard selects the newest effective local date through the tested selector');
/* v157:團體帳列表也列出我幫別人代記、自己不在分攤裡的帳;摘要金額仍只算與我相關的。 */
assert(splitSource.includes("summarizeLedgerRecords(records.filter(function(record){return isLedgerRecordRelatedToMember(record,getCurrentMember());}),ledgerUniverseMode()==='test')"),'TEST dashboard includes only its already-selected universe in totals, and only records related to me');
assert(splitSource.includes("pending=shared?ledgerRepository.pendingCount():0"),'sync pending count comes only from the repository queue');
assert(settlementProgressSource.includes('model.pendingCount'),'settlement people count remains a separate settlement-card value');
assert(ledgerUiSource.includes('groupLedgerExpensesByDate'),'dashboard uses the tested date grouping');
assert(ledgerUiSource.includes("spendLedgerRecords(mergedLedgerRecords())"),'shared history consumes effective visible expenses');
assert(ledgerUiSource.includes('memberRelatedLedgerRecords(')&&ledgerUiSource.includes('getCurrentMember(),ledgerVisibilityWarn'),'shared track applies the member-related filter at the single shared choke point');
assert(ledgerUiSource.includes('ledgerUniverseRecords'),'shared dashboard selects one formal/TEST universe');
assert(ledgerUiSource.includes("ledgerUiWorkflow.dispatch({type:'open-history'})"),'View all switches the single ledger state into history mode through the workflow seam');
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
assert.strictEqual(html.includes('.ledger-today-hint{'),false,'obsolete zero-Today hint CSS is removed');
const homeSummaryCss=(html.match(/\.ledger-home-summary-card\{([^}]*)\}/)||[])[1]||'';
assert(homeSummaryCss.includes('width:100%')&&homeSummaryCss.includes('min-height:')&&homeSummaryCss.includes('padding:')&&homeSummaryCss.includes('border-radius:8px'),'both cards share one complete size contract');
assert(homeSummaryCss.includes('display:grid')&&homeSummaryCss.includes('grid-template-rows:'),'both cards align heading, primary information, and footer through one three-row layout');
assert(homeSummaryCss.includes('grid-template-columns:minmax(0,1fr)'),'the shared grid stretches every summary row and chevron to the full card width');
assert(!/(^|;)height:\s*\d/.test(homeSummaryCss),'shared size contract does not use a clipping fixed height');
assert(!html.includes('.ledger-proxy-summary-card')&&!html.includes('.ledger-total-spend-card'),'v155: CSS for the removed cards is gone');
const summaryRowCss=(html.match(/\.ledger-summary-row\{([^}]*)\}/)||[])[1]||'';
assert(/min-height:44px/.test(summaryRowCss)&&summaryRowCss.includes('width:100%'),'v155: summary rows are full-width 44px tap targets');
const cssDecls=selector=>{const body=(html.match(new RegExp('(?:^|[}\\n])'+selector.replace(/\./g,'\\.')+'\\{([^}]*)\\}'))||[])[1]||'';return Object.fromEntries(body.split(';').filter(Boolean).map(item=>item.split(':')));};
const noteCss=cssDecls('.ledger-summary-note'),helperCss=cssDecls('.ledger-summary-helper');
assert(helperCss['font-size']&&helperCss.color,'the helper rule is found');
assert.deepStrictEqual(['font-size','font-weight','line-height','color'].map(key=>noteCss[key]),['font-size','font-weight','line-height','color'].map(key=>helperCss[key]),'v155: card notes use the same size, weight and opacity as 「個人帳留在本機…」 (Bar 2026-10-14)');
const settlementCardCss=(html.match(/\.ledger-shared-settlement-card\{([^}]*)\}/)||[])[1]||'';
assert(!/(padding|min-height|height|gap):/.test(settlementCardCss),'settlement card does not override shared dimensions');
assert(!/(^|;)height:\s*\d/.test(settlementCardCss),'settlement card has no clipping fixed height');
assert.match(html,/\.ledger-home-summary-head\{[^}]*display:flex[^}]*min-width:0/,'375px and 390px keep the shared heading row overflow-safe');
assert.match(html,/\.ledger-card-head-action\{[^}]*display:inline-flex[^}]*align-items:center[^}]*gap:10px/,'proxy target count has a clear shared action gap before the chevron');
assert.match(html,/\.ledger-card-chevron\{[^}]*display:inline-flex[^}]*align-items:center[^}]*justify-content:center[^}]*font-family:inherit[^}]*font-size:18px[^}]*font-weight:700[^}]*line-height:1/,'both cards use one complete chevron typography and alignment rule');
assert.match(html,/\.ledger-shared-settlement-progress\{[^}]*overflow-wrap:anywhere/,'long settlement summaries wrap without horizontal overflow');

console.log('ledger dashboard tests passed');
