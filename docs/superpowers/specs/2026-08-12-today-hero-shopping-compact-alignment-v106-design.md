# Today Hero 採買摘要緊湊靠右 v106 設計

## 目的

修正 Today Hero 採買摘要雖然設定為右對齊，但地點與第一優先分類仍因比例式 flex 欄位而分散的問題。摘要下排應形成一個緊湊的右對齊群組，分類是主要決策資訊，必須完整顯示；地點則可截短以保護分類與數量。

## 顯示規則

- 上排 `順路採買`／`今日採買` 維持右對齊。
- 下排依序顯示 `地點 · 第一優先分類 +N`，整組貼齊摘要右側。
- 地點最多保留前六個 Unicode 字元。原始地點超過六字時，視覺文字改為 `前六字…`；六字以內完整顯示。
- 分類與 `+N` 不使用省略符號，也不允許 flex shrink。
- 地點、分隔點、分類與 `+N` 之間沿用單一緊湊間距，目標為 `4px`，不得用比例欄位或 `space-between` 拉開。
- 例如：
  - `原爆圓頂館 · 生活用品 +2`
  - `廣島和平紀念… · 生活用品 +2`
- 在 320px 等極窄寬度，若六字地點仍無法與完整分類及數量共存，地點可以由 CSS 再縮短並顯示省略符號；分類與 `+N` 仍須完整。

## 資料與可及性

資料選擇、第一優先分類、剩餘數量、點擊／鍵盤操作與 Shopping 導航均不變。

只在 renderer 建立視覺用的縮短地點；`todayShoppingHeroModel()` 的 `stopName` 仍保存完整值。按鈕的 `aria-label` 繼續使用完整地點、完整分類與總項數，因此視覺截短不會減少輔助科技資訊。

地點截短以 `Array.from()` 計算 Unicode code point，避免直接用 UTF-16 index 切斷代理對；本次不引入新的資料欄位或儲存格式。

## 版面實作

- Shopping value row 明確使用 `justify-content: flex-end`。
- 地點改為可縮、具最大視覺長度的 flex item；保留單行 `text-overflow: ellipsis`。
- 分隔點、分類與數量改為內容寬度且不可縮。
- 移除地點與分類現有的 `1.15`／`.85` 比例分配，避免兩者各佔一塊欄寬。
- Hero 高度、兩欄摘要 grid、44px 點擊目標、focus ring 與所有主題樣式不變。

## 測試

Node renderer 測試應涵蓋：

- 六字內地點完整顯示。
- 七字以上地點顯示前六字與省略符號。
- `aria-label` 保留完整地點。
- 分類與 `+N` 的 markup 仍完整且不含品名。

Playwright 在 320／375／390px 應驗證：

- 下排群組右緣與按鈕內容右緣對齊。
- 相鄰元素 gap 為 `4px`，沒有比例分散造成的大空白。
- 分類及 `+N` 沒有 overflow、ellipsis 或縮排。
- 長地點可省略，整列維持單行，Hero 高度與頁面水平 overflow 不退步。
- 點擊、Enter、Space、focus-visible 與 Shopping 導航維持既有行為。

## 版本與範圍

此調整以 v106 向前升版，更新 app version、service worker cache、release notes、UI guideline、changelog、handover、current task 與測試說明。

不變更 Shopping 資料、分類選項、排序、行程匹配、Health Check、同步策略、離線資料、Ledger 或正式部署流程。完成後先推送 `dev` 供手機驗證；除非另行指示，不部署 production。
