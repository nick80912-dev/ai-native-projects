# Today Hero Actionable Summary v103 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a v103 `dev` candidate that turns the active-trip Today Hero into a calm travel briefing: a weather mood, one actionable outing hint, and the next itinerary-aware shopping stop in one compact row.

**Architecture:** Keep the existing weather fetch/cache and Shopping store/domain as authorities, and add two pure presentation projections inside the existing single-file runtime: `weatherTravelHint(weather)` and `todayShoppingHeroModel(model, day, currentStopRef)`. Small render helpers compose those projections inside `renderToday()`; no new state owner, API, schema, storage key, or module is introduced. The next-stop badge continues to own shopping at the exact current stop, while the Hero only summarizes another resolved Today stop.

**Tech Stack:** Static HTML/CSS/ES5-style JavaScript, Node `assert`/`vm` tests, Playwright Chromium, Open-Meteo data already fetched by the app, localStorage Shopping store, PowerShell release gates, Git `dev` branch.

## Global Constraints

- Target runtime is exactly v103; `app-version.js`, `sw.js`, newest `APP_RELEASE_NOTES` entry, and manifest/current records must agree.
- Push only `dev`; do not merge `main`, deploy Netlify production, or create a production tag.
- In `sw.js`, change only `SW_VERSION` from `v102` to `v103`; preserve `skipWaiting()`, `clients.claim()`, `SHELL`, handlers, cache modes, and offline fallback byte-for-byte.
- Active-trip Today only: preserve pre-trip/no-Today layout, D-day countdown, tomorrow preview, next-stop card, complete/skip, payment/reminder disclosure, and the full-itinerary action.
- Do not add a progress ring, percentage, achievement, remaining-stop count, countdown, reward, or urgency copy. Visible progress is only `completed / total`, for example `3 / 12`.
- Weather hint priority is exact: thunderstorm → snow → rain/rain probability ≥40 → fog → temperature ≤12°C → temperature ≥30°C → `適合出發`.
- `順路採買` is permitted only for the first resolved Shopping group after `currentStopRef` in `day.items`; past-only or unresolved-current fallback copy is `今日採買`.
- The Shopping count beside a stop is that group’s `items.length`, never the all-group `model.count`.
- If the exact next stop owns all pending Shopping items, the existing `.nx-buy-badge` remains the sole Shopping entry for that state; do not duplicate it in the Hero.
- Do not change Open-Meteo endpoint/cache TTL/city inference, Shopping schema/stopRef/sort authority, Google Sheet/CMS schema, BUILTIN, localStorage keys, personal backup v9, Ledger, Apps Script, or Netlify configuration.
- Weather failure is optional and silent; one missing summary source must not block the other source or the next-stop card.
- At 320, 375, and 390px the Hero summary stays one row, long stop names ellipsize, there is no horizontal overflow, and the Shopping button is at least 44×44 CSS px with visible keyboard focus.
- Use the approved copy exactly: `外出提醒`, `順路採買`, `今日採買`, `採買清單`, `開啟查看 →`, `記得帶傘`, `留意雷雨`, `注意路滑`, `行車留意濃霧`, `注意保暖`, `記得補水`, `適合出發`.

## File Structure

- `index.html`: owns Today CSS, pure presentation helpers, Hero markup composition, Shopping overlay entry, and user-facing release notes. Keep the new helpers next to their existing weather/Shopping authorities; do not create a second data model.
- `tests/weather-rain-window.test.js`: owns pure weather hint priority, missing-data behavior, visible outing copy, decorative art, and the complete accessible weather label.
- `tests/shopping-list.test.js`: owns the pure itinerary-aware Hero Shopping projection and input immutability.
- `tests/render-note.test.js`: owns string-rendering structure for the single Shopping Hero button and safe stopRef/HTML escaping.
- `tests/home-simplification.test.js`: owns source-level Today hierarchy, active/pre-trip boundaries, removal of legacy active-trip card/chip placement, and preservation of next-stop order.
- `tests/browser/today-live-info.spec.js`: owns real DOM behavior, next-stop exclusion, group focus, keyboard/focus, state fallbacks, and 320/375/390px layout.
- `tests/theme-system.test.js`: owns the rolling five-entry release-note window during the v103 bump.
- `04_UI_GUIDELINES.md`, `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, `tests/README.md`, `tasks/current.md`, `.ai-manifest.json`: record the approved Today contract, v102 acceptance, v103 candidate, exact final evidence, and release boundary.
- `app-version.js`, `sw.js`: synchronized v103 markers; `sw.js` is version-line-only.

---

### Task 1: Add the weather travel-hint presentation seam

**Files:**
- Modify: `tests/weather-rain-window.test.js`
- Modify: `index.html` near `weatherIcon()` and the current `renderWeatherChip()`

**Interfaces:**
- Consumes: existing weather object `{city:string,temp:number,rain:number,icon:string,code:number}` produced by `fetchWeather()`/`getCachedWeather()`.
- Produces: `weatherTravelHint(weather): string`, `renderTodayWeatherArt(weather): string`, and `renderTodayWeatherSummary(weather): string` for Task 3.

- [ ] **Step 1: Replace the legacy weather-chip assertions with failing hint and renderer tests**

In `tests/weather-rain-window.test.js`, keep all `rainChanceFromNow()` and cache assertions. Replace the `renderWeatherChip()` setup/assertions with:

```js
vm.runInContext(extractFunction(html, 'escapeHtml'), sandbox);
vm.runInContext(extractFunction(html, 'weatherTravelHint'), sandbox);
vm.runInContext(extractFunction(html, 'renderTodayWeatherArt'), sandbox);
vm.runInContext(extractFunction(html, 'renderTodayWeatherSummary'), sandbox);

