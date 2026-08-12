const assert=require('assert');
const nav=require('../navigation-intent.js');

function plain(value){return JSON.parse(JSON.stringify(value));}

const empty=nav.create();
assert.deepStrictEqual(empty,{nextToken:1,pending:null,active:null});

[
  {value:'Infinity',expected:1,label:'string Infinity'},
  {value:NaN,expected:1,label:'NaN'},
  {value:'not-a-number',expected:1,label:'non-numeric input'},
  {value:0,expected:1,label:'zero'},
  {value:-4,expected:1,label:'negative input'},
  {value:7.9,expected:7,label:'fractional input'}
].forEach(function(testCase){
  assert.strictEqual(
    nav.create({nextToken:testCase.value}).nextToken,testCase.expected,
    testCase.label+' normalizes to a finite positive integer token'
  );
});

const fractionalStart=nav.create({nextToken:7.9});
const firstMonotonic=nav.request(fractionalStart,{view:'today'});
const secondMonotonic=nav.request(firstMonotonic,{view:'today'});
assert.strictEqual(firstMonotonic.pending.token,7,'request starts from the normalized integer token');
assert.strictEqual(secondMonotonic.pending.token,8,'request tokens remain strictly monotonic and unique');

assert.strictEqual(nav.create({nextToken:Number.MAX_VALUE}).nextToken,1,'Number.MAX_VALUE is not a safe token');
assert.strictEqual(nav.create({nextToken:9007199254740992}).nextToken,1,'unsafe finite integers reset to token one');
const safeBoundary=nav.request(nav.create({nextToken:9007199254740990}),{view:'today'});
assert.strictEqual(safeBoundary.pending.token,9007199254740990,'the last incrementable safe token is issued once');
assert.strictEqual(safeBoundary.nextToken,9007199254740991,'the next token reaches the safe integer limit');
assert.throws(function(){nav.request(safeBoundary,{view:'today'});},/token/,'the exhausted safe token cannot be issued twice');

const invalidSeedWithActive={nextToken:'Infinity',pending:null,active:{token:1,view:'today'}};
const invalidSeedRequest=nav.request(invalidSeedWithActive,{view:'shop'});
assert.strictEqual(invalidSeedRequest.pending.token,2,'an invalid seed advances beyond a preserved active token');
assert.notStrictEqual(invalidSeedRequest.pending.token,invalidSeedRequest.active.token,'request never reuses the active token');

const staleSeedWithActive=nav.create({nextToken:3,pending:null,active:{token:9,view:'today'}});
assert.strictEqual(staleSeedWithActive.nextToken,10,'a stale valid seed advances beyond a higher active token');
assert.strictEqual(nav.request(staleSeedWithActive,{view:'shop'}).pending.token,10,'request issues the adjusted active successor');

[
  {pending:12,active:7,label:'pending token after active token'},
  {pending:7,active:12,label:'active token after pending token'}
].forEach(function(testCase){
  const state=nav.create({nextToken:2,pending:{token:testCase.pending},active:{token:testCase.active}});
  const requestedState=nav.request(state,{view:'shop'});
  assert.strictEqual(state.nextToken,13,testCase.label+' determines the high-water token');
  assert.strictEqual(requestedState.pending.token,13,testCase.label+' cannot collide with a preserved token');
});

const exhaustedActiveInput={nextToken:1,pending:null,active:{token:9007199254740991,view:'today'}};
const exhaustedActiveBefore=plain(exhaustedActiveInput);
const exhaustedActiveState=nav.create(exhaustedActiveInput);
assert.strictEqual(exhaustedActiveState.nextToken,9007199254740991,'a max-safe active token exhausts the next token');
assert.throws(function(){nav.request(exhaustedActiveInput,{view:'shop'});},/token/,'a max-safe active token blocks a duplicate request');
assert.deepStrictEqual(exhaustedActiveInput,exhaustedActiveBefore,'exhaustion never mutates the caller state');

['shopping-list','shop','today','trip','split'].forEach(function(view,index){
  const state=nav.request(empty,{view:view,targetId:index+1});
  assert.strictEqual(state.pending.view,view,view+' is an allowed navigation view');
  assert.strictEqual(state.pending.targetId,String(index+1),view+' keeps a string target ID');
});

['toString','constructor','__proto__','valueOf','hasOwnProperty'].forEach(function(view){
  assert.throws(function(){nav.request(empty,{view:view});},/view/,view+' is not an allowed navigation view');
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

const queued=nav.request(consumed.state,{view:'today',targetId:'day-1'});
assert.strictEqual(queued.active.token,1,'request preserves the existing active intent');
assert.deepStrictEqual(nav.complete(queued,1),{
  nextToken:3,pending:{token:2,view:'today',targetId:'day-1',sourceView:'',sourceId:'',align:'start',announce:''},active:null
},'completion preserves a newly queued pending intent');
assert.throws(function(){nav.request(empty,{view:'unknown'});},/view/);

console.log('navigation intent module tests passed');
