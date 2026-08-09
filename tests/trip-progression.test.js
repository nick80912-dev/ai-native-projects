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
