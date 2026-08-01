# Spec — 團體結算交握可靠性與個人可見範圍

> 產出方式:`/to-spec`(綜合既有對話與程式碼,無額外訪談)。基準 commit `5b99443`(dev)。
> 建議 triage 標籤:`ready-for-agent`。發佈目標為 GitHub issue(`nick80912-dev/ai-native-projects`);因本機無 `gh`,先落地為本檔,待 `gh` 就緒再推成 issue。
> 隔離工作區:worktree 分支 `feat/settlement-reliability-visibility`(自 `origin/dev` = `5b99443`)。
> 延伸自 [ADR 0006](../../../adr/0006-ledger-sync-apps-script.md) 與 [ADR 0007](../../../adr/0007-settlement-handshake.md);沿用 `CONTEXT.md` 詞彙(結清紀錄、待確認、已收款、被退回、結算幣別、誠實重開)。

## Problem Statement

團體結算交握(claim/confirm/reject)已於 `5b99443` 落地,資料模型、`deriveSettlements` 推導、`applyConfirmedSettlements` 餘額整合、以及五個 UI 操作(標記付款/確認/退回/撤回/撤銷)都已可用且有測試。但從使用者視角,仍有四個實際互動缺口會造成困惑或錯帳:

1. **連點會產生重複請款。** 使用者點「我已付款」後,畫面沒有在同一個 tick 內鎖定;若手指連點或多裝置同時操作,可能對同一對(付款人→收款人、同幣別)建立多筆 `settlement_claim`。既有防護(`ledgerMarkSettlementPaid` 的重複檢查、待確認時隱藏「我已付款」按鈕)都讀「已推導的狀態」,擋得住「先前已存在的 claim」,擋不住「兩次點擊在第一筆寫入前同時通過檢查」的競態。`deriveSettlements` 目前不會把同一對的多筆 claim 收斂成一筆。

2. **操作當下缺乏即時、明確且持續的狀態回饋。** 點擊後畫面要等 `ledgerRepository.add` 的 Promise 完成才重繪,期間按鈕沒有立即 disable、沒有 spinner;完成後僅以短暫 toast 區分「已送出」與「待同步」,沒有停留在畫面上的「等待同步」標籤。使用者無法一眼確認「我的操作到底送出了沒、現在是什麼狀態」。

3. **結算面板洩漏與本人無關的他人金流。** 「團體結算」面板(`openLedgerSettlementPanel`)對所有人顯示每一對的成員淨額、待處理結清(含退回原因)、轉帳建議與結清歷史。第三位與某筆交握無關的成員,能看到不屬於自己的付款人、收款人、金額、待確認狀態、退回原因與歷史。

4. **(承 1)缺乏領域層的重複收斂保證。** 即使兩台裝置在離線競態下各自建立不同 `id` 的同對 claim,系統也應只認可 canonical 一筆,其餘不得參與餘額、待處理與歷史,並留下診斷警告。目前沒有這層保證。

## Solution

在**不改資料契約、不改 Apps Script、不動白名單**(ADR 0006/0007 約束)的前提下,替既有交握補上「操作可靠性」與「個人可見範圍」兩組加值,全部落在前端既有 repository 邊界內:

1. **UI 操作鎖(pre-await action lock)。** 使用者觸發任一交握操作時,在**第一個 `await` 之前**、同一同步 tick 內,以明確 lock key 取得鎖;取得後立即 disable 被點按鈕與同一交握的衝突按鈕並顯示 spinner。鎖未釋放前,同鍵的後續點擊直接忽略。操作結束(成功、入離線佇列、或失敗)後以 `try/finally` 保證釋放。

2. **領域層 canonical 收斂。** `deriveSettlements` 升級:同一 `universe`、`from`、`to`、`currency` 若同時存在多筆有效 pending `settlement_claim`,以**明確且可重現的全序(normalized `record.time` ASC → `record.id` ASC 作穩定 tie-break)選出最早**的一筆為 canonical;其餘重複 claim 不進入 `pending`、不影響餘額、不進歷史,並對每筆被抑制的重複 claim 發出 diagnostic warning。confirm/reject 只對 canonical claim 生效,沿用既有「最早回覆優先」。被抑制的重複 claim 為終結態,永不自動升格。

