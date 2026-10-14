/* v154（Bar 2026-10-14 核准）「我的總花費」：個人帳（不含代購）＋團體帳中我分到的份額。
   直接執行 index.html 裡真實的 buildMyTripSpend 與它依賴的分攤 helper，不另寫一份假實作。 */
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();
const sandbox={Object,Array,String,Number,Math,JSON,isFinite,Date,timestampDate:value=>new Date(value)};
vm.createContext(sandbox);
['canonicalMemberName','ledgerLocalDateKey','ledgerBooleanValue','ledgerRecordMetadata','ledgerAmountValue','settlementWarning','isSafeLedgerInteger','parseParticipants','allocateAmountByLargestRemainder','buildMyTripSpend']
  .forEach(name=>vm.runInContext(extractFunction(html,name),sandbox));
const plain=value=>JSON.parse(JSON.stringify(value));
const P=list=>JSON.stringify(list);

const personal=[
  {id:'p1',time:'2026-10-18T09:10:00.000Z',member:'Bar',category:'餐飲',detail:'飯糰',amountJpy:680,amountTwd:143},
  {id:'p2',time:'2026-10-19T06:00:00.000Z',member:'Bar',category:'購物',detail:'白桃果醬',amountJpy:2400,amountTwd:504,isProxy:true,proxyTarget:'媽媽'},
  {id:'p3',time:'2026-10-19T07:30:00.000Z',member:'Bar',category:'美妝',detail:'藥妝',amountJpy:5800,amountTwd:1218},
  {id:'p4',time:'2026-10-19T08:00:00.000Z',member:'Amy',category:'餐飲',detail:'選錯身分時記的',amountJpy:999,amountTwd:210},
  {id:'p5',time:'2026-10-20T00:20:00.000Z',member:' Bar ',category:'',detail:'早餐',amountJpy:900,amountTwd:189}
];
const group=[
  {id:'g1',time:'2026-10-18T10:30:00.000Z',member:'Amy',category:'餐飲',detail:'燒肉晚餐',amountJpy:24000,amountTwd:5040,participants:P(['Bar','Amy','Ken','Mei'])},
  {id:'g2',time:'2026-10-19T03:30:00.000Z',member:'Mei',category:'餐飲',detail:'烏龍麵',amountJpy:1000,amountTwd:211,participants:P(['Amy','Bar','Mei'])},
  {id:'g3',time:'2026-10-19T05:00:00.000Z',member:'Bar',category:'交通',detail:'幫 Ken 和 Amy 付的車票',amountJpy:3000,amountTwd:630,participants:P(['Ken','Amy'])},
  {id:'g4',time:'2026-10-20T09:00:00.000Z',member:'Ken',category:'餐飲',detail:'居酒屋',amountJpy:10000,amountTwd:2100,participants:P(['Ken','Amy'])},
  {id:'g5',time:'2026-10-20T02:30:00.000Z',member:'Bar',category:'餐飲',detail:'咖啡',amountJpy:2400,amountTwd:504,participants:P(['Bar','Amy']),pending:true},
  {id:'g6',time:'2026-10-20T03:00:00.000Z',member:'Amy',category:'票券',detail:'舊格式',amountJpy:900,amountTwd:189,participants:''},
  {id:'g7',time:'2026-10-20T04:00:00.000Z',member:'Amy',category:'其他',detail:'金額壞掉',amountJpy:-5,amountTwd:0,participants:P(['Bar','Amy'])}
];

/* 「今天」以手機當地日期判斷，與「個人今日支出」相同；固定在 10/20 中午（本機時區）計算 */
const NOW=new Date(2026,9,20,12,0,0).getTime();
const spend=plain(sandbox.buildMyTripSpend(personal,group,'Bar',NOW));

/* 個人：只算目前身分、非代購；身分名稱前後空白視為同一人 */
assert.deepStrictEqual(spend.personal,{amountJpy:680+5800+900,amountTwd:143+1218+189,count:3},'personal counts my own non-proxy records only');
assert.deepStrictEqual(spend.proxy,{amountJpy:2400,amountTwd:504,count:1},'proxy purchases are reported but kept out of the total');

/* 團體：只算我在分攤成員內的份額，與結算相同的最大餘數分法 */
const allocate=(amount,people)=>plain(sandbox.allocateAmountByLargestRemainder(amount,people));
const g2Jpy=allocate(1000,['Amy','Bar','Mei'])[1].amount,g2Twd=allocate(211,['Amy','Bar','Mei'])[1].amount;
assert.strictEqual(g2Jpy,333,'the remainder yen goes to earlier participants, so Bar in the middle gets 333');
assert.strictEqual(g2Twd,70);
assert.strictEqual(spend.group.amountJpy,6000+g2Jpy+1200,'group share = sum of my shares, not what I paid');
assert.strictEqual(spend.group.amountTwd,1260+g2Twd+252);
assert.strictEqual(spend.group.count,3,'records without me, and records I only paid for, are not counted');
assert.strictEqual(spend.group.pendingCount,1,'unsynced group records are counted and flagged');
assert.strictEqual(spend.group.unattributedCount,2,'unreadable participants or amounts are never guessed');
assert.deepStrictEqual(spend.total,{amountJpy:spend.personal.amountJpy+spend.group.amountJpy,amountTwd:spend.personal.amountTwd+spend.group.amountTwd});
assert(!spend.groupItems.some(item=>item.id==='g3'||item.id==='g4'),'payer-only and not-involved records never appear');

