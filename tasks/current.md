# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.2.2 多品項版面優化已完成 dev 實作、待 Bar iOS 真機驗收：Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄，`time` 維持消費發生時間；Repository、Queue、Apps Script、結算及墓碑資料契約均未變更。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳日期維持嚴格 `YYYY/MM/DD` 與逐字補斜線；多品項的日期、時間、必填店家與支付方式已集中於清單上方帳單資訊卡。品項改為自動序號同列 Grid，單品不保留刪除空欄，類別／免稅／個人代購同列且僅多品項開放集合採 8px 圓角矩形，Bottom Sheet 維持 Scroll-only。
- 最近與完整紀錄依既有 batchId 收合多品項；一般卡與選取卡改為交換配件欄的二欄 Grid，選取時不輸出 `⋯`。最近 15 筆支援記憶體內多選，個人一次本機寫入刪除，團體以既有墓碑與一次 enqueueBatch 處理。
- 預設「衣服」類別已改「衣物」並補上 👕／💄 Emoji，舊本機選項只在讀取時相容正規化、歷史紀錄不改寫。Service Worker cache 已升至 v25；Validator 六類日誌、Schema、Apps Script、Repository／Queue 契約、結算、墓碑資料契約、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.2.2 的多品項帳單資訊、店家必填、短金額錯誤、序號 Grid 與限定矩形樣式已完成；36 個 `tests/*.test.js`、文件標題與禁改稽核通過。375px／390px 已實測 1／3／5／10 品項、長店名、1／5／8 位金額、類別與代購展開，changed surfaces 無水平溢出且 browser error log 為 0；iOS 真機 Dynamic Type 100%／115%、虛擬鍵盤與 Scroll-only 體感保留給 Bar 驗收。

## ⏸ 等 Bar 動作
1. 驗收 dev 的 iOS 多品項帳單資訊、1／3／5／10 品項、Dynamic Type 100%／115%、鍵盤與 Scroll-only；並回歸嚴格日期鍵入、批次收合、錨定選單、多選刪除、TEST 帳本、離線補送及跨裝置延遲。
2. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ 於 dev 測試站完成手機驗收；通過後走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
