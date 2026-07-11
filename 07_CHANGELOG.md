# 07 版本紀錄

紀錄格式:日期 / 版本 / 重點。細節不展開,新變更往上加。

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
