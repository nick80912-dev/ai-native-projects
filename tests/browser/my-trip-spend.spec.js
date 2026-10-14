/* v154（Bar 2026-10-14 核准）「我的總花費」：分帳頁個人分頁的精簡卡與明細。
   個人帳（不含代購）＋團體帳中我分到的份額；刪除、還款、測試帳本不算，我只先墊的錢不算。 */
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

test.describe('v154 我的總花費',()=>{
  test.use({timezoneId:'Asia/Tokyo'});

  test('個人分頁顯示精簡卡：個人（不含代購）＋團體份額；團體分頁不顯示',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    const card=page.locator('.ledger-total-spend-card');
    await expect(card).toHaveCount(1);
    /* 個人 680+5800（白桃果醬是代購，不算）；團體 燒肉 6000＋民宿 12000（車票我只先墊、居酒屋沒有我、門票已刪、測試與還款不算） */
    await expect(card.locator('.ledger-total-spend-amount')).toHaveText('¥24,480');
    await expect(card.locator('.ledger-total-spend-detail')).toHaveText('個人（不含代購）¥6,480 · 團體份額 ¥18,000');
    /* v155：10/20 只有被刪掉的門票、測試門票與居酒屋（沒有我），所以今天是 ¥0；上方大卡改名「個人今日支出」 */
    await expect(card.locator('.ledger-total-spend-today')).toHaveText('今天 ¥0');
    await expect(page.locator('.ledger-summary-count')).toContainText('個人今日支出');
    expect(await card.evaluate(el=>Math.round(el.getBoundingClientRect().height))).toBeLessThanOrEqual(72);
    const order=await page.evaluate(()=>Array.from(document.querySelectorAll('#view-split .ledger-dashboard > *'),el=>el.className.split(' ').find(c=>/ledger-(summary|total-spend|proxy-summary)-card/.test(c))).filter(Boolean));
    expect(order).toEqual(['ledger-summary-card','ledger-total-spend-card','ledger-proxy-summary-card']);
    await page.evaluate(()=>setLedgerTrack('shared'));
    await expect(page.locator('.ledger-total-spend-card')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('點開看類別與逐筆團體份額，並說明算法',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.locator('.ledger-total-spend-card').click();
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
    expect(pageErrors).toEqual([]);
  });

  test('切成台幣顯示時卡片與明細跟著用台幣；320px 不溢位',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.setViewportSize({width:320,height:640});
    await page.evaluate(()=>{ledgerUiState.displayCurrency='TWD';renderSplit();});
    const card=page.locator('.ledger-total-spend-card');
    await expect(card.locator('.ledger-total-spend-amount')).toHaveText('NT$5,141');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await card.click();
    await expect(page.locator('#myTripSpendGroupItems .ledger-spend-row').first()).toContainText('NT$2,520');
    expect(await page.locator('#ledgerInfoSheet .ledger-sheet').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('只有團體份額、沒有個人帳時也顯示；什麼都沒有時不顯示',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.evaluate(()=>{localStorage.setItem('trip_personal_ledger','[]');renderSplit();});
    await expect(page.locator('.ledger-total-spend-detail')).toHaveText('個人（不含代購）¥0 · 團體份額 ¥18,000');
    await page.evaluate(()=>{DB.ledger=DB.ledger.filter(r=>r.recordType==='identity_registration');renderSplit();});
    await expect(page.locator('.ledger-total-spend-card')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('v155：卡片與明細的「今天」＝今天的個人（不含代購）＋今天的團體份額',async({page})=>{
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
    /* 個人今日支出照舊只算個人帳（含代購）；總花費的今天不含代購、加上團體份額 2000 */
    await expect(page.locator('.ledger-summary-amount strong')).toHaveText('¥2,400');
    await expect(page.locator('.ledger-total-spend-today')).toHaveText('今天 ¥2,900');
    await page.locator('.ledger-total-spend-card').click();
    await expect(page.locator('.ledger-spend-today')).toHaveText('今天 ¥2,900（個人 ¥900 · 團體 ¥2,000）');
    expect(pageErrors).toEqual([]);
  });

  test('團體帳測試模式開著時，總花費仍只算正式帳本並註明',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await setup(page);
    await page.evaluate(()=>{localStorage.setItem('trip_ledger_test_mode','true');renderSplit();});
    await expect(page.locator('.ledger-total-spend-amount')).toHaveText('¥24,480');
    await page.locator('.ledger-total-spend-card').click();
    await expect(page.getByRole('dialog',{name:'我的總花費'})).toContainText('測試帳本的紀錄不算在內');
    expect(pageErrors).toEqual([]);
  });
});
