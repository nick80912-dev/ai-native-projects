/* shopping-ledger-links.test.js — 採買清單 ↔ Ledger 持久關聯(第二批 B＋D)
   ledgerLinks[] append-only、releasedAt 解除事實、三態動態推導、
   多品項 source→record 一一對應、原子回寫、部分購買拆分、個人狀態備份 v5。 */
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function createStorage(){
  const values={};
  let failKey='';
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){if(key===failKey){failKey='';throw new Error('storage denied');}values[key]=String(value);},
    removeItem(key){delete values[key];},
    failOnceOn(key){failKey=key;},
    snapshot(){return JSON.stringify(values);},
    __raw:values
  };
}
function plain(value){return JSON.parse(JSON.stringify(value));}

function loadModule(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ================= ledgerRepository');
  const end=html.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:createStorage(),
    Date,Math,Promise,JSON,String,Number,Boolean,isFinite,setTimeout,clearTimeout,
    timestampDate(value){return new Date(Number(value));},
    canonicalMemberName(value){return String(value==null?'':value).replace(/　/g,' ').replace(/\s+/g,' ').trim();},
    AppLog:{repo(){},sync(){},data(){}},
    fetch(){return Promise.reject(new Error('network disabled'));},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(start,end),sandbox);
  sandbox.__html=html;
  return sandbox;
}

const mod=loadModule();
const html=mod.__html;
const NOW='2026-10-20T04:00:00.000Z';
const ids=list=>Array.from(list,item=>item.id);
const link=over=>Object.assign({version:1,track:'personal',testMode:false,recordId:'r-1',batchId:'',linkedAt:NOW,releasedAt:''},over||{});

/* ================= Shopping Item normalizer ================= */
const legacy=mod.normalizeShoppingItem({id:'s-old',name:'舊資料',createdAt:NOW});
assert.strictEqual(legacy.completedAt,'','舊資料補 completedAt:""');
assert.strictEqual(legacy.splitGroupId,'','舊資料補 splitGroupId:""');
assert.deepStrictEqual(plain(legacy.allocations[0].ledgerLinks),[],'舊資料補 allocation ledgerLinks:[]');

const withLink=mod.normalizeShoppingItem({
  id:'s-1',name:'益生菌',qty:'3 罐',done:true,createdAt:NOW,completedAt:NOW,splitGroupId:'s-1',
  ledgerLinks:[link({recordId:'r-a'}),link({recordId:'r-b',track:'shared',batchId:'batch-1',releasedAt:NOW})]
});
assert.deepStrictEqual(plain(withLink.allocations[0].ledgerLinks),[
  {version:1,track:'personal',testMode:false,recordId:'r-a',batchId:'',linkedAt:NOW,releasedAt:''},
  {version:1,track:'shared',testMode:false,recordId:'r-b',batchId:'batch-1',linkedAt:NOW,releasedAt:NOW}
],'有效 ledgerLinks 完整 round-trip');

assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:[link({track:'cloud'})]}),/軌別|track/,'無效 track 拒絕');
assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:[link({recordId:''})]}),/紀錄 ID|recordId/,'空 recordId 拒絕');
assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:[link({linkedAt:'not-a-time'})]}),/時間/,'無效 linkedAt 拒絕');
assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:[link({releasedAt:'nope'})]}),/時間/,'非空無效 releasedAt 拒絕');
assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:{}}),/陣列|array/i,'ledgerLinks 必須是陣列');
assert.doesNotThrow(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,ledgerLinks:[link({releasedAt:''})]}),'releasedAt 空字串允許');
assert.strictEqual(mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,done:false,completedAt:NOW}).completedAt,'','done false 時不得保留矛盾的 completedAt');
assert.strictEqual(mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,done:true,completedAt:''}).completedAt,'','legacy done true＋completedAt 空值安全保留,不得編造時間');
assert.throws(()=>mod.normalizeShoppingItem({id:'x',name:'x',createdAt:NOW,done:true,completedAt:'bad'}),/時間/,'非空無效 completedAt 拒絕');

/* ================= active link ================= */
assert.strictEqual(mod.activeShoppingLedgerLink({ledgerLinks:[]}),null,'無 link 時沒有 active link');
assert.strictEqual(mod.activeShoppingLedgerLink({ledgerLinks:[link({releasedAt:NOW})]}),null,'已 released 沒有 active link');
assert.strictEqual(mod.activeShoppingLedgerLink({ledgerLinks:[link({recordId:'r-a',releasedAt:NOW}),link({recordId:'r-b'})]}).recordId,'r-b','只看最後一個 link');

/* ================= link state resolver ================= */
const ctx=over=>Object.assign({
  testMode:false,
  personal:{ready:true,records:[]},
  shared:{ready:true,records:[]}
},over||{});
const item=links=>({id:'s-1',name:'x',ledgerLinks:links||[]});
const expense=over=>Object.assign({id:'r-a',time:'2026-10-20T05:00:00.000Z',member:'Mark',recordType:'expense',participants:'["Mark"]',amountJpy:100,amountTwd:20,detail:'益生菌'},over||{});

assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([]),ctx()).state,'unlinked','無 link → unlinked');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({releasedAt:NOW})]),ctx()).state,'unlinked','最後 link released → unlinked');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a'})]),ctx({personal:{ready:true,records:[expense()]}})).state,'linked','個人 record 存在 → linked');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:true,records:[expense()]}})).state,'linked','團體遠端有效 record → linked');
assert.strictEqual(
  mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:false,records:[Object.assign(expense(),{pending:true})]}})).state,
  'linked','團體 record 仍在 durable queue → linked,不必等 Sheet 回讀');
