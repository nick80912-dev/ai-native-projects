# 07 版本紀錄

## 2026-11-13 — v189 技術小項一次清(backlog #20、#50、#52、#53)

- **來源**:Bar 2026-11-13 選「技術小項一次清」;#50 回「改(根治)」,#52 選「只算目前模式」。
- **#52 資料健康只算目前模式**:設定 → 疑難排解 → 資料健康的「團體帳」待送／等待讀回,以及診斷面板「目前旅程」的團體帳列,只算目前模式(正式或 `[TEST]`)的紀錄,與帳本畫面一致;測試模式下標題寫「團體帳（測試模式）」。`ledgerBacklogForMode()`／`currentLedgerBacklog()`。送出、foreign 暫停(仍看整個佇列)、還原前的待送保護都不變。
- **#50 結案,不改程式**:動工前以真實 App 跑 4,000 筆隨機税抜多品項帳(JPY／TWD 輸入、四種匯率、含折抵)驗證,**舊算法編輯與更正後換算幣別逐品項變動 0 筆** —— v178 起各品項存了稅額與折抵,重載時的權重已與新增時相同,v135 時的漂移不再發生。原定的根治(改依輸入幣別品項金額分配)只會讓新帳換算幣別分配改變而沒有好處,因此還原為 v188 算法;`ledger-money-integrity.spec.js` 加上換算幣別逐品項與更正逐品項不變的斷言,防止日後回歸。
- **#53 結案,不改程式**:`sw-update-cache.spec.js` 的兩個等待 helper 已在 v146 改為 `expect.poll` ＋ await evaluate,且有「helper 在 controller 與快取真的存在前保持等待」的專屬測試;沒有剩下的 `waitForFunction(async…)`。
- **#20 SW SHELL 盤點**:current shell 用到的每個本機 script／icon／manifest 都在 `sw.js` SHELL,SHELL 每一項都存在;`okayama-peach-badge.png` 因 root v110 bridge 仍使用而保留;Google 字型與登入 SDK 為外部選用資源,刻意不快取(字型失敗退回系統字)。`tests/pwa-shell.test.js` 新增雙向檢查守住。
- **整理**:刪除 `shell/v186`,留 v187–v189;發布說明保留 v185–v189;backlog 移除 #20、#50、#52、#53。

## 2026-11-12 — 文件與 ADR 整理(Bar 選 A 內容校正＋B 歸檔＋C 合併;只改文件,App 版本不變)⭐

- **C 合併**:
  - `05_CODING_RULES.md` 併入 `11_CODING_CONVENTION.md`(補技術基線、八條鐵律、圖示、`appNow()`、測試字串搜尋陷阱)。
  - `06_ROADMAP.md`(里程碑)與 `13_PROJECT_STATUS.md`(長期風險)併入 `01_PROJECT.md`(改名「專案總覽」);三檔刪除,git 歷史保留。
  - `README.md` 改成文件索引表；`tests/README.md` 加「怎麼跑」,v108–v150 各版覆蓋說明移到 `docs/archive/tests-coverage-notes-v108-v150.md`。
  - 所有引用、`tools/check-doc-generation.js` 白名單、manifest 同步。
- **A 內容校正**:
  - 主題數(七組)、桃子徽章(v184 起是紙飛機圖示)、設定頁路徑(v185 起「疑難排解」)、試算表不限岡山等過時說法在 01／04／08／10／tests README 更正。
  - `04_UI_GUIDELINES.md` 補繪本主題 token 表列、外觀層、線條圖示與 v187 圓角。
  - ADR:0001–0006 補狀態列;0005 增補實際發版方式(Bar 核准後 AI 代為合併、線上核對、tag、文件紀錄 PR);0008 標題與索引改為七組;0020 狀態改為已上線且真機驗收完成;新增 **ADR 0022 試算表選填分頁**(天氣地區、行前清單、航班的共通做法)。`16_OPS_PLAYBOOK.md` §E 流程圖改成現行做法;`02_ARCHITECTURE.md` 補選填分頁不在三層防線內。
- **B 歸檔**(原文搬移,不改內容):
  - 版本紀錄 2026-10-16～10-31(v157–v177)→ `docs/archive/07_CHANGELOG-2026-10-16_to_2026-10-31.md`。
  - `tasks/done.md` 的舊 current.md 快照 → `docs/archive/tasks-current-snapshots-2026-07_to_2026-11-01.md`。
  - `docs/device-acceptance-log.md` v73–v146 清單 → `docs/archive/device-acceptance-log-v73_to_v146.md`(原檔改為待驗清單入口)。
  - 已完成的框架抽取計畫、10/03 第一批設計與計畫索引 → `docs/archive/`。
  - 仍被程式或測試引用的 5 份設計規格留在 `docs/superpowers/specs/`。
- 結果:主要文件總量從約 745 KB 降到約 456 KB(歸檔內容仍在 `docs/archive/`)。

## 2026-11-12 — v188 已上線 main，tag `production-v188`（待 Bar 手機審查）

