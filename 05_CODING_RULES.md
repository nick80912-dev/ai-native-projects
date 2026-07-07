# 05 程式規範(快速概覽)

## 文件定位
- 本文件是 AI / 開發者的快速規範。
- 詳細規範見 `11_CODING_CONVENTION.md`。
- 資料欄位權威來源是 `schema.js`。
- 若有衝突: `schema.js` > `09_SCHEMA_MAPPING.md` > `11_CODING_CONVENTION.md` > 本文件。

## 技術基線
- Vanilla JS 單一 HTML 檔,**無框架、無打包工具、無 npm 相依**。
- ES5 風格為主(function/var),相容老舊 WebView。
- 禁用 AbortController(WebView clone 錯誤)。
- 保留 console polyfill 與 fetch 相容模式(fetchWithTimeout),勿「優化」掉。

## 鐵律
1. **不硬編碼資料**:內容一律來自 Google Sheets;唯一例外是 BUILTIN 內建快照(建置時注入,作離線後備)。
2. **Schema First**:發布 URL、gid、Sheet 定義、欄位 header、aliases、required、Type values 一律由 `schema.js` 的 `SCHEMA` 管理。
3. **不重複邏輯**:渲染用共用元件函式(kvRow/tipBox/storeRow/panel);修 bug 修一處。
4. **型別不用猜**:卡片型別只看 Places.Type 經 `schema.js` 正規化後的值;文字推測僅限「不在資料庫的雜項列」備援。
5. **解析容錯**:parseTable / buildHeaderMap 依 SCHEMA 的 header + aliases 做表頭比對;新欄位/欄序變動不得使程式崩潰;壞資料 AppLog 警告不報錯到頂層。
6. **個人狀態存本機**:localStorage keys 包含 trip_checks、trip_shop_wants、trip_people、trip_expenses;**不進 CMS**。
7. **最小必要修改**:只做被要求的修改,不順手重構、不擴大範圍。
8. **文件同步**:有交付就更新 `07_CHANGELOG.md`;若改欄位或 Schema,同步更新 `09_SCHEMA_MAPPING.md`。

## 命名
- 函式 camelCase 動詞開頭(renderTrip/resolveParking/parseTable/buildHeaderMap)。
- 全域資料大寫(SCHEMA/DB/RAW/SRC/BUILTIN/AppLog)。
- localStorage key 前綴 trip_ / v2_cache_。
- CSS class 沿用既有縮寫體系(qa-btn/pc-row/nx-/st-/fl-/mc-),禁自創平行體系。

## 修改守則
- 只改被要求的函式或文件;動到共用函式先確認呼叫點。
- 新增欄位:先改 Google Sheet,再改 `schema.js`;Parser 不需修改。
- 新增卡片型別:先改 `schema.js` Type values,再註冊 typeTag / infoPanel / 相關 renderer。
- JS 函式重定義覆蓋陷阱:同名 function 宣告「後者勝」且提升;包裝舊函式時必須**改名原函式**(如 renderSplitCore),嚴禁 `var old=fn; function fn(){old()}`(無限遞迴)。
- item id 含特殊字元時,DOM 查找用 getElementById,勿用 CSS selector。
- 每次修改跑 QA:斷網內建 / 連網同步 / 旅行日(mock Date)三情境,零 pageerror。
- sw.js 有改 → bump VERSION;交付順序:預覽 HTML → 核可 → ZIP。
