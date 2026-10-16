/* v158(Bar 2026-10-16 從出發前稽核再選的五項)
   ============================================================
   T4  同區串點卡少了一般下一站卡的資訊(停車、營業、官網、樓層、其他資訊),卡片本身也點不了。
   T10 今天頁「已處理 x/y」、「今日還有 n 個行程」與行程頁「完成 · 略過 / 共」各算各的。
   T9  從採買清單卡片按「記帳」會關掉清單,記完帳回不到清單。
   T17 待買卡最顯眼的是「部分購買」;部分購買表單一打開就有紅字。
   T16 第一次勾選想逛時清單往下跳、想逛標題點擊區只有 18px —— 見 shop-interaction.spec.js。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

async function openAt(page,when){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();memberRegistrationBridge=[{id:'qa-member-bar',time:'2026-10-01T00:00:00.000Z',member:'Bar',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''}];switchView('today');});
}

test('T4 a cluster card shows parking, hours, more info and secondary actions, and opens the current stop',async({page})=>{
  await openAt(page,'2026-10-18T19:10:00+09:00');
  const card=page.locator('#view-today .nx-cluster-ticket');
  await expect(card.locator('.nx-ticket-title')).toHaveText('永旺夢樂城 岡山');
  await expect(card.locator('.nx-ticket-tag').first()).toContainText('購物');
  await expect(card.locator('.nx-ticket-line',{hasText:'停車'})).toContainText('Q Parking Lot');
  await expect(card.locator('.nx-ticket-line',{hasText:'營業'})).toContainText('商場10:00-21:00');
  await expect(card.locator('.nx-more-summary')).toHaveText('其他資訊');
  await expect(card.locator('.nx-secondary-actions a',{hasText:'官網'})).toHaveCount(1);
  await expect(card.locator('.nx-secondary-actions button',{hasText:'樓層'})).toHaveCount(1);
  /* 展開鈕與子站清單不在可點區裡,展開不會跳去行程頁 */
  await card.locator('.nx-cluster-expand').click();
  await expect(page.locator('#view-today .nx-cluster-list')).toBeVisible();
  expect(await page.evaluate(()=>curView)).toBe('today');
  await card.locator('.nx-cluster-head').click();
  expect(await page.evaluate(()=>curView)).toBe('trip');
  await expect(page.locator('#view-trip .is-navigation-target')).toHaveAttribute('id',/^it_10\/18_/);
});

test('T4 the cluster card head is keyboard operable',async({page})=>{
  await openAt(page,'2026-10-19T16:35:00+09:00');
  const head=page.locator('#view-today .nx-cluster-head');
  await expect(head).toHaveAttribute('role','button');
  await expect(head).toHaveAttribute('aria-label','開啟完整行程：嚴島神社');
  await head.focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(()=>curView)).toBe('trip');
});

for(const [when,expected] of [['2026-10-22T10:00:00+09:00',{loc:'已處理 2/11',remain:'今日還有 8 個行程',prog:'完成 0 · 略過 2 / 共 11'}],['2026-10-19T15:45:00+09:00',{loc:'已處理 9/14',remain:'今日還有 4 個行程',prog:'完成 0 · 略過 9 / 共 14'}]]){
  test('T10 Today and the trip page count the same stops at '+when.slice(5,16),async({page})=>{
    await openAt(page,when);
    await expect(page.locator('#view-today .today-hero .loc')).toHaveText(expected.loc);
    await expect(page.locator('#view-today .nx-remain')).toHaveText(expected.remain);
    await page.evaluate(()=>{curDay=findToday();switchView('trip');});
    await expect(page.locator('#view-trip .day-head .prog')).toHaveText(expected.prog);
  });
}

const ITEM=(id,name,done,quantity)=>({id,name,category:'必買',unit:'個',legacyQtyText:'',allocations:[{allocationId:id+'-a',target:'',quantity:quantity||1,ledgerLinks:[]}],stopRef:'',done,createdAt:'2026-10-01T01:00:00.000Z',completedAt:done?'2026-10-01T02:00:00.000Z':'',splitGroupId:'',photoId:''});

test('T9 the card 記帳 button keeps the shopping list open after the form closes',async({page})=>{
  await openAt(page,'2026-10-19T12:00:00+09:00');
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('d1','點心',true)]);
  await page.locator('.shopping-list-segment button',{hasText:'已買'}).click();
  await page.locator('.shopping-item',{hasText:'點心'}).locator('.shopping-item-primary',{hasText:'記帳'}).click();
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  await page.locator('#ledgerEntrySheet .settings-close').click();
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  await expect(page.locator('#shoppingListOverlay')).toHaveCount(1);
  await expect(page.locator('.shopping-list-segment button',{hasText:'已買'})).toHaveAttribute('aria-pressed','true');
});

test('T17 partial purchase is a secondary action and its form waits for input before warning',async({page})=>{
  await openAt(page,'2026-10-19T12:00:00+09:00');
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('p1','白桃',false,3)]);
  const button=page.locator('.shopping-item',{hasText:'白桃'}).locator('.shopping-item-primary',{hasText:'部分購買'});
  await expect(button).toHaveClass(/shopping-item-secondary/);
  const style=await button.evaluate(element=>{const css=getComputedStyle(element);return {weight:css.fontWeight,background:css.backgroundColor};});
  expect(style).toEqual({weight:'700',background:'rgba(0, 0, 0, 0)'});
  await button.click();
  const form=page.locator('.shopping-split-form');
  await expect(form).toBeVisible();
  await expect(form.locator('.shopping-field-notice-warn')).toHaveCount(0);
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('.shopping-field-notice-warn')).toHaveText('請至少輸入一位對象本次買到的數量');
});

test('T17 typing a quantity and clearing it shows the warning',async({page})=>{
  await openAt(page,'2026-10-19T12:00:00+09:00');
  await page.evaluate(items=>{localStorage.setItem('trip_shopping_list',JSON.stringify(items));openShoppingList();},[ITEM('p1','白桃',false,3)]);
  await page.locator('.shopping-item',{hasText:'白桃'}).locator('.shopping-item-primary',{hasText:'部分購買'}).click();
  const input=page.locator('#shoppingSplitPurchased-0');
  await input.fill('1');
  await expect(page.locator('.shopping-split-form .shopping-field-notice-warn')).toHaveCount(0);
  await input.fill('0');
  await expect(page.locator('.shopping-split-form .shopping-field-notice-warn')).toHaveCount(1);
});
