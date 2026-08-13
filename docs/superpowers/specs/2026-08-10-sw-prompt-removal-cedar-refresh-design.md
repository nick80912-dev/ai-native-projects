# SW Prompt Removal and Cedar Theme Refresh Design

> 日期：2026-08-10
> 決策者：Bar
> 目標版本：v101（只 push `dev`）

## Purpose

移除實機驗收後被判定為低必要性、且訊息時機與使用者實際看到新版內容不一致的全域 Service Worker 更新提示；同時把杉綠主題的棕色行動色改為林下青，使它與焙茶主題形成清楚區隔。兩項調整共用同一個 v101 UI/runtime 候選版，但彼此不共享狀態或邏輯。

## Evidence and Problem Statement

### Service Worker prompt

目前 `index.html` 的提示在新版 worker `activated` 或 `controllerchange` 後顯示。然而 App shell 的日常請求由既有 worker 採 network-first；使用者可能先取得新版 `index.html` 或其他資源，稍後才收到「新版已就緒」。因此提示事件與畫面內容不是同一時間軸，訊息可能在使用者已看到新版後才出現。

這不是只改文字就能解決的問題。若要精確判斷整頁所有 runtime 資源是否仍是舊世代，必須增加跨資源 generation 協議、狀態保存與更多失敗分支；相較本 App 的更新頻率與使用情境，產品價值不足以支持這個複雜度。Bar 於 v99→v100 實機驗收後決定完整移除全域提示。

### Cedar versus tea

杉綠與焙茶的背景與 chrome 不同，但主要行動色分別為杉綠 `#7A4F24`、焙茶 `#896748`，兩者皆為棕色，實際操作畫面的 daybar、連結、按鈕與 hero 漸層容易產生相似印象。Bar 在三案視覺比較後選擇 A「林下青」`#2F6B4F`。

## Decision

### 1. Remove the global SW update prompt

從 `index.html` 移除：

- `#swUpdatePrompt` 靜態 DOM。
- `.sw-update-prompt` 及其 mobile layout CSS。
- `swUpdatePromptShown`、`showServiceWorkerUpdatePrompt()`、`reloadForServiceWorkerUpdate()`、`setupServiceWorkerUpdatePrompt()`。
- `updatefound`、installing worker `statechange` 與 prompt 專用 `controllerchange` listeners。

Service Worker 註冊恢復為單純的：

```js
navigator.serviceWorker.register('sw.js').catch(function(error){
  // 保留既有 AppLog.sync 失敗文字與安全降級
});
```

不以 Toast、modal、設定頁 badge、banner、自動 reload 或其他提示取代。設定頁既有 App／SW 版本資訊與最近更新說明保留。

### 2. Preserve Service Worker runtime behavior

`sw.js` 除正常 `v100`→`v101` 版本遞增外不得修改：

- `skipWaiting()`。
- `clients.claim()`。
- SHELL 清單。
- install／activate／fetch handlers。
- install `cache:'reload'`、runtime fetch `cache:'no-cache'`。
- navigation-only offline fallback 與非 navigation miss 行為。

`app-version.js` 與 `sw.js` 同步升為 v101；這是讓已由 v100 控制的裝置取得「提示已移除」runtime 的必要世代，不代表新增更新機制。

### 3. Refresh only the cedar action token

杉綠主題只修改一個第一層 token：

```css
[data-theme="cedar"]{
  --t-action:#2f6b4f;
}
```

以下全部維持不變：

- 杉綠 `--t-chrome:#23402f`。
- `--t-accent:#d2622c` 與 accent background。
- paper、card、ink、line、tabbar、secondary。
- `THEME_REGISTRY.cedar.chrome` 與 meta theme-color。
- 焙茶及其他五個主題。
- 第二層語意角色與元件 CSS。

白字對 `#2F6B4F` 的對比為 6.29:1，杉綠 paper `#F3F5F0` 對該色為 5.73:1；兩者皆高於 WCAG AA 一般文字 4.5:1。深杉綠與林下青主要用於相鄰 chrome／action 大色塊與漸層，不承擔彼此之間的小字對比。

## Test Strategy

### Prompt removal

- 移除 `tests/sw-update-prompt.test.js`，因其所有 production interface 隨產品決策一起消失。
- 從 `tests/browser/sw-update-cache.spec.js` 移除 prompt lifecycle 與 prompt mobile layout 案例。
- 保留並完整執行 SW cache generation、混版防線、離線 App shell 與未命中子資源契約。
- 不新增只以 source substring 鎖定「提示不存在」的負向測試；移除後的正確行為由剩餘 SW runtime 契約與實機驗收判定。

### Cedar theme

- 更新 theme token fixture／expected value。
- 驗證六主題 13 個第一層 token 仍齊全。
- 驗證杉綠 action 上白字與 action 對 paper 的對比。
- Browser 覆蓋杉綠 data-theme、meta chrome、topbar、daybar、主要 action 與 320／375／390px 無溢位；其他五主題不得改色。

### Complete gate

- 全部 Node test files。
- 全部 Playwright tests（案例總數會因移除兩個 prompt Browser cases 而下降）。
- `tools/check-app-version.js`。
- `tools/check-runtime-assets.js`。
- `tools/check-doc-titles.js`。
- manifest JSON parse、`git diff --check` 與 Git ancestry gate。

## Documentation and Task State

- `04_UI_GUIDELINES.md` 的杉綠 `action` 更新為 `#2F6B4F`，其餘表格值不變。
- `07_CHANGELOG.md` 記錄 v101 移除 prompt 的產品決策、杉綠換色與 SW 非目標。
- `tests/README.md` 移除 prompt 專屬 Node／Browser 說明並保留 cache／offline 說明。
- `.ai-manifest.json` 與 `tasks/current.md` 更新為 v101 dev candidate 及實際測試總數。
- `tasks/backlog.md` #24 從未完成清單移除；在 `tasks/done.md` 以「v99／v100 實驗完成後由 Bar 決定取消，不是功能完成」歸檔，避免未來誤判為遺漏或重新實作。

## Explicit Non-goals

- 不建立另一種更新提示。
- 不偵測或顯示 App／controller／cache generation mismatch。
- 不修改 SW lifecycle、cache strategy、SHELL 或 offline fallback。
- 不新增、刪除、重新命名主題，也不更改預設主題。
- 不修改 Ledger、Shopping、store、repository、Buy-to-Ledger、schema、資料格式、localStorage 或備份格式。
- 不 merge `main`、不部署 Netlify production、不建立 production tag。

## Acceptance Criteria

1. v101 App 不再出現「新版已就緒／立即更新」或任何替代更新提示。
2. v100 控制的裝置可依既有正常 SW 流程取得 v101；頁面不會被程式自動 reload。
3. 離線開啟、cache generation、版本一致性與 navigation fallback 契約全數通過。
4. 杉綠 daybar、hero action side、連結與主要按鈕使用 `#2F6B4F`；焙茶維持 `#896748`。
5. 杉綠其他 12 個第一層 token、其他五主題與固定語意色 byte-for-byte 不變。
6. 自動 gate 全綠後只 push `dev`，由 Bar 完成手機實機驗收。

## Rollback

若杉綠實機效果不符合預期，只回復 cedar `--t-action`、對應文件與 fixture，不影響其他主題或資料。若移除提示造成產品重新評估，必須另開新設計；不得直接 revert 舊 watcher，因本次已確認其事件時機與使用者感知不一致。
