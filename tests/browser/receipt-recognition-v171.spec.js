/* v171（backlog #61）收據照片自動讀取
   ============================================================
   Bar 2026-10-31：用 Google Gemini 免費版，同意照片傳到 Google 一次。加照片後經這趟的 Apps Script
   讀出收據上的日期、時間、總額、幣別、店名；收據上的時間優先於照片的拍攝時間；只填還空著的欄位。
   這裡攔截送往 Apps Script 的 POST，用固定的回覆代替 Google。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

async function boot(page,cfg){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_source','{"version":1,"kind":"legacy","migratedAt":0}');
    window.__online=false;
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>window.__online});}catch(ignore){}
    window.__aiRequests=[];window.__aiReply={ok:true,receipt:{}};
    window.fetch=(url,init)=>{
      if(window.__online&&init&&init.method==='POST'){
        const body=JSON.parse(init.body);
        if(body.action==='recognizeReceipt'){window.__aiRequests.push(body);return Promise.resolve(new Response(JSON.stringify(window.__aiReply),{status:200}));}
      }
      return Promise.reject(new TypeError('QA_OFFLINE'));
    };
  });
  await installFixedDate(page,'2026-10-21T18:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(([m,patch])=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    Object.assign(DB.cfg,patch||{});
    window.__receiptFile=async(original)=>{
      const canvas=document.createElement('canvas');canvas.width=120;canvas.height=180;
      const context=canvas.getContext('2d');context.fillStyle='#f4efe6';context.fillRect(0,0,120,180);context.fillStyle='#333';context.fillRect(10,20,100,8);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
      let bytes=new Uint8Array(await blob.arrayBuffer());
      if(original){
        const text=Array.from(original+'\0').map(ch=>ch.charCodeAt(0));
        const u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255];
        const exifIfdAt=8+2+12+4,dataAt=exifIfdAt+2+12+4;
        const tiff=[0x49,0x49,...u16(42),...u32(8),...u16(1),...u16(0x8769),...u16(4),...u32(1),...u32(exifIfdAt),...u32(0),
          ...u16(1),...u16(0x9003),...u16(2),...u32(text.length),...u32(dataAt),...u32(0),...text];
        const app1=[0x45,0x78,0x69,0x66,0,0,...tiff],size=app1.length+2;
        const next=new Uint8Array(bytes.length+4+app1.length);
        next.set([0xFF,0xD8,0xFF,0xE1,size>>8&255,size&255],0);next.set(app1,6);next.set(bytes.subarray(2),6+app1.length);
        bytes=next;
      }
      return new File([bytes],'receipt.jpg',{type:'image/jpeg'});
    };
    window.__addReceipt=async(original)=>selectLedgerReceiptPhoto({files:[await window.__receiptFile(original)],value:''});
    window.__online=true;
  },[[identity('Bar'),identity('Amy')],cfg]);
}
async function openForm(page){
  await page.evaluate(()=>{switchView('split');openLedgerEntrySheet(false);});
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:'個人'}).click();
}
/* v175:照片下方不再顯示辨識訊息(只在彈出視窗);訊息內容改從表單資料讀 */
const scanMessage=page=>page.evaluate(()=>{const d=ledgerUiState.draft;return d&&d.receiptScan?d.receiptScan.message||'':'';});
const cardNotes=page=>page.locator('#ledgerReceiptCard .ledger-receipt-card-note:not(.ledger-receipt-card-time)');
/* v174:讀完收據會跳出結果視窗,要先按「好」才能操作後面的表單 */
async function closeReceiptDialog(page){
  const ok=page.locator('#ledgerReceiptDialog .ledger-receipt-card-ok');
  await expect(ok).toBeVisible();
  await ok.click();
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
}
const draftFields=page=>page.evaluate(()=>{const d=ledgerUiState.draft;return {date:d.occurredDate,time:d.occurredTime,amount:d.amount,currency:d.currency,store:d.storeName};});