3. **按鈕四態狀態機。** 每個交握操作採 `idle → submitting → queued → synced`,失敗為 `failed`,語意精確定義(見 Implementation Decisions)。一旦 POST 被接受**或**紀錄安全進入 durable 離線佇列即轉 `queued`(spinner 結束,改顯示持續的「等待同步」),不等公開 CSV 出現才結束 spinner,也不因 CSV 尚未更新而轉 `failed`。遠端 read model 出現相同 `record.id` 才轉 `synced`。本機 optimistic 顯示沿用既有 `mergedLedgerRecords()` 合併。

4. **個人可見範圍過濾。** 結算面板所有分區、badge、count、歷史、空狀態、操作與 DOM 內容,都在**產生之前**先依 `currentMember` 過濾出「本人為 from 或 to」的項目(`entry.from === currentMember || entry.to === currentMember`),不得只用 CSS 隱藏。與本人完全無關的第三人交握(姓名、金額、待確認、退回原因、歷史)一律不進入 DOM。本人無任何相關項目時顯示「目前沒有需要你處理的結算」。團體總支出等不含個別款項細節的統計可保留。

## User Stories

1. 作為付款方,我想在點「我已付款」後同一瞬間就看到按鈕被鎖住並轉圈,這樣我知道操作已被接受、不會再去連點。
2. 作為付款方,我連續快點「我已付款」五次時,系統只建立一筆結清紀錄,這樣不會對同一位收款人重複請款。
3. 作為付款方,我在離線狀態下連點「我已付款」,佇列中只留下一筆待同步紀錄,這樣恢復連線後不會送出重複請款。
4. 作為付款方,我的請款因網路逾時而重試時,系統沿用同一筆 `record.id`,這樣伺服器端的 id 去重能真正擋住重複。
5. 作為付款方,我送出請款後看到按鈕從轉圈變成持續顯示「等待同步」,這樣我不會因為 toast 消失就以為操作失敗。
6. 作為付款方,當我已有一筆待確認的請款時,「我已付款」不再出現,這樣我不會誤以為需要再按一次。
7. 作為收款方,我連點「確認已收」五次時,系統只建立一筆 `settlement_confirm`,這樣淨額不會被重複抵銷或產生異常。
8. 作為收款方,我在確認、退回操作進行中看到該筆交握的所有按鈕都被鎖住,這樣不會同時送出互相衝突的回覆。
9. 作為任一方,當兩台裝置在離線競態下對同一對建立了不同 `id` 的請款時,我只在畫面看到 canonical 一筆,這樣餘額與待辦不會被灌成兩筆。
10. 作為維運/診斷者,當系統抑制重複請款時會留下 warning,這樣我能事後確認發生過競態而非資料錯誤。
11. 作為收款方,我退回一筆請款後,付款方可以重新標記付款,這樣爭議款項能再走一次正常流程。
12. 作為付款方,我撤回自己尚未被確認的請款後,可以重新標記付款,這樣誤觸後能自行修正。
13. 作為任一方,一對已結清後又產生新的共同消費時,系統誠實重開該對的欠款、允許建立新的請款,這樣新帳不會被舊結清掩蓋。
14. 作為第三位與某筆交握無關的成員,我在結算面板看不到別人之間的付款人、收款人與金額,這樣他人的金流對我保持隱私。
15. 作為第三位無關成員,我看不到別人之間的待確認狀態與退回原因,這樣我不會誤解或介入不相干的爭議。
16. 作為第三位無關成員,我看不到別人之間的結清歷史,這樣歷史區只呈現與我相關的紀錄。
17. 作為完全沒有待辦結算的成員,我在面板看到「目前沒有需要你處理的結算」,這樣我知道自己無需採取任何行動。
18. 作為與某筆交握相關的成員,我仍完整看到自己的應收、應付、待處理、退回與歷史,這樣個人隱私過濾不會擋住我該處理的事。
19. 作為任一方,我在時間模擬中操作結算會被擋下(沿用既有 `settlementActionGuard`),這樣模擬不會污染真實結算事實。
20. 作為任一方,測試 universe 的請款與正式 universe 完全隔離,這樣我在測試模式的連點/收斂行為不會影響正式帳。
21. 作為使用者,我不需要為了「跨裝置即時」而盯著一直轉不停的 spinner,因為 spinner 只在實際送出期間出現,之後轉為明確的「等待同步」文字狀態。
22. 作為任一方,canonical 的請款被退回後,先前被抑制的重複請款不會自動變成有效,我必須重新建立新的請款,這樣狀態轉換是明確且可預期的。
23. 作為任一方,canonical 的請款被撤回後,先前被抑制的重複請款一樣不會自動升格,這樣撤回不會意外「復活」另一筆舊紀錄。
24. 作為任一方,指向被抑制重複請款的確認或退回,不會影響 canonical 請款、也不會出現在正式歷史,這樣競態殘留不會污染真實結算事實。
25. 作為多裝置使用者,optimistic 本機推導與遠端讀回會選出同一筆 canonical 請款,這樣同一畫面在同步前後不會跳動成不同結果。
26. 作為付款方,我的請款只有在遠端 read model 讀回相同 `record.id` 後才顯示「已同步」,在此之前維持「等待同步」,這樣「已同步」代表的是真的跨裝置可見,而非本機樂觀假設。

