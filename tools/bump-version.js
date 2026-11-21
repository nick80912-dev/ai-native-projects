#!/usr/bin/env node
/* tools/bump-version.js — forward bump 到下一個 shell 世代(2026-11-21,Bar 核准健檢第 1 項)
   ============================================================
   用法(在 repo 根目錄):
     node tools/bump-version.js --check      只檢查:每個要改的地方都找得到目前版本,不寫檔
     node tools/bump-version.js              升一版:vN → vN+1
   做的事(與 2026-11 以前每次手動升版的步驟相同):
     1. 複製 shell/vN → shell/vN+1,app-version.js 與 index.html 的 <script src> 改成新版
     2. sw.js、netlify.toml、runtime-assets.json、.ai-manifest.json 與活文件的 shell/vN/ 路徑改成新版
     3. 文件裡「目前 vX 起」「目前為 vA–vC」的保留範圍往前推一版
     4. tests/trip-lifecycle-wiring.test.js:拿掉最舊一代的雜湊、加上 vN 的雜湊(vN 發布後就不可改)
     5. tests/theme-system.test.js:發布說明視窗(新版之外的四筆)往前推一版
     6. git rm 最舊的 shell(只保留最近三代,ADR 0019 增補段)
     7. BUILTIN 版本標記:沿用 vN 的離線種子內容,只換版本(tools/refresh-builtin-snapshot.js 的 API)
   不做的事:新版的發布說明內容與 07_CHANGELOG —— 那是要人寫的,腳本最後會提醒。 */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const T=require('./refresh-builtin-snapshot.js');
const PATH_FILES=['sw.js','netlify.toml','runtime-assets.json','.ai-manifest.json','01_PROJECT.md','02_ARCHITECTURE.md',
  '08_AI_HANDOVER.md','10_FOLDER_STRUCTURE.md','11_CODING_CONVENTION.md','14_FILE_TIERS_AND_GATE.md','16_OPS_PLAYBOOK.md','CONTEXT.md','README.md'];
const KEEP_FILES=['16_OPS_PLAYBOOK.md','tasks/current.md'];
const ADR='adr/0019-version-bound-generated-builtin-asset.md';
const WIRING='tests/trip-lifecycle-wiring.test.js',THEME='tests/theme-system.test.js';

