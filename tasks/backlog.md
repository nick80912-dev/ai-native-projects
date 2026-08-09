# BACKLOG(待辦,依優先序)

> 更新於 2026-08-09。做完或經 Bar 裁定不再需要的項目移到 done.md,正在做的移到 current.md。

> **編號刻意不連續,不得重排**:`tasks/current.md`、`tasks/done.md` 與 `07_CHANGELOG.md` 都以編號互相引用,重排會打斷既有交叉引用。已歸檔項目的編號一律**留空不回收**(目前缺號:1、3b、5、6–10、13–19、21、23);新項目接在現有最大號之後。

## 中優先(已核准正式待辦)
2. **品質批**(2026-07-10 彙整,Bar 已核准方向):
   - fetchSheet 重試加 800ms 退避;toast() null guard
   - 未來測試模擬版:localStorage 前綴隔離(TEST 版不再污染正式狀態)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
4. **BUILTIN 快照更新 SOP 文件化**:何時重抓、步驟、由誰觸發(目前僅口頭慣例)。
11. **BUILTIN 種子資料過時**:內嵌離線快照 Day 3–6 仍為東京舊行程,與現行岡山行程不符,待 Bar 裁定刷新時機。此項與第 4 項「BUILTIN 快照更新 SOP 文件化」不同,兩者並存,不得合併或取代。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
22. **Hotels 名稱比對改良評估**:現以名稱掛 Places,名稱異動會懸空;評估改 PID 引用(涉及 schema,需五段提案)。
24. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。
26. **GitHub Actions Node 20 棄用**:`qa.yml` 使用的 `actions/checkout@v4` 與 `actions/setup-node@v4` 仍指向已棄用的 Node.js 20,GitHub 目前強制改跑 Node 24 並發出 annotation。**現在不影響結果**(2026-07-31 run 30595077190 為 success),但 GitHub 最終會移除相容層。屆時升到 `@v5` 系列即可。發現於批次一 R1 遠端 Gate 查核。**不阻擋 v73 發布**;但依 Bar 2026-07-31 裁定,**正式發布完成後應排在低優先區的較前面處理**,避免相容層日後移除才臨時修復。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
