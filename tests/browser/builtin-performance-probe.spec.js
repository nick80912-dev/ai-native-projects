const {test,expect}=require('./support/test');

test('records ten cold boot samples',async ({browser})=>{
  const samples=[];
  for(let run=0;run<10;run+=1){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.addInitScript(()=>{
      window.__firstTodayRender=0;
      new MutationObserver(function(){
        const today=document.getElementById('view-today');
        if(!window.__firstTodayRender&&today&&today.children.length)window.__firstTodayRender=performance.now();
      }).observe(document,{subtree:true,childList:true});
    });
    await page.goto('/?builtin-perf='+run,{waitUntil:'domcontentloaded'});
    await expect.poll(()=>page.evaluate(()=>window.__firstTodayRender)).toBeGreaterThan(0);
    samples.push(await page.evaluate(async()=>{
      const navigation=performance.getEntriesByType('navigation')[0];
      const swSource=await fetch('./sw.js',{cache:'no-store'}).then(response=>response.text());
      const legacyMarker=/BUILTIN_SNAPSHOT app=([^\s>]+) ts=(\d+)/.exec(document.documentElement.innerHTML);
      return {
        dcl:navigation.domContentLoadedEventEnd,
        today:window.__firstTodayRender,
        blank:!document.getElementById('view-today').textContent.trim(),
        identity:{
          app:typeof APP_VERSION==='string'?APP_VERSION:null,
          html:typeof BUILTIN_HTML_VERSION==='string'?BUILTIN_HTML_VERSION:legacyMarker&&legacyMarker[1]||null,
          asset:typeof BUILTIN_ASSET_VERSION==='string'?BUILTIN_ASSET_VERSION:null,
          sw:(/SW_VERSION='([^']+)'/.exec(swSource)||[])[1]||null,
          timestamp:typeof BUILTIN_TS==='number'?BUILTIN_TS:null,
          htmlTimestamp:typeof BUILTIN_HTML_TS==='number'?BUILTIN_HTML_TS:legacyMarker&&Number(legacyMarker[2])||null,
          mode:typeof BUILTIN_ASSET_VERSION==='string'?'asset':'inline',
          controller:!!navigator.serviceWorker.controller,
          cacheKeys:typeof caches==='undefined'?[]:await caches.keys()
        }
      };
    }));
    await context.close();
  }
  console.log('BUILTIN_PERF '+JSON.stringify(samples));
  expect(samples.every(sample=>!sample.blank)).toBe(true);
});
