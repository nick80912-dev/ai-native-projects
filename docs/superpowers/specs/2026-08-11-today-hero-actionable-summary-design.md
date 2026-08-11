# Today Hero Actionable Summary Design

> 日期：2026-08-11
>
> 狀態：視覺設計已確認，等待書面規格審閱
>
> 目標版本：App／SW v103（只推送 `dev`）

## Purpose

Today 首屏應先回答旅途中最即時的三件事：今天是什麼時候、出門要準備什麼、順路去哪裡採買；下一站卡片繼續負責抵達與現場資訊。

目前 Hero 右側的天氣 chip 與 Hero 下方獨立採買卡占用兩個區塊，也使「降雨百分比」「已處理站數」「待買數量」同時成為視覺焦點。新設計將天氣與採買整合進 Hero 底部同一列，把資訊語氣從績效／待辦摘要改成旅行情境提示，同時維持原有資料來源與操作入口。

## Product Decisions

- 保留現有 Today Hero、下一站卡與「看今日完整細節」整體結構，不引入新的狀態流程。
- Hero 右上使用放大的天氣情境圖示填補視覺重量；圖示不成為按鈕。
- `已處理／總站數` 僅以小型 `3 / 12` 顯示，不使用圓環、百分比或「今日進度」文案。
- Hero 底部新增單列摘要：左側是「外出提醒」，右側是「順路採買」。
- 移除 active-trip Today 畫面原本獨立的 `.today-shopping-card`／`.today-shopping-launcher`；下一站卡、下一站採買 badge 與完整採買 overlay 不變。
- 不顯示「剩餘幾站」「完成率」或倒數，避免 KPI 與趕行程感。
- 不新增 API、CMS 欄位、Google Sheet schema、localStorage key 或備份格式。

## Approved Visual Hierarchy

Hero 由上而下分成三層：

1. **日程脈絡**：左上 `TODAY · DAY 2`，右上小字 `3 / 12`。
2. **日期與氣氛**：左側 `10/19（一）`，右側為目前天氣的放大圖示。
3. **可行動摘要**：分隔線下方維持同一列；左側顯示 `外出提醒｜21° · 記得帶傘`，右側顯示 `順路採買｜本通商店街 · 6 項 →`。

下一站卡及其交通、停車、營業、付款／提醒 disclosure、完成／跳過按鈕均不調整。新 Hero 不得把下一站卡推離 390px 手機首屏的既有可見範圍。

## Component Boundaries

### Weather presentation model

新增純函式 `weatherTravelHint(weather)`，只把現有 weather object 轉成短提示，不負責定位、請求或快取。`requestHomeWeather()`、`homeWeatherFor()`、Open-Meteo 請求與既有快取契約保持不變。

提示採單一優先序，畫面一次只顯示一項：

1. 雷雨 code `>=95`：`留意雷雨`。
2. 雪 code `71–77`：`注意路滑`。
3. 降雨 code `51–67`／`80–82`，或「現在之後」最高降雨機率 `>=40`：`記得帶傘`。
4. 霧 code `45`／`48`：`行車留意濃霧`。
5. 溫度 `<=12°C`：`注意保暖`。
6. 溫度 `>=30°C`：`記得補水`。
7. 其他有效天氣：`適合出發`。

此順序避免同時塞入多個提醒，也確保雷雨、雪與降雨等安全性較高的情境優先於溫度舒適度。

### Shopping presentation model

既有 `buildShoppingTodayReminder(items, day, currentStopRef)` 仍是 Today 採買資料權威：只納入今天、尚未完成、可解析到有效站點，且不屬於當下下一站的項目；群組沿用當日行程順序，組內沿用必買優先排序。

新增只負責 Hero 顯示的 pure projection `todayShoppingHeroModel(model, day, currentStopRef)`：

- 以 `day.items` 找到 `currentStopRef` 的位置，優先選擇排在目前站點之後的第一個 group，標籤使用「順路採買」。
- 找不到目前站點，或只剩排在目前站點之前的 group 時，使用 `model.groups[0]`，標籤改為中性的「今日採買」，不得宣稱順路。
- 主文案為該群組的 `stopName`。
- 次文案數量只計算該群組的 `group.items.length`，避免把其他地點的總數誤掛在目前地點旁。
- 整個右側摘要是單一 button；點擊呼叫 `openShoppingList(group.stopRef)`，開啟既有 overlay 並聚焦顯示的站點群組。
- 站名過長時單行截斷；不得把摘要列撐成兩行。

