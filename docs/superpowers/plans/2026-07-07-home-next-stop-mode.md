# Home Next Stop Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a focused home-screen next-stop mode so the traveler can identify the next action within 3 seconds.

**Architecture:** Keep the existing single-file Vanilla JS app and extend the current `renderToday()` flow. Add small helper functions for per-day progress state and next-stop selection, then render one dominant ticket-style card on the home screen.

**Tech Stack:** Vanilla HTML/CSS/JS, ES5-style `function` / `var`, existing `localStorage` helpers, existing CMS data already loaded into `DB`.

## Global Constraints

- Placement: home screen.
- First impression: only highlight the next stop.
- Next-stop logic: combine local progress state and current time.
- Progress memory: store per itinerary day and persist after app reload.
- Action style: keep completion controls as small text actions.
- Visual style: itinerary ticket card.
- Do not add a new `旅途中` tab.
- Do not change `schema.js`.
- Do not change Google Sheet columns.
- Do not write personal progress back to CMS.
- Do not add GPS or real-time location detection.
- Do not add AI recommendation logic.
- Do not perform a framework migration or large refactor.
- Update `07_CHANGELOG.md` when implementation is delivered.

---

## File Structure

- Modify: `日本行程V2預覽.html`
  - Add home next-stop CSS beside existing `.today-hero` / `.nx-hero` styles.
  - Add local progress helpers beside existing `getChecks()` / `toggleCheck()`.
  - Add next-stop selection helpers before `renderToday()`.
  - Replace the current `renderToday()` next-stop block with a ticket-style card.
- Modify: `07_CHANGELOG.md`
  - Add one implementation entry after the app behavior is changed.
- Do not modify: `schema.js`, `validator.js`, `09_SCHEMA_MAPPING.md`, `11_CODING_CONVENTION.md`, Google Sheet data, parser schema, or unrelated tabs.

---

### Task 1: Baseline Read And Safety Check

**Files:**
- Inspect: `日本行程V2預覽.html`
- Inspect: `docs/superpowers/specs/2026-07-07-home-next-stop-design.md`
- Inspect: `07_CHANGELOG.md`

**Interfaces:**
- Consumes: existing `DB.trip.days`, `resolveRef(it)`, `navUrl(it,res)`, `typeTag(res)`, `escapeHtml(text)`, `highlightNote(text)`, `lsGet(k,f)`, `lsSet(k,v)`, `toast(msg)`, `renderToday()`.
- Produces: no code changes in this task.

- [ ] **Step 1: Confirm the home flow entry point**

Run:

```powershell
rg -n "function renderToday|function findToday|function getChecks|function onCheck|\.nx-hero" "日本行程V2預覽.html"
```

Expected: output includes `getChecks`, `onCheck`, `findToday`, `renderToday`, and `.nx-hero`.

- [ ] **Step 2: Confirm the implementation scope stays in the approved files**

Run:

```powershell
rg -n "schema.js|Google Sheet|CMS writeback|旅途中 tab|GPS|AI recommendation" "docs/superpowers/specs/2026-07-07-home-next-stop-design.md"
```

Expected: output confirms these are excluded or constrained by the spec.

- [ ] **Step 3: Commit checkpoint**

No commit is required for this inspection-only task.

---

### Task 2: Add Per-Day Next-Stop Progress Helpers

**Files:**
- Modify: `日本行程V2預覽.html` near the existing personal state helpers around `getChecks()` and `toggleCheck()`.

**Interfaces:**
- Consumes: `lsGet(k,f)`, `lsSet(k,v)`, `getChecks()`, `toggleCheck(id)`.
- Produces:
  - `dayProgressKey(day,dayIndex) -> string`
  - `getNextStopProgress() -> object`
  - `saveNextStopProgress(progress) -> void`
  - `getDayProgress(day,dayIndex) -> object`
  - `hasDayProgress(progress) -> boolean`
  - `markNextStop(day,dayIndex,itemId,status) -> void`
  - `isNextStopCleared(item,progress,checks) -> boolean`

