const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadSchema(source) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.SCHEMA;
}

const schemaSource = fs.readFileSync('schema.js', 'utf8');
const schema = loadSchema(schemaSource);
const ledgerColumns = schema.sheets.ledger.columns;
const typeColumn = schema.sheets.places.columns.find(function(column) {
  return column.field === 'type';
});

assert.strictEqual(schema.version, '2.6 (2026-07-18)');
assert.strictEqual(
  schema.sheets.exp.desc,
  '行前團費僅存於試算表；App 不渲染，也不從 Exp 推導同行成員。'
);
assert.deepStrictEqual(
  Array.from(ledgerColumns, function(column){ return column.field; }),
  ['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId']
);
assert.deepStrictEqual(
  Array.from(ledgerColumns, function(column){ return column.header; }),
  ['紀錄ID','時間','成員','類別','明細','日幣','台幣','備註','分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID']
);
ledgerColumns.slice(8).forEach(function(column){
  assert.notStrictEqual(column.required, true, column.field + ' remains optional');
});
const recordTypeColumn = ledgerColumns.find(function(column){ return column.field === 'recordType'; });
assert.deepStrictEqual(
  Object.assign({}, recordTypeColumn.values),
  {expense:'expense',identity_registration:'identity_registration',deletion:'deletion'}
);

assert(typeColumn, 'Places.Type schema exists');
assert.strictEqual(typeColumn.values['機場'], 'attraction');
assert.strictEqual(typeColumn.values['纜車'], 'attraction');
assert.strictEqual(typeColumn.values['加油站'], 'fuel');
assert.strictEqual(typeColumn.values.fuel, 'fuel');

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes("'機場':'attraction'"), 'embedded schema includes 機場');
assert(html.includes("'纜車':'attraction'"), 'embedded schema includes 纜車');
assert(html.includes("'加油站':'fuel'"), 'embedded schema includes 加油站');
assert(html.includes("'fuel':'fuel'"), 'embedded schema includes normalized fuel');

const mapping = fs.readFileSync('09_SCHEMA_MAPPING.md', 'utf8').replace(/\r/g, '');
const mappingLines = mapping.split('\n');
const generatedStart = mappingLines.findIndex(function(line) {
  return line.indexOf('版本:' + schema.version) === 0;
});
assert.notStrictEqual(generatedStart, -1, 'mapping contains current schema version');
const generatedBody = mappingLines.slice(generatedStart).join('\n').trim();
assert.strictEqual(schemaDocBody(schemaSource), generatedBody);

console.log('schema type tests passed');

function schemaDocBody(source) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.schemaDoc().replace(/^# CMS[^\n]*\n\n/, '').trim();
}