## Implementation Decisions

- **模組邊界:** 全部落在既有前端 ledger repository 邊界內(`index.html` 的 `ledgerRepository … 分帳` 區段與 `ledgerCurrentMemberSettlement … showLedgerFullList` 區段)。不新增後端、不新增資料層。
- **不變條件(新增,補入 ADR 0007):**
  - *Canonical claim invariant* — 對每個 `(universe, from, to, currency)`,同時最多只有一筆有效 pending claim 參與餘額/待辦/歷史;多筆時以明確全序(normalized `record.time` ASC → `record.id` ASC tie-break)選出最早者為 canonical,其餘視為重複並抑制。
  - *Stable ordering* — canonical 的「最早」判定使用**明確且可重現的全序:normalized `record.time` ASC → `record.id` ASC 作為穩定 tie-break**。此為 `deriveSettlements` 內部既有的排序方向(time 升冪);**不得**改用任何 time 降冪的顯示排序(顯示排序為「最新在前」,會誤選成最晚一筆)。所有 optimistic、local queue、remote read model 與各裝置,必須使用**完全相同**的 comparator,確保各端收斂到同一 canonical。
  - *Deterministic convergence, not server-arrival ordering* — `record.time` 為 client-provided,因此本批**只保證各端 deterministic convergence(所有端收斂到同一 canonical),不宣稱、也不保證判斷「伺服器實際最早收到」的 claim**。真實「先到先得」屬第二批同步架構議題(見 Out of Scope)。
  - *No auto-promotion* — 被抑制的重複 claim **永久不得**因 canonical claim 被 reject、withdraw 或 confirm 而自動升格為有效。重新請款一律必須建立**新的** `settlement_claim`。
  - *Suppressed-target responses are inert* — 指向被抑制重複 claim 的 `settlement_confirm`/`settlement_reject`,**不得影響 canonical claim、不得出現在正式結清歷史,並需產生 diagnostic warning**。
  - *Idempotent retry* — 同一次邏輯操作的重送必須沿用原 `record.id`,不得重呼叫 builder 產生新 id。
  - *Pre-await action lock* — 邏輯操作在第一個 `await` 之前即以穩定鍵鎖定,避免同 tick 競態穿透既有「已推導狀態」檢查。
- **`deriveSettlements` 升級:** 在既有「最早回覆優先」之上,新增「同對多 claim 以明確全序(normalized `record.time` ASC → `record.id` ASC)取最早為 canonical、其餘抑制並 warning」。輸出結構維持 `{pending, confirmed, rejected, entries}` 契約不變(重複 claim 從 `pending`/`entries` 濾除)。指向被抑制 claim 的回覆不併入 canonical、不入 `confirmed`/`rejected`,僅發 warning。
- **Action lock keys(精確定義):**
  - `claim:{universe}:{from}:{to}:{currency}` — 標記付款(建立 claim)。
  - `response:{canonicalClaimId}` — 確認與退回**共用**同一把 response lock(避免同一 claim 同時被 confirm 又 reject)。
  - `withdraw:{claimId}` — 付款方撤回 pending claim。
  - `undo:{responseRecordId}` — 收款方撤銷既有 confirm/reject。
  - 所有 lock 必須在**第一個 `await` 之前**建立,並以 `try/finally` 保證釋放(成功、入佇列、失敗、例外皆釋放)。
