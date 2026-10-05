# CURRENT(現在正在做的)

## 2026-10-05 — v146 發布核准（待 dev／PR exact-head CI／合併）

- Bar 指示 merge main，於明示本版 G1 未驗後選擇方案 2：本次跳過 G1，待 dev／PR 的 CI 通過才一般 merge 到 main，核對 Netlify 自動部署及正式站。跳過不是通過，不沿用至後續版本；TP146-a～c 與既有真機／閱讀器清單保持未勾。
- 本輪以已獨立審查的 v146 runtime 為準，只記錄發布核准，不擴大功能或修改凍結世代。先重新完整本機驗證，再提交／推 dev、PR、exact-head CI、merge、正式部署核對；不直接 push main、不 manual deploy、不 force push／清資料／刪 SW。已知 manifest B 索引 Minor 依前次裁定繼續暫緩。
- 發布前完整 Chromium 293/294 失敗已暫停提交，證實既有 async `waitForFunction` readiness 未真正輪詢；兩個有效 RED 後僅強化 SW spec 等待條件，原產品／斷言／timeout／retry 不改，五項 SW 專項 GREEN，原審查者延續核對無 issue。修正後 Node 110 檔／完整 Chromium 295/295（10.8 分鐘、0 retry）及四 gate 通過，失敗證據保留；待 dev／PR exact-head CI，詳見 v146 驗證。

## 2026-10-05 — v146 首頁三項調整（本機完成，未推送）

- Bar 確認 bounded 設計及 Tier 2 PWA 群組：結束後邀請打包、天氣當前區域／前後最近站點回退、串點突出實際下一站。全部略過、CSS／字級／尺寸／主題、帳務及封存不改。只核准本機執行，不 push／merge／部署。
- worktree 基準 `50d3a81` 等於 origin/dev。基準 Node 109 檔通過；五項原缺陷及無區域提示先 RED，首輪專項 browser 14/14、Node 110 檔及 Chromium 289/289 通過。首次 Date 建構／五版視窗失敗依原規則處理。單次獨立審查的 timezone fixture Minor／跨午夜更新 Important 已先重現再修正；四時區／Home-weather-progress 51/51／完整 Node 110 檔／四 gate 通過，沒有未解審查事項。ongoing 不重繪／改寫，hidden／離首頁／inactive 取消 deadline。修正後完整 browser 293 passed／1 冷啟動 probe 總時限失敗（13.1 分鐘）；trace 與隔離 1/1（十次 6.4 秒）已核對，停止並行 probe 後从零完整重跑 294/294（8.9 分鐘、零重試）通過，runtime／原 timeout／斷言／retry 不變，失敗證據保留。隔離 worktree 變更未提交／推送。
- generator 用原 v145 八表及 timestamp preview／write／readback 相等，無 live fetch；root v110、v145、生命週期／帳務／progression 不修改，CSS 全塊／9 個保護函式相等，120 個既有保護檔案不變。兩情境／六主題／三寬度 36 組零 overflow／pageerror／health finding。TP146-a～c、真機／真實 OAuth 未代驗，前版發布豁免不沿用。詳見 [v146 驗證](../docs/trippilot-v146-verification.md)。

## 2026-10-05 — v145 已正式發布（PR #41）

- dev exact head `0658516` 經一般 merge 合併至 main `9ce1c94`；兩個 parent 與 merged tree 核對，內容精確等於已測 dev。dev CI `37281008592`／PR CI `37281014747`／main CI `37281943628` sanity＋browser-qa 全部 success，各 browser 275/275（6.6／6.8／6.6 分鐘，0 retry）。本輪修正後本機 Node 109 檔／Chromium 275/275（8.5 分鐘）、四項 gate／保護範圍／diff check 通過。
- 首輪 dev／PR 各 264 passed／11 failed，暫停合併後確認新增 fixture 繼承 UTC，導致未出發日／下一站不同；隔離 probe RED→GREEN，只在兩份 spec 固定 Asia/Tokyo，預設 UTC 的 B/C 32/32 通過。原斷言／retry／runtime 不變，失敗證據保留；v145 runtime 仍為 `64b66ac`。
- Netlify automatic deploy `6ac35b5a3da9cf00087a02c0` 的 commit_ref 精確等於 `9ce1c940fca7e443653671cdc68051e0920e08c3`，published_at=`2026-10-05T08:10:12.015Z`，不是 manual deploy。§F5 實測：31 資產與 merge Git bytes 相等、兩處 no-cache／no-store header 正確；v144／v143 與 root v110 保留；28 個 cache 資產齊全、三件組 v145、離線重開非空、health／pageerror 均 0。
- annotated `production-v145` 已推送並指向 `9ce1c94`；G1 僅本次依 Bar 選項 2 跳過，TP144-a～c、TP145-a～c 與既有真機／閱讀器清單仍未勾。已知 manifest B 文件索引 Minor 暫緩；不擴大主題、字體、旅行內容、OAuth 或帳務範圍，不清資料、不刪 SW。發布後只補文件並同步 dev；工作樹與 QA 證據保留。第二批與後续功能須另核准。

## 2026-10-05 — v145 發布核准（本機 QA 通過，待遠端 CI／合併）

- Bar 選擇方案 2，明確核准本次跳過 G1 真機驗收，待 dev push／PR exact-head CI 通過後以一般 merge 合併 main，再核對正式部署。發布包含 v144 B 保存可靠性與 v145 C 天氣改善；舊版豁免不沿用，此核准亦不適用後續版本。
- TP144-a～c、TP145-a～c 與既有裝置／閱讀器待驗保持未勾。跳過不是通過；本機／遠端 CI 不代替真機。本輪本機基準 `c331a1b`、runtime `64b66ac`：完整 QA 重新執行通過，Node 109 個檔案、Chromium 275/275（8.5 分鐘、0 retry）、四項 gate／diff check 全過。發布授權文件另行提交，不修改已驗 runtime。
- 已 non-force push dev `758a0c0` 並建立 PR #41，尚未 merge／正式部署。首輪 dev CI `37278302918`／PR CI `37278373307` sanity 通過、browser 各 264 passed／11 failed，因此暫停合併。隔離 UTC probe 重現「10/17 未出發」與下一站城市 fixture 差異，只改瀏覽器 timezone 為 Asia/Tokyo 後兩項通過；兩份新增 spec 補固定時區，斷言／retry／runtime 不變。修正後預設 UTC 的 B/C 32/32（56.3 秒）、完整 Node 109 檔／Chromium 275/275（8.5 分鐘、0 retry）與四項 gate／diff check 通過；仍須新 exact-head 遠端 CI 通過才合併。
- 既有一項 manifest B 證據索引 Minor 保持暫緩，沒有順便修改 runtime／旅行內容／OAuth。復原採下一未使用 generation forward-bump，不覆寫已發布外殼、不刪 SW／個人資料。

## 2026-10-05 — v145 C：天氣有效性與重試（本機完成，未推送）

- Bar 明確確認 C 四點／Tier 2 PWA 群組：保留 B 五筆本機提交，從 v144 建立未使用 v145；沿用原 CSV／timestamp、來源及 3h TTL，不做 live fetch、不放大全域字體。本次只實作／提交，不 push、merge 或部署。
- 城市、取得時間（日本時間）、fresh／expired／unavailable／loading 共用同一品質投影；不顯示過期數字，合法 0°C／0% 保留，未知降雨不補 0% 或宣稱適合出發。每小時資料依 API 的日本本地時間解讀，不依手機時區。
- 每次首頁讀取重新判斷 session 年齡；loading 去重、failed 保留至手動重試。request identity／epoch／active trip 在 cache write 前守門，只有目前城市及 Today 可 redraw。清除 UI 使舊請求失效；cache 寫入拒絕仍可用本 session 資料，只記去敏診斷。
- 審查前 runtime `b0f88b4`／QA fixture `f105bc5`：Node 109 個檔案、完整 Chromium 270/270（8.2 分鐘，0 retry）、四項 gate／diff check 通過。第一輪因舊導航 observer 起點錯誤中止，修正測試後從零重跑；導航 runtime 不變。前代／B／schema/domain／種子核對通過。
- 單次 Astra xhigh fresh-context 審查指出兩項 Important，已先 RED 再集中修正：同頁 foreground／pageshow 也失效；過去 0% 不補未來缺值。單次到期 timer 只失效、不背景抓取；只更新天氣 DOM，保留下一站焦點／紀錄與 retry Tab 順序。最終 runtime `64b66ac`：Node 109 檔、天氣 18/18、受影響 browser 53/53、完整 Chromium 275/275（8.8 分鐘，0 retry）、四項 gate／diff check 全過；未派第二輪 reviewer。一項文件索引 Minor 暫緩。裁定、保留限制與證據見 [C 驗證記錄](../docs/trippilot-v145-c-verification.md)。
- TP145-a～c 與既有 B／其他真機項目仍待驗；沒有沿用 v143 的發布豁免。分類管理／備份檔案／過往旅程列表／連接新旅程不在本批。

## 2026-10-05 — v144 B：本機行程保存可靠性（本機完成，未推送）

