/* v169（backlog #62）稅每趟自己設定；簡易結算模式的說明收進「!」
   ============================================================
   Bar 2026-10-31：TripConfig 的 Tax Rates（例如 10,8）、Price Mode（含稅／未稅）、Tax Free（yes／no）；
   不需要稅的旅程不顯示稅的選項；日本旅程沒填時維持原樣。
   同一批：「簡易結算模式下的說明變成！點開的資訊顯示就好」。
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
async function openPersonalMultiForm(page){
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  await page.evaluate(()=>setLedgerDraftMulti(true));
}
/* v178(Bar 2026-11-01):「稅與優惠券」改成「稅」,優惠券欄換成稅額;「免稅品」改叫「可退稅」 */
async function openTaxPanel(page){
  await page.locator('#ledgerEntrySheet .ledger-disclosure-toggle').filter({hasText:'稅（選填）'}).click();
}
const sheet=page=>page.locator('#ledgerEntrySheet');

test('the Okayama trip (JPY, nothing filled) keeps 税込／税抜 and 8%／10%, with 可退稅 and a tax amount field',async({page})=>{
  await boot(page,null);
  await openPersonalMultiForm(page);
  await expect(sheet(page).locator('.ledger-item-flag',{hasText:'可退稅'})).toHaveCount(1);
  await openTaxPanel(page);
  await expect(sheet(page).locator('.ledger-disclosure-toggle').filter({hasText:'稅'})).toHaveText(/^稅（選填）/);
  await expect(sheet(page).locator('#ledgerTaxAmount')).toBeVisible();
  await expect(sheet(page).locator('#ledgerDiscount')).toHaveCount(0);
  await expect(sheet(page).locator('.ledger-disclosure-body .ledger-segment').nth(0).locator('button')).toHaveText(['税込（含稅）','税抜（未稅）']);
  await expect(sheet(page).locator('.ledger-disclosure-body .ledger-segment').nth(1).locator('button')).toHaveText(['無稅','8%','10%','自訂']);
  await expect(sheet(page).getByRole('button',{name:'10%'})).toHaveAttribute('aria-pressed','true');
  await expect(sheet(page).getByRole('button',{name:/全部/})).toHaveCount(0);
});

