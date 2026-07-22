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
  const warnings=[];
  const sandbox={
    console:{log(){},warn(message){warnings.push(String(message));},error(){}},
    localStorage:createStorage(),fetch(){return Promise.reject(new Error('network disabled'));},
    setTimeout,clearTimeout,Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},AppLog:{repo(){},sync(){}},
    renderSplit(){},updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  sandbox.__warnings=warnings;
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();

const positive=plain(mod.ledgerSettlementStatus({netJpy:100,netTwd:0}));
assert.deepStrictEqual(positive,{kind:'receivable',label:'應收',amountJpy:100,amountTwd:0});
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:-50,netTwd:-10}).label,'應付');
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:0,netTwd:0}).label,'已結清');
assert.strictEqual(mod.ledgerSettlementStatus({netJpy:50,netTwd:-10}).label,'雙幣待結算');

assert.deepStrictEqual(Array.from(mod.parseParticipants({id:'p1',participants:'["Bar","Amy"]'})),['Bar','Amy'],'participants parse from the stored JSON string');
assert.strictEqual(mod.parseParticipants({id:'missing',participants:''}),null,'missing participants are invalid');
assert.strictEqual(mod.parseParticipants({id:'not-array',participants:'{"Bar":true}'}),null,'participants must be a JSON array');
assert.strictEqual(mod.parseParticipants({id:'empty',participants:'[]'}),null,'participants require at least one member');
assert.strictEqual(mod.parseParticipants({id:'duplicate',participants:'["Bar"," Bar "]'}),null,'canonical duplicate participants are rejected');
assert(mod.__warnings.length>=4,'invalid participant snapshots emit console warnings');

assert.deepStrictEqual(plain(mod.allocateAmountByLargestRemainder(10,['Bar','Amy','Cara'])),[
  {member:'Bar',amount:4},{member:'Amy',amount:3},{member:'Cara',amount:3}
],'indivisible amounts assign remainder units by original participant order');
assert.deepStrictEqual(plain(mod.allocateAmountByLargestRemainder(1,['Bar','Amy','Cara'])),[
  {member:'Bar',amount:1},{member:'Amy',amount:0},{member:'Cara',amount:0}
],'one unit can be divided across multiple participants without loss');
assert.strictEqual(mod.allocateAmountByLargestRemainder(101,['A','B','C']).reduce((sum,item)=>sum+item.amount,0),101,'allocation sum always equals the original amount');
assert.deepStrictEqual(plain(mod.allocateAmountByLargestRemainder(0,['Bar','Amy'])),[
  {member:'Bar',amount:0},{member:'Amy',amount:0}
],'zero amounts remain exactly zero');
assert.throws(()=>mod.allocateAmountByLargestRemainder(-1,['Bar']),/非負整數/,'negative amounts are rejected');
assert.throws(()=>mod.allocateAmountByLargestRemainder(1.5,['Bar']),/非負整數/,'fractional smallest-currency units are rejected');
assert.throws(()=>mod.allocateAmountByLargestRemainder('9007199254740993',['Bar','Amy']),/安全/,'unsafe integers are rejected before Number rounding can lose a unit');
assert.throws(()=>mod.allocateAmountByLargestRemainder(1,[]),/至少一人/,'allocation requires participants');

function expense(id,member,jpy,twd,participants,time){
  return {id,time:time||'2026-07-18T01:00:00.000Z',member,category:'餐飲',detail:id,amountJpy:jpy,amountTwd:twd,note:'',participants:JSON.stringify(participants),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:''};
}

