# Note List Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render multiline CMS notes as readable paragraphs and list items in the app without changing Sheet fields or schema.

**Architecture:** Keep the data layer unchanged. Add a small presentation helper in `日本行程V2預覽.html` that escapes text, preserves existing highlighting, and wraps recognized bullet lines in semantic note markup. Reuse the helper anywhere notes are currently displayed as plain escaped text.

**Tech Stack:** Single-file Vanilla JS app, inline CSS, Node.js smoke test using built-in `assert`, no npm dependency.

## Global Constraints

- Do not modify Google Sheet fields.
- Do not modify `schema.js`.
- Do not modify parser output shape.
- Do not add CMS columns.
- Keep Shopping store row short notes unchanged.
- Update `07_CHANGELOG.md`.
- No Breaking Change.

---

### Task 1: Add Note Rendering Regression Test

**Files:**
- Create: `tests/render-note.test.js`
- Read: `日本行程V2預覽.html`

**Interfaces:**
- Consumes: `renderNote(text)` from the HTML app.
- Produces: A command that verifies paragraphs, bullet items, reminder items, and link/highlight preservation.

- [ ] **Step 1: Write failing test**

Create `tests/render-note.test.js` that extracts `escapeHtml`, `highlightNote`, and `renderNote` from `日本行程V2預覽.html`, then checks:

```js
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
  extractFunction('renderNote')
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

console.log('renderNote tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/render-note.test.js`

Expected: FAIL because `renderNote` is not defined yet.

### Task 2: Implement Shared Note Rendering

**Files:**
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Produces: `renderNote(text)` and `renderNoteBlock(text, icon)`.
- Consumes: existing `escapeHtml(text)` and `highlightNote(text)`.

- [ ] **Step 1: Add CSS**

Add styles for `.note-rich`, `.note-p`, `.note-list`, `.note-li`, `.note-marker`, and `.note-alert`.

- [ ] **Step 2: Add renderer**

Add helper functions near `highlightNote`:

```js
function parseNoteLine(line){
  var t=(line||'').trim();
  var m=t.match(/^(•|-|\d+[.、]|[①②③④⑤⑥⑦⑧⑨⑩])\s*(.+)$/);
  if(m) return {type:'list', marker:m[1], text:m[2]};
  m=t.match(/^(※)\s*(.+)$/);
  if(m) return {type:'alert', marker:m[1], text:m[2]};
  return {type:'text', text:t};
}
function renderNote(text){
  if(!text) return '';
  var lines=String(text).split(/\r?\n/), out='', listOpen=false;
  function closeList(){ if(listOpen){ out+='</ul>'; listOpen=false; } }
  lines.forEach(function(line){
    var raw=(line||'').trim();
    if(!raw){ closeList(); return; }
    var item=parseNoteLine(raw);
    if(item.type==='list'){
      if(!listOpen){ out+='<ul class="note-list">'; listOpen=true; }
      out+='<li class="note-li"><span class="note-marker">'+escapeHtml(item.marker)+'</span><span>'+highlightNote(item.text)+'</span></li>';
      return;
    }
    closeList();
    if(item.type==='alert') out+='<div class="note-alert"><span class="note-marker">'+escapeHtml(item.marker)+'</span><span>'+highlightNote(item.text)+'</span></div>';
    else out+='<div class="note-p">'+highlightNote(item.text)+'</div>';
  });
  closeList();
  return out?'<div class="note-rich">'+out+'</div>':'';
}
function renderNoteBlock(text, icon){
  return text?'<div class="pc-tip">'+(icon||'💡')+' '+renderNote(text)+'</div>':'';
}
```

- [ ] **Step 3: Replace note display call sites**

Replace note-only `escapeHtml(...)` or `highlightNote(...)` output for Places, Restaurants, Hotels, itinerary note, and shopping place note with `renderNote(...)` or `renderNoteBlock(...)`.

Do not change Shopping store row short notes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/render-note.test.js`

Expected: PASS with `renderNote tests passed`.

### Task 3: Documentation And Preview Verification

**Files:**
- Modify: `07_CHANGELOG.md`

**Interfaces:**
- Consumes: completed app rendering behavior.
- Produces: documented non-breaking UI display change.

- [ ] **Step 1: Update changelog**

Add a new entry describing:

- App now renders multiline notes as paragraphs and list items.
- Sheet schema and `schema.js` are unchanged.
- Breaking Change: none.

- [ ] **Step 2: Verify changed files**

Run: `git diff --name-only`

Expected only:

- `07_CHANGELOG.md`
- `日本行程V2預覽.html`
- `tests/render-note.test.js`
- this plan file

- [ ] **Step 3: Start local preview**

Serve the project locally and open `日本行程V2預覽.html`.

- [ ] **Step 4: Manual visual check**

Open a day/place that includes multiline notes, then verify list-style rendering is readable on the phone viewport.

