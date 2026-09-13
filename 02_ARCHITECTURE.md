# 02 系統架構

## 總覽
```
Google Sheets(CMS,8張工作表)
  └─ 每張「發布到網路」→ 公開 CSV(pub?gid=xxx&output=csv)
       └─ 手機瀏覽器直接 fetch(App 端,非伺服器)
            └─ vanilla JS App 解析 → 渲染
Apps Script(分帳 append-only + 兩項設定白名單寫入)→ Google Sheet 分帳紀錄 / TripConfig
Netlify 靜態託管(HTTPS)+ Service Worker(PWA 離線)
無自架後端、無額外資料庫伺服器、零前端相依套件。
```

root `index.html`／`app-version.js` 保留 v110 bridge；成功啟用的 v114 Service Worker 才把 root 導覽映射到 `shell/v125/index.html`。該 generation document 是 App 與 DOM effect adapter；依 ADR 0018，`navigation-intent.js` 只管理 session-only 明確目的地 intent，`diagnostic-impact.js` 只把原始 AppLog entry 投影為顯示用影響說明，`today-view.js` 只建立與渲染 Today Hero 採買摘要。裝置照片儲存邊界獨立在 `shopping-photo-store.js`，採買轉記帳的純資料與 workflow 邊界獨立在 `buy-to-ledger.js`，Ledger 歷史瀏覽與 create／edit entry session 的 UI state／effect 邊界獨立在 `ledger-ui-state.js`。

## 資料流:三層防線(絕不空白頁)
1. **內建資料**(`shell/v125/builtin-snapshot.js`,由工具產生並與 App／SW 同版)→ 版本一致才啟用
2. **localStorage 快取**(上次成功同步版,較新則覆蓋)
3. **背景同步** 8 張 CSV:原有 7 表維持原子快照 Gate;ledger 失敗時沿用目前 ledger 快照,其餘 7 表仍可更新
同步狀態徽章:已是最新 / 部分更新 / 離線版 / 內建版。

`shell/v125/builtin-snapshot.js` 是 Tier 3 generated asset，唯一內容 authority 是 `tools/refresh-builtin-snapshot.js`。current generation HTML 只保留版本／timestamp marker 與安全 boot guard，不複製資料 payload。asset 缺失或 `BUILTIN_ASSET_VERSION !== APP_VERSION` 時，App 只接受已通過完整 shape／validation 的 local active／previous snapshot；若本機也沒有有效資料，顯示可重新載入與複製診斷的復原頁，且不建立空 DB、不啟動背景同步。SW 以同一版本 cache generation 將 immutable HTML、App version 與 asset 一起納入 App Shell；root v110 bridge 則保留 predecessor 的 inline BUILTIN，僅用於 current generation 安裝前或安裝失敗。

明確頁面／overlay 導覽另外走 transient intent：純 module 只保存序號、目標 view／ID、來源與對齊資訊；`index.html` 才負責開啟 view、解析 DOM target、避開 sticky header 捲動、1 秒醒目加 0.2 秒淡出、visually-hidden live status、遺失目標降級，以及關閉 Shopping overlay 後回復來源捲動與 focus。intent 不進 localStorage、備份、Queue、CMS 或 Ledger；`shopping-list` 仍是 overlay，不改 `curView`。

Today Hero 的 reminder 選取、目前站排除、Shopping store 與 DOM effect 仍由 `index.html` adapter 負責；`today-view.js` 只接收已準備的資料，正規化 `未分類` 與六個 Unicode code point 的可見地點名稱，產生既有 HTML 及宣告式 `open-shopping-list` action。module 不讀 DOM、storage、clock 或 repository，也不成為跨頁 store。

AppLog 與 `healthCheck()` 的原始 entry／finding 保持權威且不變；`diagnostic-impact.js` 只在診斷面板投影 `info`／`degraded`／`action-required`、影響與 fallback，複製報告仍逐字使用 raw message。投影不參與 Health Check 判定、同步重試、Queue 或資料保存。

分帳寫入先進 `trip_ledger_queue`,再由 `ledgerRepository` POST Apps Script；只有伺服器回覆 `ok:true` 或 `ok:true,dup:true` 才移出佇列。開 App 與恢復連網時自動補送。

採買照片以 `shopping-photo-store.js` 寫入 IndexedDB `trip-local-media/shopping-photos`,採買項目只在 localStorage 保存不透明 `photoId`。照片不進 CMS、Ledger、個人備份或跨裝置同步；部分購買拆分可共用同一 `photoId`,只有最後一個引用刪除時才移除 Blob。

共用分帳設定以 TripConfig 的 `Exchange Rate` 與 `Ledger Default Currency` 為 SSoT。設定頁只在連網時 POST `updateSettings`；伺服器確認後寫入 `trip_ledger_settings_bridge`,讓目前裝置在公開 CSV 的 1–5 分鐘延遲期間立即使用新值。後續同步讀到相同兩值才移除 bridge。Apps Script 原始碼權威為 `apps-script/ledger-sync.gs`。

