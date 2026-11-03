/* v178（backlog #63）退稅追蹤；「稅與優惠券」改成「稅」
   ============================================================
   Bar 2026-10-31～11-01：日本 11/1 起免稅店先收稅、出境後才退。記帳的優惠券欄換成「稅額」（收據帶入，
   沒有收據照稅率算，可改；税抜時實付＝品項加總＋稅額），說明收進「!」；「免稅品」改叫「可退稅」；
   個人帳的退稅清單；v179 起分成待退／已退／不退，點一張在小視窗決定已退（可改實際退了多少）或不退，已退的從花費扣掉；
   離境當天在 TODAY 卡片下方提醒，不另外加卡片。個人帳只存在手機，不動試算表。
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
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  if(multi)await page.evaluate(()=>setLedgerDraftMulti(true));
}
const sheet=page=>page.locator('#ledgerEntrySheet');

test('a multi-item 税抜 bill adds the tax amount; a blank tax amount falls back to the rate',async({page})=>{
  await boot(page);
  await openPersonalForm(page,true);
  await page.evaluate(()=>{
    const d=ledgerUiState.draft;d.storeName='マツモトキヨシ';addLedgerDraftItem();addLedgerDraftItem();
    [['化粧水','4000'],['日焼け止め','2000'],['目薬','1000']].forEach((row,i)=>updateLedgerDraftItem(d.items[i].key,{name:row[0],amount:row[1]}));
    d.priceMode='excluded';d.taxPanelOpen=true;renderLedgerEntrySheet();
  });
  /* 沒填稅額:照 10% 算,欄位提示顯示算出來的 700 */
  await expect(sheet(page).locator('#ledgerTaxAmount')).toHaveAttribute('placeholder','700');
  await expect(sheet(page).locator('#ledgerBillPreview')).toContainText('整單實付 ¥7,700');
  /* 收據上的稅額(8%＋10% 合計)和稅率算的不一樣時,用填的 */
  await sheet(page).locator('#ledgerTaxAmount').fill('690');
  await expect(sheet(page).locator('#ledgerBillPreview')).toContainText('整單實付 ¥7,690');
  /* 說明收在「!」裡 */
  await expect(sheet(page).locator('#ledgerTaxHelp')).toBeHidden();
  await sheet(page).getByRole('button',{name:'稅額說明'}).click();
  await expect(sheet(page).locator('#ledgerTaxHelp')).toBeVisible();
  await expect(sheet(page).locator('#ledgerTaxHelp')).toContainText('實付＝品項加總＋稅額');
  /* 優惠券欄與「全部免稅品」都沒有了 */
  await expect(sheet(page).locator('#ledgerDiscount')).toHaveCount(0);
  await expect(sheet(page).getByRole('button',{name:/全部/})).toHaveCount(0);
  const saved=await page.evaluate(()=>{
    ledgerUiState.draft.items[0].taxExempt=true;saveLedgerEntry(false);
    return personalLedgerRepository.all().filter(r=>r.storeName==='マツモトキヨシ').map(r=>({detail:r.detail,amount:r.amountJpy,tax:r.taxAmount,refundable:r.isTaxFree}));
  });
  expect(saved.reduce((sum,row)=>sum+row.amount,0)).toBe(7690);
  expect(saved.reduce((sum,row)=>sum+row.tax,0)).toBe(690);
  /* 可退稅的品項一樣付了稅 */
  expect(saved.find(row=>row.detail==='化粧水')).toEqual({detail:'化粧水',amount:4394,tax:394,refundable:true});
});

