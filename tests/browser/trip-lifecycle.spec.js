const {test,expect,trackPageErrors}=require('./support/test');
const {collectPageErrors,installOfflineAppNetwork,installOnlineSheetMock,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test('設定可重置個人紀錄，離線時保留團體待送資料與身分',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    localStorage.setItem('trip_checks',JSON.stringify({stop:true}));
    localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'pending-1'}]));
    openSettings('data');
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'重置紀錄'}).click();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('trip_checks'))).toBeNull();
  expect(await page.evaluate(()=>({member:localStorage.getItem('trip_member'),queue:localStorage.getItem('trip_ledger_queue')})))
    .toEqual({member:'Bar',queue:'[{"id":"pending-1"}]'});
  expect(errors).toEqual([]);
});

test('完整線上預檢不能使用失敗的 Ledger 快取',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    window.fetch=(input)=>{
      const url=new URL(String(input&&input.url||input),location.href);
      if(url.searchParams.get('gid')===String(SHEETS.find(item=>item.key==='ledger').gid))return Promise.reject(new TypeError('QA_LEDGER_UNAVAILABLE'));
      const sheet=SHEETS.find(item=>String(item.gid)===url.searchParams.get('gid'));
      return sheet?Promise.resolve(new Response(BUILTIN[sheet.key],{status:200})):Promise.reject(new TypeError('QA_UNMOCKED_FETCH'));
    };
  });
  const result=await page.evaluate(()=>{
    if(typeof freshEndPreflight!=='function')return {missing:true};
    return freshEndPreflight().then(()=>({ok:true}),error=>({error:String(error&&error.message||error)}));
  });
  expect(result.missing).toBeUndefined();
  expect(result.ok).toBeUndefined();
  expect(result.error).toMatch(/Ledger|分帳|下載|連線|逾時|QA_LEDGER_UNAVAILABLE/);
  expect(await page.evaluate(()=>TripLifecycle.readState(localStorage).mode)).toBe('active');
  expect(errors).toEqual([]);
});

test('八表回應順序不同但內容相同時，封存預檢摘要一致',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  const digests=await page.evaluate(async()=>{
    let count=0;
    window.fetch=input=>{
      const url=new URL(String(input&&input.url||input),location.href);
      const index=SHEETS.findIndex(item=>String(item.gid)===url.searchParams.get('gid'));
      if(index<0)return Promise.reject(new TypeError('Unexpected fetch'));
      const batch=Math.floor(count++/SHEETS.length);
      const delay=batch===0?index*8:(SHEETS.length-index)*8;
      return new Promise(resolve=>setTimeout(()=>resolve(new Response(BUILTIN[SHEETS[index].key],{status:200})),delay));
    };
    const first=await freshEndPreflight();
    const second=await freshEndPreflight();
    return [first.digest,second.digest];
  });
  expect(digests[0]).toBe(digests[1]);
  expect(errors).toEqual([]);
});

test('本機團體佇列未送達時，不顯示保存或直接清除選項',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    localStorage.setItem('trip_ledger_queue',JSON.stringify([{id:'not-delivered'}]));
    openSettings('data');
  });
  await page.getByRole('button',{name:'清除並打包旅程'}).click();
  await expect(page.locator('#tripEndStatus')).toContainText(/待同步|佇列|無法清除/);
  await expect(page.getByRole('button',{name:'保存到過往旅程'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'不保存，直接清除'})).toHaveCount(0);
  expect(await page.evaluate(()=>TripLifecycle.readState(localStorage).mode)).toBe('active');
  expect(errors).toEqual([]);
});

