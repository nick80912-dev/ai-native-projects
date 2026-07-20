const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');assert(start>=0,name+' exists');
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){if(source[cursor]==='{')depth++;if(source[cursor]==='}')depth--;if(depth===0)return source.slice(start,cursor+1);}
  throw new Error('could not extract '+name);
}
const start=html.indexOf('/* ================= ledgerRepository');
const end=html.indexOf('/* ================= 分帳(雲端 Ledger)',start);
assert(start>=0&&end>start,'ledger helper section exists');
const sandbox={console,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},fetch(){return Promise.reject(new Error('offline'));},setTimeout,clearTimeout,Date,Math,Promise,JSON,String,Number,isFinite,timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},renderSplit(){},updateLedgerPendingStatus(){}};
vm.createContext(sandbox);vm.runInContext(html.slice(start,end),sandbox);
function plain(value){return JSON.parse(JSON.stringify(value));}

const records=[
  {id:'store-hit',detail:'早餐',storeName:'松屋',note:'',category:'餐飲',payMethod:'現金',isProxy:false,time:'2026-07-19T08:00:00.000Z'},
  {id:'note-hit',detail:'購物',storeName:'AEON',note:'伴手禮',category:'購物',payMethod:'信用卡',isProxy:true,time:'2026-07-18T09:00:00.000Z'},
  {id:'meal-cash',detail:'RAMEN',storeName:'Ichiran',note:'Late Meal',category:'餐飲',payMethod:'現金',isProxy:false,time:'2026-07-17T10:00:00.000Z'},
  {id:'transport',detail:'車票',storeName:'JR',note:'',category:'交通',payMethod:'Suica',isProxy:false,time:'2026-07-17T11:00:00.000Z'}
];
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,'松屋',{}).map(record=>record.id)),['store-hit']);
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,'伴手禮',{}).map(record=>record.id)),['note-hit']);
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,' ramen ',{}).map(record=>record.id)),['meal-cash'],'search is trimmed and case-insensitive');
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,'',{category:'餐飲',payMethod:'現金'}).map(record=>record.id)),['store-hit','meal-cash']);
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,'',{categories:['餐飲','交通'],payMethods:['現金']}).map(record=>record.id)),['store-hit','meal-cash'],'open-set chips support combined multi-selection');
assert.deepStrictEqual(plain(sandbox.filterLedgerHistory(records,'',{proxy:'proxy'}).map(record=>record.id)),['note-hit']);
assert.deepStrictEqual(Object.keys(plain(sandbox.groupLedgerHistory([records[3],records[0]],'category'))),['交通','餐飲']);
assert.deepStrictEqual(Object.keys(plain(sandbox.groupLedgerHistory([records[0],records[1]],'date'))),['2026-07-19','2026-07-18']);

sandbox.ledgerUiState={historyGrouping:'category'};
sandbox.escapeHtml=function(value){return String(value);};
sandbox.ledgerAmountTotals=function(items){return (items||[]).reduce(function(totals,item){totals.amountJpy+=Number(item.amountJpy||0);totals.amountTwd+=Number(item.amountTwd||0);return totals;},{amountJpy:0,amountTwd:0});};
sandbox.formatLedgerInlineTotals=function(totals){return '¥'+totals.amountJpy+' ≈ NT$'+totals.amountTwd;};
sandbox.renderLedgerBatchCard=function(){return '<batch>';};
sandbox.renderLedgerRecentRecord=function(){return '<record>';};
vm.runInContext(extractFunction(html,'groupLedgerDisplayUnits')+'\n'+extractFunction(html,'groupLedgerDisplayUnitsByCategory')+'\n'+extractFunction(html,'ledgerRecordsForDisplayUnits')+'\n'+extractFunction(html,'renderLedgerDateSummary')+'\n'+extractFunction(html,'renderLedgerHistoryGrouped'),sandbox);
const categoryUnits=[
  {type:'record',records:[{amountJpy:500,amountTwd:110}]},
  {type:'batch',records:[{amountJpy:300,amountTwd:66},{amountJpy:200,amountTwd:44}]}
];
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(sandbox.ledgerRecordsForDisplayUnits(categoryUnits))).map(record=>record.amountJpy),
  [500,300,200]
);
const categoryHtml=sandbox.renderLedgerHistoryGrouped([
  {id:'food',category:'餐飲',amountJpy:500,amountTwd:110,batchId:''}
],false,'JPY');
assert(categoryHtml.includes('餐飲'));
assert(categoryHtml.includes('¥500 ≈ NT$110'));

const summarySandbox={Math,Number};vm.createContext(summarySandbox);
vm.runInContext(extractFunction(html,'ledgerAmountTotals')+'\n'+extractFunction(html,'formatLedgerInlineTotals')+'\n'+extractFunction(html,'ledgerHistorySummary'),summarySandbox);
const filteredSummary=summarySandbox.ledgerHistorySummary([
  {amountJpy:1200,amountTwd:264},{amountJpy:2300,amountTwd:506}
]);
assert.strictEqual(filteredSummary,'找到 2 筆 · ¥3,500 ≈ NT$770','history summary totals only the supplied filtered result set');

assert(html.includes('id="ledgerHistorySearch"'),'full history exposes a search input');
assert(html.includes('historyCategories')&&html.includes('historyPayMethods')&&html.includes('historyProxy'),'history state includes multi-select category/payment and proxy filters');
assert(html.includes("setLedgerHistoryGrouping(\\'date\\')")&&html.includes("setLedgerHistoryGrouping(\\'category\\')"),'history exposes date/category grouping pills');
assert(!html.includes('historyTest'),'history does not add a redundant TEST filter');
assert(html.includes('function setButtonBusy('),'async controls share a scoped busy helper');
assert(html.includes("setButtonBusy(button,true,'同步中')"),'manual sync shows a spinner and busy label');
assert(html.includes("retryBusy?' disabled aria-busy=\"true\"'"),'sync panel rerenders its busy state without losing aria-busy');
assert(html.includes("setButtonBusy(button,true,'儲存中')"),'settings save shows a spinner and busy label');

const busyStart=html.indexOf('function setButtonBusy('),busyEnd=html.indexOf('function retrySyncFromPanel(',busyStart);
const attributes={};
const button={textContent:'立即重新同步',innerHTML:'',disabled:false,setAttribute(name,value){attributes[name]=String(value);},getAttribute(name){return Object.prototype.hasOwnProperty.call(attributes,name)?attributes[name]:null;},removeAttribute(name){delete attributes[name];}};
const busySandbox={escapeHtml(value){return String(value);}};
vm.createContext(busySandbox);vm.runInContext(html.slice(busyStart,busyEnd),busySandbox);
busySandbox.setButtonBusy(button,true,'同步中');
assert.strictEqual(button.disabled,true);assert.strictEqual(attributes['aria-busy'],'true');assert(button.innerHTML.includes('button-spinner'));
busySandbox.setButtonBusy(button,false);
assert.strictEqual(button.disabled,false);assert.strictEqual(button.textContent,'立即重新同步');assert.strictEqual(attributes['aria-busy'],undefined);

console.log('ledger history search tests passed');
