const {test,expect}=require('@playwright/test');
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
  await expect.poll(()=>indexedDbPhotoIds(page)).toEqual([]);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
