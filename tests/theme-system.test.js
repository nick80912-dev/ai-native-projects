const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function themeBlock(html,id){
  const selector=id==='ocean'?':root,[data-theme="ocean"]':'[data-theme="'+id+'"]';
  const start=html.indexOf(selector);
  assert(start>=0,'theme block exists: '+id);
  const open=html.indexOf('{',start);
  const close=html.indexOf('}',open);
  return html.slice(open+1,close);
}
function cssValue(block,name){
  const match=block.match(new RegExp(escapeRegExp(name)+':\\s*([^;]+)'));
  assert(match,'CSS value exists: '+name);
  return match[1].trim();
}
function hexToRgb(hex){
  const value=hex.replace('#','');
  return [0,2,4].map(index=>parseInt(value.slice(index,index+2),16));
}
function relativeLuminance(hex){
  const channels=hexToRgb(hex).map(value=>{
    const channel=value/255;
    return channel<=0.03928?channel/12.92:Math.pow((channel+0.055)/1.055,2.4);
  });
  return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
}
function contrastRatio(first,second){
  const a=relativeLuminance(first);
  const b=relativeLuminance(second);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
function extractThemeIds(html){
  const match=html.match(/var THEME_IDS=(\[[^;]+\]);/);
  assert(match,'THEME_IDS declaration exists');
  return vm.runInNewContext(match[1]);
}

(function(){
  const html=fs.readFileSync('index.html','utf8');
  const themeIds=['ocean','ivory','wisteria','cedar','mist','tea'];
  const tokenNames=[
    '--t-paper','--t-card','--t-chrome','--t-action','--t-accent','--t-accent-bg',
    '--t-ink','--t-ink-soft','--t-ink-faint','--t-line','--t-line-soft','--t-tabbar','--t-secondary'
  ];
  themeIds.forEach(id=>{
    const block=themeBlock(html,id);
    tokenNames.forEach(name=>assert(block.includes(name+':'),id+' defines '+name));
    const paper=cssValue(block,'--t-paper');
    assert(contrastRatio(cssValue(block,'--t-action'),paper)>=4.5,id+' action contrast');
    assert(contrastRatio(cssValue(block,'--t-accent'),paper)>=3,id+' accent contrast');
    assert(contrastRatio(cssValue(block,'--t-ink'),paper)>=4.5,id+' ink contrast');
    assert(contrastRatio(cssValue(block,'--t-ink-soft'),paper)>=4.5,id+' soft ink contrast');
    assert(contrastRatio('#ffffff',cssValue(block,'--t-chrome'))>=4.5,id+' chrome contrast');
  });
  assert.strictEqual(cssValue(themeBlock(html,'tea'),'--t-action'),'#896748');

  const baseBlock=themeBlock(html,'ocean');
  [
    ['--paper','--t-paper'],['--card','--t-card'],['--sea-deep','--t-chrome'],
    ['--sea','--t-action'],['--coral','--t-accent'],['--coral-bg','--t-accent-bg'],
    ['--ink','--t-ink'],['--ink-soft','--t-ink-soft'],['--ink-faint','--t-ink-faint'],
    ['--line','--t-line'],['--line-soft','--t-line-soft'],['--violet','--t-secondary']
  ].forEach(([legacy,token])=>{
    assert.match(baseBlock,new RegExp(escapeRegExp(legacy)+':var\\('+escapeRegExp(token)+'\\)'));
  });
  assert.match(html,/--green:#367055/);
  assert.match(html,/--gold-ink:#85661c/);
  assert.match(html,/\.hotel \.h-lbl\{[^}]*color:var\(--gold-ink\)/);
  assert.match(html,/\.pretrip-count\{[^}]*color:var\(--gold-ink\)/);
  assert.match(html,/\.pc-rest-r\{[^}]*color:var\(--gold-ink\)/);

  assert.deepStrictEqual(Array.from(extractThemeIds(html)),themeIds);
  assert.match(html,/var THEME_STORAGE_KEY='trip_theme'/);
  assert.match(html,/function normalizeThemeId\(/);
  assert.match(html,/function applyTheme\(/);
  assert.match(html,/function selectTheme\(/);
  assert.match(html,/function renderThemeSettingsSheet\(/);
  assert.match(html,/class="settings-theme-grid"/);
  const themeSheetSource=html.slice(html.indexOf('function renderThemeSettingsSheet('),html.indexOf('function renderSettingsProxyPage('));
  assert.doesNotMatch(themeSheetSource,/只影響這台裝置|成熟俐落|柔和安靜|自然沉穩/);

  const moduleStart=html.indexOf("var THEME_STORAGE_KEY='trip_theme'");
  const moduleEnd=html.indexOf('</script>',moduleStart);
  assert(moduleStart>=0&&moduleEnd>moduleStart,'theme module is bounded in a head script');
  const values={};
  let failedKey='';
  const storage={
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){if(key===failedKey){failedKey='';throw new Error('storage denied');}values[key]=String(value);},
    failOnceOn(key){failedKey=key;}
  };
  const root={dataset:{}};
  const meta={content:'#0e3a44',setAttribute(name,value){if(name==='content')this.content=value;}};
  const logMessages=[];
  const sandbox={
    console,
    localStorage:storage,
    document:{
      documentElement:root,
      querySelector(selector){return selector==='meta[name="theme-color"]'?meta:null;}
    },
    AppLog:{repo(message){logMessages.push(message);}},
    toast(){},
    openSettings(){},
    Object,String,Array,JSON
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(moduleStart,moduleEnd),sandbox);
  assert.strictEqual(sandbox.applyTheme('mist').id,'mist');
  assert.strictEqual(root.dataset.theme,'mist');
  assert.strictEqual(meta.content,'#3f4c5e');
  assert.strictEqual(storage.getItem('trip_theme'),'mist');
  assert.strictEqual(sandbox.applyTheme('unknown').id,'ocean');
  assert.strictEqual(root.dataset.theme,'ocean');
  assert.strictEqual(logMessages.length,1,'unknown stored theme is recorded once for diagnostics');
  storage.failOnceOn('trip_theme');
  const failed=sandbox.selectTheme('tea');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(failed)),{ok:false});
  assert.strictEqual(root.dataset.theme,'ocean');
  assert.strictEqual(meta.content,'#0e3a44');

  const navStart=html.indexOf('<div class="tabbar">');
  const navMarkup=html.slice(navStart,html.indexOf('</div>',navStart)+6);
  ['🏠','🗺️','🏬','💴'].forEach(icon=>assert(!navMarkup.includes(icon),'main tab removes '+icon));
  const settingsStart=html.indexOf('<button class="settings-btn"');
  const settingsButtonMarkup=html.slice(settingsStart,html.indexOf('</button>',settingsStart)+9);
  assert(!settingsButtonMarkup.includes('⚙'),'Settings removes the gear Emoji');
  assert.strictEqual((navMarkup.match(/<svg /g)||[]).length,4,'four tabs use inline SVG');
  assert.match(settingsButtonMarkup,/<svg /);
  assert.match(html,/\.app-icon\{[^}]*stroke:currentColor[^}]*stroke-width:1\.75/);
  assert.match(html,/\.tabbar-btn\.active\{[^}]*color:var\(--sea-deep\)/);
  assert.match(html,/\.tabbar-btn\.active::before/);
  const activeTabCss=html.match(/\.tabbar-btn\.active\{[^}]*\}/)[0];
  assert.doesNotMatch(activeTabCss,/var\(--coral\)/);
  assert.match(navMarkup,/id="splitTabBadge"/);
  assert.match(navMarkup,/aria-hidden="true"/);
  assert.match(settingsButtonMarkup,/aria-label="設定"/);
  assert.match(html,/<img class="logo" id="diagnosticBadge" src="okayama-peach-badge\.png"/);
  assert(html.includes("var driveIcon = /開車/.test(drive) ? '🚗'"),'content transport Emoji remains');

  console.log('theme system tests passed');
})();
