# ⛔ 03_DATABASE — DEPRECATED(已作廢,勿讀)

> **這份文件已作廢,請勿使用。**
> 本檔描述的是 V2 早期的欄位設計(PlaceID/名稱/類型/導航關鍵字/停車費/停車備註/電話/末班船…),
> 與目前 Google Sheet 的實際欄位**不一致**,依此開發會出錯。
>
> ✅ **正確權威來源:**
> - 欄位對照 → `09_SCHEMA_MAPPING.md`
> - 唯一資料規格 → 部署包 `schema.js`(schemaDoc() 自動產生 09)
> - 資料表關聯與擴充規則 → `12_DEV_WORKFLOW.md` + ADR `0001-schema-first` / `0003-google-sheet-cms`
>
> 原 `03_DATABASE.md`(fileId 10O3Ws6-8uWgkRjM4g35QQUN-ldvPVs5J)因 Drive 工具無法刪除或改名而保留,
> 但其內容已被上述檔案取代。未來 AI 讀到原檔時,請以本作廢通知為準,直接改讀 09 與 schema.js。

---

## 為什麼作廢(重點差異,供追溯)
| 舊 03 的描述 | 目前實際(以 09/schema.js 為準) |
|---|---|
| Places 欄位含「導航關鍵字/停車費/停車備註/電話/末班船」分離欄 | Places 為 `PID/地點/Type/MAPCODE/交通(交通時間)/停車(單欄)/營業時間/門票/官網/時刻表連結/備註`;停車合併單欄、無電話欄、無末班船欄 |
| Restaurants:`店名/評分/推薦菜/均價/訂位` | 實際:`RID/PID/餐廳名稱/Tabelog/餐廳類型/營業時間/付款方式/交通時間/停車/備註` |
| Type 值:英文(Shopping/RestaurantArea…) | 實際:中文(購物/美食區/住宿/景點/渡船口・渡輪/租車點),對應表在 schema.js type.values |
| 表頭別名比對「rowsToObjects」 | 已重構為 Schema 驅動 `parseTable`(見 ADR 0001) |
| 渡輪用「末班船」欄 | 改為時刻表連結開官方頁;末班資訊併入備註/門票欄描述 |

> 一句話:**看 09_SCHEMA_MAPPING.md 與 schema.js,不要看原 03。**
