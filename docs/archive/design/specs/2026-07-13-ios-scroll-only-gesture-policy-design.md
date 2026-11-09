# iOS Scroll-only 手勢政策設計

## 背景與實機證據

第二階段已部署至 `dev`，手機驗證結果如下：

- 診斷版次、桃子徽章、輸入框 focus／blur、一般單擊、滑動與 `healthCheck()` 均正常。
- 在行程卡片非互動文字／空白區雙擊，iOS Dev PWA 仍會原生放大，方案 A 的第二次單指 `touchstart` 攔截無效。
- 雙指縮小偶發出現內容縮至畫面左側、右側大片留白或內容偏移。
- 放大畫面呈現原生 visual viewport 放大；跑版畫面符合原生 viewport 與 `.wrap` CSS transform 同時作用後座標不同步。

目前頁面同時存在兩個縮放擁有者：WebKit 原生 viewport，以及 `setupPinchZoom()` 對 `.wrap` 套用的 `transform: scale(...)`。繼續增加 JavaScript 事件攔截會提高耦合，無法解決 gesture ownership 衝突。

## 已核准的產品決策

整個 App 不再提供任何捏合縮放或自製回彈，只保留：

- 垂直頁面捲動。
- 日期列、篩選列等既有水平捲動。
- 一般單擊、按鈕、連結及表單操作。
- 桃子徽章雙擊開啟診斷面板。

使用者已明確接受取消縮放能力的取捨。

## 方案比較

### 方案 C-R：單一 Scroll-only 手勢政策（採用）

移除所有自製縮放 JavaScript，並以根層 CSS `touch-action: pan-x pan-y` 宣告頁面只允許水平與垂直平移，不允許 pinch zoom 或 double-tap zoom。這使 WebKit 成為唯一手勢仲裁者，但可執行的手勢集合不包含縮放。

優點：

- 同時處理雙擊放大與自製縮放跑版。
- 不再維護兩套縮放狀態。
- 保留既有水平及垂直捲動。
- 移除已證實無效的 JavaScript 雙擊攔截。

風險：

- 使用者無法利用捏合放大輔助閱讀。
- 最終效果仍須以 iPhone Home Screen Dev PWA 驗證；桌面模擬不能證明 WebKit 原生手勢結果。

### 診斷 Build：只加入事件與 visualViewport 日誌（不採用）

可精確記錄 `touchstart`、`gesturestart`、`visualViewport.scale` 與 transform，但不直接改善使用體驗。由於實機截圖與現行程式已足以確認雙縮放擁有者，本階段不先發布純診斷版本。

### 舊式硬鎖 viewport（不採用）

永久加入 `maximum-scale=1` 或 `user-scalable=no`。Safari 可能忽略這些限制，且會留下與第一階段 focus 還原邏輯的耦合，因此不作為主要方案，也不與 C-R 同時疊加。

## 架構與程式範圍

### CSS 手勢所有權

- 移除全域 `touch-action: manipulation`。
- 根層 `html, body` 使用 `touch-action: pan-x pan-y`。
- 不在一般子元素重新啟用 `pinch-zoom` 或 `manipulation`。
- Modal/Bottom Sheet 類表面一律視為 Scroll-only 區,不開捏合例外。可捲動區使用 `touch-action: pan-y`,互動控制項可使用 `touch-action: manipulation`;祖先手勢交集仍由 `pan-y` 限制,不得重新開放 pinch zoom。
- 保留既有 `overflow-x:auto` 水平容器；`pan-x pan-y` 允許瀏覽器依可捲動方向處理。
- 移除只供自製縮放使用的 `.wrap.pinch-zooming` 樣式。

### JavaScript 移除範圍

- 完整移除 `setupPinchZoom()` 與啟動呼叫。
- 完整移除 `isDoubleTapInteractive()`、`touchDistance()`、`setupDoubleTapGuard()` 與啟動呼叫。
- 保留 `setupDiagnostics()` 的桃子徽章雙 `touchend` 處理器。
- 保留表單 16px 下限、`restoreFocusZoom()`、`setupViewportReflow()` 及 focus／blur 還原防護。
- 不修改行程 renderer、資料、Schema、Validator、Google Sheets 或個人狀態。

### 版本與離線更新

- 建立功能提交後，診斷面板的 `APP_BUILD.code` 更新為該功能提交的七碼短 hash。
- 日期維持本批次日期 `2026-07-13`。
- Service Worker App Shell cache 從 `okayama-trip-v5` 升至 `okayama-trip-v6`。
- `SCHEMA 2.1` 維持不變。

## 錯誤處理與升級門檻

若 C-R 在實機仍出現縮放或跑版：

1. 停止追加 CSS 或 JavaScript 鎖定。
2. 發布獨立診斷 Build，記錄事件順序、`visualViewport.scale`、`window.innerWidth` 與 `.wrap` transform。
3. 確認 Dev APP 的啟動容器與 iOS 版本。
4. 重新提出 WebKit／PWA 專用方案並由 Bar 核准。

不得自動回退到永久 viewport 硬鎖，也不得恢復自製 transform 縮放。

## 自動測試

更新 `tests/ios-zoom-guard.test.js`，至少驗證：

1. `html, body` 使用 `touch-action: pan-x pan-y`。
2. production source 不得全域使用 `touch-action: manipulation`；唯一例外為 Modal／Bottom Sheet 內的互動控制項，且其可捲動祖先必須維持 `touch-action: pan-y`。
3. production source 不再含 `setupPinchZoom`、`pinch-zooming`、`setupDoubleTapGuard`、`isDoubleTapInteractive` 或 `touchDistance`。
4. viewport meta 不永久包含 `maximum-scale` 或 `user-scalable=no`。
5. 表單控制項仍維持至少 16px。
6. focus／blur 的短暫 viewport 還原測試仍通過。
7. 桃子徽章診斷 handler 仍存在。
8. APP CODE 為七碼提交 hash，診斷面板顯示 `SW okayama-trip-v6`。

## iPhone Dev PWA 驗收

1. 雙擊行程卡片文字、空白區及無時間的灰色時間標記：不放大。
2. 雙指向內／向外操作：畫面不縮放、不回彈、不偏移，右側不出現大片留白。
3. 垂直上下滑動：正常。
4. 日期列及其他水平清單左右滑動：正常。
5. 桃子徽章雙擊：正常開啟診斷面板。
6. 按鈕、連結與打卡：正常。
7. 輸入框 focus／blur：正常。
8. 診斷面板顯示新 APP CODE、`SCHEMA 2.1`、`SW okayama-trip-v6`，且 `healthCheck()` 正常。

## 範圍外

- 不修改 `main`。
- 不加入新的縮放 UI。
- 不建立自製 pan／zoom 引擎。
- 不修改 Schema、Google Sheets、同步資料流或個人狀態。
- 不將永久 viewport 硬鎖與 Scroll-only 政策混用。
