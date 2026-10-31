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

/* ================= v168 不限日本(backlog #62) ================= */
(function(){
  const krw = loadAppScript();
  krw.cfg.data.forEach(function(row){ if(row[0]==='Currency') row[1]='krw'; });
  assert.deepStrictEqual(krw.call({action:'updateSettings',exchangeRate:0.024,defaultCurrency:'KRW'}),
    {ok:true,settings:{exchangeRate:0.024,defaultCurrency:'KRW'}},'a KRW trip can settle in KRW');
  assert.strictEqual(krw.cfg.valueFor('Ledger Default Currency'),'KRW');
  assert.strictEqual(krw.call({action:'updateSettings',exchangeRate:0.024,defaultCurrency:'TWD'}).ok,true,'TWD is always allowed');
  assert.strictEqual(krw.call({action:'updateSettings',exchangeRate:0.024,defaultCurrency:'JPY'}).ok,false,'JPY is not this trip\'s currency');
  assert.strictEqual(krw.call(Object.assign({},ledger20Payload,{id:'krw-1',inputCurrency:'KRW'})).ok,true,'the trip currency is accepted as input currency');
  assert.strictEqual(krw.call(Object.assign({},ledger20Payload,{id:'krw-2',inputCurrency:'JPY'})).ok,false,'another currency is rejected');
  const usd = loadAppScript();
  usd.cfg.data.forEach(function(row){ if(row[0]==='Currency') row[1]='USD'; });
  assert.strictEqual(usd.call(Object.assign({},ledger20Payload,{id:'usd-1',inputCurrency:'USD',amountJpy:12.5,amountTwd:401,couponAmount:0.5})).ok,true,'two-decimal amounts are accepted');
  assert.strictEqual(usd.ledger.rowForId('usd-1')[5],12.5,'US$12.50 is written as 12.5');
  /* 新範本第 6 欄可以叫「當地幣」 */
  const header = loadAppScript();
  header.ledger.data[0][5] = '當地幣';
  assert.strictEqual(header.get({action:'info'}).ledgerHeaderOk,true,'the new 當地幣 header is accepted');
  header.ledger.data[0][5] = '美金';
  assert.strictEqual(header.get({action:'info'}).ledgerHeaderOk,false,'other headers are still rejected');
  /* 岡山(Currency JPY)行為不變 */
  const okayama = loadAppScript();
  assert.strictEqual(okayama.call({action:'updateSettings',exchangeRate:0.2,defaultCurrency:'JPY'}).ok,true);
  assert.strictEqual(okayama.call({action:'updateSettings',exchangeRate:0.2,defaultCurrency:'USD'}).ok,false);
  const noCurrency = loadAppScript();
  noCurrency.cfg.data = noCurrency.cfg.data.filter(function(row){ return row[0]!=='Currency'; });
  assert.strictEqual(noCurrency.call({action:'updateSettings',exchangeRate:0.2,defaultCurrency:'JPY'}).ok,true,'no Currency key means JPY');
})();

/* ================= v150 doGet?action=info(連接新旅程,ADR 0021) ================= */
const infoApp = loadAppScript();
assert.deepStrictEqual(infoApp.get({action:'info'}), {ok:true, tripId:'', ledgerHeaderOk:true}, '岡山試算表沒有 Trip ID 時回空字串');
infoApp.cfg.data.push(['Trip ID', ' kyushu-2027 ']);
assert.deepStrictEqual(infoApp.get({action:'info'}), {ok:true, tripId:'kyushu-2027', ledgerHeaderOk:true}, '回報 TripConfig 的 Trip ID');
assert.strictEqual(infoApp.lock.waited, false, 'info 不取 script lock');
infoApp.ledger.data[0][4] = '品項';
assert.strictEqual(infoApp.get({action:'info'}).ledgerHeaderOk, false, '分帳紀錄標題被改過時回報 false');
const narrowInfoApp = loadAppScript();
narrowInfoApp.ledger.data[0] = narrowInfoApp.ledger.data[0].slice(0, 16);
assert.strictEqual(narrowInfoApp.get({action:'info'}).ledgerHeaderOk, false, '欄數不足 21 時回報 false');
const noCfgApp = loadAppScript();
delete noCfgApp.sheets.TripConfig;
assert.deepStrictEqual(noCfgApp.get({action:'info'}), {ok:true, tripId:'', ledgerHeaderOk:true}, '沒有 TripConfig 分頁時 Trip ID 為空,App 會拒絕連接');
const infoSource = gsSource.slice(gsSource.indexOf('function tripInfo('), gsSource.indexOf('function appendLedger('));
assert.ok(infoSource.length > 0 && infoSource.indexOf('LockService') < 0 && infoSource.indexOf('appendRow') < 0 && infoSource.indexOf('setValue') < 0 && infoSource.indexOf('getId') < 0,
  'info 唯讀、不取鎖、不回傳 Spreadsheet ID');
