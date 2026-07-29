# CURRENT(現在正在做的)

> 更新於 2026-07-29。細任務層;里程碑看 `06_ROADMAP.md`,歷史交付看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 📌 現況
- 最新已推送 `dev` App runtime 基準：`0c5fe45`，Service Worker `okayama-trip-v68`。本機目前另有結算一致性 SW v69 實作，尚未 push、合併 `main` 或正式部署；Bar 已於 2026-07-29 完成的是截至 v68 的累積真機／PWA 驗收，不包含 v69。
- 2026-07-23 治理決策追認、§4 禁改清單硬停規則與任務板歸位 — 已完成,詳見 `07_CHANGELOG.md`。
- v34–v44 三秒記帳與首頁／結算卡系列 — 已完成並經 Bar 真機驗收,詳見 `07_CHANGELOG.md`。
- 採買清單批（SW v45）— 已完成開發；目標測試、完整 41／41 Node tests、文件標題檢查及 375px／390px Browser QA 通過，並已納入 2026-07-29 Bar iPhone Safari／PWA 累積真機驗收；詳見 `07_CHANGELOG.md`。
- 2026-07-25 結算狀態、近即時同步與介面簡化 Hotfix（SW v47）— Bar 已部署 Apps Script `doGet`，真實端點驗證（CORS、redirect、`after`/`reset`/`serverTime`、非 JSON 降級）通過；已合入 `dev` 並推送（`f9d8a91`），詳見 `07_CHANGELOG.md`。
- 2026-07-25 真機驗收發現「結算完仍卡台幣 680」— 已以 SW v48 修正為結算狀態只依 ADR 0007 單一結算幣別判斷，參考幣別殘值不再重新打開狀態卡；同批為結清紀錄／計算明細兩張次層 sheet 補上「‹ 返回」。完整 `tests/*.test.js` 與文件標題檢查通過，詳見 `07_CHANGELOG.md`。
- 2026-07-25 續報「摘要台幣參考對照顯示 NT$0」— 已以 SW v49 修正為另一幣顯示 `convertLedgerAmounts()` 換算參考值（`¥3,160 ≈ NT$632`），已結清不顯示金額；僅改顯示層。完整 43／43 Node tests（reliability 94／94）與文件標題檢查通過。
- 2026-07-25 續報「計算明細仍卡台幣」與「退回列擁擠錯位」— 已以 SW v50 修正：參考幣別一律由結算幣別換算（`settlementReferenceAmount`／`settlementReferenceTransfers`），次層計算明細不再讀另一幣獨立累計餘額；退回列改固定兩列（對象/金額 ｜ 狀態、原因 ｜ 動作），375px 實測無重疊無溢出。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過。
- 2026-07-25 退回列窄螢幕再收緊（SW v51）— 移除冗餘的「退回原因:」前綴（保留 `aria-label`），320／375／390／430px 四寬度實測零重疊、按鈕右緣一致。完整 43／43 Node tests（reliability 96／96）與文件標題檢查通過；**Bar 已於 2026-07-29 完成真機驗收**。
- 2026-07-25 團體帳本只顯示與目前成員相關的紀錄（SW v58）— `ledgerTrackRecords()` 這個唯一共用節流點加上「付款人 or 分攤成員」過濾（方案 A 全面一致，不加切換 UI）；舊資料 `participants` 無效時限定式 fail-open、成員無法解析時完全不過濾；主卡片文案改 `與我相關 · N 筆紀錄`；編輯／刪除三處以同一判斷重查。完整 44／44 Node tests 與文件標題檢查通過，375px 本機實測四種身分的筆數／金額／清單一致；**Bar 已於 2026-07-29 完成真機驗收**。詳見 `07_CHANGELOG.md`。
- 2026-07-26 團體消費權限與資料完整性批（SW v59）— 團體消費改為僅付款人可編輯／刪除，handler 再次守門；缺付款人資料 fail-closed；編輯 replacement 永遠保留原始 `record.member`；混合所有權批次刪除整批拒絕；同批單筆刪除提示其餘筆數。完整 44／44 Node tests、文件標題檢查及 375／390px Browser QA 通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。
- 2026-07-26 採買清單 A＋F 批（SW v60）— 待買頁與 Today 提醒改依實際行程順序（`dayIndex → 當日 items index`）排列，共用單一排名 helper；孤兒 `stopRef` 由模糊的「已綁定行程」拆成 resolved／pending／orphan 三態，權威性沿用 `CURRENT_SNAPSHOT.source`（`builtin` 因 backlog #11 的舊東京資料一律不可信）；編輯表單以原值作為選中 option 並提供明確清除入口，系統任何路徑都不自動清空 `stopRef`。已買頁完全不動。完整 44／44 Node tests、文件標題檢查及 375／390px Browser QA（溢出 0、console error 0）通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。B／C／D／E／G 已另批完成。
- 2026-07-26 採買清單 B＋D 批（SW v61）— 單筆勾選改為直接完成＋toast 復原（移除三選一 Modal）；新增 append-only `ledgerLinks[]` 與 `releasedAt`，已記帳／待確認／未記帳三態全部動態推導；多品項 source→record 依 `submissionItems` 一一對應、共用 batchId、回寫採單次原子 write；已買頁支援多選／移回待買／批次刪除／建立消費 preflight（整批阻擋）；部分購買採拆分（原 ID 為已買、剩餘插在正後方、共用 `splitGroupId`）；數量維持自由文字；新增 `completedAt`；個人狀態備份升 v5。完整 45／45 Node tests、文件標題檢查及 375／390px Browser QA（溢出 0、console error 0）通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。C／E／G 已於 SW v68 完成。
- 2026-07-26 採買清單後續修正批（SW v62）— 補回 B 批遺失的單筆記帳入口（已買未記帳項目列，接回既有 `openShoppingLedgerEntry()`）；待買頁多選加入批次刪除並改為兩列工具列；數量改為結構化 `quantity`／`unit`／`legacyQtyText`，舊 `qty` 只在可安全解析時轉換、其餘原文保留不猜測；部分購買改為只輸入本次買到、剩餘由系統計算，買齊直接完成不產生 0 剩餘；備份升 v6。完整 45／45 Node tests、文件標題檢查及 320／375／390px Browser QA（溢出 0、tap 40px、輸入 16px、console error 0）通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。
- 2026-07-26 採買清單真機回饋批（SW v63）— 單位改下拉並與數量並排、新增單位移到設定頁（沿用泛用選項 store，單位上限 10→6 與設定頁對齊）、自訂單位不被靜默改掉；已買卡片改為「品名／屬性／地點」三層，動作收進 `⋯`（只有「記帳」留在列上）。完整 45／45 Node tests、文件標題檢查及 320／375／390px Browser QA（溢出 0、tap 40px、輸入 16px、console error 0）通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。
- 2026-07-27 採買清單代購分配、逐人記帳與卡片明細（SW v64）— 資料模型改為 `allocations[]` 逐人分配（穩定 `allocationId`、`target`、`quantity` 與 append-only `ledgerLinks[]`）；代購對象改多選並支援「儲存並新增」；卡片資訊重新分層、已買狀態改由 allocation 聚合（`未記帳`／`記帳 2／3`／`已記帳`／`狀態待確認`）；部分購買與 Buy-to-Ledger 都改為逐人粒度；新增採買明細 panel；編輯與刪除保護下放到 allocation 粒度；分類選項移除「代購」；個人狀態備份升 v7（v1～v6 仍可還原）。完整 45／45 Node tests、文件標題檢查及 320／375／390px Browser QA 通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。
- 2026-07-27 採買卡片視覺一致性、部分購買與多選互動（SW v65）— 修正繁中字型 fallback 造成的同卡片字重不一致（改 `"PingFang TC","Noto Sans TC","Microsoft JhengHei"` 優先）；badge 改語意分工（只有姓名套 coral、分類改淡金）；「部分購買」入口自 `⋯` 移回待買卡片並收斂出現條件；採買明細縮短高度；批次 selection 與完成 checkbox 完全分離，修正 `.shopping-selection-toolbar-stacked` 被後方 base selector 蓋掉而在真機擠成直排的 CSS 順序問題，並補 66px safe-area spacer。完整 45／45 Node tests、文件標題檢查及 320／375／390px Browser QA 通過；**Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收**。
- 2026-07-28 新增消費表單、採買預設單位與全站思源黑體優化（SW v66）— 新增消費主流程改為金額 → 明細 → 代購／對象 → `其他資訊（選填）` → 儲存，類別／支付方式／日期收進可展開摘要；明細 Enter 改為 Next。採買新項目與「儲存並新增」預設 `1 個`，單位選單不再提供空白／「不指定」，`個` 在設定頁不可刪除，舊空單位只於草稿預選且不自動回寫。全站改以 Google Fonts `Noto Sans TC` 400／500／700 為第一順位並保留繁中系統 fallback。完整 46／46 Node tests、文件標題檢查、320／375／390／430px Browser QA 與停止本機伺服器後的 v66 離線重載通過；**已 commit 並推送 `dev`（`aedebd0`），Bar 已於 2026-07-29 完成真機驗收，尚未正式部署**。
- 2026-07-28 新增消費展開縫隙、採買待買卡片精簡與安全回併（SW v67）— 新增消費以 `flow-root` 修正 first-child margin collapse；待買卡片改由站點群組表達位置，不再輸出重複地點 DOM，已買卡與所有明細仍保留站點。checkbox、批次移回與完成 Toast 復原統一走 Store 原子 `moveBackToPending(ids)`；只有原 ID、欄位、正整數 allocation、空 ledger 歷史與 canonical 對象等完整安全條件成立時才合併，否則移回仍成功但保留 sibling。完整 47／47 Node tests（123／123 reliability checks）與文件檢查通過；320／375／390px Browser QA 實測單人／多人／批次安全回併、未合併保護、卡片／明細位置規則、水平溢位與 console error／warning 皆通過。**已 commit 並推送 `dev`（`a7f087d`），Bar 已於 2026-07-29 完成真機驗收，尚未正式部署**。
- 2026-07-29 採買清單 C＋E＋G 第三批（SW v68）— Ledger 個人／團體切軌保留逐項代購、分攤、row key 與採買 source IDs，只序列化目前帳本軌；四類待買群組與 Today 套用 exact `必買` 穩定置頂，已買頁與 store order 不變；新增／編輯改為獨立 Sheet，保存 scroll／detail context，依 item ID 返回，具 save guard、錯誤留場與同步連續新增焦點。Browser QA 於 320×700、375×812、390×844 驗證 Sheet／清單／卡片水平溢位 0、深層取消 scroll delta 0、移動後卡片聚焦、明細返回、連續新增與帳本切軌，console error／warning 0；**已 commit 並推送 `dev`（`0c5fe45`），Bar 已於 2026-07-29 完成 iPhone Safari／PWA 真機驗收，尚未正式部署**。
- 2026-07-25 結算列顯示層去重（SW v52）— chip 只講狀態、按鈕只講動作、小字只在有額外資訊時出現；4 處同義重複（`送出中…`×2、`同步失敗・重新同步`＋`重新同步`、兩列「同步中」＋「等待同步」）已清除，逾 30 秒的升級提示依 Bar 裁定保留。狀態機 §3 核准 label 未動。完整 43／43 Node tests（reliability 98／98）與文件標題檢查通過；**Bar 已於 2026-07-29 完成真機驗收**。

