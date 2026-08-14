'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');

const SNAPSHOT_KEYS=['itin','places','rest','shop','hotels','exp','ledger','cfg'];
const REMOTE_KEYS=['itin','places','rest','shop','hotels','exp','cfg'];
const DAY_LABELS=['第一天','第二天','第三天','第四天','第五天','第六天'];

function parseCsv(text){
  const rows=[];
  let row=[],field='',quoted=false;
  const source=String(text||'');
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(quoted){
      if(char==='"'&&source[i+1]==='"'){field+='"';i++;}
      else if(char==='"')quoted=false;
      else field+=char;
    }else if(char==='"')quoted=true;
    else if(char===','){row.push(field);field='';}
    else if(char==='\n'){
      row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';
    }else field+=char;
  }
  if(quoted)throw new Error('CSV has an unterminated quoted field');
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  return rows;
}

function loadSchema(schemaPath){
  const source=fs.readFileSync(schemaPath,'utf8');
  const sandbox=Object.create(null);
  vm.runInNewContext(source,sandbox,{filename:schemaPath,timeout:1000});
  const schema=sandbox.SCHEMA;
  if(!schema||typeof schema!=='object'||!schema.pubBase||!schema.sheets)throw new Error('schema.js does not expose a valid SCHEMA');
  SNAPSHOT_KEYS.forEach(key=>{if(!schema.sheets[key])throw new Error('SCHEMA is missing sheet: '+key);});
  return schema;
}

function buildLedgerHeader(schema){
  return schema.sheets.ledger.columns.map(column=>column.header).join(',')+'\n';
}

function headersFor(sheet){
  return (sheet.columns||[]).map(column=>String(column.header||''));
}

function rowMatchesSchema(actual,sheet){
  const columns=sheet.columns||[];
  return actual.length===columns.length&&actual.every((value,index)=>{
    const column=columns[index];
    return [column.header].concat(column.aliases||[]).some(header=>String(header||'')===value);
  });
}

function cfgValues(rows){
  const values=new Map();
  rows.forEach(row=>{
    const key=String(row[0]||'').trim();
    if(key)values.set(key,String(row[1]||'').trim());
  });
  return values;
}

function dateMarker(iso){
  const parts=String(iso||'').split('-');
  return parts.length===3?String(Number(parts[1]))+'/'+String(Number(parts[2])):'';
}

function validateBuiltinCandidate(options){
  const schema=options.schema,candidate=options.candidate;
  SNAPSHOT_KEYS.forEach(key=>{
    if(typeof candidate[key]!=='string'||!candidate[key].length)throw new Error(key+' CSV is empty');
  });

  ['places','rest','shop','hotels'].forEach(key=>{
    const rows=parseCsv(candidate[key]);
    if(!rows.length||!rowMatchesSchema(rows[0],schema.sheets[key]))throw new Error(key+' CSV header does not match schema.js');
  });

  const itinRows=parseCsv(candidate.itin);
  const itinHeaderCount=itinRows.filter(row=>rowMatchesSchema(row,schema.sheets.itin)).length;
  if(itinHeaderCount!==1)throw new Error('itin CSV must contain exactly one schema header row');

  const expenseMark=String(schema.sheets.exp.layout&&schema.sheets.exp.layout.membersRowMark||'').replace(/[：:]$/,'').trim();
  const expenseRows=parseCsv(candidate.exp);
  if(!expenseRows.some(row=>String(row[0]||'').replace(/[：:]$/,'').trim()===expenseMark))throw new Error('exp CSV is missing '+expenseMark+' marker');

  const cfgRows=parseCsv(candidate.cfg);
  const cfg=cfgValues(cfgRows);
  (schema.sheets.cfg.keys||[]).forEach(definition=>{
    if(!cfg.has(definition.header)||!cfg.get(definition.header))throw new Error('cfg CSV is missing '+definition.header);
  });
  const start=Date.parse(cfg.get('Start Date')+'T00:00:00Z');
  const end=Date.parse(cfg.get('End Date')+'T00:00:00Z');
  if(!Number.isFinite(start)||!Number.isFinite(end)||Math.round((end-start)/86400000)!==5)throw new Error('cfg trip range must cover the current six-day trip');
  DAY_LABELS.forEach((label,index)=>{
    const marker=label+dateMarker(new Date(start+index*86400000).toISOString().slice(0,10));
    if(!candidate.itin.includes(marker))throw new Error('itin CSV is missing '+marker);
  });
  if(candidate.itin.includes('東京')||candidate.itin.includes('新宿'))throw new Error('itin CSV still contains 東京 or 新宿 legacy data');

  if(candidate.ledger!==buildLedgerHeader(schema))throw new Error('ledger BUILTIN must contain only the schema-derived header');
  return candidate;
}