test('不保存直接清除後，線上與離線重啟都不恢復舊成員和快照',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  // The shared QA fixture clears localStorage on every navigation; preserve only
  // the lifecycle marker across this reload so it models a real installed PWA.
  await page.addInitScript(()=>{
    const marker=sessionStorage.getItem('qa_lifecycle_marker');
    if(marker)localStorage.setItem('trip_lifecycle_state',marker);
  });
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('data'));
  await page.getByRole('button',{name:'清除並打包旅程'}).click();
  await expect(page.getByRole('button',{name:'不保存，直接清除'})).toBeVisible();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'不保存，直接清除'}).click();
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  expect(await page.evaluate(()=>({member:localStorage.getItem('trip_member'),queue:localStorage.getItem('trip_ledger_queue'),state:TripLifecycle.readState(localStorage).mode})))
    .toEqual({member:null,queue:null,state:'complete'});
  await page.evaluate(()=>sessionStorage.setItem('qa_lifecycle_marker',localStorage.getItem('trip_lifecycle_state')));
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  expect(await page.evaluate(()=>CURRENT_SNAPSHOT)).toBeNull();
  expect(errors).toEqual([]);
});

test('保存分支以授權帳號上傳讀回後才清除本機旅程',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    const sheetFetch=window.fetch;
    window.__qaDrive={uploaded:null,status:'prepared',scope:null,clientId:null};
    window.google={accounts:{oauth2:{initTokenClient(config){
      window.__qaDrive.scope=config.scope;window.__qaDrive.clientId=config.client_id;
      return {requestAccessToken(){config.callback({access_token:'qa-token',expires_in:3600});}};
    }}}};
    window.fetch=(input,options)=>{
      const url=new URL(String(input&&input.url||input),location.href);
      if(url.hostname==='docs.google.com')return sheetFetch(input,options);
      const json=value=>Promise.resolve(new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}}));
      if(url.pathname.endsWith('/about'))return json({user:{emailAddress:'bar@example.com',permissionId:'account-1'}});
      if(url.pathname.endsWith('/files')&&url.searchParams.has('q'))return json({files:[]});
      if(url.pathname.includes('/upload/drive/v3/files')&&options&&options.method==='POST')return Promise.resolve(new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/qa-session'}}));
      if(url.pathname.endsWith('/upload/qa-session')&&options&&options.method==='PUT'){
        window.__qaDrive.uploaded=options.body;return json({id:'archive-file-1'});
      }
      if(url.pathname.endsWith('/files')&&options&&options.method==='POST')return json({id:'folder-1'});
      if(url.pathname.endsWith('/files/archive-file-1')&&url.searchParams.get('alt')==='media')return Promise.resolve(new Response(window.__qaDrive.uploaded,{status:200}));
      if(url.pathname.endsWith('/files/archive-file-1')&&options&&options.method==='PATCH'){
        window.__qaDrive.status='complete';return json({id:'archive-file-1',appProperties:{trippilot_status:'complete'}});
      }
      if(url.pathname.endsWith('/files/archive-file-1'))return json({id:'archive-file-1',appProperties:{trippilot_kind:'archive',trippilot_archive_id:JSON.parse(window.__qaDrive.uploaded).archiveId,trippilot_status:window.__qaDrive.status}});
      return Promise.reject(new TypeError('Unexpected fake Drive request: '+url.pathname));
    };
    openSettings('data');
  });
  await page.getByRole('button',{name:'清除並打包旅程'}).click();
  await expect(page.getByRole('button',{name:'保存到過往旅程'})).toBeVisible();
  await page.getByRole('button',{name:'保存到過往旅程'}).click();
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  const state=await page.evaluate(async()=>({
    scope:window.__qaDrive.scope,clientId:window.__qaDrive.clientId,status:window.__qaDrive.status,
    archive:await TripArchive.parseVerified(window.__qaDrive.uploaded),
    lifecycle:TripLifecycle.readState(localStorage).mode,member:localStorage.getItem('trip_member')
  }));
  expect(state.scope).toBe('https://www.googleapis.com/auth/drive.file');
  expect(state.clientId).toBe('812330004270-6limrm2sl15s3aohum4nrnas97kopfma.apps.googleusercontent.com');
  expect(state.status).toBe('complete');
  expect(state.archive.trip.name).toContain('岡山');
  expect(state.archive.sourceSheetId).toBe('1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw');
  expect(state.lifecycle).toBe('complete');
  expect(state.member).toBeNull();
  expect(errors).toEqual([]);
});

