const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  console:{log:function(){},warn:function(){},error:function(){}},
  AppLog:{schema:function(){},data:function(){}}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('schema.js','utf8'), sandbox);
vm.runInContext(fs.readFileSync('validator.js','utf8'), sandbox);

assert.strictEqual(sandbox.SCHEMA.version,'2.7 (2026-07-19)','Ledger Schema version is 2.7');
assert.deepStrictEqual(
  Array.from(sandbox.SCHEMA.sheets.ledger.columns,function(column){return column.field;}),
  ['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId','storeName','replacesRecordId'],
  'Ledger Schema keeps the 14 existing fields and appends the two 2.7 fields'
);
assert(/消費發生時間/.test(sandbox.SCHEMA.sheets.ledger.columns[1].desc),'time means expense occurrence time');
assert.strictEqual(sandbox.SCHEMA.sheets.ledger.columns[14].header,'店名');
assert.strictEqual(sandbox.SCHEMA.sheets.ledger.columns[15].header,'取代紀錄ID');

const html = fs.readFileSync('index.html','utf8');
const parserStart = html.indexOf('function parseCSV(text)');
const parserEnd = html.indexOf('function parseKeyValue(csvText, sheetKey)');
assert.notStrictEqual(parserStart,-1,'parseCSV source exists');
assert.notStrictEqual(parserEnd,-1,'parseTable source boundary exists');
vm.runInContext(html.slice(parserStart,parserEnd), sandbox);

const csv = [
  '紀錄ID,時間,成員,類別,明細,日幣,台幣,備註,分攤成員,支付方式,紀錄類型,目標紀錄ID,刪除原因,批次ID,未知欄位',
  'ledger-20,2026-07-18T08:00:00.000Z,Bar,交通,租車,1200,252,roundtrip,"[""Bar"",""Amy""]",現金,expense,,,batch-001,ignored'
].join('\n');
const rows = sandbox.parseTable(csv,'ledger');

assert.strictEqual(rows.length,1,'Ledger 2.0 row parses');
assert.strictEqual(rows[0].participants,'["Bar","Amy"]','participants JSON array string round-trips unchanged');
assert.strictEqual(rows[0].payMethod,'現金');
assert.strictEqual(rows[0].recordType,'expense');
assert.strictEqual(rows[0].targetRecordId,'');
assert.strictEqual(rows[0].deleteReason,'');
assert.strictEqual(rows[0].batchId,'batch-001');
assert.strictEqual(Object.prototype.hasOwnProperty.call(rows[0],'未知欄位'),false,'unknown Sheet fields are ignored');

console.log('Ledger Schema 2.7 contract tests passed');
