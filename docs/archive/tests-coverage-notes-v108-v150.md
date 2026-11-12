# tests 覆蓋說明封存(v108–v150)

> 2026-11-12 自 `tests/README.md` 原文移出;現行測試清單與執行方式見 `tests/README.md`。

## v150 connect-new-trip coverage

- `trip-source.test.js`：連結解析（發布／編輯／無效）、來源紀錄正規化與讀回、開機分類（沿用／岡山遷移／岡山保護期前後與邊界／尚未連接／損壞）、`unconnected`／`activate`、inspect 的每個錯誤碼、commit 成功與中途失敗復原、中斷標記復原、分頁鎖；並鎖住測試用 TripConfig 欄位必須是 `schema.js` 真正產生的欄位名稱。
- `itinerary-stop-id.test.js`：「行程ID」依標題名稱找欄、空白退回位置型 ID、岡山 7 欄不受第 8 欄雜訊影響、格式與重複被 validator 擋下、結構檢查視為選填欄。
- `weather-regions.test.js`：天氣地區 CSV 解析（關鍵字分隔、日本範圍、重複座標）、岡山用內建清單、新旅程只用自己的清單、別趟或損壞清單被忽略。
- `personal-state-restore-matrix.test.js` 擴充 v10 與六種旅程比對；`apps-script-settings.test.js` 新增 `doGet?action=info`；`personal-ledger-export.test.js` 新增新旅程來源識別。
- `browser/trip-connect.spec.js`：新手機「尚未連接旅程」（時鐘固定在保護期之後）、保護期內的新手機沿用岡山、貼連結→預覽→確認→重新開啟、Endpoint 屬於別份試算表、岡山舊手機升級、新旅程無快照時的下載畫面、舊旅程待送帳不送出、新旅程拒絕岡山舊備份、同步後讀取天氣地區。此 spec 自行管理 localStorage（連接後會重新載入），不用 `qa-fixture` 的每次清空。
- 其他 browser spec 的 fixture 都預先寫入 `trip_source` 為岡山（`legacy`），代表既有的岡山手機；沒有它的「新手機」在 v150 會是岡山（台灣時間 10/24 以前）或「尚未連接」（之後）。
- 執行：`node tests/trip-source.test.js`、`npx playwright test tests/browser/trip-connect.spec.js`。

## v149 pre-trip UI coverage

- `pretrip-ui-v149.test.js`:交通方式判斷(含岡山資料每一種交通說明,只有 P000 判成飛機)、標籤顏色 token 與 AA 對比、出發前首頁第一站一行、不再出現「今天沒有排定行程」。
- `ui-font.test.js`:Huninn 只能由 `loadHuninnFont()` 在 `load` 之後加入,`<head>` 不得有靜態 Google Fonts 連結;離線、樣式表失敗、字型失敗、無字型都維持系統字。
- `browser/pretrip-ui-v149.spec.js`:第一站與 D-7、v151 第一站只出現一次且兩顆動作鈕同列不相黏(320px;旅程結束後首頁的同類檢查在 `home-v146.spec.js`)、標籤實際顏色、字型樣式表不回應時第一個畫面照常出現、下載失敗移除樣式表、離線不下載、成功時整頁換字且標題字距歸零。
- 測試環境擋掉外部網路,所以其他 browser spec 都以系統字執行;Huninn 實際排版另以 320／375／390px 手動檢查。

## v146 Home coverage

- `home-v146.test.js`：完整日曆日期／閏年、目的地優先、路線區域及前後最近／等距／未知結果。
- `browser/home-v146.spec.js`：結束日／年份、同頁跨午夜／回前景／hidden／離頁、ongoing DOM／records 不變、無自動授權清除、鍵盤入原預檢／待同步阻擋、祖谷 request、子站回退、未知提示、320／390px 標題／導航一致、全部略過不變。
- `browser/sw-update-cache.spec.js` 的 controller／cache readiness 以 `expect.poll` 等待真正 boolean；新增攔住 SW／空 cache 的 RED→GREEN 保護，避免 async `waitForFunction` 的 Promise truthiness 提前完成。原混世代／前後內容／離線斷言及時限不放寬。

