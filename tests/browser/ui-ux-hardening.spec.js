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

test('Today hides the trip day picker and header actions fit without absolute positioning', async ({ page }) => {
  await expect(page.locator('#daybar')).toBeHidden();
  const header = await page.evaluate(() => ({
    titleFlex: getComputedStyle(document.querySelector('.brand .t')).flexGrow,
    actionsPosition: getComputedStyle(document.querySelector('.brand-actions')).position,
    syncHeight: document.getElementById('syncBtn').getBoundingClientRect().height,
    settingsHeight: document.querySelector('.settings-btn').getBoundingClientRect().height,
  }));
  expect(Number(header.titleFlex)).toBeGreaterThan(0);
  expect(header.actionsPosition).toBe('static');
  expect(header.syncHeight).toBeGreaterThanOrEqual(44);
  expect(header.settingsHeight).toBeGreaterThanOrEqual(44);
});

test('settings button renders a themed rounded six-tooth gear', async ({ page }) => {
  const button=page.getByRole('button',{name:'設定'});
  const icon=button.locator('.settings-gear-six');
  await expect(icon).toBeVisible();
  await expect(icon.locator('.settings-gear-tooth')).toHaveCount(6);
  const gear=await icon.evaluate(svg=>({
    size:[svg.getBoundingClientRect().width,svg.getBoundingClientRect().height],
    strokeWidth:getComputedStyle(svg).strokeWidth,
    viewBox:svg.getAttribute('viewBox'),
    radii:Array.from(svg.querySelectorAll('circle')).map(circle=>circle.getAttribute('r')),
    button:[svg.closest('button').getBoundingClientRect().width,svg.closest('button').getBoundingClientRect().height],
    buttonRadius:getComputedStyle(svg.closest('button')).borderRadius,
    stroke:getComputedStyle(svg).stroke,
    color:getComputedStyle(svg.closest('button')).color,
    teeth:Array.from(svg.querySelectorAll('.settings-gear-tooth')).map(line=>({
      transform:line.getAttribute('transform'),
      cap:getComputedStyle(line).strokeLinecap,
    })),
  }));
  /* v80:字符放大到 24px、筆畫收細到 1.75,但 44×44 的按鈕與圓形底不得跟著變 ——
     否則放大的是觸控區而不是看得見的圖示。 */
  expect(gear.size).toEqual([24,24]);
  expect(parseFloat(gear.strokeWidth)).toBe(1.75);
  expect(gear.button).toEqual([44,44]);
  expect(gear.buttonRadius).toBe('50%');
  expect(gear.viewBox).toBe('0 0 24 24');
  expect(gear.radii).toEqual(['6.25','2.35']);
  expect(gear.stroke).toBe(gear.color);
  expect(gear.teeth.map(tooth=>tooth.transform)).toEqual([0,60,120,180,240,300].map(degree=>`rotate(${degree} 12 12)`));
  expect(gear.teeth.every(tooth=>tooth.cap==='round')).toBe(true);
});

test('trip and shopping controls keep car-friendly targets and decision text', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await expect(page.locator('#daybar')).toBeVisible();
  expect(await page.locator('.day-chip').first().evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => switchView('today'));
  const decision = page.locator('.nx-decision-btn').first();
  await expect(decision).toBeVisible();
  expect(await decision.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  await page.evaluate(() => switchView('shop'));
  const filter = page.locator('.shop-filter-btn').first();
  await expect(filter).toBeVisible();
  expect(await filter.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});

/* v80:同區串點的下方決策列會把地點名稱塞進兩顆按鈕(「完成：永旺夢樂城…」)。
   .nx-ticket-low 的第二軌是 auto,跳過鈕的 max-content 會吃掉整列寬度,
   讓 minmax(0,1fr) 的完成鈕被壓到接近 0,標籤於是一個字一行直排。
   量的是真實 view 寬度下的實際 markup。 */
test('a long place name cannot starve the done button', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const name = '永旺夢樂城岡山購物中心四樓無印良品櫃位';
    const ticket = document.createElement('div');
    ticket.className = 'nx-ticket nx-cluster-ticket';
    ticket.innerHTML =
      '<div class="nx-ticket-low">' +
      '<button class="nx-decision-btn done">完成：' + name + '</button>' +
      '<button class="nx-decision-btn skip">跳過：' + name + '</button>' +
      '</div>';
    document.querySelector('.view.active').appendChild(ticket);
    const done = ticket.querySelector('.done').getBoundingClientRect();
    const skip = ticket.querySelector('.skip').getBoundingClientRect();
    const result = { doneWidth: done.width, doneHeight: done.height, skipWidth: skip.width };
    ticket.remove();
    return result;
  });
  expect(metrics.doneWidth).toBeGreaterThan(metrics.skipWidth);
  expect(metrics.doneHeight).toBeLessThan(72);
});

function relativeLuminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(value => {
    const channel = Number(value) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function readThemePalettes(page) {
  return page.evaluate(() => ['ocean','ivory','wisteria','cedar','mist','tea'].map(id => {
    document.documentElement.dataset.theme = id;
    const card = document.createElement('div');
    card.className = 'card';
    document.body.appendChild(card);
    const result = {
      id,
      paper: getComputedStyle(document.body).backgroundColor,
      card: getComputedStyle(card).backgroundColor,
      ink: getComputedStyle(document.body).color,
    };
    card.remove();
    return result;
  }));
}

/* v80:同一個主題在 iPhone 淺色／深色外觀下必須長得一模一樣。
   量兩次(light / dark)再比對,比單獨斷言「是淺色」更能擋住日後又被加回來的自動深色。 */
test('all six themes stay light under system dark appearance', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await readThemePalettes(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await readThemePalettes(page);

  expect(dark).toEqual(light);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  for (const palette of dark) {
    expect(relativeLuminance(palette.paper), palette.id + ' paper').toBeGreaterThan(0.7);
    expect(relativeLuminance(palette.card), palette.id + ' card').toBeGreaterThan(0.7);
    expect(contrastRatio(palette.ink, palette.paper), palette.id + ' ink').toBeGreaterThanOrEqual(4.5);
  }
});

test('reduced-motion preference disables smooth scrolling and view animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    animation: getComputedStyle(document.querySelector('.view.active')).animationDuration,
  }));
  expect(motion.scroll).toBe('auto');
  expect(parseFloat(motion.animation)).toBeLessThanOrEqual(0.001);
});
