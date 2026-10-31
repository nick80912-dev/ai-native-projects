# 10 資料夾與檔案結構

> 原則:每個檔案責任單一,命名一致,AI 一眼知道去哪修改。不使用 common/misc/temp 這類模糊命名。

## 正式 App 與 PWA 檔案(Netlify 部署樹)
> root `index.html`／`app-version.js` 是 byte-locked v110 bridge；current App 位於 `shell/v170/`，只有 current worker 成功啟用後才接管 root 導覽。裝置照片、採買轉記帳、Ledger UI、Shopping UI 與 Trip progression 各有獨立 runtime 邊界。

```
index.html              v110 bridge App（必須維持 origin/main v110 bytes）
app-version.js          v110 bridge 顯示版本（不代表 current generation，禁止升為 current generation）
shell/v170/index.html   current App:UI 殼 + CSS + 內嵌 JS（依區塊分層，見下）
shell/v170/app-version.js current App 顯示版本（必須與 sw.js 的 SW_VERSION 一致）
shell/v170/builtin-snapshot.js 工具產生、與 current App／SW 同版的 BUILTIN 離線資產（Tier 3，禁手改）
shell/<較舊世代>/       已發布、不可就地修改的較舊 generation；只保留最近幾代（目前 v154 起，見下方說明）
navigation-intent.js    明確導覽目的地的 session-only state module
diagnostic-impact.js    AppLog 原始紀錄的 display-only impact projection
today-view.js           Today Hero 採買摘要的純 model／renderer module
shopping-photo-store.js 採買照片壓縮與 IndexedDB put/get/remove 邊界
ledger-receipts.js      分帳收據照片：EXIF 拍攝時間、紀錄對應鍵、連結表（v167）
trip-currency.js        旅程幣別：最小單位換算、輸入解析與顯示格式（v168）
buy-to-ledger.js        採買轉記帳的純 domain 與 workflow coordinator（UMD/CommonJS）
ledger-ui-state.js      Ledger history／entry／correction state 與 ordered effects workflow（UMD/CommonJS）
shopping-ui-state.js    Shopping list selection／form session state 與 ordered effects workflow（UMD/CommonJS）
trip-progression.js     下一站選擇、cluster blocker 與一次性進度調和（UMD/CommonJS）
trip-lifecycle.js       個人旅程狀態、清理 key policy 與預檢純政策
trip-archive.js         個人旅程封存格式、投影與讀回驗證
trip-drive.js           Google Drive 個人封存與回顧筆記存取邊界
trip-source.js          目前旅程來源、開機分類與「連接新旅程」交易（v150）
trip-lifecycle-flow.js  重置、結束旅程、失敗後清理恢復的流程協調
runtime-assets.json     十七個 JavaScript runtime assets 的 build-time inventory
schema.js               唯一資料規格(SSoT):欄位/gid/型別值/發布URL
validator.js            防錯防線:AppLog 六類 + session-only 100 筆緩衝 + buildHeaderMap + healthCheck
sw.js                   Service Worker:離線快取(改版 bump VERSION)
manifest.webmanifest    PWA 安裝資訊
icon-16.png             瀏覽器小圖示
icon-32.png             瀏覽器小圖示
icon-152.png            iOS PWA 圖示
icon-167.png            iOS PWA 圖示
icon-180.png            iOS PWA 圖示
icon-192.png            PWA 圖示
icon-512.png            PWA 圖示
icon-maskable-192.png   PWA 圖示(maskable)
icon-maskable-512.png   PWA 圖示(maskable)
okayama-peach-badge.png 診斷徽章圖
netlify.toml            Netlify 快取 header 設定
.ai-manifest.json       AI 導航檔(接手第一步只讀這份)
```
> App UI、DOM adapter 與多數流程維持在單一 current generation document `shell/v170/index.html`；獨立 runtime modules 由 `runtime-assets.json` 登錄並以 `tools/check-runtime-assets.js` 驗證入口、SW 與文件一致性。root bridge 不是日常功能修改目標。
> **舊 generation 保留範圍(2026-10-16 Bar 核准)**:v111–v153 共 43 個舊世代資料夾已刪除,repo 只保留最近幾代(目前 v154 起,至少 current 與前一代)。已安裝的 worker 對自己的 SHELL 一律 cache-first,只在自己 install 時才從網路抓 `shell/vNNN/`;Netlify 回滾用的是部署快照。刪掉的內容仍在 git 歷史與各 `production-vNNN` tag。詳見 ADR 0019 增補段。

