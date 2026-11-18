const {test,expect}=require('./support/test');
const {collectPageErrors,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('資料健康子頁直接顯示四項狀態，鍵盤可進入並返回設定',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('root'));
  /* v185:資料健康在「疑難排解」裡,返回也是回到疑難排解 */
  await expect(page.getByRole('button',{name:/^疑難排解/})).toContainText('資料狀態正常');
  await page.getByRole('button',{name:/^疑難排解/}).click();
  const row=page.getByRole('button',{name:/^資料與照片狀態/});  // v198:資料健康與照片健康合成一頁
  await expect(row).toContainText('資料狀態正常');
  await row.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'資料與照片狀態',exact:true})).toBeVisible();
  const health=page.locator('.settings-data-health');
  await expect(health.locator('details,summary')).toHaveCount(0);
  await expect(health.locator('.settings-health-row')).toHaveCount(3);
  for(const key of ['trip','shared','personal'])await expect(health.locator('.data-health-'+key)).toBeVisible();
  /* v198:同一頁下方接著照片附件的容量與檢查 */
  await expect(page.locator('.shopping-photo-storage-grid')).toBeVisible();
  await page.getByRole('button',{name:'返回疑難排解',exact:true}).click();
  await expect(row).toBeVisible();
  await page.getByRole('button',{name:'返回設定',exact:true}).click();
  await page.getByRole('button',{name:/資料與版本/}).click();
  await expect(page.locator('.settings-data-health')).toHaveCount(0);
  for(const name of ['重置紀錄','清除並打包旅程','複製備份 JSON','從 JSON 還原'])await expect(page.locator('#settingsOverlay').getByRole('button',{name,exact:true})).toBeVisible();
  /* v198(Bar 2026-11-17):匯出與備份在上,危險的重置／清除在最底且是紅框按鈕;更新說明只顯示最新一版 */
  const order=await page.evaluate(()=>{const p=document.querySelector('#settingsOverlay .settings-panel').innerHTML;return [p.indexOf('匯出本趟個人帳'),p.indexOf('複製備份 JSON'),p.indexOf('settings-version-row'),p.indexOf('清除並打包旅程')];});
  expect(order.every((v,i)=>v>=0&&(i===0||v>order[i-1]))).toBe(true);
  await expect(page.locator('#settingsOverlay').getByRole('button',{name:'清除並打包旅程',exact:true})).toHaveClass(/danger-outline/);
  await expect(page.locator('.settings-release-list > .settings-release')).toHaveCount(1);
  await expect(page.locator('.settings-release-more summary')).toContainText('看更早的更新');
  await expect(page.locator('.settings-version-row')).toContainText('目前版本 v');
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
  await expect(page.getByRole('button',{name:/^資料與照片狀態/})).toHaveCount(0);
  await page.evaluate(()=>openSettings('health'));
  await expect(page.getByRole('heading',{name:'資料與照片狀態',exact:true})).toBeVisible();
  await expect(page.locator('.settings-panel')).toContainText('目前沒有進行中的旅程');
  await expect(page.locator('.settings-health-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('v198: a toast raised on the Today page moves to the bottom when Settings opens',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('today');toast('已自動略過 2 項超時未確認行程');});
  await expect(page.locator('#toast')).toHaveClass(/toast-top/);
  await page.evaluate(()=>openSettings('root'));
  await expect(page.locator('#toast')).not.toHaveClass(/toast-top/);
  expect(errors).toEqual([]);
});
