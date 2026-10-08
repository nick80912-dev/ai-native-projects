/* v149 連接新旅程（ADR 0021，規格 docs/superpowers/specs/2026-10-08-connect-new-trip-design.md）。
   這裡不用 qa-fixture 的 installBaseLocalState：它每次載入都會清空 localStorage，
   而連接成功後 App 會重新載入，必須保留剛寫入的旅程來源。 */
const {test,expect}=require('./support/test');
const {collectPageErrors}=require('./support/qa-fixture');

const NEW_PUB='2PACX-1vQ'+'k'.repeat(70);
const NEW_LINK='https://docs.google.com/spreadsheets/d/e/'+NEW_PUB+'/pubhtml';
const ENDPOINT='https://script.google.com/macros/s/AKfycbx'+'q'.repeat(60)+'/exec';
const LEGACY_SOURCE='{"version":1,"kind":"legacy","migratedAt":0}';

async function installDevice(page,{seed={},online=true,info={ok:true,tripId:'kyushu-2027',ledgerHeaderOk:true}}={}){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.fallback();
    return route.abort('blockedbyclient');
  });
  await page.addInitScript(({seed,online,info,pub,endpoint})=>{
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
      if(url.hostname==='docs.google.com'&&url.pathname.indexOf(pub)>=0){
        if(url.searchParams.get('gid')==='999'){
          return Promise.resolve(new Response('地區名稱,緯度,經度,關鍵字\n岡山測試區,34.6618,133.935,"岡山、倉敷"\n',{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
        }
        const sheet=window.SHEETS&&window.SHEETS.find(candidate=>String(candidate.gid)===url.searchParams.get('gid'));
        if(!sheet)return Promise.reject(new TypeError('QA_UNKNOWN_GID'));
        let csv=window.BUILTIN[sheet.key];
        if(sheet.key==='cfg'){
          csv=csv.replace('Trip Name,岡山四國六天五夜','Trip Name,九州測試旅程').replace(/\s*$/,'\n')+
            'Trip ID,kyushu-2027\nLedger Endpoint,'+endpoint+'\nWeather Regions GID,999\n';
        }
        return Promise.resolve(new Response(csv,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}}));
      }
      return Promise.reject(new TypeError('QA_UNMOCKED_FETCH '+url.hostname+url.pathname));
    };
  },{seed,online,info,pub:NEW_PUB,endpoint:ENDPOINT});
}

function storageSnapshot(page){
  return page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('trip_data_snapshot_state')||'null');
    return {
      mode:TripLifecycle.readState(localStorage).mode,
      source:JSON.parse(localStorage.getItem('trip_source')||'null'),
      pending:localStorage.getItem('trip_connect_pending'),
      snapshotKey:state&&state.active?state.active.sourceKey:null
    };
  });
}

test('全新手機顯示「尚未連接旅程」，首頁與設定都能進入連接頁',async({page})=>{
  const errors=collectPageErrors(page);
  await installDevice(page,{online:false});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'尚未連接旅程'})).toBeVisible();
  expect(await page.evaluate(()=>({snapshot:CURRENT_SNAPSHOT,title:document.getElementById('brandTitle').textContent,inactive:document.body.classList.contains('trip-inactive')})))
    .toEqual({snapshot:null,title:'TripPilot',inactive:true});
  const state=await storageSnapshot(page);
  expect(state).toEqual({mode:'unconnected',source:null,pending:null,snapshotKey:null});
  await page.getByRole('button',{name:'連接新旅程'}).click();
  await expect(page.locator('#settingsTitle')).toHaveText('連接新旅程');
  await expect(page.locator('#connectTripLink')).toBeVisible();
  await page.evaluate(()=>openSettings('root'));
  await expect(page.locator('#settingsOverlay').getByRole('button',{name:/連接新旅程/})).toBeVisible();
  await expect(page.locator('#settingsOverlay').getByRole('button',{name:/過往旅程/})).toBeVisible();
  expect(errors).toEqual([]);
});

