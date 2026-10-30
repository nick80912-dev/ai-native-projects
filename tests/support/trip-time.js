'use strict';
/* v164：App 依旅程時區（Asia/Tokyo）讀「今天幾號、現在幾點」。沙盒測試用手機本地時間建構的 Date
   代表「手機時間」，所以這些測試以「手機設在日本時間」執行（也就是實際旅途的情況）。
   手機留在台灣時間的情況，另由 tests/trip-time-zone.test.js 與
   tests/browser/trip-time-zone-v164.spec.js 驗證。
   必須在測試建立任何 Date 之前 require 本檔。 */
process.env.TZ='Asia/Tokyo';
const vm=require('vm');

/* App 的旅程時區 helper（TRIP_UTC_OFFSET_MINUTES 到 tripNow）原文 */
function tripTimeSource(html){
  const start=html.indexOf('var TRIP_UTC_OFFSET_MINUTES=');
  const tail=html.indexOf('function tripNow()',start);
  if(start<0||tail<0)throw new Error('trip time helpers not found');
  return html.slice(start,html.indexOf('\n',tail)+1);
}

function installTripTime(context,html){
  /* 沙盒沒有自備 timestampDate 時，用 App 的原文 */
  if(vm.runInContext('typeof timestampDate',context)!=='function'){
    const line=html.slice(html.indexOf('function timestampDate('),html.indexOf('\n',html.indexOf('function timestampDate(')));
    vm.runInContext(line,context);
  }
  vm.runInContext(tripTimeSource(html),context);
  return context;
}

module.exports={tripTimeSource,installTripTime};
