/* 店家列的鍵盤操作(2026-08-02)
   ============================================================
   Node 測試鎖的是 storeRow() 產生的標記;本檔驗的是「真的按下去會怎樣」——
   能不能用鍵盤聚焦、Space 有沒有切換、就地更新後 aria-checked 是否同步、
   焦點看不看得見。
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
    document.querySelector('.floor-head').click();
  });
});

test('a store row can be focused and toggled with the keyboard', async ({ page }) => {
  const row = page.locator('.floor-body.open .store-row').first();
  await expect(row).toHaveAttribute('role', 'checkbox');
  await expect(row).toHaveAttribute('aria-checked', 'false');

  await row.focus();
  expect(await page.evaluate(() => document.activeElement.classList.contains('store-row'))).toBe(true);

  await page.keyboard.press(' ');
  await expect(row).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('trip_shop_wants') || '{}')).length)).toBe(1);

  await page.keyboard.press(' ');
  await expect(row).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('trip_shop_wants') || '{}')).length)).toBe(0);
});

test('Enter also activates the row, matching the shared keyboard helper', async ({ page }) => {
  const row = page.locator('.floor-body.open .store-row').first();
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(row).toHaveAttribute('aria-checked', 'true');
});

/* 就地更新路徑必須同步 aria-checked —— 否則畫面打勾了,語音仍說未勾選 */
test('the in-place update keeps aria-checked in sync', async ({ page }) => {
  const result = await page.evaluate(() => {
    const rows = document.querySelectorAll('.floor-body.open .store-row');
    rows[0].click();                       /* 第一次:想逛清單出現 → 重繪 */
    const live = document.querySelectorAll('.floor-body.open .store-row');
    live[1].click();                       /* 第二次:就地更新 */
    return {
      sameNode: document.querySelectorAll('.floor-body.open .store-row')[1] === live[1],
      ariaChecked: live[1].getAttribute('aria-checked'),
      visuallyChecked: live[1].querySelector('.st-chk').classList.contains('on'),
    };
  });
  expect(result.sameNode).toBe(true);
  expect(result.ariaChecked).toBe('true');
  expect(result.visuallyChecked).toBe(true);
});

/* 用真的鍵盤移動焦點:getComputedStyle 只接受**偽元素**,傳 ':focus-visible'
   這個偽類別是無效的,量不到樣式。從樓層標題按 Tab 進到第一列,順便驗 tab 順序。 */
test('keyboard focus is visible', async ({ page }) => {
  await page.locator('.floor-head').first().focus();
  await page.keyboard.press('Tab');

  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return {
      isStoreRow: el.classList.contains('store-row'),
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
    };
  });

  expect(focused.isStoreRow).toBe(true);
  expect(focused.focusVisible).toBe(true);
  expect(parseFloat(focused.outlineWidth)).toBeGreaterThan(0);
  expect(focused.outlineStyle).not.toBe('none');
});

/* 需要重繪的那一次(該地點的第一次標記)會換掉整個 DOM。若不把焦點放回去,
   鍵盤使用者連按第二下 Space 就沒有任何作用 —— 實測確實如此。 */
test('keyboard focus survives the re-render so repeated presses keep working', async ({ page }) => {
  const row = page.locator('.floor-body.open .store-row').first();
  await row.focus();

  await page.keyboard.press(' ');   /* 第一次:想逛清單出現 → 重繪 */
  const afterFirst = await page.evaluate(() => ({
    stillOnARow: document.activeElement.classList.contains('store-row'),
    key: document.activeElement.getAttribute('data-want'),
    checked: document.activeElement.getAttribute('aria-checked'),
  }));
  expect(afterFirst.stillOnARow).toBe(true);
  expect(afterFirst.checked).toBe('true');

  await page.keyboard.press(' ');   /* 第二次必須真的取消,而不是打在空氣上 */
  const afterSecond = await page.evaluate(() => ({
    checked: document.activeElement.getAttribute('aria-checked'),
    stored: Object.keys(JSON.parse(localStorage.getItem('trip_shop_wants') || '{}')).length,
  }));
  expect(afterSecond.checked).toBe('false');
  expect(afterSecond.stored).toBe(0);
});

test('the check glyph is hidden from assistive tech', async ({ page }) => {
  await expect(page.locator('.floor-body.open .store-row .st-chk').first())
    .toHaveAttribute('aria-hidden', 'true');
});
