/* v164（稽核：時間改依旅程時區）：行程與記帳的「今天幾號、現在幾點」依旅程時區（Asia/Tokyo），
   不跟手機時區。同一組時間點在台灣、UTC、洛杉磯（有夏令時間）與日本的手機上，答案都要一樣。
   直接執行 index.html 裡真實的函式。 */
const {installTripTime}=require('./support/trip-time');
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();
const names=['todayMD','currentMinutes','tripCalendarStamp','tripHasEnded','daysUntilStart',
  'ledgerLocalDateFromParts','parseLedgerDateInput','ledgerDateInputValue','ledgerTimeInputValue',
  'ledgerOccurrenceIso','ledgerLocalDateKey','formatLedgerLocalOccurrence','ledgerOptionalDateLabel'];

function sandboxAt(iso,cfg){
  const context={DB:{cfg:cfg||{startdate:'2026-10-18',enddate:'2026-10-23'}},nowMs:Date.parse(iso)};
  vm.createContext(context);installTripTime(context,html);
  vm.runInContext('function appNow(){return timestampDate(nowMs);}\n'+names.map(name=>extractFunction(html,name)).join('\n'),context);
  return context;
}

function answers(){
  const results={};
  /* 日本 10/20 08:30；台灣是 07:30 */
  let box=sandboxAt('2026-10-20T08:30:00+09:00');
  results.morning={today:box.todayMD(),minutes:box.currentMinutes(),wall:box.tripNow().getHours()+':'+box.tripNow().getMinutes()};
  /* 台灣 10/22 23:30 已是日本 10/23 00:30：最後一天，還沒結束 */
  box=sandboxAt('2026-10-22T23:30:00+08:00');
  results.lastDay={today:box.todayMD(),ended:box.tripHasEnded(),until:box.daysUntilStart()};
  /* 台灣 10/23 23:30 已是日本 10/24 00:30：旅程結束 */
  box=sandboxAt('2026-10-23T23:30:00+08:00');
  results.after={today:box.todayMD(),ended:box.tripHasEnded()};
  /* 台灣 10/17 23:30 已是日本出發日 10/18 00:30 */
  box=sandboxAt('2026-10-17T23:30:00+08:00');
  results.departure={until:box.daysUntilStart(),today:box.todayMD()};
  /* 記帳：日本 12:00 輸入的日期時間存成真正的時間點，讀回來也是日本 12:00 */
  box=sandboxAt('2026-10-20T12:00:00+09:00');
  results.ledger={
    iso:box.ledgerOccurrenceIso('2026/10/20','12:00'),
    shown:box.formatLedgerLocalOccurrence('2026-10-20T03:00:00.000Z'),
    defaultDate:box.ledgerDateInputValue(box.tripNow()),
    defaultTime:box.ledgerTimeInputValue(box.tripNow()),
    editDate:box.ledgerDateInputValue('2026-10-22T15:30:00.000Z'),
    keyLateTaipei:box.ledgerLocalDateKey('2026-10-22T23:30:00+08:00'),
    keyNow:box.ledgerLocalDateKey(Date.parse('2026-10-20T00:10:00+09:00')),
    label:box.ledgerOptionalDateLabel('2026/10/20')
  };
  /* 模擬時間輸入框沒有寫時區，當成日本時間 */
  results.wallText=box.tripWallTextInstant('2026-10-20T08:30')===Date.parse('2026-10-20T08:30:00+09:00');
  return results;
}

const expected={
  morning:{today:'10/20',minutes:510,wall:'8:30'},
  lastDay:{today:'10/23',ended:false,until:-5},
  after:{today:'10/24',ended:true},
  departure:{until:0,today:'10/18'},
  ledger:{
    iso:'2026-10-20T03:00:00.000Z',shown:'2026/10/20 12:00',defaultDate:'2026/10/20',defaultTime:'12:00',
    editDate:'2026/10/23',keyLateTaipei:'2026-10-23',keyNow:'2026-10-20',label:'今天'
  },
  wallText:true
};

for(const zone of ['Asia/Taipei','UTC','America/Los_Angeles','Asia/Tokyo']){
  process.env.TZ=zone;
  assert.strictEqual(new Date(Date.parse('2026-07-01T00:00:00Z')).getTimezoneOffset()===0,zone==='UTC','手機時區已切換到 '+zone);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(answers())),expected,'手機時區 '+zone+' 也依日本時間');
}

/* 時間點本身不變：牆上時間只用來讀欄位 */
process.env.TZ='Asia/Taipei';
const box=sandboxAt('2026-10-20T08:30:00+09:00');
assert.strictEqual(box.appNow().getTime(),Date.parse('2026-10-20T08:30:00+09:00'),'appNow 仍是真正的時間點');
assert.ok(isNaN(box.tripWallDate(NaN).getTime()),'無效時間保持無效');

/* 診斷面板、旅途紀錄、同步時間刻意維持手機時區（v152／v153 的決定） */
for(const name of ['formatDiagnosticTime','travelNoteTimeLabel','formatSyncAbsoluteTime']){
  assert.ok(!/tripWallDate|tripNow/.test(extractFunction(html,name)),name+' 維持手機時區');
}

console.log('trip time zone tests passed');
