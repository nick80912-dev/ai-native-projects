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

const draftSource=extract('function ledgerLocalDateFromParts(','function openLedgerEntrySheet(');
const draftSandbox={
  appNow(){return new Date();},
  timestampDate(value){return new Date(Number(value));},
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
assert.strictEqual(personal.storeName,'','store name defaults empty');
assert(/^\d{4}\/\d{2}\/\d{2}$/.test(personal.occurredDate),'occurrence date defaults to a local date');
assert(/^\d{2}:\d{2}$/.test(personal.occurredTime),'occurrence time defaults to the current local time');

const localDate=draftSandbox.ledgerDateInputValue(new Date(2026,9,18,12,34,0));
const localTime=draftSandbox.ledgerTimeInputValue(new Date(2026,9,18,12,34,0));
assert.strictEqual(localDate,'2026/10/18');
assert.strictEqual(localTime,'12:34');
assert.strictEqual(new Date(draftSandbox.ledgerOccurrenceIso(localDate,localTime)).getTime(),new Date(2026,9,18,12,34,0).getTime(),'separate local inputs round-trip through ISO');
assert.throws(function(){draftSandbox.ledgerOccurrenceIso('not-a-date','12:00');},/日期格式/,'invalid occurrence date is rejected');

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
  appNow(){return new Date();},
  timestampDate(value){return new Date(Number(value));},
  ledgerDefaultCategory(){return '餐飲';},
  ledgerDateInputValue(){return '2026/07/19';},ledgerTimeInputValue(){return '12:00';},
  withLedgerSheetPosition(renderFn){return renderFn();},
  currentLedgerSettings(){return {exchangeRate:0.2,defaultCurrency:'JPY'};},
  registeredMembersForCurrentMode(){return [{name:'Bar',key:'bar'},{name:'Amy',key:'amy'}];},
  ledgerCategoryStore:{all(){return ['餐飲','交通'];}},
  ledgerPayMethodStore:{all(){return ['現金','Suica'];}},
  document:{getElementById(){return null;},querySelector(){return null;},addEventListener(){},activeElement:null,body:{classList:{add(){},remove(){}}}},
  requestAnimationFrame(callback){callback();},
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
let personalAdds=0,sharedEnqueues=0;
const persistSandbox={
  normalizePersonalLedgerRecord(record){return Object.assign({},record);},
  validateLedgerRecord(){return true;},validateProxyDraft(flag,target){return flag?target:'';},
  personalLedgerRepository:{add(record){personalAdds++;return record;}},
  ledgerRepository:{enqueueBatch(records){sharedEnqueues++;return {ok:true,queued:true,records,pending:records.length};},pendingCount(){return 0;}},
  Date,Math,Promise,JSON,String,Number,isFinite
};
vm.createContext(persistSandbox);
vm.runInContext(persistSource,persistSandbox);

(async function(){
  const personalResult=await persistSandbox.persistLedgerExpenseRecords([{id:'p1',time:'2026-07-18T08:00:00.000Z',isProxy:false,proxyTarget:''}],'personal');
  assert.strictEqual(personalResult.personal,true);
  assert.strictEqual(personalAdds,1);
  assert.strictEqual(sharedEnqueues,0,'personal saves never call the shared repository');

  const sharedResult=await persistSandbox.persistLedgerExpenseRecords([{id:'s1'},{id:'s2'}],'shared');
  assert.strictEqual(sharedEnqueues,1,'all shared items use one atomic queue operation');
  assert.strictEqual(sharedResult.records.length,2);
  assert.strictEqual(sharedResult.queued,true,'shared persistence resolves from local queue acknowledgement');
  assert.strictEqual(personalAdds,1,'shared saves never call the personal repository');

  const sheetSource=extract('var ledgerBackgroundScrollY=0;','function formatLedgerCurrencyAmount(');
  const builderSource=extract('function buildLedgerExpenseRecords(','function buildMemberBalances(');
  assert(sheetSource.includes("document.body.classList.add('ledger-sheet-open')"),'opening sheet locks background scrolling');
  assert(sheetSource.includes("document.body.classList.remove('ledger-sheet-open')"),'closing sheet restores background scrolling');
  assert(sheetSource.includes('id="ledgerEntryTitle"'));
  assert(sheetSource.includes('id="ledgerMulti"'));
  assert(sheetSource.includes('id="ledgerAmount"'));
  assert(sheetSource.includes('id="ledgerConvertedPreview"'));
  assert(sheetSource.includes('ledger-amount-wrap'),'amount and conversion share one compact wrapper');
  assert(sheetSource.includes('id="ledgerStoreName"'),'entry sheet includes structured store name');
  assert(sheetSource.includes('id="ledgerOccurredDate"')&&sheetSource.includes('id="ledgerOccurredTime"'),'entry sheet includes separate editable occurrence date and time');
  assert(sheetSource.indexOf('ledger-sheet-member')<sheetSource.indexOf('id="ledgerMulti"'),'identity appears immediately below the sheet heading');
  assert(builderSource.includes('ledgerOccurrenceIso(draft.occurredDate,draft.occurredTime)'),'record time comes from the separate occurrence fields');
  assert(builderSource.includes("storeName:String(draft.storeName||'').trim()"),'record builder writes structured storeName');
  assert(sheetSource.includes('id="ledgerSave"'));
  assert(sheetSource.includes('id="ledgerSaveAnother"'));
  assert(sheetSource.includes('沿用上一筆：'));
  assert(sheetSource.includes('function addLedgerDraftItem('));
  assert(sheetSource.includes('function updateLedgerDraftItem('));
  assert(sheetSource.includes('function renderLedgerMultiItemFields('));
  assert(!sheetSource.includes('單項設定 ·'),'retired per-item override hint is absent');
  assert(!sheetSource.includes('沿用整單'),'retired inheritance hint is absent');
  assert(sheetSource.includes('税込（含稅）'));
  assert(sheetSource.includes('税抜（未稅）'));
  assert(sheetSource.includes('全部免稅品'));
  assert(sheetSource.includes('固定折扣金額')&&sheetSource.includes('優惠券金額'));
  assert(!sheetSource.includes('多品項將於本批下一階段啟用'),'multi-item toggle is fully functional');
  assert(!/addEventListener\(['"](?:touchstart|touchmove|gesturestart)/.test(sheetSource),'sheet adds no JavaScript gesture interceptor');
  assert(!sheetSource.includes('preventDefault()'),'sheet adds no preventDefault gesture path');
  assert(sheetSource.includes("result.queued?'已儲存，待同步':'已儲存'"),'shared optimistic save reports pending background delivery');
  assert(sheetSource.includes('ledgerBackgroundScrollY=window.scrollY'),'opening captures the background scroll position');
  assert(sheetSource.includes('sheet.scrollTop=0'),'new sheets start at the top');
  assert(sheetSource.includes('window.scrollTo({top:ledgerBackgroundScrollY'),'closing restores the background scroll position');
  assert(sheetSource.includes('function withLedgerSheetPosition('),'structural rerenders preserve internal sheet position');

  assert(/\.ledger-sheet\{[^}]*overflow-y:auto[^}]*touch-action:pan-y/.test(html),'sheet scroll surface is pan-y only');
  assert(/\.ledger-sheet button[^}]*touch-action:manipulation/.test(html),'sheet controls use scoped manipulation');
  assert(/body\.ledger-sheet-open\{[^}]*overflow:hidden/.test(html),'sheet CSS locks the background');

  console.log('ledger quick-entry tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
