/* v196 過往旅程分頁(Bar 2026-11-17,backlog #64)
   - 總覽:我的花費圓餅圖(個人＋團體分攤,不含代購)與「匯出帳本」(v197 前叫「匯出帳務到記序」;與匯出本趟個人帳同格式 v2,記序可匯入)。
   - 行程:按天切換;不顯示完成狀態;每天下面有當天花費與當晚住宿(適用日期 10/18-10/23 = 入住到退房前一晚)。
   - 帳務:團體帳(結算結果、每人先付／分攤、全團支出依日期)／個人帳(依日期、小計不含代購)。
   - 採買:已買／沒買,依店家分組。筆記:鉛筆圖示修改 = 新增一筆帶 replaces 的版本,只顯示最新版、不標「已修改」。
   - 原始資料收在最底的「顯示原始資料」。 */
const {test,expect}=require('./support/test');
const {installOfflineAppNetwork,openApp,waitForSyncToSettle,collectPageErrors}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
async function setup(page,theme){
  await installOfflineAppNetwork(page);await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(async(theme)=>{
    applyTheme(theme,{persist:false});
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});
    window.google={accounts:{oauth2:{initTokenClient(config){return {requestAccessToken(){config.callback({access_token:'qa',expires_in:3600});}};}}}};
    const sheets={};SHEETS.forEach(item=>{sheets[item.key]={csv:BUILTIN[item.key],sourceTime:'2026-10-01T00:00:00.000Z'};});
    const head='紀錄ID,時間,成員,類別,明細,日幣,台幣,備註,分攤成員,支付方式,紀錄類型,目標紀錄ID,刪除原因,批次ID,店名,取代紀錄ID,輸入幣別,免稅品,價格方式,稅率,優惠券金額';
    const P=JSON.stringify(JSON.stringify(['Bar','Jane','媽媽'])).slice(1,-1);
    const row=(id,t,m,c,d,j,tw)=>[id,t,m,c,d,j,tw,'','"'+JSON.stringify(['Bar','Jane','媽媽']).replace(/"/g,'""')+'"','現金','expense','','','','','','JPY','','','',''].join(',');
    sheets.ledger.csv=[head,row('g1','2026-10-18T07:00:00.000Z','Bar','交通','租車',18000,3900),row('g2','2026-10-18T11:00:00.000Z','Jane','餐飲','晚餐 燒肉',12600,2730),row('g3','2026-10-19T03:00:00.000Z','媽媽','門票','美觀地區遊船',4500,975),row('g4','2026-10-20T04:00:00.000Z','Bar','餐飲','尾道拉麵',3300,715),row('g5','2026-10-20T09:00:00.000Z','Jane','交通','加油',5400,1170),row('g6','2026-10-21T02:00:00.000Z','Bar','住宿','停車費',5000,1084)].join('\n');
    const pr=(id,t,c,d,j,tw,extra)=>Object.assign({id,time:t,member:'Bar',category:c,detail:d,amountJpy:j,amountTwd:tw,note:'',payMethod:'信用卡',isProxy:false,proxyTarget:'',inputCurrency:'JPY',isTaxFree:false,priceMode:'included',taxRate:10,couponAmount:0,batchId:'',storeName:'',replacesRecordId:''},extra||{});
    const personal=[pr('p1','2026-10-18T09:00:00.000Z','購物','白桃果醬',1800,390,{storeName:'岡山站',isProxy:true,proxyTarget:'Jane'}),pr('p2','2026-10-19T05:00:00.000Z','購物','倉敷帆布包',6600,1430,{storeName:'倉敷帆布'}),pr('p3','2026-10-19T08:00:00.000Z','餐飲','咖啡',650,141),pr('p4','2026-10-20T06:00:00.000Z','購物','無印良品',4200,910,{storeName:'無印良品'}),pr('p5','2026-10-21T03:00:00.000Z','餐飲','烏龍麵',900,195),pr('p6','2026-10-22T05:00:00.000Z','購物','藥妝',8800,1906,{storeName:'Cosmeme'})];
    const shopping=[{id:'b1',name:'白桃果醬',unit:'罐',done:true,stopRef:'S002',allocations:[{allocationId:'a1',target:'Jane',quantity:2,ledgerLinks:[{recordId:'p1',track:'personal'}]}]},{id:'b2',name:'帆布托特包',unit:'個',done:true,allocations:[{allocationId:'a2',target:'自己',quantity:1,ledgerLinks:[{recordId:'p2',track:'personal'}]}]},{id:'b3',name:'無印收納盒',unit:'個',done:true,stopRef:'S002',allocations:[{allocationId:'a3',target:'自己',quantity:2,ledgerLinks:[{recordId:'p4',track:'personal'}]}]},{id:'b4',name:'晴王麝香葡萄',unit:'串',done:false,allocations:[{allocationId:'a4',target:'媽媽',quantity:1,ledgerLinks:[]}]},{id:'b5',name:'眼藥水',unit:'瓶',done:false,stopRef:'S005',allocations:[{allocationId:'a5',target:'自己',quantity:3,ledgerLinks:[]}]}];
    const input={archiveId:'qa-archive-1',sourceSheetId:'qa-sheet',trip:{name:'岡山四國六天五夜',startDate:'2026-10-18',endDate:'2026-10-23'},archivedAt:'2026-10-24T00:00:00.000Z',sheets,
      personal:{checks:{'10/18_0':true,'10/18_1':true,'10/18_2':true},nextStopProgress:{},wants:{},shoppingItems:shopping,personalLedger:personal,proxyTargets:[],ledgerCategories:[],ledgerPayMethods:[],shoppingUnits:[],travelNotes:[],member:'Bar',themeId:theme}};
    const archiveText=await TripArchive.serialize(input);
    const notes=[{id:'note-1',text:'第一次自駕四國，瀨戶大橋的夕陽很美。下次想多留一天在直島。',createdAt:'2026-10-25T00:00:00.000Z'},{id:'note-2',text:'倉敷美觀地區早上人少，適合先去。',createdAt:'2026-10-26T00:00:00.000Z'}];
    window.fetch=(inp,options)=>{
      const url=new URL(String(inp&&inp.url||inp),location.href);
      const json=v=>Promise.resolve(new Response(JSON.stringify(v),{status:200,headers:{'Content-Type':'application/json'}}));
      if(url.pathname.endsWith('/about'))return json({user:{emailAddress:'bar@example.com',permissionId:'account-1'}});
      if(url.pathname.endsWith('/files')&&url.searchParams.has('q')){
        const q=url.searchParams.get('q')||'';
        if(q.includes("value='archive'"))return json({files:[{id:'file-1',name:'a.json',createdTime:'2026-10-24T00:00:00.000Z',appProperties:{trippilot_kind:'archive',trippilot_archive_id:'qa-archive-1',trippilot_status:'complete'}}]});
        if(q.includes("value='note'")){const m=q.match(/trippilot_note_id' and value='([^']+)'/);return json({files:notes.map((n,i)=>({n,i})).filter(x=>!m||x.n.id===m[1]).map(x=>({id:'note-file-'+(x.i+1),createdTime:x.n.createdAt,appProperties:{trippilot_status:'complete'}}))});}
        return json({files:[]});
      }
      if(url.pathname.includes('/upload/drive/v3/files')&&options&&options.method==='POST')return Promise.resolve(new Response('',{status:200,headers:{Location:'https://www.googleapis.com/upload/session-1'}}));
      if(url.pathname.endsWith('/files')&&options&&options.method==='POST')return json({id:'folder-1'});
      if(url.pathname.endsWith('/upload/session-1')&&options&&options.method==='PUT'){const up=JSON.parse(options.body);window.__qaUploads=(window.__qaUploads||[]).concat([up]);notes.push(up);return json({id:'note-file-'+notes.length});}
      if(url.pathname.includes('/files/note-file-')&&options&&options.method==='PATCH')return json({id:url.pathname.split('/').pop(),appProperties:{trippilot_status:'complete'}});
      if(url.pathname.endsWith('/files/file-1'))return Promise.resolve(new Response(archiveText,{status:200}));
      if(url.pathname.includes('/files/note-file-')){const i=Number(url.pathname.split('note-file-')[1])-1;return Promise.resolve(new Response(JSON.stringify(notes[i]),{status:200}));}
      return Promise.reject(new TypeError('unexpected '+url.pathname));
    };
    openSettings('root');
  },theme);
  await page.getByRole('button',{name:/^過往旅程/}).click();
  await page.getByRole('button',{name:/岡山四國/}).click();
  await page.waitForTimeout(600);
}

test('v197: amounts use the archived trip currency, not a hard-coded yen sign',async({page})=>{
  await setup(page,'ocean');
  const krw=await page.evaluate(()=>{
    const m=pastTripModelCache.model;const before=m.db.cfg.currency;m.db.cfg.currency='KRW';
    const out=pastTripJpy(1800);m.db.cfg.currency=before;return {krw:out,jpy:pastTripJpy(1800)};
  });
  expect(krw.krw).not.toContain('¥');
  expect(krw.krw).toContain('1,800');
  expect(krw.jpy).toContain('¥');
});

test('overview shows my spend by category and exports the archived ledger for 記序',async({page})=>{
  const errors=collectPageErrors(page);
  await setup(page,'ocean');
  /* 個人(不含代購白桃果醬 390)= 1430+141+910+195+1906 = 4582;團體每筆三人分 */
  await expect(page.locator('.past-trip-stat').first()).toContainText('NT$8,108');   // v202:總額只在上方綠卡,圓餅旁只列組成
  await expect(page.locator('.past-trip-spend-total')).toContainText('個人 NT$4,582');
  await expect(page.locator('.past-trip-spend-total')).toContainText('不含代購 NT$390');
  await expect(page.locator('.past-trip-legend li').first()).toContainText('購物');
  await expect(page.locator('.past-trip-donut circle')).toHaveCount(6);
  await expect(page.locator('.past-trip-summary')).toContainText('NT$8,108');
  /* 記下下載檔名與內容(本機 Chromium 的下載檔名不可靠,直接看 <a download> 與 Blob) */
  await page.evaluate(()=>{
    window.__qaExport=null;const create=URL.createObjectURL;
    URL.createObjectURL=blob=>{window.__qaBlob=blob;return create.call(URL,blob);};
    HTMLAnchorElement.prototype.click=function(){window.__qaExport={name:this.download};};
  });
  await page.getByRole('button',{name:'匯出帳本'}).click();
  const exported=await page.evaluate(async()=>({name:window.__qaExport&&window.__qaExport.name,text:await window.__qaBlob.text()}));
  expect(exported.name).toBe('TripPilot-個人帳-岡山四國六天五夜-2026-10-18.json');
  const payload=JSON.parse(exported.text);
  expect(payload).toMatchObject({format:'trippilot-personal-ledger',version:2,trip:{name:'岡山四國六天五夜',startDate:'2026-10-18',endDate:'2026-10-23'}});
  expect(payload.records).toHaveLength(6);
  expect(payload.groupShare.items).toHaveLength(6);
  expect(payload.totals).toMatchObject({member:'Bar',personalTwd:4582,proxyCount:1,totalTwd:8108});
  await expect(page.locator('#pastTripExportStatus')).toContainText('請確認保存');
  expect(errors).toEqual([]);
});

test('trip tab switches days, shows the day spend and the hotel, and never marks stops done',async({page})=>{
  const errors=collectPageErrors(page);
  await setup(page,'ocean');
  await page.getByRole('tab',{name:'行程'}).click();
  await expect(page.locator('.past-trip-days button[aria-pressed="true"]')).toContainText('DAY 1');
  await expect(page.locator('#pastTripPanel .past-trip-row.done')).toHaveCount(0);
  await expect(page.locator('#pastTripPanel')).not.toContainText('完成');
  await page.locator('.past-trip-days button').nth(2).click();
  await expect(page.locator('#pastTripPanel h3').first()).toContainText('DAY 3');
  /* 10/20:個人無印 910 ＋ 團體 715/3 與 1170/3 的份額 */
  await expect(page.locator('.past-trip-dayfoot')).toContainText('3 筆');
  await expect(page.locator('.past-trip-dayfoot')).toContainText('Guest House Life Field');
  /* 最後一天(10/23 退房)沒有住宿 */
  await page.locator('.past-trip-days button').last().click();
  await expect(page.locator('.past-trip-dayfoot > div').nth(1)).toContainText('—');
  expect(errors).toEqual([]);
});

test('ledger tab shows the settlement and day groups; shopping splits bought and not bought',async({page})=>{
  const errors=collectPageErrors(page);
  await setup(page,'ocean');
  await page.getByRole('tab',{name:'帳務'}).click();
  await expect(page.locator('#pastTripPanel')).toContainText('結算結果');
  await expect(page.locator('#pastTripPanel .past-trip-transfer')).toHaveCount(2);
  await expect(page.locator('#pastTripPanel')).toContainText('全團支出 · 6 筆');
  await page.getByRole('button',{name:'個人帳'}).click();
  /* v197:10/18 只有代購,直接顯示代購金額,不顯示「小計 NT$0」 */
  await expect(page.locator('#pastTripPanel .past-trip-subtotal').first()).toContainText('代購 NT$390');
  await expect(page.locator('#pastTripPanel .past-trip-subtotal').first()).not.toContainText('小計');
  await expect(page.locator('#pastTripPanel .past-trip-subtotal').nth(1)).toContainText('小計 NT$1,571');
  await expect(page.locator('#pastTripPanel')).toContainText('代購 · Jane');
  await page.getByRole('tab',{name:'採買'}).click();
  await expect(page.getByRole('button',{name:'已買 3'})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#pastTripPanel')).toContainText('無印良品');
  await expect(page.locator('#pastTripPanel')).toContainText('帆布托特包');
  await page.getByRole('button',{name:'沒買 2'}).click();
  await expect(page.locator('#pastTripPanel')).toContainText('晴王麝香葡萄');
  await expect(page.locator('#pastTripPanel')).not.toContainText('帆布托特包');
  expect(errors).toEqual([]);
});

test('a review note is edited in place: a new version with replaces is saved and only the latest shows',async({page})=>{
  const errors=collectPageErrors(page);
  await setup(page,'ehon');
  await page.getByRole('tab',{name:'筆記'}).click();
  await expect(page.locator('.past-trip-note')).toHaveCount(2);
  await page.getByRole('button',{name:'修改這則回顧筆記'}).nth(1).click();
  await expect(page.locator('#pastTripNoteEditText')).toHaveValue('倉敷美觀地區早上人少，適合先去。');
  await page.locator('#pastTripNoteEditText').fill('倉敷美觀地區早上人少，八點前到最好。');
  await page.getByRole('button',{name:'儲存修改'}).click();
  await expect(page.locator('.past-trip-note').nth(1)).toContainText('八點前到最好');
  await expect(page.locator('.past-trip-note')).toHaveCount(2);
  await expect(page.locator('.past-trip-notes')).not.toContainText('已修改');
  await expect(page.locator('.past-trip-note').nth(1)).toContainText('2026/10/26');
  const uploads=await page.evaluate(()=>window.__qaUploads);
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toMatchObject({replaces:'note-2',text:'倉敷美觀地區早上人少，八點前到最好。'});
  /* 再改一次仍指向原筆記 */
  await page.getByRole('button',{name:'修改這則回顧筆記'}).nth(1).click();
  await page.locator('#pastTripNoteEditText').fill('第三版');
  await page.getByRole('button',{name:'儲存修改'}).click();
  await expect(page.locator('.past-trip-note').nth(1)).toContainText('第三版');
  expect((await page.evaluate(()=>window.__qaUploads))[1].replaces).toBe('note-2');
  expect(errors).toEqual([]);
});
