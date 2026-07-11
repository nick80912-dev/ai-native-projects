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

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFunction('typeTag'), sandbox);

assert.strictEqual(
  sandbox.typeTag({ kind: 'place', p: { tnorm: 'attraction', type: '機場' } }).label,
  '🛫 機場',
  'airport places use the airport label'
);

assert.strictEqual(
  sandbox.typeTag({ kind: 'place', p: { tnorm: 'attraction', type: '纜車' } }).label,
  '🚡 纜車',
  'cable-car places use the cable-car label'
);

assert.match(
  html,
  /var tripHideDone=true;/,
  'the itinerary starts with completed items hidden'
);

console.log('trip presentation tests passed');
