const assert=require('assert');
const TripBuyToLedger=require('../buy-to-ledger.js');

function plain(value){return JSON.parse(JSON.stringify(value));}

function link(id,overrides){
  return Object.assign({
    version:1,track:'personal',testMode:false,recordId:id,batchId:'',
    linkedAt:'2026-08-08T01:00:00.000Z',releasedAt:''
  },overrides||{});
}

function allocation(id,target,quantity,links){
  return {allocationId:id,target:target||'',quantity:quantity,ledgerLinks:links||[]};
}

function item(id,allocations){
  return {id,name:'白桃',category:'必買',unit:'盒',legacyQtyText:'',allocations,done:false};
}

const effectiveCalls=[];
const domain=TripBuyToLedger.createDomain({
  effectiveRecords(records){
    effectiveCalls.push(records);
    const deleted={};
    records.forEach(record=>{if(record.recordType==='deletion')deleted[record.targetRecordId]=true;});
    return records.filter(record=>record.recordType!=='deletion'&&!deleted[record.id]);
  }
});

assert.deepStrictEqual(
  Object.keys(domain).sort(),
  ['appendLink','createDraftPlan','inspectItem','normalizeLink','planCommit','prepare','releaseLink','sourceRefs'].sort(),
  'domain exposes the approved P2 surface'
);

const personalContext={
  testMode:false,
  personal:{ready:true,records:[{id:'personal-live'},{id:'personal-new',replacesRecordId:'personal-old'}]},
  shared:{ready:true,records:[]}
};
assert.strictEqual(domain.inspectItem(item('p-live',[allocation('a','',1,[link('personal-live')])]),personalContext).state,'linked');
assert.strictEqual(domain.inspectItem(item('p-replaced',[allocation('a','',1,[link('personal-old')])]),personalContext).state,'linked','personal replacement remains linked');
assert.strictEqual(domain.inspectItem(item('p-missing',[allocation('a','',1,[link('personal-missing')])]),personalContext).state,'unlinked','ready personal storage is authoritative');
assert.strictEqual(domain.inspectItem(item('p-not-ready',[allocation('a','',1,[link('personal-missing')])]),{
  testMode:false,personal:{ready:false,records:[]},shared:{ready:true,records:[]}
}).state,'unverified');

const sharedLive=link('shared-live',{track:'shared'});
assert.strictEqual(domain.inspectItem(item('s-live',[allocation('a','',1,[sharedLive])]),{
  testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[{id:'shared-live'}]}
}).state,'linked');
assert.strictEqual(domain.inspectItem(item('s-replaced',[allocation('a','',1,[link('shared-old',{track:'shared'})])]),{
  testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[{id:'shared-new',replacesRecordId:'shared-old'}]}
}).state,'linked','effective shared replacement remains linked');
assert.strictEqual(domain.inspectItem(item('s-deleted',[allocation('a','',1,[link('shared-deleted',{track:'shared'})])]),{
  testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[
    {id:'shared-deleted'},
    {id:'delete-1',recordType:'deletion',targetRecordId:'shared-deleted'}
  ]}
}).allocationStates[0].reason,'tombstoned','confirmed tombstone is unlinked rather than unverified');
assert.strictEqual(domain.inspectItem(item('s-missing',[allocation('a','',1,[link('not-downloaded',{track:'shared'})])]),{
  testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[]}
}).state,'unverified','missing shared record remains fail-safe');
assert.strictEqual(domain.inspectItem(item('wrong-universe',[allocation('a','',1,[link('test-record',{track:'shared',testMode:true})])]),{
  testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[{id:'test-record'}]}
}).allocationStates[0].reason,'universe-mismatch');

const partialSource=item('partial',[
  allocation('allocation-linked','Bar',1,[link('personal-live')]),
  allocation('allocation-free','Amy',2,[])
]);
const partialInspection=domain.inspectItem(partialSource,personalContext);
assert.strictEqual(partialInspection.state,'partial');
assert.strictEqual(partialInspection.label,'記帳 1／2');
assert.deepStrictEqual(partialInspection.allocationStates.map(value=>[value.allocationId,value.canEdit]),[
  ['allocation-linked',false],['allocation-free',true]
]);
assert.strictEqual(partialInspection.canSplit,false,'linked allocation blocks a split');
assert.strictEqual(partialInspection.canOfferPartialPurchase,false);

