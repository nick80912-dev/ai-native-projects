const {test,expect}=require('./support/test');
const {
  collectPageErrors,
  installOfflineAppNetwork,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const WIDTHS=[{width:320,height:700},{width:375,height:812},{width:390,height:844}];
const ITEMS=[
  {id:'pending-1',name:'白桃',category:'必買',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'p1-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T01:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''},
  {id:'pending-2',name:'藥妝',category:'必買',unit:'個',legacyQtyText:'',allocations:[{allocationId:'p2-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:false,createdAt:'2026-08-01T02:00:00.000Z',completedAt:'',splitGroupId:'',photoId:''},
  {id:'done-1',name:'點心',category:'伴手禮',unit:'盒',legacyQtyText:'',allocations:[{allocationId:'d1-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:true,createdAt:'2026-08-01T03:00:00.000Z',completedAt:'2026-08-01T04:00:00.000Z',splitGroupId:'',photoId:''},
  {id:'done-2',name:'茶葉',category:'伴手禮',unit:'包',legacyQtyText:'',allocations:[{allocationId:'d2-a',target:'',quantity:1,ledgerLinks:[]}],stopRef:'',done:true,createdAt:'2026-08-01T04:00:00.000Z',completedAt:'2026-08-01T05:00:00.000Z',splitGroupId:'',photoId:''}
];

async function openShoppingQaApp(page){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    return route.fulfill({status:204,body:''});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&CURRENT_SNAPSHOT&&typeof syncInFlight!=='undefined');
}

async function openSeededShopping(page){
  await installOfflineAppNetwork(page);
  await openShoppingQaApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(items=>{
    localStorage.setItem('trip_member','Bar');
    localStorage.setItem('trip_shopping_list',JSON.stringify(items));
    memberRegistrationBridge=[{
      id:'qa-member-bar',time:'2026-08-01T00:00:00.000Z',member:'Bar',category:'其他',detail:'[身分註冊]',
      amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',
      targetRecordId:'',deleteReason:'',batchId:''
    }];
    openShoppingList();
  },ITEMS);
}

test('全選只作用於目前分頁並可取消全選或退出多選',async({page})=>{
  const pageErrors=collectPageErrors(page),consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await openSeededShopping(page);

  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await expect(page.getByRole('button',{name:'取消全選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).sort())).toEqual(['pending-1','pending-2']);
  await expect(page.locator('.shopping-selection-toolbar')).toContainText('已選 2');

  await page.locator('[data-shopping-item-id="pending-1"] input[type=checkbox]').uncheck();
  await expect(page.getByRole('button',{name:'全選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).filter(id=>shoppingUiState.selected[id]))).toEqual(['pending-2']);

  await page.getByRole('button',{name:'全選',exact:true}).click();
  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    const layout=await page.evaluate(()=>{
      const root=document.documentElement;
      const panel=document.querySelector('#shoppingListOverlay .shopping-list-panel');
      panel.scrollTop=panel.scrollHeight;
      const select=document.getElementById('shoppingSelectAllButton').getBoundingClientRect();
      const cancel=document.getElementById('shoppingCancelSelectionButton').getBoundingClientRect();
      const tools=document.querySelector('.shopping-list-tools').getBoundingClientRect();
      const cards=panel.querySelectorAll('.shopping-item');
      const lastCard=cards[cards.length-1].getBoundingClientRect();
      const batch=document.querySelector('.shopping-selection-toolbar').getBoundingClientRect();
      return {
        scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,
        panelScrollWidth:panel.scrollWidth,panelClientWidth:panel.clientWidth,
        selectTop:select.top,cancelTop:cancel.top,selectHeight:select.height,cancelHeight:cancel.height,
        controlsInside:select.left>=tools.left&&cancel.right<=tools.right,
        cardInside:lastCard.left>=panel.getBoundingClientRect().left&&lastCard.right<=panel.getBoundingClientRect().right,
        lastCardClear:lastCard.bottom<=batch.top
      };
    });
    expect(layout.scrollWidth-layout.clientWidth,`overflow @${viewport.width}`).toBe(0);
    expect(layout.panelScrollWidth-layout.panelClientWidth,`panel overflow @${viewport.width}`).toBe(0);
    expect(Math.abs(layout.selectTop-layout.cancelTop),`control row @${viewport.width}`).toBeLessThan(1);
    expect(layout.selectHeight).toBeGreaterThanOrEqual(44);
    expect(layout.cancelHeight).toBeGreaterThanOrEqual(44);
    expect(layout.controlsInside).toBe(true);
    expect(layout.cardInside,`card bounds @${viewport.width}`).toBe(true);
    expect(layout.lastCardClear,`last card clear of batch toolbar @${viewport.width}`).toBe(true);
  }

  await page.getByRole('button',{name:'取消全選',exact:true}).click();
  await expect(page.locator('.shopping-selection-toolbar')).toContainText('請選擇項目');
  await expect(page.locator('#shoppingSelectAllButton')).toBeFocused();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:true,selected:{}});

  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.getByRole('button',{name:'取消多選',exact:true}).click();
  await expect(page.getByRole('button',{name:'多選',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:false,selected:{}});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('切換分頁清空選取且已買分頁只全選已買項目',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-list-segment').getByRole('button',{name:'已買',exact:true}).click();
  expect(await page.evaluate(()=>({mode:shoppingUiState.selectionMode,selected:shoppingUiState.selected})))
    .toEqual({mode:false,selected:{}});
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  expect(await page.evaluate(()=>Object.keys(shoppingUiState.selected).sort())).toEqual(['done-1','done-2']);
});

test('多選時點卡片只切換 selection，不改完成狀態或開啟明細',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.locator('[data-shopping-item-id="pending-1"] .shopping-item-body').click();
  expect(await page.evaluate(()=>(
    {
      selected:!!shoppingUiState.selected['pending-1'],
      done:shoppingListStore.all().find(item=>item.id==='pending-1').done,
      detail:!!document.getElementById('shoppingItemDetail')
    }
  ))).toEqual({selected:true,done:false,detail:false});
});

test('批次完成失敗時保留多選模式與原選取',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.evaluate(()=>{
    shoppingListStore.patchMany=function(){throw new Error('forced patchMany failure');};
  });
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'已買',exact:true}).click();
  expect(await page.evaluate(()=>(
    {
      mode:shoppingUiState.selectionMode,
      selected:Object.keys(shoppingUiState.selected).filter(id=>shoppingUiState.selected[id]).sort(),
      pending:shoppingListStore.all().filter(item=>!item.done).length
    }
  ))).toEqual({mode:true,selected:['pending-1','pending-2'],pending:2});
});

test('取消批次刪除確認時保留多選模式與原選取',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'刪除',exact:true}).click();
  expect(await page.evaluate(()=>(
    {
      mode:shoppingUiState.selectionMode,
      selected:Object.keys(shoppingUiState.selected).filter(id=>shoppingUiState.selected[id]).sort(),
      count:shoppingListStore.all().length
    }
  ))).toEqual({mode:true,selected:['pending-1','pending-2'],count:4});
});

test('全選沿用既有完成、移回待買與刪除批次處理',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'已買',exact:true}).click();
  expect(await page.evaluate(()=>({
    mode:shoppingUiState.selectionMode,
    selected:shoppingUiState.selected,
    pending:shoppingListStore.all().filter(item=>!item.done).length
  }))).toEqual({mode:false,selected:{},pending:0});

  await page.locator('.shopping-list-segment').getByRole('button',{name:'已買',exact:true}).click();
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'移回待買',exact:true}).click();
  expect(await page.evaluate(()=>shoppingListStore.all().every(item=>!item.done))).toBe(true);

  await page.locator('.shopping-list-segment').getByRole('button',{name:'待買',exact:true}).click();
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'刪除',exact:true}).click();
  expect(await page.evaluate(()=>shoppingListStore.all().length)).toBe(0);
});

test('全選後建立消費沿用既有多品項記帳入口',async({page})=>{
  await openSeededShopping(page);
  await page.getByRole('button',{name:'多選',exact:true}).click();
  await page.getByRole('button',{name:'全選',exact:true}).click();
  await page.locator('.shopping-selection-toolbar').getByRole('button',{name:'記帳',exact:true}).click();
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
  expect(await page.evaluate(()=>shoppingUiState.selectionMode)).toBe(false);
});
