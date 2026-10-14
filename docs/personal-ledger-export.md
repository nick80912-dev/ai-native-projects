# 個人帳獨立匯出契約

v143 在設定「資料與版本」提供「匯出本趟個人帳」。由使用者點擊下載 JSON，僅讀取目前裝置的個人帳，不刪除、不重算、不送雲端。切換成員不會把同裝置的個人帳切成不同帳本。

## 格式 v1

- `format: "trippilot-personal-ledger"`、`version: 1`、`exportedAt`：匯出時點。
- `trip`：name、startDate、endDate、sourceSheetId、sourceKey。
- 旅程 sourceKey 是工作表 ID、開始及結束日期的 JSON array 字串；紀錄 sourceKey 加上原始 ID，供未來匯入端辨識重複。同來源、同日期重複匯出保持相同；不是新增帳號或全球 UUID，修改來源／日期會改變來源識別。
- records 白名單：id、time、member、category、detail、amountJpy、amountTwd、note、payMethod、isProxy、proxyTarget、inputCurrency、isTaxFree、priceMode、taxRate、couponAmount、batchId、storeName、replacesRecordId，以及新增的 sourceKey。原始缺少的選填欄位不補造。

日期、原幣、台幣換算及代購資訊保持原樣。換算值不保證等於信用卡實際扣款，代購不可直接當作自己的消費。團體帳原始紀錄、Queue、照片、打卡、登入憑證、診斷及完整設定不匯出。

## 格式 v2（v154 起）

`version: 2`。`records` 與 v1 完全相同，另外多兩段，與分帳頁個人大卡的「整趟旅程」（點開為「我的總花費」明細）是同一份計算（`buildMyTripSpend()`）：

- `groupShare`：目前身分在團體帳中分到的份額。`member`、`pendingCount`（還沒同步的筆數）、`unattributedCount`（分攤成員或金額格式無法辨識、沒有算進來的筆數）、`items[]`。每筆 `items` 只有：sourceRecordId、sourceKey（旅程 sourceKey 加 `/group/` 與原始 ID，與個人紀錄的 sourceKey 不會重複）、time、category、detail、storeName、payer、participantCount、shareJpy、shareTwd、pending。不含分攤成員名單、支付方式、備註或其他人的份額。
- `totals`：member、personalJpy／personalTwd（目前身分、不含代購）、proxyJpy／proxyTwd／proxyCount、groupShareJpy／groupShareTwd、totalJpy／totalTwd。

團體份額只算目前身分在分攤成員內的紀錄，用與結算相同的分法（平均分，除不盡的部分依分攤成員順序補 1）；只先墊、自己不在分攤成員內的紀錄不算。刪除、更正後的結果、還款、身分註冊與測試帳本都已排除。沒有個人帳也沒有團體份額時才提示尚無資料。

## 失敗與使用限制

非進行中旅程、時間模擬、無法讀取、格式損壞、重複 ID 或無法產生下載時顯示提示，不輸出空白替代檔；無個人帳則提示尚無資料。下載提示只表示送出下載，仍需使用者確認儲存成功。檔名包含旅程名稱與出發日期。

請在清除旅程前匯出並妥善保存。個人帳匯出不是備份 v9，不能由 TripPilot「從 JSON 還原」使用。記序 Jixu 匯入及其去重／分類映射尚未實作，不能宣稱已可自動入帳。iOS／Android PWA 下載、VoiceOver／TalkBack 及實體鍵盤仍須真機驗收。

## 說明視窗

目前旅程、個人帳匯出及備份／還原的 ⓘ 使用獨立 dialog，不採頁內收合。支援關閉、背景點擊、Esc、焦點圈限與關閉後返回觸發鈕；背景還原原本 inert／aria-hidden。清除、還原與照片排除等重要警告留在主頁。

可執行契約：tests/personal-ledger-export.test.js、tests/browser/personal-ledger-export.spec.js、tests/my-trip-spend.test.js。
