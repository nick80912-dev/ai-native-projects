const {test,expect}=require('./support/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  installOnlineSheetMock,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

function generatedBuiltin(){
  const source=fs.readFileSync(path.resolve(__dirname,'../../shell/v114/builtin-snapshot.js'),'utf8');
  const sandbox={};
  vm.runInNewContext(source,sandbox,{filename:'builtin-snapshot.js'});
  return JSON.parse(JSON.stringify(sandbox.BUILTIN));
}

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
    title:document.getElementById('brandTitle').textContent,
    health:healthCheck()
  }));
  expect(state.source).toBe('builtin');
  expect(state.sync).toBe('builtin');
  expect(state.dayCount).toBe(6);
  expect(state.title).toContain('岡山');
  expect(state.health).toEqual([]);
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
      sources:Object.keys(SRC).map(key=>SRC[key]),
      health:healthCheck()
    };
  });
  expect(state.source).toBe('online');
  expect(state.sync).toBe('online');
  expect(state.storedSource).toBe('online');
  expect(state.sources.every(source=>source==='online')).toBe(true);
  expect(state.health).toEqual([]);
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
    appNow:appNow().toISOString(),
    health:healthCheck()
  }));
  expect(state.today).toBe('10/18');
  expect(state.todayIndex).toBe(0);
  expect(state.currentDay).toBe(0);
  expect(state.appNow).toBe('2026-10-18T00:30:00.000Z');
  expect(state.health).toEqual([]);
  await expect(page.locator('#view-today .today-hero .lbl')).toHaveText('TODAY · DAY 1');
  await expect(page.locator('#view-today .today-hero .date')).toContainText('10/18');
  expect(pageErrors).toEqual([]);
});

test('BUILTIN asset 載入失敗時以有效本機快照降級啟動',async({page})=>{
  const pageErrors=collectPageErrors(page),builtin=generatedBuiltin();
  await installOfflineAppNetwork(page);
  await page.addInitScript((sheets)=>localStorage.setItem('trip_data_snapshot_state',JSON.stringify({
    formatVersion:1,
    active:{formatVersion:1,generationId:'local-safe',createdAt:1234,source:'online',sheets, sheetMeta:{},validation:{warnings:[]}},
    previous:null
  })),builtin);
  await page.route('**/builtin-snapshot.js',route=>route.abort('failed'));
  await openApp(page);
  const state=await page.evaluate(()=>({source:CURRENT_SNAPSHOT&&CURRENT_SNAPSHOT.source,days:DB.trip.days.length,logs:AppLog.snapshot().map(entry=>entry.message)}));
  expect(state.source).toBe('online');
  expect(state.days).toBe(6);
  expect(state.logs.some(message=>message.includes('BUILTIN')&&message.includes('本機快照'))).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('BUILTIN asset 載入失敗且無本機快照時顯示可操作復原頁',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await page.route('**/builtin-snapshot.js',route=>route.abort('failed'));
  await installOfflineAppNetwork(page);
  await openApp(page);
  await expect(page.locator('#builtinRecovery')).toBeVisible();
  await expect(page.locator('#builtinRecovery')).toContainText('資料資產無法載入');
  await expect(page.locator('#builtinRecovery button')).toHaveCount(2);
  expect(await page.evaluate(()=>CURRENT_SNAPSHOT)).toBeNull();
  expect(pageErrors).toEqual([]);
});
