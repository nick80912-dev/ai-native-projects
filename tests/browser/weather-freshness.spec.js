const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.beforeEach(async({page})=>{
  await installFixedDate(page,'2026-10-18T13:30:00+09:00');
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
});
async function seed(page,options={}){
  return page.evaluate(options=>{
    const dayIndex=findToday(),day=DB.trip.days[dayIndex],items=homeNextStopItems(day.items);
    const progress=getDayProgress(day,dayIndex),checks=getChecks(),minutes=currentMinutes();
    const pick=pickNextStop(items,progress,checks,minutes,{day,dayIndex});
    const parent=clusterParentForPick(day.items,pick.item),cluster=getChildStopCluster(day.items,parent);
    const child=cluster?pickClusterChild(cluster,progress,checks,minutes,{day,dayIndex}):null;
    const item=child&&child.item?child.item:pick.item;
    const city=inferWeatherCityForDay(day,item);
    const envelope={t:Date.now()-(options.age||0),data:{city:city.label,temp:options.temp===undefined?21:options.temp,
      rain:options.rain===undefined?null:options.rain,code:1,icon:'☀️'}};
    localStorage.setItem(weatherCacheKey(city),JSON.stringify(envelope));homeWeatherState={};
    // Use the actual next-stop resolver, not a guessed default city.
    window.qaWeatherCity=city;window.qaWeatherItem=item;window.qaWeatherDay=dayIndex;
    renderToday();return {label:city.label,t:envelope.t};
  },options);
}
test('shows resolved city, Japan acquired time and legitimate zero temperature',async({page})=>{
  const city=await seed(page,{temp:0,rain:0});
  const summary=page.locator('.today-hero-weather-summary');
  await expect(summary).toContainText(city.label);await expect(summary).toContainText('0°');
  await expect(summary).toContainText('更新於 13:30');
  await expect(summary).toHaveAttribute('aria-label',/日本時間.*13:30/);
  await expect(summary).toHaveAttribute('aria-label',/0%/);
});
test('unknown rain does not claim zero percent or safe departure',async({page})=>{
  await seed(page,{rain:null});const summary=page.locator('.today-hero-weather-summary');
  await expect(summary).toContainText('21°');await expect(summary).not.toContainText('適合出發');
  await expect(summary).not.toHaveAttribute('aria-label',/0%/);
});
test('expired cache never displays old temperature or rain',async({page})=>{
  await seed(page,{age:10800000,temp:27,rain:80});
  await expect(page.locator('.today-hero-weather-summary')).toContainText('天氣資料已過期，暫無最新資料');
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('27°');
  await expect(page.locator('.today-hero-weather-summary')).not.toHaveAttribute('aria-label',/80%/);
  await expect(page.locator('#view-today .nx-ticket')).toBeVisible();
});
