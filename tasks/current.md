# CURRENT(現在正在做的)

> 更新於 2026-08-01。細任務層;里程碑看 `06_ROADMAP.md`,歷史交付看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 📌 現況
- **新 P1「採買流程完整化」已完成 v76 本機實作與完整驗證**（2026-08-01）：多選可全選／取消全選目前待買或已買分頁，既有批次操作與 v75 照片附件回歸通過；56／56 Node test files、Playwright 17／17 全綠。下一步只等待 Bar 真機驗收，不得自行動 `main`、部署或建立 production tag。
- 🚀 **SW v73 已於 2026-08-01 正式發布。** 正式站(`https://trippilot-jp.netlify.app/`)由 **SW v18 升級至 SW v73**,merge commit `17c423f8ac59328f926973024cb407d5e638f838`,回滾錨點 tag `production-v73`。發布內容為 v72(六主題／設定頁 2.0／旅途紀錄／備份 v8)與 v73(SW 更新完整性、子資源 fallback、APP_VERSION 安全取值、已鎖帳文案)合併的同一候選版,**只做一次 SW 換代**。G1–G6 全數通過,逐項證據見 `docs/batch2-device-acceptance.md` 的「發布收尾紀錄」。
- **批次一「發布阻斷項」P1–P6 全部交付完成(2026-07-30)**,SW 升至 **v73**。P5 調查判定測試模式／時間模擬／`?previewDate` 三條路徑皆為「可延後,非發布阻斷」,唯一真正的跨裝置污染路徑(模擬期間匯出備份 → 新裝置無回復點)已由 `exportPersonalState()` 的防呆擋下。批次二真機驗收清單見 `docs/batch2-device-acceptance.md`。
- **最新已推送 `dev` runtime 基準:SW v74**,SHA `c51752ba75193a0616f4f80810acd31ef4787d65`;包含設定根頁三群組、測試模式控制頁與警告列 AA 對比修正。`main` 與正式站仍為 v73。
- **v75 採買照片與定位導航已完成本機實作與完整驗證**(2026-08-01):照片只存本裝置 IndexedDB,卡片只顯示迴紋針,備份排除 `photoId`;一般同名地點以目前座標作為導航 origin,詳細分點直接導航,定位失敗退回 `名稱 + 日本`。iPhone 照片檢視器已補正頂部 safe-area 並支援向下滑關閉。56／56 Node test files、Playwright 13／13 通過;不得動 `main`、部署或 production tag。
- SW v72 已在隔離分支 `codex/sw-v72-settings-themes` 完成開發：設定頁 2.0、六組主題、五個功能 SVG、旅途異常／優化建議紀錄、個人備份 v8、`app-version.js` 版本單一來源與 v72–v68 使用者版更新說明。完整 51／51 Node test files、Playwright 3／3、文件／manifest／diff 檢查及 320／375／390px Browser QA 通過；**已 push `dev`（`b372f49`），尚待 Bar 真機／PWA 驗收**。
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

- **批次一 P3 已交付(2026-07-30)**:複驗確認 backlog #3b 的需求早在 SW v72 的備份 v8 就已滿足,故**不升 v9**(無新欄位卻升版只會讓已發出的 v8 備份被 v8 裝置拒絕,憑空製造相容斷點)。真正的缺口是還原測試只覆蓋 v1／v2／v4／v8,且既有測試用簡化假 store 跑不到遷移邏輯 —— 已補上注入真實實作的 v1–v8 矩陣測試,並把相容策略寫成 `docs/personal-state-compatibility.md` 契約。**逐版本實測無安全還原斷點,無需犧牲任何版本。**

- **Release back-merge 已完成(2026-08-01)**:`origin/main`(`17c423f`)以 `--no-ff` 回灌 `dev`,merge commit **`a930858`**,零內容差異。`git merge-base --is-ancestor origin/main origin/dev` 退出碼 0,`dev` 不再落後 `main`;遠端 `qa-sanity` success。

- **v74 設定根頁改版已推送 `dev`**(2026-08-01),最終 SHA `c51752b`;警告列對比阻斷修正已包含在內。`main`、production tags 未動。v74 delta 驗收清單見 `docs/batch2-device-acceptance.md`。

## 🚦 Release Gate(發布前必過,與 backlog 分離)

> 2026-07-30 依 Bar 裁定第 4 項設立。本節列的是**發布條件**,不是待開發項目 — 已完成的功能不因真機驗收未做而繼續留在 `tasks/backlog.md`。已歸檔項目見 `tasks/done.md`「已歸檔的 backlog 編號項目」。

