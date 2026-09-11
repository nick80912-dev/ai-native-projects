# 10 資料夾與檔案結構

> 原則:每個檔案責任單一,命名一致,AI 一眼知道去哪修改。不使用 common/misc/temp 這類模糊命名。

## 正式 App 與 PWA 檔案(Netlify 部署樹)
> root `index.html`／`app-version.js` 是 byte-locked v110 bridge；current App 位於 `shell/v114/`，只有 v114 worker 成功啟用後才接管 root 導覽。裝置照片、採買轉記帳、Ledger UI、Shopping UI 與 Trip progression 各有獨立 runtime 邊界。

```
index.html              v110 bridge App（必須維持 origin/main v110 bytes）
app-version.js          v110 bridge 顯示版本（不代表 current generation，禁止升為 current generation）
shell/v114/index.html   current App:UI 殼 + CSS + 內嵌 JS（依區塊分層，見下）
shell/v114/app-version.js current App 顯示版本（必須與 sw.js 的 SW_VERSION 一致）
shell/v114/builtin-snapshot.js 工具產生、與 current App／SW 同版的 BUILTIN 離線資產（Tier 3，禁手改）
shopping-photo-store.js 採買照片壓縮與 IndexedDB put/get/remove 邊界
buy-to-ledger.js        採買轉記帳的純 domain 與 workflow coordinator（UMD/CommonJS）
ledger-ui-state.js      Ledger history／entry／correction state 與 ordered effects workflow（UMD/CommonJS）
shopping-ui-state.js    Shopping list selection／form session state 與 ordered effects workflow（UMD/CommonJS）
trip-progression.js     下一站選擇、cluster blocker 與一次性進度調和（UMD/CommonJS）
runtime-assets.json     十二個 JavaScript runtime assets 的 build-time inventory
schema.js               唯一資料規格(SSoT):欄位/gid/型別值/發布URL
validator.js            防錯防線:AppLog 六類 + session-only 100 筆緩衝 + buildHeaderMap + healthCheck
sw.js                   Service Worker:離線快取(改版 bump VERSION)
manifest.webmanifest    PWA 安裝資訊
icon-16.png             瀏覽器小圖示
icon-32.png             瀏覽器小圖示
icon-120.png            iOS PWA 圖示
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
> App UI、DOM adapter 與多數流程維持在單一 current generation document `shell/v114/index.html`；獨立 runtime modules 由 `runtime-assets.json` 登錄並以 `tools/check-runtime-assets.js` 驗證入口、SW 與文件一致性。root bridge 不是日常功能修改目標。

## Current App HTML `shell/v114/index.html` 內部分層(區塊順序,即邏輯模組)
```
SCHEMA        來自 schema.js(pubBase + sheets.*.gid + 欄位/型別規格)
BUILTIN       由 shell/v114/builtin-snapshot.js 載入的 8 表離線後備；current HTML 只留安全 guard
UTILS         storage / toast / CSV parser / copyText / date
VALIDATOR     來自 validator.js(表頭驗證 + 六類日誌 + session-only 診斷緩衝)
PARSER        parseTable / parseKeyValue / parseExpensesFree(Schema 驅動)
DATABASE      buildDB → DB{ places, rest, shop, hotels, expCMS, cfg, trip }
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
00_CONTEXT_HANDOVER.md     歷史交接快照(2026-07-06;衝突時以現行文件為準)
01-13_*.md                 願景/架構/CMS/UI/規範/路線圖/CHANGELOG/交接/Schema/結構/慣例/流程/狀態
14_FILE_TIERS_AND_GATE.md  檔案風險分級與 Gate 保護
15_AI_EXECUTION_RULES.md   AI 決策權限/指令效力/不確定性協議/任務分級
16_OPS_PLAYBOOK.md         回滾手冊 + DevOps 安全規範
adr/                       架構決策紀錄(0001-0019 + README)
tasks/                     即時狀態唯一權威(current/backlog/done)
tests/                     測試資產(交付必附)
tools/                     檢查腳本(文件標題、runtime 版本、活文件 generation 與 runtime asset 一致性)
.github/workflows/         Sanity CI(qa.yml,main push/PR 自動檢查;dev 目前跑同等本機 CI)
.mcp.json                  chrome-devtools MCP server 宣告(本機除錯工具,不進 runtime)
docs/superpowers/          功能設計規格與實作計畫
schema.js / validator.js   資料規格 SSoT / 防錯防線(Tier 1 原始碼)
index.html / app-version.js v110 byte-locked bridge 正式入口
shell/v114/                current App document／version／generated BUILTIN generation
shopping-photo-store.js    採買照片的裝置本機 IndexedDB 邊界
buy-to-ledger.js           採買轉記帳的純 domain／workflow runtime module
ledger-ui-state.js         Ledger history／entry／correction state／workflow runtime module
shopping-ui-state.js       Shopping list selection／form session state／workflow runtime module
trip-progression.js        下一站與進度調和 runtime module
runtime-assets.json        JavaScript runtime asset build-time inventory
sw.js / manifest.webmanifest / icon-*.png  PWA 離線與安裝資產
```
