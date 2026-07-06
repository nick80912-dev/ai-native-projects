# 10 資料夾與檔案結構

> 原則:每個檔案責任單一,命名一致,AI 一眼知道去哪修改。不使用 common/misc/temp 這類模糊命名。

## 部署包(Netlify 根目錄)
```
index.html              App 本體:UI殼 + CSS + 內嵌 JS(依區塊分層,見下)
schema.js               唯一資料規格(SSoT):欄位/gid/型別值/發布URL
validator.js            防錯防線:AppLog 六類 + buildHeaderMap + healthCheck
sw.js                   Service Worker:離線快取(改版 bump VERSION)
manifest.json           PWA 安裝資訊
icon-192.png            PWA 圖示
icon-512.png            PWA 圖示
icon-maskable-512.png   PWA 圖示(maskable)
apple-touch-icon.png    iOS 圖示
.ai-manifest.json       AI 導航檔(接手第一步只讀這份)
```
> 目前為單檔部署決策(見 00_CONTEXT_HANDOVER 與待決事項);index.html 內嵌 JS 以「區塊註解」分層,等同模組但無多檔載入風險。

## index.html 內部分層(區塊順序,即邏輯模組)
```
CONFIG        來自 schema.js(PUB base + SHEETS gid)
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

## 文件庫(Google Drive:BHAIProject/日本旅遊App-docs)
```
.ai-manifest.json          AI 導航檔(JSON,首讀)
PROJECT_CONSTITUTION.md    專案憲章(最高規範)
00_CONTEXT_HANDOVER.md     壓縮交接檔(換 AI 時首讀的 md)
01_PROJECT.md              願景/哲學/範圍
02_ARCHITECTURE.md         架構/資料流/三層防線
03_DATABASE.md             CMS 資料表(舊版欄位,以 09 為準)
04_UI_GUIDELINES.md        UI 準則(色彩/元件/字體)
05_CODING_RULES.md         程式規範(舊版,以 11 為準)
06_ROADMAP.md              路線圖
07_CHANGELOG.md            版本紀錄
08_AI_HANDOVER.md          AI 交接(閱讀順序/禁改/陷阱)
09_SCHEMA_MAPPING.md       Schema 欄位對照(schemaDoc 產生)
10_FOLDER_STRUCTURE.md     本檔
11_CODING_CONVENTION.md    編碼規範(完整版)
12_DEV_WORKFLOW.md         開發流程(步驟鏈)
adr/                       架構決策紀錄(0001-0004 + README)
```
> 注意:Drive 工具只能建立不能更新;更新文件=建新檔並在檔名或開頭註明取代舊檔。03/05 與 09/11 內容重疊處,以編號較大者為準。
