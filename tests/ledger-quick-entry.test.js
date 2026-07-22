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
  assert.strictEqual((sheetSource.match(/preventDefault\(\)/g)||[]).length,1,'the only preventDefault path is the amount keyboard Done handler, not a touch gesture interceptor');
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

const helperSource=extract('function ledgerClientCreatedAt(','function buildMemberBalances(');
const helperRecords=[
  {id:'1784428800000-abcd',member:'Amy',category:'Food',inputCurrency:'JPY',amountJpy:500,amountTwd:105},
  {id:'1784428889000-efgh',member:' Amy ',category:'Food',inputCurrency:'JPY',amountJpy:500,amountTwd:105}
];
const helperSandbox={
  personalLedgerRepository:{all(){return helperRecords.slice();},remove(id){const index=helperRecords.findIndex(record=>record.id===id);if(index<0)return false;helperRecords.splice(index,1);return true;}},
  canonicalMemberName(value){return String(value==null?'':value).replace(/\u3000/g,' ').replace(/\s+/g,' ').trim();},
  isDeletionRecord(record){return !!record&&record.recordType==='deletion';},
  isIdentityRegistrationRecord(record){return !!record&&record.recordType==='identity_registration';},
  isTestLedgerRecord(record){return /^\[TEST\]/.test(String(record&&record.detail||''));},
  formatLedgerCurrencyAmount(currency,amount){return currency==='TWD'?'NT$'+Math.round(Number(amount||0)).toLocaleString():'¥'+Math.round(Number(amount||0)).toLocaleString();},
  JSON,String,Number,Math,Date,isFinite
};
vm.createContext(helperSandbox);
vm.runInContext(helperSource,helperSandbox);
assert.strictEqual(helperSandbox.ledgerClientCreatedAt({id:'1784428800000-abcd'}),1784428800000,'client-created IDs expose their millisecond timestamp');
assert.strictEqual(helperSandbox.ledgerClientCreatedAt({id:'not-a-client-id'}),null,'non-client IDs do not fabricate a timestamp');
const duplicateCandidate={id:'1784428890000-ijkl',member:'Amy',category:'Food',inputCurrency:'JPY',amountJpy:500,amountTwd:105};
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,helperRecords,{track:'personal'}).id,helperRecords[0].id,'same personal identity, currency, amount, category, and timestamp window is a possible duplicate');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(Object.assign({},duplicateCandidate,{batchId:'batch-1'}),helperRecords,{track:'personal'}),null,'batches are excluded from duplicate hints');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,helperRecords,{track:'personal',editing:true}),null,'edit saves are excluded from duplicate hints');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,helperRecords,{track:'personal',addAnother:true}),null,'explicit add-another saves are excluded from duplicate hints');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(Object.assign({},duplicateCandidate,{amountJpy:501}),helperRecords,{track:'personal'}),null,'different primary amounts are not duplicates');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(Object.assign({},duplicateCandidate,{id:'1784428891001-ijkl'}),[{id:'1784428800000-abcd',member:'Amy',category:'Food',inputCurrency:'JPY',amountJpy:500,amountTwd:105,recordType:'deletion'}],{track:'personal'}),null,'deletions are excluded from duplicate hints');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(Object.assign({},duplicateCandidate,{id:'1784428891001-ijkl'}),[{id:'1784428800000-abcd',member:'Amy',category:'Food',inputCurrency:'JPY',amountJpy:500,amountTwd:105,recordType:'identity_registration'}],{track:'personal'}),null,'identity records are excluded from duplicate hints');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,helperRecords,{track:'shared',testMode:false}).id,helperRecords[0].id,'the same creator identity, category, primary amount, currency, and 90-second window are also strict shared duplicates');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,[Object.assign({},helperRecords[0],{detail:'[TEST] Food'})],{track:'shared',testMode:false}),null,'a TEST record is outside the formal shared duplicate scope');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,[Object.assign({},helperRecords[0],{detail:'[TEST] Food'})],{track:'shared',testMode:true}).id,helperRecords[0].id,'a raw prepared TEST-mode record matches the queued TEST record after the unchanged queue adds its prefix');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(duplicateCandidate,helperRecords,{track:'shared',testMode:true}),null,'a TEST-mode candidate never matches a formal shared record');
assert.strictEqual(helperSandbox.ledgerPotentialDuplicate(Object.assign({},duplicateCandidate,{member:'amy'}),helperRecords,{track:'shared',testMode:false}),null,'shared duplicate identity keeps the existing case-sensitive member semantics');
assert.strictEqual(helperSandbox.formatLedgerPrimaryTotal('JPY',[{amountJpy:1234},{amountJpy:66}]),'¥1,300','JPY totals format the JPY primary amount');
assert.strictEqual(helperSandbox.formatLedgerPrimaryTotal('TWD',[{amountTwd:1234},{amountTwd:66}]),'NT$1,300','TWD totals format the TWD primary amount');
const savedSnapshots=helperRecords.map(record=>JSON.parse(JSON.stringify(record)));
assert.strictEqual(helperSandbox.undoPersonalLedgerSave(savedSnapshots),true,'unchanged personal save snapshots are truly removed');
assert.strictEqual(helperRecords.length,0,'successful undo removes the current local records');
helperRecords.push(Object.assign({},savedSnapshots[0],{detail:'edited'}));
assert.strictEqual(helperSandbox.undoPersonalLedgerSave([savedSnapshots[0]]),false,'edited snapshots refuse undo');
assert.strictEqual(helperRecords.length,1,'a refused undo keeps the edited personal record');

