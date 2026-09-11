// Ticket 1 (GitHub #6) — Domain convergence: canonical duplicate suppression.
// Spec: docs/superpowers/specs/2026-07-24-settlement-reliability-visibility-design.md
// Covers spec tests #5, #8, #13, #14, #15, #16 and the #7 no-auto-promotion / domain part,
// plus the "canonical & suppressed pending claims never change consumption balance" regression guard.
//
// Model under test (per spec): the append-only records for one settlement key
// (universe, from, to, currency) are a stable-total-ordered event stream of claim
// generations. Canonical = earliest (normalized record.time ASC -> record.id ASC).
// Duplicates raised while a generation is open are suppressed and permanently inert;
// a generation is terminated by a valid confirm / reject / withdraw of the canonical;
// only an explicit new claim AFTER the terminal event opens the next generation.

const assert = require('assert');
const vm = require('vm');
const TripBuyToLedger = require('../buy-to-ledger.js');
const {appHtml}=require('./support/version');

function createStorage() {
  const values = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; }
  };
}

function loadModule() {
  const source = appHtml();
  const start = source.indexOf('/* ================= ledgerRepository');
  const end = source.indexOf('/* ================= 分帳', start);
  assert(start >= 0 && end > start, 'ledger helper section exists');
  const warnings = [];
  const sandbox = {
    console: { log() {}, warn(message) { warnings.push(String(message)); }, error() {} },
    localStorage: createStorage(), fetch() { return Promise.reject(new Error('network disabled')); },
    setTimeout, clearTimeout, Date, Math, Promise, JSON, String, Number, isFinite,
    TripBuyToLedger, buyToLedgerRuntimeAdapter: {},
    timestampDate(value) { return new Date(Number(value)); }, AppLog: { repo() {}, sync() {} },
    renderSplit() {}, updateLedgerPendingStatus() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end), sandbox);
  sandbox.__warnings = warnings;
  return sandbox;
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }

const mod = loadModule();

// ---- record builders (plain snapshots, full control over id + time) ----
function reg(id, member, time) {
  return { id, time, member, detail: '[身分註冊]', amountJpy: 0, amountTwd: 0, recordType: 'identity_registration' };
}
function expense(id, member, jpy, twd, participants, time) {
  return {
    id, time, member, category: '餐飲', detail: id, amountJpy: jpy, amountTwd: twd, note: '',
    participants: JSON.stringify(participants), payMethod: '現金', recordType: 'expense',
    targetRecordId: '', deleteReason: '', batchId: ''
  };
}
function claim(id, from, to, amount, currency, time) {
  return {
    id, time, member: from, category: '其他', detail: '[結清] ' + from + ' → ' + to,
    amountJpy: currency === 'JPY' ? amount : 0, amountTwd: currency === 'TWD' ? amount : 0,
    note: '', participants: JSON.stringify([to]), payMethod: '',
    recordType: 'settlement_claim', targetRecordId: '', deleteReason: '', batchId: '', inputCurrency: currency
  };
}
function confirmRec(id, claimId, responder, time) {
  return {
    id, time, member: responder, category: '其他', detail: '[結清確認]', amountJpy: 0, amountTwd: 0,
    note: '', participants: '', payMethod: '', recordType: 'settlement_confirm', targetRecordId: claimId,
    deleteReason: '', batchId: ''
  };
}
function rejectRec(id, claimId, responder, reason, time) {
  return {
    id, time, member: responder, category: '其他', detail: '[結清退回]', amountJpy: 0, amountTwd: 0,
    note: reason || '', participants: '', payMethod: '', recordType: 'settlement_reject', targetRecordId: claimId,
    deleteReason: '', batchId: ''
  };
}
function tomb(id, targetId, member, reason, time) {
  return {
    id, time, member, category: '其他', detail: '[刪除]', amountJpy: 0, amountTwd: 0,
    note: '', participants: '', payMethod: '', recordType: 'deletion', targetRecordId: targetId,
    deleteReason: reason, batchId: ''
  };
}

// Bar owes 小美 3000 JPY / 600 TWD from a single shared dinner.
const base = [
  reg('m-bar', 'Bar', '2026-07-18T00:00:00.000Z'),
  reg('m-amy', '小美', '2026-07-18T00:01:00.000Z'),
  expense('dinner', '小美', 6000, 1200, ['Bar', '小美'], '2026-07-18T01:00:00.000Z')
];

function derive(records) {
  const warns = [];
  const res = mod.deriveSettlements(records, function (m) { warns.push(String(m)); }, 'formal');
  res.__warns = warns;
  return res;
}
function barNet(records, confirmed, field) {
  const bal = mod.applyConfirmedSettlements(mod.buildMemberBalances(records, null, null, 'formal'), confirmed || []);
  const bar = plain(bal.members).filter(function (m) { return m.member === 'Bar'; })[0];
  return bar[field || 'netJpy'];
}

// ---- collecting runner: report every failing case, not just the first (supports async cases) ----
const results = [];
const asyncTests = [];
function test(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') {
      asyncTests.push(out.then(function () { results.push({ name, ok: true }); }, function (e) { results.push({ name, ok: false, err: e && e.message ? e.message : String(e) }); }));
    } else { results.push({ name, ok: true }); }
  } catch (e) { results.push({ name, ok: false, err: e && e.message ? e.message : String(e) }); }
}

// Sanity (must pass on old + new code — a failure here means harness/fixture error, not missing behaviour)
test('sanity: a lone valid claim derives as one pending entry', function () {
  const r = derive(base.concat([claim('s1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z')]));
  assert.strictEqual(r.pending.length, 1);
  assert.strictEqual(r.entries.length, 1);
});
test('sanity: claim + valid confirm derives as confirmed', function () {
  const r = derive(base.concat([
    claim('s2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z'),
    confirmRec('s2c', 's2', '小美', '2026-07-20T02:00:00.000Z')
  ]));
  assert.strictEqual(r.confirmed.length, 1);
});

// spec #5 + #16 + suppression warning + balance guard (#8 part)
test('#5 two same-key claims collapse to a single canonical (earliest time)', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const r = derive(base.concat([c1, c2]));
  assert.strictEqual(r.pending.length, 1, 'only one canonical pending');
  assert.strictEqual(r.pending[0].claim.id, 'c1', 'earliest time ASC is canonical');
  assert.strictEqual(r.entries.length, 1, 'suppressed duplicate is not an effective entry');
});
test('#5 suppressed duplicate emits a diagnostic warning identifying it', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const r = derive(base.concat([c1, c2]));
  assert(r.__warns.some(function (m) { return m.indexOf('c2') >= 0; }), 'warning names the suppressed claim');
});
test('#16 canonical is identical regardless of input record order (optimistic vs remote)', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const a = derive(base.concat([c1, c2]));
  const b = derive(base.concat([c2, c1]));
  const c = derive([c2].concat(base, [c1]));
  assert.strictEqual(a.pending.length, 1);
  assert.strictEqual(b.pending.length, 1);
  assert.strictEqual(c.pending.length, 1);
  assert.strictEqual(a.pending[0].claim.id, 'c1');
  assert.strictEqual(b.pending[0].claim.id, 'c1', 'reversed order picks the same canonical');
  assert.strictEqual(c.pending[0].claim.id, 'c1', 'shuffled order picks the same canonical');
});
test('#8 canonical + suppressed pending claims do not change consumption balance before confirm', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const r = derive(base.concat([c1, c2]));
  assert.strictEqual(barNet(base, []), -3000, 'baseline: Bar owes 3000');
  assert.strictEqual(barNet(base.concat([c1, c2]), r.confirmed), -3000, 'pending claims leave the balance untouched');
});
test('#8 confirmed settlement zeroes the payer net; honest re-open opens a new generation', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const cf = confirmRec('c1c', 'c1', '小美', '2026-07-20T02:00:00.000Z');
  const confirmed = derive(base.concat([c1, cf]));
  assert.strictEqual(confirmed.confirmed.length, 1, 'claim + confirm => confirmed');
  assert.strictEqual(barNet(base.concat([c1, cf]), confirmed.confirmed), 0, 'confirmed settlement zeroes the payer net');
  const day2 = expense('day2', '小美', 2000, 400, ['Bar', '小美'], '2026-07-21T00:00:00.000Z');
  const c3 = claim('c3', 'Bar', '小美', 1000, 'JPY', '2026-07-21T01:00:00.000Z');
  const reopened = derive(base.concat([c1, cf, day2, c3]));
  assert.strictEqual(reopened.confirmed.length, 1, 'the settled generation stays confirmed');
  assert.strictEqual(reopened.pending.length, 1, 'a new shared expense + new claim opens a new pending generation');
  assert.strictEqual(reopened.pending[0].claim.id, 'c3', 'the honest re-open claim is the new canonical');
});

// spec #13 — canonical reject: suppressed duplicate not promoted
test('#13 after canonical reject, the suppressed duplicate is NOT promoted', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const rj = rejectRec('r1', 'c1', '小美', '未收到', '2026-07-20T02:00:00.000Z');
  const r = derive(base.concat([c1, c2, rj]));
  assert.strictEqual(r.rejected.length, 1, 'canonical is rejected');
  assert.strictEqual(r.rejected[0].claim.id, 'c1');
  assert.strictEqual(r.pending.length, 0, 'suppressed duplicate is not promoted to pending');
  assert.strictEqual(r.entries.length, 1, 'only the canonical is an effective entry');
});

// spec #14 — canonical withdraw: suppressed duplicate not promoted
test('#14 after canonical withdraw, the suppressed duplicate is NOT promoted', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const w = tomb('w1', 'c1', 'Bar', '撤回結清', '2026-07-20T02:00:00.000Z');
  const r = derive(base.concat([c1, c2, w]));
  assert.strictEqual(r.entries.length, 0, 'withdrawn canonical leaves the handshake entirely');
  assert.strictEqual(r.pending.length, 0, 'suppressed duplicate is not promoted after a withdraw');
});

// spec #15 (confirm no-auto-promote) + inert suppressed-target responses
test('#15 after canonical confirm, the suppressed duplicate is NOT promoted', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const cf = confirmRec('cf', 'c1', '小美', '2026-07-20T02:00:00.000Z');
  const r = derive(base.concat([c1, c2, cf]));
  assert.strictEqual(r.confirmed.length, 1, 'canonical is confirmed');
  assert.strictEqual(r.confirmed[0].claim.id, 'c1');
  assert.strictEqual(r.pending.length, 0, 'suppressed duplicate is not promoted after a confirm');
});
test('#15 a confirm targeting a suppressed claim is inert (no effect, not in history, warned)', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const cf2 = confirmRec('cf2', 'c2', '小美', '2026-07-20T02:00:00.000Z'); // targets the suppressed claim
  const r = derive(base.concat([c1, c2, cf2]));
  assert.strictEqual(r.confirmed.length, 0, 'suppressed-target confirm confirms nothing');
  assert.strictEqual(r.pending.length, 1, 'canonical stays pending');
  assert.strictEqual(r.pending[0].claim.id, 'c1');
  assert(r.__warns.some(function (m) { return m.indexOf('cf2') >= 0 || m.indexOf('c2') >= 0; }), 'inert response is warned');
});
test('#15 a reject targeting a suppressed claim is inert', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const rj2 = rejectRec('rj2', 'c2', '小美', '未收到', '2026-07-20T02:30:00.000Z'); // targets suppressed claim
  const r = derive(base.concat([c1, c2, rj2]));
  assert.strictEqual(r.rejected.length, 0, 'suppressed-target reject rejects nothing');
  assert.strictEqual(r.pending.length, 1, 'canonical stays pending');
  assert.strictEqual(r.pending[0].claim.id, 'c1');
});