test('a single entry has a 可退稅 checkbox and works out its tax from the amount',async({page})=>{
  await boot(page);
  await openPersonalForm(page,false);
  await page.evaluate(()=>{const d=ledgerUiState.draft;d.amount='1080';d.detail='お菓子';d.taxPreset='8';d.entryDetailsOpen=true;renderLedgerEntrySheet();});
  await expect(sheet(page).locator('.ledger-optional-section-title',{hasText:'稅'})).toHaveText('稅');
  await expect(sheet(page).locator('#ledgerTaxAmount')).toHaveAttribute('placeholder','80');
  await sheet(page).locator('.ledger-single-refundable input').check();
  const saved=await page.evaluate(()=>{saveLedgerEntry(false);return personalLedgerRepository.all().filter(r=>r.detail==='お菓子').map(r=>[r.amountJpy,r.taxAmount,r.isTaxFree]);});
  expect(saved).toEqual([[1080,80,true]]);
});

test('an old entry with a coupon keeps it, shown as read-only',async({page})=>{
  await boot(page);
  const html=await page.evaluate(()=>{
    const draft=ledgerDraftFromRecords([{id:'old-c',time:'2026-10-20T03:00:00.000Z',member:'Bar',category:'購物',detail:'舊帳',amountJpy:900,amountTwd:190,note:'',payMethod:'現金',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:10,couponAmount:100}],'personal');
    return renderLedgerTaxFields(draft);
  });
  expect(html).toContain('優惠券 ¥100（舊資料，維持不變）');
  expect(html).not.toContain('ledgerDiscount');
});

/* 兩張可退稅的收據、一張已退、一張不能退 */
async function seedRefunds(page){
  await page.evaluate(()=>{
    const add=r=>personalLedgerRepository.add(Object.assign({member:'Bar',category:'購物',note:'',payMethod:'信用卡',inputCurrency:'JPY',priceMode:'excluded',taxRate:10,couponAmount:0,isProxy:false,proxyTarget:'',replacesRecordId:''},r));
    add({id:'m1',time:'2026-10-21T03:00:00.000Z',detail:'化粧水',storeName:'マツモトキヨシ',batchId:'batch-m',amountJpy:4400,amountTwd:924,isTaxFree:true,taxAmount:400});
    add({id:'m2',time:'2026-10-21T03:00:00.000Z',detail:'目薬',storeName:'マツモトキヨシ',batchId:'batch-m',amountJpy:3300,amountTwd:693,isTaxFree:true,taxAmount:300});
    add({id:'d1',time:'2026-10-22T05:00:00.000Z',detail:'お菓子',storeName:'ドン・キホーテ',batchId:'',amountJpy:4180,amountTwd:878,isTaxFree:true,taxAmount:380});
    add({id:'b1',time:'2026-10-20T05:00:00.000Z',detail:'イヤホン',storeName:'ビックカメラ',batchId:'',amountJpy:7700,amountTwd:1617,isTaxFree:true,taxAmount:700,refundAmount:640,refundMethod:'信用卡',refundDate:'2026/10/24'});
    add({id:'n1',time:'2026-10-21T08:00:00.000Z',detail:'ラーメン',storeName:'一蘭',batchId:'',amountJpy:980,amountTwd:206,isTaxFree:false,taxAmount:89,category:'餐飲'});
    renderSplit();
  });
}

