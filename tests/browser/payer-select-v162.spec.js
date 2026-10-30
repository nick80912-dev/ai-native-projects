/* v162(Bar 2026-10-30 回報):團體帳選付款人時跳出選擇器,選完後選擇器又跳出一次。
   原因:選了就整張表單重畫,並把焦點還給「新的」付款人選單;手機上對 select 呼叫 focus()
   會再打開一次選擇器。現在只改下面那行說明文字,選單本身不重建、也不被程式重新聚焦。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''});

async function openGroupForm(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(m=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;switchView('split');openLedgerEntrySheet(false);},['Bar','Amy','Ken'].map(identity));
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'團體'}).click();
}

test('choosing a payer keeps the same select and never re-focuses it',async({page})=>{
  await openGroupForm(page);
  const payer=page.locator('#ledgerPayer');
  /* 手機上點選單就會讓它取得焦點;在這之後才開始記錄程式造成的 focus */
  await payer.focus();
  await page.evaluate(()=>{window.__select=document.getElementById('ledgerPayer');window.__refocus=0;
    document.addEventListener('focusin',event=>{if(event.target.tagName==='SELECT')window.__refocus++;},true);});
  await payer.selectOption('Amy');
  await expect(page.locator('#ledgerEntrySheet .ledger-payer-note')).toHaveText('會標示「Bar 代記」，之後由 Amy 修改');
  expect(await page.evaluate(()=>({same:document.getElementById('ledgerPayer')===window.__select,refocus:window.__refocus,payer:ledgerUiState.draft.payer})))
    .toEqual({same:true,refocus:0,payer:'Amy'});
  await payer.selectOption('');
  await expect(page.locator('#ledgerEntrySheet .ledger-payer-note')).toHaveText('別人付的，請改選付款人');
  expect(await page.evaluate(()=>window.__refocus)).toBe(0);
});

test('the chosen payer survives later redraws and is saved',async({page})=>{
  await openGroupForm(page);
  await page.locator('#ledgerPayer').selectOption('Ken');
  /* 改其他欄位會重畫表單:付款人仍是 Ken,選單也不會被重新聚焦 */
  await page.locator('#ledgerPayer').focus();
  await page.evaluate(()=>{window.__refocus=0;document.addEventListener('focusin',event=>{if(event.target.tagName==='SELECT')window.__refocus++;},true);withLedgerSheetPosition(renderLedgerEntrySheet);});
  await expect(page.locator('#ledgerPayer')).toHaveValue('Ken');
  expect(await page.evaluate(()=>window.__refocus)).toBe(0);
  await page.locator('#ledgerAmount').fill('600');
  await page.locator('#ledgerDetail').fill('咖啡');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>{const r=ledgerRepository.queuedRecords().filter(item=>item.detail==='咖啡')[0];return [r.member,r.note];})).toEqual(['Ken','〔Bar 代記〕']);
});
