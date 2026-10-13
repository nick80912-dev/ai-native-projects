const {test,expect}=require('./support/test');
const {collectPageErrors,installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('診斷面板顯示並清除 session AppLog，且不再提供團體帳測試模式入口',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  await page.evaluate(()=>{
    closeMemberSelector();
    AppLog.clear();
    AppLog.repo('<b>離線失敗</b>');
    AppLog.sync('ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時');
    openDiagnostics();
  });

  const overlay=page.locator('#diagnosticOverlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('App 版本');
  await expect(overlay).toContainText('資料檢查正常');
  await expect(overlay).not.toContainText('團體帳測試模式');
  await expect(page.locator('#diagAppLogSection')).toContainText('本次開啟後 2 則');
  await expect(page.locator('#diagAppLogList')).toContainText('<b>離線失敗</b>');
  await expect(page.locator('#diagAppLogList')).toContainText('分帳快速同步暫時逾時');
  await expect(page.locator('#diagAppLogList')).toContainText('目前仍可使用 · 已改用一般 CSV 同步');
  /* v153：原文收在「技術細節」裡，展開才看得到 */
  const raw=page.locator('#diagAppLogList details code');
  await expect(raw).toHaveCount(1);
  await expect(raw).toBeHidden();
  await page.locator('#diagAppLogList details summary').click();
  await expect(raw).toHaveText('原始：ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時');
  await expect(page.locator('#diagAppLogList .diag-impact-degraded')).toHaveCount(2);
  await expect(page.locator('#diagAppLogList b')).toHaveCount(2);
  expect(await page.evaluate(()=>AppLog.snapshot().map(entry=>({category:entry.category,level:entry.level,message:entry.message})))).toEqual([
    {category:'repository',level:'warn',message:'<b>離線失敗</b>'},
    {category:'sync',level:'warn',message:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'}
  ]);

  await page.getByRole('button',{name:'清除紀錄'}).click();
  await expect(page.locator('#diagAppLogSection')).toContainText('本次開啟後 0 則');
  await expect(page.locator('#diagAppLogList')).toHaveText('尚無紀錄');
  await expect(page.getByRole('button',{name:'清除紀錄'})).toHaveCount(0);
  await expect(overlay).toBeVisible();
  expect(pageErrors).toEqual([]);
});

/* v152(Bar 2026-10-13 核准):診斷面板的「目前旅程」、完整的除錯報告、手機時間與白話訊息。 */
test.describe('v152 診斷面板',()=>{
  test.use({timezoneId:'Asia/Tokyo'});

  test('目前旅程顯示連接的旅程、保護期、行程資料與待送團體帳，報告一併帶上',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-19T10:00:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{
      closeMemberSelector();
      localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'q1'},{id:'q2'}]));
      AppLog.clear();
      AppLog.data('天氣讀取未完成；可於首頁重試。');
      window.__copied=[];
      window.copyText=function(text,label){window.__copied.push({text:text,label:label});};
      openDiagnostics();
    });
    const trip=page.locator('#diagTripSection');
    await expect(trip.locator('[data-key="trip"]')).toHaveText('岡山舊旅程（內建）');
    await expect(trip.locator('[data-key="mode"] .diag-chip.ok')).toHaveText('進行中');
    await expect(trip.locator('[data-key="grace"] .diag-chip.info')).toHaveText('進行中');
    await expect(trip.locator('[data-key="grace"]')).toContainText('到 10/24 00:00（台灣時間）');
    await expect(trip.locator('[data-key="sync"]')).toContainText('資料更新');
    await expect(trip.locator('[data-key="ledger"] .diag-chip.warn')).toHaveText('2 筆待送');
    await expect(trip.locator('[data-key="ledger"]')).toContainText('連上網路後會自動補送');
    /* v153：最上方摘要直接說出要注意什麼 */
    const summary=page.locator('#diagSummary');
    await expect(summary).toHaveClass(/diag-summary warn/);
    await expect(summary).toContainText('⚠️ 1 項需注意');
    await expect(summary).toContainText('團體帳 2 筆還沒送出，連上網路後會自動補送');
    await expect(summary).toContainText('資料檢查正常');
    const log=page.locator('#diagAppLogList');
    await expect(log).toContainText('天氣暫時讀不到');
    await expect(log).toContainText('不影響行程與分帳 · 可於首頁重試');
    await expect(log).toContainText('10/19 10:00 · 資料');
    await expect(log).not.toContainText('2026-10-19T01:00:00.000Z');
    await page.getByRole('button',{name:'複製除錯報告'}).click();
    const report=await page.evaluate(()=>window.__copied[0].text);
    expect(report).toContain('App：'+await page.evaluate(()=>APP_VERSION));
    expect(report).toContain('- 連接的旅程：岡山舊旅程（內建）');
    expect(report).toContain('- 團體帳：2 筆待送出');
    expect(report).toContain('2026-10-19T01:00:00.000Z [data] 天氣讀取未完成；可於首頁重試。');
    expect(pageErrors).toEqual([]);
  });

  test('待送團體帳屬於其他旅程時，目前旅程直接寫出已暫停送出',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-25T10:00:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{
      closeMemberSelector();
      localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'q1'}]));
      localStorage.setItem('trip_ledger_queue_owner','sheet:kyushu-2027');
      openDiagnostics();
    });
    const trip=page.locator('#diagTripSection');
    await expect(trip.locator('[data-key="ledger"] .diag-chip.bad')).toHaveText('已暫停送出');
    await expect(trip.locator('[data-key="ledger"]')).toContainText('1 筆屬於其他旅程（sheet:kyushu-2027）');
    await expect(trip.locator('[data-key="grace"] .diag-chip')).toHaveText('已結束');
    const summary=page.locator('#diagSummary');
    await expect(summary).toHaveClass(/diag-summary bad/);
    await expect(summary).toContainText('待送的團體帳屬於其他旅程，已暫停送出；請截圖給旅程負責人');
    /* 報告仍是 v152 的完整原句 */
    await page.evaluate(()=>{window.__copied=[];window.copyText=function(text){window.__copied.push(text);};});
    await page.getByRole('button',{name:'複製除錯報告'}).click();
    expect(await page.evaluate(()=>window.__copied[0])).toContain('- 團體帳：1 筆待送，已暫停送出（屬於其他旅程：sheet:kyushu-2027）');
    expect(pageErrors).toEqual([]);
  });
});

