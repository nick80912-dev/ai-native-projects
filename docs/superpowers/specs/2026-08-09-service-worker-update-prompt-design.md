# Service Worker Update Prompt v99→v100 Design

> 日期：2026-08-09
> 核准者：Bar
> 發布順序：v99 功能基線 → Bar 實機載入 v99 → v100 真實更新目標

## Purpose

在新版 Service Worker 已完成啟用、可安全接管目前頁面時，提供清楚且可操作的「新版已就緒／立即更新」提示，取代使用者必須自行開啟兩次才確定載入新版的慣例。提示不得自動刷新頁面，避免中斷尚未儲存的 Ledger／Shopping session。

## Current Evidence

- `index.html` 目前只在 `window.load` 呼叫 `navigator.serviceWorker.register('sw.js')`，沒有 `updatefound`、worker state 或 `controllerchange` 監聽。
- `sw.js` install 成功後立即 `skipWaiting()`，activate 完成後立即 `clients.claim()`；新版 worker 不會長期停在 waiting。
- `updatefound` 只代表瀏覽器找到並開始安裝 worker，尚不能保證新 App Shell 已安裝成功或新 controller 已接管。
- 現有 `toast()` 預設 2–3.5 秒自動消失，且任何其他操作 Toast 都會覆蓋它，不適合作為必須由使用者自行決定刷新時機的更新提示。

## Chosen Approach

新增專用、常駐、非 modal 的 update prompt，保留既有 Service Worker lifecycle 與快取策略：

1. 頁面載入時先記錄 `hadController = !!navigator.serviceWorker.controller`。
2. 在呼叫 `register()` 前先安裝 `controllerchange` listener，避免快速 install／activate 造成事件遺失。
3. `register()` 成功後監聽 `registration.updatefound`，並監聽當次 `registration.installing.statechange`。
4. 只有頁面載入時已有 controller，且新版 worker 已進入 `activated` 或收到 `controllerchange` 時，才顯示提示。
5. 同一頁面最多顯示一次；`updatefound` 與 `controllerchange` 即使都觸發也不得重複建立 UI 或重複刷新。
6. 使用者點擊「立即更新」才呼叫 `window.location.reload()`。沒有自動 reload、timeout reload 或背景導頁。

`controllerchange` 是最終可靠訊號；`updatefound`／worker state listener 提供可觀察安裝流程與事件 fallback，但不得在 `installing`／`installed` 階段提前提示。

## UI Contract

頁面已有一個固定 DOM 節點：

```html
<div id="swUpdatePrompt" class="sw-update-prompt" role="status" aria-live="polite" aria-atomic="true" hidden>
  <span>新版已就緒</span>
  <button type="button" onclick="reloadForServiceWorkerUpdate()">立即更新</button>
</div>
```

- 提示固定於底部導覽上方，最大寬度與 App 內容一致。
- z-index 固定為 `110`：高於 tabbar (`70`) 與一般 FAB (`90`)，低於 Ledger／Settings／Shopping overlays (`130+`)。表單或明細開啟時提示可在其後方等待，關閉 overlay 後仍存在。
- 現有 Toast (`200`) 可暫時顯示於更新提示上方；兩者不共享 timer、action 或 state。
- 文字區可收縮，按鈕至少 44px 高；320／375／390px 不得水平溢位。
- 不提供關閉按鈕。提示本身不阻塞其他操作，使用者可先完成表單再更新。

## Runtime Interface

`index.html` 新增三個小型 production functions：

```js
function showServiceWorkerUpdatePrompt() // 首次成功顯示回傳 true；重複或缺 DOM 回傳 false
function reloadForServiceWorkerUpdate() // 唯一允許呼叫 window.location.reload() 的更新動作
function setupServiceWorkerUpdatePrompt(serviceWorker,hadController) // 先安裝 controllerchange，回傳 registration observer
```

`setupServiceWorkerUpdatePrompt()` 只依賴傳入的 ServiceWorkerContainer 與頁面級一次性 guard；不建立 localStorage／sessionStorage key，不修改 APP_VERSION，不讀 Cache Storage。

