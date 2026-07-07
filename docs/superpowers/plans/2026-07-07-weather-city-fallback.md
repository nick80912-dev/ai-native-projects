# Weather City Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the home weather chip infer a weather city from same-day context when the next stop itself does not directly contain a city.

**Architecture:** Keep the existing single-file Vanilla JS app. Extend the current home weather helpers with a conservative city inference chain: current item text, resolved Place / Restaurant / Hotel text, previous same-day known city, next same-day known city, then dominant same-day city. The inferred city is used only by weather loading and rendering.

**Tech Stack:** Vanilla HTML/CSS/JS, ES5-style `function` / `var`, existing `DB`, `resolveRef()`, `hotelOf()`, `localStorage` weather cache, Open-Meteo helper already in the app.

## Global Constraints

- Use inferred city only for the weather chip.
- Do not show a new visible field such as `推定地區：岡山`.
- Do not change `schema.js`.
- Do not add Google Sheet columns.
- Do not write inferred city back to CMS.
- Do not request GPS or browser location permission.
- Do not alter `navUrl()` or map search behavior.
- If inference is ambiguous, hide the weather chip instead of guessing.

---

## File Structure

- Modify: `日本行程V2預覽.html`
  - Extend the existing weather helper block near `WEATHER_CITIES`, `weatherTextForItem()`, `inferWeatherCity()`, `requestHomeWeather()`, and `homeWeatherFor()`.
  - Do not modify schema/parser/navigation functions except reading existing data.
- Modify: `07_CHANGELOG.md`
  - Add one implementation entry after behavior is delivered.
- Do not modify: `schema.js`, `validator.js`, `09_SCHEMA_MAPPING.md`, `11_CODING_CONVENTION.md`, Google Sheet data, or parser schema.

---

### Task 1: Extend Current-Stop Weather Text Matching

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `WEATHER_CITIES`, `DB.hotels`, `hotelOf(place)`, existing `item` and `resolveRef(item)` result.
- Produces:
  - `weatherCityFromText(text) -> city|null`
  - `weatherHotelForItem(item,res) -> hotel|null`
  - Extended `weatherTextForItem(item,res) -> string`
  - Updated `inferWeatherCity(item,res) -> city|null`

- [ ] **Step 1: Replace the direct matching block**

Find the current functions:

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

Replace it with:

```javascript
function weatherCityFromText(text){
  text=String(text||'');
  for(var i=0;i<WEATHER_CITIES.length;i++){
    var city=WEATHER_CITIES[i];
    for(var j=0;j<city.words.length;j++){
      if(text.indexOf(city.words[j])>=0) return city;
    }
  }
  return null;
}
function weatherHotelForItem(item,res){
  var flat=[item&&item.place,item&&item.act].filter(Boolean).join(' ').replace(/\s+/g,'');
  if(!flat||!DB.hotels||!DB.hotels.length) return null;
  return DB.hotels.find(function(h){
    var name=(h.name||'').replace(/\s+/g,'');
    return name && (flat.indexOf(name)>=0 || name.indexOf(flat)>=0);
  }) || null;
}
function weatherTextForItem(item,res){
  var p=res&&res.kind==='place'?res.p:null;
  var r=res&&res.kind==='rest'?res.r:null;
  var h=weatherHotelForItem(item,res);
  return [
    item&&item.place,
    item&&item.act,
    item&&item.move,
    item&&item.note,
    p&&p.name,
    p&&p.note,
    p&&p.travel,
    p&&p.hours,
    r&&r.name,
    r&&r.note,
    r&&r.travel,
    r&&r.hours,
    h&&h.name,
    h&&h.addr,
    h&&h.pnote,
    h&&h.note,
    h&&h.dates
  ].filter(Boolean).join(' ');
}
function inferWeatherCity(item,res){
  return weatherCityFromText(weatherTextForItem(item,res));
}
```

- [ ] **Step 2: Run console smoke tests**

Open the app locally and run:

```javascript
var day=DB.trip.days[0];
var orix=day.items.filter(function(it){return it.ref==='P012';})[0];
var hotel=day.items.filter(function(it){return it.ref==='P002';})[0];
console.log(inferWeatherCity(orix,resolveRef(orix)).label==='岡山');
console.log(weatherHotelForItem(hotel,resolveRef(hotel)).name.indexOf('Guest House Life Field')>=0);
console.log(inferWeatherCity(hotel,resolveRef(hotel)).label==='岡山');
```