async function buildBuiltinCandidate(options){
  const candidate={};
  for(const key of SNAPSHOT_KEYS){
    candidate[key]=key==='ledger'
      ? buildLedgerHeader(options.schema)
      : await options.fetchCsv(key,options.schema.pubBase+options.schema.sheets[key].gid);
  }
  return validateBuiltinCandidate({schema:options.schema,candidate});
}

function builtinPattern(){
  return /var BUILTIN_TS\s*=\s*(\d+);\s*\r?\nvar BUILTIN\s*=\s*(\{[\s\S]*?\});\s*\r?\n(?:BUILTIN\.cfg\s*\+=[^\r\n]*;\s*\r?\n)?(?:BUILTIN\.ledger\s*=[^\r\n]*;\s*\r?\n)?/;
}

function readEmbeddedBuiltin(indexSource){
  const match=builtinPattern().exec(indexSource);
  if(!match)throw new Error('index.html BUILTIN declarations are missing or ambiguous');
  const sandbox=Object.create(null);
  vm.runInNewContext(match[0],sandbox,{filename:'index.html BUILTIN block',timeout:1000});
  return {timestamp:Number(sandbox.BUILTIN_TS),snapshot:JSON.parse(JSON.stringify(sandbox.BUILTIN))};
}

function orderedSnapshot(candidate){
  const ordered={};
  SNAPSHOT_KEYS.forEach(key=>{
    if(Object.prototype.hasOwnProperty.call(candidate,key))ordered[key]=candidate[key];
  });
  return ordered;
}

function serializeBuiltinAsset(candidate,appVersion){
  const timestamp=Number(candidate&&candidate.timestamp);
  const snapshot=candidate&&candidate.snapshot;
  const version=String(appVersion||'');
  if(!Number.isSafeInteger(timestamp)||timestamp<0)throw new Error('BUILTIN asset timestamp must be a non-negative safe integer');
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('BUILTIN asset snapshot is missing');
  if(!/^[0-9A-Za-z._-]+$/.test(version))throw new Error('BUILTIN asset version is invalid');
  return 'var BUILTIN_TS='+timestamp+';\n'+
    'var BUILTIN_ASSET_VERSION='+JSON.stringify(version).replace(/^"|"$/g,"'")+';\n'+
    'var BUILTIN='+JSON.stringify(orderedSnapshot(snapshot))+';\n';
}

function readBuiltinAsset(source){
  const match=/^var BUILTIN_TS=(\d+);\r?\nvar BUILTIN_ASSET_VERSION='([0-9A-Za-z._-]+)';\r?\nvar BUILTIN=(\{[^\r\n]*\});\r?\n?$/.exec(String(source||''));
  if(!match)throw new Error('BUILTIN asset format or version declaration is invalid');
  const timestamp=Number(match[1]);
  if(!Number.isSafeInteger(timestamp))throw new Error('BUILTIN asset timestamp is invalid');
  let snapshot;
  try{snapshot=JSON.parse(match[3]);}
  catch(error){throw new Error('BUILTIN asset snapshot JSON is invalid');}
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('BUILTIN asset snapshot is invalid');
  SNAPSHOT_KEYS.forEach(key=>{
    if(!Object.prototype.hasOwnProperty.call(snapshot,key))throw new Error('BUILTIN asset is missing sheet: '+key);
    if(typeof snapshot[key]!=='string'||!snapshot[key].length)throw new Error('BUILTIN asset sheet is empty: '+key);
  });
  Object.keys(snapshot).forEach(key=>{
    if(!SNAPSHOT_KEYS.includes(key))throw new Error('BUILTIN asset has unexpected sheet: '+key);
  });
  if(snapshot.ledger.trim().split(/\r?\n/).length!==1)throw new Error('BUILTIN asset Ledger must be header-only');
  return {timestamp:timestamp,appVersion:match[2],snapshot:orderedSnapshot(snapshot)};
}

