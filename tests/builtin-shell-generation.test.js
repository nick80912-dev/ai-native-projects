const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const html=fs.readFileSync(path.resolve(__dirname,'../shell/v112/index.html'),'utf8');
const start=html.indexOf('function builtinAssetState(){');
const end=html.indexOf('\n}\n\nfunction createDataSnapshot',start);
assert(start>=0&&end>start,'builtinAssetState has a stable extraction boundary');
const source=html.slice(start,end+2);

function state(overrides={}){
  const context=Object.assign({
    APP_VERSION:'v111',
    BUILTIN_HTML_VERSION:'v111',
    BUILTIN_HTML_TS:1234,
    BUILTIN_ASSET_VERSION:'v111',
    BUILTIN_TS:1234,
    SHELL_GENERATION_ERROR:'',
    BUILTIN:{itin:'value',places:'value',rest:'value',shop:'value',hotels:'value',exp:'value',ledger:'value',cfg:'value'},
    SHEETS:['itin','places','rest','shop','hotels','exp','ledger','cfg'].map(key=>({key})),
    isFinite
  },overrides);
  context.appVersion=()=>context.APP_VERSION;
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.builtinAssetState();
}

assert.strictEqual(state().ok,true,'matching HTML/App/asset identity is accepted');
assert.strictEqual(state({BUILTIN_HTML_VERSION:'v110'}).ok,false,'HTML/App mismatch is rejected');
assert.strictEqual(state({APP_VERSION:'v110',BUILTIN_ASSET_VERSION:'v110'}).ok,false,'new HTML with matching old App/asset is rejected');
assert.strictEqual(state({BUILTIN_ASSET_VERSION:'v110'}).ok,false,'asset/App mismatch is rejected');
assert.strictEqual(state({BUILTIN_HTML_TS:9999}).ok,false,'HTML/asset timestamp mismatch is rejected');

console.log('BUILTIN shell generation tests passed');
