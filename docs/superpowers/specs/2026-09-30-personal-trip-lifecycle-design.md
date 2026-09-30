# 個人旅程生命週期：第一階段設計

日期：2026-09-30。狀態：待 Bar 審閱書面規格。基準：已發布 v136、`dev` 的 v136 程式；本文件不授權直接修改功能程式或正式發布。

## 1. 目的與範圍

每位旅伴可在自己的裝置獨立處理這趟旅程，不影響其他旅伴的手機或共用 Google Sheet。第一階段交付三個可用功能，名稱固定為「重置紀錄」、「清除並打包旅程」、「過往旅程」。清除後 App 顯示「目前沒有進行中的旅程」，不再呈現本機舊行程、成員或帳務。使用者可選擇先將唯讀封存存到自己的 Google Drive；換手機後以同一 Google 帳號查看並追加回顧筆記。

第一階段**不**實作連接／切換新 Google Sheets，不顯示不可用的「連接新旅程」按鈕。不刪除或修改共用 Sheet、Apps Script、已存在的團體帳務，也不改 CMS Schema。採買照片既不進封存，也不跨裝置同步。

## 2. 技術選擇與邊界

採用 Google Identity Services 的瀏覽器 token model，使用者按鈕觸發授權，只請求 `https://www.googleapis.com/auth/drive.file`。Drive 帳號資訊使用同一 scope 的 `about.get` 顯示目前帳號，避免存錯帳號；access token 僅存記憶體，不落 localStorage、IndexedDB、封存檔或日誌。TripPilot 在該使用者 Drive 建立自己的資料夾與 JSON 檔，不增開分享權限。前端直接呼叫 Drive REST API；不新增伺服器、npm 套件、Firebase 或 Google Sheet 欄位。GIS 外部程式只在使用者進入封存／過往旅程流程時按需載入，無網路時不影響目前旅程離線啟動。

這是既有「即時個人狀態僅在本機」契約的**唯讀歷史副本擴充**，不是讓即時打卡或個人帳改由 Drive 同步。共用帳依 ADR 0006／0007 繼續走原 Ledger repository，封存不成為新的帳務權威。新模組採既有 ES5 runtime module／DOM adapter 邊界，登錄 `runtime-assets.json`（ADR 0016）。新增 ADR 記錄個人封存與終止旅程決策；不推翻 ADR 0003、0006、0007、0019。

正式可用的外部前置條件：在 Bar 控制的 Google Cloud 專案啟用 Drive API、建立 OAuth 同意畫面與 Web client ID、設定正式 Netlify 與 GitHub Pages 測試來源；兩站必須使用同一 OAuth app 身分，才能查到同一帳號的封存。Client ID 可公開放入前端設定，client secret 不得出現在前端或 repo。若授權設定或真機授權未完成，只能標為「程式待驗」，不得宣稱三功能已可用。

## 3. 畫面與操作

- 設定頁的「資料」群組可進入「過往旅程」；資料子頁提供「重置紀錄」與「清除並打包旅程」，危險動作與備份說明分隔。既有窄範圍診斷動作「重置行程進度」保留，不冒充新功能。
- 「重置紀錄」先列出將清除的個人項目並二次確認，完成後回到仍在進行的旅程；沒有帳號或網路也能使用。
- 「清除並打包旅程」先執行線上帳務預檢，再問「要保存到過往旅程嗎？」選「保存」則顯示 Google 帳號、封存進度與最後驗證，成功後清除；選「不保存」則再次確認永久失去本機資料後直接清除。取消、登入失敗或封存失敗均保留目前旅程，絕不偷偷改走直接清除。
- 清除完成的首頁只顯示「目前沒有進行中的旅程」及「過往旅程」入口。四個原旅程分頁不渲染舊資料；設定仍可開啟。第二階段完成前不提供假的新旅程串接按鈕。
- 「過往旅程」按帳號列出自己 Drive 中 TripPilot 建立的封存，按旅程選擇。檢視頁分區呈現行程、購物紀錄、個人帳與團體分帳；封存資料不可編輯、不可寫回原 Sheet。回顧筆記只能新增，依建立時間顯示，不提供改寫已存封存或筆記的 UI。無網路、未授權或 token 過期時顯示明確登入／重試狀態，不把錯誤誤報為「沒有封存」。切換帳號或關閉檢視後清除記憶體中的前帳號封存內容。

