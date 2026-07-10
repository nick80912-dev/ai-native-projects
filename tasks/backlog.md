# BACKLOG(待辦,依優先序)

> 更新於 2026-07-09。做完的移到 done.md,正在做的移到 current.md。

## 高優先(驗收後立即)
1. **打包部署 V2**(高風險流程,需 Bar 確認,見 14)
   - index.html 改用 `<script src>` 引入 schema.js / validator.js 獨立檔
   - sw.js VERSION → v3;SHELL_ASSETS 補 schema.js / validator.js / .ai-manifest.json
   - 離線回歸測試 → 產出 ZIP → Bar 拖進 Netlify → 線上驗證(回滾程序見 16)
2. **部署包納入 repo 版控**:建立 `deploy/` 目錄收納 index.html 正式版、sw.js、manifest.json、icons(依 14 的分級保護)。
3. **QA 腳本入版控**:Playwright 三情境腳本(斷網內建/連網同步/旅行日 mock Date)寫入 `tests/`,之後每次程式交付必附可執行測試(Bar 已核准 2026-07-09);完成後掛進 `.github/workflows/qa.yml`(Sanity CI 已於 07-09 先行上線)。

## 中優先(品質批 — 驗收小修正回報後一併執行,全 B 級)
4. **品質批**(2026-07-10 彙整,Bar 已核准方向):
   - reconcileDayProgress 重構:把自動略過的寫入從 pickNextStop 抽出,恢復純函式(消除渲染副作用)
   - **隱藏「重置今日進度」**(Bar 裁定:隱藏式,避免旅伴誤觸;入口併除錯面板,連點標題 5 下)
   - 行程頁面板展開狀態跨重繪保留(仿 shopOpenFloors 模式)
   - 個人狀態匯出/還原(部署前必做;含 iOS PWA 與 Safari storage 隔離特性文件化)
   - 隱藏除錯面板(AppLog 環形緩衝 + healthCheck + 複製全部)
   - 同步徽章相對時間(「離線版 · 昨天 21:03」)
   - partial 同步時 toast 列出失敗表名(混版本資料可感知)
   - 天氣雨%改取「現在之後」最大值;fetchSheet 重試加 800ms 退避;toast() null guard
   - 未來測試模擬版:localStorage 前綴隔離(TEST 版不再污染正式狀態)

## 原中優先
4. **驗收後 UI/內容微調**(最小修改,不動 schema)。
5. **確認 Day2「回住宿 P012 → P002」試算表修正是否已完成**(舊 06_ROADMAP 遺留項,狀態不明,需對 Sheet 查核一次)。
6. **BUILTIN 快照更新 SOP 文件化**:何時重抓、步驟、由誰觸發(目前僅口頭慣例)。

## 低優先(未來,不急)
7. **Hotels 名稱比對改良評估**:現以名稱掛 Places,名稱異動會懸空;評估改 PID 引用(涉及 schema,需五段提案)。
8. **12 月東京行接入**:新行程分頁 + TripConfig transport=transit;SHEETS 加一組 gid。
9. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)。
10. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
