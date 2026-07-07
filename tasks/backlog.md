# BACKLOG(待辦,依優先序)

> 更新於 2026-07-07。做完的移到 done.md,正在做的移到 current.md。

## 高優先(驗收後立即)
1. **打包部署 V2**
   - index.html 改用 `<script src>` 引入 schema.js / validator.js 獨立檔
   - sw.js VERSION → v3;SHELL_ASSETS 補 schema.js / validator.js / .ai-manifest.json
   - Playwright 斷網回歸測試 → 產出 ZIP → Bar 拖進 Netlify → 線上驗證

## 中優先
2. **手機驗收後 UI 微調**(僅針對首頁下一站、天氣摘要或主要分頁的實測問題做最小修正)
3. **Restaurants 補欄位**(R001/R006 評分與營業時間,Bar 更新試算表)
4. **Day3-6 內容**(Bar 更新試算表後自動生效,程式無需改)
5. **購物模式回饋調整**(初版雛型,待 Bar 試用後討論)

## 低優先(未來,不急)
6. **12 月東京行接入**:新行程分頁 + TripConfig transport=transit;SHEETS 加一組 gid
7. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)
8. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
