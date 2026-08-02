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

test('all six themes adapt to a readable dark palette', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const palettes = await page.evaluate(() => ['ocean','ivory','wisteria','cedar','mist','tea'].map(id => {
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
  for (const palette of palettes) {
    expect(relativeLuminance(palette.paper), palette.id + ' paper').toBeLessThan(0.18);
    expect(relativeLuminance(palette.card), palette.id + ' card').toBeLessThan(0.22);
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
