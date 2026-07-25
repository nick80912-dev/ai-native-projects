const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createSheet(name, rows) {
  const data = rows.map(function(row){ return row.slice(); });
  return {
    name,
    data,
    getValuesCalls: [],
    getLastRow(){ return data.length; },
    getLastColumn(){ return data.reduce(function(max, row){ return Math.max(max, row.length); }, 0); },
    getRange(row, column, rowCount, columnCount){
      const sheet = this;
      return {
        getValues(){
          sheet.getValuesCalls.push([row, column, rowCount, columnCount]);
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
    '分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID',
    '店名','取代紀錄ID','輸入幣別','免稅品','價格方式','稅率','優惠券金額'
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
    Date,
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
  function get(parameter){
    lock.waited = false;
    const output = sandbox.doGet({parameter: parameter || {}});
    return JSON.parse(output.getContent());
  }
  return {call, get, lock, ledger, cfg, sandbox, sheets};
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
    ledgerPayload.detail, 500, 105, '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ],
  'legacy ledger payload fills all optional fields with empty strings'
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
  storeName:'松屋 岡山站前店',
  replacesRecordId:'ledger-original-001',
  inputCurrency:'JPY',
  isTaxFree:true,
  priceMode:'excluded',
  taxRate:8,
  couponAmount:100,
  unknownField:'must not be serialized'
};
assert.deepStrictEqual(app.call(ledger20Payload),{ok:true},'Ledger 2.8 payload append succeeds');
assert.deepStrictEqual(
  Array.from(app.ledger.rowForId(ledger20Payload.id)),
  [
    ledger20Payload.id, ledger20Payload.time, ledger20Payload.member, ledger20Payload.category,
    ledger20Payload.detail, 1200, 252, 'roundtrip', '["Bar","Amy"]', '現金',
    'expense', '', '', 'batch-20260718-001', '松屋 岡山站前店', 'ledger-original-001',
    'JPY', true, 'excluded', 8, 100
  ],
  'Ledger 2.8 fields serialize in the exact Sheet contract order'
);
assert.strictEqual(app.ledger.rowForId(ledger20Payload.id).length,21,'unknown payload fields are ignored');
assert.strictEqual(app.call(Object.assign({},ledger20Payload,{id:'bad-currency',inputCurrency:'USD'})).ok,false,'unsupported input currency is rejected');
assert.strictEqual(app.call(Object.assign({},ledger20Payload,{id:'bad-price-mode',priceMode:'net'})).ok,false,'unsupported price mode is rejected');

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

/* ================= doGet ledger 加速層契約(唯讀增量端點) ================= */
// 讀取路徑為 Google Sheets 發布 CSV,伺服器端快取 1–5 分鐘;doGet 只服務 ledger 單表,
// 作為加速層而非取代層。其餘 7 張表維持既有 CSV 原子快照節奏。

const readApp = loadAppScript();
function seedLedgerRow(app, id, time){
  return app.call({
    id, time, member:'Bar', category:'其他', detail:'[TEST] fast pull '+id,
    amountJpy:100, amountTwd:20, note:'', participants:'["Bar"]', payMethod:'現金',
    recordType:'expense', targetRecordId:'', deleteReason:'', batchId:''
  });
}

assert.strictEqual(typeof readApp.sandbox.doGet, 'function', 'doGet 唯讀端點存在');

// 空表 + after=0:常態心跳,payload 極小
const emptyRead = readApp.get({action:'ledger', after:'0'});
assert.strictEqual(emptyRead.ok, true, '空 ledger 仍回 ok:true');
assert.strictEqual(emptyRead.total, 0, 'total = getLastRow()-1,表頭不計');
assert.strictEqual(emptyRead.after, 0, 'after 回傳 client 已讀計數');
assert.strictEqual(emptyRead.reset, false, 'after === total 不觸發 reset');
assert.deepStrictEqual(emptyRead.rows, [], 'after >= total 回空陣列');
assert.strictEqual(typeof emptyRead.serverTime, 'string', 'serverTime 為字串');
assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(emptyRead.serverTime), 'serverTime 為 ISO 時間');

// 規則 10:total === 0 且 after > 0
const truncatedEmpty = readApp.get({action:'ledger', after:'5'});
assert.deepStrictEqual(
  {ok:truncatedEmpty.ok, reset:truncatedEmpty.reset, total:truncatedEmpty.total, after:truncatedEmpty.after, rows:truncatedEmpty.rows},
  {ok:true, reset:true, total:0, after:0, rows:[]},
  '空表但 client 已讀 > 0 時回 reset'
);

// 規則 17 / 測試 #77:after >= total 不得呼叫 getValues()
readApp.ledger.getValuesCalls.length = 0;
readApp.get({action:'ledger', after:'0'});
assert.strictEqual(readApp.ledger.getValuesCalls.length, 0, 'after >= total 不呼叫 getValues(),保護執行配額');

seedLedgerRow(readApp, 'fast-1', '2026-07-25T00:00:00.000Z');
seedLedgerRow(readApp, 'fast-2', '2026-07-25T00:01:00.000Z');
seedLedgerRow(readApp, 'fast-3', '2026-07-25T00:02:00.000Z');

// 測試 #34:after < total 只回新列,且以精確 range 讀取
readApp.ledger.getValuesCalls.length = 0;
const incremental = readApp.get({action:'ledger', after:'1'});
assert.strictEqual(incremental.ok, true, '增量讀取成功');
assert.strictEqual(incremental.total, 3, 'total 為目前資料列數');
assert.strictEqual(incremental.after, 1, 'after 原樣回傳');
assert.strictEqual(incremental.reset, false, 'after < total 不 reset');
assert.strictEqual(incremental.rows.length, 2, '只回第 after+1 筆起的新列');
assert.deepStrictEqual(incremental.rows.map(function(row){ return row[0]; }), ['fast-2','fast-3'], '回傳的是正確的增量列');
assert.strictEqual(incremental.rows[0].length, 21, '固定讀取 21 欄');
assert.deepStrictEqual(readApp.ledger.getValuesCalls, [[3, 1, 2, 21]], '以 getRange(after+2,1,total-after,21) 精確讀取,不整表掃描');

// 測試 #33:after === total 回空陣列
const heartbeat = readApp.get({action:'ledger', after:'3'});
assert.deepStrictEqual(
  {ok:heartbeat.ok, total:heartbeat.total, after:heartbeat.after, reset:heartbeat.reset, rows:heartbeat.rows},
  {ok:true, total:3, after:3, reset:false, rows:[]},
  'after === total 為常態心跳,payload 極小'
);

// 測試 #35:after > total(Bar 手動刪列造成截斷)→ reset + 全量
const reset = readApp.get({action:'ledger', after:'9'});
assert.strictEqual(reset.ok, true, '截斷後仍回 ok:true');
assert.strictEqual(reset.reset, true, 'after > total 回 reset:true');
assert.strictEqual(reset.after, 0, 'reset 後 after 歸零供 client 重置已讀計數');
assert.strictEqual(reset.rows.length, 3, 'reset 回傳全量 rows');

// after 正規化(規則 8、9)
[undefined, '', '  ', 'abc', '-3', null].forEach(function(value){
  const normalized = readApp.get(value === undefined ? {action:'ledger'} : {action:'ledger', after:value});
  assert.strictEqual(normalized.after, 0, 'after=' + JSON.stringify(value) + ' 正規化為 0');
  assert.strictEqual(normalized.rows.length, 3, 'after 正規化為 0 時回全量');
});
assert.strictEqual(readApp.get({action:'ledger', after:'2.9'}).after, 2, 'after 為小數時向下取整');

// 規則 7:action 必須精確等於 ledger
['', 'Ledger', 'ledger ', 'settings', undefined].forEach(function(value){
  const rejected = readApp.get(value === undefined ? {} : {action:value});
  assert.strictEqual(rejected.ok, false, 'action=' + JSON.stringify(value) + ' 必須被拒絕');
  assert.strictEqual(typeof rejected.error, 'string', '失敗回傳帶 error 字串');
});

// 規則 12:不得洩漏 Sheet 物件、例外 stack、Spreadsheet ID
const allReadPayloads = [emptyRead, truncatedEmpty, incremental, heartbeat, reset, readApp.get({action:'nope'})]
  .map(function(payload){ return JSON.stringify(payload); }).join('\n');
assert.ok(allReadPayloads.indexOf('Spreadsheet') < 0, '回應不含 Spreadsheet 內部資訊');
assert.ok(!/\bat\s+\w+\s+\(/.test(allReadPayloads), '回應不含例外 stack');

// 規則 15:doGet 唯讀,不加 LockService(避免與 doPost 搶鎖與消耗配額)
readApp.lock.waited = false;
readApp.get({action:'ledger', after:'0'});
assert.strictEqual(readApp.lock.waited, false, 'doGet 不取 script lock');
const gsSource = fs.readFileSync('apps-script/ledger-sync.gs','utf8');
// doGet 與其輔助函式位於 doPost 與 appendLedger 之間;只檢查這一段。
const doGetSource = gsSource.slice(gsSource.indexOf('function doGet('), gsSource.indexOf('function appendLedger('));
assert.ok(doGetSource.indexOf('normalizeLedgerAfter') > 0, 'doGet 區段包含其 after 正規化輔助函式');
assert.ok(doGetSource.indexOf('LockService') < 0, 'doGet 原始碼不使用 LockService');
assert.ok(doGetSource.indexOf('appendRow') < 0 && doGetSource.indexOf('setValue') < 0, 'doGet 為唯讀,不寫入');

// 規則 11:工作表不存在或欄數不足 21
const noSheetApp = loadAppScript();
delete noSheetApp.sheets['分帳紀錄'];
assert.strictEqual(noSheetApp.get({action:'ledger', after:'0'}).ok, false, '「分帳紀錄」不存在時回 ok:false');
const narrowApp = loadAppScript();
narrowApp.ledger.data[0] = narrowApp.ledger.data[0].slice(0, 16);
assert.strictEqual(narrowApp.get({action:'ledger', after:'0'}).ok, false, '欄數不足 21 時回 ok:false');

// 規則 16:doPost 既有契約與驗證邏輯完全不動
const postApp = loadAppScript();
assert.deepStrictEqual(
  postApp.call({action:'updateSettings', exchangeRate:0.2, defaultCurrency:'JPY'}),
  {ok:true, settings:{exchangeRate:0.2, defaultCurrency:'JPY'}},
  'doPost updateSettings 契約不變'
);
assert.strictEqual(postApp.lock.waited, true, 'doPost 仍取 script lock');

console.log('Apps Script settings tests passed');
