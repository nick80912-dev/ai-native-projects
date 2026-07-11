const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadSchema(source) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.SCHEMA;
}

const schemaSource = fs.readFileSync('schema.js', 'utf8');
const schema = loadSchema(schemaSource);
const typeColumn = schema.sheets.places.columns.find(function(column) {
  return column.field === 'type';
});

assert(typeColumn, 'Places.Type schema exists');
assert.strictEqual(typeColumn.values['機場'], 'attraction');
assert.strictEqual(typeColumn.values['纜車'], 'attraction');

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes("'機場':'attraction'"), 'embedded schema includes 機場');
assert(html.includes("'纜車':'attraction'"), 'embedded schema includes 纜車');

const mapping = fs.readFileSync('09_SCHEMA_MAPPING.md', 'utf8').replace(/\r/g, '');
const mappingLines = mapping.split('\n');
const generatedStart = mappingLines.findIndex(function(line) {
  return line.indexOf('版本:' + schema.version) === 0;
});
assert.notStrictEqual(generatedStart, -1, 'mapping contains current schema version');
const generatedBody = mappingLines.slice(generatedStart).join('\n').trim();
assert.strictEqual(schemaDocBody(schemaSource), generatedBody);

console.log('schema type tests passed');

function schemaDocBody(source) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.schemaDoc().replace(/^# CMS[^\n]*\n\n/, '').trim();
}
