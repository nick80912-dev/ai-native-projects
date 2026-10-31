/* v167（backlog #59）分帳收據照片
   ============================================================
   Bar 2026-10-19：只存在拍照的手機、團體帳與個人帳都可以、每筆最多 3 張。
   Bar 2026-10-30：加照片時用照片的拍攝時間帶入日期時間（金額之後另一版）。
   測試用的照片是頁面上用 canvas 畫出來的 JPEG，再插入一段 EXIF（拍攝時間）。
   ============================================================ */
const {test,expect}=require('./support/test');
const {installFixedDate,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.use({timezoneId:'Asia/Tokyo'});
const identity=name=>({id:'qa-member-'+name,time:'2026-10-01T00:00:00.000Z',member:name,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration'});

/* 跟 installOfflineAppNetwork 一樣離線，但只在第一次載入時清空本機資料，重新整理就等於重開 App */
async function installOfflineKeepingStorage(page){
  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('__qa_ready')){
      localStorage.clear();
      localStorage.setItem('trip_member','Bar');
      localStorage.setItem('trip_source','{"version":1,"kind":"legacy","migratedAt":0}');
      sessionStorage.setItem('__qa_ready','1');
    }
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
    window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
  });
}

async function boot(page){
  await installOfflineKeepingStorage(page);
  await installFixedDate(page,'2026-10-21T18:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(m=>{
    closeMemberSelector();localStorage.setItem('trip_member','Bar');memberRegistrationBridge=m;
    /* 頁面上做一張 JPEG；original 有值時插入 EXIF DateTimeOriginal */
    window.__receiptFile=async(original,name)=>{
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
      return new File([bytes],name||'receipt.jpg',{type:'image/jpeg'});
    };
    window.__addReceipt=async(original)=>selectLedgerReceiptPhoto({files:[await window.__receiptFile(original)],value:''});
    window.__receiptCount=()=>ledgerReceiptPhotoStore.listMetadata().then(records=>records.length);
  },[identity('Bar'),identity('Amy')]);
}

async function openForm(page,track){
  await page.evaluate(()=>{switchView('split');openLedgerEntrySheet(false);});
  await page.locator('#ledgerEntrySheet .ledger-sheet-choice',{hasText:track==='shared'?'團體':'個人'}).click();
}

const loadedThumbs=(page,scope)=>page.locator(scope+' .ledger-receipt-open img').evaluateAll(images=>images.map(image=>image.complete&&image.naturalWidth>0));

test('a personal entry keeps its receipt photo and takes the date and time from it',async({page})=>{
  await boot(page);
  await openForm(page,'personal');
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-label')).toHaveText('收據照片（選填，最多 3 張，只存在這支手機）');
  expect(await page.evaluate(()=>window.__addReceipt('2026:10:20 12:34:56'))).toBe(true);
  await expect(page.locator('#toast')).toContainText('已用照片的拍攝時間帶入：10/20 12:34');   // v175:改用畫面下方的短通知
  expect(await page.evaluate(()=>[ledgerUiState.draft.occurredDate,ledgerUiState.draft.occurredTime])).toEqual(['2026/10/20','12:34']);
  await expect.poll(()=>loadedThumbs(page,'#ledgerEntrySheet')).toEqual([true]);
  await page.locator('#ledgerAmount').fill('1200');
  await page.locator('#ledgerDetail').fill('拉麵');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const id=await page.evaluate(()=>{const record=personalLedgerRepository.all().filter(item=>item.detail==='拉麵')[0];return {id:record.id,time:formatLedgerLocalOccurrence(record.time)};});
  expect(id.time).toBe('2026/10/20 12:34');
  /* 列表上看得出這筆有收據 */
  await expect(page.locator('#view-split .ledger-receipt-badge').first()).toHaveText('📎 收據');
  /* 點開那筆帳看得到收據；重開 App 還在 */
  await page.evaluate(recordId=>openLedgerRecordDetail(recordId),id.id);
  await expect(page.locator('#ledgerRecordDetail .ledger-detail-receipts h3')).toHaveText('收據照片');
  await expect.poll(()=>loadedThumbs(page,'#ledgerRecordDetail')).toEqual([true]);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof openLedgerRecordDetail==='function');
  await page.evaluate(recordId=>{closeMemberSelector();switchView('split');ledgerUiWorkflow.dispatch({type:'switch-track',track:'personal'});openLedgerRecordDetail(recordId);},id.id);
  await expect.poll(()=>loadedThumbs(page,'#ledgerRecordDetail')).toEqual([true]);
  /* 點縮圖放大看 */
  await page.locator('#ledgerRecordDetail .ledger-receipt-open').first().click();
  await expect(page.locator('#ledgerReceiptViewer img')).toBeVisible();
  await page.getByRole('button',{name:'關閉收據照片'}).click();
  await expect(page.locator('#ledgerReceiptViewer')).toHaveCount(0);
  /* 照片不進個人備份 */
  expect(await page.evaluate(()=>personalStateJson().includes('receipt-photo-'))).toBe(false);
});

