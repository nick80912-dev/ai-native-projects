const {test,expect}=require('./support/test');
const {
  collectPageErrors,
  installOfflineAppNetwork,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const ITEM_A={
  id:'buy-ledger-a',name:'白桃',category:'必買',unit:'盒',legacyQtyText:'',
  allocations:[{allocationId:'allocation-a',target:'Bar',quantity:1,ledgerLinks:[]}],
  stopRef:'',done:true,createdAt:'2026-08-08T01:00:00.000Z',completedAt:'2026-08-08T02:00:00.000Z',splitGroupId:'',photoId:''
};
const ITEM_B={
  id:'buy-ledger-b',name:'藥妝',category:'必買',unit:'個',legacyQtyText:'',
  allocations:[{allocationId:'allocation-b',target:'Amy',quantity:2,ledgerLinks:[]}],
  stopRef:'',done:true,createdAt:'2026-08-08T01:30:00.000Z',completedAt:'2026-08-08T02:30:00.000Z',splitGroupId:'',photoId:''
};
const MIXED_DETAIL_ITEM={
  id:'buy-ledger-mixed',name:'混合記帳狀態',category:'必買',unit:'盒',legacyQtyText:'',
  allocations:[
    {allocationId:'mixed-linked',target:'阿寶',quantity:1,ledgerLinks:[{
      version:1,track:'personal',testMode:false,recordId:'mixed-personal-record',batchId:'',
      linkedAt:'2026-08-08T02:10:00.000Z',releasedAt:''
    }]},
    {allocationId:'mixed-waiting',target:'媽媽',quantity:1,ledgerLinks:[{
      version:1,track:'shared',testMode:false,recordId:'mixed-shared-missing',batchId:'',
      linkedAt:'2026-08-08T02:20:00.000Z',releasedAt:''
    }]},
    {allocationId:'mixed-open',target:'小明',quantity:1,ledgerLinks:[]}
  ],
  stopRef:'',done:true,createdAt:'2026-08-08T01:40:00.000Z',completedAt:'2026-08-08T02:40:00.000Z',splitGroupId:'',photoId:''
};
const MIXED_PERSONAL_RECORD={
  id:'mixed-personal-record',time:'2026-08-08T02:10:00.000Z',member:'Bar',store:'岡山伴手禮店',
  category:'購物',detail:'混合記帳狀態',amountJpy:1200,amountTwd:260,note:'',participants:'',payMethod:'現金',
  recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',replacesRecordId:'',inputCurrency:'JPY',
  isTaxFree:false,priceMode:'tax-included',taxRate:10,couponInput:0
};
const DEGRADED_MESSAGE='消費已建立，但採買項目的記帳標記更新失敗。請避免再次記帳，並重新開啟採買清單確認。';

async function openApp(page){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    return route.fulfill({status:204,body:''});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof syncInFlight!=='undefined');
}

async function seedShopping(page,items){
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(seed=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_shopping_list',JSON.stringify(seed));
    localStorage.removeItem('trip_personal_ledger');
    localStorage.removeItem('trip_ledger_queue');
    localStorage.removeItem('trip_ledger_test_mode');
    memberRegistrationBridge=[{
      id:'qa-member-bar',time:'2026-08-08T00:00:00.000Z',member:'Bar',category:'其他',detail:'[身分註冊]',
      amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',
      targetRecordId:'',deleteReason:'',batchId:''
    }];
    openShoppingList();
  },items);
}

async function openSingleEntry(page,id,keepShoppingList){
  await page.evaluate(({itemId,keep})=>{
    if(!keep){openShoppingLedgerEntry(itemId);return;}
    return buyToLedgerWorkflow.start({
      itemIds:[itemId],keepShoppingList:true,
      messages:{unverified:'記帳狀態尚待確認，請先完成同步或重新確認',alreadyLinked:'這筆採買目前沒有未記帳項目'}
    });
  },{itemId:id,keep:!!keepShoppingList});
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
}

async function fillAndSaveSingle(page,amount){
  await page.locator('#ledgerAmount').fill(String(amount));
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toBeHidden();
}

test('single personal Shopping save persists a record and one allocation link',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await seedShopping(page,[ITEM_A]);
  await openSingleEntry(page,ITEM_A.id,false);
  await expect(page.locator('#shoppingListOverlay')).toHaveCount(0);
  await expect(page.locator('#ledgerDetail')).toHaveValue('白桃');
  await fillAndSaveSingle(page,1200);

  const state=await page.evaluate(id=>{
    const item=shoppingListStore.all().find(value=>value.id===id);
    const records=personalLedgerRepository.all();
    return {records,links:item.allocations[0].ledgerLinks};
  },ITEM_A.id);
  expect(state.records).toHaveLength(1);
  expect(state.records[0].detail).toBe('白桃');
  expect(state.links).toHaveLength(1);
  expect(state.links[0].recordId).toBe(state.records[0].id);
  expect(state.links[0].track).toBe('personal');
  expect(state.links[0].testMode).toBe(false);
  expect(pageErrors).toEqual([]);
});

