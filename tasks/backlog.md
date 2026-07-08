# BACKLOG(待辦,依優先序)

> 更新於 2026-07-08。做完的移到 done.md,正在做的移到 current.md。

## 高優先(驗收後立即)
1. **打包部署 V2**
   - index.html 改用 `<script src>` 引入 schema.js / validator.js 獨立檔
   - sw.js VERSION → v3;SHELL_ASSETS 補 schema.js / validator.js / .ai-manifest.json
   - Playwright 斷網回歸測試 → 產出 ZIP → Bar 拖進 Netlify → 線上驗證

## 中優先
2. **手機驗收後 UI 微調**(首頁目前暫時 OK;後續僅針對手機實測問題做最小修正)
3. **Day4-6 內容**(Bar 更新試算表後自動生效,程式無需改)
4. **購物模式回饋調整**(GitHub 最新版已含多購物地點切換;待 Bar 手機試用後討論)

## 低優先(未來,不急)
5. **12 月東京行接入**:新行程分頁 + TripConfig transport=transit;SHEETS 加一組 gid
6. **新版提示立即刷新**:SW updatefound → 畫面提示(取代「開兩次生效」)
7. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