test('貼上發布連結 → 預覽 → 確認後重新開啟並改用新旅程',async({page})=>{
  const errors=collectPageErrors(page);
  await installDevice(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'連接新旅程'}).click();

  await page.locator('#connectTripLink').fill('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp/edit#gid=0');
  await page.getByRole('button',{name:'檢查連結'}).click();
  await expect(page.getByRole('alert')).toContainText('編輯連結');
  expect((await storageSnapshot(page)).mode).toBe('unconnected');

  await page.locator('#connectTripLink').fill(NEW_LINK);
  await page.getByRole('button',{name:'檢查連結'}).click();
  await expect(page.getByRole('heading',{name:'九州測試旅程'})).toBeVisible();
  await expect(page.locator('.settings-panel')).toContainText('2026-10-18 ～ 2026-10-23 · 6 天');
  await expect(page.locator('.settings-panel')).toContainText('已加入的成員：還沒有人加入');
  expect(await storageSnapshot(page)).toEqual({mode:'unconnected',source:null,pending:null,snapshotKey:null});
  expect(await page.evaluate(()=>window.__qaFetches.some(entry=>entry.indexOf('script.google.com')===0&&entry.indexOf('action=info')>0))).toBe(true);

  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button',{name:'確認連接'}).click()
  ]);
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  await expect(page.locator('#brandTitle')).toHaveText('九州測試旅程');
  const state=await storageSnapshot(page);
  expect(state.mode).toBe('active');
  expect(state.pending).toBeNull();
  expect(state.snapshotKey).toBe('sheet:kyushu-2027');
  expect(state.source).toMatchObject({version:1,kind:'sheet',pubId:NEW_PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州測試旅程'});
  expect(await page.evaluate(()=>({key:currentTripSourceKey(),pub:currentPubBase().indexOf(window.TripSource.pubBaseFor(JSON.parse(localStorage.getItem('trip_source')).pubId))===0,endpoint:currentLedgerEndpoint()})))
    .toEqual({key:'sheet:kyushu-2027',pub:true,endpoint:ENDPOINT});
  expect(errors).toEqual([]);
});

test('Ledger Endpoint 屬於另一份試算表時拒絕連接，手機維持未連接',async({page})=>{
  const errors=collectPageErrors(page);
  await installDevice(page,{info:{ok:true,tripId:'someone-else',ledgerHeaderOk:true}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'連接新旅程'}).click();
  await page.locator('#connectTripLink').fill(NEW_LINK);
  await page.getByRole('button',{name:'檢查連結'}).click();
  await expect(page.getByRole('alert')).toContainText('另一份試算表');
  await expect(page.getByRole('button',{name:'確認連接'})).toHaveCount(0);
  expect(await storageSnapshot(page)).toEqual({mode:'unconnected',source:null,pending:null,snapshotKey:null});
  expect(errors).toEqual([]);
});

