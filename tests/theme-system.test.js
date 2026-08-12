const assert=require('assert');
const {appVersion}=require('./support/version');
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
  const cedarBlock=themeBlock(html,'cedar');
  assert.strictEqual(cssValue(cedarBlock,'--t-action'),'#2f6b4f');
  assert(contrastRatio('#ffffff',cssValue(cedarBlock,'--t-action'))>=4.5,'cedar action supports white text');
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
  /* v80:六個主題一律淺色。系統深色外觀不得改寫任何 token —— 六組調色盤是照淺色設計的,
     而元件層還有約 108 處硬編碼淺色背景,token 級的深色模式永遠對不齊。
     改以 color-scheme:light 讓原生控制項與捲軸也維持淺色。 */
  assert(html.indexOf('@media(prefers-color-scheme:dark)')<0,'no automatic dark override remains');
  assert.match(html,/html\{[^}]*color-scheme:light/,'the document opts out of system dark rendering');
  const reducedStart=html.indexOf('@media(prefers-reduced-motion:reduce)');
  assert(reducedStart>=0,'reduced-motion override is defined');
  const reducedCss=html.slice(reducedStart,html.indexOf('}',reducedStart)+1);
  assert.match(reducedCss,/scroll-behavior:auto!important/,'reduced motion removes smooth scrolling');
  assert.match(reducedCss,/animation-duration:\.01ms!important/,'reduced motion collapses animation duration');
  assert.match(html,/var THEME_STORAGE_KEY='trip_theme'/);
  assert.match(html,/function normalizeThemeId\(/);
  assert.match(html,/function applyTheme\(/);
  assert.match(html,/function selectTheme\(/);
  assert.match(html,/function renderThemeSettingsSheet\(/);
  assert.match(html,/class="settings-theme-grid"/);
  const themeSheetSource=html.slice(html.indexOf('function renderThemeSettingsSheet('),html.indexOf('function renderSettingsProxyPage('));
  assert.doesNotMatch(themeSheetSource,/只影響這台裝置|成熟俐落|柔和安靜|自然沉穩/);

  /* v74 設定根頁群組列表:六個主題共用同一組語意 token,不得硬編碼任何顏色,
     否則在非 ocean 主題下分隔線／摘要文字會失去對比。 */
  const groupCssStart=html.indexOf('.settings-group{');
  assert(groupCssStart>=0,'grouped Settings CSS is present');
  const groupCss=html.slice(groupCssStart,html.indexOf('\n',groupCssStart));
  ['.settings-group-title','.settings-group-card','.settings-row','.settings-row-summary','.settings-testmode-row']
    .forEach(function(selector){
      assert(groupCss.includes(selector),'grouped Settings CSS defines '+selector);
    });
  assert.doesNotMatch(groupCss,/#[0-9a-fA-F]{3,8}\b/,'grouped Settings CSS declares no literal hex colors');
  assert.doesNotMatch(groupCss,/rgba?\(/,'grouped Settings CSS declares no literal rgb colors');
  assert.match(groupCss,/\.settings-row\{[^}]*min-height:52px/,'grouped Settings rows keep a 52px touch target');
  assert.match(groupCss,/\.settings-testmode-row \.settings-row-main b\{[^}]*var\(--ink\)/,
    'the warning row uses the high-contrast semantic text color');
  assert.doesNotMatch(groupCss,/\.settings-testmode-row \.settings-row-main b\{[^}]*var\(--coral\)/,
    'the warning row does not use coral for its main text');
  /* 實測過的回歸:.settings-row 的 border:0 與分隔線規則特異性相同,
     分隔線若寫在前面會被整個蓋掉,群組看起來就是一團沒有分隔的列。 */
  const dividerAt=html.indexOf('.settings-group-card>*+*{border-top:1px solid var(--line-soft)}');
  const rowResetAt=html.indexOf('.settings-row{');
  assert(dividerAt>=0,'the group divider rule is present');
  assert(dividerAt>rowResetAt,'the group divider rule follows .settings-row so its border:0 cannot erase it');

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

  assert.match(html,/var APP_RELEASE_NOTES=\[/);
  assert.match(html,/function renderAppReleaseNotes\(/);
  const releaseMatch=html.match(/var APP_RELEASE_NOTES=(\[[\s\S]*?\]);/);
  assert(releaseMatch,'release-note data is extractable');
  const notes=vm.runInNewContext(releaseMatch[1]);
  /* 「恰好五筆」是 v72 核准的設計,升版時由最新一筆擠掉最舊一筆,不是讓清單長大。
     最新一筆必須是目前版本(推導);其餘為歷史 release note,依裁定保留原字面。 */
  assert.strictEqual(notes.length,5,'Settings exposes exactly five user-facing releases');
  assert.strictEqual(notes[0].version,appVersion(),'the newest release note is the current version');
  /* 滾動的五筆視窗:最新一筆是目前版本,其餘四筆是緊接在後的歷史版本。
     歷史版本刻意寫死字面值(見 tests/support/version.js 的適用範圍說明)。 */
  assert.deepStrictEqual(Array.from(notes.slice(1),function(note){return note.version;}),['v103','v102','v101','v100']);
  notes.forEach(note=>{
    assert(note.title&&note.title.length<=24,'release title is short and present');
    assert(Array.isArray(note.items)&&note.items.length>=1,'release has user-readable items');
  });
  assert(!JSON.stringify(notes).includes('canonical'),'user notes avoid internal implementation jargon');
  const dataPageSource=html.slice(html.indexOf('function renderSettingsDataPage('),html.indexOf('function renderSettingsPage('));
  assert(dataPageSource.includes('renderAppReleaseNotes()'),'release notes render only in Data and Version');
  assert.strictEqual((dataPageSource.match(/SW /g)||[]).length,1,'Data and Version shows the SW version once');

  console.log('theme system tests passed');
})();
