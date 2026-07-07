# Home Weather Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact weather summary to the home date card using the next stop's inferred destination.

**Architecture:** Keep the existing single-file Vanilla JS app. Add small helper functions for destination inference, Open-Meteo fetch/cache, and optional weather rendering inside the existing home date card flow.

**Tech Stack:** Vanilla HTML/CSS/JS, ES5-style `function` / `var`, existing `localStorage` helpers, existing CMS data in `DB`, Open-Meteo Forecast API.

## Global Constraints

- Placement: right side of the home date card.
- Weather basis: next-stop destination or today's primary itinerary area.
- Display format: `岡山 ☁️ 18° 雨40%`.
- Rain text: use `雨40%`.
- GPS: not used.
- Do not add Google Sheet columns.
- Do not change `schema.js`.
- Do not write weather or progress back to CMS.
- Weather is optional and must never block the next-stop card.
- Hide weather when city or weather data cannot be resolved.
- Cache weather in `localStorage` for a short period such as 1 to 3 hours.
- Update `07_CHANGELOG.md` when implementation is delivered.

---

## References

- Design spec: `docs/superpowers/specs/2026-07-07-home-weather-summary-design.md`
- Open-Meteo Forecast API: https://open-meteo.com/en/docs
- Open-Meteo Geocoding API: https://open-meteo.com/en/docs/geocoding-api

Open-Meteo's Forecast API accepts `latitude` and `longitude`, supports `current` variables, and supports `hourly=precipitation_probability`. The plan uses an internal city coordinate table for MVP and does not require geocoding at runtime.

---

## File Structure

- Modify: `日本行程V2預覽.html`
  - Add weather chip CSS near the existing home / next-stop styles.
  - Add city coordinate and text-matching helpers near next-stop helpers.
  - Add weather fetch/cache helpers near localStorage helpers.
  - Extend `renderToday()` so it renders the weather chip and triggers background weather loading.
- Modify: `07_CHANGELOG.md`
  - Add one implementation entry after app behavior changes.
- Do not modify: `schema.js`, `validator.js`, `09_SCHEMA_MAPPING.md`, `11_CODING_CONVENTION.md`, Google Sheet data, parser schema, or unrelated tabs.

---

### Task 1: Add Destination Inference Helpers

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `resolveRef(it)`, existing itinerary item shape.
- Produces:
  - `WEATHER_CITIES`
  - `weatherTextForItem(item,res) -> string`
  - `inferWeatherCity(item,res) -> object|null`

- [ ] **Step 1: Add internal city table**

Add this near the next-stop helper functions:

```javascript
var WEATHER_CITIES=[
  { key:'okayama', label:'岡山', lat:34.6618, lon:133.9350, words:['岡山','倉敷','ORIX租車 岡山機場','永旺夢樂城岡山'] },
  { key:'hiroshima', label:'廣島', lat:34.3853, lon:132.4553, words:['廣島','原爆','和平紀念','紙鶴塔','本通'] },
  { key:'miyajima', label:'宮島', lat:34.2959, lon:132.3198, words:['宮島','嚴島','宮島口','表参道'] },
  { key:'tokyo', label:'東京', lat:35.6762, lon:139.6503, words:['東京','新宿','淺草','銀座','六本木','澀谷','原宿','秋葉原','駒込'] },
  { key:'kamakura', label:'鎌倉', lat:35.3192, lon:139.5467, words:['鎌倉','江之島','藤澤','七里濱'] },
  { key:'narita', label:'成田', lat:35.7767, lon:140.3183, words:['成田','京成','Skyliner'] }
];
```

- [ ] **Step 2: Add text collection and city inference**

```javascript
function weatherTextForItem(item,res){
  var p=res&&res.kind==='place'?res.p:null;
  var r=res&&res.kind==='rest'?res.r:null;
  return [
    item&&item.place,
    item&&item.act,
    item&&item.move,
    item&&item.note,
    p&&p.name,
    p&&p.note,
    p&&p.travel,
    r&&r.name,
    r&&r.note,
    r&&r.travel
  ].filter(Boolean).join(' ');
}
function inferWeatherCity(item,res){
  var text=weatherTextForItem(item,res);
  for(var i=0;i<WEATHER_CITIES.length;i++){
    var city=WEATHER_CITIES[i];
    for(var j=0;j<city.words.length;j++){
      if(text.indexOf(city.words[j])>=0) return city;
    }
  }
  return null;
}
```

- [ ] **Step 3: Verify city inference in browser console**

Run:

```javascript
var day=DB.trip.days[0];
var item=day.items.filter(function(it){return it.ref==='P012';})[0];
var city=inferWeatherCity(item,resolveRef(item));
console.log(city&&city.label==='岡山');
```

Expected: `true`.

