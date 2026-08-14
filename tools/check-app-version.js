'use strict';

const fs=require('fs');

const HELPER_OPEN='/* ---- APP_VERSION SAFE ACCESS (C2) ----';
const HELPER_CLOSE='/* ---- /APP_VERSION SAFE ACCESS ---- */';

function checkVersionIntegrity(sources){
  const errors=[];
  const fail=message=>errors.push(message);
  const appSource=String(sources.appVersion||'');
  const sw=String(sources.sw||'');
  const asset=String(sources.asset||'');
  const index=String(sources.index||'');
  const netlify=String(sources.netlify||'');

  const appMatch=/^var APP_VERSION='([^']+)';\s*$/.exec(appSource);
  const swMatch=/^var SW_VERSION='([^']+)';$/m.exec(sw);
  const assetMatch=/^var BUILTIN_TS=(\d+);\r?\nvar BUILTIN_ASSET_VERSION='([^']+)';/m.exec(asset);
  const htmlMatches=index.match(/<script id="builtinSnapshotMarker">var BUILTIN_HTML_VERSION='([^']+)';var BUILTIN_HTML_TS=(\d+);<\/script>/g)||[];
  const htmlMatch=htmlMatches.length===1&&/<script id="builtinSnapshotMarker">var BUILTIN_HTML_VERSION='([^']+)';var BUILTIN_HTML_TS=(\d+);<\/script>/.exec(htmlMatches[0]);

  if(!appMatch)fail("app-version.js must be one line: var APP_VERSION='vNN';");
  if(!swMatch)fail("sw.js is missing var SW_VERSION='vNN';");
  if(!assetMatch)fail('builtin-snapshot.js is missing a valid timestamp/version header');
  if(!htmlMatch)fail('index.html must contain exactly one runtime BUILTIN marker');

  const identities=[
    ['App',appMatch&&appMatch[1]],
    ['SW',swMatch&&swMatch[1]],
    ['BUILTIN asset',assetMatch&&assetMatch[2]],
    ['HTML',htmlMatch&&htmlMatch[1]]
  ].filter(entry=>entry[1]);
  if(identities.length>1){
    const expected=identities[0][1];
    identities.slice(1).forEach(([label,value])=>{if(value!==expected)fail(label+' version '+value+' does not match App '+expected);});
  }
  if(assetMatch&&htmlMatch&&Number(assetMatch[1])!==Number(htmlMatch[2]))fail('HTML marker timestamp does not match builtin-snapshot.js');

  if(sw&&!/var CACHE_NAME='okayama-trip-'\+SW_VERSION;/.test(sw))fail('sw.js CACHE_NAME must derive from SW_VERSION');
  if(/importScripts\(/.test(sw))fail('sw.js must not import a separately cached version source');
  const swCode=sw.replace(/\/\*[\s\S]*?\*\//g,'');
  if(/\bAPP_VERSION\b(?!\s*=\s*')/.test(swCode))fail('sw.js code must not reference APP_VERSION outside the response-version parser');

  const helperStart=index.indexOf(HELPER_OPEN);
  const helperEnd=index.indexOf(HELPER_CLOSE,helperStart);
  if(helperStart<0||helperEnd<=helperStart)fail('index.html is missing the APP_VERSION safe-access block');
  else{
    const helper=index.slice(helperStart,helperEnd);
    if(!/function appVersion\(\)\{/.test(helper))fail('index.html is missing appVersion()');
    if(!/function appVersionLabel\(\)\{/.test(helper))fail('index.html is missing appVersionLabel()');
    const outside=index.slice(0,helperStart)+index.slice(helperEnd+HELPER_CLOSE.length);
    const bare=(outside.match(/\bAPP_VERSION\b/g)||[]).length;
    if(bare)fail('index.html has '+bare+' unsafe APP_VERSION reference(s)');
  }

  const notes=/var APP_RELEASE_NOTES=\[\s*\{version:'([^']+)'/.exec(index);
  if(!notes)fail('index.html is missing APP_RELEASE_NOTES');
  else if(appMatch&&notes[1]!==appMatch[1])fail('APP_RELEASE_NOTES latest version does not match App');
  if(netlify&&!/for = "\/shell\/v\d+\/app-version\.js"/.test(netlify))fail('netlify.toml is missing current immutable app-version.js cache control');
  return errors;
}

function readSources(rootDir='.'){
  const read=file=>fs.existsSync(rootDir+'/'+file)?fs.readFileSync(rootDir+'/'+file,'utf8'):'';
  const sw=read('sw.js');
  const swMatch=/^var SW_VERSION='([^']+)';$/m.exec(sw);
  const generationRoot=swMatch?'shell/'+swMatch[1]+'/':'';
  return {
    appVersion:read(generationRoot+'app-version.js'),sw:sw,asset:read(generationRoot+'builtin-snapshot.js'),
    index:read(generationRoot+'index.html'),netlify:read('netlify.toml')
  };
}

function run(rootDir='.'){
  const errors=checkVersionIntegrity(readSources(rootDir));
  if(errors.length){
    console.error('App Shell version integrity failed ('+errors.length+'):');
    errors.forEach(error=>console.error('  - '+error));
    return 1;
  }
  const match=/APP_VERSION='([^']+)'/.exec(readSources(rootDir).appVersion);
  console.log('App Shell version integrity passed ('+(match&&match[1]||'unknown')+')');
  return 0;
}

if(require.main===module)process.exitCode=run(process.cwd());

module.exports={checkVersionIntegrity,readSources,run};
