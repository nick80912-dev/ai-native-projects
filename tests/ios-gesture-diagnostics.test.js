const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name){
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start);
  let depth = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') depth++;
    if(html[i] === '}') depth--;
    if(depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction('gestureTargetSummary'),
  extractFunction('gestureComputedTouchAction'),
  extractFunction('gestureViewportSnapshot'),
  extractFunction('createGestureDiagnostics')
].join('\n'), sandbox);

const target = {
  tagName:'DIV', className:'item secret extra',
  diagnosticTouchAction:'manipulation',
  textContent:'private', value:'private', href:'https://private'
};
assert.strictEqual(sandbox.gestureTargetSummary(target), 'div.item.secret');

const fakeWindow = {
  innerWidth:390, innerHeight:844, scrollX:0, scrollY:210,
  visualViewport:{ width:390, height:760, scale:1, offsetLeft:0, offsetTop:0 },
  getComputedStyle:function(el){ return {touchAction:el.diagnosticTouchAction}; }
};
const fakeDocument = {
  documentElement:{ clientWidth:390, scrollWidth:390, diagnosticTouchAction:'pan-x pan-y' },
  body:{ diagnosticTouchAction:'pan-x pan-y' }
};
const snap = sandbox.gestureViewportSnapshot('touchend', {
  timeStamp:123, touches:[], changedTouches:[{}], cancelable:true,
  defaultPrevented:false, target:target
}, fakeWindow, fakeDocument);
assert.strictEqual(snap.type, 'touchend');
assert.strictEqual(snap.target, 'div.item.secret');
assert.strictEqual(snap.vvScale, 1);
assert.strictEqual(snap.docScrollWidth, 390);
assert.strictEqual(snap.taHtml, 'pan-x pan-y');
assert.strictEqual(snap.taBody, 'pan-x pan-y');
assert.strictEqual(snap.taTarget, 'manipulation');
assert(!JSON.stringify(snap).includes('private'));

const oldWebView = sandbox.gestureViewportSnapshot('dblclick', {}, {
  innerWidth:320, innerHeight:568, scrollX:0, scrollY:0
}, fakeDocument);
assert.strictEqual(oldWebView.vvScale, null);
assert.strictEqual(oldWebView.taHtml, 'n/a');

const throwingWindow = {getComputedStyle:function(){ throw new Error('unsupported'); }};
assert.strictEqual(sandbox.gestureComputedTouchAction(throwingWindow,target), 'n/a');
assert.strictEqual(sandbox.gestureComputedTouchAction({},target), 'n/a');
assert.strictEqual(sandbox.gestureComputedTouchAction(fakeWindow,null), 'n/a');

const ring = sandbox.createGestureDiagnostics(24, function(type){ return {type:type}; });
for(let i=0;i<30;i++) ring.record('event-' + i, {});
assert.strictEqual(ring.list().length, 24);
assert.strictEqual(ring.list()[0].type, 'event-6');
assert.strictEqual(ring.list()[23].type, 'event-29');
ring.clear();
assert.strictEqual(ring.list().length, 0);

const setupSource = extractFunction('setupGestureDiagnostics');
assert(!/preventDefault|stopPropagation|setAttribute|\.style\.|localStorage|lsSet/.test(setupSource));
assert.match(setupSource, /\{passive:true\}/);
['touchstart','touchend','gesturestart','gestureend','dblclick'].forEach(function(type){
  assert(setupSource.includes("'" + type + "'"), type + ' is observed');
});
assert(setupSource.includes("'resize'"), 'visual viewport resize is observed');

vm.runInContext([
  setupSource,
  extractFunction('runtimeViewportMeta'),
  extractFunction('gestureEnvironmentSnapshot'),
  extractFunction('formatGestureDiagnostics')
].join('\n'), sandbox);

const registrations = [];
const observerDocument = {
  addEventListener:function(type,fn,options){ registrations.push({scope:'document',type:type,fn:fn,options:options}); }
};
const observerWindow = {
  visualViewport:{
    addEventListener:function(type,fn,options){ registrations.push({scope:'viewport',type:type,fn:fn,options:options}); }
  }
};
const observed = [];
sandbox.setupGestureDiagnostics(observerDocument,observerWindow,{record:function(type,event){ observed.push({type:type,event:event}); }});
assert.strictEqual(registrations.length, 6);
registrations.forEach(function(reg){ assert.strictEqual(reg.options.passive,true, reg.type + ' is passive'); });
registrations.find(function(reg){ return reg.type==='touchend'; }).fn({marker:'touch'});
registrations.find(function(reg){ return reg.type==='resize'; }).fn({marker:'resize'});
assert.deepStrictEqual(observed.map(function(item){ return item.type; }), ['touchend','visualViewport.resize']);

