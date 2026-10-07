const assert=require('assert');
const TripProgression=require('../trip-progression.js');

function plain(value){return JSON.parse(JSON.stringify(value));}

const empty=TripProgression.reconcile();
assert.deepStrictEqual(plain(empty),{
  pick:{item:null,remaining:0,source:'complete'},
  progress:{done:{},skip:{},autoSkip:{}},changed:false,skipped:[],notification:''
});

const items=[
  {id:'a',time:'09:00',act:'早餐'},
  {id:'mid',time:'',act:'逛街'},
  {id:'b',time:'17:00',act:'晚餐'},
  {id:'c',time:'21:00',act:'夜景'}
];
const input={items,progress:{done:{},skip:{},autoSkip:{}},checks:{},nowMinutes:20*60,isToday:true};
const before=plain(input);
let outcome=TripProgression.reconcile(input);
assert.strictEqual(outcome.pick.item.id,'b');
assert.strictEqual(outcome.pick.remaining,1);
assert.strictEqual(outcome.pick.source,'time-stale');
assert.deepStrictEqual(plain(outcome.progress),{
  done:{},skip:{a:true,mid:true},autoSkip:{a:true,mid:true}
});
assert.strictEqual(outcome.changed,true);
assert.deepStrictEqual(plain(outcome.skipped),[{id:'a',label:'早餐'},{id:'mid',label:'逛街'}]);
assert.strictEqual(outcome.notification,'已自動略過 2 項超時未確認行程：早餐、逛街');
assert.deepStrictEqual(plain(input),before,'reconciliation never mutates caller input');

outcome=TripProgression.reconcile(Object.assign({},input,{isToday:false}));
assert.strictEqual(outcome.pick.item.id,'b');
assert.strictEqual(outcome.changed,false);
assert.deepStrictEqual(plain(outcome.progress),input.progress,'non-today selection never proposes persistence');

outcome=TripProgression.reconcile({
  items:[
    {id:'cluster',time:'10:00',act:'同區串點',clusterController:true},
    {id:'later',time:'12:00',act:'午餐'}
  ],progress:{},checks:{},nowMinutes:13*60,isToday:true
});
assert.strictEqual(outcome.pick.item.id,'cluster','first blocking cluster remains the pick');
assert.strictEqual(outcome.changed,false,'items after a blocking cluster are not auto-skipped');
// The root v110 bridge loads this same module but builds controllers without stop ids,
// so a controller with no clusterItemIds must keep the legacy blocker above.

// v148: a controller that carries its stop ids follows the normal stale rule -- it stays
// current until a later item starts, then the whole cluster is auto-skipped at once.
const clusterDay=[
  {id:'hiroshima__cluster',time:'9:00',act:'廣島市區走馬看花',clusterController:true,clusterItemIds:['castle','dome','museum','tower']},
  {id:'lunch',time:'12:30',act:'午餐時間'},
  {id:'ferry',time:'15:00',act:'宮島走馬看花'}
];
outcome=TripProgression.reconcile({items:clusterDay,progress:{},checks:{},nowMinutes:12*60+29,isToday:true});
assert.strictEqual(outcome.pick.item.id,'hiroshima__cluster','cluster stays current until the next item starts');
assert.strictEqual(outcome.changed,false,'nothing is skipped before the next item starts');

outcome=TripProgression.reconcile({
  items:clusterDay,progress:{done:{castle:true}},checks:{dome:true},nowMinutes:12*60+30,isToday:true
});
assert.strictEqual(outcome.pick.item.id,'lunch','once the next item starts it becomes the pick');
assert.strictEqual(outcome.pick.source,'time-stale');
assert.deepStrictEqual(plain(outcome.progress),{
  done:{castle:true},
  skip:{hiroshima__cluster:true,museum:true,tower:true},
  autoSkip:{hiroshima__cluster:true,museum:true,tower:true}
},'controller and every uncleared stop are auto-skipped together; done and checked stops are kept');
assert.strictEqual(outcome.changed,true);
assert.deepStrictEqual(plain(outcome.skipped),[{id:'hiroshima__cluster',label:'廣島市區走馬看花'}]);
assert.strictEqual(outcome.notification,'已自動略過 1 項超時未確認行程：廣島市區走馬看花');

outcome=TripProgression.reconcile({items:clusterDay,progress:{},checks:{},nowMinutes:12*60+30,isToday:false});
assert.strictEqual(outcome.pick.item.id,'lunch','non-today selection moves past a stale cluster');
assert.strictEqual(outcome.changed,false,'non-today selection never persists a cluster skip');

outcome=TripProgression.reconcile({
  items:clusterDay,progress:{done:{castle:true,dome:true,museum:true},skip:{tower:true}},checks:{},nowMinutes:13*60,isToday:true
});
assert.strictEqual(outcome.pick.item.id,'lunch');
assert.strictEqual(outcome.changed,false,'a cluster whose stops are all cleared is left for the completion sync, not auto-skipped');
assert.strictEqual(outcome.progress.skip.hiroshima__cluster,undefined);

outcome=TripProgression.reconcile({items:clusterDay,progress:{},checks:{},nowMinutes:15*60+5,isToday:true});
assert.strictEqual(outcome.pick.item.id,'ferry');
assert.deepStrictEqual(Object.keys(outcome.progress.skip).sort(),['castle','dome','hiroshima__cluster','lunch','museum','tower'],
  'a stale cluster and a stale ordinary item are skipped in the same single commit');
assert.strictEqual(outcome.notification,'已自動略過 2 項超時未確認行程：廣島市區走馬看花、午餐時間');

outcome=TripProgression.reconcile({
  items:[{id:'a',time:'09:00',act:'早餐'},{id:'b',time:'11:00',act:'午餐'}],
  progress:{done:{a:true}},checks:{},nowMinutes:8*60,isToday:true
});
assert.strictEqual(outcome.pick.item.id,'b');
assert.strictEqual(outcome.pick.source,'time');
assert.strictEqual(outcome.changed,false);

outcome=TripProgression.reconcile({
  items:[{id:'a',time:'09:00',act:'早餐'},{id:'b',time:'11:00',act:'午餐'}],
  progress:{},checks:{a:true},nowMinutes:12*60,isToday:true
});
assert.strictEqual(outcome.pick.item.id,'b');
assert.strictEqual(outcome.changed,false,'checked items are excluded without rewriting checks');

outcome=TripProgression.reconcile({
  items:[{id:'a',time:'09:00',act:'早餐'},{id:'b',time:'11:00',act:'午餐'},{id:'c',time:'12:00',act:'晚餐'},{id:'d',time:'13:00',act:'夜景'}],
  progress:{},checks:{},nowMinutes:14*60,isToday:true
});
assert.strictEqual(outcome.notification,'已自動略過 3 項超時未確認行程：早餐、午餐 等');

console.log('trip progression tests passed');
