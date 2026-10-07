const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,installOnlineSheetMock,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

async function boot(page,date,online=false){
  await installFixedDate(page,date);
  await (online?installOnlineSheetMock(page):installOfflineAppNetwork(page));
  await openApp(page);
  await waitForSyncToSettle(page);
}

// Breaks: treating every non-itinerary date as pre-trip, or starting cleanup on render.
test('after the end date Home asks about packing without authorizing or clearing',async({page})=>{
  await boot(page,'2026-10-24T12:00:00+09:00');
  const home=page.locator('#view-today');
  await expect(home).toContainText('本趟旅程已結束');
  await expect(home).toContainText('要打包封存');
  await expect(home).not.toContainText('還沒到出發日');
  await expect(home).not.toContainText('出發當天');
  await expect(home.getByRole('button',{name:'清除並打包旅程',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>({mode:TripLifecycle.readState(localStorage).mode,member:localStorage.getItem('trip_member'),overlay:!!document.getElementById('settingsOverlay'),drive:!!tripDriveClient})))
    .toEqual({mode:'active',member:'Bar',overlay:false,drive:false});
});

for(const fixture of [
  {date:'2026-10-17T23:59:59+09:00',label:'還沒到出發日'},
  {date:'2026-10-23T23:59:59+09:00',label:'TODAY · DAY 6'},
  {date:'2026-10-24T00:00:00+09:00',label:'本趟旅程已結束'},
  {date:'2027-10-18T12:00:00+09:00',label:'本趟旅程已結束'}
])test('Home respects the full trip year and end-day boundary: '+fixture.date,async({page})=>{
  await boot(page,fixture.date);
  await expect(page.locator('#view-today')).toContainText(fixture.label);
  if(!fixture.label.includes('已結束'))await expect(page.locator('#view-today').getByRole('button',{name:'清除並打包旅程',exact:true})).toHaveCount(0);
});

// Breaks: checking the end date only on startup, not while Home stays open.
test('Home left open across midnight updates without changing personal records',async({page})=>{
  await page.clock.install({time:new Date('2026-10-23T23:59:00+09:00')});
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.clock.pauseAt(new Date('2026-10-23T23:59:58+09:00'));
  await expect(page.locator('#view-today')).toContainText('TODAY · DAY 6');
  const before=await page.evaluate(()=>({progress:localStorage.getItem('trip_next_stop_progress'),checks:localStorage.getItem('trip_checks'),member:localStorage.getItem('trip_member')}));
  await page.clock.fastForward(2100);
  await expect(page.locator('#view-today')).toContainText('本趟旅程已結束');
  expect(await page.evaluate(()=>({progress:localStorage.getItem('trip_next_stop_progress'),checks:localStorage.getItem('trip_checks'),member:localStorage.getItem('trip_member')}))).toEqual(before);
  expect(await page.evaluate(()=>({overlay:!!document.getElementById('settingsOverlay'),drive:!!tripDriveClient,mode:TripLifecycle.readState(localStorage).mode})))
    .toEqual({overlay:false,drive:false,mode:'active'});
});

for(const event of ['visibilitychange','pageshow'])test('Home checks the trip end when resuming: '+event,async({page})=>{
  await boot(page,'2026-10-23T23:59:58+09:00');
  await expect(page.locator('#view-today')).toContainText('TODAY · DAY 6');
  await page.evaluate(event=>{
    localStorage.setItem('trip_time_simulation',JSON.stringify({mode:'custom',value:'2026-10-24T00:00:01+09:00'}));
    (event==='pageshow'?window:document).dispatchEvent(new Event(event));
  },event);
  await expect(page.locator('#view-today')).toContainText('本趟旅程已結束');
  await page.evaluate(event=>(event==='pageshow'?window:document).dispatchEvent(new Event(event)),event);
  await expect(page.locator('#view-today').getByRole('button',{name:'清除並打包旅程',exact:true})).toHaveCount(1);
});

test('end-date resume checks leave ongoing cards and other views untouched',async({page})=>{
  await boot(page,'2026-10-23T12:00:00+09:00');
  const result=await page.evaluate(()=>{
    var original=document.querySelector('#view-today .nx-ticket');
    var progress=localStorage.getItem('trip_next_stop_progress'),checks=localStorage.getItem('trip_checks');
    document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));
    var unchanged=original===document.querySelector('#view-today .nx-ticket')&&progress===localStorage.getItem('trip_next_stop_progress')&&checks===localStorage.getItem('trip_checks');
    switchView('trip');var markup=document.getElementById('view-trip').innerHTML;
    localStorage.setItem('trip_time_simulation',JSON.stringify({mode:'custom',value:'2026-10-24T00:00:01+09:00'}));
    document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));
    return {unchanged,view:curView,tripUnchanged:markup===document.getElementById('view-trip').innerHTML,timer:homeTripEndTimer};
  });
  expect(result).toEqual({unchanged:true,view:'trip',tripUnchanged:true,timer:null});
  await page.evaluate(()=>switchView('today'));
  await expect(page.locator('#view-today')).toContainText('本趟旅程已結束');
});

