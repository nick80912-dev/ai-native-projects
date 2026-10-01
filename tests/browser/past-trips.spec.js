const {test,expect}=require('./support/test');
const {collectPageErrors,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

async function installDriveFixture(page,{corrupt=false,unsupported=false,unauthorized=false,noteText='旅程很棒',failUploadOnce=false}={}){
  await page.evaluate(async({corrupt,unsupported,unauthorized,noteText,failUploadOnce})=>{
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});
    window.google={accounts:{oauth2:{initTokenClient(config){return {requestAccessToken(){config.callback({access_token:'qa-token',expires_in:3600});}};}}}};
    const sheets={};SHEETS.forEach(item=>{sheets[item.key]={csv:BUILTIN[item.key],sourceTime:'2026-10-01T00:00:00.000Z'};});
    const input={archiveId:'qa-archive-1',sourceSheetId:'qa-sheet',trip:{name:'岡山回憶',startDate:'2026-10-18',endDate:'2026-10-23'},
      archivedAt:'2026-10-24T00:00:00.000Z',sheets,personal:{checks:{},nextStopProgress:{},wants:{},
        shoppingItems:[{id:'buy-1',name:'白桃果醬',unit:'罐',done:true,allocations:[{allocationId:'allocation-1',target:'Jane',quantity:2,ledgerLinks:[{recordId:'personal-1',track:'personal'}]}]}],
        personalLedger:[{id:'personal-1',detail:'白桃果醬',amountJpy:1800,amountTwd:400,proxyTarget:'Jane'}],proxyTargets:[],ledgerCategories:[],ledgerPayMethods:[],shoppingUnits:[],travelNotes:[],member:'Bar',themeId:'ocean'}};
    let archiveText=await TripArchive.serialize(input);
    if(corrupt)archiveText=archiveText.replace('岡山回憶','被竄改的旅程');
    if(unsupported){const old=JSON.parse(archiveText);old.version=99;archiveText=JSON.stringify(old);}
    const notes=[{id:'note-1',text:noteText,createdAt:'2026-10-25T00:00:00.000Z'}];
    window.__qaNoteUploadIds=[];
    window.fetch=(input,options)=>{
      const url=new URL(String(input&&input.url||input),location.href);
      const json=value=>Promise.resolve(new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}}));
      if(url.pathname.endsWith('/about'))return unauthorized?Promise.resolve(new Response('',{status:401})):json({user:{emailAddress:'bar@example.com',permissionId:'account-1'}});
      if(url.pathname.endsWith('/files')&&url.searchParams.has('q')){
        const query=url.searchParams.get('q')||'';
        if(query.includes("trippilot_kind' and value='archive'"))return json({files:[{id:'file-1',name:'TripPilot-qa-archive-1.json',createdTime:'2026-10-24T00:00:00.000Z',appProperties:{trippilot_kind:'archive',trippilot_archive_id:'qa-archive-1',trippilot_status:'complete'}}]});
        if(query.includes("trippilot_kind' and value='note'")){
          const match=query.match(/trippilot_note_id' and value='([^']+)'/);
          return json({files:notes.filter(note=>!match||note.id===match[1]).map((note,index)=>({id:'note-file-'+(notes.indexOf(note)+1),createdTime:note.createdAt,appProperties:{trippilot_kind:'note',trippilot_archive_id:'qa-archive-1',trippilot_note_id:note.id,trippilot_status:'complete'}}))});
        }
        return json({files:[]});
      }
      if(url.pathname.includes('/upload/drive/v3/files')&&options&&options.method==='POST')return Promise.resolve(new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/session-1'}}));
      if(url.pathname.endsWith('/files')&&options&&options.method==='POST')return json({id:'folder-1'});
      if(url.pathname.endsWith('/upload/session-1')&&options&&options.method==='PUT'){
        const uploaded=JSON.parse(options.body);window.__qaNoteUploadIds.push(uploaded.id);
        if(failUploadOnce&&window.__qaNoteUploadIds.length===1)return Promise.resolve(new Response('',{status:503}));
        notes.push(uploaded);return json({id:'note-file-'+notes.length});
      }
      if(url.pathname.includes('/files/note-file-')&&options&&options.method==='PATCH')return json({id:url.pathname.split('/').pop(),appProperties:{trippilot_status:'complete'}});
      if(url.pathname.endsWith('/files/file-1')&&url.searchParams.get('alt')==='media')return Promise.resolve(new Response(archiveText,{status:200}));
      if(url.pathname.includes('/files/note-file-')&&url.searchParams.get('alt')==='media'){
        const index=Number(url.pathname.split('note-file-')[1])-1;return Promise.resolve(new Response(JSON.stringify(notes[index]),{status:200}));
      }
      return Promise.reject(new TypeError('Unexpected fake Drive request: '+url.pathname));
    };
  },{corrupt,unsupported,unauthorized,noteText,failUploadOnce});
}

