# v88 資料可感知性設計規格

## 目的

讓旅途中使用者不必進診斷面板，就能回答四個問題：今天花了多少、旅程累計多少、目前資料有多新、是否有某一類資料仍沿用舊版本。

本批不改 Google Sheet schema、Ledger record、個人備份格式、Service Worker 生命週期或同步降級策略。

## 1. 記帳摘要

既有 `.ledger-summary-card` 保持單一卡片，不新增獨立 Today 卡。

- 個人帳主數字：`今日支出 · N 筆`。
- 團體帳主數字：`與我相關 · 今日消費 · N 筆`；金額是與目前成員相關紀錄的完整金額，不宣稱是個人負擔。
- 主數字下方新增單行次摘要：個人帳為 `旅程累計`，團體帳為 `與我相關旅程累計`，同時顯示總筆數與目前主幣別總額。
- 點主數字仍只切換 JPY／TWD 顯示，既有記錄篩選、代購、結算與匯率語意不變。
- 今日為零時直接顯示零；移除原本只在最近紀錄不是今天時出現的「今日尚無消費」，避免重複。

日期依既有 Ledger 裝置本地日期規則，不改成旅程日或模擬時間。

## 2. 同步相對時間與 partial 來源

Header 同步按鈕沿用既有狀態色與入口；健康狀態保持精簡，只有需要注意新舊程度的狀態顯示相對時間：

- `已同步`（可見文字不帶分鐘數，aria 保留完整更新時間）
- `離線版 · 昨天 HH:MM／M/D HH:MM`
- `部分同步 · N 分前`
- `更新失敗 · N 小時前`
- 同步中與內建版沒有可用時間時維持單一狀態文字。

按鈕 `aria-label` 使用完整單位。相對時間每分鐘在前景更新，使用真實系統時間，不受旅程時間模擬影響；健康狀態只更新 aria，不增加可見分鐘數。

同步面板同時區分：

- `資料更新`：目前 active snapshot 建立時間。
- `最後完整同步`：所有 Sheet 最後一次完整成功的時間。
- `未更新資料`：使用顯示名稱（例如「分帳資料」），不暴露 `ledger` 內部 key。
- partial fallback 的來源時間：分帳沿用哪個 snapshot 的資料。

Snapshot envelope 可新增向後相容的 `lastCompleteAt` 與 sheet metadata `sourceCreatedAt`；既有 snapshot 沒有欄位時由 active／previous 安全推導。不得新增 localStorage key。

## 3. 設定頁資料健康摘要

「資料與版本」子頁頂部新增 `資料健康狀態`，集中顯示：

- 行程資料：同步狀態、相對更新時間、partial／failure 來源。
- 團體帳：待同步筆數；沒有佇列時顯示已送出。
- 個人資料：明示只儲存在此裝置，不使用「已同步」。
- 照片附件：沿用既有 `shoppingPhotoStorageSummary()`，不另造照片狀態。

設定根頁的資料列摘要顯示 `資料狀態正常` 或 `N 項需注意`。離線使用本身不算異常；partial、failed、團體帳待送與照片損壞／不可用才計入注意項。

## 4. 文件與版本

- App／SW 升為 v88；`sw.js` 除版本字串外不變。
- release notes、changelog、current task、測試說明同步更新。
- `tasks/current.md` 記錄 v74–v87 已由 Bar 真機／PWA 驗收通過；v88 仍需看過效果後再決定是否真機驗收／發布。
- `docs/batch2-device-acceptance.md` 新增 v74–v87 累積驗收結論，不偽造逐步量測。
- `tasks/backlog.md` 移除已結束的 #23「12 月東京行接入」，保留缺號；`tasks/done.md` 記錄此項因行程已結束而關閉，不視為功能交付。
- `06_ROADMAP.md` 移除相同未來項目。

## 5. 驗收

- 個人／團體、今日有／無支出、主幣別 JPY／TWD。
- online／partial／failed／offline／builtin／syncing 與跨日相對時間。
- 連續 partial 仍保留最後完整同步時間。
- 設定健康摘要對 pending queue、照片異常與本機個人資料的語意正確。
- 320、375、390px Header、記帳摘要與設定頁無水平 overflow；同步文字不擠掉設定按鈕。
- 鍵盤與 aria 名稱維持正確。
- 完整 Node、Playwright、文件標題、版本一致性與 `git diff --check` 全部執行。