assert.strictEqual(sandbox.weatherTravelHint({temp:21,rain:10,code:95}),'留意雷雨');
assert.strictEqual(sandbox.weatherTravelHint({temp:-2,rain:80,code:71}),'注意路滑');
assert.strictEqual(sandbox.weatherTravelHint({temp:21,rain:10,code:61}),'記得帶傘');
assert.strictEqual(sandbox.weatherTravelHint({temp:21,rain:40,code:1}),'記得帶傘');
assert.strictEqual(sandbox.weatherTravelHint({temp:21,rain:10,code:45}),'行車留意濃霧');
assert.strictEqual(sandbox.weatherTravelHint({temp:12,rain:10,code:1}),'注意保暖');
assert.strictEqual(sandbox.weatherTravelHint({temp:30,rain:10,code:1}),'記得補水');
assert.strictEqual(sandbox.weatherTravelHint({temp:21,rain:10,code:1}),'適合出發');
assert.strictEqual(sandbox.weatherTravelHint(null),'');
assert.strictEqual(sandbox.weatherTravelHint({temp:null,rain:40,code:61}),'');

const weather={city:'廣島',icon:'🌧️',temp:21,rain:40,code:61};
const art=sandbox.renderTodayWeatherArt(weather);
assert(art.includes('class="today-weather-art"'));
assert(art.includes('aria-hidden="true"'));
assert(art.includes('🌧️'));
const summary=sandbox.renderTodayWeatherSummary(weather);
assert(summary.includes('外出提醒'));
assert(summary.includes('21° · 記得帶傘'));
assert(summary.includes('aria-label="廣島 21 度，現在之後最高降雨機率 40%，記得帶傘"'));
assert.strictEqual(sandbox.renderTodayWeatherArt(null),'');
assert.strictEqual(sandbox.renderTodayWeatherSummary(null),'');
```

- [ ] **Step 2: Run the weather test and verify RED**

Run:

```powershell
node tests/weather-rain-window.test.js
```

Expected: FAIL at `weatherTravelHint exists` because the new presentation seam does not exist yet; existing rain-window/cache assertions remain untouched.

- [ ] **Step 3: Implement the pure hint and two escaped render helpers**

Place these functions after `weatherIcon()` and before weather cache helpers in `index.html`; remove the old `renderWeatherChip()` only after Task 3 stops calling it.

```js
function weatherTravelHint(weather){
  if(!weather||typeof weather.temp!=='number'||!isFinite(weather.temp))return '';
  var code=Number(weather.code),rain=Number(weather.rain),temp=Number(weather.temp);
  if(isFinite(code)&&code>=95)return '留意雷雨';
  if(isFinite(code)&&code>=71&&code<=77)return '注意路滑';
  if((isFinite(code)&&((code>=51&&code<=67)||(code>=80&&code<=82)))||
      (isFinite(rain)&&rain>=40))return '記得帶傘';
  if(isFinite(code)&&(code===45||code===48))return '行車留意濃霧';
  if(temp<=12)return '注意保暖';
  if(temp>=30)return '記得補水';
  return '適合出發';
}
function renderTodayWeatherArt(weather){
  if(!weather)return '';
  return '<div class="today-weather-art" aria-hidden="true">'+escapeHtml(weather.icon||'☁️')+'</div>';
}
function renderTodayWeatherSummary(weather){
  var hint=weatherTravelHint(weather);
  if(!hint)return '';
  var rain=typeof weather.rain==='number'&&isFinite(weather.rain)?Math.round(weather.rain):0;
  var label=String(weather.city||'今日')+' '+Math.round(weather.temp)+' 度，現在之後最高降雨機率 '+rain+'%，'+hint;
  return '<div class="today-hero-summary-item today-hero-weather-summary" role="group" aria-label="'+escapeHtml(label)+'">'+
    '<span class="today-hero-summary-label" aria-hidden="true">外出提醒</span>'+
    '<span class="today-hero-summary-value" aria-hidden="true">'+Math.round(weather.temp)+'° · '+escapeHtml(hint)+'</span></div>';
}
```

Use `escapeHtml()` for city/icon/hint-derived markup; do not create a new weather fetch, cache, or state object.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node tests/weather-rain-window.test.js
git diff --check
```

