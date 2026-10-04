const fs=require('node:fs');
const {test,expect}=require('./support/test');
const {installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.beforeEach(async({page})=>{await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);await page.evaluate(()=>openSettings('data'));});
async function seed(page){return page.evaluate(()=>{
 const record={id:'export-personal',time:'2026-10-18T01:00:00.000Z',member:'Bar',category:'購物',detail:'白桃',amountJpy:1200,amountTwd:263,note:'',payMethod:'現金',isProxy:true,proxyTarget:'媽媽',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:10,couponAmount:0,batchId:'',storeName:'岡山店',replacesRecordId:''};
 localStorage.setItem('trip_personal_ledger',JSON.stringify([record]));localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'shared-private'}]));
 return {personal:localStorage.getItem('trip_personal_ledger'),queue:localStorage.getItem('trip_ledger_queue')};
});}
test('downloads only personal ledger with provenance and leaves all original records intact',async({page})=>{
 const before=await seed(page);const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'匯出本趟個人帳',exact:true}).click();const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^TripPilot-個人帳-.*\.json$/);
 const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 expect(payload.records).toHaveLength(1);expect(payload.records[0]).toMatchObject({id:'export-personal',amountJpy:1200,amountTwd:263,isProxy:true,proxyTarget:'媽媽'});
 expect(payload.records[0].sourceKey).toBeTruthy();expect(JSON.stringify(payload)).not.toContain('shared-private');
 expect(await page.evaluate(()=>({personal:localStorage.getItem('trip_personal_ledger'),queue:localStorage.getItem('trip_ledger_queue')}))).toEqual(before);
});
test('empty or corrupted ledger produces guidance and no download',async({page})=>{
 let downloads=0;page.on('download',()=>downloads++);
 await page.getByRole('button',{name:'匯出本趟個人帳',exact:true}).click();await expect(page.locator('#personalLedgerExportStatus')).toHaveText('尚無個人帳可匯出');
 await page.evaluate(()=>localStorage.setItem('trip_personal_ledger','{bad'));
 await page.getByRole('button',{name:'匯出本趟個人帳',exact:true}).click();await expect(page.locator('#personalLedgerExportStatus')).toContainText('無法匯出');expect(downloads).toBe(0);
});
test('info buttons open a modal rather than inline disclosure and restore keyboard focus',async({page})=>{
 const info=page.getByRole('button',{name:'個人帳匯出說明',exact:true});await info.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog',{name:'個人帳匯出說明',exact:true});await expect(dialog).toBeVisible();await expect(dialog).toContainText('記序');
 expect(await page.evaluate(()=>Number(getComputedStyle(document.getElementById('settingsInfoDialog')).zIndex)>Number(getComputedStyle(document.getElementById('settingsOverlay')).zIndex))).toBe(true);
 expect(await dialog.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(450);
 await expect(page.getByRole('button',{name:'關閉說明',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'關閉說明',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(info).toBeFocused();
 await page.getByRole('button',{name:'備份／還原說明',exact:true}).click();await expect(page.getByRole('dialog',{name:'備份／還原說明'})).toBeVisible();await page.getByRole('button',{name:'關閉說明',exact:true}).click();
 await expect(page.locator('#settingsOverlay')).toContainText('還原會覆蓋目前資料');await expect(page.locator('#settingsOverlay')).toContainText('照片不包含於備份');
});
test('inactive trip hides export and active info dialogs close with their parent settings',async({page})=>{
 await page.getByRole('button',{name:'目前旅程說明',exact:true}).click();await page.evaluate(()=>closeSettings());await expect(page.locator('#settingsInfoDialog')).toHaveCount(0);
 await page.evaluate(()=>{localStorage.setItem('trip_lifecycle_state',JSON.stringify({version:1,mode:'inactive',operationId:'ended',updatedAt:'2026-10-24T00:00:00Z'}));openSettings('data');});
 await expect(page.getByRole('button',{name:'匯出本趟個人帳',exact:true})).toHaveCount(0);
});
test('six themes and three phone widths retain compact controls and visible modal content',async({page})=>{
 for(const theme of ['ocean','ivory','wisteria','cedar','mist','tea']){await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
 for(const width of [320,375,390]){await page.setViewportSize({width,height:844});const info=page.getByRole('button',{name:'個人帳匯出說明',exact:true});expect(await info.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);await info.click();
 expect(await page.locator('#settingsInfoDialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.keyboard.press('Escape');expect(await page.locator('#settingsOverlay .settings-panel').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);}}
});

test('download API failures and simulated time never claim successful export or mutate the ledger',async({page})=>{
 const before=await seed(page);let downloads=0;page.on('download',()=>downloads++);
 await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('download unavailable');};});
 await page.getByRole('button',{name:'匯出本趟個人帳',exact:true}).click();await expect(page.locator('#personalLedgerExportStatus')).toContainText('無法匯出');
 await page.evaluate(()=>localStorage.setItem('trip_time_simulation',JSON.stringify({mode:'custom',value:'2026-10-18T10:00'})));
 await page.getByRole('button',{name:'匯出本趟個人帳',exact:true}).click();await expect(page.locator('#personalLedgerExportStatus')).toContainText('結束時間模擬');
 expect(downloads).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('trip_personal_ledger'))).toBe(before.personal);
});