| # | Gate | 狀態 | 負責 |
|---|---|---|---|
| G1 | **SW v73** Bar 真機／PWA 驗收 | ✅ **完成(2026-08-01)** — P0／P1／A／B／C／D／E／F／G／H／I 全數於 iPhone 通過,清單見 `docs/batch2-device-acceptance.md` | Bar |
| G2 | 批次一「發布阻斷項」全數交付且 `tests/` 全綠 + Playwright 全綠 + `check-doc-titles.js` + `check-app-version.js` 通過 | ✅ 完成(P1–P6 全數交付) | AI |
| G3 | `main` 現況(`9eefcb0`,SW okayama-trip-v18)建立 annotated 回滾 tag 並 push `origin` | ✅ 完成(`production-v18` → `2f1987b`,peeled `9eefcb0`) | AI |
| R1 | 遠端 CI 證據(G4 前置) | ✅ **完成** — 真正用於合併的最終 head `9ec2c21`,run `30682429659`,`sanity` + `browser-qa` 皆 success,PR MERGEABLE／CLEAN,未解決 review thread 0 | AI |
| G4 | Bar 核准 PR merge `dev → main` | ✅ **完成(2026-08-01)** — PR #11 以 merge commit 合併,head 鎖定 `9ec2c21`,merge commit `17c423f` | Bar |
| G5 | Netlify 正式站部署後線上驗證 | ✅ **完成(2026-08-01)** — deploy `6a6d6be3`,`commit_ref = 17c423f`,線上 `sw.js`／`app-version.js` 皆 v73、header 正確;Bar iPhone smoke test 通過 | Bar |
| G6 | 建立 annotated tag `production-v73` | ✅ **完成(2026-08-01)** — tag 物件 `64e8d0b`,peeled `17c423f8...`,已推送 `origin`;**未建立 `production-v72`** | AI |

> G1 與 G4／G5 為 Bar 專屬職責;AI 不得以 G2 全綠為由推進 G4。未核准前不得 merge、push `main` 或部署。
> **測試站驗收前置**:`dev-trippilot-jp.netlify.app` 自動部署已於 2026-07-26 關閉,2026-07-30 實測線上仍停在 **SW v62**、`app-version.js` 回 404。用它驗收 v73 前必須先手動部署到目標 commit,並依 `16_OPS_PLAYBOOK.md` §F5 核對線上 `sw.js`／`app-version.js` 版本與 CacheStorage 實際內容,**不得只看 Git 分支**。

## ▶️ 下一階段
1. **真機／PWA 驗收已關閉**：Bar 於 2026-07-29 確認 SW v58–v68 累積功能、採買 C＋E＋G、GitHub Pages iOS Safari／PWA 安裝、standalone、離線重開、SW 更新節奏與本機資料保留皆完成驗收。
2. **Playwright 三情境 QA 與 SW v72 開發已完成**：斷網內建、連網同步與旅行日 mock Date 已寫入 `tests/browser/` 並掛入 `.github/workflows/qa.yml`；SW v72 設定／主題／備份／旅途紀錄已整合並 push `dev`，下一步由 Bar 真機／PWA 驗收。
3. **結算一致性批與真機回饋修正已完成至 SW v71 並通過 Bar 真機驗收**：SW v69 已實作還款確認後永久禁止直接刪改、append-only 收據級更正／作廢、commit-last、跨裝置 canonical conflict、二次預覽與不可改寫歷史；獨立審查發現的 stale 一般編輯表單、stale 預覽與異常事件 fail-closed 路徑亦已加固。SW v70 再將分攤成員選取背景改為 `#d6e8e4`，不改資料、權限或作廢流程，已推送 `dev`（`073ddfc`）。SW v71 移除作廢預覽後功能相同的「重新預覽作廢」，只保留「確認整張作廢」，不改 append-only 語意；已推送 `dev`（`8949449`），Bar 於 2026-07-30 完成 v69–v71 真機／PWA 驗收，尚未合併 `main` 或正式部署。
4. 正式發布仍須由 Bar 另行核准 PR merge `dev → main`；未核准前不得 merge、push `main` 或部署。

> 已解除：Apps Script `doGet` 部署已由 Bar 完成，真實端點驗證（CORS、redirect、`after`／`reset`／`serverTime`、非 JSON 降級）通過，見上方 SW v47 條目。

## 下一棒
→ **v75 採買照片與定位導航已完成自動驗證並依 Bar 指令交付 `dev`。** 下一棒是 Bar 真機驗收 `docs/batch2-device-acceptance.md` 的 v75 delta；正式發布仍須另行核准 `dev → main`。
> **不得**自行動 `main`、部署正式站或建立 `production-v75` tag。

> 採買清單 A／B／D／F 已於 SW v60／v61 交付；C／E／G 已於 SW v68 實作，並於 2026-07-29 完成 Bar 真機驗收；正式契約見設計文件。
