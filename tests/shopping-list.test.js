const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function createStorage(){
  const values={};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function plain(value){return JSON.parse(JSON.stringify(value));}

function loadShoppingModule(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ================= ledgerRepository');
  const end=html.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'shopping helpers live beside the local ledger repositories');
  const sandbox={
    console:{log(){},warn(){},error(){}},
    localStorage:createStorage(),
    Date,Math,Promise,JSON,String,Number,Boolean,isFinite,
    setTimeout,clearTimeout,
    timestampDate(value){return new Date(Number(value));},
    canonicalMemberName(value){return String(value||'').trim();},
    AppLog:{repo(){},sync(){}},
    fetch(){return Promise.reject(new Error('network disabled'));},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(start,end),sandbox);
  return sandbox;
}

const mod=loadShoppingModule();
assert.strictEqual(mod.SHOPPING_DEFAULT_UNIT,'個','new Shopping forms have one authoritative default unit');
assert(mod.SHOPPING_COMMON_UNITS.includes('個'),'the common unit source contains the default unit');
assert.strictEqual(mod.newShoppingForm({}).quantity,1,'a new Shopping form starts at quantity 1');
assert.strictEqual(mod.newShoppingForm({}).unit,'個','a new Shopping form starts with 個');
let allocationSeq=0;
const store=mod.createShoppingListStore({
  storage:mod.localStorage,
  key:'trip_shopping_list',
  now(){return Date.parse('2026-07-23T08:00:00.000Z');},
  idFactory(){return 'shopping-1';},
  allocationIdFactory(itemId){allocationSeq++;return itemId+'-allocation-'+allocationSeq;}
});

const added=plain(store.add({
  name:'  岡山白桃  ',
  category:'伴手禮',
  quantity:2,
  unit:'盒',
  targets:['媽媽','阿寶'],
  stopRef:'10/18_3'
}));
assert.deepStrictEqual(added,{
  id:'shopping-1',
  name:'岡山白桃',
  category:'伴手禮',
  unit:'盒',
  legacyQtyText:'',
  allocations:[
    {allocationId:'shopping-1-allocation-1',target:'媽媽',quantity:2,ledgerLinks:[]},
    {allocationId:'shopping-1-allocation-2',target:'阿寶',quantity:2,ledgerLinks:[]}
  ],
  stopRef:'10/18_3',
  done:false,
  createdAt:'2026-07-23T08:00:00.000Z',
  completedAt:'',
  splitGroupId:'',
  photoId:''
},'add normalizes and persists the approved local-only fields');
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'buyFor'),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'quantity'),false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'ledgerLinks'),false);
assert.deepStrictEqual(plain(store.all()),[added],'shopping items round-trip through localStorage');

const updated=plain(store.update('shopping-1',{
  allocations:added.allocations.map(value=>Object.assign({},value,{quantity:3})),
  unit:'盒',
  done:true
}));
assert.strictEqual(updated.allocations[0].quantity,3);
assert.strictEqual(updated.allocations[1].quantity,3);
assert.strictEqual(updated.unit,'盒');
assert.strictEqual(updated.done,true);
/* qty 已不是可寫入的資料來源:結構化數量存在時,舊 qty patch 不得覆蓋它。 */
assert.strictEqual(plain(store.update('shopping-1',{qty:'99 箱'})).allocations[0].quantity,3,'legacy qty patch 不得改寫 allocation 數量');
assert.strictEqual(plain(store.update('shopping-1',{qty:'99 箱'})).unit,'盒');
assert.strictEqual(store.all().length,1,'update never duplicates an item');
assert.throws(()=>store.add({name:'',category:'必買'}),/品名/,'name is the only required field');
assert.throws(()=>store.add({name:'超出規格',category:'預算'}),/分類/,'categories remain the approved closed set');
store.remove('shopping-1');
assert.deepStrictEqual(plain(store.all()),[],'delete removes only the selected local item');

const day={
  date:'10/18',
  items:[
    {id:'10/18_0',act:'抵達',place:'岡山機場'},
    {id:'10/18_1',act:'血拚時間',place:'永旺夢樂城 岡山'}
  ]
};
const reminder=plain(mod.buildShoppingTodayReminder([
  {id:'a',name:'白桃',stopRef:'10/18_1',done:false},
  {id:'b',name:'藥妝',stopRef:'',done:false},
  {id:'c',name:'已買',stopRef:'10/18_1',done:true},
  {id:'d',name:'孤兒',stopRef:'10/18_99',done:false}
],day));
assert.strictEqual(reminder.count,1,'Today reminder includes only unfinished items bound to a current stop');
assert.deepStrictEqual(reminder.groups,[{stopRef:'10/18_1',stopName:'永旺夢樂城 岡山',items:['白桃']}]);
assert.strictEqual(mod.buildShoppingTodayReminder([{id:'b',name:'藥妝',stopRef:'',done:false}],day),null,'unknown-location items stay off Today');
assert.strictEqual(mod.buildShoppingTodayReminder([{id:'d',name:'孤兒',stopRef:'10/18_99',done:false}],day),null,'orphan references degrade silently');
assert.strictEqual(mod.buildShoppingTodayReminder([],null),null,'non-trip days never show the reminder');

const priorityInput=[
  {id:'normal-1',name:'一般一',category:'伴手禮'},
  {id:'required-1',name:'必買一',category:'必買'},
  {id:'normal-2',name:'一般二',category:'生活用品'},
  {id:'required-2',name:'必買二',category:'必買'},
  {id:'looks-required',name:'相似文字',category:' 必買 '}
];
const prioritySnapshot=plain(priorityInput);
assert.deepStrictEqual(
  plain(mod.prioritizeShoppingGroupItems(priorityInput)).map(item=>item.id),
  ['required-1','required-2','normal-1','normal-2','looks-required'],
  '每個待買群組只把 exact 必買穩定置頂'
);
assert.deepStrictEqual(priorityInput,prioritySnapshot,'顯示排序不修改輸入或 store order');
const priorityReminder=plain(mod.buildShoppingTodayReminder([
  {id:'normal-1',name:'一般一',category:'伴手禮',stopRef:'10/18_1',done:false},
  {id:'required-1',name:'必買一',category:'必買',stopRef:'10/18_1',done:false},
  {id:'normal-2',name:'一般二',category:'生活用品',stopRef:'10/18_1',done:false},
  {id:'required-2',name:'必買二',category:'必買',stopRef:'10/18_1',done:false}
],day));
assert.deepStrictEqual(
  priorityReminder.groups[0].items,
  ['必買一','必買二','一般一','一般二'],
  'Today 站點摘要與待買群組共用必買穩定置頂規則'
);

