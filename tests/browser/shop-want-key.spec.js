/* 想逛標記的穩定 key —— 真實瀏覽器行為
   ============================================================
   Node 測試鎖的是 key 產生器與轉換規則本身;本檔補的是「實際點下去會寫進什麼」——
   確認 renderShopResults 的六個讀寫點與 storeRow 的 onclick 真的都走 stable key,
   而不是只有 helper 正確、呼叫端仍在用索引。
   ============================================================ */
const { test, expect } = require('./support/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T09:30:00+09:00');
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
});

test('marking a store writes a place-id keyed want, never an index keyed one', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('shop');
    const malls = shopMalls();
    const mall = malls.filter((m) => m.stores.length)[0];
    const index = malls.indexOf(mall);
    const store = mall.stores[0];

    document.querySelector('.floor-head').click();
    const row = document.querySelector('.floor-body.open .store-row');
    const onclick = row.getAttribute('onclick');
    row.click();

    const wants = JSON.parse(localStorage.getItem('trip_shop_wants') || '{}');
    return {
      keys: Object.keys(wants),
      expected: shopWantStoreKey(mall.place, index, store),
      placeId: mall.place.placeId,
      onclickUsesStableKey: onclick.indexOf('w2:') > 0,
    };
  });

  expect(result.keys.length).toBe(1);
  expect(result.keys[0]).toMatch(/^w2:p/);
  expect(result.keys[0]).not.toMatch(/^w_\d+_/);
  expect(result.keys[0]).toContain(encodeURIComponent(result.placeId));
  expect(result.onclickUsesStableKey).toBe(true);
});

test('legacy index keys are migrated once and ambiguous ones are dropped with a single notice', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('shop');
    const malls = shopMalls();

    /* 唯一候選:只存在於一個 place 的店 */
    const counts = {};
    malls.forEach((m) => m.stores.forEach((s) => {
      const tail = s.floor + '_' + s.name;
      counts[tail] = (counts[tail] || 0) + 1;
    }));
    let unique = null;
    let ambiguous = null;
    malls.forEach((m, i) => m.stores.forEach((s) => {
      const tail = s.floor + '_' + s.name;
      if (!unique && counts[tail] === 1) unique = { tail, place: m.place, index: i, store: s };
      if (!ambiguous && counts[tail] > 1) ambiguous = { tail };
    }));

    const seeded = { ['w_99_' + unique.tail]: true };
    if (ambiguous) seeded['w_98_' + ambiguous.tail] = true;
    localStorage.setItem('trip_shop_wants', JSON.stringify(seeded));

    const toasts = [];
    const realToast = window.toast;
    window.toast = function (message) { toasts.push(String(message)); };

    renderShopResults();
    const afterFirst = JSON.parse(localStorage.getItem('trip_shop_wants') || '{}');
    renderShopResults();
    renderShopResults();
    const afterRepeat = JSON.parse(localStorage.getItem('trip_shop_wants') || '{}');

    window.toast = realToast;
    return {
      afterFirst: Object.keys(afterFirst),
      afterRepeat: Object.keys(afterRepeat),
      expectedUnique: shopWantStoreKey(unique.place, unique.index, unique.store),
      hadAmbiguous: !!ambiguous,
      toasts,
    };
  });

  /* 舊 index 99／98 完全不對應目前的排序,轉換必須靠「樓層＋店名」而不是索引 */
  expect(result.afterFirst).toContain(result.expectedUnique);
  expect(result.afterFirst.some((k) => /^w_\d+_/.test(k))).toBe(false);

  if (result.hadAmbiguous) {
    expect(result.afterFirst.length).toBe(1);
    expect(result.toasts.filter((t) => t.includes('無法安全對應')).length).toBe(1);
  }

  /* 冪等:重跑兩次資料不變,提示也不再出現 */
  expect(result.afterRepeat).toEqual(result.afterFirst);
  expect(result.toasts.filter((t) => t.includes('無法安全對應')).length).toBeLessThanOrEqual(1);
});
