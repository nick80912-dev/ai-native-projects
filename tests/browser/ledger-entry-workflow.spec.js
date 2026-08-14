const {test,expect}=require('./support/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const NOW='2026-08-08T10:00:00+08:00';

async function prepareLedger(page,records){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await page.addInitScript(seed=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_personal_ledger',JSON.stringify(seed||[]));
  },records||[]);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    closeMemberSelector();
    memberRegistrationBridge.push({id:'entry-member',time:'2026-08-08T00:00:00.000Z',member:'Bar',recordType:'identity_registration'});
    switchView('split');
  });
}

async function openEntry(page,focusAmount){
  await page.evaluate(focus=>openLedgerEntrySheet(focus),!!focusAmount);
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
}

test('create entry owns return context and restores scroll and focus on close',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page);
  const captured=await page.evaluate(()=>{
    const trigger=document.createElement('button');trigger.id='entryReturnButton';trigger.textContent='open';
    trigger.style.position='fixed';trigger.style.top='0';document.body.appendChild(trigger);trigger.focus();
    openLedgerEntrySheet(true);
    return {sessionId:ledgerUiState.entrySessionId,context:ledgerUiState.entryReturnContext};
  });
  await expect(page.locator('#ledgerAmount')).toBeFocused();
  expect(captured.sessionId).toMatch(/^ledger-entry-/);
  expect(captured.context).toMatchObject({kind:'ledger',focusId:'entryReturnButton',scrollY:0});
  await page.evaluate(()=>{
    const spacer=document.createElement('div');spacer.style.height='2000px';document.body.appendChild(spacer);
    ledgerUiState.entryReturnContext.scrollY=360;
    closeLedgerEntrySheet();
  });
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>({scrollY:Math.round(window.scrollY),focusId:document.activeElement&&document.activeElement.id}))).toEqual({scrollY:360,focusId:'entryReturnButton'});
  expect(errors).toEqual([]);
});

test('validation and persistence failure keep the live draft and unlock save controls',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page);
  await openEntry(page,false);
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerAmount')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#ledgerAmount')).toBeFocused();
  expect(await page.evaluate(()=>ledgerUiState.savePending)).toBe(false);

  await page.locator('#ledgerAmount').fill('1680');
  await page.locator('#ledgerDetail').fill('測試品項');
  await page.evaluate(()=>{
    window.__entryOriginalPersonalAdd=personalLedgerRepository.add;
    personalLedgerRepository.add=function(){throw new Error('測試持久化失敗');};
  });
  try{
    await page.locator('#ledgerSave').click();
    await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
    await expect(page.locator('#ledgerAmount')).toHaveValue('1680');
    await expect(page.locator('#ledgerDetail')).toHaveValue('測試品項');
    await expect(page.locator('#ledgerSave')).toBeEnabled();
    expect(await page.evaluate(()=>({pending:ledgerUiState.savePending,requestId:ledgerUiState.entrySaveRequestId}))).toEqual({pending:false,requestId:''});
  }finally{
    await page.evaluate(()=>{personalLedgerRepository.add=window.__entryOriginalPersonalAdd;delete window.__entryOriginalPersonalAdd;});
  }
  expect(errors).toEqual([]);
});

test('save and add another keeps the session, refreshes the dashboard, and resets the draft',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page);
  await openEntry(page,false);
  const sessionId=await page.evaluate(()=>ledgerUiState.entrySessionId);
  await page.locator('#ledgerAmount').fill('1200');
  await page.locator('#ledgerDetail').fill('車站便當');
  await page.locator('#ledgerSaveAnother').click();
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  await expect(page.locator('#ledgerAmount')).toHaveValue('');
  await expect(page.locator('#ledgerAmount')).toBeFocused();
  const state=await page.evaluate(()=>({
    sessionId:ledgerUiState.entrySessionId,
    pending:ledgerUiState.savePending,
    sourceItem:ledgerUiState.draft.sourceShoppingItemId||'',
    sourceAllocation:ledgerUiState.draft.sourceShoppingAllocationId||'',
    records:personalLedgerRepository.all().length,
    dashboardText:document.getElementById('view-split').textContent
  }));
  expect(state.sessionId).toBe(sessionId);
  expect(state.pending).toBe(false);
  expect(state.sourceItem).toBe('');
  expect(state.sourceAllocation).toBe('');
  expect(state.records).toBe(1);
  expect(state.dashboardText).toContain('車站便當');
  expect(errors).toEqual([]);
});

test('calendar crosses the year boundary and installs the selected draft date',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page);
  await openEntry(page,false);
  await page.locator('.ledger-entry-summary').click();
  await page.locator('#ledgerOccurredDate').fill('2026/12/15');
  await page.evaluate(()=>commitLedgerDateInput('2026/12/15'));
  await page.locator('.ledger-calendar-trigger').click();
  await expect(page.locator('#ledgerCalendarPopover')).toContainText('2026 年 12 月');
  await page.getByRole('button',{name:'下個月'}).click();
  await expect(page.locator('#ledgerCalendarPopover')).toContainText('2027 年 1 月');
  await page.evaluate(()=>selectLedgerCalendarDate(2027,0,5));
  await expect(page.locator('#ledgerCalendarPopover')).toHaveCount(0);
  await expect(page.locator('#ledgerOccurredDate')).toHaveValue('2027/01/05');
  expect(errors).toEqual([]);
});

test('editing uses the same session workflow without save-and-add-another',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page,[{
    id:'entry-edit',time:'2026-08-08T01:00:00.000Z',member:'Bar',category:'餐飲',detail:'原品項',
    amountJpy:900,amountTwd:180,note:'',payMethod:'現金',batchId:'',inputCurrency:'JPY'
  }]);
  await page.evaluate(()=>editLedgerRecord('entry-edit'));
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  await expect(page.locator('#ledgerSaveAnother')).toHaveCount(0);
  expect(await page.evaluate(()=>({sheet:ledgerUiState.sheet,editing:ledgerUiState.editing&&ledgerUiState.editing.originals[0].id,sessionId:ledgerUiState.entrySessionId}))).toMatchObject({sheet:'entry',editing:'entry-edit'});
  await page.locator('#ledgerAmount').fill('1300');
  await page.locator('#ledgerSave').click();
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>personalLedgerRepository.all().length)).toBe(1);
  expect(errors).toEqual([]);
});

test('stale completion cannot close or overwrite a newer entry session',async({page})=>{
  const errors=collectPageErrors(page);
  await prepareLedger(page);
  await openEntry(page,false);
  const stale=await page.evaluate(async()=>{
    const firstSession=ledgerUiState.entrySessionId,requestId='browser-stale-request';
    ledgerUiWorkflow.dispatch({type:'entry-save-requested',sessionId:firstSession,requestId:requestId});
    closeLedgerEntrySheet(false);
    openLedgerEntrySheet(false);
    const secondSession=ledgerUiState.entrySessionId;
    await Promise.resolve();
    const outcome=ledgerUiWorkflow.dispatch({
      type:'entry-save-succeeded',sessionId:firstSession,requestId:requestId,addAnother:false,
      notification:{message:'stale'}
    });
    return {changed:outcome.changed,firstSession:firstSession,secondSession:secondSession,current:ledgerUiState.entrySessionId,sheet:ledgerUiState.sheet};
  });
  expect(stale.changed).toBe(false);
  expect(stale.firstSession).not.toBe(stale.secondSession);
  expect(stale.current).toBe(stale.secondSession);
  expect(stale.sheet).toBe('entry');
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  expect(errors).toEqual([]);
});
