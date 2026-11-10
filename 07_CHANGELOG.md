# 07 版本紀錄

## 2026-11-10 — v183 已上線 main，tag `production-v183`（待 Bar 手機審查）

- Bar 看過畫面、頂端狀態選字「離線版」後回「okay」。
- PR [#147](https://github.com/nick80912-dev/ai-native-projects/pull/147) 在 head `88cd323` 的 sanity／browser-qa 全綠後合併進 `dev`（`d1b2ce8`）。本機完整 Chromium 第一次有 7 項收據照片測試失敗（那份測試還在直接點已收起的「個人」），補上先點開那一行後 7/7 通過。
- PR [#148](https://github.com/nick80912-dev/ai-native-projects/pull/148)（並帶 v182 發布紀錄 PR #146）合併 `dev` → `main`，merge commit **`f036ab8`**。過程中 GitHub Pages 鏡像（github.io，非正式站）的 `deploy` 卡在 GitHub 端 `syncing_files` 逾時，與程式無關；在 PR 留言說明並重跑一次後通過，七項檢查全綠。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v183'`；全新 Chromium 開正式站 `APP_VERSION` v183、只剩 `okayama-trip-v183` 快取、發布說明「旅程結束回顧與記帳表單更簡潔」；曼谷座標通過天氣地區檢查、下載失敗時頂端為「離線版」、回顧與帳本幣別一行的程式都在線上；沒有 pageerror。前兩代 `shell/v182/`、`shell/v181/` 回 200。
- **tag**：production-tags workflow 建立 `production-v183` → `f036ab8`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `4ed9627`（`production-v182`）的部署，再往前 bump。

## 2026-11-10 — v183 天氣地區不限日本；離線狀態、旅程結束回顧、記帳表單更簡潔（已上線 main，見上）

- **來源**：Bar 2026-11-09 問「現在這個專案適合在其它國家或行程使用了嗎」與 UI/UX 改進建議；查到天氣地區只收日本附近座標，提出 7 項 UI/UX 建議。Bar 選「先修天氣地區，再做第1、2、3項」；看過畫面後頂端狀態嫌「暫時連不上」字多，2026-11-10 選「離線版 · 時間」，其他「okay」。
- **使用上**：
  - **天氣地區**：「天氣地區」分頁的座標改成全球合法範圍（緯度 -90～90、經度 -180～180），泰國、歐美的地區也會顯示天氣。沒填座標的列照樣略過（放寬範圍時曾把空白當成 0,0，已修正並由測試守住）。
  - **頂端狀態**：下載不到最新資料（沒網路）時，紅點「更新失敗」改成黃點「離線版 · 10/1 22:39」，與用離線資料開啟時同一個說法；狀態面板寫「離線版：沒能下載最新資料，沿用手機裡的資料」。資料結構、驗證、儲存真的出錯仍是「更新失敗」。
  - **旅程結束首頁**：改成回顧——「我的總花費」（點開明細）與「退稅：待退 N 張 · 金額」（點開退稅清單；沒有可退稅的單據就不顯示）；還沒結清的提醒與「前往分帳」照舊。「清除並打包旅程」移到卡片最下方的文字按鈕，不再和「查看完整行程」並排。
  - **記帳表單**：新增消費時「帳本」「幣別」收成一行「個人帳本 · JPY ⌄」，點開才出現原本兩排；換帳本時保持展開。沒設定匯率時提醒照樣直接顯示；編輯與更正維持原樣。
- **做法**：`weatherRegionValid()` 範圍、`parseWeatherRegionsCsv()` 空白座標為 NaN；`syncFailureIsDownload()`＋`setSyncState()` 的 `unreachable` 狀態；`endedTripRecapRows()`＋`renderEndedTripHome()`；`renderLedgerEntryContextLine()`／`toggleLedgerEntryContext()`／`renderLedgerEntrySegments()`，`setLedgerDraftTrack()` 保留 `contextOpen`。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v182→v183；`builtin-snapshot.js` 以 v182 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v183` + `['v182','v181','v180','v179']`（v178 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v182 三件組的 hash。
- **測試**：
  - 新增 `tests/browser/ux-v183.spec.js`（4 項）：回顧的總花費與退稅、點退稅打開清單、打包按鈕在最下方；沒有紀錄時只顯示總花費；帳本與幣別一行、點開切換、金額緊接在下；沒匯率時直接提醒、編輯維持原樣。
  - `tests/weather-regions.test.js` 加入夏威夷、曼谷、巴黎與不合法座標；`tests/atomic-sheet-sync.test.js` 下載失敗時頂端為「離線版 · 」；`tests/home-simplification.test.js`、`tests/browser/home-v146.spec.js` 改成新首頁版面。
  - 十個會點「個人／團體」或幣別的瀏覽器測試先點開那一行。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v182`（`4ed9627`）的部署，再往前 bump。

## 2026-11-09 — v182 與專案整理已上線 main，tag `production-v182`（待 Bar 手機審查）

- Bar 看過三處匯率截圖後回「好」。
- PR [#143](https://github.com/nick80912-dev/ai-native-projects/pull/143)（v182）在 head `4ed726f` 的 sanity／browser-qa 全綠後合併進 `dev`（`16e8d07`）。
- PR [#144](https://github.com/nick80912-dev/ai-native-projects/pull/144)（專案整理，Bar 2026-11-09「重新整理我的專案內容與雜項整理」選四項）：
  - 只留最近三代 shell（刪 v154–v179）。
  - backlog 只留還沒做的（#55 依 Bar 關閉）。
  - 2026-10-15 以前的版本紀錄原文搬到 `docs/archive/`。
  - 28 份只剩歷史引用的設計稿搬到 `docs/archive/design/`。
  - 專案定位、路線圖、README 與備份說明更新。
  - 第一次 sanity 失敗：整理時誤把本機 `node_modules` 捷徑（symlink）一起 commit，CI 找不到真正的資料夾。`11d9389` 移除並把 `.gitignore` 改成 `node_modules`（連捷徑一起忽略），重跑全綠後合併（`2b2bf14`）。
- PR [#145](https://github.com/nick80912-dev/ai-native-projects/pull/145) 合併 `dev` → `main`，merge commit **`4ed9627`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v182'`。
  - 全新 Chromium 開正式站，`APP_VERSION` 為 v182、只剩 `okayama-trip-v182` 快取，發布說明為「匯率寫法統一」。
  - 五個刪除的函式已不在線上；沒有 pageerror。
  - 前一代 `shell/v181/` 與 `shell/v180/` 回 200，已刪除的 `shell/v179/`、`shell/v154/` 回 404（符合 ADR 0019 增補）。
- **tag**：production-tags workflow 建立 `production-v182` → `4ed9627`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `96111fd`（`production-v181`）的部署，再往前 bump。

## 2026-11-09 — v182 匯率寫法統一；清掉沒用到的程式（#57 重新稽核；已上線 main，見上）

- **來源**：Bar 2026-11-09「接著做 #57 低優先項目」。#57 的低優先項目只留下編號（B4–B7、T11、T13、T15、T18–T21、L9–L28），出發前稽核報告的內容沒有存進專案；Bar 選「重新稽核再挑」。用 v181 重新走過旅程中與旅程結束後的各頁、按鈕大小、字級與程式，列出五項，Bar 選了其中兩項：
  - **1 匯率寫法統一**：分帳卡片寫「JPY 1 ≈ TWD 0.21」、記帳表單與設定寫「1 JPY = NT$0.21」，統一成「1 JPY ≈ NT$0.21」。
  - **4 清掉沒用的程式**：`navQuery`、`multiItemTaxMultiplier`、`selectRecentLedgerExpenses`、`emptyDayProgress`、`hasDayProgress` 五個函式全專案沒有呼叫者，刪除。
  - 沒選的：小字放大到 11px（#29）、小按鈕放大到 44px（#28、#41）。Bar 同日裁定「這些我認為都不是問題，不列入優化討論」，三項在 backlog 關閉，之後稽核不再列出。
- **版本**：
  - forward bump v181→v182；`builtin-snapshot.js` 以 v181 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v182` + `['v181','v180','v179','v178']`（v177 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v181 三件組的 hash。
- **測試**：`tests/browser/multi-currency-v168.spec.js` 改成新寫法，並加上分帳卡片的匯率字樣。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v181`（`96111fd`）的部署，再往前 bump。

## 2026-11-09 — v181 已上線 main，tag `production-v181`（待 Bar 手機審查）

- Bar 看過兩輪畫面（可退稅移到計算機旁 → 稅額移到明細同一列靠右）後回「okay」。
- PR [#141](https://github.com/nick80912-dev/ai-native-projects/pull/141) 在 head `f5e5162` 的 sanity／browser-qa 全綠後合併進 `dev`（`c4745ca`）。
- PR [#142](https://github.com/nick80912-dev/ai-native-projects/pull/142)（並帶 v180 發布紀錄 PR #140）合併 `dev` → `main`，merge commit **`96111fd`**；七項檢查全綠。
- 本機完整 Chromium 445 passed，只有已知只在本機失敗的 `personal-ledger-export`。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v181'`。全新 Chromium 開正式站，`APP_VERSION` 為 v181、只剩 `okayama-trip-v181` 快取，發布說明為「可退稅移到計算機旁」；可退稅在計算機旁、稅額在明細標題列的程式都在線上；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v181` → `96111fd`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `dc9f7ae`（`production-v180`）的部署，再往前 bump。

## 2026-11-09 — v181 可退稅移到計算機旁，稅額放在明細同一列（已上線 main，見上）

- **來源**：Bar 2026-11-09：「介面部分將可退稅按鈕移至計算機旁」；看過畫面後「稅額欄位縮排至明細那欄靠右對齊，避免表單再變長」。同一天回報岡山 Apps Script 已換成最新版（v176–v177 的收據免稅、稅率與稅額辨識生效）。
- **使用上**：
  - 單品項的「可退稅」放在金額標題列、計算機左邊；勾了一樣跳出 v180 的稅額視窗。
  - 填好後「稅額 ¥X ✎」放在「明細」標題同一列靠右，點一下再改；表單不多一列。
  - 多品項不變（每一項自己的「可退稅」、品項下方的稅額）。
- **做法**：`renderLedgerSingleRefundToggle()` 放進 `renderLedgerSingleItemPrimary()` 的 `.ledger-amount-head-actions`（計算機左邊）；`renderLedgerSingleItemDetail()` 有稅額時改成 `.ledger-detail-head`（明細標題＋稅額）；`renderLedgerSingleRefundRow()` 只回傳稅額按鈕。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v180→v181；`builtin-snapshot.js` 以 v180 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v181` + `['v180','v179','v178','v177']`（v176 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v180 三件組的 hash。
- **測試**：`tests/browser/refund-quick-v180.spec.js` 第一項加上：可退稅緊鄰計算機、稅額在明細標題列且與明細輸入框右緣對齊、在輸入框上方、沒有橫向捲動。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v180`（`dc9f7ae`）的部署，再往前 bump。

## 2026-11-03 — v180 已上線 main，tag `production-v180`（待 Bar 手機審查）

- Bar 看過兩輪畫面（先是稅額欄並排，再改成跳出視窗、拿掉說明）後回「好」；畫面確認後才跑完整測試與自動檢查。
- PR [#138](https://github.com/nick80912-dev/ai-native-projects/pull/138) 在 head `f88971c` 的 sanity／browser-qa 全綠後合併進 `dev`（`b11c42f`）。
- PR [#139](https://github.com/nick80912-dev/ai-native-projects/pull/139)（並帶 v179 發布紀錄 PR #137）合併 `dev` → `main`，merge commit **`dc9f7ae`**；七項檢查全綠。
- 本機完整 Chromium 444 passed，只有已知只在本機失敗的兩項。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v180'`。全新 Chromium 開正式站，`APP_VERSION` 為 v180、只剩 `okayama-trip-v180` 快取，發布說明為「可退稅移到金額下方」。稅額視窗的程式在線上、金額下方有可退稅、視窗沒有收據說明；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v180` → `dc9f7ae`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `6f8658a`（`production-v179`）的部署，再往前 bump。

## 2026-11-03 — v180 可退稅移到金額下方，勾了跳出稅額視窗（已上線 main，見上）

- **來源**：Bar 2026-11-03：
  - 「可退稅按鈕改置上方，避免一些手key的單據漏掉可退稅與輸入稅額」。
  - 看過畫面後：「勾選後改成跳出輸入稅額的視窗供輸入」、「看收據上的⋯⋯那行說明可以拿掉」。
- **使用上**：
  - 單品項：「可退稅」在金額正下方，不用打開「其他資訊」。勾了跳出「可退稅：輸入稅額」視窗，提示是照稅率算的稅額，空白按確定就照稅率估算；按取消就不勾，點視窗外只關視窗。
  - 填好後「可退稅」旁邊顯示「稅額 ¥X ✎」（空白時「稅額 約 ¥X」，跟著金額變），點一下再改。「其他資訊 → 稅」不再重複稅額欄與可退稅。
  - 多品項：勾第一項「可退稅」時跳出同一個視窗，填整張收據的稅額；之後再勾別的品項不再跳出。品項清單下方顯示「可退稅 稅額 ¥X ✎」，「稅（選填）」裡不再重複稅額欄。
  - 沒有開啟可退稅的旅程（Tax Free = no）不顯示。
- **做法**：`renderLedgerSingleRefundRow()`（放進 `renderLedgerSingleItemPrimary()`）、`renderLedgerMultiRefundTax()`、`renderLedgerTaxSummaryButton()`／`ledgerTaxSummaryText()`、`openLedgerTaxDialog()`／`confirmLedgerTaxDialog()`／`cancelLedgerTaxDialog()`／`closeLedgerTaxDialog()`；稅額欄抽成 `renderLedgerTaxAmountField()`，`ledgerTaxAmountOnTop()` 決定放上面還是留在稅區塊。視窗沿用退稅小視窗的樣式與層級（150）。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v179→v180；`builtin-snapshot.js` 以 v179 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v180` + `['v179','v178','v177','v176']`（v175 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v179 三件組的 hash。
- **測試**：新增 `tests/browser/refund-quick-v180.spec.js`（4 項）：單品項位置、視窗、確定與再改、存檔；取消與點外面、照稅率估算跟著金額、格式錯誤、關表單一起關；多品項只問一次、取消那一項、存檔稅額；沒有可退稅的旅程不顯示。`tests/ledger-calculator.test.js` 一項斷言改成對 `renderLedgerTaxAmountField`。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v179`（`6f8658a`）的部署，再往前 bump。

## 2026-11-03 — v179 已上線 main，tag `production-v179`（待 Bar 手機審查）

- Bar 看過三輪畫面後回「好」。這次照 Bar 2026-11-03 的做法：畫面確認後才跑完整測試與自動檢查。
- PR [#135](https://github.com/nick80912-dev/ai-native-projects/pull/135) 在 head `b603c00` 的 sanity／browser-qa 全綠後合併進 `dev`（`9d6ec5a`）。過程中 `05898ed` 的 sanity 曾因小視窗層級蓋過短通知而失敗，`daf667a` 修好。
- PR [#136](https://github.com/nick80912-dev/ai-native-projects/pull/136)（並帶 v178 發布紀錄 PR #134）合併 `dev` → `main`，merge commit **`6f8658a`**；合併 tree `c4d9865` 與 `9d6ec5a` 相同。
- 本機完整 Chromium 440 passed，只有已知只在本機失敗的兩項。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v179'`。全新 Chromium 開正式站，`APP_VERSION` 為 v179、只剩 `okayama-trip-v179` 快取，發布說明為「退稅清單改成點一下就好」。分頁與「不退」的程式在線上，v178 的記錄退稅畫面已移除；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v179` → `6f8658a`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `e894f12`（`production-v178`）的部署，再往前 bump。

## 2026-11-03 — v179 退稅清單改成點一下就好（已上線 main，見上）

- **來源**：Bar 2026-11-03：
  - 「不需做到那麼複雜與精細，我只需要知道該張單據稅額多少，然後整理出一個退稅清單，我到時候要退稅時再確認並勾選退稅單據」；追問後選「扣掉稅額並可以有欄位讓我填寫我實際退了多少」，離境提醒與分帳卡片的「退稅」列保留。
  - 看過畫面再調整：「實際退了的欄位移至稅額下方並排」→ 覺得擁擠、已退越來越長、勾勾一直留著，改選「分頁：待退／已退」→ 不退的單據要有地方放，選「多一個『不退』分頁」→「不需要勾選框，我只都需要點選後再決定是否要退稅與退多少」。
  - 同時裁定：畫面位置與功能確認完才跑自動檢查與完整測試。
- **使用上**：
  - 分帳 → 退稅分成「待退／已退／不退」三個分頁，分頁上寫張數；上方是該分頁的金額（還沒退的稅額、已經退回的金額）。
  - 每張收據一列：店名、品項、稅額、›。點一張跳出小視窗：
    - 待退：「實際退了」先帶入稅額，可以改，按「已退」移到已退並從「我的總花費」扣掉；按「不退」移到不退。
    - 已退：改金額後「儲存」，或「改回待退」。
    - 不退：「移回待退」。
  - 不退的單據不算待退金額與離境提醒，花費不變。本身免稅（結帳時已扣稅）或稅額 0 的單據不會出現在清單。記帳時的「可退稅」照舊決定要不要列進清單。
  - 不再跳出「記錄退稅」畫面，也不用填退到哪裡與日期。
- **做法**：
  - `renderLedgerRefundPendingRow()`／`renderLedgerRefundDoneRow()`／`renderLedgerRefundSkippedRow()`、`setLedgerRefundTab()`、`openLedgerRefundEdit()`（依狀態給不同按鈕）、`saveLedgerRefundEdit()`、`skipLedgerRefund()`、`revertLedgerRefund()`、`refreshLedgerRefundPanel()`（就地重畫）。
  - 移除 v178 的 `openLedgerRefundRecord()`、`saveLedgerRefund()`、`clearLedgerRefund()`、`setLedgerRefundMethod()` 與退款方式選項。
  - 「不退」記成 `refundMethod='不退'`、`refundAmount` 仍是 `null`（v178 的 App 讀到會當待退，資料不會丟）。
  - 小視窗層級 150：在清單（135）之上、短通知（200）之下，不擋「已移到已退」的通知。
  - 資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v178→v179；`builtin-snapshot.js` 以 v178 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v179` + `['v178','v177','v176','v175']`（v174 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v178 三件組的 hash。
- **測試**：`tests/browser/refund-tracking-v178.spec.js` 改寫兩項並新增一項（10 項）：
  - 三個分頁與張數、清單沒有勾選框和輸入框；
  - 點一張改實際退了多少、照稅額比例分到品項、總花費扣掉、已退再改金額與改回待退；
  - 不退與移回待退，不退不算離境提醒；
  - 金額不是數字時不存。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v178`（`e894f12`）的部署，再往前 bump。

## 2026-11-01 — v178 已上線 main，tag `production-v178`（待 Bar 手機審查）

- PR [#132](https://github.com/nick80912-dev/ai-native-projects/pull/132) 在 head `7e8e32d` 的 sanity／browser-qa 全綠後合併進 `dev`（`893e1fb`）。第一次 push `04ceb0e` 的 browser-qa 有 4 項舊斷言（優惠券欄、「免稅品」、舊標題）沒改到而失敗，`7e8e32d` 改好後全綠。
- PR [#133](https://github.com/nick80912-dev/ai-native-projects/pull/133)（並帶 PR #131 的 tag 紀錄與清理）合併 `dev` → `main`，merge commit **`e894f12`**；合併 tree `eb4c0c2` 與 `893e1fb` 相同。
- 本機完整 Chromium 跑在同一份 App：434 passed，失敗的 4 項舊斷言改好後重跑 17 passed；其餘 2 項是已知只在本機失敗的。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v178'`。全新 Chromium 開正式站，`APP_VERSION` 為 v178、只剩 `okayama-trip-v178` 快取，發布說明為「退稅追蹤」；退稅清單、稅額欄的程式都在線上，`PERSONAL_STATE_VERSION` 為 11；沒有 pageerror。
- **tag**：以 production-tags workflow 建立 `production-v178` → `e894f12`，`git ls-remote` 核對相符。
- 不用換 Apps Script（v178 沒改）。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `20c4fe2`（`production-v177`）的部署，再往前 bump。

## 2026-11-01 — v178 退稅追蹤；「稅與優惠券」改成「稅」（已上線 main，見上）

- **來源**：backlog #63。Bar 2026-10-31～11-01 的決定：
  - 日本 2026/11/1 起免稅店先收稅、出境後才退，退稅要能追蹤；兩版都做，實際退回的錢抵掉花費，先只做個人帳。
  - 「拿掉優惠券，換成稅額」；「辨識到有優惠券等方式產生折扣金額時，再協助填入備注紀錄」。
  - 看過畫面草稿後的調整：說明句子改成「!」；「全部可退稅」按鈕不需要；「已收到」移到右邊；離境提醒不要另外一張卡片；不另建退稅表單。
- **記帳表單**：
  - 「稅與優惠券」改成「稅」，優惠券那一格換成「稅額」：收據有印就自動帶入（標「收據」），沒有收據時欄位提示照稅率算好的數字，可以自己改。
  - 選「税抜」時實付＝品項加總＋稅額（8%＋10% 混在一起只要一個數字），多品項的稅額照金額比例分到各品項。單品項的金額就是實付，稅額照稅率從金額算。
  - 說明收進稅額旁的「!」。
  - 「免稅品」改叫「可退稅」。新制下可退稅的品項一樣付了稅，計算時不再跳過；舊帳編輯時一律以税込載入，不受影響。單品項也有「可退稅」勾選。「全部免稅品」按鈕拿掉。
  - 舊帳記過的優惠券只顯示「優惠券 ¥X（舊資料，維持不變）」，金額照舊扣。這趟沒有稅、也沒有舊優惠券時整個區塊不顯示。
- **收據辨識**：
  - 稅額填進稅額欄（自己改過就不動）。
  - 可退稅的收據自動勾「可退稅」。
  - 收據上的優惠券等折扣寫進備註「收據折扣 ¥X（優惠券等）」；多品項照金額比例從各品項扣掉，原價列在結果視窗。
  - 有稅額時兩種稅率也能直接設「未稅」，不再要求自己選。
  - 「復原」也改回稅額與「可退稅」。
- **退稅追蹤**（只算個人帳）：
  - 分帳 → 個人卡片多一列「退稅 · 待退 N 張 ¥X 〉」。
  - 退稅清單分待退／已退，一張收據一列，「已收到」在右邊。按下去記實際退了多少（先帶預計）、退到哪裡（信用卡／App／現金／其他）與日期；已退的可以修改或改回待退。
  - 實際收到的退稅從「我的總花費」與整趟旅程扣掉（照比例換算台幣）；還在等的不扣。
  - 旅程最後一天，TODAY 卡片下方一行「今天離境：N 張收據待退稅（預計 ¥X）→」。
  - 帳的明細多「可退稅」「稅額」「實際退稅」。
- **資料**：
  - 個人帳每筆多 `taxAmount`、`refundAmount`（當地幣最小單位）、`refundMethod`、`refundDate`，只存在手機。
  - **個人備份格式升為 v11**：舊 App 會丟掉這幾欄，所以讓舊 App 明確拒絕。
  - 團體帳不送稅額，試算表與 Apps Script 都不用改。
- **版本**：
  - forward bump v177→v178；`builtin-snapshot.js` 以 v177 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v178` + `['v177','v176','v175','v174']`（v173 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v177 三件組的 hash。
- **測試**：
  - 新增 `tests/browser/refund-tracking-v178.spec.js`（9 項）。
  - 改寫的舊斷言：`receipt-recognition-v171`（稅額、折扣進備註並分攤、可退稅自動勾）、`trip-tax-v169`（「稅」、可退稅、沒有稅時不顯示區塊）、`ledger-multi-item`（可退稅品項也加稅、不再放大一萬倍所以 ¥12,345,678 算得出來）、`ledger-calculator`、`ledger-quick-entry`、`ledger-ui-polish`、`ledger-225`；瀏覽器的 `data-observability`、`ledger-calculator`（拿掉折扣計算機那段）、`ledger-entry-quick-layout`、`ledger-money-integrity`；以及備份版本相關的 `personal-state-restore-matrix`（v11）、`settings-backup-ux`、`shopping-ledger-links`。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v177 的 Netlify 部署（`commit_ref` `20c4fe2`，tag `production-v177`），再往前 bump。注意：v178 匯出的 v11 備份在 v177 無法還原。

## 2026-11-01 — v157–v177 補上正式 tag；整理待辦（不升版）

- **來源**：Bar 2026-11-01：「幫我將Github該做的tag完成並刪除多餘的事項」。
- **tag**：PR [#129](https://github.com/nick80912-dev/ai-native-projects/pull/129)（dev `3ea9ab8`）→ PR [#130](https://github.com/nick80912-dev/ai-native-projects/pull/130)（main `8ae2138`，App 仍是 v177）讓 production-tags workflow 進到 main 後觸發：
  - 第一次建好 `production-v157`～`v163`，到 v164 被 GitHub 拒絕（`GITHUB_TOKEN` 沒有 workflows 權限，而 v164–v176 的 `qa.yml` 不在任何現有分支或 tag 的最新 commit 上）；workflow 中途停下，沒有建錯的 tag。
  - 第二次只建 `production-v177`（`qa.yml` 與 main 相同）並刪除已合併進 main 的舊分支 `claude/pretrip-v149-ui`，成功。
  - 把 AI 工作分支（只含已合併內容）暫時指到 `24b5ff3`，第三次建好 `production-v164`～`v176`，再把工作分支改回 `dev`。
  - 以 `git ls-remote` 逐一核對：21 個 tag 都指向該版發布時的 main merge commit，每個 commit 的 `sw.js` 版本都相符。
- **刪除多餘的事項**：`tasks/current.md` 移除已過期的手機審查清單（v157–v177）、「建立 tag」待辦、旅途中（10/18–10/23）注意事項與已完成的回程後清單，原文移到 `tasks/done.md` 檔尾封存；只留「換岡山 Apps Script」「確認 v178 畫面」與接下來的 v178。`16_OPS_PLAYBOOK.md` §A5 錨點改為 `production-v177`，並記下 workflow 的已知限制與做法。GitHub 上已無多餘分支（只剩 `main`、`dev`、AI 工作分支）。
- App 與 SW 不變（仍是 v177）。

## 2026-11-01 — 正式版 tag 改由 GitHub Actions 建立（不升版）

- **來源**：Bar 2026-11-01：「幫我將Github該做的tag完成並刪除多餘的事項」。AI 工作環境推 tag 會被擋（`remote end hung up`），Bar 在網頁上逐一建 21 個 tag 太費工。
- **做法**：新增 `.github/workflows/production-tags.yml`（只能手動觸發）。輸入 `vNNN=commit` 清單與要刪的舊分支；先逐筆檢查 commit 在 main 上、該 commit 的 `sw.js` 版本相符、同名 tag 不覆寫、分支已完全合併且不是 main／dev，任何一筆不符就整批不動。`16_OPS_PLAYBOOK.md` §A5 補上用法。
- **驗證**：本機以 21 筆真實清單跑檢查步驟（v156 已存在而略過，v157–v177 列入待建立）；負向測試：版本與 commit 不符、要刪 dev、commit 不在 main 上都會被擋下。
- App 與 SW 不變（仍是 v177）。

## 2026-11-01 — v177 已上線 main（待 Bar 手機審查與 tag）

- PR [#125](https://github.com/nick80912-dev/ai-native-projects/pull/125) 在 head `3761396` 的 sanity／browser-qa 全綠後合併進 `dev`（`70ef7e1`）。release PR [#126](https://github.com/nick80912-dev/ai-native-projects/pull/126) 第一次檢查時，`dev` push 那次的 browser-qa 在 15 分鐘時限到時才跑到第 319／432 項（已跑的全過）被取消；同 commit 的 PR 那次 10.4 分鐘全綠。PR [#127](https://github.com/nick80912-dev/ai-native-projects/pull/127) 把 browser-qa 時限放寬為 25 分鐘（合併為 `c89d711`），#126 在 `c89d711` 重跑 7 項檢查全綠（其中一次 browser-qa 用了 13 分鐘）後合併 `dev` → `main`，merge commit **`20c4fe2`**；合併 tree `7c2cd5f` 與 `c89d711` 相同。本機完整 Chromium 430 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v177'`；全新 Chromium 開正式站，`APP_VERSION` 為 v177、只剩 `okayama-trip-v177` 快取，發布說明為「收據也讀出稅額」；`normalizeRecognition` 讀得出 `taxAmount`、列稅額的程式在線上；沒有 pageerror。
- **岡山 Apps Script 尚待 Bar 換新版**（v176、v177 換一次即可）。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `24b5ff3`（v176）的部署，再往前 bump。

## 2026-10-31 — v177 收據也讀出稅額（已上線 main，見上）

- **來源**：Bar 2026-10-31：「或者是把稅額也識別並列出來，之後紀錄退稅金額多少也比較方便。因為未來日本也要改成統一機場或是APP退稅…」。查證：日本 2026/11/1 起免稅店改「リファンド方式」，結帳先付含稅價，出境時海關確認帶出後才退稅；退款由購買的店家或其委託的退稅業者處理（退到卡、App、銀行或在出境港領現金，各家不同），不是統一在機場。Bar 選「兩版都做」：v177 先讀出稅額；v178 再做每筆「預計退稅」、退稅清單、離境前提醒與實際退款（抵掉花費、先只做個人帳）。
- **使用上**：
  - 收據辨識多讀「稅額」（各稅率的消費稅合計）。一般收據在結果視窗列「收據上的稅額 ¥X」，不動備註。
  - 可退稅的收據，備註寫「可退稅（結帳時未扣稅，需另外辦理），稅額 ¥X」；「復原」會改回。
  - 結帳時已扣稅（免稅）的收據沒有稅可退，不列稅額；收據幣別不是這趟的當地幣別或台幣時也不列。
- **做法**：Apps Script `recognizeReceipt` 多回 `taxAmount`（正數或 null），提示補上日本 11 月起先付稅、出境後再退的收據（免税対象、免税販売、Tax Refund、リファンド）算 `refundable`；`normalizeRecognition()` 再檢查 `taxAmount`，只讀到稅額也算讀到內容；殼層 `applyLedgerReceiptRecognition()` 列稅額並寫進可退稅備註。帳本欄位不變。
- **版本**：forward bump v176→v177；`builtin-snapshot.js` 以 v176 asset 離線重產，除版本外不變。發布說明視窗為 `v177` + `['v176','v175','v174','v173']`（v172 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v176 三件組的 hash。
- **Apps Script 要再換一次**：岡山試算表的 Apps Script 換成最新 `apps-script/ledger-sync.gs` 並部署新版本，不需要重新授權（v176 還沒換的話，換一次就兩版都有）。
- **測試**：`tests/apps-script-settings.test.js`、`tests/ledger-receipts.test.js` 加入 `taxAmount`；`tests/browser/receipt-recognition-v171.spec.js` 新增 2 項（可退稅備註含稅額與復原；一般收據只列稅額、免稅與外幣不列）。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v176 的 Netlify 部署（`commit_ref` `24b5ff3`），再往前 bump。

## 2026-10-31 — v176 已上線 main（待 Bar 手機審查與 tag）

- PR [#122](https://github.com/nick80912-dev/ai-native-projects/pull/122) 在 head `75116ef` 的 sanity／browser-qa 全綠後合併進 `dev`（`31f2e36`，釘住 head）；PR [#123](https://github.com/nick80912-dev/ai-native-projects/pull/123)（並帶 v175 發布紀錄 PR #121）合併 `dev` → `main`，merge commit **`24b5ff3`**。合併 tree `740e906` 與 `31f2e36` 相同。本機完整 Chromium 428 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v176'`；全新 Chromium 開正式站，`APP_VERSION` 為 v176、只剩 `okayama-trip-v176` 快取，發布說明為「收據也看免稅與稅率」；寫備註、`taxTouched`、未稅加稅比對的程式都在線上，`normalizeRecognition` 讀得出 `taxFree`／`taxRates`／`pricesIncludeTax`；沒有 pageerror。
- **岡山 Apps Script 尚待 Bar 換新版**（換之前 App 照常，只是沒有免稅與稅率）。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `12ee222`（v175）的部署，再往前 bump。

## 2026-10-31 — v176 收據也看免稅與稅率（已上線 main，見上）

- **來源**：Bar 2026-10-31：「能在辨識內容中辨識該收據是否已退稅或稅金扣抵了嗎？」。追問後 Bar 裁定：免稅「可以在附註填入該收據是免稅」（不自動勾「免稅品」）；稅率「要，多品項時自動設好」。
- **使用上**：
  - 收據上看得出免稅（結帳時已扣稅，如「免税」「Tax-Free」）時，備註加上「免稅（結帳時已扣稅）」；看得出可退稅（結帳時未扣稅、要另外辦）時加上「可退稅（結帳時未扣稅，需另外辦理）」。原本有寫備註的接在後面（用「；」隔開），已經有同一句就不重複。不會自動勾「免稅品」。
  - 收據上只印一種稅率時，「稅與優惠券」的稅率選成那個（不在這趟清單裡就用「自訂」）；多品項而且收據上的品項是未稅價（外税／税抜）時，價格方式選「未稅」，品項加總加稅後與收據總額相同就不再出現「對不上」的提示。單品項只換稅率、不動含稅／未稅（總額本來就是含稅後的錢）。
  - 收據上有兩種以上稅率（例如 8% 與 10%）時不自動設定，結果視窗提示「可依稅率分開記，或在『稅與優惠券』自己選」。
  - 自己動過稅的設定、編輯舊帳、這趟沒有稅（例如韓國旅程沒填 Tax Rates）時，稅都不改；免稅一樣寫備註。
  - 「復原」也會把備註與稅的設定改回去；按「改成多品項並帶入」時也照收據的未稅價設定稅。
- **做法**：
  - Apps Script `recognizeReceipt` 多回 `taxFree`（`"deducted"`／`"refundable"`／`""`）、`taxRates`（數字陣列，最多 3 個、0–100、去重）、`pricesIncludeTax`（true／false／null）；新增 `receiptTaxRates()`。
  - `ledger-receipts.js` 的 `normalizeRecognition()` 再檢查一次這三欄；只讀到免稅或只讀到稅率也算讀到內容。
  - 殼層：`applyLedgerReceiptRecognition()` 寫備註、設稅率／價格方式；`setLedgerPriceMode()`／`setLedgerTaxPreset()`／`setLedgerCustomTaxRate()` 記 `draft.taxTouched`；`LEDGER_RECEIPT_UNDO_FIELDS` 加 `note`、`priceMode`、`taxPreset`、`customTaxRate`；`fillLedgerDraftFromReceiptItems()` 對不上的檢查改成未稅時先加稅再比。
- **版本**：forward bump v175→v176；`builtin-snapshot.js` 以 v175 asset 離線重產，除版本外不變。發布說明視窗為 `v176` + `['v175','v174','v173','v172']`（v171 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v175 三件組的 hash。
- **Apps Script 要再換一次**：岡山試算表的 Apps Script 換成最新 `apps-script/ledger-sync.gs` 並「部署 → 管理部署作業 → 編輯 → 新版本」。不需要重新授權。沒換之前 App 照常運作，只是不會有免稅與稅率。
- **測試**：`tests/apps-script-settings.test.js`、`tests/ledger-receipts.test.js` 加入三個新欄位；`tests/browser/receipt-recognition-v171.spec.js` 新增 7 項（免稅寫備註且不勾免稅品、可退稅、多品項未稅 10% 且加總相符並存檔、多種稅率只提示、自己選過不改、單品項與自訂稅率與沒有稅的旅程、復原、改成多品項並帶入）。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v175 的 Netlify 部署（`commit_ref` `12ee222`），再往前 bump。Apps Script 新版與舊 App 相容（多的欄位舊版不讀）。

## 2026-10-31 — v175 已上線 main（待 Bar 手機審查與 tag）

- Bar 先看過 6 張畫面（結果視窗、照片下方只剩品項按鈕、收據時間建議、按了之後、沒網路時的照片時間建議、照片時間短通知）後回「好，送上main我手機審查」。
- PR [#119](https://github.com/nick80912-dev/ai-native-projects/pull/119) 在 head `b16acd6` 的 sanity／browser-qa 全綠後合併進 `dev`（`5f9d4ca`，釘住 head）；PR [#120](https://github.com/nick80912-dev/ai-native-projects/pull/120)（並帶 v174 發布紀錄 PR #118）合併 `dev` → `main`，merge commit **`12ee222`**。合併 tree `9f0b21e` 與 `b16acd6` 相同。本機完整 Chromium 421 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v175'`；全新 Chromium 開正式站，`APP_VERSION` 為 v175、只剩 `okayama-trip-v175` 快取，發布說明為「收據照片下方只留品項按鈕」；照片下方只畫品項列、時間建議在視窗裡的程式都在線上；沒有 pageerror。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `ec69925`（v174）的部署，再往前 bump。

## 2026-10-31 — v175 收據照片下方只留品項按鈕（已上線 main，見上）

- **來源**：Bar 2026-10-31：「收據照片下方的說明保留剩下"收據上有N個品項"與改成多品項並帶入按鈕就好」。
- **使用上**：
  - 收據照片下方只顯示「收據上有 N 個品項」與「改成多品項並帶入」（多品項時「改用這 N 個品項」）；辨識訊息、附註、錯誤都不再列在下面。
  - 時間建議改放彈出視窗：收據上的時間只提示時，結果視窗多一行「收據上的時間是 …」與「改用收據時間」；照片的拍攝時間只提示、又沒有辨識（關閉或沒網路）時，跳出小視窗「照片的拍攝時間是 …」，按鈕「改用照片時間」「好」。按了之後視窗留著、多一行「已改用…」、按鈕消失。
  - 照片時間直接帶入、照片沒存下來（含手機空間不足）改用畫面下方的短通知。
- **做法**：`renderLedgerReceiptField()` 拿掉 `#ledgerReceiptTimeNote` 與錯誤列；`renderLedgerReceiptScan()` 只留品項列；`ledgerReceiptDialogHtml()` 依 `draft.receiptSuggestedTime` 加時間附註與按鈕、新增 `suggest` 狀態；`selectLedgerReceiptPhoto()` 不辨識時用 `showLedgerReceiptCard()` 顯示照片時間建議、錯誤改 `toast()`；`applyLedgerReceiptPhotoTime()` 直接帶入時 `toast()`；`applyLedgerReceiptSuggestedTime()` 有視窗就重畫視窗、沒有就 `toast()`。
- **版本**：forward bump v174→v175；`builtin-snapshot.js` 以 v174 asset 離線重產，除版本外不變。發布說明視窗為 `v175` + `['v174','v173','v172','v171']`（v170 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v174 三件組的 hash。Apps Script 不變。
- **測試**：`tests/browser/receipt-photos-v167.spec.js` 改成：照片時間帶入看短通知、時間建議在視窗裡按「改用照片時間」、照片下方沒有說明文字。`tests/browser/receipt-recognition-v171.spec.js`：辨識訊息改讀表單資料（`scanMessage()`）、附註改看視窗（`cardNotes()`）、「改用收據時間」在視窗裡；新增一項：照片下方只剩品項列。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v174 的 Netlify 部署（`commit_ref` `ec69925`），再往前 bump。

## 2026-10-31 — v174 已上線 main（待 Bar 手機審查與 tag）

- PR [#116](https://github.com/nick80912-dev/ai-native-projects/pull/116) 在 head `e7dc1d3` 的 sanity／browser-qa 全綠後合併進 `dev`（`ed977b0`，釘住 head）；PR [#117](https://github.com/nick80912-dev/ai-native-projects/pull/117)（並帶 v173 發布紀錄 PR #115）合併 `dev` → `main`，merge commit **`ec69925`**。合併 tree `5ef8032` 與 `e7dc1d3` 相同。本機完整 Chromium 420 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v174'`；全新 Chromium 開正式站，`APP_VERSION` 為 v174、只剩 `okayama-trip-v174` 快取，發布說明為「收據辨識結果改用彈出視窗」；彈出視窗與復原的函式在線上，設定根頁的程式含「!」按鈕（全新手機是「尚未連接」，設定只有「資料」群組，看不到簡易結算列，屬正常）；沒有 pageerror。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `625fbd0`（v173）的部署，再往前 bump。

## 2026-10-31 — v174 收據辨識結果改用彈出視窗；設定的簡易結算說明收進「!」（已上線 main，見上）

- **來源**：Bar 2026-10-31 問辨識結果要不要用提示視窗；我建議表單頂端卡片（不擋畫面），Bar 先選了卡片，看過後改要「可以將這個卡片做成彈出視窗嗎?」——辨識在背景進行，視窗跳出時若正在打字會被打斷，已向 Bar 說明後照做。同一批 Bar 指出「設定內的簡易結算模式下的說明並未改成!資訊」（v169 只改了結算面板）。
- **使用上**：
  - 讀取中：表單上方一行「正在讀取收據…」，不跳視窗。
  - 讀完：跳出視窗「已依收據帶入（請確認）」，逐項列出帶入的時間、金額、店名、支付方式、類別、品項，附註（收據時間只提示、幣別不同、品項加總對不上等）列在下方；「好」、點視窗外面或按 Esc 關閉，「復原」把這次辨識改過的欄位全部改回辨識前（含「改成多品項並帶入」），照片保留。失敗（附「重試」）與看不出收據內容也用同一個視窗。焦點落在「好」。關掉表單時視窗一起消失。
  - 被收據填過、而且還沒改過的欄位，標籤旁顯示小標「收據」（金額、日期、店家、支付方式、類別）；自己改了就不顯示。收據欄下方原本的訊息保留。
  - 設定根頁「簡易結算模式」不再常駐說明文字，改成「!」按鈕（44px），點一下才顯示「只看轉帳建議，不用按「我已付款」；別人標記付款時仍可在團體結算確認。已確認的結清照常計入餘額。」；按「!」不會切換開關。
- **做法**：`renderLedgerReceiptCard()` 只放讀取中；`syncLedgerReceiptDialog()`（`renderLedgerEntrySheet()` 結尾呼叫）建立 `#ledgerReceiptDialog`（`role=dialog`、`aria-modal`），同一個結果不重畫；`showLedgerReceiptCard()`、`dismissLedgerReceiptCard()`、`undoLedgerReceiptRecognition()`、`removeLedgerReceiptDialog()`（`closeLedgerEntrySheet()` 也呼叫）；`applyLedgerReceiptRecognition()` 先存 `ledgerReceiptSnapshot()`（`LEDGER_RECEIPT_UNDO_FIELDS`），回傳 `rows`、`filled`、`undo`；`ledgerReceiptTag()` 依 `receiptFilled` 與目前值比對。設定：`renderSettingsRoot()` 的簡易結算列改為 `div` 列＋`label for`，新增 `simpleSettlementSettingsHelpButton()`／`simpleSettlementSettingsHelpText()`／`toggleSimpleSettlementSettingsHelp()`。
- **版本**：forward bump v173→v174；`builtin-snapshot.js` 以 v173 asset 離線重產，除版本外不變。發布說明視窗為 `v174` + `['v173','v172','v171','v170']`（v169 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v173 三件組的 hash。Apps Script 不變。
- **測試**：`tests/browser/receipt-recognition-v171.spec.js`：讀取中不跳視窗、視窗列出內容並在畫面內、焦點在「好」、「收據」小標改了就消失、「好」／點外面／Esc／關表單都會關；「復原」改回各欄位與多品項、照片保留；失敗與重試、看不出收據內容；原本要操作表單的測試先按「好」關掉視窗（新增 `closeReceiptDialog()`）。`tests/browser/trip-tax-v169.spec.js` 新增設定根頁的「!」：預設收起、44px、按了只開說明不切換開關、開關照常可用。`tests/settings-grouped-root.test.js` 沙盒補上兩個函式並檢查說明不再常駐。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v173 的 Netlify 部署（`commit_ref` `625fbd0`），再往前 bump。

## 2026-10-31 — v173 已上線 main（待 Bar 更新岡山 Apps Script、手機審查與 tag）

- PR [#113](https://github.com/nick80912-dev/ai-native-projects/pull/113)（v172 發布紀錄＋v173）在 head `3b6f9c2` 的 sanity／browser-qa 全綠後合併進 `dev`（`c84cc78`，釘住 head）；PR [#114](https://github.com/nick80912-dev/ai-native-projects/pull/114) 合併 `dev` → `main`，merge commit **`625fbd0`**。合併 tree `2be7622` 與 `3b6f9c2` 相同。本機完整 Chromium 415 passed，只有已知只在本機失敗的兩項，沒有略過的測試；反向驗證：把多品項收據欄的修正改回去，對應測試失敗。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v173'`；全新 Chromium 開正式站，`APP_VERSION` 為 v173、只剩 `okayama-trip-v173` 快取，發布說明為「收據也幫忙選支付方式與類別」；快取內的 `ledger-receipts.js` 有品項整理；多品項收據欄的修正在線上；沒有 pageerror。
- **還差 Bar 一步**：岡山 Apps Script 換成最新 `apps-script/ledger-sync.gs` 並部署新版本（不需重新授權），之後才會選支付方式、類別與逐筆帶入品項；沒換之前照 v172 的行為。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `32c2aed`（v172）的部署，再往前 bump。

## 2026-10-31 — v173 收據也幫忙選支付方式與類別（已上線 main，見上）

- **來源**：Bar 2026-10-31：「如果 Receipt 上有辨識到 PayPay、TWQR 跨境支付（悠遊付、台灣Pay、icash Pay）、Line Pay 等各國關於的行動支付項目，則支付方式協助選至行動支付。類別如果辨識出是有關餐飲則也調整、交通就調至交通以此類推」。
- **使用上**：加收據照片辨識時，App 一併送出這支手機的支付方式與類別選項；Google 從清單裡選一個：PayPay、LINE Pay、TWQR 跨境支付（悠遊付、台灣Pay、icash Pay、全支付）、街口、支付寶、微信支付、Apple Pay、Google Pay、楽天ペイ、d払い、au PAY、メルペイ、KakaoPay、Naver Pay 等 → 「行動支付」；VISA、Mastercard、JCB、American Express、Diners、銀聯等信用卡／金融卡 → 「信用卡」（Bar 2026-10-31：「有關VISA、JCB、Master Card 等支付方式就是信用卡」）；現金 → 「現金」；Suica／ICOCA／PASMO → 「Suica」（清單有時）。類別：收據有列品項時依品項判斷、品項不同類時選占總額最多的類（Bar 2026-10-31「如果有詳細讀收據內的商品而定也可以」）；餐廳、咖啡、食物 → 「餐飲」；電車、公車、計程車、加油、停車 → 「交通」；門票 → 「票券」；紀念品店、伴手禮 → 「購物」（Bar 2026-10-31）；手機上自訂的類別也是候選，名稱更貼切時選它。只在還是表單預設、自己沒選過、不是編輯舊帳時才換；多品項時改共用類別，不動自己單獨調過的品項；清單外的答案不採用。收據欄下方的訊息會列出換了哪些（例如「…、支付方式「行動支付」、類別「交通」」）。
  - **多品項逐筆帶入**（Bar 2026-10-31 選「要，逐筆帶入」；單品項選「不用填明細」）：收據上的品項（名稱照收據原文、每行的金額）與折扣總額也一併讀出。已經是多品項、品項都還空著時直接帶入（折扣欄空著才填）；品項加總與收據總額對不上時提示「可能是未稅價或另有折扣，請檢查「稅與優惠券」」。單品項或已經打了品項時，收據欄下方顯示「收據上有 N 個品項」與按鈕（「改成多品項並帶入」／「改用這 N 個品項」，有內容時先確認）。單品項的明細一律不自動填。
  - **順便修正（v167 起的錯）**：多品項記帳時「收據照片」欄位一直不顯示——判斷「從採買記帳」時把空白品項也當成有採買來源。現在只有真的連到採買項目才隱藏。
- **Bar 要做的事（上線後）**：岡山 Apps Script 再換一次新版（貼上 → 部署新版本，網址不變；這次不需要再授權）。沒換之前照 v172 的行為，只是不會幫忙選支付方式與類別。
- **做法**：
  - `apps-script/ledger-sync.gs`：`recognizeReceipt` 讀 App 送來的 `payMethods`／`categories`（`receiptChoices()`：字串、去重、每項 12 字、最多 30 項），有清單時在提示加上 `RECEIPT_CHOICE_PROMPT`（列出各國行動支付的例子）；`receiptFields()` 多回 `payMethod`／`category`，只接受清單內的值。舊版 App 不送清單時兩欄空白、提示不變。
  - `ledger-receipts.js`：`normalizeRecognition()` 多整理 `payMethod`／`category`（字串、12 字）。
  - Apps Script 另回 `items`（`receiptItems()`：名稱 20 字、金額正數、最多 30 項）與 `discount`（`receiptAmount()`）；`normalizeRecognition()` 同樣整理。shell 新增 `ledgerDraftItemsBlank()`、`fillLedgerDraftFromReceiptItems()`、`applyLedgerReceiptItems()`；`ledgerReceiptFieldVisible()` 只把有 `shoppingItemId`／`allocationId` 的來源當成採買。
  - shell：`postLedgerReceiptRecognition()` 帶 `payMethods`／`categories`（`ledgerDraftOptions()`）；`applyLedgerReceiptRecognition()` 依 `payMethodTouched`／`categoryTouched` 判斷（`selectLedgerPayMethod()`、`selectLedgerCategory()`、`selectLedgerCategoryApply()` 設定）；多品項用 `updateLedgerCategoryApply()`。
- **版本**：forward bump v172→v173；`builtin-snapshot.js` 以 v172 asset 離線重產，除版本外不變。發布說明視窗為 `v173` + `['v172','v171','v170','v169']`（v168 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v172 三件組的 hash。
- **測試**：`tests/apps-script-settings.test.js`：清單整理、提示含 PayPay／LINE Pay／悠遊付／台灣Pay／icash Pay、清單外的答案不採用、沒送清單時不回也不提。`tests/ledger-receipts.test.js`：兩個新欄位。`tests/browser/receipt-recognition-v171.spec.js` 新增 3 項：預設時換成「行動支付」「交通」並存成一般的帳、送出的清單；自己選過的不換、清單外的答案不採用；多品項改共用類別但不動自己調過的品項；多品項逐筆帶入與折扣、存成兩筆合計等於收據總額；加總對不上的提示；單品項不填明細、按鈕改成多品項並帶入；已打的品項要確認才取代；多品項看得到收據欄、從採買記帳時看不到。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v172 的 Netlify 部署（`commit_ref` `32c2aed`），再往前 bump。Apps Script 新版對舊 App 相容。

## 2026-10-31 — v172 已上線 main（待 Bar 手機審查與 tag）

- PR [#111](https://github.com/nick80912-dev/ai-native-projects/pull/111)（v172＋Apps Script 收據辨識授權檢查）在 head `d58da18` 的 sanity／browser-qa 全綠後合併進 `dev`（`f1897bf`，釘住 head）；PR [#112](https://github.com/nick80912-dev/ai-native-projects/pull/112)（並帶 v171 發布紀錄 PR #110）合併 `dev` → `main`，merge commit **`32c2aed`**。合併 tree `67d34c8` 與 `d58da18` 相同。本機完整 Chromium 407 passed，只有已知只在本機失敗的兩項（個人帳匯出下載檔名、sw-update-cache 離線 504），沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v172'`；全新 Chromium 開正式站，`APP_VERSION` 為 v172、只剩 `okayama-trip-v172` 快取，發布說明為「收據自動讀取的說明收進「!」」；「!」按鈕存在；岡山 Apps Script 已是新版且已授權（Bar 執行 `checkReceiptRecognition` 回 OK；送一張畫出來的測試收據，日期、時間、總額、幣別、店名五項都讀對；送不是圖片的內容回 `ai http 400`，沒有寫入）；沒有 pageerror。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `e7becff`（v171）的部署，再往前 bump。

## 2026-10-31 — v172 收據自動讀取的說明收進「!」（已上線 main，見上）

- **來源**：Bar 2026-10-31 試過收據辨識（`checkReceiptRecognition` 回「OK：收據辨識可以使用」，從這邊送測試收據五項都讀對）後要求：「收據照片下方的有網路時說明，調整成!資訊」。
- **使用上**：記帳表單「收據照片（選填，最多 3 張，只存在這支手機）」旁邊多一個「!」，點一下才顯示「有網路時，照片會傳到 Google 讀取日期、金額與店名一次，只填還空著的欄位（可在「設定 → 帳務」關閉）」，再點一下收起；表單重畫（例如加照片）時維持開或關。關掉收據自動辨識的手機不顯示「!」。
- **做法**：`renderLedgerReceiptField()` 把標題與「!」放在 `.ledger-receipt-head`；新增 `ledgerReceiptHelpButton()`／`ledgerReceiptHelpText()`／`toggleLedgerReceiptHelp()`，沿用 v169 簡易結算的 `ledger-help-button` 樣式（44px、`aria-expanded`／`aria-controls`）。
- **版本**：forward bump v171→v172；`builtin-snapshot.js` 以 v171 asset 離線重產，除版本外不變。發布說明視窗為 `v172` + `['v171','v170','v169','v168']`（v167 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v171 三件組的 hash。
- **測試**：`tests/browser/receipt-recognition-v171.spec.js` 新增一項：「!」在標題旁、預設收起、44px、按了顯示、加照片後維持、再按收起、關掉辨識時沒有「!」；原有收據與辨識測試照舊通過。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v171 的 Netlify 部署（`commit_ref` `e7becff`），再往前 bump。

## 2026-10-31 — Apps Script：收據辨識的授權檢查（App 不變，仍是 v171）

- **原因**：Bar 更新岡山 Apps Script 後，在編輯器執行 `tripLocalCurrency` 沒有跳出授權畫面；從正式站送 `recognizeReceipt` 回 `ai unreachable`，表示新程式已部署，但呼叫 Gemini（`UrlFetchApp`）時失敗，最可能是還沒授權「連線到外部服務」。
- **改動**（只有 `apps-script/ledger-sync.gs` 與說明，Bar 要再貼一次並部署新版本）：
  - 新增 `checkReceiptRecognition()`：在編輯器選它執行，會要求授權，並在執行記錄寫出金鑰／模型能不能用（只查模型資料，不用掉辨識次數，不印出金鑰）。
  - 呼叫 Gemini 失敗時，沒有權限回 `not authorized`，其他回 `ai unreachable: <原因>`，方便判斷。
  - `apps-script/README.md` 補上收據辨識的 POST 契約、錯誤代碼與授權步驟（含 `appsscript.json` 有 `oauthScopes` 時要加 `script.external_request`）。
- **測試**：`tests/apps-script-settings.test.js` 新增沒有權限的錯誤、`checkReceiptRecognition()` 的四種結果（可用、沒放金鑰、找不到模型、金鑰無法使用）、不印出金鑰、只查模型資料。

## 2026-10-31 — v171 已上線 main（待 Bar 更新岡山 Apps Script、手機審查與 tag）

- PR [#108](https://github.com/nick80912-dev/ai-native-projects/pull/108) 在 head `5c9e5ff` 的 sanity／browser-qa 全綠後合併進 `dev`（`b5d62e0`，釘住 head）；PR [#109](https://github.com/nick80912-dev/ai-native-projects/pull/109)（並帶 v170 發布紀錄 PR #107）合併 `dev` → `main`，merge commit **`e7becff`**。合併 tree `90c12d9` 與 `5c9e5ff` 相同。本機完整 Chromium 406 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v171'`；全新 Chromium 開正式站，`APP_VERSION` 為 v171、只剩 `okayama-trip-v171` 快取，發布說明為「收據照片自動讀取」；快取內的 `ledger-receipts.js` 有 `normalizeRecognition`；收據自動辨識預設開啟；對岡山目前的 Apps Script（尚未更新）送 `recognizeReceipt`，回 `missing or invalid ledger fields`、沒有寫入，App 顯示「這份試算表的 Apps Script 還沒更新到能讀收據的版本，請手動輸入」；沒有 pageerror。Netlify deploy ID 未另查。
- **還差 Bar 一步**：把 `apps-script/ledger-sync.gs` 貼到岡山 Apps Script 並部署新版本（網址不變），之後才會真的讀收據。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `da3cd89`（v170）的部署，再往前 bump。

## 2026-10-31 — v171 收據照片自動讀取（已上線 main，見上）

- **來源**：backlog #61（Bar 2026-10-30 裁定用雲端 AI；2026-10-31 併入讀收據上的日期時間；2026-10-31 Bar 申請好 Gemini API 金鑰並放進岡山 Apps Script 的指令碼屬性，回覆「完成，已使用免費版方式」——免費版的內容可能被 Google 用來改善產品，Bar 已知悉並接受照片傳到 Google 一次）。
- **使用上**：
  - 記帳加收據照片後，有網路就自動讀取收據上的日期、時間、總額、幣別、店名，只填還空著的欄位，存檔前都可以改；收據欄下方顯示讀到什麼（例如「已依收據帶入時間、金額 ¥1,580、店名「ローソン 倉敷店」，請確認」）。
  - 收據上的時間優先於照片的拍攝時間（v167）：時間還是預設值或照片時間時直接換；自己改過或編輯舊帳時只提示，按「改用收據時間」才換。
  - 總額：單品項、金額空白時帶入；收據是台幣就切到台幣；幣別不是這趟的當地幣別或台幣、或是多品項時，只提示總額不自動填。
  - 讀不到或失敗時說明原因（Apps Script 還沒更新、沒放金鑰、今天免費次數用完、逾時、連不上網路）並可「重試」；沒有網路時不送。一張成功後，同一筆帳的其他照片不再送。
  - 收據欄下方註明「有網路時，照片會傳到 Google 讀取日期、金額與店名一次」；每支手機可在「設定 → 帳務 → 收據自動辨識」關閉（旅伴的照片也會送出，所以各自決定）。
- **Bar 要做的事（上線後）**：把最新的 `apps-script/ledger-sync.gs` 貼到岡山試算表的 Apps Script，儲存後「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」（網址不變）；這次會多要求一次「連線到外部服務」的授權。沒更新前 App 會顯示「Apps Script 還沒更新到能讀收據的版本」，記帳照常。
- **做法**：
  - `apps-script/ledger-sync.gs`：新增 `recognizeReceipt()`（`doPost` 的 `action:'recognizeReceipt'`，**不拿鎖**，不擋同時間的記帳），從指令碼屬性讀 `GEMINI_API_KEY`（可選 `GEMINI_MODEL`，預設 `gemini-flash-lite-latest`），以 header `x-goog-api-key` 呼叫 `generativelanguage.googleapis.com/v1beta/models/<模型>:generateContent`（`responseMimeType: application/json`、`temperature: 0`），提示這趟的當地幣別；圖片限 JPEG／PNG／WebP 的 base64、約 4.5 MB 以內；回覆只取五個欄位（`receiptFields()`）。429 回 `quota`。舊部署收到這個 action 會因缺少紀錄欄位而回錯誤，不會寫入。
  - `ledger-receipts.js`：`normalizeRecognition()`（日期 2000–2100 且真實存在、時間 24 小時制、總額正數、幣別三碼、店名 40 字）。
  - shell：`receiptRecognitionEnabled()`／`setReceiptRecognition()`／`renderReceiptRecognitionSetting()`、`ledgerReceiptShouldRecognize()`、`postLedgerReceiptRecognition()`（30 秒逾時）、`recognizeLedgerReceipt()`、`retryLedgerReceiptRecognition()`、`applyLedgerReceiptRecognition()`、`ledgerReceiptTimeReplaceable()`、`renderLedgerReceiptScan()`；`applyLedgerReceiptPhotoTime()` 記下自動帶入的照片時間（`receiptAutoTime`），讓收據時間可以蓋過；「改用…時間」依來源顯示照片或收據。
- **版本**：forward bump v170→v171；`builtin-snapshot.js` 以 v170 asset 離線重產，除版本外不變。發布說明視窗為 `v171` + `['v170','v169','v168','v167']`（v166 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v170 三件組的 hash。
- **測試**：
  - `tests/apps-script-settings.test.js`：辨識只回五個欄位、不寫分帳紀錄、不拿鎖；金鑰放 header 不放網址；預設與自訂模型、模型名稱檢查；沒有金鑰不呼叫 AI；圖片格式與大小；429、403、回覆不是 JSON、連不上；程式裡沒有金鑰；一般記帳仍拿鎖。`tests/ledger-receipts.test.js`：`normalizeRecognition()` 各種格式。
  - 新增 `tests/browser/receipt-recognition-v171.spec.js`（5 項，攔截送往 Apps Script 的 POST）：讀到的時間蓋過照片時間、帶入金額與店名並存成一般的帳、第二張照片不再送；自己打的金額店名不被蓋、改過的時間只提示並可改用；韓元旅程收到日圓收據不帶金額、台幣收據切到台幣；舊 Apps Script／免費次數用完／沒放金鑰的說明與重試、看不出收據內容；關閉或離線時不送、設定頁的開關。
  - 開發中先抓到一個錯：照片存好後引用了不在範圍內的 `results`，加照片會失敗；瀏覽器測試發現後已修正（改用 `compressed`）。
  - 本機完整 Chromium：406 passed，只有已知只在本機失敗的兩項（個人帳匯出下載檔名、sw-update-cache 離線 504），沒有略過的測試。
  - 反向驗證：會蓋掉自己打的金額時「已經打的保留」一項失敗；加照片後不送辨識時「帶入空欄位」一項失敗。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v170 的 Netlify 部署（`commit_ref` `da3cd89`），再往前 bump。Apps Script 新版即使不退也不影響記帳（新增的 action 只在 App 呼叫時才用）。

## 2026-10-31 — v170 已上線 main（待 Bar 手機審查與 tag）

- PR [#105](https://github.com/nick80912-dev/ai-native-projects/pull/105) 在 head `2d318c2` 的 sanity／browser-qa 全綠後合併進 `dev`（`b38e3f5`，釘住 head）；PR [#106](https://github.com/nick80912-dev/ai-native-projects/pull/106)（並帶 v169 發布紀錄 PR #104）合併 `dev` → `main`，merge commit **`da3cd89`**。合併 tree `0125e9c` 與 `2d318c2` 相同。本機完整 Chromium 401 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v170'`；全新 Chromium 開正式站，`APP_VERSION` 為 v170、只剩 `okayama-trip-v170` 快取，發布說明為「去日本以外的地方也順手」；在正式站對曼谷呼叫真正的 Open-Meteo，回應時差 25200 秒（+7）並存進 `hours.utcOffsetSeconds`；岡山的預設支付方式仍有 Suica，韓元旅程沒有；沒有 pageerror。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `0c4fe6b`（v169）的部署，再往前 bump。
- backlog #62「不限日本」三批（v168–v170）全部上線；下一項是 #61 收據辨識。

## 2026-10-31 — v170 去日本以外的地方也順手（已上線 main，見上）

- **來源**：backlog #62 第三批（設計 `docs/superpowers/specs/2026-10-31-multi-country-trips.md` §3.6、§3.7；Bar 2026-10-31「繼續，完成後送上main我手機審查」）。
- **使用上**：
  - 天氣：Open-Meteo 改用 `timezone=auto`，依目的地自己的時區算「現在之後」的最高降雨機率（例如手機在日本 13:30、目的地曼谷 11:30，曼谷 11 點的雨就算已經過去）；「更新於」與讀屏的「手機取得時間」跟手機時區，不再寫「日本時間」。
  - 支付方式：手機上還沒改過支付方式清單時，日圓旅程（含岡山）照舊有 Suica，其他幣別的旅程預設「現金、信用卡、行動支付、其他」；「恢復預設」也照這趟的預設。已存在手機上的清單不動。
  - 帳目明細：金額改用這趟的幣別（美金旅程顯示 `USD US$12.50`，以前會錯成 `JPY ¥1,250`，v168 漏改）；優惠券金額改成帶符號的金額（以前是最小單位加 `JPY`）。
  - 文字：「日幣必填」→「當地幣金額必填」；過往旅程欄位名稱「日幣」→「當地幣」；個人帳匯出說明「原有日幣與台幣金額」→「原有當地幣與台幣金額」。
- **做法**：
  - `fetchWeather()` 存下 `utcOffsetSeconds`（回應的 `utc_offset_seconds`）；`rainChanceFromNow()` 用它把不帶時差的當地時間換成時間點，v169 以前的快取沒有這個欄位時視為 +09:00；`weatherUpdatedTime()` 不再指定時區。
  - `createLedgerOptionStore()` 的 `defaults` 可以是函式（每次讀取時決定）；新增 `DEFAULT_LEDGER_PAY_METHODS_ABROAD` 與 `defaultLedgerPayMethods()`（`tripLocalCurrencyCode()` 不是 JPY 時不含 Suica）。`DEFAULT_LEDGER_PAY_METHODS` 不變（v1 備份的移轉照舊用它）。
  - `ledgerRecordDetailRows()` 改用 `ledgerCurrencyCodeOf()`／`formatLedgerCurrencyAmount()`。
  - 文件：ADR 0021 增補「不限日本」（解除原 Trade-offs 的「只支援日本」）；`docs/new-trip-handbook.md` 補 Apps Script 部署的逐步說明（授權畫面、更新程式後要部署新版本）、v168 以前建立的範本要重貼最新 `ledger-sync.gs`、「去日本以外的地方」一節（幣別、匯率、稅、支付方式、手機時區）、天氣任何國家都能用。
- **版本**：forward bump v169→v170；`builtin-snapshot.js` 以 v169 asset 離線重產，除版本外不變。發布說明視窗為 `v170` + `['v169','v168','v167','v166']`（v165 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v169 三件組的 hash。
- **測試**：
  - `tests/weather-rain-window.test.js`：曼谷（+7）、檀香山（−10）的「現在之後」；沒有時差欄位的舊快取照舊；`fetchWeather` 用 `timezone=auto` 並存下時差；更新時間跟手機時區、不寫「日本時間」。`tests/weather-freshness.test.js` 同步改成手機時區。`tests/ledger-dual-track.test.js`：日圓旅程有 Suica、韓元旅程沒有、已存的清單不動。`tests/ledger-entry-settings.test.js` 沙盒補上 `defaultLedgerPayMethods`。
  - 新增 `tests/browser/beyond-japan-v170.spec.js`（3 項）：攔截 Open-Meteo，請求是 `timezone=auto`、曼谷的降雨機率依當地時間算成 40%（照舊當日本時間會變 10%）；支付方式在岡山有 Suica、韓元旅程沒有、已存清單不動、恢復預設照這趟；美金旅程的明細是 `US$12.50`／`NT$400`／優惠券 `US$0.50`，岡山仍是 `¥1,500`／`NT$315`。`weather-freshness`、`today-live-info` 的讀屏文字改成「手機取得時間 13:30」，模擬回應補上 `utc_offset_seconds`。
  - 本機完整 Chromium：401 passed，只有已知只在本機失敗的兩項（個人帳匯出下載檔名、sw-update-cache 離線 504），沒有略過的測試。
  - 反向驗證：天氣時差一律當 +09:00 時曼谷那一項失敗；支付方式預設不看旅程時 Suica 那一項失敗。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v169 的 Netlify 部署（`commit_ref` `0c4fe6b`），再往前 bump。岡山（JPY）資料與畫面不變（天氣「更新於」改跟手機時區，手機在日本時相同）。

## 2026-10-31 — v169 已上線 main（待 Bar 手機審查與 tag）

- PR [#102](https://github.com/nick80912-dev/ai-native-projects/pull/102) 在 head `141072c` 的 sanity／browser-qa 全綠後合併進 `dev`（`7cec86f`，釘住 head）；PR [#103](https://github.com/nick80912-dev/ai-native-projects/pull/103)（並帶 v168 發布紀錄 PR #101）合併 `dev` → `main`，merge commit **`0c4fe6b`**。合併 tree `b116722` 與 `141072c` 相同。本機完整 Chromium 398 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v169'`；全新 Chromium 開正式站，`APP_VERSION` 為 v169、只剩 `okayama-trip-v169` 快取，發布說明為「稅可以每趟自己設定」；快取內的 `trip-currency.js` 已有 `taxSettings`（離線可用）；岡山（沒填）＝10／8、含稅、可標免稅品，韓元沒填＝不顯示稅；簡易結算的「!」按鈕存在；沒有 pageerror。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `4e4b2f0`（v168）的部署，再往前 bump。

## 2026-10-31 — v169 稅可以每趟自己設定；簡易結算說明收進「!」（已上線 main，見上）

- **來源**：backlog #62 第二批（設計 `docs/superpowers/specs/2026-10-31-multi-country-trips.md` §3.1、§3.5；Bar 2026-10-31 裁定「稅每趟自己設定，不需要的旅程不顯示稅的選項，日本旅程維持現在的樣子」）。同一批加上 Bar 2026-10-31「簡易結算模式下的說明變成！點開的資訊顯示就好」。
- **使用上**：
  - TripConfig 新增三個選填 key：`Tax Rates`（這趟的稅率，逗號分隔、最多一位小數，例如 `10,8`；第一個是新記帳的預設；填 `0`＝不顯示稅）、`Price Mode`（`含稅` 或 `未稅`，沒填是含稅）、`Tax Free`（`yes` 才顯示「免稅品」）。三個都沒填時：日圓旅程照舊（10%／8%、含稅、可標免稅品，按鈕仍寫「税込（含稅）」「税抜（未稅）」），其他幣別不顯示稅。
  - 沒有稅率的旅程：記帳表單的「稅與優惠券」只剩「優惠券」，不顯示價格方式、稅率、品項的「免稅品」勾選、「全部免稅品」與歷史篩選的「免稅品」；存下的紀錄稅率 0、不是免稅品。
  - 有自己稅率的旅程：稅率按鈕是「無稅」＋這趟的稅率＋「自訂」，價格方式寫「含稅」「未稅」；多品項選未稅時照這趟的稅率加稅（例如泰銖未稅 ฿100、7% → ฿107.00）。編輯舊紀錄時，稅率不在這趟清單上的會以「自訂」帶入原值。
  - 簡易結算模式：面板底部的說明文字改成「轉帳建議」旁的「!」按鈕，按一下才顯示（說明一併寫清楚「不用按我已付款、別人標記付款仍可確認」）；面板重畫時維持開或關。
- **做法**：
  - `trip-currency.js` 新增 `taxSettings(cfg)` 與 `parseTaxRates`／`parsePriceMode`／`parseYesNo`（純函式）；看不懂的值略過。
  - shell：`tripTaxSettings()`、`ledgerDraftTax(draft)`；`createLedgerEntryDraft()` 把這趟的稅設定存在 `draft.tax`，預設稅率與價格方式照它；`renderLedgerTaxFields()`、`renderLedgerTaxDisclosure()`、單品項的「稅與優惠券」區塊、`renderLedgerDraftItem()` 的免稅品勾選、歷史篩選依它顯示；`ledgerTaxRateBps()` 接受這趟設定的任何稅率（舊格式 `taxMode`／`taxRate` 仍只接受 8／10）；單品項「無稅」只有在這趟可標免稅品時才記成免稅品。沒有 `draft.tax` 的舊 draft 視為日本旅程。
  - `schema.js`（與內嵌副本）新增 `taxRates`／`taxPriceMode`／`taxFree` 三個選填 key，`09_SCHEMA_MAPPING.md` 重新產生；`validator.js`（與內嵌副本）看不懂的稅設定只發警告（`CFG_TAX_RATES`／`CFG_PRICE_MODE`／`CFG_TAX_FREE`），不擋載入。Apps Script 不用改（紀錄的稅率本來就接受 0–100、一位小數）。
  - 簡易結算：`renderSimpleSettlementPanelBody()` 改用 `simpleSettlementHelpButton()`／`simpleSettlementHelpText()`／`toggleSimpleSettlementHelp()`，按鈕沿用設定頁 ⓘ 的 44px 樣式（`aria-expanded`／`aria-controls`）。
- **版本**：forward bump v168→v169；`builtin-snapshot.js` 以 v168 asset 離線重產，除版本外不變。發布說明視窗為 `v169` + `['v168','v167','v166','v165']`（v164 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v168 三件組的 hash。
- **測試**：
  - `tests/trip-currency.test.js`：岡山沒填＝10／8、含稅、可標免稅品；韓元沒填＝不顯示稅；泰銖自己設定；`0` 關掉稅；沒有稅率就沒有免稅品；第一個稅率是預設；看不懂與重複的稅率略過。`tests/atomic-sheet-sync.test.js`：正確的稅設定沒有警告，看不懂的只警告不擋。`tests/schema-types.test.js`：三個新 key 是選填。
  - 新增 `tests/browser/trip-tax-v169.spec.js`（5 項）：岡山表單不變；韓元旅程沒有稅的選項、存成稅率 0、單品項只剩優惠券、免稅篩選不生效；泰銖 7%、未稅、不能標免稅品，未稅 ฿100 存成 ฿107.00；日本旅程自己列 `8,10` 時預設 8%、舊紀錄 5% 以自訂帶入；簡易結算說明預設收起、按「!」打開、重畫後維持、再按收起、按鈕 44px。
  - 本機完整 Chromium：398 passed，只有已知只在本機失敗的兩項（個人帳匯出下載檔名、sw-update-cache 離線 504），沒有略過的測試。
  - 反向驗證：表單不看這趟的稅設定（一律當日本）時，韓元與泰銖兩項失敗；說明按了不會收起時，簡易結算一項失敗。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v168 的 Netlify 部署（`commit_ref` `4e4b2f0`），再往前 bump。岡山（JPY、沒填稅設定）資料與行為不變。

## 2026-10-31 — v168 已上線 main（待 Bar 手機審查與 tag）

- PR [#99](https://github.com/nick80912-dev/ai-native-projects/pull/99)（#62 設計＋v168）在 head `93460fe` 的 sanity／browser-qa 全綠後合併進 `dev`（`1294659`，釘住 head）；PR [#100](https://github.com/nick80912-dev/ai-native-projects/pull/100)（並帶 v167 發布紀錄 PR #98）合併 `dev` → `main`，merge commit **`4e4b2f0`**。合併 tree `f058d06` 與 `93460fe` 相同。本機完整 Chromium 393 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v168'`；全新 Chromium 開正式站，`APP_VERSION` 為 v168、只剩 `okayama-trip-v168` 快取，發布說明為「不只日本：可以設定當地幣別」；`trip-currency.js` 在快取內（離線可用）；岡山格式不變（`¥1,500`、`NT$315`），`US$12.50` 正確，沒有 pageerror。全新手機已過岡山保護期、狀態為「尚未連接」（`DB.cfg` 為空），所以顯示匯率未設定，與 v167 相同。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `afd65df`（v167）的部署，再往前 bump。

## 2026-10-31 — v168 不只日本：可以設定當地幣別（已上線 main，見上）

- **來源**：backlog #62（Bar 2026-10-31：「該專案未來不只回去日本，有可能會去其他國家，所以內容需要修正一下比方幣別切換與辨識等，不受限於日本」）。設計與裁定見 `docs/superpowers/specs/2026-10-31-multi-country-trips.md`：結算一律台幣、一趟一種當地幣別、有小數的幣別記到分；另 Bar 確認「Exchange Rate 試算表沒填的話，手機再補填當作基準」。本版是第一批（幣別基礎）；稅在 v169、天氣與文案在 v170。
- **使用上**：
  - TripConfig `Currency` 填當地幣別三碼（`KRW`、`USD`…），沒填就是 `JPY`，岡山不變。記帳表單的幣別切換顯示真正的代碼（`USD`／`TWD`），金額、列表、結算、明細都用該幣別符號（`US$12.50`、`₩12,000`）。
  - 美金、歐元這類幣別可以記到分：金額欄改用有小數點的鍵盤，計算機捨去到分；日圓、韓元、台幣照舊是整數鍵盤。
  - 試算表沒填匯率：不再擋載入與連接新旅程；記帳表單顯示「還沒設定匯率 去設定」，按了帶到「設定 → 分帳設定」，存下後照原本的分帳設定同步寫回 TripConfig，全團共用。沒有匯率時存帳會被擋下並提示「匯率未設定」。
- **做法**：
  - 新模組 `trip-currency.js`（純函式）：幣別表（名稱、符號、小數位數；JPY 名稱維持「日幣」）、`toMinor`／`toMajor`、`parseInput`（小數超過位數回 NaN，與以前一樣不接受千分位）、`inputText`、`format`（負數維持 `¥-1,500`）、當地幣與台幣互換。
  - App 內部金額一律是最小單位整數，`'JPY'`／`'TWD'` 代表「當地幣別」／「台幣」槽位：`tripLocalCurrencyCode()`、`ledgerCurrencyCodeOf()`、`ledgerCurrencyTokenOf()`。`convertLedgerAmounts()` 依小數位數換算；`formatLedgerCurrencyAmount()` 與原本寫死 `¥`／`NT$` 的 9 處改用幣別格式。
  - 邊界：`ledgerRecordForWire()`（`postLedgerRecord()` 送出前：最小單位 → 一般金額、輸入幣別 → 真正代碼）、`ledgerRecordFromSheet()`（`parseLedgerSheetCsv()`，含 fast pull）。表單：`ledgerAmountInputMinor()`／`ledgerAmountInputText()`（單筆、多品項、折扣、幣別切換、編輯帶入）、`ledgerAmountInputAttrs()`（鍵盤）、計算機 `ledgerCalculatorFloorValue(value,places)`。
  - 分帳設定：`normalizeLedgerSettings()` 把試算表的代碼對應回槽位、沒填結算幣別就是當地幣別；`postLedgerSettings()` 與 `DB.cfg` 寫真正代碼；新增 `ledgerExchangeRateMissing()`；`createLedgerEntryDraft()` 沒有匯率也能開表單；設定頁與表單文字用當地幣別（岡山仍是「1 日幣可換算多少台幣」「JPY 日幣」）。
  - 規則：`validator.js`（與內嵌副本）匯率可不填、填了要大於 0（修正：數字 0 也要擋）、`Currency` 要三碼、結算幣別是台幣或當地幣別；`trip-source.js` 連接新旅程同規則；`schema.js`（與內嵌副本）`Currency`／`Exchange Rate`／`Ledger Default Currency` 改為選填、「日幣」欄加別名「當地幣」，`09_SCHEMA_MAPPING.md` 重新產生。
  - `apps-script/ledger-sync.gs`：輸入幣別與結算幣別接受 TripConfig `Currency`（沒填是 JPY）或 TWD；「分帳紀錄」第 6 欄標題可為「日幣」或「當地幣」；金額本來就接受小數。**岡山的部署不必更新**；新旅程用這份（v170 手冊會寫步驟）。
  - 新增 runtime asset `trip-currency.js`（`runtime-assets.json`、`sw.js`、shell、README、`.ai-manifest.json`、`10_FOLDER_STRUCTURE.md`）。`03_DATABASE.md` 新增「分帳金額與幣別」；`docs/new-trip-handbook.md` 的 TripConfig 表與錯誤對照改成任何國家。
- **版本**：forward bump v167→v168；`builtin-snapshot.js` 以 v167 asset 離線重產，除版本外不變。發布說明視窗為 `v168` + `['v167','v166','v165','v164']`（v163 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v167 三件組的 hash。
- **測試**：
  - 新增 `tests/trip-currency.test.js`：日圓格式與換算與以前完全相同；美金記到分（`12.50`→1250、`12.505` 不接受、`0.1+0.2` 四捨五入到分）、US$12.50→NT$401；韓元；未列幣別。
  - 新增 `tests/browser/multi-currency-v168.spec.js`（7 項）：美金旅程記帳（`USD`／`TWD` 切換、`1 USD = NT$32`、小數鍵盤、≈ NT$400、存成 1250／400、列表 US$12.50、編輯顯示 12.50）；切到台幣再切回；送 Apps Script 是 `12.5 USD`（攔截真正的 POST）；讀回試算表換回最小單位；韓元旅程的設定文字與整數鍵盤；沒有匯率時表單可開、存帳被擋、「去設定」帶到分帳設定；岡山畫面不變。
  - `apps-script-settings`：韓元旅程的結算幣別與輸入幣別、拒絕第三種幣別、美金 12.5 照寫、「當地幣」標題、岡山不變、沒有 Currency 視為 JPY。`atomic-sheet-sync`：匯率可空、韓元旅程、第三種結算幣別被擋、Currency 要三碼。`trip-source`：同上，含沒有匯率也能連接。
  - `tests/support/currency.js`：9 個沙盒測試載入幣別 helper（沙盒沒有 Currency 就是日圓）。`ledger-entry-settings`、`ledger-entry-p0`、`schema-types` 改成新的文字與規則（仍要求岡山是「1 日幣」與數字鍵盤）。
  - 反向驗證：換算不看小數位數、送 Apps Script 不轉換、讀回不轉換、輸入一律當日圓解析、忽略當地幣別、沒有匯率就打不開表單，新測試各自抓到。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v167 的 Netlify 部署（`commit_ref` `afd65df`），再往前 bump。岡山（JPY、試算表有匯率）資料與行為不變。

## 2026-10-30 — v167 已上線 main（待 Bar 手機審查與 tag）

- PR [#96](https://github.com/nick80912-dev/ai-native-projects/pull/96) 在 head `1b09e40` 的 sanity／browser-qa 全綠後合併進 `dev`（`c5fea22`，釘住 head）；PR [#97](https://github.com/nick80912-dev/ai-native-projects/pull/97)（並帶 v166 發布紀錄 PR #95）合併 `dev` → `main`，merge commit **`afd65df`**。合併 tree `3717cb6` 與 `1b09e40` 相同。本機完整 Chromium 386 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v167'`；全新 Chromium 開正式站，`APP_VERSION` 為 v167、只剩 `okayama-trip-v167` 快取，發布說明為「記帳可以夾收據照片」；`ledger-receipts.js` 回 200 且在 v167 快取內（離線可用）；`TripLedgerReceipts` 已載入（`MAX_PHOTOS` 3），收據照片資料庫存入／列出／刪除一張測試 Blob 正常，沒有 pageerror。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `11c0330`（v166）的部署，再往前 bump。

## 2026-10-30 — v167 記帳可以夾收據照片（已上線 main，見上）

- **來源**：backlog #59（Bar 2026-10-19 裁定：照片只存在拍照的那支手機、團體帳與個人帳都可以、每筆最多 3 張）。Bar 2026-10-30 問能否從照片直接讀出日期時間與金額，選「日期時間先做，金額之後用 A（雲端 AI）」——金額另列 backlog #61。
- **使用上**：
  - 記帳表單最後多一欄「收據照片（選填，最多 3 張，只存在這支手機）」：加照片（拍照或相簿）、縮圖可點開放大、× 移除。團體帳、個人帳、單筆與多品項都有；更正收據與從採買記帳時不顯示（採買沿用自己的照片）。
  - 加照片時讀 EXIF 拍攝時間：新增的帳、日期時間還是預設值就直接帶入，並寫「已用照片的拍攝時間帶入消費時間：10/20 12:34（可以再改）」；編輯、已自己改過、或已經用過另一張照片的時間時只提示，按「改用照片時間」才換。照片沒有拍攝時間就不動。
  - 列表有照片的帳顯示「📎 收據」；點開那筆帳的明細有「收據照片」，標明「只存在這支手機」。
- **做法**：
  - 新模組 `ledger-receipts.js`（純函式）：`readExifDateTime()`（JPEG APP1 → TIFF IFD0／ExifIFD，兩種位元組順序，`DateTimeOriginal` → `DateTimeDigitized` → `DateTime`，日期不合理回 null）、`entryKey()`（`replacesRecordId || batchId || id`）、`relink()`／`forgetKeys()`／`referencedPhotoIds()`。
  - 照片存在獨立的 IndexedDB `trip-receipt-media/receipt-photos`：`shopping-photo-store.js` 的 `createIndexedDbDriver(indexedDB,names)` 與 `createStore({idPrefix})` 多了選填參數（不給就是採買照片，行為不變）。不升 `trip-local-media` 的版本，舊分頁不會被擋，採買照片的孤兒清理也碰不到收據。
  - 連結存在 `trip_ledger_receipts`（綁 `sourceKey`）。`commitLedgerEntrySave()` 存檔成功後 `linkLedgerReceiptsAfterSave()`：用實際存下的紀錄算新的對應鍵（`persistLedgerEditedRecords()` 回傳 `savedRecords`；團體帳編輯會產生新紀錄），舊的對應鍵拿掉。
  - 清理 `sweepLedgerReceiptPhotos()`：只刪沒有任何帳、也不在目前表單上的照片；照片處理中不清理；連結讀取失敗時不清理。存檔後、關掉表單後、本機刪掉那筆帳（`forgetLedgerReceiptsFor()`，個人帳單筆／多筆、團體帳刪除）後執行。
  - 清除旅程（`TripLifecycleFlow` 的 `photoStore`）與連接新旅程（`clearPhotos`）改用 `localMediaStore()`，採買與收據照片一起清。
  - 新增 runtime asset `ledger-receipts.js`：`runtime-assets.json`、`sw.js` 預快取、`shell/v167/index.html`、README、`.ai-manifest.json`、`10_FOLDER_STRUCTURE.md`。規則寫進 `03_DATABASE.md`「分帳收據照片本機資料規則」。
- **版本**：forward bump v166→v167；`builtin-snapshot.js` 以 v166 asset 離線重產，除版本外不變。發布說明視窗為 `v167` + `['v166','v165','v164','v163']`（v162 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v166 三件組的 hash。
- **測試**：
  - 新增 `tests/ledger-receipts.test.js`：EXIF 兩種位元組順序、DateTime 備援、不是 JPEG／沒有 EXIF／相機時間空白／不可能的日期／截斷的區段都回 null 不丟錯；對應鍵；連結表最多 3 張、編輯搬鍵、全部移除就拿掉連結；收據用獨立資料庫。
  - 新增 `tests/browser/receipt-photos-v167.spec.js`（7 項，照片是頁面上畫出來的 JPEG 再插入 EXIF）：個人帳帶入拍攝時間、存檔後列表「📎 收據」、明細縮圖、重開 App 還在、點開放大、不進個人備份；團體帳 3 張上限、第二張只提示時間、按「改用照片時間」、照片不跟著團體帳上傳、團體帳編輯後照片跟著新紀錄；320px 不溢出；編輯移除一張後只剩一張、刪掉帳照片也刪；沒存就關表單照片刪掉、沒有拍攝時間不動日期；自己改過的日期不被蓋掉；清除本機媒體連收據一起清。
  - 反向驗證：拿掉存檔後的連結、拿掉關表單的清理、改成一律覆蓋時間、清除時不清收據、刪帳不放照片，各自被抓到。團體帳編輯不回傳 `savedRecords` 這一項沒被抓到：編輯表單本來就帶 `replacesRecordId=第一筆 id`，與團體帳編輯指回的 id 在實務上相同；保留 `savedRecords` 是為了一定以實際存下的紀錄為準。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v166 的 Netlify 部署（`commit_ref` `11c0330`），再往前 bump。舊版不讀 `trip_ledger_receipts` 與收據資料庫，帳本本身不受影響；照片在清除旅程時一起清掉。

## 2026-10-30 — v166 已上線 main（待 Bar 手機審查與 tag）

- PR [#93](https://github.com/nick80912-dev/ai-native-projects/pull/93) 在 head `5c1a503` 的 sanity／browser-qa 全綠後合併進 `dev`（`bb74c2a`，釘住 head）；PR [#94](https://github.com/nick80912-dev/ai-native-projects/pull/94)（並帶 v165 發布紀錄 PR #92）合併 `dev` → `main`，merge commit **`11c0330`**。合併 tree `95e2868` 與 `5c1a503` 相同。本機完整 Chromium 379 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v166'`；全新 Chromium 開正式站，`APP_VERSION` 為 v166、只剩 `okayama-trip-v166` 快取，發布說明為「沒有網路時也看得到剛記的團體帳」；線上 `shell/v166/index.html` 含 `restoreLedgerFastPullReadback`。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `db2c02a`（v165）的部署，再往前 bump。

## 2026-10-30 — v166 沒有網路時也看得到剛記的團體帳（已上線 main，見上）

- **來源**：Bar 2026-10-30「繼續進行下一批」：出發前稽核 #57 中優先 **B1 剩下的情況**。v156 讓 fast pull 讀回、但公開 CSV（延遲 1–5 分鐘）還沒有的列留在記憶體（`ledgerFastPullReadback`），同步後不再消失；但在 CSV 追上前關掉 App、在沒有網路的地方重開，這筆帳要等連上網路才回來（交付橋接在讀回當下就清掉了，本機快照也還沒有它）。
- **做法**：
  - 讀回的列同時存進本機 `trip_ledger_readback`（`{version:1,sourceKey,records}`，綁目前旅程）：`ledgerFastPull()` 讀回新列時、`carryLedgerFastPullReadback()` 因 CSV 追上而移除時都寫回；清空時移除這個 key。
  - 開 App 時 `bootLocal()` 裝好本機快照後呼叫 `restoreLedgerFastPullReadback(DB)`：只取同一趟旅程（`sourceKey` 相同）的列，CSV 已有的略過，其餘補進帳本與結算；接著寫回，CSV 已追上或別趟旅程留下的就此清掉。
  - 刻意**不**沿用交付橋接：橋接非空會讓 fast pull 持續輪詢、清除旅程預檢會當成待送而擋下，而且讀回也包含別人記的帳。這份資料伺服器上已有，所以不算待送、不進個人備份（備份是明列欄位）、清除旅程時隨其他 `trip_*` 一起清掉（`TripLifecycle.clearKeys()`）。
  - 寫入失敗只記 AppLog，畫面上的帳不受影響（連上網路後照舊由 CSV 或 fast pull 補回）。
- **版本**：forward bump v165→v166；`builtin-snapshot.js` 以 v165 asset 離線重產，除版本外不變。發布說明視窗為 `v166` + `['v165','v164','v163','v162']`（v161 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v165 三件組的 hash。
- **測試**：
  - 新增 `tests/browser/offline-readback-v166.spec.js`（4 項）：線上送出並讀回後（橋接 0、CSV 沒有、本機存了這筆），在沒有網路時重開，帳本有這筆、餘額 ¥1,500、團體帳列表看得到「晚餐」；CSV 追上後本機副本移除、重開後仍只有一筆；本機副本不算待送、不在個人備份；別趟旅程留下的副本不套用並被移除。
  - 反向驗證：拿掉開 App 時的補回、拿掉讀回時的寫入、拿掉 CSV 追上時的寫回、拿掉旅程比對，新測試各自抓到。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v165 的 Netlify 部署（`commit_ref` `db2c02a`），再往前 bump。舊版不讀 `trip_ledger_readback`，留著的 key 會在清除旅程時清掉，不影響任何資料。

## 2026-10-30 — v165 已上線 main（待 Bar 手機審查與 tag）

- PR [#90](https://github.com/nick80912-dev/ai-native-projects/pull/90)（v165，並帶 v164 發布紀錄）在 head `ad3c0af` 的 sanity／browser-qa 全綠後合併進 `dev`（`d0866a0`，釘住 head）；PR [#91](https://github.com/nick80912-dev/ai-native-projects/pull/91) 合併 `dev` → `main`，merge commit **`db2c02a`**。合併 tree `c3018a6` 與 `ad3c0af` 相同。本機完整 Chromium 375 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v165'`；全新 Chromium 開正式站，`APP_VERSION` 為 v165、只剩 `okayama-trip-v165` 快取，發布說明為「時間改回跟手機時區」。另以**台灣時區**的全新 Chromium 開正式站：App 時鐘 22:16，等於手機（台灣）時鐘，當下日本是 23:16；`tripNow` 不存在。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `023a229`（v164）的部署，再往前 bump。

## 2026-10-30 — v165 時間改回跟手機時區（已上線 main，見上）

- **來源**：Bar 2026-10-30 看過 v164 後指示：「時區不要一律指定時區，因為不一定都是去日本」。問過三種做法（行程設定填時區、一律跟手機時區、依目的地自動判斷）後，Bar 選**一律跟手機時區**。
- **做法**：`shell/v165/index.html` 的時間邏輯回到 v163（`appNow()` 的欄位直接當手機時間讀）：移除 v164 的 `TRIP_UTC_OFFSET_MINUTES`、`tripWallDate()`、`tripInstantFromWall()`、`tripWallTextInstant()`、`tripNow()`，今天、下一站、出發倒數、旅程結束、最後一天的午夜計時、時間模擬，以及記帳的預設日期時間、日曆「今天」、`ledgerLocalDateKey()`、`ledgerOccurrenceIso()`、`formatLedgerLocalOccurrence()` 都回到 v163 的寫法。`appNow()` 上方加註這個裁定。與 v164 的差異只有這些時間邏輯、版本標記與發布說明。
- **使用上**：出國時手機時區要設為「自動」，到當地就會換成當地時間。手機留在台灣時間時，會像 v163 以前一樣慢一小時（日本）。
- **資料**：紀錄存的一直是真正的時間點（UTC ISO），v164 期間記的帳不需要轉換；只是顯示改回依各自手機的時區。
- **版本**：forward bump v164→v165；`builtin-snapshot.js` 以 v164 asset 離線重產，除版本外不變。發布說明視窗為 `v165` + `['v164','v163','v162','v161']`（v160 滾出；v164「時間一律用日本時間」保留在視窗內，是已發布的紀錄）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v164 三件組的 hash。
- **測試**：
  - 12 個沙盒測試、`ledger-225`、`app-now`、`preview-date` 回到 v164 之前的版本；移除 `tests/support/trip-time.js`、`tests/trip-time-zone.test.js`、`tests/browser/trip-time-zone-v164.spec.js`。
  - 新增 `tests/browser/phone-time-zone-v165.spec.js`（3 項）鎖住裁定：同一個時間點（台灣 10/22 23:30），手機設在台灣看到 10/22 23:30、設在日本看到 10/23 00:30；新帳預設手機的日期時間並存成正確時間點；App 不再有 `tripNow`。
  - `playwright.config.js` 保留預設 `timezoneId:'Asia/Tokyo'`（手機在日本，這趟旅途的實際情況），測試時間才不會隨 CI runner（UTC）偏 9 小時。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v164 的 Netlify 部署（`commit_ref` `023a229`），再往前 bump。不影響任何資料。

## 2026-10-30 — v164 已上線 main（待 Bar 手機審查與 tag）

- PR [#88](https://github.com/nick80912-dev/ai-native-projects/pull/88)（v164 與 backlog #54 CI 解除釘版）在 head `0ebe1ad` 的 sanity／browser-qa（`ubuntu-latest`）全綠後合併進 `dev`（`4b11589`，釘住 head）；PR [#89](https://github.com/nick80912-dev/ai-native-projects/pull/89) 合併 `dev` → `main`，merge commit **`023a229`**。合併 tree `67065ec` 與 `0ebe1ad` 相同。本機完整 Chromium 377 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v164'`；全新 Chromium 開正式站，`APP_VERSION` 為 v164、只剩 `okayama-trip-v164` 快取，發布說明為「時間一律用日本時間」。另以**台灣時區**的全新 Chromium 開正式站：手機時鐘 21:46、App 時鐘 22:46，等於當下日本時間。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `af2625c`（v163）的部署，再往前 bump。

## 2026-10-30 — v164 行程與記帳時間一律用日本時間（已上線 main，見上）

- **來源**：Bar 2026-10-30「繼續進行下一批」：出發前稽核 #57 中優先「時間改依旅程時區」。日本使用檢查時發現，App 用手機的時區：手機留在台灣時間時，在日本 10/20 08:30 仍顯示「出發」前的狀態（慢一小時），10/23 剛過日本午夜仍算成 10/22；記帳的預設時間也慢一小時，兩支手機看到同一筆帳的時間不一樣。
- **做法**：新增 `tripWallDate()`（真正的時間點 → 旅程時區的牆上時間，只讀欄位）、`tripInstantFromWall()`（牆上時間 → 真正的時間點）、`tripWallTextInstant()`（沒寫時區的 `YYYY-MM-DDTHH:MM` 當成日本時間）與 `tripNow()`。目前只支援日本（ADR 0021），Asia/Tokyo 沒有夏令時間，固定 UTC+9（`TRIP_UTC_OFFSET_MINUTES=540`）。`appNow()` 仍回傳真正的時間點，時間戳（`toISOString()`、`getTime()`）不受影響。
- **改依日本時間的地方**：
  - 行程：`todayMD()`（今天是第幾天）、`currentMinutes()`（下一站）、`daysUntilStart()`（出發倒數）、`tripHasEnded()`、最後一天的午夜計時（`scheduleHomeTripEnd()` 等到日本午夜）。
  - 時間模擬：診斷面板的模擬時間輸入框與 `previewDate` 當成日本時間；狀態列顯示「（日本時間）」。
  - 記帳：新帳的預設日期與時間、日曆的「今天」、「今天」標籤、`ledgerLocalDateKey()`（今天花費與日期分組）、`ledgerOccurrenceIso()`（輸入的日期時間存成真正的時間點）、`formatLedgerLocalOccurrence()`（消費時間顯示，含採買完成時間）、編輯舊帳時帶入的日期時間。
- **刻意不改**：診斷面板、旅途紀錄、同步時間、雲端紀錄建立時間、照片檢查時間仍用手機時區（v152／v153 的決定：記的是這支手機發生的事）。天氣原本就以日本時間解讀 Open-Meteo 的每小時資料。
- **資料**：既有紀錄存的是真正的時間點（UTC ISO），不需要轉換。旅途中大家的手機都在日本時間，記下的時間不變；手機留在台灣時間記的帳，顯示會改成日本時間（快一小時，也就是當時日本的實際時間）。
- **版本**：forward bump v163→v164；`builtin-snapshot.js` 以 v163 asset 離線重產，除版本外不變。發布說明視窗為 `v164` + `['v163','v162','v161','v160']`（v159 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v163 三件組的 hash。
- **測試**：
  - 新增 `tests/trip-time-zone.test.js`：同一組時間點在台灣、UTC、洛杉磯（有夏令時間）與日本的手機時區下，今天、現在幾點、出發倒數、旅程結束、記帳日期時間的存與讀都得到一樣的日本時間答案；診斷、旅途紀錄、同步時間仍維持手機時區。
  - 新增 `tests/browser/trip-time-zone-v164.spec.js`（瀏覽器設在台灣時區，5 項）：日本午夜後是最後一天／已結束、新帳預設日本日期時間並存成正確時間點、日本午夜附近的帳算在日本日期、模擬時間輸入當日本時間。
  - `tests/support/trip-time.js`：沙盒測試用手機本地時間建構 Date 代表「手機時間」，改以「手機設在日本時間」執行（實際旅途的情況），並載入 App 原文的時區 helper；12 個沙盒測試接上。`ledger-225` 的「最新日期」資料改用日本時間（原本 +08:00 的 23:00 在日本已是隔天）。
  - `playwright.config.js` 預設 `timezoneId:'Asia/Tokyo'`（手機在日本）；CI runner 是 UTC，原本沒寫時區的測試時間會被讀成日本時間差 9 小時。
  - 反向驗證：`todayMD`、`currentMinutes`、`tripHasEnded`、`ledgerOccurrenceIso`、`ledgerLocalDateKey`、`formatLedgerLocalOccurrence` 各自改回手機時區，新測試都抓到。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v163 的 Netlify 部署（`commit_ref` `af2625c`），再往前 bump。不影響任何資料。

## 2026-10-30 — v160–v163 已上線 main（待 Bar 手機審查與 tag）

- **v163**：PR [#85](https://github.com/nick80912-dev/ai-native-projects/pull/85) 第一輪 CI（head `ad89110`）抓到兩個真問題：「恢復預設」按鈕低於 36px 觸控高度；`settings-grouped-root.spec.js` 的捲動測試因同檔前一項失敗而沒跑到，修好後才發現它碰到 L4 新增的刪除確認。`7044924` 補 `min-height:44px` 並讓測試接受確認、核對文字；sanity／browser-qa 全綠後合併進 `dev`（`db233ff`，釘住 head）；PR [#86](https://github.com/nick80912-dev/ai-native-projects/pull/86) 合併 `dev` → `main`，merge commit **`af2625c`**。合併 tree `9371d55` 與 `7044924` 相同。本機完整 Chromium 除已知只在本機失敗的兩項外全過（`settings-grouped-root.spec.js` 修正後 7/7）。
- **v162**：PR [#83](https://github.com/nick80912-dev/ai-native-projects/pull/83) → `dev`（`ca4bae8`）；PR [#84](https://github.com/nick80912-dev/ai-native-projects/pull/84) → `main`，merge commit **`460a0f5`**。
- **v161**：PR [#81](https://github.com/nick80912-dev/ai-native-projects/pull/81) → `dev`（`3bc9f2a`）；PR [#82](https://github.com/nick80912-dev/ai-native-projects/pull/82) → `main`，merge commit **`a9e27c9`**。
- **v160**：PR [#79](https://github.com/nick80912-dev/ai-native-projects/pull/79) → `dev`（`506304d`）；PR [#80](https://github.com/nick80912-dev/ai-native-projects/pull/80) → `main`，merge commit **`3c27c22`**。
- 每版合併前都核對 `main`＋`dev` 的合併 tree 與 CI 驗過的 head 相同。
- **線上核對（v163）**：正式站 `sw.js` 為 `SW_VERSION='v163'`；全新 Chromium 開正式站，`APP_VERSION` 為 v163、只剩 `okayama-trip-v163` 快取，發布說明為「下一站與記帳小修正」。v160–v162 發布當下各自以同樣方式核對過。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `460a0f5`（v162）的部署，再往前 bump。

## 2026-10-30 — v163 下一站順序、採買記帳身分、記帳選項、簡易結算、個人帳身分標示（已上線 main，見上）

- **來源**：Bar 2026-10-30「繼續進行下一批」：出發前稽核 #57 的中優先項目 T1、T7、L4、L5、L6、L7。
- **T1**：`trip-progression.js` 選下一站時，沒有時間的站沿用前一個有時間的站的時間；沿用的時間已到的沒有時間的站，照行程順序優先。原本只找「第一個還沒到時間的有時間站」，10/22 倉敷完成 9:00 阿智神社後直接跳到 15:50 常春藤廣場。自動略過仍只看真正寫了時間的站。以真實 10/22 資料驗證：阿智神社 → 倉敷美觀地區 → 林源十郎商店 → 倉敷丹寧街。
- **T7**：採買清單的「記帳」（卡片、多選、已買批次）先檢查身分；沒有身分時在清單上方叫出可以取消的選擇器（`.over-settings`），記住這次動作（`pendingActionAfterMember`），選好身分後接著開記帳表單；取消就什麼都不變（多選的待買不會先被標成已買）。
- **L4**：記帳類別與支付方式至少保留一項；刪除前確認（「刪除「X」？已用過它的舊紀錄仍會保留這個名稱。」）；編輯頁加「恢復預設」，只加回缺少的預設、保留自訂項目。
- **L5**：編輯／更正時，紀錄原本的類別與支付方式加進這張表單的選項（`legacyCategories`／`legacyPayMethods` 與 `ledgerDraftOptions()`），已刪除的選項不再讓舊紀錄存不了；新增表單不受影響。設定頁說明改為「刪除後，已用過它的舊紀錄仍保留原本的名稱，編輯舊紀錄時也還能沿用」。
- **L6**：簡易結算模式在面板上方列出「需要你確認」的結清（確認已收／退回），與分頁徽章一致；設定列補一行說明。
- **L7**：個人帳列表中其他身分記的帳加「Amy 的帳」小標，列表上方說明「另有 N 筆是其他身分（Amy）記的個人帳，未計入上面的花費」。
- **版本**：forward bump v162→v163；`builtin-snapshot.js` 以 v162 asset 離線重產，除版本外不變。發布說明視窗為 `v163` + `['v162','v161','v160','v159']`（v158 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v162 三件組的 hash。
- **測試**：新增 `tests/browser/medium-fixes-v163.spec.js`（7 項，T1 用真實 10/22 資料）；`trip-progression.test.js` 加入倉敷情境；`ledger-entry-settings.test.js` 加入保留最後一項、取消確認、恢復預設；`ledger-225`、`ledger-form-223` 的沙盒載入新的 helper。反向驗證（T1 改回只看有時間的站、L4 拿掉保留一項、L5 拿掉舊值選項）各自被測試抓到。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v162 的 Netlify 部署（`commit_ref` `460a0f5`），再往前 bump。不影響任何資料。

## 2026-10-30 — v162 付款人選單不再重複跳出（已上線 main，見上）

- **來源**：Bar 2026-10-30 回報：「當團體分帳選擇付款人時會跳出視窗，但點選完付款人後視窗還是會再次跳出」。
- **原因**：`setLedgerDraftPayer()` 一選就整張記帳表單重畫（`withLedgerSheetPosition(renderLedgerEntrySheet)`），重畫後把焦點還給 id 相同的「新」付款人選單；手機上對 `<select>` 呼叫 `focus()` 會再打開一次選擇器。桌面瀏覽器測試（`selectOption` 不會先聚焦選單）因此沒抓到；先聚焦再選就重現（`focusin` 落在新選單）。
- **修正**：付款人只影響選單下面那行說明，所以改成只更新 `.ledger-payer-note` 的文字（`ledgerPayerNoteText()`），選單不重建、焦點不動。另外 `withLedgerSheetPosition()` 與 `withShoppingSplitFocus()` 重畫後不再把焦點還給任何 `<select>`，避免其他下拉選單出現同樣問題。
- **版本**：forward bump v161→v162；`builtin-snapshot.js` 以 v161 asset 離線重產，除版本外不變。發布說明視窗為 `v162` + `['v161','v160','v159','v158']`（v157 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v161 三件組的 hash。
- **測試**：新增 `tests/browser/payer-select-v162.spec.js`（2 項：先聚焦再選付款人，選單是同一個元素、沒有被程式重新聚焦、說明文字更新；之後重畫仍保留付款人且不聚焦選單，存檔為付款人＋「〔Bar 代記〕」）。換回舊寫法時兩項都失敗。`proxy-recording-v157`、`pretrip-fixes-v156`、`shop-interaction` 一併通過。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v161 的 Netlify 部署（`commit_ref` `a9e27c9`），再往前 bump。不影響任何資料。

## 2026-10-30 — v161 還原對話框、還原前確認、分帳設定橋接（已上線 main，見上）

- **來源**：回程後第二批（Bar 2026-10-30「繼續進行 v161」），出發前稽核的 B2、L1、L2。
- **L1**：「從 JSON 還原」與剪貼簿失敗時的「手動複製備份」對話框加 `.over-settings`（z 180），不再被設定頁（170）蓋住。原本 `.over-settings` 被後面的 `.state-dialog-overlay{z-index:140}` 蓋過，所以另加 `.state-dialog-overlay.over-settings`；新瀏覽器測試第一次跑就抓到這點。
- **L2**：還原前比對 id：目前待送佇列裡有備份沒有的團體帳時直接拒絕（`alert`：「還有 n 筆團體帳尚未送出，還原會刪掉它們。請連上網路，等它們送出後再還原。」），因為那些帳全團都找不回來；否則一律先 `confirm`，列出會消失的個人帳、採買項目與旅途紀錄筆數，取消就什麼都不寫。
- **B2**：分帳設定橋接加 `savedAt`。發布值與本機值不同時只在 10 分鐘寬限期內保留（CSV 發布落後 1–5 分鐘）；超過寬限期、或舊版沒有時間的橋接，一律以雲端發布值為準並移除（AppLog 記下本機與雲端的值）。清除旅程預檢先用剛下載的設定整理橋接，過期的本機值不再造成 `pending-bridge`。設定頁「帳務」在上次修改未確認送達時說明「連上網路後請再按一次儲存；10 分鐘內沒有同步，會改用雲端的設定」。
- **版本**：forward bump v160→v161；`builtin-snapshot.js` 以 v160 asset 離線重產，除版本外不變。發布說明視窗為 `v161` + `['v160','v159','v158','v157']`（v156 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v160 三件組的 hash。
- **測試**：新增 `tests/browser/restore-and-settings-v161.spec.js`（7 項）；`ledger-entry-settings.test.js` 加入寬限期、過期、舊版橋接、未確認、預檢傳入設定五種情況；`settings-backup-ux.test.js` 改讀實際佇列，並加入取消不寫入、確認文字、未送出團體帳被拒。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v160 的 Netlify 部署（`commit_ref` `3c27c22`），再往前 bump。不影響任何資料。

## 2026-10-30 — v160 收款人直接結清、退回後用目前金額、結束後先提醒結清（已上線 main，見上）

- **來源**：Bar 2026-10-30 回程，要求開始修正並包含之前的規劃；全團還沒結清、也還沒清除旅程，所以先做結清相關（Bar 選「每批一版，逐版手機審查」）。
- **#60 收款人直接結清**（Bar 2026-10-30 裁定：按轉帳建議那一列、分「已收到」「不用付了」、花費統計不變）：
  - 團體結算「需要你處理」多一種「應收」列（排在「待你付款」之後），按「結清…」選「已收到」（對方已用現金等方式付過）或「不用付了」（免收）。對方已按「我已付款」時不出現，改走原本的「確認已收」。
  - 沿用 ADR 0007 握手，一次寫兩筆：以欠款者為 `member` 的 `settlement_claim`（備註尾端「〔收款人 代記〕」，免收時前面加「免收」），緊接收款人的 `settlement_confirm`（時間晚 1 毫秒）。不改試算表欄位與 Apps Script。送出前以當下事件流重判金額與是否已有請款。
  - 結清紀錄的 chip 寫「已收到」「免收」（未讀回時加「・同步中」），一般流程仍是「已完成」。「我的總花費」照原本分攤算。
  - 10 秒復原：撤回那筆代記的 claim（撤回優先於確認）。一般刪除只允許 member 本人，這裡另外限定「收款人就是代記的人」才放行。
  - 新增 `appendSettlementRecords()` 依序送出多筆；原本單筆的 `appendSettlementRecord()` 不變。
- **B3**：結清被退回後重新標記改用目前的轉帳建議金額；與原本不同時先確認「原本標記 ¥5,000，目前應付 ¥6,000」。目前沒有對應的轉帳建議時不送出，請使用者看計算明細。
- **T14**：旅程結束後首頁在還沒結清時寫「你還有應收／應付 …。清除前請先在分帳結清。」（或「還有 n 筆結清等你處理」「團體還有人沒結清」），並在按鈕列最前面加「前往分帳」。設定根頁入口由「備份、還原與版本資訊」改名「資料與版本」（與頁面標題、換旅程手冊一致），副標「備份、還原、清除旅程」。
- **T5**：清除預檢被擋時，原因改用白話（例：「還有團體帳尚未上傳，請連上網路等它送出」「團體帳還沒結清，請先到分帳完成結算」），不再重複「無法清除：」也不顯示英文代碼；未結清或有待確認結清時附「前往分帳」。
- **T6**：清除流程的兩段說明拿掉過時的「此版本無法連接新旅程」，改寫「清除後可在首頁按『連接新旅程』接下一趟」。
- **測試日期**：真實日期已過旅程結束日（10/24 起），首頁多了同名的「清除並打包旅程」按鈕；`trip-lifecycle.spec.js`、`settings-health-page.spec.js` 改為只在設定頁找這顆按鈕（PR #79 的 CI 因此失敗，與該 PR 的文件變更無關）。
- **版本**：forward bump v159→v160；`builtin-snapshot.js` 以 v159 asset 離線重產，除版本外不變。發布說明視窗為 `v160` + `['v159','v158','v157','v156']`（v155 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v159 三件組的 hash。
- **測試**：新增 `tests/receiver-settlement-v160.test.js` 與 `tests/browser/settlement-receiver-v160.spec.js`（10 項）；`ledger-settlement-reliability.test.js` 排序加入「應收」；`home-simplification.test.js`、`settings-grouped-root`、`past-trips`、`settings-health-page` 跟著改名與新按鈕更新。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回上一個 Netlify 部署（v159，`commit_ref` `6ae06f2`），再往前 bump。新寫入的收款人結清紀錄是標準的 claim／confirm，舊版也能正確計算餘額，只是不會顯示「已收到／免收」。

## 2026-10-16 — 收斂：出發前最後一版為 v159

- **來源**：Bar 2026-10-16 指示「收斂該專案」。
- `tasks/current.md` 改寫為只寫現況（線上版本、待 Bar 手機審查與 tag、旅途中原則與已知替代做法、回程後順序）；原本累積的歷史段落原文移到 `tasks/done.md` 檔尾「封存」一節。
- `16_OPS_PLAYBOOK.md` §A5 的錨點改寫為現況：正式站 v159，最新已建立的 tag 仍是 `production-v156`。
- 旅途中不再加功能；只在影響使用時依 §A2 forward bump 到 v160。只改文件，不動程式。

## 2026-10-16 — v159 已上線 main（待 Bar 手機審查與 tag）

- PR [#76](https://github.com/nick80912-dev/ai-native-projects/pull/76) 的 sanity／browser-qa 在 head `d275390` 全綠後合併進 `dev`（`091a291`，釘住 head）；PR [#77](https://github.com/nick80912-dev/ai-native-projects/pull/77) 合併 `dev` → `main`，merge commit **`6ae06f2`**。`main`＋`dev` 的合併 tree `a324605` 與 `d275390` 相同。
- 本機完整 Chromium（`d275390`）346/348，兩項為已知只在本機失敗的項目。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v159'`、`shell/v159/app-version.js` 為 v159；全新 Chromium 開正式站，`APP_VERSION` 為 v159、只剩 `okayama-trip-v159` 快取。Netlify deploy ID 未另查。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `17c609c`（v158）的部署，再往前 bump。

## 2026-10-16 — v158 已上線 main（待 Bar 手機審查與 tag）

- PR [#74](https://github.com/nick80912-dev/ai-native-projects/pull/74) 的 sanity／browser-qa 在 head `bc955ed` 全綠後合併進 `dev`（`3e11707`）；PR [#75](https://github.com/nick80912-dev/ai-native-projects/pull/75) 合併 `dev` → `main`，merge commit **`17c609c`**。合併 tree `2fdd8b0` 與 `bc955ed` 相同。
- **線上核對**：正式站 `sw.js` 與 `shell/v158/app-version.js` 皆 v158；全新 Chromium 只剩 `okayama-trip-v158` 快取。

## 2026-10-16 — v157 已上線 main（待 Bar 手機審查與 tag）

- PR [#72](https://github.com/nick80912-dev/ai-native-projects/pull/72) 合併進 `dev`（`fce1e93`）；PR [#73](https://github.com/nick80912-dev/ai-native-projects/pull/73) 合併 `dev` → `main`，merge commit **`63f9bde`**，合併 tree 與 CI 驗過的 `5a607d3` 相同。
- Netlify deploy `6ad1a693`，`commit_ref` = `63f9bde`；全新 Chromium 顯示 v157、只剩 `okayama-trip-v157` 快取，`shell/v153` 與 `icon-120` 回 404。

## 2026-10-16 — v159 診斷面板拿掉旅途紀錄入口（已上線 main，見上）

- **來源**：Bar 2026-10-16：「診斷面板內的旅途紀錄可以拿掉，旅途紀錄靠設定內就好」。
- **變更**：診斷面板（進行中旅程時）不再顯示「旅途紀錄」入口列；旅途紀錄只從「設定 → 資料 → 旅途紀錄」進入。刪除 `renderDiagnosticTravelNotesLink`、`openTravelNotesFromDiagnostics` 與 `.diag-link-row` 樣式。旅途紀錄的資料、設定頁畫面、除錯報告與測試工具都不變。
- **版本**：forward bump v158→v159；`builtin-snapshot.js` 以 v158 asset 離線重產，除版本外不變。發布說明視窗為 `v159` + `['v158','v157','v156','v155']`（v154 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v158 三件組的 hash。
- **測試**：`diagnostics-app-log.test.js`、`travel-notes.test.js` 改為斷言面板沒有旅途紀錄入口；瀏覽器 `diagnostics-app-log.spec.js` 的旅途紀錄測試改從設定進入，並確認進行中旅程的面板（有測試工具）不含「旅途紀錄」。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回上一個 Netlify 部署（v158），再往前 bump。不影響任何資料。

## 2026-10-16 — v158 串點卡資訊、站數一致、購物三項小修（已上線 main，見上）

- **來源**：Bar 2026-10-16 問還有沒有要修的（例如購物分頁），從出發前稽核再選 T4、T9、T16、T17、T10 出發前做。
- **T4 同區串點卡**：子站也顯示一般下一站卡的資訊——類別標籤、停車、營業、「其他資訊」（付款／提醒）與官網、樓層、時刻表按鈕。卡片上半部可點開目前這一站的完整行程（鍵盤 Enter／Space 亦可）；展開鈕與子站清單放在可點區之外，展開不會跳頁。例：10/18 永旺顯示停車與四種營業時間、官網、樓層；10/19 嚴島神社顯示營業與官網。
- **T10 站數一致**：今天頁上方「已處理 x/y」、下方「今日還有 n 個行程」與行程頁「完成 · 略過 / 共」都以行程頁的每一列算一站（串點子站各算一站，`todayStopCounts`）。上方的數字在串點子站的自動略過寫入之後才算。例：10/22 10:00 為 2/11、還有 8、共 11。
- **T9**：採買清單內的「記帳」（卡片、多選、已買批次）都保留清單，關掉或存好記帳後回到原本的頁籤。原本只有從明細頁進入才保留。
- **T17**：數量大於 1 的待買卡上「部分購買」改成次要樣式（淡色、無底色、一般粗細），不再比左側勾選更搶眼；部分購買表單一打開不顯示紅字，輸入過數量或按「拆成兩筆」才檢查。
- **T16**：某商場還沒有想逛店家時，留一個同高的虛線提示框「⭐ 想逛店家：0 家 · 勾選下方店家加入」，第一次勾選時下面的清單不再往下跳；「想逛店家」整塊（至少 44px 高）都可以點，原本只有 18px 高的文字列。
- **版本**：forward bump v157→v158；`builtin-snapshot.js` 以 v157 asset 離線重產，除版本外不變。發布說明視窗為 `v158` + `['v157','v156','v155','v154']`（v153 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布的 v157 三件組 hash。
- **測試**：新增 `tests/browser/pretrip-polish-v158.spec.js`（9 項：串點卡資訊與上半部開行程、鍵盤開啟、兩個時間點的三處站數、卡片記帳後回到清單、部分購買次要樣式與延後檢查、輸入後清空才出現紅字）；`shop-interaction.spec.js` 改測第一次勾選時列不移動、提示框與想逛框同高、標題至少 44px；`buy-to-ledger.spec.js`、`render-note.test.js`、`home-simplification.test.js`、`theme-system.test.js` 跟著更新；`home-v146.spec.js` 的「全部略過」站數由 6/6 改為 7/7（10/18 共 7 列，原本整區串點只算一站）。
- **完整本機 Chromium（`cfb0713`）**：345/348。一項是上述 6/6→7/7 的寫死站數（PR CI 也抓到，已在下一個提交更新，該檔重跑 20/20），另兩項是已知只在本機失敗的（匯出下載檔名、離線未快取子資源 504）。
- **反向驗證**（各自被測試抓到）：串點卡不顯示停車／營業、上半部不可點、上方改回舊站數、卡片記帳關掉清單、表單一打開就顯示紅字、拿掉想逛提示框。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回上一個 Netlify 部署（v157），再往前 bump。不影響任何資料。

## 2026-10-16 — v157 代記團體帳、採買記帳取消、行程「現在」對齊今天頁，並清理舊檔（已上線 main，見上）

- **來源**：Bar 2026-10-16 看完出發前稽核後，要求出發前再做五項：採買多選記帳取消（T8）、切換身分與代記帳（L7／L8 後續）、行程頁「現在」（T2）、刪除指定的舊內容、修正高／中優先的過時文件。
- **團體帳代記（Bar 選「表單直接選付款人」「寫在備註裡」「算進付款人的花費、不重複列」）**：
  - 新增團體帳時，「付款人：」改成下拉選單，預設是你；選了別人後下面小字寫「會標示『Bar 代記』，之後由 Amy 修改」。只有一位成員時選單停用。編輯與更正不能改付款人。
  - 存檔時 `record.member` 是選的付款人；記錄的人寫在備註尾端「〔Bar 代記〕」（`ledgerNoteWithProxyRecorder`），不改試算表欄位與 Apps Script。付款人必須是目前正式成員，否則跳出錯誤。
  - 團體帳列表與多品項卡顯示「Bar 代記」小標。代記的人自己不在分攤裡時，這筆仍列在他的團體帳列表，但不算進他的「與我相關」金額。
  - 付款人那邊照現有規則：只算她分到的份額，「我的總花費」明細寫「你付（Bar 代記）」。代記的人的個人帳不會有這筆。
  - 之後只有付款人本人能修改或刪除（與其他團體帳相同）。
- **採買多選記帳取消（T8）**：待買頁多選「記帳」會先把待買項目標成已買再開表單；現在沒存檔就按 × 關掉時，這一批移回待買並提示「已取消記帳，N 項移回待買」。原本就已買的不動；存檔成功後照舊。
- **行程頁「現在」（T2）**：`selectCurrentTripItem` 改用今天頁 NEXT STOP 的選法（串點整區算一站，再取區內子站），「回到現在」也跟著。例：10/19 15:45 兩頁都在「宮島表参道商店街」。
- **刪除（Bar 指定）**：
  - 程式：V1 的 `trip_expenses` 提示、2026-07 以前的 `v2_cache_*` 開機遷移（舊 key 由結束旅程時清除）、天氣城市表的東京／鎌倉／成田。
  - 檔案：`shell/v111`–`v153`（43 個，保留 v154 起；ADR 0019 增補保留規則）、`docs/superpowers/` 135 份沒被引用的計畫與規格、`00_CONTEXT_HANDOVER.md`、兩份 `-old-*_DEPRECATED.md`、5 份逐版驗證文件、2 份小筆記、`icon-120.png`。`tests/trip-lifecycle-wiring.test.js` 改用位元組相同的 v136 BUILTIN fixture 與保留世代的 hash。
- **文件修正（高／中）**：`tasks/current.md` 現況表（v143／備份 v9 → 現況）與被全域取代改壞的 5 行歷史、`16_OPS_PLAYBOOK.md` §A5「回滾至 v18」與 §F5、`.ai-manifest.json`（不存在的檔案、候選版標籤、Schema 3.1、備份 v10）、`README.md`、`CONTEXT.md`（字型鏈、備份 v10）、`03`、`04`、`05`、`06`、`08`、`10`、`11`、`13`、`01` 的過時說明。細節見 `tasks/current.md` 2026-10-16。
- **版本**：forward bump v156→v157；`builtin-snapshot.js` 以 v156 asset 離線重產，除版本外不變。發布說明視窗為 `v157` + `['v156','v155','v154','v153']`（v152 滾出）。
- **測試**：新增 `tests/browser/proxy-recording-v157.spec.js`（7 項：取消記帳移回待買、存檔後維持已買、320／390px 付款人選單（16px、不溢出）、代記紀錄的成員／備註／小標／列表／摘要／付款人份額、自己付不加備註、行程頁「現在」與「回到現在」）。`ledger-225.test.js` 加代記小標；`atomic-sheet-sync.test.js` 改為舊 v2_cache 不再遷移；`ledger-dashboard`、`ledger-member-visibility`、`theme-system`、v156 規格的付款人測試跟著更新。
- **反向驗證**（各自被測試抓到）：取消時不移回、不寫代記備註、代記紀錄不列給記錄者、摘要算進代記紀錄、忽略選的付款人、行程頁用舊選法。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回上一個 Netlify 部署（v156，錨點 `production-v156`），再往前 bump。資料不受影響；代記的帳在舊版顯示為付款人記的帳，備註照常顯示。

## 更早的紀錄

2026-07-03（基礎版）到 2026-10-15（v156 正式發布）的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md`](docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md)（Bar 2026-11-09 選「版本紀錄瘦身」），內容未改。
