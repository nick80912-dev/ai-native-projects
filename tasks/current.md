# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.2.1 前端強化已完成實作：Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄，`time` 維持消費發生時間；Repository、Queue、Apps Script、結算及墓碑資料契約均未變更。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳日期統一嚴格 `YYYY/MM/DD` 並逐字補斜線；日期／時間在 375px／390px 緊湊同列，單筆置於類別上方、多品項置於完整品項清單後。店家改為支付方式上方的共用欄位，多品項類別／免稅／個人代購同列，Bottom Sheet 維持 Scroll-only。
- 最近與完整紀錄依既有 batchId 收合多品項；一般卡與選取卡改為交換配件欄的二欄 Grid，選取時不輸出 `⋯`。最近 15 筆支援記憶體內多選，個人一次本機寫入刪除，團體以既有墓碑與一次 enqueueBatch 處理。
- 預設「衣服」類別已改「衣物」並補上 👕／💄 Emoji，舊本機選項只在讀取時相容正規化、歷史紀錄不改寫。Service Worker cache 已升至 v24；Validator 六類日誌、Schema、Apps Script、Repository／Queue 契約、結算、墓碑資料契約、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.2.1 Mobile Hotfix 的 35 個 `tests/*.test.js` 與文件標題檢查皆為 exit 0；390px／375px 已實測卡片二欄交換、選取模式無操作鈕、日期時間同列、店家欄及多品項緊湊控制，changed surfaces 無水平溢出且 browser error 為 0。等待完成禁改稽核與指定 commit／push `dev`；Apps Script 21 欄部署與公開 CSV 落位維持既有真實驗收結果。

## ⏸ 等 Bar 動作
1. 驗收 dev 的 iOS Bottom Sheet／嚴格日期鍵入／批次收合／錨定選單／多選刪除、TEST 帳本、離線補送及跨裝置延遲。
2. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ 於 dev 測試站完成手機驗收；通過後走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
