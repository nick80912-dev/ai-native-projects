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
| Places | 1089684162 | table | 地點主表,地點資料的單一來源 |
| Restaurants | 1421821084 | table | 餐廳資料,可用 PID 掛到 Place 卡片 |
| Shopping | 1182059264 | table | 商場店家資料,驅動購物頁樓層/必逛/免稅顯示 |
| Hotels | 792115203 | table | 住宿細節,以名稱比對 Places 住宿型地點 |
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
| Places | 維護地點、交通、停車、營業、官網等資訊 | 新地點只新增資料列;欄位異動先改 Sheet 再改 `schema.js` |
| Restaurants | 維護餐廳資料 | 新餐廳只新增資料列;可填 PID 掛到 Place |
| Shopping | 維護店家、樓層、必逛、免稅等資料 | 新店家只新增資料列;PID 指向商場 Place |
| Hotels | 維護住宿細節 | 新住宿只新增資料列;住宿地點仍需在 Places 有對應資料 |
| Expenses | 維護行前團費 | 依 `schema.js` 的 freeform layout 維護,不是一般資料列表 |
| 分帳紀錄 | 保存旅途記帳 | 只由 Apps Script append;刪帳新增負向沖銷列,不得修改原列 |
| TripConfig | 維護 key/value 設定 | `Exchange Rate` / `Ledger Default Currency` 可由 App 設定頁更新；其餘鍵由 Bar 手動管理 |

## 重要資料規則
- 新增景點/商場/住宿地點:只新增 Places 資料列,Type 必填。
- 新增餐廳:新增 Restaurants 資料列;填 PID 後會掛到對應 Place 卡片。
- 新增店家:新增 Shopping 資料列;PID 指向對應商場。
- 新增欄位:先改 Google Sheet,再改 `schema.js`;Parser 不需修改。
- 一般資料表 ID 格式:Places=`P###`、Restaurants=`R###`、Shopping=`S###`、Hotels=`H###`;不需連號,但不得重複、不得改變既有 ID 意義。
- Expenses 是自由格式,沒有 `E###` ID;行程總表目前只使用 `P###` / `R###` 引用地點或餐廳。
- 同一地點多次造訪使用同一 PID。
- 個人狀態(打卡/想逛/成員身分)存 localStorage,不進 CMS。依 ADR 0006,App 只可 append「分帳紀錄」及更新 TripConfig 的 `Exchange Rate` / `Ledger Default Currency`；其餘 CMS 欄位由 Bar 手動管理且 App 唯讀。

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
- 位置式 8 欄:`紀錄ID | 時間 | 成員 | 類別 | 明細 | 日幣 | 台幣 | 備註`。
- `紀錄ID`、`成員`、`日幣` 為 required；使用者只輸入 JPY 或 TWD 其中一種,App 依當前匯率四捨五入換算並同時保存兩個金額。
- Apps Script 契約:`POST {id,time,member,category,detail,amountJpy,amountTwd,note}`。
- 回覆 `ok:true` 與 `ok:true,dup:true` 均視為送達；其他回覆保留在本機佇列。
- 資料 append-only；刪帳以金額取負且備註指向原始 ID 的沖銷紀錄表示。
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
