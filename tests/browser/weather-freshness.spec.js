const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
// Keep the next-stop fixture stable when the CI runner defaults to UTC.
test.use({timezoneId:'Asia/Tokyo'});
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{window.qaWeatherNativeFetch=window.fetch.bind(window);});
  await installFixedDate(page,'2026-10-18T13:30:00+09:00');
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
});
function response(temp=21,rain=0){return {current:{temperature_2m:temp,weather_code:1},hourly:{
  time:['2026-10-18T20:00'],precipitation_probability:[rain]}};}
async function useWeatherNetwork(page){
  await page.evaluate(()=>{
    window.fetch=input=>String(input).startsWith('https://api.open-meteo.com/')?qaWeatherNativeFetch(input):Promise.reject(Error('QA_OFFLINE'));
  });
}
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
test('expired cache never displays old temperature or rain',async({page},testInfo)=>{
  await seed(page,{age:10800000,temp:27,rain:80});
  await expect(page.locator('.today-hero-weather-summary')).toContainText('天氣資料已過期，暫無最新資料');
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('27°');
  await expect(page.locator('.today-hero-weather-summary')).not.toHaveAttribute('aria-label',/80%/);
  await expect(page.locator('#view-today .nx-ticket')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('weather-v145-expired.png')});
});
test('re-entering after three hours refreshes once without showing old numbers',async({page})=>{
  await seed(page,{temp:27,rain:80});let calls=0,release;
  await page.route('https://api.open-meteo.com/**',async route=>{
    calls++;await new Promise(resolve=>{release=resolve;});await route.fulfill({json:response(18,0)});
  });
  await useWeatherNetwork(page);
  await page.evaluate(()=>{
    const original=Date.now();Date.now=()=>original+10800000;switchView('trip');switchView('today');renderToday();
  });
  await expect.poll(()=>calls).toBe(1);
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('27°');
  release();await expect(page.locator('.today-hero-weather-summary')).toContainText('18°');
  await expect(page.locator('.today-hero-weather-summary')).toContainText('更新於 16:30');
});
for(const resume of ['visibilitychange','pageshow'])test(resume+' revalidates the same Today screen and retains next-stop focus',async({page})=>{
  const city=await seed(page,{temp:27,rain:80});let calls=0,release;
  await page.route('https://api.open-meteo.com/**',async route=>{
    calls++;await new Promise(resolve=>{release=resolve;});await route.fulfill({json:response(18,0)});
  });
  await useWeatherNetwork(page);
  const next=page.locator('#view-today .nx-decision-btn.done');await next.focus();
  await page.evaluate(resume=>{
    window.qaBeforeWeatherWrites=[localStorage.getItem('trip_checks'),localStorage.getItem('trip_day_progress')];
    const original=Date.now();Date.now=()=>original+10800000;
    if(resume==='visibilitychange'){
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
      document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));
    }else{window.dispatchEvent(new PageTransitionEvent('pageshow'));window.dispatchEvent(new PageTransitionEvent('pageshow'));}
  },resume);
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('27°');
  await expect.poll(()=>calls).toBe(1);await expect(next).toBeFocused();
  release();await expect(page.locator('.today-hero-weather-summary')).toContainText('18°');
  await expect(next).toBeFocused();
  expect(await page.evaluate(()=>[localStorage.getItem('trip_checks'),localStorage.getItem('trip_day_progress')])).toEqual(await page.evaluate(()=>qaBeforeWeatherWrites));
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(weatherCacheKey(qaWeatherCity))).t)).toBe(city.t+10800000);
});
test('visible weather expires at its deadline without a tab switch or periodic fetch',async({page})=>{
  await page.clock.install({time:new Date('2026-10-18T13:30:00+09:00')});await seed(page,{age:10799900,temp:27,rain:80});let calls=0,release;
  await page.route('https://api.open-meteo.com/**',async route=>{
    calls++;await new Promise(resolve=>{release=resolve;});await route.fulfill({json:response(18,0)});
  });
  await useWeatherNetwork(page);
  await page.evaluate(()=>{const original=Date.now();Date.now=()=>original+100;});
  await page.clock.runFor(101);
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('27°');
  await expect(page.getByRole('button',{name:'重試天氣'})).toBeVisible();expect(calls).toBe(0);
  await page.getByRole('button',{name:'重試天氣'}).click();await expect.poll(()=>calls).toBe(1);
  release();await expect(page.locator('.today-hero-weather-summary')).toContainText('18°');
  await page.clock.runFor(60000);expect(calls).toBe(1);
});
test('resume stays quiet after failure and cannot alter an off-page or cleared trip',async({page})=>{
  await seed(page,{age:10800000});let calls=0;
  const retry=page.getByRole('button',{name:'重試天氣'});await retry.focus();
  await page.route('https://api.open-meteo.com/**',route=>{calls++;return route.fulfill({json:response()});});await useWeatherNetwork(page);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
    document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow'));
  });
  await expect(retry).toHaveAttribute('aria-disabled','false');expect(calls).toBe(0);
  await expect(retry).toBeFocused();await expect(retry).not.toHaveAttribute('tabindex','-1');
  await page.evaluate(()=>{switchView('trip');window.qaWeatherTodayHtml=document.getElementById('view-today').innerHTML;});
  await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow'));});
  expect(await page.evaluate(()=>document.getElementById('view-today').innerHTML)).toBe(await page.evaluate(()=>qaWeatherTodayHtml));expect(calls).toBe(0);
  await page.evaluate(()=>{TripLifecycle.writeState(localStorage,{mode:'complete',archiveId:null});renderInactiveHome();window.dispatchEvent(new PageTransitionEvent('pageshow'));});
  await expect(page.locator('.trip-inactive-card')).toBeVisible();expect(calls).toBe(0);
});
test('past zero with missing future rainfall remains unknown in the screen reader summary',async({page})=>{
  await seed(page,{rain:0});
  await page.evaluate(()=>{
    const key=weatherCacheKey(qaWeatherCity),envelope=JSON.parse(localStorage.getItem(key));
    envelope.data.hours={time:['2026-10-18T12:00','2026-10-18T14:00','2026-10-18T15:00'],precipitation_probability:[0,null,'']};
    localStorage.setItem(key,JSON.stringify(envelope));homeWeatherState={};renderToday();
  });
  const summary=page.locator('.today-hero-weather-summary');await expect(summary).toContainText('21°');
  await expect(summary).toHaveAttribute('aria-label',/降雨機率未知/);
  await expect(summary).not.toHaveAttribute('aria-label',/0%/);await expect(summary).not.toContainText('適合出發');
});
test('failed requests remain quiet until keyboard manual retry',async({page})=>{
  await seed(page,{age:10800000});let calls=0;
  await page.route('https://api.open-meteo.com/**',route=>{calls++;return route.fulfill({json:response(24,null)});});
  await useWeatherNetwork(page);
  await page.evaluate(()=>{renderToday();renderToday();});expect(calls).toBe(0);
  const retry=page.getByRole('button',{name:'重試天氣'});
  await retry.focus();await retry.press('Enter');
  await expect.poll(()=>calls).toBe(1);
  await expect(page.locator('.today-hero-weather-summary')).toContainText('24°');
  await expect(page.locator('.today-hero-weather-summary')).not.toHaveAttribute('aria-label',/0%/);
  await expect(page.locator('.today-hero-weather-summary')).toBeFocused();
});
async function startRequest(page,routeHandler){
  await seed(page,{age:10800000});
  await page.route('https://api.open-meteo.com/**',routeHandler);await useWeatherNetwork(page);
  await page.evaluate(()=>{requestHomeWeather(qaWeatherDay,qaWeatherItem,true);renderToday();});
}
test('different cities stay isolated when the older request finishes last',async({page})=>{
  const routes=[];
  await startRequest(page,route=>{routes.push(route);});await expect.poll(()=>routes.length).toBe(1);
  await page.evaluate(()=>{qaWeatherItem.place='廣島和平紀念公園';qaWeatherItem.act='';renderToday();});
  await expect.poll(()=>routes.length).toBe(2);
  await routes[1].fulfill({json:response(25,0)});
  await expect(page.locator('.today-hero-weather-summary')).toContainText('廣島');
  await expect(page.locator('.today-hero-weather-summary')).toContainText('25°');
  await routes[0].fulfill({json:response(10,80)});
  await expect.poll(()=>page.evaluate(()=>Object.values(homeWeatherState).filter(s=>s.status==='ready').length)).toBe(2);
  await expect(page.locator('.today-hero-weather-summary')).toContainText('25°');
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('10°');
});
test('leaving Today prevents late redraw but reuses the active-trip result',async({page})=>{
  let route,calls=0;await startRequest(page,r=>{route=r;calls++;});await expect.poll(()=>calls).toBe(1);
  await page.evaluate(()=>{
    switchView('trip');window.qaWeatherRenders=0;const real=renderToday;renderToday=function(){qaWeatherRenders++;return real();};
  });
  await route.fulfill({json:response(23,0)});
  await expect.poll(()=>page.evaluate(()=>Object.values(homeWeatherState).some(s=>s.status==='ready'))).toBe(true);
  expect(await page.evaluate(()=>qaWeatherRenders)).toBe(0);
  await page.evaluate(()=>switchView('today'));await expect(page.locator('.today-hero-weather-summary')).toContainText('23°');
  expect(calls).toBe(1);
});
test('clear-trip UI invalidates requests before they can recreate weather cache',async({page})=>{
  let route;await startRequest(page,r=>{route=r;});await expect.poll(()=>!!route).toBe(true);
  await page.evaluate(()=>{
    TripLifecycle.writeState(localStorage,{mode:'complete',archiveId:null});
    for(const key of Object.keys(localStorage))if(key.startsWith('trip_weather_'))localStorage.removeItem(key);
    renderInactiveHome();
  });
  await route.fulfill({json:response(24,0)});
  await expect(page.locator('.trip-inactive-card')).toBeVisible();
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('trip_weather_')))).toEqual([]);
  expect(await page.evaluate(()=>Object.keys(homeWeatherState))).toEqual([]);
});
test('valid network weather survives quota denial without a false saved claim',async({page})=>{
  await seed(page,{age:10800000});
  await page.evaluate(()=>{
    const real=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){
      if(key.startsWith('trip_weather_'))throw new DOMException('PRIVATE_DETAIL','QuotaExceededError');return real.call(this,key,value);
    };
  });
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:response(24,0)}));await useWeatherNetwork(page);
  await page.evaluate(()=>{requestHomeWeather(qaWeatherDay,qaWeatherItem,true);renderToday();});
  await expect(page.locator('.today-hero-weather-summary')).toContainText('24°');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(weatherCacheKey(qaWeatherCity))).data.temp)).toBe(21);
  const logs=await page.evaluate(()=>AppLog.snapshot());
  expect(JSON.stringify(logs)).toContain('天氣快取');expect(JSON.stringify(logs)).not.toContain('PRIVATE_DETAIL');
});
test('6500ms timeout shows retry, and its late response cannot be saved',async({page})=>{
  let route;await startRequest(page,r=>{route=r;});await expect.poll(()=>!!route).toBe(true);
  await expect(page.getByRole('button',{name:'重試天氣'})).toHaveAttribute('aria-disabled','false',{timeout:8500});
  await route.fulfill({json:response(99,0)});await page.waitForTimeout(100);
  await expect(page.locator('.today-hero-weather-summary')).not.toContainText('99°');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(weatherCacheKey(qaWeatherCity))).data.temp)).toBe(21);
});
for(const width of [320,375,390])test('weather remains compact and next-stop controls usable at '+width+'px',async({page},testInfo)=>{
  await page.setViewportSize({width,height:844});await seed(page,{temp:21,rain:40});
  const summary=page.locator('.today-hero-weather-summary');await expect(summary).toContainText('更新於 13:30');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.today-weather-meta').evaluate(el=>getComputedStyle(el).fontSize)).toBe('11px');
  await expect(page.locator('#view-today .nx-ticket')).toBeVisible();
  await expect(page.locator('#view-today .nx-decision-btn.done')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('weather-v145-'+width+'.png')});
});
