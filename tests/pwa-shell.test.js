const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const manifestPath = path.join(root, 'manifest.webmanifest');
const serviceWorkerPath = path.join(root, 'sw.js');
const netlifyPath = path.join(root, 'netlify.toml');

assert.ok(fs.existsSync(indexPath), 'PWA entrypoint index.html exists');
assert.ok(fs.existsSync(manifestPath), 'web app manifest exists');
assert.ok(fs.existsSync(serviceWorkerPath), 'service worker exists');
assert.ok(fs.existsSync(netlifyPath), 'Netlify configuration exists');

const index = fs.readFileSync(indexPath, 'utf8');
assert.match(index, /<link rel="manifest" href="manifest\.webmanifest">/, 'index links the manifest');
assert.match(index, /<link rel="icon" type="image\/png" sizes="32x32" href="icon-32\.png">/, 'index links the favicon');
assert.match(index, /<link rel="apple-touch-icon" sizes="180x180" href="icon-180\.png">/, 'index links the Apple touch icon');
assert.match(index, /navigator\.serviceWorker\.register\('sw\.js'\)/, 'index registers the service worker');

const preview = fs.readFileSync(path.join(root, '日本行程V2預覽.html'), 'utf8');
const shellOnlyIndex = index
  .replace(/<link rel="manifest" href="manifest\.webmanifest">\r?\n(?:<link rel="(?:icon|apple-touch-icon)"[^\n]+>\r?\n){6}/, '')
  .replace(/<script>\r?\n\/\* SW 註冊:外殼離線防線\(策略見 sw\.js 檔頭\) \*\/\r?\nif \('serviceWorker' in navigator\) \{\r?\n  window\.addEventListener\('load', function\(\)\{\r?\n    navigator\.serviceWorker\.register\('sw\.js'\)\.catch\(function\(e\)\{\r?\n      if \(window\.AppLog\) AppLog\.sync\('SW 註冊失敗:' \+ \(e && e\.message \? e\.message : e\)\);\r?\n    \}\);\r?\n  \}\);\r?\n\}\r?\n<\/script>\r?\n/, '');
assert.strictEqual(
  shellOnlyIndex.replace(/\r\n/g, '\n'),
  preview.replace(/\r\n/g, '\n'),
  'index keeps the current itinerary implementation and adds only the PWA shell'
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.start_url, './index.html', 'manifest starts at the deploy entrypoint');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-192.png'), 'manifest includes the 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-512.png'), 'manifest includes the 512px icon');

const netlify = fs.readFileSync(netlifyPath, 'utf8');
assert.match(netlify, /for = "\/sw\.js"/, 'Netlify disables caching for the service worker');
assert.match(netlify, /for = "\/index\.html"/, 'Netlify disables stale entrypoint caching');

for (const size of [16, 32, 152, 167, 180, 192, 512]) {
  assert.ok(fs.existsSync(path.join(root, `icon-${size}.png`)), `icon-${size}.png exists`);
}

console.log('PWA shell tests passed');