test('hidden Home cancels its deadline and catches up only on return',async({page})=>{
  await boot(page,'2026-10-23T23:59:58+09:00');
  expect(await page.evaluate(()=>homeTripEndTimer!==null)).toBe(true);
  await page.evaluate(()=>{
    window.qaHomeHidden=true;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.qaHomeHidden});
    document.dispatchEvent(new Event('visibilitychange'));
    localStorage.setItem('trip_time_simulation',JSON.stringify({mode:'custom',value:'2026-10-24T00:00:01+09:00'}));
    window.dispatchEvent(new Event('pageshow'));
  });
  expect(await page.evaluate(()=>homeTripEndTimer)).toBe(null);
  await expect(page.locator('#view-today')).toContainText('TODAY · DAY 6');
  await page.evaluate(()=>{window.qaHomeHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#view-today')).toContainText('本趟旅程已結束');
});

test('the packing entry uses the existing preflight and waits for a user choice',async({page})=>{
  await boot(page,'2026-10-24T12:00:00+09:00',true);
  const button=page.locator('#view-today').getByRole('button',{name:'清除並打包旅程',exact:true});
  await button.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#settingsTitle')).toHaveText('資料與版本');
  await expect(page.locator('#tripEndStatus')).toContainText('預檢通過');
  await expect(page.getByRole('button',{name:'保存到過往旅程',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>({mode:TripLifecycle.readState(localStorage).mode,member:localStorage.getItem('trip_member'),drive:!!tripDriveClient})))
    .toEqual({mode:'active',member:'Bar',drive:false});
});

test('the Home packing entry does not bypass pending-account protection',async({page})=>{
  await boot(page,'2026-10-24T12:00:00+09:00',true);
  await page.evaluate(()=>localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'qa-not-delivered'}])));
  await page.locator('#view-today').getByRole('button',{name:'清除並打包旅程',exact:true}).click();
  await expect(page.locator('#tripEndStatus')).toContainText(/待同步|佇列|無法清除/);
  await expect(page.getByRole('button',{name:'保存到過往旅程',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>TripLifecycle.readState(localStorage).mode)).toBe('active');
});

test('invalid or inverted trip dates cannot produce a packing invitation',async({page})=>{
  await boot(page,'2026-10-24T12:00:00+09:00');
  for(const dates of [{start:'2026-10-18',end:'2026-02-30'},{start:'2026-10-25',end:'2026-10-23'},{start:'',end:'2026-10-23'}]){
    await page.evaluate(d=>{DB.cfg.startdate=d.start;DB.cfg.enddate=d.end;renderToday();},dates);
    await expect(page.locator('#view-today').getByRole('button',{name:'清除並打包旅程',exact:true})).toHaveCount(0);
  }
});

// Breaks: missing Iya region or falling back to the distant Okayama hotel.
test('Iya next stop requests Iya weather rather than the overnight hotel region',async({page})=>{
  await boot(page,'2026-10-21T09:30:00+09:00');
  const result=await page.evaluate(()=>{
    const day=DB.trip.days[findToday()],item=day.items.find(i=>i.place==='琵琶瀑布');
    const city=inferWeatherCityForDay(day,item);let requested='';
    const previous=window.fetch;window.fetch=input=>{requested=String(input);return Promise.reject(new TypeError('QA_WEATHER'));};
    return fetchWeather(city).catch(()=>({city:city.label,url:requested})).finally(()=>{window.fetch=previous;});
  });
  expect(result.city).toBe('祖谷');
  const url=new URL(result.url);expect(Number(url.searchParams.get('latitude'))).toBeCloseTo(33.87513,4);
  expect(Number(url.searchParams.get('longitude'))).toBeCloseTo(133.8251,4);
  await expect(page.locator('.today-hero-summary')).toContainText('祖谷');
});