- [ ] **Step 1: Add the progress helper block**

Insert this block after `function toggleCheck(id){...}` and before `function getWants(){...}`:

```javascript
function dayProgressKey(day,dayIndex){
  var d=(day&&day.date)?day.date:('day'+(dayIndex+1));
  return 'day_'+(dayIndex+1)+'_'+String(d).replace(/[^0-9A-Za-z]/g,'_');
}
function getNextStopProgress(){ return lsGet('trip_next_stop_progress',{}); }
function saveNextStopProgress(progress){ lsSet('trip_next_stop_progress',progress); }
function emptyDayProgress(){ return { done:{}, skip:{} }; }
function normalizeDayProgress(progress){
  progress=progress||{};
  return { done:progress.done||{}, skip:progress.skip||{} };
}
function getDayProgress(day,dayIndex){
  var all=getNextStopProgress();
  return normalizeDayProgress(all[dayProgressKey(day,dayIndex)]);
}
function hasDayProgress(progress){
  progress=normalizeDayProgress(progress);
  return Object.keys(progress.done).length>0 || Object.keys(progress.skip).length>0;
}
function markNextStop(day,dayIndex,itemId,status){
  var all=getNextStopProgress();
  var key=dayProgressKey(day,dayIndex);
  var progress=normalizeDayProgress(all[key]);
  delete progress.done[itemId];
  delete progress.skip[itemId];
  if(status==='done') progress.done[itemId]=true;
  if(status==='skip') progress.skip[itemId]=true;
  all[key]=progress;
  saveNextStopProgress(all);
  if(status==='done'){
    var checks=getChecks();
    checks[itemId]=true;
    lsSet('trip_checks',checks);
  }
}
function isNextStopCleared(item,progress,checks){
  if(!item||!item.id) return false;
  progress=normalizeDayProgress(progress);
  checks=checks||{};
  return !!(progress.done[item.id]||progress.skip[item.id]||checks[item.id]);
}
```

- [ ] **Step 2: Run a browser console smoke test**

Open the app locally, then run this in the browser console:

```javascript
localStorage.removeItem('trip_next_stop_progress');
var sampleDay={date:'10/18'};
markNextStop(sampleDay,0,'IT_SAMPLE','skip');
var progress=getDayProgress(sampleDay,0);
console.log(progress.skip.IT_SAMPLE===true && hasDayProgress(progress)===true);
```

Expected console output: `true`.

- [ ] **Step 3: Verify existing checks still work**

Run this in the browser console:

```javascript
localStorage.removeItem('trip_checks');
markNextStop({date:'10/18'},0,'IT_DONE','done');
console.log(getChecks().IT_DONE===true);
```

Expected console output: `true`.

