# BACKLOG(待辦,依優先序)

> 更新於 2026-09-09。做完或經 Bar 裁定不再需要的項目移到 done.md,正在做的移到 current.md。

> **編號刻意不連續,不得重排**:`tasks/current.md`、`tasks/done.md` 與 `07_CHANGELOG.md` 都以編號互相引用,重排會打斷既有交叉引用。已歸檔項目的編號一律**留空不回收**(目前缺號:1、2、3b、4、5、6–11、13–19、21–24、26);新項目接在現有最大號之後。

## 中優先(已核准正式待辦)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。
27. **測試檔的 shell generation 硬編碼遷移**:94 個 Node 測試檔中 **58 個**直接寫死 `shell/<current generation>/index.html` 這類路徑,只有 12 個使用 `tests/support/version.js`(其中 8 個仍同時硬編碼)。該 helper 當初(2026-07-30)正是為了消滅「記得改 8 個地方」而建,現在同一個問題在路徑層變成 58 個地方,每次升版都要手工掃過。**不阻擋任何發布**——測試指到舊 generation 會 ENOENT 大聲失敗,不是無聲錯誤,因此刻意不納入 `tools/check-doc-generation.js` 的 gate。發現於 2026-09-09 治理層審查。

28. **打卡控制觸控目標過小**:行程頁的 `.chk` 打卡方塊為 **24×24px**,整列不是熱區(往右 80px 落在 `.item-main`,不觸發)。`04_UI_GUIDELINES.md` 自訂的門檻是「所有清單觸控列 ≥44px 高」,24×24 約為建議面積的 30%,而這是走路中單手操作的元件。同頁 `.qa-btn` 為 38–41px,但準則對它有 ≥38px 的明文豁免,不在此項範圍。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2,動工前需四項確認並 forward bump。
29. **多處字級低於準則下限**:`04_UI_GUIDELINES.md` 寫「輔助 11-13px」,實測行程頁 `.dow` 星期為 **9.5px**(6 處)、`.drive-chip`／`.tag` 10.5px(13 處)、今天頁 `.h-lbl` 10.5px(6 處)、購物頁 `.fl-arw` 10px(11 處)、分帳 `ledger-status-pill`／`ledger-summary-helper` 10px。改動散布廣,需逐一評估會不會撐破既有版面。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
