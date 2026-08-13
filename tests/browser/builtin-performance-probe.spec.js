const {test,expect}=require('@playwright/test');

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
    samples.push(await page.evaluate(()=>{
      const navigation=performance.getEntriesByType('navigation')[0];
      return {dcl:navigation.domContentLoadedEventEnd,today:window.__firstTodayRender,blank:!document.getElementById('view-today').textContent.trim()};
    }));
    await context.close();
  }
  console.log('BUILTIN_PERF '+JSON.stringify(samples));
  expect(samples.every(sample=>!sample.blank)).toBe(true);
});
