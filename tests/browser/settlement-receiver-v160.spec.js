/* v160(Bar 2026-10-30,回程後第一批)
   ============================================================
   #60 收款人可以直接結清:「應收」那一列按「結清…」,選「已收到」或「不用付了」,不用等對方按「我已付款」。
   B3  結清被退回後重新標記,改用目前的轉帳建議金額(原本送出被退回那筆的舊金額)。
   T14 旅程結束後首頁先提醒還沒結清的帳,並給「前往分帳」。
   T5  清除旅程被擋下時,原因用白話寫(原本是「無法清除：無法清除：pending-queue」)。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''});
const expense=(id,payer,participants,amountJpy,time)=>({id,time:time||'2026-10-20T03:00:00.000Z',member:payer,category:'餐飲',detail:id,amountJpy,amountTwd:Math.round(amountJpy*0.21),
  note:'',participants:JSON.stringify(participants),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',
  storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:'FALSE',priceMode:'included',taxRate:'10',couponAmount:'0'});
const claim=(id,from,to,amount,time)=>({id,time,member:from,category:'其他',detail:'[結清] '+from+' → '+to,amountJpy:amount,amountTwd:0,note:'',
  participants:JSON.stringify([to]),payMethod:'',recordType:'settlement_claim',targetRecordId:'',deleteReason:'',batchId:'',inputCurrency:'JPY'});
const reject=(id,claimId,responder,reason,time)=>({id,time,member:responder,category:'其他',detail:'[結清退回]',amountJpy:0,amountTwd:0,note:reason,
  participants:'',payMethod:'',recordType:'settlement_reject',targetRecordId:claimId,deleteReason:'',batchId:''});

async function openAs(page,member,ledger,when){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,when||'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(([member,ledger,members])=>{
    closeMemberSelector();localStorage.setItem('trip_member',member);
    memberRegistrationBridge=members;DB.ledger=ledger;switchView('split');
  },[member,ledger,['Bar','Amy','Ken'].map(identity)]);
}
const queued=page=>page.evaluate(()=>ledgerRepository.queuedRecords().filter(r=>/^settlement_|^deletion$/.test(r.recordType)).map(r=>({type:r.recordType,member:r.member,note:r.note,amountJpy:r.amountJpy,participants:r.participants})));
const netJpy=(page,member)=>page.evaluate(member=>ledgerCurrentMemberSettlement(mergedLedgerRecords(),member,ledgerUniverseMode()).current.netJpy,member);

for(const [kind,button,label,note] of [['received','已收到','已收到','〔Bar 代記〕'],['waived','不用付了','免收','免收 〔Bar 代記〕']]){
  test('#60 the receiver settles a transfer line as '+label+' and both sides are even',async({page})=>{
    await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000)]);
    await page.evaluate(()=>openLedgerSettlementPanel());
    const row=page.locator('.ledger-settle-to-receive');
    await expect(row).toContainText('Amy ¥3,000');
    await expect(row.locator('.ledger-settle-chip')).toHaveText('應收');
    await row.getByRole('button',{name:'結清…'}).click();
    const dialog=page.locator('#ledgerReceiverSettleDialog');
    await expect(dialog.locator('h2')).toHaveText('結清 Amy 的 ¥3,000？');
    await dialog.getByRole('button',{name:new RegExp('^'+button)}).click();
    await expect(dialog).toHaveCount(0);
    expect(await queued(page)).toEqual([
      {type:'settlement_claim',member:'Amy',note,amountJpy:3000,participants:'["Bar"]'},
      {type:'settlement_confirm',member:'Bar',note:'',amountJpy:0,participants:''}
    ]);
    expect(await netJpy(page,'Bar')).toBe(0);
    expect(await netJpy(page,'Amy')).toBe(0);
    await expect(page.locator('#toast')).toContainText(kind==='waived'?'已結清（免收）':'已結清（已收到）');
    /* 結清紀錄寫出是哪一種;欠款者那邊也看到同樣的標記,而且沒有「我已付款」 */
    await page.evaluate(()=>openSettlementHistorySheet());
    await expect(page.locator('.ledger-settle-history')).toContainText('Amy → Bar ¥3,000');
    /* 離線測試:還沒讀回,所以帶「同步中」 */
    await expect(page.locator('.ledger-settle-history .ledger-settle-chip')).toHaveText(label+'・同步中');
    await page.evaluate(()=>{localStorage.setItem('trip_member','Amy');openLedgerSettlementPanel();});
    await expect(page.locator('#ledgerSettlementPanelBody')).not.toContainText('我已付款');
    await expect(page.locator('#ledgerSettlementPanelBody .ledger-settlement-status strong')).toHaveText('已結清');
  });
}

test('#60 undo within 10 seconds puts the line back',async({page})=>{
  await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000)]);
  await page.evaluate(()=>openLedgerSettlementPanel());
  await page.locator('.ledger-settle-to-receive').getByRole('button',{name:'結清…'}).click();
  await page.locator('#ledgerReceiverSettleDialog').getByRole('button',{name:/^已收到/}).click();
  await page.locator('#toast').getByRole('button',{name:'復原'}).click();
  await expect(page.locator('#toast')).toContainText('已復原，款項回到應收');
  expect((await queued(page)).map(r=>r.type)).toEqual(['settlement_claim','settlement_confirm','deletion']);
  expect(await netJpy(page,'Bar')).toBe(3000);
  await page.evaluate(()=>openLedgerSettlementPanel());
  await expect(page.locator('.ledger-settle-to-receive')).toContainText('Amy ¥3,000');
});

