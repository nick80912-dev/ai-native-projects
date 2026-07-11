const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const manifestPath = path.join(root, 'manifest.webmanifest');
const serviceWorkerPath = path.join(root, 'sw.js');
const netlifyPath = path.join(root, 'netlify.toml');
const peachBadgePath = path.join(root, 'okayama-peach-badge.png');

assert.ok(fs.existsSync(indexPath), 'PWA entrypoint index.html exists');
assert.ok(fs.existsSync(manifestPath), 'web app manifest exists');
assert.ok(fs.existsSync(serviceWorkerPath), 'service worker exists');
assert.ok(fs.existsSync(netlifyPath), 'Netlify configuration exists');
assert.ok(fs.existsSync(peachBadgePath), 'header peach badge exists');
const peachBadge = fs.readFileSync(peachBadgePath);
assert.strictEqual(peachBadge.readUInt32BE(16), 256, 'peach badge is 256px wide');
assert.strictEqual(peachBadge.readUInt32BE(20), 256, 'peach badge is 256px high');
assert.ok(!fs.existsSync(path.join(root, 'okayama-traveler-icon.png')), 'rejected traveler asset is absent');

const index = fs.readFileSync(indexPath, 'utf8');
assert.match(index, /<title>TripPilot<\/title>/, 'index uses the TripPilot browser title');
assert.match(index, /<link rel="manifest" href="manifest\.webmanifest">/, 'index links the manifest');
assert.match(index, /<link rel="icon" type="image\/png" sizes="32x32" href="icon-32\.png">/, 'index links the favicon');
assert.match(index, /<link rel="apple-touch-icon" sizes="180x180" href="icon-180\.png">/, 'index links the Apple touch icon');
assert.match(index, /navigator\.serviceWorker\.register\('sw\.js'\)/, 'index registers the service worker');

assert.match(index, /<img class="logo" src="okayama-peach-badge\.png" alt="岡山桃子">/, 'header uses the peach badge');
assert.match(index, /id="brandTitle"/, 'header keeps the dynamic itinerary title');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.start_url, './index.html', 'manifest starts at the deploy entrypoint');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-192.png'), 'manifest includes the 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-512.png'), 'manifest includes the 512px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-192.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-512.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 512px icon');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
assert.match(serviceWorker, /'\.\/icon-maskable-192\.png'/, 'service worker caches the maskable 192px icon');
assert.match(serviceWorker, /'\.\/icon-maskable-512\.png'/, 'service worker caches the maskable 512px icon');

const netlify = fs.readFileSync(netlifyPath, 'utf8');
assert.match(netlify, /for = "\/sw\.js"/, 'Netlify disables caching for the service worker');
assert.match(netlify, /for = "\/index\.html"/, 'Netlify disables stale entrypoint caching');

for (const size of [16, 32, 152, 167, 180, 192, 512]) {
  assert.ok(fs.existsSync(path.join(root, `icon-${size}.png`)), `icon-${size}.png exists`);
}
for (const size of [192, 512]) {
  assert.ok(fs.existsSync(path.join(root, `icon-maskable-${size}.png`)), `icon-maskable-${size}.png exists`);
}

console.log('PWA shell tests passed');