- [ ] **Step 4: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add weather destination inference"
```

---

### Task 2: Add Weather Fetch, Mapping, And Cache Helpers

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `lsGet(k,f)`, `lsSet(k,v)`, `AppLog`.
- Produces:
  - `weatherIcon(code) -> string`
  - `weatherCacheKey(city) -> string`
  - `getCachedWeather(city) -> object|null`
  - `setCachedWeather(city,data) -> void`
  - `fetchWeather(city) -> Promise<object|null>`
  - `loadWeatherForCity(city) -> Promise<object|null>`

- [ ] **Step 1: Add weather icon mapping and cache helpers**

```javascript
function weatherIcon(code){
  code=Number(code);
  if(code===0) return '☀️';
  if(code===1||code===2) return '🌤️';
  if(code===3) return '☁️';
  if(code===45||code===48) return '🌫️';
  if((code>=51&&code<=67)||(code>=80&&code<=82)) return '🌧️';
  if(code>=71&&code<=77) return '❄️';
  if(code>=95) return '⛈️';
  return '☁️';
}
function weatherCacheKey(city){ return 'trip_weather_'+city.key; }
function getCachedWeather(city){
  var cached=lsGet(weatherCacheKey(city),null);
  if(!cached||!cached.t) return null;
  var maxAge=3*60*60*1000;
  return (Date.now()-cached.t)<maxAge?cached.data:null;
}
function setCachedWeather(city,data){
  lsSet(weatherCacheKey(city),{ t:Date.now(), data:data });
}
```

- [ ] **Step 2: Add Open-Meteo fetch helper**

```javascript
function fetchWeather(city){
  var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(city.lat)+
    '&longitude='+encodeURIComponent(city.lon)+
    '&current=temperature_2m,weather_code'+
    '&hourly=precipitation_probability'+
    '&forecast_days=1&timezone=Asia%2FTokyo';
  return fetchWithTimeout(url,6500).then(function(r){
    if(!r.ok) throw new Error('weather '+r.status);
    return r.json();
  }).then(function(json){
    var rain=0;
    if(json.hourly&&json.hourly.precipitation_probability&&json.hourly.precipitation_probability.length){
      rain=Math.max.apply(null,json.hourly.precipitation_probability.filter(function(v){return typeof v==='number';}));
    }
    var temp=json.current&&typeof json.current.temperature_2m==='number'?Math.round(json.current.temperature_2m):null;
    var code=json.current?json.current.weather_code:null;
    if(temp===null) return null;
    return { city:city.label, temp:temp, rain:rain||0, icon:weatherIcon(code), code:code };
  });
}
function loadWeatherForCity(city){
  var cached=getCachedWeather(city);
  if(cached) return Promise.resolve(cached);
  return fetchWeather(city).then(function(data){
    if(data) setCachedWeather(city,data);
    return data;
  }).catch(function(err){
    AppLog&&AppLog.data&&AppLog.data('天氣讀取失敗:'+city.label+' '+(err.message||err));
    return getCachedWeather(city);
  });
}
```

- [ ] **Step 3: Verify Open-Meteo response**

Run the app on `http://127.0.0.1` and execute:

```javascript
loadWeatherForCity(WEATHER_CITIES[0]).then(function(w){
  console.log(!!(w&&w.city&&typeof w.temp==='number'&&typeof w.rain==='number'));
});
```

Expected: `true`. If the external service is unavailable, confirm the app stays usable and no uncaught error appears.

