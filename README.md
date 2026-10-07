# 日本旅遊 App — README

個人帳獨立匯出格式與限制見 [匯出契約](docs/personal-ledger-export.md)（v143 起提供；發布狀態以 tasks/current.md 為準）。

本機驗證與審查：[v143 交付驗證](docs/trippilot-v143-verification.md)。
v144 B 本機保存候選與限制：[驗證記錄](docs/trippilot-v144-b-verification.md)（未推送；完成狀態以 tasks/current.md 為準）。
v145 C 天氣改善與限制：[驗證記錄](docs/trippilot-v145-c-verification.md)（本機完成，未推送；以 tasks/current.md 為準）。

## 這是什麼
六天五夜日本自駕旅遊的手機 PWA。Google Sheets 當 CMS，以單頁 App 搭配少量獨立 runtime module，部署於 Netlify。
- 正式站:https://trippilot-jp.netlify.app/
- 使用者:Bar(產品負責人,非工程師)與同行友人
- **權威來源**:程式與文件以 **GitHub 本 repo 為唯一權威**;個人 Google Drive 只存唯讀過往旅程，不是即時帳務權威。內容資料來源為 Drive 試算表「261018-261023岡山四國六天五夜」(發布 CSV,見 03/schema.js)。

## 快速開始(給 AI / 開發者)
第一閱讀順序:以 `08_AI_HANDOVER.md` 的「閱讀順序」為唯一權威;首次接手依其「接手第一步」輸出理解報告。

- `.ai-manifest.json`:AI 導航檔,掌握專案全貌
- `PROJECT_CONSTITUTION.md`:專案最高規範與 AI Harness 流程
- `08_AI_HANDOVER.md`:交接重點、禁改事項、常見陷阱
- `adr/`:架構決策,重構或推翻既有設計前必讀
- `03_DATABASE.md`:CMS 資料表快速概覽
- `09_SCHEMA_MAPPING.md`:Schema / CMS 欄位細節
- `05_CODING_RULES.md`:程式規範快速概覽
- `11_CODING_CONVENTION.md`:程式規範細節
- `12_DEV_WORKFLOW.md`:常見任務步驟鏈
- `14_FILE_TIERS_AND_GATE.md`:檔案風險分級與 Gate 保護範圍
- `15_AI_EXECUTION_RULES.md`:AI 決策權限、指令效力、不確定性協議、任務分級
- `16_OPS_PLAYBOOK.md`:回滾手冊與 DevOps 安全規範

## 開發工作流程(必守)
1. Bar 用白話描述需求 → AI 以資深工程團隊身分執行
2. 只做被要求的修改,不重構整個專案
3. 交付於 `dev` 分支驗收;正式發版依 `16_OPS_PLAYBOOK.md` §E Release Flow(PR → Bar Review → Bar Merge → Netlify Deploy)
4. 每次修改需通過 QA(斷網/連網/旅行日情境),更新 `07_CHANGELOG.md`
5. 資料內容改動走 Google Sheets,不改程式;程式只在功能/邏輯變動時修改

## 改善設計與計畫

- [v146 首頁驗證](docs/trippilot-v146-verification.md)：結束後打包入口、天氣區域回退及串點目的地主次；保留全部略過、字級、帳務及封存規則。

- [2026-10-03 第一批設計](docs/superpowers/specs/2026-10-03-trippilot-reliability-and-clarity-batch1-design.md)與 [A／B／C 實作計畫](docs/superpowers/plans/2026-10-03-trippilot-batch1-index.md)：分批處理狀態／摘要、本機保存可靠性及天氣資訊，保守調整字體；每批核准、驗證與發布狀態以 `tasks/current.md` 為唯一權威。

