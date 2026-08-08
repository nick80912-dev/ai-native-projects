# ADR 0009 — Buy-to-Ledger 垂直切片與 Runtime Seam

> 狀態：Accepted（2026-08-08 由 Bar 核准）。

**Decision**：以 Buy-to-Ledger Loop 作為 `index.html` 架構拆分的第一個垂直切片，依 P0～P4 漸進交付：先 characterization，再建立 Buy-to-Ledger 專用 dependency seam，接著抽出純資料 module 與 workflow coordinator，最後才收斂正式 `TripBuyToLedger` runtime interface。外部 interface 以 `start(intent)` 與 `commit(command)` 為主；DOM、repositories、clock、feedback 與 AppLog 由 internal adapter seam 注入。純 domain interface 同時服務 workflow、Shopping 狀態投影及 direct tests，但不建立全 App 通用 repository 或 event bus。

**Context**：目前 Buy-to-Ledger 的行為橫跨 `shoppingLedgerSources()`、`openShoppingLedgerSourcesEntry()`、Ledger draft、`saveLedgerEntry()`、`commitLedgerEntrySave()`、`writeShoppingLedgerLinks()` 與 `shoppingListStore.applyLedgerLinks()`。流程本身已有重要安全語意：allocation composite identity 只留在 ephemeral draft、Ledger durable acknowledgement 先於 link 回寫、source-to-record 必須一一對應、Shopping link 整批原子寫入、Ledger 成功但 link 失敗時不得自動重送。這些規則分散於 UI globals 與函式順序中，現有測試又有大量 substring assertions；Browser coverage只走到開啟 Ledger form，沒有完整 commit loop。直接搬檔會同時改 seam 與行為，回歸風險過高。

**Alternatives Considered**：

- A. 一次把整個 Ledger／Shopping 拆成多個檔案：行數下降最快，但改動面跨 schema、sync、render、state 與 repositories，無法可靠分辨 refactor regression。
- B. 先設計全 App dependency container／event bus：看似可擴展，但只有假想 caller，會產生大而淺的 interface，違反「兩個 adapter 才是真 seam」。
- C. 只抽純函式、不協調 workflow：可改善部分 Node tests，但持久化 → 回寫 → 返回的高風險順序仍留在 globals，最重要的 locality 沒有改善。
- D. Characterization-first 垂直切片（採用）：先凍結可觀察行為，再讓 production／test adapter 穿過同一 seam，最後以實證決定正式 interface。

**Why This Decision**：Buy-to-Ledger 同時穿越 Shopping、Ledger、local durable persistence 與 DOM，是目前最能驗證 seam 深度的切片。若 module 被刪除，source identity、commit ordering、link planning、atomic write 與降級規則會重新散回多個 caller，符合 deletion test；它不是單純 pass-through。先保留 single-file runtime，再抽 pure domain，最後抽 coordinator，可讓每一步都有獨立 characterization gate，避免「為了架構」改變帳務事實。

**Expected Benefits**：呼叫端只表達開始或提交意圖；source／record 對應、linked／unverified 推導、持久化後回寫及失敗降級集中在一處。production adapter 與 recording test adapter 共用 seam，測試能從 substring contract 轉成 observable outcome。`buy-to-ledger.js` 可由 Node 直接 require，也可由 Browser UMD 載入，不新增 build step。

**Trade-offs**：過渡期會同時存在既有 globals 與新 adapter，短期行數可能先增加。P1 characterization 會保留既有行為，即使發現 UX 不理想也不在本批順便修。新增 runtime asset 需要 SW SHELL 與版本同步更新。Internal adapter 的方法數不小，但它隱藏於 module implementation，不成為一般 caller 的 interface。

**Future Impact**：

- P1～P4 不得改 Ledger 21 欄、Shopping backup、Apps Script、`PERSONAL_STATE_VERSION` 或同步完成語意。
- 新 module 必須維持 ES5-compatible UMD／CommonJS，production 與 test adapter 需同時存在。
- P4 只可提升已被兩個 caller 或 production + test adapter 實證的能力；不得藉機建立全 App God interface。
- 其他垂直切片可沿用「characterization → internal seam → pure domain → coordinator」方法，但不得未經自己的 dependency audit 直接複製 Buy-to-Ledger adapter。
- P1～P4 作為 v93 runtime batch；既定 SW 更新提示雙版本驗收順延為 v94／v95。
