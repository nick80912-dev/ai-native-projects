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
  extractFunction('ledgerLocalDateFromParts','formatLedgerDateTyping')+
  extractFunction('formatLedgerDateTyping','parseLedgerDateInput')+
  extractFunction('parseLedgerDateInput','ledgerDateInputValue'),
  dateSandbox
);

assert.strictEqual(dateSandbox.formatLedgerDateTyping(''),'','date may be cleared while editing');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('2026'),'2026/');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('202607'),'2026/07/');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('20260719'),'2026/07/19');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('2026/0719'),'2026/07/19');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('2026071999'),'2026/07/19','typing is capped at eight digits');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('2026-07-19'),'2026-07-19','unsupported separators remain invalid instead of being silently normalized');
assert.strictEqual(dateSandbox.formatLedgerDateTyping('2026.07.19'),'2026.07.19','dot separators remain invalid');
assert.strictEqual(dateSandbox.parseLedgerDateInput('2026/07/19'),'2026/07/19');
['','2026','2026/07','2026-07-19','2026.07.19','2026/02/30'].forEach(value=>{
  assert.throws(()=>dateSandbox.parseLedgerDateInput(value),/YYYY\/MM\/DD/,'strictly rejects '+value);
});

const unitSandbox={String,Object,Array};
vm.createContext(unitSandbox);
vm.runInContext(
  extractFunction('groupLedgerDisplayUnits','ledgerBatchSelectionState')+
  extractFunction('groupLedgerDisplayUnitsByCategory','ledgerBatchSelectionState')+
  extractFunction('ledgerBatchSelectionState','ledgerCategoryEmoji')+
  extractFunction('ledgerCategoryEmoji','formatLedgerDualAmounts'),
  unitSandbox
);
const units=JSON.parse(JSON.stringify(unitSandbox.groupLedgerDisplayUnits([
  {id:'a',batchId:'batch-1',time:'2026-07-19T01:00:00Z'},
  {id:'b',batchId:'batch-1',time:'2026-07-19T01:01:00Z'},
  {id:'c',batchId:'',time:'2026-07-19T02:00:00Z'}
])));
assert.strictEqual(units.length,2,'same batch becomes one display unit');
assert.strictEqual(units[0].type,'batch');
assert.deepStrictEqual(units[0].records.map(record=>record.id),['a','b']);
assert.strictEqual(units[1].type,'record');
const categoryGroups=JSON.parse(JSON.stringify(unitSandbox.groupLedgerDisplayUnitsByCategory([
  {id:'a',batchId:'batch-1',category:'餐飲'},
  {id:'b',batchId:'batch-1',category:'購物'},
  {id:'c',batchId:'',category:'交通'}
])));
assert.strictEqual(categoryGroups['多品項'].length,1,'a mixed-category batch appears once in the multi-item category');
assert.deepStrictEqual(categoryGroups['多品項'][0].records.map(record=>record.id),['a','b']);
assert.strictEqual(categoryGroups['交通'][0].records[0].id,'c');
assert.strictEqual(unitSandbox.ledgerBatchSelectionState([{id:'a'},{id:'b'}],{a:true}),'partial');
assert.strictEqual(unitSandbox.ledgerBatchSelectionState([{id:'a'},{id:'b'}],{a:true,b:true}),'all');
assert.strictEqual(unitSandbox.ledgerBatchSelectionState([{id:'a'},{id:'b'}],{}),'none');
assert.strictEqual(unitSandbox.ledgerCategoryEmoji('餐飲'),'🍜');
assert.strictEqual(unitSandbox.ledgerCategoryEmoji('自訂類別'),'📌','custom categories retain a safe fallback');

