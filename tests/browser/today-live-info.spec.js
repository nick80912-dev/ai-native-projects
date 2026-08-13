/* Today 即時資訊(2026-08-02,v84)
   ============================================================
   讓 Today 回答「現在要幹嘛」而不只是「行程有什麼」。

   下一站待買為什麼沒有歧義:採買項目的 stopRef **就是站點 id**,
   與下一站卡片的 it.id 是 1:1 直接 join —— 不需要經由商場推導,
   也就沒有「一個商場對多個不同日期站點」的問題。
   ============================================================ */
const { test, expect } = require('@playwright/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T13:30:00+09:00');
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
});

/* 在「下一站」那個站點上掛幾筆待買 */
async function getTodayShoppingStops(page) {
  return page.evaluate(() => {
    switchView('today');
    const dayIndex=findToday(),day=DB.trip.days[dayIndex];
    const items=homeNextStopItems(day.items),progress=getDayProgress(day,dayIndex),checks=getChecks(),nowMinutes=currentMinutes();
    const pick=pickNextStop(items,progress,checks,nowMinutes,{day,dayIndex});
    const clusterParent=clusterParentForPick(day.items,pick.item),cluster=getChildStopCluster(day.items,clusterParent);
    const clusterPick=cluster?pickClusterChild(cluster,progress,checks,nowMinutes,{day,dayIndex}):null;
    const current=clusterPick&&clusterPick.item?clusterPick.item:pick.item;
    const currentIndex=(day.items||[]).indexOf(current);
    const future=(day.items||[]).slice(currentIndex+1).filter(isTripCheckableItem);
    return {currentRef:current&&current.id,currentName:current&&(current.place||current.act),futureRefs:future.map((item)=>item.id)};
  });
}

async function seedForNextStop(page, names) {
  const stops=await getTodayShoppingStops(page);
  return page.evaluate(({names,stops}) => {
    const stopRef = stops.currentRef;
    names.forEach((name) => {
      const item = shoppingListStore.add({ name, category: '其他', quantity: 1, unit: '個' });
      shoppingListStore.update(item.id, { stopRef });
    });
    renderToday();
    return { stopRef, stopName: stops.currentName };
  }, {names,stops});
}

test('the next-stop card shows a compact accessible shopping badge', async ({ page }) => {
  const seeded = await seedForNextStop(page, ['白桃果凍', '桃子酒', '吉備糰子']);

  const card = await page.evaluate(() => {
    const el = document.querySelector('#view-today .nx-buy-badge');
    return el ? {
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      ariaLabel: el.getAttribute('aria-label'),
      tag: el.tagName,
      type: el.type,
    } : null;
  });

  expect(card).not.toBeNull();
  expect(card.text).toBe('🛍 3');
  expect(card.ariaLabel).toBe('開啟這一站的 3 項待買');
  expect(card.tag).toBe('BUTTON');
  expect(card.type).toBe('button');
  expect(card.text).not.toContain('白桃果凍');
  expect(seeded.stopRef).toBeTruthy();
});

test('the shopping badge is absent when the next stop has nothing to buy', async ({ page }) => {
  const absent = await page.evaluate(() => {
    switchView('today');
    return !document.querySelector('#view-today .nx-buy-badge');
  });
  expect(absent).toBe(true);
});

