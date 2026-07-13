const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('validator.js', 'utf8');

function runValidation(ref){
  const logs = [];
  const sandbox = {
    DB: {
      placeList: [],
      rest: [
        { restId:'R012', name:'手打烏龍麵 Musashi' },
        { restId:'R013', name:'Kompira Pudding' }
      ],
      shop: [],
      trip: { days:[{ date:'10/21', items:[{
        act:'午餐時間',
        place:'手打烏龍麵 Musashi',
        ref:ref
      }] }] }
    },
    SCHEMA: { sheets:{} },
    RAW: {},
    AppLog: { data:function(msg){ logs.push(msg); } },
    console: { log:function(){}, warn:function(){} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {
    health: sandbox.healthCheck(),
    structured: sandbox.validateSnapshotData(sandbox.DB, sandbox.RAW, sandbox.SCHEMA)
  };
}

const mismatchResult = runValidation('R013');
const mismatch = mismatchResult.health;
assert(
  mismatch.some(function(f){
    return f.indexOf('引用名稱不一致') >= 0 &&
      f.indexOf('R013') >= 0 &&
      f.indexOf('手打烏龍麵 Musashi') >= 0 &&
      f.indexOf('Kompira Pudding') >= 0;
  }),
  'an itinerary restaurant name that conflicts with its RID is reported'
);
assert(
  mismatchResult.structured.blockers.some(function(f){ return f.code === 'REF_NAME_MISMATCH'; }),
  'a restaurant name conflict is classified as REF_NAME_MISMATCH'
);

const consistent = runValidation('R012').health;
assert.strictEqual(
  consistent.some(function(f){ return f.indexOf('引用名稱不一致') >= 0; }),
  false,
  'a matching itinerary restaurant name and RID is accepted'
);

console.log('data reference consistency tests passed');