- 個人帳匯出：`node tests/personal-ledger-export.test.js` 與 `npx playwright test tests/browser/personal-ledger-export.spec.js`。涵蓋白名單／來源識別／唯讀／損壞拒絕／下載內容與 ⓘ modal 焦點及窄螢幕。v154 起驗證格式 v2 的 `groupShare` 與 `totals`。
- 收據辨識（v171；v172 說明收進「!」；v173 支付方式、類別、多品項逐筆帶入；v174 結果彈出視窗與復原、設定的簡易結算「!」；v175 照片下方只留品項按鈕；v176 免稅寫備註、稅率與未稅；v177 稅額；v178 稅額欄、折扣進備註、可退稅自動勾）：`node tests/apps-script-settings.test.js`、`node tests/ledger-receipts.test.js` 與 `npx playwright test tests/browser/receipt-recognition-v171.spec.js`。Apps Script `recognizeReceipt`（金鑰只從指令碼屬性讀、只回五個欄位、不寫試算表、不拿鎖、錯誤代碼）；`normalizeRecognition()`；App 只填空著的欄位、收據時間優先於照片時間、幣別不符只提示、失敗說明與重試、關閉或離線不送。瀏覽器測試攔截送往 Apps Script 的 POST，不會真的呼叫 Google。
- 退稅追蹤（v178，backlog #63）：`npx playwright test tests/browser/refund-tracking-v178.spec.js`。稅額欄（税抜時實付＝品項加總＋稅額、沒填照稅率算、說明在「!」）、單品項「可退稅」、舊優惠券只顯示；退稅清單（待退／已退／不退三個分頁；點一張在小視窗按「已退」並可改實際退了多少、照比例分到各筆、從花費扣掉，或按「不退」；已退可改金額或改回待退）、「我的總花費」扣掉實際退稅、離境當天 TODAY 卡片的一行提醒、收據的折扣分攤與自動勾可退稅、個人備份 v11 帶著退稅欄位。
- 表單與設定更精簡（v185）：`npx playwright test tests/browser/ux-v185.spec.js`。代購小勾選在金額列、今天頁通知在頂欄下方、旅程結束後行程頁單純瀏覽。設定的「疑難排解」見 `tests/browser/settings-grouped-root.spec.js`。
- 行前清單與頂端紙飛機（v184）：`npx playwright test tests/browser/prep-checklist-v184.spec.js`。CSV 解析、出發前首頁進度條、勾選與自己新增的待辦存在手機、沒有分頁與出發後的顯示、紙飛機底色與置中。
- 旅程結束回顧與記帳表單（v183）：`npx playwright test tests/browser/ux-v183.spec.js`。結束後首頁的總花費與待退稅、打包按鈕在最下方；帳本與幣別收成一行、點開切換；沒匯率直接提醒、編輯維持原樣。天氣地區不限日本見 `tests/weather-regions.test.js`，離線時頂端「離線版」見 `tests/atomic-sheet-sync.test.js`。
- 可退稅移到金額旁（v180–v181）：`npx playwright test tests/browser/refund-quick-v180.spec.js`。單品項「可退稅」在計算機左邊（v181）、稅額在「明細」標題列靠右（v181）、勾了跳出稅額視窗（空白照稅率估算、取消就不勾、點「稅額 ¥X ✎」再改）；多品項勾第一項時問整張的稅額，之後不再跳出；沒有可退稅的旅程不顯示。
- 去日本以外的地方（v170）：`node tests/weather-rain-window.test.js`、`node tests/ledger-dual-track.test.js` 與 `npx playwright test tests/browser/beyond-japan-v170.spec.js`。天氣依目的地時區（`timezone=auto` 與 `utc_offset_seconds`，舊快取視為 +09:00）、更新時間跟手機時區；日本以外的旅程預設支付方式不含 Suica（已存清單不動）；帳目明細照這趟的幣別。
- 每趟自己的稅（v169）：`node tests/trip-currency.test.js` 與 `npx playwright test tests/browser/trip-tax-v169.spec.js`。TripConfig `Tax Rates`／`Price Mode`／`Tax Free` 的解讀（岡山沒填照舊、其他幣別沒填不顯示稅、`0` 關掉稅）；韓元旅程沒有稅的選項並存成稅率 0；泰銖 7% 未稅加稅到分；日本旅程自己列稅率與編輯舊稅率；簡易結算模式的說明收在「!」。看不懂的稅設定只警告，在 `atomic-sheet-sync`。
- 不限日本的幣別（v168）：`node tests/trip-currency.test.js` 與 `npx playwright test tests/browser/multi-currency-v168.spec.js`。最小單位換算與輸入解析（美金記到分、日圓仍是整數）、美金旅程記帳與顯示 US$12.50、切換台幣再切回、送 Apps Script 是 12.5 USD、讀回試算表換回最小單位、韓元旅程的設定文字、沒有匯率時表單仍可開並帶到設定、岡山（JPY）畫面不變。沙盒測試透過 `tests/support/currency.js` 載入幣別 helper。Apps Script、驗證與連接新旅程的規則在 `apps-script-settings`、`atomic-sheet-sync`、`trip-source` 測試。
- 分帳收據照片（v167）：`node tests/ledger-receipts.test.js` 與 `npx playwright test tests/browser/receipt-photos-v167.spec.js`。EXIF 拍攝時間（兩種位元組順序、讀不到回 null）、對應鍵與連結表；表單加照片帶入時間、3 張上限、只提示不覆蓋自己改過的時間、存檔／編輯／刪帳／沒存就關表單時的照片去留、列表「📎 收據」與明細縮圖、不進個人備份、不跟著團體帳上傳、清除本機媒體連收據一起清、320px 不溢出。
- 離線補回讀回的團體帳（v166）：`npx playwright test tests/browser/offline-readback-v166.spec.js`。fast pull 讀回、CSV 還沒追上的列存在 `trip_ledger_readback`（綁旅程），沒有網路時重開仍在帳本與餘額；CSV 追上就移除且不重複；不算待送、不進個人備份；別趟旅程的副本不套用。
- 手機時區（v165）：`npx playwright test tests/browser/phone-time-zone-v165.spec.js`。今天、下一站與記帳的日期時間跟手機時區走（Bar 2026-10-30 裁定，v164 的固定日本時間已退回）：同一個時間點，手機設在台灣與設在日本各自看到手機的時間。`playwright.config.js` 預設 `timezoneId:'Asia/Tokyo'`（手機在日本），CI runner 是 UTC。
- 稽核中優先（v163）：`npx playwright test tests/browser/medium-fixes-v163.spec.js` 與 `node tests/trip-progression.test.js`。T1 真實 10/22 倉敷子站順序、T7 沒有身分時從採買清單記帳（可取消、選完接續表單）、L4 至少保留一項／刪除確認／恢復預設、L5 已刪除的支付方式仍可編輯舊紀錄、L6 簡易模式列出待你確認的結清、L7 個人帳的其他身分標示。
- 付款人選單（v162）：`npx playwright test tests/browser/payer-select-v162.spec.js`。先聚焦再選付款人（模擬手機點選），選單不被重建或重新聚焦（手機上重新聚焦會再打開選擇器），說明文字更新、重畫後保留付款人並正確存檔。
- 還原與分帳設定（v161）：`npx playwright test tests/browser/restore-and-settings-v161.spec.js`。L1：從設定頁開啟的還原與手動複製對話框在最上層（320／390px 以 elementFromPoint 量按鈕中心）；L2：還原前確認並列出會消失的個人帳／採買／旅途紀錄、取消不寫入、有未送出團體帳時拒絕還原；B2：未確認的分帳設定 10 分鐘內保留、過期改用雲端值且不再擋清除、設定頁的未確認提示。`node tests/ledger-entry-settings.test.js` 與 `node tests/settings-backup-ux.test.js` 涵蓋同樣規則。
- 收款人直接結清等（v160）：`node tests/receiver-settlement-v160.test.js` 與 `npx playwright test tests/browser/settlement-receiver-v160.spec.js`。收款人「已收到／不用付了」一次寫 claim＋confirm、雙方淨額歸零、結清紀錄標示、10 秒復原、對方已標記付款時改走確認、320／390px 對話框；B3 退回後用目前應付金額重新標記；T14 結束後首頁的結清提醒與「前往分帳」；T5 清除預檢的白話原因。
- 串點卡與購物小修（v158）：`npx playwright test tests/browser/pretrip-polish-v158.spec.js`。串點卡的停車／營業／其他資訊／官網／樓層與上半部開行程（含鍵盤）、今天頁與行程頁站數一致、採買卡片記帳後回到清單、部分購買次要樣式與延後檢查；想逛提示框與第一次勾選不跳動在 `shop-interaction.spec.js`。
- 代記團體帳等（v157）：`npx playwright test tests/browser/proxy-recording-v157.spec.js`。採買多選記帳取消後移回待買、存檔後維持已買；團體帳付款人選單（320／390px）、代記紀錄的付款人／「〔Bar 代記〕」備註／小標／記錄者列表與摘要／付款人份額；行程頁「現在」與「回到現在」對齊今天頁。
- 出發前修正（v156）：`npx playwright test tests/browser/pretrip-fixes-v156.spec.js`。B1：fast pull 讀回的團體帳在用舊 CSV 同步後仍在帳本與餘額裡，`syncAll` 自己從第一列重讀、游標走過的列會補回；L3：記帳表單點背景或按 Esc 不關閉、草稿保留；L8：團體帳表單寫「付款人：Bar（你）」與說明小字（320／390px）；T3：從今天頁點已略過的站切到「顯示全部」並定位，未處理的站維持「隱藏已完成」。復原 6 秒由 `trip-progress-persistence.test.js` 驗證。
- 我的總花費（v154）：`node tests/my-trip-spend.test.js` 直接執行 `buildMyTripSpend()` 與結算分攤 helper，驗證不含代購、只算目前身分、只算我在分攤成員內的份額（最大餘數分法）、只先墊的與沒有我的團體帳不算、無法辨識的分攤成員不猜、待同步計數、類別排序與逐筆最新在上；並驗證資料來源固定為正式帳本、只在個人分頁顯示、匯出 v2 接線。`npx playwright test tests/browser/my-trip-spend.spec.js` 驗證明細的類別與逐筆、刪除／還款／測試帳本／居酒屋（沒有我）／我只先墊的紀錄都不出現、台幣顯示與 320px、測試模式開著仍只算正式帳本。v155 起「我的總花費」卡與代購卡併進個人分頁大卡：Node 測「今天」＝今天的個人（不含代購）＋今天的團體份額、沒有紀錄的日子為 0、整趟總額不受今天影響；`ledger-dashboard.test.js` 測 `personalSummaryPresentation()` 的文案與幣別；browser 測大卡的今天花費與組成說明、代購列只顯示金額（沒有代購就不顯示）、整趟旅程（不含代購）、點開明細與代購彙總、點大數字切台幣、320px 不溢位、團體分頁不變。`ui-ux-hardening.spec.js` 另測換頁淡入時 view 不帶 transform、分帳＋按鈕不跑位（v155）。

