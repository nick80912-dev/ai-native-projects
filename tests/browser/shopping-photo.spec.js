const {test,expect}=require('./support/test');
const fs=require('fs');
const {collectPageErrors,waitForSyncToSettle}=require('./support/qa-fixture');

test.describe.configure({mode:'serial'});

const PNG=fs.readFileSync('icon-16.png');
const WIDTHS=[{width:320,height:700},{width:375,height:812},{width:390,height:844}];

async function installPersistentOfflineMode(page){
  await page.addInitScript(()=>{
    try{Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});}catch(ignore){}
    window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
  });
}

async function openPhotoQaApp(page){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    return route.fulfill({status:204,body:''});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof syncInFlight!=='undefined');
}

async function seedShoppingItem(page){
  await page.evaluate(()=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_shopping_list',JSON.stringify([{
      id:'photo-item',name:'藥妝對照品',category:'必買',unit:'盒',legacyQtyText:'',
      allocations:[{allocationId:'photo-item-allocation-1',target:'',quantity:1,ledgerLinks:[]}],
      stopRef:'',done:false,createdAt:'2026-08-01T04:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''
    }]));
    openShoppingList();
    startShoppingEdit('photo-item','list');
  });
}

async function indexedDbPhotoIds(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('trip-local-media',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('shopping-photos')){resolve([]);db.close();return;}
      const keys=db.transaction('shopping-photos','readonly').objectStore('shopping-photos').getAllKeys();
      keys.onerror=()=>reject(keys.error);
      keys.onsuccess=()=>{resolve(keys.result.map(String));db.close();};
    };
  }));
}

async function deleteIndexedDbPhoto(page,id){
  await page.evaluate(id=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('trip-local-media',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction('shopping-photos','readwrite');
      tx.objectStore('shopping-photos').delete(id);
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    };
  }),id);
}

async function putIndexedDbPhotoRecords(page,records){
  const bytes=Array.from(PNG);
  await page.evaluate(({records,bytes})=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('trip-local-media',1);
    request.onerror=()=>reject(request.error);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('shopping-photos'))db.createObjectStore('shopping-photos',{keyPath:'id'});
    };
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction('shopping-photos','readwrite');
      const store=tx.objectStore('shopping-photos');
      records.forEach(record=>store.put({
        id:record.id,
        blob:new Blob([new Uint8Array(bytes)],{type:'image/png'}),
        createdAt:record.createdAt
      }));
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    };
  }),{records,bytes});
}

async function openStoredPhotoViewer(page){
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  await seedShoppingItem(page);
  await page.locator('#shoppingPhotoInput').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:PNG});
  await page.waitForFunction(()=>shoppingUiState.form&&/^shopping-photo-/.test(shoppingUiState.form.photoId||''));
  await page.locator('#shoppingFormSheet button[type=submit]').click();
  await page.locator('[data-shopping-item-id="photo-item"] .shopping-item-body').click();
  await page.getByRole('button',{name:'查看照片'}).click();
  const viewer=page.locator('#shoppingPhotoViewer');
  await expect(viewer).toBeVisible();
  await page.waitForFunction(()=>{
    const image=document.querySelector('#shoppingPhotoViewer img');
    return image&&image.naturalWidth>0&&image.naturalHeight>0;
  });
  return viewer;
}

async function createStoredPhotoItem(page){
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  await seedShoppingItem(page);
  await page.locator('#shoppingPhotoInput').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:PNG});
  await page.waitForFunction(()=>shoppingUiState.form&&/^shopping-photo-/.test(shoppingUiState.form.photoId||''));
  const photoId=await page.evaluate(()=>shoppingUiState.form.photoId);
  await page.locator('#shoppingFormSheet button[type=submit]').click();
  await page.waitForFunction(id=>shoppingPhotoAuditState.ready&&shoppingPhotoAuditState.validPhotoIds.includes(id),photoId);
  return photoId;
}

