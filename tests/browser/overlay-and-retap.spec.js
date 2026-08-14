/* 兩個真機回報的 UI 缺陷(2026-08-03)
   ============================================================
   A. 設定 → 個人 → 目前身分 → 切換／＋ 之後,身分選擇器被設定頁蓋住。
      實測 computed z-index:settingsOverlay 170、memberOverlay 130,
      中心點 hit-test 落在 settingsOverlay。兩者都是 body 的直接子節點、
      position:fixed、display:block、visibility:visible、opacity:1、transform:none ——
      沒有 stacking context 的干擾,純粹是 z-index 反了。

   B. 再點目前所在的底部分頁時畫面會閃。實測:
        renderCurrent／renderTrip 各被呼叫 1 次、第一個 .item 節點被換掉(整份重繪)
        捲動由 488 一步跳到 0(t=2ms 仍 488,t=10ms 已 0),沒有中間值
      注意:.view.active 雖然被 remove 再 add,但兩者在同一個同步區塊內、
      中間沒有 reflow,實測 fade 動畫**不會**重新觸發(animationstart 0 次;
      刻意在中間插入 void offsetHeight 才會變成 1 次)。故閃爍來自
      「整份重繪 + 瞬間跳頂」,不是 fade。
   ============================================================ */
const { test, expect } = require('./support/test');
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

/* ================= A:身分選擇器層級 ================= */

test('the member selector sits above the settings overlay', async ({ page }) => {
  const layers = await page.evaluate(() => {
    openSettings();
    openMemberSelector(false, false);
    const s = document.getElementById('settingsOverlay');
    const m = document.getElementById('memberOverlay');
    const mid = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
    return {
      settingsZ: Number(getComputedStyle(s).zIndex),
      memberZ: Number(getComputedStyle(m).zIndex),
      settingsStillThere: !!s,
      topmostAtCenter: mid && mid.closest('#memberOverlay') ? 'member'
        : mid && mid.closest('#settingsOverlay') ? 'settings' : 'other',
    };
  });

  expect(layers.memberZ).toBeGreaterThan(layers.settingsZ);
  /* 設定頁必須留在背景,不得為了讓選擇器看得見而關掉它 */
  expect(layers.settingsStillThere).toBe(true);
  expect(layers.topmostAtCenter).toBe('member');
});

test('the add-identity field is visible and focused when opened with +', async ({ page }) => {
  const state = await page.evaluate(() => {
    openSettings();
    openMemberSelector(false, true);
    const input = document.getElementById('memberNameInput');
    const mid = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
    return {
      inputExists: !!input,
      focused: document.activeElement === input,
      topmostIsMember: !!(mid && mid.closest('#memberOverlay')),
    };
  });
  expect(state.inputExists).toBe(true);
  expect(state.topmostIsMember).toBe(true);
  expect(state.focused).toBe(true);
});

/* 注意:inert 只擋**真實**互動,程式化的 element.click() 依規格仍會派送事件,
   所以不能拿 .click() 當作「點不到」的證明。這裡改用真實指標的命中測試與焦點行為。 */
test('the settings page behind is inert: not reachable by pointer or focus', async ({ page }) => {
  const geo = await page.evaluate(() => {
    openSettings();
    const behind = document.querySelector('#settingsOverlay .settings-member-switch');
    const box = behind.getBoundingClientRect();
    openMemberSelector(false, false);
    const s = document.getElementById('settingsOverlay');
    behind.focus();
    return {
      inert: s.inert === true || s.hasAttribute('inert'),
      focusEntered: document.activeElement === behind,
      /* 真實點擊會落在誰身上 */
      hitAtButton: (() => {
        const el = document.elementFromPoint(Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2));
        return el && el.closest('#memberOverlay') ? 'member'
          : el && el.closest('#settingsOverlay') ? 'settings' : 'other';
      })(),
    };
  });
  expect(geo.inert).toBe(true);
  expect(geo.focusEntered).toBe(false);
  expect(geo.hitAtButton).toBe('member');
});

