/* v197(Bar 2026-11-17):行程頁上方日期按鈕寫 10/19(一),原本「10/19·一」的「一」在小字裡像破折號 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
test('day chips show the weekday in brackets',async({page})=>{
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-20T10:00:00+09:00');
  await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('trip');});
  const texts=await page.locator('.day-chip .dow').allTextContents();
  expect(texts[1]).toBe('10/19(一)');
  expect(texts.join('')).not.toContain('·');
});
