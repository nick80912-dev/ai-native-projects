# ADR 0020 — 個人旅程生命週期與 Drive 唯讀封存

> 狀態：Accepted（2026-10-01，依 Bar 核准的第一階段規格；v137 dev candidate，真機驗收未完成）。

## Decision

每位旅伴在自己的裝置選擇「重置紀錄」，或經兩次確認與線上預檢後「清除並打包旅程」。後者可選擇先封存到自己的 Google Drive；清除只作用於本機，不改共用 Sheet 或其他旅伴裝置。清除後先持久寫入 inactive，啟動與同步均尊重此狀態。過往旅程按需由同一 Google 帳號讀取，封存唯讀，回顧筆記以獨立檔案追加。

## Context

現有個人狀態只在 localStorage／IndexedDB，團體帳由公開 CSV 與 append-only Ledger Queue 組成。直接刪除本機資料可能丟失待送帳務；直接複製 v9 個人備份又缺下一站進度並含 Queue。v136 的 BUILTIN 是固定舊旅程種子，清除後必須防止同一 PWA 重啟時重新顯示它。

## Alternatives Considered

- 由一人替全團封存或清除：不符合旅伴各自決定，也會跨裝置改動資料。
- 共用 Sheet 增加歷史分頁：擴大 Schema、權限及帳務權威，第一階段不採用。
- 只用本機封存：換手機後無法以帳號找回。
- 直接沿用個人備份 v9：欄位與保密契約不適合作為唯讀歷史副本。

## Why This Decision

Google Identity Services 的瀏覽器 token model 只請求 `drive.file`；前端只含公開 Client ID，access token 僅在記憶體。Drive archive 固定八表 CSV、個人白名單欄位與 SHA-256 checksum；採買照片、`photoId`、Queue、token 及診斷資料不入檔。清除前兩次重新下載並驗證全部八表，比對內容摘要及本機待送狀態；正式團體帳未結清或有有效 pending claim 即 fail closed。Drive 上傳後讀回確認，完成標記後才持久寫 inactive 並清本機。

在寫 inactive 的同一個同步步驟，最後重查本機 Queue／bridge、個人白名單投影與分頁鎖。重試 metadata 綁定內容摘要及第一次封存／來源時間；資料未變時沿用同 ID／checksum，資料變動則建立新操作。若 complete 已寫入但後續檢查失敗，舊歷史快照保持唯讀、本機保持 active。共用設定在 POST 前耐久寫 sending bridge；晚到的設定／照片／Google 授權／筆記回應均有生命週期或 session 守門，其他分頁收到 inactive storage event 即清除舊畫面與表單。

## Expected Benefits

- 旅伴可獨立留存唯讀歷史，換手機以同一 Google 帳號查看與追加回顧。
- 本機重置不影響團體 Queue、已鎖定帳務或成員身分。
- 清除中斷後以 `cleanup-pending` 防止舊旅程閃現或背景補送，並可重試本機清理。

## Trade-offs

預檢只能看到本機佇列及當下已發布的 CSV，不能知道其他旅伴尚未送出的離線紀錄；CSV 亦可能延遲數分鐘。清除不刪共用 Sheet、Drive 封存或 SW App Shell。若整個網站資料連 inactive 標記都被系統／使用者刪除，固定 BUILTIN 可能作為新裝置再次顯示舊旅程。封存照片不保留。OAuth app 目前為 Testing，其他旅伴在加入測試名單或完成對外發布前無法自行授權。

localStorage 不是跨分頁交易資料庫；互斥鎖、互動守門及同步最後檢查會阻擋已觀測到的變動，但不提供跨裝置交易保證。若封存已 complete 後才發現個人資料變更，重試可能多保存一份不同時間的歷史快照，以避免覆寫已驗證的封存。

## Future Impact

### v141 授權生命週期補充（2026-10-01）

過往旅程重入可重用同次 App 的有效記憶體授權；UI 離頁取消尚未完成的 connect 並丟棄歷史內容，而非每次清除已完成的授權。離開結束旅程操作另使該次流程失效並 disconnect；重新授權相同帳號也不能讓舊流程繼續 complete／清除。inactive、重載、disconnect、401 或到期後不可重用。授權不回應時 90 秒逾時，Drive GET 讀取（含內容）20 秒逾時，阻擋取消後晚到的 grant 或舊 generation 回應。上傳寫入的等待語意不變；已送出的寫入無法撤回。SDK 初次載入準備仍沿用既有行為，非所有等待階段都有新增逾時。權限、備份／封存格式、inactive 與雲端唯讀契約不變。真實 iPhone／Android PWA 的外部登入仍需獨立驗收。


第二階段才提供連接／切換新 Google Sheets；本 ADR 不授權顯示未實作的「連接新旅程」。正式使用前須由 Bar 在 iPhone 與 Android 實體 PWA 各驗 Google 授權、Drive 上傳讀回、清除重啟與筆記；v137 仍按 ADR 0019 的不可變 generation 與 forward-bump 回滾。變更 Drive scope、封存格式、團體帳預檢或 inactive 邊界需更新本 ADR 與回歸測試。
