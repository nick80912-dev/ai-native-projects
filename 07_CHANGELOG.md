# 07 版本紀錄

## 2026-08-13 — v111 產生式 BUILTIN 與測試吞吐（candidate）⭐ 架構變更

- BUILTIN 改為由 `tools/refresh-builtin-snapshot.js` 產生的 `shell/v111/builtin-snapshot.js`；root HTML／App version byte-lock 為 v110 bridge，v111 document／version／snapshot 採 immutable generation path，只有 v111 worker install 驗證成功後才接管導覽。
- preview-first 工具新增 deterministic serializer／parser、版本錯配與 stale 偵測、HTML＋asset 雙檔 fsync／read-back／rename transaction，以及跨 rename failure 的 byte-for-byte rollback。Ledger 不抓 live CSV，維持 schema 21 欄 header。
- asset 缺失／錯版時，valid local active／previous snapshot 可 degraded boot；沒有有效 local snapshot 時顯示非空白 recovery（重新載入／複製診斷），不建立空 DB、不啟動背景同步。mixed-version、installed offline reopen 與 Pages-style cache generation focused Playwright 7/7 通過。
- 可重算效能證據固定 inline `d0405fe` 與 immutable bridge asset `83e4d2b`：DCL 中位數 181.10 → 185.65 ms（+2.51%），Today 中位數 171.70 → 175.75 ms（+2.36%）；所有樣本記錄 HTML／App／asset／SW／timestamp identity，通過 ≤10% kill gate。
- Playwright worker 實驗的三輪 2-worker 歷史結果早於手動 performance page 的 pageerror tracking，不符合固定 adoption rule；依核准 fallback 保留全環境 single worker、zero retries，完整證據見 `docs/qa/playwright-worker-experiment-v111.md`。
- Release review 改以 exact origin/main v110 network-first worker fixture 驗證一次性 bridge：成功升級後 v111 immutable document 接管；mixed install 失敗時舊 index／App version／schema cache body 完全不變。current tree 通過 Node **93/93**、Chromium **182/182**（single worker、357.6 s、zero retries/pageerrors/port conflicts），以及版本／文件／12 項 runtime asset／BUILTIN／performance evidence／JSON／diff checks。
- 本批仍在本機 `dev` 完成合併前 hardening；push dev、PR、main merge、Netlify production verification 尚待執行，未建立 tag。

## 2026-08-13 — v110 UI 一致性與 Today 模組拆分（released）⭐ 架構變更
- PR #14 發布門檻補強：行程分頁上方 Day chip 改走頁內 `selectTripDay()`，切日後於重繪完成的 animation frame 回到該日頂端，不再建立定位高亮或 live-status；Today 跨頁 `gotoDay()`、exact item、Shopping 與回到現在的定位提示維持不變。Linux Chromium 對 1px 隱藏狀態框的 sub-pixel 計算與 reduced-motion scheduler margin 僅放寬測試容差，產品 CSS 與 1000ms hold 不變。

- 在六組主題之外新增精簡的呈現 token：字級 `11／12／14／20／24px`、間距 `4／8／12／16／24px`、圓角 `6／10／14／999px`，以及 primary／secondary／quiet／destructive 操作角色與 diagnostic 狀態角色。只替換 Today、導覽回饋、診斷及共用按鈕的等值 literal；六組 13-token palette 與既有 computed 視覺方向不變。
- 新增 production-used ES5 UMD `today-view.js`，以 `buildModel()`／`render()`／`actionFor()` 統一 Today Hero 採買摘要的 `未分類` 顯示 fallback、Unicode 六字可見截斷、完整 accessible name、既有 markup 與宣告式開啟採買行為。`index.html` 保留 reminder 選取、目前站排除、Shopping store／clock／repository 與 DOM effect，並刪除被取代的 inline helper／renderer，沒有第二份 production authority。
- Ledger history candidate 依刪除測試否決：filter、group、selection effect ordering、row action policy 與 focus-preserving partial DOM patch 已分別集中於既有 seam；另建 `ledger-history-view.js` 只會增加 pass-through interface。v110 因此不新增全域 store、controller、event bus 或框架，也不改 Ledger entry、settlement、calculator、correction、Schema、record、repository 或同步語意。
- 正式 release review 補上 ADR 0018，永久記錄 Navigation Intent、Diagnostic Impact 與 Today Hero Shopping seam；同時修訂較早設計文件中過寬的 Today ownership 文字，使其與後續核准實作計畫一致。quiet action 與本批新增的固定狀態色改由 `:root` 語意 token 接線，computed 色彩、字級與圓角保持等值，六組 theme palette 未改。
- `today-view.js` 已登錄 page、十一項 runtime asset inventory、SW SHELL、README 與 manifest；App／SW forward-bump 至 **v110**，cache strategy 與 lifecycle 不變。最近更新維持 v110–v106 恰好五筆。
- TDD 證據包含 token RED→GREEN、Today module missing-file RED→GREEN，以及 production wiring 的 exact-output 回歸。Fresh pre-commit 與 committed-tree gates 均通過 Node **87/87**、完整 Playwright **176/176**、focused WebKit **39/39**、App／SW v110、文件標題、11 項 runtime assets、BUILTIN no-drift、manifest JSON 與 diff checks；committed-tree 離線 Chromium 為 `{"source":"builtin","healthCheck":[],"appLogCount":9,"pageErrors":[]}`。focused WebKit 首輪曾有一筆 reduced-motion timer 序列波動；單獨 1/1、連跑 10/10 與原樣整組重跑 39/39 均通過，未放寬 assertion、未加 retry、未改產品碼。fresh fetch 證明 `origin/dev` 無 remote-only commit，v110 runtime／release commit `49f8e8c` 已推送且當時 `origin/dev...dev = 0 0`；本節交付證據提交後再次同步 `dev`。不合併 `main`、不部署 production、不建立 tag。

## 2026-08-13 — v109 定位成功提示精簡（candidate）

- v108 真機驗收時，Bar 確認 exact-target 定位本身正確，但成功後插入的「已定位：地點」灰底列與已醒目的目的地重複。v109 移除這個可見成功列及其布局空間；成功文字仍保留在 visually-hidden `role="status" aria-live="polite"`，找不到目標的提示與 Render diagnostic 仍可見／可追蹤。
- 目標立即醒目並完整維持 1000ms，再以 200ms 淡化回各自原本的卡片／群組樣式；`prefers-reduced-motion: reduce` 在 1000ms 後直接清除。exact target、sticky-safe geometry、Shopping overlay 的 scroll／focus return、stale token 防護與 session-only intent state 不變。
- 先確認 RED：成功提示仍佔 294–349px、缺少 fade phase、reduced motion 仍等到 1200ms、失敗提示無獨立可見狀態。GREEN 後 `render-note` **1/1**、focused Chromium **25/25**、focused WebKit **25/25**。新鮮的交付前 gate 通過 top-level Node **86/86**、完整 Playwright **175/175**、focused WebKit **25/25**；App／SW v109、文件標題、10 個 runtime assets、BUILTIN no-drift、manifest JSON 與 diff checks 均通過，離線 Chromium probe 為 `{"source":"builtin","healthCheck":[],"appLogCount":10,"pageErrors":[]}`。提交後仍須重跑 committed-tree gate，再交付 `dev`；Bar device／PWA 驗收仍待進行。
- App／SW 依 forward-bump 契約同步升至 **v109**，更新說明維持 v109–v105 恰好五筆；SW lifecycle／cache strategy 不變。原排定 v109 的 UI semantic tokens／Today module 順延為 v110，原 v110 BUILTIN／test-throughput spike 順延為 v111；兩批功能均未混入本修正。
- Committed-tree 再驗證通過 Node **86/86**、完整 Playwright **175/175**、focused WebKit **25/25** 與離線 Health；合併後 Node 亦為 **86/86**。fresh fetch 證明 `origin/dev` 無 remote-only commit，v109 候選 `ea1e91a` 已 fast-forward 推送至 `dev`，推送後 `origin/dev...dev = 0 0`。尚未合併 `main`、部署 production 或建立 tag；只待 Bar 手機／PWA 驗收。

## 2026-08-13 — v108 到站定位、診斷影響與狀態權威（candidate）⭐ 架構變更

- 新增 ES5 `navigation-intent.js` session-only state seam；Today Hero、下一站 Shopping badge、Shopping mall 與既有 day／item 精確入口共用 request／consume／complete。Shopping list 維持 overlay 且不改 `curView`，intent 不進 storage、備份、Queue、CMS 或 Ledger。
- `index.html` adapter 負責把明確目的地捲到 sticky header 下方、顯示 1.2 秒 `.is-navigation-target` 與 polite live status。採買 overlay 關閉後回復來源 scroll 與 launcher／replacement／來源 tab focus；目標遺失則開啟正常位置、顯示非阻擋提示、寫入 Render diagnostic 且不 throw。
- 新增 ES5 `diagnostic-impact.js` display-only projection；診斷面板補上 `info`／`degraded`／`action-required`、影響與 fallback，且只把精確的 Ledger 增量 timeout 說明為 CSV 降級。stored AppLog、複製 raw report、Health Check、retry、Queue 與同步語意均不變。
- `.ai-manifest.json` 改以 `manifest_format: "2.29"` 表示格式並只用 `current_status.authority` 指向 `tasks/current.md`；移除易過期的產品狀態 snapshot。App Shell 由 v107 forward-bump 至 **v108**，最近更新維持 v108–v104 恰好五筆；未加入新版提示，未修改 Schema、Google Sheet、Apps Script、Ledger／Shopping 資料語意、`main`、部署或 production tag。
- Final whole-branch review remediation converts expanded cluster stops and pre-trip day cards to native buttons with visible focus rings; every remaining explicit target now has a 320／375／390px Tap／Enter／Space acceptance matrix. Navigation Intent clones and normalizes retained state at every transition and returns a non-aliased consumed snapshot. Manifest governance now names `tasks/current.md` alone as current authority, while changelog／task archives remain history; ADR 0016 delegates asset count entirely to `runtime-assets.json`.
- Fresh final-fix pre-commit release gate passed **86／86** top-level Node tests, full Playwright **175／175**, and focused WebKit **21／21**. App／SW v108, document titles, 10 runtime assets, BUILTIN no-drift, manifest JSON, `git diff --check`, and the established offline Chromium probe also passed with `healthCheck: []` and `pageErrors: []`. The final-fix implementer re-runs these gates on the committed tree; push／origin sync and Bar device／PWA acceptance remain outside this implementation handoff.
- Final whole-branch review returned strict PASS. After a fresh fetch confirmed zero remote-only commits, the reviewed candidate fast-forwarded and pushed to `dev`; `origin/dev` and local `dev` matched at `c5e9ad2` immediately after delivery. Bar device／PWA acceptance remains pending, and v109 stays gated.

## 2026-08-12 — v107 Today Hero 未分類提示（dev candidate）

- Today Hero 遇到空白採買分類時，明確顯示 `未分類`；多項採買仍顯示 `+N`，可見與無障礙文字皆不包含品名。
- `未分類` 僅是 renderer 顯示 fallback，不加入分類選項，也不改寫 reminder/model、Shopping store、表單、備份、還原或同步資料；原始 `category: ''` 保持不變。
- v106 的地點六字截斷、分類與數量完整顯示、4px 緊湊靠右、44px 點擊區、鍵盤／觸控操作與對應地點定位均維持不變。
- App Shell 由 v106 forward bump 至 **v107**；未修改 Schema、Ledger、Apps Script、Google Sheet、`netlify.toml`、`main`、正式部署或 production tag。
- TDD renderer RED→GREEN；focused Node 3／3、Chromium Today suite 18／18、WebKit touch case 1／1 已通過。Release 前 fresh full gate 為 **83／83** Node test files、Playwright **150／150**（0 failed），另通過 v107 版本、8 runtime assets、BUILTIN no-drift、文件標題、manifest JSON、offline `healthCheck(): []`、`pageErrors: []` 與 `git diff --check`。

## 2026-08-12 — v106 Today Hero 採買摘要緊湊靠右（dev candidate）

- 依 Bar 裁定，Hero 採買下排由比例分欄改為單一緊湊右對齊群組；地點、分隔點、第一優先分類與 `+N` 以 4px 間距排列，不再產生過大的中間空白。
- 地點超過六個 Unicode code point 時顯示前六字加 `…`；320px 若仍不足可再縮短地點。分類與 `+N` 不縮排、不省略，完整地點仍保留在 `aria-label`。
- `順路採買`／`今日採買`、分類選擇、品名隱私、exact-next-stop 排除、通用入口、44px 點擊區、鍵盤操作與 Shopping 錨點均維持不變。
- App Shell 由 v105 forward bump 至 **v106**；未修改 Schema、Shopping store、Ledger、Apps Script、Google Sheet、`netlify.toml`、`main`、正式部署或 production tag。
- TDD renderer／CSS RED→GREEN 與 focused browser 17／17 已通過；fresh full gate 為 **83／83** Node test files、Playwright **149／149**（0 failed），另通過版本、8 runtime assets、BUILTIN no-drift、文件標題、manifest JSON、offline `healthCheck()`、pageerror 與 `git diff --check`。

## 2026-08-12 — v105 Today Hero 採買分類預覽（dev candidate）

- 依 Bar 裁定，v104 的品名預覽改為 `地點 · 第一個優先分類 +N`；`+N` 仍代表其餘待買品項數，不是分類數，單一品項不顯示 `+N`。
- 分類來自既有 exact `必買` 穩定置頂後的第一筆；Hero visible markup 與 accessible name 均不再包含品名。空白分類安全退回只顯示地點，無多餘分隔符或數量。
- 地點維持主要資訊，分類為次要資訊；320／375／390px 保持雙 ellipsis、單行、44px 點擊區與無水平 overflow。`順路採買`／`今日採買`、exact-next-stop 排除、通用入口、錨點與鍵盤操作不變。
- App Shell 由 v104 forward bump 至 **v105**；未修改 Schema、Shopping store、Ledger、Apps Script、Google Sheet、`netlify.toml`、`main`、正式部署或 production tag。
- TDD 的 model／renderer RED→GREEN 與 focused browser 17／17 已通過；Fresh full gate 為 **83／83** Node test files、Playwright **149／149**（0 failed），另通過版本、release-note 五筆視窗、8 runtime assets、BUILTIN no-drift、文件標題、manifest JSON、production-data `healthCheck()`、pageerror 與 `git diff --check`。

## 2026-08-12 — v104 Today Hero 採買品名預覽（dev candidate）

- Active-trip Today Hero 的採買摘要改為 `地點 · 第一個優先品名 +N`；單一品項不顯示 `+N`，空白品名安全退回只顯示地點。
- 第一個品名沿用既有 exact `必買` 穩定置頂與 store order，不新增排序；`順路採買`／`今日採買`、exact-next-stop 排除、通用入口、點擊錨點與鍵盤操作均維持不變。
- 地點維持主要資訊，品名為次要資訊；兩者在 320／375／390px 都保持單行 ellipsis、44px 點擊區與無水平 overflow。Accessible name 同時包含地點、第一品名與總待買數。
- App Shell 由 v103 forward bump 至 **v104**；`app-version.js`／`sw.js` 同步，未修改 Schema、Shopping store、Ledger、Apps Script、`netlify.toml`、`main`、正式部署或 production tag。
- TDD 先驗證 model／renderer／responsive RED，再完成 GREEN。Fresh gate 通過 **83／83** Node test files、Playwright **149／149**（0 failed），另通過版本一致性、5 筆 release-note 視窗、8 個 runtime assets、BUILTIN no-drift、文件標題、manifest JSON、production-data `healthCheck()` 與 `git diff --check`。

## 2026-08-12｜Ledger 更正診斷去重（dev，SW v103 未升版）

- **根因**：2026-08-11 除錯報告中的資料問題只有四種唯一訊息，但 Ledger 更正投影會被摘要、餘額與畫面重繪路徑反覆呼叫，四則訊息因此各寫入 25 次並填滿 100 筆 session AppLog。
- **最小修正**：只在 `ledgerCorrectionDataWarning()` 的隱式 AppLog 出口以完整訊息做 session warn-once；不同 record ID／root／原因仍各留一筆。清除 AppLog 不重設去重集合，重新載入 App 後才重新開始記錄。
- **資料與診斷邊界**：無效更正仍 fail-closed，不進有效收據、餘額或歷史；顯式傳入 projection 的 warning callback 仍在每次呼叫取得完整訊息。通用 AppLog、Queue、delivery bridge、settlement、correction projection、Schema、Apps Script 與 Ledger 資料均未修改。
- **外部核對**：2026-08-12 重新讀取公開 Ledger CSV 與 Apps Script `GET ?action=ledger&after=0`，兩者皆為 17 筆且均不含報告中的七個 ID；因此沒有改寫 live Sheet。附件事件屬當時／裝置事件集合，本批只修正重複診斷。
- **TDD 與完整 Gate**：附件四種事件的測試先以實際八筆、預期四筆正確失敗；最小修正後 focused tests 全綠。Fresh gate 通過 **83／83** Node test files、Playwright **149／149**（0 failed），並通過文件標題、App／SW v103 一致性、8 個 runtime assets、BUILTIN no-drift、manifest JSON 與 `git diff --check`。維持 v103，不動 `app-version.js`、`sw.js`、`netlify.toml`、`main`、部署或 production tag。

## 2026-08-11 — v103 Today Hero actionable summary (dev candidate)

- Today is a calm travel briefing rather than a KPI panel: weather uses an itinerary-date-aware outing hint, and the next eligible Shopping stop is the actionable primary copy.
- `順路採買` projects the first future eligible Shopping group while `今日採買` remains the general fallback; the exact next stop remains owned by its existing badge.
- The scope is active-trip Today only. v102 device/PWA acceptance is complete; data, schema, storage, Service Worker behavior, deployment authority, and production state are unchanged.
- Automated evidence: fresh v103 gate passed 83/83 Node test files and 149/149 Playwright cases; document-title, app-version, runtime-assets, BUILTIN no-drift, manifest JSON, and diff checks passed.


## 2026-08-11｜住宿停靠點改以 HID 精確關聯 Hotel profile（dev，SW v102）⭐ 架構變更

- **Sheet migration**：公開 Places 尾端 L 欄新增 `HID`；`L4／L15／L24／L33／L42` 讓 P002／P013／P022／P031／P040 各引用 H001,其餘 HID 儲存格皆空。五筆 travel 原樣保留為開車30分鐘／開車2小時／開車3分鐘／開車50分鐘／步行3分鐘；五個 PID 不能合併,因為其行程位置與交通脈絡不同。
- **Schema 3.0 與資料關係**：`schema.js` 及 inline Schema 同步為 `3.0 (2026-08-11)`,Places 尾端 `HID` 映射 `hotelId` 並以 `hotelid／住宿id` 容錯；Hotels 名稱明定只供顯示。`09_SCHEMA_MAPPING.md` 由 `schemaDoc()` authority 重生。關係是 `Places(Type=住宿).HID → Hotels.HID` 的 N→1,不是名稱 join,也不是 PID join。
- **條件驗證與離線種子**：Validator 在七表原子候選快照中要求住宿必填 HID、非住宿禁止 HID、任何 HID 必須存在於 Hotels；違規時 fail closed。BUILTIN 由已核准公開 Sheet 刷新,五個住宿 PID 都帶 H001 並保留各自 travel；Ledger 種子仍只有 schema 推導的 21 欄空 header。
- **單一 runtime resolver**：`hotelOf(place)` 對 Places／Hotels 的 HID 去空白並轉大寫後精確解析；缺失或懸空 HID 回傳 `null`,不再以住宿名稱、子字串或 `DB.hotels[0]` fallback。天氣住宿解析亦委派同一 resolver；不同 PID 可共用同一 H001 profile object。
- **v101 驗收與 v102 世代**：Bar 已於 2026-08-11 明確確認 v101 裝置／PWA 外觀驗收完成。`app-version.js` 與 `sw.js` 原子升至 v102,`sw.js` 除版本行外不變；App 最近更新維持五筆,加入 v102 並只移除最舊顯示的 v97。
- **驗證與非目標**：v102 最終 fresh gate 為 **83／83** Node test files、完整 Playwright **148／148**（0 skipped、0 failed；含住宿 320／375／390px 的 **3／3**）；runtime asset、文件標題、App／SW v102 一致性、BUILTIN no-drift、manifest JSON 與 `git diff --check` 亦通過。本批不改 Ledger 位置式 Schema 2.9／21 欄、Apps Script、個人備份 v9、SW lifecycle／cache／offline fallback、`netlify.toml`、`main`、Netlify 部署或 production tag。

## 2026-08-10｜移除 SW 更新提示與杉綠配色區隔（dev，SW v101）

- **產品決策**：v99／v100 雙版本實驗後，Bar 確認「新版已就緒」事件與使用者已看到新版內容的時機可能不同步，且必要性不足；v101 完整移除常駐提示、observer、一次性 guard 與明確 reload action，不以 Toast、banner、badge 或自動 reload 取代。backlog #24 以取消而非完成功能歸檔。
- **杉綠區隔**：杉綠只把第一層 `--t-action` 由棕色 `#7A4F24` 改為林下青 `#2F6B4F`；chrome、accent、其餘 12 個 token、焙茶 `#896748`、其他主題、語意角色與元件 CSS 不變。白字對 action 對比 6.29:1。
- **PWA 與資料邊界**：`app-version.js`／`sw.js` 同步升 v101；`sw.js` diff 僅版本一行，`skipWaiting()`、`clients.claim()`、SHELL、install／activate／fetch、cache mode、offline fallback 全部不變。未修改 Ledger／Shopping、repository、schema、資料／備份格式、`PERSONAL_STATE_VERSION=9` 或 `netlify.toml`。
- **驗證與交付**：完整 gate 為 **82／82** Node test files、Playwright **145／145**；另通過 runtime asset、文件標題、App／SW v101 一致性、manifest JSON 與 `git diff --check`。本批只 push `dev`，不 merge `main`、不 deploy、不建立 tag。

## 2026-08-09｜Service Worker 真實換版驗收目標（dev，SW v100）

- **雙版本第二階段**：Bar 已確認目標實機由 v99 controller／cache 接管，因此依既定閘門另建 v100，作為 v99→v100 真實更新提示目標。`sw.js` 與 `app-version.js` 只做正常版本遞增，最近更新維持五筆。
- **接管競態補強**：完整 gate 的重複瀏覽器基線發現低頻時序：既有 registration 已有 active worker，但 reload 新文件在 `load` 當下 controller 暫晚，舊 guard 會誤當首次安裝。eligibility 現在同時辨識初始／目前 controller 與既有 active registration；真正首次安裝沒有 active worker，仍不提示。
- **生命週期與資料邊界不變**：未修改 `skipWaiting()`、`clients.claim()`、SHELL、install／activate／fetch handler、HTTP cache bypass、離線 fallback、reload 觸發條件、Ledger／Shopping、repository、schema、資料格式或備份。只有使用者點擊「立即更新」才 reload。
- **驗收閘門**：Node 新增 active-registration／late-controller 回歸；同一真實瀏覽器案例修正前 20 次可穩定重現 1 次失敗，修正後連續 30／30 通過。v100 只 push `dev`；backlog #24 在 Bar 實機確認提示、點擊前不自動 reload、點擊後版本／cache 為 v100 前維持未完成。

## 2026-08-09｜Service Worker 新版就緒提示（dev，SW v99）

- **常駐更新提示**：新版 Service Worker 完成啟用並接管既有頁面後，底部導覽上方顯示「新版已就緒／立即更新」。提示獨立於短暫 Toast，不會自動消失或被一般操作訊息永久取代；z-index 低於表單／明細 overlay，使用者可先完成輸入再更新。
- **不強制刷新**：`updatefound` 只用來追蹤 installing worker，必須等到 `activated` 或 `controllerchange` 才提示；只有點擊「立即更新」才呼叫 reload。首次安裝、安裝失敗、重複 state／controller 事件與缺少提示 DOM 都不刷新、不阻斷 App。
- **快取策略不變**：`skipWaiting()`、`clients.claim()`、SHELL、install／activate／fetch handler、HTTP cache bypass 與離線 fallback 完全不變；`sw.js` 與 `app-version.js` 同步升為 v99。
- **TDD 與兩世代驗證**：Node 行為測試鎖定 first-install suppression、一次性提示與 explicit-only reload；versioned-server Browser 測試實際完成 gen1→gen2 更新，確認點擊前頁面仍是 gen1、點擊後 App／schema／cache 收斂至 gen2，並驗證 320／375／390px 與既有離線契約。v99 只 push `dev`；必須等 Bar 實機載入並確認 v99 controller 後，才能另建 v100 真實更新目標。

## 2026-08-09｜BUILTIN 岡山快照刷新與可重複 SOP（dev，SW v98 未升版）

- **離線種子更正**：`index.html` 的 BUILTIN 已由東京／新宿舊資料刷新為目前公開的岡山四國六天五夜；現行 runtime 可解析 Day 1–6，places／restaurants／shopping 均非空。移除 BUILTIN 後方的 legacy cfg append 與 8 欄 Ledger overwrite，現在只有一個完整八 key 快照。
- **Ledger／cfg 安全契約**：刷新工具永不請求 live Ledger；Ledger 只由 `schema.js` 產生 21 欄 header 且沒有紀錄。TripConfig 八個必要 key 各出現一次，不再以後置 append 補欄。公開 Sheet 使用 schema 已登記 alias（目前 Places `交通時間`）仍可通過，其餘欄位數量與順序維持 fail closed。
- **安全工具與 SOP**：新增 `tools/refresh-builtin-snapshot.js`；預設只讀 preview，有漂移以 exit code 2 回報，只有明確 `--write` 才經同目錄暫存檔、原子替換與回讀驗證更新。抓取、schema 或內容驗證任一失敗都不改原檔。完整觸發時機、權責、指令與回滾邊界寫入 `16_OPS_PLAYBOOK.md` §G。
- **TDD 與邊界**：工具測試鎖定不抓 Ledger、preview no-write、invalid source 保留 bytes、aliases、legacy mutation 移除與參數契約；正式 characterization test 直接執行 `index.html` 最終 BUILTIN 並沿用 runtime parser。旅程三情境 Browser 回歸 3／3 通過。未修改 Google Sheet、schema、資料格式、parser、renderer、SW 或版本號；只 push `dev`，不 merge／deploy／tag。

## 2026-08-09｜採買明細記帳狀態與按鈕收斂（dev，SW v98 未升版）

- **進度語意修正**：採買清單仍是個人、本機資料；明細的記帳進度改以 allocation 對應的 Ledger「筆」計算，不再以「位／對象」暗示付款人或團體成員。付款人與分攤仍只在 Ledger 表單決定。
- **狀態欄合併**：移除獨立「記帳進度」列，既有「狀態」改為「採買狀態 · 記帳摘要」，單筆顯示 `已買 · 未記帳／已記帳／待確認`，多筆顯示 `已買 · 已記帳 N／總數 筆`；含待確認時列出各類筆數。逐 allocation 紀錄、明細導航與「改回未記帳」不變。
- **動作與 preflight 一致**：未開始使用「記帳」，部分完成使用「繼續記帳（剩 N 筆）」；任何 allocation 待確認時，改在點擊前顯示原生 disabled「等待狀態確認」及同步原因，不再出現可點擊但隨後被 workflow 阻擋的矛盾入口。
- **TDD 與邊界**：Node 真實 model／renderer 與 Browser 混合狀態測試先讀到舊 `已買` 而正確失敗，最小 presentation seam 修改後 focused Node 及 Playwright 7／7 通過。未修改 Shopping store、照片 repository、Buy-to-Ledger domain／workflow、Ledger repository、schema、localStorage、備份、SW 或版本號；只 push `dev`，不 merge／deploy／tag。

## 2026-08-09｜關閉未來 TEST 模擬版 localStorage 前綴隔離待辦（文件治理）

- Bar 裁定從正式 backlog 移除品質批 #2 最後一項「未來 TEST 模擬版 localStorage 前綴隔離」，不實作。
- 現行正式站與 dev 測試站分屬不同 origin，自動測試使用隔離環境，診斷時間模擬已有快照／還原與備份防呆；repo 亦禁止提交同源 TEST HTML，因此目前沒有需要前綴隔離的實際執行路徑。
- 同步更新 `tasks/backlog.md`、`tasks/current.md`、`tasks/done.md` 與 `.ai-manifest.json`；未修改 runtime、localStorage key、資料格式、SW 或版本號。
- Breaking Change：無。

## 2026-08-09｜Ledger 清單隱藏付款方式與多品項兩行摘要（dev，SW v98 未升版）

- **付款方式降至明細**：個人／團體 dashboard、完整紀錄、單筆卡、批次父卡與展開子項皆不再顯示付款方式；`record.payMethod`、消費明細「支付方式」、完整紀錄支付方式篩選、表單、匯出與儲存完全保留。
- **單筆兩行不變**：第一行收斂為「品項名稱 → 個人代購／團體付款與分攤」，第二行維持「店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次」。內容靠左、行內與整個兩行區塊垂直置中，右側雙幣金額維持固定。
- **多品項父子層級**：個人父卡兩行顯示收據標題與品項／免稅／代購數；團體父卡另以 neutral compact tag 顯示「[付款人]付款 · 分攤依品項」，多人依 encounter order 去重、缺付款人不虛構姓名。展開後子項保留各自代購／分攤與狀態。
- **TDD 與邊界**：Node／Browser 先分別因單筆 `現金`、批次 `現金` 與舊三列父卡正確失敗；最小 renderer／CSS 修改後 focused Node 與 Playwright 3／3 通過，320／375／390px 驗證兩行、靠左、垂直置中、ellipsis、子項縮排及金額無重疊。未修改 Ledger domain、repository、Queue、Apps Script、settlement、correction、schema、CSV、localStorage、備份或 Shopping UI；維持 v98。

## 2026-08-09｜Ledger 近期消費卡嚴格兩行收斂（dev，SW v98 未升版）

- **固定資訊順序**：個人與團體近期消費卡統一為兩行；第一行依序為「品項名稱 → 付款方式 → 個人代購／團體付款與分攤」，第二行依序為「店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次」。批次父卡不變，展開子項沿用同一 recent-record renderer。
- **嚴格兩行與截斷**：renderer 改為明確的 primary／secondary row；兩行皆禁止換行，長品項、店家／類別、代購／付款分攤與狀態以 ellipsis 截斷，不產生第三行或水平 overflow。右側雙幣金額與操作選單維持原欄位。
- **字級與配色**：個人代購保留原 coral 語意但縮為 compact 字級；團體付款／分攤、已鎖帳與已更正維持原 neutral `line-soft`／`ink-soft` 配色；待同步維持原黃色。鎖帳與更正的既有互斥條件、所有狀態文案與資料判定均未改。
- **TDD 與邊界**：Node renderer／mobile contract 與 Browser 測試先因缺少兩行 DOM／CSS 正確失敗，最小實作後 focused Node 與 Playwright 3／3 通過；320／375／390px 驗證 exactly-two rows、single-line、ellipsis、緊湊高度、無文字／金額重疊與配色一致。未修改 Ledger domain、repository、Queue、Apps Script、settlement、correction、schema、CSV、localStorage、備份格式或 Shopping UI；維持 v98，只 push `dev`。

## 2026-08-09｜Ledger 近期消費卡資訊階層微調（dev，SW v98 未升版）

- **團體資訊同行**：團體近期消費卡沿用既有「我／姓名付款 · 全員／N 人分攤」計算與文案，但由下方 badge 移到品項名稱旁，視覺權重比照個人卡既有「幫 [姓名] 買」標記；舊位置不再重複。待同步、TEST、已更正、已鎖帳與免稅 badge 維持原位。
- **店家與類別同列**：個人與團體卡統一顯示「店家 · [emoji] 類別」，支付方式獨立留在下一列；沒有店家仍顯示類別，沒有支付方式不輸出空白列。批次展開子項沿用同一 renderer，因此同步套用。
- **TDD 與手機版面**：Node 真實 renderer 先因舊店家／類別順序失敗，Browser 再以真實卡片重現；最小 markup／CSS 修改後，Ledger focused Node tests 與 Browser 3／3 通過，並於 320／375／390px 驗證個人／團體卡沒有文件、卡片、body 溢位或文字／金額重疊。
- **邊界與交付**：未修改付款／分攤計算、participant parsing、Ledger domain、repository、Queue、Apps Script、settlement、correction、schema、CSV、localStorage、備份格式或 Shopping 卡片。完整 gate 為 **80／80** Node test files、Playwright **144／144**；維持 v98，只 push `dev`，不 merge `main`、不 deploy、不建立 production tag。

## 2026-08-09｜Sheet 重試退避與 Toast 降級保護（dev，SW v98 未升版）

- **短暫網路故障緩衝**：`fetchSheet()` 第一次失敗仍寫入既有 Sync log，之後精確等待 800ms 才執行原本唯一一次重試；首次成功不安排 timer，第二次失敗仍直接向 snapshot orchestration 拋出第二次錯誤，不新增第三次嘗試。
- **呈現層安全降級**：`toast()` 找不到 `#toast` 時立即返回，不改動 `toastAction`、`toastTimer` 或呼叫其他 presentation effects，避免缺少非必要提示節點時中斷同步／儲存等業務流程；節點存在時的訊息、class、action 與 duration 行為不變。
- **TDD 與邊界**：新增正式函式 characterization tests，先分別重現缺少 800ms delay 與 null dereference，再做兩行最小修正；相鄰同步、Ledger Toast 與 Browser 11／11 回歸通過。未修改 `FETCH_TIMEOUT`、CSV 驗證、snapshot orchestration、資料格式、renderer、schema、SW lifecycle／cache strategy 或 runtime 版本。
- **交付狀態**：完整 gate 為 **80／80** Node test files、Playwright **144／144**，另通過 runtime asset、文件標題、App／SW v98 一致性、manifest JSON 與 `git diff --check`。本批只 push `dev`，不 merge `main`、不 deploy、不建立 production tag；v99／v100 仍保留給 SW 更新提示雙版本驗收。

## 2026-08-09｜AppLog session 診斷與面板精簡（dev，SW v98 未升版）

- **有界診斷能力**：`validator.js` 的 Schema／Parser／Data／Repository／Render／Sync 六類 `AppLog` 保留原 console level、前綴與完整訊息，同時保存本次 App session 最新 100 筆（FIFO、單筆最多 1,000 字）。`snapshot()` 回傳 defensive copy，`clear()` 只清記憶體，不寫 localStorage、IndexedDB、備份或遠端。
- **觀察不製造事件**：抽出無副作用 `currentHealthFindings()`；公開 `window.healthCheck()` 仍照常輸出 console 並經 `AppLog.data()` 報告，但開啟診斷面板只讀當下 findings，不再因查看面板重複加入 health log。
- **面板收斂**：桃子入口、App 版本、健康檢查、旅途紀錄、時間模擬與行程進度不變；新增 AppLog 筆數、最近紀錄、複製完整除錯報告與清除操作。所有畫面訊息經 HTML escaping，複製沿用既有 clipboard fallback。
- **移除測試模式區塊**：依 Bar 要求，診斷面板不再顯示「團體帳測試模式」或入口；`openTestModeSettings()`、設定控制頁、TEST 前綴、正式／TEST universe 隔離與 Ledger 行為全部保留並由 Node／Browser 回歸覆蓋。
- **TDD 與完整 gate**：新增 AppLog buffer、診斷報告 Node 契約及真實 Browser 互動；完整 **79／79** Node test files、Playwright **144／144** 通過。完整 Node gate 額外抓到新 timestamp 違反 `appNow()` 單一時鐘，修正為共用 app clock、standalone validator 無時鐘時安全留空後重新全綠。
- **邊界**：未恢復 iOS 手勢診斷，既有 passive no-op `dblclick` 相容監聽器保留；未修改 schema、資料格式、renderer、SW lifecycle／cache strategy、`app-version.js` 或 `SW_VERSION`，維持 v98。本批只 push `dev`，不 merge `main`、不 deploy、不建立 production tag。

## 2026-08-09｜UI workflow/state 1→4 架構模組化（dev，SW v98 未升版）⭐ 架構變更

- **1｜Shopping form session**：深化既有 `shopping-ui-state.js`，接管 `form`／`formSession`／`photoError` lifecycle；production adapter 成為唯一寫入點。Save、save-another 與 photo Promise 以 runtime session/request ID 防止 stale completion；validation/store/photo failure 保留 Sheet，store、IndexedDB photo repository、Buy-to-Ledger、資料格式、split 與 renderer 均留在原邊界。
- **2｜下一站一次性調和**：新增純 `trip-progression.js`，集中時間選擇、cluster blocker、stale classification 與 auto-skip next progress。`pickNextStop()` 只作 production adapter，同輪多項超時最多保存一次 `trip_next_stop_progress`、顯示一次 Toast，不重寫 checks 或既有 storage 格式。
- **3｜Ledger correction session**：深化既有 `ledger-ui-state.js`，讓 correction 與 create/edit 共用 session/request、calendar、mount/render/pending/return effects；open/close/reason/preview/save 全部走 semantic actions，刪除舊 `syncLegacyCorrectionSavePending` compatibility helper。Eligibility、receipt freshness、preview/domain builders、commit-last batch、repository、settlement、Apps Script 與 schema 未移入 UI module。
- **4｜Runtime asset authority**：新增 build-time-only `runtime-assets.json` 與 `tools/check-runtime-assets.js`，對八個 JS runtime assets 同時驗證實體檔、入口（`schema.js`／`validator.js` 沿用內嵌 exact-parity marker）、SW `SHELL`、README 與 `.ai-manifest.json`。未導入 bundler／generator／browser loader，未改 SW lifecycle、cache strategy 或 script order。
- **決策與測試替換**：新增 ADR 0013–0016 與四份設計／實作計畫；source-extraction／substring locks 只在正式 module interface、wiring 或 browser seam完整取代後移除。Fresh full gate 為 **77／77** Node test files、Playwright **143／143**，另通過 runtime asset CLI、App/SW v98 一致性、文件標題、manifest JSON 與 `git diff --check`。
- **版本與發布邊界**：`app-version.js`、`SW_VERSION`、`CACHE_NAME` 仍為 v98；v99／v100 繼續保留給 SW 更新提示雙版本驗收。本批只 push `dev`，不 merge `main`、不 deploy Netlify、不建立 production tag。

## 2026-08-09｜Shopping list tab／selection workflow／state seam（dev，SW v98 未升版）⭐ 架構變更

