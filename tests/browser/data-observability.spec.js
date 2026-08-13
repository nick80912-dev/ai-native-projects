const {test,expect}=require('@playwright/test');
const {collectPageErrors,installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.describe.configure({mode:'serial'});

const WIDTHS=[{width:320,height:700},{width:375,height:844},{width:390,height:844}];
const NOW='2026-08-03T10:00:00+08:00';

async function recentCardLayout(page,detail){
  return page.locator('.ledger-recent-row').filter({hasText:detail}).first().evaluate(row=>{
    const body=row.querySelector('.ledger-recent-body');
    const main=row.querySelector('.ledger-recent-main');
    const primary=row.querySelector('.ledger-recent-primary-line');
    const secondary=row.querySelector('.ledger-recent-secondary-line');
    const flexibleDetail=row.querySelector('.ledger-recent-detail');
    const location=row.querySelector('.ledger-recent-location');
    const amounts=row.querySelector('.ledger-dual-amounts');
    const mainRect=main.getBoundingClientRect();
    const primaryStyle=getComputedStyle(primary),secondaryStyle=getComputedStyle(secondary);
    const detailStyle=getComputedStyle(flexibleDetail),locationStyle=getComputedStyle(location);
    return {
      documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      rowOverflow:row.scrollWidth>row.clientWidth,
      bodyOverflow:body.scrollWidth>body.clientWidth,
      mainRows:main.children.length,
      primaryNoWrap:primaryStyle.whiteSpace==='nowrap',
      secondaryNoWrap:secondaryStyle.whiteSpace==='nowrap',
      primarySingleLine:primary.scrollHeight<=primary.clientHeight+.5,
      secondarySingleLine:secondary.scrollHeight<=secondary.clientHeight+.5,
      detailEllipsis:detailStyle.overflowX==='hidden'&&detailStyle.textOverflow==='ellipsis',
      locationEllipsis:locationStyle.overflowX==='hidden'&&locationStyle.textOverflow==='ellipsis',
      amountClear:mainRect.right<=amounts.getBoundingClientRect().left+.5,
      compact:row.getBoundingClientRect().height<=74
    };
  });
}

async function batchCardLayout(page,title){
  return page.locator('.ledger-batch-card').filter({hasText:title}).first().evaluate(row=>{
    const body=row.querySelector('.ledger-batch-body'),main=row.querySelector('.ledger-recent-main');
    const primary=row.querySelector('.ledger-recent-primary-line'),secondary=row.querySelector('.ledger-recent-secondary-line');
    const amounts=row.querySelector('.ledger-dual-amounts'),mainRect=main.getBoundingClientRect();
    return {
      documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      rowOverflow:row.scrollWidth>row.clientWidth,
      bodyOverflow:body.scrollWidth>body.clientWidth,
      mainRows:main.children.length,
      primaryNoWrap:getComputedStyle(primary).whiteSpace==='nowrap',
      secondaryNoWrap:getComputedStyle(secondary).whiteSpace==='nowrap',
      bodyCentered:getComputedStyle(body).alignItems==='center',
      leftAligned:getComputedStyle(primary).textAlign==='left'&&getComputedStyle(secondary).textAlign==='left',
      amountClear:mainRect.right<=amounts.getBoundingClientRect().left+.5
    };
  });
}

async function installLedgerFixture(page){
  await page.addInitScript(()=>{
    localStorage.setItem('trip_personal_ledger',JSON.stringify([
      {id:'p-today',time:'2026-08-03T01:00:00.000Z',member:'Bar',category:'餐飲',detail:'早餐超長品項名稱用來驗證手機省略號',storeName:'早餐店超長分店名稱用來驗證手機省略號',amountJpy:700,amountTwd:140,note:'',payMethod:'現金',isProxy:true,proxyTarget:'Amy 長名稱'},
      {id:'p-old',time:'2026-08-02T01:00:00.000Z',member:'Bar',category:'交通',detail:'車資',storeName:'車站',amountJpy:1100,amountTwd:220,note:'',payMethod:'現金'}
    ]));
  });
}

test('個人與團體摘要以今日為主、旅程累計為次，三種手機寬度無溢位',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await installLedgerFixture(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('split');});

  await expect(page.locator('.ledger-summary-count')).toHaveText('今日支出 · 1 筆');
  await expect(page.locator('.ledger-summary-amount strong')).toHaveText('¥700');
  await expect(page.locator('.ledger-summary-trip')).toContainText('旅程累計 · 2 筆');
  await expect(page.locator('.ledger-summary-trip strong')).toHaveText('¥1,800');
  await expect(page.locator('.ledger-today-hint')).toHaveCount(0);

  const personal=page.locator('.ledger-recent-row').filter({hasText:'早餐超長品項'}).first();
  await expect(personal.locator('.ledger-recent-primary-line')).toContainText(/早餐超長品項名稱用來驗證手機省略號.*幫.*Amy 長名稱.*買/);
  await expect(personal.locator('.ledger-recent-payment')).toHaveCount(0);
  await expect(personal).not.toContainText('現金');
  await expect(personal.locator('.ledger-recent-secondary-line')).toHaveText(/早餐店超長分店名稱用來驗證手機省略號.*🍜 餐飲/);
  await expect(personal.locator('.ledger-recent-badges')).toHaveCount(0);
  await personal.locator('.ledger-recent-body').click();
  const detail=page.getByRole('dialog',{name:'消費明細'});
  await expect(detail.locator('.ledger-detail-row').filter({hasText:'支付方式'})).toContainText('現金');
  await detail.getByRole('button',{name:'關閉'}).click();
  for(const size of WIDTHS){
    await page.setViewportSize(size);
    expect(await recentCardLayout(page,'早餐超長品項'),`personal recent card @${size.width}`).toEqual({
      documentOverflow:false,rowOverflow:false,bodyOverflow:false,mainRows:2,
      primaryNoWrap:true,secondaryNoWrap:true,primarySingleLine:true,secondarySingleLine:true,
      detailEllipsis:true,locationEllipsis:true,amountClear:true,compact:true
    });
  }

  await page.evaluate(()=>{
    DB.ledger=[
      {id:'g-today',time:'2026-08-03T02:00:00.000Z',member:'Amy',category:'餐飲',detail:'團體早餐超長品項名稱用來驗證手機省略號',storeName:'團體早餐店超長分店名稱用來驗證手機省略號',amountJpy:900,amountTwd:180,participants:'["Bar","Amy"]',payMethod:'現金',recordType:'',isTaxFree:true,pending:true,_correctionProtected:true},
      {id:'g-old',time:'2026-08-02T02:00:00.000Z',member:'Bar',category:'交通',detail:'團體車資',storeName:'巴士公司',amountJpy:1500,amountTwd:300,participants:'["Bar","Amy"]',payMethod:'現金',recordType:''}
    ];
    setLedgerTrack('shared');
  });
  await expect(page.locator('.ledger-summary-count')).toHaveText('與我相關 · 今日消費 · 1 筆');
  await expect(page.locator('.ledger-summary-trip')).toContainText('與我相關旅程累計 · 2 筆');
  await expect(page.locator('.ledger-summary-card')).not.toContainText('我的支出');

  const shared=page.locator('.ledger-recent-row').filter({hasText:'團體早餐超長品項'}).first();
  await expect(shared.locator('.ledger-recent-primary-line')).toContainText(/團體早餐超長品項名稱用來驗證手機省略號.*Amy付款.*2 人分攤/);
  await expect(shared.locator('.ledger-recent-payment')).toHaveCount(0);
  await expect(shared).not.toContainText('現金');
  await expect(shared.locator('.ledger-shared-participant-summary')).toContainText(/Amy付款.*2 人分攤/);
  await expect(shared.locator('.ledger-recent-badges')).toHaveCount(0);
  await expect(shared.locator('.ledger-recent-secondary-line')).toContainText(/團體早餐店超長分店名稱用來驗證手機省略號.*🍜 餐飲.*免稅品.*待同步.*已鎖帳/);
  const neutralColors=await shared.evaluate(row=>{
    const context=row.querySelector('.ledger-shared-participant-summary .ledger-recent-badge');
    const locked=Array.from(row.querySelectorAll('.ledger-recent-badge')).find(node=>node.textContent.includes('已鎖帳'));
    const pending=row.querySelector('.ledger-recent-badge.pending');
    const colors=node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color});
    return {context:colors(context),locked:colors(locked),pending:colors(pending)};
  });
  expect(neutralColors.context).toEqual(neutralColors.locked);
  expect(neutralColors.pending).toEqual({background:'rgb(255, 243, 207)',color:'rgb(128, 96, 13)'});

  for(const size of WIDTHS){
    await page.setViewportSize(size);
    const layout=await page.evaluate(()=>{
      const root=document.documentElement,card=document.querySelector('.ledger-summary-card'),trip=document.querySelector('.ledger-summary-trip');
      return {
        documentOverflow:root.scrollWidth>root.clientWidth,
        cardOverflow:card.scrollWidth>card.clientWidth,
        tripOverflow:trip.scrollWidth>trip.clientWidth,
        cardHeight:Math.round(card.getBoundingClientRect().height)
      };
    });
    expect(layout.documentOverflow,`document overflow @${size.width}`).toBe(false);
    expect(layout.cardOverflow,`summary card overflow @${size.width}`).toBe(false);
    expect(layout.tripOverflow,`trip footer overflow @${size.width}`).toBe(false);
    expect(layout.cardHeight,`summary card content height @${size.width}`).toBeGreaterThan(150);
    expect(await recentCardLayout(page,'團體早餐超長品項'),`shared recent card @${size.width}`).toEqual({
      documentOverflow:false,rowOverflow:false,bodyOverflow:false,mainRows:2,
      primaryNoWrap:true,secondaryNoWrap:true,primarySingleLine:true,secondarySingleLine:true,
      detailEllipsis:true,locationEllipsis:true,amountClear:true,compact:true
    });
  }

  await page.evaluate(()=>{
    DB.ledger=[
      {id:'g-batch-a',batchId:'g-breakfast',time:'2026-08-03T02:00:00.000Z',member:'Amy',category:'餐飲',detail:'早餐套餐',storeName:'團體早餐批次店超長名稱',amountJpy:900,amountTwd:180,participants:'["Bar","Amy"]',payMethod:'現金',recordType:'',pending:true},
      {id:'g-batch-b',batchId:'g-breakfast',time:'2026-08-03T02:00:01.000Z',member:'Amy',category:'飲品',detail:'咖啡',storeName:'團體早餐批次店超長名稱',amountJpy:600,amountTwd:120,participants:'["Bar","Amy"]',payMethod:'現金',recordType:'',_correctionProtected:true}
    ];
    renderSplit();
  });
  const sharedBatch=page.locator('.ledger-batch-card').filter({hasText:'團體早餐批次店'}).first();
  await expect(sharedBatch.locator('.ledger-batch-body')).toContainText('Amy付款 · 分攤依品項');
  await expect(sharedBatch.locator('.ledger-batch-body')).not.toContainText('現金');
  for(const size of WIDTHS){
    await page.setViewportSize(size);
    expect(await batchCardLayout(page,'團體早餐批次店'),`shared batch @${size.width}`).toEqual({
      documentOverflow:false,rowOverflow:false,bodyOverflow:false,mainRows:2,
      primaryNoWrap:true,secondaryNoWrap:true,bodyCentered:true,leftAligned:true,amountClear:true
    });
  }
  await sharedBatch.locator('.ledger-batch-body').click();
  await expect(sharedBatch.locator('.ledger-batch-children .ledger-recent-row')).toHaveCount(2);
  await expect(sharedBatch.locator('.ledger-batch-children .ledger-shared-participant-summary')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('健康同步 header 保持精簡，partial 與設定健康摘要顯示人類可讀來源',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>closeMemberSelector());

  const online=await page.evaluate(()=>{
    const now=Date.now(),snapshot={formatVersion:1,source:'online',createdAt:now-5*60000,lastCompleteAt:now-5*60000,generationId:'online-v88',sheets:CURRENT_SNAPSHOT.sheets,sheetMeta:{},validation:{warnings:[]}};
    CURRENT_SNAPSHOT=snapshot;
    localStorage.setItem('trip_data_snapshot_state',JSON.stringify({formatVersion:1,active:snapshot,previous:null}));
    setSyncState('online');
    const button=document.getElementById('syncBtn');
    return {text:button.textContent.trim(),aria:button.getAttribute('aria-label')};
  });
  expect(online.text).toBe('已同步');
  expect(online.aria).toBe('已同步，資料更新於5 分鐘前');

  await page.locator('#syncBtn').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'資料同步狀態'})).toBeVisible();
  await page.getByRole('button',{name:'關閉'}).click();

  await page.evaluate(()=>{
    const now=Date.now(),previous=CURRENT_SNAPSHOT;
    const partial={formatVersion:1,source:'online',createdAt:now,lastCompleteAt:previous.createdAt,generationId:'partial-v88',sheets:previous.sheets,sheetMeta:{ledger:{failed:true,source:'current-snapshot',sourceCreatedAt:previous.createdAt}},validation:{warnings:[]}};
    CURRENT_SNAPSHOT=partial;
    localStorage.setItem('trip_data_snapshot_state',JSON.stringify({formatVersion:1,active:partial,previous}));
    localStorage.removeItem('trip_sync_last_failure');
    localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'pending-1',detail:'待送紀錄'}]));
    setSyncState('partial');
    openSettings('root');
  });
  await expect(page.locator('#syncTxt')).toHaveText('部分同步 · 剛剛');
  await expect(page.getByRole('button',{name:/備份、還原與版本資訊/})).toContainText('2 項需注意');
  await page.getByRole('button',{name:/備份、還原與版本資訊/}).click();
  await expect(page.getByRole('heading',{name:'資料健康狀態'})).toBeVisible();
  await expect(page.locator('.data-health-trip')).toContainText('部分同步 · 剛剛');
  await expect(page.locator('.data-health-trip')).toContainText('未更新：分帳資料');
  await expect(page.locator('.data-health-shared')).toContainText('1 筆待同步');
  await expect(page.locator('.data-health-personal')).toContainText('僅此裝置');
  await expect(page.locator('.settings-data-health')).not.toContainText('ledger');

  for(const size of WIDTHS){
    await page.setViewportSize(size);
    const layout=await page.evaluate(()=>{
      const root=document.documentElement,panel=document.querySelector('#settingsOverlay .settings-panel');
      return {
        documentOverflow:root.scrollWidth>root.clientWidth,
        panelOverflow:panel.scrollWidth>panel.clientWidth,
        rowOverflow:Array.from(panel.querySelectorAll('.settings-health-row')).some(row=>row.scrollWidth>row.clientWidth),
        syncRight:document.getElementById('syncBtn').getBoundingClientRect().right,
        settingsLeft:document.querySelector('.settings-btn').getBoundingClientRect().left
      };
    });
    expect(layout.documentOverflow,`document overflow @${size.width}`).toBe(false);
    expect(layout.panelOverflow,`settings panel overflow @${size.width}`).toBe(false);
    expect(layout.rowOverflow,`health row overflow @${size.width}`).toBe(false);
    expect(layout.syncRight,`sync button remains left of settings @${size.width}`).toBeLessThanOrEqual(layout.settingsLeft);
  }
  expect(errors).toEqual([]);
});
