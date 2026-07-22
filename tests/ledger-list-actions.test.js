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

const recentStart=html.indexOf('function renderLedgerRecentRecord(');
const recentEnd=html.indexOf('function renderLedgerRecentGroups(',recentStart);
const detailStart=html.indexOf('function ledgerRecordDetailRows(');
const detailEnd=html.indexOf('function closeLedgerRecordDetail(',detailStart);
assert(recentStart>=0&&recentEnd>recentStart,'recent-record renderer exists');
assert(detailStart>=0&&detailEnd>detailStart,'detail-row renderer exists');
const recent=html.slice(recentStart,recentEnd),detail=html.slice(detailStart,detailEnd);

assert(recent.includes('record.storeName'),'recent rows show store name when it exists');
assert(recent.includes('ledger-record-menu-button'),'each recent row has a separate ellipsis action button');
assert(recent.includes("ledgerUiState.selectionMode?'':'<button class=\"ledger-record-menu-button\""),'selection mode still omits the ellipsis DOM instead of hiding it visually');
assert(recent.includes('openLedgerRecordActions'),'ellipsis opens the record action menu');
assert(recent.includes('handleLedgerRecordCardClick'),'the card body routes normal clicks to record detail and selection clicks to selection');
assert(html.includes('function handleLedgerRecordCardClick(')&&html.includes('else openLedgerRecordDetail(id)'),'normal card clicks still open record detail');
assert(html.includes('function openLedgerRecordActions(')&&html.includes("className='ledger-action-popover'"),'record actions use a dedicated anchored menu entry point');
assert(html.includes('editLedgerRecord('),'record menu retains editing');
assert(html.includes('deletePersonalLedgerRecord('),'personal record menu retains local deletion');
assert(html.includes('openSharedLedgerDelete('),'shared record menu retains tombstone deletion with reason');

const actionHost={current:null};
const fakeDocument={
  getElementById(id){return actionHost.current&&actionHost.current.id===id?actionHost.current:null;},
  createElement(){return {id:'',className:'',dataset:{},style:{},innerHTML:'',offsetWidth:118,offsetHeight:80,setAttribute(){},remove(){if(actionHost.current===this)actionHost.current=null;}};},
  body:{appendChild(node){actionHost.current=node;}}
};
const actionsSandbox={
  document:fakeDocument,window:{innerWidth:390,innerHeight:844},ledgerUiState:{track:'personal'},
  ledgerTrackRecords(){return [{id:'a'},{id:'b'}];},toast(){},jsHtmlAttrString(value){return String(value);}
};
vm.createContext(actionsSandbox);
vm.runInContext(extractFunction(html,'closeLedgerRecordActions')+'\n'+extractFunction(html,'openLedgerRecordActions'),actionsSandbox);
const trigger={getBoundingClientRect(){return {left:300,right:344,top:100,bottom:144};}};
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:a','popover identifies its source record');
assert(actionHost.current.innerHTML.includes('編輯 ✏️')&&actionHost.current.innerHTML.includes('刪除 🗑️'),'popover appends the approved action icons');
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current,null,'clicking the same ellipsis closes the popover');
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
actionsSandbox.openLedgerRecordActions('b',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:b','clicking another ellipsis switches the popover');
assert(/\.ledger-action-popover\{[^}]*width:104px[^}]*box-sizing:border-box[^}]*padding:4px/.test(html),'action popover uses the approved 104px border-box shell');
assert(/\.ledger-action-popover button\{[^}]*min-height:36px[^}]*font-size:12px/.test(html),'action rows use the compact approved size');

assert(!detail.includes("['紀錄 ID'"),'detail presentation removes record ID');
assert(!detail.includes("['批次 ID'"),'detail presentation removes batch ID');
assert(!detail.includes("['同步狀態'"),'detail presentation removes sync status');
assert(detail.includes('formatLedgerLocalOccurrence'),'detail uses a local-readable occurrence formatter');
assert(html.includes('function formatLedgerLocalOccurrence('),'local occurrence formatting is shared');
assert(html.includes('尚無消費紀錄')&&html.includes('點右下角 ＋ 開始記帳'),'recent empty state explains the next action');

const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
const copyIndex=splitSource.indexOf('個人帳留在本機；團體帳跨裝置同步。');
const recentIndex=splitSource.indexOf('renderLedgerRecentHeading');
assert(copyIndex>0&&copyIndex<recentIndex,'dual-track explanation remains in the summary before the recent heading renderer');

console.log('ledger list action tests passed');
