const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const suppressorPattern = /document\.addEventListener\(\s*['"]dblclick['"]\s*,\s*function\s+iosDoubleTapZoomSuppressor\s*\(\s*\)\s*\{\s*\}\s*,\s*\{\s*passive\s*:\s*true\s*\}\s*\)\s*;/g;
const suppressors = html.match(suppressorPattern) || [];
assert.strictEqual(suppressors.length, 1, 'exactly one passive no-op dblclick suppressor is registered on document');
assert.doesNotMatch(suppressors[0], /preventDefault/, 'the compatibility suppressor never cancels an event');

[
  'gestureTargetSummary', 'gestureComputedTouchAction', 'gestureViewportSnapshot',
  'createGestureDiagnostics', 'setupGestureDiagnostics', 'runtimeViewportMeta',
  'gestureEnvironmentSnapshot', 'formatGestureDiagnostics', 'gestureDiagnosticReport',
  'renderGestureDiagnosticsBody', 'refreshGestureDiagnostics',
  'clearGestureDiagnostics', 'copyGestureDiagnostics', 'IOS_GESTURE_DIAGNOSTICS',
  'diagGestureBody', 'diag-gesture-log', '複製手勢診斷報告', '清除手勢事件'
].forEach(function(identifier) {
  assert.strictEqual(html.includes(identifier), false, identifier + ' is retired from index.html');
});

assert.match(html, /function setupDiagnostics\(/, 'the peach diagnostics entry remains');
assert.match(html, /function openDiagnostics\(/, 'the diagnostics panel remains');
assert.match(html, /healthCheck\(\)/, 'health check remains in the diagnostics panel');
assert.match(html, /function setTimeSimulationDay\(/, 'travel-day shortcuts remain');
assert.match(html, /function resetTripProgress\(/, 'trip progress reset remains');
assert.match(html, /function setupViewportReflow\(/, 'viewport recovery remains');
assert.match(html, /visualViewport\.addEventListener\('resize'/, 'visual viewport recovery remains');
assert.match(html, /addEventListener\('visibilitychange'/, 'foreground recovery remains');
assert.match(html, /addEventListener\('pageshow'/, 'page-cache recovery remains');

console.log('iOS double-tap suppressor tests passed');
