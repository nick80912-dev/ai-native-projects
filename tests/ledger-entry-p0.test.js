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

const secondarySource=extractFunction('renderLedgerSingleSecondaryFields');
['renderLedgerSingleItemDetail','renderLedgerStoreField','renderLedgerOccurrenceFields','renderLedgerSingleItemCategory','renderLedgerPaymentFields'].forEach(function(name){
  assert.match(secondarySource,new RegExp(name+'\\(draft'),'the secondary disclosure contains '+name);
});
assert.match(secondarySource,/draft\.entryDetailsOpen/,'secondary fields render only when their disclosure is open');

assert.match(html,/id="ledgerAmount"[^>]*type="number"[^>]*inputmode="numeric"/,'the approved amount input type and inputmode remain unchanged');
assert.match(html,/id="ledgerAmount"[^>]*enterkeyhint="done"[^>]*onkeydown="handleLedgerAmountDone\(event\)"/,'the amount keyboard exposes Done through one shared handler');
assert.match(html,/\.ledger-sheet #ledgerAmount\{[^}]*font-size:30px!important/,'the primary amount is visually prominent without weakening the global 16px floor');

const doneSource=extractFunction('handleLedgerAmountDone');
let saves=0,prevented=0;
const doneSandbox={saveLedgerEntry(addAnother){assert.strictEqual(addAnother,false);saves++;},Promise};
vm.createContext(doneSandbox);
vm.runInContext(doneSource,doneSandbox);
doneSandbox.handleLedgerAmountDone({key:'Enter',isComposing:false,preventDefault(){prevented++;}});
doneSandbox.handleLedgerAmountDone({key:'Tab',isComposing:false,preventDefault(){prevented++;}});
assert.strictEqual(saves,1,'Done invokes the exact primary save path once');
assert.strictEqual(prevented,1,'only the handled Done key suppresses native form behavior');

const validationSource=extractFunction('validateLedgerEntryDraft');
assert.match(validationSource,/!draft\.multi[\s\S]*errors\.amount/,'single-entry validation reports an invalid amount before persistence');
assert.match(validationSource,/!draft\.multi[\s\S]*errors\.detail/,'single-entry validation reports a missing detail before persistence');
const saveSource=extractFunction('saveLedgerEntry');
assert.match(saveSource,/validation\.firstField==='detail'[\s\S]*draft\.entryDetailsOpen=true/,'validation opens hidden secondary fields before focusing them');
const focusSource=extractFunction('focusLedgerValidationError');
assert.match(focusSource,/ledgerAmount/,'invalid amount returns focus to the amount input');
assert.match(focusSource,/ledgerDetail/,'invalid hidden detail returns focus after disclosure expansion');

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

console.log('ledger entry P0 tests passed');
