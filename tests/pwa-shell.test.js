const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function assertPngSize(filePath, expectedSize) {
  const png = fs.readFileSync(filePath);
  assert.strictEqual(png.readUInt32BE(16), expectedSize, `${path.basename(filePath)} width is ${expectedSize}px`);
  assert.strictEqual(png.readUInt32BE(20), expectedSize, `${path.basename(filePath)} height is ${expectedSize}px`);
}

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
assert.strictEqual(
  sha256(peachBadgePath),
  '0B048181F89CA9D602CC6DCDE07C9242AA0D7CDB87BE47FB82DD72EB2B449D2C',
  'header peach badge remains byte-for-byte unchanged',
);
assert.ok(!fs.existsSync(path.join(root, 'okayama-traveler-icon.png')), 'rejected traveler asset is absent');

const index = fs.readFileSync(indexPath, 'utf8');
assert.match(index, /<title>TripPilot<\/title>/, 'index uses the TripPilot browser title');
assert.match(index, /<link rel="manifest" href="manifest\.webmanifest">/, 'index links the manifest');
assert.match(index, /<link rel="icon" type="image\/png" sizes="32x32" href="icon-32\.png">/, 'index links the favicon');
assert.match(index, /<link rel="apple-touch-icon" sizes="180x180" href="icon-180\.png">/, 'index links the Apple touch icon');
assert.match(index, /navigator\.serviceWorker\.register\('sw\.js'\)/, 'index registers the service worker');

assert.match(index, /<img class="logo" id="diagnosticBadge" src="okayama-peach-badge\.png" alt="岡山桃子">/, 'header uses the diagnostic peach badge');
assert.match(index, /id="brandTitle"/, 'header keeps the dynamic itinerary title');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.start_url, './index.html', 'manifest starts at the deploy entrypoint');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-192.png'), 'manifest includes the 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-512.png'), 'manifest includes the 512px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-192.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 192px icon');
assert.ok(manifest.icons.some((icon) => icon.src === 'icon-maskable-512.png' && icon.purpose === 'maskable'), 'manifest uses the maskable 512px icon');

const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
assert.match(serviceWorker, /var CACHE_NAME = 'okayama-trip-v42';/, 'service worker cache is exactly v42');
assert.doesNotMatch(serviceWorker, /okayama-trip-v18/, 'retired v18 cache is not retained');
assert.match(serviceWorker, /'\.\/icon-maskable-192\.png'/, 'service worker caches the maskable 192px icon');
assert.match(serviceWorker, /'\.\/icon-maskable-512\.png'/, 'service worker caches the maskable 512px icon');

const appBuild = index.match(/var APP_BUILD=/);
assert.strictEqual(appBuild, null, 'retired diagnostic build metadata stays absent');

const netlify = fs.readFileSync(netlifyPath, 'utf8');
assert.match(netlify, /for = "\/sw\.js"/, 'Netlify disables caching for the service worker');
assert.match(netlify, /for = "\/index\.html"/, 'Netlify disables stale entrypoint caching');

for (const size of [16, 32, 120, 152, 167, 180, 192, 512]) {
  const iconPath = path.join(root, `icon-${size}.png`);
  assert.ok(fs.existsSync(iconPath), `icon-${size}.png exists`);
  assertPngSize(iconPath, size);
}
for (const size of [192, 512]) {
  const iconPath = path.join(root, `icon-maskable-${size}.png`);
  assert.ok(fs.existsSync(iconPath), `icon-maskable-${size}.png exists`);
  assertPngSize(iconPath, size);
}
assert.notStrictEqual(
  sha256(path.join(root, 'icon-512.png')),
  '2879A46287F38D9B9AF7DC2E296B54530A41ACA0861B4D2F639C86BDDB061BB6',
  'the legacy 512px PWA icon has been replaced',
);

console.log('PWA shell tests passed');
