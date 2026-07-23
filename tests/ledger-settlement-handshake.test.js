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

/* ── record builders ── */
const claim=mod.createSettlementClaim('Bar','小美',3000,'JPY',false,1789000000000,()=>0.5);
assert.strictEqual(claim.recordType,'settlement_claim','claim uses the ADR 0007 record type');
assert.strictEqual(claim.member,'Bar','claim member is the payer');
assert.strictEqual(claim.participants,'["小美"]','claim participants snapshot the single receiver');
assert.strictEqual(claim.amountJpy,3000,'JPY claim stores the settlement amount in amountJpy');
assert.strictEqual(claim.amountTwd,0,'JPY claim keeps the other currency at zero');
assert.strictEqual(claim.inputCurrency,'JPY','claim records the settlement currency');
assert.strictEqual(claim.targetRecordId,'','claims never point at another record');

const twdClaim=mod.createSettlementClaim('Bar','小美',600,'TWD',false,1789000000001,()=>0.5);
assert.strictEqual(twdClaim.amountTwd,600,'TWD claim stores the amount in amountTwd');
assert.strictEqual(twdClaim.amountJpy,0,'TWD claim keeps JPY at zero');

const testClaim=mod.createSettlementClaim('Bar','小美',100,'JPY',true,1789000000002,()=>0.5);
assert(/^\[TEST\]/.test(testClaim.detail),'test-mode claims carry the TEST prefix');

assert.throws(()=>mod.createSettlementClaim('Bar','Bar',100,'JPY'),/不可相同/,'self-settlement is rejected');
assert.throws(()=>mod.createSettlementClaim('Bar','小美',0,'JPY'),/正整數/,'zero amounts are rejected');
assert.throws(()=>mod.createSettlementClaim('Bar','小美',-5,'JPY'),/正整數/,'negative amounts are rejected');
assert.throws(()=>mod.createSettlementClaim('Bar','小美',100,'USD'),/JPY 或 TWD/,'settlement currency is a closed set');
assert.throws(()=>mod.createSettlementClaim('','小美',100,'JPY'),/付款人必填/,'payer is required');

const confirm=mod.createSettlementResponse('settlement_confirm',claim,'小美','',false,1789000001000,()=>0.5);
assert.strictEqual(confirm.recordType,'settlement_confirm');
assert.strictEqual(confirm.member,'小美','confirm member is the receiver');
assert.strictEqual(confirm.targetRecordId,claim.id,'confirm targets the claim');
assert.strictEqual(confirm.amountJpy,0,'responses carry no amounts');
assert.strictEqual(confirm.amountTwd,0,'responses carry no amounts');

const reject=mod.createSettlementResponse('settlement_reject',claim,'小美','未收到',false,1789000002000,()=>0.5);
assert.strictEqual(reject.recordType,'settlement_reject');
assert.strictEqual(reject.note,'未收到','reject stores the optional reason in note');
const silentReject=mod.createSettlementResponse('settlement_reject',claim,'小美','',false,1789000002500,()=>0.5);
assert.strictEqual(silentReject.note,'','reject reason stays optional');

assert.throws(()=>mod.createSettlementResponse('settlement_confirm',claim,'Bar','',false),/只有收款人/,'only the receiver may respond');
assert.throws(()=>mod.createSettlementResponse('settlement_confirm',{id:'x',recordType:'expense'},'小美','',false),/結清紀錄/,'responses only target claims');
assert.throws(()=>mod.createSettlementResponse('settlement_reject',claim,'小美','a'.repeat(51),false),/50 個字/,'reject reason is capped at 50 chars');

/* ── derivation ── */
function registration(id,member,time){
  return {id,time,member,detail:'[身分註冊]',amountJpy:0,amountTwd:0,recordType:'identity_registration'};
}
function expense(id,member,jpy,twd,participants,time){
  return {id,time:time||'2026-07-18T01:00:00.000Z',member,category:'餐飲',detail:id,amountJpy:jpy,amountTwd:twd,note:'',participants:JSON.stringify(participants),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:''};
}
const base=[
  registration('member-bar','Bar','2026-07-18T00:00:00.000Z'),
  registration('member-amy','小美','2026-07-18T00:01:00.000Z'),
  expense('dinner','小美',6000,1200,['Bar','小美'])
];
/* Bar owes 小美 3000 JPY / 600 TWD */

