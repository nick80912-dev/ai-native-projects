# ADR 0019 — 版本綁定的 Generated BUILTIN 離線資產

> 狀態：Accepted（2026-08-13；依 Bar 核准的 v111 BUILTIN asset spike 與安全門檻落地）。

## Decision

`index.html` exposes a runtime-readable `BUILTIN_HTML_VERSION` and `BUILTIN_HTML_TS` marker before loading the generated asset. Startup accepts BUILTIN only when the HTML marker, `APP_VERSION`, `BUILTIN_ASSET_VERSION`, and timestamp all agree. When a Service Worker controls the page, the expected versioned Cache Storage generation must also exist.

An active Service Worker serves every known `SHELL` resource cache-first, relative to `self.registration.scope`. It never writes resources from a newer deploy into its older cache. A new worker fetches the complete shell with `cache: 'reload'`, validates the version-bearing HTML/App/BUILTIN responses, and activates only after the complete set is cached. A failed or mixed install therefore leaves the prior worker and its coherent cache active. Offline deep-link HTML receives a generated `<base>` for the current worker scope, preserving both Netlify root and GitHub Pages subpath deployments.

BUILTIN 離線種子只由 `tools/refresh-builtin-snapshot.js` 產生為 Tier 3 的 `builtin-snapshot.js`，不再把資料 payload 複製進 `index.html`。generated asset 必須宣告 `BUILTIN_ASSET_VERSION`，與 `app-version.js`／`sw.js` 同版，並登錄於 `runtime-assets.json`、HTML script order、SW App Shell、`.ai-manifest.json` 與部署 cache header。

App 只在 `BUILTIN_ASSET_VERSION === APP_VERSION` 且八個 sheet 都完整時啟用 BUILTIN。asset 缺失、內容不完整或版本錯配時，依序嘗試已通過既有 shape／data validation 的 local active、previous 與 legacy snapshot；若全部無效，顯示含重新載入及複製診斷資訊的 recovery UI，不建立空 DB、不啟動背景同步。

## Context

原本 BUILTIN 直接寫在 `index.html`，讓入口檔同時承擔 UI、runtime adapter 與大型 generated data。每次資料刷新都會改寫入口，且缺少 asset 自身版本，無法明確拒絕新版 HTML／App 搭配舊 snapshot 的 mixed-cache 啟動。v111 spike 的前提是外部化不得弱化既有「離線可啟動、絕不空白頁」契約，也不得把 live Ledger 寫入種子。

## Alternatives Considered

- 保留 inline BUILTIN：少一次 script request，但入口持續包含大型 generated payload，資料與 App 變更無法獨立驗證。
- 外部 asset 不帶版本：檔案較簡單，但 cached HTML／asset 可靜默混版，不能安全採用。
- 導入 bundler、framework 或 runtime store：可建立完整 build graph，但超出現有單頁 ES5 PWA 的必要範圍，並擴大部署與 migration 風險。
- asset 載入失敗時建立空 DB：畫面可能啟動，但會把資料遺失偽裝成有效狀態，因此否決。

## Why This Decision

generated asset 將內容 authority 收斂到既有 preview-first 工具；版本欄位與 App boot guard 讓 mixed-cache 嘗試可被明確拒絕。SW 以同一 cache generation 安裝 HTML、App version 與 asset，local snapshot fallback 則保留三層資料防線。這些邊界不改 Schema、Ledger、repository、個人備份、框架或 SW network-first lifecycle。

## Expected Benefits

- `index.html` 不再重複保存 generated snapshot，資料刷新 diff 更集中。
- generator 可 deterministic serialize／parse、read-back 並驗證 App version、timestamp、sheet key order 與 header-only Ledger。
- asset 缺檔、stale、錯版、已安裝離線重開及 mixed-version 行為都有 executable regression coverage。
- 外部化可用明確效能 kill gate 決定保留或回退，不以主觀感受發布。

## Trade-offs

The installed App Shell is intentionally immutable within one SW version. Any production change to a registered shell resource requires the normal App/SW forward bump; same-version hot replacement is not supported. Only HTML/App/BUILTIN carry directly parseable generation markers, so the remaining modules are generation-frozen by cache-first ownership rather than by embedding duplicate version literals in every file.

啟動多一個同源 script request，必須由 SW App Shell 與部署 cache header 一起管理。工具以同目錄 sibling temp、fsync、read-back、依序 rename 與 exception rollback 更新 HTML marker／asset；一般失敗可 byte-for-byte 回復，但作業系統或程序在兩次 rename 之間被強制終止時仍存在短暫 split-pair 視窗。下一次 preview 會偵測 marker／asset drift，runtime version guard 也會阻止錯版 asset 啟用；Git commit／deploy snapshot 才是發布層的原子邊界。

## Future Impact

- `builtin-snapshot.js` 禁止手改；任何內容或版本更新一律先 preview，再由 `--write` 產生。
- Ledger seed 永遠只含 `schema.js` 推導的空 header，不得請求或嵌入 live Ledger records。
- 新增／移除 runtime asset 登錄點仍以 ADR 0016 的 `runtime-assets.json` authority 為準。
- 改變 fallback 優先序、允許空 DB、移除版本 guard 或改寫 SW cache generation 都屬架構變更，必須更新本 ADR 並重新通過 mixed-version、offline 與 performance gates。
