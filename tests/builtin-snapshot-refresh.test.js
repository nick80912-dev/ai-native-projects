const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const tool=require('../tools/refresh-builtin-snapshot.js');

function schemaFixture(pubBase='https://example.test/?gid='){
  return {
    pubBase,
    fetchTimeoutMs:1000,
    sheets:{
      itin:{gid:'1',kind:'itinerary',columns:['日期','時間','行程','地點','ID','交通','備註'].map(header=>({header}))},
      places:{gid:'2',kind:'table',columns:['PID','地點'].map(header=>({header}))},
      rest:{gid:'3',kind:'table',columns:['RID','餐廳名稱'].map(header=>({header}))},
      shop:{gid:'4',kind:'table',columns:['SID','PID','品牌名稱'].map(header=>({header}))},
      hotels:{gid:'5',kind:'table',columns:['HID','名稱'].map(header=>({header}))},
      exp:{gid:'6',kind:'freeform-expense',layout:{membersRowMark:'同行成員'}},
      ledger:{gid:'7',kind:'table',columns:['紀錄ID','時間','成員','類別'].map(header=>({header}))},
      cfg:{gid:'8',kind:'keyvalue',keys:[
        ['tripname','Trip Name'],['startdate','Start Date'],['enddate','End Date'],
        ['travelmode','Travel Mode'],['currency','Currency'],['homepage','Home Page'],
        ['exchangerate','Exchange Rate'],['ledgerdefaultcurrency','Ledger Default Currency']
      ].map(([field,header])=>({field,header}))}
    }
  };
}

function csvFixture(){
  return {
    itin:[
      '2026.10.18-10.23岡山四國六天五夜,,,,,,',
      '飯店,岡山住宿,,,,,',
      '日期,時間,行程,地點,ID,交通,備註',
      ',第一天10/18(日),岡山機場,岡山機場,P001,,',
      ',第二天10/19(一),廣島,廣島城,P002,,',
      '第三天10/20(二),,高松,高松城,P003,,',
      '第四天10/21(三),,祖谷,祖谷溪,P004,,',
      '第五天10/22(四),,直島,直島,P005,,',
      '第六天10/23(五),,返程,岡山機場,P001,,'
    ].join('\n')+'\n',
    places:'PID,地點\nP001,岡山機場\n',
    rest:'RID,餐廳名稱\nR001,烏龍麵\n',
    shop:'SID,PID,品牌名稱\nS001,P001,伴手禮店\n',
    hotels:'HID,名稱\nH001,岡山住宿\n',
    exp:'同行成員:,Bar,Amy\n交通,機票\n',
    cfg:[
      'Key,Value','Trip Name,岡山四國六天五夜','Start Date,2026-10-18',
      'End Date,2026-10-23','Travel Mode,Driving','Currency,JPY','Home Page,Today',
      'Exchange Rate,0.2','Ledger Default Currency,JPY'
    ].join('\n')+'\n'
  };
}

function indexSource(snapshot,timestamp=1,legacyMutations=true){
  return '<script>\nvar BUILTIN_TS = '+timestamp+';\nvar BUILTIN = '+JSON.stringify(snapshot)+';\n'+
    (legacyMutations?"BUILTIN.cfg+='Exchange Rate,0.2\\nLedger Default Currency,JPY\\n';\nBUILTIN.ledger='紀錄ID,時間,成員\\n';\n":'')+
    '</script>\n';
}

function makeRoot(snapshot,legacyMutations=true){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'trip-builtin-refresh-'));
  fs.writeFileSync(path.join(root,'schema.js'),'var SCHEMA='+JSON.stringify(schemaFixture())+';\n');
  fs.writeFileSync(path.join(root,'index.html'),indexSource(snapshot,1,legacyMutations));
  return root;
}

function capture(){
  const lines=[];
  return {lines,write(text){lines.push(String(text));}};
}