- **先 characterization 再抽 seam**：先只讀盤點 Shopping page filters、list tab、selection、批次操作、form、detail、photo 與返回脈絡；第一個垂直切片只涵蓋 list tab＋selection。新增 Node legacy characterization 與真實瀏覽器回歸，鎖定卡片 body 多選語意、批次 store failure 與刪除取消時保留 selection。
- **最小 production-used module**：新增 `shopping-ui-state.js`，公開 `createState(seed)`、`transition(state, action)` 與 `createWorkflow(adapter)`；唯一擁有 `tab`、`selectionMode`、`selected` 的 transition。Production adapter 先回寫既有 compatibility projection，再依序 clear split、render list、restore focus；public handlers 維持原名稱與 renderer markup。
- **成功／失敗邊界**：目前分頁全選只接受 caller 提供的 visible IDs，會去重並移除 hidden／stale selection。批次完成、移回、刪除與成功開啟 Ledger draft 後才 reset；store failure、preflight 阻擋與取消不 dispatch。Store、photo repository、Buy-to-Ledger domain、Ledger repository、資料格式、備份與 DOM renderer 均未移入 module。
- **離線與版本**：頁面載入新 module，SW `SHELL` 只新增 `./shopping-ui-state.js`；`app-version.js`、`SW_VERSION` 與 `CACHE_NAME` 維持 v98，未修改 SW lifecycle／cache strategy、`netlify.toml` 或 `PERSONAL_STATE_VERSION=9`。v99／v100 仍保留給 SW 更新提示雙版本驗收。
- **驗證**：focused Node gates 與 Shopping selection／list entry／Buy-to-Ledger／photo Playwright **30／30** 通過；最終 fresh full gate 為 **74／74** Node test files、Playwright **143／143**，另通過文件標題、App／SW v98 一致性、manifest JSON 與 `git diff --check`。

## 2026-08-08｜Ledger 新增消費快速版面（dev，SW v98）

- **方案 A 落地**：單品新增消費維持「金額 → 明細 → 代購／分攤 → 其他資訊 → 儲存」；團體帳的成員 chips 預設收成「全員 N 人／已選 N 人」摘要，點擊才展開既有選擇器。個人帳仍使用既有代購開關，只有啟用後才顯示對象。
- **選填資訊收斂**：原本分散的「其他資訊」「稅與優惠券」「更多細節」合併為單一入口，摘要改為「日期 · 類別 · 支付方式 · 有／無備註」；展開後仍保留店家、日期、時間、分類、支付、價格方式、稅率、優惠券與備註全部欄位及原計算語意。
- **操作權重**：「儲存」維持主要按鈕，單品「儲存並再記一筆」使用由各主題 action／card token 混合出的低彩度次要底色，保留 44px 觸控區、原 ID、pending guard 與 save workflow；多品項的操作樣式與欄位結構不變。
- **範圍與驗證**：未修改 Ledger schema、備份、repository、同步、分攤／代購計算、calculator、Service Worker 或版本字串。新增 Browser regression 覆蓋個人／團體、鍵盤焦點、分攤／代購／其他資訊展開、六主題次要按鈕底色及 320／375／390px 水平 overflow；完整 gate 為 **71／71** Node test files、Playwright **140／140**、文件／版本檢查、manifest JSON 與 `git diff --check` 通過。

## 2026-08-08｜更正收據操作列遮罩修正（SW v98）

- **真機回報**：更正多品項收據並展開收據資訊後，捲動內容會讓品項金額旁的計算機圖示穿透顯示在底部「預覽更正／整張收據作廢／取消」操作列上，容易被誤認為操作列的一部分。
- **最小修正**：根因是金額計算機入口具有局部 `z-index:1`，而 sticky Ledger 操作列沒有建立較高堆疊層。操作列改為 `z-index:2`，確保所有 Ledger sticky footer 都完整遮住捲過其下的表單內容；計算機入口本身、44px 觸控區與可編輯欄位位置不變。
- **TDD 與完整 gate**：新增 390×844 真實 renderer regression，建立多品項 correction、展開收據資訊並將計算機入口捲到操作列下方；修正前 hit-test 仍取得「開啟第 1 項金額計算機」，修正後操作列成為最上層且入口不再穿透。計算器與 correction 的針對性 Node tests 及 Playwright 4／4 通過；最終完整 **71／71** Node test files、Playwright **132／132**、文件／版本檢查、manifest JSON 與 `git diff --check` 全數通過。
- **相容與版本**：未修改更正內容、Ledger 計算、repository、settlement、同步、備份格式、schema、`PERSONAL_STATE_VERSION=9` 或 `netlify.toml`。`app-version.js`／`sw.js` 升為 v98，SW 僅修改版本字串；更新提示雙版本驗收順延至 v99／v100。

## 2026-08-08｜Ledger Entry Session workflow／state seam（SW v97）⭐ 架構變更

- **深化同一 module**：`ledger-ui-state.js` 在既有 dashboard／history state seam 上接管 create／edit entry session 的 lifecycle、draft／editing ownership、`savePending`、calendar 與 return context；公開 interface 維持 `createState(seed)`、`transition(state,action)`、`activeHistoryFilterCount(state)` 與 `createWorkflow(adapter)`，沒有建立第二份 entry state 或全域 store。
- **語意型 action 與 ordered effects**：open／close、切軌、validation、save requested／failed／succeeded 與 calendar 操作都由純 transition 維護 invariants，再由 production adapter 依序 mount、render、同步 pending、聚焦、恢復 context 與通知。save-and-add-another 保留 session／返回脈絡並沿用既有 `renderSplit()` dashboard 更新；save-and-close 完整清除 session。
- **非同步與回歸保護**：session／request ID 阻止重複 submit 與 stale completion 改寫新表單。Buy-to-Ledger 仍由原 domain／workflow coordinator 負責 commit 與 link 回寫；correction 保留明確 compatibility branch，calculator 仍由 entry unmount adapter 清理。
- **邊界不擴張**：帳務驗證、repository、record 建立、DOM rendering、同步、settlement、calculator state 與 Shopping UI state 均未移入 module。未修改 Ledger／Shopping schema、Apps Script、備份格式、`PERSONAL_STATE_VERSION=9` 或 `netlify.toml`。
- **架構與測試證據**：新增 ADR 0011、Node `ledger-entry-ui-state.test.js` 與 Browser `ledger-entry-workflow.spec.js`，並擴充 Buy-to-Ledger／calculator characterization。完整 **71／71** Node test files、Playwright **131／131**、`check-doc-titles`、`check-app-version`、兩份 manifest JSON 與 `git diff --check` 全數通過。
- **版本邊界**：`app-version.js`／`sw.js` 升為 v97，`APP_RELEASE_NOTES` 依五筆規則滾動；`sw.js` 除版本字串外不變，install／activate／fetch／skipWaiting／clients.claim 與快取策略均未修改。SW 更新提示雙版本驗收順延至 v98／v99。

## 2026-08-08｜發布 review 規格補正（SW v96）

- **照片 quota 直接處理**：保留 v78 已核准的 inline failure flow，不恢復獨立錯誤 overlay；quota-like 寫入失敗在原表單／修復 Sheet 內提供 44px「管理儲存空間」按鈕。修復流程會先關閉再進入設定的「照片健康狀態」，原 `photoId` 與採買資料維持不變；表單路徑前往設定時暫時 inert，關閉設定後可繼續原草稿。
- **等號後百分比**：修正 calculator evaluated-state 分支，讓 `%` 與四則運算子一樣可延續已完成結果；`1000 = %` 會形成 `1000%` 並顯示 10。數字仍在 `=` 後開始新算式，既有購物式 `1000−10%=900`、安全 parser 與套用時無條件捨去不變。
- **release review 文件收斂**：ADR 0010 依七段格式重整並加入 ADR index；`ledger-ui-state.js` 補入 README、架構、資料夾與 AI manifest 的 runtime／部署清單；真機驗收文件補記 Bar 於 2026-08-08 對 v88–v89、v92–v95 的累積核准。
- **版本與相容性**：`app-version.js`／`sw.js` 升為 v96，`APP_RELEASE_NOTES` 依五筆規則滾動；未修改 SW install／activate／fetch／skipWaiting／clients.claim、Ledger／Shopping schema、Apps Script、備份格式、同步、`PERSONAL_STATE_VERSION=9` 或 `netlify.toml`。SW 更新提示雙版本驗收順延至 v97／v98。
- **跨平台 release CI**：GitHub Linux Chromium 揭露購物搜尋框會受字型 metrics 影響量到 45px，而同列採買入口固定為 46px；搜尋框改以 `height:46px; box-sizing:border-box` 明確履行既有等高契約，不靠放寬測試掩蓋 1px 差異。
- **TDD 與完整 gate**：新增兩個 browser regression assertions，修正前分別因找不到「管理儲存空間」與 `1000 = %` 仍停在 `1000` 而失敗；最小修正後 targeted Playwright 2／2 通過。最終完整 70／70 個 Node test files、Playwright 124／124、`check-doc-titles`、`check-app-version`、兩份 manifest JSON 與 `git diff --check` 全數通過；Standards／Spec 複核確認原 findings 均已關閉。

## 2026-08-08｜Ledger UI 歷史瀏覽 workflow／state seam（SW v95）⭐ 架構變更

- **最小垂直切片**：把帳本軌切換、dashboard／完整紀錄、歷史搜尋／篩選／分組及多選狀態，從分散 direct mutation 收斂到 `ledger-ui-state.js`。entry draft、editing、correction、calendar、calculator、settlement 與 repositories 保留原位，避免大爆炸重構。
- **深 module interface**：production 與 tests 共用 `createState(seed)`、`transition(state, action)`、`activeHistoryFilterCount(state)` 與 `createWorkflow(adapter)`；transition 以不可變 state + ordered effects 隱藏跨欄位不變量，caller 不再自行記住每條返回／切軌路徑要清哪些欄位。
- **真實 seam**：production adapter 先 commit `ledgerUiState` 相容物件，再執行 close popover、render、partial filter-panel sync 與 scroll effects；Node recording adapter 透過相同 interface 驗證順序。無效 action fail closed，不 write、不 render。
- **UI／資料相容**：既有 public handler、inline markup、renderer、文案與手機版面不變；filter panel partial sync 保留搜尋 input DOM 與焦點。狀態仍為 session-only，不進 localStorage、個人備份、Ledger／Shopping schema 或同步 payload；`PERSONAL_STATE_VERSION=9`、`netlify.toml` 不變。
- **離線與版本**：`index.html` 載入 module，SW SHELL 納入 `ledger-ui-state.js`；SW 只正常升版及增加必要 App Shell asset，install／activate／fetch／skipWaiting／clients.claim 與快取策略未改。SW 更新提示雙版本順延至 v96／v97。
- **驗證**：完整 70／70 個 Node test files、Playwright 124／124、`check-doc-titles`、`check-app-version`、manifest JSON 與 `git diff --check` 通過；Browser 覆蓋 filter panel DOM／焦點連續性、搜尋／分組／清除、多選／全選、關閉／切軌重設與 320／375／390px 無水平 overflow。
- **Bar 驗收**：2026-08-08，Bar 確認 v88–v89、v92–v95 的畫面／真機確認皆已完成；此紀錄不代表已核准 merge、部署或建立 production tag。

## 2026-08-08｜Ledger 計算機小數、百分比與即時計算介面（SW v94）

- **參考圖五列四欄介面**：計算 Sheet 改為 `%／AC／退格／÷`、數字與四則運算、`.／0／00／=` 的手機計算機配置；標題列新增 44×44px 明確關閉鈕，底部保留取消與「套用金額」。完整算式與大字結果分層顯示，背景仍不可誤觸關閉。
- **小數與購物式百分比**：明確 tokenizer／operator stack 支援小數 literal 與 postfix `%`；`1000−10%=900`、`1000＋10%=1100`、`1000×10%=100`、`1000÷10%=10000`，連續加減百分比以當下累計為基準。未使用 `eval()` 或 `Function()`。
- **等號與套用分工**：`=` 只結算並保留 Sheet；之後輸入數字會開始新算式，輸入運算子則從結果繼續。螢幕按鍵與實體鍵盤共用 reducer，支援 Enter、Backspace、Delete、Escape 與 Tab focus trap。
- **小數安全套用**：顯示保留原始小數；套用正數金額時才無條件捨去，並先顯示「將套用 ¥N／NT$N」。浮點誤差容限內的近整數先校正，避免 `2.9999999999999996` 少一元；一般金額捨去為 0 時阻止，固定折扣維持可套用 0。
- **資料與相容範圍**：沿用 single／item／discount data target 與 live draft 寫回；未修改 Ledger／Shopping schema、Apps Script、同步、備份格式、帳務推導、`PERSONAL_STATE_VERSION=9` 或 `netlify.toml`。`sw.js` 只修改版本字串；SW 更新提示雙版本驗收順延至 v95／v96。
- **驗證**：68／68 個 Node test files、Playwright 123／123 全數通過；SW 更新／離線快取另連跑 10 輪共 20／20 通過。`git diff --check`、文件標題與 App／SW 版本一致性檢查均通過。

## 2026-08-08｜Buy-to-Ledger 垂直切片架構收斂（SW v93）⭐ 架構變更

- **先鎖行為再移動邊界**：新增 Shopping → Ledger → durable commit → Shopping allocation link 原子回寫 → 返回的 characterization 與真實瀏覽器測試，涵蓋單筆／多筆、個人／團體、驗證失敗、保留採買 overlay、再記一筆與 link 回寫失敗降級。使用者可見流程與文案維持不變。
- **純 domain module**：新增 `buy-to-ledger.js`，以 `createDomain({effectiveRecords})` 集中 linked／partial／unverified 推導、來源準備、draft plan、source-to-record commit plan 與 append-only link history。模組不讀 DOM、localStorage、sessionStorage 或 IndexedDB，輸入資料不就地修改。
- **workflow coordinator 與正式 seam**：`createWorkflow({domain,adapter})` 以 `start(intent)`／`commit(command)` 協調採買轉記帳；production adapter 仍掌管 DOM、個人 repository、團體 durable queue、Shopping store 與 Toast。一般 Ledger 新增／編輯不經此 seam，既有行為不變。
- **fail-safe 不變量**：個人帳必須完成本機 repository 寫入、團體帳必須取得 durable queue acknowledgement 後才原子回寫 Shopping link；Ledger 成功但 link 寫入失敗時不回滾、不重送 Ledger，保留既有明確警告。Shopping source ID 只存在草稿／協調命令，不進 21 欄 Ledger record。
- **離線與資料相容**：`buy-to-ledger.js` 納入 SW App Shell；`PERSONAL_STATE_VERSION` 維持 9，未新增 storage key，未修改 Ledger／Shopping schema、備份格式、Apps Script、`netlify.toml` 或 SW install／activate／fetch 策略。SW 更新提示雙版本驗收順延至 v94／v95。
- **驗證**：新增 `buy-to-ledger-characterization.test.js`、`buy-to-ledger-module.test.js` 與 `browser/buy-to-ledger.spec.js`；完整 **68／68** Node test files、Playwright **123／123**、`check-doc-titles`、`check-app-version` 與 `git diff --check` 通過。

## 2026-08-06｜Ledger 共用金額計算器（SW v92）

- **一套計算器覆蓋全部可編輯金額**：單品新增、個人／團體帳、編輯／更正、採買轉記帳與「儲存並再記一筆」均沿用同一個 Ledger renderer；多品項每列與優惠券／固定折扣欄亦使用相同計算器。匯率、稅率、日期時間、採買數量、分攤人數與系統推導結清金額不加入入口。
- **安全四則運算**：支援連續加總與 `＋、−、×、÷` 優先序，使用明確 tokenizer／operator stack，不使用 `eval()` 或 `Function()`。除以零、未完成算式、非法內容與超過 safe integer 的 token／中間結果均阻止套用；記帳金額必須為大於 0 的整數，折扣保留既有可為 0 的規則，任何小數都不四捨五入。
- **資料 target 而非 DOM target**：單一 `ledgerCalculatorState` 只保存 `{type:'single'}`、`{type:'item',key}` 或 `{type:'discount'}`。套用時重新解析目前草稿及 mounted input，再走既有 `updateLedgerDraftField()`／`updateLedgerDraftItem()`；不存在的 item key fail closed，不會把結果寫到別列。
- **手機操作脈絡**：44×44px 線條 SVG 入口位於金額 label 右側；底部 sheet 有四欄 keypad、完整算式、即時結果、清除、退格、取消與明確套用。開啟先 blur 原輸入以收起 iPhone 數字鍵盤並將背景 Ledger sheet 設為 inert；關閉恢復 scroll，套用與取消都把焦點送回原欄位，不關閉新增消費表單或清掉其他草稿。
- **窄螢幕與相容性**：Playwright 驗證 320／375／390px 的單品、多品項與折扣入口皆無水平 overflow，背景點擊不會誤關閉。Ledger schema、同步、備份格式與帳務推導不變；`PERSONAL_STATE_VERSION` 維持 9，`netlify.toml` 未修改。`sw.js` 只修改版本字串；原排定的 SW 更新提示雙版本驗收由 v90／v91 順延為 v93／v94。
- **測試**：新增 `ledger-calculator.test.js` 與 `browser/ledger-calculator.spec.js`。完整 **66／66** Node test files、Playwright **117／117**、`check-doc-titles`、`check-app-version` 與 `git diff --check` 通過。

## 2026-08-03｜消費與採買代購標記同行（SW v89）

- **消費卡減少一行**：個人帳代購紀錄不再於品名下方另外顯示「代購 姓名」badge，改為緊接品名的「幫 [姓名] 買」。最近消費、完整紀錄與批次展開子項使用同一個 renderer，因此位置與語意一致；批次父卡仍保留「N 項代購」摘要。
- **與採買卡共用呈現**：抽出 `renderProxyTargetMarkup()`，消費卡與採買卡共用姓名 escape、完整 aria-label、多人採買與 `+N` 片段。姓名 badge 維持 10.5px；「幫／買」固定 9.5px，降低視覺競爭。
- **窄螢幕安全**：消費品名區改為可換行 flex title row，代購標記只在左側內容欄換行，不侵入右側金額與操作鈕。Playwright 以長品名、長姓名驗證 320／375／390px 的最近消費、完整紀錄、批次子項及採買卡均無水平 overflow。
- **相容與範圍**：不改明細、篩選、Ledger record、Shopping allocation、同步、備份或 schema；`PERSONAL_STATE_VERSION` 維持 9，`netlify.toml` 未修改。`sw.js` 只變更版本字串，未改生命週期或快取策略。
- **測試**：Node 鎖定共用 renderer、HTML escape、aria、DOM 位置、舊 badge 移除及 9.5／10.5px 契約；新增 Playwright `proxy-inline.spec.js`。完整 **65／65** Node test files 與 Playwright **115／115** 通過；`check-doc-titles`、`check-app-version`、`git diff --check` 全數通過。

## 2026-08-03｜資料可感知性（SW v88）

- **分帳首頁一眼分清今天與整趟**：沿用單一摘要卡，不增加獨立卡片。大字主值固定為今日支出與筆數，卡片底部顯示旅程累計；個人帳使用「今日支出／旅程累計」，團體帳使用「與我相關 · 今日消費／與我相關旅程累計」，避免把目前成員可見範圍誤讀成全團總額。今日無消費時顯示 `¥0`，不再另疊重複提示。
- **同步時間與失敗來源可讀**：正常狀態的 header 保持精簡「已同步」，不在旁邊常駐分鐘數；按鈕 aria 仍保留完整更新時間。partial／failed／offline 才在 header 帶相對時間，跨日後回到精確日期時間。同步面板分開呈現本次資料更新時間、最後完整同步時間與未更新來源；partial 顯示人類可讀的「分帳資料」，不再只顯示技術 key。前景每分鐘更新狀態，未改時間模擬或同步觸發頻率。
- **設定頁資料健康摘要**：`資料與版本` 頂部集中顯示行程資料、團體帳、個人帳與照片四列狀態；根頁摘要顯示「資料狀態正常」或「N 項需注意」。離線本身不列異常；partial／failed、團體帳待送出與照片引用損壞才計入注意項。個人帳明確標示「僅此裝置」。
- **相容與範圍**：同步快照只新增向後相容的 `lastCompleteAt`／`sourceCreatedAt` metadata，不新增 localStorage key，不升 `PERSONAL_STATE_VERSION`，不改 Sheet schema、資料格式或快取策略。`sw.js` 只變更版本字串；`netlify.toml` 未修改。
- **文件收斂**：Bar 確認 v74–v87 真機驗收皆正常，Release Gate 已更新；原 backlog #23「12 月東京行接入」因行程已結束而關閉，不實作、不占用版本。
- **測試**：新增 Node 行為契約與 Playwright `data-observability.spec.js`，涵蓋個人／團體文案、今日／累計、同步相對時間、partial 來源、設定健康摘要及 320／375／390px 無水平溢位。完整 **65／65** Node test files 與 Playwright **114／114** 通過；`check-doc-titles`、`check-app-version`、`git diff --check` 全數通過。

## 2026-08-03｜身分選擇器層級與同分頁回頂（SW v87）

兩個真機回報的 UI 缺陷，先重現查證再修改。

### A. 身分選擇器被設定頁遮住

- **實測根因**：`settingsOverlay` computed `z-index:170`、`memberOverlay` `130`；中心點 `elementFromPoint` 落在 `settingsOverlay`。兩者都是 `body` 直接子節點、`position:fixed`、`display:block`、`visibility:visible`、`opacity:1`、`transform:none` —— **沒有 stacking context 干擾，純粹是 z-index 反了**。來源是共用規則 `.settings-overlay,.member-overlay{z-index:130}` 後又由 `.settings-overlay{z-index:170}` 單獨提高。
- **修法**：疊層寫成具名 token。**基準層維持 130**，只在「從設定頁叫出」時加 `.over-settings`（180，落在既有 170 與 185 之間）。
- **為什麼不全域抬高**：第一版直接把 `.member-overlay` 提到 180，**造成 6 個既有 Playwright 測試回歸** —— `.shopping-list-overlay` 是 145，開著的身分選擇器會蓋住整個 App 並攔截採買清單的點擊。基準層低於採買清單是既有且刻意的關係，不該被順手改掉。
- **背景不可操作**：從設定頁開啟時對 `settingsOverlay` 設 `inert`，關閉即恢復。**注意**：`inert` 只擋真實互動，程式化的 `element.click()` 依規格仍會派送事件，因此測試改用真實指標的 `elementFromPoint` 命中測試與焦點行為驗證，而不是拿 `.click()` 當證明。
- **焦點**：記住觸發的「切換」／「＋」按鈕，關閉後歸還；設定頁若已重繪則退回同類按鈕，不讓焦點掉回 `body`。
- **不退化**：非設定頁與 forced 流程維持原本層級與語意；`settingsCurrentMember` 於切換完成後即時更新（既有行為，補測試鎖住）。

### B. 再點目前分頁回頂會閃

- **實測根因**：再點時 `renderCurrent()`／`renderTrip()` 各被呼叫 **1 次**，第一個 `.item` 節點被換掉（**整份重繪**）；捲動由 488 **一步跳到 0**（t=2ms 仍 488、t=10ms 已 0，無中間值）。
- **修正了一項推測**：原先懷疑 `.view.active` 被移除再加回會重新觸發 fade。實測 **不會** —— remove 與 add 在同一個同步區塊、中間沒有 reflow，`animationstart` 觸發 **0** 次；刻意插入 `void offsetHeight` 才變成 1 次。故閃爍來自「整份重繪 + 瞬間跳頂」，**不是 fade**。
- **修法**：在 `switchView()` 前段攔截 `v===curView && !intent`，改呼叫共用的 `scrollCurrentViewToTop()` 後直接 return —— 不重繪、不動 `.view.active`、不碰暫態 UI 狀態，只平滑捲動並把 `viewUiState[view].scrollY` 歸零。
- **reduced motion**：`scrollTo` 的 `behavior:'smooth'` 是明確值，**不會**被 CSS 的 `scroll-behavior` 覆寫，因此自行判斷 `prefers-reduced-motion` 並改用 `instant`。
- **分帳例外保持**：次層頁再點「分帳」仍先回 dashboard；已在 dashboard 才回頂，並改走同一個共用 helper（`ledger-225.test.js` 原本釘住 `switchView` 內的 `behavior:'smooth'` 字面值，斷言意圖不變，改為檢查新的落點與 helper 行為）。
- **明確 intent 不受影響**：`trip-item`／`trip-now`／`shop-place` 等程式化跳轉不走此捷徑。

### 共通

- 三個手機寬度（320／375×844／390）實測：選擇器為最上層、輸入框自動聚焦、無水平溢位；再點分頁 0 次重繪、回到頂端。
- **版本**：`sw.js` diff 只有版本字串一行，install／activate／fetch／skipWaiting／clients.claim／快取策略全未動；`netlify.toml` 未動；`PERSONAL_STATE_VERSION` 維持 9；schema 與資料格式未變。roadmap 原本把 v87 排給 SW 更新提示，已整體順延為 v89／v90，避免同一版號承載不同 runtime。
- **驗證**：新增 11 個測試（6 個先紅後綠）；完整 **65／65** Node test files 與 Playwright **112／112** 通過。
## 2026-08-03｜Today 採買提醒精簡（SW v86）

- **消除重複提醒**：Today 待買模型接受目前下一站的 exact `stopRef`，排除後重新計算 count；一般卡使用下一站 id，同區串點只使用目前 child id。若今天全部待買都由有效下一站承擔，Today 不再補回卡片或 generic「採買清單 →」入口；行程尚未開始與沒有有效下一站時則維持原本入口／完整 Today 提醒。
- **下一站改為 badge**：原本整列 `.nx-buy` 改為右上 `🛍 N`，實際按鈕至少 44×44px，`aria-label` 為「開啟這一站的 N 項待買」。badge 是 `.nx-ticket-main` 的直接 sibling，點擊只執行 `openShoppingList(stopRef)`，不會冒泡觸發 `openTripItem()`；一般卡與 cluster current child 共用同一契約。
- **Today 卡收斂**：文案改為「今天 N 項待買／查看全部 →」，最多兩個站點、每站前三個品名；第四項起以 ASCII `...` 表示，剛好三項不加。超過兩站時在第二列右側固定顯示「另有 N 個地點」，不增加第三列。站名與品名分配獨立截斷空間，過長站名不會吃掉全部品名或 overflow 標記。
- **實測高度**：同一組 12 筆待買資料在 v85 HEAD／v86 工作樹對照，375×844 的 Today 卡由 **115.2px → 94.9px**，下一站起點由 **302.3px → 282.8px**；下一站卡由 **263.7px → 209.7px**，合計省 **74.3px**。320px 因舊 `.nx-buy` 會換成兩行，合計省 **97.9px**；390px 省 **74.3px**。三種寬度均無水平 overflow，badge 為 50×44px，移除 badge 前後卡高差為 0。
- **保留既有天氣修正**：視覺文字縮短為「雨 N%」，`aria-label` 仍保留「現在之後最高降雨機率」，未改 API、TTL、快取、降雨計算或離線策略。
- **版本邊界**：`app-version.js` 與 `sw.js` 升 v86；`sw.js` 除版本字串外不動生命週期與快取策略；`PERSONAL_STATE_VERSION` 維持 9，`netlify.toml` 未動。
- **驗證**：依 TDD 先確認 model、render 與 browser 測試在 v85 行為下失敗，再實作；完整 **65／65** Node test files 與 Playwright **101／101** 通過。

## 2026-08-03｜修正「其他資訊」誤觸卡片導覽（SW v85）

- **真機回饋**：在今天的行程卡點「其他資訊」會直接跳進行程分頁。
- **成因（v84 引入）**：`.nx-ticket-main` 本身是 `role="button"` + `onclick="openTripItem(...)"`，而 v84 把 `<details>` 放進了它內部的 `.nx-ticket-lines`。點 summary 展開之後，click 繼續往上冒泡成整張卡的導覽。這同時也是**語意錯誤** —— 「按鈕裡的按鈕」在 HTML／ARIA 上無效，鍵盤 tab 會落進去、螢幕閱讀器讀不出正確角色。
- **修法**：把 `<details>` 移出 `.nx-ticket-main`，成為卡片的同層區塊（放在待買區塊之前）。**不用 `stopPropagation` 掩蓋** —— 那只會消掉症狀，留下巢狀互動控制項的語意問題。移出後補回原本繼承自卡片本體的左右內距。
- **根因層級的保護**：新增結構不變式測試 —— 整張卡的 `role="button"` 內**不得**再有任何可聚焦的互動元素（`a[href]`／`button`／`summary`／`details`／`[tabindex]`／`[role=button]`）。日後若有人再往卡片內塞控制項，這條會直接紅，而不必逐一列舉個案。
- **一併澄清**：原本懷疑停車 MAPCODE 有同類問題，實測在此卡片中無法重現（該卡的 `role="button"` 內除了新加的 `<details>` 之外沒有其他互動元素），故**不宣稱**、也未做預防性修改；上述結構不變式已涵蓋日後出現的情況。
- **版本**：依「不得讓同一版號承載兩份不同 runtime」，v84 已推上 `dev`，本次 runtime 變更升 **v85**。`sw.js` diff 只有版本字串一行；`netlify.toml` 未動；`PERSONAL_STATE_VERSION` 維持 9。
- **驗證**：先寫失敗測試（點展開後 `curView` 由 `today` 變成 `trip`）再修；完整 **65／65** Node test files 與 Playwright **94／94** 通過。

## 2026-08-02｜Today 即時資訊（SW v84）

批次主題：**讓 Today 回答「現在要幹嘛」，而不只是「行程有什麼」。**

- **下一站待買**：卡片顯示「這站待買 N」與前兩項品名，點擊開啟採買清單並直接捲到該站群組（站點群組補上 id 錨點，`openShoppingList()` 接受選填 `focusStopRef`）。這個 join **沒有歧義** —— 採買項目的 `stopRef` 就是站點 id，與行程項目 1:1，不經由商場推導，因此沒有「一個商場對多個不同日期站點」的問題；這正是先前評估「商場內嵌採買呈現」時所擔心的那件事的正確版本。必買優先、已完成不計入、沒有待買時整塊不渲染。
- **降雨改為「現在之後」**：原本取整天最大值，含已經過去的時段 —— 早上八點下過雨、下午全晴，晚上看到的還是 80%。資料本來就在抓（`hourly=precipitation_probability`），**真正的關鍵是快取**：原本存的是算完的數字、TTL 三小時，沿用的話早上算的「現在之後」到中午就是錯的。改為把原始 hourly 序列存進快取、**讀取時依當下重算**，同一份快取在任何時間點都正確；舊格式安全降級。全部時段過去時退回當日最大值而非空白。文案改為「之後雨 N%」並補 `aria-label`。
- **同批修掉一個自己造成的違規**：本檔有「只有 `appNow()` 可以直接取得目前時間」的不變式（讓時間模擬全域生效），初版寫的 `appNow?appNow():new Date()` 防禦式寫法破壞了它，已全部改走 `appNow()`。
- **次要資訊收合**：常駐交通／停車／營業（到得了嗎、開著嗎），付款／提醒收進預設關閉的 `<details>`；兩者皆無時不渲染。展開狀態放進 `viewUiState.today.openMore`，沿用 v82 的暫態 UI 慣例，否則每次重繪都會自己收回去 —— 與 v82 修行程面板時同一個坑。
- **範圍聲明**：原始需求還有「交通、停車、營業、付款、提醒**依當下情境調整優先順序**」。「當下情境」沒有定義判準（依時間？依距離？依是否已抵達？），不同讀法會做出完全不同的東西，故本批只做可明確驗收的收合，**動態重排不在本批**。
- **購物搜尋摘要**：結果最前面加「找到 N 家店 · M 個購物地點」。數字取自實際渲染的那一輪（渲染時累加），不另外再算一次 —— 兩份計算遲早會不一致。無命中與非搜尋狀態皆不顯示。
- **版本**：`sw.js` diff 只有版本字串一行，生命週期與快取策略未動；`netlify.toml` 未動；`PERSONAL_STATE_VERSION` 維持 9。
- **驗證**：四項皆先寫失敗測試；完整 **65／65** Node test files 與 Playwright **92／92** 通過。

## 2026-08-02｜「回到現在」收斂為跨日專用（SW v83）

- **真機回饋**：v82 剛加的「回到現在」與「隱藏已完成」感覺雷同。實測證實這個懷疑是對的 —— 待在今天那一天時，「隱藏已完成」（預設開）本來就把過去的站點移走了：

  | 情境 | 「現在」在第幾筆 | 距頁面頂端 | 視窗高度 |
  |---|---|---|---|
  | 隱藏已完成 | 第 1 筆 | 255px | 844px |
  | 顯示全部 | 第 2 筆 | 391px | 844px |
  | 已完成 3 站 | 第 4 筆 | 783px | 844px |

  三種情況「現在」都落在**第一屏之內**，而 v82 同批加入的「再點同一分頁回頂」已能到達 —— 那時這顆按鈕等於捲到頂。**重複某種程度上是同一批造成的**：加了回頂之後沒有回頭檢查它對「回到現在」的稀釋。
- **收斂為只在跨日時出現**：新增條件 `findToday()!==curDay`。人在 Day 5、今天是 Day 1 時，篩選與回頂都幫不上忙，這才是它無可取代之處；此時一鍵切回今天並定位當下那一站，省去在 daybar 六個 chip 裡辨認今天（其提示只是一圈 2px 金色內框）。
- **未採用的替代方案**：直接移除並強化今天 chip 的辨識度。可行但跨日返回會變成兩個動作（切天、再自己找現在），故保留按鈕而改收出現條件。
- **版本**：依「不得讓同一版號承載兩份不同 runtime」，v82 已推上 `dev`，本次 runtime 變更升 **v83**。`sw.js` 的 diff 只有版本字串一行；`netlify.toml` 未動；`PERSONAL_STATE_VERSION` 維持 9。
- **驗證**：先寫失敗測試（今天那一天仍顯示按鈕）再實作；三種情境分開鎖住（在今天→隱藏、在別天→顯示、今天不在行程內→隱藏）。完整 **64／64** Node test files 與 Playwright **83／83** 通過。

## 2026-08-02｜操作脈絡保存（SW v82）

批次主題：**使用者的操作脈絡不得被導航或重繪無故破壞。** 三個症狀同一個根因 —— 捲動位置、面板展開、操作焦點都只活在 DOM 裡，重繪即消失。

- **暫態 UI 狀態有了落點**：新增 session-only 的 `viewUiState`（四個分頁各自的 `scrollY`，行程頁另有 `openPanels`）。刻意**不**寫 localStorage、**不**進備份：把 A 手機的捲動位置還原到 B 手機毫無意義，而且會讓備份格式再升一版。測試從 key、值、payload 三處鎖住這條邊界。
- **分頁捲動位置**：`switchView()` 結尾原本無條件 `window.scrollTo({top:0})`；實測更糟 —— 因為 `html{scroll-behavior:smooth}`，那個 scrollTo 是**動畫**的，切換瞬間量到的是滑到一半的 226px。改為離開前記位置（必須在 `curView` 改變之前）、`renderCurrent()` **之後**以 `requestAnimationFrame` 還原，並 clamp 到目前可捲動範圍。還原一律 `behavior:'instant'`，否則會被 CSS 的 smooth 變成動畫。
- **入口意圖優先**：帶目標的入口（看某個行程、某個購物地點、跳某一天、回到現在）以**結構化資料**傳參 —— `{type:'trip-item',itemId}` 等。參數傳遞天然只消耗一次，沒有殘留旗標要清；結構化比 `skipRestore=true` 好測，日後新增入口不必改判斷邏輯。順帶收掉重複：`openTripItem()` 原本自己複製了一份 `switchView` 的 body，因此完全沒有參與捲動保存。
- **行程面板展開狀態**：`togglePanel()` 原本只做 `classList.toggle`，而 `onCheck()` 會 `renderTrip()` —— 使用者的實際體驗是「每打一次卡，交通／停車／備註全部收合」。狀態改存進 `viewUiState.trip.openPanels`，並在 `renderTrip()` 依 `visibleItems` GC 掉被篩除者。
- **打卡改為可鍵盤操作的 checkbox**：與 v81 為 `.store-row` 修掉的是同一個缺陷，沿用同一套樣板。差別在 `.chk` 是獨立小方塊、列內文字不在它裡面，因此**必須**自帶 `aria-label`。鍵盤與滑鼠不能用 `document.activeElement` 反推（`<div tabindex="0">` 被點擊時同樣會取得焦點），改由 keydown handler 明確傳 `fromKeyboard`。
- **焦點還原的例外處理**：契約寫成「重繪不得**無故**破壞仍然存在的狀態；使用者刻意讓目標離開結果集時，焦點移往下一個合理目標」。`tripHideDone` 預設為 true，打完卡那一筆本來就會離開清單 —— 目標仍在→還原同一元素；已離開→原位置的下一筆；連下一筆都沒有→退到篩選按鈕。實作過程中第一版測試正是把這個例外誤當成缺陷，**實作是對的、預期寫錯了**。
- **「回到現在」**：`backToNow()` = 今天那一天 + 目前這一站，沿用同一套意圖機制。只有 `findToday()` 不為 null 時才渲染，旅行前後顯示它只會讓人按了沒反應。
- **版本策略**：依 2026-08-02 裁定，每批鎖定一版；整批完成、測試全綠後才升版。`sw.js` 的 diff **只有版本字串一行**，生命週期與快取策略未動；`netlify.toml` 未動；`PERSONAL_STATE_VERSION` 維持 9。
- **驗證**：五項皆先寫失敗測試（切分頁量到 226px、面板 3→0、`viewUiState` 不存在、`role` 非 checkbox、按鈕不存在）；完整 **64／64** Node test files 與 Playwright **81／81** 通過。

## 2026-08-02｜完成／跳過改為單行省略號（SW v81）

- **完成鈕也收單行**：v80 只把跳過鈕收成單行省略號（受「一條 CSS 規則」的範圍限制），完成鈕仍會換行，長地點名稱下實測長到 65px。將 `white-space:nowrap` 移到 `.nx-decision-btn` 基底規則，兩顆按鈕一致以省略號收尾，維持 46px 單行高度。
- **同時把左右內距移到基底規則**：`padding:0 14px` 由 `.nx-decision-btn.skip` 上移到 `.nx-decision-btn`，否則完成鈕沒有內距，省略號會緊貼邊框。跳過鈕的 `max-width:120px` 為 border-box，內距上移不改變其寬度。
- **範圍**：只動這兩條既有規則，未新增規則；`.nx-ticket-low` 與 `.nx-decision-btn.done` 仍未動。`PERSONAL_STATE_VERSION` 維持 8；schema、localStorage key、備份格式、SW 的 install／fetch／SHELL、`netlify.toml` 與相依套件均未修改。
- **為何遞增版本而非併入 v80**：v80 已推上 `dev` 並進入真機驗證，折回同一版號會讓已安裝 v80 的裝置拿不到這次修正 —— 正是版本機制要防的靜默過期。
- **驗證**：先寫失敗測試（完成鈕 `white-space` 實測為 `normal`）再實作；完整 **57／57** Node test files 與 Playwright **31／31** 通過。