/* v153(Bar 2026-10-13 核准，並要求測試工具再濃縮):摘要在最上方、紀錄只列最新 5 則、
   測試工具預設收合、複製按鈕固定在底部、旅途紀錄搬到設定頁。 */
test.describe('v153 診斷面板重新整理',()=>{
  test.use({timezoneId:'Asia/Tokyo'});

  test('一切正常時摘要是綠色；關閉鈕 44px、Esc 關閉；複製按鈕固定在底部',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{closeMemberSelector();AppLog.clear();openDiagnostics();});
    const overlay=page.locator('#diagnosticOverlay');
    await expect(overlay.getByRole('dialog',{name:'診斷面板'})).toBeVisible();
    await expect(page.locator('#diagSummary')).toHaveClass(/diag-summary ok/);
    await expect(page.locator('#diagSummary')).toContainText('✅ 一切正常');
    await expect(page.locator('#diagShellVersion')).not.toHaveText('讀取中…');
    await expect(page.locator('#diagShellVersion')).not.toContainText('okayama-trip-');
    await expect(overlay.getByRole('dialog',{name:'診斷面板'})).toBeFocused();
    const close=page.getByRole('button',{name:'關閉診斷面板'});
    const box=await close.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    /* 內容捲動時，複製按鈕仍在面板底部可見 */
    await page.setViewportSize({width:375,height:600});
    await page.evaluate(()=>{for(let i=0;i<8;i++)AppLog.data('第 '+i+' 則測試紀錄');openDiagnostics();});
    await page.locator('#diagAppLogList').evaluate(node=>node.closest('.diag-body').scrollTop=9999);
    const copy=page.getByRole('button',{name:'複製除錯報告'});
    await expect(copy).toBeInViewport();
    const layout=await page.evaluate(()=>{
      const panel=document.querySelector('.diag-panel'),body=document.querySelector('.diag-body'),foot=document.querySelector('.diag-foot');
      return {panelBottom:panel.getBoundingClientRect().bottom,footBottom:foot.getBoundingClientRect().bottom,viewport:innerHeight,bodyScrolls:body.scrollHeight>body.clientHeight,overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth,panelOverflowX:body.scrollWidth>body.clientWidth};
    });
    expect(layout.bodyScrolls).toBe(true);
    expect(Math.round(layout.footBottom)).toBe(Math.round(layout.panelBottom));
    expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewport);
    expect(layout.overflowX).toBe(false);
    expect(layout.panelOverflowX).toBe(false);
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('紀錄最新的在上面，只列 5 則，按「顯示全部」才展開',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{
      closeMemberSelector();
      AppLog.clear();
      for(let i=1;i<=7;i++)AppLog.data('測試紀錄 '+i);
      openDiagnostics();
    });
    const entries=page.locator('#diagAppLogList .diag-log-entry');
    await expect(entries).toHaveCount(5);
    await expect(entries.first()).toContainText('測試紀錄 7');
    await expect(entries.first()).toContainText('若持續出現，請複製除錯報告給旅程負責人');
    await expect(page.locator('#diagAppLogList')).not.toContainText('測試紀錄 2');
    await expect(page.locator('#diagAppLogList')).not.toHaveCSS('overflow-y','auto');
    await page.getByRole('button',{name:'顯示全部 7 則'}).click();
    await expect(entries).toHaveCount(7);
    await expect(entries.last()).toContainText('測試紀錄 1');
    await expect(page.getByRole('button',{name:/顯示全部/})).toHaveCount(0);
    /* 重新開啟面板時回到只看最新 5 則 */
    await page.evaluate(()=>openDiagnostics());
    await expect(entries).toHaveCount(5);
    expect(pageErrors).toEqual([]);
  });

  test('測試工具預設收合；展開後一行輸入、Day 一排、結束模擬只在模擬中出現',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-13T10:00:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.setViewportSize({width:375,height:812});
    await page.evaluate(()=>{closeMemberSelector();openDiagnostics();});
    const toggle=page.getByRole('button',{name:'測試工具'});
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#diagTime')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'重置…'})).toHaveCount(0);
    await toggle.click();
    await expect(page.getByRole('button',{name:'測試工具'})).toHaveAttribute('aria-expanded','true');
    await expect(page.getByRole('button',{name:'測試工具'})).toBeFocused();
    await expect(page.locator('#diagToolsSection')).toContainText('測試用：會改變打卡與時間，旅途中請勿使用。');
    await expect(page.getByRole('button',{name:/^結束並/})).toHaveCount(0);
    const rows=await page.evaluate(()=>{
      const top=el=>Math.round(el.getBoundingClientRect().top);
      const days=Array.from(document.querySelectorAll('.diag-days button'));
      const input=document.getElementById('diagTime'),apply=document.querySelector('.diag-time-row button');
      return {dayCount:days.length,dayRows:new Set(days.map(top)).size,minDayHeight:Math.min(...days.map(el=>el.getBoundingClientRect().height)),sameRow:Math.abs(input.getBoundingClientRect().top-apply.getBoundingClientRect().top)<4};
    });
    expect(rows.dayCount).toBe(6);
    expect(rows.dayRows).toBe(1);
    expect(rows.minDayHeight).toBeGreaterThanOrEqual(44);
    expect(rows.sameRow).toBe(true);
    const tools=page.locator('#diagToolsSection');
    await tools.getByRole('button',{name:'Day 2',exact:true}).click();
    await expect(page.locator('#diagTime')).toHaveValue('2026-10-19T08:00');
    await tools.getByRole('button',{name:'套用',exact:true}).click();
    await expect(page.locator('#diagnosticOverlay')).toHaveCount(0);
    expect(await page.evaluate(()=>isTimeSimulationActive())).toBe(true);
    await page.evaluate(()=>openDiagnostics());
    await expect(page.locator('.diag-tools-toggle .diag-chip')).toHaveText('模擬中');
    await page.getByRole('button',{name:/測試工具/}).click();
    await expect(page.getByRole('button',{name:'結束並還原'})).toBeVisible();
    await expect(page.getByRole('button',{name:'結束並保留'})).toBeVisible();
    await page.getByRole('button',{name:'結束並還原'}).click();
    expect(await page.evaluate(()=>isTimeSimulationActive())).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test('旅途紀錄在設定頁：新增、篩選、改狀態都留在同一頁，時間是手機時間',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await installFixedDate(page,'2026-10-19T14:32:00+09:00');
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>{closeMemberSelector();openDiagnostics();});
    await expect(page.locator('.diag-link-row')).toContainText('記下異常或優化建議');
    await page.locator('.diag-link-row').click();
    await expect(page.locator('#diagnosticOverlay')).toHaveCount(0);
    const settings=page.locator('#settingsOverlay');
    await expect(settings.locator('#settingsTitle')).toHaveText('旅途紀錄');
    await settings.getByRole('button',{name:'異常'}).first().click();
    await expect(settings.locator('.travel-note-kind button.on')).toHaveText('異常');
    await settings.getByLabel('紀錄內容').fill('倉敷地圖連結打不開');
    await settings.getByRole('button',{name:'儲存紀錄'}).click();
    await expect(settings.locator('#settingsTitle')).toHaveText('旅途紀錄');
    const card=settings.locator('.travel-note-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('倉敷地圖連結打不開');
    await expect(card.locator('.travel-note-meta')).toHaveText(/^10\/19 14:32 · 今天 · v\d+ · 離線/);
    await expect(settings).toContainText('已記下 1 筆（1 筆待評估）');
    await settings.getByRole('button',{name:'優化建議'}).last().click();
    await expect(card).toHaveCount(0);
    await expect(settings.getByRole('button',{name:'優化建議'}).last()).toBeFocused();
    await settings.getByRole('button',{name:'全部'}).click();
    await settings.getByRole('button',{name:'標記已處理'}).click();
    await expect(card.locator('.travel-note-status')).toHaveText('已處理');
    await expect(settings).toContainText('已記下 1 筆');
    await expect(settings).not.toContainText('筆待評估');
    /* 設定根頁也有兩個入口 */
    await settings.getByRole('button',{name:'返回設定'}).click();
    await expect(settings.getByRole('button',{name:/旅途紀錄/})).toContainText('記下異常或建議');
    await settings.getByRole('button',{name:/診斷面板/}).click();
    await expect(page.locator('#settingsOverlay')).toHaveCount(0);
    await expect(page.locator('#diagnosticOverlay')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('沒有進行中的旅程時，從設定打開診斷面板仍能複製報告，但不顯示測試工具',async({page})=>{
    const pageErrors=collectPageErrors(page);
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1')return route.fallback();
      return route.abort('blockedbyclient');
    });
    await installFixedDate(page,'2026-10-24T09:00:00+08:00');
    await page.addInitScript(()=>{
      if(!sessionStorage.getItem('qa_seeded')){localStorage.clear();sessionStorage.setItem('qa_seeded','1');}
      try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
      window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
    });
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body.classList.contains('trip-inactive'));
    await page.evaluate(()=>openSettings());
    await page.locator('#settingsOverlay').getByRole('button',{name:/診斷面板/}).click();
    const overlay=page.locator('#diagnosticOverlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#diagTripSection [data-key="mode"] .diag-chip.warn')).toHaveText('尚未連接');
    await expect(page.locator('#diagSummary')).toContainText('這支手機尚未連接旅程');
    await expect(page.locator('#diagToolsSection')).toHaveCount(0);
    await expect(page.locator('.diag-link-row')).toHaveCount(0);
    await page.evaluate(()=>{window.__copied=[];window.copyText=function(text){window.__copied.push(text);};});
    await page.getByRole('button',{name:'複製除錯報告'}).click();
    expect(await page.evaluate(()=>window.__copied.length)).toBe(1);
    expect(await page.evaluate(()=>window.__copied[0])).toContain('- 旅程狀態：尚未連接');
    await page.getByRole('button',{name:'關閉診斷面板'}).click();
    await expect(overlay).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
