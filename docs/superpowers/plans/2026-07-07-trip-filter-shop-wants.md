# Trip Filter And Shop Wants Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Trip tab hide-completed filter, then add a collapsible Shopping want-list.

**Architecture:** Keep the existing single-file Vanilla JS app. Add memory-only UI state and small renderer changes in `renderTrip()` and `renderShopResults()`. Do not alter schema, parser, CMS, navigation, or storage semantics for checks/wants.

**Tech Stack:** Vanilla HTML/CSS/JS, ES5-style `function` / `var`, existing `getChecks()`, `toggleCheck()`, `getWants()`, `toggleWant()`, `shopOpenFloors`, and string-rendered UI.

## Global Constraints

- Implement Proposal 1 before Proposal 2.
- Do not change `schema.js`.
- Do not change `validator.js`.
- Do not add Google Sheet columns.
- Do not change Today next-stop behavior.
- Do not change `toggleCheck()` storage behavior.
- Do not change `toggleWant()` storage behavior.
- Do not introduce packages or a build step.
- Use memory-only UI state for both proposals.

---

## File Structure

- Modify: `日本行程V2預覽.html`
  - Add Trip filter state and controls near `renderTrip()`.
  - Add Shopping want-list open state and controls near `renderShopResults()`.
  - Add small CSS only if needed, reusing existing visual language.
- Modify: `07_CHANGELOG.md`
  - Add one implementation entry after behavior is delivered.
- Do not modify: `schema.js`, `validator.js`, `09_SCHEMA_MAPPING.md`, `11_CODING_CONVENTION.md`, Google Sheet data, or parser schema.

---

### Task 1: Add Trip Hide-Completed Filter

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `getChecks()`, `onCheck(id)`, `renderItem(it,checks)`, `curDay`, `DB.trip.days`.
- Produces:
  - `tripHideDone -> boolean`
  - `setTripHideDone(v) -> void`
  - Updated `renderTrip()`

- [ ] **Step 1: Add memory state and setter**

Insert near `var curDay=0, curView='today';`:

```javascript
var tripHideDone=false;
function setTripHideDone(v){
  tripHideDone=!!v;
  renderTrip();
}
```

- [ ] **Step 2: Update `renderTrip()` filtering**

Inside `renderTrip()`, after:

```javascript
var acts=day.items.filter(function(it){return it.act;});
var doneN=acts.filter(function(it){return checks[it.id];}).length;
```

Add:

```javascript
var visibleItems=tripHideDone?day.items.filter(function(it){ return !it.act || !checks[it.id]; }):day.items;
var visibleActs=visibleItems.filter(function(it){ return it.act; });
```

Replace the existing `view.innerHTML` with:

```javascript
view.innerHTML='<div class="day-head"><span class="num">DAY '+(curDay+1)+'</span>'+
  '<span class="date">'+day.date+(day.dow?' ('+day.dow+')':'')+'</span>'+
  '<span class="prog">'+doneN+'/'+acts.length+' ✓</span></div>'+
  '<div class="trip-filter"><button class="trip-filter-btn '+(!tripHideDone?'on':'')+'" onclick="setTripHideDone(false)">顯示全部</button>'+
  '<button class="trip-filter-btn '+(tripHideDone?'on':'')+'" onclick="setTripHideDone(true)">隱藏已完成</button></div>'+
  (visibleActs.length?visibleItems.map(function(it){return renderItem(it,checks);}).join(''):'<div class="empty-state">今天的行程都已完成 ✓</div>');
```

- [ ] **Step 3: Add compact CSS**

Add near existing day / chip styles:

```css
.trip-filter{display:flex;gap:8px;margin:10px 12px 8px}
.trip-filter-btn{flex:1;border:1px solid var(--line);background:var(--card);color:var(--ink-soft);border-radius:999px;padding:9px 10px;font-size:13px;font-weight:800}
.trip-filter-btn.on{background:var(--sea);border-color:var(--sea);color:#fff}
```

- [ ] **Step 4: Browser verification**

Open Trip tab, then run:

```javascript
switchView('trip');
curDay=0;
renderTrip();
console.log(document.querySelectorAll('.item').length>0);
var first=document.querySelector('.item .chk');
first.click();
setTripHideDone(true);
console.log(document.querySelectorAll('.item.checked').length===0);
setTripHideDone(false);
console.log(document.querySelectorAll('.item.checked').length>=1);
```

Expected: three `true` lines.

