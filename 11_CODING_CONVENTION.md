# 11 編碼規範(Coding Convention)

> 取代 05_CODING_RULES。技術基線:vanilla JS 單一 HTML,無框架、無 build、無 npm。ES5 風格(function/var),相容老舊 WebView。

## 命名規則
- 函式:camelCase 動詞開頭 — `renderTrip` `resolveParking` `parseTable` `buildHeaderMap`。
- 全域資料物件:大寫 — `SCHEMA` `DB` `RAW` `SRC` `BUILTIN` `AppLog`。
- 區域變數:camelCase;布林以 is/has 開頭佳。
- localStorage key:前綴 `trip_`(個人狀態)/ `v2_cache_`(同步快取)。
- CSS class:沿用既有縮寫體系 `qa-btn` `pc-row` `nx-` `st-` `fl-` `mc-`;禁自創平行體系。
- CSS 顏色:一律用 `:root` 變數(--sea/--coral...),禁硬編碼色碼。

## Component 規則(元件函式)
- 一個元件函式只產出一種 UI 片段,回傳 HTML 字串。
- 所有動態文字經 `escapeHtml()`;內部復用 `kvRow/tipBox/linkRow/storeRow`,不重複拼接邏輯。
- 新卡片型別:①schema.js type.values 加值 ②typeTag 回傳標籤 ③infoPanel 加分支 ④(選)獨立面板函式。四步缺一 healthCheck 會警告未註冊型別。

## Parser 規則
- 完全依 SCHEMA 解析,禁硬編碼欄位位置(Expenses 自由格式的欄位位置也寫在 schema.exp.layout)。
- 表頭比對走 header + aliases;欄位順序/新增欄位不得使程式崩潰。
- 壞資料 → AppLog 警告 + 回退安全值,絕不 throw 到頂層。

## Renderer 規則
- Renderer 只負責畫面,不抓資料、不寫 storage、不觸發同步。
- view 切換統一走 `switchView` → `renderCurrent`(含 try/catch → Render Error 保護)。

## Storage 規則
- 個人狀態(打卡/想逛/成員/記帳)存 localStorage,**不回寫 CMS**。
- 存取一律經 `lsGet/lsSet`(內含 try/catch → Repository Error)。

## Schema 規則
- schema.js 是唯一改欄位的地方;改完重新產生 09_SCHEMA_MAPPING(schemaDoc())。
- 型別值、設定鍵的正規化對應寫在 Schema 的 values,不散落程式。

## Google Sheet 命名規則
- ID:P/R/S/H/E + 三位數;不需連號,但**不得重複、不得改變既有 ID 意義**。
- 同一地點多次造訪用同一 PID;Type 為必填(限 Schema 定義值)。
- 欄位標題應與 Schema header 或 aliases 一致。

## Commit / 版本規則
- 版本語意:主架構變更進位(V2→V3),功能微調用小數(V2.1)。
- 每次交付更新 07_CHANGELOG(架構變更標 ⭐);sw.js 有改必 bump VERSION。
- 交付順序:預覽版 HTML → Bar 核可 → 打包 ZIP。

## 已知陷阱(必守)
- 同名 function 後者勝且提升 → 包裝舊函式必先改名(如 renderSplitCore),禁 `var old=fn; function fn(){old()}`(無限遞迴)。
- 禁用 AbortController(WebView clone 錯誤);保留 console polyfill 與 fetch 相容退回。
- item id 含「/」→ DOM 查找用 getElementById,勿用 CSS selector。
