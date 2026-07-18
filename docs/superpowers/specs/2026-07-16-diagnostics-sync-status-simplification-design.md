# 診斷面板與同步狀態簡化設計

## 背景

目前 Dev 的診斷面板與同步狀態視窗同時呈現版本、同步及 validation warning，資訊重複且容易讓一般使用者誤解。Places 官網欄位雖然是選填，目前仍會產生 `OPTIONAL_EMPTY`「未填寫網站」警告，並同時出現在健康檢查與同步狀態視窗。

iOS 雙擊縮放問題已完成實機處理，現行被動事件診斷仍持續收集最近 24 筆 touch、gesture、dblclick 與 visual viewport resize 事件，但這批證據目前已無使用需求。

## 目標

1. 取消 Places 官網空白的 validation warning。
2. 將同步狀態改成以「正常／同步中／異常」為核心的簡單視窗。
3. 將同步狀態視窗置於畫面中央。
4. 移除診斷面板內重複的同步、版本及 iOS 手勢診斷資訊。
5. 完整停止 iOS 手勢事件收集，待問題再次發生時才以獨立診斷版本重新啟用。
6. 將「重置行程進度」按鈕改為圓弧紅底白字，同時保留雙重確認。

## 非目標

- 不移除桃子徽章與診斷面板入口。
- 不移除時間模擬、Day 1–6 快捷時間或結束模擬操作。
- 不改變重置行程進度實際清除的 localStorage keys。
- 不改變 Scroll-only `touch-action`、viewport 回前景修復、表單 focus／blur 回復。
- 不改變原子 Sheet snapshot、Gate、失敗保留舊版或重試流程。
- 不新增新的 Sheet 欄位、Schema Type 或資料來源。
- 不保留隱藏的手勢事件 listener 或背景事件 buffer。

## 官網空白警告

Places 的 `官網` 是選填欄位。`validateSnapshotData()` 不再為空白 `place.web` 建立：

```text
OPTIONAL_EMPTY / Pxxx 未填寫網站
```

此訊息將從來源移除，而不是只在 UI 過濾。因此：

- `healthCheck()` 不再回傳未填網站訊息。
- 同步成功 snapshot 不再保存這類 warning。
- 同步狀態視窗不再顯示這類 warning。
- console 不再輸出這類 warning。
- 必填欄、重複 ID、未知 Type、懸空引用及 TripConfig 錯誤仍維持現有 blocker 行為。

## 診斷面板

桃子徽章雙擊仍開啟診斷面板。面板保留：

- 健康檢查
- 時間模擬
- Day 1–6 快捷設定
- 結束模擬並還原／保留測試狀態
- 重置行程進度

面板移除：

- 同步狀態區
- APP／Schema／Service Worker 版本區
- iOS 手勢診斷區
- 手勢事件筆數
- 手勢事件 `<pre>` 框
- 複製手勢診斷報告
- 清除手勢事件

健康檢查正常時顯示「正常」；有 blocker 時顯示既有安全摘要。

### 重置行程進度按鈕

按鈕維持完整寬度與現有最小高度，視覺改為：

- 圓弧邊框，與面板內其他主要控制一致。
- 紅色背景。
- 白色文字。
- 紅色邊框。

按鈕文字維持「重置行程進度」。點擊後仍執行兩次確認，且只清除既有打卡與略過進度。

## iOS 手勢診斷移除

移除以下 runtime 行為：

- `touchstart`
- `touchend`
- `gesturestart`
- `gestureend`
- `dblclick`
- `visualViewport.resize`

上述項目僅指診斷資料收集 listener，不影響其他既有 viewport 或 focus recovery listener。

同時移除手勢診斷專用的：

- target 摘要
- touch-action snapshot
- visual viewport snapshot
- 24 筆環形記憶體
- environment/report formatter
- render／refresh／clear／copy 函式
- `.diag-gesture-log` CSS

若 iOS 手勢問題再次發生，應另行建立診斷規格與獨立 Dev 診斷版本，不在一般版本背景常駐收集。

## 同步狀態模型

