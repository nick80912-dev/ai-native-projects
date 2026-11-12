# 11 編碼規範(Coding Convention)

> 通用編碼原則(Schema First、Data Driven、Renderer 單一職責、單一狀態入口、跳脫輸出、設計 token、最小修改)依框架 `ai-native-framework@1.0.0` 的 `CONVENTIONS.md`;本檔只記本專案的技術基線、命名與陷阱。
> 2026-11-12 起合併原 `05_CODING_RULES.md`(快速概覽),該檔已刪除(git 歷史保留)。
> 衝突時:`schema.js` > `09_SCHEMA_MAPPING.md` > 本檔。

## 技術基線
- App 本體是 vanilla JS 單一 HTML(current generation `shell/v188/index.html`)加少數獨立 runtime module(清單以 `runtime-assets.json` 為準);**無框架、無打包、執行期零相依**。`package.json` 只放測試工具(Playwright),不進 App。
- ES5 風格(function/var),相容老舊 WebView。
- 保留 console polyfill 與 fetch 相容模式(`fetchWithTimeout`),勿「優化」掉。

## 鐵律
1. **不硬編碼資料**:內容一律來自 Google Sheets;唯一例外是版本綁定的 BUILTIN 內建快照(Tier 3 產物,離線後備)。
2. **Schema First**:發布 URL、gid、Sheet 定義、欄位 header、aliases、required、Type values 一律由 `schema.js` 的 `SCHEMA` 管理;HTML 內嵌的 Schema 必須與 `schema.js` 完全相同(CI 檢查)。
3. **不重複邏輯**:渲染用共用元件函式(`kvRow/tipBox/linkRow/storeRow`);修 bug 修一處。
4. **型別不用猜**:卡片型別只看 Places.Type 經 Schema 正規化後的值;文字推測僅限「不在資料庫的雜項列」備援。
5. **解析容錯**:`parseTable`／`buildHeaderMap` 依 SCHEMA 的 header＋aliases 比對;新欄位或欄序變動不得使程式崩潰;壞資料 AppLog 警告,不 throw 到頂層。選填分頁(天氣地區、行前清單、航班)讀取失敗時沿用上次快取或隱藏(ADR 0022)。
6. **個人狀態存本機**:不進 CMS(見下方 Storage 規則)。
7. **最小必要修改**:只改被要求的函式或文件;動共用函式先確認所有呼叫點。
8. **文件同步**:有交付就更新 `07_CHANGELOG.md`;改欄位或 Schema 同步重產 `09_SCHEMA_MAPPING.md`。

## 命名規則
- 函式:camelCase 動詞開頭 — `renderTrip` `resolveParking` `parseTable` `buildHeaderMap`。
- 全域資料物件:大寫 — `SCHEMA` `DB` `RAW` `SRC` `BUILTIN` `AppLog`。
- 區域變數:camelCase;布林以 is/has 開頭佳。
- localStorage key:前綴 `trip_`(個人狀態與依旅程分開的 Sheet 快取,例如 `trip_prep_items`、`trip_flight_items`)/ `v2_cache_`(同步快取)。換旅程時要清的 key 以 `trip-lifecycle.js` 的 key policy 為準。
- CSS class:沿用既有縮寫體系 `qa-btn` `pc-row` `nx-` `st-` `fl-` `mc-` `prep-` `flight-`;禁自創平行體系。
- CSS 顏色:一律用 `:root`／主題 token(`--sea`、`--coral`…),禁硬編碼色碼;例外是跨主題固定的語意色(見 `04_UI_GUIDELINES.md`)與繪本主題外觀層(ADR 0008 增補)。

## Component 規則(元件函式)
- 一個元件函式只產出一種 UI 片段,回傳 HTML 字串。
- 所有動態文字經 `escapeHtml()`／`escapeHtmlAttr()`。
- 圖示:App 產生的圖示一律 inline SVG 線條(`lineIcon()`／`iconLabelHtml()`,v186);Sheet 內容自帶的 Emoji 與分帳類別 Emoji 保留;不引入 icon font。
- 新卡片型別:①`schema.js` type.values 加值 ②`typeTag` 回傳標籤 ③`infoPanel` 加分支 ④(選)獨立面板函式。四步缺一 healthCheck 會警告未註冊型別。

