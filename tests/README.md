# tests — 測試資產(交付必附)

## v112 UI/UX and Android PWA coverage

- `ui-ux-v112.test.js` and `navigation-location.test.js` protect destination-first itinerary cards, item-local walking／driving／transit routes, Taiwan/Japan qualification, deferred identity selection, readable shopping metadata, direct empty-state actions, and compact destination-first pre-trip summaries.
- `browser/android-pwa-ui.spec.js` runs with an Android Chrome user agent, mobile viewport and touch input. It verifies manifest/maskable icons, Service Worker control after reload, offline BUILTIN startup, destination-first cards, Taiwan and walking URLs, deferred Ledger identity, empty Shopping/Ledger actions, and zero horizontal overflow/pageerror.
- `pwa-shell.test.js` requires install responses to be fully buffered before the all-resource barrier, preventing Chromium connection-pool deadlock while preserving the atomic cache-write boundary.

## v110 presentation-token and Today-module coverage

- `theme-system.test.js`, `ui-ux-hardening.test.js`, `browser/ui-ux-hardening.spec.js`, and `browser/today-live-info.spec.js` protect the compact typography／spacing／radius／action-role tokens, fixed pending／entry／Shopping status color roles, exact six-theme palette values, and unchanged computed presentation at 320／375／390px.
- `today-view-module.test.js` directly protects `TripTodayView.buildModel()`／`render()`／`actionFor()`: immutable input, blank category → `未分類`, six-Unicode-code-point visible cap, full accessible stop name, product-name privacy, generic fallback, and the no-DOM／storage／clock／repository boundary.
- Production wiring tests require `today-view.js` in the page and eleven-asset offline shell inventory, remove the former inline Hero helper／markup authority, and retain exact Today Shopping targeting and interaction behavior in Chromium and WebKit.
- `ledger-ui-state.test.js` remains the executable Ledger boundary. The v110 deletion-test decision is documented at `docs/architecture/ledger-history-deletion-test-v110.md`; no new Ledger runtime module or global store is expected.

## v109 navigation-feedback acceptance-fix coverage

- Successful exact-target announcements remain in a visually hidden polite live region, so no 「已定位」 row or layout gap appears. Missing-target feedback retains the visible modifier and Render diagnostic.
- Real launcher coverage records the 1000ms active phase, 200ms fading phase, final intent cleanup, and reduced-motion direct clear at 320／375／390px with Tap／Enter／Space in Chromium and WebKit.

## v108 navigation／diagnostics／status-authority coverage

- `navigation-intent-module.test.js` directly protects the ES5 immutable create／request／consume／complete contract, exact five-view allowlist, safe unique tokens, stale completion, normalization, pending／active preservation, caller-mutation isolation, canonical retained shapes, and a separately owned consumed intent snapshot.
- `view-ui-state.test.js` and `render-note.test.js` protect the production DOM seam: explicit intent dispatch／consume, exact Shopping list／mall／Trip targets, missing-target Render diagnostics, token-guarded 1.2-second cleanup, and overlay-only `curView` behavior.
- `browser/today-live-info.spec.js` exercises Hero／badge target confirmation at 320／375／390px with tap／Enter／Space, sticky-safe geometry, live status, reduced motion, missing targets, stale timers, source scroll, connected／replacement／fallback focus, and blank-category behavior. Focused WebKit uses `--grep "target|定位|blank category"`.
- `browser/navigation-target-matrix.spec.js` exercises the actual expanded cluster-stop, pre-trip day, mall-floor, and back-to-now controls at 320／375／390px with rotating Tap／Enter／Space. It asserts exact target and live status, native keyboard focus, sticky-header-safe target／status geometry, 1.2-second clear, reduced-motion static treatment, zero horizontal overflow, and current-day return behavior. Run focused WebKit together with the existing Today target selection.
- `diagnostic-impact-module.test.js` and `diagnostics-app-log.test.js` protect exact timeout classification, conservative unknown handling, input immutability, escaped raw／projected output, and byte-for-byte raw copied reports; `browser/diagnostics-app-log.spec.js` verifies the same boundary in Chromium.
- `manifest-status-authority.test.js` plus `tools/check-doc-titles.js` require `.ai-manifest.json` to name `tasks/current.md` as the sole current-status authority, identify changelog／task archives only as history, reject stale `tasks/(current/backlog/done)`／`manifest.status` prose, and omit volatile candidate／next-action／automated-test snapshots. Current version authority is `shell/v112/app-version.js`／root `sw.js`; root `app-version.js` is the byte-locked v110 bridge.



