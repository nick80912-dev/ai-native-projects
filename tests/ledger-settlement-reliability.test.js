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
const fs = require('fs');
const vm = require('vm');

function createStorage() {
  const values = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; }
  };
}

function loadModule() {
  const source = fs.readFileSync('index.html', 'utf8');
  const start = source.indexOf('/* ================= ledgerRepository');
  const end = source.indexOf('/* ================= 分帳', start);
  assert(start >= 0 && end > start, 'ledger helper section exists');
  const warnings = [];
  const sandbox = {
    console: { log() {}, warn(message) { warnings.push(String(message)); }, error() {} },
    localStorage: createStorage(), fetch() { return Promise.reject(new Error('network disabled')); },
    setTimeout, clearTimeout, Date, Math, Promise, JSON, String, Number, isFinite,
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
const html = fs.readFileSync('index.html', 'utf8');
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

test('#9 claim: before read-back the payer sees 已送出・等待對方確認, never 我已付款 again', function () {
  const pendingEntry = { claim: { id: 'c-1', pending: true }, from: 'Bar', to: '小美', currency: 'JPY', amount: 3000, status: 'pending', latest: true };
  const view = mod.settlementEntryStatus(pendingEntry, 'Bar');
  assert.strictEqual(view.label, '已送出・等待對方確認', 'the payer sees the submitted status');
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

// ===== §9 已確認結算的撤銷限制 =====

const DAY = 24 * 60 * 60 * 1000;
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
const lone = confirmedEntry('c-1', confirmTime);

test('#46 the newest confirmed entry is revocable at 23:59:59.999', function () {
  const r = mod.settlementConfirmRevokeEligibility(lone, [lone], '小美', confirmAt + DAY - 1);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.reason, 'allowed');
  assert.strictEqual(r.expiresAt, confirmAt + DAY, 'expiresAt is exactly 24h after response.time');
});
test('#47 exactly 24:00:00.000 is still revocable', function () {
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(lone, [lone], '小美', confirmAt + DAY).allowed, true);
});
test('#48 24 hours + 1 ms is not revocable', function () {
  const r = mod.settlementConfirmRevokeEligibility(lone, [lone], '小美', confirmAt + DAY + 1);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.reason, 'expired');
});
test('#49/#50/#51/#52 an older confirmed entry is not revocable even one hour later', function () {
  const older = confirmedEntry('c-old', confirmTime);
  const followUps = {
    pending: generationEntry('c-new', '2026-07-25T01:00:00.000Z', 'pending'),
    rejected: generationEntry('c-new', '2026-07-25T01:00:00.000Z', 'rejected'),
    confirmed: confirmedEntry('c-new', '2026-07-25T01:30:00.000Z'),
    withdrawn: generationEntry('c-new', '2026-07-25T01:00:00.000Z', 'withdrawn')
  };
  followUps.confirmed.claimPos = { time: '2026-07-25T01:00:00.000Z', id: 'c-new' };
  Object.keys(followUps).forEach(function (kind) {
    const r = mod.settlementConfirmRevokeEligibility(older, [older, followUps[kind]], '小美', confirmAt + 60 * 60 * 1000);
    assert.strictEqual(r.allowed, false, 'a later ' + kind + ' generation blocks revoking the old confirm');
    assert.strictEqual(r.reason, 'superseded', 'the blocking reason is superseded, not expired');
  });
});
test('#53 only the original receiver may revoke', function () {
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(lone, [lone], 'Bar', confirmAt).reason, 'not-receiver');
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(lone, [lone], '小王', confirmAt).reason, 'not-receiver');
});
test('#55 invalid inputs are rejected rather than allowed by default', function () {
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(null, [], '小美', confirmAt).reason, 'invalid');
  const pendingEntry = generationEntry('p', confirmTime, 'pending');
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(pendingEntry, [pendingEntry], '小美', confirmAt).reason, 'invalid', 'a non-confirm entry is invalid');
  const rejectedResponse = confirmedEntry('rr', confirmTime);
  rejectedResponse.response.recordType = 'settlement_reject';
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(rejectedResponse, [rejectedResponse], '小美', confirmAt).reason, 'invalid', 'the response must be a valid settlement_confirm');
});
test('#56 the 24h comparison uses ISO record.time, not a rendered timezone string', function () {
  const utc = confirmedEntry('c-utc', '2026-07-25T00:00:00.000Z');
  const offset = confirmedEntry('c-off', '2026-07-25T09:00:00+09:00');  // the same instant
  assert.strictEqual(
    mod.settlementConfirmRevokeEligibility(utc, [utc], '小美', confirmAt + DAY).allowed,
    mod.settlementConfirmRevokeEligibility(offset, [offset], '小美', confirmAt + DAY).allowed,
    'the same instant written in another offset behaves identically'
  );
  assert.strictEqual(mod.settlementConfirmRevokeEligibility(offset, [offset], '小美', confirmAt + DAY).expiresAt, confirmAt + DAY);
});
test('#54/#55 the blocking copy is exactly the approved wording', function () {
  assert.strictEqual(mod.settlementRevokeBlockMessage('expired'), '此筆結清已超過 24 小時,無法撤銷');
  assert.strictEqual(mod.settlementRevokeBlockMessage('superseded'), '此筆已有後續結算,無法撤銷舊確認');
  assert.strictEqual(mod.settlementRevokeBlockMessage('not-receiver'), '只有原收款者可以撤銷確認');
  assert.strictEqual(mod.settlementRevokeBlockMessage('invalid'), '此筆結清狀態無法撤銷');
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
  const mainRenderer = html.slice(html.indexOf('function renderSettlementPanelBody('), html.indexOf('function renderSimpleSettlementPanelBody('));
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
  assert.strictEqual(mod.settlementDisplayChip('對方已退回', '重新標記已付款'), '對方已退回',
    '狀態與動作資訊不同時完整保留');
  assert.strictEqual(mod.settlementDisplayChip('已送出・等待對方確認', '撤回'), '已送出・等待對方確認',
    '「・」後不是按鈕動作時不得誤切');
  assert.strictEqual(mod.settlementDisplayChip('待你確認', ''), '待你確認',
    '兩顆按鈕時不傳 actionLabel,chip 完整保留');
  const slice = html.slice(html.indexOf('function ledgerHandshakeStatusLine('), html.indexOf('function ledgerHandshakeHistoryLine('));
  assert.ok(slice.indexOf('settlementDisplayChip(view.label,actionLabel)') >= 0, '狀態列走同一條去重規則');
  assert.ok(/chipText\?/.test(slice), 'chip 去重後為空時不輸出空的 chip 元素');
  assert.ok(slice.indexOf("actionLabel='送出中…'") >= 0 && slice.indexOf("actionLabel='重新同步'") >= 0,
    '送出中與重新同步兩種狀態需提供 actionLabel 才會去重');
  assert.ok(!/canRespond\)\{[^}]*actionLabel=/.test(slice), '兩顆按鈕的情況不得設定 actionLabel');
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
  assert.ok(slice.indexOf("(reason||actions)?") >= 0, '無原因且無動作時不輸出第二列');
  assert.ok(slice.indexOf("(reason||'<span></span>')") >= 0 && slice.indexOf("(actions||'<span></span>')") >= 0,
    '只有其一時補空 span,維持左右定位不塌陷');
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

test('#10 待確認期間的新消費:確認後明確區分本筆已完成與新產生帳款', function () {
  const note = mod.settlementNewChargeNote({ currency: 'JPY', amount: 3000 }, 1000);
  assert.ok(note.indexOf('已完成') >= 0, '說明本筆已完成');
  assert.ok(note.indexOf('待處理') >= 0, '說明另有新產生帳款待處理');
  assert.ok(note.indexOf('3,000') >= 0 && note.indexOf('1,000') >= 0, '兩筆金額都顯示');
  assert.strictEqual(mod.settlementNewChargeNote({ currency: 'JPY', amount: 3000 }, 0), '', '沒有新帳款時不顯示');
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