test('本機照片清理失敗後保持空白並可重試，不聲稱原旅程已保留',async({page})=>{
  const errors=collectPageErrors(page);
  await installOnlineSheetMock(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('data'));
  await page.getByRole('button',{name:'清除並打包旅程'}).click();
  await expect(page.getByRole('button',{name:'不保存，直接清除'})).toBeVisible();
  await page.evaluate(()=>{window.__qaOriginalClearAll=shoppingPhotoStore.clearAll;shoppingPhotoStore.clearAll=()=>Promise.reject(new Error('QA_IDB_BLOCKED'));});
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'不保存，直接清除'}).click();
  await expect.poll(()=>page.evaluate(()=>TripLifecycle.readState(localStorage).mode)).toBe('cleanup-pending');
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  await expect(page.getByRole('button',{name:'重試本機清理'})).toBeVisible();
  expect(await page.locator('#view-today').textContent()).not.toContain('TODAY · DAY');
  await page.evaluate(()=>{shoppingPhotoStore.clearAll=window.__qaOriginalClearAll;});
  await page.getByRole('button',{name:'重試本機清理'}).click();
  await expect.poll(()=>page.evaluate(()=>TripLifecycle.readState(localStorage).mode)).toBe('complete');
  await expect(page.getByRole('button',{name:'重試本機清理'})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('inactive 旅程在重載時不啟動舊快照、同步或團體帳補送',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>localStorage.setItem('trip_lifecycle_state',JSON.stringify({mode:'complete',archiveId:null})));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  expect(await page.evaluate(()=>({snapshot:CURRENT_SNAPSHOT,sync:syncInFlight,tabs:document.querySelector('.tabbar').getBoundingClientRect().height}))).toEqual({snapshot:null,sync:null,tabs:0});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  const fastPullCalls=await page.evaluate(async()=>{
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});
    let calls=0;window.fetch=()=>{calls++;return Promise.resolve(new Response('{}',{status:200}));};
    await ledgerFastPull('qa-inactive');
    return calls;
  });
  expect(fastPullCalls).toBe(0);
  expect(errors).toEqual([]);
});

test('另一分頁清除旅程時，已開啟分頁立即移除舊行程與操作層',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>openSettings('data'));
  expect(await page.evaluate(()=>!!DB.trip)).toBe(true);
  const other=await page.context().newPage();
  const otherErrors=trackPageErrors(other);
  await other.goto(page.url(),{waitUntil:'domcontentloaded'});
  await other.evaluate(()=>localStorage.setItem('trip_lifecycle_state',JSON.stringify({mode:'cleanup-pending',archiveId:null})));
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  expect(await page.evaluate(()=>({trip:DB.trip,title:document.getElementById('brandTitle').textContent,
    inactive:document.body.classList.contains('trip-inactive'),settings:!!document.getElementById('settingsOverlay')})))
    .toEqual({trip:null,title:'TripPilot',inactive:true,settings:false});
  await other.close();
  otherErrors.assert();otherErrors.dispose();
  expect(errors).toEqual([]);
});

test('清除後晚到的照片壓縮不寫入附件或復活採買表單',async({page})=>{
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    openShoppingList();startShoppingAdd();
    window.__qaPhotoPuts=0;
    TripShoppingPhotos.compressImage=()=>new Promise(resolve=>{window.__qaReleaseCompression=resolve;});
    shoppingPhotoStore.put=()=>{window.__qaPhotoPuts++;return Promise.resolve('late-photo');};
    window.__qaPhotoOperation=selectShoppingPhoto({files:[new File(['photo'],'photo.png',{type:'image/png'})]});
    localStorage.setItem('trip_lifecycle_state',JSON.stringify({mode:'complete',archiveId:null}));
    window.dispatchEvent(new StorageEvent('storage',{key:'trip_lifecycle_state'}));
    window.__qaReleaseCompression(new Blob(['photo'],{type:'image/jpeg'}));
  });
  const result=await page.evaluate(async()=>{await window.__qaPhotoOperation;return {puts:window.__qaPhotoPuts,
    session:shoppingUiState.formSession,form:!!document.getElementById('shoppingFormSheet')};});
  expect(result).toEqual({puts:0,session:null,form:false});
  await expect(page.getByText('目前沒有進行中的旅程')).toBeVisible();
  expect(errors).toEqual([]);
});