- [ ] **Step 5: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add trip hide completed filter"
```

---

### Task 2: Add Shopping Want-List Collapse

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `getWants()`, `toggleWant(id)`, `renderShopResults()`, `storeRow(s,id,on)`, `shopOpenFloors`.
- Produces:
  - `shopWantListOpen -> object`
  - `shopWantKey(place,index) -> string`
  - `toggleShopWantList(key) -> void`
  - Updated want-list block in `renderShopResults()`

- [ ] **Step 1: Add memory state and toggler**

Insert near `var shopOpenFloors={};`:

```javascript
var shopWantListOpen={};
function shopWantKey(place,index){
  return (place&&place.placeId)?place.placeId:('M'+index);
}
function toggleShopWantList(key){
  shopWantListOpen[key]=!shopWantListOpen[key];
  renderShopResults();
}
```

- [ ] **Step 2: Replace want-list rendering**

In `renderShopResults()`, replace:

```javascript
if(wanted.length){
  h+='<div class="want-box"><div class="want-title">⭐ 想逛清單（'+wanted.length+'）</div>'+
    wanted.map(function(s){var id='w_'+mi+'_'+s.floor+'_'+s.name;return storeRow(s,id,true);}).join('')+'</div>';
}
```

With:

```javascript
if(wanted.length){
  var wkey=shopWantKey(p,mi);
  var wopen=!!shopWantListOpen[wkey];
  h+='<div class="want-box"><button class="want-head '+(wopen?'on':'')+'" onclick="toggleShopWantList(\''+wkey.replace(/'/g,"\\'")+'\')">'+
    '<span>⭐ 想逛清單：'+wanted.length+' 家</span><span>'+(wopen?'收合':'展開')+'</span></button>'+
    (wopen?'<div class="want-body">'+wanted.map(function(s){var id='w_'+mi+'_'+s.floor+'_'+s.name;return storeRow(s,id,true);}).join('')+'</div>':'')+
    '</div>';
}
```

- [ ] **Step 3: Add compact CSS**

Add near existing `.want-box` styles:

```css
.want-head{width:100%;border:0;background:transparent;color:#8a6416;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:space-between;padding:0;text-align:left}
.want-head span:last-child{font-size:12px;color:var(--coral)}
.want-body{margin-top:8px}
```

- [ ] **Step 4: Browser verification**

Run:

```javascript
switchView('shop');
localStorage.removeItem('trip_shop_wants');
renderShop();
var firstStore=document.querySelector('.store-row');
firstStore.click();
console.log(document.querySelector('.want-head').textContent.indexOf('1 家')>=0);
console.log(document.querySelector('.want-body')===null);
document.querySelector('.want-head').click();
console.log(document.querySelector('.want-body')!==null);
document.querySelector('.want-head').click();
console.log(document.querySelector('.want-body')===null);
```

Expected: four `true` lines.

- [ ] **Step 5: Confirm floor state is preserved**

Run:

```javascript
var floor=document.querySelector('.floor-head');
floor.click();
var before=document.querySelector('.floor-body.open')!==null;
document.querySelector('.store-row').click();
var after=document.querySelector('.floor-body.open')!==null;
console.log(before===true && after===true);
```

Expected: `true`.

- [ ] **Step 6: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Collapse shopping want list"
```

---

### Task 3: Changelog And Final Verification

**Files:**
- Modify: `07_CHANGELOG.md`
- Verify: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: completed Trip and Shopping UI changes.
- Produces: final delivery record.

- [ ] **Step 1: Add changelog entry**

Add near the top of `07_CHANGELOG.md`:

```markdown
## 2026-07-07 — 行程篩選與想逛清單收合實作
- 行程分頁新增 `顯示全部 / 隱藏已完成` 篩選,使用既有打卡狀態
- 購物分頁想逛清單改為摘要列可展開 / 收合,避免長清單推擠樓層指南
- 兩者皆使用記憶體 UI state,不改 schema、validator、Google Sheet 或資料流
- Breaking Change:無
```

- [ ] **Step 2: Confirm forbidden files were not modified**

Run:

```powershell
git diff --name-only origin/main..HEAD | rg "^(schema\.js|validator\.js|09_SCHEMA_MAPPING\.md|11_CODING_CONVENTION\.md)$"
```

Expected: no output.

- [ ] **Step 3: Browser smoke test**

Open the preview and verify:

```javascript
switchView('trip');
setTripHideDone(true);
console.log(document.querySelector('.trip-filter-btn.on').textContent.indexOf('隱藏已完成')>=0);
switchView('shop');
console.log(document.querySelector('#shopResults')!==null);
switchView('today');
console.log(document.querySelector('.today-hero')!==null);
switchView('split');
console.log(document.querySelector('#view-split').textContent.length>0);
```

Expected: four `true` lines.

- [ ] **Step 4: Commit changelog**

```powershell
git add "07_CHANGELOG.md"
git commit -m "Document trip filter and shop wants collapse"
```

---

## Self-Review

- Spec coverage: covers Proposal 1 before Proposal 2, memory-only UI state, no schema / validator / Sheet changes, Trip tab only, Shopping want-list collapse, floor and search non-regression.
- Placeholder scan: no incomplete markers or unspecified implementation steps are present.
- Type consistency: `tripHideDone`, `setTripHideDone`, `shopWantListOpen`, `shopWantKey`, and `toggleShopWantList` are defined before being referenced by renderers.