test('a receipt fills the empty fields; the time on the receipt beats the photo time',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'2026-10-20',time:'12:41',total:1580,currency:'JPY',storeName:'ローソン 倉敷店'}};});
  await openForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-privacy')).toContainText('照片會傳到 Google');
  await page.evaluate(()=>window.__addReceipt('2026:10:20 12:45:10'));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入時間、金額 ¥1,580、店名「ローソン 倉敷店」，請確認');
  expect(await draftFields(page)).toEqual({date:'2026/10/20',time:'12:41',amount:'1580',currency:'JPY',store:'ローソン 倉敷店'});
  await expect(page.locator('#ledgerReceiptCard .ledger-receipt-card-row').first()).toHaveText('時間10/20 12:41');
  expect(await page.evaluate(()=>ledgerUiState.draft.receiptTimeNote)).toBe('已用收據上的時間帶入消費時間：10/20 12:41（可以再改）');
  await expect(page.locator('#ledgerAmount')).toHaveValue('1580');
  const sent=await page.evaluate(()=>window.__aiRequests.map(body=>({action:body.action,mimeType:body.mimeType,currency:body.currency,hasImage:/^[A-Za-z0-9+/]+=*$/.test(body.image)&&body.image.length>100})));
  expect(sent).toEqual([{action:'recognizeReceipt',mimeType:'image/jpeg',currency:'JPY',hasImage:true}]);
  /* 存檔後就是一般的帳 */
  await page.locator('#ledgerDetail').fill('飲料');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const saved=await page.evaluate(()=>{const r=personalLedgerRepository.all().filter(item=>item.detail==='飲料')[0];return [r.amountJpy,r.storeName,formatLedgerLocalOccurrence(r.time)];});
  expect(saved).toEqual([1580,'ローソン 倉敷店','2026/10/20 12:41']);
  /* 第二張照片不再送出 */
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).not.toBe('');
  await page.evaluate(()=>window.__addReceipt(null));
  expect(await page.evaluate(()=>window.__aiRequests.length)).toBe(2);
});

test('what you already typed stays; a changed time only gets a suggestion',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'2026-10-19',time:'20:05',total:3200,currency:'JPY',storeName:'居酒屋 鳥貴'}};});
  await openForm(page);
  await page.locator('#ledgerAmount').fill('3000');
  await page.evaluate(()=>{const d=ledgerUiState.draft;d.storeName='自己打的店名';d.occurredDate='2026/10/19';d.occurredTime='21:00';});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('收據讀好了，表單已經有填，沒有改動');
  await expect(cardNotes(page)).toHaveText('收據總額 ¥3,200');
  expect(await draftFields(page)).toEqual({date:'2026/10/19',time:'21:00',amount:'3000',currency:'JPY',store:'自己打的店名'});
  /* v175:時間建議與「改用收據時間」在彈出視窗裡 */
  await expect(page.locator('#ledgerReceiptCard .ledger-receipt-card-time')).toHaveText('收據上的時間是 10/19 20:05');
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'改用收據時間'}).click();
  await expect(page.locator('#ledgerReceiptCard')).toContainText('已改用收據上的時間：10/19 20:05');
  await expect(page.locator('#ledgerReceiptCard').getByRole('button',{name:'改用收據時間'})).toHaveCount(0);
  expect((await draftFields(page)).time).toBe('20:05');
});

test('a receipt in another currency is not filled in; TWD switches the entry to TWD',async({page})=>{
  await boot(page,{currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'});
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1580,currency:'JPY'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(cardNotes(page)).toHaveText('收據上的幣別是 JPY，不是這趟的 KRW 或 TWD，金額沒有帶入');
  expect((await draftFields(page)).amount).toBe('');
  expect(await page.evaluate(()=>window.__aiRequests[0].currency)).toBe('KRW');
  await page.evaluate(()=>closeLedgerEntrySheet());
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:'350',currency:'TWD',storeName:'7-ELEVEN'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 NT$350、店名「7-ELEVEN」，請確認');
  const fields=await draftFields(page);
  expect([fields.amount,fields.currency]).toEqual(['350','TWD']);
});

test('failures say what to do, and 重試 reads the photo again',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'missing or invalid ledger fields'};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toContain('Apps Script 還沒更新到能讀收據的版本');
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'quota'};});
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'重試'}).click();   // v174:結果卡片上的重試
  await expect.poll(()=>scanMessage(page)).toContain('今天的免費辨識次數用完了');
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'missing GEMINI_API_KEY'};});
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'重試'}).click();   // v174:結果卡片上的重試
  await expect.poll(()=>scanMessage(page)).toContain('GEMINI_API_KEY');
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'丸亀製麵'}};});
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'重試'}).click();   // v174:結果卡片上的重試
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入店名「丸亀製麵」，請確認');
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'',total:null,storeName:''}};});
  await page.evaluate(()=>{closeLedgerEntrySheet();});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('看不出這張照片上的收據內容，請手動輸入');
  expect(await page.evaluate(()=>window.__aiRequests.length)).toBe(5);
});