const saveFlowSource=extract('function commitLedgerEntrySave(','function deletePersonalLedgerRecord(');
const saveButtons={ledgerSave:{disabled:false},ledgerSaveAnother:{disabled:false}};
const saveMessages=[],preparedIds=[],submittedIds=[],duplicateLookupIds=[];
let buildCalls=0,enqueueCalls=0,closeCalls=0,renderCalls=0,confirmationResolve=null;
const preparedSharedRecord={id:'1784512809000-new1',member:'Bar',category:'餐飲',detail:'Dinner',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''};
const saveSandbox={
  ledgerUiState:{track:'personal',draft:{track:'shared',currency:'JPY',multi:false},editing:null},
  isTimeSimulationActive(){return false;},memberIsAllowed(){return true;},getCurrentMember(){return 'Bar';},openMemberSelector(){throw new Error('shared member is available');},
  validateLedgerEntryDraft(){return {valid:true,errors:{}};},
  buildLedgerExpenseRecords(){buildCalls++;preparedIds.push(preparedSharedRecord.id);return [preparedSharedRecord];},
  currentLedgerSettings(){return {};},registeredMembersForCurrentMode(){return [];},
  ledgerUniverseMode(){return 'test';},
  mergedLedgerRecords(){return [
    {id:'1784512800000-shared',member:'Bar',category:'餐飲',detail:'[TEST] Dinner',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''}
  ];},spendLedgerRecords(records){return records;},ledgerUniverseRecords(records,mode){return mode==='test'?records.filter(function(record){return /^\[TEST\]/.test(record.detail);}):[];},sortLedgerExpenses(records){return records;},
  personalLedgerRepository:{all(){return [{id:'1784512800000-personal',member:'Bar',category:'餐飲',detail:'Dinner',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''}];},add(){throw new Error('personal persistence must not run for shared records');}},
  ledgerPotentialDuplicate(candidate,records){duplicateLookupIds.push(records.map(function(record){return record.id;}));return records[0]||null;},
  confirmSharedLedgerDuplicate(){return new Promise(function(resolve){confirmationResolve=resolve;});},
  persistLedgerExpenseRecords(records,track){enqueueCalls++;submittedIds.push(records.map(function(record){return record.id;}));return Promise.resolve({ok:true,queued:true,records:records,pending:1});},
  persistLedgerEditedRecords(){throw new Error('editing path is not under test');},
  formatLedgerPrimaryTotal(currency,records){return currency==='TWD'?'NT$'+records[0].amountTwd:'¥'+records[0].amountJpy;},
  renderSplit(){renderCalls++;},closeLedgerEntrySheet(){closeCalls++;},resetLedgerDraftAfterSave(){throw new Error('add another is not under test');},
  undoPersonalLedgerSave(){throw new Error('personal undo must remain nonblocking and untouched');},toast(message){saveMessages.push(message);},
  document:{getElementById(id){return saveButtons[id]||null;}},navigator:{onLine:true},
  Date,Math,Promise,JSON,String,Number,isFinite
};
vm.createContext(saveSandbox);
vm.runInContext(saveFlowSource,saveSandbox);
(async function(){
  const cancelledSave=saveSandbox.saveLedgerEntry(false);
  assert.strictEqual(buildCalls,1,'the shared candidate is prepared exactly once before confirmation');
  assert.deepStrictEqual(duplicateLookupIds[0],['1784512800000-shared'],'a shared draft opened from the personal page inspects only the current TEST shared universe');
  assert.strictEqual(enqueueCalls,0,'shared duplicate confirmation makes zero enqueue calls before approval');
  confirmationResolve(false);
  const cancelledResult=await cancelledSave;
  assert.strictEqual(cancelledResult.ok,false,'cancel reports no save success');
  assert.strictEqual(cancelledResult.cancelled,true,'cancel reports cancellation instead of a false success');
  assert.strictEqual(enqueueCalls,0,'cancel leaves the prepared record out of the queue');
  assert.strictEqual(closeCalls,0,'cancel keeps the entry sheet and its data available');
  assert.strictEqual(renderCalls,0,'cancel does not render a success state');
  assert.deepStrictEqual(saveMessages,[],'cancel does not display a saved Toast');

  const approvedSave=saveSandbox.saveLedgerEntry(false);
  assert.strictEqual(buildCalls,2,'a new submit prepares one new record set');
  assert.strictEqual(enqueueCalls,0,'the second confirmation also waits before enqueueing');
  confirmationResolve(true);
  await approvedSave;
  assert.strictEqual(buildCalls,2,'approval commits the prepared records without rebuilding their IDs');
  assert.strictEqual(enqueueCalls,1,'approval performs exactly one shared enqueue');
  assert.deepStrictEqual(submittedIds[0],preparedIds.slice(1),'the approved enqueue uses the exact prepared IDs');
  assert.match(saveMessages.pop(),/^已儲存 ¥500 · 餐飲，將自動同步$/,'online shared save uses the automatic-sync Toast copy');

  saveSandbox.navigator.onLine=false;
  await saveSandbox.commitLedgerEntrySave(saveSandbox.ledgerUiState.draft,null,[preparedSharedRecord],false,null);
  assert.match(saveMessages.pop(),/^尚未同步，連線恢復後將自動重試$/,'known offline shared save uses the retry Toast copy');
})().catch(function(error){console.error(error);process.exitCode=1;});
