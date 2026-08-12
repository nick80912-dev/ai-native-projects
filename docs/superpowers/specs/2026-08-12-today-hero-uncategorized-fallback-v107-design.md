# Today Hero 未分類 fallback v107 設計

## 目的

Today Hero 採買摘要目前在第一優先項目的 `category` 為空字串時，只顯示地點。這會讓畫面看起來像分類漏載或被版面裁切。v107 在 Hero 顯示層把空分類明確呈現為「未分類」，讓摘要結構與含義一致。

## 顯示規則

- 有分類時維持 `地點 · 第一優先分類 +N`。
- 第一優先項目的分類為空白時，顯示 `地點 · 未分類 +N`。
- 單一待買項目不顯示 `+N`；多筆時 `+N` 仍代表同一地點其餘待買項目數。
- 地點繼續遵守 v106 規則：超過六個 Unicode code point 顯示前六字加 `…`，極窄寬度可再縮短。
- 「未分類」與 `+N` 和其他合法分類一樣完整顯示、不可 flex-shrink 或省略。
- 整組維持靠右與 `4px` 間距。

## 資料邊界

「未分類」只是一個 Hero 顯示 fallback，不是新的 Shopping 分類值，也不寫回資料。

- `SHOPPING_CATEGORIES` 維持 `必買／伴手禮／生活用品／其他`。
- `category: ''` 在 Shopping store、編輯表單、備份、還原與同步中仍保持空字串。
- 不自動轉成「其他」，不要求使用者補分類，也不修改舊資料。
- `buildShoppingTodayReminder()` 與 `todayShoppingHeroModel()` 繼續回傳原始空白 `firstCategory`；renderer 才將空白轉為可見及可及的「未分類」。

## 可及性與安全

Resolved Hero button 的 `aria-label` 使用完整地點、顯示分類與總待買項數。空分類範例為：`開啟Nakayama Farm Heart Sakazu採買：未分類，共 1 項待買`。

Hero visible markup 與 accessible name 仍不得包含任何品名。既有 HTML／attribute escaping、點擊、Enter、Space、focus-visible 與 Shopping 地點定位均不變。

## 測試

Node renderer 測試應將既有空分類案例由「省略分類區塊」改為要求：

- 顯示分隔點與 `.today-hero-shopping-category` 的「未分類」。
- 多筆時保留正確 `+N`。
- aria 使用完整地點、「未分類」與總待買數。
- 不顯示品名，也不把「未分類」寫回 model 或 reminder input。

Playwright 使用一個真實空分類待買 fixture 驗證 320／375／390px：

- Hero 顯示「未分類」，且分類與 `+N` 無 overflow 或 ellipsis。
- 整組仍貼齊右側、間距緊湊、地點可縮。
- 點擊後仍開啟並定位至相同 Shopping 地點群組。

## 版本與範圍

此修正以 v107 向前升版，更新 app version、service worker cache、release notes、UI guideline、changelog、handover、current task 與測試說明。

不修改 Shopping schema、分類選項、表單必填規則、store、個人備份、Google Sheet、Ledger、Health Check、同步、離線資料或 production 部署。完成驗證後推送 `dev` 供手機確認；除非另行指示，不合併 `main`、不部署 production、不建立 tag。
