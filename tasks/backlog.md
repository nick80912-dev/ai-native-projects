# BACKLOG(待辦,依優先序)

> 更新於 2026-09-12。做完或經 Bar 裁定不再需要的項目移到 done.md,正在做的移到 current.md。

> **編號刻意不連續,不得重排**:`tasks/current.md`、`tasks/done.md` 與 `07_CHANGELOG.md` 都以編號互相引用,重排會打斷既有交叉引用。已歸檔項目的編號一律**留空不回收**(目前缺號:1、2、3b、4、5、6–11、13–19、21–24、26、27);新項目接在現有最大號之後。

## 中優先(已核准正式待辦)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。
28. **打卡控制觸控目標過小**:行程頁的 `.chk` 打卡方塊為 **24×24px**,整列不是熱區(往右 80px 落在 `.item-main`,不觸發)。`04_UI_GUIDELINES.md` 自訂的門檻是「所有清單觸控列 ≥44px 高」,24×24 約為建議面積的 30%,而這是走路中單手操作的元件。同頁 `.qa-btn` 為 38–41px,但準則對它有 ≥38px 的明文豁免,不在此項範圍。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2,動工前需四項確認並 forward bump。
29. **多處字級低於準則下限**:`04_UI_GUIDELINES.md` 寫「輔助 11-13px」,實測行程頁 `.dow` 星期為 **9.5px**(6 處)、`.drive-chip`／`.tag` 10.5px(13 處)、今天頁 `.h-lbl` 10.5px(6 處)、購物頁 `.fl-arw` 10px(11 處)、分帳 `ledger-status-pill`／`ledger-summary-helper` 10px。改動散布廣,需逐一評估會不會撐破既有版面。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2。

30. **`manualSync` / `manualSyncNew` 死碼移除(搭便車項目,不得單獨 bump)**:目前 generation 的 `index.html` 有兩行無人呼叫的函式 —— `manualSyncNew()`(`toast('正在抓取最新行程…'); return syncAll(true);`)與其別名 `manualSync()`。全檔只有這兩行定義,**零呼叫點**。
    - **不是能力缺口**:手動重拉行程資料的路徑存在且正常 —— 頁首同步 chip(`#syncBtn` → `openSyncStatus()`)的面板裡有 `.sync-status-retry` 按鈕接 `retrySyncFromPanel()` → `syncAll(true)`。這兩行是舊入口的遺骸。
    - **為何不單獨處理**:依 **ADR 0019**,已發布 generation 的 shell 資源不得就地改,即使是零行為影響的死碼。刪這兩行等於完整 forward bump(新世代目錄、`sw.js`、`netlify.toml`、`runtime-assets.json`、活文件 generation 引用、新驗收清單、再發一次正式站)。**2026-09-12 Bar 裁定:記進 backlog,搭下次因其他原因升版時一併刪除。**
    - **執行方式**:下次 bump 建立新 generation 後,在新的 `index.html` 刪掉那兩行,確認全檔無 `manualSync` 字樣。
    - **測試要一併處理**:`tests/atomic-sheet-sync.test.js:292` 有一條**負向斷言** `assert(!/id="syncBtn" onclick="manualSyncNew\(\)"/…,'header no longer syncs directly')`。刪掉函式後它仍會通過,但**變成空轉** —— 守的是一個已不存在的東西。同檔第 291 行的 `assert(/id="syncBtn" onclick="openSyncStatus\(\)"/…)` 已經正面守住同一個意圖,因此第 292 行應一併移除,而不是留著假裝有保護。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
