const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const TripBuyToLedger=require('../buy-to-ledger.js');

const html=fs.readFileSync('index.html','utf8');
const DEGRADED_MESSAGE='消費已建立，但採買項目的記帳標記更新失敗。請避免再次記帳，並重新開啟採買清單確認。';

function extractFunction(name){
  const start=html.indexOf('function '+name+'(');
  assert.notStrictEqual(start,-1,name+' exists');
  let index=html.indexOf('{',start),depth=0;
  for(;index<html.length;index++){
    if(html[index]==='{')depth++;
    else if(html[index]==='}')depth--;
    if(depth===0)return html.slice(start,index+1);
  }
  throw new Error('Could not extract '+name);
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const workflowSource=[
  extractFunction('createBuyToLedgerRuntimeAdapter'),
  extractFunction('persistLedgerExpenseRecords'),
  extractFunction('finishLedgerEntrySaveUi'),
  extractFunction('failLedgerEntrySaveUi'),
  extractFunction('commitLedgerEntrySave')
].join('\n');

function loadRuntimeAdapterFactory(){
  const sandbox={
    shoppingListStore:{all(){return [];},applyLedgerLinks(){return 0;}},
    shoppingLedgerContext(){return {};},
    openShoppingLedgerSourcesEntry(){},
    persistLedgerExpenseRecords(){return Promise.resolve({ok:true});},
    toast(){},AppLog:{repo(){}},timestampDate(value){return new Date(value);},
    Object,Array,String,Date,Promise
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction('createBuyToLedgerRuntimeAdapter'),sandbox);
  return sandbox;
}

{
  const sandbox=loadRuntimeAdapterFactory();
  const expectedMethods=[
    'readItems','readLinkContext','openLedgerDraft','persistLedger','applyLinks',
    'finishLedger','failLedger','notify','log','nowIso'
  ];
  const production=sandbox.createBuyToLedgerRuntimeAdapter();
  assert.deepStrictEqual(Object.keys(production).sort(),expectedMethods.slice().sort(),'runtime adapter exposes only the approved dependency surface');
  expectedMethods.forEach(name=>assert.strictEqual(typeof production[name],'function',name+' is a function'));
  const replacement=function replacementReadItems(){return ['override'];};
  const recording=sandbox.createBuyToLedgerRuntimeAdapter({readItems:replacement});
  assert.strictEqual(recording.readItems,replacement,'an individual method can be overridden');
  assert.notStrictEqual(production.readItems,replacement,'overrides never mutate a previously created production adapter');
}

function createHarness(options){
  options=options||{};
  const events=[],messages=[],logs=[],links=[],personalRecords=[];
  let closeCount=0,resetCount=0,renderCount=0,sharedEnqueueCount=0,editPersistCount=0;
  const cleanDraft={track:'personal',multi:false,amount:'',sourceShoppingItemId:'',sourceShoppingAllocationId:''};
  const sandbox={
    SHOPPING_LEDGER_LINK_VERSION:1,
    ledgerUiState:{track:'personal',draft:null},
    normalizePersonalLedgerRecord(record){return Object.assign({},record);},
    validateLedgerRecord(){return true;},
    validateProxyDraft(flag,target){return flag?target:'';},
    personalLedgerRepository:{
      add(record){
        events.push('persist:personal');
        if(options.persistThrows)throw new Error('personal persistence failed');
        const saved=Object.assign({},record);
        personalRecords.push(saved);
        return saved;
      }
    },
    ledgerRepository:{
      enqueueBatch(records){
        events.push('persist:shared');
        sharedEnqueueCount++;
        if(options.persistThrows)throw new Error('shared persistence failed');
        if(options.persistRejects)return Promise.reject(new Error('shared persistence rejected'));
        return {ok:true,queued:true,records:(options.savedRecords||records).map(record=>Object.assign({},record)),pending:records.length};
      }
    },
    shoppingListStore:{
      applyLedgerLinks(plannedLinks){
        events.push('applyLinks');
        if(options.applyThrows)throw new Error('shopping write failed');
        links.push.apply(links,plain(plannedLinks));
        return plannedLinks.length;
      }
    },
    setLedgerSavePending(pending){events.push(pending?'pending:on':'pending:off');},
    persistLedgerEditedRecords(records){
      events.push('persist:edit');
      editPersistCount++;
      return Promise.resolve({ok:true,personal:true,edited:true,records:records});
    },
    renderSplit(){events.push('render');renderCount++;},
    renderLedgerEntrySheet(){events.push('render:sheet');},
    closeLedgerEntrySheet(){events.push('finish:close');closeCount++;},
    resetLedgerDraftAfterSave(){events.push('finish:reset');resetCount++;return Object.assign({},cleanDraft);},
    undoPersonalLedgerSave(){return true;},
    formatLedgerPrimaryTotal(){return '¥100';},
    ledgerUniverseMode(){return options.universe||'formal';},
    toast(message){events.push('notify');messages.push(message);},
    AppLog:{repo(message){events.push('log');logs.push(message);}},
    timestampDate(value){return new Date(value);},
    navigator:{onLine:true},
    Object,Array,String,Boolean,Number,RegExp,Date,Math,Promise,JSON,isFinite
  };
  sandbox.buyToLedgerDomain=TripBuyToLedger.createDomain({effectiveRecords(records){return records;}});
  vm.createContext(sandbox);
  vm.runInContext(workflowSource,sandbox);
  sandbox.buyToLedgerRuntimeAdapter=sandbox.createBuyToLedgerRuntimeAdapter({
    finishLedger(command,outcome){events.push('finish:adapter');return sandbox.finishLedgerEntrySaveUi(command,outcome&&outcome.result);},
    failLedger(command,error){events.push('fail:adapter');return sandbox.failLedgerEntrySaveUi(command,error);}
  });
  sandbox.buyToLedgerWorkflow=TripBuyToLedger.createWorkflow({domain:sandbox.buyToLedgerDomain,adapter:sandbox.buyToLedgerRuntimeAdapter});
  return {
    sandbox,events,messages,logs,links,personalRecords,cleanDraft,
    counts(){return {closeCount,resetCount,renderCount,sharedEnqueueCount,editPersistCount};}
  };
}

function singleDraft(track){
  return {
    track:track||'personal',currency:'JPY',multi:false,
    sourceShoppingItemId:'shopping-1',sourceShoppingAllocationId:'allocation-1'
  };
}

function multiDraft(track){
  return {
    track:track||'personal',currency:'JPY',multi:true,
    items:[
      {key:'row-a',sourceShoppingItemId:'shopping-a',sourceShoppingAllocationId:'allocation-a'},
      {key:'row-b',sourceShoppingItemId:'shopping-b',sourceShoppingAllocationId:'allocation-b'}
    ]
  };
}

function records(ids){
  return ids.map(id=>({id:id,time:'2026-08-08T12:00:00.000Z',batchId:'',isProxy:false,proxyTarget:'',category:'購物'}));
}

function eventIndex(events,name){
  const index=events.indexOf(name);
  assert.notStrictEqual(index,-1,'expected event '+name+' in '+events.join(', '));
  return index;
}

(async function(){
  {
    const harness=createHarness(),draft=singleDraft('personal'),saved=records(['record-1']);
    const result=await harness.sandbox.commitLedgerEntrySave(draft,null,saved,false,null,draft);
    assert.strictEqual(result.ok,true);
    assert.strictEqual(harness.personalRecords.length,1,'single personal save persists exactly once');
    assert.strictEqual(harness.links.length,1,'one source produces exactly one link');
    assert.deepStrictEqual(harness.links[0].shoppingItemId,'shopping-1');
    assert.deepStrictEqual(harness.links[0].allocationId,'allocation-1');
    assert.deepStrictEqual(harness.links[0].link.recordId,'record-1');
    assert.deepStrictEqual(harness.links[0].link.track,'personal');
    assert.strictEqual(harness.links[0].link.testMode,false);
    assert(eventIndex(harness.events,'persist:personal')<eventIndex(harness.events,'applyLinks'),'Ledger persists before Shopping links');
    assert(eventIndex(harness.events,'applyLinks')<eventIndex(harness.events,'finish:adapter'),'Shopping links finish before the workflow reports completion');
  }

  {
    const harness=createHarness(),draft=multiDraft('personal'),saved=records(['record-a','record-b']);
    await harness.sandbox.commitLedgerEntrySave(draft,null,saved,false,null,draft);
    assert.deepStrictEqual(
      plain(harness.links.map(entry=>[entry.shoppingItemId,entry.allocationId,entry.link.recordId])),
      [['shopping-a','allocation-a','record-a'],['shopping-b','allocation-b','record-b']],
      'multi save maps the filtered submission rows to records in order'
    );
    assert.strictEqual(harness.personalRecords.length,2);
  }

  {
    const draft=singleDraft('shared'),prepared=records(['prepared-id']),queued=records(['queued-id']);
    const harness=createHarness({savedRecords:queued,universe:'test'});
    await harness.sandbox.commitLedgerEntrySave(draft,null,prepared,false,null,draft);
    assert.strictEqual(harness.counts().sharedEnqueueCount,1,'shared uses one durable queue acknowledgement');
    assert.strictEqual(harness.links.length,1);
    assert.strictEqual(harness.links[0].link.recordId,'queued-id','acknowledged repository records take precedence over prepared records');
    assert.strictEqual(harness.links[0].link.track,'shared');
    assert.strictEqual(harness.links[0].link.testMode,true);
    assert(eventIndex(harness.events,'persist:shared')<eventIndex(harness.events,'applyLinks'));
  }

  {
    const draft=singleDraft('personal'),harness=createHarness({persistThrows:true});
    const result=await harness.sandbox.commitLedgerEntrySave(draft,null,records(['record-1']),false,null,draft);
    assert.strictEqual(result.ok,false,'synchronous persistence failure reports failure');
    assert.strictEqual(harness.links.length,0,'persistence failure produces zero links');
    assert.strictEqual(harness.counts().closeCount,0,'failed save keeps the form open');
  }

  {
    const draft=multiDraft('personal'),harness=createHarness();
    await harness.sandbox.commitLedgerEntrySave(draft,null,records(['record-only']),false,null,draft);
    assert.strictEqual(harness.personalRecords.length,1,'Ledger success is preserved on link-plan mismatch');
    assert.strictEqual(harness.links.length,0,'mismatch performs no Shopping write');
    assert(harness.messages.includes(DEGRADED_MESSAGE),'mismatch uses the approved degraded warning');
    assert.strictEqual(harness.logs.length,1,'mismatch creates one diagnostic log');
    assert.strictEqual(harness.counts().closeCount,1,'Ledger success still finishes the form');
  }

  {
    const draft=singleDraft('personal'),harness=createHarness({applyThrows:true});
    await harness.sandbox.commitLedgerEntrySave(draft,null,records(['record-1']),false,null,draft);
    assert.strictEqual(harness.personalRecords.length,1,'Shopping write failure never repeats Ledger persistence');
    assert.strictEqual(harness.events.filter(event=>event==='applyLinks').length,1,'Shopping write is attempted once');
    assert.strictEqual(harness.links.length,0);
    assert(harness.messages.includes(DEGRADED_MESSAGE));
    assert.strictEqual(harness.logs.length,1);
    assert.strictEqual(harness.counts().closeCount,1);
  }

  {
    const draft=singleDraft('personal'),harness=createHarness();
    await harness.sandbox.commitLedgerEntrySave(draft,null,records(['record-1']),true,null,draft);
    assert.strictEqual(harness.counts().resetCount,1);
    assert.strictEqual(harness.counts().closeCount,0);
    assert.strictEqual(harness.sandbox.ledgerUiState.draft.sourceShoppingItemId,'','save-and-add-another clears the item source');
    assert.strictEqual(harness.sandbox.ledgerUiState.draft.sourceShoppingAllocationId,'','save-and-add-another clears the allocation source');
  }

  {
    const draft=singleDraft('personal'),harness=createHarness();
    await harness.sandbox.commitLedgerEntrySave(draft,{track:'personal',originals:[{id:'old'}]},records(['record-1']),false,null,draft);
    assert.strictEqual(harness.counts().editPersistCount,1);
    assert.strictEqual(harness.links.length,0,'editing a Ledger record never writes Shopping links');
    assert.strictEqual(harness.events.includes('applyLinks'),false);
  }

  {
    const draft=singleDraft('shared'),harness=createHarness({persistRejects:true});
    const result=await harness.sandbox.commitLedgerEntrySave(draft,null,records(['record-1']),false,null,draft);
    assert.strictEqual(result.ok,false,'asynchronous persistence rejection reports failure');
    assert.strictEqual(harness.links.length,0);
    assert.strictEqual(harness.counts().closeCount,0);
  }

  console.log('Buy-to-Ledger characterization tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
