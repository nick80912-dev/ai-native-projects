const {test,expect}=require('./support/test');
const {installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({viewport:{width:390,height:700},hasTouch:true});
/* v203(Bar 2026-11-19):打開診斷面板後滑動,後面的頁面不可以跟著捲 */
test('the page behind the diagnostics panel does not scroll',async({page})=>{
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{try{closeMemberSelector();}catch(e){}switchView('trip');});
  await page.waitForTimeout(400);
  await page.evaluate(()=>window.scrollTo(0,200));
  const before=await page.evaluate(()=>window.scrollY);
  expect(before).toBeGreaterThan(0);
  await page.evaluate(()=>openDiagnostics());
  await expect(page.locator('.diag-panel')).toBeVisible();
  /* 在面板外的暗底與面板內各滑一次;面板內捲到底後也不能帶動後面 */
  await page.mouse.move(195,20);await page.mouse.wheel(0,600);
  await page.mouse.move(195,400);for(let i=0;i<6;i++)await page.mouse.wheel(0,800);
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>window.scrollY)).toBe(before);
  await page.evaluate(()=>closeDiagnostics());
  await expect(page.locator('#diagnosticOverlay')).toHaveCount(0);
  /* 關掉後恢復可捲動,位置不變 */
  expect(await page.evaluate(()=>window.scrollY)).toBe(before);
  await page.mouse.wheel(0,300);await page.waitForTimeout(300);
  expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(before);
});
