/* v189 資料健康的團體帳待送只算目前模式(backlog #52)
   ============================================================
   Bar 2026-11-13 選「只算目前模式」:正式模式只算正式紀錄、測試模式只算 [TEST] 紀錄,與帳本畫面一致;
   測試模式下標題加註「（測試模式）」。送出、foreign 暫停與保護邏輯不變(foreign 照舊看整個佇列)。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

async function boot(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
}
const record=(id,test)=>({id,time:'2026-10-19T03:00:00.000Z',member:'Bar',category:'餐飲',detail:(test?'[TEST] ':'')+'拉麵',amountJpy:1000,amountTwd:210,note:'',participants:'["Bar"]',payMethod:'現金',recordType:'expense'});

test('the backlog helper counts only the current mode',async({page})=>{
  await boot(page);
  const counts=await page.evaluate(([a,b,c])=>[ledgerBacklogForMode([a,b,c],[a],false),ledgerBacklogForMode([a,b,c],[a],true)],[record('a',false),record('b',true),record('c',true)]);
  expect(counts).toEqual([{pending:1,bridge:1,testMode:false},{pending:2,bridge:0,testMode:true}]);
});

test('the health page shows the normal backlog in normal mode and the test backlog, labelled, in test mode',async({page})=>{
  await boot(page);
  await page.evaluate(([a,b,c])=>{
    localStorage.setItem(LEDGER_QUEUE_KEY,JSON.stringify([a,b,c]));
    localStorage.setItem('trip_ledger_test_mode','false');
  },[record('n1',false),record('t1',true),record('t2',true)]);
  const shared=()=>page.evaluate(()=>settingsDataHealthModel().rows.find(r=>r.key==='shared'));
  expect(await shared()).toMatchObject({label:'團體帳',value:'1 筆待送出'});
  await page.evaluate(()=>localStorage.setItem('trip_ledger_test_mode','true'));
  expect(await shared()).toMatchObject({label:'團體帳（測試模式）',value:'2 筆待送出'});
  expect((await shared()).detail).toContain('只算測試模式的紀錄');
  /* 畫面上看得到 */
  await page.evaluate(()=>openSettings('health'));
  await expect(page.locator('.settings-data-health')).toContainText('團體帳（測試模式）');
  await expect(page.locator('.settings-data-health')).toContainText('2 筆待送出');
  /* 佇列本身沒被動到:三筆都還在 */
  expect(await page.evaluate(()=>ledgerRepository.pendingCount())).toBe(3);
});
