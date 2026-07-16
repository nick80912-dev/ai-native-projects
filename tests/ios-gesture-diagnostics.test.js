const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

function functionSource(name){
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

[
  'gestureTargetSummary','gestureComputedTouchAction','gestureViewportSnapshot',
  'createGestureDiagnostics','setupGestureDiagnostics','runtimeViewportMeta',
  'gestureEnvironmentSnapshot','formatGestureDiagnostics','gestureDiagnosticReport',
  'renderGestureDiagnosticsBody','refreshGestureDiagnostics',
  'clearGestureDiagnostics','copyGestureDiagnostics'
].forEach(function(name){
  assert.doesNotMatch(html,new RegExp('function '+name+'\\('),name+' is retired');
});

assert.doesNotMatch(html,/IOS_GESTURE_DIAGNOSTICS/);
assert.doesNotMatch(html,/diagGestureBody|diag-gesture-log|iOS 手勢診斷/);
assert.doesNotMatch(html,/複製手勢診斷報告|清除手勢事件/);
assert.match(html,/function setupDiagnostics\(/,'peach diagnostic panel remains');
assert.match(html,/function setupViewportReflow\(/,'viewport recovery remains');
assert.match(html,/function resetTripProgress\(/,'trip reset remains');
assert.match(
  html,
  /button\[onclick="resetTripProgress\(\)"\]\{[^}]*border-radius:[^;}]+;[^}]*background:var\(--coral\)[^}]*color:#fff/,
  'trip reset is rounded red with white text'
);

const openStart=html.indexOf('function openDiagnostics(');
const openEnd=html.indexOf('function setupDiagnostics(',openStart);
const openSource=html.slice(openStart,openEnd);
assert.match(openSource,/>健康檢查</);
assert.match(openSource,/>時間模擬</);
assert.match(openSource,/>行程進度</);
assert.doesNotMatch(openSource,/>同步狀態|>版本|iOS 手勢診斷/);

const viewportSource=functionSource('setupViewportReflow');
assert.match(viewportSource,/visualViewport\.addEventListener\('resize'/,'visual viewport recovery remains');
assert.match(viewportSource,/addEventListener\('touchstart'/,'focus pinch detection remains');
assert.match(viewportSource,/addEventListener\('gesturestart'/,'focus gesture detection remains');
assert.match(viewportSource,/addEventListener\('visibilitychange'/,'resume recovery remains');
assert.match(viewportSource,/addEventListener\('pageshow'/,'page-show recovery remains');

const resetSource=functionSource('resetTripProgress');
assert.strictEqual((resetSource.match(/\bconfirm\(/g)||[]).length,2,'trip reset keeps two confirmations');
assert.match(resetSource,/removeItem\('trip_checks'\)/);
assert.match(resetSource,/removeItem\('trip_next_stop_progress'\)/);

console.log('iOS gesture diagnostics retirement tests passed');
