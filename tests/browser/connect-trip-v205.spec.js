/* v205 連接新旅程優化(Bar 2026-11-19 選 1、2、3、5、6、7)。裝置模擬沿用 trip-connect.spec.js。
   這裡不用 qa-fixture 的 installBaseLocalState：它每次載入都會清空 localStorage，
   而連接成功後 App 會重新載入，必須保留剛寫入的旅程來源。 */
const {test,expect}=require('./support/test');
const {collectPageErrors,installFixedDate}=require('./support/qa-fixture');
/* 岡山保護期（TripSource.LEGACY_GRACE_UNTIL）：台灣時間 10/24 以前，沒有紀錄的新手機也沿用岡山。
   測「尚未連接」的情境一律把時鐘固定在保護期之後，不受執行測試當天的日期影響。 */
const AFTER_GRACE='2026-10-24T09:00:00+08:00';

const NEW_PUB='2PACX-1vQ'+'k'.repeat(70);
const NEW_LINK='https://docs.google.com/spreadsheets/d/e/'+NEW_PUB+'/pubhtml';
const ENDPOINT='https://script.google.com/macros/s/AKfycbx'+'q'.repeat(60)+'/exec';
const LEGACY_SOURCE='{"version":1,"kind":"legacy","migratedAt":0}';

async function installDevice(page,{seed={},online=true,info={ok:true,tripId:'kyushu-2027',ledgerHeaderOk:true},cfgTail=null}={}){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.fallback();
    return route.abort('blockedbyclient');
  });
  await page.addInitScript(({seed,online,info,pub,endpoint,cfgTail})=>{
    if(!sessionStorage.getItem('qa_seeded')){
      localStorage.clear();
      Object.keys(seed).forEach(key=>localStorage.setItem(key,seed[key]));
      sessionStorage.setItem('qa_seeded','1');
    }
    window.__qaInfo=info;
    window.__qaFetches=[];
    if(!online){
      try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
      window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
      return;
    }
    window.fetch=input=>{
      const url=new URL(String(input&&input.url||input),window.location.href);
      window.__qaFetches.push(url.hostname+url.pathname+url.search);
      if(url.hostname==='script.google.com'){
        if(url.searchParams.get('action')==='info'){
          return Promise.resolve(new Response(JSON.stringify(window.__qaInfo),{status:200,headers:{'Content-Type':'application/json'}}));
        }
        return Promise.reject(new TypeError('QA_LEDGER_OFFLINE'));
      }
      if(url.hostname==='docs.google.com'&&url.pathname.indexOf(pub)>=0&&/\/pubhtml$/.test(url.pathname)){
        /* v205:分頁清單 —— 行前清單依名稱找得到,航班沒有這個分頁 */
        return Promise.resolve(new Response('items.push({name: "行程總表", pageUrl: "x?gid=1"});items.push({name: "行前清單", pageUrl: "https:\\/\\/docs.google.com\\/x?headers\\x3dfalse&gid=888"});',{status:200,headers:{'Content-Type':'text/html'}}));
      }
      if(url.hostname==='docs.google.com'&&url.pathname.indexOf(pub)>=0){
        if(url.searchParams.get('gid')==='999'){
          return Promise.resolve(new Response('地區名稱,緯度,經度,關鍵字\n岡山測試區,34.6618,133.935,"岡山、倉敷"\n',{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
        }
        const sheet=window.SHEETS&&window.SHEETS.find(candidate=>String(candidate.gid)===url.searchParams.get('gid'));
        if(!sheet)return Promise.reject(new TypeError('QA_UNKNOWN_GID'));
        let csv=window.BUILTIN[sheet.key];
        if(sheet.key==='cfg'){
          csv=csv.replace('Trip Name,岡山四國六天五夜','Trip Name,九州測試旅程').replace(/\s*$/,'\n')+
            (cfgTail||('Trip ID,kyushu-2027\nLedger Endpoint,'+endpoint+'\nWeather Regions GID,999\n'));
        }
        return Promise.resolve(new Response(csv,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
      }
      return Promise.reject(new TypeError('QA_UNMOCKED_FETCH '+url.hostname+url.pathname));
    };
  },{seed,online,info,pub:NEW_PUB,endpoint:ENDPOINT,cfgTail});
}


const SHOTDIR=process.env.SHOTDIR||'';
async function shot(page,name){if(!SHOTDIR)return;await page.waitForTimeout(300);await page.screenshot({path:SHOTDIR+'/'+name+'.png'});}

test('邀請連結:尚未連接的手機點開就自動檢查,預覽列出幣別、選填分頁與提醒',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,AFTER_GRACE);
  await installDevice(page);
  await page.goto('/?join='+NEW_PUB,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'九州測試旅程'})).toBeVisible();
  expect(await page.evaluate(()=>location.search)).toBe('','the join value is removed from the address bar');
  const facts=page.locator('.connect-trip-facts');
  await expect(facts).toContainText('當地幣別');
  await expect(facts).toContainText('天氣地區有');
  await expect(facts).toContainText('行前清單有');
  await expect(facts).toContainText('航班沒有');
  await expect(page.locator('.connect-trip-warnings')).toContainText('Apps Script 是舊版');
  await shot(page,'1-join-preview');
  expect(await page.evaluate(()=>window.__qaFetches.some(entry=>/\/pubhtml\?headers=false/.test(entry)))).toBe(true);
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'確認連接'}).click()]);
  await page.waitForFunction(()=>typeof TripLifecycle!=='undefined'&&typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  expect(await page.evaluate(()=>({join:localStorage.getItem('tp_join_pending'),tabs:JSON.parse(localStorage.getItem('trip_sheet_tabs')||'null')}))).toMatchObject({join:null,tabs:{sourceKey:'sheet:kyushu-2027',tabs:{'行前清單':'888'}}});
  expect(errors).toEqual([]);
});

