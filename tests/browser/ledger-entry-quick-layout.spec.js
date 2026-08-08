const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const NOW='2026-08-08T10:00:00+08:00';

async function prepareEntry(page,width){
  if(width)await page.setViewportSize({width:width,height:844});
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await page.addInitScript(()=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_personal_ledger','[]');
  });
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    closeMemberSelector();
    ['Bar','Jane','Mark','David','黃柏'].forEach((member,index)=>memberRegistrationBridge.push({
      id:'quick-layout-member-'+index,time:'2026-08-08T00:00:00.000Z',member:member,recordType:'identity_registration'
    }));
    switchView('split');
    openLedgerEntrySheet(false);
  });
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
}

test('group entry keeps member chips behind one accessible compact summary',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareEntry(page,390);
  await page.evaluate(()=>setLedgerDraftTrack('shared'));

  const summary=page.locator('#ledgerParticipantsToggle');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('aria-expanded','false');
  await expect(summary).toContainText('分攤成員');
  await expect(summary).toContainText('全員 5 人');
  await expect(page.locator('#ledgerParticipants')).toBeHidden();

  await page.locator('#ledgerDetail').focus();
  await page.locator('#ledgerDetail').press('Enter');
  await expect(summary).toBeFocused();

  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#ledgerParticipants')).toBeVisible();
  await expect(page.locator('#ledgerParticipants .ledger-participant-choice')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('personal entry uses one optional-information disclosure and preserves proxy behavior',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareEntry(page,390);
  await page.evaluate(()=>setLedgerDraftTrack('personal'));

  await expect(page.locator('#ledgerProxy')).toBeVisible();
  await expect(page.locator('#ledgerProxyTargets')).toHaveCount(0);
  await page.locator('#ledgerProxy').check();
  await expect(page.locator('#ledgerProxyTargets')).toBeVisible();

  const optional=page.locator('#ledgerOptionalSummary');
  await expect(optional).toContainText('其他資訊（選填）');
  await expect(page.locator('#ledgerEntrySummaryText')).toHaveText('今天 · 餐飲 · 現金 · 無備註');
  await expect(page.locator('.ledger-sheet > .ledger-disclosure')).toHaveCount(0);

  await optional.click();
  for(const selector of ['#ledgerStoreName','#ledgerOccurredDate','#ledgerOccurredTime','#ledgerDiscount','#ledgerNote']){
    await expect(page.locator(selector)).toBeVisible();
  }
  await expect(page.getByText('價格方式',{exact:true})).toBeVisible();
  await expect(page.getByText('稅率',{exact:true})).toBeVisible();
  await expect(page.locator('#ledgerSaveAnother')).toHaveClass(/ledger-save-another-quiet/);
  expect(errors).toEqual([]);
});

for(const width of [320,375,390]){
  test(width+'px keeps collapsed and expanded quick-entry states free of horizontal overflow',async({page})=>{
    const errors=collectPageErrors(page);
    await prepareEntry(page,width);
    await page.evaluate(()=>setLedgerDraftTrack('shared'));

    const measure=()=>page.locator('.ledger-sheet').evaluate(node=>({
      clientWidth:node.clientWidth,
      scrollWidth:node.scrollWidth,
      documentClient:document.documentElement.clientWidth,
      documentScroll:document.documentElement.scrollWidth
    }));
    let size=await measure();
    expect(size.scrollWidth).toBe(size.clientWidth);
    expect(size.documentScroll).toBe(size.documentClient);

    await page.locator('#ledgerParticipantsToggle').click();
    await page.locator('#ledgerOptionalSummary').click();
    size=await measure();
    expect(size.scrollWidth).toBe(size.clientWidth);
    expect(size.documentScroll).toBe(size.documentClient);
    expect(errors).toEqual([]);
  });
}
