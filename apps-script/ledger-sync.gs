/**
 * 旅程 App：分帳 append-only 寫入與兩項共用設定更新端點。
 * v168(backlog #62):不限日本 —— 幣別是 TripConfig 的 Currency(沒填是 JPY);金額可有兩位小數(美金記到分);
 * 「分帳紀錄」第 6 欄標題可以是「日幣」(岡山)或「當地幣」(新範本)。岡山的部署不必更新也能繼續用。
 * v171(backlog #61):收據辨識 —— doPost action 'recognizeReceipt' 把 App 傳來的收據照片交給 Google Gemini,
 * 只回傳日期、時間、總額、幣別、店名五項;照片不存進試算表。金鑰放在「專案設定 → 指令碼屬性」的
 * GEMINI_API_KEY(不寫在程式裡、不進 GitHub);可選 GEMINI_MODEL 換模型。沒有這段的舊部署照常記帳,只是不能辨識。
 * v173:App 另送支付方式與類別的選項清單,AI 從清單選一個(行動支付錢包 → 行動支付;餐廳 → 餐飲;電車 → 交通…)。
 * GitHub 內此檔為唯一維護來源；部署內容必須與此檔一致。
 */
var LEDGER_COLUMNS = 21;
/* 與 schema.js 分帳紀錄 21 欄的 header 一致(tests/apps-script-settings.test.js 鎖住)。 */
var LEDGER_HEADERS = [
  '紀錄ID','時間','成員','類別','明細','日幣','台幣','備註',
  '分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID',
  '店名','取代紀錄ID','輸入幣別','免稅品','價格方式','稅率','優惠券金額'
];
/* v168:第 6 欄(index 5)的新標題 */
var LEDGER_HEADER_ALIASES = {5: ['當地幣']};

function ledgerHeaderMatches(index, text) {
  var value = String(text).trim();
  if (value === LEDGER_HEADERS[index]) return true;
  return (LEDGER_HEADER_ALIASES[index] || []).indexOf(value) >= 0;
}

/* v168:這趟的當地幣別(TripConfig Currency,沒填是 JPY) */
function tripLocalCurrency() {
  var cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TripConfig');
  var last = cfg ? cfg.getLastRow() : 0;
  var rows = last ? cfg.getRange(1, 1, last, 2).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === 'Currency') {
      var code = String(rows[i][1]).trim().toUpperCase();
      return /^[A-Z]{3}$/.test(code) ? code : 'JPY';
    }
  }
  return 'JPY';
}

function tripCurrencyAllowed(code) {
  return code === 'TWD' || code === tripLocalCurrency();
}

function doPost(e) {
  /* v171:辨識收據不寫試算表、又要等 AI 幾秒,不拿鎖,免得擋住同時間的記帳 */
  var peek = null;
  try { peek = JSON.parse(e.postData.contents); } catch (ignore) {}
  if (peek && peek.action === 'recognizeReceipt') return recognizeReceipt(peek);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'updateSettings') return updateSettings(d);
    return appendLedger(d);
  } catch (err) {
    return out({ok:false,error:String(err)});
  } finally {
    lock.releaseLock();
  }
}

/**
 * 唯讀 ledger 增量加速層(GET ?action=ledger&after=N)。
 * 定位為加速層而非取代層:只服務「分帳紀錄」單表,其餘 7 張表維持既有 CSV 原子快照節奏。
 * 刻意不取 LockService —— 唯讀且不得與 doPost 搶鎖或額外消耗每日執行配額。
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (String(params.action) === 'info') return tripInfo();
    if (String(params.action) !== 'ledger') return out({ok:false,error:'unsupported action'});

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('分帳紀錄');
    if (!sh) return out({ok:false,error:'ledger sheet unavailable'});
    if (sh.getLastColumn() < LEDGER_COLUMNS) return out({ok:false,error:'ledger sheet contract mismatch'});

    var serverTime = new Date().toISOString();
    var total = Math.max(sh.getLastRow() - 1, 0);
    var after = normalizeLedgerAfter(params.after);
    var reset = after > total;
    if (reset) after = 0;
    // after >= total 為常態心跳:不呼叫 getValues(),壓低單次執行時間以保護每日配額。
    if (after >= total) return out({ok:true,serverTime:serverTime,total:total,after:after,reset:reset,rows:[]});

    var rows = sh.getRange(after + 2, 1, total - after, LEDGER_COLUMNS).getValues();
    return out({ok:true,serverTime:serverTime,total:total,after:after,reset:reset,rows:rows});
  } catch (err) {
    // 不回傳例外 stack、Sheet 物件或 Spreadsheet ID;client 一律降級回 CSV 路徑。
    return out({ok:false,error:'ledger read failed'});
  }
}

function normalizeLedgerAfter(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 0;
  var n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * v150 連接新旅程(GET ?action=info,ADR 0021):唯讀回報這個 Apps Script 所屬試算表的
 * TripConfig「Trip ID」,以及「分帳紀錄」標題列是否和範本一致。App 連接前會拿它和發布 CSV
 * 的 Trip ID 比對,避免行程讀 A 表、帳卻寫進 B 表。不回傳 Spreadsheet ID 或其他設定,也不取鎖。
 */
