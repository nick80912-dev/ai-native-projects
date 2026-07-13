# iOS 輸入框防放大與雙擊縮放階段一設計

## 目的

修正 iOS Safari 在表單控制項字級小於 16px 時，focus 後自動放大且 blur 後可能殘留縮放的問題；同時以 CSS 原生手勢規則驗證是否能取代現有 JavaScript 雙擊抑制器。階段一的交付目標是建立可在真實 iPhone 上驗證的 `dev` 版本，不在取得 Bar 手機驗證前移除既有 `setupDoubleTapGuard()`。

## 範圍與邊界

階段一只處理以下內容：

1. 所有 `input`、`select`、`textarea` 的有效字級不得低於 16px。
2. 在既有 `setupViewportReflow()` 中加入輸入 focus 縮放殘留的條件式還原。
3. 加入 `html { touch-action: manipulation; }`，作為停用雙擊縮放的第一防線。
4. 保留既有 `setupDoubleTapGuard()`，待真實 iPhone 驗證通過後才於階段二移除。
5. 更新與本行為直接相關的測試、治理文件、CHANGELOG 與 Service Worker cache 版本。

不修改 Schema、Validator、Google Sheets 七表、資料流、Renderer 架構、ADR、正式 `main` 分支或無關 UI。

## 現況

- `index.html` 已是唯一 App 原始碼與正式入口。
- viewport 原始內容為 `width=device-width, initial-scale=1.0, viewport-fit=cover`，沒有常駐 `maximum-scale` 或 `user-scalable=no`。
- 已存在 `setupViewportReflow()`，目前只在 `visualViewport.resize` 與診斷面板 `focusout` 時強制重排。
- 已存在 `setupDoubleTapGuard()`，會在非互動元素 300ms 內第二次 `touchend` 時呼叫 `preventDefault()`。
- 已存在 `setupPinchZoom()`，負責自製捏合縮放與 0.2 秒回彈。
- 表單相關 CSS 中有 14px 與 15px 規則，僅新增低權重的元素選擇器不足以防止 iOS 自動放大。

## 設計

### 1. 表單字級樓地板

在現有全域 CSS 區加入：

```css
input,select,textarea{font-size:16px}
```

再逐條稽核所有會命中表單控制項的既有 selector。小於 16px 的規則抬升為 16px；等於或大於 16px 的規則保持不變。不得使用 `max()`，以維持老 WebView 相容性。

本次已知需處理的 selector 至少包括：

- `.inline-add input`
- `.field input,.field select`
- `.shop-search input`
- 診斷面板的 `datetime-local` 輸入框

以 390px viewport 驗證所有實際表單頁面。現行分帳表單是垂直欄位，不預設新增排版 class；只有實測出現橫向溢出時，才在既有 `.inline-add`、`.field` 或相關既有 class 上做最小調整。

### 2. focus 縮放來源狀態

啟動時取得 viewport meta 元素及其原始 `content` 字串，保存於全域常數 `VIEWPORT_ORIGINAL`。還原時必須原封寫回此字串，不重新組裝原始設定。

`setupViewportReflow()` 內維護兩個 ES5 區域狀態：

- 目前是否由表單控制項取得 focus。
- 本次 focus 期間是否偵測到使用者主動多指手勢。

表單控制項 `focusin` 時開始追蹤並清除前次手勢旗標。追蹤期間若發生 `touchstart` 且 `touches.length > 1`，或發生 `gesturestart`，就標記為使用者主動捏合。

`focusout` 時只有同時符合以下條件才執行還原：

- focus 來源為 `input`、`select` 或 `textarea`。
- `window.visualViewport` 存在。
- `visualViewport.scale > 1`。
- 本次 focus 期間沒有主動多指手勢。

不符合條件即沿用既有重排行為，不拋出錯誤。無 `visualViewport` 的老 WebView 直接跳過縮放還原。

### 3. viewport 瞬鎖瞬解

符合還原條件時：

1. 暫時把 viewport content 設為原始字串加上 `maximum-scale=1`。
2. 約 100ms 後原封寫回 `VIEWPORT_ORIGINAL`。
3. 確保 `maximum-scale` 不常駐，也不加入 `user-scalable=no`。