## 專案檔案
- `index.html` / `app-version.js` — 保留 v110 predecessor bridge；讓尚未更新的 v110 worker 在 current generation 安裝失敗時仍可運作
- `shell/v148/index.html` / `shell/v148/app-version.js` — v146 本機候選版文件與 App runtime 版本來源；成功啟用的 `sw.js` 才接管 root 導覽；已發布 generation 保持不可變
- `shell/v148/builtin-snapshot.js` — 由刷新工具以既有 v145 種子 CSV 產生的版本綁定離線資料資產，內容與時間戳保持不變；禁止手動修改
- `navigation-intent.js` — 明確導覽目的地的 session-only state module；DOM 定位與回饋 adapter 位於 `index.html`
- `diagnostic-impact.js` — AppLog 原始紀錄的 display-only impact projection；顯示 adapter 位於 `index.html`
- `today-view.js` — Today Hero 採買摘要的純 model／renderer module；資料選擇與 DOM effects 留在 `index.html`
- `shopping-photo-store.js` — 裝置本機採買照片壓縮與 IndexedDB repository boundary
- `buy-to-ledger.js` — 採買轉記帳的純 domain／workflow runtime module
- `ledger-ui-state.js` — Ledger history、entry 與 correction session 的不可變 state／ordered effects workflow module
- `shopping-ui-state.js` — Shopping list selection 與 form session 的不可變 state／ordered effects workflow module
- `trip-progression.js` — 下一站選擇、cluster blocker 與一次性 auto-skip reconciliation module
- `trip-lifecycle.js` — 個人旅程狀態、預檢條件與本機清理 policy
- `trip-archive.js` — 八表及個人狀態封存格式與讀回驗證
- `trip-drive.js` — Google Drive 個人封存及追加式回顧筆記邊界；同次 App 重用有效記憶體授權，取消／逾時可重試，不持久化 token
- `trip-lifecycle-flow.js` — 重置、清除及中斷後恢復的流程協調
- `schema.js` / `validator.js` — 資料規格 SSoT / 防錯與健康檢查
- `tests/` / `tools/` — 可重跑測試與文件一致性檢查
- `tasks/` — 即時工作狀態唯一權威

## v140 設定整理與個人旅程生命週期候選版

「設定 → 資料」依序提供「資料健康狀態」、「照片健康狀態」、「過往旅程」、「備份、還原與版本資訊」。資料健康入口保留正常／需注意摘要；獨立子頁直接顯示行程資料、團體帳、個人資料與照片附件四項狀態，不再收合，返回設定首頁。照片詳細檢查／修復仍在照片頁。過往旅程直接開啟列表，返回設定首頁；Google 元件尚未載入時先準備登入，再由使用者點擊授權。「資料與版本」保留「重置紀錄」、「清除並打包旅程」、備份／還原與版本，不再重複健康明細。重置只清本機個人紀錄與採買照片；不清團體 Queue、已鎖定帳務或身分。清除需八表線上預檢、無本機待同步／橋接、正式團體帳結清且無待回覆 claim；可選先封存至個人 Drive 或不保存直接清除。清除只移除本裝置的 `trip_*`、`v2_cache_*` 與採買照片，保留 inactive 標記；不刪共用 Sheet、其他旅伴手機、Drive 檔案或 SW App Shell。封存不含採買照片、Queue、token 或診斷資料，只有回顧筆記可追加。完整連接新旅程留待第二階段。

過往旅程以唯讀區塊呈現每日行程、採買分配／記帳關聯、個人帳、團體紀錄及旅途紀錄；完整八表與個人設定另保留原始資料展開區。筆記確認上傳與讀回後才清草稿，失敗重試沿用同 note ID。真機清單見 `docs/device-acceptance-log.md` 的 v137 區段。

v140 只整理健康資訊的入口與呈現，健康 model、旅程與帳務契約不變。已發布 v139 不覆寫；新 generation 的健康區塊不再使用 details，亦不保留已無用途的展開狀態。

Google Cloud 專案 `trippilot-510301` 已啟用 Drive API，OAuth Web client「TripPilot Web PWA」的公開 Client ID 已配置於 v137；JavaScript 來源為 `https://nick80912-dev.github.io` 與 `https://trippilot-jp.netlify.app`。只使用 `drive.file`，Client Secret 不進前端或 repo。OAuth 目前為 External Testing，測試使用者只有 Bar；其他旅伴需加入測試使用者或完成 Google 對外發布流程，才可自行授權。v137 起在真實 iPhone／Android PWA 的 Google 授權、上傳讀回、清除後重啟與筆記，已於 2026-10-06 經 Bar 回報驗收完成；驗收帳號只有 Bar，其他旅伴仍受上一句 External Testing 的限制。若已發布版本有問題，依 `16_OPS_PLAYBOOK.md` §A2 forward-bump，不覆寫 v136／v137 檔案。

## 正式部署
- `main` 是正式 Production Branch;日常開發與驗收於 `dev` 分支完成。
- Bar 核准 PR Merge(`dev → main`)後,Netlify 自動執行正式部署;流程與風險分級見 `16_OPS_PLAYBOOK.md`、`14_FILE_TIERS_AND_GATE.md`。
