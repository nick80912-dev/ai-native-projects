# CURRENT(現在正在做的)# v103 current dev candidate

- v102 Bar device/PWA acceptance is complete.
- v103 is the current dev candidate: the active-trip Today Hero combines a weather outing hint and itinerary-aware Shopping summary; the exact next Shopping stop remains in its existing badge.
- Optimization roadmap: retain the Today Hero single-row briefing contract, including 44px/focus/ellipsis behavior and no duplicate next-stop reminder.
- Next action: device/PWA appearance and interaction verification on the v103 dev candidate. Do not merge main, deploy production, or create a production tag.
- Automated evidence: fresh v103 gate passed 83/83 Node test files and 149/149 Playwright cases; document-title, app-version, runtime-assets, BUILTIN no-drift, manifest JSON, and diff checks passed.



> 更新於 2026-08-11。細任務層;里程碑看 `06_ROADMAP.md`,**逐版交付紀錄一律看 `07_CHANGELOG.md`**,正式待辦看 `tasks/backlog.md`。
> 本檔只回答三件事:**現在線上是什麼、dev 上是什麼、下一批要做什麼**。歷史流水帳不放這裡。

## 📌 現況

| 項目 | 值 |
|---|---|

| v103 | Active-trip Today Hero actionable summary: itinerary-date weather hint and next eligible Shopping location in one compact row; exact next stop remains in its existing badge | Current dev candidate; device/PWA appearance and interaction acceptance is next |
| **`main` 原始碼** | **SW v96**，PR #13 merge commit `02705c3`；因 Netlify 額度用罄尚未部署／建立 tag |
| 正式站 | `https://trippilot-jp.netlify.app/` — 2026-08-01 由 SW v18 升級至 v73,G1–G6 全數通過 |
| **dev 候選版** | **SW v102**；住宿停靠點以 Places.HID 精確連到 Hotels.HID，Schema 3.0 條件驗證、BUILTIN 與 runtime resolver 已同步；名稱只供顯示 |
| 個人備份格式 | **v9**(`PERSONAL_STATE_SUPPORTED_VERSIONS = [1..9]`)—— v81 因想逛 key 識別語意變更而升版 |
| dev 自動驗證 | v102 最終 fresh gate：**83／83** Node test files、完整 Playwright **148／148**（0 skipped、0 failed；住宿 HID 320／375／390px **3／3**）；runtime asset CLI、`check-doc-titles`、`check-app-version`、BUILTIN no-drift、manifest JSON 與 `git diff --check` 全部通過 |
| 既有 tag | `production-v18`、`production-v73` |

**`main` 已合併 v96，但正式站仍停在 v73；v102 是目前 `dev` 的下一個候選版。** v74–v87 已由 Bar 於 2026-08-03 確認真機驗收皆正常；v88–v89、v92–v95 亦於 2026-08-08 完成 Bar 畫面／真機確認。v96 因 Netlify 額度用罄尚未正式部署，也未建立 `production-v96` tag。Bar 於 2026-08-11 明確確認 v101 裝置／PWA 外觀驗收完成；v102 接續交付住宿 HID 精確關聯,不改既有發布缺口。

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
| G1 | SW v73 Bar 真機／PWA 驗收 | ✅ 2026-08-01,清單見 `docs/batch2-device-acceptance.md` |
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
| G5' | 正式站部署後線上驗證 | ⏸ Netlify 額度用罄，正式站仍為 v73 |
| G6' | 建立 `production-v96` tag | ⏸ 等待正式部署與線上驗證 |

> G1／G4／G5 為 Bar 專屬職責;AI 不得以自動驗證全綠為由推進。
> **測試站驗收前置**:`dev-trippilot-jp.netlify.app` 自動部署已於 2026-07-26 關閉。用它驗收前必須先手動部署到目標 commit,並依 `16_OPS_PLAYBOOK.md` §F5 核對線上 `sw.js`／`app-version.js` 版本與 CacheStorage 實際內容,**不得只看 Git 分支**。

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
| v102 | 住宿停靠點改以 Places.HID 精確關聯 Hotels.HID；Schema 3.0、條件驗證、BUILTIN 與 exact resolver 同步 | ✅ 最終 whole-branch review、完整 gate 與 dev push（`ffc9aae`）完成；待 Bar 裝置驗收 |

**已知未做(需先定判準)**:Today 的「交通／停車／營業／付款／提醒**依當下情境動態調整優先順序**」。v84 只做了可明確驗收的收合(常駐交通／停車／營業,收合付款／提醒);「當下情境」的判準(依時間?依距離?依是否已抵達?)尚未定義,不同讀法會做出完全不同的東西,故未實作。

## 下一棒

→ **v102 已通過最終 whole-branch review 並推送 `dev`（`ffc9aae`）；下一步由 Bar 開啟 dev PWA 驗收 v102。** 確認五個住宿停靠點都顯示 H001 profile、各自交通時間不變、不再出現 Places.HID 未知欄位警告、無錯誤或水平 overflow，且既有資料存在。不得自行 merge `main`、部署正式站或建立 production tag。

> **不得**自行動 `main`、部署正式站或建立 production tag。未經 Bar 核准不得 merge `dev → main`。
