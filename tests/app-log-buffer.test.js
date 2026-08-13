const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

function plain(value){return JSON.parse(JSON.stringify(value));}

const consoleCalls=[];
class TestDate extends Date{
  constructor(value){super(value===undefined?'2026-08-09T01:02:03.000Z':value);}
  static now(){return Date.parse('2026-08-09T01:02:03.000Z');}
}
const sandbox={
  console:{
    warn(message){consoleCalls.push({level:'warn',message:String(message)});},
    error(message){consoleCalls.push({level:'error',message:String(message)});},
    log(message){consoleCalls.push({level:'log',message:String(message)});}
  },
  Date:TestDate,
  appNow(){return new TestDate();},
  String,Number,Boolean,Array,Object,Math,JSON,isFinite,
  SCHEMA:{sheets:{places:{label:'Places',columns:[],idField:'placeId'}}},
  RAW:{},
  DB:{
    placeList:[],rest:[],shop:[],hotels:[],trip:{days:[{date:'08/09',items:[]}]},
    cfg:{tripname:'Trip',startdate:'2026-08-09',enddate:'2026-08-09',travelmode:'drive',exchangeRate:'0.2',ledgerDefaultCurrency:'JPY'}
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('validator.js','utf8'),sandbox);

const methods={
  schema:['warn','[Schema Error] ','schema'],
  parser:['warn','[Parser Error] ','parser'],
  data:['warn','[Data Error] ','data'],
  repo:['warn','[Repository Error] ','repository'],
  render:['error','[Render Error] ','render'],
  sync:['warn','[Sync Error] ','sync']
};
Object.keys(methods).forEach(function(name){sandbox.AppLog[name]('sample-'+name);});
assert.deepStrictEqual(plain(sandbox.AppLog.snapshot()).map(function(entry){return entry.category;}),
  ['schema','parser','data','repository','render','sync'],'six public methods retain their approved category');
Object.keys(methods).forEach(function(name,index){
  assert.strictEqual(consoleCalls[index].level,methods[name][0],name+' preserves its console level');
  assert.strictEqual(consoleCalls[index].message,methods[name][1]+'sample-'+name,name+' preserves its console prefix');
});

sandbox.AppLog.clear();
for(let index=0;index<101;index++)sandbox.AppLog.repo('entry-'+index);
const entries=plain(sandbox.AppLog.snapshot());
assert.strictEqual(entries.length,100,'the session buffer stays bounded at 100 entries');
assert.strictEqual(entries[0].message,'entry-1','the oldest entry is evicted first');
assert.strictEqual(entries[99].message,'entry-100','the newest entry is retained');
assert.deepStrictEqual(entries[0],{
  at:'2026-08-09T01:02:03.000Z',category:'repository',level:'warn',message:'entry-1'
},'entries expose the stable diagnostic shape');

delete sandbox.appNow;
sandbox.AppLog.repo('clock unavailable');
assert.strictEqual(plain(sandbox.AppLog.snapshot()).slice(-1)[0].at,'','a missing shared clock degrades to an empty timestamp');
sandbox.appNow=function(){return new TestDate();};

const longMessage='x'.repeat(1001);
sandbox.AppLog.render(longMessage);
const bounded=plain(sandbox.AppLog.snapshot());
assert.strictEqual(bounded[bounded.length-1].message.length,1000,'stored messages have a hard character bound');
assert.strictEqual(consoleCalls[consoleCalls.length-1].message,'[Render Error] '+longMessage,'console still receives the complete message');

const external=plain(sandbox.AppLog.snapshot());
external[0].message='mutated';
assert.notStrictEqual(plain(sandbox.AppLog.snapshot())[0].message,'mutated','snapshot callers cannot rewrite the buffer');

sandbox.AppLog.clear();
sandbox.AppLog.clear();
assert.deepStrictEqual(plain(sandbox.AppLog.snapshot()),[],'clearing an empty buffer is a safe no-op');
const findings=plain(sandbox.currentHealthFindings());
assert.deepStrictEqual(findings,['資料缺席:工作表 Places 無任何資料來源(內建/快取/線上皆空)']);
assert.strictEqual(plain(sandbox.AppLog.snapshot()).length,0,'silent health lookup does not create AppLog entries');
assert.deepStrictEqual(plain(sandbox.healthCheck()),findings,'healthCheck keeps returning the same message list');
assert.strictEqual(plain(sandbox.AppLog.snapshot()).length,1,'public healthCheck still reports findings through AppLog');
assert.strictEqual(plain(sandbox.AppLog.snapshot())[0].category,'data');

console.log('AppLog session buffer tests passed');
