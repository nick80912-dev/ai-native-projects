/* v190 繪本主題的第五色「藤紫」(Bar 2026-11-15 同意;同一批提的第八個主題不做)
   - 繪本的顏色全部走 --ehon-* 變數,藤紫是 --ehon-violet #C9B8E3。
   - 航班卡改藤紫底(原本和今天卡同為水藍,疊在一起分不開);住宿標籤也是藤紫。
   - 其他主題不受影響:航班卡仍是白卡、住宿標籤沒有藤紫。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
const CSV='日期,航空公司,班次,出發機場,出發時間,抵達機場,抵達時間\n2026/10/18,台灣虎航,IT214,TPE,11:30,OKJ,15:05\n';
const VIOLET='rgb(201, 184, 227)';
async function show(page,theme){
  await page.evaluate(([theme,csv])=>{
    const parsed=parseFlightsCsv(csv);
    localStorage.setItem(FLIGHT_ITEMS_KEY,JSON.stringify({version:1,sourceKey:currentTripSourceKey(),gid:'1',flights:parsed.flights}));
    applyTheme(theme,{persist:false});switchView('today');renderToday();
  },[theme,CSV]);
  return page.evaluate(()=>{
    const card=document.querySelector('#view-today .flight-card');
    const stay=document.createElement('span');stay.className='tag stay';stay.textContent='住宿';document.body.appendChild(stay);
    const result={card:card&&getComputedStyle(card).backgroundColor,stay:getComputedStyle(stay).backgroundColor,
      hero:getComputedStyle(document.querySelector('.today-hero')).backgroundColor,
      violet:getComputedStyle(document.documentElement).getPropertyValue('--ehon-violet').trim()};
    stay.remove();return result;
  });
}
test('the ehon theme gains a fifth colour used by the flight card and the stay tag',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-10T09:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
  const ehon=await show(page,'ehon');
  expect(ehon).toMatchObject({card:VIOLET,stay:VIOLET,hero:'rgb(168, 211, 230)',violet:'#C9B8E3'});
  const ocean=await show(page,'ocean');
  expect(ocean.card).not.toBe(VIOLET);
  expect(ocean.stay).not.toBe(VIOLET);
  expect(ocean.violet).toBe('');
  expect(errors).toEqual([]);
});
