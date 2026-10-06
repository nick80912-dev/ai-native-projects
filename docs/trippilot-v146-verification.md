# TripPilot v146 首頁調整驗證

2026-10-05 發布授權：Bar 在明示 v146 G1 未驗後選擇方案 2，僅本次跳過；dev／PR exact-head CI 通過後一般 merge main 並核對 Netlify 自動部署。下文「未推送／本機限定」描述原實作交付，非否定後續授權；真機清單仍未勾。正式結果見下節。

## 正式發布證據（2026-10-05）

- PR [#42](https://github.com/nick80912-dev/ai-native-projects/pull/42) 一般 merge，candidate/runtime `61583971c6b7a034edfb9e8365ded1da0ba6552e` → main `0f24f7404f88df366c7071325c9698ee127efa76`；merged tree 精確相等、parent 為原 main `9ce1c94` 與 candidate，非 squash／rebase／direct main push。
- dev CI [37321296072](https://github.com/nick80912-dev/ai-native-projects/actions/runs/37321296072)／PR CI [37321310300](https://github.com/nick80912-dev/ai-native-projects/actions/runs/37321310300) exact candidate head 的 sanity／browser-qa 全 success，分別 295/295（7.2／7.1 分鐘、0 retry）；main CI [37322574707](https://github.com/nick80912-dev/ai-native-projects/actions/runs/37322574707) exact merge head 亦全 success，295/295（6.7 分鐘、0 retry）。完整輸出 `dev-ci.log`／`pr-ci.log`／`main-ci.log` 保留。Pages build／deploy 通過，六個 dev 實際資產（SW／v146 三件組／root bridge 二件組）與 candidate Git bytes 相等。
- Netlify authenticated read API 確認 site `db758c0d-484a-4496-9770-6886a7831eed`／`trippilot-jp` 的 current deploy `6ac3afd5197d520007663830` ready，commit_ref=`0f24f7404f88df366c7071325c9698ee127efa76`、published_at=`2026-10-05T14:10:44.527Z`、branch main、manual_deploy=false。未觸發手動 deploy／修改 site 設定。
- §F5 實際 HTTPS GET：28 SHELL 資產＋SW＋root bridge 二件組＋v145 三件組＋v144 version，共 35 個 response 全 200 且 buffer 與 merge Git blobs 精確相等；SW 與 `shell/v146/app-version.js` 的 Cache-Control 都含 no-cache／no-store／must-revalidate。root version 仍為 v110，predecessor generation 保留。
- 獨立 fresh Chromium context：真正 SW 下載，唯一 cache `okayama-trip-v146` 的 28 個資產 SHA-256 全等於 Git；current document／version／builtin 都 v146。online reload 及原生 offline 後關頁重新開啟都有非空首頁、health=[]、pageerrors=0。只封鎖外部服務、用獨立 QA 身分與資料，沒有操作 Bar 的既有瀏覽器／本機帳務，亦不算真機／真實 OAuth 驗收。
- main CI 完成後再次確認 current deploy 仍為 `6ac3afd5197d520007663830`。annotated `production-v146` 已推送，peeled target 為精確 merge SHA；message 含日期、cache 名稱、驗證理由與 forward-bump 復原規則。
- `production-verification.log` 及可重跑的 `verify-production.cjs` 位於原 QA temp folder。G1 本次跳過非通過；TP146-a～c 與既有裝置清單未勾。後續僅補發布文件同步 dev，runtime／tests 與已測 candidate 不變；不熱修改已發布 v146、不刪 SW／資料／工作樹，復原仍採下一未使用 generation forward bump。

## 核准範圍

Bar 確認三項 bounded 首頁調整及 Tier 2 PWA 群組：結束後打包邀請、天氣當前區域／前後最近站點回退、串點突出真正下一站。全部略過文案與計數不動；CSS、字級、主題、帳務、Schema、備份 v9、封存 v1、Drive scope 與授權生命週期不改。

基準 `50d3a812ae150b927feee4a64db5c27511015bd3`，隔離 worktree 乾淨且等於 origin/dev。只核准本機實作／驗證，不 push／merge／部署。manifest B 證據索引 Minor 依前版裁定暫緩，不順手修正。

## 行為契約

- 用 TripConfig 完整 startdate／enddate 與 appNow 本機日曆日期；enddate 當天仍是旅行日，翌日起邀請打包。缺失、無效、倒置日期不產生邀請；隔年同月日不回到舊旅行日。
- 最後一天僅排一個本機午夜 deadline，不輪詢。visibilitychange／pageshow 回前景再核對；旅行未結束不重繪下一站／寫進度，hidden／離首頁／inactive 取消，回來才補上結束提示。重複事件不重建已顯示的邀請。
- 首頁渲染不開 modal／OAuth、不封存／清除。按鈕開資料與版本並執行原八表 preflight；保存／清除仍由使用者再選擇，待同步及未結清保護不變。
- 天氣優先目的地名稱及精確 Hotel HID 地址，不用交通／提醒裡的遠方城市蓋過站點。未知依當天原始順序前後等距比較，含串點子站；等距取前，仍未知明示無資料且不造假城市／重試按鈕。不新增 GPS 或 runtime geocoding。
- 串點主標題／時間為目前子站；群組名稱／時段次要，全區子站仍可展開。導航 href、完成／跳過目標 ID 與 aria-label 保留；未增加字級或改 CSS。

## 區域來源及限制

代表座標不是精確站點 GPS／沿途微氣候。既有岡山／倉敷共用區域維持；新增尾道、福山、祖谷、琴平、丸龜。祖谷涵蓋大／小步危，宇多津與呆呆獸公園採鄰近丸龜代表區域。

- [尾道觀光協會千光寺](https://www.ononavi.jp/sightseeing/temple/detail.html?detail_id=9)核對區域。尾道 `34.41667,133.2`、廣島福山 `34.48333,133.36667`、香川琴平 `34.18333,133.81667`、丸龜 `34.28333,133.78333` 由 [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)開發時只讀查證，選 JP 且行政區相符結果；未增加 App API。
- 祖谷 `33.87513,133.8251` 為 [三好市官方祖谷藤蔓橋](https://miyoshi-tourism.jp/en/spot/46/)地圖中心；[琵琶瀑布官方資料](https://miyoshi-tourism.jp/spot/88/3/)核對區域關係。
- [香川縣觀光協會金刀比羅宮](https://www.my-kagawa.jp/konpira/feature/kotohiragu/guide3)核對琴平區域，城市代表不是山頂精確預報。

## 測試與審查

- `node tests/home-v146.test.js`：日曆／閏年／invalid dates、目的地優先、區域座標、前後最近／等距／未知保守結果。
- `npx playwright test tests/browser/home-v146.spec.js`：19 項真實 DOM／runtime，固定 Asia/Tokyo、320／390px，涵蓋日期邊界／年份、同頁跨午夜／回前景／hidden／離頁、無自動授權清除、鍵盤入原預檢／待同步阻擋、祖谷 weather request、nearest child fallback、未知提示、標題／導航一致及全部略過不變。
- 基準 Node 109 檔零失敗。首次 RED 五項均是原缺陷：結束日誤判、祖谷錯用岡山、鄰近／子站回退、兩寬度串點標題。無區域空白另先 RED，原畫面只有採買列。RED 證據保留於獨立 QA temp folder。
- 首輪專項 14/14（20.2 秒）、完整 Node 110 檔及 Chromium 289/289（8.1 分鐘、零重試）通過。首次 Node 的 Date 建構守衛／五版歷史視窗兩項失敗已依原規則修正：日曆驗證不新增 Date 建構，五筆視窗正常滾動；未放寬原限制。
- 單次獨立審查的 timezone fixture Minor 先重現，再改成本機日曆中午；UTC／Asia/Tokyo／Pacific/Auckland／America/Los_Angeles 四時區通過。Important 同頁跨午夜／前景未更新先以真實 DOM 三項 RED 證實，再補單次 deadline／resume；三項 GREEN（7.4 秒）及保留 ongoing DOM／records、off-page／hidden 邊界驗證。最初 paused-clock 卡住啟動同步是 fixture 問題，修正為同步完成後再 pause 才取得有效 RED，未放寬產品斷言。
- 修正後 Home／weather／checked progress 51/51（2.1 分鐘）、完整 Node 110 檔、四項 gate／diff check 通過。審查者獨立 production-function probe 核對 deadline／ongoing DOM／timer replacement／idempotence／取消／resume，沒有未解 Critical／Important／Minor；不是第二次整批審查。文件不在其 code review 裁定範圍。
- 修正後兩首頁情境 × 六主題 × 320／375／390px 共 36 組：零橫向溢位、pageerror、health finding；截圖另行目視核對。CSS 全塊與 v145 相等；9 個 checked writer／progression／preflight／check-in 函式精確相等，120 個既有保護檔案 Git canonical bytes 不變。Windows checkout CRLF／原 generator LF 混用以 Git clean filter 核對，不把換行轉換誤報為改檔。
- 修正後首輪完整 Chromium 293 passed／1 failed（13.1 分鐘）：既有十次冷啟動 probe 超過 30 秒總時限，沒有放寬 timeout／斷言／retry。保留整批 log、trace／screenshots；trace 第十次 goto 在 28.83 秒開始，poll 在 29.615 秒開始後撞總時限，前九次均取得非零 first-render。當時並行 Git 逐檔核對及另組瀏覽器量測可能造成負載，屬推論，不冒稱已證實根因。同一測試隔離重跑 1/1（十次共 6.4 秒，整體 8.3 秒）；全為 v146 四件組、無空白，Today 中位 114.3ms、最大 160.2ms。停止其它 probe 後從零完整重跑 294/294（8.9 分鐘、零重試）通過；runtime、原 timeout／斷言／retry 不變。

原本機實作交付時尚未推送／合併／部署，變更保留在 `codex/personal-trip-lifecycle` 隔離 worktree；後續發布依上方新授權及正式證據。QA 證據位於 `C:/Users/Aaron Huang/AppData/Local/Temp/trippilot-v146-91af73b8243143509157722e41cf493c`：首輪／失敗／隔離／最終整批 log、RED／失敗 trace 與 UI screenshots 保留，沒有刪除來只留通過結果。

## PWA 與保護範圍

### 發布前 QA 等待競態（2026-10-05）

- 新鮮 Node 110 檔與四 gate 通過；完整 Chromium 293 passed／1 failed（11.9 分鐘）：mixed-generation 規格的 before report 為空、after 才出現原 QAGEN1 bytes，失敗 log／trace 保留於 `release-cache-failed`。未修正的同一規格隔離五次通過（29.8 秒），不以隔離成功取代根因調查。
- 查證本機 Playwright `coreBundle.js` 的 `waitForFunctionExpression`：predicate 未 await 就以 truthiness 判斷，async predicate 的 Promise 即為 truthy，僅回傳其第一次結果而不繼續輪詢。既有 `waitForActiveWorker`／`waitForShellCached` 因此可在條件 false 時提前完成；200ms 固定等待不是可靠的 readiness 保證。
- 新增真實瀏覽器 readiness regression：攔住 SW 下載時 controller 不存在、另建空測試 cache 時指定資產不存在，分別取得有效 RED；依序只改兩 helper 為 `expect.poll(()=>page.evaluate(async ...),{timeout:20000}).toBe(true)` 後五項 SW 專項全部 GREEN（16.1 秒）。原 20 秒等待／30 秒 test timeout、快取前後內容／混世代失敗／離線 assertions／0 retry 不变；未改產品 runtime。延續原審查僅核對此 QA 修正，不另開整批 runtime 審查。
- 原審查者延續核對此一 spec，確認兩 helper 嚴格等待解析出的 `true`、20 秒 timeout 與產品斷言不變，未發現 issue；`node --check` 通過。修正後完整 Node 110 檔、四 gate 與完整 Chromium 295/295（10.8 分鐘、0 retry）通過，`release-final-node.log`／`release-final-browser.log` 保留。產品 runtime 未修改；待 exact-head 遠端 CI，尚未合併。

新建 v146，版本／inventory／SW 路徑／header／活文件同步。原 v145 八表 CSV 與 timestamp 經既有 generator preview → write → readback 深度相等，只更新 generation；無 live CMS／Ledger fetch。v145／root v110、純 domain／生命週期 modules 不修改。回滾僅採正常內容建立下一未使用 generation forward bump，不刪 SW／資料、不倒退覆寫。

## 未驗證

實體 iPhone／Android PWA、真實 Google OAuth／Drive 上傳與閱讀器／真機鍵盤待 Bar 驗收；Playwright 假回應不等於真實授權通過。TP146-a～c 與既有清單保持未勾，見 [裝置驗收記錄](device-acceptance-log.md)。本版正式發布使用 Bar 本次明示的 G1 跳過授權，不沿用前版豁免，也不延續至下一版。
