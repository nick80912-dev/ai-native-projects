# 03 CMS 資料表快速概覽(Google Sheets)

## 文件定位
- 本文件只提供 CMS 資料表概覽與維護規則,不是欄位權威來源。
- 欄位權威來源:`schema.js`。
- 欄位細節文件:`09_SCHEMA_MAPPING.md`。
- 若本文件與 `schema.js` 衝突,一律以 `schema.js` 為準。

## Google Sheet 來源
- 檔案:「261018-261023岡山四國六天五夜」
- Drive fileId:`1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`
- Published CSV base URL:`https://docs.google.com/spreadsheets/d/e/2PACX-1vRenmV8UxEzWbzSjKJKi4rSpYt63geBqhEkKsl1GemWVPmFKTcvv3Uk71Hjla3TGBpGIjC7bQDDdI00/pub?single=true&output=csv&gid=`

## 八張工作表與 gid
| Sheet | gid | kind | 用途 |
|---|---:|---|---|
| 行程總表 | 1169222358 | itinerary | 行程骨架(天/時間/活動),使用 ID 引用 Places 或 Restaurants |
| Places | 1089684162 | table | 地點主表；住宿型列以 HID 引用 Hotels profile |
| Restaurants | 1421821084 | table | 餐廳資料,可用 PID 掛到 Place 卡片 |
| Shopping | 1182059264 | table | 商場店家資料,驅動購物頁樓層/必逛/免稅顯示 |
| Hotels | 792115203 | table | 住宿 profile；以 HID 被一或多個住宿型 Places 精確引用 |
| Expenses | 1354339857 | freeform-expense | 行前團費自由格式;同行成員名單來源 |
| 分帳紀錄 | 896856089 | table | 跨裝置旅途記帳;Apps Script append-only 回寫 |
| TripConfig | 1070234314 | keyvalue | 旅程名稱、起訖、交通模式、幣別等設定 |

## 欄位權威來源
| 內容 | 權威文件 |
|---|---|
| Published CSV base URL / gid / Sheet kind | `schema.js` |
| Google Sheet header / aliases / required | `schema.js` |
| CMS ↔ App 欄位對照 | `09_SCHEMA_MAPPING.md` |
| Parser 表頭比對規則 | `schema.js` / `validator.js` |
| Places.Type values 正規化 | `schema.js` |
| Expenses layout | `schema.js` |

## 各 Sheet 用途與維護方式
| Sheet | 用途 | 維護方式 |
|---|---|---|
| 行程總表 | 排列每日行程與引用 ID | 新增行程列;ID 使用 Pxxx 或 Rxxx |
| Places | 維護地點、交通、停車、營業、官網等資訊 | 住宿型列另填 HID；欄位異動先改 Sheet 再改 `schema.js` |
| Restaurants | 維護餐廳資料 | 新餐廳只新增資料列;可填 PID 掛到 Place |
| Shopping | 維護店家、樓層、必逛、免稅等資料 | 新店家只新增資料列;PID 指向商場 Place |
| Hotels | 維護住宿 profile | 新住宿建立唯一 HID；各住宿停靠點在 Places 以 HID 引用 |
| Expenses | 維護行前團費 | 依 `schema.js` 的 freeform layout 維護,不是一般資料列表 |
| 分帳紀錄 | 保存旅途記帳 | 只由 Apps Script append;團體刪帳新增墓碑列,不得修改原列 |
| TripConfig | 維護 key/value 設定 | `Exchange Rate` / `Ledger Default Currency` 可由 App 設定頁更新；其餘鍵由 Bar 手動管理 |

