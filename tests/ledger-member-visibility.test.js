/* ledger-member-visibility.test.js — 團體帳本「只顯示與目前成員相關紀錄」
   規則:目前成員是付款人(record.member)或在 participants 內,任一成立即顯示。
   涵蓋正常資料四象限、legacy participants fail-open、成員無法解析的 fail-safe,
   以及「清單／筆數／總額／完整紀錄頁／編輯／刪除入口」共用同一批過濾結果的全域一致性。 */
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

function loadModule(){
  const source=fs.readFileSync('index.html','utf8');
  const start=source.indexOf('/* ================= ledgerRepository');
  const end=source.indexOf('/* ================= 分帳',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const sandbox={
    console:{log(){},warn(){},error(){}},localStorage:createStorage(),
    fetch(){return Promise.reject(new Error('network disabled'));},setTimeout,clearTimeout,
    Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){},data(){}},
    formatLedgerCurrencyAmount(currency,amount){return (currency==='TWD'?'NT$':'¥')+Math.round(Number(amount||0)).toLocaleString();},
    escapeHtml(value){return String(value);},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  sandbox.__htmlSource=source;
  return sandbox;
}

const mod=loadModule();
const html=mod.__htmlSource;
const ME='Mark';
const ids=list=>Array.from(list,record=>record.id);
const day=(index,hour)=>new Date(2026,6,index,hour==null?12:hour,0).toISOString();

/* ---------- 正常資料:付款人 × 分攤成員四象限 ---------- */
const payerAndParticipant={id:'n1',time:day(20),member:'Mark',participants:'["Mark","Jane"]',amountJpy:1000,amountTwd:200};
const payerOnly        ={id:'n2',time:day(20),member:'Mark',participants:'["Jane","Baron"]',amountJpy:2000,amountTwd:400};
const participantOnly  ={id:'n3',time:day(20),member:'Jane',participants:'["Mark","Baron"]',amountJpy:3000,amountTwd:600};
const unrelated        ={id:'n4',time:day(20),member:'Jane',participants:'["Jane","Baron"]',amountJpy:4000,amountTwd:800};

assert.strictEqual(mod.isLedgerRecordRelatedToMember(payerAndParticipant,ME),true,'#1 目前成員同時是付款人與分攤成員 → 顯示');
assert.strictEqual(mod.isLedgerRecordRelatedToMember(payerOnly,ME),true,'#2 目前成員是付款人但不在 participants(全額代墊)→ 顯示');
assert.strictEqual(mod.isLedgerRecordRelatedToMember(participantOnly,ME),true,'#3 目前成員只是分攤成員 → 顯示');
assert.strictEqual(mod.isLedgerRecordRelatedToMember(unrelated,ME),false,'#4 既非付款人也不在 participants → 不顯示');

/* participants 單獨判斷不足以涵蓋代墊情境 —— 這是本功能最容易寫錯的一條。 */
assert(!JSON.parse(payerOnly.participants).some(name=>name===ME),'代墊測資本身確實不含目前成員,#2 不是假通過');

/* ---------- 筆數與總額只計過濾後紀錄 ---------- */
const normalSet=[payerAndParticipant,payerOnly,participantOnly,unrelated];
const visible=mod.memberRelatedLedgerRecords(normalSet,ME);
assert.deepStrictEqual(ids(visible),['n1','n2','n3'],'過濾結果只留下與目前成員相關的紀錄');
assert.deepStrictEqual(ids(normalSet),['n1','n2','n3','n4'],'過濾不得就地改動輸入陣列');

const visibleSummary=mod.summarizeLedgerRecords(visible,false);
const wholeGroupSummary=mod.summarizeLedgerRecords(normalSet,false);
assert.strictEqual(visibleSummary.records.length,3,'#5 不相關紀錄不得計入筆數');
assert.strictEqual(wholeGroupSummary.records.length,4,'全團基準值確實包含那筆不相關紀錄,#5 不是假通過');
assert.strictEqual(visibleSummary.total.amountJpy,6000,'#6 總額只加總過濾後紀錄(1000+2000+3000)');
assert.strictEqual(visibleSummary.total.amountTwd,1200,'#6 台幣總額同樣只加總過濾後紀錄');
assert.strictEqual(wholeGroupSummary.total.amountJpy,10000,'全團總額 10000 未被誤用為個人視角數字');