test('turned off or offline, nothing is sent',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>openSettings('ledger'));
  const toggle=page.getByRole('checkbox',{name:'加收據照片後自動讀取'});
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(page.locator('#settingsOverlay')).toContainText('已關閉');
  await page.evaluate(()=>closeSettings());
  await openForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-privacy')).toHaveCount(0);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(1);
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  expect(await scanMessage(page)).toBe('');
  await page.evaluate(()=>{closeLedgerEntrySheet();localStorage.setItem(RECEIPT_RECOGNITION_KEY,JSON.stringify('on'));window.__online=false;});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(1);
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  expect(await scanMessage(page)).toBe('');
  expect(await page.evaluate(()=>window.__aiRequests.length)).toBe(0);
});

/* v172(Bar 2026-10-31「收據照片下方的有網路時說明,調整成!資訊」) */
test('the photo-upload note sits behind a ! button next to 收據照片',async({page})=>{
  await boot(page,null);
  await openForm(page);
  const button=page.locator('#ledgerEntrySheet').getByRole('button',{name:'收據自動讀取說明'});
  await expect(button).toHaveText('!');
  await expect(button).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#ledgerReceiptHelp')).toBeHidden();
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-label')).toHaveText('收據照片（選填，最多 3 張，只存在這支手機）');
  const box=await button.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#ledgerReceiptHelp')).toBeVisible();
  await expect(page.locator('#ledgerReceiptHelp')).toContainText('照片會傳到 Google 讀取日期、金額與店名一次');
  /* 表單重畫(例如加照片)後維持打開 */
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(1);
  await expect(page.locator('#ledgerReceiptHelp')).toBeVisible();
  await closeReceiptDialog(page);
  await page.locator('#ledgerReceiptHelpButton').click();
  await expect(page.locator('#ledgerReceiptHelp')).toBeHidden();
  /* 關掉收據辨識時不顯示「!」 */
  await page.evaluate(()=>{closeLedgerEntrySheet();localStorage.setItem(RECEIPT_RECOGNITION_KEY,JSON.stringify('off'));});
  await openForm(page);
  await expect(page.locator('#ledgerReceiptHelpButton')).toHaveCount(0);
});

/* v173(Bar 2026-10-31):收據看得出行動支付(PayPay、LINE Pay、TWQR…)就選「行動支付」;類別也依收據判斷 */
test('the pay method and category come from the receipt when still at the defaults',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:420,currency:'JPY',storeName:'JR 岡山駅',payMethod:'行動支付',category:'交通'}};});
  await openForm(page);
  const before=await page.evaluate(()=>[ledgerUiState.draft.payMethod,ledgerUiState.draft.category]);
  expect(before).toEqual(['現金','餐飲']);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥420、店名「JR 岡山駅」、支付方式「行動支付」、類別「交通」，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.payMethod,ledgerUiState.draft.category])).toEqual(['行動支付','交通']);
  const sent=await page.evaluate(()=>[window.__aiRequests[0].payMethods,window.__aiRequests[0].categories]);
  expect(sent[0]).toEqual(['現金','信用卡','行動支付','Suica','其他']);
  expect(sent[1]).toContain('交通');
  /* 存成一般的帳 */
  await page.locator('#ledgerDetail').fill('電車');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  expect(await page.evaluate(()=>{const r=personalLedgerRepository.all().filter(item=>item.detail==='電車')[0];return [r.payMethod,r.category];})).toEqual(['行動支付','交通']);
});

test('a pay method or category you picked yourself stays; answers outside your options are ignored',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'カフェ',payMethod:'行動支付',category:'交通'}};});
  await openForm(page);
  await page.evaluate(()=>{selectLedgerPayMethod('信用卡');selectLedgerCategory('購物');});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入店名「カフェ」，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.payMethod,ledgerUiState.draft.category])).toEqual(['信用卡','購物']);
  await page.evaluate(()=>closeLedgerEntrySheet());
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'屋台',payMethod:'PayPay',category:'Food'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入店名「屋台」，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.payMethod,ledgerUiState.draft.category])).toEqual(['現金','餐飲']);
});

