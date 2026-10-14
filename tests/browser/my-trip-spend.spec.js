/* v154（Bar 2026-10-14 核准）「我的總花費」：個人帳（不含代購）＋團體帳中我分到的份額；
   刪除、還款、測試帳本不算，我只先墊的錢不算。
   v155（Bar 2026-10-14 核准第 2 版）：併進個人分頁大卡——今天花費、代購列（只顯示金額）、整趟旅程列（不含代購）。 */
const {test,expect}=require('./support/test');
const {collectPageErrors,installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');


async function setup(page){
  await installFixedDate(page,'2026-10-20T12:00:00+09:00');
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>{
    localStorage.setItem('trip_personal_ledger',JSON.stringify([
      {id:'p1',time:'2026-10-18T09:10:00.000Z',member:'Bar',category:'餐飲',detail:'飯糰',storeName:'Lawson',amountJpy:680,amountTwd:143,note:'',payMethod:'現金'},
      {id:'p2',time:'2026-10-19T06:00:00.000Z',member:'Bar',category:'購物',detail:'白桃果醬',storeName:'岡山站',amountJpy:2400,amountTwd:504,note:'',payMethod:'信用卡',isProxy:true,proxyTarget:'媽媽'},
      {id:'p3',time:'2026-10-19T07:30:00.000Z',member:'Bar',category:'美妝',detail:'藥妝',storeName:'松本清',amountJpy:5800,amountTwd:1218,note:'',payMethod:'信用卡'}
    ]));
  });
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    const P=list=>JSON.stringify(list);
    const reg=['Bar','Amy','Ken','Mei'].map((member,i)=>({id:'reg-'+i,time:'2026-10-17T00:0'+i+':00.000Z',member,category:'',detail:'[身分註冊]',amountJpy:0,amountTwd:0,participants:'',payMethod:'',recordType:'identity_registration'}));
    const four=P(['Bar','Amy','Ken','Mei']);
    const g=(id,time,member,category,detail,jpy,twd,people,extra)=>Object.assign({id,time,member,category,detail,storeName:'',amountJpy:jpy,amountTwd:twd,note:'',participants:people,payMethod:'現金',recordType:''},extra||{});
    DB.ledger=reg.concat([
      g('g1','2026-10-18T10:30:00.000Z','Amy','餐飲','燒肉晚餐',24000,5040,four),
      g('g2','2026-10-19T08:00:00.000Z','Bar','其他','民宿兩晚',48000,10080,four),
      g('g3','2026-10-19T05:00:00.000Z','Bar','交通','幫兩人付的車票',3000,630,P(['Ken','Amy'])),
      g('g4','2026-10-20T09:00:00.000Z','Ken','餐飲','居酒屋',10000,2100,P(['Ken','Amy'])),
      g('g5','2026-10-20T01:00:00.000Z','Amy','票券','被刪掉的門票',8400,1764,four),
      g('g6','2026-10-20T02:00:00.000Z','Amy','票券','[TEST] 測試門票',4000,840,four),
      {id:'c1',time:'2026-10-20T03:00:00.000Z',member:'Bar',category:'其他',detail:'[還款]',amountJpy:2000,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'settlement_claim',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:'FALSE',priceMode:'',taxRate:'0',couponAmount:'0'}
    ]);
    DB.ledger.push(createLedgerDeletion(DB.ledger.find(r=>r.id==='g5'),'Amy','記錯了'));
    closeMemberSelector();
    switchView('split');
    setLedgerTrack('personal');
  });
}