(function(){
  const schemaSandbox = {};
  vm.createContext(schemaSandbox);
  vm.runInContext(fs.readFileSync('schema.js','utf8'), schemaSandbox);
  const headers = schemaSandbox.SCHEMA.sheets.ledger.columns.map(function(column){ return column.header; });
  assert.deepStrictEqual(Array.from(infoApp.sandbox.LEDGER_HEADERS), Array.from(headers), 'Apps Script 的分帳紀錄標題與 schema.js 一致');
})();

/* ---------- v171(backlog #61):收據辨識 ---------- */
(function(){
  function receiptApp(props, reply){
    const scan = loadAppScript(), calls = [];
    scan.sandbox.PropertiesService = {getScriptProperties(){ return {getProperty(name){ return Object.prototype.hasOwnProperty.call(props, name) ? props[name] : null; }}; }};
    scan.sandbox.UrlFetchApp = {fetch(url, options){
      calls.push({url, options});
      if (reply instanceof Error) throw reply;
      return {getResponseCode(){ return reply.status; }, getContentText(){ return reply.body; }};
    }};
    scan.calls = calls;
    return scan;
  }
  const image = Buffer.from('fake-jpeg-bytes').toString('base64');
  const aiReply = text => ({status:200, body:JSON.stringify({candidates:[{content:{parts:[{text}]}}]})});
  const good = receiptApp({GEMINI_API_KEY:'test-key'}, aiReply('```json\n{"date":"2026-10-20","time":"12:34","total":"1,500","currency":"jpy","storeName":"  ローソン 倉敷店  ","extra":"x"}\n```'));
  const rowsBefore = good.ledger.data.length;
  const result = good.call({action:'recognizeReceipt', image, mimeType:'image/jpeg', currency:'KRW'});
  assert.deepStrictEqual(result, {ok:true, receipt:{date:'2026-10-20', time:'12:34', total:1500, currency:'JPY', storeName:'ローソン 倉敷店', payMethod:'', category:'', items:[], discount:null}}, '只回傳辨識欄位,總額去掉千分位;沒送選項清單時支付方式與類別空白');
  assert.strictEqual(good.ledger.data.length, rowsBefore, '辨識不寫入分帳紀錄');
  assert.strictEqual(good.lock.waited, false, '辨識不拿鎖,不擋同時間的記帳');
  assert.strictEqual(good.calls.length, 1);
  const sent = good.calls[0];
  assert.strictEqual(sent.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent', '預設模型');
  assert.strictEqual(sent.options.headers['x-goog-api-key'], 'test-key', '金鑰放在 header,不放網址');
  assert.ok(sent.url.indexOf('test-key') < 0);
  const request = JSON.parse(sent.options.payload);
  assert.deepStrictEqual(request.contents[0].parts[1], {inline_data:{mime_type:'image/jpeg', data:image}});
  assert.ok(/usually pays in KRW/.test(request.contents[0].parts[0].text), '提示這趟的當地幣別');
  assert.strictEqual(request.generationConfig.responseMimeType, 'application/json');

  /* v173:支付方式與類別從 App 送來的清單選 */
  const lists = {payMethods:['現金','信用卡','行動支付','Suica','其他',' 行動支付 ','x'.repeat(13),5], categories:['餐飲','交通','票券','購物','其他']};
  const wallet = receiptApp({GEMINI_API_KEY:'k'}, aiReply('{"total":980,"currency":"JPY","payMethod":"行動支付","category":"餐飲"}'));
  assert.deepStrictEqual(wallet.call(Object.assign({action:'recognizeReceipt', image}, lists)).receipt, {date:'', time:'', total:980, currency:'JPY', storeName:'', payMethod:'行動支付', category:'餐飲', items:[], discount:null});
  const prompt = JSON.parse(wallet.calls[0].options.payload).contents[0].parts[0].text;
  assert.ok(prompt.indexOf('["現金","信用卡","行動支付","Suica","其他"]') > 0, '支付方式清單去重、去掉太長與不是字串的項目');
  assert.ok(prompt.indexOf('["餐飲","交通","票券","購物","其他"]') > 0);
  ['PayPay','LINE Pay','悠遊付','台灣Pay','icash Pay'].forEach(function(name){ assert.ok(prompt.indexOf(name) > 0, '提示把 '+name+' 歸為行動支付'); });
  /* Bar 2026-10-31:「VISA、JCB、Master Card 等支付方式就是信用卡」 */
  ['VISA','Mastercard','JCB','American Express','銀聯'].forEach(function(name){ assert.ok(prompt.indexOf(name) > 0, '提示把 '+name+' 歸為信用卡'); });
  assert.ok(/card\s+option \(for example 信用卡\)/.test(prompt.replace(/\n\s*/g, ' ')), '卡片對應「信用卡」');
  /* Bar 2026-10-31:紀念品店、伴手禮歸購物;有列品項時依品項判斷;自訂類別也會參考 */
  const flat = prompt.replace(/\n\s*/g, ' ');
  assert.ok(/souvenir and gift shops \(お土産, 伴手禮, 名產\) are the shopping option \(購物\)/.test(flat), '伴手禮 → 購物');
  assert.ok(/decide by the items themselves/.test(flat) && /largest share of the total/.test(flat), '依收據上的品項、占總額最多的類別');
  assert.ok(/categories the user created/.test(flat), '自訂類別也是候選');
  const outside = receiptApp({GEMINI_API_KEY:'k'}, aiReply('{"payMethod":"PayPay","category":"Food"}'));
  assert.strictEqual(outside.call(Object.assign({action:'recognizeReceipt', image}, lists)).receipt.payMethod, '', '清單外的答案不採用');
  assert.strictEqual(receiptApp({GEMINI_API_KEY:'k'}, aiReply('{"category":"Food"}')).call(Object.assign({action:'recognizeReceipt', image}, lists)).receipt.category, '');
  const noLists = receiptApp({GEMINI_API_KEY:'k'}, aiReply('{"payMethod":"現金"}'));
  assert.strictEqual(noLists.call({action:'recognizeReceipt', image}).receipt.payMethod, '', '舊版 App 沒送清單時不回支付方式');
  assert.ok(JSON.parse(noLists.calls[0].options.payload).contents[0].parts[0].text.indexOf('payMethod') < 0, '沒送清單時提示不提支付方式');

  /* v173(Bar 2026-10-31):多品項逐筆帶入 —— 品項整理 */
  const lines = receiptApp({GEMINI_API_KEY:'k'}, aiReply(JSON.stringify({total:1980,items:[{name:'  醤油ラーメン  ',amount:980},{name:'生ビール x2',amount:'1,000'},{name:'',amount:100},{name:'小計',amount:-5},{name:'x'.repeat(30),amount:50},'bad'],discount:'200'})));
  const lineResult = lines.call({action:'recognizeReceipt', image}).receipt;
  assert.deepStrictEqual(lineResult.items, [{name:'醤油ラーメン',amount:980},{name:'生ビール x2',amount:1000},{name:'x'.repeat(20),amount:50}], '沒名稱或金額不是正數的行不要,名稱最多 20 字');
  assert.strictEqual(lineResult.discount, 200);
  const many = receiptApp({GEMINI_API_KEY:'k'}, aiReply(JSON.stringify({items:Array.from({length:40},(_,i)=>({name:'品'+i,amount:i+1}))})));
  assert.strictEqual(many.call({action:'recognizeReceipt', image}).receipt.items.length, 30, '最多 30 項');
  assert.ok(/items: the purchased lines as printed/.test(JSON.parse(lines.calls[0].options.payload).contents[0].parts[0].text), '提示要求逐行品項');

  const noKey = receiptApp({}, aiReply('{}'));
  assert.deepStrictEqual(noKey.call({action:'recognizeReceipt', image}), {ok:false, error:'missing GEMINI_API_KEY'});
  assert.strictEqual(noKey.calls.length, 0, '沒有金鑰就不呼叫 AI');
  const custom = receiptApp({GEMINI_API_KEY:'k', GEMINI_MODEL:'gemini-2.5-flash'}, aiReply('{"total":12.5,"currency":"USD"}'));
  assert.deepStrictEqual(custom.call({action:'recognizeReceipt', image}).receipt, {date:'', time:'', total:12.5, currency:'USD', storeName:'', payMethod:'', category:'', items:[], discount:null});
  assert.ok(custom.calls[0].url.indexOf('/models/gemini-2.5-flash:generateContent') > 0, 'GEMINI_MODEL 可以換模型');
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k', GEMINI_MODEL:'../evil'}, aiReply('{}')).call({action:'recognizeReceipt', image}), {ok:false, error:'invalid GEMINI_MODEL'});
  ['', 'not base64!', 'a'.repeat(6000001)].forEach(function(bad){
    assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, aiReply('{}')).call({action:'recognizeReceipt', image:bad}), {ok:false, error:'invalid image'});
  });
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, aiReply('{}')).call({action:'recognizeReceipt', image, mimeType:'text/html'}), {ok:false, error:'invalid image'});
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, {status:429, body:'{}'}).call({action:'recognizeReceipt', image}), {ok:false, error:'quota'}, '免費額度用完');
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, {status:403, body:'{}'}).call({action:'recognizeReceipt', image}), {ok:false, error:'ai http 403'});
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, aiReply('這不是 JSON')).call({action:'recognizeReceipt', image}), {ok:false, error:'unreadable ai reply'});
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, new Error('dns')).call({action:'recognizeReceipt', image}), {ok:false, error:'ai unreachable: dns'});
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, new Error('Exception: You do not have permission to call UrlFetchApp.fetch. Required permissions: https://www.googleapis.com/auth/script.external_request')).call({action:'recognizeReceipt', image}), {ok:false, error:'not authorized'}, '還沒授權連到外部服務');
  /* 編輯器裡執行的檢查:會觸發授權、不印出金鑰、不用掉辨識次數 */
  function check(props, reply){
    const scan = receiptApp(props, reply), logs = [];
    scan.sandbox.Logger = {log(message){ logs.push(String(message)); }};
    scan.sandbox.encodeURIComponent = encodeURIComponent;
    const message = scan.sandbox.checkReceiptRecognition();
    return {message, logs, calls: scan.calls};
  }
  const ready = check({GEMINI_API_KEY:'secret-key'}, {status:200, body:'{}'});
  assert.ok(/^OK/.test(ready.message) && ready.logs[0] === ready.message);
  assert.strictEqual(ready.calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest', '只查模型資料,不呼叫 generateContent');
  assert.ok(ready.logs.join('').indexOf('secret-key') < 0, '不印出金鑰');
  assert.ok(/還沒放 GEMINI_API_KEY/.test(check({}, {status:200, body:'{}'}).message));
  assert.ok(/找不到模型/.test(check({GEMINI_API_KEY:'k', GEMINI_MODEL:'nope'}, {status:404, body:'{}'}).message));
  assert.ok(/金鑰無法使用\(HTTP 400\)/.test(check({GEMINI_API_KEY:'k'}, {status:400, body:'{}'}).message));
  assert.deepStrictEqual(receiptApp({GEMINI_API_KEY:'k'}, aiReply('[1,2]')).call({action:'recognizeReceipt', image}).receipt, {date:'', time:'', total:null, currency:'', storeName:'', payMethod:'', category:'', items:[], discount:null}, '不是物件就全部空白');
  assert.ok(gsSource.indexOf("getProperty('GEMINI_API_KEY')") > 0 && !/AIza[0-9A-Za-z_-]{20,}/.test(gsSource), '金鑰只從指令碼屬性讀,程式裡沒有金鑰');
  /* 一般記帳仍照舊拿鎖 */
  const still = receiptApp({GEMINI_API_KEY:'k'}, aiReply('{}'));
  still.call({action:'updateSettings', exchangeRate:0.2, defaultCurrency:'JPY'});
  assert.strictEqual(still.lock.waited, true);
})();

console.log('Apps Script settings tests passed');
