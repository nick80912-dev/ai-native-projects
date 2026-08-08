const assert=require('assert');
const TripLedgerUiState=require('../ledger-ui-state.js');

function plain(value){return JSON.parse(JSON.stringify(value));}

const draft={track:'personal',amount:'500',formErrors:{}};
const context={kind:'ledger',scrollY:420,focusId:'ledgerFab'};
const initial=TripLedgerUiState.createState();

let opened=TripLedgerUiState.transition(initial,{
  type:'open-entry-create',draft:draft,sessionId:'session-1',returnContext:context,focusTarget:'amount'
});
assert.strictEqual(opened.changed,true,'opening create starts an entry session');
assert.strictEqual(opened.state.sheet,'entry');
assert.strictEqual(opened.state.draft,draft,'the module owns the supplied draft lifecycle without interpreting its fields');
assert.strictEqual(opened.state.editing,null);
assert.strictEqual(opened.state.entrySessionId,'session-1');
assert.deepStrictEqual(plain(opened.state.entryReturnContext),context);
assert.deepStrictEqual(plain(opened.effects),[
  {type:'close-actions'},
  {type:'mount-entry'},
  {type:'render-entry',preservePosition:false},
  {type:'focus-entry',target:'amount'}
]);

const editing={track:'shared',originals:[{id:'record-1'}]};
opened=TripLedgerUiState.transition(initial,{
  type:'open-entry-edit',draft:{track:'shared',amount:'800'},editing:editing,sessionId:'session-2',
  returnContext:{kind:'ledger',scrollY:210},focusTarget:''
});
assert.strictEqual(opened.changed,true);
assert.strictEqual(opened.state.track,'shared','editing switches the UI to the record track');
assert.strictEqual(opened.state.editing,editing);

const switchedDraft={track:'personal',amount:'800',formErrors:{}};
let switched=TripLedgerUiState.transition(opened.state,{
  type:'entry-track-switched',sessionId:'session-2',draft:switchedDraft
});
assert.strictEqual(switched.state.draft,switchedDraft);
assert.strictEqual(switched.state.track,'personal');
assert.deepStrictEqual(plain(switched.effects),[{type:'render-entry',preservePosition:true}]);

const staleSwitch=TripLedgerUiState.transition(opened.state,{
  type:'entry-track-switched',sessionId:'stale-session',draft:switchedDraft
});
assert.strictEqual(staleSwitch.changed,false,'a stale session cannot replace the active draft');
assert.strictEqual(staleSwitch.state,opened.state);

const closed=TripLedgerUiState.transition(opened.state,{type:'close-entry',restoreBackground:true});
assert.strictEqual(closed.changed,true);
assert.strictEqual(closed.state.sheet,null);
assert.strictEqual(closed.state.draft,null);
assert.strictEqual(closed.state.editing,null);
assert.strictEqual(closed.state.entrySessionId,'');
assert.strictEqual(closed.state.entryReturnContext,null);
assert.deepStrictEqual(plain(closed.effects),[
  {type:'unmount-entry'},
  {type:'restore-entry-context',context:{kind:'ledger',scrollY:210},restoreBackground:true}
]);

const missingDraft=TripLedgerUiState.transition(initial,{type:'open-entry-create',sessionId:'session-3'});
assert.strictEqual(missingDraft.changed,false,'an entry session requires a draft');
const missingSession=TripLedgerUiState.transition(initial,{type:'open-entry-create',draft:draft,sessionId:''});
assert.strictEqual(missingSession.changed,false,'an entry session requires an identity');

console.log('ledger entry UI state tests passed');
