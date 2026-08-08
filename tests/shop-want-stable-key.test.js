/* 想逛標記的穩定 key(2026-08-02)
   ============================================================
   為什麼要有這個檔:想逛標記原本以 `w_<mallIndex>_<floor>_<name>` 為 key,
   而 mallIndex 是 shopMalls() 的**列舉索引** —— 該陣列依「行程出現順序 → 名稱」排序,
   新增／移除購物地點就會位移索引,已存的標記於是靜默指到別家店。

   這在實際資料中已經發生過:BUILTIN 快照只有 P001／P007 兩個購物地點,
   線上表加入 P048 之後排序變成 0:P001 1:P048 2:P007,P007 由索引 1 變 2。
   且「無印良品 1F」同時存在於 P001 與 P039 —— 位移一格即在兩家不同店之間轉移標記。

   本檔鎖住的不變式:key 只由 placeId／樓層／店名決定,與列舉順序無關;
   舊資料轉換在候選唯一時才轉,模糊時一律移除而不猜測,且必須冪等。
   ============================================================ */
const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');

const html = readIndexHtml();

/* vm context 內建立的物件 prototype 與 Node realm 不同,比對前先轉成純值 */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html, 'shopWantStoreKey'), sandbox);
vm.runInContext(extractFunction(html, 'migrateShopWantKeys'), sandbox);
const { shopWantStoreKey, migrateShopWantKeys } = sandbox;

/* ---- 測試用購物地點:兩個 place 共用同名同樓層的店 ---- */
const AEON = { placeId: 'P001', name: '永旺夢樂城岡山' };
const ARIO = { placeId: 'P039', name: 'Ario 倉敷' };
const HONDORI = { placeId: 'P007', name: '廣島本通商店街' };
const MUJI = { floor: '1F', name: '無印良品' };
const UNIQLO = { floor: '4F', name: 'UNIQLO' };
const ONLY_HONDORI = { floor: '路面店', name: 'BEAMS' };

/* 插入 P048 之前 / 之後的兩種排序 */
const before = [
  { place: AEON, stores: [MUJI, UNIQLO] },
  { place: HONDORI, stores: [ONLY_HONDORI] },
  { place: ARIO, stores: [MUJI] },
];
const after = [
  { place: AEON, stores: [MUJI, UNIQLO] },
  { place: { placeId: 'P048', name: '唐吉訶德 岡山駅前店' }, stores: [] },
  { place: HONDORI, stores: [ONLY_HONDORI] },
  { place: ARIO, stores: [MUJI] },
];

/* ================= 一、穩定性 ================= */

/* 插入新地點後索引全部位移,但 key 必須完全不變 */
assert.strictEqual(
  shopWantStoreKey(HONDORI, 1, ONLY_HONDORI),
  shopWantStoreKey(HONDORI, 2, ONLY_HONDORI),
  '插入新購物地點造成索引位移後,既有想逛標記仍屬於原 placeId'
);

/* 重新排序 mall 不移動標記 */
const reordered = [before[2], before[0], before[1]];
before.forEach(function (mall, i) {
  mall.stores.forEach(function (store) {
    const j = reordered.indexOf(mall);
    assert.strictEqual(
      shopWantStoreKey(mall.place, i, store),
      shopWantStoreKey(mall.place, j, store),
      '重新排序 mall 後想逛標記不移動'
    );
  });
});

/* 同店名同樓層但不同 placeId → key 不得碰撞 */
assert.notStrictEqual(
  shopWantStoreKey(AEON, 0, MUJI),
  shopWantStoreKey(ARIO, 2, MUJI),
  '同店名同樓層存在於兩個 placeId 時,兩者 key 不碰撞'
);

/* 刪除其中一家不影響另一家 */
(function () {
  const wants = {};
  wants[shopWantStoreKey(AEON, 0, MUJI)] = true;
  wants[shopWantStoreKey(ARIO, 2, MUJI)] = true;
  delete wants[shopWantStoreKey(AEON, 0, MUJI)];
  assert.strictEqual(wants[shopWantStoreKey(ARIO, 2, MUJI)], true, '刪除一家的標記不影響另一家');
  assert.strictEqual(Object.keys(wants).length, 1);
})();

/* 特殊字元不得造成碰撞或切斷。分隔符 ':' 必須被編碼。 */
(function () {
  const tricky = ['a_b', "a'b", 'a"b', 'a&b', 'a<b', 'a:b', '1F:x'];
  const keys = tricky.map(function (name) { return shopWantStoreKey(AEON, 0, { floor: '1F', name: name }); });
  assert.strictEqual(new Set(keys).size, tricky.length, '含特殊字元的店名彼此不碰撞');
  keys.forEach(function (key) {
    assert.strictEqual(key.split(':').length, 4, 'key 必須恰好切成 4 段 —— 店名內的冒號已被編碼');
  });
  /* 「樓層 1F:x + 店名 y」不得與「樓層 1F + 店名 x:y」碰撞 */
  assert.notStrictEqual(
    shopWantStoreKey(AEON, 0, { floor: '1F:x', name: 'y' }),
    shopWantStoreKey(AEON, 0, { floor: '1F', name: 'x:y' }),
    '樓層與店名的邊界不得因冒號而混淆'
  );
})();