/* ================= 結構化數量:quantity／unit／legacyQtyText ================= */
const QNOW='2026-10-20T04:00:00.000Z';
const q=over=>mod.normalizeShoppingItem(Object.assign({id:'q1',name:'益生菌',createdAt:QNOW},over||{}));
const allocationQuantity=item=>item.allocations[0].quantity;
assert.strictEqual(q({photoId:'  shopping-photo-1  '}).photoId,'shopping-photo-1','photo reference is trimmed and preserved locally');
assert.strictEqual(q({}).photoId,'','legacy items receive an empty photo reference');
assert.throws(()=>q({photoId:{id:'nested'}}),/照片附件/,'photo references must remain scalar IDs');
assert.strictEqual(allocationQuantity(q({quantity:5,unit:'罐'})),5,'新項目接受安全正整數');
assert.strictEqual(q({quantity:5,unit:'罐'}).unit,'罐','單位獨立保存');
assert.strictEqual(allocationQuantity(q({quantity:1,unit:''})),1,'quantity 1 合法');
assert.throws(()=>q({quantity:0}),/數量/,'quantity 0 拒絕');
assert.throws(()=>q({quantity:-1}),/數量/,'quantity -1 拒絕');
assert.throws(()=>q({quantity:1.5}),/數量/,'quantity 1.5 拒絕');
assert.throws(()=>q({quantity:NaN}),/數量/,'NaN 拒絕');
assert.throws(()=>q({quantity:Infinity}),/數量/,'Infinity 拒絕');
assert.throws(()=>q({quantity:Number.MAX_SAFE_INTEGER+2}),/數量/,'超出安全整數拒絕');
assert.throws(()=>q({quantity:'5'}),/數量/,'字串數量拒絕,不做隱式轉型');
/* type="number" 在部分瀏覽器仍會送出 1e6／1.0／+3,表單必須先擋掉非純十進位字串。 */
const saveSource=mod.__saveSource||fs.readFileSync('index.html','utf8').slice(
  fs.readFileSync('index.html','utf8').indexOf('function saveShoppingForm('),
  fs.readFileSync('index.html','utf8').indexOf('function deleteShoppingItem(')
);
assert(/\^\\d\+\$\/\.test\(raw\)/.test(saveSource),'表單只接受純十進位數字字串,不得直接 Number() 轉換');
assert.strictEqual(q({quantity:3,unit:'　大　包 '}).unit,'大 包','單位正規化全形與連續空白');
assert.throws(()=>q({quantity:3,unit:'一二三四五六七八九十一'}),/單位/,'單位過長拒絕');
assert.strictEqual(q({quantity:5,unit:'罐',legacyQtyText:'約 3～5 個'}).legacyQtyText,'','轉換完成後清空 legacyQtyText');
assert.strictEqual(allocationQuantity(q({quantity:null,legacyQtyText:'約 3～5 個'})),null,'legacy 模式允許 quantity null');
assert.strictEqual(q({quantity:null,legacyQtyText:'約 3～5 個'}).legacyQtyText,'約 3～5 個','legacy 原文完整保留');
assert.strictEqual(allocationQuantity(q({})),null,'完全沒有數量的舊資料為 null');
assert.strictEqual(q({}).legacyQtyText,'','完全沒有數量時 legacyQtyText 也是空的');
assert.strictEqual(q({quantity:5,unit:'罐'}).qty,undefined,'正規化輸出不再保留可獨立修改的 qty 鏡像');
assert.throws(()=>q({allocations:[
  {allocationId:'a1',target:'阿寶',quantity:1,ledgerLinks:[]},
  {allocationId:'a2',target:' 阿寶 ',quantity:1,ledgerLinks:[]}
]}),/代購對象重複/,'同一代購對象不得重複分配');
assert.throws(()=>q({allocations:[
  {allocationId:'a1',target:'',quantity:1,ledgerLinks:[]},
  {allocationId:'a2',target:'阿寶',quantity:1,ledgerLinks:[]}
]}),/自己的分配不可與代購對象混用/,'自己的份數不得與代購對象混合');
assert.throws(()=>q({allocations:[
  {allocationId:'a1',target:'阿寶',quantity:0,ledgerLinks:[]}
]}),/數量/,'allocation 數量沿用安全正整數限制');
assert.throws(()=>q({allocations:[
  {allocationId:'a1',target:'阿寶',quantity:Number.MAX_SAFE_INTEGER,ledgerLinks:[]},
  {allocationId:'a2',target:'媽媽',quantity:1,ledgerLinks:[]}
]}),/總數量/,'allocation 總量不得超出安全整數');
const stableAllocationItem=q({allocations:[
  {allocationId:'stable-a',target:'阿寶',quantity:2,ledgerLinks:[]},
  {allocationId:'stable-b',target:'媽媽',quantity:2,ledgerLinks:[]}
]});
assert.deepStrictEqual(
  plain(q(stableAllocationItem).allocations.map(value=>value.allocationId)),
  ['stable-a','stable-b'],
  '正規化與儲存往返必須保留 allocationId'
);
assert.strictEqual(q({category:'代購',quantity:1}).category,'','新版資料不再把代購當商品分類');

/* 舊 qty migration:只接受「正整數＋可選空白＋不含數字的單位」 */
const mig=text=>q({qty:text});
assert.strictEqual(allocationQuantity(mig('5 罐')),5);assert.strictEqual(mig('5 罐').unit,'罐');assert.strictEqual(mig('5 罐').legacyQtyText,'');
assert.strictEqual(allocationQuantity(mig('5罐')),5);assert.strictEqual(mig('5罐').unit,'罐');
assert.strictEqual(allocationQuantity(mig('10')),10);assert.strictEqual(mig('10').unit,'','純數字轉出空單位');
assert.strictEqual(allocationQuantity(mig('3 盒')),3);
['兩盒','約 3～5 個','3-5 個','一大一小','家庭號 2 包','一組','少量','0 罐','-3 罐','1.5 罐'].forEach(text=>{
  const item=mig(text);
  assert.strictEqual(allocationQuantity(item),null,'不可解析的舊數量不得猜測:'+text);
  assert.strictEqual(item.legacyQtyText,text.replace(/　/g,' ').replace(/\s+/g,' ').trim(),'舊數量原文完整保留:'+text);
  assert.strictEqual(item.unit,'','不可解析時不得留下猜測的單位:'+text);
});
assert.strictEqual(allocationQuantity(mig('')),null);assert.strictEqual(mig('').legacyQtyText,'','空 qty 不產生 legacy 文字');

/* 數量顯示 helper */
const allocation=(target,quantity,ledgerLinks=[])=>({
  allocationId:'a-'+(target||'own'),target,quantity,ledgerLinks
});
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2)]
}),'幫阿寶買');
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2),allocation('媽媽',2)]
}),'幫阿寶、媽媽買');
assert.strictEqual(mod.shoppingItemTargetSummary({
  allocations:[allocation('阿寶',2),allocation('媽媽',2),allocation('小明',2),allocation('爸爸',2)]
}),'幫阿寶、媽媽 +2 買');
assert.deepStrictEqual(plain(mod.shoppingCardTargetModel({
  allocations:[allocation('阿寶',1),allocation('媽媽',1),allocation('小明',1)]
})),{
  prefix:'幫',
  names:['阿寶','媽媽'],
  overflow:'+1',
  suffix:'買',
  ariaLabel:'幫阿寶、媽媽等共 3 位買'
},'三位以上只標示前兩位姓名並保留完整語意');
assert.deepStrictEqual(plain(mod.shoppingCardTargetModel({
  allocations:[allocation('阿寶',1)]
})),{
  prefix:'幫',
  names:['阿寶'],
  overflow:'',
  suffix:'買',
  ariaLabel:'幫阿寶買'
},'單一對象不顯示分隔符號或 +N');
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('pending',0)),{
  label:'請選擇項目',
  actions:[]
},'零選取只顯示提示，不渲染 disabled 動作');
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('pending',2)),{
  label:'已選 2',
  actions:['已買','記帳','刪除']
},'待買多選使用精簡單行動作');
assert.deepStrictEqual(plain(mod.shoppingSelectionToolbarModel('done',2)),{
  label:'已選 2',
  actions:['移回待買','記帳','刪除']
},'已買多選動作不借用完成 checkbox');
const visibleSelectionItems=[{id:'pending-1'},{id:'pending-2'}];
assert.deepStrictEqual(plain(mod.shoppingSelectionControlModel(
  visibleSelectionItems,
  {'pending-1':true,'done-1':true,'deleted-id':true}
)),{
  ids:['pending-1','pending-2'],
  allSelected:false,
  actionLabel:'全選'
},'selection controls derive state only from current-tab item IDs');
assert.deepStrictEqual(plain(mod.nextShoppingPageSelection(
  visibleSelectionItems,
  {'pending-1':true,'done-1':true,'deleted-id':true}
)),{
  'pending-1':true,
  'pending-2':true
},'select all rebuilds the map from current-tab IDs and removes stale IDs');
assert.deepStrictEqual(plain(mod.shoppingSelectionControlModel(
  visibleSelectionItems,
  {'pending-1':true,'pending-2':true,'done-1':true}
)),{
  ids:['pending-1','pending-2'],
  allSelected:true,
  actionLabel:'取消全選'
},'all visible items switch the control to deselect all');
assert.deepStrictEqual(plain(mod.nextShoppingPageSelection(
  visibleSelectionItems,
  {'pending-1':true,'pending-2':true,'done-1':true}
)),{},'deselect all keeps multi-select active but clears the map');
assert.deepStrictEqual(plain(mod.nextShoppingPageSelection([],{'stale':true})),{},
  'an empty current tab cannot retain stale selection');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'盒',
  allocations:[allocation('阿寶',2),allocation('媽媽',2),allocation('小明',2)]
}),'2 盒／人 · 共 6 盒');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'盒',
  allocations:[allocation('阿寶',2),allocation('媽媽',1),allocation('小明',1)]
}),'共 4 盒 · 3 位');
assert.strictEqual(mod.shoppingItemQuantitySummary({
  unit:'個',
  allocations:[allocation('',3)]
}),'3 個');
assert.deepStrictEqual(plain(mod.shoppingSplitGroupAllocationTotals([
  {id:'split-a',splitGroupId:'group-1',allocations:[allocation('阿寶',1),allocation('媽媽',2)]},
  {id:'split-b',splitGroupId:'group-1',allocations:[allocation('阿寶',1)]},
  {id:'other',allocations:[allocation('阿寶',99)]}
],{id:'split-a',splitGroupId:'group-1'})),{
  targets:[{target:'阿寶',quantity:2},{target:'媽媽',quantity:2}],
  total:4
},'拆分群組可由目前各筆 allocation 還原原始每人與總數量');
assert.strictEqual(mod.shoppingQuantityLabel({quantity:5,unit:'罐'}),'5 罐');
assert.strictEqual(mod.shoppingQuantityLabel({quantity:3,unit:''}),'3');
assert.strictEqual(mod.shoppingQuantityLabel({quantity:null,legacyQtyText:'約 3～5 個'}),'約 3～5 個');
assert.strictEqual(mod.shoppingQuantityLabel({quantity:null,legacyQtyText:''}),'');
assert.strictEqual(mod.shoppingQuantityLabel(null),'','空輸入安全回傳空字串');
assert.strictEqual(mod.shoppingLedgerNote({quantity:5,unit:'罐',buyFor:'媽媽'}),'數量：5 罐 · 幫誰買：媽媽','Ledger note 走同一個 helper');
assert.strictEqual(mod.shoppingLedgerNote({quantity:null,legacyQtyText:'約 3～5 個',buyFor:''}),'數量：約 3～5 個','舊式數量在 Ledger note 仍可顯示');