- [ ] **Step 4: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add per-day next stop progress state"
```

---

### Task 3: Add Time-Aware Next-Stop Selection Helpers

**Files:**
- Modify: `日本行程V2預覽.html` before `function renderToday()`.

**Interfaces:**
- Consumes: `getDayProgress(day,dayIndex)`, `hasDayProgress(progress)`, `isNextStopCleared(item,progress,checks)`.
- Produces:
  - `parseStartMinutes(timeText) -> number|null`
  - `currentMinutes() -> number`
  - `pickNextStop(items,progress,checks,nowMinutes) -> object`

- [ ] **Step 1: Add time parsing and next-stop selection helpers**

Insert this block after `function findToday(){...}` and before `function renderToday(){...}`:

```javascript
function parseStartMinutes(timeText){
  var m=String(timeText||'').match(/(\d{1,2})\s*:\s*(\d{2})/);
  if(!m) return null;
  var h=parseInt(m[1],10), min=parseInt(m[2],10);
  if(isNaN(h)||isNaN(min)||h<0||h>23||min<0||min>59) return null;
  return h*60+min;
}
function currentMinutes(){
  var d=new Date();
  return d.getHours()*60+d.getMinutes();
}
function pickNextStop(items,progress,checks,nowMinutes){
  items=(items||[]).filter(function(it){ return it&&it.act; });
  progress=normalizeDayProgress(progress);
  checks=checks||{};
  var remaining=items.filter(function(it){ return !isNextStopCleared(it,progress,checks); });
  if(!remaining.length) return { item:null, remaining:0, source:'complete' };
  if(hasDayProgress(progress)) return { item:remaining[0], remaining:remaining.length-1, source:'progress' };
  var future=remaining.find(function(it){
    var m=parseStartMinutes(it.time);
    return m!==null && m>=nowMinutes;
  });
  return { item:future||remaining[0], remaining:remaining.length-1, source:future?'time':'order' };
}
```

- [ ] **Step 2: Run console tests for supported time formats**

Run:

```javascript
console.log(parseStartMinutes('7:00')===420);
console.log(parseStartMinutes('07:02-08:12')===422);
console.log(parseStartMinutes('16:00後')===960);
console.log(parseStartMinutes('最晚15:15或15:45')===915);
console.log(parseStartMinutes('午餐時間')===null);
```

Expected console output: five `true` lines.

- [ ] **Step 3: Run console tests for selection order**

Run:

```javascript
var items=[
  {id:'A',time:'09:00',act:'A'},
  {id:'B',time:'11:30',act:'B'},
  {id:'C',time:'15:05',act:'C'}
];
console.log(pickNextStop(items,emptyDayProgress(),{},700).item.id==='C');
console.log(pickNextStop(items,{done:{A:true},skip:{}},{},700).item.id==='B');
console.log(pickNextStop(items,{done:{},skip:{B:true}},{A:true},700).item.id==='C');
```

Expected console output: three `true` lines.

- [ ] **Step 4: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Add next stop selection logic"
```

---

### Task 4: Render The Ticket-Style Home Next-Stop Card

**Files:**
- Modify: `日本行程V2預覽.html` CSS near the existing `.nx-hero` styles.
- Modify: `日本行程V2預覽.html` JavaScript near `renderToday()`.

**Interfaces:**
- Consumes: `pickNextStop(items,progress,checks,currentMinutes())`, `resolveRef(it)`, `typeTag(res)`, `navUrl(it,res)`, `highlightNote(text)`, `escapeHtml(text)`, `markNextStop(day,dayIndex,itemId,status)`.
- Produces:
  - `nextStopMeta(item,res) -> object`
  - `renderNextStopCard(day,dayIndex,pick) -> string`
  - `onNextStopDone(dayIndex,itemId) -> void`
  - `onNextStopSkip(dayIndex,itemId) -> void`

- [ ] **Step 1: Add ticket-card CSS**

Add this CSS near the existing `.nx-hero` block:

```css
.nx-ticket{position:relative;margin:12px;background:var(--card);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;border:1px solid rgba(14,58,68,.08)}
.nx-ticket::before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;background:linear-gradient(180deg,var(--coral),var(--gold))}
.nx-ticket-main{padding:16px 16px 12px 20px}
.nx-ticket-kicker{font-size:11px;letter-spacing:.14em;color:var(--ink-faint);font-weight:800;text-transform:uppercase;margin-bottom:8px}
.nx-ticket-time{display:inline-block;font-size:13px;font-weight:800;color:var(--coral);background:var(--coral-bg);border-radius:7px;padding:3px 9px;margin-bottom:8px}
.nx-ticket-title{font-size:24px;line-height:1.18;font-weight:900;color:var(--ink);margin-bottom:6px;word-break:break-word}
.nx-ticket-act{font-size:14px;color:var(--ink-soft);font-weight:700;margin-bottom:10px}
.nx-ticket-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px}
.nx-ticket-tag{font-size:12px;border-radius:999px;padding:4px 8px;background:#f3efe6;color:var(--ink-soft);font-weight:700}
.nx-ticket-lines{display:grid;gap:6px;margin-top:8px}
.nx-ticket-line{font-size:13.5px;line-height:1.45;color:var(--ink-soft)}
.nx-ticket-line b{color:var(--ink);font-weight:800}
.nx-ticket-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.nx-ticket-actions .qa-btn{margin:0}
.nx-ticket-low{display:flex;gap:14px;border-top:1px dashed var(--line);padding:10px 16px 12px 20px;background:#fffaf0}
.nx-text-btn{border:0;background:transparent;color:var(--ink-soft);font-weight:800;font-size:13px;padding:4px 0}
.nx-text-btn:active{transform:scale(.96)}
.nx-remain{margin:0 12px 12px;color:var(--ink-faint);font-size:13px;text-align:center}
.nx-empty-ticket{margin:12px;background:var(--card);border-radius:14px;box-shadow:var(--shadow);padding:18px;text-align:center;color:var(--ink-soft)}
```