async function seedPhotoStorageManagement(page){
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  const now=Date.now();
  await putIndexedDbPhotoRecords(page,[
    {id:'settings-valid',createdAt:new Date(now-3*24*60*60*1000).toISOString()},
    {id:'settings-old-orphan',createdAt:new Date(now-2*24*60*60*1000).toISOString()},
    {id:'settings-young-orphan',createdAt:new Date(now-60*60*1000).toISOString()}
  ]);
  await page.evaluate(async()=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_shopping_list',JSON.stringify([
      {id:'settings-valid-item',name:'有效附件',category:'必買',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'valid-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T01:00:00.000Z',completedAt:'',splitGroupId:'',photoId:'settings-valid'},
      {id:'settings-missing-item',name:'遺失附件',category:'必買',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'missing-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T02:00:00.000Z',completedAt:'',splitGroupId:'',photoId:'settings-missing'}
    ]));
    await refreshShoppingPhotoAudit({force:true,reason:'qa-settings-seed'});
    openShoppingList();
    openSettings('root');
  });
}

test('照片檢視器頂部操作列會把安全區留在關閉按鈕上方',async({page})=>{
  const viewer=await openStoredPhotoViewer(page);
  const layout=await viewer.evaluate(element=>{
    let headRule=null;
    Array.from(document.styleSheets).some(sheet=>{
      let rules=[];try{rules=Array.from(sheet.cssRules||[]);}catch(ignore){return false;}
      return rules.some(rule=>{
        if(rule.selectorText==='.shopping-photo-viewer-head'){headRule=rule;return true;}
        return false;
      });
    });
    if(!headRule)throw new Error('missing photo viewer head rule');
    headRule.style.padding=headRule.style.padding.replace('env(safe-area-inset-top)','47px');
    const head=element.querySelector('.shopping-photo-viewer-head');
    const close=element.querySelector('.shopping-photo-viewer-close');
    const style=getComputedStyle(head),rect=close.getBoundingClientRect();
    return {paddingTop:parseFloat(style.paddingTop),paddingBottom:parseFloat(style.paddingBottom),closeTop:rect.top};
  });
  expect(layout.paddingTop).toBe(55);
  expect(layout.paddingBottom).toBe(8);
  expect(layout.closeTop).toBeGreaterThanOrEqual(47);
});

test('照片檢視器向下滑動可關閉',async({page})=>{
  const viewer=await openStoredPhotoViewer(page);
  await viewer.evaluate(element=>{
    function touch(y){
      return new Touch({identifier:7,target:element,clientX:180,clientY:y,pageX:180,pageY:y,screenX:180,screenY:y,radiusX:1,radiusY:1,rotationAngle:0,force:1});
    }
    const start=touch(180),end=touch(300);
    element.dispatchEvent(new TouchEvent('touchstart',{touches:[start],changedTouches:[start],bubbles:true,cancelable:true}));
    element.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[end],bubbles:true,cancelable:true}));
  });
  await expect(viewer).toHaveCount(0);
});

test('啟動稽核只清理滿 24 小時的孤立照片並保護有效附件',async({page})=>{
  await page.addInitScript(()=>{Date.now=()=>Date.parse('2026-08-01T00:00:00.000Z');});
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  await putIndexedDbPhotoRecords(page,[
    {id:'referenced-old',createdAt:'2026-07-01T00:00:00.000Z'},
    {id:'orphan-old',createdAt:'2026-07-30T00:00:00.000Z'},
    {id:'orphan-exact',createdAt:'2026-07-31T00:00:00.000Z'},
    {id:'orphan-young',createdAt:'2026-07-31T00:00:00.001Z'},
    {id:'orphan-unknown',createdAt:'invalid'}
  ]);
  await page.evaluate(()=>localStorage.setItem('trip_shopping_list',JSON.stringify([{
    id:'referenced-item',name:'有效附件',category:'必買',unit:'盒',legacyQtyText:'',
    allocations:[{allocationId:'referenced-item-allocation-1',target:'',quantity:1,ledgerLinks:[]}],
    stopRef:'',done:false,createdAt:'2026-07-31T00:00:00.000Z',completedAt:'',splitGroupId:'',photoId:'referenced-old'
  }])));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof shoppingPhotoAuditState==='object'&&shoppingPhotoAuditState.maintenanceComplete===true,null,{timeout:3000});
  expect((await indexedDbPhotoIds(page)).sort()).toEqual(['orphan-unknown','orphan-young','referenced-old']);
});

