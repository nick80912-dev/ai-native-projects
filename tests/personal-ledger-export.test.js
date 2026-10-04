const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
assert.ok(html.includes('function personalLedgerExportJson('),'personal-ledger-only exporter must exist');
const record={id:'p-1',time:'2026-10-18T01:00:00.000Z',member:'Bar',category:'購物',detail:'白桃',amountJpy:1200,amountTwd:263,note:'原備註',payMethod:'信用卡',isProxy:true,proxyTarget:'媽媽',inputCurrency:'JPY',isTaxFree:true,priceMode:'included',taxRate:10,couponAmount:0,batchId:'receipt-1',storeName:'岡山店',replacesRecordId:'',token:'DO_NOT_EXPORT',photoId:'private-photo',participants:'other-member'};
let raw=JSON.stringify([record]),mode='active',writes=0;
const ctx={localStorage:{getItem(key){assert.equal(key,'trip_personal_ledger');return raw;},setItem(){writes++;}},PERSONAL_LEDGER_KEY:'trip_personal_ledger',TRIP_SOURCE_SHEET_ID:'sheet-A',DB:{cfg:{tripname:'岡山',startdate:'2026-10-18',enddate:'2026-10-23'}},TripLifecycle:{readState(){return {mode};}},appNow:()=>new Date(),Date,isFinite};
vm.createContext(ctx);
vm.runInContext(extractFunction(html,'projectPersonalLedgerExportRecord')+'\n'+extractFunction(html,'personalLedgerExportJson'),ctx);
const exported=JSON.parse(ctx.personalLedgerExportJson());
assert.equal(exported.format,'trippilot-personal-ledger');assert.equal(exported.version,1);
assert.equal(exported.trip.name,'岡山');assert.equal(exported.records.length,1);
assert.equal(exported.records[0].amountJpy,1200);assert.equal(exported.records[0].amountTwd,263);
assert.equal(exported.records[0].isProxy,true);assert.equal(exported.records[0].proxyTarget,'媽媽');
assert.equal(exported.records[0].storeName,'岡山店');assert.equal(exported.records[0].id,'p-1');
assert.equal(exported.records[0].token,undefined);assert.equal(exported.records[0].photoId,undefined);assert.equal(exported.records[0].participants,undefined);
assert.equal(exported.ledgerQueue,undefined);assert.equal(exported.checks,undefined);assert.equal(writes,0);assert.equal(raw,JSON.stringify([record]));
assert.equal(JSON.parse(ctx.personalLedgerExportJson()).records[0].sourceKey,exported.records[0].sourceKey);
for(const bad of ['', '{broken','{}','null',JSON.stringify([{...record,amountTwd:NaN}]),JSON.stringify([{...record,time:'invalid'}]),JSON.stringify([record,record])]){raw=bad;assert.throws(()=>ctx.personalLedgerExportJson());}
raw=null;assert.equal(JSON.parse(ctx.personalLedgerExportJson()).records.length,0);
for(const change of [{isProxy:'false'},{proxyTarget:{token:'private'}},{note:['private']},{couponAmount:-9},{taxRate:101},{taxRate:'10'},{isTaxFree:null},{inputCurrency:'USD'},{priceMode:'unknown'}]){
 raw=JSON.stringify([{...record,...change}]);assert.throws(()=>ctx.personalLedgerExportJson(),'reject corrupt optional fields without rewriting them');
}
raw=JSON.stringify([{id:record.id,time:record.time,amountJpy:0,amountTwd:0,taxRate:null}]);const legacy=JSON.parse(ctx.personalLedgerExportJson()).records[0];assert.equal(legacy.taxRate,null);assert.equal(legacy.proxyTarget,undefined);
raw=JSON.stringify([record]);mode='inactive';assert.throws(()=>ctx.personalLedgerExportJson());mode='cleanup-pending';assert.throws(()=>ctx.personalLedgerExportJson());
mode='active';ctx.localStorage.getItem=()=>{throw new Error('read failed');};assert.throws(()=>ctx.personalLedgerExportJson(),/read failed/);
console.log('Personal ledger export projection and fail-closed tests passed');
