const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('shell/v114/index.html','utf8');
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

sandbox.copyDiagnosticsReport();
assert.strictEqual(copied.length,1,'copy uses the shared text-copy path once');
assert.strictEqual(copied[0].label,'除錯報告');
assert(copied[0].text.includes('Health Check'));
sandbox.clearDiagnosticAppLog();
assert.strictEqual(clearCalls,1,'clear delegates to the real AppLog owner');
assert(section.outerHTML.includes('0 筆'),'clear refreshes the visible section');
assert(section.outerHTML.includes('尚無紀錄'),'clear exposes an explicit empty state');
assert.deepStrictEqual(toasts,['AppLog 已清除']);

const openStart=html.indexOf('function openDiagnostics(');
const openEnd=html.indexOf('function setupDiagnostics(',openStart);
assert(openStart>=0&&openEnd>openStart,'openDiagnostics has stable source bounds');
const openSource=html.slice(openStart,openEnd);
assert(openSource.includes('renderDiagnosticAppLogSection(AppLog.snapshot())'),'the real panel mounts the AppLog section');
assert(!openSource.includes('團體帳測試模式'),'the real panel no longer renders the group-ledger test-mode section');
assert(!openSource.includes('openTestModeSettings()'),'the real panel no longer links to test-mode settings');

console.log('diagnostics AppLog tests passed');
