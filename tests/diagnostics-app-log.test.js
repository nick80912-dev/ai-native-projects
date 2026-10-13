const assert=require('assert');
const vm=require('vm');
const {appHtml}=require('./support/version');

const html=appHtml();
const markerStart='/* ---- DIAGNOSTIC APPLOG START ---- */';
const markerEnd='/* ---- DIAGNOSTIC APPLOG END ---- */';
const start=html.indexOf(markerStart);
const end=html.indexOf(markerEnd,start);
assert(start>=0&&end>start,'diagnostic AppLog helpers have stable extraction markers');

const copied=[];
const toasts=[];
let entries=[{at:'2026-08-09T01:02:03.000Z',category:'repository',level:'warn',message:'<b>失敗</b>'}];
let clearCalls=0;
let projectedEntries=[];
const section={outerHTML:''};
class TestDate extends Date{
  constructor(value){super(value===undefined?'2026-08-09T02:03:04.000Z':value);}
}
const sandbox={
  Date:TestDate,String,Array,Object,JSON,
  appNow(){return new TestDate();},
  timestampDate(value){return new TestDate(Number(value));},
  diagnosticReportContext(){return {version:'v152',trip:[{label:'連接的旅程',value:'岡山舊旅程（內建）'},{label:'團體帳',value:'2 筆待送出'}]};},
  escapeHtml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');},
  currentHealthFindings(){return ['懸空引用'];},
  TripDiagnosticImpact:{
    project(entry){
      projectedEntries.push(entry);
      return {severity:'degraded',title:'<b>摘要</b>',impact:'<i>影響</i>',fallback:'<u>後備</u>',raw:entry.message};
    }
  },
  AppLog:{
    snapshot(){return entries.map(function(entry){return Object.assign({},entry);});},
    clear(){clearCalls++;entries=[];}
  },
  copyText(text,label){copied.push({text,label});},
  toast(message){toasts.push(message);},
  document:{getElementById(id){return id==='diagAppLogSection'?section:null;}}
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start,end+markerEnd.length),sandbox);

const rendered=sandbox.renderDiagnosticAppLogSection(entries);
assert(rendered.includes('AppLog'),'the section has a diagnostic heading');
assert(rendered.includes('1 筆'),'the section reports the current count');
assert(rendered.includes('diag-log-entry diag-impact-degraded'),'the projected severity has semantic markup');
assert(rendered.includes('&lt;b&gt;摘要&lt;/b&gt;'),'projected titles are escaped before rendering');
assert(rendered.includes('&lt;i&gt;影響&lt;/i&gt;'),'projected impact text is escaped before rendering');
assert(rendered.includes('&lt;u&gt;後備&lt;/u&gt;'),'projected fallback text is escaped before rendering');
assert(rendered.includes('原始：&lt;b&gt;失敗&lt;/b&gt;'),'the escaped raw event remains visible in the DOM');
/* v152：面板用手機當地時間顯示，不再顯示 UTC 的 ISO 字串 */
const local=new Date('2026-08-09T01:02:03.000Z');
const pad=value=>String(value).padStart(2,'0');
const localLabel=(local.getMonth()+1)+'/'+local.getDate()+' '+pad(local.getHours())+':'+pad(local.getMinutes())+':'+pad(local.getSeconds());
assert(rendered.includes('<em>'+localLabel+' [repository]</em>'),'the panel shows the entry time in device local time');
assert(!rendered.includes('2026-08-09T01:02:03.000Z'),'the panel no longer shows the raw UTC timestamp');
assert.strictEqual(sandbox.formatDiagnosticTime('not a time'),'not a time','an unreadable time is shown as stored, never guessed');
assert(!rendered.includes('<b>摘要</b>'),'projected titles cannot inject markup');
assert(!rendered.includes('<b>失敗</b>'),'stored messages cannot inject markup');
assert.strictEqual(projectedEntries.length,1,'every stored entry is projected for display once');
assert.strictEqual(projectedEntries[0],entries[0],'the display projection receives the raw entry without rewriting it');

