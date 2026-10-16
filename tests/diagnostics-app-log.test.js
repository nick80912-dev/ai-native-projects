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
assert(rendered.includes('<h3>紀錄 <small>本次開啟後 1 則</small></h3>'),'the section has a plain heading with the current count');
assert(rendered.includes('diag-log-entry diag-impact-degraded'),'the projected severity has semantic markup');
assert(rendered.includes('&lt;b&gt;摘要&lt;/b&gt;'),'projected titles are escaped before rendering');
assert(rendered.includes('<span>&lt;i&gt;影響&lt;/i&gt; · &lt;u&gt;後備&lt;/u&gt;</span>'),'impact and fallback share one escaped line');
assert(rendered.includes('<details><summary>技術細節</summary><code>原始：&lt;b&gt;失敗&lt;/b&gt;</code></details>'),'the escaped raw event stays in the DOM behind 技術細節');
/* v152：面板用手機當地時間顯示，不再顯示 UTC 的 ISO 字串；v153 起只到分鐘，分類改成中文 */
const local=new Date('2026-08-09T01:02:03.000Z');
const pad=value=>String(value).padStart(2,'0');
const localLabel=(local.getMonth()+1)+'/'+local.getDate()+' '+pad(local.getHours())+':'+pad(local.getMinutes());
assert(rendered.includes('<div class="diag-log-meta"><em>'+localLabel+' · 本機儲存</em><details>'),'the panel shows device local time and a readable category, with the details toggle on the same line');
assert(!rendered.includes('2026-08-09T01:02:03.000Z'),'the panel no longer shows the raw UTC timestamp');
assert.strictEqual(sandbox.formatDiagnosticTime('not a time'),'not a time','an unreadable time is shown as stored, never guessed');
assert.strictEqual(sandbox.diagnosticCategoryLabel('sync'),'同步');
assert.strictEqual(sandbox.diagnosticCategoryLabel('custom'),'custom','an unknown category is shown as stored');
assert.strictEqual(sandbox.diagnosticCategoryLabel(''),'其他');
assert(!rendered.includes('<b>摘要</b>'),'projected titles cannot inject markup');
assert(!rendered.includes('<b>失敗</b>'),'stored messages cannot inject markup');
assert.strictEqual(projectedEntries.length,1,'every stored entry is projected for display once');
assert.strictEqual(projectedEntries[0],entries[0],'the display projection receives the raw entry without rewriting it');

