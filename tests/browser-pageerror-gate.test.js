const assert=require('assert');
const fs=require('fs');
const path=require('path');

const browserRoot=path.resolve(__dirname,'browser');
const specs=fs.readdirSync(browserRoot).filter(name=>name.endsWith('.spec.js'));
assert(specs.length>0,'browser specs exist');
specs.forEach(name=>{
  const source=fs.readFileSync(path.join(browserRoot,name),'utf8');
  assert(source.includes("require('./support/test')"),name+' must use the global browser fixture');
  assert(!source.includes("require('@playwright/test')"),name+' must not bypass the global browser fixture');
  if(/\.newPage\(\)/.test(source))assert(source.includes('trackPageErrors('),name+' must track pageerrors on every manually created page');
});

const fixturePath=path.join(browserRoot,'support','test.js');
assert(fs.existsSync(fixturePath),'global browser fixture exists');
const fixture=fs.readFileSync(fixturePath,'utf8');
assert.match(fixture,/page\.on\('pageerror'/,'fixture observes every pageerror');
assert.match(fixture,/expect\(errors[\s\S]*toEqual\(\[\]\)/,'fixture fails the owning test when page errors occur');
assert.match(fixture,/function trackPageErrors\(/,'fixture exports tracking for manually created pages');

console.log('Browser pageerror gate tests passed');