/* ---------- Legacy 資料:限定式 fail-open ---------- */
const missingField ={id:'l1',time:day(19),member:'Baron',amountJpy:10,amountTwd:2};
const nullField    ={id:'l2',time:day(19),member:'Baron',participants:null,amountJpy:10,amountTwd:2};
const emptyArray   ={id:'l3',time:day(19),member:'Baron',participants:'[]',amountJpy:10,amountTwd:2};
const notJson      ={id:'l4',time:day(19),member:'Baron',participants:'Jane、Baron',amountJpy:10,amountTwd:2};
const notArray     ={id:'l5',time:day(19),member:'Baron',participants:'{"Jane":1}',amountJpy:10,amountTwd:2};
const nonStringItem={id:'l6',time:day(19),member:'Baron',participants:'["Jane",123]',amountJpy:10,amountTwd:2};
const arrayInstead ={id:'l7',time:day(19),member:'Baron',participants:['Jane','Baron'],amountJpy:10,amountTwd:2};
const legacySet=[missingField,nullField,emptyArray,notJson,notArray,nonStringItem,arrayInstead];

assert.strictEqual(mod.isLedgerRecordRelatedToMember(missingField,ME),true,'#7 participants 欄位缺失 → 保留顯示');
assert.strictEqual(mod.isLedgerRecordRelatedToMember(nullField,ME),true,'#8 participants 為 null → 保留顯示');
assert.strictEqual(mod.isLedgerRecordRelatedToMember(emptyArray,ME),true,'#9 participants 為空陣列 → 保留顯示');
legacySet.forEach(function(record){
  assert.doesNotThrow(function(){mod.isLedgerRecordRelatedToMember(record,ME);},'#10 格式無效的 participants 不得造成 runtime error:'+record.id);
});
assert.deepStrictEqual(ids(mod.memberRelatedLedgerRecords(legacySet,ME)),ids(legacySet),'#10 無法可靠判斷歸屬的舊資料一律先保留,不靜默消失');

/* fail-open 是「無法判斷」時才成立,不是無條件放行 —— 判得出來就照規則排除。 */
assert.strictEqual(mod.isLedgerRecordRelatedToMember({id:'l8',member:'Baron',participants:'["Jane","Baron"]'},ME),false,'可正常解析的 participants 仍照規則排除,fail-open 沒有擴散');

/* 格式異常必須留下診斷訊號,而且是透過既有 parseParticipants 的 warning 管道。 */
const warnings=[];
mod.memberRelatedLedgerRecords([notJson],ME,function(message){warnings.push(message);});
assert.strictEqual(warnings.length,1,'格式異常的舊資料留下一則診斷訊息');
assert(warnings[0].indexOf('l4')>=0,'診斷訊息指出是哪一筆紀錄');
assert.strictEqual(mod.memberRelatedLedgerRecords([notJson],ME).length,1,'未提供 warnFn 時仍保留紀錄且不拋錯');

/* ---------- 成員狀態 ---------- */
assert.deepStrictEqual(ids(mod.memberRelatedLedgerRecords(normalSet,'')),ids(normalSet),'#11 current member 無法解析 → 不套用過濾,帳本不歸零');
assert.deepStrictEqual(ids(mod.memberRelatedLedgerRecords(normalSet,null)),ids(normalSet),'#11 null 身分同樣安全退化');
assert.deepStrictEqual(ids(mod.memberRelatedLedgerRecords(normalSet,'   ')),ids(normalSet),'#11 僅空白的身分同樣安全退化');
const unresolvedWarnings=[];
mod.memberRelatedLedgerRecords(normalSet,'',function(message){unresolvedWarnings.push(message);});
assert.strictEqual(unresolvedWarnings.length,1,'#11 安全退化留下一則診斷訊號,不是無聲跳過');
assert(unresolvedWarnings[0].indexOf('無法解析')>=0,'#11 診斷訊息說明退化原因');