test('multi Shopping save preserves source order and writes one-to-one links',async({page})=>{
  await seedShopping(page,[ITEM_A,ITEM_B]);
  await page.evaluate(ids=>{
    const items=shoppingListStore.all().filter(item=>ids.includes(item.id));
    openShoppingMultiLedgerEntry(items);
  },[ITEM_A.id,ITEM_B.id]);
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  await page.getByRole('textbox',{name:'店家名稱'}).fill('岡山伴手禮店');
  const amounts=page.locator('.ledger-item-amount-field input');
  await expect(amounts).toHaveCount(2);
  await amounts.nth(0).fill('1200');
  await amounts.nth(1).fill('800');
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toBeHidden();

  const mapping=await page.evaluate(ids=>{
    const records=personalLedgerRepository.all();
    return shoppingListStore.all().filter(item=>ids.includes(item.id)).map(item=>({
      itemId:item.id,
      recordId:item.allocations[0].ledgerLinks[0]&&item.allocations[0].ledgerLinks[0].recordId,
      detail:records.find(record=>record.id===(item.allocations[0].ledgerLinks[0]||{}).recordId)?.detail
    }));
  },[ITEM_A.id,ITEM_B.id]);
  expect(mapping).toEqual([
    {itemId:ITEM_A.id,recordId:expect.any(String),detail:'白桃'},
    {itemId:ITEM_B.id,recordId:expect.any(String),detail:'藥妝'}
  ]);
});

test('shared queue acknowledgement creates a shared test-mode link',async({page})=>{
  await seedShopping(page,[ITEM_A]);
  await openSingleEntry(page,ITEM_A.id,false);
  await page.evaluate(()=>{
    localStorage.setItem('trip_ledger_test_mode','true');
    setLedgerDraftTrack('shared');
  });
  await page.locator('#ledgerAmount').fill('500');
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toBeHidden();

  const state=await page.evaluate(id=>{
    const queue=ledgerRepository.queuedRecords();
    const item=shoppingListStore.all().find(value=>value.id===id);
    return {queue,link:item.allocations[0].ledgerLinks[0]};
  },ITEM_A.id);
  expect(state.queue).toHaveLength(1);
  expect(state.link.recordId).toBe(state.queue[0].id);
  expect(state.link.track).toBe('shared');
  expect(state.link.testMode).toBe(true);
});

test('invalid amount keeps the form open and creates no record or link',async({page})=>{
  await seedShopping(page,[ITEM_A]);
  await openSingleEntry(page,ITEM_A.id,false);
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('aria-invalid','true');
  const state=await page.evaluate(id=>{
    const item=shoppingListStore.all().find(value=>value.id===id);
    return {records:personalLedgerRepository.all().length,links:item.allocations[0].ledgerLinks.length};
  },ITEM_A.id);
  expect(state).toEqual({records:0,links:0});
});

test('keepShoppingList returns to the mounted Shopping overlay',async({page})=>{
  await seedShopping(page,[ITEM_A]);
  await openSingleEntry(page,ITEM_A.id,true);
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
  await expect(page.locator('#ledgerEntrySheet')).toHaveClass(/shopping-linked-ledger-entry/);
  expect(await page.evaluate(()=>ledgerUiState.entryReturnContext)).toMatchObject({kind:'shopping',keepMounted:true});
  await fillAndSaveSingle(page,900);
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
});

test('mixed unverified Shopping detail disables duplicate ledger entry before click',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await seedShopping(page,[MIXED_DETAIL_ITEM]);
  await page.evaluate(({itemId,record})=>{
    localStorage.setItem('trip_personal_ledger',JSON.stringify([record]));
    openShoppingItemDetail(itemId);
  },{itemId:MIXED_DETAIL_ITEM.id,record:MIXED_PERSONAL_RECORD});

  const statusRow=page.locator('#shoppingItemDetail .ledger-detail-row').filter({has:page.locator('dt',{hasText:'狀態'})});
  await expect(statusRow.locator('dd')).toHaveText('已買 · 已記帳 1 · 待確認 1 · 未記帳 1');
  await expect(page.getByRole('button',{name:'等待狀態確認'})).toBeDisabled();
  await expect(page.getByText('有 1 筆仍在確認同步狀態，完成後才能繼續，避免重複記帳。')).toBeVisible();
  await expect(page.getByText('記帳進度',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'記帳未完成對象'})).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('Shopping link write failure preserves one Ledger record and shows degraded warning',async({page})=>{
  await seedShopping(page,[ITEM_A]);
  await openSingleEntry(page,ITEM_A.id,false);
  await page.evaluate(()=>{
    window.__buyToLedgerToastMessages=[];
    const originalToast=toast;
    toast=function(message){
      window.__buyToLedgerToastMessages.push(message);
      return originalToast.apply(this,arguments);
    };
    shoppingListStore.applyLedgerLinks=function(){throw new Error('forced Shopping write failure');};
  });
  await fillAndSaveSingle(page,700);
  const state=await page.evaluate(id=>{
    const item=shoppingListStore.all().find(value=>value.id===id);
    return {
      records:personalLedgerRepository.all().length,
      links:item.allocations[0].ledgerLinks.length,
      messages:window.__buyToLedgerToastMessages.slice()
    };
  },ITEM_A.id);
  expect(state.records).toBe(1);
  expect(state.links).toBe(0);
  expect(state.messages).toContain(DEGRADED_MESSAGE);
});
