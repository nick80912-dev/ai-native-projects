# DONE(已完成)

> 更新於 2026-08-09。完成事項來自 `.ai-manifest.json` status.done、既有 CHANGELOG 與 Bar 驗收確認；細節仍以 07_CHANGELOG.md 為準。

## 已完成
- 2026-08-09：Ledger 近期消費卡資訊階層微調完成；團體付款／分攤摘要由下方 badge 移到品項旁，個人與團體類別統一接在店家後，支付方式獨立留在下一列；缺店家仍保留類別，缺支付方式不產生空白列。只改 presentation renderer／CSS，帳務與資料層不變。
- 2026-08-09：品質批 #2 網路／呈現降級強化完成；`fetchSheet()` 第一次失敗保留既有 Sync log，精確等待 800ms 後只重試一次，第二次失敗仍將第二次錯誤交回 snapshot orchestration；`toast()` 在 `#toast` 不存在時於任何 action／timer 狀態變更前安全返回。未改抓取 timeout、CSV 驗證、同步資料語意、renderer、SW 或版本。
- 2026-08-09：品質批 #2 的 AppLog／healthCheck 子項完成；六類 AppLog 保留 console 相容輸出並增加 session-only 100 筆環形緩衝（單筆 1,000 字），診斷面板可查看、複製及清除，開啟面板不會製造 health log。依 Bar 要求移除面板內的團體帳測試模式區塊；設定控制頁與 TEST universe 保留。
- 2026-08-09：品質批 #2 的下一站副作用子項完成；`trip-progression.js` 純 reconciliation 集中時間／cluster／stale policy，render path 同輪最多保存一次 progress並通知一次。
- V2 Schema 驅動 CMS:7 張 Google Sheets、ID 引用、Restaurants/Shopping/Hotels/Expenses/TripConfig。
- AI Harness 治理層:PROJECT_CONSTITUTION、10_FOLDER_STRUCTURE、11_CODING_CONVENTION、12_DEV_WORKFLOW、adr/0001-0005、健康檢查規範。
- 停車引用繼承:「停車同Pxxx」完整繼承與 MAP CODE 純顯示。
- PWA 離線基礎:三層防線、Service Worker、Netlify 託管。
- 首頁下一站模式:首頁只突出下一站,完成 / 跳過 / 復原狀態存 localStorage,不回寫 CMS。
- 首頁天氣摘要:依下一站資料推估地點,顯示簡短天氣 chip,失敗時不影響首頁。
- Restaurants 補欄位:R001 麵酒一照庵與 R006 上野商店的 Tabelog 評分 / 營業時間已在 Google Sheet 發布 CSV 確認。
- 購物頁多地點切換:GitHub `origin/main` 已確認包含 `Places.Type=購物` 來源、`全部 / 想逛 / 各購物地點` 切換與「區域 / 樓層」文案。
- 框架抽取計畫已歸檔:`FUTURE_PLAN_framework-extraction.md`。
- 2026-07-16:父列具有地點或 ID 時納入父子行程卡第一站，兩站即可成卡；synthetic controller 保持整組進度，Day 1–6 共 12 組稽核案例通過。
- 2026-07-29：Bar 完成 SW v58–v68 累積真機驗收；涵蓋團體帳本可見性／權限、採買 A／B／C／D／E／F／G、逐人代購記帳、部分購買、安全回併、必買置頂、獨立新增／編輯 Sheet、Ledger 草稿切軌、iPhone Safari／PWA 鍵盤焦點與更新後本機資料保留。
- 2026-07-29：GitHub Pages 最終 iOS PWA 驗收完成；包含加到主畫面、standalone、真機離線重開與 `github.io` origin 的 Service Worker 更新節奏。
- 2026-07-29：採買清單批及 C＋E＋G 第三批完成 Bar 驗收，自 backlog 移入 done。
- 2026-07-29：結算一致性批完成本機開發與自動化／Browser QA，自 backlog 移出；交付含還款確認後永久保護、append-only 收據級更正／作廢、commit-last、canonical conflict、差額預覽與完整歷史。SW v69–v71 後續於 2026-07-30 完成 Bar 真機驗收；`dev → main` 與正式部署仍未核准。
- 2026-07-30：Bar 完成 SW v69–v71 真機／PWA 驗收；涵蓋結算一致性、分攤成員選取色差與整張作廢預覽動作去重。`dev → main` 與正式部署仍須另行核准。
- 2026-07-30：backlog #1 Playwright 三情境 QA 入版控並掛入 `qa.yml`；斷網內建、連網同步與旅行日 mock Date 三情境均以真實 App 啟動流程驗證，通過標準為 `pageerror=0`。