/* 單位長度上限收斂為 6,與設定頁既有的 normalizeLedgerOption 一致 */
assert.strictEqual(mod.SHOPPING_UNIT_MAX_LENGTH,6,'單位上限與設定頁選項一致');
assert.strictEqual('家庭號大包裝'.length,6,'測資本身確實是 6 字');
assert.strictEqual(q({quantity:3,unit:'家庭號大包裝'}).unit,'家庭號大包裝','6 字單位可存');
assert.strictEqual('家庭號大包裝袋'.length,7,'測資本身確實是 7 字');
assert.throws(()=>q({quantity:3,unit:'家庭號大包裝袋'}),/單位/,'7 字單位拒絕');

/* 單位改為可在設定頁管理的選項 store */
assert.strictEqual(typeof mod.shoppingUnitStore,'object','單位有獨立的選項 store');
assert.strictEqual(mod.shoppingUnitStore.all().join(','),mod.SHOPPING_COMMON_UNITS.join(','),'預設值即既有的常用單位');
assert.strictEqual(typeof mod.shoppingUnitStore.add,'function');
assert.strictEqual(typeof mod.shoppingUnitStore.remove,'function');

/* 卡片資訊分行:屬性一行、地點一行,不再與動作混排 */
assert.strictEqual(mod.shoppingItemAttrLine({category:'伴手禮',quantity:3,unit:'盒'}),'伴手禮 · 3 盒','屬性以 · 分隔,且不加「數量」前綴');
assert.strictEqual(mod.shoppingItemAttrLine({category:'代購',quantity:1,unit:'',buyFor:'媽媽'}),'代購 · 1 · 幫媽媽買');
assert.strictEqual(mod.shoppingItemAttrLine({quantity:null,legacyQtyText:'約 3～5 個'}),'約 3～5 個','舊式數量仍顯示');
assert.strictEqual(mod.shoppingItemAttrLine({}),'','沒有屬性時回空字串');
assert.strictEqual(mod.shoppingItemLocationLine({stopRef:'x'},{dayIndex:0,name:'麵酒一照庵 岡山本店'},'resolved'),'DAY 1 · 麵酒一照庵 岡山本店');
assert.strictEqual(mod.shoppingItemLocationLine({stopRef:'x'},null,'orphan'),'原行程站點已不存在');
assert.strictEqual(mod.shoppingItemLocationLine({stopRef:'x'},null,'pending'),'行程站點待確認');
assert.strictEqual(mod.shoppingItemLocationLine({stopRef:''},null,'unbound'),'','隨時可買不佔一行');

/* 部分購買:只輸入本次買到,剩餘由系統計算 */
const unlinkedSummary={state:'unlinked'};
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',1)]
},unlinkedSummary),false,'自己的數量 1 不顯示部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',2)]
},unlinkedSummary),true,'自己的數量 2 可部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('阿寶',1),allocation('媽媽',1),allocation('小明',1)]
},unlinkedSummary),true,'三位各 1 份時總需求大於 1，可部分購買');
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:false,allocations:[allocation('',null)]
},unlinkedSummary),false,'舊式數量不顯示部分購買');
['linked','partial','unverified'].forEach(state=>{
  assert.strictEqual(mod.canOfferShoppingPartialPurchase({
    done:false,allocations:[allocation('',2)]
  },{state}),false,state+' 狀態不顯示部分購買');
});
assert.strictEqual(mod.canOfferShoppingPartialPurchase({
  done:true,allocations:[allocation('',2)]
},unlinkedSummary),false,'已買項目不顯示部分購買');
const src=q({id:'s1',quantity:5,unit:'罐'});
assert.deepStrictEqual(plain(mod.shoppingSplitPlan(src,3)),{ok:true,mode:'split',purchasedQuantity:3,remainingQuantity:2,error:''},'買到 3 剩 2');
assert.deepStrictEqual(plain(mod.shoppingSplitPlan(src,1)),{ok:true,mode:'split',purchasedQuantity:1,remainingQuantity:4,error:''},'買到 1 剩 4');
assert.strictEqual(mod.shoppingSplitPlan(src,5).mode,'complete','買齊直接完成,不建立 0 數量剩餘');
assert.strictEqual(mod.shoppingSplitPlan(src,6).ok,false);
assert.strictEqual(mod.shoppingSplitPlan(src,6).error,'本次買到數量不可超過原需求');
assert.strictEqual(mod.shoppingSplitPlan(src,0).error,'本次買到數量至少為 1');
assert.strictEqual(mod.shoppingSplitPlan(src,-2).error,'本次買到數量至少為 1');
assert.strictEqual(mod.shoppingSplitPlan(src,1.5).error,'本次買到數量至少為 1','小數阻擋');
const allocationSplitSource=q({
  id:'multi-split',unit:'盒',
  allocations:[
    {allocationId:'split-a',target:'阿寶',quantity:2,ledgerLinks:[]},
    {allocationId:'split-b',target:'媽媽',quantity:2,ledgerLinks:[]},
    {allocationId:'split-c',target:'小明',quantity:2,ledgerLinks:[]}
  ]
});
const allocationPlan=plain(mod.shoppingAllocationSplitPlan(allocationSplitSource,{
  'split-a':2,'split-b':1,'split-c':1
}));
assert.strictEqual(allocationPlan.ok,true);
assert.strictEqual(allocationPlan.mode,'split');
assert.deepStrictEqual(allocationPlan.purchasedAllocations.map(value=>[value.target,value.quantity]),[
  ['阿寶',2],['媽媽',1],['小明',1]
]);
assert.deepStrictEqual(allocationPlan.remainderAllocations.map(value=>[value.target,value.quantity]),[
  ['媽媽',1],['小明',1]
]);
assert.strictEqual(allocationPlan.purchasedTotal,4);
assert.strictEqual(allocationPlan.remainderTotal,2);
assert.strictEqual(mod.shoppingAllocationSplitPlan(allocationSplitSource,{'split-a':0,'split-b':0,'split-c':0}).ok,false,'全部 0 不建立空的已買項目');
assert.strictEqual(mod.shoppingAllocationSplitPlan(allocationSplitSource,{'missing':1}).ok,false,'未知 allocation ID 拒絕');
assert.strictEqual(mod.shoppingAllocationSplitPlan(allocationSplitSource,{'split-a':3}).ok,false,'單一對象不可買超過需求');
assert.strictEqual(mod.shoppingAllocationSplitPlan(allocationSplitSource,{'split-a':1.5}).ok,false,'本次買到不得為小數');
const photoSplit=plain(mod.buildShoppingSplitParts(q({id:'photo-split',quantity:3,unit:'盒',photoId:'shopping-photo-shared'}),{
  purchasedQuantity:1,remainderStopRef:'next-stop',now:Date.parse(QNOW)
}));
assert.strictEqual(photoSplit.purchased.photoId,'shopping-photo-shared','purchased split keeps the attachment reference');
assert.strictEqual(photoSplit.remainder.photoId,'shopping-photo-shared','remaining split shares the attachment reference');
assert.deepStrictEqual(
  plain(mod.shoppingPhotoIdsReleased(
    [{id:'a',photoId:'shared'},{id:'b',photoId:'shared'}],
    [{id:'b',photoId:'shared'}]
  )),
  [],
  'removing one shared split does not release its Blob'
);
assert.deepStrictEqual(
  plain(mod.shoppingPhotoIdsReleased([{id:'b',photoId:'shared'}],[])),
  ['shared'],
  'the final reference releases exactly one Blob ID'
);
assert.strictEqual(mod.shoppingSplitPlan(q({id:'s2',quantity:null,legacyQtyText:'約 3～5 個'}),1).ok,false,'舊式數量不得部分購買');
assert(/舊式文字數量/.test(mod.shoppingSplitPlan(q({id:'s3',quantity:null,legacyQtyText:'兩盒'}),1).error),'舊式數量提示先轉換');

