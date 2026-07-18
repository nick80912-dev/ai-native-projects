const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createSheet(name, rows) {
  const data = rows.map(function(row){ return row.slice(); });
  return {
    name,
    data,
    getLastRow(){ return data.length; },
    getRange(row, column, rowCount, columnCount){
      return {
        getValues(){
          const height = rowCount === undefined ? 1 : rowCount;
          const width = columnCount === undefined ? 1 : columnCount;
          const values = [];
          for(let r=0;r<height;r++){
            const source = data[row - 1 + r] || [];
            const valuesRow = [];
            for(let c=0;c<width;c++) valuesRow.push(source[column - 1 + c] === undefined ? '' : source[column - 1 + c]);
            values.push(valuesRow);
          }
          return values;
        },
        setValue(value){
          while(data.length < row) data.push([]);
          data[row - 1][column - 1] = value;
        }
      };
    },
    appendRow(values){ data.push(values.slice()); },
    valueFor(key){
      const row = data.find(function(values){ return String(values[0]).trim() === key; });
      return row && row[1];
    },
    rowForId(id){ return data.find(function(values, index){ return index > 0 && String(values[0]) === String(id); }); },
    rowsForId(id){ return data.filter(function(values, index){ return index > 0 && String(values[0]) === String(id); }).length; }
  };
}