Expected: weather hint priority, missing-data behavior, decorative art, accessible label, rain-window logic, and cache logic all pass; whitespace check exits 0.

- [ ] **Step 5: Commit the weather seam**

```powershell
git add index.html tests/weather-rain-window.test.js
git commit -m "feat(today): add travel-oriented weather summary"
```

---

### Task 2: Add the itinerary-aware Shopping Hero projection

**Files:**
- Modify: `tests/shopping-list.test.js`
- Modify: `index.html` near `buildShoppingTodayReminder()` and `renderShoppingTodayCard()`

**Interfaces:**
- Consumes: existing `buildShoppingTodayReminder()` result `{count,groups:[{stopRef,stopName,items:string[]}]}`, `day.items`, and exact `currentStopRef`.
- Produces: `todayShoppingHeroModel(model, day, currentStopRef): {label,stopRef,stopName,count}|null` and an initially unwired `renderTodayShoppingSummary(day,currentStopRef): string` for Task 3.

- [ ] **Step 1: Add failing pure projection tests**

Immediately after the current `buildShoppingTodayReminder()` assertions in `tests/shopping-list.test.js`, add:

```js
const heroDay={items:[
  {id:'past',place:'已經過站'},
  {id:'current',place:'目前站'},
  {id:'future-a',place:'本通商店街'},
  {id:'future-b',place:'紙鶴塔'}
]};
const heroReminder={count:9,groups:[
  {stopRef:'past',stopName:'已經過站',items:['補買一']},
  {stopRef:'future-a',stopName:'本通商店街',items:['鞋','襪子','藥妝']},
  {stopRef:'future-b',stopName:'紙鶴塔',items:['明信片','模型','餅乾','茶']}
]};
const heroSnapshot=plain(heroReminder);
assert.deepStrictEqual(
  plain(mod.todayShoppingHeroModel(heroReminder,heroDay,'current')),
  {label:'順路採買',stopRef:'future-a',stopName:'本通商店街',count:3},
  'Hero chooses the first resolved group after the current stop and uses that group count'
);
assert.deepStrictEqual(
  plain(mod.todayShoppingHeroModel({count:1,groups:[heroReminder.groups[0]]},heroDay,'current')),
  {label:'今日採買',stopRef:'past',stopName:'已經過站',count:1},
  'past-only shopping never claims to be on the way'
);
assert.deepStrictEqual(
  plain(mod.todayShoppingHeroModel(heroReminder,heroDay,'missing-current')),
  {label:'今日採買',stopRef:'past',stopName:'已經過站',count:1},
  'an unresolved current stop uses neutral copy'
);
assert.strictEqual(mod.todayShoppingHeroModel(null,heroDay,'current'),null);
assert.strictEqual(mod.todayShoppingHeroModel({count:0,groups:[]},heroDay,'current'),null);
assert.deepStrictEqual(heroReminder,heroSnapshot,'Hero projection does not mutate reminder input');
```

- [ ] **Step 2: Run the Shopping test and verify RED**

Run:

```powershell
node tests/shopping-list.test.js
```

Expected: FAIL because `mod.todayShoppingHeroModel` is not a function.

- [ ] **Step 3: Implement the pure projection beside the existing Shopping authority**

Place this function directly after `buildShoppingTodayReminder()` in `index.html` so the Shopping VM slice exports it naturally:

```js
function todayShoppingHeroModel(model,day,currentStopRef){
  if(!model||!Array.isArray(model.groups)||!model.groups.length||!day||!Array.isArray(day.items))return null;
  var order={},current=String(currentStopRef||''),currentIndex=-1,valid=[],i,group,ref;
  day.items.forEach(function(item,index){
    var id=String(item&&item.id||'');
    if(id&&!Object.prototype.hasOwnProperty.call(order,id))order[id]=index;
  });
  if(Object.prototype.hasOwnProperty.call(order,current))currentIndex=order[current];
  for(i=0;i<model.groups.length;i++){
    group=model.groups[i]||{};ref=String(group.stopRef||'');
    if(!ref||!String(group.stopName||'').trim()||!Array.isArray(group.items)||!group.items.length)continue;
    valid.push(group);
  }
  if(!valid.length)return null;
  group=null;
  if(currentIndex>=0){
    for(i=0;i<valid.length;i++){
      ref=String(valid[i].stopRef||'');
      if(Object.prototype.hasOwnProperty.call(order,ref)&&order[ref]>currentIndex){group=valid[i];break;}
    }
  }
  var label=group?'順路採買':'今日採買';
  group=group||valid[0];
  return {label:label,stopRef:String(group.stopRef),stopName:String(group.stopName).trim(),count:group.items.length};
}
```

Do not reorder `model.groups`, inspect GPS, mutate inputs, or change `buildShoppingTodayReminder()`.

- [ ] **Step 4: Add the escaped Shopping renderer without wiring it into Today yet**

Add this next to the current Today Shopping renderer in `index.html`:

