# tests — 測試資產(交付必附)

> Bar 於 2026-07-09 核准:自此之後,**每次程式交付必附與修改範圍相符的可執行測試**,測試檔納入 repo 版控;「通過自動測試」以 repo 內可重跑的腳本為準,不接受口頭宣稱。三情境完整 QA 仍須另行驗證。

## 現有測試
- `atomic-sheet-sync.test.js`:驗證七張 Sheet 候選資料需整批驗證後一次啟用、舊快取遷移、失敗候選保留與同步狀態面板。執行:`node tests/atomic-sheet-sync.test.js`。
- `app-now.test.js`:驗證正式時間、offset/custom 時間模擬與共用 `appNow()` 時鐘。執行:`node tests/app-now.test.js`。
- `home-safety.test.js`:驗證首頁行程日完整顯示、Scroll-only 政策與高風險清除操作的確認防線。執行:`node tests/home-safety.test.js`。
- `home-simplification.test.js`:驗證首頁版面高度、下一站取消邏輯、串點子卡簡化與購物清單保留。執行:`node tests/home-simplification.test.js`。
- `ios-zoom-guard.test.js`:驗證 iOS 16px 字級、Scroll-only／viewport 還原、SW 版次，以及最小 no-op 雙擊相容性監聽器不復活舊雙擊 guard 或 APP build metadata。執行:`node tests/ios-zoom-guard.test.js`。
- `preview-date.test.js`:驗證預覽日期參數與 `todayMD()` 使用同一模擬時間來源。執行:`node tests/preview-date.test.js`。
- `pwa-shell.test.js`:驗證 PWA 入口、manifest、Service Worker、Netlify 設定與圖示資產完整性。執行:`node tests/pwa-shell.test.js`。
- `trip-presentation.test.js`:驗證行程類型標籤與行程頁呈現規則。執行:`node tests/trip-presentation.test.js`。
- `schema-types.test.js`:驗證 Places.Type 必要中文輸入值的正規化結果,並確認 `index.html` 內嵌 Schema 已同步。執行:`node tests/schema-types.test.js`。
- `render-note.test.js`:備註條列渲染、下一站卡、MAPCODE、明日預告等元件渲染回歸測試(Node 內建 assert,從預覽 HTML 抽函式驗證)。執行:`node tests/render-note.test.js`(於 repo 根目錄)。
- `pick-next-stop.test.js`:下一站時間判斷與自動略過過期項目的邏輯回歸測試(2026-07-09 新增,涵蓋「今天按過任一完成後就卡住不推進」的修復)。執行:`node tests/pick-next-stop.test.js`
- `parent-first-stop-cluster.test.js`:驗證父列地點納入第一站、兩站成卡、controller ID，以及 Day 1–6 共 12 組已知父子行程的引用順序。執行:`node tests/parent-first-stop-cluster.test.js`。
- `data-reference-consistency.test.js`:驗證行程餐廳顯示名稱與 RID 指向餐廳不一致時 health check 會告警。執行:`node tests/data-reference-consistency.test.js`。
- `ios-viewport-resume.test.js`:驗證 iOS 回前景時還原 viewport、清除舊 transform 並保留捲動位置。執行:`node tests/ios-viewport-resume.test.js`。
- `ios-gesture-diagnostics.test.js`:驗證 document 僅註冊一個 passive no-op `dblclick` 相容性監聽器、舊手勢診斷識別字已退役，並保留桃子診斷入口、健康檢查、時間模擬、viewport recovery 與重置行程進度；另驗證診斷面板「App 版本」列讀自真實 Cache Storage（`index.html` 不得寫死版本號，讀不到須顯示「無法讀取」）。執行:`node tests/ios-gesture-diagnostics.test.js`。

