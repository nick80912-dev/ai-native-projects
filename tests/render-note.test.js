const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('日本行程V2預覽.html', 'utf8');

function extractFunction(name){
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start);
  let depth = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') depth++;
    if(html[i] === '}') depth--;
    if(depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction('escapeHtml'),
  extractFunction('highlightNote'),
  extractFunction('parseNoteLine'),
  extractFunction('renderNote'),
  extractFunction('renderNoteBlock')
].join('\n'), sandbox);

const htmlOut = sandbox.renderNote('建議路線：\n• 搭電梯\n1. 下樓\n① 投紙鶴\n※ 不可外食\nTEL：086-294-5543\nhttps://example.com');

assert(htmlOut.includes('class="note-rich"'));
assert(htmlOut.includes('class="note-p"'));
assert(htmlOut.includes('class="note-list"'));
assert(htmlOut.includes('class="note-li"'));
assert(htmlOut.includes('class="note-alert"'));
assert(htmlOut.includes('<span class="hl">TEL：086-294-5543</span>'));
assert(htmlOut.includes('<a href="https://example.com"'));
assert(!htmlOut.includes('<script>'));

const shortOut = sandbox.renderNote('可停留1小時');
assert(shortOut.includes('可停留1小時'));
assert(!shortOut.includes('note-list'));

const blockOut = sandbox.renderNoteBlock('• 必備證件');
assert(blockOut.includes('class="pc-tip"'));
assert(blockOut.includes('必備證件'));
assert(!blockOut.includes('💡'));

console.log('renderNote tests passed');