/* ================= A:待買與 Today 依行程順序排列 =================
   排序契約:dayIndex ASC → 該日 day.items index ASC。
   同一站點內的採買項目維持 store order,不改成字母或分類排序。 */
const orderDays=[
  {date:'10/18',items:[{id:'d1_a',place:'第一站'},{id:'d1_b',place:'第二站'},{id:'d1_c',place:'第三站'}]},
  {date:'10/19',items:[{id:'d2_a',place:'第二天第一站'}]},
  {date:'10/20',items:[]},
  {date:'10/21',items:[]},
  {date:'10/22',items:[{id:'d5_a',place:'第五天站點'}]}
];
const stopOrder=mod.buildShoppingStopOrder(orderDays);
assert.strictEqual(typeof mod.buildShoppingStopOrder,'function','行程站點排名有單一來源');
assert.strictEqual(typeof mod.sortShoppingStopGroups,'function','待買與 Today 共用同一個群組排序 helper');
assert(mod.shoppingStopRank(stopOrder,'d1_a')<mod.shoppingStopRank(stopOrder,'d1_b'),'同日站點依 day.items 順序排名');
assert(mod.shoppingStopRank(stopOrder,'d1_c')<mod.shoppingStopRank(stopOrder,'d2_a'),'DAY 1 全部站點排在 DAY 2 之前');
assert(mod.shoppingStopRank(stopOrder,'d2_a')<mod.shoppingStopRank(stopOrder,'d5_a'),'跨日依 dayIndex 排名');
assert.strictEqual(mod.shoppingStopRank(stopOrder,'nope'),Infinity,'不在行程內的引用不佔有效站點名次');
assert.strictEqual(mod.shoppingStopRank(stopOrder,''),Infinity,'空 stopRef 不佔有效站點名次');

/* A1:同一天三站,採買項目以第三站、第一站、第二站建立 → 顯示仍為第一、第二、第三站 */
const a1=plain(mod.buildShoppingTodayReminder([
  {id:'i1',name:'買C',stopRef:'d1_c',done:false},
  {id:'i2',name:'買A',stopRef:'d1_a',done:false},
  {id:'i3',name:'買B',stopRef:'d1_b',done:false}
],orderDays[0]));
assert.deepStrictEqual(a1.groups.map(g=>g.stopName),['第一站','第二站','第三站'],'A1 Today 提醒依當日行程順序,不是採買建立順序');
assert.strictEqual(a1.count,3,'A1 排序不改變總筆數');

/* A3:同一站點內多個項目維持 store order */
const a3=plain(mod.buildShoppingTodayReminder([
  {id:'z1',name:'後建立的B',stopRef:'d1_b',done:false},
  {id:'z2',name:'先建立的A1',stopRef:'d1_a',done:false},
  {id:'z3',name:'先建立的A2',stopRef:'d1_a',done:false}
],orderDays[0]));
assert.deepStrictEqual(a3.groups.map(g=>g.stopName),['第一站','第二站'],'A3 站點仍依行程排序');
assert.deepStrictEqual(a3.groups[0].items,['先建立的A1','先建立的A2'],'A3 同站點內維持既有 store order');

/* A4:排序 helper 對群組是穩定排序,排不出名次者維持原相對順序 */
const a4=mod.sortShoppingStopGroups([
  {stopRef:'d5_a'},{stopRef:'unknown-1'},{stopRef:'d1_b'},{stopRef:'unknown-2'},{stopRef:'d1_a'}
],stopOrder);
assert.deepStrictEqual(a4.map(g=>g.stopRef),['d1_a','d1_b','d5_a','unknown-1','unknown-2'],'A4/A5 有效站點依行程排序,無名次者維持原順序且排在最後');
assert.deepStrictEqual(mod.sortShoppingStopGroups([],stopOrder),[],'空群組不拋錯');

/* A7:排序只作用於顯示,不重寫 localStorage 陣列順序 */
let orderProbeSeq=1;
const orderStore=mod.createShoppingListStore({
  storage:mod.localStorage,key:'trip_shopping_order_probe',
  now(){return Date.parse('2026-07-23T08:00:00.000Z');},
  idFactory(){return 'probe-'+(orderProbeSeq++);}
});
orderStore.add({name:'買C',stopRef:'d1_c'});
orderStore.add({name:'買A',stopRef:'d1_a'});
const storedOrder=plain(orderStore.all()).map(item=>item.stopRef);
mod.buildShoppingTodayReminder(plain(orderStore.all()),orderDays[0]);
mod.sortShoppingStopGroups([{stopRef:'d1_c'},{stopRef:'d1_a'}],stopOrder);
assert.deepStrictEqual(plain(orderStore.all()).map(item=>item.stopRef),storedOrder,'A7 排序不重寫本機儲存順序');

/* ================= F:孤兒 stopRef 三態判定 =================
   只有「本次旅程權威資料已載入」才可宣告孤兒;來源不可信一律降級為待確認。 */
const ONLINE={source:'online'};
const BUILTIN_SNAP={source:'builtin'};
const LEGACY={source:'legacy-migrated'};
assert.strictEqual(mod.tripDatasetAuthority(ONLINE,orderDays),'authoritative','線上快照(含同步後離線沿用)為本次旅程權威資料');
assert.strictEqual(mod.tripDatasetAuthority(ONLINE,[]),'unverified','F1 沒有行程日就不是 ready');
assert.strictEqual(mod.tripDatasetAuthority(null,orderDays),'unverified','F1 尚無快照時不得判定為權威');
assert.strictEqual(mod.tripDatasetAuthority(BUILTIN_SNAP,orderDays),'unverified','F8 內建種子資料日數完整也不是本次旅程權威資料');
assert.strictEqual(mod.tripDatasetAuthority(LEGACY,orderDays),'unverified','F2 來源不明的遷移快照不得判孤兒');

const stop={id:'d1_a',place:'第一站'};
assert.strictEqual(mod.resolveShoppingStopState('','',mod.tripDatasetAuthority(ONLINE,orderDays)),'unbound','沒有 stopRef 是隨時可買,不是孤兒');
assert.strictEqual(mod.resolveShoppingStopState('d1_a',stop,'authoritative'),'resolved','F3 權威資料且站點存在 → 正常顯示');
assert.strictEqual(mod.resolveShoppingStopState('d1_a',null,'authoritative'),'orphan','F4 權威資料且站點不存在 → 確認失效');
assert.strictEqual(mod.resolveShoppingStopState('d1_a',null,'unverified'),'pending','F1/F2 資料未就緒或身分未知 → 待確認,不是孤兒');
assert.strictEqual(mod.resolveShoppingStopState('d1_a',stop,'unverified'),'resolved','站點查得到就照常顯示,不因來源降級');

const single=plain(mod.shoppingLedgerSinglePrefill({
  name:'眼藥水',
  category:'代購',
  quantity:2,
  unit:'',
  buyFor:'小明'
}));
assert.deepStrictEqual(single,{
  detail:'眼藥水',
  amount:'',
  category:'購物',
  note:'數量：2 · 幫誰買：小明',
  isProxy:true,
  proxyTarget:'小明'
},'single-item loop maps fields without inventing an amount');
const ordinary=plain(mod.shoppingLedgerSinglePrefill({name:'牙刷',category:'生活用品',qty:'',buyFor:''}));
assert.strictEqual(ordinary.category,'購物');
assert.strictEqual(ordinary.amount,'');
assert.strictEqual(ordinary.isProxy,false);