test('a multi-item receipt sets the shared category for items not adjusted by hand',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'ドン・キホーテ',payMethod:'信用卡',category:'購物'}};});
  await openForm(page);
  await page.evaluate(()=>{setLedgerDraftMulti(true);addLedgerDraftItem();const items=ledgerUiState.draft.items;selectLedgerItemCategory(items[1].key,'美妝');});
  await page.evaluate(()=>window.__addReceipt(null));
  /* 多品項的收據欄在收起來的「帳單資訊」裡,直接看表單資料 */
  await expect.poll(()=>page.evaluate(()=>ledgerUiState.draft.receiptScan&&ledgerUiState.draft.receiptScan.message)).toBe('已依收據帶入店名「ドン・キホーテ」、支付方式「信用卡」、類別「購物」，請確認');
  const state=await page.evaluate(()=>({apply:ledgerUiState.draft.categoryApply,items:ledgerUiState.draft.items.map(item=>item.category),pay:ledgerUiState.draft.payMethod}));
  expect(state).toEqual({apply:'購物',items:['購物','美妝'],pay:'信用卡'});
});

/* v173(Bar 2026-10-31):多品項時把收據上的品項逐筆帶入;單品項不填明細,可按「改成多品項並帶入」 */
const receiptLines={ok:true,receipt:{total:1780,currency:'JPY',storeName:'一蘭',items:[{name:'醤油ラーメン',amount:980},{name:'生ビール x2',amount:1000}],discount:200}};
async function openMultiForm(page){
  await openForm(page);
  await page.evaluate(()=>{setLedgerDraftMulti(true);ledgerUiState.draft.multiBillDetailsOpen=true;renderLedgerEntrySheet();});
}
/* v178(Bar 2026-11-01):優惠券欄拿掉;收據上的折扣寫進備註,並照金額比例從各品項扣掉(¥980／¥1,000 扣 ¥200 → ¥881／¥899) */
test('a multi-item entry gets the receipt lines with the discount spread over them',async({page})=>{
  await boot(page,null);
  await page.evaluate(reply=>{window.__aiReply=reply;},receiptLines);
  await openMultiForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>page.evaluate(()=>ledgerUiState.draft.receiptScan&&ledgerUiState.draft.receiptScan.message)).toBe('已依收據帶入店名「一蘭」、備註「收據折扣 ¥200（優惠券等）」、2 個品項，請確認');
  const draft=await page.evaluate(()=>({items:ledgerUiState.draft.items.map(item=>[item.name,item.amount]),discount:ledgerUiState.draft.discount,notes:ledgerUiState.draft.receiptScan.notes,detail:ledgerUiState.draft.detail,note:ledgerUiState.draft.note}));
  expect(draft).toEqual({items:[['醤油ラーメン','881'],['生ビール x2','899']],discount:'',notes:['收據折扣 ¥200 已照金額比例分到 2 個品項（原價 ¥980、¥1,000）'],detail:'',note:'收據折扣 ¥200（優惠券等）'});
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const saved=await page.evaluate(()=>personalLedgerRepository.all().filter(item=>item.storeName==='一蘭').map(item=>[item.detail,item.amountJpy]));
  expect(saved.map(row=>row[0]).sort()).toEqual(['生ビール x2','醤油ラーメン']);
  expect(saved.reduce((sum,row)=>sum+row[1],0)).toBe(1780);
});

test('lines that do not add up to the total get a note about tax or discounts',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1980,currency:'JPY',items:[{name:'お土産A',amount:1000},{name:'お土産B',amount:800}]}};});
  await openMultiForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(cardNotes(page)).toHaveText('品項加總 ¥1,800，收據總額 ¥1,980；可能是未稅價或另有折扣，請檢查品項金額與「稅」');
});

test('a single entry keeps 明細 empty and offers to switch to the receipt lines',async({page})=>{
  await boot(page,null);
  await page.evaluate(reply=>{window.__aiReply=reply;},receiptLines);
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥1,780、店名「一蘭」、備註「收據折扣 ¥200（優惠券等）」，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.multi,ledgerUiState.draft.detail])).toEqual([false,'']);
  await closeReceiptDialog(page);
  await page.getByRole('button',{name:'改成多品項並帶入'}).click();
  await expect.poll(()=>page.evaluate(()=>ledgerUiState.draft.receiptScan.message)).toBe('已帶入收據上的 2 個品項，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.multi,ledgerUiState.draft.items.map(item=>[item.name,item.amount]),ledgerUiState.draft.discount])).toEqual([true,[['醤油ラーメン','881'],['生ビール x2','899']],'']);
  await expect(page.getByRole('button',{name:'改成多品項並帶入'})).toHaveCount(0);
});

