# iOS 雙擊縮放診斷 Build 設計

## 背景與已確認事實

- Bar 已在 iPhone Dev PWA 確認診斷版次為 `APP DEV · CODE edfbfba · 2026-07-13`、`SW okayama-trip-v7`，可排除舊 App Shell 或快取誤判。
- 根層已採 `touch-action:pan-x pan-y`，自製 `.wrap` 捏合 transform 與 JavaScript 雙擊攔截器均已移除，但同點快速雙擊仍觸發 WebKit 原生放大。
- 先前的 CSS `manipulation`、第二次 `touchstart` 攔截與 Scroll-only 宣告皆未在此 Dev PWA 取得雙擊手勢控制權。依既有 Scroll-only 規範，下一步應先發布觀察型診斷 Build，不再疊加防縮放策略。
- 本設計取代 `2026-07-13-ios-scroll-only-gesture-policy-design.md` 中「本階段不先發布純診斷版本」的舊判斷；原因是新的 v7 實機證據已滿足其後續診斷觸發條件。

## 目標

發布一個行為不變的 Dev 診斷版本，取得一次雙擊前後的事件順序、事件可取消性、visual viewport 尺寸／比例與頁面橫向溢出證據，供下一階段判斷是否值得測試 viewport 硬鎖、修正特定寬度來源，或接受 WebKit 容器限制。

## 非目標

- 不阻止雙擊、捏合、滑動或任何原生手勢。
- 不加入 `maximum-scale`、`minimum-scale` 或 `user-scalable=no`。
- 不恢復 `setupPinchZoom()`、`setupDoubleTapGuard()` 或 `.wrap` 回彈。
- 不修改 Schema、Google Sheets、CSV parser、同步資料流、行程 renderer 或 localStorage 個人狀態。
- 不將診斷資料傳送到伺服器，也不保存跨啟動紀錄。

## 診斷架構

### 1. 記憶體環形紀錄

新增全域 `GestureDiagnostics`，只在目前頁面生命週期內保留最多 24 筆紀錄。超過上限時移除最舊一筆；重新啟動 App 即清空。此物件只負責擷取、格式化、清除與匯出診斷文字，不負責阻止事件。

每筆紀錄包含：

- 相對時間與事件類型。
- `touches.length` 與 `changedTouches.length`；非 TouchEvent 記為空值。
- `cancelable`、`defaultPrevented`。
- 目標元素的 tag 與最多兩個 class 名稱，不記錄文字內容、輸入值或 URL。
- `window.innerWidth/innerHeight`、`scrollX/scrollY`。
- `document.documentElement.clientWidth/scrollWidth`。
- `visualViewport.width/height/scale/offsetLeft/offsetTop`；不支援 visual viewport 時明確顯示 `n/a`。

### 2. 被動事件觀察

在 App 啟動時註冊以下 listener：

- `document`: `touchstart`、`touchend`、`gesturestart`、`gestureend`、`dblclick`。
- `window.visualViewport`: `resize`。

所有可設定 passive 的觀察 listener 均使用 `{passive:true}`。診斷 handler 禁止呼叫 `preventDefault()`、`stopPropagation()`、修改 viewport meta、設定 transform 或觸發 render。既有桃子徽章雙擊 handler 維持原狀，因其本身是開啟診斷面板的互動入口，不納入全域防縮放策略。

### 3. 環境摘要

診斷文字頂端固定包含：

- `APP_BUILD.channel/code/date`、Schema version 與 SW 顯示版本。
- `navigator.userAgent`。
- `display-mode: standalone` 是否成立。
- `navigator.standalone`（存在時）。
- 擷取當下的 viewport／document 尺寸。

## 診斷面板 UI

桃子診斷面板新增「iOS 手勢診斷」區塊，沿用既有 `.diag-section`、`.diag-row` 與 `.diag-actions`，不建立平行設計系統。

區塊內容：