test('completed items do not count toward the next stop', async ({ page }) => {
  await seedForNextStop(page, ['甲', '乙']);
  const after = await page.evaluate(() => {
    const pending = shoppingListStore.all().filter((i) => !i.done && i.stopRef);
    shoppingListStore.update(pending[0].id, { done: true, completedAt: '2026-10-18T04:00:00.000Z' });
    renderToday();
    const el = document.querySelector('#view-today .nx-buy-badge');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  expect(after).toBe('🛍 1');
});

async function seedTodayShoppingGroups(page, groupNames) {
  const resolved=await getTodayShoppingStops(page);
  return page.evaluate(({groupNames,resolved}) => {
    const stops=[resolved.currentRef].concat(resolved.futureRefs.slice(0,3));
    groupNames.forEach((names,index)=>{
      const stopRef=stops[index];
      if(!stopRef)return;
      names.forEach((name)=>{
        const item=shoppingListStore.add({name,category:'其他',quantity:1,unit:'個'});
        shoppingListStore.update(item.id,{stopRef});
      });
    });
    renderToday();
    return {currentRef:resolved.currentRef,otherRefs:resolved.futureRefs.slice(0,3)};
  }, {groupNames,resolved});
}

async function seedShoppingDestinationCase(page,testCase){
  const resolved=await getTodayShoppingStops(page);
  return page.evaluate(({testCase,resolved})=>{
    const {launcher,longLabel,blankCategory}=testCase;
    switchView('today');
    shoppingListStore.removeMany(shoppingListStore.all().map((item)=>item.id));
    const targetRef=launcher==='badge'?resolved.currentRef:resolved.futureRefs[0];
    const day=DB.trip.days[findToday()],target=(day.items||[]).filter((item)=>String(item&&item.id||'')===String(targetRef))[0];
    if(longLabel)target.place='廣島和平紀念資料館超長導航目的地名稱';
    const targetItem=shoppingListStore.add({name:'TARGET_PRODUCT',category:blankCategory?'':'必買',quantity:1,unit:'個'});
    shoppingListStore.update(targetItem.id,{stopRef:target.id});
    for(let index=0;index<16;index++)shoppingListStore.add({name:'FILLER_'+index,category:'其他',quantity:1,unit:'個'});
    renderToday();
    const stop=shoppingStopById(target.id);
    return {
      stopRef:target.id,stopName:stop.name,targetId:'shopgroup_'+cssId(target.id),
      launcherSelector:launcher==='badge'?'#view-today .nx-buy-badge':'#view-today .today-hero-shopping-summary'
    };
  },{testCase,resolved});
}

async function activateShoppingLauncher(locator,activation){
  await locator.focus();
  if(activation==='tap')await locator.tap();
  else await locator.press(activation==='enter'?'Enter':'Space');
}

const shoppingDestinationCases=[
  {launcher:'badge',width:320,activation:'tap'},
  {launcher:'badge',width:375,activation:'enter'},
  {launcher:'badge',width:390,activation:'space'},
  {launcher:'hero',width:320,activation:'tap',longLabel:true},
  {launcher:'hero',width:375,activation:'enter',blankCategory:true},
  {launcher:'hero',width:390,activation:'space',longLabel:true,blankCategory:true}
];

test.describe('Shopping target acceptance matrix',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  shoppingDestinationCases.forEach((testCase)=>{
    test(`${testCase.launcher} ${testCase.activation} target is unobscured at ${testCase.width}px`,async({page})=>{
      await page.setViewportSize({width:testCase.width,height:844});
      const seeded=await seedShoppingDestinationCase(page,testCase);
      await page.evaluate(()=>closeMemberSelector());
      const launcher=page.locator(seeded.launcherSelector);
      await launcher.scrollIntoViewIfNeeded();
      await launcher.focus();
      const source=await page.evaluate((selector)=>({scrollY:Math.round(document.scrollingElement.scrollTop),curView,focused:document.activeElement===document.querySelector(selector)}),seeded.launcherSelector);
      await activateShoppingLauncher(launcher,testCase.activation);
      await expect(page.locator('#shoppingListOverlay')).toBeVisible();
      const target=page.locator(`#${seeded.targetId}`),status=page.locator('#shoppingListOverlay .navigation-target-status');
      await expect(target).toHaveClass(/is-navigation-target/);
      const phasesPromise=page.evaluate((targetId)=>new Promise((resolve,reject)=>{
        const targetElement=document.getElementById(targetId),started=performance.now();
        let fadeAt=null;
        const observer=new MutationObserver(()=>{
          const active=targetElement.classList.contains('is-navigation-target');
          const fading=targetElement.classList.contains('is-navigation-target-fading');
          if(fading&&fadeAt===null)fadeAt=performance.now()-started;
          if(!active&&!fading&&navigationIntentState.active===null){
            observer.disconnect();clearTimeout(timeoutId);
            resolve({fadeAt,clearAt:performance.now()-started});
          }
        });
        observer.observe(targetElement,{attributes:true,attributeFilter:['class']});
        const timeoutId=setTimeout(()=>{
          observer.disconnect();reject(new Error('navigation target phases did not complete'));
        },1800);
      }),seeded.targetId);
      await expect(status).toHaveCount(1);
      await expect(status).toHaveAttribute('role','status');
      await expect(status).toHaveAttribute('aria-live','polite');
      await expect(status).toHaveText(`已定位：${seeded.stopName}`);
      await expect(status).not.toHaveClass(/navigation-target-status-visible/);
      const geometry=await page.evaluate((targetId)=>{
        const target=document.getElementById(targetId),status=document.querySelector('#shoppingListOverlay .navigation-target-status');
        const segment=document.querySelector('#shoppingListOverlay .shopping-list-segment');
        return {
          targetTop:target.getBoundingClientRect().top,
          statusWidth:status.getBoundingClientRect().width,statusHeight:status.getBoundingClientRect().height,
          statusPosition:getComputedStyle(status).position,
          stickyBottom:segment.getBoundingClientRect().bottom,
        };
      },seeded.targetId);
      expect(geometry.targetTop).toBeGreaterThanOrEqual(geometry.stickyBottom-1);
      expect(geometry.statusWidth).toBeLessThanOrEqual(1);
      expect(geometry.statusHeight).toBeLessThanOrEqual(1);
      expect(geometry.statusPosition).toBe('absolute');
      expect(await page.evaluate(()=>curView)).toBe(source.curView);
      const phases=await phasesPromise;
      expect(phases.fadeAt).toBeGreaterThanOrEqual(700);
      expect(phases.fadeAt).toBeLessThan(phases.clearAt);
      expect(phases.clearAt-phases.fadeAt).toBeGreaterThanOrEqual(100);
      expect(phases.clearAt-phases.fadeAt).toBeLessThanOrEqual(500);
      await expect(target).not.toHaveClass(/is-navigation-target/);
      await page.evaluate(()=>closeShoppingList());
      const returned=await page.evaluate((selector)=>({scrollY:Math.round(document.scrollingElement.scrollTop),curView,focused:document.activeElement===document.querySelector(selector)}),seeded.launcherSelector);
      expect(returned.curView).toBe(source.curView);
      expect(returned.scrollY).toBe(source.scrollY);
      expect(source.focused).toBe(true);
      expect(returned.focused).toBe(true);
    });
  });
});

const shoppingOriginReplacementCases=[
  {launcher:'badge',refresh:'mutation',disappear:false},
  {launcher:'hero',refresh:'mutation',disappear:false},
  {launcher:'badge',refresh:'async',disappear:true},
  {launcher:'hero',refresh:'async',disappear:true}
];

test.describe('Shopping overlay origin restoration',()=>{
  test.use({viewport:{width:390,height:844}});

  shoppingOriginReplacementCases.forEach((testCase)=>{
    test(`${testCase.launcher} restores ${testCase.disappear?'Today fallback':'replacement launcher'} after ${testCase.refresh} render`,async({page})=>{
      const seeded=await seedShoppingDestinationCase(page,testCase);
      if(!testCase.disappear){
        await page.evaluate((stopRef)=>{
          const sample=shoppingListStore.all()[0];
          const item=shoppingListStore.add({name:'SECOND_TARGET',category:sample.category,quantity:1,unit:sample.unit});
          shoppingListStore.update(item.id,{stopRef});
          renderToday();
        },seeded.stopRef);
      }
      await page.evaluate(()=>closeMemberSelector());
      const source=await page.evaluate((selector)=>{
        const launcher=document.querySelector(selector),scroll=document.scrollingElement;
        document.body.style.paddingBottom='2000px';
        document.documentElement.style.scrollBehavior='auto';
        launcher.focus({preventScroll:true});
        scroll.scrollTop=240;
        const scrollY=Math.round(scroll.scrollTop);
        window.__shoppingOriginLauncher=launcher;
        launcher.click();
        return {scrollY,curView};
      },seeded.launcherSelector);
      expect(source.scrollY).toBe(240);
      await expect(page.locator('#shoppingListOverlay')).toBeVisible();

      const refresh=()=>page.evaluate(({stopRef,disappear,isAsync})=>new Promise((resolve)=>{
        const run=()=>{
          const targetItems=shoppingListStore.all().filter((item)=>String(item.stopRef||'')===String(stopRef));
          if(disappear)shoppingListStore.removeMany(targetItems.map((item)=>item.id));
          else shoppingListStore.update(targetItems[0].id,{done:true,completedAt:'2026-10-18T05:30:00.000Z'});
          renderToday();
          resolve({oldConnected:document.documentElement.contains(window.__shoppingOriginLauncher)});
        };
        if(isAsync)setTimeout(run,0);else run();
      }),{stopRef:seeded.stopRef,disappear:testCase.disappear,isAsync:testCase.refresh==='async'});
      expect((await refresh()).oldConnected).toBe(false);

      await page.evaluate(()=>closeShoppingList());
      const returned=await page.evaluate(({stopRef,launcher,disappear})=>({
        scrollY:Math.round(document.scrollingElement.scrollTop),
        curView,
        focusedFallback:document.activeElement===document.querySelector('.tabbar-btn[data-view="today"]'),
        focusedLauncher:document.activeElement&&document.activeElement.getAttribute('data-shopping-launcher')===launcher&&
          document.activeElement.getAttribute('data-shopping-stop-ref')===String(stopRef),
        matchingLaunchers:document.querySelectorAll('[data-shopping-launcher="'+launcher+'"][data-shopping-stop-ref="'+String(stopRef).replace(/"/g,'\\"')+'"]').length,
        disappear
      }),{stopRef:seeded.stopRef,launcher:testCase.launcher,disappear:testCase.disappear});
      expect(returned.curView).toBe(source.curView);
      expect(returned.scrollY).toBe(source.scrollY);
      expect(returned.matchingLaunchers).toBe(testCase.disappear?0:1);
      expect(returned.focusedLauncher).toBe(!testCase.disappear);
      expect(returned.focusedFallback).toBe(testCase.disappear);
    });
  });

  [
    {mode:'throws on focus options',throws:true},
    {mode:'ignores preventScroll',throws:false}
  ].forEach((focusCase)=>{
    test(`close restores exact source scroll when launcher ${focusCase.mode}`,async({page})=>{
      const seeded=await seedShoppingDestinationCase(page,{launcher:'badge'});
      await page.evaluate(()=>closeMemberSelector());
      const sourceY=await page.evaluate(({selector,throws})=>{
        const launcher=document.querySelector(selector),nativeFocus=HTMLElement.prototype.focus,scroll=document.scrollingElement;
        document.body.style.paddingBottom='2000px';
        document.documentElement.style.scrollBehavior='auto';
        scroll.scrollTop=260;
        const sourceY=Math.round(scroll.scrollTop);
        launcher.click();
        launcher.focus=function(options){
          if(options&&throws)throw new Error('focus options unsupported');
          nativeFocus.call(this);
          scroll.scrollTop=0;
        };
        return sourceY;
      },{selector:seeded.launcherSelector,throws:focusCase.throws});
      await expect(page.locator('#shoppingListOverlay')).toBeVisible();
      await page.evaluate(()=>closeShoppingList());
      const returned=await page.evaluate((selector)=>({
        focused:document.activeElement===document.querySelector(selector),
        scrollY:Math.round(document.scrollingElement.scrollTop),curView
      }),seeded.launcherSelector);
      expect(returned.focused).toBe(true);
      expect(returned.scrollY).toBe(sourceY);
      expect(returned.curView).toBe('today');
    });
  });
});

test('Today Hero excludes the exact next stop and shows the first future Shopping group', async ({ page }) => {
  const seeded=await seedTodayShoppingGroups(page,[['current one','current two'],['one','two','three']]);
  await page.evaluate((ref)=>{
    const futureItems=shoppingListStore.all().filter((item)=>item.stopRef===ref);
    futureItems.forEach((item,index)=>shoppingListStore.update(item.id,{category:index===1?'必買':'伴手禮'}));
    renderToday();
  },seeded.otherRefs[0]);
  const expected=await page.evaluate((ref)=>shoppingStopById(ref).name,seeded.otherRefs[0]);
  const visibleExpected=await page.evaluate((name)=>TripTodayView.buildModel({summary:{
    label:'順路採買',stopRef:'fixture',stopName:name,count:1,firstCategory:'必買',remainingCount:0
  }}).visibleStopName,expected);
  const summary=page.locator('#view-today .today-hero-shopping-summary');
  await expect(summary).toHaveAttribute('aria-label',`開啟${expected}採買：必買，共 3 項待買`);
  await expect(summary.locator('.today-hero-summary-label')).toHaveText('順路採買');
  await expect(summary.locator('.today-hero-shopping-stop')).toHaveText(visibleExpected);
  await expect(summary.locator('.today-hero-shopping-category')).toHaveText('必買');
  await expect(summary.locator('.today-hero-shopping-count')).toHaveText('+2');
  await expect(summary.locator('.today-hero-summary-value')).toHaveText(`${visibleExpected}·必買+2`);
  await expect(summary).not.toContainText('one');
  await expect(summary).not.toContainText('two');
  await expect(summary).not.toContainText('three');
  await expect(page.locator('#view-today .today-shopping-card')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-launcher')).toHaveCount(0);
});

test.describe('blank category Hero fallback',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});

  test('blank category shows 未分類 and keeps touch targeting at mobile widths',async({page})=>{
    const seeded=await seedTodayShoppingGroups(page,[[],['SECRET_UNCATEGORIZED','SECRET_SECOND']]);
    await page.evaluate((ref)=>{
      shoppingListStore.all().filter((item)=>item.stopRef===ref).forEach((item)=>{
        shoppingListStore.update(item.id,{category:''});
      });
      renderToday();
    },seeded.otherRefs[0]);
    const expected=await page.evaluate((ref)=>shoppingStopById(ref).name,seeded.otherRefs[0]);
    const summary=page.locator('#view-today .today-hero-shopping-summary');
    await expect(summary).toHaveAttribute('aria-label',`開啟${expected}採買：未分類，共 2 項待買`);
    await expect(summary.locator('.today-hero-shopping-category')).toHaveText('未分類');
    await expect(summary.locator('.today-hero-shopping-count')).toHaveText('+1');
    await expect(summary).not.toContainText('SECRET_UNCATEGORIZED');

    for(const width of [320,375,390]){
      await page.setViewportSize({width,height:844});
      const layout=await summary.evaluate((element)=>{
        const value=element.querySelector('.today-hero-summary-value');
        const category=element.querySelector('.today-hero-shopping-category');
        const count=element.querySelector('.today-hero-shopping-count');
        const parts=Array.from(value.children),last=parts[parts.length-1].getBoundingClientRect();
        return {
          overflow:document.documentElement.scrollWidth>window.innerWidth,
          rightDelta:Math.abs(last.right-value.getBoundingClientRect().right),
          categoryOverflow:category.scrollWidth>category.clientWidth,
          categoryShrink:getComputedStyle(category).flexShrink,
          countOverflow:count.scrollWidth>count.clientWidth,
          countShrink:getComputedStyle(count).flexShrink
        };
      });
      expect(layout.overflow).toBe(false);
      expect(layout.rightDelta).toBeLessThanOrEqual(1);
      expect(layout.categoryOverflow).toBe(false);
      expect(layout.categoryShrink).toBe('0');
      expect(layout.countOverflow).toBe(false);
      expect(layout.countShrink).toBe('0');
    }

    const expectedId=await page.evaluate((ref)=>'shopgroup_'+cssId(ref),seeded.otherRefs[0]);
    await page.evaluate(()=>closeMemberSelector());
    await summary.tap();
    await expect(page.locator('#shoppingListOverlay')).toBeVisible();
    await expect.poll(()=>page.evaluate((id)=>{
      const panel=document.querySelector('#shoppingListOverlay .shopping-list-panel');
      const group=document.getElementById(id);
      if(!panel||!group)return false;
      const p=panel.getBoundingClientRect(),g=group.getBoundingClientRect();
      return g.bottom>p.top&&g.top<p.bottom;
    },expectedId)).toBe(true);
  });
});

test('Today weather uses a decorative mood and actionable accessible summary', async ({ page }) => {
  await page.evaluate(()=>{
    requestHomeWeather=function(){};
    homeWeatherFor=function(){return {city:'Hiroshima',temp:21,rain:40,icon:'rain',code:61};};
    renderToday();
  });
  await expect(page.locator('#view-today .today-weather-art')).toHaveText('rain');
  await expect(page.locator('#view-today .today-weather-art')).toHaveAttribute('aria-hidden','true');
  const weather=page.locator('#view-today .today-hero-weather-summary');
  await expect(weather).toContainText('21');
  await expect(weather).toHaveAttribute('aria-label','Hiroshima 21 度，現在之後最高降雨機率 40%，記得帶傘');
  const progress=page.locator('#view-today .today-hero-top .loc');
  await expect(progress).toHaveText(/^\d+\s*\/\s*\d+$/);
  await expect(progress).toHaveAttribute('aria-label',/^今日已處理 \d+ 站，共 \d+ 站$/);
});

test('all Shopping at the current next stop leaves only the existing badge', async ({ page }) => {
  await seedTodayShoppingGroups(page,[['one','two']]);
  await expect(page.locator('#view-today .nx-buy-badge')).toHaveText(/2/);
  await expect(page.locator('#view-today .today-hero-shopping-summary')).toHaveCount(0);
});

test('navigation target disables transition under reduced motion', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const seeded=await seedForNextStop(page,['白桃']);
  await page.evaluate(()=>closeMemberSelector());
  await page.locator('#view-today .nx-buy-badge').click();
  const target=page.locator(`#shopgroup_${await page.evaluate((ref)=>cssId(ref),seeded.stopRef)}`);
  await expect(target).toHaveClass(/is-navigation-target/);
  expect(parseFloat(await target.evaluate((element)=>getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
  await page.waitForTimeout(800);
  await expect(target).toHaveClass(/is-navigation-target/);
  await expect(target).not.toHaveClass(/is-navigation-target-fading/);
  await expect.poll(()=>target.evaluate((element)=>({
    active:element.classList.contains('is-navigation-target'),
    fading:element.classList.contains('is-navigation-target-fading'),
    intentActive:navigationIntentState.active!==null
  })),{timeout:350}).toEqual({active:false,fading:false,intentActive:false});
});

test('stale navigation target completion cannot clear a newer destination', async ({ page }) => {
  const seeded=await seedTodayShoppingGroups(page,[['current'],['future']]);
  const result=await page.evaluate(async(refs)=>{
    document.querySelector('#view-today .today-hero-shopping-summary').click();
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const firstToken=navigationIntentState.active.token;
    closeShoppingList();
    openShoppingList(refs.currentRef);
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const secondToken=navigationIntentState.active.token;
    const second=document.getElementById('shopgroup_'+cssId(refs.currentRef));
    clearNavigationTarget(firstToken);
    const staleResult={
      firstToken,secondToken,
      highlighted:second.classList.contains('is-navigation-target'),
      activeToken:navigationIntentState.active&&navigationIntentState.active.token
    };
    clearNavigationTarget(secondToken);
    staleResult.cleared=!second.classList.contains('is-navigation-target')&&navigationIntentState.active===null;
    return staleResult;
  },seeded);
  expect(result.secondToken).toBeGreaterThan(result.firstToken);
  expect(result.highlighted).toBe(true);
  expect(result.activeToken).toBe(result.secondToken);
  expect(result.cleared).toBe(true);
});

test('weather failure keeps generic Shopping entry usable', async ({ page }) => {
  await page.evaluate(()=>{
    requestHomeWeather=function(){}; homeWeatherFor=function(){return null;};
    shoppingListStore.removeMany(shoppingListStore.all().map((item)=>item.id)); renderToday();
  });
  await expect(page.locator('#view-today .today-weather-art')).toHaveCount(0);
  const summary=page.locator('#view-today .today-hero-shopping-summary');
  await expect(summary).toHaveAttribute('aria-label','開啟採買清單');
  await expect(summary.locator('.today-hero-summary-label')).toHaveText('採買清單');
  await expect(summary.locator('.today-hero-summary-value')).toHaveText('開啟查看 →');
  const genericValue=summary.locator('.today-hero-summary-value');
  const genericLayout=await genericValue.evaluate((element)=>{
    const box=element.getBoundingClientRect();
    const range=document.createRange();
    range.selectNodeContents(element);
    const text=range.getBoundingClientRect();
    return {
      justifyContent:getComputedStyle(element).justifyContent,
      rightGap:Math.round(box.right-text.right)
    };
  });
  expect(genericLayout.justifyContent).toBe('flex-end');
  expect(Math.abs(genericLayout.rightGap)).toBeLessThanOrEqual(1);
  await summary.evaluate((element)=>element.click());
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
});

test('the badge is a direct sibling and keeps the openable card free of nested controls', async ({ page }) => {
  await seedForNextStop(page,['白桃']);
  const structure=await page.evaluate(()=>{
    const ticket=document.querySelector('#view-today .nx-ticket');
    const main=ticket&&ticket.querySelector(':scope > .nx-ticket-main');
    const badge=ticket&&ticket.querySelector(':scope > .nx-buy-badge');
    return {
      hasTicketClass:!!(ticket&&ticket.classList.contains('has-next-buy')),
      directSibling:!!(main&&badge&&main.parentElement===badge.parentElement),
      nested:Array.from(main.querySelectorAll('a[href],button,summary,details,[tabindex],[role="button"]'))
        .map((el)=>el.tagName.toLowerCase()+'.'+String(el.className||''))
    };
  });
  expect(structure.hasTicketClass).toBe(true);
  expect(structure.directSibling).toBe(true);
  expect(structure.nested).toEqual([]);
});

test('the badge supports Tab, Enter, Space and a visible keyboard focus ring', async ({ page }) => {
  await seedForNextStop(page,['白桃']);
  const badge=page.locator('#view-today .nx-buy-badge');
  await badge.focus();
  const focusStyle=await badge.evaluate((el)=>{
    const style=getComputedStyle(el);
    return {outlineStyle:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)||0};
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  await badge.press('Enter');
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
  await page.evaluate(()=>closeShoppingList());
  await badge.focus();
  await badge.press('Space');
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
});

test('320, 375 and 390px keep the merged Hero summary on one row', async ({ page }) => {
  const seeded=await seedTodayShoppingGroups(page,[['current one','current two','current three'],['secret product','second','third']]);
  await page.evaluate((ref)=>{
    DB.trip.days.forEach((day)=>day.items.forEach((item)=>{
      if(item.id===ref){item.place='廣島和平紀念資料館';item.act='';}
    }));
    shoppingListStore.all().filter((item)=>item.stopRef===ref).forEach((item)=>{
      shoppingListStore.update(item.id,{category:'生活用品'});
    });
    requestHomeWeather=function(){};
    homeWeatherFor=function(){return {city:'Hiroshima',temp:21,rain:40,icon:'rain',code:61};};
    renderToday();
  },seeded.otherRefs[0]);
  for(const width of [320,375,390]){
    await page.setViewportSize({width,height:844});
    const layout=await page.evaluate(()=>{
      const hero=document.querySelector('#view-today .today-hero');
      const summary=document.querySelector('#view-today .today-hero-summary');
      const shopping=document.querySelector('#view-today .today-hero-shopping-summary');
      const value=document.querySelector('#view-today .today-hero-shopping-summary .today-hero-summary-value');
      const stop=document.querySelector('#view-today .today-hero-shopping-stop');
      const separator=document.querySelector('#view-today .today-hero-shopping-separator');
      const category=document.querySelector('#view-today .today-hero-shopping-category');
      const count=document.querySelector('#view-today .today-hero-shopping-count');
      const ticket=document.querySelector('#view-today .nx-ticket');
      const badge=document.querySelector('#view-today .nx-buy-badge');
      const targets=['.nx-ticket-kicker','.nx-ticket-time','.nx-ticket-title']
        .map((selector)=>ticket.querySelector(selector)).filter(Boolean);
      const s=shopping.getBoundingClientRect(),h=hero.getBoundingClientRect(),t=ticket.getBoundingClientRect(),b=badge.getBoundingClientRect();
      const badgeOverlaps=targets.some((element)=>{
        const r=element.getBoundingClientRect();
        return b.left<r.right&&b.right>r.left&&b.top<r.bottom&&b.bottom>r.top;
      });
      const parts=[stop,separator,category,count].filter(Boolean);
      const gaps=parts.slice(1).map((part,index)=>
        part.getBoundingClientRect().left-parts[index].getBoundingClientRect().right
      );
      const last=parts[parts.length-1].getBoundingClientRect();
      return {
        overflow:document.documentElement.scrollWidth>window.innerWidth,
        summaryRows:getComputedStyle(summary).gridTemplateRows.split(' ').length,
        shoppingWidth:Math.round(s.width),shoppingHeight:Math.round(s.height),
        valueHeight:Math.round(value.getBoundingClientRect().height),valueLineHeight:parseFloat(getComputedStyle(value).lineHeight),
        valueWhiteSpace:getComputedStyle(value).whiteSpace,valueGap:parseFloat(getComputedStyle(value).columnGap),
        stopText:stop.textContent,rightDelta:Math.abs(last.right-value.getBoundingClientRect().right),gaps,
        stopOverflow:stop.scrollWidth>stop.clientWidth,stopWhiteSpace:getComputedStyle(stop).whiteSpace,
        stopTextOverflow:getComputedStyle(stop).textOverflow,
        categoryText:category.textContent,categoryOverflow:category.scrollWidth>category.clientWidth,
        categoryWhiteSpace:getComputedStyle(category).whiteSpace,categoryShrink:getComputedStyle(category).flexShrink,
        countText:count.textContent,countOverflow:count.scrollWidth>count.clientWidth,countShrink:getComputedStyle(count).flexShrink,
        heroHeight:Math.round(h.height),ticketTop:Math.round(t.top),
        badgeWidth:Math.round(b.width),badgeHeight:Math.round(b.height),badgeOverlaps
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.summaryRows).toBe(1);
    expect(layout.shoppingWidth).toBeGreaterThanOrEqual(44);
    expect(layout.shoppingHeight).toBeGreaterThanOrEqual(44);
    expect(layout.valueWhiteSpace).toBe('nowrap');
    expect(layout.valueGap).toBe(4);
    expect(layout.valueHeight).toBeLessThanOrEqual(Math.ceil(layout.valueLineHeight)+1);
    expect(layout.stopText).toBe('廣島和平紀念…');
    expect(layout.rightDelta).toBeLessThanOrEqual(1);
    layout.gaps.forEach((gap)=>expect(gap).toBeGreaterThanOrEqual(3));
    layout.gaps.forEach((gap)=>expect(gap).toBeLessThanOrEqual(5));
    expect(layout.stopWhiteSpace).toBe('nowrap');
    expect(layout.stopTextOverflow).toBe('ellipsis');
    expect(layout.categoryText).toBe('生活用品');
    expect(layout.categoryOverflow).toBe(false);
    expect(layout.categoryWhiteSpace).toBe('nowrap');
    expect(layout.categoryShrink).toBe('0');
    expect(layout.countText).toBe('+2');
    expect(layout.countOverflow).toBe(false);
    expect(layout.countShrink).toBe('0');
    expect(layout.heroHeight).toBeLessThanOrEqual(190);
    expect(layout.ticketTop).toBeLessThan(300);
    expect(layout.badgeWidth).toBeGreaterThanOrEqual(44);
    expect(layout.badgeHeight).toBeGreaterThanOrEqual(44);
    expect(layout.badgeOverlaps,`${width}px badge overlap`).toBe(false);
  }
});

/* ---------- 次要資訊收合 ---------- */

/* 常駐:交通／停車／營業 —— 回答「到得了嗎、開著嗎」,抵達前就要看。
   收合:付款／提醒 —— 抵達後才需要的細節。
   (原始需求還有「依當下情境動態調整優先順序」,因判準未定義,不在本批。) */
/* 這個 fixture 的下一站本身沒有交通／付款／備註欄位(實測 .nx-ticket-lines 是空的),
   所以由測試自己種下資料,而不是賭 fixture 剛好有。 */
async function seedNextStopMeta(page) {
  return page.evaluate(() => {
    switchView('today');
    const dayIndex = findToday();
    const day = DB.trip.days[dayIndex];
    const pick = pickNextStop((day.items || []).filter(isTripCheckableItem),
      getDayProgress(day, dayIndex), getChecks(), currentMinutes(), { day, dayIndex });
    pick.item.move = '開車 15 分鐘';        /* 常駐:交通 */
    pick.item.note = '記得帶折價券';          /* 收合:提醒 */
    renderToday();
    return pick.item.id;
  });
}

test('payment and notes are collapsed behind a disclosure, transport is not', async ({ page }) => {
  await seedNextStopMeta(page);

  const layout = await page.evaluate(() => {
    const card = document.querySelector('#view-today .nx-ticket');
    const details = card.querySelector('.nx-more');
    const outside = card.querySelector('.nx-ticket-lines').cloneNode(true);
    const clonedDetails = outside.querySelector('.nx-more');
    if (clonedDetails) clonedDetails.remove();
    return {
      hasDetails: !!details,
      openByDefault: details ? details.open : null,
      outsideText: outside.textContent.replace(/\s+/g, ' ').trim(),
      insideText: details ? details.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });

  expect(layout.hasDetails).toBe(true);
  expect(layout.openByDefault).toBe(false);
  /* 交通留在外面常駐 */
  expect(layout.outsideText).toContain('交通');
  expect(layout.outsideText).not.toContain('提醒');
  /* 提醒收進可展開區塊 */
  expect(layout.insideText).toContain('提醒');
  expect(layout.insideText).toContain('記得帶折價券');
});

test('the disclosure is absent when there is neither payment nor note', async ({ page }) => {
  const absent = await page.evaluate(() => {
    /* 把今天下一站的付款與備註都清掉 */
    const day = DB.trip.days[findToday()];
    (day.items || []).forEach((it) => { it.note = ''; });
    Object.keys(DB.places || {}).forEach((k) => { DB.places[k].pay = ''; DB.places[k].note = ''; });
    Object.keys(DB.rests || {}).forEach((k) => { DB.rests[k].pay = ''; DB.rests[k].note = ''; });
    renderToday();
    const card = document.querySelector('#view-today .nx-ticket');
    return card ? !card.querySelector('.nx-more') : null;
  });
  expect(absent).toBe(true);
});

test('expanding the disclosure survives a re-render', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('today');
    const details = document.querySelector('#view-today .nx-more');
    if (!details) return { skipped: true };
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    renderToday();
    const after = document.querySelector('#view-today .nx-more');
    return { skipped: false, stillOpen: after ? after.open : null };
  });
  if (!result.skipped) expect(result.stillOpen).toBe(true);
});

/* ---------- 卡片內的控制項不得觸發整張卡的導覽 ---------- */

/* 真機回饋:點「其他資訊」會直接跳進行程分頁。
   成因是 .nx-ticket-main 本身是 role="button" + onclick="openTripItem(...)",
   而我把 <details> 放進了它的 .nx-ticket-lines 裡 —— 點 summary 展開之後,
   click 繼續往上冒泡到整張卡的 onclick。 */
test('expanding the details does not navigate to the trip tab', async ({ page }) => {
  await seedNextStopMeta(page);

  const result = await page.evaluate(() => {
    switchView('today');
    const before = curView;
    const summary = document.querySelector('#view-today .nx-more-summary');
    summary.click();
    return {
      before,
      after: curView,
      detailsOpen: document.querySelector('#view-today .nx-more').open,
    };
  });

  expect(result.before).toBe('today');
  expect(result.detailsOpen).toBe(true);
  expect(result.after).toBe('today');
});

/* 根因層級的保護,取代逐一列舉個案:整張卡的 role="button" 內不得再有可聚焦的
   互動元素。巢狀互動控制項在語意上無效 —— 冒泡會誤觸整張卡的導覽,鍵盤 tab 會
   落進一個「按鈕裡的按鈕」,螢幕閱讀器也讀不出正確的角色。
   日後若有人再往卡片內塞控制項(例如 MAPCODE),這條會直接紅。 */
test('the openable card contains no nested focusable controls', async ({ page }) => {
  await seedNextStopMeta(page);
  const nested = await page.evaluate(() => {
    const main = document.querySelector('#view-today .nx-ticket-main[role="button"]');
    if (!main) return null;
    return Array.from(main.querySelectorAll('a[href],button,summary,details,[tabindex],[role="button"]'))
      .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
  });
  expect(nested).toEqual([]);
});