test('#60 when the debtor already marked it paid, the receiver confirms instead',async({page})=>{
  await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000),claim('c-1','Amy','Bar',3000,'2026-10-21T02:00:00.000Z')]);
  await page.evaluate(()=>openLedgerSettlementPanel());
  await expect(page.locator('.ledger-settle-to-receive')).toHaveCount(0);
  await expect(page.locator('#ledgerSettlementPanelBody').getByRole('button',{name:'確認已收'})).toHaveCount(1);
});

for(const width of [320,390]){
  test('#60 the receiver dialog fits at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:740});
    await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000)]);
    await page.evaluate(()=>{openLedgerSettlementPanel();});
    await page.locator('.ledger-settle-to-receive').getByRole('button',{name:'結清…'}).click();
    const fit=await page.evaluate(()=>{const panel=document.querySelector('#ledgerReceiverSettleDialog .state-dialog-panel');
      const options=[...panel.querySelectorAll('.ledger-receiver-settle-option')].map(b=>({h:Math.round(b.getBoundingClientRect().height),over:b.scrollWidth>b.clientWidth+1}));
      return {page:document.documentElement.scrollWidth<=window.innerWidth,options};});
    expect(fit.page).toBe(true);
    for(const option of fit.options){expect(option.h).toBeGreaterThanOrEqual(44);expect(option.over).toBe(false);}
  });
}

test('B3 re-marking after a rejection uses the current amount and asks when it changed',async({page})=>{
  /* Amy 標記 ¥5,000 被退回(金額不對),之後又多一筆宵夜;目前應付 ¥6,000 */
  await openAs(page,'Amy',[expense('e-1','Bar',['Bar','Amy'],10000,'2026-10-20T03:00:00.000Z'),claim('c-1','Amy','Bar',5000,'2026-10-21T01:00:00.000Z'),
    reject('r-1','c-1','Bar','金額不對','2026-10-21T01:05:00.000Z'),expense('e-2','Bar',['Bar','Amy'],2000,'2026-10-21T02:00:00.000Z')]);
  await page.evaluate(()=>openLedgerSettlementPanel());
  const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  await page.locator('#ledgerSettlementPanelBody').getByRole('button',{name:'我已付款'}).click();
  await expect.poll(()=>queued(page)).toEqual([{type:'settlement_claim',member:'Amy',note:'',amountJpy:6000,participants:'["Bar"]'}]);
  expect(dialogs).toEqual(['原本標記 ¥5,000，目前應付 ¥6,000。\n要以目前應付的金額重新標記已付款嗎？']);
});

test('T14 the ended-trip home asks to settle first and opens the settlement panel',async({page})=>{
  await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000)],'2026-10-25T10:00:00+09:00');
  await page.evaluate(()=>{switchView('today');});
  const home=page.locator('#endedTripHome');
  await expect(home.locator('.ended-settle-notice')).toHaveText('你還有應收 ¥3,000 ≈ NT$630。清除前請先在分帳結清。');
  await home.getByRole('button',{name:'前往分帳'}).click();
  expect(await page.evaluate(()=>curView)).toBe('split');
  await expect(page.locator('#ledgerSettlementPanelBody')).toBeVisible();
});

test('T14 the ended-trip home has no reminder once everyone is settled',async({page})=>{
  await openAs(page,'Bar',[],'2026-10-25T10:00:00+09:00');
  await page.evaluate(()=>{switchView('today');});
  await expect(page.locator('#endedTripHome')).toBeVisible();
  await expect(page.locator('#endedTripHome .ended-settle-notice')).toHaveCount(0);
  await expect(page.locator('#endedTripHome').getByRole('button',{name:'前往分帳'})).toHaveCount(0);
});

test('T5 a blocked clear explains the reasons in plain words',async({page})=>{
  await openAs(page,'Bar',[expense('e-1','Bar',['Bar','Amy'],6000)],'2026-10-25T10:00:00+09:00');
  const messages=await page.evaluate(()=>tripEndReasonMessages(['pending-queue','unsettled-balance','pending-claim','unknown-queue','unknown-bridge']));
  expect(messages).toEqual(['還有團體帳尚未上傳，請連上網路等它送出','團體帳還沒結清，請先到分帳完成結算','還有結清在等對方確認','無法讀取本機帳務狀態，請重新整理後再試']);
  /* 實際走一次:離線時預檢擋下,顯示的文字沒有英文代碼也沒有重複前綴 */
  await page.evaluate(()=>{openSettings('data');return beginTripEnd();});
  const status=page.locator('#tripEndStatus');
  await expect(status).toHaveText(/^無法清除：/);
  const text=await status.textContent();
  expect(text).not.toMatch(/[a-z]-[a-z]|無法清除：無法清除/);
});