function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function write(rel,text){fs.writeFileSync(path.join(root,rel),text);}
function currentVersion(){
  const m=/var SW_VERSION='v(\d+)';/.exec(read('sw.js'));
  if(!m)throw new Error('sw.js 找不到 SW_VERSION');
  return Number(m[1]);
}
function sha(rel){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');}
function plan(a){
  const b=a+1,keep=a-1,drop=a-2,problems=[];
  const need=(ok,message)=>{if(!ok)problems.push(message);};
  need(fs.existsSync(path.join(root,'shell/v'+a)),'shell/v'+a+' 不存在');
  need(!fs.existsSync(path.join(root,'shell/v'+b)),'shell/v'+b+' 已經存在');
  need(read('shell/v'+a+'/app-version.js').includes("'v"+a+"'"),'shell/v'+a+'/app-version.js 不是 v'+a);
  need(read('shell/v'+a+'/index.html').includes('<script src="shell/v'+a+'/'),'shell/v'+a+'/index.html 的 <script src> 不是 v'+a);
  PATH_FILES.forEach(rel=>need(read(rel).includes('shell/v'+a+'/'),rel+' 沒有 shell/v'+a+'/'));
  /* 保留範圍的文字不比對舊值,直接改寫成正確範圍(2026-11-21 發現舊腳本從 v203 起漏改,文件停在 v200) */
  KEEP_FILES.forEach(rel=>need(/目前 v\d+ 起/.test(read(rel)),rel+' 沒有「目前 vN 起」'));
  need(/目前為 v\d+–v\d+/.test(read(ADR)),ADR+' 沒有「目前為 vA–vC」');
  need(new RegExp("'shell/v"+drop+"/index\\.html': '[0-9a-f]+'").test(read(WIRING)),WIRING+' 沒有 shell/v'+drop+' 的雜湊');
  need(/\['v\d+','v\d+','v\d+','v\d+'\]/.test(read(THEME)),THEME+' 找不到發布說明視窗');
  return {a,b,keep,drop,problems};
}
function bump(p){
  const {a,b,keep,drop}=p,src='shell/v'+a,dst='shell/v'+b;
  fs.cpSync(path.join(root,src),path.join(root,dst),{recursive:true});
  write(dst+'/app-version.js',read(dst+'/app-version.js').split('v'+a).join('v'+b));
  write(dst+'/index.html',read(dst+'/index.html').split('<script src="shell/v'+a+'/').join('<script src="shell/v'+b+'/'));
  PATH_FILES.forEach(rel=>write(rel,read(rel).split('shell/v'+a+'/').join('shell/v'+b+'/').split("SW_VERSION='v"+a+"'").join("SW_VERSION='v"+b+"'")));
  KEEP_FILES.forEach(rel=>write(rel,read(rel).replace(/目前 v\d+ 起/g,'目前 v'+keep+' 起')));
  write(ADR,read(ADR).replace(/目前為 v\d+–v\d+/g,'目前為 v'+keep+'–v'+b));
  let wiring=read(WIRING);
  wiring=wiring.replace(new RegExp("  'shell/v"+drop+"/index\\.html': '[0-9a-f]+',\\n  'shell/v"+drop+"/app-version\\.js': '[0-9a-f]+',\\n  'shell/v"+drop+"/builtin-snapshot\\.js': '[0-9a-f]+',\\n"),'');
  const anchor=new RegExp("  'shell/v"+keep+"/builtin-snapshot\\.js': '[0-9a-f]+',\\n").exec(wiring);
  if(!anchor)throw new Error(WIRING+' 找不到 shell/v'+keep+' 的雜湊');
  const added=['index.html','app-version.js','builtin-snapshot.js'].map(file=>"  '"+src+"/"+file+"': '"+sha(src+'/'+file)+"',\n").join('');
  write(WIRING,wiring.slice(0,anchor.index+anchor[0].length)+added+wiring.slice(anchor.index+anchor[0].length));
  let theme=read(THEME);
  const m=/\['v(\d+)','v\d+','v\d+','v\d+'\]/.exec(theme),top=Number(m[1])+1;
  write(THEME,theme.replace(m[0],'['+[0,1,2,3].map(i=>"'v"+(top-i)+"'").join(',')+']'));
  cp.execFileSync('git',['rm','-r','-q','shell/v'+drop],{cwd:root});
  /* BUILTIN:沿用 vN 的離線種子,只換版本標記 */
  const prev=T.readBuiltinAsset(read(src+'/builtin-snapshot.js'));
  const index=T.replaceBuiltinMarker(T.stripEmbeddedBuiltin(read(dst+'/index.html')),'v'+b,prev.timestamp);
  const asset=T.serializeBuiltinAsset({timestamp:prev.timestamp,snapshot:prev.snapshot},'v'+b);
  const check=T.readBuiltinAsset(asset);
  const changed=T.SNAPSHOT_KEYS.filter(key=>check.snapshot[key]!==prev.snapshot[key]);
  if(changed.length)throw new Error('BUILTIN 內容不該改變：'+changed.join(','));
  write(dst+'/index.html',index);write(dst+'/builtin-snapshot.js',asset);
}
function main(){
  const args=process.argv.slice(2),a=currentVersion(),p=plan(a);
  if(p.problems.length){console.error('無法從 v'+a+' 升到 v'+(a+1)+'：\n- '+p.problems.join('\n- '));process.exit(1);}
  if(args.includes('--check')){console.log('bump check ok: v'+a+' → v'+(a+1)+'(會刪除 shell/v'+p.drop+')');return;}
  bump(p);
  console.log('已升到 v'+p.b+'(刪除 shell/v'+p.drop+')。還要手動做:\n'+
    '  1. shell/v'+p.b+'/index.html 的 APP_RELEASE_NOTES 最上面加 v'+p.b+' 一筆、刪掉最舊一筆(保留 5 筆)\n'+
    '  2. 07_CHANGELOG.md 寫這一版\n'+
    '  3. node tools/check-app-version.js 與 tests/*.test.js 全跑一次');
}
if(require.main===module)main();
module.exports={plan,currentVersion};