> Bar 於 2026-07-09 核准:自此之後,**每次程式交付必附與修改範圍相符的可執行測試**,測試檔納入 repo 版控;「通過自動測試」以 repo 內可重跑的腳本為準,不接受口頭宣稱。三情境完整 QA 仍須另行驗證。

## 現有測試
- `manifest-status-authority.test.js`：驗證 `.ai-manifest.json` 僅宣告 `tasks/current.md` 為目前產品狀態權威，且不保留易過時的開發候選、下一步或自動驗證快照。執行：`node tests/manifest-status-authority.test.js`；repo gate：`node tools/check-doc-titles.js`。
- `atomic-sheet-sync.test.js`:驗證七張 Sheet 候選資料需整批驗證後一次啟用、舊快取遷移、失敗候選保留與同步狀態面板；v88 另鎖定健康 header 只顯示「已同步」但 aria 保留更新時間、其他狀態相對時間、最後完整同步時間、partial 失敗來源的人類可讀文案，以及舊快照 metadata 相容。執行:`node tests/atomic-sheet-sync.test.js`。
- `network-retry-toast-guard.test.js`：驗證 Sheet 首次抓取失敗後精確退避 800ms 且只重試一次、第二次錯誤維持可觀察，以及缺少 Toast DOM 節點時不拋錯、不改 action／timer，正常 Toast 行為不變。執行：`node tests/network-retry-toast-guard.test.js`。
- `app-now.test.js`:驗證正式時間、offset/custom 時間模擬與共用 `appNow()` 時鐘。執行:`node tests/app-now.test.js`。
- `app-log-buffer.test.js`：驗證 AppLog 六分類的 console 相容性、session-only FIFO 100 筆、單筆 1,000 字限制、defensive snapshot、clear，以及不寫入 AppLog 的 health finding 讀取路徑。執行：`node tests/app-log-buffer.test.js`。
- `diagnostic-impact-module.test.js`／`diagnostics-app-log.test.js`／`browser/diagnostics-app-log.spec.js`：驗證診斷面板以 display-only impact projection 顯示 raw session AppLog，精確 Ledger timeout 才採 degraded／CSV fallback，其他 warning 保守顯示；raw 與投影皆 escape，複製報告保持原始 bytes。Browser 另鎖定清除、stored entry 不變、團體帳測試模式區塊已移除，而設定控制頁與 TEST universe 保持可用。執行：`node tests/diagnostic-impact-module.test.js tests/diagnostics-app-log.test.js`、`npx playwright test tests/browser/diagnostics-app-log.spec.js`。
- `home-safety.test.js`:驗證首頁行程日完整顯示、Scroll-only 政策與高風險清除操作的確認防線。執行:`node tests/home-safety.test.js`。
- `home-simplification.test.js`:驗證首頁版面高度、下一站取消邏輯、串點子卡簡化與購物清單保留。執行:`node tests/home-simplification.test.js`。
- `ios-zoom-guard.test.js`:驗證 iOS 16px 字級、Scroll-only／viewport 還原、SW 版次，以及最小 no-op 雙擊相容性監聽器不復活舊雙擊 guard 或 APP build metadata。執行:`node tests/ios-zoom-guard.test.js`。
- `preview-date.test.js`:驗證預覽日期參數與 `todayMD()` 使用同一模擬時間來源。執行:`node tests/preview-date.test.js`。
- `pwa-shell.test.js`:驗證 PWA 入口、manifest、Service Worker、Netlify 設定與圖示資產完整性;2026-07-30 起改鎖新版 SW 契約(頂層 `SW_VERSION`、`CACHE_NAME` 由它推導、不得 importScripts、install 用 `cache:'reload'`、fetch 用 `cache:'no-cache'`、只有 navigation 才 fallback `index.html`)；另鎖 `buy-to-ledger.js`、`ledger-ui-state.js` 與 `shopping-ui-state.js` 同時由頁面載入並納入離線 App Shell。執行:`node tests/pwa-shell.test.js`。
- `app-version-fallback.test.js`:`app-version.js` 載不到時的降級契約。涵蓋 `appVersion()`／`appVersionLabel()` 的回退值、`renderSettingsDataPage()` 在無 `APP_VERSION` 時仍可算出資料健康區塊與 HTML(顯示「SW 未知」而非 ReferenceError),以及 `index.html` 不得在安全取值區塊外裸讀 `APP_VERSION`。執行:`node tests/app-version-fallback.test.js`。
- `trip-presentation.test.js`:驗證行程類型標籤與行程頁呈現規則。執行:`node tests/trip-presentation.test.js`。
- `hotel-hid-linkage.test.js`／`browser/hotel-hid-linkage.spec.js`：驗證住宿停靠點只以正規化 HID 精確解析 Hotel profile、缺失或懸空 HID 安全退回 `null`、天氣住宿解析共用同一 resolver，以及兩個不同交通時間的 PID 可共用同一 Hotel profile；Browser 另以 320／375／390px 真實渲染住宿資訊面板並鎖定無水平 overflow。執行：`node tests/hotel-hid-linkage.test.js`、`npx playwright test tests/browser/hotel-hid-linkage.spec.js`。
- `schema-types.test.js`:驗證 Places.Type 必要中文輸入值的正規化結果,並確認 `index.html` 內嵌 Schema 已同步。執行:`node tests/schema-types.test.js`。
- `render-note.test.js`:備註條列渲染、下一站卡、MAPCODE、明日預告等元件渲染回歸測試(Node 內建 assert,從預覽 HTML 抽函式驗證)。執行:`node tests/render-note.test.js`(於 repo 根目錄)。
- `pick-next-stop.test.js`:下一站時間判斷與自動略過過期項目的邏輯回歸測試(2026-07-09 新增,涵蓋「今天按過任一完成後就卡住不推進」的修復)。執行:`node tests/pick-next-stop.test.js`
- `trip-progression.test.js`：驗證下一站選擇、cluster blocker、一次性 auto-skip progress 調和、通知與 input immutability。執行：`node tests/trip-progression.test.js`。
- `parent-first-stop-cluster.test.js`:驗證父列地點納入第一站、兩站成卡、controller ID，以及 Day 1–6 共 12 組已知父子行程的引用順序。執行:`node tests/parent-first-stop-cluster.test.js`。
- `data-reference-consistency.test.js`:驗證行程餐廳顯示名稱與 RID 指向餐廳不一致時 health check 會告警。執行:`node tests/data-reference-consistency.test.js`。
- `ios-viewport-resume.test.js`:驗證 iOS 回前景時還原 viewport、清除舊 transform 並保留捲動位置。執行:`node tests/ios-viewport-resume.test.js`。
- `ios-gesture-diagnostics.test.js`:驗證 document 僅註冊一個 passive no-op `dblclick` 相容性監聽器、舊手勢診斷識別字已退役，並保留桃子診斷入口、健康檢查、時間模擬、viewport recovery 與重置行程進度；另驗證診斷面板「App 版本」列讀自真實 Cache Storage（`index.html` 不得寫死版本號，讀不到須顯示「無法讀取」）。執行:`node tests/ios-gesture-diagnostics.test.js`。
- `travel-notes.test.js`：驗證診斷面板內的本機旅途紀錄新增、編輯、狀態、確認刪除、200 筆上限、寫入失敗回滾、文字／JSON 複製匯出、健康摘要脈絡，以及舊版 WebKit 無 `crypto.randomUUID()` 時的唯一 ID fallback。執行：`node tests/travel-notes.test.js`。
- `theme-system.test.js`：驗證六組主題的 13-token、亮色對比率、杉綠 action 精確為 `#2F6B4F` 且白字達 AA、焙茶維持 `#896748`、reduced-motion、舊變數角色對映、未知 ID 回退、原子切換、迷你介面卡、五個功能 Emoji 精準替換為 SVG，以及目前版本加前四版的恰好五筆 release-note 視窗。執行：`node tests/theme-system.test.js`。
- `ui-ux-hardening.test.js`：驗證渲染失敗的可執行重試、Today daybar 隱藏、flex header、44px 觸控目標、照片失敗 inline status／單一健康入口、toast live region，以及下一站 Enter／Space 鍵盤啟動。執行：`node tests/ui-ux-hardening.test.js`。
- `settings-grouped-root.test.js`／`browser/settings-grouped-root.spec.js`：驗證設定根頁三個常駐群組（個人／記帳／資料）的順序與歸屬、各列摘要格式與降級、既有子頁入口、身分列可存取名稱，以及測試模式條件列；v88 另鎖定行程、團體帳、個人本機帳與照片的集中健康摘要及注意項目計數。Browser 另驗證「自訂項目」三類即時數量入口、單類管理頁、兩層返回、鍵盤 Enter／Space、CRUD 後留在原頁、`個` 的預設／不可刪除契約，以及六主題與 320／375／390px 無溢位或控制重疊。執行：`node tests/settings-grouped-root.test.js`、`npx playwright test tests/browser/settings-grouped-root.spec.js`。