assert.strictEqual(
  mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:false,records:[Object.assign(expense(),{bridgePending:true})]}})).state,
  'linked','團體 record 仍在 delivery bridge → linked');

/* replacement:編輯後新紀錄指向原 record */
const replaced=[expense({id:'r-new',replacesRecordId:'r-a'}),{id:'d-1',time:'2026-10-20T06:00:00.000Z',member:'Mark',recordType:'deletion',targetRecordId:'r-a',deleteReason:'編輯修改',participants:'',payMethod:'',amountJpy:0,amountTwd:0},expense()];
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:true,records:replaced}})).state,'linked','replacement 有效 → linked');

/* confirmed tombstone 且無 replacement → unlinked */
const tombstoned=[expense(),{id:'d-1',time:'2026-10-20T06:00:00.000Z',member:'Mark',recordType:'deletion',targetRecordId:'r-a',deleteReason:'買錯了',participants:'',payMethod:'',amountJpy:0,amountTwd:0}];
const tombState=mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:true,records:tombstoned}}));
assert.strictEqual(tombState.state,'unlinked','confirmed tombstone 且無 replacement → unlinked');

/* 不得因暫時找不到就判失效 */
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:false,records:[]}})).state,'unverified','資料未就緒且找不到 → unverified');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',track:'shared'})]),ctx({shared:{ready:true,records:[]}})).state,'unverified','已就緒但完全找不到且無 tombstone → 仍是 unverified,不得判刪除');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a'})]),ctx({personal:{ready:false,records:[]}})).state,'unverified','個人帳讀取失敗 → unverified');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a',testMode:true})]),ctx()).state,'unverified','TEST／正式 universe 不符 → unverified');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item([link({recordId:'r-a'})]),ctx({testMode:true,personal:{ready:true,records:[expense()]}})).state,'unverified','正式 link 在 TEST 模式下不得判為 linked');

/* 舊 released link 不得覆蓋後方 active link */
const history=[link({recordId:'r-old',releasedAt:NOW}),link({recordId:'r-a'})];
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item(history),ctx({personal:{ready:true,records:[expense()]}})).state,'linked','舊 released link 不影響後方 active link');
assert.strictEqual(mod.resolveShoppingLedgerLinkState(item(history),ctx({personal:{ready:true,records:[expense()]}})).activeLink.recordId,'r-a','resolver 只看最後一個 link');

