# BACKLOG(待辦,依優先序)

> 更新於 2026-07-28。做完的移到 done.md,正在做的移到 current.md。

## 高優先(驗收後立即)
1. **QA 腳本入版控**:Playwright 三情境腳本(斷網內建/連網同步/旅行日 mock Date)寫入 `tests/`,之後每次程式交付必附可執行測試(Bar 已核准 2026-07-09);完成後掛進 `.github/workflows/qa.yml`(Sanity CI 已於 07-09 先行上線)。

## 中優先(已核准正式待辦)
2. **品質批**(2026-07-10 彙整,Bar 已核准方向):
   - reconcileDayProgress 重構:把自動略過的寫入從 pickNextStop 抽出,恢復純函式(消除渲染副作用)
   - **隱藏「重置今日進度」**(Bar 裁定:隱藏式,避免旅伴誤觸;入口併除錯面板,連點標題 5 下)
   - 行程頁面板展開狀態跨重繪保留(仿 shopOpenFloors 模式)
   - 隱藏除錯面板後續評估(AppLog 環形緩衝 + healthCheck);iOS 手勢診斷已退役，保留 no-op `dblclick` 相容性監聽器
   - 同步徽章相對時間(「離線版 · 昨天 21:03」)
   - partial 同步時 toast 列出失敗表名(混版本資料可感知)
   - 天氣雨%改取「現在之後」最大值;fetchSheet 重試加 800ms 退避;toast() null guard
   - 未來測試模擬版:localStorage 前綴隔離(TEST 版不再污染正式狀態)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
3b. **採買單位未納入個人狀態備份**:`trip_shopping_units` 目前不在備份 payload 內(備份已含 `ledgerCategories`／`ledgerPayMethods`)。還原到新裝置時自訂單位會退回預設清單;既有項目的 `unit` 字串仍存在項目上、顯示不受影響。納入需再升一版備份格式(目前 v7,v64 已因 `allocations[]` 由 v6 升上來但未順道納入單位),待與其他備份調整一併處理。
4. **BUILTIN 快照更新 SOP 文件化**:何時重抓、步驟、由誰觸發(目前僅口頭慣例)。
5. **GitHub Pages 已啟用,待完成最終真機驗收**:
   - Pages 已啟用並可載入:`https://nick80912-dev.github.io/ai-native-projects/`,Deploy from a branch(`dev`,repo 內無 Pages workflow),子路徑 `/ai-native-projects/`。
   - **已完成**(2026-07-26 子路徑實跑):App Shell 於子路徑載入、manifest `start_url`／`scope` 相容、SW 註冊 scope 不依賴網域根目錄、直接開啟與重新整理、停掉伺服器後的離線啟動、與 Netlify 的 origin 隔離、發布來源確認為 `dev`(推送後服務中的 `sw.js` 由 v61 變 v62)。
   - **尚待驗收**:iOS Safari 的 PWA 安裝與 standalone 模式、iOS 真機離線重開、`github.io` origin 上的 SW 更新實際節奏(Pages 一律 `max-age=600`,`netlify.toml` 的 `no-cache` 不生效)。
   - LAN 真機與 Pages 驗收 SOP 已納入 `16_OPS_PLAYBOOK.md` §F。
   - **Netlify 額度**:Netlify 自動部署已由 Bar 手動停用,日常功能驗收改走 GitHub Pages;僅在需要驗證 Netlify 特有行為時手動部署測試站。自動部署的恢復時機由 Bar 決定。月額度用量仍須持續監控。
6. **主題系統延後至 merge 後**:保留現行海洋色為預設,另新增兩個主題,共三選項。
7. **主題區掛入準備**:設定頁已建立骨架與主題區預留註解,待主題批掛入。
8. **UI 配色規範覆寫**:`08`「UI 配色變數不可變」條文覆寫已由 Bar 核准(2026-07-17),待主題批執行。
9. **設定頁 2.0 批**:完整範圍為分區架構、SVG 齒輪入口、摘要計數列、代購對象管理移入設定頁、APP_VERSION 版本資訊列、使用者版更新日誌子頁、成員管理子頁。
10. **採買清單批**:已於 2026-07-23 發包並完成(純 localStorage、地點已知/未知雙型、Today 提醒與常駐輕量入口、勾選已買轉記帳閉環、多選轉多品項記帳),待 Bar iPhone Safari／PWA 真機驗收。
11. **BUILTIN 種子資料過時**:內嵌離線快照 Day 3–6 仍為東京舊行程,與現行岡山行程不符,待 Bar 裁定刷新時機。此項與第 4 項「BUILTIN 快照更新 SOP 文件化」不同,兩者並存,不得合併或取代。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
13. **結算一致性批（必須於 2026-10-18 出發前完成）**：
   - 內容：已完成結算之原始消費的編輯／刪除保護，與正式更正流程。
   - 現況為已知開放風險：付款人仍可刪除已結算消費，會使 confirmed settlement 失效且無自動修正機制。
   - 核心設計題（待裁定）：更正＝新增反向消費（append-only，零新機制）或 reopen settlement（改狀態機）。
   - 判定影響範圍時，一筆多人分攤紀錄可能影響多組債權關係，不得只檢查單一 pair。
14. **採買清單 C＋E＋G 第三批**(設計已提出,尚未實作;A／B／D／F 已於 SW v60／v61 交付):
   - **C 個人↔團體切軌時的逐項資訊保留**:Ledger 多品項草稿切軌時,需保留逐項 `isProxy`／`proxyTarget` 及採買來源 `sourceShoppingItemId`／`sourceShoppingAllocationId`,避免代購資訊與採買記帳關聯消失;需先定義契約並補齊測試再實作。
   - **E「必買」在站點群組內置頂**:現行排序只到 `dayIndex → 當日 items index`,站點內未讓必買優先;排序鍵須維持 `日期 → 站點 → 站內必買優先`,不得跨站或跨日重排。
   - **G 表單位置跳動**:編輯清單深處的項目時,表單仍出現在清單最上方。G 的另一半「列動作統一收進 `⋯`」已被後續決策取代 —— 「部分購買」與「記帳」刻意留在卡片上,只有低頻動作收進 `⋯`,不得回頭把它們收走。

## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
21. **Sanity CI dev 觸發評估**:`qa.yml` 現僅於 `main` push / Pull Request 執行，評估是否讓 `dev` push 也產生 GitHub Actions 綠勾；核准前以本機同等 CI 驗證。
22. **Hotels 名稱比對改良評估**:現以名稱掛 Places,名稱異動會懸空;評估改 PID 引用(涉及 schema,需五段提案)。
23. **12 月東京行接入**:新行程分頁 + TripConfig transport=transit;SHEETS 加一組 gid。
24. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
