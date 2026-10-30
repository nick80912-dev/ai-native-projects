/* v163(Bar 2026-10-30「繼續進行下一批」:出發前稽核 #57 的中優先項目)
   ============================================================
   T1 同區串點裡沒有時間的子站被「下一站」跳過(10/22 倉敷)。
   T7 還沒有身分的人從採買清單按「記帳」:清單被關掉、叫出沒有 × 的選擇器,選完也不接續記帳。
   L4 記帳類別／支付方式可以一鍵刪光,刪光後無法記帳。
   L5 刪掉某個類別或支付方式後,用到它的舊紀錄編輯後存不了。
   L6 簡易結算模式藏起「別人已標記付款、等你確認」的結清,徽章卻仍計數。
   L7 個人帳列表含其他身分記的帳,大卡只算目前身分,兩邊對不起來。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''});

async function boot(page,when,member){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when||'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(([member,members])=>{closeMemberSelector();memberRegistrationBridge=members;if(member)localStorage.setItem('trip_member',member);else localStorage.removeItem('trip_member');},[member===undefined?'Bar':member,['Bar','Amy'].map(identity)]);
}

test('T1 untimed sub-stops in a cluster follow the itinerary order (10/22 倉敷)',async({page})=>{
  await boot(page,'2026-10-22T10:00:00+09:00');
  await page.evaluate(()=>switchView('today'));
  const title=page.locator('#view-today .nx-ticket-title');
  await expect(title).toHaveText('阿智神社');
  for(const next of ['倉敷美觀地區','林源十郎商店','倉敷丹寧街']){
    await page.locator('#view-today .nx-decision-btn.done').first().click();
    await expect(title).toHaveText(next);
  }
});

const ITEM=(id,name,done)=>({id,name,category:'必買',unit:'個',legacyQtyText:'',allocations:[{allocationId:id+'-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done,createdAt:'2026-10-01T01:00:00.000Z',completedAt:done?'2026-10-01T02:00:00.000Z':'',splitGroupId:'',photoId:''});

test('T7 recording from the shopping list without an identity asks first, keeps the list and then opens the form',async({page})=>{
  await boot(page,null,null);
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('d1','點心',true)]);
  await page.locator('.shopping-list-segment button',{hasText:'已買'}).click();
  await page.locator('.shopping-item',{hasText:'點心'}).locator('.shopping-item-primary',{hasText:'記帳'}).click();
  const selector=page.locator('#memberOverlay');
  await expect(selector).toBeVisible();
  await expect(page.locator('#shoppingListOverlay')).toHaveCount(1);
  /* 選擇器疊在清單上方,而且可以取消(有 ×) */
  expect(await selector.evaluate(element=>{const box=element.getBoundingClientRect(),hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return !!hit&&!!hit.closest('#memberOverlay');})).toBe(true);
  await expect(selector.locator('.settings-close')).toHaveCount(1);
  await page.evaluate(async()=>{memberSelectorState.candidate={name:'Amy',isNew:false};memberSelectorState.stage='confirm';await confirmMemberSelection();});
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  await expect(page.locator('#ledgerDetail')).toHaveValue('點心');
});

test('T7 cancelling the identity picker leaves the shopping list as it was',async({page})=>{
  await boot(page,null,null);
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('p1','白桃',false),ITEM('p2','藥妝',false)]);
  await page.locator('.shopping-list-tool-actions button',{hasText:'多選'}).click();
  await page.locator('#shoppingSelectAllButton').click();
  await page.locator('.shopping-selection-actions button',{hasText:'記帳'}).click();
  await page.locator('#memberOverlay .settings-close').click();
  await expect(page.locator('#memberOverlay')).toHaveCount(0);
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>shoppingListStore.all().map(item=>item.id+':'+item.done))).toEqual(['p1:false','p2:false']);
  expect(await page.evaluate(()=>pendingActionAfterMember)).toBe(null);
});