// spec #7 (domain / no-auto-promotion) + rule #10 — only an explicit new claim after the
// terminal event may start a new generation; the old suppressed claim is never reused.
test('#7 after canonical reject, an explicit NEW claim starts a new generation (not the old suppressed one)', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const rj = rejectRec('r1', 'c1', '小美', '未收到', '2026-07-20T02:00:00.000Z');
  const c3 = claim('c3', 'Bar', '小美', 3000, 'JPY', '2026-07-20T03:00:00.000Z');
  const r = derive(base.concat([c1, c2, rj, c3]));
  assert.strictEqual(r.rejected.length, 1, 'terminated generation stays rejected');
  assert.strictEqual(r.pending.length, 1, 'exactly one new pending generation');
  assert.strictEqual(r.pending[0].claim.id, 'c3', 'the post-terminal new claim is canonical, not the old suppressed c2');
});
test('#7 after canonical withdraw, an explicit NEW claim starts a new generation (old suppressed never reused)', function () {
  const c1 = claim('c1', 'Bar', '小美', 3000, 'JPY', '2026-07-20T00:00:00.000Z');
  const c2 = claim('c2', 'Bar', '小美', 3000, 'JPY', '2026-07-20T01:00:00.000Z');
  const w = tomb('w1', 'c1', 'Bar', '撤回結清', '2026-07-20T02:00:00.000Z');
  const c3 = claim('c3', 'Bar', '小美', 3000, 'JPY', '2026-07-20T03:00:00.000Z');
  const r = derive(base.concat([c1, c2, w, c3]));
  assert.strictEqual(r.pending.length, 1, 'exactly one new pending generation');
  assert.strictEqual(r.pending[0].claim.id, 'c3', 'old suppressed c2 is never reused as canonical');
});

// equal-time record.id ASC tie-break (characterization / regression coverage — expected GREEN on add).
test('equal-time tie-break: smaller record.id is canonical when times are identical', function () {
  const t = '2026-07-22T00:00:00.000Z';
  const big = claim('c-zzz', 'Bar', '小美', 3000, 'JPY', t);
  const small = claim('c-aaa', 'Bar', '小美', 3000, 'JPY', t); // identical time, smaller id
  const r = derive([big, small]); // larger id fed first on purpose
  assert.strictEqual(r.pending.length, 1, 'exactly one canonical on equal time');
  assert.strictEqual(r.pending[0].claim.id, 'c-aaa', 'smaller id ASC wins the equal-time tie-break');
  assert(r.__warns.some(function (m) { return m.indexOf('c-zzz') >= 0; }), 'warning names the suppressed larger id');
  const rev = derive([small, big]);
  assert.strictEqual(rev.pending[0].claim.id, 'c-aaa', 'same canonical regardless of input order');
});

// ===== Ticket #7 — Operation reliability: action lock + button state machine + retry-id idempotency =====
const html = appHtml();
const uiSlice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function openLedgerProxyPanel('));

// #1/#2 — pre-await action lock suppresses rapid re-entry (5 taps -> 1 record)
test('#1/#2 action lock: five rapid acquires of one key yield exactly one success', function () {
  const key = mod.settlementClaimLockKey('formal', 'Bar', '小美', 'JPY');
  let ok = 0;
  for (let i = 0; i < 5; i++) { if (mod.settlementActionLock.acquire(key)) ok++; }
  assert.strictEqual(ok, 1, 'only the first rapid tap acquires the lock');
  mod.settlementActionLock.release(key);
  assert.strictEqual(mod.settlementActionLock.acquire(key), true, 'lock is reusable after release');
  mod.settlementActionLock.release(key);
});
test('action lock: distinct pairs are independent', function () {
  const a = mod.settlementClaimLockKey('formal', 'Bar', '小美', 'JPY');
  const b = mod.settlementClaimLockKey('formal', 'Bar', '小明', 'JPY');
  assert.strictEqual(mod.settlementActionLock.acquire(a), true);
  assert.strictEqual(mod.settlementActionLock.acquire(b), true, 'a different pair is not blocked');
  mod.settlementActionLock.release(a); mod.settlementActionLock.release(b);
});
test('#8 confirm and reject share one response lock', function () {
  const rk = mod.settlementResponseLockKey('claim-1');
  assert.strictEqual(mod.settlementResponseLockKey('claim-1'), rk, 'response lock key is stable');
  assert.strictEqual(mod.settlementActionLock.acquire(rk), true, 'confirm acquires the response lock');
  assert.strictEqual(mod.settlementActionLock.acquire(rk), false, 'reject is blocked while confirm holds the shared response lock');
  mod.settlementActionLock.release(rk);
});

// #12 — merged cloud + local queue dedupe by record.id (regression)
test('#12 merged cloud + local queue dedupe by record.id', function () {
  const rec = { id: 'dup-x', time: '2026-07-22T00:00:00.000Z', member: 'Bar' };
  const merged = mod.mergeLedgerRecordSets([rec], [Object.assign({}, rec, { pending: true })], []);
  assert.strictEqual(merged.filter(function (r) { return r.id === 'dup-x'; }).length, 1, 'same id kept once across cloud + queue');
});

// #3/#4 — retry re-sends the SAME record.id (idempotent, no re-mint); offline keeps a single queue record
test('#3/#4 retry reuses the same record.id and offline keeps a single queue record', function () {
  const posted = [];
  let fail = true;
  const repo = mod.createLedgerRepository({
    storage: createStorage(),
    post: function (rec) { posted.push(rec.id); if (fail) { fail = false; return Promise.resolve({ ok: false, error: 'timeout' }); } return Promise.resolve({ ok: true }); },
    now: function () { return 1789000000000; }, random: function () { return 0.5; }
  });
  const rec = { member: 'Bar', category: 'x', detail: 'x', amountJpy: 1, amountTwd: 0, note: '', participants: '["Bar"]', payMethod: '現金', recordType: 'expense', targetRecordId: '', deleteReason: '', batchId: '' };
  return repo.add(rec).then(function () {
    assert.strictEqual(repo.pendingCount(), 1, 'a failed post leaves exactly one queued record');
    return repo.flushQueue();
  }).then(function () {
    assert.strictEqual(posted.length, 2, 'posted initially, then retried');
    assert.strictEqual(posted[0], posted[1], 'retry reuses the same record.id (no re-mint)');
    assert.strictEqual(repo.pendingCount(), 0, 'queue empties after the successful retry');
  });
});

// Source assertions on the settlement UI slice (button state machine + lock wiring)
test('#1/#2/#7 UI: handshake actions acquire the pre-await lock', function () {
  assert(uiSlice.indexOf('settlementActionLock.acquire') >= 0, 'action handlers acquire the lock before the await');
});
test('#6 UI: "我已付款" stays hidden while a pending claim exists (regression)', function () {
  assert(uiSlice.indexOf('!hasPending') >= 0, 'mark-paid is gated on the absence of a pending claim');
});
test('#10 UI: submitting disables the button and shows a spinner', function () {
  assert(uiSlice.indexOf("'submitting'") >= 0, 'the submitting phase is rendered');
  assert(uiSlice.indexOf('button-spinner') >= 0 && uiSlice.indexOf('disabled') >= 0, 'submitting shows a disabled spinner button');
});
test('#11 UI: the post-submit phase is driven by repository delivery and local durability, not the public CSV', function () {
  const append = html.slice(html.indexOf('function settlementRecordIsDurable('), html.indexOf('function ledgerRemarkSettlementPaid('));
  assert(append.indexOf('setSettlementActionPhase') >= 0, 'appendSettlementRecord drives the phase off the repository delivery');
  assert(append.indexOf('settlementRecordIsDurable') >= 0, 'failed requires that neither the queue nor the bridge holds the record');
  assert(append.indexOf('queuedRecords') >= 0 && append.indexOf('ledgerDeliveryBridgeRecords') >= 0, 'durability is checked against both the retry queue and the delivery bridge');
});
test('#17 UI: an unsynced record keeps a persistent wait-for-sync tag until it reads back', function () {
  const tag = html.slice(html.indexOf('function settlementSyncTag('), html.indexOf('function ledgerHandshakeStatusLine('));
  assert(tag.indexOf('view.waitingSync') >= 0, 'the tag is driven by the derived waiting-for-read-back state');
  assert(tag.indexOf('settlementWaitHint') >= 0, 'the wait hint escalates with how long the record has waited');
  assert.strictEqual(mod.settlementWaitHint(0), '等待同步', 'a freshly submitted record reads 等待同步');
});

// ===== Ticket #8 — Personal visibility: per-member filtering of the settlement panel =====
// The panel is now built from settlementPanelModel() upward, so the slice starts there.
const panelSlice = html.slice(html.indexOf('function settlementPanelModel('), html.indexOf('function appendSettlementRecord('));

test('#9 settlementItemsForMember filters transfer suggestions to the current member', function () {
  const items = [
    { from: 'Bar', to: '小美', currency: 'JPY', amount: 100 },
    { from: '小王', to: '小明', currency: 'JPY', amount: 200 }
  ];
  assert.deepStrictEqual(mod.settlementItemsForMember(items, 'Bar').map(function (i) { return i.from + '>' + i.to; }), ['Bar>小美']);
  assert.deepStrictEqual(mod.settlementItemsForMember(items, '小明').map(function (i) { return i.from + '>' + i.to; }), ['小王>小明']);
  assert.strictEqual(mod.settlementItemsForMember(items, '阿明').length, 0, 'an unrelated member sees nothing');
});
test('#9 settlementItemsForMember filters handshake entries (pending/confirmed/rejected)', function () {
  const entries = [
    { claim: { id: 'a' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 100, status: 'pending' },
    { claim: { id: 'b' }, from: '小王', to: '小明', currency: 'JPY', amount: 200, status: 'pending' }
  ];
  assert.strictEqual(mod.settlementItemsForMember(entries, '小美').length, 1);
  assert.strictEqual(mod.settlementItemsForMember(entries, '小美')[0].claim.id, 'a');
  assert.strictEqual(mod.settlementItemsForMember(entries, '阿明').length, 0, 'a third party sees no entry');
});
test('#9 UI: panel filters every section by the current member', function () {
  assert(panelSlice.indexOf('settlementItemsForMember') >= 0, 'panel filters pending/rejected/confirmed/suggestions by member');
});
test('#9 UI: member nets show only the current member (no group-wide leak)', function () {
  assert(panelSlice.indexOf('ledgerSettlementLines(settlement.balances.members)') < 0, 'panel no longer renders every member net');
});
test('#9 UI: empty-state copy when the current member has nothing to handle', function () {
  assert(panelSlice.indexOf('目前沒有需要你處理的結算') >= 0, 'panel shows the approved empty-state copy');
});

/* =====================================================================
   Hotfix:結算狀態、近即時同步與介面簡化
   §2 durable delivery bridge / §3 按鈕狀態 / §4 退回後重新付款 / §5 全序
   §6 跨裝置競態 / §7 ledger fast pull / §8 面板簡化 / §9 撤銷限制
   §11 時鐘偏移 / §12 身分切換 / §13 簡易結算模式
   ===================================================================== */

function freshBridge() { mod.localStorage.removeItem(mod.LEDGER_DELIVERY_BRIDGE_KEY); }
function settlementRepo(options) {
  const opts = options || {};
  return mod.createLedgerRepository({
    storage: opts.storage || createStorage(),
    post: opts.post || function () { return Promise.resolve({ ok: true }); },
    onDelivered: opts.onDelivered || mod.rememberLedgerDeliveryBridge,
    now: function () { return 1789000000000; },
    random: function () { return 0.5; }
  });
}

// ===== §2 Durable delivery bridge =====

// The bridge lives in one shared sandbox localStorage, and these async cases resolve after every
// synchronous case has run — so they assert on their own record.id rather than on a total count.
function bridgeEntry(id) {
  return mod.ledgerDeliveryBridgeRecords().filter(function (r) { return r.id === id; })[0] || null;
}

test('#1 claim POST accepted but not yet read back: the record survives in the delivery bridge', function () {
  const repo = settlementRepo();
  const rec = claim('bridge-claim', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
  return repo.add(rec).then(function () {
    assert.strictEqual(repo.pendingCount(), 0, 'accepted record leaves the retry queue');
    const held = bridgeEntry('bridge-claim');
    assert.ok(held, 'the accepted claim is held by the bridge');
    assert.strictEqual(held.recordType, 'settlement_claim', 'the bridge stores the complete record, not just the id');
    assert.strictEqual(held.participants, JSON.stringify(['小美']), 'the whole record is retained');
  });
});

test('#2/#3 confirm and reject POSTs are held by the same bridge until read back', function () {
  const repo = settlementRepo();
  return repo.add(confirmRec('bridge-confirm', 'c-1', '小美', '2026-07-25T00:01:00.000Z')).then(function () {
    return repo.add(rejectRec('bridge-reject', 'c-2', '小美', '未收到', '2026-07-25T00:02:00.000Z'));
  }).then(function () {
    assert.strictEqual((bridgeEntry('bridge-confirm') || {}).recordType, 'settlement_confirm', 'confirm 進入 bridge');
    assert.strictEqual((bridgeEntry('bridge-reject') || {}).recordType, 'settlement_reject', 'reject 進入 bridge');
    assert.strictEqual((bridgeEntry('bridge-reject') || {}).note, '未收到', '退回原因隨紀錄保留');
  });
});

test('#8 the bridge supports every append-based handshake operation (withdraw / revoke deletions included)', function () {
  freshBridge();
  ['settlement_claim', 'settlement_confirm', 'settlement_reject', 'deletion', 'expense'].forEach(function (type, index) {
    assert.strictEqual(
      mod.rememberLedgerDeliveryBridge({ id: 'op-' + index, time: '2026-07-25T00:0' + index + ':00.000Z', recordType: type, member: 'Bar' }),
      true,
      type + ' 可由 bridge 持久化'
    );
  });
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords().length, 5, 'every handshake operation type is retained');
});

test('#4 the bridge survives a reload (it is durable storage, not in-memory state)', function () {
  freshBridge();
  mod.rememberLedgerDeliveryBridge(claim('reload-claim', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z'));
  const raw = mod.localStorage.getItem(mod.LEDGER_DELIVERY_BRIDGE_KEY);
  assert.ok(raw && JSON.parse(raw).length === 1, 'the bridge is persisted to durable storage');
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords()[0].id, 'reload-claim', 're-reading storage restores the record');
});

test('#5 the bridge clears a record only once the remote read model returns the same record.id', function () {
  freshBridge();
  const rec = claim('readback-claim', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
  mod.rememberLedgerDeliveryBridge(rec);
  mod.reconcileLedgerDeliveryBridge([claim('other', 'Bar', '小美', 1, 'JPY', '2026-07-25T00:00:00.000Z')]);
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords().length, 1, 'an unrelated remote record does not clear the bridge');
  mod.reconcileLedgerDeliveryBridge([rec]);
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords().length, 0, 'the same record.id read back clears the bridge');
});

test('#8 the bridge never self-expires, however long it waits', function () {
  freshBridge();
  mod.rememberLedgerDeliveryBridge(claim('old-claim', 'Bar', '小美', 3000, 'JPY', '2020-01-01T00:00:00.000Z'));
  mod.reconcileLedgerDeliveryBridge([]);
  mod.reconcileLedgerDeliveryBridge([]);
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords().length, 1, 'waiting a long time must not drop the record');
});

test('#6 cloud + queue + bridge holding the same id display exactly one record', function () {
  const rec = claim('triple', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
  const merged = mod.mergeLedgerRecordSets([rec], [Object.assign({}, rec, { pending: true })], [Object.assign({}, rec, { bridgePending: true })]);
  assert.strictEqual(merged.filter(function (r) { return r.id === 'triple'; }).length, 1, 'one id yields one row');
});

test('#7 atomic handoff: a record leaves the retry queue only AFTER the bridge persists it', function () {
  freshBridge();
  const repo = settlementRepo({ onDelivered: function () { return false; } });
  const rec = claim('handoff-fail', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
  return repo.add(rec).then(function (delivery) {
    assert.strictEqual(repo.pendingCount(), 1, 'a failed bridge write keeps the record in the retry queue (no data-loss window)');
    assert.strictEqual(delivery.ok, false, 'the delivery is not reported as complete');
  });
});

test('#7 atomic handoff: a throwing bridge write is treated as failure, not success', function () {
  freshBridge();
  const repo = settlementRepo({ onDelivered: function () { throw new Error('quota exceeded'); } });
  return repo.add(claim('handoff-throw', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z')).then(function () {
    assert.strictEqual(repo.pendingCount(), 1, 'a throwing bridge write keeps the record queued');
  });
});

test('#7 rememberLedgerDeliveryBridge reports failure when persistence cannot be verified', function () {
  const original = mod.localStorage.setItem;
  mod.localStorage.setItem = function () { throw new Error('QuotaExceededError'); };
  try {
    assert.strictEqual(mod.rememberLedgerDeliveryBridge(claim('quota', 'Bar', '小美', 1, 'JPY', '2026-07-25T00:00:00.000Z')), false, 'a failed write returns false');
  } finally { mod.localStorage.setItem = original; }
});

// ===== §5 事件排序與同毫秒競態 =====

test('#21/#22 generation close uses the full (time,id) comparator, not time alone', function () {
  const t = '2026-07-25T00:00:00.000Z';
  assert.ok(mod.compareSettlementEvents(t, 'a', t, 'b') < 0, 'equal time falls back to record.id');
  assert.ok(mod.compareSettlementEvents(t, 'b', t, 'a') > 0, 'the comparator is antisymmetric');
  assert.strictEqual(mod.compareSettlementEvents(t, 'a', t, 'a'), 0, 'identical positions compare equal');
  assert.ok(mod.compareSettlementEvents('2026-07-25T00:00:00.000Z', 'z', '2026-07-25T00:00:01.000Z', 'a') < 0, 'time dominates id');
});

test('#21 reject.time === newClaim.time: the id tie-break opens a NEW generation when the claim sorts after', function () {
  const t = '2026-07-25T02:00:00.000Z';
  const res = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('r-1', 'c-1', '小美', '金額不對', t),
    claim('z-claim', 'Bar', '小美', 3000, 'JPY', t)  // same millisecond as the reject, and 'z-claim' > 'r-1'
  ]));
  assert.strictEqual(res.pending.length, 1, 'the new claim is NOT silently suppressed by a same-millisecond reject');
  assert.strictEqual(res.pending[0].claim.id, 'z-claim', 'the new claim opens the next generation');
  assert.strictEqual(res.rejected.length, 1, 'the old rejected generation is retained');
});

