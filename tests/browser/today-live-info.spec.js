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

/* ---------- 次要資訊收合 ---------- */

/* 常駐:交通／停車／營業 —— 回答「到得了嗎、開著嗎」,抵達前就要看。
   收合:付款／提醒 —— 抵達後才需要的細節。
   (原始需求還有「依當下情境動態調整優先順序」,因判準未定義,不在本批。) */
/* 這個 fixture 的下一站本身沒有交通／付款／備註欄位(實測 .nx-ticket-lines 是空的),
   所以由測試自己種下資料,而不是賭 fixture 剛好有。 */
async function seedNextStopMeta(page) {
  return page.evaluate(() => {
    switchView('today');
    const dayIndex = findToday();
    const day = DB.trip.days[dayIndex];
    const pick = pickNextStop((day.items || []).filter(isTripCheckableItem),
      getDayProgress(day, dayIndex), getChecks(), currentMinutes(), { day, dayIndex });
    pick.item.move = '開車 15 分鐘';        /* 常駐:交通 */
    pick.item.note = '記得帶折價券';          /* 收合:提醒 */
    renderToday();
    return pick.item.id;
  });
}

test('payment and notes are collapsed behind a disclosure, transport is not', async ({ page }) => {
  await seedNextStopMeta(page);

  const layout = await page.evaluate(() => {
    const card = document.querySelector('#view-today .nx-ticket');
    const details = card.querySelector('.nx-more');
    const outside = card.querySelector('.nx-ticket-lines').cloneNode(true);
    const clonedDetails = outside.querySelector('.nx-more');
    if (clonedDetails) clonedDetails.remove();
    return {
      hasDetails: !!details,
      openByDefault: details ? details.open : null,
      outsideText: outside.textContent.replace(/\s+/g, ' ').trim(),
      insideText: details ? details.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });

  expect(layout.hasDetails).toBe(true);
  expect(layout.openByDefault).toBe(false);
  /* 交通留在外面常駐 */
  expect(layout.outsideText).toContain('交通');
  expect(layout.outsideText).not.toContain('提醒');
  /* 提醒收進可展開區塊 */
  expect(layout.insideText).toContain('提醒');
  expect(layout.insideText).toContain('記得帶折價券');
});

test('the disclosure is absent when there is neither payment nor note', async ({ page }) => {
  const absent = await page.evaluate(() => {
    /* 把今天下一站的付款與備註都清掉 */
    const day = DB.trip.days[findToday()];
    (day.items || []).forEach((it) => { it.note = ''; });
    Object.keys(DB.places || {}).forEach((k) => { DB.places[k].pay = ''; DB.places[k].note = ''; });
    Object.keys(DB.rests || {}).forEach((k) => { DB.rests[k].pay = ''; DB.rests[k].note = ''; });
    renderToday();
    const card = document.querySelector('#view-today .nx-ticket');
    return card ? !card.querySelector('.nx-more') : null;
  });
  expect(absent).toBe(true);
});

test('expanding the disclosure survives a re-render', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('today');
    const details = document.querySelector('#view-today .nx-more');
    if (!details) return { skipped: true };
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    renderToday();
    const after = document.querySelector('#view-today .nx-more');
    return { skipped: false, stillOpen: after ? after.open : null };
  });
  if (!result.skipped) expect(result.stillOpen).toBe(true);
});

/* ---------- 卡片內的控制項不得觸發整張卡的導覽 ---------- */

/* 真機回饋:點「其他資訊」會直接跳進行程分頁。
   成因是 .nx-ticket-main 本身是 role="button" + onclick="openTripItem(...)",
   而我把 <details> 放進了它的 .nx-ticket-lines 裡 —— 點 summary 展開之後,
   click 繼續往上冒泡到整張卡的 onclick。 */
test('expanding the details does not navigate to the trip tab', async ({ page }) => {
  await seedNextStopMeta(page);

  const result = await page.evaluate(() => {
    switchView('today');
    const before = curView;
    const summary = document.querySelector('#view-today .nx-more-summary');
    summary.click();
    return {
      before,
      after: curView,
      detailsOpen: document.querySelector('#view-today .nx-more').open,
    };
  });

  expect(result.before).toBe('today');
  expect(result.detailsOpen).toBe(true);
  expect(result.after).toBe('today');
});

/* 根因層級的保護,取代逐一列舉個案:整張卡的 role="button" 內不得再有可聚焦的
   互動元素。巢狀互動控制項在語意上無效 —— 冒泡會誤觸整張卡的導覽,鍵盤 tab 會
   落進一個「按鈕裡的按鈕」,螢幕閱讀器也讀不出正確的角色。
   日後若有人再往卡片內塞控制項(例如 MAPCODE),這條會直接紅。 */
test('the openable card contains no nested focusable controls', async ({ page }) => {
  await seedNextStopMeta(page);
  const nested = await page.evaluate(() => {
    const main = document.querySelector('#view-today .nx-ticket-main[role="button"]');
    if (!main) return null;
    return Array.from(main.querySelectorAll('a[href],button,summary,details,[tabindex],[role="button"]'))
      .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
  });
  expect(nested).toEqual([]);
});
