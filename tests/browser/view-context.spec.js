/* 操作脈絡保存(2026-08-02,v82)
   ============================================================
   實測(改版前):switchView() 結尾無條件 window.scrollTo({top:0}),
   所以每次切分頁都回頂,切回來也回不到原位。

   注意 html{scroll-behavior:smooth}:測試裡設定 scrollTop 後必須等它停,
   或直接驗證實作有用 behavior:'instant'。本檔一律等到位置穩定再斷言。
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
});

/* 捲到指定位置並等它真的停下來(避開 CSS smooth 的動畫尾巴) */
async function scrollTo(page, y) {
  await page.evaluate((target) => {
    const doc = document.scrollingElement;
    doc.scrollTop = target;
  }, y);
  await page.waitForFunction((target) => {
    const doc = document.scrollingElement;
    return Math.abs(doc.scrollTop - Math.min(target, doc.scrollHeight - doc.clientHeight)) <= 2;
  }, y, { timeout: 3000 });
  return page.evaluate(() => Math.round(document.scrollingElement.scrollTop));
}

test('each tab keeps its own scroll position across switches', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  const tripY = await scrollTo(page, 600);
  expect(tripY).toBeGreaterThan(100);

  await page.evaluate(() => switchView('shop'));
  const shopTop = await page.evaluate(() => Math.round(document.scrollingElement.scrollTop));
  /* 換到沒去過的分頁應該在頂端,而不是沿用上一個分頁的位置 */
  expect(shopTop).toBe(0);

  const shopY = await scrollTo(page, 400);

  /* 切回行程頁:回到原本的位置 */
  await page.evaluate(() => switchView('trip'));
  await page.waitForFunction((y) => Math.abs(document.scrollingElement.scrollTop - y) <= 4, tripY, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeGreaterThan(tripY - 5);

  /* 再切回購物頁:也回到原本的位置 */
  await page.evaluate(() => switchView('shop'));
  await page.waitForFunction((y) => Math.abs(document.scrollingElement.scrollTop - y) <= 4, shopY, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeGreaterThan(shopY - 5);
});

test('tapping the tab you are already on returns to the top', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await scrollTo(page, 600);

  await page.evaluate(() => switchView('trip'));
  await page.waitForFunction(() => document.scrollingElement.scrollTop <= 2, null, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeLessThanOrEqual(2);
});

test('a saved position taller than the new page is clamped, never invalid', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await scrollTo(page, 900);

  /* 讓行程頁變短:切到只剩少數項目的一天,再切回來 */
  const result = await page.evaluate(async () => {
    switchView('shop');
    /* 直接把保存值灌成遠超過任何頁面高度的數字 */
    viewUiState.trip.scrollY = 999999;
    switchView('trip');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const doc = document.scrollingElement;
    return {
      scrollTop: Math.round(doc.scrollTop),
      maxScroll: Math.round(doc.scrollHeight - doc.clientHeight),
    };
  });

  expect(result.scrollTop).toBeLessThanOrEqual(result.maxScroll);
  expect(result.scrollTop).toBeGreaterThanOrEqual(0);
});

test('the transient UI state never reaches localStorage or the backup', async ({ page }) => {
  const leaked = await page.evaluate(() => {
    switchView('trip');
    document.scrollingElement.scrollTop = 500;
    switchView('shop');
    const keys = Object.keys(localStorage);
    const dump = keys.map((k) => localStorage.getItem(k) || '').join('|');
    return {
      keyLeak: keys.filter((k) => /viewUi|scroll/i.test(k)),
      valueLeak: /scrollY/.test(dump),
      backupLeak: /scrollY|viewUiState/.test(personalStateJson()),
    };
  });
  expect(leaked.keyLeak).toEqual([]);
  expect(leaked.valueLeak).toBe(false);
  expect(leaked.backupLeak).toBe(false);
});
