# ADR 0018 — 導覽、診斷與 Today 呈現模組邊界

> 狀態：Accepted（2026-08-13；依 Bar 核准的 v108–v110 設計與後續實作計畫補記）。

**Decision**：以三個獨立 ES5 runtime module 收斂新出現且可單獨測試的規則：`navigation-intent.js` 只保存明確目的地的 session-only request／consume／complete state；`diagnostic-impact.js` 只把 raw AppLog entry 投影成 display-only impact／fallback；`today-view.js` 只建立與渲染 Today Hero Shopping summary 並回傳 declarative action。`index.html` 保留 view／overlay／scroll／focus、DOM mounting、資料選取、clock、storage、repository 與同步 effect adapter。三個 module 都不得成為全域 store。

**Context**：v108 前的明確導覽、診斷影響說明與 Today Hero 採買摘要都直接散落在 `index.html`。其中導覽需要跨 Today／Trip／Shopping 保留短暫 intent，診斷必須在不改 raw log／Health Check 的前提下增加人類可讀投影，而 Today Hero Shopping 已具備空分類 fallback、Unicode 截斷、accessible name 與 action policy。這些規則適合純 module；DOM、資料來源與 repository 副作用仍高度依賴現有 App adapter。

**Alternatives Considered**：

- A. 三個窄而深的 pure／state module，加上既有 `index.html` adapter（採用）。
- B. 建立全域 UI store 或 controller：可集中更多 state，但會更換既有架構並擴大 migration／回歸範圍。
- C. 把完整 Today Hero、weather 與 next-stop renderer 一次搬出：表面減少 `index.html` 行數，但需要廣泛 helper surface，且超出後續核准 v110 計畫只替換 Hero Shopping branch 的範圍。
- D. 保留全部 inline：檔案較少，但會讓 navigation intent、diagnostic projection 與 Shopping presentation 的純規則持續和 DOM effect 混在一起。

**Why This Decision**：三個 seam 都有明確輸入／輸出、可由 production 與測試共用同一 interface，且能刪除被取代的規則實作而不搬移副作用。限制 Today module 為 Hero Shopping presentation，可保留 next-stop authority、weather acquisition 與 Hero composition 的既有 adapter 邊界，避免為了模組化而建立淺層 helper 轉接。Ledger history 候選另經 deletion test 否決，證明本批以真實複雜度而非檔案數決定拆分。

**Expected Benefits**：明確導覽不再依靠多個隱含全域旗標；診斷 UI 可增加影響說明而不污染 raw report；Today Shopping 的 `未分類`、六字可見截斷、完整 accessible name、品名隱私與 open-list action 只有一個 production authority。各 module 可在無 DOM／storage／clock／repository 的 Node 環境直接測試，並由 runtime asset authority 確保頁面與離線 shell 同步登錄。

**Trade-offs**：`index.html` 仍是主要 DOM adapter，Today 的完整 Hero、weather 與 next-stop card 不會因本決策全部外移。每新增 runtime module 都必須同步 `runtime-assets.json`、page script、SW SHELL、README 與 manifest。診斷 timeout 目前採保守的 exact raw-message classification；若未來需要 stable diagnostic code，必須另行規畫 AppLog entry contract migration，不能在 display projection 中暗改。

**Future Impact**：

- `navigation-intent.js` 不得讀 DOM、storage 或 navigation history；找不到 target 的降級與 scroll／focus effect 留在 adapter。
- `diagnostic-impact.js` 不得改寫 stored AppLog、raw copy、Health Check、retry、Queue 或同步判定。
- `today-view.js` 的 scope 是 Today Hero Shopping summary／generic fallback／declarative action；資料選取、next-stop card、weather 與 DOM effect 留在 adapter，除非新需求以 deletion test 證明更深 seam。
- 新 module 必須使用既有 ES5 UMD pattern，並由 `runtime-assets.json` 作資產清單權威。
- 不得以本 ADR 為由新增全域 store、event bus、framework，或改變 Ledger／Shopping／Schema／backup／sync 語意。
