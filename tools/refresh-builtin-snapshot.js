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

function rowsEqual(actual,expected){
  return actual.length===expected.length&&actual.every((value,index)=>value===expected[index]);
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
    if(!rows.length||!rowsEqual(rows[0],headersFor(schema.sheets[key])))throw new Error(key+' CSV header does not match schema.js');
  });

  const itinRows=parseCsv(candidate.itin);
  const itinHeaders=headersFor(schema.sheets.itin);
  const itinHeaderCount=itinRows.filter(row=>rowsEqual(row,itinHeaders)).length;
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
  return /var BUILTIN_TS\s*=\s*(\d+);\s*\r?\nvar BUILTIN\s*=\s*(\{[\s\S]*?\});\s*\r?\n/;
}

function readEmbeddedBuiltin(indexSource){
  const match=builtinPattern().exec(indexSource);
  if(!match)throw new Error('index.html BUILTIN declarations are missing or ambiguous');
  return {timestamp:Number(match[1]),snapshot:JSON.parse(match[2])};
}

function orderedSnapshot(candidate){
  const ordered={};
  SNAPSHOT_KEYS.forEach(key=>{ordered[key]=candidate[key];});
  return ordered;
}

function replaceEmbeddedBuiltin(indexSource,timestamp,candidate){
  const pattern=builtinPattern();
  if(!pattern.test(indexSource))throw new Error('index.html BUILTIN declarations are missing or ambiguous');
  const replacement='var BUILTIN_TS = '+timestamp+';\nvar BUILTIN = '+JSON.stringify(orderedSnapshot(candidate))+';\n';
  return indexSource.replace(pattern,replacement);
}

function writeLine(stream,message){
  if(stream&&typeof stream.write==='function')stream.write(String(message)+'\n');
}

function atomicReplace(indexPath,nextSource,expected){
  const original=fs.readFileSync(indexPath);
  const tempPath=indexPath+'.builtin-refresh-'+process.pid+'-'+Date.now()+'.tmp';
  try{
    fs.writeFileSync(tempPath,nextSource,'utf8');
    fs.renameSync(tempPath,indexPath);
    const verified=readEmbeddedBuiltin(fs.readFileSync(indexPath,'utf8'));
    assertSnapshotsEqual(verified.snapshot,expected.snapshot);
    if(verified.timestamp!==expected.timestamp)throw new Error('BUILTIN timestamp verification failed');
  }catch(error){
    try{if(fs.existsSync(tempPath))fs.unlinkSync(tempPath);}catch(ignore){}
    try{
      const current=fs.existsSync(indexPath)?fs.readFileSync(indexPath):null;
      if(!current||!current.equals(original))fs.writeFileSync(indexPath,original);
    }catch(restoreError){error.message+='; rollback failed: '+restoreError.message;}
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
    const indexSource=fs.readFileSync(indexPath,'utf8');
    const embedded=readEmbeddedBuiltin(indexSource);
    const changedKeys=SNAPSHOT_KEYS.filter(key=>embedded.snapshot[key]!==candidate[key]);
    if(!changedKeys.length){writeLine(stdout,'BUILTIN snapshot already matches the approved Sheet data');return {exitCode:0,changedKeys,candidate};}
    writeLine(stdout,'BUILTIN drift: '+changedKeys.join(', '));
    writeLine(stdout,'legacy Tokyo in current='+String(embedded.snapshot.itin.includes('東京')||embedded.snapshot.itin.includes('新宿'))+', candidate='+String(candidate.itin.includes('東京')||candidate.itin.includes('新宿')));
    if(!options.write)return {exitCode:2,changedKeys,candidate};
    const timestamp=Number((options.now||Date.now)());
    const nextSource=replaceEmbeddedBuiltin(indexSource,timestamp,candidate);
    atomicReplace(indexPath,nextSource,{timestamp,snapshot:candidate});
    writeLine(stdout,'BUILTIN snapshot refreshed: '+changedKeys.join(', '));
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
  readEmbeddedBuiltin,
  replaceEmbeddedBuiltin,
  runRefresh,
  parseArgs
};
