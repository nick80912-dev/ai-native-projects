# 09 Schema 對照文件(CMS ↔ App)

> ⭐ 本專案已改為 **Schema 驅動架構**:欄位對應的唯一權威來源是部署包內的 `schema.js`。
> 本文件由 `window.schemaDoc()` 自動產生;schema.js 有異動時應重新產生本文件。
> 新增/改名 Google Sheet 欄位 SOP:①改試算表 ②改 schema.js 對應 sheet 的 columns ③完成(Parser 不用動)。
> 同步時 Validator 會在 console 以 `[Schema Error]` 前綴警告(六類日誌定義見 `validator.js`):缺少必要欄位/未知欄位/未知型別值/未知設定鍵,一律不崩潰。
> 檔頭註解為手寫維護;下方表格區由 `schemaDoc()` 產生,**禁止手改表格**(見 14 的 Tier 3 規則)。

版本:2.2 (2026-07-16)

## 行程總表(gid=1169222358,kind=itinerary)
| Google Sheet 欄位 | App Property | 必填 | 說明 |
|---|---|---|---|
| 日期 | date |  | 僅換日標記列使用(第N天MM/DD) |
| 時間 | time |  | HH:MM 或「16:00後」等自由文字 |
| 行程 | act |  | 活動名稱 |
| 地點 | place |  | 地點顯示名稱(給人看) |
| ID | ref |  | Pxxx=地點 / Rxxx=餐廳(給程式讀) |
| 交通 | move |  | 交通說明;空值時卡片退回資料庫交通時間 |
| 備註 | note |  | 自由備註 |

## Places(gid=1089684162,kind=table)
| Google Sheet 欄位 | App Property | 必填 | 說明 |
|---|---|---|---|
| PID(別名:placeid/地點id) | placeId | ✅ | 地點唯一ID(P001…),不得重複 |
| 地點(別名:名稱) | name | ✅ | 地點名稱(同時作為導航關鍵字) |
| Type(別名:類型) | type | ✅ | 決定卡片型別,禁止程式猜測。值:購物/美食區/住宿/景點/機場/纜車/渡船口/渡輪/租車點 |
| MAPCODE | mapcode |  | 車用導航輸入碼(大字純顯示) |
| 交通/交通時間(別名:交通時間) | travel |  | 開車X分鐘/步行X分鐘;行程交通欄空值時顯示 |
| 停車(別名:停車備註/停車場) | pnote |  | 停車資訊單欄;「停車同Pxxx」可繼承 |
| 營業時間(別名:開放時間) | hours |  |  |
| 門票 | ticket |  | 門票或船票資訊 |
| 官網(別名:網站/網址) | web |  |  |
| 時刻表連結(別名:時刻表) | ttl |  | 渡輪等官方時刻表 URL |
| 備註 | note |  |  |

## Restaurants(gid=1421821084,kind=table)
| Google Sheet 欄位 | App Property | 必填 | 說明 |
|---|---|---|---|
| RID(別名:restid/餐廳id) | restId | ✅ | 餐廳唯一ID(R001…) |
| PID(可空白)(別名:pid/placeid) | placeId |  | 所屬地點;掛上後該地點卡自動列出 |
| 餐廳名稱(別名:店名/名稱) | name | ✅ |  |
| Tabelog(別名:評分) | rating |  | 數字自動顯示為「Tabelog X.XX」 |
| 餐廳類型(別名:分類) | cat |  |  |
| 營業時間 | hours |  |  |
| 付款方式(別名:付款) | pay |  |  |
| 交通時間 | travel |  | 開車/步行時間 |
| 停車 | pnote |  |  |
| 備註 | note |  |  |

## Shopping(gid=1182059264,kind=table)
| Google Sheet 欄位 | App Property | 必填 | 說明 |
|---|---|---|---|
| SID(別名:shopid/商店id) | shopId | ✅ | 商店唯一ID(S001…) |
| PID(別名:placeid) | placeId | ✅ | 所屬商場(Places.PID) |
| 品牌名稱(別名:店名/名稱) | name | ✅ |  |
| 樓層 | floor | ✅ | 購物頁樓層摺疊依據 |
| 分類 | cat |  |  |
| 必逛 | must |  | 填「是」顯示必逛徽章 |
| 免稅 | taxfree |  | 填「是」顯示免稅徽章 |
| 備註 | note |  | 「櫃位 XXX」會顯示於店名旁 |

## Hotels(gid=792115203,kind=table)
| Google Sheet 欄位 | App Property | 必填 | 說明 |
|---|---|---|---|
| HID(別名:hotelid/住宿id) | hotelId | ✅ |  |
| 名稱 | name | ✅ | 以名稱比對 Places 住宿型地點 |
| 入住 | checkin |  |  |
| 退房 | checkout |  |  |
| 地址 | addr |  |  |
| 停車 | pnote |  |  |
| 適用日期 | dates |  |  |
| 備註 | note |  |  |

## Expenses(gid=1354339857,kind=freeform-expense)
自由格式:成員列標記「同行成員」;欄位位置 → 類別[0] 明細[1] 台幣[4] 日幣[5] 備註[6];合計列標記「小計/總計」
> 行前團費。旅途記帳在 App 端(localStorage),兩者於分帳頁並列不重複計算。同行成員自動帶入分帳成員(首次)。

## TripConfig(gid=1070234314,kind=keyvalue)
| Key | App Property | 說明 |
|---|---|---|
| Trip Name | tripname | 顯示於頂欄標題 |
| Start Date | startdate |  |
| End Date | enddate |  |
| Travel Mode(別名:transport/交通模式) | travelmode | Driving→drive(🚗導航+停車卡);Transit/Train→transit(🚃路線) |
| Currency | currency |  |
| Home Page | homepage | 預設分頁(⚠️ 目前**未啟用**,App 固定 Today;填寫無效果) |
