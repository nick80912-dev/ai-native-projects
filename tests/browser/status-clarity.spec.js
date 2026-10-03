const {test,expect}=require('./support/test');
const {installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.beforeEach(async({page})=>{
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
 for(const [stage,label] of [['personal','已存本機'],['queue','待送出'],['bridge','伺服器已接收，等待讀回'],['cloud','已從伺服器讀回']]){
  await page.evaluate(stage=>{
   const record=personalLedgerRepository.all()[0];
   localStorage.setItem('trip_ledger_queue',JSON.stringify(stage==='queue'?[record]:[]));
   if(stage==='bridge')rememberLedgerDeliveryBridge(record);else localStorage.removeItem(LEDGER_DELIVERY_BRIDGE_KEY);
   DB.ledger=stage==='cloud'?[record]:[];
   ledgerUiState.track=stage==='personal'?'personal':'shared';
   document.getElementById('view-split').innerHTML=renderLedgerRecordDetail(record);switchView('split');
   document.getElementById('view-split').innerHTML=renderLedgerRecordDetail(record);
  },stage);
  await expect(page.locator('#view-split')).toContainText(label);
  await expect(page.locator('#view-split')).not.toContainText('其他裝置已讀到');
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
