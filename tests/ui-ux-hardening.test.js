const assert = require('assert');
const vm = require('vm');
const { readIndexHtml, extractFunction } = require('./support/source');
const TripShoppingUiState=require('../shopping-ui-state.js');

const html = readIndexHtml();

/* Break caught: presentation values drift back into one-off declarations instead of the approved small scale. */
assert.match(html,/--font-caption:11px;--font-meta:12px;--font-body:14px;--font-title:20px;--font-display:24px/);
assert.match(html,/--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:24px/);
assert.match(html,/--radius-sm:6px;--radius-control:10px;--radius-card:14px;--radius-pill:999px/);
assert.match(html,/\.today-hero \.lbl\{[^}]*font-size:var\(--font-caption\)/);
assert.match(html,/\.today-hero \.date\{[^}]*font-size:var\(--font-display\)/);
assert.match(html,/\.navigation-target-status-visible\{[^}]*margin:0 0 var\(--space-2\)[^}]*font-size:var\(--font-meta\)/);
assert.match(html,/\.diag-log-entry b\{[^}]*font-size:var\(--font-meta\)/);
assert.match(html,/\.diag-log-entry span\{[^}]*font-size:var\(--font-caption\)/);

/* Break caught: a render exception again tells users to perform an unsupported pull gesture. */
const renderCurrent = extractFunction(html, 'renderCurrent');
assert.doesNotMatch(renderCurrent, /下拉重試/);
assert.match(renderCurrent, /<button[^>]+onclick="retryCurrentView\(this\)"[^>]*>重新整理<\/button>/);

/* Break caught: the retry control exists visually but does not rerun the failed view. */
const retrySource = extractFunction(html, 'retryCurrentView');
const calls = [];
const button = { disabled: false };
const sandbox = {
  renderDaybar() { calls.push('daybar'); },
  renderCurrent() { calls.push('current'); },
};
vm.createContext(sandbox);
vm.runInContext(retrySource, sandbox);
sandbox.retryCurrentView(button);
assert.deepStrictEqual(calls, ['daybar', 'current']);
assert.strictEqual(button.disabled, true, 'retry disables the stale button while replacing the failed view');

/* Break caught: Today exposes day chips with no active state and sends users to another view. */
const daybarSource = extractFunction(html, 'renderDaybar');
const bar = { style: {}, innerHTML: '' };
const daybarSandbox = {
  curView: 'today',
  curDay: 0,
  DB: { trip: { days: [{ date: '10/18', dow: '日' }] } },
  todayMD() { return '10/18'; },
  document: { getElementById() { return bar; } },
};
vm.createContext(daybarSandbox);
vm.runInContext(daybarSource, daybarSandbox);
daybarSandbox.renderDaybar();
assert.strictEqual(bar.style.display, 'none', 'Today hides the trip-only day picker');
daybarSandbox.curView = 'trip';
daybarSandbox.renderDaybar();
assert.strictEqual(bar.style.display, 'flex', 'the itinerary still exposes its day picker');

/* Break caught: longer sync text collides with the title because actions are absolutely positioned. */
assert.doesNotMatch(html, /\.brand\{[^}]*padding[^}]*128px/);
assert.doesNotMatch(html, /\.brand-actions\{[^}]*position:absolute/);
assert.match(html, /\.brand \.t\{[^}]*flex:1/);

/* Break caught: frequently used controls regress below a 44px touch target. */
for (const selector of ['.brand .sync', '.settings-btn', '.day-chip', '.shop-filter-btn']) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp(escaped + '\\{[^}]*min-height:44px'), `${selector} keeps a 44px minimum height`);
}

/* Break caught: quota failures stack a second modal instead of staying in the current photo flow. */
assert.doesNotMatch(html, /function openShoppingPhotoStorageFailure\(/);
assert.doesNotMatch(html, /function closeShoppingPhotoStorageFailure\(/);
assert.doesNotMatch(html, /id=['"]shoppingPhotoStorageFailure/);
assert.match(html, /照片健康狀態/,'Settings exposes one photo-health destination');
const photoField = extractFunction(html, 'renderShoppingPhotoField');
assert.match(photoField, /role="status"[^>]*aria-live="polite"/);
assert.match(photoField, /shoppingUiState\.photoError/);
const repairDialog = extractFunction(html, 'openShoppingPhotoRepair');
assert.match(repairDialog, /shoppingPhotoRepairStatus/);
assert.match(repairDialog, /role="status"[^>]*aria-live="polite"/);

/* Break caught: a photo failure still opens a modal or toast instead of updating the current status line. */
const failureMessageSource = extractFunction(html, 'shoppingPhotoFailureMessage');
const showFailureSource = extractFunction(html, 'showShoppingPhotoSaveFailure');
const failureCalls = { rendered: 0, toasted: 0 };
const failureSandbox = {
  TripShoppingPhotos: { isQuotaExceededError() { return true; } },
  shoppingUiState: TripShoppingUiState.createState({
    form:{},photoError:'',
    formSession:{sessionId:'photo-session',mode:'add',savePending:true,photoRequestId:'photo-request'}
  }),
  shoppingPhotoRepairState: { error: '' },
  document: { getElementById() { return null; } },
  renderShoppingFormSheet() { failureCalls.rendered++; },
  toast() { failureCalls.toasted++; },
  String,
};
failureSandbox.shoppingUiWorkflow=TripShoppingUiState.createWorkflow({
  readState(){return failureSandbox.shoppingUiState;},
  writeState(next){failureSandbox.shoppingUiState=next;},
  syncFormPending(){failureCalls.rendered++;}
});
vm.createContext(failureSandbox);
vm.runInContext(failureMessageSource + '\n' + showFailureSource, failureSandbox);
assert.strictEqual(failureSandbox.showShoppingPhotoSaveFailure({ name: 'QuotaExceededError' }), '儲存空間不足，照片尚未加入');
assert.strictEqual(failureSandbox.shoppingUiState.photoError, '儲存空間不足，照片尚未加入');
assert.strictEqual(failureCalls.rendered, 1);
assert.strictEqual(failureCalls.toasted, 0, 'photo form errors stay inline');

/* Break caught: assistive technology never announces toast feedback. */
assert.match(html, /<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"><\/div>/);

/* Break caught: the openable next-stop div only responds to pointer clicks. */
const keyboardSource = extractFunction(html, 'activateKeyboardButton');
const keyboardSandbox = {};
vm.createContext(keyboardSandbox);
vm.runInContext(keyboardSource, keyboardSandbox);
let activated=0,prevented=0;
keyboardSandbox.activateKeyboardButton({key:'Enter',preventDefault(){prevented++;}},()=>activated++);
keyboardSandbox.activateKeyboardButton({key:' ',preventDefault(){prevented++;}},()=>activated++);
keyboardSandbox.activateKeyboardButton({key:'Escape',preventDefault(){prevented++;}},()=>activated++);
assert.strictEqual(activated,2);
assert.strictEqual(prevented,2);
assert.match(html, /class="nx-ticket-main openable" role="button" tabindex="0"[^>]*aria-label="開啟完整行程/);
assert.match(html, /onkeydown="activateKeyboardButton\(event,function\(\)\{openTripItem/);

console.log('UI/UX hardening tests passed');
