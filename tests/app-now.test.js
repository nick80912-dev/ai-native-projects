const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

function makeSandbox(timeSimulation) {
  const store = {};
  if (timeSimulation) store.trip_time_simulation = JSON.stringify(timeSimulation);
  const sandbox = {
    Date,
    URLSearchParams,
    window: { location: { search: '' } },
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = value; },
    },
    AppLog: { repo() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext([extractFunction('lsGet'), extractFunction('appNow')].join('\n'), sandbox);
  return sandbox;
}

const real = makeSandbox();
assert.ok(real.appNow() instanceof Date, '手機時間模式回傳 Date');

const simulated = makeSandbox({ mode: 'custom', value: '2026-10-18T15:30' });
assert.strictEqual(simulated.appNow().getFullYear(), 2026, '自訂時間使用指定年份');
assert.strictEqual(simulated.appNow().getMonth(), 9, '自訂時間使用指定月份');
assert.strictEqual(simulated.appNow().getDate(), 18, '自訂時間使用指定日期');
assert.strictEqual(simulated.appNow().getHours(), 15, '自訂時間使用指定小時');
assert.strictEqual(simulated.appNow().getMinutes(), 30, '自訂時間使用指定分鐘');

const offsetMs = 90 * 60 * 1000;
const offset = makeSandbox({ mode: 'offset', offsetMs });
const before = Date.now() + offsetMs;
const movingNow = offset.appNow().getTime();
const after = Date.now() + offsetMs;
assert.ok(movingNow >= before && movingNow <= after, 'offset 模式以真實時間加偏移量持續行走');

const directNowCalls = (html.match(/new Date\(\)/g) || []).length;
assert.strictEqual(directNowCalls, 1, '只有 appNow 可以直接取得目前時間');
assert.ok(html.includes('function appNow()'), '行程時間源統一為 appNow');
assert.ok(!html.includes('function previewNow()'), '舊 previewNow 已移除');
const appNowStart = html.indexOf('function appNow()');
const appNowEnd = html.indexOf('\nfunction todayMD()', appNowStart);
const outsideAppNow = html.slice(0, appNowStart) + html.slice(appNowEnd);
const outsideDateCalls = outsideAppNow.match(/new Date\(/g) || [];
assert.strictEqual(outsideDateCalls.length, 1, 'appNow 以外僅保留同步時間戳的 Date 建構');

console.log('appNow tests passed');
