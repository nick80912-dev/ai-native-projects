/* v114 身分牆:從「連網就被擋住且退不出去」改為「沒有身分也能用,要記帳時才問」。
   ============================================================
   2026-09-10 A/B 實測的舊行為(v113):
     封鎖 CSV(等同離線,不會有成功同步)→ 全程沒有 overlay
     正常連網(同步完成)→ 在「今天」頁、零互動下 overlay 出現且 forced=true
   觸發點是快照套用成功後的 refreshMemberSelector(),不是 boot、也不是進入分帳。
   forced 模式不渲染 × 關閉鈕,所以使用者退不出來;switchView 又直接 return,
   分頁不會切,完成選擇後也落回原分頁。
   ============================================================ */
const { test, expect } = require('./support/test');
const {
  collectPageErrors,
  installFixedDate,
  installOnlineSheetMock,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

/* fixture 預設會塞 trip_member='Bar';本規格要測的正是「沒有身分」,所以清掉。 */
async function withoutIdentity(page) {
  await page.addInitScript(() => {
    try { localStorage.removeItem('trip_member'); } catch (ignore) {}
  });
}

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T13:30:00+09:00');
  await installOnlineSheetMock(page);
  await withoutIdentity(page);
});

test('a completed sync no longer forces the identity wall open', async ({ page }) => {
  const errors = collectPageErrors(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  const state = await page.evaluate(() => ({
    member: getCurrentMember(),
    view: curView,
    overlay: !!document.getElementById('memberOverlay'),
    source: typeof SRC !== 'undefined' && SRC ? Object.values(SRC)[0] : null,
  }));
  expect(state.member).toBe('');            /* 確實沒有身分,否則這個測試沒有意義 */
  expect(state.source).toBe('online');      /* 確實跑完了一次成功同步 */
  expect(state.view).toBe('today');
  expect(state.overlay).toBe(false);        /* 舊行為在這裡會是 true */
  expect(errors).toEqual([]);
});

test('refreshMemberSelector only repaints an open selector, it never opens one', async ({ page }) => {
  await openApp(page);
  await waitForSyncToSettle(page);
  const result = await page.evaluate(() => {
    /* 關著時呼叫:不得憑空開出來 */
    refreshMemberSelector();
    const closedStays = !document.getElementById('memberOverlay');
    /* 開著時呼叫:必須重繪,不得關掉 */
    openMemberSelector(false);
    refreshMemberSelector();
    const openStays = !!document.getElementById('memberOverlay');
    closeMemberSelector();
    return { closedStays, openStays };
  });
  expect(result.closedStays).toBe(true);
  expect(result.openStays).toBe(true);
});

test('entering the ledger tab asks for an identity but stays cancellable', async ({ page }) => {
  await openApp(page);
  await waitForSyncToSettle(page);
  const opened = await page.evaluate(() => {
    switchView('split');
    const overlay = document.getElementById('memberOverlay');
    return {
      overlay: !!overlay,
      forced: memberSelectorState.forced,
      hasClose: !!(overlay && overlay.querySelector('.settings-close')),
      view: curView,
    };
  });
  expect(opened.overlay).toBe(true);
  expect(opened.forced).toBe(false);   /* 舊行為是 true → 不渲染 × */
  expect(opened.hasClose).toBe(true);
  expect(opened.view).toBe('today');

  const closed = await page.evaluate(() => {
    document.getElementById('memberOverlay').querySelector('.settings-close').click();
    return { overlay: !!document.getElementById('memberOverlay'), view: curView };
  });
  expect(closed.overlay).toBe(false);
  expect(closed.view).toBe('today');   /* 取消就留在原地,不被丟去別處 */
});

test('confirming an identity continues to the ledger tab the user asked for', async ({ page }) => {
  await openApp(page);
  await waitForSyncToSettle(page);
  const landed = await page.evaluate(async () => {
    /* 只隔離「確認之後往哪裡去」,不牽動身分建立與同步的既有實作 */
    window.confirmIdentitySwitchWithOpenSettlements = () => true;
    window.commitMemberCandidate = candidate => {
      /* 真實實作會寫入 localStorage 並在 Ledger 建立一筆身分註冊紀錄,
         讓 memberIsAllowed() 之後回 true;替身補上等效結果,不牽動 repository 與同步。 */
      localStorage.setItem('trip_member', candidate.name);
      window.memberIsAllowed = name => String(name || '').trim() === candidate.name;
      return Promise.resolve({ ok: true });
    };
    switchView('split');
    memberSelectorState.candidate = { name: '測試員', isNew: true };
    memberSelectorState.stage = 'confirm';
    await confirmMemberSelection();
    await new Promise(r => setTimeout(r, 200));
    return { view: curView, overlay: !!document.getElementById('memberOverlay') };
  });
  expect(landed.overlay).toBe(false);
  expect(landed.view).toBe('split');   /* 舊行為會留在 today,使用者得再點一次 */
});

test('cancelling drops the pending destination instead of hijacking a later switch', async ({ page }) => {
  await openApp(page);
  await waitForSyncToSettle(page);
  const after = await page.evaluate(async () => {
    window.confirmIdentitySwitchWithOpenSettlements = () => true;
    window.commitMemberCandidate = candidate => {
      /* 真實實作會寫入 localStorage 並在 Ledger 建立一筆身分註冊紀錄,
         讓 memberIsAllowed() 之後回 true;替身補上等效結果,不牽動 repository 與同步。 */
      localStorage.setItem('trip_member', candidate.name);
      window.memberIsAllowed = name => String(name || '').trim() === candidate.name;
      return Promise.resolve({ ok: true });
    };
    switchView('split');                                   /* 產生待前往的分帳 */
    document.getElementById('memberOverlay').querySelector('.settings-close').click();
    /* 之後從設定頁換身分,不該被莫名帶去分帳 */
    openMemberSelector(false);
    memberSelectorState.candidate = { name: '測試員', isNew: true };
    memberSelectorState.stage = 'confirm';
    await confirmMemberSelection();
    await new Promise(r => setTimeout(r, 200));
    return { view: curView };
  });
  expect(after.view).toBe('today');
});

test('forced mode is still available for operations that genuinely require an identity', async ({ page }) => {
  await openApp(page);
  await waitForSyncToSettle(page);
  const forced = await page.evaluate(() => {
    openMemberSelector(true);
    const overlay = document.getElementById('memberOverlay');
    const state = {
      overlay: !!overlay,
      forced: memberSelectorState.forced,
      hasClose: !!(overlay && overlay.querySelector('.settings-close')),
    };
    closeMemberSelector();
    return state;
  });
  expect(forced.overlay).toBe(true);
  expect(forced.forced).toBe(true);
  expect(forced.hasClose).toBe(false);  /* forced 仍刻意沒有 × —— 送出記帳、結算等守門不變 */
});