- Bar 確認 B 的 Tier 2 PWA 群組：從已發布 v143 建立未使用 v144，限定打卡／完成／略過／自動略過與復原；不改帳務、格式、主題、字體或天氣。隔離 worktree 基準 765f710=origin/dev，未 push／merge／部署。
- Checked reader 拒絕讀取失敗／壞 JSON／錯誤型別，不以空值覆寫；writer 先序列化、保留原 bytes／不存在狀態，再寫入與讀回核對。失败盡力恢復並核對，不能恢復則提示可能不完整；不是跨分頁交易。
- 成功才更新成功提示與 undo。復原失敗保留快照及重試按鈕，包含原 autoSkip；失敗重繪只讀真實紀錄，無法讀取不宣稱已完成。自動失敗在本次 session 暫停自動寫入，成功手動操作解除；不新增持久化 journal／鎖。資料健康既有個人列顯示 session 錯誤。
- 既有 generator 僅用 v143 原 CSV preview／write／readback，八表與 timestamp 深度相等、未讀 live CSV／Ledger。v143、root v110 與純 progression module 均未改；SW／header／assets／活文件對齊 v144。
- 最終 runtime `900109c`：Node 108 個檔案、persistence 26/26、故障 browser 14/14 與完整 Chromium 257/257（10.7 分鐘、0 retry），四項 gate／diff check／保護範圍核對通過。Astra 整批審查四項 Important 全部先 RED 再單輪修正：過時取消、群組復原、拒絕讀取的重試及鍵盤焦點；修正後完整 QA 複驗，無暫緩 Minor。本機完成，不等於發布。詳見 [驗證記錄](../docs/trippilot-v144-b-verification.md)。
- TP144-a～c 真機待驗；本次核准不含 push dev 或 main 發布。B 使用者驗收後才開始 C 天氣；後續配色／modal／分類／備份／旅程歷史及新旅程仍待排程。

## 2026-10-04 — v143 已正式發布（PR #40）

- dev exact head a54b22b 經一般 merge 合併至 main 13f46c3。dev CI 37175537927／PR CI 37175540832／main CI 37175940208 皆 success，各 browser 243/243；本機發布前 Node 107/107、匯出六項 browser、四項 gate／diff check 全過。
- Netlify deploy 6ac1d06230acd90008a24a16 的 commit_ref 精確等於 13f46c370f5ea4bafd3226b4f7b1af27ef846ff4，published_at=2026-10-04T04:04:59.963Z。§F5 實測：31 資產與 merge commit bytes 相等、兩處 header 正確、v142／v110 保留；28 個 cache 資產齊全、三件組 v143、離線重開／非空／pageerror 0，匯出入口與說明 dialog 於正式站確認。
- annotated production-v143 已推送，指向 13f46c3。G1 僅本次依 Bar 選項 2 跳過，TP143-a～c 與既有真機清單保持未勾。記序匯入未實作，備份 v9／封存 v1／OAuth Testing 不變。發布後僅補文件並同步 dev，不熱修 v143 runtime。

## 2026-10-04 — v143 發布核准，待遠端 CI／合併

- Bar 明確選擇方案 2：本次跳過 G1，待 CI 通過後合併 main 並核對正式部署。此裁定僅適用 v143，TP143-a～c 與既有真機清單保持未勾；跳過不等於驗收通過。
- 推送前重新跑 Node 107/107、匯出／modal 六項 browser、四項 gate／diff check 通過；runtime 為 fb90ed4，新增本節僅記錄核准。dev／PR exact-head CI 通過後才 merge；正式站此刻仍 v142。

## 2026-10-04 — v143 本機完成，未推送

- Bar 核准獨立個人帳 JSON 下載及 ⓘ 說明 modal；限定資料與版本，不實作記序匯入，不更動備份 v9／封存 v1／CMS／帳務計算。
- 已核准 Tier 2 generation 群組：建立 v143，SW／assets／header 同步；generator 僅採 v142 種子 CSV，沒有 live fetch。v142 與 root v110 保持不可變；復原採下一個未使用版本 forward bump，不刪 SW。
- 最終 Node **107/107**、Chromium **243/243**（6.9 分鐘，0 retry）、四項 gate／diff check 全過；獨立審查兩項 Important 經一輪修正覆核已解決。詳見 [交付驗證](../docs/trippilot-v143-verification.md)。本機完成，未 push dev／main、未部署；正式站仍 v142。
- TP143-a：真機下載後確認檔案可開啟、筆數／金額／代購正確且原帳完整；TP143-b：ⓘ 關閉、閱讀器及鍵盤焦點；TP143-c：清除前先保存檔案。以上均未驗，不代勾。

> 現況基準(2026-10-03):正式站與 `origin/main` 已為 v142（PR #39／`07d4581`）。本次依 Bar 在 G1 提醒後再次指示 merge 發布；真機待驗不代勾。下方逐版段落保留歷史事實，最新證據見本節及 `07_CHANGELOG.md`。

## 2026-10-03 — v142 已正式發布（PR #39）

- dev exact head `11cd2e6` 經一般 merge 合併至 main `07d4581`；dev CI `37130214421`、PR CI `37130217277`、main CI `37130726114` 全數 success，各 browser 237/237；本輪重新跑 Node 106/106 與四項 gate 全過。
- Netlify deploy `6ac114efbcf7f4000841eb69` 的 `commit_ref` 精確等於 merge commit，`published_at=2026-10-03T14:45:13.177Z`。§F5 核對通過：31 個資產與 merge commit bytes 相等、兩處 cache header 正確、root bridge v110／前代 v141 保留；隔離 Chromium 的 28 個 cache 資產完整、三件組 v142、非空畫面、離線重開及 pageerror 0。
- annotated tag `production-v142` 已推送，指向 `07d4581`。Bar 在明示本次 G1 尚未驗及可選先驗／跳過的提醒後，再指定「merge into main」；據此本次跳過 G1 發布，不等於驗收通過、不適用下一版。TP142-a～d、既有封存／Android／閱讀器與實體鍵盤項目仍待驗。
- 僅 A 批已發布；B／C 仍待 A 使用者驗收。分類管理、備份檔案匯入／下載、旅程列表及連接新旅程尚未實作；OAuth Testing、備份 v9／封存 v1 保持不變。發布後僅補文件，不就地修改 v142 runtime。

## 2026-10-03 — v142 已推 dev，PR #39 等待發布 gate（合併前紀錄）

