# ADR 0005 — Dev/Main Branch Strategy

**Decision**:採用 `dev → main` 雙分支策略。`dev` 為所有日常功能、文件與 UX 修正的預設工作分支;`main` 永遠代表經 Bar 核准的正式 Production 版本,僅接受 Bar 核准之 Merge / Push,並作為 Netlify Production Branch。

**Context**:過去日常工作直接進入 `main`,使 Push 與 Netlify Deploy 高度綁定,增加 Build Credit 消耗與未完成批次進入正式環境的風險。多個 AI 在不同時間接手時,也缺少一致的開發、驗收與發版邊界。

**Alternatives Considered**:①維持單一 `main` 分支(日常簡單,但 Push 幾乎等於 Deploy,缺乏驗收閘門);②每項工作建立短期 feature branch(隔離最完整,但本專案規模下分支管理成本較高);③固定 `dev` 日常整合分支加 `main` 正式分支(流程穩定且治理成本可控)。

**Why This Decision**:`dev` 可承接反覆 Commit / Push 與 Bar 驗收,只有里程碑式 Release 才透過 Pull Request 進入 `main`;因此 Push 不再等於 Deploy,同時讓所有 AI 使用一致的預設工作分支與發版流程。

**Expected Benefits**:控制 Netlify Build Credit;`main` 永遠對應正式版本;Release 採里程碑式管理;Bar 擁有最終 Merge 決策;AI 協作、交接與版本判斷更一致。

**Trade-offs**:日常開發多一個長期分支與 Pull Request 步驟;`dev` 與 `main` 需持續維持可追蹤的差異;緊急修正若需直接進入 `main`,仍必須取得 Bar 明確核准。

**Future Impact**:治理生效後,所有 AI 預設以 `origin/dev` 作為日常同步與交付基準;正式 Release 固定遵循 `dev → Pull Request → Bar Review → Bar Merge → main → Netlify Deploy`,未經 Bar 核准不得 Push 或 Merge 至 `main`。
