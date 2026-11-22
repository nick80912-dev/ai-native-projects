/* v192 今天頁清單模式(Bar 2026-11-15)
   - 預設清單:不看時間、不自動略過;「完成」該站變淡,再按取消;點站名或 › 到行程頁那一站。
   - 按住 ≡ 拖拉臨時調整今天的順序,只存在這支手機;「恢復原順序」回到試算表順序。
   - 往下捲時上方小卡凍結(與上排留空隙);拖到小卡下方或分頁列上方停住時,清單會自己捲(Bar 問「往上調整會不會被小卡擋住」)。
   - 卡片模式是設定開關,保留原設計;行程頁沒有打卡,那一天過完後照實際順序與完成紀錄顯示。
   v208(Bar 2026-11-22):清單模式拿掉「完成」鈕(完成／跳過只留在卡片模式),改看時鐘:「現在」線、「下一站」標籤、
   前面的站變淡、上方卡片顯示下一站;行程頁的今天也照拖拉後的順序。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});

async function boot(page,date){
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>localStorage.setItem('trip_today_mode','"list"'));
  await installFixedDate(page,date||'2026-10-20T13:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('today');renderToday();});
}
const names=page=>page.evaluate(()=>[...document.querySelectorAll('#view-today .today-list-row .today-list-main b')].map(b=>b.childNodes[0].textContent));
const row=(page,i)=>page.locator('#view-today .today-list-row').nth(i);
async function handleCenter(page,i){
  await row(page,i).scrollIntoViewIfNeeded();
  const box=await row(page,i).locator('.today-list-handle').boundingBox();
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}

test('the list shows every stop of the day, never auto-skips, and follows the clock without 完成 buttons',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  expect(await page.locator('#view-today .nx-ticket').count()).toBe(0);
  expect(await names(page)).toHaveLength(14);
  /* 13:00:卡片模式會把前面十站自動略過;清單模式一站都不動,也不寫任何完成紀錄 */
  expect(await page.evaluate(()=>localStorage.getItem('trip_next_stop_progress'))).toBeNull();
  await expect(page.locator('#view-today .today-list-done')).toHaveCount(0);
  /* 13:00 → 下一站是 13:30 鞆之浦;12:00 拉麵正在進行(不變淡),更前面的變淡 */
  await expect(page.locator('.today-hero-compact .loc')).toHaveText('下一站 13:30 鞆之浦');
  await expect(page.locator('#view-today .clock-now-line')).toHaveCount(1);
  await expect(page.locator('#view-today .clock-now-line')).toHaveText('現在 13:00');
  await expect(row(page,11)).toHaveClass(/clock-next/);
  await expect(row(page,11).locator('.clock-next-tag')).toHaveText('下一站');
  await expect(row(page,11).locator('.today-next-go')).toContainText('開車40分鐘');
  await expect(row(page,11).locator('.today-next-map')).toHaveAttribute('href',/google\.com\/maps\/search/);
  await expect(row(page,10)).not.toHaveClass(/clock-past/);
  await expect(row(page,9)).toHaveClass(/clock-past/);
  await expect(page.locator('#view-today .today-list-row.clock-past')).toHaveCount(10);
  /* 現在線就在下一站正上方 */
  expect(await page.evaluate(()=>document.querySelector('#view-today .clock-now-line').nextElementSibling.getAttribute('data-stop-id'))).toBe(await row(page,11).getAttribute('data-stop-id'));
  await row(page,2).locator('.today-list-go').click();
  await expect(page.locator('#view-trip')).toBeVisible();
  expect(await page.locator('#view-trip .chk').count()).toBe(0);
  expect(errors).toEqual([]);
});

for(const theme of ['ocean','ehon']){
  test('dragging the last stop up under the frozen card scrolls the list and lands at the top · '+theme,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await boot(page);
    await page.evaluate(t=>{applyTheme(t,{persist:false});renderToday();},theme);
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
    await expect(page.locator('.today-hero-compact')).toHaveClass(/is-stuck/);
    /* 凍結時卡片和上排之間留空隙 */
    const gap=await page.evaluate(()=>document.querySelector('.today-hero-compact').getBoundingClientRect().top-document.querySelector('.hdr').getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(6);
    const before=await names(page);
    const start=await handleCenter(page,13);
    const heroBottom=await page.evaluate(()=>document.querySelector('.today-hero-compact').getBoundingClientRect().bottom);
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    await page.mouse.move(start.x,heroBottom+10,{steps:12});
    await expect.poll(()=>page.evaluate(()=>window.pageYOffset),{timeout:8000}).toBe(0);
    await page.waitForTimeout(150);
    await page.mouse.up();
    const after=await names(page);
    expect(after[0]).toBe(before[13]);
    expect(after.slice(1)).toEqual(before.slice(0,13));
    await expect(page.locator('.today-list-note')).toContainText('只存在這支手機');
  });
}

