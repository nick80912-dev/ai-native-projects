const {test,expect}=require('./support/test');
const {installFixedDate,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({
  viewport:{width:390,height:844},
  hasTouch:true,
  isMobile:true,
  userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
});

test.beforeEach(async({page})=>{
  await installFixedDate(page,'2026-09-07T10:00:00+08:00');
  await page.addInitScript(()=>{
    localStorage.clear();
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
    window.fetch=()=>Promise.reject(new TypeError('QA_ANDROID_OFFLINE'));
  });
  await openApp(page);
  await waitForSyncToSettle(page);
});

test('Android Chromium receives the complete PWA installability inputs',async({page,request})=>{
  const manifestResponse=await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest=await manifestResponse.json();
  expect(manifest.start_url).toBe('./index.html');
  expect(manifest.scope).toBe('./');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.purpose==='maskable')).toBe(true);
  expect(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable')).toBe(true);
  const workerResponse=await request.get('/sw.js');
  expect(workerResponse.ok()).toBe(true);
  const worker=await workerResponse.text();
  expect(worker).toContain("var SW_VERSION='v112'");
  expect(worker).toContain("'./shell/v112/index.html'");
  await page.waitForLoadState('load');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>navigator.serviceWorker.controller&&typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  expect(await page.evaluate(()=>(
    {supported:'serviceWorker' in navigator,controlled:!!navigator.serviceWorker.controller,source:CURRENT_SNAPSHOT.source,standaloneCapable:document.querySelector('meta[name="mobile-web-app-capable"]').content}
  ))).toEqual({supported:true,controlled:true,source:'builtin',standaloneCapable:'yes'});
});

test('first browse is unblocked, itinerary is destination-first, and navigation matches each stop',async({page})=>{
  await expect(page.locator('#memberOverlay')).toHaveCount(0);
  await expect(page.locator('#view-today')).toBeVisible();
  await expect(page.locator('#view-today .tomorrow-item')).toHaveCount(3);
  await expect(page.locator('#view-today .tomorrow-item').last()).toContainText('還有');

  await page.getByRole('button',{name:'行程',exact:true}).click();
  const airport=page.locator('.item').filter({hasText:'桃園機場第一航廈1樓'}).first();
  await expect(airport.locator('.act')).toContainText('桃園機場第一航廈1樓');
  await expect(airport.locator('.item-meta')).toContainText('機場check in');
  await expect(airport.locator('a.qa-btn')).toHaveAttribute('href',/destination=.*%E5%8F%B0%E7%81%A3.*travelmode=driving/);

  const donki=page.locator('.item').filter({hasText:'唐吉訶德 岡山駅前店'}).first();
  await expect(donki.locator('a.qa-btn')).toContainText('步行');
  await expect(donki.locator('a.qa-btn')).toHaveAttribute('href',/travelmode=walking$/);
});

test('empty-state actions and deferred Ledger identity fit the Android viewport',async({page})=>{
  await page.evaluate(()=>openShoppingList());
  await expect(page.getByRole('button',{name:'新增第一項採買'})).toBeVisible();
  await page.evaluate(()=>closeShoppingList());

  await page.getByRole('button',{name:'分帳',exact:true}).click();
  await expect(page.locator('#memberOverlay')).toBeVisible();
  await expect(page.locator('#view-today')).toBeVisible();

  await page.evaluate(()=>{
    memberRegistrationBridge=[{id:'qa-android-member',time:'2026-09-07T02:00:00.000Z',member:'Android QA',recordType:'identity_registration',detail:'[身分註冊]'}];
    localStorage.setItem('trip_member','Android QA');closeMemberSelector();switchView('split');
  });
  await expect(page.getByRole('button',{name:'記一筆消費'})).toBeVisible();
  await expect(page.getByText('查看全部 〉')).toHaveCount(0);
  await expect(page.locator('.ledger-proxy-summary-card')).toHaveCount(0);

  const layout=await page.evaluate(()=>(
    {viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,fab:document.querySelector('.ledger-fab').getBoundingClientRect().toJSON()}
  ));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.fab.right).toBeLessThanOrEqual(layout.viewport);
  expect(layout.fab.bottom).toBeLessThanOrEqual(844);
});
