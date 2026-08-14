/* 購物頁:想逛切換的就地更新(2026-08-02)
   ============================================================
   每點一次想逛就重建整份清單(實測約 720 節點全數重建),連帶把篩選列的
   水平捲動位置歸零 —— 捲到右邊某個購物地點再開始標記,位置會一直被拉回去。

   本檔同時鎖住「什麼時候仍然應該重繪」:區塊真的要出現／消失／增減列時重繪
   是正確的,不是缺陷。只有「改幾個字」的情況才必須就地更新。
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
  await page.evaluate(() => {
    localStorage.removeItem('trip_shop_wants');
    switchView('shop');
  });
});


/* 就地更新的邊界:該購物地點的第一次標記會讓「想逛清單」區塊出現,那是真的
   多了一個區塊,交給整份重繪是正確的;第二次之後只是改幾個字,必須就地更新。 */
test('toggling a want updates the row in place without rebuilding the list', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.querySelector('.floor-head').click();

    /* 第一次標記:想逛清單區塊出現 → 允許重繪 */
    document.querySelectorAll('.floor-body.open .store-row')[0].click();

    const rows = document.querySelectorAll('.floor-body.open .store-row');
    const target = rows[1];
    const key = target.getAttribute('data-want');

    const bar = document.getElementById('shopFilterBar');
    bar.scrollLeft = 150;
    const beforeScroll = bar.scrollLeft;
    const beforeNodes = document.getElementById('shopResults').querySelectorAll('*').length;

    target.click();

    return {
      key,
      sameNodeIdentity: document.querySelectorAll('.floor-body.open .store-row')[1] === target,
      checkedAfter: target.querySelector('.st-chk').classList.contains('on'),
      beforeScroll,
      afterScroll: document.getElementById('shopFilterBar').scrollLeft,
      beforeNodes,
      afterNodes: document.getElementById('shopResults').querySelectorAll('*').length,
      storedKeys: Object.keys(JSON.parse(localStorage.getItem('trip_shop_wants') || '{}')),
    };
  });

  expect(result.key).toMatch(/^w2:/);
  expect(result.sameNodeIdentity).toBe(true);
  expect(result.checkedAfter).toBe(true);
  expect(result.afterScroll).toBe(result.beforeScroll);
  expect(result.afterNodes).toBe(result.beforeNodes);
  expect(result.storedKeys).toContain(result.key);
  expect(result.storedKeys.length).toBe(2);
});

/* 第一次標記確實會重繪 —— 這是設計上的邊界,寫成測試以免日後被誤當成缺陷「修掉」 */
test('the first mark in a mall legitimately re-renders because a new block appears', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.querySelector('.floor-head').click();
    const target = document.querySelectorAll('.floor-body.open .store-row')[0];
    const hadWantBox = !!document.querySelector('.want-box');
    target.click();
    return {
      hadWantBox,
      hasWantBoxNow: !!document.querySelector('.want-box'),
      rebuilt: document.querySelectorAll('.floor-body.open .store-row')[0] !== target,
    };
  });
  expect(result.hadWantBox).toBe(false);
  expect(result.hasWantBoxNow).toBe(true);
  expect(result.rebuilt).toBe(true);
});

test('in-place toggle keeps the want total, want-list count and floor count in sync', async ({ page }) => {
  const counts = await page.evaluate(() => {
    const read = () => ({
      total: Number(document.getElementById('shopWantTotal').textContent),
      floor: document.querySelector('.floor-head .fl-n').textContent,
    });
    document.querySelector('.floor-head').click();
    const before = read();
    const row = document.querySelector('.floor-body.open .store-row');
    row.click();
    const afterOn = read();
    row.click();
    const afterOff = read();
    return { before, afterOn, afterOff };
  });

  expect(counts.before.total).toBe(0);
  expect(counts.afterOn.total).toBe(1);
  expect(counts.afterOn.floor).toContain('⭐1');
  expect(counts.afterOff.total).toBe(0);
  expect(counts.afterOff.floor).not.toContain('⭐');
});

test('an open want list still renders correctly when a mark changes', async ({ page }) => {
  const result = await page.evaluate(() => {
    document.querySelector('.floor-head').click();
    const rows = Array.from(document.querySelectorAll('.floor-body.open .store-row'));
    rows[0].click();
    rows[1].click();
    document.querySelector('.want-head').click(); // 展開想逛清單
    const openedCount = document.querySelectorAll('.want-body .store-row').length;
    document.querySelector('.want-body .store-row').click(); // 從想逛清單裡取消一家
    return {
      openedCount,
      afterCount: document.querySelectorAll('.want-body .store-row').length,
      total: Number(document.getElementById('shopWantTotal').textContent),
    };
  });
  expect(result.openedCount).toBe(2);
  expect(result.afterCount).toBe(1);
  expect(result.total).toBe(1);
});