(async function(){
  const schema=schemaFixture();
  const csv=csvFixture();
  const requested=[];
  const candidate=await tool.buildBuiltinCandidate({
    schema,
    fetchCsv:async function(key){
      if(key==='ledger')throw new Error('live ledger must not be requested');
      requested.push(key);
      return csv[key];
    }
  });
  assert.deepStrictEqual(requested,['itin','places','rest','shop','hotels','exp','cfg']);
  assert.deepStrictEqual(Object.keys(candidate),['itin','places','rest','shop','hotels','exp','ledger','cfg']);
  assert.strictEqual(candidate.ledger,'紀錄ID,時間,成員,類別\n');
  assert.strictEqual(candidate.itin.includes('東京'),false);

  const parsed=tool.parseCsv('A,B\r\n"含,逗號","含""引號"\r\n"跨\n列",值\r\n');
  assert.deepStrictEqual(parsed,[['A','B'],['含,逗號','含"引號'],['跨\n列','值']]);

  const stale=Object.assign({},candidate,{itin:candidate.itin+'東京舊資料\n'});
  const previewRoot=makeRoot(stale);
  const previewBefore=fs.readFileSync(path.join(previewRoot,'index.html'),'utf8');
  const preview=await tool.runRefresh({
    rootDir:previewRoot,
    write:false,
    fetchCsv:async key=>csv[key],
    now:()=>1234,
    stdout:capture(),stderr:capture()
  });
  assert.strictEqual(preview.exitCode,2,'preview reports drift');
  assert.deepStrictEqual(preview.changedKeys,['itin','ledger','cfg']);
  assert.strictEqual(fs.readFileSync(path.join(previewRoot,'index.html'),'utf8'),previewBefore,'preview never writes');

  const currentRoot=makeRoot(candidate,false);
  const current=await tool.runRefresh({
    rootDir:currentRoot,write:false,fetchCsv:async key=>csv[key],now:()=>1234,
    stdout:capture(),stderr:capture()
  });
  assert.strictEqual(current.exitCode,0,'matching snapshot has no drift');
  assert.deepStrictEqual(current.changedKeys,[]);

  const writeRoot=makeRoot(stale);
  const written=await tool.runRefresh({
    rootDir:writeRoot,write:true,fetchCsv:async key=>csv[key],now:()=>1234,
    stdout:capture(),stderr:capture()
  });
  assert.strictEqual(written.exitCode,0);
  const writtenSource=fs.readFileSync(path.join(writeRoot,'index.html'),'utf8');
  assert.strictEqual(writtenSource.includes('BUILTIN.cfg+='),false,'write removes the legacy cfg append');
  assert.strictEqual(writtenSource.includes('BUILTIN.ledger='),false,'write removes the legacy Ledger overwrite');
  const embedded=tool.readEmbeddedBuiltin(writtenSource);
  assert.strictEqual(embedded.timestamp,1234);
  assert.deepStrictEqual(embedded.snapshot,candidate);

  const invalidHeader=Object.assign({},csv,{places:'WRONG,地點\nP001,岡山機場\n'});
  await assert.rejects(()=>tool.buildBuiltinCandidate({schema,fetchCsv:async key=>invalidHeader[key]}),/places.*header/i);

  const missingCfg=Object.assign({},csv,{cfg:csv.cfg.replace('Exchange Rate,0.2\n','')});
  await assert.rejects(()=>tool.buildBuiltinCandidate({schema,fetchCsv:async key=>missingCfg[key]}),/Exchange Rate/);

  const tokyo=Object.assign({},csv,{itin:csv.itin.replace('高松城','東京新宿')});
  await assert.rejects(()=>tool.buildBuiltinCandidate({schema,fetchCsv:async key=>tokyo[key]}),/東京|新宿/);

  const failedRoot=makeRoot(stale);
  const failedBefore=fs.readFileSync(path.join(failedRoot,'index.html'));
  const failed=await tool.runRefresh({
    rootDir:failedRoot,write:true,
    fetchCsv:async key=>{if(key==='shop')throw new Error('shop unavailable');return csv[key];},
    now:()=>1234,stdout:capture(),stderr:capture()
  });
  assert.strictEqual(failed.exitCode,1);
  assert.deepStrictEqual(fs.readFileSync(path.join(failedRoot,'index.html')),failedBefore,'failed refresh preserves target bytes');

  assert.deepStrictEqual(tool.parseArgs([]),{write:false});
  assert.deepStrictEqual(tool.parseArgs(['--write']),{write:true});
  assert.throws(()=>tool.parseArgs(['--unknown']),/Usage:/);

  console.log('BUILTIN snapshot refresh tool tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
