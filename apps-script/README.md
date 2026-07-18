# Ledger Sync Apps Script

`ledger-sync.gs` 是 Apps Script 部署程式的唯一維護來源。Google Apps Script 編輯器內的部署副本必須完整複製此檔；不要只在雲端編輯而不回存 Git。

## 固定資源與權限邊界

- Web App URL：`https://script.google.com/macros/s/AKfycbwtC9G5GYZYmvZU2sl81Q2YDYDoeNf-FaZgeZa2GptfQ0znKA-h9Du1GuoSv0waeuSPhA/exec`
- 執行身分：部署擁有者。
- 存取權：沿用目前已核准的 Web App 存取設定；改版時不得自行縮放或擴張。
- `分帳紀錄`：App 只做 append-only 寫入；重複 `id` 回 `{ok:true,dup:true}`。
- `TripConfig`：App 只能更新或建立 `Exchange Rate` 與 `Ledger Default Currency`。其餘鍵維持 Bar 手動管理、App 唯讀。

兩個設定鍵的精確初始格式為：

```csv
Exchange Rate,0.2
Ledger Default Currency,JPY
```

`Currency` 是旅程顯示幣別，不得改作分帳預設幣別。

## POST 契約

既有分帳寫入：

```json
{"id":"1784274603804-y3g6","time":"2026-07-17T12:30:03.804Z","member":"黃柏","category":"餐飲","detail":"[TEST] endpoint check","amountJpy":500,"amountTwd":100,"note":""}
```

成功回應為 `{"ok":true}`；同一個 ID 再送一次為 `{"ok":true,"dup":true}`。

共用設定更新：

```json
{"action":"updateSettings","exchangeRate":0.2,"defaultCurrency":"JPY"}
```

成功回應為：

```json
{"ok":true,"settings":{"exchangeRate":0.2,"defaultCurrency":"JPY"}}
```

匯率必須為大於零的有限數字；幣別只接受 `JPY` 或 `TWD`。設定寫入不進離線佇列。

## 部署

1. 執行 `node tests/apps-script-settings.test.js`，確認本機契約測試通過。
2. 在 Apps Script 編輯器以 `apps-script/ledger-sync.gs` 完整取代部署程式並儲存。
3. 「部署 → 管理部署 → 編輯」，建立新版本；執行身分選擇部署擁有者，存取權沿用已核准值。
4. 優先更新既有部署，保留固定 `/exec` URL。若平台產生新 URL，必須先更新前端常數與本文件，再發佈前端。
5. Apps Script 部署完成並通過下列真實驗收後，才可發佈使用 Schema 2.5 的前端。

## 真實驗收

1. POST `updateSettings`，確認回 `{ok:true,settings:...}`。
2. 等待已發布的 TripConfig CSV（已知延遲約 1–5 分鐘），確認精確出現 `Exchange Rate` 與 `Ledger Default Currency` 兩列。
3. 以新 ID POST 一筆 `[TEST]` 分帳，確認回 `{ok:true}`。
4. 重送相同 ID，確認回 `{ok:true,dup:true}`。
5. 等待分帳 CSV，確認該 ID 只出現一列。測試資料由 Bar 驗收後手動清除。

## 回滾

在 Apps Script「管理部署」把 Web App 指回上一個已知正常版本，保持同一 `/exec` URL。若前端 Schema 2.5 已發佈，應同時依專案回滾程序回復對應 Netlify 部署並再次 bump Service Worker cache；不可只回退其中一側而留下不相容契約。