註冊失敗仍沿用既有 `AppLog.sync('SW 註冊失敗:…')` 降級，不顯示錯誤 prompt，也不影響 App 啟動。

## First-install and Failure Semantics

- 首次安裝：頁面載入時沒有 controller，因此即使 `controllerchange` 發生也不顯示「新版」提示。
- 既有 PWA 更新：載入時已有 controller；新版成功 activated／接管後顯示一次。
- install 失敗或 worker 進入 `redundant`：不提示、不刷新，舊版繼續運作。
- 提示 DOM 意外缺失：安全返回，不中斷 SW 註冊或 App。
- 多次 `controllerchange`／statechange：一次性 guard 阻擋重複提示。

## Rejected Alternatives

### Reuse the existing action Toast

修改量最小，但 Toast 有自動消失、全域 action 與被後續訊息覆蓋的既有語意。延長 duration 仍無法避免其他 Toast 取代更新提示，故不採用。

### Automatically reload on controllerchange

互動最少，但可能在使用者輸入 Ledger／Shopping 表單時遺失 session-only 草稿，也可能造成難以理解的畫面跳轉，故不採用。

## Test Strategy

新增 Node 行為測試直接執行 production functions，以可觸發真實 listener 的小型 event targets 驗證：

- 首次安裝即使 activated／controllerchange 也不顯示。
- 已有 controller 時，activated 或 controllerchange 顯示一次。
- 兩條訊號都發生仍只顯示一次。
- 缺 DOM 安全返回。
- 只有明確呼叫 `reloadForServiceWorkerUpdate()` 才觸發 reload。

擴充 `tests/browser/sw-update-cache.spec.js`，使用既有 versioned server 實際完成兩世代 SW 更新：

- gen1 首次安裝不顯示提示。
- gen2 deploy 後呼叫 `registration.update()`，等待 prompt 可見；在點擊前 `QA_INDEX_GEN` 仍是 gen1，證明沒有自動 reload。
- 點擊「立即更新」後頁面載入 gen2，App／schema／cache generation 一致。
- 320／375／390px 下提示與按鈕尺寸合格且無水平 overflow。

既有 `pwa-shell.test.js` 與完整 `sw-update-cache.spec.js` 仍鎖定 App Shell 完整性、HTTP cache bypass、離線 fallback 與單一新版 cache。

## Version and Sequential Acceptance

### v99

- 加入 prompt markup、CSS、registration observer、Node／Browser tests 與文件。
- 同步把 `sw.js` 的 `SW_VERSION` 與 `app-version.js` 的 `APP_VERSION` 升為 `v99`。
- 完整 gate 通過後單獨 push `dev`，不得同一批建立 v100。

### Required pause

Bar 必須先在實機／PWA 開啟 dev 站，必要時點擊由 v98→v99 產生的「立即更新」，並確認診斷版本／Cache Storage 已是 v99。此確認是 v100 的前置條件。

### v100

- 只在後續獨立 commit 把兩個版本來源同步升為 v100，補對應 changelog／status。
- 單獨 push `dev` 後，以已被 v99 controller 控制的同一裝置驗證提示出現、未自動 reload、點擊後進入 v100。
- v100 實機驗收完成前，backlog #24 不移入 done。

## Explicit Non-goals

- 不修改 `skipWaiting()`、`clients.claim()`、install／activate／fetch handler、SHELL 清單或 cache strategy。
- 不自動 reload、不保存 dismiss 狀態、不新增更新設定頁或診斷控制。
- 不修改 Ledger／Shopping state、store、repository、domain、schema、資料格式或 renderer。
- 本階段只 push `dev`；不 merge `main`、不部署 Netlify production、不建立 production tag。

## Rollback

v99 尚未進入 v100 驗收前，可 revert v99 feature commit 與文件 commit；SW lifecycle 與資料格式未改，不需要 migration。已安裝 v99 worker 的裝置在下一個正常版本仍會依既有 update lifecycle 收斂。
