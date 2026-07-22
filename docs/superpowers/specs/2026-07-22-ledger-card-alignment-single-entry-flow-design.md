# Ledger 首頁卡片對齊與單品項必填流程設計

日期：2026-07-22
狀態：已核准方案 A，等待書面規格確認

## 目標與範圍

本批只修正分帳首頁「今日／代購」卡片的文字對齊，以及單品項新增消費的「金額 → 明細 → 儲存」鍵盤流程。不重新設計既有 Ledger P0，不改多品項流程、資料欄位、Schema、Apps Script、Repository、Queue、結算、墓碑或 localStorage key。

## 首頁卡片對齊

沿用現有 article 與 button HTML，避免新增 wrapper。共用 `.ledger-compact-card` 設為直向 flex、靠左排列、100% 寬度與一致文字對齊；`h3`、`strong`、`p` 明確共用寬度、margin 與 line-height。`button.ledger-compact-card` 另外重設 `appearance`、`-webkit-appearance`、字型與顏色，消除瀏覽器原生 button 排版差異。

今日卡維持不可點擊，代購卡維持整張可點擊。兩張卡的資料、計算、grid、padding 與最小高度不變；不使用負 margin、transform 或個別補正。375px／390px 下三層文字左邊界誤差不得超過 1px，且不得水平溢出。

## 單品項主要輸入流程

`renderLedgerSingleItemDetail(draft)` 從 `renderLedgerSingleSecondaryFields(draft)` 移至單品項主要輸入群組，放在金額正下方並永久顯示。摘要仍顯示「類別・支付方式・日期」，只控制店家、日期時間、完整類別與完整支付方式。

金額 input 保留既有 `type="number"`、`inputmode="numeric"` 與解析契約，但改用 `enterkeyhint="next"` 及 `handleLedgerAmountNext(event)`。該 handler 只攔截非 composing 的 Enter：有效正數直接聚焦既有 `#ledgerDetail`；空白、零或無效值則沿用既有欄位內錯誤、保留金額焦點，且不呼叫儲存、不重新 render 整張 Sheet。

明細 input 加入 `enterkeyhint="done"` 與 `handleLedgerDetailDone(event)`。該 handler 只攔截非 composing 的 Enter，並且只呼叫一次既有 `saveLedgerEntry(false)`。儲存仍由既有驗證、`savePending`、spinner、disabled 與 idempotency guard 負責；畫面儲存按鈕保留。

## 驗證與狀態

單品項明細維持必填，編輯既有紀錄時沿用 `draft.detail` 帶入。切換個人／團體、JPY／TWD、類別或支付方式仍保留同一 draft 的明細。

金額錯誤聚焦金額；明細錯誤聚焦已直接顯示的明細，不再設定 `entryDetailsOpen=true`，因此不會順帶展開店家、日期、類別或支付方式。其他未來位於收合區的驗證錯誤仍可沿用既有展開規則。多品項店家、名稱與金額焦點鏈不修改。

## 測試與交付

先更新既有 Ledger P0、快速輸入、三秒記帳、dashboard 與表單測試並確認 RED，再做最小程式修改。自動化至少覆蓋共用卡片左對齊、button reset、明細位置、有效／無效金額 Enter、明細 Enter 單次儲存、明細錯誤不展開摘要、多品項焦點鏈與 pending guard。

Browser QA 於 375px／390px 驗證卡片三層文字誤差、代購卡點擊、金額與明細焦點、空值錯誤、單次儲存、固定儲存按鈕、摘要範圍、水平溢出及 page error。桌面 QA 不取代 Bar 的 iPhone Safari／PWA 驗收。

因 `index.html` 屬 App Shell，`CACHE_NAME` 只由 `okayama-trip-v34` 升至 `okayama-trip-v35`；SHELL、install、activate 與 fetch 不變。最後更新 `07_CHANGELOG.md` 與 `tasks/current.md`，並清理過時的 118px Popover 敘述，現行規格維持 104px。
