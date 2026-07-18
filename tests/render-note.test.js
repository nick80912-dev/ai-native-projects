const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

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
  extractFunction('cssId'),
  extractFunction('openShopPlace'),
  extractFunction('centerShopFilterChip'),
  extractFunction('parkingLines'),
  extractFunction('renderParkingValue'),
  extractFunction('parkingKvRow'),
  extractFunction('renderParkingTicketLine'),
  extractFunction('renderTicketLine'),
  extractFunction('nextStopMeta'),
  extractFunction('parkingPanel'),
  extractFunction('renderNextStopCard'),
  extractFunction('clusterItemName'),
  extractFunction('clusterTimeRange'),
  extractFunction('renderClusterStop'),
  extractFunction('renderClusterNextStopCard')
].join('\n'), sandbox);

let switchedView = '';
let scrolled = false;
sandbox._shopQ = 'uniqlo';
sandbox.shopPlaceFilter = 'wants';
sandbox.shopOpenFloors = { 'P001::1F':true };
sandbox.shopMalls = function(){ return [{ place:{ placeId:'P001' }, stores:[] }]; };
sandbox.switchView = function(view){ switchedView = view; };
sandbox.requestAnimationFrame = function(fn){ fn(); };
sandbox.document = {
  getElementById:function(id){
    if(id !== 'shopmall_P001') return null;
    return { scrollIntoView:function(){ scrolled = true; } };
  }
};
sandbox.openShopPlace('p001');
assert.strictEqual(sandbox._shopQ, '', 'shopping deep link clears stale search');
assert.strictEqual(sandbox.shopPlaceFilter, 'P001', 'shopping deep link selects the resolved place');
assert.strictEqual(switchedView, 'shop', 'shopping deep link opens the Shopping view');
assert.strictEqual(scrolled, true, 'shopping deep link scrolls to the place card after render');
assert.strictEqual(sandbox.shopOpenFloors['P001::1F'], true, 'shopping deep link preserves floor state');

sandbox._shopQ = 'daiso';
sandbox.shopPlaceFilter = 'P001';
scrolled = false;
sandbox.openShopPlace('P999');
assert.strictEqual(sandbox._shopQ, '', 'unknown place still clears stale search');
assert.strictEqual(sandbox.shopPlaceFilter, 'all', 'unknown place safely falls back to all');
assert.strictEqual(scrolled, false, 'unknown place does not attempt a target scroll');

let horizontalScroll = null;
let activeChip = { offsetLeft:530, offsetWidth:120 };
let filterBar = {
  clientWidth:300,
  offsetLeft:30,
  scrollLeft:0,
  querySelector:function(selector){
    assert.strictEqual(selector, '.shop-filter-btn.on');
    return activeChip;
  },
  scrollTo:function(options){ horizontalScroll = options; }
};
sandbox.document = {
  getElementById:function(id){ return id==='shopFilterBar'?filterBar:null; }
};
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll.left, 410, 'active place chip is horizontally centered');
assert.strictEqual(horizontalScroll.behavior, 'smooth', 'chip centering uses smooth horizontal movement');

horizontalScroll = null;
activeChip = { offsetLeft:50, offsetWidth:80 };
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll.left, 0, 'centering is clamped at the start of the bar');

activeChip = { offsetLeft:450, offsetWidth:100 };
filterBar = {
  clientWidth:300,
  offsetLeft:30,
  scrollLeft:0,
  querySelector:function(){ return activeChip; }
};
sandbox.centerShopFilterChip();
assert.strictEqual(filterBar.scrollLeft, 320, 'scrollLeft fallback centers the chip when scrollTo is unavailable');

sandbox.document = { getElementById:function(){ return null; } };
assert.doesNotThrow(function(){ sandbox.centerShopFilterChip(); }, 'missing filter bar is a no-op');

filterBar = { clientWidth:300, offsetLeft:30, querySelector:function(){ return null; } };
sandbox.document = { getElementById:function(){ return filterBar; } };
assert.doesNotThrow(function(){ sandbox.centerShopFilterChip(); }, 'missing active chip is a no-op');

horizontalScroll = null;
activeChip = { offsetLeft:330, offsetWidth:0 };
filterBar = { clientWidth:300, offsetLeft:30, querySelector:function(){ return activeChip; }, scrollTo:function(options){ horizontalScroll=options; } };
sandbox.document = { getElementById:function(){ return filterBar; } };
sandbox.centerShopFilterChip();
assert.strictEqual(horizontalScroll, null, 'zero layout measurements are a no-op');

assert(html.includes('<div class="shop-filter" id="shopFilterBar">'), 'Shopping filter has a stable horizontal-scroll anchor');
assert(html.includes('requestAnimationFrame(centerShopFilterChip);'), 'Shopping render schedules chip centering after markup replacement');

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

assert.strictEqual(
  sandbox.renderParkingValue('附近有停車場'),
  '附近有停車場',
  'single-line parking stays inline'
);

const parkingListOut = sandbox.renderParkingValue('第一停車場，步行2分鐘\r\n\r\n第二停車場，步行3分鐘');
assert(parkingListOut.includes('class="parking-list"'), 'multiline parking uses list markup');
assert.strictEqual((parkingListOut.match(/<li>/g)||[]).length, 2, 'blank lines do not create bullets');
assert(parkingListOut.indexOf('第一停車場') < parkingListOut.indexOf('第二停車場'), 'parking line order is preserved');
assert(!sandbox.renderParkingValue('<script>alert(1)</script>\n安全停車').includes('<script>'), 'parking text is escaped');
assert.strictEqual((sandbox.renderParkingValue('逗號前,逗號後').match(/<li>/g)||[]).length, 0, 'punctuation does not split parking text');

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

