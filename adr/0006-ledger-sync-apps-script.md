# ADR 0006 — Ledger Sync via Apps Script

**Decision**:分帳紀錄以 Google Apps Script 回寫 Google Sheet「分帳紀錄」分頁,採 append-only 模型。App 先寫入本機佇列,收到 `{ok:true}` 或 `{ok:true,dup:true}` 才移除；刪帳以負向沖銷紀錄表示。前端透過 `ledgerRepository.add(record)`、`flushQueue()`、`pendingCount()` 存取,不讓 UI 依賴 Apps Script 細節。共用匯率與預設輸入幣別以 TripConfig 為 SSoT；App 的 CMS 寫入白名單只允許 append「分帳紀錄」及更新 `Exchange Rate` / `Ledger Default Currency`,其餘鍵維持 Bar 手動管理且 App 唯讀。部署原始碼以 `apps-script/ledger-sync.gs` 為權威。

**Context**:旅伴需要在不同手機記帳並看到全團彙算,且所有裝置必須使用相同 JPY/TWD 匯率與預設輸入幣別。原本 `trip_expenses` 與匯率狀態只存在單一裝置,無法跨裝置同步,也沒有可確認送達與去重的寫入通道。

**Alternatives Considered**:A. 維持純本機記帳,實作最少但無法跨裝置；B. Apps Script + Google Sheet 回寫,沿用既有 CMS 與發布 CSV；C. Firebase / Supabase,即時性與查詢能力較高,但會新增 SDK、帳號、權限與維運面。

**Why This Decision**:Apps Script 不增加前端相依套件,資料仍留在既有 Sheet,可沿用 CSV 讀取與管理流程。公開 CSV 約 1–5 分鐘的發布延遲已由 Bar 接受,目前不需要導入完整後端平台。

**Expected Benefits**:跨裝置共享分帳紀錄與換算設定；單幣輸入自動產生一致的 JPY/TWD 金額；離線佇列降低遺帳風險；客戶端與伺服器端以紀錄 ID 去重；append-only 保留稽核軌跡；repository 介面隔離後端細節。

**Trade-offs**:公開 CSV 可能延遲 1–5 分鐘,寫入成功後不一定立即出現在雲端清單；設定寫入確認後以目前裝置的 bridge 暫時銜接,其他裝置仍需等待 CSV 更新。Apps Script URL 本身沒有使用者驗證,取得 URL 的人可送出資料；目前以固定兩鍵白名單、不可猜測 URL、伺服器 LockService 與 ID 去重降低操作風險,不等同存取控制。

**Future Impact**:若未來改用 Firebase、Supabase 或其他後端,維持 `add(record)`、`flushQueue()`、`pendingCount()` 與設定 helper 邊界,只替換 repository / 設定寫入實作與讀取 adapter；分帳頁、設定頁與彙算呼叫端不需重寫。

## 2026-07-18 Ledger 2.0 契約擴充

**Decision**:Ledger Schema 2.6 在既有八欄末端追加 `participants`、`payMethod`、`recordType`、`targetRecordId`、`deleteReason`、`batchId` 六個選填欄位。`participants` 固定保存 JSON Array 字串；`recordType` 契約值為 `expense`、`identity_registration`、`deletion`。Apps Script 依固定 14 欄順序 append，舊 payload 缺少新欄位時寫入空字串，既有 ID 去重、驗證與 `updateSettings` 行為不變。

**Context**:分帳 2.0 後續需要保存記帳當下的分攤成員快照、支付方式、刪除目標與原因，以及多品項帳單關聯。先擴充可向後相容的傳輸與 Sheet 契約，再由後續獨立 PR 導入雙軌資料、墓碑與結算行為，可避免 UI 與資料遷移同批交付。

**Compatibility**:六欄不是全域必填，現行八欄 payload、零金額身分註冊與歷史 CSV 仍可使用。未知欄位由既有 Schema Parser 忽略；本次只建立資料契約，不啟用墓碑刪除、分攤計算或新版分帳 UI。

## 2026-07-18 Ledger 2.0 墓碑刪除決策

**Decision**:本節取代本 ADR 原先以負向沖銷表示刪帳的決策。團體帳刪除改為 append `recordType=deletion` 的墓碑紀錄，以 `targetRecordId` 指向保留不動的原始紀錄，並保存目前操作者、刪除原因與原始 `batchId`；墓碑金額固定為零。有效紀錄解析器隱藏墓碑及其目標，同一目標有多筆墓碑時仍只刪除一次。個人帳不進共享稽核軌跡，確認後直接從 `trip_personal_ledger` 真正刪除。