function tripInfo() {
  try {
    var book = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = book.getSheetByName('TripConfig');
    var tripId = '';
    var last = cfg ? cfg.getLastRow() : 0;
    var rows = last ? cfg.getRange(1, 1, last, 2).getValues() : [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === 'Trip ID') { tripId = String(rows[i][1]).trim(); break; }
    }
    var ledger = book.getSheetByName('分帳紀錄');
    var headerOk = false;
    if (ledger && ledger.getLastColumn() >= LEDGER_COLUMNS) {
      var header = ledger.getRange(1, 1, 1, LEDGER_COLUMNS).getValues()[0];
      headerOk = true;
      for (var c = 0; c < LEDGER_COLUMNS; c++) {
        if (!ledgerHeaderMatches(c, header[c])) { headerOk = false; break; }
      }
    }
    return out({ok:true,tripId:tripId,ledgerHeaderOk:headerOk});
  } catch (err) {
    return out({ok:false,error:'info read failed'});
  }
}

function appendLedger(d) {
  var jpy = Number(d.amountJpy);
  var twd = Number(d.amountTwd);
  if (!d.id || !d.member || d.amountJpy === undefined || d.amountTwd === undefined ||
      !isFinite(jpy) || !isFinite(twd)) {
    return out({ok:false,error:'missing or invalid ledger fields'});
  }
  var inputCurrency = d.inputCurrency === undefined ? '' : String(d.inputCurrency || '').toUpperCase();
  var priceMode = d.priceMode === undefined ? '' : String(d.priceMode || '');
  var taxRate = d.taxRate === undefined || d.taxRate === '' ? '' : Number(d.taxRate);
  var couponAmount = d.couponAmount === undefined || d.couponAmount === '' ? '' : Number(d.couponAmount);
  var isTaxFree = d.isTaxFree === undefined || d.isTaxFree === '' ? '' : d.isTaxFree;
  if (inputCurrency && !tripCurrencyAllowed(inputCurrency)) return out({ok:false,error:'invalid inputCurrency'});
  if (priceMode && priceMode !== 'included' && priceMode !== 'excluded') return out({ok:false,error:'invalid priceMode'});
  if (isTaxFree !== '' && typeof isTaxFree !== 'boolean') return out({ok:false,error:'invalid isTaxFree'});
  if (taxRate !== '' && (!isFinite(taxRate) || taxRate < 0 || taxRate > 100)) return out({ok:false,error:'invalid taxRate'});
  if (couponAmount !== '' && (!isFinite(couponAmount) || couponAmount < 0)) return out({ok:false,error:'invalid couponAmount'});

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('分帳紀錄');
  if (!sh) return out({ok:false,error:'missing sheet: 分帳紀錄'});

  var count = Math.max(sh.getLastRow() - 1, 0);
  var ids = count ? sh.getRange(2, 1, count, 1).getValues() : [];
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(d.id)) return out({ok:true,dup:true});
  }

  sh.appendRow([
    d.id, d.time, d.member, d.category, d.detail, jpy, twd, d.note || '',
    d.participants || '', d.payMethod || '', d.recordType || '',
    d.targetRecordId || '', d.deleteReason || '', d.batchId || '',
    d.storeName || '', d.replacesRecordId || '', inputCurrency, isTaxFree,
    priceMode, taxRate, couponAmount
  ]);
  return out({ok:true});
}

