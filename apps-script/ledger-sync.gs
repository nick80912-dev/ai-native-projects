/**
 * 岡山旅行 App：分帳 append-only 寫入與兩項共用設定更新端點。
 * GitHub 內此檔為唯一維護來源；部署內容必須與此檔一致。
 */
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
