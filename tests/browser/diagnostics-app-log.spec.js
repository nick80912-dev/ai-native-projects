const {test,expect}=require('./support/test');
const {collectPageErrors,installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('診斷面板顯示並清除 session AppLog，且不再提供團體帳測試模式入口',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  await page.evaluate(()=>{
    closeMemberSelector();
    AppLog.clear();
    AppLog.repo('<b>離線失敗</b>');
    AppLog.sync('ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時');
    openDiagnostics();
  });

  const overlay=page.locator('#diagnosticOverlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('App 版本');
  await expect(overlay).toContainText('健康檢查');
  await expect(overlay).not.toContainText('團體帳測試模式');
  await expect(page.locator('#diagAppLogSection')).toContainText('2 筆');
  await expect(page.locator('#diagAppLogList')).toContainText('<b>離線失敗</b>');
  await expect(page.locator('#diagAppLogList')).toContainText('分帳快速同步暫時逾時');
  await expect(page.locator('#diagAppLogList')).toContainText('目前仍可使用');
  await expect(page.locator('#diagAppLogList')).toContainText('已改用一般 CSV 同步');
  await expect(page.locator('#diagAppLogList')).toContainText('原始：ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時');
  await expect(page.locator('#diagAppLogList .diag-impact-degraded')).toHaveCount(2);
  await expect(page.locator('#diagAppLogList b')).toHaveCount(2);
  expect(await page.evaluate(()=>AppLog.snapshot().map(entry=>({category:entry.category,level:entry.level,message:entry.message})))).toEqual([
    {category:'repository',level:'warn',message:'<b>離線失敗</b>'},
    {category:'sync',level:'warn',message:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'}
  ]);

  await page.getByRole('button',{name:'清除紀錄'}).click();
  await expect(page.locator('#diagAppLogSection')).toContainText('0 筆');
  await expect(page.locator('#diagAppLogList')).toHaveText('尚無紀錄');
  await expect(overlay).toBeVisible();
  expect(pageErrors).toEqual([]);
});

/* v152(Bar 2026-10-13 核准):診斷面板的「目前旅程」、完整的除錯報告、手機時間與白話訊息。 */
test.describe('v152 診斷面板',()=>{
  test.use({timezoneId:'Asia/Tokyo'});

  test('目前旅程顯示連接的旅程、保護期、行程資料與待送團體帳，報告一併帶上',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-19T10:00:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{
      closeMemberSelector();
      localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'q1'},{id:'q2'}]));
      AppLog.clear();
      AppLog.data('天氣讀取未完成；可於首頁重試。');
      window.__copied=[];
      window.copyText=function(text,label){window.__copied.push({text:text,label:label});};
      openDiagnostics();
    });
    const trip=page.locator('#diagTripSection');
    await expect(trip).toContainText('連接的旅程：岡山舊旅程（內建）');
    await expect(trip).toContainText('旅程狀態：進行中');
    await expect(trip).toContainText('岡山保護期：進行中，到 10/24 00:00（台灣時間）');
    await expect(trip.locator('[data-key="sync"]')).toContainText('行程資料：');
    await expect(trip).toContainText('團體帳：2 筆待送出');
    await expect(page.locator('#diagnosticOverlay')).toContainText('資料檢查正常；本次有 1 則紀錄，見下方 AppLog');
    const log=page.locator('#diagAppLogList');
    await expect(log).toContainText('天氣暫時讀不到');
    await expect(log).toContainText('不影響行程與分帳');
    await expect(log).toContainText('10/19 10:00:00 [data]');
    await expect(log).not.toContainText('2026-10-19T01:00:00.000Z');
    await page.getByRole('button',{name:'複製除錯報告'}).click();
    const report=await page.evaluate(()=>window.__copied[0].text);
    expect(report).toContain('App：'+await page.evaluate(()=>APP_VERSION));
    expect(report).toContain('- 連接的旅程：岡山舊旅程（內建）');
    expect(report).toContain('- 團體帳：2 筆待送出');
    expect(report).toContain('2026-10-19T01:00:00.000Z [data] 天氣讀取未完成；可於首頁重試。');
    expect(pageErrors).toEqual([]);
  });

  test('待送團體帳屬於其他旅程時，目前旅程直接寫出已暫停送出',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-25T10:00:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{
      closeMemberSelector();
      localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'q1'}]));
      localStorage.setItem('trip_ledger_queue_owner','sheet:kyushu-2027');
      openDiagnostics();
    });
    const trip=page.locator('#diagTripSection');
    await expect(trip).toContainText('團體帳：1 筆待送，已暫停送出（屬於其他旅程：sheet:kyushu-2027）');
    await expect(trip).toContainText('岡山保護期：已結束');
    expect(pageErrors).toEqual([]);
  });
});
