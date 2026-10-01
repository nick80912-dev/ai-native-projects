const {test,expect}=require('./support/test');
const {collectPageErrors,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('資料健康子頁直接顯示四項狀態，鍵盤可進入並返回設定',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('root'));
  const row=page.getByRole('button',{name:/^資料健康狀態/});
  await expect(row).toContainText('資料狀態正常');
  await row.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'資料健康狀態',exact:true})).toBeVisible();
  const health=page.locator('.settings-data-health');
  await expect(health.locator('details,summary')).toHaveCount(0);
  await expect(health.locator('.settings-health-row')).toHaveCount(4);
  for(const key of ['trip','shared','personal','photos'])await expect(health.locator('.data-health-'+key)).toBeVisible();
  await expect(page.getByRole('button',{name:/修復|清理照片/})).toHaveCount(0);
  await page.getByRole('button',{name:'返回設定',exact:true}).click();
  await expect(row).toBeVisible();
  await page.getByRole('button',{name:/備份、還原與版本資訊/}).click();
  await expect(page.locator('.settings-data-health')).toHaveCount(0);
  for(const name of ['重置紀錄','清除並打包旅程','複製備份 JSON','從 JSON 還原'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
  await expect(page.locator('.settings-version-row')).toContainText('SW');
  expect(errors).toEqual([]);
});

test('inactive 不顯示舊旅程健康資料，直接進健康頁仍顯示空狀態',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    localStorage.setItem('trip_lifecycle_state',JSON.stringify({mode:'complete',archiveId:null}));
    renderInactiveHome();openSettings('root');
  });
  await expect(page.getByRole('button',{name:/^資料健康狀態/})).toHaveCount(0);
  await page.evaluate(()=>openSettings('health'));
  await expect(page.getByRole('heading',{name:'資料健康狀態',exact:true})).toBeVisible();
  await expect(page.locator('.settings-panel')).toContainText('目前沒有進行中的旅程');
  await expect(page.locator('.settings-health-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});