test('設定資料子項直達過往旅程，返回設定首頁',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:/^過往旅程/}).click();
  await expect(page.getByRole('button',{name:/岡山回憶/})).toBeVisible();
  await page.getByRole('button',{name:'返回設定',exact:true}).click();
  await expect(page.getByRole('heading',{name:'設定',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^過往旅程/})).toBeVisible();
  await page.getByRole('button',{name:/備份、還原與版本資訊/}).click();
  await expect(page.getByRole('button',{name:/^過往旅程/})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('直接進入過往旅程時先準備 Google 登入，下一次點擊才發起授權',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>{delete window.google;openSettings('root');});
  let releaseScript;
  const ready=new Promise(resolve=>{releaseScript=resolve;});
  await page.route('https://accounts.google.com/gsi/client',async route=>{
    await ready;
    await route.fulfill({contentType:'application/javascript',body:"window.google={accounts:{oauth2:{initTokenClient:function(config){return {requestAccessToken:function(){window.__qaGrantCount=(window.__qaGrantCount||0)+1;config.callback({access_token:'qa-token',expires_in:3600});}};}}}};"});
  });
  await page.getByRole('button',{name:/^過往旅程/}).click();
  await expect(page.locator('#settingsOverlay')).toContainText('正在準備 Google 登入');
  releaseScript();
  await expect(page.getByRole('button',{name:'連接 Google Drive'})).toBeVisible();
  expect(await page.evaluate(()=>window.__qaGrantCount||0)).toBe(0);
  await page.getByRole('button',{name:'連接 Google Drive'}).click();
  await expect(page.getByRole('button',{name:/岡山回憶/})).toBeVisible();
  expect(await page.evaluate(()=>window.__qaGrantCount)).toBe(1);
  expect(errors).toEqual([]);
});

test('清除後的首頁與設定入口都直達過往旅程',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>{
    localStorage.setItem('trip_lifecycle_state',JSON.stringify({version:1,mode:'complete'}));
    renderInactiveHome();
  });
  await page.getByRole('button',{name:'過往旅程',exact:true}).click();
  await expect(page.getByRole('heading',{name:'過往旅程',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/岡山回憶/})).toBeVisible();
  await page.getByRole('button',{name:'返回設定',exact:true}).click();
  await page.locator('#settingsOverlay').getByRole('button',{name:/^過往旅程/}).click();
  await expect(page.getByRole('button',{name:/岡山回憶/})).toBeVisible();
  expect(await page.evaluate(()=>CURRENT_SNAPSHOT)).toBeNull();
  expect(errors).toEqual([]);
});

test('過往旅程只讀顯示封存，回顧筆記文字不執行 HTML',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page,{noteText:'<img src=x onerror=alert(1)> 很棒'});
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await expect(page.getByRole('button',{name:/岡山回憶/})).toBeVisible();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await expect(page.getByRole('heading',{name:'岡山回憶'})).toBeVisible();
  await expect(page.locator('#settingsOverlay')).toContainText('<img src=x onerror=alert(1)> 很棒');
  await expect(page.locator('#settingsOverlay img')).toHaveCount(0);
  await expect(page.locator('#settingsOverlay button',{hasText:/編輯|刪除/})).toHaveCount(0);
  await page.locator('summary').filter({hasText:/^採買紀錄$/}).click();
  await expect(page.locator('.past-trip-readable')).toContainText('白桃果醬');
  await expect(page.locator('.past-trip-readable')).toContainText('對象：Jane');
  await expect(page.locator('.past-trip-readable')).toContainText('數量：2');
  await page.locator('summary').filter({hasText:/^個人帳務$/}).click();
  await expect(page.locator('.past-trip-readable')).toContainText('1800');
  await expect(page.locator('.past-trip-readable')).toContainText('400');
  await page.setViewportSize({width:320,height:700});
  const overflow=await page.evaluate(()=>{
    const panel=document.querySelector('#settingsOverlay .settings-panel');
    return panel.scrollWidth>panel.clientWidth||document.documentElement.scrollWidth>document.documentElement.clientWidth;
  });
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test('封存 checksum 損壞時顯示錯誤，不冒充沒有封存',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page,{corrupt:true});
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await expect(page.locator('#settingsOverlay')).toContainText(/校驗|完整性|損壞/);
  await expect(page.locator('#settingsOverlay')).not.toContainText('尚無過往旅程');
  expect(errors).toEqual([]);
});

test('未知封存格式顯示不支援而不是空清單',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page,{unsupported:true});
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await expect(page.locator('#settingsOverlay')).toContainText('封存格式不支援');
  await expect(page.locator('#settingsOverlay')).not.toContainText('尚無過往旅程');
  expect(errors).toEqual([]);
});

