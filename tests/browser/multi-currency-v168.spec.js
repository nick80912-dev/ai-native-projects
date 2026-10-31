/* v168（backlog #62）不限日本：當地幣別、記到分、在手機補填匯率
   ============================================================
   Bar 2026-10-31：結算一律台幣；一趟一種當地幣別（TripConfig Currency，沒填是 JPY）；
   美金、歐元這類有小數的幣別記到分；試算表沒填匯率時可以在手機補填當作全團基準。
   這裡把開好的 App 的 TripConfig 換成美金／韓元旅程（或拿掉匯率），用真的表單與畫面驗證。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,cfg){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(([m,patch])=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    localStorage.removeItem(LEDGER_SETTINGS_BRIDGE_KEY);
    Object.assign(DB.cfg,patch||{});
    switchView('split');
  },[[identity('Bar'),identity('Amy')],cfg]);
}
async function openPersonalForm(page){
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
}

test('a USD trip records to the cent and shows US$',async({page})=>{
  await boot(page,{currency:'USD',exchangeRate:'32',ledgerDefaultCurrency:'USD'});
  await openPersonalForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-currency-option')).toHaveText(['USD','TWD']);
  await expect(page.locator('#ledgerEntrySheet .ledger-rate')).toHaveText('1 USD = NT$32');
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('inputmode','decimal');
  await expect(page.locator('#ledgerEntrySheet label[for="ledgerAmount"]')).toContainText('金額 (US$)');
  await page.locator('#ledgerAmount').fill('12.50');
  await expect(page.locator('#ledgerConvertedPreview')).toHaveText('≈ NT$400');
  await page.locator('#ledgerDetail').fill('漢堡');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const record=await page.evaluate(()=>personalLedgerRepository.all().filter(item=>item.detail==='漢堡')[0]);
  expect([record.amountJpy,record.amountTwd,record.inputCurrency]).toEqual([1250,400,'JPY']);
  await expect(page.locator('#view-split').getByText('US$12.50').first()).toBeVisible();
  /* 再打開編輯，金額顯示 12.50 */
  await page.evaluate(id=>editLedgerRecord(id),record.id);
  await expect(page.locator('#ledgerAmount')).toHaveValue('12.50');
});

test('switching to TWD and back converts the typed amount',async({page})=>{
  await boot(page,{currency:'USD',exchangeRate:'32',ledgerDefaultCurrency:'USD'});
  await openPersonalForm(page);
  await page.locator('#ledgerAmount').fill('12.50');
  await page.locator('#ledgerEntrySheet .ledger-currency-option',{hasText:'TWD'}).click();
  await expect(page.locator('#ledgerAmount')).toHaveValue('400');
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('inputmode','numeric');
  await page.locator('#ledgerEntrySheet .ledger-currency-option',{hasText:'USD'}).click();
  await expect(page.locator('#ledgerAmount')).toHaveValue('12.50');
});

test('the Sheet and Apps Script see ordinary amounts and real currency codes',async({page})=>{
  await boot(page,{currency:'USD',exchangeRate:'32',ledgerDefaultCurrency:'USD'});
  const result=await page.evaluate(()=>{
    const wire=ledgerRecordForWire({id:'r1',amountJpy:1250,amountTwd:400,inputCurrency:'JPY',couponAmount:50});
    const head=ledgerSheetHeaders();
    const row=head.map(header=>({'紀錄ID':'r1','時間':'2026-10-21T03:00:00.000Z','成員':'Bar','類別':'餐飲','明細':'漢堡','日幣':'12.5','台幣':'400','輸入幣別':'USD','優惠券金額':'0.5'}[header]||''));
    const parsed=parseLedgerSheetCsv(head.join(',')+'\n'+row.join(',')+'\n')[0];
    return {wire:[wire.amountJpy,wire.amountTwd,wire.inputCurrency,wire.couponAmount],parsed:[parsed.amountJpy,parsed.amountTwd,parsed.inputCurrency,parsed.couponAmount]};
  });
  expect(result).toEqual({wire:[12.5,400,'USD',0.5],parsed:[1250,400,'JPY',50]});
});

