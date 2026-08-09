const {test,expect}=require('@playwright/test');
const {collectPageErrors,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('診斷面板顯示並清除 session AppLog，且不再提供團體帳測試模式入口',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  await page.evaluate(()=>{
    closeMemberSelector();
    AppLog.clear();
    AppLog.repo('<b>離線失敗</b>');
    openDiagnostics();
  });

  const overlay=page.locator('#diagnosticOverlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('App 版本');
  await expect(overlay).toContainText('健康檢查');
  await expect(overlay).not.toContainText('團體帳測試模式');
  await expect(page.locator('#diagAppLogSection')).toContainText('1 筆');
  await expect(page.locator('#diagAppLogList')).toContainText('<b>離線失敗</b>');
  await expect(page.locator('#diagAppLogList b')).toHaveCount(0);

  await page.getByRole('button',{name:'清除紀錄'}).click();
  await expect(page.locator('#diagAppLogSection')).toContainText('0 筆');
  await expect(page.locator('#diagAppLogList')).toHaveText('尚無紀錄');
  await expect(overlay).toBeVisible();
  expect(pageErrors).toEqual([]);
});
