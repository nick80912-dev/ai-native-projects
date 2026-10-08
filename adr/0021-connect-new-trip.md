# ADR 0021 — 連接下一趟旅程（每趟一份 Sheet）

> 狀態：Accepted（2026-10-08，Bar 回覆「照建議」核准七項決定與 Tier 2 範圍；v149 候選在工作分支，未合併 dev、未發布，合併時機待旅程結束後與 Bar 確認）。規格：[connect-new-trip-design](../docs/superpowers/specs/2026-10-08-connect-new-trip-design.md)。

## Decision

每趟旅程一份 Google Sheet，從範本複製。旅伴在手機「已清除」或「尚未連接」時，於 App 內貼上新 Sheet 的「發布到網路」連結；App 下載全部分頁、檢查範本與 TripConfig、向該 Sheet 的 Apps Script 查詢 Trip ID 是否相符，顯示預覽，確認後才切換。目前旅程記在 localStorage `trip_source`，所有讀寫（八表 CSV、團體帳寫入與快速拉取、快照、待送帳、備份、封存）都以它為準。

- 舊岡山手機（已有打卡、想逛、個人帳或待送帳等紀錄）升級後自動記為 `legacy`，行為與 v148 相同。
- 沒有任何紀錄的新手機記為 `unconnected`，首頁顯示「尚未連接旅程」，不再顯示岡山內建資料。
- 進行中的旅程不能直接切換，必須先「清除並打包旅程」（ADR 0020）。

## Context

v148 以前發布 ID、Apps Script 網址、編輯 ID、內建資料（BUILTIN）與天氣城市都寫死在程式裡。換旅程等於改程式、發新版，而且所有旅伴必須同時更新；舊快取、待送帳與備份也沒有旅程識別，換錯 Sheet 會讓帳寫進別趟旅程。

## Alternatives Considered

- **同一份 Sheet 換內容**：分帳紀錄是 append-only，清空等於破壞上一趟的帳；也無法保留封存來源。不採用。
- **每趟發新版 App**：每次換旅程都要走 Tier 2 發布，並要求所有旅伴同步更新。不採用。
- **由一人替全團切換**：違反 ADR 0020「旅伴各自決定、只改本機」。不採用。
- **只靠 CSV 的 Trip ID，不查 Apps Script**：無法發現「行程讀 A 表、帳寫 B 表」的設定錯誤。加上唯讀 `doGet?action=info` 比對。

## Why This Decision

`trip-source.js` 是唯一權威：`classifyBoot` 決定開機時沿用、遷移為 `legacy`、標記 `unconnected` 或停在損壞畫面；`createConnectFlow` 的 `inspect` 只讀不寫，`commit` 依序寫入中斷標記、清照片與舊 `trip_*`／`v2_cache_*`、寫快照、寫來源、轉為 active，任何一步失敗都回到原狀；中斷後下次開機由 `recoverPendingConnect` 完成或復原。`unconnected` 是 lifecycle 的新模式，既有 31 個 `mode!=='active'` 守門自動生效。

每份快照帶 `sourceKey`（`legacy` 或 `sheet:<Trip ID>`），開機時拒絕別趟的快照；新旅程沒有快照時顯示「下載行程」而不是退回岡山 BUILTIN。待送帳以 `trip_ledger_queue_owner` 標記所屬旅程，不符時整批暫停送出，不刪除也不送出。

## 實作與規格的差異（2026-10-08 記錄）

- **待送帳的旅程標記是「每個佇列」而不是「每筆」**：換旅程前佇列必須是空的（清除前預檢會擋），所以每筆標記沒有額外保護，反而要改動 21 欄的 Ledger payload。以佇列層級的 owner 實作。
- **封存的 `sourceSheetId`**：岡山沿用原本的編輯用 ID；新旅程用 `sheet:<Trip ID>`，而不是發布 ID。Drive `appProperties` 每項上限 124 bytes，發布 ID 加前綴可能超過；Trip ID 也與快照、待送帳、備份的識別一致。封存格式維持 v1。
- **天氣地區分頁**以 TripConfig 的 `Weather Regions GID` 指向分頁，因為範本尚未建立、無法事先知道 gid；清單在同步成功後另外下載並存在 `trip_weather_regions`，不進八表原子快照與封存。

## Expected Benefits

- 換下一趟旅程不需要改程式或發新版；Bar 照手冊建立 Sheet，旅伴自己貼連結。
- 帳只會寫回同一份 Sheet：CSV 的 Trip ID、Apps Script 回報的 Trip ID、快照、待送帳與備份五處一致才放行。
- 岡山手機升級後不受影響；新手機不再誤顯示岡山。

## Trade-offs

- 連接一定要連網，而且要等「清除並打包旅程」完成；清除要求全團結清，若結清在 App 外完成，仍需在 App 內補記還款才能清除。
- 範本的 Apps Script 每份 Sheet 要各自部署一次，Ledger Endpoint 要手動填進 TripConfig。
- v149 起只有打卡等紀錄的手機才被視為岡山；只有快取或成員名稱的手機會變成「尚未連接」。因此 v149 應在岡山旅程結算、清除之後才發布。
- root v110 bridge 不能修改，極舊裝置第一次開啟時仍可能短暫看到岡山，之後才切到 v149。
- 只支援日本（JPY↔TWD、天氣時區 Asia/Tokyo）；旅伴的 Google OAuth 測試名單另案處理。

## Future Impact

- 個人備份升為 v10（`trip` 身分），契約見 `docs/personal-state-compatibility.md`；v1–v9 只能還原到岡山。
- Schema 3.1：TripConfig 新增選填 `Trip ID`、`Ledger Endpoint`、`Weather Regions GID`；行程總表新增選填「行程ID」欄（依標題名稱尋找，格式與唯一性由 validator 擋下）。
- `apps-script/ledger-sync.gs` 新增唯讀 `doGet?action=info`；岡山的部署不需要更新（`legacy` 不呼叫它），新旅程的 Sheet 從範本複製時一併帶上新版程式。
- 變更 `trip_source` 格式、開機分類規則、連接交易順序或 `sourceKey` 語意，需更新本 ADR 與 `tests/trip-source.test.js`、`tests/browser/trip-connect.spec.js`。