test('a group entry takes up to three photos; a later photo only suggests its time',async({page})=>{
  await boot(page);
  await openForm(page,'shared');
  await page.evaluate(()=>window.__addReceipt('2026:10:21 13:05:00'));
  expect(await page.evaluate(()=>ledgerUiState.draft.occurredTime)).toBe('13:05');
  await page.evaluate(()=>window.__addReceipt('2026:10:21 13:40:00'));
  /* v175:時間建議改用彈出視窗(這裡沒有網路,不會辨識收據) */
  await expect(page.locator('#ledgerReceiptCard')).toContainText('照片的拍攝時間是 10/21 13:40');
  expect(await page.evaluate(()=>ledgerUiState.draft.occurredTime)).toBe('13:05');
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'改用照片時間'}).click();
  expect(await page.evaluate(()=>ledgerUiState.draft.occurredTime)).toBe('13:40');
  await expect(page.locator('#ledgerReceiptCard')).toContainText('已改用照片的拍攝時間：10/21 13:40');
  await expect(page.locator('#ledgerReceiptCard').getByRole('button',{name:'改用照片時間'})).toHaveCount(0);
  await page.locator('#ledgerReceiptCard').getByRole('button',{name:'好'}).click();
  await page.evaluate(()=>window.__addReceipt(null));
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(3);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-add')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__addReceipt(null))).toBe(false);
  expect(await page.evaluate(()=>window.__receiptCount())).toBe(3);
  await page.locator('#ledgerAmount').fill('3000');
  await page.locator('#ledgerDetail').fill('晚餐');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const record=await page.evaluate(()=>ledgerRepository.queuedRecords().filter(item=>item.detail==='晚餐')[0]);
  expect(record.time).toBe('2026-10-21T04:40:00.000Z');
  expect(JSON.stringify(record)).not.toContain('receipt-photo-');   // 照片不跟著團體帳上傳
  await page.evaluate(id=>openLedgerRecordDetail(id),record.id);
  await expect.poll(()=>loadedThumbs(page,'#ledgerRecordDetail')).toEqual([true,true,true]);
  await page.evaluate(()=>closeLedgerRecordDetail());
  /* 團體帳編輯會產生新的紀錄：照片跟著那筆帳 */
  await page.evaluate(id=>editLedgerRecord(id),record.id);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(3);
  await page.locator('#ledgerAmount').fill('3300');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const edited=await page.evaluate(()=>ledgerTrackRecords().filter(item=>item.detail==='晚餐')[0]);
  expect([edited.amountJpy,edited.id!==record.id]).toEqual([3300,true]);
  await page.evaluate(id=>openLedgerRecordDetail(id),edited.id);
  await expect.poll(()=>loadedThumbs(page,'#ledgerRecordDetail')).toEqual([true,true,true]);
  expect(await page.evaluate(()=>window.__receiptCount())).toBe(3);
});

