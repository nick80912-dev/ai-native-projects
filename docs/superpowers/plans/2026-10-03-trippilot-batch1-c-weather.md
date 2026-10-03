# TripPilot C：天氣資訊與資料有效性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 天氣有城市、可信取得時間，清楚分出有效、過期、無資料及未知降雨。

**Architecture:** 新 generation UI 保留 cache `{t,data}`，新增純投影 helper 與 session request guard；不增加天氣服務或背景輪詢。文字、aria 與畫面數字共用有效性結果。

**Tech Stack:** 現有 Open-Meteo fetch、JavaScript、localStorage cache、Node vm、Playwright。

**Spec:** [第一批設計 §7](../specs/2026-10-03-trippilot-reliability-and-clarity-batch1-design.md)，[共用規則](2026-10-03-trippilot-batch1-index.md)。

## Global Constraints

- 3 小時有效期：`10800000` ms；有效年齡為 `0 <= now-t < 10800000`。
- 時間是手機取得時間，不是氣象站發布時間；顯示「更新於 HH:mm」，採日本旅行時間 Asia/Tokyo 並在可及描述明示。
- 「不展示過期數字」；缺失降雨不得補成 `0%`，未知不得產生「適合出發」保證式摘要。
- 沿用來源、現有 fetchWithTimeout 6500ms、城市 resolver；不猜預設城市、不增加背景輪詢、不改備份 v9／封存 v1。
- G 依索引，不改 frozen generation 或 root v110。

## Review Focus

1. session 常駐超過 3 小時：再次進入需過期，不重新標記快取時間（Task 1）。
2. null／空字串降雨與合法 0%：前者未知、後者可以顯示（Task 1）。
3. 快取時間缺失、未來時間、城市不符：不可當目前有效資料（Task 1）。
4. 切城市／離頁後晚到請求：不覆蓋新畫面，也不寫已清除旅程快取（Task 2）。
5. 快取寫入拒絕但網路有效：本 session 可用且如實記診斷，不錯稱已持久化（Task 2）。

## File Structure

- 新 generation UI／登記依索引。
- 函式：`getCachedWeather`／`setCachedWeather`／`fetchWeather`／`loadWeatherForCity`、`requestHomeWeather`／`homeWeatherFor`、`renderTodayWeatherSummary`／`weatherTravelHint`；所有 weather 使用者以 rg 核對，不只修 today。
- 新建 `tests/weather-freshness.test.js`、`tests/browser/weather-freshness.spec.js`；現有 `today-live-info.spec.js`／`trip-three-scenarios.spec.js` 作回歸。
- cache keys／envelope 不變；不新增 runtime module 或依賴。

### Task 1: 品質投影、城市／時間與未知值

**Interfaces:** `weatherPresentation(envelope, city, now)` → `{status,cityLabel,updatedAt,temp,rain}`，status 為 fresh／expired／unavailable；temp／rain 無有效值時 null。envelope `{t,data}`；data.city 須等於 resolver city.label；t 有限正數且非未來。有效 temp 必須是有限數字，null／空字串不可 Number 成 0。未知 rain 不改有效 temp。`getCachedWeather(city)` 保留只回有效資料的原契約；新 `readWeatherEnvelope(city)` 只讀並驗 shape，供過期辨識。

`updatedAt` 為有效取得時間戳（否則 null），格式化集中在 renderer；expired 的 temp／rain 必須 null。

```js
const city={key:'hiroshima',label:'廣島'}, envelope={t:1000,data:{city:'廣島',temp:0,rain:null}};
assert.strictEqual(weatherPresentation(envelope,city,1000+10799999).status,'fresh');
assert.strictEqual(weatherPresentation(envelope,city,1000+10800000).status,'expired');
assert.strictEqual(weatherPresentation(envelope,city,1000).rain,null);
assert.strictEqual(weatherPresentation(envelope,city,1000).temp,0);
```