## v145 weather coverage

- `weather-freshness.test.js`：品質投影、3h 邊界、未知值、原 timestamp 不變、城市／時間格式、session expiry、去重、failed／manual retry、cache denied、epoch 與 late reply。
- `browser/weather-freshness.spec.js`：18 項實際 DOM／鍵盤／Open-Meteo route／Storage 故障案例；320／375／390px、6500ms timeout、切城市／離頁／清除與容量不足；同頁 visibilitychange／pageshow、單次到期失效（不輪詢）、下一站與重試焦點，以及過去 0%＋未來缺值。僅使用 QA context，不修改使用者資料。

## v144 checked trip-progress coverage

- `trip-progress-persistence.test.js`：26 個 writer／reader／caller 案例；逐鍵拒絕、精確原 bytes／不存在恢復、讀回不符、rollback 不確定、壞 JSON／拒絕讀取、無旅程不復活、undo 保留 autoSkip／重試，以及同批群組 controller 一致性。
- `browser/trip-progress-persistence.spec.js`：14 個真實點擊／鍵盤故障案例，涵蓋 reload 後紀錄、健康提示、自動去重、過時取消、最後子站復原、讀取失敗不移除重試及焦點接回。固定時間、Storage 注入及測試行程僅限隔離 QA context。
- 已知限制：localStorage 不是跨分頁交易（原 v144 驗證記錄的結論）。