function updateSettings(d) {
  var rate = Number(d.exchangeRate);
  var currency = String(d.defaultCurrency || '').toUpperCase();
  if (!isFinite(rate) || rate <= 0) return out({ok:false,error:'invalid exchangeRate'});
  if (!tripCurrencyAllowed(currency)) {
    return out({ok:false,error:'invalid defaultCurrency'});
  }

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TripConfig');
  if (!sh) return out({ok:false,error:'missing sheet: TripConfig'});

  // CMS 寫入白名單：只允許這兩個固定鍵，不接受 payload 指定任意 key。
  upsertSetting(sh, 'Exchange Rate', rate);
  upsertSetting(sh, 'Ledger Default Currency', currency);
  return out({ok:true,settings:{exchangeRate:rate,defaultCurrency:currency}});
}

function upsertSetting(sh, key, value) {
  var last = sh.getLastRow();
  var rows = last ? sh.getRange(1, 1, last, 2).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === key) {
      sh.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

/* ---------- v171 收據辨識(backlog #61) ---------- */
var RECEIPT_MAX_IMAGE_CHARS = 6000000;   // base64 約 4.5 MB;App 送的是壓縮過的 JPEG(長邊 1600px)
var RECEIPT_DEFAULT_MODEL = 'gemini-flash-lite-latest';
var RECEIPT_PROMPT = [
  'You read one photo of a shop receipt or bill. Reply with JSON only, no other text:',
  '{"date":"YYYY-MM-DD","time":"HH:MM","total":0,"currency":"XXX","storeName":""}',
  '- date/time: when the purchase happened, as printed on the receipt (24-hour time). Convert Japanese era years',
  '  (for example 令和7年 = 2025) and two-digit years to four digits. Use "" when not printed.',
  '- total: the final amount actually paid, after tax and discounts, as a plain number with "." for decimals.',
  '  Use null when you cannot find it.',
  '- currency: ISO 4217 code of that amount (JPY, KRW, TWD, USD, EUR...). Use "" when unsure.',
  '- storeName: the shop name as printed (at most 40 characters), "" when not printed.',
  '- If the photo is not a receipt, return all fields empty and total null.'
].join('\n');
/* v173(Bar 2026-10-31):支付方式與類別從 App 送來的清單裡選一個(手機上自訂的名稱也適用) */
var RECEIPT_CHOICE_PROMPT = [
  '- payMethod: how it was paid, copied exactly from this list: %PAY%. Use "" when the receipt does not show it or nothing fits.',
  '  QR-code and phone wallets count as the mobile-payment option (for example 行動支付): PayPay, LINE Pay, TWQR cross-border',
  '  payments such as 悠遊付 / 台灣Pay / icash Pay / 全支付, JKOPAY, Alipay, WeChat Pay, Apple Pay, Google Pay, 楽天ペイ, d払い,',
  '  au PAY, メルペイ, KakaoPay, Naver Pay, Toss, GrabPay, TrueMoney, GCash and similar. Credit or debit cards are the card',
  '  option (for example 信用卡): VISA, Mastercard / Master, JCB, American Express / AMEX, Diners, UnionPay / 銀聯, クレジット,',
  '  カード, card numbers like ****1234. 現金 / お預り / お釣り / cash are the cash option; transit IC cards',
  '  (Suica, ICOCA, PASMO) are the Suica option when the list has one.',
  '- category: what was bought, copied exactly from this list: %CAT%. For example restaurants, cafes, food and drinks are the',
  '  food option (餐飲); trains, buses, taxis, fuel, tolls and parking are the transport option (交通); tickets and admissions',
  '  are 票券. Use "" when unsure or nothing fits.',
  'Add "payMethod" and "category" to the same JSON object.'
].join('\n');
var RECEIPT_MAX_CHOICES = 30;

/* App 送來的選項清單:字串、去重、每項最多 12 字、最多 30 項 */
function receiptChoices(value) {
  var seen = {}, list = [];
  (Array.isArray(value) ? value : []).forEach(function(item) {
    var text = typeof item === 'string' ? item.trim() : '';
    if (!text || text.length > 12 || seen[text] || list.length >= RECEIPT_MAX_CHOICES) return;
    seen[text] = true; list.push(text);
  });
  return list;
}

function recognizeReceipt(d) {
  var props = PropertiesService.getScriptProperties();
  var key = String(props.getProperty('GEMINI_API_KEY') || '').trim();
  if (!key) return out({ok:false,error:'missing GEMINI_API_KEY'});
  var image = String(d.image || '');
  var mimeType = String(d.mimeType || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType) || !image || image.length > RECEIPT_MAX_IMAGE_CHARS ||
      !/^[A-Za-z0-9+\/]+=*$/.test(image)) {
    return out({ok:false,error:'invalid image'});
  }
  var model = String(props.getProperty('GEMINI_MODEL') || RECEIPT_DEFAULT_MODEL).trim();
  if (!/^[a-z0-9][a-z0-9.\-]*$/.test(model)) return out({ok:false,error:'invalid GEMINI_MODEL'});
  var hint = /^[A-Z]{3}$/.test(String(d.currency || '')) ? '\nThis trip usually pays in ' + d.currency + '.' : '';
  var payMethods = receiptChoices(d.payMethods), categories = receiptChoices(d.categories);
  if (payMethods.length || categories.length) {
    hint += '\n' + RECEIPT_CHOICE_PROMPT.replace('%PAY%', JSON.stringify(payMethods)).replace('%CAT%', JSON.stringify(categories));
  }
  var request = {
    contents: [{parts: [{text: RECEIPT_PROMPT + hint}, {inline_data: {mime_type: mimeType, data: image}}]}],
    generationConfig: {responseMimeType: 'application/json', temperature: 0}
  };
  var response;
  try {
    response = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: {'x-goog-api-key': key},
      payload: JSON.stringify(request), muteHttpExceptions: true
    });
  } catch (err) {
    /* 最常見的是還沒授權「連線到外部服務」:在編輯器執行 checkReceiptRecognition() 一次 */
    var reason = String(err && err.message || err);
    if (/permission|權限|external_request/i.test(reason)) return out({ok:false,error:'not authorized'});
    return out({ok:false,error:'ai unreachable: ' + reason.slice(0, 200)});
  }
  var status = response.getResponseCode();
  if (status === 429) return out({ok:false,error:'quota'});
  if (status !== 200) return out({ok:false,error:'ai http ' + status});
  var parsed;
  try {
    var body = JSON.parse(response.getContentText());
    var parts = body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts || [];
    var text = parts.map(function(part) { return part.text || ''; }).join('');
    parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  } catch (err) {
    return out({ok:false,error:'unreadable ai reply'});
  }
  return out({ok:true,receipt:receiptFields(parsed, payMethods, categories)});
}

