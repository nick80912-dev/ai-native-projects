const assert = require('assert');
const fs = require('fs');
const path = require('path');

for (const file of ['index.html']) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert.match(html, /--tabbar-height:62px/, `${file} has a stable tabbar height`);
  assert.match(html, /height:calc\(var\(--tabbar-height\) \+ env\(safe-area-inset-bottom\)\)/, `${file} locks tabbar height`);
  assert.match(html, /var timePick=item\?pickNextStop\(\[item\]/, `${file} reuses next-stop timing when a check is cancelled`);
  assert.match(html, /已取消,該行程時間已過,列於已略過/, `${file} explains past-time cancellation`);
  const clusterStop = html.slice(html.indexOf('function renderClusterStop'), html.indexOf('function renderClusterNextStopCard'));
  assert.doesNotMatch(clusterStop, /qa-btn|pn_pk_|pn_nf_/, `${file} keeps cluster child stops action-free on home`);
  const renderToday = html.slice(html.indexOf('function renderToday'), html.indexOf('/* ================= 購物模式'));
  assert.match(renderToday, /var items=homeNextStopItems\(day\.items\)/, `${file} routes Today through cluster controllers`);
  assert.match(renderToday, /clusterParentForPick\(day\.items,pick\.item\)/, `${file} resolves the original parent before rendering a cluster`);
  assert.match(renderToday, /today-hero-top[\s\S]*TODAY · DAY[\s\S]*class="loc"/, `${file} keeps Today and progress on the same top row`);
  const nonTripToday = renderToday.slice(renderToday.indexOf('if(ti===null)'), renderToday.indexOf('var day=DB.trip.days[ti]'));
  assert.match(
    nonTripToday,
    /today-pretrip-title-row[\s\S]*還沒到出發日[\s\S]*renderPreTripCountdown\(\)/,
    `${file} places the D-day countdown beside the non-trip title`
  );
  assert(
    nonTripToday.indexOf('renderShoppingTodayEntry(null)') < nonTripToday.indexOf('renderPreTripBrief()'),
    `${file} places the non-trip shopping launcher inside Today before the D-day preview`
  );
  const preTripBrief = html.slice(html.indexOf('function renderPreTripBrief'), html.indexOf('var TOMORROW_PREVIEW_HOUR'));
  assert.doesNotMatch(preTripBrief, /pretrip-count/, `${file} renders the countdown only in the title row`);
  assert(
    renderToday.indexOf('renderShoppingTodayEntry(day)') < renderToday.indexOf('renderClusterNextStopCard'),
    `${file} places the shopping entry immediately below the Today summary and before the next-stop card`
  );
  assert.match(html, /\.today-hero\{[^}]*padding:11px 14px 12px/, `${file} trims Today card padding without shrinking its typography`);
  assert.match(html, /\.today-hero \.lbl\{font-size:11px/, `${file} preserves the Today label size`);
  assert.match(html, /\.today-hero \.date\{font-size:24px/, `${file} preserves the Today date size`);
  assert.match(html, /\.today-hero \.loc\{font-size:13px/, `${file} preserves the progress size`);
  assert.match(html, /\.weather-chip\{[^}]*font-size:13px/, `${file} preserves the weather size`);
  assert.match(html, /\.today-hero-action\{[^}]*width:auto[^}]*color:#fff/, `${file} keeps the non-trip launcher compact inside the dark Today card`);
  assert.match(
    html,
    /\.today-hero-action\{[^}]*display:inline-flex[^}]*min-height:44px[^}]*background:rgba\(255,255,255,\.16\)[^}]*border:none[^}]*border-radius:10px/,
    `${file} gives shopping and itinerary actions one shared visual treatment`
  );
  assert.match(
    nonTripToday,
    /class="today-jump today-hero-action"/,
    `${file} uses the shared action class for full itinerary`
  );
  assert.match(html, /class="today-shopping-launcher'\+\(day\?'':' today-hero-action'\)/, `${file} uses the shared action class for non-trip shopping`);
  assert.match(html, /\.today-pretrip-title-row\{[^}]*display:flex[^}]*justify-content:space-between/, `${file} keeps the non-trip title and countdown on one row`);
  assert.match(html, /想逛<small>/, `${file} preserves the shop wishlist`);
  assert.match(html, /\.nx-decision-btn\{[^}]*font-size:12px/, `${file} uses compact home decision buttons`);
}

console.log('home simplification tests passed');
