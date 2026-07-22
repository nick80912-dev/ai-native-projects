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

console.log('ledger entry P0 tests passed');
