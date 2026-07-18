# BACKLOG(待辦,依優先序)

> 更新於 2026-07-18。做完的移到 done.md,正在做的移到 current.md。

## 高優先(驗收後立即)
1. **分帳 2.0 PR 2 — 個人／團體雙軌資料層**：PR 1 驗收後，建立個人 localStorage 與團體 Ledger 雙軌、自訂類別／支付方式及匯出還原；獨立 commit 與驗收。
2. **分帳 2.0 PR 3 — 個人真刪與團體墓碑刪除**：PR 2 驗收後執行；以正式欄位保存刪除目標與必填原因，移除新負向沖銷建立邏輯但保留歷史相容。
3. **分帳 2.0 PR 4 — 團體結算與金額分配純函式**：PR 3 驗收後執行；依 participants 快照、最大餘數法與確定性貪婪法建立可測試核心。
4. **分帳 2.0 PR 5 — 儀表板、快速記帳、多品項與代購**：PR 4 驗收後才建立 UI；不得重新實作資料契約或結算邏輯。
5. **QA 腳本入版控**:Playwright 三情境腳本(斷網內建/連網同步/旅行日 mock Date)寫入 `tests/`,之後每次程式交付必附可執行測試(Bar 已核准 2026-07-09);完成後掛進 `.github/workflows/qa.yml`(Sanity CI 已於 07-09 先行上線)。

## 中優先(品質批 — 驗收小修正回報後一併執行,全 B 級)
6. **品質批**(2026-07-10 彙整,Bar 已核准方向):
   - reconcileDayProgress 重構:把自動略過的寫入從 pickNextStop 抽出,恢復純函式(消除渲染副作用)
   - **隱藏「重置今日進度」**(Bar 裁定:隱藏式,避免旅伴誤觸;入口併除錯面板,連點標題 5 下)
   - 行程頁面板展開狀態跨重繪保留(仿 shopOpenFloors 模式)
   - 隱藏除錯面板後續評估(AppLog 環形緩衝 + healthCheck);iOS 手勢事件框已因雙擊放大再現而恢復為純觀測 24 筆環形緩衝,AppLog 擴充仍待評估
   - 同步徽章相對時間(「離線版 · 昨天 21:03」)
   - partial 同步時 toast 列出失敗表名(混版本資料可感知)
   - 天氣雨%改取「現在之後」最大值;fetchSheet 重試加 800ms 退避;toast() null guard
   - 未來測試模擬版:localStorage 前綴隔離(TEST 版不再污染正式狀態)
7. **驗收後 UI/內容微調**(最小修改,不動 schema)。
8. **BUILTIN 快照更新 SOP 文件化**:何時重抓、步驟、由誰觸發(目前僅口頭慣例)。
9. **Netlify 額度事故後續**:監控月額度用量;若再逼近上限，評估遷移 GitHub Pages(涉 SW scope/start_url 相對路徑檢查)。

## 低優先(未來,不急)
10. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
11. **Sanity CI dev 觸發評估**:`qa.yml` 現僅於 `main` push / Pull Request 執行，評估是否讓 `dev` push 也產生 GitHub Actions 綠勾；核准前以本機同等 CI 驗證。
12. **Hotels 名稱比對改良評估**:現以名稱掛 Places,名稱異動會懸空;評估改 PID 引用(涉及 schema,需五段提案)。
13. **12 月東京行接入**:新行程分頁 + TripConfig transport=transit;SHEETS 加一組 gid。
14. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)。
15. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。

## 想法池(未承諾)
- 主題系統延後至 merge 後:保留現行海洋色為預設,另新增兩個主題,共三選項。
- 設定頁已建立骨架與主題區預留註解,待主題批掛入。
- 08「UI 配色變數不可變」條文覆寫已由 Bar 核准(2026-07-17),待主題批執行。
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