/* #12 顯示名稱格式改變(全形空白／前後空白／內部多空白)仍以同一個穩定 key 判斷。
   本專案 Ledger schema 沒有獨立 member id,canonicalMemberName() 正規化後的姓名
   就是既有的穩定成員識別(registeredMemberEntries 的 entry.key 用的也是它)。 */
assert.strictEqual(mod.canonicalMemberName('　Mark　'),'Mark','全形空白與前後空白會被正規化掉');
assert.strictEqual(mod.isLedgerRecordRelatedToMember({id:'k1',member:'　Mark　',participants:'["Jane"]'},'Mark'),true,'#12 付款人姓名格式不同仍判定為同一人');
assert.strictEqual(mod.isLedgerRecordRelatedToMember({id:'k2',member:'Jane',participants:'["Baron","Mark  Lee"]'},'Mark Lee'),true,'#12 participants 內的多餘空白不影響比對');
assert.strictEqual(mod.isLedgerRecordRelatedToMember({id:'k3',member:'Jane',participants:'["Markus"]'},'Mark'),false,'正規化不得放寬成前綴比對');

/* ---------- 全域一致性:所有畫面共用同一批過濾結果 ---------- */
/* 依 ledgerTrackRecords() 的實際組合重建管線:mergedLedgerRecords → spend → universe → 與我相關 → 排序。 */
const registration={id:'g0',time:day(15),member:'Mark',detail:'[身分註冊]',recordType:'identity_registration',participants:'',amountJpy:0,amountTwd:0};
const older       ={id:'g1',time:day(18),member:'Jane',participants:'["Mark","Jane"]',amountJpy:500,amountTwd:100,detail:'舊日期我也在'};
const testUniverse={id:'g2',time:day(20),member:'Mark',participants:'["Mark"]',amountJpy:900,amountTwd:180,detail:'[TEST] 測試宇宙'};
const cloud=[registration,older,testUniverse].concat(normalSet);
const track=mod.sortLedgerExpenses(mod.memberRelatedLedgerRecords(mod.ledgerUniverseRecords(mod.spendLedgerRecords(cloud),'formal'),ME));
assert.deepStrictEqual(ids(track).slice().sort(),['g1','n1','n2','n3'],'共用節流點輸出:正式宇宙內與我相關的四筆');
assert(ids(track).indexOf('n4')<0,'不相關紀錄不進入任何畫面');
assert(ids(track).indexOf('g2')<0,'TEST 宇宙隔離不受本次過濾影響');

const trackSummary=mod.summarizeLedgerRecords(track,false);
const period=mod.buildLedgerPeriodSummary(trackSummary.records,new Date(2026,6,20,20,0).getTime());
assert.strictEqual(period.count,track.length,'#14 主卡片筆數等於實際顯示筆數');
assert.strictEqual(trackSummary.total.amountJpy,6500,'#15 主卡片金額等於過濾後紀錄加總(500+1000+2000+3000)');
assert.strictEqual(trackSummary.total.amountTwd,1300,'#15 台幣金額同樣等於過濾後加總');

const recent=mod.selectLatestLedgerDateExpenses(track);
const fullList=mod.filterLedgerHistory(track,'',{categories:[],payMethods:[],proxy:'all',taxExempt:'all'});
assert.deepStrictEqual(ids(fullList).slice().sort(),ids(track).slice().sort(),'#13 完整紀錄頁(無篩選)與共用節流點同一批');
ids(recent).forEach(function(id){assert(ids(fullList).indexOf(id)>=0,'#13 最近消費必為完整紀錄頁的子集:'+id);});
assert.deepStrictEqual(ids(recent).slice().sort(),['n1','n2','n3'],'#13 最近消費取最新日期,且已套用同一過濾');
assert(ids(recent).indexOf('n4')<0,'#13 最近消費不含不相關紀錄');
assert.strictEqual(mod.filterLedgerHistory(track,'Baron',{categories:[],payMethods:[],proxy:'all',taxExempt:'all'}).length,0,'#16 查詢不會把不相關紀錄撈回來');

