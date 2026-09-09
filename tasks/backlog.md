# BACKLOG(待辦,依優先序)

> 更新於 2026-09-09。做完或經 Bar 裁定不再需要的項目移到 done.md,正在做的移到 current.md。

> **編號刻意不連續,不得重排**:`tasks/current.md`、`tasks/done.md` 與 `07_CHANGELOG.md` 都以編號互相引用,重排會打斷既有交叉引用。已歸檔項目的編號一律**留空不回收**(目前缺號:1、2、3b、4、5、6–11、13–19、21–24);新項目接在現有最大號之後。

## 中優先(已核准正式待辦)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。
26. **GitHub Actions Node 20 棄用**:`qa.yml` 使用的 `actions/checkout@v4` 與 `actions/setup-node@v4` 仍指向已棄用的 Node.js 20,GitHub 目前強制改跑 Node 24 並發出 annotation。**現在不影響結果**(2026-07-31 run 30595077190 為 success),但 GitHub 最終會移除相容層。屆時升到 `@v5` 系列即可。發現於批次一 R1 遠端 Gate 查核。**不阻擋 v73 發布**;但依 Bar 2026-07-31 裁定,**正式發布完成後應排在低優先區的較前面處理**,避免相容層日後移除才臨時修復。
27. **測試檔的 shell generation 硬編碼遷移**:94 個 Node 測試檔中 **58 個**直接寫死 `shell/<current generation>/index.html` 這類路徑,只有 12 個使用 `tests/support/version.js`(其中 8 個仍同時硬編碼)。該 helper 當初(2026-07-30)正是為了消滅「記得改 8 個地方」而建,現在同一個問題在路徑層變成 58 個地方,每次升版都要手工掃過。**不阻擋任何發布**——測試指到舊 generation 會 ENOENT 大聲失敗,不是無聲錯誤,因此刻意不納入 `tools/check-doc-generation.js` 的 gate。發現於 2026-09-09 治理層審查。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
