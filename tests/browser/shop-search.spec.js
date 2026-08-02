/* 購物頁:搜尋結果與比對範圍(2026-08-02)
   ============================================================
   實測(v81):搜尋 UNIQLO 會渲染 5 個購物地點標題、2 筆命中、**3 塊「找不到」空殼**;
   完全查無結果時是 5 塊「找不到」,而全域的「目前沒有符合條件」永遠不出現 ——
   因為搜尋分支的 rendered++ 是無條件執行的。
   比對範圍也只有 s.name,輸入分類(如「服飾」)找不到任何東西,即使每一列都顯示分類。
   ============================================================ */
const { test, expect } = require('@playwright/test');
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
  await page.evaluate(() => {
    localStorage.removeItem('trip_shop_wants');
    switchView('shop');
  });
});

test('search renders only malls that actually match', async ({ page }) => {
  const result = await page.evaluate(() => {
    shopQ('UNIQLO');
    renderShopResults(); // 略過 debounce,直接驗渲染結果
    const notFoundBlocks = Array.from(document.querySelectorAll('.empty-state'))
      .filter((e) => /找不到/.test(e.textContent)).length;
    return {
      mallBlocks: document.querySelectorAll('.shop-mall').length,
      matchedRows: document.querySelectorAll('.store-row').length,
      notFoundBlocks,
    };
  });
  expect(result.matchedRows).toBeGreaterThan(0);
  expect(result.mallBlocks).toBeLessThanOrEqual(result.matchedRows);
  expect(result.notFoundBlocks).toBe(0);
});

test('a search with no hits shows exactly one global empty state', async ({ page }) => {
  const result = await page.evaluate(() => {
    shopQ('zzzznotarealstore');
    renderShopResults();
    return {
      mallBlocks: document.querySelectorAll('.shop-mall').length,
      emptyStates: document.querySelectorAll('#shopResults .empty-state').length,
      text: document.getElementById('shopResults').textContent,
    };
  });
  expect(result.mallBlocks).toBe(0);
  expect(result.emptyStates).toBe(1);
  expect(result.text).toContain('找不到「zzzznotarealstore」');
});

test('search matches store categories, not just names', async ({ page }) => {
  const result = await page.evaluate(() => {
    const cat = shopMalls()
      .map((m) => m.stores.find((s) => s.cat))
      .filter(Boolean)[0].cat;
    shopQ(cat);
    renderShopResults();
    return { cat, rows: document.querySelectorAll('.store-row').length };
  });
  expect(result.rows).toBeGreaterThan(0);
});

test('typing does not re-render on every keystroke', async ({ page }) => {
  const renders = await page.evaluate(async () => {
    let count = 0;
    const real = window.renderShopResults;
    window.renderShopResults = function () { count++; return real.apply(this, arguments); };
    'UNIQLO'.split('').forEach((_, i) => shopQ('UNIQLO'.slice(0, i + 1)));
    const immediate = count;
    await new Promise((r) => setTimeout(r, 400));
    const settled = count;
    window.renderShopResults = real;
    return { immediate, settled };
  });
  expect(renders.immediate).toBe(0);
  expect(renders.settled).toBe(1);
});
