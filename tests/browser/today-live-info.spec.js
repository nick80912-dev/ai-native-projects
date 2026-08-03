/* Today 即時資訊(2026-08-02,v84)
   ============================================================
   讓 Today 回答「現在要幹嘛」而不只是「行程有什麼」。

   下一站待買為什麼沒有歧義:採買項目的 stopRef **就是站點 id**,
   與下一站卡片的 it.id 是 1:1 直接 join —— 不需要經由商場推導,
   也就沒有「一個商場對多個不同日期站點」的問題。
   ============================================================ */
const { test, expect } = require('@playwright/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T13:30:00+09:00');
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
});

/* 在「下一站」那個站點上掛幾筆待買 */
async function seedForNextStop(page, names) {
  return page.evaluate((names) => {
    switchView('today');
    const day = DB.trip.days[findToday()];
    const pick = pickNextStop((day.items || []).filter(isTripCheckableItem),
      getDayProgress(day, findToday()), getChecks(), currentMinutes(), { day, dayIndex: findToday() });
    const stopRef = pick.item.id;
    names.forEach((name) => {
      const item = shoppingListStore.add({ name, category: '其他', quantity: 1, unit: '個' });
      shoppingListStore.update(item.id, { stopRef });
    });
    renderToday();
    return { stopRef, stopName: pick.item.place || pick.item.act };
  }, names);
}

test('the next-stop card shows how many things to buy there, with a summary', async ({ page }) => {
  const seeded = await seedForNextStop(page, ['白桃果凍', '桃子酒', '吉備糰子']);

  const card = await page.evaluate(() => {
    const el = document.querySelector('#view-today .nx-buy');
    return el ? { text: el.textContent.replace(/\s+/g, ' ').trim(), html: el.outerHTML } : null;
  });

  expect(card).not.toBeNull();
  expect(card.text).toContain('3');
  /* 摘要要看得到品名,不是只有一個數字 */
  expect(card.text).toContain('白桃果凍');
});

test('the buy block is absent when the next stop has nothing to buy', async ({ page }) => {
  const absent = await page.evaluate(() => {
    switchView('today');
    return !document.querySelector('#view-today .nx-buy');
  });
  expect(absent).toBe(true);
});

test('completed items do not count toward the next stop', async ({ page }) => {
  await seedForNextStop(page, ['甲', '乙']);
  const after = await page.evaluate(() => {
    const pending = shoppingListStore.all().filter((i) => !i.done && i.stopRef);
    shoppingListStore.update(pending[0].id, { done: true, completedAt: '2026-10-18T04:00:00.000Z' });
    renderToday();
    const el = document.querySelector('#view-today .nx-buy');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  expect(after).toContain('1');
  expect(after).not.toContain('甲、乙');
});

test('tapping the buy block opens the shopping list at that stop', async ({ page }) => {
  const seeded = await seedForNextStop(page, ['白桃果凍', '桃子酒']);

  const result = await page.evaluate(async (stopRef) => {
    document.querySelector('#view-today .nx-buy').click();
    await new Promise((r) => setTimeout(r, 400));
    const overlay = document.getElementById('shoppingListOverlay');
    const group = document.getElementById('shopgroup_' + cssId(stopRef));
    return {
      overlayOpen: !!overlay,
      groupExists: !!group,
      groupText: group ? group.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
    };
  }, seeded.stopRef);

  expect(result.overlayOpen).toBe(true);
  expect(result.groupExists).toBe(true);
  expect(result.groupText).toContain('白桃果凍');
});
