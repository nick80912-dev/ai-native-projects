/* v183 旅程結束回顧、記帳表單帳本與幣別收成一行、沒網路時的頂端狀態
   ============================================================
   Bar 2026-11-09 看完 UI/UX 建議後選「先修天氣地區，再做第1、2、3項」；2026-11-10 頂端狀態選字「離線版 · 時間」。
   - 旅程結束後首頁顯示「我的總花費」與「退稅」，點了打開明細；「清除並打包旅程」移到卡片最下方的文字按鈕。
   - 新增消費時「帳本」「幣別」收成一行「個人帳本 · JPY ⌄」，點開才出現原本兩排；沒設定匯率時直接提醒；編輯維持原樣。
   - 天氣地區不限日本（tests/weather-regions.test.js）；下載不到資料時頂端寫「離線版」（tests/atomic-sheet-sync.test.js）。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,date){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,date||'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(m=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    localStorage.removeItem(LEDGER_SETTINGS_BRIDGE_KEY);
    switchView('split');
  },[identity('Bar'),identity('Amy')]);
}
async function openPersonalForm(page,multi){
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await page.locator('#ledgerEntrySheet .ledger-entry-context').click();   // v183:帳本與幣別收成一行,先點開
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  if(multi)await page.evaluate(()=>setLedgerDraftMulti(true));
}
const sheet=page=>page.locator('#ledgerEntrySheet');
async function seed(page){
  await page.evaluate(()=>{
    const add=r=>personalLedgerRepository.add(Object.assign({member:'Bar',category:'購物',note:'',payMethod:'信用卡',inputCurrency:'JPY',priceMode:'included',taxRate:10,couponAmount:0,isProxy:false,proxyTarget:'',replacesRecordId:'',batchId:''},r));
    add({id:'m1',time:'2026-10-21T03:00:00.000Z',detail:'化粧水',storeName:'マツモトキヨシ',amountJpy:4400,amountTwd:924,isTaxFree:true,taxAmount:400});
    add({id:'d1',time:'2026-10-22T05:00:00.000Z',detail:'お菓子',storeName:'ドン・キホーテ',amountJpy:4180,amountTwd:878,isTaxFree:true,taxAmount:380});
    add({id:'n1',time:'2026-10-21T08:00:00.000Z',detail:'ラーメン',storeName:'一蘭',amountJpy:980,amountTwd:206,isTaxFree:false,taxAmount:89,category:'餐飲'});
  });
}

test('after the trip the home card is a recap with spend and refunds; packing is a quiet button at the bottom',async({page})=>{
  await boot(page,'2026-11-09T12:00:00+09:00');
  await seed(page);
  await page.evaluate(()=>{switchView('today');renderToday();});
  const home=page.locator('#endedTripHome');
  const rows=home.locator('.ended-recap-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('我的總花費');
  await expect(rows.nth(0)).toContainText('¥9,560');
  await expect(rows.nth(0)).toContainText('NT$2,008');
  await expect(rows.nth(1)).toContainText('待退 2 張 · ¥780');
  await expect(home.locator('.today-hero-actions button')).toHaveText(['查看完整行程 →']);
  await expect(home.locator('.ended-pack-button')).toHaveText('清除並打包旅程');
  /* 點退稅打開退稅清單 */
  await rows.nth(1).click();
  await expect(page.locator('#view-split')).toBeVisible();
  await expect(page.locator('.ledger-refund-tabs')).toBeVisible();
});

test('the recap leaves out refunds when there are none, and still works with no records',async({page})=>{
  await boot(page,'2026-11-09T12:00:00+09:00');
  await page.evaluate(()=>{switchView('today');renderToday();});
  const rows=page.locator('#endedTripHome .ended-recap-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('¥0');
});

test('a new expense shows the ledger and currency as one line until it is opened',async({page})=>{
  await boot(page);
  await page.evaluate(()=>openLedgerEntrySheet(false));
  const line=sheet(page).locator('.ledger-entry-context');
  await expect(line).toHaveAttribute('aria-expanded','false');
  await expect(sheet(page).locator('.ledger-entry-segments')).toHaveCount(0);
  await expect(line).toContainText(/^(個人|團體)帳本 · JPY/);
  /* 金額欄緊接在這一行下面 */
  const order=await page.evaluate(()=>{const line=document.querySelector('.ledger-entry-context').getBoundingClientRect(),amount=document.getElementById('ledgerAmount').getBoundingClientRect();return amount.top-line.bottom;});
  expect(order).toBeLessThan(80);
  await line.click();
  await expect(line).toHaveAttribute('aria-expanded','true');
  await sheet(page).locator('.ledger-sheet-choice',{hasText:'個人'}).click();
  await sheet(page).locator('.ledger-currency-option',{hasText:'TWD'}).click();
  await expect(line).toHaveText(/個人帳本 · TWD/);
  await expect(sheet(page).locator('.ledger-entry-segments')).toBeVisible();
  await line.click();
  await expect(sheet(page).locator('.ledger-entry-segments')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('a missing exchange rate is still flagged right away; editing keeps the old layout',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{DB.cfg.exchangeRate='';openLedgerEntrySheet(false);});
  await expect(sheet(page).locator('.ledger-entry-context')).toHaveAttribute('aria-expanded','false');
  await expect(sheet(page).locator('.ledger-rate-missing')).toContainText('還沒設定匯率');
  await page.evaluate(()=>closeLedgerEntrySheet());
  await seed(page);
  await page.evaluate(()=>{switchView('split');editLedgerRecord('m1');});
  await expect(sheet(page).locator('.ledger-entry-context')).toHaveCount(0);
  await expect(sheet(page).locator('.ledger-entry-segment-static')).toContainText('編輯不可切換');
});
