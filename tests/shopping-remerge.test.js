const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const TripBuyToLedger=require('../buy-to-ledger.js');

function createStorage(){
  const values={};
  let failKey='';
  let reads=0,writes=0;
  return {
    getItem(key){reads++;return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){writes++;if(key===failKey){failKey='';throw new Error('storage denied');}values[key]=String(value);},
    removeItem(key){delete values[key];},
    seed(key,value){values[key]=JSON.stringify(value);},
    snapshot(){return JSON.stringify(values);},
    failOnceOn(key){failKey=key;},
    counts(){return {reads,writes};}
  };
}

function plain(value){return JSON.parse(JSON.stringify(value));}

function loadModule(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ================= ledgerRepository');
  const end=html.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'shopping helpers live in the local module section');
  const sandbox={
    console:{log(){},warn(){},error(){}},
    localStorage:createStorage(),
    Date,Math,Promise,JSON,String,Number,Boolean,isFinite,
    TripBuyToLedger,buyToLedgerRuntimeAdapter:{},
    setTimeout,clearTimeout,
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
const CREATED='2026-07-27T02:00:00.000Z';
const DONE='2026-07-28T02:00:00.000Z';
const allocation=(allocationId,target,quantity,ledgerLinks=[])=>({allocationId,target,quantity,ledgerLinks});
const item=over=>Object.assign({
  id:'group-1',
  name:'白桃',
  category:'伴手禮',
  unit:'盒',
  legacyQtyText:'',
  allocations:[allocation('original-own','',2)],
  stopRef:'day-1-shop',
  done:true,
  createdAt:CREATED,
  completedAt:DONE,
  splitGroupId:'group-1',
  photoId:'shopping-photo-shared'
},over||{});

assert.strictEqual(typeof mod.shoppingSplitRemergeEligibility,'function',
  '安全回併資格是可獨立測試的純邏輯');
assert.strictEqual(typeof mod.buildShoppingRemergedItem,'function',
  '回併建構不依賴 UI 或 Store');
assert.strictEqual(typeof mod.planShoppingMoveBackToPending,'function',
  '移回待買先建立完整轉換計畫');

/* 正常的「買 2、剩 3，再取消已買」回到原本的 5。 */
const normalItems=[
  {id:'before',name:'不相干前項'},
  item(),
  item({
    id:'remaining-1',
    allocations:[allocation('remaining-own','',3)],
    done:false,
    completedAt:''
  }),
  {id:'after',name:'不相干後項'}
];
const normalEligibility=plain(mod.shoppingSplitRemergeEligibility(
  normalItems.map(value=>value.id==='group-1'?Object.assign({},value,{done:false,completedAt:''}):value),
  'group-1'
));
assert.deepStrictEqual(normalEligibility,{ok:true,reason:''},'完整且無稽核歷史的 group 可安全回併');
const normalPlan=plain(mod.planShoppingMoveBackToPending(normalItems,['group-1']));
assert.strictEqual(normalPlan.movedCount,1);
assert.strictEqual(normalPlan.mergedGroupCount,1);
assert.deepStrictEqual(normalPlan.unmergedReasons,{});
assert.deepStrictEqual(normalPlan.items.map(value=>value.id),['before','group-1','after'],
  '只移除 sibling，不改變受影響 group 以外的 store order');
assert.deepStrictEqual(normalPlan.items[1],{
  id:'group-1',
  name:'白桃',
  category:'伴手禮',
  unit:'盒',
  legacyQtyText:'',
  allocations:[allocation('original-own','',5)],
  stopRef:'day-1-shop',
  done:false,
  createdAt:CREATED,
  completedAt:'',
  splitGroupId:'',
  photoId:'shopping-photo-shared'
},'保留原 ID／createdAt／allocationId，數量加回 5 並清除拆分狀態');

/* 多對象依 canonical 名稱加總；新對象沿用 store order 最前 sibling 的 allocationId。 */
const multiItems=[
  item({
    allocations:[allocation('original-mom','媽媽',1)]
  }),
  item({
    id:'remaining-multi',
    allocations:[
      allocation('sibling-mom',' 媽媽 ',2),
      allocation('sibling-bao','阿寶',3)
    ],
    done:false,
    completedAt:''
  })
];
const multiPlan=plain(mod.planShoppingMoveBackToPending(multiItems,['group-1']));
assert.strictEqual(multiPlan.mergedGroupCount,1);
assert.deepStrictEqual(multiPlan.items[0].allocations,[
  allocation('original-mom','媽媽',3),
  allocation('sibling-bao','阿寶',3)
],'同一對象優先保留原 allocationId；原項目沒有的對象保留最前 sibling ID');
const originalAfterSibling=plain(mod.planShoppingMoveBackToPending([
  item({
    id:'remaining-before-original',
    allocations:[allocation('earlier-sibling-mom','媽媽',2)],
    done:false,
    completedAt:''
  }),
  item({allocations:[allocation('later-original-mom','媽媽',1)]})
],['group-1']));
assert.strictEqual(originalAfterSibling.items[0].allocations[0].allocationId,'later-original-mom',
  '即使原 item 排在 sibling 後方，同一對象仍優先保留原 item 的 allocationId');

/* 仍有已買 sibling 是正常的部分購買事實：移回成功但不合併、不警告。 */
const stillPurchased=plain(mod.planShoppingMoveBackToPending([
  item(),
  item({id:'purchased-too',allocations:[allocation('purchased-too-own','',1)]}),
  item({id:'remaining',allocations:[allocation('remaining-own','',1)],done:false,completedAt:''})
],['group-1']));
assert.strictEqual(stillPurchased.movedCount,1);
assert.strictEqual(stillPurchased.mergedGroupCount,0);
assert.deepStrictEqual(stillPurchased.unmergedReasons,{'still-purchased':1});
assert.strictEqual(stillPurchased.items.length,3);

/* 找不到原 item ID 時不得猜測主項目。 */
const noOriginal=[
  item({id:'fragment-a',splitGroupId:'missing-original',done:true}),
  item({id:'fragment-b',splitGroupId:'missing-original',done:false,completedAt:''})
];
assert.deepStrictEqual(
  plain(mod.shoppingSplitRemergeEligibility(
    noOriginal.map(value=>Object.assign({},value,{done:false,completedAt:''})),
    'missing-original'
  )),
  {ok:false,reason:'missing-original'}
);
assert.strictEqual(
  plain(mod.planShoppingMoveBackToPending(noOriginal,['fragment-a'])).items.length,
  2,
  '缺原 item 時兩張卡都保留'
);

/* 使用者建立的欄位差異一律不自動覆蓋。 */
[
  ['name','水蜜桃'],
  ['category','購物'],
  ['unit','包'],
  ['stopRef','day-2-shop'],
  ['legacyQtyText','舊式文字'],
  ['photoId','shopping-photo-different']
].forEach(function(entry){
  const changed=item({id:'remaining-'+entry[0],done:false,completedAt:'',[entry[0]]:entry[1]});
  const eligibility=plain(mod.shoppingSplitRemergeEligibility([item({done:false,completedAt:''}),changed],'group-1'));
  assert.deepStrictEqual(eligibility,{ok:false,reason:'field-mismatch'},entry[0]+' 不同不得合併');
});

/* active、unverified、released 或任意歷史 link 都只阻止合併，不阻止移回。 */
[
  {recordId:'active',releasedAt:''},
  {recordId:'released',releasedAt:DONE},
  {recordId:'unverified',releasedAt:'',track:'shared'}
].forEach(function(link,index){
  const linkedOriginal=item({
    allocations:[allocation('linked-'+index,'',2,[Object.assign({
      version:1,track:'personal',testMode:false,batchId:'',linkedAt:DONE
    },link)])]
  });
  const result=plain(mod.planShoppingMoveBackToPending([
    linkedOriginal,
    item({id:'remaining-link-'+index,allocations:[allocation('remaining-link-own-'+index,'',3)],done:false,completedAt:''})
  ],['group-1']));
  assert.strictEqual(result.movedCount,1);
  assert.strictEqual(result.mergedGroupCount,0);
  assert.strictEqual(result.unmergedReasons['ledger-history'],1);
  assert.strictEqual(result.items.length,2);
  assert.deepStrictEqual(result.items[0].allocations[0].ledgerLinks,linkedOriginal.allocations[0].ledgerLinks,
    '未合併時 ledgerLinks 原樣保留');
});

/* legacy、加總溢位、canonical 重複與自己／代購混用皆保守保留分開。 */
const unsafeCases=[
  {
    label:'legacy',
    reason:'legacy-quantity',
    values:[
      item({done:false,completedAt:'',legacyQtyText:'約 3～5 盒',allocations:[allocation('legacy','',null)]}),
      item({id:'remaining-legacy',done:false,completedAt:'',legacyQtyText:'約 3～5 盒',allocations:[allocation('legacy-rest','',null)]})
    ]
  },
  {
    label:'overflow',
    reason:'quantity-overflow',
    values:[
      item({done:false,completedAt:'',allocations:[allocation('huge','媽媽',Number.MAX_SAFE_INTEGER)]}),
      item({id:'remaining-overflow',done:false,completedAt:'',allocations:[allocation('one-more','媽媽',1)]})
    ]
  },
  {
    label:'duplicate canonical target',
    reason:'duplicate-target',
    values:[
      item({done:false,completedAt:'',allocations:[
        allocation('mom-a','媽媽',1),
        allocation('mom-b',' 媽媽 ',1)
      ]}),
      item({id:'remaining-duplicate',done:false,completedAt:'',allocations:[allocation('bao','阿寶',1)]})
    ]
  },
  {
    label:'self mixed with proxy target',
    reason:'mixed-target-mode',
    values:[
      item({done:false,completedAt:'',allocations:[allocation('own','',1)]}),
      item({id:'remaining-proxy',done:false,completedAt:'',allocations:[allocation('mom','媽媽',1)]})
    ]
  }
];
unsafeCases.forEach(function(example){
  assert.deepStrictEqual(
    plain(mod.shoppingSplitRemergeEligibility(example.values,'group-1')),
    {ok:false,reason:example.reason},
    example.label+' 不得合併'
  );
});

assert.throws(
  ()=>mod.planShoppingMoveBackToPending([item()],['missing-id']),
  /找不到採買項目/,
  '任一目標 ID 不存在時整份計畫失敗'
);

assert.strictEqual(typeof mod.shoppingMoveBackFeedback,'function','移回結果由單一純函式格式化 Toast');
assert.strictEqual(mod.shoppingMoveBackFeedback({
  movedCount:1,mergedGroupCount:1,unmergedReasons:{}
},false),'已移回待買並合併為 1 項');
assert.strictEqual(mod.shoppingMoveBackFeedback({
  movedCount:1,mergedGroupCount:0,unmergedReasons:{'field-mismatch':1}
},false),'已移回待買；因內容或記帳狀態不同，未自動合併');
assert.strictEqual(mod.shoppingMoveBackFeedback({
  movedCount:1,mergedGroupCount:0,unmergedReasons:{'still-purchased':1}
},false),'已移回待買','仍有已買 sibling 是正常狀態，不顯示錯誤');
assert.strictEqual(mod.shoppingMoveBackFeedback({
  movedCount:4,mergedGroupCount:2,unmergedReasons:{}
},true),'已將 4 項移回待買，並合併 2 組');
assert.strictEqual(mod.shoppingMoveBackFeedback({
  movedCount:4,mergedGroupCount:1,unmergedReasons:{'field-mismatch':1,'still-purchased':1}
},true),'已將 4 項移回待買，並合併 1 組；部分項目因內容或記帳狀態不同而保留分開');

/* Store 對外只提供一個原子 moveBackToPending；單筆與批次共用同一結果。 */
const storeKey='shopping-remerge-store';
const storeStorage=createStorage();
storeStorage.seed(storeKey,[
  item(),
  item({id:'remaining-1',allocations:[allocation('remaining-own','',3)],done:false,completedAt:''}),
  item({id:'untouched',splitGroupId:'',done:false,completedAt:'',allocations:[allocation('untouched-own','',1)]})
]);
const store=mod.createShoppingListStore({
  storage:storeStorage,
  key:storeKey,
  now(){return Date.parse(DONE);},
  idFactory(){return 'unused-id';}
});
assert.strictEqual(typeof store.moveBackToPending,'function','Store exposes the atomic move-back boundary');
const storeResult=plain(store.moveBackToPending(['group-1']));
assert.strictEqual(storeResult.movedCount,1);
assert.strictEqual(storeResult.mergedGroupCount,1);
assert.deepStrictEqual(storeResult.items.map(value=>value.id),['group-1','untouched']);
assert.deepStrictEqual(storeStorage.counts(),{reads:1,writes:1},
  '單次操作只讀目前 Store 一次並只原子寫入一次');

const batchKey='shopping-remerge-batch';
const batchStorage=createStorage();
batchStorage.seed(batchKey,[
  item(),
  item({id:'remaining-1',allocations:[allocation('remaining-own','',3)],done:false,completedAt:''}),
  item({id:'group-2',splitGroupId:'group-2',allocations:[allocation('g2-original','媽媽',1)]}),
  item({id:'remaining-2',splitGroupId:'group-2',allocations:[allocation('g2-rest','媽媽',2)],done:false,completedAt:''})
]);
const batchStore=mod.createShoppingListStore({storage:batchStorage,key:batchKey,now(){return Date.parse(DONE);}});
const batchResult=plain(batchStore.moveBackToPending(['group-1','group-2']));
assert.strictEqual(batchResult.movedCount,2);
assert.strictEqual(batchResult.mergedGroupCount,2);
assert.deepStrictEqual(batchResult.items.map(value=>value.id),['group-1','group-2']);
assert.deepStrictEqual(batchStorage.counts(),{reads:1,writes:1},
  '跨多個 split group 仍只 normalize／write 一次');

const missingKey='shopping-remerge-missing';
const missingStorage=createStorage();
missingStorage.seed(missingKey,[item()]);
const missingStore=mod.createShoppingListStore({storage:missingStorage,key:missingKey,now(){return Date.parse(DONE);}});
const beforeMissing=missingStorage.snapshot();
assert.throws(()=>missingStore.moveBackToPending(['group-1','not-found']),/找不到採買項目/);
assert.strictEqual(missingStorage.snapshot(),beforeMissing,'任一 ID 不存在時資料完全不變');
assert.deepStrictEqual(missingStorage.counts(),{reads:1,writes:0},'計畫失敗前不寫入');

const failureKey='shopping-remerge-write-failure';
const failureStorage=createStorage();
failureStorage.seed(failureKey,[
  item(),
  item({id:'remaining-1',allocations:[allocation('remaining-own','',3)],done:false,completedAt:''})
]);
const failureStore=mod.createShoppingListStore({storage:failureStorage,key:failureKey,now(){return Date.parse(DONE);}});
const beforeFailure=failureStorage.snapshot();
failureStorage.failOnceOn(failureKey);
assert.throws(()=>failureStore.moveBackToPending(['group-1']),/storage denied/);
assert.strictEqual(failureStorage.snapshot(),beforeFailure,'原子 write 失敗時不得留下部分移回或部分合併');

/* checkbox、批次移回與完成 Toast 復原都接同一個真實 Store 操作。 */
function extractFunction(name){
  const html=mod.__html;
  const start=html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=html.indexOf('{',start),depth=0;
  for(;index<html.length;index++){
    if(html[index]==='{')depth++;
    else if(html[index]==='}')depth--;
    if(depth===0)return html.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}

function wrapMoveBack(store){
  const original=store.moveBackToPending;
  let calls=0,ids=[];
  store.moveBackToPending=function(values){calls++;ids=values.slice();return original(values);};
  return {get calls(){return calls;},get ids(){return ids;}};
}

const checkboxKey='shopping-remerge-checkbox';
const checkboxStorage=createStorage();
checkboxStorage.seed(checkboxKey,[
  item(),
  item({id:'remaining-1',allocations:[allocation('remaining-own','',3)],done:false,completedAt:''})
]);
const checkboxStore=mod.createShoppingListStore({storage:checkboxStorage,key:checkboxKey,now(){return Date.parse(DONE);}});
const checkboxMove=wrapMoveBack(checkboxStore);
const checkboxToasts=[];
const checkboxSandbox={
  shoppingListStore:checkboxStore,
  shoppingMoveBackFeedback:mod.shoppingMoveBackFeedback,
  timestampDate(value){return new Date(Number(value));},
  Date:{now(){return Date.parse(DONE);}},
  toast(message,label,action){checkboxToasts.push({message,label,action});},
  renderToday(){},
  renderShoppingListOverlay(){}
};
vm.createContext(checkboxSandbox);
vm.runInContext(extractFunction('toggleShoppingItemDone'),checkboxSandbox);
checkboxSandbox.toggleShoppingItemDone('group-1',false);
assert.strictEqual(checkboxMove.calls,1,'已買 checkbox 取消完成只呼叫一次 moveBackToPending');
assert.deepStrictEqual(plain(checkboxMove.ids),['group-1']);
assert.deepStrictEqual(plain(checkboxStore.all()).map(value=>value.id),['group-1']);
assert.strictEqual(checkboxToasts[0].message,'已移回待買並合併為 1 項');

const undoKey='shopping-remerge-toast-undo';
const undoStorage=createStorage();
undoStorage.seed(undoKey,[item({
  id:'plain-item',
  splitGroupId:'',
  done:false,
  completedAt:'',
  allocations:[allocation('plain-own','',1)]
})]);
const undoStore=mod.createShoppingListStore({storage:undoStorage,key:undoKey,now(){return Date.parse(DONE);}});
const undoMove=wrapMoveBack(undoStore);
const undoToasts=[];
let undoAction=null;
const undoSandbox={
  shoppingListStore:undoStore,
  shoppingMoveBackFeedback:mod.shoppingMoveBackFeedback,
  timestampDate(value){return new Date(Number(value));},
  Date:{now(){return Date.parse(DONE);}},
  toast(message,label,action){undoToasts.push({message,label});if(typeof action==='function')undoAction=action;},
  renderToday(){},
  renderShoppingListOverlay(){}
};
vm.createContext(undoSandbox);
vm.runInContext(extractFunction('toggleShoppingItemDone'),undoSandbox);
undoSandbox.toggleShoppingItemDone('plain-item',true);
assert.strictEqual(typeof undoAction,'function','完成後 Toast 提供復原動作');
assert.strictEqual(undoMove.calls,0,'完成本身不誤走移回操作');
undoAction();
assert.strictEqual(undoMove.calls,1,'Toast 復原呼叫同一個 moveBackToPending');
assert.strictEqual(plain(undoStore.all())[0].done,false);
assert.strictEqual(undoToasts[1].message,'已移回待買');

const uiBatchKey='shopping-remerge-ui-batch';
const uiBatchStorage=createStorage();
uiBatchStorage.seed(uiBatchKey,[
  item(),
  item({id:'remaining-1',allocations:[allocation('remaining-own','',3)],done:false,completedAt:''}),
  item({id:'group-2',splitGroupId:'group-2',allocations:[allocation('g2-original','媽媽',1)]}),
  item({id:'remaining-2',splitGroupId:'group-2',allocations:[allocation('g2-rest','媽媽',2)],done:false,completedAt:''})
]);
const uiBatchStore=mod.createShoppingListStore({storage:uiBatchStorage,key:uiBatchKey,now(){return Date.parse(DONE);}});
const uiBatchMove=wrapMoveBack(uiBatchStore);
const uiBatchToasts=[];
const uiBatchSandbox={
  shoppingListStore:uiBatchStore,
  shoppingMoveBackFeedback:mod.shoppingMoveBackFeedback,
  shoppingUiState:{selectionMode:true,selected:{'group-1':true,'group-2':true}},
  toast(message){uiBatchToasts.push(message);},
  renderToday(){},
  renderShoppingListOverlay(){}
};
vm.createContext(uiBatchSandbox);
vm.runInContext(extractFunction('moveSelectedShoppingBackToPending'),uiBatchSandbox);
uiBatchSandbox.moveSelectedShoppingBackToPending();
assert.strictEqual(uiBatchMove.calls,1,'批次 UI 只呼叫一次 moveBackToPending');
assert.deepStrictEqual(plain(uiBatchMove.ids),['group-1','group-2']);
assert.deepStrictEqual(plain(uiBatchStore.all()).map(value=>value.id),['group-1','group-2']);
assert.strictEqual(uiBatchToasts.length,1,'跨 group 批次只顯示一個 Toast');
assert.strictEqual(uiBatchToasts[0],'已將 2 項移回待買，並合併 2 組');

console.log('shopping remerge tests passed');
