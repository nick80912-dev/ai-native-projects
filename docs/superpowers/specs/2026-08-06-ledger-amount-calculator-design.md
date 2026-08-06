# Ledger 共用金額計算器設計

## 目標

在既有 Ledger 新增、編輯、更正與採買轉記帳表單中加入一套共用金額計算器，支援單品、多品項與折扣金額。計算器只改草稿 UI workflow，不改 Ledger schema、備份格式、帳務推導或同步策略。

## 已選方案

採用單一 `ledgerCalculatorState` 與資料目標：`single`、`item`、`discount`。計算器不保存 DOM 節點或 DOM ID；套用時重新確認目前 Ledger 草稿及品項 key，再走既有 `updateLedgerDraftField()` 或 `updateLedgerDraftItem()` 更新。

未採用的方案：

- 每個欄位各自建立計算機：重複 parser、狀態與無障礙行為，容易漂移。
- 只記 DOM ID：Ledger sheet 重繪後舊節點會失效，可能寫錯欄位。
- 使用 `eval()` 或 `Function()`：不接受任意程式碼執行風險。

## 運算規則

- 支援 `+`、`-`、`*`、`/`，畫面顯示 `＋`、`−`、`×`、`÷`。
- 使用明確 tokenizer 與運算優先序 parser，不使用 `eval()`、`Function()` 或動態 script。
- 支援連續多筆加總及一般四則優先序。
- 除數為零、語法不完整或非法字元時顯示錯誤，禁止套用。
- 套用值必須大於 0、為整數且不超過 `Number.MAX_SAFE_INTEGER`；不四捨五入。
- 單品與多品項套用錯誤文案為「記帳金額必須是大於 0 的整數」。折扣沿用金額型欄位但允許 0；小數、負數或超過安全整數仍禁止套用。

## UI 與 workflow

- 金額 label 與 44×44px 線條 SVG 按鈕同列；按鈕是輸入欄 sibling，不覆蓋右下換算結果。
- 多品項每列金額欄提供同一按鈕；折扣欄亦提供。
- 點擊後 blur 原輸入，關閉 iPhone 原生數字鍵盤，保存 Ledger sheet `scrollTop`，並讓背景表單 inert。
- 底部 sheet 顯示完整算式、結果、四則按鍵、清除、退格、取消及套用。
- 既有值作為初始算式；空值則從空算式開始。
- 取消不改草稿；套用後更新原草稿、重算換算或多品項總額、恢復原表單捲動，並將焦點送回原欄位。
- 計算器關閉不關閉 Ledger 新增消費 sheet，不清除任何其他草稿欄位。
- Escape 等同取消；背景不可點擊關閉，避免意外遺失算式。

## 範圍

涵蓋個人／團體、建立／編輯／更正、採買預填、儲存並再記一筆後的表單、每個多品項金額及折扣金額。因所有入口共用 Ledger draft renderer，不為入口建立特殊分支。

不涵蓋匯率、稅率、日期時間、採買數量、分攤人數、系統推導的結清金額。

## 版本與相容性

本批使用 v92；v90／v91 原先已排給 SW 更新提示驗收，因此不重用。v92 交付後，該雙版本驗收順延為 v93／v94，保持版本單調前進。`app-version.js` 與 `sw.js` 同步升 v92，`sw.js` 僅修改版本字串。`PERSONAL_STATE_VERSION` 維持 9，`netlify.toml` 不修改。

## 驗證

- Node：parser 優先序、連續加總、除零、非法／不完整算式、整數與安全範圍；target 更新、取消、套用及重繪後 item key 定位。
- DOM 契約：三種按鈕、SVG、44×44px、sibling 結構、aria、無 `eval()`／`Function()`。
- Playwright：320／375／390px；單品、多品項、折扣；焦點、inert、scroll、Escape、換算更新、無水平 overflow、草稿內容保留。