test('dragging the first stop down to the tab bar scrolls down and lands at the bottom',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await boot(page);
  const before=await names(page);
  const start=await handleCenter(page,0);
  const tabTop=await page.evaluate(()=>document.querySelector('.tabbar').getBoundingClientRect().top);
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x,tabTop-12,{steps:12});
  await expect.poll(()=>page.evaluate(()=>Math.ceil(window.pageYOffset+window.innerHeight)>=document.documentElement.scrollHeight-2),{timeout:8000}).toBe(true);
  /* 捲到底後手指移到最後一站下半部才放 */
  const last=await row(page,13).boundingBox();
  await page.mouse.move(start.x,last.y+last.height*0.75,{steps:4});
  await page.mouse.up();
  const after=await names(page);
  expect(after[13]).toBe(before[0]);
  expect(after.slice(0,13)).toEqual(before.slice(1));
});

test('a short drag reorders, a cancelled drag does not, and 恢復原順序 restores the sheet order',async({page})=>{
  await boot(page);
  const before=await names(page);
  const start=await handleCenter(page,3);
  const target=await row(page,1).boundingBox();
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x,target.y+5,{steps:6});await page.mouse.up();
  let after=await names(page);
  expect(after.slice(0,4)).toEqual([before[0],before[3],before[1],before[2]]);
  /* 系統中斷拖拉(例如來電):不改順序 */
  const s2=await handleCenter(page,5);
  await page.mouse.move(s2.x,s2.y);await page.mouse.down();
  await page.mouse.move(s2.x,s2.y-120,{steps:4});
  await page.evaluate(()=>{const d=todayListDrag;d.handle.dispatchEvent(new PointerEvent('pointercancel',{pointerId:d.pointerId,bubbles:true}));});
  await page.mouse.up();
  expect(await names(page)).toEqual(after);
  await expect(page.locator('#view-today .today-list-row.dragging')).toHaveCount(0);
  await page.locator('.today-list-reset').click();
  expect(await names(page)).toEqual(before);
  await expect(page.locator('.today-list-note')).toHaveCount(0);
});

test.describe('real touch on a phone',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  test('a finger on ≡ drags without scrolling the page; a finger elsewhere still scrolls',async({page})=>{
    await boot(page);
    const cdp=await page.context().newCDPSession(page);
    const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    const before=await names(page);
    const start=await handleCenter(page,4);
    const target=await row(page,1).boundingBox();
    const y0=await page.evaluate(()=>window.pageYOffset);
    await touch('touchStart',start.x,start.y);
    for(let i=1;i<=8;i++)await touch('touchMove',start.x,start.y+(target.y+5-start.y)*i/8);
    await touch('touchEnd');
    await page.waitForTimeout(200);
    const after=await names(page);
    expect(after.slice(0,5)).toEqual([before[0],before[4],before[1],before[2],before[3]]);
    expect(Math.abs(await page.evaluate(()=>window.pageYOffset)-y0)).toBeLessThan(40);
    /* 在站名上滑動是一般捲動,不會拖到行程 */
    const body=await row(page,8).locator('.today-list-main').boundingBox();
    const y1=await page.evaluate(()=>window.pageYOffset);
    await touch('touchStart',body.x+40,body.y+10);
    for(let i=1;i<=6;i++)await touch('touchMove',body.x+40,body.y+10-40*i);
    await touch('touchEnd');
    await page.waitForTimeout(400);
    expect(await names(page)).toEqual(after);
    expect(await page.evaluate(()=>window.pageYOffset)).toBeGreaterThan(y1+60);
  });
});

test('the card view is a settings switch and keeps the time-based design',async({page})=>{
  await boot(page);
  await page.evaluate(()=>openSettings());
  const sw=page.locator('#settingsTodayCardMode');
  await expect(sw).not.toBeChecked();
  await sw.check();
  await expect(page.locator('#settingsTodayModeSummary')).toHaveText('卡片');
  await page.evaluate(()=>{closeSettings();switchView('today');});
  await expect(page.locator('#view-today .nx-ticket')).toHaveCount(1);
  await expect(page.locator('#view-today .today-list')).toHaveCount(0);
});

