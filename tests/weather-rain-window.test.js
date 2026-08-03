/* 降雨機率:現在之後,而不是整天(2026-08-02,v84)
   ============================================================
   原本取的是**整天**每小時降雨機率的最大值,包含已經過去的時段 ——
   早上八點下過雨、下午全晴,晚上看到的還是 80%,對「等一下要不要帶傘」毫無幫助。

   快取是這件事的關鍵:原本存的是**算完的數字**,TTL 三小時。
   若沿用,早上算的「現在之後」到中午就是錯的。改為快取**原始 hourly 序列**,
   在**讀取時**依當下重算 —— 這樣同一份快取在任何時間點都給得出正確答案。
   舊格式的快取必須安全降級,不能讓使用者升級後看到空白。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html, 'rainChanceFromNow'), sandbox);
const { rainChanceFromNow } = sandbox;

const H = (hour) => '2026-10-18T' + String(hour).padStart(2, '0') + ':00';
const series = {
  time: [H(6), H(9), H(12), H(15), H(18), H(21)],
  precipitation_probability: [90, 80, 10, 20, 5, 0],
};

/* ---- 只看現在之後 ---- */
assert.strictEqual(rainChanceFromNow(series, new Date('2026-10-18T10:00:00')), 20,
  '早上的 90／80 已經過去,之後的最大值是 20');
assert.strictEqual(rainChanceFromNow(series, new Date('2026-10-18T05:00:00')), 90,
  '一天還沒開始時,整天最大值就是 90');
assert.strictEqual(rainChanceFromNow(series, new Date('2026-10-18T16:00:00')), 5,
  '傍晚之後只剩 5 與 0');

/* ---- 邊界:當下這個小時要算在內 ---- */
assert.strictEqual(rainChanceFromNow(series, new Date('2026-10-18T12:00:00')), 20,
  '正好在整點時,該時段本身仍算「現在之後」');

/* ---- 全部都過去了:退回當日最大值,不得回 null 造成空白 ---- */
assert.strictEqual(rainChanceFromNow(series, new Date('2026-10-18T23:30:00')), 90,
  '時段全部過去時退回當日最大值,而不是顯示空白');

/* ---- 殘缺資料不得炸掉 ---- */
assert.strictEqual(rainChanceFromNow(null, new Date()), null, 'null 序列安全回傳 null');
assert.strictEqual(rainChanceFromNow({}, new Date()), null, '缺欄位安全回傳 null');
assert.strictEqual(rainChanceFromNow({ time: [], precipitation_probability: [] }, new Date()), null,
  '空序列安全回傳 null');
/* 長度不一致時只取兩者都有的部分,不得讀到 undefined */
assert.strictEqual(rainChanceFromNow({ time: [H(9), H(12)], precipitation_probability: [30] },
  new Date('2026-10-18T08:00:00')), 30, '長度不一致時只取對得起來的部分');

/* ---- 快取契約:必須存得下原始序列 ---- */
const fetchSource = extractFunction(html, 'fetchWeather');
assert(fetchSource.indexOf('hours') > 0, 'fetchWeather 必須把原始 hourly 序列帶進快取資料');
const cacheSource = extractFunction(html, 'getCachedWeather');
assert(cacheSource.indexOf('rainChanceFromNow(') > 0,
  '讀快取時依當下重算 —— 否則三小時 TTL 內的「現在之後」會是錯的');
assert(/hours/.test(cacheSource), '舊格式(沒有 hours)必須安全降級,不能讓畫面空白');

console.log('weather rain window tests passed');