const multi=plain(mod.shoppingLedgerMultiPrefill([
  {name:'眼藥水',category:'代購',buyFor:'小明'},
  {name:'白桃',category:'伴手禮',buyFor:''}
]));
assert.deepStrictEqual(multi,[
  {name:'眼藥水',amount:'',category:'購物',isProxy:true,proxyTarget:'小明'},
  {name:'白桃',amount:'',category:'購物',isProxy:false,proxyTarget:''}
],'multi-item loop creates one blank-amount ledger item per shopping item');

const sharedTargets=mod.createLedgerProxyTargetStore({storage:mod.localStorage,key:'trip_ledger_proxy_targets'});
sharedTargets.add(' 小明 ');
sharedTargets.add('小明');
assert.deepStrictEqual(plain(sharedTargets.all()),['小明'],'shopping and ledger use the same de-duplicated proxy-target store');

const ui=fs.readFileSync('index.html','utf8');
function extractUiFunction(name){
  const start=ui.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=ui.indexOf('{',start),depth=0;
  for(;index<ui.length;index++){
    if(ui[index]==='{')depth++;
    else if(ui[index]==='}')depth--;
    if(depth===0)return ui.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}
const listOverlaySource=extractUiFunction('renderShoppingListOverlay');
assert(listOverlaySource.includes('renderShoppingSplitForm()'),'部分購買仍留在採買清單內');
assert(!listOverlaySource.includes('renderShoppingForm()+'),'新增／編輯表單不再插入採買清單內容流');
assert(listOverlaySource.includes('renderShoppingFormSheet()'),'清單重繪會同步獨立 Sheet 狀態');
const formSheetSource=extractUiFunction('renderShoppingFormSheet');
assert(formSheetSource.includes("overlay.id='shoppingFormSheet'"),'新增／編輯共用唯一 Sheet overlay');
assert(formSheetSource.includes('role="dialog"'),'Sheet 使用 dialog 語意');
assert(formSheetSource.includes('aria-modal="true"'),'Sheet 宣告 modal 語意');
assert(formSheetSource.includes('shoppingFormTitle'),'Sheet 標題可由 aria-labelledby 取得');
assert(extractUiFunction('renderShoppingItem').includes('data-shopping-item-id'),'每張卡片提供穩定 item ID 返回錨點');
assert(
  /startShoppingEdit\(\\'[\s\S]*\\',\\'detail\\'\)/.test(extractUiFunction('renderShoppingItemDetail')),
  '從明細進入編輯會記錄 detail 返回 context'
);
const openFormSource=extractUiFunction('openShoppingForm');
assert(openFormSource.includes('focusShoppingNameInput()'),'開啟 Sheet 同步聚焦品名');
assert(!openFormSource.includes('requestAnimationFrame'),'開啟 Sheet 不延後到下一個 frame 才聚焦');
const commitFormSource=extractUiFunction('commitShoppingFormPayload');
assert(commitFormSource.includes('shoppingSaveAnotherForm(form)'),'儲存並新增沿用核准的清理 helper');
assert(commitFormSource.includes('focusShoppingNameInput()'),'儲存並新增同步把游標送回品名');
assert(commitFormSource.includes('restoreShoppingFormReturn('),'一般儲存後依 session 返回');
const saveFormSource=extractUiFunction('saveShoppingForm');
assert(saveFormSource.includes('session.savePending'),'重複送出由同一 form session 阻擋');
assert(saveFormSource.includes('setShoppingFormSavePending(true)')||commitFormSource.includes('setShoppingFormSavePending(true)'),'寫入前設為 pending');
assert(saveFormSource.includes('setShoppingFormSavePending(false)')||commitFormSource.includes('setShoppingFormSavePending(false)'),'失敗時解除 pending');
const renderedFormSource=extractUiFunction('renderShoppingForm');
assert(/aria-label="關閉表單"[\s\S]*disabled/.test(renderedFormSource),'儲存中停用 Sheet 關閉');
assert(/shopping-save-another[\s\S]*disabled/.test(renderedFormSource),'儲存中停用儲存並新增');
let shoppingNameFocusCount=0;
const focusSandbox={
  document:{
    getElementById(id){
      return id==='shoppingName'?{focus(){shoppingNameFocusCount++;}}:null;
    }
  }
};
vm.createContext(focusSandbox);
vm.runInContext(extractUiFunction('focusShoppingNameInput'),focusSandbox);
focusSandbox.focusShoppingNameInput();
assert.strictEqual(shoppingNameFocusCount,1,'品名聚焦 helper 可在同一呼叫堆疊執行');
const commitEvents=[];
let commitAdds=0;
const originalContinuousForm={
  id:'',name:'白桃',category:'必買',quantity:'3',unit:'盒',
  targets:['媽媽'],allocations:[],stopRef:'stop-a',done:false,createdAt:''
};
const commitSandbox={
  shoppingUiState:{
    form:originalContinuousForm,
    formSession:plain(mod.createShoppingFormSession('add',null,'list',640))
  },
  shoppingListStore:{
    all(){return [];},
    add(payload){
      commitAdds++;
      if(commitAdds===1){
        commitSandbox.commitShoppingFormPayload(originalContinuousForm,payload,true);
      }
      return {id:'saved-1',category:payload.category,stopRef:payload.stopRef};
    },
    update(){throw new Error('unexpected update');}
  },
  setShoppingFormSavePending(pending){
    commitSandbox.shoppingUiState.formSession.savePending=!!pending;
  },
  shoppingPhotoIdsReleased(){return [];},
  cleanupShoppingPhotoIds(){return Promise.resolve([]);},
  refreshShoppingPhotoAudit(){return Promise.resolve();},
  shoppingSaveAnotherForm:mod.shoppingSaveAnotherForm,
  createShoppingFormSession:mod.createShoppingFormSession,
  renderToday(){},
  renderShoppingListOverlay(){},
  renderShoppingFormSheet(){},
  focusShoppingNameInput(){commitEvents.push('focus');},
  toast(){commitEvents.push('toast');},
  closeShoppingFormSheet(){},
  restoreShoppingFormReturn(){commitEvents.push('restore');},
  focusShoppingFormError(){commitEvents.push('error-focus');}
};
vm.createContext(commitSandbox);
vm.runInContext(commitFormSource,commitSandbox);
commitSandbox.commitShoppingFormPayload(
  originalContinuousForm,
  {name:'白桃',category:'必買',stopRef:'stop-a'},
  true
);
assert.strictEqual(commitAdds,1,'pending guard 阻擋同一次同步寫入中的重入送出');
assert.strictEqual(commitSandbox.shoppingUiState.form.name,'','儲存並新增清空品名');
assert.strictEqual(commitSandbox.shoppingUiState.form.category,'必買','儲存並新增保留分類');
assert.strictEqual(commitSandbox.shoppingUiState.form.stopRef,'stop-a','儲存並新增保留站點');
assert.strictEqual(commitSandbox.shoppingUiState.form.quantity,1,'儲存並新增重設數量 1');
assert.strictEqual(commitSandbox.shoppingUiState.form.unit,'個','儲存並新增重設單位 個');
assert(
  commitEvents.indexOf('focus')>=0&&commitEvents.indexOf('focus')<commitEvents.indexOf('toast'),
  '連續新增在 Toast 前同步聚焦下一筆品名'
);
const groupSandbox={
  shoppingUiState:{tab:'pending'},
  shoppingTripAuthority(){return 'authoritative';},
  shoppingStopById(stopRef){return stopRef==='resolved'?{id:'resolved',dayIndex:0,name:'岡山站'}:null;},
  resolveShoppingStopState(stopRef,stop){return stop?'resolved':stopRef||'unbound';},
  DB:{trip:{days:[]}},
  buildShoppingStopOrder(){return {};},
  sortShoppingStopGroups(groups){return groups;},
  SHOPPING_STOP_STATE_LABEL:{pending:'待確認',orphan:'已失效'},
  renderShoppingItem(item){return '<i>'+item.id+'</i>';},
  escapeHtml(value){return String(value);}
};
vm.createContext(groupSandbox);
vm.runInContext(extractUiFunction('prioritizeShoppingGroupItems'),groupSandbox);
vm.runInContext(extractUiFunction('renderShoppingGroups'),groupSandbox);
const groupedHtml=groupSandbox.renderShoppingGroups([
  {id:'resolved-normal',category:'伴手禮',stopRef:'resolved'},
  {id:'resolved-required',category:'必買',stopRef:'resolved'},
  {id:'pending-normal',category:'生活用品',stopRef:'pending'},
  {id:'pending-required',category:'必買',stopRef:'pending'},
  {id:'orphan-normal',category:'其他',stopRef:'orphan'},
  {id:'orphan-required',category:'必買',stopRef:'orphan'},
  {id:'unbound-normal',category:'伴手禮',stopRef:''},
  {id:'unbound-required',category:'必買',stopRef:''}
]);
[
  ['resolved-required','resolved-normal'],
  ['pending-required','pending-normal'],
  ['orphan-required','orphan-normal'],
  ['unbound-required','unbound-normal']
].forEach(([requiredId,normalId])=>{
  assert(
    groupedHtml.indexOf(requiredId)<groupedHtml.indexOf(normalId),
    requiredId+' 在所屬待買群組內穩定置頂'
  );
});
groupSandbox.shoppingUiState.tab='done';
const doneOrderHtml=groupSandbox.renderShoppingGroups([
  {id:'done-normal',category:'伴手禮'},
  {id:'done-required',category:'必買'}
]);
assert(
  doneOrderHtml.indexOf('done-normal')<doneOrderHtml.indexOf('done-required'),
  '已買頁維持原 store order，不套用必買置頂'
);
const reset=plain(mod.shoppingSaveAnotherForm({
  name:'白桃',category:'伴手禮',quantity:'4',unit:'盒',
  targets:['阿寶','媽媽'],stopRef:'d2_shop'
}));
assert.deepStrictEqual(reset,{
  id:'',name:'',category:'伴手禮',quantity:1,unit:'個',
  legacyQtyText:'',targets:[],allocations:[],
  stopRef:'d2_shop',done:false,createdAt:'',photoId:''
});
assert.deepStrictEqual(
  plain(mod.createShoppingFormSession(
    'edit',
    {id:'item-1',category:'伴手禮',stopRef:'stop-a'},
    'list',
    840
  )),
  {
    mode:'edit',
    itemId:'item-1',
    returnContext:'list',
    returnScrollTop:840,
    originalCategory:'伴手禮',
    originalStopRef:'stop-a',
    originalPhotoId:'',
    temporaryPhotoIds:[],
    savePending:false
  },
  '編輯 Sheet session 保存返回位置與原分類／站點'
);
assert.deepStrictEqual(
  plain(mod.createShoppingFormSession('add',null,'list',-3)),
  {
    mode:'add',
    itemId:'',
    returnContext:'list',
    returnScrollTop:0,
    originalCategory:'',
    originalStopRef:'',
    originalPhotoId:'',
    temporaryPhotoIds:[],
    savePending:false
  },
  '新增 Sheet session 使用安全的清單返回預設值'
);
assert.throws(
  ()=>mod.createShoppingFormSession('edit',null,'list',0),
  /採買項目/,
  '編輯 session 不得在找不到項目時降級成新增'
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {returnContext:'list',originalCategory:'伴手禮',originalStopRef:'stop-a'},
    {id:'item-1',category:'伴手禮',stopRef:'stop-a'},
    false
  )),
  {target:'card',restoreExactScroll:true},
  '未移動的編輯項目回到原卡片與精確捲動位置'
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {returnContext:'list',originalCategory:'伴手禮',originalStopRef:'stop-a'},
    {id:'item-1',category:'必買',stopRef:'stop-a'},
    false
  )),
  {target:'card',restoreExactScroll:false},
  '分類改變時按 item ID 尋找移動後卡片'
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan(
    {returnContext:'detail',originalCategory:'',originalStopRef:''},
    {id:'item-1',category:'必買',stopRef:'stop-b'},
    false
  )),
  {target:'detail',restoreExactScroll:false},
  '從明細編輯後重新開啟同一項目明細'
);
assert.deepStrictEqual(
  plain(mod.shoppingFormReturnPlan({returnContext:'list'},null,true)),
  {target:'list',restoreExactScroll:true},
  '取消新增時回到原清單捲動位置'
);
['盒','包','瓶'].forEach(function(unit){
  assert.strictEqual(mod.newShoppingForm({id:'old-'+unit,quantity:2,unit:unit}).unit,unit,
    'editing preserves the existing '+unit+' unit');
});
const legacyBlank={id:'legacy-blank',quantity:2,unit:''};
const legacyDraft=plain(mod.newShoppingForm(legacyBlank));
assert.strictEqual(legacyDraft.unit,'個','an old blank unit is preselected as 個 in the edit draft');
assert.strictEqual(legacyBlank.unit,'','opening an old blank unit never rewrites the stored source object');
const formPayload=plain(mod.shoppingFormPayload({
  id:'',name:'白桃',category:'伴手禮',quantity:'2',unit:'盒',
  targets:['阿寶','媽媽'],stopRef:'d2_shop'
}));
assert.deepStrictEqual(formPayload.allocations.map(value=>[
  value.target,value.quantity,value.allocationId
]),[
  ['阿寶',2,''],
  ['媽媽',2,'']
]);
assert(ui.includes('幫誰買（可多選）'));
assert(ui.includes('toggleShoppingFormTarget('));
assert(ui.includes('id="shoppingBuyForNew"'));
assert(ui.includes('>儲存並新增</button>'));
assert(!ui.includes("SHOPPING_CATEGORIES=['必買','伴手禮','代購'"));
assert.match(ui,/\.shopping-target-badge\{[^}]*background:var\(--coral-bg\)[^}]*color:var\(--coral\)[^}]*border-radius:6px/);
assert(ui.includes('--font-ui:"PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif'),
  '全站字體變數只使用裝置內建繁中 fallback，不等待遠端字體');