保留現有 `syncStatusModel()` 對 snapshot、failure record、source 及 `syncInFlight` 的判斷能力，但 UI model 聚焦為：

- `state`
- `label`
- `lastComplete`
- `schemaVersion`
- `generationId`
- `failure`
- `failedSheet`

不再將 non-blocking validation warnings 提供給同步狀態 UI。

### 正常狀態

條件：目前 snapshot source 為 `online`、沒有 failure record、沒有同步中的 promise。

顯示：

- 大型綠色勾勾。
- 主標題「同步正常」。
- 最後完整同步時間。
- 小字 `Schema 2.3 (2026-07-16)／資料版本 sheet-…`。
- 「立即重新同步」按鈕。

Header 同步按鈕顯示：

```text
✓ 已同步
```

### 同步中

顯示 loading／旋轉狀態、主標題「同步中」及目前 Schema／資料版本。重試按鈕 disabled，避免重複請求。

### 異常、離線或內建資料

顯示警告圖示與對應主標題：

- 更新失敗
- 離線資料
- 內建資料

若有 failure record，顯示：

- 未同步或失敗的 Sheet 名稱。
- allowlist 後的簡短錯誤原因。
- 目前沿用資料的最後完整同步時間。
- Schema 與資料版本。
- 「立即重新同步」按鈕。

原始 CSV、未過濾例外文字及可執行 HTML 不得顯示。

## 同步狀態視窗版面

`.sync-status-overlay` 使用水平與垂直置中：

```css
display:flex;
align-items:center;
justify-content:center;
```

面板四角皆使用一致圓角，不再呈現底部 sheet 樣式。內容保持可捲動，窄螢幕保留安全 padding，點擊遮罩仍可關閉。

正常畫面不顯示逐列的：

- APP build
- 資料來源
- 空白的最近失敗原因
- 驗證警告

## 測試策略

### Validator

- 驗證 Places 官網空白不產生 `OPTIONAL_EMPTY`。
- 驗證既有 blocker 行為不變。
- 驗證 standalone `validator.js` 與 embedded validator 保持一致。

### 同步狀態

- 正常狀態顯示綠色勾勾、「同步正常」、最後同步時間、Schema／資料版本與重試按鈕。
- 正常狀態不含 APP build、資料來源、最近失敗原因或驗證警告。
- 異常狀態顯示失敗 Sheet、安全摘要、沿用版本時間及重試按鈕。
- 同步中停用重試。
- Header 正常文字為 `✓ 已同步`。
- 視窗 CSS 為水平、垂直置中。

### 診斷面板

- 診斷面板不含同步、版本及 iOS 手勢區。
- 不再註冊手勢診斷 listener。
- 不再存在事件框、複製及清除手勢按鈕。
- 時間模擬與行程重置入口仍存在。
- 重置按鈕具有圓角、紅底、白字，雙重確認邏輯維持。

### 回歸

- 執行所有 `tests/*.test.js`。
- 執行文件標題檢查。
- 執行 inline JavaScript syntax check。
- 執行 `git diff --check`。
- 驗證 Scroll-only、viewport resume、focus recovery 與原子同步測試仍通過。

## 文件更新

- `04_UI_GUIDELINES.md`：記錄常態版本不再收集 iOS 手勢事件，問題重現時才發布診斷版。
- `07_CHANGELOG.md`：記錄診斷面板、同步狀態與官網 warning 簡化。
- `tasks/backlog.md`：記錄既有診斷面板改採精簡常態版；保留尚未完成的 AppLog 環形緩衝、healthCheck 與複製除錯資訊提案。

## 驗收條件

- 健康檢查與同步狀態皆不再出現「未填寫網站」。
- 同步正常時只呈現勾勾、同步時間、Schema／資料版本與重試按鈕。
- 同步異常時才呈現 Sheet 與失敗原因。
- 同步視窗在手機及桌面皆置中。
- 診斷面板沒有版本、同步及 iOS 手勢事件區。
- 頁面不再註冊手勢診斷 listener。
- 時間模擬與重置行程功能仍可使用。
- 重置按鈕為圓弧紅底白字，且保留雙重確認。