const runtimeMetaDocument = {
  querySelector:function(){
    return {getAttribute:function(){ return 'width=device-width, initial-scale=1.0, viewport-fit=cover'; }};
  }
};
const env = sandbox.gestureEnvironmentSnapshot(
  {userAgent:'Test iPhone',standalone:true},
  {matches:true},
  {channel:'DEV',code:'abcdef0',date:'2026-07-13'},
  '2.1 (2026-07-10)',
  'okayama-trip-v8',
  runtimeMetaDocument
);
const report = sandbox.formatGestureDiagnostics(env, snap, [snap]);
assert(report.includes('APP DEV · CODE abcdef0 · 2026-07-13'));
assert(report.includes('standalone=true'));
assert(report.includes('viewport meta=width=device-width, initial-scale=1.0, viewport-fit=cover'));
assert(report.includes('touchend'));
assert(report.includes('scale=1'));
assert(report.includes('doc=390/390'));
assert(report.includes('ta.html=pan-x pan-y'));
assert(report.includes('ta.body=pan-x pan-y'));
assert(report.includes('ta.target=manipulation'));
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ return null; }}), 'n/a');
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ throw new Error('blocked'); }}), 'n/a');
assert.strictEqual(sandbox.runtimeViewportMeta({querySelector:function(){ return {getAttribute:function(){ throw new Error('blocked'); }}; }}), 'n/a');

assert.match(html, /id="diagGestureBody"/);
assert.match(html, />iOS 手勢診斷</);
assert.match(html, /onclick="copyGestureDiagnostics\(\)"/);
assert.match(html, /onclick="clearGestureDiagnostics\(\)"/);
assert.match(html, /\.diag-gesture-log\{[^}]*max-height:[^;}]+;[^}]*overflow:auto/);

const body = {innerHTML:''};
const copied = [];
sandbox.window = {
  innerWidth:390, innerHeight:844, scrollX:0, scrollY:0,
  visualViewport:{width:390,height:760,scale:1,offsetLeft:0,offsetTop:0},
  matchMedia:function(){ return {matches:true}; },
  getComputedStyle:function(){ return {touchAction:'pan-x pan-y'}; }
};
sandbox.document = {
  documentElement:{clientWidth:390,scrollWidth:390}, body:{},
  getElementById:function(id){ return id==='diagGestureBody'?body:null; },
  querySelector:function(){ return {getAttribute:function(){ return 'width=device-width, initial-scale=1.0, viewport-fit=cover'; }}; }
};
sandbox.navigator = {userAgent:'Test iPhone',standalone:true};
sandbox.APP_BUILD = {channel:'DEV',code:'abcdef0',date:'2026-07-13'};
sandbox.SCHEMA = {version:'2.1 (2026-07-10)'};
sandbox.IOS_GESTURE_DIAGNOSTICS = sandbox.createGestureDiagnostics(24,function(type,event){
  return sandbox.gestureViewportSnapshot(type,event,sandbox.window,sandbox.document);
});
sandbox.escapeHtml = function(value){ return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
sandbox.copyText = function(text,label){ copied.push({text:text,label:label}); };
vm.runInContext([
  extractFunction('gestureDiagnosticReport'),
  extractFunction('renderGestureDiagnosticsBody'),
  extractFunction('refreshGestureDiagnostics'),
  extractFunction('clearGestureDiagnostics'),
  extractFunction('copyGestureDiagnostics')
].join('\n'), sandbox);

sandbox.IOS_GESTURE_DIAGNOSTICS.record('touchend',{timeStamp:1,target:{tagName:'DIV'}});
assert(sandbox.renderGestureDiagnosticsBody().includes('已記錄 1 筆事件'));
sandbox.copyGestureDiagnostics();
assert.strictEqual(copied[0].label,'手勢診斷報告');
assert(copied[0].text.includes('touchend'));
sandbox.clearGestureDiagnostics();
assert.strictEqual(sandbox.IOS_GESTURE_DIAGNOSTICS.list().length,0);
assert(body.innerHTML.includes('尚無手勢事件'));

console.log('iOS gesture diagnostic tests passed');
