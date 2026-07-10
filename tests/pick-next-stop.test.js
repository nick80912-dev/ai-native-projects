/* ============================================================
   tests/pick-next-stop.test.js
   ============================================================
   涵蓋 2026-07-09 的行為變更(見 07_CHANGELOG):
   1. pickNextStop 統一以時間判斷「下一站」,不再因「今天是否已手動清過任一項」切換邏輯。
   2. 已過時間且未手動處理的項目中,只有「最後一項」保留待確認,較早的一律自動略過(寫入 progress.skip + autoSkip)。
   3. 今日完成度(isTripItemCleared/remaining)只看手動 done/skip/checks,不受自動略過以外的時間因素影響
      —— 但自動略過本身就是寫入 skip,所以會被視為「已清除」,這是刻意的(時間不能重來、不會同天回訪)。
   4. markNextStop(手動完成/跳過)會清除 autoSkip 標記(手動動作優先於自動判定)。
   ============================================================ */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('日本行程V2預覽.html', 'utf8');

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

function makeSandbox(){
  const store = {};
  const sandbox = {
    lsGet: function(k, f){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : f; },
    lsSet: function(k, v){ store[k] = v; },
    toast: function(){ sandbox._lastToast = Array.prototype.slice.call(arguments); },
    AppLog: { repo:function(){}, sync:function(){}, schema:function(){}, parser:function(){}, data:function(){}, render:function(){} }
  };
  sandbox.getChecks = function(){ return sandbox.lsGet('trip_checks', {}); };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction('parseStartMinutes'),
    extractFunction('normalizeDayProgress'),
    extractFunction('dayProgressKey'),
    extractFunction('getNextStopProgress'),
    extractFunction('saveNextStopProgress'),
    extractFunction('getDayProgress'),
    extractFunction('markNextStop'),
    extractFunction('autoSkipStaleItem'),
    extractFunction('isAutoSkipped'),
    extractFunction('isNextStopCleared'),
    extractFunction('pickNextStop')
  ].join('\n'), sandbox);
  sandbox._store = store;
  return sandbox;
}

const day = { date:'10/18' };
const dayIndex = 0;
const checks = {};

/* ---- 情境1:今天完全沒手動動作,現在 15:00,有項目時間已過、有未來項目 ---- */
{
  const sb = makeSandbox();
  const items = [
    { id:'a', time:'9:00', act:'早餐' },
    { id:'b', time:'11:00', act:'午餐' },
    { id:'c', time:'17:00', act:'晚餐' }
  ];
  const progress = sb.getDayProgress(day, dayIndex);
  const pick = sb.pickNextStop(items, progress, checks, 15*60, { day, dayIndex });
  assert.strictEqual(pick.item.id, 'b', '15:00 時,11:00 是最後一個已過時間的未清項目,應保留待確認');
  assert.strictEqual(pick.source, 'time-stale');
  const p2 = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(!!p2.skip['a'], true, '9:00 那項(較早的已過項目)應被自動略過');
  assert.strictEqual(!!p2.autoSkip['a'], true, '自動略過要記錄 autoSkip 標記,供 UI 顯示與一鍵修正');
  assert.strictEqual(!!p2.skip['b'], false, '保留待確認的那項不能被自動略過');
}

/* ---- 情境2:今天已手動完成早上那項,現在 21:00,11:00 項目仍未清 ---- */
/* 這是使用者回報的原始 bug:舊邏輯只要今天按過任何一次完成/跳過,就會卡在「順序上的下一項」,
   不再依時間推進。修正後應該與「完全沒按過」時行為一致,只看時間。 */
{
  const sb = makeSandbox();
  const items = [
    { id:'a', time:'9:00', act:'早餐' },
    { id:'b', time:'11:00', act:'午餐' },
    { id:'c', time:'17:00', act:'晚餐' }
  ];
  sb.markNextStop(day, dayIndex, 'a', 'done'); // 手動完成早餐
  const progress = sb.getDayProgress(day, dayIndex);
  const pick = sb.pickNextStop(items, progress, checks, 21*60, { day, dayIndex });
  assert.strictEqual(pick.item.id, 'c', '21:00 時應推進到 17:00 那項(最後一個已過時間的未清項目),不應卡在 11:00');
  const p2 = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(!!p2.skip['b'], true, '11:00 那項應被自動略過(它比 17:00 早,且今天不會回訪)');
}

/* ---- 情境3:沒有任何項目時間已過(現在還早)→ 維持找最近未來項目 ---- */
{
  const sb = makeSandbox();
  const items = [
    { id:'a', time:'9:00', act:'早餐' },
    { id:'b', time:'11:00', act:'午餐' }
  ];
  const progress = sb.getDayProgress(day, dayIndex);
  const pick = sb.pickNextStop(items, progress, checks, 8*60, { day, dayIndex });
  assert.strictEqual(pick.item.id, 'a');
  assert.strictEqual(pick.source, 'time');
  const p2 = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(Object.keys(p2.skip).length, 0, '還沒到任何項目的時間,不應該有任何自動略過');
}

/* ---- 情境4:無時間欄位的項目夾在已過時間項目中間,也要一併自動略過 ---- */
{
  const sb = makeSandbox();
  const items = [
    { id:'a', time:'9:00', act:'早餐' },
    { id:'mid', time:'', act:'血拚時間' }, // 無明確時間
    { id:'b', time:'17:00', act:'晚餐' }
  ];
  const progress = sb.getDayProgress(day, dayIndex);
  const pick = sb.pickNextStop(items, progress, checks, 20*60, { day, dayIndex });
  assert.strictEqual(pick.item.id, 'b');
  const p2 = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(!!p2.skip['a'], true);
  assert.strictEqual(!!p2.skip['mid'], true, '夾在已過時間項目中間的無時間項目也應視為過期一併略過');
}

/* ---- 情境5:今天全部手動清除 → remaining 為空,回傳 item:null,不做任何自動略過 ---- */
{
  const sb = makeSandbox();
  const items = [{ id:'a', time:'9:00', act:'早餐' }];
  sb.markNextStop(day, dayIndex, 'a', 'done');
  const progress = sb.getDayProgress(day, dayIndex);
  const pick = sb.pickNextStop(items, progress, checks, 23*60, { day, dayIndex });
  assert.strictEqual(pick.item, null);
  assert.strictEqual(pick.source, 'complete');
}

/* ---- 情境6:手動完成/跳過會清除 autoSkip 標記(手動動作優先) ---- */
{
  const sb = makeSandbox();
  sb.autoSkipStaleItem(day, dayIndex, 'x');
  let progress = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(!!progress.autoSkip['x'], true);
  sb.markNextStop(day, dayIndex, 'x', 'done'); // 使用者事後確認其實有完成
  progress = sb.getDayProgress(day, dayIndex);
  assert.strictEqual(!!progress.autoSkip['x'], false, 'markNextStop 應清除 autoSkip 標記');
  assert.strictEqual(!!progress.done['x'], true);
}

console.log('pickNextStop / auto-skip tests passed');