## v141 Drive session coverage

- `trip-drive-session.test.js`：有效授權重用、過期／disconnect 重新授權、取消及逾時的晚到 grant 不建立 session、Drive 請求逾時。
- `trip-drive-body-guard.test.js`：取消後晚到 JSON 不繼續寫入；筆記內容讀取也受逾時保護。
- `browser/past-trips.spec.js`：關閉設定再進不重登、App 重載不保留 token、Google 取消／未回應可重試、頁內取消與晚到舊 grant、Drive 逾時後重用有效授權；離開封存後重新登入同帳號也不能讓舊流程清除旅程。既有唯讀／筆記／離頁回歸保留。

## v114 member-gate coverage

- `browser/member-gate.spec.js`:六個規格鎖住 v114 的身分流程 ——(1)成功同步後不得自動彈出身分牆(舊行為在此為 `overlay=true, forced=true`);(2)`refreshMemberSelector()` 只重繪已開著的選擇器、絕不自己開一個;(3)進分帳的選擇器為非 forced 且渲染 `×`,取消後留在原分頁;(4)確認身分後接續前往分帳(舊行為留在原分頁);(5)取消後不得挾持之後從設定頁做的身分切換;(6)`openMemberSelector(true)` 的 forced 語意與「刻意沒有 `×`」維持不變。執行:`npx playwright test tests/browser/member-gate.spec.js`。
- 第 (4) 條在實作階段抓到一個真缺陷:`closeMemberSelector()` 會清掉 `pendingViewAfterMember`,而原本的實作在它之後才讀,永遠讀到 `null`。改為先取值再關閉。