test('the receipt field fits a 320px phone',async({page})=>{
  await page.setViewportSize({width:320,height:640});
  await boot(page);
  await openForm(page,'personal');
  await page.evaluate(async()=>{await window.__addReceipt(null);await window.__addReceipt(null);});
  const layout=await page.locator('#ledgerEntrySheet .ledger-receipt-field').evaluate(field=>{
    const sheet=field.closest('.ledger-sheet'),box=field.getBoundingClientRect(),add=field.querySelector('.ledger-receipt-add').getBoundingClientRect();
    return {fits:box.right<=sheet.getBoundingClientRect().right+0.5&&sheet.scrollWidth<=sheet.clientWidth,addHeight:Math.round(add.height),removeHeight:Math.round(field.querySelector('.ledger-receipt-remove').getBoundingClientRect().height)};
  });
  expect(layout).toEqual({fits:true,addHeight:72,removeHeight:36});
});

test('editing can remove a photo, and photos nobody uses are deleted',async({page})=>{
  await boot(page);
  await openForm(page,'personal');
  await page.evaluate(async()=>{await window.__addReceipt('2026:10:20 09:00:00');await window.__addReceipt(null);});
  await page.locator('#ledgerAmount').fill('500');
  await page.locator('#ledgerDetail').fill('咖啡');
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  const id=await page.evaluate(()=>personalLedgerRepository.all().filter(item=>item.detail==='咖啡')[0].id);
  /* 編輯時看得到原本的兩張，移除一張再存 */
  await page.evaluate(recordId=>editLedgerRecord(recordId),id);
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-thumb')).toHaveCount(2);
  await page.getByRole('button',{name:'移除收據照片 1'}).click();
  await page.evaluate(()=>saveLedgerEntry(false));
  await expect(page.locator('#ledgerEntrySheet')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.__receiptCount())).toBe(1);
  await page.evaluate(recordId=>openLedgerRecordDetail(recordId),id);
  await expect(page.locator('#ledgerRecordDetail .ledger-receipt-thumb')).toHaveCount(1);
  await page.evaluate(()=>closeLedgerRecordDetail());
  /* 刪掉這筆帳，照片也刪掉 */
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(recordId=>deletePersonalLedgerRecord(recordId),id);
  await expect.poll(()=>page.evaluate(()=>window.__receiptCount())).toBe(0);
  expect(await page.evaluate(()=>localStorage.getItem('trip_ledger_receipts'))).toBeNull();
});

test('closing the form without saving deletes the photo; a photo without a time leaves the date alone',async({page})=>{
  await boot(page);
  await openForm(page,'personal');
  const before=await page.evaluate(()=>[ledgerUiState.draft.occurredDate,ledgerUiState.draft.occurredTime]);
  await page.evaluate(()=>window.__addReceipt(null));
  expect(await page.evaluate(()=>[ledgerUiState.draft.occurredDate,ledgerUiState.draft.occurredTime])).toEqual(before);
  await expect(page.locator('#ledgerReceiptDialog')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__receiptCount())).toBe(1);
  await page.evaluate(()=>closeLedgerEntrySheet());
  await expect.poll(()=>page.evaluate(()=>window.__receiptCount())).toBe(0);
});

test('a date changed by hand is not overwritten by the photo time',async({page})=>{
  await boot(page);
  await openForm(page,'personal');
  await page.evaluate(()=>{ledgerUiState.draft.occurredDate='2026/10/19';ledgerUiState.draft.occurredTime='20:00';});
  await page.evaluate(()=>window.__addReceipt('2026:10:20 12:00:00'));
  expect(await page.evaluate(()=>[ledgerUiState.draft.occurredDate,ledgerUiState.draft.occurredTime])).toEqual(['2026/10/19','20:00']);
  await expect(page.locator('#ledgerReceiptCard').getByRole('button',{name:'改用照片時間'})).toBeVisible();
  /* v175:照片下方不再有說明文字 */
  await expect(page.locator('#ledgerEntrySheet .ledger-receipt-field .ledger-receipt-note:not(.ledger-receipt-privacy)')).toHaveCount(0);
});

test('clearing local media removes receipt photos together with shopping photos',async({page})=>{
  await boot(page);
  await openForm(page,'personal');
  await page.evaluate(()=>window.__addReceipt(null));
  expect(await page.evaluate(()=>window.__receiptCount())).toBe(1);
  await page.evaluate(()=>localMediaStore().clearAll());
  expect(await page.evaluate(()=>window.__receiptCount())).toBe(0);
});
