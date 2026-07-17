const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html','utf8');

function functionSource(name){
  const start = html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let i = html.indexOf('{',start), depth = 0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    if(html[i]==='}') depth--;
    if(depth===0) return html.slice(start,i+1);
  }
  throw new Error('Could not extract '+name);
}

[
  'gestureTargetSummary','gestureComputedTouchAction','gestureViewportSnapshot',
  'createGestureDiagnostics','setupGestureDiagnostics','runtimeViewportMeta',
  'gestureEnvironmentSnapshot','formatGestureDiagnostics','gestureDiagnosticReport',
  'renderGestureDiagnosticsBody','refreshGestureDiagnostics',
  'clearGestureDiagnostics','copyGestureDiagnostics'
].forEach(function(name){ functionSource(name); });

assert.match(html,/var IOS_GESTURE_DIAGNOSTICS=createGestureDiagnostics\(24/,'collector uses a 24-record ring buffer');
assert.match(html,/diagGestureBody|diag-gesture-log/,'diagnostic event report is rendered');
assert.match(html,/iOS 手勢診斷/,'peach panel includes gesture diagnostics');
assert.match(html,/複製手勢診斷報告/);
assert.match(html,/清除手勢事件/);
assert.match(html,/okayama-trip-v15/,'gesture report identifies the target cache build');
assert.doesNotMatch(html,/var APP_BUILD=/,'retired build metadata is not restored');

const createSandbox = {Math,Number};
vm.createContext(createSandbox);
vm.runInContext(functionSource('createGestureDiagnostics'),createSandbox);
const store = createSandbox.createGestureDiagnostics(24,function(type,event){return {type,index:event.index};});
for(let i=0;i<30;i++) store.record('event',{index:i});
assert.strictEqual(store.list().length,24,'ring buffer is capped at 24 records');
assert.strictEqual(store.list()[0].index,6,'ring buffer drops the oldest records');
store.clear();
assert.strictEqual(store.list().length,0,'clear removes recorded events');

const listeners = [];
const viewportListeners = [];
const setupSandbox = {};
vm.createContext(setupSandbox);
vm.runInContext(functionSource('setupGestureDiagnostics'),setupSandbox);
const fakeStore = {record(){}};
setupSandbox.setupGestureDiagnostics(
  {addEventListener(type,listener,options){listeners.push({type,listener,options});}},
  {visualViewport:{addEventListener(type,listener,options){viewportListeners.push({type,listener,options});}}},
  fakeStore
);
assert.deepStrictEqual(listeners.map(function(item){return item.type;}),['touchstart','touchend','gesturestart','gestureend','dblclick']);
assert.deepStrictEqual(viewportListeners.map(function(item){return 'visualViewport.'+item.type;}),['visualViewport.resize']);
listeners.concat(viewportListeners).forEach(function(item){
  assert.strictEqual(item.options.passive,true,item.type+' listener is passive');
});
assert.doesNotMatch(functionSource('setupGestureDiagnostics'),/preventDefault/,'collector never changes gesture behavior');

const openStart = html.indexOf('function openDiagnostics(');
const openEnd = html.indexOf('function setupDiagnostics(',openStart);
const openSource = html.slice(openStart,openEnd);
assert.match(openSource,/>健康檢查</);
assert.match(openSource,/>iOS 手勢診斷</);
assert.match(openSource,/>時間模擬</);
assert.match(openSource,/>行程進度</);
assert.doesNotMatch(openSource,/>同步狀態|>版本/,'retired diagnostic sections stay retired');

const viewportSource = functionSource('setupViewportReflow');
assert.match(viewportSource,/visualViewport\.addEventListener\('resize'/);
assert.match(viewportSource,/addEventListener\('visibilitychange'/);
assert.match(viewportSource,/addEventListener\('pageshow'/);

const resetSource = functionSource('resetTripProgress');
assert.strictEqual((resetSource.match(/\bconfirm\(/g)||[]).length,2,'trip reset keeps two confirmations');

console.log('iOS gesture diagnostics tests passed');
