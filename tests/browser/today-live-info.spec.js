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
async function seedForNextStop(page, names) {
  return page.evaluate((names) => {
    switchView('today');
    const day = DB.trip.days[findToday()];
    const pick = pickNextStop((day.items || []).filter(isTripCheckableItem),
      getDayProgress(day, findToday()), getChecks(), currentMinutes(), { day, dayIndex: findToday() });
    const stopRef = pick.item.id;
    names.forEach((name) => {
      const item = shoppingListStore.add({ name, category: '其他', quantity: 1, unit: '個' });
      shoppingListStore.update(item.id, { stopRef });
    });
    renderToday();
    return { stopRef, stopName: pick.item.place || pick.item.act };
  }, names);
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

test('tapping the badge opens the shopping list at that stop without navigating', async ({ page }) => {
  const seeded = await seedForNextStop(page, ['白桃果凍', '桃子酒']);

  const result = await page.evaluate(async (stopRef) => {
    const badge=document.querySelector('#view-today .nx-buy-badge');
    if(!badge)return {missing:true};
    const before=curView;
    badge.click();
    await new Promise((r) => setTimeout(r, 400));
    const overlay = document.getElementById('shoppingListOverlay');
    const group = document.getElementById('shopgroup_' + cssId(stopRef));
    return {
      missing:false,
      before,
      after:curView,
      overlayOpen: !!overlay,
      groupExists: !!group,
      groupText: group ? group.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
    };
  }, seeded.stopRef);

  expect(result.missing).toBe(false);
  expect(result.before).toBe('today');
  expect(result.after).toBe('today');
  expect(result.overlayOpen).toBe(true);
  expect(result.groupExists).toBe(true);
  expect(result.groupText).toContain('白桃果凍');
});

async function seedTodayShoppingGroups(page, groupNames) {
  return page.evaluate((groupNames) => {
    switchView('today');
    const dayIndex=findToday();
    const day=DB.trip.days[dayIndex];
    const checkable=(day.items||[]).filter(isTripCheckableItem);
    const pick=pickNextStop(checkable,getDayProgress(day,dayIndex),getChecks(),currentMinutes(),{day,dayIndex});
    const current=pick.item;
    const seen={};
    if(current)seen[String(current.id)]=true;
    const others=[];
    checkable.forEach((item)=>{
      const id=String(item&&item.id||'');
      if(!id||seen[id]||others.length>=3)return;
      seen[id]=true;others.push(item);
    });
    const stops=[current].concat(others);
    groupNames.forEach((names,index)=>{
      const stop=stops[index];
      if(!stop)return;
      names.forEach((name)=>{
        const item=shoppingListStore.add({name,category:'其他',quantity:1,unit:'個'});
        shoppingListStore.update(item.id,{stopRef:stop.id});
      });
    });
    renderToday();
    return {currentRef:current&&current.id,otherRefs:others.map((item)=>item.id)};
  }, groupNames);
}

test('Today excludes the exact next stop and renders two compact other-stop rows', async ({ page }) => {
  await seedTodayShoppingGroups(page,[
    ['下一站一','下一站二'],
    ['醬油','抹茶','和菓子'],
    ['咖啡豆','果醬','餅乾','茶葉'],
    ['桃子果凍']
  ]);
  const card=page.locator('#view-today .today-shopping-card');
  await expect(card.locator('.today-shopping-card-head strong')).toHaveText('今天 8 項待買');
  await expect(card.locator('.today-shopping-card-head span')).toHaveText('查看全部 →');
  await expect(card.locator('.today-shopping-summary-row')).toHaveCount(2);
  await expect(card).not.toContainText('下一站一');
  await expect(card).toContainText('醬油、抹茶、和菓子');
  await expect(card).toContainText('咖啡豆、果醬、餅乾...');
  await expect(card).not.toContainText('茶葉');
  await expect(card).toContainText('另有 1 個地點');
  await expect(card).not.toContainText('等');
});

test('all shopping at the valid next stop leaves only the badge, never a fallback launcher', async ({ page }) => {
  await seedTodayShoppingGroups(page,[['下一站一','下一站二']]);
  await expect(page.locator('#view-today .nx-buy-badge')).toHaveText('🛍 2');
  await expect(page.locator('#view-today .today-shopping-card')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-launcher')).toHaveCount(0);
});

test('other-stop shopping remains visible when the next stop has nothing to buy', async ({ page }) => {
  await seedTodayShoppingGroups(page,[[],['其他站一','其他站二']]);
  await expect(page.locator('#view-today .nx-buy-badge')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-card')).toContainText('今天 2 項待買');
});

test('the Today shopping card remains one button and opens the full list without navigation', async ({ page }) => {
  await seedTodayShoppingGroups(page,[[],['醬油']]);
  const card=page.locator('#view-today .today-shopping-card');
  await expect(card.locator('button,a,[role="button"],[tabindex]')).toHaveCount(0);
  await card.evaluate((element)=>element.click());
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
  expect(await page.evaluate(()=>curView)).toBe('today');
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

test('320, 375 and 390px keep the badge clear and Today rows on one line', async ({ page }) => {
  await seedTodayShoppingGroups(page,[
    ['下一站一','下一站二','下一站三'],
    ['這是一個非常非常長的岡山車站伴手禮樓層名稱','抹茶','和菓子','柚子胡椒'],
    ['咖啡豆','果醬','餅乾'],
    ['桃子果凍']
  ]);
  for(const width of [320,375,390]){
    await page.setViewportSize({width,height:844});
    const layout=await page.evaluate(()=>{
      const badge=document.querySelector('#view-today .nx-buy-badge');
      const ticket=document.querySelector('#view-today .nx-ticket');
      const targets=['.nx-ticket-kicker','.nx-ticket-time','.nx-ticket-title']
        .map((selector)=>ticket.querySelector(selector)).filter(Boolean);
      const b=badge.getBoundingClientRect();
      const overlaps=targets.some((element)=>{
        const r=element.getBoundingClientRect();
        return b.left<r.right&&b.right>r.left&&b.top<r.bottom&&b.bottom>r.top;
      });
      const rows=Array.from(document.querySelectorAll('#view-today .today-shopping-summary-row'));
      return {
        overflow:document.documentElement.scrollWidth>window.innerWidth,
        /* Chromium 可能把 44 CSS px 回報為 43.999969；以 CSS pixel 取整驗收觸控區。 */
        badgeWidth:Math.round(b.width),badgeHeight:Math.round(b.height),overlaps,
        rows:rows.length,
        multiline:rows.some((row)=>row.getBoundingClientRect().height>22),
        oldBuy:!!document.querySelector('#view-today .nx-buy'),
        badgePosition:getComputedStyle(badge).position
      };
    });
    expect(layout.overflow,`${width}px horizontal overflow`).toBe(false);
    expect(layout.badgeWidth).toBeGreaterThanOrEqual(44);
    expect(layout.badgeHeight).toBeGreaterThanOrEqual(44);
    expect(layout.overlaps,`${width}px badge overlap`).toBe(false);
    expect(layout.rows).toBe(2);
    expect(layout.multiline,`${width}px summary wraps`).toBe(false);
    expect(layout.oldBuy).toBe(false);
    expect(layout.badgePosition).toBe('absolute');
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