- `ledger-settlement-reliability.test.js`:結算可靠性總測試。涵蓋 durable delivery bridge(原子交接、持久性、只在遠端讀回同一 `record.id` 才清除、不自動過期)、事件全序與同毫秒競態、跨裝置 confirm／reject 收斂與 losing response inert、狀態機文案與按鈕不復原、退回後重新付款開新 generation、已確認收款的 10 秒一次性復原（資格六項條件、9,999／10,000／10,001ms 邊界、無效或未來 `response.time`、已復原、後續 generation、連點五次只一筆 deletion、歷史不得輸出永久撤銷／復原按鈕）、ledger fast pull 增量與非 JSON 降級、polling 兩層退避與生命週期、待處理徽章、簡易結算模式與時鐘偏移。執行:`node tests/ledger-settlement-reliability.test.js`。
- `shopping-list.test.js`:採買清單 store 正規化與封閉分類、Today 提醒歸組、Buy-to-Ledger 單筆與多品項 prefill、代購對象共用名單、Scroll-only CSS 契約;另涵蓋**站點排序**(`dayIndex → 當日 items index` 的單一排名來源、待買頁與 Today 共用、同站點內維持 store order、穩定排序、不重寫本機順序、已買頁排除在外)與**孤兒 `stopRef` 三態**(`tripDatasetAuthority` 只認 `online` 快照、`builtin`／`legacy-migrated`／無快照一律降級待確認、確認失效的警告文案、編輯表單以原值為選中 option 且不自動清空)。執行:`node tests/shopping-list.test.js`。
- `ledger-member-visibility.test.js`:團體帳本「只顯示與目前成員相關紀錄」。涵蓋付款人 × 分攤成員四象限(含**付款人不在 participants 內的代墊紀錄仍須顯示**)、`participants` 缺欄／`null`／空陣列／非 JSON／非陣列／含非字串／已是陣列共七種舊格式的限定式 fail-open 與不拋錯、fail-open 不擴散、成員無法解析時的安全退化(三種輸入)與診斷訊號、姓名格式變動仍以 `canonicalMemberName()` 穩定 key 判定、筆數與總額只計過濾後紀錄、最近消費／完整紀錄頁／主卡片同源、八個消費端共用 `ledgerTrackRecords()`、編輯與刪除路徑各自重查同一判斷、結算仍讀全團事件流、不得新增範圍切換 UI。執行:`node tests/ledger-member-visibility.test.js`。
- `apps-script-settings.test.js`:除既有 `doPost` 設定與分帳寫入契約外,另涵蓋唯讀 `doGet` ledger 加速層契約(`after` 正規化、`after >= total` 不呼叫 `getValues()`、`after > total` 回 `reset` 與全量、精確 21 欄 range、不取 `LockService`、不洩漏內部資訊)。執行:`node tests/apps-script-settings.test.js`。

> 測試以 `vm` sandbox 執行 `index.html` 內的程式片段。**注意**:sandbox 內建立的陣列具有不同 realm 的 prototype,`assert.deepStrictEqual` 會因此失敗;比較這類結果請改用 `join()`／`plain()`(JSON round-trip)。切片用的起訖字串只是取樣邊界,不是行為契約 —— 搬動函式位置時一併更新即可。

## 待建(backlog #1,下次程式交付一併補齊)
- Playwright 三情境 QA 腳本:①斷網內建 ②連網同步 ③旅行日 mock Date;通過標準=三情境零 pageerror。
- 打包前離線回歸(SW 快取)腳本。

> 在上述 Playwright 腳本納入 repo 前,三情境 QA 是人工/瀏覽器驗收要求;不得將既有 Node 測試寫成「Playwright 已通過」。

## Sanity CI(2026-07-09 起)
- `.github/workflows/qa.yml` 於 `main` push / Pull Request 自動執行:①`tools/check-doc-titles.js`(文件標題/檔名一致性+manifest JSON 檢查,防上傳錯位)②`tests/` 內全部 `*.test.js`。`dev` push 目前先執行相同本機 CI，是否納入 workflow 另見 backlog。
- 上傳/commit 後到 GitHub 的 **Actions** 頁看結果:綠勾=通過;紅叉=點進去看哪個檔案錯位或哪個測試失敗。
- Playwright 三情境待驗收穩定後加入(backlog #1),屆時掛進同一 workflow。

## 規則
- 測試只依賴 Node 內建模組或 devDependency 明列的工具;引入新測試框架屬技術棧變更,走五段提案。
- 測試檔命名:`<對象>.test.js` / `<情境>.spec.js`;測試不得修改任何來源檔。
