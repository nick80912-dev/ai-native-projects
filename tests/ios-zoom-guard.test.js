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

assert.match(html, /html\s*\{[^}]*touch-action\s*:\s*manipulation/i, 'CSS disables double-tap zoom');
assert.match(html, /function setupDoubleTapGuard\(/, 'stage one retains the JS double-tap guard');
assert.doesNotMatch(html.match(/<meta name="viewport"[^>]+>/i)[0], /maximum-scale|user-scalable/i, 'viewport restrictions are not persistent');
assert.match(sw, /okayama-trip-v4/, 'service worker cache is bumped to v4');
assert.match(html, /SW okayama-trip-v4/, 'diagnostics display the current service worker cache version');

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

assert.match(html, /function isDoubleTapInteractive\(/, 'interactive double-tap targets have a named classifier');
assert.match(html, /function touchDistance\(/, 'double-tap distance has a named helper');

const touchListeners = {};
const clock = { now:1000 };
const touchSandbox = {
  Date: { now:function(){ return clock.now; } },
  Math: Math,
  document: {
    addEventListener:function(type,fn,options){ touchListeners[type]={fn:fn,options:options}; }
  }
};
vm.createContext(touchSandbox);
vm.runInContext(extractFunction('isDoubleTapInteractive'), touchSandbox);
vm.runInContext(extractFunction('touchDistance'), touchSandbox);
vm.runInContext(extractFunction('setupDoubleTapGuard'), touchSandbox);
touchSandbox.setupDoubleTapGuard();

function target(interactive){
  return { closest:function(){ return interactive?{}:null; } };
}
function start(x,y,count,interactive){
  let prevented=false;
  const touches=[];
  for(let i=0;i<count;i++) touches.push({clientX:x+i*20,clientY:y});
  touchListeners.touchstart.fn({
    touches:touches,
    target:target(interactive),
    preventDefault:function(){ prevented=true; }
  });
  return prevented;
}
function move(x,y,count){
  const touches=[];
  for(let i=0;i<count;i++) touches.push({clientX:x+i*20,clientY:y});
  touchListeners.touchmove.fn({touches:touches});
}

assert.strictEqual(touchListeners.touchstart.options.passive,false, 'touchstart can cancel WebKit zoom');
assert.strictEqual(start(100,100,1,false),false, 'first non-interactive tap is allowed');
clock.now=1200;
assert.strictEqual(start(110,108,1,false),true, 'nearby second tap within 350ms is blocked');

clock.now=2000;
assert.strictEqual(start(100,100,1,false),false);
clock.now=2400;
assert.strictEqual(start(100,100,1,false),false, 'tap after 350ms is allowed');

clock.now=3000;
assert.strictEqual(start(100,100,1,false),false);
clock.now=3200;
assert.strictEqual(start(140,100,1,false),false, 'second tap beyond 24px is allowed');

clock.now=4000;
assert.strictEqual(start(100,100,1,false),false);
move(120,100,1);
clock.now=4200;
assert.strictEqual(start(100,100,1,false),false, 'movement beyond 10px cancels the candidate');

clock.now=5000;
assert.strictEqual(start(100,100,2,false),false, 'two-finger pinch start is never blocked');
clock.now=5100;
assert.strictEqual(start(100,100,1,true),false, 'interactive targets are never blocked by the general guard');
assert.match(extractFunction('isDoubleTapInteractive'), /#diagnosticBadge/, 'peach badge remains excluded');

console.log('iOS zoom guard tests passed');
