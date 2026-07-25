# CURRENT(現在正在做的)

> 更新於 2026-07-25。細任務層;里程碑看 `06_ROADMAP.md`,歷史交付看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 📌 現況
- 2026-07-23 治理決策追認、§4 禁改清單硬停規則與任務板歸位 — 已完成,詳見 `07_CHANGELOG.md`。
- v34–v44 三秒記帳與首頁／結算卡系列 — 已完成並經 Bar 真機驗收,詳見 `07_CHANGELOG.md`。
- 採買清單批（SW v45）— 已完成開發；目標測試、完整 41／41 Node tests、文件標題檢查及 375px／390px Browser QA 通過，待 Bar iPhone Safari／PWA 真機驗收；詳見 `07_CHANGELOG.md`。
- 2026-07-25 結算狀態、近即時同步與介面簡化 Hotfix（SW v47）— Bar 已部署 Apps Script `doGet`，真實端點驗證（CORS、redirect、`after`/`reset`/`serverTime`、非 JSON 降級）通過；已合入 `dev` 並推送（`f9d8a91`），詳見 `07_CHANGELOG.md`。
- 2026-07-25 真機驗收發現「結算完仍卡台幣 680」— 已以 SW v48 修正為結算狀態只依 ADR 0007 單一結算幣別判斷，參考幣別殘值不再重新打開狀態卡；同批為結清紀錄／計算明細兩張次層 sheet 補上「‹ 返回」。完整 `tests/*.test.js` 與文件標題檢查通過，詳見 `07_CHANGELOG.md`。
- 2026-07-25 續報「摘要台幣參考對照顯示 NT$0」— 已以 SW v49 修正為另一幣顯示 `convertLedgerAmounts()` 換算參考值（`¥3,160 ≈ NT$632`），已結清不顯示金額；僅改顯示層。完整 43／43 Node tests（reliability 94／94）與文件標題檢查通過。
- 2026-07-25 續報「計算明細仍卡台幣」與「退回列擁擠錯位」— 已以 SW v50 修正：參考幣別一律由結算幣別換算（`settlementReferenceAmount`／`settlementReferenceTransfers`），次層計算明細不再讀另一幣獨立累計餘額；退回列改固定兩列（對象/金額 ｜ 狀態、原因 ｜ 動作），375px 實測無重疊無溢出。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過。
- 2026-07-25 退回列窄螢幕再收緊（SW v51）— 移除冗餘的「退回原因:」前綴（保留 `aria-label`），320／375／390／430px 四寬度實測零重疊、按鈕右緣一致。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過；**待 Bar 真機驗收（需自多工列滑除 App 後重開兩次才會換到新 SW）**。

## ⏸ 等 Bar 動作
1. **（優先）部署新版 `apps-script/ledger-sync.gs`**：新版本部署、保持原 Web App URL，並以無痕模式確認 `{WEB_APP_URL}?action=ledger&after=0` 回傳可解析 JSON；步驟見 `apps-script/README.md`「doGet 部署與驗收」。回報後 Claude 才續行真實 GET／CORS／redirect／`after`／`reset`／`serverTime` 與前端 fast pull 整合驗證。
2. 驗收採買清單的 Today 提醒／常駐入口、完整清單 overlay、單筆與多品項記帳閉環，以及 PWA 更新後的本機資料保留。
3. 等待設定頁 2.0 批發包;正式範圍見 `tasks/backlog.md`。
4. 後續批次驗收通過後,由 Bar 核准 PR merge `dev → main`;未核准前不得 merge、push `main` 或部署。

## 下一棒
→ Bar 先部署 Apps Script `doGet` 並回報,Claude 續行真實端點與前端整合驗證;其後做採買清單與本批結算 Hotfix 的 iPhone Safari／PWA 真機驗收,再發出「設定頁 2.0 批」Codex prompt，全部驗收完成再另案處理 `dev → main`。
