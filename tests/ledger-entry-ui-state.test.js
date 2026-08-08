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

let saving=TripLedgerUiState.transition(initial,{
  type:'open-entry-create',draft:{track:'personal',amount:'500'},sessionId:'session-save',
  returnContext:{kind:'ledger',scrollY:88},focusTarget:'amount'
}).state;
const invalidDraft={track:'personal',amount:'',formErrors:{amount:'請輸入有效金額'}};
let saveOutcome=TripLedgerUiState.transition(saving,{
  type:'entry-validation-failed',sessionId:'session-save',draft:invalidDraft,errorTarget:'amount'
});
assert.strictEqual(saveOutcome.state.draft,invalidDraft);
assert.strictEqual(saveOutcome.state.savePending,false);
assert.deepStrictEqual(plain(saveOutcome.effects),[
  {type:'render-entry',preservePosition:true},
  {type:'focus-entry',target:'amount'}
]);

saveOutcome=TripLedgerUiState.transition(saveOutcome.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-1'
});
assert.strictEqual(saveOutcome.state.savePending,true);
assert.strictEqual(saveOutcome.state.entrySaveRequestId,'request-1');
assert.deepStrictEqual(plain(saveOutcome.effects),[{type:'sync-entry-pending'}]);
const pendingState=saveOutcome.state;

const duplicate=TripLedgerUiState.transition(pendingState,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-2'
});
assert.strictEqual(duplicate.changed,false,'pending entry ignores a second save request');
assert.strictEqual(duplicate.state,pendingState);

const staleFailure=TripLedgerUiState.transition(pendingState,{
  type:'entry-save-failed',sessionId:'session-save',requestId:'old-request',notification:{message:'舊失敗'}
});
assert.strictEqual(staleFailure.changed,false,'an old request cannot clear the active pending state');
assert.strictEqual(staleFailure.state,pendingState);

const failed=TripLedgerUiState.transition(pendingState,{
  type:'entry-save-failed',sessionId:'session-save',requestId:'request-1',notification:{message:'記帳失敗'}
});
assert.strictEqual(failed.state.savePending,false);
assert.strictEqual(failed.state.entrySaveRequestId,'');
assert.strictEqual(failed.state.draft,invalidDraft,'save failure keeps the complete draft');
assert.strictEqual(failed.state.entrySessionId,'session-save');
assert.deepStrictEqual(plain(failed.effects),[
  {type:'sync-entry-pending'},
  {type:'notify-entry-result',notification:{message:'記帳失敗'}}
]);

const retried=TripLedgerUiState.transition(failed.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-2'
}).state;
const nextDraft={track:'personal',amount:'',sourceShoppingItemId:'',sourceShoppingAllocationId:'',formErrors:{}};
const addAnother=TripLedgerUiState.transition(retried,{
  type:'entry-save-succeeded',sessionId:'session-save',requestId:'request-2',addAnother:true,
  nextDraft:nextDraft,notification:{message:'已儲存'}
});
assert.strictEqual(addAnother.state.sheet,'entry');
assert.strictEqual(addAnother.state.draft,nextDraft);
assert.strictEqual(addAnother.state.editing,null);
assert.strictEqual(addAnother.state.entrySessionId,'session-save');
assert.deepStrictEqual(plain(addAnother.state.entryReturnContext),{kind:'ledger',scrollY:88});
assert.strictEqual(addAnother.state.savePending,false);
assert.strictEqual(addAnother.state.entrySaveRequestId,'');
assert.deepStrictEqual(plain(addAnother.effects),[
  {type:'sync-entry-pending'},
  {type:'render-entry',preservePosition:false},
  {type:'focus-entry',target:'amount'},
  {type:'notify-entry-result',notification:{message:'已儲存'}}
]);

const closePending=TripLedgerUiState.transition(addAnother.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-3'
}).state;
const savedAndClosed=TripLedgerUiState.transition(closePending,{
  type:'entry-save-succeeded',sessionId:'session-save',requestId:'request-3',addAnother:false,
  notification:{message:'完成'}
});
assert.strictEqual(savedAndClosed.state.sheet,null);
assert.strictEqual(savedAndClosed.state.draft,null);
assert.strictEqual(savedAndClosed.state.entrySessionId,'');
assert.deepStrictEqual(plain(savedAndClosed.effects),[
  {type:'sync-entry-pending'},
  {type:'unmount-entry'},
  {type:'render-split'},
  {type:'restore-entry-context',context:{kind:'ledger',scrollY:88},restoreBackground:true},
  {type:'notify-entry-result',notification:{message:'完成'}}
]);

const silentPending=TripLedgerUiState.transition(addAnother.state,{
  type:'entry-save-requested',sessionId:'session-save',requestId:'request-4'
}).state;
const silentCancel=TripLedgerUiState.transition(silentPending,{
  type:'entry-save-failed',sessionId:'session-save',requestId:'request-4',notification:null
});
assert.deepStrictEqual(plain(silentCancel.effects),[{type:'sync-entry-pending'}],'silent cancellation only unlocks the form');

const staleSession=TripLedgerUiState.transition(silentPending,{
  type:'entry-save-succeeded',sessionId:'old-session',requestId:'request-4',addAnother:false
});
assert.strictEqual(staleSession.changed,false,'an old session cannot close the active entry');

