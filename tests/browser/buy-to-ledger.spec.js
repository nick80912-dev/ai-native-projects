const {test,expect}=require('@playwright/test');
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
    const item=shoppingListStore.all().find(value=>value.id===itemId);
    openShoppingLedgerSourcesEntry(shoppingLedgerSources([item],shoppingLedgerContext()),true);
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
  await fillAndSaveSingle(page,900);
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
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
