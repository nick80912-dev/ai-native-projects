const { test, expect } = require('@playwright/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

const VIEWPORT_CASES = [
  { width: 320, activation: 'tap' },
  { width: 375, activation: 'enter' },
  { width: 390, activation: 'space', reducedMotion: true },
];

async function openFixture(page, date, viewportCase) {
  await page.setViewportSize({ width: viewportCase.width, height: 844 });
  if (viewportCase.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await installFixedDate(page, date);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(() => closeMemberSelector());
}

async function activateRealControl(locator, activation) {
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  if (activation === 'tap') await locator.tap();
  else await locator.press(activation === 'enter' ? 'Enter' : 'Space');
}

async function prepareLauncher(page, type) {
  if (type === 'openTripItem') {
    await page.evaluate(() => {
      switchView('today');
      const dayIndex = findToday();
      const day = DB.trip.days[dayIndex];
      const parentIndex = day.items.findIndex((item) => !!getChildStopCluster(day.items, item));
      const checks = {};
      day.items.slice(0, parentIndex).forEach((item) => {
        if (isTripCheckableItem(item)) checks[item.id] = true;
      });
      lsSet('trip_checks', checks);
      renderToday();
    });
    const expand = page.locator('#view-today .nx-cluster-expand');
    await expect(expand).toBeVisible();
    await expand.click();
    const launcher = page.locator('#view-today .nx-cluster-stop').first();
    await expect(launcher).toBeVisible();
    const expected = await launcher.evaluate((element) => {
      const call = element.getAttribute('onclick') || '';
      const match = call.match(/openTripItem\((\d+),'([^']+)'\)/);
      return {
        targetId: match ? 'it_' + match[2] : '',
        status: '已定位：' + element.querySelector('.nx-cluster-name').textContent.trim(),
      };
    });
    return { launcher, ...expected };
  }

  if (type === 'gotoDay') {
    await page.evaluate(() => switchView('today'));
    const launcher = page.locator('#view-today .today-pretrip-day').first();
    await expect(launcher).toBeVisible();
    return { launcher, targetId: 'tripday_0', status: '已定位：Day 1' };
  }

  if (type === 'openShopPlace') {
    await page.evaluate(() => {
      curDay = 0;
      switchView('trip');
    });
    const launcher = page.locator('#view-trip .qa-btn.sp').first();
    await expect(launcher).toBeVisible();
    return {
      launcher,
      targetId: 'shopmall_P001',
      status: '已定位：永旺夢樂城岡山',
    };
  }

  const expected = await page.evaluate(() => {
    switchView('trip');
    const todayIndex = findToday();
    const day = DB.trip.days[todayIndex];
    const currentId = selectCurrentTripItem(day, todayIndex, getChecks());
    gotoDay(todayIndex === 0 ? 1 : 0);
    return {
      targetId: currentId ? 'it_' + currentId : '',
      status: currentId ? '已定位：' + getNavigationTripItemName(currentId) : '已定位：頁面頂端',
      todayIndex,
    };
  });
  const launcher = page.locator('#view-trip .trip-back-now');
  await expect(launcher).toBeVisible();
  return { launcher, ...expected };
}

async function expectConfirmedTarget(page, expected, viewportCase) {
  const target = page.locator(`[id="${expected.targetId}"]`);
  const status = page.locator('.navigation-target-status');
  await expect(target).toHaveClass(/is-navigation-target/);
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveText(expected.status);

  const geometry = await page.evaluate((targetId) => {
    const targetElement = document.getElementById(targetId);
    const statusElement = document.querySelector('.navigation-target-status');
    const header = document.querySelector('.hdr');
    const targetBox = targetElement.getBoundingClientRect();
    const statusBox = statusElement.getBoundingClientRect();
    return {
      targetTop: targetBox.top,
      statusTop: statusBox.top,
      stickyBottom: header.getBoundingClientRect().bottom,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      transitionDuration: getComputedStyle(targetElement).transitionDuration,
    };
  }, expected.targetId);
  expect(geometry.targetTop).toBeGreaterThanOrEqual(geometry.stickyBottom - 1);
  expect(geometry.statusTop).toBeGreaterThanOrEqual(geometry.stickyBottom - 1);
  expect(geometry.horizontalOverflow).toBe(false);
  if (viewportCase.reducedMotion) expect(geometry.transitionDuration).toBe('0s');

  await page.waitForTimeout(1300);
  await expect(target).not.toHaveClass(/is-navigation-target/);
}

const TARGET_TYPES = [
  { type: 'openTripItem', date: '2026-10-18T16:45:00+09:00' },
  { type: 'gotoDay', date: '2026-10-01T09:30:00+09:00' },
  { type: 'openShopPlace', date: '2026-10-18T17:45:00+09:00' },
  { type: 'backToNow', date: '2026-10-18T17:45:00+09:00' },
];

test.describe('remaining navigation target acceptance matrix', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  TARGET_TYPES.forEach((targetCase) => {
    VIEWPORT_CASES.forEach((viewportCase) => {
      test(`${targetCase.type} ${viewportCase.activation} confirms the exact target at ${viewportCase.width}px`, async ({ page }) => {
        await openFixture(page, targetCase.date, viewportCase);
        const expected = await prepareLauncher(page, targetCase.type);
        await expected.launcher.focus();
        await expect(expected.launcher).toBeFocused();
        await activateRealControl(expected.launcher, viewportCase.activation);
        await expectConfirmedTarget(page, expected, viewportCase);
        if (targetCase.type === 'backToNow') {
          await expect.poll(() => page.evaluate(() => curDay)).toBe(expected.todayIndex);
        }
      });
    });
  });
});
