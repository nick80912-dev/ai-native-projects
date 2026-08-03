# CURRENT(現在正在做的)

> 更新於 2026-08-02。細任務層;里程碑看 `06_ROADMAP.md`,**逐版交付紀錄一律看 `07_CHANGELOG.md`**,正式待辦看 `tasks/backlog.md`。
> 本檔只回答三件事:**現在線上是什麼、dev 上是什麼、下一批要做什麼**。歷史流水帳不放這裡。

## 📌 現況

| 項目 | 值 |
|---|---|
| **正式版(`main` / 正式站)** | **SW v73**,merge commit `17c423f`,回滾 tag `production-v73` |
| 正式站 | `https://trippilot-jp.netlify.app/` — 2026-08-01 由 SW v18 升級至 v73,G1–G6 全數通過 |
| **dev 候選版** | **SW v81**,最新 SHA `3c7c115`,`app-version.js` 與 `sw.js` 均為 v81 |
| 個人備份格式 | **v9**(`PERSONAL_STATE_SUPPORTED_VERSIONS = [1..9]`)—— v81 因想逛 key 識別語意變更而升版 |
| dev 自動驗證 | **62／62** Node test files、Playwright **64／64**、`check-doc-titles` 與 `check-app-version` 通過 |
| 既有 tag | `production-v18`、`production-v73` |

**`dev` 領先 `main` 八個候選版(v74–v81),全部尚未正式發布。** v74 起的每一批都通過完整自動驗證,但只有 v73 經過 Bar 真機驗收與正式部署。

### v74–v81 已折疊的主要能力

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

### v74–v81(尚未開始)

| # | Gate | 狀態 |
|---|---|---|
| G1' | v74–v81 累積 delta 的 Bar 真機／PWA 驗收 | ⬜ **未開始** |
| G4' | Bar 核准 PR merge `dev → main` | ⬜ 未開始 |
| G5' | 正式站部署後線上驗證 | ⬜ 未開始 |
| G6' | 建立 `production-v81`(或屆時版本)tag | ⬜ 未開始 |

> G1／G4／G5 為 Bar 專屬職責;AI 不得以自動驗證全綠為由推進。
> **測試站驗收前置**:`dev-trippilot-jp.netlify.app` 自動部署已於 2026-07-26 關閉。用它驗收前必須先手動部署到目標 commit,並依 `16_OPS_PLAYBOOK.md` §F5 核對線上 `sw.js`／`app-version.js` 版本與 CacheStorage 實際內容,**不得只看 Git 分支**。

## ▶️ 下一批:v82「操作脈絡保存」

2026-08-02 核定的五頁優化 roadmap 已切成可獨立驗收的批次,每批鎖定一個版本。第一批範圍:

- 共用的 session-only 暫態 UI state 契約(不進 localStorage、不進備份)
- 底部分頁切換保存／還原捲動位置;再點目前分頁回頂
- 明確入口 intent 覆蓋捲動還原(結構化、一次性)
- 行程頁面板展開狀態在重繪後保留
- 行程打卡改為有語意、可鍵盤操作的 checkbox
- 鍵盤操作後的焦點還原,以及目標消失時的合理 fallback
- 「回到現在」入口

後續批次(範圍已定,計畫另出):

| 版本 | 主題 |
|---|---|
| v83 | Today 即時資訊:下一站待買、現在之後的最高降雨率、次要資訊收斂、購物搜尋結果摘要 |
| v84 | 資料可感知性:今日支出與旅程累計、同步相對時間與 partial 失敗來源、個人／團體脈絡分離、設定頁資料健康摘要 |
| v85／v86 | SW 更新提示 —— **需兩個版本才能完成驗收**:v85 加入監聽與提示,v86 作為真實更新目標。不修改 SW 生命週期與快取策略,只做正常版本遞增 |

## 下一棒

→ **v82「操作脈絡保存」批的計畫與實作。** 文件校正(本檔)已獨立完成,不升版本。

> **不得**自行動 `main`、部署正式站或建立 production tag。未經 Bar 核准不得 merge `dev → main`。
