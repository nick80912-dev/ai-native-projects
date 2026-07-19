const assert=require('assert');
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');

const recentStart=html.indexOf('function renderLedgerRecentRecord(');
const recentEnd=html.indexOf('function renderLedgerRecentGroups(',recentStart);
const detailStart=html.indexOf('function ledgerRecordDetailRows(');
const detailEnd=html.indexOf('function closeLedgerRecordDetail(',detailStart);
assert(recentStart>=0&&recentEnd>recentStart,'recent-record renderer exists');
assert(detailStart>=0&&detailEnd>detailStart,'detail-row renderer exists');
const recent=html.slice(recentStart,recentEnd),detail=html.slice(detailStart,detailEnd);

assert(recent.includes('record.storeName'),'recent rows show store name when it exists');
assert(recent.includes('ledger-record-menu-button'),'each recent row has a separate ellipsis action button');
assert(recent.includes('openLedgerRecordActions'),'ellipsis opens the record action menu');
assert(recent.includes('openLedgerRecordDetail'),'the card body still opens record detail');
assert(html.includes('function openLedgerRecordActions('),'record actions use a dedicated menu entry point');
assert(html.includes('editLedgerRecord('),'record menu retains editing');
assert(html.includes('deletePersonalLedgerRecord('),'personal record menu retains local deletion');
assert(html.includes('openSharedLedgerDelete('),'shared record menu retains tombstone deletion with reason');

assert(!detail.includes("['紀錄 ID'"),'detail presentation removes record ID');
assert(!detail.includes("['批次 ID'"),'detail presentation removes batch ID');
assert(!detail.includes("['同步狀態'"),'detail presentation removes sync status');
assert(detail.includes('formatLedgerLocalOccurrence'),'detail uses a local-readable occurrence formatter');
assert(html.includes('function formatLedgerLocalOccurrence('),'local occurrence formatting is shared');
assert(html.includes('尚無消費紀錄')&&html.includes('點右下角 ＋ 開始記帳'),'recent empty state explains the next action');

const copyIndex=html.indexOf('個人帳留在本機；團體帳跨裝置同步。');
const recentIndex=html.indexOf('<h3>最近消費</h3>');
assert(copyIndex>0&&copyIndex<recentIndex,'dual-track explanation sits immediately before the recent section');

console.log('ledger list action tests passed');
