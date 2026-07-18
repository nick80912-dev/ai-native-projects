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

assert.match(html, /document\.addEventListener\('visibilitychange'/, 'foreground visibility is observed');
assert.match(html, /if\(!document\.hidden\)\s*recoverViewportAfterResume/, 'hidden background transitions do not trigger recovery');
assert.match(html, /window\.addEventListener\('pageshow'/, 'restoration from the iOS page cache is observed');

const frames = [];
const scrollCalls = [];
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction('recoverViewportAfterResume'), sandbox);

const original = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
const meta = {
  content:'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1',
  setAttribute:function(name,value){ assert.strictEqual(name,'content'); this.content=value; }
};
const wrap = { style:{ transform:'scale(1.8)', transition:'transform .2s' } };
const fakeWindow = {
  scrollX:17,
  scrollY:640,
  scrollTo:function(x,y){ scrollCalls.push([x,y]); }
};

sandbox.recoverViewportAfterResume(meta, original, wrap, fakeWindow, function(fn){ frames.push(fn); });
assert.strictEqual(meta.content, original, 'resume restores the exact original viewport string');
assert.strictEqual(wrap.style.transform, '', 'legacy inline scale is cleared');
assert.strictEqual(wrap.style.transition, '', 'legacy inline transform transition is cleared');
assert.strictEqual(scrollCalls.length, 0, 'scroll is not moved before WebKit lays out');
assert.strictEqual(frames.length, 1, 'the first animation frame is scheduled');
frames.shift()();
assert.strictEqual(frames.length, 1, 'the second animation frame is scheduled');
frames.shift()();
assert.deepStrictEqual(scrollCalls, [[17,640]], 'the original two-axis scroll position is restored');

console.log('iOS viewport resume tests passed');
