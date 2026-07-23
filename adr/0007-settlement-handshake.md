# ADR 0007 — 團體結算：握手式結清事實（Settlement Handshake）

> 狀態:**Accepted**(2026-07-23 經 grilling 定案;Bar 已核可 Tier 2 四項確認並完成實作,真機驗收另行進行)。延伸自 [ADR 0006](0006-ledger-sync-apps-script.md) 的 append-only 分帳模型,不推翻其任何既有決策。

**Decision**:團體結算狀態由「純推導」升級為「**推導 + 事實**」。費用照舊推導每人淨額,再疊上真實還款事實;結清是雙向握手,以收款方確認為權威。新增三個 `recordType` 值 `settlement_claim`(付款方發動)、`settlement_confirm`(收款方確認,`targetRecordId` 指向 claim)、`settlement_reject`(收款方退回,帶選填原因),全部沿用既有 21 欄位置式契約與 append-only 管線,**不新增欄位、不改 Apps Script、不動白名單**。淨額只在 `settlement_confirm` 出現時歸零;`settlement_claim` 單獨存在時淨額維持掛帳,僅作「待確認」UI 疊層。結算跑單一結算幣別,取自共享的 `Ledger Default Currency`。撤回/撤銷沿用既有 `deletion` 墓碑。

**Context**:目前「我的結算狀態」卡、應收/應付與轉帳建議完全由 `buildMemberBalances()` + `buildTransferSuggestions()` 即時推導,轉帳建議只是建議,沒有任何機制記錄「這筆已經還了/已經收了」。旅伴實際還款後無法在 App 標記,狀態無法異動。需求是在不破壞 append-only、且跨裝置一致的前提下,建立「已付款 → 待確認 → 已收款」的狀態流轉,並允許收款方退回爭議款項。

**Alternatives Considered**:
- **A. UI 確認旗標**:只把某條建議標記為「已處理」,不記金流事實。存 localStorage 則不跨裝置(團體無意義);存 CMS 則需可變共享欄位,破壞 append-only。
- **B. 一次性「全員結清」事件**:單一事件把所有淨額歸零。多裝置+離線佇列下難保原子性,也無法表達「只有這兩人之間結清」。
- **C. 雙軌獨立結(JPY/TWD 各一套握手)**:最忠實,但點擊翻倍,且會出現「這對在 ¥ 已清、卻在 NT$ 欠另一人」的破碎狀態。
- **D. 以人為單位一次清整個雙幣淨額**:放棄 pairwise,推翻握手模型。
- **E. 新增 `Ledger Settlement Currency` 鍵區分「輸入預設幣別」與「結算幣別」**:概念乾淨,但需撬開 ADR 0006 刻意收緊的 `updateSettings` 固定白名單。
- **F. 退回走靜默墓碑(不通知付款方)**:少一個 `recordType`,但付款方不知為何款項消失。

**Why This Decision**:pairwise 逐筆握手 + 收款方確認,是唯一與現有「append-only + 餘額推導 + 跨裝置」架構一致、又能表達部分結清與逐筆反轉的模型。以收款方確認為結清權威,對應需求語意「應收已收」,避免付款方樂觀標記造成假結清。單一結算幣別讓 pairwise 淨額成為良好定義(雙幣貪婪路由可能不同對,故不採雙軌),並貼合結算卡「一次只顯示一種幣別」的現況。沿用 `Ledger Default Currency` 而不新增鍵,是因本專案特別在意 Apps Script 寫入面積(ADR 0006),為一個「這趟大概率與預設幣別相同」的區分去撬白名單並不划算。退回升級為獨立事實 `settlement_reject`,讓付款方能看到「被誰、因何退回」,再開新 claim 重試。

**Expected Benefits**:結清狀態可跨裝置流轉且可稽核(誰付、誰確認、誰退回、何時);待確認/已收款/被退回三態全由事實組合推導,無就地改寫;沿用既有 id 去重、離線佇列、墓碑與測試模式範圍,前端純加值、架構風險極低;Apps Script 與 CMS 寫入契約零變動。

**Trade-offs**:已結清的一對若之後產生新共同消費,會誠實重新掛帳、需再結一次(舊結清收進歷史);受專案範圍限制,「通知」只能是 in-app 開 App 時推導顯示,無 push;沿用 `Ledger Default Currency` 兼作結算幣別,概念上輕微混用「預設輸入幣別」與「結算幣別」,假設兩者相等;新增三個 `recordType` 值使狀態機面積變大,`effectiveLedgerRecords` 與 `buildMemberBalances` 需新增結算分支與權限(`getCurrentMember()`)閘門。

**Future Impact**:若日後出現「預設輸入幣別 ≠ 想結算幣別」的實需,再升級為獨立 `Ledger Settlement Currency` 鍵(需擴充 `updateSettings` 白名單並更新 ADR 0006/本 ADR)。若需要自由結(記錄演算法未建議的還款)或雙軌雙幣結清,可在既有三型別上擴充,不需改資料契約。若未來換後端,結算事實與費用、墓碑走同一 repository 邊界,一併替換即可。

## 詞彙表(結算 Settlement)

| 詞 | 定義 |
|---|---|
| 結清紀錄 settlement record | 記錄真實還款的事實紀錄,`recordType` ∈ {`settlement_claim`,`settlement_confirm`,`settlement_reject`};與 `expense` 區隔,由餘額演算法的結算分支解讀。 |
| 待確認 pending | 有 `settlement_claim`、無對應 `confirm`/`reject` 的狀態;淨額**未**歸零,雙方裝置顯示「⏳ 待○○確認」。 |
| 已收款 / 已結清 confirmed | 有 `claim` + 對應 `confirm`;淨額在 `confirm` 出現時歸零。 |
| 被退回 rejected | 有 `claim` + 對應 `reject`;淨額維持掛帳,付款方看到退回原因;終結態,重試 = 開新 `claim`。 |
| 結算幣別 settlement currency | 全團共享、用於計算應收/應付/結清的單一幣別;V1 取自 `Ledger Default Currency`,另一幣純參考。 |
| 誠實重開 honest re-open | 已結清的一對之後有新共同消費 → 自動產生全新淨額,狀態回到應付/應收;舊結清留存為歷史。 |
