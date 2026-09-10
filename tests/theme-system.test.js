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
function presentationBlock(html){
  const start=html.indexOf(':root{');
  assert(start>=0,'non-theme presentation token block exists');
  return html.slice(start+6,html.indexOf('}',start));
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
function rgbDistance(first,second){
  const a=hexToRgb(first),b=hexToRgb(second);
  return Math.sqrt(a.reduce((sum,value,index)=>sum+Math.pow(value-b[index],2),0));
}
function hueDegrees(hex){
  const [red,green,blue]=hexToRgb(hex).map(value=>value/255);
  const max=Math.max(red,green,blue),min=Math.min(red,green,blue),delta=max-min;
  if(!delta)return 0;
  let hue=max===red?(green-blue)/delta:max===green?2+(blue-red)/delta:4+(red-green)/delta;
  hue=(hue*60+360)%360;
  return hue;
}
function hueDistance(first,second){
  const distance=Math.abs(hueDegrees(first)-hueDegrees(second));
  return Math.min(distance,360-distance);
}
function extractThemeIds(html){
  const match=html.match(/var THEME_IDS=(\[[^;]+\]);/);
  assert(match,'THEME_IDS declaration exists');
  return vm.runInNewContext(match[1]);
}

(function(){
  const html=fs.readFileSync('shell/'+appVersion()+'/index.html','utf8');
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

  /* Break caught: Cedar, Mist and Tea drift back to near-identical white surfaces,
     coral accents and the same purple secondary color, making the theme picker cosmetic. */
  const priorityThemes=['cedar','mist','tea'].map(id=>({id,block:themeBlock(html,id)}));
  for(let i=0;i<priorityThemes.length;i++){
    for(let j=i+1;j<priorityThemes.length;j++){
      assert(
        rgbDistance(cssValue(priorityThemes[i].block,'--t-paper'),cssValue(priorityThemes[j].block,'--t-paper'))>=10,
        priorityThemes[i].id+' and '+priorityThemes[j].id+' keep visibly different page surfaces'
      );
      assert(
        hueDistance(cssValue(priorityThemes[i].block,'--t-accent'),cssValue(priorityThemes[j].block,'--t-accent'))>=20,
        priorityThemes[i].id+' and '+priorityThemes[j].id+' keep distinct accent families'
      );
    }
  }
  const prioritySecondaries=priorityThemes.map(theme=>cssValue(theme.block,'--t-secondary'));
  assert.strictEqual(new Set(prioritySecondaries).size,3,'priority themes no longer share one secondary color');
  assert(prioritySecondaries.every(color=>color!=='#7659a0'),'priority themes do not inherit the old shared purple secondary');
  assert(hueDegrees(cssValue(themeBlock(html,'mist'),'--t-accent'))>=35&&hueDegrees(cssValue(themeBlock(html,'mist'),'--t-accent'))<=50,'Mist uses a warm sun accent');
  assert(hueDegrees(cssValue(themeBlock(html,'tea'),'--t-accent'))>=195&&hueDegrees(cssValue(themeBlock(html,'tea'),'--t-accent'))<=225,'Tea uses a Kurashiki indigo accent');

  const baseBlock=themeBlock(html,'ocean');
  const sharedPresentation=presentationBlock(html);
  const presentationTokens={
    '--font-caption':'11px','--font-meta':'12px','--font-body':'14px','--font-title':'20px','--font-display':'24px',
    '--space-1':'4px','--space-2':'8px','--space-3':'12px','--space-4':'16px','--space-5':'24px',
    '--radius-sm':'6px','--radius-control':'10px','--radius-card':'14px','--radius-pill':'999px',
    '--status-pending-bg':'#fff3cf','--status-pending-ink':'#80600d',
    '--entry-secondary-border':'#cfe0dd','--entry-secondary-bg':'#f3f8f6',
    '--shopping-category-bg':'#fff7dc','--shopping-category-ink':'#8a6416',
    '--status-partial-bg':'#e8f0f2','--status-unverified-bg':'#fdf0e2',
    '--status-unverified-ink':'#9a5b18','--status-wait-ink':'#8b531a'
  };
  Object.keys(presentationTokens).forEach(name=>{
    assert.strictEqual(cssValue(sharedPresentation,name),presentationTokens[name],name+' keeps the approved non-theme scale');
  });
  [
    '--action-primary-bg','--action-primary-ink','--action-secondary-bg','--action-secondary-ink',
    '--action-secondary-border','--action-quiet-bg','--action-quiet-ink','--action-destructive-bg',
    '--action-destructive-ink','--diagnostic-success','--diagnostic-warning','--diagnostic-degraded','--diagnostic-error'
  ].forEach(name=>assert(sharedPresentation.includes(name+':'),name+' defines the shared presentation role'));
  [
    ['--paper','--t-paper'],['--card','--t-card'],['--sea-deep','--t-chrome'],
    ['--sea','--t-action'],['--coral','--t-accent'],['--coral-bg','--t-accent-bg'],
    ['--ink','--t-ink'],['--ink-soft','--t-ink-soft'],['--ink-faint','--t-ink-faint'],
    ['--line','--t-line'],['--line-soft','--t-line-soft'],['--violet','--t-secondary']
  ].forEach(([legacy,token])=>{
    assert.match(baseBlock,new RegExp(escapeRegExp(legacy)+':var\\('+escapeRegExp(token)+'\\)'));
  });
  assert.match(html,/\.btn\{[^}]*background:var\(--action-primary-bg\)[^}]*color:var\(--action-primary-ink\)/,
    'shared primary buttons consume action-role tokens');
  assert.match(html,/\.btn\.ghost\{[^}]*background:var\(--action-secondary-bg\)[^}]*color:var\(--action-secondary-ink\)[^}]*border:1px solid var\(--action-secondary-border\)/,
    'shared secondary buttons consume action-role tokens');
  assert.match(html,/\.btn\.coral\{[^}]*background:var\(--action-destructive-bg\)/,
    'shared destructive buttons consume the destructive action role');
  assert.match(html,/\.ledger-sheet-back\{[^}]*border-radius:var\(--radius-pill\)[^}]*background:var\(--action-quiet-bg\)[^}]*color:var\(--action-quiet-ink\)[^}]*font-size:var\(--font-body\)/,
    'quiet sheet action consumes the shared quiet, radius, and typography roles');
  assert.match(html,/\.ledger-recent-badge\.pending\{background:var\(--status-pending-bg\);color:var\(--status-pending-ink\)\}/,
    'new Ledger pending badges consume fixed semantic status colors');
  assert.match(html,/\.ledger-entry-summary\{[^}]*border:1px solid var\(--entry-secondary-border\)[^}]*background:var\(--entry-secondary-bg\)/,
    'new Ledger entry disclosure consumes semantic surface colors');
  assert.match(html,/\.ledger-entry-secondary\{[^}]*border:1px solid var\(--entry-secondary-border\)[^}]*background:var\(--entry-secondary-bg\)/,
    'new Ledger entry disclosure body consumes semantic surface colors');
  assert.match(html,/\.shopping-category-badge\{[^}]*background:var\(--shopping-category-bg\)[^}]*color:var\(--shopping-category-ink\)/,
    'new Shopping category badge consumes semantic colors');
  assert.match(html,/\.shopping-link-partial\{background:var\(--status-partial-bg\)/,
    'new Shopping partial status consumes its semantic surface');
  assert.match(html,/\.shopping-link-unverified\{background:var\(--status-unverified-bg\);color:var\(--status-unverified-ink\)\}/,
    'new Shopping unverified status consumes semantic colors');
  assert.match(html,/\.shopping-detail-ledger-wait-note\{[^}]*background:var\(--status-unverified-bg\)[^}]*color:var\(--status-wait-ink\)/,
    'new Shopping wait note consumes semantic colors');
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
  assert.strictEqual(meta.content,'#314d63');
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
  assert.deepStrictEqual(Array.from(notes.slice(1),function(note){return note.version;}),['v113','v112','v111','v110']);
  /* 主題辨識度那一批是 v113,不是最新一筆 —— 斷言綁在該版本上,而不是綁在「最新」,
     否則每次升版做別的事都會假失敗。它離開五筆視窗時本斷言會失敗,那時再由裁定決定去留。 */
  const themeNote=notes.filter(function(note){return note.version==='v113';})[0];
  assert(themeNote,'the priority-theme release note is still inside the five-release window');
  assert.match(themeNote.title,/主題/,'the v113 release note describes the theme differentiation work');
  assert(JSON.stringify(themeNote).includes('杉綠'),'the v113 release note explains the Cedar palette');
  assert(JSON.stringify(themeNote).includes('霧藍'),'the v113 release note explains the Mist palette');
  assert(JSON.stringify(themeNote).includes('焙茶'),'the v113 release note explains the Tea palette');
  const v111Note=notes.filter(function(note){return note.version==='v111';})[0];
  assert(v111Note&&JSON.stringify(v111Note).includes('版本綁定'),'v111 offline boot note remains in the five-release window');
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