/* v179(Bar 2026-11-03):退稅清單分成待退／已退／不退;不用勾選框,點一張在小視窗決定「已退」(可改實際退了多少)或「不退」 */
test('the refund list has tabs; tapping a receipt decides 已退 with the actual amount',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await boot(page);
  await seedRefunds(page);
  const spendBefore=await page.evaluate(()=>myTripSpendSnapshot().total.amountJpy);
  const row=page.locator('.ledger-summary-refund');
  await expect(row).toContainText('待退 2 張');
  await expect(row).toContainText('¥1,080');
  await row.click();
  const panel=page.locator('#ledgerInfoSheet');
  await expect(panel.getByRole('tab',{name:'待退 2'})).toHaveAttribute('aria-selected','true');
  await expect(panel.getByRole('tab',{name:'已退 1'})).toHaveAttribute('aria-selected','false');
  await expect(panel.getByRole('tab',{name:'不退 0'})).toBeVisible();
  await expect(panel.locator('#ledgerRefundPending .ledger-refund-pending-row')).toHaveCount(2);
  await expect(panel.locator('.ledger-refund-hero')).toContainText('¥1,080');
  /* 說明收在「!」 */
  await expect(panel.locator('#ledgerRefundHelp')).toBeHidden();
  await panel.getByRole('button',{name:'退稅說明'}).click();
  await expect(panel.locator('#ledgerRefundHelp')).toBeVisible();
  /* 清單沒有勾選框也沒有輸入框 */
  await expect(panel.locator('input')).toHaveCount(0);
  const first=panel.locator('#ledgerRefundPending .ledger-refund-pending-row').first();
  await expect(first).toContainText('マツモトキヨシ');
  await expect(first).toContainText('稅額 ¥700');
  const box=await first.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.height).toBeLessThan(80);
  /* 點一張:實際退了預設＝稅額;改成 650 按「已退」,照稅額 400:300 分到兩個品項 */
  await first.click();
  const dialog=page.getByRole('dialog',{name:/マツモトキヨシ/});
  await expect(dialog).toContainText('稅額 ¥700');
  await expect(dialog.locator('#ledgerRefundEditAmount')).toHaveValue('700');
  await dialog.locator('#ledgerRefundEditAmount').fill('650');
  await dialog.getByRole('button',{name:'已退',exact:true}).click();
  await expect(page.locator('#ledgerRefundEditDialog')).toHaveCount(0);
  await expect(panel.locator('#ledgerRefundPending .ledger-refund-pending-row')).toHaveCount(1);
  await expect(panel.getByRole('tab',{name:'已退 2'})).toBeVisible();
  expect(await page.evaluate(()=>personalLedgerRepository.all().filter(r=>r.batchId==='batch-m').map(r=>[r.id,r.refundAmount]).sort())).toEqual([['m1',371],['m2',279]]);
  expect(spendBefore-await page.evaluate(()=>myTripSpendSnapshot().total.amountJpy)).toBe(650);
  await expect(page.locator('.ledger-summary-refund')).toContainText('待退 1 張');
  /* 已退分頁:一張一行「稅額／實退」 */
  await panel.getByRole('tab',{name:'已退 2'}).click();
  const done=panel.locator('#ledgerRefundDone .ledger-refund-done-row',{hasText:'マツモトキヨシ'});
  await expect(done).toContainText('稅額 ¥700');
  await expect(done).toContainText('實退 ¥650');
  await expect(panel.locator('.ledger-refund-hero')).toContainText('¥1,290');
  /* 已退點一張可以再改金額 */
  await done.click();
  await page.getByRole('dialog',{name:/マツモトキヨシ/}).locator('#ledgerRefundEditAmount').fill('700');
  await page.getByRole('dialog',{name:/マツモトキヨシ/}).getByRole('button',{name:'儲存'}).click();
  await expect(panel.locator('#ledgerRefundDone .ledger-refund-done-row',{hasText:'マツモトキヨシ'})).toContainText('實退 ¥700');
  /* 改回待退:總花費恢復 */
  await panel.locator('#ledgerRefundDone .ledger-refund-done-row',{hasText:'マツモトキヨシ'}).click();
  await page.getByRole('dialog',{name:/マツモトキヨシ/}).getByRole('button',{name:'改回待退'}).click();
  await expect(panel.getByRole('tab',{name:'待退 2'})).toBeVisible();
  expect(await page.evaluate(()=>personalLedgerRepository.all().filter(r=>r.batchId==='batch-m').map(r=>r.refundAmount))).toEqual([null,null]);
  expect(await page.evaluate(()=>myTripSpendSnapshot().total.amountJpy)).toBe(spendBefore);
});