## 4. 重置紀錄的資料契約

清除本次旅程的個人打卡 `trip_checks`、下一站／略過 `trip_next_stop_progress`、想逛 `trip_shop_wants`、採買清單 `trip_shopping_list`、個人帳 `trip_personal_ledger`、代購對象 `trip_ledger_proxy_targets`、旅途紀錄 `trip_travel_notes` 及對應採買照片 Blob。重置後這些項目在 UI 與 storage 均歸零，失敗時顯示未完成並可重試，不宣稱成功。

保留目前成員選擇、主題、個人自訂選項、共用 Ledger 快照、共用設定、所有 Ledger queue／delivery／deletion／settings bridge，以及正式和 TEST 團體帳。既有已鎖定帳務不修改、不重算；重置不需要結清預檢。個人備份 v9 契約不因本功能改版，也不將 `trip_next_stop_progress` 偷塞入舊備份格式。

## 5. 清除／封存前的安全預檢

每次按「清除並打包旅程」均從網路重新抓取**全部八張**發布 CSV，尤其 Ledger 不得使用現有「Ledger 下載失敗時沿用快照」的部分同步降級。資料結構或來源驗證不過、離線、timeout、CSV 缺欄或讀回不確定時，預檢失敗且不得清除。網路請求沿用既有 WebView 相容策略，不使用不受支援的 AbortController。

只要**本機任何**正式／TEST 團體 Queue、送達 bridge、刪除 bridge 或共用設定 bridge 尚未收斂，便阻擋清除及封存。對新抓取的**正式** Ledger，依既有 canonical 結算規則確認沒有待回覆的有效還款 claim，且每位成員於共享結算幣別的淨額均為零。TEST 帳本餘額不代表真實債務、不阻擋；但 TEST 待同步仍會阻擋，因不能丟失待送達紀錄。預檢在開始上傳前及真正刪本機資料前各做一次；第二次還須比對八表與本機待封存個人資料的 digest，若有變動則取消清除並要求重新打包，避免封存內容與真正清除時的內容不同。

這個預檢**只能**看到本機佇列與當下已發布的雲端 Ledger，無法得知其他旅伴手機尚未送出的離線紀錄，也無法消除 CSV 1–5 分鐘發布延遲。確認畫面要清楚告知此限制；不設全員簽核流程。

## 6. 封存格式與 Drive 寫入

一個 archive JSON 至少包含 `format`、`version`、`archiveId`、`sourceSheetId`、旅程名稱／日期、`archivedAt`、八張 CSV 的原始文字與其資料來源時間、個人資料投影及內容 checksum。checksum 為固定欄位順序、排除 checksum 欄本身後的 UTF-8 JSON 內容之 SHA-256；讀回重新計算並比較。個人投影含打卡、下一站進度、想逛、採買項目／分配連結、個人帳、代購對象、自訂項目、旅途紀錄、封存時選用成員與主題；不含照片 Blob、`photoId`、待同步 queue、OAuth token、診斷日誌或時間模擬狀態。封存格式獨立於既有個人備份 v9，不可用「備份 JSON」直接冒充，因 v9 遺漏下一站進度並包含 queue。

Drive 檔案以 TripPilot app-private metadata 標記檔型、格式版、`archiveId`、來源旅程與 `prepared / complete` 狀態；資料夾是使用者可見的 `TripPilot`，不設公開權限。上傳採支援手機中斷續傳的 Drive resumable upload。`archiveId` 在同一次操作的重試中保持不變；重試先查既有同 ID 檔並驗證，避免重複封存。上傳完成後用 `files.get?alt=media` 讀回，驗證 JSON 格式、完整八表與 checksum。第二次預檢成功後才將 metadata 標記為 `complete`，再進入本機清除；讀回未成功、格式不符、帳號切換或標記失敗均不得開始清除。`prepared` 檔不出現在過往旅程列表，供重試沿用；本機清除成功後不再保留 archive JSON 的持久副本。

