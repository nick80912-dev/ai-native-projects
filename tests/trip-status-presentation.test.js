const assert=require('assert'),vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
assert(html.includes('function tripStatusPresentation('),'persistent trip status projection exists');
const context={};vm.createContext(context);vm.runInContext(extractFunction(html,'tripStatusPresentation'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
const progress={done:{},skip:{manual:true,auto:true},autoSkip:{auto:true}};
const before=JSON.stringify(progress);
for(const [id,checks,state,label] of [['done',{done:true},'completed','已完成'],['manual',{},'skipped','已略過'],['auto',{},'auto-skipped','自動略過'],['pending',{},'pending','待完成']]){
 assert.deepStrictEqual(plain(context.tripStatusPresentation(id,checks,progress)),{state,label});
}
assert.strictEqual(context.tripStatusPresentation('auto',{auto:true},progress).state,'completed');
assert.strictEqual(JSON.stringify(progress),before);
console.log('Trip status presentation tests passed');
