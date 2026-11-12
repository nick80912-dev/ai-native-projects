/* v188 航班卡與行李清單
   ============================================================
   Bar 2026-11-12：看過航班卡示意圖，資料選「試算表新增航班分頁」；行李清單「依之前規劃的行前清單」。
   - TripConfig 的 Flights GID 指向「航班」分頁（一列一班）。出發前首頁顯示下一班；搭機當天今天頁最上面顯示當天航班；其他日子不顯示。
   - 行前清單的類型寫「行李」進「行李」區；自己新增時可選「待辦／行李」。勾選只存在手機。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

async function boot(page,date){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,date);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
}
const FLIGHTS=['航班說明,,,',
  '日期,航空公司,班次,出發機場,出發時間,抵達機場,抵達時間,開櫃時間,航廈,托運,訂位代號,備註',
  '2026/10/23,台灣虎航,IT217,okj,16:05,KHH,18:05,14:00,,20 kg,K7QX2M,',
  '2026/10/18,台灣虎航,IT214,TPE,11:30,OKJ,15:05,9:00,第一航廈,20 kg,K7QX2M,去程行李 20 公斤',
  '10/40,壞日期,X1,TPE,1:00,OKJ,2:00,,,,,',
  '2026/10/19,缺機場,X2,,1:00,OKJ,2:00,,,,,'].join('\n');
async function serveFlights(page){
  await page.evaluate(async csv=>{
    const offline=window.fetch;
    window.fetch=input=>/output=csv&gid=777&_ts=\d+$/.test(String(input))?Promise.resolve(new Response(csv,{status:200,headers:{'Content-Type':'text/csv'}})):offline(input);
    DB.cfg.flightsGid='777';await refreshFlights();switchView('today');renderToday();
  },FLIGHTS);
}

test('the flights sheet is parsed by header names, sorted by date, and bad rows are skipped',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  const parsed=await page.evaluate(csv=>parseFlightsCsv(csv),FLIGHTS);
  expect(parsed.flights.map(f=>[f.md,f.dow,f.flightNo,f.fromCode,f.fromTime,f.toCode,f.toTime])).toEqual([
    ['10/18','日','IT214','TPE','11:30','OKJ','15:05'],['10/23','五','IT217','OKJ','16:05','KHH','18:05']]);
  expect(parsed.skipped).toBe(2);
});

test('before the trip the home shows the next flight as a boarding-pass card',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  await serveFlights(page);
  const card=page.locator('#view-today .flight-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('去程 · 10/18（日）');
  await expect(card).toContainText('台灣虎航 IT214');
  await expect(card.locator('.flight-end b')).toHaveText(['TPE','OKJ']);
  await expect(card.locator('.flight-stub')).toContainText('K7QX2M');
  expect(await card.getAttribute('aria-label')).toContain('TPE 11:30 飛 OKJ 15:05');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
});

test('on the flight day the card sits above the next stop; on other trip days there is none',async({page})=>{
  await boot(page,'2026-10-18T08:00:00+09:00');
  await serveFlights(page);
  await expect(page.locator('#view-today .flight-card')).toContainText('今天搭機 · 去程');
  const order=await page.evaluate(()=>{const c=document.querySelector('#view-today .flight-card'),n=document.querySelector('#view-today .nx-ticket');return !!(c&&n&&(c.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING));});
  expect(order).toBe(true);
  await page.evaluate(()=>{appNow=function(){return new Date('2026-10-20T10:00:00+09:00');};renderToday();});
  await expect(page.locator('#view-today .flight-card')).toHaveCount(0);
});

test('packing items from the sheet and from the phone sit in their own section',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  const csv=['類型,項目,說明,期限','待辦,訂租車,,','行李,護照,,','攜帶,行動電源,不能托運,','注意,退稅要帶護照,,'].join('\n');
  const parsed=await page.evaluate(csv=>parsePrepChecklistCsv(csv),csv);
  expect(parsed.items.map(i=>[i.type,i.title])).toEqual([['todo','訂租車'],['pack','護照'],['pack','行動電源'],['note','退稅要帶護照']]);
  await page.evaluate(items=>{localStorage.setItem(PREP_ITEMS_KEY,JSON.stringify({version:1,sourceKey:currentTripSourceKey(),items}));openPrepChecklist();},parsed.items);
  const sheet=page.locator('#ledgerInfoSheet');
  await expect(sheet.locator('.prep-heading',{hasText:'行李'})).toContainText('0 / 2');
  await sheet.locator('#prepAddKind').selectOption('pack');
  await sheet.locator('#prepAddInput').fill('雨傘');
  await sheet.locator('.prep-add .btn').click();
  await expect(sheet.locator('.prep-heading',{hasText:'行李'})).toContainText('0 / 3');
  await expect(sheet.locator('#prepAddKind')).toHaveValue('pack');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem(PREP_STATE_KEY)));
  expect(state.custom.map(c=>[c.title,c.kind])).toEqual([['雨傘','pack']]);
  await sheet.locator('#prepAddKind').selectOption('todo');
  await sheet.locator('#prepAddInput').fill('換日幣');
  await sheet.locator('.prep-add .btn').click();
  expect(await page.evaluate(()=>prepChecklistModel().custom.map(c=>c.title))).toEqual(['換日幣']);
  expect(await page.evaluate(()=>prepChecklistModel().total)).toBe(5);
});
