const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert(
  html.includes('grid-template-columns:minmax(0,1fr) 44px')&&
  html.includes('grid-template-columns:44px minmax(0,1fr)'),
  'normal and selection cards use mirrored two-column grids'
);
assert(
  html.includes("ledgerUiState.selectionMode?'ledger-selection-card '")&&
  html.includes("ledgerUiState.selectionMode?'':'<button class=\"ledger-record-menu-button\""),
  'selection mode swaps in the checkbox and omits the action-menu DOM'
);
assert(!html.includes('grid-template-columns:auto minmax(0,1fr) 44px'),'the retired three-column card grid is absent');

assert(html.includes('.ledger-entry-divider{border-bottom:1px solid var(--line);padding-bottom:8px}'),'identity and occurrence rows share one divider token');
assert(html.includes("ledger-datetime-grid '+(inBillCard?'':'ledger-entry-divider')"),'single-item occurrence rows retain the shared divider while the multi-item card avoids a nested divider');
assert(html.includes('.ledger-datetime-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:9px')&&html.includes('.ledger-datetime-grid .ledger-sheet-field{margin-top:0;width:100%'),'date and time stack consistently without increasing their font sizes');
assert(html.includes('grid-template-columns:minmax(0,1fr)')&&html.includes('.ledger-datetime-grid .ledger-sheet-input{width:100%;min-width:0;max-width:100%;box-sizing:border-box}'),'stacked date and time controls share the bounded group content width');
assert(html.includes('.ledger-time-input-wrap{display:flex;width:100%;min-width:0;max-width:100%;box-sizing:border-box}')&&html.includes('.ledger-datetime-grid .ledger-time-input-wrap input[type="time"]{flex:1 1 0;width:0;min-width:0;max-width:100%;box-sizing:border-box}'),'iOS time control is sized by its wrapper rather than width 100%');
assert(html.includes('aria-label="開啟日期選擇器"')&&html.includes('<svg aria-hidden="true"'),'calendar control uses the approved accessible inline SVG');

assert(html.includes('function renderLedgerStoreField('),'store is a shared form field rather than disclosure-only content');
assert(html.includes("renderLedgerStoreField(draft,true)+renderLedgerMultiSummary(draft)")&&html.includes("renderLedgerStoreField(draft)+renderLedgerOccurrenceFields(draft,true)+renderLedgerSingleItemCategory(draft)+renderLedgerPaymentFields(draft,false)"),'multi store remains first while the single optional store, occurrence, category, and payment fields share the approved secondary disclosure');
assert(html.includes('更多細節（備註選填）'),'details disclosure is note-only');
assert(!html.includes('更多細節（店家、備註，皆為選填）'),'store is removed from the details disclosure');

assert(html.includes('.ledger-item-control-row{display:grid;grid-template-columns:minmax(0,120px) auto auto'),'multi-item category, tax-free and proxy controls share one compact row');
assert(html.includes("'衣物':'👕'")&&html.includes("'美妝':'💄'"),'clothing and cosmetics use specific emoji');
assert(html.includes("var DEFAULT_LEDGER_CATEGORIES=['餐飲','交通','票券','購物','衣物','美妝','其他']"),'new entries use the renamed clothing category');
assert(html.includes('.ledger-dual-amounts span{font-size:10px'),'secondary TWD amount is compact but remains at the 10px floor');
assert(/\.ledger-dual-amounts\{[^}]*align-content:center/.test(html),'dual-currency amounts are vertically centered in every record card');
assert(/\.ledger-record-menu-button\{[^}]*align-self:center/.test(html),'ellipsis action is vertically centered beside the card amount');
assert(/\.ledger-date-summary\{[^}]*grid-template-columns:minmax\(0,1fr\) auto[^}]*font-size:11px/.test(html),'date summary uses a compact two-column mobile layout');
assert(/\.ledger-date-total\{[^}]*font-size:9px[^}]*white-space:nowrap/.test(html),'daily total alone is reduced to 9px and stays on one line');
assert(/\.ledger-history-summary\{[^}]*font-size:11px/.test(html),'history result summary is reduced to the approved 11px');

assert.match(sw,/okayama-trip-v34/,'service worker cache is v34');

console.log('ledger mobile hotfix tests passed');
