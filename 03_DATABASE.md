# 03 CMS 資料表(Google Sheets)

檔案:「261018-261023岡山四國六天五夜」(Drive fileId `1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`)
發布 base:`https://docs.google.com/spreadsheets/d/e/2PACX-1vRenmV8UxEzWbzSjKJKi4rSpYt63geBqhEkKsl1GemWVPmFKTcvv3Uk71Hjla3TGBpGIjC7bQDDdI00/pub?single=true&output=csv&gid=`

## 七張工作表與 gid
| 表 | gid | 用途 |
|---|---|---|
| 行程總表 | 1169222358 | 行程骨架(天/時間/活動),引用 ID |
| Places | 1089684162 | 地點主表(單一資料來源) |
| Restaurants | 1421821084 | 餐廳,掛在 Place 底下 |
| Shopping | 1182059264 | 商場店家(樓層/必逛/免稅) |
| Hotels | 792115203 | 住宿細節 |
| Expenses | 1354339857 | 行前團費(旅途記帳在 App 端) |
| TripConfig | 1070234314 | key,value 設定(transport=drive/transit 等) |

## 欄位
- 行程總表(7欄):`日期|時間|詳細行程|地點|ID|交通|備註`。「第N天MM/DD(週)」列=換日標記。ID 填 Pxxx 或 Rxxx。
- Places:`PlaceID|名稱|類型|導航關鍵字|MAPCODE|停車費|停車備註|營業時間|門票|電話|官網|時刻表連結|末班船|備註`
- Restaurants:`RestID|PlaceID|店名|評分|推薦菜|營業時間|均價|付款方式|訂位|備註`
- Shopping:`ShopID|PlaceID|店名|樓層|分類|必逛|免稅|備註`(必逛/免稅填「是」)
- Hotels:`HotelID|名稱|入住|退房|地址|電話|停車|適用日期|備註`
- Expenses:`ExpID|日期|項目|幣別|金額|計價|付款人|狀態|備註`
- 解析採**表頭別名比對**,欄位順序可變,新增欄位不會壞。

## 關聯與規則
- **Places.類型**(必填,決定卡片,禁止 AI 猜):`Shopping / RestaurantArea / Hotel / Attraction / FerryTerminal / Parking`
- 每個地點只存在一次;行程重複造訪同地點用**同一個 PlaceID**(例:回住宿一律 P002)
- Restaurants.PlaceID → 該 Place 卡片自動列出所屬餐廳
- 停車引用:`停車備註` 寫「停車同P004」→ App 完整繼承 P004 的 MAPCODE/停車費/停車備註(深度上限3;引用不存在→顯示原文+console.warn)
- 渡輪:不建班次資料庫。FerryTerminal 用「末班船」欄(離線可見)+「時刻表連結」開官方 PDF

## 擴充規則
- 新地點/餐廳/店家:**只加資料列,不改程式**
- 新行程(如12月東京行):新的行程總表分頁+TripConfig transport=transit;程式端 SHEETS 加一組 gid
- ID 格式:P/R/S/H/E + 三位數,不需連號,但**不得重複、不得改變既有 ID 意義**