## v113 priority-theme coverage

- `theme-system.test.js` protects perceptual separation for Cedar／Mist／Tea page surfaces, accents and secondary roles, plus AA contrast and the two preserved action colors.
- `browser/ui-ux-hardening.spec.js` reads the real computed palette at 390×844 and keeps all six themes free of geometry or overflow regressions.

## v112 UI/UX and Android PWA coverage

- `ui-ux-v112.test.js` and `navigation-location.test.js` protect destination-first itinerary cards, item-local walking／driving／transit routes, Taiwan/Japan qualification, deferred identity selection, readable shopping metadata, direct empty-state actions, and compact destination-first pre-trip summaries.
- `browser/android-pwa-ui.spec.js` runs with an Android Chrome user agent, mobile viewport and touch input. It verifies manifest/maskable icons, Service Worker control after reload, offline BUILTIN startup, destination-first cards, Taiwan and walking URLs, deferred Ledger identity, empty Shopping/Ledger actions, and zero horizontal overflow/pageerror.
- `pwa-shell.test.js` requires install responses to be fully buffered before the all-resource barrier, preventing Chromium connection-pool deadlock while preserving the atomic cache-write boundary.

## v110 presentation-token and Today-module coverage

- `theme-system.test.js`, `ui-ux-hardening.test.js`, `browser/ui-ux-hardening.spec.js`, and `browser/today-live-info.spec.js` protect the compact typography／spacing／radius／action-role tokens, fixed pending／entry／Shopping status color roles, exact six-theme palette values, and unchanged computed presentation at 320／375／390px.
- `today-view-module.test.js` directly protects `TripTodayView.buildModel()`／`render()`／`actionFor()`: immutable input, blank category → `未分類`, six-Unicode-code-point visible cap, full accessible stop name, product-name privacy, generic fallback, and the no-DOM／storage／clock／repository boundary.
- Production wiring tests require `today-view.js` in the page and eleven-asset offline shell inventory, remove the former inline Hero helper／markup authority, and retain exact Today Shopping targeting and interaction behavior in Chromium and WebKit.
- `ledger-ui-state.test.js` remains the executable Ledger boundary. The v110 deletion test rejected a separate `ledger-history-view.js` module (its write-up was deleted on 2026-10-16 and remains in git history); no new Ledger runtime module or global store is expected.

