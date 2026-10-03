# TripPilot 第一批實作計畫索引

日期：2026-10-03。使用者已確認[設計](../specs/2026-10-03-trippilot-reliability-and-clarity-batch1-design.md)，本輪只撰寫計畫。**尚未執行 runtime 修改，尚未授權推送或正式發布。**

## 執行順序

1. [A：狀態、摘要與保守字體](2026-10-03-trippilot-batch1-a-presentation.md)
2. [B：本機進度寫入可靠性](2026-10-03-trippilot-batch1-b-persistence.md)
3. [C：天氣資訊與資料有效性](2026-10-03-trippilot-batch1-c-weather.md)

三份計畫各能獨立交付。A 驗收後才開始 B，B 驗收後才開始 C；不要求 B／C 匯入 A 的 helper。不做分類管理、檔案備份、過往旅程列表或新旅程串接。

## 共用執行規則（每份計畫都須閱讀）

- 執行前讀最新 manifest、憲章、handover、15／14、ADR 0019／0020 與設計；使用 executing-plans 或使用者選擇的 subagent-driven-development，再依任務使用 TDD、驗證與審查技能。
- `git fetch origin --prune`；盤點工作分支與 origin/dev 差異及工作樹。既有文件提交不自動丟棄、重設或覆蓋；有新遠端改動或資料契約差異先回報。優先重用目前隔離 worktree。
- 每份計畫以執行當下的 current generation 為來源，稱為 `P`。`G` 為大於 P 的下一個未使用 generation；由 `sw.js` 與 `shell/` 實查，不在本計畫預先保留號碼。`shell/<G>/index.html` 指實查後展開的唯一具體檔案路徑，執行紀錄須寫出 G。
- 已發布 generation 不可修改。新 generation 的 `index.html`、`app-version.js` 由 P 建立並用 apply_patch 編輯；`builtin-snapshot.js` 的內容只沿用 P 已核准資產，不刷新 CSV、不手改 generated 內容。沿用 repo 資產建立流程；如必須重產則停下另求核准。
- generation 設定納入各計畫第一個 runtime 任務，不另做沒有功能的升版交付。`sw.js` 的 SW_VERSION、SHELL、root 導覽映射及 `versionedShellKind()` 所有 guard 一起對齊 G；更新 `netlify.toml` current generation 路徑及 manifest／README／活文件引用。**不改 root v110 bridge，不簡化混世代防線。**
- 每任務測試使用 `tests/support/version.js`／`tests/support/source.js` 讀 current generation；禁止把 source snapshot 當作行為測試的替代。
- 順序為測試 → 確認預期失敗 → 最小實作 → 針對性測試 → commit；以明列檔案 `git add -- ...`，不納入無關檔案。失敗若只是環境未啟動或 fixture 有誤，不算有效 RED。
- 每份計畫最後更新 `tasks/current.md`、`07_CHANGELOG.md`、`docs/device-acceptance-log.md`，如實區分桌面 QA、真機待驗及使用者批准。四項 gate、完整 Node／browser QA 與審查是交付條件，不是本輪已通過的功能證據。

## 共用驗收命令與輸出

於 repo 根目錄 PowerShell 執行；逐項核對退出碼，不沿用舊次數：

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
node tools/check-doc-generation.js
node tools/check-runtime-assets.js
Get-ChildItem -LiteralPath tests -Filter '*.test.js' | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Node test failed: $($_.Name)" } }
npm run test:browser
git diff --check
```

預期：每項退出碼 0、全部 Node 通過、Playwright failed 0。若 runtime inventory 有新增需求，先修正資產登記，不移除驗證。完整 browser 包含離線／連線／旅行日、pageerror、healthCheck、SW 更新快取與混世代拒絕；另確認受影響頁面沒有空白。

真機 iPhone／Android PWA 的字體、閱讀器、鍵盤、操作及恢復情境另附實際驗收，不以 Chromium 模擬視為已完成。依 repo 發布規則處理未驗項目。

## Tier 2／C 級核准摘要

| 批次 | 原因／影響 | 主要風險 | 復原 |
| --- | --- | --- | --- |
| A | 改狀態文案與摘要，少量候選文字試 11px | 狀態誤判、換行、焦點丟失 | 新 generation 回復已驗證顯示 |
| B | 確認打卡／進度寫入結果及提示 | 局部寫入／恢復失敗 | 新 generation 回復行為，保留資料並提供診斷，不清空 |
| C | 顯示城市、時間、過期／無資料 | 年齡判斷、請求競態、未知降雨 | 新 generation 回復已驗證天氣行為 |

共同復原採 forward-bump，不覆寫凍結外殼、不刪 SW、不改備份 v9／封存 v1。計畫審閱後須取得 runtime 執行核准；推 dev 與發 main 另外按使用者指示及 repo release flow 進行。

## 前置唯讀核對（不阻擋計畫撰寫，不冒充已完成）

- 出發前內容：以公開行程與官方資料核對目的地、住宿、停車、營業時間與連結，輸出 `docs/travel-predeparture-audit-2026-10-03.md`，每筆含站點 ID、旅行日期、查核日期、官方來源與已核實／有疑問／無法核實。不得修改 Sheets；無官方資料要標明。
- OAuth：僅在能讀實際 Cloud 設定時核對測試使用者、發布狀態、authorized origins 與 scope，輸出 `docs/oauth-companion-readiness-2026-10-03.md`；不可把既有 External Testing 文件當作即時證據。不修改 Cloud、不代替旅伴授權；不可接觸時明記未驗、請使用者提供設定證據。

## 自審與交接

設計 §4／5 → A；§6 → B；§7 → C；§8 唯讀項 → 上述核對；§9／10 → 各計畫與共用規則。後續批次均排除，沒有把設計批准當作發布批准。

請使用者審閱並選擇：**Native**（本代理逐步實作，整批獨立審查）或 **Subagent-driven**（每任務獨立實作／審查）。建議 Native：三份計畫已拆清楚，可序列執行，減少上下文與重複升版成本。未收到執行核准前只保留計畫。
