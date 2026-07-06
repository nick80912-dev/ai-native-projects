# 05 程式規範

## 技術基線
- Vanilla JS 單一 HTML 檔,**無框架、無打包工具、無 npm 相依**
- ES5 風格為主(function/var),相容老舊 WebView;禁用 AbortController(clone 錯誤)
- 保留 console polyfill 與 fetch 相容模式(fetchWithTimeout),勿「優化」掉

## 鐵律
1. **不硬編碼資料**:內容一律來自 Google Sheets;唯一例外是 BUILTIN 內建快照(建置時注入,作離線後備)
2. **不重複邏輯**:渲染用共用元件函式(kvRow/tipBox/storeRow/panel);修 bug 修一處
3. **型別不用猜**:卡片型別只看 Places.類型;文字推測僅限「不在資料庫的雜項列」備援
4. **設定集中**:URL/gid 只存在 CONFIG 區塊;換表改一行
5. **解析容錯**:rowsToObjects 走表頭別名;新欄位/欄序變動不得使程式壞掉;壞資料 console.warn 不報錯
6. **個人狀態存本機** localStorage:打卡 trip_checks、想逛 trip_shop_wants、成員 trip_people、記帳 trip_expenses;**不進 CMS**

## 命名
- 函式 camelCase 動詞開頭(renderTrip/resolveParking);全域資料大寫(DB/CONFIG/BUILTIN/SHEETS)
- localStorage key 前綴 trip_ / v2_cache_
- CSS class 沿用既有縮寫體系(qa-btn/pc-row/nx-/st-/fl-)

## 修改守則
- 只改被要求的函式;動到共用函式先確認呼叫點
- JS 函式重定義覆蓋陷阱:同名 function 宣告「後者勝」且提升;包裝舊函式時必須**改名原函式**(如 renderSplitCore),嚴禁 `var old=fn; function fn(){old()}`(無限遞迴)
- 每次修改跑 QA:斷網內建 / 連網同步 / 旅行日(mock Date)三情境,零 pageerror
- sw.js 有改 → bump VERSION;交付順序:預覽 HTML → 核可 → ZIP
