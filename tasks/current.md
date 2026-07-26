# CURRENT(現在正在做的)

> 更新於 2026-07-26。細任務層;里程碑看 `06_ROADMAP.md`,歷史交付看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 📌 現況
- 2026-07-23 治理決策追認、§4 禁改清單硬停規則與任務板歸位 — 已完成,詳見 `07_CHANGELOG.md`。
- v34–v44 三秒記帳與首頁／結算卡系列 — 已完成並經 Bar 真機驗收,詳見 `07_CHANGELOG.md`。
- 採買清單批（SW v45）— 已完成開發；目標測試、完整 41／41 Node tests、文件標題檢查及 375px／390px Browser QA 通過，待 Bar iPhone Safari／PWA 真機驗收；詳見 `07_CHANGELOG.md`。
- 2026-07-25 結算狀態、近即時同步與介面簡化 Hotfix（SW v47）— Bar 已部署 Apps Script `doGet`，真實端點驗證（CORS、redirect、`after`/`reset`/`serverTime`、非 JSON 降級）通過；已合入 `dev` 並推送（`f9d8a91`），詳見 `07_CHANGELOG.md`。
- 2026-07-25 真機驗收發現「結算完仍卡台幣 680」— 已以 SW v48 修正為結算狀態只依 ADR 0007 單一結算幣別判斷，參考幣別殘值不再重新打開狀態卡；同批為結清紀錄／計算明細兩張次層 sheet 補上「‹ 返回」。完整 `tests/*.test.js` 與文件標題檢查通過，詳見 `07_CHANGELOG.md`。
- 2026-07-25 續報「摘要台幣參考對照顯示 NT$0」— 已以 SW v49 修正為另一幣顯示 `convertLedgerAmounts()` 換算參考值（`¥3,160 ≈ NT$632`），已結清不顯示金額；僅改顯示層。完整 43／43 Node tests（reliability 94／94）與文件標題檢查通過。
- 2026-07-25 續報「計算明細仍卡台幣」與「退回列擁擠錯位」— 已以 SW v50 修正：參考幣別一律由結算幣別換算（`settlementReferenceAmount`／`settlementReferenceTransfers`），次層計算明細不再讀另一幣獨立累計餘額；退回列改固定兩列（對象/金額 ｜ 狀態、原因 ｜ 動作），375px 實測無重疊無溢出。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過。
- 2026-07-25 退回列窄螢幕再收緊（SW v51）— 移除冗餘的「退回原因:」前綴（保留 `aria-label`），320／375／390／430px 四寬度實測零重疊、按鈕右緣一致。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過；**待 Bar 真機驗收（需自多工列滑除 App 後重開兩次才會換到新 SW）**。
- 2026-07-25 團體帳本只顯示與目前成員相關的紀錄（SW v58）— `ledgerTrackRecords()` 這個唯一共用節流點加上「付款人 or 分攤成員」過濾（方案 A 全面一致，不加切換 UI）；舊資料 `participants` 無效時限定式 fail-open、成員無法解析時完全不過濾；主卡片文案改 `與我相關 · N 筆紀錄`；編輯／刪除三處以同一判斷重查。完整 44／44 Node tests 與文件標題檢查通過，375px 本機實測四種身分的筆數／金額／清單一致；**待 Bar 真機驗收**。詳見 `07_CHANGELOG.md`。
- 2026-07-26 團體消費權限與資料完整性批（SW v59）— 團體消費改為僅付款人可編輯／刪除，handler 再次守門；缺付款人資料 fail-closed；編輯 replacement 永遠保留原始 `record.member`；混合所有權批次刪除整批拒絕；同批單筆刪除提示其餘筆數。完整 44／44 Node tests、文件標題檢查及 375／390px Browser QA 通過；**待 Bar iPhone Safari／PWA 真機驗收**。
- 2026-07-26 採買清單 A＋F 批（SW v60）— 待買頁與 Today 提醒改依實際行程順序（`dayIndex → 當日 items index`）排列，共用單一排名 helper；孤兒 `stopRef` 由模糊的「已綁定行程」拆成 resolved／pending／orphan 三態，權威性沿用 `CURRENT_SNAPSHOT.source`（`builtin` 因 backlog #11 的舊東京資料一律不可信）；編輯表單以原值作為選中 option 並提供明確清除入口，系統任何路徑都不自動清空 `stopRef`。已買頁完全不動。完整 44／44 Node tests、文件標題檢查及 375／390px Browser QA（溢出 0、console error 0）通過；**待 Bar iPhone Safari／PWA 真機驗收**。B／C／D／E／G 已輸出設計提案待 Bar 裁定，本批未實作。
- 2026-07-26 採買清單 B＋D 批（SW v61）— 單筆勾選改為直接完成＋toast 復原（移除三選一 Modal）；新增 append-only `ledgerLinks[]` 與 `releasedAt`，已記帳／待確認／未記帳三態全部動態推導；多品項 source→record 依 `submissionItems` 一一對應、共用 batchId、回寫採單次原子 write；已買頁支援多選／移回待買／批次刪除／建立消費 preflight（整批阻擋）；部分購買採拆分（原 ID 為已買、剩餘插在正後方、共用 `splitGroupId`）；數量維持自由文字；新增 `completedAt`；個人狀態備份升 v5。完整 45／45 Node tests、文件標題檢查及 375／390px Browser QA（溢出 0、console error 0）通過；**待 Bar iPhone Safari／PWA 真機驗收**。C／E／G 未實作。
- 2026-07-26 採買清單後續修正批（SW v62）— 補回 B 批遺失的單筆記帳入口（已買未記帳項目列，接回既有 `openShoppingLedgerEntry()`）；待買頁多選加入批次刪除並改為兩列工具列；數量改為結構化 `quantity`／`unit`／`legacyQtyText`，舊 `qty` 只在可安全解析時轉換、其餘原文保留不猜測；部分購買改為只輸入本次買到、剩餘由系統計算，買齊直接完成不產生 0 剩餘；備份升 v6。完整 45／45 Node tests、文件標題檢查及 320／375／390px Browser QA（溢出 0、tap 40px、輸入 16px、console error 0）通過；**待 Bar iPhone Safari／PWA 真機驗收**。
- 2026-07-25 結算列顯示層去重（SW v52）— chip 只講狀態、按鈕只講動作、小字只在有額外資訊時出現；4 處同義重複（`送出中…`×2、`同步失敗・重新同步`＋`重新同步`、兩列「同步中」＋「等待同步」）已清除，逾 30 秒的升級提示依 Bar 裁定保留。狀態機 §3 核准 label 未動。完整 43／43 Node tests（reliability 98／98）與文件標題檢查通過；**待 Bar 真機驗收**。

## ⏸ 等 Bar 動作
1. **（優先）部署新版 `apps-script/ledger-sync.gs`**：新版本部署、保持原 Web App URL，並以無痕模式確認 `{WEB_APP_URL}?action=ledger&after=0` 回傳可解析 JSON；步驟見 `apps-script/README.md`「doGet 部署與驗收」。回報後 Claude 才續行真實 GET／CORS／redirect／`after`／`reset`／`serverTime` 與前端 fast pull 整合驗證。
2. 驗收採買清單的 Today 提醒／常駐入口、完整清單 overlay、單筆與多品項記帳閉環，以及 PWA 更新後的本機資料保留。
3. 等待設定頁 2.0 批發包;正式範圍見 `tasks/backlog.md`。
4. 後續批次驗收通過後,由 Bar 核准 PR merge `dev → main`;未核准前不得 merge、push `main` 或部署。

## 下一棒
→ 完成本批團體消費權限的全測與 375／390px Browser QA，推送 `dev` 後由 Bar 驗收付款人／分攤者操作邊界；其後續做採買清單與結算 Hotfix 的 iPhone Safari／PWA 真機驗收，再發出「設定頁 2.0 批」Codex prompt，全部驗收完成再另案處理 `dev → main`。
