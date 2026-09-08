const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const TripLedgerUiState=require('../ledger-ui-state.js');

const html=fs.readFileSync('shell/v112/index.html','utf8');

function extractFunction(name){
  const start=html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=html.indexOf('{',start),depth=0;
  for(;index<html.length;index++){
    if(html[index]==='{')depth++;
    else if(html[index]==='}')depth--;
    if(depth===0)return html.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}

const createSource=extractFunction('createLedgerEntryDraft');
const editSource=extractFunction('ledgerDraftFromRecords');
assert.match(createSource,/entryDetailsOpen:false/,'a new single entry starts with secondary fields collapsed');
assert.match(createSource,/participantsOpen:false/,'a new group entry starts with participant chips collapsed');
assert.match(editSource,/draft\.entryDetailsOpen=true/,'an existing entry opens its populated secondary fields for editing');
assert.match(editSource,/draft\.isProxy=firstMeta\.isProxy/,'editing restores the existing proxy flag');
assert.match(editSource,/draft\.proxyTarget=firstMeta\.proxyTarget/,'editing restores the existing proxy target');

const summarySource=extractFunction('renderLedgerSingleSummary');
const dateLabelSource=extractFunction('ledgerOptionalDateLabel');
const summaryTextSource=extractFunction('ledgerSingleSummaryText');
assert.match(summarySource,/其他資訊（選填）/,'the summary owns the approved optional-information title');
assert.match(summaryTextSource,/draft\.category/,'the compact summary includes category');
assert.match(summaryTextSource,/draft\.payMethod/,'the compact summary includes payment method');
assert.match(summaryTextSource,/draft\.occurredDate/,'the compact summary includes the date');
assert.match(summaryTextSource,/draft\.note/,'the compact summary exposes whether a note exists');
assert.match(summarySource,/toggleLedgerEntryDetails\(\)/,'clicking the summary opens the secondary fields');
assert.match(extractFunction('selectLedgerCategory'),/updateLedgerEntrySummary\(\)/,'category changes refresh the visible compact summary without collapsing it');
assert.match(extractFunction('selectLedgerPayMethod'),/updateLedgerEntrySummary\(\)/,'payment changes refresh the visible compact summary without collapsing it');
assert.doesNotMatch(extractFunction('selectLedgerCurrency'),/draft\.detail\s*=/,'currency switches never replace the current detail');
assert.doesNotMatch(extractFunction('selectLedgerCategory'),/draft\.detail\s*=/,'category switches never replace the current detail');
assert.doesNotMatch(extractFunction('selectLedgerPayMethod'),/draft\.detail\s*=/,'payment switches never replace the current detail');

const summarySandbox={
  String,Number,Date,
  parseLedgerDateInput(value){
    if(!/^\d{4}\/\d{2}\/\d{2}$/.test(value))throw new Error('bad date');
    return value;
  },
  appNow(){return new Date(2026,6,28);}
};
vm.createContext(summarySandbox);
vm.runInContext(dateLabelSource+'\n'+summaryTextSource,summarySandbox);
assert.strictEqual(summarySandbox.ledgerOptionalDateLabel('2026/07/28',new Date(2026,6,28)),'今天');
assert.strictEqual(summarySandbox.ledgerOptionalDateLabel('2026/10/18',new Date(2026,6,28)),'10/18');
assert.strictEqual(summarySandbox.ledgerOptionalDateLabel('2027/01/03',new Date(2026,6,28)),'2027/1/3');
assert.strictEqual(summarySandbox.ledgerOptionalDateLabel('無效日期',new Date(2026,6,28)),'無效日期');
assert.strictEqual(summarySandbox.ledgerSingleSummaryText({
  category:'餐飲',payMethod:'現金',occurredDate:'2026/07/28',note:''
}),'今天 · 餐飲 · 現金 · 無備註');
assert.strictEqual(summarySandbox.ledgerSingleSummaryText({
  category:'餐飲',payMethod:'現金',occurredDate:'2026/07/28',note:'公司餐敘'
}),'今天 · 餐飲 · 現金 · 有備註');

const secondarySource=extractFunction('renderLedgerSingleSecondaryFields');
assert.doesNotMatch(secondarySource,/renderLedgerSingleItemDetail/,'required detail no longer lives in the collapsed secondary disclosure');
['renderLedgerStoreField','renderLedgerOccurrenceFields','renderLedgerSingleItemCategory','renderLedgerPaymentFields','renderLedgerTaxFields','renderLedgerNoteField'].forEach(function(name){
  assert.match(secondarySource,new RegExp(name+'\\(draft'),'the secondary disclosure contains '+name);
});
assert.match(secondarySource,/draft\.entryDetailsOpen/,'secondary fields render only when their disclosure is open');
const basicInfoSource=extractFunction('renderLedgerSingleBasicInfo');
const primarySource=extractFunction('renderLedgerSingleItemPrimary');
assert.match(primarySource,/renderLedgerSingleItemDetail\(draft\)/,'amount and detail share the primary group');
assert.doesNotMatch(basicInfoSource,/renderLedgerSingleItemDetail\(draft\)/,'detail is not rendered again outside the primary group');
assert.doesNotMatch(basicInfoSource,/renderLedgerSingleSecondaryFields/,'primary information does not own optional fields');
const trackSpecificSource=extractFunction('renderLedgerTrackSpecificFields');
assert.match(trackSpecificSource,/這筆是代購/,'the approved proxy Toggle stays in the shared track renderer');
assert.match(trackSpecificSource,/id="ledgerProxy"/,'the proxy Toggle has one stable focus target');
assert.match(trackSpecificSource,/draft\.isProxy\?renderLedgerProxySection/,'proxy targets only render while the Toggle is on');
assert.match(trackSpecificSource,/draft\.multi\?renderLedgerParticipantGroup\('分攤成員'/,'multi-item shared entries keep the existing participant renderer');
assert.match(trackSpecificSource,/renderLedgerParticipantSummary\(draft\)/,'single shared entries use the compact participant summary');
const participantSummarySource=extractFunction('renderLedgerParticipantSummary');
assert.match(participantSummarySource,/id="ledgerParticipantsToggle"/,'the compact participant control has one stable keyboard target');
assert.match(participantSummarySource,/aria-controls="ledgerParticipantFields"/,'the compact participant control owns its expanded region');
assert.match(participantSummarySource,/draft\.participantsOpen/,'the participant region follows session-only draft state');
const participantTextSandbox={
  registeredMembersForCurrentMode(){return [{key:'bar',name:'Bar'},{key:'jane',name:'Jane'}];},
  canonicalMemberName(value){return String(value||'').trim().toLowerCase();},
  String
};
vm.createContext(participantTextSandbox);
vm.runInContext(extractFunction('ledgerParticipantSummaryText'),participantTextSandbox);
assert.strictEqual(participantTextSandbox.ledgerParticipantSummaryText(['Bar','Jane']),'全員 2 人','exactly every registered member uses the all-members summary');
assert.strictEqual(participantTextSandbox.ledgerParticipantSummaryText(['Bar','Jane','已移除成員']),'已選 3 人','a retained stale member never produces a misleading all-members count');
const singleEntryRenderSource=extractFunction('renderLedgerEntrySheet');
assert.match(
  singleEntryRenderSource,
  /renderLedgerSingleBasicInfo\(draft\)\+renderLedgerTrackSpecificFields\(draft\)\+renderLedgerSingleSecondaryFields\(draft\)/,
  'single entries render amount/detail, ownership controls, then optional information'
);
assert.match(html,/\.ledger-single-primary \.ledger-sheet-input\{[^}]*width:100%[^}]*max-width:100%[^}]*box-sizing:border-box/,'required inputs share full content width');
assert.match(html,/\.ledger-single-primary \.ledger-amount-wrap \.ledger-sheet-input\{[^}]*min-height:62px/,'only amount retains the tall amount height');
assert.doesNotMatch(html,/\.ledger-single-primary \.ledger-sheet-input\{[^}]*min-height:62px/,'detail does not inherit the amount height');
assert.match(
  html,
  /\.ledger-entry-secondary\{[^}]*display:flow-root/,
  'expanded optional information contains the first field margin instead of exposing a gap below the summary'
);
assert.match(html,/\.ledger-single-primary \.ledger-sheet-field\+\.ledger-sheet-field\{[^}]*margin-top:10px/,'required fields use the approved gap without a divider');

