const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
assert(html.includes('function ledgerDeliveryPresentation('),'ledger delivery projection is available');
const sandbox={};vm.createContext(sandbox);
vm.runInContext(extractFunction(html,'ledgerDeliveryPresentation'),sandbox);
const plain=value=>JSON.parse(JSON.stringify(value));
const record={id:'r1'};
const cases=[
  [{track:'personal',queue:[],bridge:[],cloud:[]},{state:'local',label:'已存本機'}],
  [{track:'shared',queue:[record],bridge:[record],cloud:[record]},{state:'pending',label:'待送出'}],
  [{track:'shared',queue:[],bridge:[record],cloud:[record]},{state:'accepted',label:'伺服器已接收，等待讀回'}],
  [{track:'shared',queue:[],bridge:[],cloud:[record]},{state:'readback',label:'已從伺服器讀回'}],
  [{track:'shared',queue:[],bridge:[],cloud:[{id:'other'}]},{state:'unknown',label:'待確認'}]
];
for(const [evidence,expected] of cases){
 const before=JSON.stringify(evidence);
 assert.deepStrictEqual(plain(sandbox.ledgerDeliveryPresentation('r1',evidence)),expected);
 assert.strictEqual(JSON.stringify(evidence),before);
}
assert.strictEqual(sandbox.ledgerDeliveryPresentation('',{track:'shared',cloud:[{}]}).state,'unknown');
console.log('Ledger delivery presentation tests passed');
