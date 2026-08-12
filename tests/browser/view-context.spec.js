/* 操作脈絡保存(2026-08-02,v82)
   ============================================================
   實測(改版前):switchView() 結尾無條件 window.scrollTo({top:0}),
   所以每次切分頁都回頂,切回來也回不到原位。

   注意 html{scroll-behavior:smooth}:測試裡設定 scrollTop 後必須等它停,
   或直接驗證實作有用 behavior:'instant'。本檔一律等到位置穩定再斷言。
   ============================================================ */
const { test, expect } = require('@playwright/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T09:30:00+09:00');
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
});

/* 捲到指定位置並等它真的停下來(避開 CSS smooth 的動畫尾巴) */
async function scrollTo(page, y) {
  await page.evaluate((target) => {
    const doc = document.scrollingElement;
    doc.scrollTop = target;
  }, y);
  await page.waitForFunction((target) => {
    const doc = document.scrollingElement;
    return Math.abs(doc.scrollTop - Math.min(target, doc.scrollHeight - doc.clientHeight)) <= 2;
  }, y, { timeout: 3000 });
  return page.evaluate(() => Math.round(document.scrollingElement.scrollTop));
}

test('each tab keeps its own scroll position across switches', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  const tripY = await scrollTo(page, 600);
  expect(tripY).toBeGreaterThan(100);

  await page.evaluate(() => switchView('shop'));
  const shopTop = await page.evaluate(() => Math.round(document.scrollingElement.scrollTop));
  /* 換到沒去過的分頁應該在頂端,而不是沿用上一個分頁的位置 */
  expect(shopTop).toBe(0);

  const shopY = await scrollTo(page, 400);

  /* 切回行程頁:回到原本的位置 */
  await page.evaluate(() => switchView('trip'));
  await page.waitForFunction((y) => Math.abs(document.scrollingElement.scrollTop - y) <= 4, tripY, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeGreaterThan(tripY - 5);

  /* 再切回購物頁:也回到原本的位置 */
  await page.evaluate(() => switchView('shop'));
  await page.waitForFunction((y) => Math.abs(document.scrollingElement.scrollTop - y) <= 4, shopY, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeGreaterThan(shopY - 5);
});

test('tapping the tab you are already on returns to the top', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await scrollTo(page, 600);

  await page.evaluate(() => switchView('trip'));
  await page.waitForFunction(() => document.scrollingElement.scrollTop <= 2, null, { timeout: 3000 });
  expect(await page.evaluate(() => Math.round(document.scrollingElement.scrollTop))).toBeLessThanOrEqual(2);
});

test('a saved position taller than the new page is clamped, never invalid', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await scrollTo(page, 900);

  /* 讓行程頁變短:切到只剩少數項目的一天,再切回來 */
  const result = await page.evaluate(async () => {
    switchView('shop');
    /* 直接把保存值灌成遠超過任何頁面高度的數字 */
    viewUiState.trip.scrollY = 999999;
    switchView('trip');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const doc = document.scrollingElement;
    return {
      scrollTop: Math.round(doc.scrollTop),
      maxScroll: Math.round(doc.scrollHeight - doc.clientHeight),
    };
  });

  expect(result.scrollTop).toBeLessThanOrEqual(result.maxScroll);
  expect(result.scrollTop).toBeGreaterThanOrEqual(0);
});

test('the transient UI state never reaches localStorage or the backup', async ({ page }) => {
  const leaked = await page.evaluate(() => {
    switchView('trip');
    document.scrollingElement.scrollTop = 500;
    switchView('shop');
    const keys = Object.keys(localStorage);
    const dump = keys.map((k) => localStorage.getItem(k) || '').join('|');
    return {
      keyLeak: keys.filter((k) => /viewUi|scroll|navigationIntent/i.test(k)),
      valueLeak: /scrollY|navigationIntentState/.test(dump),
      backupLeak: /scrollY|viewUiState|navigationIntentState/.test(personalStateJson()),
    };
  });
  expect(leaked.keyLeak).toEqual([]);
  expect(leaked.valueLeak).toBe(false);
  expect(leaked.backupLeak).toBe(false);
});