test('items already typed in a multi-item entry are not replaced without asking',async({page})=>{
  await boot(page,null);
  await page.evaluate(reply=>{window.__aiReply=reply;},receiptLines);
  await openMultiForm(page);
  await page.evaluate(()=>{const item=ledgerUiState.draft.items[0];updateLedgerDraftItem(item.key,{name:'自己打的',amount:'500'});ledgerUiState.draft.multiBillDetailsOpen=true;renderLedgerEntrySheet();});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-items')).toContainText('收據上有 2 個品項');
  expect(await page.evaluate(()=>ledgerUiState.draft.items.map(item=>item.name))).toEqual(['自己打的']);
  await closeReceiptDialog(page);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'改用這 2 個品項'}).click();
  expect(await page.evaluate(()=>ledgerUiState.draft.items.map(item=>item.name))).toEqual(['自己打的']);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'改用這 2 個品項'}).click();
  await expect.poll(()=>page.evaluate(()=>ledgerUiState.draft.items.map(item=>item.name))).toEqual(['醤油ラーメン','生ビール x2']);
});

/* v173 修正:多品項以前永遠看不到收據欄(空白品項被當成來自採買);從採買記帳時仍然不顯示 */
test('the receipt field shows on multi-item entries but not on entries from the shopping list',async({page})=>{
  await boot(page,null);
  await openMultiForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-field')).toHaveCount(1);
  const fromShopping=await page.evaluate(()=>{const draft=ledgerUiState.draft;draft.items[0].sourceShoppingItemId='shop-1';draft.items[0].sourceShoppingAllocationId='alloc-1';return ledgerReceiptFieldVisible(draft);});
  expect(fromShopping).toBe(false);
});

/* v174(Bar 2026-10-31 選「表單頂端結果卡片」):結果在表單最上方、可「好」收起、可「復原」;填過的欄位標「收據」 */
const card=page=>page.locator('#ledgerReceiptCard');
test('the result pops up in a dialog listing what was filled; 好, the backdrop or Escape close it',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'2026-10-20',time:'12:41',total:1580,currency:'JPY',storeName:'ローソン 倉敷店',payMethod:'行動支付',category:'交通'}};});
  await openForm(page);
  /* 讀取中:表單上方一行,不跳視窗 */
  await page.evaluate(()=>{window.__realFetch=window.fetch;window.fetch=(url,init)=>new Promise(resolve=>{window.__release=()=>resolve(window.__realFetch(url,init));});});
  await page.evaluate(()=>{window.__addReceipt(null);});
  await expect(page.locator('#ledgerReceiptReading')).toHaveText('正在讀取收據…');
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  await page.evaluate(()=>{window.fetch=window.__realFetch;window.__release();});
  const dialog=page.getByRole('dialog',{name:'已依收據帶入（請確認）'});
  await expect(dialog).toBeVisible();
  await expect(page.locator('#ledgerReceiptReading')).toHaveCount(0);
  await expect(card(page).locator('.ledger-receipt-card-row')).toHaveText(['時間10/20 12:41','金額¥1,580','店名ローソン 倉敷店','支付方式行動支付','類別交通']);
  await expect(dialog).toBeInViewport();
  await expect(dialog.getByRole('button',{name:'好'})).toBeFocused();
  /* 填過的欄位標「收據」;自己改了就不標 */
  await expect(page.locator('label[for="ledgerAmount"] .ledger-receipt-tag')).toHaveText('收據');
  await dialog.getByRole('button',{name:'好'}).click();
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  await page.locator('#ledgerAmount').fill('1600');
  await page.evaluate(()=>renderLedgerEntrySheet());
  await expect(page.locator('label[for="ledgerAmount"] .ledger-receipt-tag')).toHaveCount(0);
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  /* 點視窗外面、按 Esc 也會關 */
  await page.evaluate(()=>{const d=ledgerUiState.draft;d.receiptCard.open=true;d.receiptCard.id=999;renderLedgerEntrySheet();});
  await page.mouse.click(10,10);
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  await page.evaluate(()=>{const d=ledgerUiState.draft;d.receiptCard.open=true;d.receiptCard.id=1000;renderLedgerEntrySheet();});
  await page.keyboard.press('Escape');
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  /* 關掉表單時視窗一起消失 */
  await page.evaluate(()=>{const d=ledgerUiState.draft;d.receiptCard.open=true;d.receiptCard.id=1001;renderLedgerEntrySheet();closeLedgerEntrySheet();});
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
});

