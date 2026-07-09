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
  extractFunction('renderNoteBlock'),
  extractFunction('parseScheduleLinks'),
  extractFunction('renderScheduleLinks'),
  extractFunction('isTripCheckableItem'),
  extractFunction('isTripItemCleared'),
  extractFunction('renderTicketLine'),
  extractFunction('nextStopMeta'),
  extractFunction('renderNextStopCard')
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

const scheduleText = '「JR西日本」官方完整時刻表 https://jr-miyajimaferry.co.jp/timetable/ 「宮島松大」官方完整時刻表 https://miyajima-matsudai.co.jp/cn/schedule.html#std';
const scheduleLinks = sandbox.parseScheduleLinks(scheduleText);
assert.strictEqual(scheduleLinks.length, 2);
assert.strictEqual(scheduleLinks[0].label, 'JR西日本時刻表');
assert.strictEqual(scheduleLinks[0].url, 'https://jr-miyajimaferry.co.jp/timetable/');
assert.strictEqual(scheduleLinks[1].label, '宮島松大時刻表');
assert.strictEqual(scheduleLinks[1].url, 'https://miyajima-matsudai.co.jp/cn/schedule.html#std');

const scheduleOut = sandbox.renderScheduleLinks(scheduleText, 'qa-btn fr');
assert(scheduleOut.includes('href="https://jr-miyajimaferry.co.jp/timetable/"'));
assert(scheduleOut.includes('>⛴ JR西日本時刻表</a>'));
assert(scheduleOut.includes('href="https://miyajima-matsudai.co.jp/cn/schedule.html#std"'));
assert(scheduleOut.includes('>⛴ 宮島松大時刻表</a>'));

sandbox.getDayProgress = function(){ return { done:{}, skip:{ '10/19_7':true } }; };
sandbox.isNextStopCleared = function(item, progress, checks){
  return !!(progress.done[item.id] || progress.skip[item.id] || checks[item.id]);
};
assert.strictEqual(sandbox.isTripCheckableItem({ id:'10/19_2', act:'', place:'原爆圓頂館' }), true);
assert.strictEqual(sandbox.isTripItemCleared({ id:'10/19_7', act:'', place:'宮島' }, {}, 1, {}), true);

sandbox.typeTag = function(){ return { label:'拉麵' }; };
sandbox.transport = function(){ return 'drive'; };
sandbox.navUrl = function(){ return '#nav'; };
sandbox.extractDrive = function(value){ return value || ''; };
sandbox.resolveRef = function(){
  return {
    kind:'rest',
    r:{
      name:'隠岐島拉麺',
      cat:'拉麵',
      hours:'11:00-14:00、17:00-21:00',
      pay:'只能付現（點餐機）',
      travel:'開車4分鐘',
      parking:'',
      note:''
    }
  };
};

const nextStopOut = sandbox.renderNextStopCard({}, 0, {
  source:'order',
  item:{
    id:'10/18_4',
    time:'',
    act:'晚餐時間',
    place:'隠岐島拉麺',
    move:'',
    note:''
  }
});
assert(nextStopOut.includes('<b>付款</b> 只能付現（點餐機）'));

console.log('renderNote tests passed');
