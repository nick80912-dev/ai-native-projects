# 10 資料夾與檔案結構

> 原則:每個檔案責任單一,命名一致,AI 一眼知道去哪修改。不使用 common/misc/temp 這類模糊命名。

## 正式 App 與 PWA 檔案(Netlify 根目錄)
> `index.html` 是唯一可編輯 App 與正式入口;根目錄檔案由 GitHub 連動部署至 Netlify。

```
index.html              App 本體:UI殼 + CSS + 內嵌 JS(依區塊分層,見下)
schema.js               唯一資料規格(SSoT):欄位/gid/型別值/發布URL
validator.js            防錯防線:AppLog 六類 + buildHeaderMap + healthCheck
sw.js                   Service Worker:離線快取(改版 bump VERSION)
manifest.webmanifest    PWA 安裝資訊
icon-192.png            PWA 圖示
icon-512.png            PWA 圖示
icon-maskable-512.png   PWA 圖示(maskable)
apple-touch-icon.png    iOS 圖示
.ai-manifest.json       AI 導航檔(接手第一步只讀這份)
```
> App UI 與主要邏輯維持單一 `index.html`;`schema.js` / `validator.js` 同時作為獨立權威來源,其餘 JS 仍以區塊註解分層。

## App HTML 內部分層(區塊順序,即邏輯模組)
```
SCHEMA        來自 schema.js(pubBase + sheets.*.gid + 欄位/型別規格)
BUILTIN       7 表內建快照(離線後備)
UTILS         storage / toast / CSV parser / copyText / date
VALIDATOR     來自 validator.js(表頭驗證 + 六類日誌)
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
adr/                       架構決策紀錄(0001-0004 + README)
tasks/                     即時狀態唯一權威(current/backlog/done)
tests/                     測試資產(交付必附)
tools/                     檢查腳本(check-doc-titles.js:標題/檔名一致性)
.github/workflows/         Sanity CI(qa.yml,push/PR 自動檢查)
docs/superpowers/          功能設計規格與實作計畫
schema.js / validator.js   資料規格 SSoT / 防錯防線(Tier 1 原始碼)
index.html                 唯一可編輯 App 與 Netlify 正式入口
sw.js / manifest.webmanifest / icon-*.png  PWA 離線與安裝資產
```
