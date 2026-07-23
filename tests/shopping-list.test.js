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
const store=mod.createShoppingListStore({
  storage:mod.localStorage,
  key:'trip_shopping_list',
  now(){return Date.parse('2026-07-23T08:00:00.000Z');},
  idFactory(){return 'shopping-1';}
});

const added=plain(store.add({
  name:'  岡山白桃  ',
  category:'伴手禮',
  qty:'2 盒',
  buyFor:'媽媽',
  stopRef:'10/18_3'
}));
assert.deepStrictEqual(added,{
  id:'shopping-1',
  name:'岡山白桃',
  category:'伴手禮',
  qty:'2 盒',
  buyFor:'媽媽',
  stopRef:'10/18_3',
  done:false,
  createdAt:'2026-07-23T08:00:00.000Z'
},'add normalizes and persists the approved local-only fields');
assert.deepStrictEqual(plain(store.all()),[added],'shopping items round-trip through localStorage');

const updated=plain(store.update('shopping-1',{qty:'3 盒',done:true}));
assert.strictEqual(updated.qty,'3 盒');
assert.strictEqual(updated.done,true);
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

const single=plain(mod.shoppingLedgerSinglePrefill({
  name:'眼藥水',
  category:'代購',
  qty:'2',
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
assert(ui.includes('id="shoppingListOverlay"')||ui.includes("overlay.id='shoppingListOverlay'"),'full shopping list opens as an overlay');
assert(ui.includes('今天有 ')&&ui.includes('項待買'),'Today has the approved reminder copy');
assert(ui.includes('function renderShoppingTodayEntry(day)'),'Today uses one entry selector to avoid duplicate launchers');
assert(ui.includes('採買清單 →'),'empty, non-trip, and no-reminder Today states keep a lightweight list entry');
assert(ui.includes('直接完成')&&ui.includes('同時記帳'),'single completion offers the approved loop choices');
assert(ui.includes('建立多品項消費'),'pending list exposes the approved batch loop action');
assert.match(ui,/\.shopping-list-panel\{[^}]*overflow-y:auto[^}]*touch-action:pan-y/,'shopping overlay follows Scroll-only with CSS touch-action');

console.log('shopping list tests passed');