function replaceEmbeddedBuiltin(indexSource,timestamp,candidate){
  const pattern=builtinPattern();
  if(!pattern.test(indexSource))throw new Error('index.html BUILTIN declarations are missing or ambiguous');
  const replacement='var BUILTIN_TS = '+timestamp+';\nvar BUILTIN = '+JSON.stringify(orderedSnapshot(candidate))+';\n';
  return indexSource.replace(pattern,replacement);
}

function stripEmbeddedBuiltin(indexSource){
  return builtinPattern().test(indexSource)
    ? indexSource.replace(builtinPattern(),'/* BUILTIN payload is generated in builtin-snapshot.js. */\n')
    : indexSource;
}

function readAppVersion(source){
  const match=/var\s+APP_VERSION\s*=\s*'([0-9A-Za-z._-]+)'\s*;/.exec(String(source||''));
  if(!match)throw new Error('app-version.js does not expose a valid APP_VERSION');
  return match[1];
}

function builtinMarkerPattern(){
  return /<script id="builtinSnapshotMarker">var BUILTIN_HTML_VERSION='([0-9A-Za-z._-]+)';var BUILTIN_HTML_TS=(\d+);<\/script>/;
}

function readBuiltinMarker(indexSource){
  const matches=String(indexSource||'').match(new RegExp(builtinMarkerPattern().source,'g'))||[];
  if(matches.length!==1)throw new Error('index.html BUILTIN snapshot marker is missing or ambiguous');
  const parsed=builtinMarkerPattern().exec(matches[0]);
  return {appVersion:parsed[1],timestamp:Number(parsed[2])};
}

