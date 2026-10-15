/* v155（Bar 2026-10-14）：說明字統一以分帳大卡的「個人帳留在本機；團體帳跨裝置同步。」為準——一般粗細、淡色。
   一行的短說明同為 10px；多行段落維持 12px（--font-meta）好讀。淺色底用 --note-ink（= --ink-soft），
   它在淺底的對比與深色底的白 56% 相當；原本的 --ink-faint 在多數主題低於 4.5:1，10px 時太難讀。
   警告、狀態、標籤、空白狀態與 CMS 內容不屬於說明，不在此列。 */
const assert=require('assert');
const {readIndexHtml}=require('./support/source');

const html=readIndexHtml();
const css=Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g),m=>m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
const rules=Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g),m=>({selectors:m[1].split(',').map(s=>s.trim()),body:m[2]}));
const decls=body=>Object.fromEntries(body.split(';').filter(item=>item.includes(':')).map(item=>{const i=item.indexOf(':');return [item.slice(0,i).trim(),item.slice(i+1).trim()];}));
const TYPE=['font-size','font-weight','line-height','color','font'];

const SHORT=['.ledger-category-apply-help','.ledger-proxy-help','.ledger-tax-help','.ledger-settlement-hint','.ledger-detail-lock-note','.member-confirm-note','.settings-health-main span','.shopping-photo-storage-note','.ledger-payer-note'];
const PARAGRAPH=['.settings-help','.diag-help','.ledger-spend-notes','.diag-log-entry span'];

const helper=decls(rules.find(rule=>rule.selectors.includes('.ledger-summary-helper')).body);
assert.deepStrictEqual([helper['font-size'],helper['font-weight'],helper['line-height'],helper.color],['10px','400','1.3','rgba(255,255,255,.56)'],'the reference line keeps the style Bar picked');

const shortRule=rules.find(rule=>SHORT.every(sel=>rule.selectors.includes(sel)));
assert(shortRule,'one shared rule owns every one-line note');
assert.deepStrictEqual(decls(shortRule.body),{'font-size':helper['font-size'],'font-weight':helper['font-weight'],'line-height':helper['line-height'],color:'var(--note-ink)'},'one-line notes match the reference size, weight and line height');
const paragraphRule=rules.find(rule=>PARAGRAPH.every(sel=>rule.selectors.includes(sel)));
assert(paragraphRule,'one shared rule owns every paragraph note');
assert.deepStrictEqual(decls(paragraphRule.body),{'font-size':'var(--font-meta)','font-weight':helper['font-weight'],color:'var(--note-ink)'},'paragraph notes stay 12px but share the weight and colour');
assert(/--font-meta:12px/.test(css),'--font-meta is 12px');

/* 沒有其他規則再改這些說明的字級、粗細或顏色（只允許段落自己的行高） */
const subject=(selector,target)=>{const parts=target.split(' ');const last=parts[parts.length-1];const re=new RegExp(last.replace(/[.]/g,'\\.')+'(?![-\\w])');return re.test(selector.split(/[\s>+~]+/).pop())&&(parts.length===1||selector.includes(parts[0]));};
for(const target of SHORT.concat(PARAGRAPH)){
  for(const rule of rules){
    if(rule===shortRule||rule===paragraphRule)continue;
    for(const selector of rule.selectors){
      if(!subject(selector,target))continue;
      const own=Object.keys(decls(rule.body)).filter(key=>TYPE.includes(key));
      const allowed=PARAGRAPH.includes(target)?own.filter(key=>key!=='line-height'):own;
      assert.deepStrictEqual(allowed,[],selector+' must not override the shared note typography');
    }
  }
}

/* 淡色：淺底用 --ink-soft；六個主題在紙色與卡片色上都至少 4.5:1，且不比參考行（深底白 56%）難讀太多 */
assert(/--note-ink:var\(--ink-soft\)/.test(css),'--note-ink maps to the theme --ink-soft');
const hex=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=rgb=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const themes=Array.from(css.matchAll(/data-theme="(\w+)"\][^{]*\{([^}]*)\}/g),m=>({id:m[1],tokens:Object.fromEntries(Array.from(m[2].matchAll(/--t-([a-z-]+):(#[0-9a-fA-F]{6})/g),t=>[t[1],t[2]]))})).filter(theme=>theme.tokens['ink-soft']);
assert.strictEqual(themes.length,6,'all six themes are checked');
for(const theme of themes){
  const ink=hex(theme.tokens['ink-soft']);
  for(const surface of ['paper','card']){
    const value=ratio(ink,hex(theme.tokens[surface]));
    assert(value>=4.5,theme.id+' note ink on '+surface+' is '+value.toFixed(2)+':1');
  }
}

/* 照片健康狀態：兩句說明另有 class，容量與檢查時間等數據行不受影響 */
assert(html.includes('<div class="shopping-photo-storage-note">其中 ')&&html.includes('<div class="shopping-photo-storage-note">遺失的照片不會自動移除'),'the two photo storage sentences use the note style');
assert(html.includes('<div class="shopping-photo-storage-secondary">\'+escapeHtml(capacityDetail)'),'data lines keep their own style');

console.log('help note style tests passed');