test('復原 puts back everything the receipt changed',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'2026-10-19',time:'20:05',total:3200,currency:'JPY',storeName:'鳥貴',payMethod:'信用卡',category:'購物'}};});
  await openForm(page);
  const before=await page.evaluate(()=>{const d=ledgerUiState.draft;return {date:d.occurredDate,time:d.occurredTime,amount:d.amount,store:d.storeName,pay:d.payMethod,category:d.category};});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(card(page).getByRole('button',{name:'復原'})).toBeVisible();
  await card(page).getByRole('button',{name:'復原'}).click();
  await expect(card(page).locator('strong')).toHaveText('已復原，收據帶入的內容都改回去了');
  await expect(card(page).getByRole('button',{name:'復原'})).toHaveCount(0);
  const after=await page.evaluate(()=>{const d=ledgerUiState.draft;return {date:d.occurredDate,time:d.occurredTime,amount:d.amount,store:d.storeName,pay:d.payMethod,category:d.category};});
  expect(after).toEqual(before);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-tag')).toHaveCount(0);
  /* 照片還在,只是內容改回去 */
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(1);
});

test('復原 also undoes switching to the receipt lines',async({page})=>{
  await boot(page,null);
  await page.evaluate(reply=>{window.__aiReply=reply;},receiptLines);
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await closeReceiptDialog(page);
  await page.getByRole('button',{name:'改成多品項並帶入'}).click();
  await expect(card(page).locator('.ledger-receipt-card-row')).toHaveText(['品項醤油ラーメン、生ビール x2']);
  await card(page).getByRole('button',{name:'復原'}).click();
  expect(await page.evaluate(()=>[ledgerUiState.draft.multi,ledgerUiState.draft.amount,ledgerUiState.draft.discount])).toEqual([false,'1780','']);
});

test('reading, failure and nothing-found states show in the card',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'quota'};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(card(page)).toHaveClass(/is-warning/);
  await expect(card(page).locator('strong')).toContainText('今天的免費辨識次數用完了');
  await expect(card(page).getByRole('button',{name:'重試'})).toBeVisible();
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{}};});
  await card(page).getByRole('button',{name:'重試'}).click();
  await expect(card(page).locator('strong')).toHaveText('看不出這張照片上的收據內容，請手動輸入');
  await expect(card(page).getByRole('button',{name:'復原'})).toHaveCount(0);
  /* 讀取中只在表單上方,不跳視窗 */
  const reading=await page.evaluate(()=>{const d=ledgerUiState.draft;d.receiptCard={open:true,status:'reading'};renderLedgerEntrySheet();return [document.getElementById('ledgerReceiptReading').textContent,!!document.getElementById('ledgerReceiptDialog')];});
  expect(reading).toEqual(['正在讀取收據…',false]);
});


/* v175(Bar 2026-10-31):收據照片下方只留「收據上有 N 個品項」與按鈕 */
test('under the receipt photos only the receipt-lines offer remains',async({page})=>{
  await boot(page,null);
  await page.evaluate(reply=>{window.__aiReply=reply;},receiptLines);
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt('2026:10:20 12:45:10'));
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(1);
  const notes=page.locator('#ledgerEntrySheet .ledger-receipt-field .ledger-receipt-note:not(.ledger-receipt-privacy)');
  await expect(notes).toHaveCount(1);
  await expect(notes).toHaveText('收據上有 2 個品項 改成多品項並帶入');
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-field .ledger-receipt-error')).toHaveCount(0);
});

/* v176(Bar 2026-10-31「可以在附註填入該收據是免稅」「要，多品項時自動設好」):
   收據上看得出免稅(已扣稅)或可退稅時寫進備註,不自動勾免稅品;收據印的稅率與「未稅價」在多品項時設好 */