function replaceBuiltinMarker(indexSource,appVersion,timestamp){
  const marker='<script id="builtinSnapshotMarker">var BUILTIN_HTML_VERSION=\''+appVersion+'\';var BUILTIN_HTML_TS='+timestamp+';</script>';
  const anchor='<script src="builtin-snapshot.js"></script>';
  let source=String(indexSource||'')
    .replace(/<script\s+id=["']builtinSnapshotMarker["'][^>]*>[\s\S]*?<\/script>\s*/gi,'')
    .replace(/<!--\s*BUILTIN_SNAPSHOT\s+app=[^\s>]+\s+ts=\d+\s*-->\s*/gi,'');
  const anchors=source.split(anchor).length-1;
  if(anchors!==1)throw new Error('index.html must contain exactly one builtin-snapshot.js bootstrap anchor');
  return source.replace(anchor,marker+'\n'+anchor);
}

function writeLine(stream,message){
  if(stream&&typeof stream.write==='function')stream.write(String(message)+'\n');
}

function writeSyncedFile(target,content){
  const descriptor=fs.openSync(target,'w');
  try{
    fs.writeFileSync(descriptor,content);
    fs.fsyncSync(descriptor);
  }finally{fs.closeSync(descriptor);}
}

function restoreOriginal(target,original,token){
  if(original===null){
    if(fs.existsSync(target))fs.unlinkSync(target);
    return;
  }
  const restore=target+'.builtin-refresh-'+token+'.restore';
  try{
    writeSyncedFile(restore,original);
    fs.renameSync(restore,target);
  }finally{
    if(fs.existsSync(restore))fs.unlinkSync(restore);
  }
}

function atomicReplacePair(options){
  const indexPath=path.resolve(options.indexPath),assetPath=path.resolve(options.assetPath);
  if(path.dirname(indexPath)!==path.dirname(assetPath))throw new Error('BUILTIN pair targets must share a directory');
  const token=process.pid+'-'+Date.now()+'-'+Math.random().toString(16).slice(2);
  const indexTemp=indexPath+'.builtin-refresh-'+token+'.tmp';
  const assetTemp=assetPath+'.builtin-refresh-'+token+'.tmp';
  const originalIndex=fs.existsSync(indexPath)?fs.readFileSync(indexPath):null;
  const originalAsset=fs.existsSync(assetPath)?fs.readFileSync(assetPath):null;
  try{
    writeSyncedFile(indexTemp,options.indexSource);
    writeSyncedFile(assetTemp,options.assetSource);
    options.verifyIndex(fs.readFileSync(indexTemp,'utf8'));
    options.verifyAsset(fs.readFileSync(assetTemp,'utf8'));
    fs.renameSync(assetTemp,assetPath);
    if(options.beforeSecondRename)options.beforeSecondRename();
    fs.renameSync(indexTemp,indexPath);
    options.verifyAsset(fs.readFileSync(assetPath,'utf8'));
    options.verifyIndex(fs.readFileSync(indexPath,'utf8'));
  }catch(error){
    try{if(fs.existsSync(indexTemp))fs.unlinkSync(indexTemp);}catch(ignore){}
    try{if(fs.existsSync(assetTemp))fs.unlinkSync(assetTemp);}catch(ignore){}
    const restore=options.restoreOriginal||restoreOriginal;
    const restoreErrors=[];
    function restoreAndVerify(target,original,suffix){
      try{
        restore(target,original,token+'-'+suffix);
        const exists=fs.existsSync(target);
        if(original===null&&exists)throw new Error(path.basename(target)+' should be absent after rollback');
        if(original!==null&&(!exists||!fs.readFileSync(target).equals(original)))throw new Error(path.basename(target)+' bytes differ after rollback');
      }catch(restoreError){restoreErrors.push(path.basename(target)+': '+restoreError.message);}
    }
    restoreAndVerify(assetPath,originalAsset,'asset');
    restoreAndVerify(indexPath,originalIndex,'index');
    if(restoreErrors.length)error.message+='; rollback failed: '+restoreErrors.join('; ');
    throw error;
  }
}

function assertSnapshotsEqual(actual,expected){
  if(JSON.stringify(orderedSnapshot(actual))!==JSON.stringify(orderedSnapshot(expected)))throw new Error('BUILTIN snapshot verification failed');
}

async function defaultFetchCsv(schema,key,url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Number(schema.fetchTimeoutMs)||10000);
  try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error(key+' HTTP '+response.status);
    return (await response.text()).replace(/^\uFEFF/,'');
  }finally{clearTimeout(timeout);}
}