const formalUniverseExpense=expense('formal-universe','Bar',100,20,['Bar','Amy']);
const testUniverseExpense=expense('test-universe','Bar',900,180,['Bar','Amy']);
testUniverseExpense.detail='[TEST] test-universe';
const universeRegistrations=[
  {id:'universe-member-bar',time:'2026-07-18T00:00:00.000Z',member:'Bar',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  {id:'universe-member-amy',time:'2026-07-18T00:01:00.000Z',member:'Amy',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'}
];
const formalUniverseBalances=mod.buildMemberBalances(universeRegistrations.concat([formalUniverseExpense,testUniverseExpense]),null,null,'formal');
const testUniverseBalances=mod.buildMemberBalances(universeRegistrations.concat([formalUniverseExpense,testUniverseExpense]),null,null,'test');
assert.strictEqual(formalUniverseBalances.members[0].paidJpy,100,'formal settlement uses only formal expenses');
assert.strictEqual(testUniverseBalances.members[0].paidJpy,900,'TEST settlement uses only TEST expenses');

const records=[
  {id:'member-bar',time:'2026-07-18T00:00:00.000Z',member:'Bar',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  {id:'member-amy',time:'2026-07-18T00:01:00.000Z',member:'Amy',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  {id:'member-cara',time:'2026-07-18T00:02:00.000Z',member:'Cara',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  expense('breakfast','Bar',100,10,['Bar','Amy']),
  expense('tickets','Amy',101,11,['Bar','Amy','Cara'],'2026-07-18T02:00:00.000Z')
];
const balances=mod.buildMemberBalances(records);
assert.deepStrictEqual(Array.from(balances.memberOrder),['Bar','Amy','Cara'],'balance results retain the stable registration order for transfer tie-breaks');
assert.deepStrictEqual(plain(balances.members),[
  {member:'Bar',paidJpy:100,owedJpy:84,netJpy:16,paidTwd:10,owedTwd:9,netTwd:1},
  {member:'Amy',paidJpy:101,owedJpy:84,netJpy:17,paidTwd:11,owedTwd:9,netTwd:2},
  {member:'Cara',paidJpy:0,owedJpy:33,netJpy:-33,paidTwd:0,owedTwd:3,netTwd:-3}
],'multiple payers and participant groups settle each currency independently');
assert.strictEqual(balances.members.reduce((sum,item)=>sum+item.netJpy,0),0,'JPY net balances sum to zero');
assert.strictEqual(balances.members.reduce((sum,item)=>sum+item.netTwd,0),0,'TWD net balances sum to zero');
assert.deepStrictEqual(plain(mod.buildTransferSuggestions(balances,'JPY')),[
  {from:'Cara',to:'Amy',amount:17,currency:'JPY'},
  {from:'Cara',to:'Bar',amount:16,currency:'JPY'}
],'JPY suggestions settle the largest debtor against the largest creditor');
assert.deepStrictEqual(plain(mod.buildTransferSuggestions(balances,'TWD')),[
  {from:'Cara',to:'Amy',amount:2,currency:'TWD'},
  {from:'Cara',to:'Bar',amount:1,currency:'TWD'}
],'TWD suggestions are calculated independently from JPY');
function balancesAfterTransfers(members,suggestions,field){
  const result={};members.forEach(item=>{result[item.member]=item[field];});
  suggestions.forEach(item=>{result[item.from]+=item.amount;result[item.to]-=item.amount;});
  return result;
}
const jpySuggestions=plain(mod.buildTransferSuggestions(balances,'JPY'));
const twdSuggestions=plain(mod.buildTransferSuggestions(balances,'TWD'));
assert(Object.values(balancesAfterTransfers(balances.members,jpySuggestions,'netJpy')).every(value=>value===0),'JPY transfers reduce every balance to zero');
assert(Object.values(balancesAfterTransfers(balances.members,twdSuggestions,'netTwd')).every(value=>value===0),'TWD transfers reduce every balance to zero');

const laterMember={id:'member-dana',time:'2026-07-18T05:00:00.000Z',member:'Dana',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'};
const balancesWithLaterMember=mod.buildMemberBalances(records.concat(laterMember));
assert.deepStrictEqual(plain(balancesWithLaterMember.members.slice(0,3)),plain(balances.members),'a later registration does not change historical participant shares');
assert.deepStrictEqual(plain(balancesWithLaterMember.members[3]),{member:'Dana',paidJpy:0,owedJpy:0,netJpy:0,paidTwd:0,owedTwd:0,netTwd:0},'a later non-participant remains settled at zero');

const tieBalances=[
  {member:'A',netJpy:-5,netTwd:0},{member:'B',netJpy:-5,netTwd:0},
  {member:'C',netJpy:5,netTwd:0},{member:'D',netJpy:5,netTwd:0}
];
const tieOrder=['B','A','D','C'];
const tieResult=plain(mod.buildTransferSuggestions(tieBalances,'JPY',tieOrder));
assert.deepStrictEqual(tieResult,[
  {from:'B',to:'D',amount:5,currency:'JPY'},
  {from:'A',to:'C',amount:5,currency:'JPY'}
],'equal balances use formal registration order as the stable tie-break');
assert.deepStrictEqual(plain(mod.buildTransferSuggestions(tieBalances,'JPY',tieOrder)),tieResult,'the same input always produces the same suggestions');
assert.strictEqual(tieResult.length,2,'the greedy result remains concise without claiming a global minimum');
assert.deepStrictEqual(plain(mod.buildTransferSuggestions([
  {member:'張三',netJpy:-5},{member:'Amy',netJpy:-5},{member:'王五',netJpy:5},{member:'Bob',netJpy:5}
],'JPY')), [
  {from:'Amy',to:'Bob',amount:5,currency:'JPY'},
  {from:'張三',to:'王五',amount:5,currency:'JPY'}
],'without registration order, canonical names use deterministic code-unit sorting');
assert.deepStrictEqual(plain(mod.buildTransferSuggestions([{member:'Bar',netJpy:0,netTwd:0}],'JPY',['Bar'])),[],'settled balances need no transfers');
assert.throws(()=>mod.buildTransferSuggestions([{member:'Bar',netJpy:1},{member:'Amy',netJpy:0}],'JPY'),/總和必須為零/,'unbalanced input is rejected');
assert.throws(()=>mod.buildTransferSuggestions([{member:'Bar',netJpy:9007199254740992},{member:'Amy',netJpy:-9007199254740992}],'JPY'),/安全整數/,'unsafe net balances are rejected');

const deleted=expense('deleted','Bar',900,180,['Bar','Amy']);
const tombstone={id:'delete-1',time:'2026-07-18T03:00:00.000Z',member:'Amy',category:'餐飲',detail:'[刪除]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'deletion',targetRecordId:'deleted',deleteReason:'輸入錯誤',batchId:''};
const invalidMissing=expense('missing-participants','Bar',500,100,[]);
invalidMissing.participants='';
const invalidNegative=expense('negative','Bar',-1,10,['Bar','Amy']);
const invalidUnsafe=expense('unsafe','Bar','9007199254740993',10,['Bar','Amy']);
const ignoredLegacy={id:'legacy',time:'2026-07-18T04:00:00.000Z',member:'Bar',detail:'舊紀錄',amountJpy:999,amountTwd:200,participants:'["Bar"]',recordType:''};
const ignoredTest=expense('test','Bar',777,155,['Bar','Amy']);
ignoredTest.detail='[TEST] 測試支出';
const anomalyWarnings=[];
const filtered=mod.buildMemberBalances(records.concat([deleted,tombstone,invalidMissing,invalidNegative,invalidUnsafe,ignoredLegacy,ignoredTest]),null,message=>anomalyWarnings.push(message));
assert.deepStrictEqual(plain(filtered.members),plain(balances.members),'deleted, TEST, legacy and invalid expenses are excluded from settlement');
assert.deepStrictEqual(Array.from(filtered.invalidRecords,item=>item.id).sort(),['missing-participants','negative','unsafe'],'invalid participant and amount records are surfaced');
assert(anomalyWarnings.length>=2,'settlement anomalies emit warnings');

const maxSafe=9007199254740991;
const overflowBalances=mod.buildMemberBalances([
  {id:'member-a',time:'2026-07-18T00:00:00.000Z',member:'A',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  {id:'member-b',time:'2026-07-18T00:01:00.000Z',member:'B',detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'},
  expense('max-safe','A',maxSafe,0,['B']),
  expense('overflow','A',1,0,['Phantom'],'2026-07-18T02:00:00.000Z')
]);
assert.deepStrictEqual(Array.from(overflowBalances.invalidRecords,item=>item.id),['overflow'],'a record that would overflow cumulative balances is excluded atomically');
assert.strictEqual(overflowBalances.members[0].paidJpy,maxSafe,'the valid maximum-safe payment remains exact');
assert.strictEqual(overflowBalances.members[1].owedJpy,maxSafe,'the rejected overflow record leaves no partial owed update');
assert.deepStrictEqual(Array.from(overflowBalances.memberOrder),['A','B'],'an overflowed record does not leave a zero-balance phantom participant');

function settlementFixture(current,jpy,twd){
  return {current,jpy:jpy||[],twd:twd||[],balances:{members:[]}};
}
const multipleReceivable=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:4500,netTwd:900},
  [{from:'小美',to:'Me',amount:2000,currency:'JPY'},{from:'小華',to:'Me',amount:2500,currency:'JPY'}],
  [{from:'小美',to:'Me',amount:400,currency:'TWD'},{from:'小華',to:'Me',amount:500,currency:'TWD'}]
),'Me','JPY'));
assert.strictEqual(multipleReceivable.label,'應收','multiple debtors keep the current member receivable status');
assert.strictEqual(multipleReceivable.amount,4500,'the status amount comes from the existing current-member balance');
assert.strictEqual(multipleReceivable.pendingCount,2,'the status counts confirmed counterpart members');
assert.deepStrictEqual(multipleReceivable.pendingNames,['小美','小華'],'the status model exposes the already-derived counterpart names for the compact card');
assert.deepStrictEqual(multipleReceivable.details,['小美待付 ¥2,000','小華待付 ¥2,500'],'at most two confirmed incoming transfers are summarized');

const oneReceivable=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:1200,netTwd:240},
  [{from:'小美',to:'Me',amount:1200,currency:'JPY'}],
  [{from:'小美',to:'Me',amount:240,currency:'TWD'}]
),'Me','JPY'));
assert.strictEqual(oneReceivable.pendingCount,1,'one remaining counterpart is reported exactly');
assert.deepStrictEqual(oneReceivable.details,['小美待付 ¥1,200'],'one remaining transfer stays concise');

const payable=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:-6500,netTwd:-1300},
  [{from:'Me',to:'小明',amount:6500,currency:'JPY'}],
  [{from:'Me',to:'小明',amount:1300,currency:'TWD'}]
),'Me','JPY'));
assert.strictEqual(payable.label,'應付','a negative current-member balance renders payable');
assert.deepStrictEqual(payable.details,['小明待收 ¥6,500'],'outgoing suggestions name the confirmed recipient');

