const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const TripLedgerUiState=require('../ledger-ui-state.js');

const html=fs.readFileSync('shell/v113/index.html','utf8');

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

function plain(value){
  return JSON.parse(JSON.stringify(value));
}

const source=[
  extractFunction('ledgerDraftInitializedTracks'),
  extractFunction('cloneLedgerDraftItemForTrack'),
  extractFunction('switchLedgerDraftTrackPlan')
].join('\n');
const sandbox={Object,Array,String,Boolean,Number,RegExp};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

const personal={
  track:'personal',
  detail:'晚餐',
  sourceShoppingItemId:'single-item',
  sourceShoppingAllocationId:'single-allocation',
  isProxy:true,
  proxyTarget:'媽媽',
  participants:[],
  participantsRetained:false,
  formErrors:{amount:'bad'},
  items:[
    {
      key:'row-a',name:'白桃',amount:'500',category:'購物',
      isProxy:true,proxyTarget:'媽媽',
      participantMode:'inherit',participants:[],
      sourceShoppingItemId:'shopping-a',
      sourceShoppingAllocationId:'allocation-a'
    },
    {
      key:'row-b',name:'藥妝',amount:'900',category:'購物',
      isProxy:true,proxyTarget:'阿寶',
      participantMode:'inherit',participants:[],
      sourceShoppingItemId:'shopping-b',
      sourceShoppingAllocationId:'allocation-b'
    }
  ]
};
const sharedDefaults={
  track:'shared',
  participants:['Bar','Amy'],
  participantsRetained:false,
  isProxy:false,
  proxyTarget:''
};
const original=plain(personal);
const shared=plain(sandbox.switchLedgerDraftTrackPlan(
  personal,'shared',sharedDefaults
));

assert.deepStrictEqual(personal,original,'track switching never mutates the current draft');
assert.strictEqual(shared.track,'shared');
assert.strictEqual(shared.detail,'晚餐','single-item detail survives track switching');
assert.deepStrictEqual(shared.participants,['Bar','Amy'],'first shared entry receives shared defaults');
assert.strictEqual(shared.sourceShoppingItemId,'single-item','single-item Shopping source survives switching');
assert.strictEqual(shared.sourceShoppingAllocationId,'single-allocation','single-allocation Shopping source survives switching');
assert.deepStrictEqual(
  shared.items.map(item=>[
    item.key,item.isProxy,item.proxyTarget,
    item.sourceShoppingItemId,item.sourceShoppingAllocationId
  ]),
  [
    ['row-a',true,'媽媽','shopping-a','allocation-a'],
    ['row-b',true,'阿寶','shopping-b','allocation-b']
  ],
  'each multi-item row keeps its identity, proxy state, and Shopping source'
);
assert.deepStrictEqual(shared.formErrors,{},'errors from the hidden track are cleared');

shared.items[0].participantMode='custom';
shared.items[0].participants=['Amy'];
shared.participants=['Amy'];
const personalAgain=plain(sandbox.switchLedgerDraftTrackPlan(
  shared,'personal',
  {track:'personal',isProxy:false,proxyTarget:'',participants:[]}
));
assert.strictEqual(personalAgain.items[0].proxyTarget,'媽媽','personal proxy target returns after switching back');
assert.deepStrictEqual(personalAgain.items[0].participants,['Amy'],'hidden shared row selection remains in the draft');

const sharedAgain=plain(sandbox.switchLedgerDraftTrackPlan(
  personalAgain,'shared',sharedDefaults
));
assert.strictEqual(sharedAgain.items[0].participantMode,'custom','custom shared row mode returns');
assert.deepStrictEqual(sharedAgain.items[0].participants,['Amy'],'custom shared participants return');
assert.deepStrictEqual(sharedAgain.participants,['Amy'],'shared top-level participants return instead of resetting');
assert.deepStrictEqual(
  sharedAgain.items.map(item=>item.sourceShoppingAllocationId),
  ['allocation-a','allocation-b'],
  'repeated switches never reorder allocation sources'
);

assert.throws(
  ()=>sandbox.switchLedgerDraftTrackPlan(personal,'other',sharedDefaults),
  /帳本/,
  'unknown tracks fail closed'
);
assert.throws(
  ()=>sandbox.switchLedgerDraftTrackPlan({track:'personal',items:{}},'shared',sharedDefaults),
  /草稿/,
  'malformed draft items fail closed'
);

let handlerRenders=0;
let handlerPositions=0;
const handlerErrors=[];
const handlerSandbox={
  Object,Array,String,Boolean,Number,RegExp,
  ledgerUiState:TripLedgerUiState.createState({sheet:'entry',draft:plain(personal),entrySessionId:'handler-session'}),
  createLedgerEntryDraft(track){
    return track==='shared'
      ?plain(sharedDefaults)
      :{track:'personal',participants:[],isProxy:false,proxyTarget:''};
  },
  toast(message){handlerErrors.push(message);}
};
handlerSandbox.ledgerUiWorkflow=TripLedgerUiState.createWorkflow({
  readState(){return handlerSandbox.ledgerUiState;},
  writeState(next){handlerSandbox.ledgerUiState=next;},
  renderEntry(effect){if(effect.preservePosition)handlerPositions++;handlerRenders++;}
});
vm.createContext(handlerSandbox);
vm.runInContext(source+'\n'+extractFunction('setLedgerDraftTrack'),handlerSandbox);
handlerSandbox.setLedgerDraftTrack('shared');
assert.strictEqual(handlerSandbox.ledgerUiState.draft.track,'shared','UI handler installs the planned draft');
assert.strictEqual(handlerSandbox.ledgerUiState.draft.items[0].key,'row-a');
assert.strictEqual(handlerPositions,1,'UI rerenders through the existing position-preserving boundary');
assert.strictEqual(handlerRenders,1);
assert.deepStrictEqual(handlerErrors,[]);

console.log('ledger draft track-switch tests passed');
