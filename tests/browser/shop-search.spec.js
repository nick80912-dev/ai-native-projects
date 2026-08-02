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

/* ---------- 一鍵清除搜尋 ---------- */

test('a clear button appears only while the search box has text', async ({ page }) => {
  const states = await page.evaluate(async () => {
    renderShop();
    const input = document.getElementById('shopSearchInput');
    const read = () => {
      const btn = document.getElementById('shopSearchClear');
      return { exists: !!btn, hidden: btn ? btn.hidden : null };
    };
    const empty = read();
    input.value = 'UNI';
    shopQ(input.value);
    const typed = read();
    /* 只有空白字元也算「有文字」—— 使用者仍然需要清掉它 */
    input.value = '   ';
    shopQ(input.value);
    const spaces = read();
    return { empty, typed, spaces };
  });

  expect(states.empty.exists).toBe(true);
  expect(states.empty.hidden).toBe(true);
  expect(states.typed.hidden).toBe(false);
  expect(states.spaces.hidden).toBe(false);
});

test('the clear button wipes the search immediately and returns focus', async ({ page }) => {
  const result = await page.evaluate(() => {
    renderShop();
    const input = document.getElementById('shopSearchInput');
    input.value = 'UNIQLO';
    shopQ(input.value);
    renderShopResults();                     /* 略過 debounce,先進入已搜尋狀態 */
    const searching = {
      malls: document.querySelectorAll('.shop-mall').length,
      rows: document.querySelectorAll('.store-row').length,
    };

    document.getElementById('shopSearchClear').click();
    /* 立即檢查:清除不該還要再等 debounce */
    const cleared = {
      value: input.value,
      query: _shopQ,
      malls: document.querySelectorAll('.shop-mall').length,
      rows: document.querySelectorAll('.store-row').length,
      btnHidden: document.getElementById('shopSearchClear').hidden,
      focused: document.activeElement === input,
    };
    return { searching, cleared };
  });

  expect(result.searching.rows).toBeGreaterThan(0);
  expect(result.cleared.value).toBe('');
  expect(result.cleared.query).toBe('');
  expect(result.cleared.btnHidden).toBe(true);
  expect(result.cleared.focused).toBe(true);
  /* 完整清單回來了,而且是同步的 */
  expect(result.cleared.rows).toBeGreaterThan(result.searching.rows);
  expect(result.cleared.malls).toBeGreaterThanOrEqual(result.searching.malls);
});

test('a pending debounced render cannot resurrect the cleared query', async ({ page }) => {
  const after = await page.evaluate(async () => {
    renderShop();
    const input = document.getElementById('shopSearchInput');
    input.value = 'UNIQLO';
    shopQ(input.value);                      /* 排程了一次 debounce 重繪 */
    document.getElementById('shopSearchClear').click();
    await new Promise((r) => setTimeout(r, 400));   /* 等 debounce 視窗過去 */
    return {
      value: input.value,
      query: _shopQ,
      rows: document.querySelectorAll('.store-row').length,
      btnHidden: document.getElementById('shopSearchClear').hidden,
    };
  });
  expect(after.value).toBe('');
  expect(after.query).toBe('');
  expect(after.btnHidden).toBe(true);
  expect(after.rows).toBeGreaterThan(2);
});

test('the clear button is an accessible, tappable control', async ({ page }) => {
  const meta = await page.evaluate(() => {
    renderShop();
    const input = document.getElementById('shopSearchInput');
    input.value = 'UNIQLO';
    shopQ(input.value);
    const btn = document.getElementById('shopSearchClear');
    const r = btn.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    return {
      tag: btn.tagName,
      type: btn.getAttribute('type'),
      label: btn.getAttribute('aria-label'),
      w: Math.round(r.width), h: Math.round(r.height),
      insideInput: r.right <= i.right + 1 && r.left >= i.left,
      /* 輸入的文字不得鑽到 X 底下 */
      textClearsButton: parseFloat(getComputedStyle(input).paddingRight) >= r.width,
    };
  });
  expect(meta.tag).toBe('BUTTON');
  expect(meta.type).toBe('button');
  expect(meta.label).toBeTruthy();
  expect(meta.w).toBeGreaterThanOrEqual(44);
  expect(meta.h).toBeGreaterThanOrEqual(44);
  expect(meta.insideInput).toBe(true);
  expect(meta.textClearsButton).toBe(true);
});
