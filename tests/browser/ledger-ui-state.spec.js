const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const WIDTHS=[{width:320,height:700},{width:375,height:844},{width:390,height:844}];
const NOW='2026-08-03T10:00:00+08:00';

async function installLedgerFixtures(page){
  await page.addInitScript(()=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_personal_ledger',JSON.stringify([
      {id:'ui-food',time:'2026-08-03T01:00:00.000Z',member:'Bar',category:'餐飲',detail:'拉麵',amountJpy:1200,amountTwd:240,note:'晚餐',payMethod:'現金',isProxy:false,isTaxFree:false},
      {id:'ui-shop',time:'2026-08-03T02:00:00.000Z',member:'Bar',category:'採買',detail:'藥妝',amountJpy:800,amountTwd:160,note:'',payMethod:'信用卡',isProxy:true,proxyTarget:'Amy',isTaxFree:true}
    ]));
  });
}

test('Ledger history state workflow preserves UI behavior and reset invariants',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await installLedgerFixtures(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();switchView('split');showLedgerFullList();});

  await expect(page.locator('#ledgerHistorySearch')).toBeVisible();
  await page.locator('#ledgerHistorySearch').fill('藥妝');
  await expect(page.locator('#ledgerHistoryResults .ledger-recent-row')).toHaveCount(1);

  const panelContinuity=await page.evaluate(()=>{
    const input=document.getElementById('ledgerHistorySearch');input.focus();
    toggleLedgerHistoryFilters();
    return {
      sameInput:input===document.getElementById('ledgerHistorySearch'),
      focused:document.activeElement===input,
      open:ledgerUiState.historyFiltersOpen,
      expanded:document.getElementById('ledgerHistoryFilterButton').getAttribute('aria-expanded'),
      panelHidden:document.getElementById('ledgerHistoryFilterPanel').hidden
    };
  });
  expect(panelContinuity).toEqual({sameInput:true,focused:true,open:true,expanded:'true',panelHidden:false});

  const category=await page.locator('[data-history-filter="setLedgerHistoryCategory"]').first().getAttribute('data-history-value');
  await page.evaluate(value=>setLedgerHistoryCategory(value),category);
  await page.evaluate(()=>setLedgerHistoryGrouping('category'));
  await expect(page.locator('[data-history-group="category"]')).toHaveClass(/on/);

  const selected=await page.evaluate(()=>{
    setLedgerHistorySearch('');
    clearLedgerHistoryFilters();
    enterLedgerSelectionMode();
    const visible=ledgerSelectionVisibleRecords().map(record=>record.id);
    toggleLedgerRecordSelection(visible[0]);
    const afterOne=Object.keys(ledgerUiState.selectedRecordIds).sort();
    toggleLedgerSelectAll();
    const afterAll=Object.keys(ledgerUiState.selectedRecordIds).sort();
    toggleLedgerSelectAll();
    const afterNone=Object.keys(ledgerUiState.selectedRecordIds).sort();
    return {visible:visible.sort(),afterOne,afterAll,afterNone,selectionMode:ledgerUiState.selectionMode};
  });
  expect(selected.afterOne).toHaveLength(1);
  expect(selected.afterAll).toEqual(selected.visible);
  expect(selected.afterNone).toEqual([]);
  expect(selected.selectionMode).toBe(true);

  const closed=await page.evaluate(()=>{
    setLedgerHistorySearch('保留到關閉前');
    setLedgerHistoryProxy('proxy');
    setLedgerHistoryTaxExempt('tax-exempt');
    setLedgerHistoryGrouping('category');
    closeLedgerFullList();
    return {
      page:ledgerUiState.page,query:ledgerUiState.historyQuery,proxy:ledgerUiState.historyProxy,
      tax:ledgerUiState.historyTaxExempt,grouping:ledgerUiState.historyGrouping,
      selectionMode:ledgerUiState.selectionMode,selected:ledgerUiState.selectedRecordIds
    };
  });
  expect(closed).toEqual({page:'dashboard',query:'',proxy:'all',tax:'all',grouping:'date',selectionMode:false,selected:{}});

  const switched=await page.evaluate(()=>{
    ledgerUiState.expandedBatches={'stale-batch':true};
    enterLedgerSelectionMode();
    setLedgerTrack('shared');
    return {
      track:ledgerUiState.track,page:ledgerUiState.page,displayCurrency:ledgerUiState.displayCurrency,
      selectionMode:ledgerUiState.selectionMode,selected:ledgerUiState.selectedRecordIds,expanded:ledgerUiState.expandedBatches,
      proxy:ledgerUiState.historyProxy
    };
  });
  expect(switched).toEqual({track:'shared',page:'dashboard',displayCurrency:'',selectionMode:false,selected:{},expanded:{},proxy:'all'});

  await page.evaluate(()=>{setLedgerTrack('personal');showLedgerFullList();});
  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    const geometry=await page.evaluate(()=>{
      const root=document.documentElement,view=document.getElementById('view-split'),controls=document.querySelector('.ledger-history-controls');
      return {
        documentOverflow:root.scrollWidth>root.clientWidth,
        viewOverflow:view.scrollWidth>view.clientWidth,
        controlsOverflow:controls.scrollWidth>controls.clientWidth
      };
    });
    expect(geometry,`Ledger history @${viewport.width}`).toEqual({documentOverflow:false,viewOverflow:false,controlsOverflow:false});
  }
  expect(errors).toEqual([]);
});
