/* v166（出發前稽核 #57 中優先 B1 剩下的情況）
   ============================================================
   剛記的團體帳送出後，fast pull 讀回來、交付橋接就清掉；公開 CSV 要 1–5 分鐘才追上。
   v156 讓這段時間的讀回留在記憶體，但在 CSV 追上前關掉 App、在沒有網路的地方重開，
   這筆帳要等連上網路才回來。現在讀回也存在手機上（綁目前旅程），開 App 時先補回帳本，
   CSV 追上就移除；它不是待送資料，不進個人備份，別趟旅程留下的不會被套用。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});

const X_ID='1792378800000-x166';

/* 線上 App:公開 CSV 都回 BUILTIN(分帳紀錄只有標題列 = 還沒追上的 CSV),Apps Script 的 POST 收進
   server rows,doGet 依 after 回傳。sessionStorage 記住「已初始化」與「離線」,重新整理後狀態不會被清掉。 */
async function installLedgerServer(page,seedReadback){
  await page.addInitScript(seed=>{
    if(!sessionStorage.getItem('__qa_ready')){
      localStorage.clear();
      localStorage.setItem('trip_member','Bar');
      localStorage.setItem('trip_source','{"version":1,"kind":"legacy","migratedAt":0}');
      if(seed)localStorage.setItem('trip_ledger_readback',JSON.stringify(seed));
      sessionStorage.setItem('__qa_ready','1');
    }
    const HEAD=['id','time','member','category','detail','amountJpy','amountTwd','note','participants','payMethod','recordType','targetRecordId','deleteReason','batchId','storeName','replacesRecordId','inputCurrency','isTaxFree','priceMode','taxRate','couponAmount'];
    const json=body=>new Response(JSON.stringify(body),{status:200});
    const csvField=value=>{const text=String(value==null?'':value);return /[",\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;};
    const stored=JSON.parse(sessionStorage.getItem('__qa_server')||'{"rows":[],"csvHasRows":false}');
    window.__server=stored;
    const save=()=>sessionStorage.setItem('__qa_server',JSON.stringify(window.__server));
    window.__qaSave=save;
    if(sessionStorage.getItem('__qa_offline')==='1'){
      try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
      window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
      return;
    }
    window.fetch=(input,init)=>{
      const server=window.__server,url=new URL(String(input&&input.url||input),location.href);
      if(url.hostname==='script.google.com'){
        if(init&&init.method==='POST'){
          const record=JSON.parse(init.body);
          if(!server.rows.some(row=>row[0]===record.id))server.rows.push(HEAD.map(key=>record[key]==null?'':record[key]));
          save();
          return Promise.resolve(json({ok:true}));
        }
        if(url.searchParams.get('action')==='ledger'){
          let after=Number(url.searchParams.get('after'))||0;
          const total=server.rows.length,reset=after>total;if(reset)after=0;
          return Promise.resolve(json({ok:true,serverTime:new Date().toISOString(),total,after,reset,rows:server.rows.slice(after)}));
        }
        return Promise.reject(new TypeError('QA_UNMOCKED_SCRIPT '+url.search));
      }
      const sheet=window.SHEETS&&window.SHEETS.find(candidate=>String(candidate.gid)===String(url.searchParams.get('gid')));
      if(!sheet||!window.BUILTIN||typeof window.BUILTIN[sheet.key]!=='string')return Promise.reject(new TypeError('QA_UNMOCKED_FETCH '+url.href));
      let body=window.BUILTIN[sheet.key];
      /* CSV 追上之後:分帳紀錄的公開 CSV 也有 server rows(欄位順序同 BUILTIN 的標題列) */
      if(sheet.key==='ledger'&&server.csvHasRows){
        const lines=body.replace(/\s+$/,'').split('\n');
        server.rows.forEach(row=>lines.push(row.map(csvField).join(',')));
        body=lines.join('\n')+'\n';
      }
      return Promise.resolve(new Response(body,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
    };
  },seedReadback||null);
}

/* 送出一筆團體帳並讓 fast pull 讀回 —— 這時 CSV 還沒有它 */
async function recordAndReadBack(page){
  return page.evaluate(async id=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const X={id,time:new Date().toISOString(),member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:3000,amountTwd:630,note:'',participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:10,couponAmount:0};
    ledgerRepository.enqueueBatch([X]);
    for(let i=0;i<60&&ledgerRepository.pendingCount();i++)await wait(50);
    await ledgerFastPullController.resume('visibilitychange');
    const stored=JSON.parse(localStorage.getItem('trip_ledger_readback')||'null');
    return {queue:ledgerRepository.pendingCount(),bridge:ledgerDeliveryBridgeRecords().length,inCsv:CURRENT_SNAPSHOT.sheets.ledger.includes(id),
      storedIds:stored?stored.records.map(record=>record.id):[],storedTrip:stored&&stored.sourceKey};
  },X_ID);
}

const ledgerView=page=>page.evaluate(id=>({
  visible:mergedLedgerRecords().filter(record=>record.id===id).length,
  net:ledgerCurrentMemberSettlement(mergedLedgerRecords(),'Bar','formal').current.netJpy,
  inCsv:CURRENT_SNAPSHOT.sheets.ledger.includes(id),
  stored:!!localStorage.getItem('trip_ledger_readback')
}),X_ID);

test('a group record read back online is still in the ledger and balance after reopening offline',async({page})=>{
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await installLedgerServer(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  expect(await recordAndReadBack(page)).toEqual({queue:0,bridge:0,inCsv:false,storedIds:[X_ID],storedTrip:'legacy'});
  /* 離開到沒有網路的地方,重開 App */
  await page.evaluate(()=>sessionStorage.setItem('__qa_offline','1'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof mergedLedgerRecords==='function');
  expect(await page.evaluate(()=>navigator.onLine)).toBe(false);
  expect(await ledgerView(page)).toEqual({visible:1,net:1500,inCsv:false,stored:true});
  /* 畫面上也看得到:團體帳列表有這筆晚餐 */
  await page.evaluate(()=>{closeMemberSelector();memberRegistrationBridge=[{id:'qa-member-Bar',time:'2026-10-01T00:00:00.000Z',member:'Bar',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'}];
    switchView('split');ledgerUiWorkflow.dispatch({type:'switch-track',track:'shared'});});
  await expect(page.locator('#view-split').getByText('晚餐').first()).toBeVisible();
});

test('the stored copy is removed once the public CSV has the row, without duplicates',async({page})=>{
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await installLedgerServer(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await recordAndReadBack(page);
  await page.evaluate(async()=>{window.__server.csvHasRows=true;window.__qaSave();await syncAll(true);});
  expect(await ledgerView(page)).toEqual({visible:1,net:1500,inCsv:true,stored:false});
  /* 重開後也只有一筆 */
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof mergedLedgerRecords==='function');
  await waitForSyncToSettle(page);
  expect(await ledgerView(page)).toEqual({visible:1,net:1500,inCsv:true,stored:false});
});

test('the stored copy is not pending data and is not in the personal backup',async({page})=>{
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await installLedgerServer(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await recordAndReadBack(page);
  expect(await page.evaluate(id=>({bridge:ledgerDeliveryBridgeHasRecords(),queue:ledgerRepository.pendingCount(),inBackup:personalStateJson().includes(id)}),X_ID))
    .toEqual({bridge:false,queue:0,inBackup:false});
});

test('a stored copy from another trip is ignored and removed',async({page})=>{
  const other={version:1,sourceKey:'trip:other-trip',records:[{id:X_ID,time:'2026-10-19T03:00:00.000Z',member:'Bar',category:'餐飲',detail:'晚餐',amountJpy:3000,amountTwd:630,note:'',participants:JSON.stringify(['Bar','Amy']),payMethod:'現金',recordType:'expense'}]};
  await installFixedDate(page,'2026-10-19T12:00:00+09:00');
  await page.addInitScript(()=>sessionStorage.setItem('__qa_offline','1'));
  await installLedgerServer(page,other);
  await openApp(page);
  expect(await ledgerView(page)).toEqual({visible:0,net:0,inCsv:false,stored:false});
});