test('實體照片遺失只顯示警示圖示並可重新選擇照片',async({page})=>{
  const oldId=await createStoredPhotoItem(page);
  await deleteIndexedDbPhoto(page,oldId);
  await page.evaluate(()=>refreshShoppingPhotoAudit({force:true,reason:'qa-loss'}));
  const card=page.locator('[data-shopping-item-id="photo-item"]');
  const indicator=card.locator('.shopping-photo-indicator-invalid[aria-label="附件已遺失"]');
  await expect(indicator).toHaveCount(1);
  await expect(indicator.locator('svg')).toHaveCount(1);
  await expect(indicator.locator('.shopping-photo-warning-mark')).toHaveText('!');
  expect(await card.textContent()).not.toContain('附件已遺失');
  const box=await indicator.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(52);
  expect(box.height).toBeGreaterThanOrEqual(52);

  await indicator.click();
  const repair=page.locator('#shoppingPhotoRepair');
  await expect(repair).toBeVisible();
  await repair.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:PNG});
  await page.waitForFunction(oldId=>{
    const item=shoppingListStore.all().find(value=>value.id==='photo-item');
    return item&&item.photoId&&item.photoId!==oldId&&shoppingPhotoAuditState.validPhotoIds.includes(item.photoId);
  },oldId);
  const newId=await page.evaluate(()=>shoppingListStore.all().find(value=>value.id==='photo-item').photoId);
  expect(newId).not.toBe(oldId);
  expect(await indexedDbPhotoIds(page)).toContain(newId);
  await expect(card.locator('.shopping-photo-indicator[aria-label="有照片附件"]')).toHaveCount(1);
});

test('無效附件引用必須由使用者確認後移除',async({page})=>{
  const oldId=await createStoredPhotoItem(page);
  await deleteIndexedDbPhoto(page,oldId);
  await page.evaluate(()=>refreshShoppingPhotoAudit({force:true,reason:'qa-loss'}));
  await page.locator('.shopping-photo-indicator-invalid').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'移除附件引用'}).click();
  await expect(page.locator('#shoppingPhotoRepair')).toHaveCount(0);
  expect(await page.evaluate(()=>shoppingListStore.all().find(value=>value.id==='photo-item').photoId)).toBe('');
  await expect(page.locator('[data-shopping-item-id="photo-item"] .shopping-photo-indicator')).toHaveCount(0);
});

test('容量不足時保留原引用並在修復流程顯示 inline 提示',async({page})=>{
  const oldId=await createStoredPhotoItem(page);
  await deleteIndexedDbPhoto(page,oldId);
  await page.evaluate(async()=>{
    await refreshShoppingPhotoAudit({force:true,reason:'qa-loss'});
    shoppingPhotoStore.put=()=>Promise.reject(new DOMException('full','QuotaExceededError'));
  });
  await page.locator('.shopping-photo-indicator-invalid').click();
  await page.locator('#shoppingPhotoRepair input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:PNG});
  await expect(page.locator('#shoppingPhotoRepairStatus')).toContainText('儲存空間不足，照片尚未加入');
  const manageStorage=page.getByRole('button',{name:'管理儲存空間',exact:true});
  await expect(manageStorage).toBeVisible();
  await expect(page.locator('.shopping-photo-storage-failure')).toHaveCount(0);
  expect(await page.evaluate(()=>shoppingListStore.all().find(value=>value.id==='photo-item').photoId)).toBe(oldId);
  await manageStorage.click();
  await expect(page.locator('#shoppingPhotoRepair')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'照片健康狀態',exact:true})).toBeVisible();
});

test('照片 repository 不可用時停用照片操作但保留一般採買編輯',async({page})=>{
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  await seedShoppingItem(page);
  await page.evaluate(async()=>{
    shoppingPhotoStore.listMetadata=()=>Promise.reject(new Error('IDB unavailable'));
    await refreshShoppingPhotoAudit({force:true,reason:'qa-unavailable'});
    renderShoppingFormSheet();
  });
  await expect(page.locator('.shopping-photo-note[role="status"]')).toContainText('此裝置目前無法使用照片附件');
  await expect(page.locator('.shopping-photo-note[role="status"]')).toContainText('照片健康狀態');
  await expect(page.locator('#shoppingPhotoInput')).toBeDisabled();
  await page.locator('#shoppingName').fill('仍可編輯');
  await expect(page.locator('#shoppingName')).toHaveValue('仍可編輯');
});