**Context**:負向沖銷會把刪除語意混入金額計算，且重複操作可能重複扣減。Ledger 2.0 已具備 `recordType`、`targetRecordId` 與 `deleteReason` 契約，可將刪除意圖與金額分離，同時保留團體帳的 append-only 稽核軌跡。

**Why This Decision**:墓碑以紀錄 ID 表達刪除集合，天然支援冪等解析；原始紀錄不改寫，仍可追查誰在何時因何原因刪除。`detail='[刪除]'` 僅供人閱讀，程式判定只信任 `recordType=deletion`，避免文字相似造成誤判。

**Collaboration and Authorization**:所有已選擇成員身分的裝置都可提出團體刪除，操作者寫入墓碑的 `member`。這是協作式 UI 行為，不代表伺服器端身分驗證或存取控制；Apps Script URL 的既有安全取捨不變。

**Compatibility and Trade-offs**:既有負數沖銷紀錄不改寫，仍按歷史金額正常讀取與彙算；新版 UI 不再建立負數沖銷。格式不完整或指向不存在目標、身分註冊、另一墓碑的刪除紀錄會被忽略並警告。公開 CSV 延遲期間，本機待同步墓碑由既有 queue 立即參與有效紀錄解析；收到寫入確認後轉入本機 bridge，直到雲端快照出現同一墓碑 ID 才清除，避免原紀錄短暫復活。

## 2026-07-19 Ledger 2.1 Schema 2.7 契約擴充

**Decision**:Ledger Schema 2.7 在既有 14 欄末端追加選填的 `storeName`（店名）與 `replacesRecordId`（取代紀錄ID），Apps Script 依固定 16 欄順序 append。舊 payload 缺少兩欄時寫入空字串，既有 ID 去重、LockService、驗證及 `updateSettings` 行為不變。`time` 欄的正式語意由寫入時間改為 ISO 8601 消費發生時間；既有資料不遷移，直接依新語意讀取。

**Context**:分帳 2.1 需要可靠搜尋與還原店名，並讓團體 append-only 編輯的新筆可指向被取代紀錄。把資料藏在備註會造成搜尋、解析與跨裝置編輯歧義，因此以末端選填欄位維持位置式契約的向後相容。

**Compatibility**:部署順序固定為先部署可接受 16 欄且相容舊 payload 的 Apps Script，再發布會送出新欄位的前端。舊 Parser 會忽略未知末端欄位；回滾舊前端時新欄可保留。Apps Script 原始碼仍以 `apps-script/ledger-sync.gs` 為權威。

## 2026-07-19 Ledger 2.1 Queue-first 完成語意

**Decision**:`ledgerRepository.add(record)` 保留「嘗試送達後完成」語意，供身分註冊及需要送達結果的呼叫端使用；新增 `enqueueBatch(records)` 作為團體記帳 UI 的本機耐久完成邊界。`enqueueBatch` 先正規化及驗證整批紀錄，再以一次 localStorage 寫入加入 Queue，立即回覆 queued acknowledgment，最後由背景 `flushQueue()` 送達。UI 不得直接讀寫 Queue key 或等待背景 POST 才關閉表單。

**Failure Semantics**:整批任一紀錄無效或 localStorage 寫入失敗時不得留下半批資料，也不得關閉表單。背景 POST 失敗不撤銷已入列紀錄；既有 pending 狀態、online/open 補送、`ok:true`／`dup:true` 移出 Queue 規則不變。

## 2026-07-19 Ledger 2.1 編輯語意

**Decision**：個人帳保留可變的本機紀錄語意，編輯時以單次 localStorage 寫入原地替換所選紀錄，既有位置可對應者保留原紀錄 ID。團體帳維持 append-only：每次編輯先為所有舊筆建立 `recordType=deletion` 的墓碑，`deleteReason` 固定為「編輯修改」，再加入修改後的新支出；新支出的 `replacesRecordId` 指向原批次排序後的第一筆 ID。整組墓碑與替代筆以同一次 `enqueueBatch` 進入佇列。

**Why This Decision**：個人帳不需跨裝置稽核，原地修改可避免產生無意義的歷史噪音；團體帳會影響所有成員結算，因此保留舊值、修改動作與替代鏈，才能維持可追蹤性並符合既有 append-only 契約。

**Compatibility and Trade-offs**：讀取與彙算仍先套用既有墓碑過濾，因此 UI 只顯示修改後紀錄。團體編輯會增加 Sheet 列數，且跨裝置仍受 CSV 發布延遲影響；同一裝置則由本機佇列立即顯示修改結果。
