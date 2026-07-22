const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');

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
assert.match(editSource,/draft\.entryDetailsOpen=true/,'an existing entry opens its populated secondary fields for editing');

const summarySource=extractFunction('renderLedgerSingleSummary');
const summaryTextSource=extractFunction('ledgerSingleSummaryText');
assert.match(summaryTextSource,/draft\.category/,'the compact summary includes category');
assert.match(summaryTextSource,/draft\.payMethod/,'the compact summary includes payment method');
assert.match(summaryTextSource,/draft\.occurredDate/,'the compact summary includes the date');
assert.match(summarySource,/toggleLedgerEntryDetails\(\)/,'clicking the summary opens the secondary fields');
assert.match(extractFunction('selectLedgerCategory'),/updateLedgerEntrySummary\(\)/,'category changes refresh the visible compact summary without collapsing it');
assert.match(extractFunction('selectLedgerPayMethod'),/updateLedgerEntrySummary\(\)/,'payment changes refresh the visible compact summary without collapsing it');
assert.match(extractFunction('setLedgerDraftTrack'),/next\.detail=old\.detail/,'track switches preserve the current single-item detail');
assert.doesNotMatch(extractFunction('selectLedgerCurrency'),/draft\.detail\s*=/,'currency switches never replace the current detail');
assert.doesNotMatch(extractFunction('selectLedgerCategory'),/draft\.detail\s*=/,'category switches never replace the current detail');
assert.doesNotMatch(extractFunction('selectLedgerPayMethod'),/draft\.detail\s*=/,'payment switches never replace the current detail');

const secondarySource=extractFunction('renderLedgerSingleSecondaryFields');
assert.doesNotMatch(secondarySource,/renderLedgerSingleItemDetail/,'required detail no longer lives in the collapsed secondary disclosure');
['renderLedgerStoreField','renderLedgerOccurrenceFields','renderLedgerSingleItemCategory','renderLedgerPaymentFields'].forEach(function(name){
  assert.match(secondarySource,new RegExp(name+'\\(draft'),'the secondary disclosure contains '+name);
});
assert.match(secondarySource,/draft\.entryDetailsOpen/,'secondary fields render only when their disclosure is open');
const basicInfoSource=extractFunction('renderLedgerSingleBasicInfo');
const primarySource=extractFunction('renderLedgerSingleItemPrimary');
assert.match(primarySource,/renderLedgerSingleItemDetail\(draft\)/,'amount and detail share the primary group');
assert.doesNotMatch(basicInfoSource,/renderLedgerSingleItemDetail\(draft\)/,'detail is not rendered again outside the primary group');
assert(basicInfoSource.indexOf('renderLedgerSingleItemPrimary(draft)')<basicInfoSource.indexOf('renderLedgerSingleSecondaryFields(draft)'),'required field group precedes optional secondary controls');
assert.match(html,/\.ledger-single-primary \.ledger-sheet-input\{[^}]*width:100%[^}]*max-width:100%[^}]*box-sizing:border-box/,'required inputs share full content width');
assert.match(html,/\.ledger-single-primary \.ledger-amount-wrap \.ledger-sheet-input\{[^}]*min-height:62px/,'only amount retains the tall amount height');
assert.doesNotMatch(html,/\.ledger-single-primary \.ledger-sheet-input\{[^}]*min-height:62px/,'detail does not inherit the amount height');
assert.match(html,/\.ledger-single-primary \.ledger-sheet-field\+\.ledger-sheet-field\{[^}]*margin-top:10px/,'required fields use the approved gap without a divider');