test('設定頁集中顯示附件容量並可修復引用或手動清理孤立照片',async({page})=>{
  await seedPhotoStorageManagement(page);
  await page.getByRole('button',{name:/照片健康狀態/}).click();
  await expect(page.getByRole('heading',{name:'照片健康狀態'})).toBeVisible();
  await expect(page.getByText('App 附件',{exact:true})).toBeVisible();
  await expect(page.getByText(/3 張/)).toBeVisible();
  await expect(page.getByText('App 儲存空間（估計）',{exact:true})).toBeVisible();
  await expect(page.getByText(/1 個附件待修復/)).toBeVisible();
  await expect(page.getByText(/最近檢查/)).toBeVisible();

  await page.getByRole('button',{name:'修復 遺失附件'}).click();
  await expect(page.locator('#shoppingPhotoRepair')).toBeVisible();
  await page.locator('#shoppingPhotoRepair').getByRole('button',{name:'關閉'}).click();
  await page.evaluate(()=>openSettings('storage'));

  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:/清理未使用照片/}).click();
  await expect.poll(()=>indexedDbPhotoIds(page)).toEqual(['settings-valid']);
  expect(await page.evaluate(()=>shoppingListStore.all().find(item=>item.id==='settings-missing-item').photoId)).toBe('settings-missing');
});

test('六主題下附件管理文字、修復文字與警示迴紋針對比皆達 4.5',async({page})=>{
  await seedPhotoStorageManagement(page);
  const readings=await page.evaluate(async()=>{
    function rgb(value){const parts=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);return parts;}
    function luminance(value){return rgb(value).map(channel=>channel/255).map(channel=>channel<=.03928?channel/12.92:Math.pow((channel+.055)/1.055,2.4)).reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);}
    function contrast(foreground,background){const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
    const result={};
    for(const id of THEME_IDS){
      applyTheme(id,{persist:false});
      renderShoppingListOverlay();
      const indicator=document.querySelector('[data-shopping-item-id="settings-missing-item"] .shopping-photo-indicator-invalid');
      const card=indicator.closest('.shopping-item');
      const iconContrast=contrast(getComputedStyle(indicator).color,getComputedStyle(card).backgroundColor);
      openShoppingPhotoRepair('settings-missing-item',indicator);
      const repair=document.querySelector('#shoppingPhotoRepair .shopping-photo-repair-sheet');
      const repairBg=getComputedStyle(repair).backgroundColor;
      const repairTitle=contrast(getComputedStyle(repair.querySelector('h2')).color,repairBg);
      const repairCopy=contrast(getComputedStyle(repair.querySelector('.shopping-photo-repair-copy')).color,repairBg);
      closeShoppingPhotoRepair(false);
      openSettings('storage');
      await new Promise(resolve=>setTimeout(resolve,0));
      const panel=document.querySelector('#settingsOverlay .settings-panel');
      const storage=document.querySelector('.shopping-photo-storage-card');
      const storageBg=getComputedStyle(storage).backgroundColor;
      result[id]={
        icon:iconContrast,
        primary:contrast(getComputedStyle(storage.querySelector('.shopping-photo-storage-primary')).color,storageBg),
        secondary:contrast(getComputedStyle(storage.querySelector('.shopping-photo-storage-secondary')).color,storageBg),
        repairTitle,repairCopy,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        actionHeight:Math.min(...Array.from(panel.querySelectorAll('.shopping-photo-storage-action'),node=>node.getBoundingClientRect().height))
      };
      closeSettings();openShoppingList();
    }
    applyTheme('ocean',{persist:false});
    return result;
  });
  for(const [id,reading] of Object.entries(readings)){
    expect(reading.icon,`${id} warning paperclip`).toBeGreaterThanOrEqual(4.5);
    expect(reading.primary,`${id} storage primary`).toBeGreaterThanOrEqual(4.5);
    expect(reading.secondary,`${id} storage secondary`).toBeGreaterThanOrEqual(4.5);
    expect(reading.repairTitle,`${id} repair title`).toBeGreaterThanOrEqual(4.5);
    expect(reading.repairCopy,`${id} repair copy`).toBeGreaterThanOrEqual(4.5);
    expect(reading.overflow,`${id} horizontal overflow`).toBe(0);
    expect(reading.actionHeight,`${id} action height`).toBeGreaterThanOrEqual(52);
  }
});

