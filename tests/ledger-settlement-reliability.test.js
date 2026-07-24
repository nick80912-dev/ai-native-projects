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

// ---- collecting runner: report every failing case, not just the first ----
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: e && e.message ? e.message : String(e) }); }
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

// ---- summary ----
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