- [ ] **Step 2: Add rendering helper functions**

Insert before `renderToday()`:

```javascript
function nextStopMeta(item,res){
  var p=res&&res.kind==='place'?res.p:null;
  var r=res&&res.kind==='rest'?res.r:null;
  var cat=typeTag(res);
  var drive=extractDrive(item.move) || (p&&p.travel) || (r&&r.travel) || '';
  return {
    place:item.place||item.act||'',
    act:item.act||'',
    cat:cat,
    drive:drive,
    parking:(p&&p.pnote)||(r&&r.parking)||'',
    hours:(p&&p.hours)||(r&&r.hours)||'',
    web:p&&p.web?p.web:'',
    ttl:p&&p.ttl?p.ttl:'',
    note:item.note || (p&&p.note) || (r&&r.note) || ''
  };
}
function renderTicketLine(label,value){
  if(!value) return '';
  return '<div class="nx-ticket-line"><b>'+escapeHtml(label)+'</b> '+highlightNote(value)+'</div>';
}
function renderNextStopCard(day,dayIndex,pick){
  var it=pick.item;
  if(!it){
    return '<div class="nx-empty-ticket"><div class="nx-ticket-title" style="font-size:20px">今日行程完成</div><div class="nx-ticket-line">可以慢慢休息，或切到完整行程查看後續安排。</div></div>';
  }
  var res=resolveRef(it);
  var meta=nextStopMeta(it,res);
  var canNav=(it.place&&it.place.trim())||res;
  var h='<div class="nx-ticket">'+
    '<div class="nx-ticket-main">'+
      '<div class="nx-ticket-kicker">NEXT STOP · DAY '+(dayIndex+1)+'</div>'+
      (it.time?'<div class="nx-ticket-time">'+escapeHtml(it.time)+'</div>':'')+
      '<div class="nx-ticket-title">'+escapeHtml(meta.place.replace(/\n/g,' '))+'</div>'+
      (meta.act&&meta.act!==meta.place?'<div class="nx-ticket-act">'+escapeHtml(meta.act)+'</div>':'')+
      '<div class="nx-ticket-tags">'+
        (meta.cat?'<span class="nx-ticket-tag">'+escapeHtml(meta.cat.label)+'</span>':'')+
        (pick.source==='time'?'<span class="nx-ticket-tag">依目前時間</span>':'')+
      '</div>'+
      '<div class="nx-ticket-lines">'+
        renderTicketLine('交通',meta.drive)+
        renderTicketLine('停車',meta.parking)+
        renderTicketLine('營業',meta.hours)+
        renderTicketLine('提醒',meta.note)+
      '</div>'+
      '<div class="nx-ticket-actions">'+
        (canNav?'<a class="qa-btn drv" href="'+navUrl(it,res)+'" target="_blank" rel="noopener">'+(transport()==='drive'?'🚗 導航':'🚃 路線')+'</a>':'')+
        (meta.web?'<a class="qa-btn nf" href="'+escapeHtml(meta.web)+'" target="_blank" rel="noopener">🌐 官網</a>':'')+
        (meta.ttl?'<a class="qa-btn fr" href="'+escapeHtml(meta.ttl)+'" target="_blank" rel="noopener">⛴ 時刻表</a>':'')+
      '</div>'+
    '</div>'+
    '<div class="nx-ticket-low">'+
      '<button class="nx-text-btn" onclick="onNextStopDone('+dayIndex+',\''+it.id+'\')">完成</button>'+
      '<button class="nx-text-btn" onclick="onNextStopSkip('+dayIndex+',\''+it.id+'\')">跳過</button>'+
    '</div>'+
  '</div>';
  if(pick.remaining>0) h+='<div class="nx-remain">今日還有 '+pick.remaining+' 個行程</div>';
  return h;
}
function onNextStopDone(dayIndex,itemId){
  var day=DB.trip&&DB.trip.days?DB.trip.days[dayIndex]:null;
  if(!day) return;
  markNextStop(day,dayIndex,itemId,'done');
  renderToday();
  toast('已完成這站');
}
function onNextStopSkip(dayIndex,itemId){
  var day=DB.trip&&DB.trip.days?DB.trip.days[dayIndex]:null;
  if(!day) return;
  markNextStop(day,dayIndex,itemId,'skip');
  renderToday();
  toast('已跳過這站');
}
```