/* ---------- 入口意圖 ---------- */

test('an explicit entry positions its target instead of restoring the old scroll', async ({ page }) => {
  /* 先在行程頁留下一個明顯的捲動位置 */
  await page.evaluate(() => switchView('trip'));
  const saved = await scrollTo(page, 700);
  expect(saved).toBeGreaterThan(100);
  await page.evaluate(() => switchView('today'));

  /* 由明確入口回行程頁:應定位該 item,而不是還原 700 */
  const result = await page.evaluate(async () => {
    const day = DB.trip.days[0];
    const target = day.items.filter((it) => it.act || it.place)[6] || day.items[day.items.length - 1];
    openTripItem(0, target.id);
    await new Promise((r) => setTimeout(r, 400));
    const el = document.getElementById('it_' + target.id);
    const box = el.getBoundingClientRect();
    return {
      itemId: target.id,
      inViewport: box.top >= -10 && box.top <= window.innerHeight,
      scrollTop: Math.round(document.scrollingElement.scrollTop),
      highlighted: el.classList.contains('is-navigation-target'),
      status: document.querySelector('#view-trip .navigation-target-status')?.textContent || '',
      curView,
    };
  });

  expect(result.curView).toBe('trip');
  expect(result.inViewport).toBe(true);
  expect(result.highlighted).toBe(true);
  expect(result.status).toMatch(/^已定位：/);
});

test('the intent is consumed once — later plain switches restore again', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await scrollTo(page, 700);
  await page.evaluate(() => switchView('today'));

  /* 明確入口進去 */
  await page.evaluate(async () => {
    const day = DB.trip.days[0];
    openTripItem(0, day.items[day.items.length - 1].id);
    await new Promise((r) => setTimeout(r, 300));
  });

  /* 之後用一般分頁切換離開再回來:走的是位置還原,不是再定位一次 item */
  const restored = await page.evaluate(async () => {
    const afterIntent = Math.round(document.scrollingElement.scrollTop);
    switchView('today');
    switchView('trip');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { afterIntent, now: Math.round(document.scrollingElement.scrollTop) };
  });

  /* intent 以參數傳遞,天然只消耗一次 —— 沒有模組層旗標會殘留 */
  /* 回到「離開明確入口時」的位置,而不是被 intent 再次定位 */
  expect(Math.abs(restored.now - restored.afterIntent)).toBeLessThanOrEqual(4);
});

test('gotoDay and openShopPlace position their targets rather than restoring', async ({ page }) => {
  const dayResult = await page.evaluate(async () => {
    switchView('trip');
    document.scrollingElement.scrollTop = 600;
    switchView('today');
    gotoDay(1);
    await new Promise((r) => setTimeout(r, 400));
    return { curView, curDay, scrollTop: Math.round(document.scrollingElement.scrollTop) };
  });
  expect(dayResult.curView).toBe('trip');
  expect(dayResult.curDay).toBe(1);
  expect(dayResult.scrollTop).toBeLessThanOrEqual(4);

  const shopResult = await page.evaluate(async () => {
    switchView('shop');
    document.scrollingElement.scrollTop = 300;
    switchView('today');
    const pid = shopMalls()[0].place.placeId;
    openShopPlace(pid);
    await new Promise((r) => setTimeout(r, 500));
    const targetId='shopmall_'+cssId(pid.toUpperCase());
    const target=document.getElementById(targetId);
    return {
      curView,filter:shopPlaceFilter,pid,targetId,
      highlighted:!!(target&&target.classList.contains('is-navigation-target')),
      status:document.querySelector('#view-shop .navigation-target-status')?.textContent||''
    };
  });
  expect(shopResult.curView).toBe('shop');
  expect(shopResult.filter).toBe(shopResult.pid.toUpperCase());
  expect(shopResult.targetId).toBe(`shopmall_${shopResult.pid.toUpperCase()}`);
  expect(shopResult.highlighted).toBe(true);
  expect(shopResult.status).toMatch(/^已定位：/);
});

