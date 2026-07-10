# 02 系統架構

## 總覽
```
Google Sheets(CMS,7張工作表)
  └─ 每張「發布到網路」→ 公開 CSV(pub?gid=xxx&output=csv)
       └─ 手機瀏覽器直接 fetch(App 端,非伺服器)
            └─ vanilla JS App 解析 → 渲染
Netlify 靜態託管(HTTPS)+ Service Worker(PWA 離線)
無後端、無資料庫伺服器、零月費。
```

目前 repo 的可編輯 App 是 `日本行程V2預覽.html`;`index.html`、Service Worker、manifest 與 icons 是 Bar 說「打包」後才建立並納入 `deploy/` 的部署產物。

## 資料流:三層防線(絕不空白頁)
1. **內建資料**(builtin,建置時寫入 HTML)→ 0.1 秒顯示
2. **localStorage 快取**(上次成功同步版,較新則覆蓋)
3. **背景同步** 7 張 CSV(並行,單張失敗不影響其他)→ 成功即更新畫面+快取
同步狀態徽章:已是最新 / 部分更新 / 離線版 / 內建版。

## 快取(sw.js)
- App Shell(HTML/圖示):Cache First + 背景更新(SWR)
- CSV 資料:網路優先,離線回退快取(App 層另有 localStorage)
- 改版:bump `VERSION` 字串 → 自動清舊快取,使用者開兩次生效

## 應用結構(預覽版 HTML 內嵌 JS)
```
SCHEMA(pubBase + sheets.*.gid + 欄位/型別規格)→ 唯一資料設定點
BUILTIN(7張表內建快照,建置時注入)
utils(storage/toast/CSV parser/copyText)
parseTable / buildHeaderMap(依 SCHEMA header + aliases 容錯解析,欄位順序無關)
buildDB(CSV → DB{places,rest,shop,hotels,expCMS,cfg,trip})
resolveRef(行程ID欄 Pxxx/Rxxx → 地點/餐廳;名稱備援)
renderers(today/trip/shop/split + 型別卡片面板)
sync engine(fetchWithTimeout 相容模式,無 AbortController)
```

## 資料夾(規劃中的部署包)
打包後預計收納於 `deploy/`:`index.html / schema.js / validator.js / sw.js / manifest.json / icon-192.png / icon-512.png / icon-maskable-512.png / apple-touch-icon.png`。目前尚未建立,以 `tasks/backlog.md` 的打包任務為準。

## 已知環境限制(繞過方案已內建)
- 部分 WebView 無 console.info → 已 polyfill
- 部分 WebView fetch 帶 options 拋 clone 錯誤 → 相容模式自動退回
- file:// 開檔會擋 fetch → 因此採 Netlify 託管