- [ ] **Step 3: Replace the today next-stop rendering block**

Inside `renderToday()`, keep the existing `findToday()` non-trip-date branch. In the trip-date branch, replace the current `next` / `rest` card construction with:

```javascript
var day=DB.trip.days[ti];
var items=day.items.filter(function(it){return it.act;});
var checks=getChecks();
var progress=getDayProgress(day,ti);
var pick=pickNextStop(items,progress,checks,currentMinutes());
var completed=items.length-(pick.remaining+(pick.item?1:0));
var h='<div class="today-hero"><div class="lbl">TODAY · DAY '+(ti+1)+'</div>'+
  '<div class="date">'+day.date+(day.dow?' ('+day.dow+')':'')+'</div>'+
  '<div class="loc">'+completed+'/'+items.length+' 已處理</div></div>';
h+=renderNextStopCard(day,ti,pick);
h+='<button class="today-jump dark" onclick="gotoDay('+ti+')">看今日完整細節 →</button>';
view.innerHTML=h;
```

- [ ] **Step 4: Preview forced travel date in browser console**

Because the real current date may be outside the trip range, force the first trip day only in the browser console:

```javascript
findToday=function(){return 0;};
localStorage.removeItem('trip_next_stop_progress');
localStorage.removeItem('trip_checks');
renderToday();
```

Expected: the home screen shows one dominant ticket-style next-stop card and a compact `看今日完整細節` button. It does not show the expanded list of remaining itinerary cards.

- [ ] **Step 5: Commit**

```powershell
git add "日本行程V2預覽.html"
git commit -m "Render ticket style home next stop card"
```

---

### Task 5: Verify Edge States And Existing Tabs

**Files:**
- Modify only if a verified issue appears: `日本行程V2預覽.html`.

**Interfaces:**
- Consumes: all functions from Tasks 2-4.
- Produces: verified home behavior and no regression in other main tabs.

- [ ] **Step 1: Verify Complete moves to the next stop**

Run in browser console:

```javascript
findToday=function(){return 0;};
localStorage.removeItem('trip_next_stop_progress');
localStorage.removeItem('trip_checks');
renderToday();
document.querySelector('.nx-ticket-low .nx-text-btn').click();
console.log(document.querySelector('.nx-ticket-title').textContent.length>0);
```

Expected: console output is `true`, and the card changes to the next available stop.

- [ ] **Step 2: Verify Skip persists after refresh-style render**

Run:

```javascript
findToday=function(){return 0;};
localStorage.removeItem('trip_next_stop_progress');
renderToday();
document.querySelectorAll('.nx-ticket-low .nx-text-btn')[1].click();
var before=document.querySelector('.nx-ticket-title').textContent;
renderToday();
var after=document.querySelector('.nx-ticket-title').textContent;
console.log(before===after);
```