- `ledger-dashboard.test.js`：驗證分帳首頁摘要、個人／團體軌與期間切換；v88 鎖定今日支出為主值、旅程累計為次值，並確認團體帳使用「與我相關」脈絡而非全團誤導文案。執行：`node tests/ledger-dashboard.test.js`。
- `ledger-225.test.js`：驗證 Ledger 日期群組、顯示單元、選取／批次展開與最近消費 renderer；v98 後續鎖定個人／團體單筆卡第一行「品項／代購或付款分攤」、第二行「店家／類別／免稅／TEST／待同步／鎖帳或更正」，所有清單卡隱藏付款方式；另覆蓋個人／團體批次父卡嚴格兩行、品項／免稅／代購數、單一／多位／缺少付款人的「分攤依品項」摘要及展開子項。執行：`node tests/ledger-225.test.js`。

- `ledger-settlement-reliability.test.js`:結算可靠性總測試。涵蓋 durable delivery bridge(原子交接、持久性、只在遠端讀回同一 `record.id` 才清除、不自動過期)、事件全序與同毫秒競態、跨裝置 confirm／reject 收斂與 losing response inert、狀態機文案與按鈕不復原、退回後重新付款開新 generation、已確認收款的 10 秒一次性復原（資格六項條件、9,999／10,000／10,001ms 邊界、無效或未來 `response.time`、已復原、後續 generation、連點五次只一筆 deletion、歷史不得輸出永久撤銷／復原按鈕）、ledger fast pull 增量與非 JSON 降級、polling 兩層退避與生命週期、待處理徽章、簡易結算模式與時鐘偏移。執行:`node tests/ledger-settlement-reliability.test.js`。
- `ledger-settlement-correction.test.js`：結算後不可改寫與引導式更正總測試。涵蓋 claim／canonical confirm 建立位置保護切點、正式／TEST 隔離、confirm 復原、多人收據、永久保護、完整版本投影、commit-last 缺件 inert、重複更正、整張作廢、跨裝置 canonical／losing conflict、不合法 ID／時間事件 fail-closed 與分類診斷、付款人／原因守門、刪改阻擋、action model、品項變更揭露，以及已全數還款後更正產生的新餘額差；v103 後續另鎖定相同無效更正事件在重複投影時只寫入一次 session AppLog，而顯式 warning sink 仍逐次收到完整診斷。一般編輯 stale-DOM 與更正預覽事件 fingerprint 的 UI 守門另由 `ledger-list-actions.test.js` 鎖定。執行：`node tests/ledger-settlement-correction.test.js`。
- `ledger-correction-ui-state.test.js`：驗證 correction session 的 open/close、reason、preview、calendar、pending、request stale guard 與 ordered effects。執行：`node tests/ledger-correction-ui-state.test.js`。
- `runtime-assets.test.js`：驗證十二個 JavaScript runtime assets（含 generated BUILTIN、navigation intent、diagnostic impact 與 Today view）在入口、SW SHELL、README 與 `.ai-manifest.json` 的 build-time 登錄一致性。執行：`node tests/runtime-assets.test.js`；repo gate 亦可直接執行 `node tools/check-runtime-assets.js`。
- `ledger-list-actions.test.js`：除清單卡片、明細與操作選單外，驗證受保護收據只顯示「更正收據」、引導式更正 Sheet／預覽入口、整張作廢預覽後只保留單一最終確認、更正次數 badge、不可改寫歷史入口，以及完整紀錄保留作廢收據歷史；並鎖定個人代購沿用共用 renderer、位於近期消費第一行的 compact context seam，長內容只能截斷而不另起一行。執行：`node tests/ledger-list-actions.test.js`。
- `ledger-entry-p0.test.js`／`ledger-three-second-entry.test.js`／`browser/ledger-entry-quick-layout.spec.js`:驗證單品項新增消費的快速版面階層、`其他資訊（選填）` 單一入口與日期／類別／支付／備註摘要、團體分攤成員按需展開、個人代購欄位位置、個人／團體鍵盤 Next 聚焦、六主題次要底色的「儲存並再記一筆」及既有儲存 guard；Browser 另以真實 renderer 驗證代購／分攤展開與 320／375／390px 無水平 overflow。執行:`node tests/ledger-entry-p0.test.js`、`node tests/ledger-three-second-entry.test.js`、`npx playwright test tests/browser/ledger-entry-quick-layout.spec.js`。
- `ledger-calculator.test.js`／`browser/ledger-calculator.spec.js`：驗證 Ledger 共用金額計算器的安全四則 parser、優先序、除零／非法／safe integer 守門、single／item／discount 資料 target、既有 draft 更新入口；v94 另涵蓋小數 token、購物式 contextual percent、等號後續輸入、正數小數無條件捨去、浮點近整數校正、一般金額／折扣零值差異、五列四欄按鍵、44×44px 關閉／trigger、實體鍵盤、inert／焦點／scroll、取消不改值、即時換算，以及 320／375／390px 無水平 overflow。執行：`node tests/ledger-calculator.test.js`、`npx playwright test tests/browser/ledger-calculator.spec.js`。
- `ledger-draft-track-switch.test.js`：驗證 Ledger 個人／團體切軌的純轉換契約，包括單筆與多品項草稿 identity、逐項代購／分攤隱藏狀態、採買 item／allocation source IDs、首次進入另一帳本的預設值、輸入 immutability、錯誤退化與 UI handler 保留 Sheet 位置。執行：`node tests/ledger-draft-track-switch.test.js`。
- `personal-state-restore-matrix.test.js`:個人狀態備份 **v1–v9 還原矩陣**。逐版本以代表性 payload 驗證還原後 localStorage 的實際內容與缺欄位預設值(不是只驗版本號被接受);涵蓋 qty→結構化數量與 buyFor→allocations 的遷移、v<8 保留裝置現有主題／單位／旅途紀錄(夾帶新欄位也不生效)、採買單位的 6 字上限／不可重複／「個」自動補回、未來版本一律拒絕、以及任一驗證失敗時裝置狀態一字不動。**刻意注入 index.html 的真實 store 實作**,與用簡化假 store 的 `settings-backup-ux.test.js` 分工不同(後者驗 UX 流程)。契約文字見 `docs/personal-state-compatibility.md`,兩者不一致即為缺陷。執行:`node tests/personal-state-restore-matrix.test.js`。
- `shopping-ledger-links.test.js`:採買清單 ↔ Ledger 持久關聯。涵蓋 v1～v7 Shopping Item → `allocations[]` 正規化、allocation-level append-only `ledgerLinks`／`releasedAt`、個人／團體三態與 item 聚合狀態（`未記帳`／`記帳 2／3`／`已記帳`／`狀態待確認`）、queue／bridge／replacement／confirmed tombstone／universe、逐 allocation source→record 一一對應與原子回寫、已買多選 preflight、逐人部分購買與 split-group 原需求重建、部分購買卡片入口契約、明細合併狀態列與 footer action 完整矩陣、原生 disabled 待確認狀態、狀態感知需求文案、allocation 編輯鎖定、刪除警告人數、個人狀態備份 v8 版本契約／v1～v7 還原／未知版本拒絕，以及來源 item／allocation IDs 不得進入 Ledger 21 欄。執行:`node tests/shopping-ledger-links.test.js`。
- `buy-to-ledger-characterization.test.js`：鎖定 Shopping → Ledger 持久化 → allocation link 原子回寫 → 表單收尾的既有流程；涵蓋單筆／多筆、個人／團體、失敗降級、再記一筆、編輯隔離與 production adapter dependency surface。執行：`node tests/buy-to-ledger-characterization.test.js`。
- `buy-to-ledger-module.test.js`：直接驗證 `buy-to-ledger.js` 的純 domain／workflow interface，包括 linked／unverified 推導、來源準備、draft／commit plan、source-to-record 一一對應、append／release 歷史不變量、結構化 outcome、輸入不可變與模組不得讀 DOM／storage globals。執行：`node tests/buy-to-ledger-module.test.js`。
- `ledger-ui-state.test.js`：直接驗證 `ledger-ui-state.js` 的 canonical defaults、seed 正規化、不可變 transition、track／history／filter／selection state table、invalid action fail closed、filter count 與 production／recording adapter 共用的 ordered effect workflow。執行：`node tests/ledger-ui-state.test.js`。
- `ledger-entry-ui-state.test.js`：直接驗證同一 `ledger-ui-state.js` 對 create／edit entry session 的 state ownership、語意型 lifecycle／track／validation／save／calendar actions、pending 與 stale session/request guards、Ledger／Shopping return context，以及 save-close／add-another 的 ordered effects。執行：`node tests/ledger-entry-ui-state.test.js`。
- `ledger-ui-state-wiring.test.js`／`browser/ledger-ui-state.spec.js`／`browser/ledger-entry-workflow.spec.js`：驗證 production history 與 create／edit handlers 都透過同一 workflow dispatch、module 納入頁面與離線 App Shell、session-only 狀態不進備份；Browser 涵蓋歷史 filter／selection、entry create／edit、validation／commit failure、重複 submit、calendar、返回位置、Buy-to-Ledger、calculator cleanup 與 correction compatibility，以及 320／375／390px 無水平 overflow。執行：`node tests/ledger-ui-state-wiring.test.js`、`npx playwright test tests/browser/ledger-ui-state.spec.js tests/browser/ledger-entry-workflow.spec.js`。
- `shopping-ui-state-characterization.test.js`：在抽 seam 前後執行真實 public handlers，鎖定切 tab、進出多選、單項選取、目前分頁全選／取消全選，以及 render 後恢復 focus 的 legacy 行為。執行：`node tests/shopping-ui-state-characterization.test.js`。
- `shopping-ui-state.test.js`：直接驗證 `shopping-ui-state.js` defaults、seed normalization、不可變 tab／selection transitions、visible-ID 去重與 stale 清除、invalid action fail closed，以及 production／recording adapter 共用的 ordered effects。執行：`node tests/shopping-ui-state.test.js`。
- `shopping-ui-state-wiring.test.js`：驗證 runtime 與離線 App Shell 載入 module、production projection adapter 只擁有 `tab`／`selectionMode`／`selected`、已遷移 handlers 不再直接 mutation，且 UI state 不進個人備份。執行：`node tests/shopping-ui-state-wiring.test.js`。
- `shopping-list.test.js`:採買清單 store 正規化與封閉分類（代購不再是分類）、多對象新增與共用名單、每人／總數摘要、姓名-only 代購 badge／淡金類別 badge、部分購買 eligibility、卡片／明細／selection 事件邊界、Today 歸組與逐 allocation Buy-to-Ledger prefill；另涵蓋 `1 個`／單位契約、**站點排序＋exact 必買穩定置頂**（四類待買群組與 Today、已買頁不變）、孤兒 `stopRef` 三態、pending／done 明確 page context，以及**獨立新增／編輯 Sheet** 的 session、item-ID 返回錨點、明細返回、save guard、錯誤留場與「儲存並新增」同步品名焦點。v89 鎖定消費／採買共用代購 markup、escape、aria，以及姓名 10.5px／「幫、買」9.5px。執行:`node tests/shopping-list.test.js`。
- `shopping-remerge.test.js`:採買拆分安全反向回併。涵蓋正常 2＋3、逐 canonical 對象加總、原 item／store order allocation ID 保留、原 ID 與未受影響 order、仍有已買 sibling、欄位差異、active／unverified／released 等任意 ledger 歷史、legacy、溢位、重複對象、自己／代購混用與原 item 缺失；另驗證 `moveBackToPending(ids)` 單次 read／normalize／write、跨 group 批次、缺 ID／write 失敗零變更、精確 Toast，以及 checkbox、批次移回與完成 Toast 復原共用同一 Store 操作；成功批次 UI 另鎖定透過 Shopping UI workflow reset selection。執行:`node tests/shopping-remerge.test.js`。
- `shopping-photo-store.test.js`:裝置本機照片模組。驗證圖片尺寸等比例縮放與不放大、圖片類型／25 MiB 輸入上限、Blob metadata 列舉、有效／遺失／孤立附件稽核、一天清理邊界、容量分類與 quota 錯誤，以及經 driver 邊界實際 put／get／remove 後 Blob 與 ID 的生命週期。執行:`node tests/shopping-photo-store.test.js`。
- `browser/shopping-photo.spec.js`:以 Chromium 真實 Canvas／IndexedDB 驗證採買單張照片選取、壓縮、重載持久化、卡片只顯示無文字迴紋針、遺失附件警示與修復、容量不足降級、設定頁附件容量／清理管理、一天孤立照片背景清理、六主題文字對比、詳情全畫面查看、頂部 safe-area 與向下滑關閉、備份排除，以及 320／375／390px 水平 overflow、console error／pageerror 為 0。執行:`npx playwright test tests/browser/shopping-photo.spec.js`。
- `navigation-location.test.js`:行程導航純函式契約。驗證 Places／Restaurants 明確目的地不帶 origin、一般名稱帶有效目前座標、無效／缺少座標退回「名稱＋日本」、drive／transit URL 與缺失 day／item 安全降級。執行:`node tests/navigation-location.test.js`。
- `browser/navigation-location.spec.js`:驗證既有單一導航按鈕的點擊行為；一般名稱只在點擊時請求一次定位並帶入 origin、拒絕定位退回日本搜尋、明確 reference 不掛定位 handler，且不新增「精確地點／附近搜尋」可見文字。執行:`npx playwright test tests/browser/navigation-location.spec.js`。
- `ui-font.test.js`:驗證首屏不載入或 preconnect Google Fonts，全站使用裝置內建繁中 font stack，且不含 Hiragino／Noto Sans JP／Yu Gothic。執行:`node tests/ui-font.test.js`。
- `browser/ui-ux-hardening.spec.js`：以 Chromium 驗證 Today 隱藏 daybar、header flex、同步／設定／Day chip／購物 filter 的 44px 實際高度、16px 完成／跳過、六主題亮色與文字對比、杉綠／焙茶 computed action 色，以及 reduced-motion behavior。執行：`npx playwright test tests/browser/ui-ux-hardening.spec.js`。
- `browser/today-live-info.spec.js`：驗證 Today Hero 精確排除目前下一站或 cluster child，由下一站 badge 獨占該站待買；Hero 顯示第一個 future `順路採買` 的地點、第一優先分類與 +N，visible／aria 均不含品名，unbound／orphan 混合狀態保留通用採買入口，並覆蓋 stopRef、Enter／Space、focus-visible、採買錨點與不誤觸導覽。另以 320／375／390px 驗證 Hero Shopping 寬高至少 44px、長地點與長分類各自單行 ellipsis、下一站 badge 44×44、無重疊、Hero／ticket 幾何與水平 overflow。執行：`npx playwright test tests/browser/today-live-info.spec.js`。
- `browser/data-observability.spec.js`：以 320／375／390px 驗證個人／團體單筆與團體批次父卡只有兩個 left-aligned single-line row、垂直置中、長內容 ellipsis 且不與右側金額重疊；清單隱藏付款方式但消費明細仍顯示，團體父卡顯示「付款人 · 分攤依品項」，子項保留精確分攤與狀態。另覆蓋狀態配色、健康同步 header、partial 來源與設定頁資料健康摘要。執行：`npx playwright test tests/browser/data-observability.spec.js`。
- `browser/proxy-inline.spec.js`：以長品名、長代購姓名驗證最近消費、完整紀錄、個人批次父卡／展開子項與採買卡均保留正確代購語意；Ledger 單筆與批次卡隱藏付款方式、嚴格維持兩行截斷及 compact 字級，Shopping 卡維持原樣，兩者皆不與金額／操作欄重疊且無水平 overflow。執行：`npx playwright test tests/browser/proxy-inline.spec.js`。
- `browser/trip-three-scenarios.spec.js`：Playwright 三情境 QA。以真實 App 啟動流程驗證①斷網時採用內建快照、②完整 mock Sheet 連網同步產生 online 快照、③固定旅行日 `Date` 後今天頁落在 Day 1；三情境皆要求 `pageerror=0`。執行：先 `npm ci`、`npx playwright install chromium`，再 `npm run test:browser`。
- `builtin-snapshot.test.js`／`builtin-snapshot-asset.test.js`：直接執行 generated asset 與既有 runtime parser，鎖定格式、版本、stable key order、岡山 Day 1–6、非空公開資料、TripConfig 八 key、無東京／新宿，以及 Ledger 僅有 schema 推導的 21 欄空 header。執行：`node tests/builtin-snapshot.test.js`、`node tests/builtin-snapshot-asset.test.js`。
- `builtin-snapshot-refresh.test.js`：驗證 BUILTIN 刷新工具不請求 live Ledger、preview no-write、明確 `--write`、HTML／asset 雙檔 staging、read-back 與 failure rollback、版本錯配、無漂移與來源失敗保留原始 bytes。測試只使用本機 fixtures，不連 Google。執行：`node tests/builtin-snapshot-refresh.test.js`。
- `ledger-member-visibility.test.js`:團體帳本「只顯示與目前成員相關紀錄」。涵蓋付款人 × 分攤成員四象限(含**付款人不在 participants 內的代墊紀錄仍須顯示**)、`participants` 缺欄／`null`／空陣列／非 JSON／非陣列／含非字串／已是陣列共七種舊格式的限定式 fail-open 與不拋錯、fail-open 不擴散、成員無法解析時的安全退化(三種輸入)與診斷訊號、姓名格式變動仍以 `canonicalMemberName()` 穩定 key 判定、筆數與總額只計過濾後紀錄、最近消費／完整紀錄頁／主卡片同源、八個消費端共用 `ledgerTrackRecords()`、編輯與刪除路徑各自重查同一判斷、結算仍讀全團事件流、不得新增範圍切換 UI。執行:`node tests/ledger-member-visibility.test.js`。
- `apps-script-settings.test.js`:除既有 `doPost` 設定與分帳寫入契約外,另涵蓋唯讀 `doGet` ledger 加速層契約(`after` 正規化、`after >= total` 不呼叫 `getValues()`、`after > total` 回 `reset` 與全量、精確 21 欄 range、不取 `LockService`、不洩漏內部資訊)。執行:`node tests/apps-script-settings.test.js`。

