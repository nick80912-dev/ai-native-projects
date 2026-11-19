/* 2026-11-19 健檢(Bar 核准):行程、行前清單與退稅的 ID 來自試算表或使用者輸入,
   放進 onclick="...('ID')" 之前一律用 jsHtmlAttrString 轉義 —— ID 裡有引號時按鈕才不會失效。 */
const assert=require('assert');
const {readIndexHtml}=require('./support/source');
const html=readIndexHtml();
const raw=html.match(/on[a-z]+="[^"]*\\''\+(it\.id|current\.id|item\.id)\+'\\'/g)||[];
assert.deepStrictEqual(raw,[],'trip item IDs inside inline handlers are always escaped');
assert(html.includes("var k=jsHtmlAttrString(item.key);"),'pre-trip checklist keys are escaped for the attribute');
assert(html.includes("var k=jsHtmlAttrString(key),body,dialog="),'refund group keys are escaped for the attribute');
/* jsHtmlAttrString 本身:單引號、反斜線、雙引號與角括號都不會跑出屬性或字串 */
const vm=require('vm');const sb={};vm.createContext(sb);
vm.runInContext(html.match(/function jsString\(s\)\{[^\n]*\}/)[0]+'\n'+html.match(/function jsHtmlAttrString\(s\)\{[^\n]*\}/)[0],sb);
assert.strictEqual(sb.jsHtmlAttrString(`a'b"c<d>\\`),"a\\'b&quot;c&lt;d&gt;\\\\");
console.log('inline handler escaping tests passed');
