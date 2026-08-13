# Trip Pilot v109 定位回饋精簡設計

日期：2026-08-13
狀態：使用者已確認視覺方向；待規格審閱
範圍：v108 真機驗收修正，以 v109 forward-bump 交付

## 1. 目的

明確入口仍要把使用者帶到正確的行程日、行程項目或採買地點，但成功定位後不再插入「已定位：地點」灰底提示列。畫面只用短暫的目標醒目效果回饋定位結果，避免清單位移及重複資訊。

找不到目標屬於不同情境：可見的非阻擋提示與 Render diagnostic 必須保留，讓使用者與除錯報告都能辨識降級原因。

## 2. 已確認的畫面行為

### 2.1 成功定位

- 自動捲動、sticky header 安全距離及精確目標選擇維持不變。
- 不呈現任何可見的「已定位：……」列、Toast 或新增控制項，也不保留原提示列造成的垂直空白。
- 目標元素立即套用既有珊瑚色外框與淡珊瑚底色。
- 醒目樣式完整維持 **1000ms**，再以 **200ms** 淡化回原本樣式；總回饋週期為 1200ms。
- 若 `prefers-reduced-motion: reduce`，醒目樣式仍維持 1000ms，但直接清除，不播放 200ms 淡化動畫。
- 成功文字仍寫入 `role="status" aria-live="polite"`，但 live region 必須採視覺隱藏樣式，不得影響布局；螢幕閱讀器仍可收到目前目的地。

### 2.2 目標遺失

- 繼續開啟正常目的頁面並安全回到頁面頂端，不拋出例外。
- 顯示既有可見的「找不到對應目標」非阻擋提示。
- 繼續寫入 Render diagnostic。
- 不套用成功醒目效果。

## 3. 實作邊界

`navigation-intent.js` 的 request／consume／complete 狀態與 intent shape 不變。`index.html` 的 DOM adapter 負責以下呈現狀態：

1. `is-navigation-target`：立即呈現醒目外觀，不做淡入。
2. 1000ms 後加入 fading 狀態，以 200ms 將 outline／background 淡回原樣。
3. 1200ms 後移除定位樣式並完成 intent。
4. 成功狀態把共用 live region 切為 visually-hidden；失敗狀態切回可見樣式。

重複或快速連續定位時，新的 intent 必須先取消舊 timer 與舊元素樣式，舊 timer 不得清除新目標。採買 overlay 關閉時，既有來源捲動與焦點復原契約不變。

本次不改資料、Schema、Apps Script、Ledger／Shopping 語意、備份格式、同步流程、SW lifecycle 或 cache strategy。

## 4. 版本與既有規劃

- 因 `index.html` 屬 App Shell，依 forward-bump 規則同步將 `app-version.js` 與 `sw.js` 從 v108 升至 **v109**，確保手機 PWA 取得新版內容。
- `APP_RELEASE_NOTES` 保持恰好五筆，新增本次使用者可見修正。
- 原訂「UI semantic tokens 與 Today deep-module extraction」不得混入本次驗收修正，整批順延為 **v110**。
- 原訂 v110 throughput spike 及其後續排程也應在實作文件中依序順延，避免兩個工作共用版號；不在本次實作中執行那些功能。
- 只推送 `dev`；不 merge `main`、不部署正式站、不建立 production tag。v109 仍需 Bar 手機／PWA 驗收。

## 5. 驗收與測試

採測試先行：先讓既有「成功狀態可見」斷言紅燈，再修改 production code。

Browser acceptance 至少涵蓋 Shopping Hero／badge 與既有 explicit-target matrix，並驗證：

- Tap／Enter／Space 仍定位至正確 ID，目標位於 sticky header 下方且無水平 overflow。
- 成功 live region 文字與 `aria-live="polite"` 保留，但元素不佔布局、不可視，且頁面不存在可見的「已定位」提示列。
- 0–1000ms 目標仍醒目；1000ms 後進入淡出；1200ms 後定位樣式與 active intent 均清除。
- reduced-motion 在 1000ms 後直接清除，沒有 transition。
- 找不到目標時提示仍可見，診斷仍產生，頁面不 throw。
- overlay 關閉後來源 scroll／focus return、快速連續 intent 與 stale timer 防護均不退化。

Release gate 延續全套 Node、Playwright、focused WebKit、版本／文件／runtime assets／BUILTIN no-drift、manifest、diff check 與離線 Chromium Health probe。

## 6. 成功條件

使用者從 Hero、採買卡或其他明確入口進入後，只看見正確地點短暫醒目並自然淡回原樣；清單不再因成功提示多出一列。無障礙通知、錯誤降級、精確定位及返回上下文全部維持。