Expected: three `true` lines. The third line should pass because the hotel address contains `Okayama` / `Kurashiki` after this task.

- [ ] **Step 3: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add weather city matching from resolved hotel data"
```

---

### Task 2: Add Same-Day Weather City Fallback

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes:
  - `inferWeatherCity(item,res) -> city|null`
  - `resolveRef(item) -> object|null`
  - `day.items`
- Produces:
  - `weatherCityForItem(item) -> city|null`
  - `dominantWeatherCity(items) -> city|null`
  - `inferWeatherCityForDay(day,item) -> city|null`

- [ ] **Step 1: Add contextual inference helpers**

Insert this block after `function inferWeatherCity(item,res){...}`:

```javascript
function weatherCityForItem(item){
  if(!item) return null;
  return inferWeatherCity(item,resolveRef(item));
}
function dominantWeatherCity(items){
  var counts={}, byKey={}, topKey='', topCount=0, tied=false;
  (items||[]).forEach(function(it){
    var city=weatherCityForItem(it);
    if(!city) return;
    byKey[city.key]=city;
    counts[city.key]=(counts[city.key]||0)+1;
  });
  Object.keys(counts).forEach(function(key){
    if(counts[key]>topCount){
      topKey=key;
      topCount=counts[key];
      tied=false;
    }else if(counts[key]===topCount){
      tied=true;
    }
  });
  return topKey&&!tied?byKey[topKey]:null;
}
function inferWeatherCityForDay(day,item){
  var direct=weatherCityForItem(item);
  if(direct) return direct;
  var items=(day&&day.items?day.items:[]).filter(function(it){ return it&&it.act; });
  var idx=items.indexOf(item);
  if(idx<0) return dominantWeatherCity(items);
  for(var i=idx-1;i>=0;i--){
    var prev=weatherCityForItem(items[i]);
    if(prev) return prev;
  }
  for(var j=idx+1;j<items.length;j++){
    var next=weatherCityForItem(items[j]);
    if(next) return next;
  }
  return dominantWeatherCity(items);
}
```

- [ ] **Step 2: Run fallback tests**

Run:

```javascript
var day=DB.trip.days[0];
var items=day.items.filter(function(it){return it.act;});
var hotel=items.filter(function(it){return it.ref==='P002';})[0];
var city=inferWeatherCityForDay(day,hotel);
console.log(city&&city.label==='岡山');
console.log(inferWeatherCityForDay({items:[{act:'A',place:'東京'},{act:'B',place:'岡山'}]}, {act:'X',place:'未知'})===null);
```

Expected: two `true` lines. The second line confirms tied dominant cities do not guess.

- [ ] **Step 3: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add same-day weather city fallback"
```

---

### Task 3: Wire Fallback Into Home Weather Loading

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes:
  - `inferWeatherCityForDay(day,item) -> city|null`
  - `getCachedWeather(city) -> weather|null`
  - `loadWeatherForCity(city) -> Promise<weather|null>`
  - `renderToday()`
- Produces:
  - Updated `requestHomeWeather(dayIndex,item) -> void`
  - Updated `homeWeatherFor(dayIndex,item) -> weather|null`

- [ ] **Step 1: Replace `requestHomeWeather()`**

Replace the current function:

```javascript
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
```

With:

```javascript
function requestHomeWeather(dayIndex,item){
  if(!item) return;
  var day=DB.trip&&DB.trip.days?DB.trip.days[dayIndex]:null;
  var city=inferWeatherCityForDay(day,item);
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
```

- [ ] **Step 2: Replace `homeWeatherFor()`**

Replace the current function:

```javascript
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

With:

```javascript
function homeWeatherFor(dayIndex,item){
  if(!item) return null;
  var day=DB.trip&&DB.trip.days?DB.trip.days[dayIndex]:null;
  var city=inferWeatherCityForDay(day,item);
  if(!city) return null;
  var key='day_'+dayIndex+'_'+city.key;
  var state=homeWeatherState[key];
  if(state&&state.loading) return null;
  return state||getCachedWeather(city);
}
```

- [ ] **Step 3: Verify homepage weather at the lodging stop**

Run this in browser console:

```javascript
findToday=function(){return 0;};
currentMinutes=function(){return 15*60+10;};
localStorage.removeItem('trip_next_stop_progress');
localStorage.removeItem('trip_checks');
localStorage.setItem('trip_weather_okayama',JSON.stringify({t:Date.now(),data:{city:'岡山',icon:'☁️',temp:18,rain:40}}));
renderToday();
console.log(document.querySelector('.nx-ticket-title').textContent.indexOf('Guest House Life Field')>=0);
console.log(document.querySelector('.weather-chip').textContent.indexOf('岡山')>=0);
console.log(document.querySelector('.weather-chip').textContent.indexOf('雨40%')>=0);
```

Expected: three `true` lines.

- [ ] **Step 4: Verify no visible inferred city field was added**

Run:

```javascript
console.log(document.body.textContent.indexOf('推定地區')<0);
console.log(document.body.textContent.indexOf('推定城市')<0);
```

Expected: two `true` lines.

- [ ] **Step 5: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Use weather city fallback on home screen"
```

---

### Task 4: Changelog And Regression Verification

**Files:**
- Modify: `07_CHANGELOG.md`
- Verify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: completed weather fallback behavior.
- Produces: delivery record and verified preview behavior.

- [ ] **Step 1: Add changelog entry**

Add this entry near the top of `07_CHANGELOG.md`:

```markdown
## 2026-07-07 — 天氣城市 fallback 實作
- 首頁天氣城市推算新增同日鄰近站點與當日主要城市 fallback
- `Guest House Life Field` 這類本身不含城市的下一站,可沿用同日合理城市顯示天氣
- 推算結果只供天氣 chip 使用,不影響導航、schema、Google Sheet 或 CMS
- Breaking Change:無
```

- [ ] **Step 2: Confirm forbidden files were not modified**

Run:

```powershell
git diff --name-only HEAD~3..HEAD | rg "^(schema\.js|validator\.js|09_SCHEMA_MAPPING\.md|11_CODING_CONVENTION\.md)$"
```

Expected: no output.

- [ ] **Step 3: Start local preview**

Run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8000/%E6%97%A5%E6%9C%AC%E8%A1%8C%E7%A8%8BV2%E9%A0%90%E8%A6%BD.html
```

- [ ] **Step 4: Verify simulated Day 1 lodging weather**

In browser console:

```javascript
findToday=function(){return 0;};
currentMinutes=function(){return 15*60+10;};
localStorage.removeItem('trip_next_stop_progress');
localStorage.removeItem('trip_checks');
localStorage.setItem('trip_weather_okayama',JSON.stringify({t:Date.now(),data:{city:'岡山',icon:'☁️',temp:18,rain:40}}));
renderToday();
console.log(document.querySelector('.today-hero').textContent.indexOf('岡山')>=0);
console.log(document.querySelector('.nx-ticket-title').textContent.indexOf('Guest House Life Field')>=0);
```

Expected: two `true` lines.

- [ ] **Step 5: Verify direct city still works**

In browser console:

```javascript
findToday=function(){return 0;};
currentMinutes=function(){return 15*60;};
localStorage.removeItem('trip_next_stop_progress');
localStorage.removeItem('trip_checks');
localStorage.setItem('trip_weather_okayama',JSON.stringify({t:Date.now(),data:{city:'岡山',icon:'☁️',temp:18,rain:40}}));
renderToday();
console.log(document.querySelector('.nx-ticket-title').textContent.indexOf('ORIX租車 岡山機場')>=0);
console.log(document.querySelector('.weather-chip').textContent.indexOf('岡山')>=0);
```

Expected: two `true` lines.

- [ ] **Step 6: Commit changelog**

```powershell
git add "07_CHANGELOG.md"
git commit -m "Document weather city fallback"
```

---

## Self-Review

- Spec coverage: covers current stop text, resolved Place / Restaurant / Hotel data, previous / next same-day fallback, dominant same-day city fallback, weather-only usage, and no schema / navigation / CMS changes.
- Placeholder scan: no incomplete markers or unspecified implementation steps are present.
- Type consistency: `weatherCityFromText`, `weatherHotelForItem`, `weatherCityForItem`, `dominantWeatherCity`, and `inferWeatherCityForDay` are defined before they are consumed by `requestHomeWeather` and `homeWeatherFor`.
