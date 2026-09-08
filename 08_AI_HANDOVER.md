# 08 AI 交接文件(給未來的 AI 模型)

## v113 priority theme differentiation handover

- Current local `dev` candidate 為 v113；只修改 Cedar／杉綠、Mist／霧藍、Tea／焙茶的既有 13-token palette，Ocean／Ivory／Wisteria 與所有 layout、資料、互動、Schema、Ledger、同步及備份語意不變。
- Cedar 保留 action `#2f6b4f`，改用 moss paper、torii orange、olive-gold；Mist 改用 fog-blue paper、deep-sea blue、sun-gold、sea-glass；Tea 保留 action `#896748`，改用 warm paper、Kurashiki indigo、kiln-rust。
- Node source contract 驗證三組 paper RGB distance、accent hue distance、secondary 唯一性及 WCAG 對比；Playwright 使用實際 computed styles 驗證 390×844 下的六主題 chrome、幾何、overflow 與優先 palette。root `index.html`／`app-version.js` 仍為 byte-locked v110 bridge。
- v113 尚未 push、merge、部署或建立 tag；最後驗證數字以 `tasks/current.md` 為準。

## v112 UI/UX and Android PWA handover

- v111 已完成 main merge、Netlify production verification 與 `production-v111` tag；目前開發候選為 v112，root `index.html`／`app-version.js` 仍 byte-lock 在 v110 bridge。
- v112 行程卡以 resolved Place／Restaurant 或 itinerary place 為主標題，活動降為次要資訊；導航依 item move 或 resolved travel 選 walking／driving／transit，桃園等台灣目的地不再被附加「日本」。
- 首次 boot 不再強迫選身分；進入分帳或執行既有身分相依操作時才開啟原 selector。Shopping／Ledger 空狀態提供直接 CTA，零資料時隱藏 Ledger 的查看全部、結算與代購管理卡。
- 出發前 Today Hero 的 Day 1 預覽只顯示兩個目的地與剩餘站數，六日摘要排除「出發」等無目的地活動。樓層與營業時間提升至 13px；四分頁、六主題、Schema、Ledger repository、同步與備份語意不變。
- Android Chromium 驗證發現原 worker 在 `Promise.all(fetches)` 後才消耗 response body，會占滿同源連線槽並卡在 installing。v112 在完整驗證後先把每個 response 讀成 Blob，再於全部成功後開 cache 寫入，維持原子安裝且可完成 Android Service Worker 接管與離線重載。
- v112 最終本機及 merged-tree 驗證均為 Node **94/94**、Chromium Playwright **185/185**（single worker、zero retries）；offline BUILTIN、online mock Sheet、旅行日三情境皆為 `healthCheck()=[]` 且 `pageerror=0`。Bar 核准本機合併後，功能 commit `b7b71d3` 已推送 `dev`，merge commit `894591c` 已推送 `main`；未建立 PR，Netlify production 與 Android 實體手機仍待驗證，未建立 production tag。

## v111 generated BUILTIN asset and test-throughput handover (released)

- v110 已完成 Bar device/PWA acceptance、main merge、Netlify production verification 與 `production-v110` tag。v111 後續亦完成 main merge、production verification 與 `production-v111` tag。
- v111 發布時的 `shell/v111/builtin-snapshot.js` 由 `tools/refresh-builtin-snapshot.js` 產生；asset、HTML marker、`shell/v111/app-version.js` 與當版 root `sw.js` 同為 v111。root `index.html`／`app-version.js` 與 `tests/fixtures/sw-v110-production.js` byte-lock 正式 v110 predecessor；v111 install 成功後才映射導覽，失敗則保留 v110 inline BUILTIN 與 cache。
- refresh preview 會偵測缺檔、stale、App version mismatch 與 marker mismatch；`--write` 以 sibling temp、fsync／close／read-back／雙 rename 更新 HTML＋asset，任一步失敗回復兩個 target 原始 bytes。Ledger 仍只用 schema 21 欄 header，從不請求 live CSV。
- runtime asset 缺失或錯版時，先驗證 local active／previous snapshot；有效即 degraded boot，無有效 local data 才顯示含重新載入與複製診斷的 recovery，且不建立空 DB／不啟動 sync。
- 可重算 cold-navigation 證據固定 inline `d0405fe` 與 immutable bridge asset `83e4d2b`：DCL 中位數 181.10 → 185.65 ms（+2.51%），Today 中位數 171.70 → 175.75 ms（+2.36%）；每個樣本均記錄 HTML／App／asset／SW／timestamp identity，外部化通過 ≤10% kill gate。
- worker 實驗的三輪 2-worker 歷史結果早於手動 performance page 的 pageerror tracking，未滿足核准的 adoption rule；依 fallback 保留全環境 single worker、zero retries。
- Current release-hardening tree passes Node **93/93** test files and final Chromium **182/182**（single worker、357.6 s、zero retries/pageerrors/port conflicts）, plus version／document／runtime asset／BUILTIN／performance evidence／JSON／diff gates. Push dev、PR、main merge、Netlify production verification 仍待執行，未建立 production tag。