test('還在上一趟時點邀請連結:先看到清除按鈕,連結記著等清除後帶入',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,AFTER_GRACE);
  await installDevice(page,{online:false,seed:{trip_member:'Bar',trip_source:LEGACY_SOURCE,trip_checks:'{"x":true}'}});
  await page.goto('/?join='+NEW_PUB,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#settingsTitle')).toHaveText('連接新旅程');
  await expect(page.locator('.connect-trip-joined')).toContainText('已收到旅伴的邀請連結');
  await shot(page,'2-active-join');
  await page.getByRole('button',{name:'前往清除並打包'}).click();
  await expect(page.locator('#settingsTitle')).toHaveText('資料與版本');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tp_join_pending')).pubId)).toBe(NEW_PUB);
  /* 清除旅程只清 trip_ 開頭的資料;邀請連結與上一趟的名字留著 */
  expect(await page.evaluate(()=>TripLifecycle.clearKeys(['tp_join_pending','tp_last_member','trip_member']))).toEqual(['trip_member']);
  expect(await page.evaluate(()=>localStorage.getItem('tp_last_member'))).toBe('Bar');
  expect(errors).toEqual([]);
});

test('試算表有好幾個問題時一次列出來',async({page})=>{
  const errors=collectPageErrors(page);
  await installFixedDate(page,AFTER_GRACE);
  await installDevice(page,{cfgTail:'Trip ID,x\nLedger Endpoint,https://example.com/not-apps-script\n'});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'連接新旅程'}).click();
  await page.locator('#connectTripLink').fill(NEW_LINK);
  await page.getByRole('button',{name:'檢查連結'}).click();
  const alert=page.locator('.connect-trip-problems');
  await expect(alert).toContainText('試算表有 2 個地方要修');
  await expect(alert.locator('li')).toHaveCount(2);
  await expect(alert).toContainText('Trip ID');
  await expect(alert).toContainText('Ledger Endpoint');
  await shot(page,'3-problems');
  expect(errors).toEqual([]);
});