test('#21 same millisecond, claim id sorts BEFORE the terminal event: still the old generation (suppressed)', function () {
  const t = '2026-07-25T02:00:00.000Z';
  const res = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('z-reject', 'c-1', '小美', '金額不對', t),
    claim('a-claim', 'Bar', '小美', 3000, 'JPY', t)  // 'a-claim' < 'z-reject'
  ]));
  assert.strictEqual(res.pending.length, 0, 'a claim at or before the terminal position stays suppressed');
});

test('#22 withdraw terminal position also uses (time,id)', function () {
  const t = '2026-07-25T02:00:00.000Z';
  const res = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    tomb('a-tomb', 'c-1', 'Bar', '撤回結清', t),
    claim('c-2', 'Bar', '小美', 3000, 'JPY', t)
  ]));
  assert.strictEqual(res.pending.length, 1, 'a new claim after the withdraw position opens a new generation');
  assert.strictEqual(res.pending[0].claim.id, 'c-2');
});

// ===== §6 跨裝置 confirm／reject 競態 =====

test('#23/#24 concurrent confirm + reject converge on one canonical response; the loser is inert and warned', function () {
  const t = '2026-07-25T02:00:00.000Z';
  const records = base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    confirmRec('a-confirm', 'c-1', '小美', t),
    rejectRec('b-reject', 'c-1', '小美', '未收到', t)
  ]);
  const forward = derive(records);
  const reverse = derive(records.slice().reverse());
  assert.strictEqual(forward.entries.length, 1, 'exactly one canonical entry');
  assert.strictEqual(forward.entries[0].status, 'confirmed', 'the (time,id)-earliest response wins');
  assert.strictEqual(forward.entries[0].response.id, 'a-confirm');
  assert.strictEqual(reverse.entries[0].response.id, 'a-confirm', 'both devices converge regardless of input order');
  assert.ok(forward.__warns.some(function (w) { return w.indexOf('b-reject') >= 0; }), 'the losing response produces a diagnostic warning');
});

test('#24 the losing response never changes a balance and never enters history', function () {
  const t = '2026-07-25T02:00:00.000Z';
  const records = base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('a-reject', 'c-1', '小美', '未收到', t),
    confirmRec('b-confirm', 'c-1', '小美', t)
  ]);
  const res = derive(records);
  assert.strictEqual(res.confirmed.length, 0, 'the losing confirm does not confirm the claim');
  assert.strictEqual(res.rejected.length, 1, 'the canonical reject wins');
  assert.strictEqual(barNet(records, res.confirmed), -3000, 'the losing confirm is inert on the balance');
});

// ===== §4 退回後重新付款 / §8 主面板只顯示最新可操作 generation =====

