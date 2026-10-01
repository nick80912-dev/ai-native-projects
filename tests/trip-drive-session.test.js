const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function fixture(){
  let now=1000,next=0,grants=0,fetchMode='ok';const timers=new Map(),pending=[];
  const context={module:{exports:{}},Promise,Date:{now:()=>now},setTimeout(fn,ms){const id=++next;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync('trip-drive.js','utf8'),context);
  const client=context.module.exports.createClient({clientId:'qa-client',requestAccessToken(){grants++;return new Promise(resolve=>pending.push(resolve));},fetch(url){
    if(fetchMode==='hang')return new Promise(()=>{});
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(url.includes('/about')?{user:{permissionId:'one',emailAddress:'one@example.com'}}:{files:[]})});
  }});
  return {client,pending,get grants(){return grants;},setFetch(mode){fetchMode=mode;},async tick(ms){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}for(let i=0;i<12;i++)await Promise.resolve();},grant(){pending.shift()({access_token:'qa-token',expires_in:3600});}};
}
(async()=>{
  const f=fixture();const initial=f.client.connect();f.grant();await initial;
  assert.equal(typeof f.client.resume,'function','viewer can resume a valid in-memory session');
  await f.client.resume();assert.equal(f.grants,1,'re-entry must not request Google consent again');
  f.client.cancelConnect();await f.client.resume();assert.equal(f.grants,1,'leaving a viewer preserves completed authorization');
  await f.tick(3600000);const renewed=f.client.resume();assert.equal(f.grants,2,'expired session requests fresh authorization');f.grant();await renewed;
  f.client.disconnect();const afterLogout=f.client.resume();assert.equal(f.grants,3,'disconnect removes reusable authorization');f.grant();await afterLogout;

  const h=fixture();const hanging=h.client.connect();const timeout=assert.rejects(hanging,/authorization.*timed out/i);
  await h.tick(90000);await timeout;h.grant();await h.tick(0);assert.equal(h.client.account(),null,'late grant after timeout cannot establish a session');
  const retry=h.client.connect();h.grant();await retry;assert.equal(h.client.account().accountId,'one');
  h.setFetch('hang');const read=h.client.listComplete();await h.tick(0);const readTimeout=assert.rejects(read,/Drive.*timed out/i);await h.tick(20000);await readTimeout;

  const c=fixture();const pending=c.client.connect();const cancelled=assert.rejects(pending,/cancel/i);c.client.cancelConnect();await cancelled;c.grant();await c.tick(0);assert.equal(c.client.account(),null,'cancelled grant never becomes a session');
  console.log('Drive session reuse, cancellation and timeout tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
