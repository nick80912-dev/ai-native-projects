const assert=require('assert');
const tool=require('../tools/refresh-builtin-snapshot.js');

function completeSnapshot(){
  return {
    cfg:'Key,Value\nTrip Name,Okayama\n',
    ledger:'id,member\n',
    exp:'members\n',
    hotels:'HID,name\n',
    shop:'SID,name\n',
    rest:'RID,name\n',
    places:'PID,name\n',
    itin:'date,title\n'
  };
}

const exact=tool.serializeBuiltinAsset({timestamp:1234,snapshot:{itin:'A\n',ledger:'header\n'}},'v111');
assert.strictEqual(exact,
  "var BUILTIN_TS=1234;\n"+
  "var BUILTIN_ASSET_VERSION='v111';\n"+
  "var BUILTIN={\"itin\":\"A\\n\",\"ledger\":\"header\\n\"};\n"
);

const snapshot=completeSnapshot();
const before=JSON.stringify(snapshot);
const serialized=tool.serializeBuiltinAsset({timestamp:5678,snapshot:snapshot},'v111');
assert.strictEqual(JSON.stringify(snapshot),before,'serialization never mutates the candidate');
assert(serialized.indexOf('{"itin":')<serialized.indexOf('"places":'),'generated keys follow the canonical order');
assert(serialized.indexOf('"ledger":')<serialized.indexOf('"cfg":'),'Ledger remains before cfg in the canonical order');

const parsed=tool.readBuiltinAsset(serialized);
assert.deepStrictEqual(parsed,{timestamp:5678,appVersion:'v111',snapshot:{
  itin:'date,title\n',places:'PID,name\n',rest:'RID,name\n',shop:'SID,name\n',
  hotels:'HID,name\n',exp:'members\n',ledger:'id,member\n',cfg:'Key,Value\nTrip Name,Okayama\n'
}});

const missing=completeSnapshot();
delete missing.hotels;
assert.throws(
  ()=>tool.readBuiltinAsset(tool.serializeBuiltinAsset({timestamp:1,snapshot:missing},'v111')),
  /missing sheet: hotels/i
);

const nonEmptyLedger=completeSnapshot();
nonEmptyLedger.ledger='id,member\nrow,value\n';
assert.throws(
  ()=>tool.readBuiltinAsset(tool.serializeBuiltinAsset({timestamp:1,snapshot:nonEmptyLedger},'v111')),
  /ledger.*header-only/i
);

assert.throws(()=>tool.readBuiltinAsset("var BUILTIN_TS=1;\nvar BUILTIN={};\n"),/version/i);
assert.throws(()=>tool.readBuiltinAsset(serialized+'window.extra=true;\n'),/format/i);

console.log('BUILTIN generated asset contract passed');