- **純函式 `settlementActionLock`:** 提供 `acquire(key)`/`release(key)`(或等效 try-lock 回傳布林)的無 DOM 純邏輯,供 UI handler 進入時 try-lock、finally release,並可於既有 vm sandbox seam 直接單元測試。
- **純函式 per-member 過濾:** 對已推導的 `{pending, confirmed, rejected}`、成員淨額清單與轉帳建議,依 `currentMember` 過濾出「本人為 from 或 to」的項目;供面板與狀態卡共用。成員名稱比較沿用現有正規化語意。**過濾必須發生在分區、badge、count、history、空狀態、action 與任何 DOM 內容產生之前,不得僅以 CSS 隱藏。**
- **按鈕四態(語意精確定義):**
  - `submitting` = 正在 POST,或正在寫入 durable local queue。
  - `queued` = POST 已被接受,**或**已安全保存進 durable 離線佇列。
  - `synced` = 遠端 read model 已出現相同 `record.id`。
  - `failed` = POST 與本機 durable queue **都**未成功。
  - `queued` **不得**因公開 CSV 尚未更新而轉為 `failed`;`submitting`→`queued` 以既有 `appendSettlementRecord` 的 delivery 結果為準,不以遠端 CSV 讀回為準;`queued`→`synced` 僅在讀回相同 `record.id` 時發生。既有 optimistic merge(`mergedLedgerRecords()`)負責讓紀錄立即以待確認顯示。
- **重試 id 保證:** 確認離線佇列(`ledgerRepository` / `ledgerSyncCoordinator.flush`)在逾時/重送時沿用佇列中原紀錄與其 `id`;若有任何路徑會重呼叫 builder,改為重用既有紀錄。
- **可見範圍套用點:** `openLedgerSettlementPanel` 的四個分區與其操作按鈕、以及 `renderLedgerSettlementCard` 的資料來源,改為消費 per-member 過濾結果;空集合時輸出「目前沒有需要你處理的結算」。
- **重試開放條件(沿用 ADR 0007 語意):** claim 被撤回或被 reject 後可重開(重開 = 建立新 claim,非升格舊重複);confirm 後僅在誠實重開(新共同消費產生新 residual)時可建新 claim;仍有 active pending claim 時不顯示「我已付款」(既有,列為回歸)。
- **架構限制(硬性):** 不新增 Ledger 欄位;不改 Apps Script API;不動 `TripConfig` 白名單;不破壞 append-only、墓碑、正式/測試 universe 隔離;不改 `buildMemberBalances` 與 `buildTransferSuggestions` 的核心計算;結算幣別沿用 `Ledger Default Currency`。
- **ADR:** 於 `adr/0007-settlement-handshake.md` 補述 canonical claim invariant、stable-ordering(含 deterministic-convergence 界線)、no-auto-promotion、suppressed-target-inert 與 idempotency/action-lock 說明(修訂,非新 ADR)。個人可見範圍與按鈕回饋屬 UI,不另立 ADR。

## Testing Decisions

- **好測試的定義:** 只驗外部可觀察行為(某序列的紀錄推導出什麼結果、某操作只產生一筆紀錄、某成員看得到/看不到哪些項目),不驗內部實作細節。金額與淨額以斷言精確值,不容忍浮動。
- **沿用單一既有 seam:** `index.html` 的 `ledgerRepository … 分帳` 區段,以 Node `vm` sandbox 載入(stub `localStorage`、`fetch`(reject)、DOM),測純函式。新邏輯(`deriveSettlements` canonical 收斂、`settlementActionLock`、per-member 過濾)全部設計為此 seam 可直接觸及的純函式。
- **UI 佈線以 source-string 斷言驗證:** 沿用 `ledger-settlement.test.js` 與 `ledger-settlement-handshake.test.js` 既有模式,對 `ledgerCurrentMemberSettlement … showLedgerFullList` 原始碼切片斷言(按鈕 disable/spinner/狀態標籤佈線、面板消費 per-member 過濾、空狀態文案、過濾先於 DOM 產生)。不新增 DOM 測試 seam。
- **受測模組:** `deriveSettlements`、`applyConfirmedSettlements`(回歸)、`settlementActionLock`、per-member 過濾函式;`index.html` 結算 UI 切片。
- **既有 prior art:** `tests/ledger-settlement-handshake.test.js`(record builders、derive 各態、race、universe 隔離、balance 整合、UI 佈線斷言)、`tests/ledger-settlement.test.js`(餘額與轉帳建議、source 佈線斷言)。新測試檔沿用其 `loadModule`/sandbox/`plain` 骨架。
- **新測試檔:** `tests/ledger-settlement-reliability.test.js`,測項依**授權來源**分組(以下清單依來源可追溯,並非重新編排後的「原規格 12 項」)。

  **原始授權驗收 #1–#12:**
  1. claim 快速連點五次只建立一筆。
  2. confirm 快速連點五次只建立一筆。
  3. timeout retry 沿用相同 `record.id`。
  4. 離線連點只留下單一 queue record。
  5. 兩裝置不同 ID 重複 claim 只採 canonical 一筆。**併入斷言:抑制重複 claim 時發出 diagnostic warning。**
  6. pending 存在時不再顯示或允許「我已付款」。**(現有程式已完成,仍明確標記為 regression guard,不得省略。)**
  7. reject 或 withdraw 後可以重新請款(建立新 claim,非升格舊重複)。
  8. confirm 後新增支出可以重新掛帳(誠實重開)。
  9. 第三位無關成員看不到該交握內容。**併入斷言:無本人相關資料時顯示空狀態文案「目前沒有需要你處理的結算」。**
  10. 點擊後 100ms 內按鈕 disabled 並顯示 submitting。**(使用者驗收保留 100ms;自動測試以「第一個 `await` 前同步設定」作為穩定技術斷言。)**
  11. POST 接受或安全入 queue 後轉 queued,不等待 CSV。
  12. remote 與 local queue 同時存在相同 ID 時只顯示一筆。

  **後續核准新增 #13–#17:**
  13. canonical reject 後,舊 duplicate 不得自動升格。
  14. canonical withdraw 後,舊 duplicate 不得自動升格。
  15. suppressed duplicate 的 confirm/reject 不得影響 canonical(不入正式歷史)。**併入斷言:發出 diagnostic warning。**
  16. optimistic 與 remote 必須選出相同 canonical claim。
  17. queued 只有在遠端讀回相同 `record.id` 後才轉 synced。
