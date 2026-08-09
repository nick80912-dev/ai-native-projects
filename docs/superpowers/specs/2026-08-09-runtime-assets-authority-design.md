# Runtime JavaScript Asset Authority Design

> 日期：2026-08-09
> 狀態：Bar 已確認，可直接進入實作計畫
> Runtime 版本：不占用新版本；維持 v98

## Purpose

新增 build-time-only `runtime-assets.json` 作為外部 JavaScript runtime module inventory，並以 `tools/check-runtime-assets.js` 驗證 `index.html`、`sw.js`、`README.md` 與 `.ai-manifest.json` 的登錄一致性。此切片解決新增 module 時必須人工同步四處、容易漏掉離線 App Shell 或文件索引的風險。

## Canonical Inventory

只管理下列外部 JavaScript runtime modules：

```json
[
  "app-version.js",
  "shopping-photo-store.js",
  "buy-to-ledger.js",
  "ledger-ui-state.js",
  "shopping-ui-state.js",
  "trip-progression.js",
  "schema.js",
  "validator.js"
]
```

不含 `index.html`、`sw.js`、web manifest、icons、images、tests、Apps Script 或其他非 JS Shell 資產。

## Validator Interface

`tools/check-runtime-assets.js` 同時是可 import 的 pure validator 與 CLI：

```js
const {validateRuntimeAssets}=require('./tools/check-runtime-assets');
validateRuntimeAssets({rootDir, inventory});
// => {ok, errors, assets}
```

CLI 在一致時 exit 0 並輸出檢查數量；缺檔、重複、非 `.js`、index script 缺漏、SW SHELL 缺漏、README 缺漏或 `.ai-manifest.json` 的 `files`／`deploy_files` 未涵蓋時，列出 deterministic errors 並 exit 1。

## Source Matching Rules

- `runtime-assets.json` 必須是 UTF-8 JSON object，含唯一的 `assets` string array。
- `index.html` 以外部 `<script src="...">` basename 配對；inline script 不納入。
- `sw.js` 只在 `SHELL` array 內配對，其他字串不算登錄。
- `README.md` 必須以 code-formatted basename 明列每個 module。
- `.ai-manifest.json.files` 必須有每一個 basename key；`deploy_files` 可用精確 key或已存在的 `schema.js + validator.js` group key涵蓋，但新檔優先精確列出。
- 驗證器不得改寫任何檔案，也不得在瀏覽器 runtime 執行。

## Tests and Integration

先建立 `tests/runtime-assets.test.js`，用 temp fixture 驗證 happy path 與每一種缺漏，觀察 RED 後再建立 validator。Repo integration test 必須讀真實 root 並通過。既有 `tests/pwa-shell.test.js` 繼續守非 JS assets、版本與 SW lifecycle；只有已被 registry 完整取代的逐-module 重複 assertion 才移除。

## Invariants

- inventory 順序穩定、無重複、只含 approved external JS modules。
- registry 是 governance authority，不是 bundler、code generator 或 runtime loader。
- 不改 script execution order、Service Worker lifecycle、cache strategy 或 HTTP behavior。
- 新增 runtime module 時，缺少任何一處登錄都必須讓 Node gate fail。

## Explicit Non-goals

不導入 bundler、package runtime、generated files、`importScripts`、動態 script loading、SW lifecycle/cache strategy 變更、版本升級、部署或 main merge。

## Deletion Test

若刪除 inventory/validator，新增 runtime module 時 index、offline shell 與兩份文件仍只能靠人工同步，現有 PWA test無法同時證明全部 JS module登錄；此 build-time boundary 因而提供集中權威，而非包裝既有 command。
