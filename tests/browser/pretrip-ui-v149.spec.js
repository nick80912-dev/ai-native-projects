/* v149 出發前小改版(Bar 2026-10-11 核准):第一站一行、交通彩色標籤、Huninn 不擋第一個畫面。 */
const {test,expect}=require('./support/test');
const {collectPageErrors,installFixedDate,installOnlineSheetMock,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

async function openWithFontRoute(page,handleFont){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.fallback();
    if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com')return handleFont(route,url);
    return route.abort('blockedbyclient');
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
}

test('出發前首頁列出第一站，不再寫「今天沒有排定行程」，D-7 倒數不變',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,'2026-10-11T09:00:00+09:00');
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  const hero=page.locator('#view-today .today-hero');
  await expect(hero.locator('.pretrip-first-stop')).toHaveText('第一站：10/18（日） 9:00 機場check in');
  await expect(hero.locator('.pretrip-count')).toHaveText('D-7');
  await expect(hero).not.toContainText('今天沒有排定行程');
  expect(errors).toEqual([]);
});

/* v151(Bar 2026-10-13):第一站與「出發當天」預覽重複同一站,預覽拿掉;兩顆動作鈕同一列、留間距。 */
test('出發前首頁的第一站只出現一次，採買清單與查看完整行程在同一列且不相黏',async({page})=>{
  const errors=collectPageErrors(page);
  await page.setViewportSize({width:320,height:760});
  await installFixedDate(page,'2026-10-13T09:00:00+08:00');
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  const hero=page.locator('#view-today .today-hero');
  await expect(hero.locator('.pretrip-first-stop')).toHaveText('第一站：10/18（日） 9:00 機場check in');
  await expect(hero).not.toContainText('出發當天');
  await expect(hero).not.toContainText('桃園機場');
  expect((await hero.innerText()).match(/9:00/g)).toHaveLength(1);
  const actions=await hero.locator('.today-hero-actions .today-hero-action').evaluateAll(nodes=>nodes.map(node=>{
    const box=node.getBoundingClientRect();return {text:node.textContent,left:box.left,right:box.right,top:box.top};
  }));
  expect(actions.map(action=>action.text)).toEqual(['採買清單 →','查看完整行程 →']);
  expect(actions[1].top).toBe(actions[0].top);
  expect(actions[1].left-actions[0].right).toBeGreaterThanOrEqual(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await expect(page.locator('#view-today .today-pretrip-day').first()).toContainText('桃園機場第一航廈1樓');
  expect(errors).toEqual([]);
});

test('交通標籤依方式上色，10/18 的航班顯示飛機',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,'2026-10-11T09:00:00+09:00');
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{switchView('trip');gotoDay(0);});
  const flight=page.locator('#view-trip .drive-chip',{hasText:'TPE'});
  await expect(flight).toHaveClass(/mode-flight/);
  await expect(flight).toContainText('✈️');
  const walk=page.locator('#view-trip .drive-chip',{hasText:'走路5分鐘'});
  await expect(walk).toHaveClass(/mode-walk/);
  const colors=await page.evaluate(()=>{
    const pick=selector=>{const el=document.querySelector(selector);const style=getComputedStyle(el);return [style.backgroundColor,style.color];};
    return {flight:pick('#view-trip .drive-chip.mode-flight'),walk:pick('#view-trip .drive-chip.mode-walk')};
  });
  expect(colors).toEqual({flight:['rgb(242, 164, 151)','rgb(62, 58, 57)'],walk:['rgb(246, 210, 122)','rgb(62, 58, 57)']});
  await page.evaluate(()=>{gotoDay(1);});
  await expect(page.locator('#view-trip .drive-chip',{hasText:'航程10分鐘'}).first()).toHaveClass(/mode-ferry/);
  await expect(page.locator('#view-trip .drive-chip',{hasText:'開車2小時'}).first()).toHaveClass(/mode-drive/);
  expect(errors).toEqual([]);
});

test('字型樣式表沒有回應時，第一個畫面照常出現並維持系統字',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,'2026-10-11T09:00:00+09:00');
  await installOnlineSheetMock(page);
  let fontRequests=0;
  await openWithFontRoute(page,()=>{fontRequests++;return new Promise(()=>{});});
  await expect(page.locator('#view-today .today-hero')).toBeVisible();
  await expect.poll(()=>fontRequests).toBe(1);
  expect(await page.evaluate(()=>({state:huninnFontState,huninn:document.documentElement.classList.contains('font-huninn'),
    font:getComputedStyle(document.body).fontFamily})))
    .toEqual({state:'loading',huninn:false,font:'"PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, sans-serif'});
  expect(errors).toEqual([]);
});

test('字型下載失敗時維持系統字，並移除樣式表',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openWithFontRoute(page,route=>route.abort('failed'));
  await expect.poll(()=>page.evaluate(()=>huninnFontState)).toBe('failed');
  expect(await page.evaluate(()=>({link:!!document.getElementById('huninnFontCss'),huninn:document.documentElement.classList.contains('font-huninn')})))
    .toEqual({link:false,huninn:false});
  expect(errors).toEqual([]);
});

test('離線時不去下載字型',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}});
  let fontRequests=0;
  await openWithFontRoute(page,route=>{fontRequests++;return route.abort('failed');});
  await expect.poll(()=>page.evaluate(()=>huninnFontState)).toBe('offline');
  expect(fontRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('字型下載完成後整頁一次換成 Huninn，標題字距歸零',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  /* 測試環境沒有真的 Huninn 字型檔:樣式表回空白,document.fonts.load 回報已載入一個字型 */
  await page.addInitScript(()=>{
    const original=document.fonts.load.bind(document.fonts);
    document.fonts.load=function(spec,text){window.__huninnLoadText=text;return /Huninn/.test(spec)?Promise.resolve([{family:'Huninn'}]):original(spec,text);};
  });
  await openWithFontRoute(page,route=>route.fulfill({status:200,contentType:'text/css',body:'/* qa */'}));
  await expect.poll(()=>page.evaluate(()=>huninnFontState)).toBe('ready');
  const result=await page.evaluate(()=>({
    huninn:document.documentElement.classList.contains('font-huninn'),
    font:getComputedStyle(document.body).fontFamily,
    title:getComputedStyle(document.getElementById('brandTitle')).letterSpacing,
    asked:window.__huninnLoadText.indexOf('岡')>=0
  }));
  expect(result).toEqual({huninn:true,font:'Huninn, "PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, sans-serif',title:'normal',asked:true});
  expect(errors).toEqual([]);
});