/* ================= item aggregate link state ================= */
const summary=mod.shoppingItemLinkSummary({
  allocations:[
    {allocationId:'a',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[link({recordId:'r-c'})]}
  ]
},ctx({personal:{ready:true,records:[expense({id:'r-a'}),expense({id:'r-c'})]}}));
assert.deepStrictEqual(plain({
  state:summary.state,label:summary.label,linked:summary.linked,total:summary.total
}),{state:'partial',label:'記帳 2／3',linked:2,total:3});
const mixedUnverified=mod.shoppingItemLinkSummary({
  allocations:[
    {allocationId:'a',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[link({recordId:'missing',track:'shared'})]}
  ]
},ctx({personal:{ready:true,records:[expense({id:'r-a'})]},shared:{ready:false,records:[]}}));
assert.strictEqual(mixedUnverified.state,'unverified','任何 allocation 待確認時聚合狀態必須優先待確認');
assert.strictEqual(mixedUnverified.label,'狀態待確認');
const editPolicy=plain(mod.shoppingAllocationEditPolicy({
  allocations:[
    {allocationId:'linked',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'open',target:'媽媽',quantity:1,ledgerLinks:[]}
  ]
},ctx({personal:{ready:true,records:[expense({id:'r-a'})]}})));
assert.deepStrictEqual(editPolicy.allocations.map(value=>[
  value.allocationId,value.canEdit,value.reason
]),[
  ['linked',false,'已記帳'],
  ['open',true,'']
]);
const guardedItem={
  id:'shopping-guard',name:'白桃',unit:'盒',done:true,
  allocations:[
    {allocationId:'a-linked',target:'阿寶',quantity:1,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'a-unverified',target:'媽媽',quantity:1,ledgerLinks:[link({recordId:'r-missing',track:'shared'})]},
    {allocationId:'a-open',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const guardedPolicy=plain(mod.shoppingAllocationEditPolicy(
  guardedItem,
  ctx({
    personal:{ready:true,records:[expense({id:'r-a'})]},
    shared:{ready:false,records:[]}
  })
));
assert.deepStrictEqual(guardedPolicy.allocations.map(value=>[
  value.allocationId,value.canEdit,value.reason
]),[
  ['a-linked',false,'已記帳'],
  ['a-unverified',false,'狀態待確認'],
  ['a-open',true,'']
]);
const warning=mod.shoppingDeleteWarning([guardedItem],ctx({
  personal:{ready:true,records:[expense({id:'r-a'})]},
  shared:{ready:false,records:[]}
}));
assert.match(warning,/已有 1 位建立消費紀錄/);
assert.match(warning,/有 1 位記帳狀態待確認/);
const linkedSplitItem={
  allocations:[{allocationId:'linked',target:'阿寶',quantity:2,ledgerLinks:[link({recordId:'r-a'})]}]
};
assert.strictEqual(mod.shoppingAllocationSplitPlan(
  linkedSplitItem,{linked:1},ctx({personal:{ready:true,records:[expense({id:'r-a'})]}})
).ok,false,'已記帳 allocation 不可拆分');
assert.strictEqual(mod.shoppingAllocationSplitPlan(
  linkedSplitItem,{linked:1},ctx({personal:{ready:false,records:[]}})
).ok,false,'狀態待確認 allocation 不可拆分');
const splitDone={
  id:'shopping-a',name:'白桃',unit:'盒',done:true,splitGroupId:'shopping-a',
  allocations:[
    {allocationId:'a',target:'阿寶',quantity:2,ledgerLinks:[link({recordId:'r-a'})]},
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[link({recordId:'r-b'})]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const splitPending={
  id:'shopping-b',name:'白桃',unit:'盒',done:false,splitGroupId:'shopping-a',
  allocations:[
    {allocationId:'b',target:'媽媽',quantity:1,ledgerLinks:[]},
    {allocationId:'c',target:'小明',quantity:1,ledgerLinks:[]}
  ]
};
const detailModel=plain(mod.shoppingItemDetailModel(
  splitDone,[splitDone,splitPending],
  ctx({personal:{ready:true,records:[expense({id:'r-a'}),expense({id:'r-b'})]}})
));
assert.strictEqual(detailModel.originalTotal,6);
assert.strictEqual(detailModel.currentTotal,4);
assert.deepStrictEqual(detailModel.allocations.map(value=>[
  value.target,value.originalQuantity,value.currentQuantity,value.linkState
]),[
  ['阿寶',2,2,'linked'],
  ['媽媽',2,1,'linked'],
  ['小明',2,1,'unlinked']
]);
assert.strictEqual(mod.shoppingDetailAllocationQuantityText(
  {done:true},
  {originalQuantity:3,currentQuantity:2},
  '包'
),'需求 3 包 · 已買 2 包','已買明細使用需求與已買文案');
assert.strictEqual(mod.shoppingDetailAllocationQuantityText(
  {done:false},
  {originalQuantity:3,currentQuantity:1},
  '包'
),'需求 3 包 · 待買 1 包','待買明細使用需求與待買文案');

/* ================= 重新開放記帳 ================= */
const released=mod.releaseShoppingLedgerLinks([link({recordId:'r-old',releasedAt:NOW}),link({recordId:'r-a'})],NOW);
assert.strictEqual(released.length,2,'解除不新增也不刪除 link');
assert.strictEqual(released[1].releasedAt,NOW,'只更新最後一個 active link');
assert.strictEqual(released[1].recordId,'r-a','不清除 recordId');
assert.strictEqual(released[1].linkedAt,NOW,'不修改 linkedAt');
assert.strictEqual(released[0].releasedAt,NOW,'原本已 released 的舊 link 保持不變');
assert.strictEqual(mod.releaseShoppingLedgerLinks([],NOW),null,'無 link 時不可解除');
assert.strictEqual(mod.releaseShoppingLedgerLinks([link({releasedAt:NOW})],NOW),null,'已 released 不重複寫入');
const appended=mod.appendShoppingLedgerLink(released,{track:'personal',testMode:false,recordId:'r-new',batchId:'',linkedAt:NOW});
assert.strictEqual(appended.length,3,'再次記帳 append 新 link');
assert.strictEqual(appended[1].releasedAt,NOW,'append 後舊 released link 完整保留');
assert.strictEqual(appended[2].recordId,'r-new','最後一個 link 才是目前關聯');

/* ================= allocation source → record mapping ================= */
const recA={id:'rec-a',batchId:'batch-9'},recB={id:'rec-b',batchId:'batch-9'},recC={id:'rec-c',batchId:'batch-9'};
const sources=[
  {shoppingItemId:'s-a',allocationId:'a-1'},
  {shoppingItemId:'s-a',allocationId:'a-2'},
  {shoppingItemId:'s-b',allocationId:'b-1'}
];
const planOk=mod.planShoppingLedgerLinks(sources,[recA,recB,recC],{track:'shared',testMode:false,batchId:'batch-9'},NOW);
assert.strictEqual(planOk.ok,true,'數量一致時交握成立');
assert.deepStrictEqual(plain(planOk.links.map(entry=>[entry.shoppingItemId,entry.allocationId,entry.link.recordId])),[
  ['s-a','a-1','rec-a'],['s-a','a-2','rec-b'],['s-b','b-1','rec-c']
],'每個 allocation 只保存自己那一筆 recordId');
assert.deepStrictEqual(planOk.links.map(entry=>entry.link.batchId),['batch-9','batch-9','batch-9'],'多品項共用同一 batchId');
planOk.links.forEach(entry=>assert(!Array.isArray(entry.link.recordId),'link 不保存整批 recordIds'));
const planMismatch=mod.planShoppingLedgerLinks(sources,[recA,recB],{track:'shared',testMode:false},NOW);
assert.strictEqual(planMismatch.ok,false,'數量不一致視為交握錯誤');
assert.strictEqual(planMismatch.links.length,0,'交握錯誤不得部分回寫');
assert(/對應/.test(planMismatch.error),'交握錯誤有可顯示的原因');
assert.strictEqual(mod.planShoppingLedgerLinks([
  {shoppingItemId:'s-a',allocationId:'a-1'},
  {shoppingItemId:'s-a',allocationId:'a-1'}
],[recA,recB],{track:'shared',testMode:false},NOW).ok,false,'重複的 composite source 視為交握錯誤');
assert.strictEqual(mod.planShoppingLedgerLinks([{shoppingItemId:'s-a',allocationId:''}],[recA],{track:'shared',testMode:false},NOW).ok,false,'缺 allocationId 拒絕');
assert.strictEqual(mod.planShoppingLedgerLinks([],[recA],{track:'shared',testMode:false},NOW).ok,false,'沒有 source 就不建立 link');
const proxyPrefill=plain(mod.shoppingLedgerPrefillForAllocation(
  {id:'s',name:'白桃',category:'伴手禮',unit:'盒'},
  {allocationId:'a',target:'阿寶',quantity:2,ledgerLinks:[]}
));
assert.strictEqual(proxyPrefill.category,'購物');
assert.strictEqual(proxyPrefill.isProxy,true);
assert.strictEqual(proxyPrefill.proxyTarget,'阿寶');
assert.match(proxyPrefill.note,/數量：2 盒/);

/* ================= store:原子 link 回寫 ================= */
function freshStore(){
  const storage=createStorage();
  let seq=0;
  const store=mod.createShoppingListStore({storage,key:'trip_shopping_list',now(){return Date.parse(NOW);},idFactory(){seq++;return 'gen-'+seq;}});
  return {store,storage};
}
const linkCase=freshStore();
const itemA=linkCase.store.add({name:'A'}),itemB=linkCase.store.add({name:'B'});
linkCase.store.applyLedgerLinks([
  {shoppingItemId:itemA.id,link:{track:'personal',testMode:false,recordId:'rec-a',batchId:'',linkedAt:NOW}},
  {shoppingItemId:itemB.id,link:{track:'personal',testMode:false,recordId:'rec-b',batchId:'',linkedAt:NOW}}
]);
assert.deepStrictEqual(linkCase.store.all().map(entry=>entry.allocations[0].ledgerLinks.length),[1,1],'兩筆一次寫入成功');
let writes=0;
const countingStorage=Object.create(linkCase.storage);
assert.throws(()=>linkCase.store.applyLedgerLinks([{shoppingItemId:'missing',link:{track:'personal',testMode:false,recordId:'r',batchId:'',linkedAt:NOW}}]),/找不到/,'目標不存在時整批拒絕');
assert.deepStrictEqual(linkCase.store.all().map(entry=>entry.allocations[0].ledgerLinks.length),[1,1],'整批拒絕後資料完全未變');
const allocationLinkCase=freshStore();
const allocationLinkItem=allocationLinkCase.store.add({name:'多人',targets:['阿寶','媽媽'],quantity:1});
allocationLinkCase.store.applyLedgerLinks([{
  shoppingItemId:allocationLinkItem.id,
  allocationId:allocationLinkItem.allocations[1].allocationId,
  link:{track:'personal',testMode:false,recordId:'rec-mom',batchId:'',linkedAt:NOW}
}]);
assert.deepStrictEqual(plain(allocationLinkCase.store.all()[0].allocations.map(value=>value.ledgerLinks.length)),[0,1],'只回寫指定 allocation');
assert.throws(()=>allocationLinkCase.store.applyLedgerLinks([{
  shoppingItemId:allocationLinkItem.id,allocationId:'missing',
  link:{track:'personal',testMode:false,recordId:'rec-x',batchId:'',linkedAt:NOW}
}]),/採買分配/);
assert.throws(()=>allocationLinkCase.store.applyLedgerLinks([
  {shoppingItemId:allocationLinkItem.id,allocationId:allocationLinkItem.allocations[0].allocationId,link:{track:'personal',testMode:false,recordId:'rec-1',batchId:'',linkedAt:NOW}},
  {shoppingItemId:allocationLinkItem.id,allocationId:allocationLinkItem.allocations[0].allocationId,link:{track:'personal',testMode:false,recordId:'rec-2',batchId:'',linkedAt:NOW}}
]),/重複/,'同批不得重複回寫同一 composite source');
const releasedAllocationItem=allocationLinkCase.store.releaseLedgerLink(
  allocationLinkItem.id,allocationLinkItem.allocations[1].allocationId,NOW
);
assert.strictEqual(releasedAllocationItem.allocations[1].ledgerLinks[0].releasedAt,NOW,'只解除指定 allocation 的 active link');
assert.deepStrictEqual(plain(releasedAllocationItem.allocations[0].ledgerLinks),[],'其他 allocation 不受解除操作影響');
const guardedStoreCase=freshStore();
const guardedStoreItem=guardedStoreCase.store.add({name:'鎖定測試',targets:['阿寶','媽媽'],quantity:1});
guardedStoreCase.store.applyLedgerLinks([{
  shoppingItemId:guardedStoreItem.id,allocationId:guardedStoreItem.allocations[0].allocationId,
  link:{track:'personal',testMode:false,recordId:'guarded-record',batchId:'',linkedAt:NOW}
}]);
const guardedSnapshot=guardedStoreCase.storage.snapshot();
assert.throws(()=>guardedStoreCase.store.update(guardedStoreItem.id,{
  allocations:[guardedStoreItem.allocations[1]]
}),/已記帳|待確認|鎖定/,'不可移除仍有 active link 的 allocation');
assert.strictEqual(guardedStoreCase.storage.snapshot(),guardedSnapshot,'被拒絕的 linked target 移除不得改寫 store');

/* ================= 部分購買拆分 ================= */
const splitCase=freshStore();
splitCase.store.add({name:'A'});
const source=splitCase.store.add({name:'益生菌',category:'代購',quantity:5,unit:'罐',buyFor:'媽媽',stopRef:'d1_a'});
splitCase.store.add({name:'B'});
splitCase.store.add({name:'C'});
const splitResult=splitCase.store.split(source.id,{purchasedQuantity:3,remainderStopRef:'d1_a',now:Date.parse(NOW)});
const after=splitCase.store.all();
assert.deepStrictEqual(after.map(entry=>entry.name),['A','益生菌','益生菌','B','C'],'剩餘項目緊鄰原位置,不 append 到最後');
assert.strictEqual(after[1].id,source.id,'原 item ID 成為已買部分');
assert.strictEqual(after[1].allocations[0].quantity,3,'已買部分為本次買到的數量');
assert.strictEqual(after[1].unit,'罐');
assert.strictEqual(after[1].done,true);
assert.strictEqual(after[1].completedAt,NOW,'已買部分寫入 completedAt');
assert.strictEqual(after[2].id!==source.id&&!!after[2].id,true,'剩餘部分是新 ID');
assert.strictEqual(after[2].allocations[0].quantity,2,'剩餘數量由系統計算');
assert.strictEqual(after[2].unit,'罐','unit 由原項目繼承');
assert.strictEqual(after[2].done,false);
assert.strictEqual(after[2].completedAt,'','剩餘部分 completedAt 為空');
assert.deepStrictEqual(plain(after[2].allocations[0].ledgerLinks),[],'剩餘部分 allocation ledgerLinks 為空');
assert.strictEqual(after[1].splitGroupId,source.id,'首次拆分以來源 ID 作為 splitGroupId');
assert.strictEqual(after[2].splitGroupId,source.id,'兩筆共用 splitGroupId');
assert.strictEqual(after[1].createdAt,source.createdAt);
assert.strictEqual(after[2].createdAt,source.createdAt,'createdAt 都沿用原值');
assert.strictEqual(after[2].allocations[0].target,'媽媽');
assert.strictEqual(after[2].category,'','舊代購分類在新模型中移除');
assert.strictEqual(splitResult.purchased.id,source.id);
assert.strictEqual(splitResult.remainder.id,after[2].id);
assert(!('splitFromId' in after[2])&&!('splitAt' in after[2])&&!('originalQty' in after[2])&&!('qty' in after[2]),'不新增 splitFromId／splitAt／originalQty,也不保留 qty 鏡像');

/* 再次拆分沿用既有 splitGroupId,且可改綁站點或清為隨時可買 */
const again=splitCase.store.split(after[2].id,{purchasedQuantity:1,remainderStopRef:'',now:Date.parse(NOW)});
const after2=splitCase.store.all();
assert.deepStrictEqual(after2.map(entry=>entry.name),['A','益生菌','益生菌','益生菌','B','C'],'再次拆分仍緊鄰原位置');
assert.strictEqual(again.purchased.allocations[0].quantity,1);
assert.strictEqual(again.remainder.allocations[0].quantity,1,'2 罐再拆 1 罐剩 1 罐');
assert.strictEqual(again.remainder.splitGroupId,source.id,'再次拆分沿用既有 splitGroupId');
assert.strictEqual(again.remainder.stopRef,'','剩餘部分可清為隨時可買');
assert.strictEqual(again.purchased.stopRef,'d1_a','已買部分保留原站點');

/* 多對象依 allocation 拆分，已買與剩餘仍相鄰且只寫入一次 */
const multiSplitCase=freshStore();
const multiSplitSource=multiSplitCase.store.add({
  name:'白桃果凍',category:'伴手禮',unit:'盒',
  targets:['阿寶','媽媽','小明'],quantity:2,stopRef:'d2_shop'
});
const multiIds=multiSplitSource.allocations.map(value=>value.allocationId);
const multiSplit=multiSplitCase.store.split(multiSplitSource.id,{
  purchasedByAllocationId:{
    [multiIds[0]]:2,[multiIds[1]]:1,[multiIds[2]]:1
  },
  remainderStopRef:'d2_shop',now:Date.parse(NOW)
});
assert.deepStrictEqual(plain(multiSplit.purchased.allocations.map(value=>[value.target,value.quantity])),[
  ['阿寶',2],['媽媽',1],['小明',1]
]);
assert.deepStrictEqual(plain(multiSplit.remainder.allocations.map(value=>[value.target,value.quantity])),[
  ['媽媽',1],['小明',1]
]);
assert.strictEqual(multiSplit.purchased.done,true);
assert.strictEqual(multiSplit.remainder.done,false);
const atomicSplitCase=freshStore();
const atomicSource=atomicSplitCase.store.add({name:'原子測試',targets:['阿寶','媽媽'],quantity:2});
const atomicBefore=atomicSplitCase.storage.snapshot();
atomicSplitCase.storage.failOnceOn('trip_shopping_list');
assert.throws(()=>atomicSplitCase.store.split(atomicSource.id,{
  purchasedByAllocationId:{
    [atomicSource.allocations[0].allocationId]:1,
    [atomicSource.allocations[1].allocationId]:0
  },
  now:Date.parse(NOW)
}),/storage denied/);
assert.strictEqual(atomicSplitCase.storage.snapshot(),atomicBefore,'儲存失敗時原始序列化資料完全不變');

/* 驗證與原子性 */
const before=plain(splitCase.store.all());
assert.throws(()=>splitCase.store.split(source.id,{purchasedQuantity:0,now:Date.parse(NOW)}),/已買/,'已完成來源不可再次拆分');
assert.throws(()=>splitCase.store.split(source.id,{purchasedQuantity:-2,now:Date.parse(NOW)}),/已買/,'已完成來源先由狀態守門');
assert.throws(()=>splitCase.store.split(source.id,{purchasedQuantity:1.5,now:Date.parse(NOW)}),/已買/,'已完成來源先由狀態守門');
assert.throws(()=>splitCase.store.split(source.id,{purchasedQuantity:99,now:Date.parse(NOW)}),/已買/,'已完成來源先由狀態守門');
assert.throws(()=>splitCase.store.split(source.id,{purchasedQuantity:3,now:Date.parse(NOW)}),/已買/,'已完成來源不可重複走全部買到');
assert.throws(()=>splitCase.store.split('nope',{purchasedQuantity:1,now:Date.parse(NOW)}),/找不到/,'來源不存在時拒絕');
const legacySplit=freshStore();
const legacyItem=legacySplit.store.add({name:'舊式數量',qty:'約 3～5 個'});
assert.strictEqual(legacyItem.allocations[0].quantity,null,'不可解析的舊數量保持 legacy');
assert.throws(()=>legacySplit.store.split(legacyItem.id,{purchasedQuantity:1,now:Date.parse(NOW)}),/舊式文字數量/,'舊式數量阻擋部分購買');
assert.deepStrictEqual(plain(splitCase.store.all()),before,'拆分失敗完全不改資料');
const spaced=mod.normalizeShoppingItem({id:'q',name:'x',createdAt:NOW,qty:'　3 　罐 '});
assert.strictEqual(spaced.allocations[0].quantity,3,'舊數量的全形與連續空白正規化後仍可安全轉換');
assert.strictEqual(spaced.unit,'罐');

/* 有 active link 或 unverified 時不得拆分 */
const guard=mod.canSplitShoppingItem({id:'s',name:'x',done:false,ledgerLinks:[link({recordId:'r-a'})]},ctx({personal:{ready:true,records:[expense()]}}));
assert.strictEqual(guard.ok,false,'已記帳項目不得部分購買');
assert.strictEqual(mod.canSplitShoppingItem({id:'s',name:'x',done:false,ledgerLinks:[link({recordId:'r-a'})]},ctx({personal:{ready:false,records:[]}})).ok,false,'unverified 不得部分購買');
assert.strictEqual(mod.canSplitShoppingItem({id:'s',name:'x',done:true,ledgerLinks:[]},ctx()).ok,false,'已完成需先退回待買才可拆分');
assert.strictEqual(mod.canSplitShoppingItem({id:'s',name:'x',done:false,ledgerLinks:[]},ctx()).ok,true,'未完成且未記帳可拆分');

/* ================= 已買多選 preflight ================= */
const pre=(items,context)=>mod.shoppingBatchLedgerPreflight(items,context||ctx());
assert.strictEqual(pre([item([]),item([])]).ok,true,'全部 unlinked 可建立消費');
const withLinked=pre([item([]),item([link({recordId:'r-a'})]),item([link({recordId:'r-a'})])],ctx({personal:{ready:true,records:[expense()]}}));
assert.strictEqual(withLinked.ok,false,'含已記帳整批阻擋');
assert.strictEqual(withLinked.error,'選取項目中有 2 項已記帳，請取消選取後再建立消費');
const withUnverified=pre([item([]),item([link({recordId:'r-a',track:'shared'})])],ctx({shared:{ready:true,records:[]}}));
assert.strictEqual(withUnverified.ok,false,'含待確認整批阻擋');
assert.strictEqual(withUnverified.error,'其中 1 項的記帳狀態尚待確認，請先完成同步或重新確認');
assert.strictEqual(pre([]).ok,false,'空選取不得建立消費');

/* ================= 備份 v7 ================= */
assert.strictEqual(mod.PERSONAL_STATE_VERSION,7,'個人狀態備份升為 v7');
assert.strictEqual(mod.PERSONAL_STATE_SUPPORTED_VERSIONS.join(','),'1,2,3,4,5,6,7','v1～v7 皆可還原');
assert.strictEqual(mod.isSupportedPersonalStateVersion(4),true);
assert.strictEqual(mod.isSupportedPersonalStateVersion(5),true);
assert.strictEqual(mod.isSupportedPersonalStateVersion(6),true);
assert.strictEqual(mod.isSupportedPersonalStateVersion(7),true);
assert.strictEqual(mod.isSupportedPersonalStateVersion(8),false,'未知未來版本明確拒絕');
assert.strictEqual(mod.isSupportedPersonalStateVersion('7'),false,'版本必須是數字');

const v4Item=mod.normalizeShoppingItem({id:'v4',name:'舊備份項目',createdAt:NOW,done:true});
assert.strictEqual(v4Item.completedAt,'','v4 舊備份缺 completedAt 時補空字串');
assert.strictEqual(v4Item.allocations[0].quantity,null,'v4 舊備份缺數量時為 legacy null');
assert.deepStrictEqual(plain(v4Item.allocations[0].ledgerLinks),[],'v4 舊備份缺 ledgerLinks 時補到 allocation');
const v5Item=mod.normalizeShoppingItem(plain(withLink));
assert.strictEqual(v5Item.releasedAt,undefined,'releasedAt 只存在於 link 內,不外洩到 item');
assert.strictEqual(v5Item.allocations[0].ledgerLinks[1].releasedAt,NOW,'v5 round-trip 不丟失 releasedAt');
assert.strictEqual(v5Item.splitGroupId,'s-1','v5 round-trip 不丟失 splitGroupId');
assert.strictEqual(v5Item.completedAt,NOW,'round-trip 不丟失 completedAt');
const v6Item=mod.normalizeShoppingItem(plain(mod.normalizeShoppingItem({id:'v6',name:'結構化',createdAt:NOW,quantity:4,unit:'瓶'})));
assert.strictEqual(v6Item.allocations[0].quantity,4,'v6 round-trip 不丟失 quantity');
assert.strictEqual(v6Item.unit,'瓶','v6 round-trip 不丟失 unit');
const v6Legacy=mod.normalizeShoppingItem(plain(mod.normalizeShoppingItem({id:'v6l',name:'舊式',createdAt:NOW,qty:'約 3～5 個'})));
assert.strictEqual(v6Legacy.legacyQtyText,'約 3～5 個','v6 round-trip 不丟失 legacyQtyText');

/* ================= 原始碼契約 ================= */
assert(!/status\s*:\s*['"](linked|unlinked|unverified)['"]/.test(html),'不得持久化 UI 狀態字串');
assert(html.includes('sourceShoppingItemId')&&html.includes('sourceShoppingAllocationId'),'draft 以 composite ephemeral state 追蹤 Shopping allocation 來源');
const recordShape=html.slice(html.indexOf('function buildLedgerExpenseRecords('),html.indexOf('function ledgerClientCreatedAt('));
assert(!recordShape.includes('sourceShoppingItemId'),'來源 IDs 不得進入 Ledger record');
assert(!recordShape.includes('ledgerLink'),'Ledger record 不得帶 Shopping link');
assert(html.includes("version:PERSONAL_STATE_VERSION"),'備份匯出使用單一版本常數');

/* ================= UI 接線契約 ================= */
const shoppingSource=html.slice(html.indexOf('/* ================= 採買清單'),html.indexOf('/* ================= 購物模式'));
assert(shoppingSource.length>3000,'採買清單區段切片有效');
/* B:單筆完成 */
assert(!shoppingSource.includes('shoppingCompleteChoice'),'單筆勾選不再開三選一 Modal');
assert(/toast\('已標記「'\+item\.name\+'」為已買','復原'/.test(shoppingSource),'完成後以 toast 提供復原');
/* 已買頁多選、移回待買、刪除 */
assert(shoppingSource.includes('function moveSelectedShoppingBackToPending('),'已買頁可批次移回待買');
assert(shoppingSource.includes('function deleteSelectedShoppingItems('),'已買頁可批次刪除');
assert(shoppingSource.includes('shoppingListStore.moveBackToPending(selectedIds)'),
  '批次移回使用統一原子 Store 操作，不在 UI 逐筆 patch');
assert((shoppingSource.match(/shoppingListStore\.moveBackToPending\(\[id\]\)/g)||[]).length===2,
  'checkbox 取消與完成 Toast 復原也使用同一 Store 操作');
assert(/刪除採買項目不會刪除原本的消費紀錄/.test(html),'刪除已記帳項目時說明 Ledger 紀錄仍保留');
assert(/刪除採買項目不會嘗試修改或刪除帳本紀錄/.test(html),'待確認項目有獨立提醒');
assert(html.includes("已有 '+linked+' 位建立消費紀錄"));
assert(html.includes("有 '+unverified+' 位記帳狀態待確認"));
assert(/if\(value\.state==='linked'\)linked\+\+;[\s\S]{0,80}else if\(value\.state==='unverified'\)unverified\+\+/.test(html),'linked 與 unverified 依 allocation 分別計數');
assert(shoppingSource.includes('removeMany('),'批次刪除走原子整批路徑');
assert(!shoppingSource.includes('清空所有已買'),'本批不新增清空已買的危險入口');
/* preflight 走共用 allocation source helper */
assert(shoppingSource.includes('shoppingLedgerSources(selected,shoppingLedgerContext())'),'多選建立消費前展開未記帳 allocations');
assert(shoppingSource.includes('shoppingLedgerSources([item],shoppingLedgerContext())'),'單筆記帳入口同樣展開 allocations');
const singleEntry=html.slice(html.indexOf('function openShoppingLedgerEntry(id)'),html.indexOf('function completeSelectedShopping('));
assert(singleEntry.includes('openShoppingLedgerSourcesEntry(sources)'),'單筆入口依 allocation 數決定單筆或多品項表單');
assert(shoppingSource.includes('sourceShoppingAllocationId=source.allocationId'),'單筆 draft 保存 allocationId');
assert(html.includes('function openShoppingItemDetail('));
assert(html.includes('function renderShoppingItemDetail('));
assert(html.includes('代購對象與記帳紀錄'));
assert(!html.includes('代購對象與帳本紀錄'));
assert(html.includes('記帳未完成對象'));
assert(html.includes('openShoppingLinkedLedgerRecord('));
assert(html.includes('shoppingDetailReturnItemId'));
assert(html.includes('handleShoppingItemBodyClick('));
assert.match(html,/event\.stopPropagation\(\)/);
/* 結構化數量:表單與拆分都不得再出現自由文字數量輸入 */
assert(shoppingSource.includes('id="shoppingQuantity"')&&shoppingSource.includes('type="number"'),'數量改為數字輸入');
assert(shoppingSource.includes('inputmode="numeric"')&&shoppingSource.includes('min="1"')&&shoppingSource.includes('step="1"'),'數量輸入使用數字鍵盤與整數步進');
assert(!shoppingSource.includes('id="shoppingQty"'),'舊的自由文字數量欄位已退場');
assert(shoppingSource.includes('shoppingUnitStore.all()'),'單位選項改由設定頁可管理的 store 提供');
assert(!shoppingSource.includes('placeholder="其他單位"'),'表單不再自由輸入單位,新增單位改到設定頁');
assert(/此為舊式文字數量。儲存前請改為數字與單位。/.test(shoppingSource),'舊式數量在編輯表單有明確提示');
assert(shoppingSource.includes('shoppingItemQuantitySummary('),'顯示一律走 allocation 共用 helper');
assert(!/'數量 '\+item\.qty|item\.qty/.test(shoppingSource),'顯示層不再自行拼接舊 qty');
/* 狀態徽章一律走 resolver */
assert(shoppingSource.includes('shoppingItemLinkState(item)'),'已記帳標記走共用 resolver');
assert(!/ledgerLinks\.length\s*>\s*0/.test(shoppingSource),'不得只用 ledgerLinks.length 判定已記帳');
/* 解除連結 */
/* 操作名稱維持簡短,「帳本不受影響」放在確認視窗;原生 confirm() 的按鈕文案不可自訂,故用自訂視窗。 */
assert(shoppingSource.includes('>改回未記帳</button>'),'選單與確認視窗都用「改回未記帳」');
assert(shoppingSource.includes('<h3 id="shoppingReleaseTitle">改回未記帳？</h3>'),'確認視窗標題為核准文案');
assert(shoppingSource.includes('只會移除採買這一側的「已記帳」標記，不會刪除或修改帳本中的消費紀錄。'),'確認視窗說明帳本不受影響');
assert(shoppingSource.includes('若帳本中的原紀錄仍在，再次記帳可能產生重複消費。'),'確認視窗把重複入帳的風險一併說完整');
assert(/shoppingReleaseDialog[\s\S]{0,700}>取消<\/button>[\s\S]{0,200}>改回未記帳<\/button>/.test(shoppingSource),'確認視窗提供取消,且取消排在確認之前');
assert(!/confirm\('這只會解除/.test(shoppingSource),'不再使用按鈕文案不可自訂的原生 confirm');
assert(shoppingSource.includes("overlay.className='shopping-choice-overlay'"),'沿用既有 z-index 160 的對話框樣式,未新增 CSS');
assert(shoppingSource.includes('activeShoppingLedgerLink(selected)'),'沒有 active allocation link 時不提供解除');
/* 部分購買 */
assert(shoppingSource.includes('function startShoppingSplit('),'保留部分購買流程');
assert(shoppingSource.includes('>部分購買</button>'),'卡片直接提供部分購買入口');
assert(!shoppingSource.includes('>部分買到</button>'),'舊的部分買到文案已移除');
const itemActionsSource=shoppingSource.slice(
  shoppingSource.indexOf('function openShoppingItemActions('),
  shoppingSource.indexOf('var shoppingDetailReturnItemId',shoppingSource.indexOf('function openShoppingItemActions('))
);
assert(!itemActionsSource.includes('startShoppingSplit('),'部分購買不再收在 ⋯ 選單');
assert(shoppingSource.includes('canOfferShoppingPartialPurchase(item,linkSummary)'),
  '卡片入口使用總需求與記帳狀態 helper');
assert(shoppingSource.includes('canSplitShoppingItem(item,shoppingLedgerContext())'),'拆分前檢查記帳狀態');
assert(shoppingSource.includes('本次買到（必填）')&&shoppingSource.includes('剩餘待買（自動計算）'),'只輸入本次買到,剩餘由系統計算');
assert(shoppingSource.includes('shoppingSplitPreview(form)'),'剩餘數量即時預覽');
assert(!/系統不會自動計算剩餘數量/.test(shoppingSource),'舊的「不自動計算」說明已退場');
assert(!/parseInt|parseFloat|Number\(form\.(purchasedQty|remainderQty)/.test(shoppingSource),'不解析自由文字數量');
assert(shoppingSource.includes('shoppingListStore.split('),'拆分走 store 的原子操作');
/* 交握與回寫 */
const handoff=html.slice(html.indexOf('function shoppingLinkSourceRefs('),html.indexOf('function commitLedgerEntrySave('));
assert(handoff.includes('submissionDraft.items'),'多品項以送出用 items 對應,不用 UI index');
assert(handoff.includes('shoppingListStore.applyLedgerLinks(plan.links)'),'回寫走單次原子 store write');
assert(/消費已建立，但採買項目的記帳標記更新失敗。請避免再次記帳，並重新開啟採買清單確認。/.test(handoff),'回寫失敗顯示核准降級文案');
assert(!/persistLedger|ledgerRepository\.(add|enqueueBatch)/.test(handoff),'回寫失敗不得自動再建立一次消費');
const commit=html.slice(html.indexOf('function commitLedgerEntrySave('),html.indexOf('function setLedgerSavePending('));
assert(/if\(!editing\)writeShoppingLedgerLinks\(/.test(commit),'只有在 Ledger 儲存成功後才回寫,且編輯不回寫');
assert(commit.indexOf('writeShoppingLedgerLinks')>commit.indexOf('operation.then'),'回寫發生在持久化 Promise 完成之後');
/* 不變條件 */
assert(html.includes('sortShoppingStopGroups(')&&html.includes('buildShoppingStopOrder('),'A 的行程排序契約保留');
assert(html.includes('resolveShoppingStopState(')&&html.includes('tripDatasetAuthority('),'F 的孤兒三態契約保留');
const sw=fs.readFileSync('sw.js','utf8');
assert.match(sw,/okayama-trip-v69/,'service worker cache is v69');

console.log('shopping ledger link tests passed');