> 測試以 `vm` sandbox 執行 `index.html` 內的程式片段。**注意**:sandbox 內建立的陣列具有不同 realm 的 prototype,`assert.deepStrictEqual` 會因此失敗;比較這類結果請改用 `join()`／`plain()`(JSON round-trip)。切片用的起訖字串只是取樣邊界,不是行為契約 —— 搬動函式位置時一併更新即可。

## 待建
- 打包前離線回歸(SW 快取)腳本。

## Sanity CI(2026-07-09 起)
- `.github/workflows/qa.yml` 於 `main` push / Pull Request 自動執行：①`tools/check-doc-titles.js`（文件標題／檔名一致性＋manifest JSON）②`tests/` 內全部 `*.test.js` ③Playwright 三情境。`dev` push 目前先執行相同本機 CI，是否納入 workflow 另見 backlog。
- 上傳/commit 後到 GitHub 的 **Actions** 頁看結果:綠勾=通過;紅叉=點進去看哪個檔案錯位或哪個測試失敗。

## 規則
- 測試只依賴 Node 內建模組或 devDependency 明列的工具;引入新測試框架屬技術棧變更,走五段提案。
- 測試檔命名:`<對象>.test.js` / `<情境>.spec.js`;測試不得修改任何來源檔。
- **目前版本一律由 `tests/support/version.js` 推導,不得在測試檔硬編碼**。歷史 release note、migration fixture 與已淘汰 cache 名稱的負向斷言例外,保留原字面。
- Playwright:`tests/browser/trip-three-scenarios.spec.js`(斷網內建／連網同步／旅行日 mock Date)與 `tests/browser/sw-update-cache.spec.js`(SW 更新後快取內容正確性、無混版本、離線完整載入、子資源未命中不得收到 `index.html`；後者自帶 `support/versioned-server.js`,刻意送 `max-age=600` 模擬 GitHub Pages,用 `no-store` 的 `static-server.js` 測不出該缺陷)。執行:`npm run test:browser`。
- `browser/shopping-select-all.spec.js`：驗證採買多選只全選目前待買／已買分頁、全選／取消全選文字與焦點、切頁清理、卡片 body 只切 selection、批次成功沿用既有操作，以及 store failure／刪除取消保留 selection；另涵蓋 320／375／390px 單列觸控控制。執行：`npx playwright test tests/browser/shopping-select-all.spec.js`。
- `browser/buy-to-ledger.spec.js`：以真實 App、個人 repository、團體 durable queue 與 Shopping store 驗證單筆／多筆記帳閉環、驗證失敗、保留採買 overlay、link 回寫失敗不重複建立消費，以及 linked／unverified／unlinked 混合明細在點擊前即顯示合併狀態、原因與 disabled 等待按鈕。執行：`npx playwright test tests/browser/buy-to-ledger.spec.js`。