## 重要資料規則
- 新增景點／商場只新增 Places 資料列,Type 必填；新增住宿停靠點另須填入存在於 Hotels 的 HID。
- 新增餐廳:新增 Restaurants 資料列;填 PID 後會掛到對應 Place 卡片。
- 新增店家:新增 Shopping 資料列;PID 指向對應商場。
- 新增欄位:先改 Google Sheet,再改 `schema.js`;Parser 不需修改。
- 一般資料表 ID 格式:Places=`P###`、Restaurants=`R###`、Shopping=`S###`、Hotels=`H###`;不需連號,但不得重複、不得改變既有 ID 意義。
- Expenses 是自由格式,沒有 `E###` ID;行程總表目前只使用 `P###` / `R###` 引用地點或餐廳。
- 同一地點多次造訪使用同一 PID。
- 住宿關係為 `Places(Type=住宿).HID → Hotels.HID` 的 **N→1**：PID 是帶交通脈絡的停靠點,HID 是 Hotel profile 唯一 join key；Places／Hotels 名稱都只供顯示,不得作比對或關聯。
- 現行 P002／P013／P022／P031／P040 分別保留「開車30分鐘／開車2小時／開車3分鐘／開車50分鐘／步行3分鐘」,但都引用 H001。五個 PID 不得合併,因為其行程位置與交通脈絡不同；入住、退房、地址、停車與備註則由 H001 共用。
- Validator 條件式要求：`Type=住宿` 必須有 HID；其他 Type 不得填 HID；任何非空 HID 必須精確對應 Hotels.HID。任一違反都讓七表候選快照 fail closed；Runtime 缺失／懸空 HID 回傳 `null`,不以名稱或 Hotels 第一筆 fallback。
- 個人狀態(打卡/想逛/成員身分)與個人帳存 localStorage,不進 CMS。採買照片 Blob 存 IndexedDB `trip-local-media/shopping-photos`,採買項目只保存 `photoId` 引用；照片不進 CMS、Ledger、個人備份或跨裝置同步。依 ADR 0006,App 只可 append「分帳紀錄」及更新 TripConfig 的 `Exchange Rate` / `Ledger Default Currency`；其餘 CMS 欄位由 Bar 手動管理且 App 唯讀。

## 採買照片本機資料規則
- 每個採買項目最多一張照片；Blob 由 `shopping-photo-store.js` 管理,與 localStorage 的採買項目分離。
- `photoId` 是裝置內引用,不是可攜資料。匯出備份時一律移除；還原 payload 即使手動夾帶也一律剝除。
- 部分購買拆分會共用原 `photoId`；刪除／移除照片時必須先確認沒有其他採買項目引用,避免提早刪除共用 Blob。
- 清除瀏覽器網站資料、移除 App 儲存空間或更換裝置都可能遺失照片；這是產品核准的 device-local 語意。

## Places.Type 規則
- Places.Type 決定卡片型別,禁止 AI 依名稱或文字自行猜測。
- Type 值由 `schema.js` 的 values 正規化。
- 目前支援值:

| Google Sheet Type | App type |
|---|---|
| 購物 | shopping |
| 美食區 | restarea |
| 住宿 | hotel |
| 景點 | attraction |
| 機場 | attraction |
| 纜車 | attraction |
| 渡船口 | ferry |
| 渡輪 | ferry |
| 租車點 | parking |

- `渡船口` 與 `渡輪` 是兩個可輸入中文值,都會正規化為 `ferry`。
- `景點`、`機場` 與 `纜車` 都是可輸入中文值,目前共用 `attraction` 景點卡片。
- 若要新增 Type,必須修改 `schema.js` 並同步更新 `09_SCHEMA_MAPPING.md`、相關 renderer 註冊與 CHANGELOG。

## 停車資料規則
- 現行 Places 停車資訊是單一 `停車` 欄位,承載費用、地點與備註等停車資訊。
- `停車` 欄可寫「停車同Pxxx」,App 會繼承目標 Place 的 MAPCODE 與停車資訊。
- 停車繼承深度與容錯由程式處理;資料維護時不要拆出額外停車欄位。

## Expenses 特別規則
- Expenses 是 `freeform-expense` 自由格式,不是一般表格式資料列表。
- 權威 layout 寫在 `schema.js`:
  - 成員列標記:`同行成員`
  - 類別欄:第 0 欄
  - 明細欄:第 1 欄
  - 台幣欄:第 4 欄
  - 日幣欄:第 5 欄
  - 備註欄:第 6 欄
  - 合計列標記:`小計` / `總計`
- 行前團費來自 Google Sheet。
- Expenses 只負責行前團費與同行成員來源；旅途中記帳改走「分帳紀錄」表,不寫入 Expenses。