```js
function renderTodayShoppingSummary(day,currentStopRef){
  var items=shoppingListStore.all();
  var reminder=buildShoppingTodayReminder(items,day,currentStopRef);
  var model=todayShoppingHeroModel(reminder,day,currentStopRef);
  if(model){
    var accessible='開啟'+model.stopName+'的 '+model.count+' 項待買';
    return '<button type="button" class="today-hero-summary-item today-hero-shopping-summary"'+
      ' onclick="openShoppingList(\''+jsHtmlAttrString(model.stopRef)+'\')" aria-label="'+escapeHtml(accessible)+'">'+
      '<span class="today-hero-summary-label">'+escapeHtml(model.label)+'</span>'+
      '<span class="today-hero-summary-value"><span class="today-hero-shopping-stop">'+escapeHtml(model.stopName)+'</span>'+
      '<small>'+model.count+' 項 →</small></span></button>';
  }
  if(day&&currentStopRef&&nextStopBuyModel(currentStopRef,items))return '';
  return '<button type="button" class="today-hero-summary-item today-hero-shopping-summary today-hero-shopping-generic"'+
    ' onclick="openShoppingList()" aria-label="開啟採買清單"><span class="today-hero-summary-label">採買清單</span>'+
    '<span class="today-hero-summary-value">開啟查看 →</span></button>';
}
```

Keep the old `renderShoppingTodayCard()` and `renderShoppingTodayEntry()` temporarily; Task 3 removes/replaces them atomically with the layout integration.

- [ ] **Step 5: Run focused Shopping regressions and verify GREEN**

Run:

```powershell
node tests/shopping-list.test.js
node tests/render-note.test.js
git diff --check
```

Expected: new projection tests pass, all existing Shopping/store/render tests remain green, and the new renderer is not yet reachable from production Today.

- [ ] **Step 6: Commit the Shopping seam**

```powershell
git add index.html tests/shopping-list.test.js
git commit -m "feat(today): add itinerary-aware shopping summary"
```

---

### Task 3: Compose the approved Hero, remove the legacy active-trip card, and verify interaction

**Files:**
- Modify: `tests/render-note.test.js`
- Modify: `tests/home-simplification.test.js`
- Modify: `tests/browser/today-live-info.spec.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1 `renderTodayWeatherArt(weather)`/`renderTodayWeatherSummary(weather)` and Task 2 `renderTodayShoppingSummary(day,currentStopRef)`.
- Produces: `renderTodayHeroSummary(weather,shoppingHtml): string`, active-trip Hero composition, preserved pre-trip launcher, and the approved DOM/CSS contract.

- [ ] **Step 1: Replace the v86 two-row card string test with a failing Hero Shopping button test**

In `tests/render-note.test.js`:

- Remove `extractFunction('renderShoppingTodayCard')` and the v86 `todayShoppingOut` assertions.
- Add `extractFunction('todayShoppingHeroModel')`, `extractFunction('renderTodayShoppingSummary')`, `extractFunction('weatherTravelHint')`, `extractFunction('renderTodayWeatherSummary')`, and `extractFunction('renderTodayHeroSummary')` to the VM function list.
- Keep the existing Shopping-store and `buildShoppingTodayReminder()` stubs.
- Add this renderer case:

```js
const heroShoppingOut=sandbox.renderTodayShoppingSummary({
  items:[
    {id:'current',place:'目前站'},
    {id:'future',place:'本通商店街'}
  ],
  groups:[{stopRef:'future',stopName:'本通商店街',items:['鞋','襪子','藥妝']}]
},'current');
assert(heroShoppingOut.includes('class="today-hero-summary-item today-hero-shopping-summary"'));
assert(heroShoppingOut.includes('順路採買'));
assert(heroShoppingOut.includes('本通商店街'));
assert(heroShoppingOut.includes('3 項 →'));
assert(heroShoppingOut.includes('aria-label="開啟本通商店街的 3 項待買"'));
assert(heroShoppingOut.includes("openShoppingList('future')"));
assert.strictEqual((heroShoppingOut.match(/<button/g)||[]).length,1);
assert(!heroShoppingOut.includes('<script>'));

