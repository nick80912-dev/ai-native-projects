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
  createdAt:'2026-07-23T08:00:00.000Z',
  completedAt:'',
  splitGroupId:'',
  ledgerLinks:[]
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
assert(ui.includes('建立多品項消費'),'pending list exposes the approved batch loop action');
assert.match(ui,/completeSelectedShopping\(false\)">已購買<\/button>/,'batch completion uses the approved 已購買 label');
/* B:單筆勾選不再開三選一 Modal,改為直接完成＋toast 復原。 */
assert(!ui.includes('shoppingCompleteChoice'),'single completion no longer opens the three-way modal');
assert(!ui.includes('function undoShoppingCompleteChoice'),'the modal-only undo handler is retired');
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
assert(/\{done:false,completedAt:''\}/.test(doneSource),'復原清空 completedAt 並退回待買');
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
assert(/shoppingUiState\.tab==='done'\)return '<section class="shopping-group"><div class="shopping-group-title">已買<\/div>'\+items\.map\(renderShoppingItem\)\.join\(''\)\+'<\/section>'/.test(shoppingSource),'A6 已買頁維持既有平鋪與 store order,不套用行程排序');
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
