const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

const fixture=fs.readFileSync(path.join(__dirname,'fixtures','sw-v110-production.js'));
const sha256=crypto.createHash('sha256').update(fixture).digest('hex').toUpperCase();
assert.strictEqual(sha256,'F3936BF9872ACCE3223672892B72F5AFD878CD160E770A0776ECC0485B2E4553','fixture remains the exact origin/main v110 production worker bytes');
assert.match(String(fixture),/var SW_VERSION='v110';/,'fixture identifies v110');
assert.match(String(fixture),/caches\.open\(CACHE_NAME\)[\s\S]*c\.put\(e\.request, clone\)/,'fixture retains the deployed network-first cache mutation behavior');
console.log('v110 production worker fixture tests passed');