## Parser 規則
- 完全依 SCHEMA 解析,禁硬編碼欄位位置(Expenses 自由格式的欄位位置也寫在 `schema.exp.layout`)。
- 表頭比對走 header＋aliases;欄位順序／新增欄位不得使程式崩潰。
- 壞資料 → AppLog 警告＋回退安全值,絕不 throw 到頂層。

## Renderer 規則
- 依框架 CONVENTIONS「結構」。view 切換統一走 `switchView` → `renderCurrent`(含 try/catch → Render Error 保護)。

## Storage 規則
- 個人狀態(打卡／想逛／成員／個人帳／主題／行前勾選)存 localStorage,**不回寫 CMS**;照片 Blob 存 IndexedDB,localStorage 只存 photoId。
- 一般個人狀態存取經 `lsGet/lsSet`(內含 try/catch → Repository Error)。打卡／行程進度由 `readTripProgressChecked/writeTripProgressChecked` 確認結果與恢復(v144);不把全域 `lsSet` 改成拋例外、不另建平行完成判定。
- 個人狀態的讀取、寫入與完成／略過等判定必須走單一入口;禁止在不同 Renderer、事件處理器或 Service 另建平行狀態邏輯。
- 會進個人備份的欄位與相容策略見 `docs/personal-state-compatibility.md`;改備份格式要同步測試。

## Schema 規則
- `schema.js` 是唯一改欄位的地方;改完以 `schemaDoc()` 重新產生 `09_SCHEMA_MAPPING.md` 表格區。
- 型別值、設定鍵的正規化對應寫在 Schema 的 values,不散落程式。
- 新增或修改 Sheet 欄位／分頁屬憲章「須先確認」事項。

## Google Sheet 命名規則
- 一般資料表 ID:Places=`P###`、Restaurants=`R###`、Shopping=`S###`、Hotels=`H###`;不需連號,但**不得重複、不得改變既有 ID 意義**。
- Expenses 是自由格式,沒有 `E###` ID;行程總表引用限使用 Schema 支援的 `P###`／`R###`。
- 一般非住宿地點多次造訪用同一 PID;住宿是例外:同一間住宿若 travel 脈絡不同,可使用多個 route-stop PID,但都引用同一個 Hotels.HID。Type 為必填(限 Schema 定義值)。
- 欄位標題應與 Schema header 或 aliases 一致;選填分頁依表頭名稱對欄。

## 版本與交付
- App 版本為單調遞增的 `vNNN`(`sw.js` 的 `SW_VERSION` 與 current generation 的 `app-version.js` 必須相同);App Shell 有任何變更就 forward bump 到下一個未使用的號碼,不倒退、不重用(`16_OPS_PLAYBOOK.md` §A2)。repo 只保留最近三代 shell。
- 每次交付更新 `07_CHANGELOG.md`(架構變更標 ⭐)與發布說明(App 內只留最近 5 版)。
- 交付順序:開發 → commit → push → PR 進 `dev` → CI → Release PR(`dev` → `main`)→ Netlify → 線上核對 → production tag(16 §E)。
- 每次修改跑 QA 三情境:斷網內建／連網同步／旅行日 mock Date,零 pageerror。

## 已知陷阱(必守)
- 同名 function 後者勝且提升 → 包裝舊函式必先改名(如 `renderSplitCore`),禁 `var old=fn; function fn(){old()}`(無限遞迴)。
- 禁用 AbortController(WebView clone 錯誤)。
- item id 含「/」→ DOM 查找用 `getElementById`,勿用 CSS selector。
- 「現在」一律用 `appNow()`;其他地方不得 `new Date(` 取現在時間(測試會擋;日期計算用 `Date.UTC`)。
- 文件與測試裡寫 CSS 選擇器時注意:某些測試以字串搜尋第一個 `.xxx{`,新規則請加前綴(例如 `html[data-theme=…]`)以免搶到位置。
