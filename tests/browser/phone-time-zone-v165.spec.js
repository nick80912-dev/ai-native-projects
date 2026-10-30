/* v165（Bar 2026-10-30）：時間不要一律指定時區，因為不一定都是去日本 —— 行程與記帳的
   「今天幾號、現在幾點」跟手機的時區走。v164 曾固定用日本時間，這裡鎖住退回後的行為：
   同一個時間點，手機設在台灣與設在日本，看到的是各自手機的時間。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,when){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when);
  await openApp(page);
  await waitForSyncToSettle(page);
}

/* 台灣 10/22 23:30 ＝ 日本 10/23 00:30 */
const LATE='2026-10-22T23:30:00+08:00';

test.describe('phone set to Taiwan time',()=>{
  test.use({timezoneId:'Asia/Taipei'});
  test('today and now follow the phone, not a fixed Japan time',async({page})=>{
    await boot(page,LATE);
    expect(await page.evaluate(()=>({phoneOffset:new Date().getTimezoneOffset(),today:todayMD(),minutes:currentMinutes(),ended:tripHasEnded()})))
      .toEqual({phoneOffset:-480,today:'10/22',minutes:23*60+30,ended:false});
    expect(await page.evaluate(()=>typeof tripNow)).toBe('undefined');
  });
  test('a new expense defaults to the phone date and time and is saved as the real moment',async({page})=>{
    await boot(page,'2026-10-20T11:00:00+08:00');
    await page.evaluate(m=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;switchView('split');openLedgerEntrySheet(false);},[identity('Bar')]);
    await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
    expect(await page.evaluate(()=>({date:ledgerUiState.draft.occurredDate,time:ledgerUiState.draft.occurredTime}))).toEqual({date:'2026/10/20',time:'11:00'});
    await page.locator('#ledgerAmount').fill('800');
    await page.locator('#ledgerDetail').fill('拉麵');
    await page.evaluate(()=>saveLedgerEntry(false));
    await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
    expect(await page.evaluate(()=>{const record=personalLedgerRepository.all().filter(item=>item.detail==='拉麵')[0];
      return {time:record.time,shown:formatLedgerLocalOccurrence(record.time)};}))
      .toEqual({time:'2026-10-20T03:00:00.000Z',shown:'2026/10/20 11:00'});
  });
});

test.describe('phone set to Japan time',()=>{
  test.use({timezoneId:'Asia/Tokyo'});
  test('the same moment is already the next day on a phone in Japan',async({page})=>{
    await boot(page,LATE);
    expect(await page.evaluate(()=>({today:todayMD(),minutes:currentMinutes()}))).toEqual({today:'10/23',minutes:30});
  });
});
