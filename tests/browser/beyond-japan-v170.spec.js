/* v170（backlog #62）去日本以外的地方也順手
   ============================================================
   設計 docs/superpowers/specs/2026-10-31-multi-country-trips.md §3.6、§3.7：
   天氣用目的地的時區（Open-Meteo timezone=auto）；日本以外的旅程預設支付方式不含 Suica；
   帳目明細的金額照這趟的幣別顯示（v168 漏改的地方）。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,cfg){
  await page.addInitScript(()=>{window.qaNativeFetch=window.fetch.bind(window);});
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-18T13:30:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(([m,patch])=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    Object.assign(DB.cfg,patch||{});
  },[[identity('Bar'),identity('Amy')],cfg]);
}

test('weather uses the destination time zone for the rain chance from now',async({page})=>{
  await boot(page,null);
  const requested=[];
  /* 手機在日本 13:30＝曼谷 11:30。曼谷 11 點已經過去，之後最高是 13 點的 40%；
     若照舊把時間當成日本時間，13 點也算過去，會只剩 10%。 */
  await page.route('https://api.open-meteo.com/**',route=>{requested.push(route.request().url());return route.fulfill({json:{
    utc_offset_seconds:25200,timezone:'Asia/Bangkok',current:{temperature_2m:31.4,weather_code:1},
    hourly:{time:['2026-10-18T11:00','2026-10-18T13:00','2026-10-18T14:00'],precipitation_probability:[90,40,10]}}});});
  const result=await page.evaluate(async()=>{
    window.fetch=window.qaNativeFetch;
    return fetchWeather({key:'bangkok',label:'曼谷',lat:13.75,lon:100.5});
  });
  expect(requested).toHaveLength(1);
  expect(requested[0]).toContain('timezone=auto');
  expect(requested[0]).not.toContain('Asia%2FTokyo');
  expect([result.temp,result.rain,result.hours.utcOffsetSeconds]).toEqual([31,40,25200]);
  /* 快取讀回時也照當地時間重算 */
  expect(await page.evaluate(data=>rainChanceFromNow(data.hours,appNow()),result)).toBe(40);
});

test('a trip outside Japan has no Suica by default; Okayama keeps it',async({page})=>{
  await boot(page,null);
  const options=()=>page.evaluate(()=>{
    switchView('split');openLedgerEntrySheet(false);ledgerUiState.draft.entryDetailsOpen=true;renderLedgerEntrySheet();
    const shown=Array.from(document.querySelectorAll('#ledgerEntrySheet .ledger-pay-option')).map(node=>node.textContent.trim());
    closeLedgerEntrySheet();return shown;
  });
  await page.evaluate(()=>localStorage.removeItem(LEDGER_PAY_METHOD_OPTIONS_KEY));
  expect(await options()).toEqual(['現金','信用卡','行動支付','Suica','其他']);
  await page.evaluate(()=>Object.assign(DB.cfg,{currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'}));
  expect(await options()).toEqual(['現金','信用卡','行動支付','其他']);
  /* 已經存在手機上的清單不動 */
  await page.evaluate(()=>localStorage.setItem(LEDGER_PAY_METHOD_OPTIONS_KEY,JSON.stringify(['現金','Suica'])));
  expect(await options()).toEqual(['現金','Suica']);
  /* 「恢復預設」也照這趟的預設 */
  await page.evaluate(()=>{localStorage.setItem(LEDGER_PAY_METHOD_OPTIONS_KEY,JSON.stringify(['現金']));window.confirm=()=>true;restoreLedgerOptionDefaults('payMethod');});
  expect(await page.evaluate(()=>ledgerPayMethodStore.all())).toEqual(['現金','信用卡','行動支付','其他']);
});

test('the record detail shows amounts in the trip currency',async({page})=>{
  await boot(page,{currency:'USD',exchangeRate:'32',ledgerDefaultCurrency:'USD'});
  const rows=await page.evaluate(()=>ledgerRecordDetailRows({id:'r1',time:'2026-10-18T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'漢堡',amountJpy:1250,amountTwd:400,note:'',payMethod:'現金',inputCurrency:'JPY',couponAmount:50},'personal'));
  const table=Object.fromEntries(rows);
  expect(table.USD).toBe('US$12.50');
  expect(table.TWD).toBe('NT$400');
  expect(table['優惠券金額']).toBe('US$0.50');
  expect(table.JPY).toBeUndefined();
  /* 岡山不變 */
  await page.evaluate(()=>{DB.cfg.currency='';});
  const okayama=Object.fromEntries(await page.evaluate(()=>ledgerRecordDetailRows({id:'r2',time:'2026-10-18T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'拉麵',amountJpy:1500,amountTwd:315,note:'',payMethod:'現金',inputCurrency:'JPY'},'personal')));
  expect([okayama.JPY,okayama.TWD]).toEqual(['¥1,500','NT$315']);
});
