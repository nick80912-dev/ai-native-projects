/* v156 出發前修正(Bar 2026-10-15 從出發前稽核報告選的五項)
   ============================================================
   B1  剛記的團體帳被 fast pull 讀回後,交付橋接就清掉了;下一次 syncAll 用延遲 1–5 分鐘的
       公開 CSV 換掉 DB,這筆帳從帳本和餘額消失,而且 after 游標已走過,整個工作階段補不回來。
   L3  記帳表單點背景或按 Esc 會直接關閉,草稿沒有確認就丟掉。
   L8  團體帳的付款人一律是目前身分,表單卻只寫「目前記帳身分」。(v157 起可改選付款人)
   T3  從今天頁點已完成／已略過的站,「隱藏已完成」把它藏起來,行程頁只說「找不到對應地點」。
   T12 (復原 6 秒)由 tests/trip-progress-persistence.test.js 守著。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

/* 線上 App:八張公開 CSV 都回 BUILTIN(分帳紀錄只有標題列 = 還沒追上的 CSV),
   Apps Script 的 POST 收進 serverRows,doGet 依 after 回傳 serverRows。 */
async function installLedgerServer(page){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_source','{"version":1,"kind":"legacy","migratedAt":0}');
    const HEAD=['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId','storeName','replacesRecordId','inputCurrency','isTaxFree','priceMode','taxRate','couponAmount'];
    const delay=(ms,value)=>new Promise(resolve=>setTimeout(()=>resolve(value),ms||0));
    const json=body=>new Response(JSON.stringify(body),{status:200});
    window.__server={rows:[],head:HEAD,afters:[],doGetDelay:0};
    window.fetch=(input,init)=>{
      const server=window.__server,url=new URL(String(input&&input.url||input),location.href);
      if(url.hostname==='script.google.com'){
        if(init&&init.method==='POST'){
          const record=JSON.parse(init.body);
          if(!server.rows.some(row=>row[0]===record.id))server.rows.push(HEAD.map(key=>record[key]==null?'':record[key]));
          return delay(10,json({ok:true}));
        }
        if(url.searchParams.get('action')==='ledger'){
          let after=Number(url.searchParams.get('after'))||0;
          const total=server.rows.length,reset=after>total;if(reset)after=0;
          server.afters.push(after);
          return delay(server.doGetDelay,json({ok:true,serverTime:new Date().toISOString(),total,after,reset,rows:server.rows.slice(after)}));
        }
        return Promise.reject(new TypeError('QA_UNMOCKED_SCRIPT '+url.search));
      }
      const sheet=window.SHEETS&&window.SHEETS.find(candidate=>String(candidate.gid)===String(url.searchParams.get('gid')));
      if(!sheet||!window.BUILTIN||typeof window.BUILTIN[sheet.key]!=='string')return Promise.reject(new TypeError('QA_UNMOCKED_FETCH '+url.href));
      return Promise.resolve(new Response(window.BUILTIN[sheet.key],{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
    };
  });
}

test.describe('B1 a group record read back by fast pull survives a sync with a stale CSV',()=>{
  test('the record stays in the ledger and the balance right after syncAll',async({page})=>{
    await installFixedDate(page,'2026-10-19T12:00:00+09:00');
    await installLedgerServer(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    const result=await page.evaluate(async()=>{
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      const X={id:'1792378800000-x001',time:new Date().toISOString(),member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:3000,amountTwd:630,note:'',participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:10,couponAmount:0};
      const visible=()=>mergedLedgerRecords().some(record=>record.id===X.id);
      const net=()=>ledgerCurrentMemberSettlement(mergedLedgerRecords(),'Bar','formal').current.netJpy;
      const steps={};
      ledgerRepository.enqueueBatch([X]);
      for(let i=0;i<60&&ledgerRepository.pendingCount();i++)await wait(50);
      steps.posted={queue:ledgerRepository.pendingCount(),bridge:ledgerDeliveryBridgeRecords().length,visible:visible(),net:net()};
      await ledgerFastPullController.resume('visibilitychange');
      steps.readBack={bridge:ledgerDeliveryBridgeRecords().length,visible:visible(),inCsv:CURRENT_SNAPSHOT.sheets.ledger.includes(X.id)};
      /* 再讀一次放慢,證明 syncAll 一換掉 DB 就看得到,不是靠之後的重讀補回來 */
      window.__server.doGetDelay=800;
      const aftersBefore=window.__server.afters.length;
      await syncAll(true);
      steps.rightAfterSync={visible:visible(),net:net(),inCsv:CURRENT_SNAPSHOT.sheets.ledger.includes(X.id)};
      /* syncAll 自己就從第一列重讀(不是測試觸發的);trigger 只會接上那次進行中的讀取 */
      steps.reread=window.__server.afters.slice(aftersBefore);
      await ledgerFastPullController.trigger('test');
      steps.later={visible:visible(),net:net(),count:mergedLedgerRecords().filter(record=>record.id===X.id).length};
      return steps;
    });
    expect(result.posted).toEqual({queue:0,bridge:1,visible:true,net:1500});
    expect(result.readBack).toEqual({bridge:0,visible:true,inCsv:false});
    expect(result.rightAfterSync).toEqual({visible:true,net:1500,inCsv:false});
    expect(result.reread).toEqual([0]);
    expect(result.later).toEqual({visible:true,net:1500,count:1});
  });

  test('syncAll re-reads the server from the first row',async({page})=>{
    await installFixedDate(page,'2026-10-19T12:00:00+09:00');
    await installLedgerServer(page);
    await openApp(page);
    await waitForSyncToSettle(page);
    const result=await page.evaluate(async()=>{
      const row=(id,member,amount)=>window.__server.head.map(key=>({id,time:new Date().toISOString(),member,category:'餐飲',detail:id,amountJpy:amount,amountTwd:0,participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense',inputCurrency:'JPY',priceMode:'included',taxRate:10,couponAmount:0,isTaxFree:false})[key]??'');
      const visible=id=>mergedLedgerRecords().some(record=>record.id===id);
      window.__server.rows.push(row('srv-x','Bar',3000));
      await ledgerFastPull('interval');
      /* 另一支手機的帳出現在游標已走過的位置(例如 Sheet 被排序過),增量讀取拿不到 */
      window.__server.rows.unshift(row('srv-y','Amy',2000));
      await ledgerFastPull('interval');
      const missedByCursor=!visible('srv-y'),before=window.__server.afters.length;
      await syncAll(false);
      const reread=window.__server.afters.slice(before);
      await ledgerFastPullController.trigger('test');
      return {missedByCursor,reread,x:visible('srv-x'),y:visible('srv-y'),after:ledgerFastPullState.after};
    });
    expect(result).toEqual({missedByCursor:true,reread:[0],x:true,y:true,after:2});
  });
});

async function openLedgerEntry(page,width){
  await page.setViewportSize({width:width||390,height:844});
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    closeMemberSelector();
    memberRegistrationBridge.push({id:'entry-member',time:'2026-10-19T00:00:00.000Z',member:'Bar',recordType:'identity_registration'});
    switchView('split');
    openLedgerEntrySheet(false);
  });
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
}

test('L3 the entry form stays open on a background tap or Escape and keeps the draft',async({page})=>{
  await openLedgerEntry(page);
  await page.locator('#ledgerAmount').fill('4800');
  const sheetTop=await page.locator('#ledgerEntrySheet .ledger-sheet').evaluate(element=>element.getBoundingClientRect().top);
  expect(sheetTop).toBeGreaterThan(40);
  await page.locator('#ledgerEntrySheet').click({position:{x:195,y:Math.floor(sheetTop/2)}});
  await page.keyboard.press('Escape');
  await expect(page.locator('#ledgerEntrySheet .ledger-sheet')).toBeVisible();
  await expect(page.locator('#ledgerAmount')).toHaveValue('4800');
  await page.locator('#ledgerEntrySheet .settings-close').click();
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
});

for(const width of [320,390]){
  test('L8 the group form names the payer at '+width+'px',async({page})=>{
    await openLedgerEntry(page,width);
    const member=page.locator('#ledgerEntrySheet .ledger-sheet-member');
    await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'團體'}).click();
    /* v157:付款人改成可選的下拉選單(見 proxy-recording-v157.spec.js);只有一位成員時不能改,預設是你。 */
    await expect(member.locator('#ledgerPayer')).toHaveValue('');
    await expect(member.locator('#ledgerPayer option:checked')).toHaveText('Bar（你）');
    await expect(member.locator('.ledger-payer-note')).toHaveText('別人付的，請改選付款人');
    const note=await member.locator('.ledger-payer-note').evaluate(element=>{
      const style=getComputedStyle(element),row=element.closest('.ledger-entry-heading-row');
      return {size:style.fontSize,weight:style.fontWeight,display:style.display,fits:row.scrollWidth<=row.clientWidth};
    });
    expect(note).toEqual({size:'10px',weight:'400',display:'block',fits:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
    await expect(member).toHaveText('目前記帳身分：Bar');
  });
}

test.describe('T3 opening a cleared stop from Today shows it on the trip page',()=>{
  async function openToday(page){
    await installOfflineAppNetwork(page);
    await installFixedDate(page,'2026-10-19T15:45:00+09:00');
    await openApp(page);
    await waitForSyncToSettle(page);
    await page.evaluate(()=>closeMemberSelector());
    await page.locator('#view-today .nx-cluster-expand').click();
  }

  test('an auto-skipped stop switches the filter to 顯示全部 and is located',async({page})=>{
    await openToday(page);
    const stop=page.locator('#view-today .nx-cluster-stop',{hasText:'宮島口搭船處'});
    await expect(stop).toContainText('自動略過');
    await stop.click();
    await expect(page.locator('#view-trip .is-navigation-target')).toHaveAttribute('id','it_10/19_7');
    await expect(page.locator('#view-trip .navigation-target-status')).toHaveText('已定位：宮島口搭船處');
    await expect(page.locator('#view-trip .trip-filter-btn',{hasText:'顯示全部'})).toHaveAttribute('aria-pressed','true');
  });

  test('a pending stop keeps 隱藏已完成',async({page})=>{
    await openToday(page);
    await page.locator('#view-today .nx-cluster-stop',{hasText:'宮島表参道商店街'}).click();
    await expect(page.locator('#view-trip .is-navigation-target')).toHaveAttribute('id','it_10/19_9');
    await expect(page.locator('#view-trip .trip-filter-btn',{hasText:'隱藏已完成'})).toHaveAttribute('aria-pressed','true');
  });
});