test('離線及 Google 401 各顯示可重試狀態',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await expect(page.locator('#settingsOverlay')).toContainText('離線');
  await installDriveFixture(page,{unauthorized:true});
  await page.getByRole('button',{name:'重新登入並重試'}).click();
  await expect(page.locator('#settingsOverlay')).toContainText('重新登入');
  await expect(page.locator('#settingsOverlay')).not.toContainText('尚無過往旅程');
  expect(errors).toEqual([]);
});

test('新增回顧筆記後重新讀回，原筆記保持不變',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('旅程很棒');
  await page.locator('#pastTripNoteText').fill('下次再來');
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('下次再來');
  await expect(page.locator('.past-trip-notes article')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('筆記上傳失敗後重試沿用同一 note ID',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page,{failUploadOnce:true});
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await page.locator('#pastTripNoteText').fill('下次再來');
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.locator('#pastTripNoteStatus')).toContainText('筆記未儲存');
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('下次再來');
  const ids=await page.evaluate(()=>window.__qaNoteUploadIds);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(errors).toEqual([]);
});

test('關閉過往旅程後，晚到的 Drive 回應不留前帳號內容',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>{
    const original=window.fetch;
    window.fetch=(input,options)=>{
      const url=new URL(String(input&&input.url||input),location.href);
      if(url.pathname.endsWith('/files')&&url.searchParams.has('q')&&(url.searchParams.get('q')||'').includes("trippilot_kind' and value='archive'")){
        return new Promise(resolve=>{window.__qaReleaseList=()=>resolve(original(input,options));});
      }
      return original(input,options);
    };
    openSettings('root');
  });
  await page.getByRole('button',{name:'過往旅程'}).click();
  await page.waitForFunction(()=>typeof window.__qaReleaseList==='function');
  await page.evaluate(()=>{closeSettings();window.__qaReleaseList();});
  await page.waitForTimeout(30);
  expect(await page.evaluate(()=>({status:pastTripsUi.status,count:pastTripsUi.archives.length,account:pastTripsUi.account})))
    .toEqual({status:'idle',count:0,account:null});
  expect(errors).toEqual([]);
});

test('筆記清單讀回失敗保留草稿及 retry ID，重試不重複上傳',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await installDriveFixture(page);
  await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('旅程很棒');
  await page.evaluate(()=>{
    const original=window.fetch;let failed=false;
    window.fetch=(input,options)=>{
      const url=new URL(String(input&&input.url||input),location.href),query=url.searchParams.get('q')||'';
      if(!failed&&window.__qaNoteUploadIds.length&&query.includes("trippilot_kind' and value='note'")&&!query.includes('trippilot_note_id')){
        failed=true;return Promise.resolve(new Response('',{status:503}));
      }
      return original(input,options);
    };
  });
  await page.locator('#pastTripNoteText').fill('保留這段回憶');
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.locator('#pastTripNoteStatus')).toContainText('筆記未儲存');
  await expect(page.locator('#pastTripNoteText')).toHaveValue('保留這段回憶');
  const noteId=await page.evaluate(()=>pastTripsUi.noteDraft.id);
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('保留這段回憶');
  expect(await page.evaluate(()=>window.__qaNoteUploadIds)).toEqual([noteId]);
  expect(errors).toEqual([]);
});

test('筆記儲存中切換旅程，不會讓新旅程的新增按鈕永久停用',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await installDriveFixture(page);await page.evaluate(()=>openSettings('root'));
  await page.getByRole('button',{name:'過往旅程'}).click();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('旅程很棒');
  await page.evaluate(()=>{
    const second=JSON.parse(JSON.stringify(pastTripsUi.archives[0]));second.archive.archiveId='second';second.archive.trip.name='第二趟旅程';
    pastTripsUi.archives.push(second);rerenderOpenSettingsPage();
    tripDrive().appendNote=()=>new Promise(resolve=>{window.__qaReleaseNote=resolve;});
  });
  await page.locator('#pastTripNoteText').fill('第一趟的筆記');
  await page.getByRole('button',{name:'新增回顧筆記'}).click();
  await expect(page.getByRole('button',{name:'新增回顧筆記'})).toBeDisabled();
  await page.getByRole('button',{name:/第二趟旅程/}).click();
  await expect(page.getByRole('button',{name:'新增回顧筆記'})).toBeEnabled();
  await page.getByRole('button',{name:/岡山回憶/}).click();
  await expect(page.locator('.past-trip-notes')).toContainText('旅程很棒');
  await page.locator('#pastTripNoteText').fill('回來後的新草稿');
  await page.evaluate(()=>window.__qaReleaseNote('note-file'));
  await expect(page.getByRole('heading',{name:'岡山回憶'})).toBeVisible();
  await expect(page.locator('#pastTripNoteText')).toHaveValue('回來後的新草稿');
  await expect(page.getByRole('button',{name:'新增回顧筆記'})).toBeEnabled();
  expect(await page.evaluate(()=>pastTripsUi.noteDraft)).toBeNull();
  expect(errors).toEqual([]);
});