1. 目前環境與 viewport 摘要。
2. 最近 24 筆事件，由新到舊顯示；每筆以短行呈現事件、scale、viewport 寬度、document 寬度與取消狀態。
3. 「複製診斷內容」按鈕：重用既有複製能力，把純文字放入剪貼簿並顯示 toast。
4. 「清除診斷紀錄」按鈕：只清除記憶體紀錄並立即重繪診斷區，不關閉面板、不改行程狀態。

若沒有事件，顯示「尚無手勢紀錄」。診斷清單設定合理最大高度並可垂直捲動，避免面板因 24 筆資料過長而無法操作。

## 版本與快取

- 先建立功能 commit，再把其七碼短 hash 寫入 `APP_BUILD.code`。
- 診斷面板與 `sw.js` 同步升至 `okayama-trip-v8`，確保手機載入新 App Shell。
- Schema 維持 2.1；不更新 BUILTIN 資料快照。

## 自動測試

新增 `tests/ios-gesture-diagnostics.test.js`，至少驗證：

1. 環形紀錄最多 24 筆且保留最新事件。
2. snapshot 在有／無 `visualViewport` 時皆可運作。
3. target 摘要不包含 `textContent`、表單值或 URL。
4. 匯出文字包含環境、viewport 與事件必要欄位。
5. 清除後紀錄為空。
6. production listener 使用 passive 觀察，診斷函式不包含 `preventDefault`、`stopPropagation`、viewport meta 或 transform 寫入。
7. Scroll-only、回前景恢復、表單 focus／blur、桃子徽章與既有全部測試持續通過。
8. APP CODE 與 `okayama-trip-v8` 顯示一致。

## 手機驗證流程

1. 完整關閉並重新開啟 Dev PWA；必要時第二次重啟，使 SW v8 接管。
2. 桃子徽章雙擊，確認 APP CODE 與 `SW okayama-trip-v8`。
3. 在「iOS 手勢診斷」按清除，關閉面板。
4. 在原本可重現的位置快速雙擊一次，保留放大後畫面。
5. 再開診斷面板，按「複製診斷內容」或截取完整診斷區。
6. 將內容交回 Codex；此輪只收證據，不判定已修復。

## 風險與控制

- **事件觀察造成效能負擔**：24 筆上限，僅記錄五類手勢事件與 visual viewport resize，不監聽高頻 `touchmove` 或 viewport scroll。
- **診斷本身改變手勢**：所有全域診斷 listener 被動且只讀；以靜態測試禁止副作用 API。
- **診斷資訊過多**：UI 使用短行摘要，完整內容透過複製取得。
- **隱私**：不記文字、輸入值、目的地、URL，不上傳、不進 localStorage。
- **iOS 原生行為無法由桌面測試證明**：自動測試只證明 instrumentation 不改行為；最終證據仍由 Bar 的 iPhone Dev PWA 取得。

## 回滾

- 程式回滾：對診斷功能與出版 metadata commits 使用 `git revert`。
- 快取回滾：不得刪除 `sw.js`；以新 cache 版本發布 v7 等同內容，依 `16_OPS_PLAYBOOK.md` A2 清除舊 App Shell。
- 診斷紀錄無持久化，因此重新啟動 App 即自然清除，不需 migration。

## 驗收標準

1. 診斷面板顯示新的 APP CODE、Schema 2.1 與 `SW okayama-trip-v8`。
2. 清除、複製及最近 24 筆顯示正常。
3. 一次雙擊後可看出 touch／gesture／dblclick／visual viewport resize 的實際順序，以及 scale 是否由 1 變大。
4. 診斷 listener 不阻止事件，Scroll-only 與既有互動行為未改變。
5. repo 全部自動測試、文件檢查、inline JavaScript 語法與 `git diff --check` 通過。
6. Dev push 後由 Bar 執行手機診斷；本階段不得宣稱雙擊縮放已修復。