sandbox.isAutoSkipped = function(){ return false; };
assert.strictEqual(
  sandbox.clusterTimeRange({time:'17:30'}, [{time:'17:30'},{time:'19:30'}]),
  '17:30 - 19:30'
);
assert.strictEqual(
  sandbox.clusterTimeRange({time:'17:30'}, [{time:'17:30'},{time:''}]),
  '17:30'
);

const firstClusterStopOut = sandbox.renderClusterStop({
  id:'10/18_4',
  time:'17:30',
  act:'機場與取車',
  place:'岡山桃太郎機場',
  move:'開車',
  note:''
}, {}, {done:{},skip:{},autoSkip:{}}, 0);
assert(firstClusterStopOut.includes('17:30'));
assert(firstClusterStopOut.includes('onclick="openTripItem(0,\'10/18_4\')"'));

const clusterChildOut = sandbox.renderClusterStop({
  id:'10/19_2',
  time:'10:10',
  act:'',
  place:'廣島和平紀念資料館',
  move:'步行3分鐘',
  note:''
}, {}, {done:{},skip:{},autoSkip:{}}, 1);
assert(clusterChildOut.includes('class="nx-cluster-stop'));
assert(clusterChildOut.includes('onclick="openTripItem(1,\'10/19_2\')"'), 'expanded child opens the exact Trip item');

const clusterCardSource = extractFunction('renderClusterNextStopCard');
const parentMainSource = clusterCardSource.slice(0, clusterCardSource.indexOf('nx-cluster-expand'));
assert(!parentMainSource.includes('openTripItem'), 'cluster parent remains non-navigable');
assert(clusterCardSource.includes('renderClusterStop(item,checks,progress,dayIndex)'), 'child renderer receives the selected day');

const currentNextStopOut = sandbox.renderNextStopCard({}, 0, {
  source:'time',
  item:{
    id:'10/18_3',
    time:'15:05',
    act:'抵達岡山機場 入境後前往取車',
    place:'ORIX租車 岡山機場',
    move:'',
    note:'•必備①台灣駕照正本\n•取車時記得錄影\n•訂單編號：133048833'
  }
});
assert(!currentNextStopOut.includes('<span class="now-badge">現在</span>'), 'home next-stop ticket omits the now badge');
assert(!currentNextStopOut.includes('依目前時間'), 'the old home-only time label remains absent');
assert(currentNextStopOut.includes('<b>提醒</b>'), 'the reminder label remains visible');
assert(currentNextStopOut.includes('class="note-list"'), 'home reminders use the shared rich-note renderer');
assert.strictEqual((currentNextStopOut.match(/class="note-li"/g)||[]).length, 3, 'each Sheet bullet stays scannable');

sandbox.DB = { shop:[{ placeId:'P001' }] };
sandbox.resolveRef = function(){
  return {
    kind:'place',
    p:{ placeId:'P001', name:'永旺夢樂城岡山', tnorm:'shopping', type:'購物' }
  };
};
const shoppingNextStopOut = sandbox.renderNextStopCard({}, 0, {
  source:'order',
  item:{ id:'10/18_5', time:'', act:'血拚時間', place:'永旺夢樂城岡山', move:'', note:'' }
});
assert(shoppingNextStopOut.includes('onclick="openShopPlace(\'P001\')"'), 'Today shopping ticket targets its PID');
assert(html.includes(`onclick="openShopPlace(\\''+jsString(p.placeId)+'\\')"`), 'Trip shopping action targets its PID');
assert(html.includes(`id="shopmall_'+cssId(pkey)+'"`), 'shopping cards expose stable PID anchors');

sandbox.resolveParking = function(){
  return { mapcode:'22 220 851*75', pnote:'第一停車場\n第二停車場' };
};
sandbox.kvRow = function(k,v){ return v ? '<div>'+k+v+'</div>' : ''; };
const parkingOut = sandbox.parkingPanel({});
assert(parkingOut.includes('onclick="showMapcode(\'22 220 851*75\')"'));
assert(parkingOut.includes('class="mapcode-box mapcode-open"'));
assert.strictEqual((parkingOut.match(/<li>/g)||[]).length, 2, 'inherited parking panel uses the shared list renderer');
assert(!html.includes('📋 MAP CODE'));
assert(!html.includes(`onclick="copyText(\\''+p.mapcode+`));
assert(!html.includes('parkingPanel(p)+renderNoteBlock(p.note)'));
assert(!html.includes('travelmode=driving" target="_blank" rel="noopener">🚗 導航</a>\'+'));
assert(!html.includes('導航操作'));

sandbox.resolveRef = function(){
  return {
    kind:'rest',
    r:{ name:'一鶴', cat:'骨付鳥', hours:'', pay:'', travel:'', pnote:'第一停車場\n第二停車場', note:'' }
  };
};
const restaurantParkingOut = sandbox.renderNextStopCard({}, 0, {
  source:'order',
  item:{ id:'10/19_9', time:'18:00', act:'晚餐時間', place:'一鶴', move:'', note:'' }
});
assert.strictEqual((restaurantParkingOut.match(/class="parking-list"/g)||[]).length, 1, 'Today reads restaurant pnote and renders parking bullets');
assert.match(html, /parkingKvRow\('🅿 停車',r\.pnote\)/, 'restaurant info uses parking renderer');
assert.match(html, /parkingKvRow\('🅿 停車',h\.pnote\)/, 'hotel info uses parking renderer');
assert.match(html, /parkingKvRow\('🅿 停車',p\.pnote\)/, 'place info uses parking renderer');

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
