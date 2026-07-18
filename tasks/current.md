# CURRENT(現在正在做的)

> 更新於 2026-07-18。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.0 PR 5 已完成個人／團體雙軌手機儀表板：總額可切換 JPY／TWD、今日摘要、個人代購摘要、團體結算摘要，以及依裝置日期分組的最近 15 筆消費。
- 快速記帳改為 Bottom Sheet，支援單品與多品項；Sheet 遵循 Scroll-only 裁定，捲動區 `touch-action:pan-y`、控制項 `touch-action:manipulation`，開啟時鎖定背景，未加入 JavaScript 手勢攔截。
- 多品項支援各自名稱、正整數金額、類別與單項代購／分攤覆寫；幣別、支付方式、稅制、固定折扣及備註維持整單層級。税込、税抜 8%／10%、免稅與折扣均透過已測試的最大餘數分配，雙幣品項總和精確等於整單實付。
- 個人代購可依對象查看小計；團體結算 UI 只格式化 PR 4 的 participants 快照、雙幣淨額與確定性轉帳建議，不重寫結算數學。
- 完整歷史支援個人全部／代購篩選、日期分組與紀錄明細。明細只從目前可見紀錄查找；個人沿用真刪確認，團體沿用墓碑刪除，已刪目標與墓碑沒有明細或刪除入口。
- 團體多品項會先將整批獨立 Record ID 同步加入既有 Queue，再等待網路結果；共同 `batchId` 可於明細追查。個人多品項維持本機原子驗證後寫入。
- Service Worker cache 已升至 v20。Schema 仍為 2.6；本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、manifest、icon 或 Netlify 設定。

## 🔨 進行中
- 無；PR 5 實作、聚焦回歸與 390px 本機 QA 已完成，等待 Bar 手機驗收 `dev` 最新版。

## ⏸ 等 Bar 動作
1. 手機全面驗收 `dev`：個人／團體儀表板、快速單品、多品項稅折、代購覆寫、團體分攤、完整歷史、紀錄明細與結算面板。
2. 驗收通過後核准 PR merge `dev → main`，再由 Netlify Production 自動部署。

## 下一棒
→ Merge 後執行 Netlify 正式站驗證；回滾依 `16_OPS_PLAYBOOK.md` §A。