/* 逐筆明細：最新在上，帶付款人、人數與待同步 */
assert.deepStrictEqual(spend.groupItems.map(item=>item.id),['g5','g2','g1'],'group items are newest first');
assert.deepStrictEqual(spend.groupItems[0],{id:'g5',time:'2026-10-20T02:30:00.000Z',category:'餐飲',detail:'咖啡',storeName:'',payer:'Bar',payerIsMe:true,participantCount:2,shareJpy:1200,shareTwd:252,pending:true});
assert.strictEqual(spend.groupItems[2].payer,'Amy');
assert.strictEqual(spend.groupItems[2].payerIsMe,false);

/* 類別：合併兩軌，依總額排序；空白類別歸「其他」 */
assert.deepStrictEqual(spend.categories.map(item=>item.category),['餐飲','美妝','其他'],'categories are sorted by total');
const food=spend.categories[0];
assert.deepStrictEqual([food.personalJpy,food.groupJpy,food.totalJpy],[680,6000+g2Jpy+1200,680+6000+g2Jpy+1200]);
assert.strictEqual(spend.categories[2].personalJpy,900,'a blank personal category lands in 其他');

/* v155：今天＝今天的個人（不含代購）＋今天的團體份額 */
const todayKey=sandbox.ledgerLocalDateKey(new Date(NOW));
const isToday=time=>sandbox.ledgerLocalDateKey(time)===todayKey;
const expectedPersonalToday=personal.filter(r=>r.member.trim()==='Bar'&&!r.isProxy&&isToday(r.time)).reduce((sum,r)=>sum+r.amountJpy,0);
const expectedGroupToday=spend.groupItems.filter(item=>isToday(item.time)).reduce((sum,item)=>sum+item.shareJpy,0);
assert(expectedGroupToday>0,'the fixture has a group share today');
assert.deepStrictEqual([spend.today.personalJpy,spend.today.groupJpy,spend.today.amountJpy],[expectedPersonalToday,expectedGroupToday,expectedPersonalToday+expectedGroupToday],'today combines personal and group shares on the same local date');
const yesterday=plain(sandbox.buildMyTripSpend(personal,group,'Bar',new Date(2026,9,17,12,0,0).getTime()));
assert.deepStrictEqual([yesterday.today.amountJpy,yesterday.today.amountTwd],[0,0],'a day without records reads zero');
assert.strictEqual(yesterday.total.amountJpy,spend.total.amountJpy,'the trip total does not depend on today');

/* 沒有身分時什麼都不算，也不拋錯 */
const empty=plain(sandbox.buildMyTripSpend(personal,group,''));
assert.deepStrictEqual([empty.personal.count,empty.group.count,empty.total.amountJpy],[0,0,0]);
assert.deepStrictEqual(plain(sandbox.buildMyTripSpend([],[],'Bar')).categories,[]);

/* 輸入不被改寫 */
assert.strictEqual(group[0].participants,P(['Bar','Amy','Ken','Mei']));
assert.strictEqual(personal[1].isProxy,true);

/* 接線：資料來源固定是正式帳本、已排除刪除／更正與還款；只在個人分頁顯示；匯出升為 v2 */
const snapshot=extractFunction(html,'myTripSpendSnapshot');
assert(snapshot.includes("ledgerUniverseRecords(spendLedgerRecords(mergedLedgerRecords()),'formal')"),'group shares read the effective formal spend records');
assert(snapshot.includes('personalLedgerRepository.all()')&&snapshot.includes('getCurrentMember(),Date.now()'),'the snapshot uses the same clock as 個人今日支出');
const split=extractFunction(html,'renderSplit');
assert(split.includes("var totalSpendCard=shared?'':renderMyTripSpendCard(myTripSpendSnapshot(),currency);"),'the card only renders on the personal track');
assert(split.includes('settlementCard+totalSpendCard+secondCard+'),'the card sits above the proxy card');
const card=extractFunction(html,'renderMyTripSpendCard');
assert(card.includes('個人（不含代購）')&&card.includes('團體份額'),'the card labels both parts (approved wording)');
assert(card.includes('今天 ')&&card.includes('spend.today[field]'),'v155: the card shows today next to the title');
const exporter=extractFunction(html,'personalLedgerExportJson');
assert(exporter.includes("version:2")&&exporter.includes('groupShare:groupShare')&&exporter.includes('totals:totals'),'export format v2 carries the group share and totals');

console.log('my trip spend tests passed');