const draftTax=page=>page.evaluate(()=>{const d=ledgerUiState.draft;return {note:d.note,preset:d.taxPreset,custom:d.customTaxRate,mode:d.priceMode};});
test('a tax-free receipt is noted in 備註 without ticking 免稅品',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:5400,currency:'JPY',storeName:'ビックカメラ',taxFree:'deducted'}};});
  await openForm(page);
  await page.evaluate(()=>{ledgerUiState.draft.note='幫媽媽買';});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥5,400、店名「ビックカメラ」、備註「免稅（結帳時已扣稅）」，請確認');
  expect((await draftTax(page)).note).toBe('幫媽媽買；免稅（結帳時已扣稅）');
  await expect(card(page).locator('.ledger-receipt-card-row')).toHaveText(['金額¥5,400','店名ビックカメラ','備註免稅（結帳時已扣稅）']);
  expect(await page.evaluate(()=>(ledgerUiState.draft.items||[]).some(item=>item.taxExempt))).toBe(false);
  /* 同一張再讀一次不會重複寫 */
  await card(page).getByRole('button',{name:'好'}).click();
  await page.evaluate(()=>retryLedgerReceiptRecognition());
  await expect.poll(()=>scanMessage(page)).toBe('收據讀好了，表單已經有填，沒有改動');
  expect((await draftTax(page)).note).toBe('幫媽媽買；免稅（結帳時已扣稅）');
});

test('a refundable receipt says the refund still has to be claimed',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{taxFree:'refundable'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入備註「可退稅（結帳時未扣稅，需另外辦理）」，請確認');
  expect((await draftTax(page)).note).toBe('可退稅（結帳時未扣稅，需另外辦理）');
});

test('a multi-item receipt with pre-tax prices sets 10% and 未稅, and the taxed sum matches',async({page})=>{
  await boot(page,null);
  /* 未稅 ¥1,000＋¥800＝¥1,800，加 10% ＝ ¥1,980 */
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'お土産屋',total:1980,currency:'JPY',items:[{name:'お土産A',amount:1000},{name:'お土産B',amount:800}],taxRates:[10],pricesIncludeTax:false}};});
  await openMultiForm(page);
  await page.evaluate(()=>{ledgerUiState.draft.taxPreset='8';});
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入店名「お土産屋」、稅率 10%（品項為未稅價）、2 個品項，請確認');
  expect(await draftTax(page)).toMatchObject({preset:'10',mode:'excluded'});
  await expect(cardNotes(page)).toHaveCount(0);
  await expect(card(page).locator('.ledger-receipt-card-row')).toContainText(['稅率10%，品項為未稅價']);
  await closeReceiptDialog(page);
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const saved=await page.evaluate(()=>personalLedgerRepository.all().filter(item=>/^お土産/.test(item.detail)).map(item=>[item.amountJpy,item.taxRate,item.priceMode]));
  expect(saved.reduce((sum,row)=>sum+row[0],0)).toBe(1980);
  expect(saved.every(row=>row[1]===10&&row[2]==='excluded')).toBe(true);
});

test('mixed tax rates only get a reminder; tax settings you picked stay',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'イオン',taxRates:[8,10],pricesIncludeTax:false}};});
  await openMultiForm(page);
  const before=await draftTax(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(cardNotes(page)).toHaveText('收據上有 8%、10% 不同稅率，稅率沒有自動設定；可依稅率分開記，或在「稅」自己選');
  expect(await draftTax(page)).toEqual(before);
  await closeReceiptDialog(page);
  /* 自己選過稅率:單一稅率的收據也不改 */
  await page.evaluate(()=>{setLedgerTaxPreset('8');window.__aiReply={ok:true,receipt:{storeName:'イオン',taxRates:[10],pricesIncludeTax:false}};});
  await page.evaluate(()=>retryLedgerReceiptRecognition());
  await expect.poll(()=>scanMessage(page)).toBe('收據讀好了，表單已經有填，沒有改動');
  expect(await draftTax(page)).toMatchObject({preset:'8',mode:before.mode});
});