async function runRefresh(options={}){
  const rootDir=path.resolve(options.rootDir||path.join(__dirname,'..'));
  const stdout=options.stdout||process.stdout,stderr=options.stderr||process.stderr;
  try{
    const schema=loadSchema(path.join(rootDir,'schema.js'));
    const fetchCsv=options.fetchCsv||((key,url)=>defaultFetchCsv(schema,key,url));
    const candidate=await buildBuiltinCandidate({schema,fetchCsv});
    const indexPath=path.join(rootDir,'index.html');
    const assetPath=path.join(rootDir,'builtin-snapshot.js');
    const indexSource=fs.readFileSync(indexPath,'utf8');
    const appVersion=readAppVersion(fs.readFileSync(path.join(rootDir,'app-version.js'),'utf8'));
    const embedded=builtinPattern().test(indexSource)?readEmbeddedBuiltin(indexSource):null;
    let asset=null,assetError=null,marker=null,markerError=null;
    try{asset=readBuiltinAsset(fs.readFileSync(assetPath,'utf8'));}
    catch(error){assetError=error;}
    try{marker=readBuiltinMarker(indexSource);}
    catch(error){markerError=error;}
    const currentSnapshot=asset&&asset.snapshot||embedded&&embedded.snapshot||{};
    const changedKeys=SNAPSHOT_KEYS.filter(key=>currentSnapshot[key]!==candidate[key]);
    const assetSnapshotMatches=!!asset&&SNAPSHOT_KEYS.every(key=>asset.snapshot[key]===candidate[key]);
    const structuralDrift=[];
    if(assetError)structuralDrift.push(fs.existsSync(assetPath)?'generated asset invalid':'generated asset missing');
    else{
      if(asset.appVersion!==appVersion)structuralDrift.push('generated asset version mismatch');
      if(!assetSnapshotMatches)structuralDrift.push('generated asset snapshot stale');
    }
    if(markerError)structuralDrift.push('HTML marker missing');
    else{
      if(marker.appVersion!==appVersion)structuralDrift.push('HTML marker version mismatch');
      if(asset&&marker.timestamp!==asset.timestamp)structuralDrift.push('HTML marker timestamp mismatch');
    }
    if(embedded)structuralDrift.push('duplicate inline payload');
    if(!changedKeys.length&&!structuralDrift.length){writeLine(stdout,'BUILTIN snapshot already matches the approved Sheet data');return {exitCode:0,changedKeys,candidate};}
    writeLine(stdout,'BUILTIN drift: '+(changedKeys.length?changedKeys.join(', '):structuralDrift.join(', ')));
    changedKeys.forEach(key=>writeLine(stdout,key+': '+String(currentSnapshot[key]||'').length+' -> '+candidate[key].length+' chars'));
    structuralDrift.forEach(reason=>writeLine(stdout,'structure: '+reason));
    writeLine(stdout,'legacy Tokyo in current='+String(String(currentSnapshot.itin||'').includes('東京')||String(currentSnapshot.itin||'').includes('新宿'))+', candidate='+String(candidate.itin.includes('東京')||candidate.itin.includes('新宿')));
    if(!options.write)return {exitCode:2,changedKeys,candidate};
    const timestamp=!changedKeys.length&&asset&&asset.timestamp?asset.timestamp:Number((options.now||Date.now)());
    const nextSource=replaceBuiltinMarker(stripEmbeddedBuiltin(indexSource),appVersion,timestamp);
    const nextAsset=serializeBuiltinAsset({timestamp:timestamp,snapshot:candidate},appVersion);
    function verifyAsset(source){
      const verified=readBuiltinAsset(source);
      assertSnapshotsEqual(verified.snapshot,candidate);
      if(verified.timestamp!==timestamp)throw new Error('BUILTIN asset timestamp verification failed');
      if(verified.appVersion!==appVersion)throw new Error('BUILTIN asset version verification failed');
    }
    function verifyIndex(source){
      const verifiedMarker=readBuiltinMarker(source);
      if(builtinPattern().test(source))throw new Error('index.html still contains a duplicate BUILTIN payload');
      if(verifiedMarker.timestamp!==timestamp)throw new Error('BUILTIN timestamp verification failed');
      if(verifiedMarker.appVersion!==appVersion)throw new Error('BUILTIN marker version verification failed');
    }
    atomicReplacePair({indexPath:indexPath,assetPath:assetPath,indexSource:nextSource,assetSource:nextAsset,verifyIndex:verifyIndex,verifyAsset:verifyAsset,beforeSecondRename:options.beforeSecondRename});
    writeLine(stdout,'BUILTIN snapshot refreshed: '+(changedKeys.length?changedKeys.join(', '):structuralDrift.join(', ')));
    return {exitCode:0,changedKeys,candidate};
  }catch(error){
    writeLine(stderr,'BUILTIN refresh failed: '+error.message);
    return {exitCode:1,changedKeys:[],candidate:null,error};
  }
}

function parseArgs(args){
  if(!args.length)return {write:false};
  if(args.length===1&&args[0]==='--write')return {write:true};
  throw new Error('Usage: node tools/refresh-builtin-snapshot.js [--write]');
}

if(require.main===module){
  let args;
  try{args=parseArgs(process.argv.slice(2));}
  catch(error){console.error(error.message);process.exitCode=1;}
  if(args)runRefresh(args).then(result=>{process.exitCode=result.exitCode;});
}

module.exports={
  SNAPSHOT_KEYS,
  REMOTE_KEYS,
  parseCsv,
  loadSchema,
  buildLedgerHeader,
  buildBuiltinCandidate,
  validateBuiltinCandidate,
  serializeBuiltinAsset,
  readBuiltinAsset,
  readEmbeddedBuiltin,
  replaceEmbeddedBuiltin,
  stripEmbeddedBuiltin,
  readAppVersion,
  readBuiltinMarker,
  replaceBuiltinMarker,
  atomicReplacePair,
  runRefresh,
  parseArgs
};