- Bar 指示推送 dev 並合併 main；`f06d2c5` 已非 force 推送至 dev，PR [#39](https://github.com/nick80912-dev/ai-native-projects/pull/39) 已建立。此次發布前重新驗證 Node **106/106**、Chromium **237/237**（7.7 分鐘）、四項 gate 與 diff check 全過。
- 此紀錄當下 dev／PR exact-head CI 與 Pages 正在執行，尚不宣稱通過。正式 main 仍 `ead11ff`／v141；尚未合併、部署或建立 v142 production tag。
- v142 G1 真機未驗；已詢問 Bar 是否本次明確跳過，尚待裁定。v141 豁免不沿用；TP142-a～d、既有 PWA 與 Android 待驗保持未勾。A 實際使用驗收後才進 B／C。

## 2026-10-03 — A 批 v142 本機候選完成（以下為推送前紀錄）

- 使用者同意開始設計，要求字體／尺寸不要過大而影響操作與視覺。設計分為狀態與摘要、本機寫入可靠性、天氣資訊三個可獨立驗收子批次。
- 使用者已確認設計、選擇 Native 逐步實作及整批獨立審查，核准 A 執行；另核准以原 v141 CSV 輸入經既有 generator 重產 v142 版本綁定種子，不抓 live CSV／Ledger。原內容及 timestamp 深度相等；v141／root v110 均未修改。
- A 區分想逛店家／待買商品及採買記帳狀態；帳務詳情以本機、待送出、接收待讀回、已讀回的現有證據呈現。金額／數量／allocation／schema／備份 v9／封存 v1／OAuth 不變。只調整四個已量測小字 selector 為 11px，主要尺寸保留，見[字體盤點](../docs/ui-font-audit-2026-10-03.md)。
- runtime commit `38da9a3` 最終 Node **106/106**、Chromium Playwright **237/237**（6.4 分鐘）、四項 gate／diff check 全過；三情境 healthCheck／pageerror、SW 更新／混世代防線、離線與六主題／三寬度都有回歸。此為本機證據，不代表已部署。runtime 推 dev 與 main 發布尚未核准；正式站仍 v141。A 驗收後才進 B，本輪不進 C／分類管理／備份／過往旅程列表。
- Astra 審查的三項 Important 經一輪 RED→GREEN 修正並完整複驗；原中斷日誌不算通過。永久行程狀態、split-group 購買進度及真實可見帳務詳情測試已補齊。資料健康跨模式 backlog 未註記列為 Minor #52 待後續處理。裁定／限制與測試證據見[交付驗證](../docs/trippilot-v142-a-verification.md)；真機不代勾。

## v114 已正式發布(2026-09-10)
- PR #16 以 **merge**(非 squash／rebase)合併 `dev` `064e932` → `main`,merge commit **`39c96b2`**;合併前確認 head 未變,且該 head 的遠端 CI `sanity` 與 **`browser-qa`** 皆 success。
- Netlify 由 `main` 自動部署 deploy **`6aa25e07`**,`commit_ref` = `39c96b2`、`published_at` 有值。§F5 線上核對五項全過(SW v114／generation 三件組 v114／root bridge v110／兩處 cache header 正確)。
- **G1 的 iPhone 半邊已於 2026-09-11 補驗完成**:BB1–BB3 共 14 項由 Bar 在 iPhone 上確認全數通過。發布當下 G1 經 Bar 裁定跳過,現已補齊;**BB4 的 8 項實體 Android 仍未驗**。
- **G6 完成**:依 Bar 指示建立並推送 annotated tag `production-v114`,指向 `39c96b2`(正式站實際服務的 commit)。Tag 訊息明文記錄 G1 未執行。

### v114 交付內容(保留紀錄)
- A/B 實測(v113):同步完成後會強制彈出身分牆,使用者在「今天」頁、零互動就被全螢幕擋住且退不出去。觸發點是**同步完成**,不是 boot 也不是進入分帳;v112 只移除了 boot 觸發。
- 修正四處:同步完成不再自動彈出;進分帳的選擇器改為可取消;記住待前往的分頁;確認後接續前往。送出記帳／結算／切測試模式維持 forced。
- 動工前先驗過最大風險:**沒有身分時進分帳頁渲染完全正常**(無 throw、`healthCheck()` 空、pageerror 0、溢位 0)。
- 新增 `tests/browser/member-gate.spec.js` 六個規格;其中一條在實作階段抓到真缺陷(`closeMemberSelector()` 會先清掉待前往目的地),已修。
- **六組主題色一律未動** —— v114 不含配色變更。
- **2026-09-10 Bar 裁定:跳過 G1 真機驗收,直接走 `dev → main` merge 發布。** BB1–BB3 共 14 項維持未勾 —— 跳過不等於通過,清單保留供日後補驗。
- Netlify 測試站 `dev-trippilot-jp` 已於 **2026-09-10 由 Bar 永久刪除**(該站當時的 v114 deploy `6aa25ba7` 一併消失)。`16_OPS_PLAYBOOK.md` 已改為單站模型,§F5 由「發布前置核對」改寫為「正式站發布後線上核對」。
- **`production-v114` 已於 G6 建立**(見上)。G1 的 iPhone 半邊 2026-09-11 補驗通過,**Android 半邊(BB4)仍缺**。

## v113 優先主題辨識度(已由 v114 接續,保留紀錄)
- v112 已隨 v114 上線;**Android 實體手機驗收已併入 v114 清單的 BB4**(2026-09-10 Bar 裁定),不再單獨掛著。
- v113 只調整杉綠、霧藍、焙茶三組既有 palette；Ocean、Ivory、Wisteria、版面、資料與互動行為不變。
- 三組 page surface、accent 與 secondary 已拉開；主要文字／操作色維持 WCAG AA，390×844 畫面無 overflow。
- 本機及 merged tree 的 Node **94/94**、Playwright **185/185** 與三情境健康檢查通過；已推送 `dev`／`main`。
- **正式部署已完成（2026-09-08）**：Netlify production deploy `6a9fb443`，`commit_ref` = `745bb6f`（與 `origin/main` HEAD 相符），`published_at` 有值；線上 `sw.js` 與 `shell/v121/app-version.js` 皆為 `v113`。**尚待 Bar 對三組主題做裝置驗收。** <!-- generation-exempt: 這是 2026-09-08 v113 正式部署當下的線上事實,不隨後續升版變動 -->


## 治理層 gate:活文件 generation 一致性(2026-09-09,dev)
- 新增 `tools/check-doc-generation.js` + `tests/doc-generation.test.js`,已接進 `qa.yml` 的 `sanity` job。
- 修掉 17 處指向 `shell/v111/` 的活文件漂移(`02`、`10`);`08` 第 22 行屬歷史段落,改用逐行 `generation-exempt`。
- `13_PROJECT_STATUS.md` 落後 40 個版本,已改寫為指向 `tasks/current.md` 的薄指標,不再手抄第二份狀態表。
- **無 runtime 變更**,不升版、不影響 v113 的裝置驗收與 production tag 條件。

## 治理層:08 交接文件收斂(2026-09-10,dev)
- `08_AI_HANDOVER.md` 132 → 100 行,刪除 v110–v113 四段逐版 handover(與 `07_CHANGELOG.md` 重複)。
- 只存在於被刪段落的 v110 bridge byte-lock 禁改事項已移入「絕不可改變」,未遺失。
- 順帶修掉住宿 HID 契約裡指向已刪段落的交付順序敘述。
- **無 runtime 變更**。

## v113 三組主題 G1:已完成(2026-09-11 Bar iPhone 確認)
- `docs/device-acceptance-log.md` 的 v113 delta 清單(Z1／Z2／Z3 共 14 項)**已全數通過**:Z1-a、Z2-a 於 2026-09-10 通過,其餘 12 項於 **2026-09-11** 由 Bar 在 iPhone 上確認。
- 桌機預檢:36 組寬度×分頁水平溢位全 0、對比全數 ≥4.5、pageerror 0、`healthCheck()` 空;三組截圖已交付。
- **兩個貼門檻的值已由 Bar 在真機判定通過**(2026-09-10 的 Z1-a／Z2-a):杉綠↔霧藍／杉綠↔焙茶底色距離 12(門檻 10);焙茶操作色對比 4.53(門檻 4.5)。
- G1 是 Bar 專屬職責,**AI 不得因桌機全綠而代勾** —— 本次回填依據為 Bar 2026-09-11 明示的驗收結論。**`production-v113` 已於 2026-09-11 回溯補建**,指向 `745bb6f`(deploy `6a9fb443` 的 `commit_ref`)。



> 現況更新於 2026-10-01。細任務層;里程碑看 `06_ROADMAP.md`,**逐版交付紀錄一律看 `07_CHANGELOG.md`**,正式待辦看 `tasks/backlog.md`。
> 本檔只回答三件事:**現在線上是什麼、dev 上是什麼、下一批要做什麼**。歷史流水帳不放這裡。

## 📌 現況

v143 已透過 `dev → main` PR #40 合併並完成正式站部署核對。G1 本次跳過；TP143-a～c 與既有真機項目保持待驗，OAuth Testing 不變。

| 項目 | 值 |
|---|---|
| **`origin/main` 原始碼** | **SW v143**；merge commit `13f46c3`（PR #40） |
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v143**；deploy `6ac1d06230acd90008a24a16`，`commit_ref` = `13f46c3`，§F5／快取／離線核對通過。G1 跳過，真機封存與 Android BB4 仍待驗 |
| **`dev` 內容** | **v143**，runtime `fb90ed4`、推送 `a54b22b`；本機 Node 107/107、Chromium 243/243、四項 gate 通過；main merge 已同步，發布後僅補文件。採買分類尚未實作，OAuth 仍 External Testing |
| 個人備份格式 | **v9**(`PERSONAL_STATE_SUPPORTED_VERSIONS = [1..9]`)—— v81 因想逛 key 識別語意變更而升版 |
| 最近一次 v141 發版驗證 | 本機 Node **102/102**、Chromium Playwright **227/227**、四項 gate 通過；dev／PR CI sanity 和 browser-qa 全過，main CI 另核對 Actions `36878885081` |
| 最新正式 tag | **`production-v143`**，指向 `13f46c3`；訊息明記 G1 跳過 |

**v143 已發布至正式站，`production-v143` tag 已建立；G1 跳過不等於通過，實體手機驗收清單保持待驗。**

## v140 資料健康獨立子頁（已隨 PR #37 正式發布；下列保留開發階段紀錄）

- Bar 核准「資料健康狀態」與照片健康同層，設定資料區四個入口固定排序；根頁保留健康摘要，子頁直接顯示既有四項明細，不需再展開，返回設定首頁。
- 資料與版本移除重複健康區塊；重置、清除並打包、備份／還原、版本、照片檢查與過往旅程行為不變。不改健康 model、八表／Ledger、個人資料、Drive／OAuth 或生命週期契約。
- C 級／Tier 2 已核准，重用隔離 worktree，以 v140 forward bump 保留 v139 原樣；BUILTIN 只用核准八表資料經 generator preview／write／readback，無 live Ledger。回復只能 v141 forward bump，不刪 SW。
- 最終本機 Node **100/100**、Chromium Playwright **222/222**（6.6 分鐘）、三情境 healthCheck／pageerror、SW 換代／離線與四項 gate／diff check 通過；獨立審查無 Critical／Important／Minor。CUA 已核對本機 v140 四入口及直接四明細。遠端 CI／Pages 於推送後核對；實體 iPhone／Android 待驗，見裝置驗收清單。

## v139 健康收合重繪競態修正（dev 交付歷史；尚未正式發布）

- 遠端 CI `36810889354` 在 v138 鍵盤收合後立即重繪案例失敗（218/219）；本機 219/219 曾通過，但不能當作遠端全綠。原生 details 的 open 屬性先更新、toggle 事件後到，renderer 讀到舊記憶體狀態。
- 新增同一 task 中原生 summary.click 與立即重繪的確定性 RED，v138 原生展開 true 被重繪成 false；v139 重繪／切頁／關閉前先讀 open，忽略已移除 details 的晚到 toggle。維持 session-only，未修改資料、帳務或 OAuth 契約。
- v138 保持不可變、增加 byte-lock；v139 BUILTIN 只由既有 generator 以已核准八表 snapshot preview／write／readback，不取 live Ledger。最終本機 Node **100/100**、Playwright **220/220**（6.5 分鐘）、四項 gate 與 diff check 通過；獨立複審無 Critical／Important／Minor，另驗快速切頁與 detached toggle。按原核准範圍推 dev；不發布正式站。

## v138 設定整理（dev 交付歷史；尚未正式發布）

- 「設定 → 資料」增加獨立「過往旅程」子項，位於照片健康狀態和備份／還原／版本之間；返回設定首頁，清除後首頁亦直達同頁，移除資料與版本內的重複入口。
- 資料健康狀態預設收合、摘要常駐，支援鍵盤開關與當次 session 展開狀態；不修改資料或摘要判定來源。Google SDK 冷載入後由明確點擊授權，不在非使用者手勢的 callback 開 popup。
- 最終本機 QA：Node **100/100** 測試檔、Chromium Playwright **219/219**（6.4 分鐘），包含三情境 healthCheck／pageerror 與 SW 換代／離線 gate；四項文件／版本／資產檢查與 diff check 通過。獨立審查無 Critical／Important／Minor；v110／v136／v137 與原八表快照保持不可變。
- `89a4424` 已推 dev，Pages 部署 `36810889093` 成功，線上 v138 三件組與 root v110／舊 v137 核對通過；正式站 v136 與 main 未變。遠端 sanity 通過，但 browser-qa 218/219，故由上方 v139 修正，不宣稱遠端全綠。
- Bar 已在 Codex 內建瀏覽器實際登入 `nick80912@gmail.com`，助手確認過往旅程列表顯示「尚無過往旅程」。這只證明該瀏覽器登入／列表讀取，不代表 iPhone／Android PWA、封存上傳或清除驗收通過。
- 延續 TP137-a～i 的真機待驗項目；新增 UI delta 見 `docs/device-acceptance-log.md` v138。正式站仍為 v136；問題回復以 v139 forward bump，不覆寫 v137／v138，不刪 Service Worker。

## v137 個人旅程生命週期（dev 交付歷史；尚未正式發布）

- 設定頁新增「重置紀錄」、「清除並打包旅程」、「過往旅程」；清除後首頁顯示無進行中旅程，不提供第一階段尚未完成的串接新旅程。
- 重置保留團體帳 Queue／鎖定帳務。清除前兩次完整抓取八表並檢查正式帳結清、pending claim、Queue／bridge 和摘要；可選 Drive 個人封存或直接清除，兩者都只清本機資料。封存唯讀，筆記追加。
- Google Cloud 專案 `trippilot-510301` 的 Drive API、OAuth External Testing、`drive.file` 與兩站 Web client 來源已設定；只有 Bar 是測試使用者。真實 iPhone／Android PWA OAuth、Drive 上傳讀回與清除重啟尚未驗，不宣稱正式可用。
- 最終本機 QA：Node **100/100** 測試檔、Chromium Playwright **215/215**（三情境及 pageerror gate 包含於套件），文件標題／版本／generation／runtime assets 四項檢查與 diff check 通過。Drive 使用假網路回應；Astra 複審的跨分頁、封存重試、晚到授權／照片／共用設定與筆記競態均已修復。
- 真機逐項清單見 `docs/device-acceptance-log.md` TP137-a～i；先驗登入，正式帳未結清時清除被阻擋是預期，不改團體帳來湊驗收條件。
- 驗收與回滾依 ADR 0020 及 `16_OPS_PLAYBOOK.md` §A2。正式站仍為 v136，不自行 merge main、建 production tag 或公開發布 OAuth app。

### v74–v98 已折疊的主要能力

| 版本 | 能力 |
|---|---|
| v74 | 設定根頁三群組;測試模式移出根頁,獨立控制頁 |
| v75 | 採買照片附件(只存本機 IndexedDB,不進備份);同名地點依目前位置導航 |
| v76 | 採買多選全選(限目前分頁) |
| v77 | 偵測本機照片遺失並可修復;設定頁附件容量與清理 |
| v78 | 離線首屏不再等待遠端字體;渲染失敗可重試;Today 觸控與 reduced-motion |
| v79 | 設定圖示改為圓角六齒 |
| v80 | 六主題固定淺色(移除 v78 的自動暗色);設定圖示放大;完成鈕不再被長地點名稱擠掉 |
| v81 | 完成／跳過單行省略號;**購物頁十項修正** —— 想逛穩定 key(含備份升 v9)、就地更新、搜尋空殼與分類比對、onclick 跳脫、店家列無障礙、想逛獨立模式、一鍵清除想逛、採買清單入口、chip 語意、搜尋一鍵清除 |
| v82 | **操作脈絡保存**:分頁各自記住捲動位置、明確入口意圖優先、行程面板展開狀態不再被打卡收合、打卡改為可鍵盤操作的 checkbox(含焦點還原與 fallback)、新增「回到現在」 |
| v83 | 「回到現在」收斂為**只在跨日時出現** —— 真機回饋指出它與「隱藏已完成」雷同,實測確認在今天那一天時「現在」永遠落在第一屏內,回頂已能到達 |
| v84 | **Today 即時資訊**:下一站待買(可直接開到採買清單對應站點)、降雨改為「現在之後」的最高值、付款與提醒收合、購物搜尋結果摘要 |
| v85 | 修正 v84 引入的缺陷:點「其他資訊」會誤觸整張卡的導覽而跳進行程分頁 —— `<details>` 被放進 `role="button"` 內部。移出卡片本體,並加上「可點擊卡片內不得有巢狀互動元素」的結構不變式 |
| v86 | **Today 採買提醒精簡**:Today 排除目前下一站並重新計數;下一站整列改為右上 44px badge;摘要最多兩站、每站三項，更多地點以 inline 標記呈現;天氣視覺文字縮短且保留完整 aria 語意 |
| v87 | **兩個真機回報的 UI 缺陷**:身分選擇器被設定頁遮住(z-index 130 vs 170,只在從設定頁叫出時疊高並讓背景 inert);再點目前分頁回頂會閃(改為攔截式平滑捲動,不重繪、不動 `.view.active`) |
| v88 | **資料可感知性**:分帳首頁以今日支出為主、旅程累計為次，個人／團體文案分流；正常同步標籤精簡，partial／失敗來源與資料時間可查；設定頁集中顯示行程、團體帳、個人帳與照片健康摘要 |
| v89 | **代購標記同行**:個人消費卡把「幫 [姓名] 買」移到品名旁，與採買卡共用 renderer；「幫／買」縮為 9.5px，長品名／姓名在左欄安全換行 |
| v92 | **Ledger 共用金額計算器**：單品、多品項與折扣共用安全四則 parser 與底部 sheet；資料 target 套用、即時換算、取消不改值、inert／焦點／scroll 還原 |
| v93 | **Buy-to-Ledger 架構收斂**：採買轉記帳以純 domain module 與 workflow coordinator 統一路徑；保留既有 UI／資料格式與 Ledger 成功後 link 失敗的防重複降級語意 |
| v94 | **計算金額更直覺**：五列四欄計算機支援小數、購物式百分比、等號與實體鍵盤；正數小數在提示後無條件捨去套用 |
| v95 | **Ledger UI state seam**：帳本軌、完整紀錄、篩選／分組與多選共用不可變 transition + ordered effects workflow；UI／資料語意不變 |
| v96 | **發布阻斷補正**：照片 quota 失敗提供「管理儲存空間」直接入口；計算機 `=` 後可接 `%`；同步 ADR／runtime 文件索引 |
| v97 | **Ledger entry session state seam**：同一 module 接管新增／編輯 lifecycle、draft／editing ownership、save pending、calendar 與返回脈絡；以 session／request ID 防重複提交及 stale completion |
| v98 | **更正操作列遮罩修正**：更正多品項收據捲動時，金額計算機入口不再穿透顯示於 sticky 預覽／作廢／取消操作列；後續 dev UI delta 將單品新增消費收斂為分攤按需展開與單一其他資訊入口，未再升 SW 版次 |
| v98 後續 dev delta | **UI workflow/state 架構模組化＋品質／呈現強化**：Shopping form session、下一站 reconciliation、Ledger correction、runtime asset inventory、AppLog session 診斷、Sheet 800ms 退避與 Toast null fallback；Ledger 清單卡固定兩行並隱藏付款方式；Shopping 明細以「筆」合併記帳狀態，待確認時預先停用重複記帳入口。未另占 runtime 版本 |

> v45–v73 的逐版交付紀錄見 `07_CHANGELOG.md`,不在本檔重述。

## 🚦 Release Gate(發布前必過,與 backlog 分離)

> 2026-07-30 依 Bar 裁定第 4 項設立。本節列的是**發布條件**,不是待開發項目。已歸檔項目見 `tasks/done.md`。

### v73(已完成發布)

| # | Gate | 狀態 |
|---|---|---|
| G1 | SW v73 Bar 真機／PWA 驗收 | ✅ 2026-08-01,清單見 `docs/device-acceptance-log.md` |
| G2 | 批次一發布阻斷項全數交付且全套自動驗證通過 | ✅ |
| G3 | `main` 現況建立回滾 tag | ✅ `production-v18` |
| R1 | 遠端 CI 證據 | ✅ head `9ec2c21`,run `30682429659`,`sanity` + `browser-qa` success |
| G4 | Bar 核准 PR merge `dev → main` | ✅ PR #11,merge commit `17c423f` |
| G5 | Netlify 正式站部署後線上驗證 | ✅ deploy `6a6d6be3`,線上 `sw.js`／`app-version.js` 皆 v73 |
| G6 | 建立 annotated tag `production-v73` | ✅ tag 物件 `64e8d0b` |

### v74–v96（已合併 main，尚未部署）

| # | Gate | 狀態 |
|---|---|---|
| G1' | v74–v87 累積 delta 的 Bar 真機／PWA 驗收 | ✅ 2026-08-03，Bar 確認真機驗收皆正常 |
| G1'' | v88–v89、v92–v95 畫面／真機確認 | ✅ 2026-08-08，Bar 確認皆已完成 |
| G4' | Bar 核准 PR merge `dev → main` | ✅ PR #13，merge commit `02705c3` |
| G5' | 正式站部署後線上驗證 | 🗄 **已被後續版本取代** —— 原記「Netlify 額度用罄，正式站仍為 v73」，該狀態早已解除；正式站其後歷經 v110／v111／v112／v113，現為 **v113** |
| G6' | 建立 `production-v96` tag | 🗄 **已被後續版本取代** —— v96 不再單獨發 tag；tag 已推進至 `production-v111`，v112／v113 依 §E 待裝置驗收後才建 |

> G1／G4／G5 為 Bar 專屬職責;AI 不得以自動驗證全綠為由推進。
> **正式站發布後核對**:Netlify 測試站已於 2026-09-10 永久刪除,發布前沒有 Netlify 驗證通道。每次正式站部署後必須依 `16_OPS_PLAYBOOK.md` §F5 核對線上 `sw.js`／`app-version.js` 版本、header 行為與 CacheStorage 實際內容,**不得只看 merge 成功或 Netlify 顯示 ready**。

## ▶️ 五頁優化 roadmap 進度

2026-08-02 核定,切成可獨立驗收的批次,每批鎖定一個版本。

| 版本 | 主題 | 狀態 |
|---|---|---|
| v82 | 操作脈絡保存:捲動位置、入口意圖、面板展開、打卡無障礙、回到現在 | ✅ 已交付 |
| v83 | 「回到現在」依真機回饋收斂為只在跨日時出現 | ✅ 已交付 |
| v84 | Today 即時資訊:下一站待買、現在之後的降雨、次要資訊收合、購物搜尋摘要 | ✅ 已交付 |
| v85 | (已用於 v84 缺陷修正,見上表) | ✅ 已交付 |
| v86 | Today 採買提醒精簡:排除下一站、右上 badge、兩列摘要與長站名安全截斷 | ✅ 已交付 |
| v87 | 真機缺陷修正:身分選擇器被設定頁遮住、再點目前分頁回頂會閃 | ✅ 已交付 |
| v88 | 資料可感知性:今日支出與旅程累計、精簡同步標籤與 partial 失敗來源、個人／團體脈絡分離、設定頁資料健康摘要 | ✅ 已交付至 dev |
| v89 | 消費／採買代購標記同行:最近消費移除下方代購列，與採買卡共用「幫 [姓名] 買」 | ✅ 已交付至 dev |
| v92 | Ledger 共用金額計算器：單品、多品項、折扣、安全 parser、資料 target 與手機操作脈絡 | ✅ 已交付至 dev |
| v93 | Buy-to-Ledger 垂直切片：characterization、純 domain、workflow coordinator 與正式 runtime seam | ✅ 已交付至 dev |
| v94 | Ledger 計算機小數、購物式百分比、等號、實體鍵盤與套用時無條件捨去 | ✅ 已交付至 dev |
| v95 | Ledger UI 歷史瀏覽 workflow／state seam：帳本軌、完整紀錄、filters、selection 與 ordered UI effects | ✅ 已交付至 dev |
| v96 | Release review 補正：照片 quota 直接管理入口、`=` 後 `%`、ADR／架構索引同步 | ✅ 已由 PR #13 合併 main；正式部署暫停 |
| v97 | Ledger create／edit entry session workflow／state seam：lifecycle、draft／editing ownership、save guard、calendar、return context 與 ordered effects | ✅ 已交付至本機 dev，完整 gate 通過 |
| v98 | 更正收據 sticky 操作列遮罩：捲動時不再浮出品項金額計算機入口 | ✅ 已完成，完整 gate 通過 |
| v99／v100 | SW 更新提示雙版本實驗；實機確認事件時機與已顯示內容不同步，產品必要性不足 | ⛔ 實驗結束；由 Bar 取消，不列為完成功能 |
| v101 | 移除全域 SW 更新提示；杉綠 action 改為林下青 `#2F6B4F`，SW lifecycle／cache／offline 與資料不變 | ✅ 2026-08-11 Bar 裝置／PWA 外觀驗收完成 |
| v102 | 住宿停靠點改以 Places.HID 精確關聯 Hotels.HID；Schema 3.0、條件驗證、BUILTIN 與 exact resolver 同步 | ✅ 最終 whole-branch review、完整 gate、dev push（`ffc9aae`）與 Bar 裝置／PWA驗收完成 |
| v103–v107 | Today Hero 旅行提示、採買摘要分類／對齊／未分類 fallback；原始採買資料與既有 next-stop authority 不變 | ✅ 已完成自動驗證；歷史細節見 `07_CHANGELOG.md` |
| v108 | transient exact-target navigation、可見定位／scroll／focus return、display-only diagnostic impact、manifest status authority | ✅ final review／完整 gate／dev delivery；Bar 驗收中提出成功提示列精簡修正 |
| v109 | 成功定位提示列移除、1 秒醒目＋0.2 秒淡出、失敗提示保留 | ✅ Bar device／PWA acceptance complete |
| v110 | UI semantic tokens 與 Today deep-module extraction（原 v109） | ✅ Bar 驗收、main merge、production verification、tag 完成 |
| v111 | BUILTIN asset spike 與 test throughput（原 v110） | ✅ main merge、production verification、tag 完成 |
| v112 | 行程 UI/UX 精簡、延後身分選擇、空狀態 CTA、Android PWA 相容 | ✅ 已隨 v114 上線;**Android 實體手機驗收已併入 v114 清單的 BB4** |
| v113 | 杉綠／霧藍／焙茶優先配色辨識度 | ✅ `dev`／`main` 已推送、merged-tree gate 通過、**Netlify production 已接管並線上核對通過（2026-09-08 deploy `6a9fb443`）**；**Bar 三組主題裝置驗收已於 2026-09-11 完成(14／14)** |

**已知未做(需先定判準)**:Today 的「交通／停車／營業／付款／提醒**依當下情境動態調整優先順序**」。v84 只做了可明確驗收的收合(常駐交通／停車／營業,收合付款／提醒);「當下情境」的判準(依時間?依距離?依是否已抵達?)尚未定義,不同讀法會做出完全不同的東西,故未實作。

## v115 已正式發布(2026-09-12,未經 G1)
- 2026-09-12 以 chrome-devtools MCP 在 390×844 實測 v114 發現兩處缺陷,**非使用者回報**:
  - 設定頁「簡易結算模式」的 `.settings-row` 是 `<div>`,52px 的列不是熱區,**只有 22×22 的 checkbox 可點**,點文字無反應。改為 `<label>` 後整列可切換;既有 `aria-label` 未動,可及名稱不受影響。
  - 分帳頁待同步指示器 `.ledger-summary-rate.pending` 的命中區僅 **13px 高**。**該處的扁平琥珀樣式是刻意設計**(`rgba(255,240,190,.9)` + `cursor:pointer`),因此只以 padding 撐開命中區至 **31px**、等量負 margin 抵銷,**外觀與版面完全不變**(卡片高度 231px 於兩種狀態相同)。
- 依 ADR 0019 immutable generation,已發布的 `shell/v114/` 不得就地改,故走完整 forward bump 至 **v115**。`shell/v111`–`v114` 一律保留。 <!-- generation-exempt: 這一行描述的是 v114->v115 升版當下的事實(不得就地改的舊 generation、保留的舊世代),不隨後續升版變動 -->
- **BB4 的判準版本隨之由 v114 改為 v115** —— 不是重做驗收,BB4 至今仍未執行過;驗 v115 反而等同一次驗完 v112／v113／v114／v115 四版。
- 本次 forward bump **未改動任何測試檔的 generation 路徑** —— backlog #27 的遷移(2026-09-11)剛好在此回收成本。僅兩處必要維護:`theme-system.test.js` 的五筆滾動視窗尾四筆(歷史 release note,依裁定寫死),以及 `pwa-shell.test.js` 的 7 處轉義形式路徑(#27 當時的 grep 用 `shell/v114` 比對,漏掉正則字面裡的 `shell/v114/`)。 <!-- generation-exempt: 這一行描述的是 v114->v115 升版當下的事實(不得就地改的舊 generation、保留的舊世代),不隨後續升版變動 -->
- 完整 gate、95/95 Node 與 **191/191 Playwright** 通過;已在 390×844 實測兩處修正生效且無視覺回歸。
- **2026-09-12 發布**:PR #17 以 merge(非 squash／rebase)合併 `dev` `4141ae1` → `main`,merge commit **`6094584`**;合併前確認 PR head 等於 `origin/dev` 且該 head 的 `sanity` 與 `browser-qa` 皆 success。Netlify 由 `main` 自動部署 deploy **`6aa4ffff28234900086dd305`**、`state: ready`、`commit_ref` 相符、`published_at` 有值、`manual_deploy: false`。
- **§F5 線上核對全數通過**:`sw.js` v115;`shell/v121/` 的 app-version／HTML marker／builtin-snapshot 三者皆 v115;root `app-version.js` 維持 v110 bridge;三處 `Cache-Control` 皆為 `no-cache, no-store, must-revalidate`;**v111／v112／v113／v114 四個舊世代皆仍回 200**(ADR 0019)。另以真實瀏覽器確認 SW 接管至 v115、快取換為 `okayama-trip-v115`、兩處修正皆生效。 <!-- generation-exempt: 這是 v115 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **G1 經 Bar 裁定跳過**(同 v114 前例),6 項維持未勾 —— 跳過不等於通過。**G6 完成**:`production-v115` 指向 `6094584`。

## v116 已正式發布(2026-09-12,未經 G1)
- backlog **#30／#32／#33／#34／#35(a)** 打包為一次 forward bump。共同性質是**把已經做對的事套用一致**,不是新功能。
- **#34 是唯一的真缺陷**:`--mint` 從未定義,8 條規則的 `background` 靜默失效,其中 3 條是選取狀態。定義為 `--mint:#d6e8e4` 後,選取 chip 與未選白底的底色距離由 **0 變 54**。
- **#31 經查證前提錯誤而關閉,不實作** —— `tests/theme-system.test.js` 的 `presentationTokens` 明列 `--entry-secondary-*` 為核定的非主題呈現 token 並當場擋下。**自動測試擋下一次基於錯誤前提的修正。**
- 實機驗證抓到一個自造缺陷:移除「取消」後多品項模式只剩 **12px** 可點背景,已將 `.ledger-sheet` 背景保留區加大為 **56px**。
- 四個 gate、**95/95 Node**、**191/191 Playwright** 通過,並在 390×844 以真實 SW 接管逐項實測。
- **2026-09-12 發布**:PR #19 以 merge 合併 `dev` `2ff9445` → `main`,merge commit **`9769636`**;合併前確認 PR head 等於 `origin/dev` 且該 head 的 `sanity` 與 `browser-qa` 皆 success。Netlify deploy **`6aa51cd7`**、`state: ready`、`commit_ref` 相符、`published_at` 有值、`manual_deploy: false`。
- **§F5 全過**:`sw.js`／`shell/v121` 三件組皆 v116;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v115 五個舊世代皆回 200**(ADR 0019)。另以真實瀏覽器確認接管至 v116、快取換代、`--mint` 解析為 `#d6e8e4`、兩處形狀修正皆 9px、共用 helper 存在、死碼已除。 <!-- generation-exempt: 這是 v116 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **G1 經 Bar 裁定跳過**(同 v114／v115),10 項維持未勾。**G6 完成**:`production-v116` 指向 `9769636`。

## v122 已正式發布（2026-09-12，未經 G1）

- 採買表單主存檔 `btn` → `btn coral`；次存檔去掉 `ghost`，改與 `.ledger-save-another-quiet` **共用同一條規則**。取消鈕未動。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過。三條新增外觀斷言已逐一以「改回舊寫法」實測會失敗。
- PR [#24](https://github.com/nick80912-dev/ai-native-projects/pull/24) merge commit **`b34d4b9`**;Netlify deploy **`6aa573842a2a6f000829a985`**、`ready`、`commit_ref` 相符、`published_at` 有值。
- **§F5 全過**:`sw.js` 與 `shell/v122/` 三件組皆 v122; <!-- generation-exempt: v122 發布當下的路徑就是 shell/v122,不隨後續升版變動 -->root bridge v110;兩處 `Cache-Control` 正確;**v111–v121 十一個舊世代皆回 200**。
- **G6 完成**:`production-v122` 指向 `b34d4b9`。**G1 未執行**,v122 裝置驗收項維持未勾。
- 順帶記下 backlog **#39**：`--action-destructive-*` 被當主要 CTA 用，名實不符，本次變更把這個錯配擴散到第二處。

## v123 已正式發布(2026-09-13,未經 G1)

- **修正 Bar 回報的篩選位移**:團體完整紀錄頁選了篩選條件時,「清除篩選」由 hidden 轉為顯示,`.ledger-history-filter-panel-head` 的 flex 列高由 20.79px(`<strong>`)跳到 32px(該鈕的 `min-height`),面板長高 **11.21px**,下方整份清單被推走。加 `min-height:32px` 預留高度,實測位移歸零。
- **順帶補完 v121 的收尾**:`.ledger-participant-choice.on`／`.nx-cluster-expand.on`／`.floor-head.on` 三處仍寫死 ocean 青綠調(`#d6e8e4`／`#f1f8f8`／`#f2f8f8`),改為 `var(--mint)`。後兩者只差一階、等同重複,一併消掉。
- **backlog #39 的唯一錯用站點先修**:測試帳本提示的「前往設定關閉」是純導覽,`btn coral` → `btn ghost`。`--action-destructive-*` 本身未動,#39 仍待裁定,盤點表已更新為 7 個站點。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過。四項變更**逐一以「改回舊寫法」實測確認新斷言會紅**。
- **2026-09-13 發布**:PR [#25](https://github.com/nick80912-dev/ai-native-projects/pull/25) 以 merge(非 squash／rebase)合併 `dev` `ff7cae4` → `main`,merge commit **`151f973`**;合併前確認 PR head 等於 `origin/dev` 且該 head 的 `sanity` 與 `browser-qa` 皆 success(7 checks pass / 0 fail)。Netlify 由 `main` 自動部署 deploy **`6aa606e0f24f7a0008e536ed`**、`state: ready`、`commit_ref` = `151f973` 相符、`published_at` 有值、`manual_deploy: false`。
- **§F5 線上核對全數通過**:`sw.js` v123;`shell/v130/` 的 app-version／HTML marker／builtin-snapshot 三者皆 v123;root `app-version.js` 維持 v110 bridge;三處 `Cache-Control` 皆為 `no-cache, no-store, must-revalidate`;**v111–v122 十二個舊世代皆仍回 200**(ADR 0019)。 <!-- generation-exempt: 這是 v123 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **真機已確認**:Bar 於 2026-09-13 在正式站確認篩選位移不再發生。**回報過程本身值得記下** —— Bar 第一次回報「還是會位移」時仍停在 v122,`sw.js` 已是 v123 但裝置端的 worker 尚未換代;以同頁對照組(移除 `min-height` → 11.21px;保留 → 0)確認 v123 的修正有效後,請 Bar 重開 App 才換到 v123。**§A2 的「開兩次生效」不只是部署細節,也是回報缺陷時的第一個排除項。**
- **G1 經 Bar 裁定跳過**(同 v114–v122),v123 的裝置驗收項維持未勾 —— 跳過不等於通過。**G6 完成**:`production-v123` 指向 `151f973`。

## v124 已正式發布(2026-09-13,未經 G1)

- 本批只做**不需新設計裁定**的項目:三組低於 AA 的按鈕文字(`.qa-btn.mo`／`.nx-decision-btn.skip`／`.qa-btn.nf`)、`.sw-opt.on` 對齊隔壁的 `.payer-opt.on`、Shopping 批次工具列由 `:last-child` 改為 `.danger`,以及 Bar 裁定的 `.settings-member-add` 改正圓並補進準則清單。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過。六項變更**逐一以「改回舊寫法」實測確認新斷言會紅**。
- **2026-09-13 發布**:PR [#26](https://github.com/nick80912-dev/ai-native-projects/pull/26) 以 merge 合併 `dev` `e7cd524` → `main`,merge commit **`2e11c48`**;合併前確認 PR head 等於 `origin/dev`,並**等 PR 觸發的那輪 `browser-qa` 跑完才動手,未在 pending 狀態下 merge**。Netlify deploy `state: ready`、`commit_ref` 相符、`published_at` 有值。
- **§F5 線上核對全數通過**:`sw.js` v124;`shell/v124/` 三件組皆 v124;root `app-version.js` 維持 v110 bridge;三處 `Cache-Control` 正確;**v111–v123 十三個舊世代皆回 200**(ADR 0019)。 <!-- generation-exempt: 這是 v124 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **G1 經 Bar 裁定跳過**(同 v114–v123),裝置驗收項維持未勾。**G6 完成**:`production-v124` 指向 `2e11c48`。
- **真機觀感未回報**:本批的對比改善為計算值,Bar 尚未在實機確認「更多」與「略過」的觀感。ocean 的 `.qa-btn.mo` 落在 4.52,只比門檻高 0.02 —— 日後若再調 `--t-ink-soft` 或 `--t-line-soft`,這一格要重驗。
- **仍未動的**:backlog #39(`--action-destructive-*` 改名＋定色)待 Bar 裁定;「退回」兩種配方(D1)的答案跟著 #39 走;角色 token 採用率 3/105(E1)與 63 個寫死 hex(E2)是大型重構,建議排在 #39 之後;「改回未記帳」的 `.danger` 紅字(D2)本批未處理,待 Bar 決定。

## v125 已正式發布(2026-09-13,Android 真機 2026-09-15 驗收通過)

- **backlog #39 收斂完成**,依 Bar 裁定採「改名＋定色」。`--action-destructive-bg` 定為不隨主題的固定紅 `#8c1d2c`;CTA 另立 `--action-cta-*`,由新增的第 15 個主題 token `--t-cta-bg` 供色(只有海洋與象牙壓深一階以通過 AA,色相位移 0–1°)。`.btn.coral` 移除,拆為 `.btn.cta`(5 個站點,含「退回」)與 `.btn.danger`(2 個真刪除)。
- 連帶結掉 **D1**(退回歸 CTA)、**D2**(「改回未記帳」拿掉 `danger`)與 **F1** 最後一組對比缺陷。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過。五項變更逐一以「改回舊寫法」實測確認斷言會紅。
- **2026-09-13 發布**:PR [#27](https://github.com/nick80912-dev/ai-native-projects/pull/27) 以 merge 合併 `dev` `b4129b7` → `main`,merge commit **`a0131ce`**;合併前確認 PR head 等於 `origin/dev`,並等該 head 的**兩輪** CI(push + pull_request,各含 `sanity` 與 `browser-qa`)全綠才動手。
- **§F5 線上核對全數通過**:`sw.js` v125;`shell/v130/` 三件組皆 v125;root `app-version.js` 維持 v110 bridge;三處 `Cache-Control` 正確;**v111–v124 十四個舊世代皆回 200**(ADR 0019)。另以線上實查確認 `--action-destructive-bg:#8c1d2c` 與六組 `--t-cta-bg` 皆已上線。 <!-- generation-exempt: 這是 v125 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **真機驗收通過**:Bar 於 **2026-09-15 在 Android 實機**確認正式版 v125 驗收 OK。這是本專案**第一次由 Android 實機回報通過**。
  - **BB4 維持掛著(Bar 2026-09-15 裁定)**:G1 的 **BB4 八項清單**(v114 起掛著的實體 Android 項目)**本次並未走過**。Bar 的回報是整體試用無異常,不等於逐項驗收。**BB4 仍為未驗**,`docs/device-acceptance-log.md` 不動。
- **G6 完成**:`production-v125` 指向 `a0131ce`,訊息記錄 §F5 結果與上述 BB4 待認定事項。
- **剩餘未結**:E1(角色 token 採用率 3/105 → 現為 5/105)與 E2(63 個寫死 hex)兩項大型重構。#39 已落地,這兩項不再有前置相依,可視需要另行排程。

## v126 已正式發布(2026-09-23,未經 G1,真機掃查通過)

- **清除死 CSS**:100 條規則、64 個 class、9,214 字元(stylesheet −7%)。集中在分帳頁舊 UI 與下一站舊卡片。畫面與操作完全不變 —— 被刪的規則本來就匹配不到任何元素。
- **偵測方法修正兩次**:先補上動態拼接前綴的保留(救回 `.diag-impact-*`／`.shopping-link-*`／`.ledger-settle-*` 等 18 個),再把刪除條件由「所有 class 皆死」改為「任一 class 死」(CSS 語意上 `.mini-item .mc` 只要父層不存在就永不匹配)。
- **三個測試在守死碼**,已移除並寫明原因:`theme-system` 的 v124 D4 斷言、`ios-zoom-guard` 的 `.inline-add`、`ui-ux-v112` 的 `.st-l`。
- **更正 v124 的 D4**:`.payer-opt` 與 `.sw-opt` 從未被渲染,v124 那次「把分攤成員對齊付款人」對使用者是零效果。成因是只憑 CSS 選擇器名稱推論 UI 結構。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過。
- **2026-09-23 發布**:PR [#28](https://github.com/nick80912-dev/ai-native-projects/pull/28) 以 merge 合併 `dev` `9d0afa8` → `main`,merge commit **`4c9233e`**;合併前等該 head 的**兩輪** CI(push + pull_request)全綠才動手。
- **§F5 線上核對全數通過**:`sw.js` v126;`shell/v126/` 三件組皆 v126;root `app-version.js` 維持 v110 bridge;三處 `Cache-Control` 正確;**v111–v125 十五個舊世代皆回 200**(ADR 0019)。另線上實查 `.payer-opt`／`.sw-opt`／`.nx-hero`／`.exp-item`／`.st-l` 皆 **0 次**,確認死碼確實不在線上。 <!-- generation-exempt: 這是 v126 §F5 線上核對當下的量測結果,不隨後續升版變動 -->
- **G6 完成**:`production-v126` 指向 `4c9233e`。
- **真機驗證通過(2026-09-23)**:Bar 在手機上掃過,**沒有畫面掉樣式**。這是 100 條規則的一次性刪除,掃查重點為被刪最多的分帳頁與下一站卡片。至此 v126 的刪除獲得實機確認 —— 「被刪的規則本來就匹配不到任何元素」不再只是推論。
- **剩餘未結**:E1(角色 token 採用率 5/103)與 E2(寫死 hex)兩項大型重構;另有新模型複審提出的三項未進 backlog —— 鍵盤焦點只有 13 條 `:focus-visible` 覆蓋 235 個 button、45 處 `font-size < 11px`(最小 8.5px)、Ledger 表單一批 28–36px 的觸控目標。

## v127 已正式發布(2026-09-23,未經 G1,真機驗證通過)

- **backlog #43 完成**,依 Bar 裁定採「已處理」措辭。今天頁右上的進度由裸的 `1 / 8` 改為 `已處理 1/8`,**`aria-label` 與所有計數邏輯未動** —— 那句「今日已處理 N 站，共 N 站」本來就存在,本次只是把它搬到看得見的地方。
- 追查結論:三個進度數字各自都對,分母分別來自 `homeNextStopItems`(串點併為一站)與 `isTripCheckableItem`(子站各算一站),分子對「自動略過」的處理也不同。**未統一數字** —— 兩個分母各有用途。
- 320px 實測無溢出(左 97px／右 63px／間距 108px)。四個 gate、**Node 95/95**、**Playwright 191/191** 通過,新增斷言已以改回舊寫法實測會紅。
- **2026-09-23 發布**:PR [#29](https://github.com/nick80912-dev/ai-native-projects/pull/29) 以 merge 合併 `dev` `f8b6dc8` → `main`,merge commit **`b4182e9`**;**v127／v128／v129／v130 四個版本一批上線**。
- **真機驗證通過(2026-09-23)**:Bar 在手機上回報驗證 OK。

## v128 已正式發布(2026-09-23,未經 G1,真機驗證通過)

- **backlog #44 的「決策鈕截斷」已修**:串點卡片的「完成／跳過」可見文字不再夾站名,完整站名移到 `aria-label`。與非串點卡片一致。實測 375px 下兩顆皆不截斷。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,新增斷言已以改回舊寫法實測會紅。
- **2026-09-23 發布**:PR [#29](https://github.com/nick80912-dev/ai-native-projects/pull/29) 以 merge 合併 `dev` `f8b6dc8` → `main`,merge commit **`b4182e9`**;**v127／v128／v129／v130 四個版本一批上線**。
- **真機驗證通過(2026-09-23)**:Bar 在手機上回報驗證 OK。
- **#44 已於 v129 收尾**:「目前」一詞兩義、剩餘站數要心算兩項皆由 v129 處理,**#44 已在 `tasks/done.md`**。
## v129 已正式發布(2026-09-23,未經 G1,真機驗證通過)

- **backlog #44 收尾**:串點卡片的「目前」改為「這一站」(旁邊的時間是該站排定時間,不是現在幾點);站數改為「共 N 站」並補「還有 N 站」,不用自己減。
- 實測 320px:`這一站 9:00 廣島城`、chips 同一行 118px／容器 234px、決策鈕維持不截斷。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,三處改動逐一以改回舊寫法實測會紅。
- **2026-09-23 發布**:PR [#29](https://github.com/nick80912-dev/ai-native-projects/pull/29) 以 merge 合併 `dev` `f8b6dc8` → `main`,merge commit **`b4182e9`**;**v127／v128／v129／v130 四個版本一批上線**。
- **真機驗證通過(2026-09-23)**:Bar 在手機上回報驗證 OK。
## v130 已正式發布(2026-09-23,未經 G1,真機驗證通過)

- **backlog #40 完成**:加入鍵盤焦點通則(`outline:2px solid var(--sea);outline-offset:2px`)與六個深色容器的白環覆寫。原本 235 個 button 只有 13 條窄選擇器規則。
- `outline-offset:2px` 讓環落在按鈕外面的頁面底色上,所以深色**按鈕**不需例外,只有深色**容器**裡的按鈕要白環。既有 13 條特異性較高,不受影響。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,兩條新斷言以破壞選擇器實測會紅。
- **2026-09-23 發布**:PR [#29](https://github.com/nick80912-dev/ai-native-projects/pull/29) 以 merge 合併 `dev` `f8b6dc8` → `main`,merge commit **`b4182e9`**;**v127／v128／v129／v130 四個版本一批上線**。
- **§F5 線上核對五項全過**:`sw.js` v130;`shell/v130/` 三件組皆 v130;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v129 十九個舊世代皆回 200**(ADR 0019)。另線上實查「已處理」3 次、「這一站」5 次、「還有」5 次、`button:focus-visible` 8 次、`outline-color:#fff` 1 次。 <!-- generation-exempt: 這是 v130 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v130` 指向 `b4182e9`。**v127／v128／v129 未單獨建 tag**(與 v130 同批發布)。
- **真機驗證通過(2026-09-23)**:Bar 在手機上回報驗證 OK。**但鍵盤焦點環需外接鍵盤按 Tab 才驗得到,回報未逐項指明是否走過** —— 日後若發現某處焦點環失效,先確認該項當初是否真的驗過。
- **剩餘未結**:backlog #3／#12／#20／#25／#28／#29／#38／#41／#42／#46／#47／#48／#49,外加 E1(角色 token 採用率 5/103)與 E2(寫死 hex)兩項大型重構。
## v131 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **backlog #47 完成**:行程頁交通 chip 加 `white-space:pre-line`,保留 CMS 原文的換行。回報的症狀是 Day 1 的航班時刻在 375px 下把 `桃園` 拆成兩行。
- **根因是換行被折成空白**,不是斷行規則有問題。`.detail .sec`(資訊面板)早就用 `pre-line` 保留同一份 CMS 的多行寫法,本次讓交通 chip 與它一致。
- 影響面:28 個不重複交通字串**只有 1 個含換行**,其餘 27 個渲染逐字不變;68 個行程項目的「交通」欄全為空。
- 實測:375px 改後為 `🚗 9:00開櫃` / `11:30(TPE台灣桃園)-15:05(OKJ日本岡山)`,高度 38px 不變;320px 仍需斷行,但斷點移到 `OKJ` 與 `日本岡山` 的拉丁／中文交界,不再切開中文地名。
- 否決 `word-break:keep-all`:320px 下整串溢出 chip;補 `overflow-wrap:anywhere` 後兩個純中文說明各多一行。已實測,非推論。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,新增斷言已以拿掉宣告實測會紅。
- **2026-09-24 發布**:PR [#30](https://github.com/nick80912-dev/ai-native-projects/pull/30) 以 merge 合併 `dev` `79489a4` → `main`,merge commit **`347d1a0`**;合併前兩輪 CI 共 7 項全綠,合併當下重查 head 未變。
- **§F5 線上核對五項全過**:`sw.js` v131;`shell/v131/` 三件組皆 v131;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v130 二十個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab47b74`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v131 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v131` 指向 `347d1a0`。
- **真機驗證通過(2026-09-24)**:Bar 在手機上回報驗證 OK。BB4 八項維持未驗。
## v132 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **backlog #48 完成**:出發前的今天頁,預覽清單上方補「出發當天 · DAY 1 · 10/18 (日)」標頭;「還有 N 站,查看完整行程」只留「還有 N 站」,後半句交給正下方按鈕。
- 標頭沿用 hero 的 `.lbl`,但 `.75` 在 mist／tea 只有 4.45／4.47:1,改用同一張 hero 內文 `.empty` 的 `.9`,六主題最低 5.59:1。
- 只動 `renderPreTripBrief()`,它唯一的呼叫點在出發前分支;**旅程中的今天頁不受影響**。清單項目數不變,既有斷言不需改。
- 實測:375px hero +24px;320px 標頭一行;乾淨分頁 console 零錯誤。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,三條新斷言已逐一以拿掉改動實測會紅。
- **2026-09-24 發布**:PR [#31](https://github.com/nick80912-dev/ai-native-projects/pull/31) 以 merge 合併 `dev` `7713efb` → `main`,merge commit **`9c4239f`**;兩輪 CI 共 7 項全綠,合併時釘住 head。
- **§F5 線上核對五項全過**:`sw.js` v132;`shell/v132/` 三件組皆 v132;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v131 二十一個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab48b31`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v132 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v132` 指向 `9c4239f`。
- **真機驗證通過(2026-09-24)**:Bar 在手機上回報驗證 OK。**mist／tea 主題下的新標頭是否切換看過,回報未逐項指明。** BB4 八項維持未驗。
## v133 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **backlog #46 完成,但前提先修正**:原記「用了動作的形狀」與「三個控制擠在一列」實測皆不成立(本來就是 999px 膠囊、320px 也放得下)。仍成立的是:選中的那顆填滿 `--sea`,看起來像主要動作鈕、讀不出二選一;另查到**兩顆沒有 `aria-pressed`**。
- 改法:兩顆包進 `role="group" aria-label="行程篩選"` 的 track,補 `type="button"` 與 `aria-pressed`;CSS 加入 ledger 區既有的共用 segmented 規則,不複製宣告。按鈕維持 44px(共用規則 40px)。`.trip-filter-btn` class 保留,焦點還原不受影響。
- 實測:375px 按鈕 119×44、320px 91／91、皆無截斷;整列 44→53px;點擊後 `aria-pressed` 正確翻轉;console 零錯誤。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,七條新斷言已逐一以拿掉改動實測會紅。
- **2026-09-24 發布**:PR [#32](https://github.com/nick80912-dev/ai-native-projects/pull/32) 以 merge 合併 `dev` `d7d184b` → `main`,merge commit **`e36d298`**;兩輪 CI 共 7 項全綠,合併時釘住 head。
- **§F5 線上核對五項全過**:`sw.js` v133;`shell/v133/` 三件組皆 v133;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v132 二十二個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab4921a`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v133 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v133` 指向 `e36d298`。
- **真機驗證通過(2026-09-24)**:Bar 在手機上回報驗證 OK。**「回到現在」與 track 同列的版面真機驗不到**(出發前不會出現),只在本機以 `previewDate` 模擬驗過;出發後切到別天即可補看。BB4 八項維持未驗。
## v134 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **backlog #49 的 (a) 完成**:購物頁商場營業時間依 ` / ` 一段一行,🕒 與清單分兩欄,續行對齊第一段。原本換行會切在段落中間,Ario 甚至斷在「美食廣|場」。
- **(b) 經實測前提不成立,Bar 裁定不做**:永旺是 6 個樓層列、收合 312px,不是原記的 11 列、495px。併掉 1 家的樓層只省約 53px,卻打破「一列 = 一層樓」。
- 影響面:57 筆營業時間只有永旺、Ario 兩筆用 ` / `;其餘卡片不變。
- 實測:永旺 +39px、Ario +19px;375／320px 皆每段一行、無截斷、對齊於 x=50;console 零錯誤。
- 四個 gate、**Node 95/95**、**Playwright 191/191** 通過,四條新斷言已逐一以拿掉改動實測會紅。
- **2026-09-24 發布**:PR [#33](https://github.com/nick80912-dev/ai-native-projects/pull/33) 以 merge 合併 `dev` `a6784a9` → `main`,merge commit **`7d42886`**;兩輪 CI 共 7 項全綠,合併時釘住 head。
- **§F5 線上核對五項全過**:`sw.js` v134;`shell/v134/` 三件組皆 v134;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v133 二十三個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab4a140`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v134 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v134` 指向 `7d42886`。
- **真機驗證通過(2026-09-24)**:Bar 在手機上回報驗證 OK。本版改動出發前即可完整看到。BB4 八項維持未驗。
## v135 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **分帳邏輯稽核**:結算核心以隨機不變量測試驗證正確(均分 20,000 例、零和 400 趟、轉帳結清 800 次、多品項雙幣 2,996 例,皆 0 失敗)。
- **修正現存 bug**:税抜 的多品項帳每編輯／更正一次就再加一次稅(¥1,650 → ¥1,815 → ¥1,997)。改為編輯與更正一律以税込載入最終金額。真實團體資料無已被放大的帳。
- **結算幣別鎖定**:設定頁改標「結算幣別」;有還款紀錄即鎖定,並在送出網路前守門。真實資料實測原可造成已還清者被要求再付 NT$315。
- **單品項稅區**補「只做記錄,不會加稅」說明;**分帳頁**記住分頁,有未結清時先開團體。
- **兩項查證後保留**:單品稅只記錄(7/19 刻意設計)、個人帳代購不依身分過濾(7/18 刻意設計),皆有既有測試守著;後者一度改掉被測試擋下,已撤回並加註解。
- 殘留:税抜 帳的換算幣別在品項間可能挪動 ±5(總額不變),開 backlog #50。
- 四個 gate、**Node 95/95**、**Playwright 196/196** 通過;新 spec 五個回退案例皆會紅。
- **2026-09-24 發布**:PR [#35](https://github.com/nick80912-dev/ai-native-projects/pull/35) 以 merge 合併 `dev` `8fbefdd` → `main`,merge commit **`67916c7`**;兩輪 CI 共 7 項全綠,合併時釘住 head。
- **§F5 線上核對五項全過**:`sw.js` v135;`shell/v135/` 三件組皆 v135;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v134 二十四個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab4d752`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v135 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v135` 指向 `67916c7`。
- **真機驗證通過(2026-09-24)**:Bar 回報手機驗證 OK;三個驗收重點回報未逐項指明。BB4 八項維持未驗。
- 殘留字樣:`預設輸入幣別` 仍在 schema 欄位內部說明(非使用者可見),改 schema 須先確認,未動。**→ 已由 v136 改掉。**
## v136 已正式發布(2026-09-24,未經 G1,真機驗證通過)

- **schema 說明改為「全團結算幣別,也是新增記帳的預設幣別」**,補上 v135 上線核對時發現的殘留字樣。只改說明文字,欄位、合法值、驗證與畫面皆不變。
- `schema.js`、`shell/v136` 內嵌副本、`09_SCHEMA_MAPPING.md` 三處同步;root v110 bridge 刻意不動。 <!-- generation-exempt: 這是 v136 發布時的歷史紀錄 -->
- `schema.js` 會被 SW 快取,依 ADR 0019 仍需完整升版。
- 四個 gate、**Node 95/95**、**Playwright 196/196** 通過;新斷言以改回舊說明實測會紅。
- **2026-09-24 發布**:PR [#36](https://github.com/nick80912-dev/ai-native-projects/pull/36) 以 merge 合併 `dev` `be7495c` → `main`,merge commit **`6706ebb`**;兩輪 CI 共 7 項全綠,合併時釘住 head。
- **§F5 線上核對五項全過**:`sw.js` v136;`shell/v136/` 三件組皆 v136;root bridge 維持 v110;三處 `Cache-Control` 正確;**v111–v135 二十五個舊世代皆回 200**(ADR 0019)。Netlify deploy `6ab4e109`、`commit_ref` 相符。 <!-- generation-exempt: 這是 v136 發布當下的線上核對結果,不隨後續升版變動 -->
- **G6 完成**:`production-v136` 指向 `6706ebb`。
- **真機驗證通過(2026-09-24)**:Bar 回報手機驗證 OK(本版無可見變化)。BB4 八項維持未驗。
## 下一棒

→ **v140 驗收**:按 Bar 核准交付 `dev`；Bar 先驗 TP140-a～c 的設定資料四子項、健康明細直接顯示及返回，再在 iPhone 與 Android 實體 PWA 完成 TP137-a～i 的 Google 授權、Drive 上傳讀回、清除後重啟與過往旅程筆記。其他旅伴使用前須加入 OAuth 測試名單或另行完成對外發布。完整「連接新旅程」仍留待第二階段。

→ **裝置驗收遺留**:由 Bar 在實體 Android 上完成 BB4 共 8 項；目前正式 App 為 **v136**。另有 v115 6／v116 10／v117 4／v118 6／v119 5／v120 4／v121 7 項待 iPhone 補驗。**合計 50 項,全部在使用者已拿得到的版本上。**`docs/device-acceptance-log.md` 的 v114 段 22 項中,BB1–BB3 共 14 項已於 **2026-09-11** 由 Bar 在 iPhone 上確認通過;**剩下的 BB4 是併入的 v112 遺留項,只能在實體 Android 上驗。**

> 最關鍵的是 **BB4-a**:Service Worker 能否在實體 Android 上安裝並接管。v112 修的連線槽耗盡缺陷**只在真機發生**,桌機與 Playwright 的 Android 模擬都重現不出來。以目前正式版驗證時,開啟網站 → 關掉 → 再開,設定的版本資訊應顯示 **v136**(顯示 v110 代表 SW 沒接管)。
>
> 補驗發現問題時,依 `16_OPS_PLAYBOOK.md` §A2 **forward bump 到下一個未使用版本**,不得倒退覆寫 —— 已經有裝置接管 v136 了。

> GitHub Actions 與 Netlify production **已於 2026-09-08 接管 v113** —— deploy `6a9fb443`、`commit_ref` = `745bb6f`、線上 `sw.js`／`app-version.js` 皆 v113、`qa-sanity` 於 `main` `745bb6f` 與 `dev` `f0444cb` 皆 success。**這一步已完成，不需再確認。**
>
> **`production-v113` 已於 2026-09-11 建立**(v113 清單 14／14 通過後解除封鎖),指向 `745bb6f`。該 tag 為**回溯補建** —— 正式站早於 2026-09-10 換成 v114,無法再對 v113 做線上驗證,tag 訊息已明記所依據的線上核對是 2026-09-08 當時那一次。**`production-v112` 仍不得建立** —— v112 的裝置驗收已併入 v114 的 BB4,而 BB4 尚未執行。**未完成正式發版流程前不得建立 production tag。**

> 正式發布仍必須遵守 §E：PR 與 Actions 通過後才能 merge；Netlify 線上驗證通過後才能建立 production tag。
