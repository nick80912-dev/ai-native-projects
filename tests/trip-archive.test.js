const assert=require('assert');
const crypto=require('crypto');
const TripArchive=require('../trip-archive.js');

const sha256=function(text){return Promise.resolve(crypto.createHash('sha256').update(text,'utf8').digest('hex'));};
const sheetNames=['itin','places','rest','shop','hotels','exp','cfg','ledger'];
function fixture(){
  const sheets={};
  sheetNames.forEach(function(name,index){sheets[name]={csv:'header\n'+name+','+index+'\n',sourceTime:'2026-09-30T01:00:00.000Z'};});
  return {
    archiveId:'archive-1',sourceSheetId:'source-1',trip:{name:'岡山四國',startDate:'2026-10-18',endDate:'2026-10-23'},
    archivedAt:'2026-10-24T01:00:00.000Z',sheets:sheets,
    personal:{checks:{P1:true},nextStopProgress:{done:{P1:true}},wants:{S1:true},
      shoppingItems:[{id:'buy-1',name:'桃子',photoId:'photo-secret',allocations:[{member:'Bar',photoId:'nested-secret'}]}],
      personalLedger:[{id:'own-1',amount:100}],proxyTargets:['Jane'],ledgerCategories:['餐飲'],
      ledgerPayMethods:['現金'],shoppingUnits:['盒'],travelNotes:[{id:'note-1',body:'晴天'}],
      member:'Bar',themeId:'peach',ledgerQueue:[{id:'must-not-archive'}],access_token:'secret-token',
      diagnostics:['private-log']}
  };
}

(async function(){
  const source=fixture();
  const sourceBefore=JSON.stringify(source);
  const text=await TripArchive.serialize(source,sha256);
  const parsed=await TripArchive.parseVerified(text,sha256);
  assert.strictEqual(parsed.format,'trippilot-archive');
  assert.strictEqual(parsed.version,1);
  assert.strictEqual(parsed.archiveId,'archive-1');
  assert.strictEqual(parsed.sourceSheetId,'source-1');
  assert.deepStrictEqual(parsed.trip,source.trip);
  assert.strictEqual(parsed.archivedAt,source.archivedAt);
  assert.deepStrictEqual(Object.keys(parsed.sheets),sheetNames);
  assert.deepStrictEqual(parsed.sheets.ledger,source.sheets.ledger);
  assert.deepStrictEqual(parsed.personal.nextStopProgress,{done:{P1:true}});
  assert.strictEqual(parsed.personal.member,'Bar');
  assert.strictEqual(parsed.personal.themeId,'peach');
  assert.ok(/^[0-9a-f]{64}$/.test(parsed.checksum));
  assert.strictEqual(JSON.stringify(source),sourceBefore,'serialization must not modify live trip data');
  assert.ok(!text.includes('photo-secret')&&!text.includes('nested-secret'),'shopping photos must not be archived');
  assert.ok(!text.includes('must-not-archive')&&!text.includes('secret-token')&&!text.includes('private-log'),'queues, tokens and diagnostics must not be archived');

  const changed=JSON.parse(text);
  changed.sheets.ledger.csv+='tampered';
  await assert.rejects(TripArchive.parseVerified(JSON.stringify(changed),sha256),/checksum|integrity/i);
  const missing=fixture();
  delete missing.sheets.cfg;
  await assert.rejects(TripArchive.serialize(missing,sha256),/sheet|cfg|complete/i);
  const missingProgress=fixture();
  delete missingProgress.personal.nextStopProgress;
  await assert.rejects(TripArchive.serialize(missingProgress,sha256),/nextStopProgress|personal|complete/i);
  const wrongFormat=JSON.parse(text);
  wrongFormat.version=2;
  await assert.rejects(TripArchive.parseVerified(JSON.stringify(wrongFormat),sha256),/version|format/i);
  console.log('trip archive tests passed');
})().catch(function(error){console.error(error);process.exitCode=1;});
