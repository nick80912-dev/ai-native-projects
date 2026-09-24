const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {appHtml}=require('./support/version');

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

assert.strictEqual(schema.version, '3.0 (2026-08-11)');
/* v136:Ledger Default Currency 同時是全團結算幣別(ADR 0007)。說明原寫「分帳預設輸入幣別」,
   只講了一半 —— v135 查到有人照字面改成另一幣別,已還清的人會重新被要求付款。
   只改說明文字,欄位名稱、合法值與驗證規則不變。 */
const ledgerCurrencyKey = schema.sheets.cfg.keys.find(function(key) {
  return key.field === 'ledgerDefaultCurrency';
});
assert.strictEqual(ledgerCurrencyKey.header, 'Ledger Default Currency', 'the Sheet key name is unchanged');
assert.strictEqual(ledgerCurrencyKey.desc, '全團結算幣別,也是新增記帳的預設幣別;只允許 JPY/TWD',
  'the schema describes the key as the group settlement currency, not just the default input');
assert.deepStrictEqual(Object.keys(ledgerCurrencyKey.values).sort(), ['JPY', 'TWD', 'jpy', 'twd'], 'accepted values are unchanged');
const hotelIdColumn = schema.sheets.places.columns.find(function(column) {
  return column.field === 'hotelId';
});
assert(hotelIdColumn, 'Places.HID schema exists');
assert.strictEqual(hotelIdColumn.header, 'HID');
assert.deepStrictEqual(Array.from(hotelIdColumn.aliases), ['hotelid','住宿id']);
assert.notStrictEqual(hotelIdColumn.required, true, 'HID is conditionally required only for hotel rows');
const hotelNameColumn = schema.sheets.hotels.columns.find(function(column) {
  return column.field === 'name';
});
assert.doesNotMatch(hotelNameColumn.desc || '', /名稱比對|match/i);
assert.strictEqual(
  schema.sheets.exp.desc,
  '行前團費僅存於試算表；App 不渲染，也不從 Exp 推導同行成員。'
);
assert.deepStrictEqual(
  Array.from(ledgerColumns, function(column){ return column.field; }),
  ['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId','storeName','replacesRecordId','inputCurrency','isTaxFree','priceMode','taxRate','couponAmount']
);
assert.deepStrictEqual(
  Array.from(ledgerColumns, function(column){ return column.header; }),
  ['紀錄ID','時間','成員','類別','明細','日幣','台幣','備註','分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID','店名','取代紀錄ID','輸入幣別','免稅品','價格方式','稅率','優惠券金額']
);
ledgerColumns.slice(8).forEach(function(column){
  assert.notStrictEqual(column.required, true, column.field + ' remains optional');
});
const recordTypeColumn = ledgerColumns.find(function(column){ return column.field === 'recordType'; });
assert.deepStrictEqual(
  Object.assign({}, recordTypeColumn.values),
  {expense:'expense',identity_registration:'identity_registration',deletion:'deletion',settlement_claim:'settlement_claim',settlement_confirm:'settlement_confirm',settlement_reject:'settlement_reject',expense_correction_item:'expense_correction_item',expense_correction_commit:'expense_correction_commit',expense_void_commit:'expense_void_commit'}
);

assert(typeColumn, 'Places.Type schema exists');
assert.strictEqual(typeColumn.values['機場'], 'attraction');
assert.strictEqual(typeColumn.values['纜車'], 'attraction');
assert.strictEqual(typeColumn.values['加油站'], 'fuel');
assert.strictEqual(typeColumn.values.fuel, 'fuel');

const html = appHtml();
const embeddedSchemaStart = html.indexOf('var SCHEMA =');
const embeddedSchemaSource = html.slice(embeddedSchemaStart, html.indexOf('</script>',embeddedSchemaStart));
const embeddedSchema = loadSchema(embeddedSchemaSource);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(embeddedSchema)),
  JSON.parse(JSON.stringify(schema)),
  'embedded fallback Schema stays in exact object parity with schema.js'
);
assert.strictEqual(
  schema.sheets.places.columns[schema.sheets.places.columns.length-1].field,
  'hotelId',
  'Places.HID remains the trailing physical Sheet column'
);
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
