// v160 (#60, Bar 2026-10-30): the person owed can settle a transfer line directly,
// as "已收到" (paid outside the app) or "不用付了" (waived). The app writes the ADR 0007
// pair in one go: a settlement_claim in the debtor's name with "〔收款人 代記〕" at the end
// of the note (plus "免收" when waived), then the receiver's own settlement_confirm.
const assert = require('assert');
const vm = require('vm');
const TripBuyToLedger = require('../buy-to-ledger.js');
const {appHtml} = require('./support/version');

function createStorage() {
  const values = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; }
  };
}
const source = appHtml();
const start = source.indexOf('/* ================= ledgerRepository');
const end = source.indexOf('/* ================= 分帳', start);
assert(start >= 0 && end > start, 'ledger helper section exists');
const mod = {
  console: { log() {}, warn() {}, error() {} },
  localStorage: createStorage(), fetch() { return Promise.reject(new Error('network disabled')); },
  setTimeout, clearTimeout, Date, Math, Promise, JSON, String, Number, isFinite,
  TripBuyToLedger, buyToLedgerRuntimeAdapter: {},
  timestampDate(value) { return new Date(Number(value)); }, AppLog: { repo() {}, sync() {} },
  renderSplit() {}, updateLedgerPendingStatus() {}
};
vm.createContext(mod);
vm.runInContext(source.slice(start, end), mod);

let seq = 0;
const rnd = () => ((seq++ % 97) + 1) / 100;
const AT = Date.parse('2026-10-30T03:00:00.000Z');
function expense(id, member, jpy, participants, time) {
  return { id, time, member, category: '餐飲', detail: id, amountJpy: jpy, amountTwd: Math.round(jpy * 0.21), note: '',
    participants: JSON.stringify(participants), payMethod: '現金', recordType: 'expense', targetRecordId: '', deleteReason: '', batchId: '' };
}
const base = [expense('e-1', 'Bar', 6000, ['Bar', 'Amy'], '2026-10-20T03:00:00.000Z')];
const plain = (value) => JSON.parse(JSON.stringify(value));

const received = mod.createReceiverSettlementRecords('Amy', 'Bar', 3000, 'JPY', 'received', false, AT, rnd);
assert.deepStrictEqual(
  plain({ member: received.claim.member, participants: received.claim.participants, note: received.claim.note, type: received.claim.recordType, jpy: received.claim.amountJpy, currency: received.claim.inputCurrency }),
  { member: 'Amy', participants: '["Bar"]', note: '〔Bar 代記〕', type: 'settlement_claim', jpy: 3000, currency: 'JPY' },
  'the claim is in the debtor’s name and marks the receiver as the recorder');
assert.deepStrictEqual(plain({ member: received.response.member, type: received.response.recordType, target: received.response.targetRecordId }),
  { member: 'Bar', type: 'settlement_confirm', target: received.claim.id }, 'the receiver confirms the claim');
assert(Date.parse(received.response.time) > Date.parse(received.claim.time), 'the confirm sorts after the claim');

const waived = mod.createReceiverSettlementRecords('Amy', 'Bar', 3000, 'JPY', 'waived', false, AT, rnd);
assert.strictEqual(waived.claim.note, '免收 〔Bar 代記〕', 'a waiver adds 免收 before the recorder tag');
assert.throws(() => mod.createReceiverSettlementRecords('Amy', 'Bar', 3000, 'JPY', 'other', false, AT, rnd), /結清方式錯誤/);
assert.throws(() => mod.createReceiverSettlementRecords('Amy', 'Bar', 0, 'JPY', 'received', false, AT, rnd), /正整數/);
assert.throws(() => mod.createReceiverSettlementRecords('Bar', 'Bar', 3000, 'JPY', 'received', false, AT, rnd), /不可相同/);

/* 與 ledgerCurrentMemberSettlement 相同的組合(該函式在 UI 段,這裡直接用 domain 函式) */
function settle(records, member) {
  const handshake = mod.deriveSettlements(records, null, 'formal');
  const balances = mod.applyConfirmedSettlements(mod.buildMemberBalances(records, null, null, 'formal'), handshake.confirmed);
  const current = balances.members.filter((item) => item.member === member)[0];
  return { current, handshake, jpy: mod.buildTransferSuggestions(balances, 'JPY') };
}
assert.strictEqual(settle(base, 'Amy').current.netJpy, -3000, 'before: Amy owes Bar ¥3,000');
for (const [pair, label] of [[received, '已收到'], [waived, '免收']]) {
  const records = base.concat([pair.claim, pair.response]);
  const amy = settle(records, 'Amy'), bar = settle(records, 'Bar');
  assert.strictEqual(amy.current.netJpy, 0, label + ': Amy is settled');
  assert.strictEqual(bar.current.netJpy, 0, label + ': Bar is settled');
  assert.deepStrictEqual(plain(amy.jpy), [], label + ': no transfer is left');
  const entry = bar.handshake.confirmed[0];
  assert.strictEqual(mod.settlementEntryStatus(entry, 'Bar').label, label, 'the receiver sees ' + label);
  assert.strictEqual(mod.settlementEntryStatus(entry, 'Amy').label, label, 'the debtor sees ' + label);
  /* 10 秒復原:撤回那筆代記的 claim,雙方回到結清前 */
  const undo = { id: 'del-1', time: '2026-10-30T03:00:05.000Z', member: 'Bar', category: '其他', detail: '[刪除]', amountJpy: 0, amountTwd: 0,
    note: '', participants: '', payMethod: '', recordType: 'deletion', targetRecordId: pair.claim.id, deleteReason: '復原結清', batchId: '' };
  assert.strictEqual(settle(records.concat([undo]), 'Amy').current.netJpy, -3000, label + ': withdrawing the claim restores the debt');
}

/* 一般流程(欠款者按「我已付款」、收款人確認)仍是「已完成」 */
const normalClaim = mod.createSettlementClaim('Amy', 'Bar', 3000, 'JPY', false, AT, rnd);
const normalConfirm = mod.createSettlementResponse('settlement_confirm', normalClaim, 'Bar', '', false, AT + 1, rnd);
const normal = settle(base.concat([normalClaim, normalConfirm]), 'Bar').handshake.confirmed[0];
assert.strictEqual(mod.settlementReceiverKind(normal), '', 'a debtor-raised claim is not a receiver settlement');
assert.strictEqual(mod.settlementEntryStatus(normal, 'Bar').label, '已完成');
/* 代記的人不是收款人時(例如第三人代按)不算收款人結清 */
const other = Object.assign({}, normalClaim, { id: normalClaim.id + 'x', note: '〔Ken 代記〕' });
assert.strictEqual(mod.settlementReceiverKind({ claim: other, to: 'Bar' }), '', 'only the receiver as recorder counts');

console.log('receiver settlement v160 tests passed');
