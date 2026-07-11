const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const files = ['index.html', '日本行程V2預覽.html'];

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
  assert.match(html, /html,body\{touch-action:manipulation\}/, `${file} disables double-tap zoom without blocking pinch zoom`);

  const calls = { confirm: 0, saved: 0, rendered: 0 };
  const sandbox = {
    confirm() { calls.confirm++; return false; },
    getExpenses() { return [{ desc: '保留' }, { desc: '刪除' }]; },
    lsSet() { calls.saved++; },
    renderSplit() { calls.rendered++; },
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(html, 'removeExpense'), sandbox);
  sandbox.removeExpense(1);
  assert.strictEqual(calls.confirm, 1, `${file} asks before deleting an expense`);
  assert.strictEqual(calls.saved, 0, `${file} keeps expenses when deletion is cancelled`);
  assert.strictEqual(calls.rendered, 0, `${file} does not rerender when deletion is cancelled`);

  sandbox.confirm = () => true;
  sandbox.removeExpense(1);
  assert.strictEqual(calls.saved, 1, `${file} saves after deletion is confirmed`);
  assert.strictEqual(calls.rendered, 1, `${file} rerenders after deletion is confirmed`);
}

console.log('home safety tests passed');
