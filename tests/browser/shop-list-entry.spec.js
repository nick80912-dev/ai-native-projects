/* 購物頁的採買清單入口(2026-08-02)
   ============================================================
   購物頁原本對採買清單零入口,只能從首頁或設定頁進去。

   兩個關鍵前提(已實測):
   1. openShoppingList() 建立疊在 body 上的 overlay,**不切換 view**,curView 不變。
      因此「從哪裡進去就回哪裡」是天然成立的 —— 使用者根本沒有離開過原本的頁面。
      真正的風險是日後有人為了實作「返回」去動 curView,反而把正確行為改壞,
      故本檔以回歸測試鎖住,而非新增程式碼。
   2. 全檔沒有任何採買流程呼叫 renderAll()。在 overlay 內完成一項再關閉,
      購物頁的數字會停在舊值 —— 這個必須處理。
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

async function seedItems(page, pending, done) {
  return page.evaluate(({ pending, done }) => {
    const items = [];
    for (let i = 0; i < pending; i++) {
      items.push(shoppingListStore.add({ name: '待買' + i, category: '其他', quantity: 1, unit: '個' }));
    }
    for (let i = 0; i < done; i++) {
      const item = shoppingListStore.add({ name: '已買' + i, category: '其他', quantity: 1, unit: '個' });
      shoppingListStore.update(item.id, { done: true, completedAt: '2026-10-18T01:00:00.000Z' });
    }
    switchView('shop');
    return shoppingListStore.all().filter((it) => !it.done).length;
  }, { pending, done });
}

test('the shop page links to the shopping list and badges the unfinished count', async ({ page }) => {
  const expected = await seedItems(page, 3, 2);
  expect(expected).toBe(3);

  const entry = await page.evaluate(() => {
    renderShop();
    const button = document.querySelector('#view-shop .shop-list-entry');
    const badge = document.getElementById('shopListCount');
    return {
      exists: !!button,
      label: button && button.textContent.replace(/\s+/g, ' ').trim(),
      badge: badge && badge.textContent.trim(),
      badgeHidden: badge ? badge.hidden : null,
    };
  });

  expect(entry.exists).toBe(true);
  expect(entry.label).toContain('採買清單');
  expect(entry.badge).toBe('3');
  expect(entry.badgeHidden).toBe(false);

  await page.evaluate(() => document.querySelector('#view-shop .shop-list-entry').click());
  expect(await page.evaluate(() => !!document.getElementById('shoppingListOverlay'))).toBe(true);
});

test('the badge is hidden when nothing is pending', async ({ page }) => {
  await seedItems(page, 0, 2);
  const badge = await page.evaluate(() => {
    renderShop();
    const el = document.getElementById('shopListCount');
    return { exists: !!el, hidden: el && el.hidden, entryStillThere: !!document.querySelector('.shop-list-entry') };
  });
  expect(badge.entryStillThere).toBe(true);
  expect(badge.hidden).toBe(true);
});

/* 全檔沒有採買流程呼叫 renderAll() —— 不處理的話數字會停在舊值 */
test('completing an item inside the overlay refreshes the shop count on close', async ({ page }) => {
  await seedItems(page, 3, 0);
  const result = await page.evaluate(() => {
    renderShop();
    const before = document.getElementById('shopListCount').textContent.trim();
    openShoppingList();
    const target = shoppingListStore.all().filter((it) => !it.done)[0];
    shoppingListStore.update(target.id, { done: true, completedAt: '2026-10-18T02:00:00.000Z' });
    closeShoppingList();
    return { before, after: document.getElementById('shopListCount').textContent.trim() };
  });
  expect(result.before).toBe('3');
  expect(result.after).toBe('2');
});

/* 兩個入口各自回到原頁 —— 參數化跑兩次 */
for (const entry of ['today', 'shop']) {
  test(`opening the list from ${entry} returns to ${entry} on close`, async ({ page }) => {
    await seedItems(page, 2, 0);
    const result = await page.evaluate((view) => {
      switchView(view);
      const snap = () => ({
        curView,
        navActive: document.querySelector('.tabbar-btn.active').getAttribute('data-view'),
        viewActive: !!document.querySelector('#view-' + view + '.active'),
      });
      const before = snap();
      openShoppingList();
      const during = Object.assign(snap(), { overlay: !!document.getElementById('shoppingListOverlay') });
      closeShoppingList();
      const after = Object.assign(snap(), { overlay: !!document.getElementById('shoppingListOverlay') });
      return { before, during, after };
    }, entry);

    expect(result.before.curView).toBe(entry);
    /* 開啟時底層 view 仍 active —— 沒有離開過 */
    expect(result.during.curView).toBe(entry);
    expect(result.during.viewActive).toBe(true);
    expect(result.during.overlay).toBe(true);
    /* 關閉後與進入前完全相同 */
    expect(result.after).toMatchObject({
      curView: entry,
      navActive: entry,
      viewActive: true,
      overlay: false,
    });
  });
}

/* 防止日後有人為了「實作返回」反而改壞現在正確的行為 */
test('the list open/close helpers never touch view state', async ({ page }) => {
  const source = await page.evaluate(() => ({
    open: window.openShoppingList.toString(),
    close: window.closeShoppingList.toString(),
  }));
  for (const [name, fn] of Object.entries(source)) {
    expect(fn, name + ' 不得切換 view').not.toContain('switchView(');
    expect(fn, name + ' 不得指派 curView').not.toMatch(/curView\s*=[^=]/);
  }
});
