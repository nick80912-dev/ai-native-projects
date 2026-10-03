const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
assert(html.includes('function shoppingStatusPresentation('),'shopping status projection is available');
const context={};vm.createContext(context);
vm.runInContext(extractFunction(html,'shoppingStatusPresentation'),context);
const item={id:'peach',done:true,allocations:[{allocationId:'a',quantity:2},{allocationId:'b',quantity:3}]};
const before=JSON.stringify(item);
for(const [state,label] of [['unverified','待確認'],['partial','部分已記帳'],['linked','已記帳'],['unlinked','未記帳']]){
  const model=context.shoppingStatusPresentation(item,{state,linked:1,total:2,allocationStates:[]});
  assert.strictEqual(model.purchaseLabel,'已購買');
  assert.strictEqual(model.ledgerLabel,label);
  assert.strictEqual(model.detailText,'已購買 · '+label);
}
assert.strictEqual(context.shoppingStatusPresentation({done:false},{state:'unlinked'}).purchaseLabel,'待購買');
assert.strictEqual(context.shoppingStatusPresentation(item,{state:'unknown'}).ledgerLabel,'待確認');
assert.strictEqual(context.shoppingStatusPresentation(item,{state:'toString'}).ledgerLabel,'待確認');
assert(!context.shoppingStatusPresentation({done:true},{state:'linked'}).detailText.includes('0 件'));
assert.strictEqual(JSON.stringify(item),before,'display projection never mutates personal shopping records');
console.log('Status clarity tests passed');
