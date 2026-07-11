const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join('.', 'index.html'), 'utf8');

function extractFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

function runWithSearch(search) {
  const sandbox = {
    window: { location: { search } },
    Date,
    URLSearchParams,
    localStorage: { getItem() { return null; } },
    AppLog: { repo() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction('lsGet'),
    extractFunction('appNow'),
    extractFunction('todayMD'),
  ].join('\n'), sandbox);
  return sandbox.todayMD();
}

assert.strictEqual(
  runWithSearch('?previewDate=2026-10-18'),
  '10/18',
  'previewDate query parameter controls the Today date'
);

assert.strictEqual(
  runWithSearch('?fresh=7beb2d4&previewDate=2026-10-23'),
  '10/23',
  'previewDate works alongside other query parameters'
);
