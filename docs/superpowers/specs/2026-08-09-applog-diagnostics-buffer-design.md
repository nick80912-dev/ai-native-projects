# AppLog 診斷緩衝與面板精簡設計

**日期：** 2026-08-09  
**狀態：** 已核准  
**範圍：** backlog #2「隱藏除錯面板後續評估」的 AppLog／healthCheck 子項，以及移除診斷面板內的團體帳測試模式入口

## 1. 目的

目前 `AppLog` 的六類診斷只輸出到瀏覽器 console。真機發生錯誤時，使用者可開啟既有桃子診斷面板，但面板只能看到當下 `healthCheck()` 結果，無法回收啟動後已發生的 parser、repository、render 或 sync 訊息。

本切片讓既有 `AppLog` 同時保留本次 App session 最近 100 筆診斷，並讓既有診斷面板顯示、複製及清除這些紀錄。面板同時移除「團體帳測試模式」區塊；測試模式控制頁、TEST universe、資料隔離與 Ledger 行為不變。

## 2. 不在範圍內

- 不寫入 `localStorage`、IndexedDB、遠端服務或個人備份。
- 不攔截一般 `console` 訊息，只記錄經六個 `AppLog` 方法送出的訊息。
- 不恢復已退役的 touch、gesture、dblclick 或 visual viewport 診斷收集器。
- 保留被動、無副作用的 iOS `dblclick` 相容性監聽器。
- 不移除團體帳測試模式功能、設定頁控制入口、TEST 前綴或資料隔離。
- 不修改 schema、資料格式、renderer、Service Worker 生命週期或快取策略。
- 不配置新的 runtime 版本；`app-version.js` 與 `sw.js` 維持 v98。

## 3. 選定方案

深化 `validator.js` 中既有的 `AppLog`，而非額外包裝它或攔截 console。

`AppLog` 繼續提供 `schema`、`parser`、`data`、`repo`、`render`、`sync` 六個既有方法。每次呼叫仍以相同前綴與 console level 輸出，並額外將正規化後的 entry 寫入 closure 內的固定容量緩衝。

新增的公開能力只有：

- `AppLog.snapshot()`：依時間順序回傳 defensive copy。
- `AppLog.clear()`：清除本次 session 的緩衝。

緩衝不直接暴露，避免 UI 或測試改寫內部狀態。

## 4. AppLog entry 與容量規則

每筆 entry 包含：

- `at`：建立時的 ISO timestamp。
- `category`：`schema`、`parser`、`data`、`repository`、`render` 或 `sync`。
- `level`：`warn` 或 `error`，與既有 console 行為一致。
- `message`：轉為字串後的訊息內容。

緩衝最多 100 筆。第 101 筆加入時移除最舊一筆，維持 FIFO。每筆保存的 `message` 最多 1,000 字元；console 仍輸出呼叫當下的完整訊息，使既有開發除錯行為不退化。

日期或訊息正規化不得讓 `AppLog` 自己拋錯。無法建立 ISO timestamp 時以空字串降級；無法正常轉字串時以安全摘要取代。

## 5. Health check 資料流

新增一個無副作用的當下 health finding 讀取函式，負責對目前 `DB`、`RAW`、`SCHEMA` 執行既有 `validateSnapshotData()` 並只回傳訊息陣列。

既有 `healthCheck()` 改為呼叫這個函式後，維持原有 console 報告與 `AppLog.data()` 輸出，因此 `window.healthCheck()` 的外部契約不變。

診斷面板改用無副作用讀取函式。單純打開面板不會新增 AppLog entry，也不會讓相同 health finding 每開一次就重複進入緩衝。

## 6. 診斷面板

既有桃子徽章入口與面板 overlay 不變。面板保留：

- App 版本
- 健康檢查
- 旅途紀錄
- 時間模擬
- 行程進度

面板完整移除「團體帳測試模式」的標題、狀態、按鈕與說明。`openTestModeSettings()`、設定頁控制入口及其相關實作全部保留，本切片不得刪除或改變測試模式能力。

新增「AppLog」區塊：

- 顯示目前緩衝筆數。
- 顯示最近紀錄，所有內容使用既有 `escapeHtml()`。
- 「複製除錯報告」：產生包含建立時間、當下 health check 與全部 AppLog entry 的純文字報告，沿用既有 `copyText()` clipboard／fallback 路徑。
- 「清除紀錄」：只呼叫 `AppLog.clear()` 並刷新 AppLog 區塊，不清除 health findings、旅途紀錄、行程進度或任何持久資料。

空緩衝顯示明確空狀態。報告不得額外收集原始 CSV、完整 URL、表單輸入或瀏覽歷史。

## 7. 錯誤處理

- `snapshot()` 永遠回傳陣列；呼叫端修改結果不得影響內部緩衝。
- 清除空緩衝為安全 no-op。
- Clipboard API 不可用或失敗時沿用現有文字複製 fallback，不新增另一套複製介面。
- 診斷 UI 不得因單筆無效 entry 中斷整個面板渲染。
- `AppLog` 的 console side effect 順序維持現況；緩衝寫入是額外觀測能力，不改變原呼叫端控制流。

## 8. 測試策略

### Characterization／unit

- 六個既有方法仍使用正確前綴與 console level。
- 101 筆輸入只留下最新 100 筆，且順序正確。
- 保存訊息限制為 1,000 字元，console 仍收到完整訊息。
- `snapshot()` defensive copy、`clear()` 與空緩衝 no-op。
- `healthCheck()` 維持既有報告行為；無副作用 health 讀取不新增 AppLog entry。

### 診斷面板

- 顯示 health findings、AppLog 筆數、最近 entry 與空狀態。
- 複製報告包含當下 health check 與全部 AppLog。
- 清除後面板刷新且其他資料不變。
- entry 內容經 HTML escaping。
- `openDiagnostics()` 範圍不再包含團體帳測試模式標題或入口。
- 設定頁測試模式控制與 TEST universe 的既有 Node／browser 測試持續通過。
- iOS no-op `dblclick` 相容性測試持續通過。

### 完整 gate

- 所有 `tests/*.test.js`
- 完整 Playwright suite
- `tools/check-doc-titles.js`
- `tools/check-app-version.js`
- `tools/check-runtime-assets.js`
- JSON parse 與 `git diff --check`

## 9. 文件與交付

完成後更新 `tasks/backlog.md`、`tasks/done.md`、`tasks/current.md`、`07_CHANGELOG.md`、`08_AI_HANDOVER.md`、測試索引及 manifest 驗證基線。此切片提交並推送 `dev`，不得 merge `main`、部署 Netlify 或建立 production tag。