## 已歸檔的 backlog 編號項目

> 2026-07-30 依 Bar 裁定第 4 項歸檔。**編號保留不回收**(見 `tasks/backlog.md` 檔頭)。歸檔判準為「程式與文件證據足以證明已完成」,**不以真機／PWA 驗收為條件** — 驗收已另列為 release gate,見 `tasks/current.md`。以下每項均於批次一 P0／P1 逐項複驗程式碼與 `07_CHANGELOG.md`,非僅採信任務板文字。

| 編號 | 完成日 | 對應 SW 版本 | 狀態 |
|---|---|---|---|
| #1 | 2026-07-30 | 不涉 SW 版本(純測試資產) | 如原核准完成 |
| #3b | 2026-07-30 | SW v72(個人備份 v8) | 已完成,原 backlog 敘述過期 |
| #6 | 2026-07-30 | SW v72 | 完成,**範圍擴張,已由 Bar 追認** |
| #7 | 2026-07-30 | SW v72 | 如原核准完成 |
| #8 | 2026-07-30 | SW v72 | 如原核准完成 |
| #9 | 2026-07-30 | SW v72 | 完成,兩項以不同形式交付,**已由 Bar 追認為等價** |
| #10 | 2026-07-30 | SW v73 | 如原裁定完成(顯示層) |
| #21 | 2026-07-30 | SW v73 | 完成,**範圍如實記錄於下** |
| #23 | 2026-08-03 | 不涉 SW 版本 | **關閉,不實作**:12 月東京行程已結束,不再需要接入 |

- **#1 QA 腳本入版控** — 證據:`tests/browser/trip-three-scenarios.spec.js` 三個 `test()`(斷網內建 / 連網同步 / 旅行日 mock Date)、`tests/browser/support/qa-fixture.js`、`static-server.js`、`.github/workflows/qa.yml` 的 `browser-qa` job。只新增測試資產、無 runtime 變更,故不對應 SW 版本。
- **#3b 採買單位納入個人狀態備份** — 證據:`index.html:7421` `personalStateJson()` payload 含 `shoppingUnits:shoppingUnitStore.all()`;`index.html:7497` 還原寫回 `SHOPPING_UNIT_OPTIONS_KEY`,且列於原子回滾 keys;`index.html:3815` `PERSONAL_STATE_VERSION=8`,註解明載「v8 起加入本機主題、採買單位與旅途紀錄」;`tests/settings-backup-ux.test.js:145` 斷言 v8 匯出鍵含 `shoppingUnits`;`07_CHANGELOG.md` 2026-07-30 條目。
  - **原 backlog 敘述過期**:原文寫「目前不在備份 payload 內」與「目前 v7」,兩者在 v72 交付後均已不成立。歸檔而非重寫,是因為需求本體已滿足。
  - **殘留缺口(不回填 backlog,已列入批次一 P3)**:`tests/settings-backup-ux.test.js` 只覆蓋 v1／v2／v4／v8 還原,**v3／v5／v6／v7 無任何還原測試**。依 Bar 裁定第 2 項,不升 v9、維持 `PERSONAL_STATE_VERSION=8`,改補 v1–v8 還原矩陣測試與相容策略文件化。
