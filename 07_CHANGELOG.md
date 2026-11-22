# 07 版本紀錄

## 2026-11-22 — v208 今天與行程頁看得出「現在」

- **來源**:Bar 2026-11-22 問今天頁與行程頁的建議。看了清單模式(預設)的實際畫面後,Bar 說旅途中其實沒在按「完成」;改成依時鐘顯示,Bar 選 1–5、R2、R3,L4(把 ≡ 收進「調整順序」)不做,另要求「下一站」標籤放站名右邊、行程頁地圖圖示再小一點。
- **1**:清單模式拿掉「完成」鈕;完成／跳過只留在卡片模式(`toggleTodayListDone`、`refocusTodayListDone` 與對應樣式刪除)。卡片模式打過的完成紀錄,清單模式仍會變淡顯示。
- **2**:今天頁上方小卡由「完成 x/14」改成「下一站 時間 站名」(沒有下一站時顯示「共 N 站」)。
- **3**:新增 `clockStopState`:依實際順序(含今天頁拖拉)找第一個開始時間還沒到的站當下一站,「現在 HH:MM」線畫在它前面;它前一站是正在進行(不變淡),更前面的變淡;沒寫時間的站沿用前一站的時間。不寫任何完成紀錄、不自動略過(v192 規則不變)。「現在」線每 30 秒檢查、分鐘變了才重畫(頁面看得見、清單模式、沒在拖拉時)。
- **4**:下一站多一行交通時間(`tripStopDrive`)與地圖鈕;拖拉過順序時只留地圖(試算表的交通時間可能是別段路)。
- **5**:行程頁(清單模式的今天)同樣畫「現在」線與「下一站」,照今天頁拖拉後的順序,並顯示「已依今天頁調整順序(只在這支手機)· 恢復原順序」;從別的分頁點「行程」直接捲到「現在」線(新導航意圖 `trip-clock-now`,不加定位外框)。拖拉後若下一列比這站早,不畫「～結束時間」。
- **R2**:行程頁日期標題只留「共 N 站」(上排日期鈕已有第幾天與日期;`aria-label` 保留)。
- **R3**:地圖改成 34px 圓形圖示鈕(讀屏仍唸「在地圖上看」);拿掉 ▾,原本的展開鈕鋪滿卡片頭,點整張卡片頭就展開。
- **測試**:瀏覽器 `today-list-v192` 改寫並新增依時鐘、拖拉後的下一站、行程頁捲到現在與 R2/R3;`view-context` 改為確認清單沒有「完成」、站名可用鍵盤打開;`trip-progress-persistence` 拿掉清單「完成」鍵的鍵盤失敗測試(功能移除,卡片模式的寫入失敗仍由 rollback 測試涵蓋)。
- **整理**:刪除 `shell/v205`,留 v206–v208;發布說明保留 v204–v208。

## 2026-11-21 — v207 已上線 main，tag `production-v207`

