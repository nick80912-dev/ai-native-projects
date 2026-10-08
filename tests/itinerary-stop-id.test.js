/* tests/itinerary-stop-id.test.js — v149 選填「行程ID」欄（ADR 0021，規格 §4 決策 5）
   位置型 ID「MM/DD_第幾列」在增刪列時會讓打卡與下一站錯位；新旅程範本可在第 8 欄填行程ID。
   這裡用 index.html 與 validator.js 的真實實作驗證：依標題名稱找欄、沒填就退回位置型、
   格式與重複由驗證擋下、岡山試算表（沒有這欄）照常通過。 */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const root=path.resolve(__dirname,'..');
const html=readIndexHtml();

function loadRuntime(){
  const sandbox={console,AppLog:{schema(){},data(){}},parseLedgerSheetCsv(){return [];}};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'schema.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'validator.js'),'utf8'),sandbox);
  const names=['parseCSV','parseTable','parseKeyValue','schemaType','buildItin','parseExpensesFree','createDB','validateCandidateStructure'];
  vm.runInContext(names.map(name=>extractFunction(html,name)).join('\n')+
    '\nfunction normType(value){return schemaType(value);}\nvar SHEETS=Object.keys(SCHEMA.sheets).map(function(key){return {key:key};});',sandbox);
  return sandbox;
}
function plain(value){return JSON.parse(JSON.stringify(value));}
function readBuiltin(){
  const source=fs.readFileSync(path.join(path.dirname(require.resolve('./support/source')),'..','..','shell',require('./support/version').swVersion(),'builtin-snapshot.js'),'utf8');
  const sandbox={};
  vm.runInNewContext(source,sandbox);
  return plain(sandbox.BUILTIN);
}

const rt=loadRuntime();

/* ---- 解析：依標題名稱找欄，沒填退回位置型 ---- */
{
  const rows=[
    ['九州五日'],
    ['日期','時間','行程','地點','ID','交通','備註','行程ID'],
    ['第一天3/01(一)','','','','','',''],
    ['','09:00','出發','福岡機場','P001','','','dep-airport'],
    ['','12:00','午餐','屋台','','','',''],
    ['第二天3/02(二)','','','','','',''],
    ['','10:00','太宰府','太宰府天滿宮','P002','','','dazaifu']
  ];
  const trip=plain(rt.buildItin(rows));
  assert.deepStrictEqual(trip.days.map(day=>day.items.map(item=>item.id)),[['dep-airport','03/01_1'],['dazaifu']],
    'explicit 行程ID wins; blank rows fall back to the positional id');
  assert.strictEqual(trip.days[0].items[0].stopId,'dep-airport');
  assert.strictEqual(trip.days[0].items[1].stopId,undefined,'no stopId when the cell is blank');
}
{
  /* 岡山試算表：只有 7 欄標題。第 8 欄就算有雜訊也不能被當成行程ID */
  const rows=[
    ['岡山四國'],
    ['日期','時間','行程','地點','ID','交通','備註'],
    ['第一天10/18(日)','','','','','',''],
    ['','09:00','出發','岡山機場','P001','','','stray-note']
  ];
  const trip=plain(rt.buildItin(rows));
  assert.deepStrictEqual(trip.days[0].items.map(item=>item.id),['10/18_0'],'without the header the column is ignored');
  assert.strictEqual(trip.days[0].items[0].stopId,undefined);
}
{
  /* 依名稱，不依位置 */
  const rows=[
    ['九州五日'],
    ['日期','時間','行程','地點','ID','交通','備註','其他','行程ID'],
    ['第一天3/01(一)','','','','','',''],
    ['','09:00','出發','福岡機場','P001','','','x','dep-airport']
  ];
  assert.deepStrictEqual(plain(rt.buildItin(rows)).days[0].items.map(item=>item.id),['dep-airport']);
}

/* ---- 驗證：格式與重複 ---- */
const builtin=readBuiltin();
function validate(mutate){
  const db=plain(rt.createDB(builtin));
  mutate(db);
  return plain(rt.validateSnapshotData(db,builtin,rt.SCHEMA)).blockers.map(finding=>finding.code);
}
assert.deepStrictEqual(validate(()=>{}),[],'the Okayama BUILTIN still validates');
assert.deepStrictEqual(validate(db=>{db.trip.days[0].items[0].stopId='ok_id-1';}),[],'a well-formed id passes');
assert.deepStrictEqual(validate(db=>{db.trip.days[0].items[0].stopId='有 空白';}),['STOP_ID_FORMAT']);
assert.deepStrictEqual(validate(db=>{db.trip.days[0].items[0].stopId='x'.repeat(41);}),['STOP_ID_FORMAT'],'max 40 characters');
assert.deepStrictEqual(validate(db=>{db.trip.days[0].items[0].stopId='same';db.trip.days[1].items[0].stopId='same';}),['STOP_ID_DUPLICATE']);

/* ---- 結構檢查：行程ID 是選填欄 ---- */
{
  const okayama=plain(rt.validateCandidateStructure(builtin));
  assert.deepStrictEqual(okayama.blockers,[],'a Sheet without 行程ID has no structure blocker');
  const withColumn=Object.assign({},builtin,{itin:builtin.itin.replace('日期,時間,行程,地點,ID,交通,備註','日期,時間,行程,地點,ID,交通,備註,行程ID')});
  assert.notStrictEqual(withColumn.itin,builtin.itin,'fixture adds the header');
  const result=plain(rt.validateCandidateStructure(withColumn));
  assert.deepStrictEqual(result.blockers,[]);
  assert(!result.warnings.some(finding=>/行程ID/.test(finding.message)),'行程ID is a known column, not an unknown-header warning');
}

console.log('itinerary stop id tests passed');