/* v153：最新的在上面；預設只顯示 5 則，按「顯示全部」才展開 */
const many=[1,2,3,4,5,6,7].map(function(n){return {at:'2026-08-09T01:0'+n+':00.000Z',category:'data',level:'warn',message:'第 '+n+' 則'};});
const realProject=sandbox.TripDiagnosticImpact.project;
sandbox.TripDiagnosticImpact.project=function(entry){return {severity:'degraded',title:entry.message,impact:'目前仍可使用',fallback:'',raw:entry.message};};
const preview=sandbox.renderDiagnosticAppLogSection(many);
assert.strictEqual((preview.match(/class="diag-log-entry /g)||[]).length,5,'only the newest five entries are shown at first');
assert(preview.indexOf('第 7 則')<preview.indexOf('第 6 則'),'the newest entry comes first');
assert(!preview.includes('第 2 則')&&!preview.includes('第 1 則'),'older entries wait behind the expand button');
assert(preview.includes('onclick="showAllDiagnosticLogs()">顯示全部 7 則</button>'),'the expand button names the full count');
assert(!preview.includes('<details>'),'a mapped title equal to its raw text shows no technical details');
sandbox.AppLog.snapshot=function(){return many;};
sandbox.showAllDiagnosticLogs();
assert.strictEqual((section.outerHTML.match(/class="diag-log-entry /g)||[]).length,7,'顯示全部 re-renders every entry');
assert(!section.outerHTML.includes('顯示全部'),'the expand button disappears once everything is shown');
sandbox.diagUiState.showAllLogs=false;
sandbox.AppLog.snapshot=function(){return entries.map(function(entry){return Object.assign({},entry);});};
sandbox.TripDiagnosticImpact.project=realProject;
projectedEntries=[];

/* v153 最上方摘要 */
const okSummary=sandbox.diagnosticSummaryModel([{key:'ledger',tone:'ok',alert:''}],[],[]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(okSummary)),{level:'ok',title:'✅ 一切正常',items:[]},'nothing to report reads 一切正常');
const warnSummary=sandbox.diagnosticSummaryModel([{key:'ledger',tone:'warn',alert:'團體帳 2 筆還沒送出，連上網路後會自動補送'}],['懸空引用','重複 ID'],[]);
assert.strictEqual(warnSummary.level,'warn');
assert.strictEqual(warnSummary.title,'⚠️ 2 項需注意');
assert.deepStrictEqual(Array.from(warnSummary.items),['團體帳 2 筆還沒送出，連上網路後會自動補送','資料檢查發現 2 項問題（懸空引用 等）']);
sandbox.TripDiagnosticImpact.project=function(entry){return {severity:entry.level==='error'?'action-required':'degraded',title:'x',impact:'',fallback:'',raw:'x'};};
const badSummary=sandbox.diagnosticSummaryModel([],[],[{level:'error'},{level:'warn'}]);
assert.strictEqual(badSummary.level,'bad','an action-required log turns the summary red');
assert.deepStrictEqual(Array.from(badSummary.items),['1 則紀錄需要處理，見下方「紀錄」']);
assert.strictEqual(sandbox.diagnosticSummaryModel([{tone:'bad',alert:'待送的團體帳屬於其他旅程'},{tone:'warn',alert:'b'}],[],[]).level,'bad','a bad row keeps the summary red even when a warning follows');
sandbox.TripDiagnosticImpact.project=realProject;
projectedEntries=[];
const summaryHtml=sandbox.renderDiagnosticSummary({level:'warn',title:'⚠️ 1 項需注意',items:['<i>x</i>']},['懸空引用']);
assert(summaryHtml.includes('class="diag-summary warn"'),'the summary carries its level');
assert(summaryHtml.includes('<li>&lt;i&gt;x&lt;/i&gt;</li>'),'summary items are escaped');
assert(summaryHtml.includes('App 版本 <span id="diagShellVersion">讀取中…</span> · 資料檢查 1 項提醒'),'the meta line keeps the version slot and the health count');
assert(sandbox.renderDiagnosticSummary(okSummary,[]).includes('· 資料檢查正常</div>'),'a clean health check reads 資料檢查正常');

/* v153：標題就是原文時，給一句可以照做的話，而不是「請查看原始紀錄」 */
sandbox.TripDiagnosticImpact={project(entry){return {severity:'degraded',title:entry.message,impact:'請查看原始紀錄',fallback:'',raw:entry.message};}};
const plain=sandbox.renderDiagnosticAppLogSection([{at:'2026-08-09T01:02:03.000Z',category:'data',level:'warn',message:'未知狀況'}]);
assert(plain.includes('<b>未知狀況</b>')&&!plain.includes('原始：'),'an unmapped message is shown once');
assert(plain.includes('若持續出現，請複製除錯報告給旅程負責人')&&!plain.includes('請查看原始紀錄'),'an unmapped message tells the user what to do');
sandbox.TripDiagnosticImpact={project(entry){projectedEntries.push(entry);return {severity:'degraded',title:'<b>摘要</b>',impact:'<i>影響</i>',fallback:'<u>後備</u>',raw:entry.message};}};

const report=sandbox.formatDiagnosticsReport(['懸空引用'],entries);
assert(report.includes('Health Check'),'the report labels its current health snapshot');
assert(report.includes('懸空引用'),'the report contains current health findings');
assert(report.includes('[repository] <b>失敗</b>'),'the copied plain-text report contains the full stored event');
assert.strictEqual(report,'Trip Pilot 除錯報告\n建立時間：2026-08-09T02:03:04.000Z\n\nHealth Check\n- 懸空引用\n\nAppLog（1 筆）\n2026-08-09T01:02:03.000Z [repository] <b>失敗</b>','the diagnostics report stays byte-for-byte raw');
assert(!report.includes('摘要')&&!report.includes('影響')&&!report.includes('後備'),'the copied report never contains projected copy');
/* v152：報告開頭加上 App 版本與目前旅程；AppLog 仍是原始內容與 ISO 時間 */
const withContext=sandbox.formatDiagnosticsReport(['懸空引用'],entries,sandbox.diagnosticReportContext());
assert.strictEqual(withContext,'Trip Pilot 除錯報告\n建立時間：2026-08-09T02:03:04.000Z\nApp：v152\n\n目前旅程\n- 連接的旅程：岡山舊旅程（內建）\n- 團體帳：2 筆待送出\n\nHealth Check\n- 懸空引用\n\nAppLog（1 筆）\n2026-08-09T01:02:03.000Z [repository] <b>失敗</b>','the report adds version and trip state ahead of the raw sections');

sandbox.copyDiagnosticsReport();
assert.strictEqual(copied.length,1,'copy uses the shared text-copy path once');
assert.strictEqual(copied[0].label,'除錯報告');
assert(copied[0].text.includes('Health Check'));
assert(copied[0].text.includes('App：v152')&&copied[0].text.includes('- 連接的旅程：岡山舊旅程（內建）'),'the copy button includes version and trip state');
sandbox.clearDiagnosticAppLog();
assert.strictEqual(clearCalls,1,'clear delegates to the real AppLog owner');
assert(section.outerHTML.includes('本次開啟後 0 則'),'clear refreshes the visible section');
assert(section.outerHTML.includes('>尚無紀錄<'),'clear exposes an explicit empty state');
assert(!section.outerHTML.includes('清除紀錄'),'an empty log has nothing to clear');
assert.deepStrictEqual(toasts,['AppLog 已清除']);

const openStart=html.indexOf('function openDiagnostics(');
const openEnd=html.indexOf('function setupDiagnostics(',openStart);
assert(openStart>=0&&openEnd>openStart,'openDiagnostics has stable source bounds');
const openSource=html.slice(openStart,openEnd);
assert(openSource.includes('renderDiagnosticAppLogSection(logEntries)')&&openSource.includes('logEntries=AppLog.snapshot()'),'the real panel mounts the AppLog section');
assert(openSource.includes('tripRows=diagnosticTripModel()')&&openSource.includes('renderDiagnosticTripSection(tripRows)'),'the real panel mounts the trip section');
assert(openSource.includes('renderDiagnosticSummary(diagnosticSummaryModel(tripRows,findings,logEntries),findings)'),'the summary reads the same rows, findings and logs as the sections below it');
assert(openSource.includes("(mode==='active'?renderDiagnosticToolsSection():'')"),'test tools only appear during an active trip');
/* v159(Bar 2026-10-16):旅途紀錄只從設定進入,面板不再有入口列。 */
assert(!html.includes('renderDiagnosticTravelNotesLink')&&!html.includes('openTravelNotesFromDiagnostics')&&!html.includes('diag-link-row'),'the diagnostics panel has no travel-note entry');
assert(openSource.includes('<div class="diag-foot"><button class="diag-copy" onclick="copyDiagnosticsReport()">複製除錯報告</button></div>'),'copy stays pinned in the footer');
assert(openSource.includes('role="dialog" aria-modal="true" aria-labelledby="diagTitle"'),'the panel is announced as a dialog');
assert(openSource.includes('aria-label="關閉診斷面板"'),'the close button has an accessible name');
assert(openSource.includes("event.key!=='Escape'"),'Escape closes the panel');
assert(!openSource.includes('團體帳測試模式'),'the real panel no longer renders the group-ledger test-mode section');
assert(!openSource.includes('openTestModeSettings()'),'the real panel no longer links to test-mode settings');

console.log('diagnostics AppLog tests passed');
