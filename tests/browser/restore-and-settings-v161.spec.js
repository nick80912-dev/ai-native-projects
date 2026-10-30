/* v161(Bar 2026-10-30,回程後第二批)
   ============================================================
   L1 「從 JSON 還原」「手動複製備份」從設定頁開啟時被設定頁蓋住(z-index 140 < 170),看不到也點不到。
   L2 還原直接覆蓋目前的個人帳與待送團體帳,沒有確認;沒送出的團體帳會讓全團都找不回來。
   B2 分帳設定橋接只在發布值完全相同時才清掉:儲存失敗或別台手機改過,這台就一直用自己的匯率,
      清除旅程的預檢也一直被「待同步」擋住。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''});

async function openDataSettings(page,width){
  await page.setViewportSize({width:width||390,height:780});
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(members=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=members;openSettings();},['Bar','Amy'].map(identity));
  await page.locator('#settingsOverlay').getByRole('button',{name:/資料與版本/}).click();
}
/* 對話框按鈕的中心點真的落在對話框上(不是被設定頁蓋住) */
async function hitsDialog(locator){
  return locator.evaluate(element=>{const box=element.getBoundingClientRect(),hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return !!hit&&!!hit.closest('#personalStateDialog');});
}

for(const width of [320,390]){
  test('L1 the restore dialog opened from Settings is on top and usable at '+width+'px',async({page})=>{
    await openDataSettings(page,width);
    await page.locator('#settingsOverlay').getByRole('button',{name:'從 JSON 還原',exact:true}).click();
    const dialog=page.locator('#personalStateDialog');
    await expect(dialog).toBeVisible();
    expect(await hitsDialog(dialog.getByRole('button',{name:'驗證並還原'}))).toBe(true);
    expect(await hitsDialog(dialog.locator('#personalStateBox'))).toBe(true);
    await expect(dialog.locator('#personalStateBox')).toBeFocused();
  });
}

test('L1 the manual-copy fallback is on top when the clipboard is denied',async({page})=>{
  await openDataSettings(page);
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});});
  await page.locator('#settingsOverlay').getByRole('button',{name:'複製備份 JSON',exact:true}).click();
  const dialog=page.locator('#personalStateDialog[data-dialog-kind="copy-fallback"]');
  await expect(dialog).toBeVisible();
  expect(await hitsDialog(dialog.locator('#personalStateBox'))).toBe(true);
  expect(JSON.parse(await dialog.locator('#personalStateBox').inputValue()).format).toBe('trip-personal-state');
});

async function backupNow(page){
  return page.evaluate(()=>personalStateJson());
}
test('L2 restoring asks first, lists what disappears, and cancelling keeps everything',async({page})=>{
  await openDataSettings(page);
  const backup=await backupNow(page);
  await page.evaluate(()=>personalLedgerRepository.add({member:'Bar',category:'餐飲',detail:'拉麵',amountJpy:7777,amountTwd:1633,note:'',payMethod:'現金',inputCurrency:'JPY'}));
  await page.locator('#settingsOverlay').getByRole('button',{name:'從 JSON 還原',exact:true}).click();
  await page.locator('#personalStateBox').fill(backup);
  const dialogs=[];let answer=false;
  page.on('dialog',dialog=>{dialogs.push(dialog.message());answer?dialog.accept():dialog.dismiss();});
  await page.getByRole('button',{name:'驗證並還原'}).click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0]).toBe('還原會用這份備份取代這支手機目前的打卡、想逛、採買、個人帳與設定。\n目前有 1 筆個人帳 不在備份裡，還原後會消失。\n確定要還原嗎？');
  expect(await page.evaluate(()=>personalLedgerRepository.all().map(r=>r.amountJpy))).toEqual([7777]);
  await expect(page.locator('#personalStateDialog')).toBeVisible();
  answer=true;
  await page.getByRole('button',{name:'驗證並還原'}).click();
  await expect(page.locator('#personalStateDialog')).toHaveCount(0);
  expect(await page.evaluate(()=>personalLedgerRepository.all().length)).toBe(0);
});

test('L2 a backup that would drop unsent group records is refused',async({page})=>{
  await openDataSettings(page);
  const backup=await backupNow(page);
  /* 離線記一筆團體帳,留在待送佇列 */
  await page.evaluate(()=>ledgerRepository.enqueueBatch([{member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:8888,amountTwd:1866,note:'',participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense',inputCurrency:'JPY'}]));
  await expect.poll(()=>page.evaluate(()=>ledgerRepository.pendingCount())).toBe(1);
  await page.locator('#settingsOverlay').getByRole('button',{name:'從 JSON 還原',exact:true}).click();
  await page.locator('#personalStateBox').fill(backup);
  const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.type()+': '+dialog.message());dialog.accept();});
  await page.getByRole('button',{name:'驗證並還原'}).click();
  await expect.poll(()=>dialogs.length).toBe(1);
  expect(dialogs[0]).toBe('alert: 還有 1 筆團體帳尚未送出，還原會刪掉它們。\n請連上網路，等它們送出後再還原。');
  expect(await page.evaluate(()=>ledgerRepository.queuedRecords().map(r=>r.amountJpy))).toEqual([8888]);
});

test('B2 an old unconfirmed exchange rate stops blocking and stops being used',async({page})=>{
  await openDataSettings(page);
  const result=await page.evaluate(()=>{
    const published=normalizeLedgerSettings(DB.cfg);
    localStorage.setItem(LEDGER_SETTINGS_BRIDGE_KEY,JSON.stringify({exchangeRate:0.25,defaultCurrency:published.defaultCurrency,status:'unconfirmed',savedAt:Date.now()-60*1000}));
    const fresh={rate:currentLedgerSettings().exchangeRate,kept:reconcileLedgerSettingsBridge()===false,pending:tripLocalPending().bridgeCounts.settings};
    localStorage.setItem(LEDGER_SETTINGS_BRIDGE_KEY,JSON.stringify({exchangeRate:0.25,defaultCurrency:published.defaultCurrency,status:'unconfirmed',savedAt:Date.now()-11*60*1000}));
    const stale={removed:reconcileLedgerSettingsBridge(),rate:currentLedgerSettings().exchangeRate,published:published.exchangeRate,pending:tripLocalPending().bridgeCounts.settings};
    return {fresh,stale};
  });
  expect(result.fresh).toEqual({rate:0.25,kept:true,pending:1});
  expect(result.stale.removed).toBe(true);
  expect(result.stale.rate).toBe(result.stale.published);
  expect(result.stale.pending).toBe(0);
});

test('B2 the ledger settings page says when the last change was not confirmed',async({page})=>{
  await openDataSettings(page);
  await page.evaluate(()=>{const p=normalizeLedgerSettings(DB.cfg);localStorage.setItem(LEDGER_SETTINGS_BRIDGE_KEY,JSON.stringify({exchangeRate:0.25,defaultCurrency:p.defaultCurrency,status:'unconfirmed',savedAt:Date.now()}));openSettings('ledger');});
  await expect(page.locator('#settingsOverlay .settings-warning-note')).toHaveText('上次修改沒有確認送達雲端。連上網路後請再按一次儲存；10 分鐘內沒有同步，會改用雲端的設定。');
  await page.evaluate(()=>{localStorage.removeItem(LEDGER_SETTINGS_BRIDGE_KEY);openSettings('ledger');});
  await expect(page.locator('#settingsOverlay .settings-warning-note')).toHaveCount(0);
});