- **#6 主題系統** — 證據:`index.html:616` `THEME_IDS=['ocean','ivory','wisteria','cedar','mist','tea']`、`:617` `THEME_REGISTRY` 六筆;`tests/theme-system.test.js`(59 條斷言)。附帶修正已完成:`index.html:39` `--green:#367055`,舊值 `#3c8062` 全檔無殘留。預設主題經複驗仍為 `ocean`(`THEME_IDS[0]`,且 `normalizeThemeId()` 對未知值回退 `ocean`)。
  - **範圍擴張,如實記錄**:核准範圍為「共三選項」(2026-07-17)→ 鬆綁為「三案並列、最終選項數三或四待 Bar 裁定」(2026-07-30);實際交付 **6 組**。核准內的三案為 `ivory`／`wisteria`／`cedar`;**`mist`(霧藍／瀨戶)與 `tea`(焙茶／倉敷)未經任何核准即納入交付**,且選項數超出「三或四」。**已由 Bar 於 2026-07-30 追認為正式交付現況**,並要求立 ADR 記錄未來閘門 → `adr/0008-theme-system-scope.md`。
- **#7 主題區掛入準備** — 證據:預留骨架已被實作取代,`renderThemeSettingsSheet()`(`index.html:7641`)與 `renderSettingsThemePage()`(`index.html:7647`),`SETTINGS_PAGE_IDS`(`index.html:7606`)含 `'theme'`。
- **#8 UI 配色規範覆寫** — 證據:`04_UI_GUIDELINES.md:7` 已改寫為兩層 token 制(13 個第一層 `--t-*`;第二層保留 `--paper`／`--sea-deep`／`--coral` 等角色名並只能 `var()` 對映第一層)、`:18` 固定色 `--green #367055`;`08_AI_HANDOVER.md:39` 載明主題只可透過 `data-theme` 覆寫第一層 token。原「UI 配色變數不可變」條文已由上述條文取代。
- **#9 設定頁 2.0 批** — 七項子範圍中 **五項如原文交付、兩項以不同形式交付**:
  - ✅ 分區架構 — `renderSettingsRoot()`(`index.html:7627`)七區:身分 → 主題 → 代購對象 → 帳務 → 自訂項目 → 資料與版本 → 測試模式
  - ✅ SVG 齒輪入口 — `index.html:687` inline SVG(`.settings-btn`,`aria-label="設定"`)
  - ✅ 摘要計數列 — 主題名稱＋「6 組主題」、「N 位常用對象」、「N 類別 · N 支付方式 · N 單位」、匯率與預設幣別
  - ✅ 代購對象管理移入設定頁 — `openSettingsPage('proxy')` → `renderSettingsProxyPage()`
  - ✅ APP_VERSION 版本資訊列 — `renderSettingsDataPage()` 顯示 `SW v72`,取自 `APP_VERSION`
  - ⚠️ 使用者版更新日誌**子頁** → 實際**併入「資料與版本」子頁**內(`APP_RELEASE_NOTES` 五筆 + `renderAppReleaseNotes()`);`SETTINGS_PAGE_IDS` 中沒有獨立的更新日誌頁
  - ⚠️ 成員管理**子頁** → 實際為身分區行內「切換／新增」兩鈕 + 既有 `openMemberSelector()` overlay,非獨立子頁
  - **上述兩項差異已由 Bar 於 2026-07-30 追認為等價交付**,不另立獨立子頁:更新日誌併入「資料與版本」子頁視為符合現行資訊架構;成員管理以身分區行內「切換／新增」入口搭配 `openMemberSelector()` overlay 視為等價,理由是功能無缺漏且不增加額外導覽層級。兩項差異與 `07_CHANGELOG.md` 2026-07-30 條目一致(該條目只列四個子頁:代購對象、帳務、自訂項目、資料與版本)。**#9 維持完成,不新增 backlog 項目。**

- **#21 Sanity CI dev 觸發評估** — `qa.yml` 的 `push.branches` 加入 `dev`,sanity job(文件標題／manifest／版本一致性／全部 `tests/*.test.js`)在 `dev` 每次推送都執行,原項目要的「dev push 也產生 GitHub Actions 綠勾」已達成。
  - **範圍如實記錄**:`browser-qa` job 依 Bar 2026-07-30 裁定**刻意維持只在 pull request 與 `main` push 執行**,以 job-level `if` 條件排除 dev push,避免每次 dev 推送都安裝 Chromium 跑完整 Playwright。原 backlog #21 只談 sanity 的 dev 觸發,未涵蓋 browser-qa;**本次不另立「dev 也跑 browser-qa」的新項目**(依裁定不新增 backlog 項目)。日後若要放寬,屬新決策。

