# ADR 0001 — Schema First

**Decision**:建立 `schema.js` 為唯一資料規格(Single Source of Truth)。所有 Sheet 欄位對應、gid、發布 URL、型別值、Expenses 版面、TripConfig 鍵集中於此;Parser 完全依 Schema 動態解析,不硬編碼欄位。

**Context**:早期欄位對應(HEADER_ALIASES)寫死在 HTML,Google Sheet 欄位一改就要改程式,且散落各處難維護。Bar 希望「新增欄位不用碰 Parser」,並讓 Sheet、Parser、Validator、文件全部依賴同一份規格。

**Alternatives Considered**:①維持硬編碼(改一次欄位改多處,易漏);②schema.json 純資料檔(無法附函式如 schemaDoc,且 file:// 下多一次 fetch 風險);③TypeScript interface(需編譯,違反無 build 原則)。

**Why This Decision**:schema.js 為 JS 檔可同時承載資料規格與 `schemaDoc()` 自動產文件;單檔內嵌免額外 fetch;純資料結構任何 AI 一眼可讀。

**Expected Benefits**:新增欄位=只改 Schema(SOP 三步);文件由 schemaDoc() 自動產生,不會與程式脫節;Validator 依 Schema 檢查,防呆一致。

**Trade-offs**:Schema 若寫錯會全域影響;需紀律維持 Schema 與 Sheet 同步(由 Validator 警告緩解)。

**Future Impact**:未來所有資料層擴充皆以 Schema 為起點;其他專案沿用同一模式。此決策為 0002/0004 的基礎,不得在未經 Bar 同意下推翻。
