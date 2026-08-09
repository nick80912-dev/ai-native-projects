const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
const markerStart='/* ---- DIAGNOSTIC APPLOG START ---- */';
const markerEnd='/* ---- DIAGNOSTIC APPLOG END ---- */';
const start=html.indexOf(markerStart);
const end=html.indexOf(markerEnd,start);
assert(start>=0&&end>start,'diagnostic AppLog helpers have stable extraction markers');

const copied=[];
const toasts=[];
let entries=[{at:'2026-08-09T01:02:03.000Z',category:'repository',level:'warn',message:'<b>失敗</b>'}];
let clearCalls=0;
const section={outerHTML:''};
class TestDate extends Date{
  constructor(value){super(value===undefined?'2026-08-09T02:03:04.000Z':value);}
}
const sandbox={
  Date:TestDate,String,Array,Object,JSON,
  escapeHtml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');},
  currentHealthFindings(){return ['懸空引用'];},
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
assert(rendered.includes('&lt;b&gt;失敗&lt;/b&gt;'),'stored messages are escaped before rendering');
assert(!rendered.includes('<b>失敗</b>'),'stored messages cannot inject markup');

const report=sandbox.formatDiagnosticsReport(['懸空引用'],entries);
assert(report.includes('Health Check'),'the report labels its current health snapshot');
assert(report.includes('懸空引用'),'the report contains current health findings');
assert(report.includes('[repository] <b>失敗</b>'),'the copied plain-text report contains the full stored event');

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