- [ ] **Step 1 — RED tests:** Node vm helper test 精確斷言 age `10799999` fresh、`10800000` expired；未來／缺 t、城市不符、null temp unavailable；合法 temp 0 fresh、rain 0 保留0、null／空／NaN rain 為null。呼叫後 envelope.t 與 bytes 不變。讀取 denied／bad JSON 為 unavailable 不 pageerror。
- [ ] **Step 2 — Verify RED:** `node tests/weather-freshness.test.js`，新 helper 缺失或舊零值／有效期處理導致失敗。
- [ ] **Step 3 — Minimal implementation:** 建立 G／登記；新增兩個 helper。fetch 保留缺失降雨為 null，不 `rain||0`；讀快取不刷新 t。renderer 對 fresh 顯示城市／溫度／更新時間，expired「天氣資料已過期，暫無最新資料」，unavailable「暫無天氣資料」，loading「正在讀取天氣…」。過期／無資料不輸出數字；aria 使用同一結果。未知降雨可省略，但 hint 不能默認適合出發。
- [ ] **Step 4 — Verify GREEN:** `node tests/weather-freshness.test.js`；browser 新 spec 驗 DOM 可見城市／時間及 aria、合法 0°C 不遺失、未知不出0%、過期無舊數字。`npx playwright test tests/browser/weather-freshness.spec.js tests/browser/today-live-info.spec.js` 通過。
- [ ] **Step 5 — Commit:** UI、登記、上述測試，訊息 `feat: expose weather freshness and unknown data`。

### Task 2: Session 年齡、請求去重與重試

**Interfaces:** `homeWeatherState[key]` session envelope `{status,envelope,requestId,error}`；key 維持 dayIndex＋city.key。新增單調 session `homeWeatherRequestId` 與 `homeWeatherEpoch`；每筆 request 捕捉 epoch，既有旅程清理成功的 UI adapter 增加 epoch 並清空 session 狀態，不改 lifecycle module。回應前核對 epoch 與 lifecycle active。`requestHomeWeather(dayIndex,item,force)` 中 force 僅手動重試；其他既有兩參數 caller 不需修改契約。`homeWeatherFor` 每次投影 `Date.now()`，不因 state 存在而永遠 fresh。

- [ ] **Step 1 — RED tests:** Node mock clock／deferred fetch：同 key loading 只發一次；valid cache 不發；expired 進頁一次fetch；failed render 不自動再發；手動 retry 再發一次。network success storage denied 保留 session data；旅程 clear epoch 改變後舊 request 不寫 cache。不同城市各自 envelope 不串用。
- [ ] **Step 2 — Verify RED:** 新 Node test 新案例須失敗；先區分 session guard 問題與 fixture Date 錯誤。
- [ ] **Step 3 — Minimal implementation:** loading／failed 狀態保留避免 render loop；進入 today 觸發對新 key 或剛過期資料一次請求，失敗需使用者按天氣內「重試」才能再次發起，不增加設定頁。late response 只更新對應 request identity；render 前確認目前 key／curView／active trip，clear 後忽略且不寫 cache。網路有效而 cache save failed 只記診斷，不丟棄 session有效天氣。維持6500ms逾時，無 AbortController。
- [ ] **Step 4 — Browser tests:** route stub Open-Meteo，固定時鐘後前進3h、切today／trip、快速換城市、離頁晚到、manual retry、clear旅程後晚到、timeout及cache denied；斷言請求次數／畫面／cache。320／375／390px 城市與時間不擠掉下一站操作，沿用11px候選規則，不變更全域字體。
- [ ] **Step 5 — Verify GREEN:** `node tests/weather-freshness.test.js`、`npx playwright test tests/browser/weather-freshness.spec.js tests/browser/today-live-info.spec.js tests/browser/trip-three-scenarios.spec.js`；全部通過。
- [ ] **Step 6 — Commit:** UI 與測試，訊息 `fix: guard weather requests and session expiry`。

### Task 3: C 交付 gate

**Interfaces:** 天氣狀態供現有 UI，不改遠端 API／備份格式。

- [ ] 更新現況／changelog／裝置待驗；確認沒有 CSV／官方旅行內容／OAuth mutation。
- [ ] 索引全套 QA 與核准方法獨立審查；核對天氣缺資料仍有非空行程與操作。
- [ ] 收到指示才推 dev，核對 exact-head CI／測試站，請使用者驗收。後續第二批需另寫計畫，不自動接著實作。
