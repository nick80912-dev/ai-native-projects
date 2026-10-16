/* v157(Bar 2026-10-16)
   ============================================================
   1. 採買清單多選「記帳」會先把待買項目標成已買;沒存檔就關掉記帳表單時,這一批移回待買。
   2. 團體帳可以幫別人代記:表單直接選付款人,不用切換身分。付款人是 record.member,
      代記的人寫在備註尾端「〔Bar 代記〕」,團體帳列表顯示「Bar 代記」小標。
      代記的人自己不在分攤裡時,這筆仍列在他的團體帳列表,但不算進他的「與我相關」金額。
   3. 行程頁的「現在」與「回到現在」和今天頁的 NEXT STOP 一致(同區串點會停在子站)。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

function identity(name){
  return {id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''};
}

async function openAt(page,when,width){
  await page.setViewportSize({width:width||390,height:844});
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(members=>{closeMemberSelector();memberRegistrationBridge=members;},['Bar','Amy','Ken'].map(identity));
}

const ITEM=(id,name,done)=>({id,name,category:'必買',unit:'個',legacyQtyText:'',allocations:[{allocationId:id+'-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done,createdAt:'2026-10-01T01:00:00.000Z',completedAt:done?'2026-10-01T02:00:00.000Z':'',splitGroupId:'',photoId:''});

test('1 cancelling the multi-select ledger form moves the auto-completed items back to pending',async({page})=>{
  await openAt(page,'2026-10-19T12:00:00+09:00');
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('p1','白桃',false),ITEM('p2','藥妝',false),ITEM('d1','點心',true)]);
  await page.locator('.shopping-list-tool-actions button',{hasText:'多選'}).click();
  await page.locator('#shoppingSelectAllButton').click();
  await page.locator('.shopping-selection-actions button',{hasText:'記帳'}).click();
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  expect(await page.evaluate(()=>shoppingListStore.all().map(item=>item.id+':'+item.done))).toEqual(['p1:true','p2:true','d1:true']);
  await page.locator('#ledgerEntrySheet .settings-close').click();
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>shoppingListStore.all().map(item=>item.id+':'+item.done))).toEqual(['p1:false','p2:false','d1:true']);
  await expect(page.locator('#toast')).toContainText('已取消記帳，2 項移回待買');
});

test('1 saving the multi-select ledger form keeps the items bought',async({page})=>{
  await openAt(page,'2026-10-19T12:00:00+09:00');
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('p1','白桃',false)]);
  await page.locator('.shopping-list-tool-actions button',{hasText:'多選'}).click();
  await page.locator('#shoppingSelectAllButton').click();
  await page.locator('.shopping-selection-actions button',{hasText:'記帳'}).click();
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  await page.locator('#ledgerAmount').fill('800');
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>shoppingListStore.all().map(item=>item.id+':'+item.done))).toEqual(['p1:true']);
});

async function openGroupForm(page,width){
  await openAt(page,'2026-10-19T12:00:00+09:00',width);
  await page.evaluate(()=>{switchView('split');openLedgerEntrySheet(false);});
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'團體'}).click();
}

for(const width of [320,390]){
  test('2 the group form offers the payer and fits at '+width+'px',async({page})=>{
    await openGroupForm(page,width);
    const payer=page.locator('#ledgerPayer');
    await expect(payer).toHaveValue('');
    expect(await payer.locator('option').allTextContents()).toEqual(['Bar（你）','Amy','Ken']);
    await expect(page.locator('#ledgerEntrySheet .ledger-payer-note')).toHaveText('別人付的，請改選付款人');
    await payer.selectOption('Amy');
    await expect(page.locator('#ledgerEntrySheet .ledger-payer-note')).toHaveText('會標示「Bar 代記」，之後由 Amy 修改');
    const fit=await page.evaluate(()=>{const row=document.querySelector('#ledgerEntrySheet .ledger-entry-heading-row'),select=document.getElementById('ledgerPayer');return {row:row.scrollWidth<=row.clientWidth,page:document.documentElement.scrollWidth<=window.innerWidth,font:getComputedStyle(select).fontSize,height:Math.round(select.getBoundingClientRect().height)};});
    expect(fit.row).toBe(true);expect(fit.page).toBe(true);expect(fit.font).toBe('16px');expect(fit.height).toBeGreaterThanOrEqual(36);
  });
}

test('2 a record kept for another payer is theirs, tagged, listed for the recorder, and outside the recorder totals',async({page})=>{
  await openGroupForm(page);
  await page.locator('#ledgerPayer').selectOption('Amy');
  await page.locator('#ledgerAmount').fill('500');
  await page.locator('#ledgerDetail').fill('咖啡');
  await page.evaluate(()=>{ledgerUiState.draft.participants=['Amy','Ken'];});
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const saved=await page.evaluate(()=>{const record=ledgerRepository.queuedRecords().filter(item=>item.detail==='咖啡')[0];return {member:record.member,note:record.note,participants:record.participants};});
  expect(saved).toEqual({member:'Amy',note:'〔Bar 代記〕',participants:'["Amy","Ken"]'});
  const row=page.locator('#view-split .ledger-recent-row',{hasText:'咖啡'});
  await expect(row).toContainText('Bar 代記');
  /* Bar 不在分攤裡:團體大卡的「與我相關」金額不算這筆 */
  await expect(page.locator('#view-split .ledger-summary-card')).not.toContainText('500');
  /* Amy 的手機:這筆是她付的,算在她分到的份額;「整趟旅程」明細看得到 Bar 代記。 */
  const amy=await page.evaluate(()=>{localStorage.setItem('trip_member','Amy');const spend=myTripSpendSnapshot();const item=spend.groupItems.filter(entry=>entry.detail==='咖啡')[0];return {share:item.shareJpy,payerIsMe:item.payerIsMe,recorder:item.recorder,panel:renderMyTripSpendPanel(spend,'JPY').includes('你付（Bar 代記）')};});
  expect(amy).toEqual({share:250,payerIsMe:true,recorder:'Bar',panel:true});
  await page.evaluate(()=>localStorage.setItem('trip_member','Bar'));
});

test('2 keeping my own record adds no recorder note',async({page})=>{
  await openGroupForm(page);
  await page.locator('#ledgerAmount').fill('300');
  await page.locator('#ledgerDetail').fill('飲料');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>{const record=ledgerRepository.queuedRecords().filter(item=>item.detail==='飲料')[0];return [record.member,record.note];})).toEqual(['Bar','']);
});

test('3 the trip page now marker and back-to-now follow the Today next stop inside a cluster',async({page})=>{
  await openAt(page,'2026-10-19T15:45:00+09:00');
  await expect(page.locator('#view-today')).toContainText('宮島表参道商店街');
  await page.evaluate(()=>{curDay=findToday();switchView('trip');});
  await expect(page.locator('#view-trip .item.now-item')).toHaveAttribute('id','it_10/19_9');
  await page.evaluate(()=>{switchView('today');backToNow();});
  await expect(page.locator('#view-trip .is-navigation-target')).toHaveAttribute('id','it_10/19_9');
  expect(await page.evaluate(()=>selectCurrentTripItem(DB.trip.days[findToday()],findToday(),getChecks()))).toBe('10/19_9');
});
