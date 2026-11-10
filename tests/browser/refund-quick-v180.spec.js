/* v180 可退稅移到金額下方，勾了跳出稅額視窗
   ============================================================
   Bar 2026-11-03「可退稅按鈕改置上方，避免一些手key的單據漏掉可退稅與輸入稅額」、
   「勾選後改成跳出輸入稅額的視窗供輸入」、「看收據上的⋯⋯那行說明可以拿掉」：
   單品項的「可退稅」在金額正下方（不用打開其他資訊）；勾了跳出稅額視窗，空白照稅率估算，取消就不勾；
   填好後旁邊顯示「稅額 ¥X ✎」，點了再改。多品項勾第一項時輸入整張的稅額，品項下方顯示。
   v181（Bar 2026-11-09「將可退稅按鈕移至計算機旁」「稅額欄位縮排至明細那欄靠右對齊，避免表單再變長」）：
   可退稅在金額標題列、計算機左邊；稅額放在「明細」標題同一列靠右，表單不多一列。
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
const dialog=page=>page.locator('#ledgerTaxDialog');

test('a single entry shows 可退稅 under the amount and asks for the tax in a dialog',async({page})=>{
  await boot(page);
  await openPersonalForm(page,false);
  await sheet(page).locator('#ledgerAmount').fill('1080');
  await sheet(page).locator('#ledgerDetail').fill('お菓子');
  /* 不用打開「其他資訊」就看得到 */
  await expect(sheet(page).locator('#ledgerOptionalFields')).toBeHidden();
  const toggle=sheet(page).locator('.ledger-single-primary .ledger-single-refundable');
  await expect(toggle).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await toggle.click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('h3')).toHaveText('可退稅：輸入稅額');
  await expect(dialog(page)).not.toContainText('看收據上的');
  await expect(dialog(page).locator('#ledgerTaxDialogAmount')).toBeFocused();
  await expect(dialog(page).locator('#ledgerTaxDialogAmount')).toHaveAttribute('placeholder','98');
  await dialog(page).locator('#ledgerTaxDialogAmount').fill('80');
  await dialog(page).getByRole('button',{name:'確定'}).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toContainText('稅額 ¥80');
  /* v181:可退稅在計算機左邊,稅額在「明細」標題列靠右,明細輸入框的位置不因稅額往下移 */
  await expect(sheet(page).locator('.ledger-amount-field-head .ledger-single-refundable + .ledger-calculator-trigger')).toHaveCount(1);
  await expect(sheet(page).locator('.ledger-detail-head #ledgerRefundTaxChip')).toBeVisible();
  const rows=await page.evaluate(()=>{const label=document.querySelector('.ledger-detail-head label').getBoundingClientRect(),chip=document.getElementById('ledgerRefundTaxChip').getBoundingClientRect(),detail=document.getElementById('ledgerDetail').getBoundingClientRect(),field=document.getElementById('ledgerDetail').closest('.ledger-sheet-field').getBoundingClientRect();return {sameRow:Math.abs((label.top+label.bottom)/2-(chip.top+chip.bottom)/2)<4,rightAligned:Math.abs(chip.right-detail.right)<2,chipAboveInput:chip.bottom<=detail.top+1,overflow:document.documentElement.scrollWidth>window.innerWidth,fieldTop:field.top};});
  expect(rows).toMatchObject({sameRow:true,rightAligned:true,chipAboveInput:true,overflow:false});
  /* 下方的稅區塊不再重複稅額欄與可退稅 */
  await page.evaluate(()=>toggleLedgerEntryDetails());
  await expect(sheet(page).locator('#ledgerOptionalFields #ledgerTaxAmount')).toHaveCount(0);
  await expect(sheet(page).locator('.ledger-single-refundable')).toHaveCount(1);
  /* 點稅額再改一次 */
  await sheet(page).locator('#ledgerRefundTaxChip').click();
  await expect(dialog(page).locator('#ledgerTaxDialogAmount')).toHaveValue('80');
  await dialog(page).locator('#ledgerTaxDialogAmount').fill('75');
  await dialog(page).locator('#ledgerTaxDialogAmount').press('Enter');
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toContainText('稅額 ¥75');
  const saved=await page.evaluate(()=>{saveLedgerEntry(false);return personalLedgerRepository.all().filter(r=>r.detail==='お菓子').map(r=>[r.amountJpy,r.taxAmount,r.isTaxFree]);});
  expect(saved).toEqual([[1080,75,true]]);
});