const splittable=domain.inspectItem(item('split',[
  allocation('allocation-a','Bar',2,[]),allocation('allocation-b','Amy',2,[])
]),personalContext);
assert.strictEqual(splittable.state,'unlinked');
assert.strictEqual(splittable.canSplit,true);
assert.strictEqual(splittable.canOfferPartialPurchase,true);

const prepared=domain.prepare([
  partialSource,
  item('free',[allocation('allocation-c','',1,[])])
],personalContext);
assert.strictEqual(prepared.ok,true);
assert.strictEqual(prepared.reason,'');
assert.strictEqual(prepared.linkedCount,1);
assert.strictEqual(prepared.unverifiedCount,0);
assert.deepStrictEqual(prepared.sources.map(source=>[source.shoppingItemId,source.allocationId]),[
  ['partial','allocation-free'],['free','allocation-c']
]);

const blocked=domain.prepare([
  item('unknown',[allocation('allocation-u','',1,[link('not-downloaded',{track:'shared'})])]),
  item('free',[allocation('allocation-c','',1,[])])
],{testMode:false,personal:{ready:true,records:[]},shared:{ready:true,records:[]}});
assert.strictEqual(blocked.ok,false);
assert.strictEqual(blocked.reason,'unverified');
assert.strictEqual(blocked.unverifiedCount,1);
assert.strictEqual(blocked.sources.length,1,'preparation still reports safe sources for diagnostics');
assert.strictEqual(domain.prepare([item('done',[allocation('allocation-a','',1,[link('personal-live')])])],personalContext).reason,'already-linked');
assert.strictEqual(domain.prepare([],personalContext).reason,'empty');

const singlePlan=domain.createDraftPlan(prepared.sources.slice(0,1));
assert.strictEqual(singlePlan.mode,'single');
assert.strictEqual(singlePlan.seed.detail,'白桃');
assert.strictEqual(singlePlan.seed.category,'購物');
assert.strictEqual(singlePlan.seed.proxyTarget,'Amy');
assert.strictEqual(singlePlan.sourceShoppingItemId,'partial');
assert.strictEqual(singlePlan.sourceShoppingAllocationId,'allocation-free');
const multiPlan=domain.createDraftPlan(prepared.sources);
assert.strictEqual(multiPlan.mode,'multi');
assert.deepStrictEqual(multiPlan.items.map(value=>[value.name,value.sourceShoppingItemId,value.sourceShoppingAllocationId]),[
  ['白桃','partial','allocation-free'],['白桃','free','allocation-c']
]);
assert.throws(()=>domain.createDraftPlan([]),/採買來源/);

const filteredSubmission={
  track:'personal',multi:true,
  items:[
    {key:'kept-a',sourceShoppingItemId:'shopping-a',sourceShoppingAllocationId:'allocation-a'},
    {key:'kept-c',sourceShoppingItemId:'shopping-c',sourceShoppingAllocationId:'allocation-c'}
  ]
};
assert.deepStrictEqual(domain.sourceRefs(filteredSubmission),[
  {shoppingItemId:'shopping-a',allocationId:'allocation-a'},
  {shoppingItemId:'shopping-c',allocationId:'allocation-c'}
],'source refs follow the already-filtered submission rows');
assert.deepStrictEqual(domain.sourceRefs({sourceShoppingItemId:'single',sourceShoppingAllocationId:'single-a'}),[
  {shoppingItemId:'single',allocationId:'single-a'}
]);
assert.deepStrictEqual(domain.sourceRefs({}),[]);