- Bar 回「好，兩個合成一版做」後說「marge」（merge）。
- 本機完整 Chromium：465 passed、1 failed（已知只在本機失敗的 `personal-ledger-export`）。
- PR [#162](https://github.com/nick80912-dev/ai-native-projects/pull/162) 在 head `d329033` 的 sanity／browser-qa 全綠後合併進 `dev`（`e9b0596`）；PR [#163](https://github.com/nick80912-dev/ai-native-projects/pull/163) 合併 `dev` → `main`，merge commit **`00b7305`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v188'`。
  - 全新 Chromium：`APP_VERSION` 為 v188、只剩 `okayama-trip-v188` 快取，發布說明是「航班卡與行李清單」，沒有 pageerror；航班解析／卡片函式與 Schema `flightsGid` 鍵在線上，行前清單模型有 `packs`，主題七個。
  - 正式站 `shell/v188/index.html`、`schema.js` 與 `main` 逐位元組相同。
  - 前兩代 `shell/v187/`、`shell/v186/` 回 200，已刪的 `shell/v185/` 回 404。
- **tag**：production-tags workflow 建立 `production-v188` → `00b7305`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `e960e9b`（`production-v187`）的部署，再往前 bump。

## 2026-11-12 — v188 航班卡、行李清單、繪本主題補到其他頁面（Bar 看過畫面回「好，兩個合成一版做」；已上線 main，見上）

- **來源**：Bar 2026-11-12 指示「做繪本主題的其他頁面細修，必去標籤不用，行李清單就依之前規劃的行前清單」「團體帳的退稅不用做」；看過航班卡示意圖選「資料用 A（試算表新增航班分頁）」。
- **使用上**：
  - **航班卡**：試算表新增「航班」分頁（`日期,航空公司,班次,出發機場,出發時間,抵達機場,抵達時間,開櫃時間,航廈,托運,訂位代號,備註`，一列一班），TripConfig 填 `Flights GID`。出發前首頁顯示下一班；搭機當天今天頁最上面顯示當天航班（去程／回程自動標）；其他日子與旅程結束後不顯示。登機證造型，繪本主題是水色底粗框。不算飛行時間（兩地時區可能不同）。
  - **行李清單**：行前清單的類型寫「行李」（也接受攜帶、帶、pack）進「行李」區，標題旁顯示進度；自己新增時可選「待辦／行李」。首頁「行前準備」進度一起算。
  - **繪本主題**：下方彈出的面板、輸入框、採買清單「＋」、成員選擇、勾選框（墨灰）、首頁行前進度條補上繪本樣式。
- **Schema**：TripConfig 新增選填鍵 `Flights GID`（`schema.js` 與 inline 同步，`09_SCHEMA_MAPPING.md` 由 `schemaDoc()` 產生）；Checklist 說明加上「行李」。舊試算表不受影響。
- **試算表**：「TripPilot 下一趟」副本已新增「航班」分頁（只有表頭，gid `923055192`）並在 TripConfig 填好 `Flights GID`；航班內容待 Bar 填。
- **待辦**：#63 團體帳退稅依 Bar 指示不做，自 backlog 移除；「必去」標籤不做。
- **整理**：刪除 `shell/v185`，留 v186–v188；發布說明保留 v184–v188。

## 2026-11-12 — v187 已上線 main，tag `production-v187`（待 Bar 手機審查）

- Bar 看過繪本主題實際畫面回「好，發版」，並核准大圓角套到所有主題。
- 本機完整 Chromium：460 passed、2 failed —— 1 項是幾何測試仍寫舊圓角（首頁大卡 16、按鈕 9），已改成新值並重跑全過；另 1 項是已知只在本機失敗的 `personal-ledger-export`。
- PR [#159](https://github.com/nick80912-dev/ai-native-projects/pull/159) 在 head `9728d93` 的 sanity／browser-qa 全綠後合併進 `dev`（`11ac365`）；PR [#160](https://github.com/nick80912-dev/ai-native-projects/pull/160) 合併 `dev` → `main`，merge commit **`e960e9b`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v187'`。
  - 全新 Chromium：`APP_VERSION` 為 v187、只剩 `okayama-trip-v187` 快取，發布說明是「新主題：繪本」，沒有 pageerror。
  - `THEME_IDS` 有七個（含 `ehon`）；套用繪本主題後頁面底色是和紙白 `rgb(255, 252, 246)`，首頁插圖函式在線上。
  - 正式站 `shell/v187/index.html` 與 `main` 逐位元組相同。
  - 前兩代 `shell/v186/`、`shell/v185/` 回 200，已刪的 `shell/v184/` 回 404。
- **tag**：production-tags workflow 建立 `production-v187` → `e960e9b`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `9a355a1`（`production-v186`）的部署，再往前 bump。

## 2026-11-12 — v187 第七個主題「繪本／和紙」與大圓角（Bar 看過畫面回「好，發版」；已上線 main，見上）⭐

- **來源**：Bar 2026-11-11 看過旅圖 Lutu 後提供繪本風規格，選「做成第七個主題，先只做外觀」；2026-11-12 再核准把大圓角套到所有主題。
- **使用上**：
  - 設定 → 主題多了「繪本／和紙」：和紙白底、墨灰粗線框、大圓角、平塗；山吹黃是主要動作（導航）、若竹綠是完成、水色是首頁大卡與停車、珊瑚粉是景點標籤／選中的日期／儲存。
  - 選繪本主題時今天頁上方有手繪插圖（岡山四國：瀨戶大橋、桃子、渡輪；其他旅程：通用的山海小屋），雲和船會輕輕動，切換日期行程卡會彈一下；手機開「減少動態效果」時不動。
  - 所有主題的卡片圓角加大到 20、按鈕與備註框 14。
- **技術**：`THEME_IDS` 加 `ehon`；13 個 token ＋ `html[data-theme="ehon"]` 外觀層規則；`renderEhonArt()`、`playDayBounce()`。ADR 0008 增補（七個主題、外觀層例外）；`08_AI_HANDOVER.md` 與 manifest 同步。
- **這次不做**：航班卡片、「必去」標籤、行李清單。設定子頁、過往旅程、採買清單、結算頁在繪本主題下還沒逐頁細修。
- **整理**：依「只留最近 3 份」刪除 `shell/v184`，留 v185–v187；發布說明保留 v183–v187。

## 2026-11-11 — v186 已上線 main，tag `production-v186`（待 Bar 手機審查）

- Bar 看過前後對照截圖回「好」。
- 本機完整 Chromium：451 passed、6 failed —— 5 項是依舊畫面寫的測試（Emoji 文字、兩格篩選、「這一站」那行、回到現在按鈕高度），其中「回到現在」被我縮到 36px 是真的退步，已改回 44px；更新後相關 spec 全過。剩下 1 項是已知只在本機失敗的 `personal-ledger-export`。
- PR [#156](https://github.com/nick80912-dev/ai-native-projects/pull/156) 在 head `7243012` 的 sanity／browser-qa 全綠後合併進 `dev`（`d166bcd`）；PR [#157](https://github.com/nick80912-dev/ai-native-projects/pull/157) 合併 `dev` → `main`，merge commit **`9a355a1`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v186'`。
  - 全新 Chromium：`APP_VERSION` 為 v186、只剩 `okayama-trip-v186` 快取，發布說明是「畫面更清爽」，沒有 pageerror。
  - 新裝置尚未連接旅程（畫面是「尚未連接旅程」），所以行程卡無法在線上實際點開；改以正式站 `shell/v186/index.html` 與 `main` 逐位元組比對相同，並確認小開關、收合備註、線條圖示、天氣單行與淡綠「完成」的程式都在。
  - 前兩代 `shell/v185/`、`shell/v184/` 回 200，已刪的 `shell/v183/` 回 404。
- **tag**：production-tags workflow 建立 `production-v186` → `9a355a1`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `3e0cfdb`（`production-v185`）的部署，再往前 bump。

## 2026-11-11 — v186 畫面更清爽（UI/UX 建議 1–6，Bar 看過截圖回「好」；已上線 main，見上）

- **來源**：Bar 2026-11-11 請我給 UI/UX 與視覺建議，回「1-6 都執行並截圖我看再發版」，看過前後對照回「好」。
- **使用上**：
  1. **今天卡**：時間與站名已是大標題，拿掉下方重複的「這一站 12:00 站名」那一行。
  2. **購物頁**：商場備註超過 4 行時預設只露出開頭，按「看全部（N 行）」展開、「收合」收回；展開狀態在本次使用中保留。
  3. **行程頁**：「顯示全部／隱藏已完成」整列兩格切換改成右上的小開關「隱藏已完成」（仍是 aria-pressed 按鈕，class 保留 `trip-filter-btn` 供焦點還原）；舊 segmented 樣式移除。
  4. **主要按鈕**：每個畫面只留一顆實心主色按鈕。今天卡只有「導航」實心，「完成」改淡綠底綠框、「看今日完整細節」改外框；分帳空白時的「記一筆消費」改外框（右下「＋」做同一件事）。
  5. **天氣沒資料**：「暫無天氣資料」與「重試」排成同一行小字，重試是可點的文字（仍叫「重試天氣」）。
  6. **線條圖示** ⭐：行程卡、今天卡、購物頁與資訊面板由 App 產生的 Emoji（導航、停車、資訊、景點、美食、住宿、樓層、營業、官網、交通等）改成 inline SVG 線條圖示（`LINE_ICON_PATHS`／`lineIcon()`／`iconLabelHtml()`，沿用 `.app-icon`）。標籤字串照舊以「Emoji 空白 文字」傳遞，只在輸出時換成圖示；SVG `aria-hidden`。Sheet 內容自帶的 Emoji 與分帳類別 Emoji 不變。`08_AI_HANDOVER.md` 與 manifest 的圖示規則同步更新（原「內容 Emoji 保留」由 Bar 這次核准改寫）。
- **整理**：依「只留最近 3 份」刪除 `shell/v183`，留 v184–v186；發布說明保留最近 5 版（v182–v186）。

## 2026-11-11 — #38 記帳表單次要底色維持固定（Bar 決定，無程式變更）

- 依 Bar 2026-09-12「待實機看過再決定」，以 v185 做了焙茶／象牙／海洋三組對照：左邊是現在固定的 `#f3f8f6`，右邊是跟主題走（主色 6% 混白）。
- Bar 看過回「保留」：`--entry-secondary-bg`／`--entry-secondary-border` 維持固定值，`tests/theme-system.test.js` 的斷言不變。#38 自 backlog 移除。

## 2026-11-11 — #25 文件改為引用 ai-native-framework v1.0.0(文件，無 App 版本變更)⭐

- **來源**：Bar 指示執行 #25，選擇私人 repo，App 的通用文件改成「參見框架」只留差異。
- **框架 v1.0.0 內容**：README、VERSION、CONSTITUTION、WORKFLOW、EXECUTION_RULES、FILE_TIERS、CONVENTIONS、VALIDATOR_SPEC、HEALTH_CHECK、adr/TEMPLATE＋README、ai-manifest.schema.json、examples/japan-travel-app.md、CHANGELOG。已移除所有旅遊字眼；本專案 manifest 已用 JSON Schema 驗證通過。
- **App 端**：
  - `.ai-manifest.json` 的 `framework` 改為 `ai-native-framework@1.0.0`，並加 `framework_source`。
  - 以下文件改成「依框架 §x」，只留本專案差異（節號保留，舊引用不失效）：`PROJECT_CONSTITUTION.md`、`15_AI_EXECUTION_RULES.md`、`12_DEV_WORKFLOW.md`（情境 A–F 保留）、`14_FILE_TIERS_AND_GATE.md`（實際檔案清單保留）。
  - `11`／`05` 加框架引用；`08` 的理解報告模板改引用框架，閱讀順序加入框架。
- **框架 repo**：Bar 建立私人 repo `nick80912-dev/ai-native-framework`；首版 commit 後加上 `release-tag` workflow（工作環境推不了 tag），由它建立 `v1.0.0` → `0ffb62a`，`git ls-remote --tags` 核對相符。
- **#25 完成**，自 backlog 移除。
- **限制**：框架是私人 repo，之後的工作階段要同時選取它，AI 才讀得到通用規則（已寫在憲章與 manifest）。

## 2026-11-11 — v185 已上線 main，tag `production-v185`（待 Bar 手機審查）

- Bar 看過五張截圖後回「好」。
- PR [#152](https://github.com/nick80912-dev/ai-native-projects/pull/152) 在 head `e566e1a` 的 sanity／browser-qa 全綠後合併進 `dev`（`a0f3547`）。中間工作階段重啟，CI 綠燈後停了一段時間才繼續。
- 本機完整 Chromium：第一輪 6 項失敗（5 項是設定頁路徑改成「疑難排解」後的舊測試，1 項是已知只在本機失敗的 `personal-ledger-export`），更新後 456 passed，只剩已知那一項。
- PR [#153](https://github.com/nick80912-dev/ai-native-projects/pull/153) 合併 `dev` → `main`，merge commit **`3e0cfdb`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v185'`。
  - 全新 Chromium：`APP_VERSION` 為 v185、只剩 `okayama-trip-v185` 快取，發布說明是「表單與設定更精簡」。
  - 代購小勾選、疑難排解頁、今天頁通知位置、結束後瀏覽的程式都在線上；沒有 pageerror。
  - 前兩代 `shell/v184/`、`shell/v183/` 回 200，已刪的 `shell/v182/` 回 404。
- **tag**：production-tags workflow 建立 `production-v185` → `3e0cfdb`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `469cf8a`（`production-v184`）的部署，再往前 bump。

## 2026-11-10 — v185 表單與設定更精簡（UI/UX 建議第 4–7 項；已上線 main，見上）

- **來源**：Bar 2026-11-10 請我接著做先前 UI/UX 建議剩下的四項，並順手整理專案；看過畫面後回「好」。
- **使用上**：
  - **代購**：單品項表單中間那一大塊粉紅色「這筆是代購」開關拿掉，改成金額標題列的小勾選「代購」（在「可退稅」左邊）；勾了才出現「幫誰買」。多品項每項自己的代購勾選不變。
  - **設定**：資料健康狀態、照片健康狀態、旅途紀錄、診斷面板收進「疑難排解」一頁；根頁「資料」只剩疑難排解、過往旅程、資料與版本。資料有狀況或有旅途紀錄待評估時，「疑難排解」那一列直接寫出來。三個子頁的「返回」回到疑難排解。
  - **通知**：今天頁（沒開任何面板時）通知出現在頂欄下方，不再蓋住底部的「完成／跳過」；其他頁與面板維持在底部。
  - **行程頁**：旅程結束後單純瀏覽——沒有打卡方塊、已完成的站不變灰劃線、右上只寫「共 N 站」、沒有「隱藏已完成」。打卡紀錄不動，封存與備份照舊。
- **整理**：移除舊代購開關的七條樣式（約 1.1 KB）；依「只留最近 3 份」刪除 `shell/v182`，留 v183–v185。重新掃過沒有呼叫者的函式：剩下的都由單元測試直接引用（純計算 helper）或是具名的事件處理函式，沒有可以安全刪的。
- **做法**：`renderLedgerSingleProxyToggle()`；`renderSettingsTroubleshootPage()`、`settingsTroubleshootSummary()`、`SETTINGS_PAGE_IDS` 加 `troubleshoot`；`toastPlacementTop()` 與 `.toast.toast-top`；`tripBrowseOnly()`（`renderItem()`、`renderTrip()`）。資料欄位與個人備份 v11 不變。
- **版本**：forward bump v184→v185；`builtin-snapshot.js` 以 v184 asset 離線重產，除版本外不變。發布說明視窗為 `v185` + `['v184','v183','v182','v181']`（v180 滾出）。`tests/trip-lifecycle-wiring.test.js` 加入已發布 v184 三件組的 hash、移除 v182。
- **測試**：新增 `tests/browser/ux-v185.spec.js`（3 項）。設定頁路徑改變，更新 `data-observability`、`diagnostics-app-log`、`settings-grouped-root`（兩項）、`settings-health-page`、`shopping-photo` 六個瀏覽器測試與 `settings-grouped-root`、`travel-notes`、`ledger-entry-p0`、`ledger-form-223` 四個單元測試。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v184`（`469cf8a`）的部署，再往前 bump。

## 2026-11-10 — v184 已上線 main，tag `production-v184`（待 Bar 手機審查）

- Bar 看過圖示三種配色與首頁三種排法（選 C、B）後回「v184 已確認」。
- PR [#149](https://github.com/nick80912-dev/ai-native-projects/pull/149) 在 head `62b83c5` 的 sanity／browser-qa 全綠後合併進 `dev`（`be98a2e`）。本機完整 Chromium 453 passed，只有已知只在本機失敗的 `personal-ledger-export`。
- PR [#150](https://github.com/nick80912-dev/ai-native-projects/pull/150)（並帶 v183 發布紀錄）合併 `dev` → `main`，merge commit **`469cf8a`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v184'`。
  - 全新 Chromium 開正式站，`APP_VERSION` 為 v184、只剩 `okayama-trip-v184` 快取，發布說明為「行前清單與新圖示」。
  - 頂端是金黃底（`rgb(255, 214, 107)`）紙飛機、沒有桃子圖，行前清單程式在線上；沒有 pageerror。
  - 前兩代 `shell/v183/`、`shell/v182/` 回 200，已刪的 `shell/v181/` 回 404。
  - 岡山已發布的 TripConfig 有 `Checklist GID,2140148232`，「行前確認」分頁可讀。
- **tag**：production-tags workflow 建立 `production-v184` → `469cf8a`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `f036ab8`（`production-v183`）的部署，再往前 bump。

## 2026-11-10 — v184 行前清單；頂端紙飛機取代岡山桃子（已上線 main，見上）

- **來源**：Bar 2026-11-10：「關於桃子徽章Icon 的更動討論」「希望增加行前的待辦事項或是注意事項清單」。
  - 圖示：選「簡單線條圖示」，看過後要求「紙飛機需有顏色且置中」，再選「C 金黃底＋深色飛機」。
  - 清單：選「試算表寫、各自勾」，並「提供 App 也可以自己新增」；看過後嫌首頁上方太長，選「B 進度條」。
  - 同日請我確認試算表：岡山試算表的「行前確認」分頁欄位正確，已在 TripConfig 填 `Checklist GID = 2140148232`，並清掉第 2–4 列只有類型、沒有項目的說明文字。另依 Bar 要求用 Drive 建立副本「TripPilot 下一趟（從岡山複製，待填）」：清空分帳紀錄（只留標題）與支出表金額（保留標題、類別與小計／總計公式），TripConfig 加上空白的 Trip ID、Ledger Endpoint、Weather Regions GID。
- **使用上**：
  - 頂端左上角的岡山桃子換成金黃底（#ffd66b）深色實心紙飛機，置中；點兩下仍開診斷面板，模擬時間的濾鏡照舊。
  - 出發前首頁多一條「行前準備」進度條（例如 1/4 ›），採買清單與查看完整行程在下面同一列；點進度條打開「行前清單」。
  - 清單：待辦（試算表，可勾，期限寫「10/1 前」）、我的待辦（自己新增，可刪）、注意事項（只顯示）。勾選與自己新增的只存在這支手機，依旅程分開，不同步、不進個人備份；清除並打包旅程時一起清掉（`trip_` 開頭）。
  - 出發後不再顯示；沒有分頁時進度條寫「新增 ›」，一樣可以自己加。
- **做法**：
  - TripConfig 新增選填鍵 `Checklist GID`（`schema.js` 與內嵌副本同步，`09_SCHEMA_MAPPING.md` 重產）。
  - `refreshPrepChecklist()` 與天氣地區一樣在同步成功後讀分頁，存 `trip_prep_items`；`parsePrepChecklistCsv()`（類型「注意／提醒」為注意事項，其餘待辦；項目空白或重複略過；最多 60 項）。
  - `trip_prep_state` 存勾選與自己新增（最多 40 項）；`openPrepChecklist()` 沿用 `openLedgerInfoSheet()`。
  - 圖示是 inline SVG（`#diagnosticBadge` 不變）；`okayama-peach-badge.png` 仍在 SW 快取清單，給 root 的 v110 bridge 用。
  - 修正：新樣式一度被放進 390px 媒體查詢裡，較寬的手機會失去樣式，且舊的 `.brand .logo{display:block}` 讓飛機貼在左上角；移到媒體查詢外並提高選擇器權重，430px 截圖與測試確認。
- **版本**：
  - forward bump v183→v184；`builtin-snapshot.js` 以 v183 asset 離線重產，除版本外不變。
  - 依「只留最近 3 份」刪除 `shell/v180`、`shell/v181`，留 v182–v184；hash 表同步。
  - 發布說明視窗為 `v184` + `['v183','v182','v181','v180']`（v179 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v183 三件組的 hash。
- **測試**：新增 `tests/browser/prep-checklist-v184.spec.js`（4 項）；`tests/app-now.test.js` 抓到自己新增待辦的時間沒走 `appNow()`，已改：CSV 解析（注意／待辦、期限、空白與重複略過）；首頁進度條、開清單、勾選、新增與刪除、存在手機；沒有分頁時「新增」、出發後不顯示；頂端紙飛機的底色、尺寸、置中與沒有桃子圖。`tests/pwa-shell.test.js`、`tests/theme-system.test.js`、`tests/schema-types.test.js`、`tests/home-simplification.test.js` 跟著更新。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v183`（`f036ab8`）的部署，再往前 bump。

## 2026-11-10 — v183 已上線 main，tag `production-v183`（待 Bar 手機審查）

- Bar 看過畫面、頂端狀態選字「離線版」後回「okay」。
- PR [#147](https://github.com/nick80912-dev/ai-native-projects/pull/147) 在 head `88cd323` 的 sanity／browser-qa 全綠後合併進 `dev`（`d1b2ce8`）。本機完整 Chromium 第一次有 7 項收據照片測試失敗（那份測試還在直接點已收起的「個人」），補上先點開那一行後 7/7 通過。
- PR [#148](https://github.com/nick80912-dev/ai-native-projects/pull/148)（並帶 v182 發布紀錄 PR #146）合併 `dev` → `main`，merge commit **`f036ab8`**。過程中 GitHub Pages 鏡像（github.io，非正式站）的 `deploy` 卡在 GitHub 端 `syncing_files` 逾時，與程式無關；在 PR 留言說明並重跑一次後通過，七項檢查全綠。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v183'`；全新 Chromium 開正式站 `APP_VERSION` v183、只剩 `okayama-trip-v183` 快取、發布說明「旅程結束回顧與記帳表單更簡潔」；曼谷座標通過天氣地區檢查、下載失敗時頂端為「離線版」、回顧與帳本幣別一行的程式都在線上；沒有 pageerror。前兩代 `shell/v182/`、`shell/v181/` 回 200。
- **tag**：production-tags workflow 建立 `production-v183` → `f036ab8`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `4ed9627`（`production-v182`）的部署，再往前 bump。

## 2026-11-10 — v183 天氣地區不限日本；離線狀態、旅程結束回顧、記帳表單更簡潔（已上線 main，見上）

- **來源**：Bar 2026-11-09 問「現在這個專案適合在其它國家或行程使用了嗎」與 UI/UX 改進建議；查到天氣地區只收日本附近座標，提出 7 項 UI/UX 建議。Bar 選「先修天氣地區，再做第1、2、3項」；看過畫面後頂端狀態嫌「暫時連不上」字多，2026-11-10 選「離線版 · 時間」，其他「okay」。
- **使用上**：
  - **天氣地區**：「天氣地區」分頁的座標改成全球合法範圍（緯度 -90～90、經度 -180～180），泰國、歐美的地區也會顯示天氣。沒填座標的列照樣略過（放寬範圍時曾把空白當成 0,0，已修正並由測試守住）。
  - **頂端狀態**：下載不到最新資料（沒網路）時，紅點「更新失敗」改成黃點「離線版 · 10/1 22:39」，與用離線資料開啟時同一個說法；狀態面板寫「離線版：沒能下載最新資料，沿用手機裡的資料」。資料結構、驗證、儲存真的出錯仍是「更新失敗」。
  - **旅程結束首頁**：改成回顧——「我的總花費」（點開明細）與「退稅：待退 N 張 · 金額」（點開退稅清單；沒有可退稅的單據就不顯示）；還沒結清的提醒與「前往分帳」照舊。「清除並打包旅程」移到卡片最下方的文字按鈕，不再和「查看完整行程」並排。
  - **記帳表單**：新增消費時「帳本」「幣別」收成一行「個人帳本 · JPY ⌄」，點開才出現原本兩排；換帳本時保持展開。沒設定匯率時提醒照樣直接顯示；編輯與更正維持原樣。
- **做法**：`weatherRegionValid()` 範圍、`parseWeatherRegionsCsv()` 空白座標為 NaN；`syncFailureIsDownload()`＋`setSyncState()` 的 `unreachable` 狀態；`endedTripRecapRows()`＋`renderEndedTripHome()`；`renderLedgerEntryContextLine()`／`toggleLedgerEntryContext()`／`renderLedgerEntrySegments()`，`setLedgerDraftTrack()` 保留 `contextOpen`。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v182→v183；`builtin-snapshot.js` 以 v182 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v183` + `['v182','v181','v180','v179']`（v178 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v182 三件組的 hash。
- **測試**：
  - 新增 `tests/browser/ux-v183.spec.js`（4 項）：回顧的總花費與退稅、點退稅打開清單、打包按鈕在最下方；沒有紀錄時只顯示總花費；帳本與幣別一行、點開切換、金額緊接在下；沒匯率時直接提醒、編輯維持原樣。
  - `tests/weather-regions.test.js` 加入夏威夷、曼谷、巴黎與不合法座標；`tests/atomic-sheet-sync.test.js` 下載失敗時頂端為「離線版 · 」；`tests/home-simplification.test.js`、`tests/browser/home-v146.spec.js` 改成新首頁版面。
  - 十個會點「個人／團體」或幣別的瀏覽器測試先點開那一行。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v182`（`4ed9627`）的部署，再往前 bump。

## 2026-11-09 — v182 與專案整理已上線 main，tag `production-v182`（待 Bar 手機審查）

- Bar 看過三處匯率截圖後回「好」。
- PR [#143](https://github.com/nick80912-dev/ai-native-projects/pull/143)（v182）在 head `4ed726f` 的 sanity／browser-qa 全綠後合併進 `dev`（`16e8d07`）。
- PR [#144](https://github.com/nick80912-dev/ai-native-projects/pull/144)（專案整理，Bar 2026-11-09「重新整理我的專案內容與雜項整理」選四項）：
  - 只留最近三代 shell（刪 v154–v179）。
  - backlog 只留還沒做的（#55 依 Bar 關閉）。
  - 2026-10-15 以前的版本紀錄原文搬到 `docs/archive/`。
  - 28 份只剩歷史引用的設計稿搬到 `docs/archive/design/`。
  - 專案定位、路線圖、README 與備份說明更新。
  - 第一次 sanity 失敗：整理時誤把本機 `node_modules` 捷徑（symlink）一起 commit，CI 找不到真正的資料夾。`11d9389` 移除並把 `.gitignore` 改成 `node_modules`（連捷徑一起忽略），重跑全綠後合併（`2b2bf14`）。
- PR [#145](https://github.com/nick80912-dev/ai-native-projects/pull/145) 合併 `dev` → `main`，merge commit **`4ed9627`**；七項檢查全綠。
- **線上核對**：
  - 正式站 `sw.js` 為 `SW_VERSION='v182'`。
  - 全新 Chromium 開正式站，`APP_VERSION` 為 v182、只剩 `okayama-trip-v182` 快取，發布說明為「匯率寫法統一」。
  - 五個刪除的函式已不在線上；沒有 pageerror。
  - 前一代 `shell/v181/` 與 `shell/v180/` 回 200，已刪除的 `shell/v179/`、`shell/v154/` 回 404（符合 ADR 0019 增補）。
- **tag**：production-tags workflow 建立 `production-v182` → `4ed9627`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `96111fd`（`production-v181`）的部署，再往前 bump。

## 2026-11-09 — v182 匯率寫法統一；清掉沒用到的程式（#57 重新稽核；已上線 main，見上）

- **來源**：Bar 2026-11-09「接著做 #57 低優先項目」。#57 的低優先項目只留下編號（B4–B7、T11、T13、T15、T18–T21、L9–L28），出發前稽核報告的內容沒有存進專案；Bar 選「重新稽核再挑」。用 v181 重新走過旅程中與旅程結束後的各頁、按鈕大小、字級與程式，列出五項，Bar 選了其中兩項：
  - **1 匯率寫法統一**：分帳卡片寫「JPY 1 ≈ TWD 0.21」、記帳表單與設定寫「1 JPY = NT$0.21」，統一成「1 JPY ≈ NT$0.21」。
  - **4 清掉沒用的程式**：`navQuery`、`multiItemTaxMultiplier`、`selectRecentLedgerExpenses`、`emptyDayProgress`、`hasDayProgress` 五個函式全專案沒有呼叫者，刪除。
  - 沒選的：小字放大到 11px（#29）、小按鈕放大到 44px（#28、#41）。Bar 同日裁定「這些我認為都不是問題，不列入優化討論」，三項在 backlog 關閉，之後稽核不再列出。
- **版本**：
  - forward bump v181→v182；`builtin-snapshot.js` 以 v181 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v182` + `['v181','v180','v179','v178']`（v177 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v181 三件組的 hash。
- **測試**：`tests/browser/multi-currency-v168.spec.js` 改成新寫法，並加上分帳卡片的匯率字樣。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v181`（`96111fd`）的部署，再往前 bump。

## 2026-11-09 — v181 已上線 main，tag `production-v181`（待 Bar 手機審查）

- Bar 看過兩輪畫面（可退稅移到計算機旁 → 稅額移到明細同一列靠右）後回「okay」。
- PR [#141](https://github.com/nick80912-dev/ai-native-projects/pull/141) 在 head `f5e5162` 的 sanity／browser-qa 全綠後合併進 `dev`（`c4745ca`）。
- PR [#142](https://github.com/nick80912-dev/ai-native-projects/pull/142)（並帶 v180 發布紀錄 PR #140）合併 `dev` → `main`，merge commit **`96111fd`**；七項檢查全綠。
- 本機完整 Chromium 445 passed，只有已知只在本機失敗的 `personal-ledger-export`。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v181'`。全新 Chromium 開正式站，`APP_VERSION` 為 v181、只剩 `okayama-trip-v181` 快取，發布說明為「可退稅移到計算機旁」；可退稅在計算機旁、稅額在明細標題列的程式都在線上；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v181` → `96111fd`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `dc9f7ae`（`production-v180`）的部署，再往前 bump。

## 2026-11-09 — v181 可退稅移到計算機旁，稅額放在明細同一列（已上線 main，見上）

- **來源**：Bar 2026-11-09：「介面部分將可退稅按鈕移至計算機旁」；看過畫面後「稅額欄位縮排至明細那欄靠右對齊，避免表單再變長」。同一天回報岡山 Apps Script 已換成最新版（v176–v177 的收據免稅、稅率與稅額辨識生效）。
- **使用上**：
  - 單品項的「可退稅」放在金額標題列、計算機左邊；勾了一樣跳出 v180 的稅額視窗。
  - 填好後「稅額 ¥X ✎」放在「明細」標題同一列靠右，點一下再改；表單不多一列。
  - 多品項不變（每一項自己的「可退稅」、品項下方的稅額）。
- **做法**：`renderLedgerSingleRefundToggle()` 放進 `renderLedgerSingleItemPrimary()` 的 `.ledger-amount-head-actions`（計算機左邊）；`renderLedgerSingleItemDetail()` 有稅額時改成 `.ledger-detail-head`（明細標題＋稅額）；`renderLedgerSingleRefundRow()` 只回傳稅額按鈕。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v180→v181；`builtin-snapshot.js` 以 v180 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v181` + `['v180','v179','v178','v177']`（v176 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v180 三件組的 hash。
- **測試**：`tests/browser/refund-quick-v180.spec.js` 第一項加上：可退稅緊鄰計算機、稅額在明細標題列且與明細輸入框右緣對齊、在輸入框上方、沒有橫向捲動。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v180`（`dc9f7ae`）的部署，再往前 bump。

## 2026-11-03 — v180 已上線 main，tag `production-v180`（待 Bar 手機審查）

- Bar 看過兩輪畫面（先是稅額欄並排，再改成跳出視窗、拿掉說明）後回「好」；畫面確認後才跑完整測試與自動檢查。
- PR [#138](https://github.com/nick80912-dev/ai-native-projects/pull/138) 在 head `f88971c` 的 sanity／browser-qa 全綠後合併進 `dev`（`b11c42f`）。
- PR [#139](https://github.com/nick80912-dev/ai-native-projects/pull/139)（並帶 v179 發布紀錄 PR #137）合併 `dev` → `main`，merge commit **`dc9f7ae`**；七項檢查全綠。
- 本機完整 Chromium 444 passed，只有已知只在本機失敗的兩項。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v180'`。全新 Chromium 開正式站，`APP_VERSION` 為 v180、只剩 `okayama-trip-v180` 快取，發布說明為「可退稅移到金額下方」。稅額視窗的程式在線上、金額下方有可退稅、視窗沒有收據說明；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v180` → `dc9f7ae`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `6f8658a`（`production-v179`）的部署，再往前 bump。

## 2026-11-03 — v180 可退稅移到金額下方，勾了跳出稅額視窗（已上線 main，見上）

- **來源**：Bar 2026-11-03：
  - 「可退稅按鈕改置上方，避免一些手key的單據漏掉可退稅與輸入稅額」。
  - 看過畫面後：「勾選後改成跳出輸入稅額的視窗供輸入」、「看收據上的⋯⋯那行說明可以拿掉」。
- **使用上**：
  - 單品項：「可退稅」在金額正下方，不用打開「其他資訊」。勾了跳出「可退稅：輸入稅額」視窗，提示是照稅率算的稅額，空白按確定就照稅率估算；按取消就不勾，點視窗外只關視窗。
  - 填好後「可退稅」旁邊顯示「稅額 ¥X ✎」（空白時「稅額 約 ¥X」，跟著金額變），點一下再改。「其他資訊 → 稅」不再重複稅額欄與可退稅。
  - 多品項：勾第一項「可退稅」時跳出同一個視窗，填整張收據的稅額；之後再勾別的品項不再跳出。品項清單下方顯示「可退稅 稅額 ¥X ✎」，「稅（選填）」裡不再重複稅額欄。
  - 沒有開啟可退稅的旅程（Tax Free = no）不顯示。
- **做法**：`renderLedgerSingleRefundRow()`（放進 `renderLedgerSingleItemPrimary()`）、`renderLedgerMultiRefundTax()`、`renderLedgerTaxSummaryButton()`／`ledgerTaxSummaryText()`、`openLedgerTaxDialog()`／`confirmLedgerTaxDialog()`／`cancelLedgerTaxDialog()`／`closeLedgerTaxDialog()`；稅額欄抽成 `renderLedgerTaxAmountField()`，`ledgerTaxAmountOnTop()` 決定放上面還是留在稅區塊。視窗沿用退稅小視窗的樣式與層級（150）。資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v179→v180；`builtin-snapshot.js` 以 v179 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v180` + `['v179','v178','v177','v176']`（v175 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v179 三件組的 hash。
- **測試**：新增 `tests/browser/refund-quick-v180.spec.js`（4 項）：單品項位置、視窗、確定與再改、存檔；取消與點外面、照稅率估算跟著金額、格式錯誤、關表單一起關；多品項只問一次、取消那一項、存檔稅額；沒有可退稅的旅程不顯示。`tests/ledger-calculator.test.js` 一項斷言改成對 `renderLedgerTaxAmountField`。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v179`（`6f8658a`）的部署，再往前 bump。

## 2026-11-03 — v179 已上線 main，tag `production-v179`（待 Bar 手機審查）

- Bar 看過三輪畫面後回「好」。這次照 Bar 2026-11-03 的做法：畫面確認後才跑完整測試與自動檢查。
- PR [#135](https://github.com/nick80912-dev/ai-native-projects/pull/135) 在 head `b603c00` 的 sanity／browser-qa 全綠後合併進 `dev`（`9d6ec5a`）。過程中 `05898ed` 的 sanity 曾因小視窗層級蓋過短通知而失敗，`daf667a` 修好。
- PR [#136](https://github.com/nick80912-dev/ai-native-projects/pull/136)（並帶 v178 發布紀錄 PR #134）合併 `dev` → `main`，merge commit **`6f8658a`**；合併 tree `c4d9865` 與 `9d6ec5a` 相同。
- 本機完整 Chromium 440 passed，只有已知只在本機失敗的兩項。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v179'`。全新 Chromium 開正式站，`APP_VERSION` 為 v179、只剩 `okayama-trip-v179` 快取，發布說明為「退稅清單改成點一下就好」。分頁與「不退」的程式在線上，v178 的記錄退稅畫面已移除；沒有 pageerror。
- **tag**：production-tags workflow 建立 `production-v179` → `6f8658a`，`git ls-remote` 核對相符。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `e894f12`（`production-v178`）的部署，再往前 bump。

## 2026-11-03 — v179 退稅清單改成點一下就好（已上線 main，見上）

- **來源**：Bar 2026-11-03：
  - 「不需做到那麼複雜與精細，我只需要知道該張單據稅額多少，然後整理出一個退稅清單，我到時候要退稅時再確認並勾選退稅單據」；追問後選「扣掉稅額並可以有欄位讓我填寫我實際退了多少」，離境提醒與分帳卡片的「退稅」列保留。
  - 看過畫面再調整：「實際退了的欄位移至稅額下方並排」→ 覺得擁擠、已退越來越長、勾勾一直留著，改選「分頁：待退／已退」→ 不退的單據要有地方放，選「多一個『不退』分頁」→「不需要勾選框，我只都需要點選後再決定是否要退稅與退多少」。
  - 同時裁定：畫面位置與功能確認完才跑自動檢查與完整測試。
- **使用上**：
  - 分帳 → 退稅分成「待退／已退／不退」三個分頁，分頁上寫張數；上方是該分頁的金額（還沒退的稅額、已經退回的金額）。
  - 每張收據一列：店名、品項、稅額、›。點一張跳出小視窗：
    - 待退：「實際退了」先帶入稅額，可以改，按「已退」移到已退並從「我的總花費」扣掉；按「不退」移到不退。
    - 已退：改金額後「儲存」，或「改回待退」。
    - 不退：「移回待退」。
  - 不退的單據不算待退金額與離境提醒，花費不變。本身免稅（結帳時已扣稅）或稅額 0 的單據不會出現在清單。記帳時的「可退稅」照舊決定要不要列進清單。
  - 不再跳出「記錄退稅」畫面，也不用填退到哪裡與日期。
- **做法**：
  - `renderLedgerRefundPendingRow()`／`renderLedgerRefundDoneRow()`／`renderLedgerRefundSkippedRow()`、`setLedgerRefundTab()`、`openLedgerRefundEdit()`（依狀態給不同按鈕）、`saveLedgerRefundEdit()`、`skipLedgerRefund()`、`revertLedgerRefund()`、`refreshLedgerRefundPanel()`（就地重畫）。
  - 移除 v178 的 `openLedgerRefundRecord()`、`saveLedgerRefund()`、`clearLedgerRefund()`、`setLedgerRefundMethod()` 與退款方式選項。
  - 「不退」記成 `refundMethod='不退'`、`refundAmount` 仍是 `null`（v178 的 App 讀到會當待退，資料不會丟）。
  - 小視窗層級 150：在清單（135）之上、短通知（200）之下，不擋「已移到已退」的通知。
  - 資料欄位與個人備份 v11 不變。
- **版本**：
  - forward bump v178→v179；`builtin-snapshot.js` 以 v178 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v179` + `['v178','v177','v176','v175']`（v174 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v178 三件組的 hash。
- **測試**：`tests/browser/refund-tracking-v178.spec.js` 改寫兩項並新增一項（10 項）：
  - 三個分頁與張數、清單沒有勾選框和輸入框；
  - 點一張改實際退了多少、照稅額比例分到品項、總花費扣掉、已退再改金額與改回待退；
  - 不退與移回待退，不退不算離境提醒；
  - 金額不是數字時不存。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 `production-v178`（`e894f12`）的部署，再往前 bump。

## 2026-11-01 — v178 已上線 main，tag `production-v178`（待 Bar 手機審查）

- PR [#132](https://github.com/nick80912-dev/ai-native-projects/pull/132) 在 head `7e8e32d` 的 sanity／browser-qa 全綠後合併進 `dev`（`893e1fb`）。第一次 push `04ceb0e` 的 browser-qa 有 4 項舊斷言（優惠券欄、「免稅品」、舊標題）沒改到而失敗，`7e8e32d` 改好後全綠。
- PR [#133](https://github.com/nick80912-dev/ai-native-projects/pull/133)（並帶 PR #131 的 tag 紀錄與清理）合併 `dev` → `main`，merge commit **`e894f12`**；合併 tree `eb4c0c2` 與 `893e1fb` 相同。
- 本機完整 Chromium 跑在同一份 App：434 passed，失敗的 4 項舊斷言改好後重跑 17 passed；其餘 2 項是已知只在本機失敗的。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v178'`。全新 Chromium 開正式站，`APP_VERSION` 為 v178、只剩 `okayama-trip-v178` 快取，發布說明為「退稅追蹤」；退稅清單、稅額欄的程式都在線上，`PERSONAL_STATE_VERSION` 為 11；沒有 pageerror。
- **tag**：以 production-tags workflow 建立 `production-v178` → `e894f12`，`git ls-remote` 核對相符。
- 不用換 Apps Script（v178 沒改）。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `20c4fe2`（`production-v177`）的部署，再往前 bump。

## 2026-11-01 — v178 退稅追蹤；「稅與優惠券」改成「稅」（已上線 main，見上）

- **來源**：backlog #63。Bar 2026-10-31～11-01 的決定：
  - 日本 2026/11/1 起免稅店先收稅、出境後才退，退稅要能追蹤；兩版都做，實際退回的錢抵掉花費，先只做個人帳。
  - 「拿掉優惠券，換成稅額」；「辨識到有優惠券等方式產生折扣金額時，再協助填入備注紀錄」。
  - 看過畫面草稿後的調整：說明句子改成「!」；「全部可退稅」按鈕不需要；「已收到」移到右邊；離境提醒不要另外一張卡片；不另建退稅表單。
- **記帳表單**：
  - 「稅與優惠券」改成「稅」，優惠券那一格換成「稅額」：收據有印就自動帶入（標「收據」），沒有收據時欄位提示照稅率算好的數字，可以自己改。
  - 選「税抜」時實付＝品項加總＋稅額（8%＋10% 混在一起只要一個數字），多品項的稅額照金額比例分到各品項。單品項的金額就是實付，稅額照稅率從金額算。
  - 說明收進稅額旁的「!」。
  - 「免稅品」改叫「可退稅」。新制下可退稅的品項一樣付了稅，計算時不再跳過；舊帳編輯時一律以税込載入，不受影響。單品項也有「可退稅」勾選。「全部免稅品」按鈕拿掉。
  - 舊帳記過的優惠券只顯示「優惠券 ¥X（舊資料，維持不變）」，金額照舊扣。這趟沒有稅、也沒有舊優惠券時整個區塊不顯示。
- **收據辨識**：
  - 稅額填進稅額欄（自己改過就不動）。
  - 可退稅的收據自動勾「可退稅」。
  - 收據上的優惠券等折扣寫進備註「收據折扣 ¥X（優惠券等）」；多品項照金額比例從各品項扣掉，原價列在結果視窗。
  - 有稅額時兩種稅率也能直接設「未稅」，不再要求自己選。
  - 「復原」也改回稅額與「可退稅」。
- **退稅追蹤**（只算個人帳）：
  - 分帳 → 個人卡片多一列「退稅 · 待退 N 張 ¥X 〉」。
  - 退稅清單分待退／已退，一張收據一列，「已收到」在右邊。按下去記實際退了多少（先帶預計）、退到哪裡（信用卡／App／現金／其他）與日期；已退的可以修改或改回待退。
  - 實際收到的退稅從「我的總花費」與整趟旅程扣掉（照比例換算台幣）；還在等的不扣。
  - 旅程最後一天，TODAY 卡片下方一行「今天離境：N 張收據待退稅（預計 ¥X）→」。
  - 帳的明細多「可退稅」「稅額」「實際退稅」。
- **資料**：
  - 個人帳每筆多 `taxAmount`、`refundAmount`（當地幣最小單位）、`refundMethod`、`refundDate`，只存在手機。
  - **個人備份格式升為 v11**：舊 App 會丟掉這幾欄，所以讓舊 App 明確拒絕。
  - 團體帳不送稅額，試算表與 Apps Script 都不用改。
- **版本**：
  - forward bump v177→v178；`builtin-snapshot.js` 以 v177 asset 離線重產，除版本外不變。
  - 發布說明視窗為 `v178` + `['v177','v176','v175','v174']`（v173 滾出）。
  - `tests/trip-lifecycle-wiring.test.js` 加入已發布 v177 三件組的 hash。
- **測試**：
  - 新增 `tests/browser/refund-tracking-v178.spec.js`（9 項）。
  - 改寫的舊斷言：`receipt-recognition-v171`（稅額、折扣進備註並分攤、可退稅自動勾）、`trip-tax-v169`（「稅」、可退稅、沒有稅時不顯示區塊）、`ledger-multi-item`（可退稅品項也加稅、不再放大一萬倍所以 ¥12,345,678 算得出來）、`ledger-calculator`、`ledger-quick-entry`、`ledger-ui-polish`、`ledger-225`；瀏覽器的 `data-observability`、`ledger-calculator`（拿掉折扣計算機那段）、`ledger-entry-quick-layout`、`ledger-money-integrity`；以及備份版本相關的 `personal-state-restore-matrix`（v11）、`settings-backup-ux`、`shopping-ledger-links`。
- **回滾**：合併前關閉 PR；發布後依 `16_OPS_PLAYBOOK.md` §A1 退回 v177 的 Netlify 部署（`commit_ref` `20c4fe2`，tag `production-v177`），再往前 bump。注意：v178 匯出的 v11 備份在 v177 無法還原。

## 2026-11-01 — v157–v177 補上正式 tag；整理待辦（不升版）

- **來源**：Bar 2026-11-01：「幫我將Github該做的tag完成並刪除多餘的事項」。
- **tag**：PR [#129](https://github.com/nick80912-dev/ai-native-projects/pull/129)（dev `3ea9ab8`）→ PR [#130](https://github.com/nick80912-dev/ai-native-projects/pull/130)（main `8ae2138`，App 仍是 v177）讓 production-tags workflow 進到 main 後觸發：
  - 第一次建好 `production-v157`～`v163`，到 v164 被 GitHub 拒絕（`GITHUB_TOKEN` 沒有 workflows 權限，而 v164–v176 的 `qa.yml` 不在任何現有分支或 tag 的最新 commit 上）；workflow 中途停下，沒有建錯的 tag。
  - 第二次只建 `production-v177`（`qa.yml` 與 main 相同）並刪除已合併進 main 的舊分支 `claude/pretrip-v149-ui`，成功。
  - 把 AI 工作分支（只含已合併內容）暫時指到 `24b5ff3`，第三次建好 `production-v164`～`v176`，再把工作分支改回 `dev`。
  - 以 `git ls-remote` 逐一核對：21 個 tag 都指向該版發布時的 main merge commit，每個 commit 的 `sw.js` 版本都相符。
- **刪除多餘的事項**：`tasks/current.md` 移除已過期的手機審查清單（v157–v177）、「建立 tag」待辦、旅途中（10/18–10/23）注意事項與已完成的回程後清單，原文移到 `tasks/done.md` 檔尾封存；只留「換岡山 Apps Script」「確認 v178 畫面」與接下來的 v178。`16_OPS_PLAYBOOK.md` §A5 錨點改為 `production-v177`，並記下 workflow 的已知限制與做法。GitHub 上已無多餘分支（只剩 `main`、`dev`、AI 工作分支）。
- App 與 SW 不變（仍是 v177）。

## 2026-11-01 — 正式版 tag 改由 GitHub Actions 建立（不升版）

- **來源**：Bar 2026-11-01：「幫我將Github該做的tag完成並刪除多餘的事項」。AI 工作環境推 tag 會被擋（`remote end hung up`），Bar 在網頁上逐一建 21 個 tag 太費工。
- **做法**：新增 `.github/workflows/production-tags.yml`（只能手動觸發）。輸入 `vNNN=commit` 清單與要刪的舊分支；先逐筆檢查 commit 在 main 上、該 commit 的 `sw.js` 版本相符、同名 tag 不覆寫、分支已完全合併且不是 main／dev，任何一筆不符就整批不動。`16_OPS_PLAYBOOK.md` §A5 補上用法。
- **驗證**：本機以 21 筆真實清單跑檢查步驟（v156 已存在而略過，v157–v177 列入待建立）；負向測試：版本與 commit 不符、要刪 dev、commit 不在 main 上都會被擋下。
- App 與 SW 不變（仍是 v177）。

## 2026-11-01 — v177 已上線 main（待 Bar 手機審查與 tag）

- PR [#125](https://github.com/nick80912-dev/ai-native-projects/pull/125) 在 head `3761396` 的 sanity／browser-qa 全綠後合併進 `dev`（`70ef7e1`）。release PR [#126](https://github.com/nick80912-dev/ai-native-projects/pull/126) 第一次檢查時，`dev` push 那次的 browser-qa 在 15 分鐘時限到時才跑到第 319／432 項（已跑的全過）被取消；同 commit 的 PR 那次 10.4 分鐘全綠。PR [#127](https://github.com/nick80912-dev/ai-native-projects/pull/127) 把 browser-qa 時限放寬為 25 分鐘（合併為 `c89d711`），#126 在 `c89d711` 重跑 7 項檢查全綠（其中一次 browser-qa 用了 13 分鐘）後合併 `dev` → `main`，merge commit **`20c4fe2`**；合併 tree `7c2cd5f` 與 `c89d711` 相同。本機完整 Chromium 430 passed，只有已知只在本機失敗的兩項，沒有略過的測試。
- **線上核對**：正式站 `sw.js` 為 `SW_VERSION='v177'`；全新 Chromium 開正式站，`APP_VERSION` 為 v177、只剩 `okayama-trip-v177` 快取，發布說明為「收據也讀出稅額」；`normalizeRecognition` 讀得出 `taxAmount`、列稅額的程式在線上；沒有 pageerror。
- **岡山 Apps Script 尚待 Bar 換新版**（v176、v177 換一次即可）。
- 回滾：依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `24b5ff3`（v176）的部署，再往前 bump。

## 更早的紀錄

- 2026-10-16(v157)到 2026-10-31(v177)的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-10-16_to_2026-10-31.md`](docs/archive/07_CHANGELOG-2026-10-16_to_2026-10-31.md)(2026-11-12)。
- 2026-07-03（基礎版）到 2026-10-15（v156 正式發布）的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md`](docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md)（Bar 2026-11-09 選「版本紀錄瘦身」），內容未改。