/* ================= 二、舊資料轉換 ================= */

const oldKey = function (mi, store) { return 'w_' + mi + '_' + store.floor + '_' + store.name; };

/* 唯一候選 → 正確轉成 stable key */
(function () {
  const result = migrateShopWantKeys({ [oldKey(1, ONLY_HONDORI)]: true }, after);
  assert.deepStrictEqual(Object.keys(result.wants), [shopWantStoreKey(HONDORI, 2, ONLY_HONDORI)],
    '唯一候選轉成該候選的 stable key,而不是「目前同一 index 的 placeId」');
  assert.strictEqual(result.migrated, 1);
  assert.strictEqual(result.dropped, 0);
  assert.strictEqual(result.changed, true);
})();

/* 多候選 → 不猜測,移除 */
(function () {
  const result = migrateShopWantKeys({ [oldKey(0, MUJI)]: true }, after);
  assert.deepStrictEqual(plain(result.wants), {}, '多候選時不得猜測,也不得依目前 mall index 決定');
  assert.strictEqual(result.migrated, 0);
  assert.strictEqual(result.dropped, 1);
})();

/* 無候選 → 不得產生任何 stable key */
(function () {
  const result = migrateShopWantKeys({ 'w_0_9F_不存在的店': true }, after);
  assert.deepStrictEqual(plain(result.wants), {}, '無候選時不得產生錯誤的 stable key');
  assert.strictEqual(result.dropped, 1);
})();

/* 轉換後不殘留 index 型 key */
(function () {
  const result = migrateShopWantKeys({
    [oldKey(1, ONLY_HONDORI)]: true,
    [oldKey(0, MUJI)]: true,
    [oldKey(0, UNIQLO)]: true,
  }, after);
  Object.keys(result.wants).forEach(function (key) {
    assert(!/^w_\d+_/.test(key), '轉換後不得殘留 w_<index>_ 型 key:' + key);
    assert(key.indexOf('w2:') === 0, '轉換後的 key 一律為 w2 格式:' + key);
  });
  assert.strictEqual(result.migrated, 2, 'BEAMS 與 UNIQLO 唯一,無印良品模糊');
  assert.strictEqual(result.dropped, 1);
})();

/* 冪等:重跑結果完全相同,且不再宣稱有變更 */
(function () {
  const first = migrateShopWantKeys({
    [oldKey(1, ONLY_HONDORI)]: true,
    [oldKey(0, MUJI)]: true,
  }, after);
  const second = migrateShopWantKeys(first.wants, after);
  assert.deepStrictEqual(second.wants, first.wants, '重跑轉換結果不變');
  assert.strictEqual(second.changed, false, '第二次執行不得再宣稱資料有變更(提示才不會重複出現)');
  assert.strictEqual(second.migrated, 0);
  assert.strictEqual(second.dropped, 0);
})();

/* 非 w_ 開頭的既有 key 原樣保留(settings-backup-ux 的 S001／S002 依賴此行為) */
(function () {
  const result = migrateShopWantKeys({ S001: true, 'w2:pP001:1F:x': true }, after);
  assert.strictEqual(result.wants.S001, true, '無法辨識的 key 原樣保留');
  assert.strictEqual(result.wants['w2:pP001:1F:x'], true, '已是新格式的 key 原樣保留');
  assert.strictEqual(result.changed, false, '沒有舊格式 key 時不算變更');
})();

/* ================= 三、runtime 不得再用 mi 判斷想逛 ================= */

(function () {
  /* 全域不變式:整個 index.html 不得再有任何一處自行拼接索引型 key。
     刻意不用 extractFunction 取 renderShopResults —— 該函式含 `/'/g` 這種帶引號的
     正則字面值,tests/support/source.js 的擷取器明載不處理(既有限制,非本次造成)。 */
  assert(html.indexOf("'w_'+") < 0, 'index.html 不得再有任何一處自行拼接 w_<index>_ key');

  const start = html.indexOf('function renderShopResults(');
  const end = html.indexOf('function isSupportedPersonalStateVersion(', start);
  assert(start >= 0 && end > start, 'renderShopResults 區段可定位');
  const source = html.slice(start, end);
  /* 不鎖死呼叫次數 —— 新增渲染模式時次數本來就會變(想逛模式即是)。
     真正的不變式是上面那條「全檔不得自行拼接 w_<index>_」;這裡只確認
     各讀寫點確實走 helper,而不是有人繞過去。 */
  const uses = (source.match(/shopWantStoreKey\(/g) || []).length;
  assert(uses >= 6, '各讀寫點全部走 shopWantStoreKey,實際:' + uses);

  /* 展開狀態的 key 與 store want key 用途不同,必須改名以免混淆 */
  assert(html.indexOf('function shopWantListStateKey(') > 0, '展開狀態 key 已更名為 shopWantListStateKey');
  assert(html.indexOf('function shopWantKey(') < 0, '含糊的 shopWantKey 不得留下');
})();

console.log('shop want stable key tests passed');