const pendingOnly=mod.deriveSettlements(base.concat([claim]),null,'formal');
assert.strictEqual(pendingOnly.pending.length,1,'a lone claim derives as pending');
assert.strictEqual(pendingOnly.confirmed.length,0);
assert.strictEqual(pendingOnly.pending[0].from,'Bar');
assert.strictEqual(pendingOnly.pending[0].to,'小美');
assert.strictEqual(pendingOnly.pending[0].amount,3000);
assert.strictEqual(pendingOnly.pending[0].currency,'JPY');

const confirmedSet=mod.deriveSettlements(base.concat([claim,confirm]),null,'formal');
assert.strictEqual(confirmedSet.confirmed.length,1,'claim plus confirm derives as confirmed');
assert.strictEqual(confirmedSet.pending.length,0);

const rejectedSet=mod.deriveSettlements(base.concat([claim,reject]),null,'formal');
assert.strictEqual(rejectedSet.rejected.length,1,'claim plus reject derives as rejected');
assert.strictEqual(rejectedSet.rejected[0].response.note,'未收到','the reject reason is exposed to the payer');

const racedSet=mod.deriveSettlements(base.concat([claim,confirm,reject]),null,'formal');
assert.strictEqual(racedSet.confirmed.length,1,'the earliest response wins a multi-device race');
assert.strictEqual(racedSet.rejected.length,0,'later conflicting responses are ignored');

const wrongResponder=Object.assign({},confirm,{id:'wrong-actor',member:'Bar'});
const wrongSet=mod.deriveSettlements(base.concat([claim,wrongResponder]),null,'formal');
assert.strictEqual(wrongSet.pending.length,1,'a response from a non-receiver is ignored');

