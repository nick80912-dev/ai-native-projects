/* v194 行程頁時間軸(Bar 2026-11-16 看過概念圖回「好，用下一站時間推算」;之後加的「幾點離開／來不及」版本 Bar 回不採用,維持這版)
   - 左邊時間欄:這站時間＋「～下一站時間」(推算);中間時間線與圓點;站與站之間是交通段(方式＋時間＋起訖站)。
   - 站卡平常收起(標題、類型、地圖、▾),按 ▾ 才有導航／停車／資訊／更多;從今天頁點進來的那一站自動展開。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
async function boot(page){
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>localStorage.setItem('trip_today_mode','"list"'));
  await installFixedDate(page,'2026-10-20T13:00:00+09:00');
  await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>closeMemberSelector());
}
test('the trip page is a timeline: next-stop time, transport legs, collapsed cards with 地圖',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  await page.evaluate(()=>gotoDay(2));
  const items=page.locator('#view-trip .tl-item');
  const count=await items.count();
  expect(count).toBe(await page.evaluate(()=>DB.trip.days[2].items.filter(isTripCheckableItem).length));
  await expect(items.nth(0).locator('.tl-time')).toContainText('7:00');
  await expect(items.nth(0).locator('.tl-time small')).toHaveText('～8:00');
  await expect(page.locator('#view-trip .tl-link').first()).toContainText('開車1小時');
  /* v199(Bar 2026-11-18):起訖站名就在上下兩張卡片,交通段只留標籤 */
  await expect(page.locator('#view-trip .tl-link').first()).not.toContainText('→');
  /* 收起時看不到導航;按 ▾ 展開才看得到 */
  const second=items.nth(1);
  await expect(second.locator('.qa-btn.drv')).toBeHidden();
  await expect(second.locator('.tl-map')).toHaveAttribute('href',/google\.com\/maps\/search/);
  await second.locator('.tl-toggle').click();
  await expect(second.locator('.qa-btn.drv')).toBeVisible();
  await expect(second.locator('.tl-toggle')).toHaveAttribute('aria-expanded','true');
  await second.locator('.tl-toggle').click();
  await expect(second.locator('.qa-btn.drv')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});
test('a stop opened from the Today list is expanded on the timeline',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{switchView('today');renderToday();});
  const row=page.locator('#view-today .today-list-row').nth(9);
  const id=await row.getAttribute('data-stop-id');
  await row.locator('.today-list-go').click();
  const item=page.locator('[id="it_'+id+'"]');
  await expect(item).toHaveClass(/tl-open/);
  await expect(item.locator('.qa-btn.drv')).toBeVisible();
});
