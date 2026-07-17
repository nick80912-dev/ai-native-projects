# ADR 0006 — Ledger Sync via Apps Script

**Decision**:分帳紀錄以 Google Apps Script 回寫 Google Sheet「分帳紀錄」分頁,採 append-only 模型。App 先寫入本機佇列,收到 `{ok:true}` 或 `{ok:true,dup:true}` 才移除；刪帳以負向沖銷紀錄表示。前端透過 `ledgerRepository.add(record)`、`flushQueue()`、`pendingCount()` 存取,不讓 UI 依賴 Apps Script 細節。共用匯率與預設輸入幣別以 TripConfig 為 SSoT；App 的 CMS 寫入白名單只允許 append「分帳紀錄」及更新 `Exchange Rate` / `Ledger Default Currency`,其餘鍵維持 Bar 手動管理且 App 唯讀。部署原始碼以 `apps-script/ledger-sync.gs` 為權威。

**Context**:旅伴需要在不同手機記帳並看到全團彙算,且所有裝置必須使用相同 JPY/TWD 匯率與預設輸入幣別。原本 `trip_expenses` 與匯率狀態只存在單一裝置,無法跨裝置同步,也沒有可確認送達與去重的寫入通道。

**Alternatives Considered**:A. 維持純本機記帳,實作最少但無法跨裝置；B. Apps Script + Google Sheet 回寫,沿用既有 CMS 與發布 CSV；C. Firebase / Supabase,即時性與查詢能力較高,但會新增 SDK、帳號、權限與維運面。

**Why This Decision**:Apps Script 不增加前端相依套件,資料仍留在既有 Sheet,可沿用 CSV 讀取與管理流程。公開 CSV 約 1–5 分鐘的發布延遲已由 Bar 接受,目前不需要導入完整後端平台。

**Expected Benefits**:跨裝置共享分帳紀錄與換算設定；單幣輸入自動產生一致的 JPY/TWD 金額；離線佇列降低遺帳風險；客戶端與伺服器端以紀錄 ID 去重；append-only 保留稽核軌跡；repository 介面隔離後端細節。

**Trade-offs**:公開 CSV 可能延遲 1–5 分鐘,寫入成功後不一定立即出現在雲端清單；設定寫入確認後以目前裝置的 bridge 暫時銜接,其他裝置仍需等待 CSV 更新。Apps Script URL 本身沒有使用者驗證,取得 URL 的人可送出資料；目前以固定兩鍵白名單、不可猜測 URL、伺服器 LockService 與 ID 去重降低操作風險,不等同存取控制。

**Future Impact**:若未來改用 Firebase、Supabase 或其他後端,維持 `add(record)`、`flushQueue()`、`pendingCount()` 與設定 helper 邊界,只替換 repository / 設定寫入實作與讀取 adapter；分帳頁、設定頁與彙算呼叫端不需重寫。