const preparedRecords=[{id:'prepared-a'},{id:'prepared-c'}];
const savedRecords=[{id:'saved-a',batchId:'batch-1'},{id:'saved-c',batchId:'batch-1'}];
const commitInput={
  draft:{track:'shared'},submissionDraft:filteredSubmission,records:preparedRecords,
  result:{ok:true,records:savedRecords},testMode:true,nowIso:'2026-08-08T03:00:00.000Z'
};
const commitSnapshot=plain(commitInput);
const commitPlan=domain.planCommit(commitInput);
assert.strictEqual(commitPlan.ok,true);
assert.strictEqual(commitPlan.status,'linked');
assert.deepStrictEqual(commitPlan.links.map(value=>[value.shoppingItemId,value.allocationId,value.link.recordId]),[
  ['shopping-a','allocation-a','saved-a'],['shopping-c','allocation-c','saved-c']
]);
assert(commitPlan.links.every(value=>value.link.track==='shared'&&value.link.testMode===true&&value.link.batchId==='batch-1'));
assert.deepStrictEqual(commitInput,commitSnapshot,'commit planning never mutates caller input');

const mismatch=domain.planCommit(Object.assign({},commitInput,{result:{ok:true,records:[savedRecords[0]]}}));
assert.strictEqual(mismatch.ok,false);
assert.strictEqual(mismatch.status,'degraded');
assert.deepStrictEqual(mismatch.links,[]);
assert.match(mismatch.error,/一一對應/);
const malformed=domain.planCommit(Object.assign({},commitInput,{
  submissionDraft:{multi:true,items:[
    {sourceShoppingItemId:'same',sourceShoppingAllocationId:'same'},
    {sourceShoppingItemId:'same',sourceShoppingAllocationId:'same'}
  ]}
}));
assert.strictEqual(malformed.ok,false);
assert.deepStrictEqual(malformed.links,[]);

const history=[link('old',{releasedAt:'2026-08-08T02:00:00.000Z'})];
const historySnapshot=plain(history);
const appended=domain.appendLink(history,link('new'));
assert.deepStrictEqual(history,historySnapshot,'append never mutates prior history');
assert.strictEqual(appended.length,2);
assert.strictEqual(appended[1].recordId,'new');
const released=domain.releaseLink(appended,'2026-08-08T04:00:00.000Z');
assert.strictEqual(released[0].releasedAt,'2026-08-08T02:00:00.000Z');
assert.strictEqual(released[1].releasedAt,'2026-08-08T04:00:00.000Z');
assert.strictEqual(appended[1].releasedAt,'','release never mutates input history');
assert.strictEqual(domain.releaseLink(released,'2026-08-08T05:00:00.000Z'),null,'already released history is inert');
assert.throws(()=>domain.normalizeLink(Object.assign(link('bad'),{track:'other'})),/軌別/);
assert(effectiveCalls.length>0,'shared state resolution uses the injected effective-record projection');

function recordingAdapter(options){
  options=options||{};
  const events=[],messages=[],logs=[];
  const adapter={
    readItems(ids){events.push('readItems');if(options.readThrows)throw new Error('read failed');return options.items||[];},
    readLinkContext(){events.push('readLinkContext');return options.context||personalContext;},
    openLedgerDraft(plan,openOptions){events.push('openLedgerDraft');adapter.opened={plan,options:openOptions};},
    persistLedger(records,track){
      events.push('persistLedger');adapter.persisted={records,track};
      if(options.persistThrows)throw new Error('persist threw');
      if(options.persistRejects)return Promise.reject(new Error('persist rejected'));
      return Promise.resolve(options.result||{ok:true,personal:true,records});
    },
    applyLinks(links){events.push('applyLinks');if(options.applyThrows)throw new Error('apply failed');adapter.links=links;},
    finishLedger(command,result){events.push('finishLedger');adapter.finished={command,result};},
    failLedger(command,error){events.push('failLedger');adapter.failed={command,error};},
    notify(message){events.push('notify');messages.push(message);},
    log(message){events.push('log');logs.push(message);},
    nowIso(){events.push('nowIso');return '2026-08-08T05:00:00.000Z';}
  };
  return {adapter,events,messages,logs};
}

