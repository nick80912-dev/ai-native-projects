const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

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

assert.match(html, /input\s*,\s*select\s*,\s*textarea\s*\{[^}]*font-size\s*:\s*16px/i, 'global form controls have a 16px floor');
[
  /\.inline-add input\{[^}]*font-size\s*:\s*16px/i,
  /\.field input\s*,\s*\.field select\{[^}]*font-size\s*:\s*16px/i,
  /\.shop-search input\{[^}]*font-size\s*:\s*16px/i,
  /\.diag-panel input\{[^}]*font-size\s*:\s*16px/i
].forEach(function(rule){ assert.match(html, rule); });

assert.match(html, /html\s*,\s*body\s*\{[^}]*touch-action\s*:\s*pan-x\s+pan-y/i, 'root policy allows panning without zoom');
assert.doesNotMatch(html, /(?:\*|html|body)\s*(?:,\s*(?:html|body))?\s*\{[^}]*touch-action\s*:\s*manipulation/i, 'manipulation is never applied globally');
assert.match(html, /\.ledger-sheet\{[^}]*touch-action\s*:\s*pan-y/i, 'Bottom Sheet remains a Scroll-only ancestor');
assert.match(html, /\.ledger-sheet button[^}]*touch-action\s*:\s*manipulation/i, 'only Bottom Sheet controls use scoped manipulation');
assert.doesNotMatch(html, /function setupPinchZoom\(/, 'custom pinch transform is removed');
assert.doesNotMatch(html, /pinch-zooming/, 'custom pinch CSS state is removed');
assert.doesNotMatch(html, /function setupDoubleTapGuard\(/, 'failed double-tap JavaScript guard is removed');
assert.doesNotMatch(html, /function isDoubleTapInteractive\(/, 'double-tap classifier is removed');
assert.doesNotMatch(html, /function touchDistance\(/, 'double-tap distance helper is removed');
assert.match(html, /function setupDiagnostics\(/, 'peach diagnostic gesture remains available');
assert.match(html, /function setupViewportReflow\(/, 'form focus recovery remains available');
assert.doesNotMatch(html.match(/<meta name="viewport"[^>]+>/i)[0], /maximum-scale|user-scalable/i, 'viewport restrictions are not persistent');
assert.match(sw, /okayama-trip-v34/, 'service worker cache is bumped to v34');
assert.doesNotMatch(sw, /okayama-trip-v20/, 'retired v20 cache is not retained');
assert.doesNotMatch(sw, /tests\//, 'test files are not part of the App Shell');
assert.doesNotMatch(sw, /ios-gesture-diagnostics\.test\.js/, 'the diagnostic test is never cached');
assert.doesNotMatch(html,/var APP_BUILD=/,'unused diagnostic build metadata is retired');
assert.match(html,/function iosDoubleTapZoomSuppressor\(\)\{\}/,'the minimal no-op double-tap compatibility listener is present');
assert.doesNotMatch(html,/IOS_GESTURE_DIAGNOSTICS|function setupGestureDiagnostics\(/,'gesture evidence collection is retired');

const timers = [];
const sandbox = {
  VIEWPORT_ORIGINAL: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
  setTimeout: function(fn, ms){ timers.push({fn:fn, ms:ms}); return timers.length; },
  clearTimeout: function(){ sandbox.cleared = true; }
};
vm.createContext(sandbox);
vm.runInContext(extractFunction('restoreFocusZoom'), sandbox);

const meta = { content:sandbox.VIEWPORT_ORIGINAL };
const timerId = sandbox.restoreFocusZoom(meta, {scale:1.25}, false, 7);
assert.strictEqual(sandbox.cleared, true, 'an older restore timer is cleared');
assert.match(meta.content, /maximum-scale=1/, 'focus zoom is locked transiently');
assert.strictEqual(timers[0].ms, 100, 'restore waits for iOS to apply the lock');
timers[0].fn();
assert.strictEqual(meta.content, sandbox.VIEWPORT_ORIGINAL, 'the exact original viewport string is restored');
assert.strictEqual(timerId, 1);

meta.content = sandbox.VIEWPORT_ORIGINAL;
assert.strictEqual(sandbox.restoreFocusZoom(meta, {scale:1.25}, true, null), null, 'active pinch zoom is not restored');
assert.strictEqual(meta.content, sandbox.VIEWPORT_ORIGINAL);
assert.strictEqual(sandbox.restoreFocusZoom(meta, null, false, null), null, 'old WebView without visualViewport is ignored');

console.log('iOS zoom guard tests passed');