assert.match(html,/id="ledgerAmount"[^>]*type="number"[^>]*inputmode="numeric"/,'the approved amount input type and inputmode remain unchanged');
assert.match(html,/id="ledgerAmount"[^>]*enterkeyhint="next"[^>]*onkeydown="handleLedgerAmountNext\(event\)"/,'the amount keyboard advances through one shared Next handler');
assert.match(html,/id="ledgerDetail"[^>]*enterkeyhint="done"[^>]*onkeydown="handleLedgerDetailDone\(event\)"/,'the detail keyboard exposes Done through the exact save handler');
assert.match(html,/\.ledger-sheet #ledgerAmount\{[^}]*font-size:30px!important/,'the primary amount is visually prominent without weakening the global 16px floor');

const amountNextSource=extractFunction('handleLedgerAmountNext');
const detailDoneSource=extractFunction('handleLedgerDetailDone');
const inlineErrorSource=extractFunction('showLedgerInlineFieldError');
assert.doesNotMatch(amountNextSource,/saveLedgerEntry/,'amount Next never submits the entry');
assert.match(detailDoneSource,/saveLedgerEntry\(false\)/,'detail Done uses the exact primary save path');
let saves=0,prevented=0,detailFocuses=0,amountFocuses=0;
let inlineError=null;
const amountField={querySelector(){return inlineError;},appendChild(node){inlineError=node;}};
const amountWrap={classList:{contains(name){return name==='ledger-amount-wrap';}},parentNode:amountField};
const amountInput={value:'3500',classList:{add(name){amountInput.invalidClass=name;}},setAttribute(name,value){amountInput[name]=value;},parentNode:amountWrap,focus(){amountFocuses++;}};
const detailInput={focus(){detailFocuses++;}};
const doneSandbox={
  ledgerUiState:{draft:{amount:'3500',formErrors:{}}},
  ledgerItemAmountIsValid(item){return /^\d+$/.test(String(item.amount))&&Number(item.amount)>0;},
  document:{getElementById(id){return id==='ledgerAmount'?amountInput:(id==='ledgerDetail'?detailInput:null);},createElement(){return {className:'',textContent:''};}},
  saveLedgerEntry(addAnother){assert.strictEqual(addAnother,false);saves++;},
  Object,String,Number,Promise
};
vm.createContext(doneSandbox);
vm.runInContext(inlineErrorSource+'\n'+amountNextSource+'\n'+detailDoneSource,doneSandbox);
doneSandbox.handleLedgerAmountNext({key:'Enter',isComposing:false,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerAmountNext({key:'Tab',isComposing:false,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerAmountNext({key:'Enter',isComposing:true,currentTarget:amountInput,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailDone({key:'Enter',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailDone({key:'Tab',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.handleLedgerDetailDone({key:'Enter',isComposing:true,preventDefault(){prevented++;}});
assert.strictEqual(detailFocuses,1,'valid amount Enter focuses detail exactly once');
assert.strictEqual(amountFocuses,0,'valid amount Enter does not return to amount');
assert.strictEqual(saves,1,'detail Done invokes the exact primary save path once');
assert.strictEqual(prevented,2,'only handled non-composing Enter keys suppress native form behavior');
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

assert.match(html,/var ledgerUiState=.*savePending:false/,'ledger UI state owns one transient save-in-flight guard');
const saveEntrySource=extractFunction('saveLedgerEntry');
assert.match(saveEntrySource,/if\(ledgerUiState\.savePending\)return Promise\.resolve\(\{ok:false,pending:true\}\)/,'repeat taps and keyboard Done events are ignored while a save is pending');
assert.match(saveEntrySource,/setLedgerSavePending\(true\)/,'the save guard is raised before any asynchronous confirmation or persistence');
const pendingSource=extractFunction('setLedgerSavePending');
assert.match(pendingSource,/button-spinner/,'pending save buttons expose the existing spinner');
assert.match(pendingSource,/button\.disabled=ledgerUiState\.savePending/,'both save buttons follow the same disabled state');
const commitSource=extractFunction('commitLedgerEntrySave');
assert.match(commitSource,/setLedgerSavePending\(false\)/,'success and failure paths release the transient save guard');

console.log('ledger entry P0 tests passed');