/* ---------- 供料範圍與操作入口不得漂移(原始碼契約) ---------- */
const ledgerUiSource=html.slice(html.indexOf('function ledgerTrackRecords()'),html.indexOf('/* ================= 導覽 / 啟動'));
const detailSource=html.slice(html.indexOf('function ledgerRecordDetailRows('),html.indexOf('function renderSplit()'));
const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
const trackSource=html.slice(html.indexOf('var _ledgerVisibilityWarned'),html.indexOf('function setLedgerTrack('));

assert(trackSource.includes('memberRelatedLedgerRecords('),'過濾實作在團體帳唯一的共用節流點');
assert(trackSource.includes('getCurrentMember()'),'過濾以目前成員身分為準');
assert(!trackSource.includes("track==='personal'?memberRelatedLedgerRecords"),'個人帳(本機單人資料)不套用團體成員過濾');
assert(trackSource.includes('function ledgerVisibilityWarn('),'可見範圍診斷有單一輸出入口');
assert(trackSource.includes('_ledgerVisibilityWarned[message]'),'診斷訊息 warn-once,不在每次 renderSplit 洗版');
assert(ledgerUiSource.includes('ledgerTrackRecords()'),'共用節流點仍在分帳 UI 區段內');

/* 八個消費端全部取自同一個節流點,沒有第二條供料路徑。 */
[
  ['ledgerSelectionVisibleRecords','最近消費與批次選取'],
  ['deleteLedgerBatchFromAction','批次刪除入口'],
  ['openLedgerRecordActions','編輯／刪除動作選單'],
  ['openLedgerProxyPanel','代購摘要'],
  ['renderLedgerHistoryResults','查詢結果'],
  ['openLedgerRecordDetail','紀錄明細']
].forEach(function(pair){
  const start=html.indexOf('function '+pair[0]+'(');
  assert(start>=0,pair[0]+' 仍存在');
  const body=html.slice(start,html.indexOf('\nfunction ',start+1));
  assert(body.includes('ledgerTrackRecords()'),pair[1]+'('+pair[0]+')取自共用節流點');
});
assert(splitSource.includes('records=ledgerTrackRecords()'),'主畫面(筆數／總額／完整紀錄頁)取自共用節流點');
assert(detailSource.includes('ledgerTrackRecords().filter'),'紀錄明細只在目前可見範圍內查詢');
assert(splitSource.includes('renderLedgerSettlementCard(mergedLedgerRecords()'),'結算仍讀全團事件流,餘額計算不得被可見範圍過濾');

/* 編輯與刪除讀的是未過濾的 mergedLedgerRecords(),必須各自重跑同一個判斷。 */
const editSource=html.slice(html.indexOf('function editLedgerRecord('),html.indexOf('function closeLedgerEntrySheet('));
assert(editSource.includes('isLedgerRecordRelatedToMember('),'#16 編輯入口以同一個判斷重查,不只依賴清單過濾');
assert(editSource.includes("track==='shared'"),'#16 編輯的相關性檢查只作用於團體帳');
const deleteDialogSource=html.slice(html.indexOf('function openSharedLedgerDeleteBatch('),html.indexOf('function submitSharedLedgerDeletion('));
const deleteSubmitSource=html.slice(html.indexOf('function submitSharedLedgerDeletion('),html.indexOf('function clearLegacyExpenses('));
assert(deleteDialogSource.includes('isLedgerRecordRelatedToMember('),'#16 刪除對話框只接受與目前成員相關的紀錄');
assert(deleteSubmitSource.includes('isLedgerRecordRelatedToMember('),'#16 實際寫入墓碑前再檢查一次');
assert(deleteSubmitSource.includes('canDeleteLedgerRecord(record)'),'既有可刪除判斷未被取代');

/* 不新增篩選 UI:本批採全面一致過濾,不做「與我相關／全部」切換。 */
assert(!html.includes('與我相關／全部')&&!html.includes('setLedgerScopeFilter'),'不新增範圍切換 UI 或設定');
assert(splitSource.includes("shared?'與我相關 · '+period.count+' 筆紀錄'"),'主卡片文案明確表達這是個人範圍');
assert(!splitSource.includes('團體總支出'),'主卡片不再暗示為全團總額');

const sw=fs.readFileSync('sw.js','utf8');
assert.match(sw,/okayama-trip-v58/,'service worker cache is v58');

console.log('ledger member visibility tests passed');
