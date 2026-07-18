const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createStorage(initial){
  const values=Object.assign({},initial||{});
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function loadIdentityModule(){
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('/* ================= ledgerRepository');
  const end=html.indexOf('function setLedgerTestMode(',start);
  assert(start>=0&&end>start,'ledger and identity module is present');
  const storage=createStorage();
  let appended=null;
  const document={
    body:{appendChild(node){appended=node;}},
    createElement(){return {id:'',className:'',innerHTML:'',remove(){}};},
    getElementById(){return null;}
  };
  const sandbox={
    console:{log(){},warn(){},error(){}},
    localStorage:storage,
    document,
    navigator:{onLine:true},
    fetch(){return Promise.reject(new Error('network disabled'));},
    FETCH_TIMEOUT:50,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    JSON,
    String,
    Number,
    isFinite,
    DB:{cfg:{exchangeRate:0.2,ledgerDefaultCurrency:'JPY'}},
    AppLog:{repo(){},sync(){}},
    timestampDate(value){return new Date(Number(value));},
    lsGet(key,fallback){const value=storage.getItem(key);return value===null?fallback:JSON.parse(value);},
    lsSet(key,value){storage.setItem(key,JSON.stringify(value));},
    escapeHtml(value){return String(value);},
    jsString(value){return String(value).replace(/'/g,"\\'");},
    toast(){},
    renderSplit(){},
    updateLedgerPendingStatus(){},
    mergedLedgerRecords(){return sandbox.records||[];},
    records:[]
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(start,end),sandbox);
  sandbox.__html=html;
  sandbox.__appended=function(){return appended;};
  return sandbox;
}

(async function(){
  const mod=loadIdentityModule();
  assert.strictEqual(typeof mod.resolveMemberCandidate,'function','shared member candidate resolver exists');
  assert.strictEqual(typeof mod.commitMemberCandidate,'function','shared member confirmation writer exists');

  assert.throws(function(){mod.resolveMemberCandidate('   ',[],false);},/請輸入身分名稱/,'blank names are rejected');
  assert.throws(function(){mod.resolveMemberCandidate('1234567890123',[],false);},/12/,'names longer than 12 characters are rejected');
  const existingRecords=[{id:'r1',time:'2026-07-17T08:00:00.000Z',member:'王　小明',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:''}];
  const duplicate=mod.resolveMemberCandidate('王  小明',existingRecords,false);
  assert.strictEqual(duplicate.isNew,false,'normalized duplicate selects the existing identity');
  assert.strictEqual(duplicate.name,'王　小明','duplicate selection keeps the earliest registered display name');
  const fresh=mod.resolveMemberCandidate('新 成員',existingRecords,false);
  assert.strictEqual(fresh.isNew,true,'an unknown normalized name becomes a new identity candidate');

  let writes=[];
  mod.ledgerRepository={add(record){writes.push(record);return Promise.resolve({ok:true,pending:0,record});}};
  await mod.commitMemberCandidate(fresh);
  assert.strictEqual(mod.localStorage.getItem('trip_member'),'新 成員','remote success stores the current identity');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(writes[0])),{member:'新 成員',category:'其他',detail:'[身分註冊]',amountJpy:0,amountTwd:0,note:'',participants:'',payMethod:'',recordType:'identity_registration',targetRecordId:'',deleteReason:'',batchId:''},'new identities write the zero-amount registration contract through ledgerRepository');

  mod.localStorage.removeItem('trip_member');
  mod.ledgerRepository={add(){return Promise.resolve({ok:false,pending:1});}};
  await mod.commitMemberCandidate({name:'離線成員',key:'離線成員',isNew:true});
  assert.strictEqual(mod.localStorage.getItem('trip_member'),'離線成員','successful queue insertion stores the current identity');

  mod.localStorage.removeItem('trip_member');
  mod.ledgerRepository={add(){return Promise.reject(new Error('storage denied'));}};
  await assert.rejects(mod.commitMemberCandidate({name:'失敗成員',key:'失敗成員',isNew:true}),/storage denied/);
  assert.strictEqual(mod.localStorage.getItem('trip_member'),null,'remote and queue failure never stores the identity');

  let existingWrites=0;
  mod.ledgerRepository={add(){existingWrites++;return Promise.resolve({ok:true});}};
  await mod.commitMemberCandidate({name:'王　小明',key:'王 小明',isNew:false});
  assert.strictEqual(existingWrites,0,'switching to an existing identity does not create a registration record');
  assert.strictEqual(mod.localStorage.getItem('trip_member'),'王　小明','existing identity switch only updates local current identity');

  mod.memberRegistrationBridge=[];
  mod.records=[];
  mod.openMemberSelector(true);
  assert(mod.__appended().innerHTML.includes('id="memberNameInput"'),'first entry with no registrations opens the new-member input directly');
  assert(!mod.__appended().innerHTML.includes('data-member-name='),'empty shared identity state renders no member buttons');

  mod.records=existingRecords;
  mod.openMemberSelector(true);
  assert(mod.__appended().innerHTML.includes('王　小明'),'registered identity is offered as a selection');
  assert(mod.__appended().innerHTML.includes('新成員'),'registered identity flow retains a new-member entry');

  const settingsSource=mod.__html.slice(mod.__html.indexOf('function openSettings('),mod.__html.indexOf('function mergedLedgerRecords()'));
  assert(settingsSource.includes('目前身分'),'Settings displays the current identity');
  assert(settingsSource.includes('切換身分'),'Settings exposes existing identity switching');
  assert(settingsSource.includes('新增身分'),'Settings exposes new identity registration');
  assert(!settingsSource.includes('修改成員'),'Settings avoids the misleading member-editing label');
  assert(!mod.__html.slice(mod.__html.indexOf('/* ================= 分帳'),mod.__html.indexOf('/* ================= 導覽 / 啟動')).includes('DB.expMembers'),'ledger identity and Split UI do not read Exp member rows');

  console.log('registered member identity tests passed');
})().catch(function(error){
  console.error(error);
  process.exitCode=1;
});
