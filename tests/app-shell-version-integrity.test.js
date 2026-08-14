const assert=require('assert');
const checker=require('../tools/check-app-version.js');

function fixture(overrides={}){
  return Object.assign({
    appVersion:"var APP_VERSION='v111';\n",
    sw:"var SW_VERSION='v111';\nvar CACHE_NAME='okayama-trip-'+SW_VERSION;\n",
    asset:"var BUILTIN_TS=1234;\nvar BUILTIN_ASSET_VERSION='v111';\nvar BUILTIN={};\n",
    index:"<script id=\"builtinSnapshotMarker\">var BUILTIN_HTML_VERSION='v111';var BUILTIN_HTML_TS=1234;</script>\n"+
      "/* ---- APP_VERSION SAFE ACCESS (C2) ----\nfunction appVersion(){}\nfunction appVersionLabel(){}\n/* ---- /APP_VERSION SAFE ACCESS ---- */\n"+
      "var APP_RELEASE_NOTES=[{version:'v111'}];\n",
    netlify:'[[headers]]\n  for = "/app-version.js"\n'
  },overrides);
}

assert.strictEqual(typeof checker.checkVersionIntegrity,'function','checker exports a reusable validator');
assert.deepStrictEqual(checker.checkVersionIntegrity(fixture()),[],'matching HTML/App/asset/SW identity passes');

[
  ['HTML version', {index:fixture().index.replace("BUILTIN_HTML_VERSION='v111'","BUILTIN_HTML_VERSION='v110'")}],
  ['HTML timestamp', {index:fixture().index.replace('BUILTIN_HTML_TS=1234','BUILTIN_HTML_TS=9999')}],
  ['asset version', {asset:fixture().asset.replace("BUILTIN_ASSET_VERSION='v111'","BUILTIN_ASSET_VERSION='v110'")}],
  ['SW version', {sw:fixture().sw.replace("SW_VERSION='v111'","SW_VERSION='v110'")}]
].forEach(([label,override])=>{
  const errors=checker.checkVersionIntegrity(fixture(override));
  assert(errors.length>0,label+' mismatch must fail: '+JSON.stringify(errors));
});

console.log('App Shell version integrity tests passed');