const heroSummaryOut=sandbox.renderTodayHeroSummary(
  {city:'廣島',temp:21,rain:40,icon:'🌧️',code:61},
  heroShoppingOut
);
assert(heroSummaryOut.includes('class="today-hero-summary"'));
assert(heroSummaryOut.includes('class="today-hero-summary-divider"'));
assert(heroSummaryOut.indexOf('外出提醒')<heroSummaryOut.indexOf('順路採買'));
assert.strictEqual((heroSummaryOut.match(/today-hero-summary-divider/g)||[]).length,1);
```

Expected initial failure: `renderTodayHeroSummary exists` because the compositor is introduced only after its string contract is locked in this task.

- [ ] **Step 2: Rewrite source-level hierarchy assertions before production composition**

In `tests/home-simplification.test.js`, replace the old active-trip `.weather-chip` and external Shopping-card assertions with exact contracts:

```js
assert.match(html,/\.today-weather-art\{[^}]*font-size:46px/,'Today weather art has visual weight');
assert.match(html,/\.today-hero-summary\{[^}]*display:grid/,'Today owns one summary row');
assert.match(html,/\.today-hero-shopping-summary\{[^}]*min-height:44px/,'Shopping summary remains tappable');
assert.doesNotMatch(html,/\.weather-chip\{/,'legacy weather pill CSS is removed');
assert.doesNotMatch(html,/\.today-shopping-card\{/,'legacy active-trip Shopping card CSS is removed');
assert.match(
  renderToday,
  /renderTodayWeatherArt\(weather\)[\s\S]*renderTodayHeroSummary\(weather,renderShoppingTodayEntry\(day,currentStopRef\)\)/,
  'active Today composes art and the merged summary inside the Hero'
);
assert.doesNotMatch(
  renderToday,
  /h\+=renderShoppingTodayEntry\(day,currentStopRef\)/,
  'active Shopping no longer renders as a separate block below the Hero'
);
assert.match(
  nonTripToday,
  /renderShoppingTodayEntry\(null,''\)[\s\S]*renderPreTripBrief\(\)/,
  'pre-trip Shopping launcher remains in its existing place'
);
```

Keep existing assertions for the date size, label size, next-stop/cluster controller, D-day row, decision buttons, and pre-trip action styling.

- [ ] **Step 3: Replace the obsolete Browser card cases with approved Hero behavior cases**

In `tests/browser/today-live-info.spec.js`, retain the four next-stop badge tests and the payment/reminder/nested-control tests. Replace the cases that expect two `.today-shopping-summary-row` elements with these behaviors:

```js
test('Today Hero excludes the exact next stop and shows the first future Shopping group', async ({ page }) => {
  const seeded=await seedTodayShoppingGroups(page,[
    ['下一站一','下一站二'],
    ['醬油','抹茶','和菓子'],
    ['咖啡豆','果醬','餅乾','茶葉']
  ]);
  const expected=await page.evaluate((ref)=>shoppingStopById(ref).name,seeded.otherRefs[0]);
  const summary=page.locator('#view-today .today-hero-shopping-summary');
  await expect(summary.locator('.today-hero-summary-label')).toHaveText('順路採買');
  await expect(summary.locator('.today-hero-shopping-stop')).toHaveText(expected);
  await expect(summary.locator('small')).toHaveText('3 項 →');
  await expect(summary).not.toContainText('下一站一');
  await expect(page.locator('#view-today .today-shopping-card')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-launcher')).toHaveCount(0);
});

test('Today weather uses a decorative mood and an actionable accessible summary', async ({ page }) => {
  await page.evaluate(()=>{
    requestHomeWeather=function(){};
    homeWeatherFor=function(){return {city:'廣島',temp:21,rain:40,icon:'🌧️',code:61};};
    renderToday();
  });
  await expect(page.locator('#view-today .today-weather-art')).toHaveText('🌧️');
  await expect(page.locator('#view-today .today-weather-art')).toHaveAttribute('aria-hidden','true');
  const weather=page.locator('#view-today .today-hero-weather-summary');
  await expect(weather).toContainText('外出提醒');
  await expect(weather).toContainText('21° · 記得帶傘');
  await expect(weather).toHaveAttribute('aria-label','廣島 21 度，現在之後最高降雨機率 40%，記得帶傘');
  const progress=page.locator('#view-today .today-hero-top .loc');
  await expect(progress).toHaveText(/^\d+ \/ \d+$/);
  await expect(progress).not.toContainText('已處理');
});
```

Replace the existing all-in-next, other-stop, and whole-card interaction cases with:

```js
test('all Shopping at the current next stop leaves only the existing badge', async ({ page }) => {
  await seedTodayShoppingGroups(page,[['下一站一','下一站二']]);
  await expect(page.locator('#view-today .nx-buy-badge')).toHaveText('🛍 2');
  await expect(page.locator('#view-today .today-hero-shopping-summary')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-card')).toHaveCount(0);
  await expect(page.locator('#view-today .today-shopping-launcher')).toHaveCount(0);
});

test('another stop remains available in the Hero when the next stop has nothing to buy', async ({ page }) => {
  await seedTodayShoppingGroups(page,[[],['其他站一','其他站二']]);
  await expect(page.locator('#view-today .nx-buy-badge')).toHaveCount(0);
  await expect(page.locator('#view-today .today-hero-shopping-summary')).toContainText('2 項 →');
});

test('the Hero Shopping button focuses its group and supports keyboard activation', async ({ page }) => {
  const seeded=await seedTodayShoppingGroups(page,[[],['醬油','抹茶']]);
  const expectedId=await page.evaluate((ref)=>'shopgroup_'+cssId(ref),seeded.otherRefs[0]);
  await page.evaluate(()=>{
    const original=Element.prototype.scrollIntoView;
    window.__todayHeroScrollTarget='';
    Element.prototype.scrollIntoView=function(options){
      window.__todayHeroScrollTarget=this.id||'';
      return original.call(this,options);
    };
  });
  const summary=page.locator('#view-today .today-hero-shopping-summary');
  await summary.focus();
  const focusStyle=await summary.evaluate((element)=>{
    const style=getComputedStyle(element);
    return {outlineStyle:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)||0};
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  await summary.press('Enter');
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.__todayHeroScrollTarget)).toBe(expectedId);
  expect(await page.evaluate(()=>curView)).toBe('today');
  await page.evaluate(()=>closeShoppingList());
  await summary.focus();
  await summary.press('Space');
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
});

test('weather failure keeps the generic Shopping entry usable', async ({ page }) => {
  await page.evaluate(()=>{
    requestHomeWeather=function(){};
    homeWeatherFor=function(){return null;};
    shoppingListStore.removeMany(shoppingListStore.all().map((item)=>item.id));
    renderToday();
  });
  await expect(page.locator('#view-today .today-weather-art')).toHaveCount(0);
  const summary=page.locator('#view-today .today-hero-shopping-summary');
  await expect(summary).toContainText('採買清單');
  await expect(summary).toContainText('開啟查看 →');
  await summary.click();
  await expect(page.locator('#shoppingListOverlay')).toBeVisible();
});
```

The pure Task 2 tests are the authoritative proof for the `今日採買` past-only/unresolved-current wording; do not create a brittle Browser state by rewriting itinerary progress solely to repeat that pure rule.

- [ ] **Step 4: Expand the narrow-width Browser case to the merged row**

For each width `[320,375,390]`, seed one long future stop name by mutating that fixture stop’s `place`, render fixed weather, and return:

```js
const hero=document.querySelector('#view-today .today-hero');
const summary=document.querySelector('#view-today .today-hero-summary');
const shopping=document.querySelector('#view-today .today-hero-shopping-summary');
const stop=document.querySelector('#view-today .today-hero-shopping-stop');
const ticket=document.querySelector('#view-today .nx-ticket');
const s=shopping.getBoundingClientRect(),h=hero.getBoundingClientRect(),t=ticket.getBoundingClientRect();
return {
  overflow:document.documentElement.scrollWidth>window.innerWidth,
  summaryRows:getComputedStyle(summary).gridTemplateRows.split(' ').length,
  shoppingWidth:Math.round(s.width),shoppingHeight:Math.round(s.height),
  stopOverflow:stop.scrollWidth>stop.clientWidth,
  stopWhiteSpace:getComputedStyle(stop).whiteSpace,
  heroHeight:Math.round(h.height),ticketTop:Math.round(t.top)
};
```

Assert no page overflow, one grid row, Shopping height ≥44, long stop ellipsizes with `white-space:nowrap`, Hero height ≤190px, and the next-stop ticket begins above 300px. Preserve existing next-stop badge overlap and 44×44 assertions in the same loop.

- [ ] **Step 5: Implement the merged Hero CSS and delete legacy active-trip styles**

Replace the existing `.today-hero-trip`, `.today-hero-main`, `.weather-chip`, and `.today-shopping-card*` rules with the approved structure. Keep `.today-shopping-launcher` and `.today-hero-action` for pre-trip.

```css
.today-hero-trip{display:block}
.today-hero-main{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:66px;position:relative}
.today-weather-art{flex:0 0 76px;text-align:center;font-size:46px;line-height:1;filter:drop-shadow(0 5px 8px rgba(8,36,27,.2));position:relative}
.today-hero-summary{display:grid;grid-template-columns:minmax(0,.9fr) 1px minmax(0,1.1fr);gap:10px;align-items:center;padding-top:9px;border-top:1px solid rgba(255,255,255,.22);position:relative}
.today-hero-summary.single{grid-template-columns:minmax(0,1fr)}
.today-hero-summary-divider{width:1px;height:32px;background:rgba(255,255,255,.25)}
.today-hero-summary-item{min-width:0;min-height:44px;display:flex;flex-direction:column;justify-content:center;color:#fff}
.today-hero-summary-label{font-size:9px;letter-spacing:.08em;opacity:.74;font-weight:800;white-space:nowrap}
.today-hero-summary-value{display:flex;align-items:baseline;gap:4px;min-width:0;margin-top:2px;font-size:13px;font-weight:900;white-space:nowrap}
.today-hero-summary-value small{flex:0 0 auto;font-size:10px;color:#fff3b5}
.today-hero-shopping-summary{appearance:none;width:100%;min-height:44px;border:0;background:transparent;padding:0;text-align:right;font:inherit;align-items:flex-end;cursor:pointer}
.today-hero-shopping-summary:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:7px}
.today-hero-shopping-stop{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
```

Use the existing theme variables for Hero background/text. Do not introduce a hard-coded alternative Hero palette or new card shadow.

- [ ] **Step 6: Add the Hero summary compositor and wire `renderToday()`**

Add:

```js
function renderTodayHeroSummary(weather,shoppingHtml){
  var weatherHtml=renderTodayWeatherSummary(weather),parts=[];
  if(weatherHtml)parts.push(weatherHtml);
  if(shoppingHtml)parts.push(shoppingHtml);
  if(!parts.length)return '';
  return '<div class="today-hero-summary'+(parts.length===1?' single':'')+'">'+
    parts.join('<span class="today-hero-summary-divider" aria-hidden="true"></span>')+'</div>';
}
```

Change `renderShoppingTodayEntry()` so active-trip output is the Task 2 summary while pre-trip remains the old launcher:

```js
function renderShoppingTodayEntry(day,currentStopRef){
  if(day)return renderTodayShoppingSummary(day,currentStopRef);
  return '<button type="button" class="today-shopping-launcher today-hero-action" onclick="openShoppingList()">採買清單 →</button>';
}
```

Delete `renderShoppingTodayCard()` and its CSS. In `renderToday()`, replace the Hero build with this shape and remove the later `h+=renderShoppingTodayEntry(day,currentStopRef)`:

```js
var progressLabel='今日已處理 '+completed+' 站，共 '+items.length+' 站';
var h='<div class="today-hero today-hero-trip'+(weather?' weather-on':'')+'"><div class="today-hero-top"><div class="lbl">TODAY · DAY '+(ti+1)+'</div>'+
  '<div class="loc" aria-label="'+escapeHtml(progressLabel)+'">'+completed+' / '+items.length+'</div></div>'+
  '<div class="today-hero-main"><div class="date">'+day.date+(day.dow?' ('+day.dow+')':'')+'</div>'+renderTodayWeatherArt(weather)+'</div>'+
  renderTodayHeroSummary(weather,renderShoppingTodayEntry(day,currentStopRef))+'</div>';
```

Do not move weather request timing, `currentStop`/cluster-child resolution, next-stop rendering, tomorrow preview, or the final full-detail button.

- [ ] **Step 7: Run focused Node and Browser tests and verify GREEN**

Run:

```powershell
node tests/weather-rain-window.test.js
node tests/shopping-list.test.js
node tests/render-note.test.js
node tests/home-simplification.test.js
npx playwright test tests/browser/today-live-info.spec.js
npx playwright test tests/browser/overlay-and-retap.spec.js tests/browser/shop-list-entry.spec.js tests/browser/trip-three-scenarios.spec.js
git diff --check
```

Expected: all focused tests pass; the active Today Hero has one summary row, the next-stop badge remains authoritative, overlay/retap behavior is unchanged, and all three startup scenarios have zero page errors.

- [ ] **Step 8: Inspect and commit the complete UI slice**

Run:

```powershell
git diff -- index.html tests/weather-rain-window.test.js tests/shopping-list.test.js tests/render-note.test.js tests/home-simplification.test.js tests/browser/today-live-info.spec.js
```

Confirm there is no progress ring/percentage, no active `.today-shopping-card`, no duplicate next-stop Shopping summary, and no pre-trip change. Then commit:

```powershell
git add index.html tests/render-note.test.js tests/home-simplification.test.js tests/browser/today-live-info.spec.js
git commit -m "feat(today): compose actionable hero summary"
```

---

### Task 4: Stage v103 records, run the complete gate, and push `dev`

**Files:**
- Modify: `tests/theme-system.test.js`
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html`
- Modify: `04_UI_GUIDELINES.md`
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `tests/README.md`
- Modify: `tasks/current.md`
- Modify: `.ai-manifest.json`

**Interfaces:**
- Consumes: the verified Hero implementation from Tasks 1–3 and the existing v102 release/gate machinery.
- Produces: synchronized v103 runtime markers, five current user release notes, exact fresh automated evidence, updated v102 acceptance status, and a non-force `origin/dev` push.

- [ ] **Step 1: Update the release-window test first and verify RED**

In `tests/theme-system.test.js`, change the four historical versions after current to:

```js
['v102','v101','v100','v99']
```

Run:

```powershell
node tests/theme-system.test.js
```

Expected: FAIL because current runtime/latest release note remain v102 and the existing history still ends at v98.

- [ ] **Step 2: Synchronize v103 markers and add the exact user-facing release note**

Set:

```js
// app-version.js
var APP_VERSION='v103';

// sw.js
var SW_VERSION='v103';
```

Prepend this entry to `APP_RELEASE_NOTES`, retain v102/v101/v100/v99, and drop v98 so the list remains exactly five:

```js
{version:'v103',date:'2026-08-11',title:'今天首頁更像旅行提示',items:[
  '天氣與採買整合進日期卡，下一站資訊更快進入視線',
  '天氣改為記得帶傘等外出提醒，採買優先顯示下一個順路地點',
  '行程站數只保留輕量位置提示，不加入完成率、圓環或催促文案'
]}
```

- [ ] **Step 3: Prove the Service Worker change is version-only**

Run:

```powershell
git diff -U0 -- sw.js
node tools/check-app-version.js
node tests/pwa-shell.test.js
node tests/theme-system.test.js
```

Expected: `sw.js` has exactly one changed version line; version checker reports v103; PWA shell and release-note/theme tests pass.

- [ ] **Step 4: Update canonical UI, handover, test, task, and manifest records**

Make these exact record changes:

- `04_UI_GUIDELINES.md`: add the active-trip Today hierarchy: small `completed / total`, date plus decorative weather art, one-row `外出提醒`/Shopping summary, Shopping location as primary copy, 44px/focus/ellipsis requirements, and next-stop badge ownership.
- `07_CHANGELOG.md`: prepend a 2026-08-11 v103 entry with the approved no-KPI rationale, weather hint priority, itinerary-aware `順路採買`/`今日採買` distinction, active-only scope, v102 device acceptance, unchanged data/SW boundaries, and final gate evidence.
- `08_AI_HANDOVER.md`: mark v102 device/PWA acceptance complete; add the v103 Today contract and rollback boundary; preserve HID, Ledger, sync, storage, and deployment authority sections.
- `tests/README.md`: update `weather-rain-window.test.js`, `shopping-list.test.js`, `home-simplification.test.js`, `render-note.test.js`, and `browser/today-live-info.spec.js` descriptions to the new hint/projection/single-row/fallback/a11y contracts; remove the obsolete two-row/three-item Today-card wording.
- `tasks/current.md`: record v102 Bar acceptance complete; make v103 the current dev candidate; add the Today Hero row to the optimization roadmap and make device/PWA appearance/interaction verification the next action.
- `.ai-manifest.json`: set version to `2.27-today-actionable-summary-v103`, update date/status/dev candidate/device acceptance/next action, and later replace automated totals with the exact successful gate output.

Do not edit `tasks/backlog.md`, `tasks/done.md`, database/schema docs, ADRs, BUILTIN, or release/deployment records: this feature creates no numbered backlog closure, schema decision, data migration, production merge, or deployment.

- [ ] **Step 5: Run the complete fresh verification gate and capture actual totals**

Run:

```powershell
$failed=@(); $count=0; Get-ChildItem tests -File -Filter *.test.js | Sort-Object Name | ForEach-Object { $count++; node $_.FullName; if($LASTEXITCODE -ne 0){$failed+=$_.Name} }; Write-Host "NODE_TOTAL=$count"; if($failed.Count){throw ('Node failures: '+($failed -join ', '))}
npx playwright test
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node tools/refresh-builtin-snapshot.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Baseline before implementation is 83 Node test files and 148 Playwright cases. The Node file count should remain 83 because this plan modifies existing tests only; record the actual Playwright total after replacing/adding cases. Any failed test, BUILTIN drift exit code, malformed manifest, version mismatch, or whitespace error blocks commit/push.

- [ ] **Step 6: Insert exact totals, rerun record gates, and commit v103**

Replace provisional evidence in `07_CHANGELOG.md`, `08_AI_HANDOVER.md`, `tasks/current.md`, and `.ai-manifest.json` with the successful output from Step 5. Then run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-runtime-assets.js
node -e "JSON.parse(require('fs').readFileSync('.ai-manifest.json','utf8')); console.log('manifest JSON ok')"
git diff --check
```

Commit:

```powershell
git add app-version.js sw.js index.html 04_UI_GUIDELINES.md 07_CHANGELOG.md 08_AI_HANDOVER.md tests/README.md tests/theme-system.test.js tasks/current.md .ai-manifest.json
git commit -m "chore(release): stage v103 dev candidate"
```

- [ ] **Step 7: Review the whole branch, recheck ancestry, and push `dev` non-force**

Run:

```powershell
git fetch origin --prune
$remote=(git rev-parse origin/dev).Trim()
$base=(git merge-base HEAD origin/dev).Trim()
if($base -ne $remote){throw 'origin/dev is not an ancestor of HEAD'}
git log --oneline "$remote..HEAD"
git diff --stat "$remote..HEAD"
git push origin dev
if((git rev-parse HEAD).Trim() -ne (git rev-parse origin/dev).Trim()){throw 'push verification failed'}
git status --short --branch
```

Expected: branch review includes the approved design/plan and four implementation commits, push succeeds without force, `HEAD` equals `origin/dev`, worktree is clean, and `main`, production deployment, and tags remain untouched.

- [ ] **Step 8: Hand off mobile acceptance and stop**

Report commit IDs and exact automated totals. Ask Bar to verify on the dev PWA at 320/375/390-class phone widths that:

- Hero right side feels like weather ambience, not a progress/KPI gauge.
- `3 / 12` stays visually secondary and has no percentage/urgency copy.
- left summary reads like an outing hint; right summary prioritizes the next Shopping location and opens that group.
- next-stop Shopping appears only in the existing badge, with no duplicate Hero reminder.
- long stop names ellipsize, the next-stop card remains visible, keyboard/touch actions work, and there are no errors or horizontal overflow.

Stop before any merge, production deployment, or production tag.