test('the actual refund must be a number; the record detail shows tax and refund',async({page})=>{
  await boot(page);
  await seedRefunds(page);
  await page.evaluate(()=>{ledgerRefundTab='done';openLedgerRefundPanel();});
  const panel=page.locator('#ledgerInfoSheet');
  await panel.locator('#ledgerRefundDone .ledger-refund-done-row',{hasText:'ビックカメラ'}).click();
  const dialog=page.getByRole('dialog',{name:/ビックカメラ/});
  await expect(dialog.locator('#ledgerRefundEditAmount')).toHaveValue('640');
  await dialog.locator('#ledgerRefundEditAmount').fill('');
  await dialog.getByRole('button',{name:'儲存'}).click();
  await expect(dialog.locator('#ledgerRefundEditError')).toHaveText('請輸入實際退回的金額（0 或正數）');
  expect(await page.evaluate(()=>personalLedgerRepository.all().find(r=>r.id==='b1').refundAmount)).toBe(640);
  await dialog.getByRole('button',{name:'取消'}).click();
  await expect(page.locator('#ledgerRefundEditDialog')).toHaveCount(0);
  const rows=await page.evaluate(()=>Object.fromEntries(ledgerRecordDetailRows(personalLedgerRepository.all().find(r=>r.id==='b1'),'personal')));
  expect([rows['可退稅'],rows['稅額'],rows['實際退稅']]).toEqual(['是','¥700','¥640（信用卡 · 2026/10/24）']);
});

/* v179(Bar 2026-11-03 選「多一個『不退』分頁」):決定不退的單據移到「不退」,不算待退、不影響花費,可以移回待退 */
test('a receipt you will not claim moves to 不退 and can come back',async({page})=>{
  await boot(page);
  await seedRefunds(page);
  const spendBefore=await page.evaluate(()=>myTripSpendSnapshot().total.amountJpy);
  await page.evaluate(()=>openLedgerRefundPanel());
  const panel=page.locator('#ledgerInfoSheet');
  await expect(panel.getByRole('tab',{name:'不退 0'})).toBeVisible();
  await panel.locator('#ledgerRefundPending .ledger-refund-pending-row',{hasText:'ドン'}).click();
  await page.getByRole('dialog',{name:/ドン/}).getByRole('button',{name:'不退',exact:true}).click();
  await expect(panel.locator('#ledgerRefundPending .ledger-refund-pending-row')).toHaveCount(1);
  await expect(panel.locator('.ledger-refund-hero')).toContainText('¥700');
  await expect(page.locator('.ledger-summary-refund')).toContainText('待退 1 張');
  const stored=await page.evaluate(()=>{const r=personalLedgerRepository.all().find(x=>x.id==='d1');return [r.refundAmount,r.refundMethod,r.isTaxFree];});
  expect(stored).toEqual([null,'不退',true]);
  expect(await page.evaluate(()=>myTripSpendSnapshot().total.amountJpy)).toBe(spendBefore);
  /* 離境提醒也不算這張 */
  expect(await page.evaluate(()=>departureRefundReminderHtml(true))).toContain('1 張收據待退稅（預計 ¥700）');
  await panel.getByRole('tab',{name:'不退 1'}).click();
  const skipped=panel.locator('#ledgerRefundSkipped .ledger-refund-done-row');
  await expect(skipped).toHaveCount(1);
  await expect(skipped).toContainText('不退');
  await skipped.click();
  await page.getByRole('dialog',{name:/ドン/}).getByRole('button',{name:'移回待退'}).click();
  await expect(panel.getByRole('tab',{name:'待退 2'})).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>{const r=personalLedgerRepository.all().find(x=>x.id==='d1');return [r.refundAmount,r.refundMethod];})).toEqual([null,'']);
});

