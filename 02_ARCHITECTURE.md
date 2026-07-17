# 02 系統架構

## 總覽
```
Google Sheets(CMS,8張工作表)
  └─ 每張「發布到網路」→ 公開 CSV(pub?gid=xxx&output=csv)
       └─ 手機瀏覽器直接 fetch(App 端,非伺服器)
            └─ vanilla JS App 解析 → 渲染
Apps Script(分帳 append-only 寫入通道)→ Google Sheet 分帳紀錄
Netlify 靜態託管(HTTPS)+ Service Worker(PWA 離線)
無自架後端、無額外資料庫伺服器、零前端相依套件。
```

`index.html` 是 repo 唯一可編輯 App 與 Netlify 正式部署入口;Service Worker、manifest 與 icons 均位於 repo 根目錄並由 GitHub 連動部署。

## 資料流:三層防線(絕不空白頁)
1. **內建資料**(builtin,建置時寫入 HTML)→ 0.1 秒顯示
2. **localStorage 快取**(上次成功同步版,較新則覆蓋)
3. **背景同步** 8 張 CSV:原有 7 表維持原子快照 Gate;ledger 失敗時沿用目前 ledger 快照,其餘 7 表仍可更新
同步狀態徽章:已是最新 / 部分更新 / 離線版 / 內建版。

分帳寫入先進 `trip_ledger_queue`,再由 `ledgerRepository` POST Apps Script；只有伺服器回覆 `ok:true` 或 `ok:true,dup:true` 才移出佇列。開 App 與恢復連網時自動補送。

## 快取(sw.js)
- App Shell(HTML/圖示):Cache First + 背景更新(SWR)
- CSV 資料:網路優先,離線回退快取(App 層另有 localStorage)
- 改版:bump `VERSION` 字串 → 自動清舊快取,使用者開兩次生效

## 應用結構(`index.html` 內嵌 JS)
```
SCHEMA(pubBase + sheets.*.gid + 欄位/型別規格)→ 唯一資料設定點
BUILTIN(8張表內建快照,建置時注入;ledger 至少含表頭)
utils(storage/toast/CSV parser/copyText)
parseTable / buildHeaderMap(依 SCHEMA header + aliases 容錯解析,欄位順序無關)
buildDB(CSV → DB{places,rest,shop,hotels,expCMS,expMembers,ledger,cfg,trip})
resolveRef(行程ID欄 Pxxx/Rxxx → 地點/餐廳;名稱備援)
renderers(today/trip/shop/split + 型別卡片面板)
sync engine(fetchWithTimeout 相容模式,無 AbortController)
ledgerRepository(add/flushQueue/pendingCount → Apps Script;離線佇列與 ID 去重)
```

## 部署檔案
`index.html / schema.js / validator.js / sw.js / manifest.webmanifest / icon-*.png` 位於 repo 根目錄,由 `main` 的 Bar 核准 Merge 觸發 Netlify 正式部署。

## 已知環境限制(繞過方案已內建)
- 部分 WebView 無 console.info → 已 polyfill
- 部分 WebView fetch 帶 options 拋 clone 錯誤 → 相容模式自動退回
- file:// 開檔會擋 fetch → 因此採 Netlify 託管