let calendarState=TripLedgerUiState.transition(initial,{
  type:'open-entry-create',draft:{track:'personal',occurredDate:'2026/12/15'},
  sessionId:'calendar-session',returnContext:null,focusTarget:''
}).state;
let calendar=TripLedgerUiState.transition(calendarState,{
  type:'toggle-entry-calendar',sessionId:'calendar-session',year:2026,month:11
});
assert.strictEqual(calendar.state.calendarOpen,true);
assert.strictEqual(calendar.state.calendarYear,2026);
assert.strictEqual(calendar.state.calendarMonth,11);
assert.deepStrictEqual(plain(calendar.effects),[{type:'render-entry',preservePosition:true}]);

calendar=TripLedgerUiState.transition(calendar.state,{
  type:'shift-entry-calendar',sessionId:'calendar-session',delta:1
});
assert.strictEqual(calendar.state.calendarYear,2027,'December advances into January of the next year');
assert.strictEqual(calendar.state.calendarMonth,0);
calendar=TripLedgerUiState.transition(calendar.state,{
  type:'shift-entry-calendar',sessionId:'calendar-session',delta:-1
});
assert.strictEqual(calendar.state.calendarYear,2026,'January moves back into December of the previous year');
assert.strictEqual(calendar.state.calendarMonth,11);

const datedDraft={track:'personal',occurredDate:'2026/12/20',occurredDateError:''};
calendar=TripLedgerUiState.transition(calendar.state,{
  type:'select-entry-calendar-date',sessionId:'calendar-session',draft:datedDraft
});
assert.strictEqual(calendar.state.draft,datedDraft);
assert.strictEqual(calendar.state.calendarOpen,false);
assert.deepStrictEqual(plain(calendar.effects),[{type:'render-entry',preservePosition:true}]);

const reopened=TripLedgerUiState.transition(calendar.state,{
  type:'toggle-entry-calendar',sessionId:'calendar-session',year:2026,month:11
});
const closedCalendar=TripLedgerUiState.transition(reopened.state,{
  type:'close-entry-calendar',sessionId:'calendar-session'
});
assert.strictEqual(closedCalendar.state.calendarOpen,false);
assert.deepStrictEqual(plain(closedCalendar.effects),[{type:'render-entry',preservePosition:true}]);

[
  TripLedgerUiState.transition(initial,{type:'toggle-entry-calendar',sessionId:'none',year:2026,month:0}),
  TripLedgerUiState.transition(reopened.state,{type:'shift-entry-calendar',sessionId:'stale',delta:1}),
  TripLedgerUiState.transition(calendar.state,{type:'select-entry-calendar-date',sessionId:'calendar-session',draft:datedDraft}),
  TripLedgerUiState.transition(calendar.state,{type:'close-entry-calendar',sessionId:'calendar-session'})
].forEach(function(invalidCalendar){
  assert.strictEqual(invalidCalendar.changed,false,'calendar actions fail closed outside their valid state');
});

const workflowEvents=[];
let workflowState=TripLedgerUiState.createState();
const workflow=TripLedgerUiState.createWorkflow({
  readState:function(){workflowEvents.push(['read']);return workflowState;},
  writeState:function(next){workflowState=next;workflowEvents.push(['write',next.entrySessionId,next.sheet]);},
  closeActions:function(){workflowEvents.push(['close-actions',workflowState.entrySessionId]);},
  mountEntry:function(effect,state){workflowEvents.push(['mount-entry',state.entrySessionId]);},
  unmountEntry:function(){workflowEvents.push(['unmount-entry',workflowState.sheet]);},
  renderEntry:function(effect,state){workflowEvents.push(['render-entry',effect.preservePosition,state.draft&&state.draft.amount]);},
  syncEntryPending:function(state){workflowEvents.push(['sync-entry-pending',state.savePending]);},
  focusEntry:function(target){workflowEvents.push(['focus-entry',target]);},
  restoreEntryContext:function(contextValue,restore){workflowEvents.push(['restore-entry-context',contextValue&&contextValue.kind,restore]);},
  notifyEntryResult:function(notification){workflowEvents.push(['notify-entry-result',notification&&notification.message]);},
  renderSplit:function(){workflowEvents.push(['render-split',workflowState.sheet]);}
});
workflow.dispatch({
  type:'open-entry-create',draft:{track:'personal',amount:'100'},sessionId:'workflow-session',
  returnContext:{kind:'ledger',scrollY:12},focusTarget:'amount'
});
assert.deepStrictEqual(workflowEvents,[
  ['read'],['write','workflow-session','entry'],['close-actions','workflow-session'],
  ['mount-entry','workflow-session'],['render-entry',false,'100'],['focus-entry','amount']
],'workflow writes entry state before executing ordered open effects');
workflowEvents.length=0;
workflow.dispatch({
  type:'entry-validation-failed',sessionId:'workflow-session',
  draft:{track:'personal',amount:'',formErrors:{amount:'請輸入有效金額'}},errorTarget:'amount'
});
assert.deepStrictEqual(workflowEvents,[
  ['read'],['write','workflow-session','entry'],['render-entry',true,''],['focus-entry','amount']
]);
workflowEvents.length=0;
workflow.dispatch({type:'close-entry',restoreBackground:true});
assert.deepStrictEqual(workflowEvents,[
  ['read'],['write','',null],['unmount-entry',null],['restore-entry-context','ledger',true]
]);

console.log('ledger entry UI state tests passed');
