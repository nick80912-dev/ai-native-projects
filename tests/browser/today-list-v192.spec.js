/* v192 今天頁清單模式(Bar 2026-11-15)
   - 預設清單:不看時間、不自動略過;「完成」該站變淡,再按取消;點站名或 › 到行程頁那一站。
   - 按住 ≡ 拖拉臨時調整今天的順序,只存在這支手機;「恢復原順序」回到試算表順序。
   - 往下捲時上方小卡凍結(與上排留空隙);拖到小卡下方或分頁列上方停住時,清單會自己捲(Bar 問「往上調整會不會被小卡擋住」)。
   - 卡片模式是設定開關,保留原設計;行程頁沒有打卡,那一天過完後照實際順序與完成紀錄顯示。 */
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
const names=page=>page.evaluate(()=>[...document.querySelectorAll('#view-today .today-list-row .today-list-main b')].map(b=>b.textContent));
const row=(page,i)=>page.locator('#view-today .today-list-row').nth(i);
async function handleCenter(page,i){
  await row(page,i).scrollIntoViewIfNeeded();
  const box=await row(page,i).locator('.today-list-handle').boundingBox();
  return {x:box.x+box.width/2,y:box.y+box.height/2};
}

test('the list shows every stop of the day, never auto-skips, and 完成 fades a stop',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  expect(await page.locator('#view-today .nx-ticket').count()).toBe(0);
  expect(await names(page)).toHaveLength(14);
  /* 13:00:卡片模式會把前面十站自動略過;清單模式一站都不動 */
  expect(await page.evaluate(()=>localStorage.getItem('trip_next_stop_progress'))).toBeNull();
  await expect(page.locator('.today-hero-compact .loc')).toHaveText('完成 0/14');
  await row(page,1).locator('.today-list-done').click();
  await expect(row(page,1)).toHaveClass(/done/);
  await expect(row(page,1).locator('.today-list-done')).toHaveText('已完成 ✓');
  await expect(page.locator('.today-hero-compact .loc')).toHaveText('完成 1/14');
  expect(await page.evaluate(()=>!!getChecks()['10/20_1'])).toBe(true);
  await row(page,1).locator('.today-list-done').click();
  await expect(row(page,1)).not.toHaveClass(/done/);
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
  /* 完成狀態跟著站走,不跟著位置走 */
  await row(page,1).locator('.today-list-done').click();
  await expect(row(page,1)).toHaveClass(/done/);
  expect(await page.evaluate(id=>!!getChecks()[id],'10/20_3')).toBe(true);
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

test('a finished day shows the actual order and done stops on the trip page; today keeps the sheet order there',async({page})=>{
  await boot(page);
  const before=await names(page);
  const start=await handleCenter(page,3);
  const target=await row(page,1).boundingBox();
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x,target.y+5,{steps:6});await page.mouse.up();
  await row(page,0).locator('.today-list-done').click();
  const tripTitles=()=>page.evaluate(()=>[...document.querySelectorAll('#view-trip .item .act')].map(e=>e.childNodes[0].textContent));
  await page.evaluate(()=>gotoDay(2));
  const todayTrip=await tripTitles();
  await expect(page.locator('.trip-past-note')).toHaveCount(0);
  /* 隔天:10/20 已過完 */
  await page.evaluate(()=>{appNow=function(){return new Date('2026-10-21T09:00:00+09:00');};gotoDay(2);});
  await expect(page.locator('.trip-past-note')).toContainText('依當天實際順序');
  const pastTrip=await tripTitles();
  expect(pastTrip).not.toEqual(todayTrip);
  await expect(page.locator('#view-trip .item.past-done')).toHaveCount(1);
  expect(before.length).toBe(14);
});