test('closing the selector restores the settings page, its scroll and the trigger focus', async ({ page }) => {
  const result = await page.evaluate(async () => {
    openSettings();
    const s = document.getElementById('settingsOverlay');
    s.scrollTop = 40;
    const scrollBefore = s.scrollTop;
    const trigger = document.querySelector('.settings-member-switch');
    trigger.focus();
    trigger.click();                       /* 走真實入口,而不是直接呼叫函式 */
    await new Promise((r) => setTimeout(r, 50));

    closeMemberSelector();
    await new Promise((r) => setTimeout(r, 50));
    const after = document.getElementById('settingsOverlay');
    return {
      settingsStillThere: !!after,
      inertCleared: !(after.inert === true || after.hasAttribute('inert')),
      scrollBefore,
      scrollAfter: after.scrollTop,
      focusBackOnTrigger: document.activeElement === document.querySelector('.settings-member-switch'),
    };
  });

  expect(result.settingsStillThere).toBe(true);
  expect(result.inertCleared).toBe(true);
  expect(result.scrollAfter).toBe(result.scrollBefore);
  expect(result.focusBackOnTrigger).toBe(true);
});

test('the settings identity label updates as soon as a switch completes', async ({ page }) => {
  const label = await page.evaluate(async () => {
    openSettings();
    const before = document.getElementById('settingsCurrentMember').textContent.trim();
    openMemberSelector(false, false);
    const other = registeredMembersForCurrentMode().filter((e) => e.name !== getCurrentMember())[0];
    if (!other) return { skipped: true };
    selectMember(other.name);
    await confirmMemberSelection(null);
    return {
      skipped: false, before,
      after: document.getElementById('settingsCurrentMember').textContent.trim(),
      expected: other.name,
      selectorClosed: !document.getElementById('memberOverlay'),
    };
  });
  if (label.skipped) return;
  expect(label.after).toBe(label.expected);
  expect(label.selectorClosed).toBe(true);
});

test('the non-settings and forced flows still work', async ({ page }) => {
  const flows = await page.evaluate(() => {
    /* 非設定頁:沒有設定頁時開選擇器仍要正常,且不得誤動 inert */
    closeSettings();
    openMemberSelector(false, false);
    const plain = {
      overlay: !!document.getElementById('memberOverlay'),
      noSettings: !document.getElementById('settingsOverlay'),
    };
    closeMemberSelector();

    /* forced:不得因為新的層級處理而失去 forced 語意 */
    openMemberSelector(true, false);
    const forced = {
      overlay: !!document.getElementById('memberOverlay'),
      isForced: memberSelectorState.forced === true,
    };
    closeMemberSelector();
    return { plain, forced };
  });
  expect(flows.plain.overlay).toBe(true);
  expect(flows.plain.noSettings).toBe(true);
  expect(flows.forced.overlay).toBe(true);
  expect(flows.forced.isForced).toBe(true);
});

/* ================= B:再點目前分頁回頂 ================= */