test('weather uses the nearer recognized station on either side, including cluster children',async({page})=>{
  await boot(page,'2026-10-19T09:30:00+09:00');
  const actual=await page.evaluate(()=>{
    const past={act:'抵達',place:'岡山'},unknown={act:'散步',place:'未辨識站'},next={act:'參觀',place:'廣島城'},gap={act:'途中',place:'未辨識途中'};
    const nearNext={items:[past,gap,unknown,next]},nearPast={items:[past,unknown,gap,next]};
    const child={place:'未辨識子站',ref:'',time:'9:10'},parent={act:'串點',place:'廣島城'};
    const clusterDay={items:[past,gap,parent,child,{place:'宮島',time:'10:00'}]};
    return [inferWeatherCityForDay(nearNext,unknown).label,inferWeatherCityForDay(nearPast,unknown).label,inferWeatherCityForDay(clusterDay,child).label,
      inferWeatherCityForDay({items:[unknown]},unknown)];
  });
  expect(actual).toEqual(['廣島','岡山','廣島',null]);
});

test('unknown regions explicitly show unavailable weather instead of a guessed city',async({page})=>{
  await boot(page,'2026-10-19T09:30:00+09:00');
  await page.evaluate(()=>{
    DB.trip.days[findToday()].items=[{id:'qa-unknown-region',act:'散步',place:'未辨識站',time:'9:00',ref:''}];
    renderToday();
  });
  await expect(page.locator('.today-hero-summary')).toContainText('暫無天氣資料');
  await expect(page.locator('.today-hero-summary')).not.toContainText('岡山');
});

for(const width of [320,390])test('cluster Home promotes the actual navigation stop without enlarging typography: '+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  // 12:00: the last stop (11:30) has started and lunch (12:30) has not, so the cluster is still current.
  // Before v148 this booted at 13:30, which only worked because clusters never auto-skipped.
  await boot(page,'2026-10-19T12:00:00+09:00');
  const card=page.locator('.nx-cluster-ticket');
  await expect(card.locator('.nx-ticket-title')).toHaveText('廣島紙鶴塔');
  await expect(card.locator('.nx-cluster-summary')).toContainText('廣島市區走馬看花');
  expect(await card.locator('.nx-ticket-title').evaluate(el=>getComputedStyle(el).fontSize)).toBe('24px');
  const nav=card.locator('.nx-drive-btn');
  const href=await nav.getAttribute('href');expect(new URL(href).searchParams.get('destination')).toContain('廣島紙鶴塔');
  await card.getByRole('button',{name:'展開該區串點'}).click();
  await expect(card.locator('.nx-cluster-stop')).toHaveCount(4);
  await expect(card.getByRole('button',{name:'完成：廣島紙鶴塔',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

// v148 (Bar 2026-10-07): once the next item starts, an unfinished cluster is auto-skipped as a whole.
// Breaks: a cluster that blocks the rest of the day until someone taps 完成.
test('cluster Home moves on to the next item once it starts',async({page})=>{
  await boot(page,'2026-10-19T12:30:00+09:00');
  const home=page.locator('#view-today');
  await expect(home.locator('.nx-cluster-ticket')).toHaveCount(0);
  await expect(home.locator('.nx-ticket-title')).toContainText('みっちゃん');
  expect(await page.evaluate(()=>{
    const index=findToday(),day=DB.trip.days[index],progress=getDayProgress(day,index);
    return ['廣島城','原爆圓頂館','廣島和平紀念資料館','廣島紙鶴塔'].map(name=>{
      const item=day.items.find(candidate=>candidate.place===name);
      return !!(item&&progress.skip[item.id]&&progress.autoSkip[item.id]);
    });
  })).toEqual([true,true,true,true]);
});

test('all-skipped wording and completion counts remain unchanged',async({page})=>{
  await boot(page,'2026-10-18T09:30:00+09:00');
  await page.evaluate(()=>{const index=findToday(),day=DB.trip.days[index];day.items.forEach(item=>{if(item.id)setItemCompletion(day,index,item.id,'skip');});renderToday();});
  await expect(page.locator('#view-today')).toContainText('已處理 6/6');
  await expect(page.locator('.nx-empty-ticket')).toContainText('今日行程完成');
});