test('a missing navigation target reports failure without restoring unrelated old scroll', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    switchView('shop');
    document.scrollingElement.scrollTop=300;
    captureViewScroll('shop');
    switchView('today');
    AppLog.clear();
    switchView('shop',{
      view:'shop',targetId:'shopmall_DOES_NOT_EXIST',sourceView:'today',sourceId:'test',
      align:'start',announce:'已定位：不存在的地點'
    });
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const logs=AppLog.snapshot();
    return {
      scrollTop:Math.round(document.scrollingElement.scrollTop),
      status:document.querySelector('#view-shop .navigation-target-status')?.textContent||'',
      renderLogged:logs.some((entry)=>entry.category==='render'&&entry.message.includes('shopmall_DOES_NOT_EXIST')),
      active:navigationIntentState.active
    };
  });
  expect(result.scrollTop).toBe(0);
  expect(result.status).toBe('找不到對應地點');
  expect(result.renderLogged).toBe(true);
  expect(result.active).toBeNull();
});

/* ---------- 行程面板展開狀態 ---------- */

/* 展開幾個面板,回傳它們的 key 與當時的展開數 */
async function openSomePanels(page) {
  return page.evaluate(() => {
    switchView('trip');
    const buttons = Array.from(document.querySelectorAll('#view-trip .qa-btn[onclick^="togglePanel"]')).slice(0, 3);
    buttons.forEach((b) => b.click());
    return {
      clicked: buttons.length,
      open: document.querySelectorAll('#view-trip .panel.open, #view-trip [id^="pn_"].open').length,
    };
  });
}

/* 注意:tripHideDone 預設為 true,所以被打卡的那一筆會**刻意**離開結果集。
   本測試驗的是「仍然存在的項目」的面板不得被無故收掉;被篩除者另見下方測試。 */
test('detail panels of surviving items are kept when another item is checked off', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('trip');
    const items = Array.from(document.querySelectorAll('#view-trip .item'));
    const victim = items[0];
    const victimId = victim.id.replace(/^it_/, '');

    /* 只展開「不會被打卡」的項目的面板 */
    const survivors = items.slice(1);
    const opened = [];
    survivors.forEach((item) => {
      const btn = item.querySelector('.qa-btn[onclick^="togglePanel"]');
      if (btn && opened.length < 3) { btn.click(); opened.push(item.id.replace(/^it_/, '')); }
    });
    const before = document.querySelectorAll('#view-trip [id^="pn_"].open').length;

    victim.querySelector('.chk').click();   /* 觸發 renderTrip() */

    return {
      opened,
      before,
      after: document.querySelectorAll('#view-trip [id^="pn_"].open').length,
      victimGone: !document.getElementById('it_' + victimId),
      survivorsStillHere: opened.every((id) => !!document.getElementById('it_' + id)),
    };
  });

  expect(result.opened.length).toBeGreaterThan(0);
  expect(result.before).toBe(result.opened.length);
  expect(result.survivorsStillHere).toBe(true);
  /* 改版前這裡會是 0 —— 每打一次卡所有面板全部收合 */
  expect(result.after).toBe(result.before);
});

test('detail panels survive leaving and returning to the trip tab', async ({ page }) => {
  const before = await openSomePanels(page);
  const after = await page.evaluate(async () => {
    switchView('today');
    switchView('trip');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { open: document.querySelectorAll('#view-trip .panel.open, #view-trip [id^="pn_"].open').length };
  });
  expect(after.open).toBe(before.open);
});

