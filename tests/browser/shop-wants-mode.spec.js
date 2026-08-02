/* 想逛模式(2026-08-02)
   ============================================================
   實測(改版前):標記 2 家店時,想逛頁籤仍渲染 75 列店家、8 個樓層區塊 ——
   `wants` 篩選只決定哪些商場出現,商場內照樣攤開全部樓層與全部店家,
   而唯一只列想逛的 .want-box 還預設收合。

   「全部」與「想逛」是兩種不同閱讀目的:
     全部 = 探索商場,需要樓層結構;想逛 = 執行既定路線,需要快速掃描目標。
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

/* 依實際資料標記,不假設商場數量(離線 fixture 只有 P001 有店家)。
   回傳「應有的順序」= 商場行程順序 → 店家原始順序。 */
async function seedWants(page) {
  return page.evaluate(() => {
    const malls = shopMalls();
    const withStores = malls.filter((m) => m.stores.length);
    /* 刻意挑非字母序、非連續的索引,若實作偷偷 sort 就會露出來 */
    const picks = [[5, 1, 9], [3, 0]];
    const wants = {};
    const expected = [];
    let mallCount = 0;
    withStores.slice(0, 2).forEach((mall, n) => {
      const mi = malls.indexOf(mall);
      const chosen = picks[n].map((i) => mall.stores[i]).filter(Boolean);
      if (!chosen.length) return;
      mallCount++;
      /* 期待順序依 mall.stores 的原始順序,不是挑選的順序 */
      mall.stores.forEach((s) => {
        if (chosen.indexOf(s) < 0) return;
        wants[shopWantStoreKey(mall.place, mi, s)] = true;
        expected.push(s.name);
      });
    });
    localStorage.setItem('trip_shop_wants', JSON.stringify(wants));
    return { expected, total: expected.length, mallCount };
  });
}

test('the wants mode lists only wanted stores, with no floors or want-box', async ({ page }) => {
  const seed = await seedWants(page);

  const all = await page.evaluate(() => {
    setShopPlaceFilter('all');
    return {
      rows: document.querySelectorAll('.store-row').length,
      floors: document.querySelectorAll('.floor').length,
      wantBoxes: document.querySelectorAll('.want-box').length,
    };
  });
  const wants = await page.evaluate(() => {
    setShopPlaceFilter('wants');
    return {
      rows: document.querySelectorAll('.store-row').length,
      floors: document.querySelectorAll('.floor').length,
      wantBoxes: document.querySelectorAll('.want-box').length,
      malls: document.querySelectorAll('.shop-mall').length,
      checked: document.querySelectorAll('.store-row[aria-checked="true"]').length,
    };
  });

  /* 全部模式維持原本的探索版面 */
  expect(all.floors).toBeGreaterThan(0);
  expect(all.rows).toBeGreaterThan(seed.total);

  /* 想逛模式只剩想逛店家 */
  expect(wants.rows).toBe(seed.total);
  expect(wants.checked).toBe(seed.total);
  expect(wants.floors).toBe(0);
  expect(wants.wantBoxes).toBe(0);
  expect(wants.malls).toBe(seed.mallCount);
});

test('wanted stores keep itinerary and sheet order, never alphabetical', async ({ page }) => {
  const seed = await seedWants(page);
  const actual = await page.evaluate(() => {
    setShopPlaceFilter('wants');
    return Array.from(document.querySelectorAll('.store-row .st-n'))
      .map((el) => el.childNodes[0].textContent.trim());
  });
  expect(actual).toEqual(seed.expected);
  /* 反向保護:若實作改成字母排序,上面的 toEqual 才會真的抓到 */
  const alphabetical = seed.expected.slice().sort();
  if (JSON.stringify(alphabetical) !== JSON.stringify(seed.expected)) {
    expect(actual).not.toEqual(alphabetical);
  }
});

test('unchecking removes the row immediately, and the mall section when it empties', async ({ page }) => {
  await seedWants(page);
  const result = await page.evaluate(() => {
    setShopPlaceFilter('wants');
    const before = {
      rows: document.querySelectorAll('.store-row').length,
      malls: document.querySelectorAll('.shop-mall').length,
    };
    /* 取消最後一個商場的第一列 */
    const lastMall = document.querySelectorAll('.shop-mall')[before.malls - 1];
    const firstKey = lastMall.querySelector('.store-row').getAttribute('data-want');
    lastMall.querySelector('.store-row').click();
    const afterOne = {
      rows: document.querySelectorAll('.store-row').length,
      malls: document.querySelectorAll('.shop-mall').length,
      keyStillPresent: Array.from(document.querySelectorAll('.store-row'))
        .some((r) => r.getAttribute('data-want') === firstKey),
    };
    /* 再把最後一個商場剩下的想逛全部取消,該商場區段應整塊消失 */
    let guard = 0;
    while (document.querySelectorAll('.shop-mall').length === before.malls && guard++ < 50) {
      const mall = document.querySelectorAll('.shop-mall')[before.malls - 1];
      const row = mall && mall.querySelector('.store-row');
      if (!row) break;
      row.click();
    }
    const afterAll = { malls: document.querySelectorAll('.shop-mall').length };
    return { before, afterOne, afterAll };
  });

  expect(result.afterOne.rows).toBe(result.before.rows - 1);
  expect(result.afterOne.keyStillPresent).toBe(false);
  expect(result.afterAll.malls).toBe(result.before.malls - 1);
});

test('the empty wants mode explains how to add stores and offers a way back', async ({ page }) => {
  const result = await page.evaluate(() => {
    setShopPlaceFilter('wants');
    const text = document.getElementById('shopResults').textContent;
    const back = document.querySelector('#shopResults .empty-state button');
    return { text, hasBack: !!back, backLabel: back && back.textContent.trim() };
  });
  expect(result.text).toContain('尚未加入想逛店家，可從「全部」頁籤加入');
  expect(result.hasBack).toBe(true);

  await page.evaluate(() => document.querySelector('#shopResults .empty-state button').click());
  const after = await page.evaluate(() => ({
    filter: shopPlaceFilter,
    floors: document.querySelectorAll('.floor').length,
  }));
  expect(after.filter).toBe('all');
  expect(after.floors).toBeGreaterThan(0);
});