assert.match(html,/id="ledgerAmount"[^>]*type="number"[^>]*inputmode="numeric"/,'the approved amount input type and inputmode remain unchanged');
assert.match(html,/id="ledgerAmount"[^>]*enterkeyhint="next"[^>]*onkeydown="handleLedgerAmountNext\(event\)"/,'the amount keyboard advances through one shared Next handler');
assert.match(html,/id="ledgerDetail"[^>]*enterkeyhint="next"[^>]*onkeydown="handleLedgerDetailNext\(event\)"/,'detail advances to the ownership decision instead of saving');
assert.match(html,/\.ledger-sheet #ledgerAmount\{[^}]*font-size:30px!important/,'the primary amount is visually prominent without weakening the global 16px floor');

const amountNextSource=extractFunction('handleLedgerAmountNext');
const detailNextSource=extractFunction('handleLedgerDetailNext');
const inlineErrorSource=extractFunction('showLedgerInlineFieldError');
assert.doesNotMatch(amountNextSource,/saveLedgerEntry/,'amount Next never submits the entry');
assert.doesNotMatch(detailNextSource,/saveLedgerEntry/,'detail Next never submits the entry');
let saves=0,prevented=0,detailFocuses=0,amountFocuses=0,proxyFocuses=0,participantFocuses=0;
let inlineError=null;
const amountField={querySelector(){return inlineError;},appendChild(node){inlineError=node;}};
const amountWrap={classList:{contains(name){return name==='ledger-amount-wrap';}},parentNode:amountField};
const amountInput={value:'3500',classList:{add(name){amountInput.invalidClass=name;}},setAttribute(name,value){amountInput[name]=value;},parentNode:amountWrap,focus(){amountFocuses++;}};
const detailInput={focus(){detailFocuses++;}};
const proxyInput={focus(){proxyFocuses++;}};
const participantButton={focus(){participantFocuses++;}};
const doneSandbox={
  ledgerUiState:{draft:{amount:'3500',track:'personal',formErrors:{}}},
  ledgerItemAmountIsValid(item){return /^\d+$/.test(String(item.amount))&&Number(item.amount)>0;},
  document:{
    getElementById(id){
      return id==='ledgerAmount'?amountInput:
        id==='ledgerDetail'?detailInput:
        id==='ledgerProxy'?proxyInput:
        id==='ledgerParticipantsToggle'?participantButton:null;
    },
    querySelector(){return null;},
    createElement(){return {className:'',textContent:''};}
  },
  saveLedgerEntry(addAnother){assert.strictEqual(addAnother,false);saves++;},
  Object,String,Number,Promise
};
vm.createContext(doneSandbox);
vm.runInContext(inlineErrorSource+'\n'+amountNextSource+'\n'+detailNextSource,doneSandbox);
doneSandbox.handleLedgerAmountNext({key:'Enter',isComposing:false,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerAmountNext({key:'Tab',isComposing:false,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerAmountNext({key:'Enter',isComposing:true,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailNext({key:'Enter',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.ledgerUiState.draft.track='shared';
doneSandbox.handleLedgerDetailNext({key:'Enter',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailNext({key:'Tab',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailNext({key:'Enter',isComposing:true,preventDefault(){prevented++;}});
assert.strictEqual(detailFocuses,1,'valid amount Enter focuses detail exactly once');
assert.strictEqual(amountFocuses,0,'valid amount Enter does not return to amount');
assert.strictEqual(proxyFocuses,1,'personal detail Next focuses the proxy Toggle exactly once');
assert.strictEqual(participantFocuses,1,'shared detail Next focuses the first participant exactly once');
assert.strictEqual(saves,0,'detail Next never saves');
assert.strictEqual(prevented,3,'only handled non-composing Enter keys suppress native behavior');
amountInput.value='0';
doneSandbox.handleLedgerAmountNext({key:'Enter',isComposing:false,currentTarget:amountInput,preventDefault(){prevented++;}});
assert.strictEqual(amountFocuses,1,'invalid amount Enter preserves focus on the amount input');
assert.strictEqual(detailFocuses,1,'invalid amount Enter never advances to detail');
assert.strictEqual(doneSandbox.ledgerUiState.draft.formErrors.amount,'請輸入有效金額','invalid amount uses the existing inline validation message');
assert.strictEqual(amountInput.invalidClass,'ledger-field-invalid','invalid amount marks the mounted input without rerendering the sheet');
assert.strictEqual(amountInput['aria-invalid'],'true','invalid amount exposes its state to assistive technology');
assert.strictEqual(inlineError.textContent,'請輸入有效金額','invalid amount inserts the existing inline error beside the mounted field');
assert.doesNotMatch(amountNextSource,/renderLedgerEntrySheet/,'invalid amount keeps the mounted input and numeric keyboard intact');

const validationSource=extractFunction('validateLedgerEntryDraft');
assert.match(validationSource,/!draft\.multi[\s\S]*errors\.amount/,'single-entry validation reports an invalid amount before persistence');
assert.match(validationSource,/!draft\.multi[\s\S]*errors\.detail/,'single-entry validation reports a missing detail before persistence');
const saveSource=extractFunction('saveLedgerEntry');
assert.doesNotMatch(saveSource,/validation\.firstField==='detail'[\s\S]{0,120}draft\.entryDetailsOpen=true/,'detail validation never opens optional secondary fields');
const focusSource=extractFunction('focusLedgerValidationError');
assert.match(focusSource,/ledgerAmount/,'invalid amount returns focus to the amount input');
assert.match(focusSource,/ledgerDetail/,'invalid detail returns focus to the always-visible detail input');

assert.match(html,/\.ledger-single-primary/,'single entry has a dedicated primary amount surface');
assert.match(html,/\.ledger-entry-summary/,'single entry has a compact summary disclosure');
assert.match(html,/\.ledger-sheet-actions \.ledger-save-another-quiet\{[^}]*min-height:44px[^}]*border:1px solid color-mix\(in srgb,var\(--sea\) 34%,var\(--line\)\)[^}]*background:color-mix\(in srgb,var\(--sea\) 14%,var\(--card\)\)/,'save-and-add-another keeps its touch target and derives its secondary surface from the active theme');
assert.match(html,/\.ledger-sheet-actions\{[^}]*position:sticky[^}]*env\(safe-area-inset-bottom\)/,'the save actions remain sticky and safe-area aware above the keyboard');

assert.match(createSource,/multiBillDetailsOpen:false/,'a new multi-item bill starts with its repeated bill settings collapsed');
assert.match(editSource,/draft\.multiBillDetailsOpen=!!draft\.multi/,'editing a multi-item bill opens its populated bill settings');
const multiBillSource=extractFunction('renderLedgerMultiBillInfo');
assert(multiBillSource.indexOf('renderLedgerStoreField(draft,true)')<multiBillSource.indexOf('renderLedgerMultiSummary(draft)'),'required store is the first visible multi-item bill field');
assert.match(multiBillSource,/draft\.multiBillDetailsOpen/,'date, payment, and default category are hidden behind the multi-item summary');
const multiSummaryText=extractFunction('ledgerMultiSummaryText');
assert.match(multiSummaryText,/draft\.occurredDate/,'multi-item summary includes date');
assert.match(multiSummaryText,/draft\.payMethod/,'multi-item summary includes payment method');
assert.match(multiSummaryText,/draft\.categoryApply/,'multi-item summary includes the default category');

const setMultiSource=extractFunction('setLedgerDraftMulti');
assert.match(setMultiSource,/name:draft\.detail,amount:draft\.amount/,'switching from single item copies detail and amount into the first row');
assert.match(setMultiSource,/focusLedgerMultiFirstRequired/,'switching to multi-item immediately focuses the first required field');
assert.match(extractFunction('addLedgerDraftItem'),/focusLedgerItemField/,'adding an item focuses its new name field');
assert.match(html,/id="ledgerStoreName"[^>]*enterkeyhint="next"[^>]*handleLedgerStoreDone/,'required store advances through the multi-item keyboard flow');
assert.match(html,/id="ledgerItemName_[^>]*enterkeyhint="next"[^>]*handleLedgerItemNameDone/,'item names advance to their amount fields');
assert.match(html,/id="ledgerItemAmount_[^>]*enterkeyhint="[^"]+"[^>]*handleLedgerItemAmountDone/,'item amounts advance to the next name or finish the keyboard flow');

const amountDoneSource=extractFunction('handleLedgerItemAmountDone');
assert.doesNotMatch(amountDoneSource,/saveLedgerEntry/,'the last multi-item amount Done action never submits the bill');
const itemNodes={
  ledgerItemName_second:{focus(){itemNodes.focused='second-name';}},
  ledgerItemAmount_first:{blur(){itemNodes.blurred='first-amount';}}
};
const amountDoneSandbox={
  ledgerUiState:{draft:{items:[{key:'first'},{key:'second'}]}},
  document:{getElementById(id){return itemNodes[id]||null;}},
  focusLedgerItemField(key,field){const node=itemNodes[(field==='amount'?'ledgerItemAmount_':'ledgerItemName_')+key];if(node)node.focus();},
  String
};
vm.createContext(amountDoneSandbox);
vm.runInContext(amountDoneSource,amountDoneSandbox);
amountDoneSandbox.handleLedgerItemAmountDone({key:'Enter',preventDefault(){}},'first');
assert.strictEqual(itemNodes.focused,'second-name','an item amount advances to the next item name');
amountDoneSandbox.handleLedgerItemAmountDone({key:'Enter',preventDefault(){},target:itemNodes.ledgerItemAmount_first},'second');
assert.strictEqual(itemNodes.blurred,'first-amount','the last item amount only blurs to dismiss the keyboard');

const previewSource=extractFunction('updateLedgerMultiPreview');
assert.match(previewSource,/ledgerValidItemCount\(draft\)/,'the sticky total uses the established valid-item count');
assert.match(previewSource,/整單實付/,'the sticky total names the full bill amount');
assert.match(previewSource,/≈/,'the sticky total shows the converted currency');
const entryRenderSource=extractFunction('renderLedgerEntrySheet');
assert.match(entryRenderSource,/ledger-multi-total[\s\S]*id="ledgerBillPreview"/,'the multi-item total is rendered inside the sticky action area');
assert.match(entryRenderSource,/draft\.multi\?renderLedgerTaxDisclosure\(draft\)\+renderLedgerDetailsDisclosure\(draft\):''/,'only multi-item entries keep standalone tax and note disclosures');
assert.match(entryRenderSource,/ledger-save-another-quiet/,'single create keeps the existing save-another action with reduced visual emphasis');

assert.strictEqual(TripLedgerUiState.createState().savePending,false,'canonical Ledger UI state owns one transient save-in-flight guard');
const saveEntrySource=extractFunction('saveLedgerEntry');
assert.match(saveEntrySource,/if\(ledgerUiState\.savePending\)return Promise\.resolve\(\{ok:false,pending:true\}\)/,'repeat taps and keyboard Done events are ignored while a save is pending');
assert.match(saveEntrySource,/type:'entry-validation-failed'/,'invalid create/edit drafts return through the state workflow');
assert.match(saveEntrySource,/type:'entry-save-requested'/,'the save guard is raised through the state workflow before confirmation or persistence');
const pendingSource=extractFunction('syncLedgerSavePendingButtons');
assert.match(pendingSource,/button-spinner/,'pending save buttons expose the existing spinner');
assert.match(pendingSource,/button\.disabled=ledgerUiState\.savePending/,'both save buttons follow the same disabled state');
const commitSource=extractFunction('commitLedgerEntrySave');
const finishSaveSource=extractFunction('finishLedgerEntrySaveUi');
const failSaveSource=extractFunction('failLedgerEntrySaveUi');
assert.match(finishSaveSource,/type:'entry-save-succeeded'/,'successful saves release the transient guard through a semantic result action');
assert.match(failSaveSource,/type:'entry-save-failed'/,'failed saves release the transient guard through a semantic result action');
assert.match(commitSource,/finishLedgerEntrySaveUi\(command,result\)/,'generic Ledger success delegates to the shared UI finish boundary');
assert.match(commitSource,/failLedgerEntrySaveUi\(command,error\)/,'generic Ledger failure delegates to the shared UI failure boundary');

assert.match(
  html,
  /\.ledger-participant-choice\.on\{[^}]*background:#d6e8e4[^}]*color:var\(--sea-deep\)/,
  'selected participant choices use a distinct medium teal background with deep text'
);

console.log('ledger entry P0 tests passed');