## Current App HTML `shell/v170/index.html` 內部分層(區塊順序,即邏輯模組)
```
SCHEMA        來自 schema.js(pubBase + sheets.*.gid + 欄位/型別規格)
BUILTIN       由 shell/v170/builtin-snapshot.js 載入的 8 表離線後備；current HTML 只留安全 guard
UTILS         storage / toast / CSV parser / copyText / date
VALIDATOR     來自 validator.js(表頭驗證 + 六類日誌 + session-only 診斷緩衝)
PARSER        parseTable / parseKeyValue / parseExpensesFree(Schema 驅動)
DATABASE      buildDB → DB{ places, placeList, rest, shop, hotels, expCMS, expMembers, ledger, cfg, trip }
REPOSITORY    resolveRef / restaurantsOf / hotelOf / resolveParking(查詢)
RENDER        renderToday / renderTrip / renderShop / renderSplit
COMPONENTS    renderItem / parkingPanel / infoPanel / restRows / storeRow(卡片與面板)
SERVICES      syncAll / fetchSheet(同步) / lsGet-lsSet(儲存)
BOOT          init → bootLocal → syncInBackground
```

## 文件庫(權威:GitHub 本 repo)
> **2026-07-09 核定**:程式與文件的唯一權威為 GitHub 本 repo;Google Drive「BHAIProject/日本旅遊App-docs」降級為**備份**,不再作為更新目標(Drive 工具只能建立不能更新的限制因此不再影響日常流程)。
> 內容資料來源例外:Drive 試算表「261018-261023岡山四國六天五夜」仍是 CMS 內容的唯一來源(發布 CSV,見 03/schema.js),與文件權威分屬兩層。

```
(repo 根目錄)
.ai-manifest.json          AI 導航檔(首讀)
PROJECT_CONSTITUTION.md    專案憲章(最高規範)
01-13_*.md                 願景/架構/CMS/UI/規範/路線圖/CHANGELOG/交接/Schema/結構/慣例/流程/狀態
14_FILE_TIERS_AND_GATE.md  檔案風險分級與 Gate 保護
15_AI_EXECUTION_RULES.md   AI 決策權限/指令效力/不確定性協議/任務分級
16_OPS_PLAYBOOK.md         回滾手冊 + DevOps 安全規範
adr/                       架構決策紀錄(0001-0021 + README)
tasks/                     即時狀態唯一權威(current/backlog/done)
tests/                     測試資產(交付必附)
tools/                     檢查腳本(文件標題、runtime 版本、活文件 generation 與 runtime asset 一致性)
.github/workflows/         Sanity CI(qa.yml,main／dev push 與 PR 都跑 sanity 與 browser-qa)
.mcp.json                  chrome-devtools MCP server 宣告(本機除錯工具,不進 runtime)
docs/                      現行契約與手冊(personal-state-compatibility、personal-ledger-export、new-trip-handbook)、device-acceptance-log、qa/ 效能證據
docs/superpowers/          仍被引用的功能設計規格與實作計畫(未被引用者已於 2026-10-16 刪除,可由 git 歷史取回)
schema.js / validator.js   資料規格 SSoT / 防錯防線(Tier 1 原始碼)
index.html / app-version.js v110 byte-locked bridge 正式入口
shell/v170/                current App document／version／generated BUILTIN generation
shopping-photo-store.js    採買照片的裝置本機 IndexedDB 邊界
ledger-receipts.js         分帳收據照片的純函式（照片在獨立的裝置本機 IndexedDB）
trip-currency.js           旅程幣別的純函式（不限日本）
buy-to-ledger.js           採買轉記帳的純 domain／workflow runtime module
ledger-ui-state.js         Ledger history／entry／correction state／workflow runtime module
shopping-ui-state.js       Shopping list selection／form session state／workflow runtime module
trip-progression.js        下一站與進度調和 runtime module
navigation-intent.js / diagnostic-impact.js / today-view.js  導覽意圖、診斷影響、Today 呈現 runtime modules
trip-lifecycle.js / trip-archive.js / trip-drive.js / trip-source.js / trip-lifecycle-flow.js  個人旅程生命週期與旅程來源 runtime modules
runtime-assets.json        JavaScript runtime asset build-time inventory
sw.js / manifest.webmanifest / icon-*.png  PWA 離線與安裝資產
```
