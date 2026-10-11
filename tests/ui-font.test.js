const assert=require('assert');
const vm=require('vm');
const {appHtml}=require('./support/version');
const {extractFunction}=require('./support/source');

const html=appHtml();
/* v78 移除 Google Fonts 的理由仍然成立:第一個畫面不能等網路字型。v149(Bar 2026-10-11 核准)
   改用 Huninn,但只能在 load 事件之後由程式加入樣式表,不得出現在 <head> 的靜態 <link>。 */
assert.doesNotMatch(html,/<link[^>]+fonts\.googleapis\.com/,'first paint does not wait for a static Google Fonts stylesheet');
assert.doesNotMatch(html,/fonts\.gstatic\.com/,'first paint has no remote font preconnect');
assert.strictEqual((html.match(/fonts\.googleapis\.com/g)||[]).length,1,'the Huninn stylesheet URL lives only in the loader');
assert.match(html,/var HUNINN_CSS_URL='https:\/\/fonts\.googleapis\.com\/css2\?family=Huninn&display=swap';/,'Huninn uses font-display: swap');
assert.match(html,/window\.addEventListener\('load',function\(\)\{setTimeout\(function\(\)\{loadHuninnFont\(\);\},0\);\}\);/,'the loader starts after the load event');
assert.match(
  html,
  /--font-ui:"PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif/,
  'the shared UI stack starts with locally available Traditional Chinese fonts'
);
assert.match(html,/html\.font-huninn\{--font-ui:"Huninn","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif\}/,'Huninn only applies after the loader marks it ready, with the system stack behind it');
assert.match(html,/html\.font-huninn \.brand \.t\{letter-spacing:0\}/,'the header title drops its letter spacing so the trip name still fits with Huninn');
assert.match(html,/body\{[\s\S]*?font-family:var\(--font-ui\)/,'body consumes the shared UI font variable');
assert.doesNotMatch(html,/font-family:[^;}]*"Hiragino Sans"/,'the Japanese Hiragino stack is not restored');
assert.doesNotMatch(html,/font-family:[^;}]*"Noto Sans JP"/,'Noto Sans JP is not used for Traditional Chinese');
assert.doesNotMatch(html,/font-family:[^;}]*"Yu Gothic"/,'Yu Gothic is not used for Traditional Chinese');
assert.match(html,/input,select,textarea\{font-size:16px\}/,'the base iOS focus-zoom guard remains');

/* ---- loadHuninnFont():只有樣式表與畫面上的字都載好,才加上 font-huninn ---- */
function harness(options){
  options=options||{};
  const classes=new Set(),appended=[];
  const doc={
    head:{appendChild(node){appended.push(node);node.parentNode=doc.head;setTimeout(function(){if(options.cssOk===false)node.onerror();else node.onload();},0);},
      removeChild(node){const i=appended.indexOf(node);if(i>=0)appended.splice(i,1);node.parentNode=null;}},
    body:{innerText:'還沒到出發日 第一站：10/18 機場 機場'},
    documentElement:{classList:{add(c){classes.add(c);}}},
    createElement(){return {};},
    getElementById(id){return appended.find(function(node){return node.id===id;})||null;},
    fonts:options.noFonts?undefined:{load(spec,text){
      doc.loadCalls.push([spec,text]);
      if(options.fontsReject)return Promise.reject(new Error('network'));
      return Promise.resolve(options.faces===undefined?[{family:'Huninn'}]:options.faces);
    }},
    loadCalls:[]
  };
  const sandbox={Promise,String,setTimeout,window:{addEventListener(){}}};
  vm.createContext(sandbox);
  vm.runInContext("var HUNINN_CSS_URL='https://fonts.googleapis.com/css2?family=Huninn&display=swap';var huninnFontState='idle';\n"+
    extractFunction(html,'huninnSampleText')+'\n'+extractFunction(html,'loadHuninnFont'),sandbox);
  return {sandbox,doc,classes,appended,nav:{onLine:options.offline?false:true}};
}
(async function(){
  let h=harness();
  assert.strictEqual(await h.sandbox.loadHuninnFont(h.doc,h.nav),'ready');
  assert(h.classes.has('font-huninn'),'switches the whole page once everything loaded');
  assert.strictEqual(h.appended.length,1,'adds exactly one stylesheet');
  assert.strictEqual(h.appended[0].href,'https://fonts.googleapis.com/css2?family=Huninn&display=swap');
  assert.strictEqual(h.doc.loadCalls[0][0],'16px "Huninn"');
  assert.strictEqual(h.doc.loadCalls[0][1],'還沒到出發日第一站：10/8機場','asks for each visible character once (repeats and spaces dropped)');
  assert.strictEqual(await h.sandbox.loadHuninnFont(h.doc,h.nav),'ready','a second call does nothing');
  assert.strictEqual(h.appended.length,1);

  h=harness({offline:true});
  assert.strictEqual(await h.sandbox.loadHuninnFont(h.doc,h.nav),'offline');
  assert.strictEqual(h.appended.length,0,'offline: no request at all');
  assert(!h.classes.has('font-huninn'),'offline keeps the system font');

  for(const [label,options] of [['stylesheet fails',{cssOk:false}],['font download fails',{fontsReject:true}],['no matching face',{faces:[]}]]){
    h=harness(options);
    assert.strictEqual(await h.sandbox.loadHuninnFont(h.doc,h.nav),'failed',label);
    assert(!h.classes.has('font-huninn'),label+': keeps the system font');
    assert.strictEqual(h.appended.length,0,label+': removes the stylesheet again');
  }
  h=harness({noFonts:true});
  assert.strictEqual(await h.sandbox.loadHuninnFont(h.doc,h.nav),'unsupported');
  assert.strictEqual(h.appended.length,0);
  console.log('UI font tests passed');
})().catch(function(error){console.error(error);process.exit(1);});
