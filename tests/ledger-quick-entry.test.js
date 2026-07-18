const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');

function extract(startText,endText){
  const start=html.indexOf(startText),end=html.indexOf(endText,start);
  assert(start>=0&&end>start,startText+' source exists');
  return html.slice(start,end);
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const draftSource=extract('function createLedgerEntryDraft(','function openLedgerEntrySheet(');
const draftSandbox={
  currentLedgerSettings(){return {exchangeRate:0.2,defaultCurrency:'JPY'};},
  registeredMembersForCurrentMode(){return [{name:'Bar'},{name:'Amy'}];},
  ledgerCategoryStore:{all(){return ['餐飲','交通'];}},
  ledgerPayMethodStore:{all(){return ['現金','Suica'];}},
  JSON,String,Number,Math,Date
};
vm.createContext(draftSandbox);
vm.runInContext(draftSource,draftSandbox);

const personal=plain(draftSandbox.createLedgerEntryDraft('personal'));
assert.strictEqual(personal.track,'personal');
assert.deepStrictEqual(personal.participants,[]);
assert.strictEqual(personal.multi,false);
assert.strictEqual(personal.currency,'JPY');
assert.strictEqual(personal.category,'餐飲');
assert.strictEqual(personal.payMethod,'現金');

const shared=plain(draftSandbox.createLedgerEntryDraft('shared'));
assert.deepStrictEqual(shared.participants,['Bar','Amy'],'shared entry defaults to all currently allowed registered members');
assert.strictEqual(shared.participantsRetained,false);

const resetShared=plain(draftSandbox.resetLedgerDraftAfterSave({
  track:'shared',currency:'TWD',category:'交通',payMethod:'Suica',amount:'900',detail:'晚餐',note:'二樓',
  participants:['Bar','Amy'],isProxy:false,proxyTarget:'',multi:false
}));
assert.strictEqual(resetShared.track,'shared');
assert.strictEqual(resetShared.currency,'TWD');
assert.strictEqual(resetShared.category,'交通');
assert.strictEqual(resetShared.payMethod,'Suica');
assert.deepStrictEqual(resetShared.participants,['Bar','Amy']);
assert.strictEqual(resetShared.participantsRetained,true);
assert.strictEqual(resetShared.amount,'');
assert.strictEqual(resetShared.detail,'');
assert.strictEqual(resetShared.note,'');

const resetPersonal=plain(draftSandbox.resetLedgerDraftAfterSave({
  track:'personal',currency:'JPY',category:'餐飲',payMethod:'現金',amount:'500',detail:'商品',note:'',
  participants:[],isProxy:true,proxyTarget:'小明',multi:false
}));
assert.strictEqual(resetPersonal.isProxy,false,'save-and-add-another uses the safe non-proxy default');
assert.strictEqual(resetPersonal.proxyTarget,'','proxy target never carries into the next personal record');

const stateSource=extract('function createLedgerEntryDraft(','function formatLedgerCurrencyAmount(');
const stateSandbox={
  ledgerUiState:{draft:null},
  currentLedgerSettings(){return {exchangeRate:0.2,defaultCurrency:'JPY'};},
  registeredMembersForCurrentMode(){return [{name:'Bar',key:'bar'},{name:'Amy',key:'amy'}];},
  ledgerCategoryStore:{all(){return ['餐飲','交通'];}},
  ledgerPayMethodStore:{all(){return ['現金','Suica'];}},
  document:{getElementById(){return null;},body:{classList:{add(){},remove(){}}}},
  confirm(){return true;},toast(){},canonicalMemberName(value){return String(value).trim().toLowerCase();},
  escapeHtml(value){return String(value);},jsString(value){return String(value);},getCurrentMember(){return 'Bar';},
  Date,Math,Promise,JSON,String,Number,isFinite
};
vm.createContext(stateSandbox);
vm.runInContext(stateSource,stateSandbox);
stateSandbox.ledgerUiState.draft=stateSandbox.createLedgerEntryDraft('personal');
stateSandbox.setLedgerDraftMulti(true);
assert.strictEqual(stateSandbox.ledgerUiState.draft.items.length,1);
const firstKey=stateSandbox.ledgerUiState.draft.items[0].key;
const firstBefore=stateSandbox.ledgerUiState.draft.items[0];
stateSandbox.addLedgerDraftItem();
assert.strictEqual(stateSandbox.ledgerUiState.draft.items.length,2);
stateSandbox.updateLedgerDraftItem(firstKey,{category:'交通',proxyMode:'custom',isProxy:true,proxyTarget:'小明'});
assert.strictEqual(stateSandbox.ledgerUiState.draft.items[0].category,'交通');
assert.strictEqual(stateSandbox.ledgerUiState.draft.items[0].proxyTarget,'小明');
assert.notStrictEqual(stateSandbox.ledgerUiState.draft.items[0],firstBefore,'item updates replace the row instead of mutating it in place');
assert.notStrictEqual(stateSandbox.ledgerUiState.draft.items[0],stateSandbox.ledgerUiState.draft.items[1]);

const persistSource=extract('function persistLedgerExpenseRecords(','function saveLedgerEntry(');
let personalAdds=0,sharedAdds=0,releaseShared;
const sharedGate=new Promise(resolve=>{releaseShared=resolve;});
const persistSandbox={
  normalizePersonalLedgerRecord(record){return Object.assign({},record);},
  validateLedgerRecord(){return true;},validateProxyDraft(flag,target){return flag?target:'';},
  personalLedgerRepository:{add(record){personalAdds++;return record;}},
  ledgerRepository:{add(record){sharedAdds++;return sharedGate.then(()=>({ok:true,record}));},pendingCount(){return 0;}},
  Date,Math,Promise,JSON,String,Number,isFinite
};
vm.createContext(persistSandbox);
vm.runInContext(persistSource,persistSandbox);

(async function(){
  const personalResult=await persistSandbox.persistLedgerExpenseRecords([{id:'p1',time:'2026-07-18T08:00:00.000Z',isProxy:false,proxyTarget:''}],'personal');
  assert.strictEqual(personalResult.personal,true);
  assert.strictEqual(personalAdds,1);
  assert.strictEqual(sharedAdds,0,'personal saves never call the shared repository');

  const sharedPromise=persistSandbox.persistLedgerExpenseRecords([{id:'s1'},{id:'s2'}],'shared');
  assert.strictEqual(sharedAdds,2,'all shared items enter the repository before awaiting network delivery');
  releaseShared();
  const sharedResult=await sharedPromise;
  assert.strictEqual(sharedResult.records.length,2);
  assert.strictEqual(sharedAdds,2);
  assert.strictEqual(personalAdds,1,'shared saves never call the personal repository');

  const sheetSource=extract('function openLedgerEntrySheet(','function formatLedgerCurrencyAmount(');
  assert(sheetSource.includes("document.body.classList.add('ledger-sheet-open')"),'opening sheet locks background scrolling');
  assert(sheetSource.includes("document.body.classList.remove('ledger-sheet-open')"),'closing sheet restores background scrolling');
  assert(sheetSource.includes('id="ledgerEntryTitle"'));
  assert(sheetSource.includes('id="ledgerMulti"'));
  assert(sheetSource.includes('id="ledgerAmount"'));
  assert(sheetSource.includes('id="ledgerConvertedPreview"'));
  assert(sheetSource.includes('id="ledgerSave"'));
  assert(sheetSource.includes('id="ledgerSaveAnother"'));
  assert(sheetSource.includes('沿用上一筆：'));
  assert(sheetSource.includes('function addLedgerDraftItem('));
  assert(sheetSource.includes('function updateLedgerDraftItem('));
  assert(sheetSource.includes('function renderLedgerMultiItemFields('));
  assert(sheetSource.includes('單項設定'));
  assert(sheetSource.includes('沿用整單'));
  assert(sheetSource.includes('税込'));
  assert(sheetSource.includes('税抜'));
  assert(sheetSource.includes('免稅'));
  assert(sheetSource.includes('固定折扣'));
  assert(!sheetSource.includes('多品項將於本批下一階段啟用'),'multi-item toggle is fully functional');
  assert(!/addEventListener\(['"](?:touchstart|touchmove|gesturestart)/.test(sheetSource),'sheet adds no JavaScript gesture interceptor');
  assert(!sheetSource.includes('preventDefault()'),'sheet adds no preventDefault gesture path');

  assert(/\.ledger-sheet\{[^}]*overflow-y:auto[^}]*touch-action:pan-y/.test(html),'sheet scroll surface is pan-y only');
  assert(/\.ledger-sheet button[^}]*touch-action:manipulation/.test(html),'sheet controls use scoped manipulation');
  assert(/body\.ledger-sheet-open\{[^}]*overflow:hidden/.test(html),'sheet CSS locks the background');

  console.log('ledger quick-entry tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