- **回歸:** 既有 settlement、handshake、ledger、offline、schema、PWA 測試全數通過;完成後跑完整 Node baseline tests、文件標題檢查與 `git diff --check`。

## Out of Scope

- **真正的跨裝置同步加速(第二批)。** 是否新增 Apps Script 讀取端點、更換同步資料層或改變 polling 頻率,一律不在本規格內;需先量測(點擊→POST 完成→遠端 CSV 可見→第二裝置可見)再另行決策,並涉及 ADR 0006/0007 或新 ADR 的較大變更。
- **跨裝置 clock skew 與 authoritative server ordering。** 本批 canonical 只保證 deterministic convergence,不解決各裝置時鐘偏差,也不判斷伺服器實際最早收到的 claim。若未來需要真正的「先到先得」,需在第二批同步架構中評估 server timestamp、server sequence 或後端唯一約束。
- 不以更頻繁 polling 掩蓋重複操作問題。
- 不新增 Ledger 欄位、不改 Apps Script API、不動 `TripConfig` 白名單。
- 不改 `buildMemberBalances` / `buildTransferSuggestions` 核心計算。
- 被抑制重複 claim 的任何形式「自動升格/自動復活」明確排除;重試一律走新 claim。

## Inherited constraints from ADR 0007(非本次新增產品需求)

以下為 ADR 0007 既有邊界,本規格**沿用、不變更**,列此僅為完整性;**非本批新增的產品需求**:

- 不做 push 通知(通知僅為開 App 時的 in-app 推導顯示)。
- 不改雙軌雙幣結清原則(結算跑單一結算幣別,另一幣純參考)。
- 不新增 `Ledger Settlement Currency` 欄位(結算幣別沿用 `Ledger Default Currency`)。

## Further Notes

- 現有 changelog 記錄 42/42 Node tests 通過但仍待真機驗收;本規格處理的正是既有自動測試未涵蓋的實際互動缺口(連點重複、多裝置競態收斂、操作狀態回饋、個人可見範圍)。
- 已於程式碼核實的既有實作(列為回歸而非重建):`mergedLedgerRecords()` 已合併本機佇列做 optimistic 顯示;`ledgerSettleSuggestionLines` 已在待確認時隱藏「我已付款」;`appendSettlementRecord` 已區分「已送出」與「待同步」;`record.id` 於 builder 一次生成。
- **(Non-normative implementation hint)** 成員名稱正規化比較,現有程式使用 `canonicalMemberName`;規格層面只要求「沿用現有正規化語意」,不將此具體函式名列為 normative 需求。
- 實作前先提出檔案清單與計畫、未經批准不得修改;先寫會失敗的測試再實作(紅→綠)。完成後顯示 diff 摘要即停止,等待 Bar 審核;不得 commit、push、建立 PR、merge 或 deploy。
- 建議以本檔為單一 spec 建立 GitHub issue(`ready-for-agent`),不要把「更換同步後端」併入同一份規格。
