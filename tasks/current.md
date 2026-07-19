# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.2.3 表單驗證與多品項預設已完成 dev 實作、待 Bar iOS 真機驗收：Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄，`time` 維持消費發生時間；Repository、Queue、Apps Script、結算及墓碑資料契約均未變更。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳日期維持嚴格 `YYYY/MM/DD` 與逐字補斜線；多品項的日期、時間、必填店家、支付方式與批次套用類別集中於清單上方帳單資訊卡。店家與半填品項採行內錯誤及首錯誤聚焦，完全空白列不送出；新品項沿用批次類別，手動品項不被一般切換覆寫。
- 最近與完整紀錄依既有 batchId 收合多品項；一般卡與選取卡改為交換配件欄的二欄 Grid，選取時不輸出 `⋯`。最近 15 筆支援記憶體內多選，個人一次本機寫入刪除，團體以既有墓碑與一次 enqueueBatch 處理。
- 預設「衣服」類別已改「衣物」並補上 👕／💄 Emoji，舊本機選項只在讀取時相容正規化、歷史紀錄不改寫。Service Worker cache 已升至 v26；Validator 六類日誌、Schema、Apps Script、Repository／Queue／Retry／Flush 契約、結算、墓碑資料契約、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.2.3 已完成多品項行內驗證、有效筆數、批次類別繼承／強制套用、編輯 A 方案與再記一筆保留規則；日期時間、支付按鈕、品項 Grid、代購容器及單筆基本資料卡已依 375px／390px 規格收斂。37 個 `tests/*.test.js`、文件標題與 diff 檢查通過；375px／390px 實測單筆與 10 品項、7 位輸入、代購展開及類別繼承均無水平溢出，browser error log 為 0。iOS 真機 Dynamic Type 100%／115%、虛擬鍵盤與 Scroll-only 體感保留給 Bar 驗收。

## ⏸ 等 Bar 動作
1. 驗收 dev 的 iOS 多品項行內驗證、批次類別、確認儲存／再記一筆、1／3／5／10 品項、7 位金額、長支付方式、Dynamic Type 100%／115%、鍵盤與 Scroll-only；並回歸嚴格日期鍵入、批次收合、錨定選單、多選刪除、TEST 帳本、離線補送及跨裝置延遲。
2. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ 於 dev 測試站完成手機驗收；通過後走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