const report=sandbox.formatDiagnosticsReport(['懸空引用'],entries);
assert(report.includes('Health Check'),'the report labels its current health snapshot');
assert(report.includes('懸空引用'),'the report contains current health findings');
assert(report.includes('[repository] <b>失敗</b>'),'the copied plain-text report contains the full stored event');
assert.strictEqual(report,'Trip Pilot 除錯報告\n建立時間：2026-08-09T02:03:04.000Z\n\nHealth Check\n- 懸空引用\n\nAppLog（1 筆）\n2026-08-09T01:02:03.000Z [repository] <b>失敗</b>','the diagnostics report stays byte-for-byte raw');
assert(!report.includes('摘要')&&!report.includes('影響')&&!report.includes('後備'),'the copied report never contains projected copy');
/* v152：報告開頭加上 App 版本與目前旅程；AppLog 仍是原始內容與 ISO 時間 */
const withContext=sandbox.formatDiagnosticsReport(['懸空引用'],entries,sandbox.diagnosticReportContext());
assert.strictEqual(withContext,'Trip Pilot 除錯報告\n建立時間：2026-08-09T02:03:04.000Z\nApp：v152\n\n目前旅程\n- 連接的旅程：岡山舊旅程（內建）\n- 團體帳：2 筆待送出\n\nHealth Check\n- 懸空引用\n\nAppLog（1 筆）\n2026-08-09T01:02:03.000Z [repository] <b>失敗</b>','the report adds version and trip state ahead of the raw sections');

/* v152：標題就是原文時不再重複一行「原始：」 */
const realImpact=sandbox.TripDiagnosticImpact;
sandbox.TripDiagnosticImpact={project(entry){return {severity:'degraded',title:entry.message,impact:'請查看原始紀錄',fallback:'',raw:entry.message};}};
const plain=sandbox.renderDiagnosticAppLogSection([{at:'2026-08-09T01:02:03.000Z',category:'data',level:'warn',message:'未知狀況'}]);
assert(plain.includes('<b>未知狀況</b>')&&!plain.includes('原始：'),'an unmapped message is shown once');
sandbox.TripDiagnosticImpact=realImpact;

sandbox.copyDiagnosticsReport();
assert.strictEqual(copied.length,1,'copy uses the shared text-copy path once');
assert.strictEqual(copied[0].label,'除錯報告');
assert(copied[0].text.includes('Health Check'));
assert(copied[0].text.includes('App：v152')&&copied[0].text.includes('- 連接的旅程：岡山舊旅程（內建）'),'the copy button includes version and trip state');
sandbox.clearDiagnosticAppLog();
assert.strictEqual(clearCalls,1,'clear delegates to the real AppLog owner');
assert(section.outerHTML.includes('0 筆'),'clear refreshes the visible section');
assert(section.outerHTML.includes('尚無紀錄'),'clear exposes an explicit empty state');
assert.deepStrictEqual(toasts,['AppLog 已清除']);

const openStart=html.indexOf('function openDiagnostics(');
const openEnd=html.indexOf('function setupDiagnostics(',openStart);
assert(openStart>=0&&openEnd>openStart,'openDiagnostics has stable source bounds');
const openSource=html.slice(openStart,openEnd);
assert(openSource.includes('renderDiagnosticAppLogSection(logEntries)')&&openSource.includes('logEntries=AppLog.snapshot()'),'the real panel mounts the AppLog section');
assert(openSource.includes('renderDiagnosticTripSection(diagnosticTripModel())'),'the real panel mounts the trip section');
assert(openSource.includes("'資料檢查正常'+(logEntries.length?'；本次有 '+logEntries.length+' 則紀錄，見下方 AppLog':'')"),'a clean health check still points at the AppLog entries below it');
assert(!openSource.includes(":'正常')+'</div>"),'the bare 正常 wording is gone');
assert(!openSource.includes('團體帳測試模式'),'the real panel no longer renders the group-ledger test-mode section');
assert(!openSource.includes('openTestModeSettings()'),'the real panel no longer links to test-mode settings');

console.log('diagnostics AppLog tests passed');