test('a single entry takes the printed rate but keeps 含稅; a trip without tax ignores it',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:540,currency:'JPY',taxRates:[8],pricesIncludeTax:false}};});
  await openForm(page);
  const mode=(await draftTax(page)).mode;
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥540、稅率 8%，請確認');
  expect(await draftTax(page)).toMatchObject({preset:'8',mode});
  /* 收據稅率不在這趟清單裡就用自訂 */
  await page.evaluate(()=>{closeLedgerEntrySheet();DB.cfg.taxRates='10';window.__aiReply={ok:true,receipt:{taxRates:[5]}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入稅率 5%，請確認');
  expect(await draftTax(page)).toMatchObject({preset:'custom',custom:'5'});
  /* 韓國旅程沒有稅的設定:不動稅,免稅一樣寫備註 */
  await page.evaluate(()=>{closeLedgerEntrySheet();Object.assign(DB.cfg,{taxRates:'',currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'});window.__aiReply={ok:true,receipt:{taxRates:[10],taxFree:'deducted'}};});
  await openForm(page);
  const krw=await draftTax(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入備註「免稅（結帳時已扣稅）」，請確認');
  expect(await draftTax(page)).toMatchObject({preset:krw.preset,mode:krw.mode});
});

test('復原 also puts back 備註 and the tax settings',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1980,currency:'JPY',items:[{name:'お土産A',amount:1000},{name:'お土産B',amount:800}],taxRates:[10],pricesIncludeTax:false,taxFree:'deducted'}};});
  await openMultiForm(page);
  const before=await draftTax(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(card(page).getByRole('button',{name:'復原'})).toBeVisible();
  expect((await draftTax(page)).mode).toBe('excluded');
  await card(page).getByRole('button',{name:'復原'}).click();
  expect(await draftTax(page)).toEqual(before);
});

test('改成多品項並帶入 sets 未稅 from the receipt too',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1980,currency:'JPY',items:[{name:'お土産A',amount:1000},{name:'お土産B',amount:800}],taxRates:[10],pricesIncludeTax:false}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await closeReceiptDialog(page);
  await page.getByRole('button',{name:'改成多品項並帶入'}).click();
  await expect.poll(()=>page.evaluate(()=>ledgerUiState.draft.multi)).toBe(true);
  expect(await draftTax(page)).toMatchObject({preset:'10',mode:'excluded'});
  await expect(cardNotes(page)).toHaveCount(0);
});

/* v177(Bar 2026-10-31「把稅額也識別並列出來，之後紀錄退稅金額多少也比較方便」;日本 11/1 起先付稅、出境後再退) */
test('the tax amount is listed; a refundable receipt keeps it in 備註',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:12001,currency:'JPY',storeName:'ドラッグストア',taxFree:'refundable',taxAmount:1091}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  /* v178:稅額填進「稅」的稅額欄,可退稅的帳自動勾「可退稅」 */
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥12,001、店名「ドラッグストア」、稅額 ¥1,091、備註「可退稅（結帳時未扣稅，需另外辦理），稅額 ¥1,091」，請確認');
  expect((await draftTax(page)).note).toBe('可退稅（結帳時未扣稅，需另外辦理），稅額 ¥1,091');
  expect(await page.evaluate(()=>[ledgerUiState.draft.taxAmount,ledgerUiState.draft.refundable])).toEqual(['1091',true]);
  await expect(card(page).locator('.ledger-receipt-card-row')).toContainText(['備註可退稅（結帳時未扣稅，需另外辦理），稅額 ¥1,091']);
  await expect(cardNotes(page)).toHaveCount(0);
  /* 復原把備註、稅額與「可退稅」都改回 */
  await card(page).getByRole('button',{name:'復原'}).click();
  expect((await draftTax(page)).note).toBe('');
  expect(await page.evaluate(()=>[ledgerUiState.draft.taxAmount,ledgerUiState.draft.refundable])).toEqual(['',false]);
});

test('an ordinary receipt fills the tax amount without touching 備註; a tax-free one has no tax line',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1078,currency:'JPY',taxAmount:98}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入金額 ¥1,078、稅額 ¥98，請確認');
  await expect(card(page).locator('.ledger-receipt-card-row')).toContainText(['稅額¥98']);
  await expect(cardNotes(page)).toHaveCount(0);
  expect(await page.evaluate(()=>[ledgerUiState.draft.taxAmount,ledgerUiState.draft.refundable])).toEqual(['98',false]);
  expect((await draftTax(page)).note).toBe('');
  await closeReceiptDialog(page);
  /* 結帳時已扣稅:沒有稅可退,不列稅額 */
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{taxFree:'deducted',taxAmount:98}};});
  await page.evaluate(()=>retryLedgerReceiptRecognition());
  await expect.poll(()=>scanMessage(page)).toBe('已依收據帶入備註「免稅（結帳時已扣稅）」，請確認');
  await expect(cardNotes(page)).toHaveCount(0);
  /* 收據幣別不是這趟的:不列稅額 */
  await closeReceiptDialog(page);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{currency:'USD',taxAmount:3.5}};});
  await page.evaluate(()=>retryLedgerReceiptRecognition());
  await expect.poll(()=>scanMessage(page)).toBe('收據讀好了，表單已經有填，沒有改動');
  await expect(cardNotes(page)).toHaveCount(0);
});
