# CURRENT(現在正在做的)

> 更新於 2026-07-19。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.2.1 前端強化已完成實作：Schema 維持 `2.8 (2026-07-19)` 與 Ledger 固定 21 欄，`time` 維持消費發生時間；Repository、Queue、Apps Script、結算及墓碑資料契約均未變更。
- 團體帳使用 `enqueueBatch` 一次寫入 Queue 後立即關閉表單，背景 POST 失敗保留待同步；TEST 模式為獨立平行帳本。個人帳與代購對象清單維持 localStorage only，備份格式為 v3 且相容 v1／v2。
- 快速記帳日期統一嚴格 `YYYY/MM/DD` 並逐字補斜線；清空、不完整或無效日期不可儲存。身分／多品項同列，多品項類別改為收合選擇器；Bottom Sheet 維持 Scroll-only，390px／375px 的 Grid 與輸入框已無水平溢出。
- 最近與完整紀錄依既有 batchId 收合多品項，卡片固定雙幣別並依個人／團體顯示必要資訊；`⋯` 改為錨定 Popover。最近 15 筆支援記憶體內多選，個人一次本機寫入刪除，團體以既有墓碑與一次 enqueueBatch 處理。
- Service Worker cache 已升至 v23；Validator 六類日誌、Schema、Apps Script、Repository／Queue 契約、結算、墓碑資料契約、BUILTIN、四分頁、icons、manifest、Netlify、viewport recovery 均未改動。

## 🔨 進行中
- Ledger 2.2.1 的 34 個 `tests/*.test.js` 與文件標題檢查皆為 exit 0；390px／375px 已實測分帳首頁、Bottom Sheet、日期補斜線／空白阻擋、多品項、月曆、錨定選單及多選工具列，changed surfaces 無水平溢出且 browser error 為 0。等待完成禁改稽核與指定 commit／push `dev`。Apps Script 21 欄部署與公開 CSV 落位維持既有真實驗收結果。

## ⏸ 等 Bar 動作
1. 驗收 dev 的 iOS Bottom Sheet／嚴格日期鍵入／批次收合／錨定選單／多選刪除、TEST 帳本、離線補送及跨裝置延遲。
2. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ 於 dev 測試站完成手機驗收；通過後走 merge 與正式站驗證。回滾依 `16_OPS_PLAYBOOK.md` §A。