/* 這裡原本釘住 v77 的使用者版更新說明。但 APP_RELEASE_NOTES 是**刻意**只留五筆的
   滾動視窗(契約在 theme-system.test.js),歷史條目遲早會被擠掉 —— v82 就擠掉了 v77。
   釘住會滾掉的東西是時間炸彈,且與本檔要驗的「照片完整性功能是否存在」無關;
   功能本身由下面三條斷言負責,歷史交付紀錄則在 07_CHANGELOG.md。 */
assert(ui.includes('var shoppingPhotoAuditState='),'the App owns one attachment audit state');
assert(ui.includes('function refreshShoppingPhotoAudit('),'the App exposes one audit refresh entry');
assert(ui.includes('TripShoppingPhotos.auditAttachments('),'the UI delegates integrity rules to the photo module');
assert(ui.includes("refreshShoppingPhotoAudit({cleanupExpired:true,reason:'startup'})"),'startup schedules one maintenance audit');
assert(!/cleanupShoppingPhotoIds\(shoppingPhotoIdsReleased\(before,shoppingListStore\.all\(\)\)\)/.test(ui),'saved reference changes wait for orphan maintenance');
assert(!/cleanupShoppingPhotoIds\(shoppingPhotoIdsReleased\(before,after\)\)/.test(ui),'deleted item photos wait for orphan maintenance');
assert(ui.includes('function openShoppingPhotoRepair('),'missing attachments expose an in-context repair sheet');
assert(ui.includes('function repairShoppingPhoto('),'repair stores a replacement photo');
assert(ui.includes('function removeInvalidShoppingPhotoReference('),'repair can remove only the invalid reference');
assert(ui.includes('isQuotaExceededError(error)'),'save failures distinguish quota exhaustion');
assert(ui.includes('font-family:var(--font-ui)'),'body 使用全站字體變數');
assert(!ui.includes('font-family:"Hiragino Sans","Noto Sans TC","PingFang TC"'),
  '不得再由日文字型逐字 fallback 造成粗細不一致');
assert(/\.shopping-category-badge\{[^}]*background:#fff7dc;[^}]*color:#8a6416/.test(ui),
  '類別使用淡金底與深金字');
