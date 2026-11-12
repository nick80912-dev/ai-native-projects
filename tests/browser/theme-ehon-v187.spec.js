/* v187 第七個主題「繪本／和紙」(Bar 2026-11-11 核准,ADR 0008 增補)
   - 設定的主題頁有第七格,選了之後 data-theme=ehon、重載後保留。
   - 今天頁插圖只有繪本主題顯示;卡片是 3px 墨灰框。
   - 切換日期會加上彈跳 class;「減少動態效果」時動畫不跑。
   - 其他主題不受影響(沒有插圖、卡片圓角 20)。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
async function boot(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
}
test('the seventh theme can be picked, restyles cards, and shows the home illustration',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  await page.evaluate(()=>{switchView('today');});
  await expect(page.locator('#view-today .ehon-art').first()).toBeHidden();
  expect(await page.evaluate(()=>getComputedStyle(document.querySelector('#view-today .nx-ticket')).borderRadius)).toBe('20px');
  await page.evaluate(()=>openSettings('theme'));
  await expect(page.locator('.settings-theme-card')).toHaveCount(7);
  await page.locator('.settings-theme-card',{hasText:'繪本／和紙'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','ehon');
  await expect(page.locator('.settings-theme-card[aria-pressed="true"]')).toContainText('繪本／和紙');
  await page.evaluate(()=>{closeSettings();switchView('today');});
  await expect(page.locator('#view-today .ehon-art').first()).toBeVisible();
  const card=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#view-today .nx-ticket'));return {w:s.borderTopWidth,c:s.borderTopColor,r:s.borderRadius,overflow:document.documentElement.scrollWidth>window.innerWidth};});
  expect(card).toEqual({w:'3px',c:'rgb(62, 58, 57)',r:'22px',overflow:false});
  expect(await page.evaluate(()=>document.querySelector('meta[name="theme-color"]').getAttribute('content'))).toBe('#FFFCF6');
  expect(await page.evaluate(()=>localStorage.getItem('trip_theme'))).toBe('ehon');
  expect(errors).toEqual([]);
});
test('switching days bounces only in the picture-book theme and respects reduced motion',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{switchView('trip');selectTripDay(1);});
  expect(await page.evaluate(()=>document.getElementById('view-trip').classList.contains('day-bounce'))).toBe(false);
  await page.evaluate(()=>{applyTheme('ehon');selectTripDay(2);});
  expect(await page.evaluate(()=>document.getElementById('view-trip').classList.contains('day-bounce'))).toBe(true);
  expect(await page.evaluate(()=>getComputedStyle(document.querySelector('#view-trip .item')).animationName)).toBe('ehonPop');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>selectTripDay(3));
  const dur=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#view-trip .item')).animationDuration));
  expect(dur).toBeLessThan(0.01);
});