回顧筆記以每次新增一個獨立、不可變的 note JSON 檔保存，metadata 指向 `archiveId`。新增失敗不顯示假成功；重新讀回可確認該筆筆記，重試維持同 note ID 避免重複。備註不修改 archive 本體，故封存仍唯讀。過往旅程清單與內容按需從 Drive 取得，只留在當前頁面記憶體，不寫入離線快取。

## 7. 清除本機與無進行中旅程

封存驗證成功，或使用者明確選擇不封存並完成確認後，先耐久寫入 `inactive / cleanup-pending` 狀態；寫入失敗即不清理。啟動流程、背景同步、Ledger 自動補送／polling 與前景事件必須先檢查此狀態，不能先載入 BUILTIN／舊快照再切空白，避免畫面閃現或重新落地舊資料。

接著清理**本裝置**的旅程資料：`trip_*` 即時／個人／團體／身分／設定／佇列／bridge／快照／同步失敗／時間模擬 key、`v2_cache_*` 舊 CSV key，以及 `trip-local-media` 的採買照片。保留唯一的 inactive 標記及完成／重試所需最小狀態；不刪 Google Sheet、其他旅伴手機、Drive archive 或 Service Worker 的版本綁定 App Shell。照片或 storage 清理中斷時保持空白／可重試畫面，不宣稱完成。清理成功後設為 `inactive / complete`；重開或離線重開仍顯示無進行中旅程。

清除保證限於仍保有該 inactive 標記的已安裝 PWA。若使用者／系統把整個網站資料連標記都刪掉並重新安裝，當前版本仍有硬編碼的舊旅程 BUILTIN，可能再次作為全新裝置顯示；此限制已向 Bar 說明並接受，完整的新旅程選擇／啟用屬第二階段。root v110 predecessor bridge 維持 byte-locked，不為本功能直接修改。

## 8. 失敗語意與可恢復性

- OAuth 取消、被擋、過期或 Drive API 權限不足：保留目前旅程，提示重新登入；直接清除選項須由使用者另行明確選擇。
- 網路中斷、Drive 容量不足、上傳或讀回失敗：保留目前旅程及 retry ID，可安全重試；不得顯示「已封存」。
- 預檢無法得到完整即時資料、任何未結清／待同步：禁止兩條清除分支，顯示具體待處理原因。
- 清理中斷：inactive 狀態先守住顯示與背景同步，恢復後只重試本機清理；已驗證的 Drive 封存不重傳、不覆寫。
- 封存格式不支援、損壞或不完整：過往旅程標示無法讀取，不污染目前旅程，也不把壞檔自動刪除。
- 多分頁或重複點擊：同裝置一次只允許一個生命週期操作；關鍵清除前重查本機待送資料與帳號／archive ID。任何不一致均 fail closed。

## 9. 驗收與交付

以測試先行覆蓋純資料投影、照片剝除、全團正式結清判斷、Queue／bridge 阻擋、雙次預檢、Drive 上傳讀回驗證與重試冪等、筆記追加、清理 allowlist／inactive 狀態。瀏覽器整合測試至少證明：重置保留團體 queue／已鎖定帳務；封存失敗或取消完全不清除；成功後在線／離線與重載都不露出舊旅程；過往旅程只能讀、可追加筆記；切換 Google 帳號無資料殘留。保留既有三情境 QA：斷網 BUILTIN、連網同步、旅行日 mock Date，且 pageerror 為零。

發版需依 ADR 0019 建立下一個不可變 generation，`sw.js`／App version／BUILTIN／cache header／runtime inventory 原子一致；產生資產只由既有工具生成，root v110 bridge 不改。Google 授權與 Drive 上傳／讀回必須在實際 iPhone、Android PWA 各走一遍；失敗不得把模擬器測試當作真機通過。交付附資料保留／刪除清單、已驗證與未驗證項目、健康報告與 forward-bump 回滾指引。正式站發布仍走 `dev → main` PR、Bar review／merge 與線上核對流程，不由本設計自動授權發布。

參考：ADR 0003、0006、0007、0016、0019；`08_AI_HANDOVER.md`、`14_FILE_TIERS_AND_GATE.md`、`15_AI_EXECUTION_RULES.md`。Google API 契約以官方文件為準：[Drive scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)、[token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)、[上傳](https://developers.google.com/workspace/drive/api/guides/manage-uploads)、[檔案讀回](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)。