test('a USD group entry is sent to Apps Script as 12.5 USD',async({page})=>{
  await boot(page,{currency:'USD',exchangeRate:'32',ledgerDefaultCurrency:'USD'});
  const sent=await page.evaluate(async()=>{
    const bodies=[];
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>true});}catch(ignore){}
    window.fetch=(input,init)=>{
      if(init&&init.method==='POST'){bodies.push(JSON.parse(init.body));return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200}));}
      return Promise.reject(new TypeError('QA_OFFLINE'));
    };
    const record={id:'1792378800000-usd1',time:new Date().toISOString(),member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:1250,amountTwd:400,note:'',participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:0,couponAmount:0};
    ledgerRepository.enqueueBatch([record]);
    for(let i=0;i<60&&!bodies.length;i++)await new Promise(resolve=>setTimeout(resolve,50));
    const body=bodies.filter(item=>item.id===record.id)[0]||{};
    return [body.amountJpy,body.amountTwd,body.inputCurrency,ledgerRepository.queuedRecords().length];
  });
  expect(sent).toEqual([12.5,400,'USD',0]);
});

test('a KRW trip names its currency in settings and keeps whole numbers',async({page})=>{
  await boot(page,{currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'});
  await page.evaluate(()=>openSettings('ledger'));
  const panel=page.locator('#settingsOverlay');
  await expect(panel).toContainText('目前匯率：1 KRW = NT$0.024');
  await expect(panel).toContainText('1 韓元可換算多少台幣');
  await expect(panel.locator('.settings-currency-option').first()).toHaveText('KRW 韓元');
  await page.evaluate(()=>closeSettings());
  await openPersonalForm(page);
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('inputmode','numeric');
  await page.locator('#ledgerAmount').fill('12000');
  await expect(page.locator('#ledgerConvertedPreview')).toHaveText('≈ NT$288');
  expect(await page.evaluate(()=>formatLedgerCurrencyAmount('JPY',12000))).toBe('₩12,000');
});

test('without an exchange rate the form opens and points to the settings',async({page})=>{
  await boot(page,{exchangeRate:''});
  await openPersonalForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-rate-missing')).toContainText('還沒設定匯率');
  await page.locator('#ledgerAmount').fill('800');
  await page.locator('#ledgerDetail').fill('拉麵');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#toast')).toContainText('匯率未設定');
  expect(await page.evaluate(()=>personalLedgerRepository.all().filter(item=>item.detail==='拉麵').length)).toBe(0);
  await page.getByRole('button',{name:'去設定'}).click();
  await expect(page.locator('#settingsOverlay')).toContainText('目前匯率：未設定（請在下面填寫，存下後全團共用）');
  await expect(page.locator('#ledgerExchangeRate')).toBeVisible();
});

test('the Okayama trip (JPY) looks exactly as before',async({page})=>{
  await boot(page,null);
  expect(await page.evaluate(()=>[tripLocalCurrencyCode(),formatLedgerCurrencyAmount('JPY',1500),formatLedgerCurrencyAmount('TWD',315)])).toEqual(['JPY','¥1,500','NT$315']);
  await openPersonalForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-currency-option')).toHaveText(['JPY','TWD']);
  await expect(page.locator('#ledgerEntrySheet .ledger-rate')).toHaveText(/^1 JPY = NT\$[\d.]+$/);
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('inputmode','numeric');
  await page.evaluate(()=>closeLedgerEntrySheet());
  await page.evaluate(()=>openSettings('ledger'));
  await expect(page.locator('#settingsOverlay')).toContainText('1 日幣可換算多少台幣');
  await expect(page.locator('#settingsOverlay .settings-currency-option').first()).toHaveText('JPY 日幣');
});
