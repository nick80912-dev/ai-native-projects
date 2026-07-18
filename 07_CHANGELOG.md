# 07 版本紀錄

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
