/**
 * 岡山旅行 App：分帳 append-only 寫入與兩項共用設定更新端點。
 * GitHub 內此檔為唯一維護來源；部署內容必須與此檔一致。
 */
var LEDGER_COLUMNS = 21;

function doPost(e) {
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
  if (inputCurrency && inputCurrency !== 'JPY' && inputCurrency !== 'TWD') return out({ok:false,error:'invalid inputCurrency'});
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
  if (currency !== 'JPY' && currency !== 'TWD') {
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

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
