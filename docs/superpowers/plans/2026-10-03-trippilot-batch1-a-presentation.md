# TripPilot A：狀態、摘要與保守字體 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 用可信狀態與精簡摘要改善閱讀，不改紀錄及帳務計算。

**Architecture:** 顯示 helper 留在新 generation UI adapter，消費既有 domain resolver、queue／delivery bridge／cloud evidence。沒有新持久化狀態、沒有共用 domain 重構。

**Tech Stack:** 現有 JavaScript／HTML／CSS、Node assert／vm、Playwright。

**Spec:** [第一批設計 §4／5](../specs/2026-10-03-trippilot-reliability-and-clarity-batch1-design.md)。同時閱讀[共用規則與核准摘要](2026-10-03-trippilot-batch1-index.md)。

## Global Constraints

- 「只處理確實難讀的輔助文字，不全站放大；保持目前操作密度與視覺。」候選試 11px，12px 個別提出；主要金額／標題／主操作／輸入框不全面增大。
- 320、375、390px；六組配色沿用角色，文字與圖示共同表示狀態。
- 不增加持久化狀態、不改帳務數量、金額、幣別、匯率、分攤；備份 v9／封存 v1 不變。
- 「不能宣稱其他旅伴裝置已讀到」；來源不充分維持待確認。
- G 為共用規則定義的未使用 generation；不改凍結 v141 或 root v110。

## Review Focus

1. 送出橋接與 queue 同時有同一 ID：仍應待送出，不能整筆冒充已讀回（Task 2）。
2. 刪除或未知帳務、沒有 allocation 的舊商品：不可用連結數推導已記帳件數（Task 1）。
3. 長中文／很大金額在 320px：不能擠掉操作、把輸入框改成 11px（Task 3）。
4. 不支援容量估算：不是照片損毀，也不出現修復按鈕（Task 2）。
5. 鍵盤操作後局部重繪：焦點與 checkbox 語意應保留（Task 3）。

## File Structure

- 新建 `shell/<G>/index.html`、`app-version.js`、沿用的 `builtin-snapshot.js`；generation 登記依共用規則。
- 顯示 adapter：`renderItem`／`renderToday`、`renderShoppingItem`／`renderShoppingItemDetail`、`shoppingCardLinkBadge`、`renderSplit`／`renderLedgerSyncPanelBody`、照片健康 renderer。
- 新建 `tests/status-clarity.test.js`、`tests/ledger-delivery-presentation.test.js`、`tests/browser/status-clarity.spec.js`。
- 修改 `tests/ui-font.test.js`、`tests/browser/ui-ux-hardening.spec.js`，新增 `docs/ui-font-audit-2026-10-03.md`。
- 不改 `buy-to-ledger.js`、repository、shopping schema、主題 token 值。

### Task 1: 行程與採買狀態、摘要

**Interfaces:** 消費 `buyToLedgerDomain.inspectItem(item, shoppingLedgerContext())` 的 `state/linked/total/unverified/allocationStates` 和既有 `shoppingItemQuantitySummary(item)`。新增 `shoppingStatusPresentation(item, inspection)` → `{purchaseLabel, ledgerLabel, detailText}`（字串，未知不計數）。只投影，不改 item。

測試核心斷言（item fixture 沿用 shopping-ledger-links 的有效 allocations）：

```js
assert.strictEqual(shoppingStatusPresentation(item, {state:'unverified', allocationStates:[]}).ledgerLabel, '待確認');
assert.strictEqual(shoppingStatusPresentation(item, {state:'partial', allocationStates:[]}).ledgerLabel, '部分已記帳');
assert.deepStrictEqual(item, originalItem);
```

- [x] **Step 1 — RED test:** 在 `tests/status-clarity.test.js` 以 source helper／vm 執行 adapter；斷言已完成／已略過／自動略過不同；`inspection.state==='unverified'` 的 `ledgerLabel==='待確認'`；partial 顯示「部分已記帳」；unlinked 顯示「未記帳」。legacy 無 allocation 不輸出「0 件已記帳」；執行前後 item 深度相等。
- [x] **Step 2 — Verify RED:** `node tests/status-clarity.test.js`，預期新 helper 尚不存在或文案斷言失敗，不是 fixture／語法錯。
- [x] **Step 3 — Minimal implementation:** 建立 G 並登記；加入上述 helper，卡片及詳細頁共用。行程展示用「已完成／已略過」，自動原因保留。商品保留既有 quantity summary；僅所有相關 allocation 數量有效且語意可證明時補已記帳數量，否則使用部分／待確認文字。店家區塊／空白狀態明示「想逛店家」，商品明示「待買商品」，不改購買／收藏 effect。
- [x] **Step 4 — Browser test:** 在 `tests/browser/status-clarity.spec.js` 以 qa-fixture 建立零／部分／全部購買、多 allocations、已刪除／待確認帳務；比對卡片與詳細頁一致、沒有新的 storage key、金額與數量不變。採用原生按鈕操作，DOM 文案斷言，不只比 source。
- [x] **Step 5 — Verify GREEN:** `node tests/status-clarity.test.js`、`node tests/shopping-ledger-links.test.js`、`node tests/trip-presentation.test.js`、`npx playwright test tests/browser/status-clarity.spec.js tests/browser/buy-to-ledger.spec.js`，全部通過。
- [x] **Step 6 — Commit:** 明列新 generation、generation 登記、上述測試及實際修改文件；訊息 `feat: clarify trip and shopping status summaries`。

### Task 2: 同步證據與照片健康