test('L4 the last option cannot be deleted, deleting asks first, and defaults can be restored',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{localStorage.setItem(LEDGER_PAY_METHOD_OPTIONS_KEY,JSON.stringify(['Suica']));openSettings('options-pay-method');});
  const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  await page.locator('#settingsOverlay').getByRole('button',{name:/刪除 Suica/}).click();
  await expect(page.locator('#toast')).toContainText('至少要保留一個支付方式。');
  expect(dialogs).toEqual([]);
  await page.locator('#settingsOverlay').getByRole('button',{name:'恢復預設'}).click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0]).toMatch(/^加回 \d+ 個預設支付方式（.+）？目前的選項會保留。$/);
  const methods=await page.evaluate(()=>ledgerPayMethodStore.all());
  expect(methods[0]).toBe('Suica');
  expect(methods.length).toBeGreaterThan(1);
  await page.locator('#settingsOverlay').getByRole('button',{name:/刪除 Suica/}).click();
  await expect.poll(()=>dialogs.length).toBe(2);
  expect(dialogs[1]).toBe('刪除「Suica」？已用過它的舊紀錄仍會保留這個名稱。');
  expect(await page.evaluate(()=>ledgerPayMethodStore.all().indexOf('Suica'))).toBe(-1);
});

test('L5 a record whose payment method was deleted can still be edited and saved',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    const methods=ledgerPayMethodStore.all();if(methods.indexOf('Suica')<0)ledgerPayMethodStore.add('Suica');
    personalLedgerRepository.add({member:'Bar',category:'交通',detail:'電車',amountJpy:300,amountTwd:63,note:'',payMethod:'Suica',inputCurrency:'JPY'});
    ledgerPayMethodStore.remove('Suica');
    ledgerUiWorkflow.dispatch({type:'switch-track',track:'personal'});switchView('split');
  });
  await page.evaluate(()=>editLedgerRecord(personalLedgerRepository.all()[0].id));
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  await expect(page.locator('#ledgerEntrySheet .ledger-pay-option.on')).toHaveText('Suica');
  await page.locator('#ledgerAmount').fill('310');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>personalLedgerRepository.all().map(r=>[r.amountJpy,r.payMethod]))).toEqual([[310,'Suica']]);
  /* 新增的表單不會出現已刪除的選項 */
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await expect(page.locator('#ledgerEntrySheet .ledger-pay-option',{hasText:'Suica'})).toHaveCount(0);
});

const expense=(id,payer,participants,amountJpy)=>({id,time:'2026-10-20T03:00:00.000Z',member:payer,category:'餐飲',detail:id,amountJpy,amountTwd:Math.round(amountJpy*0.21),note:'',participants:JSON.stringify(participants),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:'FALSE',priceMode:'included',taxRate:'10',couponAmount:'0'});
test('L6 simple settlement mode still lists a payment waiting for your confirmation',async({page})=>{
  await boot(page);
  await page.evaluate(([ledger])=>{DB.ledger=ledger;localStorage.setItem(SIMPLE_SETTLEMENT_MODE_KEY,'true');switchView('split');openLedgerSettlementPanel();},[[expense('e-1','Bar',['Bar','Amy'],6000),
    {id:'c-1',time:'2026-10-21T02:00:00.000Z',member:'Amy',category:'其他',detail:'[結清] Amy → Bar',amountJpy:3000,amountTwd:0,note:'',participants:'["Bar"]',payMethod:'',recordType:'settlement_claim',targetRecordId:'',deleteReason:'',batchId:'',inputCurrency:'JPY'}]]);
  const panel=page.locator('#ledgerSettlementPanelBody');
  await expect(panel.locator('h3',{hasText:'需要你確認'})).toHaveCount(1);
  await expect(panel.getByRole('button',{name:'確認已收'})).toHaveCount(1);
  await expect(panel.getByRole('button',{name:'退回'})).toHaveCount(1);
  expect(await page.evaluate(()=>settlementPendingBadgeTotal())).toBe(1);
  await page.evaluate(()=>{closeLedgerInfoSheet();openSettings('ledger');});
});

test('L7 personal entries recorded under another identity are labelled and explained',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    personalLedgerRepository.add({member:'Bar',category:'餐飲',detail:'早餐',amountJpy:900,amountTwd:189,note:'',payMethod:'現金',inputCurrency:'JPY'});
    personalLedgerRepository.add({member:'Amy',category:'餐飲',detail:'咖啡',amountJpy:1000,amountTwd:210,note:'',payMethod:'現金',inputCurrency:'JPY'});
    ledgerUiWorkflow.dispatch({type:'switch-track',track:'personal'});switchView('split');renderSplit();
  });
  await expect(page.locator('#view-split .ledger-other-identity-note')).toHaveText('另有 1 筆是其他身分（Amy）記的個人帳，未計入上面的花費。');
  await expect(page.locator('#view-split .ledger-recent-row',{hasText:'咖啡'})).toContainText('Amy 的帳');
  await expect(page.locator('#view-split .ledger-recent-row',{hasText:'早餐'})).not.toContainText('的帳');
});