test('已有岡山紀錄的舊手機升級後沿用岡山旅程，不能直接連接新旅程',async({page})=>{
  const errors=collectPageErrors(page);
  await installDevice(page,{online:false,seed:{trip_member:'Bar',trip_checks:'{"10/18_0":true}'}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  await expect(page.getByRole('heading',{name:'尚未連接旅程'})).toHaveCount(0);
  const state=await storageSnapshot(page);
  expect(state.mode).toBe('active');
  expect(state.source).toMatchObject({version:1,kind:'legacy'});
  expect(await page.evaluate(()=>localStorage.getItem('trip_checks'))).toBe('{"10/18_0":true}');
  await page.evaluate(()=>openSettingsPage('connect'));
  await expect(page.locator('.settings-panel')).toContainText('清除並打包旅程');
  await expect(page.locator('#connectTripLink')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('連接後離線又沒有這趟的快照時，顯示下載畫面而不是岡山內建資料',async({page})=>{
  const errors=collectPageErrors(page);
  const source=JSON.stringify({version:1,kind:'sheet',pubId:NEW_PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州測試旅程',startDate:'2026-10-18',endDate:'2026-10-23',connectedAt:1});
  await installDevice(page,{online:false,seed:{trip_member:'Bar',trip_source:source}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#tripSourceDownload')).toContainText('需要連網下載九州測試旅程的行程');
  expect(await page.evaluate(()=>CURRENT_SNAPSHOT)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('trip_source'))).toBe(source);
  expect(errors).toEqual([]);
});

test('下載行程後，舊旅程的待送帳不會送到新旅程的 Endpoint',async({page})=>{
  const errors=collectPageErrors(page);
  const source=JSON.stringify({version:1,kind:'sheet',pubId:NEW_PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州測試旅程',startDate:'2026-10-18',endDate:'2026-10-23',connectedAt:1});
  await installDevice(page,{seed:{trip_member:'Bar',trip_source:source}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button',{name:'下載行程'}).click()
  ]);
  expect((await storageSnapshot(page)).snapshotKey).toBe('sheet:kyushu-2027');
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&syncInFlight===null);
  const result=await page.evaluate(async()=>{
    const posts=[];
    window.fetch=(input,init)=>{if(init&&init.method==='POST')posts.push(String(input));return Promise.reject(new TypeError('QA_BLOCKED'));};
    localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'old-okayama-1',recordType:'expense'}]));
    localStorage.setItem('trip_ledger_queue_owner','legacy');
    const flushed=await ledgerRepository.flushQueue();
    return {posts,flushed:{ok:flushed.ok,foreign:flushed.foreign},queue:localStorage.getItem('trip_ledger_queue')};
  });
  expect(result.posts).toEqual([]);
  expect(result.flushed).toEqual({ok:false,foreign:true});
  expect(result.queue).toContain('old-okayama-1');
  expect(errors).toEqual([]);
});

test('舊岡山手機的來源仍指向岡山的發布表與 Endpoint',async({page})=>{
  const errors=collectPageErrors(page);
  await installDevice(page,{online:false,seed:{trip_member:'Bar',trip_source:LEGACY_SOURCE}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  expect(await page.evaluate(()=>({key:currentTripSourceKey(),endpoint:currentLedgerEndpoint()===LEDGER_POST_URL}))).toEqual({key:'legacy',endpoint:true});
  expect(errors).toEqual([]);
});

test('新旅程的手機拒絕還原岡山的舊備份，資料一字不動',async({page})=>{
  const errors=collectPageErrors(page);
  const source=JSON.stringify({version:1,kind:'sheet',pubId:NEW_PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州測試旅程',startDate:'2026-10-18',endDate:'2026-10-23',connectedAt:1});
  await installDevice(page,{seed:{trip_member:'Bar',trip_source:source,trip_checks:'{"10/19_1":true}'}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'下載行程'}).click()]);
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT);
  const exported=await page.evaluate(()=>JSON.parse(personalStateJson()).trip);
  expect(exported).toEqual({sourceKey:'sheet:kyushu-2027',tripId:'kyushu-2027',tripName:'九州測試旅程'});
  await page.evaluate(()=>openPersonalStateRestore());
  await page.locator('#personalStateBox').fill(JSON.stringify({format:'trip-personal-state',version:9,checks:{'10/18_0':true},wants:{},member:'Bar',ledgerQueue:[]}));
  await page.getByRole('button',{name:'驗證並還原'}).click();
  await expect(page.locator('#toast')).toContainText('這是舊版備份，只能還原到岡山旅程');
  expect(await page.evaluate(()=>localStorage.getItem('trip_checks'))).toBe('{"10/19_1":true}');
  expect(errors).toEqual([]);
});

test('新旅程同步後讀取「天氣地區」分頁，不再用岡山的固定城市清單',async({page})=>{
  const errors=collectPageErrors(page);
  const source=JSON.stringify({version:1,kind:'sheet',pubId:NEW_PUB,ledgerEndpoint:ENDPOINT,tripId:'kyushu-2027',tripName:'九州測試旅程',startDate:'2026-10-18',endDate:'2026-10-23',connectedAt:1});
  await installDevice(page,{seed:{trip_member:'Bar',trip_source:source}});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  expect(await page.evaluate(()=>weatherCityFromText('廣島本通'))).toBeNull();
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'下載行程'}).click()]);
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&DB.cfg.weatherRegionsGid==='999');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('trip_weather_regions'))).not.toBeNull();
  const result=await page.evaluate(()=>({
    stored:JSON.parse(localStorage.getItem('trip_weather_regions')),
    kurashiki:weatherCityFromText('倉敷美觀地區'),
    hiroshima:weatherCityFromText('廣島本通')
  }));
  expect(result.stored).toMatchObject({version:1,sourceKey:'sheet:kyushu-2027',gid:'999'});
  expect(result.kurashiki).toMatchObject({label:'岡山測試區',key:'r_34.662_133.935'});
  expect(result.hiroshima).toBeNull();
  expect(errors).toEqual([]);
});
