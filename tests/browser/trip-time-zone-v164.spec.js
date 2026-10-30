/* v164（稽核：時間改依旅程時區）：手機留在台灣時間（UTC+8）時，原本在日本看到的一切都慢一小時，
   過了日本午夜還算成前一天；記帳的預設時間也慢一小時，兩支手機看到的時間不一樣。
   現在行程與記帳一律依日本時間。本檔的瀏覽器刻意設在台灣時區。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Taipei'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,when){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when);
  await openApp(page);
  await waitForSyncToSettle(page);
}

test('a phone left on Taiwan time follows Japan time for today, now and the trip end',async({page})=>{
  /* 台灣 10/22 23:30 ＝ 日本 10/23 00:30：已經是最後一天 */
  await boot(page,'2026-10-22T23:30:00+08:00');
  expect(await page.evaluate(()=>({phoneOffset:new Date().getTimezoneOffset(),today:todayMD(),minutes:currentMinutes(),ended:tripHasEnded()})))
    .toEqual({phoneOffset:-480,today:'10/23',minutes:30,ended:false});
  await page.evaluate(()=>switchView('today'));
  /* 10/23 是 DAY 6 */
  await expect(page.locator('#view-today .today-hero .lbl')).toHaveText('TODAY · DAY 6');
});

test('after Japan midnight on the last day the trip has ended even though Taiwan is still on 10/23',async({page})=>{
  await boot(page,'2026-10-23T23:30:00+08:00');
  expect(await page.evaluate(()=>({today:todayMD(),ended:tripHasEnded()}))).toEqual({today:'10/24',ended:true});
});

test('a new expense defaults to the Japan date and time and is saved as the real moment',async({page})=>{
  /* 台灣 11:00 ＝ 日本 12:00 */
  await boot(page,'2026-10-20T11:00:00+08:00');
  await page.evaluate(m=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;switchView('split');openLedgerEntrySheet(false);},[identity('Bar')]);
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  expect(await page.evaluate(()=>({date:ledgerUiState.draft.occurredDate,time:ledgerUiState.draft.occurredTime}))).toEqual({date:'2026/10/20',time:'12:00'});
  await page.locator('#ledgerAmount').fill('800');
  await page.locator('#ledgerDetail').fill('拉麵');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const saved=await page.evaluate(()=>{const record=personalLedgerRepository.all().filter(item=>item.detail==='拉麵')[0];
    return {time:record.time,shown:formatLedgerLocalOccurrence(record.time),key:ledgerLocalDateKey(record.time)};});
  expect(saved).toEqual({time:'2026-10-20T03:00:00.000Z',shown:'2026/10/20 12:00',key:'2026-10-20'});
});

test('an expense entered near Japan midnight lands on the Japan date for today\'s spending',async({page})=>{
  /* 台灣 10/20 23:30 ＝ 日本 10/21 00:30：「今天」已是 10/21 */
  await boot(page,'2026-10-20T23:30:00+08:00');
  expect(await page.evaluate(()=>({key:ledgerLocalDateKey(Date.now()),label:ledgerOptionalDateLabel('2026/10/21'),yesterday:ledgerOptionalDateLabel('2026/10/20')})))
    .toEqual({key:'2026-10-21',label:'今天',yesterday:'10/20'});
});

test('the time simulation box is read as Japan time',async({page})=>{
  await boot(page,'2026-10-20T11:00:00+08:00');
  expect(await page.evaluate(()=>{const input=document.createElement('input');input.id='diagTime';input.value='2026-10-21T08:00';document.body.appendChild(input);
    setTimeSimulation();const result={today:todayMD(),minutes:currentMinutes()};endTimeSimulation(false);return result;}))
    .toEqual({today:'10/21',minutes:480});
});
