'use strict';

const fs=require('fs');
const path=require('path');

function read(rootDir,name,errors){
  try{return fs.readFileSync(path.join(rootDir,name),'utf8');}
  catch(error){errors.push('required registry source is missing or unreadable: '+name);return '';}
}
function manifestCovers(section,asset){
  return section&&typeof section==='object'&&!Array.isArray(section)&&
    Object.keys(section).some(key=>key.split(/\s*\+\s*/).includes(asset));
}
function validateRuntimeAssets(options={}){
  const rootDir=path.resolve(options.rootDir||path.join(__dirname,'..'));
  const inventory=options.inventory&&typeof options.inventory==='object'?options.inventory:{};
  const assets=Array.isArray(inventory.assets)?inventory.assets.slice():[];
  const errors=[];
  const seen=new Set();
  if(!Array.isArray(inventory.assets))errors.push('runtime-assets.json must contain an assets array');
  assets.forEach(asset=>{
    if(typeof asset!=='string'||!asset.trim())errors.push('runtime-assets.json contains an invalid asset');
    else{
      if(seen.has(asset))errors.push('runtime-assets.json has duplicate asset: '+asset);
      seen.add(asset);
      if(!asset.endsWith('.js'))errors.push('runtime-assets.json asset is not JavaScript: '+asset);
      if(!fs.existsSync(path.join(rootDir,asset)))errors.push('runtime asset file is missing: '+asset);
    }
  });

  const serviceWorker=read(rootDir,'sw.js',errors);
  const swVersion=(/var SW_VERSION='([^']+)'/.exec(serviceWorker)||[])[1];
  const index=read(rootDir,swVersion?'shell/'+swVersion+'/index.html':'index.html',errors);
  const readme=read(rootDir,'README.md',errors);
  const shellMatch=/var\s+SHELL\s*=\s*\[([\s\S]*?)\];/.exec(serviceWorker);
  const shell=shellMatch?shellMatch[1]:'';
  if(!shellMatch)errors.push('sw.js SHELL array is missing');
  let manifest={};
  try{manifest=JSON.parse(read(rootDir,'.ai-manifest.json',errors)||'{}');}
  catch(error){errors.push('.ai-manifest.json is not valid JSON');}

  assets.forEach(asset=>{
    const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const scriptPattern=new RegExp('<script\\s+[^>]*src=["\'][^"\']*'+escaped+'["\'][^>]*>','i');
    const embeddedPattern=new RegExp('/\\*\\s*=+\\s*'+escaped.replace(/\\\./g,'\\.')+'(?:\\(|\\s|=)','i');
    if(!scriptPattern.test(index)&&!embeddedPattern.test(index))errors.push('index.html does not reference runtime asset: '+asset);
    if(!(new RegExp('["\']\\./'+escaped+'["\']')).test(shell))errors.push('sw.js SHELL does not include runtime asset: '+asset);
    if(!readme.includes('`'+asset+'`'))errors.push('README.md does not document runtime asset: '+asset);
    if(!manifestCovers(manifest.files,asset))errors.push('.ai-manifest.json files does not cover runtime asset: '+asset);
    if(!manifestCovers(manifest.deploy_files,asset))errors.push('.ai-manifest.json deploy_files does not cover runtime asset: '+asset);
  });
  return {ok:errors.length===0,errors:errors,assets:assets};
}

if(require.main===module){
  const rootDir=path.resolve(__dirname,'..');
  let inventory={};
  try{inventory=JSON.parse(fs.readFileSync(path.join(rootDir,'runtime-assets.json'),'utf8'));}
  catch(error){console.error('runtime-assets.json is missing or invalid');process.exitCode=1;}
  if(!process.exitCode){
    const result=validateRuntimeAssets({rootDir,inventory});
    if(result.ok)console.log('runtime asset inventory valid ('+result.assets.length+' assets)');
    else{result.errors.forEach(error=>console.error(error));process.exitCode=1;}
  }
}

module.exports={validateRuntimeAssets};
