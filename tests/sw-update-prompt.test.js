const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const indexSource=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');

function extractFunction(name){
  const start=indexSource.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,'missing production function '+name);
  const brace=indexSource.indexOf('{',start);
  let depth=0,quote='',escaped=false;
  for(let index=brace;index<indexSource.length;index+=1){
    const char=indexSource[index];
    if(quote){
      if(escaped)escaped=false;
      else if(char==='\\')escaped=true;
      else if(char===quote)quote='';
      continue;
    }
    if(char==='\''||char==='"'||char==='`'){quote=char;continue;}
    if(char==='{')depth+=1;
    if(char==='}'&&--depth===0)return indexSource.slice(start,index+1);
  }
  throw new Error('unterminated production function '+name);
}

function eventTarget(){
  const listeners={};
  return {
    addEventListener(type,listener){(listeners[type]||(listeners[type]=[])).push(listener);},
    emit(type){(listeners[type]||[]).slice().forEach(listener=>listener());}
  };
}

function harness(options={}){
  let hidden=true,reveals=0,reloads=0;
  const prompt={};
  Object.defineProperty(prompt,'hidden',{
    get(){return hidden;},
    set(value){if(hidden&&value===false)reveals+=1;hidden=value;}
  });
  const sandbox={
    document:{getElementById(id){return options.missingDom?null:(id==='swUpdatePrompt'?prompt:null);}},
    window:{location:{reload(){reloads+=1;}}}
  };
  const functions=['showServiceWorkerUpdatePrompt','reloadForServiceWorkerUpdate','setupServiceWorkerUpdatePrompt']
    .map(extractFunction).join('\n');
  vm.runInNewContext('var swUpdatePromptShown=false;\n'+functions,sandbox,{filename:'index.html#sw-update-prompt'});
  return {sandbox,prompt,get reveals(){return reveals;},get reloads(){return reloads;}};
}

function exerciseUpdate(target,hadController){
  const serviceWorker=eventTarget();
  const worker=Object.assign(eventTarget(),{state:'installing'});
  const registration=Object.assign(eventTarget(),{installing:worker});
  const observe=target.sandbox.setupServiceWorkerUpdatePrompt(serviceWorker,hadController);
  observe(registration);
  registration.emit('updatefound');
  worker.state='activated';
  worker.emit('statechange');
  serviceWorker.emit('controllerchange');
  return {serviceWorker,worker,registration};
}

const firstInstall=harness();
exerciseUpdate(firstInstall,false);
assert.strictEqual(firstInstall.prompt.hidden,true,'first install must not claim that a newer version is ready');
assert.strictEqual(firstInstall.reveals,0,'first install never reveals the update prompt');
assert.strictEqual(firstInstall.reloads,0,'worker events never reload automatically');

const existing=harness();
const events=exerciseUpdate(existing,true);
assert.strictEqual(existing.prompt.hidden,false,'an activated update reveals the prompt for an already-controlled page');
assert.strictEqual(existing.reveals,1,'activated and controllerchange signals share one reveal guard');
assert.strictEqual(existing.reloads,0,'the update remains user-triggered');
events.serviceWorker.emit('controllerchange');
assert.strictEqual(existing.reveals,1,'duplicate controller changes do not reveal twice');
existing.sandbox.reloadForServiceWorkerUpdate();
assert.strictEqual(existing.reloads,1,'the explicit update action reloads exactly once');

const lateControlled=harness();
const lateServiceWorker=Object.assign(eventTarget(),{controller:null});
const lateWorker=Object.assign(eventTarget(),{state:'installing'});
const lateRegistration=Object.assign(eventTarget(),{
  active:{state:'activated'},
  installing:lateWorker
});
const observeLate=lateControlled.sandbox.setupServiceWorkerUpdatePrompt(lateServiceWorker,false);
observeLate(lateRegistration);
lateRegistration.emit('updatefound');
lateWorker.state='activated';
lateWorker.emit('statechange');
assert.strictEqual(
  lateControlled.prompt.hidden,
  false,
  'an existing active registration remains update-eligible while controller acquisition is briefly late'
);

const missingDom=harness({missingDom:true});
assert.doesNotThrow(()=>missingDom.sandbox.showServiceWorkerUpdatePrompt());
assert.strictEqual(missingDom.sandbox.showServiceWorkerUpdatePrompt(),false,'missing optional prompt DOM degrades safely');

console.log('Service Worker update prompt tests passed');