## 分帳紀錄特別規則
- Schema 2.9 沿用位置式 21 欄:`紀錄ID | 時間 | 成員 | 類別 | 明細 | 日幣 | 台幣 | 備註 | 分攤成員 | 支付方式 | 紀錄類型 | 目標紀錄ID | 刪除原因 | 批次ID | 店名 | 取代紀錄ID | 輸入幣別 | 免稅品 | 價格方式 | 稅率 | 優惠券金額`；2.9 只擴充 `recordType` 白名單，不新增 Sheet 欄位或 Apps Script payload 欄位。
- `時間` 為 ISO 8601 消費發生時間；既有紀錄不遷移，直接依此語意讀取。
- 末端 5 個 Schema 2.8 欄位保存原始輸入幣別、品項免稅、税込／税抜、稅率與優惠券記錄；均為選填，舊 16 欄 payload 由 Apps Script 補空字串。個人帳另以 localStorage 保存代購旗標與對象，團體帳不寫入代購資料。
- `紀錄ID`、`成員`、`日幣` 為 required；使用者只輸入 JPY 或 TWD 其中一種,App 依當前匯率四捨五入換算並同時保存兩個金額。
- Apps Script 契約:`POST {id,time,member,category,detail,amountJpy,amountTwd,note,participants,payMethod,recordType,targetRecordId,deleteReason,batchId,storeName,replacesRecordId,inputCurrency,isTaxFree,priceMode,taxRate,couponAmount}`。
- 回覆 `ok:true` 與 `ok:true,dup:true` 均視為送達；其他回覆保留在本機佇列。
- 資料 append-only；團體刪帳新增 `recordType=deletion` 墓碑並以 `targetRecordId` 指向原紀錄，不修改原列。
- 結算握手（ADR 0007）：`settlement_claim`（付款方標記已付款，金額為結算幣別當下淨額，`participants` 快照收款人）→ `settlement_confirm`（收款方確認，淨額歸零）或 `settlement_reject`（收款方退回，選填原因存備註）；confirm／reject 金額為零並以 `targetRecordId` 指向 claim。撤回／撤銷沿用墓碑。結算幣別取自 `Ledger Default Currency`。
- 還款確認後的收據永久禁止直接編輯或刪除；後續修正使用完整版本事件：先依 manifest 順序追加一或多筆 `expense_correction_item`，最後才追加 `expense_correction_commit` 作為可見性 commit。整張作廢只追加 `expense_void_commit`，不得用 deletion 墓碑取代。
- 更正事件皆保留原付款人與正式／TEST universe。commit 的 `replacesRecordId` 固定指向 root 收據、`targetRecordId` 指向上一個 canonical 版本、`batchId` 等於自身 commit ID、`note` 保存 1–50 字原因；item 的 `targetRecordId`／`batchId` 指向最後才寫入的 commit。缺件、manifest 不一致、跨付款人或跨 universe 的版本一律 inert。
- 同一上一版本的並行更正，以 commit `(time,id)` 最小者為 canonical；losing sibling 永不自動升格，只保留診斷與歷史。已確認還款不因更正而撤銷；新舊版本帳務差額形成新的待結算餘額。
- 公開 CSV 可能延遲 1–5 分鐘；ledger 下載失敗時沿用目前 ledger 快照,不得阻塞其他 7 表。

## TripConfig 分帳設定特別規則
- 精確鍵名:`Exchange Rate`（大於 0,代表 1 JPY 對應的 TWD 金額）與 `Ledger Default Currency`（只允許 `JPY` / `TWD`）。
- 初始列:`Exchange Rate,0.2`、`Ledger Default Currency,JPY`；Apps Script `updateSettings` 會更新既有列或在缺少時建立。
- `Currency` 仍是旅程幣別,不得改作分帳預設幣別。
- JPY 輸入:`amountTwd = Math.round(amountJpy × rate)`；TWD 輸入:`amountJpy = Math.round(amountTwd ÷ rate)`。
- 設定寫入為 online-only,不進 ledger 離線佇列；伺服器確認後的本機 bridge 只用於涵蓋公開 CSV 約 1–5 分鐘延遲。
- Apps Script 設定契約:`POST {action:'updateSettings',exchangeRate,defaultCurrency}`；固定白名單禁止 payload 指定任意 TripConfig key。

## 禁止事項
- 不要把完整欄位清單手寫在本文件作為權威。
- 不要繞過 `schema.js` 新增或改名欄位。
- 不要讓 AI 猜測 Type。
- 不要把打卡、想逛或成員身分寫回 CMS；App 的 CMS 寫入範圍僅限分帳 append 與兩個指定 TripConfig 鍵。
- 不要把 Expenses 當成一般資料列表設計。
