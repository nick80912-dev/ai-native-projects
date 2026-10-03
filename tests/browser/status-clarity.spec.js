const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.beforeEach(async({page})=>{
 await installFixedDate(page,'2026-10-18T12:00:00+09:00');
 await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
});
async function seed(page){
 return page.evaluate(()=>{
  const record={id:'clarity-record',time:'2026-10-18T01:00:00.000Z',member:'Bar',store:'岡山店',category:'購物',detail:'白桃',amountJpy:1200,amountTwd:260,note:'',participants:'',payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:false,priceMode:'tax-included',taxRate:10,couponInput:0};
  const item={id:'clarity-peach',name:'白桃',category:'必買',unit:'盒',legacyQtyText:'',allocations:[
   {allocationId:'a',target:'Bar',quantity:2,ledgerLinks:[{version:1,track:'personal',testMode:false,recordId:record.id,batchId:'',linkedAt:record.time,releasedAt:''}]},
   {allocationId:'b',target:'Amy',quantity:3,ledgerLinks:[]}
  ],stopRef:'',done:true,createdAt:record.time,completedAt:record.time,splitGroupId:'',photoId:''};
  localStorage.setItem('trip_personal_ledger',JSON.stringify([record]));
  localStorage.setItem('trip_shopping_list',JSON.stringify([item]));
  openShoppingList();setShoppingTab('done');
  return JSON.stringify({shopping:localStorage.getItem('trip_shopping_list'),ledger:localStorage.getItem('trip_personal_ledger')});
 });
}
test('purchase quantity and ledger coverage remain distinct on card and detail',async({page})=>{
 const before=await seed(page);
 const card=page.locator('[data-shopping-item-id="clarity-peach"]');
 await expect(card).toContainText('5 盒');
 await expect(card.locator('.shopping-link-badge')).toHaveText('部分已記帳');
 await card.getByRole('button',{name:'查看 白桃 詳情'}).click();
 await expect(page.locator('#shoppingItemDetail')).toContainText('已購買 · 已記帳 1／2 筆');
 expect(await page.evaluate(()=>JSON.stringify({shopping:localStorage.getItem('trip_shopping_list'),ledger:localStorage.getItem('trip_personal_ledger')}))).toBe(before);
});
test('missing shared ledger evidence stays pending confirmation and cannot be recorded again',async({page})=>{
 await seed(page);
 await page.evaluate(()=>{
  const items=shoppingListStore.all();items[0].allocations[0].ledgerLinks[0].track='shared';
  localStorage.setItem('trip_shopping_list',JSON.stringify(items));renderShoppingListOverlay();
 });
 const card=page.locator('[data-shopping-item-id="clarity-peach"]');
 await expect(card.locator('.shopping-link-badge')).toHaveText('待確認');
 await card.getByRole('button',{name:'查看 白桃 詳情'}).click();
 await expect(page.getByRole('button',{name:'等待狀態確認',exact:true})).toBeDisabled();
});
test('ledger detail shows local saved, queued, accepted and readback evidence without device-read claims',async({page})=>{
 await seed(page);await page.evaluate(()=>closeShoppingList());
 for(const testMode of [false,true])for(const [stage,label] of [['personal','已存本機'],['queue','待送出'],['bridge','伺服器已接收，等待讀回'],['cloud','已從伺服器讀回'],['overlap','待送出'],['opposite-mode-queue','已從伺服器讀回'],['failed-download','待送出']]){
  await page.evaluate(({stage,testMode})=>{
   localStorage.setItem('trip_member','Bar');localStorage.setItem('trip_ledger_test_mode',JSON.stringify(testMode));
   memberRegistrationBridge=[false,true].map(mode=>({id:'clarity-member-'+mode,member:'Bar',time:new Date().toISOString(),detail:(mode?'[TEST] ':'')+'[身分註冊]',recordType:'identity_registration'}));
   const record={...personalLedgerRepository.all()[0],detail:(testMode?'[TEST] ':'')+'白桃'};
   const opposite={...record,detail:(!testMode?'[TEST] ':'')+'白桃'};
   const queued=['queue','overlap','failed-download'].includes(stage)?[record]:stage==='opposite-mode-queue'?[opposite]:[];
   localStorage.setItem('trip_ledger_queue',JSON.stringify(queued));
   localStorage.removeItem(LEDGER_DELIVERY_BRIDGE_KEY);
   if(['bridge','overlap'].includes(stage))rememberLedgerDeliveryBridge(record);
   DB.ledger=['cloud','overlap','opposite-mode-queue'].includes(stage)?[record]:[];
   closeMemberSelector();ledgerTrackChosenThisSession=true;ledgerUiState.track=stage==='personal'?'personal':'shared';
   switchView('split');renderSplit();
  },{stage,testMode});
  if(stage==='failed-download'){
   await page.evaluate(()=>syncAll(false));await waitForSyncToSettle(page);
   expect(await page.evaluate(()=>ledgerRepository.queuedRecords().some(record=>record.id==='clarity-record'))).toBe(true);
  }
  await page.locator('.ledger-recent-row').filter({hasText:'白桃'}).first().locator('.ledger-recent-body').click();
  const dialog=page.getByRole('dialog',{name:'消費明細',exact:true});
  await expect(dialog).toBeVisible();
  const storage=dialog.locator('.ledger-detail-row').filter({hasText:'儲存狀態'}).locator('dd');
  await expect(storage).toBeVisible();await expect(storage).toHaveText(label);
  await expect(dialog).not.toContainText('其他裝置已讀到');
  await dialog.getByRole('button',{name:'關閉',exact:true}).click();
 }
});
test('data health does not claim server acceptance when no delivery evidence exists',async({page})=>{
 await page.evaluate(()=>openSettings('health'));
 await expect(page.locator('.data-health-shared')).toContainText('本機無待送紀錄');
 await expect(page.locator('.data-health-shared')).not.toContainText('已送出');
});
test('photo health stays quiet when capacity estimation is unsupported',async({page})=>{
 await page.evaluate(async()=>{
  Object.defineProperty(navigator,'storage',{configurable:true,value:{}});
  await refreshShoppingPhotoAudit({force:true});
  openSettings('storage');
 });
 await expect(page.getByRole('heading',{name:'照片健康狀態',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/修復/})).toHaveCount(0);
 const capacity=page.locator('.shopping-photo-storage-card').filter({hasText:'App 儲存空間（估計）'});
 await expect(capacity).toContainText('瀏覽器未提供容量估算');
 await expect(page.locator('.shopping-photo-storage-warning')).toHaveCount(0);
});
test('itinerary distinguishes completed, manual skip, auto skip and pending after navigation',async({page})=>{
 await page.evaluate(()=>{
  localStorage.removeItem('trip_next_stop_progress');localStorage.removeItem('trip_checks');
  DB.trip.days[0].items=[['auto','08:00'],['manual','13:00'],['done','14:00'],['pending','15:00']].map(([id,time])=>({id:'clarity-'+id,time,act:'狀態-'+id,place:'',ref:'',move:'',note:''}));
  curDay=0;tripHideDone=false;
  autoSkipStaleItem(DB.trip.days[0],0,'clarity-auto');renderToday();
 });
 await expect(page.getByRole('button',{name:'開啟完整行程：狀態-manual',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'跳過',exact:true}).click();
 await page.getByRole('button',{name:'行程',exact:true}).click();
 await page.locator('#it_clarity-done .chk').focus();await page.keyboard.press('Space');
 await expect(page.locator('#it_clarity-done')).toContainText('已完成');
 await expect(page.locator('#it_clarity-manual')).toContainText('已略過');
 await expect(page.locator('#it_clarity-auto')).toContainText('自動略過');
 await expect(page.locator('#it_clarity-pending .trip-status-badge')).toHaveCount(0);
 await expect(page.locator('#it_clarity-done .chk')).toHaveAttribute('aria-checked','true');
 await expect(page.locator('#it_clarity-manual .chk')).toHaveAttribute('aria-checked','false');
 await page.getByRole('button',{name:'今天',exact:true}).click();
 await page.getByRole('button',{name:'行程',exact:true}).click();
 await expect(page.locator('#it_clarity-manual')).toContainText('已略過');
});
test('native partial purchase shows purchased progress separately from ledger coverage',async({page})=>{
 await seed(page);
 await page.evaluate(()=>{
  const item=shoppingListStore.all()[0];item.done=false;item.completedAt='';item.allocations=[{allocationId:'a',target:'Bar',quantity:5,ledgerLinks:[]}];
  localStorage.setItem('trip_shopping_list',JSON.stringify([item]));setShoppingTab('pending');
 });
 await page.getByRole('button',{name:'部分購買',exact:true}).click();
 await page.locator('#shoppingSplitPurchased-0').fill('2');
 await page.locator('.shopping-split-form button[type="submit"]').click();
 await expect(page.locator('.shopping-purchase-summary')).toContainText('部分購買 · 已買 2/5 盒');
 await page.getByRole('button',{name:'已買',exact:true}).click();
 const card=page.locator('[data-shopping-item-id="clarity-peach"]');
 await expect(card.locator('.shopping-purchase-summary')).toHaveText('部分購買 · 已買 2/5 盒');
 await card.getByRole('button',{name:'查看 白桃 詳情'}).click();
 await expect(page.locator('#shoppingItemDetail')).toContainText('部分購買 · 已買 2/5 盒');
 await expect(page.locator('#shoppingItemDetail .ledger-detail-row').filter({hasText:'數量'}).first()).toContainText('2 盒');
});
