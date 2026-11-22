const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo',viewport:{width:390,height:844},deviceScaleFactor:2});
for(const [tag,when,reorder,theme] of [['a1130','11:30',false,'ocean'],['b1145r','11:45',true,'ocean'],['c1130e','11:30',false,'ehon']]){
test('v208 '+tag,async({page})=>{
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>{localStorage.setItem('trip_member','Bar');localStorage.setItem('trip_today_mode','list');});
  await installFixedDate(page,'2026-10-20T'+when+':00+09:00');
  await openApp(page);await waitForSyncToSettle(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}#toast{display:none!important}.mock-full .tabbar{display:none!important}'});
  const dir=process.env.SHOTDIR;
  const shot=async(n,full)=>{await page.evaluate(f=>document.documentElement.classList.toggle('mock-full',f),!!full);await page.waitForTimeout(350);await page.screenshot({path:dir+'/'+tag+'-'+n+'.png',fullPage:!!full});};
  await page.evaluate(t=>{applyTheme(t,{persist:false});},theme);
  if(reorder)await page.evaluate(()=>{const day=DB.trip.days[2];const ids=orderedDayStops(day,2).stops.map(it=>it.id);
    const name=id=>{const it=day.items.find(i=>i.id===id);return tripItemPresentation(it,resolveRef(it)).title;};
    const a=ids.findIndex(id=>name(id).indexOf('貓之細道')>=0),b=ids.findIndex(id=>name(id).indexOf('艮神社')>=0);
    const [m]=ids.splice(b,1);ids.splice(a,0,m);saveDayOrder(day,2,ids);});
  await page.evaluate(()=>{switchView('today');renderToday();window.scrollTo(0,0);});
  await shot('today',true);
  await page.locator('.tabbar-btn[data-view="trip"]').click();
  await shot('trip-open');
  await page.evaluate(()=>window.scrollTo(0,0));await shot('trip-top');
  // tap a card to expand
  await page.locator('#view-trip .tl-item .tl-toggle').nth(2).click();await shot('trip-expanded');
  console.log(tag,'errors',JSON.stringify(errors));
});}