## v110 UI consistency and Today-module handover (released)

- Bar accepted v109 and authorized the reserved v110 batch. v110 adds a compact non-theme presentation scale for typography, spacing, radius, action hierarchy, and diagnostic roles while preserving all six `--t-*` palettes and the approved visual direction.
- Token adoption is deliberately scoped to touched Today Hero, navigation-feedback, diagnostics, and shared button surfaces. It is not a mechanical whole-app rewrite; browser assertions preserve computed colors, geometry, target sizes, overflow, and reduced-motion behavior across all six themes.
- `today-view.js` is the production-used ES5 UMD seam for Today Hero Shopping presentation. It exposes only `buildModel(input)`, `render(model,helpers)`, and `actionFor(target)`; it owns blank-category display fallback, six-code-point visible stop names, accessible summary wording, existing markup, and declarative `open-shopping-list` intent.
- `index.html` remains the thin adapter for reminder selection, exact-current-stop exclusion, Shopping store and clock access, escaping helpers, `openShoppingList(stopRef)`, and DOM effects. The removed inline helper/renderer has no second production implementation.
- The Ledger history candidate failed its deletion test: filtering, grouping, selection/effect ordering, action availability, and focus-preserving partial DOM updates are already centralized at the accepted seams. No `ledger-history-view.js`, global store, controller, event bus, framework, Schema, repository, record, settlement, correction, backup, synchronization, or storage change was made. See `docs/architecture/ledger-history-deletion-test-v110.md`.
- `navigation-intent.js` remains the v108 module and is unchanged in this batch. v109's 1000ms target highlight, 200ms fade, visually-hidden success announcement, visible missing-target feedback, and Shopping scroll/focus return remain the accepted behavior.
- ADR 0018 is the permanent authority for the Navigation Intent／Diagnostic Impact／Today Hero Shopping seams. Release review clarified that full Hero composition, weather, and next-stop card rendering deliberately remain in `index.html`; it also wired quiet／fixed status presentation colors through `:root` semantic tokens without changing computed visuals or any six-theme palette.
- App and Service Worker forward-bump together to v110; `today-view.js` is registered in `index.html`, `runtime-assets.json`, SW SHELL, README, and `.ai-manifest.json`. SW lifecycle and cache strategy are unchanged.
- Fresh pre-commit and committed-tree v110 evidence passes Node **87/87**, full Playwright **176/176**, focused WebKit **39/39**, version／document／runtime／BUILTIN／manifest／diff gates, and offline Chromium Health with `source:"builtin"`, `healthCheck:[]`, `appLogCount:9`, and `pageErrors:[]`. Fresh fetch found zero remote-only commits; runtime／release commit `49f8e8c` reached `dev` with local／remote equality, followed by this evidence-only handover update. Bar device/PWA verification remains required before v111. No `main` merge, production deployment, or production tag is claimed.



## 你是誰、專案是什麼
你是 Bar 的 AI 工程團隊(CTO/工程師/設計/QA 合一)。Bar **不會程式**,用白話下需求;你負責全部技術決策與實作,不教學、不解釋程式概念(除非被問)。
專案:日本旅遊 PWA。Google Sheets 是 CMS,vanilla JS App 在使用者手機端抓 8 張公開 CSV 渲染,Netlify 託管。CMS 現行 Schema 3.0 以 Places.HID 精確關聯 Hotels.HID；住宿名稱只供顯示。current `shell/v113/index.html` 是 UI 與 DOM adapter；root `index.html`／`app-version.js` 是禁止當日常程式修改的 frozen v110 predecessor bridge。獨立 runtime modules 由 `runtime-assets.json` 登錄，包含 Navigation Intent、Diagnostic Impact、Buy-to-Ledger、Ledger/Shopping UI state 與 Trip progression。`schema.js`、`validator.js`、`sw.js` 等部署檔均在 repo 根目錄,經 GitHub 連動由 Netlify 部署(流程見 16 §E)。

