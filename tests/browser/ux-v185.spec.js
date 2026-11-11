/* v185 表單與設定更精簡
   ============================================================
   Bar 2026-11-10 選 UI/UX 建議第 4–7 項並看過畫面回「好」：
   - 單品項「這筆是代購」改成金額標題列的小勾選「代購」，勾了才出現「幫誰買」。
   - 設定的資料健康、照片健康、旅途紀錄、診斷面板收進「疑難排解」（返回也回到疑難排解）。
   - 今天頁的通知出現在頂欄下方，不蓋住「完成／跳過」；其他頁與面板維持在底部。
   - 旅程結束後行程頁單純瀏覽：沒有打卡方塊、不變灰、不顯示完成／略過與「隱藏已完成」；打卡紀錄不動。
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
const sheet=page=>page.locator('#ledgerEntrySheet');

test('the proxy tick sits in the amount row; targets appear only when it is ticked',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await boot(page);
  await page.evaluate(()=>{openLedgerEntrySheet(false);setLedgerDraftTrack('personal');});
  const tick=sheet(page).locator('.ledger-amount-head-actions .ledger-single-proxy');
  await expect(tick).toHaveText('代購');
  await expect(sheet(page).locator('.ledger-proxy-switch')).toHaveCount(0);
  await expect(sheet(page).locator('#ledgerProxyTargets')).toHaveCount(0);
  const row=await page.evaluate(()=>{const boxes=[...document.querySelectorAll('.ledger-amount-head-actions>*')].map(el=>el.getBoundingClientRect());return {count:boxes.length,oneRow:boxes.every(b=>Math.abs(b.top+b.height/2-(boxes[0].top+boxes[0].height/2))<3),overflow:document.documentElement.scrollWidth>window.innerWidth};});
  expect(row).toEqual({count:3,oneRow:true,overflow:false});
  await page.locator('#ledgerProxy').check();
  await expect(sheet(page).locator('#ledgerProxyTargets')).toBeVisible();
  await page.locator('#ledgerAmount').fill('500');
  await page.locator('#ledgerDetail').fill('伴手禮');
  const saved=await page.evaluate(()=>{saveLedgerEntry(false);return personalLedgerRepository.all().filter(r=>r.detail==='伴手禮').map(r=>ledgerRecordMetadata(r).isProxy);});
  expect(saved).toEqual([true]);
  /* 團體帳與多品項沒有這顆 */
  await page.evaluate(()=>{openLedgerEntrySheet(false);setLedgerDraftTrack('shared');});
  await expect(sheet(page).locator('.ledger-single-proxy')).toHaveCount(0);
});

test('on Today the toast shows under the header, clear of 完成／跳過; elsewhere it stays at the bottom',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{switchView('today');window.scrollTo(0,0);});
  await page.evaluate(()=>toast('已完成：測試站','復原',function(){}));
  const top=await page.evaluate(()=>{const t=document.getElementById('toast').getBoundingClientRect(),h=document.querySelector('.hdr').getBoundingClientRect(),done=[...document.querySelectorAll('#view-today button')].filter(b=>/^(完成|跳過)$/.test(b.textContent.trim())).map(b=>b.getBoundingClientRect());return {isTop:document.getElementById('toast').classList.contains('toast-top'),belowHeader:t.top>=h.bottom-12,inView:t.right<=window.innerWidth&&t.left>=0,clear:done.every(b=>t.bottom<b.top)};});
  expect(top).toEqual({isTop:true,belowHeader:true,inView:true,clear:true});
  await page.evaluate(()=>{switchView('split');toast('測試');});
  expect(await page.evaluate(()=>{const el=document.getElementById('toast');return {isTop:el.classList.contains('toast-top'),lower:el.getBoundingClientRect().top>window.innerHeight/2};})).toEqual({isTop:false,lower:true});
});

test('after the trip the itinerary is browse-only and the check-in records stay',async({page})=>{
  await boot(page,'2026-11-09T12:00:00+09:00');
  /* 旅程中留下的打卡紀錄:結束後畫面不顯示,但資料原封不動 */
  const seeded=await page.evaluate(()=>{const id=DB.trip.days[0].items.filter(isTripCheckableItem)[0].id,checks={};checks[id]=true;localStorage.setItem('trip_checks',JSON.stringify(checks));switchView('trip');return localStorage.getItem('trip_checks');});
  await expect(page.locator('#view-trip .item').first()).toBeVisible();
  await expect(page.locator('#view-trip .item .chk')).toHaveCount(0);
  await expect(page.locator('#view-trip .item.checked')).toHaveCount(0);
  await expect(page.locator('#view-trip .day-head .prog')).toHaveText(/^共 \d+ 站$/);
  await expect(page.locator('#view-trip .trip-filter')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('trip_checks'))).toBe(seeded);
});