test('採買單張照片只存本機,卡片只顯示迴紋針並可在詳情全畫面查看',async({page})=>{
  const pageErrors=collectPageErrors(page),consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await installPersistentOfflineMode(page);
  await openPhotoQaApp(page);
  await waitForSyncToSettle(page);
  await seedShoppingItem(page);

  const input=page.locator('#shoppingPhotoInput');
  await expect(input).toHaveAttribute('accept','image/*');
  await input.setInputFiles({name:'reference.png',mimeType:'image/png',buffer:PNG});
  await page.waitForFunction(()=>shoppingUiState.form&&/^shopping-photo-/.test(shoppingUiState.form.photoId||''));
  const storedId=await page.evaluate(()=>shoppingUiState.form.photoId);
  await expect(page.getByRole('button',{name:'移除照片'})).toBeVisible();
  await page.locator('#shoppingFormSheet button[type=submit]').click();

  const card=page.locator('[data-shopping-item-id="photo-item"]');
  await expect(card.locator('.shopping-photo-indicator[aria-label="有照片附件"]')).toHaveCount(1);
  await expect(card.locator('img')).toHaveCount(0);
  expect(await card.textContent()).not.toContain('照片附件');
  expect(await indexedDbPhotoIds(page)).toEqual([storedId]);

  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    const layout=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      clientWidth:document.documentElement.clientWidth,
      panelScrollWidth:document.querySelector('#shoppingListOverlay .shopping-list-panel').scrollWidth,
      panelClientWidth:document.querySelector('#shoppingListOverlay .shopping-list-panel').clientWidth
    }));
    expect(layout.scrollWidth-layout.clientWidth,`document overflow @${viewport.width}`).toBe(0);
    expect(layout.panelScrollWidth-layout.panelClientWidth,`shopping overflow @${viewport.width}`).toBe(0);
  }

  await card.locator('.shopping-item-body').click();
  await page.getByRole('button',{name:'查看照片'}).click();
  const viewer=page.locator('#shoppingPhotoViewer');
  await expect(viewer).toBeVisible();
  await page.waitForFunction(()=>{
    const image=document.querySelector('#shoppingPhotoViewer img');
    return image&&image.naturalWidth>0&&image.naturalHeight>0;
  });
  const viewerBounds=await viewer.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:innerWidth,height:innerHeight};
  });
  expect(viewerBounds.left).toBe(0);
  expect(viewerBounds.top).toBe(0);
  expect(viewerBounds.right).toBe(viewerBounds.width);
  expect(viewerBounds.bottom).toBe(viewerBounds.height);
  await page.getByRole('button',{name:'關閉照片'}).click();

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&syncInFlight===null);
  await page.evaluate(()=>openShoppingList());
  await expect(page.locator('[data-shopping-item-id="photo-item"] .shopping-photo-indicator')).toHaveCount(1);
  expect(await indexedDbPhotoIds(page)).toEqual([storedId]);

  const backup=await page.evaluate(()=>JSON.parse(personalStateJson()));
  expect(Object.prototype.hasOwnProperty.call(backup.shoppingItems[0],'photoId')).toBe(false);

  await page.evaluate(()=>startShoppingEdit('photo-item','list'));
  await page.getByRole('button',{name:'移除照片'}).click();
  await page.locator('#shoppingFormSheet button[type=submit]').click();
  await expect(page.locator('[data-shopping-item-id="photo-item"] .shopping-photo-indicator')).toHaveCount(0);
  await expect.poll(()=>indexedDbPhotoIds(page)).toEqual([storedId]);
  await expect.poll(()=>page.evaluate(()=>shoppingPhotoAuditState.orphanPhotos.map(photo=>photo.id))).toEqual([storedId]);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