assert.match(ui,/class="shopping-item-title-row"/);
assert(ui.includes('shoppingCardTargetModel(item)'));
assert(ui.includes('shoppingItemQuantitySummary(item)'));
assert(ui.includes('shoppingItemLinkSummary(item,shoppingLedgerContext())'));
assert(ui.includes("item.done||linkSummary.state!=='unlinked'"));
assert(ui.includes("linkSummary.state==='partial'"));
assert(ui.includes('id="shoppingListOverlay"')||ui.includes("overlay.id='shoppingListOverlay'"),'full shopping list opens as an overlay');
assert(ui.includes('今天有 ')&&ui.includes('項待買'),'Today has the approved reminder copy');
assert(ui.includes('function renderShoppingTodayEntry(day)'),'Today uses one entry selector to avoid duplicate launchers');
assert(ui.includes('採買清單 →'),'empty, non-trip, and no-reminder Today states keep a lightweight list entry');
/* 待買多選工具列:計數與三顆動作同列,320px 也不斷行。 */
assert(ui.includes('completeSelectedShopping(false)'),'待買多選可只標記已買');
assert(ui.includes('completeSelectedShopping(true)'),'待買多選可直接建立多品項消費');
assert(ui.includes('deleteSelectedShoppingItems()'),'待買多選可批次刪除');
assert(ui.includes('function renderShoppingListSelectionControls(items)'),
  'the list header owns a dedicated selection control renderer');
assert(ui.includes('id="shoppingSelectAllButton"'),
  'multi-select exposes one stable focus target for select all and deselect all');
assert(ui.includes('id="shoppingCancelSelectionButton"'),
  'cancel multi-select remains a separate action');
assert(ui.includes('toggleShoppingPageSelection()'),
  'select all uses the current-tab selection handler');
assert(/\.shopping-list-tool-actions\{[^}]*display:flex[^}]*white-space:nowrap/.test(ui),
  'the two controls share a non-wrapping action group');
assert(/\.shopping-list-tools button\{[^}]*min-height:44px/.test(ui),
  'top Shopping controls expose a 44px touch target');
assert(!ui.includes('建立多品項消費'),'過長的舊按鈕文案已縮短');
const shoppingToolbarRenderer=ui.slice(
  ui.indexOf('function renderShoppingSelectionToolbar()'),
  ui.indexOf('function startShoppingSplit(',ui.indexOf('function renderShoppingSelectionToolbar()'))
);
assert(!shoppingToolbarRenderer.includes('shopping-selection-toolbar-stacked'),
  '工具列不再套用兩列版面');
assert(ui.includes('shopping-selection-toolbar-empty'),'零選取顯示簡潔提示');
assert(ui.includes('shopping-selection-spacer'),'固定工具列有底部捲動保留空間');
assert(/\.shopping-selection-toolbar button\{[^}]*white-space:nowrap/.test(ui),
  '批次按鈕文字不可斷行');
/* 單位:下拉選單、與數量並排、可在設定頁管理 */
const quantityFields=extractUiFunction('renderShoppingQuantityFields');
assert(quantityFields.includes('shopping-quantity-row'),'數量與單位並排於同一列');
assert(quantityFields.includes('<select class="shopping-select" id="shoppingUnit"'),'單位改為下拉選單');
assert(!quantityFields.includes('shopping-chip-grid'),'單位不再使用 chips');
assert(!quantityFields.includes('placeholder="其他單位"'),'表單不再提供其他單位自由輸入');
assert(!quantityFields.includes('<option value="">'),'單位下拉不提供空白選項');
assert(!quantityFields.includes('不指定'),'單位下拉不提供「不指定」選項');
assert(quantityFields.includes('shoppingUnitStore.all()'),'單位選項來自可管理的 store');
assert(quantityFields.includes('unitMissing'),'目前單位不在清單時仍以自身成為選中的 option,不得靜默改掉既有資料');
assert(ui.includes("renderLedgerOptionManager('shoppingUnit','採買單位')"),'設定頁可管理採買單位');
assert(ui.includes("kind==='shoppingUnit'?shoppingUnitStore"),'選項管理器沿用既有泛用 store 分派');
assert(mod.shoppingUnitStore.all().includes('個'),'the Shopping unit Store always exposes 個');
const removeOptionSource=extractUiFunction('removeLedgerOptionFromSettings');
assert(removeOptionSource.includes('「個」是新增採買項目的預設單位，無法刪除。'),
  'the settings handler owns the approved protected-unit explanation');
let unitRemoves=0,unitToast='';
const removeSandbox={
  SHOPPING_DEFAULT_UNIT:'個',
  ledgerOptionStoreForKind(){return {remove(){unitRemoves++;},all(){return ['個'];}};},
  openSettings(){},
  toast(message){unitToast=message;}
};
vm.createContext(removeSandbox);
vm.runInContext(removeOptionSource,removeSandbox);
removeSandbox.removeLedgerOptionFromSettings('shoppingUnit','個');
assert.strictEqual(unitRemoves,0,'the protected default never reaches Store.remove()');
assert.strictEqual(unitToast,'「個」是新增採買項目的預設單位，無法刪除。');
/* 卡片:動作收進 ⋯,只有「記帳」留在列上 */
assert(ui.includes('function openShoppingItemActions('),'採買列有 ⋯ 操作選單');
assert(ui.includes('shoppingItemActionPopover'),'選單有獨立的 popover 節點');
assert(ui.includes('ledger-action-popover'),'沿用帳本既有 popover 樣式,未另造一套');
assert(!/shopping-item-actions[\s\S]{0,200}>編輯</.test(ui),'編輯不再直接排在列上');
/* 單筆記帳入口必須接回既有函式,不另造流程 */
const itemRenderer=extractUiFunction('renderShoppingItem');
assert(itemRenderer.includes('shoppingPhotoStatus(item)'),'card rendering consumes the audited photo status');
assert(itemRenderer.includes('aria-label="附件已遺失"'),'invalid attachment has an accessible name');
assert(itemRenderer.includes('shopping-photo-indicator-invalid'),'invalid attachment has a dedicated component class');
assert(!itemRenderer.includes('>附件已遺失<'),'invalid card status has no visible text');
assert(itemRenderer.includes('selection=shoppingUiState.selectionMode'),
  '待買與已買在多選模式都使用 selection checkbox');
assert(!itemRenderer.includes('shoppingUiState.selectionMode&&!item.done'),
  '已買項目不再被排除於多選 checkbox');
assert(itemRenderer.includes("var inlineAction=selection?'':"),
  '多選模式隱藏卡片上的部分購買與記帳');
assert(itemRenderer.includes("var menu=selection?'':"),
  '多選模式隱藏卡片上的操作選單');
assert(itemRenderer.includes('shoppingCardTargetModel(item)'),'卡片使用結構化 target model');
assert(itemRenderer.includes('shopping-target-affix'),'幫／買／+N 使用普通文字片段');
assert(itemRenderer.includes('targetModel.names.map'),'姓名逐一輸出 badge');
assert(!itemRenderer.includes('escapeHtml(targetSummary)'),'不得再把整句摘要包成單一 badge');
assert(itemRenderer.includes('canOfferShoppingPartialPurchase(item,linkSummary)'),
  '卡片部分購買入口使用統一 eligibility helper');
assert(itemRenderer.includes('>部分購買</button>'),'卡片直接顯示部分購買');
assert(itemRenderer.includes('openShoppingLedgerEntry(')&&itemRenderer.includes('>記帳</button>'),'已買未記帳項目直接呼叫既有的 openShoppingLedgerEntry()');
assert(ui.includes('releaseShoppingLedgerLink('),'已記帳項目顯示改回未記帳');
assert(itemRenderer.includes('shoppingItemLinkSummary(item,shoppingLedgerContext())')&&
  itemRenderer.includes("linkSummary.state==='unlinked'")&&
  itemRenderer.includes("linkSummary.state==='partial'"),
  '列上入口顯示一律走共用 resolver 的三態');