const rejectedThenRepaid = base.concat([
  claim('gen1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
  rejectRec('gen1-reject', 'gen1', '小美', '金額不對', '2026-07-25T02:00:00.000Z'),
  claim('gen2', 'Bar', '小美', 3000, 'JPY', '2026-07-25T03:00:00.000Z')
]);

test('#14/#15/#16 a rejected claim can be re-paid: a NEW record.id opens a NEW generation', function () {
  const res = derive(rejectedThenRepaid);
  assert.strictEqual(res.pending.length, 1, 'the re-mark produces a pending claim');
  assert.strictEqual(res.pending[0].claim.id, 'gen2', 'the new claim uses a new record.id');
  assert.strictEqual(res.rejected.length, 1, 'the old rejected generation is preserved for history');
});

test('#18 a suppressed duplicate is never promoted by the new generation', function () {
  const res = derive(rejectedThenRepaid.concat([
    claim('dup', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:30:00.000Z')  // suppressed inside gen1
  ]));
  assert.strictEqual(res.entries.filter(function (e) { return e.claim.id === 'dup'; }).length, 0, 'the suppressed duplicate stays inert');
  assert.strictEqual(res.pending.length, 1, 'only the honest new generation is pending');
});

test('#19/#42 每個 settlement key 只顯示最新可操作 generation,較舊者移入歷史', function () {
  const res = derive(rejectedThenRepaid);
  const latest = mod.latestSettlementGenerations(res);
  assert.strictEqual(latest.length, 1, 'one settlement key yields exactly one actionable row');
  assert.strictEqual(latest[0].claim.id, 'gen2', 'the newest generation is the actionable one');
  // join() rather than deepStrictEqual: arrays built inside the vm realm have a foreign prototype.
  const history = mod.olderSettlementGenerations(res);
  assert.strictEqual(history.map(function (e) { return e.claim.id; }).join(','), 'gen1', 'the older rejected generation moves to history');
});

test('#19 only the newest rejected generation may offer 重新標記已付款', function () {
  const twoRejects = base.concat([
    claim('r1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('r1-x', 'r1', '小美', '金額不對', '2026-07-25T02:00:00.000Z'),
    claim('r2', 'Bar', '小美', 3000, 'JPY', '2026-07-25T03:00:00.000Z'),
    rejectRec('r2-x', 'r2', '小美', '重複', '2026-07-25T04:00:00.000Z')
  ]);
  const res = derive(twoRejects);
  const latest = mod.latestSettlementGenerations(res);
  assert.strictEqual(latest.length, 1);
  assert.strictEqual(latest[0].claim.id, 'r2', 'only the newest rejected generation is actionable');
  assert.strictEqual(mod.settlementEntryStatus(latest[0], 'Bar').canRemark, true, 'the payer may re-mark the newest rejection');
  assert.strictEqual(mod.settlementEntryStatus(mod.olderSettlementGenerations(res)[0], 'Bar').canRemark, false, 'older rejections may not be re-marked');
});

// ===== §3 狀態文案與按鈕顯示 =====

test('#9 claim: before read-back the payer sees 等待對方確認, never 我已付款 again', function () {
  const pendingEntry = { claim: { id: 'c-1', pending: true }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'pending', latest: true };
  const view = mod.settlementEntryStatus(pendingEntry, 'Bar');
  assert.strictEqual(view.label, '等待對方確認', 'the payer sees the submitted status');
  assert.strictEqual(view.waitingSync, true, 'a not-yet-read-back record shows 等待同步');
  assert.strictEqual(view.canClaim, false, '我已付款 must not come back while a claim is open');
});

test('#10/#11 confirm and reject disappear the moment a response is submitted', function () {
  const entry = { claim: { id: 'c-1' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'pending', latest: true };
  const idle = mod.settlementEntryStatus(entry, '小美');
  assert.strictEqual(idle.label, '待你確認');
  assert.strictEqual(idle.canRespond, true, 'the receiver may confirm or reject while pending');
  const submitting = mod.settlementEntryStatus(entry, '小美', { phase: 'submitting' });
  assert.strictEqual(submitting.label, '送出中…');
  assert.strictEqual(submitting.canRespond, false, 'both confirm and reject vanish while submitting');
});

test('#10 confirmed but not yet read back: 已確認・同步中, no action buttons', function () {
  const entry = { claim: { id: 'c-1' }, response: { id: 'r-1', recordType: 'settlement_confirm', pending: true }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'confirmed', latest: true };
  const view = mod.settlementEntryStatus(entry, '小美');
  assert.strictEqual(view.label, '已確認・同步中');
  assert.strictEqual(view.canRespond, false, 'confirm/reject stay gone before read-back');
  const synced = mod.settlementEntryStatus({ claim: { id: 'c-1' }, response: { id: 'r-1', recordType: 'settlement_confirm' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'confirmed', latest: true }, '小美');
  assert.strictEqual(synced.label, '已完成', 'once read back the entry reads 已完成');
});

test('#11 rejected but not yet read back: 已退回・同步中; the payer sees 對方已退回', function () {
  const entry = { claim: { id: 'c-1' }, response: { id: 'r-1', recordType: 'settlement_reject', note: '未收到', pending: true }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'rejected', latest: true };
  assert.strictEqual(mod.settlementEntryStatus(entry, '小美').label, '已退回・同步中');
  const settled = { claim: { id: 'c-1' }, response: { id: 'r-1', recordType: 'settlement_reject', note: '未收到' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'rejected', latest: true };
  const payerView = mod.settlementEntryStatus(settled, 'Bar');
  assert.strictEqual(payerView.label, '對方已退回');
  assert.strictEqual(payerView.reason, '未收到', 'the payer sees the rejection reason');
  assert.strictEqual(payerView.canRemark, true, 'the payer may 重新標記已付款');
});

test('#13 failed never silently returns to a plain action button', function () {
  const entry = { claim: { id: 'c-1' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'pending', latest: true };
  const failed = mod.settlementEntryStatus(entry, 'Bar', { phase: 'failed' });
  assert.strictEqual(failed.label, '同步失敗・重新同步');
  assert.strictEqual(failed.canClaim, false, 'a failed action does not restore the ordinary button');
  assert.strictEqual(failed.canRetry, true, 'failed offers an explicit re-sync action');
});

test('#12 five rapid taps still produce exactly one record', function () {
  const key = mod.settlementClaimLockKey('formal', 'Bar', '小美', 'JPY');
  const wins = [0, 1, 2, 3, 4].filter(function () { return mod.settlementActionLock.acquire(key); });
  mod.settlementActionLock.release(key);
  assert.strictEqual(wins.length, 1, 'only one of five rapid taps acquires the lock');
});

// ===== §9 已確認結算的 10 秒一次性復原 =====
// 產品裁定(取代原 24 小時撤銷):確認送出後只在操作裝置給 10 秒 action toast;
// 逾時即為終局,結清歷史不得再提供任何永久撤銷／復原入口。

const UNDO_WINDOW = 10 * 1000;
const confirmTime = '2026-07-25T00:00:00.000Z';
const confirmAt = Date.parse(confirmTime);
function confirmedEntry(id, time, key) {
  return {
    key: key || 'formal Bar 小美 JPY', claim: { id: id, time: '2026-07-25T00:00:00.000Z' },
    claimPos: { time: '2026-07-25T00:00:00.000Z', id: id },
    from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'confirmed',
    response: { id: id + '-resp', recordType: 'settlement_confirm', time: time }
  };
}
function generationEntry(id, time, status) {
  return {
    key: 'formal Bar 小美 JPY', claim: { id: id, time: time }, claimPos: { time: time, id: id },
    from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: status
  };
}
// confirm 被 deletion 撤銷後,同一 claim 會重新推導成 pending —— eligibility 由此判定 already-undone。
function undoneEntry(id) {
  const entry = generationEntry(id, '2026-07-25T00:00:00.000Z', 'pending');
  entry.claim = { id: id, time: '2026-07-25T00:00:00.000Z' };
  entry.response = null;
  return entry;
}
const lone = confirmedEntry('c-1', confirmTime);

test('#3 9,999ms 內可復原', function () {
  const r = mod.settlementConfirmUndoEligibility(lone, [lone], '小美', confirmAt + UNDO_WINDOW - 1);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.reason, 'allowed');
  assert.strictEqual(r.expiresAt, confirmAt + UNDO_WINDOW, 'expiresAt 為 response.time 後正好 10 秒');
});
test('#4 正好 10,000ms 仍可復原', function () {
  assert.strictEqual(mod.settlementConfirmUndoEligibility(lone, [lone], '小美', confirmAt + UNDO_WINDOW).allowed, true);
});
test('#5 10,001ms 不可復原', function () {
  const r = mod.settlementConfirmUndoEligibility(lone, [lone], '小美', confirmAt + UNDO_WINDOW + 1);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.reason, 'expired');
});
test('#6 response.time 無效或位於明顯未來不可復原', function () {
  const broken = confirmedEntry('c-broken', 'not-a-time');
  assert.strictEqual(mod.settlementConfirmUndoEligibility(broken, [broken], '小美', confirmAt).reason, 'invalid');
  const empty = confirmedEntry('c-empty', '');
  assert.strictEqual(mod.settlementConfirmUndoEligibility(empty, [empty], '小美', confirmAt).reason, 'invalid');
  const future = confirmedEntry('c-future', '2026-07-25T01:00:00.000Z');   // 比 now 早了一小時的未來
  assert.strictEqual(mod.settlementConfirmUndoEligibility(future, [future], '小美', confirmAt).reason, 'invalid',
    '明顯位於未來的 response.time 不得用來延長復原期限');
});
test('#6 期限比較使用 ISO record.time,不依顯示時區字串', function () {
  const utc = confirmedEntry('c-utc', '2026-07-25T00:00:00.000Z');
  const offset = confirmedEntry('c-off', '2026-07-25T09:00:00+09:00');   // 同一瞬間、另一個 offset 寫法
  assert.strictEqual(mod.settlementConfirmUndoEligibility(offset, [offset], '小美', confirmAt + UNDO_WINDOW).expiresAt,
    mod.settlementConfirmUndoEligibility(utc, [utc], '小美', confirmAt + UNDO_WINDOW).expiresAt);
  assert.strictEqual(mod.settlementConfirmUndoEligibility(offset, [offset], '小美', confirmAt + UNDO_WINDOW + 1).reason, 'expired');
});
test('#7 非原收款者不可復原', function () {
  assert.strictEqual(mod.settlementConfirmUndoEligibility(lone, [lone], 'Bar', confirmAt).reason, 'not-receiver');
  assert.strictEqual(mod.settlementConfirmUndoEligibility(lone, [lone], '小王', confirmAt).reason, 'not-receiver');
});
test('#8 已被撤銷的 confirm 不可再次復原', function () {
  const entry = confirmedEntry('c-undone', confirmTime);
  const rederived = undoneEntry('c-undone');   // 同一 claim 已回到 pending
  const r = mod.settlementConfirmUndoEligibility(entry, [rederived], '小美', confirmAt + 1000);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.reason, 'already-undone');
});
test('#15 後續已有新 generation 時,即使未滿 10 秒也不可復原', function () {
  const older = confirmedEntry('c-old', confirmTime);
  const followUps = {
    pending: generationEntry('c-new', '2026-07-25T00:00:03.000Z', 'pending'),
    rejected: generationEntry('c-new', '2026-07-25T00:00:03.000Z', 'rejected'),
    confirmed: confirmedEntry('c-new', '2026-07-25T00:00:04.000Z'),
    withdrawn: generationEntry('c-new', '2026-07-25T00:00:03.000Z', 'withdrawn')
  };
  followUps.confirmed.claimPos = { time: '2026-07-25T00:00:03.000Z', id: 'c-new' };
  Object.keys(followUps).forEach(function (kind) {
    const r = mod.settlementConfirmUndoEligibility(older, [older, followUps[kind]], '小美', confirmAt + 5000);
    assert.strictEqual(r.allowed, false, '後續 ' + kind + ' generation 阻擋舊確認的復原');
    assert.strictEqual(r.reason, 'superseded', '阻擋理由為 superseded,不是 expired');
  });
});
test('#16 直接呼叫 handler 超過 10 秒仍被阻擋', function () {
  const handler = html.slice(html.indexOf('function ledgerUndoSettlementConfirm('), html.indexOf('function openLedgerProxyPanel('));
  assert.ok(handler.indexOf('settlementConfirmUndoEligibility(') >= 0, 'handler 必須重新呼叫資格檢查,不得只依賴 toast 隱藏');
  assert.ok(handler.indexOf('deriveSettlements(mergedLedgerRecords()') >= 0, '資格以當下 ledger 事件重新推導,不吃 toast 當時的快照');
  assert.ok(handler.indexOf('settlementUndoLockKey(') >= 0, '復原使用獨立且穩定的 action lock');
  assert.ok(handler.indexOf('settlementUndoBlockMessage(') >= 0, '被阻擋時輸出核准阻擋訊息');
  // 純函式層面:超過期限一律 expired,與 UI 是否仍顯示按鈕無關。
  assert.strictEqual(mod.settlementConfirmUndoEligibility(lone, [lone], '小美', confirmAt + 60 * 60 * 1000).reason, 'expired');
});
test('#5/#7/#8 無效輸入預設不允許', function () {
  assert.strictEqual(mod.settlementConfirmUndoEligibility(null, [], '小美', confirmAt).reason, 'invalid');
  const pendingEntry = generationEntry('p', confirmTime, 'pending');
  assert.strictEqual(mod.settlementConfirmUndoEligibility(pendingEntry, [pendingEntry], '小美', confirmAt).reason, 'invalid', '非 confirmed entry 無效');
  const rejectedResponse = confirmedEntry('rr', confirmTime);
  rejectedResponse.response.recordType = 'settlement_reject';
  assert.strictEqual(mod.settlementConfirmUndoEligibility(rejectedResponse, [rejectedResponse], '小美', confirmAt).reason, 'invalid', 'response 必須是有效 settlement_confirm');
});
test('#4 阻擋訊息為核准原文', function () {
  assert.strictEqual(mod.settlementUndoBlockMessage('expired'), '復原期限已結束，此筆收款確認已完成');
  assert.strictEqual(mod.settlementUndoBlockMessage('superseded'), '此筆已有後續結算，無法復原舊確認');
  assert.strictEqual(mod.settlementUndoBlockMessage('not-receiver'), '只有原收款者可以復原確認');
  assert.strictEqual(mod.settlementUndoBlockMessage('already-undone'), '此筆確認已經復原');
  assert.strictEqual(mod.settlementUndoBlockMessage('invalid'), '此筆結算狀態無法復原');
});
test('#2 Toast 的復原期限基於 settlement_confirm response.time,顯示延遲不得延長', function () {
  assert.strictEqual(mod.settlementUndoToastDurationMs({ time: confirmTime }, confirmAt), UNDO_WINDOW);
  assert.strictEqual(mod.settlementUndoToastDurationMs({ time: confirmTime }, confirmAt + 4000), 6000,
    'toast 顯示得晚,只剩下 record.time 起算的剩餘時間');
  assert.strictEqual(mod.settlementUndoToastDurationMs({ time: confirmTime }, confirmAt + UNDO_WINDOW + 1), 0,
    '已逾期不再給任何復原時間');
  assert.strictEqual(mod.settlementUndoToastDurationMs({ time: 'not-a-time' }, confirmAt), 0);
  assert.strictEqual(mod.settlementUndoToastDurationMs(null, confirmAt), 0);
});

test('#1 confirm 安全保存後顯示「已確認收款」＋10 秒一次性「復原」', function () {
  const slice = html.slice(html.indexOf('function ledgerConfirmSettlementClaim('), html.indexOf('function closeSettlementRejectDialog('));
  assert.ok(slice.indexOf("'已確認收款'") >= 0, '完成訊息沿用核准文案');
  assert.ok(slice.indexOf("'復原'") >= 0, 'toast 提供「復原」動作');
  assert.ok(slice.indexOf('ledgerUndoSettlementConfirm(') >= 0, '復原動作指向 10 秒一次性復原 handler');
  assert.ok(slice.indexOf('settlementUndoToastDurationMs(') >= 0, 'toast 期限由 response.time 決定,不重新起算');
  assert.ok(slice.indexOf('durable') >= 0, '只有安全保存(POST accepted 或 durable queue)後才提供復原');
  assert.ok(slice.indexOf('確認後雙方淨額會立即抵銷') >= 0, '保留既有二次確認視窗');
});

test('#1 復原 toast 必須浮在所有 overlay 之上,否則使用者看不到也點不到', function () {
  // Bar 真機回報:確認已收後仍停留在「團體結算」sheet,底部 toast 完全看不見。
  // 主因是 .toast z-index 90 低於 .ledger-sheet-overlay 135(以及其他每一層 overlay)。
  const toastRule = /\.toast\{[^}]*\}/.exec(html);
  assert.ok(toastRule, '.toast 樣式存在');
  const toastZ = Number(/z-index:\s*(-?\d+)/.exec(toastRule[0])[1]);
  const all = [];
  const zRe = /z-index:\s*(-?\d+)/g;
  let m;
  while ((m = zRe.exec(html)) !== null) all.push(Number(m[1]));
  assert.strictEqual(Math.max.apply(null, all), toastZ,
    'toast 必須是最上層:目前最高層為 ' + Math.max.apply(null, all) + '、toast 為 ' + toastZ);
  assert.strictEqual(all.filter(function (z) { return z === toastZ; }).length, 1,
    '不得有其他圖層與 toast 同高 —— 同高時由 DOM 順序決定勝負,結果不可預測');
  assert.ok(/\.toast\.has-action\{[^}]*pointer-events:auto/.test(html), '帶動作的 toast 必須可點擊');
});

test('#1 只有這筆是最後一筆待處理時才自動收起結算面板', function () {
  assert.strictEqual(mod.settlementPanelShouldClose(0, true), true, '沒有任何待處理列 → 收起面板,復原 toast 全螢幕不被遮擋');
  assert.strictEqual(mod.settlementPanelShouldClose(1, true), false, '還有其他待處理項目一律不關,不得逼使用者逐筆重開面板');
  assert.strictEqual(mod.settlementPanelShouldClose(5, true), false);
  assert.strictEqual(mod.settlementPanelShouldClose(0, false), false, '面板本來就沒開,不做任何事');
  // 算不出列數時保守不關 —— 誤關會讓使用者以為操作沒生效。
  assert.strictEqual(mod.settlementPanelShouldClose(undefined, true), false);
  assert.strictEqual(mod.settlementPanelShouldClose(null, true), false);
  assert.strictEqual(mod.settlementPanelShouldClose('', true), false);
});

test('#1 自動關閉的列數與主面板實際列出的列數同源', function () {
  // 兩邊各算一套,就會出現「面板還列著東西卻被自動關掉」。
  assert.ok(html.indexOf('function settlementActionableRows(') >= 0, '列表建構抽成具名函式');
  const render = html.slice(html.indexOf('function renderSettlementPanelBody('), html.indexOf('function renderSimpleSettlementPanelBody('));
  assert.ok(render.indexOf('settlementActionableRows(model)') >= 0, '主面板由該函式產生列表');
  assert.ok(!/rows\.push\(/.test(render) && !/rows\.sort\(/.test(render), '主面板不再自行組列表');
  const closer = html.slice(html.indexOf('function closeSettlementPanelWhenDone('), html.indexOf('function openLedgerSettlementPanel('));
  assert.ok(closer.indexOf('settlementActionableRows(settlementPanelModel())') >= 0, '關閉判斷取用同一份列表');
  assert.ok(closer.indexOf('settlementPanelShouldClose(') >= 0, '關閉條件走純函式,不在 UI 層另立規則');
  assert.ok(closer.indexOf('ledgerSettlementPanelOpen()') >= 0, '只有結算面板開著時才處理');
  assert.ok(closer.indexOf('closeLedgerInfoSheet()') >= 0, '沿用既有 sheet 關閉流程');
  assert.ok(/catch\s*\([^)]*\)\s*\{\s*return false;/.test(closer), '算不出列數時保守不關');
  const confirm = html.slice(html.indexOf('function ledgerConfirmSettlementClaim('), html.indexOf('function closeSettlementRejectDialog('));
  assert.ok(confirm.indexOf('closeSettlementPanelWhenDone()') >= 0, '確認完成後才判斷是否收起面板');
});

test('#9 同一 response 快速連點復原五次,只建立一筆 deletion record', function () {
  const key = mod.settlementUndoLockKey('resp-1');
  assert.strictEqual(key, mod.settlementUndoLockKey('resp-1'), '復原鎖以 response.id 為穩定 key');
  assert.ok(key.indexOf('resp-1') >= 0 && key !== mod.settlementResponseLockKey('resp-1'),
    '復原鎖獨立於 confirm／reject 共用的 response lock');
  const wins = [0, 1, 2, 3, 4].filter(function () { return mod.settlementActionLock.acquire(key); });
  assert.strictEqual(wins.length, 1, '五次連點只有一次取得鎖');
  assert.strictEqual(mod.settlementActionLock.acquire(mod.settlementUndoLockKey('resp-2')), true, '不同 response 的復原互不阻擋');
  mod.settlementActionLock.release(key);
  mod.settlementActionLock.release(mod.settlementUndoLockKey('resp-2'));
});

// ---- append-only 復原的資料語意 ----
const undoClaim = claim('u-c1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
const undoConfirm = confirmRec('u-cf', 'u-c1', '小美', '2026-07-25T00:01:00.000Z');
const undoRecord = mod.createLedgerDeletion(undoConfirm, '小美', '復原確認', Date.parse('2026-07-25T00:01:05.000Z'));

test('#10 復原 record.targetRecordId 等於 settlement_confirm response.id', function () {
  assert.strictEqual(undoRecord.recordType, 'deletion');
  assert.strictEqual(undoRecord.targetRecordId, 'u-cf');
  assert.ok(undoRecord.id && undoRecord.id !== undoConfirm.id, 'confirm 與 undo 各自保留穩定且相異的 record.id');
});
test('#11 復原不得刪除或修改原 settlement_confirm', function () {
  assert.strictEqual(undoConfirm.recordType, 'settlement_confirm', '原 confirm 型別未被改寫');
  assert.strictEqual(undoConfirm.targetRecordId, 'u-c1', '原 confirm 仍指向原 claim');
  assert.strictEqual(undoClaim.recordType, 'settlement_claim', 'claim 未被改寫');
  const records = base.concat([undoClaim, undoConfirm, undoRecord]);
  assert.strictEqual(records.filter(function (r) { return r.id === 'u-cf'; }).length, 1, '原 confirm 仍留在 append-only 事件流中');
});
test('#12/#23 復原後款項回到待確認,被復原的 confirm 不再計入 confirmed', function () {
  const records = base.concat([undoClaim, undoConfirm, undoRecord]);
  const r = derive(records);
  assert.strictEqual(r.confirmed.length, 0, '被復原的 confirm 不是有效 confirmed settlement');
  assert.strictEqual(r.pending.length, 1, '款項回到待確認');
  assert.strictEqual(r.pending[0].claim.id, 'u-c1', '回到的是同一筆 claim,不是新開 generation');
  assert.strictEqual(mod.settlementEntryStatus(r.pending[0], '小美').canRespond, true, '原收款者可再次確認或退回');
  assert.strictEqual(barNet(records, r.confirmed), -3000, '餘額由推導回復,不得手動改寫');
});
test('#13 confirm 與 undo 分別在 queue／bridge 時仍正確推導', function () {
  const queued = Object.assign({}, undoRecord, { pending: true });
  const bridged = Object.assign({}, undoConfirm, { bridgePending: true });
  const merged = mod.mergeLedgerRecordSets(base.concat([undoClaim]), [queued], [bridged]);
  assert.strictEqual(merged.filter(function (r) { return r.id === 'u-cf'; }).length, 1, '相同 id 在 cloud／queue／bridge 只合併一次');
  const r = derive(merged);
  assert.strictEqual(r.confirmed.length, 0);
  assert.strictEqual(r.pending.length, 1, 'queue／bridge 中的 undo 仍讓款項回到待確認');
});
test('#14 remote read-back 後所有裝置收斂為 pending(與輸入順序無關)', function () {
  const orders = [
    base.concat([undoClaim, undoConfirm, undoRecord]),
    base.concat([undoRecord, undoConfirm, undoClaim]),
    [undoRecord].concat(base, [undoClaim, undoConfirm]),
    [undoConfirm, undoRecord].concat(base, [undoClaim])
  ];
  orders.forEach(function (records, index) {
    const r = derive(records);
    assert.strictEqual(r.confirmed.length, 0, '順序 ' + index + ':不得殘留 confirmed');
    assert.strictEqual(r.pending.length, 1, '順序 ' + index + ':收斂為同一筆 pending');
    assert.strictEqual(r.pending[0].claim.id, 'u-c1');
  });
});
test('#21 正式／測試 universe 隔離不退化', function () {
  const testClaim = Object.assign({}, undoClaim, { id: 't-c1', detail: '[TEST] ' + undoClaim.detail });
  const testConfirm = Object.assign({}, undoConfirm, { id: 't-cf', targetRecordId: 't-c1', detail: '[TEST] [結清確認]' });
  const records = base.concat([undoClaim, undoConfirm, undoRecord, testClaim, testConfirm]);
  assert.strictEqual(derive(records).entries.length, 1, '正式宇宙看不到測試結算');
  const testUniverse = mod.deriveSettlements(records, null, 'test');
  assert.strictEqual(testUniverse.confirmed.length, 1, '測試宇宙的確認不受正式宇宙復原影響');
});
test('#22 只有 confirmed 才改變淨額', function () {
  const claimOnly = base.concat([undoClaim]);
  assert.strictEqual(barNet(claimOnly, derive(claimOnly).confirmed), -3000, 'pending 不改變淨額');
  const settled = base.concat([undoClaim, undoConfirm]);
  assert.strictEqual(barNet(settled, derive(settled).confirmed), 0, 'confirmed 才抵銷淨額');
});
test('#25 currentMember 可見範圍不退化', function () {
  const r = derive(base.concat([undoClaim, undoConfirm]));
  assert.strictEqual(mod.settlementItemsForMember(r.entries, '小美').length, 1, '收款者看得到本筆');
  assert.strictEqual(mod.settlementItemsForMember(r.entries, 'Bar').length, 1, '付款者看得到本筆');
  assert.strictEqual(mod.settlementItemsForMember(r.entries, '小王').length, 0, '第三人不進 DOM 產生範圍');
});

// ---- §7 歷史介面:只呈現事實,不提供永久修改操作 ----
test('#17/#18 歷史介面不得輸出「撤銷確認」或長期「復原」按鈕', function () {
  const historyLine = html.slice(html.indexOf('function ledgerHandshakeHistoryLine('), html.indexOf('function ledgerSettleSuggestionLines('));
  assert.ok(historyLine.indexOf('撤銷') < 0, '結清歷史不得出現撤銷字樣');
  assert.ok(historyLine.indexOf('復原') < 0, '結清歷史不得出現永久復原入口');
  assert.ok(historyLine.indexOf('<button') < 0, '歷史列不輸出任何操作按鈕');
  assert.ok(historyLine.indexOf('Eligibility(') < 0, '歷史列不再依資格輸出操作');
  assert.ok(historyLine.indexOf('已完成時間') >= 0 || historyLine.indexOf('formatLedgerSyncRecordTime') >= 0,
    '已確認且未復原者顯示完成時間');
  assert.ok(html.indexOf('ledgerRevokeSettlementConfirm') < 0, '永久撤銷 handler 必須完全移除');
  assert.ok(html.indexOf('settlementConfirmRevokeEligibility') < 0, '24 小時撤銷資格函式必須完全移除');
  assert.ok(html.indexOf('SETTLEMENT_REVOKE_WINDOW_MS') < 0, '24 小時視窗常數必須完全移除');
  assert.ok(html.indexOf('24 小時') < 0, '不得殘留 24 小時撤銷文案');
});
test('#19 reload 後不重新產生 10 秒復原入口', function () {
  // 復原入口只由 confirm handler 當次 toast 建立;歷史、面板與任何持久化狀態都不得重建它。
  const undoCallers = html.split('ledgerUndoSettlementConfirm(').length - 1;
  assert.strictEqual(undoCallers, 2, '全檔只有「函式定義」與「confirm 完成 toast」兩處提及復原 handler');
  const confirmSlice = html.slice(html.indexOf('function ledgerConfirmSettlementClaim('), html.indexOf('function closeSettlementRejectDialog('));
  assert.ok(confirmSlice.indexOf('ledgerUndoSettlementConfirm(') >= 0, '唯一的呼叫點在 confirm 完成後的 toast');
  assert.ok(html.indexOf('undoWindow') < 0 && html.indexOf('UNDO_STATE_KEY') < 0, '復原狀態不得寫入 localStorage');
  const historySheet = html.slice(html.indexOf('function openSettlementHistorySheet('), html.indexOf('function openSettlementBreakdownSheet('));
  assert.ok(historySheet.indexOf('Undo') < 0 && historySheet.indexOf('Revoke') < 0, '結清紀錄 sheet 不重建任何復原入口');
});
test('#20 undo 寫入完全失敗時維持 confirmed,不得顯示成功', function () {
  const append = html.slice(html.indexOf('function appendSettlementRecord('), html.indexOf('/* §4 退回後重新付款'));
  assert.ok(append.indexOf("settlementRecordIsDurable(record)?'':'failed'") >= 0,
    'POST 失敗且未安全寫入 durable queue 時進 failed,不得靜默成功');
  assert.ok(/toast\(error\.message/.test(append), '失敗時顯示明確錯誤訊息');
  assert.ok(/try\{sending=ledgerRepository\.add\(record\);\}/.test(append) && append.indexOf('Promise.reject(error)') >= 0,
    'durable queue 同步寫入失敗(配額／私密模式)也走同一條失敗路徑,不得靜默無反應');
  assert.ok(append.indexOf('applyConfirmedSettlements') < 0 && append.indexOf('netJpy') < 0,
    '送出路徑不得直接改寫餘額,狀態一律由推導決定');
  const failedView = mod.settlementEntryStatus(
    { claim: { id: 'c-1' }, response: { id: 'r-1', recordType: 'settlement_confirm' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'confirmed', latest: true },
    '小美', { phase: 'failed' });
  assert.strictEqual(failedView.canRespond, false, '復原失敗不得把 confirmed 變回可操作的待確認按鈕');
});

// ===== §7 ledger fast pull:增量、去重、降級 =====

test('#36 doGet rows go through the SAME normalization as CSV (identical field mapping)', function () {
  const headers = ['紀錄ID','時間','成員','類別','明細','日幣','台幣','備註','分攤成員','支付方式','紀錄類型','目標紀錄ID','刪除原因','批次ID','店名','取代紀錄ID','輸入幣別','免稅品','價格方式','稅率','優惠券金額'];
  const row = ['id-1','2026-07-25T00:00:00.000Z','Bar','餐飲','晚餐, 含"稅"',3000,600,'備註','["Bar","小美"]','現金','expense','','','','店名','','JPY',true,'included',10,0];
  const csv = mod.ledgerFastPullCsv(headers, [row]);
  const lines = csv.split('\n');
  assert.strictEqual(lines[0], headers.join(','), 'the header line is schema-driven and column-exact');
  assert.ok(lines[1].indexOf('"晚餐, 含""稅"""') >= 0, 'commas and quotes are CSV-escaped so the shared parser reads them correctly');
  assert.strictEqual(mod.ledgerFastPullCsv(headers, []), headers.join(','), 'an empty incremental payload yields a header-only CSV');
});

test('#37 a fast-pull record and the CSV record with the same id merge to one row', function () {
  const rec = claim('same-id', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z');
  const merged = mod.mergeLedgerRecordSets([rec], [], [Object.assign({}, rec, { bridgePending: true })]);
  assert.strictEqual(merged.length, 1, 'the dedupe chain is keyed on record.id');
});

test('#38/#76 a failed or non-JSON doGet degrades to CSV without clearing the bridge', function () {
  freshBridge();
  mod.rememberLedgerDeliveryBridge(claim('degrade', 'Bar', '小美', 3000, 'JPY', '2026-07-25T00:00:00.000Z'));
  ['<!DOCTYPE html><html>quota exceeded</html>', '', 'null', '{"ok":false,"error":"x"}'].forEach(function (body) {
    const outcome = mod.readLedgerFastPullResponse(body);
    assert.strictEqual(outcome.ok, false, JSON.stringify(body.slice(0, 20)) + ' 必須視為失敗並降級回 CSV');
    assert.strictEqual(outcome.rows === undefined || outcome.rows.length === 0, true, 'no data is extracted from a failed response');
  });
  assert.strictEqual(mod.ledgerDeliveryBridgeRecords().length, 1, 'a failed fast pull never clears the bridge');
});

test('#38 a valid doGet payload is accepted with its after/reset/serverTime fields', function () {
  const good = mod.readLedgerFastPullResponse(JSON.stringify({ ok: true, serverTime: '2026-07-25T00:00:00.000Z', total: 3, after: 1, reset: false, rows: [[1], [2]] }));
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.total, 3);
  assert.strictEqual(good.reset, false);
  assert.strictEqual(good.rows.length, 2);
  assert.strictEqual(good.serverTime, '2026-07-25T00:00:00.000Z');
});

// ===== §7.3/§7.5 polling 節奏、退避與生命週期 =====

function fakeClock() {
  let now = 0; let seq = 0; const timers = new Map();
  return {
    now: function () { return now; },
    setTimer: function (fn, delay) { const id = ++seq; timers.set(id, { fn: fn, at: now + delay, delay: delay }); return id; },
    clearTimer: function (id) { timers.delete(id); },
    nextDelay: function () { const t = Array.from(timers.values())[0]; return t ? t.delay : null; },
    advance: function (ms) {
      now += ms;
      Array.from(timers.entries()).forEach(function (entry) {
        if (entry[1].at <= now) { timers.delete(entry[0]); entry[1].fn(); }
      });
    }
  };
}
function fastPullHarness(overrides) {
  const clock = fakeClock();
  const state = Object.assign({ panelOpen: true, hidden: false, online: true, simpleMode: false, bridgePending: false, newData: false }, overrides || {});
  const calls = [];
  let resolveNext = null;
  const controller = mod.createLedgerFastPullController({
    now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    isPanelOpen: function () { return state.panelOpen; },
    isHidden: function () { return state.hidden; },
    isOnline: function () { return state.online; },
    isSimpleMode: function () { return state.simpleMode; },
    hasBridgeRecords: function () { return state.bridgePending; },
    pull: function (reason) {
      calls.push(reason);
      return new Promise(function (resolve) { resolveNext = function () { resolve({ ok: true, newRecords: state.newData ? 1 : 0 }); }; });
    }
  });
  return { controller: controller, clock: clock, state: state, calls: calls, settle: function () { if (resolveNext) { const r = resolveNext; resolveNext = null; r(); } return Promise.resolve(); } };
}

test('#26 an open panel polls every 5 seconds', function () {
  const h = fastPullHarness();
  h.controller.start();
  assert.strictEqual(h.clock.nextDelay(), 5000, 'the base cadence is 5s while the panel is open');
});

test('#27 concurrent triggers share one in-flight request (no overlapping polls)', function () {
  const h = fastPullHarness();
  const a = h.controller.trigger('claim');
  const b = h.controller.trigger('confirm');
  assert.strictEqual(a, b, 'a second trigger shares the in-flight promise instead of issuing a new request');
  assert.strictEqual(h.calls.length, 1, 'only one request is in flight');
  return h.settle().then(function () { return a; });
});

test('#39/#78 兩層退避:閒置 2 分鐘退避至 15 秒,10 分鐘退避至 60 秒,有新資料立即回復 5 秒', function () {
  const h = fastPullHarness();
  h.controller.start();
  assert.strictEqual(h.controller.currentInterval(), 5000, '起始為 5 秒');
  h.clock.advance(120000);
  assert.strictEqual(h.controller.currentInterval(), 15000, '連續 2 分鐘無新資料退避至 15 秒');
  h.clock.advance(480000);
  assert.strictEqual(h.controller.currentInterval(), 60000, '連續 10 分鐘無新資料退避至 60 秒');
  h.state.newData = true;
  const inFlight = h.controller.trigger('poll');
  return h.settle().then(function () { return inFlight; }).then(function () {
    assert.strictEqual(h.controller.currentInterval(), 5000, '一有新資料立即回復 5 秒');
  });
});

test('#28/#71/#72 面板關閉:bridge 已清空即停止;bridge 未清空改 30 秒低頻直到全部讀回', function () {
  const h = fastPullHarness();
  h.controller.start();
  h.state.panelOpen = false;
  h.state.bridgePending = true;
  h.controller.reschedule();
  assert.strictEqual(h.controller.currentInterval(), 30000, 'bridge 尚有未讀回紀錄時改 30 秒低頻 polling');
  assert.strictEqual(h.controller.isActive(), true, '不得因面板關閉就停止同步');
  h.state.bridgePending = false;
  h.controller.reschedule();
  assert.strictEqual(h.controller.isActive(), false, 'bridge 全部讀回後 polling 完全停止');
});

test('#29/#73 hidden 與 offline 時所有節奏(5／15／60／30 秒)一律暫停', function () {
  [{ hidden: true }, { online: false }].forEach(function (condition) {
    [{ panelOpen: true, bridgePending: false }, { panelOpen: false, bridgePending: true }].forEach(function (shape) {
      const h = fastPullHarness(Object.assign({}, condition, shape));
      h.controller.start();
      assert.strictEqual(h.controller.isActive(), false, JSON.stringify(Object.assign({}, condition, shape)) + ' 必須暫停 polling');
      assert.strictEqual(h.calls.length, 0, '暫停期間不得發出 request');
    });
  });
});

test('#30/#73 回前景或恢復連線時立即執行一次 fast pull 並重新啟動對應節奏', function () {
  const h = fastPullHarness({ hidden: true });
  h.controller.start();
  assert.strictEqual(h.calls.length, 0);
  h.state.hidden = false;
  const resumed = h.controller.resume('visibilitychange');
  assert.strictEqual(h.calls.length, 1, '回前景立即拉一次');
  assert.strictEqual(h.calls[0], 'visibilitychange');
  return h.settle().then(function () { return resumed; }).then(function () {
    assert.strictEqual(h.controller.isActive(), true, '恢復後重新啟動 polling');
  });
});

test('#61 簡易結算模式停止面板 5／15／60 秒 polling,但 bridge 未清空時仍跑 30 秒低頻', function () {
  const h = fastPullHarness({ simpleMode: true });
  h.controller.start();
  assert.strictEqual(h.controller.isActive(), false, '簡易模式停止面板高頻 polling');
  h.state.bridgePending = true;
  h.controller.reschedule();
  assert.strictEqual(h.controller.currentInterval(), 30000, 'bridge 未清空時仍依 7.5 執行 30 秒低頻 polling');
});

test('#31 polling 本身不得產生任何新紀錄', function () {
  const start = html.indexOf('function ledgerFastPull(');
  assert.ok(start > 0, 'ledgerFastPull 存在');
  const pullSource = html.slice(start, html.indexOf('function ledgerSettlementPanelOpen('));
  assert.ok(pullSource.indexOf('ledgerRepository.add') < 0 && pullSource.indexOf('enqueueBatch') < 0, 'fast pull 只讀不寫');
});

// ===== §11 時鐘偏移 =====

test('#57 偏移以 doGet.serverTime 與 request 往返中點估算', function () {
  assert.strictEqual(mod.computeClockOffsetMs('2026-07-25T00:00:10.000Z', Date.parse('2026-07-25T00:00:00.000Z'), Date.parse('2026-07-25T00:00:02.000Z')), 9000, 'offset = serverTime - localMidpoint');
  assert.strictEqual(mod.computeClockOffsetMs('not-a-time', 0, 2), null, '無法解析時回 null');
  assert.strictEqual(mod.computeClockOffsetMs('', 0, 2), null, '無資料時回 null');
});
test('#57 只有絕對值大於 2 分鐘才顯示警告', function () {
  assert.strictEqual(mod.clockOffsetNeedsWarning(2 * 60 * 1000), false, '正好 2 分鐘不警告');
  assert.strictEqual(mod.clockOffsetNeedsWarning(-2 * 60 * 1000), false, '負向正好 2 分鐘不警告');
  assert.strictEqual(mod.clockOffsetNeedsWarning(2 * 60 * 1000 + 1), true, '超過 2 分鐘才警告');
  assert.strictEqual(mod.clockOffsetNeedsWarning(-5 * 60 * 1000), true, '負向偏移同樣警告');
  assert.strictEqual(mod.clockOffsetNeedsWarning(null), false, '無資料不警告');
  assert.strictEqual(mod.clockOffsetLabel(null), '無資料');
  assert.strictEqual(mod.clockOffsetLabel(0), '正常');
});
test('#58 偏移偵測不修改 record.time、不阻擋操作、不參與 canonical ordering', function () {
  const deriveSource = html.slice(html.indexOf('function deriveSettlements('), html.indexOf('function applyConfirmedSettlements('));
  assert.ok(deriveSource.indexOf('serverTime') < 0, 'serverTime 不得參與 generation 或 canonical 排序');
  assert.ok(deriveSource.indexOf('clockOffset') < 0, '時鐘偏移不得進入結算推導');
  const offsetSource = html.slice(html.indexOf('function computeClockOffsetMs('), html.indexOf('function clockOffsetLabel('));
  assert.ok(offsetSource.indexOf('record.time') < 0 && offsetSource.indexOf('.time=') < 0, '偏移偵測不改寫任何 record.time');
});

// ===== §12 身分切換提醒 =====

test('#59 舊身分有 pending／rejected 且要建立新身分時才提醒', function () {
  const open = derive(base.concat([claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z')]));
  assert.strictEqual(mod.identitySwitchWarningNeeded(open, 'Bar', true), true, '建立新身分且有未完成結算時提醒');
  assert.strictEqual(mod.identitySwitchWarningNeeded(open, 'Bar', false), false, '切換至既有身分不提醒(不是改名)');
  assert.strictEqual(mod.identitySwitchWarningNeeded(open, '小王', true), false, '與該身分無關的結算不提醒');
  const settled = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    confirmRec('c-1-ok', 'c-1', '小美', '2026-07-25T02:00:00.000Z')
  ]));
  assert.strictEqual(mod.identitySwitchWarningNeeded(settled, 'Bar', true), false, '只有已完成歷史時不提醒');
});

// ===== §13 簡易結算模式 =====

test('#62 簡易結算模式不改變資料語意:已確認 settlement 仍照常計入餘額', function () {
  const records = base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    confirmRec('c-1-ok', 'c-1', '小美', '2026-07-25T02:00:00.000Z')
  ]);
  const res = derive(records);
  assert.strictEqual(barNet(records, res.confirmed), 0, 'confirmed settlement 仍抵銷淨額,與開關無關');
  const start = html.indexOf('function isSimpleSettlementMode(');
  assert.ok(start > 0, 'isSimpleSettlementMode 存在');
  const modeSource = html.slice(start, start + 400);
  assert.ok(modeSource.indexOf('deriveSettlements') < 0 && modeSource.indexOf('applyConfirmedSettlements') < 0, '開關不介入結算計算');
});

test('#63 簡易結算模式是本機個人設定,切換不產生也不修改任何紀錄', function () {
  const start = html.indexOf('function setSimpleSettlementMode(');
  assert.ok(start > 0, 'setSimpleSettlementMode 存在');
  const toggleSource = html.slice(start, start + 500);
  assert.ok(toggleSource.indexOf('lsSet') >= 0 || toggleSource.indexOf('localStorage') >= 0, '以 localStorage 保存,不同步');
  assert.ok(toggleSource.indexOf('ledgerRepository.add') < 0 && toggleSource.indexOf('createSettlement') < 0, '切換不產生任何紀錄');
});

// ===== §7.5 待處理徽章 =====

test('#74/#75 徽章依 currentMember 過濾待你確認／對方已退回／同步異常', function () {
  const needsConfirm = derive(base.concat([claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z')]));
  assert.strictEqual(mod.settlementBadgeCount(needsConfirm, '小美'), 1, '待你確認計入徽章');
  assert.strictEqual(mod.settlementBadgeCount(needsConfirm, 'Bar'), 0, '自己送出待對方確認不算待處理');
  assert.strictEqual(mod.settlementBadgeCount(needsConfirm, '小王'), 0, '與 currentMember 無關的第三人結算不觸發徽章');
  const rejected = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('c-1-no', 'c-1', '小美', '未收到', '2026-07-25T02:00:00.000Z')
  ]));
  assert.strictEqual(mod.settlementBadgeCount(rejected, 'Bar'), 1, '對方已退回計入徽章');
  const done = derive(base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    confirmRec('c-1-ok', 'c-1', '小美', '2026-07-25T02:00:00.000Z')
  ]));
  assert.strictEqual(mod.settlementBadgeCount(done, 'Bar'), 0, '處理完畢後徽章消失');
  assert.strictEqual(mod.settlementBadgeCount(done, '小美'), 0, '處理完畢後徽章消失');
});

// ===== §8 面板簡化 / §10 待確認期間的新消費 =====

const newPanelSlice = html.slice(html.indexOf('function settlementPanelModel('), html.indexOf('function appendSettlementRecord('));

test('#40/#41 主面板只顯示當下可處理項目,已完成歷史不在主面板', function () {
  assert.ok(newPanelSlice.indexOf('latestSettlementGenerations') >= 0, '主面板只取最新可操作 generation');
  // 「不得堆疊」的斷言只針對主面板 renderer 本身;次層 sheet 保留這些區塊是設計要求。
  // 列表建構已抽成 settlementActionableRows(自動關閉面板與主面板共用同一份),切片起點一併前移。
  const mainRenderer = html.slice(html.indexOf('function settlementActionableRows('), html.indexOf('function renderSimpleSettlementPanelBody('));
  // 比對渲染出的區塊標題,而不是裸字串 —— 註解裡提到這些字不代表主面板堆疊了該區塊。
  assert.ok(mainRenderer.indexOf('轉帳建議（參考）</h3>') < 0, '參考幣別大區塊移出主面板');
  assert.ok(mainRenderer.indexOf('<h3>結清歷史</h3>') < 0, '結清歷史移至次層');
  assert.ok(mainRenderer.indexOf('<h3>我的淨額</h3>') < 0, '我的淨額大區塊移至計算明細次層');
  assert.ok(html.indexOf('<h3>我的淨額</h3>') > 0, '我的淨額仍存在於次層計算明細');
  assert.ok(mainRenderer.indexOf('status.label') >= 0, '主面板保留我的應付／應收摘要');
  assert.ok(mainRenderer.indexOf("entry.status!=='confirmed'") >= 0, '已完成不放主面板');
});

test('#45 次層入口:查看結清紀錄與查看計算明細', function () {
  assert.ok(newPanelSlice.indexOf('查看結清紀錄') >= 0, '提供查看結清紀錄入口');
  assert.ok(newPanelSlice.indexOf('查看計算明細') >= 0, '提供查看計算明細入口');
  assert.ok(html.indexOf('function openSettlementHistorySheet(') >= 0, '結清紀錄為獨立次層 sheet');
  assert.ok(html.indexOf('function openSettlementBreakdownSheet(') >= 0, '計算明細為獨立次層內容');
});

test('#50 顯示層去重:chip 講狀態、按鈕講動作,同義不重複顯示', function () {
  // 狀態機 label 維持 §3 核准原文,去重只發生在顯示層。
  assert.strictEqual(mod.settlementDisplayChip('送出中…', '送出中…'), '',
    'chip 與按鈕文案完全相同時不顯示 chip');
  assert.strictEqual(mod.settlementDisplayChip('同步失敗・重新同步', '重新同步'), '同步失敗',
    'chip 尾端就是按鈕動作時只保留狀態部分');
  assert.strictEqual(mod.settlementDisplayChip('對方已退回', '我已付款'), '對方已退回',
    '狀態與動作資訊不同時完整保留');
  assert.strictEqual(mod.settlementDisplayChip('同步失敗・重新同步', '撤回'), '同步失敗・重新同步',
    '「・」後不是按鈕動作時不得誤切');
  assert.strictEqual(mod.settlementDisplayChip('待你確認', ''), '待你確認',
    '底層規則不變:沒有 actionLabel 時 chip 完整保留');
  const slice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function ledgerHandshakeHistoryLine('));
  assert.ok(slice.indexOf('settlementRowChipText(view.label,actionLabel,view.canRespond)') >= 0, '狀態列走同一條去重規則');
  assert.ok(/chipText\?/.test(slice), 'chip 去重後為空時不輸出空的 chip 元素');
  assert.ok(slice.indexOf("actionLabel='送出中…'") >= 0 && slice.indexOf("actionLabel='重新同步'") >= 0,
    '送出中與重新同步兩種狀態需提供 actionLabel 才會去重');
  assert.ok(!/canRespond\)\{[^}]*actionLabel=/.test(slice), '兩顆按鈕的情況不設 actionLabel,改由 impliedByAction 處理');
});

test('#52 兩顆主要按鈕已表達狀態,不再輸出「待你確認」chip', function () {
  // Bar 用一段時間後回報:兩顆按鈕擺在那裡本身就是「這筆等你處理」,
  // 再掛一個「待你確認」chip 是同一件事說兩遍,還逼整列變成兩行。
  assert.strictEqual(mod.settlementRowChipText('待你確認', '', true), '', '有兩顆主要按鈕時不出 chip');
  assert.strictEqual(mod.settlementRowChipText('待你確認', '', false), '待你確認', '沒有那兩顆按鈕時 chip 必須保留');
  assert.strictEqual(mod.settlementRowChipText('等待對方確認', '撤回', false), '等待對方確認',
    '「撤回」不等於「還在等對方」,這個 chip 有獨立資訊,保留');
  assert.strictEqual(mod.settlementRowChipText('對方已退回', '我已付款', false), '對方已退回');
  assert.strictEqual(mod.settlementRowChipText('送出中…', '送出中…', false), '', '既有去重規則不受影響');
  assert.strictEqual(mod.settlementRowChipText('同步失敗・重新同步', '重新同步', false), '同步失敗');
});

test('#53 付款者列也收成一行:縮短狀態文案、按鈕改用既有詞彙', function () {
  // 「已送出」是冗字 —— 這一列有「撤回」可按,本來就代表已送出。
  const entry = { claim: { id: 'c-1' }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'pending', latest: true };
  assert.strictEqual(mod.settlementEntryStatus(entry, 'Bar').label, '等待對方確認');
  const slice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function ledgerHandshakeHistoryLine('));
  // 退回後的「再標記一次已付款」與轉帳建議的「我已付款」是同一個動作(都建立 settlement_claim),
  // 用同一個詞才不會讓人以為 App 會代為付款。
  assert.ok(slice.indexOf('>我已付款</button>') >= 0, '退回後的重新標記沿用既有「我已付款」詞彙');
  assert.ok(slice.indexOf('重新標記已付款') < 0, '不再出現七個字的長按鈕');
  assert.ok(slice.indexOf('重新付款') < 0, '不得使用「重新付款」—— App 不會代為付款,那是使用者自己在 App 外完成的事');
  assert.ok(slice.indexOf('ledgerRemarkSettlementPaid(') >= 0, '行為不變:仍走既有的重新標記 handler');
  assert.ok(slice.indexOf("actionLabel='我已付款'") >= 0, '仍提供 actionLabel 供顯示層去重');
});

test('#53 摘要金額字級小一號', function () {
  assert.ok(/\.ledger-settlement-amount\{[^}]*font-size:13\.5px/.test(html), '摘要金額由 15px 降一級為 13.5px');
  assert.ok(/\.ledger-settlement-hint\{[^}]*font-size:11px/.test(html), '底下的新帳款小字維持 11px,仍小於金額');
  const simple = html.slice(html.indexOf('function renderSimpleSettlementPanelBody('), html.indexOf('function openLedgerSettlementPanel('));
  assert.ok(simple.indexOf('ledger-settlement-amount') >= 0, '簡易結算模式的摘要金額套用同一字級,不得兩種模式不一致');
});

test('#52 沒有 chip 也沒有退回原因時,動作留在主列收成一行', function () {
  const slice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function ledgerHandshakeHistoryLine('));
  assert.ok(/var inlineActions=!reason/.test(slice),
    '只有「有退回原因」才需要第二列,其餘一律併入主列');
  assert.ok(/ledger-settle-state[^]*inlineActions\?actions:''/.test(slice), '動作併入主列右側,與 chip／等待提示同欄');
  assert.ok(/foot=reason\?/.test(slice), '沒有退回原因時不得輸出空的第二列');
  assert.ok(slice.indexOf("(actions||'<span></span>')") >= 0,
    '有原因但無動作(收款者自己退回)時補空 span 維持左右定位');
  assert.ok(/等待同步|settlementSyncTag\(entry,view\)\+\(inlineActions/.test(slice),
    '等待提示留在主列右側的固定寬欄,不移進會被壓縮的左欄');
});

test('#51 同步小字:30 秒內與 chip 同義不重複,逾 30 秒保留升級提示', function () {
  // settlementWaitHint 定義在 settlementSyncTag 之前,不可用兩者當切片起訖(end < start 會切出空字串)。
  const tagStart = html.indexOf('function settlementSyncTag(');
  assert.ok(tagStart >= 0, 'settlementSyncTag 存在');
  const tag = html.slice(tagStart, tagStart + 900);
  assert.ok(tag.indexOf("hint==='等待同步'") >= 0 && tag.indexOf("indexOf('同步中')") >= 0,
    '僅在 chip 已含「同步中」且提示為「等待同步」時抑制');
  const guard = tag.split('\n').find(function (line) { return line.indexOf("hint==='等待同步'") >= 0; });
  assert.ok(guard && guard.indexOf("indexOf('同步中')") >= 0 && /return '';$/.test(guard.trim()),
    '抑制條件必須兩者同時成立,且僅在成立時 return 空字串');
  // 邊界:30 秒仍是「等待同步」(與 chip 同義,可抑制);超過才升級為帶新資訊的提示。
  assert.strictEqual(mod.settlementWaitHint(30000), '等待同步');
  assert.strictEqual(mod.settlementWaitHint(30001), '同步較久,可手動重試');
  assert.strictEqual(mod.settlementWaitHint(120000), '同步異常');
});

test('#48 計算明細:參考幣別由結算幣別換算,不得使用另一幣獨立累計餘額', function () {
  assert.strictEqual(mod.settlementReferenceAmount(0, 'JPY', 0.2), 0, '結算幣別已結清時參考幣別必須是 0,不得殘留幻影欠款');
  assert.strictEqual(mod.settlementReferenceAmount(-2820, 'JPY', 0.2), -564, '負淨額換算保留方向');
  assert.strictEqual(mod.settlementReferenceAmount(-680, 'TWD', 0.2), -3400, 'TWD 結算幣別反向換算');
  assert.strictEqual(mod.settlementReferenceAmount(3160, 'JPY', 0), null, '匯率不可用時不編造參考值');
  assert.strictEqual(mod.settlementReferenceTransfers([], 0.2).length, 0,
    '結算幣別無轉帳建議時,參考幣別也必須是空的(ADR 0007 否決 Alternative C 的破碎狀態)');
  const converted = plain(mod.settlementReferenceTransfers([{ from: 'jane', to: '黃柏', amount: 2820, currency: 'JPY' }], 0.2));
  assert.deepStrictEqual(converted, [{ from: 'jane', to: '黃柏', amount: 564, currency: 'TWD' }], '參考建議由結算幣別建議換算而來');
  const sheet = html.slice(html.indexOf('function openSettlementBreakdownSheet('), html.indexOf('function refreshSettlementSurfaces('));
  assert.ok(sheet.indexOf('settlementReferenceTransfers(model.suggestions') >= 0, '參考轉帳建議取自結算幣別建議');
  assert.ok(sheet.indexOf('model.settlement.twd') < 0 && sheet.indexOf('model.settlement.jpy') < 0,
    '計算明細不得再讀另一幣獨立累計的轉帳建議');
});

test('#49 退回列:狀態與動作分列對齊,原因不撐開左欄', function () {
  const slice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function ledgerHandshakeHistoryLine('));
  assert.ok(slice.indexOf('ledger-settle-main') >= 0 && slice.indexOf('ledger-settle-foot') >= 0, '固定兩列結構');
  // 動作一律併入主列後,第二列只為「退回原因」而存在。
  assert.ok(slice.indexOf('foot=reason?') >= 0, '沒有退回原因時不輸出第二列');
  assert.ok(slice.indexOf("(actions||'<span></span>')") >= 0,
    '有原因但無動作時補空 span,維持左右定位不塌陷');
  assert.ok(slice.indexOf('對方已退回') < 0, '狀態文案仍由 settlementEntryStatus 提供,不在版面層改寫核准文案');
  assert.ok(slice.indexOf('退回原因:') < 0, '窄螢幕不再顯示冗餘的「退回原因:」前綴,右側 chip 已表明狀態');
  assert.ok(slice.indexOf('aria-label="退回原因"') >= 0, '前綴移除後仍以 aria-label 保留欄位語意');
  assert.ok(/\.ledger-settle-reason\{[^}]*flex:1/.test(html), '退回原因改為同列彈性欄,不再 width:100% 撐開左欄');
  assert.ok(!/\.ledger-settle-reason\{[^}]*width:100%/.test(html), '舊的 width:100% 規則必須移除');
  assert.ok(/\.ledger-settle-row\{[^}]*flex-direction:column/.test(html), '列容器改為直向堆疊兩列');
});

test('#47 摘要金額:另一幣顯示換算參考,不得顯示佔位的 0', function () {
  const receivable = { kind: 'receivable', label: '應收', amountJpy: 3160, amountTwd: 0 };
  assert.strictEqual(mod.settlementSummaryAmountText(receivable, 'JPY', 0.2), '¥3,160 ≈ NT$632',
    'JPY 結算幣別:台幣顯示換算參考值,不是 ledgerSettlementStatus 佔位的 0');
  const payable = { kind: 'payable', label: '應付', amountJpy: 0, amountTwd: 680 };
  assert.strictEqual(mod.settlementSummaryAmountText(payable, 'TWD', 0.2), 'NT$680 ≈ ¥3,400',
    'TWD 結算幣別:日幣顯示換算參考值');
  assert.strictEqual(mod.settlementSummaryAmountText({ kind: 'settled', label: '已結清', amountJpy: 0, amountTwd: 0 }, 'JPY', 0.2), '',
    '已結清不顯示金額,不得出現「¥0 · NT$0」');
  assert.strictEqual(mod.settlementSummaryAmountText(receivable, 'JPY', 0), '¥3,160',
    '匯率不可用時只顯示結算幣別金額,不編造參考值');
  const summarySlice = html.slice(html.indexOf('function renderSettlementPanelBody('), html.indexOf('function openLedgerSettlementPanel('));
  assert.ok(summarySlice.indexOf("' · NT$'") < 0, '主面板摘要不再直接串接雙幣佔位數字');
  assert.ok(summarySlice.indexOf('settlementSummaryAmountText(') >= 0, '主面板與簡易模式共用同一摘要金額規則');
});

test('#46 次層 sheet 提供返回主面板入口,主面板與其他 sheet 不得出現', function () {
  const start = html.indexOf('function ledgerInfoSheetReturnsToSettlement(');
  assert.ok(start >= 0, '返回入口由具名純函式決定');
  const gate = html.slice(start, html.indexOf('function openLedgerInfoSheet(', start));
  ['settlement-history', 'settlement-breakdown'].forEach(function (kind) {
    assert.ok(gate.indexOf("'" + kind + "'") >= 0, kind + ' 需可退回團體結算主面板');
  });
  const opener = html.slice(html.indexOf('function openLedgerInfoSheet('), html.indexOf('function closeLedgerRecordActions('));
  assert.ok(opener.indexOf('ledgerInfoSheetReturnsToSettlement(kind)') >= 0, '返回鈕依 sheet kind 決定,不由呼叫端傳入');
  assert.ok(opener.indexOf('‹ 返回') >= 0, '返回鈕文案');
  assert.ok(opener.indexOf('onclick="openLedgerSettlementPanel()"') >= 0, '返回回到團體結算主面板,不是整個關閉');
  // onclick 內容為原始碼字面值,不得由參數拼接,避免注入面。
  assert.ok(!/function openLedgerInfoSheet\([^)]*back/.test(opener), 'openLedgerInfoSheet 不接受呼叫端傳入的返回動作');
  assert.ok(html.indexOf('.ledger-sheet-back{') >= 0, '返回鈕具備可點擊尺寸樣式');
});

test('#43 次層結清紀錄仍依 currentMember 過濾,第三人資料不進 DOM', function () {
  const start = html.indexOf('function openSettlementHistorySheet(');
  const historySlice = html.slice(start, start + 1600);
  assert.ok(historySlice.indexOf('settlementItemsForMember') >= 0, '歷史依 currentMember 過濾後才產生 DOM');
});

test('#44 空狀態文案', function () {
  assert.ok(newPanelSlice.indexOf('目前沒有需要你處理的結算') >= 0, '沿用核准的空狀態文案');
});

test('#40 主面板排序:待你確認 → 需重新付款 → 待你付款 → 已送出 → 同步異常', function () {
  const rows = [
    { sortKind: 'submitted' }, { sortKind: 'sync-error' }, { sortKind: 'awaiting-you' },
    { sortKind: 'to-pay' }, { sortKind: 'rejected' }
  ];
  const order = rows.slice().sort(mod.compareSettlementPanelRows).map(function (r) { return r.sortKind; });
  assert.deepStrictEqual(order, ['awaiting-you', 'rejected', 'to-pay', 'submitted', 'sync-error']);
});

test('#10 待確認期間的新消費:精簡為摘要金額下方的一行小字', function () {
  const entry = { from: 'jane', to: '黃柏', currency: 'JPY', amount: 2500 };
  const note = mod.settlementNewChargeNote(entry, 150, 'jane');
  assert.strictEqual(note, '黃柏 上筆 ¥2,500 已結清・新帳款 ¥150', '一行講完:對象、上筆已結清、新帳款');
  // 舊句子「本筆 ¥2,500 已完成,另有新產生帳款 ¥150 待處理」為 30 字;新版必須明顯更短才放得進摘要列。
  assert.ok(note.length <= 26, '必須比舊句子短,才放得進摘要列');
  assert.strictEqual(mod.settlementNewChargeNote(entry, 150, '黃柏'), 'jane 上筆 ¥2,500 已結清・新帳款 ¥150',
    '對象一律取「我」以外的另一方');
  assert.strictEqual(mod.settlementNewChargeNote(entry, 0, 'jane'), '', '沒有新帳款時不顯示');
  assert.strictEqual(mod.settlementNewChargeNote(null, 150, 'jane'), '');
  // 結清是一對成員之間的淨額,沒有單一明細可指名 —— 不得編造品項名稱。
  assert.ok(note.indexOf('明細') < 0 && note.indexOf('undefined') < 0, '不輸出明細品項');
});

test('#10 新帳款說明移入摘要金額下方,不再自成一塊', function () {
  const panel = html.slice(html.indexOf('function settlementNewChargeNotices('), html.indexOf('function renderSimpleSettlementPanelBody('));
  assert.ok(panel.indexOf('ledger-settlement-hint') >= 0, '改用摘要列的小字樣式');
  assert.ok(panel.indexOf('ledger-settlement-note') < 0, '不再輸出獨立的說明區塊');
  assert.ok(panel.indexOf('settlementNewChargeNote(entry,remaining,model.me)') >= 0, '對象依 currentMember 決定');
  assert.ok(/ledger-settlement-amount[^]*settlementNewChargeNotices\(model\)/.test(panel),
    '小字掛在摘要金額同一欄,緊貼應付／應收金額下方');
  assert.ok(/summary\+\s*$/m.test(panel) || panel.indexOf("+summary+\n") >= 0 || !/summary\+settlementNewChargeNotices/.test(panel),
    '主體不再於摘要之後另外插入說明區塊');
  assert.ok(/\.ledger-settlement-hint\{[^}]*font-size:11px/.test(html), '小字比摘要金額小');
  assert.ok(/\.ledger-settlement-amount\{[^}]*flex-direction:column/.test(html), '金額與小字在摘要右側直向堆疊');
  assert.ok(html.indexOf('.ledger-settlement-note{') < 0, '舊的獨立說明樣式必須移除');
});

// ===== §7.4 等待提示 =====

test('#25 等待提示分級:30 秒內／超過 30 秒／超過數分鐘', function () {
  assert.strictEqual(mod.settlementWaitHint(0), '等待同步');
  assert.strictEqual(mod.settlementWaitHint(30000), '等待同步');
  assert.strictEqual(mod.settlementWaitHint(30001), '同步較久,可手動重試');
  assert.strictEqual(mod.settlementWaitHint(3 * 60 * 1000), '同步異常');
});

test('#25 一般畫面不得完整暴露 record.id 或 payload', function () {
  assert.strictEqual(mod.shortRecordId('1784428800000-abcd'), '…-abcd', 'record.id 只縮短顯示');
  assert.strictEqual(mod.shortRecordId(''), '');
});

// ===== 回歸 =====

test('#68 pending／rejected 不改變消費餘額', function () {
  const records = base.concat([
    claim('c-1', 'Bar', '小美', 3000, 'JPY', '2026-07-25T01:00:00.000Z'),
    rejectRec('c-1-no', 'c-1', '小美', '未收到', '2026-07-25T02:00:00.000Z')
  ]);
  assert.strictEqual(barNet(records, derive(records).confirmed), -3000, 'rejected 不改變淨額');
});

// ---- summary ----
Promise.all(asyncTests).then(function () {
  const failed = results.filter(function (r) { return !r.ok; });
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' - ' + r.name + (r.ok ? '' : ('\n        :: ' + r.err)));
  });
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' reliability checks passed');
  if (failed.length) {
    console.error(failed.length + ' reliability checks FAILED');
    process.exit(1);
  }
  console.log('ledger settlement reliability tests passed');
});
