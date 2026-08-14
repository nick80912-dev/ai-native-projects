/* tests/browser/support/versioned-server.js
   ============================================================
   模擬 GitHub Pages 的可快取靜態站,用來回歸 2026-07-30 實測到的 SW 更新缺陷:
   新版 Service Worker 的 install 會從 **HTTP cache** 取得舊版 SHELL,導致
   「新快取名稱裝舊版內容」與「新版 index.html 配舊版 schema.js」的靜默混版本。

   與 static-server.js 的差別(刻意的,不可合併):
     - 一律送 Cache-Control: max-age=600(static-server 送 no-store,測不出這個缺陷)
     - 可切換世代:同一組 URL 回不同內容,模仿「同 URL 部署新版」

   世代標記注入方式(全部可在 runtime 觀測,且必然改變位元組):
     sw.js          SW_VERSION  → '<指定版本>-QAGEN<N>'   (連帶決定 CACHE_NAME)
     app-version.js APP_VERSION → '<指定版本>-QAGEN<N>'
     index.html     </body> 前插入 var QA_INDEX_GEN
     schema.js      檔尾追加  var QA_SCHEMA_GEN
   ============================================================ */
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

function createVersionedServer(options) {
  options = options || {};
  const state = { generation: options.generation || 1 };
  const basePath = ('/' + String(options.basePath || '').replace(/^\/+|\/+$/g, '') + '/').replace(/^\/\/$/, '/');

  function transform(relativePath, buffer) {
    const tag = 'QAGEN' + state.generation;
    const configuredVersion = options.versions && options.versions[state.generation];
    const resourceVersion = options.resourceVersions && options.resourceVersions[state.generation] && options.resourceVersions[state.generation][relativePath];
    const effectiveVersion = resourceVersion || configuredVersion;
    if (relativePath === 'sw.js') {
      return Buffer.from(String(buffer).replace(/var SW_VERSION='([^']+)';/, (_, current) => "var SW_VERSION='" + (effectiveVersion || current) + '-' + tag + "';"));
    }
    if (relativePath === 'app-version.js') {
      return Buffer.from(String(buffer).replace(/var APP_VERSION='([^']+)';/, (_, current) => "var APP_VERSION='" + (effectiveVersion || current) + '-' + tag + "';"));
    }
    if (relativePath === 'builtin-snapshot.js') {
      return Buffer.from(String(buffer).replace(/var BUILTIN_ASSET_VERSION='([^']+)';/, (_, current) => "var BUILTIN_ASSET_VERSION='" + (effectiveVersion || current) + '-' + tag + "';"));
    }
    if (relativePath === 'index.html') {
      return Buffer.from(String(buffer)
        .replace(/var BUILTIN_HTML_VERSION='([^']+)'/, (_, current) => "var BUILTIN_HTML_VERSION='" + (effectiveVersion || current) + '-' + tag + "'")
        .replace('</body>', "<script>var QA_INDEX_GEN='" + tag + "';</script>\n</body>"));
    }
    if (relativePath === 'schema.js') {
      return Buffer.from(String(buffer) + "\nvar QA_SCHEMA_GEN='" + tag + "';\n");
    }
    return buffer;
  }

  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(basePath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'max-age=600' });
      response.end('Not found');
      return;
    }
    const mountedPath = pathname.slice(basePath.length);
    const relativePath = mountedPath === '' ? 'index.html' : mountedPath.replace(/^\/+/, '');
    const target = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, target);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    let stat;
    try { stat = fs.statSync(target); } catch (ignore) { stat = null; }
    if (!stat || !stat.isFile()) {
      /* 刻意保持真 404:離線時的「未快取子資源」情境靠這條 */
      response.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'max-age=600' });
      response.end('Not found');
      return;
    }
    const body = transform(relativePath.replace(/\\/g, '/'), fs.readFileSync(target));
    response.writeHead(200, {
      /* 這行就是重點 —— GitHub Pages 對 sw.js / index.html / app-version.js 都送 max-age=600 */
      'Cache-Control': 'max-age=600',
      'Content-Type': mimeTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
    });
    response.end(body);
  });

  return {
    state,
    setGeneration(n) { state.generation = n; },
    listen(port) {
      return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server.address().port)));
    },
    close() {
      return new Promise((resolve) => { server.closeAllConnections && server.closeAllConnections(); server.close(() => resolve()); });
    },
  };
}

module.exports = { createVersionedServer };
