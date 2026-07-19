const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('index.html','utf8');

assert(source.includes('function renderLedgerMultiBillInfo(draft)'),
  'multi-item mode has a dedicated shared bill information renderer');
assert(/renderLedgerMultiBillInfo\(draft\)\+renderLedgerMultiItemFields\(draft\)/.test(source),
  'shared bill information renders immediately before the item list');
assert(/ledger-multi-bill-info[\s\S]{0,600}renderLedgerStoreField\(draft,true\)/.test(source)&&source.includes("required?'店家名稱':'店家（選填）'"),
  'the multi-item shared information card labels store name as required');
assert(source.includes("throw new Error('請輸入店家名稱')"),
  'multi-item save rejects a blank store name');

assert(source.includes('class="ledger-item-sequence"'),
  'each multi-item row renders its automatic sequence before the fields');
assert(!source.includes('class="ledger-item-head"'),
  'retired visible item headings are absent');
assert(source.includes('ledger-item-primary-row')&&source.includes('ledger-item-primary-row no-remove'),
  'item primary rows support delete and one-item no-delete layouts');
assert(source.includes('grid-template-columns:40px minmax(0,1fr) minmax(88px,96px) 40px'),
  'item rows use the approved 40px sequence, flexible name, compact amount, and 40px delete columns');

assert(source.includes('ledger-item-category-face'),
  'the compact category control separates its visual face from its touch target');
assert(/\.ledger-item-category-face\{[^}]*max-width:120px/.test(source),
  'the compact category visual is capped at 120px');
assert(/\.ledger-item-category-toggle\{[^}]*min-height:44px/.test(source),
  'the category touch target remains at least 44px');

assert(/\.ledger-multi-entry \.ledger-multi-open-choice\{[^}]*border-radius:8px/.test(source),
  'multi-item open-set choices use scoped rounded rectangles');
assert(!/\.ledger-multi-entry \.ledger-sheet-choice\{/.test(source),
  'the multi-item style does not broadly override account, currency, or tax segments');
assert(source.includes("throw new Error('請輸入有效金額')"),
  'invalid multi-item amounts use the short user-facing error');
assert(!source.includes('品項金額必須是正安全整數'),
  'persistent technical amount wording is retired');
assert(source.includes('ledgerMultiDraftHasIncompleteAmounts'),
  'empty multi-item amount previews stay silent before user input');
const previewHelper=source.match(/function ledgerMultiDraftHasIncompleteAmounts\(draft\)\{[\s\S]*?\n\}/);
assert(previewHelper,'preview completeness helper can be isolated');
const previewSandbox={};
vm.createContext(previewSandbox);
vm.runInContext(previewHelper[0],previewSandbox);
assert.strictEqual(previewSandbox.ledgerMultiDraftHasIncompleteAmounts({items:[{amount:''}]}),true,
  'blank drafts keep the amount preview silent');
assert.strictEqual(previewSandbox.ledgerMultiDraftHasIncompleteAmounts({items:[{amount:0}]}),false,
  'entered invalid values may show the short amount error');

console.log('ledger multi layout tests passed');
