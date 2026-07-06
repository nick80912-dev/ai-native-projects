# ADR 0004 — Renderer 架構

**Decision**:渲染採「型別 → 卡片 → 面板」三層。resolveRef 解析行程 ID 欄(Pxxx/Rxxx)取得資料 → typeTag 依 Places.Type 決定卡片類別 → renderItem 組出卡片與快速動作列 → 各面板函式(parkingPanel/infoPanel/restRows...)產出摺疊內容。共用元件函式(kvRow/tipBox/linkRow/storeRow)不重複邏輯。

**Context**:單一 HTML 內嵌 vanilla JS,需在無框架下維持渲染邏輯清晰、可擴充、AI 易懂。

**Alternatives Considered**:①巨型 if-else 渲染(難維護、易重複);②引入前端框架 React/Vue(需 build、違反無打包原則、WebView 相容風險);③自訂輕量元件函式模式(無相依、單檔可跑、職責分明)。

**Why This Decision**:元件函式模式在 vanilla JS 下達成單一職責與復用;每種卡片對應一個面板函式,新增型別=加一個面板+在 typeTag/infoPanel 註冊;離線可跑、零相依。

**Expected Benefits**:新增卡片型別成本低且不影響既有;修 bug 修一處;healthCheck 可偵測「未註冊型別」;AI 依 04_UI_GUIDELINES 的 class 體系即可擴充。

**Trade-offs**:字串拼接 HTML 需注意 escapeHtml(已統一);無虛擬 DOM,大量資料時全量重繪(目前資料量小無虞)。

**Future Impact**:所有新畫面/卡片沿用此模式;若未來資料量大增才考慮虛擬化(需經 Bar 同意,提五段提案)。與 0001/0002 相依。