test('on the last trip day the TODAY card says how many receipts still wait for a refund',async({page})=>{
  await boot(page,'2026-10-23T12:00:00+09:00');
  await seedRefunds(page);
  await page.evaluate(()=>{switchView('today');renderToday();});
  const reminder=page.locator('#view-today .today-hero .today-refund-reminder');
  await expect(reminder).toHaveText(/今天離境：2 張收據待退稅（預計 ¥1,080）/);
  /* 不是另外一張卡片,是 TODAY 卡片裡的一行 */
  await expect(page.locator('#view-today > .today-refund-reminder')).toHaveCount(0);
  const box=await reminder.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
  await reminder.click();
  await expect(page.locator('#ledgerInfoSheet #ledgerInfoTitle')).toContainText('退稅');
});

test('no reminder before the last day or once everything is refunded',async({page})=>{
  await boot(page,'2026-10-22T12:00:00+09:00');
  await seedRefunds(page);
  await page.evaluate(()=>{switchView('today');renderToday();});
  await expect(page.locator('.today-refund-reminder')).toHaveCount(0);
  const html=await page.evaluate(()=>{
    personalLedgerRepository.setRefunds({m1:{refundAmount:400,refundMethod:'App',refundDate:'2026/10/24'},m2:{refundAmount:300,refundMethod:'App',refundDate:'2026/10/24'},d1:{refundAmount:380,refundMethod:'現金',refundDate:'2026/10/23'}});
    return departureRefundReminderHtml(true);
  });
  expect(html).toBe('');
});

test('a receipt with refundable tax and a coupon ticks 可退稅 and spreads the discount',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    window.__online=true;Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});
  });
  const result=await page.evaluate(()=>{
    openLedgerEntrySheet(false);
    const d=createLedgerEntryDraft('personal');d.multi=true;d.items=[createLedgerDraftItem(d,{})];ledgerUiState.draft=d;
    const found=TripLedgerReceipts.normalizeRecognition({total:4180,currency:'JPY',storeName:'ドン・キホーテ',items:[{name:'お菓子',amount:1080},{name:'化粧水',amount:3300}],discount:200,taxFree:'refundable',taxAmount:380,taxRates:[8,10],pricesIncludeTax:true});
    const scan=applyLedgerReceiptRecognition(d,found);
    return {items:d.items.map(i=>[i.name,i.amount,!!i.taxExempt]),tax:d.taxAmount,note:d.note,notes:scan.notes,rows:scan.rows.map(r=>r[0])};
  });
  expect(result.items).toEqual([['お菓子','1031',true],['化粧水','3149',true]]);
  expect(result.tax).toBe('380');
  expect(result.note).toBe('可退稅（結帳時未扣稅，需另外辦理），稅額 ¥380；收據折扣 ¥200（優惠券等）');
  expect(result.notes).toEqual(['收據折扣 ¥200 已照金額比例分到 2 個品項（原價 ¥1,080、¥3,300）']);
  expect(result.rows).toEqual(['店名','稅額','備註','品項']);
});

test('the personal backup is v11 and carries the tax amount and refund of each entry',async({page})=>{
  await boot(page);
  await seedRefunds(page);
  const exported=await page.evaluate(()=>JSON.parse(personalStateJson()));
  expect(exported.version).toBe(11);
  const refunded=exported.personalLedger.find(record=>record.id==='b1');
  expect([refunded.taxAmount,refunded.refundAmount,refunded.refundMethod,refunded.refundDate]).toEqual([700,640,'信用卡','2026/10/24']);
  /* 還原時經過的正規化保留這幾欄;舊帳沒有就是 null */
  const normalized=await page.evaluate(record=>normalizePersonalLedgerRecord(record,Date.now(),Math.random),refunded);
  expect([normalized.taxAmount,normalized.refundAmount,normalized.refundMethod,normalized.refundDate]).toEqual([700,640,'信用卡','2026/10/24']);
  const old=await page.evaluate(()=>normalizePersonalLedgerRecord({id:'o1',time:'2026-10-20T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'舊帳',amountJpy:500,amountTwd:105,note:'',payMethod:'現金'},Date.now(),Math.random));
  expect([old.taxAmount,old.refundAmount,old.refundMethod,old.refundDate]).toEqual([null,null,'','']);
});