## v109 navigation-feedback acceptance-fix coverage

- Successful exact-target announcements remain in a visually hidden polite live region, so no 「已定位」 row or layout gap appears. Missing-target feedback retains the visible modifier and Render diagnostic.
- Real launcher coverage records the 1000ms active phase, 200ms fading phase, final intent cleanup, and reduced-motion direct clear at 320／375／390px with Tap／Enter／Space in Chromium and WebKit.

## v108 navigation／diagnostics／status-authority coverage

- `navigation-intent-module.test.js` directly protects the ES5 immutable create／request／consume／complete contract, exact five-view allowlist, safe unique tokens, stale completion, normalization, pending／active preservation, caller-mutation isolation, canonical retained shapes, and a separately owned consumed intent snapshot.
- `view-ui-state.test.js` and `render-note.test.js` protect the production DOM seam: explicit intent dispatch／consume, exact Shopping list／mall／Trip targets, missing-target Render diagnostics, token-guarded 1.2-second cleanup, and overlay-only `curView` behavior.
- `browser/today-live-info.spec.js` exercises Hero／badge target confirmation at 320／375／390px with tap／Enter／Space, sticky-safe geometry, live status, reduced motion, missing targets, stale timers, source scroll, connected／replacement／fallback focus, and blank-category behavior. Focused WebKit uses `--grep "target|定位|blank category"`.
- `browser/navigation-target-matrix.spec.js` exercises the actual expanded cluster-stop, pre-trip day, mall-floor, and back-to-now controls at 320／375／390px with rotating Tap／Enter／Space. It asserts exact target and live status, native keyboard focus, sticky-header-safe target／status geometry, 1.2-second clear, reduced-motion static treatment, zero horizontal overflow, and current-day return behavior. Run focused WebKit together with the existing Today target selection.
- `diagnostic-impact-module.test.js` and `diagnostics-app-log.test.js` protect exact timeout classification, conservative unknown handling, input immutability, escaped raw／projected output, and byte-for-byte raw copied reports; `browser/diagnostics-app-log.spec.js` verifies the same boundary in Chromium.
- `manifest-status-authority.test.js` plus `tools/check-doc-titles.js` require `.ai-manifest.json` to name `tasks/current.md` as the sole current-status authority, identify changelog／task archives only as history, reject stale `tasks/(current/backlog/done)`／`manifest.status` prose, and omit volatile candidate／next-action／automated-test snapshots. Current version authority is `shell/v188/app-version.js`／root `sw.js`; root `app-version.js` is the byte-locked v110 bridge.



> Bar 於 2026-07-09 核准:自此之後,**每次程式交付必附與修改範圍相符的可執行測試**,測試檔納入 repo 版控;「通過自動測試」以 repo 內可重跑的腳本為準,不接受口頭宣稱。三情境完整 QA 仍須另行驗證。

