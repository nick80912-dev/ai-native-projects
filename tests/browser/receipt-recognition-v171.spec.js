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
const scan=page=>page.locator('#ledgerEntrySheet .ledger-receipt-scan');
const draftFields=page=>page.evaluate(()=>{const d=ledgerUiState.draft;return {date:d.occurredDate,time:d.occurredTime,amount:d.amount,currency:d.currency,store:d.storeName};});

test('a receipt fills the empty fields; the time on the receipt beats the photo time',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'2026-10-20',time:'12:41',total:1580,currency:'JPY',storeName:'ローソン 倉敷店'}};});
  await openForm(page);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-privacy')).toContainText('照片會傳到 Google');
  await page.evaluate(()=>window.__addReceipt('2026:10:20 12:45:10'));
  await expect(scan(page)).toHaveText('已依收據帶入時間、金額 ¥1,580、店名「ローソン 倉敷店」，請確認');
  expect(await draftFields(page)).toEqual({date:'2026/10/20',time:'12:41',amount:'1580',currency:'JPY',store:'ローソン 倉敷店'});
  await expect(page.locator('#ledgerReceiptTimeNote')).toHaveText('已用收據上的時間帶入消費時間：10/20 12:41（可以再改）');
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
  await expect(scan(page)).toHaveCount(1);
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
  await expect(scan(page)).toHaveText('收據讀好了，表單已經有填，沒有改動');
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-scan-note')).toHaveText('收據總額 ¥3,200');
  expect(await draftFields(page)).toEqual({date:'2026/10/19',time:'21:00',amount:'3000',currency:'JPY',store:'自己打的店名'});
  await expect(page.locator('#ledgerReceiptTimeNote')).toContainText('收據上的時間是 10/19 20:05');
  await page.getByRole('button',{name:'改用收據時間'}).click();
  await expect(page.locator('#ledgerReceiptTimeNote')).toHaveText('已改用收據上的時間：10/19 20:05');
  expect((await draftFields(page)).time).toBe('20:05');
});

test('a receipt in another currency is not filled in; TWD switches the entry to TWD',async({page})=>{
  await boot(page,{currency:'KRW',exchangeRate:'0.024',ledgerDefaultCurrency:'KRW'});
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:1580,currency:'JPY'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-scan-note')).toHaveText('收據上的幣別是 JPY，不是這趟的 KRW 或 TWD，金額沒有帶入');
  expect((await draftFields(page)).amount).toBe('');
  expect(await page.evaluate(()=>window.__aiRequests[0].currency)).toBe('KRW');
  await page.evaluate(()=>closeLedgerEntrySheet());
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{total:'350',currency:'TWD',storeName:'7-ELEVEN'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(scan(page)).toHaveText('已依收據帶入金額 NT$350、店名「7-ELEVEN」，請確認');
  const fields=await draftFields(page);
  expect([fields.amount,fields.currency]).toEqual(['350','TWD']);
});

test('failures say what to do, and 重試 reads the photo again',async({page})=>{
  await boot(page,null);
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'missing or invalid ledger fields'};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(scan(page)).toContainText('Apps Script 還沒更新到能讀收據的版本');
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'quota'};});
  await page.getByRole('button',{name:'重試'}).click();
  await expect(scan(page)).toContainText('今天的免費辨識次數用完了');
  await page.evaluate(()=>{window.__aiReply={ok:false,error:'missing GEMINI_API_KEY'};});
  await page.getByRole('button',{name:'重試'}).click();
  await expect(scan(page)).toContainText('GEMINI_API_KEY');
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'丸亀製麵'}};});
  await page.getByRole('button',{name:'重試'}).click();
  await expect(scan(page)).toHaveText('已依收據帶入店名「丸亀製麵」，請確認');
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{date:'',total:null,storeName:''}};});
  await page.evaluate(()=>{closeLedgerEntrySheet();});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(scan(page)).toHaveText('看不出這張照片上的收據內容，請手動輸入');
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
  await expect(scan(page)).toHaveCount(0);
  await page.evaluate(()=>{closeLedgerEntrySheet();localStorage.setItem(RECEIPT_RECOGNITION_KEY,JSON.stringify('on'));window.__online=false;});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(1);
  await expect(scan(page)).toHaveCount(0);
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
  await expect(scan(page)).toHaveText('已依收據帶入金額 ¥420、店名「JR 岡山駅」、支付方式「行動支付」、類別「交通」，請確認');
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
  await expect(scan(page)).toHaveText('已依收據帶入店名「カフェ」，請確認');
  expect(await page.evaluate(()=>[ledgerUiState.draft.payMethod,ledgerUiState.draft.category])).toEqual(['信用卡','購物']);
  await page.evaluate(()=>closeLedgerEntrySheet());
  await page.evaluate(()=>{window.__aiReply={ok:true,receipt:{storeName:'屋台',payMethod:'PayPay',category:'Food'}};});
  await openForm(page);
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(scan(page)).toHaveText('已依收據帶入店名「屋台」，請確認');
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