「順路採買」只表示依今日行程順序位於目前站點之後的下一個可解析採買站點，不依 GPS、距離或即時導航重新排序。

### Hero renderer

`renderToday()` 組合以下獨立輸出：

- 既有完成數／總數，改為沒有狀態詞的輕量位置文字。
- 現有 weather object 轉出的圖示與外出提醒。
- 現有 shopping reminder model 轉出的單一採買摘要。

天氣與採買 helper 不讀 DOM，也不直接切換 view；Hero renderer 只負責版面組合與安全 escaping。

## State and Fallback Behavior

### Active trip day

- **天氣與其他站採買皆有**：顯示左右雙欄與中間分隔線。
- **只有天氣**：外出提醒佔滿摘要列；不渲染空的採買欄或分隔線。
- **只有其他站採買**：採買摘要佔滿摘要列；不渲染空的天氣欄或分隔線。
- **沒有天氣，且採買入口已由下一站 badge 負責**：整個摘要列不渲染，Hero 維持日期與既有背景裝飾。
- **天氣 loading／失敗且沒有 cache**：視同沒有天氣，不顯示 skeleton、錯誤或空白 placeholder，也不阻塞下一站卡。
- **天氣有 cache**：沿用既有 cache 顯示。
- **只有當下下一站有待買**：Hero 不重複採買摘要；仍由下一站卡既有 `.nx-buy-badge` 提供入口。
- **有未綁定、待確認或孤兒採買，但沒有可解析的 Today 群組**：在 Hero 摘要使用一般「採買清單｜開啟查看 →」入口，不把資料錯誤包裝成「順路採買」。
- **採買清單為空**：保留整合在 Hero 內的一般「採買清單｜開啟查看 →」入口，讓使用者仍可新增項目；不恢復獨立 launcher。

### All done and late-day states

`pick.item` 為空、明日預覽或 21:00 後 compact tomorrow preview 的既有判定不變。Hero 可顯示 `總數 / 總數`，但不增加完成動畫、百分比、獎勵或催促文案。

### Pre-trip or no matching Today

「還沒到出發日」畫面、D-day countdown、行程重點與 pre-trip 採買入口維持現狀。本批只整合 active-trip Today Hero，不把 pre-trip 重新設計納入同一變更。

## Interaction and Accessibility

- 天氣圖示是情境裝飾，使用 `aria-hidden="true"`；完整天氣語意由外出提醒容器提供。
- 外出提醒的 accessible name 應包含城市、溫度、現在之後最高降雨機率與提示，例如「廣島 21 度，現在之後最高降雨機率 40%，記得帶傘」。
- `3 / 12` 的 accessible name 明確說明「今日已處理 3 站，共 12 站」，避免只朗讀無上下文的分數。
- 採買摘要使用原生 `button type="button"`，accessible name 包含站名與該站待買數量，例如「開啟本通商店街的 6 項待買」。
- 採買摘要觸控範圍至少 44×44 CSS px，支援 Tab、Enter、Space 與可見 `:focus-visible` ring。
- Hero 不可成為整張可點擊容器，也不得建立 nested interactive controls。
- 320／375／390px viewport 均維持單列；動態站名以 ellipsis 收斂，頁面不得產生水平 overflow。
- 顏色不是唯一訊號；標籤、主文案與箭頭仍以文字呈現。

## Data Flow

```text
currentStop
  ├─ inferWeatherCityForDay → existing weather fetch/cache → weatherTravelHint
  │                                              └─ weather icon + 外出提醒
  └─ currentStopRef
        └─ buildShoppingTodayReminder(existing local shopping items, today, excluded current stop)
              └─ first future group; neutral fallback to first group → stop name + group item count
                                      └─ click → openShoppingList(stopRef)
```

這兩條資料流只在 `renderToday()` 匯合；任何一條失敗都不影響另一條或下一站卡。

## Test Strategy

### Pure behavior tests

