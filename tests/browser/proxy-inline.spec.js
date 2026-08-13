const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const WIDTHS=[{width:320,height:700},{width:375,height:844},{width:390,height:844}];
const NOW='2026-08-03T10:00:00+08:00';
const TARGET='Bar的東京代購親友姓名';
const DETAIL='北海道限定薯條三兄弟超長品名測試';

async function installProxyFixtures(page){
  await page.addInitScript(({target,detail})=>{
    const base={
      member:'Bar',category:'伴手禮',amountJpy:1200,amountTwd:240,note:'',payMethod:'現金',
      isProxy:true,proxyTarget:target,inputCurrency:'JPY',isTaxFree:false,priceMode:'tax_included',taxRate:10,couponAmount:0
    };
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_personal_ledger',JSON.stringify([
      Object.assign({},base,{id:'proxy-recent',time:'2026-08-03T01:00:00.000Z',detail}),
      Object.assign({},base,{id:'proxy-batch-1',time:'2026-08-03T02:00:00.000Z',detail:'東京香蕉蛋糕',batchId:'proxy-batch',storeName:'東京車站伴手禮總店'}),
      Object.assign({},base,{id:'proxy-batch-2',time:'2026-08-03T02:00:01.000Z',detail:'白色戀人巧克力夾心餅乾',batchId:'proxy-batch',storeName:'東京車站伴手禮總店'})
    ]));
    localStorage.setItem('trip_shopping_list',JSON.stringify([{
      id:'proxy-shopping',name:detail,category:'必買',unit:'盒',legacyQtyText:'',
      allocations:[{allocationId:'proxy-shopping-a1',target,quantity:1,ledgerLinks:[]}],
      stopRef:'',done:false,createdAt:'2026-08-03T03:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''
    }]));
  },{target:TARGET,detail:DETAIL});
}

async function ledgerGeometry(page,selector){
  return page.locator(selector).first().evaluate(row=>{
    const body=row.querySelector('.ledger-recent-body');
    const main=row.querySelector('.ledger-recent-main');
    const amount=row.querySelector('.ledger-dual-amounts');
    const menu=row.querySelector('.ledger-record-menu-button');
    const title=row.querySelector('.ledger-recent-primary-line');
    const summary=row.querySelector('.ledger-proxy-target-summary');
    const mr=main.getBoundingClientRect(),ar=amount.getBoundingClientRect(),rr=row.getBoundingClientRect();
    return {
      documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      rowOverflow:row.scrollWidth>row.clientWidth,
      bodyOverflow:body.scrollWidth>body.clientWidth,
      titleInside:title.getBoundingClientRect().right<=mr.right+.5,
      summaryInside:summary.getBoundingClientRect().right<=mr.right+.5,
      amountClear:mr.right<=ar.left+.5,
      menuInside:!menu||(menu.getBoundingClientRect().right<=rr.right+.5),
      affixSize:getComputedStyle(summary.querySelector('.shopping-target-affix')).fontSize,
      badgeSize:getComputedStyle(summary.querySelector('.shopping-target-badge')).fontSize
    };
  });
}

async function shoppingGeometry(page){
  return page.locator('[data-shopping-item-id="proxy-shopping"]').evaluate(row=>{
    const body=row.querySelector('.shopping-item-body');
    const actions=row.querySelector('.shopping-item-actions');
    const summary=row.querySelector('.shopping-card-target-summary');
    const br=body.getBoundingClientRect(),ar=actions.getBoundingClientRect();
    return {
      documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      panelOverflow:document.querySelector('.shopping-list-panel').scrollWidth>document.querySelector('.shopping-list-panel').clientWidth,
      rowOverflow:row.scrollWidth>row.clientWidth,
      summaryInside:summary.getBoundingClientRect().right<=br.right+.5,
      actionClear:br.right<=ar.left+.5,
      affixSize:getComputedStyle(summary.querySelector('.shopping-target-affix')).fontSize,
      badgeSize:getComputedStyle(summary.querySelector('.shopping-target-badge')).fontSize
    };
  });
}

test('消費與採買卡同行顯示共用代購標記，消費卡窄螢幕維持兩行截斷',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await installProxyFixtures(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('split');});

  const recent=page.locator('.ledger-recent-row').filter({hasText:DETAIL}).first();
  await expect(recent.locator('.ledger-recent-primary-line')).toContainText(DETAIL);
  await expect(recent.locator('.ledger-proxy-target-summary')).toHaveText(`幫${TARGET}買`);
  await expect(recent.locator('.ledger-proxy-target-summary')).toHaveAttribute('aria-label',`幫${TARGET}買`);
  await expect(recent.locator('.ledger-recent-badges')).toHaveCount(0);

  const batch=page.locator('.ledger-batch-card').first();
  await expect(batch.locator('.ledger-batch-body')).toContainText('2 項代購');
  await expect(batch.locator('.ledger-batch-body')).not.toContainText('現金');
  await expect(batch.locator('.ledger-batch-body .ledger-recent-main')).toHaveCount(1);
  await expect(batch.locator('.ledger-batch-body .ledger-recent-primary-line')).toHaveCount(1);
  await expect(batch.locator('.ledger-batch-body .ledger-recent-secondary-line')).toHaveCount(1);
  await batch.locator('.ledger-batch-body').click();
  await expect(batch.locator('.ledger-batch-children .ledger-proxy-target-summary')).toHaveCount(2);

  await page.evaluate(()=>showLedgerFullList());
  await expect(page.getByRole('heading',{name:'個人完整紀錄'})).toBeVisible();
  await expect(page.locator('#ledgerHistoryResults .ledger-proxy-target-summary')).toHaveCount(3);

  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    const ledger=await ledgerGeometry(page,'#ledgerHistoryResults .ledger-recent-row');
    expect(ledger,`ledger @${viewport.width}`).toEqual({
      documentOverflow:false,rowOverflow:false,bodyOverflow:false,titleInside:true,summaryInside:true,
      amountClear:true,menuInside:true,affixSize:'8.5px',badgeSize:'9px'
    });

    await page.evaluate(()=>openShoppingList());
    const shopping=page.locator('[data-shopping-item-id="proxy-shopping"]');
    await expect(shopping.locator('.shopping-card-target-summary')).toHaveText(`幫${TARGET}買`);
    const geometry=await shoppingGeometry(page);
    expect(geometry,`shopping @${viewport.width}`).toEqual({
      documentOverflow:false,panelOverflow:false,rowOverflow:false,summaryInside:true,actionClear:true,
      affixSize:'9.5px',badgeSize:'10.5px'
    });
    await page.evaluate(()=>closeShoppingList());
  }

  expect(errors).toEqual([]);
});