let personalWrites=0,writtenRecords=null;
const personalDeleteSandbox={
  PERSONAL_LEDGER_KEY:'trip_personal_ledger',JSON,
  personalLedgerRepository:{all(){return [{id:'a'},{id:'b'},{id:'c'}];}},
  localStorage:{setItem(key,value){personalWrites++;assert.strictEqual(key,'trip_personal_ledger');writtenRecords=JSON.parse(value);}}
};
vm.createContext(personalDeleteSandbox);
vm.runInContext(extractFunction('deletePersonalLedgerRecords','deleteSelectedLedgerRecords'),personalDeleteSandbox);
assert.strictEqual(personalDeleteSandbox.deletePersonalLedgerRecords(['a','c']),2);
assert.strictEqual(personalWrites,1,'personal multi-delete performs one localStorage write');
assert.deepStrictEqual(writtenRecords,[{id:'b'}]);

const selectionMarkupSandbox={ledgerUiState:{selectionMode:true,selectedRecordIds:{}},JSON,ledgerBatchSelectionState(){return 'none';}};
vm.createContext(selectionMarkupSandbox);
vm.runInContext(extractFunction('jsString','jsHtmlAttrString')+extractFunction('jsHtmlAttrString','timestampDate')+extractFunction('renderLedgerSelectionControl','renderLedgerRecentRecord'),selectionMarkupSandbox);
const selectionMarkup=selectionMarkupSandbox.renderLedgerSelectionControl([{id:'a'},{id:'b'}]);
assert(selectionMarkup.includes("toggleLedgerBatchSelection(['a','b'],event)"),'selection IDs are quoted without breaking the HTML attribute');
const hostileSelectionMarkup=selectionMarkupSandbox.renderLedgerSelectionControl([{id:'a"b'},{id:"c'd"},{id:'e&f'},{id:'x\\y'},{id:'n\nx'}]);
assert(hostileSelectionMarkup.includes('a&quot;b'),'double quotes are HTML-attribute encoded');
assert(hostileSelectionMarkup.includes("c\\'d"),'single quotes are JavaScript encoded');
assert(hostileSelectionMarkup.includes('e&amp;f'),'ampersands are HTML-attribute encoded');
assert(hostileSelectionMarkup.includes('x\\\\y'),'backslashes are JavaScript encoded');
assert(hostileSelectionMarkup.includes('n\\nx'),'line breaks are JavaScript encoded');

assert(html.includes('class="ledger-entry-heading-row ledger-entry-divider"'),'identity and multi-item toggle share the heading row and divider token');
assert(html.includes('oninput="formatLedgerDateField(this)"'),'date field formats as the user types');
assert(html.includes('class="ledger-batch-card'),'batch summary card is rendered');
assert(html.includes('groupLedgerDisplayUnitsByCategory'),'category-grouped history keeps batches collapsed');
assert(html.includes('jsHtmlAttrString(record.id)')&&html.includes('jsHtmlAttrString(batchId)'),'record and batch inline handlers use context-safe IDs');
assert(html.includes('var safeId=jsHtmlAttrString(id)'),'popover action handlers use context-safe IDs');
assert(html.includes("className='ledger-action-popover'"),'record actions use an anchored popover');
assert(!html.includes("openLedgerInfoSheet('消費操作'"),'record actions no longer open a bottom sheet');
assert(html.includes('class="ledger-selection-toolbar'),'recent records expose a floating multi-select toolbar');
assert(html.includes('ledgerRepository.enqueueBatch(deletions)'),'shared multi-delete enqueues all tombstones once');
assert(html.includes('ledgerCategoryEmoji'),'category badges use an emoji mapping');
assert(html.includes('formatLedgerDualAmounts'),'cards always render JPY and TWD together');
assert(!/overflow-x\s*:\s*hidden/.test(html.slice(html.indexOf('.ledger-sheet{'),html.indexOf('.ledger-sheet-head{'))),'sheet overflow is not hidden as a workaround');

const sw=fs.readFileSync('sw.js','utf8');
assert.match(sw,/okayama-trip-v24/,'service worker cache is v24');

console.log('ledger 2.2.1 UI tests passed');