const selfSettled=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:0,netTwd:0},
  [{from:'小美',to:'小華',amount:500,currency:'JPY'}],[]
),'Me','JPY'));
assert.strictEqual(selfSettled.label,'我已結清','a zero current balance does not claim the whole group is settled');
assert.strictEqual(selfSettled.pendingCount,2,'group participants still pending are counted from transfer suggestions');
assert.deepStrictEqual(selfSettled.details,['小美待付小華 ¥500'],'self-settled members see a concise confirmed group transfer');

const allSettled=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:0,netTwd:0},[],[]
),'Me','JPY'));
assert.strictEqual(allSettled.label,'全員已結清','no suggestions in either currency confirms the group is settled');
assert.strictEqual(allSettled.pendingCount,0,'a settled group has no pending members');
assert.deepStrictEqual(allSettled.details,[],'a settled group does not invent pending transfers');

const otherCurrencyOnly=plain(mod.ledgerSettlementStatusCardModel(settlementFixture(
  {member:'Me',netJpy:0,netTwd:-80},[],[{from:'Me',to:'Amy',amount:80,currency:'TWD'}]
),'Me','JPY'));
assert.strictEqual(otherCurrencyOnly.currency,'TWD','a zero preferred-currency balance falls back to the confirmed non-zero currency');
assert.strictEqual(otherCurrencyOnly.label,'應付','the fallback still reports the correct direction');

