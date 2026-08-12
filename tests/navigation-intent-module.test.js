const assert=require('assert');
const nav=require('../navigation-intent.js');

const empty=nav.create();
assert.deepStrictEqual(empty,{nextToken:1,pending:null,active:null});

['shopping-list','shop','today','trip','split'].forEach(function(view,index){
  const state=nav.request(empty,{view:view,targetId:index+1});
  assert.strictEqual(state.pending.view,view,view+' is an allowed navigation view');
  assert.strictEqual(state.pending.targetId,String(index+1),view+' keeps a string target ID');
});

const requested=nav.request(empty,{
  view:'shopping-list',targetId:'shopgroup_stop-1',sourceView:'today',sourceId:'hero',align:'center',announce:'Scroll to shopping group'
});
assert.strictEqual(requested.pending.token,1);
assert.strictEqual(requested.nextToken,2);
assert.deepStrictEqual(empty,{nextToken:1,pending:null,active:null},'request is immutable');

const normalized=nav.request(empty,{view:'shop',targetId:42,sourceView:7,sourceId:true,announce:9});
assert.deepStrictEqual(normalized.pending,{
  token:1,view:'shop',targetId:'42',sourceView:'7',sourceId:'true',align:'start',announce:'9'
},'request normalizes navigation metadata and defaults align');

const wrong=nav.consume(requested,'shop');
assert.strictEqual(wrong.intent,null);
assert.deepStrictEqual(wrong.state,requested);

const consumed=nav.consume(requested,'shopping-list');
assert.strictEqual(consumed.intent.targetId,'shopgroup_stop-1');
assert.strictEqual(consumed.state.pending,null);
assert.strictEqual(consumed.state.active.token,1);

assert.deepStrictEqual(nav.complete(consumed.state,999),consumed.state,'stale completion is inert');
assert.deepStrictEqual(nav.complete(consumed.state,1),{nextToken:2,pending:null,active:null},'current completion clears the active intent');
assert.throws(function(){nav.request(empty,{view:'unknown'});},/view/);

console.log('navigation intent module tests passed');
