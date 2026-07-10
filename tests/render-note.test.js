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

function extractConst(name){
  const start = html.indexOf('var ' + name + '=');
  assert.notStrictEqual(start, -1, name + ' exists');
  const end = html.indexOf(';', start);
  return html.slice(start, end + 1);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractConst('TOMORROW_PREVIEW_HOUR'),
  extractFunction('escapeHtml'),
  extractFunction('jsString'),
  extractFunction('highlightNote'),
  extractFunction('parseNoteLine'),
  extractFunction('renderNote'),
  extractFunction('renderNoteBlock'),
  extractFunction('parseScheduleLinks'),
  extractFunction('renderScheduleLinks'),
  extractFunction('isTripCheckableItem'),
  extractFunction('isTripItemCleared'),
  extractFunction('getCurrentTripItemId'),
  extractFunction('shouldReplaceWithTomorrowPreview'),
  extractFunction('shouldShowCompactTomorrowPreview'),
  extractFunction('renderTomorrowPreview'),
  extractFunction('renderTicketLine'),
  extractFunction('nextStopMeta'),
  extractFunction('parkingPanel'),
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
assert(nextStopOut.includes('onclick="openTripItem(0,\'10/18_4\')"'));
assert(nextStopOut.includes('class="nx-drive-btn"'));
assert(nextStopOut.includes('class="nx-decision-btn done"'));
assert(nextStopOut.includes('class="nx-decision-btn skip"'));
assert(nextStopOut.indexOf('class="nx-drive-btn"') < nextStopOut.indexOf('class="nx-decision-btn done"'));

sandbox.resolveParking = function(){ return { mapcode:'22 220 851*75', pnote:'parking note' }; };
sandbox.kvRow = function(k,v){ return v ? '<div>'+k+v+'</div>' : ''; };
const parkingOut = sandbox.parkingPanel({});
assert(parkingOut.includes('onclick="showMapcode(\'22 220 851*75\')"'));
assert(parkingOut.includes('class="mapcode-box mapcode-open"'));
assert(!html.includes('📋 MAP CODE'));
assert(!html.includes(`onclick="copyText(\\''+p.mapcode+`));
assert(!html.includes('parkingPanel(p)+renderNoteBlock(p.note)'));
assert(!html.includes('travelmode=driving" target="_blank" rel="noopener">🚗 導航</a>\'+'));
assert(!html.includes('導航操作'));

sandbox.DB = { trip:{ days:[
  { date:'10/20', dow:'二', items:[{ id:'d3_1', act:'Kamakura walk', place:'Enoshima' }] },
  { date:'10/21', dow:'三', items:[{ id:'d4_1', time:'08:00', act:'Breakfast', place:'Shinjuku' }] }
] } };
/* 規則(2026-07-09):pick.item 為 null = 今日全部手動完成/跳過 → 主卡整個換成明日預告(不看時間)。
   pick.item 有值(即使時間已過、已被自動略過,只要沒手動處理)→ 主卡保留,21:00 後才附加縮小版明日預告。 */
assert.strictEqual(sandbox.shouldReplaceWithTomorrowPreview({ item:null }), true);
assert.strictEqual(sandbox.shouldReplaceWithTomorrowPreview({ item:{ id:'d3_1' } }), false);
assert.strictEqual(sandbox.shouldShowCompactTomorrowPreview({ item:{ id:'d3_1' } }, 21*60), true);
assert.strictEqual(sandbox.shouldShowCompactTomorrowPreview({ item:{ id:'d3_1' } }, 20*60+59), false);
assert.strictEqual(sandbox.shouldShowCompactTomorrowPreview({ item:null }, 22*60), false);

const tomorrowOut = sandbox.renderTomorrowPreview(0, false);
assert(tomorrowOut.includes('class="tomorrow-card"'));
assert(!tomorrowOut.includes('tomorrow-card compact'));
assert(tomorrowOut.includes('DAY 2'));
assert(tomorrowOut.includes('Breakfast'));

const tomorrowCompactOut = sandbox.renderTomorrowPreview(0, true);
assert(tomorrowCompactOut.includes('class="tomorrow-card compact"'));

const currentId = sandbox.getCurrentTripItemId(
  { items:[{ id:'done', act:'done' }, { id:'next', act:'next main', place:'next place' }] },
  0,
  { done:true }
);
assert.strictEqual(currentId, 'next');

sandbox.getDayProgress = function(){ return { done:{}, skip:{ parent:true } }; };
const currentAfterSkip = sandbox.getCurrentTripItemId(
  { items:[
    { id:'parent', act:'Island walk', place:'Shrine' },
    { id:'child', act:'', place:'Child scenic stop' },
    { id:'next-main', act:'Next main stop', place:'Station' }
  ] },
  0,
  {}
);
assert.strictEqual(currentAfterSkip, 'next-main');

console.log('renderNote tests passed');