assert.strictEqual(typeof mod.ledgerSettlementCardProgress,'function','settlement card exposes one progress-copy rule');
assert.strictEqual(mod.ledgerSettlementCardProgress(multipleReceivable,true),'尚待 2 人 · 小美、小華','receivable card reports counterpart count and at most two names without payment inference');
assert.strictEqual(mod.ledgerSettlementCardProgress(payable,true),'尚待 1 人 · 小明','payable card names the confirmed recipient');
assert.strictEqual(mod.ledgerSettlementCardProgress(selfSettled),'團體尚待 2 人','self-settled card reports remaining group participants');
assert.strictEqual(mod.ledgerSettlementCardProgress(allSettled,true),'所有款項都已處理','all-settled card uses the approved completed copy');
assert.strictEqual(mod.ledgerSettlementCardProgress(allSettled,false),'新增團體支出後會自動計算','a ledger without settlement data uses the approved guidance copy');
const threePending=Object.assign({},multipleReceivable,{pendingCount:3,pendingNames:['小明','小華','媽媽']});
assert.strictEqual(mod.ledgerSettlementCardProgress(threePending,true),'尚待 3 人 · 小明、小華等','settlement card caps names at two and adds the overflow suffix');

const html=fs.readFileSync('index.html','utf8');
const settlementSource=html.slice(html.indexOf('function ledgerCurrentMemberSettlement('),html.indexOf('function showLedgerFullList('));
assert(settlementSource.includes('buildMemberBalances(records,null,null,universe)'),'settlement UI consumes the universe-aware PR4 balance engine');
assert(settlementSource.includes("buildTransferSuggestions(balances,'JPY')"),'settlement UI consumes PR4 JPY transfer suggestions');
assert(settlementSource.includes("buildTransferSuggestions(balances,'TWD')"),'settlement UI consumes PR4 TWD transfer suggestions');
assert(!settlementSource.includes('owedJpy+='),'UI does not reimplement owed balances');
assert(!settlementSource.includes('paidJpy+='),'UI does not reimplement paid balances');
assert(settlementSource.includes('balances.invalidRecords'),'expanded settlement surfaces invalid records');
assert(!settlementSource.includes('人已結清'),'dashboard does not invent repayment progress absent from the existing engine');
const settlementCardSource=html.slice(html.indexOf('function renderLedgerSettlementCard('),html.indexOf('function ledgerSettlementLines('));
assert.match(settlementCardSource,/<button class="ledger-compact-card ledger-compact-action ledger-shared-settlement-card[^>]+onclick="openLedgerSettlementPanel\(\)"/,'the entire settlement card keeps the existing Sheet entry point');
assert(settlementCardSource.includes('<h3>我的結算狀態</h3>'),'settlement card title occupies its own row');
assert(settlementCardSource.includes('ledger-shared-settlement-amount'),'settlement amount occupies its own primary row');
assert(settlementCardSource.includes('ledger-shared-settlement-chevron'),'the top-right corner contains only the chevron affordance');
assert(!settlementCardSource.includes('查看結算'),'the independent settlement action is removed');
assert(!settlementCardSource.includes('model.details'),'dashboard omits member-level transfer details');

console.log('ledger settlement tests passed');
