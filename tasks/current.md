# CURRENT(現在正在做的)

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
- **正式部署已完成（2026-09-08）**：Netlify production deploy `6a9fb443`，`commit_ref` = `745bb6f`（與 `origin/main` HEAD 相符），`published_at` 有值；線上 `sw.js` 與 `shell/v115/app-version.js` 皆為 `v113`。**尚待 Bar 對三組主題做裝置驗收。**


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



> 更新於 2026-09-10。細任務層;里程碑看 `06_ROADMAP.md`,**逐版交付紀錄一律看 `07_CHANGELOG.md`**,正式待辦看 `tasks/backlog.md`。
> 本檔只回答三件事:**現在線上是什麼、dev 上是什麼、下一批要做什麼**。歷史流水帳不放這裡。

## 📌 現況

| 項目 | 值 |
|---|---|
| **`origin/main` 原始碼** | **SW v114**;merge commit `39c96b2`(PR #16) |
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v114**(2026-09-10 實查:deploy `6aa25e07`,`commit_ref` = `39c96b2` = main HEAD,`published_at` 有值,tag `production-v114`);**v114 發布後補驗**:BB1–BB3 共 14 項 iPhone 已於 2026-09-11 通過,**BB4 共 8 項實體 Android 未驗** |
| **`origin/dev` candidate** | **SW v115**(未發布);在 `main` `39c96b2` 之上多出文件與 v115 forward bump |
| 個人備份格式 | **v9**(`PERSONAL_STATE_SUPPORTED_VERSIONS = [1..9]`)—— v81 因想逛 key 識別語意變更而升版 |
| candidate automated validation | Node **94/94**、Chromium Playwright **185/185**；三種啟動情境 `healthCheck()=[]`、`pageerror=0` |
| 既有 tag | `production-v18`、`production-v73`、`production-v110`、`production-v111`、**`production-v113`**(2026-09-11 回溯補建)、**`production-v114`** |

**v114 已發布至正式站(2026-09-10,deploy `6aa25e07`),`production-v114` tag 已建立。G1 的 iPhone 半邊於 2026-09-11 補驗通過,Android 半邊(BB4)仍未驗。**

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

## v115 forward bump:兩處觸控命中區修正(2026-09-12,dev,未發布)
- 2026-09-12 以 chrome-devtools MCP 在 390×844 實測 v114 發現兩處缺陷,**非使用者回報**:
  - 設定頁「簡易結算模式」的 `.settings-row` 是 `<div>`,52px 的列不是熱區,**只有 22×22 的 checkbox 可點**,點文字無反應。改為 `<label>` 後整列可切換;既有 `aria-label` 未動,可及名稱不受影響。
  - 分帳頁待同步指示器 `.ledger-summary-rate.pending` 的命中區僅 **13px 高**。**該處的扁平琥珀樣式是刻意設計**(`rgba(255,240,190,.9)` + `cursor:pointer`),因此只以 padding 撐開命中區至 **31px**、等量負 margin 抵銷,**外觀與版面完全不變**(卡片高度 231px 於兩種狀態相同)。
- 依 ADR 0019 immutable generation,已發布的 `shell/v114/` 不得就地改,故走完整 forward bump 至 **v115**。`shell/v111`–`v114` 一律保留。 <!-- generation-exempt: 這一行描述的是 v114->v115 升版當下的事實(不得就地改的舊 generation、保留的舊世代),不隨後續升版變動 -->
- **BB4 的判準版本隨之由 v114 改為 v115** —— 不是重做驗收,BB4 至今仍未執行過;驗 v115 反而等同一次驗完 v112／v113／v114／v115 四版。
- 本次 forward bump **未改動任何測試檔的 generation 路徑** —— backlog #27 的遷移(2026-09-11)剛好在此回收成本。僅兩處必要維護:`theme-system.test.js` 的五筆滾動視窗尾四筆(歷史 release note,依裁定寫死),以及 `pwa-shell.test.js` 的 7 處轉義形式路徑(#27 當時的 grep 用 `shell/v114` 比對,漏掉正則字面裡的 `shell/v114/`)。 <!-- generation-exempt: 這一行描述的是 v114->v115 升版當下的事實(不得就地改的舊 generation、保留的舊世代),不隨後續升版變動 -->
- 完整 gate 與 95/95 通過;已在 390×844 實測兩處修正生效且無視覺回歸。**尚未發布,待 Bar 決定是否併入 main。**

## 下一棒

→ **由 Bar 在實體 Android 上完成 BB4 共 8 項**(判準版本 2026-09-12 起為 **v115**),另有 **v115 delta 清單 6 項**待 iPhone 確認。`docs/device-acceptance-log.md` 的 v114 段 22 項中,BB1–BB3 共 14 項已於 **2026-09-11** 由 Bar 在 iPhone 上確認通過;**剩下的 BB4 是併入的 v112 遺留項,只能在實體 Android 上驗。**

> 最關鍵的是 **BB4-a**:Service Worker 能否在實體 Android 上安裝並接管。v112 修的連線槽耗盡缺陷**只在真機發生**,桌機與 Playwright 的 Android 模擬都重現不出來。判斷方式:開啟網站 → 關掉 → 再開,設定的版本資訊顯示 **v114** 才算通過(顯示 v110 代表 SW 沒接管)。
>
> 補驗發現問題時,依 `16_OPS_PLAYBOOK.md` §A2 **forward bump 到 v115**,不得倒退覆寫 —— 已經有裝置接管 v114 了。

> GitHub Actions 與 Netlify production **已於 2026-09-08 接管 v113** —— deploy `6a9fb443`、`commit_ref` = `745bb6f`、線上 `sw.js`／`app-version.js` 皆 v113、`qa-sanity` 於 `main` `745bb6f` 與 `dev` `f0444cb` 皆 success。**這一步已完成，不需再確認。**
>
> **`production-v113` 已於 2026-09-11 建立**(v113 清單 14／14 通過後解除封鎖),指向 `745bb6f`。該 tag 為**回溯補建** —— 正式站早於 2026-09-10 換成 v114,無法再對 v113 做線上驗證,tag 訊息已明記所依據的線上核對是 2026-09-08 當時那一次。**`production-v112` 仍不得建立** —— v112 的裝置驗收已併入 v114 的 BB4,而 BB4 尚未執行。**未完成正式發版流程前不得建立 production tag。**

> 正式發布仍必須遵守 §E：PR 與 Actions 通過後才能 merge；Netlify 線上驗證通過後才能建立 production tag。