**Interfaces:** 新增 `ledgerDeliveryPresentation(recordId, evidence)` → `{state,label}`；`evidence={track,queue,bridge,cloud}`，後三者是紀錄陣列。personal → local「已存本機」；queue ID 存在 → pending「待送出」；bridge 存在 → accepted「伺服器已接收，等待讀回」；其餘 cloud ID 存在 → readback「已從伺服器讀回」；其餘 unknown「待確認」。已有 queue 優先於 cloud，bridge 優先於舊 cloud，避免更新同 ID 時高估。

```js
assert.deepStrictEqual(plain(ledgerDeliveryPresentation('r1', {track:'shared',queue:[{id:'r1'}],bridge:[{id:'r1'}],cloud:[{id:'r1'}]})), {state:'pending',label:'待送出'});
assert.deepStrictEqual(plain(ledgerDeliveryPresentation('r1', {track:'shared',queue:[],bridge:[],cloud:[{id:'r1'}]})), {state:'readback',label:'已從伺服器讀回'});
```

- [x] **Step 1 — RED test:** 新建 `tests/ledger-delivery-presentation.test.js`，以相同 ID 覆蓋 queue／bridge／cloud 組合、personal 與空 evidence；精確斷言上述 state／label。cloud 沒有該 ID 時，一般 sync success 不得產生 readback。
- [x] **Step 2 — Verify RED:** `node tests/ledger-delivery-presentation.test.js`，helper 缺失或誤判須失敗。
- [x] **Step 3 — Minimal implementation:** 從現有 `ledgerRepository.queuedRecords()`、`ledgerDeliveryBridgeRecords()`、`DB.ledger` 取資料，限 shared／目前正式或 TEST 模式。更新帳務狀態摘要／同步面板；列表不疊所有階段徽章。無法判定單筆時顯示待確認，不更改 flush／bridge reconciliation。照片正常行為若已符合只補測試，不改 renderer。
- [x] **Step 4 — Browser test:** 擴充 `status-clarity.spec.js`：pending、bridge、cloud readback、部分下載失敗仍保留 pending evidence；照片正常無告警，無容量估算不是錯誤，invalid 仍有修復入口。斷言沒有「其他裝置已讀到」；不呼叫真遠端 write。
- [x] **Step 5 — Verify GREEN:** `node tests/ledger-delivery-presentation.test.js`、`node tests/ledger-sync.test.js`、`npx playwright test tests/browser/status-clarity.spec.js tests/browser/settings-health-page.spec.js tests/browser/shopping-photo.spec.js`；全部通過。
- [x] **Step 6 — Commit:** UI 與上述測試，訊息 `feat: clarify ledger delivery evidence`。

### Task 3: 字體盤點與限定候選的畫面驗證

**Interfaces:** 不新增 runtime API。CSS 候選：`.today-hero-summary-label`、`.today-hero-summary-value small`、`.day-chip .dow`、`.ledger-recent-context .shopping-target-affix`、`.ledger-recent-context .shopping-target-badge`、`.ledger-recent-statuses .ledger-recent-badge`、`.ledger-recent-context .ledger-recent-badge`。其餘設計字體表列入盤點，沒有畫面證據不直接調整。

- [x] **Step 1 — Inventory:** `docs/ui-font-audit-2026-10-03.md` 記下設計九組候選的 CSS／computed size、320／375／390px 截圖、cascade、是否難讀及決定。主要金額、主按鈕、input／select／textarea 記為保留；不要修改照片健康或回顧頁來製造工作。
- [x] **Step 2 — RED tests:** `ui-font.test.js` 保留 local font stack／input 16px 契約。`ui-ux-hardening.spec.js` 加候選 computed 11px（僅盤點確認要改者）、document 無橫向溢出、主操作可見、input size 與基準相同；320／375／390px、長中文、大金額。候選測試須在舊字級失敗。
- [x] **Step 3 — Minimal implementation:** 僅修改盤點確認需要的具名 selector 為 11px，不改 body、root font-size、主題、間距或 controls 大小。若壓縮操作／破壞摘要則撤回該候選並記原因；12px 另提案，不自動採用。
- [x] **Step 4 — A11y:** Browser 加 Enter／Space 勾選、展開後 aria-expanded、焦點不回 body、錯誤訊息可及名稱；較大文字以實測 CSS 文字放大情境加人工系統設定驗證，不只調 deviceScaleFactor。閱讀器真機走查仍列待驗。
- [x] **Step 5 — Verify GREEN:** `node tests/ui-font.test.js`、`node tests/trip-checkin-a11y.test.js`、`npx playwright test tests/browser/ui-ux-hardening.spec.js tests/browser/shop-row-a11y.spec.js tests/browser/status-clarity.spec.js`；全部通過，六主題人工截圖對照。
- [x] **Step 6 — Commit:** UI、字體盤點與上述測試，訊息 `style: tune small supporting text conservatively`。

### Task 4: A 交付 gate

**Interfaces:** 交付上述 helper 與測試結果；B／C 不依賴其 API。

- [ ] 更新現況／changelog／真機驗收記錄，列出實際調整 selector，不宣稱所有候選都已增大。
- [ ] 執行索引全部 QA 命令；審查 scope、主題、長文字、未改 shared 計算與資料契約。
- [ ] 依核准的執行方法安排獨立整批審查，修正後重跑受影響測試；審查未通過不交付。
- [ ] 只在取得 push 指示後推 dev，核對 exact-head CI 與測試站 G；請使用者驗收後再開始 B。main 發布不是此步的預設動作。
