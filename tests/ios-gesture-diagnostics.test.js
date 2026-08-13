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
assert.match(html, /healthCheck\(\)/, 'the public reporting health check remains available');
assert.match(html, /function currentHealthFindings\(/, 'diagnostics can read health without adding AppLog entries');
assert.match(html, /id="diagAppLogSection"/, 'the diagnostics panel exposes the bounded AppLog session buffer');
assert.match(html, /function setTimeSimulationDay\(/, 'travel-day shortcuts remain');
assert.match(html, /function resetTripProgress\(/, 'trip progress reset remains');
/* 真機驗收需要知道「這台裝置實際啟用的是哪一版 SW」——
   activate 會刪掉所有非當前 CACHE_NAME 的快取,因此 caches.keys() 的唯一一筆就是答案。 */
assert.match(html, /function readActiveShellVersion\(/, 'the diagnostics panel can read the activated shell version');
assert.match(html, /caches\.keys\(\)/, 'the version comes from the real Cache Storage, not a hard-coded string');
assert.match(html, /id="diagShellVersion"/, 'the panel renders a placeholder row for the version');
assert.match(html, /<h3>App 版本<\/h3>/, 'the version row is labelled');
assert.ok(html.indexOf("okayama-trip-v") < 0, 'index.html must not hard-code the cache name — sw.js stays the single source');
assert.match(html, /讀取中…/, 'the async read shows a loading state first');
assert.match(html, /無法讀取/, 'a browser without Cache Storage degrades to an explicit message, never a wrong version');

assert.match(html, /function setupViewportReflow\(/, 'viewport recovery remains');
assert.match(html, /visualViewport\.addEventListener\('resize'/, 'visual viewport recovery remains');
assert.match(html, /addEventListener\('visibilitychange'/, 'foreground recovery remains');
assert.match(html, /addEventListener\('pageshow'/, 'page-cache recovery remains');

console.log('iOS double-tap suppressor tests passed');
