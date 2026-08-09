const assert=require('assert');
const TripLedgerUiState=require('../ledger-ui-state.js');

function plain(value){return JSON.parse(JSON.stringify(value));}
function apply(state,action){return TripLedgerUiState.transition(state,action);}

const initial=TripLedgerUiState.createState();
const draft={track:'shared',occurredDate:'2026/10/18',currency:'JPY',formErrors:{}};
const correction={rootId:'root-1',anchorId:'anchor-1',owner:'Aaron',reason:'',preview:null,previewSignature:'',previewKind:''};
let outcome=apply(initial,{
  type:'open-correction',draft,correction,sessionId:'correction-session-1',
  returnContext:{kind:'ledger',scrollY:320}
});
assert.strictEqual(outcome.changed,true);
assert.strictEqual(outcome.state.sheet,'entry');
assert.strictEqual(outcome.state.track,'shared');
assert.strictEqual(outcome.state.draft,draft,'correction draft remains opaque domain data');
assert.notStrictEqual(outcome.state.correction,correction,'correction metadata has an immutable state container');
assert.strictEqual(outcome.state.entrySessionId,'correction-session-1');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'close-actions'},{type:'mount-entry'},{type:'render-entry',preservePosition:false}
]);

let state=outcome.state;
outcome=apply(state,{type:'update-correction-reason',sessionId:'correction-session-1',reason:'金額輸入錯誤'});
assert.strictEqual(outcome.state.correction.reason,'金額輸入錯誤');
assert.strictEqual(outcome.state.correction.preview,null);
assert.deepStrictEqual(plain(outcome.effects),[{type:'clear-correction-reason-error'}]);
assert.strictEqual(state.correction.reason,'','reason update does not mutate the previous state');
state=outcome.state;

outcome=apply(state,{
  type:'correction-preview-installed',sessionId:'correction-session-1',preview:{batch:[{id:'event-1'}]},
  signature:'signature-1',kind:'correction'
});
assert.deepStrictEqual(plain(outcome.state.correction.preview),{batch:[{id:'event-1'}]});
assert.strictEqual(outcome.state.correction.previewSignature,'signature-1');
assert.strictEqual(outcome.state.correction.previewKind,'correction');
assert.deepStrictEqual(plain(outcome.effects),[{type:'render-entry',preservePosition:true}]);
state=outcome.state;

outcome=apply(state,{type:'correction-preview-invalidated',sessionId:'correction-session-1',notification:{message:'收據已更新'}});
assert.strictEqual(outcome.state.correction.preview,null);
assert.strictEqual(outcome.state.correction.previewSignature,'');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'render-entry',preservePosition:true},
  {type:'notify-entry-result',notification:{message:'收據已更新'}}
]);

let calendar=apply(state,{type:'toggle-entry-calendar',sessionId:'correction-session-1',year:2026,month:9});
assert.strictEqual(calendar.state.calendarOpen,true,'the shared entry calendar accepts the correction session');
calendar=apply(calendar.state,{type:'select-entry-calendar-date',sessionId:'correction-session-1',draft:{track:'shared',occurredDate:'2026/10/20'}});
assert.strictEqual(calendar.state.calendarOpen,false);

let saving=apply(state,{type:'correction-save-requested',sessionId:'correction-session-1',requestId:'correction-save-1'});
assert.strictEqual(saving.state.savePending,true);
assert.strictEqual(saving.state.entrySaveRequestId,'correction-save-1');
assert.deepStrictEqual(plain(saving.effects),[{type:'sync-entry-pending'}]);
assert.strictEqual(apply(saving.state,{type:'close-correction',sessionId:'correction-session-1'}).changed,false,'pending correction cannot close');

const stale=apply(saving.state,{type:'correction-save-succeeded',sessionId:'old-session',requestId:'correction-save-1'});
assert.strictEqual(stale.changed,false,'an older correction session cannot close the active sheet');

outcome=apply(saving.state,{type:'correction-save-failed',sessionId:'correction-session-1',requestId:'correction-save-1',notification:{message:'更正儲存失敗'}});
assert.strictEqual(outcome.state.savePending,false);
assert.strictEqual(outcome.state.correction.previewSignature,'signature-1','enqueue failure retains the approved preview');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'sync-entry-pending'},
  {type:'notify-entry-result',notification:{message:'更正儲存失敗'}}
]);

saving=apply(outcome.state,{type:'correction-save-requested',sessionId:'correction-session-1',requestId:'correction-save-2'}).state;
outcome=apply(saving,{type:'correction-save-succeeded',sessionId:'correction-session-1',requestId:'correction-save-2',notification:{message:'更正已儲存，正在同步'}});
assert.strictEqual(outcome.state.sheet,null);
assert.strictEqual(outcome.state.correction,null);
assert.strictEqual(outcome.state.entrySessionId,'');
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'sync-entry-pending'},{type:'unmount-entry'},{type:'render-split'},
  {type:'restore-entry-context',context:{kind:'ledger',scrollY:320},restoreBackground:true},
  {type:'notify-entry-result',notification:{message:'更正已儲存，正在同步'}}
]);

const closable=apply(initial,{type:'open-correction',draft,correction,sessionId:'correction-session-2',returnContext:{kind:'ledger',scrollY:80}}).state;
outcome=apply(closable,{type:'close-correction',sessionId:'correction-session-2',restoreBackground:false});
assert.strictEqual(outcome.state.correction,null);
assert.deepStrictEqual(plain(outcome.effects),[
  {type:'unmount-entry'},
  {type:'restore-entry-context',context:{kind:'ledger',scrollY:80},restoreBackground:false}
]);

console.log('ledger correction UI state tests passed');