test('cancel unticks 可退稅; a blank tax amount is estimated from the rate and follows the amount',async({page})=>{
  await boot(page);
  await openPersonalForm(page,false);
  await sheet(page).locator('#ledgerAmount').fill('1080');
  const toggle=sheet(page).locator('.ledger-single-refundable');
  await toggle.click();
  await dialog(page).getByRole('button',{name:'取消'}).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(toggle.locator('input')).not.toBeChecked();
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toHaveCount(0);
  /* 誤點視窗外面只關視窗、不取消勾選 */
  await toggle.click();
  await dialog(page).click({position:{x:5,y:5}});
  await expect(dialog(page)).toHaveCount(0);
  await expect(sheet(page).locator('.ledger-single-refundable input')).toBeChecked();
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toContainText('稅額 約 ¥98');
  await sheet(page).locator('#ledgerAmount').fill('2200');
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toContainText('稅額 約 ¥200');
  /* 不合理的稅額不收 */
  await sheet(page).locator('#ledgerRefundTaxChip').click();
  await dialog(page).locator('#ledgerTaxDialogAmount').fill('-5');
  await dialog(page).getByRole('button',{name:'確定'}).click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('#toast')).toContainText('稅額格式錯誤');
  /* 關掉表單時視窗一起關 */
  await page.evaluate(()=>closeLedgerEntrySheet());
  await expect(dialog(page)).toHaveCount(0);
});

test('a multi-item bill asks for the whole receipt tax once and shows it under the items',async({page})=>{
  await boot(page);
  await openPersonalForm(page,true);
  await page.evaluate(()=>{
    const d=ledgerUiState.draft;d.storeName='マツモトキヨシ';addLedgerDraftItem();
    [['化粧水','4000'],['目薬','1000']].forEach((row,i)=>updateLedgerDraftItem(d.items[i].key,{name:row[0],amount:row[1]}));renderLedgerEntrySheet();
  });
  const flag=index=>sheet(page).locator('.ledger-item-editor').nth(index).locator('.ledger-item-flag',{hasText:'可退稅'});
  await expect(sheet(page).locator('#ledgerRefundTaxChip')).toHaveCount(0);
  /* 第一次勾，取消就把那一項取消 */
  await flag(0).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button',{name:'取消'}).click();
  await expect(flag(0).locator('input')).not.toBeChecked();
  await flag(0).click();
  await expect(dialog(page).locator('#ledgerTaxDialogAmount')).toHaveAttribute('placeholder','455');
  await dialog(page).locator('#ledgerTaxDialogAmount').fill('450');
  await dialog(page).getByRole('button',{name:'確定'}).click();
  await expect(sheet(page).locator('.ledger-refund-quick-multi #ledgerRefundTaxChip')).toContainText('稅額 ¥450');
  /* 再勾別的品項不再跳出來 */
  await flag(1).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(flag(1).locator('input')).toBeChecked();
  /* 「稅（選填）」裡不重複稅額欄 */
  await page.evaluate(()=>toggleLedgerTaxPanel());
  await expect(sheet(page).locator('.ledger-disclosure-body #ledgerTaxAmount')).toHaveCount(0);
  const saved=await page.evaluate(()=>{saveLedgerEntry(false);return personalLedgerRepository.all().filter(r=>r.storeName==='マツモトキヨシ').map(r=>[r.amountJpy,r.taxAmount,r.isTaxFree]);});
  expect(saved.reduce((sum,row)=>sum+row[1],0)).toBe(450);
  expect(saved.every(row=>row[2])).toBe(true);
});

test('a trip without tax-free shows no 可退稅 under the amount',async({page})=>{
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(m=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    localStorage.removeItem(LEDGER_SETTINGS_BRIDGE_KEY);
    Object.assign(DB.cfg,{currency:'THB',exchangeRate:'0.9',ledgerDefaultCurrency:'THB',taxRates:'7',taxPriceMode:'未稅',taxFree:'no'});
    switchView('split');
  },[identity('Bar'),identity('Amy')]);
  await openPersonalForm(page,false);
  await expect(sheet(page).locator('.ledger-refund-quick')).toHaveCount(0);
});
