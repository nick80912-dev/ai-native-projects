const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {validateRuntimeAssets}=require('../tools/check-runtime-assets.js');

function fixture(overrides={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'trip-runtime-assets-'));
  const files={
    'a.js':'var A=true;',
    'schema.js':'var SCHEMA={};',
    'index.html':'<script src="a.js"></script>\n/* ===== schema.js(部署為獨立檔)===== */',
    'sw.js':"var SHELL = ['./a.js','./schema.js'];",
    'README.md':'- `a.js`\n- `schema.js`',
    '.ai-manifest.json':JSON.stringify({files:{'a.js':'A','schema.js':'schema'},deploy_files:{'a.js':'A','schema.js':'schema'}})
  };
  Object.keys(Object.assign(files,overrides)).forEach(name=>{
    const value=Object.assign({},files,overrides)[name];
    if(value===null)return;
    const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);
  });
  return root;
}

let result=validateRuntimeAssets({rootDir:fixture(),inventory:{assets:['a.js','schema.js']}});
assert.deepStrictEqual(result,{ok:true,errors:[],assets:['a.js','schema.js']});

result=validateRuntimeAssets({rootDir:fixture(),inventory:{assets:['a.js','a.js','style.css']}});
assert.strictEqual(result.ok,false);
assert(result.errors.includes('runtime-assets.json has duplicate asset: a.js'));
assert(result.errors.includes('runtime-assets.json asset is not JavaScript: style.css'));

result=validateRuntimeAssets({rootDir:fixture({'a.js':null}),inventory:{assets:['a.js','schema.js']}});
assert(result.errors.includes('runtime asset file is missing: a.js'));

result=validateRuntimeAssets({rootDir:fixture({'index.html':'/* ===== schema.js(部署為獨立檔)===== */'}),inventory:{assets:['a.js','schema.js']}});
assert(result.errors.includes('index.html does not reference runtime asset: a.js'));

result=validateRuntimeAssets({rootDir:fixture({'sw.js':"var SHELL = ['./schema.js'];"}),inventory:{assets:['a.js','schema.js']}});
assert(result.errors.includes('sw.js SHELL does not include runtime asset: a.js'));

result=validateRuntimeAssets({rootDir:fixture({'README.md':'- `schema.js`'}),inventory:{assets:['a.js','schema.js']}});
assert(result.errors.includes('README.md does not document runtime asset: a.js'));

result=validateRuntimeAssets({
  rootDir:fixture({'.ai-manifest.json':JSON.stringify({files:{'schema.js':'schema'},deploy_files:{'a.js':'A','schema.js':'schema'}})}),
  inventory:{assets:['a.js','schema.js']}
});
assert(result.errors.includes('.ai-manifest.json files does not cover runtime asset: a.js'));

result=validateRuntimeAssets({
  rootDir:fixture({'.ai-manifest.json':JSON.stringify({files:{'a.js':'A','schema.js':'schema'},deploy_files:{'schema.js':'schema'}})}),
  inventory:{assets:['a.js','schema.js']}
});
assert(result.errors.includes('.ai-manifest.json deploy_files does not cover runtime asset: a.js'));

const realRoot=path.resolve(__dirname,'..');
const realInventory=JSON.parse(fs.readFileSync(path.join(realRoot,'runtime-assets.json'),'utf8'));
result=validateRuntimeAssets({rootDir:realRoot,inventory:realInventory});
assert.deepStrictEqual(result.errors,[],'the repository runtime inventory is fully registered');

console.log('runtime asset authority tests passed');