若前一次還原 timer 尚未結束又觸發新的還原，先取消舊 timer，再重新執行一次完整時序，避免舊 timer 提前改寫新狀態。

### 4. 雙擊與捏合共存

加入：

```css
html{touch-action:manipulation}
```

階段一保留 `setupDoubleTapGuard()`，因本機 Chromium 或模擬裝置不能替代真實 iOS Safari／WebView 驗證。`setupPinchZoom()` 與桃子徽章既有 300ms `touchend` 偵測均不修改。

Bar 在 iPhone 上確認下列行為後，階段二才可移除 `setupDoubleTapGuard()`：

- 空白處與文字區慢速雙擊不放大。
- 捏合縮放及自製回彈正常。
- 桃子徽章快速雙擊仍可開啟診斷面板。
- 打卡格快速連點不受影響。

若任一項失敗，階段二停止並回報 Bar 與 Claude，不自行加入新的 JavaScript 抑制方案。

## Service Worker 與交付

階段一修改 `index.html` 後，將 `sw.js` 的 cache 名稱由 `okayama-trip-v3` bump 至 `okayama-trip-v4`，確保手機取得新 App Shell。此檔屬 Tier 2，修改範圍只限 cache 版本字串。

所有程式與文件變更只提交、推送至 `dev`。不得推送或合併 `main`。`12_DEV_WORKFLOW.md` 已符合現行 `dev → PR → Bar Review → Bar Merge → main` 制度，因此本批不重寫該文件，也不建立 Drive 文件副本。

## 測試設計

### 可自動驗證

- 新增回歸測試，靜態確認所有實際表單 selector 的有效字級不低於 16px。
- 確認 viewport 原始 meta 不含常駐 `maximum-scale` 或 `user-scalable=no`。
- 以可抽取函式或事件沙盒驗證：一般輸入 focus/blur 會瞬鎖後還原；主動多指手勢不觸發還原；無 `visualViewport` 不報錯。
- 確認 `html` 使用 `touch-action: manipulation`。
- 階段一確認 `setupDoubleTapGuard()` 仍存在。
- 執行 repo 全部 Node 回歸測試與 `tools/check-doc-titles.js`。

### 瀏覽器與人工驗證

- 390px viewport 檢查診斷面板、購物搜尋、成員新增與分帳欄位無橫向溢出。
- 驗證斷網內建、連網同步、旅行日 mock Date 三情境零 pageerror；若環境限制使某情境無法實測，Development Summary 必須列為未驗證，不得冒稱通過。
- Bar 依任務文件十項清單在真實 iPhone 驗證，其中雙擊、捏合、桃子徽章與打卡連點結果決定是否進入階段二。

## 文件更新

- `04_UI_GUIDELINES.md`：新增表單控制項最低 16px，以及行動手勢與 viewport 瞬鎖瞬解原則。
- `.ai-manifest.json`：新增 viewport 不得常駐限制的 invariant。
- `07_CHANGELOG.md`：記錄階段一行為、未移除的舊抑制器及待手機驗證項目。
- `12_DEV_WORKFLOW.md`：現況已符合憲章與 ADR 0005，不修改。

## 風險與回滾

- 字級抬升可能造成窄螢幕排版變化；以 390px 實測並只調整既有 class。
- viewport 瞬鎖可能誤判主動捏合；以 focus 來源與多指旗標隔離。
- CSS 與舊 JS 抑制器在階段一短暫並存；此為取得真實 iOS 證據的刻意過渡狀態。
- SW cache 更新可能使手機短暫持有不同版本；依既有 network-first 與新 cache 名稱更新。

程式或文件問題使用 `git revert` 回退本批 commit。若 SW cache 發生事故，發布下一個新 cache 版本並放入上一個正常內容；不得刪除 `sw.js` 或把版本名稱倒退。

## 階段一完成條件

- 變更範圍未超出本規格。
- 自動測試與文件檢查通過。
- `dev` 提供可供 Bar 手機驗證的版本。
- Development Summary 清楚分列已驗證與待 Bar 驗證。
- `setupDoubleTapGuard()` 尚未移除。
- 未推送或合併 `main`。
