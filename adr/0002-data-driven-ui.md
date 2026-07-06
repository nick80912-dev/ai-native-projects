# ADR 0002 — Data-Driven UI

**Decision**:卡片型別由 CMS 資料明確決定(Places 的 Type 欄),**禁止程式用文字猜測型別**。Type→卡片對應表寫在 schema.js 的 type.values。文字推測僅作為「不在資料庫的雜項列」(如空的「午餐時間」列)最後備援。

**Context**:早期版本用關鍵字猜測地點型別(名稱含「神社」→景點),誤判率高且行為不可預測。Bar 要求型別必須明確、可控。

**Alternatives Considered**:①純關鍵字推測(不可靠,難除錯);②AI 執行期判斷(有幻覺風險、無法離線、不可重現);③明確 Type 欄+Schema 對應(可控、可離線、可預測)。

**Why This Decision**:資料驅動使同一份資料在任何裝置/時間產生一致結果;新增型別只需在 Schema values 加一筆並註冊卡片;完全離線可運作。

**Expected Benefits**:零誤判;行為可重現;新型別擴充成本低;healthCheck 可偵測「未註冊型別」。

**Trade-offs**:Bar 需在 Sheet 正確填 Type(必填欄,Validator 會警告缺漏);新型別需同步在 renderer 註冊卡片(見 0004)。

**Future Impact**:所有新卡片類型都走此模式;禁止回退到關鍵字猜測。與 0001 相依。
