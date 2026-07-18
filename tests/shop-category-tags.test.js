const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function storeRow(');
const end=html.indexOf('function renderShop(',start);
assert(start>=0&&end>start,'storeRow renderer is present');
const sandbox={escapeHtml(value){return String(value);}};
vm.createContext(sandbox);
vm.runInContext(html.slice(start,end),sandbox);

const categorized=sandbox.storeRow({name:'UNIQLO',floor:'4F',cat:'服飾',must:'',taxfree:'',note:''},'shop-1',false);
assert(categorized.includes('<span class="store-cat">服飾</span>'),'store category renders as a dedicated muted tag');
assert(categorized.indexOf('UNIQLO')<categorized.indexOf('store-cat'),'category follows the store name');
assert(categorized.indexOf('store-cat')<categorized.indexOf('st-f'),'category stays before the floor/location metadata');

const uncategorized=sandbox.storeRow({name:'空分類店',floor:'1F',cat:'',must:'',taxfree:'',note:''},'shop-2',false);
assert(!uncategorized.includes('store-cat'),'empty categories render no tag');
assert(html.includes('.store-cat{'),'category tag uses a dedicated minimal CSS class');

console.log('shop category tag tests passed');
