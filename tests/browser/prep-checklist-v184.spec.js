/* v184 行前清單與頂端紙飛機
   ============================================================
   Bar 2026-11-10：「希望增加行前的待辦事項或是注意事項清單」，選「試算表寫、各自勾」並「提供 App 也可以自己新增」；
   首頁嫌長，選「B 進度條」。岡山桃子換成「C 金黃底＋深色飛機」，要有顏色且置中。
   - TripConfig 的 Checklist GID 指向「行前清單」分頁（類型、項目、說明、期限）；類型「注意」只顯示，其餘是待辦。
   - 勾選與自己新增的待辦只存在手機（trip_prep_state，依旅程分開）。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,date){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,date||'2026-10-21T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(m=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    localStorage.removeItem(LEDGER_SETTINGS_BRIDGE_KEY);
    switchView('split');
  },[identity('Bar'),identity('Amy')]);
}
async function openPersonalForm(page,multi){
  await page.evaluate(()=>openLedgerEntrySheet(false));
  await page.locator('#ledgerEntrySheet .ledger-entry-context').click();   // v183:帳本與幣別收成一行,先點開
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
  if(multi)await page.evaluate(()=>setLedgerDraftMulti(true));
}
const CSV=['類型,項目,說明,期限','待辦,訂租車,ORIX 岡山機場店,2026-10-01','待辦,買旅平險,,10/15',',換日幣,先換 5 萬,','注意,退稅要帶護照,出境時海關確認,','待辦,,沒有項目的列略過,','待辦,訂租車,重複的略過,'].join('\n');

test('the checklist sheet is parsed: notes, todos, due dates, blanks and duplicates',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  const parsed=await page.evaluate(csv=>parsePrepChecklistCsv(csv),CSV);
  expect(parsed.items.map(item=>[item.type,item.title,item.due])).toEqual([['todo','訂租車','10/1'],['todo','買旅平險','10/15'],['todo','換日幣',''],['note','退稅要帶護照','']]);
  expect(parsed.skipped).toBe(2);
});

test('the pre-trip home shows a progress row that opens the checklist; ticks and own items stay on the phone',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  /* 離線測試環境把 fetch 換成一律失敗;這裡只讓「行前清單」分頁回 CSV */
  await page.evaluate(async csv=>{
    const offline=window.fetch;
    window.fetch=input=>/output=csv&gid=555&_ts=\d+$/.test(String(input))?Promise.resolve(new Response(csv,{status:200,headers:{'Content-Type':'text/csv'}})):offline(input);
    DB.cfg.checklistGid='555';await refreshPrepChecklist();switchView('today');renderToday();
  },CSV);
  const row=page.locator('#view-today .prep-progress-row');
  await expect(row).toContainText('行前準備');
  await expect(row).toContainText('0/3 ›');
  /* 進度條在採買清單與完整行程那一列上方，兩顆按鈕同一列 */
  const layout=await page.evaluate(()=>{const row=document.querySelector('.prep-progress-row').getBoundingClientRect(),buttons=[...document.querySelectorAll('.today-hero .today-hero-actions button')].map(b=>b.getBoundingClientRect());return {above:row.bottom<=buttons[0].top,oneRow:buttons.length===2&&Math.abs(buttons[0].top-buttons[1].top)<2};});
  expect(layout).toEqual({above:true,oneRow:true});
  await row.click();
  const sheet=page.locator('#ledgerInfoSheet');
  await expect(sheet.locator('#ledgerInfoTitle')).toHaveText('行前清單');
  await expect(sheet.locator('.prep-row')).toHaveCount(3);
  await expect(sheet.locator('.prep-row').first()).toContainText('10/1 前');
  await expect(sheet.locator('.prep-notes li')).toHaveText(['退稅要帶護照出境時海關確認']);
  await sheet.locator('.prep-row').first().locator('input').check();
  await sheet.locator('#prepAddInput').fill('充電線');
  await sheet.locator('#prepAddInput').press('Enter');
  await expect(sheet.locator('.prep-summary')).toHaveText('已完成 1 / 4');
  await expect(row).toContainText('1/4 ›');
  /* 自己新增的可以刪；共用的沒有刪除鈕 */
  await expect(sheet.locator('.prep-remove')).toHaveCount(1);
  await sheet.locator('.prep-remove').click();
  await expect(sheet.locator('.prep-summary')).toHaveText('已完成 1 / 3');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('trip_prep_state')));
  expect(stored.sourceKey).toBe(await page.evaluate(()=>currentTripSourceKey()));
  expect(Object.keys(stored.checks).length).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('without a checklist tab the row invites adding your own; it is gone once the trip starts',async({page})=>{
  await boot(page,'2026-10-10T12:00:00+09:00');
  await page.evaluate(()=>{switchView('today');renderToday();});
  await expect(page.locator('#view-today .prep-progress-row')).toContainText('新增 ›');
  await page.locator('#view-today .prep-progress-row').click();
  await expect(page.locator('#ledgerInfoSheet .prep-summary')).toHaveText('還沒有待辦，可以在下面新增');
  await page.evaluate(()=>closeLedgerInfoSheet());
  await boot(page,'2026-10-20T12:00:00+09:00');
  await page.evaluate(()=>{switchView('today');renderToday();});
  await expect(page.locator('#view-today .prep-progress-row')).toHaveCount(0);
});

test('the header shows the yellow paper plane and keeps the diagnostics double tap',async({page})=>{
  await boot(page);
  const mark=page.locator('#diagnosticBadge');
  await expect(mark).toHaveAttribute('aria-label','TripPilot');
  await expect(mark.locator('svg .logo-mark-plane')).toHaveCount(1);
  const style=await mark.evaluate(el=>{const cs=getComputedStyle(el),box=el.getBoundingClientRect(),svg=el.querySelector('svg').getBoundingClientRect();return {bg:cs.backgroundColor,w:box.width,h:box.height,centered:Math.abs((svg.left+svg.width/2)-(box.left+box.width/2))<1&&Math.abs((svg.top+svg.height/2)-(box.top+box.height/2))<1};});
  expect(style).toEqual({bg:'rgb(255, 214, 107)',w:24,h:24,centered:true});
  expect(await page.evaluate(()=>!!document.querySelector('img[src="okayama-peach-badge.png"]'))).toBe(false);
});