住宿資料是 `Places(Type=住宿).HID → Hotels.HID` 的 **N→1** 關係。PID 表示帶有自身交通脈絡的行程停靠點,HID 才是 Hotel profile 的 join key；名稱只供顯示,不得比對或關聯。現行 P002／P013／P022／P031／P040 都引用 H001,但五個 PID 必須保持分離,因為各路段的開車／步行時間不同。Validator 會在七表原子快照 Gate 內條件式檢查：住宿必須有 HID、非住宿不得帶 HID、任何 HID 都必須精確存在於 Hotels；任一違反都阻止候選快照生效。Runtime `hotelOf()` 對兩端 HID 做去空白與大小寫正規化後精確解析,天氣住宿亦共用同一 resolver；缺失或懸空引用安全回傳 `null`,不做名稱或第一筆 fallback。

## 快取(sw.js)
- 新 worker install 以 `cache:'reload'` 下載並驗證整組 immutable generation shell；成功啟用後，所有已登錄 SHELL 與導覽皆 cache-first，直到下一個完整 generation 啟用。
- 只有非 SHELL 的同源 GET 維持 network-first／`cache:'no-cache'`；跨世代過渡不把新部署 bytes 寫進舊 generation cache。
- root v110 bridge 持續保留 v110 HTML／App version；current generation 的 document／version／snapshot 使用 `shell/v125/` 唯一路徑，新 generation 安裝失敗時舊 worker 與舊 cache 可原樣續命。
- 跨域 CSV 不由 SW 攔截；App 資料層維持 BUILTIN／localStorage／背景同步三層防線。
- 改版同步 forward-bump `sw.js` 的 `SW_VERSION` 與 current generation `shell/<version>/app-version.js`；root `app-version.js` 維持 byte-locked v110 bridge，版本一致性由 `tools/check-app-version.js` 守住。

## 應用結構(`shell/v125/index.html` UI／adapter + 外部純 module)
```
SCHEMA(pubBase + sheets.*.gid + 欄位/型別規格)→ 唯一資料設定點
BUILTIN(`shell/v125/builtin-snapshot.js` generated asset；8 表，ledger 只有 schema header)
utils(storage/toast/CSV parser/copyText)
parseTable / buildHeaderMap(依 SCHEMA header + aliases 容錯解析,欄位順序無關)
buildDB(CSV → DB{places,rest,shop,hotels,expCMS,expMembers,ledger,cfg,trip})
hotelOf(Places.hotelId → Hotels.hotelId exact N→1;名稱僅顯示)
resolveRef(行程ID欄 Pxxx/Rxxx → 地點/餐廳;名稱備援)
renderers(today/trip/shop/split + 型別卡片面板)
sync engine(fetchWithTimeout 相容模式,無 AbortController)
ledgerRepository(add/flushQueue/pendingCount → Apps Script;離線佇列與 ID 去重)
ledger settings(normalize/convert/post/save → TripConfig兩鍵;確認bridge涵蓋CSV延遲)
shopping photo store(壓縮／IndexedDB put-get-remove／引用生命週期)
buy-to-ledger domain/workflow(來源準備／狀態推導／commit plan／流程協調；DOM 與 repository 由 index adapter 注入)
ledger UI state/workflow(帳本軌／歷史篩選／多選／create-edit entry session 的不可變 transition + ordered effects；DOM render、帳務驗證與 repository 由 index adapter 注入)
navigation location(外部地圖詳細分點直接導航;一般同名地點以目前位置作為 origin,定位失敗退回「名稱 + 日本」)
navigation intent(session-only request／consume／complete；DOM、scroll、focus、status 與 overlay lifecycle 留在 index adapter)
diagnostic impact(raw AppLog → display-only severity／impact／fallback；raw copy、Health Check 與同步語意不變)
today view(已準備 Today Hero 採買資料 → 純 model／HTML／declarative action；資料選取與 DOM effect 留在 index adapter)
```

`ledger-ui-state.js` 只擁有 session-only UI workflow state。entry draft 內容與 return context 對 module 不透明；session／request ID 用來阻止重複儲存與過期非同步結果。correction、settlement、calculator 內容、record 建立、同步及 Shopping UI state 仍在既有邊界，不屬於此 module。

`.ai-manifest.json` 的 `manifest_format` 只表示 manifest schema，不是 App 版號；其 `current_status.authority` 必須精確指向 `tasks/current.md`。manifest 不保存 `dev_candidate`、`next_action` 或 automated-test-result snapshot；current App／SW 版號只由 `shell/<version>/app-version.js` 與 root `sw.js` 管理，root `app-version.js` 是 frozen bridge，歷史狀態看 `07_CHANGELOG.md`。

## 部署檔案
root `index.html / app-version.js` 是 v110 bridge；current generation 在 `shell/v125/index.html / app-version.js / builtin-snapshot.js`。其餘 runtime modules、`sw.js`、manifest 與 icons 位於 repo 根目錄，由 `main` 的 Bar 核准 Merge 觸發 Netlify 正式部署。

## 已知環境限制(繞過方案已內建)
- 部分 WebView 無 console.info → 已 polyfill
- 部分 WebView fetch 帶 options 拋 clone 錯誤 → 相容模式自動退回
- file:// 開檔會擋 fetch → 因此採 Netlify 託管
