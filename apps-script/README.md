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

分帳寫入共 14 欄，固定順序為：

```text
id, time, member, category, detail, amountJpy, amountTwd, note,
participants, payMethod, recordType, targetRecordId, deleteReason, batchId
```

後六欄皆為選填；舊 payload 未提供時，Apps Script 會寫入空字串。`participants` 必須是 JSON Array 字串，不得使用逗號字串。

Ledger 2.0 寫入範例：

```json
{"id":"1784428800000-test","time":"2026-07-18T08:00:00.000Z","member":"Bar","category":"交通","detail":"[TEST] Ledger 2.0 contract","amountJpy":500,"amountTwd":100,"note":"","participants":"[\"Bar\",\"Amy\"]","payMethod":"現金","recordType":"expense","targetRecordId":"","deleteReason":"","batchId":"batch-test-001"}
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

1. Bar 先在 Google Sheet「分帳紀錄」既有八欄末端新增：`分攤成員`、`支付方式`、`紀錄類型`、`目標紀錄ID`、`刪除原因`、`批次ID`。
2. 執行 `node tests/apps-script-settings.test.js`，確認本機契約測試通過；Bar 再於 Apps Script 編輯器以 `apps-script/ledger-sync.gs` 完整取代部署程式並儲存。
3. Bar 開啟「部署 → 管理部署 → 編輯」。
4. Bar 建立新版本；執行身分選擇部署擁有者，存取權沿用已核准值。
5. 更新既有部署並維持相同 Web App `/exec` URL。若平台產生新 URL，停止並先回報，不得直接切換前端。

Apps Script 部署完成並通過下列真實驗收後，才可交付使用 Schema 2.6 的前端契約。

## 真實驗收

1. POST `updateSettings`，確認回 `{ok:true,settings:...}`。
2. 等待已發布的 TripConfig CSV（已知延遲約 1–5 分鐘），確認精確出現 `Exchange Rate` 與 `Ledger Default Currency` 兩列。
3. 以新 ID POST 一筆含六個 Ledger 2.0 欄位的 `[TEST]` 分帳，確認回 `{ok:true}`。
4. 重送相同 ID，確認回 `{ok:true,dup:true}`。
5. 等待分帳 CSV，確認該 ID 只出現一列，且 `participants` JSON 字串、支付方式、紀錄類型與批次 ID 正確落位；舊八欄沒有位移。測試資料由 Bar 驗收後手動清除。

## 回滾

在 Apps Script「管理部署」把 Web App 指回上一個已知正常版本，保持同一 `/exec` URL。若前端 Schema 2.6 已發佈，應同時依專案回滾程序回復對應 Netlify 部署並再次 bump Service Worker cache；不可只回退其中一側而留下不相容契約。
