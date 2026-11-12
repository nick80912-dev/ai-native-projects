# ADR 0005 — Dev/Main Branch Strategy

> 狀態:Accepted(2026-07;2026-11 增補實際發版方式,見文末)

**Decision**:採用 `dev → main` 雙分支策略。`dev` 為所有日常功能、文件與 UX 修正的預設工作分支;`main` 永遠代表經 Bar 核准的正式 Production 版本,僅接受 Bar 核准之 Merge / Push,並作為 Netlify Production Branch。

**Context**:過去日常工作直接進入 `main`,使 Push 與 Netlify Deploy 高度綁定,增加 Build Credit 消耗與未完成批次進入正式環境的風險。多個 AI 在不同時間接手時,也缺少一致的開發、驗收與發版邊界。

**Alternatives Considered**:①維持單一 `main` 分支(日常簡單,但 Push 幾乎等於 Deploy,缺乏驗收閘門);②每項工作建立短期 feature branch(隔離最完整,但本專案規模下分支管理成本較高);③固定 `dev` 日常整合分支加 `main` 正式分支(流程穩定且治理成本可控)。

**Why This Decision**:`dev` 可承接反覆 Commit / Push 與 Bar 驗收,只有里程碑式 Release 才透過 Pull Request 進入 `main`;因此 Push 不再等於 Deploy,同時讓所有 AI 使用一致的預設工作分支與發版流程。

**Expected Benefits**:控制 Netlify Build Credit;`main` 永遠對應正式版本;Release 採里程碑式管理;Bar 擁有最終 Merge 決策;AI 協作、交接與版本判斷更一致。

**Trade-offs**:日常開發多一個長期分支與 Pull Request 步驟;`dev` 與 `main` 需持續維持可追蹤的差異;緊急修正若需直接進入 `main`,仍必須取得 Bar 明確核准。

**Future Impact**:治理生效後,所有 AI 預設以 `origin/dev` 作為日常同步與交付基準;正式 Release 固定遵循 `dev → Pull Request → Bar Review → Bar Merge → main → Netlify Deploy`,未經 Bar 核准不得 Push 或 Merge 至 `main`。正式站 `https://trippilot-jp.netlify.app/` 追蹤 `main`;測試站 `https://dev-trippilot-jp.netlify.app/` 追蹤 `dev`。

### 2026-11 增補:實際發版方式(Bar 2026-10-30 起「每批一版、逐版送 main」)
- AI 在工作分支開 PR 進 `dev`,CI(`sanity`、`browser-qa`)綠燈後合併;再開 Release PR(`dev` → `main`),七項檢查綠燈後合併,Netlify 自動部署。
- **核准仍屬 Bar**:改畫面先給截圖,Bar 回「好」或明確說「merge／發版」才進入上述流程;AI 代為按下合併是執行 Bar 的核准,不是自行決定發版。
- 合併後 AI 做線上核對(`16_OPS_PLAYBOOK.md` §F5),以 production-tags workflow 建 `production-vNNN`,再以一個只改文件的 PR 記錄發版結果。

