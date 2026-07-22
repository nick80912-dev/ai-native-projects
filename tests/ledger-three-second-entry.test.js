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

const quickEntrySource=extractFunction('openLedgerQuickEntryFromFab');
const openEntrySource=extractFunction('openLedgerEntrySheet');
const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 撠汗 / ??'));

assert.match(splitSource,/class="ledger-fab"[^>]*onclick="openLedgerQuickEntryFromFab\(\)"/,'the dashboard FAB uses its dedicated quick-entry path');
assert.match(quickEntrySource,/openLedgerEntrySheet\(true\)/,'the FAB marks its open as a quick entry');

const renderPosition=openEntrySource.indexOf('renderLedgerEntrySheet()');
const amountLookupPosition=openEntrySource.indexOf("getElementById('ledgerAmount')");
const amountFocusPosition=openEntrySource.indexOf('amount.focus(');
const animationPosition=openEntrySource.indexOf('requestAnimationFrame');
assert(renderPosition>=0&&amountLookupPosition>renderPosition,'the amount is looked up only after the sheet has rendered');
assert(amountFocusPosition>amountLookupPosition,'the mounted amount input is focused after lookup');
assert(animationPosition>amountFocusPosition,'the first focus happens before the animation frame');
assert.doesNotMatch(openEntrySource.slice(0,amountFocusPosition),/(?:Promise|setTimeout)\s*\(/,'the first focus has no Promise or timer delay');

const events=[];
let amountFocusable=false;
const amount={focus(){events.push('focus');}};
const overlay={querySelector(){return {scrollTop:0};}};
const sandbox={
  isTimeSimulationActive(){return false;},memberIsAllowed(){return true;},getCurrentMember(){return 'Amy';},
  ledgerUiState:{track:'personal'},ledgerBackgroundScrollY:0,
  window:{scrollY:120,pageYOffset:120},
  createLedgerEntryDraft(){return {amount:''};},
  closeLedgerEntrySheet(){events.push('close');},
  renderLedgerEntrySheet(){amountFocusable=true;events.push('render');},
  requestAnimationFrame(){events.push('animation scheduled');},
  document:{
    createElement(){return overlay;},
    getElementById(id){return id==='ledgerEntrySheet'?null:(id==='ledgerAmount'&&amountFocusable?amount:null);},
    body:{appendChild(){events.push('mount');},classList:{add(){}}}
  },
  toast(){},Date,Math,Promise,JSON,String,Number,isFinite
};
vm.createContext(sandbox);
vm.runInContext(quickEntrySource+'\n'+openEntrySource,sandbox);
sandbox.openLedgerQuickEntryFromFab();
assert.deepStrictEqual(events,['close','mount','render','focus','animation scheduled'],'the FAB mounts, renders, focuses, then schedules animation in one synchronous event chain');

const toastSource=extractFunction('toast');
const clearToastSource=extractFunction('clearToast');
const runToastActionSource=extractFunction('runToastAction');
const toastEvents=[];
const toastElement={
  innerHTML:'',textContent:'',
  classList:{add(name){toastEvents.push('add:'+name);},remove(name){toastEvents.push('remove:'+name);}}
};
const toastSandbox={
  document:{getElementById(){return toastElement;}},
  escapeHtml(value){return String(value);},
  setTimeout(fn,ms){toastEvents.push('timer:'+ms);return toastEvents.length;},
  clearTimeout(id){toastEvents.push('clear:'+id);},
  String,Number,isFinite
};
vm.createContext(toastSandbox);
vm.runInContext('var toastTimer,toastAction=null;'+clearToastSource+'\n'+runToastActionSource+'\n'+toastSource,toastSandbox);
let undone=0;
toastSandbox.toast('saved','Undo',function(){undone++;},5000);
assert.match(toastElement.innerHTML,/Undo/,'a save toast renders its sole Undo action');
assert(toastEvents.includes('timer:5000'),'a caller can keep an Undo toast visible for five seconds');
toastSandbox.toast('next');
toastSandbox.runToastAction();
assert.strictEqual(undone,0,'replacing a toast invalidates its previous undo action');
assert(toastEvents.includes('timer:2000'),'three-argument-free notifications retain the default duration');
toastSandbox.toast('legacy','Action',function(){});
assert(toastEvents.includes('timer:3500'),'existing three-argument action toasts retain their duration');

const duplicateConfirmSource=extractFunction('confirmSharedLedgerDuplicate');
const closeDuplicateConfirmSource=extractFunction('closeLedgerDuplicateConfirm');
let duplicateDialog=null;
const duplicateConfirmSandbox={
  document:{
    createElement(){return {id:'',className:'',innerHTML:'',remove(){duplicateDialog=null;}};},
    getElementById(id){return id==='ledgerDuplicateDialog'?duplicateDialog:null;},
    body:{appendChild(node){duplicateDialog=node;}}
  },
  escapeHtml(value){return String(value);},
  formatLedgerPrimaryTotal(currency,records){return currency==='TWD'?'NT$'+records[0].amountTwd:'¥'+records[0].amountJpy;},
  Promise,String,Number,Math,JSON
};
vm.createContext(duplicateConfirmSandbox);
vm.runInContext('var ledgerDuplicateResolve=null;'+duplicateConfirmSource+'\n'+closeDuplicateConfirmSource,duplicateConfirmSandbox);
const prepared=[{id:'1784512809000-new1',member:'Bar',category:'餐飲',inputCurrency:'JPY',amountJpy:500,amountTwd:110,batchId:''}];
const confirmation=duplicateConfirmSandbox.confirmSharedLedgerDuplicate(prepared[0]);
assert(duplicateDialog,'a possible shared duplicate opens a small confirmation dialog');
assert.match(duplicateDialog.innerHTML,/90 秒內已有一筆相同的 ¥500「餐飲」。/,'the dialog explains the scoped 90-second duplicate with the record currency');
assert.match(duplicateDialog.innerHTML,/取消/,'the dialog has a cancel action');
assert.match(duplicateDialog.innerHTML,/仍要儲存/,'the right-side primary action allows the user to save intentionally');
duplicateConfirmSandbox.closeLedgerDuplicateConfirm(true);
confirmation.then(function(approved){
  assert.strictEqual(approved,true,'approval resolves the controllable confirmation Promise');
  assert.deepStrictEqual(prepared.map(function(record){return record.id;}),['1784512809000-new1'],'confirmation never rebuilds prepared record IDs');
});

const compactControlOverrides=[
  '.member-entry input',
  '.state-box',
  '.state-dialog-copy',
  '.ledger-proxy-add-row .ledger-sheet-input'
];
compactControlOverrides.forEach(function(selector){
  assert(html.includes(selector),'the font-size guard covers the known '+selector+' control override');
});
const fontGuard='input:not([type="hidden"]),select,textarea{font-size:16px!important}';
const fontGuardPosition=html.lastIndexOf(fontGuard);
assert(fontGuardPosition>=0,'a final important 16px font-size guard protects every visible input, select, and textarea');
compactControlOverrides.forEach(function(selector){
  assert(fontGuardPosition>html.lastIndexOf(selector),'the final font-size guard wins after the '+selector+' override');
});
const viewport=html.match(/<meta\s+name="viewport"[^>]*>/i);
assert(viewport,'viewport meta tag exists');
assert.doesNotMatch(viewport[0],/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i,'viewport keeps user zoom available');

const topSegmentsSource=extractFunction('renderLedgerEntrySegments');
assert.match(topSegmentsSource,/ledger-entry-segments/,'account and currency controls share one compact top row');
assert.match(topSegmentsSource,/renderLedgerDraftTrack\(draft\).*renderLedgerDraftCurrency\(draft\)/s,'the compact row retains both existing state renderers');
assert.match(html,/\.ledger-entry-segments\{[^}]*grid-template-columns:repeat\(auto-fit,minmax\(150px,1fr\)\)[^}]*gap:8px[^}]*min-width:0/,'the compact row uses two safe half-width columns and can wrap when space is insufficient');
assert.match(html,/\.ledger-entry-segment\{[^}]*min-width:0/,'each compact segment may shrink without horizontal overflow');
assert.match(html,/\.ledger-entry-segment \.ledger-sheet-track\{[^}]*min-height:40px/,'the segmented control keeps at least a 40px touch target');
assert.match(html,/\.ledger-entry-segment \.ledger-segment-face\{[^}]*height:32px/,'the segmented control keeps its visible track within the approved 30–34px range');
assert.match(html,/\.ledger-entry-segment \.ledger-sheet-choice\{[^}]*min-height:40px[^}]*font-size:12px/,'compact choices remain readable and touchable');
assert.doesNotMatch(topSegmentsSource,/text-overflow|nowrap/,'account and currency labels are not truncated');

console.log('ledger three-second entry tests passed');