/* 在 Apps Script 編輯器上方的函式選單選 checkReceiptRecognition,按「▶ 執行」:
   第一次會要求「連線到外部服務」的授權(收據辨識要用);「執行記錄」會寫出金鑰與模型能不能用。
   只查模型資料,不會用掉辨識的免費次數,也不會印出金鑰。 */
function checkReceiptRecognition() {
  var props = PropertiesService.getScriptProperties();
  var key = String(props.getProperty('GEMINI_API_KEY') || '').trim();
  var model = String(props.getProperty('GEMINI_MODEL') || RECEIPT_DEFAULT_MODEL).trim();
  var message;
  if (!key) {
    message = '還沒放 GEMINI_API_KEY:專案設定 → 指令碼屬性 → 新增';
  } else {
    var response = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model), {
      headers: {'x-goog-api-key': key}, muteHttpExceptions: true
    });
    var status = response.getResponseCode();
    message = status === 200 ? 'OK:收據辨識可以使用(模型 ' + model + ')' :
      status === 404 ? '找不到模型 ' + model + ',請檢查 GEMINI_MODEL' :
      '金鑰無法使用(HTTP ' + status + '),請到 Google AI Studio 確認金鑰';
  }
  Logger.log(message);
  return message;
}

/* 只回傳五個欄位;格式由 App 再檢查一次(ledger-receipts.js normalizeRecognition) */
function receiptFields(value, payMethods, categories) {
  var source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  function text(name, max) { var v = source[name]; return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
  var total = source.total;
  if (typeof total === 'string') total = Number(total.replace(/[,\s]/g, ''));
  return {
    date: text('date', 20), time: text('time', 10),
    total: typeof total === 'number' && isFinite(total) ? total : null,
    currency: text('currency', 3).toUpperCase(), storeName: text('storeName', 40),
    /* v173:只接受 App 送來清單裡的選項 */
    payMethod: (payMethods || []).indexOf(text('payMethod', 12)) >= 0 ? text('payMethod', 12) : '',
    category: (categories || []).indexOf(text('category', 12)) >= 0 ? text('category', 12) : ''
  };
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
