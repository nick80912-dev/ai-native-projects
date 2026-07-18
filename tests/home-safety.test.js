const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const files = ['index.html'];

function extractFunction(html, name) {
  const start = html.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} exists`);
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(html, /var days=DB\.trip\?DB\.trip\.days:\[\];/, `${file} shows every pre-trip day`);
  assert.doesNotMatch(html, /DB\.trip\.days\.slice\(0,3\)/, `${file} does not cap pre-trip days`);
  assert.match(html, /html,body\{touch-action:pan-x pan-y\}/, `${file} keeps the approved iOS Scroll-only gesture policy`);
  assert.doesNotMatch(html, /touch-action:manipulation/, `${file} does not restore the superseded gesture policy`);

  const calls = { confirm: 0, confirmText: '', added: 0, rendered: 0 };
  const sandbox = {
    confirm(message) { calls.confirm++; calls.confirmText=message; return false; },
    mergedLedgerRecords() { return [{ id:'keep' }, { id:'reverse',amountJpy:100,amountTwd:0 }]; },
    spendLedgerRecords(records) { return records; },
    createLedgerReversal(record) { return {id:'reversal',original:record.id}; },
    ledgerRepository:{add(){calls.added++;return Promise.resolve({ok:true});}},
    renderSplit() { calls.rendered++; },
    toast(){},
    Date,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(html, 'reverseLedgerRecord'), sandbox);
  sandbox.reverseLedgerRecord('reverse');
  assert.strictEqual(calls.confirm, 1, `${file} asks before deleting an expense`);
  assert.strictEqual(calls.confirmText, '將新增一筆負向沖銷紀錄以抵銷此筆，原紀錄保留。確定？', `${file} explains append-only reversal semantics in the confirmation`);
  assert.strictEqual(calls.added, 0, `${file} does not write a reversal when deletion is cancelled`);
  assert.strictEqual(calls.rendered, 0, `${file} does not rerender when deletion is cancelled`);

  sandbox.confirm = () => true;
  sandbox.reverseLedgerRecord('reverse');
  assert.strictEqual(calls.added, 1, `${file} appends a reversal after deletion is confirmed`);
}

console.log('home safety tests passed');