(async function(){
  assert.strictEqual(typeof TripBuyToLedger.createWorkflow,'function','module exports the workflow factory');

  {
    const sourceItem=item('workflow-item',[allocation('workflow-allocation','Bar',1,[])]);
    const recording=recordingAdapter({items:[sourceItem]});
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.start({itemIds:['workflow-item'],keepShoppingList:true});
    assert.strictEqual(outcome.status,'opened');
    assert.deepStrictEqual(recording.events,['readItems','readLinkContext','openLedgerDraft']);
    assert.strictEqual(recording.adapter.opened.plan.mode,'single');
    assert.strictEqual(recording.adapter.opened.options.keepShoppingList,true);
  }

  {
    const unknown=item('unknown',[allocation('allocation-u','',1,[link('remote-missing',{track:'shared'})])]);
    const recording=recordingAdapter({items:[unknown],context:{testMode:false,personal:{ready:true,records:[]},shared:{ready:false,records:[]}}});
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.start({
      itemIds:['unknown'],messages:{unverified:'尚待確認',alreadyLinked:'已經記帳',empty:'找不到來源'}
    });
    assert.strictEqual(outcome.status,'blocked');
    assert.strictEqual(outcome.reason,'unverified');
    assert.deepStrictEqual(recording.events,['readItems','readLinkContext','notify']);
    assert.deepStrictEqual(recording.messages,['尚待確認']);
  }

  const command={
    draft:{track:'personal'},
    submissionDraft:{track:'personal',multi:false,sourceShoppingItemId:'shopping-1',sourceShoppingAllocationId:'allocation-1'},
    records:[{id:'record-1'}],addAnother:false
  };
  {
    const recording=recordingAdapter();
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.commit(command);
    assert.strictEqual(outcome.status,'saved-linked');
    assert.deepStrictEqual(recording.events,['persistLedger','nowIso','applyLinks','finishLedger']);
    assert.strictEqual(recording.adapter.links[0].link.recordId,'record-1');
  }

  {
    const recording=recordingAdapter({result:{ok:true,personal:true,records:[]}});
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const mismatch=Object.assign({},command,{
      submissionDraft:{track:'personal',multi:true,items:[
        {sourceShoppingItemId:'shopping-1',sourceShoppingAllocationId:'allocation-1'},
        {sourceShoppingItemId:'shopping-2',sourceShoppingAllocationId:'allocation-2'}
      ]}
    });
    const outcome=await workflow.commit(mismatch);
    assert.strictEqual(outcome.status,'saved-degraded');
    assert.deepStrictEqual(recording.events,['persistLedger','nowIso','log','notify','finishLedger']);
    assert.match(recording.messages[0],/消費已建立/);
  }

  {
    const recording=recordingAdapter({applyThrows:true});
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.commit(command);
    assert.strictEqual(outcome.status,'saved-degraded');
    assert.strictEqual(recording.events.filter(value=>value==='persistLedger').length,1,'link failure never retries Ledger persistence');
    assert.deepStrictEqual(recording.events,['persistLedger','nowIso','applyLinks','log','notify','finishLedger']);
  }

  for(const failure of [{persistThrows:true},{persistRejects:true}]){
    const recording=recordingAdapter(failure);
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.commit(command);
    assert.strictEqual(outcome.status,'failed');
    assert.deepStrictEqual(recording.events,['persistLedger','failLedger']);
  }

  {
    const recording=recordingAdapter({readThrows:true});
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    const outcome=await workflow.start({itemIds:['x']});
    assert.strictEqual(outcome.status,'failed','synchronous start errors become outcomes');
    assert.deepStrictEqual(recording.events,['readItems','failLedger']);
  }

  {
    const recording=recordingAdapter();
    const workflow=TripBuyToLedger.createWorkflow({domain,adapter:recording.adapter});
    assert.deepStrictEqual(await workflow.commit({editing:{id:'record-1'},draft:{track:'personal'},records:[]}),{
      ok:false,status:'blocked',reason:'editing'
    });
    assert.deepStrictEqual(await workflow.commit({draft:{track:'personal'},submissionDraft:{},records:[]}),{
      ok:false,status:'blocked',reason:'no-shopping-session'
    });
    assert.deepStrictEqual(recording.events,[],'edits and generic Ledger saves never cross the workflow seam');
  }

  console.log('Buy-to-Ledger module tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