const tombstone={id:'withdraw-1',time:'2026-07-19T00:00:00.000Z',member:'Bar',category:'其他',detail:'[刪除]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'deletion',targetRecordId:claim.id,deleteReason:'撤回結清',batchId:''};
const withdrawnSet=mod.deriveSettlements(base.concat([claim,tombstone]),null,'formal');
assert.strictEqual(withdrawnSet.entries.length,0,'a tombstoned claim leaves the handshake entirely');

const revokeTombstone={id:'revoke-1',time:'2026-07-19T01:00:00.000Z',member:'小美',category:'其他',detail:'[刪除]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'deletion',targetRecordId:confirm.id,deleteReason:'撤銷確認',batchId:''};
const revokedSet=mod.deriveSettlements(base.concat([claim,confirm,revokeTombstone]),null,'formal');
assert.strictEqual(revokedSet.pending.length,1,'revoking a confirm returns the claim to pending');

const testOnly=mod.deriveSettlements(base.concat([claim,testClaim]),null,'test');
assert.strictEqual(testOnly.entries.length,1,'the TEST universe only sees TEST claims');
assert.strictEqual(testOnly.entries[0].claim.id,testClaim.id);
const formalOnly=mod.deriveSettlements(base.concat([claim,testClaim]),null,'formal');
assert.strictEqual(formalOnly.entries.length,1,'the formal universe never sees TEST claims');
assert.strictEqual(formalOnly.entries[0].claim.id,claim.id);

const handshakeWarnings=[];
const invalidClaim=Object.assign({},claim,{id:'invalid-claim',participants:'[]'});
const orphanResponse=Object.assign({},confirm,{id:'orphan',targetRecordId:'missing'});
const invalidSet=mod.deriveSettlements(base.concat([invalidClaim,orphanResponse]),message=>handshakeWarnings.push(message),'formal');
assert.strictEqual(invalidSet.entries.length,0,'claims without a valid receiver snapshot are excluded');
assert(handshakeWarnings.length>=2,'invalid handshake records emit warnings');

/* ── balance integration ── */
const balances=mod.buildMemberBalances(base,null,null,'formal');
assert.strictEqual(plain(balances.members).find(item=>item.member==='Bar').netJpy,-3000,'before settlement Bar owes 3000');

const settledBalances=mod.applyConfirmedSettlements(balances,confirmedSet.confirmed);
const settledBar=plain(settledBalances.members).find(item=>item.member==='Bar');
const settledAmy=plain(settledBalances.members).find(item=>item.member==='小美');
assert.strictEqual(settledBar.netJpy,0,'a confirmed JPY settlement zeroes the payer net');
assert.strictEqual(settledAmy.netJpy,0,'a confirmed JPY settlement zeroes the receiver net');
assert.strictEqual(settledBar.netTwd,-600,'the reference currency stays untouched');
assert.strictEqual(plain(balances.members).find(item=>item.member==='Bar').netJpy,-3000,'applyConfirmedSettlements never mutates its input');

const pendingBalances=mod.applyConfirmedSettlements(balances,pendingOnly.pending.filter(()=>false));
assert.deepStrictEqual(plain(pendingBalances.members),plain(balances.members),'pending claims never move balances');

const twdConfirm=mod.createSettlementResponse('settlement_confirm',twdClaim,'小美','',false,1789000003000,()=>0.5);
const twdSet=mod.deriveSettlements(base.concat([twdClaim,twdConfirm]),null,'formal');
const twdBalances=mod.applyConfirmedSettlements(balances,twdSet.confirmed);
assert.strictEqual(plain(twdBalances.members).find(item=>item.member==='Bar').netTwd,0,'TWD settlements adjust netTwd');
assert.strictEqual(plain(twdBalances.members).find(item=>item.member==='Bar').netJpy,-3000,'TWD settlements leave netJpy untouched');

const ghostBalances=mod.applyConfirmedSettlements(balances,[{from:'Ghost',to:'小美',amount:100,currency:'JPY'}]);
assert.deepStrictEqual(plain(ghostBalances.members),plain(balances.members),'settlements between unknown members are skipped');

/* ── suggestions run on residual nets ── */
const residualSuggestions=mod.buildTransferSuggestions(settledBalances,'JPY');
assert.deepStrictEqual(plain(residualSuggestions),[],'a fully settled pair produces no further JPY suggestions');

/* honest re-open: new expense after settlement re-creates debt */
const newExpense=expense('day2-lunch','小美',2000,400,['Bar','小美'],'2026-07-20T01:00:00.000Z');
const reopened=mod.applyConfirmedSettlements(mod.buildMemberBalances(base.concat([newExpense]),null,null,'formal'),confirmedSet.confirmed);
assert.strictEqual(plain(reopened.members).find(item=>item.member==='Bar').netJpy,-1000,'new shared expenses honestly re-open the settled pair');

/* settlement records never leak into spending */
const spending=mod.spendLedgerRecords(base.concat([claim,confirm,reject]));
assert.deepStrictEqual(spending.map(record=>record.id),['dinner'],'handshake records are excluded from spending lists and totals');

/* ── UI wiring (source assertions, same pattern as ledger-settlement.test.js) ── */
const html=fs.readFileSync('index.html','utf8');
const settlementSource=html.slice(html.indexOf('function ledgerCurrentMemberSettlement('),html.indexOf('function showLedgerFullList('));
assert(settlementSource.includes('applyConfirmedSettlements(buildMemberBalances(records,null,null,universe)'),'the settlement view applies confirmed settlements before suggestions');
assert(settlementSource.includes('deriveSettlements(records,null,universe)'),'the settlement view derives the handshake from ledger records');
assert(settlementSource.includes('待處理結清'),'the panel renders the pending handshake section');
assert(settlementSource.includes('結清歷史'),'the panel renders the confirmed history section');
assert(settlementSource.includes('轉帳建議（參考）'),'the non-settlement currency stays reference-only');
assert(settlementSource.includes('ledgerMarkSettlementPaid'),'payers can mark a suggestion as paid');
assert(settlementSource.includes('ledgerConfirmSettlementClaim'),'receivers can confirm a claim');
assert(settlementSource.includes('ledgerRejectSettlementClaim'),'receivers can reject a claim');
assert(settlementSource.includes('ledgerWithdrawSettlementClaim'),'payers can withdraw a pending claim');
assert(settlementSource.includes('ledgerRevokeSettlementConfirm'),'receivers can revoke a confirmation');
assert(settlementSource.includes("createLedgerDeletion(entry.claim,me,'撤回結清')"),'withdrawal reuses the existing tombstone mechanism');
assert(settlementSource.includes('未收到')&&settlementSource.includes('金額不對')&&settlementSource.includes('重複'),'reject offers the approved one-tap reasons');
assert(settlementSource.includes('settlementActionGuard'),'every handshake action passes the member/time-simulation guard');
assert(!settlementSource.includes('owedJpy+='),'UI does not reimplement owed balances');
assert(!settlementSource.includes('paidJpy+='),'UI does not reimplement paid balances');

/* schema self-documentation */
assert(html.includes("'settlement_claim':'settlement_claim'"),'embedded schema documents settlement_claim');
assert(html.includes("'settlement_confirm':'settlement_confirm'"),'embedded schema documents settlement_confirm');
assert(html.includes("'settlement_reject':'settlement_reject'"),'embedded schema documents settlement_reject');
const schemaSource=fs.readFileSync('schema.js','utf8');
assert(schemaSource.includes("'settlement_claim':'settlement_claim'"),'authoritative schema documents settlement_claim');

console.log('ledger settlement handshake tests passed');