- PR [#216](https://github.com/nick80912-dev/ai-native-projects/pull/216) 全綠後合併進 `dev`(`3da61df`);PR [#217](https://github.com/nick80912-dev/ai-native-projects/pull/217) 五項檢查全綠(dev push 不再跑 CI 後的第一次),以 merge commit 合併進 `main`(`c8198a9`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v207'`;全新 Chromium `APP_VERSION` v207、只剩 `okayama-trip-v207` 快取、發布說明「專案整理」、`diagnosticGraceEndLabel` 已不存在、主題 6 個、備份格式 11、無 pageerror;線上 `shell/v207/index.html` 與 `origin/main` 位元組相同;v205／v206 仍 200,v204 為 404。
- **tag**:production-tags workflow 建立 `production-v207` → `c8198a9`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `aa2362c`(`production-v206`)的部署,再往前 bump。

## 2026-11-21 — v207 專案整理

- **來源**:Bar 2026-11-21 要求檢查專案可優化的地方,我列 6 項,Bar「1、2、3、4、6 都做」(第 5 項 Apps Script 端點加密碼不做)。
- **1 升版工具進 repo**:新增 `tools/bump-version.js`(`--check` 只檢查;不加參數就 vN→vN+1:複製 shell、改路徑、推保留範圍、更新雜湊與發布說明視窗、刪最舊一代、換 BUILTIN 標記),與單元測試 `tests/bump-version.test.js`;`16_OPS_PLAYBOOK.md` 加「升一版」段。v207 就是用它升的。順帶發現舊的手動腳本從 v203 起漏改保留範圍文字(文件停在 v200),已改正:`tasks/current.md`「目前 v205 起」、ADR 0019「目前為 v205–v207」。
- **2 CI 不重複跑**:`qa.yml` 拿掉 dev push 觸發,只留 PR 與 main push;同一份程式在 PR 上已經跑過。發布 PR(dev→main)的檢查從 7 項變 5 項。
- **3 岡山舊程式(安全的部分)**:診斷面板拿掉已過期的「岡山保護期」列(`diagnosticGraceEndLabel` 與篩選);開機的 legacy-grace 分支與 `TripSource.LEGACY_GRACE_UNTIL` 保留,因 Bar 的手機仍連著岡山、v205/v206 shell 仍在用。內建行程等岡山專用程式等所有手機換到仙台後再拿。
- **4 CSS 整理**:刪除 24 條被後面同選擇器、同條件的相同屬性覆蓋掉的宣告;6 個主題 × 20 個畫面共 120 張截圖前後逐像素比對 0 差異。
- **6 文件精簡**:`07_CHANGELOG.md` 2026-11-01～11-14 的 31 筆原文移到 `docs/archive/07_CHANGELOG-2026-11-01_to_2026-11-14.md`;`tasks/current.md` 改寫成條列並更新到 v206 上線。
- **測試**:瀏覽器 `diagnostics-app-log` 改為確認保護期列不存在;新增單元 `bump-version`。
- **整理**:刪除 `shell/v204`,留 v205–v207;發布說明保留 v203–v207。

## 2026-11-20 — v206 已上線 main，tag `production-v206`

- PR [#214](https://github.com/nick80912-dev/ai-native-projects/pull/214) 全綠後合併進 `dev`(`da7ba86`);PR [#215](https://github.com/nick80912-dev/ai-native-projects/pull/215) 七項檢查全綠,以 merge commit 合併進 `main`(`aa2362c`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v206'`;全新 Chromium `APP_VERSION` v206、發布說明「分帳列表更精簡」、無 pageerror;線上 `shell/v206/index.html` 與 `origin/main` 位元組相同;v204／v205 仍 200,v203 為 404。
- **tag**:production-tags workflow 建立 `production-v206` → `aa2362c`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `67af8e0`(`production-v205`)的部署,再往前 bump。

## 2026-11-20 — v206 分帳列表更精簡

- **來源**:Bar 2026-11-20 傳手機截圖,團體帳列表一筆的第二行擠了分類、「哈囉祺付款・4 人分攤」「PN 代記」「已鎖帳」,分類被擠成「··」,「已鎖帳」壓到台幣金額。我提 4 項,Bar「1-3 都做,4 收進明細」;看圖後要求分類名稱保留。
- **1**:列表不再標「已鎖帳」(全團結清後每筆都鎖帳);點開明細仍有鎖帳說明與「查看不可改寫歷史」。
- **2**:分類名稱保留,但改放在店名前面(`🍜 餐飲 · 店名`),窄螢幕省略的是店名。
- **3**:付款標籤縮短:「X付款 · N 人分攤」→「X付 · N 人」、「我付款 · 全員分攤」→「我付 · 全員」;多品項「X付款 · 分攤依品項」→「X付 · 依品項」。
- **4**:「X 代記」從列表移到點開後的明細(新列「代記:X 幫忙記的」),明細的備註同時拿掉〔X 代記〕標記避免重複。
- **測試**:單元 `ledger-dashboard`、`ledger-225`、`ledger-list-actions`;瀏覽器 `data-observability`、`proxy-recording-v157`。
- **整理**:刪除 `shell/v203`,留 v204–v206;發布說明保留 v202–v206。

## 2026-11-19 — v205 已上線 main，tag `production-v205`

- PR [#212](https://github.com/nick80912-dev/ai-native-projects/pull/212) 全綠後合併進 `dev`(`3faf4cd`);PR [#213](https://github.com/nick80912-dev/ai-native-projects/pull/213) 七項檢查全綠,以 merge commit 合併進 `main`(`67af8e0`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v205'`;全新 Chromium `APP_VERSION` v205、只剩 `okayama-trip-v205` 快取、發布說明「連接新旅程更順」、`TripSource.inviteLink` 與邀請頁存在、`SCRIPT_VERSION_REQUIRED` 為 `2026-11-19`、無 pageerror;線上 `shell/v205/index.html` 與根目錄 `trip-source.js` 皆與 `origin/main` 位元組相同;v203／v204 仍 200,v202 為 404。
- **Apps Script**:Bar 2026-11-19 已在「仙台行」試算表貼上新版並部署;`?action=info` 回 `scriptVersion:'2026-11-19'`、`receiptRecognition:true`、`ledgerHeaderOk:true`。該表 TripConfig 的 Trip ID 尚空、Trip Name／日期仍是岡山,待 Bar 填。
- **tag**:production-tags workflow 建立 `production-v205` → `67af8e0`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `a4ad8fd`(`production-v204`)的部署,再往前 bump。

## 2026-11-19 — v205 連接新旅程更順

- **來源**:Bar 2026-11-19 問連接新旅程的優化建議,我列 9 項;第 8 項(整理下一趟試算表)Bar 已自己完成,其餘選 1、2、3、5、6、7。看過截圖後 QR code 選「先不做」(下載來的第三方 QR 程式在工作環境裡不允許執行;邀請連結＋手機分享已夠用),第 7 項的 Apps Script 由 Bar 自己貼上部署。
- **1 邀請旅伴**:設定「資料」新增「邀請旅伴」(`TripSource.inviteLink`,`/?join=<發布 ID>`),可分享(手機的分享選單,例如 LINE)或複製。旅伴點開:開機讀 `?join=` → 存 `tp_join_pending`(7 天,清除旅程時保留)→ 清掉網址參數 → 打開「連接新旅程」;已清除的手機直接帶入並自動檢查。貼上邀請連結本身也接受。
- **2 清除後直接連接**:還在上一趟時連接頁有「前往清除並打包」;清除完成直接打開連接頁。
- **3 上一趟的名字**:`tp_last_member`(清除旅程時保留)。新旅程還沒選身分時,名字在名單上就直接問「這趟也是嗎?」,不在就預填新增欄。
- **4 預覽**:多列當地幣別、匯率、結算幣別,以及天氣地區／行前清單／航班有沒有。
- **5 選填分頁依名稱找**:讀 Google 的 `pubhtml?headers=false` 分頁清單(`TripSource.parseSheetTabs`),「天氣地區」「行前清單／行前確認」「航班」在 TripConfig GID 沒填時自動使用;快取 `trip_sheet_tabs`(6 小時)。已確認正式 Google 回應帶 CORS 且讀得到岡山表的分頁清單。
- **6 一次列出全部問題**:`inspect` 收集所有 TripConfig 與 Apps Script 錯誤(第一個錯的 code 照舊),畫面列出「試算表有 N 個地方要修」;匯率未填、Apps Script 舊版、收據辨識未設定列為提醒,不擋連接。
- **7 Apps Script**:`ledger-sync.gs` 加 `SCRIPT_VERSION='2026-11-19'`,`?action=info` 另回 `scriptVersion` 與 `receiptRecognition`(只回有沒有 `GEMINI_API_KEY`,不回金鑰);App 版本較舊或沒回報時提醒更新。
- **測試**:單元 `trip-source`(多問題、版本與金鑰提醒、分頁清單、邀請連結)、`apps-script-settings`、`weather-regions`;新增瀏覽器 `connect-trip-v205`(邀請連結自動檢查、還在旅程中、一次列出問題)。
- **整理**:刪除 `shell/v202`,留 v203–v205;發布說明保留 v201–v205。

## 2026-11-19 — v204 已上線 main，tag `production-v204`

- PR [#210](https://github.com/nick80912-dev/ai-native-projects/pull/210) 全綠後合併進 `dev`(`e03013d`);PR [#211](https://github.com/nick80912-dev/ai-native-projects/pull/211) 七項檢查全綠,以 merge commit 合併進 `main`(`a4ad8fd`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v204'`;全新 Chromium `APP_VERSION` v204、只剩 `okayama-trip-v204` 快取、發布說明「配色與按鈕整理」、主題 6 個且 `normalizeThemeId('mist')==='ocean'`、無 pageerror;線上 `shell/v204/index.html` 與 `origin/main` 位元組相同;v202／v203 仍 200,v201 為 404。
- **tag**:production-tags workflow 建立 `production-v204` → `a4ad8fd`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `5900e84`(`production-v203`)的部署,再往前 bump。

## 2026-11-19 — v204 配色與按鈕整理

- **來源**:Bar 2026-11-19 要主題配色與按鈕樣式的優化建議,我列 9 項並附 7 主題 × 6 畫面對照,Bar 選 1、2、3、5、6、7、8 並把 4 改成「合併成一個」;看過對照圖後第 5 項(小字放大到 12px)不要,其他確認。
- **1 開關**:設定頁開關關閉時一律淺色(原本繪本主題的線條色是深墨,關閉看起來像打開);繪本關閉白底、打開若竹綠。
- **2 主要按鈕同一色**:`--action-cta-bg` 改用 `--t-action`,儲存、分帳的＋與導航都是主題主色;橘色等強調色只留給時間標籤與提醒。
- **3 完成**:卡片模式的「完成」由固定的 `--green` 改成主題主色 `--sea`。
- **4 主題合併**:霧藍併入海洋,主題剩 6 個。`THEME_MERGED={mist:'ocean'}`:舊手機存的 mist 開啟時直接換成 ocean 並存回去,不記成未知主題。
- **6 中文標籤**:「TODAY · DAY 3」→「今天 · 第 3 天」、「NEXT STOP」→「下一站」、行程頁「Day 1」→「第 1 天」;購物分組、下拉選單、過往旅程與明日預覽的天數一起改,字距由 .14em 收成 .04em。
- **7 次要按鈕**:「儲存並再記一筆」(記帳與採買)改成框線按鈕。
- **8 繪本細框**:外層卡片保留粗框,卡片內的按鈕、輸入框改 1.5px,設定列的按鈕拿掉陰影。
- **測試**:`theme-system`、`help-note-style`(6 個主題)、`home-simplification`、`render-note`、`shopping-list` 跟著新文字與顏色改;霧藍合併有單元測試。
- **整理**:刪除 `shell/v201`,留 v202–v204;發布說明保留 v200–v204。

## 2026-11-19 — v203 已上線 main，tag `production-v203`

- PR [#208](https://github.com/nick80912-dev/ai-native-projects/pull/208) 在 head `c2eb789` 全綠後合併進 `dev`(`36f484a`);途中 CI 的 Chromium 159 讓 `today-live-info` 讀到 `flow-end`(等同 flex-end),測試改成兩者都接受並保留右緣對齊檢查;`view-context` 也改成等兩個畫格再讀位置。PR [#209](https://github.com/nick80912-dev/ai-native-projects/pull/209) 七項檢查全綠,以 merge commit 合併進 `main`(`5900e84`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v203'`;全新 Chromium `APP_VERSION` v203、只剩 `okayama-trip-v203` 快取、發布說明「診斷面板修正與健檢」、無 pageerror;線上 `shell/v203/index.html` 與 `origin/main` 位元組相同;v201／v202 仍 200,v200 為 404;回應標頭已有 `x-content-type-options: nosniff`、`referrer-policy`、`x-frame-options: DENY`、`frame-ancestors 'none'`。
- **tag**:production-tags workflow 建立 `production-v203` → `5900e84`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `0a76c46`(`production-v202`)的部署,再往前 bump。

## 2026-11-19 — v203 診斷面板修正與健檢

- **來源**:Bar 2026-11-19「點開診斷面板後滑動畫面,後方頁面會跟著滑動」。
- **原因**:診斷面板是蓋在頁面上的固定層,在暗底上滑、或面板內捲到底後,捲動會傳到後面的整頁。
- **修正**:打開時在 `html`／`body` 加 `diag-open`(`overflow:hidden`),關閉時移除;暗底 `touch-action:none`、`overscroll-behavior:contain`,面板內容 `touch-action:pan-y` 照常捲動。關閉後後面頁面維持原位置、可再捲動。
- **測試**:新增瀏覽器 `diagnostics-scroll-lock`(修正前 scrollY 200 → 689,修正後不變)。
- **健檢(Bar「A-F 都做」)**:
  - **A** CI 的 Node 20(2026-04 停止維護)→ 22。
  - **B** `@playwright/test` 1.62.0 → 1.65.1(Chromium 159)。本機較新 Chromium 才會失敗的 7 項都是測試寫法問題,已修:`view-context` 捲動前先等畫格(switchView 在下一個畫格才還原位置);`sw-update-cache` 改用 context 層 route 攔 SW 主程式;`trip-connect` 重新載入後等 App 起來再讀;`personal-ledger-export` 的檔名是本機缺 UTF-8 語系造成(Chromium 遇到非 ASCII 檔名改成 download),App 與手機不受影響。
  - **C** `netlify.toml` 全站加 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`X-Frame-Options: DENY`、`frame-ancestors 'none'`(`pwa-shell` 測試守著)。
  - **D** 刪除 23 個 App 已不呼叫的函式(約 7.9 KB),測試改測 App 實際在用的路徑(例如編輯權限改測 `assertCanEditLedgerRecord`、自動略過改用 `setItemCompletion(...,'auto-skip')`)。另有 4 個看似沒用的其實是具名事件監聽器,保留。
  - **E** 行程卡片、下一站按鈕、行前清單與退稅視窗的 ID 放進 `onclick` 前一律 `jsHtmlAttrString`;新增 `tests/inline-handler-escaping.test.js`。
  - **F** 新增 `adr/TEMPLATE.md`;新旅程手冊與設定規格裡兩個指向已刪除檔案的路徑改寫成說明文字。
- **整理**:刪除 `shell/v200`,留 v201–v203;發布說明保留 v199–v203。

## 2026-11-18 — v202 已上線 main，tag `production-v202`

- PR [#206](https://github.com/nick80912-dev/ai-native-projects/pull/206) 在 sanity／browser-qa 全綠後合併進 `dev`(`c31e0db`);PR [#207](https://github.com/nick80912-dev/ai-native-projects/pull/207) 七項檢查全綠,以 merge commit 合併進 `main`(`0a76c46`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v202'`;全新 Chromium `APP_VERSION` v202、只剩 `okayama-trip-v202` 快取、發布說明「設定與過往旅程整理」、`groupDiagnosticLogEntries`／`renderPastTripSummaryLine` 存在、無 pageerror;線上 `shell/v202/index.html` 與 `origin/main` 位元組相同;v200／v201 仍 200,v199 為 404。
- **tag**:production-tags workflow 建立 `production-v202` → `0a76c46`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `a1384fa`(`production-v201`)的部署,再往前 bump。

## 2026-11-18 — v202 設定與過往旅程整理

- **來源**:Bar 2026-11-18 要過往旅程、設定各分頁與診斷面板的優化建議,我列 10 項並附原圖對照,Bar「以上都採納」。
- **過往旅程**:點開一趟後只留左上「‹ 返回」(回旅程清單,`renderPastTripHeader`),拿掉「‹ 全部過往旅程」;大綠卡只在「總覽」,其他分頁縮成一行旅程名稱與日期(`renderPastTripSummaryLine`);總覽圓餅旁不再重複總額,改列「個人／團體分攤／不含代購」;清單說明不顯示帳號 Email。
- **設定**:設定頁的勾選框改成主題色滑動開關(只改外觀,仍是 checkbox);代購對象頁拿掉卡片內重複的標題;旅途紀錄的按鈕改整排,沒有紀錄時只寫「尚無旅途紀錄」;帳務頁「CSV 發布可能延遲 1–5 分鐘」改成「其他手機約幾分鐘內會看到」。
- **資料與照片狀態**:照片張數、手機剩餘空間與最近檢查合成一張卡;照片沒問題時概況不再列「照片附件」;「0 個附件待修復」只在真的有照片找不到時出現(改稱「N 張照片找不到」);團體帳說明改成「記帳都已送到雲端／送出後要等雲端確認才算完成」。
- **資料與版本**:「SW v202」→「目前版本 v202」;最新更新與「看更早的更新」之間只留一條線。
- **診斷面板**:「岡山舊旅程（內建）」→「岡山（App 內建行程）」;岡山保護期結束後畫面不再列(除錯報告仍有);沒有白話翻譯的工程訊息改用白話標題(原文留在「技術細節」),同類訊息合併並標「×N」(`groupDiagnosticLogEntries`)。
- **測試**:單元 `diagnostics-app-log`(新增合併與白話標題)、`settings-grouped-root`、`help-note-style`、`app-version-fallback`、`pwa-shell`、`theme-system`;瀏覽器 `past-trips`、`past-trips-v196`、`diagnostics-app-log`、`settings-health-page`、`settings-grouped-root`、`shopping-photo`、`status-clarity`。
- **整理**:刪除 `shell/v199`,留 v200–v202;發布說明保留 v198–v202。

## 2026-11-18 — v201 已上線 main，tag `production-v201`

- PR [#204](https://github.com/nick80912-dev/ai-native-projects/pull/204) 在 sanity／browser-qa 全綠後合併進 `dev`(`64d3d56`);PR [#205](https://github.com/nick80912-dev/ai-native-projects/pull/205) 七項檢查全綠,以 merge commit 合併進 `main`(`a1384fa`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v201'`;全新 Chromium `APP_VERSION` v201、只剩 `okayama-trip-v201` 快取、發布說明「購物與分帳小地方」、`formatLedgerDateKey('2026-10-19')` 為 `10/19(一)`、無 pageerror;線上 `shell/v201/index.html` 與 `origin/main` 位元組相同;v199／v200 仍 200,v198 為 404。
- **tag**:production-tags workflow 建立 `production-v201` → `a1384fa`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `df4b0d3`(`production-v200`)的部署,再往前 bump。

## 2026-11-18 — v201 購物與分帳小地方

- **來源**:Bar 2026-11-18 要購物頁與「最近消費」等小頁面的優化建議,我列 7 項,Bar「1-7 都做」並要求附原圖對照;看過對照圖後,第 2 項(店家標籤固定放第二行)維持原樣,其餘確認。
- **購物**:新增／編輯採買的關閉鈕改成與其他面板相同的圓底「×」;還沒有代購對象時,「幫誰買」只留輸入框與「新增」(不再顯示「尚未建立代購對象」「已選 0 位」),有選對象才顯示「已選 N 位」;想逛模式的「清除全部想逛」移到清單最下面。
- **分帳**:收款人結清按鈕「結清…」→「結清」;完整紀錄與最近消費的日期標題改成「今天 10/20(二)」「10/19(一)」(`formatLedgerDateKey`,星期以 `Date.UTC` 推算);帳務與採買的操作選單改用線條圖示(鉛筆、垃圾桶),刪除維持紅字。
- **測試**:`settlement-receiver-v160` 跟著改;單元測試 `ledger-225`、`ledger-dashboard`、`ledger-list-actions` 同步新日期寫法與圖示。
- **整理**:刪除 `shell/v198`,留 v199–v201;發布說明保留 v197–v201。

## 2026-11-18 — v200 已上線 main，tag `production-v200`

- PR [#202](https://github.com/nick80912-dev/ai-native-projects/pull/202)(原本是 v199 發布紀錄,之後一併放入 v200)在 head `154aeb8` 的 sanity／browser-qa 全綠後合併進 `dev`(`09b1f7d`);PR [#203](https://github.com/nick80912-dev/ai-native-projects/pull/203) 七項檢查全綠,以 merge commit 合併進 `main`(`df4b0d3`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v200'`;全新 Chromium `APP_VERSION` v200、只剩 `okayama-trip-v200` 快取、發布說明「分帳頁更好讀」、團體大卡標題「今天團體花費」、無 pageerror;線上 `shell/v200/index.html` 與 `origin/main` 位元組相同;v198／v199 仍 200,v197 為 404。
- **tag**:production-tags workflow 建立 `production-v200` → `df4b0d3`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `954aa00`(`production-v199`)的部署,再往前 bump。

## 2026-11-18 — v200 分帳頁更好讀

- **來源**:Bar 2026-11-18 要分帳頁的優化建議,我列 5 項,Bar「1-5 都做」。看截圖後:不要「你分攤」那一行(看「我的結算狀態」就好,大卡別變大);標題幾經討論定為「今天團體花費」,下一行維持「與我有關累計」;回「that's okay」。
- **通知位置**:今天頁頂部的通知,換到其他頁(`switchView`)時移到底部,不再擋住分帳頁的「個人／團體」切換。
- **團體大卡**:「與我相關 · 今日消費」→「今天團體花費 · N 筆」;「與我相關旅程累計」→「與我有關累計 · N 筆」。金額與計算不變。
- **說明收進 ⓘ**:大卡上方只留匯率,「個人帳留在本機；團體帳跨裝置同步」與「大卡是消費總額、自己的份額看我的結算狀態」收進 ⓘ(`openLedgerSummaryInfo`)。
- **消費列表**:「誰付款・幾人分攤」標籤字放大(9–10px → 11px),移到第二行和類別放一起。
- **新增消費**:金額還沒輸入時,換算位置留白(原本的「—」像負號)。
- **測試**:`data-observability` 跟著改;單元測試 `ledger-dashboard`、`ledger-entry-settings`、`ledger-list-actions`、`ledger-member-visibility` 同步新文字與 ⓘ。
- **整理**:刪除 `shell/v197`,留 v198–v200;發布說明保留 v196–v200。

## 2026-11-18 — v199 已上線 main，tag `production-v199`

- PR [#200](https://github.com/nick80912-dev/ai-native-projects/pull/200) 在 head `8278977` 的 sanity／browser-qa 全綠後合併進 `dev`(`de2cddd`);PR [#201](https://github.com/nick80912-dev/ai-native-projects/pull/201) 七項檢查全綠,以 merge commit 合併進 `main`(`954aa00`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v199'`;全新 Chromium `APP_VERSION` v199、只剩 `okayama-trip-v199` 快取、發布說明「各頁面清爽一點」、購物頁提示存在、無 pageerror;線上 `shell/v199/index.html` 與 `origin/main` 位元組相同;v197／v198 仍 200,v196 為 404。
- **tag**:production-tags workflow 建立 `production-v199` → `954aa00`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `97bdd2d`(`production-v198`)的部署,再往前 bump。

## 2026-11-18 — v199 各頁面清爽一點

- **來源**:Bar 2026-11-17 問其它頁面的優化建議,我列 5 項,Bar「1-5 都做」;看截圖後第 1 項改成「完成 ✓」(不寫「已完成」以免按鈕太寬),其餘「okay」。
- **今天頁**:「完成」按鈕沒完成時是框線樣式,完成後是實心「完成 ✓」(繪本主題:白底 → 綠底)。
- **行程頁**:交通段只留交通方式標籤,不再重複寫「A → B」起訖站名。
- **購物頁**:沒有想逛店家時,不再每個商場一列「想逛店家：0 家」,改成頁首提示一次;第一次勾選店家時,畫面會捲回讓剛點的那一列留在原位。商場營業時間同一行用「·」分隔;商場備註預設只露一行(`renderClampedNoteBlock(…,1)`)。
- **採買清單**:關閉按鈕改用與設定頁相同的圓底「×」。
- **測試**:`today-list-v192`、`trip-timeline-v194`、`shop-colour-v191`、`shop-interaction` 跟著改;`ui-ux-v112` 單元測試改成檢查「·」分隔。
- **整理**:刪除 `shell/v196`,留 v197–v199;發布說明保留 v195–v199。

## 2026-11-17 — v198 已上線 main，tag `production-v198`

- PR [#197](https://github.com/nick80912-dev/ai-native-projects/pull/197) 在 head `cc04691` 的 sanity／browser-qa 全綠後合併進 `dev`(`8bd6cbc`);PR [#198](https://github.com/nick80912-dev/ai-native-projects/pull/198) 七項檢查全綠,以 merge commit 合併進 `main`(`97bdd2d`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v198'`;全新 Chromium `APP_VERSION` v198、只剩 `okayama-trip-v198` 快取、發布說明「設定頁整理」、`renderSettingsStorageBody` 存在且更新說明有「看更早的更新」、無 pageerror;線上 `shell/v198/index.html` 與 `origin/main` 位元組相同;v196／v197 仍 200,v195 為 404。
- **tag**:production-tags workflow 建立 `production-v198` → `97bdd2d`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `741ec82`(`production-v197`)的部署,再往前 bump。

## 2026-11-17 — v198 設定頁整理

- **來源**:Bar 2026-11-17 問設定頁的優化建議,我列 5 項,Bar 回「1-5 都做」,看過截圖回「okay」。(之前另一個 v198「完成的站不變淡」做好後 Bar 改回保留變淡,已撤回、未發布。)
- **資料與版本**:順序改成 個人帳匯出 → 本機備份／還原 → 版本 → 目前旅程;「重置紀錄」「清除並打包旅程」移到最底、改成紅框按鈕(`btn danger-outline`);所有按鈕整排寬度;更新說明只顯示最新一版,其餘收進「看更早的更新(N 版)」(`renderAppReleaseNotes(true)`)。
- **資料與照片狀態**:疑難排解裡「資料健康狀態」「照片健康狀態」合成一列一頁(health 頁 = 資料概況＋照片附件,`renderSettingsStorageBody`);storage 頁保留為採買修復的深連結,畫面相同;App 內提示文字改指「資料與照片狀態」。
- **通知位置**:今天頁頂部的通知,打開設定時移到底部,不再擋住設定頁標題。
- **測試**:`settings-health-page`(新順序、紅框、只顯示最新一版、通知位置)、`settings-grouped-root`、`shopping-photo`、`data-observability`、`status-clarity`、`trip-progress-persistence` 跟著改;`theme-system`／`settings-grouped-root` 單元測試同步。
- **整理**:刪除 `shell/v195`,留 v196–v198;發布說明保留 v194–v198。

## 2026-11-17 — v197 已上線 main，tag `production-v197`

- PR [#194](https://github.com/nick80912-dev/ai-native-projects/pull/194) 在 head `aa0415c` 的 sanity／browser-qa 全綠後合併進 `dev`(`f24f97c`);PR [#195](https://github.com/nick80912-dev/ai-native-projects/pull/195) 七項檢查全綠、無衝突,以 merge commit 合併進 `main`(`741ec82`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v197'`;全新 Chromium `APP_VERSION` v197、只剩 `okayama-trip-v197` 快取、發布說明「小地方調整」、`pastTripRangeText` 回「去 2026/10/18（日） → 回 10/23（五）」(不含天數)、無 pageerror;線上 `shell/v197/index.html` 與 `origin/main` 位元組相同;v195／v196 仍 200,v194 為 404。
- **tag**:production-tags workflow 建立 `production-v197` → `741ec82`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `e0ab64b`(`production-v196`)的部署,再往前 bump。

## 2026-11-17 — v197 小地方調整

- **來源**:Bar 2026-11-17 問「其它微調優化部分？」,我列 3 項,Bar 選全做並補充:日期寫成 10/19(一)、幣別用那趟旅程當時的設定、只有代購的那天直接顯示代購金額、過往旅程清單卡片不寫天數並縮小高度、「匯出帳務到記序」改成「匯出帳本」。看過截圖回「okay」。
- **行程頁日期按鈕**:`10/19·一` → `10/19(一)`(「一」在小字裡像破折號)。
- **過往旅程幣別**:`pastTripJpy` 改用封存試算表 TripConfig 的幣別(`TripCurrency.normalizeCode(cfg.currency)`,沒有就 JPY),不再寫死 ¥。
- **個人帳每日小計**:分開算一般與代購;只有代購的那天顯示「代購 NT$x」,兩者都有時並列。
- **過往旅程清單**:卡片只留名稱與「去 … → 回 …」兩行(`pastTripRangeText` 不再加天數,摘要卡也一樣),內距縮小;封存日期只在摘要卡顯示。
- **匯出**:按鈕改名「匯出帳本」,格式不變(記序可匯入)。
- **測試**:新增 `tests/browser/day-chip-weekday-v197.spec.js`;`past-trips` 與 `past-trips-v196` 跟著改,另加幣別案例。
- **整理**:刪除 `shell/v194`,留 v195–v197;發布說明保留 v193–v197。

## 2026-11-17 — v196 已上線 main，tag `production-v196`

- PR [#189](https://github.com/nick80912-dev/ai-native-projects/pull/189) 在 head `8ea1282` 的 sanity／browser-qa 全綠後合併進 `dev`(`b60f38f`)。
- 發布 PR [#190](https://github.com/nick80912-dev/ai-native-projects/pull/190) 第一次顯示與 `main` 衝突:v195 以 squash 進 `main`(`85718e3`),git 不認得那與 `dev` 上的 v195 是同一份內容。`main` 的樹與 `dev`@`c97ae5b` 完全相同,所以 PR [#191](https://github.com/nick80912-dev/ai-native-projects/pull/191) 把 `main` 併回 `dev`、衝突全取 `dev` 這邊(檔案零變動)。之後 #190 七項檢查全綠,這次改用 **merge commit** 合併進 `main`(`e0ab64b`),往後發布不再因 squash 產生同樣衝突。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v196'`;全新 Chromium `APP_VERSION` v196、只剩 `okayama-trip-v196` 快取、發布說明「過往旅程分頁瀏覽」、過往旅程分頁／匯出／筆記修改函式存在、無 pageerror;線上 `shell/v196/index.html` 與 `origin/main` 位元組相同;v194／v195 仍 200,v193 為 404;線上 `trip-drive.js` 含 `replaces` 寫入。
- **tag**:production-tags workflow 建立 `production-v196` → `e0ab64b`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `85718e3`(`production-v195`)的部署,再往前 bump。

## 2026-11-17 — v196 過往旅程分頁瀏覽

- **來源**:backlog #64。Bar 2026-11-17 提出行程按天、團體帳與個人帳、採買分已買／沒買;我另外建議花費總覽、每天花費、住宿、筆記依天分組。Bar 選分頁按鈕、花費總覽加圓餅圖並要「匯出分帳紀錄到記序」、每天花費與住宿,不要筆記依天分組,回顧筆記要能修改。看過截圖後再要求:完成的站不特別處理也不記錄、原始資料放到不顯眼的按鈕、改過的筆記不標示;回「okay」。
- **分頁**:點開一趟旅程,摘要卡(我的花費、採買、個人帳、團體帳;不再顯示完成站數)下面是 總覽／行程／帳務／採買／筆記。資料由 `pastTripModel` 從封存的試算表 CSV(`createDB`)與個人紀錄算出,只讀。
- **總覽**:我的花費 = `buildMyTripSpend`(個人不含代購 ＋ 團體分攤),SVG 圓餅圖(前 5 類＋其他)與類別金額;「匯出帳務到記序」輸出與「匯出本趟個人帳」相同的 v2 格式(`pastTripLedgerExportJson`)。
- **行程**:DAY 按鈕切換;不顯示完成狀態;每天下面有當天花費(個人＋團體分攤,依手機時區日期)與當晚住宿(站點的 HID,或住宿「適用日期」10/18-10/23 = 入住到退房前一晚)。
- **帳務**:團體帳 = 結算結果(封存時未結清的轉帳建議,用結算幣別)、每人先付／分攤、全團有效支出依日期;個人帳依日期、每天小計不含代購。
- **採買**:已買／沒買切換,依店家(SID → 品牌,或站點)分組,顯示數量、買給誰與金額。
- **筆記**:鉛筆圖示修改回顧筆記 —— 新增一筆帶 `replaces` 的筆記檔(`trip-drive.js` 寫入並讀回驗證),只顯示最新版,不標示已修改(ADR 0020 增補)。
- **原始資料**:每個分頁最底一行灰色小字「顯示原始資料」,按了才展開。
- **測試**:新增 `tests/browser/past-trips-v196.spec.js`;`past-trips.spec.js` 改走分頁。
- **整理**:刪除 `shell/v193`,留 v194–v196;發布說明保留 v192–v196。

## 2026-11-17 — v195 已上線 main，tag `production-v195`

- PR [#186](https://github.com/nick80912-dev/ai-native-projects/pull/186) 在 head `6744de8` 的 sanity／browser-qa 全綠後合併進 `dev`(`c97ae5b`);PR [#187](https://github.com/nick80912-dev/ai-native-projects/pull/187) 七項檢查全綠後合併進 `main`(`85718e3`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v195'`;全新 Chromium `APP_VERSION` v195、只剩 `okayama-trip-v195` 快取、發布說明「繪本插圖跟著天氣換」、`ehonWeatherScene` 對 61／73／1 回 rain／snow／空字串、無 pageerror;線上 `shell/v195/index.html` 與 `origin/main` 位元組相同;v193／v194 仍 200,v192 為 404。
- **tag**:production-tags workflow 建立 `production-v195` → `85718e3`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `f911e58`(`production-v194`)的部署,再往前 bump。

## 2026-11-17 — v195 繪本插圖跟著天氣換

- **來源**:backlog #65 ⑧。Bar 2026-11-17 看場景示意後選「先做城市、雪景、下雨並再稍微豐富一點點」;再改為「通常都由天氣預報作判斷,下雨切雨天版、下雪切雪景,不透過試算表選填」;雪景「稍微修簡單一點點」;通用版「稍微修正豐富一些」,並要「關於插圖的開關,跟卡片模式開關放一起」。看過 App 截圖回「Okay」。
- **場景**:`renderEhonArt(weather)` 依 `ehonWeatherScene` —— 天氣為 fresh 時,WMO 51–67／80–82／95–99 → 雨天城市(雨絲兩層交錯落下、水窪、撐傘小人、電車);71–77／85–86 → 雪景(雪山、兩棵松、雪人、冒煙小屋,雪花飄落);其他或沒有天氣 → 晴天版。岡山／四國行程的晴天仍是桃子與大橋;其他旅程用加了細節的通用版(小屋窗與煙囪、樹、松、燈塔、海鷗、小帆船)。沒有 TripConfig 新鍵。
- **開關**:設定「個人」在「今天頁用卡片顯示」下面多一列「繪本插圖」(`trip_ehon_art`,只存這支手機,預設顯示);只在繪本主題出現。關掉時今天頁、旅程結束與無行程首頁都不畫插圖。
- **動畫**:雨、雪、炊煙、電車;「減少動態效果」由全域規則停掉。動畫的 CSS transform 會蓋掉 SVG `transform` 屬性,所以位置放內層、動畫 class 放外層。
- **測試**:新增 `tests/browser/ehon-weather-art-v195.spec.js`;`settings-grouped-root` 加 `ehonArtEnabled` stub。
- **整理**:刪除 `shell/v192`,留 v193–v195;發布說明保留 v191–v195。

## 2026-11-17 — v194 已上線 main，tag `production-v194`

- PR [#183](https://github.com/nick80912-dev/ai-native-projects/pull/183) 在 head `2bb8c73` 的 sanity／browser-qa 全綠後合併進 `dev`(`421f178`);PR [#184](https://github.com/nick80912-dev/ai-native-projects/pull/184) 七項檢查全綠後合併進 `main`(`f911e58`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v194'`;全新 Chromium `APP_VERSION` v194、只剩 `okayama-trip-v194` 快取、發布說明「行程頁改成時間軸」、時間軸函式存在、無 pageerror;線上 `shell/v194/index.html` 與 `origin/main` 位元組相同;v192／v193 仍 200,v191 為 404。
- **tag**:production-tags workflow 建立 `production-v194` → `f911e58`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `796c205`(`production-v193`)的部署,再往前 bump。

## 2026-11-16 — v194 行程頁改成時間軸

- **來源**:Bar 2026-11-16 提供別的旅遊 App 截圖,要求評估納入規劃(backlog #65);先看時間軸概念圖,回「好，用下一站時間推算」。之後依「想看交通與通勤時間」加做的「幾點離開／停留／來不及」版本,Bar 看過截圖回「看起來變複雜了，按照前次的時間軸規劃就好」—— 已撤回,不採用。也看過「依時間移動的現在標記」三種示意(另加紅點、用站點變色、站點沿線移動),Bar 回「放棄時間軸跟著動這個想法」。
- **時間軸**:`renderTripTimeline` —— 左邊時間欄(這站時間＋「～下一站時間」,下一站時間推算)、中間時間線與圓點、站卡左側色條依類型;站與站之間是交通段(沿用 v149 交通方式色彩標籤＋起訖站名;第一站自己有交通時畫在它上面)。站卡平常收起(標題、類型、「地圖」→ Google 地圖搜尋、▾),展開才有導航／停車／資訊／更多;展開狀態沿用 `viewUiState.trip.openPanels`(不存檔)。從今天頁點進來的那一站自動展開。過完的那天照實際順序、完成的站變淡且圓點填滿。
- **測試**:新增 `tests/browser/trip-timeline-v194.spec.js`;`navigation-target-matrix` 的「樓層」鈕案例先展開站卡。
- **整理**:刪除 `shell/v191`,留 v192–v194;發布說明保留 v190–v194。

## 2026-11-16 — v193 已上線 main，tag `production-v193`

- PR [#180](https://github.com/nick80912-dev/ai-native-projects/pull/180) 在 head `0bf4297` 的 sanity／browser-qa 全綠後合併進 `dev`(`24f402b`);PR [#181](https://github.com/nick80912-dev/ai-native-projects/pull/181) 七項檢查全綠後合併進 `main`(`796c205`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v193'`;全新 Chromium `APP_VERSION` v193、只剩 `okayama-trip-v193` 快取、發布說明「過往旅程更好讀」、`pastTripRangeText` 回「去 2026/10/18（日） → 回 10/23（五） · 6 天」、無 pageerror;線上 `shell/v193/index.html` 與 `origin/main` 位元組相同;v191／v192 仍 200,v190 為 404;`privacy.html` 200。
- **tag**:production-tags workflow 建立 `production-v193` → `796c205`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `a34bca0`(`production-v192`)的部署,再往前 bump。
- 過往旅程第二版(行程按天、帳務小計、採買分組)記入 backlog #64。

## 2026-11-16 — v193 過往旅程更好讀(第一版)

- **來源**:Bar 2026-11-16「過往旅程列出去與回的時程」,再問「過往旅程可以有哪些建議的呈現方式」;我列 9 項,Bar 選第一版先做 1、2、3、7、8、9,看過截圖回「Okay」。第二版(行程按天切換、帳務小計、採買分已買／沒買)之後再做。
- **清單**:每趟一張卡片 —— 名稱、「去 2026/10/18（日） → 回 10/23（五） · 6 天」(`pastTripRangeText`,星期以 `Date.UTC` 推算,不用 Date 物件)、封存日期。
- **點開是獨立一頁**:「‹ 全部過往旅程」回清單(`closePastTrip`,同時作廢進行中的筆記讀取／儲存回應)。順序:摘要卡(去回日期與天數、封存成員、封存日期;完成站數、採買已買／總數、個人帳筆數與台幣合計、團體帳筆數)→ 回顧筆記 → 旅程內容 → 「進階：原始資料」(最底、附說明)。日期一律 2026/11/15 格式(原本是 ISO 時間戳)。
- **測試**:`past-trips.spec.js` 新增 v193 案例(清單去回日期、獨立頁、摘要四格、區塊順序、回清單);「筆記儲存中切換旅程」改成經由清單切換。
- **整理**:刪除 `shell/v190`,留 v191–v193;發布說明保留 v189–v193。

## 2026-11-16 — v192 已上線 main，tag `production-v192`

- PR [#177](https://github.com/nick80912-dev/ai-native-projects/pull/177) 在 head `1f2fb02` 的 sanity／browser-qa 全綠後合併進 `dev`(`04403a9`);PR [#178](https://github.com/nick80912-dev/ai-native-projects/pull/178) 七項檢查全綠後合併進 `main`(`a34bca0`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v192'`;全新 Chromium `APP_VERSION` v192、只剩 `okayama-trip-v192` 快取、發布說明「今天頁改成行程清單」、清單模式函式存在、無 pageerror;線上 `shell/v192/index.html` 與 `origin/main` 位元組相同;v190／v191 仍 200,v189 為 404;`privacy.html` 200。
- **tag**:production-tags workflow 建立 `production-v192` → `a34bca0`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `495cfcd`(`production-v191`)的部署,再往前 bump。

## 2026-11-16 — v192 今天頁改成行程清單;行程頁單純顯示;封存後畫面與設定修正 ⭐

- **來源**:Bar 2026-11-15「今天頁會照時間顯示卡片,沒照時間走就亂掉;行程頁又卡在打卡／略過,要按好幾次才找到目前位置」。看過概念圖後決定:今天頁不判斷時間、不用卡片,改整頁清單;卡片改成功能開關;按鈕叫「完成」(按了該站變淡);可拖拉臨時調整;導航等細節到行程頁看;行程頁維持原順序,那天過完後照實際順序與完成紀錄。再補:上方資訊卡縮小、往下捲時凍結(與上排留空隙)、繪本插圖頂端完整／捲動後細長;拖拉時小卡不擋、會自動捲動(Bar 要求協助測試拖曳)。最後回「目前可以」。
- **今天頁(預設清單)**:`renderTodayList` —— 今天每一站一列(≡ 拖拉把手、時間、站名、「完成」、›)。不看時間、**不自動略過**(`pickNextStop` 與 `autoSkipStaleItem` 在清單模式不寫入)。「完成」走既有 `setItemCompletion`(trip_checks／trip_next_stop_progress),備份與封存照舊;重畫後焦點回到同一顆鍵。上方資訊卡精簡為一行日期＋完成數、一行天氣／採買;`position:sticky` 凍結於上排下方 8px,縫隙以頁面底色遮住;繪本插圖頂端完整、捲動超過 60px 收成細長版(8px 內展開,避免來回跳)。
- **拖拉**:只有按住 ≡ 才拖(`touch-action:none`),其他地方照常捲動;手指停在凍結小卡下方或分頁列上方時以 requestAnimationFrame 持續捲動(頁面設了平滑捲動,改用 `behavior:'instant'`);拖拉中不重繪、不切換插圖大小。順序存在 `trip_today_order`(依旅程 sourceKey,只在這支手機,不改試算表、不進備份),「恢復原順序」清除。
- **卡片模式**:設定 →「個人」→「今天頁用卡片顯示」(`trip_today_mode`,預設清單,不進備份)。打開後是原本依時間的卡片,行為不變。
- **行程頁**:一律單純瀏覽 —— 沒有打卡方塊、完成／略過數字、狀態小標與「隱藏已完成」;看別天時仍有「回到現在」。那一天過完後(在今天之前或旅程已結束)照當天實際順序與完成紀錄顯示(完成的站變淡、標「✓ 完成」,上方註明)。
- **封存後(旅程已清除)**:Bar 回報「設定頁面無法點選」—— 清除後的互動防護只放行卡片按鈕,右上設定鈕被擋;現在放行,設定根頁多了「主題」。首頁卡片改寫:說明上一趟有無封存、兩個選項同大小各附一句說明(可存取名稱仍是「連接新旅程」「過往旅程」)。
- **隱私權政策頁** `privacy.html`:Google OAuth 由「測試中」改正式版時,品牌設定要求首頁與隱私權政策網址(Bar 2026-11-16 已發布正式版,讓同行友人也能封存)。內容依實際資料流:無帳號與伺服器、個人資料只在手機、團體帳到旅程負責人的 Apps Script、收據辨識送 Gemini 不另存、Drive 只用 `drive.file`、不販售不廣告不追蹤、刪除與撤銷方式。
- **測試**:新增 `tests/browser/today-list-v192.spec.js`(清單不自動略過、完成變淡；凍結小卡下往上拖到頂(海洋／繪本)、往下拖到底、短拖／中斷／恢復原順序、手機真實觸控、卡片開關、過完的那天)。`qa-fixture` 預設 `trip_today_mode="card"`,讓既有描述卡片的測試維持原意;照「行程頁可以打卡／隱藏已完成」寫的測試改成新做法(view-context、status-clarity、pretrip-fixes-v156 T3、pretrip-polish-v158 T10、ux-v185、ux-v186、trip-progress-persistence 的鍵盤失敗案例改用今天頁「完成」鍵)。
- **本機完整 Chromium**:除下列已知只在本機失敗的項目外全數通過 —— `personal-ledger-export`、`trip-connect`「下載行程後…」、5 個 `view-context` 捲動測試、`sw-update-cache` readiness(後三類在未改動的 v191 本機同樣失敗)。
- **整理**:刪除 `shell/v189`,留 v190–v192;發布說明保留 v188–v192。

## 2026-11-15 — Bar 確認 v190／v191;#58 暫緩;下一趟未規劃

- Bar 手機確認 v191 購物頁顏色 OK(v190 藤紫同批)。
- #58 Logo 暫緩:「暫時不做,沒什麼特別的 Logo 想法」,維持紙飛機圖示。
- 下一趟旅程尚未規劃;試算表副本保留待用。

## 2026-11-15 — v191 已上線 main，tag `production-v191`

- 本機完整 Chromium:463 passed、7 failed(與 v190 相同的 7 項本機環境失敗;CI 全綠)。
- PR [#173](https://github.com/nick80912-dev/ai-native-projects/pull/173) 在 head `e95f400` 的 sanity／browser-qa 全綠後合併進 `dev`(`4bbbeaf`);PR [#174](https://github.com/nick80912-dev/ai-native-projects/pull/174) 七項檢查全綠後合併進 `main`(`495cfcd`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v191'`;全新 Chromium `APP_VERSION` v191、只剩 `okayama-trip-v191` 快取、發布說明「購物頁更有色彩」、無 pageerror;線上 `shell/v191/index.html` 與 `origin/main` 位元組相同(含 `sm-tone` 樣式);v189／v190 仍 200,v188 為 404。全新瀏覽器在本環境 10 秒內仍「同步中」、購物頁沒有資料,購物頁色彩以 CI 與本機截圖為準,待 Bar 手機確認。
- **tag**:production-tags workflow 建立 `production-v191` → `495cfcd`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `76a80cd`(`production-v190`)的部署,再往前 bump。

## 2026-11-15 — v191 購物頁更有色彩

- **來源**:Bar 2026-11-15「購物分頁顏色有點蒼白」;看過示意圖選 1–3 都做、只改繪本(「海洋與其它主題不用改」),再加「展開樓層加底色,其它主題也是」,看過實際截圖回「Great」。
- **繪本**:商場名稱整條上色,依商場順序五色輪流(`sm-tone-0..4`:珊瑚、水色、若竹、藤紫、山吹;同一間商場在搜尋與想逛畫面同色);樓層編號放進山吹黃膠囊;「想逛店家:0 家」改奶油底實線框。
- **所有主題**:樓層展開時,標題下緣變直角、與店家清單接成一塊有框的面板(一般主題用頁面底色 `--paper`、框線 `--sea`;繪本用奶油底、墨灰粗框)。
- **測試**:新增 `tests/browser/shop-colour-v191.spec.js`(繪本五色、膠囊、奶油底;七個主題的展開面板;其他主題的商場名稱與樓層編號不變)。
- **整理**:刪除 `shell/v188`,留 v189–v191;發布說明保留 v187–v191;`16_OPS_PLAYBOOK.md` 的錨點補為 `production-v190`。

## 2026-11-15 — v190 已上線 main，tag `production-v190`

- 本機完整 Chromium:462 passed、7 failed —— `personal-ledger-export`(已知只在本機失敗),以及 `trip-connect`「下載行程後…」與 5 個 `view-context` 捲動測試;後六個在未改動的 `origin/dev`(v189)本機也同樣失敗,屬本機環境,CI 全綠。
- PR [#170](https://github.com/nick80912-dev/ai-native-projects/pull/170) 在 head `78d1cca` 的 sanity／browser-qa 全綠後合併進 `dev`(`4be9860`);PR [#171](https://github.com/nick80912-dev/ai-native-projects/pull/171) 七項檢查全綠後合併進 `main`(`76a80cd`)。
- **線上核對**:正式站 `sw.js` 為 `SW_VERSION='v190'`;全新 Chromium `APP_VERSION` v190、只剩 `okayama-trip-v190` 快取、發布說明「繪本多一個顏色」、`--ehon-violet` 為 `#C9B8E3`、主題仍七組、無 pageerror;線上 `shell/v190/index.html` 與 `origin/main` 位元組相同;v188／v189 仍 200,v187 為 404。
- **tag**:production-tags workflow 建立 `production-v190` → `76a80cd`。
- 回滾:依 `16_OPS_PLAYBOOK.md` §A1 Publish `commit_ref` = `5cacb20`(`production-v189`)的部署,再往前 bump。

## 2026-11-15 — v190 繪本主題加第五色「藤紫」

- **來源**:Bar 2026-11-15 問繪本配色是否還能加顏色;看過示意圖後回「同意繪本加第五色」,同一批提的第八個主題「夏海／青海波」**不做**。
- **藤紫 `#C9B8E3`**:航班卡底色由水色改藤紫(原本和今天卡同為水色,出發前疊在一起分不開);住宿標籤由寫死的 `#d9cceb` 改用同一個藤紫。
- **整理**:繪本外觀層、主題預覽與首頁插圖的色碼全部改走 `--ehon-*` 變數(墨灰、珊瑚、山吹、水色、若竹、藤紫、海、奶油、今天),定義在 `[data-theme="ehon"]` 區塊;畫面除上述兩處外不變。
- **測試**:新增 `tests/browser/ehon-violet-v190.spec.js`(繪本的航班卡與住宿標籤是藤紫、今天卡仍是水色;海洋主題不受影響)。
- **整理**:刪除 `shell/v187`,留 v188–v190;發布說明保留 v186–v190。

## 更早的紀錄

- 2026-11-01（v177 上線）到 2026-11-14（v178–v189 手機審查通過）的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-11-01_to_2026-11-14.md`](docs/archive/07_CHANGELOG-2026-11-01_to_2026-11-14.md)(2026-11-21)。
- 2026-10-16(v157)到 2026-10-31(v177)的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-10-16_to_2026-10-31.md`](docs/archive/07_CHANGELOG-2026-10-16_to_2026-10-31.md)(2026-11-12)。
- 2026-07-03（基礎版）到 2026-10-15（v156 正式發布）的紀錄已原文搬到 [`docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md`](docs/archive/07_CHANGELOG-2026-07-03_to_2026-10-15.md)（Bar 2026-11-09 選「版本紀錄瘦身」），內容未改。