test.describe('v155 個人大卡：今天花費、代購、整趟旅程',()=>{
  test.use({timezoneId:'Asia/Tokyo'});

  test('大卡顯示今天花費、代購與整趟旅程；不再有另外的總花費卡與代購卡；團體分頁不變',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    const card=page.locator('.ledger-summary-card');
    /* 10/20 只有被刪掉的門票、測試門票與居酒屋（沒有我），所以今天是 ¥0，也不顯示組成說明 */
    await expect(card.locator('.ledger-summary-count')).toHaveText('今天花費');
    await expect(card.locator('.ledger-summary-amount strong')).toHaveText('¥0');
    /* 代購只顯示金額，對象名單要點開才看得到 */
    await expect(card.locator('.ledger-summary-proxy')).toHaveText(/^代購¥2,400〉$/);
    /* 整趟：個人 680+5800（白桃果醬是代購，不算）；團體 燒肉 6000＋民宿 12000（車票我只先墊、居酒屋沒有我、門票已刪、測試與還款不算） */
    await expect(card.locator('.ledger-summary-total')).toHaveText(/^整趟旅程不含代購¥24,480〉$/);
    await expect(page.locator('.ledger-total-spend-card, .ledger-proxy-summary-card')).toHaveCount(0);
    const rows=await card.locator('.ledger-summary-row').evaluateAll(list=>list.map(el=>Math.round(el.getBoundingClientRect().height)));
    expect(rows.length).toBe(2);
    rows.forEach(height=>expect(height).toBeGreaterThanOrEqual(44));
    const order=await page.evaluate(()=>Array.from(document.querySelectorAll('#view-split .ledger-dashboard > *'),el=>el.className));
    expect(order).toEqual(['ledger-summary-card','ledger-recent-section']);
    await page.evaluate(()=>setLedgerTrack('shared'));
    await expect(page.locator('.ledger-summary-row')).toHaveCount(0);
    await expect(page.locator('.ledger-summary-trip')).toContainText('與我相關旅程累計');
    expect(pageErrors).toEqual([]);
  });

  test('點整趟旅程看類別與逐筆團體份額；點代購看對象',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.locator('.ledger-summary-total').click();
    const sheet=page.getByRole('dialog',{name:'我的總花費'});
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.ledger-spend-hero strong')).toHaveText('¥24,480');
    await expect(sheet.locator('.ledger-spend-hero')).toContainText('≈ NT$5,141');
    const categories=sheet.locator('.ledger-spend-list').first().locator('.ledger-spend-row');
    await expect(categories).toHaveText([/其他.*團體 ¥12,000.*¥12,000/,/餐飲.*團體 ¥6,000 · 個人 ¥680.*¥6,680/,/美妝.*個人 ¥5,800.*¥5,800/]);
    const items=sheet.locator('#myTripSpendGroupItems .ledger-spend-row');
    await expect(items).toHaveText([/10\/19 民宿兩晚.*你付 · 4 人分.*¥12,000/,/10\/18 燒肉晚餐.*Amy 付 · 4 人分.*¥6,000/]);
    await expect(sheet).toContainText('團體份額明細 · 2 筆');
    await expect(sheet).toContainText('不含代購 ¥2,400（1 筆，幫別人買的）');
    await expect(sheet).toContainText('團體帳只算你分到的份額，不算你先墊的錢');
    await expect(sheet).not.toContainText('被刪掉的門票');
    await expect(sheet).not.toContainText('測試門票');
    await expect(sheet).not.toContainText('居酒屋');
    await expect(sheet).not.toContainText('幫兩人付的車票');
    await sheet.getByRole('button',{name:'關閉'}).click();
    await page.locator('.ledger-summary-proxy').click();
    await expect(page.getByRole('dialog',{name:'代購對象彙總'})).toContainText('媽媽 · 1 筆');
    expect(pageErrors).toEqual([]);
  });

  test('點大數字切成台幣，三列跟著用台幣；320px 不溢位',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.setViewportSize({width:320,height:640});
    await page.locator('.ledger-summary-amount').click();
    const card=page.locator('.ledger-summary-card');
    await expect(card.locator('.ledger-summary-amount strong')).toHaveText('NT$0');
    await expect(card.locator('.ledger-summary-proxy strong')).toHaveText('NT$504');
    await expect(card.locator('.ledger-summary-total strong')).toHaveText('NT$5,141');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    expect(await card.evaluate(el=>[el,...el.querySelectorAll('.ledger-summary-row,.ledger-summary-count')].every(node=>node.scrollWidth<=node.clientWidth))).toBe(true);
    await card.locator('.ledger-summary-total').click();
    await expect(page.locator('#myTripSpendGroupItems .ledger-spend-row').first()).toContainText('NT$2,520');
    expect(await page.locator('#ledgerInfoSheet .ledger-sheet').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('沒有代購就不顯示代購列；什麼都沒有時整趟旅程是 ¥0',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.evaluate(()=>{localStorage.setItem('trip_personal_ledger','[]');renderSplit();});
    await expect(page.locator('.ledger-summary-proxy')).toHaveCount(0);
    await expect(page.locator('.ledger-summary-total strong')).toHaveText('¥18,000');
    await page.evaluate(()=>{DB.ledger=DB.ledger.filter(r=>r.recordType==='identity_registration');renderSplit();});
    await expect(page.locator('.ledger-summary-amount strong')).toHaveText('¥0');
    await expect(page.locator('.ledger-summary-total strong')).toHaveText('¥0');
    expect(pageErrors).toEqual([]);
  });

  test('今天花費＝今天的個人（不含代購）＋今天的團體份額，旁邊寫出組成',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.evaluate(()=>{
      const list=JSON.parse(localStorage.getItem('trip_personal_ledger'));
      list.push({id:'t1',time:'2026-10-20T01:00:00.000Z',member:'Bar',category:'餐飲',detail:'早餐',storeName:'',amountJpy:900,amountTwd:189,note:'',payMethod:'現金'});
      list.push({id:'t2',time:'2026-10-20T02:00:00.000Z',member:'Bar',category:'購物',detail:'代購伴手禮',storeName:'',amountJpy:1500,amountTwd:315,note:'',payMethod:'現金',isProxy:true,proxyTarget:'媽媽'});
      localStorage.setItem('trip_personal_ledger',JSON.stringify(list));
      DB.ledger.push({id:'g9',time:'2026-10-20T03:00:00.000Z',member:'Mei',category:'餐飲',detail:'午餐',storeName:'',amountJpy:4000,amountTwd:840,note:'',participants:JSON.stringify(['Bar','Mei']),payMethod:'現金',recordType:''});
      renderSplit();
    });
    const card=page.locator('.ledger-summary-card');
    await expect(card.locator('.ledger-summary-amount strong')).toHaveText('¥2,900');
    await expect(card.locator('.ledger-summary-count')).toHaveText('今天花費個人 ¥900 ＋ 團體份額 ¥2,000');
    await expect(card.locator('.ledger-summary-proxy strong')).toHaveText('¥3,900');
    await expect(card.locator('.ledger-summary-total strong')).toHaveText('¥27,380');
    expect(pageErrors).toEqual([]);
  });

  test('團體帳測試模式開著時，整趟旅程仍只算正式帳本並註明',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.evaluate(()=>{localStorage.setItem('trip_ledger_test_mode','true');renderSplit();});
    await expect(page.locator('.ledger-summary-total strong')).toHaveText('¥24,480');
    await page.locator('.ledger-summary-total').click();
    await expect(page.getByRole('dialog',{name:'我的總花費'})).toContainText('測試帳本的紀錄不算在內');
    expect(pageErrors).toEqual([]);
  });
});