test('the trip page follows the reordered day today (v208) and after the day is over',async({page})=>{
  await boot(page);
  const before=await names(page);
  const start=await handleCenter(page,3);
  const target=await row(page,1).boundingBox();
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x,target.y+5,{steps:6});await page.mouse.up();
  const reordered=await names(page);
  expect(reordered).not.toEqual(before);
  const tripTitles=()=>page.evaluate(()=>[...document.querySelectorAll('#view-trip .item .act')].map(e=>e.childNodes[0].textContent));
  await page.evaluate(()=>gotoDay(2));
  /* 今天:行程頁也照拖拉後的順序,並提示只在這支手機、可恢復 */
  expect(await tripTitles()).toEqual(reordered);
  await expect(page.locator('.trip-order-note')).toContainText('只在這支手機');
  await expect(page.locator('#view-trip .clock-now-line')).toHaveCount(1);
  await page.locator('.trip-order-note button').click();
  expect(await tripTitles()).toEqual(before);
  await expect(page.locator('.trip-order-note')).toHaveCount(0);
  /* 再調一次,隔天(10/20 已過完)照實際順序顯示 */
  await page.evaluate(()=>{const day=DB.trip.days[2];const ids=orderedDayStops(day,2).stops.map(it=>it.id);const [m]=ids.splice(3,1);ids.splice(1,0,m);saveDayOrder(day,2,ids);});
  await page.evaluate(()=>{appNow=function(){return new Date('2026-10-21T09:00:00+09:00');};gotoDay(2);});
  await expect(page.locator('.trip-past-note')).toContainText('依當天實際順序');
  expect(await tripTitles()).toEqual(reordered);
  await expect(page.locator('#view-trip .clock-now-line')).toHaveCount(0);
  await expect(page.locator('.trip-order-note')).toHaveCount(0);
});

test('a reordered day picks the next stop by position: the first stop whose time has not come yet',async({page})=>{
  await boot(page,'2026-10-20T11:45:00+09:00');
  /* 把 11:50 艮神社拖到 11:40 貓之細道前面 */
  await page.evaluate(()=>{const day=DB.trip.days[2];const ids=orderedDayStops(day,2).stops.map(it=>it.id);const [m]=ids.splice(9,1);ids.splice(8,0,m);saveDayOrder(day,2,ids);renderToday();});
  const list=await names(page);
  expect(list.slice(8,10)).toEqual(['艮神社','貓之細道']);
  await expect(row(page,8)).toHaveClass(/clock-next/);
  await expect(row(page,9)).not.toHaveClass(/clock-past/);
  await expect(page.locator('.today-hero-compact .loc')).toHaveText('下一站 11:50 艮神社');
  /* 拖拉過順序時,試算表的交通時間可能是別段路,下一站只留地圖 */
  await expect(row(page,8).locator('.today-next-go')).not.toContainText('步行');
  await expect(row(page,8).locator('.today-next-map')).toHaveCount(1);
});

test('opening the trip tab from Today jumps to the 現在 line; R2/R3 layout',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await boot(page,'2026-10-20T11:30:00+09:00');
  await page.locator('.tabbar-btn[data-view="trip"]').click();
  const line=page.locator('#tripNowLine');
  await expect(line.locator(':scope > span')).toHaveText('現在 11:30');
  await expect.poll(()=>page.evaluate(()=>window.pageYOffset)).toBeGreaterThan(200);
  await expect(line).toBeInViewport();
  await expect(page.locator('#view-trip .tl-item.clock-next .clock-next-tag')).toHaveText('下一站');
  /* R2:日期只在上排日期鈕;R3:地圖是圖示鈕、沒有 ▾,點卡片頭就展開 */
  await expect(page.locator('#view-trip .day-head .num')).toHaveCount(0);
  await expect(page.locator('#view-trip .day-head .prog')).toHaveText('共 14 站');
  const map=page.locator('#view-trip .tl-item.clock-next .tl-map');
  await expect(map).toHaveText('');
  await expect(map).toHaveAttribute('aria-label',/在地圖上看/);
  const card=page.locator('#view-trip .tl-item.clock-next');
  const head=await card.locator('.tl-main').boundingBox();
  await page.mouse.click(head.x+20,head.y+10);
  await expect(card).toHaveClass(/tl-open/);
  await expect(card.locator('.tl-toggle')).toHaveAttribute('aria-expanded','true');
});
