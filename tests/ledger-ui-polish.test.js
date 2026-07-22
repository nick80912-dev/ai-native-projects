const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');

function extractFunction(name,nextName){
  const start=html.indexOf('function '+name+'(');
  const end=html.indexOf('function '+nextName+'(',start);
  assert(start>=0,'missing function '+name);
  assert(end>start,'missing boundary '+nextName);
  return html.slice(start,end);
}

const dateSandbox={Date,Number,String,isFinite,timestampDate(value){return new Date(Number(value));}};
vm.createContext(dateSandbox);
vm.runInContext(
  extractFunction('ledgerLocalDateFromParts','parseLedgerDateInput')+
  extractFunction('parseLedgerDateInput','ledgerDateInputValue')+
  extractFunction('ledgerDateInputValue','ledgerTimeInputValue')+
  extractFunction('ledgerTimeInputValue','ledgerOccurrenceIso')+
  extractFunction('ledgerOccurrenceIso','ledgerDefaultCategory'),
  dateSandbox
);

assert.strictEqual(dateSandbox.parseLedgerDateInput('2026/07/19'),'2026/07/19');
['2026-7-9','2026.02.28','2024/2/29','2026/2/29','2026/02/30','2026/0/10','2026/13/1','2026/1/0','2026/1/32','7/19/2026','26/7/19','1999/12/31','2100/1/1'].forEach(function(value){
  assert.throws(()=>dateSandbox.parseLedgerDateInput(value),/日期格式/,'rejects '+value);
});
assert.throws(()=>dateSandbox.parseLedgerDateInput('not-a-date'),/日期格式/);
assert.strictEqual(dateSandbox.ledgerTimeInputValue('9:05'),'09:05');
assert.strictEqual(dateSandbox.ledgerTimeInputValue(''),'','time is optional');
assert.throws(()=>dateSandbox.ledgerTimeInputValue('25:00'),/時間格式/);
assert.strictEqual(
  dateSandbox.ledgerOccurrenceIso('2026/07/19',''),
  new Date(2026,6,19,0,0,0,0).toISOString(),
  'an omitted time is stored at local midnight'
);

const helperStart=html.indexOf('/* ================= ledgerRepository');
const helperEnd=html.indexOf('/* ================= 分帳(雲端 Ledger)',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'ledger helper section exists');
const helperSandbox={
  console,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){return Promise.reject(new Error('offline'));},setTimeout,clearTimeout,
  Date,Math,Promise,JSON,String,Number,isFinite,encodeURIComponent,decodeURIComponent,
  timestampDate(value){return new Date(Number(value));},
  AppLog:{repo(){},sync(){}},renderSplit(){},updateLedgerPendingStatus(){}
};
vm.createContext(helperSandbox);
vm.runInContext(html.slice(helperStart,helperEnd),helperSandbox);

assert.strictEqual(helperSandbox.ledgerVisibleNote({note:'旅途備註'}),'旅途備註');
assert.deepStrictEqual(JSON.parse(JSON.stringify(helperSandbox.ledgerRecordMetadata({inputCurrency:'JPY',isTaxFree:true,priceMode:'excluded',taxRate:8,couponAmount:80,isProxy:true,proxyTarget:'阿芬'}))),{inputCurrency:'JPY',isTaxFree:true,priceMode:'excluded',taxRate:8,couponAmount:80,isProxy:true,proxyTarget:'阿芬'});

const records=[
  {id:'regular',detail:'早餐',note:'',category:'餐飲',payMethod:'現金',isProxy:false,isTaxFree:false},
  {id:'tax-free',detail:'藥妝',note:'',isTaxFree:true,category:'購物',payMethod:'信用卡'},
  {id:'proxy',detail:'禮物',note:'',isProxy:true,proxyTarget:'阿芬',category:'購物',payMethod:'信用卡'}
];
assert.deepStrictEqual(Array.from(helperSandbox.filterLedgerHistory(records,'',{taxExempt:'tax-exempt'}),item=>item.id),['tax-free']);
assert.deepStrictEqual(Array.from(helperSandbox.filterLedgerHistory(records,'',{taxExempt:'non-tax-exempt'}),item=>item.id),['regular','proxy']);
assert.deepStrictEqual(Array.from(helperSandbox.filterLedgerHistory(records,'',{proxy:'proxy'}),item=>item.id),['proxy']);

assert(!html.includes('id="ledgerOccurredAt"')&&!html.includes('ledgerDateTimeLocalValue'),'the iOS-overflowing ledger datetime-local field is removed without touching diagnostics');
assert(html.includes('id="ledgerOccurredDate"')&&html.includes('id="ledgerOccurredTime"'),'date and time are separate controls');
assert(html.includes('id="ledgerCalendarPopover"'),'custom calendar popover is rendered');
assert(html.includes('id="ledgerHistoryFilterButton"')&&html.includes('id="ledgerHistoryFilterPanel"'),'history uses a collapsible filter panel');
assert(html.includes('.ledger-history-filter-panel[hidden],.ledger-filter-badge[hidden]{display:none!important}'),'collapsed filter UI remains hidden despite component display rules');
assert(html.includes('historyTaxExempt'),'history state includes the tax-exempt filter');
assert(html.includes('找到 ')&&html.includes('ledgerHistorySummary'),'history keeps the result count and dual-currency totals');
assert(html.includes('封閉集合給軌道，開放集合放散'),'the segmented/chips design law is documented in code');
assert(!html.includes('單項設定 ·'),'retired item override copy is absent');
assert(html.includes('ledger-item-control-row'),'category, tax-exempt and proxy controls share a compact row');
assert(html.includes('新增對象')&&html.includes('ledgerProxyTargetInput'),'proxy target entry is inline rather than prompt-only');
assert(html.includes('稅與優惠券（選填）'),'tax disclosure uses the approved title');
assert(html.includes('更多細節（備註選填）'),'optional details disclosure is note-only');

const sw=fs.readFileSync('sw.js','utf8');
assert.match(sw,/okayama-trip-v37/,'service worker cache is v37');

console.log('ledger 2.2 UI polish tests passed');
