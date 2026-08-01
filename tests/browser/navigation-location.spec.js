const {test,expect}=require('@playwright/test');
const {collectPageErrors,waitForSyncToSettle}=require('./support/qa-fixture');

async function openNavigationQaApp(page){
  await page.addInitScript(()=>{
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
    window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
  });
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    return route.fulfill({status:204,body:''});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof syncInFlight!=='undefined');
  await waitForSyncToSettle(page);
}

async function installNavigationProbe(page,mode){
  await page.evaluate(value=>{
    window.__navigationOpened=[];
    window.__geolocationCalls=0;
    window.open=function(){
      return {
        opener:window,
        location:{replace(url){window.__navigationOpened.push(String(url));}}
      };
    };
    navigator.geolocation.getCurrentPosition=function(success,error,options){
      window.__geolocationCalls++;
      window.__geolocationOptions=options;
      if(value==='success')success({coords:{latitude:34.6651,longitude:133.918}});
      else error({code:1,message:'denied'});
    };
  },mode);
}

test('一般地點使用目前位置,拒絕定位退回日本搜尋,明確地點不請求定位',async({page})=>{
  const pageErrors=collectPageErrors(page),consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await openNavigationQaApp(page);

  await page.evaluate(()=>{
    closeMemberSelector();
    DB.trip.days[0].items.push({id:'qa-generic-nav',act:'採買',place:'AEON',ref:''});
    const item=tripItemForNavigation(0,'qa-generic-nav');
    const host=document.createElement('div');host.id='qaNavigationHost';
    host.innerHTML=renderTripNavigationLink(item,null,0,'qa-btn drv');
    document.body.appendChild(host);
  });
  const link=page.locator('#qaNavigationHost a');
  await expect(link).toHaveText('🚗 導航');
  expect(await link.textContent()).not.toContain('附近搜尋');
  expect(await link.textContent()).not.toContain('精確地點');

  await installNavigationProbe(page,'success');
  await link.click();
  await expect.poll(()=>page.evaluate(()=>window.__navigationOpened[0]||'')).toContain('origin=34.6651%2C133.918');
  const nearby=await page.evaluate(()=>({
    calls:window.__geolocationCalls,
    options:window.__geolocationOptions,
    url:window.__navigationOpened[0]
  }));
  expect(nearby.calls).toBe(1);
  expect(nearby.options).toEqual({enableHighAccuracy:false,timeout:6000,maximumAge:300000});
  expect(nearby.url).toContain('destination=AEON');
  expect(nearby.url).not.toContain('%E6%97%A5%E6%9C%AC');

  await installNavigationProbe(page,'denied');
  await link.click();
  await expect.poll(()=>page.evaluate(()=>window.__navigationOpened[0]||'')).toContain('destination=AEON%20%E6%97%A5%E6%9C%AC');
  expect(await page.evaluate(()=>window.__geolocationCalls)).toBe(1);

  const exact=await page.evaluate(()=>{
    const item={id:'qa-exact-nav',act:'購物',place:'永旺'};
    const res={kind:'place',p:{placeId:'P001',name:'永旺夢樂城 岡山'}};
    const markup=renderTripNavigationLink(item,res,0,'qa-btn drv');
    const host=document.getElementById('qaNavigationHost');host.innerHTML=markup;
    const anchor=host.querySelector('a');
    return {href:anchor.getAttribute('href'),onclick:anchor.getAttribute('onclick'),text:anchor.textContent,calls:window.__geolocationCalls};
  });
  expect(exact.href).toContain('destination=%E6%B0%B8%E6%97%BA%E5%A4%A2%E6%A8%82%E5%9F%8E%20%E5%B2%A1%E5%B1%B1%20%E6%97%A5%E6%9C%AC');
  expect(exact.onclick).toBe(null);
  expect(exact.text).toBe('🚗 導航');
  expect(exact.calls).toBe(1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