## ▶️ 下一階段
1. **真機／PWA 驗收已關閉**：Bar 於 2026-07-29 確認 SW v58–v68 累積功能、採買 C＋E＋G、GitHub Pages iOS Safari／PWA 安裝、standalone、離線重開、SW 更新節奏與本機資料保留皆完成驗收。
2. 依優先序開始 `tasks/backlog.md` #1 Playwright 三情境 QA，再逐批處理品質批、設定頁 2.0 與其餘已核准待辦。
3. **結算一致性批開發完成，待 Bar 真機驗收**：SW v69 已實作還款確認後永久禁止直接刪改、append-only 收據級更正／作廢、commit-last、跨裝置 canonical conflict、二次預覽與不可改寫歷史；獨立審查發現的 stale 一般編輯表單、stale 預覽與異常事件 fail-closed 路徑亦已加固。完整 49／49 Node tests、文件標題檢查及 320／375／390px Browser QA 通過；純 App 頁面 console error／warning 0。尚未 push、合併 `main` 或正式部署。
4. 正式發布仍須由 Bar 另行核准 PR merge `dev → main`；未核准前不得 merge、push `main` 或部署。

> 已解除：Apps Script `doGet` 部署已由 Bar 完成，真實端點驗證（CORS、redirect、`after`／`reset`／`serverTime`、非 JSON 降級）通過，見上方 SW v47 條目。

## 下一棒
→ 截至 SW v68 的真機／PWA 驗收已完成；SW v69 結算一致性批待 Bar 真機驗收。下一棒仍是 Playwright 三情境 QA，再依序進行品質批與設定頁 2.0；`dev → main` 合併／正式發布另待 Bar 核准。

> 採買清單 A／B／D／F 已於 SW v60／v61 交付；C／E／G 已於 SW v68 實作，並於 2026-07-29 完成 Bar 真機驗收；正式契約見設計文件。