function loadAppScript(){
  const lock = {
    waited: false,
    released: false,
    waitLock(ms){ this.waited = ms === 10000; },
    releaseLock(){ this.released = true; }
  };
  const ledger = createSheet('分帳紀錄', [[
    '紀錄ID','時間','成員','類別','明細','日幣','台幣','備註',
    '分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID'
  ]]);
  const cfg = createSheet('TripConfig', [
    ['Key','Value'],
    ['Trip Name','岡山四國六天五夜'],
    ['Currency','JPY'],
    ['Exchange Rate',0.2]
  ]);
  const sheets = {'分帳紀錄':ledger, TripConfig:cfg};
  const sandbox = {
    JSON,
    String,
    Number,
    Math,
    isFinite,
    LockService:{ getScriptLock(){ return lock; } },
    SpreadsheetApp:{
      getActiveSpreadsheet(){
        return { getSheetByName(name){ return sheets[name] || null; } };
      }
    },
    ContentService:{
      MimeType:{JSON:'application/json'},
      createTextOutput(content){
        return {
          setMimeType(){ return this; },
          getContent(){ return content; }
        };
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('apps-script/ledger-sync.gs','utf8'), sandbox);
  function call(payload){
    lock.released = false;
    const output = sandbox.doPost({postData:{contents:JSON.stringify(payload)}});
    return JSON.parse(output.getContent());
  }
  return {call, lock, ledger, cfg};
}

const app = loadAppScript();
const originalTripName = app.cfg.valueFor('Trip Name');
const originalCurrency = app.cfg.valueFor('Currency');
const updated = app.call({
  action:'updateSettings',
  exchangeRate:0.21,
  defaultCurrency:'twd',
  key:'Trip Name',
  value:'不可寫入'
});
assert.deepStrictEqual(updated,{ok:true,settings:{exchangeRate:0.21,defaultCurrency:'TWD'}});
assert.strictEqual(app.cfg.valueFor('Exchange Rate'),0.21,'updates the exact Exchange Rate key');
assert.strictEqual(app.cfg.valueFor('Ledger Default Currency'),'TWD','seeds the exact Ledger Default Currency key');
assert.strictEqual(app.cfg.valueFor('Trip Name'),originalTripName,'arbitrary payload cannot update Trip Name');
assert.strictEqual(app.cfg.valueFor('Currency'),originalCurrency,'existing trip Currency remains Bar-managed');
assert.strictEqual(app.lock.waited,true,'request takes the script lock');
assert.strictEqual(app.lock.released,true,'request releases the script lock');

const cfgBeforeInvalid = JSON.stringify(app.cfg.data);
assert.strictEqual(app.call({action:'updateSettings',exchangeRate:0,defaultCurrency:'JPY'}).ok,false,'zero exchange rate is rejected');
assert.strictEqual(app.call({action:'updateSettings',exchangeRate:0.2,defaultCurrency:'USD'}).ok,false,'unsupported default currency is rejected');
assert.strictEqual(JSON.stringify(app.cfg.data),cfgBeforeInvalid,'invalid settings do not mutate TripConfig');

const ledgerPayload = {
  id:'1784274603804-y3g6',
  time:'2026-07-17T12:30:03.804Z',
  member:'黃柏',
  category:'餐飲',
  detail:'[TEST] Apps Script contract',
  amountJpy:500,
  amountTwd:105,
  note:''
};
assert.deepStrictEqual(app.call(ledgerPayload),{ok:true},'legacy ledger append still succeeds');
assert.deepStrictEqual(app.call(ledgerPayload),{ok:true,dup:true},'duplicate ledger ID is acknowledged');
assert.strictEqual(app.ledger.rowsForId(ledgerPayload.id),1,'duplicate ledger ID is stored once');
assert.deepStrictEqual(
  Array.from(app.ledger.rowForId(ledgerPayload.id)),
  [
    ledgerPayload.id, ledgerPayload.time, ledgerPayload.member, ledgerPayload.category,
    ledgerPayload.detail, 500, 105, '', '', '', '', '', '', ''
  ],
  'legacy ledger payload fills the six optional fields with empty strings'
);

const ledger20Payload = {
  id:'1784274603805-ledger20',
  time:'2026-07-18T08:00:00.000Z',
  member:'Bar',
  category:'交通',
  detail:'[TEST] Ledger 2.0 contract',
  amountJpy:1200,
  amountTwd:252,
  note:'roundtrip',
  participants:'["Bar","Amy"]',
  payMethod:'現金',
  recordType:'expense',
  targetRecordId:'',
  deleteReason:'',
  batchId:'batch-20260718-001',
  unknownField:'must not be serialized'
};
assert.deepStrictEqual(app.call(ledger20Payload),{ok:true},'Ledger 2.0 payload append succeeds');
assert.deepStrictEqual(
  Array.from(app.ledger.rowForId(ledger20Payload.id)),
  [
    ledger20Payload.id, ledger20Payload.time, ledger20Payload.member, ledger20Payload.category,
    ledger20Payload.detail, 1200, 252, 'roundtrip', '["Bar","Amy"]', '現金',
    'expense', '', '', 'batch-20260718-001'
  ],
  'Ledger 2.0 fields serialize in the exact Sheet contract order'
);
assert.strictEqual(app.ledger.rowForId(ledger20Payload.id).length,14,'unknown payload fields are ignored');

const identityPayload = {
  id:'1784274603806-identity',
  time:'2026-07-18T08:01:00.000Z',
  member:'Amy',
  category:'系統',
  detail:'身分登記',
  amountJpy:0,
  amountTwd:0,
  note:'',
  participants:'["Amy"]',
  payMethod:'',
  recordType:'identity_registration',
  targetRecordId:'',
  deleteReason:'',
  batchId:'batch-20260718-identity'
};
assert.deepStrictEqual(app.call(identityPayload),{ok:true},'zero-amount identity registration succeeds');
assert.strictEqual(app.ledger.rowForId(identityPayload.id)[5],0,'zero JPY remains numeric zero');
assert.strictEqual(app.ledger.rowForId(identityPayload.id)[6],0,'zero TWD remains numeric zero');

const ledgerBeforeInvalid = JSON.stringify(app.ledger.data);
assert.strictEqual(app.call(Object.assign({},ledgerPayload,{id:'missing-jpy',amountJpy:undefined})).ok,false,'missing JPY amount is rejected');
assert.strictEqual(app.call(Object.assign({},ledgerPayload,{id:'missing-twd',amountTwd:undefined})).ok,false,'missing TWD amount is rejected');
assert.strictEqual(app.call(Object.assign({},ledgerPayload,{id:'invalid-jpy',amountJpy:'not-a-number'})).ok,false,'invalid amount is rejected');
assert.strictEqual(JSON.stringify(app.ledger.data),ledgerBeforeInvalid,'invalid ledger payloads do not mutate the sheet');

console.log('Apps Script settings tests passed');