### 併入 v81：想逛標記改用穩定 key

- **正確性缺陷**：想逛標記的 key 是 `w_<mallIndex>_<樓層>_<店名>`，而 `mallIndex` 是 `shopMalls()` 的**列舉索引**（依行程出現順序排序）。新增任一購物地點就會位移索引，已存的標記靜默指到別家店。**實測已發生**：加入 P048 後 P007 由索引 1 變 2；且「無印良品 1F」同時存在於 P001 與 P039，位移一格即在兩家不同店之間轉移。
- **唯一權威 helper**：新增 `shopWantStoreKey(place,index,store)`，格式 `w2:p<placeId>:<樓層>:<店名>`，各段以 `encodeURIComponent()` 編碼（`:` 編成 `%3A`，店名含冒號也不會切斷分隔）。`renderShopResults()` 的六個讀寫點（`wantTotal`／`wanted`／搜尋／想逛清單／樓層計數／樓層列）與 `toggleWant()` 全部改走它，runtime 不再以 `mi` 判斷是否想逛。只負責展開狀態的 `shopWantKey()` 更名為 `shopWantListStateKey()`，避免兩種用途共用含糊名稱。
- **舊資料轉換**：`migrateShopWantKeys()` 為純函式且冪等。**不**把舊 index 換成「目前同一 index 的 placeId」——順序可能早已改變，那只會把錯誤映射永久固定下來；改以「樓層＋店名」搜尋候選，唯一才轉、0 個或多個一律移除。非 `w_` 開頭的 key 原樣保留。有無法安全轉換的標記時吐一次提示，因轉換冪等故天然不重複，不需額外的 localStorage 旗標。
- **個人備份升 v9**：`PERSONAL_STATE_VERSION = 9`、`SUPPORTED = [1..9]`。v1–v8 還原時對 `payload.wants` 執行同一套轉換（在寫入前，維持全有或全無）；匯出前亦先轉換，確保 v9 備份不帶出索引型 key。舊版 App 的 `SUPPORTED` 仍是 `[1..8]`，會明確拒絕 v9 而非當成 v8 靜默錯讀。`docs/personal-state-compatibility.md` 與還原矩陣同步更新。
- **版本策略**：`origin/main` 為 v73（最後正式發布），v81 尚屬未發布的候選版，故本修正**併入 v81 不另跳版**。`sw.js` 與 `app-version.js` 完全未修改（`sw.js` diff 為空），`netlify.toml` 未動。
- **範圍**：只處理索引型 key 的正確性問題。清單局部更新、搜尋分類與空狀態、debounce、store-row 無障礙、onclick 跳脫整理均未混入，後續另批處理。
- **驗證**：三組失敗測試先行（key 不存在／還原未轉換／`w_99_` 未被消化）；完整 **58／58** Node test files 與 Playwright **33／33** 通過。

### 併入 v81：想逛切換就地更新

- **現象**：每點一次想逛就整份重繪，實測約 **720 個節點全數換掉**；且 `renderShopResults()` 尾端無條件呼叫 `centerShopFilterChip()`，把篩選列的水平捲動位置歸零（實測 150px → 0）——捲到右邊某個購物地點再開始標記，位置會一直被拉回去。
- **就地更新**：`storeRow()` 新增 `data-want` 屬性，讓切換時能找出同一家店的所有列（樓層清單與想逛清單可能同時存在）。`toggleWant()` 先試 `applyWantToggleInPlace()`，更新勾選狀態後由 `shopWantCounts()` 從 storage **重算**並寫回三處計數（想逛總數、想逛清單標題、樓層 ⭐N）。計數一律重算而非從 DOM 讀回來加減——DOM 只是投影。
- **仍應重繪的三種情況**（區塊結構真的改變，不是效能問題，已寫成測試以免日後被誤當成缺陷「修掉」）：想逛篩選下取消標記（成員資格改變）、想逛清單區塊要出現或消失（該地點的第一次標記）、清單展開中需要增減列。
- **篩選列捲動**：`centerShopFilterChip()` 移出重繪路徑，只在篩選真的改變（`setShopPlaceFilter()`）與首次渲染（`renderShop()`）時呼叫。

### 併入 v81：搜尋不再留空殼、可比對分類

- **空殼**：搜尋 `UNIQLO` 實測渲染 5 個購物地點標題、**2 筆命中、3 塊只寫著「找不到」的空殼**；完全查無結果時是 5 塊空殼，而全域的「目前沒有符合條件」永不出現——搜尋分支的 `rendered++` 是無條件執行的。改為命中數為 0 就整塊 `return`，並讓全域空狀態生效。
- **空狀態語意**：使用者輸入了字串卻沒結果時顯示「找不到「<查詢>」」，而不是「目前沒有符合條件的購物資料」。
- **比對範圍**：新增純函式 `shopStoreMatches(store,query)`，同時比對 `name` 與 `cat`。分類本來就顯示在每一列上，搜不到只是介面自己造成的期待落差。殘缺資料（缺欄位／`null`）安全回傳 `false`，不讓搜尋整個炸掉。
- **debounce**：`shopQ()` 加上具名常數 `SHOP_SEARCH_DEBOUNCE_MS = 120`；`_shopQ` 仍即時更新，只延後重繪。輸入框位於 `#shopResults` 之外，focus 不受影響。
- **範圍**：#4（store-row 無障礙）與 #5（onclick 跳脫整理）均未混入，後續另批處理。
- **驗證**：兩批皆先寫失敗測試（節點識別為 `false`、篩選列被歸零、`shopStoreMatches` 不存在、3 塊空殼）；完整 **59／59** Node test files 與 Playwright **41／41** 通過。

### 併入 v81：onclick 屬性跳脫統一

- **潛在缺陷**：購物頁四處 `onclick` 以 `.replace(/'/g,"\\'")` 手工跳脫，只處理單引號。其中兩處內插的值**直接來自 Google 表格**——樓層名稱（`toggleFloor`）與購物地點名稱（篩選 chip）。含 `"` 會直接截斷 `onclick="…"` 屬性，含 `&`、`<` 也不安全；實際店名已經含 `&`（`earth music&ecology`、`H&M`），目前只是碰巧還沒壞。
- **改用既有 helper**：四處一律改走 `jsHtmlAttrString()`（`jsString()` 再加上 `&`／`"`／`<`／`>` 的實體編碼），該函式早已存在並用在別處。`shop-category-tags` 的 sandbox 補上真實跳脫器實作而非 stub。

### 併入 v81：店家列成為可鍵盤操作的 checkbox

- **現象**：店家列是購物頁最常被點的控制項（實測 101 家店），卻是沒有 `role`、沒有 `tabindex` 的 `<div>`；勾選與否只是 `.st-chk` 裡的一個 ✓ 字元。完全無法以鍵盤操作，螢幕閱讀器也讀不出已勾選。
- **語意選擇**：採 `role="checkbox"` + `aria-checked`，而非 `role="button"` + `aria-pressed`。這是二元選取、視覺上本來就是核取方塊，語音回報「未勾選／已勾選」比「按鈕」精確。可及名稱取自列內既有文字（店名、分類、必逛／免稅、樓層），不另造 `aria-label`。✓ 字元加 `aria-hidden="true"`，狀態由 `aria-checked` 承載。
- **鍵盤操作**：`tabindex="0"` + `onkeydown` 沿用既有的 `activateKeyboardButton()`（同時支援 Enter 與 Space）。新增 `.store-row:focus-visible` 外框，沿用既有 `[role="button"]:focus-visible` 的樣式語彙。
- **實作過程中發現並修掉的第二個缺陷**：需要重繪的那一次（該地點的**第一次**標記）會換掉整個 DOM，鍵盤焦點掉回 `body`——連按第二下 Space 完全沒有作用。新增 `focusShopRow()`，重繪後把焦點放回同一家店；只在焦點原本就在該列時還原，滑鼠點選不搶焦點。
- **就地更新同步**：`applyWantToggleInPlace()` 一併更新 `aria-checked`，否則畫面打了勾、語音仍說未勾選。
- **未改動**：觸控區維持現狀（實測 63px，本來就足夠）。
- **驗證**：兩批皆先寫失敗測試；完整 **61／61** Node test files 與 Playwright **47／47** 通過。

### 併入 v81：想逛改為獨立閱讀模式、一鍵清除、採買清單入口

- **想逛頁籤幾乎失去功能**：實測標記 2 家店時，想逛頁籤仍渲染 **75 列店家與 8 個樓層區塊** —— `wants` 只決定哪些商場出現，商場內照樣攤開全部樓層與全部店家，而唯一只列想逛的 `.want-box` 還預設收合。改為**獨立閱讀版面**：全部＝探索商場需要樓層結構，想逛＝執行既定路線需要快速掃描目標。只留商場標題與想逛店家平鋪，不渲染樓層手風琴、`.want-box` 與營業時間／官網／備註；樓層與櫃位資訊仍在每列右側的 `st-f`。
- **順序與即時移除是既有正確行為，本批只補測試鎖住**：順序沿用 `wanted`（`m.stores.filter`），天然是「商場行程順序 → 店家原始順序」，實作不另行 `sort()`，以刻意打亂字母序的 fixture 驗證；取消後即時移除則是 `applyWantToggleInPlace()` 既有的 `wants` 回退路徑。
- **空狀態**：`尚未加入想逛店家，可從「全部」頁籤加入` ＋ 回到全部的按鈕。
- **一鍵清除**：文案固定為「清除全部想逛」（不寫「清除」，避免誤解為刪除店家或採買資料），只在想逛模式且有資料時渲染，按下即清除不跳確認框。**復原採完整快照**而非逐筆反向切換 —— 逐筆會寫入 N 次、重繪 N 次，且無法還原轉換保留下來、無法辨識的 key。清除與復原**各只寫入一次 storage、各只重繪一次**，以覆寫 `lsSet` 計數驗證；測試刻意混入一筆 `S999` 鎖住快照的完整性。
- **採買清單入口**：顯示**全清單**未完成數，刻意不同於 Today 卡片的日別語意。**過期問題**：全檔沒有任何採買流程呼叫 `renderAll()`，在 overlay 內完成一項再關閉數字會停在舊值；`closeShoppingList()` 於確實移除 overlay 且 `curView==='shop'` 時就地更新該數字，不整份重繪。
- **「從哪裡進去就回哪裡」不需實作**：採買清單是疊在 body 上的 overlay，`curView` 從頭到尾不變，使用者根本沒有離開過原頁。首頁與購物頁兩個入口實測皆正確。真正的風險是日後有人為了「實作返回」去動 `curView` 反而改壞，故加原始碼斷言：`open`／`closeShoppingList` 不得出現 `switchView(` 或指派 `curView`。
- **chip 數量語意**（獨立交付）：同一視覺三種實體（商場數／想逛家數／店家數）。不硬統一資料含義，只讓兩個全域 chip 寫出單位 —— `全部 5 個地點`、`想逛 2 家`；各購物地點 chip 維持純數字。單位置於計數元素**之外**（`<span id="shopWantTotal">`），就地更新才不會把單位一起洗掉。
- **明文未做**：不改 schema、不升 `PERSONAL_STATE_VERSION`（維持 9）、不建立採買項目到店家的新關係、不做商場內嵌採買呈現。
- **驗證**：四批皆先寫失敗測試（想逛 28 列 vs 應為 3、清除按鈕不存在、入口不存在、chip 無單位）；完整 **62／62** Node test files 與 Playwright **59／59** 通過。

## 2026-08-02｜六主題固定淺色、設定圖示放大、完成鈕不再被擠掉（SW v80）

- **移除自動暗色**：刪除 v78 加入的 `@media(prefers-color-scheme:dark)` 整段（六組 token 覆寫、`body{color-scheme:dark}` 與四條元件背景覆寫），並在 `html` 加上 `color-scheme:light`。六個主題是照淺色設計的，元件層仍有約 108 處硬編碼淺色背景，token 級暗色永遠對不齊；改為同一主題在 iPhone 淺色／深色外觀下完全一致，原生控制項與捲軸也維持淺色。
- **設定圖示放大**：`.settings-btn .settings-gear-six` 由 20×20／`stroke-width:2` 改為 24×24／`stroke-width:1.75`。44×44 觸控區、圓形底、`viewBox` 與兩個 `circle` 半徑均未改，放大的是看得見的圖示而不是觸控區。
- **完成鈕不再被長地點名稱擠掉**：`.nx-ticket-low` 第二軌是 `auto`，跳過鈕的 max-content 會吃掉整列寬度，把 `minmax(0,1fr)` 的完成鈕壓到 2px，標籤於是一個字一行直排。以單一規則為跳過鈕加上 `max-width:120px` 與 `white-space:nowrap`，讓它套用既有 ellipsis 並把寬度還給完成鈕；`.nx-ticket-low`、`.nx-decision-btn` 與 `.nx-decision-btn.done` 均未動。
- **範圍保護**：`PERSONAL_STATE_VERSION` 維持 8；schema、localStorage key、備份格式、SW 的 install／fetch／SHELL、`netlify.toml` 與相依套件均未修改。`sw.js` 的 diff 只有 `SW_VERSION` 一行。未加入 `night` 主題、未將 108 處硬編碼淺色背景轉為 token、未動 `.day-chip.active`。
- **驗證**：三個變更皆先寫失敗測試再實作；完整 **57／57** Node test files 與 Playwright **31／31** 通過。`app-version.js` 與 `sw.js` 同步升至 v80。

## 2026-08-02｜設定圖示改為圓角六齒（SW v79）

- **設定入口圖示**：右上角設定按鈕改為 24×24 inline SVG，以六條相隔 60° 的圓頭齒、外圈與中心圓構成；實際圖示為 20×20，沿用 `currentColor`，六個主題與離線環境不需額外資源。
- **既有契約不變**：設定按鈕維持 44×44 觸控區、`aria-label="設定"` 與原本開啟行為；MAPCODE、資料 schema、同步、照片儲存與部署設定均未修改。
- **版本換代**：`app-version.js`、`sw.js` 與使用者版更新說明同步升至 v79，確保已安裝 App 取得新版 `index.html`。

## 2026-08-02｜離線、行車操作與夜間可用性（SW v78）

- **離線首屏**：移除 Google Fonts 與兩個 font preconnect，改用裝置內建繁中字體；桃子 header badge、16／32px favicon 與 152／167／180px Apple touch icons 納入原子 SHELL precache。
- **可恢復錯誤**：視圖渲染失敗不再要求不存在的「下拉重試」，改為 44px「重新整理」按鈕，實際重跑 daybar 與目前 view renderer。
- **Today 與車上操作**：Day chips 只在行程頁出現；header 改為 flex，不再以固定 `padding-right` 搭配絕對定位。同步、設定、Day chips 與購物 filters 均至少 44px；完成／跳過提高到 16px，完成為主要且較大的操作。
- **照片健康狀態**：設定入口集中命名為「照片健康狀態」；容量或處理失敗留在目前表單／修復 dialog 的 inline status，不再疊加獨立 storage-failure overlay。照片修復功能本身維持。
- **夜間與可及性**：六個既有主題新增自動暗色 token；`prefers-reduced-motion` 關閉平滑捲動並壓縮動畫。toast 加入 live-region 語意；下一站可開啟區支援鍵盤 Enter／Space。
- **範圍保護**：MAPCODE 顯示、點任意處關閉行為、資料 schema、parser、同步資料流與 `netlify.toml` 均未修改。`app-version.js` 與 `sw.js` 同步升至 v78。

## 2026-08-01｜採買多選全選（SW v76）

- **目前分頁全選**：待買／已買進入多選後，可全選或取消目前分頁全部項目；不跨分頁保留選取。
- **狀態與行動版**：手動取消一項會恢復「全選」，取消全選保留多選模式；頂部控制在 320／375／390px 同列且點擊區至少 44×44px。
- **回歸保護**：既有已買、記帳、移回待買、刪除與 v75 照片附件流程通過完整 **56／56** Node test files、Playwright **17／17** 驗證。
- **更新說明視窗**：設定「資料與版本」仍固定只顯示最近五版，v76 加入後淘汰最舊的 v71 顯示項，完整歷史仍保留於本檔。
- **PWA**：`app-version.js` 與 `sw.js` 同步升至 v76；`sw.js` 除版本字串外未動，`netlify.toml` diff 0；v75→v76 換代與離線重開通過。

## 2026-08-01｜採買照片附件與依目前位置導航（`codex/shopping-photo-navigation-v75`，SW v75）

- **基準與核准範圍**：`origin/dev` 已包含 v74 最終修正 `c51752b`;本批依 Bar 核准實作後推送 `dev`,不動 `main`、不部署正式站、不建立 production tag、不 force push。Tier 2 四段說明、設計規格與兩份實作計畫位於 `docs/superpowers/`。
- **採買照片只留在拍照裝置**：每筆採買項目可從手機相簿／相機選一張 `image/*`;圖片縮放至最長邊 1600px 並以 JPEG 0.82 儲存於 IndexedDB `trip-local-media/shopping-photos`。卡片只顯示無文字的迴紋針 SVG,不顯示縮圖；詳情可全畫面查看、替換或移除。
- **引用生命週期**：採買項目在 localStorage 只存 `photoId`;部分購買拆分共用同一引用,安全回併亦保留引用。刪除項目或移除附件時,只有在最後一個引用消失後才刪除 Blob。個人備份維持 v8,匯出剝除 `photoId`,還原也剝除手動夾帶的引用；設定頁明示照片不包含於備份。
- **導航定位**：具 Places／Restaurants 詳細分點的行程維持精確目的地；只有一般同名地點在點擊導航時請求一次目前位置,以座標作為 Google Maps directions origin 搜尋最近同名目的地。定位被拒、逾時或不可用時退回 `名稱 + 日本`;按鈕仍只顯示「導航」,不增加「精確地點／附近搜尋」標籤。
- **PWA 升版**：`app-version.js` 與 `sw.js` 同步升至 v75;SHELL 只新增 `shopping-photo-store.js`,install／fetch／fallback 策略完全未動。`schema.js`、`netlify.toml`、Apps Script 與 Google Sheet schema 完全未動。
- **iPhone 照片檢視器 hotfix**：真機截圖確認頂部 CSS 三值 `padding` 誤把 `safe-area-inset-top` 套在底部,使關閉鈕落入狀態列觸控區；已將安全區移到頂部,並新增單指向下 72px、垂直位移明顯大於水平位移時關閉。兩個真實瀏覽器測試先紅後綠,分別模擬 47px 頂部安全區與 120px 下滑手勢。
- **自動驗證**：完整 **56／56** Node test files、Playwright **13／13** 通過；照片與定位瀏覽器測試皆維持 console error 0、pageerror 0。Playwright 另確認三個手機 viewport 照片卡與 panel 水平 overflow 0、照片重新載入後仍在、備份不帶引用、移除後 Blob 清理，以及 SW 新世代快取與離線重啟正常。

## 2026-08-01｜設定根頁群組列表與測試模式控制頁（`feat/settings-grouped-v74`，SW v74，後續已推 `dev`）

- **前置:release back-merge 已完成。** `origin/main`(`17c423f`,v73 發布 merge)以 `--no-ff` 回灌 `dev`,merge commit `a930858`。**零內容差異**(`git diff f393256 a930858` 為空),53／53 Node tests、兩個 checker 與遠端 `qa-sanity` 皆通過;`git merge-base --is-ancestor origin/main origin/dev` 退出碼 0,`dev` 不再落後 `main`。v74 分支自 `a930858` 建立。
- **交付範圍(依 2026-08-01 核准的 Tier 2 四段說明與設計規格 §5)**:設定根頁由 7 張 `.settings-section` 卡片改為**三個常駐群組**(個人／記帳／資料);新增 `renderSettingsTestModePage()` 與 `test-mode` 子頁,團體帳測試模式移出根頁;legacy deep link `ledgerTestModeSection` 由 `{page:'root'}` 改為 `{page:'test-mode'}`;診斷面板新增進入控制頁的入口;版本由 v73 升至 **v74**。
- **測試模式的入口而非語意改變**:`[TEST]` 前綴、帳本軌道隔離、Apps Script 寫入、`ledgerUniverseMode()` 全部未動。根頁**永遠不放**可直接切換的 checkbox;關閉時該列**完全不渲染**(不是 CSS 隱藏),開啟時才出現在記帳群組底部。三個進入點(診斷面板／根頁警告列／分帳 TEST banner)實測皆有效。
- **保護項逐項核對(規格 §6.1 因果條件)**:`sw.js` 的 diff 只有 `SW_VERSION` 一行(install／fetch／fallback／SHELL 全未動)、`index.html` 載入 `app-version.js` 的方式未動、`netlify.toml` 完全未動。因此 2026-07-31 的 B2–C3 真機證據**仍可沿用**,不需重跑 v18→v73 升級矩陣。
- **實作期間 Browser QA 抓到一個真實缺陷並已修**:`.settings-row` 的 `border:0` 與群組分隔線規則 `.settings-group-card>*+*` 特異性相同,分隔線寫在前面會被整個蓋掉(實測 `border-top-width: 0px`,六主題全中)。修法是把分隔線規則移到 `.settings-row` 之後,並在 `theme-system.test.js` 鎖住這個來源順序。
- **測試契約改為語意契約(規格 §7.1)**:新增 `tests/support/source.js`,依**名稱**擷取 `index.html` 的函式與宣告,取代 `html.slice(indexOf('function openSettings('), indexOf('function mergedLedgerRecords()'))` 這類位置相依 slice —— 舊寫法會讓新增的 render function 落在區間外而靜默通過,也會誘導實作者為配合測試而安排函式位置。TEST banner 的 deep link 改以 `normalizeSettingsTarget()` 的**實際回傳值**斷言。
- **新增 `tests/settings-grouped-root.test.js`**(執行 `renderSettingsRoot()` 並斷言渲染結果:三群組順序與歸屬、摘要格式、`未設定`／`SW 未知` 降級、測試模式關閉時完全不渲染／開啟時才出現警告列)與 **`tests/browser/settings-grouped-root.spec.js`**(三寬度溢位、測試模式關→開→關完整循環、六主題對比與分隔線、跨頁捲動保存)。
- **同時修掉兩處硬編碼版本**:`tests/browser/sw-update-cache.spec.js` 寫死 `v73`(升版即全紅)改為取自 `tests/support/version.js`;`theme-system.test.js` 的 release-note 尾段更新為滾動五筆視窗 `['v73','v72','v71','v70']`。`APP_RELEASE_NOTES` 補上 v74 使用者版說明,並依五筆上限移除 v69。
- **自動驗證**:完整 **54／54** Node test files、Playwright **9／9**、`tools/check-doc-titles.js`、`tools/check-app-version.js`(回報 v74)、`git diff --check` 全部通過。
- **v73 → v74 換代實測(規格 §6.2)**:以 `a930858`(v73)完整檔案樹起站註冊 SW,再就地換上 v74 檔案。結果:CacheStorage 由 `okayama-trip-v73` 換為**只剩** `okayama-trip-v74`;安裝的 10 個 SHELL 在 App 啟動後另正常快取桃子徽章,穩定狀態共 11 entries。快取中的 `index.html` 含 `.settings-group-card`、`renderSettingsTestModePage` 與本次 `var(--ink)` 對比修正,`app-version.js` 字面為 `v74`(無混版本);關閉伺服器後重載仍完整啟動,`APP_VERSION='v74'`、資料與版本頁顯示 `SW v74`、console error／pageerror 0。
- **Browser QA 量測**:320／375／390px 下 document／panel／各列水平溢位皆 0;最小列高 52px;身分列在 320px 長名情境維持單列(58px)、名稱 ellipsis 截斷、按鈕 47×38 與 38×38;根頁在 390×844 下 `scrollHeight === clientHeight`(一個畫面看完);console error／warning 0。六主題對比:群組標題 8.00–14.72、列標題 13.31–15.51、摘要 5.43–7.77、圖示 8.73–15.51。
- **測試模式警告列對比阻斷已修正**:依 Bar 核准只在 `.settings-testmode-row .settings-row-main b` 將主文字由 `var(--coral)` 改為 `var(--ink)`,不修改六主題 token 或其他 coral 元件。Playwright 先啟用測試模式再讀取 computed color／card background,六主題主文字對比分別為 ocean 13.31／ivory 15.51／mist 13.39／cedar 14.71／wisteria 15.18／tea 14.13,次要文字分別為 5.43／7.77／6.30／7.26／7.71／6.99,全部 ≥ 4.5。
- **後續交付狀態**:`feat/settings-grouped-v74` 最終 SHA `c51752b` 已推送並快轉 `dev`;`main` 與 production tag 未動。v74 delta 驗收清單見 `docs/batch2-device-acceptance.md`(新增區塊,未覆蓋任何 v73 證據)。

## 2026-08-01｜🚀 SW v73 正式發布（main，v18 → v73）
- **正式站已由 SW v18 升級至 SW v73。** merge commit **`17c423f8ac59328f926973024cb407d5e638f838`**（PR #11，`dev → main`，merge method 為 merge commit，parents `9eefcb0` + `9ec2c21`，非 squash／rebase）。Netlify 正式部署 `6a6d6be3e3dabf00078f284b`，`commit_ref` 與 merge commit 一致，`published_at` 為 `2026-08-01T03:45:48.841Z`。
- **回滾錨點 tag `production-v73`** 已建立並推送：tag 物件 `64e8d0b`（annotated），peeled `17c423f8...`。**未建立 `production-v72`** —— v72 從未正式發布，v72 與 v73 合併為同一候選版，只做一次 SW 換代。前一版錨點 `production-v18` → `9eefcb0` 保留。
- **發布內容**：v73 的 SW 更新完整性修正（install 用 `cache:'reload'`、日常 fetch 用 `cache:'no-cache'`、`sw.js` 自帶 `SW_VERSION` 並移除 `importScripts` 版本依賴、離線未命中的子資源不再 fallback 成 `index.html`、`APP_VERSION` 全面改走安全 helper、受保護紀錄文案改為「已鎖帳」），加上 v72 的六組淺色主題、設定頁 2.0、旅途紀錄與個人備份 v8。
- **G1 真機／PWA 驗收 2026-08-01 全數通過**：P0／P1／A／B／C／D／E／F／G／H／I。其中 C2「先離線、再升級」的一次性過渡窗口在 iPhone 上也通過 —— 該情境原本因競態不一定可重現而標為 best-effort。逐項證據見 `docs/batch2-device-acceptance.md`。
- **R1 遠端 CI**：真正用於合併的最終 head 為 `9ec2c211932ba0a570e8978ea60b85898c1de6c4`，workflow run `30682429659`，`sanity` 與 `browser-qa` 皆 success，PR 狀態 MERGEABLE／CLEAN，未解決 review thread 0。驗收清單中 R1-c 原記的是中途 head `0fb4a2c`／run `30682328651`；依裁定**不為改這一行再推 pre-merge commit**（那會讓 head 再次改變、R1-c 又要重跑），改於本次 G6 收尾更正。
- **G5 正式站線上驗證**：`sw.js` `SW_VERSION='v73'`（4,486 bytes，舊 `okayama-trip-v18` 字面 0）、`app-version.js` `v73`、`index.html` 728,196 bytes（含 `APP_VERSION SAFE ACCESS` 區塊與已鎖帳說明句，舊文案「還款確認後保護」殘留 0）、六主題齊全、版本一致性成立、`GET /` HTTP 200。header：`sw.js` 與 **`app-version.js`** 皆 `no-cache,no-store,must-revalidate`（後者為 v73 新增的防禦性規則，線上確認生效）、`index.html` `no-cache`、`manifest.webmanifest` Content-Type 正確。
- **Bar iPhone smoke test 通過**：PWA 完整關閉重開後已換代至 SW v73、四分頁正常、原有身分與個人資料保留、設定頁與子頁進出正常、飛航模式下可離線重開、恢復網路後正常、無白畫面／崩潰／持續錯誤。
- **合併安全性（合併前已驗）**：`main` 上沒有任何 `dev` 缺少的非 merge commit；`main` 合併前的 tree 等同 `9abd6a5`（在 `dev` 歷史中）；模擬合併零衝突。合併後 `main` 的 tree 與 PR head tree **完全一致**，合併未引入任何額外變更。
- 批次一「發布阻斷項」自此結束。下一批為 **v74 設定根頁改版**，設計規格已核准但**尚未實作**，見 `docs/superpowers/specs/2026-08-01-settings-grouped-list-design.md`。

## 2026-07-30｜測試模式／時間模擬暴露面調查與備份防呆（dev，SW v73）
- **P5 唯讀調查結論:三條路徑皆判定為「可延後,非發布阻斷」**,但發現一個值得在出發前補的缺口(見下)。調查全程未修改任何檔案。
- **調查修正了兩個既有假設**:①`trip_ledger_test_mode` **根本不是隱藏的** —— 設定頁有一個明著的「測試模式」區塊,任何人打開設定往下滑就點得到;②「連點標題 5 下」的除錯面板入口**不存在**,`brandTitle` 上沒有任何 listener,診斷面板的真正入口是**桃子徽章 300ms 內連點兩次 `touchend`**,且因為只綁 `touchend`,桌機滑鼠點不開。
- **發現第三條未被列入的路徑**:`appNow()` 直接讀 `?previewDate=YYYY-MM-DD` URL 參數覆寫今天日期,不需要任何手勢。不寫 `localStorage`、只影響當次載入,判定低風險。
- **污染範圍與可復原性**:測試模式只切換團體帳宇宙、個人帳不受影響,有頂部警示與復原按鈕;`[TEST] ` 前綴的紀錄照樣 append 進正式 Sheet(ADR 0006 append-only,列刪不掉)但在正式模式被濾掉、不進統計。時間模擬會改寫 `appNow()` 這個全域時間來源,擴散到打卡／自動略過／下一站進度／新記帳的 `time`;有「模擬中」文字標記與徽章變色,並可用 `endTimeSimulation(true)` 回復到首次啟用前的快照 —— 但**已送出的團體帳列撤銷不了**。
- **唯一真正的跨裝置污染路徑,已修**:兩個 key 本身都不在備份 payload、也不在還原白名單,不會被帶走或覆寫。但**若在時間模擬期間匯出備份**,payload 內的 `checks`／`wants`／`personalLedger` 就是被污染的狀態,而唯一的回復點 `trip_time_simulation_snapshot` **不在備份內** → 還原到新裝置後沒有任何回復機會,污染變成永久。
- **修法(Bar 裁定「做」)**:`exportPersonalState()` 開頭加 `isTimeSimulationActive()` 判斷,模擬啟用中一律擋下匯出並提示「時間模擬進行中,請先於診斷面板結束模擬再備份」。**不動備份格式、不升版(維持 `PERSONAL_STATE_VERSION=8`)、不動模擬機制本身**。已做對照驗證:移除該行後 `settings-backup-ux.test.js` 確實失敗。未加入 `APP_RELEASE_NOTES` —— 這是安全防呆而非功能,只在一般使用者不會遇到的邊界情境觸發。
- **backlog #2 的子項「隱藏『重置今日進度』」移出並歸檔**(Bar 裁定)。P5 調查發現它**早已實作完成**(`resetTripProgress()`,診斷面板「行程進度」區,附雙重 `confirm()`,只清 `trip_checks` 與 `trip_next_stop_progress`),只是任務板未歸位。與原文的入口差異已如實記錄於 `tasks/done.md`。#2 其餘七個子項維持不動。
- 自動驗證:完整 **53／53** Node test files、Playwright **5／5**、`tools/check-doc-titles.js`、`tools/check-app-version.js` 通過。

## 2026-07-30｜受保護紀錄文案改為「已鎖帳」（dev，SW v73，顯示層）
- **backlog #10 交付**(Bar 2026-07-30 裁定)。團體帳受保護紀錄的 badge 由「還款確認後保護」縮短為 **「已鎖帳」**(`renderLedgerRecentRecord`,複驗確認為整份 `index.html` 的唯一出現處)。tag 只負責快速辨識,完整原因移交明細頁。
- **明細頁新增**說明句「此筆消費已完成還款確認,目前已鎖帳,無法再編輯或刪除。」—— 這是**新增**不是搬移:明細頁此前只有「查看不可改寫歷史」按鈕,沒有任何說明句。出現條件與該按鈕完全相同(`track==='shared' && record._correctionProtected`),排在按鈕之前,採用既有的 `--ink-faint` 次要文字語意色,不新增主題色。
- **原鎖帳行為一字未動**,並以測試鎖住:`_correctionProtected` 判定來源不變、編輯／刪除仍以 `ledgerRecordCorrectionProtected()` 守門、`assertCanEditLedgerRecord` 與 `assertCanDeleteLedgerRecord` 的錯誤訊息「此收據已有還款確認,請使用『更正收據』保留歷史」屬行為契約未更動、不可改寫歷史入口保留、顯示層不得自行呼叫權限守門。
- **既有 badge 優先序未受影響**(實測確認):`_correctionVersionCount > 0` 的紀錄仍優先顯示「已更正 N 次」,「已鎖帳」只在未經更正的受保護紀錄出現;個人軌永遠不顯示。
- 測試補在 `tests/ledger-list-actions.test.js`:新文案存在、**舊文案「還款確認後保護」已從整份 `index.html` 移除**、說明句的出現條件與排序、CSS 語意色、以及上述行為契約各一則。
- 瀏覽器實測:375×812 說明句單行、320×700 兩行,皆位於歷史按鈕之前、不超出 sheet、水平溢位 0。
- 版本不遞增:v73 尚未發布,本項併入同一候選版,只做一次 SW 換代(依 2026-07-30 發布安排)。`APP_RELEASE_NOTES` 的 v73 條目補上對應的使用者版說明。
- 自動驗證:完整 **53／53** Node test files、Playwright **5／5**、`tools/check-doc-titles.js`、`tools/check-app-version.js` 通過。未合併 `main`、未 push `main`、未部署。

## 2026-07-30｜個人狀態備份 v1–v8 相容策略與還原矩陣（dev，測試與文件，無 runtime 變更）
- **不升 v9,維持 `PERSONAL_STATE_VERSION=8`**(Bar 裁定)。backlog #3b 原本要求把 `trip_shopping_units` 納入備份並升版,複驗發現該欄位早在 SW v72 的 v8 就已納入(`personalStateJson()` 已含 `shoppingUnits`、還原寫回並列於原子回滾 keys)。無新欄位卻升版,只會讓已發出的 v8 備份被 v8 裝置以「格式驗證失敗」拒絕,**憑空製造一個旅伴裝置間的相容斷點**。
- **真正的缺口是測試,不是格式。** 此前只有 v1／v2／v4／v8 有還原測試,**v3／v5／v6／v7 完全沒有**;而既有 `settings-backup-ux.test.js` 的 sandbox 用簡化假 store(`shoppingListStore.normalize` 只做淺拷貝),跑不到真正的遷移邏輯 —— 那份測試驗的是 UX 流程,不是版本相容性。
- **新增 `tests/personal-state-restore-matrix.test.js`** —— 本項的主要交付物。刻意注入 `index.html` 的**真實** store 實作(`createShoppingListStore`／`createLedgerOptionStore`／`normalizeShoppingItem`／數量遷移),只對 DOM 與 Ledger 紀錄等範圍外相依做最小 stub,斷言的是**還原後 `localStorage` 的實際內容**而不是版本號被接受。涵蓋:v1–v8 逐版本缺欄位預設值、`qty` 文字 →結構化數量遷移(不可解析時保留 `legacyQtyText` 不猜數字)、`buyFor`／`targets` → `allocations[]` 遷移、item 級 `ledgerLinks` 下放到 allocation 且已記帳關聯不得遺失、`done:true` 缺 `completedAt` 不編造完成時間、採買單位的 6 字上限／不可重複／「個」自動補回、未來版本一律拒絕、以及任一驗證失敗時裝置狀態一字不動。
- **已做對照驗證**:暫時破壞 `validatePersonalStatePayload()` 的 `payload.version<8` 分支後,矩陣測試確實失敗;`index.html` 已 byte-identical 還原。測試是承重的,不是裝飾。
- **新增 `docs/personal-state-compatibility.md`** —— 相容策略的文字契約。明確定義:①向後相容逐版本的缺欄位預設值;②**向前相容裁定為「拒絕」而非「忽略未知欄位」**(理由已寫入:舊版若當成相容而忽略新欄位,已記帳的採買項目會重新顯示成未記帳而重複入帳,數量整批消失 —— 寧可明確失敗也不要看似成功的錯資料);③採買單位既有規則與還原的互動;④全有或全無的失敗語意;⑤未來新增欄位的四項義務。
- **釐清一個既有誤解**:採買單位的「6」是**字數**上限(`SHOPPING_UNIT_MAX_LENGTH=6`),**不是筆數上限**。程式中沒有任何限制單位筆數的邏輯,還原 10 筆單位會全數保留。設定頁輸入框的 `maxlength="6"` 講的也是字數。
- **逐版本實測結果:無安全還原斷點**,v1–v8 全部可還原成功,無需犧牲任何版本。
- 本批**未修改任何 runtime 檔案**(`index.html` 未動,故不涉 SW 版本遞增)。`14_FILE_TIERS_AND_GATE.md` 的 Tier 1 範圍由 `docs/superpowers/` 放寬為整個 `docs/`,並註明相容性契約改動須連帶更新測試。
- 自動驗證:完整 **53／53** Node test files、`tools/check-doc-titles.js`、`tools/check-app-version.js` 通過。未合併 `main`、未 push `main`、未部署。

