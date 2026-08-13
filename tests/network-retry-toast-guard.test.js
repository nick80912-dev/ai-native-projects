const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();
const fetchSheetSource=extractFunction(html,'fetchSheet');
const toastSource=extractFunction(html,'toast');

function response(text){
  return {ok:true,status:200,text(){return Promise.resolve(text);}};
}

function loadFetchSheet(steps){
  const events=[];
  let attempts=0;
  const sandbox={
    PUB:'https://example.test/?gid=',
    FETCH_TIMEOUT:5000,
    Promise,
    fetchWithTimeout(){
      attempts++;
      events.push('fetch:'+attempts);
      return steps[attempts-1]();
    },
    AppLog:{sync(message){events.push('log:'+message);}},
    setTimeout(callback,delay){events.push('delay:'+delay);callback();return 1;}
  };
  vm.createContext(sandbox);
  vm.runInContext(fetchSheetSource,sandbox);
  return {fetchSheet:sandbox.fetchSheet,events,get attempts(){return attempts;}};
}

function loadToast(toastElement){
  const events=[];
  const sandbox={
    document:{getElementById(){return toastElement;}},
    escapeHtml(value){return String(value);},
    clearToast(){events.push('clear-toast');},
    clearTimeout(timer){events.push('clear-timeout:'+timer);},
    setTimeout(callback,delay){events.push('set-timeout:'+delay);return 91;}
  };
  vm.createContext(sandbox);
  vm.runInContext("var toastTimer=77;var toastAction='sentinel';"+toastSource,sandbox);
  return {sandbox,events};
}

(async function(){
  const recovered=loadFetchSheet([
    function(){return Promise.reject(new Error('offline'));},
    function(){return Promise.resolve(response('a,b\n1,2'));}
  ]);
  assert.strictEqual(await recovered.fetchSheet({key:'shop',gid:'123'}),'a,b\n1,2');
  assert.deepStrictEqual(recovered.events,[
    'fetch:1',
    'log:shop 第1次抓取失敗:offline — 自動重試',
    'delay:800',
    'fetch:2'
  ],'the retry waits exactly 800ms after logging the first failure');

  const immediate=loadFetchSheet([
    function(){return Promise.resolve(response('a,b\n3,4'));}
  ]);
  assert.strictEqual(await immediate.fetchSheet({key:'shop',gid:'123'}),'a,b\n3,4');
  assert.deepStrictEqual(immediate.events,['fetch:1'],'a first-attempt success does not log or schedule a delay');

  const failed=loadFetchSheet([
    function(){return Promise.reject(new Error('offline'));},
    function(){return Promise.reject(new Error('still offline'));}
  ]);
  let finalError=null;
  try{await failed.fetchSheet({key:'shop',gid:'123'});}
  catch(error){finalError=error;}
  assert(finalError,'the second failure remains observable to snapshot orchestration');
  assert.strictEqual(finalError.message,'still offline','the final rejection is the second attempt error');
  assert.strictEqual(failed.attempts,2,'fetchSheet never adds a third attempt');
  assert.deepStrictEqual(failed.events.filter(function(event){return event.indexOf('delay:')===0;}),['delay:800'],
    'two failures still schedule only the one approved delay');

  const absentToast=loadToast(null);
  assert.doesNotThrow(function(){absentToast.sandbox.toast('同步完成');},
    'a missing toast node must not crash the calling workflow');
  assert.strictEqual(absentToast.sandbox.toastAction,'sentinel',
    'the null guard returns before mutating toast action state');
  assert.deepStrictEqual(absentToast.events,[],
    'the null guard does not touch timers or other presentation effects');

  const classes=new Set();
  const toastElement={
    innerHTML:'',
    textContent:'',
    classList:{
      add(name){classes.add(name);},
      remove(name){classes.delete(name);}
    }
  };
  classes.add('has-action');
  const normalToast=loadToast(toastElement);
  normalToast.sandbox.toast('同步完成');
  assert.strictEqual(toastElement.textContent,'同步完成','the normal toast still renders its message');
  assert.deepStrictEqual(Array.from(classes).sort(),['show'],'the normal toast keeps its class behavior');
  assert.strictEqual(normalToast.sandbox.toastAction,null,'a message-only toast still clears the action');
  assert.strictEqual(normalToast.sandbox.toastTimer,91,'the normal toast still records its timer');
  assert.deepStrictEqual(normalToast.events,['clear-timeout:77','set-timeout:2000'],
    'the normal toast keeps its existing timer behavior');

  console.log('network retry and toast guard tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
