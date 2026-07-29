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
  const end=source.indexOf('/* ================= 分帳(雲端 Ledger)',start);
  assert(start>=0&&end>start,'ledger helper section exists');
  const warnings=[];
  const sandbox={
    console:{log(){},warn(message){warnings.push(String(message));},error(){}},
    localStorage:createStorage(),
    fetch(){return Promise.reject(new Error('network disabled'));},
    setTimeout,clearTimeout,Date,Math,Promise,JSON,String,Number,isFinite,
    timestampDate(value){return new Date(Number(value));},
    AppLog:{repo(){},sync(){}},
    renderSplit(){},
    updateLedgerPendingStatus(){}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  sandbox.__warnings=warnings;
  return sandbox;
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const mod=loadModule();

assert.strictEqual(
  mod.isLedgerCorrectionItemRecord({recordType:'expense_correction_item'}),
  true,
  'removing the correction-item predicate would let raw item events leak into ordinary expenses'
);
assert.strictEqual(
  mod.isLedgerCorrectionCommitRecord({recordType:'expense_correction_commit'}),
  true,
  'normal correction commits have an explicit record type'
);
assert.strictEqual(
  mod.isLedgerVoidCommitRecord({recordType:'expense_void_commit'}),
  true,
  'void corrections remain distinguishable from incomplete normal corrections'
);
assert.strictEqual(
  mod.isLedgerCorrectionRecord({recordType:'expense'}),
  false,
  'ordinary expenses are not correction transport events'
);
assert.deepStrictEqual(
  plain(mod.ledgerCreationPosition({id:'1784428800000-0001'})),
  {createdAt:1784428800000,id:'1784428800000-0001'},
  'receipt protection derives creation order from the client-created ID rather than occurrence time'
);
assert.strictEqual(
  mod.ledgerCreationPosition({id:'legacy-id'}),
  null,
  'unparseable legacy IDs are surfaced for fail-closed protection'
);

function expense(id,detail,options){
  const opts=options||{};
  return {
    id,
    time:opts.time||'2026-07-18T10:00:00.000Z',
    member:opts.member||'Bar',
    category:'餐飲',
    detail:(opts.test?'[TEST] ':'')+detail,
    amountJpy:opts.amountJpy===undefined?900:opts.amountJpy,
    amountTwd:opts.amountTwd===undefined?180:opts.amountTwd,
    note:opts.note||'',
    participants:JSON.stringify(opts.participants||['Bar','Amy','Cara']),
    payMethod:'現金',
    recordType:'expense',
    targetRecordId:'',
    deleteReason:'',
    batchId:opts.batchId||'',
    storeName:opts.storeName||'食堂',
    replacesRecordId:'',
    inputCurrency:'JPY',
    isTaxFree:false,
    priceMode:'included',
    taxRate:10,
    couponAmount:0
  };
}

function correctionItem(id,commitId,rootId,detail,options){
  const item=expense(id,detail,options);
  item.recordType='expense_correction_item';
  item.targetRecordId=commitId;
  item.batchId=commitId;
  item.replacesRecordId=rootId;
  return item;
}

function correctionCommit(id,previousId,rootId,itemIds,options){
  const opts=options||{},test=opts.test?'[TEST] ':'';
  return {
    id,
    time:opts.time||'2026-07-29T10:00:00.000Z',
    member:opts.member||'Bar',
    category:'其他',
    detail:test+'[更正收據]',
    amountJpy:0,
    amountTwd:0,
    note:opts.reason||'金額輸入錯誤',
    participants:JSON.stringify(itemIds),
    payMethod:'',
    recordType:'expense_correction_commit',
    targetRecordId:previousId,
    deleteReason:'',
    batchId:id,
    storeName:'',
    replacesRecordId:rootId,
    inputCurrency:'',
    isTaxFree:false,
    priceMode:'',
    taxRate:null,
    couponAmount:0
  };
}

function voidCommit(id,previousId,rootId,options){
  const record=correctionCommit(id,previousId,rootId,[],options);
  record.recordType='expense_void_commit';
  record.detail=(options&&options.test?'[TEST] ':'')+'[作廢收據]';
  return record;
}

const root='1784428800000-0001';
const v1CommitId='1784428810001-0001';
const v1Item=correctionItem('1784428810000-0001',v1CommitId,root,'晚餐（更正一）',{amountJpy:600});
const v1Commit=correctionCommit(v1CommitId,root,root,[v1Item.id],{time:'2026-07-29T10:00:00.000Z'});
const losingCommitId='1784428810002-0001';
const losingItem=correctionItem('1784428810002-0000',losingCommitId,root,'晚餐（衝突）',{amountJpy:300});
const losingCommit=correctionCommit(losingCommitId,root,root,[losingItem.id],{time:'2026-07-29T10:00:01.000Z'});
const v2CommitId='1784428820001-0001';
const v2Item=correctionItem('1784428820000-0001',v2CommitId,root,'晚餐（更正二）',{
  amountJpy:750,
  time:'2026-07-17T08:30:00.000Z'
});
const v2Commit=correctionCommit(v2CommitId,v1CommitId,root,[v2Item.id],{time:'2026-07-29T10:02:00.000Z'});
const orphanItem=correctionItem('1784428830000-0001','1784428830001-0001',root,'沒有 commit',{amountJpy:1});
const raw=[
  expense(root,'晚餐'),
  v1Item,v1Commit,
  losingItem,losingCommit,
  v2Item,v2Commit,
  orphanItem
];
const warnings=[];
const projection=mod.deriveLedgerCorrectionProjection(raw,message=>warnings.push(String(message)));
const currentExpenses=plain(projection.records.filter(record=>record.recordType==='expense'));
assert.deepStrictEqual(
  currentExpenses.map(record=>record.detail),
  ['晚餐（更正二）'],
  'latest canonical correction snapshot is the only expense visible to downstream balance consumers'
);
assert.strictEqual(
  currentExpenses[0].time,
  '2026-07-17T08:30:00.000Z',
  'corrected expense occurrence time survives projection and is not replaced by commit time'
);
assert.strictEqual(projection.receipts.length,1,'one logical receipt remains one projected receipt');
assert.strictEqual(projection.receipts[0].versionCount,2,'only canonical corrections count as applied versions');
assert.strictEqual(projection.receipts[0].protected,true,'a receipt with a correction chain stays permanently protected');
assert.strictEqual(projection.receipts[0].voided,false,'a normal latest version is not voided');
assert.strictEqual(projection.conflicts.length,1,'the losing sibling is preserved as one conflict');
assert.strictEqual(projection.conflicts[0].anchorId,losingCommitId,'conflict diagnostics identify the inert commit');
assert(!projection.records.some(record=>record.recordType==='expense_correction_item'),'raw correction items never leak into effective records');
assert(!projection.records.some(record=>record.id===orphanItem.id),'an item without a commit is inert');

const permuted=mod.deriveLedgerCorrectionProjection([
  v2Commit,losingCommit,orphanItem,v1Item,expense(root,'晚餐'),v2Item,v1Commit,losingItem
]);
assert.deepStrictEqual(
  plain(permuted.records.filter(record=>record.recordType==='expense').map(record=>record.id)),
  currentExpenses.map(record=>record.id),
  'canonical projection converges regardless of raw input order'
);

const voidRoot='1784428900000-0001';
const voidId='1784428910000-0001';
const voidProjection=mod.deriveLedgerCorrectionProjection([
  expense(voidRoot,'不存在的消費'),
  voidCommit(voidId,voidRoot,voidRoot,{reason:'並未消費'})
]);
assert.strictEqual(
  voidProjection.records.filter(record=>record.recordType==='expense').length,
  0,
  'a canonical void version removes the receipt from current expense totals'
);
assert.strictEqual(voidProjection.receipts[0].voided,true,'void remains visible in receipt history metadata');
assert.strictEqual(voidProjection.receipts[0].versionCount,1,'void counts as a canonical correction version');

const malformedRoot='1784429000000-0001';
const malformedCommitId='1784429010000-0001';
const malformedProjection=mod.deriveLedgerCorrectionProjection([
  expense(malformedRoot,'保留原始版本'),
  correctionCommit(malformedCommitId,malformedRoot,malformedRoot,['1784429010001-miss'])
]);
assert.deepStrictEqual(
  plain(malformedProjection.records.filter(record=>record.recordType==='expense').map(record=>record.id)),
  [malformedRoot],
  'a commit whose manifest item is missing fails closed and leaves the prior version current'
);
assert(warnings.length>=1,'incomplete or losing correction data emits diagnostics');

function settlementClaim(id,test){
  return {
    id,
    time:'2026-07-29T12:00:00.000Z',
    member:'Amy',
    category:'其他',
    detail:(test?'[TEST] ':'')+'[結清] Amy → Bar',
    amountJpy:300,
    amountTwd:0,
    note:'',
    participants:'["Bar"]',
    payMethod:'',
    recordType:'settlement_claim',
    targetRecordId:'',
    deleteReason:'',
    batchId:'',
    storeName:'',
    replacesRecordId:'',
    inputCurrency:'JPY',
    isTaxFree:false,
    priceMode:'',
    taxRate:null,
    couponAmount:0
  };
}

function settlementConfirm(id,claimId,test){
  return {
    id,
    time:'2026-07-29T12:01:00.000Z',
    member:'Bar',
    category:'其他',
    detail:(test?'[TEST] ':'')+'[結清確認]',
    amountJpy:0,
    amountTwd:0,
    note:'',
    participants:'',
    payMethod:'',
    recordType:'settlement_confirm',
    targetRecordId:claimId,
    deleteReason:'',
    batchId:'',
    storeName:'',
    replacesRecordId:'',
    inputCurrency:'',
    isTaxFree:false,
    priceMode:'',
    taxRate:null,
    couponAmount:0
  };
}

const beforeId='1784429100000-0001';
const claimId='1784429200000-0001';
const confirmId='1784429300000-0001';
const afterId='1784429400000-0001';
const cutoffRecords=[
  expense(beforeId,'未來日期但建立較早',{time:'2026-08-05T10:00:00.000Z'}),
  expense(afterId,'補登舊日期但建立較晚',{time:'2026-07-01T10:00:00.000Z'}),
  settlementClaim(claimId,false),
  settlementConfirm(confirmId,claimId,false)
];
assert.strictEqual(
  mod.ledgerReceiptForRecord(cutoffRecords,beforeId).protected,
  true,
  'a future-dated receipt created before the confirmed claim is protected'
);
assert.strictEqual(
  mod.ledgerReceiptForRecord(cutoffRecords,afterId).protected,
  false,
  'a backdated receipt created after the claim remains directly editable until a later repayment'
);

const batchBefore=expense('1784429101000-0001','同批早項',{batchId:'batch-cutoff'});
const batchAfter=expense('1784429401000-0001','同批晚項',{batchId:'batch-cutoff'});
const protectedBatch=mod.ledgerReceiptForRecord(
  [batchBefore,batchAfter,settlementClaim(claimId,false),settlementConfirm(confirmId,claimId,false)],
  batchAfter.id
);
assert.strictEqual(protectedBatch.protected,true,'one pre-cutoff item protects the whole multi-item receipt');
assert.strictEqual(protectedBatch.records.length,2,'protection does not split a multi-item receipt');

const formalOnly=cutoffRecords.concat([expense('1784429102000-0001','測試消費',{test:true})]);
assert.strictEqual(
  mod.ledgerReceiptForRecord(formalOnly,'1784429102000-0001').protected,
  false,
  'a formal repayment confirmation never protects TEST receipts'
);
const testClaimId='1784429202000-0001';
const testConfirmId='1784429302000-0001';
const testProtected=formalOnly.concat([
  settlementClaim(testClaimId,true),
  settlementConfirm(testConfirmId,testClaimId,true)
]);
assert.strictEqual(
  mod.ledgerReceiptForRecord(testProtected,'1784429102000-0001').protected,
  true,
  'TEST repayment confirmation protects only the TEST universe'
);

const legacyExpense=expense('legacy-expense-id','舊格式 ID');
assert.strictEqual(
  mod.ledgerReceiptForRecord(
    [legacyExpense,settlementClaim(claimId,false),settlementConfirm(confirmId,claimId,false)],
    legacyExpense.id
  ).protected,
  true,
  'an unparseable receipt creation ID fails closed after any confirmed repayment in its universe'
);

const revokedConfirm={
  id:'1784429350000-0001',
  time:'2026-07-29T12:01:05.000Z',
  member:'Bar',
  category:'其他',
  detail:'[刪除]',
  amountJpy:0,
  amountTwd:0,
  note:'',
  participants:'',
  payMethod:'',
  recordType:'deletion',
  targetRecordId:confirmId,
  deleteReason:'復原收款確認',
  batchId:''
};
assert.strictEqual(
  mod.ledgerReceiptForRecord(
    [expense(beforeId,'確認已復原'),settlementClaim(claimId,false),settlementConfirm(confirmId,claimId,false),revokedConfirm],
    beforeId
  ).protected,
  false,
  'a successfully revoked confirm no longer supplies cutoff protection when no correction chain exists'
);
assert.strictEqual(
  mod.ledgerReceiptForRecord(raw,root).protected,
  true,
  'an existing correction chain remains protected independently of later confirm revocation'
);

const protectedReceipt=mod.ledgerReceiptForRecord(cutoffRecords,beforeId);
const protectedRecord=protectedReceipt.records[0];
const replacementA=Object.assign({},protectedRecord,{
  id:'draft-a',
  detail:'晚餐 A',
  amountJpy:500,
  amountTwd:100,
  participants:'["Bar","Amy"]'
});
const replacementB=Object.assign({},protectedRecord,{
  id:'draft-b',
  detail:'晚餐 B',
  amountJpy:250,
  amountTwd:50,
  participants:'["Bar","Cara"]'
});
assert.strictEqual(
  mod.canEditLedgerRecord(protectedRecord,'Bar'),
  false,
  'removing the protected predicate from edit permissions would reopen confirmed history'
);
assert.strictEqual(
  mod.canDeleteLedgerRecord(protectedRecord,'Bar'),
  false,
  'protected receipts cannot be tombstoned even by their original payer'
);
assert.throws(
  ()=>mod.buildSharedLedgerEditBatch(
    [cutoffRecords[0]],
    [replacementA],
    {member:'Bar',now:1784430000000,random(){return 0.2;},records:cutoffRecords}
  ),
  /還款確認.*更正收據/,
  'direct builder calls cannot bypass protected receipt editing'
);
assert.throws(
  ()=>mod.createLedgerDeletion(
    cutoffRecords[0],
    'Bar',
    '嘗試刪除',
    1784430000000,
    ()=>0.2,
    cutoffRecords
  ),
  /還款確認.*更正收據/,
  'direct deletion construction cannot bypass protected receipt deletion'
);

const builtCorrection=plain(mod.buildLedgerCorrectionBatch(
  protectedReceipt,
  [replacementA,replacementB],
  {
    member:'Bar',
    reason:'金額輸入錯誤',
    now:1784430100000,
    random(){return 0.25;},
    records:cutoffRecords
  }
));
assert.deepStrictEqual(
  builtCorrection.map(record=>record.recordType),
  ['expense_correction_item','expense_correction_item','expense_correction_commit'],
  'normal correction queues all item snapshots before the visibility commit'
);
assert.deepStrictEqual(
  JSON.parse(builtCorrection[2].participants),
  builtCorrection.slice(0,2).map(record=>record.id),
  'commit manifest lists every item exactly once in display order'
);
assert.strictEqual(builtCorrection[2].targetRecordId,protectedReceipt.anchorId,'commit targets the latest canonical version');
assert.strictEqual(builtCorrection[2].replacesRecordId,protectedReceipt.rootId,'every version preserves the root receipt identity');
assert(builtCorrection.slice(0,2).every(record=>record.targetRecordId===builtCorrection[2].id),'items forward-reference the final commit');
assert(builtCorrection.slice(0,2).every(record=>record.batchId===builtCorrection[2].id),'items share the correction version ID');
assert(builtCorrection.every(record=>record.member===protectedReceipt.owner),'all correction events preserve the exact original payer');
assert.strictEqual(builtCorrection[0].time,replacementA.time,'item occurrence time is preserved independently from submission order');

const builtVoid=plain(mod.buildLedgerVoidCorrection(protectedReceipt,{
  member:'Bar',
  reason:'這筆消費並未發生',
  now:1784430200000,
  random(){return 0.3;},
  records:cutoffRecords
}));
assert.strictEqual(builtVoid.length,1,'whole-receipt void is one explicit commit');
assert.strictEqual(builtVoid[0].recordType,'expense_void_commit');
assert.strictEqual(builtVoid[0].participants,'[]','void is distinguishable from a missing normal manifest');
assert.strictEqual(builtVoid[0].targetRecordId,protectedReceipt.anchorId);

assert.throws(
  ()=>mod.buildLedgerCorrectionBatch(protectedReceipt,[replacementA],{
    member:'Amy',reason:'未授權',now:1784430300000,random(){return 0.4;},records:cutoffRecords
  }),
  /只有原付款人/,
  'a non-payer cannot append a correction'
);
assert.throws(
  ()=>mod.buildLedgerCorrectionBatch(protectedReceipt,[Object.assign({},replacementA,{member:'Amy'})],{
    member:'Bar',reason:'付款人變更',now:1784430400000,random(){return 0.5;},records:cutoffRecords
  }),
  /付款人不可變更/,
  'a correction draft cannot change the payer'
);
assert.throws(
  ()=>mod.buildLedgerCorrectionBatch(protectedReceipt,[replacementA],{
    member:'Bar',reason:'',now:1784430500000,random(){return 0.6;},records:cutoffRecords
  }),
  /更正原因必填/,
  'normal correction requires an audit reason'
);
assert.throws(
  ()=>mod.buildLedgerVoidCorrection(protectedReceipt,{
    member:'Bar',reason:'超'.repeat(51),now:1784430600000,random(){return 0.7;},records:cutoffRecords
  }),
  /最多 50/,
  'void reason obeys the same 50-character boundary'
);

const testReceipt=mod.ledgerReceiptForRecord(testProtected,'1784429102000-0001');
const testBuilt=plain(mod.buildLedgerCorrectionBatch(
  testReceipt,
  [Object.assign({},testReceipt.records[0],{detail:'測試更正'})],
  {member:'Bar',reason:'測試修正',now:1784430700000,random(){return 0.8;},records:testProtected}
));
assert(testBuilt.every(record=>/^\[TEST\]/.test(record.detail)),'TEST corrections remain entirely inside the TEST universe');

console.log('ledger settlement correction tests passed');