test('panel state for filtered-out items is dropped, not accumulated', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('trip');
    const firstItem = document.querySelector('#view-trip .item');
    const itemId = firstItem.id.replace(/^it_/, '');
    /* 先展開這一筆的面板 */
    const btn = firstItem.querySelector('.qa-btn[onclick^="togglePanel"]');
    if (btn) btn.click();
    const keysBefore = Object.keys(viewUiState.trip.openPanels);

    /* 打卡後開啟「隱藏已完成」,讓它離開結果集 */
    firstItem.querySelector('.chk').click();
    setTripHideDone(true);

    return {
      itemId,
      keysBefore,
      keysAfter: Object.keys(viewUiState.trip.openPanels),
      stillRendered: !!document.getElementById('it_' + itemId),
    };
  });

  expect(result.keysBefore.some((k) => k.indexOf(result.itemId) === 0)).toBe(true);
  expect(result.stillRendered).toBe(false);
  /* 被篩除的 item 不得在暫態狀態裡無限累積 */
  expect(result.keysAfter.some((k) => k.indexOf(result.itemId) === 0)).toBe(false);
});

/* ---------- 打卡的鍵盤操作與焦點 ---------- */

test('check-in is a keyboard operable checkbox', async ({ page }) => {
  const meta = await page.evaluate(() => {
    switchView('trip');
    const chk = document.querySelector('#view-trip .item .chk');
    return {
      role: chk.getAttribute('role'),
      tabindex: chk.getAttribute('tabindex'),
      checked: chk.getAttribute('aria-checked'),
      label: chk.getAttribute('aria-label'),
      glyphHidden: chk.querySelector('[aria-hidden="true"]') !== null,
    };
  });
  expect(meta.role).toBe('checkbox');
  expect(meta.tabindex).toBe('0');
  expect(meta.checked).toBe('false');
  expect(meta.label).toBeTruthy();
  expect(meta.glyphHidden).toBe(true);
});

test('Space checks in from the keyboard and Enter works too', async ({ page }) => {
  await page.evaluate(() => { switchView('trip'); setTripHideDone(false); });
  const chk = page.locator('#view-trip .item .chk').first();
  await chk.focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#view-trip .item .chk').first()).toHaveAttribute('aria-checked', 'true');

  await page.locator('#view-trip .item .chk').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#view-trip .item .chk').first()).toHaveAttribute('aria-checked', 'false');
});

test('keyboard check-in restores focus, mouse click does not steal it', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('trip');
    setTripHideDone(false);   /* 讓目標留在結果集內 */

    const chk = document.querySelector('#view-trip .item .chk');
    const itemId = chk.closest('.item').id;
    chk.focus();
    chk.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    const afterKeyboard = {
      onSameItem: document.activeElement.closest('.item') && document.activeElement.closest('.item').id === itemId,
      isChk: document.activeElement.classList.contains('chk'),
    };

    /* 滑鼠路徑:先把焦點放到別處,點擊後不該被搶走 */
    document.body.focus();
    const parked = document.activeElement;
    document.querySelector('#view-trip .item .chk').click();
    const afterMouse = { stolen: document.activeElement !== parked && document.activeElement.classList.contains('chk') };

    return { afterKeyboard, afterMouse };
  });

  expect(result.afterKeyboard.isChk).toBe(true);
  expect(result.afterKeyboard.onSameItem).toBe(true);
  expect(result.afterMouse.stolen).toBe(false);
});

/* 契約的例外:使用者刻意讓目標離開結果集時,焦點移往下一個合理目標 */
test('when the checked item leaves the list, focus moves to a sensible next target', async ({ page }) => {
  const result = await page.evaluate(() => {
    switchView('trip');
    setTripHideDone(true);    /* 打完卡該筆會離開結果集 */

    const chk = document.querySelector('#view-trip .item .chk');
    const itemId = chk.closest('.item').id;
    chk.focus();
    chk.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    const active = document.activeElement;
    return {
      victimGone: !document.getElementById(itemId),
      focusLost: active === document.body || active === null,
      onNextChk: active.classList.contains('chk'),
      onFilter: active.classList.contains('trip-filter-btn'),
    };
  });

  expect(result.victimGone).toBe(true);
  expect(result.focusLost).toBe(false);
  expect(result.onNextChk || result.onFilter).toBe(true);
});