- **#10 受保護紀錄 Tag 文案改為「已鎖帳」** — badge 由「還款確認後保護」縮短為「已鎖帳」(`renderLedgerRecentRecord`,複驗確認為整份 `index.html` 的唯一出現處);明細頁**新增**說明句「此筆消費已完成還款確認,目前已鎖帳,無法再編輯或刪除。」,出現條件與「查看不可改寫歷史」按鈕相同(`track==='shared' && record._correctionProtected`)並排在其前。`_correctionProtected` 判定、編輯／刪除守門、還款確認流程與不可改寫歷史一字未動;`assertCanEditLedgerRecord`／`assertCanDeleteLedgerRecord` 的錯誤訊息作為行為契約亦未更動。上述各項已由 `tests/ledger-list-actions.test.js` 逐項鎖住,含「舊文案已從整份 `index.html` 移除」。既有 badge 優先序不受影響:`_correctionVersionCount > 0` 仍優先顯示「已更正 N 次」。備選字「已鎖定」依原裁定不採用。

- **#2 的子項「隱藏『重置今日進度』」** — 2026-07-30 由 P5 調查發現**早已實作完成**,只是 backlog 未歸位。實作為 `resetTripProgress()`(`index.html`),位於診斷面板「行程進度」區,附雙重 `confirm()`,只清除 `trip_checks` 與 `trip_next_stop_progress`。
  - **與原文的差異(如實記錄)**:backlog 原文寫入口是「連點標題 5 下」,實際入口是**桃子診斷徽章 300ms 內連點兩次 `touchend`**(`setupDiagnostics()`);`brandTitle` 上沒有任何 listener。因為只綁 `touchend`,桌機滑鼠點擊打不開,實際上比原構想更難誤觸。經 Bar 2026-07-30 裁定移出 #2。
  - #2 的其餘子項中，下一站 reconciliation、AppLog 環形緩衝、fetchSheet 退避與 toast() null guard 已於 2026-08-09 完成；目前只剩 localStorage 前綴隔離維持在 backlog #2。

- **#23 12 月東京行接入** — Bar 於 2026-08-03 確認該行程已結束,因此不新增行程分頁、不擴充 `TripConfig transport=transit`、不新增 SHEETS gid。本項是需求失效後關閉,**不是功能交付**；編號永久保留不回收。
- **#2 已由後續版本完成的子項** — 行程面板展開狀態於 v82 完成；天氣改取「現在之後」最大值於 v84 完成；同步徽章相對時間與 partial 失敗來源於 v88 完成；下一站 reconciliation、AppLog／healthCheck 診斷能力、fetchSheet 退避與 toast() null guard 於 2026-08-09 完成。backlog #2 現只保留測試資料隔離。
## 文件治理
- 2026-07-13:Netlify 雙站架構上線(`main`=正式站、`dev`=測試站)，兩站部署與瀏覽器狀態完全隔離。
- 2026-07-10:修復批交付(事故處理規範 §C、雙通道 SOP §D、檢查器三新規則、CI 全測試涵蓋、測試檔治理)。
- 2026-07-09:下一站邏輯統一為時間判斷 + 自動略過過期項目(修復卡住不推進的 bug)+ 明日預告規則修正 + 新增 pick-next-stop 測試。細節見 07_CHANGELOG。
- 2026-07-09:Sanity CI 上線(qa.yml + check-doc-titles.js,防上傳錯位)+ README 閱讀順序補 15/14/16 + done.md 日期修正。
- 2026-07-09:治理層 v2 修正交付(狀態收斂、文件權威=GitHub、00 定位歷史快照、新增 14/15/16、tests 交付必附規則、憲章與 manifest 同步)。細節見 07_CHANGELOG。
- 2026-07-08:依 Bar 最新決策更新任務板:先等 Day4-6 Sheet 補完,再手機驗收、打包與 Netlify。
- 2026-07-07:GitHub 最新資料同步後,新增 project status 並更新任務板規畫進度。
- 2026-07-06:Codex Ready 文件一致性修正,對齊 README / handover / task board / changelog。
