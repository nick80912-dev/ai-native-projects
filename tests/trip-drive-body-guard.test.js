const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

(async()=>{
  const timers=new Set();let textResolve,jsonResolve,writes=0;
  const context={module:{exports:{}},Promise,Date,setTimeout(fn){timers.add(fn);return fn;},clearTimeout(fn){timers.delete(fn);}};
  vm.runInNewContext(fs.readFileSync('trip-drive.js','utf8'),context);
  let mode='normal';
  const client=context.module.exports.createClient({clientId:'qa-client',requestAccessToken:()=>Promise.resolve({access_token:'token',expires_in:3600}),fetch(url,options){
    if(options.method!=='GET'){writes++;return Promise.reject(new Error('Unexpected write'));}
    let body=url.includes('/about')?{user:{permissionId:'one',emailAddress:'one@example.com'}}:{files:[]};
    if(mode==='notes'&&url.includes('/files?'))body={files:[{id:'note-1',appProperties:{trippilot_status:'complete'}}]};
    return Promise.resolve({ok:true,status:200,json:()=>mode==='delayed-list'&&url.includes('/files?')?new Promise(resolve=>{jsonResolve=resolve;}):Promise.resolve(body),text:()=>new Promise(resolve=>{textResolve=resolve;})});
  }});
  await client.connect();mode='delayed-list';
  const write=client.upsertPrepared('archive-1','{"archiveId":"archive-1","sourceSheetId":"sheet-1"}');
  for(let i=0;i<15;i++)await Promise.resolve();assert.equal(typeof jsonResolve,'function');
  client.cancelConnect();const rejected=assert.rejects(write,/cancel|stale/i);mode='normal';jsonResolve({files:[]});await rejected;
  assert.equal(writes,0,'closing during list body consumption must prevent later folder/upload writes');

  mode='notes';const notes=client.listNotes('archive-1');
  for(let i=0;i<25;i++)await Promise.resolve();assert.equal(typeof textResolve,'function');
  let verdict='pending';const handled=notes.then(()=>{verdict='resolved';},error=>{verdict=error.message;});
  for(const timer of [...timers])timer();for(let i=0;i<15;i++)await Promise.resolve();
  assert.match(verdict,/Drive.*timed out/i,'stalled note response body must stop loading');await handled;
  textResolve('{}');
  console.log('Drive body cancellation and timeout guards passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
