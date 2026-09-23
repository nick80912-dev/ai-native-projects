const assert=require('assert');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();

assert.match(html,/function navigationTravelMode\(item,res\)/,'navigation has an item-local travel-mode resolver');
assert.match(html,/function navigationDestinationQuery\(intent,item,hasOrigin\)/,'navigation has an explicit country-qualification boundary');
assert.match(extractFunction(html,'renderTripNavigationLink'),/navigationTravelMode\(it,res\)/,'navigation label and URL share the item-local mode');

assert.match(html,/function tripItemPresentation\(it,res\)/,'itinerary presentation has one destination-first helper');
assert.match(extractFunction(html,'renderItem'),/var presentation=tripItemPresentation\(it,res\)/,'itinerary cards use destination-first presentation');

assert.match(html,/\.sm-hours\{font-size:13px/,'opening hours are readable at 13px');
/* v126:原本這裡還有一條「樓層資訊 .st-l 13px 可讀」的斷言。查證後 .st-l 與 .st-v
   在整份 App 各只出現一次 —— 就是 CSS 規則本身,markup 從未輸出過(對照組
   .sm-hours / .st-chk / .st-must 都有 class 屬性引用)。該斷言守的是死碼,隨整組
   舊樣式於 v126 一併移除。上一行的 .sm-hours 13px 斷言仍然有效。 */

const init=extractFunction(html,'init');
assert.doesNotMatch(init,/openMemberSelector\(true\)/,'startup does not block browsing with identity selection');
const switchView=extractFunction(html,'switchView');
assert.match(switchView,/v==='split'&&!ensureLedgerMember\(\)/,'entering Ledger requests identity only when needed');

const shoppingGroups=extractFunction(html,'renderShoppingGroups');
assert.match(shoppingGroups,/新增第一項採買/,'empty Shopping has a primary first-item action');
const renderSplit=extractFunction(html,'renderSplit');
assert.match(renderSplit,/記一筆消費/,'empty Ledger has a primary first-expense action');
assert.match(renderSplit,/hasRecords/,'empty Ledger can suppress zero-value management cards');

assert.match(html,/function preTripDestinationHighlights\(day,limit\)/,'pre-trip preview uses destination-first highlights');
assert.match(extractFunction(html,'preTripDestinationHighlights'),/if\(!String\(place\|\|''\)\.trim\(\)\)return/,'pre-trip highlights omit generic activity-only rows');
const preTrip=extractFunction(html,'renderPreTripBrief');
assert.match(preTrip,/preTripDestinationHighlights\(day,2\)/,'Day 1 preview is limited to two destinations');
assert.match(preTrip,/還有 .+ 站/,'Day 1 preview states the remaining stop count');
const today=extractFunction(html,'renderToday');
assert.match(today,/preTripDestinationHighlights\(d,3\)/,'pre-trip day summaries are destination-first');

console.log('v112 UI/UX tests passed');