## 接手第一步:Project Understanding Report(先說理解,再動手)
任何 AI 首次接手本專案、或在無既有專案脈絡的新對話/新環境開工時,完成下方閱讀順序後**不得直接修改任何檔案**,必須先輸出理解報告並等 Bar 核准(例:「確認,可以開始實作」)。此要求是「每個 AI 接手時做一次」,不是每個任務都做;同一脈絡內的後續任務依 15 的任務分級與 14 的 Tier 規則執行。

報告模板(全 repo 唯一版本,他處不得另立):
1. 專案目的(我的理解)
2. 已閱讀文件 / 未閱讀文件與原因
3. 目前架構與 Data Flow 摘要
4. 本次任務範圍(Scope)
5. 受影響模組 / 不應觸碰的模組
6. 是否涉及 Schema / ADR / 憲章(各 Yes/No + 說明)
7. 潛在風險與回滾方式
8. 提議方案與預估修改檔案清單
9. 資訊是否足夠開始?缺什麼?

## 閱讀順序(最省 token)
1. `.ai-manifest.json` → 2. `PROJECT_CONSTITUTION.md` → 3. 本文件 → 4. 相關 `adr/` → 5. **必讀** `15_AI_EXECUTION_RULES.md`(決策權限/指令效力/任務分級)→ 6. 依任務讀 `03_DATABASE.md` / `09_SCHEMA_MAPPING.md` / `05_CODING_RULES.md` / `11_CODING_CONVENTION.md` / `12_DEV_WORKFLOW.md` / `14_FILE_TIERS_AND_GATE.md` / `16_OPS_PLAYBOOK.md`
程式碼本體主要在 current generation `shell/v113/index.html` 內嵌 JS(區塊順序見 02)；root `index.html`／`app-version.js` 必須維持 frozen v110 bridge bytes。`navigation-intent.js`、`diagnostic-impact.js`、`today-view.js`、`buy-to-ledger.js`、`ledger-ui-state.js`、`shopping-ui-state.js`、`trip-progression.js` 是 production-used module seams，`schema.js` / `validator.js` 是獨立權威來源。

## 工作流程(必守)
0. 開工前先通過 Pre-Work Git Sync Gate:`git fetch origin --prune`,確認本地與**目前工作分支**(日常 = `origin/dev`)一致且 working tree 乾淨;若不一致先盤點,不得自動覆蓋本地改動。
1. 收到需求先確認範圍;**只改必要函式,不重構整包**
2. 修改 → 跑 repo 內相關可執行測試，並以 `npm run test:browser` 驗證斷網內建／連網同步／旅行日 mock Date 三情境零 pageerror；Playwright 規格位於 `tests/browser/` 並已掛入 `qa.yml`
3. 交付於 `dev` 分支,Bar 驗收後;正式發版依 16 §E(PR → Bar Merge → Netlify 自動部署)
4. 更新 `07_CHANGELOG.md`(有架構變更標 ⭐),必要時更新 06/03

## 絕不可改變(除非 Bar 明確要求)
- CMS 八表結構、CMS Schema 3.0 欄位語意、既有 PID／RID／SID／HID 的意義；Ledger 仍沿用 Schema 2.9 固定 21 欄，`time` 為消費發生時間，末五欄為輸入幣別、免稅品、價格方式、稅率與優惠券金額
- 三層防線(內建→快取→背景同步)與「絕不空白頁」原則
- BUILTIN 是目前旅程的離線啟動種子，不得手改 JSON 或抓取 live Ledger；刷新一律依 `16_OPS_PLAYBOOK.md` §G 先 preview，Bar 核准後才 `--write`，Ledger 只保留 `schema.js` 推導的 21 欄空 header
- 卡片型別由 Places.Type 明確決定,**禁止 AI 猜測型別**
- WebView 相容碼:console polyfill、fetch 相容模式(禁 AbortController)、單一吸頂容器
- 停車 MAP CODE 純顯示(無複製鈕)、「停車同Pxxx」繼承機制
- 渡輪不建班次資料庫;班次資訊維持備註摘要與官方時刻表連結
- UI 的語意角色與今天／行程／購物／分帳四分頁結構不可任意改變；主題只可透過 `data-theme` 覆寫 13 個第一層 `--t-*` token，第二層 `--paper`／`--card`／`--sea-deep`／`--sea`／`--coral` 等角色名稱維持不變。主導覽與設定入口用 inline SVG，內容 Emoji 與桃子診斷徽章保留，不引入 icon font。
- 個人狀態（打卡／想逛／成員身分）、個人帳、代購對象、`themeId` 與 `travelNotes` 只存 localStorage、不進 Queue、CMS 或雲端 Schema；主題、採買單位與旅途紀錄自個人備份 v8 起一併匯出／還原。團體帳一律走 Ledger Repository 跨裝置同步，兩軌資料與統計不得混用。依 ADR 0006，App 只可 append「分帳紀錄」並更新 TripConfig 的 `Exchange Rate` / `Ledger Default Currency`，其餘 CMS 欄位維持 Bar 手動管理且 App 唯讀
- 產品哲學:3 秒原則、不過度工程化(能給連結就不硬轉結構化資料)

