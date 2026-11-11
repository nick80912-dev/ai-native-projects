/* v186 畫面更清爽
   ============================================================
   Bar 2026-11-11 選 UI/UX 建議 1–6 並看過前後對照回「好」：
   1. 今天卡不再重複「這一站 時間 站名」。
   2. 購物頁商場備註超過 4 行預設收起，「看全部」展開、「收合」收回，重繪後維持。
   3. 行程頁「隱藏已完成」是一個小開關（aria-pressed）。
   4. 今天卡只有「導航」是實心按鈕。
   5. 天氣沒資料時「暫無天氣資料」與「重試」在同一行。
   6. 行程卡與今天卡由 App 產生的圖示是線條 SVG，不再輸出 Emoji。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

async function boot(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
}

test('Today: no repeated stop line, 導航 is the only solid button, weather empty state is one line',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await boot(page);
  await page.evaluate(()=>{switchView('today');window.scrollTo(0,0);});
  const card=page.locator('#view-today .nx-ticket').first();
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('這一站');
  const styles=await page.evaluate(()=>{
    const solid=el=>{const bg=getComputedStyle(el).backgroundColor;return bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'&&!/^rgb\((2[3-5]\d), (2[3-5]\d), (2[3-5]\d)\)$/.test(bg);};
    const done=document.querySelector('#view-today .nx-decision-btn.done'),nav=document.querySelector('#view-today .nx-drive-btn'),jump=document.querySelector('#view-today .today-jump.dark');
    return {nav:!!nav&&solid(nav),done:!!done&&solid(done),jump:!!jump&&solid(jump)};
  });
  expect(styles).toEqual({nav:true,done:false,jump:false});
  const weather=page.locator('#view-today .today-weather-line');
  if(await weather.count()){
    const oneLine=await page.evaluate(()=>{const m=document.querySelector('.today-weather-line .today-weather-message').getBoundingClientRect(),r=document.querySelector('.today-weather-line .today-weather-retry');if(!r)return true;const b=r.getBoundingClientRect();return Math.abs((m.top+m.height/2)-(b.top+b.height/2))<6;});
    expect(oneLine).toBe(true);
    await expect(page.getByRole('button',{name:'重試天氣'})).toBeVisible();
  }
});

test('Itinerary: one hide-done switch with aria-pressed, line icons instead of emoji',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{setTripHideDone(true);switchView('trip');});
  const toggle=page.locator('#view-trip .trip-hide-toggle');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveText('隱藏已完成');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await toggle.click();
  await expect(page.locator('#view-trip .trip-hide-toggle')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#view-trip .trip-filter-track')).toHaveCount(0);
  const nav=page.locator('#view-trip .qa-btn.drv').first();
  await expect(nav.locator('svg.ln-ico')).toHaveCount(1);
  await expect(nav).toHaveText(/^(導航|步行|路線)$/);
  const emoji=await page.evaluate(()=>/[🚗🅿⛩🏬🏨⛽🚶🚃]|ℹ️/u.test([...document.querySelectorAll('#view-trip .qa-btn,#view-trip .tag,#view-trip .drive-chip')].map(el=>el.textContent).join('')));
  expect(emoji).toBe(false);
});

test('Shopping: a long mall note starts collapsed and keeps its open state across redraws',async({page})=>{
  await boot(page);
  const key=await page.evaluate(()=>{
    var p=shopMalls()[0].place;
    p.note=['• 一','• 二','• 三','• 四','• 五','• 六'].join('\n');
    switchView('shop');
    return 'shop:'+(p.placeId||'');
  });
  const box=page.locator('.note-clamp').first();
  await expect(box).toBeVisible();
  await expect(box).not.toHaveClass(/open/);
  const btn=box.locator('.note-clamp-btn');
  await expect(btn).toHaveText('看全部（6 行）');
  await expect(btn).toHaveAttribute('aria-expanded','false');
  await btn.click();
  await expect(box).toHaveClass(/open/);
  await expect(btn).toHaveText('收合');
  await page.evaluate(()=>renderShop());
  await expect(page.locator('.note-clamp').first()).toHaveClass(/open/);
  await page.locator('.note-clamp .note-clamp-btn').first().click();
  await expect(page.locator('.note-clamp').first()).not.toHaveClass(/open/);
  expect(key.startsWith('shop:')).toBe(true);
});