/* ---------- 回到現在 ---------- */

/* 只在「它做得到別處做不到的事」時才出現。
   實測:待在今天那一天時,「隱藏已完成」(預設開)已把過去的站點移走,
   「現在」在三種情境下都落在第一屏內(第 1／2／4 筆,255／391／783px,視窗 844px),
   而「再點同一分頁回頂」已能到達 —— 那時這顆按鈕等於捲到頂,是多餘的。
   真正無可取代的只有跨日:人在 Day 5、今天是 Day 1 時,篩選與回頂都幫不上忙。 */
test('back-to-now stays hidden on today, because hide-done plus back-to-top already covers it', async ({ page }) => {
  const onToday = await page.evaluate(() => {
    switchView('trip');
    return { curDay, todayIndex: findToday(), hasButton: !!document.querySelector('#view-trip .trip-back-now') };
  });
  expect(onToday.todayIndex).not.toBe(null);
  expect(onToday.curDay).toBe(onToday.todayIndex);
  expect(onToday.hasButton).toBe(false);
});

test('back-to-now appears once you are on a different day', async ({ page }) => {
  const away = await page.evaluate(() => {
    switchView('trip');
    const today = findToday();
    gotoDay(today === 0 ? 1 : 0);
    return { curDay, todayIndex: today, hasButton: !!document.querySelector('#view-trip .trip-back-now') };
  });
  expect(away.curDay).not.toBe(away.todayIndex);
  expect(away.hasButton).toBe(true);
});

test('back-to-now stays hidden when today is outside the trip entirely', async ({ page }) => {
  const outside = await page.evaluate(() => {
    switchView('trip');
    const saved = DB.trip.days.map((d) => d.date);
    DB.trip.days.forEach((d, i) => { d.date = '1/' + (i + 1); });
    curDay = 3;                       /* 就算不在第 0 天,沒有「今天」也不該出現 */
    renderTrip();
    const hasButton = !!document.querySelector('#view-trip .trip-back-now');
    DB.trip.days.forEach((d, i) => { d.date = saved[i]; });
    renderTrip();
    return hasButton;
  });
  expect(outside).toBe(false);
});

test('back-to-now jumps to today and positions the current stop', async ({ page }) => {
  const result = await page.evaluate(async () => {
    switchView('trip');
    const todayIndex = findToday();
    /* 先跑到別天、別的位置 */
    gotoDay(todayIndex === 0 ? 1 : 0);
    document.scrollingElement.scrollTop = 500;

    document.querySelector('#view-trip .trip-back-now').click();
    await new Promise((r) => setTimeout(r, 300));

    const day = DB.trip.days[curDay];
    const currentId = selectCurrentTripItem(day, curDay, getChecks());
    const el = currentId ? document.getElementById('it_' + currentId) : null;
    const box = el ? el.getBoundingClientRect() : null;
    return {
      curDay, todayIndex, currentId,
      inViewport: box ? box.top >= -20 && box.top <= window.innerHeight : null,
    };
  });

  expect(result.curDay).toBe(result.todayIndex);
  if (result.currentId) expect(result.inViewport).toBe(true);
});

test('back-to-now is a real, tappable, labelled control', async ({ page }) => {
  const meta = await page.evaluate(() => {
    switchView('trip');
    gotoDay(findToday() === 0 ? 1 : 0);   /* 只有離開今天那一天時才會出現 */
    const btn = document.querySelector('#view-trip .trip-back-now');
    const r = btn.getBoundingClientRect();
    return { tag: btn.tagName, type: btn.getAttribute('type'), text: btn.textContent.trim(), h: Math.round(r.height) };
  });
  expect(meta.tag).toBe('BUTTON');
  expect(meta.type).toBe('button');
  expect(meta.text).toBeTruthy();
  expect(meta.h).toBeGreaterThanOrEqual(44);
});
