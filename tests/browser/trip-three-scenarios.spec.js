const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  installOnlineSheetMock,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

test.describe.configure({mode:'serial'});

test('斷網時以內建快照完成啟動且沒有 pageerror',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);

  await openApp(page);
  await waitForSyncToSettle(page);

  const state=await page.evaluate(()=>({
    source:CURRENT_SNAPSHOT&&CURRENT_SNAPSHOT.source,
    sync:syncStatusModel().state,
    dayCount:DB.trip&&DB.trip.days&&DB.trip.days.length,
    title:document.getElementById('brandTitle').textContent
  }));
  expect(state.source).toBe('builtin');
  expect(state.sync).toBe('builtin');
  expect(state.dayCount).toBe(6);
  expect(state.title).toContain('岡山');
  expect(pageErrors).toEqual([]);
});

test('連網同步以完整 mock Sheet 產生 online 快照且沒有 pageerror',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOnlineSheetMock(page);

  await openApp(page);
  await page.waitForFunction(()=>CURRENT_SNAPSHOT&&CURRENT_SNAPSHOT.source==='online'&&syncInFlight===null);

  const state=await page.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem(SNAPSHOT_STATE_KEY));
    return {
      source:CURRENT_SNAPSHOT.source,
      sync:syncStatusModel().state,
      storedSource:stored&&stored.active&&stored.active.source,
      sources:Object.keys(SRC).map(key=>SRC[key])
    };
  });
  expect(state.source).toBe('online');
  expect(state.sync).toBe('online');
  expect(state.storedSource).toBe('online');
  expect(state.sources.every(source=>source==='online')).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('旅行日 mock Date 讓今天頁落在 Day 1 且沒有 pageerror',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installFixedDate(page,'2026-10-18T09:30:00+09:00');
  await installOfflineAppNetwork(page);

  await openApp(page);
  await waitForSyncToSettle(page);

  const state=await page.evaluate(()=>({
    today:todayMD(),
    todayIndex:findToday(),
    currentDay:curDay,
    appNow:appNow().toISOString()
  }));
  expect(state.today).toBe('10/18');
  expect(state.todayIndex).toBe(0);
  expect(state.currentDay).toBe(0);
  expect(state.appNow).toBe('2026-10-18T00:30:00.000Z');
  await expect(page.locator('#view-today .today-hero .lbl')).toHaveText('TODAY · DAY 1');
  await expect(page.locator('#view-today .today-hero .date')).toContainText('10/18');
  expect(pageErrors).toEqual([]);
});