## 住宿 HID 關聯現行契約（Schema 3.0，SW v102）
- 關係固定為 `Places(Type=住宿).HID → Hotels.HID` 的 N→1。PID 代表帶有行程與 travel 脈絡的停靠點,HID 才是 Hotel profile join key；Places／Hotels 名稱只供顯示,不得用名稱、子字串或首筆 Hotel fallback 關聯。
- 現行 P002／P013／P022／P031／P040 都引用 H001,但五個 PID 必須保持分離：其 travel 分別為開車30分鐘／開車2小時／開車3分鐘／開車50分鐘／步行3分鐘。入住、退房、地址、停車與備註才由 H001 共用。
- Schema authority 是外部 `schema.js`,inline Schema 必須 exact parity；`09_SCHEMA_MAPPING.md` 表格只能由 `schemaDoc()` 重生。公開 Places 的 HID 是尾端物理欄,刷新工具依位置 authority 驗證,不得擅自移到 Type 後方。
- Validator 條件式要求：住宿必須有 HID、非住宿不得帶 HID、任何 HID 都必須存在於 Hotels；七表候選快照任一違反即 fail closed。Runtime `hotelOf()` 對兩端 HID 去空白／轉大寫後精確解析,天氣住宿共用同一 resolver；未解析時回傳 `null`。
- 這次 migration 不改 Ledger Schema 2.9／21 欄、Apps Script、個人備份 v9、SW lifecycle／cache strategy 或發布權限。v101／v102／v109 裝置／PWA 驗收均已由 Bar 完成；v102 的 HID facts 保留為歷史驗收紀錄。目前交付順序以本文件頂部 v110 handover 為準：完成 v110 gate 與 `dev` delivery → Bar 驗收六主題呈現一致性、Today 採買摘要、exact target、scroll／focus return、診斷與離線 PWA → 驗收完成後才開始 v111。
- **Tier 2 復原**：若 v102 已推送並由裝置接管後需要退回內容,依 `16_OPS_PLAYBOOK.md` §A2 採 forward bump：以最後正常內容建立下一個未使用版本,並讓 `app-version.js`／`sw.js` 同步升版以觸發清除壞快取；不得把版本倒退覆寫,**絕不刪除 `sw.js`**。

## Ledger Schema 2.9 現行契約
- 團體新增與編輯都先透過 `enqueueBatch(records)` 一次耐久寫入本機 Queue，入列成功即完成 UI 儲存並背景送達；不可改回等待 Apps Script POST 才關閉表單。公開 CSV 跨裝置可見延遲 1–5 分鐘是已接受取捨。
- TEST 模式是獨立平行帳本：開啟時團體儀表板、今日、結算與明細只計算 `[TEST]`，關閉時只計算正式資料；個人帳不受 TEST 模式影響。
- 個人編輯可原地替換本機紀錄。尚未落入 canonical 還款確認切點的團體收據，編輯時 append 舊筆墓碑（原因固定「編輯修改」）與新替代筆，新筆以 `replacesRecordId` 指向原紀錄。
- canonical 還款確認成立後，切點前既有團體收據永久禁止直接編輯／刪除；全團餘額歸零不解除保護。只有原付款人可用引導式流程整張追加更正或作廢，付款人不可變，更正原因必填。
- 更正使用 `expense_correction_item` + `expense_correction_commit`，作廢使用 `expense_void_commit`；資料仍沿用固定 21 欄，不新增 Sheet 欄位或 Apps Script API。item 先入列、commit 最後入列；缺件版本不得生效，歷史與 losing conflict 永久保留。
- 更正送出前必須顯示品項變更、受影響成員與餘額差；已結清團體因更正重新出現餘額時，舊還款確認維持完成並建立新的待結算餘額。詳細規格見 `docs/superpowers/specs/2026-07-29-settlement-consistency-guided-correction-design.md`。