Expected: console output is `true`; re-render keeps the same post-skip next stop.

- [ ] **Step 3: Verify all-complete state**

Run:

```javascript
findToday=function(){return 0;};
var day=DB.trip.days[0];
var all=getNextStopProgress();
var key=dayProgressKey(day,0);
all[key]=emptyDayProgress();
day.items.filter(function(it){return it.act;}).forEach(function(it){ all[key].done[it.id]=true; });
saveNextStopProgress(all);
renderToday();
console.log(document.querySelector('.nx-empty-ticket').textContent.indexOf('今日行程完成')>=0);
```

Expected: console output is `true`.

- [ ] **Step 4: Verify out-of-trip behavior is unchanged**

Run:

```javascript
findToday=function(){return null;};
renderToday();
console.log(document.querySelector('.today-hero')!==null);
```

Expected: console output is `true`; the home screen does not force next-stop mode.

- [ ] **Step 5: Verify other tabs still open**

Click the existing bottom tabs: full itinerary, shopping, and split. Expected: each tab renders without a visible error message.

- [ ] **Step 6: Commit only if Task 5 required fixes**

If fixes were needed:

```powershell
git add "日本行程V2預覽.html"
git commit -m "Stabilize home next stop edge states"
```

If no fixes were needed, no commit is required for this task.

---

### Task 6: Update Changelog And Final Verification

**Files:**
- Modify: `07_CHANGELOG.md`
- Verify: `日本行程V2預覽.html`
- Do not modify: `schema.js`, `validator.js`, `09_SCHEMA_MAPPING.md`, `11_CODING_CONVENTION.md`.

**Interfaces:**
- Consumes: completed app changes from Tasks 2-5.
- Produces: delivery-ready implementation record.

- [ ] **Step 1: Add changelog entry at the top**

Add this entry under the intro lines in `07_CHANGELOG.md`:

```markdown
## 2026-07-07 — 首頁下一站模式 UX 實作
- 首頁改為只突出下一站的票卡式旅途中視圖
- 新增每個行程日獨立保存的完成 / 跳過狀態,僅存在 localStorage,不回寫 CMS
- 下一站判斷採完成 / 跳過優先,無紀錄時再依目前時間推估
- Breaking Change:無
```

- [ ] **Step 2: Run file-scope verification**

Run:

```powershell
git diff --name-only HEAD~6..HEAD
```

Expected modified files are limited to:

```text
日本行程V2預覽.html
07_CHANGELOG.md
```

If the exact commit count differs, inspect the current branch diff and confirm only those two files changed for implementation.

- [ ] **Step 3: Confirm forbidden files were not modified**

Run:

```powershell
git diff --name-only main...HEAD | rg "^(schema\.js|validator\.js|09_SCHEMA_MAPPING\.md|11_CODING_CONVENTION\.md)$"
```

Expected: no output.

- [ ] **Step 4: Run visual preview**

Run:

```powershell
python -m http.server 8765
```

Open:

```text
http://127.0.0.1:8765/%E6%97%A5%E6%9C%AC%E8%A1%8C%E7%A8%8BV2%E9%A0%90%E8%A6%BD.html
```

Expected on a 390px-wide mobile viewport:

- Home first screen shows one dominant ticket-style next-stop card.
- Navigation is the primary action.
- Website and timetable buttons appear only when data exists.
- Complete and Skip are low-emphasis text actions.
- The full daily itinerary is not expanded on the first screen.

- [ ] **Step 5: Commit changelog**

```powershell
git add "07_CHANGELOG.md"
git commit -m "Document home next stop mode implementation"
```

---

## Self-Review

- Spec coverage: covered home placement, one-card first impression, local per-day progress, complete/skip, time fallback, optional buttons, edge states, and no schema/CMS changes.
- Placeholder scan: no incomplete requirement markers are present.
- Type consistency: helper names introduced in earlier tasks are reused consistently in later tasks.
- Scope check: the plan is one focused implementation in the existing single HTML app plus changelog; it does not require decomposition.