- [ ] **Step 4: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add home weather fetch and cache helpers"
```

---

### Task 3: Render Weather Chip In The Home Date Card

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `inferWeatherCity(item,res)`, `loadWeatherForCity(city)`, `getCachedWeather(city)`, `renderToday()`.
- Produces:
  - `renderWeatherChip(weather) -> string`
  - `requestHomeWeather(dayIndex,item) -> void`
  - `homeWeatherState` runtime variable.

- [ ] **Step 1: Add CSS for date-card layout and chip**

Add near `.today-hero` styles:

```css
.today-hero.weather-on{display:flex;align-items:center;justify-content:space-between;gap:12px}
.today-hero-main{min-width:0}
.weather-chip{flex:0 0 auto;text-align:right;font-size:12px;line-height:1.35;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.26);border-radius:999px;padding:7px 9px;color:#fff;font-weight:800;white-space:nowrap}
.weather-chip .city{display:block;font-size:11px;opacity:.9;font-weight:700}
```

- [ ] **Step 2: Add render and request helpers**

Add before `renderToday()`:

```javascript
var homeWeatherState={};
function renderWeatherChip(weather){
  if(!weather) return '';
  return '<div class="weather-chip"><span class="city">'+escapeHtml(weather.city)+'</span>'+escapeHtml(weather.icon+' '+weather.temp+'° 雨'+weather.rain+'%')+'</div>';
}
function requestHomeWeather(dayIndex,item){
  if(!item) return;
  var res=resolveRef(item);
  var city=inferWeatherCity(item,res);
  if(!city) return;
  var key='day_'+dayIndex+'_'+city.key;
  if(homeWeatherState[key]) return;
  var cached=getCachedWeather(city);
  if(cached){ homeWeatherState[key]=cached; return; }
  homeWeatherState[key]={ loading:true };
  loadWeatherForCity(city).then(function(weather){
    if(weather){ homeWeatherState[key]=weather; if(curView==='today') renderToday(); }
    else delete homeWeatherState[key];
  });
}
function homeWeatherFor(dayIndex,item){
  if(!item) return null;
  var city=inferWeatherCity(item,resolveRef(item));
  if(!city) return null;
  var key='day_'+dayIndex+'_'+city.key;
  var state=homeWeatherState[key];
  if(state&&state.loading) return null;
  return state||getCachedWeather(city);
}
```

- [ ] **Step 3: Update `renderToday()` date card markup**

In the trip-date branch of `renderToday()`, after `pick` is calculated, compute weather:

```javascript
requestHomeWeather(ti,pick.item);
var weather=homeWeatherFor(ti,pick.item);
```

Replace the date card markup with:

```javascript
var h='<div class="today-hero weather-on"><div class="today-hero-main"><div class="lbl">TODAY · DAY '+(ti+1)+'</div>'+
  '<div class="date">'+day.date+(day.dow?' ('+day.dow+')':'')+'</div>'+
  '<div class="loc">'+completed+'/'+items.length+' 已處理</div></div>'+
  renderWeatherChip(weather)+'</div>';
```

- [ ] **Step 4: Verify weather appears when cached**

Run:

```javascript
findToday=function(){return 0;};
localStorage.setItem('trip_weather_okayama',JSON.stringify({t:Date.now(),data:{city:'岡山',icon:'☁️',temp:18,rain:40}}));
renderToday();
console.log(document.querySelector('.weather-chip').textContent.indexOf('岡山')>=0);
console.log(document.querySelector('.weather-chip').textContent.indexOf('雨40%')>=0);
```

Expected: two `true` lines.

- [ ] **Step 5: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Render home weather summary chip"
```

---

### Task 4: Preview, Edge Cases, And Changelog

**Files:**
- Modify: `07_CHANGELOG.md`
- Verify: `日本行程V2預覽.html`
- Do not modify: schema or parser files.

**Interfaces:**
- Consumes: completed weather implementation.
- Produces: delivery-ready behavior and record.

- [ ] **Step 1: Verify missing city hides weather**

Run:

```javascript
console.log(inferWeatherCity({act:'未知地點',place:'未知'},null)===null);
```

Expected: `true`.

- [ ] **Step 2: Verify home still renders without weather**

Clear weather cache and render:

```javascript
Object.keys(localStorage).filter(function(k){return k.indexOf('trip_weather_')===0;}).forEach(function(k){localStorage.removeItem(k);});
renderToday();
console.log(document.querySelector('.nx-ticket')!==null);
```

Expected: `true`.

- [ ] **Step 3: Verify mobile layout**

Open the app at 390px width. Expected:

- The date card still fits without horizontal scrolling.
- Weather chip is on the right side of the date card.
- The next-stop ticket remains the dominant element.
- Complete / Skip controls still work.

- [ ] **Step 4: Update changelog**

Add this entry at the top of `07_CHANGELOG.md`:

```markdown
## 2026-07-07 — 首頁天氣摘要 UX 實作
- 日期卡右側新增下一站所在地天氣摘要,格式為 `地名 圖示 溫度 雨%`
- 天氣地點依下一站資料推估,不使用 GPS
- 天氣資料即時抓取並快取於 localStorage,失敗時不影響首頁
- Breaking Change:無
```

- [ ] **Step 5: Confirm changed file scope**

Run:

```powershell
git diff --name-only main...HEAD
```

Expected implementation files only:

```text
日本行程V2預覽.html
07_CHANGELOG.md
```

- [ ] **Step 6: Commit changelog**

```powershell
git add "07_CHANGELOG.md"
git commit -m "Document home weather summary implementation"
```

---

## Self-Review

- Spec coverage: covers right-side date-card placement, `岡山 ☁️ 18° 雨40%` display, next-stop city inference, no GPS, local cache, failure tolerance, and no schema / Google Sheet changes.
- Placeholder scan: no incomplete requirement markers are present.
- Type consistency: helper names introduced in earlier tasks are reused consistently.
- Scope check: this is one focused enhancement to the existing home screen plus changelog.
