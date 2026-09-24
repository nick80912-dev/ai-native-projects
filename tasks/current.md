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



> 更新於 2026-09-10。細任務層;里程碑看 `06_ROADMAP.md`,**逐版交付紀錄一律看 `07_CHANGELOG.md`**,正式待辦看 `tasks/backlog.md`。
> 本檔只回答三件事:**現在線上是什麼、dev 上是什麼、下一批要做什麼**。歷史流水帳不放這裡。

## 📌 現況

| 項目 | 值 |
|---|---|
| **`origin/main` 原始碼** | **SW v126**;merge commit `4c9233e`(PR #28) |
| **正式站** | `https://trippilot-jp.netlify.app/` — **SW v114**(2026-09-10 實查:deploy `6aa25e07`,`commit_ref` = `39c96b2` = main HEAD,`published_at` 有值,tag `production-v114`);**v114 發布後補驗**:BB1–BB3 共 14 項 iPhone 已於 2026-09-11 通過,**BB4 共 8 項實體 Android 未驗** |
| **`origin/dev` candidate** | **SW v126**;已與 `main` 同步於 `4c9233e`,另有數筆 backlog 文件 commit |
| 個人備份格式 | **v9**(`PERSONAL_STATE_SUPPORTED_VERSIONS = [1..9]`)—— v81 因想逛 key 識別語意變更而升版 |
| candidate automated validation | Node **95/95**、Chromium Playwright **191/191**；三種啟動情境 `healthCheck()=[]`、`pageerror=0` |
| 既有 tag | `production-v18`、`production-v73`、`production-v110`、`production-v111`、`production-v113`、`production-v114`、`production-v115`、`production-v116`、`production-v117`、`production-v118`、`production-v119`、`production-v121`、`production-v122`、`production-v123`、`production-v124`、`production-v125`、**`production-v126`** |

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
## 下一棒

→ **由 Bar 在實體 Android 上完成 BB4 共 8 項**(判準版本現為 **v121**),另有 v115 6／v116 10／v117 4／v118 6／v119 5／v120 4／v121 7 項待 iPhone 補驗。**合計 50 項,全部在使用者已拿得到的版本上。**`docs/device-acceptance-log.md` 的 v114 段 22 項中,BB1–BB3 共 14 項已於 **2026-09-11** 由 Bar 在 iPhone 上確認通過;**剩下的 BB4 是併入的 v112 遺留項,只能在實體 Android 上驗。**

> 最關鍵的是 **BB4-a**:Service Worker 能否在實體 Android 上安裝並接管。v112 修的連線槽耗盡缺陷**只在真機發生**,桌機與 Playwright 的 Android 模擬都重現不出來。判斷方式:開啟網站 → 關掉 → 再開,設定的版本資訊顯示 **v114** 才算通過(顯示 v110 代表 SW 沒接管)。
>
> 補驗發現問題時,依 `16_OPS_PLAYBOOK.md` §A2 **forward bump 到 v115**,不得倒退覆寫 —— 已經有裝置接管 v114 了。

> GitHub Actions 與 Netlify production **已於 2026-09-08 接管 v113** —— deploy `6a9fb443`、`commit_ref` = `745bb6f`、線上 `sw.js`／`app-version.js` 皆 v113、`qa-sanity` 於 `main` `745bb6f` 與 `dev` `f0444cb` 皆 success。**這一步已完成，不需再確認。**
>
> **`production-v113` 已於 2026-09-11 建立**(v113 清單 14／14 通過後解除封鎖),指向 `745bb6f`。該 tag 為**回溯補建** —— 正式站早於 2026-09-10 換成 v114,無法再對 v113 做線上驗證,tag 訊息已明記所依據的線上核對是 2026-09-08 當時那一次。**`production-v112` 仍不得建立** —— v112 的裝置驗收已併入 v114 的 BB4,而 BB4 尚未執行。**未完成正式發版流程前不得建立 production tag。**

> 正式發布仍必須遵守 §E：PR 與 Actions 通過後才能 merge；Netlify 線上驗證通過後才能建立 production tag。