- `weatherTravelHint()` 覆蓋雷雨、雪、降雨 code、降雨機率 threshold、霧、低溫、高溫與一般天氣；驗證優先序一次只回傳一項。
- Hero shopping projection 優先取目前站點之後的第一個行程排序群組；找不到未來群組時退回第一組並改用「今日採買」。數量使用群組自己的 item count，不誤用 `model.count`。
- 缺少 group、stop name 或 model 時安全回傳空結果。
- 既有 `buildShoppingTodayReminder()` 的當日過濾、下一站排除、行程排序與必買排序測試繼續通過。

### Browser behavior tests

- 有天氣及其他站採買時只渲染一個 Hero 摘要列，不再渲染獨立 `.today-shopping-card`。
- 左側文案顯示 `外出提醒`、溫度與正確短提示；右上圖示與 weather code 對應。
- 右側優先顯示目前站點之後的第一個其他站及該站數量；沒有未來群組時顯示第一組並改用「今日採買」。點擊後 overlay 開啟、`curView` 仍為 `today`，並聚焦正確 `stopRef` 群組。
- 只有下一站待買時不出現重複 Hero 採買摘要，既有 badge 仍存在且可操作。
- 天氣失敗、只有天氣、只有採買、兩者皆無、無 Today 與 all-done 狀態都能正常渲染。
- 320／375／390px 無換行、重疊與水平 overflow；採買按鈕觸控區、鍵盤操作與 focus ring 合格。
- 下一站卡的交通／停車／營業常駐，付款／提醒 disclosure、完成／跳過、明日預覽與「看今日完整細節」沒有行為回歸。

### Regression gate

- 全部 `tests/*.test.js`。
- 全部 Playwright tests，特別是 `tests/browser/today-live-info.spec.js`、overlay／retap 與窄螢幕驗收。
- `node tools/check-runtime-assets.js`。
- `node tools/check-doc-titles.js`。
- `node tools/check-app-version.js`。
- `git diff --check` 與既有版本／文件 gate。

## Documentation and Release Scope

- 實作時更新 `07_CHANGELOG.md`、`08_AI_HANDOVER.md`、`tasks/current.md` 與必要測試說明。
- App／SW 同步升為 v103，維持 cache generation 與 runtime assets 一致。
- 只推送 `dev` 供手機實機驗收；不 merge `main`、不部署 production、不建立 production tag。
- `.superpowers/brainstorm/` 視覺稿是設計過程產物，不納入產品 runtime 或 release artifact。

## Explicit Non-goals

- 不建立 KPI、圓形進度、百分比、成就、連續完成或獎勵機制。
- 不新增 GPS、即時距離或路線最佳化來重新定義「順路」。
- 不新增完整天氣頁、逐時預報或災害警報系統。
- 不改變 Open-Meteo endpoint、快取 TTL 或城市推導規則。
- 不修改採買項目 schema、stopRef 契約、排序權威、照片、分帳或購買流程。
- 不重做下一站卡、行程頁、pre-trip Today 或底部分頁列。
- 不修改 Google Sheet、CMS schema、BUILTIN snapshot 或個人備份格式。

## Acceptance Criteria

1. Active-trip Today 的天氣與其他站採買整合在 Hero 底部同一列，原本獨立採買卡不再占用一個區塊。
2. Hero 右上顯示天氣情境圖示；`已處理／總站數` 只保留為小字，不出現圓環、百分比或「今日進度」。
3. 左側以既有 weather object 顯示溫度與單一可行動提示；天氣不可用時靜默退化且不阻塞 Today。
4. 右側優先以目前站點之後的第一個採買站為主資訊；沒有未來群組時使用第一組並改稱「今日採買」。數量只計該站，點擊後在既有採買 overlay 聚焦該站。
5. 下一站採買只由下一站 badge 顯示，不在 Hero 重複；無可解析 Today 採買時不得誤稱「順路採買」。
6. 下一站卡、明日預覽、完整行程入口、pre-trip 畫面與採買清單核心行為不變。
7. 320／375／390px 無換行、重疊或水平 overflow，互動與 accessible names 通過驗收。
8. v103 完整自動 gate 通過後只推送 `dev`，等待手機實機驗收；未經確認不推進 main／production／tag。

## Rollback

若新 Hero 在窄螢幕、天氣失敗或採買入口上出現不可接受回歸，revert v103 的 Hero renderer、CSS、helper、tests 與版本文件，恢復 v102 的 weather chip 與獨立 Today shopping card。此變更沒有資料遷移、schema 或 storage mutation，因此回滾不需清理 Google Sheet、localStorage、cache payload 或個人備份。