async function retapTrip(page) {
  return page.evaluate(async () => {
    switchView('trip');
    await new Promise((r) => setTimeout(r, 250));
    window.scrollTo({ top: 500, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 200));

    /* 展開一個面板,驗證回頂不會把它收掉 */
    const panelBtn = document.querySelector('#view-trip .qa-btn[onclick^="togglePanel"]');
    if (panelBtn) panelBtn.click();
    const openBefore = document.querySelectorAll('#view-trip [id^="pn_"].open').length;

    let renderCurrentCalls = 0, renderTripCalls = 0;
    const rc = window.renderCurrent, rt = window.renderTrip;
    window.renderCurrent = function () { renderCurrentCalls++; return rc.apply(this, arguments); };
    window.renderTrip = function () { renderTripCalls++; return rt.apply(this, arguments); };

    const view = document.getElementById('view-trip');
    const classLog = [];
    const mo = new MutationObserver((ms) => ms.forEach((m) => classLog.push(m.oldValue)));
    mo.observe(view, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    const firstItemBefore = document.querySelector('#view-trip .item');

    const samples = [];
    const t0 = performance.now();
    samples.push(Math.round(document.scrollingElement.scrollTop));
    switchView('trip');
    for (let i = 0; i < 6; i++) { await new Promise((r) => requestAnimationFrame(r)); samples.push(Math.round(document.scrollingElement.scrollTop)); }
    await new Promise((r) => setTimeout(r, 700));
    samples.push(Math.round(document.scrollingElement.scrollTop));

    mo.disconnect();
    window.renderCurrent = rc; window.renderTrip = rt;
    return {
      renderCurrentCalls, renderTripCalls,
      lostActive: classLog.some((c) => c && c.indexOf('active') < 0),
      domRebuilt: document.querySelector('#view-trip .item') !== firstItemBefore,
      openBefore, openAfter: document.querySelectorAll('#view-trip [id^="pn_"].open').length,
      samples, savedScrollY: viewUiState.trip.scrollY,
    };
  });
}

test('retapping the current tab scrolls smoothly without re-rendering', async ({ page }) => {
  const r = await retapTrip(page);

  /* 不重繪 */
  expect(r.renderCurrentCalls).toBe(0);
  expect(r.renderTripCalls).toBe(0);
  expect(r.domRebuilt).toBe(false);
  /* .view.active 不得被移除再加回 */
  expect(r.lostActive).toBe(false);
  /* 展開的面板保持展開 */
  expect(r.openAfter).toBe(r.openBefore);
  /* 真的回到頂端,而且保存值同步歸零 */
  expect(r.samples[r.samples.length - 1]).toBeLessThanOrEqual(2);
  expect(r.savedScrollY).toBe(0);
  /* 平滑而非瞬間:中間必須量得到過渡值 */
  const mid = r.samples.slice(1, -1);
  expect(mid.some((v) => v > 2 && v < r.samples[0])).toBe(true);
});

test('today and shop retaps do not re-render either', async ({ page }) => {
  for (const view of ['today', 'shop']) {
    const r = await page.evaluate(async (v) => {
      switchView(v);
      await new Promise((res) => setTimeout(res, 250));
      window.scrollTo({ top: 300, behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 150));
      let calls = 0;
      const rc = window.renderCurrent;
      window.renderCurrent = function () { calls++; return rc.apply(this, arguments); };
      switchView(v);
      await new Promise((res) => setTimeout(res, 700));
      window.renderCurrent = rc;
      return { calls, top: Math.round(document.scrollingElement.scrollTop), saved: viewUiState[v].scrollY };
    }, view);
    expect(r.calls, view).toBe(0);
    expect(r.top, view).toBeLessThanOrEqual(2);
    expect(r.saved, view).toBe(0);
  }
});

test('reduced motion gets an instant jump instead of a smooth scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const r = await page.evaluate(async () => {
    switchView('trip');
    await new Promise((res) => setTimeout(res, 250));
    window.scrollTo({ top: 500, behavior: 'instant' });
    await new Promise((res) => setTimeout(res, 200));
    const before = Math.round(document.scrollingElement.scrollTop);
    switchView('trip');
    await new Promise((res) => requestAnimationFrame(res));
    await new Promise((res) => requestAnimationFrame(res));
    return { before, soonAfter: Math.round(document.scrollingElement.scrollTop) };
  });
  expect(r.before).toBeGreaterThan(100);
  /* 減少動態時應立刻到頂,而不是慢慢捲 */
  expect(r.soonAfter).toBeLessThanOrEqual(2);
});

test('the split contract is preserved', async ({ page }) => {
  const r = await page.evaluate(async () => {
    switchView('split');
    await new Promise((res) => setTimeout(res, 250));
    /* 次層頁:再點分帳先回 dashboard */
    ledgerUiState.page = 'history';
    switchView('split');
    const afterSubpage = ledgerUiState.page;

    /* dashboard:再點才回頂 */
    window.scrollTo({ top: 300, behavior: 'instant' });
    await new Promise((res) => setTimeout(res, 200));
    const before = Math.round(document.scrollingElement.scrollTop);
    switchView('split');
    await new Promise((res) => setTimeout(res, 700));
    return { afterSubpage, before, after: Math.round(document.scrollingElement.scrollTop), saved: viewUiState.split.scrollY };
  });
  expect(r.afterSubpage).toBe('dashboard');
  expect(r.after).toBeLessThanOrEqual(2);
  expect(r.saved).toBe(0);
});

test('explicit intents are not swallowed by the retap shortcut', async ({ page }) => {
  const r = await page.evaluate(async () => {
    switchView('trip');
    await new Promise((res) => setTimeout(res, 250));
    const day = DB.trip.days[findToday()];
    const target = day.items.filter((it) => it.act || it.place).slice(-1)[0];
    /* 已經在行程頁,再帶 intent 進來:必須定位該 item,而不是被回頂攔截 */
    openTripItem(findToday(), target.id);
    await new Promise((res) => setTimeout(res, 400));
    const el = document.getElementById('it_' + target.id);
    const box = el.getBoundingClientRect();
    return { inViewport: box.top >= -10 && box.top <= window.innerHeight, scrollTop: Math.round(document.scrollingElement.scrollTop) };
  });
  expect(r.inViewport).toBe(true);
});