test('a trip without tax rates shows no tax options and records no tax',async({page})=>{
  await boot(page,{currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'});
  await openPersonalMultiForm(page);
  await expect(sheet(page).locator('.ledger-item-flag',{hasText:'可退稅'})).toHaveCount(0);
  /* 沒有稅、優惠券欄也拿掉了:整個區塊不顯示 */
  await expect(sheet(page).locator('.ledger-disclosure-toggle').filter({hasText:'選填'})).toHaveText([/^更多細節/]);
  await expect(sheet(page).locator('#ledgerDiscount')).toHaveCount(0);
  await expect(sheet(page).locator('#ledgerTaxAmount')).toHaveCount(0);
  const records=await page.evaluate(()=>{
    const draft=ledgerUiState.draft;draft.storeName='明洞小吃';
    draft.items[0].name='辣炒年糕';draft.items[0].amount='12000';
    saveLedgerEntry(false);
    return personalLedgerRepository.all().filter(item=>item.detail==='辣炒年糕').map(item=>[item.amountJpy,item.taxRate,item.isTaxFree,item.priceMode]);
  });
  expect(records).toEqual([[12000,0,false,'included']]);
  /* 單品項也沒有「稅」區塊(v178 起沒有優惠券欄) */
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  await page.evaluate(()=>{ledgerUiState.draft.entryDetailsOpen=true;renderLedgerEntrySheet();});
  await expect(sheet(page).locator('.ledger-optional-section-title',{hasText:/稅|優惠券/})).toHaveCount(0);
  await expect(sheet(page)).not.toContainText('價格方式');
  /* 歷史篩選不出現「免稅品」，之前選過的免稅篩選也不再生效 */
  await page.evaluate(()=>closeLedgerEntrySheet());
  const history=await page.evaluate(()=>{
    ledgerUiWorkflow.dispatch({type:'set-history-tax',value:'non-tax-exempt'});
    const record={id:'tf-1',time:'2026-10-21T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'免稅舊帳',amountJpy:1000,amountTwd:24,note:'',payMethod:'現金',isTaxFree:true};
    return {kept:ledgerHistoryFilteredRecords([record]).length};
  });
  expect(history.kept).toBe(1);
});

test('a trip with its own rate, 未稅 by default and no tax-free',async({page})=>{
  await boot(page,{currency:'THB',exchangeRate:'0.9',ledgerDefaultCurrency:'THB',taxRates:'7',taxPriceMode:'未稅',taxFree:'no'});
  await openPersonalMultiForm(page);
  await expect(sheet(page).locator('.ledger-item-flag',{hasText:'可退稅'})).toHaveCount(0);
  await openTaxPanel(page);
  await expect(sheet(page).locator('.ledger-disclosure-body .ledger-segment').nth(0).locator('button')).toHaveText(['含稅','未稅']);
  await expect(sheet(page).getByRole('button',{name:'未稅',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(sheet(page).locator('.ledger-disclosure-body .ledger-segment').nth(1).locator('button')).toHaveText(['無稅','7%','自訂']);
  await expect(sheet(page).getByRole('button',{name:'7%'})).toHaveAttribute('aria-pressed','true');
  await expect(sheet(page).locator('.ledger-single-refundable')).toHaveCount(0);
  const records=await page.evaluate(()=>{
    const draft=ledgerUiState.draft;draft.storeName='7-Eleven';
    draft.items[0].name='泰式奶茶';draft.items[0].amount='100';
    saveLedgerEntry(false);
    return personalLedgerRepository.all().filter(item=>item.detail==='泰式奶茶').map(item=>[item.amountJpy,item.taxRate,item.priceMode,item.isTaxFree]);
  });
  /* 未稅 ฿100 加 7% ＝ ฿107.00（內部以「分」記 10700） */
  expect(records).toEqual([[10700,7,'excluded',false]]);
});

test('a Japan trip may list its own rates; editing keeps an unlisted old rate as 自訂',async({page})=>{
  await boot(page,{taxRates:'8,10'});
  await openPersonalMultiForm(page);
  await openTaxPanel(page);
  await expect(sheet(page).getByRole('button',{name:'8%'})).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>closeLedgerEntrySheet());
  const draft=await page.evaluate(()=>{
    const draft=ledgerDraftFromRecords([{id:'old-1',time:'2026-10-20T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'舊帳',amountJpy:1050,amountTwd:220,note:'',payMethod:'現金',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:5,couponAmount:0}],'personal');
    return [draft.taxPreset,draft.customTaxRate];
  });
  expect(draft).toEqual(['custom','5']);
});

test('the simple settlement explanation opens from the ! button',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{localStorage.setItem(SIMPLE_SETTLEMENT_MODE_KEY,'true');openLedgerSettlementPanel();});
  const panel=page.locator('#ledgerSettlementPanelBody');
  const button=panel.getByRole('button',{name:'簡易結算模式說明'});
  await expect(button).toHaveText('!');
  await expect(button).toHaveAttribute('aria-expanded','false');
  await expect(panel.locator('#simpleSettlementHelp')).toBeHidden();
  expect(await panel.innerText()).not.toContain('簡易結算模式已開啟');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded','true');
  await expect(panel.locator('#simpleSettlementHelp')).toBeVisible();
  await expect(panel.locator('#simpleSettlementHelp')).toContainText('只看轉帳建議');
  const box=await button.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  /* 面板重畫後維持打開，再按一次收起 */
  await page.evaluate(()=>refreshSettlementSurfaces());
  await expect(page.locator('#simpleSettlementHelp')).toBeVisible();
  await page.locator('#simpleSettlementHelpButton').click();
  await expect(page.locator('#simpleSettlementHelp')).toBeHidden();
});

/* v174(Bar 2026-10-31「設定內的簡易結算模式下的說明並未改成!資訊」) */
test('the settings row for simple settlement keeps its explanation behind a ! button',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>openSettings());
  const overlay=page.locator('#settingsOverlay');
  const button=overlay.getByRole('button',{name:'簡易結算模式說明'});
  await expect(button).toHaveText('!');
  await expect(overlay.locator('#settingsSimpleHelp')).toBeHidden();
  expect(await overlay.innerText()).not.toContain('只看轉帳建議');
  const box=await button.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  /* 按「!」只開說明,不會切換簡易結算模式 */
  await button.click();
  await expect(overlay.locator('#settingsSimpleHelp')).toBeVisible();
  await expect(overlay.locator('#settingsSimpleHelp')).toContainText('只看轉帳建議');
  expect(await page.evaluate(()=>isSimpleSettlementMode())).toBe(false);
  /* 開關照常可用 */
  await overlay.getByRole('checkbox',{name:'簡易結算模式（保留已確認結清）'}).check();
  expect(await page.evaluate(()=>isSimpleSettlementMode())).toBe(true);
});