## 2026-07-30｜SW 更新完整性修正（dev，SW v73，待 Bar 真機驗收）
- **主要修復:新版 SW 不再把舊版 SHELL 裝進新快取。** 隔離實驗實測:在 `max-age=600` 的環境下,新版 Service Worker 的 `install` 會從 **HTTP cache** 取得舊版 SHELL —— 整個 update + install 週期只有 `sw.js` 一個 HTTP 請求,三個 SHELL 資源請求次數為 **0**,結果是「新快取名稱裝舊內容」;重載後更出現「新版 `index.html` 配舊版 `schema.js`」的靜默混版本。修法:`install` 改用 `cache:'reload'`(一次性、正確性優先),日常 network-first 改用 `cache:'no-cache'`(允許 304,省行動網路流量 —— `index.html` 約 726KB)。`addAll` 保留原子語意,只是改傳 `Request` 物件以指定 cache mode:任一資源失敗仍會讓 install 失敗、新 SW 不啟用、舊 SW 續命。網路失敗後的 CacheStorage fallback 完全不變,已實測關閉伺服器後仍完整離線載入。
- **次要防線:版本標記移回 `sw.js` 頂層。** `sw.js` 自帶 `var SW_VERSION='v73'`,`CACHE_NAME` 由它推導,並移除 `importScripts('./app-version.js')`。理由是 imported script 在 `updateViaCache` 預設值 `'imports'` 下**會**經過 HTTP cache:GitHub Pages 對 `app-version.js` 送 `max-age=600`,實測更新檢查期間該檔 HTTP 請求次數為 0,SW 判定「沒變」而不安裝新版。`app-version.js` **仍留在 SHELL**,`index.html` 要載它、離線必須有。
- **fallback 資源型別修正。** 原本任何同源資源在離線未命中時都會退回 `index.html`,導致 `<script>` 拿到 HTML 而解析失敗(實測 `APP_VERSION` 因此變成 `undefined`)。改為:CacheStorage 命中即回傳命中內容;未命中且為 navigation request 才退回 `index.html`;其餘子資源回 504。**攔截邊界一字未動**:跨域放行、非 GET 放行、同源 GET 維持 network-first;**SHELL 清單未動**(backlog #20 不在本批)。
- **App 端版本安全取值。** 新增以具名標記界定的 `appVersion()`／`appVersionLabel()`,`index.html` 三處使用點全部改走 helper,全檔不再有裸讀。版本檔缺失時:App 主功能不中斷、旅途紀錄記為空字串、「資料與版本」頁顯示 `SW 未知` 而非拋 `ReferenceError`。`APP_RELEASE_NOTES` 補 v73;維持 v72 核准的「恰好五筆」設計,由 v73 擠掉 v68,不讓清單長大。
- **`netlify.toml` 補 `/app-version.js` 的 no-cache header,並在註解標明這是防禦性設定而不是修復** —— Netlify 對 JS 資產的預設本來就是 `public,max-age=0,must-revalidate`(已實測),而 GitHub Pages 根本不讀 `netlify.toml`。真正的修復在 `sw.js`。
- **測試:舊契約反向改寫而非刪除。** `tests/pwa-shell.test.js` 原本鎖住的三項(必須 `importScripts`、`CACHE_NAME` 必須由 imported `APP_VERSION` 推導、`sw.js` 不得有版本字面)鎖的正是本批要移除的設計,改為鎖住新契約(頂層 `SW_VERSION`、`CACHE_NAME` 由它推導、不得 `importScripts`、程式碼不得引用 `APP_VERSION`、兩個版本必須相等),不允許回頭。新增 `tests/app-version-fallback.test.js` 與 Playwright `tests/browser/sw-update-cache.spec.js`;後者用**真實的 `sw.js`** 跑完整 C1.5 情境,並自帶 `versioned-server.js` 刻意送 `max-age=600`(用 `no-store` 的 `static-server.js` 測不出這個缺陷)。**已做對照驗證:把 cache mode 改回舊寫法,該測試會以 `Received: "QAGEN1"` 失敗** —— 確認測試抓得到回歸,不是形式上的綠燈。
- **版本字面逐一分類,未機械替換。** 8 個測試檔原本各自硬編碼 `v72`,改由新增的 `tests/support/version.js` 推導;`travel-notes` 的 `APP_VERSION:'v72'` 是 fixture、`theme-system` 的 v72–v69 是歷史 release note、`ios-zoom-guard` 的 `okayama-trip-v20` 是已淘汰 cache 名稱 —— 三者依裁定保留原字面。
- **`tools/check-app-version.js` 新增並掛入 CI。** 版本改為兩個檔案各自持有,代價必須由機器承擔:檢查兩個版本相等、`CACHE_NAME` 由 `SW_VERSION` 推導、`sw.js` 不得 `importScripts`、`index.html` 保有 helper 且無區塊外裸讀、`APP_RELEASE_NOTES` 最新一筆等於目前版本、`netlify.toml` 有對應規則。已做正負向驗證(改成 v74 會 exit 1 並指出兩邊各是什麼)。
- **CI 觸發策略(歸檔 backlog #21)。** `qa.yml` 的 `push.branches` 加入 `dev`,sanity job 在 dev 每次推送都跑;`browser-qa` 加 job-level `if` 條件,只在 pull request 與 `main` push 執行,避免 dev 每次推送都安裝 Chromium。**#21 原文只談 sanity 的 dev 觸發,browser-qa 維持現狀是本次裁定,未另立新項目。**
- **發布安排。** v72 從未正式發布,故與 v73 合併為**同一個候選版本、只做一次 SW 換代**,避免連續兩次「開兩次生效」的風險窗口。**不建立 `production-v72`**;待 v73 合併 `main`、正式部署完成、真機／PWA smoke test 通過後才建立 `production-v73`(已列入 `tasks/current.md` 的 Release Gate G6)。
- **驗收前置(16 §F5 新增)。** 2026-07-30 實測 Netlify 測試站線上仍停在 **SW v62**、`app-version.js` 回 404 —— 自動部署 2026-07-26 關閉後與 `dev` 差了 10 個版本。用它驗收 v73 前必須先手動部署到目標 commit,並核對線上 `sw.js`／`app-version.js` 版本與裝置端 CacheStorage 的**實際內容**(不是只看名稱對),**不得只根據 Git 分支判定已同步**。
- 自動驗證:完整 **52／52** Node test files、Playwright **5／5**、`tools/check-doc-titles.js`、`tools/check-app-version.js`、`git diff --check` 全通過。未合併 `main`、未 push `main`、未部署。

## 2026-07-30｜批次一 P1 後續裁定：#9 子頁形式追認與 v18 tag 上遠端（dev，治理與文件，無 runtime 變更）
- **backlog #9 的兩項形式差異由 Bar 追認為等價交付**，不另立獨立子頁：①「使用者版更新日誌子頁」併入「資料與版本」子頁，視為符合現行資訊架構；②「成員管理子頁」以身分區行內「切換／新增」入口搭配既有 `openMemberSelector()` overlay 實現，視為等價。裁定理由為功能無缺漏且不增加額外導覽層級。`tasks/done.md` 對應段落由「供 Bar 追認或另立調整項」改為已追認，**#9 維持完成，不新增 backlog 項目**。此裁定只改文件記述，`index.html` 的設定頁結構未動。
- **`production-v18` annotated tag 已 push `origin`**（Bar 核可，只 push tag 本身）。遠端驗證：tag 物件 `2f1987b`、`git cat-file -t` 回 `tag`（確為 annotated 而非 lightweight）、peeled `refs/tags/production-v18^{}` = `9eefcb0`，與本機 `git rev-parse` / `git rev-list -n1` 完全一致。同時確認 `origin/dev` 仍為 `8802863`、`origin/main` 仍為 `9eefcb0` — **未夾帶任何分支推送**。
- 自動驗證：完整 **51／51** Node test files、`tools/check-doc-titles.js` 通過。未修改任何 runtime 檔案；未合併 `main`、未 push `main`、未部署。
- 工具事故（依 `16_OPS_PLAYBOOK.md` §C 記錄）：本條目首次寫入時，AI 將含反引號的內容放進 bash 雙引號字串，反引號被當成命令替換執行，導致 shell 誤執行 `tasks/done.md` 等檔案內容並在根目錄產生一個 0 bytes 的空檔 `更新於`。已確認未產生任何 commit、`07_CHANGELOG.md` 未被寫入、`tasks/done.md` 的 diff 仍僅為預期的兩行，空檔已刪除。後續同類插入改為「內容寫入檔案 + 獨立腳本讀取」，不再把文件內容內嵌進 shell 字串。

## 2026-07-30｜批次一 P1：任務板歸位、六主題追認與 v18 回滾錨點（dev，治理與文件，無 runtime 變更）
- **Pre-Work Git Sync Gate 阻礙先清除**：主工作目錄長期掛著 Bar 未提交的 `tasks/backlog.md` #6 主題範圍原文修改（前一條目最後一行記載的待辦）。依 Bar 2026-07-30 裁定第 1 項，先以獨立 commit（`04de67f`）原樣接納該修改、不改一字不夾帶其他變更，後續歸檔才以此原文為基礎，歷史完整保留。
- **backlog #1／#3b／#6–#9 歸檔**（裁定第 4 項）。每項均先複驗 `index.html`、`tests/` 與本檔的實際證據，不採信任務板文字；證據逐項寫入 `tasks/done.md` 新增的「已歸檔的 backlog 編號項目」。`tasks/backlog.md` **保留原編號不重排**，檔頭註明缺號（1、3b、5、6–9、13–19）是刻意保留，因 `tasks/current.md`、`tasks/done.md` 與本檔都以編號互指。
- **兩處與原核准不符,如實記錄而非粉飾為等價**：①#6 交付 6 組主題，其中 `mist`（霧藍／瀨戶）與 `tea`（焙茶／倉敷）未經任何核准即納入，選項數亦超出原文「三或四」的待裁定區間 → 已由 Bar 追認，並依裁定第 3 項立 `adr/0008-theme-system-scope.md` 記錄原核准範圍、最終六主題、追認理由與未來閘門（新增／移除主題、變更預設主題一律須先核准）。②#9 的「使用者版更新日誌子頁」與「成員管理子頁」實際分別併入「資料與版本」子頁與身分區行內按鈕，非獨立子頁；屬設計時的形式選擇而非實作遺漏，但與 backlog 原文字面不符，列出供 Bar 追認。
- **#3b 前提複驗結果與原敘述相反**：原 backlog 寫「`trip_shopping_units` 不在備份 payload 內」「目前 v7」，實測 `index.html:7421` payload 已含 `shoppingUnits`、`:7497` 還原寫回並列於原子回滾 keys、`:3815` `PERSONAL_STATE_VERSION=8`，`tests/settings-backup-ux.test.js:145` 已斷言。需求本體在 SW v72 即已滿足，故歸檔而非重做。**真正的殘留缺口是還原測試只覆蓋 v1／v2／v4／v8，v3／v5／v6／v7 完全沒有還原測試**；依裁定第 2 項不升 v9、維持 `PERSONAL_STATE_VERSION=8`，改補 v1–v8 還原矩陣測試與相容策略文件化，列入本批 P3。
- **真機／PWA 驗收改列 Release Gate**（裁定第 4 項）。`tasks/current.md` 新增 G1–G5，明確區分 Bar 專屬職責（真機驗收、PR merge、線上驗證）與 AI 職責（交付與全綠），已完成的功能不再因驗收未做而滯留 backlog。
- **`app-version.js` 補列 Tier 2 並定義 PWA 風險群組**（裁定第 7 項）。P0 盤點發現 `14_FILE_TIERS_AND_GATE.md` 完全沒有收錄 `app-version.js`，但它是 `CACHE_NAME` 的唯一來源，改壞等同改壞 `sw.js`。同時把 `sw.js`、`app-version.js` 與 `netlify.toml` 的 cache header 定義為同一風險群組：四項確認以群組為單位提出，群組內版本／header 不一致視為交付缺陷。原本模糊的「Netlify 部署設定」一列具名為 `netlify.toml`。
- **建立第一個正式版回滾錨點**（裁定第 8 項）。annotated tag `production-v18` → `9eefcb0`（2026-07-18，SW cache `okayama-trip-v18`），message 含建立日期、對應 SW 版本、建立原因與完整回滾指令。本 repo 在此之前**沒有任何 tag**，正式版只能靠 SHA 或 Netlify 快照回頭找。`16_OPS_PLAYBOOK.md` 新增 §A5：區分「程式碼錨點」與「部署動作」（止血一律先做 §A1 Netlify Publish deploy）、寫實 Netlify 雙站行為（正式站追蹤 `main` 自動部署；測試站自動部署 2026-07-26 已關閉，回滾不同步影響）、記下回滾後 `app-version.js` 從部署消失會讓已裝 v72 SW 的裝置 404 → 退回 `index.html` 導致 JS 解析失敗，故須以真機而非無痕確認 SW 換代。**tag 尚未 push `origin`，依裁定第 8 項待 Bar 確認。**
- 順帶修正 `.ai-manifest.json` 的 `adr_dir` 索引漂移：原本停在 0006，漏收已存在的 `0007-settlement-handshake`，本次一併補上並標明索引權威為 `adr/README.md`。
- 自動驗證：完整 **51／51** Node test files（P1 動工前基準線與交付後皆全綠）、`tools/check-doc-titles.js` 通過。本批**未修改任何 runtime 檔案**（`index.html`／`sw.js`／`app-version.js`／`schema.js`／`validator.js` 皆未動），故不涉 SW 版本遞增，亦未跑 Playwright／Browser QA。未合併 `main`、未 push `main`、未部署。

## 2026-07-30｜設定頁 2.0、六組主題與旅途紀錄（dev，SW v72，待 Bar 真機驗收）
- 設定根頁依核准順序重組為「身分 → 主題 → 代購對象 → 帳務 → 自訂項目 → 資料與版本 → 測試模式」；身分卡縮短，`目前身分`、`切換`、`新增` 同列。代購對象、匯率／預設幣別、自訂類別／支付方式／採買單位、備份與版本資訊改為子頁，舊設定入口仍有相容映射，根頁與子頁各自保留 scroll。
- 新增海洋／岡山、象牙／靛藍、藤紫／夜櫻、杉綠／宮島、霧藍／瀨戶、焙茶／倉敷六組淺色主題。色彩改為 13 個第一層 `--t-*` token＋既有角色變數第二層對映；未知主題回退海洋並記診斷，互動切換採 storage write-first，寫入失敗不留下假選取狀態。
- 底部今天／行程／購物／分帳與設定入口的五個功能 Emoji 改為同一組 `currentColor` outline inline SVG；分帳 badge、可存取名稱、桃子診斷徽章與交通／內容 Emoji 保留。
- 診斷面板新增只存在本機的旅途紀錄：異常／優化建議、待評估／已處理、修改、確認刪除、篩選、文字摘要／JSON 複製匯出，最多 200 筆並保存頁面、App 版本、連線／同步與健康摘要。桃子徽章原本的 300ms 兩次 `touchend` 入口未改；桌面瀏覽器不模擬 touch，因此此入口仍由既有 iOS 契約測試與後續 Bar 真機驗收覆蓋。
- 個人備份升 v8，新增 `themeId`、`shoppingUnits`、`travelNotes`；v1–v7 還原保留裝置現有的三項新狀態，v8 先完整驗證再把所有舊／新 key 一次寫入，任一寫入失敗整批回復，成功後才套用主題。Browser QA 首輪因此抓到正式 option store 未暴露 `normalize()` 的落差，補測試與正式介面後重驗通過。
- `app-version.js` 成為 App 與 Service Worker 的版本單一來源，`sw.js` 以 `APP_VERSION` 推導 cache 並快取版本檔；設定「資料與版本」顯示 `SW v72` 與 v72–v68 五筆使用者版更新說明。
- 自動驗證：完整 **51／51** Node test files、Playwright 三情境 **3／3**、文件標題、manifest JSON 與 `git diff --check` 通過。Browser QA 於 320×700、375×812、390×844 驗證七區順序、身分按鈕 38px、四個子頁、六主題 `data-theme`／meta／topbar／tabbar、四個 tab SVG＋設定 SVG、水平溢位 0、console error／warning 0；根頁 ↔ 資料與版本返回 scroll delta 0。v8 還原後霧藍主題、2 筆採買單位與 1 筆旅途紀錄成功寫入，重載後主題與自訂單位仍存在；旅途紀錄資料與原子回滾另由 `travel-notes.test.js`／`settings-backup-ux.test.js` 完整驗證。
- 本批在 `codex/sw-v72-settings-themes` 隔離分支分段提交後已 push `dev`（runtime 截點 `b372f49`）；尚未合併 `main` 或部署，Bar 真機／PWA 驗收仍待完成。
- `tasks/backlog.md` 的完成項清理由於主工作目錄已有 Bar 尚未提交的 #6 主題範圍原文修改，本批不覆蓋也不納入提交；待 Bar 完成該原文修改後，再以其內容為基礎移除已完成的 #3b／#6／#7／#8／#9。

## 2026-07-30｜Playwright 三情境 QA 入版控（dev，測試基礎設施）
- 新增 `@playwright/test`、固定單 worker 的 `playwright.config.js` 與 Node 內建靜態伺服器；測試資產限定在 `tests/browser/`，不會把既有 `tests/*.test.js` 誤當 Playwright 規格執行。
- 三情境直接啟動真實 `index.html`：斷網時要求 `CURRENT_SNAPSHOT.source === 'builtin'`；連網情境以完整內建 CSV 模擬所有 Sheet 回應並要求原子 online 快照寫入；旅行日以固定 `Date` 驗證 `10/18`、Day 1 與今天頁。三者都收集並要求 `pageerror=0`。
- `.github/workflows/qa.yml` 新增獨立 `browser-qa` job，使用 `npm ci`、安裝 Chromium 後執行 `npm run test:browser`。本機 Chromium 實跑 3／3 通過。
- Bar 同日確認 SW v69–v71 已完成真機／PWA 驗收；`dev → main` 與正式部署仍未核准。本批未修改 App runtime、Schema、Apps Script、TripConfig 或 Service Worker 版本。

## 2026-07-30｜整張收據作廢預覽動作去重（dev，SW v71，Bar 真機驗收通過）
- 更正收據在完成整張作廢預覽後，主要按鈕「確認整張作廢」與次要按鈕「重新預覽作廢」原本都呼叫 `saveLedgerCorrection(true)`；後者沒有重新產生不同預覽，只會走同一個最終確認，因此移除重複且誤導的入口。
- 作廢預覽前仍保留「整張收據作廢」；作廢預覽後只保留「確認整張作廢」。一般更正預覽、`saveLedgerCorrection`、preview signature、commit-last、canonical conflict、append-only 事件、權限與歷史均未修改。
- 新增兩階段按鈕契約測試，Service Worker cache 升 `okayama-trip-v71`。完整 49／49 Node test files、文件標題、manifest JSON 與 `git diff --check` 通過；App runtime 已 commit 並推送 `dev`（`8949449`）。

## 2026-07-30｜新增消費分攤成員選取色差（dev，SW v70，Bar 真機驗收通過）
- 真機回饋指出新增消費／更正收據共用的分攤成員按鈕，選取後背景與區塊底色無法區分。根因是 `.ledger-participant-choice.on` 引用未定義的 `--mint`，瀏覽器忽略該背景宣告。
- 選取狀態改為中度青綠底 `#d6e8e4`、深色文字與既有深色邊框；保留勾號、`aria-pressed`、分攤資料與點選 handler。未定義全域 `--mint`，避免連動其他畫面。
- 「確認整張作廢」與「重新預覽作廢」目前皆呼叫 `saveLedgerCorrection(true)` 的重複行為已完成討論，本批不修改作廢流程。Service Worker cache 升 `okayama-trip-v70`。
- 測試先紅燈確認舊背景無效，再最小修正。完整 49／49 Node tests 與文件標題檢查通過；實際瀏覽器驗證選取為 `rgb(214, 232, 228)`、未選取為白色、外層為 `rgb(243, 248, 246)`，`aria-pressed` 正確切換且 console error／warning 0。

## 2026-07-29｜結算一致性與收據級引導式更正（dev，SW v69，Bar 真機驗收通過）
- 還款確認後，claim 建立切點前已存在的正式／TEST 收據永久禁止直接編輯與刪除；全團歸零不解除保護。付款人操作選單改為「更正收據」，其他成員只看到權限說明；批次刪除與 handler 仍會再次 fail-closed。
- 新增 append-only `expense_correction_item`／`expense_correction_commit`／`expense_void_commit`。更正以完整收據版本提交，item 全數先進 durable queue、commit 最後寫入；缺件、跨付款人、跨 universe 或 manifest 不一致皆不生效。同一上一版本的並行提交以 `(time,id)` 選唯一 canonical，losing sibling 保留歷史但永不自動升格。
- 更正 Sheet 固定原付款人、要求 1–50 字原因，允許新增／移除／修改整張收據品項；第一次送出只預覽新舊總額與成員餘額差，第二次才入列。整張作廢走同一預覽與追加事件，不建立 deletion。既有還款確認保持終局，更正差額形成新待結算餘額。
- 清單顯示保護或更正次數；明細可查看原始版本、每次 canonical 更正、作廢與未套用衝突。完整紀錄另保留已作廢收據入口。Schema 升 2.9，但 Ledger 仍為既有 21 欄，Apps Script API 與依賴不變；Service Worker cache 升 `okayama-trip-v69`。
- **獨立審查後加固**：一般團體編輯在最終送出前重讀 merged events，避免還款確認後仍由 stale 表單繞過保護；更正預覽納入完整事件集 fingerprint，跨裝置同步有變化時必須重新預覽。canonical confirm／claim ID 與遠端更正時間格式異常皆 fail-closed，診斷統一歸類 `AppLog.data`。預覽補上新增／移除／修改品項、受影響成員及「已結清後產生新待結算餘額」警示；歷史補上操作人、各版本金額／類別／參與者。

## 2026-07-29｜採買清單 C＋E＋G 第三批（dev，SW v68，待真機驗收）
- **C 根因與修正**：Ledger 多品項個人↔團體切軌原本用有限 seed 重建每列，只複製名稱、金額、分類與免稅，會遺失逐項代購／分攤狀態、穩定 row key 與 `sourceShoppingItemId`／`sourceShoppingAllocationId`，造成切軌後代購對象消失或採買關聯回寫錯列。現改由純 transformer 泛用複製 draft、顯式 clone nested arrays，首次進入另一帳本才套該軌預設；個人與團體隱藏狀態同時保留，但提交仍只序列化目前帳本軌，兩類對象不互相推導，來源 IDs 不進 Ledger 21 欄。
- **E 根因與修正**：原顯示排序只到日期／站點，組內完全沿用 store order，必買容易被一般品項淹沒。新增 immutable stable partition，只把 exact `category === '必買'` 置頂；一般站點、待確認、已失效、隨時可買與 Today 共用規則，必買／非必買各自保留原順序。已買頁與 localStorage array order 不套用此排序。
- **G 根因與修正**：新增／編輯表單嵌在清單頂端，每次表單欄位重繪都重建整份清單，深層編輯會失去位置；連續新增還以 `requestAnimationFrame` 延後焦點，行動鍵盤可能先收起。現改為單一獨立 modal Sheet 與 ephemeral form session，保存 mode、item ID、來源 detail/list、scrollTop、原分類／站點與 `savePending`；取消／儲存以 `data-shopping-item-id` 返回原卡片，移動後依同一 ID 捲入視野，detail 入口則重開更新後明細。validation／store failure 保持 Sheet 與輸入，首個錯誤欄位接回焦點；pending 時停用關閉／取消／儲存並防重入。
- **連續新增與保護**：「儲存並新增」沿用分類／站點，清空品名／對象等品項輸入並固定重設 `1 個`，同一使用者動作內在 Toast 前同步 focus `shoppingName`。部分購買、已買後記帳、checkbox、多選與 `⋯` 的既有事件邊界均未移動；Shopping schema、備份 v7、Ledger 21 欄、Apps Script、Google Sheet、同步與結算皆未修改。
- **測試證據**：完整 **48／48** Node test files 通過（含 **123／123** settlement reliability checks），文件標題檢查與 `git diff --check` 通過。Browser QA 於 **320×700、375×812、390×844** 驗證：Sheet／清單／卡片水平溢位皆 0；深層卡片開 Sheet 時 list scrollTop 不變，取消後 scroll delta 0；改分類後同 item ID 在新位置取得焦點；明細編輯儲存後重開明細；連續新增每次 active element 都是 `shoppingName` 且 `1 個`／站點保留；數量錯誤不寫入並聚焦 `shoppingQuantity`；已買頁維持 store order；兩筆不同代購對象的多品項草稿經個人→團體→個人→團體切換後仍保留列與各自狀態，未提交團體資料。停止本機伺服器後，v68 外殼可離線重載，採買清單與獨立 Sheet 均可開啟；console error／warning 為 0。
- **未完成宣告**：桌面 Browser QA 不能證明 iPhone 軟鍵盤生命週期；Safari 與已安裝 PWA 的「儲存並新增後鍵盤保持開啟、游標位於品名」仍列 Bar 真機驗收。App runtime 已 commit 並推送 `dev`（`0c5fe45`），未部署、未合併 `main`。

## 2026-07-28｜新增消費展開縫隙、採買待買卡片精簡與安全回併（dev，SW v67，待 Bar 真機驗收）
- **根因**：`.ledger-entry-secondary` 沒有建立獨立 block formatting context，第一個 `.ledger-sheet-field` 的 `margin-top:10px` 會穿出父層；因此摘要與展開內容之間露出 10px 米色背景，看起來像兩張不相連的卡片。
- **修正**：展開容器改為 `display:flow-root`，阻止 first-child margin collapse；摘要與淡藍內容邊框無縫相接，原本 10px 欄位留白仍保留在內容背景內。未使用 overflow 裁切，日期選擇器 popover 邊界不受影響。
- **待買卡片重複站點的根因與修正**：待買頁已有站點群組標題，卡片 renderer 卻仍固定輸出地點列，造成資訊重複與卡片增高。renderer 現在必須接收明確的 pending／done page context：一般站點、待確認、已失效、隨時可買四類待買卡與其多選模式都不建立地點 DOM；已買卡片仍保留地點，待買／已買明細與 Today 站點群組維持原資訊。
- **拆分後無法回併的根因與統一操作**：原本 checkbox、批次移回與完成 Toast 復原各自只 patch `done:false`，Store 沒有反向合併邊界。三條路徑現統一呼叫原子 `moveBackToPending(ids)`，一次讀取、一次轉換計畫、一次 normalize／write；單筆與批次不再產生不同結果，任一目標不存在或寫入失敗時資料完全不變。
- **安全回併與未合併保護**：只有 group 全部待買、原 ID 存在、品名／分類／單位／站點／legacy 狀態一致、allocation 為可安全加總的正整數、所有 append-only `ledgerLinks[]` 完全無歷史、canonical 對象唯一且不混用自己／代購時才回併。結果保留原 item ID／`createdAt`，原 item allocation ID 優先，否則沿用 store order 最前 sibling 的既有 ID，清除 `completedAt`／`splitGroupId` 並原子移除 sibling。仍有已買 sibling、欄位差異、legacy、溢位、資料缺損或 active／unverified／released 等任何 link 歷史時只完成移回、不猜測或吞併資料；批次只顯示一則彙總 Toast。
- Browser QA：320×700、375×812、390×844 的新增消費摘要／內容外部 gap 均為 **0px**、內容內距均為 **10px**；採買頁面、panel、卡片與 Toast 水平溢位均為 **0px**，待買卡位置列為 0、已買卡位置列完整，待買／已買明細站點均保留，console error／warning 為 0。實測單人 2＋3 回併為 5、多人逐對象回併為 6、仍有已買 sibling／單位不同／released 歷史維持分開，跨兩個 split group 批次顯示 `已將 2 項移回待買，並合併 2 組`。完整 **47／47** Node tests（含 123／123 reliability checks）、`tools/check-doc-titles.js` 與 `git diff --check` 通過；Service Worker cache 僅由 `okayama-trip-v66` → `okayama-trip-v67`，本批不重複升版。

## 2026-07-28｜新增消費表單、採買預設單位與全站思源黑體優化（dev，SW v66，待 Bar 真機驗收）
- **新增消費主流程重新分層**：單品項依序保留金額、明細、代購開關／對象，再以淡海水灰藍、1px 邊框、10px 圓角的 `其他資訊（選填）` 收合類別、支付方式與日期；摘要顯示 `類別｜支付方式｜今天／M/D／YYYY/M/D`。明細鍵盤改為 Next，個人帳聚焦代購開關、團體帳聚焦分攤成員；不再由鍵盤 Enter 直接送出。儲存按鈕與原有 validation／pending guard／idempotency 流程未改。
- **採買預設為 `1 個`**：新項目與「儲存並新增」都預設數量 1、單位 `個`；單位下拉移除空白／「不指定」。`shoppingUnitStore` 讀取時保證包含 `個`，設定頁嘗試刪除時保留資料並顯示 `「個」是新增採買項目的預設單位，無法刪除。`。既有非空單位原樣保留；舊資料空單位只在編輯草稿預選 `個`，未儲存前不回寫。
- **全站繁中字型一致化**：以 Google Fonts `Noto Sans TC` 400／500／700（`display=swap`）為第一順位，fallback 固定為 `"PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif`；移除日文字型優先序。外部字型不可用時仍由系統繁中字型呈現，Service Worker 不新增跨來源字型快取策略。
- Browser QA：320×700、375×812、390×844、430×932 全數通過，新增消費 dialog 與控制項無水平溢位；明細 Enter 實測聚焦 `ledgerProxy`，代購對象顯示正常；採買表單實測為 `1 個` 且無空白／「不指定」選項；設定頁刪除 `個` 的保護 Toast 精確通過。停止本機伺服器後仍可由 v66 快取離線重載，字型 fallback 鏈仍保留。
- **邊界未變**：分類 mapping、Shopping Item／個人備份 v7、Ledger 21 欄、Apps Script、Google Sheet、Repository／Queue／Bridge／Retry、結算、append-only `ledgerLinks[]`、`改回未記帳` 與 SW 策略皆未修改；未做資料 migration、未部署。完整 **46／46** Node tests、`tools/check-doc-titles.js` 與 `git diff --check` 通過；Service Worker cache 僅由 `okayama-trip-v65` → `okayama-trip-v66`。

## 2026-07-27｜採買卡片視覺一致性、部分購買與多選互動（dev，SW v65，待 Bar 真機驗收）
- **中文字體粗細不一致的根因修正**：原本全站把 `Hiragino Sans` 放在繁中字型之前，瀏覽器會依單一字形是否存在逐字 fallback，因此同一控制項內的「媽媽／爸爸」、「稅與優惠券」與「信用卡」可能看起來粗細不同。全站改用 `"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif`；Browser 實測採買代購選項、稅與優惠券及信用卡皆讀到相同 font-family。
- **卡片 badge 改為語意分工**：代購顯示改為 `幫 [阿寶] [媽媽] +1 買`，只有姓名套 coral／淡紅底 badge；「幫」／「買」／`+N` 使用普通文字，不再顯示 `、`，aria-label 仍保留完整語意。分類改為淡金底／深金字，形狀、間距與姓名 badge 對齊，不再與品名或代購同色。
- **「部分買到」改為卡片上的「部分購買」**：入口從 `⋯` 移到待買卡片，只有整筆 `unlinked`、全部 allocation 為安全正整數且總需求大於 1 時出現。自己的數量 1、legacy 數量、已買、`linked`／`partial`／`unverified` 都不顯示；自己的數量 2 與三位各 1 份都會顯示。既有逐 allocation 拆分、store 原子寫入及 Ledger 防重複規則未改。
- **採買明細縮短高度**：標題改為「代購對象與記帳紀錄」；對象與 `需求 3 包 · 待買 1 包`／`需求 3 包 · 已買 2 包` 同行，窄螢幕才自然換行。底部「編輯」與「記帳未完成對象」兩顆等寬同行；沒有未記帳對象時，編輯維持全寬。
- **批次 selection 與完成 checkbox 完全分離**：待買與已買進入多選時，選取框都從未勾開始且只讀 `shoppingUiState.selected`；點 checkbox 或卡片只切換 selection，不改 `done`。多選時隱藏卡片的「部分購買」／「記帳」／`⋯`；0 項只顯示「請選擇項目」，選取後改為同一行 `已選 N`＋三顆等寬、不斷行、44px 高按鈕。修正原本 `.shopping-selection-toolbar-stacked` 被後方 base selector 蓋掉而在真機擠成直排文字的 CSS 順序問題，並加入 66px safe-area spacer，避免最後卡片被固定工具列遮住。
- Browser QA：390×844、375×812、320×700 全數通過；document、採買 panel 與卡片水平溢位皆為 0。320px 三顆批次按鈕各約 75px、同一 y 軸、44px 高、`white-space:nowrap`；完成與 selection 切換、卡片點擊、取消多選恢復、部分購買表單、待買／已買明細與最後卡片避讓皆實測通過，console error／warning 為 0。
- **邊界未變**：Shopping Item `allocations[]`、個人狀態備份 v7、Ledger 21 欄、Apps Script、Google Sheet、同步、結算與 split persistence semantics 皆未修改。完整 **45／45** Node tests、`tools/check-doc-titles.js` 與 `git diff --check` 通過；Service Worker cache `okayama-trip-v64` → `okayama-trip-v65`，未部署任何站點。

## 2026-07-27｜採買清單代購分配、逐人記帳與卡片明細（dev，SW v64，待 Bar 真機驗收）
- **資料模型改為逐人分配**：Shopping Item 以 `allocations[]` 保存每一位對象的穩定 `allocationId`、`target`、`quantity` 與 append-only `ledgerLinks[]`。沒有代購對象時仍建立一筆「自己」分配；同一項目不可混用「自己」與代購對象，也不可出現正規化後重複的對象。新建多對象目前採**相同數量／人**，但資料契約與部分購買流程已能保存不同數量，未來開放逐人輸入時不需再改資料格式。
- **代購對象多選與數量摘要**：新增／編輯表單可多選對象，並保留「新增對象」入口；新對象建立後會立即加入共用名單且自動選取。相同數量顯示 `2 盒／人 · 共 6 盒`，不同數量顯示 `共 4 盒 · 3 位`；卡片最多顯示前兩位，三位以上為 `幫阿寶、媽媽 +1 買`，完整名單可進明細查看。
- **卡片資訊重新分層**：品名後方同行顯示代購對象與記帳狀態；代購 badge 沿用行程卡時間的 coral／淡紅底視覺，分類改用 mint badge 明確區隔，下一行顯示分類與數量，站點仍獨立一行。已買卡依 allocation 聚合為 `未記帳`、`記帳 2／3`、`已記帳` 或 `狀態待確認`，不再以 item-level link 粗略判斷。
- **新增「儲存並新增」**：建立成功後保留分類與行程站點，數量回到 1；品名、單位、代購對象與其他輸入全部清空，方便在同一站連續建立多筆。普通「儲存」仍結束表單。
- **逐人部分購買**：部分買到時每位對象各自輸入本次數量，可輸入 0；系統可靠計算已買與剩餘 allocation，原 item ID 留給已買部分、剩餘仍插在正後方並沿用 `splitGroupId`。明細以同一 split group 重建原需求，能顯示「原需求 2 盒 · 此卡 1 盒」。
- **逐人 Buy-to-Ledger**：每個未記帳 allocation 對應一筆 Ledger 品項，並自動帶入原代購對象；draft 同時保留 `sourceShoppingItemId` 與 `sourceShoppingAllocationId`，依提交品項順序逐筆回寫對應 allocation。卡片與明細的狀態仍由 Ledger／queue／bridge／replacement／tombstone 即時推導，來源 ID 不進 Ledger 21 欄、不送 Apps Script、不入 Sheet。
- **採買卡片可開完整明細**：點卡片顯示對象、分類、目前數量、同源原需求、完成時間、站點與記帳進度；逐人列出原需求／此卡數量及帳本狀態，已關聯者可進原消費紀錄並返回採買明細，未記帳者可直接建立剩餘對象的消費。checkbox、列上「記帳」與 `⋯` 維持各自事件邊界，不會誤開明細。
- **編輯與刪除保護改到 allocation 粒度**：已記帳或狀態待確認的對象，其對象名稱、數量與 links 都鎖定；同一項目內仍可調整未記帳對象。刪除警告改以「幾位」分別統計 linked／unverified，並維持不修改或刪除 Ledger 原紀錄的既有語意。
- **分類與代購定位分離**：分類選項不再含「代購」；代購身分只由 allocation target 決定。舊資料的 `category:'代購'` 會安全降級為空分類，`buyFor`／item-level `quantity`／item-level `ledgerLinks` 會在讀取時轉為 v7 allocation，無需保留測試資料的舊畫面相容層。
- **個人狀態備份升至 v7**：新匯出保存 `allocations[]`；v1～v6 仍可還原並經 normalizer 補成 v7，未知未來版本與錯誤型別明確拒絕。`trip_shopping_list` key、Ledger 21 欄、Apps Script、Google Sheet、結算、團體權限、採買雲端同步與 SW 策略皆未改。
- 測試：完整 **45／45** Node tests、`tools/check-doc-titles.js` 與 `git diff --check` 通過；結算可靠性另含 **123** 個子檢查。Browser QA 320／375／390px 實測多選新增、建立對象後自動選取、`儲存並新增` 保留／清空規則、三人摘要、逐人部分購買、待買與已買明細、checkbox／記帳／`⋯` 事件邊界；文件、清單 panel 與明細 panel 水平溢出皆為 0，長品名正常換行，明細按鈕高 44px，console error／warning 為 0。Service Worker cache `okayama-trip-v63` → `okayama-trip-v64`。
## 2026-07-26｜採買清單真機回饋批：單位下拉、卡片分層、動作收進 ⋯（dev，SW v63，待 Bar 真機驗收）
- Bar 於 SW v62 真機驗收後的三項回饋，本批一次處理。
- **單位改下拉並與數量並排**：12 顆 chips 佔兩行、數量欄卻用不到那麼寬。改為 `數量 | 單位` 兩欄同列，單位用 `<select>`（iOS 叫原生滾輪，比 chips 好按）。實測 375px 各 158px、320px 各 131px、字級 16px（不觸發 iOS zoom）。
- **新增單位移到設定頁**：新增 `shoppingUnitStore`，沿用既有泛用的 `createLedgerOptionStore`（key `trip_shopping_units`，預設即原本 12 個常用單位）。`ledgerOptionStoreForKind()` 加一個分支、設定頁多呼叫一次 `renderLedgerOptionManager('shoppingUnit','採買單位')` 即可——**沒有另造 UI**，區塊標題改為「自訂類別、支付方式與採買單位」。實測新增／刪除／超長拒絕（`名稱最多 6 個字`）皆生效，且表單下拉即時反映。
- **單位上限 10 → 6**：與設定頁選項共用的 `normalizeLedgerOption()` 對齊，消除「表單存得下、設定頁加不進去」的兩套規則。Bar 確認現有與未來單位皆不超過 6 字，故不留過渡期。
- **自訂單位不被靜默改掉**：拿掉自由輸入後，若項目目前的單位不在清單內（使用者曾自訂、或舊 `qty` migration 帶出的 `家庭號`），下拉會補一個以自身為值的**選中** option 並標「（自訂）」。實測不碰下拉直接儲存，`unit` 仍為 `家庭號`。作法與 A＋F 批處理孤兒 `stopRef` 一致。
- **已買卡片重新分層**：原本「狀態徽章＋分類＋數量＋三顆動作按鈕」擠在同一行同一視覺層級，地點被推到第三行且與上一行斷開。改為固定三層——品名／屬性（`·` 分隔）／地點（獨立一行）。新增純函式 `shoppingItemAttrLine()` 與 `shoppingItemLocationLine()` 取代原本混合的 `shoppingItemMeta()`（已移除）。數量拿掉「數量」前綴（有單位就看得出來，與 v51 拿掉「退回原因:」同一個理由）。
- **動作收進 `⋯`**：沿用帳本既有的 `.ledger-action-popover` 樣式與定位邏輯，未另造一套視覺；popover z-index 155 高於採買 overlay 的 145，實測 320px 仍完整落在畫面內。選單內容依共用 resolver 的三態決定：`linked` → `改回未記帳｜編輯｜刪除`、`unlinked`+已買 → 列上直接給「記帳」＋選單 `編輯｜刪除`、`unverified` → `編輯｜刪除`（兩種記帳入口都不給）、待買 → `部分買到｜編輯｜刪除`。**「記帳」刻意留在列上**——買到→記帳是主流程，不該多一次點擊。刪除移入選單等於多一層誤觸防護，既有 `confirm()` 保留不動。
- **「重新開放記帳」更名為「改回未記帳」，並改用自訂確認視窗**：Bar 原提「重新記帳」，未採用——`07_CHANGELOG` v57 已有同型裁定（`重新付款` → `我已付款`，理由是「祈使句讀起來像 App 會代為執行」），而按下它只是清掉標記、還要再點一次「記帳」。改採 Bar 裁定的資訊層級：**操作名稱維持簡短，「帳本不受影響」由確認視窗負責說完整**。視窗標題 `改回未記帳？`、按鈕 `取消`／`改回未記帳`，說明分兩句並區分顏色：先講「不會發生什麼」（只會移除這個採買項目的「已記帳」標記，不會刪除或修改帳本中的消費紀錄。），再以 coral 講「可能發生什麼」（若帳本中的原紀錄仍在，再次記帳可能產生重複消費。）——後者才是這個操作真正的風險，尤其在 `unverified` 下系統看不到那筆紀錄時。兩句同色會讓風險被稀釋成說明。原生 `confirm()` 的按鈕文案不可自訂，故改用自訂視窗——**沿用 B 批移除三選一 Modal 後閒置的 `.shopping-choice-overlay`（z-index 160，高於採買 overlay 的 145），零新增 CSS，同時讓那段死碼重新有用途**。實測 375px 面板 330px、320px 面板 288px，兩顆按鈕各 44px 高，皆完整落在畫面內、溢出 0。
- **確認「刪掉帳本紀錄會自動改回未記帳」為既有行為**：狀態是每次重繪即時推導而非存下來的，實跑驗證個人帳（讀不到即權威 → `unlinked`）與團體帳（有效墓碑且無 replacement → `unlinked`）都會自動翻回未記帳，記帳按鈕自動出現，**不需要按任何東西**。手動入口只補自動化決定不了的 `unverified`（找不到但無法證明已刪除）與「消費是真的、只是連錯採買項目」兩種情形，因此只在 `linked` 提供。已於 `CONTEXT.md` 明文記下「不得改成找不到就自動當作已刪除」的理由。
- **選單生命週期**：`renderShoppingListOverlay()` 與 `closeShoppingList()` 都會先收掉 popover（重繪後原觸發按鈕已不存在）；另註冊 outside-click／Escape／scroll（capture）／resize 關閉，與帳本同樣的四道。
- **未修改**：Shopping Item 資料契約（`quantity`／`unit`／`legacyQtyText`／`ledgerLinks`／`releasedAt`／`splitGroupId`／`completedAt` 語意全部不變）、個人狀態備份版本（無新欄位，維持 v6）、Ledger 21 欄 Schema、Apps Script、Google Sheet、結算、團體權限、A＋F 排序與孤兒三態、B＋D 三態推導與交握時點、採買雲端同步。
- **已知落差**：`trip_shopping_units` 未納入個人狀態備份（備份目前含 `ledgerCategories`／`ledgerPayMethods`）。這是本批動工前四項確認裡刻意排除的範圍（納入就得再升版）。影響有限——還原後自訂單位會退回預設清單，但既有項目的 `unit` 字串仍存在項目上且照常顯示。已列入 backlog。
- 測試：先寫紅燈（`SHOPPING_UNIT_MAX_LENGTH` 仍為 10）再最小實作。完整 **45／45** Node tests 與 `tools/check-doc-titles.js` 通過；`ledger-entry-settings.test.js` 與 `shopping-ledger-links.test.js` 的既有斷言依新契約更新（設定頁標題、單位來源、不再有自由輸入）。Browser QA 320／375／390px：三態動作組合、`⋯` 選單四種內容與定位、單位下拉與自訂單位保留、設定頁單位管理、極端長品名（40 字）＋長單位；頁面與逐元件橫向溢出皆為 0、最小 tap target 40px、輸入欄 16px、console error 0、Scroll-only 與 safe-area 未退化。卡片高度由「2 行擠＋動作溢出」變成穩定 62–78px（極端長品名 104px）。Service Worker cache `okayama-trip-v62` → `okayama-trip-v63`。
## 2026-07-26｜Ops:Netlify 測試站改為手動部署（dev，純文件）
- **Bar 已於 Netlify 後台手動停用測試站 `dev-trippilot-jp` 的自動部署**，並手動觸發過一次部署。本批只更新文件以反映現況，未修改任何部署設定。
- **實測確認**（以推送 `4ead180` 作對照，GitHub Pages 為正對照）：推送後 Pages 的 `07_CHANGELOG.md` 由 71,741 增為 73,901 字元並出現新條目，Netlify 測試站停在 71,728 字元、無新條目 —— 同一次推送一邊更新一邊不動，確認自動部署已停。Bar 手動觸發後複查，測試站最新條目已與 `dev` HEAD 一致，`sw.js` 為 `okayama-trip-v62`。正式站維持 v18（追蹤 `main`，未受影響）。
- 因此**修正上一批（`4ead180`）寫下的過時敘述**：該批當時實測測試站仍會自動部署，故寫入「仍會在每次推送自動部署」「要停止須改 Netlify settings、待 Bar 裁定」。Bar 隨即完成關閉，該敘述於數分鐘內失效，本批更正。
- `16_OPS_PLAYBOOK.md` §E:通道表「觸發」欄改為「已停用自動部署（2026-07-26 由 Bar 手動關閉）。需要時於 Netlify 後台手動觸發部署;待系統穩定後，由 Bar 決定並恢復自動部署」;敘述段改為手動部署模型，明寫 **GitHub 分支更新不代表測試站已同步更新**;結尾「Push 至 `dev` 會同時更新 Pages 與測試站」改為「自動更新 Pages（測試站需手動觸發）」。
- `16_OPS_PLAYBOOK.md` §F3 補一條:**使用測試站驗證 Netlify 特有 headers／redirects 或其他平台行為前，必須先確認已手動部署至目標 commit，並核對 Netlify 顯示的部署 commit SHA**，否則驗到的可能是舊版本。
- `tasks/backlog.md` #5 的 Netlify 額度段落同步改寫;#5 仍留 backlog（iOS PWA 安裝與離線重開仍無實測證據），`tasks/done.md` 未修改。
- 純文件批。未修改 App runtime、`sw.js`、`manifest.webmanifest`、GitHub Actions workflow、GitHub Pages settings、Netlify settings 或 branch 發布規則，無 SW 版本變更。
## 2026-07-26｜Ops:LAN 與 GitHub Pages 驗收流程納入 Playbook（dev，純文件）
- **本批只改文件**,未動 App runtime、`sw.js`、`manifest.webmanifest`、GitHub Actions workflow、GitHub Pages repository settings、Netlify settings 或 branch 發布規則。無 SW 版本變更。
- **GitHub Pages 已啟用**,不再是 backlog 裡「待評估遷移」的狀態。以 repo 與實際端點核對(非推論):URL `https://nick80912-dev.github.io/ai-native-projects/`、發布來源 Deploy from a branch、branch `dev`、子路徑 `/ai-native-projects/`。repo 內 `dev` 與 `main` 的 `.github/workflows/` 都只有 `qa.yml`,**沒有** Pages workflow,故為 GitHub 內建 `pages-build-deployment` 建置。發布來源以行為確認:推送後 Pages 服務中的 `sw.js` 由 `okayama-trip-v61` 變為 `v62`,與 `origin/dev` 一致(`origin/main` 當時為 v18)。
- **`16_OPS_PLAYBOOK.md` 新增 §F 非 Netlify 驗收流程**:F1 電腦本機、F2 手機 LAN 真機、F3 GitHub Pages HTTPS、F4 標準驗收層級(自動測試 → localhost → LAN → Pages → 必要時才 Netlify)。
- **F2 的限制寫明**:LAN `http://` 加 IP 不是 secure context,SW 不會註冊,因此不得作為 PWA 安裝、SW scope 與完整離線功能的最終驗收依據;診斷面板「App 版本」會顯示「無法讀取」。另註明該網址是獨立 origin,`localStorage` 與正式站分開。
- **F3 區分已驗與待驗**:已完成子路徑 Shell 載入、manifest `start_url`／`scope`、SW scope、直接開啟與重新整理、離線啟動、origin 隔離;**iOS PWA 安裝、iOS 真機離線重開、`github.io` 上的 SW 更新節奏標示為待真機驗收**,未寫成通過。
- **記錄 Pages 與 Netlify 的實際行為差異**:Pages 不讀 `netlify.toml`,一律 `Cache-Control: max-age=600`,Netlify 對 `sw.js` 的 `no-cache, no-store, must-revalidate` 不生效。但 `register('sw.js')` 未指定 `updateViaCache`,預設 `'imports'` 會讓最上層 SW script 繞過 HTTP 快取,故版本更新仍偵測得到,延遲的是 `index.html`。驗收時勿把 CDN 延遲誤判為 SW 未更新。
- **修正 §E Release Flow 的通道描述**:改為三通道對照表(Netlify 正式站／GitHub Pages／Netlify 測試站)。**未宣稱 Netlify 測試站已停用** —— 實測 `dev-trippilot-jp.netlify.app` 的 `sw.js` 為 v62,證實它仍追蹤 `dev` 且每次推送自動部署。文件將其定位改為「只驗證 Netlify 特有行為(header／redirects)」,並註明要真正停止自動部署須改 Netlify site settings,需 Bar 另行裁定。明確保留「Pages 驗收通過不等於正式 Release」。
- **backlog #5 未移至 `done.md`**:依實測,iOS PWA 安裝與 iOS 離線重開尚無證據,不符移入 done 的條件。改寫為「GitHub Pages 已啟用,待完成最終真機驗收」,並分列已完成與待完成項目。編號維持 #5,未重新編號其餘項目。`tasks/done.md` 本批未修改。
- **附帶更正一則先前的錯誤陳述**:本 session 稍早曾以 `12_DEV_WORKFLOW.md` 為據,向 Bar 表示「push `dev` 不會觸發 Netlify 部署」。該說法錯誤 —— `16_OPS_PLAYBOOK.md` §E 早已載明測試站追蹤 `dev` 且每次推送自動部署,實測亦確認。這正是 Netlify 額度持續消耗的來源。特此留痕。
- 驗證:`node tools/check-doc-titles.js` 通過;`git diff --check` 無空白錯誤;完整 45／45 Node tests 仍通過(本批未動程式,作為未誤觸的佐證)。
## 2026-07-26｜採買清單後續修正：單筆記帳入口、待買批次刪除與結構化數量（dev，SW v62，待 Bar 真機驗收）
- **補回單筆記帳入口（修 B 批的接線缺口）**：B 批移除「完成後強制詢問記帳」的三選一 Modal 時，連帶移除了 `openShoppingLedgerEntry()` 的**唯一呼叫者**，該函式變成沒有 UI 入口的死碼。裁定只取消「每次完成都強制詢問」，**沒有**取消單筆記帳。入口改掛在已買項目列，直接接回既有函式（含既有 preflight、單筆 prefill、`sourceShoppingItemIds=[item.id]`、金額 focus 與成功後回寫），未另造流程。顯示規則：`unlinked` 顯示「記帳」、`linked` 顯示「重新開放記帳」、`unverified` 兩者都不給（必須阻擋再次記帳），一律走共用 resolver 判斷，不以 `ledgerLinks.length` 判斷。**未恢復完成後 Modal。**
- **待買頁多選加入批次刪除**：接用既有 `deleteSelectedShoppingItems()`／`removeMany()`，不另造平行刪除流程。工具列文案由過長的「建立多品項消費」縮短為「記帳」，並改為兩列版面（第一列計數、第二列三顆等寬動作）——320px 硬擠四欄會犧牲 tap target，實測兩列版在 320px 按鈕高 49px、無水平捲動。刪除確認將 `linked` 與 `unverified` **分別計數**：前者說明「刪除採買項目不會刪除原本的消費紀錄」，後者說明「不會嘗試修改或刪除帳本紀錄」——待確認的項目我們無法證明帳本紀錄存在，不能混進「已建立消費紀錄」一起講。
- **撤回自由文字預填方案，改為結構化數量**：`quantity`（安全正整數，最小 1）＋ `unit`（獨立保存，最多 10 字，12 個常用單位 chips ＋自訂輸入）＋ `legacyQtyText`。新項目數量不再選填，預設 1。
- **表單驗證不只靠 HTML**：`type="number"` 在部分瀏覽器仍會送出 `1e6`／`+3`／`1.0`，直接 `Number()` 會把 `1e6` 悄悄變成一百萬（Browser QA 實際踩到並修正）。儲存前先要求純十進位數字字串 `^\d+$`，再交由 normalizer 驗安全整數。實測 `-1`／`0`／`1.5`／空白／`1e6`／`+3`／`abc` 全數拒絕。
- **舊 `qty` 的安全 migration**：只有「正整數＋可選單一空白＋不含數字與空白的單位」才自動轉換（`5 罐`→5＋罐、`5罐`→5＋罐、`10`→10＋空單位）。`兩盒`、`約 3～5 個`、`3-5 個`、`一大一小`、`家庭號 2 包`、`一組`、`少量`、`0 罐`、`-3 罐`、`1.5 罐` 一律 `quantity:null` ＋原文保留於 `legacyQtyText`。**不猜中文數字、不從字串中間擷取數字、不取區間端點、不默認成 1、不靜默丟棄原文。** 正規化輸出**不再帶 `qty` 鏡像**，避免兩份可能互相矛盾的數量；`qty` 也不再是可寫入的 patch 來源。
- **統一顯示 helper**：新增 `shoppingQuantityLabel()`，清單 metadata、Ledger prefill note、拆分表單、編輯表單全部共用，任何位置不得自行拼接。
- **部分購買改為系統計算**：使用者只輸入「本次買到」，剩餘由 `shoppingSplitPlan()` 計算並即時預覽（`3` → 剩 `2 罐`）。< 1 或 > 原需求一律阻擋；**等於原需求時直接走「全部買到」並 toast `已全部買到`，不建立 0 數量的剩餘項目**。`unit` 由原項目繼承。`quantity:null` 的舊式項目阻擋拆分並直接帶入編輯表單，表單顯示「舊數量：約 3～5 個／此為舊式文字數量。儲存前請改為數字與單位。」——**不在使用者未確認時自行轉換**。原 ID 為已買部分、新 ID 為剩餘、共用 `splitGroupId`、`createdAt` 沿用、剩餘插在原位置、一次原子 write 等既有規則全部不變。
- **個人狀態備份 v5 → v6**：數量從自由文字變成結構化欄位，舊 App 不認識。若不升版，舊 App 會把 v6 當成相容格式，還原時靜默丟掉數量。v1～v6 皆可還原，未知未來版本明確拒絕。`settings-backup-ux.test.js` 另加一條防漂移斷言：sandbox 的版本常數必須等於 `index.html` 內的實際值。
- **未修改**：Ledger 21 欄 Schema、Apps Script、Google Sheet、結算演算法、團體權限、`ledgerLinks[]` contract、`releasedAt`／`splitGroupId`／`completedAt` 語意、A＋F 的行程排序與孤兒判定、採買雲端同步。未把 `quantity`／`unit`／`shoppingItemId` 加入 Ledger 欄位。C／E／G 未夾帶。
- 測試：先寫紅燈（`normalizeShoppingItem` 未回傳 `quantity`）再最小實作。完整 **45／45** Node tests 與 `tools/check-doc-titles.js` 通過。Browser QA 320／375／390px：已買三態的動作組合（`記帳｜編輯｜刪除`／`重新開放記帳｜編輯｜刪除`／`編輯｜刪除`）、待買三顆動作、刪除確認雙計數、數量與單位輸入、舊式數量編輯提示、部分購買即時計算與三種阻擋、買齊不產生 0 剩餘、長品名與長單位；頁面與逐元件橫向溢出皆為 0、最小 tap target 40px、輸入欄字級 16px、console error 0、`overflow-y:auto`／`touch-action:pan-y`／`overscroll-behavior:contain` 未退化。Service Worker cache `okayama-trip-v61` → `okayama-trip-v62`。
## 2026-07-26｜採買清單 B＋D：完成流程、已買管理、部分購買與 Shopping-to-Ledger 關聯（dev，SW v61，待 Bar 真機驗收）
- **B 單筆完成不再被 Modal 打斷**：移除勾選後強制出現的三選一（返回／直接完成／同時記帳）。新流程為「勾選 → 直接標記已買 → 寫入 `completedAt` → toast 提供『復原』」。連續買五樣不再被打斷五次。復原只還原 `done` 與 `completedAt`，**不動 `ledgerLinks`** —— 已記帳項目退回待買後仍顯示已記帳，否則會重複入帳。
- **`ledgerLinks[]` 而非單一 `ledgerLink`**：每次成功記帳 append 一筆，只有最後一筆代表目前關聯。單一物件會在「解除 → 再記一次」時被覆蓋，原本解除過哪一筆的稽核線索就消失了。不另建平行的 `ledgerLinkHistory`、不刪舊 link、**不持久化任何 `status` 字串**。
- **`releasedAt` 是事實不是 UI 狀態**：「使用者決定解除此採買項目的記帳關聯」無法從 Ledger 推導，因此必須落地。只更新最後一個尚未解除的 link，不刪 link、不清 `recordId`／`batchId`／`linkedAt`、不動原 Ledger 紀錄。確認文案明確寫出「這只會解除採買項目的記帳標記，不會刪除原本的消費紀錄。再次記帳可能產生重複消費，確定繼續？」。沒有 active link 時不提供入口，已解除者不重複寫入。
- **三態動態推導 `resolveShoppingLedgerLinkState()`**：`linked`／`unverified`／`unlinked` 全部由目前 Ledger、durable queue、delivery bridge、replacement 與 tombstone 推導。團體紀錄安全寫入 durable queue 即算 `linked`，不必等 Sheet 回讀。**「找不到 record」一律只能降級為 `unverified`** —— 離線、資料未載入、bridge 未收斂、TEST／正式不符、目前成員可見性差異都不構成刪除證據；`unverified` 阻擋再次記帳、不清 link、不自動寫 `releasedAt`。只有「原紀錄仍在事件流中、已被有效墓碑刪除且無有效 replacement」才是 `unlinked`。有效性沿用既有 `effectiveLedgerRecords`／tombstone／replacement 語意，未在採買模組另造簡化版；團體批次編輯只把 `replacesRecordId` 指向該批根紀錄，因此批內其他 record 另以 `batchId` 追 replacement。
- **推導必須讀 `mergedLedgerRecords()`**：自 SW v58 起 `ledgerTrackRecords()` 套了「與我相關」過濾，拿它推導會把可見性差異誤判成紀錄消失。
- **交握時點與 mapping**：來源 `sourceShoppingItemIds` 只存在於 draft（ephemeral），**不進 Ledger 21 欄、不送 Apps Script、不入 Sheet**。回寫只發生在個人帳已持久化、或團體帳 `enqueueBatch` 已原子寫入 durable queue 之後；開表單、預填、切軌、驗證失敗一律不寫。多品項對應依 `validateLedgerEntryDraft()` 產出的 `submissionItems` 順序（已濾掉空白列），**不依賴可能被刪除、新增或重排的 UI index**；每個項目只保存自己那一筆 `recordId`，多品項共用同一 `batchId`。數量對不上即為交握錯誤：保留 Ledger 已儲存的事實，但**一筆 link 都不寫**，顯示降級提示並記錄診斷。
- **回寫失敗的降級**：新增 `shoppingListStore.applyLedgerLinks()` 單次原子 write（全部成功或全部不動）。失敗時不回滾 Ledger、不顯示完全成功、不自動再建立一次消費，提示「消費已建立，但採買項目的記帳標記更新失敗。請避免再次記帳，並重新開啟採買清單確認。」
- **D 已買頁**：新增多選、移回待買、批次刪除、建立消費與三態徽章。多選建立消費採整批 preflight —— 含 `linked` 顯示「選取項目中有 N 項已記帳，請取消選取後再建立消費」，含 `unverified` 顯示「其中 N 項的記帳狀態尚待確認，請先完成同步或重新確認」，**一律整批阻擋，不自動略過、不縮小使用者的選取範圍**。移回待買保留 `ledgerLinks`／`splitGroupId`／`createdAt`／`stopRef`；刪除採原子整批，含已記帳項目時確認文案說明原消費紀錄仍會保留。**未新增「清空所有已買」** —— 全選＋刪除已能達成，不多開一個危險入口。
- **部分購買採拆分**：原 item ID 成為已買部分，剩餘部分取新 ID 並**插在 store array 的正後方**（用 `add()` append 會讓剩餘項目跳到該站點群組尾端）。`splitGroupId = 既有 || 來源 id`，重複拆分沿用同一個；兩筆都沿用原 `createdAt`。新增 `shoppingListStore.split()`：一次 normalize、一次 write，任一驗證失敗完全不寫入。已記帳或 `unverified` 的項目不得拆分，已完成者須先退回待買。
- **數量維持自由文字（Bar 裁定）**：不做 `quantity`／`unit`，不保存 `originalQty`，不新增 `splitFromId`／`splitAt`、不建拆分樹。因此系統**不驗證**「本次買到＋剩餘待買」等於原需求，兩欄都由使用者輸入，原 `qty` 只在表單中作參考顯示。接受此限制的理由：現有輸入包含「兩盒」「約 3～5 個」「一組」等本質不可解析的值，且 App 是旅行採買追蹤而非庫存系統。
- **`completedAt`**：首次完成寫入、移回待買清空、再次完成重寫、拆分的已買部分於當下寫入。`done` 為 false 時 normalizer 強制清空以免狀態矛盾；`done` 為 true 但缺值屬 legacy 降級，保留空字串不編造時間。本批**未改已買頁排序**（仍為 store order），是否改時間排序另行控制。
- **個人狀態備份升至 v5**：新欄位若仍以 v4 匯出，舊版 App 會當成相容格式，還原時靜默丟掉 `ledgerLinks`／`releasedAt`／`splitGroupId`／`completedAt`，已記帳項目會重新顯示成未記帳而重複入帳。v1～v5 皆可還原並補預設值，未知未來版本明確拒絕（`isSupportedPersonalStateVersion()` 同時檢查型別，字串 `'5'` 不通過）。`trip_shopping_list` key 不變，不做整批預先 migration。
- **未修改**：Ledger 21 欄 Schema、Apps Script、Google Sheet、結算演算法、團體權限、10 秒收款復原、個人帳 5 秒復原、durable queue／delivery bridge 邏輯、採買雲端同步，以及 A＋F 的行程排序與孤兒三態契約。C／E／G（切軌資訊保留、必買置頂、列動作與表單體驗）未實作。
- 測試：先寫紅燈（首輪 `normalizeShoppingItem` 未回傳 `completedAt`）再最小實作。新增 `tests/shopping-ledger-links.test.js`（139 個斷言）。`shopping-list.test.js` 更新完成流程契約；`settings-backup-ux.test.js` 補上版本常數並改判 v5；`ledger-quick-entry.test.js` 的儲存流程 sandbox 改接**真實**回寫實作（非放行樁），驗證無採買來源時完全不觸發。完整 **45／45** Node tests 與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v60` → `okayama-trip-v61`。
- Browser QA（本機 static server，375／390px）：三態徽章、已買多選三顆動作、preflight 兩種阻擋文案、移回待買保留 link、解除連結後回到 `unlinked`、部分購買驗證與拆分結果、多品項真實 `saveLedgerEntry()` 後兩筆各自取得**不同 `recordId` 但同一 `batchId`**、已解除的舊 link 完整保留在歷史中、再次選入被阻擋。頁面與逐元件橫向溢出皆為 0（含 36 字品名＋長數量＋長代購對象的極端列），console error 0，`overflow-y:auto`／`touch-action:pan-y`／`overscroll-behavior:contain` 與三處 `env(safe-area-inset-*)` 未退化。
## 2026-07-26｜採買清單依行程排序＋孤兒 stopRef 三態（dev，SW v60，待 Bar 真機驗收）
- **A 排序（顯示正確性 bug，非 UX 偏好）**：`buildShoppingTodayReminder()` 與 `renderShoppingGroups()` 的站點群組順序原本跟著**採買項目的建立順序**跑。實測（本機 static server，受控三站測資）修正前為 `第三站 → 第一站 → 第二站`，實際行程是 `第一站 → 第二站 → 第三站`；跨日同樣可能出現 DAY 5 排在 DAY 1 之前。
- **單一排序來源**：新增純函式 `buildShoppingStopOrder(days)`／`shoppingStopRank(order,stopRef)`／`sortShoppingStopGroups(groups,order)`，契約為 `dayIndex ASC → 該日 day.items index ASC`。**待買頁與 Today 提醒共用同一份排名**——兩邊各排一次就會出現兩種順序。`sortShoppingStopGroups` 以 index tiebreak 實作穩定排序，不依賴引擎的 sort 穩定性；`Infinity` 名次以 `!==` 比較迴避 `Infinity-Infinity=NaN`。
- **不動的部分**：同一站點內的採買項目維持既有 store order（不改字母或分類排序）、不改 `createdAt`、不重寫 localStorage 陣列順序（已驗證排序前後 `store.all()` 順序一致）。**已買頁完全不動**：維持既有平鋪與 store order，程式註解寫明不在本批排序範圍，且因 Shopping Item 尚無 `completedAt`／`purchasedAt`，store order **不得對外宣稱為購買時間順序**。
- **F 孤兒判定三態**：原本 `shoppingStopById()` 回 null 就一律歸到模糊的「已綁定行程」，把三種完全不同的狀況混成一桶。新增 `tripDatasetAuthority(snapshot,days)` 與 `resolveShoppingStopState(stopRef,stop,authority)`：`resolved`（`DAY N · 站名`）／`pending`（`行程站點待確認`）／`orphan`（`原行程站點已不存在`）。
- **權威性沿用既有訊號，未另造平行狀態**：判定用資料層既有的 `CURRENT_SNAPSHOT.source`（與 `syncStatusModel()` 同一組值）。`online` 才算本次旅程權威資料——快照會把 `source` 一起持久化，因此「之前同步過、現在離線」仍算權威，不會誤判。`builtin` 與 `legacy-migrated` 一律降級 `unverified`。**不採用 `DB.trip.days.length > 0`**：已核對最新 `dev` 的 BUILTIN，日期確為本次旅程的 10/18–10/23、共六天且結構完整，但 Day 3 之後仍是江之島／鎌倉／新宿的舊東京行程（`tasks/backlog.md` #11 在最新 `dev` 仍成立），站點 ID 與真實 Sheet 不同——若據以判孤兒，會把整批 Day 3–6 的正確綁定一次標成失效。
- **編輯表單狀態一致性**：原綁定解析不到時，`<select>` 沒有對應 option，瀏覽器顯示第一個「不綁定」而 form state 仍留著舊 ID；使用者不碰下拉直接儲存就會把不知情的舊 ID 一起帶走。改為補一個 **以原值為 `value` 的選中 option**（`原行程站點已不存在（請重新選擇）`／`行程站點待確認（暫時保留）`），加上說明與 `clearShoppingStopBinding()` 明確清除按鈕。實測：不動下拉儲存後 `stopRef` 仍為 `ghost-999`；按下清除後才變空字串。**系統任何路徑都不自動清空 `stopRef`。**
- **未修改**：勾選 Modal、Toast 記帳、已買頁多選／清空、Shopping-to-Ledger 關聯欄位、`ledgerLink`、部分購買、數量 schema、團體帳預填、必買置頂、`⋯` 選單、表單改 overlay、雲端同步、搜尋、Apps Script、Sheet／Ledger／Shopping localStorage schema。B／C／D／E／G 僅輸出設計提案，未實作。
- **BUILTIN 種子資料過時**：經最新 `dev` 核對後確認 `backlog` #11 仍成立。此項影響離線可信度，本批已改為不信任 `builtin` 來源以規避誤判，但**根因未解**；建議升級為出發前必要修正而非一般 P2 打磨，重寫 BUILTIN 本身未經核准，本批未動。
- 測試：先寫紅燈（首輪 `mod.buildShoppingStopOrder is not a function`）再最小實作。`tests/shopping-list.test.js` 的斷言由 31 項擴充至 69 項，涵蓋 A 的七項與 F 的八項要求。完整 **44／44** Node tests 與 `tools/check-doc-titles.js` 通過。Browser QA 375／390px：頁面與元件橫向溢出皆為 0、console error 0，三種資料來源（online／builtin／冷啟動無快照）與編輯表單四種操作實測正確。Service Worker cache `okayama-trip-v59` → `okayama-trip-v60`。
## 2026-07-26｜團體消費權限與資料完整性（dev，SW v59，待 Bar 真機驗收）
- **根因**：既有「與我相關」只限制團體消費的可見範圍；原 `canDeleteLedgerRecord()` 只排除墓碑與身分註冊，分攤者仍可操作付款人的紀錄。編輯 replacement 也曾由表單建出的 record 帶入目前身分，未把「原付款人不可變」鎖成資料層不變條件。
- **付款人擁有權**：新增 `canEditLedgerRecord(record,currentMember)`／`canDeleteLedgerRecord(record,currentMember)` 與 handler 層 assert；UI 隱藏不合資格操作，直接呼叫 handler 仍會拒絕。姓名比對沿用 `canonicalMemberName()`；個人帳維持原操作。
- **fail-closed**：團體紀錄缺少或無法辨識 `record.member` 時仍沿用既有可見性結果，但任何人都不可編輯或刪除，並顯示「無法確認此筆紀錄的付款人,請由管理或資料修復流程處理。」。
- **編輯不變條件**：完整追查原始 record → 表單 hydration／draft → save handler → `buildSharedLedgerEditBatch()` → 墓碑與 replacement；資料層明確以原始紀錄的原字串覆寫每筆 replacement `member`，忽略 draft／form／currentMember 可能夾帶的不同值。墓碑操作者仍為當前付款人。
- **刪除完整性**：批次選取可包含可見的他人付款紀錄，但開啟確認與真正寫入前都以同一 helper 完整重查；混有 N 筆非本人紀錄時整批拒絕，不產生部分墓碑。單筆刪除多品項同批收據時顯示「此筆屬於 N 筆的同批收據,其餘 N-1 筆將保留。」。
- **身分提醒與邊界**：既有身分確認畫面追加「切換後將無法編輯舊身分建立的消費紀錄(可切回原身分處理)。」；未新增身分或後端授權機制。此功能只防前端誤操作，localStorage 身分與 Apps Script POST 不是安全信任邊界。
- **未修改**：Schema、Validator、Apps Script／Sheet 契約、結算演算法與交握狀態機、10 秒復原、既有「與我相關」可見性、正式／TEST universe、同步流程與個人軌資料邏輯均未變更。Service Worker 僅由 `okayama-trip-v58` 順延至 `okayama-trip-v59`。
- **驗證**：先以紅燈鎖定擁有權、fail-closed、編輯付款人不變、批次整批拒絕與同批單筆提示；完整 **44／44** Node tests（結算可靠性 **123／123**）及文件標題檢查通過。375／390px Browser QA 覆蓋分帳首頁、完整紀錄頁與個人新增→編輯→刪除流程，console error 0、無水平溢出；團體付款人／分攤者操作邊界以隔離測試驗證，未向真實團體帳送出測試資料。

## 2026-07-25｜團體帳本只顯示與目前成員相關的紀錄（dev，SW v58，待 Bar 真機驗收）
- **問題**：團體帳顯示旅程內所有人的消費，Mark 仍看得到只屬於 Jane 與 Baron 的紀錄。本批改為預設只供料「與目前成員相關」的團體紀錄。
- **相關性定義**：`目前成員是付款人（record.member）` **或** `目前成員在 participants 內`，任一成立即顯示。**付款人不必在 participants 內** —— 全額代墊給別人的紀錄仍是自己建立的，必須看得到、改得動、刪得掉。只用 `participants.includes(me)` 會讓代墊紀錄從建立者眼前消失。
- **採方案 A（全面一致過濾）**：`ledgerTrackRecords()` 仍是團體帳唯一的共用節流點，過濾就實作在那裡。最近消費、完整紀錄頁、主卡片筆數與總額、查詢、批次選取、編輯與刪除入口全部吃同一批結果，不會出現「清單 5 筆、摘要 8 筆」或「清單過濾了但總額仍是全團」。**不採方案 C**：不新增篩選 chip、不新增「與我相關／全部」切換、不新增設定。
- **識別值**：本專案 Ledger schema **沒有獨立 member id**，`canonicalMemberName()` 正規化後的姓名 key 就是既有的穩定成員識別（`registeredMemberEntries` 的 `entry.key`、`findRegisteredMember`、`buildMemberBalances`、結算全序比對用的都是它）。新函式沿用同一個正規化入口，不另立比對規則、不改 schema、不做資料 migration。因此「Mark」與全形空白／前後空白版本判為同一人，「Markus」不會被誤判。
- **Legacy 限定式 fail-open**：`participants` 缺欄／`null`／非 JSON／非陣列／空陣列時 `parseParticipants()` 回 `null`，此時一律**保留顯示** —— 舊資料不得因本功能靜默消失。fail-open 只在「無法可靠判斷」時成立；解析得出來就照規則排除，不會擴散成無條件放行。
- **成員無法解析時 fail-safe**：`trip_member` 讀不到或只有空白時**完全不套用過濾**並保留全部紀錄，避免整本團體帳突然歸零。這是安全退化，不是略過身分流程。
- **診斷不洗版**：新增 `ledgerVisibilityWarn()`，沿用資料層 `_refWarned` 的 warn-once 慣例經 `AppLog.data` 輸出，同一則訊息一個 session 只記一次（實測連跑 20 次 `renderSplit()` 零新增訊息）。過濾本身每次重繪都會重跑。
- **UI 文案**：主卡片 `團體總支出 · N 筆紀錄` → `與我相關 · N 筆紀錄`。全面過濾後那個數字與其下的金額都只代表個人範圍，續用「總支出」會誤導。個人帳的 `累計支出 · N 筆紀錄` 不變。
- **操作入口補上同一道判斷**：清單過濾只是供料範圍，不是授權控制。`editLedgerRecord()`、`openSharedLedgerDeleteBatch()` 與 `submitSharedLedgerDeletion()` 讀的都是未過濾的 `mergedLedgerRecords()`，因此三處各自以**同一個** `isLedgerRecordRelatedToMember()` 重查，供料與守門不會漂移。這是最小補洞，**不是**新建權限系統；後端（Apps Script `doPost`）仍無操作者驗證，列為既有風險。
- **未修改**：`buildMemberBalances`／`buildTransferSuggestions`／`deriveSettlements` 與任何金額或結算演算法 —— 結算仍讀全團 `mergedLedgerRecords()`，餘額不受可見範圍影響（實測：可見 4 筆時結算仍以全部 5 筆推導）。個人帳（本機單人資料）不套用團體成員過濾。`schema.js`、`validator.js`、Apps Script 契約、TEST／正式宇宙隔離、ADR 均未動。
- **本機 static server 實測（375px，橫向溢出 0）**：同一份三人測資下 Mark 4 筆 ¥6,050、Jane 5 筆 ¥10,050、Baron 4 筆 ¥9,050、身分未解析 5 筆 ¥10,050；主卡片筆數＝最近消費卡片數＝完整紀錄頁「找到 N 筆」＝金額加總，四者一致。`n4`（只屬於 Jane／Baron）不出現在任何清單，且 `editLedgerRecord('n4')` 回「這筆紀錄與你無關,無法編輯」、`openSharedLedgerDelete('n4')` 不開啟刪除對話框；自己的代墊紀錄 `n2` 仍可正常開啟編輯表單。
- 回歸測試新增 `tests/ledger-member-visibility.test.js`（四象限、legacy 七種壞格式、fail-open 不擴散、三種無法解析的身分、姓名格式變動、筆數／總額、最近消費與完整紀錄頁同源、八個消費端共用節流點、編輯／刪除重查、不得新增切換 UI）。`ledger-dashboard.test.js` 更新主卡片文案與節流點斷言；`ledger-225.test.js` 的刪除 sandbox 補上真實 `isLedgerRecordRelatedToMember`（接真實實作而非放行樁）。完整 **44／44** Node tests 與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v57` → `okayama-trip-v58`。

## 2026-07-25｜付款者那一列也收成一行＋摘要金額降級（dev，SW v57）
- **§3 核准文案修訂（Bar 裁定）**：`已送出・等待對方確認` → `等待對方確認`。「已送出」是冗字 —— 這一列有「撤回」可按，本身就代表已經送出過。此為**狀態機 label 本身的修訂**，不是顯示層去重，特此記錄。
- **按鈕文案（Bar 要求縮短，實作採不同用詞）**：`重新標記已付款`（7 字）→ `我已付款`（4 字）。Bar 原提「重新付款」，改用「我已付款」的理由：①`ledgerRemarkSettlementPaid()` 最終呼叫的就是 `ledgerMarkSettlementPaid()`，與轉帳建議列「我已付款」建立的是**同一種 `settlement_claim`**，同一動作應同一用詞；②「重新付款」是祈使句，讀起來像 App 會代為轉帳，但按下去是立刻寫入「我付過了」的宣告 —— 錢是使用者在 App 外自己付的。列上已有 `對方已退回` chip 與退回原因提供「這是第二次」的脈絡，語意不因縮短而流失。
- **版面**：動作一律併入主列右側；**只有「退回原因」需要自己的一列**（長度不可控的自由文字，擠進主列會壓垮右側）。付款者列因此由兩行 82px 降為一行 52px。
- **未採納「把等待同步移到姓名後方」**：實測顯示這不會省下任何寬度（內容總量相同），反而更差 —— 移進左欄會與姓名搶同一個可壓縮空間，窄螢幕更早換行。320px 實測：留在右欄剩餘 34px、移到左欄剩餘 30px。真正讓付款者列收成一行的是 chip 從 10 字縮到 6 字。
- **摘要金額**：`.ledger-settlement-amount` 由繼承的 15px 降為 13.5px（與 `.btn` 同級），底下的新帳款小字維持 11px 仍小於金額；簡易結算模式的摘要套用同一 class，兩種模式不再不一致。
- 320／375／430px 以本機 static server 實測九種列型（真實 CSS／DOM／`scrollWidth`）：**橫向溢出一律 0**。320px 下除兩種帶退回原因的列（80／64px，設計如此）外全部為一行 50–52px；唯一左欄換行的是「4 字姓名＋`¥123,456`＋`等待對方確認`＋`等待同步`＋`撤回`」，高度 55px 且無橫向溢出。
- 回歸測試新增／更新：新狀態文案、按鈕不得使用祈使句式付款動詞、`foot` 只為退回原因存在、摘要金額字級與簡易模式一致性；`settlementDisplayChip` 的「`・`後不是按鈕動作時不得誤切」改用仍在線上的 `同步失敗・重新同步` 當測資。完整 43／43 Node tests（reliability 123／123）與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v56` → `okayama-trip-v57`。

## 2026-07-25｜收款者那一列收成一行：移除多餘的「待你確認」chip（dev，SW v56）
- Bar 用過一段時間後回報：`待你確認` chip 有點多餘，卻讓整列被迫變成兩行。**推翻 v52「`待你確認`＋兩顆按鈕非重複，維持不動」的裁定** —— 兩顆主要按鈕擺在那裡，本身就是「這筆等你處理」最強的訊號，chip 是把同一件事說第二遍。
- 新增 `settlementRowChipText(label,actionLabel,impliedByAction)`：在 v52 既有去重規則之上再加一條 —— 該列已擺出「確認已收／退回」時（`view.canRespond`）一律不出 chip。其餘 chip 帶有按鈕沒有的資訊，全部保留：`已送出・等待對方確認`（「撤回」不等於「還在等對方」）、`對方已退回`、`同步失敗`。**狀態機 `settlementEntryStatus()` 的 label 仍維持 §3 核准原文，去重只發生在顯示層。**
- 版面：`ledgerHandshakeStatusLine()` 在「無 chip 且無退回原因」時，把動作併入主列右側（與等待提示同欄），整列收成一行；其餘情況維持既有兩列。仍需兩列時補空 span 的左右定位規則不變。
- **未縮小字級或按鈕**：`.btn.sm` 目前高 35px 已低於 44px 建議值，再縮會傷到「確認已收」這種金錢操作的點擊率。實測顯示不需要。
- 320／375／430px 三種寬度以本機 static server 實測（真實 CSS、真實 DOM、量測 `scrollWidth`）：**橫向溢出一律為 0，左欄皆未換行**。320px 下收款者列由兩行 82px 降為一行 52px；最極端的「4 字姓名＋`¥123,456`＋`等待同步`＋兩顆按鈕」仍為一行，剩餘寬度 4px。再長的姓名會讓左欄換行（高度回到約兩行），不會產生橫向捲動。
- 回歸測試新增：`impliedByAction` 為真／假時的 chip 輸出、其餘四種狀態 chip 必須保留、只有「無 chip 且無退回原因」才併列、併列後不得輸出空的第二列。既有 #49／#50 的切片斷言一併更新（列表建構與 chip 函式已改名／搬家）。完整 43／43 Node tests（reliability 121／121）與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v55` → `okayama-trip-v56`。

## 2026-07-25｜最後一筆處理完自動收起結算面板（dev，SW v55）
- Bar 裁定：確認已收後自動關閉「團體結算」面板，但**只有這筆是最後一筆待處理時才關**，避免多筆待處理時被迫逐筆重開面板。
- 新增純函式 `settlementPanelShouldClose(rowCount,panelOpen)`：面板開著且待處理列數為 0 才回 `true`；`rowCount` 為 `undefined`／`null`／空字串／非有限數一律回 `false`（算不出來時保守不關 —— 誤關會讓使用者以為操作沒生效）。
- 「需要你處理」的列表建構抽成 `settlementActionableRows(model)`，主面板渲染與自動關閉判斷**共用同一份**。兩邊各算一套就會出現「面板還列著東西卻被自動關掉」。`renderSettlementPanelBody()` 不再自行 `rows.push`／`rows.sort`。
- `closeSettlementPanelWhenDone()` 於 `ledgerConfirmSettlementClaim` 的完成回呼中執行，沿用既有 `closeLedgerInfoSheet()`；列數計算拋錯時直接 `return false` 不關。POST 失敗且未安全入列時該筆仍是 pending、列數不為 0，因此不會誤關。
- 回歸測試新增：0／1／5 列與面板開關的四種組合、三種算不出列數的輸入、主面板與關閉判斷同源（主面板不得再自行組列表）、確認完成後才判斷收起。完整 43／43 Node tests（reliability 119／119）與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v54` → `okayama-trip-v55`。

## 2026-07-25｜Toast 圖層修正：復原鈕被結算 sheet 蓋住（dev，SW v54）
- Bar 真機回報：「確認已收 → 送出中」結束後仍停在「團體結算」sheet，底部的 `已確認收款 [復原]` **完全看不到**，等於那 10 秒形同不存在。
- 主因：`.toast` 的 `z-index:90` **低於 App 內每一個 overlay** —— 結算 sheet 135、退回對話框 140、設定／成員 130、診斷面板 110、採買清單 145／160。toast 固定在 `bottom:80px`，正好落在 sheet 面板範圍內且被蓋住，既看不到也點不到。此為既有缺陷，過去 toast 只是純提示所以沒被發現；復原鈕是**可互動**元素，被蓋住即功能失效。
- 修正：`.toast` 提到 `z-index:200`（高於目前最高的 160）。toast 依定義就是最上層的短暫回饋層。`pointer-events` 規則不變 —— 純提示的 toast 仍為 `none`，只有 `.has-action` 吃點擊，不會攔截 overlay 上的操作。
- **未採用「確認後自動關閉結算面板」**：那只能救到 confirm 這一條路徑，`我已付款`／`退回`／`撤回`／`重新標記已付款` 的 toast 一樣被蓋住；且使用者若還有其他待處理款項，會被強制踢出面板再自己點回來。圖層修好後不必關面板也看得到、點得到。
- 回歸測試新增：`.toast` 的 `z-index` 必須是全檔最大值，且不得有第二個圖層與它同高（同高時由 DOM 順序決定勝負，結果不可預測）。完整 43／43 Node tests（reliability 117／117）與 `tools/check-doc-titles.js` 通過。Service Worker cache `okayama-trip-v53` → `okayama-trip-v54`。

## 2026-07-25｜已確認收款改為 10 秒一次性復原（dev，SW v53，待 Bar 真機驗收）
- **產品裁定（Bar）**：移除結清歷史中的永久「撤銷確認」按鈕，不實作 24 小時撤銷機制。「確認已收」完成後只在**操作裝置**提供 10 秒一次性「復原」；逾時該筆確認即為終局結果。日後發現帳務錯誤改走補登或更正流程，本批不實作更正功能。
- **移除既有 24 小時方案**：原方案已 commit 在 `dev`（非未提交草稿）。本批刪除 `SETTLEMENT_REVOKE_WINDOW_MS`（24h）、`settlementConfirmRevokeEligibility`、`settlementRevokeBlockMessage`、`ledgerRevokeSettlementConfirm`（含其二次確認視窗），以及結清歷史列的「撤銷確認」按鈕、`· 可撤銷` chip 與 `不可撤銷 · 已超過 24 小時`／`· 已有後續結算` 小字。全檔 `24 小時` 出現次數為 0。
- **10 秒復原資格**：新增純函式 `settlementConfirmUndoEligibility(entry,allEntries,actor,now)` 回傳 `{allowed,reason,expiresAt}`，`reason` 為 `allowed｜expired｜superseded｜not-receiver｜already-undone｜invalid`。須同時為原收款者、有效 `settlement_confirm`、尚未被 deletion 撤銷、該 settlement key 最新有效 generation，且距 `response.time` ≤ 10 秒（9,999ms 與正好 10,000ms 可復原、10,001ms 不可）。`response.time` 無法解析或明顯位於未來一律 `invalid`。時間比較使用 ISO `record.time`，不依顯示時區字串，也不以 toast 顯示完成時間重新起算。
- **Toast 與 handler**：`appendSettlementRecord` 新增 `doneToast(durable)` 掛鉤，僅在 POST accepted 或已安全寫入 durable queue／bridge 時輸出 `已確認收款 [復原]`；期限取 `settlementUndoToastDurationMs()` 的**剩餘**時間，動畫或同步延遲只會變短不會變長。`ledgerUndoSettlementConfirm()` 不得只依賴 toast 隱藏 —— 一律以當下 ledger 事件重新 `deriveSettlements` 並重跑資格檢查，以獨立 `undo:{responseId}` action lock 保證連點只產生一筆 deletion record。
- **Append-only 語意不變**：復原沿用既有 `createLedgerDeletion`，`targetRecordId` 指向 `settlement_confirm.id`，原 confirm／claim 不刪除、不修改；餘額回復純由 `deriveSettlements` 與 `applyConfirmedSettlements` 推導。confirm 與 undo 各自保留穩定 `record.id`，同 id 在 cloud／queue／bridge 只合併一次，遠端先看到 undo 後看到 confirm 仍收斂到同一結果。
- **歷史介面**：`ledgerHandshakeHistoryLine()` 不再輸出任何 `<button>`，已完成者顯示付款者、收款者、金額與完成時間（`formatLedgerSyncRecordTime`）；已復原者因 confirm 被撤銷而回到待確認，不列為有效已完成結清。reload／換裝置皆不重建復原入口。
- **摘要新帳款小字（Bar 截圖回報）**：`本筆 ¥2,500 已完成,另有新產生帳款 ¥150 待處理` 這條佔滿整行的說明區塊，改為摘要金額同欄的 11px 小字 `黃柏 上筆 ¥2,500 已結清・新帳款 ¥150`（30 字 → 25 字）。`settlementNewChargeNote()` 新增 `me` 參數以取得對象姓名。**刻意不採「上筆〈明細內容〉已結清」寫法** —— 結清是一對成員之間由多筆消費彙總的淨額，沒有單一明細可指名，指名任一品項都會誤導。移除 `.ledger-settlement-note`，新增 `.ledger-settlement-amount`／`.ledger-settlement-hint`。
- **附帶修補**：`appendSettlementRecord` 原本直接 `ledgerRepository.add(record).then(...)`，而 `add` 內的 `writeQueue` 在 localStorage 配額用盡／私密模式下會**同步拋出**，導致既無成功也無錯誤提示且鎖不釋放。已包成 `try/catch → Promise.reject`，與非同步失敗走同一路徑（明確錯誤 + `failed` phase + 釋放鎖 + 維持 confirmed），符合本批「復原無法安全保存時不得顯示成功」的要求。
- **診斷面板新增「App 版本」（Bar 要求）**：真機驗收過去無法確認手機跑的是哪一版（Bar 曾以 v49 的截圖回報 v50 才修好的問題）。新增 `readActiveShellVersion()`：`sw.js` 的 activate 會刪掉所有非當前 `CACHE_NAME` 的快取，因此 Cache Storage 中剩下的 `okayama-trip-*` 就是**這台裝置實際啟用**的版本。版本字串一律讀自真實快取，`index.html` 不得寫死版本號；瀏覽器不支援或讀取失敗顯示「無法讀取」，絕不猜一個版本號。入口：雙擊桃子徽章 → 診斷面板第一列。
- 未修改：Apps Script `doPost` 契約、`schema.js`、`validator.js`、Google Sheet 表頭、`buildMemberBalances`／`buildTransferSuggestions` 核心數學、後端授權模型、ADR。未新增 24 小時撤銷、帳款更正、反向付款、登入驗證或 server timestamp ordering。Service Worker cache `okayama-trip-v52` → `okayama-trip-v53`。
- 測試：先寫紅燈（首輪 16 項失敗）再最小實作。`tests/ledger-settlement-reliability.test.js` 由 98 擴充至 116 檢查，涵蓋規格 25 項要求（10 秒三個邊界、無效／未來時間、非收款者、已復原、後續 generation、連點五次一筆、`targetRecordId` 對應、原紀錄未被改寫、queue／bridge 併存推導、四種輸入順序收斂、宇宙隔離、歷史不得輸出按鈕、reload 不重建入口、寫入失敗維持 confirmed）。完整 43／43 Node tests 與 `tools/check-doc-titles.js` 通過。

## 2026-07-25｜結算列顯示層去重（dev，SW v52）
- Bar 回報「按鈕已顯示狀態時，上方小字不需再顯示類似資訊」（截圖：chip `送出中…` 與按鈕 `送出中…` 並存）。全面盤點狀態機的「chip × 按鈕 × 小字」組合後共 4 處同義重複，本批一次處理。
- **新規則**：chip 只講「現在是什麼狀態」，按鈕只講「你可以做什麼」，小字只在提供額外資訊時出現。**狀態機 `settlementEntryStatus()` 的 label 維持 §3 核准原文不變，去重只發生在顯示層。**
- 新增純函式 `settlementDisplayChip(label,actionLabel)`：chip 與按鈕文案完全相同時不輸出 chip（`送出中…`）；chip 尾端就是按鈕動作時只保留狀態部分（`同步失敗・重新同步` → chip 顯示 `同步失敗`，動作留在按鈕）。「・」後不是按鈕動作時不得誤切（`已送出・等待對方確認` + `撤回` 完整保留）。兩顆按鈕的情況（`待你確認` + `確認已收`／`退回`）不傳 `actionLabel`，chip 完整保留。
- `settlementSyncTag()`：chip 已含「同步中」且提示為「等待同步」時不重複輸出（`已確認・同步中`、`已退回・同步中` 兩列）。**逾 30 秒升級的「同步較久,可手動重試」與「同步異常」一律保留** —— 那是 chip 沒有的經過時間訊號，Bar 明確裁定保留。
- 維持不動的四種組合：`待你確認`＋兩顆按鈕、`已送出・等待對方確認`＋`撤回`、`對方已退回`＋`重新標記已付款`、`已完成`。狀態與動作資訊不同，非重複。
- 僅改顯示層。Service Worker cache `okayama-trip-v51` → `okayama-trip-v52`。
- 回歸測試新增：去重規則五種輸入、不得誤切「・」、兩顆按鈕不去重、抑制條件須兩者同時成立、30000／30001／120000ms 三個等待提示邊界。完整 43／43 Node tests（reliability 98／98）與 `tools/check-doc-titles.js` 通過。

## 2026-07-25｜退回列窄螢幕再收緊（dev，SW v51）
- 移除退回原因的「退回原因:」前綴：右側狀態 chip 已表明本列處於退回態，前綴語意冗餘，卻在 320／375px 吃掉約三分之一可用寬度。改以 `aria-label="退回原因"` 保留讀屏語意，視覺只留原因本文。
- 320／375／390／430px 四種寬度實測：對象/金額與狀態 chip 無重疊、原因與動作按鈕無重疊、各列按鈕右緣一致對齊（寬度 − 12px）。含 20 字長原因的極端列在 320px 為 135px 高並正常換行，未推擠按鈕；無原因無動作的列維持 41px 單列。
- 僅改顯示層。Service Worker cache `okayama-trip-v50` → `okayama-trip-v51`。**未更動 §3 核准的狀態文案。**
- 回歸測試新增：不得再輸出「退回原因:」前綴、必須保留 `aria-label`。完整 43／43 Node tests（reliability 96／96）與 `tools/check-doc-titles.js` 通過。
- 備註：Bar 於 10:40 回報的截圖經比對為 **v49**（摘要已是 `≈ NT$880`，但退回列仍為單列擠壓版），v50 兩列版面當時尚未進到裝置；iOS PWA 需自多工列滑除後重開兩次才會 activate 新 SW。

## 2026-07-25｜計算明細參考幣別殘留與退回列版面 Hotfix（dev，SW v50）
- 修正「計算明細仍卡著台幣」（Bar 真機回報：`我的淨額 JPY 0 · TWD -116`、`TWD 轉帳建議（參考） jane → 黃柏 NT$116`）：計算明細的淨額直接印 `netTwd`，參考轉帳建議也取自 `settlement.twd`／`settlement.jpy` 這條**獨立累計**的餘額，因此結算幣別已結清時仍殘留幻影欠款。結算面板摘要（v49）只修了一處，本批補齊次層頁面。
- 新增純函式 `settlementReferenceAmount(amount,currency,rate)` 與 `settlementReferenceTransfers(suggestions,rate)`：參考幣別**一律由結算幣別換算**（保留正負方向），不再讀另一幣獨立累計的餘額；結算幣別無轉帳建議時參考幣別必為空。`ledgerSettlementLines()` 改為輸出「結算幣別淨額 ≈ 參考幣別」。計算明細說明文字明確標示「結算以 X 為準，Y 為換算參考值，不會單獨掛帳」。
- 退回列版面：`ledgerHandshakeStatusLine()` 改為固定兩列 —— 第一列「對象/金額 ｜ 狀態 chip」，第二列「退回原因 ｜ 動作按鈕」，兩列各自 `space-between` 使欄位對齊。`.ledger-settle-reason` 由 `display:block;width:100%` 改為同列彈性欄，不再撐開左欄把右側 chip 與按鈕擠成錯位（iPhone 窄寬最明顯）。原因與動作皆無時不輸出第二列。**未更動 §3 核准的狀態文案**。
- 375px 版面實測：`scrollWidth === clientWidth`（無橫向溢出）；對象/金額與 chip 無重疊、退回原因與按鈕無重疊，各列按鈕右緣一致對齊；無原因無動作的列維持單列高度。
- 僅改顯示層。未修改 Schema、Validator、Apps Script、Google Sheet、Ledger 紀錄契約、delivery bridge、fast pull、localStorage key，或 `buildMemberBalances`／`buildTransferSuggestions`／`applyConfirmedSettlements` 計算。Service Worker cache `okayama-trip-v49` → `okayama-trip-v50`。
- 回歸測試新增：參考幣別換算（含負值方向、匯率不可用降級、結算幣別為空時參考必為空）、計算明細不得再讀另一幣獨立建議、退回列兩列結構與 CSS 規則。完整 43／43 Node tests（reliability 96／96）與 `tools/check-doc-titles.js` 通過。

## 2026-07-25｜結算摘要參考幣別顯示 0 元 Hotfix（dev，SW v49）
- 修正「結算摘要台幣參考對照顯示 NT$0」（Bar 真機回報：`應收 ¥3,160 · NT$0`）：`ledgerSettlementStatus()` 在單一結算幣別分支會把另一幣填 `0` 佔位，該 `0` 不是餘額，但結算面板摘要直接把雙欄串接顯示，於是非結算幣別恆顯示 0。
- 新增純函式 `settlementSummaryAmountText(status,currency,rate)`：以結算幣別金額為主，另一幣以 `convertLedgerAmounts()` 換算為參考值顯示（`¥3,160 ≈ NT$632`），與消費卡片既有雙幣呈現一致；已結清時不顯示金額，不再出現「¥0 · NT$0」；匯率不可用時只顯示結算幣別金額，不編造參考值。正式面板與簡易結算模式共用同一規則。
- 僅改顯示層。未修改 Schema、Validator、Apps Script、Google Sheet、Ledger 紀錄契約、delivery bridge、fast pull、localStorage key，或 `buildMemberBalances`／`buildTransferSuggestions`／`applyConfirmedSettlements` 計算。Service Worker cache `okayama-trip-v48` → `okayama-trip-v49`。
- 回歸測試新增：JPY／TWD 兩種結算幣別的換算參考值、已結清不顯示金額、匯率不可用時的降級，以及主面板摘要不得再直接串接雙幣佔位數字。完整 43／43 Node tests（reliability 94／94）與 `tools/check-doc-titles.js` 通過。

## 2026-07-25｜結算狀態參考幣別殘值 Hotfix（dev，SW v48）
- 修正「結算完成後仍顯示台幣 680 應付」（Bar 2026-07-25 真機驗收回報：`jane → 黃柏 ¥3,400` 已確認結清後，淨額為 `JPY 0 · TWD -680`，主面板仍顯示「應付 ¥0 · NT$680」）：已確認結清只抵銷 ADR 0007 定義的單一結算幣別，另一幣別為參考值；首頁結算卡與結算面板過去仍用 JPY/TWD 雙欄判斷是否已結清，導致結算幣別已歸零時，參考台幣殘值被誤顯示為未結清。此即 ADR 0007 為否決 Alternative C 而要避免的「這對在 ¥ 已清、卻在 NT$ 欠另一人」破碎狀態。
- `ledgerSettlementStatus()` 新增結算幣別參數；正式 UI 以 `Ledger Default Currency` 對應的結算幣別判斷已結清／應收／應付，參考幣別不再重新打開狀態卡。計算明細仍保留雙幣淨額與參考轉帳建議供檢查，不改資料語意。
- 未修改 Schema、Validator、Apps Script、Google Sheet、Ledger 紀錄契約、delivery bridge、fast pull 或 localStorage key。Service Worker cache 由 `okayama-trip-v47` 順延至 `okayama-trip-v48`，SHELL、install／activate／fetch 策略不變。
- 結清紀錄與計算明細兩張次層 sheet 加上「‹ 返回」，回到團體結算主面板而非整個關閉重進（Bar 同批回報）；返回入口由 sheet `kind` 決定，不接受呼叫端傳入任意 JS，不新增 onclick 注入面。
- 回歸測試新增 JPY 已歸零但 TWD 參考殘留 `-680`、TWD 已歸零但 JPY 參考殘留兩種情境，以及兩張次層 sheet 具返回鈕、主面板與其他 sheet 不得出現返回鈕；完整 `tests/*.test.js`、`tests/ledger-settlement-handshake.test.js`、`tests/ledger-settlement-reliability.test.js` 與 `tools/check-doc-titles.js` 通過。

## 2026-07-25｜結算狀態、近即時同步與介面簡化 Hotfix（fix/settlement-state-and-live-sync，待 Apps Script 部署與 Bar 真機驗收）
- **契約擴充（Bar 事前核准，記入本檔）**：`apps-script/ledger-sync.gs` 新增唯讀 `doGet`：`GET {WEB_APP_URL}?action=ledger&after=N`。`after` 缺省／空字串／非數字／負數正規化為 0、小數向下取整；`after >= total` 回空陣列且**不呼叫 `getValues()`**；`after > total`（Bar 手動刪列造成截斷）回 `reset:true` 與全量 rows；`total === 0 && after > 0` 回 `reset:true` 且 `total/after` 皆為 0。固定以 `getRange(after+2,1,total-after,21)` 精確讀取，不整表掃描。`action` 必須精確等於 `ledger`。工作表不存在或欄數不足 21 回 `ok:false`。錯誤不回傳例外 stack、Sheet 物件或 Spreadsheet ID。**刻意不取 `LockService`**（唯讀，且不得與 `doPost` 搶鎖或額外消耗每日執行配額）。`doPost` 既有契約與驗證邏輯零改動。
- **Durable delivery bridge**：POST accepted 後改為原子式 handoff —— 先持久化寫入 bridge、確認寫入成功，才可將 record 移出 retry queue；bridge 寫入失敗（含拋錯）時 record 留在佇列，不產生資料遺失空窗，伺服器既有 `record.id` 去重仍負責避免重複入帳。bridge 保存完整 record、參與 `mergedLedgerRecords()`、支援 claim／confirm／reject／deletion／withdraw／revoke，**不因等待過久自動刪除**，只有遠端讀回相同 `record.id` 才清除。舊 `trip_ledger_deletion_bridge` 於首次讀取時自動併入新 `trip_ledger_delivery_bridge`，升級不遺失在途刪除。
- **事件全序**：generation close 由單純 `closesAt` 時間字串改為可比較的 terminal event position `{time,id}`，claim/claim、confirm/reject、terminal 與下一筆 claim、withdraw 與下一筆 claim 全部共用 `compareSettlementEvents`（`record.time` ASC → `record.id` ASC）。同毫秒時新 claim `(time,id)` 大於 terminal 才開新 generation，修正「reject 與新 claim 同毫秒導致新付款靜默失效」。跨裝置 confirm／reject 競態選出 canonical response，losing response inert（不影響餘額、不進正式歷史）並產生 diagnostic warning。
- **狀態機與按鈕**：統一文案（待你付款／送出中…／已送出・等待對方確認／待你確認／已確認・同步中／已退回・同步中／對方已退回/已完成／同步失敗・重新同步）。已操作按鈕不再因重新渲染復原；僅當 POST 未成功**且**本機 queue／bridge 皆未持久化才進入 failed。退回後付款者可「重新標記已付款」，以全新 `record.id` 開啟新 generation；本機仍讀到舊 pending 時給明確訊息並自動執行一次 ledger fast pull 後重判。
- **近即時同步**：面板開啟且前景、線上時每 5 秒 ledger fast pull；連續 2 分鐘無新資料退避 15 秒、10 分鐘退避 60 秒（保護 Apps Script 每日執行配額），一有新資料立即回復 5 秒。面板關閉後 bridge 已清空則停止、未清空改 30 秒低頻直到全部讀回。`document.hidden`／offline 一律暫停，回前景／`pageshow`／`online` 立即拉一次並重啟對應節奏。同時最多一個 in-flight，重疊 trigger 共用同一 Promise。claim／confirm／reject／withdraw／revoke POST 完成與面板開啟亦立即觸發。`doGet` 回傳走與 CSV 相同的 `parseLedgerSheetCsv` 正規化管線，非 JSON（配額用盡／部署失效／權限錯誤的 HTML 錯誤頁）一律視為失敗並靜默降級回 CSV，不清除 bridge、不讓按鈕復原；未使用 `no-cors` 或代理。
- **面板簡化**：主面板只保留我的應付／應收摘要與「需要你處理」（對象、金額、status chip、唯一主要操作），排序為待你確認 → 需重新付款 → 待你付款 → 已送出 → 同步異常；已完成不放主面板。每個 settlement key 只顯示最新可操作 generation，較舊 rejected／confirmed 移入次層「查看結清紀錄」，我的淨額／參考幣別／計算方式移入「查看計算明細」；兩個次層仍依 `currentMember` 過濾，第三人資料不進 DOM。
- **撤銷限制**：~~24 小時內可撤銷已確認結清~~ —— **本項已於 2026-07-25「10 秒一次性復原」批次整批取代並自程式移除，見本檔最新章節**。當時實作的 `settlementConfirmRevokeEligibility`（24 小時視窗）與結清歷史的「撤銷確認」按鈕皆已不存在，此條僅留作歷史沿革。
- **其他**：時鐘偏移以 `doGet.serverTime` 與 request 往返中點估算，超過 2 分鐘於面板頂部告知（僅告知，不自動校時、不改寫 `record.time`、不參與 canonical ordering）。身分切換提醒只在「舊身分仍有未完成結算」且「建立全新身分」時出現，不修改任何既有 `record.member`。新增設定頁「簡易結算模式」（`localStorage`，個人裝置設定不同步）：隱藏交握 UI 與 status chip、停止面板高頻 polling，但已確認 settlement 仍照常計入餘額，計算結果與關閉時完全一致。分帳分頁新增待處理徽章，依 `currentMember` 過濾，不需開啟結算面板即可看到。
- `buildMemberBalances`、`buildTransferSuggestions` 核心計算、`schema.js`、`validator.js`、TripConfig 白名單、Google Sheet 表頭與其餘 7 張表的同步節奏與原子快照機制均零改動。
- 測試：`tests/ledger-settlement-reliability.test.js` 由 30 擴充至 92 檢查（bridge 原子交接與持久性、全序與同毫秒競態、跨裝置收斂、狀態機、退回後重新付款、撤銷資格邊界（該組已由 10 秒復原邊界取代）、fast pull 增量／降級、polling 兩層退避與生命週期、徽章、簡易模式、時鐘偏移、身分提醒）；`tests/apps-script-settings.test.js` 補齊 `doGet` 契約（含「`after >= total` 不呼叫 `getValues()`」與精確 range 斷言）。完整 43／43 Node tests 逐一執行及 `tools/check-doc-titles.js` 均 exit 0。Browser 冒煙驗證 0 console error。Service Worker cache 由 `okayama-trip-v46` 順延至 `okayama-trip-v47`，其他策略不變。

## 2026-07-23｜團體結算握手：已付款／待確認／已收款（dev，ADR 0007，待 Bar 真機驗收）
- 依 ADR 0007 將團體結算由純推導升級為「推導＋事實」：新增 `settlement_claim`（付款方標記已付款）、`settlement_confirm`（收款方確認，淨額在此刻歸零）、`settlement_reject`（收款方退回，帶選填原因，淨額維持掛帳）三個 `recordType`，全部沿用既有 21 欄契約、離線佇列、ID 去重與墓碑機制；Apps Script 與 TripConfig 白名單零改動。
- 結算 Sheet 依共享 `Ledger Default Currency` 分為主結算幣別（建議行含「我已付款」按鈕，僅付款方可見）與參考幣別；新增「待處理結清」（⏳ 待確認／❌ 已退回＋原因）與「結清歷史」（✅ 已收款；當時附收款方撤銷入口，**已於 2026-07-25「10 秒一次性復原」批次移除**）區塊。收款方確認前餘額誠實維持應收／應付；退回提供未收到／金額不對／重複一鍵原因；付款方可撤回待確認結清，重試一律開新紀錄。
- `buildMemberBalances` 與 `buildTransferSuggestions` 本體零改動；新增純函式 `deriveSettlements`（含收款人權威驗證、最早回覆優先、宇宙隔離）與 `applyConfirmedSettlements`（不可變套用已確認結清），轉帳建議跑在扣除結清後的殘餘淨額。`spendLedgerRecords` 排除結算紀錄，消費清單與總支出不受污染。已結清配對之後的新消費誠實重新掛帳，舊結清留存歷史。
- Schema `recordType` values 同步補上三個新值（`schema.js`＋內嵌 SCHEMA；`schemaDoc()` 不輸出 values，`09_SCHEMA_MAPPING.md` 無需重生）。測試模式結清紀錄帶 `[TEST]` 前綴且僅影響測試帳本。
- 新增 `tests/ledger-settlement-handshake.test.js`（builders 驗證、三態推導、多裝置競態、墓碑撤回／撤銷、宇宙隔離、餘額整合、誠實重開、消費清單隔離、UI 接線）；完整 42／42 Node tests 逐一執行及 `tools/check-doc-titles.js` 均 exit 0。Service Worker cache 由 `okayama-trip-v45` 順延至 `okayama-trip-v46`，其他策略不變。

## 2026-07-23｜採買清單、Today 站點提醒與 Buy-to-Ledger 閉環（dev，待 Bar 真機驗收）
- 新增純 `localStorage` 採買清單，支援品名、固定五類、數量、共用代購對象、Day 1–6 行程站點綁定、待買／已買、編輯、刪除及取消勾選；地點未知項目列於「隨時可買」，孤兒 `stopRef` 保留且不進入 Today 提醒。
- Today 只在當日有效站點有未完成項目時顯示「今天有 N 項待買」與站名／品名摘要；依 Bar 追加裁定，無提醒或非旅程日改顯示輕量「採買清單 →」入口，避免空清單無法建立第一筆，且不與提醒卡重複。
- 單筆標記已買提供「直接完成／同時記帳」，後者沿用既有快速記帳 Sheet 並預填品名、購物類別、數量／對象備註及代購對象，金額保持空白；多選可直接標記已買或帶入既有多品項表單。取消記帳不回滾已買狀態。
- 採買表單與 Ledger 共用 `trip_ledger_proxy_targets` 並沿用既有去重；個人狀態備份升為 v4 並納入採買清單，v1–v3 還原時安全補空清單。新增根目錄 `CONTEXT.md` 詞彙表。
- 375px／390px Browser QA 已驗證 Today、完整清單及單筆／多品項閉環無水平溢出，Scroll-only panel 為 `touch-action: pan-y`，browser error 0。Service Worker cache 僅由 `okayama-trip-v44` 順延至 `okayama-trip-v45`，SHELL、install／activate／fetch 不變；未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、購物頁或部署設定。
- 採買清單與備份／Ledger／Today／PWA 目標測試通過；完整 41／41 Node tests 逐一執行及 `tools/check-doc-titles.js` 均 exit 0。

## 2026-07-23｜治理決策追認與規則增訂
- 分帳 2.1／2.2 於禁改清單外擴充 Schema（2.6→2.8，Ledger 契約 14→21 欄）並修改 `apps-script/`，屬未授權契約擴充，經 Bar 追認保留；同步增訂 §4 禁改清單硬停規則以防再次發生。
- PR1 六欄擴充、PR1–PR5 分段交付、「票券」正名（修正原「票卷」錯字）、團體帳刪除原因必填（A 案）、2026-07-18 成員名單來源收斂為僅 `[身分註冊]` 紀錄——均經 Bar 追認核准。
- 本批未修改任何程式、Schema、Apps Script、測試或部署設定。

## 2026-07-22｜Ledger 摘要卡尺寸與箭頭補正（dev，待 iPhone Safari／PWA 真機驗收）
- 個人代購卡移除標題 Emoji，「代購」恢復沿用既有 12px 標題字級與粗細；對象人數與箭頭以 10px 間距排列，整卡仍開啟既有代購彙總 Sheet。
- 個人代購與團體結算改用同一個 `ledger-home-summary-card` 三層 Grid 尺寸契約，以及完全相同的 `ledger-card-chevron` span／`〉` 字元／18px／700 字重／line-height／顏色與對齊規則；個別卡不再覆寫 padding、min-height 或 gap。
- 375px／390px Browser QA 量測兩卡均為 106px 高且同寬，標題、主要資訊、底部摘要及箭頭右邊界一致，`scrollWidth == clientWidth`、兩個既有 Sheet 入口正常且 browser error 0；11 個目標測試及完整 40／40 Node tests 通過。Service Worker cache 僅由 `okayama-trip-v43` 順延至 `okayama-trip-v44`，其他策略不變。

## 2026-07-22｜Ledger 首頁摘要卡資訊補強（dev，待 iPhone Safari／PWA 真機驗收）
- 個人「🛍 代購」改為整卡可點的三層摘要：右上顯示既有代購對象數，主區沿用 `buildProxySummary()` 的雙幣總額，底部顯示筆數及最多 2 位對象名稱（超過加「等」）；零筆只顯示「尚無代購紀錄」，既有代購彙總 Sheet 與計算不變。
- 團體「我的結算狀態」移除獨立「查看結算」按鈕，改為整卡開啟既有結算 Sheet；右上僅保留箭頭，應收／應付底部顯示既有待處理人數及最多 2 位對象名稱，「我已結清」、「全員已結清」與無資料狀態使用對應摘要，不在首頁顯示個別金額明細。
- 兩張卡以 scoped `min-height:0`、10px／12px padding、gap 與可換行文字維持自然高度及手機觸控範圍；未修改同步、最近消費、`buildProxySummary()`、餘額／轉帳建議演算法或 Apps Script API。Service Worker cache 僅由 `okayama-trip-v42` 順延至 `okayama-trip-v43`，其他 SW 策略不變。
- 11 個首頁／代購／結算／同步／行動版／PWA 目標測試及完整 40／40 Node tests 通過；375px／390px Browser QA 確認兩卡整卡可開啟既有 Sheet、自然高度且 `scrollWidth == clientWidth`，iPhone Safari／PWA 真機仍待驗收。

## 2026-07-22｜Ledger 首頁資訊去重與結算卡緊湊化（dev，待 iPhone Safari／PWA 真機驗收）
- 個人首頁移除獨立今日卡，改為累計支出、自然高度代購卡、最近消費及日期群組；代購卡仍整卡開啟既有對象彙總，並以既有 `proxyTotal` 顯示目前幣別主金額與另一幣別換算。團體首頁維持團體總支出、我的結算狀態、最近消費及日期群組，不再於最近消費標題重複今日統計。
- 個人／團體共用今日提示規則：今天有消費時日期摘要顯示「今天」且不加提示；今天零筆但有歷史紀錄時只顯示淡色「今日尚無消費」；完全無紀錄時只保留原空狀態。既有日期分組、筆數與 JPY／TWD 日總額不變。
- 「我的結算狀態」改為標題、主要狀態金額、底部進度／「查看結算 〉」三層緊湊排列；首頁不再渲染 `model.details`，完整成員淨額及轉帳建議仍留在既有 Sheet。結算模型、餘額與轉帳建議演算法均未修改。
- 代購卡與結算卡以 scoped `min-height:0`、padding、gap 及 margin 自然撐高，不設定裁切內容的固定高度；375px／390px 由可換行標題、雙幣日期 grid 與不換行底部操作列契約保護。Service Worker cache 僅由 `okayama-trip-v41` 順延至 `okayama-trip-v42`，SHELL、install／activate／fetch 不變。

## 2026-07-22｜Ledger 團體首頁緊湊化與待同步操作改善（dev，待 iPhone Safari／PWA 真機驗收）
- 團體首頁移除獨立「今日」卡，順序調整為團體總支出、我的結算狀態、最近消費（內含既有 `period.today` 筆數／目前 JPY 或 TWD 金額）、最近消費紀錄；今日零筆顯示「今日尚無消費」。個人帳的今日／代購雙卡、最近消費卡、付款者與分攤人數均維持不變。
- 待同步狀態改為可開啟的同步面板，直接以既有 `pendingCount()`、`queuedRecords()` 呈現待同步筆數、最近錯誤、明細、目前顯示幣別金額與建立時間；「重新同步」只呼叫既有 `flushQueue()`，同步中停用按鈕，成功／部分成功／失敗依實際剩餘佇列顯示結果，未直接清除或跳過紀錄。
- 新增單次同步 coordinator，與 repository 原有 `flushInFlight` 雙層防止啟動、回前景、網路恢復及手動點擊同時觸發重複 flush；client-generated ID、逐筆成功後才移出佇列及 Apps Script API 格式均未修改。Service Worker cache 僅由 `okayama-trip-v40` 順延至 `okayama-trip-v41`，SHELL、install／activate／fetch 不變。
- 首頁／同步／結算與既有行動版 SW 目標測試已通過；375px／390px 以 scoped flex-wrap、`min-width:0` 與不換行操作區保護，實際 iPhone Safari／PWA 的前景恢復、離線補送、部分成功及無水平捲動仍待 Bar 真機驗收。

## 2026-07-22｜Ledger 團體「我的結算狀態」全寬卡（dev，待 Bar 手機驗收）
- 團體總支出下方新增唯一的全寬「我的結算狀態」卡，直接沿用 `buildMemberBalances()`、`buildTransferSuggestions()` 與 `ledgerCurrentMemberSettlement()`，呈現目前成員的應收／應付、我已結清或全員已結清；待處理明細最多列 2 筆，資料不足時不推測付款進度。
- 原本與「今日」並排的結算卡移除，團體「今日」改為全寬；個人帳仍維持「今日／代購」雙卡。團體最近消費補上「付款者 · N 人分攤」，目前成員付款且涵蓋全員時顯示「我付款 · 全員分攤」。
- 結算入口仍只有「查看結算」且開啟既有結算功能；未修改新增消費、Schema、Repository／Queue、同步或分帳計算。Service Worker cache 僅由 `okayama-trip-v39` 順延至 `okayama-trip-v40`，其他 SW 邏輯不變。
- 40 個 `tests/*.test.js` 與文件標題檢查通過；375px／390px Browser QA 確認團體結算／今日卡全寬、個人雙卡不變、無水平溢出且 browser error 為 0，仍等待 Bar iPhone Safari／PWA 真機驗收。

## 2026-07-22｜Ledger 團體消費紀錄卡金額跨列置中修正（dev，待 Bar 手機驗收）
- 修正上一版僅加入 `align-self:center`、仍只在第一個 Grid row 內置中的不足：共用單筆 renderer 會在存在 Badge 時加入 `has-badges` 內容狀態，金額欄跨越主內容與 Badge 兩列，Badge 固定留在左下列，使 JPY／TWD 金額相對整張內容區置中。
- 此規則不是團體專用；個人待同步／代購 Badge 同樣沿用，無 Badge 的個人卡與 batch 卡不受影響。375px／390px Browser QA 以實際團體「拉麵／¥6,500／NT$1,300／1 人分攤」卡量測，金額與整個內容區及 `⋯` 的中心差均為 0px，無水平溢出、console error 0。未修改金額、分帳、同步或資料契約；Service Worker cache 僅由 `okayama-trip-v38` 順延至 `okayama-trip-v39`。
## 2026-07-22｜Ledger 團體消費紀錄卡金額置中（dev，待 Bar 手機驗收）
- 個人帳與團體帳的消費紀錄卡沿用同一個 `renderLedgerRecentRecord()`、`formatLedgerDualAmounts()` 與 `.ledger-dual-amounts`；共用金額容器新增 `align-self:center`，修正團體卡因成員／分攤資訊增高時金額向上偏移，不新增團體專用樣式，也不修改金額、分帳或同步邏輯。
- 新增共用對齊回歸測試；Service Worker cache 僅由 `okayama-trip-v37` 順延至 `okayama-trip-v38`，SHELL、install／activate／fetch 不變。375px／390px Browser QA 與完整測試結果記錄於 `tasks/current.md`，仍等待 Bar 手機驗收。

## 2026-07-22 — Ledger 頁面說明列緊湊化（Dev；Bar 驗收前）
- 將「個人帳留在本機；團體帳跨裝置同步。」由卡片區下方移至個人／團體切換列正下方，與既有 `JPY 1 ≈ TWD 匯率` 共用單一 flex meta row；匯率靠左、保存說明靠右且垂直置中，原中段重複說明已移除。
- 匯率字級由 12px 收為 10px，右側說明使用更淡的 10px 次要文字；最近消費 section 的有效上方間距由 12px 收為 8px。未修改匯率數值、帳本切換、同步方式或資料邏輯。
- 375px／390px Browser QA 的個人／團體軌均只有一份保存說明，左右內容至少保留 55px 間距、垂直中心差 0px、最近消費上方間距為 8px，無水平溢出且 browser error 為 0。Service Worker cache 僅由 `okayama-trip-v36` 順延至 `okayama-trip-v37`，SHELL、install／activate／fetch 不變；仍等待 Bar iPhone Safari／PWA 手機驗收。

## 2026-07-22 — Ledger 單品項金額／明細同群組（Dev；Bar 驗收前）
- 單品項新增／編輯頁將金額與明細上下收進同一張 `.ledger-single-primary` 白底圓角群組，兩個 input 共用相同 content padding 並完全對齊左右邊界；欄位間距為 10px且不新增分隔線。
- 明細沿用既有 46px 高度、16px 字級、placeholder、Enter Done、inline validation 與儲存流程；62px 最小高度只套用金額 input。多品項、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 與資料欄位均未修改。
- 375px／390px Browser QA 的左右邊界誤差均為 0px，明細維持 46px／16px，金額 Next 聚焦明細、明細 Done 單次儲存、無水平溢出且 browser error 為 0。Service Worker cache 僅由 `okayama-trip-v35` 順延至 `okayama-trip-v36`，SHELL、install／activate／fetch 不變；仍等待 Bar iPhone Safari／PWA 手機驗收。

## 2026-07-22 — Ledger 首頁卡片對齊與單品項必填流程修正（Dev；Bar 驗收前）
- 分帳首頁「今日」與個人「代購」／團體「結算」卡片統一使用同一套左對齊 flex、內容寬度、margin 與原生 button reset；卡片 padding、高度節奏及既有整卡點擊行為不變。
- 單品項明細移至金額下方固定顯示，次要摘要仍只涵蓋類別、支付方式與日期，展開後只提供店家、日期時間、完整類別及支付方式控制。
- 金額鍵盤改為 Next：有效金額直接聚焦明細且不重繪、不儲存；無效金額留在原欄並顯示既有 inline error。明細鍵盤改為 Done 並沿用 `saveLedgerEntry(false)`、pending guard、spinner、disabled 與 idempotency 流程；驗證失敗不再為明細展開次要區塊。
- 多品項、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 與既有資料欄位均未修改。Service Worker cache 僅由 `okayama-trip-v34` 順延至 `okayama-trip-v35`，SHELL、install／activate／fetch 不變。
- 40 個 `tests/*.test.js`、文件標題檢查及 375px／390px Browser QA 通過；卡片等寬等高且內容左對齊，FAB 開啟即聚焦金額，鍵盤 Next／Done 與無效金額原地錯誤符合規格，無水平溢出且 browser error 為 0。仍等待 Bar iPhone Safari／PWA 手機驗收。

## 2026-07-22 — Ledger P0 三秒記帳輸入流程（Dev；Bar 驗收前）
- 新增消費頂部將帳本與幣別整理為兩組精簡控制；390px 同列、375px 仍安全排列，視覺面約 32px、觸控區至少 40px，且未更動金額 input 的 `type`、`inputmode`、解析或換算。
- 單品項以金額作為第一焦點與主要輸入，金額完成鍵沿用既有儲存流程；必要欄位不足時展開「類別・支付方式・日期」摘要下的次要欄位並聚焦明細。編輯既有紀錄時預設展開，切換帳本、幣別、類別或支付方式不會遺失 disclosure state。
- 多品項先輸入店家，再依「品項名稱 → 金額 → 下一品項名稱」移動焦點；最後一筆金額只收鍵盤、不自動儲存。日期、支付方式與預設類別收在摘要內，操作區顯示有效筆數與既有雙幣整單實付，新增品項後立即聚焦新品項名稱。
- 儲存新增同步 pending guard：重複點擊或完成鍵不會重建 ID 或送出第二次，兩個儲存按鈕共用既有 spinner 與停用狀態；取消、成功及失敗皆清除 guard。個人復原、團體重複確認、同步 Toast 與 Queue／墓碑契約維持既有行為。
- 40 個 `tests/*.test.js`、文件標題檢查與 diff check 通過；375px／390px Browser QA 確認無水平溢出、表單控制字級至少 16px、焦點順序正確且 console error 為 0。Service Worker 維持 `okayama-trip-v34`，未再 bump；Schema、Apps Script、Repository／Queue、結算、墓碑契約及 localStorage key 未修改。

## 2026-07-20 — Ledger 三秒記帳整合批次（Dev；Bar 驗收前）
- 完整紀錄依類別分組時，群組標題顯示目前可見資料的雙幣合計，且多品項帳單仍以單一 batch 顯示；`⋯` 操作 Popover 縮為 104px，同一按鈕再次點擊仍會收合。
- 團體多品項表單先顯示帳單分攤成員，品項預設繼承該選擇；只有啟用「單項分攤」才展開自訂成員。預設類別選擇器初始／選取後皆收合，套用全部控制項維持可用。
- FAB 以同一手勢開啟個人快速記帳並聚焦金額欄。個人儲存後提供 5 秒「復原」；團體帳顯示獨立同步 Toast，偵測到可能重複時須確認才儲存，取消不入列且核准流程只寫入一次。重複偵測亦涵蓋草稿軌道與測試資料範圍的 idempotency 回歸。
- Service Worker cache 由 `okayama-trip-v33` 順延至 `okayama-trip-v34`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約或 localStorage key。375px／390px Browser QA 與 iOS 鍵盤／行動裝置驗收仍待 Bar。

## 2026-07-20 — Ledger 2.2.5 日期金額、操作選單與團體分攤精修（Dev）
- 首頁最新日與完整紀錄每日右側的固定 `¥JPY ≈ NT$TWD` 加總縮為 9px；左側日期／筆數及完整紀錄 11px 結果摘要維持不變。
- `⋯` 操作 Popover 改為 118px 外框、4px 內距、36px 操作列與 12px 字級，顯示 `編輯 ✏️`／`刪除 🗑️`；再次點擊同一個 `⋯` 可收合，切換其他卡片則直接開啟對應選單。
- 團體帳的帳單「分攤成員」與多品項「單項分攤成員」共用淡綠群組 renderer；成員按鈕改為 28px 高、7px 圓角長方形與 10px 字級，新建團體草稿維持所有已註冊成員預設全選。
- Service Worker cache 由 `okayama-trip-v32` 順延至 `okayama-trip-v33`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約或 localStorage key。

## 2026-07-20 — Ledger 2.2.5 消費卡置中與日期雙幣加總（Dev）
- 首頁最近消費與完整紀錄的單筆／多品項摘要卡，右側 JPY／TWD 金額及 `⋯` 功能鈕改以 Grid 原生方式垂直置中；選取模式仍不產生 `⋯` DOM，卡片互動不變。
- 首頁最新有效日期摘要新增固定 `¥JPY ≈ NT$TWD` 加總；完整紀錄按日期分組時，每日右側顯示目前搜尋／篩選結果的日加總，按類別分組維持純類別標題。
- 完整紀錄結果摘要改為 11px 次要樣式，格式統一為 `找到 N 筆 · ¥JPY ≈ NT$TWD`；所有金額由 renderer 目前收到的有效實體紀錄即時計算，不新增 state 或資料欄位。
- Service Worker cache 由 `okayama-trip-v31` 順延至 `okayama-trip-v32`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約或 localStorage key。

## 2026-07-20 — Ledger 2.2.5 iOS 時間控制寬度修正（Dev）
- 依 iOS App 實機截圖修正原生 `input[type=time]` 仍吃掉群組右側 padding 的問題；新增專用 `ledger-time-input-wrap`，由 wrapper 管理內容區寬度，time input 改以 `flex:1 1 0`／`width:0` 收斂原生 intrinsic width。
- 單品項與多品項沿用同一個 occurrence renderer；日期欄、時間值、字級、picker、儲存語意及群組 padding 均不變。
- Service Worker cache 由 `okayama-trip-v30` 順延至 `okayama-trip-v31`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 或資料欄位。

## 2026-07-20 — Ledger 2.2.5 時間欄位右側對齊補正（Dev）
- 單品項與多品項共用的日期／時間直列補齊 `minmax(0,1fr)`、`min-width:0`、`max-width:100%` 與 `box-sizing:border-box`；日期／時間 wrapper 及 input 均限制在白底群組既有內容區，不使用負 margin、transform 或全域 overflow 掩蓋。
- 時間欄位維持 `width:100%` 填滿群組內容區，右側與日期欄位完全對齊並保留群組既有 11px 內距；原有字級、月曆 SVG、日期 Popover 與資料行為不變。
- Service Worker cache 由 `okayama-trip-v29` 順延至 `okayama-trip-v30`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 或資料欄位。

## 2026-07-20 — Ledger 2.2.5 表單直列與代購群組精修（Dev）
- 單品項「這筆是代購」改為淡暖紅低飽和群組列，文字維持原字級、Toggle 固定靠右，且不新增重複的「代購」欄位標題。
- 單品項與多品項的日期／時間皆改為日期在上、時間（選填）在下的直列版型；欄位與標籤維持既有字級，並保留現有月曆線條 SVG 與自訂日期 Popover 行為。
- 代購對象按鈕改為垂直置中；新增對象欄與 30px 加號強制移至下一個完整列，單品項與多品項共用相同 renderer、state 及儲存語意。
- Service Worker cache 由 `okayama-trip-v28` 順延至 `okayama-trip-v29`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 或資料欄位。

## 2026-07-20 — Ledger 2.2.5 手機回饋精修（Dev）
- 完整紀錄進入選取模式時，多品項摘要卡預設維持收合；點擊摘要卡才展開／收合逐筆紀錄，摘要 checkbox 仍沿用既有整批全選／取消及半選三態。
- 日期與時間採同列內縮方案：時間欄縮為 110px、欄距縮為 8px，右側保留 6px 安全距離；自訂日期 Popover 的尺寸、定位與資料行為不變。
- 多品項代購採 A 精修版小型選取按鈕；單品項代購採 B「這筆是代購」開關。兩者共用既有代購 state、對象 renderer 與儲存語意；「代購金額會另列」移至「幫誰買」旁並降為 9px，對象按鈕縮為 28px，新增對象欄與加號縮為 30px。
- Service Worker cache 由 `okayama-trip-v27` 順延至 `okayama-trip-v28`；未修改 SHELL、install／activate／fetch、Schema、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key 或既有資料欄位。

## 2026-07-20 — Ledger 2.2.5 最新日、完整紀錄多選與分帳返回（Dev）
- 多品項帳單資訊將「套用類別」改名為「預設類別」，同列加入 10px 次要說明「新品項自動帶入，可逐筆調整」；新品項繼承、手動品項保護與「套用至全部」既有表單 state 行為不變。
- 最近消費由跨日期最近 15 筆改為目前個人／團體及正式／TEST 軌別的最新一個有效日期，顯示該日全部有效實體紀錄；最新日清空後會回退下一個有效日期，既有 batchId 摘要與墓碑排除維持不變。
- 完整紀錄直接共用最近消費的選取 state、卡片 checkbox、batch 三態、浮動工具列及個人真刪／團體墓碑批次刪除流程；全選範圍限定目前搜尋與篩選結果，切換軌別、TEST 狀態或離開頁面會清空選取。
- 篩選面板新增「清除篩選」，一次重設類別、支付方式、代購與免稅條件、Badge、面板及選取狀態，搜尋關鍵字保留。類別與支付方式改為 34px／8px 圓角低彩度矩形並支援換行與安全截斷，兩區沿用既有 `ledger-entry-divider`。
- 底部分帳按鈕在完整紀錄等實際可點擊的分帳子頁可直接重設內部 view state 並回首頁；分帳首頁再次點擊會捲頂。Bottom Sheet／Modal 等導航被覆蓋的狀態維持原狀，未強制顯示導航或丟失未儲存表單。
- Service Worker cache 升至 `okayama-trip-v27`；本批未修改 Schema 2.8、Apps Script、Repository／Queue／Retry／Flush、結算、墓碑資料契約、localStorage key、BUILTIN、治理文件、非分帳頁或部署設定。

## 2026-07-19 — Ledger 2.2.3 表單驗證與多品項預設（Dev）
- 多品項店家與品項改為欄位內驗證：必填店家空白、半填品項或無有效品項時顯示紅框與行內訊息，自動捲動並聚焦第一個錯誤；輸入後立即清除該欄錯誤。完全空白品項列不送出，半填列仍會阻擋儲存。
- 帳單資訊卡新增「套用類別」草稿狀態；新開多品項以系統預設類別起始，新品項沿用目前套用值，手動改過的品項不受一般切換影響。「套用至全部品項」會在有差異時確認並覆寫全部；編輯既有批次採 A 方案，以第一筆類別初始化且先將所有既有品項視為手動調整。
- 新增模式依有效品項動態顯示「確認儲存（N 筆）」；「儲存並再記一筆」保留帳本、幣別、日期、時間、店家、支付方式、套用類別與團體分攤成員，清空品項、稅／優惠、代購、備註與金額。編輯模式只保留「儲存修改／取消」。
- 日期／時間維持同列並調整為可伸縮日期＋116px 時間；支付方式改為可換行的 8px 圓角矩形。品項列改為 32px 序號、彈性名稱、112–120px 金額與 36px 刪除鈕；類別、免稅與代購視覺統一為 32px 低彩度矩形，代購內容只在勾選後出現於低彩度容器。
- 單筆模式將金額、明細、日期與時間收進白色基本資料卡，店家維持卡片下方選填；類別與支付方式套用同款矩形且可換行。Service Worker cache 升至 `okayama-trip-v26`；本批未修改 Schema 2.8、Apps Script、Repository／Queue／Retry／Flush、結算、墓碑資料契約、localStorage key、BUILTIN、治理文件或非分帳頁。

## 2026-07-19 — Ledger 2.2.2 多品項模式版面優化（Dev）
- 多品項將日期、選填時間、必填店家名稱與支付方式集中為品項清單上方的白色「帳單資訊」卡；單品店家仍為選填。多品項店家空白時以「請輸入店家名稱」阻擋儲存，既有空店家批次編輯時亦須補填。
- 移除可見的「品項 N」標題，改為 40px 自動重編序號、名稱、88–96px 金額與條件式 40px 刪除鈕同列；只剩一筆時不保留刪除空欄。類別維持 44px 觸控區，內層視覺縮為 34px／上限 120px 並截斷長字。
- 多品項的支付、類別、免稅、代購、代購對象與品項分攤改為 8px 圓角矩形；帳本、幣別、税込／税抜、稅率等封閉集合仍維持 Segmented 軌道膠囊，單品模式未受影響。
- 空白金額不再常駐顯示錯誤；非數字、小數、負數、零值或既有安全整數保護擋下的金額統一顯示「請輸入有效金額」，未放寬計算上限。375px／390px 已驗證 1／3／5／10 品項、長店名、1／5／8 位金額、類別與代購展開均無水平溢出或瀏覽器 error log。
- Service Worker cache 升至 `okayama-trip-v25`。本批未修改 Schema 2.8、Apps Script、Repository／Queue、結算、墓碑資料契約、localStorage key、BUILTIN、治理文件或非分帳頁；iOS 真機 Dynamic Type 100%／115% 與鍵盤流程仍待 Bar 驗收。

## 2026-07-19 — Ledger 2.2.1 Mobile Hotfix（Dev）
- 最近消費、批次卡與批次子項改為依模式交換的二欄 Grid：一般模式為內容／44px 操作鈕，選取模式為 44px Checkbox／內容；選取模式不再產生 `⋯` DOM 或隱藏欄位，內容寬度與卡片高度維持一致。JPY 主金額不變，TWD 次要金額縮為 10px。
- 新增消費日期與時間改為可伸縮日期欄＋112px 時間欄，375px／390px 優先同列、360px 以下維持直排 fallback；日期列移至單筆類別上方，多品項則置於完整品項清單後。身分列與日期列共用同一分隔線 token，月曆入口改為 `currentColor` inline SVG 並保留 44px 觸控區。
- 店家改為單筆／多品項共用的常駐欄位並置於支付方式上方，「更多細節」只保留備註。多品項的類別、免稅品與個人代購重排為同列緊湊控制，團體帳不保留代購空位。
- 預設類別「衣服」更名為「衣物」，新增 👕／💄 專屬 Emoji；既有本機「衣服」選項讀取時正規化為「衣物」並去重，歷史紀錄不改寫。Service Worker cache 升至 `okayama-trip-v24`；本批未修改 Schema 2.8、Apps Script、Repository／Queue、結算、墓碑契約、localStorage key、BUILTIN 或治理文件。

## 2026-07-19 — 分帳 2.2.1 卡片、批次與多選操作（Dev）
- 新增消費表單將目前身分與多品項開關收在同一標題列；日期鍵入會依序補成 `YYYY/MM/DD`，清空只作為編輯中狀態，空白、不完整、非既定格式或不存在日期均阻擋儲存。此規則取代 2.2 的 `-`／`.` 寬鬆輸入，月曆與既有 ISO 消費發生時間語意不變。
- 修正 Bottom Sheet 在 390px／375px 的實際超版根因：表單、Grid、輸入框、代購列及月曆補齊 `min-width:0`／box sizing／最大寬度約束，未使用 `overflow-x:hidden` 掩蓋。
- 最近消費與完整紀錄依既有 `batchId` 將多品項收成批次卡，預設收合並可展開子項；卡片統一顯示店名優先、類別 Emoji、支付方式與 JPY／TWD 雙幣別，個人卡隱藏成員且只在個人帳顯示代購資訊，團體卡保留成員與分攤摘要。
- `⋯` 由全寬 Bottom Sheet 改為錨定式小選單，支援邊界翻轉、單一開啟、外部點擊、Escape、捲動與 resize 關閉；卡片本體仍開明細，操作鈕不會誤觸卡片。
- 最近 15 筆有效紀錄新增記憶體內多選、全選、批次部分／全選狀態與 safe-area 浮動工具列。個人多刪以一次既有 localStorage key 寫入完成；團體多刪沿用既有 deletion 墓碑，每筆一張、共用必填原因並以既有 `enqueueBatch` 一次入列，離線、去重與已刪目標隔離規則不變。
- 多品項列改為緊湊名稱／金額、可收合類別、免稅與個人代購；未新增結構欄位。Service Worker cache 升至 `okayama-trip-v23`；本批未修改 Schema 2.8、Apps Script、Repository／Queue 契約、結算、墓碑資料契約、localStorage key、BUILTIN、治理文件或非分帳頁。

## 2026-07-19 — 分帳 2.2 UI/UX 與結構化稅券資料（Dev）⭐ 架構變更
- Schema 升至 `2.8 (2026-07-19)`；Ledger 固定契約由 16 欄擴為 21 欄，末端新增輸入幣別、免稅品、價格方式、稅率與優惠券金額。Apps Script 21 欄版本已部署於既有 `/exec`；真實測試 ID `1784454068072-9d57` 首送回 `{ok:true}`、重送回 `{ok:true,dup:true}`，公開 CSV 僅一列且 UTF-8 中文與五個新欄值完整落位。
- 消費日期與時間拆欄：日期接受 `YYYY/MM/DD`、`-`、`.` 分隔並提供 390px 自製月曆，時間維持選填；非法日期保留原輸入並阻擋送出，`time` 仍保存 ISO 8601 消費發生時間。
- 完整紀錄改為搜尋＋可收合篩選面板，類別／支付方式使用可多選 Chips，代購／免稅與日期／類別分組使用 Segmented；團體帳不顯示個人代購篩選。封閉集合用軌道、開放集合用獨立膠囊的規則已寫入程式註解。
- 多品項列改為名稱／金額、類別與緊湊免稅／代購控制；個人代購統一使用「未指定／既有對象／行內新增」選擇器，團體帳維持不啟用代購。稅與優惠券、店家與備註改為收合區，單筆優惠券只作記錄，多品項固定折扣維持總額計算。
- 最近消費優先顯示店名，卡片本體開明細，獨立 `⋯` 開啟編輯／刪除；明細隱藏紀錄 ID、批次 ID、同步狀態，日期時間改為本地可讀格式且空欄不占位。團體刪除仍走必填原因墓碑，個人刪除仍為本機確認真刪。
- Service Worker cache 升至 `okayama-trip-v22`。本批未修改 Validator 六類日誌、結算算法、墓碑語意、四分頁、BUILTIN、icons、manifest、Netlify、Scroll-only 或 no-op 雙擊相容監聽器。

## 2026-07-19 — 分帳 2.1 快速記帳、編輯與 TEST 平行帳本（Dev）⭐ 架構變更
- Schema 升至 `2.7 (2026-07-19)`；Ledger 固定契約由 14 欄擴為 16 欄，末端新增 `storeName`／店名與 `replacesRecordId`／取代紀錄 ID，`time` 正式定義為使用者可修改的消費發生時間。Apps Script 維護來源、Schema Mapping、資料文件及真實部署端點同步更新。
- 團體記帳改以 `enqueueBatch(records)` 將整批資料一次寫入本機 Queue，入列成功即關閉表單並背景 POST；離線或送達失敗保留待同步狀態，CSV 跨裝置可見仍有 1–5 分鐘發布延遲。個人帳與代購對象清單維持 localStorage only，備份格式升至 v3 並相容 v1／v2。
- TEST 模式改為平行帳本：開啟時儀表板、今日、結算、代購與明細只計算 `[TEST]` 團體紀錄；關閉時只顯示正式紀錄，兩邊互不混算。頂部警示明確標示目前測試帳本且不影響正式分帳。
- 快速記帳 Bottom Sheet 新增店名、可改消費時間、行內幣別換算、捲動位置保護與背景位置還原；稅與優惠改為可收合的 `税込（含稅）`／`税抜（未稅）`、無稅／8%／10%／自訂、折扣及單品／全部免稅，計算使用整數 basis points 與最大餘數分配。
- 代購對象改為可管理的本機膠囊清單。完整紀錄支援品名／店名／備註搜尋、類別／支付／代購篩選與日期／類別分組；設定儲存及手動同步新增 spinner、disabled 與 `aria-busy`。
- 個人編輯以一次 localStorage 寫入原地替換並盡量保留 ID；團體編輯固定建立原因「編輯修改」的舊筆墓碑，再 append 新支出並以 `replacesRecordId` 串接，整批原子入列。ADR 0006 已補記雙軌編輯語意。
- Service Worker cache 升至 `okayama-trip-v21`。本批未修改 validator 六類日誌機制、BUILTIN、四分頁、icons、manifest、Netlify、Scroll-only、viewport recovery 或其他 CMS 表。

## 2026-07-18 — 分帳 2.0 手機儀表板與快速記帳（Dev）
- 分帳首頁改為個人／團體雙軌儀表板，提供雙幣總額切換、今日摘要、個人代購摘要、團體結算摘要及依本機日期分組的最近 15 筆消費。
- 新增 Scroll-only Bottom Sheet 快速記帳：單品支援即時換算；多品項支援獨立類別、整單税込／税抜 8% 或 10%／免稅、固定折扣，以及個人代購或團體分攤的單項覆寫。Sheet 只用 CSS `touch-action` 宣告並維持背景鎖捲動，未加入 JavaScript 手勢攔截。
- 多品項實付金額以確定性最大餘數法分配，JPY／TWD 各品項總和精確守恆；每筆具獨立 Record ID、團體批次共用 batchId，且所有團體品項會先進既有 Queue 再等待網路結果。
- 個人代購可依對象查看小計；團體結算卡與面板直接使用 PR 4 的 balances／transfer suggestions。新增完整歷史、個人代購篩選與紀錄明細，並沿用個人真刪、團體墓碑刪除及已刪目標隔離規則。
- 新增 dashboard、proxy、multi-item、quick-entry、settlement、history 與 tombstone 聚焦回歸；390px 本機 QA 通過主要導覽、Bottom Sheet、多品項、完整歷史、明細及空結算狀態，browser error 為 0。Service Worker cache 升至 `okayama-trip-v20`。
- 本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、manifest、icon 或 Netlify 設定。

## 2026-07-18 — Modal／Bottom Sheet Scroll-only 手勢裁定（Dev，純文件）
- Modal／Bottom Sheet 類表面一律視為 Scroll-only 區，不開放捏合例外；可捲動區使用 `touch-action:pan-y`，互動控制項使用 `touch-action:manipulation`，祖先手勢交集仍禁止 pinch zoom。
- 開啟 Bottom Sheet 時維持背景鎖捲動，Sheet 內只提供垂直捲動；禁止新增 JavaScript `touchstart`、`touchmove`、`gesturestart` 或 `preventDefault()` 手勢攔截。
- PR 5 分帳儀表板／快速記帳設計與實作計畫已同步此裁定。本批未修改 App、Schema、Validator、SW、測試、資料或部署設定。

## 2026-07-18 — 分帳 2.0 精確分配與確定性團體結算引擎（Dev）
- 新增無 DOM 相依的 participants JSON 解析、最大餘數整數分配、每人已付／應付／淨額與確定性貪婪轉帳建議純函式。
- 團體結算只使用有效 `recordType=expense` 紀錄保存的 participants 快照；不依目前成員名單重算。缺失、空白、重複或格式錯誤的 participants，以及負數、非整數或超出安全整數範圍的金額會警告並原子排除。
- JPY 與 TWD 完全獨立結算；不可整除的最小貨幣單位依 participants 原始順序分配，分配總和與淨額守恆均由回歸測試鎖定。
- 轉帳建議每輪配對最大應付者與最大應收者，同額時優先正式身分註冊順序、其次正規化名稱；結果正確且筆數精簡，不宣稱全域最少。
- 墓碑、被刪除紀錄、身分註冊、TEST、個人帳及舊版無 `recordType=expense` 的紀錄不參與結算。本批未修改 UI、Schema、Validator、Apps Script、SW、Netlify 或共享資料。

## 2026-07-18 — 分帳 2.0 個人真刪與團體墓碑刪除（Dev）⭐ 架構變更
- 個人帳刪除使用不可復原的二次確認，確認後直接從 `trip_personal_ledger` 移除，不建立墓碑且不影響團體帳。
- 團體帳刪除改為必填原因的協作式對話框，透過既有 Ledger Repository append `recordType=deletion` 墓碑；保存目標 ID、操作者、時間、原因與原始 batchId，金額固定為零。
- 新增單一有效紀錄解析器：墓碑及其目標不顯示、不計入筆數與總額；重複墓碑保持冪等，非法或不存在目標安全忽略並輸出警告，身分註冊與墓碑不可刪除。
- 移除建立負數沖銷的 UI 與程式入口；既有負數歷史紀錄維持讀取及原有金額效果。離線墓碑沿用現有 queue、retry、flush 與伺服器 ID 去重；送達後由本機 bridge 保留至公開 CSV 確認，避免延遲期間原紀錄復活。
- ADR 0006 追加墓碑決策。本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、SW、Netlify、結算或完整儀表板。

## 2026-07-18 — 分帳 2.0 個人／團體雙軌資料層（Dev）
- 分帳頁新增 `個人 / 團體` session 模式，預設個人；個人帳只寫入 `trip_personal_ledger`，不呼叫團體 Ledger Repository、不進 Queue、不寫 Sheet，團體帳維持既有跨裝置同步。
- 個人與團體的列表、筆數與總額完全隔離；TEST 模式僅作用於團體帳。團體一般支出開始保存 `recordType=expense`、支付方式與記帳當下的註冊成員 JSON 快照，身分註冊保存 `recordType=identity_registration`。
- 預設類別改為餐飲、交通、票券、購物、衣服、美妝、其他；預設支付方式為現金、信用卡、行動支付、Suica、其他。設定頁可新增、刪除及排序，刪除選項不影響既有紀錄顯示。
- 本機備份升至 version 2，加入個人帳、自訂類別與支付方式；version 1 備份仍可還原，缺少的新欄位使用安全預設，無效 JSON 與寫入失敗維持原子回滾。
- Service Worker cache 升至 `okayama-trip-v19`。本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、Netlify、墓碑刪除、結算或完整儀表板。
- 390px 本機 QA 通過四分頁、雙軌切換、個人本機保存、團體資料隔離、自訂類別新增／刪除與 Settings；無水平溢出，browser error 為 0。另發現四筆既有 Sheet 身分註冊資料因先前欄位移動而錯位，本批未自動修復或刪除共享資料。

## 2026-07-18 — Ledger 2.0 Schema 與 Apps Script 契約擴充（Dev）⭐ 架構變更
- Schema 升至 `2.6 (2026-07-18)`；Ledger 在既有八欄末端追加分攤成員、支付方式、紀錄類型、目標紀錄 ID、刪除原因與批次 ID，六欄均為選填，`participants` 契約為 JSON Array 字串。
- Apps Script append 契約擴充為固定 14 欄；舊 payload 缺少新欄時補空字串，既有 Record ID 去重、零金額身分註冊、驗證語意與 `updateSettings` 不變。
- Exp 說明修正為行前團費僅存於試算表，App 不渲染也不從 Exp 推導同行成員；`09_SCHEMA_MAPPING.md` 已由 `schemaDoc()` 重建。
- Sheet 六欄表頭與 Apps Script 新版本已部署於既有 Web App URL；真實端點測試 ID `1784359857550-eva1` 回 `{ok:true}`，公開 CSV 已確認固定 14 欄正確落位，`participants='["Bar","Amy"]'`、非空支付方式、`recordType=expense`、空目標／原因與 batchId 均完整回讀。本批未修改分帳 UI、Repository、Queue、Parser 行為、BUILTIN、Validator 核心、SW 或 Netlify。

## 2026-07-18 — 分帳共享身分、購物分類與團費區塊修正（Dev）
- 分帳成員來源收斂為 Ledger 精確 `[身分註冊]` 紀錄；一般模式排除 TEST 註冊，測試模式可選正式與 TEST 註冊，Exp、一般支出、沖銷、BUILTIN 與 localStorage 均不再推導共享成員名單。
- 首次進入與設定頁共用成員選擇器；既有／新增身分皆需二次確認，名稱統一處理全形空白、連續空白與前後空白，新增身分透過既有 repository 寫入零金額註冊並支援離線佇列。
- 設定頁顯示目前身分並提供切換／新增入口；切換只更新目前身分，不改寫歷史支出。身分註冊紀錄不顯示於支出明細、不可沖銷且不納入筆數、小計或全團總計。
- 分帳頁說明精簡為「記帳會跨裝置同步 💴」，沖銷確認改為負向紀錄語意；2.5「行前團費並列」經 Bar 裁定移除，資料僅保留於試算表，App 分帳頁不再渲染。
- 購物店家列新增取自 `cat` 的低彩度分類標籤，不改動 Schema、BUILTIN 或既有樓層／免稅／想逛操作；Service Worker cache 更新為 `okayama-trip-v18`。
- 390px 本機驗收涵蓋首次身分、二次確認、設定切換、離線排隊、四分頁、分類標籤與分帳簡化，頁面錯誤為 0；真實端點僅寫入一筆 `[TEST] [身分註冊]`（ID `1784337999516-9qnm`），公開 CSV 已回讀且一般模式未列為候選。

## 2026-07-17 — 分帳安全提示與設定備份 UX
- 設定頁改用「匯率」「預設輸入幣別」中文標籤；內部 TripConfig 契約鍵不變。
- 測試模式在設定頁標示「僅分帳用」，開啟時分帳頁頂部顯示橘紅警示，可直達設定關閉並立即更新畫面。
- 成員身分切換改為設定頁內行內小按鈕；首筆分帳類別預設餐飲，同次開啟期間沿用上一筆類別且不寫入 localStorage。
- 本機資料備份改為自動複製完整 JSON；剪貼簿拒絕或 1.5 秒未完成時提供手動複製 overlay，還原欄位僅在需要時開啟。
- Service Worker cache 更新為 `okayama-trip-v17`；本批未修改 Schema、validator、Apps Script、CMS 或個人狀態 JSON 契約。

## 2026-07-17 — 雙擊放大相容性定案
- 三次開關對照顯示：document 手勢觀測 listener 集合存在時雙擊縮放消失，診斷退役時再現；此結果支持觀測者效應，但不宣稱為 WebKit 跨版本保證。
- 移除 24 筆手勢環形緩衝、事件快照、報告／複製／清除 UI 與相關 CSS；桃子入口、健康檢查、時間模擬、Day 快捷鍵、行程重置及 viewport/focus recovery 均保留。
- 只留下單一 passive no-op `dblclick` listener 作為目標 iPhone 的未文件化相容性 workaround，不呼叫 `preventDefault()`；Service Worker cache 升至 `okayama-trip-v16`。
- 實機驗收需同時確認雙擊不縮放及快速依序點擊類別、JPY/TWD、設定控制項不誤送事件；若有副作用，移除 listener 並以 SW v17 回滾。
- 本批未修改 Schema、validator、資料流、Apps Script、Scroll-only、`touch-action`、viewport meta 或其他功能。

## 2026-07-17 — 分帳換算、共用設定與手勢蒐證 ⭐ 架構變更
- Schema 升至 `2.5 (2026-07-17)`,TripConfig 新增精確鍵 `Exchange Rate` / `Ledger Default Currency`；JPY/TWD 改為單幣輸入,依匯率四捨五入換算另一幣別並同時保存。
- 分帳類別改為餐飲、交通、票卷、購物、其他、代墊六個單選按鈕；分帳頁移除身分切換,設定頁成為唯一切換入口；右上健康同步文字改為無勾勾的「已同步」。
- 新增 `apps-script/ledger-sync.gs` 與部署 README。App 可 append「分帳紀錄」並更新 TripConfig 兩個固定鍵,其他 CMS 欄位仍由 Bar 管理且 App 唯讀；設定確認 bridge 涵蓋公開 CSV 1–5 分鐘延遲。
- 因雙擊放大再現,恢復被動 iOS 手勢診斷（24 筆環形緩衝、報告／複製／清除）；未加入 `preventDefault`、雙擊 guard 或永久 viewport 限制。Service Worker cache 升至 `okayama-trip-v15`。
- 新版 Apps Script 已部署並完成真實閘門：`updateSettings` 以 0.2／JPY 回傳成功，TripConfig CSV 發布精確兩列；測試 ID `1784292475781-9115` 首送回 `ok`、重送回 `dup`，ledger CSV 僅一列。
- 390px 瀏覽器 QA 通過頂欄不重疊、單幣換算預覽、設定保存、無勾勾「已同步」與旅行日 mock Date，頁面錯誤為 0；實機離線補送與 iOS 手勢報告留待 Bar 手機驗收。

## 2026-07-17 — 分帳跨裝置同步 ⭐ 架構變更
- Schema 升至 `2.4 (2026-07-17)`,新增第 8 張 `ledger` 分帳紀錄表(gid `896856089`)與 Apps Script append-only 寫入通道；ADR 0006 記錄 repository 抽象、離線佇列、ID 去重與負向沖銷決策。
- 首次啟動強制選擇 Expenses 同行成員身分；新增設定 overlay,提供身分切換、打卡／想逛／身分／佇列 JSON 匯出還原與 `[TEST]` 模式。
- 分帳頁合併雲端紀錄與本機待同步佇列,按成員與全團顯示日幣／台幣小計；`[TEST]` 排除彙算,行前團費區塊維持並列。
- 原有 7 表維持原子快照 Gate；ledger 下載失敗時沿用目前 ledger 快照且不阻塞其他表。Service Worker cache 僅升至 `okayama-trip-v14`。
- 真實端點驗收通過:測試 ID `1784274603804-y3g6` 首次 POST 回 `{ok:true}`,同 ID 再送回 `{ok:true,dup:true}`；公開 ledger CSV 僅出現 1 筆,確認寫入與伺服器端去重契約。

紀錄格式:日期 / 版本 / 重點。細節不展開,新變更往上加。

## 2026-07-17 — 文件一致性修正(Dev,純文件)
- `tasks/current.md` 與 `.ai-manifest.json` 已同步至 2026-07-16 全部交付後現況,涵蓋行程表頭契約、fuel 型別、父子行程卡、7 表原子快照同步、診斷與同步狀態精簡及新 PWA 圖示 / SW v13。
- 移除 v9 雙擊縮放診斷待辦:iOS 手勢診斷已退役,診斷路線關閉;Scroll-only 政策維持;問題若再現另立新任務。
- 後續狀態收斂為 Bar 手機全面驗收 `dev`,驗收通過後核准 PR merge `dev → main`,再由 Netlify 正式部署與線上驗證。
- 本批未修改 App、Schema、Validator、SW、測試或部署設定。

## 2026-07-16 — 父列第一站父子行程卡（Dev）
- 父列本身具有地點或 ID 時會成為父子卡第一站，父列第一站加一個後續空白「行程」列即可成卡，不依 Day、PID、RID 或地點名稱硬編碼。
- Day 1「岡山桃太郎機場 P001 → ORIX租車 P048」時間範圍顯示 `17:30 - 19:30`，第一站與後續站皆可精確開啟原始行程卡；父卡本身仍只負責展開／收合。
- 首頁主佇列使用 synthetic controller 管理整組進度；完成第一站不會結束整組，全部實際站點清除後才完成，取消任一站完成會重新開啟整組。
- Day 1–6 共 12 組已知父子行程以通用測試稽核，並保留下一站、自動略過、復原、行程打卡與既有 localStorage container keys。

## 2026-07-16 — 診斷面板與同步狀態精簡（Dev）
- Places 網站欄位維持選填，空白不再產生 `OPTIONAL_EMPTY` 驗證警告；健康檢查與阻擋規則不變。
- 同步狀態改為置中的狀態摘要：健康時顯示勾勾、最後完整同步時間、Schema 與資料版本；失敗時才顯示未同步 Sheet、安全原因與沿用快照時間。
- 移除診斷面板的版本、逐 Sheet 同步區與 iOS 手勢事件收集／環形緩衝／報告 UI；保留桃子入口、健康檢查、時間模擬、Day 快捷鍵、Scroll-only 與 viewport/focus recovery。
- 「重置行程進度」改為全寬圓角紅底白字，原有雙重確認與清除範圍不變。

## 2026-07-16 — Fuel 地點類型與 Day 6 稽核（Dev）
- Places Type 新增獨立 `fuel` 映射,`加油站`於行程頁與首頁顯示「⛽ 加油站」,行程資訊按鈕顯示「⛽ 加油資訊」。
- Schema 更新至 `2.3 (2026-07-16)`;P045 岡山機場加油站可通過未知 Type Gate,P046 ORIX租車仍維持 `租車點 → parking`。
- Day 6 父子卡稽核新增「岡山城 P041 → 岡山後樂園 P042」與「吉備津彥神社 P043 → 吉備津神社 P044」兩組回歸案例;本批未修改父子卡 runtime。
- Day 2「回住宿休息」確認 P013 為正確引用,取消原 P002 修正待辦。

## 2026-07-16 — 行程 Header 契約更新與父子卡待辦（Dev）
- 行程總表第三欄正式由 `詳細行程` 改為 `行程`;獨立 Schema、內嵌 Schema、BUILTIN 與對照文件同步更新至 Schema `2.2 (2026-07-16)`,不保留舊表頭 alias。
- 原子同步 Gate 測試確認 `行程` 映射至 `act`,舊 `詳細行程` 不再符合必要表頭契約。
- 高優先 backlog 新增父列地點成為第一子站、總計兩站即可成卡、Day 2–5 十處回歸與 Day 6 未完成資料排除規則。
- 本批未修改父子卡分組、導航、完成/略過或 localStorage 執行邏輯。

## 2026-07-13 — Google Sheets 原子快照同步（Dev）
- 七張 Sheet 候選資料只有在全部下載並通過 Schema 驗證後才一次啟用同一版本，避免新舊資料混用。
- 舊版逐表快取會遷移成完整快照；候選同步失敗時保留目前已啟用版本與畫面，不覆寫可用資料。
- 診斷同步狀態面板顯示目前版本、前次完整成功時間、各 Sheet 狀態與失敗原因，且不洩漏原始 CSV。
- 上線前公開 P025 Gate 已確認第三欄 Type 為 Schema 允許的「渡輪」，未知 Type 的嚴格驗證未放寬。
- `atomic-sheet-sync.test.js` 覆蓋單一版本啟用、舊快取遷移、失敗候選保留與狀態面板；publication tests 驗證 APP／SW 識別。
- 診斷面板顯示 `APP DEV · CODE 7070fb2 · 2026-07-13`；最終功能碼已包含完整快照 envelope 回讀、必填列值驗證，以及安全的失敗原因／Sheet 標籤等 review remediation；Service Worker App Shell cache 維持 `okayama-trip-v12`，`SHELL` 內容不變。

## 2026-07-13 — 購物地點標籤自動置中（Dev）
- 購物頁每次重繪後，會將目前選中的「全部／想逛／購物地點」標籤水平置中。
- 水平標籤移動與既有地點卡片垂直定位分離，不使用 `scrollIntoView()`，不改變樓層展開、搜尋、篩選或想逛資料。
- 診斷面板顯示 `APP DEV · CODE d0c17c0 · 2026-07-13`；Service Worker App Shell cache 更新為 `okayama-trip-v11`。
- 未修改 Schema、Validator、Sheet、manifest 或 localStorage 結構。

## 2026-07-13 — 首頁／購物定位／停車資訊 UX 修正（Dev）
- 首頁 NEXT STOP 移除「現在」標籤；行程頁「現在」及既有時間、完成、略過、自動略過判定不變。
- 首頁與行程頁的購物樓層入口會清除舊搜尋／篩選、選中對應 PID 並捲到購物地點卡片，不自動改變樓層展開狀態。
- 地點、餐廳與住宿的停車欄位如含多個非空白換行，於首頁與行程資訊中逐行列點；單行、MAP CODE 與停車繼承維持原樣。
- 診斷面板顯示 `APP DEV · CODE fcb0487 · 2026-07-13`；Service Worker App Shell cache 更新為 `okayama-trip-v10`。
- 未修改 Schema、Validator、Sheet、manifest 或 localStorage 結構。

## 2026-07-13 — 治理一致性修正批（Dev，純文件）
1. ADR 0005 補入 ADR 索引、manifest 導航與資料夾結構說明。
2. tasks 移除 ZIP 打包／deploy 目錄作廢流程，刷新 current/done、連續編號，新增 SW SHELL、Netlify 額度與 dev CI 評估項。
3. `index.html` 從 Tier 1 移入 Tier 2，消除檔案分級表矛盾。
4. 正式 App 清單對齊實際 icons、桃子診斷徽章與 `netlify.toml`。
5. Netlify 雙站架構寫入 Ops、ADR 0005、manifest 與 handover，並明確兩站獨立回滾及瀏覽器狀態隔離。
6. manifest 日期、已完成與待辦順序刷新至 v9 診斷取證現況。
7. 測試索引補齊 7 個檔案、Ops 版本同步標題修正，並補記本日 Netlify 額度 incident。
- 本批未修改 App、Schema、Validator、Service Worker、測試程式或部署設定；`dev` 現行 workflow 不產生 Actions 綠勾，經 Bar 核准改跑同等本機 CI 並記入 backlog。

## 2026-07-13 — Incident：Netlify 團隊額度耗盡
- 影響:`df94600` / `a669c6f` 的 dev 部署顯示 Skipped，手機無法取得預期測試版。
- 處置:改採正式／測試雙站架構並恢復部署；正式站追蹤 `main`，測試站追蹤 `dev`。
- 預防:backlog 新增 Netlify 月額度監控與接近上限時評估 GitHub Pages 遷移。

## 2026-07-13 — 首頁串點子卡詳細行程導向（Dev）
- 首頁父子串點展開後，點擊任一子卡可切換至同日行程頁、捲到對應卡片，並在有資訊面板時自動展開。
- 父卡仍只負責展開／收合；一般非父子卡、完成／跳過／自動略過與 localStorage 狀態均未改變。
- APP 顯示功能提交 `710c85d`；Service Worker App Shell cache 更新為 `okayama-trip-v9`，Schema 維持 2.1。
- Dev iOS 手勢診斷器繼續保留，本功能未增加手勢攔截或 viewport 修改。

## 2026-07-13 — iOS 雙擊縮放診斷 Build（Dev）
- v7 Scroll-only 手機驗證後，雙擊縮放仍可重現；本版只收集證據，不宣稱或加入修復。
- 診斷面板保存最近 24 筆 touch、gesture、dblclick 與 visual viewport resize 事件，可複製或清除報告；環境摘要包含即時 viewport meta，事件包含 html、body、target 的 computed touch-action。
- 所有 observer 均為 passive，不呼叫 `preventDefault()`、不修改 viewport、不寫入 storage，也不記錄輸入內容或完整 URL。
- APP 顯示功能提交 `cd921b2`；Service Worker App Shell cache 更新為 `okayama-trip-v8`，Schema 維持 2.1。
- 證據回收後僅依設計文件決策樹分類；任一實作方向均須另經 Bar 核准。

## 2026-07-13 — iOS 回前景與資料／首頁一致性（Dev）
- 線上行程總表已由 Bar 將 Musashi 的錯誤引用 `R013` 修正為 `R012`；health check 新增行程餐廳名稱與 RID 指向名稱不一致偵測。
- iOS 從背景或 page cache 回到前景時，還原原始 viewport、清除舊 inline transform，並於兩個 animation frames 後恢復原捲動位置。
- 首頁下一站將「依目前時間」改為與行程頁共用的「現在」徽章，提醒事項改用既有列點 renderer。
- 診斷面板更新為 `APP DEV · CODE edfbfba · 2026-07-13`；Service Worker App Shell cache 升至 `okayama-trip-v7`。
- 保留 Scroll-only、表單 focus／blur 還原與桃子診斷徽章；Schema 維持 2.1。

## 2026-07-13 — iOS Scroll-only 手勢政策（Dev）
- 實機確認第二階段雙擊攔截仍無效，且原生 viewport 與 `.wrap` transform 同時縮放造成偶發偏移及右側留白。
- 移除自製捏合回彈與 JavaScript 雙擊攔截，根層改為 `touch-action:pan-x pan-y`，只保留水平／垂直捲動。
- 保留桃子診斷徽章、表單 16px 下限及 focus／blur viewport 還原。
- 診斷面板更新為 `APP DEV · CODE 2363be3 · 2026-07-13`。
- Service Worker App Shell cache 升至 `okayama-trip-v6`；Schema 維持 2.1。
- 自動測試通過；最終手勢結果待 Bar 於 iPhone Dev PWA 驗證。

## 2026-07-13 — iOS 雙擊防放大第二階段（Dev）
- 將非互動區雙擊防護提前至第二次單指 `touchstart`，加入 350ms、24px 及 10px 移動取消門檻。
- 保留捏合回彈、桃子徽章、互動元件及輸入框 focus／blur 行為。
- 診斷面板新增 `APP DEV · CODE 10e87e1 · 2026-07-13`，Schema 獨立顯示。
- Service Worker App Shell cache 升至 `okayama-trip-v5`。
- 自動測試通過；最終雙擊行為待 Bar 於 iPhone Dev PWA 驗證。

## 2026-07-13 — iOS 防放大階段一
- 所有表單控制項有效字級提升至至少 16px,避免 iOS focus 自動放大;390px 排版保留既有 class 體系。
- 既有 viewport 重排 handler 加入表單 focus 來源、多指手勢排除與 100ms 瞬鎖瞬解,原樣還原啟動時 viewport 字串。
- `touch-action: manipulation` 作為雙擊縮放第一防線;階段一保留既有 `setupDoubleTapGuard()`,待 Bar 真實 iPhone 驗證後再決定階段二移除。
- Service Worker cache 升至 `okayama-trip-v4`;未修改 Schema、Validator、Google Sheet 或 Renderer 架構。Breaking Change:無。

## 2026-07-11 — 時間邏輯日期防護
- 現在、時間 cutoff 與自動略過僅在 appNow 對應的當日行程啟用，避免瀏覽其他日期時污染進度。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema；Breaking Change:無。

## 2026-07-11 — 現在定義統一與還原對稱
- 行程頁「現在」改用與首頁共用的時間感知下一站選擇器。
- 模擬還原以同一白名單函式清除現存個人狀態後再回寫快照，避免模擬中新建狀態殘留。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema；Breaking Change:無。

## 2026-07-11 — 診斷面板收尾與狀態統一
- 模擬套用與兩種結束操作會直接關閉診斷面板；結束按鈕放大，重置行程進度改為紅色警示。
- 新增 `setItemCompletion()` 統一完成、跳過與自動略過對 `trip_checks`、`trip_next_stop_progress` 的寫入；取消打卡改同時檢查兩份狀態。
- 行程內容增加 iOS viewport 重排防護，並全域防止非互動元素的雙擊縮放；桃子徽章與既有控制項不受影響。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema；Breaking Change:無。

## 2026-07-11 — 診斷面板與時間模擬修正
- 時間模擬改為 offset 模式，`appNow()` 以真實時間加偏移持續行走，並相容既有 `mode:"custom"` 設定。
- 診斷面板提供 Day 1–6 的 08:00 快捷設定、行走中時間提示、置中可捲動版面，以及保留／還原測試狀態的明確結束語意。
- 行程頁顯示完成、略過與總數分計；新增雙重確認的「重置行程進度」，範圍限打卡與略過狀態。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema；Breaking Change:無。

## 2026-07-11 — 手機體驗：導覽、縮放與時間模擬
- 底部導覽 icon 調整為 24px、文字為 12px，維持 fixed、safe-area 與每鈕至少 44px 觸控熱區。
- 主內容加入雙指自製縮放（上限 2.5 倍），放手或第三指誤觸後 0.2 秒回彈；MAPCODE 全螢幕層維持在縮放容器外。
- 桃子徽章雙擊開啟診斷面板，提供 healthCheck、各表同步狀態、版本資訊與日期時間模擬。
- 新增 `appNow()` 作為行程時間來源；時間模擬以 localStorage 快照還原個人行程狀態，模擬期間禁止新增分帳支出。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema；Breaking Change:無。

## 2026-07-11 — 單一 index.html App 遷移
- `index.html` 收斂為唯一可編輯 App 與 Netlify 正式入口;移除已無邏輯差異的 `日本行程V2預覽.html`。
- 全部回歸測試與文件一致性檢查改以 `index.html` 為目標,內嵌 schema / validator 一致性守門同步切換。
- 同步修正 02、08、10、README 與 `.ai-manifest.json` 的預覽檔、`deploy/`、舊站網址及舊發版流程敘述。
- Breaking Change:無。

## 2026-07-11 — AI 接手理解報告與核准閘門
- `08_AI_HANDOVER.md` 新增 AI 首次接手 Project Understanding Report,`15_AI_EXECUTION_RULES.md` 新增動工前核准閘門。
- 憲章 §4 過時的「打包 ZIP」條款改為 `16_OPS_PLAYBOOK.md` §E Release Flow。
- 修正 08 的部署現況、Gate 分支基準、正式發版流程與正式站網址。
- README 第一閱讀順序改以 08 的「閱讀順序」為單一權威。
- 本批次零新增檔案;Breaking Change:無。

## 2026-07-11 — Dev/Main 分支治理策略
- 新增 ADR-0005,正式定義 `dev → main` 雙分支策略。
- 日常功能、文件與 UX 開發改於 `dev` 分支完成並 Push;`main` 保留為 Bar 核准後的正式發版。
- Release Flow 改為 `dev → Pull Request → Bar Review → Bar Merge → main → Netlify Production Deploy`。
- Push 不再等於 Deploy;治理規則於 Bar Merge 本批次至 `main` 後正式生效。
- Breaking Change:無。

## 2026-07-11 — 手機導覽與首頁行程互動修正
- 底部導覽列鎖定 58px 基準高度並同步預留 iPhone safe area，每個按鈕維持至少 44px 觸控熱區。
- 行程頁取消打卡後立即重算首頁；未超時或無時間可回復候選，已超時或跨日則沿用自動略過狀態並顯示提示。
- 自動略過與取消打卡共用同一時間解析及 `pickNextStop()` 判斷；時間區間改以結束時間判斷。
- 首頁同區串點子站移除導航、停車與資訊按鈕，完整操作保留在行程頁。
- 首頁完成 / 跳過按鈕字級調整為 12px，按鈕尺寸與觸控範圍不變；購物想逛功能未修改。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema / 資料流。
- Breaking Change:無。

## 2026-07-11 — PWA 圖示、首頁與分帳安全修正
- PWA manifest 的 maskable 192 / 512 圖示改用獨立安全區資產，Service Worker 外殼快取同步加入兩個檔案；`any` 與 Apple touch icon 維持原圖。
- 行前首頁的行程重點改為顯示所有天數，每日重點仍維持最多 3 筆。
- `html, body` 加入 `touch-action: manipulation`，防止雙擊縮放但不限制捏合縮放。
- 本地分帳刪除支出前改為先確認，取消時不寫入也不重繪。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema / 資料流。
- Breaking Change:無。

## 2026-07-11 — 首頁同區串點
- 首頁下一站遇到既有父行程下連續兩站以上的子行程時,改為一張可展開的同區串點票卡;行程分頁仍維持逐站卡片。
- 收合卡顯示目前子站,完成 / 跳過只作用於該子站;展開後保留各子站的導航、停車與資訊操作。
- 子站到達下一個子站開始時間仍未處理時,自動略過並保留 `⏱ 自動略過` 狀態;所有子站清除後才完成父行程並前往下一站。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema / 資料流。
- Breaking Change:無。

## 2026-07-10 — MAP CODE UI 一致性修正
- 購物頁移除導航按鈕與 MAP CODE / 停車資訊區塊,讓購物頁聚焦店家、樓層、搜尋與想逛清單。
- MAP CODE 與停車資訊保留於今天 / 行程頁的停車面板,維持大字純顯示與點擊全螢幕查看。
- 購物頁僅保留官方資訊入口,避免抵達前資訊干擾逛店流程。
- 新增回歸測試,避免導航與 MAP CODE 區塊重新出現在購物頁。
- 未修改 `schema.js` / `validator.js` / Google Sheet Schema / 資料流。
- Breaking Change:無。

## 2026-07-10 — 文件與 Harness 現況一致性修正 ⭐ 治理變更
- `02_ARCHITECTURE.md` / `10_FOLDER_STRUCTURE.md` 改用現行 `SCHEMA`、`parseTable`、`buildHeaderMap` 術語,並區分目前預覽版原始碼與規劃中的 `deploy/` 部署包
- `03_DATABASE.md` / `11_CODING_CONVENTION.md` 修正 ID 規則:一般資料表使用 P/R/S/H,Expenses 為自由格式且沒有 E ID
- `README.md` / `.ai-manifest.json` / `08_AI_HANDOVER.md` 明確列出目前 repo 檔案與打包後才建立的部署檔;同步修正舊欄位術語
- `08_AI_HANDOVER.md` / `tests/README.md` 區分現有 Node 回歸測試、人工三情境 QA 與尚在 backlog 的 Playwright 自動化腳本
- `tasks/current.md` / `13_PROJECT_STATUS.md` 移除已完成的 repo 修復與「行程仍在補齊」舊狀態,MAP CODE UI 保留為獨立後續工作
- 僅修改文件與 Harness;未修改 App、schema、parser、資料流或 Google Sheet
- Breaking Change:無

## 2026-07-10 — Places.Type 新增機場與纜車
- `schema.js` 的 Places.Type values 新增「機場」與「纜車」,兩者正規化為既有 `attraction` 景點卡片
- 同步更新單檔預覽內嵌 Schema、CMS 快速概覽、Schema 對照文件與 AI manifest;並修正 `schemaDoc()` 產生結果與 09 文件既有內容不一致
- 新增回歸測試,避免獨立 Schema 與內嵌 Schema 再次遺漏這兩個資料值
- 未修改 parser、資料流或 Google Sheet 欄位結構
- Breaking Change:無

## 2026-07-10 — 修復批:交付通道防呆 + 事故處理規範 ⭐ 治理變更
- **Incident 記錄**(依新 §C 規則補記):07-09~07-10 三起上傳事故——①19 檔內容錯位 ②.ai-manifest.json 隱藏檔漏傳 ③正式 HTML 誤刪+測試模擬檔誤入 repo(CI 紅燈兩輪未被注意)。根因:網頁拖曳上傳缺乏 diff 預覽。均已修復。
- 16_OPS_PLAYBOOK 新增 §C 事故處理(**CI 紅燈=停止新工作**,修復優先,事後記錄)與 §D 雙通道交付 SOP(GitHub Desktop 為主 + 版本同步三規則,Bar 核准)
- tools/check-doc-titles.js 新增三條規則(均通過反向測試):④核心檔案存在性 ⑤測試模擬檔擋入 ⑥HTML 內嵌 schema/validator 與獨立檔一致性
- qa.yml 改為自動執行 tests/ 內全部 *.test.js(新增測試免改 CI)
- 14 新增「禁入 repo 的產物」章(測試模擬檔規則 + localStorage 污染警示)
- tasks 更新:品質批彙整(9 項,含 Bar 裁定的隱藏式重置功能)
- Breaking Change:無

## 2026-07-09 — 首頁下一站卡可跳到行程詳情
- 首頁「NEXT STOP」卡片主體可點擊,會切到行程頁並定位到同一行程
- 若該行程有資訊面板,跳轉後會自動展開資訊內容;導航/完成/跳過按鈕維持原本獨立操作
- 僅調整 `日本行程V2預覽.html` 互動層與回歸測試,未修改 schema、parser、Google Sheet 或正式部署檔
- Breaking Change:無

## 2026-07-09 — Day2 驗收微調:渡輪時刻表與隱藏邏輯
- 渡輪時刻表支援同一欄位內多個官方 URL,會分別顯示為品牌時刻表按鈕
- 行程頁「隱藏已完成」改以可打卡行程列與下一站處理狀態一致判斷,不再只看活動文字欄
- 渡輪資訊面板移除重複的「航程/搭乘」列,保留船票與官方時刻表入口
- 僅調整 `日本行程V2預覽.html` 顯示/狀態邏輯與回歸測試,未修改 schema、parser、Google Sheet 或正式部署檔
- Breaking Change:無

## 2026-07-09 — 首頁下一站卡補付款資訊
- 首頁「NEXT STOP」卡片若下一站為餐廳,會在營業時間下方顯示餐廳付款方式
- 僅調整 `日本行程V2預覽.html` 顯示層與回歸測試,未修改 schema、parser、Google Sheet 或正式部署檔
- Breaking Change:無

## 2026-07-09 — 下一站邏輯統一為時間判斷 + 自動略過過期項目
- **修復核心 bug**：`pickNextStop` 舊版邏輯是「今天只要手動完成/跳過過任一項,就切換成『依順序找下一項』,不再依時間推進」——導致忘記按掉的舊項目卡住主卡一整天。修正後統一只看時間,不受手動動作歷史影響。
- **新增「自動略過過期項目」**（Bar 確認,理由：時間不能重來、行程不會同天回訪）：已過時間且未手動處理的項目,除「最後一項」保留待確認外,其餘（含夾在中間的無時間項目）自動寫入 `progress.skip`,並記錄 `autoSkip` 標記。
- **完成度判斷不受影響**：`isTripItemCleared`/`remaining` 只看手動 done/skip/checks + 自動略過(本身就是 skip 的一種),時間本身從不直接影響「完成度」,只影響「該不該自動略過」這個寫入動作本身。
- Trip 頁自動略過項目顯示「⏱ 自動略過」標籤；點打卡可一鍵修正為「完成」(對應「有去但沒空點」的情境)，並清除 autoSkip 標記。
- 明日預告拆成兩條規則(修掉舊版 22:00 分支永遠進不去的死碼)：全部手動清除 → 主卡整個換成明日預告；仍有未清項目 → 主卡保留,21:00 後(`TOMORROW_PREVIEW_HOUR`)下方加縮小版明日預告,兩者並存。
- `shouldShowTomorrowPreview`/`hasUnfinishedToday` 拆為 `shouldReplaceWithTomorrowPreview`/`shouldShowCompactTomorrowPreview` 兩個更直接可測試的純函式。
- 新增 `tests/pick-next-stop.test.js`(6 個情境,含原始 bug 的回歸測試)；`render-note.test.js` 同步更新函式名稱與明日預告斷言。
- Breaking Change:無(个人狀態格式向下相容,新增的 `autoSkip` 欄位由 `normalizeDayProgress` 提供預設值)。

## 2026-07-09 — Sanity CI 與文件小修
- 新增 `.github/workflows/qa.yml`:push/PR 自動跑文件一致性檢查與既有回歸測試,Gate 首度自動化
- 新增 `tools/check-doc-titles.js`:檢查編號/具名文件的標題與檔名一致、manifest JSON 有效、根目錄無上傳殘留雜檔;已反向測試可攔截「內容錯位」事故
- README 第一閱讀順序補上 15(必讀)與 14/16(依任務讀),與 08/manifest 對齊
- tasks/done.md 檔頭日期修正為 2026-07-09
- 同步更新:14(Tier 1 納入 tools 與 workflows)、10(repo 結構)、tests/README(CI 說明)、backlog #3(Playwright 完成後掛入 CI)
- Playwright 三情境維持原時程:待 Bar 手機驗收穩定後執行
- Breaking Change:無

## 2026-07-09 — 治理層 v2:審查後修正 ⭐ 治理變更
- 狀態文件收斂:即時狀態唯一權威定為 `tasks/`;06_ROADMAP 重定位為方向性文件;13_PROJECT_STATUS 定為快照;修正 Day3-6/Day4-6 矛盾(六天大方向資料已補完,剩微調);清除 06 過時項(R001/R006 已完成);Day2 P012→P002 修正狀態列入 backlog 查核
- 文件權威核定:GitHub 本 repo 為程式與文件唯一權威,Drive 降級為備份;內容資料來源仍為 Drive 試算表發布 CSV(README/10/manifest 同步更新)
- `00_CONTEXT_HANDOVER` 定位為歷史快照:加註效力聲明(不優先於現行文件、衝突以現行為準、免每次重寫)
- 新增 `14_FILE_TIERS_AND_GATE.md`:檔案風險三級分類(一般開發/高風險/產生產物)與 Gate 分級保護;部署包規劃納入 repo `deploy/`
- 新增 `15_AI_EXECUTION_RULES.md`:對話指令效力(預設非覆寫)、不確定性三分法協議、檔案增刪權限、任務分級 A/B/C(取代一律十三步)、文件vs現實衝突協議、防過度自信機制、工具特定陷阱標註
- 新增 `16_OPS_PLAYBOOK.md`:Netlify 回滾、SW 快取災難處理、Google Sheet 版本還原、git revert 原則;憲章 §8 清理排程規範移入本檔並補「服務登記檔」定義
- 新增 `tests/README.md`:每次程式交付必附可執行測試(Bar 核准);Playwright 三情境腳本列入 backlog
- 憲章更新:優先級補充(指令效力/schema.js 資料權威/00 不參與優先序)、十三步加任務分級註記、§4 加檔案分級、§8 改為指引
- 修正 09_SCHEMA_MAPPING:`[schema]` 前綴更正為 `[Schema Error]`;TripConfig Home Page 標註未啟用;表格區禁手改註記
- `.ai-manifest.json`:workflow 鍵名修正(Gate=第0步+十三步)、known_traps 標註工具特定/環境陷阱、status 與文件索引更新
- Breaking Change:無(純文件與治理層,未動 App 程式、schema、parser、Google Sheet)

## 2026-07-08 — Pre-Work Git Sync Gate 納入 Harness
- 在 PROJECT_CONSTITUTION / DEV_WORKFLOW / manifest / handover 補上開工前 Git 版本同步 Gate
- 明確要求實作、打包、push、部署前先確認本地與 `origin/main` 一致且 working tree 乾淨
- 若版本不一致或本地有改動,必須先盤點並經 Bar 確認;不得自動覆蓋本地改動
- Breaking Change:無

## 2026-07-08 — 任務板狀態更新
- 依 Bar 最新決策調整驗收順序:先補完 Day4-6 Google Sheet,再手機驗收、打包與 Netlify
- Google Sheet 發布 CSV 已確認 R001 / R006 的 Tabelog 評分與營業時間已補齊
- GitHub `origin/main` 已確認包含購物頁多地點切換與「區域 / 樓層」呈現,後續待手機試用後再微調
- Breaking Change:無

## 2026-07-08 — 本機清理排程安全規範
- 在 `PROJECT_CONSTITUTION.md` 新增本機開發環境清理安全規範:只清理已登記且過期的本地服務,以及超過 24 小時的低風險暫存
- 在 `12_DEV_WORKFLOW.md` 新增建立本機清理排程的 DevOps 情境,要求 dry-run、log、自測、移除方式與每 6 小時執行一次
- 明確禁止亂殺所有 `node` / `python` / `chrome` 行程,避免清理工具破壞使用者工作階段
- Breaking Change:無

## 2026-07-08 — 備註條列顯示優化
- 新增備註顯示層格式化,將多行備註中的 `•`、數字、圈號與 `※` 自動顯示為較易閱讀的段落 / 條列 / 提醒樣式
- 套用於 Places、Restaurants、Hotels、行程卡片與購物地點備註;Shopping 店家短備註維持原本精簡顯示
- 移除備註卡片前方燈泡符號,降低多餘空白與卡片高度
- 僅調整 App 顯示層,未修改 `schema.js`、parser、Google Sheet Schema 或 CMS 欄位
- Breaking Change:無

## 2026-07-07 — 購物頁多地點預覽版
- 購物頁來源改以 `Places.Type=購物` 顯示本次行程購物地點,再掛上 `Shopping.PID` 店家資料
- 新增 `全部 / 想逛 / 各購物地點` 切換,沒有店家明細的購物地點也會顯示資訊與導航
- 將「樓層指南」文案放寬為「區域 / 樓層」,短期不改 schema、validator 或 Google Sheet 結構
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合實作
- 行程分頁新增 `顯示全部 / 隱藏已完成` 篩選,使用既有打卡狀態
- 購物分頁想逛清單改為摘要列可展開 / 收合,避免長清單推擠樓層指南
- 兩者皆使用記憶體 UI state,不改 schema、validator、Google Sheet 或資料流
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-trip-filter-shop-wants.md`
- 明確實作順序:先提案 1 行程隱藏已完成,再提案 2 想逛清單可收合
- 限定只改預覽 HTML 與 changelog,不改 schema、validator、Google Sheet 或資料流
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合設計規格
- 新增 `docs/superpowers/specs/2026-07-07-trip-filter-shop-wants-design.md`
- 提案 1 採兩段式 `顯示全部 / 隱藏已完成`,限定於行程分頁
- 提案 2 採想逛清單可收合,使用記憶體 UI state,不改 Shopping 資料結構
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 實作
- 首頁天氣城市推算新增 resolved 飯店資料與同日鄰近站點 fallback
- `Guest House Life Field` 這類本身不含城市的下一站,可沿用同日合理城市顯示天氣
- 推算結果只供天氣 chip 使用,不影響導航、schema、Google Sheet 或 CMS
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-weather-city-fallback.md`
- 將天氣城市推算 fallback 拆成 resolved 資料比對、同日鄰近站點 fallback、首頁天氣接線與驗證任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 設計規格
- 新增 `docs/superpowers/specs/2026-07-07-weather-city-fallback-design.md`
- 定義下一站無法直接判斷城市時,可依同日鄰近站點與當日主要城市保守推算天氣城市
- 限定推算結果只供天氣 chip 使用,不影響導航、schema、Google Sheet 或 CMS
- Breaking Change:無

## 2026-07-07 — 專案規畫進度同步
- 從 GitHub fast-forward 更新到最新 main,納入首頁下一站與天氣摘要相關提交
- 新增 `13_PROJECT_STATUS.md`,彙整目前階段、已完成、等待事項、下一步與風險
- 更新 `.ai-manifest.json` 與 `tasks/current.md` / `tasks/backlog.md` / `tasks/done.md`,讓規畫進度與 GitHub 最新狀態一致
- Breaking Change:無

## 2026-07-07 — 首頁下一站完成/跳過復原
- 完成或跳過下一站後,toast 新增「復原」操作
- 復原會還原該站完成/跳過與打卡狀態,降低旅途中誤觸風險
- Breaking Change:無

## 2026-07-07 — 首頁日期卡與天氣摘要 UI 微調
- 縮小首頁日期卡高度與日期字級,減少上方留白
- 微放大天氣摘要 chip,讓右側資訊更穩定
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要 UX 實作
- 日期卡右側新增下一站所在地天氣摘要,格式為 `地名 圖示 溫度 雨%`
- 天氣地點依下一站資料推估,不使用 GPS
- 天氣資料即時抓取並快取於 localStorage,失敗時不影響首頁
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-home-weather-summary.md`
- 將天氣摘要拆成地點推估、天氣抓取/快取、日期卡 UI 與驗收任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要設計規格
- 新增 `docs/superpowers/specs/2026-07-07-home-weather-summary-design.md`
- 定義日期卡右側顯示下一站所在地天氣摘要
- 明確限制不使用 GPS、不改 schema、不改 Google Sheet、不回寫 CMS
- Breaking Change:無

## 2026-07-07 — 首頁下一站模式 UX 實作
- 首頁改為只突出下一站的票卡式旅途中視圖
- 新增每個行程日獨立保存的完成 / 跳過狀態,僅存在 localStorage,不回寫 CMS
- 下一站判斷採完成 / 跳過優先,無紀錄時再依目前時間推估
- Breaking Change:無

## 2026-07-07 — 首頁下一站模式實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-home-next-stop-mode.md`
- 將首頁下一站模式拆成狀態記憶、下一站判斷、票卡畫面與驗收任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 首頁下一站模式設計規格
- 新增 `docs/superpowers/specs/2026-07-07-home-next-stop-design.md`
- 定義首頁只突出下一站的旅途中 UX 方向
- 明確限制不新增分頁、不改 schema、不改 Google Sheet、不回寫 CMS
- Breaking Change:無

## 2026-07-07 — 03/05 文件一致性修正
- 修正 03_DATABASE.md 與現行 schema.js / 09_SCHEMA_MAPPING.md 不一致問題
- 將 03_DATABASE.md 重新定位為 CMS 快速概覽,不再作為欄位權威來源
- 修正 05_CODING_RULES.md 中 rowsToObjects / CONFIG 等過時術語
- Breaking Change:無

## 2026-07-06 — Shopping 想逛清單 UX 修正
- 修正 Shopping 分頁 UX:加入或取消想逛清單後,樓層展開狀態會保持,不再自動收合
- Breaking Change:無

## 2026-07-06 — Codex Ready 文件一致性
- README 第一閱讀順序改為 `.ai-manifest.json` → `PROJECT_CONSTITUTION.md` → `08_AI_HANDOVER.md` → 相關 ADR → 依任務讀 03/09/05/11/12
- 修正 00_CONTEXT_HANDOVER 的「Harness 文件未建完」過期描述,改為已完成並需維護一致性
- 對齊 08_AI_HANDOVER 的閱讀順序與 03/09、05/11 文件分工
- 新增 `tasks/done.md`,與 `.ai-manifest.json` 的 done 狀態對齊
- 文件一致性修正,無功能變更、無架構變更
- 修正 03_DATABASE.md / 05_CODING_RULES.md 狀態:兩者為現行可用概覽;作廢檔為 `-old-*_DEPRECATED.md`

## 2026-07-05 — V2.1(停車強化)
- 停車面板移除複製鈕,MAP CODE 26px 大字純顯示
- 新增 resolveParking():「停車同Pxxx」完整繼承(MAPCODE/停車費/停車備註;深度上限3;引用不存在→原文+console.warn)

## 2026-07-05 — V2(CMS 架構)⭐ 架構變更
- 資料層改為 7 張 Google Sheets(行程/Places/Restaurants/Shopping/Hotels/Expenses/TripConfig),表頭別名容錯解析
- 行程 7 欄制(新增 ID 欄),Pxxx/Rxxx 引用 + 名稱備援
- 卡片型別改由 Places.類型 明確驅動;渡輪卡簡化(末班船欄+官方時刻表連結,移除內建 206 班次)
- Restaurants 掛 Place 自動列出;Shopping 表驅動購物頁;分帳新增行前團費卡
- 每張表獨立快取與內建後備;同步徽章新增「部分更新」

## 2026-07-04 — V1(旅行助理化)
- 今天模式:下一站=第一個未打卡;自駕化(TripConfig 開關);型別卡片+快速動作列
- 停車卡(MAPCODE)、渡輪卡、購物模式(樓層摺疊/想逛/搜尋)、分帳儀表板(含日期)
- 修復:renderSplit 包裝造成的無限遞迴(改名 renderSplitCore)

## 2026-07-04 — PWA ⭐ 架構變更
- Netlify 託管(解決 file:// 沙盒);manifest+sw.js(Shell=SWR、資料=網路優先);可安裝 iPhone/Android/Desktop

## 2026-07-03~04 — 基礎版
- 試算表(發布CSV)→ 手機頁;三層防線(內建→快取→背景同步)
- WebView 相容:console polyfill、fetch clone 錯誤退回、吸頂容器合一(修重疊)
