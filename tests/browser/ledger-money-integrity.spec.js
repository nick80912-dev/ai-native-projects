/* 分帳金額完整性(v135)
   ============================================================
   2026-09-24 分帳邏輯稽核查到、並於 v135 修正的行為,用真實 App 的函式守住:
     1. 編輯／更正一張帳、什麼都不改就存,總額不得改變。
        v134 以前,税抜 的多品項帳每編輯一次就再加一次稅(¥1650 → ¥1815 → ¥1997),
        團體帳的更正流程也一樣。成因:載入的品項金額已含稅,卻沿用原紀錄的 税抜。
     2. 結算幣別(= Ledger Default Currency,ADR 0007)有任何還款紀錄後即鎖定。
        否則改幣別後,用舊幣別確認的還款不會換算,已還清的人會重新被要求付款。
     3. 分帳頁:自己在團體還有未結清時,本次開 App 第一次進來先開「團體」。
   稽核時也檢查過「個人帳代購不依身分過濾」—— 那是 2026-07-18 起的刻意設計
   (ledger-proxy.test.js 守著),重新確認後保留,本檔不涉入。
   ============================================================ */
const {test,expect}=require('./support/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const NOW='2026-10-19T12:00:00+09:00';

async function boot(page,member){
  const errors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await page.addInitScript(name=>{
    localStorage.removeItem('trip_ledger_track');
    if(name)localStorage.setItem('trip_member',name);
  },member||'');
  await openApp(page);
  await waitForSyncToSettle(page);
  return errors;
}

test('editing or correcting a bill without changes never changes its total',async({page})=>{
  const errors=await boot(page,'Bar');
  const result=await page.evaluate(()=>{
    let seed=20260924;
    const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
    const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
    const settings=currentLedgerSettings(),cat=ledgerCategoryStore.all()[0],pay=ledgerPayMethodStore.all()[0];
    const ctx=n=>({now:Date.parse('2026-10-19T03:00:00Z')+n,member:'Bar',settings,random:()=>0.5});
    const sum=rs=>rs.reduce((s,x)=>s+x.amountJpy+x.amountTwd,0);
    const r={editCases:0,editTotalChanged:0,primaryItemChanged:0,correctionTotalChanged:0,singleCases:0,singleChanged:0,errors:0};
    for(let i=0;i<1500;i++){
      const multi=rnd()<0.75,cur=rnd()<0.8?'JPY':'TWD',preset=['none','8','10','custom'][ri(0,3)];
      const d={track:'personal',isProxy:false,proxyTarget:'',currency:cur,category:cat,payMethod:pay,note:'',storeName:'店',
        occurredDate:'2026/10/19',occurredTime:'12:00',priceMode:rnd()<0.5?'included':'excluded',taxPreset:preset,
        customTaxRate:preset==='custom'?String(ri(1,150)/10):'',discount:String(rnd()<0.35?ri(1,300):0)};
      if(multi){d.multi=true;d.items=[];for(let k=0,n=ri(1,5);k<n;k++)d.items.push({key:'k'+k,name:'品'+k,amount:String(ri(50,20000)),category:cat,taxExempt:rnd()<0.25,proxyMode:'inherit',participantMode:'inherit'});}
      else{d.multi=false;d.detail='單';d.amount=String(ri(50,20000));}
      try{
        const r1=buildLedgerExpenseRecords(d,ctx(i)),r2=buildLedgerExpenseRecords(ledgerDraftFromRecords(r1,'personal'),ctx(i));
        const prim=cur==='JPY'?'amountJpy':'amountTwd';
        if(multi){
          r.editCases++;
          if(sum(r1)!==sum(r2))r.editTotalChanged++;
          if(r1.some((x,j)=>x[prim]!==r2[j][prim]))r.primaryItemChanged++;
          r1.forEach(x=>{x.participants=JSON.stringify(['Bar','Amy']);});
          const c=calculateMultiItemAmounts(ledgerCorrectionDraftFromReceipt({records:r1,rootId:r1[0].id}),settings);
          if(c.items.reduce((s,x)=>s+x.amountJpy+x.amountTwd,0)!==sum(r1))r.correctionTotalChanged++;
        }else{
          r.singleCases++;
          if(sum(r1)!==sum(r2))r.singleChanged++;
        }
      }catch(error){r.errors++;}
    }
    return r;
  });
  expect(result.errors).toBe(0);
  expect(result.editCases).toBeGreaterThan(1000);
  expect(result.singleCases).toBeGreaterThan(300);
  expect(result.editTotalChanged).toBe(0);
  expect(result.primaryItemChanged).toBe(0);
  expect(result.correctionTotalChanged).toBe(0);
  expect(result.singleChanged).toBe(0);
  expect(errors).toEqual([]);
});

test('a 税抜 bill opens for editing as 税込 with its final amounts and says why',async({page})=>{
  const errors=await boot(page,'Bar');
  const result=await page.evaluate(()=>{
    const cat=ledgerCategoryStore.all()[0],pay=ledgerPayMethodStore.all()[0];
    const records=buildLedgerExpenseRecords({track:'personal',isProxy:false,proxyTarget:'',currency:'JPY',category:cat,payMethod:pay,note:'',storeName:'店',
      occurredDate:'2026/10/19',occurredTime:'12:00',priceMode:'excluded',taxPreset:'10',discount:'0',multi:true,
      items:[{key:'a',name:'A',amount:'1000',category:cat,taxExempt:false,proxyMode:'inherit',participantMode:'inherit'},
             {key:'b',name:'B',amount:'500',category:cat,taxExempt:false,proxyMode:'inherit',participantMode:'inherit'}]},
      {now:Date.now(),member:'Bar',settings:currentLedgerSettings(),random:()=>0.5});
    const draft=ledgerDraftFromRecords(records,'personal');
    const html=renderLedgerTaxFields(draft);
    const single=renderLedgerTaxFields(createLedgerEntryDraft('personal'));
    return {stored:records.map(r=>r.amountJpy),priceMode:draft.priceMode,sourcePriceMode:draft.sourcePriceMode,
      items:draft.items.map(i=>Number(i.amount)),explains:html.includes('原紀錄為税抜'),singleRecordOnly:single.includes('只做記錄，不會加稅')};
  });
  expect(result.stored).toEqual([1100,550]);
  expect(result.priceMode).toBe('included');
  expect(result.sourcePriceMode).toBe('excluded');
  expect(result.items).toEqual([1100,550]);
  expect(result.explains).toBe(true);
  expect(result.singleRecordOnly).toBe(true);
  expect(errors).toEqual([]);
});

function sharedExpense(id,payer,participants,amountJpy){
  return {id,time:'2026-10-19T01:00:00.000Z',member:payer,category:'餐飲',detail:'晚餐',amountJpy,amountTwd:Math.round(amountJpy*0.21),
    note:'',participants:JSON.stringify(participants),payMethod:'現金',recordType:'expense',targetRecordId:'',deleteReason:'',batchId:'',
    storeName:'',replacesRecordId:'',inputCurrency:'JPY',isTaxFree:'FALSE',priceMode:'included',taxRate:'10',couponAmount:'0'};
}

test('the settlement currency locks once any repayment record exists, before reaching the network',async({page})=>{
  const errors=await boot(page,'Bar');
  const expense=sharedExpense('e1','Amy',['Amy','Bar'],4000);
  const result=await page.evaluate(async expenseRecord=>{
    const out={};
    DB.ledger=[expenseRecord];
    out.lockedWithoutRepayment=ledgerSettlementCurrencyLocked();
    DB.ledger=[expenseRecord,{id:'c1',time:'2026-10-19T02:00:00.000Z',member:'Bar',category:'其他',detail:'[還款]',amountJpy:2000,amountTwd:0,
      note:'',participants:'',payMethod:'',recordType:'settlement_claim',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',
      replacesRecordId:'',inputCurrency:'JPY',isTaxFree:'FALSE',priceMode:'',taxRate:'0',couponAmount:'0'}];
    out.lockedWithRepayment=ledgerSettlementCurrencyLocked();
    out.lockedCurrency=ledgerLockedSettlementCurrency();
    let posted=false;const original=window.postLedgerSettings;
    window.postLedgerSettings=()=>{posted=true;return Promise.reject(new Error('stub'));};
    try{await saveLedgerSettings({exchangeRate:0.21,defaultCurrency:'TWD'});out.save='resolved';}catch(error){out.save=error.message;}
    out.postedForOtherCurrency=posted;
    window.postLedgerSettings=original;
    const page=renderSettingsLedgerPage({exchangeRate:0.21,defaultCurrency:'JPY'},'');
    out.twdDisabled=/data-currency="TWD" disabled/.test(page);
    out.jpyDisabled=/data-currency="JPY" disabled/.test(page);
    out.explainsLock=page.includes('結算幣別已鎖定');
    out.label=page.includes('<b>結算幣別</b>');
    return out;
  },expense);
  expect(result.lockedWithoutRepayment).toBe(false);
  expect(result.lockedWithRepayment).toBe(true);
  expect(result.lockedCurrency).toBe('JPY');
  expect(result.save).toContain('結算幣別已鎖定');
  expect(result.postedForOtherCurrency).toBe(false);
  expect(result.twdDisabled).toBe(true);
  expect(result.jpyDisabled).toBe(false);
  expect(result.explainsLock).toBe(true);
  expect(result.label).toBe(true);
  expect(errors).toEqual([]);
});

function registration(id,member){
  return {id,time:'2026-10-18T01:00:00.000Z',member,category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',
    payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:'',storeName:'',replacesRecordId:'',
    inputCurrency:'',isTaxFree:'FALSE',priceMode:'',taxRate:'0',couponAmount:'0'};
}

test('the ledger opens on the group tab when the member still owes or is owed',async({page})=>{
  const errors=await boot(page,'Bar');
  /* 身分要先註冊過,否則 switchView('split') 會先要求選身分而提早返回 */
  const records=[registration('r-amy','Amy'),registration('r-bar','Bar'),sharedExpense('e2','Amy',['Amy','Bar'],4000)];
  const result=await page.evaluate(ledgerRecords=>{
    DB.ledger=ledgerRecords;
    const before=ledgerUiState.track;
    switchView('split');
    return {before,after:ledgerUiState.track,preferred:preferredLedgerTrack()};
  },records);
  expect(result.before).toBe('personal');
  expect(result.after).toBe('shared');
  expect(errors).toEqual([]);
});

test('the ledger remembers the last tab when nothing is owed',async({page})=>{
  const errors=await boot(page,'Bar');
  const result=await page.evaluate(()=>{
    DB.ledger=[];
    const first=preferredLedgerTrack();
    setLedgerTrack('shared');
    const stored=localStorage.getItem('trip_ledger_track');
    return {first,stored,remembered:preferredLedgerTrack()};
  });
  expect(result.first).toBe('personal');
  expect(result.stored).toBe('"shared"');
  expect(result.remembered).toBe('shared');
  expect(errors).toEqual([]);
});
