const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
assert.ok(html.includes('function personalLedgerExportJson('),'personal-ledger-only exporter must exist');
const record={id:'p-1',time:'2026-10-18T01:00:00.000Z',member:'Bar',category:'購物',detail:'白桃',amountJpy:1200,amountTwd:263,note:'原備註',payMethod:'信用卡',isProxy:true,proxyTarget:'媽媽',inputCurrency:'JPY',isTaxFree:true,priceMode:'included',taxRate:10,couponAmount:0,batchId:'receipt-1',storeName:'岡山店',replacesRecordId:'',token:'DO_NOT_EXPORT',photoId:'private-photo',participants:'other-member'};
let raw=JSON.stringify([record]),mode='active',writes=0;
const ctx={localStorage:{getItem(key){assert.equal(key,'trip_personal_ledger');return raw;},setItem(){writes++;}},PERSONAL_LEDGER_KEY:'trip_personal_ledger',TRIP_SOURCE_SHEET_ID:'sheet-A',DB:{cfg:{tripname:'岡山',startdate:'2026-10-18',enddate:'2026-10-23'}},TripLifecycle:{readState(){return {mode};}},appNow:()=>new Date(),Date,isFinite,
 /* v154：匯出 v2 的團體份額來自與「我的總花費」同一份計算（tests/my-trip-spend.test.js 驗算法） */
 myTripSpendSnapshot:()=>({member:'Bar',personal:{amountJpy:0,amountTwd:0,count:0},proxy:{amountJpy:1200,amountTwd:263,count:1},group:{amountJpy:6000,amountTwd:1260,count:1,pendingCount:1,unattributedCount:2},total:{amountJpy:6000,amountTwd:1260},categories:[],groupItems:[{id:'g/1',time:'2026-10-18T10:30:00.000Z',category:'餐飲',detail:'燒肉晚餐',storeName:'千屋牛',payer:'Amy',payerIsMe:false,participantCount:4,shareJpy:6000,shareTwd:1260,pending:true}]})};
vm.createContext(ctx);
vm.runInContext(extractFunction(html,'projectPersonalLedgerExportRecord')+'\n'+extractFunction(html,'personalLedgerExportJson'),ctx);
const exported=JSON.parse(ctx.personalLedgerExportJson());
assert.equal(exported.format,'trippilot-personal-ledger');assert.equal(exported.version,2,'v154 raises the export format to v2');
assert.deepEqual(exported.groupShare,{member:'Bar',pendingCount:1,unattributedCount:2,items:[{sourceRecordId:'g/1',sourceKey:exported.trip.sourceKey+'/group/g%2F1',time:'2026-10-18T10:30:00.000Z',category:'餐飲',detail:'燒肉晚餐',storeName:'千屋牛',payer:'Amy',participantCount:4,shareJpy:6000,shareTwd:1260,pending:true}]},'v2 carries my group shares with a distinct source key');
assert.deepEqual(exported.totals,{member:'Bar',personalJpy:0,personalTwd:0,proxyJpy:1200,proxyTwd:263,proxyCount:1,groupShareJpy:6000,groupShareTwd:1260,totalJpy:6000,totalTwd:1260},'v2 carries the same totals as the 我的總花費 card');
assert.equal(exported.groupShare.items[0].payerIsMe,undefined,'only the documented group-share fields are exported');
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
/* v150:新旅程的匯出用 sheet:<Trip ID> 識別來源,岡山沿用編輯用 ID */
{
 const sheetCtx={...ctx,localStorage:{getItem(){return JSON.stringify([record]);}},currentTripSourceSheetId:()=>'sheet:kyushu-2027'};
 vm.createContext(sheetCtx);
 vm.runInContext(extractFunction(html,'projectPersonalLedgerExportRecord')+'\n'+extractFunction(html,'personalLedgerExportJson'),sheetCtx);
 mode='active';
 const sheetExport=JSON.parse(sheetCtx.personalLedgerExportJson());
 assert.equal(sheetExport.trip.sourceSheetId,'sheet:kyushu-2027');
 assert.equal(sheetExport.trip.sourceKey,JSON.stringify(['sheet:kyushu-2027','2026-10-18','2026-10-23']));
 assert.ok(sheetExport.records[0].sourceKey.indexOf('sheet:kyushu-2027')>=0,'records carry the new trip identity');
 assert.equal(exported.trip.sourceSheetId,'sheet-A','legacy export keeps TRIP_SOURCE_SHEET_ID');
}
assert.match(html,/function currentTripSourceSheetId\(\)\{return isLegacyTripSource\(\)\?TRIP_SOURCE_SHEET_ID:currentTripSourceKey\(\);\}/,'archive and export share one source-id rule');
assert.match(html,/var archiveInput=\{sourceSheetId:currentTripSourceSheetId\(\),/,'archives record the current trip');
console.log('Personal ledger export projection and fail-closed tests passed');