## 常見陷阱(前人踩過)
- 同名 function 後者勝且提升 → 包裝舊函式必先改名,禁 `var old=fn`
- 老 WebView 無 console.info、fetch 帶 options 會拋 clone 錯誤
- Google 試算表 `/edit` 連結讀不到,必須用「發布到網路」CSV;web_fetch 可能被 robots 擋,改走 Drive 連接或由使用者瀏覽器端抓
- item id 含「/」(如 10/19_2),CSS selector 需 escape,DOM 查找用 getElementById

## 現行診斷契約（2026-08-09）
- `AppLog` 六類方法仍輸出既有 console level／前綴，並只在記憶體保存本次 session 最新 100 筆；每筆訊息最多 1,000 字，`snapshot()` 不暴露內部可變狀態。
- `currentHealthFindings()` 是診斷面板的無副作用讀取；`window.healthCheck()` 才會輸出健康報告並寫入 AppLog。單純開啟面板不得製造新紀錄。
- 桃子診斷面板可顯示、複製與清除 AppLog；不得將紀錄改存 localStorage、IndexedDB、備份或遠端，也不得恢復已退役的 iOS 手勢事件收集。
- 診斷面板已移除團體帳測試模式區塊；設定頁控制、TEST 前綴及正式／TEST universe 隔離仍是現行能力，不得連帶刪除。

## 現行網路／呈現降級契約（2026-08-09）
- `fetchSheet()` 第一次失敗後必須等待 800ms 才執行唯一一次重試；第一次成功不得等待，第二次失敗不得再重試，且最終錯誤必須維持可供 snapshot orchestration 判斷。
- `toast()` 是非必要呈現效果；`#toast` 不存在時必須在改動 `toastAction`／`toastTimer` 前安全返回，不得讓提示失敗中斷同步、儲存或其他業務流程。

## 現行 Ledger 近期消費卡契約（2026-08-09）
- 個人與團體單筆卡嚴格只有兩個 single-line content row；第一行固定為「品項名稱 → 個人代購／團體付款與分攤」，第二行固定為「店家 → 類別 → 免稅品 → TEST → 待同步 → 已鎖帳／已更正 N 次」。所有 Ledger 清單卡均隱藏付款方式；該值只在消費明細與支付方式篩選等既有功能顯示。
- 個人批次父卡顯示收據標題及品項／免稅／代購數；團體父卡另顯示「[付款人]付款 · 分攤依品項」。展開子項才揭露各品項的精確代購／分攤與狀態；不得在父卡宣稱所有子項分攤相同。
- 單筆與批次父卡的兩行都靠左且不得換行，行內及整個兩行內容區塊垂直置中；長品項、店家／類別、摘要與狀態以 ellipsis 截斷，不能產生第三行、水平 overflow 或與右側金額重疊。
- 個人代購保留 coral 配色但使用 compact 字級；團體付款／分攤、鎖帳與更正使用 neutral `line-soft`／`ink-soft`，待同步使用既有黃色。不得改變任何狀態條件、文案或鎖帳／更正互斥規則。
- 這只是 `renderLedgerRecentRecord()` presentation contract；不得藉此改動 participant parsing、付款／分攤計算、Ledger repository 或資料格式。

## 現行 Shopping 明細記帳狀態契約（2026-08-09）
- Shopping 清單仍是個人、本機資料；明細記帳進度計算的是 allocation 對應 Ledger 品項「筆數」，不是付款人、團體成員或分攤人數。付款人／分攤只在 Ledger 表單決定。
- 明細不再有獨立「記帳進度」列；既有「狀態」列先顯示待買／已買，再以 ` · ` 接未記帳、已記帳 N／總數筆，或 linked／unverified／unlinked 混合筆數。逐 allocation 紀錄、已記帳明細導航與解除關聯維持原行為。
- 無待確認時，footer 依進度顯示「記帳」或「繼續記帳（剩 N 筆）」；任何 allocation 為 unverified 時，顯示原生 disabled「等待狀態確認」與同步原因，不提供 callable 記帳入口。三態與 preflight 仍由 `buy-to-ledger.js` 決定，renderer 不另造 domain 規則。

## 關鍵資源
- 正式站:https://trippilot-jp.netlify.app/
- 測試站:https://dev-trippilot-jp.netlify.app/
- CMS fileId:`1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`(gid 與資料表概覽見 03;欄位細節見 09)
- Bar 的溝通偏好:直接執行、精簡回報、表格化 QA 結果、繁體中文