const itemRendererCode=itemRenderer.replace(/\/\*[\s\S]*?\*\//g,'');
assert(!/ledgerLinks\.length/.test(itemRendererCode),'不得以 ledgerLinks.length 判斷是否可記帳');
assert(itemRenderer.indexOf('記帳<')>0&&itemRenderer.indexOf('item.done')>0,'記帳入口只在已買項目出現');
const renderShoppingItemSource=extractUiFunction('renderShoppingItem');
const cardSandbox={
  shoppingUiState:{selected:{},selectionMode:false},
  shoppingStopById(stopRef){return stopRef==='resolved'?{dayIndex:1,name:'岡山站'}:null;},
  shoppingStopStateFor(item){return item.__state;},
  shoppingItemLinkSummary(){return {state:'unlinked'};},
  shoppingLedgerContext(){return {};},
  shoppingCardLinkBadge(){return '';},
  shoppingPhotoStatus(){return 'none';},
  shoppingCardTargetModel(){return {prefix:'',names:[],overflow:'',suffix:'',ariaLabel:''};},
  shoppingItemQuantitySummary(){return '1 個';},
  shoppingItemLocationLine:mod.shoppingItemLocationLine,
  canOfferShoppingPartialPurchase(){return false;},
  escapeHtml(value){return String(value);},
  jsString(value){return String(value);}
};
vm.createContext(cardSandbox);
vm.runInContext(renderShoppingItemSource,cardSandbox);
[
  {stopRef:'resolved',__state:'resolved',location:'DAY 2 · 岡山站'},
  {stopRef:'pending',__state:'pending',location:'行程站點待確認'},
  {stopRef:'orphan',__state:'orphan',location:'原行程站點已不存在'},
  {stopRef:'',__state:'unbound',location:''}
].forEach(function(example){
  const item={id:'card-'+example.__state,name:'白桃',category:'伴手禮',done:false,stopRef:example.stopRef,__state:example.__state};
  const pending=cardSandbox.renderShoppingItem(item,{page:'pending'});
  assert(!pending.includes('shopping-item-location'),'待買 '+example.__state+' 卡片不輸出地點列');
  if(example.location)assert(!pending.includes(example.location),'待買 '+example.__state+' 卡片的無障礙樹不含重複地點');
  cardSandbox.shoppingUiState.selectionMode=true;
  assert(!cardSandbox.renderShoppingItem(item,{page:'pending'}).includes('shopping-item-location'),
    '待買 '+example.__state+' 多選卡片沿用相同地點規則');
  cardSandbox.shoppingUiState.selectionMode=false;
  const done=cardSandbox.renderShoppingItem(Object.assign({},item,{done:true}),{page:'done'});
  if(example.location)assert(done.includes(example.location),'已買 '+example.__state+' 卡片保留地點列');
});
assert.throws(
  ()=>cardSandbox.renderShoppingItem({id:'missing-context',name:'白桃',done:false,stopRef:'',__state:'unbound'}),
  /context/,
  '卡片 renderer 缺少明確頁面 context 時拒絕猜測'
);
/* B:單筆勾選不再開三選一 Modal,改為直接完成＋toast 復原。 */
assert(!ui.includes('shoppingCompleteChoice'),'single completion no longer opens the three-way modal');
assert(!ui.includes('function undoShoppingCompleteChoice'),'the modal-only undo handler is retired');
assert(ui.includes('代購對象與記帳紀錄'),'明細標題使用核准文案');
assert(!ui.includes('代購對象與帳本紀錄'),'舊明細標題已移除');
assert(ui.includes('shoppingDetailAllocationQuantityText(item,allocation,model.unit)'),
  '明細數量使用狀態感知 helper');
assert(/\.shopping-detail-allocation-main\{[^}]*display:flex;[^}]*flex-wrap:wrap/.test(ui),
  '姓名與數量在同列並允許窄螢幕換行');
assert(/\.shopping-detail-footer-actions\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(ui),
  '明細兩顆底部按鈕等寬同行');
const doneStart=ui.indexOf('function toggleShoppingItemDone(id,done)');
const doneEnd=ui.indexOf('\nfunction openShoppingLedgerEntry',doneStart);
assert(doneStart>=0&&doneEnd>doneStart,'completion has a dedicated handler');
const doneSource=ui.slice(doneStart,doneEnd);
const doneCalls=[];let toastAction=null;
vm.runInNewContext(
  doneSource+';toggleShoppingItemDone("shopping-a",true);',
  {
    shoppingListStore:{update(id,changes){doneCalls.push(['update',id,changes]);return {id,name:'白桃'};}},
    timestampDate(value){return new Date(Number(value));},
    Date:{now(){return Date.parse('2026-10-20T04:00:00.000Z');}},
    toast(message,label,action){doneCalls.push(['toast',message,label]);toastAction=action;},
    renderToday(){doneCalls.push(['today']);},
    renderShoppingListOverlay(){doneCalls.push(['list']);}
  }
);
assert.deepStrictEqual(plain(doneCalls[0]),['update','shopping-a',{done:true,completedAt:'2026-10-20T04:00:00.000Z'}],'勾選寫入 done 與 completedAt');
assert.strictEqual(doneCalls[3][0],'toast');
assert.strictEqual(doneCalls[3][2],'復原','toast 提供復原動作');
assert(String(doneCalls[3][1]).indexOf('已標記')===0,'toast 使用核准文案');
assert(!/ledgerLinks\s*:/.test(doneSource),'完成與復原都不寫入 ledgerLinks');
assert((doneSource.match(/moveBackToPending\(\[id\]\)/g)||[]).length===2,
  'checkbox 取消與 Toast 復原共用 Store moveBackToPending');
assert.match(ui,/\.shopping-list-panel\{[^}]*overflow-y:auto[^}]*touch-action:pan-y/,'shopping overlay follows Scroll-only with CSS touch-action');

/* ---- A＋F 的原始碼契約(顯示層無法以純函式覆蓋的部分) ---- */
const shoppingSource=ui.slice(ui.indexOf('/* ================= 採買清單'),ui.indexOf('/* ================= 購物模式'));
assert(shoppingSource.length>2000,'採買清單區段切片有效');
/* A:待買頁與 Today 共用同一份排序 helper,不各自實作 */
assert(shoppingSource.includes('sortShoppingStopGroups('),'A4 待買頁接上共用群組排序 helper');
assert(shoppingSource.includes('buildShoppingStopOrder('),'A4 待買頁接上共用站點排名');
const reminderSource=ui.slice(ui.indexOf('function buildShoppingTodayReminder('),ui.indexOf('function shoppingLedgerSinglePrefill('));
assert(reminderSource.includes('sortShoppingStopGroups(')&&reminderSource.includes('buildShoppingStopOrder('),'A4 Today 提醒使用同一組 helper');
/* A6:已買頁不套用行程排序,維持既有 store order */
assert(/shoppingUiState\.tab==='done'\)[\s\S]{0,240}renderShoppingItem\(item,\{page:'done'\}\)/.test(shoppingSource),
  '已買頁以明確 done context 平鋪並保留地點');
assert((shoppingSource.match(/renderShoppingItem\(item,\{page:'pending'\}\)/g)||[]).length===4,
  '一般站點、待確認、已失效與隨時可買四種待買群組都使用 pending context');
assert(/已買頁不在本批排序範圍/.test(shoppingSource),'已買頁排除範圍在程式註解中寫明');
/* F7:不得因冷啟動、離線或暫時資料空白就批次清空 stopRef */
assert(!/shoppingListStore\.update\([^)]*\{\s*stopRef\s*:/.test(shoppingSource),'F7 沒有任何自動清除 stopRef 的寫入');
/* F5/F6:編輯表單必須保留原綁定,且不得畫面顯示「不綁定」但 state 仍藏舊 ID */
assert(shoppingSource.includes('function clearShoppingStopBinding('),'F5 表單提供明確的清除綁定入口');
assert(shoppingSource.indexOf('<option value="\'+escapeHtml(form.stopRef)+\'" selected>')>=0,'F6 解析不到的原綁定以自身值成為選中的 option,不偽裝成「不綁定」');
assert(shoppingSource.includes('原行程站點已不存在'),'F4 確認失效有明確警告文案');
assert(shoppingSource.includes('行程站點待確認'),'F1/F2 未就緒使用中性文案');
assert(!shoppingSource.includes('shopping-group-title">已綁定行程'),'舊的模糊分組文案已退場,不再把待確認與已失效混成同一桶');
assert(shoppingSource.includes('shoppingTripAuthority()'),'顯示層透過單一權威性入口取得資料來源判定');
const authoritySource=ui.slice(ui.indexOf('function tripDatasetAuthority('),ui.indexOf('function resolveShoppingStopState('));
assert(authoritySource.includes('CURRENT_SNAPSHOT')||ui.includes('tripDatasetAuthority(CURRENT_SNAPSHOT'),'權威性沿用資料層既有的 snapshot source,未另造平行狀態');

console.log('shopping list tests passed');
